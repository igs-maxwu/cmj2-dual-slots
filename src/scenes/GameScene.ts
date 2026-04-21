import Phaser from 'phaser';
import { fsm } from '@/systems/StateMachine';
import { EventBus } from '@/systems/EventBus';
import { EventNames } from '@/config/EventNames';
import { CANVAS_WIDTH, CANVAS_HEIGHT, REEL_COLS, REEL_ROWS } from '@/config/GameConfig';
import { COLORS, LAYOUT, FONT_SIZE, FONT, SEA, GOLD } from '@/config/DesignTokens';
import { ReelGrid }    from '@/objects/ui/ReelGrid';
import { ReelSpinner } from '@/objects/ui/ReelSpinner';
import { SpinButton }  from '@/objects/ui/SpinButton';
import { BattleLog }   from '@/objects/ui/BattleLog';
import { FxManager }   from '@/systems/FxManager';
import { GoldText }    from '@/objects/ui/design/GoldText';
import {
  BigWinOverlay, BIG_WIN_DMG_THRESHOLD, MEGA_WIN_DMG_THRESHOLD,
  type WinKind,
} from '@/objects/ui/BigWinOverlay';
import { PaytableStrip, PAYTABLE_W, PAYTABLE_H } from '@/objects/ui/PaytableStrip';
import { SlotEngine } from '@/systems/SlotEngine';
import { buildUnionPool, type PoolEntry } from '@/systems/SymbolPool';
import { calculateScales } from '@/systems/ScaleCalculator';
import {
  createFormation, isTeamAlive, teamHpTotal, type FormationGrid,
} from '@/systems/Formation';
import { distributeDamage } from '@/systems/DamageDistributor';
import {
  SYMBOLS, DEFAULT_SELECTED_A, DEFAULT_SELECTED_B,
  DEFAULT_TEAM_HP, DEFAULT_BET, DEFAULT_TARGET_RTP,
  DEFAULT_TARGET_DMG, DEFAULT_FAIRNESS_EXP,
} from '@/config/SymbolsConfig';
import type { GameOverData } from '@/scenes/GameOverScene';

/** Config passed from DraftScene or HTML config panel. */
export interface BattleConfig {
  selectedA:   number[];
  selectedB:   number[];
  teamHpA:     number;
  teamHpB:     number;
  betA:        number;
  betB:        number;
  coinScaleA:  number;
  dmgScaleA:   number;
  coinScaleB:  number;
  dmgScaleB:   number;
  fairnessExp: number;
}

function defaultConfig(): BattleConfig {
  const selectedA = DEFAULT_SELECTED_A;
  const selectedB = DEFAULT_SELECTED_B;
  const pool      = buildUnionPool(selectedA, selectedB, SYMBOLS);
  const tw        = pool.reduce((s, p) => s + p.weight, 0);
  const scalesA   = calculateScales(DEFAULT_TARGET_RTP, DEFAULT_TARGET_DMG, selectedA, tw, DEFAULT_FAIRNESS_EXP);
  const scalesB   = calculateScales(DEFAULT_TARGET_RTP, DEFAULT_TARGET_DMG, selectedB, tw, DEFAULT_FAIRNESS_EXP);
  return {
    selectedA, selectedB,
    teamHpA: DEFAULT_TEAM_HP, teamHpB: DEFAULT_TEAM_HP,
    betA: DEFAULT_BET, betB: DEFAULT_BET,
    coinScaleA: scalesA.coinScale, dmgScaleA: scalesA.dmgScale,
    coinScaleB: scalesB.coinScale, dmgScaleB: scalesB.dmgScale,
    fairnessExp: DEFAULT_FAIRNESS_EXP,
  };
}

/**
 * Primary gameplay scene — refactored for Dual Slot 3.html reference demo.
 * Uses Formation + DamageDistributor for battle state; SlotEngine for dual-direction spin.
 */
export class GameScene extends Phaser.Scene {
  reelGrid!:     ReelGrid;
  spinButton!:   SpinButton;
  battleLog!:    BattleLog;
  uiContainer!:  Phaser.GameObjects.Container;
  private _bigWinOverlay!: BigWinOverlay;
  private _roundText!:     Phaser.GameObjects.Text;
  private _coinTextA!:     Phaser.GameObjects.Text;
  private _coinTextB!:     Phaser.GameObjects.Text;
  private fxManager!:      FxManager;
  private reelSpinner!:    ReelSpinner;
  private engine!:         SlotEngine;
  private pool:            PoolEntry[] = [];
  private reelOriginX!:    number;
  private reelOriginY!:    number;
  private cfg!:            BattleConfig;
  private formA!:          FormationGrid;
  private formB!:          FormationGrid;
  private coinA = 0;
  private coinB = 0;
  private currentRound    = 0;
  private isAutoBattling  = false;
  private _pendingRematch = false;

