import Phaser from 'phaser';
import { CANVAS_WIDTH, CANVAS_HEIGHT, MIN_SPIRITS, MAX_SPIRITS } from '@/config/GameConfig';
import { FONT } from '@/config/DesignTokens';
import spiritsData from '@/config/spirits.json';

// ─── Local colour constants (mirrors DraftScene.jsx `C`) ─────────────────────
const DC = {
  bg:           0x0f0f1a,
  bgPanel:      0x1a1a2e,
  bgCell:       0x16213e,
  borderNormal: 0x334466,
  borderGold:   0xf1c40f,
  playerA:      0x3498db,
  playerB:      0xe74c3c,
  coin:         0xf1c40f,
  btnIdle:      0xe67e22,
  // beast colours
  dragon:       0x3498db,
  tiger:        0xecf0f1,
  vermilion:    0xe74c3c,
  tortoise:     0x9b59b6,
  // CSS string versions for Phaser Text
  str: {
    playerA:      '#3498db',
    playerB:      '#e74c3c',
    white:        '#ffffff',
    muted:        '#7f8c9a',
    btnIdle:      '#e67e22',
    coin:         '#f1c40f',
    dragon:       '#3498db',
    tiger:        '#ecf0f1',
    vermilion:    '#e74c3c',
    tortoise:     '#9b59b6',
    atkRed:       '#ff7a7a',
    dark:         '#1a1a2e',
  },
} as const;

// ─── Spirit display data (mapped from spirits.json) ──────────────────────────
interface SpiritDisplay {
  id:        string;
  texKey:    string;
  zh:        string;
  py:        string;
  beast:     string;
  beastEn:   string;
  element:   string;
  rarity:    string;
  hp:        number;
  atk:       number;
  coin:      number;
  skill:     string;
  skillDesc: string;
  color:     number;
  colorStr:  string;
}

const ELEMENT_MAP: Record<string, string> = {
  man:   '萬',
  pin:   '筒',
  sou:   '索',
  honor: '字',
};

const BEAST_COLOR_MAP: Record<string, { num: number; str: string; en: string; zh: string }> = {
  AzureDragon:   { num: DC.dragon,    str: DC.str.dragon,    en: 'AZURE',    zh: '蒼龍' },
  WhiteTiger:    { num: DC.tiger,     str: DC.str.tiger,     en: 'TIGER',    zh: '白虎' },
  VermilionBird: { num: DC.vermilion, str: DC.str.vermilion, en: 'VERMIL',   zh: '朱雀' },
  BlackTortoise: { num: DC.tortoise,  str: DC.str.tortoise,  en: 'TORTOISE', zh: '玄武' },
};

const RARITY_COLORS: Record<string, { bg: number; fg: string }> = {
  R:   { bg: 0x2c3e50, fg: '#bdc3c7' },
  SR:  { bg: 0xd4a024, fg: '#1a1a2e' },
  SSR: { bg: 0xd4a024, fg: '#0f0f1a' },
};

function buildSpiritDisplayList(): SpiritDisplay[] {
  return spiritsData.spirits.map(s => {
    const beastInfo = BEAST_COLOR_MAP[s.beast] ?? { num: 0x7f8c9a, str: '#7f8c9a', en: s.beast, zh: s.beast };
    const py = s.nameEn ?? s.name;
    const atkDisplay  = Math.round(s.atkBonus  * 150);
    const coinDisplay = Math.round(s.coinBonus * 100);
    return {
      id:        s.id,
      texKey:    s.textureKey,
      zh:        s.name,
      py,
      beast:     beastInfo.zh,
      beastEn:   beastInfo.en,
      element:   ELEMENT_MAP[s.element] ?? s.element,
      rarity:    s.rarity,
      hp:        s.baseHp,
      atk:       atkDisplay,
      coin:      coinDisplay,
      skill:     s.skill.name,
      skillDesc: s.skill.description,
      color:     beastInfo.num,
      colorStr:  beastInfo.str,
    } satisfies SpiritDisplay;
  });
}

const SPIRITS: SpiritDisplay[] = buildSpiritDisplayList();

// ─── Layout constants ─────────────────────────────────────────────────────────
const TITLE_H   = 56;
const ACTION_H  = 68;
const PADDING   = 16;
const GRID_GAP  = 12;
const PREVIEW_W = 260;
const GRID_COLS = 4;
const GRID_ROWS = 2;

