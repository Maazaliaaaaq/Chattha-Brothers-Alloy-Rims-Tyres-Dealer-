import {
  collection,
  doc,
  setDoc,
  updateDoc,
  deleteDoc,
  onSnapshot,
  writeBatch,
  getDocs,
  query,
  orderBy,
  limit,
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import { InventoryItem, StockAdjustment, ShopSettings, AdjustmentReason } from '../types';
import { INITIAL_ITEMS, DEFAULT_SETTINGS } from '../data/defaultStock';
import { loadInventory, saveInventory } from '../utils/storage';

export type SyncStatus = 'connecting' | 'connected' | 'error' | 'offline';

let currentSyncStatus: SyncStatus = 'connecting';
const syncListeners: ((status: SyncStatus) => void)[] = [];

export function getSyncStatus(): SyncStatus {
  return currentSyncStatus;
}

export function onSyncStatusChange(callback: (status: SyncStatus) => void): () => void {
  syncListeners.push(callback);
  callback(currentSyncStatus);
  return () => {
    const idx = syncListeners.indexOf(callback);
    if (idx !== -1) syncListeners.splice(idx, 1);
  };
}

function setSyncStatus(status: SyncStatus) {
  if (currentSyncStatus !== status) {
    currentSyncStatus = status;
    syncListeners.forEach((cb) => cb(status));
  }
}

/**
 * Real-time listener for Inventory Items collection.
 * Automatically seeds the database with initial stock on first run if empty.
 */
export function subscribeToInventory(
  onItemsChange: (items: InventoryItem[]) => void,
  onError?: (err: Error) => void
): () => void {
  const itemsCollection = collection(db, 'items');
  setSyncStatus('connecting');

  let isFirstLoad = true;

  const unsubscribe = onSnapshot(
    itemsCollection,
    async (snapshot) => {
      setSyncStatus('connected');

      // If database is completely empty on first load, seed with INITIAL_ITEMS
      if (snapshot.empty && isFirstLoad) {
        isFirstLoad = false;
        try {
          console.log('Seeding Firestore with initial Chattha Brothers stock items...');
          await seedInventory(INITIAL_ITEMS);
          // The next snapshot will automatically pick up the seeded items
          return;
        } catch (seedErr) {
          console.error('Failed to seed inventory:', seedErr);
        }
      }

      isFirstLoad = false;

      if (!snapshot.empty) {
        const loaded: InventoryItem[] = [];
        snapshot.forEach((docSnap) => {
          const data = docSnap.data() as InventoryItem;
          loaded.push({
            ...data,
            id: docSnap.id,
          });
        });

        // Save local backup
        saveInventory(loaded);
        onItemsChange(loaded);
      } else {
        // Fallback to local
        const local = loadInventory();
        onItemsChange(local);
      }
    },
    (error) => {
      console.error('Firestore real-time subscription error:', error);
      setSyncStatus('error');
      // Fallback to local cache
      const local = loadInventory();
      onItemsChange(local);
      if (onError) onError(error);
    }
  );

  return unsubscribe;
}

/**
 * Seeds or resets items in Firestore
 */
export async function seedInventory(itemsToSeed: InventoryItem[] = INITIAL_ITEMS): Promise<void> {
  const batch = writeBatch(db);
  itemsToSeed.forEach((item) => {
    const itemRef = doc(db, 'items', item.id);
    batch.set(itemRef, item);
  });
  await batch.commit();
}

/**
 * Add or update an inventory item
 */
export async function saveItemToCloud(item: InventoryItem): Promise<void> {
  try {
    const itemRef = doc(db, 'items', item.id);
    await setDoc(itemRef, {
      ...item,
      updatedAt: Date.now(),
    });
  } catch (err) {
    console.error('Failed to save item to Firestore:', err);
    throw err;
  }
}

/**
 * Direct quantity change with adjustment audit logging
 */
export async function updateItemQuantityInCloud(
  item: InventoryItem,
  newQty: number,
  reason: AdjustmentReason = 'Quick Adjustment',
  note?: string
): Promise<void> {
  const previousQty = item.qty;
  const change = newQty - previousQty;
  if (change === 0) return;

  const itemRef = doc(db, 'items', item.id);
  const now = Date.now();

  // Update item
  await updateDoc(itemRef, {
    qty: newQty,
    updatedAt: now,
  });

  // Log adjustment in adjustments collection
  try {
    const adjId = `adj-${now}-${Math.random().toString(36).slice(2, 7)}`;
    const adjustment: StockAdjustment = {
      id: adjId,
      itemId: item.id,
      itemSummary: `${item.brand} ${item.model} (${item.size})`,
      itemType: item.type,
      previousQty,
      newQty,
      change,
      reason,
      note,
      timestamp: now,
    };
    await setDoc(doc(db, 'adjustments', adjId), adjustment);
  } catch (adjErr) {
    console.warn('Failed to log adjustment record:', adjErr);
  }
}

/**
 * Delete an inventory item
 */
export async function deleteItemFromCloud(itemId: string): Promise<void> {
  try {
    await deleteDoc(doc(db, 'items', itemId));
  } catch (err) {
    console.error('Failed to delete item from Firestore:', err);
    throw err;
  }
}

/**
 * Real-time listener for Shop Settings
 */
export function subscribeToSettings(
  onSettingsChange: (settings: ShopSettings) => void
): () => void {
  const settingsDoc = doc(db, 'settings', 'shop_config');

  return onSnapshot(
    settingsDoc,
    (snapshot) => {
      if (snapshot.exists()) {
        onSettingsChange(snapshot.data() as ShopSettings);
      } else {
        // Create default settings if not existing
        setDoc(settingsDoc, DEFAULT_SETTINGS).catch(console.error);
        onSettingsChange(DEFAULT_SETTINGS);
      }
    },
    (err) => {
      console.warn('Settings subscription fallback:', err);
      onSettingsChange(DEFAULT_SETTINGS);
    }
  );
}

/**
 * Update shop settings
 */
export async function saveSettingsToCloud(settings: ShopSettings): Promise<void> {
  await setDoc(doc(db, 'settings', 'shop_config'), settings);
}

/**
 * Real-time listener for Stock Adjustments log
 */
export function subscribeToAdjustments(
  onAdjustmentsChange: (adjustments: StockAdjustment[]) => void
): () => void {
  const q = query(
    collection(db, 'adjustments'),
    orderBy('timestamp', 'desc'),
    limit(50)
  );

  return onSnapshot(
    q,
    (snapshot) => {
      const list: StockAdjustment[] = [];
      snapshot.forEach((d) => list.push(d.data() as StockAdjustment));
      onAdjustmentsChange(list);
    },
    (err) => {
      console.warn('Adjustments subscription note:', err);
    }
  );
}
