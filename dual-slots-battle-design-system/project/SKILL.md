---
name: dual-slots-battle-design
description: Use this skill to generate well-branded interfaces and assets for Dual Slots Battle (雀靈戰記 / CMJ2 — a 1v1 spirit-battle slot machine by the IGS team). Visual language is PG-Soft-style deep-sea gold: underwater backdrops, gold cartouche frames, calligraphy titles, spirit portraits, and a 5×4 reel that drives a 1v1 autobattle. Contains design tokens, color/type guidelines, spirit artwork, and a full game-scene UI kit.
user-invocable: true
---

Read the README.md file within this skill, and explore the other available files.

Key files:
- `README.md` — brand context, content fundamentals, visual foundations, iconography.
- `colors_and_type.css` — all tokens as CSS custom properties (`--sea-*`, `--gold-*`, `--team-*`, `--grad-gold-v`) + semantic classes (`.ds-hero-title`, `.ds-frame`, `.ds-num`). Always import this first.
- `assets/spirits/` — 8 spirit portrait PNGs (the canonical character icons — never redraw as SVG).
- `preview/` — small design-system cards showing palette, type, components, brand. Reference, not finished art.
- `ui_kits/game/` — React recreation of the main battle scene (1280×720). Drop in sub-components or the whole `GameScene`.
- `legacy/` — the older flat/square-corner DualSlot system. Don't use; kept for archive.

If creating visual artifacts (slides, mocks, throwaway prototypes, marketing), copy assets out and produce static HTML files. If working on production code, read the tokens and foundations to match the brand precisely.

If the user invokes this skill without further guidance, ask them what they want to build, then act as an expert designer who outputs HTML artifacts or production code as appropriate.

## Cheat sheet
- **Palette**: deep-sea navy (`#061a33` → `#3aa8c9`) + metallic gold (`#ffe9a8` → `#8a5412` via `--grad-gold-v`) + team blue/red (`#2f88e8` / `#e84a3c`) + CTA green (`#28c76f`).
- **Typography**: Ma Shan Zheng / ZCOOL KuaiLe (calligraphy hero), Noto Serif TC (UI titles), Noto Sans TC (body), Cinzel (numbers). Always put gold gradient + stroke + drop-shadow on hero titles.
- **Frames**: every panel is a `GoldFrame` (3px gold gradient border, inset + outer shadow). Round corners (6/10/18/pill) — no square corners.
- **Buttons**: 3D, 2px gold border, `translateY(2px)` on press, 4px dark under-shadow.
- **Copy**: Traditional Chinese. Terse. Mythic/wuxia vocabulary. ALL-CAPS latin UI labels. No emoji except 🎁 for shop.
- **Don't**: draw spirits as SVG, use flat/minimal style, use square corners, use purple gradient backgrounds, use modern-sans UI fonts.
