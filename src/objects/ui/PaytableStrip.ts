import Phaser from 'phaser';
import { FONT, FONT_SIZE, RADIUS } from '@/config/DesignTokens';
import { GoldFrame } from './design/GoldFrame';

interface StripItem {
  label: string;
  color: number;
  mult:  string;
}

const STRIP_ITEMS: StripItem[] = [
  { label: '龜', color: 0x5fc29a, mult: '×8'   },
  { label: '朱', color: 0xff6b88, mult: '×12'  },
  { label: '龍', color: 0x4fd1e8, mult: '×25'  },
  { label: '麟', color: 0xffb347, mult: '×125' },
  { label: '★', color: 0xffe066, mult: '×500' },
];

const SYM_SZ   = 40;   // symbol square size
const MULT_W   = 40;   // reserved width for "×N" text
const SYM_MULT = 6;    // gap between symbol and mult text
const ITEM_W   = SYM_SZ + SYM_MULT + MULT_W;  // 86px
const ITEM_GAP = 12;
const PAD_H    = 14;
const PAD_V    = 8;

export const PAYTABLE_W = PAD_H * 2 + STRIP_ITEMS.length * ITEM_W + (STRIP_ITEMS.length - 1) * ITEM_GAP;
export const PAYTABLE_H = PAD_V * 2 + SYM_SZ;

/**
 * [The Stylist] — Horizontal quickref strip showing the top-5 symbol payouts.
 * Placed just above the reel grid in the center column.
 *
 * Layout per item: [40×40 symbol tile] [6px gap] [×N gold text]
 */
export class PaytableStrip extends Phaser.GameObjects.Container {
  constructor(scene: Phaser.Scene, x: number, y: number) {
    super(scene, x, y);
    scene.add.existing(this);
    this._build();
  }

  private _build(): void {
    // Gold cartouche background
    this.add(new GoldFrame(this.scene, PAYTABLE_W, PAYTABLE_H, {
      radius:     RADIUS.md,
      dropShadow: true,
      hairlineHi: true,
    }));

    STRIP_ITEMS.forEach((item, i) => {
      const itemLeft = PAD_H + i * (ITEM_W + ITEM_GAP);
      const sy       = PAD_V;   // top of symbol

      // Symbol rounded square
      const gfx = this.scene.add.graphics();
      gfx.fillStyle(item.color, 1);
      gfx.fillRoundedRect(itemLeft, sy, SYM_SZ, SYM_SZ, RADIUS.sm);
      // Top-left specular highlight — fakes the radial-gradient from the design
      gfx.fillStyle(0xffffff, 0.28);
      gfx.fillRoundedRect(itemLeft + 2, sy + 2, SYM_SZ - 4, (SYM_SZ - 4) / 2, RADIUS.sm - 2);
      // Bottom shadow band
      gfx.fillStyle(0x000000, 0.20);
      gfx.fillRoundedRect(itemLeft + 2, sy + SYM_SZ / 2, SYM_SZ - 4, SYM_SZ / 2 - 2, 0);
      this.add(gfx);

      // Chinese / symbol label centred on the tile
      const cx = itemLeft + SYM_SZ / 2;
      const cy = sy + SYM_SZ / 2;
      this.add(this.scene.add.text(cx, cy, item.label, {
        fontSize:        `${FONT_SIZE.lg}px`,
        fontFamily:      FONT.title,
        color:           '#ffffff',
        stroke:          '#000000',
        strokeThickness: 2,
      }).setOrigin(0.5, 0.5));

      // Multiplier text (gold Cinzel) to the right of the symbol
      const mx = itemLeft + SYM_SZ + SYM_MULT;
      this.add(this.scene.add.text(mx, cy, item.mult, {
        fontSize:        `${FONT_SIZE.md}px`,
        fontFamily:      FONT.num,
        color:           '#ffd54a',
        stroke:          '#8a5412',
        strokeThickness: 1,
      }).setOrigin(0, 0.5));
    });
  }
}
