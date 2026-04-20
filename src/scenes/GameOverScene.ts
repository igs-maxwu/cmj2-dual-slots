import Phaser from 'phaser';
import { EventBus } from '@/systems/EventBus';
import { EventNames } from '@/config/EventNames';
import { CANVAS_WIDTH, CANVAS_HEIGHT } from '@/config/GameConfig';
import { COLORS, LAYOUT, FONT_SIZE, FONT } from '@/config/DesignTokens';

// ─── Data Contract ────────────────────────────────────────────────────────────

/**
 * Result data passed into GameOverScene via `this.scene.start('GameOverScene', data)`.
 * All fields are required so the scene can render a complete summary without
 * querying any external state.
 */
export interface GameOverData {
  /** Battle winner. 'DRAW' when both sides lose simultaneously. */
  winner: 'A' | 'B' | 'DRAW';
  /** Total rounds played during this match. */
  rounds: number;
  /** Remaining HP totals for Player A's team (sum across spirits). */
  hpRemainingA: number;
  /** Remaining HP totals for Player B's team (sum across spirits). */
  hpRemainingB: number;
  /** Maximum HP totals for Player A's team (sum across spirits). */
  hpMaxA: number;
  /** Maximum HP totals for Player B's team (sum across spirits). */
  hpMaxB: number;
  /** Player A's coin balance at match end. */
  coinA: number;
  /** Player B's coin balance at match end. */
  coinB: number;
}

// ─── Scene ───────────────────────────────────────────────────────────────────

/**
 * GameOverScene — shown after a battle concludes.
 *
 * Responsibilities:
 * - Display the battle outcome (winner + summary stats).
 * - Provide REMATCH and MAIN MENU affordances.
 * - Hand off to GameScene (rematch) or MainMenuScene (exit).
 *
 * Data arrives via Phaser scene init data:
 * `this.scene.start('GameOverScene', data as GameOverData)`
 *
 * [The Stylist] owns final visual polish — this file uses placeholder rects.
 */
export class GameOverScene extends Phaser.Scene {
  /** Match result payload received from GameScene via scene init data. */
  private matchResult!: GameOverData;

  constructor() { super({ key: 'GameOverScene' }); }

  /**
   * Receives the match result data injected by GameScene.
   * @param data - Typed result payload conforming to {@link GameOverData}.
   */
  init(data: GameOverData): void {
    this.matchResult = data;
  }

  /**
   * Builds all UI elements from match result data.
   * [The Stylist] will replace placeholder geometry in T3.
   */
  create(): void {
    this._drawBackdrop();
    this._drawTitle();
    this._drawWinnerBanner();
    this._drawStats();
    this._drawButtons();
  }

  // ─── Private helpers ──────────────────────────────────────────────────────

  /** Full-screen dark overlay so the scene reads on top of the frozen GameScene. */
  private _drawBackdrop(): void {
    this.add.rectangle(
      CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2,
      CANVAS_WIDTH, CANVAS_HEIGHT,
      COLORS.bg, 0.92,
    );
  }

  /** Large "BATTLE OVER" heading. */
  private _drawTitle(): void {
    this.add.text(
      CANVAS_WIDTH / 2,
      Math.round(CANVAS_HEIGHT * 0.14),
      'BATTLE OVER',
      {
        fontSize:   `${FONT_SIZE.xxl * 2}px`,
        fontFamily: FONT.bold,
        color:      `#${COLORS.borderGold.toString(16).padStart(6, '0')}`,
      },
    ).setOrigin(0.5, 0.5);
  }

  /** "PLAYER A WINS" / "PLAYER B WINS" / "DRAW" banner. */
  private _drawWinnerBanner(): void {
    const { winner } = this.matchResult;
    const text  = winner === 'DRAW'
      ? 'DRAW — MUTUAL DESTRUCTION'
      : `PLAYER ${winner} WINS`;
    const color = winner === 'A'
      ? COLORS.playerA
      : winner === 'B'
        ? COLORS.playerB
        : COLORS.borderGold;

    const hex = `#${color.toString(16).padStart(6, '0')}`;

    // Coloured underline strip
    this.add.rectangle(
      CANVAS_WIDTH / 2,
      Math.round(CANVAS_HEIGHT * 0.30),
      Math.round(CANVAS_WIDTH * 0.55),
      4,
      color,
    );

    this.add.text(
      CANVAS_WIDTH / 2,
      Math.round(CANVAS_HEIGHT * 0.27),
      text,
      {
        fontSize:   `${FONT_SIZE.xl}px`,
        fontFamily: FONT.bold,
        color:      hex,
      },
    ).setOrigin(0.5, 0.5);
  }