  constructor() { super({ key: 'GameScene' }); }

  init(data?: BattleConfig | { mode?: string }): void {
    if (data && 'selectedA' in data) {
      this.cfg = data as BattleConfig;
    } else if (data && (data as { mode?: string }).mode === 'rematch') {
      this._pendingRematch = true;
    } else {
      this.cfg = defaultConfig();
    }
  }

  create(): void {
    this._drawBackground();
    this.uiContainer = this.add.container(0, 0);
    this.reelGrid    = new ReelGrid(this);
    this.spinButton  = new SpinButton(this);
    this.battleLog   = new BattleLog(this);
    this.uiContainer.add([this.reelGrid, this.spinButton, this.battleLog]);
    this._drawCenterTitle();
    this._drawArenaBackground();
    this._drawPaytableStrip();
    this._initBattle();
    this._setupListeners();
    this._bigWinOverlay = new BigWinOverlay(this);
    if (this._pendingRematch) {
      this._pendingRematch = false;
      this._resetBattle();
    }
  }

  // ---------------------------------------------------------------------------
  // Private: setup
  // ---------------------------------------------------------------------------

  private _initBattle(): void {
    if (!this.cfg) this.cfg = defaultConfig();
    this.pool    = buildUnionPool(this.cfg.selectedA, this.cfg.selectedB, SYMBOLS);
    this.engine  = new SlotEngine(REEL_ROWS, REEL_COLS);
    this.formA   = createFormation(this.cfg.selectedA, this.cfg.teamHpA);
    this.formB   = createFormation(this.cfg.selectedB, this.cfg.teamHpB);
    this.coinA   = this.cfg.teamHpA;
    this.coinB   = this.cfg.teamHpB;
    this.fxManager   = new FxManager(this, this.uiContainer);
    this.reelOriginX = Math.round((CANVAS_WIDTH - LAYOUT.reelTotalW) / 2);
    this.reelOriginY = LAYOUT.reelY + 14;
    this.reelSpinner = new ReelSpinner(this, this.reelOriginX, this.reelOriginY, this.fxManager);
    this._updateCoinDisplay();
    this._updateRoundDisplay();
  }

  private _resetBattle(): void {
    this.formA = createFormation(this.cfg.selectedA, this.cfg.teamHpA);
    this.formB = createFormation(this.cfg.selectedB, this.cfg.teamHpB);
    this.coinA = this.cfg.teamHpA;
    this.coinB = this.cfg.teamHpB;
    this.currentRound   = 0;
    this.isAutoBattling = false;
    this._updateCoinDisplay();
    this._updateRoundDisplay();
    this.battleLog.clear();
    this.spinButton.setMode('idle');
    fsm.transition('GAME_IDLE');
  }

  private _setupListeners(): void {
    EventBus.on(EventNames.SPIN_REQUESTED,        this._onSpinRequested,  this);
    EventBus.on(EventNames.REMATCH_REQUESTED,     this._onRematch,        this);
    EventBus.on(EventNames.BATTLE_CONFIG_UPDATED, this._onConfigUpdated,  this);
    this.events.on(Phaser.Scenes.Events.SHUTDOWN, this._cleanup, this);
  }

  // ---------------------------------------------------------------------------
  // Private: background / UI layout
  // ---------------------------------------------------------------------------

  private _drawBackground(): void {
    this.add.rectangle(CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2, CANVAS_WIDTH, CANVAS_HEIGHT, SEA.abyss);
    const grad = this.add.graphics();
    grad.fillGradientStyle(SEA.mid, SEA.mid, SEA.abyss, SEA.abyss, 1);
    grad.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
    const BAND_H = Math.round(CANVAS_HEIGHT * 0.36);
    const beams  = this.add.graphics();
    beams.fillGradientStyle(SEA.light, SEA.light, SEA.deep, SEA.deep, 0.28, 0.28, 0, 0);
    beams.fillRect(CANVAS_WIDTH * 0.3, 0, CANVAS_WIDTH * 0.4, BAND_H);
    beams.fillGradientStyle(SEA.caustic, SEA.light, SEA.abyss, SEA.deep, 0.12, 0.10, 0, 0);
    beams.fillRect(0, 0, CANVAS_WIDTH * 0.4, BAND_H);
    beams.fillGradientStyle(SEA.light, SEA.caustic, SEA.deep, SEA.abyss, 0.10, 0.12, 0, 0);
    beams.fillRect(CANVAS_WIDTH * 0.6, 0, CANVAS_WIDTH * 0.4, BAND_H);
    beams.setBlendMode(Phaser.BlendModes.SCREEN);
    const floor = this.add.graphics();
    floor.fillGradientStyle(SEA.abyss, SEA.abyss, SEA.abyss, SEA.abyss, 0, 0, 0.75, 0.75);
    floor.fillRect(0, CANVAS_HEIGHT - 180, CANVAS_WIDTH, 180);
  }

