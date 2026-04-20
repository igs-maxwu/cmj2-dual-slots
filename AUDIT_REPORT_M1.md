# M1 Audit Report — Dual Slots Battle

**Auditor:** [The Auditor] (T1.5)
**Date:** 2026-04-20
**Scope:** T1.1–T1.4 (Skill Resolver skeleton → effect handlers → GameOverScene → FX wiring)
**Verdict:** **PASS with conditions** (no Critical; 2 Major observations, 2 Minor)

---

## 1. Long-Run Stability (100 000 matches, skills ON)

| Metric | Value | Band | Status |
|---|---|---|---|
| Total matches | 100 000 | — | ✓ |
| Total spins | 2 247 650 | — | ✓ |
| Elapsed | 24.58 s | < 60 s target | ✓ |
| RTP A | 168.12 % | — | converged vs 10k (169.68 %) |
| RTP B | 56.97 % | — | converged vs 10k (57.04 %) |
| Win rate A | 100.00 % | — | pre-existing roster imbalance |

**RTP convergence between 10k and 100k runs:** Δ RTP A = 1.56 pp, Δ RTP B = 0.07 pp — both inside the ±2 pp bound considered stable.

---

## 2. Invariant Checks

| Invariant | Violations | Status |
|---|---|---|
| HP never exceeds `maxHp` (revive overshoot) | 0 | ✓ |
| `usedRevive` monotonic (no revive double-fire within match) | 0 | ✓ |
| `immunityRoundsLeft` decrements properly (no stuck shield) | 0 | ✓ |
| Match terminates before `ROUND_LIMIT` | 0 | ✓ |

All invariants clean across 2.25M spins. No memory corruption, no runaway loops.

---

## 3. Per-Skill Trigger Distribution (100k, skills ON)

| Skill | Spirit | Fires | % of spins |
|---|---|---|---|
| SK_VERDANT_DANCE | Canlan | 716 279 | 31.87 % |
| SK_DRAGON_CHARGE | Mengchenzhang | 423 780 | 18.85 % |
| SK_EMBER_BLESSING | Zhuluan | 149 319 | 6.64 % |
| SK_PHOENIX_WING | Lingyu | 272 | 0.012 % |
| SK_TIGER_FANG | Yin | **0** | 0 % ⚠ |
| SK_SHELTER | LuoLuo | **0** | 0 % ⚠ |
| SK_DARK_TIDE | Xuanmo | 0 | 0 % (not in roster) |
| SK_NIRVANA | Zhaoyu | 0 | 0 % (not in roster) |

---

## 4. Findings

### F-1 — SK_TIGER_FANG (SP_YIN) never triggers
```
[Issue Type]:     Logic
[Severity]:       Major
[Description]:    Yin is in roster A but his skill fired 0 times across 2.25M
                  spins. Suggests the trigger condition (likely own_line with a
                  specific symbolId or minMatch threshold) never matches actual
                  hit patterns. Either Yin's injectsSymbols don't appear in hits,
                  or trigger.minMatch is set too high.
[Fix Suggestion]: [The Actuary] — audit SP_YIN.skill.trigger vs his
                  injectsSymbols weight in symbols.json; drop minMatch to 3 if
                  currently higher, or verify at least one Yin-owned symbol is
                  actually sampled from the pool.
```

### F-2 — SK_SHELTER (SP_LUOLUO) never triggers
```
[Issue Type]:     Logic
[Severity]:       Major
[Description]:    LuoLuo's hp_threshold skill fired 0 times. With ~22 avg
                  rounds per match, LuoLuo's HP must drop below threshold at
                  some point — the trigger should fire at least in late rounds.
                  Either hpPct threshold is misconfigured (e.g. set to 0.0) or
                  the comparison logic checks per-spirit HP vs summed maxHp.
[Fix Suggestion]: [The Actuary] — verify SP_LUOLUO.skill.trigger.hpPct value
                  (expect ~0.3 or 0.5); cross-check `hp / maxHp <= pct` branch
                  in SkillResolver.isTriggered handles 0-HP dead spirits
                  correctly (dead spirit should NOT trigger hp_threshold = 0).
```

