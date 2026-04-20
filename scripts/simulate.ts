/**
 * [The Auditor] Task #004 — RTP Simulation
 * Run: npx tsx scripts/simulate.ts
 *      npx tsx scripts/simulate.ts --with-skills
 *
 * --with-skills: enables per-spirit HP tracking and SkillResolver dispatch.
 *   Initialises RoundState.hp/maxHp from roster baseHp, then propagates
 *   spirit-level damage across rounds.  Matches end when all spirits on one
 *   side reach HP <= 0.  Produces side-by-side RTP / winrate / trigger stats.
 */
import path from 'path';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);

import {
  SlotEngine,
  buildSymbolPool,
  runSimulation,
  createRoundState,
  type RoundState,
  type SideResult,
  type SpiritDef,
} from '../src/systems/SlotEngine.js';
import { registry } from '../src/systems/SpiritRegistry.js';

const symbolsData = require('../src/config/symbols.json');

const ITERATIONS  = 10_000;
const BET         = 100;
const ROUND_LIMIT = 5000;

const withSkills = process.argv.includes('--with-skills');

// ─── Rosters ─────────────────────────────────────────────────────────────────

const spiritsA = registry.validateRoster(['SP_MENGCHENZHANG', 'SP_CANLAN', 'SP_YIN']);
const spiritsB = registry.validateRoster(['SP_LUOLUO', 'SP_LINGYU', 'SP_ZHULUAN']);

const pool = buildSymbolPool(spiritsA, spiritsB, symbolsData.symbols);

const engine = new SlotEngine({
  rows:       4,
  cols:       5,
  linesCount: symbolsData.linesCount,
  payoutBase: symbolsData.payoutBase,
  allSymbols: symbolsData.symbols,
});

const hpA = spiritsA.reduce((s, sp) => s + sp.baseHp, 0);
const hpB = spiritsB.reduce((s, sp) => s + sp.baseHp, 0);

// ─── Plain stats printer ─────────────────────────────────────────────────────

function printStats(
  stats: ReturnType<typeof runSimulation>,
  elapsed: number,
) {
  console.log(`  RTP A      : ${stats.rtpA.toFixed(2)}%`);
  console.log(`  RTP B      : ${stats.rtpB.toFixed(2)}%`);
  console.log(`  Avg DMG A  : ${stats.avgDmgA.toFixed(1)} / match`);
  console.log(`  Avg DMG B  : ${stats.avgDmgB.toFixed(1)} / match`);
  console.log(`  Win rate A : ${stats.winRateA.toFixed(1)}%`);
  console.log(`  Win rate B : ${(100 - stats.winRateA).toFixed(1)}%`);
  console.log(`  Elapsed    : ${elapsed}ms`);
}

// ─── Skills-on simulation ────────────────────────────────────────────────────

interface SkillSimStats {
  rtpA:           number;
  rtpB:           number;
  winRateA:       number;
  avgDmgA:        number;
  avgDmgB:        number;
  avgTriggersA:   number;
  avgTriggersB:   number;
  totalMatches:   number;
}

/**
 * Run N match simulations with per-spirit HP tracking and SkillResolver.
 *
 * Spirit-level damage: each spin's dmgDealt is distributed flat across all
 * alive spirits on the receiving side (equal share, integer floor; remainder
 * falls to the last alive spirit).  This is intentionally simple — the
 * GameScene will eventually implement front-row soak and pierce logic.
 *
 * A match ends when all spirits on either side reach HP <= 0.
 * A fresh RoundState (with hp/maxHp populated from baseHp) is created for
 * each new match.
 */
