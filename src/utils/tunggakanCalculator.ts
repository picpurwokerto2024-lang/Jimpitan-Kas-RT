import { Warga, JimpitanRecord, KasMutation, AppSettings } from '../types';

export interface MonthArrearsBreakdown {
  yearMonth: string; // e.g. "2026-08"
  year: number;
  month: number;
  monthLabel: string; // e.g. "Agustus 2026"
  daysInMonth: number;
  targetNominal: number;
  terbayarNominal: number;
  kurangNominal: number; // > 0 if unpaid
  lebihNominal: number;
  isLunas: boolean;
}

export interface WargaTunggakanDetail {
  warga: Warga;
  
  // Rincian per bulan lampau (Bulan & Tahun Sebelumnya)
  rincianBulanLampau: MonthArrearsBreakdown[];
  jumlahBulanTertunggak: number;
  deskripsiBulanTertunggak: string;
  
  // Saldo Lampau Kumulatif (Semua Bulan & Tahun Sebelum Bulan Aktif)
  totalTunggakanKumulatif: number; // Total kurang bayar dari seluruh bulan & tahun sebelumnya
  totalDepositKumulatif: number;
  
  // Penyesuaian / Koreksi Manual Admin
  isManualOverride: boolean;
  saldoTunggakanAwal?: number;
  koreksiPiutang?: number;
  catatanKoreksiPiutang?: string;
  
  // Saldo Lampau 1 Bulan Terakhir (Immediate Previous Month)
  targetBulanLalu: number;
  terbayarBulanLalu: number;
  tunggakanBulanLalu: number; // Kurang bayar dari 1 bulan sebelumnya (>= 0)
  depositBulanLalu: number; // Lebih bayar dari 1 bulan sebelumnya (>= 0)
  
  // Mutasi / Pelunasan di Bulan Berjalan
  pelunasanBulanIni: number; // Nominal yang dibayarkan khusus pelunasan tunggakan di bulan berjalan
  pelunasanRecords: KasMutation[];
  
  // Saldo Akhir Tunggakan Lampau
  sisaTunggakanLalu: number; // totalTunggakanKumulatif - pelunasanBulanIni (>= 0)
  isTunggakanLunas: boolean; // sisaTunggakanLalu === 0
  
  // Tagihan & Pembayaran Bulan Berjalan Ini
  targetBulanIni: number;
  terbayarBulanIni: number;
  selisihBulanIni: number; // terbayarBulanIni - targetBulanIni
  
  // Total Kewajiban Bersih Keseluruhan (Tunggakan Lampau Belum Lunas + Kurang Bayar Bulan Ini)
  totalKewajibanBersih: number;
}

export interface TunggakanReportSummary {
  totalWarga: number;
  totalWargaTertunggakLalu: number;
  totalTunggakanBulanLalu: number; // Kumulatif atau 1 bulan sesuai mode
  totalTunggakanKumulatifSemua: number;
  totalPelunasanBulanIni: number;
  totalSisaTunggakanLalu: number;
  totalDepositBulanLalu: number;
  persenPelunasan: number;
  totalBulanTeridentifikasi: number;
}

const MONTH_NAMES = [
  'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
  'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
];

/**
 * Calculates historical arrears and current month settlements for all residents
 * Covers ALL previous months and years before activeYearMonth
 * @param activeYearMonth e.g. "2026-09"
 */
