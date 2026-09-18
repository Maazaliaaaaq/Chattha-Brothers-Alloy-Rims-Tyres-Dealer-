import React, { useState, useEffect } from 'react';
import { InventoryItem, ItemType } from '../types';
import {
  TYRE_BRANDS,
  RIM_BRANDS,
  POPULAR_TYRE_SIZES,
  POPULAR_RIM_SIZES,
} from '../data/defaultStock';
import { X, Check, Disc, CircleDot, AlertCircle } from 'lucide-react';

interface ItemModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (itemData: Omit<InventoryItem, 'id' | 'updatedAt'>, editId?: string) => void;
  editingItem?: InventoryItem | null;
  initialType?: ItemType;
  initialBrand?: string;
  initialSize?: string;
}

export const ItemModal: React.FC<ItemModalProps> = ({
  isOpen,
  onClose,
  onSave,
  editingItem,
  initialType = 'tyre',
  initialBrand,
  initialSize,
}) => {
  const [type, setType] = useState<ItemType>(editingItem?.type || initialType);
  const [brand, setBrand] = useState<string>(
    editingItem?.brand || initialBrand || TYRE_BRANDS[0]
  );
  const [customBrand, setCustomBrand] = useState<string>('');
  const [model, setModel] = useState<string>(editingItem?.model || '');
  const [size, setSize] = useState<string>(
    editingItem?.size || initialSize || POPULAR_TYRE_SIZES[0]
  );
  const [customSize, setCustomSize] = useState<string>('');
  const [condition, setCondition] = useState<'New' | 'Used'>(
    editingItem?.condition || 'New'
  );
  const [pcd, setPcd] = useState<string>(editingItem?.pcd || '');
  const [qty, setQty] = useState<number>(editingItem?.qty ?? 4);
  const [minQty, setMinQty] = useState<number>(editingItem?.minQty ?? 4);
  const [rack, setRack] = useState<string>(editingItem?.rack || 'Rack-1');
  const [errorMsg, setErrorMsg] = useState<string>('');

  useEffect(() => {
    setErrorMsg('');
    if (editingItem) {
      setType(editingItem.type);
      const isKnownBrand =
        editingItem.type === 'tyre'
          ? TYRE_BRANDS.includes(editingItem.brand)
          : RIM_BRANDS.includes(editingItem.brand);

      if (isKnownBrand) {
        setBrand(editingItem.brand);
        setCustomBrand('');
      } else {
        setBrand('Other');
        setCustomBrand(editingItem.brand);
      }

      setModel(editingItem.model || '');

      const isKnownSize =
        editingItem.type === 'tyre'
          ? POPULAR_TYRE_SIZES.includes(editingItem.size)
          : POPULAR_RIM_SIZES.includes(editingItem.size);

      if (isKnownSize) {
        setSize(editingItem.size);
        setCustomSize('');
      } else {
        setSize('Other');
        setCustomSize(editingItem.size);
      }

      setCondition(editingItem.condition || 'New');
      setPcd(editingItem.pcd || '');
      setQty(editingItem.qty);
      setMinQty(editingItem.minQty || 4);
      setRack(editingItem.rack || 'Rack-1');
    } else {
      const activeType = initialType;
      setType(activeType);
      const defaultB = initialBrand || (activeType === 'tyre' ? TYRE_BRANDS[0] : RIM_BRANDS[0]);
      setBrand(defaultB);
      setCustomBrand('');
      setModel('');

      const defaultTargetSize =
        initialSize || (activeType === 'tyre' ? POPULAR_TYRE_SIZES[9] : POPULAR_RIM_SIZES[2]);
      const isKnownSize =
        activeType === 'tyre'
          ? POPULAR_TYRE_SIZES.includes(defaultTargetSize)
          : POPULAR_RIM_SIZES.includes(defaultTargetSize);

      if (isKnownSize) {
        setSize(defaultTargetSize);
        setCustomSize('');
      } else {
        setSize('Other');
        setCustomSize(defaultTargetSize);
      }

      setCondition('New');
      setPcd('');
      setQty(activeType === 'tyre' ? 8 : 4);
      setMinQty(activeType === 'tyre' ? 4 : 2);
      setRack(activeType === 'tyre' ? 'Rack T-1' : 'Shelf R-1');
    }
  }, [editingItem, initialType, initialBrand, initialSize, isOpen]);

  if (!isOpen) return null;

  const handleTypeChange = (newType: ItemType) => {
    setType(newType);
    setErrorMsg('');
    if (!editingItem) {
      if (newType === 'tyre') {
        setBrand(TYRE_BRANDS[0]);
        setSize(POPULAR_TYRE_SIZES[9]);
        setRack('Rack T-1');
        setMinQty(4);
      } else {
        setBrand(RIM_BRANDS[0]);
        setSize(POPULAR_RIM_SIZES[2]);
        setRack('Shelf R-1');
        setMinQty(2);
      }
    }
  };

  const currentBrands = type === 'tyre' ? TYRE_BRANDS : RIM_BRANDS;
  const currentSizes = type === 'tyre' ? POPULAR_TYRE_SIZES : POPULAR_RIM_SIZES;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const finalBrand = brand === 'Other' ? customBrand.trim() : brand;
    const finalSize = size === 'Other' ? customSize.trim() : size;

    if (!finalBrand) {
      setErrorMsg('Please enter or select a brand name.');
      return;
    }
    if (!finalSize) {
      setErrorMsg('Please enter or select a size.');
      return;
    }

    onSave(
      {
        type,
        brand: finalBrand,
        model: model.trim(),
        size: finalSize,
        condition,
        pcd: type === 'rim' ? pcd.trim() : undefined,
        qty: Math.max(0, qty),
        minQty: Math.max(0, minQty),
        rack: rack.trim() || (type === 'tyre' ? 'Rack T' : 'Shelf R'),
        buyPrice: 0,
        sellPrice: 0,
      },
      editingItem?.id
    );

    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-3 bg-slate-900/50 backdrop-blur-xs animate-fadeIn">
      <div
        className="bg-white border border-slate-200 rounded-t-xl sm:rounded-xl w-full max-w-sm shadow-xl overflow-hidden text-slate-900 flex flex-col max-h-[92vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="px-3.5 py-2.5 border-b border-slate-200 flex items-center justify-between bg-slate-50">
          <div>
            <h3 className="text-xs font-bold text-slate-900">
              {editingItem ? 'Edit Stock Item' : 'Add New Stock'}
            </h3>
            <p className="text-[9px] text-slate-500">
              Chattha Brothers Tyres &amp; Rims Dealer
            </p>
          </div>
          <button
            onClick={onClose}
            className="w-6 h-6 rounded flex items-center justify-center bg-slate-100 text-slate-500 hover:text-slate-900 hover:bg-slate-200 transition"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-3 overflow-y-auto space-y-2.5">
          {errorMsg && (
            <div className="p-2 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-[11px] flex items-center gap-1.5">
              <AlertCircle className="w-3.5 h-3.5 flex-shrink-0 text-rose-600" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Item Type Switcher */}
          <div>
            <label className="block text-[9px] font-bold uppercase text-slate-500 mb-1">
              Category
            </label>
            <div className="grid grid-cols-2 gap-1">
              <button
                type="button"
                onClick={() => handleTypeChange('tyre')}
                className={`py-1.5 px-2 rounded-lg font-bold text-[11px] flex items-center justify-center gap-1 transition border ${
                  type === 'tyre'
                    ? 'bg-orange-500 text-white border-orange-500 shadow-xs'
                    : 'bg-slate-100 text-slate-700 border-slate-200 hover:text-slate-900 hover:bg-slate-200'
                }`}
              >
                <CircleDot className="w-3 h-3" />
                <span>Tyre (Pcs)</span>
              </button>

              <button
                type="button"
                onClick={() => handleTypeChange('rim')}
                className={`py-1.5 px-2 rounded-lg font-bold text-[11px] flex items-center justify-center gap-1 transition border ${
                  type === 'rim'
                    ? 'bg-amber-500 text-white border-amber-500 shadow-xs'
                    : 'bg-slate-100 text-slate-700 border-slate-200 hover:text-slate-900 hover:bg-slate-200'
                }`}
              >
                <Disc className="w-3 h-3" />
                <span>Alloy Rim (Sets)</span>
              </button>
            </div>
          </div>

          {/* Brand Selection */}
          <div>
            <label className="block text-[9px] font-bold uppercase text-slate-500 mb-1">
              Brand
            </label>
            <div className="flex flex-wrap gap-1 mb-1">
              {currentBrands.map((b) => (
                <button
                  key={b}
                  type="button"
                  onClick={() => {
                    setBrand(b);
                    setCustomBrand('');
                    setErrorMsg('');
                  }}
                  className={`px-2 py-0.5 rounded text-[10px] font-medium transition border ${
                    brand === b
                      ? 'bg-orange-500 text-white border-orange-500 shadow-2xs'
                      : 'bg-slate-100 text-slate-700 border-slate-200 hover:bg-slate-200 hover:text-slate-900'
                  }`}
                >
                  {b}
                </button>
              ))}
              <button
                type="button"
                onClick={() => setBrand('Other')}
                className={`px-2 py-0.5 rounded text-[10px] font-medium transition border ${
                  brand === 'Other'
                    ? 'bg-orange-500 text-white border-orange-500 shadow-2xs'
                    : 'bg-slate-100 text-slate-700 border-slate-200 hover:bg-slate-200 hover:text-slate-900'
                }`}
              >
                + Other
              </button>
            </div>

            {brand === 'Other' && (
              <input
                type="text"
                placeholder="Enter custom brand name..."
                value={customBrand}
                onChange={(e) => {
                  setCustomBrand(e.target.value);
                  setErrorMsg('');
                }}
                className="w-full bg-white border border-orange-500 rounded-lg px-2.5 py-1.5 text-[11px] text-slate-900 focus:outline-none shadow-2xs"
                autoFocus
              />
            )}
          </div>

          {/* Model / Pattern (Optional) */}
          <div>
            <label className="block text-[9px] font-bold uppercase text-slate-500 mb-1">
              Pattern / Model / Design
            </label>
            <input
              type="text"
              placeholder={type === 'tyre' ? 'e.g. Setula S-Pace, BluEarth' : 'e.g. CV3, 5-Spoke concave'}
              value={model}
              onChange={(e) => setModel(e.target.value)}
              className="w-full bg-white border border-slate-300 focus:border-orange-500 rounded-lg px-2.5 py-1.5 text-[11px] text-slate-900 focus:outline-none shadow-2xs"
            />
          </div>

          {/* Size & Condition */}
          <div className="grid grid-cols-2 gap-1.5">
            <div>
              <label className="block text-[9px] font-bold uppercase text-slate-500 mb-1">
                Size
              </label>
              <select
                value={size}
                onChange={(e) => {
                  setSize(e.target.value);
                  setErrorMsg('');
                }}
                className="w-full bg-white border border-slate-300 focus:border-orange-500 rounded-lg px-2 py-1.5 text-[11px] text-slate-900 focus:outline-none shadow-2xs"
              >
                {currentSizes.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
                <option value="Other">Custom Size...</option>
              </select>

              {size === 'Other' && (
                <input
                  type="text"
                  placeholder="e.g. 215/55R17"
                  value={customSize}
                  onChange={(e) => {
                    setCustomSize(e.target.value);
                    setErrorMsg('');
                  }}
                  className="mt-1 w-full bg-white border border-orange-500 rounded-lg px-2 py-1 text-[11px] text-slate-900 focus:outline-none shadow-2xs"
                />
              )}
            </div>

            <div>
              <label className="block text-[9px] font-bold uppercase text-slate-500 mb-1">
                Condition
              </label>
              <div className="grid grid-cols-2 gap-1">
                <button
                  type="button"
                  onClick={() => setCondition('New')}
                  className={`py-1.5 rounded-lg text-[11px] font-bold border transition ${
                    condition === 'New'
                      ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                      : 'bg-slate-100 text-slate-600 border-slate-200 hover:text-slate-900'
                  }`}
                >
                  New
                </button>
                <button
                  type="button"
                  onClick={() => setCondition('Used')}
                  className={`py-1.5 rounded-lg text-[11px] font-bold border transition ${
                    condition === 'Used'
                      ? 'bg-purple-100 text-purple-800 border-purple-300'
                      : 'bg-slate-100 text-slate-600 border-slate-200 hover:text-slate-900'
                  }`}
                >
                  Used
                </button>
              </div>
            </div>
          </div>

          {/* PCD (for Rims only) */}
          {type === 'rim' && (
            <div>
              <label className="block text-[9px] font-bold uppercase text-slate-500 mb-1">
                Bolt Pattern (PCD)
              </label>
              <input
                type="text"
                placeholder="e.g. 5x114.3, 4x100, 5x112"
                value={pcd}
                onChange={(e) => setPcd(e.target.value)}
                className="w-full bg-white border border-slate-300 focus:border-orange-500 rounded-lg px-2.5 py-1.5 text-[11px] text-slate-900 focus:outline-none shadow-2xs"
              />
            </div>
          )}

          {/* Quantities & Location */}
          <div className="grid grid-cols-3 gap-1.5">
            <div>
              <label className="block text-[9px] font-bold uppercase text-slate-500 mb-1">
                Stock Qty
              </label>
              <input
                type="number"
                min="0"
                value={qty}
                onChange={(e) => setQty(Math.max(0, parseInt(e.target.value) || 0))}
                className="w-full bg-white border border-slate-300 focus:border-orange-500 rounded-lg px-2 py-1.5 text-[11px] text-center font-bold text-slate-900 focus:outline-none shadow-2xs"
              />
            </div>

            <div>
              <label className="block text-[9px] font-bold uppercase text-slate-500 mb-1">
                Min Alert
              </label>
              <input
                type="number"
                min="0"
                value={minQty}
                onChange={(e) => setMinQty(Math.max(0, parseInt(e.target.value) || 0))}
                className="w-full bg-white border border-slate-300 focus:border-orange-500 rounded-lg px-2 py-1.5 text-[11px] text-center font-bold text-slate-900 focus:outline-none shadow-2xs"
              />
            </div>

            <div>
              <label className="block text-[9px] font-bold uppercase text-slate-500 mb-1">
                Rack
              </label>
              <input
                type="text"
                placeholder="Rack T-1"
                value={rack}
                onChange={(e) => setRack(e.target.value)}
                className="w-full bg-white border border-slate-300 focus:border-orange-500 rounded-lg px-2 py-1.5 text-[11px] text-center text-slate-900 focus:outline-none shadow-2xs"
              />
            </div>
          </div>

          {/* Action Buttons */}
          <div className="pt-1.5 flex items-center gap-1.5 border-t border-slate-200">
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
              <span>{editingItem ? 'Save Changes' : 'Add Stock'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
