import React from 'react';
import { BookOpen, X, CheckCircle2, ShieldCheck, QrCode, Smartphone, Users } from 'lucide-react';

interface PanduanModalProps {
  isOpen: boolean;
  onClose: () => void;
  namaRt: string;
  namaRw: string;
}

export const PanduanModal: React.FC<PanduanModalProps> = ({
  isOpen,
  onClose,
  namaRt,
  namaRw,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-xs z-50 flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-3xl border border-stone-200 shadow-2xl max-w-lg w-full p-6 space-y-5 my-auto max-h-[90vh] overflow-y-auto animate-in fade-in zoom-in-95">
        <div className="flex items-center justify-between border-b border-stone-100 pb-3">
          <div className="flex items-center space-x-2.5">
            <div className="w-10 h-10 rounded-xl bg-sky-100 text-sky-700 flex items-center justify-center font-bold">
              <BookOpen className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-extrabold text-stone-900 text-base">
                Panduan & SOP Jimpitan RT
              </h3>
              <p className="text-xs text-stone-500">
                Standar Operasional Pengelolaan Jimpitan {namaRt} / {namaRw}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-stone-400 hover:text-stone-700 hover:bg-stone-100"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content steps */}
        <div className="space-y-4 text-xs text-stone-700 leading-relaxed">
          {/* Step 1 */}
          <div className="p-3.5 rounded-2xl bg-sky-50/70 border border-sky-200 space-y-1.5">
            <div className="flex items-center space-x-2 font-bold text-sky-950 text-sm">
              <QrCode className="w-4 h-4 text-sky-600" />
              <span>1. Pemasangan Kartu QR di Rumah Warga</span>
            </div>
            <p>
              Buka menu <b>Data Warga</b> &rarr; klik <b>Cetak Kartu QR</b>. Cetak lembaran kartu QR dan tempelkan pada kotak jimpitan / dinding dekat pagar depan rumah setiap warga.
            </p>
          </div>

          {/* Step 2 */}
          <div className="p-3.5 rounded-2xl bg-emerald-50/70 border border-emerald-200 space-y-1.5">
            <div className="flex items-center space-x-2 font-bold text-emerald-950 text-sm">
              <Smartphone className="w-4 h-4 text-emerald-600" />
              <span>2. Pelaksanaan Penarikan & Scan QR</span>
            </div>
            <p>
              Petugas membawa HP, lalu mengarahkan kamera ke kartu QR warga. Aplikasi otomatis mengenali rumah dan mencatat nominal uang yang diambil secara instan.
            </p>
          </div>

          {/* Step 3 */}
          <div className="p-3.5 rounded-2xl bg-amber-50/70 border border-amber-200 space-y-1.5">
            <div className="flex items-center space-x-2 font-bold text-amber-950 text-sm">
              <ShieldCheck className="w-4 h-4 text-amber-600" />
              <span>3. Penghitungan Uang Fisik Kas RT</span>
            </div>
            <p>
              Setelah selesai berkeliling, buka menu <b>Hitung Uang</b>. Masukkan jumlah keping koin dan lembar uang kertas. Cocokkan apakah total uang fisik pas dengan rekapan di aplikasi.
            </p>
          </div>

          {/* Step 4 */}
          <div className="p-3.5 rounded-2xl bg-purple-50/70 border border-purple-200 space-y-1.5">
            <div className="flex items-center space-x-2 font-bold text-purple-950 text-sm">
              <Users className="w-4 h-4 text-purple-600" />
              <span>4. Kirim Laporan Transparan ke Grup WA Warga</span>
            </div>
            <p>
              Klik ikon <b>Bagikan (Share)</b> di pojok kanan atas untuk langsung mengirimkan laporan hasil perolehan jimpitan & catatan penarikan malam ini ke grup WhatsApp RT.
            </p>
          </div>
        </div>

        <div className="pt-2 border-t border-stone-100">
          <button
            onClick={onClose}
            className="w-full py-2.5 rounded-2xl bg-sky-500 hover:bg-sky-600 text-white font-bold text-xs shadow-sm cursor-pointer"
          >
            SAYA MENGERTI
          </button>
        </div>
      </div>
    </div>
  );
};
