import React, { useState, useMemo, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { 
  FileText, 
  Download, 
  Printer, 
  X, 
  Calendar, 
  CheckCircle2, 
  Building2, 
  DollarSign, 
  ArrowUpRight, 
  ArrowDownLeft, 
  Users, 
  ShieldCheck, 
  FileSpreadsheet, 
  Edit3, 
  SlidersHorizontal,
  CheckSquare,
  Square,
  Sparkles,
  Layers,
  Filter,
  Eye,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import { JimpitanRecord, KasMutation, AppSettings, Warga, KasReportCustomOptions } from '../types';
import { formatRupiah, formatTanggalIndo } from '../utils/formatters';
import { generateKasReportPdf } from '../utils/pdfReportGenerator';
import { generateKasReportExcel } from '../utils/excelReportGenerator';

interface PdfReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  allRecords: JimpitanRecord[];
  kasMutations: KasMutation[];
  settings: AppSettings;
  selectedDate: string;
  wargaList?: Warga[];
  initialPreset?: ReportPresetKey;
}

export type ReportPresetKey = 'lengkap' | 'kas' | 'jimpitan' | 'pemasukan' | 'pengeluaran' | 'eksekutif' | 'rekap_rumah' | 'kustom';

export const PdfReportModal: React.FC<PdfReportModalProps> = ({
  isOpen,
  onClose,
  allRecords = [],
  kasMutations = [],
  settings,
  selectedDate,
  wargaList = [],
  initialPreset = 'lengkap',
}) => {
  // Safe initial month YYYY-MM
  const initialMonth = useMemo(() => {
    if (selectedDate && selectedDate.includes('-')) {
      const parts = selectedDate.split('-');
      return `${parts[0]}-${parts[1]}`;
    }
    const now = new Date();
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, '0');
    return `${y}-${m}`;
  }, [selectedDate]);

  const [selectedMonth, setSelectedMonth] = useState<string>(initialMonth);
  const [filterType, setFilterType] = useState<'bulan' | 'hari' | 'semua'>('bulan');
  const [isGeneratingPdf, setIsGeneratingPdf] = useState<boolean>(false);
  const [isGeneratingExcel, setIsGeneratingExcel] = useState<boolean>(false);

  // Active Preset Tracker
  const [activePreset, setActivePreset] = useState<ReportPresetKey>(initialPreset);
  const [showConfigDrawer, setShowConfigDrawer] = useState<boolean>(false);
  const [configSubTab, setConfigSubTab] = useState<'sections' | 'mutasi' | 'jimpitan' | 'ttd'>('sections');

  // Comprehensive Custom Options State
  const [customOptions, setCustomOptions] = useState<KasReportCustomOptions>({
    showKopSurat: true,
    showSummaryCards: true,
    showMutasiTable: true,
    showJimpitanTable: true,
    showRekapPerRumahTable: false,
    showSignatures: true,
    showCatatanLaporan: false,
    catatanLaporanText: '',
    mutasiFilterJenis: 'semua',
    mutasiColumns: {
      no: true,
      tanggal: true,
      kategori: true,
      keterangan: true,
      petugas: true,
      nominal: true,
    },
    jimpitanFilterStatus: 'semua',
    jimpitanColumns: {
      no: true,
      waktu: true,
      nomorRumah: true,
      namaWarga: true,
      status: true,
      petugas: true,
      nominal: true,
    },
  });

  // Editable 3 Signature Names with default prefill
  const [petugasName, setPetugasName] = useState<string>('');
  const [bendaharaName, setBendaharaName] = useState<string>(settings?.namaBendahara || 'Bendahara RT');
  const [ketuaRtName, setKetuaRtName] = useState<string>(settings?.namaKetuaRt || 'Ketua RT');

  useEffect(() => {
    if (settings) {
      if (settings.namaBendahara) setBendaharaName(settings.namaBendahara);
      if (settings.namaKetuaRt) setKetuaRtName(settings.namaKetuaRt);
    }
  }, [settings]);

  useEffect(() => {
    if (selectedDate && selectedDate.includes('-')) {
      const parts = selectedDate.split('-');
      setSelectedMonth(`${parts[0]}-${parts[1]}`);
    }
  }, [selectedDate, isOpen]);

  useEffect(() => {
    if (isOpen && initialPreset && initialPreset !== 'lengkap') {
      applyPreset(initialPreset);
    }
  }, [isOpen, initialPreset]);

  if (!isOpen) return null;

  // Apply Quick Presets
  const applyPreset = (preset: ReportPresetKey) => {
    setActivePreset(preset);
    if (preset === 'lengkap') {
      setCustomOptions({
        showKopSurat: true,
        showSummaryCards: true,
        showMutasiTable: true,
        showJimpitanTable: true,
        showRekapPerRumahTable: false,
        showSignatures: true,
        showCatatanLaporan: false,
        catatanLaporanText: '',
        mutasiFilterJenis: 'semua',
        mutasiColumns: { no: true, tanggal: true, kategori: true, keterangan: true, petugas: true, nominal: true },
        jimpitanFilterStatus: 'semua',
        jimpitanColumns: { no: true, waktu: true, nomorRumah: true, namaWarga: true, status: true, petugas: true, nominal: true },
      });
    } else if (preset === 'kas') {
      setCustomOptions(prev => ({
        ...prev,
        showKopSurat: true,
        showSummaryCards: true,
        showMutasiTable: true,
        showJimpitanTable: false,
        showRekapPerRumahTable: false,
        showSignatures: true,
        mutasiFilterJenis: 'semua',
      }));
    } else if (preset === 'jimpitan') {
      setCustomOptions(prev => ({
        ...prev,
        showKopSurat: true,
        showSummaryCards: true,
        showMutasiTable: false,
        showJimpitanTable: true,
        showRekapPerRumahTable: false,
        showSignatures: true,
        jimpitanFilterStatus: 'semua',
      }));
    } else if (preset === 'eksekutif') {
      setCustomOptions(prev => ({
        ...prev,
        showKopSurat: true,
        showSummaryCards: true,
        showMutasiTable: false,
        showJimpitanTable: false,
        showRekapPerRumahTable: false,
        showSignatures: true,
      }));
    } else if (preset === 'rekap_rumah') {
      setCustomOptions(prev => ({
        ...prev,
        showKopSurat: true,
        showSummaryCards: true,
        showMutasiTable: false,
        showJimpitanTable: false,
        showRekapPerRumahTable: true,
        showSignatures: true,
      }));
    } else if (preset === 'pemasukan') {
      setCustomOptions(prev => ({
        ...prev,
        showKopSurat: true,
        showSummaryCards: true,
        showMutasiTable: true,
        showJimpitanTable: true,
        showRekapPerRumahTable: false,
        showSignatures: true,
        mutasiFilterJenis: 'masuk',
      }));
    } else if (preset === 'pengeluaran') {
      setCustomOptions(prev => ({
        ...prev,
        showKopSurat: true,
        showSummaryCards: true,
        showMutasiTable: true,
        showJimpitanTable: false,
        showRekapPerRumahTable: false,
        showSignatures: true,
        mutasiFilterJenis: 'keluar',
      }));
    }
  };

  const updateCustom = (updater: (prev: KasReportCustomOptions) => KasReportCustomOptions) => {
    setActivePreset('kustom');
    setCustomOptions(updater);
  };

  // Safe records & mutations fallback
  const safeRecords = Array.isArray(allRecords) ? allRecords : [];
  const safeMutations = Array.isArray(kasMutations) ? kasMutations : [];

  // Filter records according to selected period
  const filteredRecords = safeRecords.filter((record) => {
    if (!record || !record.tanggal) return false;
    if (filterType === 'hari') {
      return record.tanggal === selectedDate;
    }
    if (filterType === 'bulan') {
      return record.tanggal.startsWith(selectedMonth);
    }
    return true; // semua
  });

  // Filter mutations according to selected period
  const filteredMutations = safeMutations.filter((m) => {
    if (!m) return false;
    const tgl = m.tanggal ? m.tanggal.split('T')[0] : (m.createdAt ? new Date(m.createdAt).toISOString().slice(0, 10) : '');
    if (!tgl) return false;
    if (filterType === 'hari') {
      return tgl === selectedDate;
    }
    if (filterType === 'bulan') {
      return tgl.startsWith(selectedMonth);
    }
    return true; // semua
  });

  // Financial summary calculations
  const totalJimpitan = filteredRecords.reduce((sum, r) => sum + (r.nominal || 0), 0);
  const totalPemasukanLain = filteredMutations
    .filter((m) => m.jenis === 'masuk')
    .reduce((sum, m) => sum + (m.nominal || 0), 0);
  const totalPengeluaran = filteredMutations
    .filter((m) => m.jenis === 'keluar')
    .reduce((sum, m) => sum + (m.nominal || 0), 0);
  const totalPemasukanAll = totalJimpitan + totalPemasukanLain;

  // Overall Kas balance & Monthly Rollover Calculations
  const masterSaldoAwal = Number(settings?.saldoAwalKas) || 0;
  const allTimeJimpitan = safeRecords.reduce((sum, r) => sum + (r.nominal || 0), 0);
  const allTimePemasukan = safeMutations.filter((m) => m.jenis === 'masuk').reduce((sum, m) => sum + (m.nominal || 0), 0);
  const allTimePengeluaran = safeMutations.filter((m) => m.jenis === 'keluar').reduce((sum, m) => sum + (m.nominal || 0), 0);
  const totalSaldoKasAllTime = masterSaldoAwal + allTimeJimpitan + allTimePemasukan - allTimePengeluaran;

  // Monthly Rollover Calculation for 'bulan' filter
  const pastJimpitanBulan = filterType === 'bulan'
    ? safeRecords
        .filter((r) => r.tanggal && r.tanggal < `${selectedMonth}-01`)
        .reduce((sum, r) => sum + (r.nominal || 0), 0)
    : 0;

  const pastMutasiMasukBulan = filterType === 'bulan'
    ? safeMutations
        .filter((m) => {
          const tgl = m.tanggal ? m.tanggal.split('T')[0] : (m.createdAt ? new Date(m.createdAt).toISOString().slice(0, 10) : '');
          return tgl && tgl < `${selectedMonth}-01` && m.jenis === 'masuk';
        })
        .reduce((sum, m) => sum + (m.nominal || 0), 0)
    : 0;

  const pastMutasiKeluarBulan = filterType === 'bulan'
    ? safeMutations
        .filter((m) => {
          const tgl = m.tanggal ? m.tanggal.split('T')[0] : (m.createdAt ? new Date(m.createdAt).toISOString().slice(0, 10) : '');
          return tgl && tgl < `${selectedMonth}-01` && m.jenis === 'keluar';
        })
        .reduce((sum, m) => sum + (m.nominal || 0), 0)
    : 0;

  const saldoAwalBulanIni = masterSaldoAwal + pastJimpitanBulan + pastMutasiMasukBulan - pastMutasiKeluarBulan;
  const saldoKasBersihAkhirBulan = saldoAwalBulanIni + totalPemasukanAll - totalPengeluaran;

  const displaySaldoAwal = filterType === 'bulan' ? saldoAwalBulanIni : masterSaldoAwal;
  const displaySaldoKasBersih = filterType === 'bulan' ? saldoKasBersihAkhirBulan : totalSaldoKasAllTime;

  // Filtered mutations for preview table
  const displayedMutations = useMemo(() => {
    let list = filteredMutations;
    if (customOptions.mutasiFilterJenis === 'keluar') {
      list = list.filter((m) => m.jenis === 'keluar');
    } else if (customOptions.mutasiFilterJenis === 'masuk') {
      list = list.filter((m) => m.jenis === 'masuk');
    }
    return list;
  }, [filteredMutations, customOptions.mutasiFilterJenis]);

  // Filtered records for preview table
  const displayedRecords = useMemo(() => {
    let list = filteredRecords;
    if (customOptions.jimpitanFilterStatus === 'ada_setoran') {
      list = list.filter((r) => (r.nominal || 0) > 0 || r.status === 'sukses' || r.status === 'titip');
    } else if (customOptions.jimpitanFilterStatus === 'sukses') {
      list = list.filter((r) => r.status === 'sukses');
    } else if (customOptions.jimpitanFilterStatus === 'titip') {
      list = list.filter((r) => r.status === 'titip');
    } else if (customOptions.jimpitanFilterStatus === 'kosong') {
      list = list.filter((r) => r.status === 'kosong');
    } else if (customOptions.jimpitanFilterStatus === 'lewat') {
      list = list.filter((r) => r.status === 'lewat');
    }
    return list;
  }, [filteredRecords, customOptions.jimpitanFilterStatus]);

  // Rekapitulasi per rumah data
  const rekapPerRumahList = useMemo(() => {
    const mapHouseTotal = new Map<string, { noRumah: string; nama: string; total: number; count: number }>();
    if (Array.isArray(wargaList)) {
      wargaList.forEach((w) => {
        mapHouseTotal.set(w.nomorRumah, { noRumah: w.nomorRumah, nama: w.nama, total: 0, count: 0 });
      });
    }
    filteredRecords.forEach((r) => {
      const existing = mapHouseTotal.get(r.nomorRumah);
      if (existing) {
        existing.total += (r.nominal || 0);
        if ((r.nominal || 0) > 0 || r.status === 'sukses' || r.status === 'titip') {
          existing.count += 1;
        }
      } else {
        mapHouseTotal.set(r.nomorRumah, { noRumah: r.nomorRumah, nama: r.namaWarga, total: r.nominal || 0, count: 1 });
      }
    });
    return Array.from(mapHouseTotal.values()).sort((a, b) => {
      const numA = parseInt(a.noRumah.replace(/\D/g, ''), 10) || 0;
      const numB = parseInt(b.noRumah.replace(/\D/g, ''), 10) || 0;
      return numA - numB;
    });
  }, [wargaList, filteredRecords]);

  // Period label text
  let periodText = '';
  if (filterType === 'hari') {
    periodText = formatTanggalIndo(selectedDate || new Date().toISOString().split('T')[0]);
  } else if (filterType === 'bulan') {
    const parts = (selectedMonth || initialMonth).split('-').map(Number);
    const y = parts[0] || new Date().getFullYear();
    const m = parts[1] || new Date().getMonth() + 1;
    const monthNames = [
      'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
      'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
    ];
    periodText = `${monthNames[m - 1]} ${y}`;
  } else {
    periodText = 'Semua Waktu (Kumulatif)';
  }

  // Handle PDF file generation with full customOptions
  const handleDownloadPdf = () => {
    setIsGeneratingPdf(true);
    try {
      generateKasReportPdf({
        records: filteredRecords,
        mutations: filteredMutations,
        settings,
        periodText,
        totalSaldoKas: displaySaldoKasBersih,
        saldoAwalPeriode: filterType === 'bulan' ? displaySaldoAwal : undefined,
        petugasName: petugasName.trim() || undefined,
        bendaharaName: bendaharaName.trim() || settings?.namaBendahara || undefined,
        ketuaRtName: ketuaRtName.trim() || settings?.namaKetuaRt || undefined,
        wargaList,
        customOptions,
      });
    } catch (err) {
      console.error('Error generating PDF:', err);
      alert('Gagal membuat file PDF. Silakan gunakan tombol Cetak Langsung.');
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  // Handle Excel file generation with full customOptions
  const handleDownloadExcel = async () => {
    setIsGeneratingExcel(true);
    try {
      await generateKasReportExcel({
        records: filteredRecords,
        mutations: filteredMutations,
        settings,
        periodText,
        totalSaldoKas: displaySaldoKasBersih,
        saldoAwalPeriode: filterType === 'bulan' ? displaySaldoAwal : 0,
        petugasName: petugasName.trim() || 'Petugas Ronda RT',
        bendaharaName: bendaharaName.trim() || settings?.namaBendahara || 'Bendahara RT',
        ketuaRtName: ketuaRtName.trim() || settings?.namaKetuaRt || 'Ketua RT',
        wargaList,
        customOptions,
      });
    } catch (err) {
      console.error('Error generating Excel:', err);
      alert('Gagal membuat file Excel.');
    } finally {
      setIsGeneratingExcel(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const modalContent = (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[100] flex items-center justify-center p-2 sm:p-4 overflow-y-auto print:p-0 print:bg-white print:static print:overflow-visible" id="pdf-report-preview-modal">
      <div className="bg-white rounded-3xl border border-stone-200 shadow-2xl max-w-4xl w-full my-auto overflow-hidden flex flex-col max-h-[96vh] sm:max-h-[92vh] animate-in fade-in zoom-in-95 print:max-h-none print:shadow-none print:border-none print:m-0 print:rounded-none">
        
        {/* HEADER BAR (Non-printable) */}
        <div className="p-3 sm:p-4 border-b border-stone-200 flex items-center justify-between bg-stone-50/95 print:hidden flex-shrink-0">
          <div className="flex items-center space-x-3 min-w-0">
            <div className="w-9 h-9 rounded-2xl bg-sky-600 text-white flex items-center justify-center shadow-xs flex-shrink-0">
              <Eye className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center space-x-2">
                <h3 className="font-extrabold text-stone-900 text-sm sm:text-base truncate">
                  Pratinjau & Cetak Laporan Kas & Jimpitan
                </h3>
                <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-300 text-[10px] font-black shrink-0">
                  Resmi RT
                </span>
              </div>
              <p className="text-xs text-stone-500 truncate">
                Layar pratinjau langsung: pilih data apa saja yang ingin ditampilkan sebelum dicetak / diunduh.
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-1.5 flex-shrink-0">
            <button
              onClick={() => setShowConfigDrawer(!showConfigDrawer)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer border flex items-center space-x-1.5 shadow-2xs ${
                showConfigDrawer 
                  ? 'bg-sky-600 text-white border-sky-600 shadow-sky-200' 
                  : 'bg-white text-stone-700 border-stone-300 hover:bg-stone-50'
              }`}
              title="Atur rincian bagian data dan kolom yang ditampilkan"
            >
              <SlidersHorizontal className="w-3.5 h-3.5" />
              <span>{showConfigDrawer ? 'Tutup Pilihan Data' : 'Pilih Data & Kolom'}</span>
              {showConfigDrawer ? <ChevronUp className="w-3 h-3 ml-0.5" /> : <ChevronDown className="w-3 h-3 ml-0.5" />}
            </button>

            <button
              onClick={onClose}
              className="p-2 rounded-xl text-stone-400 hover:text-stone-700 hover:bg-stone-100 transition-colors cursor-pointer"
              title="Tutup Modal"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* CONTROLS BAR: PERIODE & PRESET CEPAT & ACTIONS (Non-printable) */}
        <div className="p-2.5 sm:p-3 bg-sky-50/80 border-b border-sky-100 flex flex-wrap items-center justify-between gap-2 print:hidden flex-shrink-0">
          <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
            <span className="text-xs font-bold text-sky-950 mr-1">Periode:</span>
            
            <button
              onClick={() => setFilterType('bulan')}
              className={`px-2.5 py-1 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                filterType === 'bulan'
                  ? 'bg-sky-600 text-white shadow-2xs'
                  : 'bg-white text-stone-700 border border-sky-200 hover:bg-sky-100'
              }`}
            >
              Bulanan
            </button>

            <button
              onClick={() => setFilterType('hari')}
              className={`px-2.5 py-1 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                filterType === 'hari'
                  ? 'bg-sky-600 text-white shadow-2xs'
                  : 'bg-white text-stone-700 border border-sky-200 hover:bg-sky-100'
              }`}
            >
              Harian
            </button>

            <button
              onClick={() => setFilterType('semua')}
              className={`px-2.5 py-1 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                filterType === 'semua'
                  ? 'bg-sky-600 text-white shadow-2xs'
                  : 'bg-white text-stone-700 border border-sky-200 hover:bg-sky-100'
              }`}
            >
              Semua
            </button>

            {filterType === 'bulan' && (
              <input
                type="month"
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
                className="px-2.5 py-1 rounded-xl bg-white border border-sky-300 text-xs font-bold text-stone-800 outline-none shadow-2xs"
              />
            )}
          </div>

          {/* Quick Presets Strip directly in toolbar */}
          <div className="flex items-center gap-1 overflow-x-auto py-0.5">
            <span className="text-[11px] font-bold text-stone-500 mr-1 shrink-0">Preset:</span>
            {[
              { id: 'lengkap', label: 'Semua Lengkap' },
              { id: 'kas', label: 'Buku Kas' },
              { id: 'pemasukan', label: 'Pemasukan' },
              { id: 'pengeluaran', label: 'Pengeluaran' },
              { id: 'jimpitan', label: 'Jimpitan Saja' },
              { id: 'eksekutif', label: 'Ringkasan' },
              { id: 'rekap_rumah', label: 'Rekap Rumah' },
            ].map((p) => (
              <button
                key={p.id}
                onClick={() => applyPreset(p.id as ReportPresetKey)}
                className={`px-2 py-1 rounded-lg text-xs font-bold shrink-0 transition-all cursor-pointer ${
                  activePreset === p.id
                    ? 'bg-sky-700 text-white shadow-2xs'
                    : 'bg-white text-stone-700 border border-stone-300 hover:bg-stone-50'
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>

          <div className="flex items-center space-x-1.5 sm:space-x-2">
            <button
              onClick={handlePrint}
              className="px-3 py-1.5 rounded-xl bg-white hover:bg-stone-50 border border-stone-300 text-stone-800 text-xs font-bold flex items-center space-x-1 shadow-2xs transition-colors cursor-pointer"
              title="Cetak langsung lewat printer browser"
            >
              <Printer className="w-3.5 h-3.5 text-stone-600" />
              <span>Cetak</span>
            </button>

            <button
              onClick={handleDownloadPdf}
              disabled={isGeneratingPdf}
              className="px-3.5 py-1.5 rounded-xl bg-sky-600 hover:bg-sky-700 text-white text-xs font-extrabold flex items-center space-x-1.5 shadow-2xs transition-colors cursor-pointer disabled:opacity-50"
              title="Unduh File PDF Dokumen Resmi"
            >
              <Download className="w-3.5 h-3.5" />
              <span>{isGeneratingPdf ? 'Membuat...' : 'Unduh PDF'}</span>
            </button>
          </div>
        </div>

        {/* CUSTOMIZATION DRAWER (Non-printable) */}
        {showConfigDrawer && (
          <div className="p-3.5 sm:p-4 bg-stone-100/90 border-b border-stone-300 print:hidden text-xs animate-in fade-in slide-in-from-top-2 max-h-72 overflow-y-auto">
            {/* 1. Quick Presets Bar */}
            <div className="mb-3">
              <div className="flex items-center justify-between mb-1.5">
                <span className="font-extrabold text-stone-800 text-[11px] uppercase tracking-wider flex items-center gap-1">
                  <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                  Preset Cepat Laporan:
                </span>
                <span className="text-[10px] text-stone-500">Klik untuk beralih mode cepat</span>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {[
                  { id: 'lengkap', label: 'Semua Lengkap (Kas + Jimpitan)' },
                  { id: 'kas', label: 'Buku Kas Saja' },
                  { id: 'jimpitan', label: 'Jimpitan Saja' },
                  { id: 'eksekutif', label: 'Ringkasan Eksekutif Saja' },
                  { id: 'rekap_rumah', label: 'Rekap Total per Rumah' },
                ].map((p) => (
                  <button
                    key={p.id}
                    onClick={() => applyPreset(p.id as ReportPresetKey)}
                    className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                      activePreset === p.id
                        ? 'bg-sky-600 text-white shadow-xs'
                        : 'bg-white text-stone-700 border border-stone-300 hover:bg-stone-50'
                    }`}
                  >
                    {p.label}
                  </button>
                ))}
              </div>
            </div>

            {/* 2. Sub-tab navigation for granular customization */}
            <div className="flex border-b border-stone-200 mb-3 gap-1">
              <button
                onClick={() => setConfigSubTab('sections')}
                className={`px-3 py-1.5 text-xs font-bold border-b-2 cursor-pointer transition-colors ${
                  configSubTab === 'sections'
                    ? 'border-sky-600 text-sky-700 bg-white rounded-t-lg'
                    : 'border-transparent text-stone-500 hover:text-stone-800'
                }`}
              >
                1. Bagian Dokumen
              </button>
              <button
                onClick={() => setConfigSubTab('mutasi')}
                className={`px-3 py-1.5 text-xs font-bold border-b-2 cursor-pointer transition-colors ${
                  configSubTab === 'mutasi'
                    ? 'border-sky-600 text-sky-700 bg-white rounded-t-lg'
                    : 'border-transparent text-stone-500 hover:text-stone-800'
                }`}
              >
                2. Kolom Mutasi Kas
              </button>
              <button
                onClick={() => setConfigSubTab('jimpitan')}
                className={`px-3 py-1.5 text-xs font-bold border-b-2 cursor-pointer transition-colors ${
                  configSubTab === 'jimpitan'
                    ? 'border-sky-600 text-sky-700 bg-white rounded-t-lg'
                    : 'border-transparent text-stone-500 hover:text-stone-800'
                }`}
              >
                3. Kolom Jimpitan
              </button>
              <button
                onClick={() => setConfigSubTab('ttd')}
                className={`px-3 py-1.5 text-xs font-bold border-b-2 cursor-pointer transition-colors ${
                  configSubTab === 'ttd'
                    ? 'border-sky-600 text-sky-700 bg-white rounded-t-lg'
                    : 'border-transparent text-stone-500 hover:text-stone-800'
                }`}
              >
                4. Penandatangan & Catatan
              </button>
            </div>

            {/* TAB 1: Sections Checkboxes */}
            {configSubTab === 'sections' && (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5 bg-white p-3 rounded-xl border border-stone-200">
                <label className="flex items-center space-x-2 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={customOptions.showKopSurat}
                    onChange={(e) => updateCustom(p => ({ ...p, showKopSurat: e.target.checked }))}
                    className="w-4 h-4 rounded text-sky-600 focus:ring-sky-500 cursor-pointer"
                  />
                  <span className="font-medium text-stone-800">Kop Surat Resmi RT/RW</span>
                </label>

                <label className="flex items-center space-x-2 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={customOptions.showSummaryCards}
                    onChange={(e) => updateCustom(p => ({ ...p, showSummaryCards: e.target.checked }))}
                    className="w-4 h-4 rounded text-sky-600 focus:ring-sky-500 cursor-pointer"
                  />
                  <span className="font-medium text-stone-800">Kartu Ringkasan Finansial</span>
                </label>

                <label className="flex items-center space-x-2 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={customOptions.showMutasiTable}
                    onChange={(e) => updateCustom(p => ({ ...p, showMutasiTable: e.target.checked }))}
                    className="w-4 h-4 rounded text-sky-600 focus:ring-sky-500 cursor-pointer"
                  />
                  <span className="font-medium text-stone-800">Tabel Mutasi Kas RT</span>
                </label>

                <label className="flex items-center space-x-2 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={customOptions.showJimpitanTable}
                    onChange={(e) => updateCustom(p => ({ ...p, showJimpitanTable: e.target.checked }))}
                    className="w-4 h-4 rounded text-sky-600 focus:ring-sky-500 cursor-pointer"
                  />
                  <span className="font-medium text-stone-800">Tabel Penarikan Jimpitan</span>
                </label>

                <label className="flex items-center space-x-2 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={customOptions.showRekapPerRumahTable}
                    onChange={(e) => updateCustom(p => ({ ...p, showRekapPerRumahTable: e.target.checked }))}
                    className="w-4 h-4 rounded text-sky-600 focus:ring-sky-500 cursor-pointer"
                  />
                  <span className="font-medium text-stone-800">Tabel Rekap Total per Rumah</span>
                </label>

                <label className="flex items-center space-x-2 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={customOptions.showSignatures}
                    onChange={(e) => updateCustom(p => ({ ...p, showSignatures: e.target.checked }))}
                    className="w-4 h-4 rounded text-sky-600 focus:ring-sky-500 cursor-pointer"
                  />
                  <span className="font-medium text-stone-800">2 Tanda Tangan Resmi (Bendahara & Ketua RT)</span>
                </label>

                <label className="flex items-center space-x-2 cursor-pointer select-none col-span-1 sm:col-span-2">
                  <input
                    type="checkbox"
                    checked={customOptions.showCatatanLaporan}
                    onChange={(e) => updateCustom(p => ({ ...p, showCatatanLaporan: e.target.checked }))}
                    className="w-4 h-4 rounded text-sky-600 focus:ring-sky-500 cursor-pointer"
                  />
                  <span className="font-medium text-stone-800">Catatan Khusus / Keterangan di Bawah</span>
                </label>
              </div>
            )}

            {/* TAB 2: Mutasi Kas Columns & Filters */}
            {configSubTab === 'mutasi' && (
              <div className="bg-white p-3 rounded-xl border border-stone-200 space-y-3">
                <div>
                  <span className="font-bold text-stone-700 block mb-1">Filter Jenis Transaksi Kas:</span>
                  <div className="flex flex-wrap gap-2">
                    {[
                      { id: 'semua', label: 'Semua (Pengeluaran & Pemasukan)' },
                      { id: 'keluar', label: 'Hanya Pengeluaran Kas' },
                      { id: 'masuk', label: 'Hanya Pemasukan Kas Lain' },
                    ].map((f) => (
                      <button
                        key={f.id}
                        onClick={() => updateCustom(p => ({ ...p, mutasiFilterJenis: f.id as any }))}
                        className={`px-2.5 py-1 rounded-lg text-xs font-semibold cursor-pointer ${
                          customOptions.mutasiFilterJenis === f.id
                            ? 'bg-sky-600 text-white'
                            : 'bg-stone-100 text-stone-700 hover:bg-stone-200'
                        }`}
                      >
                        {f.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <span className="font-bold text-stone-700 block mb-1">Pilihan Kolom Tabel Kas:</span>
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2">
                    {[
                      { key: 'no', label: 'Nomor' },
                      { key: 'tanggal', label: 'Tanggal' },
                      { key: 'kategori', label: 'Kategori' },
                      { key: 'keterangan', label: 'Keterangan' },
                      { key: 'petugas', label: 'Petugas / PJ' },
                      { key: 'nominal', label: 'Nominal' },
                    ].map((col) => (
                      <label key={col.key} className="flex items-center space-x-1.5 cursor-pointer select-none">
                        <input
                          type="checkbox"
                          checked={customOptions.mutasiColumns[col.key as keyof typeof customOptions.mutasiColumns]}
                          onChange={(e) => updateCustom(p => ({
                            ...p,
                            mutasiColumns: {
                              ...p.mutasiColumns,
                              [col.key]: e.target.checked,
                            }
                          }))}
                          className="w-3.5 h-3.5 rounded text-sky-600 focus:ring-sky-500 cursor-pointer"
                        />
                        <span className="text-stone-800">{col.label}</span>
                      </label>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* TAB 3: Jimpitan Columns & Filters */}
            {configSubTab === 'jimpitan' && (
              <div className="bg-white p-3 rounded-xl border border-stone-200 space-y-3">
                <div>
                  <span className="font-bold text-stone-700 block mb-1">Filter Status Jimpitan:</span>
                  <div className="flex flex-wrap gap-2">
                    {[
                      { id: 'semua', label: 'Semua Status' },
                      { id: 'ada_setoran', label: 'Hanya Ada Uang (> Rp 0)' },
                      { id: 'sukses', label: 'Sukses Saja' },
                      { id: 'titip', label: 'Titip Saja' },
                      { id: 'kosong', label: 'Rumah Kosong' },
                      { id: 'lewat', label: 'Terlewat' },
                    ].map((st) => (
                      <button
                        key={st.id}
                        onClick={() => updateCustom(p => ({ ...p, jimpitanFilterStatus: st.id as any }))}
                        className={`px-2.5 py-1 rounded-lg text-xs font-semibold cursor-pointer ${
                          customOptions.jimpitanFilterStatus === st.id
                            ? 'bg-sky-600 text-white'
                            : 'bg-stone-100 text-stone-700 hover:bg-stone-200'
                        }`}
                      >
                        {st.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <span className="font-bold text-stone-700 block mb-1">Pilihan Kolom Tabel Jimpitan:</span>
                  <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-7 gap-2">
                    {[
                      { key: 'no', label: 'Nomor' },
                      { key: 'waktu', label: 'Waktu' },
                      { key: 'nomorRumah', label: 'No. Rumah' },
                      { key: 'namaWarga', label: 'Nama Warga' },
                      { key: 'status', label: 'Status' },
                      { key: 'petugas', label: 'Petugas' },
                      { key: 'nominal', label: 'Nominal' },
                    ].map((col) => (
                      <label key={col.key} className="flex items-center space-x-1.5 cursor-pointer select-none">
                        <input
                          type="checkbox"
                          checked={customOptions.jimpitanColumns[col.key as keyof typeof customOptions.jimpitanColumns]}
                          onChange={(e) => updateCustom(p => ({
                            ...p,
                            jimpitanColumns: {
                              ...p.jimpitanColumns,
                              [col.key]: e.target.checked,
                            }
                          }))}
                          className="w-3.5 h-3.5 rounded text-sky-600 focus:ring-sky-500 cursor-pointer"
                        />
                        <span className="text-stone-800">{col.label}</span>
                      </label>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* TAB 4: Penandatangan & Catatan Khusus */}
            {configSubTab === 'ttd' && (
              <div className="bg-white p-3 rounded-xl border border-stone-200 space-y-3">
                <div className="p-2.5 rounded-lg bg-sky-50 border border-sky-200 text-sky-950 text-xs font-semibold">
                  Laporan resmi disahkan oleh <strong>Bendahara RT</strong> dan <strong>Ketua RT</strong>.
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-[10px] font-black uppercase text-stone-700 block mb-0.5">
                      1. Nama Bendahara RT (Pengelola Kas)
                    </label>
                    <input
                      type="text"
                      value={bendaharaName}
                      onChange={(e) => setBendaharaName(e.target.value)}
                      placeholder="Nama Bendahara RT"
                      className="w-full px-2.5 py-1.5 rounded-lg bg-stone-50 border border-stone-300 text-xs font-bold text-stone-800 focus:outline-none focus:bg-white"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-black uppercase text-stone-700 block mb-0.5">
                      2. Nama Ketua RT (Mengetahui & Menyetujui)
                    </label>
                    <input
                      type="text"
                      value={ketuaRtName}
                      onChange={(e) => setKetuaRtName(e.target.value)}
                      placeholder="Nama Ketua RT"
                      className="w-full px-2.5 py-1.5 rounded-lg bg-stone-50 border border-stone-300 text-xs font-bold text-stone-800 focus:outline-none focus:bg-white"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-[10px] font-black uppercase text-stone-700 block mb-0.5">
                    Catatan / Keterangan Resmi di Bagian Bawah Laporan (Opsional):
                  </label>
                  <textarea
                    rows={2}
                    value={customOptions.catatanLaporanText || ''}
                    onChange={(e) => updateCustom(p => ({ ...p, showCatatanLaporan: true, catatanLaporanText: e.target.value }))}
                    placeholder="Contoh: Laporan disahkan pada rapat pengurus RT tanggal 5. Seluruh saldo disimpan pada kas fisik dan kas bank RT."
                    className="w-full px-2.5 py-1.5 rounded-lg bg-stone-50 border border-stone-300 text-xs text-stone-800 focus:outline-none focus:bg-white"
                  />
                </div>
              </div>
            )}
          </div>
        )}

        {/* DOCUMENT PREVIEW CONTAINER (Styled like an Official A4 Sheet) */}
        <div className="p-3 sm:p-6 overflow-y-auto flex-1 bg-stone-200/70 print:p-0 print:bg-white min-h-[400px]">
          {/* Live Preview Indicator */}
          <div className="max-w-3xl mx-auto flex items-center justify-between pb-3 text-xs text-stone-600 print:hidden">
            <div className="flex items-center space-x-1.5 font-bold text-sky-900 bg-sky-100/90 px-3 py-1 rounded-xl border border-sky-300 shadow-2xs">
              <Eye className="w-4 h-4 text-sky-600" />
              <span>Pratinjau Layar Dokumen Siap Cetak (A4)</span>
            </div>
            <div className="text-[11px] text-stone-500 font-medium hidden sm:block">
              Perubahan pilihan data langsung tertera pada layar di bawah ini
            </div>
          </div>

          {filteredRecords.length === 0 && filteredMutations.length === 0 && filterType === 'bulan' && (
            <div className="max-w-3xl mx-auto mb-3 p-3 rounded-2xl bg-amber-50 border border-amber-300 text-amber-900 text-xs flex items-center justify-between shadow-2xs print:hidden">
              <div className="flex items-center space-x-2">
                <span className="font-bold">Informasi:</span>
                <span>Belum ada transaksi pada bulan {periodText}.</span>
              </div>
              <button
                type="button"
                onClick={() => setFilterType('semua')}
                className="px-3 py-1 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs shadow-2xs cursor-pointer transition-colors"
              >
                Tampilkan Semua Waktu
              </button>
            </div>
          )}

          <div className="max-w-3xl mx-auto bg-white p-4 sm:p-8 rounded-2xl shadow-sm border border-stone-300 print:border-none print:shadow-none print:p-0 text-stone-900 font-sans">
            
            {/* 1. KOP SURAT RESMI RT 08 RW 06 PLIKEN KEMBARAN */}
            {customOptions.showKopSurat && (
              <>
                <div className="border-b-2 border-stone-900 pb-2 mb-1 text-center relative">
                  <div className="space-y-0.5">
                    <h2 className="text-sm sm:text-base font-black uppercase tracking-wider text-stone-900 leading-tight">
                      PENGURUS {settings?.namaRt ? settings.namaRt.toUpperCase() : 'RUKUN TETANGGA 08'} / {settings?.namaRw ? settings.namaRw.toUpperCase() : 'RUKUN WARGA 06'}
                    </h2>
                    <h1 className="text-base sm:text-lg font-black uppercase text-sky-700 tracking-wide leading-tight">
                      DESA PLIKEN, KECAMATAN KEMBARAN
                    </h1>
                    <p className="text-[10px] sm:text-[11px] text-stone-600 font-medium">
                      Sekretariat: Lingkungan {settings?.namaRt || 'RT 08'} {settings?.namaRw || 'RW 06'} Desa Pliken, Kec. Kembaran, Kab. Banyumas 53182
                    </p>
                    <p className="text-[9px] text-stone-500 italic">
                      Layanan Jimpitan Digital RT & Pengelolaan Kas Warga
                    </p>
                  </div>
                </div>
                {/* Double underline typical of Indonesian RT Letterhead */}
                <div className="border-b border-stone-900 mb-4 sm:mb-6"></div>
              </>
            )}

            {/* 2. TITLE & PERIODE */}
            <div className="text-center mb-4 sm:mb-6">
              <h3 className="text-xs sm:text-sm font-extrabold uppercase text-stone-900 tracking-wide underline underline-offset-4">
                LAPORAN KEUANGAN KAS & REKAP JIMPITAN WARGA
              </h3>
              <p className="text-xs text-stone-600 font-semibold mt-1">
                Periode Laporan: <span className="text-stone-900 font-bold">{periodText}</span>
              </p>
            </div>

            {/* 3. RINGKASAN EKSEKUTIF KEUANGAN (EXECUTIVE SUMMARY) */}
            {customOptions.showSummaryCards && (
              <div className="mb-5 p-3 sm:p-4 rounded-xl bg-slate-50 border border-slate-200">
                <h4 className="text-[11px] font-bold uppercase text-slate-700 mb-2 flex items-center space-x-1.5">
                  <ShieldCheck className="w-3.5 h-3.5 text-sky-600" />
                  <span>Ringkasan Kas RT Periode Ini</span>
                </h4>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  <div className="p-2 sm:p-2.5 rounded-lg bg-white border border-slate-200">
                    <span className="block text-[9px] font-bold text-slate-500 uppercase">Jimpitan Masuk</span>
                    <span className="text-xs sm:text-sm font-extrabold text-sky-600 block">
                      {formatRupiah(totalJimpitan)}
                    </span>
                    <span className="block text-[8.5px] text-slate-400">{filteredRecords.length} penarikan</span>
                  </div>

                  <div className="p-2 sm:p-2.5 rounded-lg bg-white border border-slate-200">
                    <span className="block text-[9px] font-bold text-slate-500 uppercase">Pemasukan Lain</span>
                    <span className="text-xs sm:text-sm font-extrabold text-emerald-600 block">
                      {formatRupiah(totalPemasukanLain)}
                    </span>
                    <span className="block text-[8.5px] text-slate-400">Kas masuk lain</span>
                  </div>

                  <div className="p-2 sm:p-2.5 rounded-lg bg-white border border-slate-200">
                    <span className="block text-[9px] font-bold text-slate-500 uppercase">Pengeluaran</span>
                    <span className="text-xs sm:text-sm font-extrabold text-rose-600 block">
                      - {formatRupiah(totalPengeluaran)}
                    </span>
                    <span className="block text-[8.5px] text-slate-400">{filteredMutations.filter(m => m.jenis === 'keluar').length} transaksi</span>
                  </div>

                  <div className="p-2 sm:p-2.5 rounded-lg bg-sky-50/80 border border-sky-200">
                    <span className="block text-[9px] font-bold text-sky-900 uppercase">Saldo Kas Bersih</span>
                    <span className="text-xs sm:text-sm font-black text-sky-700 block">
                      {formatRupiah(displaySaldoKasBersih)}
                    </span>
                    <span className="block text-[8.5px] text-emerald-700 font-bold">
                      {filterType === 'bulan' ? `Awal: ${formatRupiah(displaySaldoAwal)}` : 'Kas Aktif'}
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* 4. TABEL 1: MUTASI PENGELUARAN & KAS MASUK RT */}
            {customOptions.showMutasiTable && (
              <div className="mb-5">
                <h4 className="text-xs font-bold text-stone-900 mb-1.5 flex items-center justify-between">
                  <span>
                    {customOptions.mutasiFilterJenis === 'keluar'
                      ? 'I. Rincian Pengeluaran Kas RT'
                      : customOptions.mutasiFilterJenis === 'masuk'
                      ? 'I. Rincian Pemasukan Kas RT (Non-Jimpitan)'
                      : 'I. Rincian Pengeluaran & Pemasukan Kas RT'}
                  </span>
                  <span className="text-[10px] font-normal text-stone-500">
                    Total: {formatRupiah(displayedMutations.reduce((s, m) => s + (m.nominal || 0), 0))} ({displayedMutations.length} data)
                  </span>
                </h4>
                
                <div className="overflow-x-auto border border-stone-200 rounded-lg">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="bg-sky-600 text-white font-bold text-[10px] sm:text-[11px]">
                        {customOptions.mutasiColumns.no && <th className="p-1.5 sm:p-2 text-center w-7">No</th>}
                        {customOptions.mutasiColumns.tanggal && <th className="p-1.5 sm:p-2 w-20 sm:w-24">Tanggal</th>}
                        {customOptions.mutasiColumns.kategori && <th className="p-1.5 sm:p-2 w-24 sm:w-28">Kategori</th>}
                        {customOptions.mutasiColumns.keterangan && <th className="p-1.5 sm:p-2">Keterangan</th>}
                        {customOptions.mutasiColumns.petugas && <th className="p-1.5 sm:p-2 w-20 sm:w-24">Petugas/PJ</th>}
                        {customOptions.mutasiColumns.nominal && <th className="p-1.5 sm:p-2 text-right w-24 sm:w-28">Nominal</th>}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-stone-200 text-[10px] sm:text-[11px]">
                      {displayedMutations.length > 0 ? (
                        displayedMutations.map((m, idx) => (
                          <tr key={m.id || idx} className={idx % 2 === 0 ? 'bg-white' : 'bg-stone-50/60'}>
                            {customOptions.mutasiColumns.no && (
                              <td className="p-1.5 sm:p-2 text-center text-stone-500">{idx + 1}</td>
                            )}
                            {customOptions.mutasiColumns.tanggal && (
                              <td className="p-1.5 sm:p-2 font-mono">{m.tanggal ? m.tanggal.split('T')[0] : '-'}</td>
                            )}
                            {customOptions.mutasiColumns.kategori && (
                              <td className="p-1.5 sm:p-2 font-medium">{m.kategori || '-'}</td>
                            )}
                            {customOptions.mutasiColumns.keterangan && (
                              <td className="p-1.5 sm:p-2 text-stone-700">{m.keterangan || '-'}</td>
                            )}
                            {customOptions.mutasiColumns.petugas && (
                              <td className="p-1.5 sm:p-2 text-stone-600">{m.petugas || '-'}</td>
                            )}
                            {customOptions.mutasiColumns.nominal && (
                              <td className={`p-1.5 sm:p-2 text-right font-bold ${m.jenis === 'masuk' ? 'text-emerald-700' : 'text-rose-700'}`}>
                                {m.jenis === 'masuk' ? '+ ' : '- '} {formatRupiah(m.nominal)}
                              </td>
                            )}
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan={6} className="p-3 text-center text-stone-400 italic">
                            Belum ada catatan mutasi kas pada kriteria ini.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* 5. TABEL 2: REKAP JIMPITAN WARGA */}
            {customOptions.showJimpitanTable && (
              <div className="mb-6">
                <h4 className="text-xs font-bold text-stone-900 mb-1.5 flex items-center justify-between">
                  <span>II. Rincian Penarikan Jimpitan Warga</span>
                  <span className="text-[10px] font-normal text-stone-500">
                    Total: {formatRupiah(displayedRecords.reduce((s, r) => s + (r.nominal || 0), 0))} ({displayedRecords.length} transaksi)
                  </span>
                </h4>
                
                <div className="overflow-x-auto border border-stone-200 rounded-lg max-h-80 overflow-y-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="bg-slate-800 text-white font-bold text-[10px] sm:text-[11px] sticky top-0 z-10">
                        {customOptions.jimpitanColumns.no && <th className="p-1.5 sm:p-2 text-center w-7">No</th>}
                        {customOptions.jimpitanColumns.waktu && <th className="p-1.5 sm:p-2 w-20 sm:w-24">Waktu</th>}
                        {customOptions.jimpitanColumns.nomorRumah && <th className="p-1.5 sm:p-2 text-center w-14 sm:w-16">Rumah</th>}
                        {customOptions.jimpitanColumns.namaWarga && <th className="p-1.5 sm:p-2">Nama Warga</th>}
                        {customOptions.jimpitanColumns.status && <th className="p-1.5 sm:p-2 text-center w-16 sm:w-20">Status</th>}
                        {customOptions.jimpitanColumns.petugas && <th className="p-1.5 sm:p-2 w-16 sm:w-20">Petugas</th>}
                        {customOptions.jimpitanColumns.nominal && <th className="p-1.5 sm:p-2 text-right w-20 sm:w-24">Nominal</th>}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-stone-200 text-[10px] sm:text-[11px]">
                      {displayedRecords.length > 0 ? (
                        displayedRecords.slice(0, 100).map((r, idx) => {
                          const matchedWarga = wargaList.find((w) => w.id === r.wargaId || w.nomorRumah === r.nomorRumah);
                          const displayCitizenName = matchedWarga?.nama || r.namaWarga;
                          const displayHouseNo = matchedWarga?.nomorRumah || r.nomorRumah;

                          return (
                            <tr key={r.id || idx} className={idx % 2 === 0 ? 'bg-white' : 'bg-stone-50/60'}>
                              {customOptions.jimpitanColumns.no && (
                                <td className="p-1.5 sm:p-2 text-center text-stone-500">{idx + 1}</td>
                              )}
                              {customOptions.jimpitanColumns.waktu && (
                                <td className="p-1.5 sm:p-2 font-mono text-[9.5px]">
                                  {r.tanggal} {r.waktu ? r.waktu.slice(0, 5) : ''}
                                </td>
                              )}
                              {customOptions.jimpitanColumns.nomorRumah && (
                                <td className="p-1.5 sm:p-2 text-center font-bold text-sky-800">
                                  No. {displayHouseNo}
                                </td>
                              )}
                              {customOptions.jimpitanColumns.namaWarga && (
                                <td className="p-1.5 sm:p-2 font-medium truncate max-w-[120px] sm:max-w-none">
                                  {displayCitizenName}
                                </td>
                              )}
                              {customOptions.jimpitanColumns.status && (
                                <td className="p-1.5 sm:p-2 text-center">
                                  <span className={`inline-block px-1 py-0.5 rounded text-[8.5px] font-extrabold uppercase ${
                                    r.status === 'sukses' 
                                      ? 'bg-emerald-100 text-emerald-800' 
                                      : r.status === 'titip' 
                                      ? 'bg-amber-100 text-amber-800' 
                                      : 'bg-stone-100 text-stone-800'
                                  }`}>
                                    {r.status}
                                  </span>
                                </td>
                              )}
                              {customOptions.jimpitanColumns.petugas && (
                                <td className="p-1.5 sm:p-2 text-stone-600 text-[9.5px]">
                                  {r.petugas || '-'}
                                </td>
                              )}
                              {customOptions.jimpitanColumns.nominal && (
                                <td className="p-1.5 sm:p-2 text-right font-bold text-sky-700">
                                  {formatRupiah(r.nominal)}
                                </td>
                              )}
                            </tr>
                          );
                        })
                      ) : (
                        <tr>
                          <td colSpan={7} className="p-3 text-center text-stone-400 italic">
                            Tidak ada transaksi jimpitan pada kriteria ini.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
                {displayedRecords.length > 100 && (
                  <p className="text-[9.5px] text-stone-400 italic mt-1">
                    * Menampilkan 100 dari {displayedRecords.length} data pada layar. Seluruh data tercantum lengkap di cetak PDF & Excel.
                  </p>
                )}
              </div>
            )}

            {/* 6. TABEL 3: REKAP TOTAL PER RUMAH / WARGA (OPSIONAL) */}
            {customOptions.showRekapPerRumahTable && (
              <div className="mb-6">
                <h4 className="text-xs font-bold text-cyan-900 mb-1.5 flex items-center justify-between">
                  <span>III. Rekapitulasi Akumulasi Jimpitan per Rumah Warga</span>
                  <span className="text-[10px] font-normal text-stone-500">
                    Total: {rekapPerRumahList.length} Rumah Warga
                  </span>
                </h4>

                <div className="overflow-x-auto border border-cyan-200 rounded-lg max-h-72 overflow-y-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="bg-cyan-700 text-white font-bold text-[10px] sm:text-[11px] sticky top-0 z-10">
                        <th className="p-1.5 sm:p-2 text-center w-7">No</th>
                        <th className="p-1.5 sm:p-2 text-center w-16">Rumah</th>
                        <th className="p-1.5 sm:p-2">Nama Kepala Keluarga</th>
                        <th className="p-1.5 sm:p-2 text-center w-24">Frekuensi</th>
                        <th className="p-1.5 sm:p-2 text-right w-28">Total Jimpitan</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-cyan-100 text-[10px] sm:text-[11px]">
                      {rekapPerRumahList.map((item, idx) => (
                        <tr key={item.noRumah || idx} className={idx % 2 === 0 ? 'bg-white' : 'bg-cyan-50/40'}>
                          <td className="p-1.5 sm:p-2 text-center text-stone-500">{idx + 1}</td>
                          <td className="p-1.5 sm:p-2 text-center font-bold text-cyan-900">No. {item.noRumah}</td>
                          <td className="p-1.5 sm:p-2 font-medium">{item.nama}</td>
                          <td className="p-1.5 sm:p-2 text-center text-stone-600">{item.count} Kali Setor</td>
                          <td className="p-1.5 sm:p-2 text-right font-bold text-cyan-800">{formatRupiah(item.total)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* 7. CATATAN KHUSUS PENGURUS RT */}
            {customOptions.showCatatanLaporan && customOptions.catatanLaporanText && (
              <div className="mb-5 p-3 rounded-xl bg-slate-50 border border-slate-300">
                <span className="font-bold text-stone-800 text-[11px] block mb-1">
                  Catatan & Keterangan Pengurus RT:
                </span>
                <p className="text-[10px] text-stone-700 leading-relaxed whitespace-pre-wrap">
                  {customOptions.catatanLaporanText}
                </p>
              </div>
            )}

            {/* 8. LEMBAR PENGESAHAN DENGAN 2 TANDA TANGAN RESMI (BENDAHARA RT & KETUA RT) */}
            {customOptions.showSignatures && (
              <div className="pt-4 border-t-2 border-stone-900 mt-6">
                <p className="text-right text-[11px] text-stone-600 mb-3">
                  Ditetapkan di Pliken, Kembaran pada tanggal: <strong>{formatTanggalIndo(new Date().toISOString().split('T')[0])}</strong>
                </p>

                <div className="grid grid-cols-2 gap-4 text-center text-[10.5px] sm:text-xs">
                  {/* 1. TTD BENDAHARA */}
                  <div className="p-1">
                    <p className="font-bold text-stone-900">Bendahara Kas RT</p>
                    <p className="text-[9.5px] text-stone-500">Pengelola Kas Jimpitan</p>
                    <div className="h-12 sm:h-14 flex items-end justify-center pb-1">
                      <span className="text-[9px] text-stone-300 italic">( TTD )</span>
                    </div>
                    <p className="font-extrabold text-stone-900 border-b border-stone-800 inline-block px-3 text-[10px] sm:text-xs">
                      ( {bendaharaName.trim() || settings?.namaBendahara || 'Bendahara RT'} )
                    </p>
                  </div>

                  {/* 2. TTD KETUA RT */}
                  <div className="p-1">
                    <p className="font-bold text-stone-900">Ketua {settings?.namaRt || 'RT 08'} {settings?.namaRw || 'RW 06'}</p>
                    <p className="text-[9.5px] text-stone-500">Mengetahui & Menyetujui</p>
                    <div className="h-12 sm:h-14 flex items-end justify-center pb-1">
                      <span className="text-[9px] text-stone-300 italic">( TTD )</span>
                    </div>
                    <p className="font-extrabold text-stone-900 border-b border-stone-800 inline-block px-3 text-[10px] sm:text-xs">
                      ( {ketuaRtName.trim() || settings?.namaKetuaRt || 'Ketua RT'} )
                    </p>
                  </div>
                </div>
              </div>
            )}

          </div>
        </div>

        {/* FOOTER BAR (Non-printable) */}
        <div className="p-3 sm:p-4 bg-stone-50 border-t border-stone-200 flex items-center justify-between print:hidden flex-shrink-0">
          <p className="text-xs text-stone-500 hidden sm:block">
            Kop Resmi: <strong>{settings?.namaRt || 'RT 08'} {settings?.namaRw || 'RW 06'} Desa Pliken, Kembaran</strong>
          </p>

          <div className="flex items-center space-x-2 w-full sm:w-auto justify-end">
            <button
              onClick={onClose}
              className="px-3.5 py-2 rounded-xl bg-white border border-stone-300 text-stone-700 text-xs font-bold hover:bg-stone-100 transition-colors cursor-pointer"
            >
              Tutup
            </button>
            <button
              onClick={handleDownloadExcel}
              disabled={isGeneratingExcel}
              className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-extrabold flex items-center space-x-1.5 shadow-xs transition-colors cursor-pointer disabled:opacity-50"
              title="Unduh Lembar Kerja Excel (.xlsx) dengan data yang dipilih"
            >
              <FileSpreadsheet className="w-3.5 h-3.5" />
              <span>{isGeneratingExcel ? 'Menyiapkan...' : 'Excel (.xlsx)'}</span>
            </button>
            <button
              onClick={handleDownloadPdf}
              disabled={isGeneratingPdf}
              className="px-4 py-2 rounded-xl bg-sky-600 hover:bg-sky-700 text-white text-xs font-extrabold flex items-center space-x-1.5 shadow-xs transition-colors cursor-pointer disabled:opacity-50"
              title="Unduh Dokumen PDF Resmi dengan data yang dipilih"
            >
              <Download className="w-3.5 h-3.5" />
              <span>{isGeneratingPdf ? 'Membuat PDF...' : 'Download PDF'}</span>
            </button>
          </div>
        </div>

      </div>
    </div>
  );

  if (typeof document !== 'undefined') {
    return createPortal(modalContent, document.body);
  }

  return modalContent;
};