export const calculateTunggakanRekap = (
  wargaList: Warga[],
  allRecords: JimpitanRecord[],
  kasMutations: KasMutation[],
  activeYearMonth: string,
  settings: AppSettings,
  mode: 'all_history' | 'single_prev_month' = 'all_history'
): {
  wargaListTunggakan: WargaTunggakanDetail[];
  summary: TunggakanReportSummary;
  prevMonthLabel: string;
  activeMonthLabel: string;
  allPastMonthLabels: string[];
} => {
  // Normalize and safely parse activeYearMonth
  let safeYearMonth = typeof activeYearMonth === 'string' && activeYearMonth.includes('-')
    ? activeYearMonth.substring(0, 7)
    : '';

  if (!safeYearMonth || safeYearMonth.length !== 7) {
    const now = new Date();
    safeYearMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  }

  const [activeYear, activeMonth] = safeYearMonth.split('-').map(Number);
  
  // Immediate previous month calculation
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

  // 1. Discover all past year-months that have historical data or relevant periods
  const historicalMonthSet = new Set<string>();
  
  // Always include immediate previous month
  historicalMonthSet.add(prevYearMonth);

  // Scan allRecords for past dates
  allRecords.forEach((r) => {
    if (!r.tanggal) return;
    const ym = r.tanggal.substring(0, 7);
    if (ym < safeYearMonth && ym.length === 7) {
      historicalMonthSet.add(ym);
    }
  });

  // Also include past months of current year up to activeMonth - 1
  for (let m = 1; m < activeMonth; m++) {
    const ym = `${activeYear}-${String(m).padStart(2, '0')}`;
    historicalMonthSet.add(ym);
  }

  // Sort historical months descending (most recent first)
  const sortedPastMonths = Array.from(historicalMonthSet).sort((a, b) => b.localeCompare(a));
  const allPastMonthLabels = sortedPastMonths.map((ym) => {
    const [y, m] = ym.split('-').map(Number);
    return `${MONTH_NAMES[m - 1]} ${y}`;
  });

  // 2. Group records by resident and by period
  const recordsByWarga = new Map<string, JimpitanRecord[]>();
  allRecords.forEach((r) => {
    if (r.status !== 'sukses' && r.status !== 'titip' && (!r.nominal || r.nominal <= 0)) return;
    const key = r.wargaId || `no_${r.nomorRumah}`;
    const list = recordsByWarga.get(key) || [];
    list.push(r);
    recordsByWarga.set(key, list);
    if (r.nomorRumah) {
      const houseKey = `no_${r.nomorRumah}`;
      if (houseKey !== key) {
        const hList = recordsByWarga.get(houseKey) || [];
        hList.push(r);
        recordsByWarga.set(houseKey, hList);
      }
    }
  });

  // 3. Group KasMutations for "Pelunasan Tunggakan" in current month / overall
  const pelunasanMutationsInActiveMonth = kasMutations.filter((m) => {
    if (m.jenis !== 'masuk') return false;
    if (!m.tanggal || !m.tanggal.startsWith(safeYearMonth)) return false;
    const cat = (m.kategori || '').toLowerCase();
    const ket = (m.keterangan || '').toLowerCase();
    return (
      cat.includes('pelunasan') ||
      cat.includes('tunggakan') ||
      cat.includes('hutang') ||
      cat.includes('bulan lalu') ||
      ket.includes('pelunasan') ||
      ket.includes('tunggakan') ||
      ket.includes('hutang') ||
      ket.includes('bulan lalu')
    );
  });

  const wargaListTunggakan: WargaTunggakanDetail[] = wargaList.map((warga) => {
    const nominalDefault = warga.nominalDefault || settings.defaultNominal || 1000;
    const recs = recordsByWarga.get(warga.id) || recordsByWarga.get(`no_${warga.nomorRumah}`) || [];

    // All records prior to current month
    const prevRecs = recs.filter((r) => r.tanggal && r.tanggal < `${safeYearMonth}-01`);

    // Calculate month-by-month breakdown for all past months
    const rincianBulanLampau: MonthArrearsBreakdown[] = [];
    let cumulativeTunggakan = 0;
    let cumulativeDeposit = 0;

    sortedPastMonths.forEach((ym) => {
      const [y, m] = ym.split('-').map(Number);
      const days = new Date(y, m, 0).getDate();
      const target = nominalDefault * days;
      
      const monthRecs = prevRecs.filter((r) => r.tanggal && r.tanggal.startsWith(ym));
      const terbayar = monthRecs.reduce((sum, r) => sum + (r.nominal || 0), 0);
      const selisih = terbayar - target;
      const kurang = selisih < 0 ? Math.abs(selisih) : 0;
      const lebih = selisih > 0 ? selisih : 0;
      const isLunas = kurang === 0;

      if (kurang > 0) {
        cumulativeTunggakan += kurang;
      }
      if (lebih > 0) {
        cumulativeDeposit += lebih;
      }

      rincianBulanLampau.push({
        yearMonth: ym,
        year: y,
        month: m,
        monthLabel: `${MONTH_NAMES[m - 1]} ${y}`,
        daysInMonth: days,
        targetNominal: target,
        terbayarNominal: terbayar,
        kurangNominal: kurang,
        lebihNominal: lebih,
        isLunas,
      });
    });

    // Unpaid months summary
    const unpaidMonths = rincianBulanLampau.filter((b) => b.kurangNominal > 0);
    const jumlahBulanTertunggak = unpaidMonths.length;
    const deskripsiBulanTertunggak = unpaidMonths.length > 0
      ? unpaidMonths.map((b) => `${b.monthLabel} (Rp ${b.kurangNominal.toLocaleString('id-ID')})`).join(', ')
      : 'Tidak ada tunggakan';

    // 1 immediate previous month values
    const prevMonthDetail = rincianBulanLampau.find((b) => b.yearMonth === prevYearMonth);
    const targetBulanLalu = prevMonthDetail ? prevMonthDetail.targetNominal : nominalDefault * daysInPrevMonth;
    const terbayarBulanLalu = prevMonthDetail ? prevMonthDetail.terbayarNominal : 0;
    const tunggakanBulanLalu = prevMonthDetail ? prevMonthDetail.kurangNominal : 0;
    const depositBulanLalu = prevMonthDetail ? prevMonthDetail.lebihNominal : 0;

    // Determine baseline historical arrears based on calculation mode
    let totalTunggakanLampauEffective = mode === 'all_history' ? cumulativeTunggakan : tunggakanBulanLalu;
    
    // Check if admin has set a manual override on initial arrears or manual adjustment
    const isManualOverride = typeof warga.saldoTunggakanAwal === 'number' || typeof warga.koreksiPiutang === 'number';
    if (typeof warga.saldoTunggakanAwal === 'number') {
      totalTunggakanLampauEffective = Math.max(0, warga.saldoTunggakanAwal);
    }
    if (typeof warga.koreksiPiutang === 'number') {
      totalTunggakanLampauEffective = Math.max(0, totalTunggakanLampauEffective + warga.koreksiPiutang);
    }

    // Pelunasan in current active month for this warga
    const matchingPelunasanRecords = pelunasanMutationsInActiveMonth.filter((m) => {
      const ket = (m.keterangan || '').toLowerCase();
      const nama = warga.nama.toLowerCase();
      const noRumah = warga.nomorRumah.toLowerCase();
      return (
        ket.includes(nama) ||
        ket.includes(`no. ${noRumah}`) ||
        ket.includes(`rumah ${noRumah}`) ||
        ket.includes(`no ${noRumah}`) ||
        ket.includes(`warga-${warga.id}`)
      );
    });

    const pelunasanBulanIni = matchingPelunasanRecords.reduce((sum, m) => sum + (m.nominal || 0), 0);
    const sisaTunggakanLalu = Math.max(0, totalTunggakanLampauEffective - pelunasanBulanIni);
    const isTunggakanLunas = totalTunggakanLampauEffective > 0 && sisaTunggakanLalu === 0;

    // Current month stats
    const currentMonthRecs = recs.filter((r) => r.tanggal && r.tanggal.startsWith(safeYearMonth));
    const targetBulanIni = nominalDefault * daysInActiveMonth;
    const terbayarBulanIni = currentMonthRecs.reduce((sum, r) => sum + (r.nominal || 0), 0);
    const selisihBulanIni = terbayarBulanIni - targetBulanIni;
    const kurangBayarBulanIni = selisihBulanIni < 0 ? Math.abs(selisihBulanIni) : 0;

    // Total Kewajiban Bersih = Sisa Tunggakan Lampau + Kurang Bayar Bulan Ini
    const totalKewajibanBersih = sisaTunggakanLalu + kurangBayarBulanIni;

    return {
      warga,
      rincianBulanLampau,
      jumlahBulanTertunggak,
      deskripsiBulanTertunggak,
      totalTunggakanKumulatif: cumulativeTunggakan,
      totalDepositKumulatif: cumulativeDeposit,
      isManualOverride,
      saldoTunggakanAwal: warga.saldoTunggakanAwal,
      koreksiPiutang: warga.koreksiPiutang,
      catatanKoreksiPiutang: warga.catatanKoreksiPiutang,
      targetBulanLalu,
      terbayarBulanLalu,
      tunggakanBulanLalu: totalTunggakanLampauEffective,
      depositBulanLalu: mode === 'all_history' ? cumulativeDeposit : depositBulanLalu,
      pelunasanBulanIni,
      pelunasanRecords: matchingPelunasanRecords,
      sisaTunggakanLalu,
      isTunggakanLunas,
      targetBulanIni,
      terbayarBulanIni,
      selisihBulanIni,
      totalKewajibanBersih,
    };
  });

  // KPI calculations
  let totalTunggakanBulanLalu = 0;
  let totalTunggakanKumulatifSemua = 0;
  let totalPelunasanBulanIni = 0;
  let totalSisaTunggakanLalu = 0;
  let totalDepositBulanLalu = 0;
  let totalWargaTertunggakLalu = 0;

  wargaListTunggakan.forEach((item) => {
    totalTunggakanBulanLalu += item.tunggakanBulanLalu;
    totalTunggakanKumulatifSemua += item.totalTunggakanKumulatif;
    totalPelunasanBulanIni += item.pelunasanBulanIni;
    totalSisaTunggakanLalu += item.sisaTunggakanLalu;
    totalDepositBulanLalu += item.depositBulanLalu;
    if (item.tunggakanBulanLalu > 0 || item.totalTunggakanKumulatif > 0) {
      totalWargaTertunggakLalu++;
    }
  });

  const baseTunggakanForPercent = totalTunggakanBulanLalu > 0 ? totalTunggakanBulanLalu : totalTunggakanKumulatifSemua;
  const persenPelunasan = baseTunggakanForPercent > 0 
    ? Math.min(100, Math.round((totalPelunasanBulanIni / baseTunggakanForPercent) * 100)) 
    : 100;

  return {
    wargaListTunggakan,
    summary: {
      totalWarga: wargaList.length,
      totalWargaTertunggakLalu,
      totalTunggakanBulanLalu,
      totalTunggakanKumulatifSemua,
      totalPelunasanBulanIni,
      totalSisaTunggakanLalu,
      totalDepositBulanLalu,
      persenPelunasan,
      totalBulanTeridentifikasi: sortedPastMonths.length,
    },
    prevMonthLabel,
    activeMonthLabel,
    allPastMonthLabels,
  };
};
