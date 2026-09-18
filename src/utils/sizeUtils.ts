import { ItemType } from '../types';

export interface ParsedSizeInfo {
  diameter: number; // e.g. 16
  diameterLabel: string; // e.g. "16 inch"
  diameterShort: string; // e.g. "16\""
  width: number; // e.g. 205
  ratio: number; // e.g. 55
  rawSize: string; // e.g. "205/55 R16"
}

/**
 * Extracts numeric diameter, width, and profile ratio from any tyre or rim size string.
 */
export function parseItemSize(size: string, type: ItemType): ParsedSizeInfo {
  const safeSize = (size || '').trim();
  if (!safeSize) {
    return {
      diameter: 0,
      diameterLabel: 'Other Sizes',
      diameterShort: 'Other',
      width: 0,
      ratio: 0,
      rawSize: 'Other',
    };
  }

  if (type === 'rim') {
    const m = safeSize.match(/(\d+)/);
    const d = m ? parseInt(m[1], 10) : 0;
    return {
      diameter: d,
      diameterLabel: d ? `${d} Inch Alloy Rims` : safeSize,
      diameterShort: d ? `${d}"` : safeSize,
      width: 0,
      ratio: 0,
      rawSize: safeSize,
    };
  }

  // Tyre: e.g. "205/55 R16", "195/65R15", "16 inch", "145/80 R12", "265/65 R17"
  const dMatch =
    safeSize.match(/[rR]\s*(\d+)/i) ||
    safeSize.match(/(\d+)\s*(?:inch|\")/i) ||
    safeSize.match(/\/.*?(?:[^\d]|^)(\d{2})(?:[^\d]|$)/);
  const diameter = dMatch ? parseInt(dMatch[1], 10) : 0;

  const wMatch = safeSize.match(/^(\d+)/);
  const width = wMatch ? parseInt(wMatch[1], 10) : 0;

  const rMatch = safeSize.match(/\/(\d+)/);
  const ratio = rMatch ? parseInt(rMatch[1], 10) : 0;

  return {
    diameter,
    diameterLabel: diameter ? `${diameter} Inch Tyres` : 'Other Sizes',
    diameterShort: diameter ? `${diameter}"` : 'Other',
    width,
    ratio,
    rawSize: safeSize,
  };
}

/**
 * Sorts tyre sizes by: Diameter (asc) -> Width (asc) -> Aspect Ratio (asc)
 * And rim sizes by: Diameter (asc)
 */
export function compareSizes(a: string, b: string, type: ItemType): number {
  const pa = parseItemSize(a, type);
  const pb = parseItemSize(b, type);

  // Both have known diameter
  if (pa.diameter !== pb.diameter) {
    if (pa.diameter === 0) return 1;
    if (pb.diameter === 0) return -1;
    return pa.diameter - pb.diameter;
  }

  if (type === 'tyre') {
    if (pa.width !== pb.width) {
      if (pa.width === 0) return 1;
      if (pb.width === 0) return -1;
      return pa.width - pb.width;
    }
    if (pa.ratio !== pb.ratio) {
      return pa.ratio - pb.ratio;
    }
  }

  return a.localeCompare(b);
}
