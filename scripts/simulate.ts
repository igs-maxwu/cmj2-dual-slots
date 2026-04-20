/**
 * [The Auditor] Task #004 — RTP Simulation
 * Run: npx tsx scripts/simulate.ts
 */
import path from 'path';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);

// Manual path resolution for the @ alias
import { SlotEngine, buildSymbolPool, runSimulation } from '../src/systems/SlotEngine.js';
import { registry } from '../src/systems/SpiritRegistry.js';

const symbolsData = require('../src/config/symbols.json');

const ITERATIONS = 10_000;
const BET = 100;

// Default rosters (same as GameScene prototype)
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

function printStats(label: string, stats: ReturnType<typeof runSimulation>, elapsed: number) {
  console.log(`\n  RTP A      : ${stats.rtpA.toFixed(2)}%`);
  console.log(`  RTP B      : ${stats.rtpB.toFixed(2)}%`);
  console.log(`  Avg DMG A  : ${stats.avgDmgA.toFixed(1)} / match`);
  console.log(`  Avg DMG B  : ${stats.avgDmgB.toFixed(1)} / match`);
  console.log(`  Win rate A : ${stats.winRateA.toFixed(1)}%`);
  console.log(`  Win rate B : ${(100 - stats.winRateA).toFixed(1)}%`);
  console.log(`  Elapsed    : ${elapsed}ms`);
}

// ─── Test 1: Prototype rosters (asymmetric) ──────────────────────────────────
console.log(`\n═══════════════════════════════════`);
console.log(`  [The Auditor] RTP Simulation`);
console.log(`═══════════════════════════════════`);
console.log(`  Test 1: Default prototype rosters`);
console.log(`  Iterations : ${ITERATIONS.toLocaleString()}`);
console.log(`  Bet/round  : ${BET} each side`);
console.log(`  Total HP A : ${hpA}  pool: ${pool.length} symbols`);
console.log(`  Total HP B : ${hpB}`);
console.log(`───────────────────────────────────`);

let start = Date.now();
let stats = runSimulation(engine, pool, spiritsA, spiritsB, BET, BET, hpA, hpB, ITERATIONS);
printStats('asymmetric', stats, Date.now() - start);

// ─── Test 2: Mirror (A vs A) — should be ~50% each ───────────────────────────
const poolMirror = buildSymbolPool(spiritsA, spiritsA, symbolsData.symbols);
console.log(`\n───────────────────────────────────`);
console.log(`  Test 2: Mirror (A vs A) — fairness check`);
console.log(`  Symbol pool: ${poolMirror.length} symbols`);
console.log(`───────────────────────────────────`);

start = Date.now();
const statsMirror = runSimulation(engine, poolMirror, spiritsA, spiritsA, BET, BET, hpA, hpA, ITERATIONS);
printStats('mirror', statsMirror, Date.now() - start);

console.log(`\n═══════════════════════════════════`);
console.log(`  VERDICT`);
console.log(`═══════════════════════════════════`);

const mirrorFair   = Math.abs(statsMirror.winRateA - 50) < 5;
const asymExpected = stats.winRateA > 60; // imbalanced rosters → expected

if (mirrorFair) {
  console.log(`  ✅ Engine is fair: mirror win rate = ${statsMirror.winRateA.toFixed(1)}%`);
  console.log(`     (Note: ~50% of mirror matches end as simultaneous kills — fixed by HP-overkill tiebreak)`);
} else {
  console.log(`  ❌ Engine bias detected: mirror win rate = ${statsMirror.winRateA.toFixed(1)}%`);
}
if (asymExpected) {
  const poolWeightA = pool.reduce((s, p) => s + (p.id <= 8 ? p.weight : 0), 0);
  const poolTotal   = pool.reduce((s, p) => s + p.weight, 0);
  console.log(`  ⚠️  Prototype rosters are imbalanced (expected, fix via DraftScene balancing)`);
  console.log(`     A-side symbol weight: ${poolWeightA} / ${poolTotal} total (${(poolWeightA/poolTotal*100).toFixed(0)}%)`);
}
console.log();
