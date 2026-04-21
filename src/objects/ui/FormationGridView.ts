import Phaser from 'phaser';
import type { FormationGrid } from '@/systems/Formation';
import { SYMBOLS } from '@/config/SymbolsConfig';
import {
  FORMATION_COLS, FORMATION_ROWS, UNIT_CELL_SIZE, UNIT_CELL_GAP,
} from '@/config/GameConfig';
import { CANVAS_WIDTH, CANVAS_HEIGHT } from '@/config/GameConfig';
import type { Side } from '@/systems/SlotEngine';

const CELL = UNIT_CELL_SIZE;
const GAP  = UNIT_CELL_GAP;

/**
 * Renders a 3x3 formation grid as geometric shapes using Phaser.Graphics.
 * Each live unit shows its symbol shape + HP bar; dead units show a grey X overlay.
 * Call update(grid) after each round to refresh all cells.
 */
export class FormationGridView extends Phaser.GameObjects.Container {
  /** Which player panel this grid belongs to (used for tint/border colours). */
  readonly side: Side;
  private cells:           Phaser.GameObjects.Container[] = [];
  private hpBars:          Phaser.GameObjects.Rectangle[] = [];
  private deadOverlays:    Phaser.GameObjects.Graphics[]  = [];
  private shapeGraphics:   Phaser.GameObjects.Graphics[]  = [];

  /** Total pixel width of the 3x3 grid. */
  static readonly GRID_W = FORMATION_COLS * CELL + (FORMATION_COLS - 1) * GAP;
  /** Total pixel height of the 3x3 grid. */
  static readonly GRID_H = FORMATION_ROWS * CELL + (FORMATION_ROWS - 1) * GAP;

  constructor(scene: Phaser.Scene, side: Side) {
    super(scene, 0, 0);
    this.side = side;
    this._buildGrid();
    scene.add.existing(this);
  }

  /** Refresh all cells from a new FormationGrid snapshot. */
  update(grid: FormationGrid): void {
    for (let idx = 0; idx < 9; idx++) {
      const unit = grid[idx];
      const hpBar      = this.hpBars[idx];
      const deadOverlay = this.deadOverlays[idx];
      const gfx        = this.shapeGraphics[idx];

      if (!unit) {
        // Empty slot — show grey placeholder
        gfx.clear();
        gfx.fillStyle(0x333344, 0.5);
        gfx.fillRect(0, 0, CELL, CELL);
        hpBar.setVisible(false);
        deadOverlay.setVisible(false);
        continue;
      }

      const sym = SYMBOLS[unit.symbolId];

      // Draw symbol shape
      gfx.clear();
      if (unit.alive) {
        this._drawShape(gfx, sym.shape, sym.color, CELL / 2, CELL / 2, CELL * 0.38);
      } else {
        this._drawShape(gfx, sym.shape, 0x666666, CELL / 2, CELL / 2, CELL * 0.38);
      }

      // HP bar (full width at bottom of cell)
      const pct = Math.max(0, unit.hp / unit.maxHp);
      const barW = Math.round(CELL * pct);
      const barColor = pct > 0.5 ? 0x44dd44 : pct > 0.25 ? 0xffcc00 : 0xff3333;
      hpBar
        .setFillStyle(barColor)
        .setDisplaySize(barW, 4)
        .setVisible(true);

      // Dead overlay
      if (!unit.alive) {
        deadOverlay.clear();
        deadOverlay.fillStyle(0x000000, 0.6);
        deadOverlay.fillRect(0, 0, CELL, CELL);
        deadOverlay.lineStyle(2, 0xcc2222, 1);
        deadOverlay.beginPath();
        deadOverlay.moveTo(4, 4);
        deadOverlay.lineTo(CELL - 4, CELL - 4);
        deadOverlay.moveTo(CELL - 4, 4);
        deadOverlay.lineTo(4, CELL - 4);
        deadOverlay.strokePath();
        deadOverlay.setVisible(true);
      } else {
        deadOverlay.clear().setVisible(false);
      }
    }
  }

  // ---------------------------------------------------------------------------
  // Private: layout
  // ---------------------------------------------------------------------------

  private _buildGrid(): void {
    for (let row = 0; row < FORMATION_ROWS; row++) {
      for (let col = 0; col < FORMATION_COLS; col++) {
        const cx  = col * (CELL + GAP);
        const cy  = row * (CELL + GAP);

        const cell = this.scene.add.container(cx, cy);

        // Cell background
        const bg = this.scene.add.graphics();
        bg.fillStyle(0x111122, 1);
        bg.lineStyle(1, 0x334466, 0.8);
        bg.fillRect(0, 0, CELL, CELL);
        bg.strokeRect(0, 0, CELL, CELL);
        cell.add(bg);

        // Shape graphic
        const gfx = this.scene.add.graphics();
        cell.add(gfx);
        this.shapeGraphics.push(gfx);

        // HP bar (bottom of cell)
        const hpBar = this.scene.add.rectangle(0, CELL - 4, CELL, 4, 0x44dd44)
          .setOrigin(0, 0);
        cell.add(hpBar);
        this.hpBars.push(hpBar);

        // Dead overlay
        const deadOverlay = this.scene.add.graphics().setVisible(false);
        cell.add(deadOverlay);
        this.deadOverlays.push(deadOverlay);

        this.cells.push(cell);
        this.add(cell);
      }
    }
  }

