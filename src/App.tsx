import React, { useState, useEffect } from 'react';
import { InventoryItem, ItemType } from './types';
import { loadInventory, saveInventory } from './utils/storage';
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
  const [activeCategory, setActiveCategory] = useState<'all' | 'tyre' | 'rim'>('tyre');
  const [showOnlyAlerts, setShowOnlyAlerts] = useState<boolean>(false);
  const [syncStatus, setSyncStatus] = useState<SyncStatus>('connecting');

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
      setItems(local);
    }

    // 2. Track real-time sync connectivity
    const unsubStatus = onSyncStatusChange((status) => {
      setSyncStatus(status);
    });

    // 3. Listen to live cloud data from Firebase
    const unsubInventory = subscribeToInventory(
      (cloudItems) => {
        setItems(cloudItems);
      },
      (err) => {
        console.warn('Real-time sync falling back to local cache:', err);
      }
    );

    return () => {
      unsubStatus();
      unsubInventory();
    };
  }, []);

  // Quick single piece +/- adjustment inline
  const handleQuickQuantityChange = (itemId: string, delta: number) => {
    const target = items.find((i) => i.id === itemId);
    if (!target) return;

    const newQty = Math.max(0, target.qty + delta);
    if (newQty === target.qty) return;

    // Optimistic UI update
    const updatedItems = items.map((it) =>
      it.id === itemId ? { ...it, qty: newQty, updatedAt: Date.now() } : it
    );
    setItems(updatedItems);
    saveInventory(updatedItems);

    // Sync to Firebase Cloud in real-time
    updateItemQuantityInCloud(
      target,
      newQty,
      delta > 0 ? 'Stock In / Restock' : 'Customer Sale'
    ).catch((err) => {
      console.error('Failed to sync qty change to cloud:', err);
    });

    showToast(
      `${target.brand} (${target.size}): ${target.qty} → ${newQty} ${
        target.type === 'tyre' ? 'pcs' : 'sets'
      }`
    );
  };

  // Direct quantity update from modal
  const handleSaveAdjustedQty = (itemId: string, newQty: number) => {
    const target = items.find((i) => i.id === itemId);
    if (!target) return;

    const updatedItems = items.map((it) =>
      it.id === itemId ? { ...it, qty: newQty, updatedAt: Date.now() } : it
    );
    setItems(updatedItems);
    saveInventory(updatedItems);

    // Sync to Firebase Cloud
    updateItemQuantityInCloud(target, newQty, 'Inventory Audit Correction').catch((err) => {
      console.error('Failed to sync adjusted qty to cloud:', err);
    });

    showToast(
      `Updated ${target.brand} (${target.size}) stock to ${newQty}`
    );
  };

  // Save new or edited item
  const handleSaveItem = (
    itemData: Omit<InventoryItem, 'id' | 'updatedAt'>,
    editId?: string
  ) => {
    if (editId) {
      // Edit existing
      const existing = items.find((i) => i.id === editId);
      const updatedItem: InventoryItem = {
        ...(existing || {}),
        ...itemData,
        id: editId,
        updatedAt: Date.now(),
      } as InventoryItem;

      const updatedItems = items.map((it) => (it.id === editId ? updatedItem : it));
      setItems(updatedItems);
      saveInventory(updatedItems);

      // Cloud save
      saveItemToCloud(updatedItem).catch(console.error);
      showToast(`Updated ${itemData.brand} in stock`);
    } else {
      // Add new
      const newItemId = `${itemData.type}-${Date.now().toString(36)}`;
      const newItem: InventoryItem = {
        ...itemData,
        id: newItemId,
        updatedAt: Date.now(),
      };
      const updatedItems = [newItem, ...items];
      setItems(updatedItems);
      saveInventory(updatedItems);

      // Cloud save
      saveItemToCloud(newItem).catch(console.error);

      // Switch category to the added item's type so user sees it immediately
      setActiveCategory(itemData.type);
      showToast(`Added ${newItem.brand} ${newItem.size} to stock`);
    }
  };

  // Delete item handler
  const handleConfirmDelete = () => {
    if (!itemToDelete) return;
    const target = itemToDelete;
    const updated = items.filter((i) => i.id !== target.id);
    setItems(updated);
    saveInventory(updated);

    // Cloud delete
    deleteItemFromCloud(target.id).catch(console.error);
    showToast(`Deleted ${target.brand} (${target.size}) from stock`);
    setItemToDelete(null);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-orange-500 selection:text-white pb-14 sm:pb-6 text-[11px]">
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
      <footer className="border-t border-slate-900 bg-slate-950/80 py-2.5 text-center text-slate-500 px-3">
        <div className="max-w-4xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-1 text-[10px]">
          <div className="font-semibold text-slate-400">
            Chattha Brothers Alloy Rims &amp; Tyres Dealer
          </div>
          <div>Size &amp; Brand Stock Directory</div>
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