  /**
   * Renders a two-column stat block: Rounds, HP, and Coins for both sides.
   * All coordinates are derived from CANVAS constants and LAYOUT ratios.
   */
  private _drawStats(): void {
    const { rounds, hpRemainingA, hpMaxA, hpRemainingB, hpMaxB, coinA, coinB } = this.matchResult;

    const colA = Math.round(CANVAS_WIDTH * 0.30);
    const colB = Math.round(CANVAS_WIDTH * 0.70);
    const topY  = Math.round(CANVAS_HEIGHT * 0.38);
    const lineH = Math.round(CANVAS_HEIGHT * 0.068);

    const headerStyle = {
      fontSize:   `${FONT_SIZE.sm}px`,
      fontFamily: FONT.bold,
      color:      `#${COLORS.textMuted.toString(16).padStart(6, '0')}`,
    };
    const valueStyleA = {
      fontSize:   `${FONT_SIZE.md}px`,
      fontFamily: FONT.bold,
      color:      `#${COLORS.playerA.toString(16).padStart(6, '0')}`,
    };
    const valueStyleB = {
      fontSize:   `${FONT_SIZE.md}px`,
      fontFamily: FONT.bold,
      color:      `#${COLORS.playerB.toString(16).padStart(6, '0')}`,
    };
    const centreStyle = {
      fontSize:   `${FONT_SIZE.md}px`,
      fontFamily: FONT.bold,
      color:      '#ffffff',
    };

    // Column headers
    this.add.text(colA, topY, 'PLAYER A', headerStyle).setOrigin(0.5, 0.5);
    this.add.text(CANVAS_WIDTH / 2, topY, 'STAT', headerStyle).setOrigin(0.5, 0.5);
    this.add.text(colB, topY, 'PLAYER B', headerStyle).setOrigin(0.5, 0.5);

    // Row 1 — Rounds (shared)
    this.add.text(CANVAS_WIDTH / 2, topY + lineH, `Rounds: ${rounds}`, centreStyle)
      .setOrigin(0.5, 0.5);

    // Row 2 — HP
    this.add.text(colA, topY + lineH * 2,
      `HP  ${hpRemainingA} / ${hpMaxA}`, valueStyleA).setOrigin(0.5, 0.5);
    this.add.text(CANVAS_WIDTH / 2, topY + lineH * 2, 'HP', centreStyle)
      .setOrigin(0.5, 0.5);
    this.add.text(colB, topY + lineH * 2,
      `HP  ${hpRemainingB} / ${hpMaxB}`, valueStyleB).setOrigin(0.5, 0.5);

    // Row 3 — Coins
    this.add.text(colA, topY + lineH * 3,
      `$${coinA}`, valueStyleA).setOrigin(0.5, 0.5);
    this.add.text(CANVAS_WIDTH / 2, topY + lineH * 3, 'COINS', centreStyle)
      .setOrigin(0.5, 0.5);
    this.add.text(colB, topY + lineH * 3,
      `$${coinB}`, valueStyleB).setOrigin(0.5, 0.5);
  }

  /**
   * Renders REMATCH and MAIN MENU buttons.
   * REMATCH emits {@link EventNames.REMATCH_REQUESTED} then restarts GameScene
   * with `{ mode: 'rematch' }`.
   * MAIN MENU transitions directly to MainMenuScene.
   */
  private _drawButtons(): void {
    const btnW   = LAYOUT.btnW * 1.3;
    const btnH   = LAYOUT.btnH;
    const gap    = Math.round(CANVAS_WIDTH * 0.06);
    const btnY   = Math.round(CANVAS_HEIGHT * 0.78);
    const leftX  = CANVAS_WIDTH / 2 - btnW / 2 - gap / 2 - btnW / 2;
    const rightX = CANVAS_WIDTH / 2 + btnW / 2 + gap / 2 + btnW / 2 - btnW;

    this._makeButton(
      leftX + btnW / 2, btnY,
      btnW, btnH,
      'REMATCH',
      0x27ae60,
      0x2ecc71,
      () => {
        EventBus.emit(EventNames.REMATCH_REQUESTED, { from: 'scene' });
        this.scene.start('GameScene', { mode: 'rematch' });
      },
    );

    this._makeButton(
      rightX + btnW / 2, btnY,
      btnW, btnH,
      'MAIN MENU',
      COLORS.btnIdle,
      COLORS.btnHover,
      () => {
        this.scene.start('MainMenuScene');
      },
    );
  }

  /**
   * Creates a labelled rectangle button with hover feedback.
   * [The Stylist] should replace with a shared Button component in T3.
   *
   * @param cx       - Centre X of the button.
   * @param cy       - Centre Y of the button.
   * @param w        - Button width in pixels.
   * @param h        - Button height in pixels.
   * @param label    - Button text.
   * @param fill     - Normal background colour (numeric hex).
   * @param hover    - Hover background colour (numeric hex).
   * @param callback - Called on pointer-up.
   */
  private _makeButton(
    cx: number, cy: number,
    w: number, h: number,
    label: string,
    fill: number, hover: number,
    callback: () => void,
  ): void {
    const bg = this.add.rectangle(cx, cy, w, h, fill)
      .setStrokeStyle(2, COLORS.white)
      .setInteractive({ useHandCursor: true });

    const txt = this.add.text(cx, cy, label, {
      fontSize:   `${FONT_SIZE.lg}px`,
      fontFamily: FONT.bold,
      color:      '#ffffff',
    }).setOrigin(0.5, 0.5);

    bg.on(Phaser.Input.Events.POINTER_OVER,  () => bg.setFillStyle(hover));
    bg.on(Phaser.Input.Events.POINTER_OUT,   () => bg.setFillStyle(fill));
    bg.on(Phaser.Input.Events.POINTER_DOWN,  () => bg.setFillStyle(fill));
    bg.on(Phaser.Input.Events.POINTER_UP,    () => {
      bg.setFillStyle(fill);
      callback();
    });

    // Keep text on top of bg in display list order
    txt.setDepth(1);
  }
}
