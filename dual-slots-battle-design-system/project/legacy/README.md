# Dual Slots Battle — Design System

> A high-fidelity brand & UI kit for **Dual Slots Battle** (雙轉對戰): a 1v1 slot-machine-meets-autobattler prototype from the CMJ2 / IGS team. Eight legendary spirits grouped under the Four Beasts (四靈) clash on a shared 4×5 reel — match tiles, trigger skills, deal damage.

## Source material

| Source | Path | Notes |
|---|---|---|
| Production codebase | `ClaudeAI/DualSlot/` (local mount) | Phaser 3 + TypeScript + Vite. This is the source of truth for tokens, layout, copy, and FX timings. |
| Agent brief | `ClaudeAI/DualSlot/AGENTS.md` | Defines the "Visionary / Architect / Actuary / Stylist / Illusionist / Sculptor / Auditor" specialist roster and the Design-First protocol. |
| Spirit roster | `ClaudeAI/DualSlot/src/config/spirits.json` | 8 spirits × 4 beasts × 2 genders — rarity R / SR / SSR. |
| Reel symbols | `ClaudeAI/DualSlot/src/config/symbols.json` | 13 symbols (Man / Pin / Sou / Honor / Wild) with color and shape mapping. |
| Design tokens | `ClaudeAI/DualSlot/src/config/DesignTokens.ts` | Ported verbatim into `colors_and_type.css`. |
| GitHub mirror | `igs-maxwu/cmj2-dual-slots@master` | Matches the local mount. |

The broader `ClaudeAI/` mount also contains the CMJ2 (中麻雀2 / Chinese Mahjong 2) operations wiki, knowledge base, and monthly reports — those are the parent product for which Dual Slots Battle is a new spin-off prototype. This design system focuses on the **Dual Slots Battle** surface.

## Product summary

**What it is.** A 1v1 PvP slot-machine. Both players share the same 4×5 reel. Each round, both sides spin the same grid and are scored *independently* against their own team's paylines. A round produces coins earned, damage dealt, and skill triggers that cascade through formation units. First team wiped loses.

**Who the characters are.** Eight "Spirits" (靈) organized by the Four Beasts of ancient Chinese cosmology:

| Beast | Element | Male | Female |
|---|---|---|---|
| 青龍 AzureDragon | Sou (索 — bamboo / green) | 孟辰璋 Meng Chenzhang (SR) | 蒼嵐 Cang Lan (R) |
| 白虎 WhiteTiger | Man (萬 — character / red) | 寅 Yin (SR) | 珞洛 Luo Luo (R) |
| 朱雀 VermilionBird | Honor (字牌 — yellow/white) | 凌羽 Ling Yu (SSR) | 朱鸞 Zhu Luan (SR) |
| 玄武 BlackTortoise | Pin (筒 — coin / blue) | 玄墨 Xuan Mo (SSR) | 朝雨 Zhao Yu (R) |

**What's on the screen.** Left/right side panels (each ~165px wide, hosting a PLAYER badge, a 3×3 FormationGrid, coin + bet + DMG readouts, and a skill ticker) flank a center column containing the gold-bordered 4×5 reel, a VS marquee, a ROUND counter, and — at the bottom — a BattleLog ribbon plus the orange START BATTLE / SPINNING / REMATCH button.

---

## Index

| File | Purpose |
|---|---|
| `README.md` | This document. |
| `colors_and_type.css` | Design tokens — CSS custom properties + semantic classes. |
| `SKILL.md` | Agent-Skills-compatible entry point for Claude Code. |
| `fonts/` | (empty — web fonts loaded via Google CDN import; see Typography below.) |
| `assets/spirits/` | Eight 512px spirit portraits (the hero art). |
| `assets/logos/` | Wordmarks + four-beasts monogram mark. |
| `assets/symbols/` | Reel tile symbols drawn from the `symbols.json` palette. |
| `preview/` | Small HTML cards — palette, type, components, icons — register in the Design System tab. |
| `ui_kits/game/` | React recreation of the Phaser game surface (1280×720) as clickable HTML. |
| `ui_kits/marketing/` | Landing-page style kit for title / roster / features. |

