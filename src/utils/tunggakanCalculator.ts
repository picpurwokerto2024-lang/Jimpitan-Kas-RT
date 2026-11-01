import { Warga, JimpitanRecord, KasMutation, AppSettings } from '../types';
import { normalizeHouseNumber } from './wargaDeduplicator';

export interface MonthArrearsBreakdown {
  yearMonth: string; // e.g. "2026-10"
  year: number;
  month: number;
  monthLabel: string; // e.g. "Oktober 2026"
  daysInMonth: number;
  targetMurniNominal: number; // Base target before surplus carry-over
  surplusMasukNominal: number; // Surplus carried in from previous month(s)
  potonganSurplusNominal: number; // Surplus applied to reduce targetMurniNominal
  targetNominal: number; // Effective target after surplus deduction
  terbayarNominal: number;
  kurangNominal: number; // > 0 if unpaid against effective target in this month
  lebihNominal: number; // > 0 if surplus remains at end of month (carries to next month)
  isLunas: boolean;
  isCoveredByCutoff?: boolean; // true if waived/overridden by an earlier/same-month admin cutoff
}

export interface WargaTunggakanDetail {
  warga: Warga;

  // Rincian per bulan lampau (Bulan & Tahun Sebelum Bulan Aktif)
  rincianBulanLampau: MonthArrearsBreakdown[];
  jumlahBulanTertunggak: number;
  deskripsiBulanTertunggak: string;

  // Saldo Lampau Kumulatif Murni Sistem (Semua Bulan & Tahun Sebelum Bulan Aktif)
  totalTunggakanKumulatif: number;
  totalDepositKumulatif: number;

  // Penyesuaian / Koreksi Manual Admin
  isManualOverride: boolean;
  isHistoricalCutoffOnly: boolean;
  saldoTunggakanAwal?: number;
  koreksiPiutang?: number;
  catatanKoreksiPiutang?: string;
  tanggalKoreksiPiutang?: string;

  // Saldo Lampau 1 Bulan Terakhir (Immediate Previous Month)
  targetBulanLalu: number;
  terbayarBulanLalu: number;
  tunggakanBulanLalu: number; // Total hutang awal efektif sesuai mode
  tunggakanSatuBulanLaluMurni: number; // Kurang bayar murni 1 bulan terakhir
  depositBulanLalu: number; // Sisa surplus dari periode lampau yang masuk mengurangi target bulan ini

  // Mutasi / Pelunasan yang telah dibayarkan
  pelunasanBulanIni: number; // Pelunasan di bulan aktif
  totalPelunasanSemua: number; // Seluruh pelunasan relevan setelah periode hutang
  pelunasanRecords: KasMutation[];

  // Saldo Akhir Tunggakan Lampau
  sisaTunggakanLalu: number; // Kewajiban bulan-bulan lampau yang belum lunas (>= 0)
  isTunggakanLunas: boolean;

  // Tagihan & Pembayaran Bulan Berjalan Ini (Setelah dikurangi Surplus Bulan Lalu)
  targetMurniBulanIni: number;
  surplusMasukBulanIni: number;
  potonganSurplusBulanIni: number;
  targetBulanIni: number; // Effective target bulan ini setelah dikurangi surplus bulan lalu
  terbayarBulanIni: number;
  kurangBulanIni: number; // Kekurangan terhadap target efektif bulan berjalan (>= 0)
  lebihBulanIni: number; // Surplus akhir bulan ini untuk bulan depannya lagi
  selisihBulanIni: number;

  // Total Kewajiban Bersih Keseluruhan (Sisa Tunggakan Lampau + Kurang Bayar Bulan Berjalan)
  totalKewajibanBersih: number;
}

