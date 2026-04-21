import Phaser from 'phaser';
import { fsm } from '@/systems/StateMachine';
import { EventBus } from '@/systems/EventBus';
import { EventNames } from '@/config/EventNames';
import type { SkillResolvedPayload } from '@/config/EventNames';
import { CANVAS_WIDTH, CANVAS_HEIGHT, REEL_COLS, REEL_ROWS, DEFAULT_BALANCE } from '@/config/GameConfig';
import type { GameOverData } from '@/scenes/GameOverScene';
import { COLORS, LAYOUT, FONT_SIZE, FONT, SEA, GOLD } from '@/config/DesignTokens';
import { PlayerPanel }  from '@/objects/ui/PlayerPanel';
import { ReelGrid }     from '@/objects/ui/ReelGrid';
import { ReelSpinner }  from '@/objects/ui/ReelSpinner';
import { SpinButton }   from '@/objects/ui/SpinButton';
import { BattleLog }    from '@/objects/ui/BattleLog';
import { FxManager }    from '@/systems/FxManager';
import { registry }     from '@/systems/SpiritRegistry';
import type { ResolvedEffect } from '@/systems/SkillResolver';
import {
  SlotEngine, buildSymbolPool,
  type SpiritDef, type PoolSymbol, type EvaluationResult, type Side,
} from '@/systems/SlotEngine';
import symbolsData from '@/config/symbols.json';
import { GoldText } from '@/objects/ui/design/GoldText';
import { PaytableStrip, PAYTABLE_W, PAYTABLE_H } from '@/objects/ui/PaytableStrip';
import {
  BigWinOverlay, BIG_WIN_DMG_THRESHOLD, MEGA_WIN_DMG_THRESHOLD,
  type WinKind,
} from '@/objects/ui/BigWinOverlay';

type ExtSpiritDef = SpiritDef & { textureKey?: string };

/**
 * Primary gameplay scene.
 * [The Stylist]   — UI containers wired here.
 * [The Illusionist] — FxManager + ReelSpinner instantiated here.
 * [The Actuary]   — SlotEngine evaluation wired here; replace battle logic as needed.
 */
export class GameScene extends Phaser.Scene {
  // ─── UI ──────────────────────────────────────────────────────────────────────
  reelGrid!:      ReelGrid;
  panelA!:        PlayerPanel;
  panelB!:        PlayerPanel;
  spinButton!:    SpinButton;
  battleLog!:     BattleLog;
  uiContainer!:   Phaser.GameObjects.Container;
  private _bigWinOverlay!: BigWinOverlay;

  // ─── Systems ─────────────────────────────────────────────────────────────────
  private fxManager!:   FxManager;
  private reelSpinner!: ReelSpinner;
  private engine!:      SlotEngine;
  private pool:         PoolSymbol[] = [];
  private reelOriginX!: number;
  private reelOriginY!: number;

  // ─── Battle State ─────────────────────────────────────────────────────────────
  private spiritsA: SpiritDef[] = [];
  private spiritsB: SpiritDef[] = [];
  private hpA:      number[]    = [];
  private hpB:      number[]    = [];
  private maxHpA:   number[]    = [];
  private maxHpB:   number[]    = [];
  private balanceA  = DEFAULT_BALANCE;
  private balanceB  = DEFAULT_BALANCE;
  private readonly betA = 100;
  private readonly betB = 100;
  private currentRound  = 0;

  /** Signals that `_resetBattle()` must run once Phaser objects are live in `create()`. */
  private _pendingRematch = false;

  constructor() { super({ key: 'GameScene' }); }

  /** Rosters selected during DraftScene (undefined = use hardcoded defaults). */
  private _draftRostersA?: string[];
  private _draftRostersB?: string[];

  /**
   * Called by Phaser before `create()`.
   * Accepts optional roster arrays from DraftScene, and `{ mode: 'rematch' }`
   * to reuse existing Phaser objects.
   *
   * @param data - Optional scene-start payload.
   *   - `{ mode: 'rematch' }` — triggers a full battle reset without rebuilding.
   *   - `{ rostersA, rostersB }` — spirit-id arrays chosen during DraftScene.
   */
  init(data?: { mode?: string; rostersA?: string[]; rostersB?: string[] }): void {
    if (data?.mode === 'rematch') {
      // _resetBattle needs live Phaser objects — schedule it for after create()
      this._pendingRematch = true;
    }
    if (data?.rostersA) this._draftRostersA = data.rostersA;
    if (data?.rostersB) this._draftRostersB = data.rostersB;
  }

