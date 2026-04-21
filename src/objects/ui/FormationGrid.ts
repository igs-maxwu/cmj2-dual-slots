import Phaser from 'phaser';
import { FONT, FONT_SIZE, HP, SURF, RADIUS, TEAM, SEA, FG } from '@/config/DesignTokens';
import { EventBus } from '@/systems/EventBus';
import { EventNames } from '@/config/EventNames';
import { GoldFrame } from './design/GoldFrame';
import type { Side } from '@/systems/SlotEngine';
import { CANVAS_HEIGHT } from '@/config/GameConfig';

export interface UnitState {
  spiritName: string;
  textureKey: string;   // Phaser texture key, e.g. 'spirit_yin'
  element:    string;
  hp:         number;
  maxHp:      number;
  alive:      boolean;
}

// ─── Layout constants ─────────────────────────────────────────────────────────

/** Full width of each portrait card (set by PlayerPanel to panel inner width). */
export const FORMATION_CARD_W = 191;

/** Pixels reserved below the card stack for coin/bet stats in PlayerPanel. */
const STATS_RESERVE = 190;

/** Vertical gap between cards. */
const CARD_GAP = 10;

/**
 * Compute adaptive card height so that `count` cards fill the available
 * vertical space (canvas height minus banner / divider and stats reserve).
 *
 * @param count Number of spirits (1–5).
 * @param bannerH Height of the faction banner above the card stack.
 */
export function cardHeight(count: number, bannerH = 60): number {
  const available = CANVAS_HEIGHT - bannerH - STATS_RESERVE;
  const h = Math.floor((available - CARD_GAP * (count - 1)) / count);
  return Math.max(80, Math.min(150, h));
}

/**
 * Total height of the card stack for `count` spirits.
 * Convenience export used by PlayerPanel to position the stats section.
 */
export function stackHeight(count: number, bannerH = 60): number {
  const h = cardHeight(count, bannerH);
  return count * h + (count - 1) * CARD_GAP;
}

// ─── Portrait dimensions (derived from card height) ───────────────────────────

/** Width of the portrait image column inside a card. */
function portraitW(ch: number): number { return Math.round(ch * 0.52); }
/** Height of the portrait image area inside a card. */
function portraitH(ch: number): number { return ch - 12; }

// ─── FormationGrid ────────────────────────────────────────────────────────────

/**
 * [The Stylist] — Side panel spirit roster displayed as vertical portrait cards.
 *
 * Each card shows:
 *   LEFT  — 3D character portrait (proportionally cropped to head+torso)
 *   RIGHT — spirit name, HP number, animated HP bar, element badge
 *
 * Card height is adaptive: 150 px for a 3-spirit roster, ~105 px for 4,
 * ~85 px for 5 — keeping the full stack within the panel's content area.
 *
 * Compared with the legacy 3×3 grid:
 *   • Uses the final 3D sculpted PNGs (loaded as `spirit_*` by PreloadScene)
 *   • Much larger portraits → characters are clearly recognisable
 *   • getPortraitWorldXY() returns the portrait centre for FX anchoring
 *
 * [The Illusionist] should attach attack/death FX to getPortraitWorldXY().
 */
export class FormationGrid extends Phaser.GameObjects.Container {
  private side:      Side;
  private cards:       Phaser.GameObjects.Container[] = [];
  private hpFills:     Phaser.GameObjects.Rectangle[]  = [];
  private hpBarMaxW:   number[]                        = [];   // original full bar width per card
  private hpTweens:    (Phaser.Tweens.Tween | null)[]  = [];
  private deadMasks:   Phaser.GameObjects.Graphics[]   = [];
  private states:      UnitState[]                     = [];
  private _lastCount = 0;

  constructor(scene: Phaser.Scene, x: number, y: number, side: Side) {
    super(scene, x, y);
    this.side = side;
    scene.add.existing(this);
    this._listenEvents();
  }

  // ─── Public API ────────────────────────────────────────────────────────────

  /**
   * Returns the scene-space centre of the portrait area for the spirit at
   * roster index `index`.  Used by [The Illusionist] to anchor skill FX.
   * Returns null for out-of-range indices.
   *
   * Note: callers must add this container's parent (PlayerPanel) world position
   * since this returns coordinates relative to the FormationGrid's origin.
   */
  getPortraitWorldXY(index: number): { x: number; y: number } | null {
    const card = this.cards[index];
    if (!card) return null;
    const ch  = this._currentCardH();
    const pw  = portraitW(ch);
    // portrait is at x=3, y=3 within the card; centre is at (3 + pw/2, 3 + portraitH/2)
    return {
      x: this.x + card.x + 3 + pw / 2,
      y: this.y + card.y + 3 + portraitH(ch) / 2,
    };
  }

  /** Populate the roster. Rebuilds card containers if the count changed. */
  setUnits(units: UnitState[]): void {
    this.states = units;
    const count = units.length;

    if (count !== this._lastCount) {
      this._destroyCards();
      this._buildCards(count);
      this._lastCount = count;
    }

    units.forEach((u, i) => this._refreshCard(i, u));

    // Blank out unused slots (shouldn't happen if count matches, but be safe)
    for (let i = units.length; i < this.cards.length; i++) {
      this._blankCard(i);
    }
  }

