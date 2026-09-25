import React, { useState } from 'react';
import { 
  X, 
  Check, 
  Edit3, 
  AlertCircle, 
  RotateCcw, 
  ShieldCheck, 
  DollarSign, 
  FileText, 
  Sparkles,
  Building,
  Calendar,
  HelpCircle,
  TrendingDown,
  TrendingUp,
  SlidersHorizontal
} from 'lucide-react';
import { Warga, KasMutation, AppSettings } from '../types';
import { WargaTunggakanDetail } from '../utils/tunggakanCalculator';
import { formatRupiah, getTodayDateIso, formatTanggalIndo } from '../utils/formatters';

interface EditSisaPiutangModalProps {
  isOpen: boolean;
  onClose: () => void;
  warga: Warga;
  detail: WargaTunggakanDetail;
  onUpdateWarga: (updatedWarga: Warga) => void;
  onAddMutation?: (mut: Omit<KasMutation, 'id' | 'createdAt'>) => void;
  settings: AppSettings;
  currentPetugas?: string;
}

export const EditSisaPiutangModal: React.FC<EditSisaPiutangModalProps> = ({
  isOpen,
  onClose,
  warga,
  detail,
  onUpdateWarga,
  onAddMutation,
  settings,
  currentPetugas = 'Admin RT',
}) => {
  if (!isOpen || !warga || !detail) return null;

  // Edit Mode: 'direct' (Tetapkan Nominal Baru Langsung) | 'adjust' (Tambah/Kurang Nominal) | 'reset' (Kembalikan ke Hitungan Sistem)
  const [editMode, setEditMode] = useState<'direct' | 'adjust' | 'reset'>('direct');

  // Form states
  const [newSisaNominal, setNewSisaNominal] = useState<number>(() => {
    return detail?.sisaTunggakanLalu ?? 0;
  });

  const [adjustmentAmount, setAdjustmentAmount] = useState<number>(0);
  const [adjustmentType, setAdjustmentType] = useState<'potongan' | 'penambahan'>('potongan');

  const [alasanKategori, setAlasanKategori] = useState<string>('Keringanan / Diskon RT');
  const [catatanKeterangan, setCatatanKeterangan] = useState<string>('');
  const [catatKeKasMutasi, setCatatKeKasMutasi] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  // Calculation previews
  const sisaSebelumnya = detail?.sisaTunggakanLalu ?? 0;
  const nominalHitunganSistem = detail?.totalTunggakanKumulatif ?? 0;

  let previewSisaAkhir = sisaSebelumnya;
  if (editMode === 'direct') {
    previewSisaAkhir = Math.max(0, newSisaNominal);
  } else if (editMode === 'adjust') {
    if (adjustmentType === 'potongan') {
      previewSisaAkhir = Math.max(0, sisaSebelumnya - Math.abs(adjustmentAmount));
    } else {
      previewSisaAkhir = sisaSebelumnya + Math.abs(adjustmentAmount);
    }
  } else if (editMode === 'reset') {
    previewSisaAkhir = nominalHitunganSistem;
  }

  const selisihPerubahan = previewSisaAkhir - sisaSebelumnya;

  const handleSave = () => {
    setIsSubmitting(true);
    const today = getTodayDateIso();

    try {
      let updatedWarga: Warga = { ...warga };

      if (editMode === 'reset') {
        // Clear manual overrides
        delete updatedWarga.saldoTunggakanAwal;
        delete updatedWarga.koreksiPiutang;
        updatedWarga.catatanKoreksiPiutang = `Direset ke hitungan otomatis sistem pada ${formatTanggalIndo(today)} oleh ${currentPetugas}`;
        updatedWarga.tanggalKoreksiPiutang = today;
      } else if (editMode === 'direct') {
        // Direct override of remaining arrears
        // We set saldoTunggakanAwal equal to the exact nominal desired + current pelunasan
        const targetAwal = Math.max(0, newSisaNominal + detail.pelunasanBulanIni);
        updatedWarga.saldoTunggakanAwal = targetAwal;
        delete updatedWarga.koreksiPiutang;
        
        const note = catatanKeterangan.trim() 
          ? `[${alasanKategori}] ${catatanKeterangan.trim()}`
          : `[${alasanKategori}] Sisa piutang ditetapkan menjadi ${formatRupiah(newSisaNominal)} oleh ${currentPetugas}`;
        
        updatedWarga.catatanKoreksiPiutang = note;
        updatedWarga.tanggalKoreksiPiutang = today;
      } else if (editMode === 'adjust') {
        // Adjustment mode (+ or -)
        const delta = adjustmentType === 'potongan' ? -Math.abs(adjustmentAmount) : Math.abs(adjustmentAmount);
        const existingKoreksi = warga.koreksiPiutang || 0;
        updatedWarga.koreksiPiutang = existingKoreksi + delta;
        
        const note = catatanKeterangan.trim()
          ? `[${alasanKategori}] ${catatanKeterangan.trim()}`
          : `[${alasanKategori}] Penyesuaian ${adjustmentType === 'potongan' ? 'potongan' : 'tambahan'} ${formatRupiah(Math.abs(adjustmentAmount))} oleh ${currentPetugas}`;
        
        updatedWarga.catatanKoreksiPiutang = note;
        updatedWarga.tanggalKoreksiPiutang = today;
      }

      // 1. Update Warga in Store / Firestore
      onUpdateWarga(updatedWarga);

      // 2. Optionally record an audit mutation if user opted in
      if (catatKeKasMutasi && onAddMutation && selisihPerubahan !== 0) {
        if (selisihPerubahan > 0) {
          // Addition
          onAddMutation({
            tanggal: today,
            jenis: 'masuk',
            nominal: Math.abs(selisihPerubahan),
            kategori: 'Penyesuaian Piutang Warga',
            keterangan: `Penambahan piutang warga ${warga.nama} (Rumah No. ${warga.nomorRumah}): ${alasanKategori}. ${catatanKeterangan}`,
            petugas: currentPetugas,
          });
        } else {
          // Reduction / Diskon
          onAddMutation({
            tanggal: today,
            jenis: 'keluar',
            nominal: Math.abs(selisihPerubahan),
            kategori: 'Keringanan / Diskon Piutang',
            keterangan: `Keringanan/potongan piutang warga ${warga.nama} (Rumah No. ${warga.nomorRumah}): ${alasanKategori}. ${catatanKeterangan}`,
            petugas: currentPetugas,
          });
        }
      }

      onClose();
    } catch (err) {
      console.error('Gagal memperbarui sisa piutang:', err);
      alert('Terjadi kesalahan saat menyimpan perubahan piutang warga.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-stone-900/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl border border-stone-200 shadow-2xl w-full max-w-lg overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="px-5 py-4 bg-amber-50 border-b border-amber-200 flex items-center justify-between">
          <div className="flex items-center space-x-2.5">
            <div className="w-10 h-10 rounded-2xl bg-amber-500/20 text-amber-900 border border-amber-300 flex items-center justify-center shrink-0">
              <Edit3 className="w-5 h-5 text-amber-700" />
            </div>
            <div>
              <div className="flex items-center space-x-1.5 flex-wrap">
                <h3 className="font-extrabold text-stone-900 text-sm sm:text-base">
                  Edit Sisa Piutang Warga
                </h3>
                <span className="px-2 py-0.2 rounded-full bg-amber-200 text-amber-900 text-[10px] font-black border border-amber-300">
                  Mode Admin RT
                </span>
              </div>
              <p className="text-[11px] text-stone-500">
                Koreksi, penyesuaian nominal, atau keringanan sisa kewajiban jimpitan
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-xl bg-white hover:bg-stone-100 text-stone-500 hover:text-stone-800 transition-colors cursor-pointer border border-stone-200"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body Content */}
        <div className="p-4 sm:p-5 overflow-y-auto space-y-4 text-xs">
          {/* Warga Info Card */}
          <div className="p-3 rounded-2xl bg-stone-50 border border-stone-200 flex items-center justify-between gap-3">
            <div className="flex items-center space-x-3 min-w-0">
              <div className="w-10 h-10 rounded-2xl bg-sky-100 text-sky-900 font-bold flex flex-col items-center justify-center shrink-0">
                <span className="text-[7px] uppercase font-bold">No</span>
                <span className="text-sm font-black">{warga.nomorRumah}</span>
              </div>
              <div className="min-w-0">
                <h4 className="font-bold text-stone-900 text-sm truncate">
                  {warga.nama}
                </h4>
                <p className="text-[11px] text-stone-500 truncate">
                  {warga.blok || 'Blok A'} • RT {warga.rt || settings.namaRt} • Tarif: {formatRupiah(warga.nominalDefault || 1000)}/hari
                </p>
              </div>
            </div>

            <div className="text-right shrink-0">
              <span className="text-[10px] text-stone-500 font-semibold block">
                Sisa Saat Ini
              </span>
              <span className="text-sm font-black text-rose-700">
                {formatRupiah(sisaSebelumnya)}
              </span>
            </div>
          </div>

          {/* Mode Selector Tabs */}
          <div className="space-y-1.5">
            <label className="block text-[11px] font-bold text-stone-700">
              Pilih Metode Perubahan:
            </label>
            <div className="grid grid-cols-3 gap-1.5 p-1 bg-stone-100 rounded-2xl border border-stone-200">
              <button
                type="button"
                onClick={() => setEditMode('direct')}
                className={`py-2 px-1 rounded-xl text-center font-bold text-[11px] transition-all cursor-pointer ${
                  editMode === 'direct'
                    ? 'bg-amber-600 text-white shadow-2xs'
                    : 'text-stone-700 hover:bg-stone-200'
                }`}
              >
                Tetapkan Nominal
              </button>
              <button
                type="button"
                onClick={() => setEditMode('adjust')}
                className={`py-2 px-1 rounded-xl text-center font-bold text-[11px] transition-all cursor-pointer ${
                  editMode === 'adjust'
                    ? 'bg-amber-600 text-white shadow-2xs'
                    : 'text-stone-700 hover:bg-stone-200'
                }`}
              >
                Koreksi (+ / -)
              </button>
              <button
                type="button"
                onClick={() => setEditMode('reset')}
                className={`py-2 px-1 rounded-xl text-center font-bold text-[11px] transition-all cursor-pointer ${
                  editMode === 'reset'
                    ? 'bg-amber-600 text-white shadow-2xs'
                    : 'text-stone-700 hover:bg-stone-200'
                }`}
              >
                Reset Sistem
              </button>
            </div>
          </div>

          {/* Form Based on Selected Mode */}
          {editMode === 'direct' && (
            <div className="space-y-3 p-3.5 rounded-2xl bg-amber-50/50 border border-amber-200 animate-in fade-in duration-150">
              <div>
                <label className="block text-[11px] font-bold text-amber-950 mb-1">
                  Nominal Sisa Piutang Baru (Wajib Dibayar):
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-500 font-bold">
                    Rp
                  </span>
                  <input
                    type="number"
                    min="0"
                    step="1000"
                    value={newSisaNominal}
                    onChange={(e) => setNewSisaNominal(Math.max(0, Number(e.target.value) || 0))}
                    className="w-full pl-10 pr-3 py-2 rounded-xl bg-white border border-amber-300 text-sm font-black text-stone-900 outline-none focus:ring-2 focus:ring-amber-400"
                    placeholder="0"
                  />
                </div>
              </div>

              {/* Quick Preset Buttons */}
              <div className="flex flex-wrap gap-1.5 pt-1">
                <button
                  type="button"
                  onClick={() => setNewSisaNominal(0)}
                  className="px-2.5 py-1 rounded-lg bg-white border border-emerald-300 text-emerald-800 font-bold hover:bg-emerald-50 transition-colors"
                >
                  Rp 0 (Lunas / Bebas Hutang)
                </button>
                <button
                  type="button"
                  onClick={() => setNewSisaNominal(Math.round(sisaSebelumnya / 2))}
                  className="px-2.5 py-1 rounded-lg bg-white border border-amber-300 text-amber-800 font-bold hover:bg-amber-50 transition-colors"
                >
                  Potong 50% ({formatRupiah(Math.round(sisaSebelumnya / 2))})
                </button>
                <button
                  type="button"
                  onClick={() => setNewSisaNominal(nominalHitunganSistem)}
                  className="px-2.5 py-1 rounded-lg bg-white border border-stone-300 text-stone-700 font-bold hover:bg-stone-100 transition-colors"
                >
                  Hitungan Asli ({formatRupiah(nominalHitunganSistem)})
                </button>
              </div>
            </div>
          )}

          {editMode === 'adjust' && (
            <div className="space-y-3 p-3.5 rounded-2xl bg-amber-50/50 border border-amber-200 animate-in fade-in duration-150">
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setAdjustmentType('potongan')}
                  className={`p-2 rounded-xl border font-bold flex items-center justify-center space-x-1.5 transition-all cursor-pointer ${
                    adjustmentType === 'potongan'
                      ? 'bg-rose-600 text-white border-rose-700 shadow-2xs'
                      : 'bg-white text-stone-700 border-stone-300 hover:bg-stone-50'
                  }`}
                >
                  <TrendingDown className="w-3.5 h-3.5" />
                  <span>Keringanan / Potongan (-)</span>
                </button>
                <button
                  type="button"
                  onClick={() => setAdjustmentType('penambahan')}
                  className={`p-2 rounded-xl border font-bold flex items-center justify-center space-x-1.5 transition-all cursor-pointer ${
                    adjustmentType === 'penambahan'
                      ? 'bg-amber-600 text-white border-amber-700 shadow-2xs'
                      : 'bg-white text-stone-700 border-stone-300 hover:bg-stone-50'
                  }`}
                >
                  <TrendingUp className="w-3.5 h-3.5" />
                  <span>Penambahan Beban (+)</span>
                </button>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-amber-950 mb-1">
                  Nominal {adjustmentType === 'potongan' ? 'Potongan / Diskon' : 'Tambahan Piutang'}:
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-500 font-bold">
                    Rp
                  </span>
                  <input
                    type="number"
                    min="0"
                    step="1000"
                    value={adjustmentAmount}
                    onChange={(e) => setAdjustmentAmount(Math.max(0, Number(e.target.value) || 0))}
                    className="w-full pl-10 pr-3 py-2 rounded-xl bg-white border border-amber-300 text-sm font-black text-stone-900 outline-none focus:ring-2 focus:ring-amber-400"
                    placeholder="0"
                  />
                </div>
              </div>
            </div>
          )}

          {editMode === 'reset' && (
            <div className="p-3.5 rounded-2xl bg-sky-50 border border-sky-200 text-sky-950 space-y-1.5 animate-in fade-in duration-150">
              <div className="font-bold flex items-center space-x-1.5 text-sky-900">
                <RotateCcw className="w-4 h-4 text-sky-700" />
                <span>Kembalikan ke Hitungan Asli Sistem</span>
              </div>
              <p className="text-[11px] text-sky-800 leading-relaxed">
                Semua penetapan manual dan koreksi piutang untuk warga ini akan dihapus. Sisa piutang akan kembali dihitung otomatis dari riwayat scan ronda dan mutasi kas: <b>{formatRupiah(nominalHitunganSistem)}</b>.
              </p>
            </div>
          )}

          {/* Reason Category & Full Notes */}
          {editMode !== 'reset' && (
            <div className="space-y-2.5">
              <div>
                <label className="block text-[11px] font-bold text-stone-700 mb-1">
                  Kategori / Alasan Perubahan:
                </label>
                <select
                  value={alasanKategori}
                  onChange={(e) => setAlasanKategori(e.target.value)}
                  className="w-full p-2 rounded-xl bg-stone-50 border border-stone-300 text-stone-900 text-xs font-semibold outline-none focus:border-amber-500"
                >
                  <option value="Keringanan / Diskon RT">Keringanan / Diskon Hasil Musyawarah RT</option>
                  <option value="Penetapan Buku Kas Manual">Penetapan Saldo Buku Kas Manual / Lama</option>
                  <option value="Koreksi Salah Catat / Scan">Koreksi Salah Catat / Salah Scan Periode Lalu</option>
                  <option value="Warga Izin / Luar Kota">Warga Izin Tidak Menempati Rumah / Luar Kota</option>
                  <option value="Pelunasan Offline Tunai">Pelunasan Tunai Langsung ke Pengurus</option>
                  <option value="Lain-lain">Lain-lain / Catatan Khusus</option>
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-stone-700 mb-1">
                  Keterangan / Catatan Tambahan (Opsional):
                </label>
                <textarea
                  value={catatanKeterangan}
                  onChange={(e) => setCatatanKeterangan(e.target.value)}
                  placeholder="Contoh: Disepakati pada rapat RT 01 tgl 10 September, warga diberikan keringanan jimpitan 50%..."
                  rows={2}
                  className="w-full p-2.5 rounded-xl bg-stone-50 border border-stone-300 text-stone-900 text-xs outline-none focus:border-amber-500 placeholder:text-stone-400"
                />
              </div>

              {/* Optional: Log as Kas Mutation */}
              <label className="flex items-center space-x-2 p-2.5 rounded-xl bg-stone-50 border border-stone-200 cursor-pointer hover:bg-stone-100 transition-colors">
                <input
                  type="checkbox"
                  checked={catatKeKasMutasi}
                  onChange={(e) => setCatatKeKasMutasi(e.target.checked)}
                  className="w-4 h-4 rounded text-amber-600 focus:ring-amber-500 border-stone-300"
                />
                <span className="text-[11px] text-stone-700 font-semibold">
                  Catat selisih penyesuaian ini ke buku mutasi kas RT sebagai audit log
                </span>
              </label>
            </div>
          )}

          {/* Live Preview Comparison Box */}
          <div className="p-3.5 rounded-2xl bg-stone-900 text-white space-y-2">
            <span className="text-[10px] uppercase font-black tracking-wider text-amber-400 block">
              Ringkasan Hasil Perubahan
            </span>
            <div className="flex items-center justify-between text-xs">
              <span className="text-stone-300">Sisa Piutang Semula:</span>
              <span className="font-bold text-stone-200">{formatRupiah(sisaSebelumnya)}</span>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="text-stone-300">Perubahan / Selisih:</span>
              <span className={`font-black ${selisihPerubahan < 0 ? 'text-emerald-400' : selisihPerubahan > 0 ? 'text-rose-400' : 'text-stone-400'}`}>
                {selisihPerubahan < 0 ? `- ${formatRupiah(Math.abs(selisihPerubahan))}` : selisihPerubahan > 0 ? `+ ${formatRupiah(selisihPerubahan)}` : 'Rp 0 (Tetap)'}
              </span>
            </div>
            <div className="border-t border-stone-800 pt-1.5 flex items-center justify-between text-xs font-black">
              <span className="text-amber-300">Sisa Piutang Baru Wajib Bayar:</span>
              <span className="text-sm text-white bg-amber-500/30 px-2 py-0.5 rounded-lg border border-amber-400/40">
                {formatRupiah(previewSisaAkhir)}
              </span>
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-4 bg-stone-50 border-t border-stone-200 flex items-center justify-end space-x-2">
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="px-4 py-2 rounded-xl bg-white hover:bg-stone-100 text-stone-700 font-bold border border-stone-200 transition-colors cursor-pointer"
          >
            Batal
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={isSubmitting}
            className="px-5 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-black flex items-center space-x-1.5 shadow-sm transition-all cursor-pointer"
          >
            <Check className="w-4 h-4" />
            <span>{isSubmitting ? 'Menyimpan...' : 'Simpan Perubahan Piutang'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