  /** @override Builds the full scene graph and wires all event listeners. */
  create(): void {
    this._drawBackground();

    this.uiContainer = this.add.container(0, 0);

    this.panelA      = new PlayerPanel(this, 'A');
    this.panelB      = new PlayerPanel(this, 'B');
    this.reelGrid    = new ReelGrid(this);
    this.spinButton  = new SpinButton(this);
    this.battleLog   = new BattleLog(this);

    this.uiContainer.add([this.panelA, this.panelB, this.reelGrid, this.spinButton, this.battleLog]);

    this._drawCenterTitle();
    this._drawArenaBackground();
    this._drawPaytableStrip();
    this._initBattle();
    this._setupListeners();

    // BigWinOverlay is depth-100 and sits outside uiContainer (always on top)
    this._bigWinOverlay = new BigWinOverlay(this);

    if (this._pendingRematch) {
      this._pendingRematch = false;
      this._resetBattle();
    }
  }

  // ─── Private ────────────────────────────────────────────────────────────────

  /**
   * Paints the deep-sea backdrop:
   *   Layer 1 — solid sea-abyss base fill
   *   Layer 2 — vertical gradient: sea-mid at top → sea-abyss at bottom
   *   Layer 3 — caustic water-light fan spreading from the top-centre
   *   Layer 4 — floor vignette: dark fade across the lower 180px
   *
   * This is the programmtic stand-in for the eventual painted hero
   * illustration described in the design handoff README
   * ("全畫面都是插畫式深海背景").
   */
  private _drawBackground(): void {
    // Layer 1 — base fill (darkest: sea-abyss)
    this.add.rectangle(
      CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2,
      CANVAS_WIDTH, CANVAS_HEIGHT,
      SEA.abyss,
    );

    // Layer 2 — vertical gradient quad: lighter sea-mid at top, abyss at bottom
    const grad = this.add.graphics();
    grad.fillGradientStyle(SEA.mid, SEA.mid, SEA.abyss, SEA.abyss, 1);
    grad.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    // Layer 3 — caustic water-light fan from the top-centre.
    // Three overlapping gradient strips simulate the conic light bands from
    // the GameScene.jsx design (conic-gradient not natively available in Phaser).
    const BAND_H = Math.round(CANVAS_HEIGHT * 0.36);
    const beams  = this.add.graphics();

    // Central bright band
    beams.fillGradientStyle(SEA.light, SEA.light, SEA.deep, SEA.deep, 0.28, 0.28, 0, 0);
    beams.fillRect(CANVAS_WIDTH * 0.3, 0, CANVAS_WIDTH * 0.4, BAND_H);

    // Left wing beam
    beams.fillGradientStyle(SEA.caustic, SEA.light, SEA.abyss, SEA.deep, 0.12, 0.10, 0, 0);
    beams.fillRect(0, 0, CANVAS_WIDTH * 0.4, BAND_H);

    // Right wing beam
    beams.fillGradientStyle(SEA.light, SEA.caustic, SEA.deep, SEA.abyss, 0.10, 0.12, 0, 0);
    beams.fillRect(CANVAS_WIDTH * 0.6, 0, CANVAS_WIDTH * 0.4, BAND_H);

    // Blend the whole caustic layer softly
    beams.setBlendMode(Phaser.BlendModes.SCREEN);

    // Layer 4 — floor vignette: darkens the bottom so buttons don't float
    const floor = this.add.graphics();
    floor.fillGradientStyle(SEA.abyss, SEA.abyss, SEA.abyss, SEA.abyss, 0, 0, 0.75, 0.75);
    floor.fillRect(0, CANVAS_HEIGHT - 180, CANVAS_WIDTH, 180);
  }

