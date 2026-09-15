import { Warga } from '../types';

/**
 * Standardize house number string for comparison:
 * e.g., "01" -> "1", " 05 " -> "5", "No. 07" -> "7", "A-01" -> "a-1"
 */
export const normalizeHouseNumber = (num: string): string => {
  if (!num) return '';
  const cleaned = num
    .trim()
    .toLowerCase()
    .replace(/^no\.?\s*/i, '')
    .replace(/\s+/g, '');
  
  // If numeric with leading zeroes, normalize (e.g. "01" -> "1")
  if (/^\d+$/.test(cleaned)) {
    return String(parseInt(cleaned, 10));
  }
  return cleaned;
};

export const normalizeBlok = (blok?: string): string => {
  if (!blok) return '';
  return blok.trim().toLowerCase().replace(/\s+/g, ' ');
};

export const normalizeName = (name: string): string => {
  if (!name) return '';
  return name
    .trim()
    .toLowerCase()
    .replace(/^(bpk|ibu|sdr|sdri|pak|bu|bapak)\.?\s+/i, '')
    .replace(/\s+/g, ' ');
};

export interface DuplicateCheckResult {
  isDuplicate: boolean;
  reason?: string;
  duplicateWith?: Warga;
}

/**
 * Checks if a target warga collides with any existing warga in the list
 */
export const checkWargaDuplicate = (
  wargaList: Warga[],
  target: {
    nomorRumah: string;
    blok?: string;
    nama?: string;
    qrCodeData?: string;
    id?: string;
  },
  excludeId?: string
): DuplicateCheckResult => {
  const targetNormNum = normalizeHouseNumber(target.nomorRumah);
  const targetNormBlok = normalizeBlok(target.blok);
  const targetNormName = target.nama ? normalizeName(target.nama) : '';
  const targetQr = target.qrCodeData?.trim().toLowerCase();

  for (const w of wargaList) {
    if (excludeId && w.id === excludeId) continue;
    if (target.id && w.id === target.id) continue;

    const existNormNum = normalizeHouseNumber(w.nomorRumah);
    const existNormBlok = normalizeBlok(w.blok);
    const existNormName = normalizeName(w.nama);
    const existQr = w.qrCodeData?.trim().toLowerCase();

    // 1. Check exact QR Code match
    if (targetQr && existQr && targetQr === existQr) {
      return {
        isDuplicate: true,
        reason: `Kode QR identik dengan rumah No. ${w.nomorRumah} (${w.nama})`,
        duplicateWith: w,
      };
    }

    // 2. Check House Number + Blok match
    if (targetNormNum && existNormNum && targetNormNum === existNormNum) {
      // If blok is the same or neither has blok specified
      if (targetNormBlok === existNormBlok || !targetNormBlok || !existNormBlok) {
        return {
          isDuplicate: true,
          reason: `Nomor rumah ${w.nomorRumah} ${w.blok ? `(${w.blok})` : ''} sudah terdaftar atas nama ${w.nama}`,
          duplicateWith: w,
        };
      }
    }

    // 3. Check exact Name + House Number match
    if (targetNormName && existNormName && targetNormName === existNormName && targetNormNum === existNormNum) {
      return {
        isDuplicate: true,
        reason: `Warga atas nama "${w.nama}" di rumah No. ${w.nomorRumah} sudah terdaftar`,
        duplicateWith: w,
      };
    }
  }

  return { isDuplicate: false };
};

/**
 * Deduplicates an array of warga, merging info from duplicates into the retained record.
 * Returns deduplicated list and list of redundant IDs that were purged.
 */
export const deduplicateWargaArray = (
  rawList: Warga[]
): { cleanList: Warga[]; duplicateIds: string[] } => {
  const seenKeys = new Map<string, Warga>();
  const duplicateIds: string[] = [];

  for (const item of rawList) {
    if (!item.nomorRumah && !item.nama) continue;

    const normNum = normalizeHouseNumber(item.nomorRumah);
    const normBlok = normalizeBlok(item.blok);
    const key = `${normBlok}__${normNum}`;

    if (!seenKeys.has(key)) {
      seenKeys.set(key, { ...item });
    } else {
      // Merge extra fields to the primary record
      const existing = seenKeys.get(key)!;
      duplicateIds.push(item.id);

      const merged: Warga = {
        ...existing,
        // Prefer non-empty phone number
        nomorHp: existing.nomorHp || item.nomorHp || '',
        // Prefer longer/more detailed address
        alamat: (existing.alamat?.length || 0) >= (item.alamat?.length || 0) ? existing.alamat : item.alamat,
        // Prefer custom nominal
        nominalDefault: existing.nominalDefault || item.nominalDefault || 1000,
        // Ensure active
        isActive: existing.isActive !== undefined ? existing.isActive : item.isActive,
      };
      seenKeys.set(key, merged);
    }
  }

  const cleanList = Array.from(seenKeys.values());
  cleanList.sort((a, b) => a.nomorRumah.localeCompare(b.nomorRumah, undefined, { numeric: true }));

  return { cleanList, duplicateIds };
};
