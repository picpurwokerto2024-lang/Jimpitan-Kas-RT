import React, { useState, useMemo } from 'react';
import { 
  BarChart3, 
  ArrowUpRight, 
  ArrowDownRight, 
  ArrowDown,
  TrendingUp,
  Coins,
  Wallet,
  Info,
  Calendar, 
  Plus, 
  Download, 
  Trash2, 
  Edit3,
  Share2, 
  FileSpreadsheet, 
  FileText, 
  Printer, 
  Search, 
  X, 
  Clock, 
  ChevronDown, 
  ShieldAlert, 
  Check, 
  Tag, 
  PieChart, 
  Layers, 
  Sparkles, 
  Coffee, 
  Wrench, 
  Lightbulb, 
  HeartHandshake 
} from 'lucide-react';
import { JimpitanRecord, KasMutation, ReguRonda, AppSettings, AppMode } from '../types';
import { formatRupiah, formatTanggalIndo, formatTanggalSingkat, getTodayDateIso } from '../utils/formatters';
import { AppTheme, AVAILABLE_THEMES } from '../utils/themeManager';
import { PdfReportModal } from './PdfReportModal';
import { JimpitanTrendChart } from './JimpitanTrendChart';

export interface CategoryPreset {
  id: string;
  name: string;
  icon: string;
  badgeBg: string;
  badgeText: string;
  badgeBorder: string;
  description: string;
  defaultNominal?: number;
  placeholder: string;
}

export const PENGELUARAN_CATEGORIES: CategoryPreset[] = [
  {
    id: 'konsumsi',
    name: 'Konsumsi Ronda',
    icon: '☕',
    badgeBg: 'bg-amber-50',
    badgeText: 'text-amber-800',
    badgeBorder: 'border-amber-200',
    description: 'Kopi, teh, gula, snack & konsumsi jaga malam',
    defaultNominal: 25000,
    placeholder: 'Contoh: Beli kopi, gula, & snack regu ronda',
  },
  {
    id: 'perbaikan',
    name: 'Perbaikan Alat',
    icon: '🔧',
    badgeBg: 'bg-blue-50',
    badgeText: 'text-blue-800',
    badgeBorder: 'border-blue-200',
    description: 'Servis senter, kentongan, kunci pos, jas hujan',
    defaultNominal: 35000,
    placeholder: 'Contoh: Ganti baterai senter & servis kentongan',
  },
  {
    id: 'kebersihan',
    name: 'Kebersihan',
    icon: '🧹',
    badgeBg: 'bg-emerald-50',
    badgeText: 'text-emerald-800',
    badgeBorder: 'border-emerald-200',
    description: 'Plastik sampah, sapu lidi, iuran kebersihan',
    defaultNominal: 20000,
    placeholder: 'Contoh: Beli plastik tempat sampah & sapu pos',
  },
  {
    id: 'penerangan',
    name: 'Penerangan Jalan',
    icon: '💡',
    badgeBg: 'bg-yellow-50',
    badgeText: 'text-yellow-800',
    badgeBorder: 'border-yellow-200',
    description: 'Lampu jalan RT, kabel, token listrik pos',
    defaultNominal: 50000,
    placeholder: 'Contoh: Beli 2 unit lampu LED jalan gang RT',
  },
  {
    id: 'sosial',
    name: 'Dana Sosial & Kematian',
    icon: '🤝',
    badgeBg: 'bg-purple-50',
    badgeText: 'text-purple-800',
    badgeBorder: 'border-purple-200',
    description: 'Santunan warga sakit / takziyah / musibah',
    defaultNominal: 100000,
    placeholder: 'Contoh: Santunan besuk warga sakit Blok A',
  },
  {
    id: 'operasional',
    name: 'Operasional & ATK RT',
    icon: '📁',
    badgeBg: 'bg-indigo-50',
    badgeText: 'text-indigo-800',
    badgeBorder: 'border-indigo-200',
    description: 'Buku kas, spidol, fotocopy surat warga',
    defaultNominal: 15000,
    placeholder: 'Contoh: Fotocopy undangan pertemuan & ATK',
  },
  {
    id: 'lainnya',
    name: 'Lain-lain',
    icon: '🏷️',
    badgeBg: 'bg-stone-100',
    badgeText: 'text-stone-700',
    badgeBorder: 'border-stone-300',
    description: 'Pengeluaran kas lainnya',
    defaultNominal: 20000,
    placeholder: 'Ketik keterangan pengeluaran kas...',
  },
];

export const PEMASUKAN_CATEGORIES: CategoryPreset[] = [
  {
    id: 'jimpitan',
    name: 'Jimpitan Masuk',
    icon: '💰',
    badgeBg: 'bg-emerald-50',
    badgeText: 'text-emerald-800',
    badgeBorder: 'border-emerald-200',
    description: 'Setoran jimpitan koin/kertas dari warga',
    placeholder: 'Contoh: Rekap setor jimpitan ronda',
  },
  {
    id: 'donasi',
    name: 'Donasi / Sumbangan Warga',
    icon: '🎁',
    badgeBg: 'bg-teal-50',
    badgeText: 'text-teal-800',
    badgeBorder: 'border-teal-200',
    description: 'Infaq / donasi sukarela dari warga',
    placeholder: 'Contoh: Donasi sukarela warga untuk pos ronda',
  },
  {
    id: 'iuran',
    name: 'Iuran Khusus RT',
    icon: '🪙',
    badgeBg: 'bg-sky-50',
    badgeText: 'text-sky-800',
    badgeBorder: 'border-sky-200',
    description: 'Iuran bulanan / kegiatan khusus warga',
    placeholder: 'Contoh: Iuran kegiatan HUT RI / kerja bakti',
  },
  {
    id: 'saldo_awal',
    name: 'Saldo Awal Kas',
    icon: '🏦',
    badgeBg: 'bg-violet-50',
    badgeText: 'text-violet-800',
    badgeBorder: 'border-violet-200',
    description: 'Saldo kas awal periode',
    placeholder: 'Contoh: Saldo kas bendahara periode sebelumnya',
  },
  {
    id: 'lainnya',
    name: 'Lain-lain',
    icon: '🏷️',
    badgeBg: 'bg-stone-100',
    badgeText: 'text-stone-700',
    badgeBorder: 'border-stone-300',
    description: 'Pemasukan kas lainnya',
    placeholder: 'Ketik keterangan pemasukan kas...',
  },
];