  /**
   * Header bar and arena divider.
   *
   * Top-centre: "ROUND 00" counter (sea-muted, caps, letterSpacing feel via spaces)
   *   — updates via ROUND_UPDATED event
   * Full-width hairline at reelY separating the formation zone from the reel cage.
   */
  private _drawArenaBackground(): void {
    // Thin gold hairline separating formation zone from reel cage
    const sep = this.add.rectangle(
      CANVAS_WIDTH / 2, LAYOUT.reelY - 1,
      CANVAS_WIDTH, 1,
      GOLD.base, 0.3,
    );
    this.uiContainer.add(sep);

    // ROUND counter — top-right of center column, same vertical as the title
    const roundText = this.add.text(CANVAS_WIDTH / 2, 14, 'ROUND  00', {
      fontSize:   `${FONT_SIZE.sm}px`,
      fontFamily: FONT.body,
      color:      '#7ea3c7',
    }).setOrigin(0.5, 0);
    this.uiContainer.add(roundText);

    EventBus.on(EventNames.ROUND_UPDATED, (data: { round: number }) => {
      roundText.setText(`ROUND  ${String(data.round).padStart(2, '0')}`);
    });
  }

  /**
   * Calligraphy wordmark and subtitle in the centre column.
   * Replaces the legacy "VS" label.
   *
   * Layout:
   *   Y=62  — "雀靈戰記" hero title (GoldText, 56px display face)
   *   Y=126 — "BATTLE OF SPIRITS" caps subtitle (sea-caustic, 11px body)
   */
  private _drawCenterTitle(): void {
    const cx = CANVAS_WIDTH / 2;

    // Hero wordmark — GoldText fakes the CSS gold gradient
    const title = new GoldText(this, '雀靈戰記', {
      fontSize:    FONT_SIZE.big,    // 56px — visible hero size
      fontFamily:  FONT.display,
      strokeWidth: 3,
      glow:        true,
      origin:      0.5,
    });
    title.setPosition(cx, 62);
    this.uiContainer.add(title);

    // "BATTLE OF SPIRITS" caps subtitle in sea-caustic blue
    const sub = this.add.text(cx, 126, 'BATTLE OF SPIRITS', {
      fontSize:   `${FONT_SIZE.xs}px`,
      fontFamily: FONT.body,
      color:      '#7ad7e8',
    }).setOrigin(0.5, 0);
    this.uiContainer.add(sub);
  }

  /**
   * Paytable quickref strip — 5 top symbols with multipliers, placed just
   * above the reel grid so players can check payouts at a glance.
   * Horizontally centred in the canvas; vertically tucked 10 px above the reel.
   */
  private _drawPaytableStrip(): void {
    const stripX = Math.round((CANVAS_WIDTH - PAYTABLE_W) / 2);
    const stripY = LAYOUT.reelY - 10 - PAYTABLE_H;
    const strip  = new PaytableStrip(this, stripX, stripY);
    this.uiContainer.add(strip);
  }

  private _initBattle(): void {
    // Use DraftScene selections when provided; fall back to hardcoded defaults.
    const defaultA = ['SP_MENGCHENZHANG', 'SP_CANLAN', 'SP_YIN'];
    const defaultB = ['SP_LUOLUO', 'SP_LINGYU', 'SP_ZHULUAN'];
    this.spiritsA = registry.validateRoster(this._draftRostersA ?? defaultA);
    this.spiritsB = registry.validateRoster(this._draftRostersB ?? defaultB);

    this.hpA    = this.spiritsA.map(s => s.baseHp);
    this.hpB    = this.spiritsB.map(s => s.baseHp);
    this.maxHpA = [...this.hpA];
    this.maxHpB = [...this.hpB];

    this.pool = buildSymbolPool(
      this.spiritsA, this.spiritsB,
      symbolsData.symbols as Parameters<typeof buildSymbolPool>[2]
    );

    this.engine = new SlotEngine({
      rows:        REEL_ROWS,
      cols:        REEL_COLS,
      linesCount:  symbolsData.linesCount,
      payoutBase:  symbolsData.payoutBase as Record<string, number>,
      allSymbols:  symbolsData.symbols as Parameters<typeof buildSymbolPool>[2],
    });

    // Populate formation grids
    const toUnit = (s: SpiritDef, hp: number) => ({
      spiritName: s.name,
      textureKey: (s as ExtSpiritDef).textureKey ?? '',
      element:    s.element,
      hp,
      maxHp: hp,
      alive: true,
    });
    this.panelA.grid.setUnits(this.spiritsA.map((s, i) => toUnit(s, this.hpA[i])));
    this.panelB.grid.setUnits(this.spiritsB.map((s, i) => toUnit(s, this.hpB[i])));

    // FX systems
    this.fxManager = new FxManager(this, this.uiContainer);

    this.reelOriginX = Math.round((CANVAS_WIDTH - LAYOUT.reelTotalW) / 2);
    this.reelOriginY = LAYOUT.reelY + 14;
    this.reelSpinner = new ReelSpinner(this, this.reelOriginX, this.reelOriginY, this.fxManager);

    // Initial balance display
    EventBus.emit(EventNames.BALANCE_UPDATED, { side: 'A', coin: this.balanceA, bet: this.betA });
    EventBus.emit(EventNames.BALANCE_UPDATED, { side: 'B', coin: this.balanceB, bet: this.betB });
  }

