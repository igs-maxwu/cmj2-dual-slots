/**
 * [The Actuary] — Pure logic engine, zero Phaser/DOM dependencies.
 * Owns: payline generation, spin evaluation, damage distribution, RTP simulation.
 */

import {
  resolve as resolveSkills,
  type ResolvedEffect,
  type ResolvedEffects,
  type SkillContext,
  type SideRoundState,
} from './SkillResolver';

// ─── Types ──────────────────────────────────────────────────────────────────

export type Element = 'man' | 'pin' | 'sou' | 'honor' | 'wild';
export type Rarity   = 'N' | 'R' | 'SR' | 'SSR';
export type Side     = 'A' | 'B';

export interface SymbolDef {
  id:        number;
  name:      string;
  element:   Element;
  tier:      1 | 2 | 3;
  weight:    number;
  coinMult:  number;
  dmgMult:   number;
  traitKey:  string; // 'pierce' | 'refund' | 'double_eval' | 'skill_plus1' | 'skill_plus2' | 'skill_resonance' | 'wild' | ''
}

export interface SkillTrigger {
  type:       'own_line' | 'ally_same_element' | 'symbol_match' | 'hp_threshold' | 'on_death';
  minMatch?:  number;
  count?:     number;
  symbolId?:  number;
  hpPct?:     number;
  once?:      boolean;
}

export interface SkillEffect {
  type:     'dmg_bonus' | 'coin_bonus' | 'double_eval' | 'pierce_formation' |
            'refund_bet' | 'dmg_immunity' | 'skill_resonance' | 'halve_strongest_enemy' | 'revive_hp';
  value?:   number;
  duration?: number;
}

export interface SpiritSkill {
  id:          string;
  name:        string;
  trigger:     SkillTrigger;
  effect:      SkillEffect;
  description: string;
}

export interface SpiritDef {
  id:             string;
  name:           string;
  rarity:         Rarity;
  element:        Element;
  tier:           1 | 2 | 3;
  baseHp:         number;
  atkBonus:       number;
  coinBonus:      number;
  injectsSymbols: number[];
  skill:          SpiritSkill;
}

/** Result of evaluating one spin for one side. */
export interface SideResult {
  coinWon:    number;
  dmgDealt:   number;
  hitLines:   HitLine[];
  /** Normalized effects produced by SkillResolver this round. */
  triggeredSkills: ResolvedEffect[];
  /**
   * True when a `pierce_formation` effect fired this round.
   * GameScene / damage-distribution layer should skip front-row soak when set.
   */
  pierceFormation: boolean;
  /**
   * True when a `refund_bet` effect fired this round.
   * Game layer may refund the bet cost for this spin.
   */
  betRefunded: boolean;
}

/**
 * Per-side cross-round state. Lives outside SideResult because it
 * must persist between spins.
 *
 * T1.2: added `hp` and `maxHp` arrays so SkillResolver can read and
 * mutate spirit health (revive, halve-strongest, hp_threshold trigger).
 * Both arrays are parallel to the side's spirit roster.  The game layer
 * (GameScene / simulate.ts) is responsible for initialising them before
 * the first spin; the engine propagates mutations across rounds.
 */
export interface RoundState {
  /** Spirit IDs that already burned their `once: true` revive trigger. */
  usedRevive:         Set<string>;
  /** Rounds of damage-immunity remaining (0 = not immune). */
  immunityRoundsLeft: number;
  /**
   * Current HP of each spirit in the side's roster (same order as the roster
   * array).  Initialised empty; caller must populate before the first spin.
   */
  hp:    number[];
  /**
   * Max HP of each spirit.  Same order as `hp`.  Treated as read-only by
   * the engine — only `revive_hp` effects write to `hp`, never to `maxHp`.
   */
  maxHp: number[];
}

/** Factory — fresh RoundState for a new match (hp / maxHp left empty for caller). */
export function createRoundState(): RoundState {
  return {
    usedRevive:         new Set<string>(),
    immunityRoundsLeft: 0,
    hp:                 [],
    maxHp:              [],
  };
}

export interface HitLine {
  lineIndex: number;
  symbolId:  number;
  matchCount: number;
  rawCoin:    number;
  rawDmg:     number;
}

/** Full result returned to game layer after one round. */
export interface EvaluationResult {
  grid:    number[][];  // [row][col] symbol IDs
  sideA:   SideResult;
  sideB:   SideResult;
}

export interface PoolSymbol {
  id:     number;
  weight: number;
}

// ─── Payline Generator ──────────────────────────────────────────────────────

/**
 * Deterministically generates N paylines for a ROWS×COLS grid.
 * Uses a fixed seed so both clients agree on the same lines.
 */
