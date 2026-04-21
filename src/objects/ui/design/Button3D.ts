import Phaser from 'phaser';
import { CTA, GOLD, SEA, FG, FONT, FONT_SIZE, RADIUS, MOTION } from '@/config/DesignTokens';

export type ButtonVariant = 'green' | 'gold' | 'red' | 'dark';
export type ButtonState   = 'idle' | 'disabled';

/**
 * Options for {@link Button3D}.
 *
 * @property variant    Colour family. `green` is the primary CTA (押注);
 *                      `gold` is for 最大押注 / 商城; `red` for 離開 / 危險;
 *                      `dark` for subtle secondary.
 * @property label      Visible text. ALL-CAPS Latin or short Chinese phrase.
 * @property width      Button width in px. Default 200.
 * @property height     Button height in px. Default 56.
 * @property radius     Corner radius. Default `RADIUS.pill` (a proper pill).
 * @property fontSize   Label font size. Default `FONT_SIZE.lg` (18).
 * @property onClick    Pointer-up callback. Fired only when not disabled.
 */
export interface Button3DOptions {
  variant?:  ButtonVariant;
  label:     string;
  width?:    number;
  height?:   number;
  radius?:   number;
  fontSize?: number;
  onClick?:  () => void;
}

interface VariantPalette {
  base:  number;
  light: number;
  deep:  number;
}

const VARIANT_PALETTES: Record<ButtonVariant, VariantPalette> = {
  green: { base: CTA.green,     light: CTA.greenLight,    deep: CTA.greenDeep   },
  gold:  { base: GOLD.base,     light: GOLD.light,        deep: GOLD.shadow     },
  red:   { base: CTA.red,       light: 0xff7b62,          deep: CTA.redDeep     },
  dark:  { base: 0x1a3258,      light: 0x27507a,          deep: 0x0a1a30        },
};

/**
 * 3D厚按鈕 — the cartouche-framed, "can-be-pressed" button family from the
 * handoff. Physicality comes from three layered rectangles:
 *
 *   1. An offset dark drop shadow beneath — "floor" the button rests on.
 *   2. The main body rounded rect, filled in the variant's base colour.
 *   3. A lighter top strip (~35 % of height) for the gloss highlight.
 *
 * On press the whole container translates down 2 px, the shadow shrinks,
 * and the body darkens — matching `translateY(2px)` from the CSS.
 *
 * Hover brightens the body by swapping to the variant's `light` colour.
 * Disabled desaturates + dims to 40 % alpha.
 */
export class Button3D extends Phaser.GameObjects.Container {
  readonly variant: ButtonVariant;
  private readonly _w: number;
  private readonly _h: number;
  private readonly _radius: number;
  private readonly palette: VariantPalette;

  private shadow!: Phaser.GameObjects.Graphics;
  private _body!:  Phaser.GameObjects.Graphics;
  private gloss!:  Phaser.GameObjects.Graphics;
  private border!: Phaser.GameObjects.Graphics;
  private label!:  Phaser.GameObjects.Text;

  private _state: ButtonState = 'idle';
  private _isDown   = false;
  private _isHover  = false;

  constructor(scene: Phaser.Scene, opts: Button3DOptions) {
    super(scene, 0, 0);

    this.variant = opts.variant ?? 'green';
    this._w      = opts.width   ?? 200;
    this._h      = opts.height  ?? 56;
    this._radius = opts.radius  ?? RADIUS.pill;
    this.palette = VARIANT_PALETTES[this.variant];

    this._build(opts.label, opts.fontSize ?? FONT_SIZE.lg);
    this._wireInteractions(opts.onClick);
  }

  /** Swap the rendered label text. */
  setLabel(text: string): this {
    this.label.setText(text);
    return this;
  }

  /** Toggle between interactive (`idle`) and non-interactive (`disabled`). */
  setState(state: ButtonState): this {
    this._state = state;
    if (state === 'disabled') {
      this.setAlpha(0.4);
      this.disableInteractive();
    } else {
      this.setAlpha(1);
      this.setInteractive({ useHandCursor: true });
    }
    this._repaint();
    return this;
  }

  /** Read-only accessor for callers that need to check state. */
  getState(): ButtonState {
    return this._state;
  }

  // ─── Private ────────────────────────────────────────────────────────────

