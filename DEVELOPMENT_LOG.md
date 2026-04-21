# DEVELOPMENT_LOG — Dual Slots Battle

## [Phase]: Foundation / Architecture → Agent Roster Complete

---

### [Status]

| Agent | Status | Progress |
|-------|--------|----------|
| The Visionary   | ✅ Briefed | Role defined; GDD pipeline upstream of all agents |
| The Architect   | ✅ Active | Foundation complete; EventBus + FSM live |
| The Actuary     | ✅ Briefed | Role defined; awaiting Actuary task ticket |
| The Stylist     | ✅ Briefed | Role defined; awaiting layout task ticket |
| The Illusionist | ✅ Briefed | Role defined; awaiting FX task ticket |
| The Auditor     | ✅ Briefed | Role defined; awaiting first audit request |

---

### [Decisions]

| Decision | Rationale |
|----------|-----------|
| Phaser 3 `EventEmitter` as EventBus | Native to Phaser, zero extra dependency, battle-tested |
| FSM with hard-coded transition table | Prevents illegal state jumps; explicit > implicit |
| `@/` path alias | Keeps imports clean as directory depth grows |
| Containers for `reelContainer` / `uiContainer` | Clear separation of ownership between Architect, Stylist, Illusionist |

---

### [Architecture]

```
src/
├── config/
│   ├── EventNames.ts     ← All event strings (single source of truth)
│   └── GameConfig.ts     ← Canvas size, economy defaults, reel constants
├── systems/
│   ├── EventBus.ts       ← Global Phaser EventEmitter singleton
│   └── StateMachine.ts   ← FSM + transition guard + fsm singleton
├── scenes/
│   ├── BootScene.ts      ← BOOT state
│   ├── PreloadScene.ts   ← PRELOAD state
│   ├── MainMenuScene.ts  ← MAIN_MENU state
│   └── GameScene.ts      ← GAME_IDLE / SPINNING / EVALUATING / OVER
└── main.ts               ← Phaser.Game entry point
```

---

### [Agent API Contracts]

**For [The Actuary]:**
- Listen to `EventNames.SPIN_STOPPED` to begin evaluation.
- Emit `EventNames.WIN_RESULT` with `{ amount: number }` on win.
- Emit `EventNames.LOSE_RESULT` on loss.

**For [The Stylist]:**
- Attach HUD objects to `GameScene.uiContainer`.
- Trigger spins by emitting `EventNames.SPIN_REQUESTED`.

**For [The Illusionist]:**
- Listen to `EventNames.FX_WIN_CELEBRATION` to trigger win effects.
- Listen to `EventNames.FX_REEL_STOP` to trigger reel-stop effects.
- Attach visual objects to `GameScene.reelContainer`.

---

### [Risks]

- `GAME_OVER` state has no scene handler yet — needs implementation when game-over condition is defined by [The Actuary].
- Asset loading in `PreloadScene` is empty — [The Stylist] must populate before visual development begins.

---

## T1.2 Skill Balance (2026-04-20)

**Scope:** SkillResolver integration into SlotEngine — ResolvedEffect application (dmg/coin multipliers, pierce flag, refund flag, immunity clamping), `SKILL_RESOLVED` event emit (browser-guarded), `hp[]`/`maxHp[]` on RoundState, `--with-skills` simulation harness.

### Simulation Results (10,000 iterations, BET=100 each side)

| Metric                        | Skills-OFF | Skills-ON |
|-------------------------------|-----------|-----------|
| RTP A (Meng/Cang/Yin)         | 167.89%   | 167.95%   |
| RTP B (Luo/Ling/Zhu)          | 56.10%    | 56.36%    |
| Win rate A                    | 100.0%    | 100.0%    |
| Win rate B                    | 0.0%      | 0.0%      |
| Avg DMG A / match             | 7118.5    | 7445.5    |
| Avg DMG B / match             | 1054.9    | 1107.8    |
| Avg triggers A / spin         | —         | 0.5081    |
| Avg triggers B / spin         | —         | 0.0653    |
| Mirror winrate A (A vs A)     | 50.0%     | 50.8%     |

**Mirror fairness check:** PASS (50.8% is within 5% of 50.0%).

### RTP Assessment

- RTP A (167.95%) is above the 95–105% design target. This is an **existing pre-skill issue** driven by the heavily asymmetric symbol pool (A-side occupies 74% of pool weight). RTP inflates because the simulation counts coins earned across an entire match, and A wins almost every match quickly while B rarely wins rounds. The skill layer adds only +0.06 pp to RTP A, confirming skills are not the root cause.
- RTP B (56.36%) is well below target for the same structural reason — B rarely lands hit lines because its symbols occupy 26% of pool weight.
- **Root cause:** prototype rosters are intentionally imbalanced (known, tracked as pre-existing). The DraftScene balancing pass (future ticket) should equalize symbol pool shares before an RTP audit is meaningful.

### Per-Skill Balance Notes

