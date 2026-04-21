/**
 * DraftScene — 5-of-8 symbol selection for both players.
 *
 * Layout:
 *   - Title at top
 *   - 8 symbol tiles in a 4x2 grid at centre
 *   - Each tile shows shape, name, weight, probability
 *   - Player A column (blue checkboxes on left), Player B column (red on right)
 *   - Status text: "A: 3/5  B: 2/5"
 *   - GO button activates when both players have exactly 5 selected
 *   - Launches GameScene with selected symbols + default scales
 */
import Phaser from 'phaser';
import { CANVAS_WIDTH, CANVAS_HEIGHT } from '@/config/GameConfig';
import { EventBus } from '@/systems/EventBus';
import { EventNames } from '@/config/EventNames';
import {
  SYMBOLS, DEFAULT_TARGET_RTP, DEFAULT_TARGET_DMG,
  DEFAULT_TEAM_HP, DEFAULT_BET, DEFAULT_FAIRNESS_EXP,
} from '@/config/SymbolsConfig';
import { buildUnionPool } from '@/systems/SymbolPool';
import { calculateScales } from '@/systems/ScaleCalculator';
import type { BattleConfig } from '@/scenes/GameScene';

// ---------------------------------------------------------------------------
// Layout constants
// ---------------------------------------------------------------------------

const TILE_W    = 130;
const TILE_H    = 100;
const TILE_GAP  = 12;
const COLS      = 4;
const ROWS      = 2;

const GRID_W = COLS * TILE_W + (COLS - 1) * TILE_GAP;
const GRID_H = ROWS * TILE_H + (ROWS - 1) * TILE_GAP;
const GRID_X = Math.round((CANVAS_WIDTH - GRID_W) / 2);
const GRID_Y = Math.round((CANVAS_HEIGHT - GRID_H) / 2) - 20;

const MAX_PICKS = 5;

const C = {
  bg:      0x0a0e1a,
  tile:    0x1a2340,
  border:  0x334466,
  gold:    0xf1c40f,
  playerA: 0x3498db,
  playerB: 0xe74c3c,
  go:      0x27ae60,
  goHover: 0x2ecc71,
  goOff:   0x1a3d28,
  text:    '#e0e8ff',
  muted:   '#6a7ea0',
};

export class DraftScene extends Phaser.Scene {
  private selectedA: Set<number> = new Set();
  private selectedB: Set<number> = new Set();

  private tileContainers: Phaser.GameObjects.Container[] = [];
  private checkMarksA:    Phaser.GameObjects.Text[]      = [];
  private checkMarksB:    Phaser.GameObjects.Text[]      = [];
  private statusText!:    Phaser.GameObjects.Text;
  private goButton!:      Phaser.GameObjects.Container;
  private goBtnBg!:       Phaser.GameObjects.Graphics;
  private goBtnLabel!:    Phaser.GameObjects.Text;

  constructor() { super({ key: 'DraftScene' }); }

  create(): void {
    this.selectedA.clear();
    this.selectedB.clear();

    this._drawBackground();
    this._drawTitle();
    this._buildSymbolTiles();
    this._buildStatusBar();
    this._buildGoButton();
    this._refreshUI();
  }

  // ---------------------------------------------------------------------------
  // Private: background / chrome
  // ---------------------------------------------------------------------------

  private _drawBackground(): void {
    this.add.rectangle(CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2, CANVAS_WIDTH, CANVAS_HEIGHT, C.bg);

    // Subtle grid texture
    const g = this.add.graphics();
    g.lineStyle(1, 0x1a2a40, 0.4);
    for (let x = 0; x < CANVAS_WIDTH; x += 40) g.moveTo(x, 0), g.lineTo(x, CANVAS_HEIGHT);
    for (let y = 0; y < CANVAS_HEIGHT; y += 40) g.moveTo(0, y), g.lineTo(CANVAS_WIDTH, y);
    g.strokePath();
  }

  private _drawTitle(): void {
    this.add.text(CANVAS_WIDTH / 2, 32, 'SYMBOL DRAFT', {
      fontSize: '32px', fontFamily: 'Arial Black, sans-serif',
      color: '#f1c40f', stroke: '#000', strokeThickness: 4,
    }).setOrigin(0.5, 0);

    this.add.text(CANVAS_WIDTH / 2, 76, 'Each player selects 5 symbols  |  Blue = Player A  |  Red = Player B', {
      fontSize: '14px', fontFamily: 'Arial, sans-serif', color: C.muted,
    }).setOrigin(0.5, 0);

    // Column headers
    this.add.text(GRID_X - 30, GRID_Y - 24, 'A', {
      fontSize: '18px', fontFamily: 'Arial Black', color: '#3498db',
    }).setOrigin(0.5, 0.5);
    this.add.text(GRID_X + GRID_W + 30, GRID_Y - 24, 'B', {
      fontSize: '18px', fontFamily: 'Arial Black', color: '#e74c3c',
    }).setOrigin(0.5, 0.5);
  }