  /**
   * Resets all battle state for a rematch. Called when `init()` received
   * `{ mode: 'rematch' }` and Phaser scene objects are already live.
   *
   * Coin balances are restored to the arcade-style starting amount.
   * TODO(M4): hook into player wallet persistence layer
   */
  private _resetBattle(): void {
    // Restore rosters to full HP
    this.hpA = this.spiritsA.map(s => s.baseHp);
    this.hpB = this.spiritsB.map(s => s.baseHp);
    this.maxHpA = [...this.hpA];
    this.maxHpB = [...this.hpB];

    // Reset round counter
    this.currentRound = 0;
    EventBus.emit(EventNames.ROUND_UPDATED, { round: 0 });

    // Reset coins to starting balance (arcade-style: every match begins at $1,000)
    // TODO(M4): hook into player wallet persistence layer
    this.balanceA = DEFAULT_BALANCE;
    this.balanceB = DEFAULT_BALANCE;
    EventBus.emit(EventNames.BALANCE_UPDATED, { side: 'A', coin: this.balanceA, bet: this.betA });
    EventBus.emit(EventNames.BALANCE_UPDATED, { side: 'B', coin: this.balanceB, bet: this.betB });

    // Re-populate formation grids with fresh HP values
    const toUnit = (s: SpiritDef, hp: number) => ({
      spiritName: s.name,
      textureKey: (s as ExtSpiritDef).textureKey ?? '',
      element:    s.element,
      hp,
      maxHp: hp,
      alive: true,
    });
    this.panelA.grid.setUnits(this.spiritsA.map((s, i) => toUnit(s, this.hpA[i])));
    this.panelB.grid.setUnits(this.spiritsB.map((s, i) => toUnit(s, this.hpB[i])));

    // Clear battle log and restore button to idle state
    this.battleLog.clear();
    this.spinButton.setMode('idle');

    // Return FSM to GAME_IDLE so spins are accepted again
    fsm.transition('GAME_IDLE');
  }

  private _setupListeners(): void {
    EventBus.on(EventNames.SPIN_REQUESTED,  this._onSpinRequested,   this);
    EventBus.on(EventNames.SKILL_RESOLVED,  this._onSkillResolved,   this);
    this.events.on(Phaser.Scenes.Events.SHUTDOWN, this._cleanup, this);
  }

  /**
   * Returns the world-space anchor for a spirit's portrait cell, used to
   * position skill-trigger FX. Searches the roster for the matching spiritId
   * and delegates to FormationGrid.getPortraitWorldXY().
   */
  private _getSpiritAnchor(spiritId: string, side: Side): { x: number; y: number } | null {
    const roster  = side === 'A' ? this.spiritsA : this.spiritsB;
    const panel   = side === 'A' ? this.panelA   : this.panelB;
    const idx     = roster.findIndex(s => s.id === spiritId);
    if (idx < 0) return null;

    const gridLocal = panel.grid.getPortraitWorldXY(idx);
    if (!gridLocal) return null;

    // panel.x is the PlayerPanel container's scene-space offset
    return { x: panel.x + gridLocal.x, y: panel.y + gridLocal.y };
  }