---

## CONTENT FUNDAMENTALS

The in-game voice is **terse, uppercase, and combatant**. Everything the player sees is short enough to render at 13–20px on a 1280-wide canvas without wrapping.

### Casing & mechanics

- **Tactical chrome** uses ALL-CAPS: `PLAYER A`, `START BATTLE`, `SPINNING...`, `REMATCH`, `ROUND 0`, `VS`, `COIN`, `BET: $100`, `DMG: 340`.
- **Data readouts** read like a HUD, not a sentence: `$1,000`, `BET: $10`, `DMG: 450`. Dollar sign is retained even though the currency is in-game coin. Numbers are `toLocaleString()`-formatted so thousands get commas.
- **Battle log** is third-person, present tense, abbreviated: `A hits 340 DMG (3 lines)`. No punctuation at line ends. Victory copy uses a star glyph: `★ PLAYER A WINS!`, `★ DRAW — mutual destruction!`.
- **Skill callouts** prepend a star: `★ Dragon Charge`, `★ Phoenix Wing`. Skill names are proper-case English; skill descriptions are single-sentence imperative: *"On 4+ match: deal 50% bonus damage this round."*

### Persona & pronouns

- The game **does not address the player directly**. There is no "you," no tutorial voice, no helpful tooltips. Players are `A` and `B` — positional, neutral, competitive.
- Spirits have Chinese names first (`蒼嵐`) with pinyin fallback (`Cang Lan`). Beasts use English constants (`AzureDragon`, `WhiteTiger`, `VermilionBird`, `BlackTortoise`).
- No emoji in UI. Only typographic glyphs: `★` (win / skill), `✕` (dead unit), `$` (coin).

### Mythic register (marketing / splash copy)

When copy steps outside the HUD (title screen, roster page, trailers), register shifts to **short, mythic, declarative**. Keep the cadence of a fighting-game announcer:

- "Eight spirits. Four beasts. One reel."
- "The dragon charges."
- "Match. Strike. Survive."
- Avoid flowery adjectives. Avoid exclamation marks except on victory screens. No second person.

### Agent-role tone (internal docs only)

Internal files use the bracketed-role convention from AGENTS.md: `[The Stylist] owns pixel layout.`, `[The Actuary] owns payout math.` This shouldn't leak into user-facing copy but is preserved in code comments and PR descriptions.

---

## VISUAL FOUNDATIONS

### Color

The palette is a **cool navy base** punctuated by two team colors (cerulean blue `#3498db` for A, vermilion red `#e74c3c` for B) and one gilded accent (`#f1c40f`) reserved for the reel frame and coin readouts. Semantic colors (HP green/orange/red, button orange) are drawn from the Flat UI palette — recognizable, saturated, and friendly to dark-mode backgrounds.

- **Backgrounds** layer from darkest (`--bg-reel #0d0d1a`) inward through `--bg #0f0f1a` to the panel fill `--bg-panel #1a1a2e` and individual cells `--bg-cell #16213e`. No gradients. Depth is communicated by stepping through four hand-tuned navies, not by blurs.
- **Borders** carry meaning. Default cell borders are `#334466` (1px). Team borders (`#3498db` / `#e74c3c`) are 2px. The reel frame alone uses gold (`#f1c40f`, 2px) with four corner accent dots — this is the one "wrapped gift" element on screen.
- **Imagery** — the 8 spirit portraits are bright, saturated anime-style 2.5D renders on **pure white backgrounds**, originally produced as 3D chibi figures with a 1:2 head-to-body ratio, facing LEFT, NO base, glossy vinyl material. They are never tinted; the white clips naturally against the dark `#16213e` cell. No grain, no vignette, warm mid-saturation coloring.

