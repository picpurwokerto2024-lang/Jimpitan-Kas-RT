import React, { useState, useEffect, useRef } from 'react';
import { 
  Calculator, 
  RotateCcw, 
  Coins, 
  Banknote, 
  CheckCircle2, 
  AlertTriangle, 
  Sparkles,
  Save,
  Cloud,
  ArrowLeft
} from 'lucide-react';
import { MoneyDenomination } from '../types';
import { formatRupiah } from '../utils/formatters';

interface HitungUangViewProps {
  totalTerkumpulTonight: number;
  counts: MoneyDenomination;
  onUpdateCounts: (newCounts: MoneyDenomination) => void;
  isSyncing?: boolean;
  onNavigateToMenu?: () => void;
}

export const HitungUangView: React.FC<HitungUangViewProps> = ({ 
  totalTerkumpulTonight,
  counts,
  onUpdateCounts,
  isSyncing = false,
  onNavigateToMenu,
}) => {
  const [localCounts, setLocalCounts] = useState<MoneyDenomination>(counts);
  const [saveStatus, setSaveStatus] = useState<'saved' | 'saving'>('saved');
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Synchronize when external counts change (e.g. from Cloud sync)
  useEffect(() => {
    setLocalCounts(counts);
  }, [counts]);

  const pushUpdate = (updated: MoneyDenomination) => {
    setLocalCounts(updated);
    setSaveStatus('saving');

    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    debounceTimerRef.current = setTimeout(() => {
      onUpdateCounts(updated);
      setSaveStatus('saved');
    }, 400);
  };

  const updateCount = (key: keyof MoneyDenomination, value: number) => {
    const next = {
      ...localCounts,
      [key]: Math.max(0, isNaN(value) ? 0 : value),
    };
    pushUpdate(next);
  };

  const increment = (key: keyof MoneyDenomination, step: number = 1) => {
    const next = {
      ...localCounts,
      [key]: Math.max(0, (localCounts[key] || 0) + step),
    };
    pushUpdate(next);
  };

  const handleManualSave = () => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }
    onUpdateCounts(localCounts);
    setSaveStatus('saved');
    alert('✅ Hitungan rincian pecahan uang berhasil disimpan ke Cloud & perangkat!');
  };

  const handleReset = () => {
    if (window.confirm('Reset semua hitungan uang fisik menjadi 0?')) {
      const resetObj: MoneyDenomination = {
        koin100: 0,
        koin200: 0,
        koin500: 0,
        koin1000: 0,
        kertas1000: 0,
        kertas2000: 0,
        kertas5000: 0,
        kertas10000: 0,
        kertas20000: 0,
        kertas50000: 0,
        kertas100000: 0,
      };
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
      setLocalCounts(resetObj);
      onUpdateCounts(resetObj);
      setSaveStatus('saved');
    }
  };

  // Calculations
  const totalKoin =
    (localCounts.koin100 || 0) * 100 +
    (localCounts.koin200 || 0) * 200 +
    (localCounts.koin500 || 0) * 500 +
    (localCounts.koin1000 || 0) * 1000;

  const totalKertas =
    (localCounts.kertas1000 || 0) * 1000 +
    (localCounts.kertas2000 || 0) * 2000 +
    (localCounts.kertas5000 || 0) * 5000 +
    (localCounts.kertas10000 || 0) * 10000 +
    (localCounts.kertas20000 || 0) * 20000 +
    (localCounts.kertas50000 || 0) * 50000 +
    (localCounts.kertas100000 || 0) * 100000;

  const totalFisik = totalKoin + totalKertas;
  const selisih = totalFisik - totalTerkumpulTonight;

  return (
    <div className="w-full space-y-4 pb-12" id="hitung-uang-view-root">
      {/* Header card */}
      <div className="bg-white rounded-3xl border border-sky-100 p-4 sm:p-5 shadow-xs space-y-4">
        {onNavigateToMenu && (
          <div className="pb-1 border-b border-stone-100">
            <button
              type="button"
              onClick={onNavigateToMenu}
              className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-stone-100 hover:bg-stone-200 text-stone-700 text-xs font-bold transition-colors cursor-pointer"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Kembali ke Menu</span>
            </button>
          </div>
        )}

        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2.5">
            <div className="w-10 h-10 rounded-xl bg-sky-100 text-sky-700 flex items-center justify-center font-bold">
              <Calculator className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-extrabold text-stone-900 text-base sm:text-lg tracking-tight">
                Kalkulator Pecahan Uang
              </h2>
              <div className="flex items-center space-x-2 text-xs text-stone-500">
                <span>Hitung uang fisik jimpitan RT</span>
                <span className="inline-flex items-center space-x-1 text-[11px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-md">
                  <Cloud className="w-3 h-3" />
                  <span>{saveStatus === 'saving' ? 'Menyimpan...' : 'Tersinkron Cloud'}</span>
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center space-x-1.5">
            <button
              onClick={handleManualSave}
              className="p-2 rounded-xl text-sky-700 bg-sky-50 hover:bg-sky-100 border border-sky-200 transition-colors cursor-pointer"
              title="Simpan Hitungan Sekarang"
              id="btn-save-money-counts"
            >
              <Save className="w-4 h-4" />
            </button>
            <button
              onClick={handleReset}
              className="p-2 rounded-xl text-stone-400 hover:text-rose-600 hover:bg-rose-50 border border-stone-200 transition-colors cursor-pointer"
              title="Reset Hitungan Uang ke 0"
              id="btn-reset-money-counts"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Live Total Comparison Box */}
        <div className="p-4 rounded-2xl bg-sky-950 text-white space-y-3 shadow-sm">
          <div className="grid grid-cols-2 gap-3 pb-3 border-b border-sky-800">
            <div>
              <span className="text-[10px] uppercase font-bold text-sky-300">
                TOTAL UANG FISIK:
              </span>
              <p className="text-xl sm:text-2xl font-extrabold text-sky-400 font-sans">
                {formatRupiah(totalFisik)}
              </p>
            </div>

            <div className="text-right">
              <span className="text-[10px] uppercase font-bold text-sky-300">
                CATATAN SCAN MALAM INI:
              </span>
              <p className="text-lg sm:text-xl font-bold text-white font-sans">
                {formatRupiah(totalTerkumpulTonight)}
              </p>
            </div>
          </div>

          {/* Selisih Indicator */}
          <div className="flex items-center justify-between text-xs pt-1">
            <span className="font-bold text-stone-300">Status Rekonsiliasi:</span>
            {selisih === 0 ? (
              <span className="px-2.5 py-1 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 font-bold flex items-center space-x-1">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>UANG COCOK (PAS)</span>
              </span>
            ) : selisih > 0 ? (
              <span className="px-2.5 py-1 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40 font-bold flex items-center space-x-1">
                <Sparkles className="w-3.5 h-3.5" />
                <span>LEBIH {formatRupiah(selisih)}</span>
              </span>
            ) : (
              <span className="px-2.5 py-1 rounded-full bg-rose-500/20 text-rose-300 border border-rose-500/40 font-bold flex items-center space-x-1">
                <AlertTriangle className="w-3.5 h-3.5" />
                <span>KURANG {formatRupiah(Math.abs(selisih))}</span>
              </span>
            )}
          </div>
        </div>
      </div>

      {/* 1. UANG KOIN SECTION */}
      <div className="bg-white rounded-3xl border border-sky-100 p-4 sm:p-5 space-y-3 shadow-xs">
        <div className="flex items-center justify-between border-b border-sky-50 pb-2">
          <div className="flex items-center space-x-2 text-stone-800 font-bold text-sm">
            <Coins className="w-4 h-4 text-amber-600" />
            <span>Pecahan Uang Koin</span>
          </div>
          <span className="text-xs font-extrabold text-amber-700">
            Subtotal: {formatRupiah(totalKoin)}
          </span>
        </div>

        <div className="space-y-2.5">
          {[
            { key: 'koin100' as const, label: 'Rp 100', nominal: 100 },
            { key: 'koin200' as const, label: 'Rp 200', nominal: 200 },
            { key: 'koin500' as const, label: 'Rp 500', nominal: 500 },
            { key: 'koin1000' as const, label: 'Rp 1.000', nominal: 1000 },
          ].map((item) => {
            const count = localCounts[item.key] || 0;
            const subtotal = count * item.nominal;

            return (
              <div
                key={item.key}
                className="p-2.5 rounded-2xl bg-sky-50/50 border border-sky-100/80 flex items-center justify-between gap-2"
              >
                <div className="w-20">
                  <span className="font-extrabold text-stone-900 text-xs sm:text-sm block">
                    {item.label}
                  </span>
                  <span className="text-[10px] text-stone-400 font-medium">
                    {formatRupiah(subtotal)}
                  </span>
                </div>

                {/* Counter controls */}
                <div className="flex items-center space-x-1 sm:space-x-2">
                  <button
                    onClick={() => increment(item.key, -5)}
                    className="w-7 h-7 rounded-lg bg-stone-200 hover:bg-stone-300 text-stone-700 font-bold text-xs cursor-pointer"
                    title="-5"
                  >
                    -5
                  </button>
                  <button
                    onClick={() => increment(item.key, -1)}
                    className="w-7 h-7 rounded-lg bg-stone-200 hover:bg-stone-300 text-stone-700 font-bold text-xs cursor-pointer"
                  >
                    -
                  </button>

                  <input
                    type="number"
                    value={count === 0 ? '' : count}
                    placeholder="0"
                    onChange={(e) => updateCount(item.key, Number(e.target.value))}
                    className="w-14 sm:w-16 py-1 text-center font-bold text-xs sm:text-sm rounded-lg bg-white border border-sky-200 outline-none focus:ring-2 focus:ring-sky-400"
                  />

                  <button
                    onClick={() => increment(item.key, 1)}
                    className="w-7 h-7 rounded-lg bg-sky-500 hover:bg-sky-600 text-white font-bold text-xs cursor-pointer"
                  >
                    +
                  </button>
                  <button
                    onClick={() => increment(item.key, 5)}
                    className="w-7 h-7 rounded-lg bg-sky-100 hover:bg-sky-200 text-sky-800 font-bold text-xs cursor-pointer"
                    title="+5"
                  >
                    +5
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 2. UANG KERTAS SECTION */}
      <div className="bg-white rounded-3xl border border-sky-100 p-4 sm:p-5 space-y-3 shadow-xs">
        <div className="flex items-center justify-between border-b border-sky-50 pb-2">
          <div className="flex items-center space-x-2 text-stone-800 font-bold text-sm">
            <Banknote className="w-4 h-4 text-emerald-600" />
            <span>Pecahan Uang Kertas</span>
          </div>
          <span className="text-xs font-extrabold text-emerald-700">
            Subtotal: {formatRupiah(totalKertas)}
          </span>
        </div>

        <div className="space-y-2.5">
          {[
            { key: 'kertas1000' as const, label: 'Rp 1.000', nominal: 1000 },
            { key: 'kertas2000' as const, label: 'Rp 2.000', nominal: 2000 },
            { key: 'kertas5000' as const, label: 'Rp 5.000', nominal: 5000 },
            { key: 'kertas10000' as const, label: 'Rp 10.000', nominal: 10000 },
            { key: 'kertas20000' as const, label: 'Rp 20.000', nominal: 20000 },
            { key: 'kertas50000' as const, label: 'Rp 50.000', nominal: 50000 },
            { key: 'kertas100000' as const, label: 'Rp 100.000', nominal: 100000 },
          ].map((item) => {
            const count = localCounts[item.key] || 0;
            const subtotal = count * item.nominal;

            return (
              <div
                key={item.key}
                className="p-2.5 rounded-2xl bg-sky-50/50 border border-sky-100/80 flex items-center justify-between gap-2"
              >
                <div className="w-20">
                  <span className="font-extrabold text-stone-900 text-xs sm:text-sm block">
                    {item.label}
                  </span>
                  <span className="text-[10px] text-stone-400 font-medium">
                    {formatRupiah(subtotal)}
                  </span>
                </div>

                {/* Counter controls */}
                <div className="flex items-center space-x-1 sm:space-x-2">
                  <button
                    onClick={() => increment(item.key, -1)}
                    className="w-7 h-7 rounded-lg bg-stone-200 hover:bg-stone-300 text-stone-700 font-bold text-xs cursor-pointer"
                  >
                    -
                  </button>

                  <input
                    type="number"
                    value={count === 0 ? '' : count}
                    placeholder="0"
                    onChange={(e) => updateCount(item.key, Number(e.target.value))}
                    className="w-14 sm:w-16 py-1 text-center font-bold text-xs sm:text-sm rounded-lg bg-white border border-sky-200 outline-none focus:ring-2 focus:ring-sky-400"
                  />

                  <button
                    onClick={() => increment(item.key, 1)}
                    className="w-7 h-7 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs cursor-pointer"
                  >
                    +
                  </button>
                  <button
                    onClick={() => increment(item.key, 5)}
                    className="w-7 h-7 rounded-lg bg-emerald-100 hover:bg-emerald-200 text-emerald-800 font-bold text-xs cursor-pointer"
                    title="+5"
                  >
                    +5
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