function runSkillSimulation(
  rosterA: SpiritDef[],
  rosterB: SpiritDef[],
  iterations: number,
): SkillSimStats {
  let totalBetA = 0, totalCoinA = 0, totalDmgA = 0;
  let totalBetB = 0, totalCoinB = 0, totalDmgB = 0;
  let winsA = 0;
  let totalTriggersA = 0, totalTriggersB = 0;
  let totalMatches = 0;
  let totalSpins = 0;

  // Build a pool local to this roster pair.
  const localPool = buildSymbolPool(rosterA, rosterB, symbolsData.symbols);

  /** Distribute flat damage across all alive spirits.  Returns the updated hp array. */
  function applyDamage(hp: number[], dmg: number): number[] {
    const alive = hp.filter(h => h > 0).length;
    if (alive === 0 || dmg === 0) return hp;
    const share  = Math.floor(dmg / alive);
    let   remain = dmg - share * alive; // leftover due to floor
    const out = hp.slice();
    for (let i = 0; i < out.length; i++) {
      if (out[i] <= 0) continue;
      out[i] -= share;
      if (remain > 0) { out[i] -= remain; remain = 0; }
    }
    return out;
  }

  /** True when every spirit in the array is at or below 0 HP. */
  function isWiped(hp: number[]): boolean {
    return hp.every(h => h <= 0);
  }

  for (let match = 0; match < iterations; match++) {
    // Fresh per-match round state with hp/maxHp initialised.
    const rsA: RoundState = createRoundState();
    const rsB: RoundState = createRoundState();
    rsA.hp    = rosterA.map(s => s.baseHp);
    rsA.maxHp = rosterA.map(s => s.baseHp);
    rsB.hp    = rosterB.map(s => s.baseHp);
    rsB.maxHp = rosterB.map(s => s.baseHp);

    let matchCoinA = 0, matchCoinB = 0;
    let rounds = 0;

    while (!isWiped(rsA.hp) && !isWiped(rsB.hp) && rounds < ROUND_LIMIT) {
      rounds++;
      totalSpins++;

      const res = engine.spin(
        localPool, rosterA, rosterB, BET, BET, Math.random,
        rsA, rsB,
      );

      matchCoinA += res.sideA.coinWon;
      matchCoinB += res.sideB.coinWon;

      // Accumulate trigger counts.
      totalTriggersA += res.sideA.triggeredSkills.length;
      totalTriggersB += res.sideB.triggeredSkills.length;

      // Apply damage to per-spirit HP arrays.
      rsA.hp = applyDamage(rsA.hp, res.sideB.dmgDealt);
      rsB.hp = applyDamage(rsB.hp, res.sideA.dmgDealt);

      totalDmgA += res.sideA.dmgDealt;
      totalDmgB += res.sideB.dmgDealt;
    }

    totalBetA  += BET * rounds;
    totalBetB  += BET * rounds;
    totalCoinA += matchCoinA;
    totalCoinB += matchCoinB;
    totalMatches++;

    // Win-rate tiebreak: same logic as runSimulation.
    const sumHpA = rsA.hp.reduce((s, h) => s + h, 0);
    const sumHpB = rsB.hp.reduce((s, h) => s + h, 0);
    if (!isWiped(rsA.hp)) {
      winsA++;
    } else if (isWiped(rsB.hp)) {
      // Both wiped same round — split by remaining HP magnitude.
      if (sumHpA === sumHpB) {
        winsA += 0.5;
      } else if (sumHpA > sumHpB) {
        winsA++;
      }
    }
    // else B wins
  }

  return {
    rtpA:         totalBetA > 0 ? (totalCoinA / totalBetA) * 100 : 0,
    rtpB:         totalBetB > 0 ? (totalCoinB / totalBetB) * 100 : 0,
    winRateA:     (winsA / iterations) * 100,
    avgDmgA:      totalDmgA / iterations,
    avgDmgB:      totalDmgB / iterations,
    avgTriggersA: totalTriggersA / totalSpins,
    avgTriggersB: totalTriggersB / totalSpins,
    totalMatches,
  };
}

// ─── Entry point ─────────────────────────────────────────────────────────────

