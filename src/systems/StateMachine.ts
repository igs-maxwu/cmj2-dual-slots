import { EventBus } from './EventBus';
import { EventNames } from '@/config/EventNames';

/** All valid FSM states for the game lifecycle. */
export type GameState =
  | 'BOOT'
  | 'PRELOAD'
  | 'MAIN_MENU'
  | 'GAME_IDLE'
  | 'GAME_SPINNING'
  | 'GAME_EVALUATING'
  | 'GAME_OVER';

/** Allowed state transitions. Guards against illegal jumps. */
const TRANSITIONS: Readonly<Record<GameState, GameState[]>> = {
  BOOT:             ['PRELOAD'],
  PRELOAD:          ['MAIN_MENU'],
  MAIN_MENU:        ['GAME_IDLE'],
  GAME_IDLE:        ['GAME_SPINNING'],
  GAME_SPINNING:    ['GAME_EVALUATING'],
  GAME_EVALUATING:  ['GAME_IDLE', 'GAME_OVER'],
  GAME_OVER:        ['MAIN_MENU', 'GAME_IDLE'],
};

/**
 * Finite State Machine governing the game lifecycle.
 * Emits `FSM_CHANGE_STATE` on every valid transition.
 */
export class StateMachine {
  private current: GameState = 'BOOT';

  /** @returns The current active state. */
  getState(): GameState {
    return this.current;
  }

  /**
   * Attempt a state transition.
   * @param next - Target state to transition into.
   * @throws If the transition is not permitted.
   */
  transition(next: GameState): void {
    const allowed = TRANSITIONS[this.current];
    if (!allowed.includes(next)) {
      throw new Error(`[FSM] Illegal transition: ${this.current} → ${next}`);
    }
    const prev = this.current;
    this.current = next;
    EventBus.emit(EventNames.FSM_CHANGE_STATE, { prev, next });
    console.log(`[FSM] ${prev} → ${next}`);
  }
}

/** Shared FSM instance — import and use across all scenes. */
export const fsm = new StateMachine();