  // ---------------------------------------------------------------------------
  // Private: tile grid
  // ---------------------------------------------------------------------------

  private _buildSymbolTiles(): void {
    const totalW = SYMBOLS[0].weight + SYMBOLS[1].weight + SYMBOLS[2].weight +
                   SYMBOLS[3].weight + SYMBOLS[4].weight + SYMBOLS[5].weight +
                   SYMBOLS[6].weight + SYMBOLS[7].weight;

    SYMBOLS.forEach((sym, i) => {
      const col = i % COLS;
      const row = Math.floor(i / COLS);
      const tx  = GRID_X + col * (TILE_W + TILE_GAP);
      const ty  = GRID_Y + row * (TILE_H + TILE_GAP);

      const tile = this.add.container(tx, ty);

      // Tile background
      const bg = this.add.graphics();
      bg.fillStyle(C.tile, 1);
      bg.lineStyle(1.5, C.border, 0.8);
      bg.fillRoundedRect(0, 0, TILE_W, TILE_H, 6);
      bg.strokeRoundedRect(0, 0, TILE_W, TILE_H, 6);
      tile.add(bg);

      // Symbol colour swatch
      const swatch = this.add.graphics();
      swatch.fillStyle(sym.color, 0.8);
      swatch.fillCircle(TILE_W / 2, 28, 14);
      tile.add(swatch);

      // Symbol name
      tile.add(this.add.text(TILE_W / 2, 48, sym.name, {
        fontSize: '13px', fontFamily: 'Arial, sans-serif', color: C.text,
      }).setOrigin(0.5, 0));

      // Weight + prob
      const prob = ((sym.weight / totalW) * 100).toFixed(1);
      tile.add(this.add.text(TILE_W / 2, 65, `W:${sym.weight}  ${prob}%`, {
        fontSize: '11px', fontFamily: 'monospace', color: C.muted,
      }).setOrigin(0.5, 0));

      // A checkbox (left side of tile)
      const checkA = this.add.text(-22, TILE_H / 2, '[ ]', {
        fontSize: '16px', fontFamily: 'monospace', color: '#3498db',
      }).setOrigin(0.5, 0.5).setInteractive({ useHandCursor: true });
      checkA.on('pointerdown', () => this._toggleA(i));
      tile.add(checkA);
      this.checkMarksA.push(checkA);

      // B checkbox (right side of tile)
      const checkB = this.add.text(TILE_W + 22, TILE_H / 2, '[ ]', {
        fontSize: '16px', fontFamily: 'monospace', color: '#e74c3c',
      }).setOrigin(0.5, 0.5).setInteractive({ useHandCursor: true });
      checkB.on('pointerdown', () => this._toggleB(i));
      tile.add(checkB);
      this.checkMarksB.push(checkB);

      // Make the tile itself clickable (toggles A by default — intuitive for solo testing)
      bg.setInteractive(new Phaser.Geom.Rectangle(0, 0, TILE_W, TILE_H), Phaser.Geom.Rectangle.Contains);
      bg.on('pointerdown', () => this._toggleA(i));
      bg.on('pointerover', () => { bg.clear(); bg.fillStyle(0x243560, 1); bg.lineStyle(1.5, C.gold, 0.7); bg.fillRoundedRect(0, 0, TILE_W, TILE_H, 6); bg.strokeRoundedRect(0, 0, TILE_W, TILE_H, 6); });
      bg.on('pointerout',  () => { bg.clear(); bg.fillStyle(C.tile, 1); bg.lineStyle(1.5, C.border, 0.8); bg.fillRoundedRect(0, 0, TILE_W, TILE_H, 6); bg.strokeRoundedRect(0, 0, TILE_W, TILE_H, 6); });

      this.tileContainers.push(tile);
    });
  }

  // ---------------------------------------------------------------------------
  // Private: bottom bar
  // ---------------------------------------------------------------------------

  private _buildStatusBar(): void {
    const y = GRID_Y + GRID_H + 28;
    this.statusText = this.add.text(CANVAS_WIDTH / 2, y, '', {
      fontSize: '16px', fontFamily: 'monospace', color: C.text,
    }).setOrigin(0.5, 0);
  }

