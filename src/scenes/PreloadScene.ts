import Phaser from 'phaser';
import { fsm } from '@/systems/StateMachine';
import { CANVAS_WIDTH, CANVAS_HEIGHT } from '@/config/GameConfig';
import { COLORS, FONT_SIZE, FONT } from '@/config/DesignTokens';

const SPIRIT_ASSETS = [
  { key: 'spirit_mengchenzhang', path: 'assets/spirits/mengchenzhang.png' },
  { key: 'spirit_canlan',        path: 'assets/spirits/canlan.png' },
  { key: 'spirit_yin',           path: 'assets/spirits/yin.png' },
  { key: 'spirit_luoluo',        path: 'assets/spirits/luoluo.png' },
  { key: 'spirit_lingyu',        path: 'assets/spirits/lingyu.png' },
  { key: 'spirit_zhuluan',       path: 'assets/spirits/zhuluan.png' },
  { key: 'spirit_xuanmo',        path: 'assets/spirits/xuanmo.png' },
  { key: 'spirit_zhaoyu',        path: 'assets/spirits/zhaoyu.png' },
];

/**
 * [The Stylist] owns asset load calls here.
 * [The Illusionist] — add atlas / particle JSON loads below SPIRIT_ASSETS.
 */
export class PreloadScene extends Phaser.Scene {
  private bar!:     Phaser.GameObjects.Rectangle;
  private pctText!: Phaser.GameObjects.Text;

  constructor() { super({ key: 'PreloadScene' }); }

  preload(): void {
    this._buildLoadingUI();

    // Load NotoSansTC variable font from local assets (design-system canonical copy)
    const notoFont = new FontFace(
      'Noto Sans TC',
      'url(assets/fonts/NotoSansTC-VariableFont_wght.ttf) format("truetype")',
      { style: 'normal', weight: '100 900' }
    );
    notoFont.load().then((loaded) => {
      (document.fonts as unknown as { add(f: FontFace): void }).add(loaded);
    }).catch((err) => {
      console.warn('[Preload] NotoSansTC font failed to load:', err);
    });

    SPIRIT_ASSETS.forEach(({ key, path }) => this.load.image(key, path));

    this.load.on('progress', (value: number) => {
      const w = (CANVAS_WIDTH - 100) * value;
      this.bar.setDisplaySize(w, 20);
      this.pctText.setText(`${Math.round(value * 100)}%`);
    });

    this.load.on('loaderror', (file: Phaser.Loader.File) => {
      // Graceful fallback: missing spirit texture falls back to colored placeholder
      console.warn(`[Preload] Asset not found: ${file.key} — using placeholder`);
    });
  }

  create(): void {
    fsm.transition('MAIN_MENU');
    this.scene.start('MainMenuScene');
  }

  private _buildLoadingUI(): void {
    this.add.rectangle(CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2, CANVAS_WIDTH, CANVAS_HEIGHT, COLORS.bg);

    this.add.text(CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 - 60, '雀靈對決', {
      fontSize: `${FONT_SIZE.xxl}px`, fontFamily: FONT.bold, color: '#f1c40f',
    }).setOrigin(0.5);

    this.add.text(CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 - 24, 'Spirit Battle — Loading...', {
      fontSize: `${FONT_SIZE.sm}px`, fontFamily: FONT.base, color: '#7f8c9a',
    }).setOrigin(0.5);

    const barW = CANVAS_WIDTH - 100;
    this.add.rectangle(CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 + 20, barW, 20, 0x333333);
    this.bar = this.add.rectangle(50, CANVAS_HEIGHT / 2 + 20, 0, 20, 0xf1c40f).setOrigin(0, 0.5);

    this.pctText = this.add.text(CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 + 50, '0%', {
      fontSize: `${FONT_SIZE.sm}px`, fontFamily: FONT.base, color: '#ffffff',
    }).setOrigin(0.5);
  }
}