export const getCategoryBadge = (kategori: string, jenis: 'masuk' | 'keluar') => {
  const list = jenis === 'keluar' ? PENGELUARAN_CATEGORIES : PEMASUKAN_CATEGORIES;
  const match = list.find((c) => c.name.toLowerCase() === kategori.toLowerCase() || kategori.toLowerCase().includes(c.name.toLowerCase()));
  if (match) return match;
  return {
    id: 'custom',
    name: kategori,
    icon: jenis === 'masuk' ? '💰' : '🏷️',
    badgeBg: jenis === 'masuk' ? 'bg-emerald-50' : 'bg-rose-50',
    badgeText: jenis === 'masuk' ? 'text-emerald-800' : 'text-rose-800',
    badgeBorder: jenis === 'masuk' ? 'border-emerald-200' : 'border-rose-200',
    description: kategori,
    placeholder: '',
  };
};

interface KasRekapViewProps {
  allRecords: JimpitanRecord[];
  kasMutations: KasMutation[];
  onAddMutation: (mut: Omit<KasMutation, 'id' | 'createdAt'>) => void;
  onUpdateMutation?: (mut: KasMutation) => void;
  onDeleteMutation: (id: string) => void;
  onUpdateRecord?: (record: JimpitanRecord) => void;
  onDeleteRecord?: (id: string) => void;
  onDeleteSeptemberData?: () => void;
  onPurgeArchiveAndDemoData?: () => void;
  reguList: ReguRonda[];
  settings: AppSettings;
  selectedDate: string;
  onOpenShareModal?: (tab?: 'laporan' | 'pengingat') => void;
  onSelectDate?: (date: string) => void;
  onResetToToday?: () => void;
  isAdmin?: boolean;
  appMode?: AppMode;
  theme?: AppTheme;
}

