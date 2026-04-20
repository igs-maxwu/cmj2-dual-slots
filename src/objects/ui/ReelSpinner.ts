import Phaser from 'phaser';
import { REEL_COLS, REEL_ROWS } from '@/config/GameConfig';
import { LAYOUT } from '@/config/DesignTokens';
import { FxManager } from '@/systems/FxManager';

// Indexed by symbol ID 0–12. Colors match symbols.json.
const VISUALS = [
  { color: 0xFF6B6B, shape: 'diamond', tier: 1 }, // 0  Yi-Wan
  { color: 0xE63946, shape: 'diamond', tier: 2 }, // 1  Wu-Wan
  { color: 0x9B1B30, shape: 'diamond', tier: 3 }, // 2  Jiu-Wan
  { color: 0x48CAE4, shape: 'circle',  tier: 1 }, // 3  Yi-Pin
  { color: 0x0096C7, shape: 'circle',  tier: 2 }, // 4  Wu-Pin
  { color: 0x023E8A, shape: 'circle',  tier: 3 }, // 5  Jiu-Pin
  { color: 0x52B788, shape: 'rect',    tier: 1 }, // 6  Yi-Sou
  { color: 0x2D6A4F, shape: 'rect',    tier: 2 }, // 7  Wu-Sou
  { color: 0x1B4332, shape: 'rect',    tier: 3 }, // 8  Jiu-Sou
  { color: 0xFFD166, shape: 'hex',     tier: 1 }, // 9  Feng
  { color: 0xEF9B0F, shape: 'tri',     tier: 2 }, // 10 Zhong-Fa
  { color: 0xF8F9FA, shape: 'square',  tier: 3 }, // 11 Bai
  { color: 0xB5179E, shape: 'star',    tier: 3 }, // 12 Que-Wang
] as const;

const TIER_SCALE = [0, 0.6, 0.8, 1.0] as const;

/**
 * [The Illusionist] — Animated reel strip controller.
 * Creates REEL_COLS column containers, each holding REEL_ROWS Graphics cells.
 * spin() starts rapid symbol cycling, then lands columns left→right.
 */
export class ReelSpinner {
  private scene:      Phaser.Scene;
  private fxManager:  FxManager;
  private originX:    number;
  private originY:    number;

  private colContainers: Phaser.GameObjects.Container[] = [];
  private cellGraphics:  Phaser.GameObjects.Graphics[][] = [];
  private spinEvents:    (Phaser.Time.TimerEvent | null)[] = [];
  private finalGrid:     number[][] = [];

  constructor(
    scene:    Phaser.Scene,
    originX:  number,
    originY:  number,
    fxManager: FxManager
  ) {
    this.scene     = scene;
    this.fxManager = fxManager;
    this.originX   = originX;
    this.originY   = originY;
    this._buildColumns();
  }

  /** Instantly display a grid without animation. grid[row][col] = symbolId. */
  displayGrid(grid: number[][]): void {
    for (let c = 0; c < REEL_COLS; c++) {
      for (let r = 0; r < REEL_ROWS; r++) {
        this._paintCell(c, r, grid[r]?.[c] ?? 0);
      }
    }
  }

  /**
   * Spin animation: cycle random symbols then land on finalGrid.
   * Columns stop left→right with 200 ms stagger starting at t=1400 ms.
   * @param grid     Result from SlotEngine — [row][col] = symbolId
   * @param poolIds  Symbol IDs available for random cycling during spin
   */
  spin(grid: number[][], poolIds: number[]): Promise<void> {
    this.finalGrid = grid;

    for (let c = 0; c < REEL_COLS; c++) {
      this._startCycling(c, poolIds);
    }

    // NOTE: window.setTimeout used intentionally instead of scene.time.delayedCall.
    // Phaser 3.90 one-shot TimerEvents appear to never advance elapsed in this setup;
    // looping events (cycling) work fine. Native setTimeout is reliable.
    return new Promise(resolve => {
      let landed = 0;
      for (let c = 0; c < REEL_COLS; c++) {
        const delay = 1400 + c * 200;
        window.setTimeout(() => {
          this._landColumn(c).then(() => {
            if (++landed === REEL_COLS) resolve();
          }).catch(err => console.error('[Spinner] land error col=' + c, err));
        }, delay);
      }
    });
  }

  destroy(): void {
    this.spinEvents.forEach(ev => ev?.remove(false));
    this.colContainers.forEach(c => c.destroy());
  }

