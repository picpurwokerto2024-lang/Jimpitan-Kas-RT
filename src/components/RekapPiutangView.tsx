import React, { useState, useMemo } from 'react';
import { 
  AlertTriangle,
  Receipt,
  DollarSign,
  CheckCircle2,
  ChevronRight,
  ChevronDown,
  MessageSquare,
  ExternalLink,
  Search,
  X,
  SlidersHorizontal,
  RotateCcw,
  Calendar,
  Filter,
  ArrowUpDown,
  Building,
  Phone,
  CalendarDays,
  UserCheck,
  ShieldAlert,
  FileText,
  Users,
  Sparkles,
  ArrowUpRight,
  Coins,
  Wallet,
  CheckSquare
} from 'lucide-react';
import { JimpitanRecord, KasMutation, Warga, AppSettings, AppMode } from '../types';
import { formatRupiah, formatTanggalIndo, cleanWhatsAppPhone, getTodayDateIso } from '../utils/formatters';
import { AppTheme, AVAILABLE_THEMES } from '../utils/themeManager';
import { calculateTunggakanRekap, WargaTunggakanDetail } from '../utils/tunggakanCalculator';
import { BayarPelunasanTunggakanModal } from './BayarPelunasanTunggakanModal';
import { LaporanTunggakanPdfModal } from './LaporanTunggakanPdfModal';
import { EditSisaPiutangModal } from './EditSisaPiutangModal';

interface RekapPiutangViewProps {
  allRecords: JimpitanRecord[];
  kasMutations: KasMutation[];
  wargaList: Warga[];
  onAddMutation: (mut: Omit<KasMutation, 'id' | 'createdAt'>) => void;
  onUpdateMutation?: (mut: KasMutation) => void;
  onUpdateRecord?: (record: JimpitanRecord) => void;
  onUpdateWarga?: (updatedWarga: Warga) => void;
  settings: AppSettings;
  selectedDate: string;
  isAdmin?: boolean;
  appMode?: AppMode;
  theme?: AppTheme;
  currentPetugas?: string;
  onNavigateToKas?: () => void;
}

