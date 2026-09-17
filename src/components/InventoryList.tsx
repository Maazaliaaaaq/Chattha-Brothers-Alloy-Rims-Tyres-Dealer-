import React, { useState, useMemo } from 'react';
import { InventoryItem, ItemType } from '../types';
import { TYRE_BRANDS, RIM_BRANDS } from '../data/defaultStock';
import {
  Search,
  Plus,
  Minus,
  SlidersHorizontal,
  Edit2,
  Trash2,
  CircleDot,
  Disc,
  AlertTriangle,
  X,
  MapPin,
  Folder,
  FolderOpen,
  ChevronDown,
  ChevronRight,
  Layers,
  FolderPlus,
} from 'lucide-react';

interface InventoryListProps {
  items: InventoryItem[];
  activeCategory: 'all' | 'tyre' | 'rim';
  setActiveCategory: (cat: 'all' | 'tyre' | 'rim') => void;
  showOnlyAlerts: boolean;
  setShowOnlyAlerts: (val: boolean) => void;
  onOpenAddModal: (type: ItemType, brand?: string) => void;
  onOpenEditModal: (item: InventoryItem) => void;
  onOpenAdjustModal: (item: InventoryItem) => void;
  onQuickQuantityChange: (itemId: string, delta: number) => void;
  onRequestDelete: (item: InventoryItem) => void;
}

