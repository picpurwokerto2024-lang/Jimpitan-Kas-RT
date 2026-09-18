import React, { useState, useEffect } from 'react';
import { WifiOff, Wifi, RefreshCw, CheckCircle2, CloudOff, Info } from 'lucide-react';
import { useOnlineStatus } from '../hooks/useOnlineStatus';

export const OfflineBanner: React.FC = () => {
  const isOnline = useOnlineStatus();
  const [showRestoredToast, setShowRestoredToast] = useState(false);
  const [wasOffline, setWasOffline] = useState(false);

  useEffect(() => {
    if (!isOnline) {
      setWasOffline(true);
      setShowRestoredToast(false);
    } else if (wasOffline && isOnline) {
      // Just came back online
      setShowRestoredToast(true);
      const timer = setTimeout(() => {
        setShowRestoredToast(false);
        setWasOffline(false);
      }, 4000);
      return () => clearTimeout(timer);
    }
  }, [isOnline, wasOffline]);

  // Online restored toast
  if (showRestoredToast) {
    return (
      <div 
        id="toast-online-restored"
        className="fixed top-3 left-1/2 -translate-x-1/2 z-50 max-w-[92%] sm:max-w-md w-full bg-emerald-700 text-white px-4 py-2.5 rounded-2xl shadow-xl border border-emerald-500/50 flex items-center justify-between gap-3 text-xs sm:text-sm font-semibold animate-in fade-in slide-in-from-top-4 duration-300"
      >
        <div className="flex items-center space-x-2">
          <div className="w-6 h-6 rounded-full bg-emerald-500 flex items-center justify-center shrink-0">
            <Wifi className="w-3.5 h-3.5 text-white" />
          </div>
          <span>Koneksi kembali terhubung. Data otomatis tersinkron ke cloud!</span>
        </div>
        <CheckCircle2 className="w-5 h-5 text-emerald-200 shrink-0" />
      </div>
    );
  }

  // Offline banner
  if (!isOnline) {
    return (
      <div 
        id="banner-offline-mode"
        className="w-full bg-linear-to-r from-amber-600 via-amber-700 to-orange-700 text-white px-3 sm:px-4 py-2 text-xs sm:text-sm font-medium shadow-md border-b border-amber-500/40 flex items-center justify-between gap-2 z-40 transition-all"
      >
        <div className="flex items-center space-x-2 min-w-0">
          <span className="w-2.5 h-2.5 rounded-full bg-amber-200 animate-ping shrink-0" />
          <CloudOff className="w-4 h-4 text-amber-200 shrink-0" />
          <div className="truncate">
            <span className="font-extrabold uppercase tracking-wide mr-1.5 text-amber-200">Mode Offline:</span>
            <span className="text-amber-50">Tetap bisa scan QR, isi jimpitan & kas. Data tersimpan aman di HP.</span>
          </div>
        </div>
        <span className="text-[10px] sm:text-xs font-bold bg-amber-900/60 px-2 py-0.5 rounded-full border border-amber-400/30 shrink-0 whitespace-nowrap">
          Lokal Aktif
        </span>
      </div>
    );
  }

  return null;
};
