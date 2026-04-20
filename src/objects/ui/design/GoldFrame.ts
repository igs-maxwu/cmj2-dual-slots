import Phaser from 'phaser';
import { GOLD, SURF, SEA, RADIUS, FRAME } from '@/config/DesignTokens';

/**
 * Options for {@link GoldFrame}.
 *
 * @property radius       Corner radius in px. Defaults to `RADIUS.md` (10).
 * @property borderWidth  Gold border thickness in px. Defaults to `FRAME.goldW` (3).
 * @property panelColor   0xRRGGBB fill for the inner panel. Defaults to `SURF.panel.color`.
 * @property panelAlpha   Alpha 0..1 for the inner panel. Defaults to `SURF.panel.alpha` (0.85).
 * @property dropShadow   Render an offset black rounded rect behind for "浮起" effect. Default true.
 * @property hairlineHi   Draw a 1px pale-gold highlight along the top edge of the border. Default true.
 */
export interface GoldFrameOptions {
  radius?:      number;
  borderWidth?: number;
  panelColor?:  number;
  panelAlpha?:  number;
  dropShadow?:  boolean;
  hairlineHi?:  boolean;
}

/**
 * Cartouche primitive — every panel in the deep-sea design system sits on one
 * of these. Mirrors the handoff's `.ds-frame` class:
 *
 *   • Outer drop shadow (offset black rounded rect)
 *   • `borderWidth` gold rim (solid GOLD.base with optional top hairline highlight)
 *   • Inner panel fill (semi-transparent deep-sea navy by default)
 *
 * Phaser's `fillRoundedRect` only accepts solid fills, so the gradient look
 * from the CSS `--grad-gold-v` is approximated here by a solid gold body + a
 * 1px pale-gold highlight along the top edge. Good enough at a 3px border.
 *
 * The origin is top-left — add this to a Container and position via `x` / `y`,
 * or stack other objects over it by adding them to the same parent after.
 */
export class GoldFrame extends Phaser.GameObjects.Container {
  private readonly _w:      number;
  private readonly _h:      number;
  private readonly _radius: number;

  constructor(scene: Phaser.Scene, w: number, h: number, opts: GoldFrameOptions = {}) {
    super(scene, 0, 0);
    this._w      = w;
    this._h      = h;
    this._radius = opts.radius      ?? RADIUS.md;

    const borderW    = opts.borderWidth ?? FRAME.goldW;
    const panelColor = opts.panelColor  ?? SURF.panel.color;
    const panelAlpha = opts.panelAlpha  ?? SURF.panel.alpha;
    const dropShadow = opts.dropShadow  ?? true;
    const hairlineHi = opts.hairlineHi  ?? true;

    if (dropShadow) this._drawDropShadow();
    this._drawGoldBorder(borderW);
    if (hairlineHi) this._drawHighlight(borderW);
    this._drawPanel(borderW, panelColor, panelAlpha);
  }

  /** Expose the frame's outer bounds so callers know where to anchor children. */
  getInnerRect(borderWidth = FRAME.goldW): Phaser.Geom.Rectangle {
    return new Phaser.Geom.Rectangle(
      borderWidth,
      borderWidth,
      this._w - borderWidth * 2,
      this._h - borderWidth * 2,
    );
  }

  /** Public width / height accessors (the inherited Container `width`/`height` are dynamic). */
  get frameWidth():  number { return this._w; }
  get frameHeight(): number { return this._h; }

  private _drawDropShadow(): void {
    const g = this.scene.add.graphics();
    g.fillStyle(0x000000, 0.55);
    g.fillRoundedRect(0, 6, this._w, this._h, this._radius);
    this.add(g);
  }

  private _drawGoldBorder(borderW: number): void {
    const g = this.scene.add.graphics();
    // Solid gold body — the inner panel will cover the centre, leaving a rim.
    g.fillStyle(GOLD.base, 1);
    g.fillRoundedRect(0, 0, this._w, this._h, this._radius);
    // Inset a 1px strip of the deeper gold along the bottom edge to fake the
    // vertical gradient's lower half (handoff's `--grad-gold-v` ends in shadow).
    g.fillStyle(GOLD.deep, 1);
    g.fillRoundedRect(0, this._h - borderW, this._w, borderW, 0);
    // Re-apply rounded corners over the square strip by redrawing corner caps.
    g.fillStyle(GOLD.base, 1);
    g.fillRoundedRect(0, 0, this._w, this._h - 1, this._radius);
    this.add(g);
  }

  private _drawHighlight(borderW: number): void {
    // 1px pale-gold hairline across the top edge inside the border — sells
    // the "金屬反光" reading at small sizes.
    const g = this.scene.add.graphics();
    g.fillStyle(GOLD.pale, 0.9);
    g.fillRoundedRect(borderW, borderW - 1, this._w - borderW * 2, 1, 0.5);
    this.add(g);
  }

  private _drawPanel(borderW: number, color: number, alpha: number): void {
    const g = this.scene.add.graphics();
    g.fillStyle(color, alpha);
    const innerR = Math.max(1, this._radius - borderW);
    g.fillRoundedRect(borderW, borderW, this._w - borderW * 2, this._h - borderW * 2, innerR);
    this.add(g);

    // Inner rim shadow — one-pixel dark line hugging the top of the inner
    // panel, matching `inset 0 -2px 4px rgba(0,0,0,0.5)` from --sh-frame-inner.
    const rim = this.scene.add.graphics();
    rim.fillStyle(SEA.abyss, 0.45);
    rim.fillRoundedRect(borderW, this._h - borderW - 2, this._w - borderW * 2, 2, 0.5);
    this.add(rim);
  }
}