export interface TunggakanReportSummary {
  totalWarga: number;
  totalWargaAktifWajib: number;
  totalWargaTertunggakLalu: number;
  totalWargaKurangBulanIni: number;
  totalWargaKewajibanGabungan: number;
  totalTunggakanBulanLalu: number;
  totalTunggakanKumulatifSemua: number;
  totalPelunasanBulanIni: number;
  totalSisaTunggakanLalu: number;
  totalKurangBulanIni: number;
  totalTargetBulanIni: number;
  totalTerbayarBulanIni: number;
  totalKewajibanGabungan: number;
  totalDepositBulanLalu: number;
  persenPelunasan: number;
  totalBulanTeridentifikasi: number;
}

const MONTH_NAMES = [
  'Januari',
  'Februari',
  'Maret',
  'April',
  'Mei',
  'Juni',
  'Juli',
  'Agustus',
  'September',
  'Oktober',
  'November',
  'Desember',
];

/**
 * Helper to generate continuous chronological YYYY-MM strings from startYm up to endYm (exclusive of endYm)
 */
const buildChronologicalPastMonths = (earliestYm: string, activeYm: string): string[] => {
  if (!earliestYm || earliestYm >= activeYm) return [];
  const [startY, startM] = earliestYm.split('-').map(Number);
  const [endY, endM] = activeYm.split('-').map(Number);
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

  return result; // Oldest first (chronological)
};

/**
 * Checks if a KasMutation is a debt/arrears settlement ("Pelunasan Tunggakan")
 */
const isPelunasanMutation = (m: KasMutation): boolean => {
  if (m.jenis !== 'masuk') return false;
  const cat = (m.kategori || '').toLowerCase();
  const ket = (m.keterangan || '').toLowerCase();
  return (
    cat.includes('pelunasan') ||
    cat.includes('tunggakan') ||
    cat.includes('tanggungan') ||
    cat.includes('hutang') ||
    cat.includes('piutang') ||
    cat.includes('bulan lalu') ||
    ket.includes('pelunasan') ||
    ket.includes('tunggakan') ||
    ket.includes('tanggungan') ||
    ket.includes('hutang') ||
    ket.includes('piutang') ||
    ket.includes('bulan lalu')
  );
};

/**
 * Checks if a KasMutation belongs to a specific Warga
 */
const doesMutationMatchWarga = (m: KasMutation, warga: Warga): boolean => {
  const ket = (m.keterangan || '').toLowerCase();
  const cat = (m.kategori || '').toLowerCase();
  const combined = `${cat} ${ket}`;

  if (warga.id && combined.includes(warga.id.toLowerCase())) {
    return true;
  }

  const normHouse = normalizeHouseNumber(warga.nomorRumah);
  const rawHouse = (warga.nomorRumah || '').trim().toLowerCase();
  if (rawHouse) {
    const escapedRaw = rawHouse.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const escapedNorm = normHouse.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const houseRegex = new RegExp(`(?:no\\.?|rumah)\\s*(?:${escapedRaw}|0*${escapedNorm})(?:\\b|\\D|$)`, 'i');
    if (houseRegex.test(combined)) {
      return true;
    }
  }

  const rawNama = (warga.nama || '').trim().toLowerCase();
  if (rawNama && rawNama.length >= 3) {
    if (combined.includes(rawNama)) return true;
    const strippedNama = rawNama
      .replace(/\(.*?\)/g, '')
      .replace(/^(bpk|bapak|ibu|ny|sdr|sdri|pak|bu)\.?\s+/i, '')
      .trim();
    if (strippedNama.length >= 4 && combined.includes(strippedNama)) {
      return true;
    }
  }

  return false;
};

/**
 * Calculates historical arrears, rolling monthly surplus carry-over, and current month target shortfalls.
 * - Any resident whose payment exceeds a month's target carries that surplus into the next month,
 *   directly reducing the next month's target (`targetNominal` / `targetBulanIni`).
 * - Any resident whose payment falls short of a month's effective target has the shortfall recorded as arrears.
 */
