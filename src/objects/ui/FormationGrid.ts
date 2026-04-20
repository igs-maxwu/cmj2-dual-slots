import Phaser from 'phaser';
import { COLORS, LAYOUT, FONT_SIZE, FONT } from '@/config/DesignTokens';
import { EventBus } from '@/systems/EventBus';
import { EventNames } from '@/config/EventNames';
import type { Side } from '@/systems/SlotEngine';

interface UnitState {
  spiritName:  string;
  textureKey:  string;  // Phaser texture key, e.g. 'spirit_yin'
  element:     string;
  hp:          number;
  maxHp:       number;
  alive:       boolean;
}

/**
 * [The Stylist] — 3×3 unit formation grid.
 * Slots are filled left→right, top→bottom up to MAX_SPIRITS (5).
 * Empty slots render as dimmed placeholder cells.
 * [The Illusionist] should attach effects to individual unit containers.
 */
export class FormationGrid extends Phaser.GameObjects.Container {
  private side:      Side;
  private unitCells: Phaser.GameObjects.Container[] = [];
  private hpBars:    { bg: Phaser.GameObjects.Rectangle; fill: Phaser.GameObjects.Rectangle }[] = [];
  private hpTweens:  (Phaser.Tweens.Tween | null)[] = [];
  private states:    UnitState[] = [];

  constructor(scene: Phaser.Scene, x: number, y: number, side: Side) {
    super(scene, x, y);
    this.side = side;
    scene.add.existing(this);
    this._buildCells();
    this._listenEvents();
  }

  // ─── Public API ────────────────────────────────────────────────────────────

  /**
   * Returns the world-space center {x, y} for the unit cell at the given
   * roster index (0-based). Used by [The Illusionist] to anchor skill FX.
   * Returns null when the index is out of range.
   */
  getPortraitWorldXY(index: number): { x: number; y: number } | null {
    const cell = this.unitCells[index];
    if (!cell) return null;
    // cell.x/y are relative to this container; walk up to scene coordinates.
    const wx = this.x + cell.x;
    const wy = this.y + cell.y;
    // The container itself sits inside a PlayerPanel container — callers must
    // add the PlayerPanel's world position. We expose the grid-local coords
    // here; GameScene adds the panel offset when calling.
    return { x: wx, y: wy };
  }

  /** Populate grid from an array of unit states (3–5 entries). */
  setUnits(units: UnitState[]): void {
    this.states = units;
    units.forEach((u, i) => this._updateCell(i, u));
    // Clear unused cells
    for (let i = units.length; i < 9; i++) this._clearCell(i);
  }

  // ─── Private ───────────────────────────────────────────────────────────────

  private _buildCells(): void {
    const { cellSize, cellGap } = LAYOUT;

    for (let i = 0; i < 9; i++) {
      const col = i % 3;
      const row = Math.floor(i / 3);
      const cx  = col * (cellSize + cellGap) + cellSize / 2;
      const cy  = row * (cellSize + cellGap) + cellSize / 2;

      const cell = this.scene.add.container(cx, cy);

      // Cell background
      const bg = this.scene.add.rectangle(0, 0, cellSize, cellSize, COLORS.bgCell)
        .setStrokeStyle(1, COLORS.borderNormal);
      cell.add(bg);

      // HP bar background
      const hpBarBg = this.scene.add.rectangle(0, cellSize / 2 - 5, cellSize - 8, 5, COLORS.hpBg)
        .setOrigin(0.5, 0.5);
      // HP bar fill — starts at full width, origin left-center
      const hpBarFill = this.scene.add.rectangle(
        -(cellSize - 8) / 2, cellSize / 2 - 5, cellSize - 8, 5, COLORS.hpHigh
      ).setOrigin(0, 0.5);

      cell.add(hpBarBg);
      cell.add(hpBarFill);

      this.unitCells.push(cell);
      this.hpBars.push({ bg: hpBarBg, fill: hpBarFill });
      this.hpTweens.push(null);
      this.add(cell);
    }
  }

