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

  // Config panel bridge (R7)
  BATTLE_CONFIG_UPDATED:  'config:battleConfigUpdated',
  /** Emitted by the HTML panel APPLY & START button when DraftScene is active.
   *  Payload: { selectedA: number[]; selectedB: number[] }
   *  DraftScene overwrites its selection state and auto-starts the battle. */
  DRAFT_CONFIG_OVERRIDE:  'config:draftConfigOverride',
} as const;

export type EventName = typeof EventNames[keyof typeof EventNames];

// ─── Payload types ───────────────────────────────────────────────────────────

export type { Side } from '@/systems/SlotEngine';

/** @deprecated Skills removed in R5. Kept for any stale import references. */
export interface SkillResolvedPayload {
  side:    'A' | 'B';
  round:   number;
  effects: unknown[];
}

/** Config applied via the HTML control panel bridge. */
export interface BattleConfigPayload {
  selectedA:   number[];
  selectedB:   number[];
  teamHpA:     number;
  teamHpB:     number;
  betA:        number;
  betB:        number;
  coinScaleA:  number;
  dmgScaleA:   number;
  coinScaleB:  number;
  dmgScaleB:   number;
  fairnessExp: number;
}
