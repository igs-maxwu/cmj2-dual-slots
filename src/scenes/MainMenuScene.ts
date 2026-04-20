import Phaser from 'phaser';
import { fsm } from '@/systems/StateMachine';
import { CANVAS_WIDTH, CANVAS_HEIGHT } from '@/config/GameConfig';

/**
 * Main menu scene.
 * [The Stylist] owns all visual layout within this scene.
 */
export class MainMenuScene extends Phaser.Scene {
  constructor() { super({ key: 'MainMenuScene' }); }

  create(): void {
    // Placeholder — [The Stylist] will replace with branded UI
    const label = this.add.text(
      CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2,
      'DUAL SLOTS BATTLE\n\n[ Click to Start ]',
      { fontSize: '32px', color: '#ffffff', align: 'center' }
    ).setOrigin(0.5);

    this.input.once('pointerdown', () => {
      label.destroy();
      fsm.transition('GAME_IDLE');
      this.scene.start('GameScene');
    });
  }
}