const CARD_AREA_W = CANVAS_WIDTH - PADDING * 2 - PREVIEW_W - PADDING;
const CARD_W      = Math.floor((CARD_AREA_W - GRID_GAP * (GRID_COLS - 1)) / GRID_COLS);
const CARD_AREA_H = CANVAS_HEIGHT - TITLE_H - ACTION_H - PADDING * 2;
const CARD_H      = Math.floor((CARD_AREA_H - GRID_GAP * (GRID_ROWS - 1)) / GRID_ROWS);

const PORTRAIT_W = 76;
const PORTRAIT_H = 76;
const CARD_PAD   = 10;

// ─── Scene init data ──────────────────────────────────────────────────────────
export interface DraftSceneData {
  side:      'A' | 'B';
  rostersA?: string[];
}

/**
 * DraftScene — V1 Gallery Grid spirit selection screen (4×2 + right roster panel).
 *
 * Used twice per match:
 *  1. `{ side: 'A' }` — Player A picks 3–5 spirits.
 *  2. `{ side: 'B', rostersA: string[] }` — Player B picks, then GameScene starts.
 */
export class DraftScene extends Phaser.Scene {
  private side!:       'A' | 'B';
  private rostersA!:   string[];
  private selectedIds: string[] = [];

  // UI object references for dynamic updates
  private cardContainers:  Phaser.GameObjects.Container[] = [];
  private previewChips:    Phaser.GameObjects.Container[] = [];
  private teamTotalTexts:  Phaser.GameObjects.Text[]      = [];
  private countText!:      Phaser.GameObjects.Text;
  private countBadgeBg!:   Phaser.GameObjects.Graphics;
  private confirmBtnBg!:   Phaser.GameObjects.Graphics;
  private confirmBtnText!: Phaser.GameObjects.Text;

  constructor() { super({ key: 'DraftScene' }); }

  /**
   * Receives scene start data; resets selection state for both A and B turns.
   */
  init(data?: DraftSceneData): void {
    this.side        = data?.side ?? 'A';
    this.rostersA    = data?.rostersA ?? [];
    this.selectedIds = [];
    // Reset arrays — important when scene restarts for player B
    this.cardContainers = [];
    this.previewChips   = [];
    this.teamTotalTexts = [];
  }

  /** @override Builds the full draft scene using Phaser graphics/text/image primitives. */
  create(): void {
    this._drawBackground();
    this._buildTitleBar();
    this._buildCardGrid();
    this._buildPreviewPanel();
    this._buildActionBar();
  }

  // ─── Background ──────────────────────────────────────────────────────────────

  private _drawBackground(): void {
    const g = this.add.graphics();
    g.fillStyle(DC.bg, 1);
    g.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
  }

  // ─── Title Bar ───────────────────────────────────────────────────────────────

  private _buildTitleBar(): void {
    const accent    = this.side === 'A' ? DC.playerA     : DC.playerB;
    const accentStr = this.side === 'A' ? DC.str.playerA : DC.str.playerB;

    const bg = this.add.graphics();
    bg.fillStyle(DC.bgPanel, 1);
    bg.fillRect(0, 0, CANVAS_WIDTH, TITLE_H);
    bg.lineStyle(1, DC.borderNormal, 1);
    bg.lineBetween(0, TITLE_H - 1, CANVAS_WIDTH, TITLE_H - 1);

    // Left accent bar
    const bar = this.add.graphics();
    bar.fillStyle(accent, 1);
    bar.fillRect(24, (TITLE_H - 28) / 2, 10, 28);

    this.add.text(44, TITLE_H / 2 - 2, 'SELECT YOUR SPIRITS', {
      fontSize: '18px', fontFamily: FONT.body, fontStyle: 'bold', color: DC.str.white,
    }).setOrigin(0, 1);

    this.add.text(44, TITLE_H / 2 + 2,
      `選擇靈獸 · PLAYER ${this.side} · 選 3 至 5 名`, {
      fontSize: '11px', fontFamily: FONT.body, color: accentStr,
    }).setOrigin(0, 0);

    this.add.text(CANVAS_WIDTH - 96, TITLE_H / 2, 'SELECTED', {
      fontSize: '11px', fontFamily: FONT.body, color: DC.str.muted,
    }).setOrigin(0.5);

    // Count badge (border redrawn on selection change)
    this.countBadgeBg = this.add.graphics();
    this._drawCountBadge();

    this.countText = this.add.text(CANVAS_WIDTH - 52, TITLE_H / 2, '0', {
      fontSize: '22px', fontFamily: FONT.body, fontStyle: 'bold', color: DC.str.muted,
    }).setOrigin(0.5);

    this.add.text(CANVAS_WIDTH - 38, TITLE_H / 2, '/', {
      fontSize: '14px', fontFamily: FONT.body, color: DC.str.muted,
    }).setOrigin(0.5);

    this.add.text(CANVAS_WIDTH - 24, TITLE_H / 2, `${MAX_SPIRITS}`, {
      fontSize: '14px', fontFamily: FONT.body, color: DC.str.muted,
    }).setOrigin(0, 0.5);
  }