  // ─── Private: layout ───────────────────────────────────────────────────────

  private _currentCardH(): number {
    return cardHeight(Math.max(1, this._lastCount));
  }

  private _destroyCards(): void {
    this.cards.forEach(c => c.destroy());
    this.cards       = [];
    this.hpFills     = [];
    this.hpBarMaxW   = [];
    this.deadMasks   = [];
    this.hpTweens.forEach(t => t?.stop());
    this.hpTweens    = [];
  }

  private _buildCards(count: number): void {
    const ch   = cardHeight(count);
    const cw   = FORMATION_CARD_W;
    const pw   = portraitW(ch);
    const ph   = portraitH(ch);
    const pad  = 3;      // GoldFrame border width

    for (let i = 0; i < count; i++) {
      const cy = i * (ch + CARD_GAP);
      const card = this.scene.add.container(0, cy);

      // Gold-frame card background
      card.add(new GoldFrame(this.scene, cw, ch, {
        radius:     RADIUS.sm,
        dropShadow: true,
        hairlineHi: true,
      }));

      // Portrait image placeholder (updated in _refreshCard)
      const portBg = this.scene.add.rectangle(
        pad, pad, pw, ph, SURF.darkInlay.color, 1,
      ).setOrigin(0, 0);
      portBg.setName('portBg');
      card.add(portBg);

      // Portrait image — starts invisible, revealed in _refreshCard
      const portImg = this.scene.add.image(pad + pw / 2, pad + ph / 2, '__DEFAULT')
        .setDisplaySize(pw, ph)
        .setVisible(false)
        .setName('portImg');
      card.add(portImg);

      // Dead greyscale mask (full card tint + ✕), hidden initially
      const deadMask = this.scene.add.graphics().setName('deadMask');
      deadMask.setVisible(false);
      card.add(deadMask);

      // ── Info column (right of portrait) ───────────────────────────────────
      const ix = pad + pw + 8;    // info column left edge
      const iw = cw - ix - pad;   // info column width

      // Spirit name
      const nameT = this.scene.add.text(ix, pad + 4, '', {
        fontSize:        `${FONT_SIZE.sm}px`,
        fontFamily:      FONT.title,
        color:           '#fff6da',
        stroke:          '#051326',
        strokeThickness: 1,
      }).setName('nameT');
      card.add(nameT);

      // HP numeric (right-aligned)
      const hpNumT = this.scene.add.text(cw - pad - 2, pad + 4, '', {
        fontSize:        `${FONT_SIZE.xs}px`,
        fontFamily:      FONT.num,
        color:           '#ffd54a',
        stroke:          '#051326',
        strokeThickness: 1,
      }).setOrigin(1, 0).setName('hpNumT');
      card.add(hpNumT);

      // HP bar track
      const trackY = pad + 22;
      const trackH = ch >= 110 ? 10 : 8;
      const barBg = this.scene.add.rectangle(ix, trackY, iw, trackH, HP.track, 1)
        .setOrigin(0, 0).setName('barBg');
      card.add(barBg);

      // HP bar fill
      const barFill = this.scene.add.rectangle(ix, trackY, iw, trackH, HP.high, 1)
        .setOrigin(0, 0).setName('barFill');
      card.add(barFill);

      // Element badge (small coloured dot + abbreviation) for taller cards
      if (ch >= 110) {
        const elemT = this.scene.add.text(ix, trackY + trackH + 6, '', {
          fontSize:   `${FONT_SIZE.xs}px`,
          fontFamily: FONT.body,
          color:      '#7ea3c7',
        }).setName('elemT');
        card.add(elemT);
      }

      this.cards.push(card);
      this.hpFills.push(barFill);
      this.hpBarMaxW.push(iw);     // store full-bar width for percentage calculations
      this.hpTweens.push(null);
      this.deadMasks.push(deadMask);
      this.add(card);
    }
  }

  // ─── Private: data updates ─────────────────────────────────────────────────