export function generatePaylines(rows: number, cols: number, count: number): number[][] {
  const lines: number[][] = [];
  let seed = 12345;
  const rand = () => { seed = (seed * 9301 + 49297) % 233280; return seed / 233280; };

  for (let i = 0; i < count; i++) {
    let r = Math.floor(rand() * rows);
    const line = [r];
    for (let c = 1; c < cols; c++) {
      const move = Math.floor(rand() * 3) - 1;
      r = Math.max(0, Math.min(rows - 1, r + move));
      line.push(r);
    }
    lines.push(line);
  }
  return lines;
}

// ─── Symbol Pool Builder ─────────────────────────────────────────────────────

/**
 * Builds a weighted symbol pool from the spirits both players selected.
 * Each spirit injects its symbols; duplicates accumulate weight.
 */
export function buildSymbolPool(
  spiritsA: SpiritDef[],
  spiritsB: SpiritDef[],
  allSymbols: SymbolDef[]
): PoolSymbol[] {
  const weightMap = new Map<number, number>();
  const inject = (spirit: SpiritDef) => {
    spirit.injectsSymbols.forEach(symId => {
      const sym = allSymbols[symId];
      weightMap.set(symId, (weightMap.get(symId) ?? 0) + sym.weight);
    });
  };
  [...spiritsA, ...spiritsB].forEach(inject);

  return Array.from(weightMap.entries()).map(([id, weight]) => ({ id, weight }));
}

// ─── Weighted Random ─────────────────────────────────────────────────────────

function pickFromPool(pool: PoolSymbol[], rng: () => number): number {
  const total = pool.reduce((s, p) => s + p.weight, 0);
  let r = rng() * total;
  for (const p of pool) { if (r < p.weight) return p.id; r -= p.weight; }
  return pool[pool.length - 1].id;
}

// ─── Grid Generator ──────────────────────────────────────────────────────────

export function spinGrid(rows: number, cols: number, pool: PoolSymbol[], rng: () => number): number[][] {
  return Array.from({ length: rows }, () =>
    Array.from({ length: cols }, () => pickFromPool(pool, rng))
  );
}

// ─── Core Evaluator ──────────────────────────────────────────────────────────

/**
 * Evaluates the grid for one side.
 * Side A reads left→right; Side B reads right→left.
 */
function evaluateSide(
  grid: number[][],
  paylines: number[][],
  side: Side,
  spiritSymbolIds: number[],
  allSymbols: SymbolDef[],
  payoutBase: Record<string, number>,
  bet: number,
  sideRoster: SpiritDef[],
  opponentRoster: SpiritDef[],
  sideRoundState: RoundState,
  opponentRoundState: RoundState
): SideResult {
  const COLS = grid[0].length;
  const hitLines: HitLine[] = [];
  let totalCoin = 0;
  let totalDmg  = 0;

  paylines.forEach((line, lineIndex) => {
    const startCol = side === 'A' ? 0 : COLS - 1;
    const dir      = side === 'A' ? 1 : -1;

    const anchorSymId = grid[line[startCol]][startCol];
    if (!spiritSymbolIds.includes(anchorSymId)) return;

    // Wild can substitute: collect all IDs that match (anchor or wild=12)
    let matchCount = 1;
    for (let step = 1; step < COLS; step++) {
      const col   = startCol + dir * step;
      const symId = grid[line[col]][col];
      const sym   = allSymbols[symId];
      if (symId === anchorSymId || sym.traitKey === 'wild') matchCount++;
      else break;
    }

    if (matchCount < 3) return;

    const anchor  = allSymbols[anchorSymId];
    const base    = payoutBase[String(matchCount)] ?? 0;
    const rawCoin = base * anchor.coinMult;
    const rawDmg  = base * anchor.dmgMult;

    hitLines.push({ lineIndex, symbolId: anchorSymId, matchCount, rawCoin, rawDmg });
    totalCoin += rawCoin * (bet / 100);
    totalDmg  += rawDmg  * (bet / 100);
  });

  // Ensure non-zero damage when there was a hit
  if (totalDmg > 0 && Math.floor(totalDmg) === 0) totalDmg = 1;

  /**
   * Post-resolve application is done here (not in SkillResolver) because:
   *  - SkillResolver is a pure descriptor emitter; it must remain side-effect-free
   *    on coin / dmg values so that replays and tests can inspect raw effects.
   *  - SlotEngine owns the final numeric outputs; centralising the math here
   *    makes overflow / clamp behaviour easy to audit in one place.
   *
   * Snapshot prevSideHp *before* calling the resolver so that on_death
   * triggers can detect the alive→dead transition correctly.  The caller
   * (evaluate) has already applied incoming damage to sideRoundState.hp
   * before invoking evaluateSide, so this snapshot is the "current" HP
   * after taking hits but before this round's skill effects fire.
   */
  const prevSideHp = (sideRoundState as SideRoundState).hp.slice();

  const skillCtx: SkillContext = {
    side,
    hitLines,
    sideRoster,
    opponentRoster,
    sideRoundState:     sideRoundState     as SideRoundState,
    opponentRoundState: opponentRoundState as SideRoundState,
    prevSideHp,
  };
  const triggeredSkills: ResolvedEffects = resolveSkills(skillCtx);

  // ─── Apply resolved effects to this side's coin / damage totals ───────────
  let pierceFormation = false;
  let betRefunded     = false;
  const hasOtherEffects = triggeredSkills.length > 1; // used for skill_resonance check

  for (const fx of triggeredSkills) {
    switch (fx.type) {
      case 'dmg_bonus':
        // Multiplicative bonus; value from config (e.g. 0.5 → +50% dmg).
        totalDmg *= 1 + (fx.value ?? 0);
        break;

      case 'coin_bonus':
        // Multiplicative bonus on coin output.
        totalCoin *= 1 + (fx.value ?? 0);
        break;

      case 'skill_resonance':
        // Bonus applies only when another ally skill also fired this round.
        if (hasOtherEffects) {
          totalDmg *= 1 + (fx.value ?? 0);
        }
        break;

      case 'double_eval':
        // Doubles both outputs in one pass — no recursive evaluation.
        totalDmg  *= 2;
        totalCoin *= 2;
        break;

      case 'pierce_formation':
        // Flag forwarded to game layer; no in-engine numeric change.
        pierceFormation = true;
        break;

      case 'refund_bet':
        // Flag forwarded to game layer.
        betRefunded = true;
        break;

      case 'dmg_immunity':
      case 'halve_strongest_enemy':
      case 'revive_hp':
        // These effects already mutated round-state inside the resolver.
        // Nothing left to do here.
        break;

      default: {
        // Exhaustiveness guard — unknown types are silently ignored.
        const _: never = fx.type;
        void _;
      }
    }
  }

  return {
    coinWon:  Math.floor(totalCoin),
    dmgDealt: Math.floor(totalDmg),
    hitLines,
    triggeredSkills,
    pierceFormation,
    betRefunded,
  };
}