  private _drawCountBadge(): void {
    const count     = this.selectedIds.length;
    const borderCol = count >= MIN_SPIRITS ? DC.borderGold : DC.borderNormal;
    const badgeX    = CANVAS_WIDTH - 76;
    const badgeW    = 66;
    const badgeH    = TITLE_H - 20;
    const badgeY    = 10;

    this.countBadgeBg.clear();
    this.countBadgeBg.fillStyle(DC.bgCell, 1);
    this.countBadgeBg.lineStyle(1, borderCol, 1);
    this.countBadgeBg.fillRoundedRect(badgeX, badgeY, badgeW, badgeH, 6);
    this.countBadgeBg.strokeRoundedRect(badgeX, badgeY, badgeW, badgeH, 6);
  }

  // ─── Card Grid ───────────────────────────────────────────────────────────────

  private _buildCardGrid(): void {
    const startX = PADDING;
    const startY = TITLE_H + PADDING;

    SPIRITS.forEach((sp, i) => {
      const col = i % GRID_COLS;
      const row = Math.floor(i / GRID_COLS);
      const x   = startX + col * (CARD_W + GRID_GAP);
      const y   = startY + row * (CARD_H + GRID_GAP);
      this.cardContainers.push(this._buildCard(sp, x, y));
    });
  }