  private _refreshCard(index: number, unit: UnitState): void {
    const card = this.cards[index];
    if (!card) return;

    const ch  = this._currentCardH();
    const pw  = portraitW(ch);
    const ph  = portraitH(ch);
    const pad = 3;

    const teamColor = this.side === 'A' ? TEAM.azure : TEAM.vermilion;

    // Portrait: use real texture when available, else tinted placeholder
    const portImg = card.getByName('portImg') as Phaser.GameObjects.Image;
    const portBg  = card.getByName('portBg')  as Phaser.GameObjects.Rectangle;

    if (this.scene.textures.exists(unit.textureKey)) {
      portImg
        .setTexture(unit.textureKey)
        .setDisplaySize(pw, ph)
        .setPosition(pad + pw / 2, pad + ph / 2)
        .setVisible(true)
        .setAlpha(unit.alive ? 1 : 0.35);
      portBg.setFillStyle(SEA.abyss, 1);
    } else {
      // Coloured placeholder
      portImg.setVisible(false);
      portBg.setFillStyle(this._elementColor(unit.element), 0.4);
    }

    // Team accent border on portrait
    const portBorder = card.getByName('portBorder') as Phaser.GameObjects.Graphics | null;
    if (!portBorder) {
      const borderG = this.scene.add.graphics().setName('portBorder');
      borderG.lineStyle(2, teamColor, 0.6);
      borderG.strokeRect(pad, pad, pw, ph);
      card.add(borderG);
    }

    // Dead state
    const deadMask = card.getByName('deadMask') as Phaser.GameObjects.Graphics;
    if (!unit.alive) {
      deadMask.clear();
      deadMask.fillStyle(0x000000, 0.55);
      deadMask.fillRoundedRect(pad, pad, pw, ph, RADIUS.sm - 1);
      // ✕ drawn at portrait centre
      card.add(
        this.scene.add.text(pad + pw / 2, pad + ph / 2, '✕', {
          fontSize:        `${Math.max(24, Math.round(ch * 0.28))}px`,
          fontFamily:      FONT.bold,
          color:           '#cc2222',
          stroke:          '#000',
          strokeThickness: 2,
        }).setOrigin(0.5, 0.5)
      );
      deadMask.setVisible(true);
    } else {
      deadMask.clear().setVisible(false);
    }

    // Name
    const nameT = card.getByName('nameT') as Phaser.GameObjects.Text;
    nameT.setText(unit.spiritName);

    // HP bar + number
    this._animateHpBar(index, unit.hp, unit.maxHp);

    // Element badge (only present on taller cards, gracefully absent otherwise)
    const elemT = card.getByName('elemT') as Phaser.GameObjects.Text | null;
    if (elemT) {
      const elemLabel = this._elementLabel(unit.element);
      elemT.setText(elemLabel).setColor(this._elementHex(unit.element));
    }
  }

  private _blankCard(index: number): void {
    const card = this.cards[index];
    if (!card) return;
    (card.getByName('portImg') as Phaser.GameObjects.Image)?.setVisible(false);
    (card.getByName('nameT')   as Phaser.GameObjects.Text)?.setText('');
    (card.getByName('hpNumT')  as Phaser.GameObjects.Text)?.setText('');
    this.hpFills[index]?.setDisplaySize(0, this.hpFills[index].height);
  }

  /** Smooth HP bar tween matching design spec's `--dur-slow` (380 ms). */
  private _animateHpBar(index: number, hp: number, maxHp: number): void {
    const fill     = this.hpFills[index];
    if (!fill) return;

    const pct      = Math.max(0, hp / maxHp);
    const maxWidth = this.hpBarMaxW[index] ?? fill.displayWidth;
    const targetW  = maxWidth * pct;
    const color    = pct > 0.5 ? HP.high : pct > 0.25 ? HP.mid : HP.low;
    fill.setFillStyle(color);

    // HP number
    const card  = this.cards[index];
    const hpNum = card?.getByName('hpNumT') as Phaser.GameObjects.Text | null;
    hpNum?.setText(`${hp}/${maxHp}`);

    this.hpTweens[index]?.stop();
    this.hpTweens[index] = this.scene.tweens.add({
      targets:      fill,
      displayWidth: targetW,
      duration:     380,
      ease:         'Cubic.easeOut',
    });
  }

  // ─── Private: events ───────────────────────────────────────────────────────

  private _listenEvents(): void {
    EventBus.on(EventNames.HP_UPDATED, (data: { side: Side; unitIndex: number; hp: number; maxHp: number }) => {
      if (data.side !== this.side) return;
      const st = this.states[data.unitIndex];
      if (!st) return;
      st.hp = data.hp;
      this._animateHpBar(data.unitIndex, data.hp, data.maxHp);
    }, this);

    EventBus.on(EventNames.UNIT_DIED, (data: { side: Side; unitIndex: number }) => {
      if (data.side !== this.side) return;
      const st = this.states[data.unitIndex];
      if (st) {
        st.alive = false;
        this._refreshCard(data.unitIndex, st);
      }
    }, this);
  }

  // ─── Private: helpers ──────────────────────────────────────────────────────

  private _elementColor(element: string): number {
    const map: Record<string, number> = {
      man:   0xe63946,
      pin:   0x48cae4,
      sou:   0x52b788,
      honor: 0xffd166,
      wild:  0xb5179e,
    };
    return map[element] ?? FG.muted;
  }

  private _elementHex(element: string): string {
    return '#' + this._elementColor(element).toString(16).padStart(6, '0');
  }

  private _elementLabel(element: string): string {
    const map: Record<string, string> = {
      man:   '萬',
      pin:   '筒',
      sou:   '索',
      honor: '字',
      wild:  '野',
    };
    return map[element] ?? element;
  }

  destroy(fromScene?: boolean): void {
    EventBus.off(EventNames.HP_UPDATED, undefined, this);
    EventBus.off(EventNames.UNIT_DIED,  undefined, this);
    this.hpTweens.forEach(t => t?.stop());
    super.destroy(fromScene);
  }
}
