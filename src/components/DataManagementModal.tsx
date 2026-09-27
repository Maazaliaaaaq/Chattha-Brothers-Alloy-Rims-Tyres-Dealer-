import React, { useState } from 'react';
import { Database, Trash2, RefreshCw, X, AlertTriangle, CheckCircle2, Disc, CircleDot } from 'lucide-react';
import { InventoryItem } from '../types';

interface DataManagementModalProps {
  isOpen: boolean;
  onClose: () => void;
  items: InventoryItem[];
  onClearAllItems: () => Promise<void>;
  onRestoreSampleData: () => Promise<void>;
  onClearAdjustmentsLog?: () => Promise<void>;
}

export const DataManagementModal: React.FC<DataManagementModalProps> = ({
  isOpen,
  onClose,
  items,
  onClearAllItems,
  onRestoreSampleData,
}) => {
  const [isConfirmingClear, setIsConfirmingClear] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  if (!isOpen) return null;

  const tyreItems = items.filter((i) => i.type === 'tyre');
  const rimItems = items.filter((i) => i.type === 'rim');
  const totalTyreQty = tyreItems.reduce((acc, i) => acc + i.qty, 0);
  const totalRimQty = rimItems.reduce((acc, i) => acc + i.qty, 0);

  const handleExecuteClear = async () => {
    setIsProcessing(true);
    setStatusMessage('Deleting all old stock data from cloud and storage...');
    try {
      await onClearAllItems();
      setStatusMessage('All old data permanently cleared!');
      setTimeout(() => {
        setIsConfirmingClear(false);
        setIsProcessing(false);
        setStatusMessage(null);
        onClose();
      }, 1000);
    } catch (err) {
      console.error('Failed to clear data:', err);
      setStatusMessage('Error clearing data. Please try again.');
      setIsProcessing(false);
    }
  };

  const handleExecuteRestore = async () => {
    setIsProcessing(true);
    setStatusMessage('Restoring sample demo stock into cloud...');
    try {
      await onRestoreSampleData();
      setStatusMessage('Sample stock loaded successfully!');
      setTimeout(() => {
        setIsProcessing(false);
        setStatusMessage(null);
        onClose();
      }, 1000);
    } catch (err) {
      console.error('Failed to restore demo data:', err);
      setStatusMessage('Error loading demo data.');
      setIsProcessing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-slate-900/60 backdrop-blur-xs animate-fadeIn">
      <div
        className="bg-white border border-slate-200 rounded-xl w-full max-w-sm shadow-2xl overflow-hidden text-slate-900 text-xs"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-3.5 border-b border-slate-200 flex items-center justify-between bg-slate-50/70">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-orange-100 text-orange-600 flex items-center justify-center flex-shrink-0">
              <Database className="w-4 h-4" />
            </div>
            <div>
              <h2 className="font-extrabold text-slate-900 text-xs leading-none">Database &amp; Data Management</h2>
              <p className="text-[10px] text-slate-500 mt-0.5 leading-none">Manage store stock data &amp; persistence</p>
            </div>
          </div>
          <button
            onClick={onClose}
            disabled={isProcessing}
            className="text-slate-400 hover:text-slate-700 p-1 rounded-md hover:bg-slate-200 transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-3.5 space-y-3.5">
          {/* Current Stock Stats */}
          <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-200">
            <span className="text-[9px] font-bold uppercase text-slate-500 block mb-1.5">Current Stock in Database</span>
            <div className="grid grid-cols-2 gap-2 text-[11px]">
              <div className="flex items-center gap-1.5 bg-white p-2 rounded border border-slate-200">
                <CircleDot className="w-3.5 h-3.5 text-orange-600 flex-shrink-0" />
                <div>
                  <span className="font-bold text-slate-900">{tyreItems.length}</span>
                  <span className="text-slate-500 text-[10px]"> tyre sizes ({totalTyreQty} pcs)</span>
                </div>
              </div>
              <div className="flex items-center gap-1.5 bg-white p-2 rounded border border-slate-200">
                <Disc className="w-3.5 h-3.5 text-amber-600 flex-shrink-0" />
                <div>
                  <span className="font-bold text-slate-900">{rimItems.length}</span>
                  <span className="text-slate-500 text-[10px]"> rim sizes ({totalRimQty} sets)</span>
                </div>
              </div>
            </div>
          </div>

          {/* Status Message */}
          {statusMessage && (
            <div className="p-2.5 rounded-lg bg-orange-50 border border-orange-200 text-orange-900 flex items-center gap-2 text-[11px]">
              <RefreshCw className="w-3.5 h-3.5 animate-spin text-orange-600 flex-shrink-0" />
              <span>{statusMessage}</span>
            </div>
          )}

          {/* Action 1: Clear All Old Stock */}
          {!isConfirmingClear ? (
            <div className="p-3 rounded-lg border border-rose-200 bg-rose-50/50 space-y-2">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <h3 className="font-bold text-rose-900 text-[11px] flex items-center gap-1">
                    <Trash2 className="w-3.5 h-3.5 text-rose-600" />
                    Delete All Old Stock Data
                  </h3>
                  <p className="text-[10px] text-rose-700/80 mt-0.5 leading-snug">
                    Permanently wipe all {items.length} items from cloud database and local storage. Refreshing will never bring them back.
                  </p>
                </div>
              </div>
              <button
                type="button"
                disabled={isProcessing || items.length === 0}
                onClick={() => setIsConfirmingClear(true)}
                className={`w-full py-1.5 px-3 rounded-lg font-bold text-[11px] flex items-center justify-center gap-1.5 transition ${
                  items.length === 0
                    ? 'bg-slate-200 text-slate-400 cursor-not-allowed'
                    : 'bg-rose-600 hover:bg-rose-700 text-white shadow-xs active:scale-98'
                }`}
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Delete All Old Stock ({items.length} items)</span>
              </button>
            </div>
          ) : (
            <div className="p-3 rounded-lg border-2 border-rose-500 bg-rose-50 space-y-2 animate-fadeIn">
              <div className="flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 text-rose-600 flex-shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-bold text-rose-950 text-xs">Are you absolutely sure?</h4>
                  <p className="text-[10px] text-rose-800 mt-0.5">
                    This will permanently delete all {items.length} inventory items ({totalTyreQty} tyres and {totalRimQty} rims) from Firebase Cloud and your device.
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2 pt-1">
                <button
                  type="button"
                  disabled={isProcessing}
                  onClick={() => setIsConfirmingClear(false)}
                  className="flex-1 py-1.5 rounded-lg bg-white border border-slate-300 text-slate-700 hover:bg-slate-50 font-medium text-[11px]"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={isProcessing}
                  onClick={handleExecuteClear}
                  className="flex-1 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-700 text-white font-bold text-[11px] flex items-center justify-center gap-1"
                >
                  {isProcessing ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                  <span>Yes, Delete All</span>
                </button>
              </div>
            </div>
          )}

          {/* Action 2: Restore Sample Demo Stock (Optional) */}
          <div className="p-2.5 rounded-lg border border-slate-200 bg-slate-50/60 flex items-center justify-between gap-2">
            <div>
              <span className="font-bold text-slate-800 block text-[11px]">Load Sample Stock (Demo)</span>
              <span className="text-[10px] text-slate-500 block leading-tight">Pre-load popular brands &amp; sizes for testing</span>
            </div>
            <button
              type="button"
              disabled={isProcessing}
              onClick={handleExecuteRestore}
              className="py-1 px-2.5 rounded-md bg-white border border-slate-300 hover:bg-slate-100 text-slate-700 font-medium text-[10px] flex items-center gap-1 shadow-2xs whitespace-nowrap"
            >
              <RefreshCw className="w-3 h-3 text-slate-500" />
              <span>Load Demo Data</span>
            </button>
          </div>
        </div>

        {/* Footer */}
        <div className="p-2.5 border-t border-slate-200 bg-slate-50 flex justify-end">
          <button
            type="button"
            disabled={isProcessing}
            onClick={onClose}
            className="px-3 py-1 rounded-lg bg-slate-200 hover:bg-slate-300 text-slate-700 font-semibold text-[11px] transition"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
