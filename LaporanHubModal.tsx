import React, { useState, useMemo } from 'react';
import { 
  FileText, 
  X, 
  Printer, 
  Download, 
  Share2, 
  TrendingUp, 
  TrendingDown, 
  Wallet, 
  Users, 
  Calendar, 
  Search, 
  Filter, 
  CheckCircle, 
  AlertCircle, 
  Clock, 
  ArrowUpRight, 
  ArrowDownRight, 
  Sparkles, 
  Plus,
  RefreshCw,
  Building,
  Check,
  ChevronDown
} from 'lucide-react';
import { Warga, JimpitanRecord, KasMutation, AppSettings, ReguRonda } from '../types';
import { formatRupiah, formatTanggalIndo } from '../utils/formatters';
import { 
  generateKasReportPdf, 
  generateWargaMonthlyReportPdf, 
  generateLaporanTunggakanPdf,
  generateLaporanPemasukanPdf,
  generateLaporanPengeluaranPdf
} from '../utils/pdfReportGenerator';

export type LaporanTabKey = 'kas' | 'tunggakan' | 'pemasukan' | 'pengeluaran' | 'bulanan';

interface LaporanHubModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialTab?: LaporanTabKey;
  allWarga?: Warga[];
  allRecords?: JimpitanRecord[];
  allMutations?: KasMutation[];
  kasMutations?: KasMutation[];
  settings: AppSettings;
  selectedDate?: string;
  activeDate?: string;
  reguList?: ReguRonda[];
  activeReguId?: string;
  saldoKas?: number;
  onOpenQuickExpense?: () => void;
  onOpenShareModal?: () => void;
}