console.log(`\n═══════════════════════════════════`);
console.log(`  [The Auditor] RTP Simulation`);
if (withSkills) console.log(`  Mode: --with-skills (skill effects ENABLED)`);
else            console.log(`  Mode: baseline (skill effects disabled)`);
console.log(`═══════════════════════════════════`);

if (!withSkills) {
  // ─── Baseline path (skills-off, legacy behaviour) ──────────────────────────
  console.log(`  Test 1: Default prototype rosters`);
  console.log(`  Iterations : ${ITERATIONS.toLocaleString()}`);
  console.log(`  Bet/round  : ${BET} each side`);
  console.log(`  Total HP A : ${hpA}  pool: ${pool.length} symbols`);
  console.log(`  Total HP B : ${hpB}`);
  console.log(`───────────────────────────────────`);

  let start = Date.now();
  let stats = runSimulation(engine, pool, spiritsA, spiritsB, BET, BET, hpA, hpB, ITERATIONS);
  printStats(stats, Date.now() - start);

  const poolMirror = buildSymbolPool(spiritsA, spiritsA, symbolsData.symbols);
  console.log(`\n───────────────────────────────────`);
  console.log(`  Test 2: Mirror (A vs A) — fairness check`);
  console.log(`  Symbol pool: ${poolMirror.length} symbols`);
  console.log(`───────────────────────────────────`);

  start = Date.now();
  const statsMirror = runSimulation(
    engine, poolMirror, spiritsA, spiritsA, BET, BET, hpA, hpA, ITERATIONS,
  );
  printStats(statsMirror, Date.now() - start);

  console.log(`\n═══════════════════════════════════`);
  console.log(`  VERDICT`);
  console.log(`═══════════════════════════════════`);

  const mirrorFair   = Math.abs(statsMirror.winRateA - 50) < 5;
  const asymExpected = stats.winRateA > 60;

  if (mirrorFair) {
    console.log(`  Engine is fair: mirror win rate = ${statsMirror.winRateA.toFixed(1)}%`);
    console.log(`     (Note: ~50% of mirror matches end as simultaneous kills)`);
  } else {
    console.log(`  Engine bias detected: mirror win rate = ${statsMirror.winRateA.toFixed(1)}%`);
  }
  if (asymExpected) {
    const poolWeightA = pool.reduce((s, p) => s + (p.id <= 8 ? p.weight : 0), 0);
    const poolTotal   = pool.reduce((s, p) => s + p.weight, 0);
    console.log(`  Prototype rosters are imbalanced (expected, fix via DraftScene balancing)`);
    console.log(`     A-side symbol weight: ${poolWeightA} / ${poolTotal} total (${(poolWeightA/poolTotal*100).toFixed(0)}%)`);
  }
  console.log();

} else {
  // ─── Skills-on path ────────────────────────────────────────────────────────
  console.log(`  Test 1 (skills-on): A [Meng/Cang/Yin] vs B [LuoLuo/LingYu/ZhuLuan]`);
  console.log(`  Iterations : ${ITERATIONS.toLocaleString()}`);
  console.log(`  Bet/round  : ${BET} each side`);
  console.log(`  Total HP A : ${hpA}  |  Total HP B : ${hpB}`);
  console.log(`───────────────────────────────────`);

  const startSkills = Date.now();
  const statsSkills = runSkillSimulation(spiritsA, spiritsB, ITERATIONS);
  const elapsedSkills = Date.now() - startSkills;

  console.log(`  RTP A            : ${statsSkills.rtpA.toFixed(2)}%`);
  console.log(`  RTP B            : ${statsSkills.rtpB.toFixed(2)}%`);
  console.log(`  Avg DMG A/match  : ${statsSkills.avgDmgA.toFixed(1)}`);
  console.log(`  Avg DMG B/match  : ${statsSkills.avgDmgB.toFixed(1)}`);
  console.log(`  Win rate A       : ${statsSkills.winRateA.toFixed(1)}%`);
  console.log(`  Win rate B       : ${(100 - statsSkills.winRateA).toFixed(1)}%`);
  console.log(`  Avg triggers A/spin : ${statsSkills.avgTriggersA.toFixed(4)}`);
  console.log(`  Avg triggers B/spin : ${statsSkills.avgTriggersB.toFixed(4)}`);
  console.log(`  Elapsed          : ${elapsedSkills}ms`);

  // Mirror (A vs A) with skills on — fairness check.
  const spiritsMirrorB = registry.validateRoster(['SP_MENGCHENZHANG', 'SP_CANLAN', 'SP_YIN']);
  console.log(`\n───────────────────────────────────`);
  console.log(`  Test 2 (skills-on): Mirror A vs A — fairness check`);
  console.log(`───────────────────────────────────`);

  const startMirror = Date.now();
  const statsMirror = runSkillSimulation(spiritsA, spiritsMirrorB, ITERATIONS);
  const elapsedMirror = Date.now() - startMirror;

  console.log(`  RTP A            : ${statsMirror.rtpA.toFixed(2)}%`);
  console.log(`  RTP B            : ${statsMirror.rtpB.toFixed(2)}%`);
  console.log(`  Win rate A       : ${statsMirror.winRateA.toFixed(1)}%`);
  console.log(`  Win rate B       : ${(100 - statsMirror.winRateA).toFixed(1)}%`);
  console.log(`  Avg triggers A/spin : ${statsMirror.avgTriggersA.toFixed(4)}`);
  console.log(`  Avg triggers B/spin : ${statsMirror.avgTriggersB.toFixed(4)}`);
  console.log(`  Elapsed          : ${elapsedMirror}ms`);

  // Reference: skills-off on same rosters for comparison.
  console.log(`\n───────────────────────────────────`);
  console.log(`  Reference (skills-off, same rosters):`);
  console.log(`───────────────────────────────────`);
  const startRef = Date.now();
  const statsRef = runSimulation(
    engine, pool, spiritsA, spiritsB, BET, BET, hpA, hpB, ITERATIONS,
  );
  const elapsedRef = Date.now() - startRef;
  printStats(statsRef, elapsedRef);

  console.log(`\n═══════════════════════════════════`);
  console.log(`  VERDICT`);
  console.log(`═══════════════════════════════════`);

  const rtpAOk = statsSkills.rtpA >= 80 && statsSkills.rtpA <= 200;
  const rtpBOk = statsSkills.rtpB >= 80 && statsSkills.rtpB <= 200;
  const mirrorFair = Math.abs(statsMirror.winRateA - 50) < 5;

  console.log(`  Skills-on RTP A  : ${statsSkills.rtpA.toFixed(2)}% ${rtpAOk ? '[OK]' : '[REVIEW]'}`);
  console.log(`  Skills-on RTP B  : ${statsSkills.rtpB.toFixed(2)}% ${rtpBOk ? '[OK]' : '[REVIEW]'}`);
  console.log(`  Mirror fairness  : ${mirrorFair ? 'PASS' : 'FAIL'} (${statsMirror.winRateA.toFixed(1)}% vs 50.0% expected)`);
  console.log(`  Skills-off RTP A : ${statsRef.rtpA.toFixed(2)}%`);
  console.log(`  Skills-off RTP B : ${statsRef.rtpB.toFixed(2)}%`);

  const dmgDeltaA = statsSkills.avgDmgA - statsRef.avgDmgA;
  const dmgDeltaB = statsSkills.avgDmgB - statsRef.avgDmgB;
  console.log(`  Dmg delta A (skills-on minus off): ${dmgDeltaA > 0 ? '+' : ''}${dmgDeltaA.toFixed(1)}`);
  console.log(`  Dmg delta B (skills-on minus off): ${dmgDeltaB > 0 ? '+' : ''}${dmgDeltaB.toFixed(1)}`);
  console.log();
}
