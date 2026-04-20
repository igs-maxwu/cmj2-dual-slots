import Phaser from 'phaser';
import { COLORS, LAYOUT, FONT_SIZE, FONT } from '@/config/DesignTokens';
import { EventBus } from '@/systems/EventBus';
import { EventNames } from '@/config/EventNames';
import { CANVAS_WIDTH } from '@/config/GameConfig';

const MAX_LINES = 4;

/**
 * [The Stylist] — Scrolling battle log displayed in the bottom control zone.
 * Shows last MAX_LINES entries; older entries fade out.
 */
export class BattleLog extends Phaser.GameObjects.Container {
  private lines: Phaser.GameObjects.Text[] = [];
  private entries: { text: string; color: number }[] = [];

  constructor(scene: Phaser.Scene) {
    const logW = CANVAS_WIDTH - LAYOUT.btnW - 40;
    const x    = LAYOUT.panelW;
    const y    = LAYOUT.ctrlY + 8;
    super(scene, x, y);
    scene.add.existing(this);
    this._build(logW);
    this._listenEvents();
  }

  addEntry(text: string, color: number = COLORS.white): void {
    this.entries.push({ text, color });
    if (this.entries.length > MAX_LINES * 3) this.entries.shift();
    this._render();
  }

  private _build(w: number): void {
    const bg = this.scene.add.rectangle(
      w / 2, LAYOUT.ctrlH / 2, w, LAYOUT.ctrlH - 12, 0x000000, 0.45
    );
    this.add(bg);

    for (let i = 0; i < MAX_LINES; i++) {
      const t = this.scene.add.text(10, 6 + i * 18, '', {
        fontSize:   `${FONT_SIZE.sm}px`,
        fontFamily: FONT.base,
        color:      '#ffffff',
      });
      this.lines.push(t);
      this.add(t);
    }
  }

  private _render(): void {
    const recent = this.entries.slice(-MAX_LINES);
    this.lines.forEach((line, i) => {
      const entry = recent[i];
      if (!entry) { line.setText(''); return; }
      line.setText(entry.text);
      const c = Phaser.Display.Color.IntegerToColor(entry.color);
      line.setColor(c.rgba);
      line.setAlpha(0.5 + (i / MAX_LINES) * 0.5);
    });
  }

  private _listenEvents(): void {
    EventBus.on(EventNames.BATTLE_LOG, (data: { text: string; color: number }) => {
      this.addEntry(data.text, data.color);
    }, this);
  }

  destroy(fromScene?: boolean): void {
    EventBus.off(EventNames.BATTLE_LOG, undefined, this);
    super.destroy(fromScene);
  }
}