export const LaporanHubModal: React.FC<LaporanHubModalProps> = ({
  isOpen,
  onClose,
  initialTab = 'kas',
  allWarga = [],
  allRecords = [],
  allMutations,
  kasMutations,
  settings,
  selectedDate,
  activeDate = selectedDate || new Date().toISOString().split('T')[0],
  reguList = [],
  activeReguId,
  saldoKas,
  onOpenQuickExpense,
  onOpenShareModal,
}) => {
  const [activeTab, setActiveTab] = useState<LaporanTabKey>(initialTab);

  // Synchronize when initialTab changes on open
  React.useEffect(() => {
    if (isOpen && initialTab) {
      setActiveTab(initialTab);
    }
  }, [isOpen, initialTab]);

  // Safe mutations list
  const safeMutations: KasMutation[] = useMemo(() => {
    if (Array.isArray(allMutations)) return allMutations;
    if (Array.isArray(kasMutations)) return kasMutations;
    return [];
  }, [allMutations, kasMutations]);

  const safeWarga: Warga[] = useMemo(() => Array.isArray(allWarga) ? allWarga : [], [allWarga]);
  const safeRecords: JimpitanRecord[] = useMemo(() => Array.isArray(allRecords) ? allRecords : [], [allRecords]);

  // Selected Month & Year filter
  const today = new Date();
  const defaultYearMonth = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`;
  const [selectedYearMonth, setSelectedYearMonth] = useState<string>(defaultYearMonth);
  const [dateFilterMode, setDateFilterMode] = useState<'month' | 'today' | 'all'>('month');

  // Search filter inside tables
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'underpaid' | 'overpaid' | 'exact'>('all');

  // Signature names for PDF exports
  const [petugasName, setPetugasName] = useState<string>('');
  const [bendaharaName, setBendaharaName] = useState<string>('');
  const [ketuaRtName, setKetuaRtName] = useState<string>(settings?.namaKetuaRt || '');
  const [showSignatureSettings, setShowSignatureSettings] = useState<boolean>(false);

  if (!isOpen) return null;

  // Month label calculation
  const [yearStr, monthStr] = selectedYearMonth.split('-');
  const yearNum = parseInt(yearStr, 10) || today.getFullYear();
  const monthNum = parseInt(monthStr, 10) || (today.getMonth() + 1);
  const daysInMonth = new Date(yearNum, monthNum, 0).getDate();
  const monthName = new Date(yearNum, monthNum - 1, 1).toLocaleDateString('id-ID', { month: 'long' });
  const activeMonthLabel = `${monthName} ${yearNum}`;

  // Previous month calculation
  const prevMonthDate = new Date(yearNum, monthNum - 2, 1);
  const prevYearStr = String(prevMonthDate.getFullYear());
  const prevMonthNumStr = String(prevMonthDate.getMonth() + 1).padStart(2, '0');
  const prevYearMonth = `${prevYearStr}-${prevMonthNumStr}`;
  const prevMonthName = prevMonthDate.toLocaleDateString('id-ID', { month: 'long' });
  const prevMonthLabel = `${prevMonthName} ${prevMonthDate.getFullYear()}`;

  // Filtered records by period
  const filteredRecords = safeRecords.filter((r) => {
    if (dateFilterMode === 'today') return r.tanggal === activeDate;
    if (dateFilterMode === 'month') return r.tanggal && r.tanggal.startsWith(selectedYearMonth);
    return true; // all
  });

  // Filtered mutations by period
  const filteredMutations = safeMutations.filter((m) => {
    if (dateFilterMode === 'today') return m.tanggal === activeDate;
    if (dateFilterMode === 'month') return m.tanggal && m.tanggal.startsWith(selectedYearMonth);
    return true;
  });

  const filteredMutationsMasuk = filteredMutations.filter((m) => m.jenis === 'masuk' || (m as any).tipe === 'masuk');
  const filteredMutationsKeluar = filteredMutations.filter((m) => m.jenis === 'keluar' || (m as any).tipe === 'keluar');

  // Calculations for Jimpitan & Kas
  const totalJimpitanPeriod = filteredRecords.reduce((sum, r) => sum + (r.nominal || 0), 0);
  const totalPemasukanLain = filteredMutationsMasuk.reduce((sum, m) => sum + (m.nominal || 0), 0);
  const totalPemasukanAll = totalJimpitanPeriod + totalPemasukanLain;
  const totalPengeluaranPeriod = filteredMutationsKeluar.reduce((sum, m) => sum + (m.nominal || 0), 0);
  const saldoAwalKas = settings?.saldoAwalKas || 0;

  // Global total calculations (All Time)
  const totalAllJimpitan = safeRecords.reduce((sum, r) => sum + (r.nominal || 0), 0);
  const totalAllMutMasuk = safeMutations.filter(m => m.jenis === 'masuk' || (m as any).tipe === 'masuk').reduce((sum, m) => sum + (m.nominal || 0), 0);
  const totalAllMutKeluar = safeMutations.filter(m => m.jenis === 'keluar' || (m as any).tipe === 'keluar').reduce((sum, m) => sum + (m.nominal || 0), 0);
  const totalKasSaatIni = saldoKas !== undefined ? saldoKas : (saldoAwalKas + totalAllJimpitan + totalAllMutMasuk - totalAllMutKeluar);

  // Expense Category breakdown
  const categoryMap: Record<string, { total: number; count: number }> = {};
  filteredMutationsKeluar.forEach((m) => {
    const cat = m.kategori || 'Lain-lain';
    if (!categoryMap[cat]) categoryMap[cat] = { total: 0, count: 0 };
    categoryMap[cat].total += (m.nominal || 0);
    categoryMap[cat].count += 1;
  });

  const expenseCategories = Object.entries(categoryMap)
    .map(([category, data]) => ({
      category,
      total: data.total,
      count: data.count,
      percentage: totalPengeluaranPeriod > 0 ? Math.round((data.total / totalPengeluaranPeriod) * 100) : 0,
    }))
    .sort((a, b) => b.total - a.total);

  // Warga Monthly Calculations & Status Kurang/Lebih Bayar
  const wargaAnalysisList = safeWarga.map((w) => {
    const wRecords = safeRecords.filter(
      (r) => r.wargaId === w.id && r.tanggal && r.tanggal.startsWith(selectedYearMonth)
    );
    const paidRecords = wRecords.filter((r) => r.status === 'sukses' || r.status === 'titip' || (r.nominal && r.nominal > 0));
    const totalTerbayar = paidRecords.reduce((sum, r) => sum + (r.nominal || 0), 0);
    const countPaidDays = paidRecords.length;

    const tarifHarian = w.nominalDefault || settings?.defaultNominal || 1000;
    const targetBulan = tarifHarian * daysInMonth;

    const nominalKurang = Math.max(0, targetBulan - totalTerbayar);
    const nominalLebih = Math.max(0, totalTerbayar - targetBulan);

    let status: 'underpaid' | 'overpaid' | 'exact' = 'exact';
    if (totalTerbayar < targetBulan) status = 'underpaid';
    else if (totalTerbayar > targetBulan) status = 'overpaid';

    // Daily map for matrix
    const dailyMap: Record<number, { isPaid: boolean; nominal: number; isAdvance: boolean }> = {};
    for (let day = 1; day <= daysInMonth; day++) {
      const dayStr = `${selectedYearMonth}-${String(day).padStart(2, '0')}`;
      const rec = wRecords.find((r) => r.tanggal === dayStr && (r.status === 'sukses' || r.status === 'titip' || (r.nominal && r.nominal > 0)));
      if (rec) {
        dailyMap[day] = { isPaid: true, nominal: rec.nominal, isAdvance: false };
      } else {
        dailyMap[day] = { isPaid: false, nominal: 0, isAdvance: false };
      }
    }

    const hariKurang = Math.max(0, daysInMonth - countPaidDays);
    const selisih = totalTerbayar - targetBulan;

    return {
      warga: w,
      targetBulan,
      totalTerbayar,
      countPaidDays,
      hariKurang,
      selisih,
      nominalKurang,
      nominalLebih,
      status,
      dailyMap,
    };
  });

  const totalTargetSemuaWarga = wargaAnalysisList.reduce((sum, item) => sum + item.targetBulan, 0);
  const totalTerkumpulWarga = wargaAnalysisList.reduce((sum, item) => sum + item.totalTerbayar, 0);
  const totalKurangBayarSemua = wargaAnalysisList.reduce((sum, item) => sum + item.nominalKurang, 0);
  const totalLebihBayarSemua = wargaAnalysisList.reduce((sum, item) => sum + item.nominalLebih, 0);
  const countUnderpaid = wargaAnalysisList.filter((item) => item.status === 'underpaid').length;
  const countOverpaid = wargaAnalysisList.filter((item) => item.status === 'overpaid').length;
  const countExact = wargaAnalysisList.filter((item) => item.status === 'exact').length;

  // Filtered warga list based on search & status filter
  const displayedWargaList = wargaAnalysisList.filter((item) => {
    const matchesSearch = 
      item.warga.nama.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.warga.nomorRumah.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (item.warga.blok && item.warga.blok.toLowerCase().includes(searchQuery.toLowerCase()));

    if (!matchesSearch) return false;
    if (statusFilter === 'underpaid') return item.status === 'underpaid';
    if (statusFilter === 'overpaid') return item.status === 'overpaid';
    if (statusFilter === 'exact') return item.status === 'exact';
    return true;
  });

  // Export PDF Handlers
  const handleExportKasPdf = () => {
    generateKasReportPdf({
      records: filteredRecords,
      mutations: filteredMutations,
      settings,
      periodText: activeMonthLabel,
      totalSaldoKas: totalKasSaatIni,
    });
  };

  const handleExportTunggakanPdf = () => {
    const wargaTunggakanList = wargaAnalysisList.map((item) => ({
      warga: item.warga,
      tunggakanBulanLalu: item.nominalKurang,
      depositBulanLalu: item.nominalLebih,
      pelunasanBulanIni: item.totalTerbayar,
      sisaTunggakanLalu: item.nominalKurang,
      targetBulanIni: item.targetBulan,
      terbayarBulanIni: item.totalTerbayar,
      totalKewajibanBersih: item.nominalKurang > 0 ? item.nominalKurang : 0,
    }));

    generateLaporanTunggakanPdf({
      wargaTunggakanList,
      summary: {
        totalWarga: safeWarga.length,
        totalWargaTertunggakLalu: countUnderpaid,
        totalTunggakanBulanLalu: totalKurangBayarSemua,
        totalPelunasanBulanIni: totalTerkumpulWarga,
        totalSisaTunggakanLalu: totalKurangBayarSemua,
        totalDepositBulanLalu: totalLebihBayarSemua,
        persenPelunasan: totalTargetSemuaWarga > 0 ? Math.round((totalTerkumpulWarga / totalTargetSemuaWarga) * 100) : 0,
      },
      settings,
      activeMonthLabel,
      prevMonthLabel,
      petugasName,
      bendaharaName,
      ketuaRtName,
    });
  };

  const handleExportPemasukanPdf = () => {
    generateLaporanPemasukanPdf({
      records: filteredRecords,
      mutationsMasuk: filteredMutationsMasuk,
      settings,
      periodText: activeMonthLabel,
      totalJimpitan: totalJimpitanPeriod,
      totalPemasukanLain,
      totalPemasukanAll,
      petugasName,
      bendaharaName,
      ketuaRtName,
    });
  };

  const handleExportPengeluaranPdf = () => {
    generateLaporanPengeluaranPdf({
      mutationsKeluar: filteredMutationsKeluar,
      settings,
      periodText: activeMonthLabel,
      totalPengeluaran: totalPengeluaranPeriod,
      categoryBreakdown: expenseCategories,
      petugasName,
      bendaharaName,
      ketuaRtName,
    });
  };

  const handleExportBulananMatriksPdf = () => {
    generateWargaMonthlyReportPdf({
      wargaData: wargaAnalysisList,
      activeYearMonth: selectedYearMonth,
      activeMonthLabel,
      settings,
      daysInMonth,
      summaryKpis: {
        totalTarget: totalTargetSemuaWarga,
        totalTerkumpul: totalTerkumpulWarga,
        percentTerkumpul: totalTargetSemuaWarga > 0 ? Math.round((totalTerkumpulWarga / totalTargetSemuaWarga) * 100) : 0,
        totalKurangBayar: totalKurangBayarSemua,
        totalLebihBayar: totalLebihBayarSemua,
        totalWarga: safeWarga.length,
        countLunasAtauLebih: countExact + countOverpaid,
        countExact,
        countUnderpaid,
        countOverpaid,
      },
      matrixCellDisplay: 'nominal_k',
      includeMatrixTable: true,
      petugasName,
      bendaharaName,
      ketuaRtName,
    });
  };

  // WhatsApp broadcast template generator
  const handleShareWaSummary = () => {
    let text = `*📊 LAPORAN RESMI KAS & JIMPITAN ${settings.namaRt} / ${settings.namaRw}*\n`;
    text += `*Periode:* ${activeMonthLabel}\n`;
    text += `*Desa Pliken, Kec. Kembaran*\n\n`;

    if (activeTab === 'kas') {
      text += `*RINGKASAN KAS RT:*\n`;
      text += `• Saldo Kas Total: *${formatRupiah(totalKasSaatIni)}*\n`;
      text += `• Penerimaan Jimpitan: ${formatRupiah(totalJimpitanPeriod)}\n`;
      text += `• Pemasukan Lain/Donasi: ${formatRupiah(totalPemasukanLain)}\n`;
      text += `• Pengeluaran Kas: ${formatRupiah(totalPengeluaranPeriod)}\n`;
    } else if (activeTab === 'tunggakan') {
      text += `*STATUS REKAPITULASI WARGA:*\n`;
      text += `• Total Target Kas Warga: ${formatRupiah(totalTargetSemuaWarga)}\n`;
      text += `• Terkumpul (Realisasi): *${formatRupiah(totalTerkumpulWarga)}*\n`;
      text += `• Total Kurang Bayar: ${formatRupiah(totalKurangBayarSemua)} (${countUnderpaid} Rumah)\n`;
      text += `• Total Lebih Bayar/Deposit: ${formatRupiah(totalLebihBayarSemua)} (${countOverpaid} Rumah)\n`;
      text += `• Warga Lunas: ${countExact + countOverpaid} dari ${safeWarga.length} Rumah\n`;
    } else if (activeTab === 'pemasukan') {
      text += `*RINCIAN PEMASUKAN BULAN INI:*\n`;
      text += `• Setoran Jimpitan: ${formatRupiah(totalJimpitanPeriod)} (${filteredRecords.length} kali)\n`;
      text += `• Sumbangan / Donasi: ${formatRupiah(totalPemasukanLain)}\n`;
      text += `• Total Pemasukan: *${formatRupiah(totalPemasukanAll)}*\n`;
    } else if (activeTab === 'pengeluaran') {
      text += `*RINCIAN PENGELUARAN KAS RT:*\n`;
      text += `• Total Pengeluaran: *${formatRupiah(totalPengeluaranPeriod)}*\n`;
      text += `• Alokasi Terbanyak:\n`;
      expenseCategories.slice(0, 3).forEach((cat) => {
        text += `  - ${cat.category}: ${formatRupiah(cat.total)} (${cat.percentage}%)\n`;
      });
    }

    text += `\n_Laporan transparan dikelola melalui Sistem Jimpitan Digital RT._`;
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/60 backdrop-blur-xs overflow-y-auto animate-in fade-in duration-200">
      <div className="relative w-full max-w-5xl bg-white rounded-3xl shadow-2xl border border-stone-200 overflow-hidden flex flex-col max-h-[92vh] my-auto">
        
        {/* HEADER */}
        <div className="px-5 py-4 bg-gradient-to-r from-slate-900 via-sky-950 to-slate-900 text-white flex items-center justify-between border-b border-sky-800/40">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 rounded-2xl bg-sky-500/20 text-sky-300 border border-sky-400/30">
              <FileText className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h2 className="text-base sm:text-lg font-black tracking-tight">
                  Pusat Laporan & Rekapitulasi RT
                </h2>
                <span className="px-2 py-0.5 rounded-full bg-sky-500/30 text-sky-200 text-[10px] font-extrabold uppercase tracking-wider border border-sky-400/20">
                  Mode Pengurus
                </span>
              </div>
              <p className="text-xs text-sky-200/80 font-medium">
                {settings.namaRt} / {settings.namaRw} Desa Pliken, Kembaran
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={() => setShowSignatureSettings(!showSignatureSettings)}
              className="hidden sm:flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-bold transition-all cursor-pointer"
              title="Atur Nama Penandatangan Laporan"
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-300" />
              <span>Tanda Tangan</span>
            </button>

            <button
              onClick={onClose}
              className="p-2 rounded-2xl bg-white/10 hover:bg-white/20 text-white transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* SIGNATURE DRAWER (OPTIONAL ACCORDION) */}
        {showSignatureSettings && (
          <div className="px-5 py-3 bg-stone-100 border-b border-stone-200 animate-in slide-in-from-top-2">
            <div className="text-xs font-bold text-stone-700 mb-2 flex items-center justify-between">
              <span>Pengaturan Pejabat Penandatangan Dokumen PDF Resmi:</span>
              <span className="text-[11px] text-stone-500 font-normal">Otomatis dicetak di bagian bawah PDF</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
              <div>
                <label className="block text-[10px] font-bold text-stone-600 mb-0.5">Petugas / Penarik Jimpitan</label>
                <input
                  type="text"
                  placeholder="Nama Petugas Lapangan"
                  value={petugasName}
                  onChange={(e) => setPetugasName(e.target.value)}
                  className="w-full px-2.5 py-1.5 rounded-lg bg-white border border-stone-300 text-xs text-stone-800 outline-none focus:ring-1 focus:ring-sky-500"
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-stone-600 mb-0.5">Bendahara RT</label>
                <input
                  type="text"
                  placeholder="Nama Bendahara Kas"
                  value={bendaharaName}
                  onChange={(e) => setBendaharaName(e.target.value)}
                  className="w-full px-2.5 py-1.5 rounded-lg bg-white border border-stone-300 text-xs text-stone-800 outline-none focus:ring-1 focus:ring-sky-500"
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-stone-600 mb-0.5">Ketua RT</label>
                <input
                  type="text"
                  placeholder="Nama Ketua RT"
                  value={ketuaRtName}
                  onChange={(e) => setKetuaRtName(e.target.value)}
                  className="w-full px-2.5 py-1.5 rounded-lg bg-white border border-stone-300 text-xs text-stone-800 outline-none focus:ring-1 focus:ring-sky-500"
                />
              </div>
            </div>
          </div>
        )}

        {/* 5 REPORT TABS BAR */}
        <div className="px-3 sm:px-5 py-2.5 bg-stone-50 border-b border-stone-200 flex items-center justify-between overflow-x-auto no-scrollbar gap-1.5">
          <div className="flex items-center space-x-1.5 min-w-max">
            <button
              onClick={() => setActiveTab('kas')}
              className={`px-3.5 py-2 rounded-xl text-xs font-black flex items-center space-x-2 transition-all cursor-pointer ${
                activeTab === 'kas'
                  ? 'bg-sky-600 text-white shadow-sm'
                  : 'bg-white hover:bg-stone-200 text-stone-700 border border-stone-200'
              }`}
            >
              <Wallet className="w-3.5 h-3.5" />
              <span>1. Laporan Kas</span>
            </button>

            <button
              onClick={() => setActiveTab('tunggakan')}
              className={`px-3.5 py-2 rounded-xl text-xs font-black flex items-center space-x-2 transition-all cursor-pointer ${
                activeTab === 'tunggakan'
                  ? 'bg-amber-600 text-white shadow-sm'
                  : 'bg-white hover:bg-stone-200 text-stone-700 border border-stone-200'
              }`}
            >
              <Users className="w-3.5 h-3.5" />
              <span>2. Kurang / Lebih Bayar</span>
            </button>

            <button
              onClick={() => setActiveTab('pemasukan')}
              className={`px-3.5 py-2 rounded-xl text-xs font-black flex items-center space-x-2 transition-all cursor-pointer ${
                activeTab === 'pemasukan'
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'bg-white hover:bg-stone-200 text-stone-700 border border-stone-200'
              }`}
            >
              <TrendingUp className="w-3.5 h-3.5" />
              <span>3. Laporan Pemasukan</span>
            </button>

            <button
              onClick={() => setActiveTab('pengeluaran')}
              className={`px-3.5 py-2 rounded-xl text-xs font-black flex items-center space-x-2 transition-all cursor-pointer ${
                activeTab === 'pengeluaran'
                  ? 'bg-rose-600 text-white shadow-sm'
                  : 'bg-white hover:bg-stone-200 text-stone-700 border border-stone-200'
              }`}
            >
              <TrendingDown className="w-3.5 h-3.5" />
              <span>4. Laporan Pengeluaran</span>
            </button>

            <button
              onClick={() => setActiveTab('bulanan')}
              className={`px-3.5 py-2 rounded-xl text-xs font-black flex items-center space-x-2 transition-all cursor-pointer ${
                activeTab === 'bulanan'
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'bg-white hover:bg-stone-200 text-stone-700 border border-stone-200'
              }`}
            >
              <Calendar className="w-3.5 h-3.5" />
              <span>5. Rekap Bulanan (1-31)</span>
            </button>
          </div>
        </div>

        {/* PERIOD FILTER & ACTION BAR */}
        <div className="px-5 py-3 bg-white border-b border-stone-200 flex flex-wrap items-center justify-between gap-3">
          {/* Period selector */}
          <div className="flex items-center space-x-2">
            <div className="flex items-center space-x-1.5 bg-stone-100 px-3 py-1.5 rounded-xl border border-stone-300">
              <Calendar className="w-4 h-4 text-sky-600" />
              <input
                type="month"
                value={selectedYearMonth}
                onChange={(e) => {
                  setSelectedYearMonth(e.target.value);
                  setDateFilterMode('month');
                }}
                className="bg-transparent text-xs font-extrabold text-stone-800 outline-none cursor-pointer"
              />
            </div>

            <button
              onClick={() => {
                setSelectedYearMonth(defaultYearMonth);
                setDateFilterMode('month');
              }}
              className={`px-2.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                selectedYearMonth === defaultYearMonth && dateFilterMode === 'month'
                  ? 'bg-sky-100 text-sky-800 border border-sky-300'
                  : 'bg-stone-100 hover:bg-stone-200 text-stone-600'
              }`}
            >
              Bulan Ini
            </button>

            <button
              onClick={() => {
                setSelectedYearMonth(prevYearMonth);
                setDateFilterMode('month');
              }}
              className={`px-2.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                selectedYearMonth === prevYearMonth && dateFilterMode === 'month'
                  ? 'bg-sky-100 text-sky-800 border border-sky-300'
                  : 'bg-stone-100 hover:bg-stone-200 text-stone-600'
              }`}
            >
              Bulan Lalu
            </button>
          </div>

          {/* Action Buttons: PDF Export & WhatsApp */}
          <div className="flex items-center space-x-2">
            <button
              onClick={handleShareWaSummary}
              className="px-3 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs flex items-center space-x-1.5 shadow-xs transition-all cursor-pointer"
              title="Kirim Ringkasan Laporan ke WhatsApp"
            >
              <Share2 className="w-3.5 h-3.5" />
              <span>Bagikan WA</span>
            </button>

            {activeTab === 'kas' && (
              <button
                onClick={handleExportKasPdf}
                className="px-3.5 py-2 rounded-xl bg-sky-600 hover:bg-sky-700 text-white font-extrabold text-xs flex items-center space-x-1.5 shadow-sm transition-all cursor-pointer"
              >
                <Printer className="w-4 h-4" />
                <span>Cetak PDF Kas</span>
              </button>
            )}

            {activeTab === 'tunggakan' && (
              <button
                onClick={handleExportTunggakanPdf}
                className="px-3.5 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-extrabold text-xs flex items-center space-x-1.5 shadow-sm transition-all cursor-pointer"
              >
                <Printer className="w-4 h-4" />
                <span>Cetak PDF Tunggakan</span>
              </button>
            )}

            {activeTab === 'pemasukan' && (
              <button
                onClick={handleExportPemasukanPdf}
                className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs flex items-center space-x-1.5 shadow-sm transition-all cursor-pointer"
              >
                <Printer className="w-4 h-4" />
                <span>Cetak PDF Pemasukan</span>
              </button>
            )}

            {activeTab === 'pengeluaran' && (
              <button
                onClick={handleExportPengeluaranPdf}
                className="px-3.5 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-extrabold text-xs flex items-center space-x-1.5 shadow-sm transition-all cursor-pointer"
              >
                <Printer className="w-4 h-4" />
                <span>Cetak PDF Pengeluaran</span>
              </button>
            )}

            {activeTab === 'bulanan' && (
              <button
                onClick={handleExportBulananMatriksPdf}
                className="px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-xs flex items-center space-x-1.5 shadow-sm transition-all cursor-pointer"
              >
                <Printer className="w-4 h-4" />
                <span>Cetak PDF Matriks (1-31)</span>
              </button>
            )}
          </div>
        </div>

        {/* MAIN REPORT BODY */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6 bg-stone-100/50">

          {/* ========================================================= */}
          {/* TAB 1: LAPORAN KAS LENGKAP                                 */}
          {/* ========================================================= */}
          {activeTab === 'kas' && (
            <div className="space-y-6 animate-in fade-in">
              {/* Executive Summary Cards */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
                <div className="p-4 rounded-2xl bg-white border border-stone-200 shadow-xs">
                  <div className="flex items-center justify-between text-stone-500 mb-1">
                    <span className="text-[11px] font-bold uppercase tracking-wider">Saldo Kas Bersih</span>
                    <Wallet className="w-4 h-4 text-sky-600" />
                  </div>
                  <div className="text-lg sm:text-xl font-black text-stone-900">
                    {formatRupiah(totalKasSaatIni)}
                  </div>
                  <div className="text-[10px] text-stone-500 mt-1">
                    Saldo Awal: {formatRupiah(saldoAwalKas)}
                  </div>
                </div>

                <div className="p-4 rounded-2xl bg-white border border-stone-200 shadow-xs">
                  <div className="flex items-center justify-between text-stone-500 mb-1">
                    <span className="text-[11px] font-bold uppercase tracking-wider">Jimpitan Terkumpul</span>
                    <ArrowUpRight className="w-4 h-4 text-emerald-600" />
                  </div>
                  <div className="text-lg sm:text-xl font-black text-emerald-600">
                    +{formatRupiah(totalJimpitanPeriod)}
                  </div>
                  <div className="text-[10px] text-emerald-700 mt-1">
                    {filteredRecords.length} setoran bulan ini
                  </div>
                </div>

                <div className="p-4 rounded-2xl bg-white border border-stone-200 shadow-xs">
                  <div className="flex items-center justify-between text-stone-500 mb-1">
                    <span className="text-[11px] font-bold uppercase tracking-wider">Pemasukan Non-Jimpitan</span>
                    <TrendingUp className="w-4 h-4 text-teal-600" />
                  </div>
                  <div className="text-lg sm:text-xl font-black text-teal-600">
                    +{formatRupiah(totalPemasukanLain)}
                  </div>
                  <div className="text-[10px] text-teal-700 mt-1">
                    Donasi, sumbangan & iuran
                  </div>
                </div>

                <div className="p-4 rounded-2xl bg-white border border-stone-200 shadow-xs">
                  <div className="flex items-center justify-between text-stone-500 mb-1">
                    <span className="text-[11px] font-bold uppercase tracking-wider">Pengeluaran Kas</span>
                    <ArrowDownRight className="w-4 h-4 text-rose-600" />
                  </div>
                  <div className="text-lg sm:text-xl font-black text-rose-600">
                    -{formatRupiah(totalPengeluaranPeriod)}
                  </div>
                  <div className="text-[10px] text-rose-700 mt-1">
                    {filteredMutationsKeluar.length} nota belanja kas
                  </div>
                </div>
              </div>

              {/* Mutasi & Rekapitulasi Kas Table */}
              <div className="bg-white rounded-2xl border border-stone-200 shadow-xs overflow-hidden">
                <div className="px-4 py-3 bg-stone-50 border-b border-stone-200 flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <FileText className="w-4 h-4 text-sky-600" />
                    <h3 className="text-xs sm:text-sm font-extrabold text-stone-800">
                      Rincian Mutasi Arus Kas ({activeMonthLabel})
                    </h3>
                  </div>
                  <span className="text-[11px] font-bold text-stone-500">
                    {filteredMutations.length} Transaksi Khusus
                  </span>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="bg-stone-100 text-stone-600 text-[11px] font-bold uppercase tracking-wider border-b border-stone-200">
                        <th className="py-2.5 px-3">Tanggal</th>
                        <th className="py-2.5 px-3">Tipe</th>
                        <th className="py-2.5 px-3">Kategori</th>
                        <th className="py-2.5 px-3">Keterangan</th>
                        <th className="py-2.5 px-3">Petugas / PJ</th>
                        <th className="py-2.5 px-3 text-right">Nominal</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-stone-100 font-medium">
                      {filteredMutations.length === 0 ? (
                        <tr>
                          <td colSpan={6} className="py-8 text-center text-stone-400">
                            Belum ada mutasi kas khusus di periode {activeMonthLabel}.
                          </td>
                        </tr>
                      ) : (
                        filteredMutations.map((m) => {
                          const isMasuk = m.jenis === 'masuk' || (m as any).tipe === 'masuk';
                          return (
                            <tr key={m.id} className="hover:bg-stone-50">
                              <td className="py-2.5 px-3 text-stone-600 whitespace-nowrap">{m.tanggal}</td>
                              <td className="py-2.5 px-3 whitespace-nowrap">
                                <span
                                  className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                    isMasuk
                                      ? 'bg-emerald-100 text-emerald-800'
                                      : 'bg-rose-100 text-rose-800'
                                  }`}
                                >
                                  {isMasuk ? 'Kas Masuk' : 'Pengeluaran'}
                                </span>
                              </td>
                              <td className="py-2.5 px-3 text-stone-800 font-bold">{m.kategori}</td>
                              <td className="py-2.5 px-3 text-stone-600 max-w-xs truncate">{m.keterangan}</td>
                              <td className="py-2.5 px-3 text-stone-500">{m.petugas || '-'}</td>
                              <td
                                className={`py-2.5 px-3 text-right font-extrabold ${
                                  isMasuk ? 'text-emerald-600' : 'text-rose-600'
                                }`}
                              >
                                {isMasuk ? '+' : '-'} {formatRupiah(m.nominal)}
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* ========================================================= */}
          {/* TAB 2: LAPORAN KURANG / LEBIH BAYAR WARGA                  */}
          {/* ========================================================= */}
          {activeTab === 'tunggakan' && (
            <div className="space-y-6 animate-in fade-in">
              {/* Summary KPIs for Tunggakan / Lebih Bayar */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
                <div className="p-4 rounded-2xl bg-white border border-stone-200 shadow-xs">
                  <div className="text-[11px] font-bold uppercase tracking-wider text-stone-500 mb-1">
                    Target Kas Warga
                  </div>
                  <div className="text-lg sm:text-xl font-black text-stone-900">
                    {formatRupiah(totalTargetSemuaWarga)}
                  </div>
                  <div className="text-[10px] text-stone-500 mt-1">
                    {safeWarga.length} Rumah × {daysInMonth} Hari
                  </div>
                </div>

                <div className="p-4 rounded-2xl bg-white border border-rose-200 bg-rose-50/40 shadow-xs">
                  <div className="text-[11px] font-bold uppercase tracking-wider text-rose-700 mb-1">
                    Total Kurang Bayar (Sisa)
                  </div>
                  <div className="text-lg sm:text-xl font-black text-rose-600">
                    -{formatRupiah(totalKurangBayarSemua)}
                  </div>
                  <div className="text-[10px] text-rose-600 font-bold mt-1">
                    {countUnderpaid} dari {safeWarga.length} Rumah Tertunggak
                  </div>
                </div>

                <div className="p-4 rounded-2xl bg-white border border-amber-200 bg-amber-50/40 shadow-xs">
                  <div className="text-[11px] font-bold uppercase tracking-wider text-amber-700 mb-1">
                    Total Lebih Bayar (Deposit)
                  </div>
                  <div className="text-lg sm:text-xl font-black text-amber-600">
                    +{formatRupiah(totalLebihBayarSemua)}
                  </div>
                  <div className="text-[10px] text-amber-600 font-bold mt-1">
                    {countOverpaid} Rumah Bayar di Muka
                  </div>
                </div>

                <div className="p-4 rounded-2xl bg-white border border-emerald-200 bg-emerald-50/40 shadow-xs">
                  <div className="text-[11px] font-bold uppercase tracking-wider text-emerald-700 mb-1">
                    Realisasi Lunas / Selesai
                  </div>
                  <div className="text-lg sm:text-xl font-black text-emerald-600">
                    {countExact + countOverpaid} / {safeWarga.length} Rumah
                  </div>
                  <div className="text-[10px] text-emerald-600 font-bold mt-1">
                    {totalTargetSemuaWarga > 0 ? Math.round((totalTerkumpulWarga / totalTargetSemuaWarga) * 100) : 0}% Target Tercapai
                  </div>
                </div>
              </div>

              {/* Filter Controls & Search */}
              <div className="bg-white p-3 rounded-2xl border border-stone-200 flex flex-wrap items-center justify-between gap-2.5">
                <div className="flex items-center space-x-2 flex-1 min-w-[200px]">
                  <div className="relative w-full">
                    <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" />
                    <input
                      type="text"
                      placeholder="Cari nama warga / no rumah / blok..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full pl-8 pr-3 py-1.5 rounded-xl bg-stone-50 border border-stone-200 text-xs text-stone-800 outline-none focus:ring-1 focus:ring-sky-400 font-medium"
                    />
                  </div>
                </div>

                <div className="flex items-center space-x-1.5">
                  <button
                    onClick={() => setStatusFilter('all')}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-colors cursor-pointer ${
                      statusFilter === 'all'
                        ? 'bg-slate-900 text-white'
                        : 'bg-stone-100 hover:bg-stone-200 text-stone-700'
                    }`}
                  >
                    Semua ({safeWarga.length})
                  </button>
                  <button
                    onClick={() => setStatusFilter('underpaid')}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-colors cursor-pointer ${
                      statusFilter === 'underpaid'
                        ? 'bg-rose-600 text-white'
                        : 'bg-rose-50 hover:bg-rose-100 text-rose-700'
                    }`}
                  >
                    Kurang Bayar ({countUnderpaid})
                  </button>
                  <button
                    onClick={() => setStatusFilter('overpaid')}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-colors cursor-pointer ${
                      statusFilter === 'overpaid'
                        ? 'bg-amber-600 text-white'
                        : 'bg-amber-50 hover:bg-amber-100 text-amber-700'
                    }`}
                  >
                    Lebih Bayar ({countOverpaid})
                  </button>
                  <button
                    onClick={() => setStatusFilter('exact')}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-colors cursor-pointer ${
                      statusFilter === 'exact'
                        ? 'bg-emerald-600 text-white'
                        : 'bg-emerald-50 hover:bg-emerald-100 text-emerald-700'
                    }`}
                  >
                    Lunas Pas ({countExact})
                  </button>
                </div>
              </div>

              {/* Status List Table */}
              <div className="bg-white rounded-2xl border border-stone-200 shadow-xs overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="bg-stone-100 text-stone-600 text-[11px] font-bold uppercase tracking-wider border-b border-stone-200">
                        <th className="py-2.5 px-3 text-center">No</th>
                        <th className="py-2.5 px-3">Rumah & Blok</th>
                        <th className="py-2.5 px-3">Nama Warga</th>
                        <th className="py-2.5 px-3 text-center">Kehadiran</th>
                        <th className="py-2.5 px-3 text-right">Target Bulan</th>
                        <th className="py-2.5 px-3 text-right">Terkumpul</th>
                        <th className="py-2.5 px-3 text-center">Status</th>
                        <th className="py-2.5 px-3 text-right">Kurang (Sisa)</th>
                        <th className="py-2.5 px-3 text-right">Lebih (Deposit)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-stone-100 font-medium">
                      {displayedWargaList.length === 0 ? (
                        <tr>
                          <td colSpan={9} className="py-8 text-center text-stone-400">
                            Tidak ada data warga yang sesuai dengan filter yang dipilih.
                          </td>
                        </tr>
                      ) : (
                        displayedWargaList.map((item, idx) => (
                          <tr key={item.warga.id} className="hover:bg-stone-50">
                            <td className="py-2.5 px-3 text-center text-stone-400">{idx + 1}</td>
                            <td className="py-2.5 px-3 font-bold text-stone-900 whitespace-nowrap">
                              No. {item.warga.nomorRumah} {item.warga.blok ? `(${item.warga.blok})` : ''}
                            </td>
                            <td className="py-2.5 px-3 text-stone-800 font-bold">{item.warga.nama}</td>
                            <td className="py-2.5 px-3 text-center text-stone-600">
                              <span className="px-2 py-0.5 rounded-full bg-stone-100 text-stone-700 font-bold text-[10px]">
                                {item.countPaidDays} / {daysInMonth} hr
                              </span>
                            </td>
                            <td className="py-2.5 px-3 text-right text-stone-600">{formatRupiah(item.targetBulan)}</td>
                            <td className="py-2.5 px-3 text-right font-extrabold text-stone-900">
                              {formatRupiah(item.totalTerbayar)}
                            </td>
                            <td className="py-2.5 px-3 text-center">
                              {item.status === 'underpaid' && (
                                <span className="px-2 py-0.5 rounded-full bg-rose-100 text-rose-800 font-bold text-[10px]">
                                  Kurang Bayar
                                </span>
                              )}
                              {item.status === 'overpaid' && (
                                <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 font-bold text-[10px]">
                                  Lebih Bayar
                                </span>
                              )}
                              {item.status === 'exact' && (
                                <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-bold text-[10px]">
                                  Lunas Tepat
                                </span>
                              )}
                            </td>
                            <td className="py-2.5 px-3 text-right font-extrabold text-rose-600">
                              {item.nominalKurang > 0 ? `-${formatRupiah(item.nominalKurang)}` : '-'}
                            </td>
                            <td className="py-2.5 px-3 text-right font-extrabold text-amber-600">
                              {item.nominalLebih > 0 ? `+${formatRupiah(item.nominalLebih)}` : '-'}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* ========================================================= */}
          {/* TAB 3: LAPORAN PEMASUKAN                                   */}
          {/* ========================================================= */}
          {activeTab === 'pemasukan' && (
            <div className="space-y-6 animate-in fade-in">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
                <div className="p-4 rounded-2xl bg-white border border-stone-200 shadow-xs">
                  <div className="text-[11px] font-bold uppercase tracking-wider text-stone-500 mb-1">
                    Jimpitan Warga Masuk
                  </div>
                  <div className="text-xl font-black text-sky-600">
                    +{formatRupiah(totalJimpitanPeriod)}
                  </div>
                  <div className="text-[10px] text-stone-500 mt-1">
                    {filteredRecords.length} transaksi pembayaran
                  </div>
                </div>

                <div className="p-4 rounded-2xl bg-white border border-stone-200 shadow-xs">
                  <div className="text-[11px] font-bold uppercase tracking-wider text-stone-500 mb-1">
                    Donasi, Infaq & Sumbangan
                  </div>
                  <div className="text-xl font-black text-emerald-600">
                    +{formatRupiah(totalPemasukanLain)}
                  </div>
                  <div className="text-[10px] text-stone-500 mt-1">
                    {filteredMutationsMasuk.length} donasi non-jimpitan
                  </div>
                </div>

                <div className="p-4 rounded-2xl bg-gradient-to-br from-emerald-600 to-teal-700 text-white shadow-sm">
                  <div className="text-[11px] font-bold uppercase tracking-wider text-emerald-100 mb-1">
                    Total Pemasukan Kas
                  </div>
                  <div className="text-xl font-black">
                    +{formatRupiah(totalPemasukanAll)}
                  </div>
                  <div className="text-[10px] text-emerald-200 mt-1">
                    Periode {activeMonthLabel}
                  </div>
                </div>
              </div>

              {/* Rincian Donasi & Pemasukan Lain */}
              <div className="bg-white rounded-2xl border border-stone-200 shadow-xs overflow-hidden">
                <div className="px-4 py-3 bg-stone-50 border-b border-stone-200 flex items-center justify-between">
                  <h3 className="text-xs sm:text-sm font-extrabold text-stone-800">
                    I. Rincian Donasi / Sumbangan / Iuran Kas Masuk
                  </h3>
                  <span className="text-[11px] font-bold text-emerald-600">
                    {filteredMutationsMasuk.length} Catatan
                  </span>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="bg-stone-100 text-stone-600 text-[11px] font-bold uppercase border-b border-stone-200">
                        <th className="py-2.5 px-3">Tanggal</th>
                        <th className="py-2.5 px-3">Kategori</th>
                        <th className="py-2.5 px-3">Keterangan Sumber Dana</th>
                        <th className="py-2.5 px-3">Petugas Penerima</th>
                        <th className="py-2.5 px-3 text-right">Nominal</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-stone-100">
                      {filteredMutationsMasuk.length === 0 ? (
                        <tr>
                          <td colSpan={5} className="py-6 text-center text-stone-400">
                            Belum ada donasi atau kas masuk khusus di periode ini.
                          </td>
                        </tr>
                      ) : (
                        filteredMutationsMasuk.map((m) => (
                          <tr key={m.id} className="hover:bg-stone-50">
                            <td className="py-2.5 px-3 text-stone-600">{m.tanggal}</td>
                            <td className="py-2.5 px-3 font-bold text-stone-800">{m.kategori}</td>
                            <td className="py-2.5 px-3 text-stone-600">{m.keterangan}</td>
                            <td className="py-2.5 px-3 text-stone-500">{m.petugas || '-'}</td>
                            <td className="py-2.5 px-3 text-right font-extrabold text-emerald-600">
                              +{formatRupiah(m.nominal)}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* 50 Riwayat Setoran Jimpitan Terakhir */}
              <div className="bg-white rounded-2xl border border-stone-200 shadow-xs overflow-hidden">
                <div className="px-4 py-3 bg-stone-50 border-b border-stone-200 flex items-center justify-between">
                  <h3 className="text-xs sm:text-sm font-extrabold text-stone-800">
                    II. Rincian Penerimaan Jimpitan Warga ({filteredRecords.length} Setoran)
                  </h3>
                </div>

                <div className="overflow-x-auto max-h-80 overflow-y-auto">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead className="sticky top-0 bg-stone-100 z-10">
                      <tr className="text-stone-600 text-[11px] font-bold uppercase border-b border-stone-200">
                        <th className="py-2 px-3">Waktu</th>
                        <th className="py-2 px-3">No. Rumah</th>
                        <th className="py-2 px-3">Nama Warga</th>
                        <th className="py-2 px-3">Metode</th>
                        <th className="py-2 px-3">Petugas</th>
                        <th className="py-2 px-3 text-right">Nominal</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-stone-100">
                      {filteredRecords.length === 0 ? (
                        <tr>
                          <td colSpan={6} className="py-6 text-center text-stone-400">
                            Tidak ada data jimpitan masuk pada periode ini.
                          </td>
                        </tr>
                      ) : (
                        filteredRecords.slice(0, 100).map((r) => (
                          <tr key={r.id} className="hover:bg-stone-50">
                            <td className="py-2 px-3 text-stone-500">{r.tanggal} {r.waktu || ''}</td>
                            <td className="py-2 px-3 font-bold text-stone-900">No. {r.nomorRumah}</td>
                            <td className="py-2 px-3 text-stone-800">{r.namaWarga}</td>
                            <td className="py-2 px-3">
                              <span className="px-1.5 py-0.5 rounded-md bg-stone-100 text-stone-600 text-[10px] font-bold uppercase">
                                {r.status}
                              </span>
                            </td>
                            <td className="py-2 px-3 text-stone-500">{r.petugas || r.reguNama || '-'}</td>
                            <td className="py-2 px-3 text-right font-bold text-stone-900">
                              {formatRupiah(r.nominal)}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* ========================================================= */}
          {/* TAB 4: LAPORAN PENGELUARAN                                 */}
          {/* ========================================================= */}
          {activeTab === 'pengeluaran' && (
            <div className="space-y-6 animate-in fade-in">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
                <div className="p-4 rounded-2xl bg-white border border-rose-200 bg-rose-50/30 shadow-xs">
                  <div className="text-[11px] font-bold uppercase tracking-wider text-rose-700 mb-1">
                    Total Pengeluaran Kas RT
                  </div>
                  <div className="text-xl font-black text-rose-600">
                    -{formatRupiah(totalPengeluaranPeriod)}
                  </div>
                  <div className="text-[10px] text-rose-600 mt-1">
                    {filteredMutationsKeluar.length} transaksi belanja
                  </div>
                </div>

                <div className="p-4 rounded-2xl bg-white border border-stone-200 shadow-xs">
                  <div className="text-[11px] font-bold uppercase tracking-wider text-stone-500 mb-1">
                    Alokasi Belanja Terbesar
                  </div>
                  <div className="text-xl font-black text-amber-600 truncate">
                    {expenseCategories[0]?.category || '-'}
                  </div>
                  <div className="text-[10px] text-amber-700 mt-1">
                    {expenseCategories[0] ? `${formatRupiah(expenseCategories[0].total)} (${expenseCategories[0].percentage}%)` : 'Belum ada pengeluaran'}
                  </div>
                </div>

                <div className="p-4 rounded-2xl bg-white border border-stone-200 shadow-xs flex flex-col justify-between">
                  <div className="text-[11px] font-bold uppercase tracking-wider text-stone-500 mb-1">
                    Aksi Pengeluaran
                  </div>
                  <button
                    onClick={() => {
                      if (onOpenQuickExpense) onOpenQuickExpense();
                    }}
                    className="w-full py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold flex items-center justify-center space-x-1.5 transition-colors cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Catat Belanja Baru</span>
                  </button>
                </div>
              </div>

              {/* Category Breakdown Bar Chart */}
              {expenseCategories.length > 0 && (
                <div className="bg-white p-4 rounded-2xl border border-stone-200 shadow-xs space-y-3">
                  <h3 className="text-xs sm:text-sm font-extrabold text-stone-800">
                    Alokasi Biaya per Kategori Pengeluaran
                  </h3>
                  <div className="space-y-2.5">
                    {expenseCategories.map((cat) => (
                      <div key={cat.category} className="space-y-1">
                        <div className="flex items-center justify-between text-xs font-bold">
                          <span className="text-stone-700">{cat.category} ({cat.count}x)</span>
                          <span className="text-rose-600">{formatRupiah(cat.total)} ({cat.percentage}%)</span>
                        </div>
                        <div className="w-full h-2 bg-stone-100 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-rose-500 rounded-full"
                            style={{ width: `${cat.percentage}%` }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Expense Table */}
              <div className="bg-white rounded-2xl border border-stone-200 shadow-xs overflow-hidden">
                <div className="px-4 py-3 bg-stone-50 border-b border-stone-200 flex items-center justify-between">
                  <h3 className="text-xs sm:text-sm font-extrabold text-stone-800">
                    Rincian Nota Pengeluaran ({activeMonthLabel})
                  </h3>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="bg-stone-100 text-stone-600 text-[11px] font-bold uppercase border-b border-stone-200">
                        <th className="py-2.5 px-3">Tanggal</th>
                        <th className="py-2.5 px-3">Kategori</th>
                        <th className="py-2.5 px-3">Keterangan Nota</th>
                        <th className="py-2.5 px-3">Penanggung Jawab</th>
                        <th className="py-2.5 px-3 text-right">Nominal</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-stone-100 font-medium">
                      {filteredMutationsKeluar.length === 0 ? (
                        <tr>
                          <td colSpan={5} className="py-8 text-center text-stone-400">
                            Belum ada catatan pengeluaran kas di periode {activeMonthLabel}.
                          </td>
                        </tr>
                      ) : (
                        filteredMutationsKeluar.map((m) => (
                          <tr key={m.id} className="hover:bg-stone-50">
                            <td className="py-2.5 px-3 text-stone-600">{m.tanggal}</td>
                            <td className="py-2.5 px-3 font-bold text-stone-800">{m.kategori}</td>
                            <td className="py-2.5 px-3 text-stone-600">{m.keterangan}</td>
                            <td className="py-2.5 px-3 text-stone-500">{m.petugas || '-'}</td>
                            <td className="py-2.5 px-3 text-right font-extrabold text-rose-600">
                              -{formatRupiah(m.nominal)}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* ========================================================= */}
          {/* TAB 5: REKAP BULANAN MATRIKS (1-31)                        */}
          {/* ========================================================= */}
          {activeTab === 'bulanan' && (
            <div className="space-y-6 animate-in fade-in">
              <div className="bg-white p-4 rounded-2xl border border-stone-200 shadow-xs flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h3 className="text-sm font-extrabold text-stone-900">
                    Matriks Presensi Jimpitan Warga Tanggal 1 s/d {daysInMonth} {activeMonthLabel}
                  </h3>
                  <p className="text-xs text-stone-500 mt-0.5">
                    Menampilkan rincian tanda centang presensi dan total setoran jimpitan per tanggal untuk seluruh warga RT.
                  </p>
                </div>

                <button
                  onClick={handleExportBulananMatriksPdf}
                  className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-xs flex items-center space-x-1.5 shadow-sm transition-all cursor-pointer"
                >
                  <Printer className="w-4 h-4" />
                  <span>Unduh Dokumen PDF Lengkap (A4 Landscape)</span>
                </button>
              </div>

              {/* Matrix Table Preview */}
              <div className="bg-white rounded-2xl border border-stone-200 shadow-xs overflow-hidden">
                <div className="overflow-x-auto max-h-[480px]">
                  <table className="w-full text-left border-collapse text-[11px]">
                    <thead className="sticky top-0 bg-slate-900 text-white z-10 shadow-xs">
                      <tr>
                        <th className="py-2 px-2.5 text-center font-bold">No</th>
                        <th className="py-2 px-2.5 font-bold whitespace-nowrap">Rumah</th>
                        <th className="py-2 px-3 font-bold whitespace-nowrap min-w-[140px]">Nama Warga</th>
                        {Array.from({ length: daysInMonth }, (_, i) => (
                          <th key={i + 1} className="py-2 px-1 text-center font-bold text-[10px] w-6">
                            {i + 1}
                          </th>
                        ))}
                        <th className="py-2 px-2.5 text-center font-bold whitespace-nowrap">Hadir</th>
                        <th className="py-2 px-3 text-right font-bold whitespace-nowrap">Total</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-stone-100 font-medium">
                      {wargaAnalysisList.map((item, idx) => (
                        <tr key={item.warga.id} className="hover:bg-stone-50">
                          <td className="py-1.5 px-2.5 text-center text-stone-400">{idx + 1}</td>
                          <td className="py-1.5 px-2.5 font-bold text-stone-900 whitespace-nowrap">
                            No. {item.warga.nomorRumah}
                          </td>
                          <td className="py-1.5 px-3 font-bold text-stone-800 whitespace-nowrap">
                            {item.warga.nama}
                          </td>
                          {Array.from({ length: daysInMonth }, (_, i) => {
                            const dInfo = item.dailyMap[i + 1];
                            const isPaid = dInfo && dInfo.isPaid;
                            return (
                              <td
                                key={i + 1}
                                className={`py-1.5 px-1 text-center text-[10px] font-bold border-l border-stone-100 ${
                                  isPaid ? 'bg-emerald-50 text-emerald-700' : 'text-stone-300'
                                }`}
                              >
                                {isPaid ? '✓' : '-'}
                              </td>
                            );
                          })}
                          <td className="py-1.5 px-2.5 text-center font-bold text-stone-700 bg-stone-50 border-l border-stone-200">
                            {item.countPaidDays} hr
                          </td>
                          <td className="py-1.5 px-3 text-right font-black text-emerald-700 bg-stone-50 border-l border-stone-200 whitespace-nowrap">
                            {formatRupiah(item.totalTerbayar)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

        </div>

        {/* FOOTER BAR */}
        <div className="px-5 py-3 bg-stone-100 border-t border-stone-200 flex items-center justify-between">
          <div className="text-xs text-stone-500 font-medium">
            Sistem Jimpitan Digital • Laporan Realtime & Terverifikasi
          </div>
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-stone-800 hover:bg-stone-900 text-white font-extrabold text-xs transition-colors cursor-pointer"
          >
            Tutup
          </button>
        </div>

      </div>
    </div>
  );
};
