import Phaser from 'phaser';
import { CANVAS_WIDTH, CANVAS_HEIGHT } from '@/config/GameConfig';
import { BootScene }     from '@/scenes/BootScene';
import { PreloadScene }  from '@/scenes/PreloadScene';
import { MainMenuScene } from '@/scenes/MainMenuScene';
import { DraftScene }    from '@/scenes/DraftScene';
import { GameScene }     from '@/scenes/GameScene';
import type { BattleConfig } from '@/scenes/GameScene';
import { GameOverScene } from '@/scenes/GameOverScene';
import { EventBus } from '@/systems/EventBus';
import { EventNames } from '@/config/EventNames';
import { SYMBOLS } from '@/config/SymbolsConfig';
import { simulateWinRate, autoBalance, calculateScales } from '@/systems/ScaleCalculator';
import { buildUnionPool, totalWeight } from '@/systems/SymbolPool';

const config: Phaser.Types.Core.GameConfig = {
  type: Phaser.AUTO,
  width: CANVAS_WIDTH,
  height: CANVAS_HEIGHT,
  backgroundColor: '#061a33',   // --sea-abyss
  scene: [BootScene, PreloadScene, MainMenuScene, DraftScene, GameScene, GameOverScene],
  parent: document.body,
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
  },
};

/**
 * Gate Phaser startup behind `document.fonts.ready` so the calligraphy,
 * Cinzel and Noto Serif faces are decoded before the first text paint.
 * Phaser WebGL caches text textures on first render — if the face is not
 * loaded at that moment, the fallback is burned in and never refreshes.
 */
const bootFonts = (): Promise<void> =>
  document.fonts && typeof document.fonts.ready?.then === 'function'
    ? document.fonts.ready.then(() => void 0)
    : Promise.resolve();

bootFonts().then(() => {
  new Phaser.Game(config);

  // ── Config panel bridge ──────────────────────────────────────────────────────
  // Exposes typed callbacks so the vanilla-JS config panel can communicate
  // with Phaser without a build step.
  (window as unknown as Record<string, unknown>).__dualSlotsSymbols = SYMBOLS;

  (window as unknown as Record<string, unknown>).__dualSlotsBridge = {
    /** Push a new BattleConfig into the running Phaser scene.
     *
     * Routing:
     *  - If GameScene is active  → BATTLE_CONFIG_UPDATED hot-reloads the battle.
     *  - If DraftScene is active → DRAFT_CONFIG_OVERRIDE pre-fills selections
     *    and auto-transitions to GameScene once both sides have ≥5 picks.
     *
     * Emitting both events every call is intentional — only the active scene's
     * listener is registered at any given time, so the other fires into the void.
     */
    applyConfig: (cfg: BattleConfig) => {
      EventBus.emit(EventNames.BATTLE_CONFIG_UPDATED, cfg);
      EventBus.emit(EventNames.DRAFT_CONFIG_OVERRIDE, {
        selectedA: cfg.selectedA,
        selectedB: cfg.selectedB,
      });
    },

    /** Run N matches and return A win rate. Returns Promise<{winRateA}> */
    simulatePvP: (cfg: BattleConfig, matches = 200): Promise<{ winRateA: number }> => {
      return new Promise(resolve => {
        // Run on next tick to avoid blocking the main thread
        setTimeout(() => {
          const rate = simulateWinRate(
            cfg.selectedA, cfg.selectedB,
            cfg.coinScaleA, cfg.dmgScaleA,
            cfg.coinScaleB, cfg.dmgScaleB,
            cfg.fairnessExp,
            cfg.teamHpA, cfg.teamHpB,
            cfg.betA, cfg.betB,
            matches,
          );
          resolve({ winRateA: rate });
        }, 0);
      });
    },

    /** Auto-balance fairnessExp. Returns Promise<{fairnessExp, finalWinRate}> */
    runAutoBalance: (cfg: BattleConfig): Promise<{ fairnessExp: number; finalWinRate: number }> => {
      return new Promise(resolve => {
        setTimeout(() => {
          const result = autoBalance(
            cfg.selectedA, cfg.selectedB,
            cfg.teamHpA, cfg.teamHpB,
            cfg.betA, cfg.betB,
          );
          // Recalculate scales with new fairnessExp and push to game
          const pool = buildUnionPool(cfg.selectedA, cfg.selectedB, SYMBOLS);
          const tw   = totalWeight(pool);
          const scA  = calculateScales(97, 300, cfg.selectedA, tw, result.fairnessExp);
          const scB  = calculateScales(97, 300, cfg.selectedB, tw, result.fairnessExp);
          const updatedCfg: BattleConfig = {
            ...cfg,
            fairnessExp: result.fairnessExp,
            coinScaleA:  scA.coinScale,
            dmgScaleA:   scA.dmgScale,
            coinScaleB:  scB.coinScale,
            dmgScaleB:   scB.dmgScale,
          };
          EventBus.emit(EventNames.BATTLE_CONFIG_UPDATED, updatedCfg);
          resolve(result);
        }, 0);
      });
    },
  };
});