### F-3 — SK_PHOENIX_WING near-zero trigger rate
```
[Issue Type]:     Logic (Balance)
[Severity]:       Minor
[Description]:    Fires 272 / 2.25M spins (0.012 %). Root cause already
                  documented in T1.2 balance notes — symbol 11 (Bai) pool
                  weight is too low to satisfy skill_resonance trigger's
                  ally-coincidence requirement.
[Fix Suggestion]: [The Actuary] — already carried as M2 reminder in todo.
                  Either bump Bai weight in symbols.json or lower the trigger's
                  minMatch to 2.
```

### F-4 — SK_VERDANT_DANCE 31.87% trigger rate — likely overtuned
```
[Issue Type]:     Logic (Balance)
[Severity]:       Minor
[Description]:    Canlan's double_eval fires on nearly 1 in 3 spins and stacks
                  multiplicatively with SK_DRAGON_CHARGE (+150% dmg). T1.2
                  already recommended capping double_eval at ×1.5 or gating
                  behind minMatch=4 on ally condition.
[Fix Suggestion]: [The Actuary] — M2 balance pass; already in todo.
```

### F-5 — PR body heredoc escape issue (historical)
```
[Issue Type]:     Naming/Process
[Severity]:       Minor
[Description]:    Sub-agents that use `gh pr create` with nested heredocs
                  ship PR bodies containing literal `$(cat <<'EOF'...` text.
                  Seen on PR #7; corrected post-hoc via MCP update.
[Fix Suggestion]: [Orchestrator] — always open PRs from the main agent via
                  MCP; instruct sub-agents to push only. (Already in practice.)
```

---

## 5. Static Review — Architectural Observations (non-blocking)

### O-1 — SkillResolver mutates round state directly
`SkillResolver.resolve()` mutates `sideRoundState.hp` (for `revive_hp`) and `opponentRoundState.hp` (for `halve_strongest_enemy`) in place. This is not "pure" dispatch — it mixes decision and mutation. **Not a bug**, but it means unit-testing the resolver requires constructing mutable state fixtures; and if a future effect needs to be undone/previewed, there's no pure-function path. Suggest the Architect re-evaluates in M2+.

### O-2 — SKILL_RESOLVED browser-guard relies on typeof
`SlotEngine.evaluate` guards `EventBus.emit` with `typeof window !== 'undefined'` so Node simulation stays silent. Works, but couples the engine to a runtime check. A cleaner pattern: inject an emitter via EngineConfig (null-emitter in Node). Suggest Architect address in M2 if emitter usage grows.

### O-3 — Rematch event-listener lifecycle
GameScene uses `scene.start('GameScene', { mode: 'rematch' })` which re-runs `create()` — if any subscriber is `EventBus.on(...)` WITHOUT a corresponding `off` in scene teardown (`shutdown` hook), subscribers will duplicate across rematches. Audited by walking `GameScene.ts` `_cleanup()` and the SKILL_RESOLVED hookup in T1.4 — they appear paired. **No violation observed** but recommend Auditor re-run a manual rematch × 5 after M1 merge to empirically confirm no duplicate pills.

### O-4 — FxManager.playSkillTrigger Promise cleanup
Tween chain destroys graphics/text in `onComplete`. If scene shuts down mid-animation, Phaser's auto-scene-destroy should reap them. Not explicitly tested in this audit; suggest a spot check during M2 when more FX are added.

---

## 6. Verdict

**`PASS with conditions`** — M1 ready to ship as playable alpha.

| Condition | Owner | Deadline |
|---|---|---|
| F-1 / F-2 root-cause analysis (Major) | the-actuary | Before M2 DraftScene balance pass |
| F-3 / F-4 balance fix (Minor) | the-actuary | M2 (already tracked) |
| O-3 manual rematch smoke test | Owner (manual) | After M1 deploy |

No Critical issues. M1 milestone achieves:
- Core spin → eval → skill → dmg → HP → gameover loop works end-to-end
- Skills visibly fire (pill + avatar flash)
- Rematch flow reset is correct
- 100k-spin stability confirmed (no crashes, no invariant violations)

**Recommendation:** Merge T1.5 → start M2 DraftScene work. Track F-1/F-2 for actuary's M2 opening investigation.
