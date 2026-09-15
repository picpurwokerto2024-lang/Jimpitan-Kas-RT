import { Warga, JimpitanRecord, KasMutation, AppSettings } from '../types';

export interface WargaTunggakanDetail {
  warga: Warga;
  // Saldo Lampau (Bulan-Bulan Sebelumnya)
  targetBulanLalu: number;
  terbayarBulanLalu: number;
  tunggakanBulanLalu: number; // Kurang bayar dari bulan sebelumnya (>= 0)
  depositBulanLalu: number; // Lebih bayar dari bulan sebelumnya (>= 0)
  
  // Mutasi / Pelunasan di Bulan Berjalan
  pelunasanBulanIni: number; // Nominal yang dibayarkan khusus pelunasan tunggakan di bulan berjalan
  pelunasanRecords: KasMutation[];
  
  // Saldo Akhir Tunggakan Lampau
  sisaTunggakanLalu: number; // tunggakanBulanLalu - pelunasanBulanIni (>= 0)
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
  totalTunggakanBulanLalu: number;
  totalPelunasanBulanIni: number;
  totalSisaTunggakanLalu: number;
  totalDepositBulanLalu: number;
  persenPelunasan: number;
}

/**
 * Calculates historical arrears and current month settlements for all residents
 * @param activeYearMonth e.g. "2026-09"
 */