  private _build(labelText: string, fontSize: number): void {
    this.shadow = this.scene.add.graphics();
    this._body  = this.scene.add.graphics();
    this.gloss  = this.scene.add.graphics();
    this.border = this.scene.add.graphics();

    this.add([this.shadow, this._body, this.gloss, this.border]);

    // Label on top of the gloss, centred in the body
    this.label = this.scene.add.text(this._w / 2, this._h / 2, labelText, {
      fontFamily: FONT.bold,
      fontSize:   `${fontSize}px`,
      color:      this._hex(FG.white),
      stroke:     this._hex(SEA.abyss),
      strokeThickness: 2,
      shadow: {
        offsetX: 0, offsetY: 1, color: this._hex(SEA.abyss),
        blur: 0, fill: true,
      },
    }).setOrigin(0.5, 0.5);
    this.add(this.label);

    // Size the hit area and register input
    this.setSize(this._w, this._h + 6); // include shadow in hit box
    this.setInteractive({ useHandCursor: true });

    this._repaint();
  }

  private _wireInteractions(onClick?: () => void): void {
    this.on(Phaser.Input.Events.POINTER_OVER, () => {
      if (this._state === 'disabled') return;
      this._isHover = true;
      this._repaint();
    });
    this.on(Phaser.Input.Events.POINTER_OUT, () => {
      this._isHover = false;
      this._isDown  = false;
      this._repaint();
    });
    this.on(Phaser.Input.Events.POINTER_DOWN, () => {
      if (this._state === 'disabled') return;
      this._isDown = true;
      this._repaint();
    });
    this.on(Phaser.Input.Events.POINTER_UP, () => {
      if (this._state === 'disabled') return;
      const wasDown = this._isDown;
      this._isDown  = false;
      this._repaint();
      if (wasDown && onClick) onClick();
    });
  }

  /**
   * Re-renders the four Graphics layers based on the current interaction
   * state. Cheap — each call clears and issues ~4 rounded-rect draws.
   */
  private _repaint(): void {
    const pressed = this._isDown;
    const hover   = this._isHover && !pressed;

    const bodyColor  = pressed ? this.palette.deep
                      : hover  ? this.palette.light
                      :          this.palette.base;
    const glossColor = pressed ? this.palette.base : this.palette.light;
    const offsetY    = pressed ? 1 : 0;
    const shadowY    = pressed ? 2 : 4;

    // 1) Drop shadow
    this.shadow.clear();
    this.shadow.fillStyle(0x000000, 0.35);
    this.shadow.fillRoundedRect(0, shadowY, this._w, this._h, this._radius);

    // 2) Main body
    this._body.clear();
    this._body.fillStyle(bodyColor, 1);
    this._body.fillRoundedRect(0, offsetY, this._w, this._h, this._radius);

    // 3) Gloss — top 35 % lightened
    const glossH = Math.round(this._h * 0.35);
    this.gloss.clear();
    this.gloss.fillStyle(glossColor, pressed ? 0.55 : 0.85);
    this.gloss.fillRoundedRect(2, offsetY + 2, this._w - 4, glossH, this._radius - 2);

    // 4) Gold border — draw two layers to fake a 2px stroked rounded rect.
    this.border.clear();
    this.border.fillStyle(GOLD.base, 1);
    this.border.fillRoundedRect(0, offsetY, this._w, this._h, this._radius);
    this.border.fillStyle(bodyColor, 1);
    this.border.fillRoundedRect(2, offsetY + 2, this._w - 4, this._h - 4, this._radius - 2);

    // Re-draw body on top of the hollowed border so the gold rim frames it.
    this._body.fillStyle(bodyColor, 1);
    this._body.fillRoundedRect(2, offsetY + 2, this._w - 4, this._h - 4, this._radius - 2);

    // Re-draw gloss on top of the new body — keeps the highlight visible
    // above the border's inner cut-out.
    this.gloss.clear();
    this.gloss.fillStyle(glossColor, pressed ? 0.45 : 0.75);
    this.gloss.fillRoundedRect(4, offsetY + 4, this._w - 8, glossH, Math.max(0, this._radius - 4));

    // Shift the label with the pressed body so the type follows the 3D motion.
    this.label.y = this._h / 2 + offsetY;
  }

  private _hex(c: number): string {
    return '#' + c.toString(16).padStart(6, '0');
  }
}

/** Duration shorthand consumers can reuse for tween parity with CSS `--dur-fast`. */
export const BUTTON_HOVER_MS = MOTION.durFast;
