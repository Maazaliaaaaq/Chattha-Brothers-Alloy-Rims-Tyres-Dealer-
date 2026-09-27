import {
  collection,
  doc,
  setDoc,
  deleteDoc,
  getDocs,
  onSnapshot,
  writeBatch,
  query,
  orderBy,
  limit,
  getDocFromServer,
} from 'firebase/firestore';
import { db, auth } from '../lib/firebase';
import { InventoryItem, StockAdjustment, ShopSettings, AdjustmentReason } from '../types';
import { INITIAL_ITEMS, DEFAULT_SETTINGS } from '../data/defaultStock';
import { loadInventory, saveInventory, setSystemInitialized } from '../utils/storage';

export type SyncStatus = 'connecting' | 'connected' | 'error' | 'offline';

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  };
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null): never {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth?.currentUser?.uid,
      email: auth?.currentUser?.email,
      emailVerified: auth?.currentUser?.emailVerified,
      isAnonymous: auth?.currentUser?.isAnonymous,
      tenantId: auth?.currentUser?.tenantId,
      providerInfo:
        auth?.currentUser?.providerData?.map((provider) => ({
          providerId: provider.providerId,
          email: provider.email,
        })) || [],
    },
    operationType,
    path,
  };
  console.error('Firestore Error:', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

/**
 * Validate connection to Firestore on initialization
 */
export async function testConnection(): Promise<void> {
  if (!db) return;
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
  } catch (error) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.error('Please check your Firebase configuration.');
    }
  }
}
testConnection();

/**
 * Strips any undefined fields recursively so Firestore never throws
 * "Unsupported field value: undefined" errors.
 */
export function sanitizeForFirestore<T extends Record<string, any>>(obj: T): Record<string, any> {
  const result: Record<string, any> = {};
  for (const [key, value] of Object.entries(obj)) {
    if (value !== undefined) {
      if (value !== null && typeof value === 'object' && !Array.isArray(value)) {
        result[key] = sanitizeForFirestore(value);
      } else {
        result[key] = value;
      }
    }
  }
  return result;
}

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
 * Reliably synchronizes with Firestore. When items are deleted or the inventory
 * is cleared, it persists an empty state without resurrecting deleted demo items.
 */
export function subscribeToInventory(
  onItemsChange: (items: InventoryItem[]) => void,
  onError?: (err: Error) => void
): () => void {
  if (!db) {
    setSyncStatus('offline');
    const local = loadInventory();
    onItemsChange(local);
    return () => {};
  }

  const itemsCollection = collection(db, 'items');
  setSyncStatus('connecting');

  const unsubscribe = onSnapshot(
    itemsCollection,
    (snapshot) => {
      setSyncStatus('connected');
      setSystemInitialized(true);

      const loaded: InventoryItem[] = [];
      snapshot.forEach((docSnap) => {
        const data = docSnap.data() as InventoryItem;
        loaded.push({
          ...data,
          id: docSnap.id,
          type: data.type || (docSnap.id.startsWith('rim') ? 'rim' : 'tyre'),
          brand: data.brand || '',
          model: data.model || '',
          size: data.size || '',
          qty: typeof data.qty === 'number' ? data.qty : 0,
          minQty: typeof data.minQty === 'number' ? data.minQty : 4,
          condition: data.condition || 'New',
          rack: data.rack || 'Rack-1',
          buyPrice: typeof data.buyPrice === 'number' ? data.buyPrice : 0,
          sellPrice: typeof data.sellPrice === 'number' ? data.sellPrice : 0,
          updatedAt: typeof data.updatedAt === 'number' ? data.updatedAt : Date.now(),
        });
      });

      // Always sort by updatedAt desc
      loaded.sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0));

      // Save local backup so subsequent reloads are instantaneous and accurate
      saveInventory(loaded);
      onItemsChange(loaded);
    },
    (error) => {
      console.warn('Firestore real-time subscription status:', error);
      setSyncStatus('offline');
      if (onError) onError(error);
    }
  );

  return unsubscribe;
}

/**
 * Seeds or restores sample items in Firestore safely using sanitized batches
 */
export async function seedInventory(itemsToSeed: InventoryItem[] = INITIAL_ITEMS): Promise<void> {
  if (!db) return;
  // Firestore batches have a 500 operations limit; split in chunks if needed
  const chunkSize = 400;
  for (let i = 0; i < itemsToSeed.length; i += chunkSize) {
    const chunk = itemsToSeed.slice(i, i + chunkSize);
    const batch = writeBatch(db);
    chunk.forEach((item) => {
      const itemRef = doc(db!, 'items', item.id);
      const cleanData = sanitizeForFirestore({
        ...item,
        updatedAt: item.updatedAt || Date.now(),
      });
      batch.set(itemRef, cleanData, { merge: true });
    });
    await batch.commit();
  }
}

/**
 * Add or update an inventory item in Firestore
 */