export const calculateTunggakanRekap = (
  wargaList: Warga[],
  allRecords: JimpitanRecord[],
  kasMutations: KasMutation[],
  activeYearMonth: string,
  settings: AppSettings,
  mode: 'all_history' | 'single_prev_month' | 'include_active_month' = 'all_history'
): {
  wargaListTunggakan: WargaTunggakanDetail[];
  summary: TunggakanReportSummary;
  prevMonthLabel: string;
  activeMonthLabel: string;
  allPastMonthLabels: string[];
} => {
  let safeYearMonth =
    typeof activeYearMonth === 'string' && activeYearMonth.includes('-')
      ? activeYearMonth.substring(0, 7)
      : '';

  if (!safeYearMonth || safeYearMonth.length !== 7) {
    const now = new Date();
    safeYearMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  }

  const [activeYear, activeMonth] = safeYearMonth.split('-').map(Number);

  let prevYear = activeYear;
  let prevMonth = activeMonth - 1;
  if (prevMonth < 1) {
    prevMonth = 12;
    prevYear -= 1;
  }
  const prevYearMonth = `${prevYear}-${String(prevMonth).padStart(2, '0')}`;

  const activeMonthLabel = `${MONTH_NAMES[activeMonth - 1]} ${activeYear}`;
  const prevMonthLabel = `${MONTH_NAMES[prevMonth - 1]} ${prevYear}`;

  const daysInActiveMonth = new Date(activeYear, activeMonth, 0).getDate();
  const daysInPrevMonth = new Date(prevYear, prevMonth, 0).getDate();

  // 1. Discover earliest historical month that has recorded jimpitan activity
  let earliestPastYm: string | null = null;
  allRecords.forEach((r) => {
    if (!r.tanggal || r.tanggal.length < 7) return;
    const ym = r.tanggal.substring(0, 7);
    if (ym < safeYearMonth && /^\d{4}-\d{2}$/.test(ym)) {
      if (
        (Number(r.nominal) || 0) > 0 ||
        r.status === 'sukses' ||
        r.status === 'titip' ||
        r.status === 'kosong' ||
        r.status === 'lewat'
      ) {
        if (!earliestPastYm || ym < earliestPastYm) {
          earliestPastYm = ym;
        }
      }
    }
  });

  // Chronological (oldest -> newest) for accurate rolling surplus calculation
  const chronologicalPastMonths = earliestPastYm
    ? buildChronologicalPastMonths(earliestPastYm, safeYearMonth)
    : [];

  // Newest -> oldest labels for display
  const allPastMonthLabels = [...chronologicalPastMonths].reverse().map((ym) => {
    const [y, m] = ym.split('-').map(Number);
    return `${MONTH_NAMES[m - 1]} ${y}`;
  });

  // 2. Group valid payment records by resident WITHOUT double-counting
  const recordsByWargaId = new Map<string, Map<string, JimpitanRecord>>();
  const recordsByNormHouse = new Map<string, Map<string, JimpitanRecord>>();

  allRecords.forEach((r) => {
    if (!r) return;
    const nominal = Number(r.nominal) || 0;
    if (r.status === 'kosong' || r.status === 'lewat' || nominal <= 0) return;

    const recId = r.id || `${r.tanggal}_${r.wargaId}_${r.nomorRumah}_${nominal}`;

    if (r.wargaId) {
      let mapById = recordsByWargaId.get(r.wargaId);
      if (!mapById) {
        mapById = new Map();
        recordsByWargaId.set(r.wargaId, mapById);
      }
      mapById.set(recId, r);
    }

    const normHouse = normalizeHouseNumber(r.nomorRumah);
    if (normHouse) {
      let mapByHouse = recordsByNormHouse.get(normHouse);
      if (!mapByHouse) {
        mapByHouse = new Map();
        recordsByNormHouse.set(normHouse, mapByHouse);
      }
      mapByHouse.set(recId, r);
    }
  });

  // 3. Collect all Pelunasan KasMutations
  const allPelunasanMutations = kasMutations.filter(isPelunasanMutation);

  const wargaListTunggakan: WargaTunggakanDetail[] = wargaList.map((warga) => {
    const fallbackNominal =
      settings?.defaultNominal && settings.defaultNominal > 0 ? settings.defaultNominal : 1000;
    const isExempt = warga.isActive === false || warga.nominalDefault === 0;
    const nominalDefault = isExempt
      ? 0
      : typeof warga.nominalDefault === 'number' && warga.nominalDefault > 0
      ? warga.nominalDefault
      : fallbackNominal;

    // Merge unique records matching either warga.id or normalized nomorRumah
    const mergedRecordMap = new Map<string, JimpitanRecord>();
    const byId = recordsByWargaId.get(warga.id);
    if (byId) {
      byId.forEach((val, key) => mergedRecordMap.set(key, val));
    }
    const normHouse = normalizeHouseNumber(warga.nomorRumah);
    if (normHouse) {
      const byHouse = recordsByNormHouse.get(normHouse);
      if (byHouse) {
        byHouse.forEach((val, key) => mergedRecordMap.set(key, val));
      }
    }
    const recs = Array.from(mergedRecordMap.values());

    // Admin manual override temporal cutoff
    const hasSaldoAwalOverride = typeof warga.saldoTunggakanAwal === 'number';
    const hasKoreksiDelta = typeof warga.koreksiPiutang === 'number' && warga.koreksiPiutang !== 0;
    const overrideYm =
      warga.tanggalKoreksiPiutang && warga.tanggalKoreksiPiutang.length >= 7
        ? warga.tanggalKoreksiPiutang.substring(0, 7)
        : '';

    const effectiveCutoffYm = hasSaldoAwalOverride ? overrideYm || safeYearMonth : '';

    // All records prior to current active month
    const prevRecs = recs.filter((r) => r.tanggal && r.tanggal < `${safeYearMonth}-01`);

    // Calculate month-by-month breakdown CHRONOLOGICALLY so surplus rolls forward to reduce next month's target
    const chronologicalBreakdowns: MonthArrearsBreakdown[] = [];
    let pureCumulativeTunggakan = 0;
    let postCutoffTunggakan = 0;
    let carrySurplus = 0;

    chronologicalPastMonths.forEach((ym) => {
      const [y, m] = ym.split('-').map(Number);
      const days = new Date(y, m, 0).getDate();
      const targetMurni = nominalDefault * days;
      const surplusMasuk = isExempt ? 0 : carrySurplus;
      const potonganSurplus = Math.min(targetMurni, surplusMasuk);
      const targetEfektif = Math.max(0, targetMurni - surplusMasuk);

      const monthRecs = prevRecs.filter((r) => r.tanggal && r.tanggal.startsWith(ym));
      const terbayar = monthRecs.reduce((sum, r) => sum + (Number(r.nominal) || 0), 0);

      const netDelta = terbayar + surplusMasuk - targetMurni;
      const kurang = netDelta < 0 ? Math.abs(netDelta) : 0;
      const lebih = netDelta > 0 ? netDelta : 0;
      carrySurplus = isExempt ? 0 : lebih;

      const isCoveredByCutoff = Boolean(
        hasSaldoAwalOverride && effectiveCutoffYm && ym < effectiveCutoffYm
      );
      const isLunas = kurang === 0 || (isCoveredByCutoff && (warga.saldoTunggakanAwal || 0) === 0);

      if (kurang > 0) {
        pureCumulativeTunggakan += kurang;
        if (!isCoveredByCutoff) {
          postCutoffTunggakan += kurang;
        }
      }

      chronologicalBreakdowns.push({
        yearMonth: ym,
        year: y,
        month: m,
        monthLabel: `${MONTH_NAMES[m - 1]} ${y}`,
        daysInMonth: days,
        targetMurniNominal: targetMurni,
        surplusMasukNominal: surplusMasuk,
        potonganSurplusNominal: potonganSurplus,
        targetNominal: targetEfektif,
        terbayarNominal: terbayar,
        kurangNominal: kurang,
        lebihNominal: lebih,
        isLunas,
        isCoveredByCutoff,
      });
    });

    // Display newest month first in UI
    const rincianBulanLampau = [...chronologicalBreakdowns].reverse();

    // Remaining surplus entering activeYearMonth (after reducing any intermediate past months)
    const surplusMasukBulanIni = isExempt ? 0 : carrySurplus;

    // 1 immediate previous month values
    const prevMonthDetail = rincianBulanLampau.find((b) => b.yearMonth === prevYearMonth);
    const targetBulanLalu = prevMonthDetail
      ? prevMonthDetail.targetNominal
      : nominalDefault * daysInPrevMonth;
    const terbayarBulanLalu = prevMonthDetail ? prevMonthDetail.terbayarNominal : 0;
    const tunggakanSatuBulanLaluMurni = prevMonthDetail ? prevMonthDetail.kurangNominal : 0;
    const depositSatuBulanLalu = prevMonthDetail ? prevMonthDetail.lebihNominal : 0;

    // Effective historical arrears calculation
    let effectiveAllHistoryArrears = pureCumulativeTunggakan;
    if (hasSaldoAwalOverride) {
      effectiveAllHistoryArrears = Math.max(0, warga.saldoTunggakanAwal || 0) + postCutoffTunggakan;
    }
    if (hasKoreksiDelta) {
      if (!overrideYm || overrideYm >= (earliestPastYm || prevYearMonth)) {
        effectiveAllHistoryArrears = Math.max(
          0,
          effectiveAllHistoryArrears + (warga.koreksiPiutang || 0)
        );
      }
    }

    let effectiveSinglePrevArrears = tunggakanSatuBulanLaluMurni;
    if (hasSaldoAwalOverride && effectiveCutoffYm > prevYearMonth) {
      effectiveSinglePrevArrears = Math.max(0, warga.saldoTunggakanAwal || 0);
    }

    const totalTunggakanLampauEffective =
      mode === 'single_prev_month' ? effectiveSinglePrevArrears : effectiveAllHistoryArrears;

    const isActiveOverrideOnCurrentView =
      (hasSaldoAwalOverride && effectiveCutoffYm > (earliestPastYm || '0000-00')) ||
      hasKoreksiDelta;
    const isHistoricalCutoffOnly = Boolean(
      hasSaldoAwalOverride &&
        !isActiveOverrideOnCurrentView &&
        (warga.saldoTunggakanAwal || 0) === 0
    );

    // Match Pelunasan mutations for this warga
    const matchingAllPelunasan = allPelunasanMutations.filter((m) => {
      if (!m.tanggal) return false;
      const mYm = m.tanggal.substring(0, 7);
      if (mYm > safeYearMonth) return false;
      if (
        hasSaldoAwalOverride &&
        warga.tanggalKoreksiPiutang &&
        m.tanggal < warga.tanggalKoreksiPiutang
      ) {
        return false;
      }
      if (mode === 'single_prev_month') {
        return mYm === safeYearMonth && doesMutationMatchWarga(m, warga);
      }
      if (earliestPastYm && mYm <= earliestPastYm && !hasSaldoAwalOverride) {
        const ketLower = `${m.kategori || ''} ${m.keterangan || ''}`.toLowerCase();
        const [, eM] = earliestPastYm.split('-').map(Number);
        const earliestMonthName = (MONTH_NAMES[eM - 1] || '').toLowerCase();
        if (!ketLower.includes(earliestMonthName) && !ketLower.includes(earliestPastYm)) {
          return false;
        }
      }
      if (
        hasSaldoAwalOverride &&
        (warga.saldoTunggakanAwal || 0) === 0 &&
        earliestPastYm &&
        mYm <= earliestPastYm
      ) {
        const ketLower = `${m.kategori || ''} ${m.keterangan || ''}`.toLowerCase();
        const [, eM] = earliestPastYm.split('-').map(Number);
        const earliestMonthName = (MONTH_NAMES[eM - 1] || '').toLowerCase();
        if (!ketLower.includes(earliestMonthName) && !ketLower.includes(earliestPastYm)) {
          return false;
        }
      }
      return doesMutationMatchWarga(m, warga);
    });

    const matchingActiveMonthPelunasan = matchingAllPelunasan.filter(
      (m) => m.tanggal && m.tanggal.startsWith(safeYearMonth)
    );

    const pelunasanBulanIni = matchingActiveMonthPelunasan.reduce(
      (sum, m) => sum + (Number(m.nominal) || 0),
      0
    );
    const totalPelunasanRelevan = matchingAllPelunasan.reduce(
      (sum, m) => sum + (Number(m.nominal) || 0),
      0
    );

    const sisaTunggakanLalu = Math.max(0, totalTunggakanLampauEffective - totalPelunasanRelevan);
    const isTunggakanLunas = totalTunggakanLampauEffective > 0 && sisaTunggakanLalu === 0;

    // Unpaid months summary (only months not waived by cutoff)
    const unpaidMonths = rincianBulanLampau.filter(
      (b) => b.kurangNominal > 0 && !b.isCoveredByCutoff
    );
    const jumlahBulanTertunggak =
      unpaidMonths.length > 0 ? unpaidMonths.length : sisaTunggakanLalu > 0 ? 1 : 0;
    const deskripsiBulanTertunggak =
      unpaidMonths.length > 0
        ? unpaidMonths
            .map((b) => `${b.monthLabel} (-Rp ${b.kurangNominal.toLocaleString('id-ID')})`)
            .join(', ')
        : sisaTunggakanLalu > 0
        ? `Saldo Piutang Awal (-Rp ${sisaTunggakanLalu.toLocaleString('id-ID')})`
        : 'Tidak ada tunggakan';

    // Current active month stats (Target Bulan Berjalan dikurangi Surplus Bulan Lalu)
    const currentMonthRecs = recs.filter((r) => r.tanggal && r.tanggal.startsWith(safeYearMonth));
    const targetMurniBulanIni = nominalDefault * daysInActiveMonth;
    const potonganSurplusBulanIni = Math.min(targetMurniBulanIni, surplusMasukBulanIni);
    const targetBulanIni = Math.max(0, targetMurniBulanIni - surplusMasukBulanIni);
    const terbayarBulanIni = currentMonthRecs.reduce(
      (sum, r) => sum + (Number(r.nominal) || 0),
      0
    );
    const netBulanIni = terbayarBulanIni + surplusMasukBulanIni - targetMurniBulanIni;
    const kurangBulanIni = netBulanIni < 0 ? Math.abs(netBulanIni) : 0;
    const lebihBulanIni = netBulanIni > 0 ? netBulanIni : 0;
    const selisihBulanIni = netBulanIni;

    // Total Kewajiban Bersih = Sisa Tunggakan Lampau + Kurang Bayar Bulan Berjalan (setelah potongan surplus)
    const totalKewajibanBersih = sisaTunggakanLalu + kurangBulanIni;

    return {
      warga,
      rincianBulanLampau,
      jumlahBulanTertunggak,
      deskripsiBulanTertunggak,
      totalTunggakanKumulatif: pureCumulativeTunggakan,
      totalDepositKumulatif: surplusMasukBulanIni,
      isManualOverride: isActiveOverrideOnCurrentView,
      isHistoricalCutoffOnly,
      saldoTunggakanAwal: warga.saldoTunggakanAwal,
      koreksiPiutang: warga.koreksiPiutang,
      catatanKoreksiPiutang: warga.catatanKoreksiPiutang,
      tanggalKoreksiPiutang: warga.tanggalKoreksiPiutang,
      targetBulanLalu,
      terbayarBulanLalu,
      tunggakanBulanLalu: totalTunggakanLampauEffective,
      tunggakanSatuBulanLaluMurni,
      depositBulanLalu:
        mode === 'single_prev_month' ? depositSatuBulanLalu : surplusMasukBulanIni,
      pelunasanBulanIni,
      totalPelunasanSemua: totalPelunasanRelevan,
      pelunasanRecords: matchingAllPelunasan,
      sisaTunggakanLalu,
      isTunggakanLunas,
      targetMurniBulanIni,
      surplusMasukBulanIni,
      potonganSurplusBulanIni,
      targetBulanIni,
      terbayarBulanIni,
      kurangBulanIni,
      lebihBulanIni,
      selisihBulanIni,
      totalKewajibanBersih,
    };
  });

  // KPI calculations
  let totalWargaAktifWajib = 0;
  let totalTunggakanBulanLalu = 0;
  let totalTunggakanKumulatifSemua = 0;
  let totalPelunasanBulanIni = 0;
  let totalSisaTunggakanLalu = 0;
  let totalKurangBulanIni = 0;
  let totalTargetBulanIni = 0;
  let totalTerbayarBulanIni = 0;
  let totalKewajibanGabungan = 0;
  let totalDepositBulanLalu = 0;
  let totalWargaTertunggakLalu = 0;
  let totalWargaKurangBulanIni = 0;
  let totalWargaKewajibanGabungan = 0;

  wargaListTunggakan.forEach((item) => {
    if (item.targetMurniBulanIni > 0) {
      totalWargaAktifWajib++;
    }
    totalTunggakanBulanLalu += item.tunggakanBulanLalu;
    totalTunggakanKumulatifSemua += item.totalTunggakanKumulatif;
    totalPelunasanBulanIni += item.pelunasanBulanIni;
    totalSisaTunggakanLalu += item.sisaTunggakanLalu;
    totalKurangBulanIni += item.kurangBulanIni;
    totalTargetBulanIni += item.targetBulanIni;
    totalTerbayarBulanIni += item.terbayarBulanIni;
    totalKewajibanGabungan += item.totalKewajibanBersih;
    totalDepositBulanLalu += item.depositBulanLalu;

    if (item.sisaTunggakanLalu > 0) {
      totalWargaTertunggakLalu++;
    }
    if (item.kurangBulanIni > 0) {
      totalWargaKurangBulanIni++;
    }
    if (item.totalKewajibanBersih > 0) {
      totalWargaKewajibanGabungan++;
    }
  });

  const baseTunggakanForPercent = totalTunggakanBulanLalu;
  const persenPelunasan =
    baseTunggakanForPercent > 0
      ? Math.min(
          100,
          Math.round(
            ((baseTunggakanForPercent - totalSisaTunggakanLalu) / baseTunggakanForPercent) * 100
          )
        )
      : 100;

  return {
    wargaListTunggakan,
    summary: {
      totalWarga: wargaList.length,
      totalWargaAktifWajib,
      totalWargaTertunggakLalu,
      totalWargaKurangBulanIni,
      totalWargaKewajibanGabungan,
      totalTunggakanBulanLalu,
      totalTunggakanKumulatifSemua,
      totalPelunasanBulanIni,
      totalSisaTunggakanLalu,
      totalKurangBulanIni,
      totalTargetBulanIni,
      totalTerbayarBulanIni,
      totalKewajibanGabungan,
      totalDepositBulanLalu,
      persenPelunasan,
      totalBulanTeridentifikasi: chronologicalPastMonths.length,
    },
    prevMonthLabel,
    activeMonthLabel,
    allPastMonthLabels,
  };
};
