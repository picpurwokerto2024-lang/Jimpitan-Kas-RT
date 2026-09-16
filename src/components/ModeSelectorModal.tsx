import React, { useState, useEffect } from 'react';
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
  ArrowRight,
  Eye,
  EyeOff,
  AlertCircle
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
  initialTargetMode?: AppMode | null;
}

export const ModeSelectorModal: React.FC<ModeSelectorModalProps> = ({
  isOpen,
  onClose,
  currentMode,
  onSelectMode,
  settings,
  isAdminUnlocked,
  onRequestUnlockAdmin,
  initialTargetMode = null,
}) => {
  const [selectedTargetMode, setSelectedTargetMode] = useState<AppMode | null>(initialTargetMode);
  const [pinInput, setPinInput] = useState<string>('');
  const [showPin, setShowPin] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string>('');

  const activeAdminPin = (settings.pinAdmin || '1234').trim();
  const activePenginputPin = (settings.pinPenginput || settings.pinAdmin || '1234').trim();

  useEffect(() => {
    if (isOpen) {
      setSelectedTargetMode(initialTargetMode || null);
      setPinInput('');
      setErrorMessage('');
      setShowPin(false);
    }
  }, [isOpen, initialTargetMode]);

  if (!isOpen) return null;

  const handleChooseMode = (mode: AppMode) => {
    setErrorMessage('');
    setPinInput('');

    if (mode === 'warga') {
      onSelectMode('warga');
      onClose();
      return;
    }

    if (mode === 'penginput') {
      if (currentMode === 'penginput') {
        onClose();
        return;
      }
      setSelectedTargetMode('penginput');
      return;
    }

    if (mode === 'petugas') {
      if (currentMode === 'petugas' && isAdminUnlocked) {
        onClose();
        return;
      }
      setSelectedTargetMode('petugas');
    }
  };

  const handleVerifyPinAndSwitch = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setErrorMessage('');

    const cleanPin = pinInput.trim();

    if (!cleanPin) {
      setErrorMessage('Silakan masukkan PIN keamanan.');
      return;
    }

    if (selectedTargetMode === 'petugas') {
      if (cleanPin === activeAdminPin) {
        onSelectMode('petugas');
        onClose();
      } else {
        setErrorMessage('PIN Petugas / Admin RT salah. Silakan coba lagi.');
      }
    } else if (selectedTargetMode === 'penginput') {
      if (cleanPin === activePenginputPin || cleanPin === activeAdminPin) {
        onSelectMode('penginput');
        onClose();
      } else {
        setErrorMessage('PIN Penginput salah. Silakan coba lagi.');
      }
    }
  };

  const handleKeypadPress = (digit: string) => {
    if (pinInput.length < 8) {
      setPinInput((prev) => prev + digit);
      setErrorMessage('');
    }
  };

  const handleKeypadDelete = () => {
    setPinInput((prev) => prev.slice(0, -1));
    setErrorMessage('');
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-xs z-50 flex items-center justify-center p-3 sm:p-4 overflow-y-auto animate-in fade-in duration-150">
      <div 
        className="bg-white rounded-3xl border border-stone-200 shadow-2xl max-w-md w-full p-4 sm:p-5 space-y-4 my-auto max-h-[92vh] overflow-y-auto"
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
              Sesuaikan tampilan menu dengan kebutuhan operasional ronda atau manajemen RT
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

        {/* PIN Verification Section if Petugas or Penginput mode is selected */}
        {selectedTargetMode && selectedTargetMode !== 'warga' && (
          <form onSubmit={handleVerifyPinAndSwitch} className={`bg-stone-50 border-2 rounded-3xl p-4 space-y-3 animate-in fade-in zoom-in-95 shadow-sm ${
            selectedTargetMode === 'penginput' ? 'border-sky-300' : 'border-amber-300'
          }`}>
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2.5">
                <div className={`w-9 h-9 rounded-2xl flex items-center justify-center shadow-xs text-white ${
                  selectedTargetMode === 'penginput' ? 'bg-sky-600' : 'bg-amber-600'
                }`}>
                  <KeyRound className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="font-extrabold text-stone-900 text-xs sm:text-sm">
                    {selectedTargetMode === 'penginput'
                      ? 'Masukkan PIN Mode Penginput'
                      : 'Masukkan PIN Petugas / Admin RT'}
                  </h4>
                  <p className="text-[10px] text-stone-500">
                    {selectedTargetMode === 'penginput'
                      ? 'Operasional ronda: Scan QR, Kas & Hitung Uang'
                      : 'Buka akses penuh: 5 Tab & Pengaturan RT (Cukup 1x isi PIN)'}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSelectedTargetMode(null)}
                className="text-xs font-bold text-stone-400 hover:text-stone-700 cursor-pointer p-1"
              >
                Batal
              </button>
            </div>

            {/* Error message */}
            {errorMessage && (
              <div className="p-2.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-bold flex items-center space-x-1.5 animate-in fade-in">
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                <span>{errorMessage}</span>
              </div>
            )}

            {/* Visual PIN Dots */}
            <div className="space-y-1.5 text-center">
              <div className="flex items-center justify-center space-x-2 py-1">
                {[0, 1, 2, 3].map((idx) => {
                  const hasChar = pinInput.length > idx;
                  return (
                    <div
                      key={idx}
                      className={`w-10 h-11 rounded-2xl border-2 flex items-center justify-center text-base font-black transition-all ${
                        hasChar
                          ? selectedTargetMode === 'penginput'
                            ? 'border-sky-500 bg-sky-50 text-sky-900 shadow-2xs scale-105'
                            : 'border-amber-500 bg-amber-50 text-amber-900 shadow-2xs scale-105'
                          : 'border-stone-200 bg-white text-transparent'
                      }`}
                    >
                      {hasChar ? (showPin ? pinInput[idx] : '•') : ''}
                    </div>
                  );
                })}
              </div>

              <div className="flex items-center justify-center">
                <button
                  type="button"
                  onClick={() => setShowPin(!showPin)}
                  className="inline-flex items-center space-x-1 text-[11px] text-stone-500 hover:text-stone-800 font-semibold py-0.5 px-2 rounded-lg cursor-pointer"
                >
                  {showPin ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3 text-stone-600" />}
                  <span>{showPin ? 'Sembunyikan' : 'Lihat Angka'}</span>
                </button>
              </div>
            </div>

            {/* Touch Keypad */}
            <div className="grid grid-cols-3 gap-1.5 pt-1 touch-manipulation">
              {['1', '2', '3', '4', '5', '6', '7', '8', '9', 'C', '0', '⌫'].map((k) => (
                <button
                  key={k}
                  type="button"
                  onClick={() => {
                    if (k === 'C') setPinInput('');
                    else if (k === '⌫') handleKeypadDelete();
                    else handleKeypadPress(k);
                  }}
                  className={`py-2.5 rounded-xl font-black text-sm transition-transform active:scale-95 select-none cursor-pointer ${
                    k === 'C' || k === '⌫'
                      ? 'bg-stone-200/80 hover:bg-stone-300 text-stone-700'
                      : selectedTargetMode === 'penginput'
                        ? 'bg-white hover:bg-sky-50 text-stone-900 border border-stone-200 shadow-2xs active:bg-sky-100'
                        : 'bg-white hover:bg-amber-50 text-stone-900 border border-stone-200 shadow-2xs active:bg-amber-100'
                  }`}
                >
                  {k}
                </button>
              ))}
            </div>

            <div className="flex items-center space-x-2 pt-1">
              <button
                type="button"
                onClick={() => setSelectedTargetMode(null)}
                className="flex-1 py-2.5 rounded-2xl border border-stone-200 text-stone-600 font-bold text-xs hover:bg-stone-100 cursor-pointer"
              >
                Kembali
              </button>
              <button
                type="submit"
                className={`flex-1 py-2.5 rounded-2xl text-white font-extrabold text-xs shadow-md transition-all cursor-pointer ${
                  selectedTargetMode === 'penginput'
                    ? 'bg-sky-600 hover:bg-sky-700'
                    : 'bg-amber-600 hover:bg-amber-700'
                }`}
              >
                {selectedTargetMode === 'penginput' ? 'Masuk Penginput' : 'Buka Akses Penuh'}
              </button>
            </div>

            <p className="text-[10px] text-stone-400 text-center">
              *PIN Default: <strong className="text-stone-600 font-bold">{selectedTargetMode === 'penginput' ? activePenginputPin : activeAdminPin}</strong>
            </p>
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
                    <span className="px-2 py-0.5 rounded-md bg-sky-100 text-sky-900 font-extrabold text-[9.5px] flex items-center space-x-1">
                      <Lock className="w-2.5 h-2.5 text-sky-700" />
                      <span>Operasional Ronda (PIN)</span>
                    </span>
                    {currentMode === 'penginput' && (
                      <span className="px-1.5 py-0.5 rounded-md bg-sky-600 text-white font-bold text-[9px] flex items-center space-x-0.5">
                        <Check className="w-2.5 h-2.5" />
                        <span>Aktif</span>
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-stone-600 font-medium mt-0.5">
                    Dikhususkan untuk petugas jimpitan & ronda keliling jaga malam.
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
                  <Lock className="w-4 h-4 text-stone-300 group-hover:text-sky-600 transition-colors" />
                )}
              </div>
            </div>
          </div>

          {/* OPTION 2: MODE PETUGAS / PENGURUS RT / ADMIN */}
          <div
            onClick={() => handleChooseMode('petugas')}
            className={`p-3.5 rounded-2xl border-2 transition-all cursor-pointer relative group ${
              currentMode === 'petugas' && isAdminUnlocked
                ? 'bg-amber-50/80 border-amber-500 shadow-xs'
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
                      Mode Petugas / Pengurus RT / Admin
                    </h3>
                    <span className="px-2 py-0.5 rounded-md bg-amber-100 text-amber-900 font-extrabold text-[9.5px] flex items-center space-x-1">
                      <ShieldCheck className="w-2.5 h-2.5 text-amber-700" />
                      <span>Akses Lengkap (1x PIN)</span>
                    </span>
                    {currentMode === 'petugas' && isAdminUnlocked && (
                      <span className="px-1.5 py-0.5 rounded-md bg-amber-600 text-white font-bold text-[9px] flex items-center space-x-0.5">
                        <Check className="w-2.5 h-2.5" />
                        <span>Aktif & Terbuka</span>
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-stone-600 font-medium mt-0.5">
                    Akses operasional jimpitan, scan QR, kas & rekap, data warga, hitung uang, cetak QR, dan pengaturan RT.
                  </p>

                  {/* Feature Tags for Petugas / Admin */}
                  <div className="flex items-center space-x-1.5 flex-wrap gap-y-1 mt-2">
                    <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-md bg-white border border-amber-200 text-amber-900 text-[10px] font-bold">
                      <QrCode className="w-2.5 h-2.5" />
                      <span>Scan QR</span>
                    </span>
                    <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-md bg-white border border-amber-200 text-amber-900 text-[10px] font-bold">
                      <BarChart3 className="w-2.5 h-2.5" />
                      <span>Kas & Rekap</span>
                    </span>
                    <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-md bg-white border border-amber-200 text-amber-900 text-[10px] font-bold">
                      <Users className="w-2.5 h-2.5" />
                      <span>Data Warga</span>
                    </span>
                    <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-md bg-white border border-amber-200 text-amber-900 text-[10px] font-bold">
                      <Calculator className="w-2.5 h-2.5" />
                      <span>Hitung Uang</span>
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-center flex-shrink-0 mt-1">
                {currentMode === 'petugas' && isAdminUnlocked ? (
                  <div className="w-6 h-6 rounded-full bg-amber-600 text-white flex items-center justify-center">
                    <Check className="w-3.5 h-3.5" />
                  </div>
                ) : (
                  <Lock className="w-4 h-4 text-stone-300 group-hover:text-amber-600 transition-colors" />
                )}
              </div>
            </div>
          </div>

          {/* OPTION 3: MODE WARGA (Transparansi Kas & Data Warga Publik) */}
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
                      Publik & Transparan (Tanpa PIN)
                    </span>
                    {currentMode === 'warga' && (
                      <span className="px-1.5 py-0.5 rounded-md bg-emerald-600 text-white font-bold text-[9px] flex items-center space-x-0.5">
                        <Check className="w-2.5 h-2.5" />
                        <span>Aktif</span>
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-stone-600 font-medium mt-0.5">
                    Melihat saldo kas RT, transparansi setoran, dan status iuran rumah tanpa hak ubah.
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
        </div>

        {/* Footer info */}
        <div className="pt-2 border-t border-stone-100 text-center">
          <p className="text-[11px] text-stone-400">
            PIN Default: <span className="font-mono font-bold text-stone-600">{activeAdminPin}</span> (Mode Petugas/Admin cukup masukkan PIN 1x untuk membuka seluruh menu)
          </p>
        </div>
      </div>
    </div>
  );
};