  private _buildCard(sp: SpiritDisplay, x: number, y: number): Phaser.GameObjects.Container {
    const c = this.add.container(x, y);

    // Background + border (index 0 — redrawn on state change)
    const bg = this.add.graphics();
    this._drawCardBg(bg, false);
    c.add(bg);

    // Portrait image background
    const portraitBg = this.add.graphics();
    portraitBg.fillStyle(DC.bgCell, 1);
    portraitBg.fillRoundedRect(CARD_PAD, CARD_PAD, PORTRAIT_W, PORTRAIT_H, 10);
    portraitBg.lineStyle(2, sp.color, 1);
    portraitBg.strokeRoundedRect(CARD_PAD, CARD_PAD, PORTRAIT_W, PORTRAIT_H, 10);
    c.add(portraitBg);

    // Portrait image
    const img = this.add.image(
      CARD_PAD + PORTRAIT_W / 2,
      CARD_PAD + PORTRAIT_H / 2,
      sp.texKey,
    ).setDisplaySize(PORTRAIT_W - 4, PORTRAIT_H - 4);
    c.add(img);

    // Right-side header area
    const nameX = CARD_PAD + PORTRAIT_W + 8;
    const nameY = CARD_PAD;

    c.add(this.add.text(nameX, nameY, sp.zh, {
      fontSize: '17px', fontFamily: FONT.body, fontStyle: 'bold', color: DC.str.white,
    }).setOrigin(0, 0));

    // Rarity pill
    const rarity = RARITY_COLORS[sp.rarity] ?? RARITY_COLORS.R;
    const pillW  = sp.rarity === 'SSR' ? 32 : 22;
    const pillH  = 16;
    const pillX  = CARD_W - CARD_PAD - pillW;
    const pillBg = this.add.graphics();
    pillBg.fillStyle(rarity.bg, 1);
    pillBg.fillRoundedRect(pillX, nameY, pillW, pillH, 8);
    c.add(pillBg);
    c.add(this.add.text(pillX + pillW / 2, nameY + pillH / 2, sp.rarity, {
      fontSize: '10px', fontFamily: FONT.body, fontStyle: 'bold', color: rarity.fg,
    }).setOrigin(0.5));

    // Pinyin
    c.add(this.add.text(nameX, nameY + 20, sp.py, {
      fontSize: '11px', fontFamily: FONT.body, color: DC.str.muted,
    }).setOrigin(0, 0));

    // Beast glyph circle
    const glyphR = 9;
    const glyphCX = nameX + glyphR;
    const glyphCY = nameY + 44;
    const glyphBg = this.add.graphics();
    glyphBg.fillStyle(sp.color, 0.13);
    glyphBg.fillCircle(glyphCX, glyphCY, glyphR);
    glyphBg.lineStyle(1, sp.color, 1);
    glyphBg.strokeCircle(glyphCX, glyphCY, glyphR);
    c.add(glyphBg);
    c.add(this.add.text(glyphCX, glyphCY, sp.beast[0], {
      fontSize: '10px', fontFamily: FONT.body, fontStyle: 'bold', color: sp.colorStr,
    }).setOrigin(0.5));

    // Element chip
    const chipX = glyphCX + glyphR + 6;
    const chipW = 22;
    const chipH = 16;
    const chipBg = this.add.graphics();
    chipBg.fillStyle(DC.bgCell, 1);
    chipBg.fillRoundedRect(chipX, glyphCY - chipH / 2, chipW, chipH, 3);
    chipBg.lineStyle(1, DC.borderNormal, 1);
    chipBg.strokeRoundedRect(chipX, glyphCY - chipH / 2, chipW, chipH, 3);
    c.add(chipBg);
    c.add(this.add.text(chipX + chipW / 2, glyphCY, sp.element, {
      fontSize: '11px', fontFamily: FONT.body, fontStyle: 'bold', color: DC.str.white,
    }).setOrigin(0.5));

    // Beast en label
    c.add(this.add.text(chipX + chipW + 5, glyphCY, sp.beastEn.toUpperCase(), {
      fontSize: '10px', fontFamily: FONT.body, color: DC.str.muted,
    }).setOrigin(0, 0.5));

    // ── Stats row ─────────────────────────────────────────────────────────────
    const statsY  = CARD_PAD + PORTRAIT_H + 10;
    const statsH  = 38;
    const statsBg = this.add.graphics();
    statsBg.fillStyle(DC.bgCell, 1);
    statsBg.fillRoundedRect(CARD_PAD, statsY, CARD_W - CARD_PAD * 2, statsH, 5);
    c.add(statsBg);

    const statCellW = (CARD_W - CARD_PAD * 2) / 3;
    const stats = [
      { label: 'HP',   val: String(sp.hp),   color: DC.str.white },
      { label: 'ATK',  val: String(sp.atk),  color: DC.str.atkRed },
      { label: 'COIN', val: String(sp.coin), color: DC.str.coin },
    ];
    stats.forEach((st, si) => {
      const cx = CARD_PAD + statCellW * si + statCellW / 2;
      if (si > 0) {
        const divG = this.add.graphics();
        divG.lineStyle(1, DC.borderNormal, 1);
        divG.lineBetween(
          CARD_PAD + statCellW * si, statsY + 4,
          CARD_PAD + statCellW * si, statsY + statsH - 4,
        );
        c.add(divG);
      }
      c.add(this.add.text(cx, statsY + 8, st.label, {
        fontSize: '9px', fontFamily: FONT.body, color: DC.str.muted,
      }).setOrigin(0.5, 0));
      c.add(this.add.text(cx, statsY + statsH - 8, st.val, {
        fontSize: '13px', fontFamily: FONT.body, fontStyle: 'bold', color: st.color,
      }).setOrigin(0.5, 1));
    });

    // ── Skill bar ─────────────────────────────────────────────────────────────
    const skillY = statsY + statsH + 8;
    const skillH = CARD_H - skillY - CARD_PAD;
    const skillBg = this.add.graphics();
    skillBg.fillStyle(0x000000, 0.25);
    skillBg.fillRect(CARD_PAD, skillY, CARD_W - CARD_PAD * 2, skillH);
    skillBg.fillStyle(sp.color, 1);
    skillBg.fillRect(CARD_PAD, skillY, 2, skillH);
    c.add(skillBg);

    c.add(this.add.text(CARD_PAD + 6, skillY + 4, `\u2605 ${sp.skill}`, {
      fontSize: '12px', fontFamily: FONT.body, fontStyle: 'bold', color: sp.colorStr,
    }).setOrigin(0, 0));

    c.add(this.add.text(CARD_PAD + 6, skillY + 20, sp.skillDesc, {
      fontSize: '10px', fontFamily: FONT.body, color: DC.str.muted,
      wordWrap: { width: CARD_W - CARD_PAD * 2 - 12, useAdvancedWrap: true },
    }).setOrigin(0, 0));

    // ── Check mark (toggled on select) ────────────────────────────────────────
    const checkBg = this.add.graphics();
    checkBg.fillStyle(DC.coin, 1);
    checkBg.fillCircle(CARD_W - 6, 6, 12);
    checkBg.setVisible(false);
    checkBg.setName('checkBg');
    c.add(checkBg);

    const checkText = this.add.text(CARD_W - 6, 6, '\u2713', {
      fontSize: '13px', fontFamily: FONT.body, fontStyle: 'bold', color: DC.str.dark,
    }).setOrigin(0.5).setVisible(false).setName('checkText');
    c.add(checkText);

    // ── Interactive zone ──────────────────────────────────────────────────────
    c.setSize(CARD_W, CARD_H);
    c.setInteractive(
      new Phaser.Geom.Rectangle(0, 0, CARD_W, CARD_H),
      Phaser.Geom.Rectangle.Contains,
    );
    c.on('pointerdown', () => this._onCardClick(sp, c));

    return c;
  }

