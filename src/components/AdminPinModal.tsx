import React, { useState, useEffect, useRef } from 'react';
import { 
  Lock, 
  Unlock, 
  KeyRound, 
  Eye, 
  EyeOff, 
  X, 
  Check, 
  AlertCircle, 
  ShieldCheck,
  RefreshCw
} from 'lucide-react';

export interface AdminPinModalProps {
  isOpen: boolean;
  onClose: () => void;
  mode?: 'unlock' | 'change_pin';
  currentPin?: string;
  currentSavedPin?: string;
  onSuccessUnlock?: () => void;
  onUnlock?: () => void;
  onChangePin?: (newPin: string) => Promise<void> | void;
  onSuccessChangePin?: (newPin: string) => Promise<void> | void;
}

export const AdminPinModal: React.FC<AdminPinModalProps> = ({
  isOpen,
  onClose,
  mode = 'unlock',
  currentPin,
  currentSavedPin,
  onSuccessUnlock,
  onUnlock,
  onChangePin,
  onSuccessChangePin,
}) => {
  const [activeTab, setActiveTab] = useState<'unlock' | 'change_pin'>(mode);
  
  // Unlock state
  const [inputPin, setInputPin] = useState<string>('');
  const [showInputPin, setShowInputPin] = useState<boolean>(false);
  const [unlockError, setUnlockError] = useState<string>('');
  const [isShaking, setIsShaking] = useState<boolean>(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // Change PIN state
  const [oldPin, setOldPin] = useState<string>('');
  const [newPin, setNewPin] = useState<string>('');
  const [confirmPin, setConfirmPin] = useState<string>('');
  const [showNewPin, setShowNewPin] = useState<boolean>(false);
  const [changeError, setChangeError] = useState<string>('');
  const [changeSuccess, setChangeSuccess] = useState<string>('');
  const [isSaving, setIsSaving] = useState<boolean>(false);

  // Active expected PIN (strictly enforced: default '1234' only if no PIN has been set)
  const activeExpectedPin = (currentPin || currentSavedPin || '1234').trim();

  // Reset and sync state when opening
  useEffect(() => {
    if (isOpen) {
      setActiveTab(mode);
      setInputPin('');
      setOldPin('');
      setNewPin('');
      setConfirmPin('');
      setUnlockError('');
      setChangeError('');
      setChangeSuccess('');
      setIsShaking(false);
      // Auto focus
      setTimeout(() => {
        inputRef.current?.focus();
      }, 100);
    }
  }, [isOpen, mode]);

  if (!isOpen) return null;

  const triggerErrorShake = (msg: string) => {
    setUnlockError(msg);
    setIsShaking(true);
    setTimeout(() => setIsShaking(false), 500);
  };

  const handleUnlock = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setUnlockError('');
    const clean = inputPin.trim();

    if (!clean) {
      triggerErrorShake('Silakan masukkan PIN Admin.');
      return;
    }

    // STRICT CHECK: Clean must match the exact active expected PIN
    if (clean === activeExpectedPin) {
      if (onSuccessUnlock) onSuccessUnlock();
      else if (onUnlock) onUnlock();
      onClose();
    } else {
      triggerErrorShake('PIN Admin salah. Silakan coba kembali.');
    }
  };

  const handleKeypadPress = (digit: string) => {
    if (inputPin.length < 8) {
      const next = inputPin + digit;
      setInputPin(next);
      setUnlockError('');
    }
  };

  const handleKeypadDelete = () => {
    setInputPin((prev) => prev.slice(0, -1));
    setUnlockError('');
  };

  const handleChangePin = async (e: React.FormEvent) => {
    e.preventDefault();
    setChangeError('');
    setChangeSuccess('');

    const cleanOld = oldPin.trim();
    const cleanNew = newPin.trim();
    const cleanConfirm = confirmPin.trim();

    // STRICT CHECK: Old PIN must match the currently active PIN
    if (cleanOld !== activeExpectedPin) {
      setChangeError('PIN Lama tidak sesuai dengan PIN saat ini.');
      return;
    }

    if (!/^\d{4,8}$/.test(cleanNew)) {
      setChangeError('PIN Baru harus berupa 4 - 8 digit angka.');
      return;
    }

    if (cleanNew !== cleanConfirm) {
      setChangeError('Konfirmasi PIN Baru tidak cocok.');
      return;
    }

    if (cleanNew === cleanOld) {
      setChangeError('PIN Baru tidak boleh sama dengan PIN Lama.');
      return;
    }

    setIsSaving(true);
    try {
      if (onChangePin) {
        await onChangePin(cleanNew);
      } else if (onSuccessChangePin) {
        await onSuccessChangePin(cleanNew);
      }
      setChangeSuccess('PIN Admin berhasil diperbarui! PIN lama sudah tidak berlaku.');
      setTimeout(() => {
        onClose();
      }, 1400);
    } catch (err) {
      setChangeError('Gagal menyimpan PIN baru. Silakan coba lagi.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-xs z-50 flex items-center justify-center p-4 animate-in fade-in duration-150">
      <div className={`bg-white rounded-3xl border border-stone-200 shadow-2xl max-w-sm w-full p-5 space-y-4 max-h-[92vh] overflow-y-auto transition-transform ${isShaking ? 'animate-bounce' : ''}`}>
        {/* Header */}
        <div className="flex items-center justify-between border-b border-stone-100 pb-3">
          <div className="flex items-center space-x-2.5">
            <div className="w-10 h-10 rounded-2xl bg-amber-100 text-amber-800 border border-amber-200 flex items-center justify-center">
              <KeyRound className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-extrabold text-stone-900 text-sm sm:text-base">
                {activeTab === 'unlock' ? 'Buka Akses Pengurus RT' : 'Ubah PIN Pengurus RT'}
              </h3>
              <p className="text-[11px] text-stone-500">
                {activeTab === 'unlock' ? 'Proteksi Keamanan Operasional' : 'Perbarui PIN Keamanan Lingkungan'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-stone-400 hover:text-stone-700 hover:bg-stone-100 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tab Switcher */}
        <div className="flex rounded-xl bg-stone-100 p-1">
          <button
            type="button"
            onClick={() => {
              setActiveTab('unlock');
              setUnlockError('');
            }}
            className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'unlock'
                ? 'bg-white text-stone-900 shadow-2xs'
                : 'text-stone-500 hover:text-stone-800'
            }`}
          >
            Buka Kunci
          </button>
          <button
            type="button"
            onClick={() => {
              setActiveTab('change_pin');
              setChangeError('');
              setChangeSuccess('');
            }}
            className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'change_pin'
                ? 'bg-white text-stone-900 shadow-2xs'
                : 'text-stone-500 hover:text-stone-800'
            }`}
          >
            Ganti PIN Baru
          </button>
        </div>

        {/* TAB 1: UNLOCK FORM */}
        {activeTab === 'unlock' && (
          <div className="space-y-4">
            {unlockError && (
              <div className="p-3 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-bold flex items-center space-x-2 animate-in fade-in">
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
                <span>{unlockError}</span>
              </div>
            )}

            {/* Visual Pin Display (Responsive Dots) */}
            <div className="space-y-2 text-center">
              <div className="flex items-center justify-center space-x-2 py-2">
                {[0, 1, 2, 3].map((idx) => {
                  const hasChar = inputPin.length > idx;
                  return (
                    <div
                      key={idx}
                      className={`w-10 h-12 rounded-2xl border-2 flex items-center justify-center text-lg font-black transition-all ${
                        hasChar
                          ? 'border-amber-500 bg-amber-50 text-amber-900 shadow-2xs scale-105'
                          : 'border-stone-200 bg-stone-50 text-transparent'
                      }`}
                    >
                      {hasChar ? (showInputPin ? inputPin[idx] : '•') : ''}
                    </div>
                  );
                })}
              </div>

              <button
                type="button"
                onClick={() => setShowInputPin(!showInputPin)}
                className="inline-flex items-center space-x-1.5 text-xs text-stone-500 hover:text-stone-800 font-semibold py-1 px-2.5 rounded-lg hover:bg-stone-100 transition-colors cursor-pointer"
              >
                {showInputPin ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5 text-amber-600" />}
                <span>{showInputPin ? 'Sembunyikan Angka' : 'Lihat Angka'}</span>
              </button>
            </div>

            {/* Direct Input (Keyboard & Mobile Friendly) */}
            <form onSubmit={handleUnlock} className="space-y-3">
              <input
                ref={inputRef}
                type={showInputPin ? 'text' : 'password'}
                inputMode="numeric"
                pattern="[0-9]*"
                maxLength={8}
                value={inputPin}
                onChange={(e) => {
                  const val = e.target.value.replace(/\D/g, '');
                  setInputPin(val);
                  setUnlockError('');
                }}
                placeholder="Ketik PIN di sini..."
                className="w-full px-3.5 py-2.5 rounded-2xl bg-stone-50 border border-stone-300 text-center font-bold text-sm tracking-widest outline-none focus:ring-2 focus:ring-amber-500"
                autoFocus
              />

              {/* Touch Keypad (Responsive & Zero Latency) */}
              <div className="grid grid-cols-3 gap-2 pt-1 touch-manipulation">
                {['1', '2', '3', '4', '5', '6', '7', '8', '9', 'C', '0', '⌫'].map((k) => (
                  <button
                    key={k}
                    type="button"
                    onClick={() => {
                      if (k === 'C') setInputPin('');
                      else if (k === '⌫') handleKeypadDelete();
                      else handleKeypadPress(k);
                    }}
                    className={`py-3 rounded-2xl font-black text-sm transition-transform active:scale-90 select-none cursor-pointer ${
                      k === 'C' || k === '⌫'
                        ? 'bg-stone-100 hover:bg-stone-200 text-stone-700 active:bg-stone-300'
                        : 'bg-white hover:bg-amber-50 text-stone-900 border border-stone-200 shadow-2xs active:bg-amber-100'
                    }`}
                  >
                    {k}
                  </button>
                ))}
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  className="w-full py-3 rounded-2xl bg-amber-500 hover:bg-amber-600 active:scale-98 text-white font-extrabold text-xs sm:text-sm tracking-wide shadow-md transition-all flex items-center justify-center space-x-2 cursor-pointer"
                >
                  <Unlock className="w-4 h-4" />
                  <span>BUKA AKSES PENGURUS</span>
                </button>
              </div>

              <p className="text-[11px] text-stone-500 text-center">
                *Masukkan PIN Pengurus RT untuk memverifikasi akses Anda.
              </p>
            </form>
          </div>
        )}

        {/* TAB 2: CHANGE PIN FORM */}
        {activeTab === 'change_pin' && (
          <form onSubmit={handleChangePin} className="space-y-3.5">
            {changeError && (
              <div className="p-3 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-bold flex items-center space-x-2 animate-in fade-in">
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
                <span>{changeError}</span>
              </div>
            )}

            {changeSuccess && (
              <div className="p-3 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold flex items-center space-x-2 animate-in fade-in">
                <Check className="w-4 h-4 shrink-0 text-emerald-600" />
                <span>{changeSuccess}</span>
              </div>
            )}

            <div>
              <label className="block text-xs font-bold text-stone-700 mb-1">
                PIN Admin Lama / Saat Ini
              </label>
              <input
                type="password"
                inputMode="numeric"
                maxLength={8}
                value={oldPin}
                onChange={(e) => {
                  setOldPin(e.target.value.replace(/\D/g, ''));
                  setChangeError('');
                }}
                placeholder="Masukkan PIN saat ini..."
                className="w-full px-3.5 py-2.5 rounded-2xl bg-stone-50 border border-stone-300 font-bold text-stone-900 text-xs sm:text-sm outline-none focus:ring-2 focus:ring-amber-500"
                required
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-xs font-bold text-stone-700">
                  PIN Admin Baru (4 - 8 Angka)
                </label>
                <button
                  type="button"
                  onClick={() => setShowNewPin(!showNewPin)}
                  className="text-[11px] text-stone-500 hover:text-stone-800 flex items-center space-x-1 cursor-pointer"
                >
                  {showNewPin ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                  <span>{showNewPin ? 'Tutup' : 'Lihat'}</span>
                </button>
              </div>
              <input
                type={showNewPin ? 'text' : 'password'}
                inputMode="numeric"
                maxLength={8}
                value={newPin}
                onChange={(e) => {
                  setNewPin(e.target.value.replace(/\D/g, ''));
                  setChangeError('');
                }}
                placeholder="Contoh: 5678"
                className="w-full px-3.5 py-2.5 rounded-2xl bg-stone-50 border border-stone-300 font-bold text-stone-900 text-xs sm:text-sm outline-none focus:ring-2 focus:ring-amber-500"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-stone-700 mb-1">
                Konfirmasi PIN Admin Baru
              </label>
              <input
                type={showNewPin ? 'text' : 'password'}
                inputMode="numeric"
                maxLength={8}
                value={confirmPin}
                onChange={(e) => {
                  setConfirmPin(e.target.value.replace(/\D/g, ''));
                  setChangeError('');
                }}
                placeholder="Ketik ulang PIN baru..."
                className="w-full px-3.5 py-2.5 rounded-2xl bg-stone-50 border border-stone-300 font-bold text-stone-900 text-xs sm:text-sm outline-none focus:ring-2 focus:ring-amber-500"
                required
              />
            </div>

            <div className="pt-2">
              <button
                type="submit"
                disabled={isSaving}
                className="w-full py-3 rounded-2xl bg-amber-500 hover:bg-amber-600 disabled:opacity-60 text-white font-extrabold text-xs sm:text-sm tracking-wide shadow-md transition-all flex items-center justify-center space-x-2 cursor-pointer"
              >
                {isSaving ? (
                  <RefreshCw className="w-4 h-4 animate-spin" />
                ) : (
                  <ShieldCheck className="w-4 h-4" />
                )}
                <span>SIMPAN PIN BARU</span>
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