export const RekapPiutangView: React.FC<RekapPiutangViewProps> = ({
  allRecords = [],
  kasMutations = [],
  wargaList = [],
  onAddMutation,
  onUpdateMutation,
  onUpdateRecord,
  onUpdateWarga,
  settings,
  selectedDate,
  isAdmin = true,
  appMode = 'warga',
  theme = AVAILABLE_THEMES[0],
  currentPetugas = 'Petugas / Bendahara RT',
  onNavigateToKas,
}) => {
  const isAuthorized = isAdmin || appMode === 'petugas' || appMode === 'penginput';

  // Calculation mode: 'all_history' (Semua Lampau) vs 'single_prev_month' (1 Bulan Lalu)
  const [tunggakanCalcMode, setTunggakanCalcMode] = useState<'all_history' | 'single_prev_month'>('all_history');
  const [isTunggakanFilterExpanded, setIsTunggakanFilterExpanded] = useState<boolean>(false);
  const [tunggakanSearchQuery, setTunggakanSearchQuery] = useState<string>('');

  // Specific Filters
  const [tunggakanStatusFilter, setTunggakanStatusFilter] = useState<'unpaid' | 'all' | 'multi_month' | 'paid'>('unpaid');
  const [tunggakanMonthFilter, setTunggakanMonthFilter] = useState<string>('semua');
  const [tunggakanYearFilter, setTunggakanYearFilter] = useState<string>('semua');
  const [tunggakanBlokFilter, setTunggakanBlokFilter] = useState<string>('semua');
  const [tunggakanTarifFilter, setTunggakanTarifFilter] = useState<'semua' | 'reguler' | 'khusus_tinggi' | 'khusus_rendah'>('semua');
  const [tunggakanSeverityFilter, setTunggakanSeverityFilter] = useState<'semua' | '1_bulan' | '2_3_bulan' | 'lebih_3_bulan'>('semua');
  const [tunggakanNominalRangeFilter, setTunggakanNominalRangeFilter] = useState<'semua' | 'under_30k' | '30k_100k' | 'above_100k'>('semua');
  const [tunggakanContactFilter, setTunggakanContactFilter] = useState<'semua' | 'ada_wa' | 'tanpa_wa'>('semua');
  const [tunggakanSortBy, setTunggakanSortBy] = useState<'sisa_desc' | 'sisa_asc' | 'bulan_desc' | 'rumah_asc' | 'nama_asc'>('sisa_desc');

  // Modals state
  const [selectedWargaForPelunasan, setSelectedWargaForPelunasan] = useState<WargaTunggakanDetail | null>(null);
  const [selectedWargaForEditPiutang, setSelectedWargaForEditPiutang] = useState<WargaTunggakanDetail | null>(null);
  const [isTunggakanPdfModalOpen, setIsTunggakanPdfModalOpen] = useState<boolean>(false);

  // Derive activeYearMonth from selectedDate
  const activeYearMonth = useMemo(() => {
    if (selectedDate && typeof selectedDate === 'string' && selectedDate.includes('-')) {
      const parts = selectedDate.split('-');
      return `${parts[0]}-${parts[1]}`;
    }
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  }, [selectedDate]);

  // Tunggakan summary & debtor calculation
  const tunggakanRekap = useMemo(() => {
    return calculateTunggakanRekap(
      wargaList,
      allRecords,
      kasMutations,
      activeYearMonth,
      settings,
      tunggakanCalcMode
    );
  }, [wargaList, allRecords, kasMutations, activeYearMonth, settings, tunggakanCalcMode]);

  // Available past months & years for dropdown filters
  const availablePastMonths = useMemo(() => {
    const map = new Map<string, string>();
    tunggakanRekap.wargaListTunggakan.forEach((w) => {
      w.rincianBulanLampau.forEach((rb) => {
        if (!map.has(rb.yearMonth)) {
          map.set(rb.yearMonth, rb.monthLabel);
        }
      });
    });
    return Array.from(map.entries())
      .map(([yearMonth, label]) => ({ yearMonth, label }))
      .sort((a, b) => b.yearMonth.localeCompare(a.yearMonth));
  }, [tunggakanRekap]);

  const availablePastYears = useMemo(() => {
    const yearsSet = new Set<string>();
    tunggakanRekap.wargaListTunggakan.forEach((w) => {
      w.rincianBulanLampau.forEach((rb) => {
        const yr = String(rb.year);
        if (yr) yearsSet.add(yr);
      });
    });
    return Array.from(yearsSet).sort((a, b) => b.localeCompare(a));
  }, [tunggakanRekap]);

  // Aggregate breakdown per year for quick year pills
  const yearlyTunggakanBreakdown = useMemo(() => {
    const map = new Map<string, { year: string; totalKurang: number; wargaIds: Set<string> }>();
    availablePastYears.forEach(y => {
      map.set(y, { year: y, totalKurang: 0, wargaIds: new Set() });
    });

    tunggakanRekap.wargaListTunggakan.forEach(w => {
      w.rincianBulanLampau.forEach(rb => {
        const yr = String(rb.year);
        if (map.has(yr)) {
          const entry = map.get(yr)!;
          if (rb.kurangNominal > 0) {
            entry.totalKurang += rb.kurangNominal;
            entry.wargaIds.add(w.warga.id);
          }
        }
      });
    });

    return Array.from(map.values())
      .map((e) => ({
        year: e.year,
        totalKurang: e.totalKurang,
        wargaCount: e.wargaIds.size,
      }))
      .sort((a, b) => b.year.localeCompare(a.year));
  }, [availablePastYears, tunggakanRekap]);

  const availableBloks = useMemo(() => {
    const bloks = new Set<string>();
    wargaList.forEach((w) => {
      if (w.blok && w.blok.trim()) {
        bloks.add(w.blok.trim());
      }
    });
    return Array.from(bloks).sort();
  }, [wargaList]);

  // Filter and sort debtors list
  const filteredDebtorsList = useMemo(() => {
    let list = tunggakanRekap.wargaListTunggakan.filter((item) => {
      // 1. Search Query (Nama, Nomor Rumah, Blok, HP)
      const q = tunggakanSearchQuery.toLowerCase().trim();
      if (q) {
        const matchNama = item.warga.nama.toLowerCase().includes(q);
        const matchRumah = (item.warga.nomorRumah || '').toLowerCase().includes(q);
        const matchBlok = (item.warga.blok || '').toLowerCase().includes(q);
        const matchHp = (item.warga.nomorHp || '').replace(/\D/g, '').includes(q.replace(/\D/g, ''));
        if (!matchNama && !matchRumah && !matchBlok && !matchHp) return false;
      }

      // 2. Status Filter
      if (tunggakanStatusFilter === 'unpaid' && item.sisaTunggakanLalu <= 0) return false;
      if (tunggakanStatusFilter === 'multi_month' && (item.jumlahBulanTertunggak <= 1 || item.sisaTunggakanLalu <= 0)) return false;
      if (tunggakanStatusFilter === 'paid' && (item.tunggakanBulanLalu === 0 || item.sisaTunggakanLalu > 0)) return false;

      // 3. Month Filter
      if (tunggakanMonthFilter !== 'semua') {
        const monthArrears = item.rincianBulanLampau.find((b) => b.yearMonth === tunggakanMonthFilter);
        if (!monthArrears || monthArrears.kurangNominal <= 0) return false;
      }

      // 4. Year Filter
      if (tunggakanYearFilter !== 'semua') {
        const hasArrearsInYear = item.rincianBulanLampau.some(
          (b) => String(b.year) === tunggakanYearFilter && b.kurangNominal > 0
        );
        if (!hasArrearsInYear) return false;
      }

      // 5. Blok Filter
      if (tunggakanBlokFilter !== 'semua') {
        if ((item.warga.blok || '').toLowerCase() !== tunggakanBlokFilter.toLowerCase()) return false;
      }

      // 6. Tarif Filter
      const defaultNominal = settings.defaultNominal || 1000;
      const residentNominal = item.warga.nominalDefault || defaultNominal;
      if (tunggakanTarifFilter === 'reguler' && residentNominal !== defaultNominal) return false;
      if (tunggakanTarifFilter === 'khusus_tinggi' && residentNominal <= defaultNominal) return false;
      if (tunggakanTarifFilter === 'khusus_rendah' && residentNominal >= defaultNominal) return false;

      // 7. Severity (Durasi Menunggak)
      if (tunggakanSeverityFilter === '1_bulan' && item.jumlahBulanTertunggak !== 1) return false;
      if (tunggakanSeverityFilter === '2_3_bulan' && (item.jumlahBulanTertunggak < 2 || item.jumlahBulanTertunggak > 3)) return false;
      if (tunggakanSeverityFilter === 'lebih_3_bulan' && item.jumlahBulanTertunggak <= 3) return false;

      // 8. Nominal Range Filter
      if (tunggakanNominalRangeFilter === 'under_30k' && item.sisaTunggakanLalu >= 30000) return false;
      if (tunggakanNominalRangeFilter === '30k_100k' && (item.sisaTunggakanLalu < 30000 || item.sisaTunggakanLalu > 100000)) return false;
      if (tunggakanNominalRangeFilter === 'above_100k' && item.sisaTunggakanLalu <= 100000) return false;

      // 9. Contact Filter (WhatsApp)
      const hasPhone = Boolean(item.warga.nomorHp && item.warga.nomorHp.trim());
      if (tunggakanContactFilter === 'ada_wa' && !hasPhone) return false;
      if (tunggakanContactFilter === 'tanpa_wa' && hasPhone) return false;

      return true;
    });

    // 10. Sorting
    return list.sort((a, b) => {
      switch (tunggakanSortBy) {
        case 'sisa_desc':
          return b.sisaTunggakanLalu - a.sisaTunggakanLalu;
        case 'sisa_asc':
          return a.sisaTunggakanLalu - b.sisaTunggakanLalu;
        case 'bulan_desc':
          return b.jumlahBulanTertunggak - a.jumlahBulanTertunggak;
        case 'rumah_asc':
          return a.warga.nomorRumah.localeCompare(b.warga.nomorRumah, undefined, { numeric: true });
        case 'nama_asc':
          return a.warga.nama.localeCompare(b.warga.nama);
        default:
          return b.sisaTunggakanLalu - a.sisaTunggakanLalu;
      }
    });
  }, [
    tunggakanRekap.wargaListTunggakan,
    tunggakanSearchQuery,
    tunggakanStatusFilter,
    tunggakanMonthFilter,
    tunggakanYearFilter,
    tunggakanBlokFilter,
    tunggakanTarifFilter,
    tunggakanSeverityFilter,
    tunggakanNominalRangeFilter,
    tunggakanContactFilter,
    tunggakanSortBy,
    settings.defaultNominal,
  ]);

  // Dynamic filter summary
  const filteredDebtorsSummary = useMemo(() => {
    let totalSisa = 0;
    let totalAwal = 0;
    let totalPelunasan = 0;
    let countTertunggak = 0;
    let countWaSiap = 0;

    filteredDebtorsList.forEach((w) => {
      totalSisa += w.sisaTunggakanLalu;
      totalAwal += (w.totalTunggakanKumulatif || w.tunggakanBulanLalu);
      totalPelunasan += w.pelunasanBulanIni;
      if (w.sisaTunggakanLalu > 0) countTertunggak++;
      if (w.sisaTunggakanLalu > 0 && w.warga.nomorHp && cleanWhatsAppPhone(w.warga.nomorHp)) countWaSiap++;
    });

    return {
      count: filteredDebtorsList.length,
      countTertunggak,
      countWaSiap,
      totalSisa,
      totalAwal,
      totalPelunasan,
    };
  }, [filteredDebtorsList]);

  // Active filters count
  const activeTunggakanFiltersCount = useMemo(() => {
    let count = 0;
    if (tunggakanStatusFilter !== 'unpaid') count++;
    if (tunggakanMonthFilter !== 'semua') count++;
    if (tunggakanYearFilter !== 'semua') count++;
    if (tunggakanBlokFilter !== 'semua') count++;
    if (tunggakanTarifFilter !== 'semua') count++;
    if (tunggakanSeverityFilter !== 'semua') count++;
    if (tunggakanNominalRangeFilter !== 'semua') count++;
    if (tunggakanContactFilter !== 'semua') count++;
    if (tunggakanSortBy !== 'sisa_desc') count++;
    if (tunggakanSearchQuery.trim()) count++;
    return count;
  }, [
    tunggakanStatusFilter,
    tunggakanMonthFilter,
    tunggakanYearFilter,
    tunggakanBlokFilter,
    tunggakanTarifFilter,
    tunggakanSeverityFilter,
    tunggakanNominalRangeFilter,
    tunggakanContactFilter,
    tunggakanSortBy,
    tunggakanSearchQuery,
  ]);

  const handleResetTunggakanFilters = () => {
    setTunggakanMonthFilter('semua');
    setTunggakanYearFilter('semua');
    setTunggakanBlokFilter('semua');
    setTunggakanTarifFilter('semua');
    setTunggakanSeverityFilter('semua');
    setTunggakanNominalRangeFilter('semua');
    setTunggakanContactFilter('semua');
    setTunggakanSortBy('sisa_desc');
    setTunggakanSearchQuery('');
    setTunggakanStatusFilter('unpaid');
  };

  const handleOpenWhatsAppPenagihan = (detail: WargaTunggakanDetail) => {
    const rawHp = detail.warga.nomorHp || '';
    const cleanHp = cleanWhatsAppPhone(rawHp);
    if (!cleanHp) {
      alert(`Nomor WhatsApp warga ${detail.warga.nama} belum terdaftar.`);
      return;
    }

    const unpaidMonths = detail.rincianBulanLampau.filter((b) => b.kurangNominal > 0);
    const detailBulanText = unpaidMonths.length > 0
      ? unpaidMonths
          .map((b) => `• ${b.monthLabel}: -${formatRupiah(b.kurangNominal)} (Target ${formatRupiah(b.targetNominal)})`)
          .join('\n')
      : `• Periode Lampau (${tunggakanRekap.prevMonthLabel}): -${formatRupiah(detail.tunggakanBulanLalu)}`;

    const pesan = `*PEMBERITAHUAN TUNGGAKAN JIMPITAN RT*\n` +
      `Kepada Yth. Bpk/Ibu *${detail.warga.nama}* (No. Rumah ${detail.warga.nomorRumah || '-'}${detail.warga.blok ? `, ${detail.warga.blok}` : ''})\n\n` +
      `Salam hangat dari Pengurus ${settings.namaRt || 'RT 003'} / ${settings.namaRw || 'RW 002'}.\n` +
      `Berdasarkan rekap pencatatan sistem kas jimpitan s/d ${formatTanggalIndo(selectedDate)}, tercatat adanya kekurangan setoran jimpitan periode lampau dengan rincian sbb:\n\n` +
      `${detailBulanText}\n\n` +
      `*Total Sisa Hutang Wajib Bayar: ${formatRupiah(detail.sisaTunggakanLalu)}*\n\n` +
      `Bpk/Ibu dapat melakukan pelunasan secara tunai melalui petugas ronda saat penarikan malam ini atau titip langsung ke bendahara RT.\n\n` +
      `Terima kasih atas partisipasi & kerjasamanya dalam memajukan lingkungan kita bersama. 🙏\n` +
      `_Pengurus RT & Bendahara_`;

    const url = `https://wa.me/${cleanHp}?text=${encodeURIComponent(pesan)}`;
    window.open(url, '_blank');
  };

  return (
    <div className="w-full space-y-4 pb-12" id="rekap-piutang-view-root">
      {/* 1. Header Banner */}
      <div className="bg-white rounded-3xl border border-amber-200/90 p-4 sm:p-5 shadow-xs space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center space-x-3">
            <div className="w-11 h-11 rounded-2xl bg-amber-500/15 border border-amber-300 text-amber-900 flex items-center justify-center shrink-0 shadow-2xs">
              <Receipt className="w-5 h-5 text-amber-700 stroke-[2.3]" />
            </div>
            <div>
              <div className="flex items-center space-x-2 flex-wrap gap-y-1">
                <span className="px-2.5 py-0.5 rounded-xl bg-amber-100/90 text-amber-900 text-[11px] font-black tracking-wide uppercase border border-amber-200">
                  REKAP PIUTANG RT
                </span>
                <span className="px-2 py-0.5 rounded-full bg-rose-100 text-rose-800 text-[10.5px] font-extrabold border border-rose-200">
                  {tunggakanRekap.summary.totalWargaTertunggakLalu} Rumah Tertunggak
                </span>
              </div>
              <h2 className="text-xl sm:text-2xl font-extrabold text-stone-900 tracking-tight font-sans mt-0.5">
                Daftar Piutang & Tunggakan Warga
              </h2>
            </div>
          </div>

          {/* Quick Action Buttons */}
          <div className="flex items-center space-x-2 self-start sm:self-auto flex-wrap gap-y-1">
            {/* Mode Switcher: Kumulatif Semua Lampau vs 1 Bulan Lalu */}
            <div className="flex items-center bg-amber-50 p-1 rounded-xl border border-amber-200 text-[11px]">
              <button
                type="button"
                onClick={() => setTunggakanCalcMode('all_history')}
                className={`px-2.5 py-1 rounded-lg font-bold transition-all cursor-pointer ${
                  tunggakanCalcMode === 'all_history'
                    ? 'bg-amber-600 text-white shadow-2xs'
                    : 'text-amber-900 hover:bg-amber-100'
                }`}
                title="Hitung akumulasi seluruh bulan & tahun lampau"
              >
                Semua Lampau
              </button>
              <button
                type="button"
                onClick={() => setTunggakanCalcMode('single_prev_month')}
                className={`px-2.5 py-1 rounded-lg font-bold transition-all cursor-pointer ${
                  tunggakanCalcMode === 'single_prev_month'
                    ? 'bg-amber-600 text-white shadow-2xs'
                    : 'text-amber-900 hover:bg-amber-100'
                }`}
                title="Hanya hitung 1 bulan sebelumnya"
              >
                1 Bulan Lalu
              </button>
            </div>

            {/* Ekspor PDF Tunggakan Button */}
            <button
              type="button"
              onClick={() => setIsTunggakanPdfModalOpen(true)}
              className="px-3 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold flex items-center space-x-1.5 shadow-xs transition-colors cursor-pointer"
              title="Cetak dan ekspor PDF resmi laporan piutang & pelunasan dengan tanda tangan"
            >
              <FileText className="w-4 h-4 text-amber-400" />
              <span>Ekspor PDF</span>
            </button>
          </div>
        </div>

        <p className="text-xs text-stone-600 leading-relaxed">
          Kewajiban jimpitan dan iuran warga yang belum lunas dari periode lampau ({tunggakanCalcMode === 'all_history' ? 'Akumulasi Seluruh Bulan & Tahun Sebelumnya' : `Bulan ${tunggakanRekap.prevMonthLabel}`}). Fitur ini mempermudah pencatatan pelunasan cicilan kas dan penagihan via WhatsApp.
        </p>
      </div>

      {/* 2. 4 Summary KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
        {/* Box 1: Sisa Hutang Belum Lunas */}
        <div className="p-3 sm:p-4 rounded-3xl bg-gradient-to-br from-rose-50 via-rose-50/70 to-white border border-rose-200/90 text-rose-950 shadow-2xs">
          <span className="text-[10px] sm:text-[11px] font-extrabold uppercase tracking-wider text-rose-700 block">
            Sisa Hutang Belum Lunas
          </span>
          <div className="text-base sm:text-xl font-black text-rose-900 mt-1 truncate font-sans">
            {formatRupiah(tunggakanRekap.summary.totalSisaTunggakanLalu)}
          </div>
          <span className="text-[10px] text-rose-600 font-semibold block truncate mt-0.5">
            Total belum masuk kas
          </span>
        </div>

        {/* Box 2: Total Hutang Lampau Awal */}
        <div className="p-3 sm:p-4 rounded-3xl bg-gradient-to-br from-amber-50 via-amber-50/70 to-white border border-amber-200/90 text-amber-950 shadow-2xs">
          <span className="text-[10px] sm:text-[11px] font-extrabold uppercase tracking-wider text-amber-800 block">
            Total Hutang Lampau
          </span>
          <div className="text-base sm:text-xl font-black text-amber-900 mt-1 truncate font-sans">
            -{formatRupiah(tunggakanRekap.summary.totalTunggakanBulanLalu)}
          </div>
          <span className="text-[10px] text-amber-700 font-semibold block truncate mt-0.5">
            {tunggakanRekap.summary.totalWargaTertunggakLalu} dari {tunggakanRekap.summary.totalWarga} rumah
          </span>
        </div>

        {/* Box 3: Pelunasan Diterima Masuk Kas */}
        <div className="p-3 sm:p-4 rounded-3xl bg-gradient-to-br from-emerald-50 via-emerald-50/70 to-white border border-emerald-200/90 text-emerald-950 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-[10px] sm:text-[11px] font-extrabold uppercase tracking-wider text-emerald-700">
              Pelunasan Masuk
            </span>
            <span className="text-[10px] font-black px-1.5 py-0.5 rounded-full bg-emerald-200 text-emerald-900">
              {tunggakanRekap.summary.persenPelunasan}%
            </span>
          </div>
          <div className="text-base sm:text-xl font-black text-emerald-900 mt-1 truncate font-sans">
            +{formatRupiah(tunggakanRekap.summary.totalPelunasanBulanIni)}
          </div>
          <span className="text-[10px] text-emerald-700 font-semibold block truncate mt-0.5">
            Masuk kas {tunggakanRekap.activeMonthLabel}
          </span>
        </div>

        {/* Box 4: Periode Lampau Teridentifikasi */}
        <div className="p-3 sm:p-4 rounded-3xl bg-gradient-to-br from-sky-50 via-sky-50/70 to-white border border-sky-200/90 text-sky-950 shadow-2xs">
          <span className="text-[10px] sm:text-[11px] font-extrabold uppercase tracking-wider text-sky-700 block">
            Periode Terdata
          </span>
          <div className="text-base sm:text-xl font-black text-sky-900 mt-1 truncate font-sans">
            {tunggakanRekap.summary.totalBulanTeridentifikasi} Bulan
          </div>
          <span className="text-[10px] text-sky-700 font-semibold block truncate mt-0.5">
            Hingga {tunggakanRekap.prevMonthLabel}
          </span>
        </div>
      </div>

      {/* 3. Search, Quick Filters & Year Chips Bar */}
      <div className="bg-white rounded-3xl border border-stone-200 p-4 space-y-3 shadow-2xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
          {/* Search Input */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-stone-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={tunggakanSearchQuery}
              onChange={(e) => setTunggakanSearchQuery(e.target.value)}
              placeholder="Cari nama warga / no. rumah / blok / HP..."
              className="w-full pl-10 pr-8 py-2.5 rounded-2xl bg-stone-50 border border-stone-200 text-xs text-stone-900 outline-none focus:border-amber-500 focus:bg-white placeholder:text-stone-400 transition-colors"
            />
            {tunggakanSearchQuery && (
              <button
                onClick={() => setTunggakanSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600 p-0.5"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Filter Actions */}
          <div className="flex items-center space-x-2 shrink-0">
            <button
              type="button"
              onClick={() => setIsTunggakanFilterExpanded(!isTunggakanFilterExpanded)}
              className={`px-3 py-2.5 rounded-2xl text-xs font-bold flex items-center space-x-1.5 transition-all cursor-pointer ${
                isTunggakanFilterExpanded || activeTunggakanFiltersCount > 0
                  ? 'bg-amber-600 text-white shadow-2xs'
                  : 'bg-stone-100 hover:bg-stone-200 text-stone-700'
              }`}
              title="Buka panel filter lanjutan piutang warga"
            >
              <SlidersHorizontal className="w-4 h-4" />
              <span>Filter Lanjutan</span>
              {activeTunggakanFiltersCount > 0 && (
                <span className="w-5 h-5 rounded-full bg-white text-amber-800 text-[10px] font-black flex items-center justify-center ml-0.5">
                  {activeTunggakanFiltersCount}
                </span>
              )}
            </button>

            {activeTunggakanFiltersCount > 0 && (
              <button
                type="button"
                onClick={handleResetTunggakanFilters}
                className="p-2.5 rounded-2xl bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 text-xs transition-colors cursor-pointer"
                title="Reset semua filter ke kondisi awal"
              >
                <RotateCcw className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        {/* Status Chips Filter */}
        <div className="flex items-center gap-1.5 overflow-x-auto text-[11px] pb-1 scrollbar-none">
          <button
            type="button"
            onClick={() => setTunggakanStatusFilter('unpaid')}
            className={`px-3 py-1.5 rounded-xl font-bold whitespace-nowrap transition-all cursor-pointer ${
              tunggakanStatusFilter === 'unpaid'
                ? 'bg-rose-600 text-white shadow-2xs'
                : 'bg-stone-100 text-stone-700 hover:bg-stone-200'
            }`}
          >
            Belum Lunas ({tunggakanRekap.wargaListTunggakan.filter((w) => w.sisaTunggakanLalu > 0).length})
          </button>
          <button
            type="button"
            onClick={() => setTunggakanStatusFilter('multi_month')}
            className={`px-3 py-1.5 rounded-xl font-bold whitespace-nowrap transition-all cursor-pointer ${
              tunggakanStatusFilter === 'multi_month'
                ? 'bg-amber-600 text-white shadow-2xs'
                : 'bg-stone-100 text-stone-700 hover:bg-stone-200'
            }`}
          >
            &gt; 1 Bulan ({tunggakanRekap.wargaListTunggakan.filter((w) => w.jumlahBulanTertunggak > 1 && w.sisaTunggakanLalu > 0).length})
          </button>
          <button
            type="button"
            onClick={() => setTunggakanStatusFilter('paid')}
            className={`px-3 py-1.5 rounded-xl font-bold whitespace-nowrap transition-all cursor-pointer ${
              tunggakanStatusFilter === 'paid'
                ? 'bg-emerald-700 text-white shadow-2xs'
                : 'bg-stone-100 text-stone-700 hover:bg-stone-200'
            }`}
          >
            Telah Lunas ({tunggakanRekap.wargaListTunggakan.filter((w) => w.tunggakanBulanLalu > 0 && w.sisaTunggakanLalu === 0).length})
          </button>
          <button
            type="button"
            onClick={() => setTunggakanStatusFilter('all')}
            className={`px-3 py-1.5 rounded-xl font-bold whitespace-nowrap transition-all cursor-pointer ${
              tunggakanStatusFilter === 'all'
                ? 'bg-stone-800 text-white shadow-2xs'
                : 'bg-stone-100 text-stone-700 hover:bg-stone-200'
            }`}
          >
            Semua Warga ({tunggakanRekap.wargaListTunggakan.length})
          </button>
        </div>

        {/* Dedicated Quick Filter Piutang Per Tahun */}
        {availablePastYears.length > 0 && (
          <div className="flex items-center gap-1.5 overflow-x-auto text-[11px] py-1.5 bg-amber-50/60 p-2.5 rounded-2xl border border-amber-200/80 scrollbar-none">
            <div className="flex items-center space-x-1.5 text-amber-900 font-extrabold shrink-0 text-xs pr-1">
              <Calendar className="w-4 h-4 text-amber-700" />
              <span>Filter Tahun:</span>
            </div>

            <button
              type="button"
              onClick={() => setTunggakanYearFilter('semua')}
              className={`px-3 py-1.5 rounded-xl font-bold whitespace-nowrap transition-all cursor-pointer flex items-center space-x-1 ${
                tunggakanYearFilter === 'semua'
                  ? 'bg-amber-800 text-white shadow-2xs'
                  : 'bg-white text-stone-700 hover:bg-amber-100/70 border border-stone-200'
              }`}
            >
              <span>Semua Tahun</span>
            </button>

            {yearlyTunggakanBreakdown.map((yrData) => (
              <button
                key={yrData.year}
                type="button"
                onClick={() => setTunggakanYearFilter(tunggakanYearFilter === yrData.year ? 'semua' : yrData.year)}
                className={`px-3 py-1.5 rounded-xl font-bold whitespace-nowrap transition-all cursor-pointer flex items-center space-x-1.5 ${
                  tunggakanYearFilter === yrData.year
                    ? 'bg-amber-600 text-white shadow-2xs ring-2 ring-amber-400 font-black'
                    : 'bg-white text-stone-800 hover:bg-amber-100/70 border border-stone-200'
                }`}
              >
                <span>Tahun {yrData.year}</span>
                <span
                  className={`text-[9.5px] px-1.5 py-0.2 rounded-full font-black ${
                    tunggakanYearFilter === yrData.year ? 'bg-white text-amber-900' : 'bg-rose-100 text-rose-800'
                  }`}
                >
                  {formatRupiah(yrData.totalKurang)}
                </span>
              </button>
            ))}
          </div>
        )}

        {/* Advanced Filter Expansion Box */}
        {isTunggakanFilterExpanded && (
          <div className="p-4 rounded-2xl bg-amber-50/70 border border-amber-200 space-y-3 animate-in fade-in duration-200">
            <div className="flex items-center justify-between border-b border-amber-200/60 pb-2">
              <span className="text-xs font-black text-amber-950 flex items-center space-x-1.5">
                <Filter className="w-4 h-4 text-amber-700" />
                <span>Kriteria Filter & Pengurutan Piutang</span>
              </span>
              <button
                type="button"
                onClick={handleResetTunggakanFilters}
                className="text-xs font-bold text-rose-700 hover:underline flex items-center space-x-1"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Reset Filter</span>
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-2.5 text-xs">
              {/* Filter 1: Bulan Tertentu */}
              <div>
                <label className="block text-[11px] font-bold text-amber-900 mb-1">Bulan Tertunggak:</label>
                <select
                  value={tunggakanMonthFilter}
                  onChange={(e) => setTunggakanMonthFilter(e.target.value)}
                  className="w-full p-2.5 rounded-xl bg-white border border-amber-300 text-stone-900 outline-none focus:ring-2 focus:ring-amber-400 text-xs font-semibold"
                >
                  <option value="semua">Semua Bulan Lampau</option>
                  {availablePastMonths.map((m) => (
                    <option key={m.yearMonth} value={m.yearMonth}>
                      {m.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Filter 2: Tahun Tertentu */}
              <div>
                <label className="block text-[11px] font-bold text-amber-900 mb-1">Tahun Tertunggak:</label>
                <select
                  value={tunggakanYearFilter}
                  onChange={(e) => setTunggakanYearFilter(e.target.value)}
                  className="w-full p-2.5 rounded-xl bg-white border border-amber-300 text-stone-900 outline-none focus:ring-2 focus:ring-amber-400 text-xs font-semibold"
                >
                  <option value="semua">Semua Tahun</option>
                  {availablePastYears.map((yr) => (
                    <option key={yr} value={yr}>
                      Tahun {yr}
                    </option>
                  ))}
                </select>
              </div>

              {/* Filter 3: Kategori Blok Warga */}
              <div>
                <label className="block text-[11px] font-bold text-amber-900 mb-1">Kategori Blok:</label>
                <select
                  value={tunggakanBlokFilter}
                  onChange={(e) => setTunggakanBlokFilter(e.target.value)}
                  className="w-full p-2.5 rounded-xl bg-white border border-amber-300 text-stone-900 outline-none focus:ring-2 focus:ring-amber-400 text-xs font-semibold"
                >
                  <option value="semua">Semua Blok Warga</option>
                  {availableBloks.map((b) => (
                    <option key={b} value={b}>
                      {b}
                    </option>
                  ))}
                </select>
              </div>

              {/* Filter 4: Kategori Tarif Jimpitan */}
              <div>
                <label className="block text-[11px] font-bold text-amber-900 mb-1">Kategori Tarif:</label>
                <select
                  value={tunggakanTarifFilter}
                  onChange={(e) => setTunggakanTarifFilter(e.target.value as any)}
                  className="w-full p-2.5 rounded-xl bg-white border border-amber-300 text-stone-900 outline-none focus:ring-2 focus:ring-amber-400 text-xs font-semibold"
                >
                  <option value="semua">Semua Tarif</option>
                  <option value="reguler">Tarif Reguler (Rp {settings.defaultNominal || 1000}/hari)</option>
                  <option value="khusus_tinggi">
                    Tarif Khusus / Toko / Usaha (&gt; Rp {settings.defaultNominal || 1000})
                  </option>
                  <option value="khusus_rendah">
                    Tarif Subsidi (&lt; Rp {settings.defaultNominal || 1000})
                  </option>
                </select>
              </div>

              {/* Filter 5: Durasi Menunggak (Severity) */}
              <div>
                <label className="block text-[11px] font-bold text-amber-900 mb-1">Durasi Menunggak:</label>
                <select
                  value={tunggakanSeverityFilter}
                  onChange={(e) => setTunggakanSeverityFilter(e.target.value as any)}
                  className="w-full p-2.5 rounded-xl bg-white border border-amber-300 text-stone-900 outline-none focus:ring-2 focus:ring-amber-400 text-xs font-semibold"
                >
                  <option value="semua">Semua Durasi</option>
                  <option value="1_bulan">Tunggakan Baru (1 Bulan)</option>
                  <option value="2_3_bulan">Tunggakan Sedang (2 - 3 Bulan)</option>
                  <option value="lebih_3_bulan">Tunggakan Kritis (&gt; 3 Bulan)</option>
                </select>
              </div>

              {/* Filter 6: Rentang Nominal Hutang */}
              <div>
                <label className="block text-[11px] font-bold text-amber-900 mb-1">Rentang Nominal:</label>
                <select
                  value={tunggakanNominalRangeFilter}
                  onChange={(e) => setTunggakanNominalRangeFilter(e.target.value as any)}
                  className="w-full p-2.5 rounded-xl bg-white border border-amber-300 text-stone-900 outline-none focus:ring-2 focus:ring-amber-400 text-xs font-semibold"
                >
                  <option value="semua">Semua Nominal</option>
                  <option value="under_30k">&lt; Rp 30.000 (Ringan)</option>
                  <option value="30k_100k">Rp 30.000 - Rp 100.000 (Sedang)</option>
                  <option value="above_100k">&gt; Rp 100.000 (Besar)</option>
                </select>
              </div>

              {/* Filter 7: Kontak WhatsApp */}
              <div>
                <label className="block text-[11px] font-bold text-amber-900 mb-1">Kontak WhatsApp:</label>
                <select
                  value={tunggakanContactFilter}
                  onChange={(e) => setTunggakanContactFilter(e.target.value as any)}
                  className="w-full p-2.5 rounded-xl bg-white border border-amber-300 text-stone-900 outline-none focus:ring-2 focus:ring-amber-400 text-xs font-semibold"
                >
                  <option value="semua">Semua Warga</option>
                  <option value="ada_wa">Punya WhatsApp (Bisa Ditagih Online)</option>
                  <option value="tanpa_wa">Tanpa No. WhatsApp (Tagih Manual)</option>
                </select>
              </div>

              {/* Filter 8: Urutkan Berdasarkan */}
              <div>
                <label className="block text-[11px] font-bold text-amber-900 mb-1 flex items-center space-x-1">
                  <ArrowUpDown className="w-3.5 h-3.5 text-amber-700" />
                  <span>Urutkan:</span>
                </label>
                <select
                  value={tunggakanSortBy}
                  onChange={(e) => setTunggakanSortBy(e.target.value as any)}
                  className="w-full p-2.5 rounded-xl bg-white border border-amber-300 text-stone-900 outline-none focus:ring-2 focus:ring-amber-400 text-xs font-semibold"
                >
                  <option value="sisa_desc">Sisa Hutang Terbesar (Prioritas)</option>
                  <option value="sisa_asc">Sisa Hutang Terkecil</option>
                  <option value="bulan_desc">Jumlah Bulan Menunggak Terbanyak</option>
                  <option value="rumah_asc">Nomor Rumah (Urut)</option>
                  <option value="nama_asc">Nama Warga (A-Z)</option>
                </select>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* 4. Dynamic Filter Results Summary Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-3 rounded-2xl bg-amber-50/70 border border-amber-200 text-xs">
        <div className="flex items-center space-x-2 text-stone-700 font-semibold flex-wrap">
          <span>Menampilkan:</span>
          <strong className="text-stone-900">{filteredDebtorsSummary.count} Warga</strong>
          <span>• Sisa Piutang:</span>
          <strong className="text-rose-700 font-bold">{formatRupiah(filteredDebtorsSummary.totalSisa)}</strong>
          {tunggakanYearFilter !== 'semua' && (
            <span className="px-2 py-0.5 rounded-md bg-amber-200 text-amber-950 font-extrabold text-[10.5px]">
              Tahun {tunggakanYearFilter}
            </span>
          )}
        </div>

        {filteredDebtorsSummary.countWaSiap > 0 && (
          <div className="text-[11px] text-emerald-800 font-bold flex items-center space-x-1">
            <Phone className="w-3.5 h-3.5 text-emerald-600" />
            <span>{filteredDebtorsSummary.countWaSiap} Warga Siap Ditagih via WA</span>
          </div>
        )}
      </div>

      {/* 5. Daftar Kartu Piutang Warga */}
      <div className="space-y-3">
        {filteredDebtorsList.length === 0 ? (
          <div className="p-8 rounded-3xl bg-white border border-stone-200 text-center space-y-2">
            <CheckCircle2 className="w-10 h-10 text-emerald-500 mx-auto" />
            <h4 className="font-extrabold text-stone-800 text-sm">Tidak Ada Piutang / Tunggakan Ditemukan</h4>
            <p className="text-xs text-stone-500 max-w-md mx-auto">
              Tidak ada data warga yang sesuai dengan kriteria filter saat ini. Seluruh warga tercatat tertib atau filter terlalu spesifik.
            </p>
            {activeTunggakanFiltersCount > 0 && (
              <button
                type="button"
                onClick={handleResetTunggakanFilters}
                className="mt-2 px-3 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold transition-colors cursor-pointer"
              >
                Reset Semua Filter
              </button>
            )}
          </div>
        ) : (
          filteredDebtorsList.map((item) => {
            const hasSisa = item.sisaTunggakanLalu > 0;
            const isLunas = item.tunggakanBulanLalu > 0 && item.sisaTunggakanLalu === 0;
            const isMultiMonth = item.jumlahBulanTertunggak > 1;

            // Yearly filter specific calculations for this citizen card
            const selectedYearMonths = tunggakanYearFilter !== 'semua'
              ? item.rincianBulanLampau.filter((b) => String(b.year) === tunggakanYearFilter)
              : item.rincianBulanLampau;
            const selectedYearTotalKurang = selectedYearMonths.reduce((acc, curr) => acc + curr.kurangNominal, 0);

            return (
              <div
                key={item.warga.id}
                className={`p-4 rounded-3xl border transition-all shadow-2xs ${
                  hasSisa
                    ? isMultiMonth
                      ? 'bg-white border-amber-300 hover:border-amber-400 ring-1 ring-amber-100'
                      : 'bg-white border-stone-200 hover:border-amber-300'
                    : 'bg-emerald-50/40 border-emerald-200'
                }`}
              >
                {/* Header Row: Nama, Rumah & Sisa Hutang */}
                <div className="flex items-start justify-between gap-2 border-b border-stone-100 pb-2.5">
                  <div className="min-w-0">
                    <div className="flex items-center space-x-2 flex-wrap">
                      <h4 className="font-extrabold text-stone-900 text-sm truncate">{item.warga.nama}</h4>
                      <span className="px-2 py-0.5 rounded-md bg-stone-100 text-stone-800 text-[10px] font-bold border border-stone-200">
                        Rumah: {item.warga.nomorRumah || '-'}
                      </span>
                      {item.warga.blok && (
                        <span className="px-2 py-0.5 rounded-md bg-sky-50 text-sky-800 text-[10px] font-bold border border-sky-200">
                          {item.warga.blok}
                        </span>
                      )}
                      {isMultiMonth && hasSisa && (
                        <span className="px-2 py-0.5 rounded-full bg-rose-100 text-rose-800 text-[9.5px] font-black border border-rose-200">
                          {item.jumlahBulanTertunggak} Bulan
                        </span>
                      )}
                      {isLunas && (
                        <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[9.5px] font-black border border-emerald-200">
                          LUNAS
                        </span>
                      )}
                    </div>

                    <div className="flex items-center space-x-2 text-[11px] text-stone-500 mt-0.5">
                      <span>Tarif: Rp {(item.warga.nominalDefault || settings.defaultNominal || 1000).toLocaleString('id-ID')}/hari</span>
                      {item.warga.nomorHp && <span className="text-emerald-700 font-semibold">• WA: {item.warga.nomorHp}</span>}
                    </div>
                  </div>

                  {/* Sisa Tunggakan Amount Badge */}
                  <div className="text-right shrink-0">
                    <span className="text-[9.5px] font-bold uppercase tracking-wider text-stone-400 block">
                      Sisa Hutang
                    </span>
                    <div
                      className={`text-sm sm:text-base font-black font-sans ${
                        hasSisa ? 'text-rose-600' : 'text-emerald-700'
                      }`}
                    >
                      {formatRupiah(item.sisaTunggakanLalu)}
                    </div>
                    {item.pelunasanBulanIni > 0 && (
                      <span className="text-[10px] text-emerald-600 font-bold block">
                        +Terbayar: {formatRupiah(item.pelunasanBulanIni)}
                      </span>
                    )}
                  </div>
                </div>

                {/* Filter Year Highlight Alert if specific year chosen */}
                {tunggakanYearFilter !== 'semua' && selectedYearTotalKurang > 0 && (
                  <div className="mt-2.5 p-2 rounded-xl bg-amber-100/70 border border-amber-300 text-amber-950 text-xs font-bold flex items-center justify-between">
                    <span className="flex items-center space-x-1.5">
                      <Calendar className="w-3.5 h-3.5 text-amber-700" />
                      <span>Subtotal Hutang Tahun {tunggakanYearFilter}:</span>
                    </span>
                    <span className="text-rose-700 font-black">{formatRupiah(selectedYearTotalKurang)}</span>
                  </div>
                )}

                {/* Detail Bulan Tertunggak Pills */}
                {item.rincianBulanLampau.length > 0 && (
                  <div className="mt-2.5 space-y-1.5">
                    <div className="text-[10.5px] font-bold text-stone-500">Rincian Bulan Lampau:</div>
                    <div className="flex flex-wrap gap-1.5">
                      {item.rincianBulanLampau.map((rb) => {
                        const isThisYearFiltered = tunggakanYearFilter !== 'semua' && String(rb.year) === tunggakanYearFilter;
                        return (
                          <div
                            key={rb.yearMonth}
                            className={`px-2.5 py-1 rounded-xl text-[10.5px] font-bold border flex items-center space-x-1.5 ${
                              rb.kurangNominal > 0
                                ? isThisYearFiltered
                                  ? 'bg-amber-100 text-amber-950 border-amber-400 ring-2 ring-amber-300 font-black'
                                  : 'bg-rose-50 text-rose-800 border-rose-200'
                                : 'bg-emerald-50 text-emerald-800 border-emerald-200'
                            }`}
                          >
                            <span>{rb.monthLabel}:</span>
                            <span>{rb.kurangNominal > 0 ? formatRupiah(rb.kurangNominal) : 'Lunas'}</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Action Buttons: Pelunasan, Edit Sisa & WhatsApp */}
                {isAuthorized && (
                  <div className="mt-3 pt-2.5 border-t border-stone-100 flex items-center justify-between gap-2 flex-wrap">
                    <div className="flex items-center space-x-1.5">
                      {/* Tombol Pelunasan Cepat */}
                      {hasSisa && (
                        <button
                          type="button"
                          onClick={() => setSelectedWargaForPelunasan(item)}
                          className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center space-x-1 shadow-2xs transition-colors cursor-pointer"
                        >
                          <Coins className="w-3.5 h-3.5" />
                          <span>Bayar Pelunasan</span>
                        </button>
                      )}

                      {/* Tombol Koreksi / Edit Sisa Piutang */}
                      <button
                        type="button"
                        onClick={() => setSelectedWargaForEditPiutang(item)}
                        className="px-2.5 py-1.5 rounded-xl bg-stone-100 hover:bg-stone-200 text-stone-700 text-xs font-semibold transition-colors cursor-pointer"
                        title="Koreksi manual saldo awal piutang warga"
                      >
                        Koreksi Sisa
                      </button>
                    </div>

                    {/* Tombol Kirim Tagihan WhatsApp */}
                    {hasSisa && item.warga.nomorHp && (
                      <button
                        type="button"
                        onClick={() => handleOpenWhatsAppPenagihan(item)}
                        className="px-3 py-1.5 rounded-xl bg-green-600 hover:bg-green-500 text-white text-xs font-bold flex items-center space-x-1 shadow-2xs transition-colors cursor-pointer"
                        title="Kirim pesan penagihan langsung ke WhatsApp warga"
                      >
                        <MessageSquare className="w-3.5 h-3.5" />
                        <span>Kirim Tagihan WA</span>
                      </button>
                    )}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Pelunasan Modal */}
      {selectedWargaForPelunasan && (
        <BayarPelunasanTunggakanModal
          isOpen={Boolean(selectedWargaForPelunasan)}
          onClose={() => setSelectedWargaForPelunasan(null)}
          warga={selectedWargaForPelunasan.warga}
          tunggakanBulanLalu={selectedWargaForPelunasan.tunggakanBulanLalu}
          sisaTunggakanLalu={selectedWargaForPelunasan.sisaTunggakanLalu}
          prevMonthLabel={tunggakanRekap.prevMonthLabel}
          activeMonthLabel={tunggakanRekap.activeMonthLabel}
          onAddMutation={async (mut) => {
            onAddMutation(mut);
            setSelectedWargaForPelunasan(null);
          }}
          currentPetugas={currentPetugas}
          settings={settings}
        />
      )}

      {/* Edit Sisa Piutang Modal */}
      {selectedWargaForEditPiutang && onUpdateWarga && (
        <EditSisaPiutangModal
          isOpen={Boolean(selectedWargaForEditPiutang)}
          onClose={() => setSelectedWargaForEditPiutang(null)}
          warga={selectedWargaForEditPiutang.warga}
          detail={selectedWargaForEditPiutang}
          onUpdateWarga={(updated) => {
            onUpdateWarga(updated);
            setSelectedWargaForEditPiutang(null);
          }}
          onAddMutation={onAddMutation}
          settings={settings}
          currentPetugas={currentPetugas}
        />
      )}

      {/* Ekspor Laporan PDF Modal */}
      <LaporanTunggakanPdfModal
        isOpen={isTunggakanPdfModalOpen}
        onClose={() => setIsTunggakanPdfModalOpen(false)}
        wargaTunggakanList={tunggakanRekap.wargaListTunggakan}
        summary={tunggakanRekap.summary}
        settings={settings}
        activeMonthLabel={tunggakanRekap.activeMonthLabel}
        prevMonthLabel={tunggakanRekap.prevMonthLabel}
      />
    </div>
  );
};
