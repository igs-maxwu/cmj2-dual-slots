/**
 * [The Actuary] — Skill Resolver (T1.2).
 *
 * Pure-TS dispatch layer that turns triggered SpiritSkills into a
 * normalized, engine-neutral list of effect descriptors. This module
 * also owns the mutation of round-state that *precedes* damage / coin
 * calculation (immunity counters, revive bookkeeping, enemy-HP halving).
 * The actual final damage / coin multiplication is performed in
 * SlotEngine.evaluateSide which consumes the ResolvedEffect list.
 *
 * Zero Phaser / DOM imports: this module must remain unit-testable from
 * Node and reusable by the simulation harness.
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
  /** Current HP of each spirit in the side's roster (same order as roster). */
  hp: number[];
  /** Max HP of each spirit in the side's roster. */
  maxHp: number[];
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
  /**
   * HP each spirit on the acting side had *before* any damage this round —
   * used to detect the alive→dead transition needed by `on_death` triggers.
   * Same order as sideRoster; same length.
   */
  prevSideHp: number[];
}

// ─── Resolved effect output ──────────────────────────────────────────────────

/**
 * Union of every effect.type found in spirits.json plus the reserved
 * `refund_bet` variant declared on SlotEngine.SkillEffect.
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

// ─── Helpers ─────────────────────────────────────────────────────────────────

/**
 * The hit-line "owner" is a spirit whose injectsSymbols contains the
 * line's anchor symbol. A symbol can be injected by multiple spirits —
 * we say the line is owned by *any* matching spirit.
 */
function isLineOwnedBy(spirit: SpiritDef, line: HitLine): boolean {
  return spirit.injectsSymbols.includes(line.symbolId);
}

function anyHitOwnedBy(spirit: SpiritDef, hitLines: HitLine[], minMatch: number): boolean {
  return hitLines.some(l => isLineOwnedBy(spirit, l) && l.matchCount >= minMatch);
}

// ─── Trigger matching ────────────────────────────────────────────────────────

/**
 * Decides whether a skill's trigger condition is satisfied by the
 * current context. Each branch is config-driven via the skill's
 * trigger descriptor — no hardcoded thresholds.
 */
function isTriggered(spirit: SpiritDef, skill: SpiritSkill, ctx: SkillContext): boolean {
  const { trigger } = skill;
  switch (trigger.type) {
    case 'own_line': {
      const minMatch = trigger.minMatch ?? 3;
      return anyHitOwnedBy(spirit, ctx.hitLines, minMatch);
    }
    case 'ally_same_element': {
      // Count distinct allied spirits of the same element that own at least one hit line.
      const needed = trigger.count ?? 2;
      const matching = ctx.sideRoster.filter(
        ally => ally.element === spirit.element &&
                anyHitOwnedBy(ally, ctx.hitLines, 3),
      );
      return matching.length >= needed;
    }
    case 'symbol_match': {
      const minMatch = trigger.minMatch ?? 3;
      const symbolId = trigger.symbolId;
      if (symbolId === undefined) return false;
      return ctx.hitLines.some(l => l.symbolId === symbolId && l.matchCount >= minMatch);
    }
    case 'hp_threshold': {
      const pct = trigger.hpPct ?? 0;
      const idx = ctx.sideRoster.findIndex(s => s.id === spirit.id);
      if (idx < 0) return false;
      const hp    = ctx.sideRoundState.hp[idx];
      const maxHp = ctx.sideRoundState.maxHp[idx];
      if (!(hp > 0) || !(maxHp > 0)) return false;
      return hp / maxHp <= pct;
    }
    case 'on_death': {
      const idx = ctx.sideRoster.findIndex(s => s.id === spirit.id);
      if (idx < 0) return false;
      const wasAlive = ctx.prevSideHp[idx] > 0;
      const nowDead  = ctx.sideRoundState.hp[idx] <= 0;
      if (!(wasAlive && nowDead)) return false;
      // Honour `once: true` — consumed here so caller doesn't double-fire.
      if (trigger.once && ctx.sideRoundState.usedRevive.has(spirit.id)) return false;
      return true;
    }
    default: {
      const _exhaustive: never = trigger.type;
      return _exhaustive;
    }
  }
}

// ─── Resolver core ───────────────────────────────────────────────────────────

/**
 * Iterate the acting side's roster, test each skill's trigger, and
 * emit a ResolvedEffect for every skill that fires. Also performs
 * pre-damage state mutations (immunity bookkeeping, revive HP restore,
 * enemy HP halving) so that SlotEngine's damage / coin math afterwards
 * sees an up-to-date world.
 */
export function resolve(context: SkillContext): ResolvedEffects {
  const out: ResolvedEffects = [];

  for (const spirit of context.sideRoster) {
    const skill = spirit.skill;
    if (!isTriggered(spirit, skill, context)) continue;

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
        // Consumed by SlotEngine: totalDmg *= (1 + base.value).
        out.push(base);
        break;

      case 'coin_bonus':
        // Consumed by SlotEngine: totalCoin *= (1 + base.value).
        out.push(base);
        break;

      case 'double_eval':
        // Consumed by SlotEngine: final dmg & coin multiplied by 2.
        // Only one layer — skills do NOT re-trigger from this pass.
        out.push(base);
        break;

      case 'pierce_formation':
        // Consumed by SlotEngine: tags outgoing damage as ignoring the
        // front-row soak. Value (optional) scales pierced damage;
        // fallback to 1 = pure retarget with no dmg change.
        out.push(base);
        break;

      case 'refund_bet':
        // Consumed by game layer / simulation: this round's bet is refunded.
        out.push(base);
        break;

      case 'dmg_immunity': {
        const dur = base.duration ?? 0;
        // Immunity stacks to the larger of (current, new) so a fresh
        // trigger never shortens an already-active shield.
        if (dur > context.sideRoundState.immunityRoundsLeft) {
          context.sideRoundState.immunityRoundsLeft = dur;
        }
        out.push(base);
        break;
      }

      case 'skill_resonance':
        // Consumed by SlotEngine: if any other ally skill fires this
        // round, damage gets a (1 + base.value) bonus. base.value read
        // from spirits.json (default 0 → no bonus).
        out.push(base);
        break;

      case 'halve_strongest_enemy': {
        // Mutate opponent HP directly: find highest-HP alive enemy and halve it.
        const oppHp = context.opponentRoundState.hp;
        let targetIdx = -1;
        let topHp = -1;
        for (let i = 0; i < oppHp.length; i++) {
          if (oppHp[i] > 0 && oppHp[i] > topHp) {
            topHp = oppHp[i];
            targetIdx = i;
          }
        }
        if (targetIdx >= 0) {
          oppHp[targetIdx] = Math.floor(oppHp[targetIdx] / 2);
        }
        out.push(base);
        break;
      }

      case 'revive_hp': {
        // on_death trigger passed → restore to fraction of maxHp and mark used.
        const idx = context.sideRoster.findIndex(s => s.id === spirit.id);
        if (idx >= 0) {
          const frac   = base.value ?? 0;
          const maxHp  = context.sideRoundState.maxHp[idx];
          context.sideRoundState.hp[idx] = Math.max(1, Math.floor(maxHp * frac));
          context.sideRoundState.usedRevive.add(spirit.id);
        }
        out.push(base);
        break;
      }

      default: {
        const _exhaustive: never = skill.effect.type;
        return _exhaustive;
      }
    }
  }

  return out;
}
