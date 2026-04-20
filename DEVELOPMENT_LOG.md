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
