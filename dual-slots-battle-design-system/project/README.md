# Dual Slots Battle — Design System

> 豪華東亞仙境 · 深海金色 · 1v1 雀靈競技場老虎機

## 產品脈絡

**Dual Slots Battle（雙轉對戰 / 雀靈戰記）** 是 IGS / CMJ2 團隊研發的 **1v1 對戰式老虎機**。跟一般單機老虎機不同，兩位玩家同時各自轉動自己的轉軸，連線造成的「攻擊」會打到對方的雀靈隊伍。是 slot × autobattler × 東方神話 (Four Beasts / 四靈) 的混搭。

**視覺基調**取自東南亞 / 東亞娛樂城熱門 slot（PG Soft、Jili 等）的豪華厚塗美術 — 金框、書法標題、水底光束、厚塗角色立繪 — 再疊上雙轉對戰的競技場結構。參考截圖見 `uploads/art ref.jpg`（題材示意：《波賽頓》）。

## 來源 / Sources

- **Codebase**：`ClaudeAI/DualSlot/`（Phaser 3 + TypeScript + Vite；實際遊戲核心）
- **GitHub**：`igs-maxwu/cmj2-dual-slots`
- **Spec 文件**：`ClaudeAI/wiki/cmj2-game-specs.md`、`ClaudeAI/DualSlot/AGENTS.md`
- **Legacy 舊版設計系統**：`legacy/`（第一版走極簡方角，已整包歸檔備用）
- **美術參考**：`uploads/art ref.jpg`

## Index（根目錄資料清單）

| 檔案 / 資料夾 | 內容 |
|---|---|
| `README.md` | 本檔 — 品牌脈絡、內容準則、視覺基礎、iconography |
| `SKILL.md` | Agent Skill 元資料（可抽出當 Claude Code skill 用） |
| `colors_and_type.css` | 所有設計 token（顏色、字體、陰影、動效曲線）+ 語意 class |
| `assets/` | Logo、雀靈立繪、背景、icon |
| `preview/` | Design System 卡片（小 HTML，供預覽 tab 顯示） |
| `ui_kits/game/` | 主遊戲畫面的 React 重建（1280×720） |
| `legacy/` | 第一版方角極簡設計系統（歸檔） |

---

## CONTENT FUNDAMENTALS

**語言**：繁體中文為主，英文作為次要 / 技術標籤（例如 `MAX BET`、`SPIN`）。

**文案調性**：
- **武俠 / 神話語彙**：招式、靈獸、咒印、劫數、試煉場、龍吟、雷鳴。不是現代商務語氣。
- **短、有力、四字優先**：「雷霆萬鈞」「一擊必殺」「大獲全勝」「再戰一場」。
- **倍率是英雄**：`×25` `×500` `×1000` 永遠用金色大字突出，是文案本身的一部分。
- **不用 emoji**。用符號：`★ ✕ $ × 〇 ☯`。
- **不用第一/第二人稱**。第三人稱、命令式、或乾脆省略主詞。

**範例**：
- ✅ `押注` `最大押注` `總贏分` `大獲全勝！` `×500`
- ✅ `START BATTLE` `MEGA WIN` `FREE SPIN ×10`
- ❌ `開始你的冒險！` `恭喜您中獎了`（太口語/客套）
- ❌ `😎 贏錢囉` `🎰 轉吧`（emoji 禁用）

**大小寫**：
- 中文：正常寫。
- 英文 UI 標籤：**ALL CAPS** 加 `letter-spacing: 0.18em`（如 `MEGA WIN`、`FREE SPIN`、`MAX BET`）。
- 英文文案 / 描述：句首大寫。

---

## VISUAL FOUNDATIONS

### 背景（最重要）
**全畫面都是插畫式深海背景** — 深藍 `--sea-deep` 漸層到水面光束 `--sea-light`，中央是角色立繪（雀靈或神獸）。背景不是單色、不是純 gradient；是**有場景感的厚塗插畫**（海底神殿、雲海、祭壇等）。設計檔案裡先用 `assets/placeholders/bg-*.jpg` 佔位，正式美術由美術團隊產。