export const InventoryList: React.FC<InventoryListProps> = ({
  items,
  activeCategory,
  setActiveCategory,
  showOnlyAlerts,
  setShowOnlyAlerts,
  onOpenAddModal,
  onOpenEditModal,
  onOpenAdjustModal,
  onQuickQuantityChange,
  onRequestDelete,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [stockFilter, setStockFilter] = useState<'all' | 'instock' | 'low' | 'out'>('all');

  // Track which brand folders are expanded
  const [expandedFolders, setExpandedFolders] = useState<Record<string, boolean>>({});

  const toggleFolder = (brandKey: string) => {
    setExpandedFolders((prev) => ({
      ...prev,
      [brandKey]: !prev[brandKey],
    }));
  };

  const effectiveStockFilter = showOnlyAlerts ? 'low' : stockFilter;

  // Active item type
  const targetType = activeCategory === 'rim' ? 'rim' : 'tyre';

  // Base list of predefined brands for the active category
  const baseBrands = targetType === 'tyre' ? TYRE_BRANDS : RIM_BRANDS;

  // Discover any extra custom brands the user may have added in items
  const allBrandsForType = useMemo(() => {
    const existingInItems = items
      .filter((i) => i.type === targetType)
      .map((i) => i.brand);
    const combined = Array.from(new Set([...baseBrands, ...existingInItems]));
    return combined;
  }, [baseBrands, items, targetType]);

  // Group items by brand
  const brandGroups = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();

    return allBrandsForType
      .map((brandName) => {
        const brandItems = items.filter(
          (item) => item.type === targetType && item.brand === brandName
        );

        // Apply filters (stock status & search)
        const matchingItems = brandItems.filter((item) => {
          if (effectiveStockFilter === 'instock' && item.qty === 0) return false;
          if (effectiveStockFilter === 'low' && item.qty > item.minQty) return false;
          if (effectiveStockFilter === 'out' && item.qty > 0) return false;

          if (term) {
            const matchesBrand = item.brand.toLowerCase().includes(term);
            const matchesSize = item.size.toLowerCase().includes(term);
            const matchesModel = item.model.toLowerCase().includes(term);
            const matchesRack = item.rack.toLowerCase().includes(term);
            const matchesPcd = item.pcd?.toLowerCase().includes(term);
            if (!matchesBrand && !matchesSize && !matchesModel && !matchesRack && !matchesPcd) {
              return false;
            }
          }
          return true;
        });

        const totalQty = brandItems.reduce((sum, it) => sum + it.qty, 0);
        const lowCount = brandItems.filter((it) => it.qty <= it.minQty).length;
        const outCount = brandItems.filter((it) => it.qty === 0).length;

        return {
          brand: brandName,
          allItemsCount: brandItems.length,
          totalQty,
          lowCount,
          outCount,
          matchingItems,
        };
      })
      .filter((group) => {
        // If searching or filtering by alert, only show folders with matching items
        if (searchTerm.trim() || effectiveStockFilter !== 'all') {
          return group.matchingItems.length > 0;
        }
        return true;
      });
  }, [allBrandsForType, items, targetType, effectiveStockFilter, searchTerm]);

  // If searching, automatically expand matching folders
  const isSearching = Boolean(searchTerm.trim());

  // Expand / Collapse all handlers
  const handleExpandAll = () => {
    const next: Record<string, boolean> = {};
    brandGroups.forEach((g) => {
      next[`${targetType}-${g.brand}`] = true;
    });
    setExpandedFolders(next);
  };

  const handleCollapseAll = () => {
    setExpandedFolders({});
  };

  const totalMatchingSizes = brandGroups.reduce(
    (sum, g) => sum + g.matchingItems.length,
    0
  );

  return (
    <div className="space-y-2.5 text-[11px]">
      {/* Category Tabs: Tyres vs Alloy Rims Folder Switcher */}
      <div className="flex bg-slate-900/90 p-1 rounded-lg border border-slate-800">
        <button
          onClick={() => {
            setActiveCategory('tyre');
            setShowOnlyAlerts(false);
          }}
          className={`flex-1 py-1.5 px-2 rounded-md font-bold text-[11px] flex items-center justify-center gap-1.5 transition active:scale-98 ${
            activeCategory === 'tyre'
              ? 'bg-orange-500 text-white shadow-sm'
              : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
          }`}
        >
          <CircleDot className="w-3 h-3" />
          <span>Tyres Brand Folders</span>
        </button>

        <button
          onClick={() => {
            setActiveCategory('rim');
            setShowOnlyAlerts(false);
          }}
          className={`flex-1 py-1.5 px-2 rounded-md font-bold text-[11px] flex items-center justify-center gap-1.5 transition active:scale-98 ${
            activeCategory === 'rim'
              ? 'bg-amber-500 text-white shadow-sm'
              : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
          }`}
        >
          <Disc className="w-3 h-3" />
          <span>Alloy Rims Brand Folders</span>
        </button>
      </div>

      {/* Search & Stock Filter Bar */}
      <div className="space-y-1.5">
        {/* Search input */}
        <div className="relative">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder={
              targetType === 'tyre'
                ? 'Search tyre size (195/65, 175/70) or brand (Rotalla, General)...'
                : 'Search rim size (15 inch, 17 inch) or brand (Vossen, Spartx)...'
            }
            className="w-full bg-slate-900 border border-slate-800 rounded-lg pl-8 pr-7 py-1.5 text-[11px] text-white placeholder:text-slate-500 focus:outline-none focus:border-orange-500 transition"
          />
          {searchTerm && (
            <button
              onClick={() => setSearchTerm('')}
              className="absolute right-2 top-1/2 -translate-y-1/2 p-0.5 text-slate-400 hover:text-white"
            >
              <X className="w-3 h-3" />
            </button>
          )}
        </div>

        {/* Filter Bar & Controls */}
        <div className="flex items-center justify-between gap-1 flex-wrap text-[10px]">
          {/* Quick status filters */}
          <div className="flex items-center gap-1">
            <button
              onClick={() => {
                setShowOnlyAlerts(false);
                setStockFilter('all');
              }}
              className={`px-2 py-0.5 rounded font-medium transition border ${
                !showOnlyAlerts && stockFilter === 'all'
                  ? 'bg-slate-800 text-white border-slate-700'
                  : 'bg-slate-950 text-slate-400 border-slate-800 hover:text-slate-200'
              }`}
            >
              All Folders
            </button>
            <button
              onClick={() => {
                setShowOnlyAlerts(false);
                setStockFilter('instock');
              }}
              className={`px-2 py-0.5 rounded font-medium transition border ${
                !showOnlyAlerts && stockFilter === 'instock'
                  ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/50'
                  : 'bg-slate-950 text-slate-400 border-slate-800 hover:text-slate-200'
              }`}
            >
              In Stock
            </button>
            <button
              onClick={() => {
                setShowOnlyAlerts(true);
                setStockFilter('low');
              }}
              className={`px-2 py-0.5 rounded font-medium transition border flex items-center gap-1 ${
                showOnlyAlerts || stockFilter === 'low'
                  ? 'bg-amber-500/20 text-amber-300 border-amber-500/50'
                  : 'bg-slate-950 text-slate-400 border-slate-800 hover:text-slate-200'
              }`}
            >
              <AlertTriangle className="w-2.5 h-2.5" />
              <span>Low Alert</span>
            </button>
          </div>

          {/* Expand/Collapse All */}
          <div className="flex items-center gap-1.5 text-slate-400">
            <button
              onClick={handleExpandAll}
              className="hover:text-white underline underline-offset-2 flex items-center gap-0.5 text-[10px]"
            >
              <Layers className="w-2.5 h-2.5" />
              <span>Expand All</span>
            </button>
            <span>•</span>
            <button
              onClick={handleCollapseAll}
              className="hover:text-white underline underline-offset-2 text-[10px]"
            >
              Collapse
            </button>
          </div>
        </div>
      </div>

      {/* Brand Folders Section Header */}
      <div className="flex items-center justify-between text-[10px] text-slate-400 px-0.5">
        <span className="font-semibold uppercase tracking-wider text-slate-400">
          📁 {targetType === 'tyre' ? 'Tyre Brands' : 'Alloy Rim Brands'} ({brandGroups.length} Folders)
        </span>
        <span>{totalMatchingSizes} total sizes</span>
      </div>

      {/* Empty state */}
      {brandGroups.length === 0 ? (
        <div className="bg-slate-900/60 border border-slate-800/80 rounded-xl p-5 text-center space-y-1.5">
          <AlertTriangle className="w-4 h-4 text-slate-400 mx-auto" />
          <h3 className="text-xs font-bold text-white">No matching brand folders</h3>
          <p className="text-[10px] text-slate-400">
            No stock sizes match your active search or filter.
          </p>
          <button
            onClick={() => {
              setSearchTerm('');
              setShowOnlyAlerts(false);
              setStockFilter('all');
            }}
            className="px-2.5 py-1 rounded-md bg-slate-800 hover:bg-slate-700 text-[11px] font-medium text-slate-200 mt-1"
          >
            Clear Filters
          </button>
        </div>
      ) : (
        /* List of Brand Folders */
        <div className="space-y-2">
          {brandGroups.map((group) => {
            const folderKey = `${targetType}-${group.brand}`;
            const isOpen = isSearching || Boolean(expandedFolders[folderKey]);
            const sizesCount = group.matchingItems.length;
            const unit = targetType === 'tyre' ? 'pcs' : 'sets';

            return (
              <div
                key={group.brand}
                className={`bg-slate-900/90 border rounded-xl overflow-hidden transition shadow-sm ${
                  isOpen
                    ? 'border-orange-500/40 ring-1 ring-orange-500/20'
                    : group.outCount > 0
                    ? 'border-rose-500/30'
                    : group.lowCount > 0
                    ? 'border-amber-500/30'
                    : 'border-slate-800 hover:border-slate-700'
                }`}
              >
                {/* Brand Folder Tab Header - Click to open/close */}
                <div
                  onClick={() => toggleFolder(folderKey)}
                  className={`px-3 py-2.5 flex items-center justify-between cursor-pointer select-none transition ${
                    isOpen
                      ? 'bg-slate-800/80 border-b border-slate-800'
                      : 'hover:bg-slate-800/50'
                  }`}
                >
                  <div className="flex items-center gap-2 min-w-0">
                    {/* Folder Icon */}
                    <div
                      className={`p-1.5 rounded-lg flex items-center justify-center flex-shrink-0 ${
                        isOpen
                          ? 'bg-orange-500 text-white shadow-sm'
                          : 'bg-slate-800 text-orange-400 border border-slate-700'
                      }`}
                    >
                      {isOpen ? (
                        <FolderOpen className="w-3.5 h-3.5" />
                      ) : (
                        <Folder className="w-3.5 h-3.5" />
                      )}
                    </div>

                    {/* Brand Title & Sizes summary */}
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <h3 className="text-xs font-bold text-white truncate">
                          {group.brand}
                        </h3>

                        {/* Status alert pill */}
                        {group.outCount > 0 ? (
                          <span className="text-[8px] font-bold px-1.5 py-0.2 rounded bg-rose-500/20 text-rose-300 border border-rose-500/40">
                            {group.outCount} Out
                          </span>
                        ) : group.lowCount > 0 ? (
                          <span className="text-[8px] font-bold px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-300 border border-amber-500/40">
                            {group.lowCount} Low
                          </span>
                        ) : null}
                      </div>

                      <p className="text-[9px] text-slate-400 mt-0.5">
                        <span className="text-orange-400 font-semibold">
                          {sizesCount} {sizesCount === 1 ? 'size' : 'sizes'} available
                        </span>{' '}
                        • {group.totalQty} {unit} total in stock
                      </p>
                    </div>
                  </div>

                  {/* Right side: Chevron */}
                  <div className="flex items-center gap-1 text-slate-400">
                    <span className="text-[9px] font-medium hidden sm:inline">
                      {isOpen ? 'Close' : 'Tap to View Sizes'}
                    </span>
                    {isOpen ? (
                      <ChevronDown className="w-3.5 h-3.5 text-orange-400" />
                    ) : (
                      <ChevronRight className="w-3.5 h-3.5" />
                    )}
                  </div>
                </div>

                {/* Folder Contents: Available Sizes of that Brand */}
                {isOpen && (
                  <div className="p-2.5 bg-slate-950/60 space-y-2 animate-fadeIn">
                    {/* Header inside folder */}
                    <div className="flex items-center justify-between px-1 text-[10px] text-slate-400 border-b border-slate-800/80 pb-1.5">
                      <span className="font-semibold text-slate-300">
                        Available Sizes for {group.brand}:
                      </span>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onOpenAddModal(targetType, group.brand);
                        }}
                        className="text-orange-400 hover:text-orange-300 font-semibold flex items-center gap-0.5"
                      >
                        <Plus className="w-2.5 h-2.5" />
                        <span>Add Size</span>
                      </button>
                    </div>

                    {/* Sizes List or Empty State */}
                    {group.matchingItems.length === 0 ? (
                      <div className="p-3 text-center text-slate-500 text-[10px] bg-slate-900/40 rounded-lg">
                        No sizes currently in stock for {group.brand}.
                        <button
                          type="button"
                          onClick={() => onOpenAddModal(targetType, group.brand)}
                          className="block mx-auto mt-1 text-orange-400 hover:underline font-semibold"
                        >
                          + Add first size for {group.brand}
                        </button>
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {group.matchingItems.map((item) => {
                          const isLow = item.qty <= item.minQty && item.qty > 0;
                          const isZero = item.qty === 0;

                          return (
                            <div
                              key={item.id}
                              className={`bg-slate-900 border rounded-lg p-2.5 transition flex flex-col justify-between ${
                                isZero
                                  ? 'border-rose-500/40 bg-rose-950/10'
                                  : isLow
                                  ? 'border-amber-500/40 bg-amber-950/10'
                                  : 'border-slate-800/90 hover:border-slate-700'
                              }`}
                            >
                              {/* Top row: Size, Condition, Badges & Actions */}
                              <div>
                                <div className="flex items-start justify-between gap-1.5">
                                  <div className="min-w-0">
                                    <div className="flex items-center gap-1 flex-wrap">
                                      <span className="text-[12px] font-bold text-orange-400 leading-tight">
                                        {item.size}
                                      </span>
                                      <span
                                        className={`text-[8px] font-bold px-1 py-0.2 rounded uppercase ${
                                          item.condition === 'New'
                                            ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                                            : 'bg-purple-500/15 text-purple-400 border border-purple-500/30'
                                        }`}
                                      >
                                        {item.condition}
                                      </span>
                                      {isZero ? (
                                        <span className="text-[8px] font-bold px-1 py-0.2 rounded bg-rose-500 text-white">
                                          0 ZERO
                                        </span>
                                      ) : isLow ? (
                                        <span className="text-[8px] font-bold px-1 py-0.2 rounded bg-amber-500/20 text-amber-300 border border-amber-500/40">
                                          LOW (≤{item.minQty})
                                        </span>
                                      ) : null}
                                    </div>

                                    {item.model && (
                                      <p className="text-[10px] text-slate-400 truncate mt-0.5">
                                        {item.model}
                                      </p>
                                    )}
                                  </div>

                                  {/* Edit & Delete Action Buttons */}
                                  <div className="flex items-center gap-1 flex-shrink-0">
                                    <button
                                      type="button"
                                      onClick={() => onOpenEditModal(item)}
                                      className="p-1 rounded bg-slate-800 text-slate-400 hover:text-white hover:bg-slate-700 transition"
                                      title="Edit details"
                                    >
                                      <Edit2 className="w-3 h-3" />
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => onRequestDelete(item)}
                                      className="p-1 rounded bg-slate-800 text-slate-400 hover:text-rose-400 hover:bg-rose-500/20 transition"
                                      title="Delete size"
                                    >
                                      <Trash2 className="w-3 h-3 text-rose-400" />
                                    </button>
                                  </div>
                                </div>

                                {/* Location & PCD (if Rim) */}
                                <div className="mt-1 flex items-center justify-between gap-1 text-[9px] text-slate-400">
                                  {item.pcd ? (
                                    <span>PCD: <strong className="text-slate-200">{item.pcd}</strong></span>
                                  ) : (
                                    <span>Type: <strong>{item.brand}</strong></span>
                                  )}
                                  {item.rack && (
                                    <span className="flex items-center gap-0.5 text-slate-400">
                                      <MapPin className="w-2 h-2 text-slate-500" />
                                      {item.rack}
                                    </span>
                                  )}
                                </div>
                              </div>

                              {/* Bottom row: Stepper, Quantity & Adjust */}
                              <div className="mt-2 pt-1.5 border-t border-slate-800/80 flex items-center justify-between gap-1.5">
                                <div className="flex items-center gap-1">
                                  <button
                                    type="button"
                                    onClick={() => onQuickQuantityChange(item.id, -1)}
                                    disabled={item.qty <= 0}
                                    className={`w-7 h-7 rounded font-bold text-xs flex items-center justify-center transition active:scale-90 ${
                                      item.qty <= 0
                                        ? 'bg-slate-800/40 text-slate-600 cursor-not-allowed'
                                        : 'bg-slate-800 hover:bg-slate-700 text-rose-400 border border-slate-700'
                                    }`}
                                    title="Decrease (-1)"
                                  >
                                    <Minus className="w-3 h-3" />
                                  </button>

                                  <div className="min-w-[40px] text-center px-0.5">
                                    <span
                                      className={`text-sm font-bold leading-none block ${
                                        item.qty === 0
                                          ? 'text-rose-400'
                                          : item.qty <= item.minQty
                                          ? 'text-amber-400'
                                          : 'text-emerald-400'
                                      }`}
                                    >
                                      {item.qty}
                                    </span>
                                    <span className="text-[8px] uppercase text-slate-500 block leading-tight">
                                      {targetType === 'tyre' ? 'pcs' : 'sets'}
                                    </span>
                                  </div>

                                  <button
                                    type="button"
                                    onClick={() => onQuickQuantityChange(item.id, 1)}
                                    className="w-7 h-7 rounded font-bold text-xs bg-slate-800 hover:bg-slate-700 text-emerald-400 border border-slate-700 flex items-center justify-center transition active:scale-90"
                                    title="Increase (+1)"
                                  >
                                    <Plus className="w-3 h-3" />
                                  </button>
                                </div>

                                <button
                                  type="button"
                                  onClick={() => onOpenAdjustModal(item)}
                                  className="flex-1 py-1 px-1.5 rounded bg-slate-800 hover:bg-slate-700 text-[10px] font-semibold text-slate-200 border border-slate-700 flex items-center justify-center gap-1 active:scale-95 transition"
                                >
                                  <SlidersHorizontal className="w-2.5 h-2.5 text-orange-400" />
                                  <span>Adjust</span>
                                </button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}

                    {/* Quick Add Size to Brand Button inside Folder */}
                    <button
                      type="button"
                      onClick={() => onOpenAddModal(targetType, group.brand)}
                      className="w-full py-1.5 px-2 rounded-lg border border-dashed border-slate-800 hover:border-orange-500/50 bg-slate-900/40 hover:bg-slate-800/60 text-slate-400 hover:text-orange-400 text-[10px] font-semibold flex items-center justify-center gap-1 transition"
                    >
                      <FolderPlus className="w-3 h-3" />
                      <span>+ Add new size to {group.brand}</span>
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Floating Action Button for Mobile Add */}
      <div className="fixed bottom-4 right-4 sm:hidden z-30">
        <button
          onClick={() => onOpenAddModal(targetType)}
          className="w-10 h-10 rounded-full bg-orange-500 hover:bg-orange-600 text-white shadow-lg shadow-orange-500/40 flex items-center justify-center active:scale-90 transition border border-orange-400"
          title="Add Stock"
        >
          <Plus className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
