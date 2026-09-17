import React from 'react';
import { InventoryItem } from '../types';
import { Plus, CircleDot, Disc, AlertTriangle, Cloud, CloudCheck, RefreshCw } from 'lucide-react';
import { SyncStatus } from '../services/inventoryService';

interface HeaderProps {
  items: InventoryItem[];
  activeCategory: 'all' | 'tyre' | 'rim';
  setActiveCategory: (cat: 'all' | 'tyre' | 'rim') => void;
  showOnlyAlerts: boolean;
  setShowOnlyAlerts: (val: boolean | ((prev: boolean) => boolean)) => void;
  onOpenAddModal: (type?: 'tyre' | 'rim') => void;
  syncStatus?: SyncStatus;
}

export const Header: React.FC<HeaderProps> = ({
  items,
  activeCategory,
  setActiveCategory,
  showOnlyAlerts,
  setShowOnlyAlerts,
  onOpenAddModal,
  syncStatus = 'connecting',
}) => {
  const tyreItems = items.filter((i) => i.type === 'tyre');
  const rimItems = items.filter((i) => i.type === 'rim');

  const totalTyreQty = tyreItems.reduce((sum, i) => sum + i.qty, 0);
  const totalRimQty = rimItems.reduce((sum, i) => sum + i.qty, 0);

  const lowStockItems = items.filter((i) => i.qty <= i.minQty);
  const outOfStockCount = items.filter((i) => i.qty === 0).length;

  return (
    <header className="sticky top-0 z-40 bg-slate-950/95 backdrop-blur-md border-b border-slate-800/90 shadow-sm">
      <div className="max-w-5xl mx-auto px-3 py-2">
        {/* Main Row: Shop Name & Add Button */}
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-1.5 min-w-0">
            <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-orange-500 to-amber-600 flex items-center justify-center text-white shadow-sm flex-shrink-0">
              <CircleDot className="w-3.5 h-3.5" />
            </div>
            <div className="min-w-0">
              <h1 className="text-xs font-bold text-white leading-tight truncate">
                Chattha Brothers
              </h1>
              <p className="text-[9px] font-medium text-orange-400 leading-tight truncate">
                Alloy Rims &amp; Tyres Dealer
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 flex-shrink-0">
            {/* Real-time Cloud Sync Pill */}
            {syncStatus === 'connected' ? (
              <div
                title="Connected to Firebase Cloud Database (Real-time sync active)"
                className="flex items-center gap-1 px-2 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-[9px] font-medium"
              >
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                <span className="hidden xs:inline sm:inline">Cloud Realtime</span>
                <span className="xs:hidden sm:hidden">Live</span>
              </div>
            ) : syncStatus === 'connecting' ? (
              <div
                title="Connecting to Firebase Cloud..."
                className="flex items-center gap-1 px-2 py-1 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-400 text-[9px] font-medium"
              >
                <RefreshCw className="w-2.5 h-2.5 animate-spin" />
                <span className="hidden xs:inline">Syncing...</span>
              </div>
            ) : (
              <div
                title="Offline local storage mode"
                className="flex items-center gap-1 px-2 py-1 rounded-full bg-slate-800 border border-slate-700 text-slate-400 text-[9px]"
              >
                <span className="w-1.5 h-1.5 rounded-full bg-slate-500" />
                <span>Offline</span>
              </div>
            )}

            <button
              onClick={() => onOpenAddModal(activeCategory === 'rim' ? 'rim' : 'tyre')}
              className="px-2.5 py-1.5 rounded-lg bg-orange-500 hover:bg-orange-600 text-white text-[11px] font-semibold flex items-center gap-1 shadow-sm active:scale-95 transition"
            >
              <Plus className="w-3 h-3" />
              <span>Add Stock</span>
            </button>
          </div>
        </div>

        {/* Quick Stock Summary Bar */}
        <div className="mt-2 grid grid-cols-3 gap-1.5">
          {/* Tyres Count */}
          <button
            onClick={() => {
              setActiveCategory('tyre');
              setShowOnlyAlerts(false);
            }}
            className={`p-1.5 sm:p-2 rounded-lg border text-left transition flex items-center gap-1.5 ${
              activeCategory === 'tyre' && !showOnlyAlerts
                ? 'bg-orange-500/15 border-orange-500/50 text-orange-300 ring-1 ring-orange-500/30'
                : 'bg-slate-900/80 border-slate-800 text-slate-300 hover:bg-slate-800/60'
            }`}
          >
            <div className="w-5 h-5 rounded bg-orange-500/20 text-orange-400 flex items-center justify-center flex-shrink-0">
              <CircleDot className="w-3 h-3" />
            </div>
            <div className="min-w-0">
              <span className="text-[8px] uppercase font-bold text-slate-400 block truncate leading-none mb-0.5">
                Tyres
              </span>
              <span className="text-[11px] sm:text-xs font-bold text-white leading-none">
                {totalTyreQty} <span className="text-[8px] font-normal text-slate-400">pcs</span>
              </span>
            </div>
          </button>

          {/* Alloy Rims Count */}
          <button
            onClick={() => {
              setActiveCategory('rim');
              setShowOnlyAlerts(false);
            }}
            className={`p-1.5 sm:p-2 rounded-lg border text-left transition flex items-center gap-1.5 ${
              activeCategory === 'rim' && !showOnlyAlerts
                ? 'bg-amber-500/15 border-amber-500/50 text-amber-300 ring-1 ring-amber-500/30'
                : 'bg-slate-900/80 border-slate-800 text-slate-300 hover:bg-slate-800/60'
            }`}
          >
            <div className="w-5 h-5 rounded bg-amber-500/20 text-amber-400 flex items-center justify-center flex-shrink-0">
              <Disc className="w-3 h-3" />
            </div>
            <div className="min-w-0">
              <span className="text-[8px] uppercase font-bold text-slate-400 block truncate leading-none mb-0.5">
                Rims
              </span>
              <span className="text-[11px] sm:text-xs font-bold text-white leading-none">
                {totalRimQty} <span className="text-[8px] font-normal text-slate-400">sets</span>
              </span>
            </div>
          </button>

          {/* Low Stock Alerts */}
          <button
            onClick={() => setShowOnlyAlerts((prev) => !prev)}
            className={`p-1.5 sm:p-2 rounded-lg border text-left transition flex items-center gap-1.5 ${
              showOnlyAlerts
                ? 'bg-rose-500/20 border-rose-500 text-rose-200 ring-1 ring-rose-500'
                : lowStockItems.length > 0
                ? 'bg-rose-500/10 border-rose-500/30 text-rose-300 hover:bg-rose-500/20'
                : 'bg-slate-900/80 border-slate-800 text-slate-400'
            }`}
          >
            <div
              className={`w-5 h-5 rounded flex items-center justify-center flex-shrink-0 ${
                lowStockItems.length > 0
                  ? 'bg-rose-500/20 text-rose-400 animate-pulse'
                  : 'bg-slate-800 text-slate-500'
              }`}
            >
              <AlertTriangle className="w-3 h-3" />
            </div>
            <div className="min-w-0">
              <span className="text-[8px] uppercase font-bold text-slate-400 block truncate leading-none mb-0.5">
                Alerts
              </span>
              <span
                className={`text-[11px] sm:text-xs font-bold leading-none ${
                  lowStockItems.length > 0 ? 'text-rose-400' : 'text-slate-400'
                }`}
              >
                {lowStockItems.length}
                {outOfStockCount > 0 && (
                  <span className="text-[8px] text-rose-300 font-semibold ml-0.5">
                    ({outOfStockCount} zero)
                  </span>
                )}
              </span>
            </div>
          </button>
        </div>
      </div>
    </header>
  );
};