### 色調
- **深海藍 × 金**是主旋律。98% 的畫面都是這兩色的交織。
- **鮮豔符號色**只出現在轉軸符號上（綠/粉/紫/橘/紅），作為深海背景上的視覺焦點。
- **CTA 綠**是唯一的「功能色」— 只給主要押注按鈕用。
- 不要無端使用紫色、cyan、pastel — 除非是符號或雀靈本身的配色。

### 字體
- **書法大標**（`Ma Shan Zheng` / `ZCOOL KuaiLe`）僅用在遊戲名、Big Win 這類英雄字層；一律套用 `--grad-gold-text` 金色漸層 + 金色描邊 + drop-shadow。
- **Noto Serif TC** 用在次標題、UI 重要文字（雀靈名、技能名）。
- **Noto Sans TC** 用在一般 UI。
- **Cinzel** 用在數字（贏分、倍率、等級）— 襯線 + 金色漸層，讓數字有「獎金感」。
- 字號階層見 `--fs-xs` ~ `--fs-hero`；`--fs-hero = 88px` 專給書法大標。

### 金框 (Cartouche)
所有面板、按鈕、贏分窗 **都有金框**。金框長這樣：
- `3px` 漸層金邊（`--grad-gold-v`：亮 → 暗的上下漸層，模擬金屬反光）
- 外陰影 `--sh-frame-outer`（讓框浮在背景上）
- 內陰影 `--sh-frame-inner`（讓框內容凹下去）
- 圓角 `10px`（預設）、`6px`（小元件）、`18px`（主要面板）、`pill`（按鈕）
- 使用 `.ds-frame` class 即可。

### 按鈕
**都是立體厚按鈕**（不是 flat）：
- 上亮下暗漸層 + `4px` 下緣暗影（`--sh-button`）做出「厚度」
- 金色 `2px` 邊
- Hover：亮度 +10%，微放大 1.03
- Press：`translateY(2px)` + 陰影變淺（`--sh-button-press`）
- 四種樣式：**綠 CTA**（押注）、**金 CTA**（最大押注、商城）、**紅 CTA**（離開、危險）、**深色次要**（設定、音量）

### 發光 (Glows)
- 所有重要元件都有「發光暈」。
- 金光 `--glow-gold`：贏分窗、倍率、書法標題
- 隊伍光 `--glow-azure` / `--glow-vermilion`：雀靈攻擊時、HP 警示
- 綠光 `--glow-green`：CTA、中獎線
- 發光用 `box-shadow` 或 `filter: drop-shadow`，**不用 blur()**（會糊角色立繪）

### 圓角
**跟 legacy 相反 — 這版所有東西都有圓角。** `6/10/18/pill` 四級。沒有方角元件。

### 透明度 / 玻璃質感
- 面板用 `--surf-panel` = `rgba(8,28,54,0.85)`，**不用 backdrop-filter: blur**（效能 + 水底已經夠「霧」了）。
- 贏分內凹窗用 `--surf-dark-inlay` = `#020a18`（幾乎純黑藍）。

### 動效 (Motion)
- **所有過場 220ms**，曲線 `--ease-out` 是預設。
- 按鈕 hover/press = `120ms`（快）。
- 轉軸停止 = 每軸錯開 `80ms`，用 `--ease-back`（輕微彈跳）。
- 中獎線 = `1.6s` 循環呼吸光（opacity 0→1→0）。
- **Big Win 動畫**：金字從 scale(0.3) → scale(1.1) → scale(1.0)，1.8s 用 `--ease-back`，伴隨數字從 0 ticker 到最終值。
- 雀靈受傷：隊伍面板 shake `260ms`，HP bar 用 `--dur-slow` 平滑掉血。
- **避免：無限旋轉、持續 bounce、慢動作 fade**。所有動畫都有明確的起點和終點。

