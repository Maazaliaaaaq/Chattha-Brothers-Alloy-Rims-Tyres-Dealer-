import React, { useState, useEffect, useRef } from 'react';
import { InventoryItem, ItemType } from './types';
import { loadInventory, saveInventory, onLocalSyncMessage } from './utils/storage';
import {
  subscribeToInventory,
  saveItemToCloud,
  updateItemQuantityInCloud,
  deleteItemFromCloud,
  onSyncStatusChange,
  SyncStatus,
} from './services/inventoryService';
import { Header } from './components/Header';
import { InventoryList } from './components/InventoryList';
import { ItemModal } from './components/ItemModal';
import { AdjustStockModal } from './components/AdjustStockModal';
import { ConfirmModal } from './components/ConfirmModal';
import { CheckCircle2 } from 'lucide-react';

export default function App() {
  const [items, setItems] = useState<InventoryItem[]>([]);
  const itemsRef = useRef<InventoryItem[]>([]);
  const [activeCategory, setActiveCategory] = useState<'all' | 'tyre' | 'rim'>('tyre');
  const [showOnlyAlerts, setShowOnlyAlerts] = useState<boolean>(false);
  const [syncStatus, setSyncStatus] = useState<SyncStatus>('connecting');

  // Keep itemsRef always synchronously updated
  useEffect(() => {
    itemsRef.current = items;
  }, [items]);

  // Modals state
  const [isItemModalOpen, setIsItemModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<InventoryItem | null>(null);
  const [initialItemType, setInitialItemType] = useState<ItemType>('tyre');
  const [initialItemBrand, setInitialItemBrand] = useState<string | undefined>(undefined);
  const [initialItemSize, setInitialItemSize] = useState<string | undefined>(undefined);

  const [isAdjustModalOpen, setIsAdjustModalOpen] = useState(false);
  const [adjustingItem, setAdjustingItem] = useState<InventoryItem | null>(null);

  // Delete confirmation modal state
  const [itemToDelete, setItemToDelete] = useState<InventoryItem | null>(null);

  // Toast notification state
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(null);
    }, 2400);
  };

  // Real-time Firebase subscription & local cache initialization
  useEffect(() => {
    // 1. Immediately hydrate with cached local data to avoid empty flash
    const local = loadInventory();
    if (local && local.length > 0) {
      itemsRef.current = local;
      setItems(local);
    }

    // 2. Track real-time sync connectivity
    const unsubStatus = onSyncStatusChange((status) => {
      setSyncStatus(status);
    });

    // 3. Instant local cross-tab / window sync
    const unsubLocalSync = onLocalSyncMessage((syncedItems) => {
      itemsRef.current = syncedItems;
      setItems(syncedItems);
    });

    // 4. Listen to live cloud data from Firebase
    const unsubInventory = subscribeToInventory(
      (cloudItems) => {
        itemsRef.current = cloudItems;
        setItems(cloudItems);
      },
      (err) => {
        console.warn('Real-time sync falling back to local cache:', err);
      }
    );

    return () => {
      unsubStatus();
      unsubLocalSync();
      unsubInventory();
    };
  }, []);

  // Quick single piece +/- adjustment inline
  const handleQuickQuantityChange = async (itemId: string, delta: number) => {
    // Read from synchronous itemsRef so rapid clicks in succession always see the latest quantity
    const currentList = itemsRef.current.length > 0 ? itemsRef.current : (items.length > 0 ? items : loadInventory());
    const currentItem = currentList.find((i) => i.id === itemId);
    if (!currentItem) return;

    const oldQty = currentItem.qty;
    const targetNewQty = Math.max(0, oldQty + delta);
    if (targetNewQty === oldQty) return;

    const now = Date.now();
    const updatedItem: InventoryItem = {
      ...currentItem,
      qty: targetNewQty,
      updatedAt: now,
    };

    // Synchronously update itemsRef immediately so the next rapid click in 5ms reads targetNewQty
    const nextList = currentList.map((it) => (it.id === itemId ? updatedItem : it));
    itemsRef.current = nextList;
    setItems(nextList);
    saveInventory(nextList);

    showToast(
      `${updatedItem.brand} (${updatedItem.size}): ${oldQty} → ${targetNewQty} ${
        updatedItem.type === 'tyre' ? 'pcs' : 'sets'
      }`
    );

    // Sync to Firebase Cloud in real-time with atomic coalesced queue
    try {
      await updateItemQuantityInCloud(
        updatedItem,
        targetNewQty,
        delta > 0 ? 'Stock In / Restock' : 'Customer Sale',
        undefined,
        oldQty
      );
    } catch (err) {
      console.error('Failed to sync qty change to cloud:', err);
    }
  };

  // Direct quantity update from modal
  const handleSaveAdjustedQty = async (itemId: string, newQty: number) => {
    const currentList = itemsRef.current.length > 0 ? itemsRef.current : (items.length > 0 ? items : loadInventory());
    const currentItem = currentList.find((i) => i.id === itemId);
    if (!currentItem) return;

    const oldQty = currentItem.qty;
    if (newQty === oldQty) return;

    const now = Date.now();
    const updatedItem: InventoryItem = {
      ...currentItem,
      qty: newQty,
      updatedAt: now,
    };

    const nextList = currentList.map((it) => (it.id === itemId ? updatedItem : it));
    itemsRef.current = nextList;
    setItems(nextList);
    saveInventory(nextList);

    showToast(`Updated ${updatedItem.brand} (${updatedItem.size}) stock to ${newQty}`);

    // Sync to Firebase Cloud immediately
    try {
      await updateItemQuantityInCloud(updatedItem, newQty, 'Inventory Audit Correction', undefined, oldQty);
    } catch (err) {
      console.error('Failed to sync adjusted qty to cloud:', err);
    }
  };

  // Save new or edited item
  const handleSaveItem = async (
    itemData: Omit<InventoryItem, 'id' | 'updatedAt'>,
    editId?: string
  ) => {
    const now = Date.now();
    const currentList = itemsRef.current.length > 0 ? itemsRef.current : (items.length > 0 ? items : loadInventory());

    if (editId) {
      // Edit existing
      const existing = currentList.find((i) => i.id === editId);
      const updatedItem: InventoryItem = {
        ...(existing || {}),
        ...itemData,
        id: editId,
        updatedAt: now,
      } as InventoryItem;

      const nextList = currentList.map((it) => (it.id === editId ? updatedItem : it));
      itemsRef.current = nextList;
      setItems(nextList);
      saveInventory(nextList);

      showToast(`Updated ${itemData.brand} in stock`);

      // Cloud save
      try {
        await saveItemToCloud(updatedItem);
      } catch (err) {
        console.error('Failed to sync item update to cloud:', err);
      }
    } else {
      // Add new
      const newItemId = `${itemData.type}-${now.toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
      const newItem: InventoryItem = {
        ...itemData,
        id: newItemId,
        updatedAt: now,
      };

      const nextList = [newItem, ...currentList.filter((it) => it.id !== newItemId)];
      itemsRef.current = nextList;
      setItems(nextList);
      saveInventory(nextList);

      // Switch category to the added item's type so user sees it immediately
      setActiveCategory(itemData.type);
      showToast(`Added ${newItem.brand} ${newItem.size} to stock`);

      // Cloud save
      try {
        await saveItemToCloud(newItem);
      } catch (err) {
        console.error('Failed to sync new item to cloud:', err);
      }
    }
  };

  // Delete item handler
  const handleConfirmDelete = async () => {
    if (!itemToDelete) return;
    const target = itemToDelete;
    setItemToDelete(null);

    const currentList = itemsRef.current.length > 0 ? itemsRef.current : (items.length > 0 ? items : loadInventory());
    const nextList = currentList.filter((i) => i.id !== target.id);
    itemsRef.current = nextList;
    setItems(nextList);
    saveInventory(nextList);

    showToast(`Deleted ${target.brand} (${target.size}) from stock`);

    // Cloud delete
    try {
      await deleteItemFromCloud(target.id);
    } catch (err) {
      console.error('Failed to sync item deletion to cloud:', err);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col font-sans selection:bg-orange-500 selection:text-white pb-14 sm:pb-6 text-[11px]">
      {/* Top Header */}
      <Header
        items={items}
        activeCategory={activeCategory}
        setActiveCategory={setActiveCategory}
        showOnlyAlerts={showOnlyAlerts}
        setShowOnlyAlerts={setShowOnlyAlerts}
        syncStatus={syncStatus}
        onOpenAddModal={(t) => {
          setEditingItem(null);
          setInitialItemType(t || 'tyre');
          setInitialItemBrand(undefined);
          setInitialItemSize(undefined);
          setIsItemModalOpen(true);
        }}
      />

      {/* Main Stock Content Area with Size Catalog */}
      <main className="flex-1 max-w-4xl w-full mx-auto px-2.5 sm:px-4 py-2.5 sm:py-3">
        <InventoryList
          items={items}
          activeCategory={activeCategory}
          setActiveCategory={setActiveCategory}
          showOnlyAlerts={showOnlyAlerts}
          setShowOnlyAlerts={setShowOnlyAlerts}
          onOpenAddModal={(t, brand, size) => {
            setEditingItem(null);
            setInitialItemType(t);
            setInitialItemBrand(brand);
            setInitialItemSize(size);
            setIsItemModalOpen(true);
          }}
          onOpenEditModal={(item) => {
            setEditingItem(item);
            setIsItemModalOpen(true);
          }}
          onOpenAdjustModal={(item) => {
            setAdjustingItem(item);
            setIsAdjustModalOpen(true);
          }}
          onQuickQuantityChange={handleQuickQuantityChange}
          onRequestDelete={(item) => setItemToDelete(item)}
        />
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-200 bg-white py-2.5 text-center text-slate-500 px-3 shadow-2xs">
        <div className="max-w-4xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-1 text-[10px]">
          <div className="font-semibold text-slate-700">
            Chattha Brothers Alloy Rims &amp; Tyres Dealer
          </div>
          <div className="text-slate-500">Size &amp; Brand Stock Directory</div>
        </div>
      </footer>

      {/* Add / Edit Item Modal */}
      {isItemModalOpen && (
        <ItemModal
          isOpen={isItemModalOpen}
          onClose={() => {
            setIsItemModalOpen(false);
            setEditingItem(null);
            setInitialItemBrand(undefined);
            setInitialItemSize(undefined);
          }}
          onSave={handleSaveItem}
          editingItem={editingItem}
          initialType={initialItemType}
          initialBrand={initialItemBrand}
          initialSize={initialItemSize}
        />
      )}

      {/* Adjust Stock Quantity Modal */}
      {isAdjustModalOpen && adjustingItem && (
        <AdjustStockModal
          item={adjustingItem}
          isOpen={isAdjustModalOpen}
          onClose={() => {
            setIsAdjustModalOpen(false);
            setAdjustingItem(null);
          }}
          onSaveQty={handleSaveAdjustedQty}
        />
      )}

      {/* Delete Item Confirmation Modal (In-App dialog, works 100% in iframe) */}
      <ConfirmModal
        isOpen={Boolean(itemToDelete)}
        title="Delete Stock Item"
        message="Remove this item from the stock directory?"
        itemName={itemToDelete ? `${itemToDelete.brand} - ${itemToDelete.size}` : undefined}
        itemDetail={
          itemToDelete
            ? `Current in-stock: ${itemToDelete.qty} ${
                itemToDelete.type === 'tyre' ? 'pcs' : 'sets'
              } (${itemToDelete.condition})`
            : undefined
        }
        confirmText="Delete"
        cancelText="Cancel"
        isDestructive={true}
        onConfirm={handleConfirmDelete}
        onClose={() => setItemToDelete(null)}
      />

      {/* Instant Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-white text-[11px] font-semibold shadow-2xl backdrop-blur-md animate-fadeIn">
          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}
    </div>
  );
}
