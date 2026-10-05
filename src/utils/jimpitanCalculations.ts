import { Warga, JimpitanRecord, AppSettings } from '../types';

export interface DailyStatus {
  dayNum: number;
  dateIso: string;
  isPaid: boolean;
  nominal: number;
  isAdvance: boolean;
  isAdvanceCovered: boolean;
  isAdvanceSource: boolean;
  advanceRecord?: JimpitanRecord;
  rawRecords: JimpitanRecord[];
  petugas: string;
  reguNama: string;
  waktu?: string;
  catatan?: string;
}

export interface WargaMonthDistribution {
  warga: Warga;
  year: number;
  month: number;
  daysInMonth: number;
  tarifHarian: number;
  targetBulan: number;
  totalTerbayar: number;
  countPaidDays: number;
  hariKurang: number;
  nominalKurang: number;
  nominalLebih: number;
  selisih: number;
  isLunas: boolean;
  status: 'underpaid' | 'exact' | 'overpaid';
  dailyMap: Record<number, DailyStatus>;
  dailyList: DailyStatus[];
}

/**
 * Maps payment records directly to their exact transaction dates (1:1 mapping).
 * If a resident pays Rp 25,000 on date 2, only date 2 is marked as paid with nominal Rp 25,000.
 * Other dates without transactions remain unpaid (0 / '-').
 */
export function calculateWargaMonthDistribution(
  warga: Warga,
  allRecords: JimpitanRecord[],
  yearMonth: string, // "YYYY-MM"
  settings?: AppSettings
): WargaMonthDistribution {
  const parts = yearMonth.split('-').map(Number);
  const year = parts[0] || new Date().getFullYear();
  const month = parts[1] || new Date().getMonth() + 1;
  const daysInMonth = new Date(year, month, 0).getDate();

  const tarifHarian = warga.nominalDefault || settings?.defaultNominal || 1000;
  const targetBulan = tarifHarian * daysInMonth;

  // Filter records for this resident in this month with valid payment
  const monthRecords = allRecords.filter(
    (r) =>
      (r.wargaId === warga.id || r.nomorRumah === warga.nomorRumah) &&
      r.tanggal &&
      r.tanggal.startsWith(yearMonth) &&
      r.status !== 'kosong' &&
      r.status !== 'lewat' &&
      (Number(r.nominal) || 0) > 0
  );

  const totalTerbayar = monthRecords.reduce((sum, r) => sum + (Number(r.nominal) || 0), 0);

  // Initialize daily map for all days in the month (1..daysInMonth)
  const dailyMap: Record<number, DailyStatus> = {};
  for (let d = 1; d <= daysInMonth; d++) {
    const dateIso = `${yearMonth}-${String(d).padStart(2, '0')}`;
    dailyMap[d] = {
      dayNum: d,
      dateIso,
      isPaid: false,
      nominal: 0,
      isAdvance: false,
      isAdvanceCovered: false,
      isAdvanceSource: false,
      rawRecords: [],
      petugas: '-',
      reguNama: 'Pengurus RT',
      waktu: '22:00',
      catatan: '',
    };
  }

  // Exact 1:1 Mapping to transaction dates
  monthRecords.forEach((r) => {
    const dayNum = parseInt(r.tanggal.slice(8, 10), 10);
    const validNominal = Number(r.nominal) || 0;
    if (dayNum >= 1 && dayNum <= daysInMonth && validNominal > 0) {
      const current = dailyMap[dayNum];
      current.isPaid = true;
      current.nominal += validNominal;
      current.rawRecords.push(r);
      current.petugas = r.petugas || current.petugas;
      current.reguNama = r.reguNama || current.reguNama;
      current.waktu = r.waktu || current.waktu;
      if (r.catatan) {
        current.catatan = current.catatan ? `${current.catatan}, ${r.catatan}` : r.catatan;
      }
    }
  });

  // Convert map to ordered list
  const dailyList: DailyStatus[] = [];
  let countPaidDays = 0;

  for (let d = 1; d <= daysInMonth; d++) {
    const status = dailyMap[d];
    if (status.isPaid) {
      countPaidDays++;
    }
    dailyList.push(status);
  }

  const hariKurang = Math.max(0, daysInMonth - countPaidDays);
  const nominalKurang = Math.max(0, targetBulan - totalTerbayar);
  const nominalLebih = Math.max(0, totalTerbayar - targetBulan);
  const selisih = totalTerbayar - targetBulan;
  const isLunas = totalTerbayar >= targetBulan;

  let status: 'underpaid' | 'exact' | 'overpaid' = 'exact';
  if (totalTerbayar < targetBulan) {
    status = 'underpaid';
  } else if (totalTerbayar > targetBulan) {
    status = 'overpaid';
  }

  return {
    warga,
    year,
    month,
    daysInMonth,
    tarifHarian,
    targetBulan,
    totalTerbayar,
    countPaidDays,
    hariKurang,
    nominalKurang,
    nominalLebih,
    selisih,
    isLunas,
    status,
    dailyMap,
    dailyList,
  };
}