  private _buildGoButton(): void {
    const bx = CANVAS_WIDTH / 2;
    const by = GRID_Y + GRID_H + 68;

    this.goButton = this.add.container(bx, by);

    this.goBtnBg = this.add.graphics();
    this.goButton.add(this.goBtnBg);

    this.goBtnLabel = this.add.text(0, 0, 'SELECT 5 EACH TO START', {
      fontSize: '16px', fontFamily: 'Arial Black, sans-serif', color: '#ffffff',
    }).setOrigin(0.5, 0.5);
    this.goButton.add(this.goBtnLabel);

    this._drawGoBg(false);

    this.goButton.setInteractive(
      new Phaser.Geom.Rectangle(-140, -22, 280, 44),
      Phaser.Geom.Rectangle.Contains,
    );
    this.goButton.on('pointerdown', () => this._onGo());
    this.goButton.on('pointerover', () => { if (this._canGo()) this._drawGoBg(true); });
    this.goButton.on('pointerout',  () => { this._drawGoBg(this._canGo()); });
  }

  private _drawGoBg(active: boolean): void {
    this.goBtnBg.clear();
    this.goBtnBg.fillStyle(active ? C.goHover : this._canGo() ? C.go : C.goOff, 1);
    this.goBtnBg.fillRoundedRect(-140, -22, 280, 44, 8);
    this.goBtnBg.lineStyle(1.5, active ? C.gold : 0x336633, 0.8);
    this.goBtnBg.strokeRoundedRect(-140, -22, 280, 44, 8);
  }

  // ---------------------------------------------------------------------------
  // Private: selection logic
  // ---------------------------------------------------------------------------

  private _toggleA(idx: number): void {
    if (this.selectedA.has(idx)) {
      this.selectedA.delete(idx);
    } else if (this.selectedA.size < MAX_PICKS) {
      this.selectedA.add(idx);
    }
    this._refreshUI();
  }

  private _toggleB(idx: number): void {
    if (this.selectedB.has(idx)) {
      this.selectedB.delete(idx);
    } else if (this.selectedB.size < MAX_PICKS) {
      this.selectedB.add(idx);
    }
    this._refreshUI();
  }

  private _canGo(): boolean {
    return this.selectedA.size === MAX_PICKS && this.selectedB.size === MAX_PICKS;
  }

  private _refreshUI(): void {
    // Checkmarks
    SYMBOLS.forEach((_, i) => {
      this.checkMarksA[i]?.setText(this.selectedA.has(i) ? '[A]' : '[ ]');
      this.checkMarksB[i]?.setText(this.selectedB.has(i) ? '[B]' : '[ ]');
    });

    // Status text
    const aFull = this.selectedA.size === MAX_PICKS;
    const bFull = this.selectedB.size === MAX_PICKS;
    const aColor = aFull ? '#3498db' : '#ffffff';
    const bColor = bFull ? '#e74c3c' : '#ffffff';
    this.statusText?.setText(
      `A: ${this.selectedA.size}/${MAX_PICKS}   B: ${this.selectedB.size}/${MAX_PICKS}`,
    );
    void aColor; void bColor;

    // GO button
    const canGo = this._canGo();
    this.goBtnLabel?.setText(canGo ? 'START BATTLE!' : 'SELECT 5 EACH TO START');
    this._drawGoBg(false);
  }

  // ---------------------------------------------------------------------------
  // Private: launch
  // ---------------------------------------------------------------------------

  private _onGo(): void {
    if (!this._canGo()) return;

    const selectedA = Array.from(this.selectedA);
    const selectedB = Array.from(this.selectedB);

    const pool = buildUnionPool(selectedA, selectedB, SYMBOLS);
    const tw   = pool.reduce((s, p) => s + p.weight, 0);
    const scalesA = calculateScales(DEFAULT_TARGET_RTP, DEFAULT_TARGET_DMG, selectedA, tw, DEFAULT_FAIRNESS_EXP);
    const scalesB = calculateScales(DEFAULT_TARGET_RTP, DEFAULT_TARGET_DMG, selectedB, tw, DEFAULT_FAIRNESS_EXP);

    const cfg: BattleConfig = {
      selectedA,
      selectedB,
      teamHpA:     DEFAULT_TEAM_HP,
      teamHpB:     DEFAULT_TEAM_HP,
      betA:        DEFAULT_BET,
      betB:        DEFAULT_BET,
      coinScaleA:  scalesA.coinScale,
      dmgScaleA:   scalesA.dmgScale,
      coinScaleB:  scalesB.coinScale,
      dmgScaleB:   scalesB.dmgScale,
      fairnessExp: DEFAULT_FAIRNESS_EXP,
    };

    EventBus.emit(EventNames.DRAFT_COMPLETE, cfg);
    this.scene.start('GameScene', cfg);
  }
}
