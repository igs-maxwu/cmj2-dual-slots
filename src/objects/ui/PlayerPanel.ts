import Phaser from 'phaser';
import { COLORS, LAYOUT, FONT_SIZE, FONT } from '@/config/DesignTokens';
import { EventBus } from '@/systems/EventBus';
import { EventNames } from '@/config/EventNames';
import { FormationGrid } from './FormationGrid';
import type { Side } from '@/systems/SlotEngine';
import { CANVAS_HEIGHT } from '@/config/GameConfig';

/**
 * [The Stylist] — Full side panel for one player.
 * Contains: player name, coin display, bet label, skill ticker, FormationGrid.
 */
export class PlayerPanel extends Phaser.GameObjects.Container {
  private side:       Side;
  private coinText!:  Phaser.GameObjects.Text;
  private betText!:   Phaser.GameObjects.Text;
  private dmgText!:   Phaser.GameObjects.Text;
  private skillText!: Phaser.GameObjects.Text;
  grid!:              FormationGrid;

  constructor(scene: Phaser.Scene, side: Side) {
    const x = side === 'A' ? 0 : LAYOUT.panelW + LAYOUT.centerW;
    super(scene, x, 0);
    this.side = side;
    scene.add.existing(this);
    this._build();
  }

  private _build(): void {
    const W            = LAYOUT.panelW;
    const H            = CANVAS_HEIGHT;
    const playerColor  = this.side === 'A' ? COLORS.playerA : COLORS.playerB;
    const borderColor  = this.side === 'A' ? COLORS.borderA : COLORS.borderB;
    const colorHex     = '#' + playerColor.toString(16).padStart(6, '0');

    // Panel background
    this.add(
      this.scene.add.rectangle(W / 2, H / 2, W, H, COLORS.bgPanel)
        .setStrokeStyle(1, borderColor)
    );

    // Player label
    this.add(
      this.scene.add.text(W / 2, 22, `PLAYER ${this.side}`, {
        fontSize: `${FONT_SIZE.md}px`, fontFamily: FONT.bold, color: colorHex,
      }).setOrigin(0.5, 0.5)
    );

    // Divider
    this.add(
      this.scene.add.rectangle(W / 2, 38, W - 20, 1, borderColor).setAlpha(0.4)
    );

    // Formation grid (centred in panel, upper portion)
    const gridOffsetX = (W - LAYOUT.gridW) / 2;
    const gridOffsetY = 50;
    this.grid = new FormationGrid(this.scene, gridOffsetX, gridOffsetY, this.side);
    this.add(this.grid);

    const statY = gridOffsetY + LAYOUT.gridH + 20;

    // Coin label
    this.add(
      this.scene.add.text(W / 2, statY, 'COIN', {
        fontSize: `${FONT_SIZE.xs}px`, fontFamily: FONT.base, color: '#7f8c9a',
      }).setOrigin(0.5, 0)
    );

    // Coin value
    this.coinText = this.scene.add.text(W / 2, statY + 14, '$0', {
      fontSize: `${FONT_SIZE.md}px`, fontFamily: FONT.bold,
      color: '#' + COLORS.coin.toString(16).padStart(6, '0'),
    }).setOrigin(0.5, 0);
    this.add(this.coinText);

    // Bet
    this.betText = this.scene.add.text(W / 2, statY + 40, 'BET: $0', {
      fontSize: `${FONT_SIZE.sm}px`, fontFamily: FONT.base, color: '#7f8c9a',
    }).setOrigin(0.5, 0);
    this.add(this.betText);

    // Last damage dealt
    this.dmgText = this.scene.add.text(W / 2, statY + 60, '', {
      fontSize: `${FONT_SIZE.sm}px`, fontFamily: FONT.bold, color: '#e67e22',
    }).setOrigin(0.5, 0);
    this.add(this.dmgText);

    // Active skill ticker
    this.skillText = this.scene.add.text(W / 2, statY + 80, '', {
      fontSize: `${FONT_SIZE.xs}px`, fontFamily: FONT.base,
      color: '#b5179e', wordWrap: { width: W - 16 }, align: 'center',
    }).setOrigin(0.5, 0);
    this.add(this.skillText);

    this._listenEvents();
  }

  private _listenEvents(): void {
    EventBus.on(EventNames.BALANCE_UPDATED, (data: { side: Side; coin: number; bet: number }) => {
      if (data.side !== this.side) return;
      this.coinText.setText(`$${data.coin.toLocaleString()}`);
      this.betText.setText(`BET: $${data.bet}`);
    }, this);

    EventBus.on(EventNames.WIN_RESULT, (data: { side: Side; dmg: number }) => {
      if (data.side !== this.side) return;
      this.dmgText.setText(data.dmg > 0 ? `DMG: ${data.dmg}` : '');
    }, this);

    EventBus.on(EventNames.SKILL_TRIGGERED, (data: { side: Side; skillName: string }) => {
      if (data.side !== this.side) return;
      this.skillText.setText(`★ ${data.skillName}`);
      this.scene.time.delayedCall(2000, () => this.skillText?.setText(''));
    }, this);
  }

  destroy(fromScene?: boolean): void {
    EventBus.off(EventNames.BALANCE_UPDATED, undefined, this);
    EventBus.off(EventNames.WIN_RESULT,      undefined, this);
    EventBus.off(EventNames.SKILL_TRIGGERED, undefined, this);
    super.destroy(fromScene);
  }
}
