import React, { useState } from 'react';
import {
  FileText,
  Download,
  Printer,
  X,
  Calendar,
  AlertTriangle,
  UserCheck,
  DollarSign
} from 'lucide-react';
import { AppSettings, Warga } from '../types';
import { formatRupiah } from '../utils/formatters';
import { generateLaporanTunggakanPdf } from '../utils/pdfReportGenerator';

interface LaporanTunggakanPdfModalProps {
  isOpen: boolean;
  onClose: () => void;
  wargaTunggakanList: {
    warga: Warga;
    tunggakanBulanLalu: number;
    depositBulanLalu: number;
    pelunasanBulanIni: number;
    sisaTunggakanLalu: number;
    targetBulanIni: number;
    terbayarBulanIni: number;
    totalKewajibanBersih: number;
  }[];
  summary: {
    totalWarga: number;
    totalWargaTertunggakLalu: number;
    totalTunggakanBulanLalu: number;
    totalPelunasanBulanIni: number;
    totalSisaTunggakanLalu: number;
    totalDepositBulanLalu: number;
    persenPelunasan: number;
  };
  settings: AppSettings;
  activeMonthLabel: string;
  prevMonthLabel: string;
}

export const LaporanTunggakanPdfModal: React.FC<LaporanTunggakanPdfModalProps> = ({
  isOpen,
  onClose,
  wargaTunggakanList,
  summary,
  settings,
  activeMonthLabel,
  prevMonthLabel,
}) => {
  const [petugasName, setPetugasName] = useState<string>('');
  const [bendaharaName, setBendaharaName] = useState<string>('');
  const [ketuaRtName, setKetuaRtName] = useState<string>('');
  const [isGenerating, setIsGenerating] = useState<boolean>(false);

  if (!isOpen) return null;

  const handleDownloadPdf = () => {
    setIsGenerating(true);
    try {
      generateLaporanTunggakanPdf({
        wargaTunggakanList,
        summary,
        settings,
        activeMonthLabel,
        prevMonthLabel,
        petugasName,
        bendaharaName,
        ketuaRtName,
      });
    } catch (err) {
      console.error('Error generating Tunggakan PDF:', err);
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
      id="modal-pdf-laporan-tunggakan"
    >
      <div className="bg-white rounded-3xl max-w-2xl w-full border border-stone-200 shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150 my-8">
        {/* Header */}
        <div className="px-5 py-4 sm:px-6 sm:py-5 bg-gradient-to-r from-slate-900 to-indigo-950 text-white flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-500/20 border border-amber-400/30 flex items-center justify-center text-amber-300">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h3 className="font-extrabold text-base sm:text-lg">Ekspor PDF Laporan Tunggakan & Pelunasan</h3>
                <span className="px-2 py-0.5 rounded-md bg-emerald-500/20 border border-emerald-400/30 text-emerald-300 text-[10px] font-bold">
                  3 Tanda Tangan
                </span>
              </div>
              <p className="text-xs text-sky-200/80">
                Laporan resmi rekonsiliasi saldo kurang/lebih bayar bulan sebelumnya
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
                  Periode Laporan: {activeMonthLabel} (Kewajiban Lampau: {prevMonthLabel})
                </span>
              </div>
              <span className="text-xs font-semibold text-stone-500">
                {settings.namaRt} / {settings.namaRw} Pliken
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2 border-t border-stone-200/60">
              <div className="bg-white p-2.5 rounded-xl border border-rose-200">
                <span className="text-[10px] text-rose-600 font-bold block uppercase">Total Tunggakan ({prevMonthLabel})</span>
                <span className="text-xs sm:text-sm font-black text-rose-700">-{formatRupiah(summary.totalTunggakanBulanLalu)}</span>
              </div>
              <div className="bg-white p-2.5 rounded-xl border border-emerald-200">
                <span className="text-[10px] text-emerald-600 font-bold block uppercase">Pelunasan ({activeMonthLabel})</span>
                <span className="text-xs sm:text-sm font-black text-emerald-700">{formatRupiah(summary.totalPelunasanBulanIni)}</span>
              </div>
              <div className="bg-white p-2.5 rounded-xl border border-amber-200">
                <span className="text-[10px] text-amber-700 font-bold block uppercase">Sisa Belum Lunas</span>
                <span className="text-xs sm:text-sm font-black text-amber-900">{formatRupiah(summary.totalSisaTunggakanLalu)}</span>
              </div>
              <div className="bg-white p-2.5 rounded-xl border border-sky-200">
                <span className="text-[10px] text-sky-600 font-bold block uppercase">Capaian Pelunasan</span>
                <span className="text-xs sm:text-sm font-black text-sky-900">{summary.persenPelunasan}%</span>
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
              </div>
            </div>
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
            >
              <Printer className="w-4 h-4 text-stone-500" />
              <span>Cetak Web</span>
            </button>

            <button
              type="button"
              onClick={handleDownloadPdf}
              disabled={isGenerating}
              className="flex-1 sm:flex-none px-5 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 disabled:bg-stone-400 text-white text-xs font-extrabold flex items-center justify-center space-x-2 shadow-sm transition-all cursor-pointer"
            >
              <Download className="w-4 h-4" />
              <span>{isGenerating ? 'Membuat PDF...' : 'Unduh PDF Tunggakan (3 TTD)'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
