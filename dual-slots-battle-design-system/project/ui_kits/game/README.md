# UI Kit — Game Scene (雀靈戰記 主戰鬥畫面)

1280×720 React recreation of the 1v1 spirit-battle slot machine. Art direction mirrors PG Soft / Jili style (gold frames, calligraphy titles, deep-sea underwater backdrop) applied to the DualSlot 1v1 structure.

## Files
- `index.html` — entry; scales the 1280×720 stage to the viewport.
- `GameScene.jsx` — single-file component tree. Exports `window.GameScene`.

## Components (all in GameScene.jsx)
- `GoldFrame` — the cartouche primitive. Every panel uses this.
- `GoldText` — calligraphy + gold gradient + stroke + drop-shadow title layer.
- `Btn` — green / gold / red / dark 3D button with hover + press states.
- `IconBtn` — round icon button for header glyphs.
- `HpBar` — 3-stage HP with cubic easing on width change.
- `PortraitOrb` — circular spirit portrait framed in double-gold rings.
- `SpiritPanel` — left/right column: team banner + 3 spirits + coin/bet/recent-dmg.
- `Reel` + `ReelCell` — 5×4 gold-framed reel with inset shadow + win-glow.
- `PaytableStrip` — the 5-icon multiplier row above the reel.
- `Header` — menu / level / coin chips + audio / shop.
- `CenterTitle` — 72px calligraphy "雀靈戰記" wordmark.
- `BottomBar` — bet ± controller + main 押注 button + 最大押注 + 發財樹 bonus wheel.
- `BattleLog` — narrow 3-line ribbon at bottom-center.
- `WinLine` — SVG polyline with breathing opacity over the reel.
- `BigWinOverlay` — gold-burst, rayspin bg, calligraphy `MEGA WIN` + ticker amount.

## Interactions
- Click **押注** → reel shuffles 1.5s → resolves a random damage pair → damage applies to opposing roster with shake / HP tween → occasional skill flair → big-win overlay if total dmg > 600.
- ± adjust bet (floor 1,000 steps).
- **最大押注** snaps bet to 100,000.
- Big-win overlay auto-dismisses after 3.2s, or tap to close.
- When a roster is wiped, button becomes **再戰一場** (rematch).

## Known placeholders (美術待補)
- Central hero art — currently a striped placeholder labeled "主視覺角色立繪". Will house the painted main-character (波賽頓 / 雀靈主角).
- Reel symbols are CSS gradients with Chinese glyphs (貝 螺 金 龜 朱 玄 麟 龍 ★ S). Replace with painted symbol PNGs in `assets/symbols/`.
- Logo — rendered from Ma Shan Zheng + gold gradient. Awaiting PNG logo.
