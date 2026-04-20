import Phaser from 'phaser';
import { COLORS, LAYOUT, GOLD, SURF, RADIUS } from '@/config/DesignTokens';
import { REEL_COLS, REEL_ROWS, CANVAS_WIDTH } from '@/config/GameConfig';
import { GoldFrame } from './design/GoldFrame';

/**
 * [The Stylist] — Visual container for the 4×5 reel grid.
 * Provides:
 *   - Outer gold-bordered frame
 *   - Individual cell containers (each is a child for [The Illusionist] to animate)
 *   - Symbol placeholder rendering via `updateCell(col, row, symbolColor, shape)`
 *
 * [The Illusionist] should access `.getCellContainer(col, row)` for FX attachment.
 */
export class ReelGrid extends Phaser.GameObjects.Container {
  private cells: Phaser.GameObjects.Container[][] = [];

  constructor(scene: Phaser.Scene) {
    const { reelTotalW } = LAYOUT;
    const x = (CANVAS_WIDTH - reelTotalW) / 2;
    super(scene, x, LAYOUT.reelY + 14);
    scene.add.existing(this);
    this._buildFrame();
    this._buildCells();
  }

  // ─── Public API ─────────────────────────────────────────────────────────────

  /** Update a cell's visual content. Called by the render layer each frame. */
  updateCell(col: number, row: number, color: number, shape: string): void {
    const cell = this.getCellContainer(col, row);
    if (!cell) return;

    // Remove previous symbol (tagged with 'symbol')
    cell.getAll('name', 'symbol').forEach(o => o.destroy());

    const hw = LAYOUT.reelCellW / 2;
    const hh = LAYOUT.reelCellH / 2;
    const sz = Math.min(hw, hh) * 0.65;

    const gfx = this.scene.add.graphics().setName('symbol');
    gfx.fillStyle(color, 1);
    gfx.lineStyle(1, 0x000000, 0.3);
    this._drawShape(gfx, shape, sz);
    cell.add(gfx);
  }

  /** Expose a cell Container for [The Illusionist] to attach FX. */
  getCellContainer(col: number, row: number): Phaser.GameObjects.Container | undefined {
    return this.cells[col]?.[row];
  }

  // ─── Private ────────────────────────────────────────────────────────────────

  private _buildFrame(): void {
    const { reelTotalW, reelTotalH } = LAYOUT;
    const pad = 14;

    // Gold cartouche wrapping the reel — uses dark inlay panel (almost
    // black-navy) so symbols read as inlaid gems on a gold setting.
    const frame = new GoldFrame(this.scene, reelTotalW + pad * 2, reelTotalH + pad * 2, {
      radius:     RADIUS.lg,
      panelColor: SURF.darkInlay.color,
      panelAlpha: 0.95,
    });
    frame.x = -pad;
    frame.y = -pad;
    this.add(frame);

    // Four gold corner studs — echoes traditional cartouche corner rivets.
    const studOffset = pad - 2;
    const corners: Array<[number, number]> = [
      [-studOffset, -studOffset],
      [reelTotalW + studOffset, -studOffset],
      [-studOffset, reelTotalH + studOffset],
      [reelTotalW + studOffset, reelTotalH + studOffset],
    ];
    corners.forEach(([cx, cy]) => {
      const stud = this.scene.add.graphics();
      stud.fillStyle(GOLD.base, 1);
      stud.fillCircle(cx, cy, 4);
      stud.fillStyle(GOLD.light, 0.9);
      stud.fillCircle(cx - 1, cy - 1, 1.5);
      this.add(stud);
    });
  }

  private _buildCells(): void {
    const { reelCellW, reelCellH, reelCellGap } = LAYOUT;

    for (let c = 0; c < REEL_COLS; c++) {
      this.cells[c] = [];
      for (let r = 0; r < REEL_ROWS; r++) {
        const cx = c * (reelCellW + reelCellGap) + reelCellW / 2;
        const cy = r * (reelCellH + reelCellGap) + reelCellH / 2;

        const cell = this.scene.add.container(cx, cy);

        const bg = this.scene.add.rectangle(0, 0, reelCellW, reelCellH, COLORS.bgReel)
          .setStrokeStyle(1, COLORS.borderNormal);
        cell.add(bg);

        this.cells[c][r] = cell;
        this.add(cell);
      }
    }
  }

  private _drawShape(gfx: Phaser.GameObjects.Graphics, shape: string, sz: number): void {
    switch (shape) {
      case 'man1': case 'man5': case 'man9':
        // Diamond for Man
        gfx.beginPath();
        gfx.moveTo(0, -sz); gfx.lineTo(sz, 0);
        gfx.lineTo(0, sz);  gfx.lineTo(-sz, 0);
        gfx.closePath(); gfx.fillPath();
        break;
      case 'pin1': case 'pin5': case 'pin9':
        // Circle for Pin
        gfx.fillCircle(0, 0, sz * 0.9);
        break;
      case 'sou1': case 'sou5': case 'sou9':
        // Rectangle for Sou
        gfx.fillRect(-sz * 0.5, -sz, sz, sz * 2);
        break;
      case 'wind':
        // Square rotated 45° for Wind
        gfx.beginPath();
        gfx.moveTo(0, -sz); gfx.lineTo(sz * 0.7, -sz * 0.3);
        gfx.lineTo(sz * 0.7, sz * 0.3); gfx.lineTo(0, sz);
        gfx.lineTo(-sz * 0.7, sz * 0.3); gfx.lineTo(-sz * 0.7, -sz * 0.3);
        gfx.closePath(); gfx.fillPath();
        break;
      case 'dragon':
        // Triangle for Dragon
        gfx.beginPath();
        gfx.moveTo(0, -sz); gfx.lineTo(sz, sz); gfx.lineTo(-sz, sz);
        gfx.closePath(); gfx.fillPath();
        break;
      case 'white':
        // Open square for White (blank)
        gfx.lineStyle(3, 0xffffff, 1);
        gfx.strokeRect(-sz * 0.8, -sz * 0.8, sz * 1.6, sz * 1.6);
        break;
      case 'star': {
        // 5-pointed star for Wild
        gfx.beginPath();
        for (let i = 0; i < 5; i++) {
          const outer = ((18 + i * 72) * Math.PI) / 180;
          const inner = ((54 + i * 72) * Math.PI) / 180;
          if (i === 0) gfx.moveTo(Math.cos(outer) * sz, -Math.sin(outer) * sz);
          else         gfx.lineTo(Math.cos(outer) * sz, -Math.sin(outer) * sz);
          gfx.lineTo(Math.cos(inner) * sz * 0.45, -Math.sin(inner) * sz * 0.45);
        }
        gfx.closePath(); gfx.fillPath();
        break;
      }
      default:
        gfx.fillCircle(0, 0, sz * 0.7);
    }
  }
}