### Hover / Press
- Hover：亮度 +10%（`filter: brightness(1.1)`）+ 微放大（scale 1.03）
- Press：translateY 2px + 陰影縮小
- 禁用態：飽和度 -50% + 40% 不透明

### Imagery
- **一律厚塗**（gouache / painterly），不是 flat vector。
- **暖光 + 冷背景**：角色身上有金光 / 橘光打亮，背景是藍綠深海。這個對比是靈魂。
- **高飽和、中明度**：不要發白（像清新）、不要全暗（像恐怖）。
- **不要**：flat 扁平、純 2D vector、漫畫風、水彩風、像素風、noir 黑白。

---

## ICONOGRAPHY

這個系統的 iconography **非常克制** — 大部分的視覺訊息由「角色立繪」和「書法標題」承載，icon 只是輔助。

### 三個層級

1. **雀靈立繪**（`assets/spirits/*.png`）— 8 個角色，是最重要的「icon」。用途：陣容格、轉軸中高額符號、Big Win 慶祝、loading、商城。**永遠用 PNG，永遠不要重畫成 SVG**。
2. **轉軸符號**（`assets/symbols/`，目前用 placeholder）— 低額是海洋元素（貝殼、海螺、金螺）；中額是四靈簡化（青龍、朱雀、玄武、白虎）；高額是雀靈立繪；Wild / Scatter 用金色 / 紅色漸層框的特殊符號。
3. **功能 UI 圖示**（設定、音量、商城、錢包、禮物、關閉）— 用 CSS / SVG 畫的簡線圖示，金色漸層描邊，尺寸 24/32/48px。目前由 `<GoldIcon>` React 組件產出，用 Unicode 替代符號（`☰ × ⚙ 🔔` → 替換成：`≡ ✕ ⚙ ♪`）。

### 符號列表（整個系統的 icon 集合）
- `★` 中獎、升等、收藏
- `✕` 關閉、陣亡
- `$` 金幣、押注
- `×N` 倍率（永遠跟數字並列）
- `≡` 選單
- `♪` 音量
- `⚙` 設定
- `🎁` 禮物 / 商城（唯一允許的 emoji，且只在圖示位置）
- `VS` 對戰（英文縮寫當圖示用，書法字處理）

### Emoji 使用規則
- **預設不用 emoji。**
- 例外：`🎁` 商城禮物按鈕（廣告業已約定俗成）。其他一律改用金色 SVG 圖示或中文字。

### 缺什麼 → 怎麼辦
- 缺雀靈立繪 → 灰底 placeholder + 中文名稱標籤
- 缺符號美術 → CSS gradient 圓框 + 占位字元
- 缺背景 → `--sea-deep` + noise 紋理
- **絕不自己用 SVG 畫角色或神獸**。寧可留 placeholder 讓美術補。

---

## Roster（雀靈角色）

8 個雀靈角色在 `assets/spirits/`：

| 檔名 | 中文名 | 所屬四靈 |
|---|---|---|
| `canlan.png` | 蒼嵐 | 青龍 |
| `lingyu.png` | 凌羽 | 朱雀 |
| `luoluo.png` | 珞洛 | 朱雀 |
| `mengchenzhang.png` | 孟辰璋 | 青龍 |
| `xuanmo.png` | 玄墨 | 玄武 |
| `yin.png` | 寅 | 白虎 |
| `zhaoyu.png` | 昭宇 | 白虎 |
| `zhuluan.png` | 朱鸞 | 朱雀 |

陣容配色以所屬四靈為準（青龍藍、朱雀紅、玄武紫、白虎金）。

---

## 字體替代說明（FLAG）

目前使用 Google Fonts 作為書法替代字體：
- **Ma Shan Zheng / ZCOOL KuaiLe** → 替代真正的「雀靈戰記」毛筆書法字
- **Noto Serif TC** → 替代遊戲內自訂襯線字
- **Cinzel** → 替代數字裝飾字

**需要你補齊**：真正的 logo PNG（書法版「雀靈戰記」金色描邊版）。字體 ttf 若有授權請放進 `fonts/`。
