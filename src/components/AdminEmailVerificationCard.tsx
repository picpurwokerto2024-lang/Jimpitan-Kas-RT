import React, { useState } from 'react';
import { Mail, ShieldCheck, AlertCircle, RefreshCw, CheckCircle2 } from 'lucide-react';
import { AppSettings } from '../types';
import { verifyAdminWithGooglePopup } from '../services/firebaseService';

interface AdminEmailVerificationCardProps {
  settings?: Partial<AppSettings>;
  verifiedEmail: string | null;
  onVerified?: (email: string) => void;
  accentTone?: 'amber' | 'sky';
}

export const AdminEmailVerificationCard: React.FC<AdminEmailVerificationCardProps> = ({
  settings,
  verifiedEmail,
  onVerified,
  accentTone = 'amber',
}) => {
  const [isVerifying, setIsVerifying] = useState<boolean>(false);
  const [authError, setAuthError] = useState<string>('');

  const handleVerifyGoogle = async () => {
    setAuthError('');
    setIsVerifying(true);
    try {
      const result = await verifyAdminWithGooglePopup(settings);
      if (result.ok === true) {
        if (onVerified) onVerified(result.email);
      } else {
        setAuthError(result.message);
      }
    } finally {
      setIsVerifying(false);
    }
  };

  if (verifiedEmail) {
    return (
      <div className="p-3 rounded-2xl bg-emerald-50 border border-emerald-200 space-y-2 animate-in fade-in">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center space-x-2 min-w-0">
            <div className="w-7 h-7 rounded-xl bg-emerald-600 text-white flex items-center justify-center shrink-0">
              <CheckCircle2 className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <span className="text-[10px] font-black uppercase tracking-wider text-emerald-800 block">
                Langkah 1 • Email Admin Terverifikasi
              </span>
              <p className="text-xs font-extrabold text-emerald-950 truncate">{verifiedEmail}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleVerifyGoogle}
            disabled={isVerifying}
            className="px-2.5 py-1 rounded-xl bg-white hover:bg-emerald-100 border border-emerald-300 text-emerald-800 text-[11px] font-bold transition-colors cursor-pointer shrink-0 disabled:opacity-60"
          >
            {isVerifying ? 'Memuat...' : 'Ganti Akun'}
          </button>
        </div>

        {authError && (
          <div className="p-2 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-[11px] font-bold flex items-start space-x-1.5">
            <AlertCircle className="w-3.5 h-3.5 text-rose-600 shrink-0 mt-0.5" />
            <span>{authError}</span>
          </div>
        )}
      </div>
    );
  }

  const toneBorder = accentTone === 'sky' ? 'border-sky-200 bg-sky-50/70' : 'border-amber-200 bg-amber-50/70';
  const toneBadge = accentTone === 'sky' ? 'text-sky-900' : 'text-amber-900';
  const toneBtn =
    accentTone === 'sky'
      ? 'bg-sky-600 hover:bg-sky-700 text-white'
      : 'bg-stone-900 hover:bg-stone-800 text-white';

  return (
    <div className={`p-3 rounded-2xl border space-y-2.5 ${toneBorder}`}>
      <div className="flex items-start space-x-2">
        <div className="w-7 h-7 rounded-xl bg-white border border-stone-200 text-amber-700 flex items-center justify-center shrink-0 mt-0.5 shadow-2xs">
          <ShieldCheck className="w-4 h-4" />
        </div>
        <div className="min-w-0">
          <span className={`text-[10px] font-black uppercase tracking-wider block ${toneBadge}`}>
            Langkah 1 • Verifikasi Ketat Email Admin
          </span>
          <p className="text-[11px] text-stone-600 leading-snug mt-0.5">
            Demi keamanan, akses Mode Admin wajib verifikasi akun Google Pengurus RT terdaftar terlebih dahulu sebelum memasukkan PIN.
          </p>
        </div>
      </div>

      {authError && (
        <div className="p-2.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-[11px] font-bold flex items-start space-x-1.5 animate-in fade-in">
          <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
          <span className="leading-snug">{authError}</span>
        </div>
      )}

      <button
        type="button"
        onClick={handleVerifyGoogle}
        disabled={isVerifying}
        className={`w-full py-2.5 px-3 rounded-xl font-extrabold text-xs shadow-xs transition-all flex items-center justify-center space-x-2 cursor-pointer disabled:opacity-60 ${toneBtn}`}
      >
        {isVerifying ? (
          <>
            <RefreshCw className="w-3.5 h-3.5 animate-spin" />
            <span>Mengautentikasi Google...</span>
          </>
        ) : (
          <>
            <Mail className="w-3.5 h-3.5" />
            <span>Verifikasi Email Google Admin</span>
          </>
        )}
      </button>
    </div>
  );
};
