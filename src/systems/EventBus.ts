import Phaser from 'phaser';

/**
 * Global singleton EventBus.
 * Decouples game logic (Actuary) from visual presentation (Illusionist).
 *
 * @example
 * // Emit
 * EventBus.emit(EventNames.WIN_RESULT, { amount: 500 });
 * // Listen
 * EventBus.on(EventNames.WIN_RESULT, ({ amount }) => { ... });
 */
export const EventBus = new Phaser.Events.EventEmitter();
