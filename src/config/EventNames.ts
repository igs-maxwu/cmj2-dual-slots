/**
 * Central registry for all EventBus event names.
 * All Agents must import from here — no magic strings allowed.
 */
export const EventNames = {
  // FSM state transitions
  FSM_CHANGE_STATE: 'fsm:changeState',

  // Game flow
  SPIN_REQUESTED:   'game:spinRequested',
  SPIN_STARTED:     'game:spinStarted',
  SPIN_STOPPED:     'game:spinStopped',

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

  // FX triggers (consumed by [The Illusionist])
  FX_WIN_CELEBRATION: 'fx:winCelebration',
  FX_REEL_STOP:       'fx:reelStop',
} as const;

export type EventName = typeof EventNames[keyof typeof EventNames];
