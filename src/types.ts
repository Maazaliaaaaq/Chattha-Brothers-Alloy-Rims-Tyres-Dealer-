export type ItemType = 'tyre' | 'rim';

export interface InventoryItem {
  id: string;
  type: ItemType;
  brand: string;
  model: string;
  size: string;
  condition: 'New' | 'Used';
  tyreType?: 'Tubeless' | 'Tube';
  loadIndex?: string;
  width?: string;
  pcd?: string;
  offset?: string;
  finish?: string;
  buyPrice: number;
  sellPrice: number;
  qty: number;
  minQty: number;
  rack: string;
  notes?: string;
  updatedAt: number;
}

export type AdjustmentReason =
  | 'Stock In / Restock'
  | 'Customer Sale'
  | 'Return / Exchange'
  | 'Damaged / Defect'
  | 'Inventory Audit Correction'
  | 'Quick Adjustment';

export interface StockAdjustment {
  id: string;
  itemId: string;
  itemSummary: string;
  itemType: ItemType;
  previousQty: number;
  newQty: number;
  change: number;
  reason: AdjustmentReason;
  note?: string;
  timestamp: number;
}

export interface ShopSettings {
  shopName: string;
  tagline: string;
  phone: string;
  address: string;
  currency: string;
  defaultLowStockThreshold: number;
}
