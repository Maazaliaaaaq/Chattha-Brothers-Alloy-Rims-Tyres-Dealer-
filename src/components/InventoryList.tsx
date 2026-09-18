import React, { useState, useMemo } from 'react';
import { InventoryItem, ItemType } from '../types';
import { TYRE_BRANDS, RIM_BRANDS, POPULAR_TYRE_SIZES, POPULAR_RIM_SIZES } from '../data/defaultStock';
import { parseItemSize, compareSizes } from '../utils/sizeUtils';
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
  ChevronDown,
  ChevronRight,
  Layers,
  Sparkles,
  PhoneCall,
  ArrowUpDown,
} from 'lucide-react';

interface StockItemEmblemProps {
  type: ItemType;
  isOpen?: boolean;
  diameter?: number;
  className?: string;
}

const StockItemEmblem: React.FC<StockItemEmblemProps> = ({ type, isOpen, className = '' }) => {
  if (type === 'tyre') {
    return (
      <div
        className={`w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 transition-all ${
          isOpen
            ? 'bg-gradient-to-br from-orange-500 to-amber-600 text-white shadow-xs ring-2 ring-orange-400/40'
            : 'bg-orange-50 text-orange-600 border-2 border-orange-200 hover:border-orange-400'
        } ${className}`}
        title="Tyre Size"
      >
        <CircleDot className="w-4 h-4" />
      </div>
    );
  }

  return (
    <div
      className={`w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 transition-all ${
        isOpen
          ? 'bg-gradient-to-br from-amber-500 to-yellow-600 text-white font-bold shadow-xs ring-2 ring-amber-400/40'
          : 'bg-amber-50 text-amber-700 border-2 border-amber-200 hover:border-amber-400'
      } ${className}`}
      title="Alloy Rim Size"
    >
      <Disc className="w-4 h-4" />
    </div>
  );
};

interface InventoryListProps {
  items: InventoryItem[];
  activeCategory: 'all' | 'tyre' | 'rim';
  setActiveCategory: (cat: 'all' | 'tyre' | 'rim') => void;
  showOnlyAlerts: boolean;
  setShowOnlyAlerts: (val: boolean) => void;
  onOpenAddModal: (type: ItemType, brand?: string, size?: string) => void;
  onOpenEditModal: (item: InventoryItem) => void;
  onOpenAdjustModal: (item: InventoryItem) => void;
  onQuickQuantityChange: (itemId: string, delta: number) => void;
  onRequestDelete: (item: InventoryItem) => void;
}