  private _drawArenaBackground(): void {
    this.uiContainer.add(
      this.add.rectangle(CANVAS_WIDTH / 2, LAYOUT.reelY - 1, CANVAS_WIDTH, 1, GOLD.base, 0.3),
    );
    this._roundText = this.add.text(CANVAS_WIDTH / 2, 14, 'ROUND  00', {
      fontSize: `${FONT_SIZE.sm}px`, fontFamily: FONT.body, color: '#7ea3c7',
    }).setOrigin(0.5, 0);
    this.uiContainer.add(this._roundText);
    const yCoins = LAYOUT.reelY + LAYOUT.reelTotalH + 12;
    this._coinTextA = this.add.text(80, yCoins, 'A HP: 0', {
      fontSize: `${FONT_SIZE.sm}px`, fontFamily: FONT.num, color: '#48b3ff',
    }).setOrigin(0, 0);
    this._coinTextB = this.add.text(CANVAS_WIDTH - 80, yCoins, 'B HP: 0', {
      fontSize: `${FONT_SIZE.sm}px`, fontFamily: FONT.num, color: '#ff6b6b',
    }).setOrigin(1, 0);
    this.uiContainer.add([this._coinTextA, this._coinTextB]);
  }

  private _drawCenterTitle(): void {
    const cx    = CANVAS_WIDTH / 2;
    const title = new GoldText(this, '雀靈戰記', {
      fontSize: FONT_SIZE.big, fontFamily: FONT.display, strokeWidth: 3, glow: true, origin: 0.5,
    });
    title.setPosition(cx, 62);
    this.uiContainer.add(title);
    const sub = this.add.text(cx, 126, 'BATTLE OF SPIRITS', {
      fontSize: `${FONT_SIZE.xs}px`, fontFamily: FONT.body, color: '#7ad7e8',
    }).setOrigin(0.5, 0);
    this.uiContainer.add(sub);
  }

  private _drawPaytableStrip(): void {
    const stripX = Math.round((CANVAS_WIDTH - PAYTABLE_W) / 2);
    const stripY = LAYOUT.reelY - 10 - PAYTABLE_H;
    this.uiContainer.add(new PaytableStrip(this, stripX, stripY));
  }

  // ---------------------------------------------------------------------------
  // Private: HUD updates
  // ---------------------------------------------------------------------------

  private _updateCoinDisplay(): void {
    this._coinTextA?.setText(`A HP: ${teamHpTotal(this.formA)}`);
    this._coinTextB?.setText(`B HP: ${teamHpTotal(this.formB)}`);
  }

  private _updateRoundDisplay(): void {
    this._roundText?.setText(`ROUND  ${String(this.currentRound).padStart(2, '0')}`);
  }

  // ---------------------------------------------------------------------------
  // Private: event handlers
  // ---------------------------------------------------------------------------

  private _onSpinRequested(): void {
    this._doSpin().catch(err => console.error('[GameScene] spin error:', err));
  }

  private _onRematch(): void {
    this._resetBattle();
  }

  private _onConfigUpdated(cfg: BattleConfig): void {
    this.cfg   = cfg;
    this.pool  = buildUnionPool(cfg.selectedA, cfg.selectedB, SYMBOLS);
    this.formA = createFormation(cfg.selectedA, cfg.teamHpA);
    this.formB = createFormation(cfg.selectedB, cfg.teamHpB);
    this.coinA = cfg.teamHpA;
    this.coinB = cfg.teamHpB;
    this._updateCoinDisplay();
  }

  // ---------------------------------------------------------------------------
  // Private: spin loop
  // ---------------------------------------------------------------------------

  private async _doSpin(): Promise<void> {
    if (fsm.getState() !== 'GAME_IDLE') return;
    fsm.transition('GAME_SPINNING');
    this.spinButton.setMode('spinning');
    EventBus.emit(EventNames.SPIN_STARTED);

    const result = this.engine.spin(
      this.pool,
      this.cfg.selectedA,
      this.cfg.selectedB,
      this.cfg.betA,
      this.cfg.betB,
      this.cfg.coinScaleA,
      this.cfg.dmgScaleA,
      this.cfg.coinScaleB,
      this.cfg.dmgScaleB,
      this.cfg.fairnessExp,
    );

    await this.reelSpinner.spin(result.grid, this.pool.map(p => p.id));
    EventBus.emit(EventNames.SPIN_STOPPED);
    fsm.transition('GAME_EVALUATING');
    this._applyRoundResult(result);
  }

