import Phaser from 'phaser';
import { EventBus } from './EventBus';
import { EventNames } from '@/config/EventNames';
import { COLORS, FONT_SIZE, FONT } from '@/config/DesignTokens';
import { CANVAS_WIDTH, CANVAS_HEIGHT } from '@/config/GameConfig';

/**
 * [The Illusionist] — All game-feel effects, Promise-wrapped for sequencing.
 * Non-intrusive: never modifies game state. Only visual overlays.
 */
export class FxManager {
  private scene: Phaser.Scene;
  private shakeContainer: Phaser.GameObjects.Container;

  constructor(scene: Phaser.Scene, shakeContainer: Phaser.GameObjects.Container) {
    this.scene          = scene;
    this.shakeContainer = shakeContainer;
    this._listenEvents();
  }

  // ─── Screen Shake ────────────────────────────────────────────────────────────

  /** Shake the entire game container. Resolves when animation ends. */
  screenShake(intensity: number = 8, duration: number = 300): Promise<void> {
    return new Promise(resolve => {
      const ox = this.shakeContainer.x;
      const oy = this.shakeContainer.y;
      this.scene.tweens.add({
        targets:    this.shakeContainer,
        x:          { from: ox - intensity, to: ox + intensity },
        y:          { from: oy - intensity * 0.5, to: oy + intensity * 0.5 },
        duration:   50,
        yoyo:       true,
        repeat:     Math.floor(duration / 100),
        ease:       'Sine.easeInOut',
        onComplete: () => {
          this.shakeContainer.setPosition(ox, oy);
          resolve();
        },
      });
    });
  }

  // ─── Win Line Flash ──────────────────────────────────────────────────────────

  /**
   * Flash animated lines over the reel grid.
   * @param lines Array of {col, row}[] paths to highlight
   * @param reelOrigin Top-left world position of the reel grid
   * @param cellW Cell width in pixels
   * @param cellH Cell height in pixels
   * @param cellGap Gap between cells
   * @param color Line colour (hex integer)
   */
  winLineFlash(
    lines: number[][],
    reelOrigin: { x: number; y: number },
    cellW: number, cellH: number, cellGap: number,
    color: number = COLORS.playerA
  ): Promise<void> {
    return new Promise(resolve => {
      const gfx = this.scene.add.graphics();
      const step = cellW + cellGap;
      let alpha = 0.8;

      const draw = () => {
        gfx.clear();
        gfx.lineStyle(4, color, alpha);
        lines.forEach(line => {
          gfx.beginPath();
          line.forEach((row, col) => {
            const wx = reelOrigin.x + col * step + cellW / 2;
            const wy = reelOrigin.y + row * (cellH + cellGap) + cellH / 2;
            if (col === 0) gfx.moveTo(wx, wy);
            else           gfx.lineTo(wx, wy);
          });
          gfx.strokePath();
        });
      };

      draw();
      this.scene.tweens.add({
        targets:    { alpha: 0.8 },
        alpha:      0,
        duration:   800,
        yoyo:       true,
        repeat:     2,
        ease:       'Sine.easeInOut',
        onUpdate:   (tween) => { alpha = tween.getValue() as number; draw(); },
        onComplete: () => { gfx.destroy(); resolve(); },
      });
    });
  }

  // ─── Damage / Heal Float ─────────────────────────────────────────────────────

  /** Floating damage number that rises and fades. Non-blocking. */
  floatNumber(x: number, y: number, value: number, isHeal = false): void {
    const color  = isHeal ? '#2ecc71' : '#ff4444';
    const prefix = isHeal ? '+' : '-';
    const txt = this.scene.add.text(x, y, `${prefix}${Math.abs(value)}`, {
      fontSize:   `${FONT_SIZE.xl}px`,
      fontFamily: FONT.bold,
      color,
      stroke:     '#000000',
      strokeThickness: 3,
    }).setOrigin(0.5, 0.5).setDepth(100);

    this.scene.tweens.add({
      targets:  txt,
      y:        y - 60,
      alpha:    0,
      duration: 900,
      ease:     'Cubic.easeOut',
      onComplete: () => txt.destroy(),
    });
  }

  // ─── Column Stop Bounce ──────────────────────────────────────────────────────

  /** Bounce a reel column container when it stops. */
  reelStopBounce(container: Phaser.GameObjects.Container): Promise<void> {
    return new Promise(resolve => {
      const oy = container.y;
      this.scene.tweens.add({
        targets:    container,
        y:          oy + 10,
        duration:   80,
        yoyo:       true,
        ease:       'Bounce.easeOut',
        onComplete: () => { container.y = oy; resolve(); },
      });
    });
  }

  // ─── Win Celebration ─────────────────────────────────────────────────────────

  /**
   * Win celebration scaled by intensity.
   * small = coin toss, medium = flash + shake, large = full screen burst.
   */
  async winCelebration(intensity: 'small' | 'medium' | 'large'): Promise<void> {
    if (intensity === 'small') {
      await this._coinBurst(CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2, 8);
      return;
    }
    if (intensity === 'medium') {
      await Promise.all([
        this.screenShake(6, 250),
        this._coinBurst(CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2, 16),
      ]);
      return;
    }
    // large
    this._flashOverlay(0xffd700, 0.4, 600);
    await Promise.all([
      this.screenShake(14, 500),
      this._coinBurst(CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2, 32),
    ]);
  }

  // ─── Spirit Entrance ─────────────────────────────────────────────────────────

  /** Slide + fade-in a spirit panel when the match starts. */
  spiritEntrance(container: Phaser.GameObjects.Container, fromLeft: boolean): Promise<void> {
    return new Promise(resolve => {
      const targetX = container.x;
      container.x   = fromLeft ? targetX - 120 : targetX + 120;
      container.setAlpha(0);
      this.scene.tweens.add({
        targets:    container,
        x:          targetX,
        alpha:      1,
        duration:   600,
        ease:       'Back.easeOut',
        onComplete: () => resolve(),
      });
    });
  }

