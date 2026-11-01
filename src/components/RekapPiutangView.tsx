import React, { useState, useMemo } from 'react';
import {
  AlertTriangle,
  Receipt,
  CheckCircle2,
  MessageSquare,
  Search,
  X,
  SlidersHorizontal,
  RotateCcw,
  Calendar,
  Filter,
  ArrowUpDown,
  Phone,
  FileText,
  Sparkles,
  Coins,
  Edit3,
  Check,
  ShieldAlert
} from 'lucide-react';
import { JimpitanRecord, KasMutation, Warga, AppSettings, AppMode } from '../types';
import { formatRupiah, formatTanggalIndo, cleanWhatsAppPhone } from '../utils/formatters';
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
  onResetAllPiutangToZero?: () => void;
  onRestoreAutoPiutang?: () => void;
  settings: AppSettings;
  selectedDate: string;
  isAdmin?: boolean;
  appMode?: AppMode;
  theme?: AppTheme;
  currentPetugas?: string;
  onNavigateToKas?: () => void;
}

type PiutangScopeMode = 'all_history' | 'single_prev_month' | 'include_active';

export const RekapPiutangView: React.FC<RekapPiutangViewProps> = ({
  allRecords = [],
  kasMutations = [],
  wargaList = [],
  onAddMutation,
  onUpdateWarga,
  onResetAllPiutangToZero,
  onRestoreAutoPiutang,
  settings,
  selectedDate,
  isAdmin = true,
  appMode = 'warga',
  theme: _theme = AVAILABLE_THEMES[0],
  currentPetugas = 'Petugas / Bendahara RT',
}) => {
  const isAuthorized = isAdmin || appMode === 'petugas' || appMode === 'penginput';

  // Scope calculation mode:
  // - 'all_history': Akumulasi seluruh bulan yang sudah lewat (< activeYearMonth)
  // - 'single_prev_month': Khusus 1 bulan lalu saja
  // - 'include_active': Akumulasi bulan lampau + kekurangan terhadap target penuh bulan berjalan (activeYearMonth)
  const [piutangScope, setPiutangScope] = useState<PiutangScopeMode>('all_history');
  const [isTunggakanFilterExpanded, setIsTunggakanFilterExpanded] = useState<boolean>(false);
  const [tunggakanSearchQuery, setTunggakanSearchQuery] = useState<string>('');

  // Specific Filters
  const [tunggakanStatusFilter, setTunggakanStatusFilter] = useState<'unpaid' | 'all' | 'multi_month' | 'paid'>('unpaid');
  const [tunggakanMonthFilter, setTunggakanMonthFilter] = useState<string>('semua');
  const [tunggakanYearFilter, setTunggakanYearFilter] = useState<string>('semua');
  const [tunggakanBlokFilter, setTunggakanBlokFilter] = useState<string>('semua');
  const [tunggakanTarifFilter, setTunggakanTarifFilter] = useState<'semua' | 'reguler' | 'khusus_tinggi' | 'khusus_rendah' | 'bebas'>('semua');
  const [tunggakanSeverityFilter, setTunggakanSeverityFilter] = useState<'semua' | '1_bulan' | '2_3_bulan' | 'lebih_3_bulan'>('semua');
  const [tunggakanNominalRangeFilter, setTunggakanNominalRangeFilter] = useState<'semua' | 'under_30k' | '30k_100k' | 'above_100k'>('semua');
  const [tunggakanContactFilter, setTunggakanContactFilter] = useState<'semua' | 'ada_wa' | 'tanpa_wa'>('semua');
  const [tunggakanSortBy, setTunggakanSortBy] = useState<'sisa_desc' | 'sisa_asc' | 'bulan_desc' | 'rumah_asc' | 'nama_asc'>('sisa_desc');

  // Modals & inline confirmation state
  const [selectedWargaForPelunasan, setSelectedWargaForPelunasan] = useState<WargaTunggakanDetail | null>(null);
  const [selectedWargaForEditPiutang, setSelectedWargaForEditPiutang] = useState<WargaTunggakanDetail | null>(null);
  const [isTunggakanPdfModalOpen, setIsTunggakanPdfModalOpen] = useState<boolean>(false);
  const [confirmBatchModal, setConfirmBatchModal] = useState<'restore_auto' | 'reset_zero' | null>(null);
  const [feedbackBanner, setFeedbackBanner] = useState<string>('');

  // Derive activeYearMonth from selectedDate
  const activeYearMonth = useMemo(() => {
    if (selectedDate && typeof selectedDate === 'string' && selectedDate.includes('-')) {
      const parts = selectedDate.split('-');
      return `${parts[0]}-${parts[1]}`;
    }
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  }, [selectedDate]);

  // Base calculator mode
  const calcMode = piutangScope === 'single_prev_month' ? 'single_prev_month' : 'all_history';

  // Tunggakan summary & debtor calculation
  const tunggakanRekap = useMemo(() => {
    return calculateTunggakanRekap(
      wargaList,
      allRecords,
      kasMutations,
      activeYearMonth,
      settings,
      calcMode
    );
  }, [wargaList, allRecords, kasMutations, activeYearMonth, settings, calcMode]);

  const includeActiveMonth = piutangScope === 'include_active';

  // Effective getters per resident based on selected scope
  const getEffectiveSisa = (item: WargaTunggakanDetail): number => {
    return includeActiveMonth ? item.totalKewajibanBersih : item.sisaTunggakanLalu;
  };

  const getEffectiveAwal = (item: WargaTunggakanDetail): number => {
    return includeActiveMonth
      ? item.tunggakanBulanLalu + item.kurangBulanIni
      : item.tunggakanBulanLalu;
  };

  const getEffectiveMonthsCount = (item: WargaTunggakanDetail): number => {
    return includeActiveMonth
      ? item.jumlahBulanTertunggak + (item.kurangBulanIni > 0 ? 1 : 0)
      : item.jumlahBulanTertunggak;
  };

  // Effective summary metrics for header KPIs and PDF export
  const effectiveSummary = useMemo(() => {
    const base = tunggakanRekap.summary;
    if (!includeActiveMonth) {
      return {
        ...base,
        periodeTitle:
          piutangScope === 'single_prev_month'
            ? tunggakanRekap.prevMonthLabel
            : tunggakanRekap.prevMonthLabel,
      };
    }

    const totalAwalGabungan = base.totalTunggakanBulanLalu + base.totalKurangBulanIni;
    const totalSisaGabungan = base.totalKewajibanGabungan;
    const persenGabungan =
      totalAwalGabungan > 0
        ? Math.min(100, Math.round((base.totalPelunasanBulanIni / totalAwalGabungan) * 100))
        : 100;

    return {
      ...base,
      totalWargaTertunggakLalu: base.totalWargaKewajibanGabungan,
      totalTunggakanBulanLalu: totalAwalGabungan,
      totalSisaTunggakanLalu: totalSisaGabungan,
      persenPelunasan: persenGabungan,
      totalBulanTeridentifikasi: base.totalBulanTeridentifikasi + 1,
      periodeTitle: `${
        base.totalBulanTeridentifikasi > 0 ? `${tunggakanRekap.prevMonthLabel} + ` : ''
      }${tunggakanRekap.activeMonthLabel}`,
    };
  }, [tunggakanRekap, includeActiveMonth, piutangScope]);

  // Available months & years for dropdown filters
  const availableFilterMonths = useMemo(() => {
    const map = new Map<string, string>();
    if (includeActiveMonth) {
      map.set(activeYearMonth, `${tunggakanRekap.activeMonthLabel} (Bulan Berjalan)`);
    }
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
  }, [tunggakanRekap, includeActiveMonth, activeYearMonth]);

  const availablePastYears = useMemo(() => {
    const yearsSet = new Set<string>();
    if (includeActiveMonth && activeYearMonth) {
      yearsSet.add(activeYearMonth.split('-')[0]);
    }
    tunggakanRekap.wargaListTunggakan.forEach((w) => {
      w.rincianBulanLampau.forEach((rb) => {
        const yr = String(rb.year);
        if (yr) yearsSet.add(yr);
      });
    });
    return Array.from(yearsSet).sort((a, b) => b.localeCompare(a));
  }, [tunggakanRekap, includeActiveMonth, activeYearMonth]);

  // Aggregate breakdown per year for quick year pills
  const yearlyTunggakanBreakdown = useMemo(() => {
    const map = new Map<string, { year: string; totalKurang: number; wargaIds: Set<string> }>();
    availablePastYears.forEach((y) => {
      map.set(y, { year: y, totalKurang: 0, wargaIds: new Set() });
    });

    const activeYr = activeYearMonth.split('-')[0];

    tunggakanRekap.wargaListTunggakan.forEach((w) => {
      w.rincianBulanLampau.forEach((rb) => {
        if (rb.isCoveredByCutoff) return;
        const yr = String(rb.year);
        if (map.has(yr) && rb.kurangNominal > 0) {
          const entry = map.get(yr)!;
          entry.totalKurang += rb.kurangNominal;
          entry.wargaIds.add(w.warga.id);
        }
      });

      if (includeActiveMonth && w.kurangBulanIni > 0 && map.has(activeYr)) {
        const entry = map.get(activeYr)!;
        entry.totalKurang += w.kurangBulanIni;
        entry.wargaIds.add(w.warga.id);
      }
    });

    return Array.from(map.values())
      .map((e) => ({
        year: e.year,
        totalKurang: e.totalKurang,
        wargaCount: e.wargaIds.size,
      }))
      .sort((a, b) => b.year.localeCompare(a.year));
  }, [availablePastYears, tunggakanRekap, includeActiveMonth, activeYearMonth]);

  const availableBloks = useMemo(() => {
    const bloks = new Set<string>();
    wargaList.forEach((w) => {
      if (w.blok && w.blok.trim()) {
        bloks.add(w.blok.trim());
      }
    });
    return Array.from(bloks).sort();
  }, [wargaList]);

  const baseDefaultTarif =
    typeof settings.defaultNominal === 'number' && settings.defaultNominal > 0
      ? settings.defaultNominal
      : 1000;

  const getResidentTarif = (w: Warga): number => {
    if (w.isActive === false) return 0;
    if (typeof w.nominalDefault === 'number') return Math.max(0, w.nominalDefault);
    return baseDefaultTarif;
  };

  // Status chip counts
  const statusCounts = useMemo(() => {
    let unpaid = 0;
    let multiMonth = 0;
    let paid = 0;
    tunggakanRekap.wargaListTunggakan.forEach((w) => {
      const sisa = includeActiveMonth ? w.totalKewajibanBersih : w.sisaTunggakanLalu;
      const awal = includeActiveMonth ? w.tunggakanBulanLalu + w.kurangBulanIni : w.tunggakanBulanLalu;
      const months = includeActiveMonth
        ? w.jumlahBulanTertunggak + (w.kurangBulanIni > 0 ? 1 : 0)
        : w.jumlahBulanTertunggak;

      if (sisa > 0) unpaid += 1;
      if (months > 1 && sisa > 0) multiMonth += 1;
      if (awal > 0 && sisa === 0) paid += 1;
    });
    return {
      unpaid,
      multiMonth,
      paid,
      all: tunggakanRekap.wargaListTunggakan.length,
    };
  }, [tunggakanRekap.wargaListTunggakan, includeActiveMonth]);

  // Filter and sort debtors list
  const filteredDebtorsList = useMemo(() => {
    const activeYr = activeYearMonth.split('-')[0];

    const list = tunggakanRekap.wargaListTunggakan.filter((item) => {
      const effSisa = includeActiveMonth ? item.totalKewajibanBersih : item.sisaTunggakanLalu;
      const effAwal = includeActiveMonth
        ? item.tunggakanBulanLalu + item.kurangBulanIni
        : item.tunggakanBulanLalu;
      const effMonths = includeActiveMonth
        ? item.jumlahBulanTertunggak + (item.kurangBulanIni > 0 ? 1 : 0)
        : item.jumlahBulanTertunggak;

      // 1. Search Query (Nama, Nomor Rumah, Blok, HP)
      const q = tunggakanSearchQuery.toLowerCase().trim();
      if (q) {
        const matchNama = item.warga.nama.toLowerCase().includes(q);
        const matchRumah = (item.warga.nomorRumah || '').toLowerCase().includes(q);
        const matchBlok = (item.warga.blok || '').toLowerCase().includes(q);
        const cleanQDigits = q.replace(/\D/g, '');
        const matchHp =
          cleanQDigits.length > 0 &&
          (item.warga.nomorHp || '').replace(/\D/g, '').includes(cleanQDigits);
        if (!matchNama && !matchRumah && !matchBlok && !matchHp) return false;
      }

      // 2. Status Filter
      if (tunggakanStatusFilter === 'unpaid' && effSisa <= 0) return false;
      if (tunggakanStatusFilter === 'multi_month' && (effMonths <= 1 || effSisa <= 0)) return false;
      if (tunggakanStatusFilter === 'paid' && (effAwal === 0 || effSisa > 0)) return false;

      // 3. Month Filter
      if (tunggakanMonthFilter !== 'semua') {
        if (includeActiveMonth && tunggakanMonthFilter === activeYearMonth) {
          if (item.kurangBulanIni <= 0) return false;
        } else {
          const monthArrears = item.rincianBulanLampau.find(
            (b) => b.yearMonth === tunggakanMonthFilter && !b.isCoveredByCutoff
          );
          if (!monthArrears || monthArrears.kurangNominal <= 0) return false;
        }
      }

      // 4. Year Filter
      if (tunggakanYearFilter !== 'semua') {
        const hasPastArrearsInYear = item.rincianBulanLampau.some(
          (b) => !b.isCoveredByCutoff && String(b.year) === tunggakanYearFilter && b.kurangNominal > 0
        );
        const hasActiveArrearsInYear =
          includeActiveMonth && activeYr === tunggakanYearFilter && item.kurangBulanIni > 0;
        if (!hasPastArrearsInYear && !hasActiveArrearsInYear) return false;
      }

      // 5. Blok Filter
      if (tunggakanBlokFilter !== 'semua') {
        if ((item.warga.blok || '').toLowerCase() !== tunggakanBlokFilter.toLowerCase()) return false;
      }

      // 6. Tarif Filter
      const residentNominal = getResidentTarif(item.warga);
      if (tunggakanTarifFilter === 'bebas' && residentNominal !== 0) return false;
      if (tunggakanTarifFilter === 'reguler' && residentNominal !== baseDefaultTarif) return false;
      if (tunggakanTarifFilter === 'khusus_tinggi' && residentNominal <= baseDefaultTarif) return false;
      if (
        tunggakanTarifFilter === 'khusus_rendah' &&
        (residentNominal === 0 || residentNominal >= baseDefaultTarif)
      ) {
        return false;
      }

      // 7. Severity (Durasi Menunggak)
      if (tunggakanSeverityFilter === '1_bulan' && effMonths !== 1) return false;
      if (tunggakanSeverityFilter === '2_3_bulan' && (effMonths < 2 || effMonths > 3)) return false;
      if (tunggakanSeverityFilter === 'lebih_3_bulan' && effMonths <= 3) return false;

      // 8. Nominal Range Filter
      if (tunggakanNominalRangeFilter === 'under_30k' && effSisa >= 30000) return false;
      if (tunggakanNominalRangeFilter === '30k_100k' && (effSisa < 30000 || effSisa > 100000)) return false;
      if (tunggakanNominalRangeFilter === 'above_100k' && effSisa <= 100000) return false;

      // 9. Contact Filter (WhatsApp)
      const hasPhone = Boolean(item.warga.nomorHp && cleanWhatsAppPhone(item.warga.nomorHp));
      if (tunggakanContactFilter === 'ada_wa' && !hasPhone) return false;
      if (tunggakanContactFilter === 'tanpa_wa' && hasPhone) return false;

      return true;
    });

    // 10. Sorting
    return list.sort((a, b) => {
      const sisaA = includeActiveMonth ? a.totalKewajibanBersih : a.sisaTunggakanLalu;
      const sisaB = includeActiveMonth ? b.totalKewajibanBersih : b.sisaTunggakanLalu;
      const monthsA = includeActiveMonth
        ? a.jumlahBulanTertunggak + (a.kurangBulanIni > 0 ? 1 : 0)
        : a.jumlahBulanTertunggak;
      const monthsB = includeActiveMonth
        ? b.jumlahBulanTertunggak + (b.kurangBulanIni > 0 ? 1 : 0)
        : b.jumlahBulanTertunggak;

      switch (tunggakanSortBy) {
        case 'sisa_desc':
          return (
            sisaB - sisaA ||
            a.warga.nomorRumah.localeCompare(b.warga.nomorRumah, undefined, { numeric: true })
          );
        case 'sisa_asc':
          return (
            sisaA - sisaB ||
            a.warga.nomorRumah.localeCompare(b.warga.nomorRumah, undefined, { numeric: true })
          );
        case 'bulan_desc':
          return monthsB - monthsA || sisaB - sisaA;
        case 'rumah_asc':
          return a.warga.nomorRumah.localeCompare(b.warga.nomorRumah, undefined, { numeric: true });
        case 'nama_asc':
          return a.warga.nama.localeCompare(b.warga.nama);
        default:
          return sisaB - sisaA;
      }
    });
  }, [
    tunggakanRekap.wargaListTunggakan,
    includeActiveMonth,
    activeYearMonth,
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
    baseDefaultTarif,
  ]);

  // Dynamic filter summary
  const filteredDebtorsSummary = useMemo(() => {
    let totalSisa = 0;
    let totalAwal = 0;
    let totalPelunasan = 0;
    let countTertunggak = 0;
    let countWaSiap = 0;

    filteredDebtorsList.forEach((w) => {
      const sisa = includeActiveMonth ? w.totalKewajibanBersih : w.sisaTunggakanLalu;
      const awal = includeActiveMonth
        ? w.tunggakanBulanLalu + w.kurangBulanIni
        : w.totalTunggakanKumulatif || w.tunggakanBulanLalu;
      totalSisa += sisa;
      totalAwal += awal;
      totalPelunasan += w.pelunasanBulanIni;
      if (sisa > 0) countTertunggak++;
      if (sisa > 0 && w.warga.nomorHp && cleanWhatsAppPhone(w.warga.nomorHp)) countWaSiap++;
    });

    return {
      count: filteredDebtorsList.length,
      countTertunggak,
      countWaSiap,
      totalSisa,
      totalAwal,
      totalPelunasan,
    };
  }, [filteredDebtorsList, includeActiveMonth]);

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

  // Build pure WhatsApp URL (avoids window.open / popup issues inside iframe)
  const buildWhatsAppPenagihanUrl = (detail: WargaTunggakanDetail): string | null => {
    const rawHp = detail.warga.nomorHp || '';
    const cleanHp = cleanWhatsAppPhone(rawHp);
    if (!cleanHp) return null;

    const effSisa = getEffectiveSisa(detail);
    const unpaidMonths = detail.rincianBulanLampau.filter(
      (b) => b.kurangNominal > 0 && !b.isCoveredByCutoff
    );

    const lines: string[] = [];
    unpaidMonths.forEach((b) => {
      const surplusNote =
        b.potonganSurplusNominal > 0
          ? ` [Target awal ${formatRupiah(b.targetMurniNominal)} dikurangi surplus -${formatRupiah(
              b.potonganSurplusNominal
            )}]`
          : '';
      lines.push(
        `• ${b.monthLabel}: Terbayar ${formatRupiah(b.terbayarNominal)} dari Target ${formatRupiah(
          b.targetNominal
        )}${surplusNote} (Kurang -${formatRupiah(b.kurangNominal)})`
      );
    });

    if (includeActiveMonth && detail.kurangBulanIni > 0) {
      const surplusNoteActive =
        detail.potonganSurplusBulanIni > 0
          ? ` [Target awal ${formatRupiah(
              detail.targetMurniBulanIni
            )} dikurangi surplus -${formatRupiah(detail.potonganSurplusBulanIni)}]`
          : '';
      lines.push(
        `• ${tunggakanRekap.activeMonthLabel} (Berjalan): Terbayar ${formatRupiah(
          detail.terbayarBulanIni
        )} dari Target ${formatRupiah(detail.targetBulanIni)}${surplusNoteActive} (Kurang -${formatRupiah(
          detail.kurangBulanIni
        )})`
      );
    }

    if (lines.length === 0) {
      lines.push(`• Kewajiban Periode Lampau (${tunggakanRekap.prevMonthLabel}): -${formatRupiah(effSisa)}`);
    }

    const pesan =
      `*PEMBERITAHUAN REKAP JIMPITAN RT*\n` +
      `Kepada Yth. Bpk/Ibu *${detail.warga.nama}* (No. Rumah ${detail.warga.nomorRumah || '-'}${
        detail.warga.blok ? `, ${detail.warga.blok}` : ''
      })\n\n` +
      `Salam hangat dari Pengurus ${settings.namaRt || 'RT 008'} / ${settings.namaRw || 'RW 006'}.\n` +
      `Berdasarkan pencatatan kas jimpitan s/d ${formatTanggalIndo(
        selectedDate
      )}, berikut rincian pembayaran jimpitan terhadap target bulanan:\n\n` +
      `${lines.join('\n')}\n\n` +
      `*Total Sisa Kewajiban Belum Lunas: ${formatRupiah(effSisa)}*\n\n` +
      `Pelunasan dapat dititipkan secara tunai melalui petugas ronda malam atau langsung ke Bendahara RT.\n\n` +
      `Terima kasih atas partisipasi & kebersamaannya dalam memajukan lingkungan kita bersama.\n` +
      `_Pengurus RT & Bendahara_`;

    return `https://wa.me/${cleanHp}?text=${encodeURIComponent(pesan)}`;
  };

  // List adapted for PDF export based on active scope
  const pdfWargaTunggakanList = useMemo(() => {
    if (!includeActiveMonth) return tunggakanRekap.wargaListTunggakan;
    return tunggakanRekap.wargaListTunggakan.map((item) => ({
      ...item,
      tunggakanBulanLalu: item.tunggakanBulanLalu + item.kurangBulanIni,
      sisaTunggakanLalu: item.totalKewajibanBersih,
    }));
  }, [tunggakanRekap.wargaListTunggakan, includeActiveMonth]);

  return (
    <div className="w-full space-y-4 pb-12" id="rekap-piutang-view-root">
      {/* Feedback Banner */}
      {feedbackBanner && (
        <div className="p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs font-bold flex items-center justify-between shadow-2xs animate-in fade-in duration-150">
          <div className="flex items-center space-x-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{feedbackBanner}</span>
          </div>
          <button
            type="button"
            onClick={() => setFeedbackBanner('')}
            className="p-1 rounded-lg hover:bg-emerald-100 text-emerald-700 cursor-pointer"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* 1. Header Banner */}
      <div className="bg-white rounded-3xl border border-amber-200/90 p-4 sm:p-5 shadow-xs space-y-3">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          <div className="flex items-center space-x-3">
            <div className="w-11 h-11 rounded-2xl bg-amber-500/15 border border-amber-300 text-amber-900 flex items-center justify-center shrink-0 shadow-2xs">
              <Receipt className="w-5 h-5 text-amber-700 stroke-[2.3]" />
            </div>
            <div>
              <div className="flex items-center space-x-2 flex-wrap gap-y-1">
                <span className="px-2.5 py-0.5 rounded-xl bg-amber-100/90 text-amber-900 text-[11px] font-black tracking-wide uppercase border border-amber-200">
                  REKAP PIUTANG & TARGET BULANAN
                </span>
                <span className="px-2 py-0.5 rounded-full bg-rose-100 text-rose-800 text-[10.5px] font-extrabold border border-rose-200">
                  {effectiveSummary.totalWargaTertunggakLalu} Rumah Belum Sesuai Target
                </span>
              </div>
              <h2 className="text-xl sm:text-2xl font-extrabold text-stone-900 tracking-tight font-sans mt-0.5">
                Daftar Rekap Hutang & Kekurangan Target Warga
              </h2>
            </div>
          </div>

          {/* Quick Action Buttons */}
          <div className="flex items-center gap-2 self-start lg:self-auto flex-wrap">
            {/* Scope Switcher: Semua Lampau | 1 Bulan Lalu | Termasuk Bulan Ini */}
            <div className="flex items-center bg-amber-50 p-1 rounded-xl border border-amber-200 text-[11px] flex-wrap">
              <button
                type="button"
                onClick={() => setPiutangScope('all_history')}
                className={`px-2.5 py-1 rounded-lg font-bold transition-all cursor-pointer ${
                  piutangScope === 'all_history'
                    ? 'bg-amber-600 text-white shadow-2xs'
                    : 'text-amber-900 hover:bg-amber-100'
                }`}
                title="Hitung akumulasi hutang warga dari seluruh bulan & tahun yang telah selesai"
              >
                Semua Lampau
              </button>
              <button
                type="button"
                onClick={() => setPiutangScope('single_prev_month')}
                className={`px-2.5 py-1 rounded-lg font-bold transition-all cursor-pointer ${
                  piutangScope === 'single_prev_month'
                    ? 'bg-amber-600 text-white shadow-2xs'
                    : 'text-amber-900 hover:bg-amber-100'
                }`}
                title={`Hanya hitung kekurangan target pada ${tunggakanRekap.prevMonthLabel}`}
              >
                1 Bulan Lalu
              </button>
              <button
                type="button"
                onClick={() => setPiutangScope('include_active')}
                className={`px-2.5 py-1 rounded-lg font-bold transition-all cursor-pointer ${
                  piutangScope === 'include_active'
                    ? 'bg-sky-700 text-white shadow-2xs'
                    : 'text-sky-900 hover:bg-sky-100/80'
                }`}
                title={`Sertakan kekurangan terhadap target penuh bulan berjalan (${tunggakanRekap.activeMonthLabel})`}
              >
                + Bulan Ini ({tunggakanRekap.activeMonthLabel.split(' ')[0]})
              </button>
            </div>

            {/* Tombol Hitung Otomatis Murni Target (Hapus Koreksi Manual Lama) */}
            {isAdmin && onRestoreAutoPiutang && (
              <button
                type="button"
                onClick={() => setConfirmBatchModal('restore_auto')}
                className="px-3 py-2 rounded-xl bg-sky-50 hover:bg-sky-100 text-sky-900 border border-sky-300 text-xs font-bold flex items-center space-x-1.5 shadow-2xs transition-colors cursor-pointer"
                title="Sinkronkan ulang semua warga agar murni dihitung otomatis dari selisih Target Bulanan dikurangi Pembayaran Jimpitan"
              >
                <Sparkles className="w-3.5 h-3.5 text-sky-700" />
                <span>Hitung Otomatis</span>
              </button>
            )}

            {/* Tombol Pemutihan Piutang (Default 0 Rupiah) */}
            {isAdmin && onResetAllPiutangToZero && (
              <button
                type="button"
                onClick={() => setConfirmBatchModal('reset_zero')}
                className="px-3 py-2 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-800 border border-rose-300 text-xs font-bold flex items-center space-x-1.5 shadow-2xs transition-colors cursor-pointer"
                title="Pemutihan: tetapkan saldo piutang periode sebelumnya menjadi Rp 0 untuk semua warga"
              >
                <RotateCcw className="w-3.5 h-3.5 text-rose-600" />
                <span>Pemutihan Rp 0</span>
              </button>
            )}

            {/* Ekspor PDF Tunggakan Button (Hidden in Warga Mode) */}
            {appMode !== 'warga' && (
              <button
                type="button"
                onClick={() => setIsTunggakanPdfModalOpen(true)}
                className="px-3 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold flex items-center space-x-1.5 shadow-xs transition-colors cursor-pointer"
                title="Cetak dan ekspor PDF resmi laporan piutang & pelunasan dengan tanda tangan"
              >
                <FileText className="w-4 h-4 text-amber-400" />
                <span>Ekspor PDF</span>
              </button>
            )}
          </div>
        </div>

        <p className="text-xs text-stone-600 leading-relaxed">
          Mencatat otomatis seluruh warga wajib jimpitan yang pembayarannya belum mencapai{' '}
          <strong>Target Nominal Bulanan</strong> pada{' '}
          {piutangScope === 'include_active'
            ? `periode lampau hingga bulan berjalan (${tunggakanRekap.activeMonthLabel})`
            : piutangScope === 'single_prev_month'
            ? `periode bulan lalu (${tunggakanRekap.prevMonthLabel})`
            : `seluruh bulan yang telah berlalu s/d ${tunggakanRekap.prevMonthLabel}`}
          . Kelebihan bayar (<strong>surplus</strong>) otomatis mengurangi target di bulan berikutnya, dan kavling kosong (Rp 0) dibebaskan dari target.
        </p>

        {/* Contextual Helper if Selected Date is the Earliest Recorded Month */}
        {!includeActiveMonth &&
          tunggakanRekap.summary.totalBulanTeridentifikasi === 0 &&
          tunggakanRekap.summary.totalWargaKurangBulanIni > 0 && (
            <div className="p-3 rounded-2xl bg-sky-50 border border-sky-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs text-sky-950">
              <div>
                <strong className="font-extrabold">Info Periode Kalender ({tunggakanRekap.activeMonthLabel}):</strong>{' '}
                Belum ada riwayat bulan sebelum {tunggakanRekap.activeMonthLabel}, namun terdapat{' '}
                <strong>{tunggakanRekap.summary.totalWargaKurangBulanIni} rumah</strong> yang belum memenuhi target penuh bulan{' '}
                {tunggakanRekap.activeMonthLabel} ({formatRupiah(tunggakanRekap.summary.totalKurangBulanIni)}).
              </div>
              <button
                type="button"
                onClick={() => setPiutangScope('include_active')}
                className="px-3 py-1.5 rounded-xl bg-sky-700 hover:bg-sky-800 text-white font-bold shrink-0 cursor-pointer transition-colors"
              >
                Tampilkan Target {tunggakanRekap.activeMonthLabel}
              </button>
            </div>
          )}
      </div>

      {/* 2. 4 Summary KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
        {/* Box 1: Sisa Hutang Belum Lunas */}
        <div className="p-3 sm:p-4 rounded-3xl bg-gradient-to-br from-rose-50 via-rose-50/70 to-white border border-rose-200/90 text-rose-950 shadow-2xs">
          <span className="text-[10px] sm:text-[11px] font-extrabold uppercase tracking-wider text-rose-700 block">
            {includeActiveMonth ? 'Total Kewajiban Bersih' : 'Sisa Hutang Belum Lunas'}
          </span>
          <div className="text-base sm:text-xl font-black text-rose-900 mt-1 truncate font-sans">
            {formatRupiah(effectiveSummary.totalSisaTunggakanLalu)}
          </div>
          <span className="text-[10px] text-rose-600 font-semibold block truncate mt-0.5">
            {includeActiveMonth
              ? `Lampau + sisa target ${tunggakanRekap.activeMonthLabel.split(' ')[0]}`
              : 'Total kekurangan target belum lunas'}
          </span>
        </div>

        {/* Box 2: Total Hutang Awal */}
        <div className="p-3 sm:p-4 rounded-3xl bg-gradient-to-br from-amber-50 via-amber-50/70 to-white border border-amber-200/90 text-amber-950 shadow-2xs">
          <span className="text-[10px] sm:text-[11px] font-extrabold uppercase tracking-wider text-amber-800 block">
            {includeActiveMonth ? 'Akumulasi Kurang Target' : 'Total Hutang Lampau'}
          </span>
          <div className="text-base sm:text-xl font-black text-amber-900 mt-1 truncate font-sans">
            -{formatRupiah(effectiveSummary.totalTunggakanBulanLalu)}
          </div>
          <span className="text-[10px] text-amber-700 font-semibold block truncate mt-0.5">
            {effectiveSummary.totalWargaTertunggakLalu} dari {effectiveSummary.totalWargaAktifWajib} rumah wajib
          </span>
        </div>

        {/* Box 3: Pelunasan Diterima Masuk Kas */}
        <div className="p-3 sm:p-4 rounded-3xl bg-gradient-to-br from-emerald-50 via-emerald-50/70 to-white border border-emerald-200/90 text-emerald-950 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-[10px] sm:text-[11px] font-extrabold uppercase tracking-wider text-emerald-700">
              Pelunasan Masuk
            </span>
            <span className="text-[10px] font-black px-1.5 py-0.5 rounded-full bg-emerald-200 text-emerald-900">
              {effectiveSummary.persenPelunasan}%
            </span>
          </div>
          <div className="text-base sm:text-xl font-black text-emerald-900 mt-1 truncate font-sans">
            +{formatRupiah(effectiveSummary.totalPelunasanBulanIni)}
          </div>
          <span className="text-[10px] text-emerald-700 font-semibold block truncate mt-0.5">
            Masuk kas {tunggakanRekap.activeMonthLabel}
          </span>
        </div>

        {/* Box 4: Periode Teridentifikasi / Target Bulan Berjalan */}
        <div className="p-3 sm:p-4 rounded-3xl bg-gradient-to-br from-sky-50 via-sky-50/70 to-white border border-sky-200/90 text-sky-950 shadow-2xs">
          <span className="text-[10px] sm:text-[11px] font-extrabold uppercase tracking-wider text-sky-700 block">
            {includeActiveMonth ? `Target ${tunggakanRekap.activeMonthLabel.split(' ')[0]}` : 'Periode Terdata'}
          </span>
          <div className="text-base sm:text-xl font-black text-sky-900 mt-1 truncate font-sans">
            {includeActiveMonth
              ? formatRupiah(effectiveSummary.totalTargetBulanIni)
              : `${effectiveSummary.totalBulanTeridentifikasi} Bulan`}
          </div>
          <span className="text-[10px] text-sky-700 font-semibold block truncate mt-0.5">
            {includeActiveMonth
              ? `Terbayar ${formatRupiah(effectiveSummary.totalTerbayarBulanIni)}`
              : `Hingga ${tunggakanRekap.prevMonthLabel}`}
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
                type="button"
                onClick={() => setTunggakanSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600 p-0.5 cursor-pointer"
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
            Belum Sesuai Target / Hutang ({statusCounts.unpaid})
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
            &gt; 1 Bulan ({statusCounts.multiMonth})
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
            Telah Dilunasi ({statusCounts.paid})
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
            Semua Warga ({statusCounts.all})
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
                  {yrData.wargaCount} Rumah • {formatRupiah(yrData.totalKurang)}
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
                className="text-xs font-bold text-rose-700 hover:underline flex items-center space-x-1 cursor-pointer"
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
                  <option value="semua">Semua Bulan</option>
                  {availableFilterMonths.map((m) => (
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
                  <option value="reguler">Tarif Reguler (Rp {baseDefaultTarif.toLocaleString('id-ID')}/hari)</option>
                  <option value="khusus_tinggi">
                    Tarif Khusus / Usaha (&gt; Rp {baseDefaultTarif.toLocaleString('id-ID')})
                  </option>
                  <option value="khusus_rendah">
                    Tarif Subsidi (&lt; Rp {baseDefaultTarif.toLocaleString('id-ID')})
                  </option>
                  <option value="bebas">Tanah Kosong / Bebas Target (Rp 0)</option>
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
          <span>• Sisa Kewajiban:</span>
          <strong className="text-rose-700 font-bold">{formatRupiah(filteredDebtorsSummary.totalSisa)}</strong>
          {tunggakanYearFilter !== 'semua' && (
            <span className="px-2 py-0.5 rounded-md bg-amber-200 text-amber-950 font-extrabold text-[10.5px]">
              Tahun {tunggakanYearFilter}
            </span>
          )}
          {includeActiveMonth && (
            <span className="px-2 py-0.5 rounded-md bg-sky-200 text-sky-950 font-extrabold text-[10.5px]">
              Termasuk {tunggakanRekap.activeMonthLabel}
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
            <h4 className="font-extrabold text-stone-800 text-sm">Tidak Ada Hutang / Kekurangan Target Ditemukan</h4>
            <p className="text-xs text-stone-500 max-w-md mx-auto">
              Seluruh warga pada cakupan ini telah memenuhi target pembayaran bulanan atau kriteria filter saat ini sedang spesifik.
            </p>
            <div className="flex items-center justify-center gap-2 pt-1 flex-wrap">
              {activeTunggakanFiltersCount > 0 && (
                <button
                  type="button"
                  onClick={handleResetTunggakanFilters}
                  className="px-3 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold transition-colors cursor-pointer"
                >
                  Reset Semua Filter
                </button>
              )}
              {!includeActiveMonth && tunggakanRekap.summary.totalWargaKurangBulanIni > 0 && (
                <button
                  type="button"
                  onClick={() => setPiutangScope('include_active')}
                  className="px-3 py-1.5 rounded-xl bg-sky-700 hover:bg-sky-800 text-white text-xs font-bold transition-colors cursor-pointer"
                >
                  Lihat Target Bulan Berjalan ({tunggakanRekap.activeMonthLabel})
                </button>
              )}
            </div>
          </div>
        ) : (
          filteredDebtorsList.map((item) => {
            const effSisa = getEffectiveSisa(item);
            const effAwal = getEffectiveAwal(item);
            const effMonths = getEffectiveMonthsCount(item);
            const hasSisa = effSisa > 0;
            const isLunas = effAwal > 0 && effSisa === 0;
            const isMultiMonth = effMonths > 1;
            const residentTarif = getResidentTarif(item.warga);
            const isExempt = residentTarif === 0 || item.warga.isActive === false;
            const waUrl = hasSisa ? buildWhatsAppPenagihanUrl(item) : null;

            // Yearly filter specific calculations for this citizen card
            const selectedYearMonths =
              tunggakanYearFilter !== 'semua'
                ? item.rincianBulanLampau.filter(
                    (b) => !b.isCoveredByCutoff && String(b.year) === tunggakanYearFilter
                  )
                : item.rincianBulanLampau.filter((b) => !b.isCoveredByCutoff);
            const activeYearMatches =
              includeActiveMonth &&
              (tunggakanYearFilter === 'semua' || activeYearMonth.startsWith(tunggakanYearFilter));
            const selectedYearTotalKurang =
              selectedYearMonths.reduce((acc, curr) => acc + curr.kurangNominal, 0) +
              (activeYearMatches ? item.kurangBulanIni : 0);

            return (
              <div
                key={item.warga.id}
                className={`p-4 rounded-3xl border transition-all shadow-2xs ${
                  isExempt
                    ? 'bg-stone-50/70 border-stone-200'
                    : hasSisa
                    ? isMultiMonth
                      ? 'bg-white border-amber-300 hover:border-amber-400 ring-1 ring-amber-100'
                      : 'bg-white border-stone-200 hover:border-amber-300'
                    : 'bg-emerald-50/40 border-emerald-200'
                }`}
              >
                {/* Header Row: Nama, Rumah & Sisa Hutang */}
                <div className="flex items-start justify-between gap-2 border-b border-stone-100 pb-2.5">
                  <div className="min-w-0">
                    <div className="flex items-center space-x-2 flex-wrap gap-y-1">
                      <h4 className="font-extrabold text-stone-900 text-sm truncate">{item.warga.nama}</h4>
                      <span className="px-2 py-0.5 rounded-md bg-stone-100 text-stone-800 text-[10px] font-bold border border-stone-200">
                        Rumah: {item.warga.nomorRumah || '-'}
                      </span>
                      {item.warga.blok && (
                        <span className="px-2 py-0.5 rounded-md bg-sky-50 text-sky-800 text-[10px] font-bold border border-sky-200">
                          {item.warga.blok}
                        </span>
                      )}
                      {isExempt && (
                        <span className="px-2 py-0.5 rounded-full bg-stone-200 text-stone-700 text-[9.5px] font-black border border-stone-300">
                          Bebas Target (Rp 0)
                        </span>
                      )}
                      {isMultiMonth && hasSisa && (
                        <span className="px-2 py-0.5 rounded-full bg-rose-100 text-rose-800 text-[9.5px] font-black border border-rose-200">
                          {effMonths} Bulan
                        </span>
                      )}
                      {isLunas && (
                        <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[9.5px] font-black border border-emerald-200">
                          LUNAS
                        </span>
                      )}
                      {item.isManualOverride && (
                        <span
                          className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-900 text-[9.5px] font-black border border-amber-300 flex items-center space-x-1"
                          title={item.catatanKoreksiPiutang || 'Piutang telah disesuaikan manual oleh Admin'}
                        >
                          <Edit3 className="w-3 h-3 text-amber-700" />
                          <span>Koreksi Admin</span>
                        </span>
                      )}
                    </div>

                    <div className="flex items-center space-x-2 text-[11px] text-stone-500 mt-0.5 flex-wrap">
                      <span>
                        Tarif:{' '}
                        {isExempt
                          ? 'Rp 0/hari (Kavling/Nonaktif)'
                          : `Rp ${residentTarif.toLocaleString('id-ID')}/hari`}
                      </span>
                      {item.warga.nomorHp && (
                        <span className="text-emerald-700 font-semibold">• WA: {item.warga.nomorHp}</span>
                      )}
                      {item.isManualOverride && item.catatanKoreksiPiutang && (
                        <span className="text-amber-800 text-[10.5px] font-medium italic block w-full mt-0.5">
                          Ket: {item.catatanKoreksiPiutang}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Sisa Tunggakan Amount Badge */}
                  <div className="text-right shrink-0">
                    <span className="text-[9.5px] font-bold uppercase tracking-wider text-stone-400 block">
                      {includeActiveMonth ? 'Sisa Kewajiban' : 'Sisa Hutang'}
                    </span>
                    <div
                      className={`text-sm sm:text-base font-black font-sans ${
                        isExempt ? 'text-stone-500' : hasSisa ? 'text-rose-600' : 'text-emerald-700'
                      }`}
                    >
                      {formatRupiah(effSisa)}
                    </div>
                    {item.pelunasanBulanIni > 0 && (
                      <span className="text-[10px] text-emerald-600 font-bold block">
                        +Pelunasan: {formatRupiah(item.pelunasanBulanIni)}
                      </span>
                    )}
                    {item.potonganSurplusBulanIni > 0 && (
                      <span
                        className="text-[10px] text-sky-700 font-bold block"
                        title={`Surplus bulan lalu mengurangi target ${tunggakanRekap.activeMonthLabel} dari ${formatRupiah(
                          item.targetMurniBulanIni
                        )} menjadi ${formatRupiah(item.targetBulanIni)}`}
                      >
                        Surplus -{formatRupiah(item.potonganSurplusBulanIni)} di {tunggakanRekap.activeMonthLabel.split(' ')[0]}
                      </span>
                    )}
                  </div>
                </div>

                {/* Filter Year Highlight Alert if specific year chosen */}
                {tunggakanYearFilter !== 'semua' && selectedYearTotalKurang > 0 && (
                  <div className="mt-2.5 p-2 rounded-xl bg-amber-100/70 border border-amber-300 text-amber-950 text-xs font-bold flex items-center justify-between">
                    <span className="flex items-center space-x-1.5">
                      <Calendar className="w-3.5 h-3.5 text-amber-700" />
                      <span>Subtotal Kurang Target Tahun {tunggakanYearFilter}:</span>
                    </span>
                    <span className="text-rose-700 font-black">{formatRupiah(selectedYearTotalKurang)}</span>
                  </div>
                )}

                {/* Rincian Target vs Pembayaran Per Bulan */}
                {!isExempt && (item.rincianBulanLampau.length > 0 || includeActiveMonth) && (
                  <div className="mt-2.5 space-y-1.5">
                    <div className="text-[10.5px] font-bold text-stone-500">
                      Rincian Target &amp; Pembayaran Bulanan:
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                      {includeActiveMonth && (
                        <div
                          className={`px-3 py-2 rounded-xl text-[11px] border flex items-center justify-between gap-2 ${
                            item.kurangBulanIni > 0
                              ? 'bg-sky-50/90 text-sky-950 border-sky-300'
                              : 'bg-emerald-50 text-emerald-900 border-emerald-200'
                          }`}
                        >
                          <div className="min-w-0">
                            <span className="font-extrabold block truncate">
                              {tunggakanRekap.activeMonthLabel} (Berjalan)
                            </span>
                            <span className="text-[10px] text-stone-600 block">
                              Target {formatRupiah(item.targetBulanIni)}
                              {item.potonganSurplusBulanIni > 0
                                ? ` (Potong Surplus -${formatRupiah(item.potonganSurplusBulanIni)})`
                                : ''}{' '}
                              • Masuk {formatRupiah(item.terbayarBulanIni)}
                            </span>
                          </div>
                          <span
                            className={`font-black shrink-0 ${
                              item.kurangBulanIni > 0 ? 'text-rose-700' : 'text-emerald-700'
                            }`}
                          >
                            {item.kurangBulanIni > 0
                              ? `-${formatRupiah(item.kurangBulanIni)}`
                              : item.lebihBulanIni > 0
                              ? `+Surplus ${formatRupiah(item.lebihBulanIni)}`
                              : 'Lunas'}
                          </span>
                        </div>
                      )}

                      {item.rincianBulanLampau.map((rb) => {
                        const isThisYearFiltered =
                          tunggakanYearFilter !== 'semua' && String(rb.year) === tunggakanYearFilter;
                        const effectiveKurang = rb.isCoveredByCutoff ? 0 : rb.kurangNominal;

                        return (
                          <div
                            key={rb.yearMonth}
                            className={`px-3 py-2 rounded-xl text-[11px] border flex items-center justify-between gap-2 ${
                              effectiveKurang > 0
                                ? isThisYearFiltered
                                  ? 'bg-amber-100 text-amber-950 border-amber-400 ring-1 ring-amber-300'
                                  : 'bg-rose-50/80 text-rose-950 border-rose-200'
                                : 'bg-emerald-50/80 text-emerald-900 border-emerald-200'
                            }`}
                          >
                            <div className="min-w-0">
                              <span className="font-extrabold block truncate">
                                {rb.monthLabel} ({rb.daysInMonth} hr)
                              </span>
                              <span className="text-[10px] text-stone-600 block">
                                Target {formatRupiah(rb.targetNominal)}
                                {rb.potonganSurplusNominal > 0
                                  ? ` (-Surplus ${formatRupiah(rb.potonganSurplusNominal)})`
                                  : ''}{' '}
                                • Masuk {formatRupiah(rb.terbayarNominal)}
                              </span>
                            </div>
                            <span
                              className={`font-black shrink-0 ${
                                effectiveKurang > 0 ? 'text-rose-700' : 'text-emerald-700'
                              }`}
                            >
                              {rb.isCoveredByCutoff && rb.kurangNominal > 0
                                ? 'Pemutihan'
                                : effectiveKurang > 0
                                ? `-${formatRupiah(effectiveKurang)}`
                                : rb.lebihNominal > 0
                                ? `+Surplus ${formatRupiah(rb.lebihNominal)}`
                                : 'Lunas'}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Action Buttons: Pelunasan, Edit Sisa & WhatsApp */}
                {isAuthorized && !isExempt && (
                  <div className="mt-3 pt-2.5 border-t border-stone-100 flex items-center justify-between gap-2 flex-wrap">
                    <div className="flex items-center space-x-1.5 flex-wrap gap-y-1">
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

                      {/* Tombol Edit / Koreksi Piutang (Admin) */}
                      {onUpdateWarga && (
                        <button
                          type="button"
                          onClick={() => setSelectedWargaForEditPiutang(item)}
                          className="px-3 py-1.5 rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-300 text-xs font-bold flex items-center space-x-1 shadow-2xs transition-colors cursor-pointer"
                          title="Edit, ubah nominal, beri diskon/keringanan, atau sesuaikan piutang warga"
                        >
                          <Edit3 className="w-3.5 h-3.5 text-amber-700" />
                          <span>Edit Piutang</span>
                        </button>
                      )}
                    </div>

                    {/* Tombol Kirim Tagihan WhatsApp */}
                    {hasSisa && waUrl && (
                      <a
                        href={waUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-3 py-1.5 rounded-xl bg-green-600 hover:bg-green-500 text-white text-xs font-bold flex items-center space-x-1 shadow-2xs transition-colors cursor-pointer"
                        title="Kirim rincian kekurangan target langsung ke WhatsApp warga"
                      >
                        <MessageSquare className="w-3.5 h-3.5" />
                        <span>Kirim Tagihan WA</span>
                      </a>
                    )}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Inline Batch Confirmation Modal (No window.confirm / alert) */}
      {confirmBatchModal && (
        <div className="fixed inset-0 z-50 bg-stone-900/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150">
          <div className="bg-white rounded-3xl max-w-md w-full border border-stone-200 shadow-2xl overflow-hidden">
            <div
              className={`px-5 py-4 border-b flex items-center justify-between ${
                confirmBatchModal === 'restore_auto'
                  ? 'bg-sky-50 border-sky-200 text-sky-950'
                  : 'bg-rose-50 border-rose-200 text-rose-950'
              }`}
            >
              <div className="flex items-center space-x-2.5">
                {confirmBatchModal === 'restore_auto' ? (
                  <Sparkles className="w-5 h-5 text-sky-700 shrink-0" />
                ) : (
                  <ShieldAlert className="w-5 h-5 text-rose-600 shrink-0" />
                )}
                <h3 className="font-extrabold text-sm sm:text-base">
                  {confirmBatchModal === 'restore_auto'
                    ? 'Sinkronkan Hitungan Otomatis Target?'
                    : 'Pemutihan Saldo Piutang ke Rp 0?'}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setConfirmBatchModal(null)}
                className="p-1.5 rounded-xl bg-white hover:bg-stone-100 text-stone-500 border border-stone-200 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 space-y-3 text-xs text-stone-700 leading-relaxed">
              {confirmBatchModal === 'restore_auto' ? (
                <>
                  <p>
                    Tindakan ini akan menghapus catatan penetapan/pemutihan manual lama pada seluruh data warga, lalu{' '}
                    <strong>
                      menghitung ulang hutang seluruh warga secara murni dari selisih Target Bulanan dikurangi Pembayaran Jimpitan
                    </strong>{' '}
                    pada setiap bulan yang tercatat di sistem.
                  </p>
                  <div className="p-3 rounded-xl bg-sky-50 border border-sky-200 text-sky-900 font-semibold">
                    Rumah kavling kosong (tarif Rp 0) tetap aman dan tidak dikenakan tagihan.
                  </div>
                </>
              ) : (
                <>
                  <p>
                    Tindakan ini akan memutihkan (meng-nol-kan) seluruh tunggakan warga hingga periode sebelum bulan ini menjadi{' '}
                    <strong>Rp 0 (Lunas)</strong>.
                  </p>
                  <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 font-semibold">
                    Perhatian: Kekurangan pembayaran pada bulan-bulan berikutnya setelah tanggal pemutihan tetap akan tercatat otomatis.
                  </div>
                </>
              )}
            </div>

            <div className="px-5 py-3.5 bg-stone-50 border-t border-stone-200 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setConfirmBatchModal(null)}
                className="px-4 py-2 rounded-xl bg-white hover:bg-stone-100 text-stone-700 border border-stone-300 text-xs font-bold cursor-pointer"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={() => {
                  if (confirmBatchModal === 'restore_auto' && onRestoreAutoPiutang) {
                    onRestoreAutoPiutang();
                    setFeedbackBanner(
                      'Rekap hutang seluruh warga berhasil disinkronkan ke hitungan target bulanan otomatis.'
                    );
                  } else if (confirmBatchModal === 'reset_zero' && onResetAllPiutangToZero) {
                    onResetAllPiutangToZero();
                    setFeedbackBanner(
                      'Pemutihan berhasil: saldo piutang periode sebelumnya telah ditetapkan menjadi Rp 0.'
                    );
                  }
                  setConfirmBatchModal(null);
                }}
                className={`px-4 py-2 rounded-xl text-white text-xs font-black flex items-center space-x-1.5 shadow-xs cursor-pointer ${
                  confirmBatchModal === 'restore_auto'
                    ? 'bg-sky-700 hover:bg-sky-800'
                    : 'bg-rose-600 hover:bg-rose-700'
                }`}
              >
                <Check className="w-4 h-4" />
                <span>
                  {confirmBatchModal === 'restore_auto' ? 'Ya, Hitung Otomatis' : 'Ya, Setel Rp 0'}
                </span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Pelunasan Modal */}
      {selectedWargaForPelunasan && (
        <BayarPelunasanTunggakanModal
          isOpen={Boolean(selectedWargaForPelunasan)}
          onClose={() => setSelectedWargaForPelunasan(null)}
          warga={selectedWargaForPelunasan.warga}
          tunggakanBulanLalu={getEffectiveAwal(selectedWargaForPelunasan)}
          sisaTunggakanLalu={getEffectiveSisa(selectedWargaForPelunasan)}
          prevMonthLabel={
            includeActiveMonth
              ? effectiveSummary.periodeTitle
              : tunggakanRekap.prevMonthLabel
          }
          activeMonthLabel={tunggakanRekap.activeMonthLabel}
          onAddMutation={async (mut) => {
            onAddMutation(mut);
            setSelectedWargaForPelunasan(null);
            setFeedbackBanner(
              `Pelunasan ${formatRupiah(mut.nominal)} dari ${selectedWargaForPelunasan.warga.nama} berhasil dicatat ke Kas RT.`
            );
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
            setFeedbackBanner(`Data piutang ${updated.nama} berhasil diperbarui.`);
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
        wargaTunggakanList={pdfWargaTunggakanList}
        summary={effectiveSummary}
        settings={settings}
        activeMonthLabel={tunggakanRekap.activeMonthLabel}
        prevMonthLabel={effectiveSummary.periodeTitle}
      />
    </div>
  );
};
