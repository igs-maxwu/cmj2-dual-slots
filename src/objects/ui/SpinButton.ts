import Phaser from 'phaser';
import { LAYOUT, FG, FONT_SIZE, MOTION } from '@/config/DesignTokens';
import { CANVAS_WIDTH, CANVAS_HEIGHT } from '@/config/GameConfig';
import { EventBus } from '@/systems/EventBus';
import { EventNames } from '@/config/EventNames';
import { Button3D } from './design/Button3D';

export type ButtonMode = 'idle' | 'spinning' | 'disabled' | 'gameover';

/**
 * [The Stylist] — Three-state Spin button with auto-spin countdown bar.
 *
 * Wraps {@link Button3D} for the 3D physicality + hover/press visuals
 * and adds a progress stripe along the bottom edge for auto-spin mode.
 * Emits `EventNames.SPIN_REQUESTED` when clicked in idle, and
 * `EventNames.REMATCH_REQUESTED` in gameover.
 */
export class SpinButton extends Phaser.GameObjects.Container {
  private btn!:      Button3D;
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

    this.btn = new Button3D(this.scene, {
      variant:  'green',
      label:    'START BATTLE',
      width:    btnW,
      height:   btnH,
      fontSize: FONT_SIZE.lg,
      onClick:  () => this._onPress(),
    });
    this.add(this.btn);

    // Auto-spin countdown stripe — sits along the bottom of the button body.
    // Drawn above the gold border for visibility.
    this.progress = this.scene.add.rectangle(0, btnH - 3, btnW, 4, FG.white, 0.5)
      .setOrigin(0, 0.5);
    this.add(this.progress);
  }

  private _onPress(): void {
    if (this.mode === 'idle') {
      EventBus.emit(EventNames.SPIN_REQUESTED);
    } else if (this.mode === 'gameover') {
      EventBus.emit(EventNames.REMATCH_REQUESTED);
    }
  }

  private _refresh(progressPct?: number): void {
    const { btnW } = LAYOUT;
    switch (this.mode) {
      case 'idle':
        this.btn.setLabel('START BATTLE').setState('idle');
        this.progress.setDisplaySize(btnW, 4);
        break;
      case 'spinning':
        this.btn.setLabel('SPINNING...').setState('disabled');
        this.progress.setDisplaySize(0, 4);
        break;
      case 'disabled':
        this.btn.setLabel('AUTO...').setState('disabled');
        if (progressPct !== undefined)
          this.progress.setDisplaySize(btnW * progressPct, 4);
        break;
      case 'gameover':
        this.btn.setLabel('再戰一場').setState('idle');
        this.progress.setDisplaySize(0, 4);
        break;
    }
  }
}

/** Exported so scenes that tween the button can match its motion timing. */
export const SPIN_BUTTON_DUR = MOTION.durFast;
