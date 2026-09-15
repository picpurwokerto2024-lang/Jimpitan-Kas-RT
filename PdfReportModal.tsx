import React, { useState } from 'react';
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
  ShieldCheck
} from 'lucide-react';
import { JimpitanRecord, KasMutation, AppSettings } from '../types';
import { formatRupiah, formatTanggalIndo } from '../utils/formatters';
import { generateKasReportPdf } from '../utils/pdfReportGenerator';

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
  allRecords,
  kasMutations,
  settings,
  selectedDate,
}) => {
  // Period filter state
  const [currYear, currMonth] = selectedDate.split('-');
  const [selectedMonth, setSelectedMonth] = useState<string>(`${currYear}-${currMonth}`);
  const [filterType, setFilterType] = useState<'bulan' | 'hari' | 'semua'>('bulan');
  const [isGenerating, setIsGenerating] = useState<boolean>(false);

  if (!isOpen) return null;

  // Filter records according to selected period
  const filteredRecords = allRecords.filter((record) => {
    if (filterType === 'hari') {
      return record.tanggal === selectedDate;
    }
    if (filterType === 'bulan') {
      return record.tanggal.startsWith(selectedMonth);
    }
    return true; // semua
  });

  // Filter mutations according to selected period
  const filteredMutations = kasMutations.filter((m) => {
    if (filterType === 'hari') {
      return m.tanggal === selectedDate;
    }
    if (filterType === 'bulan') {
      return m.tanggal.startsWith(selectedMonth);
    }
    return true; // semua
  });

  // Financial summary
  const totalJimpitan = filteredRecords.reduce((sum, r) => sum + r.nominal, 0);
  const totalPemasukanLain = filteredMutations
    .filter((m) => m.jenis === 'masuk')
    .reduce((sum, m) => sum + m.nominal, 0);
  const totalPengeluaran = filteredMutations
    .filter((m) => m.jenis === 'keluar')
    .reduce((sum, m) => sum + m.nominal, 0);
  const totalPemasukanAll = totalJimpitan + totalPemasukanLain;
  const saldoPeriode = totalPemasukanAll - totalPengeluaran;

  // Overall Kas balance for settings
  const saldoAwalKas = Number(settings.saldoAwalKas) || 0;
  const allTimeJimpitan = allRecords.reduce((sum, r) => sum + r.nominal, 0);
  const allTimePemasukan = kasMutations.filter((m) => m.jenis === 'masuk').reduce((sum, m) => sum + m.nominal, 0);
  const allTimePengeluaran = kasMutations.filter((m) => m.jenis === 'keluar').reduce((sum, m) => sum + m.nominal, 0);
  const totalSaldoKasAllTime = saldoAwalKas + allTimeJimpitan + allTimePemasukan - allTimePengeluaran;

  // Period label text
  let periodText = '';
  if (filterType === 'hari') {
    periodText = formatTanggalIndo(selectedDate);
  } else if (filterType === 'bulan') {
    const [y, m] = selectedMonth.split('-').map(Number);
    const dateObj = new Date(y, m - 1, 1);
    periodText = dateObj.toLocaleDateString('id-ID', { month: 'long', year: 'numeric' });
  } else {
    periodText = 'Semua Waktu (Kumulatif Keseluruhan)';
  }

  const handleDownloadPdf = () => {
    setIsGenerating(true);
    try {
      generateKasReportPdf({
        records: filteredRecords,
        mutations: filteredMutations,
        settings,
        periodText,
        totalSaldoKas: totalSaldoKasAllTime,
      });
    } catch (err) {
      console.error('Error generating PDF:', err);
      alert('Gagal membuat PDF. Silakan gunakan tombol Cetak Langsung.');
    } finally {
      setIsGenerating(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 bg-black/65 backdrop-blur-xs z-50 flex items-center justify-center p-2 sm:p-4 overflow-y-auto">
      <div className="bg-white rounded-3xl border border-stone-200 shadow-2xl max-w-4xl w-full my-4 overflow-hidden flex flex-col max-h-[94vh] animate-in fade-in zoom-in-95">
        
        {/* HEADER BAR (Non-printable) */}
        <div className="p-4 sm:p-5 border-b border-stone-200 flex items-center justify-between bg-stone-50/80 print:hidden flex-shrink-0">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-2xl bg-sky-500 text-white flex items-center justify-center shadow-xs">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-extrabold text-stone-900 text-base sm:text-lg">
                Export Laporan Kas & Jimpitan ke PDF
              </h3>
              <p className="text-xs text-stone-500">
                Format resmi dengan Kop Surat RT 08 RW 06 Pliken Kembaran
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-9 h-9 rounded-xl border border-stone-200 flex items-center justify-center text-stone-400 hover:text-stone-700 hover:bg-stone-100 transition-colors cursor-pointer"
            id="btn-close-pdf-modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* CONTROLS BAR (Non-printable) */}
        <div className="p-4 bg-sky-50/60 border-b border-sky-100 flex flex-wrap items-center justify-between gap-3 print:hidden flex-shrink-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-bold text-sky-950">Pilih Periode:</span>
            
            <button
              onClick={() => setFilterType('bulan')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                filterType === 'bulan'
                  ? 'bg-sky-500 text-white shadow-xs'
                  : 'bg-white text-stone-700 border border-sky-200 hover:bg-sky-100'
              }`}
            >
              Bulanan
            </button>

            <button
              onClick={() => setFilterType('hari')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                filterType === 'hari'
                  ? 'bg-sky-500 text-white shadow-xs'
                  : 'bg-white text-stone-700 border border-sky-200 hover:bg-sky-100'
              }`}
            >
              Harian ({selectedDate})
            </button>

            <button
              onClick={() => setFilterType('semua')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                filterType === 'semua'
                  ? 'bg-sky-500 text-white shadow-xs'
                  : 'bg-white text-stone-700 border border-sky-200 hover:bg-sky-100'
              }`}
            >
              Semua Waktu
            </button>

            {filterType === 'bulan' && (
              <input
                type="month"
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
                className="px-3 py-1.5 rounded-xl bg-white border border-sky-300 text-xs font-bold text-stone-800 outline-none shadow-2xs"
              />
            )}
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={handlePrint}
              className="px-3.5 py-2 rounded-xl bg-white hover:bg-stone-50 border border-stone-300 text-stone-800 text-xs font-bold flex items-center space-x-1.5 shadow-2xs transition-colors cursor-pointer"
              title="Cetak via browser atau simpan ke PDF"
              id="btn-print-report"
            >
              <Printer className="w-3.5 h-3.5 text-stone-600" />
              <span>Cetak / Print</span>
            </button>

            <button
              onClick={handleDownloadPdf}
              disabled={isGenerating}
              className="px-4 py-2 rounded-xl bg-sky-500 hover:bg-sky-600 text-white text-xs font-extrabold flex items-center space-x-1.5 shadow-xs transition-colors cursor-pointer disabled:opacity-50"
              id="btn-download-pdf-direct"
            >
              <Download className="w-3.5 h-3.5" />
              <span>{isGenerating ? 'Membuat PDF...' : 'Download File PDF'}</span>
            </button>
          </div>
        </div>

        {/* DOCUMENT PREVIEW CONTAINER (Styled like an A4 Sheet) */}
        <div className="p-4 sm:p-8 overflow-y-auto flex-1 bg-stone-100/70 print:p-0 print:bg-white">
          <div className="max-w-3xl mx-auto bg-white p-6 sm:p-10 rounded-2xl shadow-sm border border-stone-200 print:border-none print:shadow-none print:p-0 text-stone-900 font-sans">
            
            {/* 1. KOP SURAT RESMI RT 08 RW 06 PLIKEN KEMBARAN */}
            <div className="border-b-2 border-stone-900 pb-2 mb-1 text-center relative">
              <div className="space-y-0.5">
                <h2 className="text-base sm:text-lg font-black uppercase tracking-wider text-stone-900 leading-tight">
                  PENGURUS RUKUN TETANGGA 08 / RUKUN WARGA 06
                </h2>
                <h1 className="text-lg sm:text-xl font-black uppercase text-sky-700 tracking-wide leading-tight">
                  DESA PLIKEN, KECAMATAN KEMBARAN
                </h1>
                <p className="text-[11px] sm:text-xs text-stone-600 font-medium">
                  Sekretariat: Lingkungan RT 08 RW 06 Desa Pliken, Kec. Kembaran, Kab. Banyumas 53182
                </p>
                <p className="text-[10px] text-stone-500 italic">
                  Layanan Jimpitan Digital RT & Pengelolaan Dana Warga
                </p>
              </div>
            </div>
            {/* Double underline border typical of Indonesian RT Letterhead */}
            <div className="border-b border-stone-900 mb-6"></div>

            {/* 2. TITLE & PERIODE */}
            <div className="text-center mb-6">
              <h3 className="text-sm sm:text-base font-extrabold uppercase text-stone-900 tracking-wide underline underline-offset-4">
                LAPORAN KEUANGAN KAS & REKAP JIMPITAN WARGA
              </h3>
              <p className="text-xs text-stone-600 font-semibold mt-1">
                Periode Laporan: <span className="text-stone-900 font-bold">{periodText}</span>
              </p>
            </div>

            {/* 3. RINGKASAN EKSEKUTIF KEUANGAN (EXECUTIVE SUMMARY) */}
            <div className="mb-6 p-4 rounded-xl bg-slate-50 border border-slate-200">
              <h4 className="text-xs font-bold uppercase text-slate-700 mb-2.5 flex items-center space-x-1.5">
                <ShieldCheck className="w-3.5 h-3.5 text-sky-600" />
                <span>Ringkasan Kas RT Periode Terpilih</span>
              </h4>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                <div className="p-2.5 rounded-lg bg-white border border-slate-200">
                  <span className="block text-[10px] font-bold text-slate-500 uppercase">Jimpitan Masuk</span>
                  <span className="text-xs sm:text-sm font-extrabold text-sky-600">
                    {formatRupiah(totalJimpitan)}
                  </span>
                  <span className="block text-[9px] text-slate-400">{filteredRecords.length} penarikan</span>
                </div>

                <div className="p-2.5 rounded-lg bg-white border border-slate-200">
                  <span className="block text-[10px] font-bold text-slate-500 uppercase">Pemasukan Lain</span>
                  <span className="text-xs sm:text-sm font-extrabold text-emerald-600">
                    {formatRupiah(totalPemasukanLain)}
                  </span>
                  <span className="block text-[9px] text-slate-400">Kas masuk lain</span>
                </div>

                <div className="p-2.5 rounded-lg bg-white border border-slate-200">
                  <span className="block text-[10px] font-bold text-slate-500 uppercase">Pengeluaran</span>
                  <span className="text-xs sm:text-sm font-extrabold text-rose-600">
                    - {formatRupiah(totalPengeluaran)}
                  </span>
                  <span className="block text-[9px] text-slate-400">{filteredMutations.filter(m => m.jenis === 'keluar').length} transaksi</span>
                </div>

                <div className="p-2.5 rounded-lg bg-sky-50/80 border border-sky-200">
                  <span className="block text-[10px] font-bold text-sky-900 uppercase">Saldo Kas Bersih</span>
                  <span className="text-xs sm:text-sm font-black text-sky-700">
                    {formatRupiah(totalSaldoKasAllTime)}
                  </span>
                  <span className="block text-[9px] text-emerald-600 font-bold">Kas Terverifikasi</span>
                </div>
              </div>
            </div>

            {/* 4. TABEL 1: MUTASI PENGELUARAN / KAS RT */}
            <div className="mb-6">
              <h4 className="text-xs font-bold text-stone-900 mb-2">
                I. Rincian Pengeluaran & Belanja Kas RT
              </h4>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border border-stone-200 border-collapse">
                  <thead>
                    <tr className="bg-sky-600 text-white font-bold text-[11px]">
                      <th className="p-2 border border-sky-700 text-center w-8">No</th>
                      <th className="p-2 border border-sky-700 w-24">Tanggal</th>
                      <th className="p-2 border border-sky-700 w-32">Kategori</th>
                      <th className="p-2 border border-sky-700">Keterangan Pengeluaran</th>
                      <th className="p-2 border border-sky-700 w-28">Petugas/PJ</th>
                      <th className="p-2 border border-sky-700 text-right w-28">Nominal (Rp)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-stone-200 text-[11px]">
                    {filteredMutations.length > 0 ? (
                      filteredMutations.map((m, idx) => (
                        <tr key={m.id} className={idx % 2 === 0 ? 'bg-white' : 'bg-stone-50'}>
                          <td className="p-2 border border-stone-200 text-center">{idx + 1}</td>
                          <td className="p-2 border border-stone-200 font-mono">{m.tanggal}</td>
                          <td className="p-2 border border-stone-200 font-medium">{m.kategori}</td>
                          <td className="p-2 border border-stone-200">{m.keterangan}</td>
                          <td className="p-2 border border-stone-200 text-stone-600">{m.petugas || '-'}</td>
                          <td className={`p-2 border border-stone-200 text-right font-bold ${m.jenis === 'masuk' ? 'text-emerald-700' : 'text-rose-700'}`}>
                            {m.jenis === 'masuk' ? '+ ' : '- '} {formatRupiah(m.nominal)}
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={6} className="p-3 text-center text-stone-400 italic">
                          Belum ada catatan mutasi pengeluaran kas pada periode ini.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* 5. TABEL 2: REKAP JIMPITAN WARGA */}
            <div className="mb-8">
              <h4 className="text-xs font-bold text-stone-900 mb-2">
                II. Rincian Penarikan Jimpitan Warga
              </h4>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border border-stone-200 border-collapse">
                  <thead>
                    <tr className="bg-slate-800 text-white font-bold text-[11px]">
                      <th className="p-2 border border-slate-900 text-center w-8">No</th>
                      <th className="p-2 border border-slate-900 w-28">Waktu</th>
                      <th className="p-2 border border-slate-900 text-center w-16">Rumah</th>
                      <th className="p-2 border border-slate-900">Nama Kepala Keluarga</th>
                      <th className="p-2 border border-slate-900 text-center w-20">Status</th>
                      <th className="p-2 border border-slate-900 w-32">Petugas</th>
                      <th className="p-2 border border-slate-900 text-right w-24">Nominal</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-stone-200 text-[11px]">
                    {filteredRecords.length > 0 ? (
                      filteredRecords.slice(0, 100).map((r, idx) => (
                        <tr key={r.id} className={idx % 2 === 0 ? 'bg-white' : 'bg-stone-50'}>
                          <td className="p-2 border border-stone-200 text-center">{idx + 1}</td>
                          <td className="p-2 border border-stone-200 font-mono text-[10px]">
                            {r.tanggal} {r.waktu || ''}
                          </td>
                          <td className="p-2 border border-stone-200 text-center font-bold text-sky-800">
                            No. {r.nomorRumah}
                          </td>
                          <td className="p-2 border border-stone-200 font-medium">{r.namaWarga}</td>
                          <td className="p-2 border border-stone-200 text-center">
                            <span className="inline-block px-1.5 py-0.5 rounded text-[9px] font-extrabold bg-stone-100 text-stone-800 uppercase">
                              {r.status}
                            </span>
                          </td>
                          <td className="p-2 border border-stone-200 text-stone-600 text-[10px]">
                            {r.petugas || r.reguNama}
                          </td>
                          <td className="p-2 border border-stone-200 text-right font-bold text-sky-700">
                            {formatRupiah(r.nominal)}
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={7} className="p-3 text-center text-stone-400 italic">
                          Tidak ada transaksi jimpitan pada periode ini.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
              {filteredRecords.length > 100 && (
                <p className="text-[10px] text-stone-400 italic mt-1">
                  * Menampilkan 100 dari {filteredRecords.length} transaksi pada pratinjau. Seluruh data disertakan dalam file PDF.
                </p>
              )}
            </div>

            {/* 6. LEMBAR PENGESAHAN & TANDA TANGAN */}
            <div className="pt-4 border-t border-stone-200">
              <p className="text-right text-xs text-stone-600 mb-4">
                Pliken, Kembaran, {formatTanggalIndo(new Date().toISOString().split('T')[0])}
              </p>

              <div className="grid grid-cols-3 text-center text-xs">
                <div>
                  <p className="font-bold text-stone-800">Ketua RT 08 RW 06</p>
                  <p className="text-[10px] text-stone-500">Desa Pliken Kembaran</p>
                  <div className="h-16"></div>
                  <p className="font-bold text-stone-900 border-b border-stone-400 inline-block px-4">
                    ( .................................... )
                  </p>
                </div>

                <div>
                  <p className="font-bold text-stone-800">Bendahara RT</p>
                  <p className="text-[10px] text-stone-500">Pengelola Kas & Jimpitan</p>
                  <div className="h-16"></div>
                  <p className="font-bold text-stone-900 border-b border-stone-400 inline-block px-4">
                    ( .................................... )
                  </p>
                </div>

                <div>
                  <p className="font-bold text-stone-800">Koordinator Petugas</p>
                  <p className="text-[10px] text-stone-500">Petugas Lapangan</p>
                  <div className="h-16"></div>
                  <p className="font-bold text-stone-900 border-b border-stone-400 inline-block px-4">
                    ( .................................... )
                  </p>
                </div>
              </div>
            </div>

          </div>
        </div>

        {/* FOOTER BAR (Non-printable) */}
        <div className="p-4 bg-stone-50 border-t border-stone-200 flex items-center justify-between print:hidden flex-shrink-0">
          <p className="text-xs text-stone-500">
            Kop Surat: <strong>RT 08 RW 06 Desa Pliken, Kembaran</strong>
          </p>

          <div className="flex items-center space-x-2">
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-white border border-stone-300 text-stone-700 text-xs font-bold hover:bg-stone-100 transition-colors cursor-pointer"
            >
              Tutup
            </button>
            <button
              onClick={handleDownloadPdf}
              disabled={isGenerating}
              className="px-4 py-2 rounded-xl bg-sky-500 hover:bg-sky-600 text-white text-xs font-extrabold flex items-center space-x-1.5 shadow-xs transition-colors cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              <span>{isGenerating ? 'Menyiapkan...' : 'Download PDF Sekarang'}</span>
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
