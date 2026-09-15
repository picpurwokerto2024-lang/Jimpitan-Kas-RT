import React, { useState, useMemo } from 'react';
import {
  Calendar,
  ChevronLeft,
  ChevronRight,
  TrendingUp,
  AlertTriangle,
  CheckCircle2,
  Sparkles,
  Search,
  Filter,
  Download,
  Share2,
  Printer,
  Phone,
  MessageSquare,
  FileSpreadsheet,
  Eye,
  CalendarDays,
  Table as TableIcon,
  LayoutGrid,
  Clock,
  ArrowUpRight,
  ArrowDownRight,
  ShieldCheck,
  Check,
  X,
  Award,
  Users,
  FileText,
  DollarSign,
  UserCheck,
  Plus
} from 'lucide-react';
import { Warga, JimpitanRecord, AppSettings, KasMutation } from '../types';
import {
  formatRupiah,
  formatTanggalIndo,
  cleanWhatsAppPhone,
  formatCompactNominal,
  formatMatrixNominalFull
} from '../utils/formatters';
import { LaporanWargaPdfModal } from './LaporanWargaPdfModal';
import { LaporanTunggakanPdfModal } from './LaporanTunggakanPdfModal';
import { InputJimpitanMingguanModal } from './InputJimpitanMingguanModal';
import { BayarPelunasanTunggakanModal } from './BayarPelunasanTunggakanModal';
import { calculateTunggakanRekap, WargaTunggakanDetail } from '../utils/tunggakanCalculator';

interface LaporanBulananWargaViewProps {
  wargaList: Warga[];
  allRecords: JimpitanRecord[];
  kasMutations?: KasMutation[];
  settings: AppSettings;
  selectedDate: string;
  onOpenWargaDetail?: (warga: Warga) => void;
  onAddMutation?: (mut: Omit<KasMutation, 'id' | 'createdAt'>) => Promise<void>;
  onSaveBatchRecords?: (records: Omit<JimpitanRecord, 'id' | 'createdAt'>[]) => Promise<void>;
  currentPetugas?: string;
  currentReguNama?: string;
  currentReguId?: string;
}

