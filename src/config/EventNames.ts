/**
 * Central registry for all EventBus event names.
 * All Agents must import from here — no magic strings allowed.
 */
export const EventNames = {
  // FSM state transitions
  FSM_CHANGE_STATE: 'fsm:changeState',

  // Game flow
  SPIN_REQUESTED:    'game:spinRequested',
  SPIN_STARTED:      'game:spinStarted',
  SPIN_STOPPED:      'game:spinStopped',
  REMATCH_REQUESTED: 'game:rematchRequested',

  // Result pipeline
  WIN_RESULT:       'result:win',
  LOSE_RESULT:      'result:lose',

  // UI state updates
  BET_CHANGED:      'ui:betChanged',
  BALANCE_UPDATED:  'ui:balanceUpdated',
  HP_UPDATED:       'ui:hpUpdated',       // { side, unitIndex, hp, maxHp }
  UNIT_DIED:        'ui:unitDied',         // { side, unitIndex }
  BATTLE_LOG:       'ui:battleLog',        // { text, color }
  ROUND_UPDATED:    'ui:roundUpdated',     // { round }
  SKILL_TRIGGERED:  'ui:skillTriggered',   // { side, skillName }

  // Skill pipeline (produced by [The Architect] SkillResolver, consumed in T1.2+)
  SKILL_RESOLVED:   'skill:resolved',       // payload: SkillResolvedPayload

  // FX triggers (consumed by [The Illusionist])
  FX_WIN_CELEBRATION: 'fx:winCelebration',
  FX_REEL_STOP:       'fx:reelStop',

  // Draft scene
  DRAFT_COMPLETE:     'scene:draftComplete',
} as const;

export type EventName = typeof EventNames[keyof typeof EventNames];

// ─── Payload types ───────────────────────────────────────────────────────────

import type { ResolvedEffects } from '@/systems/SkillResolver';
import type { Side } from '@/systems/SlotEngine';

/** Payload emitted with EventNames.SKILL_RESOLVED after evaluateSide runs. */
export interface SkillResolvedPayload {
  /** Which side these effects belong to. */
  side:    Side;
  /** Round counter (1-indexed) when the skills fired. */
  round:   number;
  /** The resolved effects produced by SkillResolver.resolve(). */
  effects: ResolvedEffects;
}
