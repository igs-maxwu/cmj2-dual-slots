import Phaser from 'phaser';
import { COLORS, LAYOUT, FONT_SIZE, FONT, TEAM, GOLD, RADIUS } from '@/config/DesignTokens';
import { EventBus } from '@/systems/EventBus';
import { EventNames } from '@/config/EventNames';
import { FormationGrid, FORMATION_CARD_W, stackHeight } from './FormationGrid';
import type { Side } from '@/systems/SlotEngine';
import { CANVAS_HEIGHT } from '@/config/GameConfig';
import { GoldFrame } from './design/GoldFrame';

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
    const W           = LAYOUT.panelW;
    const H           = CANVAS_HEIGHT;
    const teamColor   = this.side === 'A' ? TEAM.azure : TEAM.vermilion;
    const teamHex     = '#' + teamColor.toString(16).padStart(6, '0');

    // Deep-sea gold cartouche background — full-height panel with large
    // rounded corners. The frame draws its own drop-shadow, gold border
    // and semi-transparent navy panel fill.
    this.add(new GoldFrame(this.scene, W, H, { radius: RADIUS.lg }));

    // Team-colour banner — gradient glow strip across the top of the panel.
    // Reads as "this side is 青龍 / 朱雀".
    const banner = this.scene.add.graphics();
    banner.fillStyle(teamColor, 0.45);
    banner.fillRoundedRect(8, 8, W - 16, 46, RADIUS.md);
    // Subtle top highlight on the banner
    banner.fillStyle(0xffffff, 0.08);
    banner.fillRoundedRect(8, 8, W - 16, 6, RADIUS.md);
    this.add(banner);

    // Chinese faction name — 青龍陣 / 朱雀陣 (display serif, gold-tinted)
    const factionLabel = this.side === 'A' ? '青龍陣' : '朱雀陣';
    this.add(
      this.scene.add.text(W / 2, 22, factionLabel, {
        fontSize:        `${FONT_SIZE.lg}px`,
        fontFamily:      FONT.title,
        color:           '#fff6da',
        stroke:          '#051326',
        strokeThickness: 2,
      }).setOrigin(0.5, 0.5)
    );

    // English faction label — AZURE / VERMILION (muted caps, letterSpacing via spacing)
    const engLabel = this.side === 'A' ? 'AZURE' : 'VERMILION';
    this.add(
      this.scene.add.text(W / 2, 39, engLabel, {
        fontSize:        `${FONT_SIZE.xs}px`,
        fontFamily:      FONT.body,
        color:           teamHex,
        stroke:          '#051326',
        strokeThickness: 1,
      }).setOrigin(0.5, 0.5)
    );

    // Gold hairline divider under the banner
    const divider = this.scene.add.graphics();
    divider.fillStyle(GOLD.base, 0.6);
    divider.fillRect(12, 56, W - 24, 1);
    this.add(divider);

    // Portrait card stack — centred in the panel, sits below the faction banner.
    // gridOffsetX centres the FORMATION_CARD_W within the panel width W.
    const BANNER_H    = 60;
    const gridOffsetX = Math.round((W - FORMATION_CARD_W) / 2);
    const gridOffsetY = BANNER_H;
    this.grid = new FormationGrid(this.scene, gridOffsetX, gridOffsetY, this.side);
    this.add(this.grid);

    // Stat section starts below the card stack.
    // stackHeight(3) is the default; this updates naturally once setUnits() is
    // called with the real roster size, but we seed with 3 for initial layout.
    const statY = gridOffsetY + stackHeight(3, BANNER_H) + 16;

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