  private _applyRoundResult(result: ReturnType<SlotEngine['spin']>): void {
    this.currentRound++;
    this._updateRoundDisplay();

    const dmgByA = result.sideA.dmgDealt;
    const dmgByB = result.sideB.dmgDealt;
    const coinA  = result.sideA.coinWon;
    const coinB  = result.sideB.coinWon;

    if (dmgByA > 0) {
      distributeDamage(this.formB, dmgByA, 'A');
      EventBus.emit(EventNames.WIN_RESULT, { side: 'A', dmg: dmgByA, coin: coinA });
      this.fxManager.floatNumber(
        Math.round(LAYOUT.panelW + LAYOUT.centerW + LAYOUT.panelW / 2),
        Math.round(LAYOUT.arenaH * 0.45),
        dmgByA,
      );
      EventBus.emit(EventNames.BATTLE_LOG, {
        text:  `A hits ${dmgByA} DMG (${result.sideA.hitLines.length} lines, +${coinA} coin)`,
        color: COLORS.playerA,
      });
    }

    if (dmgByB > 0) {
      distributeDamage(this.formA, dmgByB, 'B');
      EventBus.emit(EventNames.WIN_RESULT, { side: 'B', dmg: dmgByB, coin: coinB });
      this.fxManager.floatNumber(
        Math.round(LAYOUT.panelW / 2),
        Math.round(LAYOUT.arenaH * 0.45),
        dmgByB,
      );
      EventBus.emit(EventNames.BATTLE_LOG, {
        text:  `B hits ${dmgByB} DMG (${result.sideB.hitLines.length} lines, +${coinB} coin)`,
        color: COLORS.playerB,
      });
    }

    if (dmgByA === 0 && dmgByB === 0) {
      EventBus.emit(EventNames.BATTLE_LOG, {
        text: `Round ${this.currentRound}: No match`, color: COLORS.textMuted,
      });
    }

    const paylines = this.engine.getPaylines();
    const origin   = { x: this.reelOriginX, y: this.reelOriginY };
    if (result.sideA.hitLines.length > 0) {
      this.fxManager.winLineFlash(
        result.sideA.hitLines.map(h => paylines[h.lineIndex]),
        origin, LAYOUT.reelCellW, LAYOUT.reelCellH, LAYOUT.reelCellGap, COLORS.playerA,
      );
    }
    if (result.sideB.hitLines.length > 0) {
      this.fxManager.winLineFlash(
        result.sideB.hitLines.map(h => paylines[h.lineIndex]),
        origin, LAYOUT.reelCellW, LAYOUT.reelCellH, LAYOUT.reelCellGap, COLORS.playerB,
      );
    }

    const maxDmg = Math.max(dmgByA, dmgByB);
    if (maxDmg > 0) {
      EventBus.emit(EventNames.FX_WIN_CELEBRATION, { dmg: maxDmg });
      if (maxDmg >= BIG_WIN_DMG_THRESHOLD) {
        const kind: WinKind = maxDmg >= MEGA_WIN_DMG_THRESHOLD ? 'mega' : 'big';
        this.time.delayedCall(800, () => this._bigWinOverlay?.show(kind, maxDmg * 8));
      }
    }

    this._updateCoinDisplay();

    const aAlive = isTeamAlive(this.formA);
    const bAlive = isTeamAlive(this.formB);

    if (!aAlive || !bAlive) {
      fsm.transition('GAME_OVER');
      this.spinButton.setMode('gameover');
      const winner: GameOverData['winner'] = (!aAlive && !bAlive) ? 'DRAW' : (!aAlive ? 'B' : 'A');
      EventBus.emit(EventNames.BATTLE_LOG, {
        text:  winner === 'DRAW' ? '* DRAW — mutual destruction!' : `* PLAYER ${winner} WINS!`,
        color: COLORS.borderGold,
      });
      const gameOverData: GameOverData = {
        winner,
        rounds:       this.currentRound,
        hpRemainingA: teamHpTotal(this.formA),
        hpRemainingB: teamHpTotal(this.formB),
        hpMaxA:       this.cfg.teamHpA,
        hpMaxB:       this.cfg.teamHpB,
        coinA:        this.coinA,
        coinB:        this.coinB,
      };
      this.time.delayedCall(1200, () => this.scene.launch('GameOverScene', gameOverData));
      return;
    }

    fsm.transition('GAME_IDLE');
    this.spinButton.setMode('idle');

    if (this.isAutoBattling) {
      const hasDmg = dmgByA > 0 || dmgByB > 0;
      this.time.delayedCall(hasDmg ? 1000 : 300, () => EventBus.emit(EventNames.SPIN_REQUESTED));
    }
  }

  private _cleanup(): void {
    EventBus.off(EventNames.SPIN_REQUESTED,        this._onSpinRequested, this);
    EventBus.off(EventNames.REMATCH_REQUESTED,     this._onRematch,       this);
    EventBus.off(EventNames.BATTLE_CONFIG_UPDATED, this._onConfigUpdated, this);
    this.reelSpinner?.destroy();
  }
}
