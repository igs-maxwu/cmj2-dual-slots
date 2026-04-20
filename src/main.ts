import Phaser from 'phaser';
import { CANVAS_WIDTH, CANVAS_HEIGHT } from '@/config/GameConfig';
import { BootScene }     from '@/scenes/BootScene';
import { PreloadScene }  from '@/scenes/PreloadScene';
import { MainMenuScene } from '@/scenes/MainMenuScene';
import { GameScene }     from '@/scenes/GameScene';
import { GameOverScene } from '@/scenes/GameOverScene';

const config: Phaser.Types.Core.GameConfig = {
  type: Phaser.AUTO,
  width: CANVAS_WIDTH,
  height: CANVAS_HEIGHT,
  backgroundColor: '#061a33',   // --sea-abyss
  scene: [BootScene, PreloadScene, MainMenuScene, GameScene, GameOverScene],
  parent: document.body,
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
  },
};

/**
 * Gate Phaser startup behind `document.fonts.ready` so the calligraphy,
 * Cinzel and Noto Serif faces are decoded before the first text paint.
 * Phaser WebGL caches text textures on first render — if the face is not
 * loaded at that moment, the fallback is burned in and never refreshes.
 */
const bootFonts = (): Promise<void> =>
  document.fonts && typeof document.fonts.ready?.then === 'function'
    ? document.fonts.ready.then(() => void 0)
    : Promise.resolve();

bootFonts().then(() => new Phaser.Game(config));
