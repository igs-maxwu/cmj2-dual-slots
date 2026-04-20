/**
 * [The Actuary] — Pure logic engine, zero Phaser/DOM dependencies.
 * Owns: payline generation, spin evaluation, damage distribution, RTP simulation.
 */

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
  triggeredSkills: string[]; // skill IDs triggered this round
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
  bet: number
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

  return {
    coinWon:  Math.floor(totalCoin),
    dmgDealt: Math.floor(totalDmg),
    hitLines,
    triggeredSkills: [],
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
   */
  evaluate(
    grid: number[][],
    spiritsA: SpiritDef[],
    spiritsB: SpiritDef[],
    betA: number,
    betB: number
  ): EvaluationResult {
    const symIdsA = [...new Set(spiritsA.flatMap(s => s.injectsSymbols))];
    const symIdsB = [...new Set(spiritsB.flatMap(s => s.injectsSymbols))];

    return {
      grid,
      sideA: evaluateSide(grid, this.paylines, 'A', symIdsA, this.cfg.allSymbols, this.cfg.payoutBase, betA),
      sideB: evaluateSide(grid, this.paylines, 'B', symIdsB, this.cfg.allSymbols, this.cfg.payoutBase, betB),
    };
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
    rng: () => number = Math.random
  ): EvaluationResult {
    const grid = spinGrid(this.cfg.rows, this.cfg.cols, pool, rng);
    return this.evaluate(grid, spiritsA, spiritsB, betA, betB);
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
