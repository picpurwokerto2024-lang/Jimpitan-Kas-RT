import React, { useState } from 'react';
import {
  FileText,
  Download,
  Printer,
  X,
  Calendar,
  CheckCircle2,
  Users,
  ShieldCheck,
  Award,
  Sparkles,
  DollarSign,
  UserCheck
} from 'lucide-react';
import { AppSettings } from '../types';
import { formatRupiah } from '../utils/formatters';
import {
  generateWargaMonthlyReportPdf,
  WargaMonthlyReportPdfItem,
  WargaMonthlyPdfSummaryKpis
} from '../utils/pdfReportGenerator';

interface LaporanWargaPdfModalProps {
  isOpen: boolean;
  onClose: () => void;
  wargaData: WargaMonthlyReportPdfItem[];
  summaryKpis: WargaMonthlyPdfSummaryKpis;
  settings: AppSettings;
  activeMonthLabel: string;
  daysInMonth: number;
  activeYearMonth: string;
}

export const LaporanWargaPdfModal: React.FC<LaporanWargaPdfModalProps> = ({
  isOpen,
  onClose,
  wargaData,
  summaryKpis,
  settings,
  activeMonthLabel,
  daysInMonth,
  activeYearMonth,
}) => {
  const [petugasName, setPetugasName] = useState<string>('');
  const [bendaharaName, setBendaharaName] = useState<string>('');
  const [ketuaRtName, setKetuaRtName] = useState<string>('');
  const [includeMatrixTable, setIncludeMatrixTable] = useState<boolean>(true);
  const [matrixCellDisplay, setMatrixCellDisplay] = useState<'nominal_k' | 'nominal_raw' | 'symbol'>('nominal_k');
  const [isGenerating, setIsGenerating] = useState<boolean>(false);

  if (!isOpen) return null;

  const handleDownloadPdf = () => {
    setIsGenerating(true);
    try {
      generateWargaMonthlyReportPdf({
        wargaData,
        summaryKpis,
        settings,
        activeMonthLabel,
        daysInMonth,
        activeYearMonth,
        petugasName,
        bendaharaName,
        ketuaRtName,
        includeMatrixTable,
        matrixCellDisplay,
      });
    } catch (err) {
      console.error('Error generating PDF:', err);
      alert('Gagal membuat dokumen PDF. Silakan coba lagi.');
    } finally {
      setIsGenerating(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div
      className="fixed inset-0 bg-black/65 backdrop-blur-xs z-50 flex items-center justify-center p-3 sm:p-4 overflow-y-auto"
      id="modal-pdf-laporan-warga"
    >
      <div className="bg-white rounded-3xl max-w-2xl w-full border border-stone-200 shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150 my-8">
        {/* Header */}
        <div className="px-5 py-4 sm:px-6 sm:py-5 bg-gradient-to-r from-sky-900 to-slate-900 text-white flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-2xl bg-sky-500/20 border border-sky-400/30 flex items-center justify-center text-sky-300">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h3 className="font-extrabold text-base sm:text-lg">Ekspor PDF Laporan Jimpitan Bulanan</h3>
                <span className="px-2 py-0.5 rounded-md bg-emerald-500/20 border border-emerald-400/30 text-emerald-300 text-[10px] font-bold">
                  3 Tanda Tangan
                </span>
              </div>
              <p className="text-xs text-sky-200/80">
                Laporan resmi lengkap dengan Kop Surat & Pengesahan Petugas, Bendahara, Ketua RT
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl text-stone-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 sm:p-6 space-y-5 max-h-[75vh] overflow-y-auto">
          {/* Summary Box Preview */}
          <div className="p-4 rounded-2xl bg-stone-50 border border-stone-200/80 space-y-3">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div className="flex items-center space-x-2">
                <Calendar className="w-4 h-4 text-sky-600" />
                <span className="text-xs font-bold text-stone-900">
                  Periode: {activeMonthLabel} ({daysInMonth} Hari)
                </span>
              </div>
              <span className="text-xs font-semibold text-stone-500">
                {settings.namaRt} / {settings.namaRw} Desa Pliken
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2 border-t border-stone-200/60">
              <div className="bg-white p-2.5 rounded-xl border border-stone-200">
                <span className="text-[10px] text-stone-500 font-bold block uppercase">Total Warga</span>
                <span className="text-xs sm:text-sm font-black text-stone-900">{summaryKpis.totalWarga} Rumah</span>
              </div>
              <div className="bg-white p-2.5 rounded-xl border border-stone-200">
                <span className="text-[10px] text-stone-500 font-bold block uppercase">Target Kas</span>
                <span className="text-xs sm:text-sm font-black text-stone-900">{formatRupiah(summaryKpis.totalTarget)}</span>
              </div>
              <div className="bg-white p-2.5 rounded-xl border border-emerald-200 text-emerald-900">
                <span className="text-[10px] text-emerald-700 font-bold block uppercase">Terkumpul</span>
                <span className="text-xs sm:text-sm font-black">{formatRupiah(summaryKpis.totalTerkumpul)}</span>
              </div>
              <div className="bg-white p-2.5 rounded-xl border border-rose-200 text-rose-900">
                <span className="text-[10px] text-rose-700 font-bold block uppercase">Kurang Bayar</span>
                <span className="text-xs sm:text-sm font-black">-{formatRupiah(summaryKpis.totalKurangBayar)}</span>
              </div>
            </div>
          </div>

          {/* Form Pejabat Penandatangan */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-xs font-black text-stone-900 uppercase tracking-wide flex items-center space-x-1.5">
                <UserCheck className="w-4 h-4 text-sky-600" />
                <span>Nama Pejabat / Pengurus Penandatangan</span>
              </label>
              <span className="text-[10px] text-stone-400">Opsional (bisa dikosongkan untuk TTD basah)</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {/* Petugas RT */}
              <div className="space-y-1">
                <label className="text-[11px] font-bold text-stone-700 block">
                  1. Petugas Jimpitan RT
                </label>
                <input
                  type="text"
                  value={petugasName}
                  onChange={(e) => setPetugasName(e.target.value)}
                  placeholder="Contoh: Bpk. Sugeng"
                  className="w-full px-3 py-2 rounded-xl bg-stone-50 border border-stone-200 text-xs text-stone-900 outline-none focus:ring-2 focus:ring-sky-400"
                />
                <span className="text-[10px] text-stone-400 block">Koordinator / Penarik</span>
              </div>

              {/* Bendahara RT */}
              <div className="space-y-1">
                <label className="text-[11px] font-bold text-stone-700 block">
                  2. Bendahara Kas RT
                </label>
                <input
                  type="text"
                  value={bendaharaName}
                  onChange={(e) => setBendaharaName(e.target.value)}
                  placeholder="Contoh: Ibu Siti"
                  className="w-full px-3 py-2 rounded-xl bg-stone-50 border border-stone-200 text-xs text-stone-900 outline-none focus:ring-2 focus:ring-sky-400"
                />
                <span className="text-[10px] text-stone-400 block">Pengelola Keuangan</span>
              </div>

              {/* Ketua RT */}
              <div className="space-y-1">
                <label className="text-[11px] font-bold text-stone-700 block">
                  3. Ketua RT 08 RW 06
                </label>
                <input
                  type="text"
                  value={ketuaRtName}
                  onChange={(e) => setKetuaRtName(e.target.value)}
                  placeholder="Contoh: Bpk. H. Supriyanto"
                  className="w-full px-3 py-2 rounded-xl bg-stone-50 border border-stone-200 text-xs text-stone-900 outline-none focus:ring-2 focus:ring-sky-400"
                />
                <span className="text-[10px] text-stone-400 block">Mengetahui & Menyetujui</span>
              </div>
            </div>
          </div>

          {/* Opsi Tambahan Dokumen */}
          <div className="p-4 rounded-2xl bg-sky-50/60 border border-sky-200/80 space-y-3.5">
            <label className="flex items-center space-x-2.5 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={includeMatrixTable}
                onChange={(e) => setIncludeMatrixTable(e.target.checked)}
                className="w-4 h-4 rounded text-sky-600 focus:ring-sky-500 cursor-pointer"
              />
              <span className="text-xs font-bold text-sky-950">
                Sertakan Tabel Matriks Jimpitan Pertanggal (1 s/d {daysInMonth} {activeMonthLabel})
              </span>
            </label>

            {includeMatrixTable && (
              <div className="pl-6.5 space-y-2 border-t border-sky-200/60 pt-2.5">
                <span className="text-[11px] font-extrabold text-sky-900 block uppercase tracking-wider">
                  Format Isi Sel Matriks Pertanggal:
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  <label
                    className={`flex items-start space-x-2 p-2.5 rounded-xl border cursor-pointer transition-all ${
                      matrixCellDisplay === 'nominal_k'
                        ? 'bg-white border-sky-500 shadow-xs ring-1 ring-sky-400'
                        : 'bg-white/60 border-stone-200 hover:bg-white'
                    }`}
                  >
                    <input
                      type="radio"
                      name="pdfMatrixDisplay"
                      value="nominal_k"
                      checked={matrixCellDisplay === 'nominal_k'}
                      onChange={() => setMatrixCellDisplay('nominal_k')}
                      className="mt-0.5 text-sky-600 focus:ring-sky-500"
                    />
                    <div>
                      <div className="text-xs font-black text-stone-900 flex items-center space-x-1">
                        <span>💵 Nominal Ringkas</span>
                        <span className="px-1 py-0.2 rounded bg-emerald-100 text-emerald-800 text-[9px] font-bold">1k, 2k, 5k</span>
                      </div>
                      <p className="text-[10px] text-stone-500 mt-0.5">
                        Rekomendasi print. Pas di kolom kecil kalender.
                      </p>
                    </div>
                  </label>

                  <label
                    className={`flex items-start space-x-2 p-2.5 rounded-xl border cursor-pointer transition-all ${
                      matrixCellDisplay === 'nominal_raw'
                        ? 'bg-white border-sky-500 shadow-xs ring-1 ring-sky-400'
                        : 'bg-white/60 border-stone-200 hover:bg-white'
                    }`}
                  >
                    <input
                      type="radio"
                      name="pdfMatrixDisplay"
                      value="nominal_raw"
                      checked={matrixCellDisplay === 'nominal_raw'}
                      onChange={() => setMatrixCellDisplay('nominal_raw')}
                      className="mt-0.5 text-sky-600 focus:ring-sky-500"
                    />
                    <div>
                      <div className="text-xs font-black text-stone-900 flex items-center space-x-1">
                        <span>🔢 Nominal Penuh</span>
                        <span className="px-1 py-0.2 rounded bg-sky-100 text-sky-800 text-[9px] font-bold">1.000, 2.000</span>
                      </div>
                      <p className="text-[10px] text-stone-500 mt-0.5">
                        Format angka rupiah lengkap.
                      </p>
                    </div>
                  </label>

                  <label
                    className={`flex items-start space-x-2 p-2.5 rounded-xl border cursor-pointer transition-all ${
                      matrixCellDisplay === 'symbol'
                        ? 'bg-white border-sky-500 shadow-xs ring-1 ring-sky-400'
                        : 'bg-white/60 border-stone-200 hover:bg-white'
                    }`}
                  >
                    <input
                      type="radio"
                      name="pdfMatrixDisplay"
                      value="symbol"
                      checked={matrixCellDisplay === 'symbol'}
                      onChange={() => setMatrixCellDisplay('symbol')}
                      className="mt-0.5 text-sky-600 focus:ring-sky-500"
                    />
                    <div>
                      <div className="text-xs font-black text-stone-900 flex items-center space-x-1">
                        <span>✓ Simbol Centang</span>
                        <span className="px-1 py-0.2 rounded bg-stone-100 text-stone-700 text-[9px] font-bold">v / -</span>
                      </div>
                      <p className="text-[10px] text-stone-500 mt-0.5">
                        Tanda centang kehadiran saja.
                      </p>
                    </div>
                  </label>
                </div>
              </div>
            )}
          </div>

          {/* Format Penjelasan PDF */}
          <div className="text-[11px] text-stone-500 bg-stone-50 p-3 rounded-xl border border-stone-200/70 space-y-1">
            <div className="font-bold text-stone-700">Format Dokumen PDF yang Dihasilkan:</div>
            <ul className="list-disc list-inside space-y-0.5 text-stone-600">
              <li>Kop Surat Resmi RT 08 RW 06 Desa Pliken, Kec. Kembaran</li>
              <li>Tabel Rekapitulasi Pembayaran, Kehadiran, Target, dan Status Kurang/Lebih Bayar</li>
              <li>Matriks Presensi Jimpitan Harian Kalender</li>
              <li>Kolom Pengesahan Tanda Tangan: <strong>Petugas RT</strong>, <strong>Bendahara RT</strong>, dan <strong>Ketua RT</strong></li>
            </ul>
          </div>
        </div>

        {/* Footer actions */}
        <div className="p-4 sm:p-5 bg-stone-50 border-t border-stone-200 flex flex-col sm:flex-row items-center justify-between gap-3">
          <button
            type="button"
            onClick={onClose}
            className="w-full sm:w-auto px-4 py-2.5 rounded-xl border border-stone-300 hover:bg-stone-100 text-stone-700 text-xs font-bold transition-colors cursor-pointer"
          >
            Batal
          </button>

          <div className="flex items-center space-x-2 w-full sm:w-auto">
            <button
              type="button"
              onClick={handlePrint}
              className="flex-1 sm:flex-none px-4 py-2.5 rounded-xl bg-white hover:bg-stone-100 border border-stone-300 text-stone-700 text-xs font-bold flex items-center justify-center space-x-1.5 transition-colors cursor-pointer"
              title="Cetak Melalui Browser"
            >
              <Printer className="w-4 h-4 text-stone-500" />
              <span>Cetak Web</span>
            </button>

            <button
              type="button"
              onClick={handleDownloadPdf}
              disabled={isGenerating}
              className="flex-1 sm:flex-none px-5 py-2.5 rounded-xl bg-sky-600 hover:bg-sky-700 disabled:bg-sky-400 text-white text-xs font-extrabold flex items-center justify-center space-x-2 shadow-sm transition-all cursor-pointer"
              id="btn-download-pdf-warga-monthly"
            >
              <Download className="w-4 h-4" />
              <span>{isGenerating ? 'Membuat PDF...' : 'Unduh PDF Resmi (3 TTD)'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
