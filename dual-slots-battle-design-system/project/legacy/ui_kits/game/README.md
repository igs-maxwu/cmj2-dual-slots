# UI Kit — In-Game

High-fidelity HTML/React recreation of the Phaser `GameScene`. The Phaser implementation lives at `ClaudeAI/DualSlot/src/scenes/GameScene.ts` and is the source of truth; this kit is a cosmetic mirror for mockups, marketing shots, and Stylist-protocol Design-First work (see `AGENTS.md §3.5`).

**Canvas is fixed 1280×720.** The scale transform is handled by the page; all child components use absolute pixel layout that matches `DesignTokens.ts::LAYOUT`.

## Components
- `PlayerPanel.jsx` — side column with PLAYER badge, 3×3 FormationGrid, coin/bet/DMG/skill readouts.
- `FormationGrid.jsx` — 3×3 cells of 52px, populated left→right top→bottom.
- `ReelGrid.jsx` — gold-bordered 4×5 reel with corner accent dots.
- `SpinButton.jsx` — four-mode bottom-center button.
- `BattleLog.jsx` — letterboxed 4-line log.
- `Hud.jsx` — arena header (VS label, ROUND counter, top separator).

## Interactions
- Click **START BATTLE** → reel tiles shuffle (2s fake spin) → a random side deals a damage float → round counter ticks → button returns to idle.
- Click the reel while idle for an ad-hoc shake.
- No real game math; just visual fidelity.
