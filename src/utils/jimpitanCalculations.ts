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
 * Calculates accurate daily payment distribution for a resident in a specific month.
 * If a resident pays a partial lump-sum amount (e.g., Rp 25,000 with tariff Rp 1,000),
 * only 25 days will be marked as paid/checked, and the remaining 5 or 6 days will remain unpaid.
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
      (r.status === 'sukses' || r.status === 'titip' || (r.nominal && r.nominal > 0))
  );

  const totalTerbayar = monthRecords.reduce((sum, r) => sum + (r.nominal || 0), 0);

  // Initialize all days
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

  // 1. Separate single-day records from lump-sum / multi-day records
  const singleDayRecords: JimpitanRecord[] = [];
  const multiDayRecords: JimpitanRecord[] = [];

  monthRecords.forEach((r) => {
    const isExplicitMonthly =
      r.catatan &&
      (r.catatan.toLowerCase().includes('lunas 1 bulan') ||
        r.catatan.toLowerCase().includes('lunas bulan') ||
        r.catatan.toLowerCase().includes('pelunasan bulan') ||
        r.catatan.toLowerCase().includes('30 hari') ||
        r.catatan.toLowerCase().includes('31 hari'));

    const isLumpSum = (r.nominal && r.nominal >= tarifHarian * 2) || isExplicitMonthly;

    if (isLumpSum) {
      multiDayRecords.push(r);
    } else {
      singleDayRecords.push(r);
    }
  });

  // 2. First pass: Apply specific single-day records
  singleDayRecords.forEach((r) => {
    const dayNum = parseInt(r.tanggal.slice(8, 10), 10);
    if (dayNum >= 1 && dayNum <= daysInMonth) {
      const current = dailyMap[dayNum];
      current.isPaid = true;
      current.nominal += r.nominal || tarifHarian;
      current.rawRecords.push(r);
      current.petugas = r.petugas || current.petugas;
      current.reguNama = r.reguNama || current.reguNama;
      current.waktu = r.waktu || current.waktu;
      current.catatan = r.catatan || current.catatan;
    }
  });

  // 3. Second pass: Distribute multi-day / advance payments proportionally
  multiDayRecords.forEach((adv) => {
    const paymentDay = parseInt(adv.tanggal.slice(8, 10), 10) || 1;
    
    // Explicit full month check ONLY if nominal >= targetBulan OR note states full month
    const isExplicitFullMonth =
      adv.nominal >= targetBulan ||
      (adv.catatan &&
        (adv.catatan.toLowerCase().includes('lunas 1 bulan') ||
          adv.catatan.toLowerCase().includes('lunas bulan') ||
          adv.catatan.toLowerCase().includes('pelunasan 1 bulan')));

    // Number of days covered by this specific nominal (e.g. Rp 25,000 = 25 days)
    const daysToCover = isExplicitFullMonth
      ? daysInMonth
      : Math.max(1, Math.floor((adv.nominal || 0) / tarifHarian));

    let daysAllocated = 0;

    // First try to allocate starting from day 1 (or payment day) on unpaid days
    for (let d = 1; d <= daysInMonth && daysAllocated < daysToCover; d++) {
      if (!dailyMap[d].isPaid) {
        dailyMap[d].isPaid = true;
        dailyMap[d].nominal = tarifHarian;
        dailyMap[d].isAdvance = true;
        dailyMap[d].isAdvanceCovered = true;
        dailyMap[d].isAdvanceSource = d === paymentDay;
        dailyMap[d].advanceRecord = adv;
        dailyMap[d].petugas = adv.petugas || dailyMap[d].petugas;
        dailyMap[d].reguNama = adv.reguNama || dailyMap[d].reguNama;
        dailyMap[d].waktu = adv.waktu || dailyMap[d].waktu;
        dailyMap[d].catatan =
          d === paymentDay
            ? `Setoran Sebagian/Dimuka: ${adv.nominal?.toLocaleString('id-ID')} (${daysToCover} Hari)`
            : `Tercover Setoran Dimuka (Hari ke-${daysAllocated + 1} dari ${daysToCover} hari)`;
        dailyMap[d].rawRecords.push(adv);
        daysAllocated++;
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