  /**
   * Handles SKILL_RESOLVED: plays a pill-popup + avatar flash per effect,
   * and appends a BattleLog entry for each triggered skill.
   * Effects on the same spirit are sequenced 120 ms apart; all spirits run
   * in parallel. Intentionally non-blocking — spin flow does not await this.
   */
  private _onSkillResolved(payload: SkillResolvedPayload): void {
    const { side, effects } = payload;
    const sideColor = side === 'A' ? COLORS.playerA : COLORS.playerB;

    // Group effects by spiritId so same-spirit effects are staggered.
    const bySpirit = new Map<string, ResolvedEffect[]>();
    for (const effect of effects) {
      if (!bySpirit.has(effect.spiritId)) bySpirit.set(effect.spiritId, []);
      bySpirit.get(effect.spiritId)!.push(effect);
    }

    // For each spirit, run its effects sequentially with 120 ms stagger.
    // All spirits fire in parallel (Promise.all-equivalent fire-and-forget).
    for (const [spiritId, spiritEffects] of bySpirit) {
      const anchor = this._getSpiritAnchor(spiritId, side);
      if (!anchor) continue;

      // Fire-and-forget async chain for this spirit's effects.
      (async () => {
        for (const effect of spiritEffects) {
          this.fxManager.playSkillTrigger(effect, anchor);
          // BattleLog entry per effect
          const skillName  = registry.getSkillName(spiritId) ?? effect.type;
          const spiritName = registry.getSpirit(spiritId)?.name ?? spiritId;
          const valueStr   = effect.value !== undefined
            ? ` (+${Math.round(effect.value * 100)}%)`
            : '';
          EventBus.emit(EventNames.BATTLE_LOG, {
            text:  `${side} ${spiritName} · ${skillName}${valueStr}`,
            color: sideColor,
          });
          // Stagger next effect on the same spirit by 120 ms
          await new Promise<void>(r => this.time.delayedCall(120, r));
        }
      })();
    }
  }

  private _onSpinRequested(): void {
    this._doSpin().catch(err => console.error('[GameScene] spin error:', err));
  }

  private async _doSpin(): Promise<void> {
    if (fsm.getState() !== 'GAME_IDLE') return;
    fsm.transition('GAME_SPINNING');
    this.spinButton.setMode('spinning');
    EventBus.emit(EventNames.SPIN_STARTED);

    const result = this.engine.spin(
      this.pool, this.spiritsA, this.spiritsB, this.betA, this.betB
    );

    await this.reelSpinner.spin(result.grid, this.pool.map(p => p.id));

    EventBus.emit(EventNames.SPIN_STOPPED);
    fsm.transition('GAME_EVALUATING');
    this._applyRoundResult(result);
  }

