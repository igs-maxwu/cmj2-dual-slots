import Phaser from 'phaser';
import { CANVAS_WIDTH, CANVAS_HEIGHT } from '@/config/GameConfig';
import { FONT, FONT_SIZE, GOLD } from '@/config/DesignTokens';
import { GoldText } from './design/GoldText';

export type WinKind = 'big' | 'mega';

/**
 * [The Stylist + The Illusionist] — Full-screen BIG WIN / MEGA WIN overlay.
 *
 * Visual layers (back → front):
 *   1. Semi-transparent dark veil (0.65 alpha)
 *   2. Soft radial gold glow at centre
 *   3. Chinese idiom subtitle (雷霆萬鈞 / 天降橫財)
 *   4. Hero wordmark (BIG WIN / MEGA WIN) via GoldText, scale-bounce entrance
 *   5. Coin ticker counting up from 0 → amount over 1.4 s
 *   6. "TAP TO CONTINUE ›" prompt
 *
 * Usage:
 *   this._bigWin = new BigWinOverlay(this);   // created once in create()
 *   this._bigWin.show('big', 12000);           // trigger when a large hit lands
 *
 * Auto-dismisses after 3.2 s.  Pointer-down anywhere on the veil also dismisses.
 * The overlay does NOT block the spin FSM — it is purely cosmetic.
 */
export class BigWinOverlay extends Phaser.GameObjects.Container {
  private _headlineGold!: GoldText;
  private _subtitleText!: Phaser.GameObjects.Text;
  private _tickerText!:   Phaser.GameObjects.Text;
  private _glow!:         Phaser.GameObjects.Graphics;
  private _dismissTimer?: Phaser.Time.TimerEvent;
  private _tickerTimer?:  Phaser.Time.TimerEvent;

  constructor(scene: Phaser.Scene) {
    super(scene, 0, 0);
    scene.add.existing(this);
    this.setDepth(100).setVisible(false);
    this._build();
  }

  // ─── Public API ─────────────────────────────────────────────────────────────

  /**
   * Show the overlay with the appropriate tier label and winning amount.
   * @param kind   'big' → BIG WIN · 雷霆萬鈞   |   'mega' → MEGA WIN · 天降橫財
   * @param amount Coin payout to display in the ticker.
   */
  show(kind: WinKind, amount: number): void {
    this._clear();

    const headline = kind === 'mega' ? 'MEGA WIN' : 'BIG WIN';
    const subtitle = kind === 'mega' ? '天降橫財' : '雷霆萬鈞';

    this._headlineGold.setText(headline);
    this._subtitleText.setText(subtitle);

    this.setVisible(true).setAlpha(0);

    // Fade-in veil
    this.scene.tweens.add({
      targets:  this,
      alpha:    1,
      duration: 220,
      ease:     'Cubic.easeOut',
    });

    // Scale-bounce entrance on headline
    this._headlineGold.setScale(0.3);
    this.scene.tweens.add({
      targets:  this._headlineGold,
      scaleX:   1,
      scaleY:   1,
      duration: 1200,
      ease:     'Back.easeOut',
    });

    // Glow pulse
    this.scene.tweens.add({
      targets:  this._glow,
      alpha:    { from: 0.2, to: 0.45 },
      yoyo:     true,
      repeat:   -1,
      duration: 900,
      ease:     'Sine.easeInOut',
    });

    // Coin ticker
    this._startTicker(amount);

    // Auto-dismiss
    this._dismissTimer = this.scene.time.delayedCall(3200, () => this.hide());
  }

  hide(): void {
    this._clear();
    this.scene.tweens.add({
      targets:  this,
      alpha:    0,
      duration: FONT_SIZE.xl,   // reuse a small numeric constant
      ease:     'Cubic.easeIn',
      onComplete: () => this.setVisible(false).setAlpha(1),
    });
  }

  // ─── Private ────────────────────────────────────────────────────────────────

  private _build(): void {
    const W = CANVAS_WIDTH;
    const H = CANVAS_HEIGHT;
    const cx = W / 2;
    const cy = H / 2;

    // 1. Dark veil — click to dismiss
    const veil = this.scene.add.rectangle(cx, cy, W, H, 0x000000, 0.65)
      .setInteractive()
      .on('pointerdown', () => this.hide());
    this.add(veil);

    // 2. Radial gold glow
    this._glow = this.scene.add.graphics();
    this._glow.fillStyle(GOLD.glow, 1);
    this._glow.fillEllipse(cx, cy, 640, 380);
    this.add(this._glow);

    // 3. Chinese subtitle (above headline)
    this._subtitleText = this.scene.add.text(cx, cy - 94, '雷霆萬鈞', {
      fontSize:        `${FONT_SIZE.xl}px`,
      fontFamily:      FONT.display,
      color:           '#ffd54a',
      stroke:          '#8a5412',
      strokeThickness: 2,
    }).setOrigin(0.5, 1);
    this.add(this._subtitleText);

    // 4. Hero headline via GoldText (BIG WIN / MEGA WIN)
    this._headlineGold = new GoldText(this.scene, 'BIG WIN', {
      fontSize:    FONT_SIZE.hero,   // 88px — hero size
      fontFamily:  FONT.display,
      strokeWidth: 4,
      glow:        true,
      origin:      0.5,
    });
    this._headlineGold.setPosition(cx, cy - 80);
    this.add(this._headlineGold);

    // 5. Coin ticker
    this._tickerText = this.scene.add.text(cx, cy + 40, '$0', {
      fontSize:        `${FONT_SIZE.big}px`,   // 56px
      fontFamily:      FONT.num,
      color:           '#ffd54a',
      stroke:          '#8a5412',
      strokeThickness: 2,
    }).setOrigin(0.5, 0);
    this.add(this._tickerText);

    // 6. "TAP TO CONTINUE" prompt
    const prompt = this.scene.add.text(cx, cy + 130, 'TAP TO CONTINUE ›', {
      fontSize:   `${FONT_SIZE.xs}px`,
      fontFamily: FONT.body,
      color:      '#7ea3c7',
    }).setOrigin(0.5, 0);
    this.add(prompt);
  }

  private _startTicker(amount: number): void {
    this._tickerTimer?.remove();
    this._tickerText.setText('$0');
    const STEPS    = 40;
    const DURATION = 1400;
    let   i        = 0;

    this._tickerTimer = this.scene.time.addEvent({
      delay:    DURATION / STEPS,
      repeat:   STEPS - 1,
      callback: () => {
        i++;
        const v = Math.round(amount * (i / STEPS));
        this._tickerText.setText(`$${v.toLocaleString()}`);
      },
    });
  }

  private _clear(): void {
    this._dismissTimer?.remove();
    this._tickerTimer?.remove();
    this.scene.tweens.killTweensOf(this._glow);
    this.scene.tweens.killTweensOf(this._headlineGold);
  }
}

// ─── Threshold constants — [The Actuary] may tune these ──────────────────────

/** Minimum damage for BIG WIN overlay (single-side, per round). */
export const BIG_WIN_DMG_THRESHOLD  = 500;

/** Minimum damage for MEGA WIN overlay. */
export const MEGA_WIN_DMG_THRESHOLD = 900;
