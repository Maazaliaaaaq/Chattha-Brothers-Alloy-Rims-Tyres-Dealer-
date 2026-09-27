import { InventoryItem, ShopSettings, StockAdjustment } from '../types';

export const DEFAULT_SETTINGS: ShopSettings = {
  shopName: 'Chattha Brothers Alloy Rims & Tyres Dealer',
  tagline: 'Premium Tyres & Authentic Alloy Rims Stockist',
  phone: '+92 300 1234567',
  address: 'Main Auto Market, Chattha Brothers Plaza',
  currency: 'Rs',
  defaultLowStockThreshold: 4,
};

export const TYRE_BRANDS = [
  'Rotalla',
  'Transmate',
  'AutoGrip',
  'GoodMarch',
  'Cruiser',
  'Atlas',
  'StRacing',
  'General',
];

export const RIM_BRANDS = [
  'Vossen China New',
  'Spartx',
  'Primo',
  'Used',
];

export const POPULAR_TYRE_SIZES = [
  '145/80 R12',
  '155/70 R13',
  '165/70 R13',
  '165/70 R14',
  '175/65 R14',
  '175/70 R14',
  '185/65 R15',
  '185/70 R14',
  '195/60 R15',
  '195/65 R15',
  '205/55 R16',
  '205/60 R16',
  '215/55 R17',
  '215/60 R16',
  '225/45 R17',
  '225/40 R18',
  '235/45 R18',
  '245/70 R16',
  '265/65 R17',
  '285/60 R18',
];

export const POPULAR_RIM_SIZES = [
  '13 inch',
  '14 inch',
  '15 inch',
  '16 inch',
  '17 inch',
  '18 inch',
  '19 inch',
  '20 inch',
];

export const POPULAR_PCDS = [
  '4x100',
  '4x114.3',
  '5x100',
  '5x114.3',
  '5x112',
  '5x120',
  '6x139.7',
];

// Clean empty stock - no demo/sample items will ever resurrect
export const INITIAL_ITEMS: InventoryItem[] = [];

export const INITIAL_ADJUSTMENTS: StockAdjustment[] = [];