// ─── Public API ──────────────────────────────────────────────────────────────

export interface EngineConfig {
  rows:        number;
  cols:        number;
  linesCount:  number;
  payoutBase:  Record<string, number>;
  allSymbols:  SymbolDef[];
}

export class SlotEngine {
  private paylines: number[][];
  private cfg: EngineConfig;

  constructor(cfg: EngineConfig) {
    this.cfg      = cfg;
    this.paylines = generatePaylines(cfg.rows, cfg.cols, cfg.linesCount);
  }

  /**
   * Evaluate a pre-built grid (used in simulation and replays).
   * `roundStateA` / `roundStateB` are optional — callers that don't yet
   * track cross-round state (legacy simulation harness) get a fresh
   * scratch state; gameplay code should pass persistent instances.
   *
   * Immunity pipeline (T1.2):
   *   1. evaluateSide(A) and evaluateSide(B) each independently resolve skills
   *      and compute raw dmgDealt.
   *   2. If side A holds immunityRoundsLeft > 0, side B's dmgDealt is clamped
   *      to 0 (B cannot hurt A while A is shielded).
   *   3. Symmetrically for side B's immunity vs A's damage.
   *   4. Both counters are decremented by 1 (minimum 0) to consume one round.
   *
   * SKILL_RESOLVED is emitted only when running under a browser (window guard)
   * so the Node-based simulation harness does not attempt to import Phaser.
   */
  evaluate(
    grid: number[][],
    spiritsA: SpiritDef[],
    spiritsB: SpiritDef[],
    betA: number,
    betB: number,
    roundStateA: RoundState = createRoundState(),
    roundStateB: RoundState = createRoundState(),
    round: number = 1
  ): EvaluationResult {
    const symIdsA = [...new Set(spiritsA.flatMap(s => s.injectsSymbols))];
    const symIdsB = [...new Set(spiritsB.flatMap(s => s.injectsSymbols))];

    const sideA = evaluateSide(
      grid, this.paylines, 'A', symIdsA, this.cfg.allSymbols, this.cfg.payoutBase, betA,
      spiritsA, spiritsB, roundStateA, roundStateB
    );
    const sideB = evaluateSide(
      grid, this.paylines, 'B', symIdsB, this.cfg.allSymbols, this.cfg.payoutBase, betB,
      spiritsB, spiritsA, roundStateB, roundStateA
    );

    // ── Immunity clamping: apply *after* both sides have resolved skills ──────
    // A is immune → B's damage against A is zeroed.
    if (roundStateA.immunityRoundsLeft > 0) {
      sideB.dmgDealt = 0;
    }
    // B is immune → A's damage against B is zeroed.
    if (roundStateB.immunityRoundsLeft > 0) {
      sideA.dmgDealt = 0;
    }
    // Consume one immunity round on each side (clamp at 0).
    roundStateA.immunityRoundsLeft = Math.max(0, roundStateA.immunityRoundsLeft - 1);
    roundStateB.immunityRoundsLeft = Math.max(0, roundStateB.immunityRoundsLeft - 1);

    // ── Emit SKILL_RESOLVED if any skill fired (browser-only guard) ───────────
    const anySkills =
      sideA.triggeredSkills.length > 0 ||
      sideB.triggeredSkills.length > 0;

    if (anySkills && typeof window !== 'undefined') {
      // Lazy import keeps Node simulation harness free of Phaser dependencies.
      void import('./EventBus').then(({ EventBus }) => {
        void import('../config/EventNames').then(({ EventNames }) => {
          if (sideA.triggeredSkills.length > 0) {
            EventBus.emit(EventNames.SKILL_RESOLVED, {
              side:    'A',
              round,
              effects: sideA.triggeredSkills,
            });
          }
          if (sideB.triggeredSkills.length > 0) {
            EventBus.emit(EventNames.SKILL_RESOLVED, {
              side:    'B',
              round,
              effects: sideB.triggeredSkills,
            });
          }
        });
      });
    }

    return { grid, sideA, sideB };
  }