type ViewArrangement = 'size-first' | 'diameter-first' | 'brand-first';

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
  const [selectedDiameter, setSelectedDiameter] = useState<number | 'all'>('all');
  const [viewArrangement, setViewArrangement] = useState<ViewArrangement>('size-first');

  // Track which folders are open
  const [expandedFolders, setExpandedFolders] = useState<Record<string, boolean>>({});

  const toggleFolder = (folderKey: string) => {
    setExpandedFolders((prev) => ({
      ...prev,
      [folderKey]: !prev[folderKey],
    }));
  };

  const effectiveStockFilter = showOnlyAlerts ? 'low' : stockFilter;
  const targetType = activeCategory === 'rim' ? 'rim' : 'tyre';
  const unit = targetType === 'tyre' ? 'pcs' : 'sets';

  // Base list of predefined sizes & discovered sizes
  const allSizesForType = useMemo(() => {
    const defaultList = targetType === 'tyre' ? POPULAR_TYRE_SIZES : POPULAR_RIM_SIZES;
    const existingInItems = items
      .filter((i) => i.type === targetType)
      .map((i) => i.size);
    const combined = Array.from(new Set([...defaultList, ...existingInItems]));
    return combined.sort((a, b) => compareSizes(a, b, targetType));
  }, [items, targetType]);

  // Discovered list of diameters present in stock or popular list
  const diameterSummary = useMemo(() => {
    const diametersMap = new Map<number, { count: number; totalQty: number; sizes: Set<string> }>();

    items
      .filter((it) => it.type === targetType)
      .forEach((it) => {
        const parsed = parseItemSize(it.size, targetType);
        const d = parsed.diameter;
        if (d > 0) {
          const current = diametersMap.get(d) || { count: 0, totalQty: 0, sizes: new Set<string>() };
          current.count += 1;
          current.totalQty += it.qty;
          current.sizes.add(it.size);
          diametersMap.set(d, current);
        }
      });

    // Preset standard diameters to ensure easy tapping even if 0 currently
    const standardPills = targetType === 'tyre'
      ? [12, 13, 14, 15, 16, 17, 18, 19, 20]
      : [13, 14, 15, 16, 17, 18, 19, 20];

    return standardPills.map((inch) => {
      const data = diametersMap.get(inch) || { count: 0, totalQty: 0, sizes: new Set<string>() };
      return {
        inch,
        totalQty: data.totalQty,
        sizesCount: data.sizes.size,
        hasStock: data.totalQty > 0,
      };
    });
  }, [items, targetType]);

  // Filter items matching current search and stock filter
  const term = searchTerm.trim().toLowerCase();
  const filteredItems = useMemo(() => {
    return items.filter((item) => {
      if (item.type !== targetType) return false;

      // Stock status filter
      if (effectiveStockFilter === 'instock' && item.qty === 0) return false;
      if (effectiveStockFilter === 'low' && item.qty > item.minQty) return false;
      if (effectiveStockFilter === 'out' && item.qty > 0) return false;

      // Diameter filter
      if (selectedDiameter !== 'all') {
        const parsed = parseItemSize(item.size, targetType);
        if (parsed.diameter !== selectedDiameter) return false;
      }

      // Search term
      if (term) {
        const matchesBrand = item.brand.toLowerCase().includes(term);
        const matchesSize = item.size.toLowerCase().includes(term);
        const matchesModel = item.model.toLowerCase().includes(term);
        const matchesRack = item.rack.toLowerCase().includes(term);
        const matchesPcd = item.pcd?.toLowerCase().includes(term);
        const parsed = parseItemSize(item.size, targetType);
        const matchesDiameter = `${parsed.diameter}` === term || `${parsed.diameter} inch`.includes(term);

        if (!matchesBrand && !matchesSize && !matchesModel && !matchesRack && !matchesPcd && !matchesDiameter) {
          return false;
        }
      }

      return true;
    });
  }, [items, targetType, effectiveStockFilter, selectedDiameter, term]);

  // Size-First Groups: Group by Size -> inside are Brands
  const sizeGroups = useMemo(() => {
    return allSizesForType
      .map((sizeName) => {
        const parsed = parseItemSize(sizeName, targetType);

        // Filter out if user selected a specific diameter and it doesn't match
        if (selectedDiameter !== 'all' && parsed.diameter !== selectedDiameter) {
          return null;
        }

        const sizeItems = filteredItems.filter((i) => i.size === sizeName);
        const totalQty = sizeItems.reduce((sum, it) => sum + it.qty, 0);
        const lowCount = sizeItems.filter((it) => it.qty <= it.minQty).length;
        const outCount = sizeItems.filter((it) => it.qty === 0).length;

        // Distinct brands in this size
        const brandNames = Array.from(new Set(sizeItems.map((it) => it.brand)));

        return {
          size: sizeName,
          parsed,
          items: sizeItems,
          totalQty,
          brandsCount: brandNames.length,
          brandNames,
          lowCount,
          outCount,
        };
      })
      .filter((g): g is NonNullable<typeof g> => {
        if (!g) return false;
        // If searching, or filtering by stock alert or specific diameter, only show groups with matching items
        if (term || effectiveStockFilter !== 'all' || selectedDiameter !== 'all') {
          return g.items.length > 0;
        }
        // Show sizes that have items
        return g.items.length > 0;
      });
  }, [allSizesForType, targetType, selectedDiameter, filteredItems, term, effectiveStockFilter]);

  // Diameter-First Groups: (e.g. 16 Inch Master -> Profile Sizes -> Brands)
  const diameterGroups = useMemo(() => {
    const diametersSet = new Set<number>();
    filteredItems.forEach((it) => {
      const p = parseItemSize(it.size, targetType);
      if (p.diameter > 0) diametersSet.add(p.diameter);
    });

    const sortedDiameters = Array.from(diametersSet).sort((a, b) => a - b);

    return sortedDiameters.map((diameterNum) => {
      const dItems = filteredItems.filter((it) => {
        const p = parseItemSize(it.size, targetType);
        return p.diameter === diameterNum;
      });

      const totalQty = dItems.reduce((sum, it) => sum + it.qty, 0);
      const lowCount = dItems.filter((it) => it.qty <= it.minQty).length;
      const outCount = dItems.filter((it) => it.qty === 0).length;

      // Group by size within this diameter
      const distinctSizes: string[] = Array.from(new Set(dItems.map((it) => it.size)));
      distinctSizes.sort((a, b) => compareSizes(a, b, targetType));

      const subSizes = distinctSizes.map((sName) => {
        const sItems = dItems.filter((it) => it.size === sName);
        return {
          size: sName,
          items: sItems,
          totalQty: sItems.reduce((sum, it) => sum + it.qty, 0),
          brands: Array.from(new Set(sItems.map((it) => it.brand))),
        };
      });

      const allBrandsInDiameter = Array.from(new Set(dItems.map((it) => it.brand)));

      return {
        diameter: diameterNum,
        label: `${diameterNum} Inch ${targetType === 'tyre' ? 'Tyres' : 'Alloy Rims'}`,
        totalQty,
        lowCount,
        outCount,
        sizesCount: distinctSizes.length,
        brandsCount: allBrandsInDiameter.length,
        brands: allBrandsInDiameter,
        subSizes,
        items: dItems,
      };
    });
  }, [filteredItems, targetType]);

  // Brand-First Groups (Preserved as alternative mode)
  const brandGroups = useMemo(() => {
    const baseBrands = targetType === 'tyre' ? TYRE_BRANDS : RIM_BRANDS;
    const existingInItems = filteredItems.map((i) => i.brand);
    const combinedBrands = Array.from(new Set([...baseBrands, ...existingInItems]));

    return combinedBrands
      .map((brandName) => {
        const bItems = filteredItems.filter((it) => it.brand === brandName);
        const totalQty = bItems.reduce((sum, it) => sum + it.qty, 0);
        const lowCount = bItems.filter((it) => it.qty <= it.minQty).length;
        const outCount = bItems.filter((it) => it.qty === 0).length;

        return {
          brand: brandName,
          items: bItems,
          totalQty,
          sizesCount: bItems.length,
          lowCount,
          outCount,
        };
      })
      .filter((g) => g.items.length > 0);
  }, [filteredItems, targetType]);

  const isSearching = Boolean(term);

  // Expand / Collapse all handlers
  const handleExpandAll = () => {
    const next: Record<string, boolean> = {};
    if (viewArrangement === 'size-first') {
      sizeGroups.forEach((g) => {
        next[`size-${g.size}`] = true;
      });
    } else if (viewArrangement === 'diameter-first') {
      diameterGroups.forEach((g) => {
        next[`dia-${g.diameter}`] = true;
      });
    } else {
      brandGroups.forEach((g) => {
        next[`brand-${g.brand}`] = true;
      });
    }
    setExpandedFolders(next);
  };

  const handleCollapseAll = () => {
    setExpandedFolders({});
  };

  // Quick prompt answer data for the selected diameter (e.g. 16 inch)
  const activeDiameterData = useMemo(() => {
    if (selectedDiameter === 'all') return null;
    const matched = filteredItems.filter((it) => {
      const p = parseItemSize(it.size, targetType);
      return p.diameter === selectedDiameter;
    });

    const totalQty = matched.reduce((sum, it) => sum + it.qty, 0);
    const distinctSizes = Array.from(new Set(matched.map((it) => it.size)));
    const distinctBrands = Array.from(new Set(matched.map((it) => it.brand)));

    return {
      inch: selectedDiameter,
      totalQty,
      sizes: distinctSizes,
      brands: distinctBrands,
    };
  }, [selectedDiameter, filteredItems, targetType]);

  return (
    <div className="space-y-2.5 text-[11px]">
      {/* 1. Category Switcher Tabs: Tyres vs Alloy Rims */}
      <div className="flex bg-slate-200/80 p-1 rounded-xl border border-slate-300 shadow-2xs">
        <button
          onClick={() => {
            setActiveCategory('tyre');
            setShowOnlyAlerts(false);
          }}
          className={`flex-1 py-1.5 px-2 rounded-lg font-bold text-[11px] flex items-center justify-center gap-1.5 transition active:scale-98 ${
            activeCategory === 'tyre'
              ? 'bg-orange-500 text-white shadow-xs'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/70'
          }`}
        >
          <CircleDot className="w-3.5 h-3.5" />
          <span>Tyres by Size</span>
        </button>

        <button
          onClick={() => {
            setActiveCategory('rim');
            setShowOnlyAlerts(false);
          }}
          className={`flex-1 py-1.5 px-2 rounded-lg font-bold text-[11px] flex items-center justify-center gap-1.5 transition active:scale-98 ${
            activeCategory === 'rim'
              ? 'bg-amber-500 text-white shadow-xs'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/70'
          }`}
        >
          <Disc className="w-3.5 h-3.5" />
          <span>Alloy Rims by Size</span>
        </button>
      </div>

      {/* 2. Customer Query: Rim Diameter Quick Selector Bar (13", 14", 15", 16", etc.) */}
      <div className="bg-white border border-slate-200 rounded-xl p-2 space-y-1.5 shadow-2xs">
        <div className="flex items-center justify-between text-[10px]">
          <span className="font-bold text-slate-700 flex items-center gap-1">
            <Sparkles className="w-3 h-3 text-orange-500" />
            <span>Select Rim Size / Inch to check customer query:</span>
          </span>
          {selectedDiameter !== 'all' && (
            <button
              onClick={() => setSelectedDiameter('all')}
              className="text-orange-600 hover:text-orange-700 font-semibold underline underline-offset-2"
            >
              Show All Sizes
            </button>
          )}
        </div>

        <div className="flex items-center gap-1 overflow-x-auto pb-0.5 no-scrollbar">
          <button
            onClick={() => setSelectedDiameter('all')}
            className={`px-2.5 py-1 rounded-lg font-bold text-[10px] whitespace-nowrap transition border ${
              selectedDiameter === 'all'
                ? 'bg-orange-500 text-white border-orange-500 shadow-xs'
                : 'bg-slate-100 text-slate-700 border-slate-200 hover:text-slate-900 hover:bg-slate-200'
            }`}
          >
            All Sizes
          </button>

          {diameterSummary.map((d) => {
            const isSelected = selectedDiameter === d.inch;
            return (
              <button
                key={d.inch}
                onClick={() => setSelectedDiameter(isSelected ? 'all' : d.inch)}
                className={`px-2.5 py-1 rounded-lg font-bold text-[10px] whitespace-nowrap transition border flex items-center gap-1 active:scale-95 ${
                  isSelected
                    ? 'bg-orange-500 text-white border-orange-500 shadow-xs ring-1 ring-orange-400/40'
                    : d.hasStock
                    ? 'bg-slate-100 text-slate-800 border-slate-200 hover:border-orange-400 hover:text-orange-600'
                    : 'bg-slate-50 text-slate-400 border-slate-200 hover:text-slate-600'
                }`}
              >
                <span>{d.inch}&quot;</span>
                {d.totalQty > 0 ? (
                  <span
                    className={`text-[8px] px-1 py-0.2 rounded font-semibold ${
                      isSelected
                        ? 'bg-white/25 text-white'
                        : 'bg-emerald-100 text-emerald-800'
                    }`}
                  >
                    {d.totalQty}
                  </span>
                ) : (
                  <span className="text-[8px] text-slate-400">0</span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* 3. Customer Response Quick Banner (When an inch like 16" is clicked) */}
      {activeDiameterData && (
        <div className="p-2.5 bg-gradient-to-r from-orange-50 via-amber-50/50 to-white border border-orange-200 rounded-xl flex items-start gap-2 shadow-2xs animate-fadeIn">
          <div className="w-6 h-6 rounded-lg bg-orange-500 text-white flex items-center justify-center flex-shrink-0 mt-0.5 shadow-xs">
            <PhoneCall className="w-3.5 h-3.5" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center justify-between gap-1 flex-wrap">
              <h4 className="font-bold text-slate-900 text-[11px]">
                Customer Query Response for {activeDiameterData.inch} Inch {targetType === 'tyre' ? 'Tyres' : 'Alloy Rims'}:
              </h4>
              <span className="text-[10px] font-bold text-orange-800 bg-orange-100 px-1.5 py-0.5 rounded border border-orange-200">
                {activeDiameterData.totalQty} {unit} in stock
              </span>
            </div>
            <p className="text-[10px] text-slate-700 mt-1 leading-relaxed">
              {activeDiameterData.totalQty > 0 ? (
                <>
                  Available in <strong className="text-slate-900">{activeDiameterData.sizes.length} sizes</strong>:{' '}
                  <span className="text-orange-700 font-semibold">{activeDiameterData.sizes.join(', ')}</span>.
                  <br />
                  Brands available:{' '}
                  <strong className="text-emerald-700 font-bold">{activeDiameterData.brands.join(', ')}</strong>.
                </>
              ) : (
                <span className="text-rose-600 font-semibold">
                  Currently 0 {unit} in stock for {activeDiameterData.inch} inch. You can reorder or add new stock below.
                </span>
              )}
            </p>
          </div>
        </div>
      )}

      {/* 4. Search & View Mode Controls */}
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
                ? 'Search size (16 inch, 205/55, 195/65), brand (Rotalla, General), rack...'
                : 'Search rim size (16 inch, 17 inch), brand (Vossen, Spartx), PCD...'
            }
            className="w-full bg-white border border-slate-300 rounded-lg pl-8 pr-7 py-1.5 text-[11px] text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500 shadow-2xs transition"
          />
          {searchTerm && (
            <button
              onClick={() => setSearchTerm('')}
              className="absolute right-2 top-1/2 -translate-y-1/2 p-0.5 text-slate-400 hover:text-slate-700"
            >
              <X className="w-3 h-3" />
            </button>
          )}
        </div>

        {/* View mode toggle and quick status filters */}
        <div className="flex items-center justify-between gap-1.5 flex-wrap text-[10px]">
          {/* View Mode Toggle: Sizes -> Brands vs Rim Inch Master vs Brands */}
          <div className="flex items-center bg-slate-200/80 p-0.5 rounded-lg border border-slate-300">
            <button
              onClick={() => setViewArrangement('size-first')}
              className={`px-2 py-0.5 rounded font-semibold transition ${
                viewArrangement === 'size-first'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
              title="See Sizes first, then Brands inside"
            >
              Sizes → Brands
            </button>
            <button
              onClick={() => setViewArrangement('diameter-first')}
              className={`px-2 py-0.5 rounded font-semibold transition ${
                viewArrangement === 'diameter-first'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
              title="Group by Rim Inch (e.g. 16 Inch Master)"
            >
              Rim Inch Master
            </button>
            <button
              onClick={() => setViewArrangement('brand-first')}
              className={`px-2 py-0.5 rounded font-semibold transition ${
                viewArrangement === 'brand-first'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
              title="See Brands first, then Sizes inside"
            >
              Brands → Sizes
            </button>
          </div>

          {/* Quick status filters & Expand All */}
          <div className="flex items-center gap-1">
            <button
              onClick={() => {
                setShowOnlyAlerts(false);
                setStockFilter('all');
              }}
              className={`px-2 py-0.5 rounded font-medium transition border ${
                !showOnlyAlerts && stockFilter === 'all'
                  ? 'bg-slate-800 text-white border-slate-800'
                  : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-100 hover:text-slate-900'
              }`}
            >
              All
            </button>
            <button
              onClick={() => {
                setShowOnlyAlerts(false);
                setStockFilter('instock');
              }}
              className={`px-2 py-0.5 rounded font-medium transition border ${
                !showOnlyAlerts && stockFilter === 'instock'
                  ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                  : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-100 hover:text-slate-900'
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
                  ? 'bg-amber-100 text-amber-800 border-amber-300'
                  : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-100 hover:text-slate-900'
              }`}
            >
              <AlertTriangle className="w-2.5 h-2.5 text-amber-600" />
              <span>Low</span>
            </button>

            <div className="h-3 w-px bg-slate-300 mx-0.5" />

            <button
              onClick={handleExpandAll}
              className="text-slate-500 hover:text-slate-900 underline underline-offset-2 flex items-center gap-0.5 text-[10px]"
            >
              <Layers className="w-2.5 h-2.5" />
              <span>Expand</span>
            </button>
            <span className="text-slate-300">•</span>
            <button
              onClick={handleCollapseAll}
              className="text-slate-500 hover:text-slate-900 underline underline-offset-2 text-[10px]"
            >
              Collapse
            </button>
          </div>
        </div>
      </div>

      {/* 5. Section Header */}
      <div className="flex items-center justify-between text-[10px] text-slate-500 px-0.5">
        <span className="font-semibold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
          {targetType === 'tyre' ? (
            <CircleDot className="w-3.5 h-3.5 text-orange-500" />
          ) : (
            <Disc className="w-3.5 h-3.5 text-amber-500" />
          )}
          <span>
            {viewArrangement === 'size-first'
              ? `${targetType === 'tyre' ? 'Tyre Sizes' : 'Alloy Rim Sizes'} (${sizeGroups.length} Sizes)`
              : viewArrangement === 'diameter-first'
              ? `Rim Diameters (${diameterGroups.length} Groups)`
              : `Brands (${brandGroups.length} Brands)`}
          </span>
          {selectedDiameter !== 'all' && (
            <span className="text-orange-600 font-bold ml-1">
              • Filtered to {selectedDiameter}&quot;
            </span>
          )}
        </span>
        <span className="font-medium text-slate-500">
          {filteredItems.reduce((s, it) => s + it.qty, 0)} {unit} total
        </span>
      </div>

      {/* 6. Main Stock Sizes List */}

      {/* MODE 1: SIZES -> BRANDS (Default requested) */}
      {viewArrangement === 'size-first' && (
        sizeGroups.length === 0 ? (
          <div className="bg-white border border-slate-200 rounded-xl p-5 text-center space-y-1.5 shadow-2xs">
            <AlertTriangle className="w-4 h-4 text-slate-400 mx-auto" />
            <h3 className="text-xs font-bold text-slate-900">No matching stock sizes</h3>
            <p className="text-[10px] text-slate-500">
              No stock matches your active size search or diameter filter.
            </p>
            <button
              onClick={() => {
                setSearchTerm('');
                setSelectedDiameter('all');
                setShowOnlyAlerts(false);
                setStockFilter('all');
              }}
              className="px-2.5 py-1 rounded-md bg-slate-100 hover:bg-slate-200 text-[11px] font-medium text-slate-800 border border-slate-300 mt-1 transition"
            >
              Reset Filters
            </button>
          </div>
        ) : (
          <div className="space-y-2">
            {sizeGroups.map((group) => {
              const folderKey = `size-${group.size}`;
              const isOpen = isSearching || Boolean(expandedFolders[folderKey]);

              return (
                <div
                  key={group.size}
                  className={`bg-white border rounded-xl overflow-hidden transition shadow-2xs ${
                    isOpen
                      ? 'border-orange-400 ring-1 ring-orange-400/30'
                      : group.outCount > 0
                      ? 'border-rose-300'
                      : group.lowCount > 0
                      ? 'border-amber-300'
                      : 'border-slate-200 hover:border-slate-300'
                  }`}
                >
                  {/* Size Item Header */}
                  <div
                    onClick={() => toggleFolder(folderKey)}
                    className={`px-3 py-2.5 flex items-center justify-between cursor-pointer select-none transition ${
                      isOpen ? 'bg-slate-50 border-b border-slate-200' : 'hover:bg-slate-50/70'
                    }`}
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      {/* Tyre / Rim Emblem */}
                      <StockItemEmblem
                        type={targetType}
                        isOpen={isOpen}
                        diameter={group.parsed.diameter}
                      />

                      {/* Size Title & Brands available */}
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          {/* Prominent Rim Inch Badge */}
                          {group.parsed.diameter > 0 && (
                            <span className="text-[9px] font-extrabold px-1.5 py-0.2 rounded bg-orange-50 text-orange-700 border border-orange-200">
                              {group.parsed.diameter}&quot; Rim
                            </span>
                          )}

                          <h3 className="text-xs font-bold text-slate-900 tracking-wide">
                            {group.size}
                          </h3>

                          {/* Status alert pill */}
                          {group.outCount > 0 ? (
                            <span className="text-[8px] font-bold px-1.5 py-0.2 rounded bg-rose-50 text-rose-700 border border-rose-200">
                              {group.outCount} Out
                            </span>
                          ) : group.lowCount > 0 ? (
                            <span className="text-[8px] font-bold px-1.5 py-0.2 rounded bg-amber-50 text-amber-800 border border-amber-200">
                              {group.lowCount} Low
                            </span>
                          ) : null}
                        </div>

                        <p className="text-[9px] text-slate-500 mt-0.5">
                          <span className="text-emerald-700 font-semibold">
                            {group.brandsCount} {group.brandsCount === 1 ? 'brand' : 'brands'} available
                          </span>{' '}
                          ({group.brandNames.join(', ')}) •{' '}
                          <strong className="text-slate-900">{group.totalQty} {unit}</strong> in stock
                        </p>
                      </div>
                    </div>

                    {/* Right side: Chevron */}
                    <div className="flex items-center gap-1 text-slate-400">
                      <span className="text-[9px] font-medium hidden sm:inline text-slate-500">
                        {isOpen ? 'Close' : 'View Brands'}
                      </span>
                      {isOpen ? (
                        <ChevronDown className="w-3.5 h-3.5 text-orange-600" />
                      ) : (
                        <ChevronRight className="w-3.5 h-3.5" />
                      )}
                    </div>
                  </div>

                  {/* Folder Contents: Brands available in that Size */}
                  {isOpen && (
                    <div className="p-2.5 bg-slate-50/70 space-y-2 border-t border-slate-200 animate-fadeIn">
                      {/* Sub-header inside folder */}
                      <div className="flex items-center justify-between px-1 text-[10px] text-slate-600 border-b border-slate-200 pb-1.5">
                        <span className="font-semibold text-slate-700">
                          Brands in <span className="text-orange-600">{group.size}</span>:
                        </span>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            onOpenAddModal(targetType, undefined, group.size);
                          }}
                          className="text-orange-600 hover:text-orange-700 font-semibold flex items-center gap-0.5"
                        >
                          <Plus className="w-2.5 h-2.5" />
                          <span>+ Add Brand in this Size</span>
                        </button>
                      </div>

                      {/* Brand Cards Grid */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {group.items.map((item) => {
                          const isLow = item.qty <= item.minQty && item.qty > 0;
                          const isZero = item.qty === 0;

                          return (
                            <div
                              key={item.id}
                              className={`bg-white border rounded-lg p-2.5 transition flex flex-col justify-between shadow-2xs ${
                                isZero
                                  ? 'border-rose-300 bg-rose-50/20'
                                  : isLow
                                  ? 'border-amber-300 bg-amber-50/20'
                                  : 'border-slate-200 hover:border-slate-300'
                              }`}
                            >
                              {/* Top row: Brand Name, Model, Badges & Actions */}
                              <div>
                                <div className="flex items-start justify-between gap-1.5">
                                  <div className="min-w-0">
                                    <div className="flex items-center gap-1.5 flex-wrap">
                                      <span className="text-[12px] font-extrabold text-slate-900 tracking-wide">
                                        {item.brand}
                                      </span>
                                      <span
                                        className={`text-[8px] font-bold px-1 py-0.2 rounded uppercase ${
                                          item.condition === 'New'
                                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                            : 'bg-purple-50 text-purple-700 border border-purple-200'
                                        }`}
                                      >
                                        {item.condition}
                                      </span>
                                      {isZero ? (
                                        <span className="text-[8px] font-bold px-1 py-0.2 rounded bg-rose-600 text-white">
                                          0 ZERO
                                        </span>
                                      ) : isLow ? (
                                        <span className="text-[8px] font-bold px-1 py-0.2 rounded bg-amber-100 text-amber-800 border border-amber-300">
                                          LOW (≤{item.minQty})
                                        </span>
                                      ) : null}
                                    </div>

                                    {item.model && (
                                      <p className="text-[10px] text-slate-500 truncate mt-0.5">
                                        {item.model}
                                      </p>
                                    )}
                                  </div>

                                  {/* Edit & Delete Action Buttons */}
                                  <div className="flex items-center gap-1 flex-shrink-0">
                                    <button
                                      type="button"
                                      onClick={() => onOpenEditModal(item)}
                                      className="p-1 rounded bg-slate-100 text-slate-600 hover:text-slate-900 hover:bg-slate-200 border border-slate-200 transition"
                                      title="Edit item"
                                    >
                                      <Edit2 className="w-3 h-3" />
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => onRequestDelete(item)}
                                      className="p-1 rounded bg-slate-100 text-slate-600 hover:text-rose-600 hover:bg-rose-50 border border-slate-200 transition"
                                      title="Delete item"
                                    >
                                      <Trash2 className="w-3 h-3 text-rose-500" />
                                    </button>
                                  </div>
                                </div>

                                {/* Location, PCD or Tyre details */}
                                <div className="mt-1.5 flex items-center justify-between gap-1 text-[9px] text-slate-600">
                                  {item.pcd ? (
                                    <span>
                                      PCD: <strong className="text-slate-900">{item.pcd}</strong>
                                      {item.finish ? ` • ${item.finish}` : ''}
                                    </span>
                                  ) : item.loadIndex ? (
                                    <span>Index: <strong className="text-slate-900">{item.loadIndex}</strong></span>
                                  ) : (
                                    <span>Size: <strong className="text-orange-600 font-semibold">{item.size}</strong></span>
                                  )}

                                  {item.rack && (
                                    <span className="flex items-center gap-0.5 text-slate-500">
                                      <MapPin className="w-2 h-2 text-slate-400" />
                                      {item.rack}
                                    </span>
                                  )}
                                </div>
                              </div>

                              {/* Bottom row: Stepper, Quantity & Adjust */}
                              <div className="mt-2 pt-1.5 border-t border-slate-200 flex items-center justify-between gap-1.5">
                                <div className="flex items-center gap-1">
                                  <button
                                    type="button"
                                    onClick={() => onQuickQuantityChange(item.id, -1)}
                                    disabled={item.qty <= 0}
                                    className={`w-7 h-7 rounded font-bold text-xs flex items-center justify-center transition active:scale-90 ${
                                      item.qty <= 0
                                        ? 'bg-slate-100 text-slate-300 cursor-not-allowed border border-slate-200'
                                        : 'bg-slate-100 hover:bg-slate-200 text-rose-600 border border-slate-200 shadow-2xs'
                                    }`}
                                    title="Decrease (-1)"
                                  >
                                    <Minus className="w-3 h-3" />
                                  </button>

                                  <div className="min-w-[40px] text-center px-0.5">
                                    <span
                                      className={`text-sm font-bold leading-none block ${
                                        item.qty === 0
                                          ? 'text-rose-600'
                                          : item.qty <= item.minQty
                                          ? 'text-amber-600'
                                          : 'text-emerald-700'
                                      }`}
                                    >
                                      {item.qty}
                                    </span>
                                    <span className="text-[8px] uppercase text-slate-400 font-medium block leading-tight">
                                      {unit}
                                    </span>
                                  </div>

                                  <button
                                    type="button"
                                    onClick={() => onQuickQuantityChange(item.id, 1)}
                                    className="w-7 h-7 rounded font-bold text-xs bg-slate-100 hover:bg-slate-200 text-emerald-700 border border-slate-200 shadow-2xs flex items-center justify-center transition active:scale-90"
                                    title="Increase (+1)"
                                  >
                                    <Plus className="w-3 h-3" />
                                  </button>
                                </div>

                                <button
                                  type="button"
                                  onClick={() => onOpenAdjustModal(item)}
                                  className="flex-1 py-1 px-1.5 rounded bg-slate-100 hover:bg-slate-200 text-[10px] font-semibold text-slate-700 border border-slate-200 flex items-center justify-center gap-1 active:scale-95 transition shadow-2xs"
                                >
                                  <SlidersHorizontal className="w-2.5 h-2.5 text-orange-600" />
                                  <span>Adjust</span>
                                </button>
                              </div>
                            </div>
                          );
                        })}
                      </div>

                      {/* Quick Add Brand inside Size Folder */}
                      <button
                        type="button"
                        onClick={() => onOpenAddModal(targetType, undefined, group.size)}
                        className="w-full py-1.5 px-2 rounded-lg border border-dashed border-slate-300 hover:border-orange-400 bg-white hover:bg-orange-50/40 text-slate-600 hover:text-orange-600 text-[10px] font-semibold flex items-center justify-center gap-1 transition"
                      >
                        <Plus className="w-3 h-3" />
                        <span>+ Add another Brand to {group.size}</span>
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )
      )}

      {/* MODE 2: RIM INCH MASTER (e.g. 16 Inch Master -> Profile Sizes -> Brands) */}
      {viewArrangement === 'diameter-first' && (
        diameterGroups.length === 0 ? (
          <div className="bg-white border border-slate-200 rounded-xl p-5 text-center space-y-1.5 shadow-2xs">
            <AlertTriangle className="w-4 h-4 text-slate-400 mx-auto" />
            <h3 className="text-xs font-bold text-slate-900">No matching diameters</h3>
            <p className="text-[10px] text-slate-500">Try changing your search or filters.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {diameterGroups.map((dia) => {
              const folderKey = `dia-${dia.diameter}`;
              const isOpen = isSearching || Boolean(expandedFolders[folderKey]);

              return (
                <div
                  key={dia.diameter}
                  className={`bg-white border rounded-xl overflow-hidden transition shadow-2xs ${
                    isOpen
                      ? 'border-orange-400 ring-1 ring-orange-400/30'
                      : 'border-slate-200 hover:border-slate-300'
                  }`}
                >
                  {/* Master Header */}
                  <div
                    onClick={() => toggleFolder(folderKey)}
                    className={`px-3 py-2.5 flex items-center justify-between cursor-pointer select-none transition ${
                      isOpen ? 'bg-slate-50 border-b border-slate-200' : 'hover:bg-slate-50/70'
                    }`}
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <StockItemEmblem
                        type={targetType}
                        isOpen={isOpen}
                        diameter={dia.diameter}
                      />

                      <div>
                        <div className="flex items-center gap-1.5">
                          <h3 className="text-xs font-bold text-slate-900">
                            {dia.label}
                          </h3>
                          {dia.outCount > 0 ? (
                            <span className="text-[8px] font-bold px-1.5 py-0.2 rounded bg-rose-50 text-rose-700 border border-rose-200">
                              {dia.outCount} Out
                            </span>
                          ) : dia.lowCount > 0 ? (
                            <span className="text-[8px] font-bold px-1.5 py-0.2 rounded bg-amber-50 text-amber-800 border border-amber-200">
                              {dia.lowCount} Low
                            </span>
                          ) : null}
                        </div>
                        <p className="text-[9px] text-slate-500 mt-0.5">
                          <span className="text-orange-600 font-semibold">{dia.sizesCount} sizes</span> •{' '}
                          <span className="text-emerald-700 font-semibold">{dia.brandsCount} brands</span> ({dia.brands.join(', ')}) •{' '}
                          <strong className="text-slate-900">{dia.totalQty} {unit}</strong>
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-1 text-slate-400">
                      {isOpen ? <ChevronDown className="w-3.5 h-3.5 text-orange-600" /> : <ChevronRight className="w-3.5 h-3.5" />}
                    </div>
                  </div>

                  {/* Inside Rim Diameter Folder: Sub-sizes with Brands inside */}
                  {isOpen && (
                    <div className="p-2.5 bg-slate-50/70 space-y-3 border-t border-slate-200 animate-fadeIn">
                      {dia.subSizes.map((sub) => (
                        <div key={sub.size} className="space-y-1.5 border-l-2 border-orange-500 pl-2">
                          <div className="flex items-center justify-between text-[10px]">
                            <span className="font-bold text-orange-700">
                              Size: {sub.size} ({sub.totalQty} {unit} across {sub.brands.length} brands)
                            </span>
                            <button
                              type="button"
                              onClick={() => onOpenAddModal(targetType, undefined, sub.size)}
                              className="text-[9px] text-orange-600 hover:text-orange-700 hover:underline font-semibold"
                            >
                              + Add Brand
                            </button>
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                            {sub.items.map((item) => (
                              <div
                                key={item.id}
                                className="bg-white border border-slate-200 rounded-lg p-2 flex items-center justify-between gap-2 shadow-2xs"
                              >
                                <div className="min-w-0">
                                  <div className="flex items-center gap-1">
                                    <span className="font-bold text-slate-900 text-[11px]">{item.brand}</span>
                                    <span className="text-[8px] px-1 py-0.2 rounded bg-slate-100 text-slate-600 border border-slate-200">
                                      {item.condition}
                                    </span>
                                  </div>
                                  <p className="text-[9px] text-slate-500 truncate">{item.model || item.rack}</p>
                                </div>

                                <div className="flex items-center gap-1.5 flex-shrink-0">
                                  <button
                                    onClick={() => onQuickQuantityChange(item.id, -1)}
                                    disabled={item.qty <= 0}
                                    className="w-6 h-6 rounded bg-slate-100 hover:bg-slate-200 text-rose-600 border border-slate-200 flex items-center justify-center font-bold text-xs"
                                  >
                                    <Minus className="w-2.5 h-2.5" />
                                  </button>
                                  <span className="font-bold text-xs text-slate-900 min-w-[20px] text-center">
                                    {item.qty}
                                  </span>
                                  <button
                                    onClick={() => onQuickQuantityChange(item.id, 1)}
                                    className="w-6 h-6 rounded bg-slate-100 hover:bg-slate-200 text-emerald-700 border border-slate-200 flex items-center justify-center font-bold text-xs"
                                  >
                                    <Plus className="w-2.5 h-2.5" />
                                  </button>
                                  <button
                                    onClick={() => onOpenAdjustModal(item)}
                                    className="px-1.5 py-1 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 text-[9px] font-semibold"
                                  >
                                    Adjust
                                  </button>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )
      )}

      {/* MODE 3: BRANDS -> SIZES (Preserved for flexibility) */}
      {viewArrangement === 'brand-first' && (
        <div className="space-y-2">
          {brandGroups.map((group) => {
            const folderKey = `brand-${group.brand}`;
            const isOpen = isSearching || Boolean(expandedFolders[folderKey]);

            return (
              <div
                key={group.brand}
                className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-2xs"
              >
                <div
                  onClick={() => toggleFolder(folderKey)}
                  className="px-3 py-2.5 flex items-center justify-between cursor-pointer hover:bg-slate-50/70"
                >
                  <div className="flex items-center gap-2">
                    <StockItemEmblem type={targetType} isOpen={isOpen} />
                    <div>
                      <h3 className="text-xs font-bold text-slate-900">{group.brand}</h3>
                      <p className="text-[9px] text-slate-500">
                        {group.sizesCount} sizes • {group.totalQty} {unit}
                      </p>
                    </div>
                  </div>
                  {isOpen ? <ChevronDown className="w-3.5 h-3.5 text-orange-600" /> : <ChevronRight className="w-3.5 h-3.5 text-slate-400" />}
                </div>

                {isOpen && (
                  <div className="p-2.5 bg-slate-50/70 border-t border-slate-200 grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                    {group.items.map((item) => (
                      <div
                        key={item.id}
                        className="bg-white border border-slate-200 rounded-lg p-2 flex items-center justify-between shadow-2xs"
                      >
                        <div>
                          <span className="font-bold text-orange-600 text-xs">{item.size}</span>
                          <p className="text-[9px] text-slate-500">{item.model}</p>
                        </div>
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => onQuickQuantityChange(item.id, -1)}
                            className="w-6 h-6 rounded bg-slate-100 hover:bg-slate-200 border border-slate-200 text-rose-600 flex items-center justify-center font-bold"
                          >
                            -
                          </button>
                          <span className="font-bold text-xs text-slate-900 min-w-[20px] text-center">{item.qty}</span>
                          <button
                            onClick={() => onQuickQuantityChange(item.id, 1)}
                            className="w-6 h-6 rounded bg-slate-100 hover:bg-slate-200 border border-slate-200 text-emerald-700 flex items-center justify-center font-bold"
                          >
                            +
                          </button>
                        </div>
                      </div>
                    ))}
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