  // ─── Private ────────────────────────────────────────────────────────────────

  private _buildColumns(): void {
    const { reelCellW, reelCellH, reelCellGap } = LAYOUT;
    const step = reelCellW + reelCellGap;

    for (let c = 0; c < REEL_COLS; c++) {
      const col = this.scene.add.container(
        this.originX + c * step + reelCellW / 2,
        this.originY
      ).setDepth(2);

      this.colContainers.push(col);
      this.cellGraphics.push([]);
      this.spinEvents.push(null);

      for (let r = 0; r < REEL_ROWS; r++) {
        const gfx = this.scene.add.graphics();
        gfx.y = r * (reelCellH + reelCellGap) + reelCellH / 2;
        col.add(gfx);
        this.cellGraphics[c].push(gfx);
      }
    }
  }

  private _startCycling(col: number, pool: number[]): void {
    const ev = this.scene.time.addEvent({
      delay:    55,
      loop:     true,
      callback: () => {
        for (let r = 0; r < REEL_ROWS; r++) {
          this._paintCell(col, r, pool[Math.floor(Math.random() * pool.length)]);
        }
      },
    });
    this.spinEvents[col] = ev;
  }

  private async _landColumn(col: number): Promise<void> {
    this.spinEvents[col]?.remove(false);
    this.spinEvents[col] = null;

    for (let r = 0; r < REEL_ROWS; r++) {
      this._paintCell(col, r, this.finalGrid[r]?.[col] ?? 0);
    }

    await this.fxManager.reelStopBounce(this.colContainers[col]);
  }

  private _paintCell(col: number, row: number, symbolId: number): void {
    const gfx = this.cellGraphics[col]?.[row];
    if (!gfx) return;

    const vis = VISUALS[symbolId] ?? VISUALS[0];
    const hw  = LAYOUT.reelCellW / 2 - 4;
    const hh  = LAYOUT.reelCellH / 2 - 4;
    const sz  = Math.min(hw, hh) * TIER_SCALE[vis.tier];

    gfx.clear();
    gfx.fillStyle(vis.color, 1);
    this._drawShape(gfx, vis.shape, sz);
  }

  private _drawShape(gfx: Phaser.GameObjects.Graphics, shape: string, sz: number): void {
    switch (shape) {
      case 'diamond':
        gfx.beginPath();
        gfx.moveTo(0, -sz); gfx.lineTo(sz,  0);
        gfx.lineTo(0,  sz); gfx.lineTo(-sz, 0);
        gfx.closePath(); gfx.fillPath();
        break;
      case 'circle':
        gfx.fillCircle(0, 0, sz);
        break;
      case 'rect':
        gfx.fillRect(-sz * 0.5, -sz, sz, sz * 2);
        break;
      case 'hex': {
        gfx.beginPath();
        for (let i = 0; i < 6; i++) {
          const a = (i * Math.PI) / 3 - Math.PI / 6;
          if (i === 0) gfx.moveTo(Math.cos(a) * sz, Math.sin(a) * sz);
          else         gfx.lineTo(Math.cos(a) * sz, Math.sin(a) * sz);
        }
        gfx.closePath(); gfx.fillPath();
        break;
      }
      case 'tri':
        gfx.beginPath();
        gfx.moveTo(0, -sz); gfx.lineTo(sz, sz); gfx.lineTo(-sz, sz);
        gfx.closePath(); gfx.fillPath();
        break;
      case 'square':
        gfx.lineStyle(3, 0xF8F9FA, 1);
        gfx.strokeRect(-sz, -sz, sz * 2, sz * 2);
        break;
      case 'star': {
        gfx.beginPath();
        for (let i = 0; i < 5; i++) {
          const ao = ((18 + i * 72) * Math.PI) / 180;
          const ai = ((54 + i * 72) * Math.PI) / 180;
          if (i === 0) gfx.moveTo(Math.cos(ao) * sz, -Math.sin(ao) * sz);
          else         gfx.lineTo(Math.cos(ao) * sz, -Math.sin(ao) * sz);
          gfx.lineTo(Math.cos(ai) * sz * 0.4, -Math.sin(ai) * sz * 0.4);
        }
        gfx.closePath(); gfx.fillPath();
        break;
      }
      default:
        gfx.fillCircle(0, 0, sz * 0.7);
    }
  }
}