export const LaporanBulananWargaView: React.FC<LaporanBulananWargaViewProps> = ({
  wargaList,
  allRecords,
  kasMutations = [],
  settings,
  selectedDate,
  onOpenWargaDetail,
  onAddMutation,
  onSaveBatchRecords,
  currentPetugas = 'Petugas Ronda',
  currentReguNama = 'Regu Ronda',
  currentReguId = 'regu-1',
}) => {
  // Active Year-Month state
  const initialYearMonth = useMemo(() => {
    if (selectedDate && selectedDate.includes('-')) {
      const parts = selectedDate.split('-');
      return `${parts[0]}-${parts[1]}`;
    }
    const now = new Date();
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, '0');
    return `${y}-${m}`;
  }, [selectedDate]);

  const [activeYearMonth, setActiveYearMonth] = useState<string>(initialYearMonth);
  const [viewMode, setViewMode] = useState<'matrix' | 'cards' | 'daily' | 'tunggakan'>('matrix');
  const [matrixDisplayMode, setMatrixDisplayMode] = useState<'nominal_k' | 'nominal_full' | 'symbol'>('nominal_k');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'underpaid' | 'exact' | 'overpaid'>('all');
  const [selectedBlokFilter, setSelectedBlokFilter] = useState<string>('all');
  
  // Modals state
  const [isPdfModalOpen, setIsPdfModalOpen] = useState<boolean>(false);
  const [isTunggakanPdfModalOpen, setIsTunggakanPdfModalOpen] = useState<boolean>(false);
  const [isWeeklyInputOpen, setIsWeeklyInputOpen] = useState<boolean>(false);
  const [selectedWargaForWeeklyInput, setSelectedWargaForWeeklyInput] = useState<Warga | null>(null);
  const [selectedWargaForPelunasan, setSelectedWargaForPelunasan] = useState<WargaTunggakanDetail | null>(null);

  const [selectedDayForDaily, setSelectedDayForDaily] = useState<number>(() => {
    const today = new Date();
    return today.getDate();
  });

  // Parse active year and month
  const [activeYear, activeMonth] = useMemo(() => {
    const parts = activeYearMonth.split('-').map(Number);
    return [parts[0] || new Date().getFullYear(), parts[1] || new Date().getMonth() + 1];
  }, [activeYearMonth]);

  const monthNames = [
    'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
    'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
  ];
  const activeMonthLabel = `${monthNames[activeMonth - 1]} ${activeYear}`;

  // Total days in active month
  const daysInMonth = useMemo(() => {
    return new Date(activeYear, activeMonth, 0).getDate();
  }, [activeYear, activeMonth]);

  // Array of days: [1, 2, ..., daysInMonth]
  const daysArray = useMemo(() => {
    return Array.from({ length: daysInMonth }, (_, i) => i + 1);
  }, [daysInMonth]);

  // Available Bloks
  const availableBloks = useMemo(() => {
    const bloks = new Set<string>();
    wargaList.forEach((w) => {
      if (w.blok && w.blok.trim()) bloks.add(w.blok.trim());
    });
    return Array.from(bloks).sort();
  }, [wargaList]);

  // Month navigation handlers
  const handlePrevMonth = () => {
    let newYear = activeYear;
    let newMonth = activeMonth - 1;
    if (newMonth < 1) {
      newMonth = 12;
      newYear -= 1;
    }
    setActiveYearMonth(`${newYear}-${String(newMonth).padStart(2, '0')}`);
  };

  const handleNextMonth = () => {
    let newYear = activeYear;
    let newMonth = activeMonth + 1;
    if (newMonth > 12) {
      newMonth = 1;
      newYear += 1;
    }
    setActiveYearMonth(`${newYear}-${String(newMonth).padStart(2, '0')}`);
  };

  const handleCurrentMonth = () => {
    const now = new Date();
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, '0');
    setActiveYearMonth(`${y}-${m}`);
  };

  // Group and compute calculations for all warga in active month
  const wargaMonthlyReportData = useMemo(() => {
    // 1. Group records by resident
    const recordsByWarga = new Map<string, JimpitanRecord[]>();
    allRecords.forEach((r) => {
      if (!r.tanggal || !r.tanggal.startsWith(activeYearMonth)) return;
      if (r.status !== 'sukses') return;

      if (r.wargaId) {
        const list = recordsByWarga.get(r.wargaId) || [];
        list.push(r);
        recordsByWarga.set(r.wargaId, list);
      }
      if (r.nomorRumah) {
        const list = recordsByWarga.get(`no_${r.nomorRumah}`) || [];
        list.push(r);
        recordsByWarga.set(`no_${r.nomorRumah}`, list);
      }
    });

    return wargaList.map((warga) => {
      const recs = recordsByWarga.get(warga.id) || recordsByWarga.get(`no_${warga.nomorRumah}`) || [];
      const nominalDefault = warga.nominalDefault || settings.defaultNominal || 1000;
      const targetBulan = nominalDefault * daysInMonth;

      // Check advance payment (lunas 1 bulan)
      const hasFullMonthAdvance = recs.some(
        (r) =>
          (r.nominal && r.nominal >= nominalDefault * 25) ||
          (r.catatan &&
            (r.catatan.toLowerCase().includes('lunas 1 bulan') ||
              r.catatan.toLowerCase().includes('lunas bulan') ||
              r.catatan.toLowerCase().includes('30 hari') ||
              r.catatan.toLowerCase().includes('31 hari')))
      );

      // Check week advance records
      const weekAdvanceRanges: { startDay: number; endDay: number }[] = [];
      recs.forEach((r) => {
        const isWeek =
          (r.catatan && (r.catatan.toLowerCase().includes('1 minggu') || r.catatan.toLowerCase().includes('7 hari'))) ||
          (r.nominal >= nominalDefault * 6 && r.nominal <= nominalDefault * 8);
        if (isWeek && r.tanggal) {
          const startDay = parseInt(r.tanggal.slice(8, 10), 10) || 1;
          weekAdvanceRanges.push({ startDay, endDay: Math.min(daysInMonth, startDay + 6) });
        }
      });

      // Map of day number -> boolean paid & nominal
      const dailyMap: Record<number, { isPaid: boolean; nominal: number; isAdvance: boolean }> = {};
      
      // Initialize all days
      for (let d = 1; d <= daysInMonth; d++) {
        dailyMap[d] = { isPaid: false, nominal: 0, isAdvance: false };
      }

      // Populate actual recorded days
      recs.forEach((r) => {
        if (!r.tanggal) return;
        const dayNum = parseInt(r.tanggal.slice(8, 10), 10);
        if (dayNum >= 1 && dayNum <= daysInMonth) {
          dailyMap[dayNum] = {
            isPaid: true,
            nominal: (dailyMap[dayNum]?.nominal || 0) + (r.nominal || nominalDefault),
            isAdvance: false,
          };
        }
      });

      // Apply week advances
      weekAdvanceRanges.forEach((range) => {
        for (let d = range.startDay; d <= range.endDay; d++) {
          if (!dailyMap[d]?.isPaid) {
            dailyMap[d] = {
              isPaid: true,
              nominal: nominalDefault,
              isAdvance: true,
            };
          }
        }
      });

      // Apply full month advance
      if (hasFullMonthAdvance) {
        for (let d = 1; d <= daysInMonth; d++) {
          dailyMap[d] = {
            isPaid: true,
            nominal: nominalDefault,
            isAdvance: true,
          };
        }
      }

      // Calculate total paid and count of paid days
      const totalTerbayar = hasFullMonthAdvance && recs.reduce((sum, r) => sum + (r.nominal || 0), 0) < targetBulan
        ? targetBulan
        : recs.reduce((sum, r) => sum + (r.nominal || 0), 0);

      const countPaidDays = hasFullMonthAdvance 
        ? daysInMonth 
        : Object.values(dailyMap).filter((d) => d.isPaid).length;

      // Selisih: (Total Bayar - Target)
      const selisih = totalTerbayar - targetBulan;
      
      let status: 'underpaid' | 'exact' | 'overpaid' = 'exact';
      if (selisih < 0) {
        status = 'underpaid';
      } else if (selisih > 0) {
        status = 'overpaid';
      } else {
        status = 'exact';
      }

      const hariKurang = Math.max(0, daysInMonth - countPaidDays);
      const nominalKurang = Math.max(0, targetBulan - totalTerbayar);
      const nominalLebih = Math.max(0, totalTerbayar - targetBulan);
      const percentComplete = targetBulan > 0 ? Math.min(100, Math.round((totalTerbayar / targetBulan) * 100)) : 0;

      return {
        warga,
        targetBulan,
        totalTerbayar,
        selisih,
        status,
        countPaidDays,
        hariKurang,
        nominalKurang,
        nominalLebih,
        percentComplete,
        hasFullMonthAdvance,
        dailyMap,
        recordsCount: recs.length,
      };
    });
  }, [wargaList, allRecords, activeYearMonth, daysInMonth, settings.defaultNominal]);

  // Summary KPI Calculations for Monthly Matrix
  const summaryKpis = useMemo(() => {
    let totalTarget = 0;
    let totalTerkumpul = 0;
    let totalKurangBayar = 0;
    let totalLebihBayar = 0;
    let countUnderpaid = 0;
    let countExact = 0;
    let countOverpaid = 0;

    wargaMonthlyReportData.forEach((item) => {
      totalTarget += item.targetBulan;
      totalTerkumpul += item.totalTerbayar;
      if (item.status === 'underpaid') {
        totalKurangBayar += item.nominalKurang;
        countUnderpaid++;
      } else if (item.status === 'overpaid') {
        totalLebihBayar += item.nominalLebih;
        countOverpaid++;
      } else {
        countExact++;
      }
    });

    const percentTerkumpul = totalTarget > 0 ? Math.round((totalTerkumpul / totalTarget) * 100) : 0;
    const countLunasAtauLebih = countExact + countOverpaid;

    return {
      totalTarget,
      totalTerkumpul,
      totalKurangBayar,
      totalLebihBayar,
      countUnderpaid,
      countExact,
      countOverpaid,
      countLunasAtauLebih,
      totalWarga: wargaMonthlyReportData.length,
      percentTerkumpul,
    };
  }, [wargaMonthlyReportData]);

  // Carry-over Arrears & Settlement Report Calculation (Laporan Tersendiri)
  const tunggakanData = useMemo(() => {
    return calculateTunggakanRekap(
      wargaList,
      allRecords,
      kasMutations,
      activeYearMonth,
      settings
    );
  }, [wargaList, allRecords, kasMutations, activeYearMonth, settings]);

  // Filtered rows for Matrix & Cards
  const filteredData = useMemo(() => {
    return wargaMonthlyReportData.filter((item) => {
      // Search
      const matchesSearch =
        item.warga.nomorRumah.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.warga.nama.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (item.warga.blok && item.warga.blok.toLowerCase().includes(searchQuery.toLowerCase()));

      if (!matchesSearch) return false;

      // Status filter
      if (statusFilter !== 'all' && item.status !== statusFilter) {
        return false;
      }

      // Blok filter
      if (selectedBlokFilter !== 'all' && item.warga.blok !== selectedBlokFilter) {
        return false;
      }

      return true;
    });
  }, [wargaMonthlyReportData, searchQuery, statusFilter, selectedBlokFilter]);

  // Filtered rows for Tunggakan View
  const filteredTunggakanList = useMemo(() => {
    return tunggakanData.wargaListTunggakan.filter((item) => {
      const matchesSearch =
        item.warga.nomorRumah.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.warga.nama.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (item.warga.blok && item.warga.blok.toLowerCase().includes(searchQuery.toLowerCase()));

      if (!matchesSearch) return false;

      if (selectedBlokFilter !== 'all' && item.warga.blok !== selectedBlokFilter) {
        return false;
      }

      if (statusFilter === 'underpaid') {
        return item.sisaTunggakanLalu > 0;
      }
      if (statusFilter === 'exact') {
        return item.tunggakanBulanLalu === 0 && item.depositBulanLalu === 0;
      }
      if (statusFilter === 'overpaid') {
        return item.depositBulanLalu > 0;
      }

      return true;
    });
  }, [tunggakanData.wargaListTunggakan, searchQuery, selectedBlokFilter, statusFilter]);

  // Daily recap data for the selected day
  const dailyRecapData = useMemo(() => {
    const validDay = Math.min(daysInMonth, Math.max(1, selectedDayForDaily));
    const fullDateIso = `${activeYearMonth}-${String(validDay).padStart(2, '0')}`;
    
    const paidList: { warga: Warga; nominal: number; isAdvance: boolean }[] = [];
    const unpaidList: Warga[] = [];

    wargaMonthlyReportData.forEach((item) => {
      const dayStatus = item.dailyMap[validDay];
      if (dayStatus?.isPaid) {
        paidList.push({
          warga: item.warga,
          nominal: dayStatus.nominal || item.warga.nominalDefault || 1000,
          isAdvance: dayStatus.isAdvance,
        });
      } else {
        unpaidList.push(item.warga);
      }
    });

    const totalNominalHariIni = paidList.reduce((sum, p) => sum + p.nominal, 0);

    return {
      dayNum: validDay,
      fullDateIso,
      paidList,
      unpaidList,
      totalNominalHariIni,
    };
  }, [wargaMonthlyReportData, selectedDayForDaily, activeYearMonth, daysInMonth]);

  // Generate WhatsApp Notification message for individual citizen
  const handleSendWargaWhatsApp = (item: typeof wargaMonthlyReportData[0]) => {
    if (!item.warga.nomorHp) {
      alert(`Nomor WhatsApp warga ${item.warga.nama} belum terdaftar.`);
      return;
    }

    const phone = cleanWhatsAppPhone(item.warga.nomorHp);
    let statusText = '';
    if (item.status === 'overpaid') {
      statusText = `*LEBIH BAYAR (Deposit)*: +${formatRupiah(item.nominalLebih)} (${Math.floor(item.nominalLebih / (item.warga.nominalDefault || 1000))} hari bayar di muka)`;
    } else if (item.status === 'exact') {
      statusText = `*LUNAS TEPAT*: Sesuai tagihan 1 bulan penuh (Rp 0)`;
    } else {
      statusText = `*KURANG BAYAR*: -${formatRupiah(item.nominalKurang)} (Kurang ${item.hariKurang} hari)`;
    }

    const text = `*LAPORAN JIMPITAN BULANAN ${settings.namaRt.toUpperCase()}*
*Periode:* ${activeMonthLabel}
----------------------------------
*Nama:* ${item.warga.nama}
*No. Rumah:* ${item.warga.nomorRumah} ${item.warga.blok ? `(${item.warga.blok})` : ''}
*Tarif Harian:* ${formatRupiah(item.warga.nominalDefault || 1000)} / hari

*Target Bulan Ini (${daysInMonth} hari):* ${formatRupiah(item.targetBulan)}
*Total Terbayar:* ${formatRupiah(item.totalTerbayar)} (${item.countPaidDays} dari ${daysInMonth} hari)
*Status Pembayaran:*
${statusText}

_Terima kasih atas partisipasi dan kepedulian Bpk/Ibu dalam mendukung kas jimpitan & keamanan lingkungan kita._

*Pengurus ${settings.namaRt} / ${settings.namaRw}*`;

    const url = `https://wa.me/${phone}?text=${encodeURIComponent(text)}`;
    window.open(url, '_blank');
  };

  // WhatsApp reminder specifically for Arrears & Settlement
  const handleSendTunggakanWhatsApp = (detail: WargaTunggakanDetail) => {
    if (!detail.warga.nomorHp) {
      alert(`Nomor WhatsApp warga ${detail.warga.nama} belum terdaftar.`);
      return;
    }

    const phone = cleanWhatsAppPhone(detail.warga.nomorHp);
    const text = `*RINCIAN TUNGGAKAN & TAGIHAN KAS JIMPITAN ${settings.namaRt.toUpperCase()}*
*Periode Laporan:* ${activeMonthLabel}
----------------------------------
*Nama Kepala Keluarga:* ${detail.warga.nama}
*No. Rumah:* ${detail.warga.nomorRumah} ${detail.warga.blok ? `(${detail.warga.blok})` : ''}

📌 *REKAP SALDO BULAN LALU (${tunggakanData.prevMonthLabel}):*
• Tunggakan Lampau: ${detail.tunggakanBulanLalu > 0 ? `-${formatRupiah(detail.tunggakanBulanLalu)}` : 'Rp 0 (Lunas)'}
• Pelunasan Diterima Bulan Ini: ${formatRupiah(detail.pelunasanBulanIni)}
• Sisa Tunggakan Lampau: *${formatRupiah(detail.sisaTunggakanLalu)}*

📅 *TAGIHAN BULAN BERJALAN (${activeMonthLabel}):*
• Target Bulan Ini: ${formatRupiah(detail.targetBulanIni)}
• Terbayar Bulan Ini: ${formatRupiah(detail.terbayarBulanIni)}

💰 *TOTAL KEWAJIBAN BERSIH:* *${formatRupiah(detail.totalKewajibanBersih)}*

_Mohon kerjasamanya untuk dapat melunasi sisa kewajiban jimpitan melalui Petugas Ronda atau Bendahara RT._
_Terima kasih atas perhatian dan dukungannya demi ketertiban & kebersamaan warga._

*Pengurus ${settings.namaRt} / ${settings.namaRw}*`;

    const url = `https://wa.me/${phone}?text=${encodeURIComponent(text)}`;
    window.open(url, '_blank');
  };

  // Share overall summary to RT WhatsApp Group
  const handleShareGroupWhatsApp = () => {
    const text = `*REKAPITULASI JIMPITAN BULANAN - ${settings.namaRt.toUpperCase()}*
*Periode:* ${activeMonthLabel} (${daysInMonth} Hari)
------------------------------------
👥 *Total Rumah Warga:* ${summaryKpis.totalWarga} Rumah
🎯 *Total Target Kas:* ${formatRupiah(summaryKpis.totalTarget)}
💰 *Total Terkumpul:* ${formatRupiah(summaryKpis.totalTerkumpul)} (${summaryKpis.percentTerkumpul}%)

📊 *Rincian Status Kelunasan:*
✅ *Lunas / Lebih Bayar:* ${summaryKpis.countLunasAtauLebih} Rumah
⚠️ *Kurang Bayar:* ${summaryKpis.countUnderpaid} Rumah (Total sisa: ${formatRupiah(summaryKpis.totalKurangBayar)})
✨ *Surplus / Bayar Dimuka:* ${formatRupiah(summaryKpis.totalLebihBayar)} (${summaryKpis.countOverpaid} Rumah)

_Laporan resmi kas jimpitan warga mode pengurus ${settings.namaRt}/${settings.namaRw}._`;

    const url = `https://wa.me/?text=${encodeURIComponent(text)}`;
    window.open(url, '_blank');
  };

  // Share dedicated Tunggakan report to RT WhatsApp Group
  const handleShareTunggakanGroupWhatsApp = () => {
    const text = `*LAPORAN REKAPITULASI TUNGGAKAN & PELUNASAN BULAN LALU*
*Pengurus ${settings.namaRt.toUpperCase()} / ${settings.namaRw}*
*Periode Berjalan:* ${activeMonthLabel} (Rekap Lampau: ${tunggakanData.prevMonthLabel})
------------------------------------
📉 *Total Tunggakan (${tunggakanData.prevMonthLabel}):* -${formatRupiah(tunggakanData.summary.totalTunggakanBulanLalu)}
💵 *Pelunasan Diterima Bulan Ini:* +${formatRupiah(tunggakanData.summary.totalPelunasanBulanIni)} (${tunggakanData.summary.persenPelunasan}% Terlunasi)
⏳ *Sisa Tunggakan Belum Lunas:* ${formatRupiah(tunggakanData.summary.totalSisaTunggakanLalu)}
🌟 *Surplus / Saldo Dimuka:* +${formatRupiah(tunggakanData.summary.totalDepositBulanLalu)}

_Data terhitung otomatis dan terintegrasi dalam buku kas & laporan jimpitan digital RT._`;

    const url = `https://wa.me/?text=${encodeURIComponent(text)}`;
    window.open(url, '_blank');
  };

  // Export CSV
  const handleExportCSV = () => {
    const headers = [
      'No',
      'No. Rumah',
      'Blok',
      'Nama Warga',
      'Tarif Default',
      'Target Bulan (Rp)',
      'Total Terbayar (Rp)',
      'Hari Terbayar',
      'Hari Kurang',
      'Status',
      'Selisih (Rp)',
      'Nominal Kurang (Rp)',
      'Nominal Lebih (Rp)',
      ...daysArray.map((d) => `Tgl ${d}`),
    ];

    const rows = wargaMonthlyReportData.map((item, idx) => {
      const dayValues = daysArray.map((d) => (item.dailyMap[d]?.isPaid ? item.dailyMap[d].nominal : 0));
      return [
        idx + 1,
        `"${item.warga.nomorRumah}"`,
        `"${item.warga.blok || ''}"`,
        `"${item.warga.nama}"`,
        item.warga.nominalDefault || 1000,
        item.targetBulan,
        item.totalTerbayar,
        item.countPaidDays,
        item.hariKurang,
        item.status === 'overpaid' ? 'LEBIH BAYAR' : item.status === 'underpaid' ? 'KURANG BAYAR' : 'LUNAS TEPAT',
        item.selisih,
        item.nominalKurang,
        item.nominalLebih,
        ...dayValues,
      ].join(',');
    });

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Laporan_Jimpitan_${settings.namaRt.replace(/\s+/g, '_')}_${activeYearMonth}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-4 font-['Plus_Jakarta_Sans',sans-serif]">
      {/* 1. Month Navigation Header Card */}
      <div className="bg-white rounded-3xl border border-sky-100 p-4 sm:p-5 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-2xl bg-sky-50 border border-sky-200 text-sky-700 flex items-center justify-center font-bold">
              <Calendar className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h2 className="font-extrabold text-stone-900 text-base sm:text-lg tracking-tight">
                  Laporan Pertanggal Warga & Rekonsiliasi Saldo
                </h2>
                <span className="px-2 py-0.5 rounded-md bg-amber-100 text-amber-900 border border-amber-300 text-[10px] font-black uppercase">
                  Khusus Mode Pengurus
                </span>
              </div>
              <p className="text-xs text-stone-500">
                Pencatatan jimpitan harian/mingguan, deteksi hari kosong, dan pelunasan tunggakan lampau
              </p>
            </div>
          </div>

          {/* Month Navigator Controls */}
          <div className="flex items-center space-x-1.5 bg-stone-50 p-1.5 rounded-2xl border border-stone-200/80 self-start sm:self-auto">
            <button
              type="button"
              onClick={handlePrevMonth}
              className="p-1.5 rounded-xl hover:bg-white text-stone-700 hover:text-stone-900 hover:shadow-2xs transition-all cursor-pointer"
              title="Bulan Sebelumnya"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <div className="px-3 py-1 bg-white rounded-xl shadow-2xs font-black text-xs sm:text-sm text-stone-900 min-w-[130px] text-center border border-stone-200/50">
              {activeMonthLabel}
            </div>
            <button
              type="button"
              onClick={handleNextMonth}
              className="p-1.5 rounded-xl hover:bg-white text-stone-700 hover:text-stone-900 hover:shadow-2xs transition-all cursor-pointer"
              title="Bulan Berikutnya"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={handleCurrentMonth}
              className="px-2 py-1.5 rounded-xl text-[10px] font-bold bg-sky-50 text-sky-700 hover:bg-sky-100 transition-colors cursor-pointer"
            >
              Bulan Ini
            </button>
          </div>
        </div>

        {/* 2. KPI Metrics Cards */}
        {viewMode === 'tunggakan' ? (
          /* Tunggakan Specific KPI Cards */
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 pt-2 border-t border-stone-100">
            {/* Total Tunggakan Lampau */}
            <div className="p-3 rounded-2xl bg-rose-50/80 border border-rose-200 text-rose-950">
              <span className="text-[10px] font-bold uppercase tracking-wider text-rose-700 block">
                Tunggakan ({tunggakanData.prevMonthLabel})
              </span>
              <div className="text-sm sm:text-base font-black text-rose-900 mt-0.5">
                -{formatRupiah(tunggakanData.summary.totalTunggakanBulanLalu)}
              </div>
              <span className="text-[10px] text-rose-700 font-semibold">
                {tunggakanData.summary.totalWargaTertunggakLalu} dari {tunggakanData.summary.totalWarga} rumah tertunggak
              </span>
            </div>

            {/* Pelunasan Diterima Bulan Ini */}
            <div className="p-3 rounded-2xl bg-emerald-50/70 border border-emerald-200 text-emerald-950">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-700">
                  Pelunasan ({activeMonthLabel})
                </span>
                <span className="text-[10px] font-extrabold px-1.5 py-0.2 rounded bg-emerald-200 text-emerald-900">
                  {tunggakanData.summary.persenPelunasan}%
                </span>
              </div>
              <div className="text-sm sm:text-base font-black text-emerald-900 mt-0.5">
                +{formatRupiah(tunggakanData.summary.totalPelunasanBulanIni)}
              </div>
              <span className="text-[10px] text-emerald-700 font-semibold">
                Pembayaran masuk kas RT
              </span>
            </div>

            {/* Sisa Tunggakan Belum Lunas */}
            <div className="p-3 rounded-2xl bg-amber-50/80 border border-amber-200 text-amber-950">
              <span className="text-[10px] font-bold uppercase tracking-wider text-amber-800 block">
                Sisa Tunggakan Belum Lunas
              </span>
              <div className="text-sm sm:text-base font-black text-amber-900 mt-0.5">
                {formatRupiah(tunggakanData.summary.totalSisaTunggakanLalu)}
              </div>
              <span className="text-[10px] text-amber-700 font-semibold">
                Kewajiban lampau yang masih dicicil/belum
              </span>
            </div>

            {/* Surplus / Deposit Bulan Lalu */}
            <div className="p-3 rounded-2xl bg-sky-50/80 border border-sky-200 text-sky-950">
              <span className="text-[10px] font-bold uppercase tracking-wider text-sky-700 block">
                Surplus / Deposit Lampau
              </span>
              <div className="text-sm sm:text-base font-black text-sky-900 mt-0.5">
                +{formatRupiah(tunggakanData.summary.totalDepositBulanLalu)}
              </div>
              <span className="text-[10px] text-sky-700 font-semibold">
                Warga bayar lebih di muka
              </span>
            </div>
          </div>
        ) : (
          /* Monthly Matrix KPI Cards */
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 pt-2 border-t border-stone-100">
            {/* Target Kas */}
            <div className="p-3 rounded-2xl bg-stone-50 border border-stone-200/80">
              <span className="text-[10px] font-bold uppercase tracking-wider text-stone-500 block">
                Target Kas Bulan Ini
              </span>
              <div className="text-sm sm:text-base font-black text-stone-900 mt-0.5">
                {formatRupiah(summaryKpis.totalTarget)}
              </div>
              <span className="text-[10px] text-stone-400">
                {summaryKpis.totalWarga} rumah × {daysInMonth} hari
              </span>
            </div>

            {/* Terkumpul */}
            <div className="p-3 rounded-2xl bg-emerald-50/70 border border-emerald-200 text-emerald-950">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-700">
                  Total Terkumpul
                </span>
                <span className="text-[10px] font-extrabold px-1.5 py-0.2 rounded bg-emerald-200 text-emerald-900">
                  {summaryKpis.percentTerkumpul}%
                </span>
              </div>
              <div className="text-sm sm:text-base font-black text-emerald-900 mt-0.5">
                {formatRupiah(summaryKpis.totalTerkumpul)}
              </div>
              <span className="text-[10px] text-emerald-700 font-semibold">
                {summaryKpis.countLunasAtauLebih} dari {summaryKpis.totalWarga} rumah lunas
              </span>
            </div>

            {/* Kurang Bayar (Tunggakan) */}
            <div className="p-3 rounded-2xl bg-rose-50/80 border border-rose-200 text-rose-950">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold uppercase tracking-wider text-rose-700">
                  Kurang Bayar
                </span>
                <span className="text-[10px] font-extrabold px-1.5 py-0.2 rounded bg-rose-200 text-rose-900">
                  {summaryKpis.countUnderpaid} Warga
                </span>
              </div>
              <div className="text-sm sm:text-base font-black text-rose-900 mt-0.5">
                -{formatRupiah(summaryKpis.totalKurangBayar)}
              </div>
              <span className="text-[10px] text-rose-600 font-semibold">
                Sisa tagihan yang belum masuk
              </span>
            </div>

            {/* Lebih Bayar (Surplus / Deposit) */}
            <div className="p-3 rounded-2xl bg-amber-50/80 border border-amber-200 text-amber-950">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold uppercase tracking-wider text-amber-800">
                  Lebih Bayar
                </span>
                <span className="text-[10px] font-extrabold px-1.5 py-0.2 rounded bg-amber-200 text-amber-900">
                  {summaryKpis.countOverpaid} Warga
                </span>
              </div>
              <div className="text-sm sm:text-base font-black text-amber-900 mt-0.5">
                +{formatRupiah(summaryKpis.totalLebihBayar)}
              </div>
              <span className="text-[10px] text-amber-700 font-semibold">
                Deposit / pembayaran di muka
              </span>
            </div>
          </div>
        )}

        {/* 3. Action Toolbar: Views, Filters, Weekly Input, Export, WA Share */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 pt-2">
          {/* View Mode Tabs */}
          <div className="flex items-center space-x-1 bg-stone-100 p-1 rounded-2xl self-start flex-wrap gap-y-1">
            <button
              type="button"
              onClick={() => setViewMode('matrix')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center space-x-1.5 transition-all cursor-pointer ${
                viewMode === 'matrix'
                  ? 'bg-white text-sky-900 shadow-2xs font-black'
                  : 'text-stone-600 hover:text-stone-900'
              }`}
            >
              <TableIcon className="w-3.5 h-3.5" />
              <span>Tabel Matriks (1-{daysInMonth})</span>
            </button>

            <button
              type="button"
              onClick={() => setViewMode('cards')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center space-x-1.5 transition-all cursor-pointer ${
                viewMode === 'cards'
                  ? 'bg-white text-sky-900 shadow-2xs font-black'
                  : 'text-stone-600 hover:text-stone-900'
              }`}
            >
              <LayoutGrid className="w-3.5 h-3.5" />
              <span>Rincian Selisih Warga</span>
            </button>

            <button
              type="button"
              onClick={() => setViewMode('daily')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center space-x-1.5 transition-all cursor-pointer ${
                viewMode === 'daily'
                  ? 'bg-white text-sky-900 shadow-2xs font-black'
                  : 'text-stone-600 hover:text-stone-900'
              }`}
            >
              <CalendarDays className="w-3.5 h-3.5" />
              <span>Cek Harian</span>
            </button>

            <button
              type="button"
              onClick={() => setViewMode('tunggakan')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center space-x-1.5 transition-all cursor-pointer ${
                viewMode === 'tunggakan'
                  ? 'bg-amber-600 text-white shadow-2xs font-black'
                  : 'text-stone-600 hover:text-stone-900'
              }`}
            >
              <AlertTriangle className="w-3.5 h-3.5" />
              <span>Laporan Tunggakan & Pelunasan</span>
              <span className="px-1.5 py-0.2 rounded-md bg-amber-200 text-amber-900 text-[9px] font-black">
                Laporan Khusus
              </span>
            </button>
          </div>

          {/* Actions: Weekly Input, PDF Export, WhatsApp Share */}
          <div className="flex items-center space-x-2 flex-wrap gap-y-2">
            {/* Tombol Input Mingguan */}
            <button
              type="button"
              onClick={() => {
                setSelectedWargaForWeeklyInput(null);
                setIsWeeklyInputOpen(true);
              }}
              className="px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold flex items-center space-x-1.5 shadow-2xs transition-colors cursor-pointer"
              title="Input Kas / Jimpitan Perminggu dengan Deteksi Hari Kosong"
              id="btn-input-jimpitan-mingguan-top"
            >
              <CalendarDays className="w-3.5 h-3.5 text-indigo-200" />
              <span>Input Perminggu</span>
            </button>

            {/* Export PDF Button */}
            {viewMode === 'tunggakan' ? (
              <button
                type="button"
                onClick={() => setIsTunggakanPdfModalOpen(true)}
                className="px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold flex items-center space-x-1.5 shadow-2xs transition-colors cursor-pointer"
                title="Ekspor Laporan Tunggakan & Pelunasan PDF Lengkap dengan 3 Tanda Tangan"
                id="btn-export-pdf-tunggakan"
              >
                <FileText className="w-3.5 h-3.5 text-amber-400" />
                <span>Ekspor PDF Tunggakan (3 TTD)</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={() => setIsPdfModalOpen(true)}
                className="px-3 py-1.5 rounded-xl bg-sky-600 hover:bg-sky-700 text-white text-xs font-bold flex items-center space-x-1.5 shadow-2xs transition-colors cursor-pointer"
                title="Ekspor Laporan Resmi PDF Lengkap dengan 3 Tanda Tangan (Petugas, Bendahara, Ketua RT)"
                id="btn-export-pdf-warga-monthly"
              >
                <FileText className="w-3.5 h-3.5 text-sky-200" />
                <span>Ekspor PDF (3 TTD)</span>
              </button>
            )}

            {/* WhatsApp Share Button */}
            {viewMode === 'tunggakan' ? (
              <button
                type="button"
                onClick={handleShareTunggakanGroupWhatsApp}
                className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center space-x-1.5 shadow-2xs transition-colors cursor-pointer"
                title="Bagikan Ringkasan Laporan Tunggakan ke WhatsApp Grup RT"
              >
                <Share2 className="w-3.5 h-3.5" />
                <span>Kirim WA Tunggakan</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={handleShareGroupWhatsApp}
                className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center space-x-1.5 shadow-2xs transition-colors cursor-pointer"
                title="Bagikan Ringkasan Laporan Bulanan ke WhatsApp Grup RT"
              >
                <Share2 className="w-3.5 h-3.5" />
                <span>Kirim Ringkasan WA</span>
              </button>
            )}

            <button
              type="button"
              onClick={handleExportCSV}
              className="px-3 py-1.5 rounded-xl bg-stone-900 hover:bg-stone-800 text-white text-xs font-bold flex items-center space-x-1.5 shadow-2xs transition-colors cursor-pointer"
              title="Download File CSV Matriks Bulanan"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Export CSV</span>
            </button>
          </div>
        </div>

        {/* 4. Filter Bar */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5 pt-2 border-t border-stone-100">
          {/* Search */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-stone-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Cari nomor rumah atau nama..."
              className="w-full pl-9 pr-3 py-2 rounded-xl bg-stone-50 border border-stone-200 text-stone-900 text-xs outline-none focus:ring-2 focus:ring-sky-400"
            />
          </div>

          {/* Status Filter Chips */}
          <div className="flex items-center space-x-1.5 overflow-x-auto pb-1 sm:pb-0 text-xs">
            <button
              type="button"
              onClick={() => setStatusFilter('all')}
              className={`px-2.5 py-1.5 rounded-xl font-bold whitespace-nowrap transition-colors cursor-pointer ${
                statusFilter === 'all'
                  ? 'bg-stone-900 text-white'
                  : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
              }`}
            >
              Semua ({wargaList.length})
            </button>

            <button
              type="button"
              onClick={() => setStatusFilter('underpaid')}
              className={`px-2.5 py-1.5 rounded-xl font-bold whitespace-nowrap transition-colors cursor-pointer flex items-center space-x-1 ${
                statusFilter === 'underpaid'
                  ? 'bg-rose-600 text-white'
                  : 'bg-rose-50 text-rose-700 hover:bg-rose-100 border border-rose-200'
              }`}
            >
              <span>Kurang Bayar</span>
              <span className="px-1.5 py-0.2 rounded bg-rose-200/60 text-xs">
                {viewMode === 'tunggakan' ? tunggakanData.summary.totalWargaTertunggakLalu : summaryKpis.countUnderpaid}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setStatusFilter('exact')}
              className={`px-2.5 py-1.5 rounded-xl font-bold whitespace-nowrap transition-colors cursor-pointer flex items-center space-x-1 ${
                statusFilter === 'exact'
                  ? 'bg-emerald-600 text-white'
                  : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200'
              }`}
            >
              <span>Lunas Tepat</span>
              <span className="px-1.5 py-0.2 rounded bg-emerald-200/60 text-xs">
                {summaryKpis.countExact}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setStatusFilter('overpaid')}
              className={`px-2.5 py-1.5 rounded-xl font-bold whitespace-nowrap transition-colors cursor-pointer flex items-center space-x-1 ${
                statusFilter === 'overpaid'
                  ? 'bg-amber-600 text-white'
                  : 'bg-amber-50 text-amber-800 hover:bg-amber-100 border border-amber-200'
              }`}
            >
              <span>Lebih Bayar</span>
              <span className="px-1.5 py-0.2 rounded bg-amber-200/60 text-xs">
                {summaryKpis.countOverpaid}
              </span>
            </button>
          </div>

          {/* Blok Filter Dropdown */}
          {availableBloks.length > 0 && (
            <div className="flex items-center space-x-1.5 self-end sm:self-auto">
              <Filter className="w-3.5 h-3.5 text-stone-400" />
              <select
                value={selectedBlokFilter}
                onChange={(e) => setSelectedBlokFilter(e.target.value)}
                className="px-2.5 py-1.5 rounded-xl bg-stone-50 border border-stone-200 text-xs text-stone-800 font-semibold outline-none"
              >
                <option value="all">Semua Blok</option>
                {availableBloks.map((b) => (
                  <option key={b} value={b}>
                    {b}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>
      </div>

      {/* VIEW 1: MATRIX TABLE (Tabel Matriks Pertanggal 1-31) */}
      {viewMode === 'matrix' && (
        <div className="bg-white rounded-3xl border border-stone-200 shadow-sm overflow-hidden">
          <div className="p-4 border-b border-stone-100 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-stone-50/50">
            <div className="flex items-center space-x-2">
              <TableIcon className="w-4 h-4 text-sky-600" />
              <div>
                <h3 className="font-extrabold text-stone-900 text-sm">
                  Matriks Pembayaran & Setoran Pertanggal (1 - {daysInMonth} {activeMonthLabel})
                </h3>
                <p className="text-[11px] text-stone-500">
                  Rincian nominal uang yang sudah disetorkan warga tiap tanggal
                </p>
              </div>
            </div>

            {/* Matrix Cell Display Mode Toggle & Legend */}
            <div className="flex items-center space-x-2.5 flex-wrap gap-y-1">
              <div className="flex items-center bg-stone-200/80 p-0.5 rounded-xl text-[11px] font-bold">
                <button
                  type="button"
                  onClick={() => setMatrixDisplayMode('nominal_k')}
                  className={`px-2 py-1 rounded-lg transition-all cursor-pointer flex items-center space-x-1 ${
                    matrixDisplayMode === 'nominal_k'
                      ? 'bg-white text-emerald-800 shadow-2xs font-extrabold'
                      : 'text-stone-600 hover:text-stone-900'
                  }`}
                  title="Tampilkan nominal ringkas (1k, 2k, 5k)"
                >
                  <DollarSign className="w-3 h-3 text-emerald-600" />
                  <span>Nominal Ringkas (1k, 2k)</span>
                </button>
                <button
                  type="button"
                  onClick={() => setMatrixDisplayMode('nominal_full')}
                  className={`px-2 py-1 rounded-lg transition-all cursor-pointer flex items-center space-x-1 ${
                    matrixDisplayMode === 'nominal_full'
                      ? 'bg-white text-sky-800 shadow-2xs font-extrabold'
                      : 'text-stone-600 hover:text-stone-900'
                  }`}
                  title="Tampilkan nominal rupiah penuh (1.000, 2.000)"
                >
                  <span>Angka (1.000)</span>
                </button>
                <button
                  type="button"
                  onClick={() => setMatrixDisplayMode('symbol')}
                  className={`px-2 py-1 rounded-lg transition-all cursor-pointer flex items-center space-x-1 ${
                    matrixDisplayMode === 'symbol'
                      ? 'bg-white text-stone-900 shadow-2xs font-extrabold'
                      : 'text-stone-600 hover:text-stone-900'
                  }`}
                  title="Tampilkan simbol centang (✓)"
                >
                  <Check className="w-3 h-3 text-emerald-600" />
                  <span>Centang (✓)</span>
                </button>
              </div>

              <div className="hidden lg:flex items-center space-x-2 text-[10px] font-semibold text-stone-500 border-l border-stone-200 pl-2">
                <span className="flex items-center space-x-1">
                  <span className="w-2.5 h-2.5 rounded bg-emerald-500 inline-block"></span>
                  <span>Standar</span>
                </span>
                <span className="flex items-center space-x-1">
                  <span className="w-2.5 h-2.5 rounded bg-amber-500 inline-block"></span>
                  <span>Lebih Besar</span>
                </span>
                <span className="flex items-center space-x-1">
                  <span className="w-2.5 h-2.5 rounded bg-stone-200 inline-block"></span>
                  <span>Kosong</span>
                </span>
              </div>
            </div>
          </div>

          {/* Horizontally scrollable table */}
          <div className="overflow-x-auto max-h-[600px] overflow-y-auto">
            <table className="w-full text-xs text-left border-collapse min-w-[1200px]">
              <thead className="sticky top-0 z-20 bg-stone-900 text-white font-extrabold text-[11px]">
                <tr>
                  <th className="p-2.5 text-center w-10 sticky left-0 z-30 bg-stone-900">No</th>
                  <th className="p-2.5 text-center w-14 sticky left-10 z-30 bg-stone-900">Rumah</th>
                  <th className="p-2.5 w-32 sticky left-24 z-30 bg-stone-900 shadow-md">Nama Warga</th>
                  <th className="p-2.5 text-right w-24">Target</th>
                  <th className="p-2.5 text-right w-24">Terbayar</th>
                  <th className="p-2.5 text-right w-28">Status & Selisih</th>
                  <th className="p-2.5 text-center w-14">Hari</th>
                  {/* Daily Columns 1..N */}
                  {daysArray.map((d) => (
                    <th key={d} className="p-1 text-center w-7 font-black border-l border-stone-800">
                      {d}
                    </th>
                  ))}
                  <th className="p-2.5 text-center w-24 sticky right-0 z-30 bg-stone-900 shadow-md">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100">
                {filteredData.length === 0 ? (
                  <tr>
                    <td colSpan={daysInMonth + 8} className="p-8 text-center text-stone-400 font-semibold">
                      Tidak ada data warga yang sesuai dengan filter atau pencarian.
                    </td>
                  </tr>
                ) : (
                  filteredData.map((item, idx) => {
                    const isEven = idx % 2 === 0;
                    return (
                      <tr
                        key={item.warga.id}
                        className={`hover:bg-sky-50/50 transition-colors ${
                          isEven ? 'bg-white' : 'bg-stone-50/40'
                        }`}
                      >
                        {/* No */}
                        <td className="p-2 text-center text-stone-400 font-bold sticky left-0 z-10 bg-inherit">
                          {idx + 1}
                        </td>

                        {/* Nomor Rumah */}
                        <td className="p-2 text-center font-extrabold text-stone-900 sticky left-10 z-10 bg-inherit">
                          <span className="px-1.5 py-0.5 rounded bg-sky-100 text-sky-900 text-[11px]">
                            {item.warga.nomorRumah}
                          </span>
                        </td>

                        {/* Nama Warga */}
                        <td className="p-2 font-bold text-stone-900 truncate max-w-[130px] sticky left-24 z-10 bg-inherit shadow-xs">
                          <div className="truncate">{item.warga.nama}</div>
                          <div className="text-[10px] text-stone-400 font-normal truncate">
                            {item.warga.blok || 'Blok A'}
                          </div>
                        </td>

                        {/* Target Bulan */}
                        <td className="p-2 text-right font-medium text-stone-600">
                          {formatRupiah(item.targetBulan)}
                        </td>

                        {/* Total Terbayar */}
                        <td className="p-2 text-right font-extrabold text-emerald-700">
                          {formatRupiah(item.totalTerbayar)}
                        </td>

                        {/* Status & Selisih */}
                        <td className="p-2 text-right font-bold">
                          {item.status === 'overpaid' && (
                            <span className="inline-flex items-center space-x-1 px-1.5 py-0.5 rounded bg-amber-100 text-amber-900 text-[10px] font-extrabold">
                              <span>+{formatRupiah(item.nominalLebih)}</span>
                            </span>
                          )}
                          {item.status === 'exact' && (
                            <span className="inline-flex items-center space-x-1 px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800 text-[10px] font-bold">
                              <span>✓ Lunas</span>
                            </span>
                          )}
                          {item.status === 'underpaid' && (
                            <span className="inline-flex items-center space-x-1 px-1.5 py-0.5 rounded bg-rose-100 text-rose-800 text-[10px] font-extrabold">
                              <span>-{formatRupiah(item.nominalKurang)}</span>
                            </span>
                          )}
                        </td>

                        {/* Count Paid Days */}
                        <td className="p-2 text-center font-semibold text-stone-700 text-[11px]">
                          {item.countPaidDays}/{daysInMonth}
                        </td>

                        {/* Daily Matrix Checkmarks / Nominal Cells */}
                        {daysArray.map((d) => {
                          const dayStatus = item.dailyMap[d];
                          const isPaid = dayStatus?.isPaid;
                          const nominal = dayStatus?.nominal || 0;
                          const isHigher = nominal > (item.warga.nominalDefault || 1000);

                          return (
                            <td
                              key={d}
                              className={`p-0.5 text-center border-l border-stone-100 ${
                                isPaid ? (isHigher ? 'bg-amber-50/50' : 'bg-emerald-50/40') : ''
                              }`}
                              title={`Tgl ${d}: ${isPaid ? `Terbayar ${formatRupiah(nominal)} (${item.warga.nama})` : `Kosong / Belum Bayar (${item.warga.nama})`}`}
                            >
                              {isPaid ? (
                                matrixDisplayMode === 'nominal_k' ? (
                                  <span
                                    className={`inline-flex items-center justify-center min-w-[20px] px-1 py-0.5 rounded text-[9.5px] font-black leading-none ${
                                      isHigher
                                        ? 'bg-amber-100 text-amber-900 border border-amber-300'
                                        : 'bg-emerald-100 text-emerald-900 border border-emerald-300'
                                    }`}
                                  >
                                    {formatCompactNominal(nominal)}
                                  </span>
                                ) : matrixDisplayMode === 'nominal_full' ? (
                                  <span
                                    className={`inline-block px-1 py-0.5 rounded text-[8.5px] font-bold leading-none ${
                                      isHigher
                                        ? 'bg-amber-100 text-amber-900 font-extrabold'
                                        : 'bg-emerald-100 text-emerald-800'
                                    }`}
                                  >
                                    {formatMatrixNominalFull(nominal)}
                                  </span>
                                ) : (
                                  <div className="w-4.5 h-4.5 mx-auto rounded-full bg-emerald-500 text-white font-black text-[9px] flex items-center justify-center shadow-2xs">
                                    ✓
                                  </div>
                                )
                              ) : (
                                <span className="text-stone-300 font-bold text-[10px]">-</span>
                              )}
                            </td>
                          );
                        })}

                        {/* Action Buttons */}
                        <td className="p-2 text-center sticky right-0 z-10 bg-inherit shadow-xs">
                          <div className="flex items-center justify-center space-x-1">
                            {/* Tombol Input Mingguan untuk warga ini */}
                            <button
                              type="button"
                              onClick={() => {
                                setSelectedWargaForWeeklyInput(item.warga);
                                setIsWeeklyInputOpen(true);
                              }}
                              className="p-1.5 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-700 transition-colors cursor-pointer"
                              title="Setor Jimpitan Perminggu Warga Ini"
                            >
                              <CalendarDays className="w-3.5 h-3.5" />
                            </button>

                            {onOpenWargaDetail && (
                              <button
                                type="button"
                                onClick={() => onOpenWargaDetail(item.warga)}
                                className="p-1.5 rounded-lg bg-sky-50 hover:bg-sky-100 text-sky-700 transition-colors cursor-pointer"
                                title="Lihat Riwayat Lengkap"
                              >
                                <Eye className="w-3.5 h-3.5" />
                              </button>
                            )}
                            {item.warga.nomorHp && (
                              <button
                                type="button"
                                onClick={() => handleSendWargaWhatsApp(item)}
                                className="p-1.5 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-700 transition-colors cursor-pointer"
                                title="Kirim Laporan WA ke Warga"
                              >
                                <MessageSquare className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* VIEW 2: CARDS VIEW (Rincian Selisih Kurang/Lebih Bayar) */}
      {viewMode === 'cards' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {filteredData.map((item) => {
            return (
              <div
                key={item.warga.id}
                className="p-4 rounded-3xl bg-white border border-stone-200 shadow-sm hover:border-sky-300 transition-all flex flex-col justify-between space-y-3"
              >
                {/* Card Header */}
                <div className="flex items-start justify-between">
                  <div className="flex items-center space-x-2.5">
                    <div className="w-10 h-10 rounded-2xl bg-sky-50 border border-sky-200 text-sky-900 font-black flex flex-col items-center justify-center">
                      <span className="text-[8px] uppercase">No</span>
                      <span className="text-sm leading-none">{item.warga.nomorRumah}</span>
                    </div>
                    <div>
                      <h4 className="font-extrabold text-stone-900 text-sm">{item.warga.nama}</h4>
                      <p className="text-[11px] text-stone-500">{item.warga.blok || 'Blok A'} • RT {item.warga.rt || settings.namaRt}</p>
                    </div>
                  </div>

                  {/* Status Badge */}
                  <div>
                    {item.status === 'overpaid' && (
                      <span className="px-2 py-0.5 rounded-lg bg-amber-100 text-amber-900 text-[10px] font-black flex items-center space-x-1">
                        <Sparkles className="w-3 h-3 text-amber-600" />
                        <span>Lebih Bayar</span>
                      </span>
                    )}
                    {item.status === 'exact' && (
                      <span className="px-2 py-0.5 rounded-lg bg-emerald-100 text-emerald-800 text-[10px] font-black flex items-center space-x-1">
                        <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                        <span>Lunas Tepat</span>
                      </span>
                    )}
                    {item.status === 'underpaid' && (
                      <span className="px-2 py-0.5 rounded-lg bg-rose-100 text-rose-800 text-[10px] font-black flex items-center space-x-1">
                        <AlertTriangle className="w-3 h-3 text-rose-600" />
                        <span>Kurang Bayar</span>
                      </span>
                    )}
                  </div>
                </div>

                {/* Progress Bar */}
                <div className="space-y-1">
                  <div className="flex items-center justify-between text-[11px] font-bold">
                    <span className="text-stone-500">
                      Terbayar {item.countPaidDays} dari {daysInMonth} hari
                    </span>
                    <span
                      className={
                        item.status === 'overpaid'
                          ? 'text-amber-800'
                          : item.status === 'exact'
                          ? 'text-emerald-700'
                          : 'text-rose-700'
                      }
                    >
                      {item.percentComplete}%
                    </span>
                  </div>
                  <div className="h-2 w-full rounded-full bg-stone-100 overflow-hidden">
                    <div
                      className={`h-full rounded-full ${
                        item.status === 'overpaid'
                          ? 'bg-amber-500'
                          : item.status === 'exact'
                          ? 'bg-emerald-500'
                          : 'bg-rose-500'
                      }`}
                      style={{ width: `${Math.min(100, item.percentComplete)}%` }}
                    ></div>
                  </div>
                </div>

                {/* Financial Summary Details */}
                <div className="p-3 rounded-2xl bg-stone-50 border border-stone-200/80 space-y-1.5 text-xs">
                  <div className="flex items-center justify-between text-stone-600">
                    <span>Target Bulan Ini:</span>
                    <span className="font-semibold">{formatRupiah(item.targetBulan)}</span>
                  </div>
                  <div className="flex items-center justify-between text-stone-600">
                    <span>Total Terbayar:</span>
                    <span className="font-extrabold text-emerald-700">{formatRupiah(item.totalTerbayar)}</span>
                  </div>
                  <div className="pt-1 border-t border-stone-200 flex items-center justify-between font-bold">
                    <span>Hitungan Selisih:</span>
                    {item.status === 'overpaid' ? (
                      <span className="text-amber-800">+{formatRupiah(item.nominalLebih)} (Surplus)</span>
                    ) : item.status === 'underpaid' ? (
                      <span className="text-rose-700">-{formatRupiah(item.nominalKurang)} (Kurang {item.hariKurang} hari)</span>
                    ) : (
                      <span className="text-emerald-700">Rp 0 (Tepat)</span>
                    )}
                  </div>
                </div>

                {/* Card Action Buttons */}
                <div className="pt-1 flex items-center justify-end space-x-1.5">
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedWargaForWeeklyInput(item.warga);
                      setIsWeeklyInputOpen(true);
                    }}
                    className="px-2.5 py-1.5 rounded-xl bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-xs font-bold flex items-center space-x-1 transition-colors cursor-pointer"
                  >
                    <CalendarDays className="w-3.5 h-3.5" />
                    <span>Setor Mingguan</span>
                  </button>

                  {onOpenWargaDetail && (
                    <button
                      type="button"
                      onClick={() => onOpenWargaDetail(item.warga)}
                      className="px-2.5 py-1.5 rounded-xl bg-sky-50 hover:bg-sky-100 text-sky-700 text-xs font-bold flex items-center space-x-1 transition-colors cursor-pointer"
                    >
                      <Eye className="w-3.5 h-3.5" />
                      <span>Riwayat</span>
                    </button>
                  )}

                  {item.warga.nomorHp && (
                    <button
                      type="button"
                      onClick={() => handleSendWargaWhatsApp(item)}
                      className="px-2.5 py-1.5 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-700 text-xs font-bold flex items-center space-x-1 transition-colors cursor-pointer"
                    >
                      <MessageSquare className="w-3.5 h-3.5" />
                      <span>Kirim WA</span>
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* VIEW 3: DEDICATED TUNGGAKAN & PELUNASAN BULAN LALU (LAPORAN TERSENDIRI) */}
      {viewMode === 'tunggakan' && (
        <div className="space-y-4">
          {/* Informational Guidance Banner */}
          <div className="p-4 rounded-3xl bg-amber-500/10 border border-amber-300 text-amber-950 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div className="flex items-start space-x-3">
              <div className="w-9 h-9 rounded-2xl bg-amber-500/20 text-amber-800 flex items-center justify-center shrink-0 mt-0.5">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-extrabold text-sm text-amber-900">
                  Laporan Khusus: Rekapitulasi Tunggakan Lampau ({tunggakanData.prevMonthLabel}) & Pelunasan di Bulan Berjalan ({activeMonthLabel})
                </h3>
                <p className="text-xs text-amber-800/90 mt-0.5 leading-relaxed">
                  Sistem otomatis menghitung sisa kewajiban dari bulan sebelumnya. Ketika warga melakukan pelunasan di bulan berjalan, saldo tunggakan akan berkurang dan tercatat dalam buku kas RT.
                </p>
              </div>
            </div>

            <div className="flex items-center space-x-2 shrink-0">
              <button
                type="button"
                onClick={() => setIsTunggakanPdfModalOpen(true)}
                className="px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-black flex items-center space-x-1.5 shadow-sm transition-colors cursor-pointer"
              >
                <FileText className="w-3.5 h-3.5 text-amber-400" />
                <span>Unduh PDF (3 TTD)</span>
              </button>
            </div>
          </div>

          {/* Dedicated Tunggakan Table */}
          <div className="bg-white rounded-3xl border border-stone-200 shadow-sm overflow-hidden">
            <div className="p-4 border-b border-stone-100 flex flex-col sm:flex-row sm:items-center justify-between gap-2 bg-stone-50/50">
              <div>
                <h3 className="font-extrabold text-stone-900 text-sm">
                  Daftar Warga Tertunggak & Status Pelunasan
                </h3>
                <p className="text-[11px] text-stone-500">
                  Klik tombol <b>"Lunasi Tunggakan"</b> untuk mencatat pelunasan kekurangan jimpitan bulan lalu
                </p>
              </div>

              <div className="flex items-center space-x-2 text-xs">
                <span className="px-2.5 py-1 rounded-xl bg-rose-100 text-rose-800 font-black">
                  {tunggakanData.summary.totalWargaTertunggakLalu} Rumah Tertunggak
                </span>
                <span className="px-2.5 py-1 rounded-xl bg-emerald-100 text-emerald-800 font-black">
                  Capaian: {tunggakanData.summary.persenPelunasan}%
                </span>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left border-collapse min-w-[900px]">
                <thead className="bg-stone-900 text-white font-extrabold text-[11px]">
                  <tr>
                    <th className="p-3 text-center w-10">No</th>
                    <th className="p-3 text-center w-16">Rumah</th>
                    <th className="p-3">Nama Warga</th>
                    <th className="p-3 text-right">Tunggakan ({tunggakanData.prevMonthLabel})</th>
                    <th className="p-3 text-right">Pelunasan ({activeMonthLabel})</th>
                    <th className="p-3 text-center">Status Pelunasan</th>
                    <th className="p-3 text-right">Sisa Tunggakan Lampau</th>
                    <th className="p-3 text-right">Tagihan Bulan Ini</th>
                    <th className="p-3 text-right">Total Bersih</th>
                    <th className="p-3 text-center w-44">Aksi Pelunasan & WA</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100">
                  {filteredTunggakanList.length === 0 ? (
                    <tr>
                      <td colSpan={10} className="p-8 text-center text-stone-400 font-bold">
                        Tidak ada data tunggakan warga yang sesuai kriteria pencarian.
                      </td>
                    </tr>
                  ) : (
                    filteredTunggakanList.map((detail, idx) => {
                      const isEven = idx % 2 === 0;
                      return (
                        <tr
                          key={detail.warga.id}
                          className={`hover:bg-amber-50/40 transition-colors ${
                            isEven ? 'bg-white' : 'bg-stone-50/40'
                          }`}
                        >
                          {/* No */}
                          <td className="p-3 text-center text-stone-400 font-bold">
                            {idx + 1}
                          </td>

                          {/* Rumah */}
                          <td className="p-3 text-center font-black text-stone-900">
                            <span className="px-2 py-0.5 rounded-lg bg-sky-100 text-sky-900">
                              {detail.warga.nomorRumah}
                            </span>
                          </td>

                          {/* Nama */}
                          <td className="p-3 font-bold text-stone-900">
                            <div>{detail.warga.nama}</div>
                            <div className="text-[10px] text-stone-400 font-normal">
                              {detail.warga.blok || 'Blok A'} • RT {detail.warga.rt || settings.namaRt}
                            </div>
                          </td>

                          {/* Tunggakan Bulan Lalu */}
                          <td className="p-3 text-right font-black">
                            {detail.tunggakanBulanLalu > 0 ? (
                              <span className="text-rose-700">-{formatRupiah(detail.tunggakanBulanLalu)}</span>
                            ) : detail.depositBulanLalu > 0 ? (
                              <span className="text-sky-700">+{formatRupiah(detail.depositBulanLalu)} (Surplus)</span>
                            ) : (
                              <span className="text-stone-400">Rp 0 (Lunas)</span>
                            )}
                          </td>

                          {/* Pelunasan Diterima di Bulan Berjalan */}
                          <td className="p-3 text-right font-extrabold text-emerald-700">
                            {detail.pelunasanBulanIni > 0 ? (
                              <span>+{formatRupiah(detail.pelunasanBulanIni)}</span>
                            ) : (
                              <span className="text-stone-400">-</span>
                            )}
                          </td>

                          {/* Status Pelunasan */}
                          <td className="p-3 text-center">
                            {detail.tunggakanBulanLalu > 0 ? (
                              detail.sisaTunggakanLalu === 0 ? (
                                <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-800 text-[10px] font-black">
                                  <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                                  <span>Lunas (100%)</span>
                                </span>
                              ) : detail.pelunasanBulanIni > 0 ? (
                                <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-md bg-amber-100 text-amber-900 text-[10px] font-black">
                                  <span>Dicicil Sebagian</span>
                                </span>
                              ) : (
                                <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-md bg-rose-100 text-rose-800 text-[10px] font-black">
                                  <span>Belum Dilunasi</span>
                                </span>
                              )
                            ) : detail.depositBulanLalu > 0 ? (
                              <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-md bg-sky-100 text-sky-800 text-[10px] font-black">
                                <span>Surplus Dimuka</span>
                              </span>
                            ) : (
                              <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-md bg-stone-100 text-stone-600 text-[10px] font-bold">
                                <span>Lunas Tepat</span>
                              </span>
                            )}
                          </td>

                          {/* Sisa Tunggakan Lampau */}
                          <td className="p-3 text-right font-black">
                            {detail.sisaTunggakanLalu > 0 ? (
                              <span className="text-rose-700">{formatRupiah(detail.sisaTunggakanLalu)}</span>
                            ) : (
                              <span className="text-emerald-700">Rp 0</span>
                            )}
                          </td>

                          {/* Tagihan Bulan Ini */}
                          <td className="p-3 text-right text-stone-600 font-semibold">
                            {formatRupiah(detail.targetBulanIni)}
                          </td>

                          {/* Total Kewajiban Bersih */}
                          <td className="p-3 text-right font-black text-stone-900">
                            {formatRupiah(detail.totalKewajibanBersih)}
                          </td>

                          {/* Aksi */}
                          <td className="p-3 text-center">
                            <div className="flex items-center justify-center space-x-1.5">
                              {detail.sisaTunggakanLalu > 0 && onAddMutation && (
                                <button
                                  type="button"
                                  onClick={() => setSelectedWargaForPelunasan(detail)}
                                  className="px-2.5 py-1 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-black flex items-center space-x-1 shadow-2xs transition-colors cursor-pointer"
                                  title="Catat Pelunasan Tunggakan"
                                >
                                  <DollarSign className="w-3.5 h-3.5" />
                                  <span>Lunasi</span>
                                </button>
                              )}

                              <button
                                type="button"
                                onClick={() => handleSendTunggakanWhatsApp(detail)}
                                className="p-1.5 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 transition-colors cursor-pointer"
                                title="Kirim Rincian Tunggakan ke WhatsApp Warga"
                              >
                                <MessageSquare className="w-3.5 h-3.5" />
                              </button>

                              {onOpenWargaDetail && (
                                <button
                                  type="button"
                                  onClick={() => onOpenWargaDetail(detail.warga)}
                                  className="p-1.5 rounded-xl bg-stone-100 hover:bg-stone-200 text-stone-700 transition-colors cursor-pointer"
                                  title="Lihat Riwayat Jimpitan"
                                >
                                  <Eye className="w-3.5 h-3.5" />
                                </button>
                              )}
                            </div>
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

      {/* VIEW 4: DAILY CHECK VIEW (Cek Tanggal Harian) */}
      {viewMode === 'daily' && (
        <div className="bg-white rounded-3xl border border-stone-200 p-5 shadow-sm space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h3 className="font-extrabold text-stone-900 text-base">
                Cek Rekap Harian: Tanggal {dailyRecapData.dayNum} {activeMonthLabel}
              </h3>
              <p className="text-xs text-stone-500">
                Pilih tanggal untuk melihat daftar rumah yang sudah ditarik dan yang belum pada tanggal spesifik
              </p>
            </div>

            {/* Day Selector Buttons */}
            <div className="flex items-center space-x-1 overflow-x-auto max-w-full pb-1">
              {daysArray.map((d) => (
                <button
                  key={d}
                  type="button"
                  onClick={() => setSelectedDayForDaily(d)}
                  className={`w-7 h-7 rounded-xl text-xs font-extrabold flex items-center justify-center transition-all cursor-pointer ${
                    selectedDayForDaily === d
                      ? 'bg-sky-600 text-white shadow-2xs'
                      : 'bg-stone-100 text-stone-700 hover:bg-stone-200'
                  }`}
                >
                  {d}
                </button>
              ))}
            </div>
          </div>

          {/* Daily Status KPI Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
            {/* Column 1: Sudah Bayar */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs font-extrabold text-emerald-900 px-1">
                <span className="flex items-center space-x-1">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  <span>Sudah Terbayar ({dailyRecapData.paidList.length})</span>
                </span>
                <span>Total: {formatRupiah(dailyRecapData.totalNominalHariIni)}</span>
              </div>
              <div className="space-y-1.5 max-h-[400px] overflow-y-auto pr-1">
                {dailyRecapData.paidList.length === 0 ? (
                  <div className="p-4 text-center text-xs text-stone-400 bg-stone-50 rounded-2xl">
                    Belum ada penarikan jimpitan pada tanggal ini.
                  </div>
                ) : (
                  dailyRecapData.paidList.map(({ warga, nominal, isAdvance }) => (
                    <div
                      key={warga.id}
                      className="p-2.5 rounded-xl bg-emerald-50/70 border border-emerald-200 flex items-center justify-between text-xs"
                    >
                      <div className="flex items-center space-x-2">
                        <span className="w-7 h-7 rounded-lg bg-emerald-600 text-white font-extrabold flex items-center justify-center text-[10px]">
                          {warga.nomorRumah}
                        </span>
                        <div>
                          <div className="font-bold text-stone-900">{warga.nama}</div>
                          <div className="text-[10px] text-stone-500">{warga.blok || 'Blok A'}</div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-extrabold text-emerald-900">{formatRupiah(nominal)}</div>
                        {isAdvance && (
                          <span className="text-[9px] font-bold text-sky-700 bg-sky-100 px-1.5 py-0.2 rounded">
                            Lunas Dimuka
                          </span>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Column 2: Belum Bayar */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs font-extrabold text-rose-900 px-1">
                <span className="flex items-center space-x-1">
                  <AlertTriangle className="w-4 h-4 text-rose-600" />
                  <span>Belum Terbayar ({dailyRecapData.unpaidList.length})</span>
                </span>
              </div>
              <div className="space-y-1.5 max-h-[400px] overflow-y-auto pr-1">
                {dailyRecapData.unpaidList.length === 0 ? (
                  <div className="p-4 text-center text-xs text-emerald-700 bg-emerald-50 rounded-2xl font-bold">
                    Luar biasa! Seluruh warga telah melunasi jimpitan pada tanggal ini.
                  </div>
                ) : (
                  dailyRecapData.unpaidList.map((warga) => (
                    <div
                      key={warga.id}
                      className="p-2.5 rounded-xl bg-rose-50/70 border border-rose-200 flex items-center justify-between text-xs"
                    >
                      <div className="flex items-center space-x-2">
                        <span className="w-7 h-7 rounded-lg bg-rose-200 text-rose-900 font-extrabold flex items-center justify-center text-[10px]">
                          {warga.nomorRumah}
                        </span>
                        <div>
                          <div className="font-bold text-stone-900">{warga.nama}</div>
                          <div className="text-[10px] text-stone-500">{warga.blok || 'Blok A'}</div>
                        </div>
                      </div>
                      <div className="flex items-center space-x-1">
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedWargaForWeeklyInput(warga);
                            setIsWeeklyInputOpen(true);
                          }}
                          className="px-2 py-1 rounded-lg bg-indigo-50 border border-indigo-200 text-[10px] font-bold text-indigo-800 hover:bg-indigo-100 transition-colors cursor-pointer"
                        >
                          Setor
                        </button>
                        {onOpenWargaDetail && (
                          <button
                            type="button"
                            onClick={() => onOpenWargaDetail(warga)}
                            className="px-2 py-1 rounded-lg bg-white border border-rose-200 text-[10px] font-bold text-rose-800 hover:bg-rose-100 transition-colors cursor-pointer"
                          >
                            Riwayat
                          </button>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 1: Monthly Matrix PDF Export Modal with 3 Signatures */}
      <LaporanWargaPdfModal
        isOpen={isPdfModalOpen}
        onClose={() => setIsPdfModalOpen(false)}
        wargaData={wargaMonthlyReportData}
        summaryKpis={summaryKpis}
        settings={settings}
        activeMonthLabel={activeMonthLabel}
        daysInMonth={daysInMonth}
        activeYearMonth={activeYearMonth}
      />

      {/* MODAL 2: Dedicated Tunggakan PDF Export Modal with 3 Signatures */}
      <LaporanTunggakanPdfModal
        isOpen={isTunggakanPdfModalOpen}
        onClose={() => setIsTunggakanPdfModalOpen(false)}
        wargaTunggakanList={tunggakanData.wargaListTunggakan}
        summary={tunggakanData.summary}
        settings={settings}
        activeMonthLabel={activeMonthLabel}
        prevMonthLabel={tunggakanData.prevMonthLabel}
      />

      {/* MODAL 3: Input Jimpitan Perminggu (dengan Deteksi Hari Kosong) */}
      {onSaveBatchRecords && (
        <InputJimpitanMingguanModal
          isOpen={isWeeklyInputOpen}
          onClose={() => {
            setIsWeeklyInputOpen(false);
            setSelectedWargaForWeeklyInput(null);
          }}
          wargaList={wargaList}
          allRecords={allRecords}
          onSaveBatchRecords={onSaveBatchRecords}
          currentPetugas={currentPetugas}
          currentReguNama={currentReguNama}
          currentReguId={currentReguId}
          settings={settings}
          preselectedWarga={selectedWargaForWeeklyInput}
          initialDate={selectedDate}
        />
      )}

      {/* MODAL 4: Pelunasan Tunggakan Modal */}
      {selectedWargaForPelunasan && onAddMutation && (
        <BayarPelunasanTunggakanModal
          isOpen={!!selectedWargaForPelunasan}
          onClose={() => setSelectedWargaForPelunasan(null)}
          warga={selectedWargaForPelunasan.warga}
          tunggakanBulanLalu={selectedWargaForPelunasan.tunggakanBulanLalu}
          sisaTunggakanLalu={selectedWargaForPelunasan.sisaTunggakanLalu}
          prevMonthLabel={tunggakanData.prevMonthLabel}
          activeMonthLabel={activeMonthLabel}
          onAddMutation={onAddMutation}
          currentPetugas={currentPetugas}
          settings={settings}
        />
      )}
    </div>
  );
};