  /**
   * Draws (or redraws) the card background + border.
   * @param g       The Graphics object at index 0 of the card container.
   * @param selected Whether this card is currently in `selectedIds`.
   */
  private _drawCardBg(g: Phaser.GameObjects.Graphics, selected: boolean): void {
    g.clear();
    if (selected) {
      g.fillStyle(DC.borderGold, 1);
      g.fillRoundedRect(-2, -2, CARD_W + 4, CARD_H + 4, 13);
    } else {
      g.fillStyle(DC.borderNormal, 1);
      g.fillRoundedRect(-1, -1, CARD_W + 2, CARD_H + 2, 12);
    }
    g.fillStyle(DC.bgPanel, 1);
    g.fillRoundedRect(0, 0, CARD_W, CARD_H, 12);
  }

  // ─── Card interaction ─────────────────────────────────────────────────────────

  private _onCardClick(sp: SpiritDisplay, container: Phaser.GameObjects.Container): void {
    const idx = this.selectedIds.indexOf(sp.id);
    if (idx >= 0) {
      this.selectedIds.splice(idx, 1);
    } else {
      if (this.selectedIds.length >= MAX_SPIRITS) return;
      this.selectedIds.push(sp.id);
    }
    this._refreshAllCards();
    this._refreshCountBadge();
    this._refreshPreviewPanel();
    this._refreshConfirmButton();
    // suppress unused warning
    void container;
  }

  private _refreshAllCards(): void {
    SPIRITS.forEach((sp, i) => {
      const c        = this.cardContainers[i];
      const selected = this.selectedIds.includes(sp.id);
      const dimmed   = this.selectedIds.length >= MAX_SPIRITS && !selected;

      // Index 0 is always the bg Graphics
      const bg = c.getAt(0) as Phaser.GameObjects.Graphics;
      this._drawCardBg(bg, selected);
      c.setAlpha(dimmed ? 0.4 : 1);

      const checkBg   = c.getByName('checkBg')   as Phaser.GameObjects.Graphics | null;
      const checkText = c.getByName('checkText') as Phaser.GameObjects.Text    | null;
      checkBg?.setVisible(selected);
      checkText?.setVisible(selected);
    });
  }

  // ─── Preview Panel ────────────────────────────────────────────────────────────

