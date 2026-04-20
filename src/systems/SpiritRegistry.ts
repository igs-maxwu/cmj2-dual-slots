import type { SpiritDef, SymbolDef } from './SlotEngine';
import spiritsData from '@/config/spirits.json';
import symbolsData from '@/config/symbols.json';

/**
 * Central registry for spirits and symbols.
 * Load once at startup; all systems read from here.
 */
export class SpiritRegistry {
  private spirits: Map<string, SpiritDef> = new Map();
  private symbols: SymbolDef[] = [];

  constructor() {
    this.symbols = symbolsData.symbols as SymbolDef[];
    (spiritsData.spirits as SpiritDef[]).forEach(s => this.spirits.set(s.id, s));
  }

  getSpirit(id: string): SpiritDef {
    const s = this.spirits.get(id);
    if (!s) throw new Error(`[SpiritRegistry] Unknown spirit: ${id}`);
    return s;
  }

  getSymbol(id: number): SymbolDef {
    const s = this.symbols[id];
    if (!s) throw new Error(`[SpiritRegistry] Unknown symbol: ${id}`);
    return s;
  }

  getAllSymbols(): SymbolDef[] { return this.symbols; }

  /**
   * Validate a player's roster for entry.
   * @throws if the spirit count is below MIN_SPIRITS.
   */
  validateRoster(spiritIds: string[], minSpirits = 3): SpiritDef[] {
    if (spiritIds.length < minSpirits) {
      throw new Error(`[SpiritRegistry] Need at least ${minSpirits} spirits to enter (got ${spiritIds.length})`);
    }
    if (spiritIds.length > 5) {
      throw new Error(`[SpiritRegistry] Maximum 5 spirits allowed (got ${spiritIds.length})`);
    }
    return spiritIds.map(id => this.getSpirit(id));
  }
}

export const registry = new SpiritRegistry();
