import { CANVAS_WIDTH, CANVAS_HEIGHT } from './GameConfig';

// ─── Colour Palette ──────────────────────────────────────────────────────────
export const COLORS = {
  bg:           0x0f0f1a,
  bgPanel:      0x1a1a2e,
  bgCell:       0x16213e,
  bgReel:       0x0d0d1a,

  borderNormal: 0x334466,
  borderGold:   0xf1c40f,
  borderA:      0x3498db,
  borderB:      0xe74c3c,

  playerA:      0x3498db,
  playerB:      0xe74c3c,
  white:        0xffffff,
  textMuted:    0x7f8c9a,

  hpHigh:       0x2ecc71,
  hpMid:        0xe67e22,
  hpLow:        0xe74c3c,
  hpBg:         0x333333,

  btnIdle:      0xe67e22,
  btnHover:     0xf39c12,
  btnPressed:   0xb35900,
  btnDisabled:  0x555555,

  coin:         0xf1c40f,
  dmgFloat:     0xff4444,
  healFloat:    0x2ecc71,
} as const;

// ─── Typography ──────────────────────────────────────────────────────────────
export const FONT = {
  base:   'Arial, sans-serif',
  bold:   'bold Arial, sans-serif',
} as const;

export const FONT_SIZE = {
  xs:   11,
  sm:   13,
  md:   16,
  lg:   20,
  xl:   26,
  xxl:  36,
} as const;

// ─── Proportional Layout ─────────────────────────────────────────────────────
// All positions derived from canvas size — no magic pixel values.

export const LAYOUT = {
  // Horizontal
  panelW:      Math.round(CANVAS_WIDTH  * 0.165),   // ~211px  side panels
  centerX:     Math.round(CANVAS_WIDTH  * 0.5),      // 640
  get centerW() { return CANVAS_WIDTH - this.panelW * 2; }, // ~858px

  // Vertical zones
  arenaH:      Math.round(CANVAS_HEIGHT * 0.44),     // ~317px  formations
  reelY:       Math.round(CANVAS_HEIGHT * 0.44),     // slot machine starts here
  reelH:       Math.round(CANVAS_HEIGHT * 0.38),     // ~274px
  ctrlY:       Math.round(CANVAS_HEIGHT * 0.82),     // ~590px  log + button
  ctrlH:       Math.round(CANVAS_HEIGHT * 0.18),     // ~130px

  // Formation grid (3×3 cells)
  cellSize:    52,
  cellGap:     6,
  get gridW()  { return this.cellSize * 3 + this.cellGap * 2; },  // 168px
  get gridH()  { return this.cellSize * 3 + this.cellGap * 2; },  // 168px

  // Reel cell
  reelCellW:   96,
  reelCellH:   58,
  reelCellGap: 6,
  get reelTotalW() { return this.reelCellW * 5 + this.reelCellGap * 4; }, // 504px
  get reelTotalH() { return this.reelCellH * 4 + this.reelCellGap * 3; }, // 250px

  // Spin button
  btnW: 200,
  btnH:  56,
} as const;
