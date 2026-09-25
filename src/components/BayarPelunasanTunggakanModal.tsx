import React, { useState } from 'react';
import {
  DollarSign,
  CheckCircle2,
  X,
  Calendar,
  AlertTriangle,
  User,
  ShieldCheck,
  Share2,
  FileText,
  Check
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { Warga, KasMutation, AppSettings } from '../types';
import { formatRupiah, formatTanggalIndo } from '../utils/formatters';
import { soundFx } from '../utils/audio';

interface BayarPelunasanTunggakanModalProps {
  isOpen: boolean;
  onClose: () => void;
  warga: Warga | null;
  tunggakanBulanLalu: number;
  sisaTunggakanLalu: number;
  prevMonthLabel: string;
  activeMonthLabel: string;
  onAddMutation: (mut: Omit<KasMutation, 'id' | 'createdAt'>) => Promise<void>;
  currentPetugas: string;
  settings: AppSettings;
}

export const BayarPelunasanTunggakanModal: React.FC<BayarPelunasanTunggakanModalProps> = ({
  isOpen,
  onClose,
  warga,
  tunggakanBulanLalu = 0,
  sisaTunggakanLalu = 0,
  prevMonthLabel = 'Bulan Lalu',
  activeMonthLabel = 'Bulan Ini',
  onAddMutation,
  currentPetugas,
  settings,
}) => {
  const safeSisa = typeof sisaTunggakanLalu === 'number' ? sisaTunggakanLalu : 0;
  const [nominal, setNominal] = useState<number>(safeSisa > 0 ? safeSisa : 10000);
  const [tanggal, setTanggal] = useState<string>(new Date().toISOString().split('T')[0]);
  const [petugas, setPetugas] = useState<string>(currentPetugas || 'Bendahara RT');
  const [catatan, setCatatan] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  if (!isOpen || !warga) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (nominal <= 0) {
      alert('Masukkan nominal pelunasan yang valid (lebih dari 0).');
      return;
    }

    setIsSubmitting(true);
    try {
      const defaultKet = catatan.trim()
        ? `Pelunasan tunggakan bulan ${prevMonthLabel} No. ${warga.nomorRumah} - ${warga.nama} (${catatan.trim()})`
        : `Pelunasan tunggakan jimpitan bulan ${prevMonthLabel} No. ${warga.nomorRumah} - ${warga.nama}`;

      const newMutation: Omit<KasMutation, 'id' | 'createdAt'> = {
        tanggal,
        jenis: 'masuk',
        nominal: Number(nominal),
        kategori: 'Pelunasan Tunggakan Bulan Lalu',
        keterangan: defaultKet,
        petugas: petugas.trim() || currentPetugas || 'Bendahara RT',
      };

      await onAddMutation(newMutation);

      if (settings.soundEnabled) {
        soundFx.playSuccess();
      }

      try {
        confetti({
          particleCount: 50,
          spread: 70,
          origin: { y: 0.6 },
        });
      } catch (e) {
        // ignore
      }

      alert(`✅ Pelunasan tunggakan sebesar ${formatRupiah(nominal)} untuk ${warga.nama} (No. ${warga.nomorRumah}) berhasil dicatat di kas RT.`);
      onClose();
    } catch (err) {
      console.error('Failed to submit pelunasan:', err);
      alert('Terjadi kesalahan saat memproses pelunasan.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 bg-black/70 backdrop-blur-xs z-50 flex items-center justify-center p-3 sm:p-4 overflow-y-auto"
      id="modal-pelunasan-tunggakan"
    >
      <div className="bg-white rounded-3xl max-w-lg w-full border border-stone-200 shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150 my-6">
        {/* Header */}
        <div className="px-5 py-4 sm:px-6 sm:py-4.5 bg-gradient-to-r from-emerald-800 to-teal-900 text-white flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-2xl bg-emerald-500/20 border border-emerald-400/30 flex items-center justify-center text-emerald-300">
              <DollarSign className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-extrabold text-base sm:text-lg">Pelunasan Tunggakan Bulan Lalu</h3>
              <p className="text-xs text-emerald-200/80">
                Penerimaan pembayaran kekurangan jimpitan periode {prevMonthLabel}
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
        <form onSubmit={handleSubmit} className="p-5 sm:p-6 space-y-4 max-h-[75vh] overflow-y-auto">
          {/* Info Warga & Tunggakan */}
          <div className="p-4 rounded-2xl bg-amber-50/80 border border-amber-200 space-y-2.5">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-[10px] font-black text-amber-800 uppercase tracking-wide block">
                  Kepala Keluarga
                </span>
                <span className="text-sm font-black text-stone-900">
                  {warga.nama} (No. {warga.nomorRumah} - {warga.blok || 'Blok A'})
                </span>
              </div>
              <span className="px-2.5 py-1 rounded-xl bg-amber-200 text-amber-900 text-xs font-black">
                {warga.rt}/{warga.rw}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2 pt-2 border-t border-amber-200/60 text-xs">
              <div>
                <span className="text-[10px] text-amber-700 font-bold block">Tunggakan {prevMonthLabel}:</span>
                <span className="font-black text-rose-700">-{formatRupiah(tunggakanBulanLalu)}</span>
              </div>
              <div>
                <span className="text-[10px] text-amber-700 font-bold block">Sisa Belum Lunas:</span>
                <span className="font-black text-amber-900">{formatRupiah(sisaTunggakanLalu)}</span>
              </div>
            </div>
          </div>

          {/* Form Fields */}
          <div className="space-y-3">
            {/* Nominal */}
            <div className="space-y-1">
              <label className="text-xs font-bold text-stone-700 block">
                Nominal Pelunasan (Rp)
              </label>
              <input
                type="number"
                min="500"
                step="500"
                value={nominal}
                onChange={(e) => setNominal(Number(e.target.value))}
                className="w-full px-3.5 py-2.5 rounded-xl bg-stone-50 border border-stone-300 text-base font-black text-emerald-900 outline-none focus:ring-2 focus:ring-emerald-500"
                required
              />
              <div className="flex items-center space-x-2 pt-1">
                <button
                  type="button"
                  onClick={() => setNominal(sisaTunggakanLalu)}
                  className="px-2 py-1 rounded-lg bg-emerald-100 hover:bg-emerald-200 text-emerald-800 text-[10px] font-bold cursor-pointer transition-colors"
                >
                  Lunasi Penuh ({formatRupiah(sisaTunggakanLalu)})
                </button>
                <button
                  type="button"
                  onClick={() => setNominal(Math.round(sisaTunggakanLalu / 2))}
                  className="px-2 py-1 rounded-lg bg-stone-100 hover:bg-stone-200 text-stone-700 text-[10px] font-bold cursor-pointer transition-colors"
                >
                  Cicil 50% ({formatRupiah(Math.round(sisaTunggakanLalu / 2))})
                </button>
              </div>
            </div>

            {/* Tanggal Bayar */}
            <div className="space-y-1">
              <label className="text-xs font-bold text-stone-700 block">
                Tanggal Diterima Pembayaran
              </label>
              <input
                type="date"
                value={tanggal}
                onChange={(e) => setTanggal(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-stone-50 border border-stone-200 text-xs font-semibold text-stone-900 outline-none focus:ring-2 focus:ring-emerald-500"
                required
              />
            </div>

            {/* Petugas / Penerima */}
            <div className="space-y-1">
              <label className="text-xs font-bold text-stone-700 block">
                Petugas / Pengurus Penerima
              </label>
              <input
                type="text"
                value={petugas}
                onChange={(e) => setPetugas(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-stone-50 border border-stone-200 text-xs font-semibold text-stone-900 outline-none focus:ring-2 focus:ring-emerald-500"
                placeholder="Contoh: Bendahara RT / Sugeng"
              />
            </div>

            {/* Catatan */}
            <div className="space-y-1">
              <label className="text-xs font-bold text-stone-700 block">
                Keterangan / Catatan Tambahan (Opsional)
              </label>
              <input
                type="text"
                value={catatan}
                onChange={(e) => setCatatan(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-stone-50 border border-stone-200 text-xs font-semibold text-stone-900 outline-none focus:ring-2 focus:ring-emerald-500"
                placeholder="Contoh: Titip lewat ketua RT / transfer"
              />
            </div>
          </div>

          {/* Actions */}
          <div className="pt-2 flex items-center justify-between gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl border border-stone-300 hover:bg-stone-100 text-stone-700 text-xs font-bold transition-colors cursor-pointer"
            >
              Batal
            </button>

            <button
              type="submit"
              disabled={isSubmitting}
              className="px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-300 text-white text-xs font-black flex items-center space-x-1.5 shadow-md transition-all cursor-pointer"
            >
              <Check className="w-4 h-4" />
              <span>{isSubmitting ? 'Memproses...' : `Konfirmasi Pelunasan (${formatRupiah(nominal)})`}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