export const calculateTunggakanRekap = (
  wargaList: Warga[],
  allRecords: JimpitanRecord[],
  kasMutations: KasMutation[],
  activeYearMonth: string,
  settings: AppSettings
): {
  wargaListTunggakan: WargaTunggakanDetail[];
  summary: TunggakanReportSummary;
  prevMonthLabel: string;
  activeMonthLabel: string;
} => {
  const [activeYear, activeMonth] = activeYearMonth.split('-').map(Number);
  
  // Previous month calculation
  let prevYear = activeYear;
  let prevMonth = activeMonth - 1;
  if (prevMonth < 1) {
    prevMonth = 12;
    prevYear -= 1;
  }
  const prevYearMonth = `${prevYear}-${String(prevMonth).padStart(2, '0')}`;

  const monthNames = [
    'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
    'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
  ];
  const activeMonthLabel = `${monthNames[activeMonth - 1]} ${activeYear}`;
  const prevMonthLabel = `${monthNames[prevMonth - 1]} ${prevYear}`;

  const daysInActiveMonth = new Date(activeYear, activeMonth, 0).getDate();
  const daysInPrevMonth = new Date(prevYear, prevMonth, 0).getDate();

  // 1. Group records by resident and by period
  const recordsByWarga = new Map<string, JimpitanRecord[]>();
  allRecords.forEach((r) => {
    if (r.status !== 'sukses') return;
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

  // 2. Group KasMutations for "Pelunasan Tunggakan" in current month
  // A mutation is considered a settlement in current month if:
  // - jenis === 'masuk'
  // - tanggal starts with activeYearMonth
  // - kategori or keterangan includes "pelunasan" or "tunggakan" or "bulan lalu"
  const pelunasanMutationsInActiveMonth = kasMutations.filter((m) => {
    if (m.jenis !== 'masuk') return false;
    if (!m.tanggal || !m.tanggal.startsWith(activeYearMonth)) return false;
    const cat = (m.kategori || '').toLowerCase();
    const ket = (m.keterangan || '').toLowerCase();
    return (
      cat.includes('pelunasan') ||
      cat.includes('tunggakan') ||
      ket.includes('pelunasan') ||
      ket.includes('tunggakan') ||
      ket.includes('bulan lalu')
    );
  });

  const wargaListTunggakan: WargaTunggakanDetail[] = wargaList.map((warga) => {
    const nominalDefault = warga.nominalDefault || settings.defaultNominal || 1000;
    const recs = recordsByWarga.get(warga.id) || recordsByWarga.get(`no_${warga.nomorRumah}`) || [];

    // All records prior to current month
    const prevRecs = recs.filter((r) => r.tanggal && r.tanggal < `${activeYearMonth}-01`);
    
    // We calculate the historical targets and payments up to the previous month:
    // If there are records in the previous month (prevYearMonth), we use prevMonth days;
    // Otherwise calculate based on prevMonth.
    const targetBulanLalu = nominalDefault * daysInPrevMonth;
    
    const terbayarBulanLalu = prevRecs
      .filter((r) => r.tanggal && r.tanggal.startsWith(prevYearMonth))
      .reduce((sum, r) => sum + (r.nominal || 0), 0);

    const selisihBulanLalu = terbayarBulanLalu - targetBulanLalu;
    const tunggakanBulanLalu = selisihBulanLalu < 0 ? Math.abs(selisihBulanLalu) : 0;
    const depositBulanLalu = selisihBulanLalu > 0 ? selisihBulanLalu : 0;

    // Pelunasan in current active month for this warga
    const matchingPelunasanRecords = pelunasanMutationsInActiveMonth.filter((m) => {
      const ket = (m.keterangan || '').toLowerCase();
      return (
        ket.includes(warga.nama.toLowerCase()) ||
        ket.includes(`no. ${warga.nomorRumah.toLowerCase()}`) ||
        ket.includes(`rumah ${warga.nomorRumah.toLowerCase()}`) ||
        ket.includes(`no ${warga.nomorRumah.toLowerCase()}`) ||
        ket.includes(`warga-${warga.id}`)
      );
    });

    const pelunasanBulanIni = matchingPelunasanRecords.reduce((sum, m) => sum + (m.nominal || 0), 0);
    const sisaTunggakanLalu = Math.max(0, tunggakanBulanLalu - pelunasanBulanIni);
    const isTunggakanLunas = tunggakanBulanLalu > 0 && sisaTunggakanLalu === 0;

    // Current month stats
    const currentMonthRecs = recs.filter((r) => r.tanggal && r.tanggal.startsWith(activeYearMonth));
    const targetBulanIni = nominalDefault * daysInActiveMonth;
    const terbayarBulanIni = currentMonthRecs.reduce((sum, r) => sum + (r.nominal || 0), 0);
    const selisihBulanIni = terbayarBulanIni - targetBulanIni;
    const kurangBayarBulanIni = selisihBulanIni < 0 ? Math.abs(selisihBulanIni) : 0;

    // Total Kewajiban Bersih = Sisa Tunggakan Lampau + Kurang Bayar Bulan Ini
    const totalKewajibanBersih = sisaTunggakanLalu + kurangBayarBulanIni;

    return {
      warga,
      targetBulanLalu,
      terbayarBulanLalu,
      tunggakanBulanLalu,
      depositBulanLalu,
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
  let totalPelunasanBulanIni = 0;
  let totalSisaTunggakanLalu = 0;
  let totalDepositBulanLalu = 0;
  let totalWargaTertunggakLalu = 0;

  wargaListTunggakan.forEach((item) => {
    totalTunggakanBulanLalu += item.tunggakanBulanLalu;
    totalPelunasanBulanIni += item.pelunasanBulanIni;
    totalSisaTunggakanLalu += item.sisaTunggakanLalu;
    totalDepositBulanLalu += item.depositBulanLalu;
    if (item.tunggakanBulanLalu > 0) {
      totalWargaTertunggakLalu++;
    }
  });

  const persenPelunasan = totalTunggakanBulanLalu > 0 
    ? Math.min(100, Math.round((totalPelunasanBulanIni / totalTunggakanBulanLalu) * 100)) 
    : 100;

  return {
    wargaListTunggakan,
    summary: {
      totalWarga: wargaList.length,
      totalWargaTertunggakLalu,
      totalTunggakanBulanLalu,
      totalPelunasanBulanIni,
      totalSisaTunggakanLalu,
      totalDepositBulanLalu,
      persenPelunasan,
    },
    prevMonthLabel,
    activeMonthLabel,
  };
};