  private _buildPreviewPanel(): void {
    const px = CANVAS_WIDTH - PADDING - PREVIEW_W;
    const py = TITLE_H + PADDING;
    const ph = CANVAS_HEIGHT - TITLE_H - ACTION_H - PADDING * 2;

    const bg = this.add.graphics();
    bg.fillStyle(DC.bgPanel, 1);
    bg.fillRoundedRect(px, py, PREVIEW_W, ph, 12);
    bg.lineStyle(1, DC.borderNormal, 1);
    bg.strokeRoundedRect(px, py, PREVIEW_W, ph, 12);

    this._drawCornerTile(px + 2, py + 2, false, false);
    this._drawCornerTile(px + PREVIEW_W - 38, py + 2, true, false);

    const accentStr = this.side === 'A' ? DC.str.playerA : DC.str.playerB;

    this.add.text(px + 14, py + 14, 'YOUR ROSTER', {
      fontSize: '13px', fontFamily: FONT.body, fontStyle: 'bold', color: accentStr,
    });
    this.add.text(px + 14, py + 30, '出戰陣容', {
      fontSize: '10px', fontFamily: FONT.body, color: DC.str.muted,
    });

    // 5 preview chip slots
    const chipH   = 52;
    const chipGap = 6;
    for (let i = 0; i < MAX_SPIRITS; i++) {
      const chipY = py + 50 + i * (chipH + chipGap);
      const chip  = this._buildPreviewChip(px + 8, chipY, PREVIEW_W - 16, chipH, i + 1, null);
      this.previewChips.push(chip);
    }

    // Team total panel
    const totalH  = 76;
    const totalY  = py + ph - totalH - 4;
    const totalBg = this.add.graphics();
    totalBg.fillStyle(DC.bgCell, 1);
    totalBg.fillRoundedRect(px + 8, totalY, PREVIEW_W - 16, totalH, 7);
    // Gold top border
    totalBg.lineStyle(2, DC.coin, 1);
    totalBg.lineBetween(px + 8, totalY, px + 8 + PREVIEW_W - 16, totalY);

    this.add.text(px + 14, totalY + 6, '陣營總計 · TEAM TOTAL', {
      fontSize: '10px', fontFamily: FONT.body, color: DC.str.muted,
    });

    const statLabels = ['HP', 'ATK', 'COIN'];
    const statColors = [DC.str.white, DC.str.atkRed, DC.str.coin];
    statLabels.forEach((label, li) => {
      const rowY = totalY + 22 + li * 16;
      this.add.text(px + 14, rowY, label, {
        fontSize: '12px', fontFamily: FONT.body, color: DC.str.muted,
      });
      const valText = this.add.text(px + PREVIEW_W - 22, rowY, '0', {
        fontSize: '12px', fontFamily: FONT.body, fontStyle: 'bold', color: statColors[li],
      }).setOrigin(1, 0);
      this.teamTotalTexts.push(valText);
    });
  }

  /**
   * Builds one slot in the roster preview panel — either an empty placeholder
   * or a filled spirit chip.
   */
  private _buildPreviewChip(
    x: number, y: number, w: number, h: number,
    slot: number,
    sp: SpiritDisplay | null,
  ): Phaser.GameObjects.Container {
    const c = this.add.container(x, y);

    if (!sp) {
      const bg = this.add.graphics();
      bg.fillStyle(0x000000, 0.25);
      bg.lineStyle(1, DC.borderNormal, 1);
      bg.fillRoundedRect(0, 0, w, h, 7);
      bg.strokeRoundedRect(0, 0, w, h, 7);
      c.add(bg);

      const circle = this.add.graphics();
      circle.lineStyle(1, DC.borderNormal, 1);
      circle.strokeCircle(h / 2, h / 2, h / 2 - 4);
      c.add(circle);

      c.add(this.add.text(h / 2, h / 2, String(slot), {
        fontSize: '14px', fontFamily: FONT.body, color: DC.str.muted,
      }).setOrigin(0.5));

      c.add(this.add.text(h + 6, h / 2, `空位 SLOT ${slot}`, {
        fontSize: '13px', fontFamily: FONT.body, color: DC.str.muted,
      }).setOrigin(0, 0.5));
    } else {
      const bg = this.add.graphics();
      bg.fillStyle(DC.bgCell, 1);
      bg.fillRoundedRect(0, 0, w, h, 7);
      bg.lineStyle(1, sp.color, 0.4);
      bg.strokeRoundedRect(0, 0, w, h, 7);
      bg.fillStyle(sp.color, 1);
      bg.fillRect(0, 0, 3, h);
      c.add(bg);

      const img = this.add.image(4 + 20, h / 2, sp.texKey)
        .setDisplaySize(36, 36);
      c.add(img);

      c.add(this.add.text(50, h / 2 - 8, sp.zh, {
        fontSize: '14px', fontFamily: FONT.body, fontStyle: 'bold', color: DC.str.white,
      }).setOrigin(0, 0));
      c.add(this.add.text(50, h / 2 + 6, `${sp.beast} · ${sp.element}`, {
        fontSize: '10px', fontFamily: FONT.body, color: DC.str.muted,
      }).setOrigin(0, 0));

      const rarity = RARITY_COLORS[sp.rarity] ?? RARITY_COLORS.R;
      const pillW  = sp.rarity === 'SSR' ? 28 : 20;
      const pillH  = 14;
      const pillG  = this.add.graphics();
      pillG.fillStyle(rarity.bg, 1);
      pillG.fillRoundedRect(w - pillW - 4, (h - pillH) / 2, pillW, pillH, 7);
      c.add(pillG);
      c.add(this.add.text(w - pillW / 2 - 4, h / 2, sp.rarity, {
        fontSize: '9px', fontFamily: FONT.body, fontStyle: 'bold', color: rarity.fg,
      }).setOrigin(0.5));
    }

    return c;
  }

