import { InventoryItem, ShopSettings, StockAdjustment } from '../types';
import { DEFAULT_SETTINGS, INITIAL_ADJUSTMENTS } from '../data/defaultStock';

const STORAGE_KEYS = {
  ITEMS: 'chattha_inventory_items_v3',
  ADJUSTMENTS: 'chattha_stock_adjustments_v3',
  SETTINGS: 'chattha_shop_settings_v3',
  INITIALIZED: 'chattha_initialized_flag_v3',
};

// Purge legacy demo caches from older versions so old demo data never resurfaces
if (typeof window !== 'undefined' && window.localStorage) {
  try {
    const legacyKeys = [
      'chattha_inventory_items',
      'chattha_inventory_items_v1',
      'chattha_inventory_items_v2',
      'chattha_stock_adjustments',
      'chattha_stock_adjustments_v1',
      'chattha_stock_adjustments_v2',
    ];
    legacyKeys.forEach((k) => localStorage.removeItem(k));
  } catch {
    // ignore
  }
}

export function isSystemInitialized(): boolean {
  if (typeof localStorage === 'undefined') return true;
  return localStorage.getItem(STORAGE_KEYS.INITIALIZED) === 'true';
}

export function setSystemInitialized(val: boolean = true): void {
  if (typeof localStorage === 'undefined') return;
  try {
    if (val) {
      localStorage.setItem(STORAGE_KEYS.INITIALIZED, 'true');
    } else {
      localStorage.removeItem(STORAGE_KEYS.INITIALIZED);
    }
  } catch {
    // ignore
  }
}

export function loadInventory(): InventoryItem[] {
  if (typeof localStorage === 'undefined') return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.ITEMS);
    if (!raw) {
      return [];
    }
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (err) {
    console.error('Failed to load inventory from localStorage', err);
    return [];
  }
}

export function saveInventory(items: InventoryItem[]): void {
  if (typeof localStorage === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEYS.ITEMS, JSON.stringify(items));
    setSystemInitialized(true);
  } catch (err) {
    console.error('Failed to save inventory to localStorage', err);
  }
}

export function loadAdjustments(): StockAdjustment[] {
  if (typeof localStorage === 'undefined') return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.ADJUSTMENTS);
    if (!raw) {
      return [];
    }
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (err) {
    console.error('Failed to load adjustments', err);
    return [];
  }
}

export function saveAdjustments(adjustments: StockAdjustment[]): void {
  if (typeof localStorage === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEYS.ADJUSTMENTS, JSON.stringify(adjustments));
  } catch (err) {
    console.error('Failed to save adjustments', err);
  }
}

export function loadSettings(): ShopSettings {
  if (typeof localStorage === 'undefined') return DEFAULT_SETTINGS;
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.SETTINGS);
    if (!raw) {
      saveSettings(DEFAULT_SETTINGS);
      return DEFAULT_SETTINGS;
    }
    return { ...DEFAULT_SETTINGS, ...JSON.parse(raw) };
  } catch (err) {
    console.error('Failed to load settings', err);
    return DEFAULT_SETTINGS;
  }
}

export function saveSettings(settings: ShopSettings): void {
  if (typeof localStorage === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(settings));
  } catch (err) {
    console.error('Failed to save settings', err);
  }
}

export function clearAllLocalData(): void {
  if (typeof localStorage === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEYS.ITEMS, JSON.stringify([]));
    localStorage.setItem(STORAGE_KEYS.ADJUSTMENTS, JSON.stringify([]));
    setSystemInitialized(true);
  } catch (err) {
    console.error('Failed to clear local data', err);
  }
}

export function resetAllData(): { items: InventoryItem[]; adjustments: StockAdjustment[]; settings: ShopSettings } {
  clearAllLocalData();
  return {
    items: [],
    adjustments: [],
    settings: DEFAULT_SETTINGS,
  };
}