  private _applyRoundResult(result: EvaluationResult): void {
    this.currentRound++;
    EventBus.emit(EventNames.ROUND_UPDATED, { round: this.currentRound });

    const { sideA, sideB } = result;

    // Coins (win minus bet, floor at 0)
    this.balanceA = Math.max(0, this.balanceA + sideA.coinWon - this.betA);
    this.balanceB = Math.max(0, this.balanceB + sideB.coinWon - this.betB);
    EventBus.emit(EventNames.BALANCE_UPDATED, { side: 'A', coin: this.balanceA, bet: this.betA });
    EventBus.emit(EventNames.BALANCE_UPDATED, { side: 'B', coin: this.balanceB, bet: this.betB });

    const floatY      = Math.round(LAYOUT.arenaH * 0.45);
    const panelCenterA = Math.round(LAYOUT.panelW / 2);
    const panelCenterB = Math.round(LAYOUT.panelW + LAYOUT.centerW + LAYOUT.panelW / 2);

    if (sideA.dmgDealt > 0) {
      this._applyDamage('B', sideA.dmgDealt);
      EventBus.emit(EventNames.WIN_RESULT, { side: 'A', dmg: sideA.dmgDealt, coin: sideA.coinWon });
      this.fxManager.floatNumber(panelCenterB, floatY, sideA.dmgDealt);
      EventBus.emit(EventNames.BATTLE_LOG, {
        text:  `A hits ${sideA.dmgDealt} DMG (${sideA.hitLines.length} lines)`,
        color: COLORS.playerA,
      });
    }

    if (sideB.dmgDealt > 0) {
      this._applyDamage('A', sideB.dmgDealt);
      EventBus.emit(EventNames.WIN_RESULT, { side: 'B', dmg: sideB.dmgDealt, coin: sideB.coinWon });
      this.fxManager.floatNumber(panelCenterA, floatY, sideB.dmgDealt);
      EventBus.emit(EventNames.BATTLE_LOG, {
        text:  `B hits ${sideB.dmgDealt} DMG (${sideB.hitLines.length} lines)`,
        color: COLORS.playerB,
      });
    }

    if (sideA.dmgDealt === 0 && sideB.dmgDealt === 0) {
      EventBus.emit(EventNames.BATTLE_LOG, {
        text:  `Round ${this.currentRound}: No match`,
        color: COLORS.textMuted,
      });
    }

    // Win line flash — A=blue, B=red, drawn separately so colours are distinct
    const paylines = this.engine.getPaylines();
    const origin   = { x: this.reelOriginX, y: this.reelOriginY };
    if (sideA.hitLines.length > 0) {
      this.fxManager.winLineFlash(
        sideA.hitLines.map(h => paylines[h.lineIndex]),
        origin, LAYOUT.reelCellW, LAYOUT.reelCellH, LAYOUT.reelCellGap,
        COLORS.playerA   // blue
      );
    }
    if (sideB.hitLines.length > 0) {
      this.fxManager.winLineFlash(
        sideB.hitLines.map(h => paylines[h.lineIndex]),
        origin, LAYOUT.reelCellW, LAYOUT.reelCellH, LAYOUT.reelCellGap,
        COLORS.playerB   // red
      );
    }

    // Win celebration FX + BigWin overlay for large hits
    const maxDmg = Math.max(sideA.dmgDealt, sideB.dmgDealt);
    if (maxDmg > 0) {
      EventBus.emit(EventNames.FX_WIN_CELEBRATION, { dmg: maxDmg });

      if (maxDmg >= BIG_WIN_DMG_THRESHOLD) {
        const kind: WinKind = maxDmg >= MEGA_WIN_DMG_THRESHOLD ? 'mega' : 'big';
        const payout = maxDmg * 8;   // rough visual payout (cosmetic only)
        this.time.delayedCall(800, () => {
          this._bigWinOverlay?.show(kind, payout);
        });
      }
    }

    // Game over check
    const aAlive = this.hpA.some(h => h > 0);
    const bAlive = this.hpB.some(h => h > 0);

    if (!aAlive || !bAlive) {
      fsm.transition('GAME_OVER');
      this.spinButton.setMode('gameover');

      const winner: GameOverData['winner'] = (!aAlive && !bAlive) ? 'DRAW'
        : (!aAlive ? 'B' : 'A');

      const resultText = winner === 'DRAW'
        ? '★ DRAW — mutual destruction!'
        : `★ PLAYER ${winner} WINS!`;
      EventBus.emit(EventNames.BATTLE_LOG, {
        text:  resultText,
        color: COLORS.borderGold,
      });

      // Hand off to GameOverScene with full match summary
      const gameOverData: GameOverData = {
        winner,
        rounds:       this.currentRound,
        hpRemainingA: this.hpA.reduce((s, v) => s + v, 0),
        hpRemainingB: this.hpB.reduce((s, v) => s + v, 0),
        hpMaxA:       this.maxHpA.reduce((s, v) => s + v, 0),
        hpMaxB:       this.maxHpB.reduce((s, v) => s + v, 0),
        coinA:        this.balanceA,
        coinB:        this.balanceB,
      };
      // Brief delay so the final battle log line is readable before the overlay appears
      this.time.delayedCall(1200, () => {
        this.scene.launch('GameOverScene', gameOverData);
      });

      return;
    }

    fsm.transition('GAME_IDLE');
    this.spinButton.setMode('idle');
  }

  private _applyDamage(side: Side, dmg: number): void {
    const hp    = side === 'A' ? this.hpA    : this.hpB;
    const maxHp = side === 'A' ? this.maxHpA : this.maxHpB;
    let remaining = dmg;

    for (let i = 0; i < hp.length && remaining > 0; i++) {
      if (hp[i] <= 0) continue;
      const taken = Math.min(hp[i], remaining);
      hp[i]      -= taken;
      remaining  -= taken;
      EventBus.emit(EventNames.HP_UPDATED, { side, unitIndex: i, hp: hp[i], maxHp: maxHp[i] });
      if (hp[i] <= 0) {
        EventBus.emit(EventNames.UNIT_DIED, { side, unitIndex: i });
      }
    }
  }

  private _cleanup(): void {
    EventBus.off(EventNames.SPIN_REQUESTED, this._onSpinRequested, this);
    EventBus.off(EventNames.SKILL_RESOLVED, this._onSkillResolved, this);
    EventBus.off(EventNames.ROUND_UPDATED,  undefined, this);
    this.reelSpinner?.destroy();
  }
}
