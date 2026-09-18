import React from 'react';
import { AlertTriangle, Trash2, X } from 'lucide-react';

interface ConfirmModalProps {
  isOpen: boolean;
  title: string;
  message: string;
  itemName?: string;
  itemDetail?: string;
  confirmText?: string;
  cancelText?: string;
  isDestructive?: boolean;
  onConfirm: () => void;
  onClose: () => void;
}

export const ConfirmModal: React.FC<ConfirmModalProps> = ({
  isOpen,
  title,
  message,
  itemName,
  itemDetail,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  isDestructive = true,
  onConfirm,
  onClose,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-slate-900/50 backdrop-blur-xs animate-fadeIn">
      <div
        className="bg-white border border-slate-200 rounded-xl w-full max-w-xs shadow-xl overflow-hidden text-slate-900 p-3.5 space-y-3"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2">
            <div
              className={`p-1.5 rounded-lg flex-shrink-0 ${
                isDestructive
                  ? 'bg-rose-50 text-rose-600 border border-rose-200'
                  : 'bg-amber-50 text-amber-600 border border-amber-200'
              }`}
            >
              {isDestructive ? (
                <Trash2 className="w-3.5 h-3.5" />
              ) : (
                <AlertTriangle className="w-3.5 h-3.5" />
              )}
            </div>
            <div>
              <h3 className="text-xs font-bold text-slate-900 leading-tight">{title}</h3>
              <p className="text-[10px] text-slate-500 mt-0.5 leading-tight">{message}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-700 p-1 rounded-md hover:bg-slate-100 transition"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>

        {itemName && (
          <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-200">
            <span className="font-bold text-slate-900 block truncate text-[11px]">{itemName}</span>
            {itemDetail && (
              <span className="text-orange-600 text-[10px] font-medium block mt-0.5">
                {itemDetail}
              </span>
            )}
          </div>
        )}

        <div className="flex items-center gap-1.5 pt-0.5">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 font-medium text-[11px] transition"
          >
            {cancelText}
          </button>
          <button
            type="button"
            onClick={() => {
              onConfirm();
              onClose();
            }}
            className={`flex-1 py-1.5 rounded-lg font-bold text-[11px] flex items-center justify-center gap-1 transition active:scale-95 shadow-xs ${
              isDestructive
                ? 'bg-rose-600 hover:bg-rose-700 text-white'
                : 'bg-orange-500 hover:bg-orange-600 text-white'
            }`}
          >
            {isDestructive && <Trash2 className="w-3 h-3" />}
            <span>{confirmText}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
