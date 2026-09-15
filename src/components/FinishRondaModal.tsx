import React, { useState } from 'react';
import { 
  CheckCircle2, 
  Share2, 
  MessageSquare, 
  X, 
  Sparkles, 
  Send, 
  ShieldCheck, 
  Clock, 
  Calendar, 
  Users, 
  Wallet, 
  Coins, 
  AlertCircle,
  Copy,
  Check,
  RotateCcw
} from 'lucide-react';
import { Warga, JimpitanRecord, ReguRonda, AppSettings, MoneyDenomination, RondaSession } from '../types';
import { formatRupiah, formatTanggalIndo, generateWhatsAppReport } from '../utils/formatters';
import confetti from 'canvas-confetti';

interface FinishRondaModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedDate: string;
  regu: ReguRonda;
  petugas: string;
  totalTerkumpulTonight: number;
  totalTarget: number;
  jumlahRumahScanned: number;
  totalRumah: number;
  saldoKas: number;
  settings: AppSettings;
  moneyCounts: MoneyDenomination;
  sessionStatus?: RondaSession;
  onFinishSession: (catatan?: string) => Promise<void>;
  onReopenSession?: () => Promise<void>;
  onOpenDetailedShare: (tab?: 'laporan' | 'pengingat') => void;
}

export const FinishRondaModal: React.FC<FinishRondaModalProps> = ({
  isOpen,
  onClose,
  selectedDate,
  regu,
  petugas,
  totalTerkumpulTonight,
  totalTarget,
  jumlahRumahScanned,
  totalRumah,
  saldoKas,
  settings,
  moneyCounts,
  sessionStatus,
  onFinishSession,
  onReopenSession,
  onOpenDetailedShare,
}) => {
  const [catatan, setCatatan] = useState<string>('Alhamdulillah penarikan jimpitan selesai, situasi lingkungan kondusif dan aman.');
  const [isFinishing, setIsFinishing] = useState<boolean>(false);
  const [copiedText, setCopiedText] = useState<boolean>(false);

  if (!isOpen) return null;

  const isAlreadyFinished = sessionStatus?.status === 'finished';
  const coveragePercent = totalRumah > 0 ? Math.round((jumlahRumahScanned / totalRumah) * 100) : 0;

  // Calculate physical money vs scan calculation
  const totalKoin =
    (moneyCounts.koin100 || 0) * 100 +
    (moneyCounts.koin200 || 0) * 200 +
    (moneyCounts.koin500 || 0) * 500 +
    (moneyCounts.koin1000 || 0) * 1000;

  const totalKertas =
    (moneyCounts.kertas1000 || 0) * 1000 +
    (moneyCounts.kertas2000 || 0) * 2000 +
    (moneyCounts.kertas5000 || 0) * 5000 +
    (moneyCounts.kertas10000 || 0) * 10000 +
    (moneyCounts.kertas20000 || 0) * 20000 +
    (moneyCounts.kertas50000 || 0) * 50000 +
    (moneyCounts.kertas100000 || 0) * 100000;

  const totalFisik = totalKoin + totalKertas;

  const encodedLaporan = generateWhatsAppReport(
    settings.namaRt,
    settings.namaRw,
    selectedDate,
    regu.nama,
    petugas,
    totalTerkumpulTonight,
    totalTarget,
    jumlahRumahScanned,
    totalRumah,
    saldoKas,
    catatan
  );
  const rawLaporan = decodeURIComponent(encodedLaporan);

  const handleFinishAndSendWhatsApp = async () => {
    setIsFinishing(true);
    try {
      await onFinishSession(catatan);
      
      try {
        confetti({
          particleCount: 50,
          spread: 70,
          origin: { y: 0.6 },
          colors: ['#22c55e', '#0284c7', '#38bdf8', '#fbbf24']
        });
      } catch (e) {
        // confetti fallback
      }

      // Open WhatsApp directly
      const waUrl = `https://wa.me/?text=${encodedLaporan}`;
      window.open(waUrl, '_blank');
      onClose();
    } catch (err) {
      console.error('Failed to finish session:', err);
      alert('Terjadi kesalahan saat menutup transaksi.');
    } finally {
      setIsFinishing(false);
    }
  };

  const handleCopyLaporan = () => {
    navigator.clipboard.writeText(rawLaporan);
    setCopiedText(true);
    setTimeout(() => setCopiedText(false), 2000);
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-xs z-50 flex items-center justify-center p-4 overflow-y-auto" id="finish-setoran-modal-root">
      <div className="bg-white rounded-3xl border border-sky-100 shadow-2xl max-w-lg w-full p-5 sm:p-6 space-y-5 my-8 animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="flex items-start justify-between border-b border-sky-50 pb-3">
          <div className="flex items-center space-x-3">
            <div className={`w-11 h-11 rounded-2xl flex items-center justify-center font-extrabold ${
              isAlreadyFinished ? 'bg-emerald-100 text-emerald-700' : 'bg-sky-100 text-sky-700'
            }`}>
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h3 className="font-extrabold text-stone-900 text-base sm:text-lg">
                  {isAlreadyFinished ? 'Penarikan Ditutup' : 'Selesaikan & Tutup Transaksi'}
                </h3>
                {isAlreadyFinished && (
                  <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-extrabold">
                    TERTUTUP
                  </span>
                )}
              </div>
              <p className="text-xs text-stone-500">
                {formatTanggalIndo(selectedDate)}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-stone-400 hover:text-stone-700 hover:bg-stone-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Summary Metric Cards */}
        <div className="grid grid-cols-2 gap-3">
          {/* Card 1: Terkumpul Hari Ini */}
          <div className="bg-sky-50 rounded-2xl p-3.5 border border-sky-100 space-y-1">
            <span className="text-[10px] font-extrabold uppercase tracking-wider text-sky-800 flex items-center space-x-1">
              <Coins className="w-3.5 h-3.5 text-sky-600" />
              <span>Jimpitan Malam Ini</span>
            </span>
            <p className="text-xl sm:text-2xl font-extrabold text-sky-700 font-sans">
              {formatRupiah(totalTerkumpulTonight)}
            </p>
            <span className="text-[11px] text-stone-500 font-medium block">
              {jumlahRumahScanned} dari {totalRumah} rumah ({coveragePercent}%)
            </span>
          </div>

          {/* Card 2: Saldo Kas Total RT */}
          <div className="bg-emerald-50 rounded-2xl p-3.5 border border-emerald-100 space-y-1">
            <span className="text-[10px] font-extrabold uppercase tracking-wider text-emerald-800 flex items-center space-x-1">
              <Wallet className="w-3.5 h-3.5 text-emerald-600" />
              <span>Saldo Kas RT (Total)</span>
            </span>
            <p className="text-xl sm:text-2xl font-extrabold text-emerald-700 font-sans">
              {formatRupiah(saldoKas)}
            </p>
            <span className="text-[11px] text-emerald-700 font-medium block">
              Akumulasi tersimpan aman
            </span>
          </div>
        </div>

        {/* Info Box: Petugas & Lingkungan */}
        <div className="bg-stone-50 rounded-2xl p-3 border border-stone-200 text-xs space-y-1.5">
          <div className="flex items-center justify-between">
            <span className="text-stone-500">Petugas:</span>
            <span className="font-bold text-stone-800">{petugas || 'Pengurus RT'}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-stone-500">Wilayah:</span>
            <span className="font-bold text-stone-800">{settings.namaRt} / {settings.namaRw} ({settings.lingkungan})</span>
          </div>
          {totalFisik > 0 && (
            <div className="flex items-center justify-between pt-1 border-t border-stone-200/60">
              <span className="text-stone-500">Hitungan Uang Fisik:</span>
              <span className="font-extrabold text-sky-900">{formatRupiah(totalFisik)}</span>
            </div>
          )}
        </div>

        {/* Catatan / Pesan untuk WhatsApp */}
        <div className="space-y-1.5">
          <label className="block text-xs font-bold text-stone-700">
            Catatan Laporan ke WhatsApp Group:
          </label>
          <textarea
            value={catatan}
            onChange={(e) => setCatatan(e.target.value)}
            rows={2}
            placeholder="Ketik catatan kondisi lingkungan malam ini..."
            className="w-full px-3.5 py-2.5 rounded-2xl bg-stone-50 border border-stone-200 text-xs text-stone-800 outline-none focus:ring-2 focus:ring-sky-400"
          />
        </div>

        {/* Action Buttons */}
        <div className="space-y-2.5 pt-1">
          {/* Main WhatsApp Button */}
          <button
            onClick={handleFinishAndSendWhatsApp}
            disabled={isFinishing}
            className="w-full py-3.5 px-4 rounded-2xl bg-[#25D366] hover:bg-[#20ba5a] text-white font-extrabold text-sm flex items-center justify-center space-x-2 shadow-md transition-all cursor-pointer disabled:opacity-50"
            id="btn-finish-and-send-whatsapp"
          >
            <MessageSquare className="w-5 h-5 fill-current" />
            <span>
              {isFinishing ? 'Menyimpan Sesi...' : 'Kirim Laporan ke WhatsApp & Tutup Transaksi'}
            </span>
          </button>

          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={handleCopyLaporan}
              className="py-2.5 px-3 rounded-xl bg-sky-50 hover:bg-sky-100 text-sky-800 font-bold text-xs flex items-center justify-center space-x-1.5 border border-sky-200 transition-colors cursor-pointer"
            >
              {copiedText ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4 text-sky-600" />}
              <span>{copiedText ? 'Tersalin!' : 'Salin Teks Laporan'}</span>
            </button>

            <button
              onClick={() => {
                onClose();
                onOpenDetailedShare('pengingat');
              }}
              className="py-2.5 px-3 rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-900 font-bold text-xs flex items-center justify-center space-x-1.5 border border-amber-200 transition-colors cursor-pointer"
            >
              <Users className="w-4 h-4 text-amber-700" />
              <span>Pengingat Belum Setor</span>
            </button>
          </div>

          {isAlreadyFinished && onReopenSession && (
            <button
              onClick={async () => {
                if (window.confirm('Buka kembali sesi penarikan hari ini untuk menambah scan?')) {
                  await onReopenSession();
                  onClose();
                }
              }}
              className="w-full py-2 rounded-xl text-stone-500 hover:text-stone-700 hover:bg-stone-100 text-xs font-semibold flex items-center justify-center space-x-1 transition-colors cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Buka Kembali Sesi Penarikan</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