### Typography

- **In-game UI** uses the stock `'Arial, sans-serif'` stack with a bold variant for emphasis (ported from `FONT.base` / `FONT.bold`). This is deliberate — the [Architect] brief avoids custom fonts for rendering cost and asset weight. Sizes: 11 / 13 / 16 / 20 / 26 / 36 px.
- **Marketing + design-system surfaces** pair Arial with two webfont accents: **Cinzel** (gilded serif, for uppercase titles like "DUAL SLOTS BATTLE" and the VS marquee) and **Noto Sans TC / Noto Serif TC** (for the spirit characters 蒼嵐, 玄墨, etc.). Mono is system.
- **⚠️ Font substitution flag.** The codebase ships no custom fonts. Cinzel and Noto are nearest-match CDN substitutions chosen here for the brand system. If marketing has a licensed display face in mind (e.g. a Chinese-martial-arts calligraphic face), swap it into `colors_and_type.css` and drop a TTF into `fonts/`.

### Spacing, grid, layout

All in-game layout is **proportional to the 1280×720 canvas**, not absolute pixels. Side panels take 16.5% of width each; the center column takes the rest. Vertical zones split 44% arena / 38% reel / 18% control. A 52×52 formation cell and a 96×58 reel cell are the two recurring rectangles. Spacing is a 4-px grid (4 / 8 / 12 / 16 / 20 / 24 / 32 / 40 / 56 / 64).

### Backgrounds & surfaces

**Flat fills, always.** No CSS gradients, no noise textures, no hand-drawn illustrations, no repeating patterns. The game's "texture" comes from the spirit art itself and from the reel tiles — the chrome is intentionally clean so the character work pops.

Marketing surfaces may layer a full-bleed spirit hero on a navy background with a protection gradient only at the copy edge — never as an ambient background-fill.

### Borders, corners, radii

- **Corners are square** (`--r-none: 0`) throughout the game. The reel, panels, cells, and buttons are all hard rectangles. This is the single most distinctive choice — there are no rounded pills in the game.
- Marketing surfaces *may* opt into `--r-md 4px` or `--r-lg 8px` on web-page chrome (nav, cards), but any surface that represents in-game state should stay square.

### Shadows & elevation

The game uses **no drop shadows** — depth is created entirely with color stepping and 1–2px strokes. The design system exposes a tiny shadow token set for marketing:

- `--shadow-text` — 2px text drop shadow for hero titles over imagery
- `--shadow-glow-a / -b / -gold` — team glow auras (use sparingly, only on victory screens or hero elements)
- `--shadow-deep` — a modal-level lift for overlays

### Transparency & blur

Used in three places only:
- Battle log background: `rgba(0,0,0,0.45)` — a letterbox for readability over the main canvas.
- Win-line flash: animated 4px stroke at 0.8α, pulsed with sine-yoyo easing.
- VS label: alpha 0.85 so it recedes behind action. No `backdrop-filter: blur()`.

### Motion

The codebase has a precise motion vocabulary in `FxManager.ts`. Honor these exact curves and durations:

| Moment | Duration | Easing | Notes |
|---|---|---|---|
| HP bar change | 300 ms | `Cubic.easeOut` | Smooth shrink, never snap |
| Reel spin total | 2000 ms | (columns stagger) | Each column decelerates independently |
| Reel column stop | 80 ms yoyo | `Bounce.easeOut` | Small overshoot; communicates weight |
| Win-line flash | 800 ms × yoyo × 2 | `Sine.easeInOut` | Alpha pulse, not color change |
| Damage float | 900 ms | `Cubic.easeOut` | Rises 60px, fades to 0 |
| Screen shake | 250–500 ms | `Sine.easeInOut` | Intensity 6 / 14px depending on win tier |
| Spirit entrance | 600 ms | `Back.easeOut` | Slide 120px + alpha; overshoots |
| Button hover | 150 ms | linear fill change | Idle → hover → pressed → idle |

