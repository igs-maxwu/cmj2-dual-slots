import Phaser from 'phaser';
import { COLORS, LAYOUT, FONT_SIZE, FONT } from '@/config/DesignTokens';
import { CANVAS_WIDTH, CANVAS_HEIGHT } from '@/config/GameConfig';
import { EventBus } from '@/systems/EventBus';
import { EventNames } from '@/config/EventNames';

export type ButtonMode = 'idle' | 'spinning' | 'disabled' | 'gameover';

/**
 * [The Stylist] — Three-state Spin button with auto-spin countdown bar.
 * Emits EventNames.SPIN_REQUESTED on click when in idle/gameover state.
 * [The Illusionist] should add particle FX by listening to SPIN_REQUESTED.
 */
export class SpinButton extends Phaser.GameObjects.Container {
  private bg!:       Phaser.GameObjects.Rectangle;
  private label!:    Phaser.GameObjects.Text;
  private progress!: Phaser.GameObjects.Rectangle;
  private mode:      ButtonMode = 'idle';

  constructor(scene: Phaser.Scene) {
    const { btnW, btnH } = LAYOUT;
    const bx = (CANVAS_WIDTH - btnW) / 2;
    const by = CANVAS_HEIGHT - btnH - 14;
    super(scene, bx, by);
    scene.add.existing(this);
    this._build();
  }

  /** Update button appearance. Use instead of Phaser's built-in setState. */
  setMode(mode: ButtonMode, progressPct?: number): void {
    this.mode = mode;
    this._refresh(progressPct);
  }

  private _build(): void {
    const { btnW, btnH } = LAYOUT;

    this.bg = this.scene.add.rectangle(btnW / 2, btnH / 2, btnW, btnH, COLORS.btnIdle)
      .setStrokeStyle(2, COLORS.white);
    this.add(this.bg);

    this.label = this.scene.add.text(btnW / 2, btnH / 2, 'START BATTLE', {
      fontSize:   `${FONT_SIZE.lg}px`,
      fontFamily: FONT.bold,
      color:      '#ffffff',
    }).setOrigin(0.5, 0.5);
    this.add(this.label);

    // Auto-spin countdown stripe along the bottom edge
    this.progress = this.scene.add.rectangle(0, btnH - 3, btnW, 5, COLORS.white, 0.5)
      .setOrigin(0, 0.5);
    this.add(this.progress);

    // Hit area covers full button
    this.setSize(btnW, btnH);
    this.setInteractive({ useHandCursor: true });

    this.on(Phaser.Input.Events.POINTER_OVER, () => {
      if (this.mode === 'idle') this.bg.setFillStyle(COLORS.btnHover);
    });
    this.on(Phaser.Input.Events.POINTER_OUT, () => {
      if (this.mode === 'idle') this.bg.setFillStyle(COLORS.btnIdle);
    });
    this.on(Phaser.Input.Events.POINTER_DOWN, () => {
      if (this.mode === 'idle') {
        this.bg.setFillStyle(COLORS.btnPressed);
        EventBus.emit(EventNames.SPIN_REQUESTED);
      } else if (this.mode === 'gameover') {
        EventBus.emit(EventNames.SPIN_REQUESTED);
      }
    });
    this.on(Phaser.Input.Events.POINTER_UP, () => {
      if (this.mode === 'idle') this.bg.setFillStyle(COLORS.btnIdle);
    });
  }

  private _refresh(progressPct?: number): void {
    const { btnW } = LAYOUT;
    switch (this.mode) {
      case 'idle':
        this.bg.setFillStyle(COLORS.btnIdle);
        this.label.setText('START BATTLE');
        this.progress.setDisplaySize(btnW, 5);
        break;
      case 'spinning':
        this.bg.setFillStyle(COLORS.btnDisabled);
        this.label.setText('SPINNING...');
        this.progress.setDisplaySize(0, 5);
        break;
      case 'disabled':
        this.bg.setFillStyle(COLORS.btnDisabled);
        this.label.setText('AUTO...');
        if (progressPct !== undefined)
          this.progress.setDisplaySize(btnW * progressPct, 5);
        break;
      case 'gameover':
        this.bg.setFillStyle(0x27ae60);
        this.label.setText('REMATCH');
        this.progress.setDisplaySize(0, 5);
        break;
    }
  }
}