  private _updateCell(index: number, unit: UnitState): void {
    const cell = this.unitCells[index];
    if (!cell) return;

    // Remove any old symbol text
    cell.getAll().filter(o => (o as Phaser.GameObjects.Text).text !== undefined)
      .forEach(o => o.destroy());

    const { cellSize } = LAYOUT;
    const borderColor = this.side === 'A' ? COLORS.borderA : COLORS.borderB;

    // Update cell border
    (cell.first as Phaser.GameObjects.Rectangle).setStrokeStyle(2, borderColor);

    if (!unit.alive) {
      this._markDead(index);
      return;
    }

    // Spirit portrait — use real texture if loaded, else coloured circle fallback
    const texExists = this.scene.textures.exists(unit.textureKey);
    if (texExists) {
      const img = this.scene.add.image(0, -4, unit.textureKey)
        .setDisplaySize(cellSize - 6, cellSize - 16)
        .setOrigin(0.5, 0.5);
      cell.add(img);
    } else {
      const elemColor = this._elementColor(unit.element);
      const dot = this.scene.add.circle(0, -4, cellSize / 4, elemColor);
      cell.add(dot);
    }

    // Spirit name label (bottom of cell, small)
    const label = this.scene.add.text(0, cellSize / 2 - 14, unit.spiritName, {
      fontSize:   `${FONT_SIZE.xs}px`,
      fontFamily: FONT.base,
      color:      '#ffffff',
    }).setOrigin(0.5, 0.5);
    cell.add(label);

    // HP bar
    this._animateHpBar(index, unit.hp, unit.maxHp);
  }

  private _clearCell(index: number): void {
    const cell = this.unitCells[index];
    if (!cell) return;
    cell.getAll().filter(o => (o as Phaser.GameObjects.Text).text !== undefined)
      .forEach(o => o.destroy());
    (cell.first as Phaser.GameObjects.Rectangle)
      .setStrokeStyle(1, COLORS.borderNormal)
      .setFillStyle(COLORS.bgCell);
    this.hpBars[index].fill.setDisplaySize(0, 5);
  }

  private _markDead(index: number): void {
    const cell = this.unitCells[index];
    (cell.first as Phaser.GameObjects.Rectangle).setFillStyle(0x220000);
    this.hpBars[index].fill.setDisplaySize(0, 5);
    // X mark — [The Illusionist] will overlay a destruction FX
    const x1 = this.scene.add.text(0, 0, '✕', {
      fontSize:   `${FONT_SIZE.lg}px`,
      fontFamily: FONT.bold,
      color:      '#cc2222',
    }).setOrigin(0.5, 0.5);
    cell.add(x1);
  }

  /** Smooth HP bar tween — [The Stylist] responsibility per brief. */
  private _animateHpBar(index: number, hp: number, maxHp: number): void {
    const bar      = this.hpBars[index].fill;
    const maxWidth = LAYOUT.cellSize - 8;
    const pct      = Math.max(0, hp / maxHp);
    const targetW  = maxWidth * pct;
    const color    = pct > 0.5 ? COLORS.hpHigh : pct > 0.25 ? COLORS.hpMid : COLORS.hpLow;

    bar.setFillStyle(color);

    // Cancel previous tween if running
    this.hpTweens[index]?.stop();
    this.hpTweens[index] = this.scene.tweens.add({
      targets:  bar,
      displayWidth: targetW,
      duration: 300,
      ease:     'Cubic.easeOut',
    });
  }

  private _listenEvents(): void {
    EventBus.on(EventNames.HP_UPDATED, (data: { side: Side; unitIndex: number; hp: number; maxHp: number }) => {
      if (data.side !== this.side) return;
      const st = this.states[data.unitIndex];
      if (!st) return;
      st.hp = data.hp;
      this._animateHpBar(data.unitIndex, data.hp, data.maxHp);
    }, this);

    EventBus.on(EventNames.UNIT_DIED, (data: { side: Side; unitIndex: number }) => {
      if (data.side !== this.side) return;
      const st = this.states[data.unitIndex];
      if (st) st.alive = false;
      this._markDead(data.unitIndex);
    }, this);
  }

  private _elementColor(element: string): number {
    const map: Record<string, number> = {
      man:   0xe63946,
      pin:   0x48cae4,
      sou:   0x52b788,
      honor: 0xffd166,
      wild:  0xb5179e,
    };
    return map[element] ?? 0xffffff;
  }

  destroy(fromScene?: boolean): void {
    EventBus.off(EventNames.HP_UPDATED,  undefined, this);
    EventBus.off(EventNames.UNIT_DIED,   undefined, this);
    this.hpTweens.forEach(t => t?.stop());
    super.destroy(fromScene);
  }
}