  private _refreshPreviewPanel(): void {
    const selected  = SPIRITS.filter(s => this.selectedIds.includes(s.id));
    const px        = CANVAS_WIDTH - PADDING - PREVIEW_W;
    const py        = TITLE_H + PADDING;
    const chipH     = 52;
    const chipGap   = 6;

    this.previewChips.forEach(c => c.destroy());
    this.previewChips = [];

    for (let i = 0; i < MAX_SPIRITS; i++) {
      const chipY = py + 50 + i * (chipH + chipGap);
      const sp    = selected[i] ?? null;
      this.previewChips.push(
        this._buildPreviewChip(px + 8, chipY, PREVIEW_W - 16, chipH, i + 1, sp),
      );
    }

    const totHP   = selected.reduce((s, x) => s + x.hp,   0);
    const totATK  = selected.reduce((s, x) => s + x.atk,  0);
    const totCoin = selected.reduce((s, x) => s + x.coin, 0);
    [totHP, totATK, totCoin].forEach((v, i) => this.teamTotalTexts[i].setText(String(v)));
  }

  // ─── Action Bar ───────────────────────────────────────────────────────────────

  private _buildActionBar(): void {
    const barY      = CANVAS_HEIGHT - ACTION_H;
    const accent    = this.side === 'A' ? DC.playerA     : DC.playerB;
    const accentStr = this.side === 'A' ? DC.str.playerA : DC.str.playerB;
    const sideLabel = this.side === 'A' ? 'AZURE' : 'VERMILION';

    const bg = this.add.graphics();
    bg.fillStyle(DC.bgPanel, 1);
    bg.fillRect(0, barY, CANVAS_WIDTH, ACTION_H);
    bg.lineStyle(1, DC.borderNormal, 1);
    bg.lineBetween(0, barY, CANVAS_WIDTH, barY);

    // BACK button
    const backBg = this.add.graphics();
    backBg.fillStyle(DC.bgCell, 1);
    backBg.fillRoundedRect(24, barY + 12, 140, 44, 7);
    backBg.lineStyle(1, DC.borderNormal, 1);
    backBg.strokeRoundedRect(24, barY + 12, 140, 44, 7);

    this.add.text(94, barY + 34, '\u25C2 BACK / 返回', {
      fontSize: '14px', fontFamily: FONT.body, fontStyle: 'bold', color: DC.str.muted,
    }).setOrigin(0.5);

    backBg.setInteractive(
      new Phaser.Geom.Rectangle(24, barY + 12, 140, 44),
      Phaser.Geom.Rectangle.Contains,
    );
    backBg.on('pointerdown', () => this._onBack());

    // Player indicator dot
    const dotG = this.add.graphics();
    dotG.fillStyle(accent, 1);
    dotG.fillCircle(CANVAS_WIDTH / 2 - 60, barY + ACTION_H / 2, 4);

    this.add.text(CANVAS_WIDTH / 2 - 50, barY + ACTION_H / 2,
      `PLAYER ${this.side} \u00B7 ${sideLabel} SIDE`, {
      fontSize: '12px', fontFamily: FONT.body, color: accentStr,
    }).setOrigin(0, 0.5);

    // CONFIRM button
    const confirmX = CANVAS_WIDTH - 24 - 200;
    const confirmY = barY + 12;

    this.confirmBtnBg = this.add.graphics();
    this._drawConfirmBtn(false);

    // Make the confirm button graphics interactive
    this.confirmBtnBg.setInteractive(
      new Phaser.Geom.Rectangle(confirmX, confirmY, 200, 44),
      Phaser.Geom.Rectangle.Contains,
    );
    this.confirmBtnBg.on('pointerdown', () => {
      if (this._isReady()) this._onConfirm();
    });

    this.confirmBtnText = this.add.text(confirmX + 100, confirmY + 22,
      `\u5C1A\u9700 ${MIN_SPIRITS} \u540D`, {
      fontSize: '15px', fontFamily: FONT.body, fontStyle: 'bold', color: DC.str.muted,
    }).setOrigin(0.5);
  }