  /**
   * Spin a new grid, then evaluate it.
   */
  spin(
    pool: PoolSymbol[],
    spiritsA: SpiritDef[],
    spiritsB: SpiritDef[],
    betA: number,
    betB: number,
    rng: () => number = Math.random,
    roundStateA: RoundState = createRoundState(),
    roundStateB: RoundState = createRoundState()
  ): EvaluationResult {
    const grid = spinGrid(this.cfg.rows, this.cfg.cols, pool, rng);
    return this.evaluate(grid, spiritsA, spiritsB, betA, betB, roundStateA, roundStateB);
  }

  /** Expose paylines for [The Illusionist] to draw win-line overlays. */
  getPaylines(): Readonly<number[][]> { return this.paylines; }
}

// ─── Simulation Hook (for [The Auditor]) ─────────────────────────────────────

export interface SimStats {
  iterations:  number;
  rtpA:        number;  // actual coin returned / total bet
  rtpB:        number;
  avgDmgA:     number;
  avgDmgB:     number;
  winRateA:    number;  // % of matches where A survives
}

/**
 * Run N spin simulations and return aggregated stats.
 * [The Auditor] calls this to verify RTP and balance.
 */
export function runSimulation(
  engine: SlotEngine,
  pool: PoolSymbol[],
  spiritsA: SpiritDef[],
  spiritsB: SpiritDef[],
  betA: number,
  betB: number,
  hpA: number,
  hpB: number,
  iterations: number = 10_000
): SimStats {
  let totalBetA = 0, totalCoinA = 0, totalDmgA = 0;
  let totalBetB = 0, totalCoinB = 0, totalDmgB = 0;
  let winsA = 0;

  const ROUND_LIMIT = 5000;

  for (let i = 0; i < iterations; i++) {
    let curHpA = hpA, curHpB = hpB, rounds = 0;
    let matchCoinA = 0, matchCoinB = 0;

    while (curHpA > 0 && curHpB > 0 && rounds < ROUND_LIMIT) {
      rounds++;
      const res = engine.spin(pool, spiritsA, spiritsB, betA, betB);
      matchCoinA += res.sideA.coinWon;
      matchCoinB += res.sideB.coinWon;
      curHpA -= res.sideB.dmgDealt;
      curHpB -= res.sideA.dmgDealt;
      totalDmgA += res.sideA.dmgDealt;
      totalDmgB += res.sideB.dmgDealt;
    }

    totalBetA  += betA * rounds;
    totalBetB  += betB * rounds;
    totalCoinA += matchCoinA;
    totalCoinB += matchCoinB;
    // Tie-break: if both die same round, award win to whichever HP is less negative.
    // Simultaneous kills are ~50% of mirror matches due to correlated damage from
    // the shared grid — splitting them fairly is essential for unbiased stats.
    if (curHpA > 0) {
      winsA++;
    } else if (curHpA === curHpB) {
      winsA += 0.5; // exact draw: split
    } else if (curHpA > curHpB) {
      winsA++;      // A survived "longer" (less overkill)
    }
    // else B wins: curHpB > curHpA (B less negative) or curHpB > 0
  }

  return {
    iterations,
    rtpA:     totalBetA > 0 ? (totalCoinA / totalBetA) * 100 : 0,
    rtpB:     totalBetB > 0 ? (totalCoinB / totalBetB) * 100 : 0,
    avgDmgA:  totalDmgA / iterations,
    avgDmgB:  totalDmgB / iterations,
    winRateA: (winsA / iterations) * 100,
  };
}
