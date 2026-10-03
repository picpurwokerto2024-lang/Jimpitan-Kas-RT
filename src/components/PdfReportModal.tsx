import React, { useState, useMemo, useEffect } from 'react';
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
  UserCheck
} from 'lucide-react';
import { JimpitanRecord, KasMutation, AppSettings } from '../types';
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
}

export const PdfReportModal: React.FC<PdfReportModalProps> = ({
  isOpen,
  onClose,
  allRecords = [],
  kasMutations = [],
  settings,
  selectedDate,
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

  // Editable 3 Signature Names with default prefill
  const [petugasName, setPetugasName] = useState<string>('');
  const [bendaharaName, setBendaharaName] = useState<string>(settings?.namaBendahara || 'Bendahara RT');
  const [ketuaRtName, setKetuaRtName] = useState<string>(settings?.namaKetuaRt || 'Ketua RT');
  const [showEditSignatures, setShowEditSignatures] = useState<boolean>(false);

  useEffect(() => {
    if (settings) {
      if (settings.namaBendahara) setBendaharaName(settings.namaBendahara);
      if (settings.namaKetuaRt) setKetuaRtName(settings.namaKetuaRt);
    }
  }, [settings]);

  if (!isOpen) return null;

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

  // Handle PDF file generation
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
      });
    } catch (err) {
      console.error('Error generating PDF:', err);
      alert('Gagal membuat file PDF. Silakan gunakan tombol Cetak Langsung.');
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  // Handle Excel file generation
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

  return (
    <div className="fixed inset-0 bg-black/75 backdrop-blur-xs z-50 flex items-center justify-center p-2 sm:p-4 overflow-y-auto print:p-0 print:bg-white print:static print:overflow-visible">
      <div className="bg-white rounded-3xl border border-stone-200 shadow-2xl max-w-4xl w-full my-auto overflow-hidden flex flex-col max-h-[96vh] sm:max-h-[92vh] animate-in fade-in zoom-in-95 print:max-h-none print:shadow-none print:border-none print:m-0 print:rounded-none">
        
        {/* HEADER BAR (Non-printable) */}
        <div className="p-4 sm:p-5 border-b border-stone-200 flex items-center justify-between bg-stone-50/90 print:hidden flex-shrink-0">
          <div className="flex items-center space-x-3 min-w-0">
            <div className="w-10 h-10 rounded-2xl bg-sky-600 text-white flex items-center justify-center shadow-xs flex-shrink-0">
              <FileText className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center space-x-2">
                <h3 className="font-extrabold text-stone-900 text-sm sm:text-base truncate">
                  Pratinjau Laporan Kas (3 TTD Resmi)
                </h3>
                <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-300 text-[10px] font-black shrink-0">
                  Resmi RT
                </span>
              </div>
              <p className="text-xs text-stone-500 truncate">
                Format Surat Resmi dengan Kop & 3 Tanda Tangan Pengurus RT
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-1.5 flex-shrink-0">
            <button
              onClick={() => setShowEditSignatures(!showEditSignatures)}
              className="p-2 rounded-xl text-stone-600 hover:text-sky-700 hover:bg-sky-50 transition-colors cursor-pointer border border-stone-200"
              title="Ubah Nama Penandatangan"
            >
              <Edit3 className="w-4 h-4" />
            </button>
            <button
              onClick={onClose}
              className="p-2 rounded-xl text-stone-400 hover:text-stone-700 hover:bg-stone-100 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* CONTROLS BAR (Non-printable) */}
        <div className="p-3 sm:p-4 bg-sky-50/80 border-b border-sky-100 flex flex-wrap items-center justify-between gap-2.5 print:hidden flex-shrink-0">
          <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
            <span className="text-xs font-bold text-sky-950 mr-1">Periode:</span>
            
            <button
              onClick={() => setFilterType('bulan')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                filterType === 'bulan'
                  ? 'bg-sky-600 text-white shadow-2xs'
                  : 'bg-white text-stone-700 border border-sky-200 hover:bg-sky-100'
              }`}
            >
              Bulanan
            </button>

            <button
              onClick={() => setFilterType('hari')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                filterType === 'hari'
                  ? 'bg-sky-600 text-white shadow-2xs'
                  : 'bg-white text-stone-700 border border-sky-200 hover:bg-sky-100'
              }`}
            >
              Harian
            </button>

            <button
              onClick={() => setFilterType('semua')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
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
                className="px-2.5 py-1.5 rounded-xl bg-white border border-sky-300 text-xs font-bold text-stone-800 outline-none shadow-2xs"
              />
            )}
          </div>

          <div className="flex items-center space-x-1.5 sm:space-x-2">
            <button
              onClick={handlePrint}
              className="px-3 py-1.5 sm:px-3.5 sm:py-2 rounded-xl bg-white hover:bg-stone-50 border border-stone-300 text-stone-800 text-xs font-bold flex items-center space-x-1 shadow-2xs transition-colors cursor-pointer"
              title="Cetak via browser"
            >
              <Printer className="w-3.5 h-3.5 text-stone-600" />
              <span className="hidden sm:inline">Cetak</span>
            </button>

            <button
              onClick={handleDownloadPdf}
              disabled={isGeneratingPdf}
              className="px-3.5 py-1.5 sm:px-4 sm:py-2 rounded-xl bg-sky-600 hover:bg-sky-700 text-white text-xs font-extrabold flex items-center space-x-1.5 shadow-2xs transition-colors cursor-pointer disabled:opacity-50"
              title="Unduh File PDF Dokumen 3 TTD Resmi"
            >
              <Download className="w-3.5 h-3.5" />
              <span>{isGeneratingPdf ? 'Membuat...' : 'Download PDF'}</span>
            </button>
          </div>
        </div>

        {/* OPTIONAL EDIT SIGNATURE NAMES ACCORDION */}
        {showEditSignatures && (
          <div className="p-3 sm:p-4 bg-amber-50/90 border-b border-amber-200 print:hidden grid grid-cols-1 sm:grid-cols-3 gap-2.5 animate-in fade-in slide-in-from-top-2">
            <div>
              <label className="text-[10px] font-black uppercase text-amber-900 block mb-0.5">
                1. Nama Petugas Ronda
              </label>
              <input
                type="text"
                value={petugasName}
                onChange={(e) => setPetugasName(e.target.value)}
                placeholder="Nama Petugas Ronda"
                className="w-full px-2.5 py-1 rounded-lg bg-white border border-amber-300 text-xs font-bold text-stone-800 focus:outline-none"
              />
            </div>
            <div>
              <label className="text-[10px] font-black uppercase text-amber-900 block mb-0.5">
                2. Nama Bendahara RT
              </label>
              <input
                type="text"
                value={bendaharaName}
                onChange={(e) => setBendaharaName(e.target.value)}
                placeholder="Nama Bendahara RT"
                className="w-full px-2.5 py-1 rounded-lg bg-white border border-amber-300 text-xs font-bold text-stone-800 focus:outline-none"
              />
            </div>
            <div>
              <label className="text-[10px] font-black uppercase text-amber-900 block mb-0.5">
                3. Nama Ketua RT
              </label>
              <input
                type="text"
                value={ketuaRtName}
                onChange={(e) => setKetuaRtName(e.target.value)}
                placeholder="Nama Ketua RT"
                className="w-full px-2.5 py-1 rounded-lg bg-white border border-amber-300 text-xs font-bold text-stone-800 focus:outline-none"
              />
            </div>
          </div>
        )}

        {/* DOCUMENT PREVIEW CONTAINER (Styled like an Official A4 Sheet) */}
        <div className="p-3 sm:p-6 overflow-y-auto flex-1 bg-stone-200/70 print:p-0 print:bg-white min-h-[400px]">
          <div className="max-w-3xl mx-auto bg-white p-4 sm:p-8 rounded-2xl shadow-sm border border-stone-300 print:border-none print:shadow-none print:p-0 text-stone-900 font-sans">
            
            {/* 1. KOP SURAT RESMI RT 08 RW 06 PLIKEN KEMBARAN */}
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

            {/* 4. TABEL 1: MUTASI PENGELUARAN / KAS RT */}
            <div className="mb-5">
              <h4 className="text-xs font-bold text-stone-900 mb-1.5 flex items-center justify-between">
                <span>I. Rincian Pengeluaran & Belanja Kas RT</span>
                <span className="text-[10px] font-normal text-stone-500">Total: {formatRupiah(totalPengeluaran)}</span>
              </h4>
              
              {/* Responsive Container for Mobile & Print */}
              <div className="overflow-x-auto border border-stone-200 rounded-lg">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-sky-600 text-white font-bold text-[10px] sm:text-[11px]">
                      <th className="p-1.5 sm:p-2 text-center w-7">No</th>
                      <th className="p-1.5 sm:p-2 w-20 sm:w-24">Tanggal</th>
                      <th className="p-1.5 sm:p-2 w-24 sm:w-28">Kategori</th>
                      <th className="p-1.5 sm:p-2">Keterangan</th>
                      <th className="p-1.5 sm:p-2 text-right w-24 sm:w-28">Nominal</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-stone-200 text-[10px] sm:text-[11px]">
                    {filteredMutations.length > 0 ? (
                      filteredMutations.map((m, idx) => (
                        <tr key={m.id || idx} className={idx % 2 === 0 ? 'bg-white' : 'bg-stone-50/60'}>
                          <td className="p-1.5 sm:p-2 text-center text-stone-500">{idx + 1}</td>
                          <td className="p-1.5 sm:p-2 font-mono">{m.tanggal ? m.tanggal.split('T')[0] : '-'}</td>
                          <td className="p-1.5 sm:p-2 font-medium">{m.kategori || '-'}</td>
                          <td className="p-1.5 sm:p-2 text-stone-700">{m.keterangan || '-'}</td>
                          <td className={`p-1.5 sm:p-2 text-right font-bold ${m.jenis === 'masuk' ? 'text-emerald-700' : 'text-rose-700'}`}>
                            {m.jenis === 'masuk' ? '+ ' : '- '} {formatRupiah(m.nominal)}
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={5} className="p-3 text-center text-stone-400 italic">
                          Belum ada catatan mutasi pengeluaran kas pada periode ini.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* 5. TABEL 2: REKAP JIMPITAN WARGA */}
            <div className="mb-6">
              <h4 className="text-xs font-bold text-stone-900 mb-1.5 flex items-center justify-between">
                <span>II. Rincian Penarikan Jimpitan Warga</span>
                <span className="text-[10px] font-normal text-stone-500">Total: {formatRupiah(totalJimpitan)}</span>
              </h4>
              
              <div className="overflow-x-auto border border-stone-200 rounded-lg max-h-80 overflow-y-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-800 text-white font-bold text-[10px] sm:text-[11px] sticky top-0 z-10">
                      <th className="p-1.5 sm:p-2 text-center w-7">No</th>
                      <th className="p-1.5 sm:p-2 w-20 sm:w-24">Waktu</th>
                      <th className="p-1.5 sm:p-2 text-center w-14 sm:w-16">Rumah</th>
                      <th className="p-1.5 sm:p-2">Nama Warga</th>
                      <th className="p-1.5 sm:p-2 text-center w-16 sm:w-20">Status</th>
                      <th className="p-1.5 sm:p-2 text-right w-20 sm:w-24">Nominal</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-stone-200 text-[10px] sm:text-[11px]">
                    {filteredRecords.length > 0 ? (
                      filteredRecords.slice(0, 100).map((r, idx) => (
                        <tr key={r.id || idx} className={idx % 2 === 0 ? 'bg-white' : 'bg-stone-50/60'}>
                          <td className="p-1.5 sm:p-2 text-center text-stone-500">{idx + 1}</td>
                          <td className="p-1.5 sm:p-2 font-mono text-[9.5px]">
                            {r.tanggal} {r.waktu ? r.waktu.slice(0, 5) : ''}
                          </td>
                          <td className="p-1.5 sm:p-2 text-center font-bold text-sky-800">
                            No. {r.nomorRumah}
                          </td>
                          <td className="p-1.5 sm:p-2 font-medium truncate max-w-[120px] sm:max-w-none">
                            {r.namaWarga}
                          </td>
                          <td className="p-1.5 sm:p-2 text-center">
                            <span className="inline-block px-1 py-0.5 rounded text-[8.5px] font-extrabold bg-stone-100 text-stone-800 uppercase">
                              {r.status}
                            </span>
                          </td>
                          <td className="p-1.5 sm:p-2 text-right font-bold text-sky-700">
                            {formatRupiah(r.nominal)}
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={6} className="p-3 text-center text-stone-400 italic">
                          Tidak ada transaksi jimpitan pada periode ini.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
              {filteredRecords.length > 100 && (
                <p className="text-[9.5px] text-stone-400 italic mt-1">
                  * Menampilkan 100 dari {filteredRecords.length} transaksi di pratinjau layar. Seluruh transaksi lengkap tersimpan di file PDF.
                </p>
              )}
            </div>

            {/* 6. LEMBAR PENGESAHAN DENGAN 3 TANDA TANGAN RESMI */}
            <div className="pt-4 border-t-2 border-stone-900 mt-6">
              <p className="text-right text-[11px] text-stone-600 mb-3">
                Ditetapkan di Pliken, Kembaran pada tanggal: <strong>{formatTanggalIndo(new Date().toISOString().split('T')[0])}</strong>
              </p>

              <div className="grid grid-cols-3 gap-2 text-center text-[10.5px] sm:text-xs">
                {/* 1. TTD PETUGAS */}
                <div className="p-1">
                  <p className="font-bold text-stone-900">Petugas Ronda</p>
                  <p className="text-[9.5px] text-stone-500">Penarik Jimpitan</p>
                  <div className="h-12 sm:h-14 flex items-end justify-center pb-1">
                    <span className="text-[9px] text-stone-300 italic">( TTD )</span>
                  </div>
                  <p className="font-extrabold text-stone-900 border-b border-stone-800 inline-block px-2 text-[10px] sm:text-xs">
                    ( {petugasName.trim() || 'Petugas Lapangan'} )
                  </p>
                </div>

                {/* 2. TTD BENDAHARA */}
                <div className="p-1">
                  <p className="font-bold text-stone-900">Bendahara RT</p>
                  <p className="text-[9.5px] text-stone-500">Pengelola Kas</p>
                  <div className="h-12 sm:h-14 flex items-end justify-center pb-1">
                    <span className="text-[9px] text-stone-300 italic">( TTD )</span>
                  </div>
                  <p className="font-extrabold text-stone-900 border-b border-stone-800 inline-block px-2 text-[10px] sm:text-xs">
                    ( {bendaharaName.trim() || settings?.namaBendahara || 'Bendahara RT'} )
                  </p>
                </div>

                {/* 3. TTD KETUA RT */}
                <div className="p-1">
                  <p className="font-bold text-stone-900">Ketua {settings?.namaRt || 'RT 08'}</p>
                  <p className="text-[9.5px] text-stone-500">Mengetahui & Menyetujui</p>
                  <div className="h-12 sm:h-14 flex items-end justify-center pb-1">
                    <span className="text-[9px] text-stone-300 italic">( TTD )</span>
                  </div>
                  <p className="font-extrabold text-stone-900 border-b border-stone-800 inline-block px-2 text-[10px] sm:text-xs">
                    ( {ketuaRtName.trim() || settings?.namaKetuaRt || 'Ketua RT'} )
                  </p>
                </div>
              </div>
            </div>

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
              title="Unduh Lembar Kerja Excel (.xlsx) dengan Kop Surat & 3 Tanda Tangan"
            >
              <FileSpreadsheet className="w-3.5 h-3.5" />
              <span>{isGeneratingExcel ? 'Menyiapkan...' : 'Excel (.xlsx)'}</span>
            </button>
            <button
              onClick={handleDownloadPdf}
              disabled={isGeneratingPdf}
              className="px-4 py-2 rounded-xl bg-sky-600 hover:bg-sky-700 text-white text-xs font-extrabold flex items-center space-x-1.5 shadow-xs transition-colors cursor-pointer disabled:opacity-50"
              title="Unduh Dokumen PDF 3 TTD Resmi"
            >
              <Download className="w-3.5 h-3.5" />
              <span>{isGeneratingPdf ? 'Membuat PDF...' : 'Download PDF'}</span>
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
