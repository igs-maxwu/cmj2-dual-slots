/**
 * [The Architect] — Skill Resolver skeleton (T1.1).
 *
 * Pure-TS dispatch layer that turns triggered SpiritSkills into a
 * normalized, engine-neutral list of effect descriptors. The actual
 * mutation of HP / damage / coins is intentionally NOT done here —
 * that is [The Actuary]'s job in T1.2.
 *
 * Zero Phaser / DOM imports: this module must remain unit-testable
 * from Node and reusable by the simulation harness.
 */

import type {
  HitLine,
  Side,
  SpiritDef,
  SpiritSkill,
} from './SlotEngine';

// ─── Round-scoped state (mirror of SlotEngine.RoundState) ───────────────────

/**
 * Per-side runtime state carried across rounds. Mirrors SlotEngine's
 * RoundState structurally so this module avoids a circular import of
 * the concrete type.
 */
export interface SideRoundState {
  /** Spirit IDs that have already consumed their `once: true` revive trigger. */
  usedRevive: Set<string>;
  /** Rounds of incoming-damage immunity remaining (0 = not immune). */
  immunityRoundsLeft: number;
}

// ─── Context passed into the resolver ────────────────────────────────────────

/**
 * Snapshot of everything the resolver needs to decide which skills fired.
 * Assembled by SlotEngine.evaluateSide before dispatch.
 */
export interface SkillContext {
  /** Which side ('A' | 'B') these hits belong to. */
  side: Side;
  /** The hit lines produced by evaluateSide for this side this spin. */
  hitLines: HitLine[];
  /** Full spirit roster for the acting side (owner of the skills). */
  sideRoster: SpiritDef[];
  /** Full spirit roster for the opposing side (for enemy-targeted effects). */
  opponentRoster: SpiritDef[];
  /** Mutable round-state belonging to the acting side. */
  sideRoundState: SideRoundState;
  /** Mutable round-state belonging to the opposing side. */
  opponentRoundState: SideRoundState;
}

// ─── Resolved effect output ──────────────────────────────────────────────────

/**
 * Union of every effect.type found in spirits.json plus the reserved
 * `refund_bet` variant declared on SlotEngine.SkillEffect. T1.2 will
 * flesh out the actual behaviour for each case.
 */
export type ResolvedEffectType =
  | 'dmg_bonus'
  | 'coin_bonus'
  | 'double_eval'
  | 'pierce_formation'
  | 'refund_bet'
  | 'dmg_immunity'
  | 'skill_resonance'
  | 'halve_strongest_enemy'
  | 'revive_hp';

/**
 * Engine-neutral descriptor of a single triggered effect. Consumers
 * (SlotEngine, BattleLog, FX) read these without needing SpiritSkill.
 */
export interface ResolvedEffect {
  /** Source skill id (e.g. 'SK_DRAGON_CHARGE'). */
  skillId: string;
  /** Owning spirit id (e.g. 'SP_MENGCHENZHANG'). */
  spiritId: string;
  /** Side that produced this effect. */
  side: Side;
  /** Categorized effect kind — matches SpiritSkill.effect.type. */
  type: ResolvedEffectType;
  /** Optional numeric magnitude (multiplier, pct, etc.) passed through from config. */
  value?: number;
  /** Optional duration in rounds (for buffs / immunity). */
  duration?: number;
}

/** Ordered collection of all effects fired by one side in one round. */
export type ResolvedEffects = ResolvedEffect[];

// ─── Trigger matching (skeleton) ─────────────────────────────────────────────

/**
 * Decides whether a skill's trigger condition is satisfied by the
 * current context. Intentionally minimal in T1.1; T1.2 will expand
 * each branch with real predicates.
 */
function isTriggered(skill: SpiritSkill, _ctx: SkillContext): boolean {
  const { trigger } = skill;
  switch (trigger.type) {
    case 'own_line':
      // TODO(T1.2): check ctx.hitLines for any line with matchCount >= trigger.minMatch
      //             owned by the skill's spirit (via injectsSymbols).
      return false;
    case 'ally_same_element':
      // TODO(T1.2): count distinct allied spirits of the same element that hit.
      return false;
    case 'symbol_match':
      // TODO(T1.2): look for a hit line on trigger.symbolId with matchCount >= minMatch.
      return false;
    case 'hp_threshold':
      // TODO(T1.2): read spirit's current HP share vs trigger.hpPct.
      return false;
    case 'on_death':
      // TODO(T1.2): check if the spirit died this round and (if once) hasn't already revived.
      return false;
    default: {
      // Exhaustiveness guard — if a new trigger type is added upstream the
      // compiler will flag this cast.
      const _exhaustive: never = trigger.type;
      return _exhaustive;
    }
  }
}

// ─── Resolver core ───────────────────────────────────────────────────────────

/**
 * Iterate the acting side's roster, test each skill's trigger, and
 * emit a ResolvedEffect for every skill that fires. In T1.1 no skill
 * actually fires — every case is a stub. T1.2 wires real predicates
 * and per-type neutral defaults here.
 */
export function resolve(context: SkillContext): ResolvedEffects {
  const out: ResolvedEffects = [];

  for (const spirit of context.sideRoster) {
    const skill = spirit.skill;
    if (!isTriggered(skill, context)) continue;

    const base: ResolvedEffect = {
      skillId:  skill.id,
      spiritId: spirit.id,
      side:     context.side,
      type:     skill.effect.type,
      value:    skill.effect.value,
      duration: skill.effect.duration,
    };

    switch (skill.effect.type) {
      case 'dmg_bonus':
        // TODO(T1.2): implement — multiply this round's dmg by base.value.
        out.push(base);
        break;
      case 'coin_bonus':
        // TODO(T1.2): implement — multiply this round's coinWon by base.value.
        out.push(base);
        break;
      case 'double_eval':
        // TODO(T1.2): implement — request SlotEngine to apply hitLines twice.
        out.push(base);
        break;
      case 'pierce_formation':
        // TODO(T1.2): implement — retarget damage past the front live unit.
        out.push(base);
        break;
      case 'refund_bet':
        // TODO(T1.2): implement — refund this round's bet to the side's balance.
        out.push(base);
        break;
      case 'dmg_immunity':
        // TODO(T1.2): implement — set sideRoundState.immunityRoundsLeft = base.duration.
        out.push(base);
        break;
      case 'skill_resonance':
        // TODO(T1.2): implement — re-enter resolve() forcing every allied skill to fire.
        out.push(base);
        break;
      case 'halve_strongest_enemy':
        // TODO(T1.2): implement — halve HP of the highest-HP living opponent spirit.
        out.push(base);
        break;
      case 'revive_hp':
        // TODO(T1.2): implement — revive spirit at base.value fraction of baseHp; mark usedRevive.
        out.push(base);
        break;
      default: {
        const _exhaustive: never = skill.effect.type;
        return _exhaustive;
      }
    }
  }

  return out;
}
