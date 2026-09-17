import { InventoryItem, ShopSettings, StockAdjustment } from '../types';
import { DEFAULT_SETTINGS, INITIAL_ADJUSTMENTS, INITIAL_ITEMS } from '../data/defaultStock';

const STORAGE_KEYS = {
  ITEMS: 'chattha_inventory_items_v2',
  ADJUSTMENTS: 'chattha_stock_adjustments_v2',
  SETTINGS: 'chattha_shop_settings_v2',
};

export function loadInventory(): InventoryItem[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.ITEMS);
    if (!raw) {
      saveInventory(INITIAL_ITEMS);
      return INITIAL_ITEMS;
    }
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : INITIAL_ITEMS;
  } catch (err) {
    console.error('Failed to load inventory from localStorage', err);
    return INITIAL_ITEMS;
  }
}

export function saveInventory(items: InventoryItem[]): void {
  try {
    localStorage.setItem(STORAGE_KEYS.ITEMS, JSON.stringify(items));
  } catch (err) {
    console.error('Failed to save inventory to localStorage', err);
  }
}

export function loadAdjustments(): StockAdjustment[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.ADJUSTMENTS);
    if (!raw) {
      saveAdjustments(INITIAL_ADJUSTMENTS);
      return INITIAL_ADJUSTMENTS;
    }
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : INITIAL_ADJUSTMENTS;
  } catch (err) {
    console.error('Failed to load adjustments', err);
    return INITIAL_ADJUSTMENTS;
  }
}

export function saveAdjustments(adjustments: StockAdjustment[]): void {
  try {
    localStorage.setItem(STORAGE_KEYS.ADJUSTMENTS, JSON.stringify(adjustments));
  } catch (err) {
    console.error('Failed to save adjustments', err);
  }
}

export function loadSettings(): ShopSettings {
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
  try {
    localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(settings));
  } catch (err) {
    console.error('Failed to save settings', err);
  }
}

export function resetAllData(): { items: InventoryItem[]; adjustments: StockAdjustment[]; settings: ShopSettings } {
  localStorage.removeItem(STORAGE_KEYS.ITEMS);
  localStorage.removeItem(STORAGE_KEYS.ADJUSTMENTS);
  localStorage.removeItem(STORAGE_KEYS.SETTINGS);
  saveInventory(INITIAL_ITEMS);
  saveAdjustments(INITIAL_ADJUSTMENTS);
  saveSettings(DEFAULT_SETTINGS);
  return {
    items: INITIAL_ITEMS,
    adjustments: INITIAL_ADJUSTMENTS,
    settings: DEFAULT_SETTINGS,
  };
}