| Spirit | Skill | Trigger | Avg triggers/spin | Notes |
|--------|-------|---------|-------------------|-------|
| SP_MENGCHENZHANG | SK_DRAGON_CHARGE (dmg_bonus 1.5) | own_line minMatch=4 | ~0.25 | High value (×2.5 dmg) with moderate trigger rate. Acceptable for SR. |
| SP_CANLAN | SK_VERDANT_DANCE (double_eval) | ally_same_element 2 | ~0.25 | Fires when both Sou allies land lines — compounds Dragon Charge. Combined effect can reach ×5 dmg. **Potentially overtuned when all three A-side spirits synergize.** |
| SP_YIN | SK_TIGER_FANG (pierce_formation) | symbol_match 2 minMatch=3 | rare | Qualitative effect only (no numeric delta until front-row soak is implemented). Low current impact. |
| SP_LUOLUO | SK_NIRVANA (revive_hp 0.3) | on_death once | 0.0653/spin (all B triggers) | Fires rarely in current imbalanced match-up; hard to isolate from B's low trigger total. Needs balanced roster to properly evaluate. |
| SP_LINGYU | SK_PHOENIX_WING (skill_resonance) | symbol_match 11 minMatch=3 | rare (symbol 11 is low-weight wild-adjacent) | Very low trigger rate due to Bai (symbol 11) having sparse pool presence. May need weight bump or minMatch=2. |
| SP_ZHULUAN | SK_EMBER_BLESSING (coin_bonus 1.5) | own_line minMatch=3 | moderate | Coin-only effect; does not affect winrate. Balanced. |

### Recommendations (Owner Decision Required)

1. **SK_VERDANT_DANCE (double_eval):** Consider capping at ×1.5 or requiring minMatch=4 on both allies before double activates. Current stack with Dragon Charge can produce ×5 total damage multiplier, which dominates once the symbol pool is balanced.
2. **SK_PHOENIX_WING (skill_resonance):** Trigger rate is near zero because symbol 11 (Bai) has low pool weight. Either increase Bai's weight in symbols.json or relax minMatch to 2. No change made — Owner to decide.
3. **RTP root cause is roster asymmetry, not skills.** Skills-on adds only ~+0.3% to each side's damage per match. Balance audit should be re-run after DraftScene equalization pass.

---

## R-Series Refactor: Skill System → Symbol-Based Dual Slots (2026-04-21)

**Pivot summary:** Replaced the spirit-and-skill layer (T1.x) with a symbol-based dual-direction slot battle aligned with the reference demo. 9 commits in one day (R1 → R8 + one R7 fix) totaling removal of ~1,100 lines of skill code and addition of ~1,400 lines of symbol / battle / UI code.

**Why:** The skill system audit (T1.2) flagged that RTP imbalance was driven by roster asymmetry, not skills — and that fixing the root cause required restructuring the symbol pool itself. Rather than patch the skill layer, Owner chose to rebuild on a symbol-first foundation where payline generation, scale calculation, and auto-balance all derive from the symbol config.

---

### R1 — Symbol Data Layer (`2686f6e`)

**Scope:** `SymbolsConfig.ts` (8 symbols: id/name/shape/color/weight), `PaylinesGenerator.ts` (LCG generator matching reference demo `seed=12345` with boundary clamping), `SymbolPool.ts` (union pool builder), plus formation grid constants in `GameConfig.ts`.

**Delta:** +115 / −0 across 4 files.

---

### R2 — Battle Core (`ab9d305`)

**Scope:** `Formation.ts` (9-slot `FormationGrid`, Fisher-Yates shuffle matching reference demo, `isTeamAlive`, `teamHpTotal`). `DamageDistributor.ts` (column-priority distribution: A attacks col 0 first, B attacks col 2 first) with `DmgEvent` log.

**Delta:** +91 / −0 across 2 files.

---

### R3 — Dual-Direction Slot Engine (`68a8f30`)

**Scope:** `SlotEngine.ts` rewrite — A anchors at col 0 (left→right), B anchors at col 4 (right→left). Uses `PaylinesGenerator` + `SymbolPool` from R1. Scale multipliers via `(totalW/weight)^exp * scale`. Legacy stubs kept for `SkillResolver` / `SpiritRegistry` / `GameScene` until R5.

**Delta:** 206 / −486 (net −280) in one file. Largest surface-area reduction of the series.

---

### R4 — Scale Calculator + Auto-Balance (`0510726`)

**Scope:** `ScaleCalculator.ts` — three functions:
- `calculateScales()`: expected-value formula `(prob^3/4/5 * payoutBase * dynMult * LINES_COUNT)` solves `coinScale` and `dmgScale` analytically.
- `simulateWinRate()`: runs N full matches to measure actual A win rate.
- `autoBalance()`: binary-searches `fairnessExp` in `[0.1, 10]` over 15 iterations of 600 matches each until 50% ± 1% A win rate.

**Delta:** +139 / −0, one new file.

---

### R5 — Scene Integration & Skill Removal (`1c20b61`)

