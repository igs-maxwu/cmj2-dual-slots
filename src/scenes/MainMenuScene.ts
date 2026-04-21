import Phaser from 'phaser';
import { fsm } from '@/systems/StateMachine';
import { CANVAS_WIDTH, CANVAS_HEIGHT } from '@/config/GameConfig';
import { EventBus } from '@/systems/EventBus';
import { EventNames } from '@/config/EventNames';

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

    const startDraft = (): void => {
      label.destroy();
      fsm.transition('GAME_IDLE');
      this.scene.start('DraftScene', { side: 'A' });
    };

    this.input.once('pointerdown', startDraft);

    // HTML panel APPLY triggered while we're still on the menu: skip through to
    // DraftScene and re-emit after it's mounted so its listener can consume it.
    const onOverride = (payload: { selectedA: number[]; selectedB: number[] }): void => {
      startDraft();
      setTimeout(() => EventBus.emit(EventNames.DRAFT_CONFIG_OVERRIDE, payload), 50);
    };
    EventBus.once(EventNames.DRAFT_CONFIG_OVERRIDE, onOverride);

    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      EventBus.off(EventNames.DRAFT_CONFIG_OVERRIDE, onOverride);
    });
  }
}
