import { Warga, JimpitanRecord, AppSettings } from '../types';
import { normalizeHouseNumber } from './wargaDeduplicator';

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
  targetMurniBulan: number; // Base monthly target (tarifHarian * daysInMonth)
  surplusBulanLalu: number; // Carry-over surplus from previous month(s)
  potonganSurplus: number; // Nominal surplus applied to reduce targetMurniBulan
  targetBulan: number; // Effective target after surplus deduction: max(0, targetMurniBulan - surplusBulanLalu)
  totalTerbayar: number;
  countPaidDays: number;
  hariKurang: number;
  nominalKurang: number;
  nominalLebih: number; // End-of-month surplus carried forward to next month
  selisih: number;
  isLunas: boolean;
  status: 'underpaid' | 'exact' | 'overpaid';
  dailyMap: Record<number, DailyStatus>;
  dailyList: DailyStatus[];
}

/**
 * Helper to generate continuous chronological YYYY-MM strings from startYm up to endYm (exclusive of endYm)
 */
function buildChronologicalMonthsBefore(earliestYm: string, targetYm: string): string[] {
  if (!earliestYm || earliestYm >= targetYm) return [];
  const [startY, startM] = earliestYm.split('-').map(Number);
  const [endY, endM] = targetYm.split('-').map(Number);
  if (!startY || !startM || !endY || !endM) return [];

  const result: string[] = [];
  let y = startY;
  let m = startM;
  let guard = 0;

  while ((y < endY || (y === endY && m < endM)) && guard < 120) {
    result.push(`${y}-${String(m).padStart(2, '0')}`);
    m += 1;
    if (m > 12) {
      m = 1;
      y += 1;
    }
    guard += 1;
  }

  return result;
}

/**
 * Maps payment records directly to their exact transaction dates (1:1 mapping),
 * and rolls forward any payment surplus (> monthly target) from previous months
 * to automatically reduce the next month's target (`targetBulan`).
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
  const safeTargetYm = `${year}-${String(month).padStart(2, '0')}`;
  const daysInMonth = new Date(year, month, 0).getDate();

  const fallbackTarif =
    settings?.defaultNominal && settings.defaultNominal > 0 ? settings.defaultNominal : 1000;
  const isExempt = warga.isActive === false || warga.nominalDefault === 0;
  const tarifHarian = isExempt
    ? 0
    : typeof warga.nominalDefault === 'number' && warga.nominalDefault > 0
    ? warga.nominalDefault
    : fallbackTarif;

  const targetMurniBulan = tarifHarian * daysInMonth;
  const normWargaHouse = normalizeHouseNumber(warga.nomorRumah);

  // Deduplicate all valid payment records belonging to this resident across time
  const uniqueResidentRecordsMap = new Map<string, JimpitanRecord>();
  allRecords.forEach((r) => {
    if (!r || !r.tanggal || r.tanggal.length < 7) return;
    if (r.status === 'kosong' || r.status === 'lewat') return;
    const nominal = Number(r.nominal) || 0;
    if (nominal <= 0) return;

    const matchesResident =
      (warga.id && r.wargaId === warga.id) ||
      (normWargaHouse && normalizeHouseNumber(r.nomorRumah) === normWargaHouse);

    if (matchesResident) {
      const recKey = r.id || `${r.tanggal}_${r.wargaId}_${r.nomorRumah}_${nominal}`;
      uniqueResidentRecordsMap.set(recKey, r);
    }
  });

  const residentValidRecords = Array.from(uniqueResidentRecordsMap.values());

  // Compute carry-over surplus chronologically from earliest payment month < safeTargetYm
  let earliestPastYm: string | null = null;
  const paidByMonthMap = new Map<string, number>();

  residentValidRecords.forEach((r) => {
    const ym = r.tanggal.substring(0, 7);
    if (!/^\d{4}-\d{2}$/.test(ym)) return;
    paidByMonthMap.set(ym, (paidByMonthMap.get(ym) || 0) + (Number(r.nominal) || 0));
    if (ym < safeTargetYm) {
      if (!earliestPastYm || ym < earliestPastYm) {
        earliestPastYm = ym;
      }
    }
  });

  let carrySurplus = 0;
  if (!isExempt && earliestPastYm) {
    const pastMonthsChronological = buildChronologicalMonthsBefore(earliestPastYm, safeTargetYm);
    pastMonthsChronological.forEach((ym) => {
      const [y, m] = ym.split('-').map(Number);
      const dCount = new Date(y, m, 0).getDate();
      const baseTarget = tarifHarian * dCount;
      const paidInYm = paidByMonthMap.get(ym) || 0;
      const netAfterTarget = paidInYm + carrySurplus - baseTarget;
      carrySurplus = netAfterTarget > 0 ? netAfterTarget : 0;
    });
  }

  const surplusBulanLalu = carrySurplus;
  const potonganSurplus = Math.min(targetMurniBulan, surplusBulanLalu);
  const targetBulan = Math.max(0, targetMurniBulan - surplusBulanLalu);

  // Records specifically in safeTargetYm
  const monthRecords = residentValidRecords.filter((r) => r.tanggal.startsWith(safeTargetYm));
  const totalTerbayar = monthRecords.reduce((sum, r) => sum + (Number(r.nominal) || 0), 0);

  // Initialize daily map for all days in the month (1..daysInMonth)
  const dailyMap: Record<number, DailyStatus> = {};
  for (let d = 1; d <= daysInMonth; d++) {
    const dateIso = `${safeTargetYm}-${String(d).padStart(2, '0')}`;
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

  // Net calculation factoring in carry-over surplus from previous month(s)
  const netDelta = totalTerbayar + surplusBulanLalu - targetMurniBulan;
  const nominalKurang = netDelta < 0 ? Math.abs(netDelta) : 0;
  const nominalLebih = netDelta > 0 ? netDelta : 0;
  const selisih = netDelta;
  const isLunas = netDelta >= 0;

  const hariKurang = isLunas
    ? 0
    : tarifHarian > 0
    ? Math.ceil(nominalKurang / tarifHarian)
    : Math.max(0, daysInMonth - countPaidDays);

  let status: 'underpaid' | 'exact' | 'overpaid' = 'exact';
  if (netDelta < 0) {
    status = 'underpaid';
  } else if (netDelta > 0) {
    status = 'overpaid';
  }

  return {
    warga,
    year,
    month,
    daysInMonth,
    tarifHarian,
    targetMurniBulan,
    surplusBulanLalu,
    potonganSurplus,
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
