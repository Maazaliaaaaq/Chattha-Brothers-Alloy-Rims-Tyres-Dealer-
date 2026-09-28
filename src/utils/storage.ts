import { InventoryItem, ShopSettings, StockAdjustment } from '../types';
import { DEFAULT_SETTINGS, INITIAL_ADJUSTMENTS } from '../data/defaultStock';

const STORAGE_KEYS = {
  ITEMS: 'chattha_inventory_items_v3',
  ADJUSTMENTS: 'chattha_stock_adjustments_v3',
  SETTINGS: 'chattha_shop_settings_v3',
  INITIALIZED: 'chattha_initialized_flag_v3',
};

// Cross-tab / cross-window instant synchronization bus
const syncChannel = typeof window !== 'undefined' && typeof BroadcastChannel !== 'undefined'
  ? new BroadcastChannel('chattha_inventory_realtime_sync')
  : null;

export function onLocalSyncMessage(callback: (items: InventoryItem[]) => void): () => void {
  if (!syncChannel) return () => {};
  const handler = (event: MessageEvent) => {
    if (event.data && event.data.type === 'ITEMS_UPDATED' && Array.isArray(event.data.items)) {
      callback(event.data.items);
    }
  };
  syncChannel.addEventListener('message', handler);
  return () => {
    syncChannel.removeEventListener('message', handler);
  };
}

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

export function sanitizeItem(raw: any): InventoryItem {
  return {
    id: String(raw?.id || `item-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`),
    type: raw?.type === 'rim' ? 'rim' : 'tyre',
    brand: String(raw?.brand || 'Brand'),
    model: String(raw?.model || ''),
    size: String(raw?.size || (raw?.type === 'rim' ? '15 inch' : '195/65 R15')),
    condition: raw?.condition === 'Used' ? 'Used' : 'New',
    tyreType: raw?.tyreType === 'Tube' ? 'Tube' : 'Tubeless',
    loadIndex: raw?.loadIndex ? String(raw.loadIndex) : undefined,
    width: raw?.width ? String(raw.width) : undefined,
    pcd: raw?.pcd ? String(raw.pcd) : undefined,
    offset: raw?.offset ? String(raw.offset) : undefined,
    finish: raw?.finish ? String(raw.finish) : undefined,
    buyPrice: typeof raw?.buyPrice === 'number' && !isNaN(raw.buyPrice) ? raw.buyPrice : 0,
    sellPrice: typeof raw?.sellPrice === 'number' && !isNaN(raw.sellPrice) ? raw.sellPrice : 0,
    qty: typeof raw?.qty === 'number' && !isNaN(raw.qty) ? Math.max(0, raw.qty) : 0,
    minQty: typeof raw?.minQty === 'number' && !isNaN(raw.minQty) ? Math.max(0, raw.minQty) : 4,
    rack: String(raw?.rack || 'Rack-1'),
    notes: raw?.notes ? String(raw.notes) : undefined,
    updatedAt: typeof raw?.updatedAt === 'number' && !isNaN(raw.updatedAt) ? raw.updatedAt : Date.now(),
  };
}

export function loadInventory(): InventoryItem[] {
  if (typeof localStorage === 'undefined') return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.ITEMS);
    if (!raw) {
      return [];
    }
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((item) => Boolean(item && typeof item === 'object')).map(sanitizeItem);
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
    if (syncChannel) {
      try {
        syncChannel.postMessage({ type: 'ITEMS_UPDATED', items });
      } catch {
        // ignore
      }
    }
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