export async function saveItemToCloud(item: InventoryItem): Promise<void> {
  if (!db) return;
  const path = `items/${item.id}`;
  try {
    const itemRef = doc(db, 'items', item.id);
    const cleaned = sanitizeForFirestore({
      ...item,
      updatedAt: Date.now(),
    });
    await setDoc(itemRef, cleaned, { merge: true });
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, path);
  }
}

/**
 * Direct quantity change with adjustment audit logging
 */
export async function updateItemQuantityInCloud(
  item: InventoryItem,
  newQty: number,
  reason: AdjustmentReason = 'Quick Adjustment',
  note?: string,
  explicitPreviousQty?: number
): Promise<void> {
  if (!db) return;
  const previousQty = explicitPreviousQty !== undefined ? explicitPreviousQty : item.qty;
  const change = newQty - previousQty;
  if (change === 0 && item.qty === newQty) return;

  const itemRef = doc(db, 'items', item.id);
  const now = Date.now();

  try {
    // Safely update quantity in cloud with merge
    await setDoc(itemRef, { qty: newQty, updatedAt: now }, { merge: true });
  } catch (err) {
    handleFirestoreError(err, OperationType.UPDATE, `items/${item.id}`);
  }

  // Log adjustment in adjustments collection
  try {
    const adjId = `adj-${now}-${Math.random().toString(36).slice(2, 7)}`;
    const adjustment: StockAdjustment = {
      id: adjId,
      itemId: item.id,
      itemSummary: `${item.brand} ${item.model || ''} (${item.size})`.trim(),
      itemType: item.type,
      previousQty,
      newQty,
      change,
      reason,
      ...(note ? { note } : {}),
      timestamp: now,
    };
    await setDoc(doc(db, 'adjustments', adjId), sanitizeForFirestore(adjustment));
  } catch (adjErr) {
    console.warn('Failed to log adjustment record:', adjErr);
  }
}

/**
 * Delete an inventory item from Firestore
 */
export async function deleteItemFromCloud(itemId: string): Promise<void> {
  if (!db) return;
  const path = `items/${itemId}`;
  try {
    await deleteDoc(doc(db, 'items', itemId));
  } catch (err) {
    handleFirestoreError(err, OperationType.DELETE, path);
  }
}

/**
 * Permanently delete all inventory items from Firestore (bulk delete)
 */
export async function clearAllItemsFromCloud(): Promise<void> {
  if (!db) return;
  const path = 'items';
  try {
    const snap = await getDocs(collection(db, 'items'));
    const docs = snap.docs;
    if (docs.length > 0) {
      const chunkSize = 400;
      for (let i = 0; i < docs.length; i += chunkSize) {
        const chunk = docs.slice(i, i + chunkSize);
        const batch = writeBatch(db);
        chunk.forEach((d) => batch.delete(d.ref));
        await batch.commit();
      }
    }
    // Record system initialization flag so Firestore never auto-reseeds
    await setDoc(doc(db, 'settings', 'system_init'), { isInitialized: true, lastClearedAt: Date.now() }, { merge: true });
  } catch (err) {
    handleFirestoreError(err, OperationType.DELETE, path);
  }
}

/**
 * Permanently clear adjustments audit history from Firestore
 */
export async function clearAllAdjustmentsFromCloud(): Promise<void> {
  if (!db) return;
  const path = 'adjustments';
  try {
    const snap = await getDocs(collection(db, 'adjustments'));
    const docs = snap.docs;
    if (docs.length > 0) {
      const chunkSize = 400;
      for (let i = 0; i < docs.length; i += chunkSize) {
        const chunk = docs.slice(i, i + chunkSize);
        const batch = writeBatch(db);
        chunk.forEach((d) => batch.delete(d.ref));
        await batch.commit();
      }
    }
  } catch (err) {
    handleFirestoreError(err, OperationType.DELETE, path);
  }
}

/**
 * Real-time listener for Shop Settings
 */
export function subscribeToSettings(
  onSettingsChange: (settings: ShopSettings) => void
): () => void {
  if (!db) {
    onSettingsChange(DEFAULT_SETTINGS);
    return () => {};
  }
  const settingsDoc = doc(db, 'settings', 'shop_config');

  return onSnapshot(
    settingsDoc,
    (snapshot) => {
      if (snapshot.exists()) {
        onSettingsChange(snapshot.data() as ShopSettings);
      } else {
        // Create default settings if not existing
        setDoc(settingsDoc, sanitizeForFirestore(DEFAULT_SETTINGS), { merge: true }).catch(console.error);
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
  if (!db) return;
  const path = 'settings/shop_config';
  try {
    await setDoc(doc(db, 'settings', 'shop_config'), sanitizeForFirestore(settings), { merge: true });
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, path);
  }
}

/**
 * Real-time listener for Stock Adjustments log
 */
export function subscribeToAdjustments(
  onAdjustmentsChange: (adjustments: StockAdjustment[]) => void
): () => void {
  if (!db) {
    return () => {};
  }
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
