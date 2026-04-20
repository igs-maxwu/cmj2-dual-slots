import Phaser from 'phaser';
import { fsm } from '@/systems/StateMachine';

/** Minimal boot scene — initialises engine plugins, then hands off to Preload. */
export class BootScene extends Phaser.Scene {
  constructor() { super({ key: 'BootScene' }); }

  create(): void {
    fsm.transition('PRELOAD');
    this.scene.start('PreloadScene');
  }
}