### Interaction states

- **Hover:** button background brightens (`--btn-idle #e67e22` → `--btn-hover #f39c12`). Cursor becomes `pointer`. No scale change.
- **Press:** darkens (`--btn-pressed #b35900`). No scale; no inner shadow; the color shift IS the affordance.
- **Disabled:** muted gray `--btn-disabled #555`. Label changes to reflect state (`SPINNING...`, `AUTO...`).
- **Win celebration:** on large wins, a gold flash overlay at 0.4α fades over 600ms while coins burst radially from center and a 14px screen shake fires.
- **Unit death:** cell background flips to `#220000`, a red `✕` overlays the portrait, HP bar width zeroes. No particle; no animation beyond the instant state change.

### Layout rules

- The **gold reel frame is always centered** horizontally; it is the visual anchor. Everything else is flanked.
- **Fixed elements:** the ROUND counter (top center, 14px from top), the VS label (arena center), and the SPIN button (bottom center, 14px from bottom) sit on the vertical spine. The two player panels mirror across it.
- **Full-bleed imagery** is reserved for marketing surfaces only — the game itself never fills the canvas with a single image.

### Imagery color vibe

Warm-skin-tone characters on white with saturated accent props (Yin's turquoise belt, Cang Lan's royal-blue kimono, the gold blade hilts). No black-and-white, no grain, no cool/monochrome treatment. Think: premium Chinese mobile-RPG splash art. When you letterbox or crop these into dark panels, the contrast is the whole point — don't soften it.

---

## ICONOGRAPHY

**In-game approach.** Dual Slots Battle deliberately does not use any conventional icon font (no Lucide, no Font Awesome, no Material Icons). Every non-text visual element is either:

1. A **photographic asset** (the 8 spirit PNGs, loaded by Phaser as textures) — these ARE the icon system for spirits and live in `assets/spirits/`.
2. A **primitive Phaser-drawn shape** (circle, diamond, rectangle, rotated-square, triangle, 5-point star, open-square) — used for reel tile symbols. Each maps 1:1 to a `shape:` field in `symbols.json` and a suit color. See `ReelGrid.ts::_drawShape()` for the full list.
3. A **typographic glyph** — the five in-use glyphs are `★` (win, skill trigger), `✕` (dead unit), `$` (coin), `VS` (versus), and the round digits. No emoji, anywhere.

**For the design system surfaces** (marketing pages, cards, this document), we supplement with [Lucide](https://lucide.dev) via CDN for generic UI affordances (chevrons, close, copy, download). Lucide matches the stroke weight and flat style of our 1–2px borders better than Heroicons; this is a **documented substitution** — there is no first-party icon set. Flagged.

**Copy rules.**
- Never draw SVG faces, creatures, weapons, or decorative illustration. Use the spirit PNGs.
- Never introduce emoji, even for status (✅ / ❌ / 🎉). Use color + glyph (`✕`, `★`) or a state color chip.
- Unicode box/line characters (`│`, `├`, `─`) are fine in internal code comments, never in UI.
- If a marketing surface needs a Four-Beasts monogram or a slot-machine mark, use `assets/logos/` (created for this system; documented as original art, not from the codebase).

---

## Next steps / how to use this system

1. For **production UI work**, import `colors_and_type.css`, use the `--var` tokens directly. The game itself doesn't import this file — Phaser reads `DesignTokens.ts` — but the two files are kept in sync. Update both together.
2. For **marketing or slide surfaces**, build against `ui_kits/marketing/` and the Cinzel + Noto Serif TC type stack.
3. For **any new in-game scene**, follow the [Stylist] Design-First Protocol in `AGENTS.md` — mock in HTML/Claude Design first, get Owner sign-off, then port to Phaser.
