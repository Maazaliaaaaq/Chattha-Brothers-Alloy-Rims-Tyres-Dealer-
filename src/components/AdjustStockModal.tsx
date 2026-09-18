import React, { useState, useEffect } from 'react';
import { InventoryItem } from '../types';
import { X, Check, ArrowRight, AlertTriangle, SlidersHorizontal } from 'lucide-react';

interface AdjustStockModalProps {
  item: InventoryItem | null;
  isOpen: boolean;
  onClose: () => void;
  onSaveQty: (itemId: string, newQty: number) => void;
}

export const AdjustStockModal: React.FC<AdjustStockModalProps> = ({
  item,
  isOpen,
  onClose,
  onSaveQty,
}) => {
  const [exactQty, setExactQty] = useState<number>(0);

  useEffect(() => {
    if (item) {
      setExactQty(item.qty);
    }
  }, [item, isOpen]);

  if (!isOpen || !item) return null;

  const currentQty = item.qty;
  const isTyre = item.type === 'tyre';
  const unitLabel = isTyre ? 'tyres' : 'rim sets';

  const handleQuickDelta = (delta: number) => {
    setExactQty((prev) => Math.max(0, prev + delta));
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    onSaveQty(item.id, Math.max(0, exactQty));
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-slate-900/50 backdrop-blur-xs animate-fadeIn">
      <div
        className="bg-white border border-slate-200 rounded-xl w-full max-w-xs shadow-xl overflow-hidden text-slate-900 flex flex-col max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-3.5 py-2.5 border-b border-slate-200 flex items-center justify-between bg-slate-50">
          <div className="flex items-center gap-1.5">
            <div className="p-1 rounded bg-orange-50 text-orange-600 border border-orange-200">
              <SlidersHorizontal className="w-3.5 h-3.5" />
            </div>
            <div>
              <h3 className="text-xs font-bold text-slate-900">Adjust Quantity</h3>
              <p className="text-[9px] text-slate-500">Update stock balance</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-6 h-6 rounded flex items-center justify-center bg-slate-100 text-slate-500 hover:text-slate-900 hover:bg-slate-200 transition"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Content */}
        <form onSubmit={handleSave} className="p-3 space-y-2.5">
          {/* Target Item Summary */}
          <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-200">
            <div className="flex items-center justify-between gap-1">
              <span className="text-[8px] font-bold uppercase px-1.5 py-0.5 rounded bg-orange-100 text-orange-700 border border-orange-200">
                {isTyre ? 'Tyre' : 'Alloy Rim'}
              </span>
              <span className="text-[9px] text-slate-500">📍 {item.rack || 'Rack-1'}</span>
            </div>
            <h4 className="text-xs font-bold text-slate-900 mt-1">
              {item.brand} {item.model}
            </h4>
            <div className="text-[11px] font-bold text-orange-600 mt-0.5">
              Size: {item.size}
            </div>
          </div>

          {/* Current vs New Comparison */}
          <div className="grid grid-cols-3 gap-1.5 items-center bg-slate-50 p-2 rounded-lg border border-slate-200 text-center">
            <div>
              <span className="text-[9px] uppercase font-semibold text-slate-500 block">Current</span>
              <span className="text-sm font-bold text-slate-700">{currentQty}</span>
            </div>
            <div className="flex justify-center">
              <ArrowRight className="w-3.5 h-3.5 text-orange-500" />
            </div>
            <div>
              <span className="text-[9px] uppercase font-semibold text-slate-500 block">New</span>
              <span
                className={`text-sm font-bold ${
                  exactQty <= 0
                    ? 'text-rose-600'
                    : exactQty <= item.minQty
                    ? 'text-amber-700'
                    : 'text-emerald-700'
                }`}
              >
                {exactQty}
              </span>
            </div>
          </div>

          {/* Direct Input */}
          <div>
            <label className="block text-[9px] font-bold uppercase text-slate-500 mb-1">
              Enter Quantity ({unitLabel})
            </label>
            <input
              type="number"
              min="0"
              value={exactQty}
              onChange={(e) => setExactQty(Math.max(0, parseInt(e.target.value) || 0))}
              className="w-full bg-white border border-slate-300 focus:border-orange-500 rounded-lg px-2.5 py-1.5 text-center font-bold text-base text-slate-900 outline-none shadow-2xs"
              autoFocus
            />
          </div>

          {/* Quick Tap Buttons */}
          <div>
            <span className="block text-[9px] font-bold uppercase text-slate-500 mb-1">
              Quick Buttons
            </span>
            <div className="grid grid-cols-4 gap-1">
              <button
                type="button"
                onClick={() => handleQuickDelta(-4)}
                className="py-1 rounded bg-slate-100 hover:bg-slate-200 text-[10px] font-semibold text-slate-700 border border-slate-200 transition"
              >
                -4
              </button>
              <button
                type="button"
                onClick={() => handleQuickDelta(-1)}
                className="py-1 rounded bg-slate-100 hover:bg-slate-200 text-[10px] font-semibold text-slate-700 border border-slate-200 transition"
              >
                -1
              </button>
              <button
                type="button"
                onClick={() => handleQuickDelta(1)}
                className="py-1 rounded bg-slate-100 hover:bg-slate-200 text-[10px] font-semibold text-emerald-700 border border-slate-200 transition"
              >
                +1
              </button>
              <button
                type="button"
                onClick={() => handleQuickDelta(4)}
                className="py-1 rounded bg-slate-100 hover:bg-slate-200 text-[10px] font-semibold text-emerald-700 border border-slate-200 transition"
              >
                +4
              </button>
            </div>
          </div>

          {/* Low Stock Warning */}
          {exactQty <= 0 ? (
            <div className="p-1.5 rounded bg-rose-50 border border-rose-200 flex items-center gap-1.5 text-[10px] text-rose-700">
              <AlertTriangle className="w-3 h-3 flex-shrink-0 text-rose-600" />
              <span>Out of stock alert (0).</span>
            </div>
          ) : exactQty <= item.minQty ? (
            <div className="p-1.5 rounded bg-amber-50 border border-amber-200 flex items-center gap-1.5 text-[10px] text-amber-800">
              <AlertTriangle className="w-3 h-3 flex-shrink-0 text-amber-600" />
              <span>Low stock alert (≤{item.minQty}).</span>
            </div>
          ) : null}

          {/* Actions */}
          <div className="pt-1 flex items-center gap-1.5">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 font-medium text-[11px] transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 py-1.5 rounded-lg bg-orange-500 hover:bg-orange-600 text-white font-bold text-[11px] flex items-center justify-center gap-1 shadow-xs active:scale-95 transition"
            >
              <Check className="w-3 h-3" />
              Save
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