  // ─── Skill Trigger FX ────────────────────────────────────────────────────────

  /**
   * Generic "skill fired" confirmation: a text pill pops up above the spirit
   * portrait anchor, then fades away. Simultaneously flashes the portrait tint.
   *
   * Timeline (total ~810 ms):
   *   0 ms   — pill spawns at scale 0.3, alpha 0 above anchor
   *   80 ms  — ease-out expand to scale 1, alpha 1  [pop-in]
   *   530 ms — hold at full opacity
   *   810 ms — fade out + drift upward 12 px        [fade-out, 280 ms]
   *
   * The portrait tint flash runs in parallel (120 ms, independent).
   * Returns a Promise that resolves when the pill animation finishes.
   */
  async playSkillTrigger(
    effect:    { side: 'A'|'B'; label?: string; type?: string },
    anchor:    { x: number; y: number },
    portrait?: Phaser.GameObjects.GameObject,
  ): Promise<void> {
    const sideColor = effect.side === 'A' ? COLORS.playerA : COLORS.playerB;
    const label     = effect.label ?? effect.type ?? 'SKILL';

    // ── Pill background ──────────────────────────────────────────────────────
    const pillW = Math.min(label.length * 9 + 20, 160);
    const pillH = 22;
    const pillX = anchor.x;
    const pillY = anchor.y - 36;   // float above the portrait center

    const bg = this.scene.add.graphics().setDepth(110);
    const drawBg = (alpha: number) => {
      bg.clear();
      bg.fillStyle(sideColor, alpha * 0.85);
      bg.fillRoundedRect(-pillW / 2, -pillH / 2, pillW, pillH, 6);
    };
    drawBg(1);
    bg.setPosition(pillX, pillY).setScale(0.3).setAlpha(0);

    const txt = this.scene.add.text(pillX, pillY, label, {
      fontSize:        `${FONT_SIZE.xs}px`,
      fontFamily:      FONT.bold,
      color:           '#ffffff',
      stroke:          '#000000',
      strokeThickness: 1,
    }).setOrigin(0.5, 0.5).setDepth(111).setScale(0.3).setAlpha(0);

    // ── Portrait tint flash (fire-and-forget, 120 ms) ────────────────────────
    if (portrait && (portrait as unknown as Phaser.GameObjects.Image).setTint) {
      const tintable = portrait as unknown as Phaser.GameObjects.Image;
      tintable.setTint(sideColor);
      this.scene.time.delayedCall(120, () => {
        if (tintable.active) tintable.clearTint();
      });
    }

    // ── Pop-in (0 → 80 ms) ───────────────────────────────────────────────────
    await new Promise<void>(resolve => {
      this.scene.tweens.add({
        targets:    [bg, txt],
        scaleX:     1,
        scaleY:     1,
        alpha:      1,
        duration:   80,
        ease:       'Back.easeOut',
        onUpdate:   () => drawBg(bg.alpha),
        onComplete: () => resolve(),
      });
    });

    // ── Hold (80 → 530 ms, 450 ms dwell) ────────────────────────────────────
    await new Promise<void>(resolve => {
      this.scene.time.delayedCall(450, () => resolve());
    });

    // ── Fade-out + upward drift (530 → 810 ms, 280 ms) ──────────────────────
    await new Promise<void>(resolve => {
      this.scene.tweens.add({
        targets:    [bg, txt],
        y:          '-=12',
        alpha:      0,
        duration:   280,
        ease:       'Cubic.easeIn',
        onUpdate:   () => drawBg(bg.alpha),
        onComplete: () => {
          bg.destroy();
          txt.destroy();
          resolve();
        },
      });
    });
  }

  // ─── Private Helpers ─────────────────────────────────────────────────────────

  private _flashOverlay(color: number, alpha: number, duration: number): void {
    const rect = this.scene.add.rectangle(
      CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2, CANVAS_WIDTH, CANVAS_HEIGHT, color, alpha
    ).setDepth(90);
    this.scene.tweens.add({
      targets:    rect,
      alpha:      0,
      duration,
      ease:       'Cubic.easeOut',
      onComplete: () => rect.destroy(),
    });
  }

  private _coinBurst(cx: number, cy: number, count: number): Promise<void> {
    return new Promise(resolve => {
      let done = 0;
      for (let i = 0; i < count; i++) {
        const angle  = (Math.PI * 2 * i) / count + (Math.random() - 0.5) * 0.4;
        const dist   = 80 + Math.random() * 140;
        const coin   = this.scene.add.circle(cx, cy, 6, COLORS.coin).setDepth(95);
        this.scene.tweens.add({
          targets:    coin,
          x:          cx + Math.cos(angle) * dist,
          y:          cy + Math.sin(angle) * dist - 40,
          alpha:      0,
          scaleX:     0.3,
          scaleY:     0.3,
          duration:   500 + Math.random() * 300,
          ease:       'Cubic.easeOut',
          onComplete: () => {
            coin.destroy();
            if (++done === count) resolve();
          },
        });
      }
    });
  }

  private _listenEvents(): void {
    EventBus.on(EventNames.FX_WIN_CELEBRATION, (payload: { dmg: number }) => {
      const intensity = payload.dmg > 500 ? 'large' : payload.dmg > 100 ? 'medium' : 'small';
      this.winCelebration(intensity);
    });
    EventBus.on(EventNames.FX_REEL_STOP, (payload: { col: number; container: Phaser.GameObjects.Container }) => {
      this.reelStopBounce(payload.container);
    });
  }
}