export const KasRekapView: React.FC<KasRekapViewProps> = ({
  allRecords = [],
  kasMutations = [],
  onAddMutation,
  onUpdateMutation,
  onDeleteMutation,
  onUpdateRecord,
  onDeleteRecord,
  onDeleteSeptemberData,
  onPurgeArchiveAndDemoData,
  reguList = [],
  settings,
  selectedDate,
  onOpenShareModal,
  onSelectDate,
  onResetToToday,
  isAdmin = true,
  appMode = 'warga',
  theme = AVAILABLE_THEMES[0],
}) => {
  const liveToday = getTodayDateIso();
  const isPastDate = selectedDate !== liveToday;
  // Authorized if admin is explicitly unlocked OR app is in Petugas or Penginput mode
  const isAuthorized = isAdmin || appMode === 'petugas' || appMode === 'penginput';
  // Time period filter: 'hari_ini' | 'bulan_ini' | 'semua'
  const [periodFilter, setPeriodFilter] = useState<'hari_ini' | 'bulan_ini' | 'semua'>('hari_ini');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [isAddMutationOpen, setIsAddMutationOpen] = useState<boolean>(false);
  const [isPdfModalOpen, setIsPdfModalOpen] = useState<boolean>(false);
  const [editingMutation, setEditingMutation] = useState<KasMutation | null>(null);
  const [editingRecord, setEditingRecord] = useState<JimpitanRecord | null>(null);

  // Category filter state for mutation list
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState<string>('semua');

  // Form for new/editing Kas Mutation
  const [jenisMutasi, setJenisMutasi] = useState<'masuk' | 'keluar'>('keluar');
  const [nominalMutasi, setNominalMutasi] = useState<number>(25000);
  const [kategoriMutasi, setKategoriMutasi] = useState<string>('Konsumsi Ronda');
  const [customKategoriInput, setCustomKategoriInput] = useState<string>('');
  const [keteranganMutasi, setKeteranganMutasi] = useState<string>('');
  const [petugasMutasi, setPetugasMutasi] = useState<string>('');
  const [tanggalMutasi, setTanggalMutasi] = useState<string>(selectedDate);

  // Form for editing Jimpitan Record
  const [editRecNominal, setEditRecNominal] = useState<number>(1000);
  const [editRecStatus, setEditRecStatus] = useState<string>('sukses');
  const [editRecPetugas, setEditRecPetugas] = useState<string>('');
  const [editRecCatatan, setEditRecCatatan] = useState<string>('');

  // Total Kas Calculation (Akumulasi Saldo Awal + Total Masuk - Total Pengeluaran)
  const saldoAwalKas = Number(settings.saldoAwalKas) || 0;
  const totalPemasukanMutasi = kasMutations
    .filter((m) => m.jenis === 'masuk')
    .reduce((sum, m) => sum + m.nominal, 0);

  const totalPengeluaranMutasi = kasMutations
    .filter((m) => m.jenis === 'keluar')
    .reduce((sum, m) => sum + m.nominal, 0);

  const totalJimpitanAllTime = allRecords.reduce((sum, r) => sum + r.nominal, 0);
  const totalMasukAll = totalPemasukanMutasi + totalJimpitanAllTime;
  const saldoKasBersih = saldoAwalKas + totalMasukAll - totalPengeluaranMutasi;

  // Selected date components
  const [currYear, currMonth] = selectedDate.split('-');
  const currentYearMonth = `${currYear}-${currMonth}`;

  // Filter records based on selected period
  const filteredRecords = allRecords.filter((record) => {
    // Period filter
    if (periodFilter === 'hari_ini' && record.tanggal !== selectedDate) {
      return false;
    }
    if (periodFilter === 'bulan_ini' && !record.tanggal.startsWith(currentYearMonth)) {
      return false;
    }
    // Search query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchName = record.namaWarga.toLowerCase().includes(q);
      const matchNum = record.nomorRumah.toLowerCase().includes(q);
      const matchPetugas = record.petugas.toLowerCase().includes(q);
      const matchRegu = record.reguNama.toLowerCase().includes(q);
      if (!matchName && !matchNum && !matchPetugas && !matchRegu) {
        return false;
      }
    }
    return true;
  });

  const totalFilteredNominal = filteredRecords.reduce((sum, r) => sum + r.nominal, 0);

  // Period-aware Mutations
  const periodMutations = useMemo(() => {
    return kasMutations.filter((m) => {
      if (periodFilter === 'hari_ini' && m.tanggal !== selectedDate) return false;
      if (periodFilter === 'bulan_ini' && !m.tanggal.startsWith(currentYearMonth)) return false;
      return true;
    });
  }, [kasMutations, periodFilter, selectedDate, currentYearMonth]);

  // Expenditure Category Breakdown calculation
  const expenseCategoryBreakdown = useMemo(() => {
    const expenses = periodMutations.filter((m) => m.jenis === 'keluar');
    const totalExp = expenses.reduce((sum, m) => sum + m.nominal, 0);

    const groupMap: Record<string, { total: number; count: number; category: string }> = {};
    expenses.forEach((m) => {
      const cat = m.kategori || 'Lain-lain';
      if (!groupMap[cat]) {
        groupMap[cat] = { total: 0, count: 0, category: cat };
      }
      groupMap[cat].total += m.nominal;
      groupMap[cat].count += 1;
    });

    const items = Object.values(groupMap).map((item) => ({
      ...item,
      percentage: totalExp > 0 ? Math.round((item.total / totalExp) * 100) : 0,
      badge: getCategoryBadge(item.category, 'keluar'),
    }));

    // Sort by nominal descending
    items.sort((a, b) => b.total - a.total);
    return { items, totalExp };
  }, [periodMutations]);

  // Filtered mutations for display list (by category filter & search)
  const displayedMutations = useMemo(() => {
    return periodMutations.filter((m) => {
      if (selectedCategoryFilter !== 'semua') {
        if (selectedCategoryFilter === 'keluar_all' && m.jenis !== 'keluar') return false;
        if (selectedCategoryFilter === 'masuk_all' && m.jenis !== 'masuk') return false;
        if (selectedCategoryFilter !== 'keluar_all' && selectedCategoryFilter !== 'masuk_all') {
          if (m.kategori !== selectedCategoryFilter) return false;
        }
      }
      return true;
    });
  }, [periodMutations, selectedCategoryFilter]);

  // Export to CSV
  const handleExportCSV = () => {
    const headers = ['ID', 'Tanggal', 'Waktu', 'Nomor Rumah', 'Nama Warga', 'Nominal', 'Status', 'Petugas', 'Regu', 'Catatan'];
    const rows = (filteredRecords.length > 0 ? filteredRecords : allRecords).map((r) => [
      r.id,
      r.tanggal,
      r.waktu,
      r.nomorRumah,
      `"${r.namaWarga}"`,
      r.nominal,
      r.status,
      `"${r.petugas}"`,
      `"${r.reguNama}"`,
      `"${r.catatan || ''}"`,
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `rekap_jimpitan_${settings.namaRt.replace(/\s+/g, '_')}_${selectedDate}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const openEditMutation = (mut: KasMutation) => {
    if (!isAuthorized) {
      alert('Akses Ditolak: Edit mutasi kas RT hanya dapat dilakukan oleh Mode Petugas / Pengurus RT.');
      return;
    }
    setEditingMutation(mut);
    setJenisMutasi(mut.jenis);
    setNominalMutasi(mut.nominal);
    setKategoriMutasi(mut.kategori);
    setCustomKategoriInput(mut.kategori === 'Lain-lain' ? '' : mut.kategori);
    setKeteranganMutasi(mut.keterangan);
    setPetugasMutasi(mut.petugas || '');
    setTanggalMutasi(mut.tanggal);
    setIsAddMutationOpen(true);
  };

  const openAddMutation = (initialCategory?: string) => {
    if (!isAuthorized) {
      alert('Akses Ditolak: Pengeluaran dan pencatatan kas RT hanya dapat dilakukan oleh Mode Petugas / Pengurus RT.');
      return;
    }
    setEditingMutation(null);
    setJenisMutasi('keluar');
    const targetCat = initialCategory || 'Konsumsi Ronda';
    setKategoriMutasi(targetCat);
    const preset = PENGELUARAN_CATEGORIES.find((c) => c.name === targetCat);
    setNominalMutasi(preset?.defaultNominal || 25000);
    setKeteranganMutasi('');
    setCustomKategoriInput('');
    setPetugasMutasi('');
    setTanggalMutasi(selectedDate);
    setIsAddMutationOpen(true);
  };

  const handleSelectCategoryPreset = (preset: CategoryPreset) => {
    setKategoriMutasi(preset.name);
    if (!nominalMutasi || nominalMutasi === 25000) {
      if (preset.defaultNominal) setNominalMutasi(preset.defaultNominal);
    }
  };

  const openEditRecord = (record: JimpitanRecord) => {
    setEditingRecord(record);
    setEditRecNominal(record.nominal);
    setEditRecStatus(record.status);
    setEditRecPetugas(record.petugas || '');
    setEditRecCatatan(record.catatan || '');
  };

  const handleSaveMutation = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAuthorized) {
      alert('Akses Ditolak: Pengeluaran dan mutasi kas RT hanya dapat dilakukan oleh Mode Petugas / Pengurus RT.');
      return;
    }
    const finalCategory = (kategoriMutasi === 'Lain-lain' && customKategoriInput.trim()) 
      ? customKategoriInput.trim() 
      : kategoriMutasi;

    if (!nominalMutasi || !keteranganMutasi.trim()) {
      alert('Mohon isi nominal dan keterangan transaksi.');
      return;
    }

    if (editingMutation && onUpdateMutation) {
      onUpdateMutation({
        ...editingMutation,
        tanggal: tanggalMutasi,
        jenis: jenisMutasi,
        nominal: Number(nominalMutasi),
        kategori: finalCategory,
        keterangan: keteranganMutasi.trim(),
        petugas: petugasMutasi.trim() || undefined,
      });
    } else {
      onAddMutation({
        tanggal: tanggalMutasi || selectedDate,
        jenis: jenisMutasi,
        nominal: Number(nominalMutasi),
        kategori: finalCategory,
        keterangan: keteranganMutasi.trim(),
        petugas: petugasMutasi.trim() || undefined,
      });
    }

    setIsAddMutationOpen(false);
    setEditingMutation(null);
    setKeteranganMutasi('');
  };

  const handleSaveRecordEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingRecord || !onUpdateRecord) return;

    onUpdateRecord({
      ...editingRecord,
      nominal: Number(editRecNominal),
      status: editRecStatus,
      petugas: editRecPetugas.trim() || editingRecord.petugas,
      catatan: editRecCatatan.trim(),
    });

    setEditingRecord(null);
  };

  return (
    <div className="w-full space-y-4 pb-10" id="kas-rekap-view-root">
      {/* 1. TOP CARD: KAS JIMPITAN RT / RW (DYNAMIC THEME) */}
      <div className={`w-full rounded-3xl ${theme.cardGradient} text-white border ${theme.cardBorder} shadow-lg p-4 sm:p-5 space-y-4 transition-all duration-300`}>
        {/* Date Display */}
        <div className="flex items-center justify-end">
          <div className="flex items-center space-x-1.5 text-white/90 text-xs font-semibold">
            <Calendar className="w-4 h-4 text-white/80" />
            <span>{formatTanggalIndo(selectedDate)}</span>
          </div>
        </div>

        {/* Main Saldo Container */}
        <div className={`${theme.cardInnerBoxBg} backdrop-blur-md border ${theme.cardInnerBoxBorder} rounded-2xl p-3.5 sm:p-4 shadow-xs`}>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 sm:gap-3">
            <div className="flex items-center space-x-3">
              {/* Wallet Icon */}
              <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-xl bg-emerald-500 text-white flex items-center justify-center flex-shrink-0 shadow-xs">
                <Wallet className="w-5 h-5 sm:w-5.5 sm:h-5.5 stroke-[2.2]" />
              </div>

              <div className="min-w-0">
                {/* Header Row with Green Dot */}
                <div className="flex items-center space-x-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 inline-block flex-shrink-0" />
                  <span className="text-[11px] sm:text-xs font-bold uppercase tracking-wider text-white/90">
                    SALDO KAS BERSIH
                  </span>
                </div>

                {/* Big Amount */}
                <div className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight mt-0.5 font-sans">
                  Rp {saldoKasBersih.toLocaleString('id-ID')}
                </div>
              </div>
            </div>

            {/* Right Badge: Siap Pakai Lingkungan */}
            <div className="flex items-center self-start sm:self-center">
              <span className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-full bg-emerald-600/80 border border-emerald-400/40 text-white text-[11px] font-semibold shadow-xs">
                <Check className="w-3 h-3 text-emerald-200 stroke-[3]" />
                <span>Siap Pakai Lingkungan</span>
              </span>
            </div>
          </div>
        </div>

        {/* FINANCIAL SUMMARY BOXES */}
        <div className="grid grid-cols-3 gap-2 sm:gap-2.5">
          {/* Box 1: SALDO AWAL */}
          <div className={`${theme.cardInnerBoxBg} backdrop-blur-xs border ${theme.cardInnerBoxBorder} rounded-xl sm:rounded-2xl p-2.5 sm:p-3 space-y-1`}>
            <div className="flex items-center space-x-1.5">
              <div className="w-6 h-6 rounded-full bg-emerald-500 text-white flex items-center justify-center flex-shrink-0">
                <Coins className="w-3.5 h-3.5 stroke-[2.5]" />
              </div>
              <span className="text-[10px] sm:text-[11px] font-bold uppercase tracking-wider text-white/90 truncate">
                SALDO AWAL
              </span>
            </div>
            <div className="text-xs sm:text-sm md:text-base font-extrabold text-emerald-300 truncate pl-0.5">
              Rp {saldoAwalKas.toLocaleString('id-ID')}
            </div>
          </div>

          {/* Box 2: TOTAL MASUK */}
          <div className={`${theme.cardInnerBoxBg} backdrop-blur-xs border ${theme.cardInnerBoxBorder} rounded-xl sm:rounded-2xl p-2.5 sm:p-3 space-y-1`}>
            <div className="flex items-center space-x-1.5">
              <div className="w-6 h-6 rounded-full bg-amber-500 text-white flex items-center justify-center flex-shrink-0">
                <TrendingUp className="w-3.5 h-3.5 stroke-[2.5]" />
              </div>
              <span className="text-[10px] sm:text-[11px] font-bold uppercase tracking-wider text-white/90 truncate">
                TOTAL MASUK
              </span>
            </div>
            <div className="text-xs sm:text-sm md:text-base font-extrabold text-amber-300 truncate pl-0.5">
              +Rp {totalMasukAll.toLocaleString('id-ID')}
            </div>
          </div>

          {/* Box 3: PENGELUARAN */}
          <div className={`${theme.cardInnerBoxBg} backdrop-blur-xs border ${theme.cardInnerBoxBorder} rounded-xl sm:rounded-2xl p-2.5 sm:p-3 space-y-1`}>
            <div className="flex items-center space-x-1.5">
              <div className="w-6 h-6 rounded-full bg-rose-400 text-white flex items-center justify-center flex-shrink-0">
                <ArrowDown className="w-3.5 h-3.5 stroke-[2.5]" />
              </div>
              <span className="text-[10px] sm:text-[11px] font-bold uppercase tracking-wider text-white/90 truncate">
                PENGELUARAN
              </span>
            </div>
            <div className="text-xs sm:text-sm md:text-base font-extrabold text-rose-300 truncate pl-0.5">
              -Rp {totalPengeluaranMutasi.toLocaleString('id-ID')}
            </div>
          </div>
        </div>

        {/* Small Accumulation Notice Pill */}
        <div className="flex items-center justify-between text-[11px] text-white/80 pt-1.5 border-t border-white/10 flex-wrap gap-2">
          <div className="flex items-center space-x-1.5 min-w-0">
            <Info className="w-3.5 h-3.5 text-white/90 flex-shrink-0" />
            <span className="truncate">
              {saldoAwalKas > 0 
                ? `Termasuk Saldo Awal Rp ${saldoAwalKas.toLocaleString('id-ID')} yang diatur di Pengaturan.`
                : 'Saldo awal kas Rp 0. Dapat diatur kapan saja di Menu > Pengaturan.'}
            </span>
          </div>
          <span className="px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-900 text-[10px] font-bold flex-shrink-0">
            Akumulasi Aktif
          </span>
        </div>
      </div>

      {/* 2. RINCIAN PENGELUARAN PER KATEGORI (NEW FEATURE) */}
      <div className="bg-white rounded-3xl border border-stone-200 shadow-sm p-4 sm:p-5 space-y-3">
        <div className="flex items-center justify-between border-b border-stone-100 pb-2">
          <div className="flex items-center space-x-2">
            <div className="w-7 h-7 rounded-xl bg-amber-100 text-amber-800 flex items-center justify-center font-bold text-xs">
              <PieChart className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-stone-900 text-xs sm:text-sm">
                Pelabelan & Rincian Pengeluaran Kas
              </h3>
              <p className="text-[11px] text-stone-500">
                Alokasi dana per kategori ({periodFilter === 'hari_ini' ? 'Hari Ini' : periodFilter === 'bulan_ini' ? 'Bulan Ini' : 'Semua Data'})
              </p>
            </div>
          </div>

          {isAuthorized && (
            <button
              onClick={() => openAddMutation('Konsumsi Ronda')}
              className="px-2.5 py-1 rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 text-xs font-bold flex items-center space-x-1 cursor-pointer transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Tambah Belanja</span>
            </button>
          )}
        </div>

        {/* Quick Category Chips for Fast Entry / Direct Filter */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1.5 scrollbar-none text-xs">
          <button
            onClick={() => setSelectedCategoryFilter('semua')}
            className={`px-3 py-1.5 rounded-xl font-bold flex-shrink-0 border transition-all text-xs cursor-pointer ${
              selectedCategoryFilter === 'semua'
                ? 'bg-stone-900 text-white border-stone-900 shadow-2xs'
                : 'bg-stone-50 text-stone-700 border-stone-200 hover:bg-stone-100'
            }`}
          >
            Semua ({periodMutations.length})
          </button>

          {PENGELUARAN_CATEGORIES.map((cat) => {
            const isSelected = selectedCategoryFilter === cat.name;
            const matchStat = expenseCategoryBreakdown.items.find((i) => i.category === cat.name);
            return (
              <button
                key={cat.id}
                onClick={() => setSelectedCategoryFilter(isSelected ? 'semua' : cat.name)}
                className={`px-3 py-1.5 rounded-xl font-bold flex-shrink-0 border transition-all text-xs flex items-center space-x-1.5 cursor-pointer ${
                  isSelected
                    ? `${cat.badgeBg} ${cat.badgeText} ${cat.badgeBorder} ring-2 ring-amber-400 shadow-xs font-black`
                    : `${cat.badgeBg} ${cat.badgeText} ${cat.badgeBorder} hover:opacity-90`
                }`}
              >
                <span>{cat.icon}</span>
                <span>{cat.name}</span>
                {matchStat && matchStat.total > 0 && (
                  <span className="ml-1 text-[10px] px-1.5 py-0.2 rounded-full bg-white/80 font-extrabold">
                    {formatRupiah(matchStat.total)}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Progress Breakdown Bars per Category */}
        {expenseCategoryBreakdown.items.length === 0 ? (
          <div className="py-3 px-4 rounded-2xl bg-stone-50/80 border border-stone-200 text-center space-y-1">
            <p className="text-xs font-semibold text-stone-600">
              Belum ada pengeluaran kas pada periode ini.
            </p>
            <p className="text-[11px] text-stone-400">
              Gunakan tombol "Tambah Belanja" atau "Catat Kas" untuk mencatat Konsumsi Ronda, Perbaikan Alat, Kebersihan, dll.
            </p>
          </div>
        ) : (
          <div className="space-y-2 pt-1">
            <div className="flex items-center justify-between text-xs font-extrabold text-stone-700 pb-1">
              <span>Kategori Pengeluaran Terpakai:</span>
              <span className="text-rose-600">Total: {formatRupiah(expenseCategoryBreakdown.totalExp)}</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {expenseCategoryBreakdown.items.map((item) => (
                <div
                  key={item.category}
                  onClick={() => setSelectedCategoryFilter(selectedCategoryFilter === item.category ? 'semua' : item.category)}
                  className={`p-2.5 rounded-2xl border transition-all cursor-pointer ${
                    selectedCategoryFilter === item.category
                      ? 'bg-amber-50/70 border-amber-300 ring-2 ring-amber-200'
                      : 'bg-stone-50/60 border-stone-200 hover:bg-stone-50'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1 text-xs">
                    <span className="font-bold text-stone-900 flex items-center space-x-1.5">
                      <span>{item.badge.icon}</span>
                      <span>{item.category}</span>
                      <span className="text-[10px] font-normal text-stone-500">({item.count}x)</span>
                    </span>
                    <span className="font-black text-rose-600">
                      {formatRupiah(item.total)}
                    </span>
                  </div>

                  {/* Percentage Bar */}
                  <div className="w-full h-1.5 bg-stone-200 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-amber-500 to-rose-500 rounded-full"
                      style={{ width: `${Math.max(item.percentage, 5)}%` }}
                    />
                  </div>
                  <div className="flex justify-end text-[10px] text-stone-400 font-bold mt-0.5">
                    {item.percentage}% dari total pengeluaran
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Visualisasi Grafik Tren Pemasukan Jimpitan (Recharts) */}
      <JimpitanTrendChart
        allRecords={allRecords}
        selectedDate={selectedDate}
      />

      {/* 2. SEGMENTED FILTER BUTTONS: Hari Ini | Bulan Ini | Semua Waktu */}
      <div className="bg-white border border-sky-200 rounded-2xl p-1.5 flex items-center shadow-2xs">
        <button
          onClick={() => setPeriodFilter('hari_ini')}
          className={`flex-1 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer ${
            periodFilter === 'hari_ini'
              ? 'bg-sky-500 text-white shadow-xs'
              : 'text-stone-700 hover:text-sky-950'
          }`}
          id="btn-filter-hari-ini"
        >
          {isPastDate ? `Tgl: ${formatTanggalSingkat(selectedDate)}` : 'Hari Ini'}
        </button>

        <button
          onClick={() => setPeriodFilter('bulan_ini')}
          className={`flex-1 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer ${
            periodFilter === 'bulan_ini'
              ? 'bg-sky-500 text-white shadow-xs'
              : 'text-stone-700 hover:text-sky-950'
          }`}
          id="btn-filter-bulan-ini"
        >
          Bulan Ini
        </button>

        <button
          onClick={() => setPeriodFilter('semua')}
          className={`flex-1 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer ${
            periodFilter === 'semua'
              ? 'bg-sky-500 text-white shadow-xs'
              : 'text-stone-700 hover:text-sky-950'
          }`}
          id="btn-filter-semua-waktu"
        >
          Semua Waktu
        </button>
      </div>

      {/* When filtering by Day & viewing past date, show info note */}
      {periodFilter === 'hari_ini' && isPastDate && (
        <div className="p-3 bg-amber-50 border border-amber-300 rounded-2xl flex items-center justify-between gap-2 text-xs text-amber-950 shadow-2xs">
          <div className="flex items-center space-x-2">
            <Calendar className="w-4 h-4 text-amber-600 shrink-0" />
            <span>Rekap aktif untuk tanggal: <strong>{formatTanggalIndo(selectedDate)}</strong></span>
          </div>
          {onResetToToday && (
            <button
              onClick={onResetToToday}
              className="px-2.5 py-1 bg-amber-500 hover:bg-amber-600 text-white font-bold rounded-xl text-xs shrink-0 cursor-pointer shadow-2xs"
            >
              Ke Hari Ini
            </button>
          )}
        </div>
      )}

      {/* 3. SEARCH BAR & RECORDS SUMMARY BAR */}
      <div className="space-y-2">
        {/* Search Input */}
        <div className="relative">
          <Search className="w-4 h-4 text-stone-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Cari transaksi / warga..."
            className="w-full pl-10 pr-4 py-2.5 rounded-2xl bg-white border border-sky-200 text-stone-900 text-xs sm:text-sm outline-none focus:ring-2 focus:ring-sky-300 shadow-2xs placeholder:text-stone-400"
            id="input-cari-transaksi"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600 p-1"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Sub-row: Catatan Ditemukan & Total */}
        <div className="flex items-center justify-between px-1 text-xs">
          <span className="text-stone-500 font-medium">
            {filteredRecords.length} Catatan Ditemukan
          </span>
          <span className="font-extrabold text-stone-900">
            Total: Rp {totalFilteredNominal.toLocaleString('id-ID')}
          </span>
        </div>
      </div>

      {/* 5. MAIN RECORDS LIST CONTAINER */}
      <div className="bg-white rounded-3xl border border-sky-100 shadow-sm p-4 sm:p-5 min-h-[160px] flex flex-col justify-center">
        {filteredRecords.length === 0 ? (
          /* Empty state matching the screenshot */
          <div className="py-10 text-center text-stone-400 text-xs sm:text-sm font-medium">
            Belum ada data jimpitan untuk periode ini.
          </div>
        ) : (
          /* Render list of records */
          <div className="space-y-2.5 max-h-[460px] overflow-y-auto pr-1">
            {filteredRecords.map((record) => (
              <div
                key={record.id}
                className="p-3.5 rounded-2xl bg-stone-50/70 border border-stone-200/80 flex items-center justify-between gap-3 shadow-2xs hover:border-sky-300 transition-all"
              >
                <div className="flex items-center space-x-3 min-w-0">
                  <div className="w-10 h-10 rounded-xl bg-sky-100 text-sky-900 font-bold flex flex-col items-center justify-center flex-shrink-0">
                    <span className="text-[8px] uppercase">No</span>
                    <span className="text-xs font-extrabold">{record.nomorRumah}</span>
                  </div>

                  <div className="min-w-0">
                    <h4 className="font-bold text-stone-900 text-xs sm:text-sm truncate">
                      {record.namaWarga}
                    </h4>
                    <p className="text-[11px] text-stone-500 truncate">
                      {formatTanggalIndo(record.tanggal)} • {record.waktu} • {record.petugas}
                    </p>
                  </div>
                </div>

                <div className="flex items-center space-x-2 flex-shrink-0">
                  <div className="text-right">
                    <span className="font-extrabold text-sky-600 text-xs sm:text-sm block">
                      Rp {record.nominal.toLocaleString('id-ID')}
                    </span>
                    <span
                      className={`inline-block px-1.5 py-0.5 rounded-md text-[10px] font-bold ${
                        record.status === 'sukses'
                          ? 'bg-emerald-100 text-emerald-800'
                          : 'bg-rose-100 text-rose-800'
                      }`}
                    >
                      {record.status}
                    </span>
                  </div>

                  {isAuthorized && (
                    <div className="flex items-center space-x-1 pl-1 border-l border-stone-200">
                      <button
                        onClick={() => openEditRecord(record)}
                        className="p-1.5 rounded-lg text-stone-500 hover:text-sky-600 hover:bg-sky-50 transition-colors"
                        title="Edit Catatan Jimpitan"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                      </button>

                      <button
                        onClick={() => {
                          if (window.confirm(`Hapus catatan jimpitan Rumah No. ${record.nomorRumah} (${record.namaWarga})?`)) {
                            if (onDeleteRecord) onDeleteRecord(record.id);
                          }
                        }}
                        className="p-1.5 rounded-lg text-stone-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                        title="Hapus Catatan Jimpitan"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 6. BUKU KAS & PENGELUARAN SECTION (WITH LABELS & CATEGORIES) */}
      <div className="bg-white rounded-3xl border border-sky-100 shadow-sm p-4 sm:p-5 space-y-3">
        <div className="flex items-center justify-between border-b border-sky-50 pb-2">
          <div>
            <h3 className="font-bold text-stone-900 text-xs sm:text-sm">
              Buku Mutasi Kas & Pengeluaran RT
            </h3>
            <p className="text-[11px] text-stone-500">
              {displayedMutations.length} Transaksi ditampilkan {selectedCategoryFilter !== 'semua' && `(Filter Kategori: ${selectedCategoryFilter})`}
            </p>
          </div>

          {isAuthorized && (
            <button
              onClick={() => openAddMutation('Konsumsi Ronda')}
              className="px-3 py-1.5 rounded-xl bg-sky-500 hover:bg-sky-600 text-white text-xs font-bold flex items-center space-x-1 shadow-2xs cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Catat Kas</span>
            </button>
          )}
        </div>

        {displayedMutations.length === 0 ? (
          <p className="text-xs text-stone-400 py-3 text-center font-medium">
            Belum ada catatan mutasi kas pada filter kategori ini.
          </p>
        ) : (
          <div className="space-y-2 max-h-[340px] overflow-y-auto pr-1">
            {displayedMutations.map((mut) => {
              const badge = getCategoryBadge(mut.kategori, mut.jenis);
              return (
                <div
                  key={mut.id}
                  className="p-3 rounded-2xl bg-stone-50/70 border border-stone-200 flex items-center justify-between gap-3 shadow-2xs hover:border-sky-200 transition-all"
                >
                  <div className="flex items-center space-x-2.5 min-w-0">
                    <div
                      className={`w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 ${
                        mut.jenis === 'masuk'
                          ? 'bg-emerald-100 text-emerald-700'
                          : 'bg-rose-100 text-rose-700'
                      }`}
                    >
                      {mut.jenis === 'masuk' ? (
                        <ArrowUpRight className="w-4 h-4" />
                      ) : (
                        <ArrowDownRight className="w-4 h-4" />
                      )}
                    </div>

                    <div className="min-w-0">
                      <div className="flex items-center space-x-1.5 flex-wrap gap-y-1">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-lg border text-[10px] font-extrabold ${badge.badgeBg} ${badge.badgeText} ${badge.badgeBorder}`}>
                          <span className="mr-1">{badge.icon}</span>
                          <span>{mut.kategori}</span>
                        </span>
                        <h4 className="font-bold text-stone-900 text-xs truncate">
                          {mut.keterangan}
                        </h4>
                      </div>
                      <p className="text-[10px] text-stone-500 truncate mt-0.5">
                        {formatTanggalIndo(mut.tanggal)}
                        {mut.petugas && ` • PJ: ${mut.petugas}`}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center space-x-2 flex-shrink-0">
                    <span
                      className={`font-extrabold text-xs ${
                        mut.jenis === 'masuk' ? 'text-emerald-600' : 'text-rose-600'
                      }`}
                    >
                      {mut.jenis === 'masuk' ? '+' : '-'} {formatRupiah(mut.nominal)}
                    </span>

                    {isAuthorized && (
                      <div className="flex items-center space-x-1 pl-1 border-l border-stone-200">
                        <button
                          onClick={() => openEditMutation(mut)}
                          className="p-1 text-stone-500 hover:text-sky-600 hover:bg-sky-50 rounded-md transition-colors"
                          title="Edit Transaksi Mutasi Kas"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>

                        <button
                          onClick={() => {
                            if (window.confirm(`Hapus catatan mutasi kas "${mut.keterangan}" (${formatRupiah(mut.nominal)})?`)) {
                              onDeleteMutation(mut.id);
                            }
                          }}
                          className="p-1 text-stone-400 hover:text-rose-600 hover:bg-rose-50 rounded-md transition-colors"
                          title="Hapus Transaksi Kas"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Action Pembersihan Data Arsip & Demo (Khusus Pengurus RT / Admin SAJA, Dilarang untuk Mode Penginput) */}
        {isAdmin && appMode === 'petugas' && (
          <div className="pt-2 border-t border-stone-100 flex items-center justify-between flex-wrap gap-2">
            <span className="text-[11px] text-stone-500 font-semibold">Pembersihan Data:</span>
            <div className="flex items-center space-x-3">
              {onDeleteSeptemberData && (
                <button
                  type="button"
                  onClick={() => {
                    if (window.confirm('Hapus seluruh catatan jimpitan dan pengeluaran kas di bulan September?')) {
                      onDeleteSeptemberData();
                    }
                  }}
                  className="text-xs text-rose-600 hover:text-rose-800 font-bold flex items-center space-x-1 hover:underline cursor-pointer"
                  title="Hapus data transaksi khusus bulan September"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Data September</span>
                </button>
              )}

              {onPurgeArchiveAndDemoData && (
                <button
                  type="button"
                  onClick={() => {
                    if (window.confirm('PERINGATAN:\nBersihkan seluruh data arsip transaksi jimpitan, mutasi kas, sesi ronda, dan data demo?\n\n(Data pengaturan RT dan daftar warga asli tetap aman)')) {
                      onPurgeArchiveAndDemoData();
                    }
                  }}
                  className="text-xs text-rose-700 hover:text-rose-900 font-extrabold flex items-center space-x-1 px-2 py-0.5 rounded-lg bg-rose-50 border border-rose-200 hover:bg-rose-100 cursor-pointer"
                  title="Bersihkan semua transaksi demo dan riwayat arsip lama"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Bersihkan Arsip & Demo</span>
                </button>
              )}
            </div>
          </div>
        )}
      </div>

      {/* MODAL 1: ADD / EDIT MUTASI KAS WITH RICH CATEGORY LABELING */}
      {isAddMutationOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl border border-stone-200 shadow-2xl max-w-md w-full p-5 space-y-4 animate-in fade-in zoom-in-95 max-h-[92vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-stone-100 pb-2">
              <div className="flex items-center space-x-2">
                <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${jenisMutasi === 'keluar' ? 'bg-rose-100 text-rose-700' : 'bg-emerald-100 text-emerald-700'}`}>
                  {jenisMutasi === 'keluar' ? <ArrowDownRight className="w-4 h-4" /> : <ArrowUpRight className="w-4 h-4" />}
                </div>
                <h3 className="font-bold text-stone-900 text-base">
                  {editingMutation ? 'Edit Catatan Mutasi Kas' : 'Catat Kas & Pengeluaran RT'}
                </h3>
              </div>
              <button
                onClick={() => {
                  setIsAddMutationOpen(false);
                  setEditingMutation(null);
                }}
                className="p-1 rounded-xl text-stone-400 hover:text-stone-700"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveMutation} className="space-y-3.5">
              {/* Jenis Masuk / Keluar Toggle */}
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setJenisMutasi('keluar');
                    setKategoriMutasi('Konsumsi Ronda');
                  }}
                  className={`py-2 rounded-xl text-xs font-bold border transition-all ${
                    jenisMutasi === 'keluar'
                      ? 'bg-rose-500 text-white border-rose-600 shadow-xs'
                      : 'bg-stone-50 text-stone-700 border-stone-200 hover:bg-stone-100'
                  }`}
                >
                  Pengeluaran (Kas Keluar)
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setJenisMutasi('masuk');
                    setKategoriMutasi('Jimpitan Masuk');
                  }}
                  className={`py-2 rounded-xl text-xs font-bold border transition-all ${
                    jenisMutasi === 'masuk'
                      ? 'bg-emerald-600 text-white border-emerald-700 shadow-xs'
                      : 'bg-stone-50 text-stone-700 border-stone-200 hover:bg-stone-100'
                  }`}
                >
                  Pemasukan (Kas Masuk)
                </button>
              </div>

              {/* Quick Category Selection Chips (Visual Labeling) */}
              <div>
                <label className="block text-xs font-bold text-stone-800 mb-1.5 flex items-center justify-between">
                  <span>Pilih Pelabelan Kategori:</span>
                  <span className="text-[10px] font-normal text-stone-500">Pilih salah satu label</span>
                </label>

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5">
                  {(jenisMutasi === 'keluar' ? PENGELUARAN_CATEGORIES : PEMASUKAN_CATEGORIES).map((cat) => {
                    const isSelected = kategoriMutasi === cat.name;
                    return (
                      <button
                        type="button"
                        key={cat.id}
                        onClick={() => handleSelectCategoryPreset(cat)}
                        className={`p-2 rounded-xl border text-left transition-all text-xs flex items-center space-x-1.5 cursor-pointer ${
                          isSelected
                            ? `${cat.badgeBg} ${cat.badgeText} ${cat.badgeBorder} ring-2 ring-sky-500 font-extrabold shadow-xs`
                            : 'bg-stone-50 text-stone-700 border-stone-200 hover:bg-stone-100 font-medium'
                        }`}
                      >
                        <span className="text-sm">{cat.icon}</span>
                        <span className="truncate">{cat.name}</span>
                      </button>
                    );
                  })}
                </div>

                {/* Custom Category Input if 'Lain-lain' or custom is chosen */}
                {kategoriMutasi === 'Lain-lain' && (
                  <div className="mt-2 animate-in fade-in slide-in-from-top-1">
                    <input
                      type="text"
                      value={customKategoriInput}
                      onChange={(e) => setCustomKategoriInput(e.target.value)}
                      placeholder="Ketik nama kategori khusus (cth: Honor Petugas, THR, dll)..."
                      className="w-full px-3 py-2 rounded-xl bg-amber-50/50 border border-amber-300 text-stone-900 text-xs font-bold outline-none placeholder-stone-400 focus:border-amber-500"
                    />
                  </div>
                )}
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-bold text-stone-700 mb-1">
                    Tanggal Transaksi
                  </label>
                  <input
                    type="date"
                    required
                    value={tanggalMutasi}
                    onChange={(e) => setTanggalMutasi(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-stone-50 border border-stone-300 font-bold text-stone-900 text-xs outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-stone-700 mb-1">
                    Nominal (Rp) *
                  </label>
                  <input
                    type="number"
                    required
                    value={nominalMutasi}
                    onChange={(e) => setNominalMutasi(Number(e.target.value))}
                    step="1000"
                    className="w-full px-3 py-2 rounded-xl bg-stone-50 border border-stone-300 font-black text-stone-900 text-xs sm:text-sm outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-stone-700 mb-1">
                  Keterangan Singkat *
                </label>
                <input
                  type="text"
                  required
                  value={keteranganMutasi}
                  onChange={(e) => setKeteranganMutasi(e.target.value)}
                  placeholder={
                    (jenisMutasi === 'keluar' ? PENGELUARAN_CATEGORIES : PEMASUKAN_CATEGORIES).find((c) => c.name === kategoriMutasi)?.placeholder ||
                    'Misal: Beli kopi, gula, & snack regu ronda'
                  }
                  className="w-full px-3 py-2 rounded-xl bg-stone-50 border border-stone-300 text-stone-900 text-xs font-medium outline-none focus:border-sky-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-stone-600 mb-1">
                  Nama Petugas / Bendahara (Opsional)
                </label>
                <input
                  type="text"
                  value={petugasMutasi}
                  onChange={(e) => setPetugasMutasi(e.target.value)}
                  placeholder="Misal: Bpk. Joko (Bendahara RT)"
                  className="w-full px-3 py-2 rounded-xl bg-stone-50 border border-stone-300 text-stone-900 text-xs outline-none"
                />
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  className="w-full py-2.5 rounded-2xl bg-sky-500 hover:bg-sky-600 text-white font-extrabold text-xs tracking-wide shadow-md transition-all cursor-pointer"
                >
                  {editingMutation ? 'SIMPAN PERUBAHAN' : 'SIMPAN TRANSAKSI'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: EDIT CATATAN JIMPITAN WARGA */}
      {editingRecord && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl border border-stone-200 shadow-2xl max-w-sm w-full p-5 space-y-4 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-stone-100 pb-2">
              <h3 className="font-bold text-stone-900 text-base">
                Edit Catatan Jimpitan No. {editingRecord.nomorRumah}
              </h3>
              <button
                onClick={() => setEditingRecord(null)}
                className="p-1 rounded-xl text-stone-400 hover:text-stone-700"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveRecordEdit} className="space-y-3">
              <div className="p-3 rounded-2xl bg-sky-50 border border-sky-100">
                <p className="text-xs font-bold text-sky-950">{editingRecord.namaWarga}</p>
                <p className="text-[11px] text-stone-500">
                  Tanggal: {formatTanggalIndo(editingRecord.tanggal)} ({editingRecord.waktu})
                </p>
              </div>

              <div>
                <label className="block text-xs font-bold text-stone-700 mb-1">
                  Nominal Jimpitan (Rp)
                </label>
                <input
                  type="number"
                  required
                  value={editRecNominal}
                  onChange={(e) => setEditRecNominal(Number(e.target.value))}
                  step="500"
                  className="w-full px-3 py-2 rounded-xl bg-stone-50 border border-stone-300 font-bold text-stone-900 text-sm outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-stone-600 mb-1">
                  Status Penarikan
                </label>
                <select
                  value={editRecStatus}
                  onChange={(e) => setEditRecStatus(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-stone-50 border border-stone-300 text-stone-800 text-xs font-bold outline-none"
                >
                  <option value="sukses">Sukses (Ada Uang)</option>
                  <option value="kosong">Kosong (Tidak Ada Uang)</option>
                  <option value="titip">Titip (Dititipkan)</option>
                  <option value="lewat">Lewat (Dilewati Sementara)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-stone-600 mb-1">
                  Nama Petugas
                </label>
                <input
                  type="text"
                  value={editRecPetugas}
                  onChange={(e) => setEditRecPetugas(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-stone-50 border border-stone-300 text-stone-900 text-xs outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-stone-600 mb-1">
                  Catatan Khusus (Opsional)
                </label>
                <input
                  type="text"
                  value={editRecCatatan}
                  onChange={(e) => setEditRecCatatan(e.target.value)}
                  placeholder="Misal: Uang receh 500an"
                  className="w-full px-3 py-2 rounded-xl bg-stone-50 border border-stone-300 text-stone-900 text-xs outline-none"
                />
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  className="w-full py-2.5 rounded-2xl bg-sky-500 hover:bg-sky-600 text-white font-extrabold text-xs tracking-wide shadow-md transition-all cursor-pointer"
                >
                  SIMPAN PERUBAHAN JIMPITAN
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 3: PDF REPORT & CETAK LAPORAN RESMI RT */}
      <PdfReportModal
        isOpen={isPdfModalOpen}
        onClose={() => setIsPdfModalOpen(false)}
        allRecords={allRecords}
        kasMutations={kasMutations}
        settings={settings}
        selectedDate={selectedDate}
      />
    </div>
  );
};

