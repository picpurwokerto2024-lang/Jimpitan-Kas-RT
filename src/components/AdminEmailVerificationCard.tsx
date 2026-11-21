import React, { useState } from 'react';
import {
  Mail,
  ShieldCheck,
  AlertCircle,
  RefreshCw,
  CheckCircle2,
  KeyRound,
  Globe,
  ArrowRight,
} from 'lucide-react';
import { AppSettings } from '../types';
import { verifyAdminWithGooglePopup, verifyAdminEmailInput } from '../services/firebaseService';

interface AdminEmailVerificationCardProps {
  settings?: Partial<AppSettings>;
  verifiedEmail: string | null;
  onVerified?: (email: string) => void;
  onResetVerified?: () => void;
  accentTone?: 'amber' | 'sky';
}

export const AdminEmailVerificationCard: React.FC<AdminEmailVerificationCardProps> = ({
  settings,
  verifiedEmail,
  onVerified,
  onResetVerified,
  accentTone = 'amber',
}) => {
  const [verifyMethod, setVerifyMethod] = useState<'manual' | 'google'>('manual');
  const [emailInput, setEmailInput] = useState<string>('');
  const [isVerifying, setIsVerifying] = useState<boolean>(false);
  const [authError, setAuthError] = useState<string>('');
  const [showDomainFallbackCta, setShowDomainFallbackCta] = useState<boolean>(false);

  const handleVerifyGoogle = async () => {
    setAuthError('');
    setShowDomainFallbackCta(false);
    setIsVerifying(true);
    try {
      const result = await verifyAdminWithGooglePopup(settings);
      if (result.ok === true) {
        if (onVerified) onVerified(result.email);
      } else {
        setAuthError(result.message);
        if (result.code === 'auth/unauthorized-domain' || result.code === 'auth/popup-blocked') {
          setShowDomainFallbackCta(true);
        }
      }
    } finally {
      setIsVerifying(false);
    }
  };

  const handleVerifyManualEmail = () => {
    setAuthError('');
    setShowDomainFallbackCta(false);
    const result = verifyAdminEmailInput(emailInput, settings);
    if (result.ok === true) {
      if (onVerified) onVerified(result.email);
    } else {
      setAuthError(result.message);
    }
  };

  const applyEmailDomainChip = (domainSuffix: string) => {
    setAuthError('');
    const trimmed = emailInput.trim();
    if (!trimmed) {
      return;
    }
    const atIndex = trimmed.indexOf('@');
    const localPart = atIndex >= 0 ? trimmed.slice(0, atIndex) : trimmed;
    if (localPart) {
      setEmailInput(`${localPart}${domainSuffix}`);
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
            onClick={() => {
              setAuthError('');
              setEmailInput('');
              if (onResetVerified) {
                onResetVerified();
              } else {
                handleVerifyGoogle();
              }
            }}
            disabled={isVerifying}
            className="px-2.5 py-1 rounded-xl bg-white hover:bg-emerald-100 border border-emerald-300 text-emerald-800 text-[11px] font-bold transition-colors cursor-pointer shrink-0 disabled:opacity-60"
          >
            {isVerifying ? 'Memuat...' : 'Ganti Email'}
          </button>
        </div>

        <p className="text-[11px] font-bold text-emerald-800 flex items-center space-x-1.5">
          <KeyRound className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
          <span>Email terdaftar cocok. Silakan lanjut mengisi PIN Admin di bawah ini.</span>
        </p>

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
      : 'bg-amber-600 hover:bg-amber-700 text-white';

  return (
    <div className={`p-3 rounded-2xl border space-y-2.5 ${toneBorder}`}>
      <div className="flex items-start space-x-2">
        <div className="w-7 h-7 rounded-xl bg-white border border-stone-200 text-amber-700 flex items-center justify-center shrink-0 mt-0.5 shadow-2xs">
          <ShieldCheck className="w-4 h-4" />
        </div>
        <div className="min-w-0">
          <span className={`text-[10px] font-black uppercase tracking-wider block ${toneBadge}`}>
            Langkah 1 • Pilih Metode Verifikasi Email Admin
          </span>
          <p className="text-[11px] text-stone-600 leading-snug mt-0.5">
            Pilih cara verifikasi menggunakan email pengurus yang terdaftar untuk melanjutkan pengisian PIN.
          </p>
        </div>
      </div>

      {/* Method Selector Tabs */}
      <div className="grid grid-cols-2 gap-1 bg-white/80 p-1 rounded-xl border border-stone-200">
        <button
          type="button"
          onClick={() => {
            setVerifyMethod('manual');
            setAuthError('');
            setShowDomainFallbackCta(false);
          }}
          className={`py-1.5 px-2 rounded-lg text-[11px] font-extrabold transition-all flex items-center justify-center space-x-1 cursor-pointer ${
            verifyMethod === 'manual'
              ? 'bg-stone-900 text-white shadow-2xs'
              : 'text-stone-600 hover:bg-stone-100'
          }`}
        >
          <Mail className="w-3 h-3 shrink-0" />
          <span>Input Email Terdaftar</span>
        </button>
        <button
          type="button"
          onClick={() => {
            setVerifyMethod('google');
            setAuthError('');
            setShowDomainFallbackCta(false);
          }}
          className={`py-1.5 px-2 rounded-lg text-[11px] font-extrabold transition-all flex items-center justify-center space-x-1 cursor-pointer ${
            verifyMethod === 'google'
              ? 'bg-stone-900 text-white shadow-2xs'
              : 'text-stone-600 hover:bg-stone-100'
          }`}
        >
          <Globe className="w-3 h-3 shrink-0" />
          <span>Pop-up Akun Google</span>
        </button>
      </div>

      {authError && (
        <div className="p-2.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-[11px] font-bold space-y-2 animate-in fade-in">
          <div className="flex items-start space-x-1.5">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
            <span className="leading-snug">{authError}</span>
          </div>
          {showDomainFallbackCta && verifyMethod === 'google' && (
            <button
              type="button"
              onClick={() => {
                setVerifyMethod('manual');
                setAuthError('');
                setShowDomainFallbackCta(false);
              }}
              className="w-full py-1.5 px-2.5 rounded-lg bg-white hover:bg-rose-100 border border-rose-300 text-rose-900 text-[11px] font-extrabold flex items-center justify-center space-x-1 cursor-pointer"
            >
              <span>Pindah ke Input Email Terdaftar</span>
              <ArrowRight className="w-3 h-3" />
            </button>
          )}
        </div>
      )}

      {verifyMethod === 'manual' ? (
        <div className="space-y-2">
          <div>
            <label className="block text-[10px] font-bold text-stone-700 mb-1">
              Email Admin RT yang Akan Digunakan:
            </label>
            <div className="relative">
              <Mail className="w-4 h-4 text-stone-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="email"
                inputMode="email"
                autoComplete="email"
                value={emailInput}
                onChange={(e) => {
                  setEmailInput(e.target.value);
                  if (authError) setAuthError('');
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    e.stopPropagation();
                    handleVerifyManualEmail();
                  }
                }}
                placeholder="Ketik alamat email admin terdaftar..."
                className="w-full pl-9 pr-3 py-2 rounded-xl bg-white border border-stone-300 text-stone-900 text-xs font-bold outline-none focus:ring-2 focus:ring-amber-500"
              />
            </div>
          </div>

          {/* Quick Email Domain Chips (only active after user starts typing username) */}
          <div className="flex items-center space-x-1.5 flex-wrap gap-y-1">
            <span className="text-[10px] font-semibold text-stone-500">Akhiran cepat:</span>
            {['@gmail.com', '@yahoo.com', '@outlook.com'].map((suffix) => (
              <button
                key={suffix}
                type="button"
                onClick={() => applyEmailDomainChip(suffix)}
                className="px-2 py-0.5 rounded-lg bg-white hover:bg-amber-100 border border-stone-200 text-stone-700 text-[10px] font-bold transition-colors cursor-pointer"
              >
                {suffix}
              </button>
            ))}
          </div>

          <button
            type="button"
            onClick={handleVerifyManualEmail}
            className={`w-full py-2.5 px-3 rounded-xl font-extrabold text-xs shadow-xs transition-all flex items-center justify-center space-x-2 cursor-pointer ${toneBtn}`}
          >
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>Verifikasi Email &amp; Lanjut Isi PIN</span>
          </button>
        </div>
      ) : (
        <div className="space-y-2">
          <p className="text-[11px] text-stone-600 leading-snug">
            Gunakan jendela login Google untuk memilih akun email Admin yang tersimpan di HP/browser Anda.
          </p>
          <button
            type="button"
            onClick={handleVerifyGoogle}
            disabled={isVerifying}
            className="w-full py-2.5 px-3 rounded-xl bg-stone-900 hover:bg-stone-800 text-white font-extrabold text-xs shadow-xs transition-all flex items-center justify-center space-x-2 cursor-pointer disabled:opacity-60"
          >
            {isVerifying ? (
              <>
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                <span>Membuka Pilihan Akun Google...</span>
              </>
            ) : (
              <>
                <Globe className="w-3.5 h-3.5" />
                <span>Pilih Akun Email Google Admin</span>
              </>
            )}
          </button>
        </div>
      )}
    </div>
  );
};
