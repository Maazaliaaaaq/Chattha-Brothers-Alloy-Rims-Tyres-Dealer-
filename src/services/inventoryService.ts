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
import { loadInventory, saveInventory, setSystemInitialized, sanitizeItem } from '../utils/storage';

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

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null): void {
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
  console.warn('Firestore Operation Notice:', JSON.stringify(errInfo));
}

/**
 * Validate connection to Firestore on initialization
 */
export async function testConnection(): Promise<void> {
  if (!db) return;
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
  } catch (error) {
    // Non-critical check, gracefully ignored
  }
}
setTimeout(() => {
  testConnection().catch(() => {});
}, 100);

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

interface PendingItemUpdate {
  item: InventoryItem;
  targetQty: number;
  initialQty: number;
  reason: AdjustmentReason;
  note?: string;
  timer: any;
  inFlight: boolean;
  queuedTargetQty?: number;
  queuedItem?: InventoryItem;
  queuedReason?: AdjustmentReason;
  queuedNote?: string;
}

const pendingUpdates = new Map<string, PendingItemUpdate>();

async function flushPendingUpdate(itemId: string): Promise<void> {
  const pending = pendingUpdates.get(itemId);
  if (!pending) return;

  if (pending.timer) {
    clearTimeout(pending.timer);
    pending.timer = null;
  }

  if (pending.inFlight) {
    return;
  }

  pending.inFlight = true;
  const currentTargetQty = pending.targetQty;
  const currentInitialQty = pending.initialQty;
  const currentItem = pending.item;
  const currentReason = pending.reason;
  const currentNote = pending.note;

  if (!db) {
    pendingUpdates.delete(itemId);
    return;
  }

  const path = `items/${itemId}`;
  const now = Date.now();
  const fullItem: InventoryItem = {
    ...currentItem,
    qty: currentTargetQty,
    updatedAt: now,
  };

  try {
    const itemRef = doc(db, 'items', itemId);
    const cleanedItem = sanitizeForFirestore(fullItem);
    await setDoc(itemRef, cleanedItem, { merge: true });

    // Adjustment log
    const change = currentTargetQty - currentInitialQty;
    if (change !== 0) {
      try {
        const adjId = `adj-${now}-${Math.random().toString(36).slice(2, 7)}`;
        const adjustment: StockAdjustment = {
          id: adjId,
          itemId,
          itemSummary: `${fullItem.brand} ${fullItem.model || ''} (${fullItem.size})`.trim(),
          itemType: fullItem.type,
          previousQty: currentInitialQty,
          newQty: currentTargetQty,
          change,
          reason: currentReason,
          ...(currentNote ? { note: currentNote } : {}),
          timestamp: now,
        };
        await setDoc(doc(db, 'adjustments', adjId), sanitizeForFirestore(adjustment));
      } catch (adjErr) {
        console.warn('Failed to log adjustment record:', adjErr);
      }
    }
  } catch (err) {
    handleFirestoreError(err, OperationType.UPDATE, path);
  } finally {
    const active = pendingUpdates.get(itemId);
    if (active) {
      active.inFlight = false;
      if (active.queuedTargetQty !== undefined && active.queuedItem) {
        active.targetQty = active.queuedTargetQty;
        active.initialQty = currentTargetQty;
        active.item = active.queuedItem;
        active.reason = active.queuedReason || currentReason;
        active.note = active.queuedNote;
        delete active.queuedTargetQty;
        delete active.queuedItem;
        delete active.queuedReason;
        delete active.queuedNote;
        flushPendingUpdate(itemId);
      } else {
        pendingUpdates.delete(itemId);
      }
    }
  }
}

// Window beforeunload listener to flush any pending queue immediately
if (typeof window !== 'undefined') {
  window.addEventListener('beforeunload', () => {
    pendingUpdates.forEach((_, itemId) => {
      flushPendingUpdate(itemId);
    });
  });
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
    { includeMetadataChanges: false },
    (snapshot) => {
      setSyncStatus('connected');
      setSystemInitialized(true);

      const loaded: InventoryItem[] = [];
      snapshot.forEach((docSnap) => {
        const data = docSnap.data();
        if (data) {
          const sanitized = sanitizeItem({ ...data, id: docSnap.id });
          // Preserve local in-flight or debounced quantity changes so older snapshots never revert rapid clicks
          const pending = pendingUpdates.get(docSnap.id);
          if (pending) {
            sanitized.qty = pending.queuedTargetQty !== undefined ? pending.queuedTargetQty : pending.targetQty;
          }
          loaded.push(sanitized);
        }
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
  const pending = pendingUpdates.get(item.id);
  if (pending?.timer) {
    clearTimeout(pending.timer);
  }
  pendingUpdates.delete(item.id);

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
 * Direct quantity change with immediate local storage update and coalesced atomic cloud sync
 */
export async function updateItemQuantityInCloud(
  item: InventoryItem,
  newQty: number,
  reason: AdjustmentReason = 'Quick Adjustment',
  note?: string,
  explicitPreviousQty?: number
): Promise<void> {
  const now = Date.now();
  const fullUpdatedItem: InventoryItem = {
    ...item,
    qty: newQty,
    updatedAt: now,
  };

  // 1. Immediately update localStorage and broadcast to local tabs in 0ms
  const currentLocal = loadInventory();
  const itemExistsLocally = currentLocal.some((i) => i.id === item.id);
  const updatedLocal = itemExistsLocally
    ? currentLocal.map((it) => (it.id === item.id ? fullUpdatedItem : it))
    : [...currentLocal, fullUpdatedItem];
  saveInventory(updatedLocal);

  if (!db) return;

  const existingPending = pendingUpdates.get(item.id);
  if (existingPending) {
    if (existingPending.inFlight) {
      existingPending.queuedTargetQty = newQty;
      existingPending.queuedItem = fullUpdatedItem;
      existingPending.queuedReason = reason;
      existingPending.queuedNote = note;
    } else {
      if (existingPending.timer) {
        clearTimeout(existingPending.timer);
      }
      existingPending.targetQty = newQty;
      existingPending.item = fullUpdatedItem;
      existingPending.reason = reason;
      existingPending.note = note;
      existingPending.timer = setTimeout(() => {
        flushPendingUpdate(item.id);
      }, 150);
    }
  } else {
    const previousQty = explicitPreviousQty !== undefined ? explicitPreviousQty : item.qty;
    const newPending: PendingItemUpdate = {
      item: fullUpdatedItem,
      targetQty: newQty,
      initialQty: previousQty,
      reason,
      note,
      inFlight: false,
      timer: setTimeout(() => {
        flushPendingUpdate(item.id);
      }, 150),
    };
    pendingUpdates.set(item.id, newPending);
  }
}

/**
 * Delete an inventory item from Firestore
 */
export async function deleteItemFromCloud(itemId: string): Promise<void> {
  const pending = pendingUpdates.get(itemId);
  if (pending?.timer) {
    clearTimeout(pending.timer);
  }
  pendingUpdates.delete(itemId);

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
