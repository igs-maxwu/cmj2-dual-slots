import Phaser from 'phaser';
import { GOLD, FONT, FG } from '@/config/DesignTokens';

/**
 * Options for {@link GoldText}. Most fields have sensible defaults that
 * match the handoff's `.ds-hero-title` class.
 *
 * @property fontSize    Display font size in px. Default 56. Hero titles use 88.
 * @property fontFamily  CSS font stack. Defaults to the calligraphy display face.
 * @property strokeWidth Outer stroke thickness. Default 4 for hero, scale down for UI.
 * @property drop        Offset Y for the dark drop-shadow layer. Default 4.
 * @property glow        If true (default), render a wider transparent gold halo behind.
 */
export interface GoldTextOptions {
  fontSize?:    number;
  fontFamily?:  string;
  strokeWidth?: number;
  drop?:        number;
  glow?:        boolean;
  origin?:      number;   // shared X/Y origin; default 0.5
}

/**
 * Calligraphy hero title — the "雀靈戰記" wordmark layer.
 *
 * Phaser's `Text` fill does not accept CSS gradients directly; the gold
 * gradient from the handoff's `--grad-gold-text` is faked here via the
 * WebGL per-vertex tint API (top vertices pale, bottom vertices shadow),
 * plus a thick dark-gold stroke and an offset drop-shadow layer for the
 * "書法大標" weight. A soft outer halo sells the glow.
 *
 * Use this for hero wordmarks (game title, MEGA WIN), not body copy.
 */
export class GoldText extends Phaser.GameObjects.Container {
  private readonly dropText:   Phaser.GameObjects.Text;
  private readonly mainText:   Phaser.GameObjects.Text;
  private readonly glowText?:  Phaser.GameObjects.Text;

  constructor(scene: Phaser.Scene, text: string, opts: GoldTextOptions = {}) {
    super(scene, 0, 0);

    const fontSize    = opts.fontSize    ?? 56;
    const fontFamily  = opts.fontFamily  ?? FONT.display;
    const strokeWidth = opts.strokeWidth ?? Math.max(2, Math.round(fontSize / 28));
    const drop        = opts.drop        ?? 4;
    const wantGlow    = opts.glow        ?? true;
    const origin      = opts.origin      ?? 0.5;

    // Layer 1 — soft outer halo. Wider stroke, transparent gold, behind everything.
    if (wantGlow) {
      this.glowText = scene.add.text(0, 0, text, {
        fontFamily,
        fontSize:      `${fontSize}px`,
        color:         '#ffc94d',
        stroke:        '#ffc94d',
        strokeThickness: strokeWidth + 6,
      }).setOrigin(origin).setAlpha(0.35);
      this.add(this.glowText);
    }

    // Layer 2 — drop shadow (dark-gold offset copy). Sits beneath the main layer.
    this.dropText = scene.add.text(0, drop, text, {
      fontFamily,
      fontSize:      `${fontSize}px`,
      color:         this._hex(GOLD.shadow),
      stroke:        this._hex(GOLD.shadow),
      strokeThickness: strokeWidth,
    }).setOrigin(origin);
    this.add(this.dropText);

    // Layer 3 — the main calligraphy fill. White pixels so the WebGL tint
    // below can paint a full gradient (tint multiplies, so white == identity).
    this.mainText = scene.add.text(0, 0, text, {
      fontFamily,
      fontSize:      `${fontSize}px`,
      color:         this._hex(FG.white),
      stroke:        this._hex(GOLD.shadow),
      strokeThickness: strokeWidth,
      shadow: {
        offsetX: 0, offsetY: 2, color: this._hex(GOLD.shadow),
        blur: 0, stroke: true, fill: true,
      },
    }).setOrigin(origin);

    // Vertical gold gradient via the 4-corner tint API
    // (topLeft, topRight, bottomLeft, bottomRight).
    this.mainText.setTint(GOLD.pale, GOLD.pale, GOLD.deep, GOLD.deep);

    this.add(this.mainText);
  }

  /** Update the wordmark text across all layers at once. */
  setText(text: string | string[]): this {
    this.dropText.setText(text);
    this.mainText.setText(text);
    this.glowText?.setText(text);
    return this;
  }

  /** Width of the main text layer — useful for centring next to siblings. */
  getTextWidth(): number {
    return this.mainText.width;
  }

  private _hex(c: number): string {
    return '#' + c.toString(16).padStart(6, '0');
  }
}