  // ---------------------------------------------------------------------------
  // Private: shape drawing
  // ---------------------------------------------------------------------------

  private _drawShape(
    gfx:    Phaser.GameObjects.Graphics,
    shape:  string,
    color:  number,
    cx:     number,
    cy:     number,
    r:      number,
  ): void {
    gfx.fillStyle(color, 0.9);
    gfx.lineStyle(1.5, 0xffffff, 0.4);

    switch (shape) {
      case 'circle':
        gfx.fillCircle(cx, cy, r);
        gfx.strokeCircle(cx, cy, r);
        break;

      case 'square':
        gfx.fillRect(cx - r, cy - r, r * 2, r * 2);
        gfx.strokeRect(cx - r, cy - r, r * 2, r * 2);
        break;

      case 'triangle': {
        const h = r * 1.73;
        gfx.fillTriangle(cx, cy - r, cx - r, cy + r * 0.5, cx + r, cy + r * 0.5);
        gfx.beginPath();
        gfx.moveTo(cx, cy - r);
        gfx.lineTo(cx - r, cy + r * 0.5);
        gfx.lineTo(cx + r, cy + r * 0.5);
        gfx.closePath();
        gfx.strokePath();
        void h;
        break;
      }

      case 'diamond':
        gfx.beginPath();
        gfx.moveTo(cx,       cy - r);
        gfx.lineTo(cx + r,   cy);
        gfx.lineTo(cx,       cy + r);
        gfx.lineTo(cx - r,   cy);
        gfx.closePath();
        gfx.fillPath();
        gfx.strokePath();
        break;

      case 'hexagon':
        this._drawPolygon(gfx, cx, cy, r, 6, Math.PI / 6);
        break;

      case 'star':
        this._drawStar(gfx, cx, cy, r, r * 0.45, 5);
        break;

      case 'cross': {
        const t = r * 0.35;
        gfx.fillRect(cx - t, cy - r, t * 2, r * 2);
        gfx.fillRect(cx - r, cy - t, r * 2, t * 2);
        break;
      }

      case 'heart':
        this._drawHeart(gfx, cx, cy, r);
        break;

      default:
        gfx.fillCircle(cx, cy, r);
        break;
    }
  }

  private _drawPolygon(
    gfx:    Phaser.GameObjects.Graphics,
    cx:     number,
    cy:     number,
    r:      number,
    sides:  number,
    offset: number = 0,
  ): void {
    const pts: { x: number; y: number }[] = [];
    for (let i = 0; i < sides; i++) {
      const a = (Math.PI * 2 * i) / sides + offset;
      pts.push({ x: cx + Math.cos(a) * r, y: cy + Math.sin(a) * r });
    }
    gfx.beginPath();
    pts.forEach((p, i) => {
      if (i === 0) gfx.moveTo(p.x, p.y);
      else         gfx.lineTo(p.x, p.y);
    });
    gfx.closePath();
    gfx.fillPath();
    gfx.strokePath();
  }

  private _drawStar(
    gfx:     Phaser.GameObjects.Graphics,
    cx:      number,
    cy:      number,
    outerR:  number,
    innerR:  number,
    points:  number,
  ): void {
    const pts: { x: number; y: number }[] = [];
    for (let i = 0; i < points * 2; i++) {
      const a = (Math.PI * 2 * i) / (points * 2) - Math.PI / 2;
      const r = i % 2 === 0 ? outerR : innerR;
      pts.push({ x: cx + Math.cos(a) * r, y: cy + Math.sin(a) * r });
    }
    gfx.beginPath();
    pts.forEach((p, i) => {
      if (i === 0) gfx.moveTo(p.x, p.y);
      else         gfx.lineTo(p.x, p.y);
    });
    gfx.closePath();
    gfx.fillPath();
    gfx.strokePath();
  }

  private _drawHeart(
    gfx: Phaser.GameObjects.Graphics,
    cx:  number,
    cy:  number,
    r:   number,
  ): void {
    // Approximate heart with two circles + triangle
    const offset = r * 0.5;
    gfx.fillCircle(cx - offset, cy - r * 0.1, r * 0.52);
    gfx.fillCircle(cx + offset, cy - r * 0.1, r * 0.52);
    gfx.fillTriangle(
      cx - r, cy - r * 0.1,
      cx + r, cy - r * 0.1,
      cx,     cy + r,
    );
  }

  destroy(fromScene?: boolean): void {
    super.destroy(fromScene);
  }
}

// Avoid "declared but never used" for CANVAS constants — these are imported
// by GameConfig and used in parent layout but not directly here.
void CANVAS_WIDTH; void CANVAS_HEIGHT;