  private _drawConfirmBtn(ready: boolean): void {
    const confirmX = CANVAS_WIDTH - 24 - 200;
    const confirmY = CANVAS_HEIGHT - ACTION_H + 12;
    this.confirmBtnBg.clear();
    if (ready) {
      this.confirmBtnBg.fillStyle(DC.btnIdle, 1);
      this.confirmBtnBg.fillRoundedRect(confirmX, confirmY, 200, 44, 7);
      // Lighter top half to simulate gradient
      this.confirmBtnBg.fillStyle(0xf39c12, 0.5);
      this.confirmBtnBg.fillRoundedRect(confirmX, confirmY, 200, 22, 7);
    } else {
      this.confirmBtnBg.fillStyle(0x2a2a3a, 1);
      this.confirmBtnBg.fillRoundedRect(confirmX, confirmY, 200, 44, 7);
    }
  }

  private _refreshConfirmButton(): void {
    const ready = this._isReady();
    this._drawConfirmBtn(ready);
    if (ready) {
      this.confirmBtnText.setText('\u78BA\u8A8D\u51FA\u6230  CONFIRM \u25B8');
      this.confirmBtnText.setColor(DC.str.dark);
    } else {
      const need = Math.max(MIN_SPIRITS - this.selectedIds.length, 0);
      this.confirmBtnText.setText(`\u5C1A\u9700 ${need} \u540D`);
      this.confirmBtnText.setColor(DC.str.muted);
    }
  }

  private _refreshCountBadge(): void {
    this._drawCountBadge();
    const count = this.selectedIds.length;
    this.countText.setText(String(count));
    this.countText.setColor(count >= MIN_SPIRITS ? DC.str.coin : DC.str.muted);
  }

  // ─── Corner decorations ───────────────────────────────────────────────────────

  private _drawCornerTile(x: number, y: number, flipX: boolean, _flipY: boolean): void {
    const g  = this.add.graphics();
    const dx = flipX ? -14 : 14;
    g.lineStyle(1.5, DC.coin, 0.3);
    g.beginPath();
    g.moveTo(x, y + 14);
    g.lineTo(x, y);
    g.lineTo(x + dx, y);
    g.strokePath();
    g.fillStyle(DC.coin, 0.3);
    g.fillCircle(x + (flipX ? -6 : 6), y + 6, 1.5);
  }

  // ─── Navigation ───────────────────────────────────────────────────────────────

  private _isReady(): boolean {
    const n = this.selectedIds.length;
    return n >= MIN_SPIRITS && n <= MAX_SPIRITS;
  }

  /** Navigate back to the main menu. */
  private _onBack(): void {
    this.scene.start('MainMenuScene');
  }

  /**
   * Advance: Player A restarts scene as Player B; Player B launches GameScene.
   */
  private _onConfirm(): void {
    if (!this._isReady()) return;

    if (this.side === 'A') {
      this.scene.restart({ side: 'B', rostersA: this.selectedIds } satisfies DraftSceneData);
    } else {
      this.scene.start('GameScene', {
        rostersA: this.rostersA,
        rostersB: this.selectedIds,
      });
    }
  }
}
