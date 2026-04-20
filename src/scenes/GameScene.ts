import Phaser from 'phaser';
import { fsm } from '@/systems/StateMachine';
import { EventBus } from '@/systems/EventBus';
import { EventNames } from '@/config/EventNames';
import { CANVAS_WIDTH, CANVAS_HEIGHT, REEL_COLS, REEL_ROWS, DEFAULT_BALANCE } from '@/config/GameConfig';
import type { GameOverData } from '@/scenes/GameOverScene';
import { COLORS, LAYOUT, FONT_SIZE, FONT } from '@/config/DesignTokens';
import { PlayerPanel }  from '@/objects/ui/PlayerPanel';
import { ReelGrid }     from '@/objects/ui/ReelGrid';
import { ReelSpinner }  from '@/objects/ui/ReelSpinner';
import { SpinButton }   from '@/objects/ui/SpinButton';
import { BattleLog }    from '@/objects/ui/BattleLog';
import { FxManager }    from '@/systems/FxManager';
import { registry }     from '@/systems/SpiritRegistry';
import {
  SlotEngine, buildSymbolPool,
  type SpiritDef, type PoolSymbol, type EvaluationResult, type Side,
} from '@/systems/SlotEngine';
import symbolsData from '@/config/symbols.json';

type ExtSpiritDef = SpiritDef & { textureKey?: string };

/**
 * Primary gameplay scene.
 * [The Stylist]   — UI containers wired here.
 * [The Illusionist] — FxManager + ReelSpinner instantiated here.
 * [The Actuary]   — SlotEngine evaluation wired here; replace battle logic as needed.
 */
export class GameScene extends Phaser.Scene {
  // ─── UI ──────────────────────────────────────────────────────────────────────
  reelGrid!:    ReelGrid;
  panelA!:      PlayerPanel;
  panelB!:      PlayerPanel;
  spinButton!:  SpinButton;
  battleLog!:   BattleLog;
  uiContainer!: Phaser.GameObjects.Container;

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

  /**
   * Called by Phaser before `create()`.
   * When data contains `{ mode: 'rematch' }` the battle state is reset
   * immediately so the scene re-uses the same Phaser objects.
   *
   * @param data - Optional scene-start payload. Pass `{ mode: 'rematch' }` to
   *               trigger a full battle reset without rebuilding the scene.
   */
  init(data?: { mode?: string }): void {
    if (data?.mode === 'rematch') {
      // _resetBattle needs live Phaser objects — schedule it for after create()
      this._pendingRematch = true;
    }
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

    this._drawVsLabel();
    this._drawArenaBackground();
    this._initBattle();
    this._setupListeners();

    if (this._pendingRematch) {
      this._pendingRematch = false;
      this._resetBattle();
    }
  }

  // ─── Private ────────────────────────────────────────────────────────────────

  private _drawBackground(): void {
    this.add.rectangle(CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2, CANVAS_WIDTH, CANVAS_HEIGHT, COLORS.bg);
  }

  private _drawArenaBackground(): void {
    const sep = this.add.rectangle(CANVAS_WIDTH / 2, LAYOUT.reelY, CANVAS_WIDTH, 2, COLORS.borderNormal, 0.4);
    this.uiContainer.add(sep);

    const roundText = this.add.text(CANVAS_WIDTH / 2, 14, 'ROUND 0', {
      fontSize: `${FONT_SIZE.md}px`, fontFamily: FONT.bold, color: '#7f8c9a',
    }).setOrigin(0.5, 0);
    this.uiContainer.add(roundText);

    EventBus.on(EventNames.ROUND_UPDATED, (data: { round: number }) => {
      roundText.setText(`ROUND ${data.round}`);
    });
  }

  private _drawVsLabel(): void {
    const vsText = this.add.text(CANVAS_WIDTH / 2, LAYOUT.arenaH / 2, 'VS', {
      fontSize: `${FONT_SIZE.xxl}px`, fontFamily: FONT.bold, color: '#ffffff',
    }).setOrigin(0.5, 0.5).setAlpha(0.85);
    this.uiContainer.add(vsText);
  }

  private _initBattle(): void {
    // Default rosters for prototype (will be replaced by DraftScene selection)
    this.spiritsA = registry.validateRoster(['SP_MENGCHENZHANG', 'SP_CANLAN', 'SP_YIN']);
    this.spiritsB = registry.validateRoster(['SP_LUOLUO', 'SP_LINGYU', 'SP_ZHULUAN']);

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
    EventBus.on(EventNames.SPIN_REQUESTED, this._onSpinRequested, this);
    this.events.on(Phaser.Scenes.Events.SHUTDOWN, this._cleanup, this);
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

    // Win celebration FX
    const maxDmg = Math.max(sideA.dmgDealt, sideB.dmgDealt);
    if (maxDmg > 0) {
      EventBus.emit(EventNames.FX_WIN_CELEBRATION, { dmg: maxDmg });
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
    EventBus.off(EventNames.ROUND_UPDATED,  undefined, this);
    this.reelSpinner?.destroy();
  }
}