**Scope:** The surgical removal of the skill system.
- Deleted `SkillResolver.ts` (287 lines) and `SpiritRegistry.ts` (56 lines).
- `spirits.json` stubbed (R5 build compat only; deleted in R6).
- `GameScene.ts` rewritten around `Formation` / `DamageDistributor` / `SlotEngine`, introduced `BattleConfig` interface, auto-battle loop, `BATTLE_CONFIG_UPDATED` handler.
- Added `FormationGridView.ts`: 3×3 Phaser.Graphics grid rendering all 8 symbol shapes (triangle / hexagon / square / cross / circle / heart / diamond / star) + HP bars + dead overlay.
- `FxManager.ts` cleaned of `SkillResolver` / `SpiritRegistry` imports.
- `EventNames.ts` updated: removed `SkillResolver` import, added `BATTLE_CONFIG_UPDATED` + `BattleConfigPayload` type.

**Delta:** +546 / −945 across 8 files (net −399, single largest cleanup commit).

---

### R6 — Draft Scene Rewrite (`5c59d26`)

**Scope:** Replaced spirit-based picker with symbol picker — 8 tiles in a 4×2 grid, A/B checkboxes per tile, GO button activates when both players hit 5 selections. Launches `GameScene` with `BattleConfig` (scales auto-calculated via `calculateScales`). `spirits.json` stub fully removed.

**Delta:** +254 / −713 (net −459) in one file.

---

### R7 — HTML Config Panel + Bridge (`e0e60ff`)

**Scope:** 1280px config panel below the Phaser canvas in `index.html`:
- Left / right columns for A/B (HP, Bet, Target RTP%, Target Dmg%, readonly scales).
- Middle section: payout base inputs, **Verify RTP** / **Simulate PvP** / **Auto Balance** buttons.
- Symbol table: 8 rows (name / weight / prob / A-coin / A-dmg / B-coin / B-dmg / P1 / P2 checkboxes).
- **Apply & Start** triggers `BATTLE_CONFIG_UPDATED` via bridge.

`window.__dualSlotsBridge` added to `main.ts`:
- `applyConfig()`: emits `BATTLE_CONFIG_UPDATED` to the Phaser EventBus.
- `simulatePvP()`: runs `simulateWinRate()`, returns `Promise<{winRateA}>`.
- `runAutoBalance()`: runs `autoBalance()`, pushes updated config back to the game.

**Delta:** +476 / −4 across 2 files.

---

### R7 Fix — Draft / Bridge Sync on Fresh Load (`f27fe4b`, PR #27)

**Root cause:** Bridge only emitted `BATTLE_CONFIG_UPDATED`, which `GameScene` listens for. On first page load `DraftScene` is active (GameScene not running yet), so the event fired into the void and selections never synced.

**Fix:**
- New event `DRAFT_CONFIG_OVERRIDE`; `DraftScene.create()` registers a listener that overwrites `selectedA` / `selectedB` Sets and auto-calls `_onGo()` (80ms repaint delay) when both sides reach 5.
- `SHUTDOWN` handler cleans up the listener to prevent leaks.
- Bridge `applyConfig()` now emits **both** events every call — only the active scene's listener is registered, the other fires harmlessly.
- `cpApplyAndStart()` re-reads DOM checkbox state before `buildConfig()` to guard against stale `selA` / `selB` Set state.
- Added 4-item test-plan checklist below the APPLY button in `index.html`.

**Delta:** +65 / −5 across 4 files.

---

### R8 — Auto-Balance Button UX (`12095d0`)

**Scope:** Enhance `cpAutoBalance()` in `index.html`.
- **Per-iteration progress display**: `iter 3/15  exp=2.150  win A: 54.3%`.
- **Self-contained JS simulation** (`cpRunAutoBalanceJS`): async with `setTimeout(0)` yield per iteration so the browser stays responsive during 15 × 600 match runs.
- Falls back to pure JS if `__dualSlotsBridge` unavailable (works without Phaser).
- Uses the Phaser bridge (TypeScript `autoBalance`) when available for full accuracy.
- Colour feedback: gold (`#f1c40f`) during run, green (`#5dd88a`) on success, red on error.

**Delta:** +124 / −17 in one file.

---

### R-Series Status & Open Items

- ✅ Foundation: symbol data, payline generation, battle core, scale solver, auto-battle scene.
- ✅ UI: draft scene (5-of-8 picker), HTML config panel with bridge, auto-balance button with progress feedback.
- ⚠️ **Documentation debt before R-series**: `AGENTS.md` still describes the skill-based agent contracts from the Foundation phase. `AUDIT_REPORT_M1.md` reflects the pre-R state. Both should be reviewed for currency.
- ⚠️ **Simulation re-baseline needed**: The T1.2 RTP measurements (167.95% / 56.36%) were taken on the imbalanced spirit roster. With symbol-based scale auto-balance, a fresh RTP / fairness sweep should be captured as the new baseline.
- ⚠️ **Stale feature branches on remote**: `claude/t1-*`, `claude/task-c-draft-scene`, `refactor/r1-*` through `refactor/r8-*`, `fix/r7-*` — most are already merged into `master`. Pruning pass scheduled.
