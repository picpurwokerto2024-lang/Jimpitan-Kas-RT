import React, { useState } from 'react';
import { 
  X, 
  Users, 
  QrCode, 
  ShieldCheck, 
  Check, 
  Lock, 
  KeyRound, 
  BarChart3, 
  Calculator, 
  Sparkles,
  ArrowRight
} from 'lucide-react';
import { AppMode, AppSettings } from '../types';

interface ModeSelectorModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentMode: AppMode;
  onSelectMode: (mode: AppMode) => void;
  settings: AppSettings;
  isAdminUnlocked: boolean;
  onRequestUnlockAdmin?: () => void;
}

export const ModeSelectorModal: React.FC<ModeSelectorModalProps> = ({
  isOpen,
  onClose,
  currentMode,
  onSelectMode,
  settings,
  isAdminUnlocked,
  onRequestUnlockAdmin,
}) => {
  const [selectedTargetMode, setSelectedTargetMode] = useState<AppMode | null>(null);
  const [pinInput, setPinInput] = useState<string>('');
  const [errorMessage, setErrorMessage] = useState<string>('');

  if (!isOpen) return null;

  const activeAdminPin = (settings.pinAdmin || '1234').trim();
  const activePenginputPin = (settings.pinPenginput || settings.pinAdmin || '1234').trim();

  const handleChooseMode = (mode: AppMode) => {
    setErrorMessage('');
    setPinInput('');

    if (mode === 'warga') {
      onSelectMode('warga');
      onClose();
      return;
    }

    if (mode === 'penginput') {
      // If already unlocked or if penginput does not strictly require PIN or check PIN
      setSelectedTargetMode('penginput');
      return;
    }

    if (mode === 'petugas') {
      if (isAdminUnlocked) {
        onSelectMode('petugas');
        onClose();
      } else {
        setSelectedTargetMode('petugas');
      }
    }
  };

  const handleVerifyPinAndSwitch = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setErrorMessage('');

    const cleanPin = pinInput.trim();

    if (selectedTargetMode === 'petugas') {
      if (cleanPin === activeAdminPin) {
        onSelectMode('petugas');
        onClose();
      } else {
        setErrorMessage('PIN Admin RT salah. Silakan coba lagi.');
      }
    } else if (selectedTargetMode === 'penginput') {
      // Allowed if matches penginput PIN OR admin PIN
      if (cleanPin === activePenginputPin || cleanPin === activeAdminPin || !settings.pinPenginput) {
        onSelectMode('penginput');
        onClose();
      } else {
        setErrorMessage('PIN Penginput salah. Silakan coba lagi.');
      }
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-xs z-50 flex items-center justify-center p-3 sm:p-4 overflow-y-auto animate-in fade-in duration-150">
      <div 
        className="bg-white rounded-3xl border border-stone-200 shadow-2xl max-w-md w-full p-5 space-y-4 my-auto max-h-[92vh] overflow-y-auto"
        id="mode-selector-modal-container"
      >
        {/* Header */}
        <div className="flex items-start justify-between gap-2 border-b border-stone-100 pb-3">
          <div>
            <div className="flex items-center space-x-2">
              <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full bg-purple-100 text-purple-900 font-extrabold text-[10px] uppercase tracking-wider">
                <Sparkles className="w-3 h-3 text-purple-700" />
                <span>Pilih Mode Akses Aplikasi</span>
              </span>
            </div>
            <h2 className="text-lg sm:text-xl font-black text-stone-900 tracking-tight mt-1">
              Mode Pengguna & Peran RT
            </h2>
            <p className="text-xs text-stone-500">
              Sesuaikan tampilan menu dengan kebutuhan tugas Anda
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-xl border border-stone-200 hover:border-stone-300 flex items-center justify-center text-stone-400 hover:text-stone-700 transition-colors cursor-pointer flex-shrink-0"
            id="btn-close-mode-modal"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* PIN Verification Section if a protected mode is selected */}
        {selectedTargetMode && selectedTargetMode !== 'warga' && (
          <form onSubmit={handleVerifyPinAndSwitch} className="bg-stone-50 border border-stone-200 rounded-2xl p-4 space-y-3 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <div className={`w-7 h-7 rounded-lg flex items-center justify-center ${
                  selectedTargetMode === 'penginput' ? 'bg-sky-100 text-sky-800' : 'bg-amber-100 text-amber-800'
                }`}>
                  <KeyRound className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="font-extrabold text-stone-900 text-xs">
                    {selectedTargetMode === 'penginput' ? 'Konfirmasi PIN Penginput' : 'Konfirmasi PIN Admin RT'}
                  </h4>
                  <p className="text-[10px] text-stone-500">
                    Masukkan PIN untuk beralih ke {selectedTargetMode === 'penginput' ? 'Mode Penginput' : 'Mode Petugas'}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSelectedTargetMode(null)}
                className="text-[11px] font-bold text-stone-400 hover:text-stone-700 cursor-pointer"
              >
                Batal
              </button>
            </div>

            <div className="space-y-1">
              <input
                type="password"
                inputMode="numeric"
                autoFocus
                placeholder="Masukkan PIN (default: 1234)"
                value={pinInput}
                onChange={(e) => {
                  setPinInput(e.target.value);
                  setErrorMessage('');
                }}
                className="w-full px-3 py-2 rounded-xl bg-white border border-stone-300 text-center font-black text-base tracking-widest text-stone-900 focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
              {errorMessage && (
                <p className="text-rose-600 text-[11px] font-bold text-center">
                  {errorMessage}
                </p>
              )}
            </div>

            <div className="flex items-center space-x-2">
              <button
                type="button"
                onClick={() => setSelectedTargetMode(null)}
                className="flex-1 py-2 rounded-xl border border-stone-200 text-stone-600 font-bold text-xs hover:bg-stone-100 cursor-pointer"
              >
                Batal
              </button>
              <button
                type="submit"
                className={`flex-1 py-2 rounded-xl text-white font-extrabold text-xs shadow-md transition-all cursor-pointer ${
                  selectedTargetMode === 'penginput'
                    ? 'bg-sky-600 hover:bg-sky-700'
                    : 'bg-amber-600 hover:bg-amber-700'
                }`}
              >
                Buka Mode
              </button>
            </div>
          </form>
        )}

        {/* 3 Role Options List */}
        <div className="space-y-2.5">
          {/* OPTION 1: MODE PENGINPUT (Operasional Lapangan - Scan QR, Kas & Rekap, Hitung Uang) */}
          <div
            onClick={() => handleChooseMode('penginput')}
            className={`p-3.5 rounded-2xl border-2 transition-all cursor-pointer relative group ${
              currentMode === 'penginput'
                ? 'bg-sky-50/70 border-sky-500 shadow-xs'
                : 'bg-white border-stone-200 hover:border-sky-300 hover:bg-sky-50/30'
            }`}
            id="card-mode-penginput"
          >
            <div className="flex items-start justify-between gap-2">
              <div className="flex items-start space-x-3">
                <div className="w-10 h-10 rounded-xl bg-sky-100 text-sky-800 border border-sky-200 flex items-center justify-center flex-shrink-0 mt-0.5 group-hover:scale-105 transition-transform">
                  <QrCode className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center space-x-1.5 flex-wrap gap-y-1">
                    <h3 className="font-black text-stone-900 text-sm tracking-tight">
                      Mode Penginput
                    </h3>
                    <span className="px-2 py-0.5 rounded-md bg-sky-100 text-sky-900 font-extrabold text-[9.5px]">
                      Operasional Lapangan
                    </span>
                    {currentMode === 'penginput' && (
                      <span className="px-1.5 py-0.5 rounded-md bg-sky-600 text-white font-bold text-[9px] flex items-center space-x-0.5">
                        <Check className="w-2.5 h-2.5" />
                        <span>Aktif</span>
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-stone-600 font-medium mt-0.5">
                    Dikhususkan untuk petugas jimpitan & ronda keliling.
                  </p>

                  {/* Feature Tags for Penginput */}
                  <div className="flex items-center space-x-1.5 flex-wrap gap-y-1 mt-2">
                    <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-md bg-white border border-sky-200 text-sky-900 text-[10px] font-bold">
                      <QrCode className="w-2.5 h-2.5" />
                      <span>Scan QR</span>
                    </span>
                    <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-md bg-white border border-sky-200 text-sky-900 text-[10px] font-bold">
                      <BarChart3 className="w-2.5 h-2.5" />
                      <span>Kas & Rekap</span>
                    </span>
                    <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-md bg-white border border-sky-200 text-sky-900 text-[10px] font-bold">
                      <Calculator className="w-2.5 h-2.5" />
                      <span>Hitung Uang</span>
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-center flex-shrink-0 mt-1">
                {currentMode === 'penginput' ? (
                  <div className="w-6 h-6 rounded-full bg-sky-600 text-white flex items-center justify-center">
                    <Check className="w-3.5 h-3.5" />
                  </div>
                ) : (
                  <ArrowRight className="w-4 h-4 text-stone-300 group-hover:text-sky-600 transition-colors" />
                )}
              </div>
            </div>
          </div>

          {/* OPTION 2: MODE WARGA (Transparansi Kas & Data Warga) */}
          <div
            onClick={() => handleChooseMode('warga')}
            className={`p-3.5 rounded-2xl border-2 transition-all cursor-pointer relative group ${
              currentMode === 'warga'
                ? 'bg-emerald-50/70 border-emerald-500 shadow-xs'
                : 'bg-white border-stone-200 hover:border-emerald-300 hover:bg-emerald-50/30'
            }`}
            id="card-mode-warga"
          >
            <div className="flex items-start justify-between gap-2">
              <div className="flex items-start space-x-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-800 border border-emerald-200 flex items-center justify-center flex-shrink-0 mt-0.5 group-hover:scale-105 transition-transform">
                  <Users className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center space-x-1.5 flex-wrap gap-y-1">
                    <h3 className="font-black text-stone-900 text-sm tracking-tight">
                      Mode Warga
                    </h3>
                    <span className="px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-900 font-extrabold text-[9.5px]">
                      Publik & Transparan
                    </span>
                    {currentMode === 'warga' && (
                      <span className="px-1.5 py-0.5 rounded-md bg-emerald-600 text-white font-bold text-[9px] flex items-center space-x-0.5">
                        <Check className="w-2.5 h-2.5" />
                        <span>Aktif</span>
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-stone-600 font-medium mt-0.5">
                    Melihat saldo kas RT, transparansi setoran, dan status iuran rumah.
                  </p>

                  {/* Feature Tags for Warga */}
                  <div className="flex items-center space-x-1.5 flex-wrap gap-y-1 mt-2">
                    <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-md bg-white border border-emerald-200 text-emerald-900 text-[10px] font-bold">
                      <BarChart3 className="w-2.5 h-2.5" />
                      <span>Kas & Rekap RT</span>
                    </span>
                    <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-md bg-white border border-emerald-200 text-emerald-900 text-[10px] font-bold">
                      <Users className="w-2.5 h-2.5" />
                      <span>Data & Riwayat Warga</span>
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-center flex-shrink-0 mt-1">
                {currentMode === 'warga' ? (
                  <div className="w-6 h-6 rounded-full bg-emerald-600 text-white flex items-center justify-center">
                    <Check className="w-3.5 h-3.5" />
                  </div>
                ) : (
                  <ArrowRight className="w-4 h-4 text-stone-300 group-hover:text-emerald-600 transition-colors" />
                )}
              </div>
            </div>
          </div>

          {/* OPTION 3: MODE PETUGAS / PENGURUS (Admin Penuh + Pengaturan) */}
          <div
            onClick={() => handleChooseMode('petugas')}
            className={`p-3.5 rounded-2xl border-2 transition-all cursor-pointer relative group ${
              currentMode === 'petugas'
                ? 'bg-amber-50/70 border-amber-500 shadow-xs'
                : 'bg-white border-stone-200 hover:border-amber-300 hover:bg-amber-50/30'
            }`}
            id="card-mode-petugas"
          >
            <div className="flex items-start justify-between gap-2">
              <div className="flex items-start space-x-3">
                <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-800 border border-amber-200 flex items-center justify-center flex-shrink-0 mt-0.5 group-hover:scale-105 transition-transform">
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center space-x-1.5 flex-wrap gap-y-1">
                    <h3 className="font-black text-stone-900 text-sm tracking-tight">
                      Mode Petugas / Pengurus RT
                    </h3>
                    <span className="px-2 py-0.5 rounded-md bg-amber-100 text-amber-900 font-extrabold text-[9.5px] flex items-center space-x-1">
                      <Lock className="w-2.5 h-2.5" />
                      <span>Admin Penuh</span>
                    </span>
                    {currentMode === 'petugas' && (
                      <span className="px-1.5 py-0.5 rounded-md bg-amber-600 text-white font-bold text-[9px] flex items-center space-x-0.5">
                        <Check className="w-2.5 h-2.5" />
                        <span>Aktif</span>
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-stone-600 font-medium mt-0.5">
                    Akses lengkap semua fitur: Scan, Kas, Master Warga, Cetak QR, & Pengaturan RT.
                  </p>

                  {/* Feature Tags for Petugas */}
                  <div className="flex items-center space-x-1.5 flex-wrap gap-y-1 mt-2">
                    <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-md bg-white border border-amber-200 text-amber-900 text-[10px] font-bold">
                      <span>Semua 5 Tab & Pengaturan</span>
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-center flex-shrink-0 mt-1">
                {currentMode === 'petugas' ? (
                  <div className="w-6 h-6 rounded-full bg-amber-600 text-white flex items-center justify-center">
                    <Check className="w-3.5 h-3.5" />
                  </div>
                ) : (
                  <Lock className="w-4 h-4 text-stone-300 group-hover:text-amber-600 transition-colors" />
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Footer info */}
        <div className="pt-2 border-t border-stone-100 text-center">
          <p className="text-[11px] text-stone-400">
            PIN Default sistem: <span className="font-mono font-bold text-stone-600">1234</span> (Dapat diubah di Pengaturan RT)
          </p>
        </div>
      </div>
    </div>
  );
};
