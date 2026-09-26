import React from 'react';
import { 
  X, 
  QrCode, 
  BarChart3, 
  Receipt,
  Users, 
  Calculator, 
  ShieldCheck, 
  Wallet, 
  Printer, 
  BookOpen, 
  Lock,
  Unlock,
  ChevronRight,
  Download,
  Volume2,
  VolumeX,
  Share2,
  Palette,
  ChevronDown,
  RotateCcw
} from 'lucide-react';
import { TabType } from './BottomNav';
import { AppMode, AppSettings } from '../types';
import { getTodayDateIso } from '../utils/formatters';
import { AppTheme, AVAILABLE_THEMES } from '../utils/themeManager';
import { LaporanTabKey } from './LaporanHubModal';
import { 
  FileText, 
  TrendingUp, 
  TrendingDown, 
  Users as UsersIcon, 
  Calendar as CalendarIcon, 
  FileSpreadsheet
} from 'lucide-react';

interface MenuModalProps {
  isOpen: boolean;
  onClose: () => void;
  onNavigate: (tab: TabType) => void;
  onOpenJadwalRonda?: () => void;
  onOpenPengeluaranKas: () => void;
  onOpenCetakQr: () => void;
  onOpenPanduan: () => void;
  onOpenShareModal?: () => void;
  onOpenInstallModal?: () => void;
  onOpenThemeModal?: () => void;
  onOpenLaporanHub?: (tab?: LaporanTabKey) => void;
  onLockApp: () => void;
  appMode?: AppMode;
  onSwitchMode?: (mode: AppMode) => void;
  soundEnabled?: boolean;
  onToggleSound?: () => void;
  isAdminUnlocked?: boolean;
  onToggleAdminLock?: () => void;
  selectedDate?: string;
  onDateChange?: (date: string) => void;
  saldoKas?: number;
  settings?: AppSettings;
  currentTheme?: AppTheme;
  isAutoRotate?: boolean;
}

export const MenuModal: React.FC<MenuModalProps> = ({
  isOpen,
  onClose,
  onNavigate,
  onOpenPengeluaranKas,
  onOpenCetakQr,
  onOpenPanduan,
  onOpenShareModal,
  onOpenInstallModal,
  onOpenThemeModal,
  onOpenLaporanHub,
  onLockApp,
  appMode = 'warga',
  onSwitchMode,
  soundEnabled = true,
  onToggleSound,
  isAdminUnlocked = false,
  onToggleAdminLock,
  selectedDate = getTodayDateIso(),
  onDateChange,
  saldoKas = 0,
  settings,
  currentTheme = AVAILABLE_THEMES[0],
  isAutoRotate = true,
}) => {
  if (!isOpen) return null;

  const formatDateDisplay = (isoStr: string) => {
    try {
      const [year, month, day] = isoStr.split('-');
      return `${day}/${month}/${year}`;
    } catch {
      return isoStr;
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-xs z-50 flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
      <div 
        className="bg-white rounded-3xl border border-stone-200 shadow-2xl max-w-md w-full p-4 sm:p-5 space-y-3.5 my-auto max-h-[92vh] overflow-y-auto animate-in fade-in zoom-in-95 duration-150"
        id="menu-modal-container"
      >
        {/* Header with Badge and Close button */}
        <div className="flex items-start justify-between gap-2 border-b border-stone-200 pb-2.5">
          <div className="space-y-1">
            <div className="flex items-center space-x-2">
              <span className={`inline-block px-3 py-1 rounded-xl font-extrabold text-[11px] uppercase tracking-wider border ${
                appMode === 'warga'
                  ? 'bg-emerald-50 border-emerald-200 text-emerald-950'
                  : appMode === 'penginput'
                    ? 'bg-sky-50 border-sky-300 text-sky-950'
                    : 'bg-amber-50 border-amber-300 text-amber-950'
              }`}>
                {appMode === 'warga' 
                  ? 'MODE WARGA RT' 
                  : appMode === 'penginput'
                    ? 'MODE PENGINPUT'
                    : 'MODE PETUGAS / PENGURUS RT'}
              </span>
            </div>
            <h2 className="text-xl sm:text-2xl font-extrabold text-stone-900 tracking-tight font-sans">
              {appMode === 'warga' 
                ? 'Transparansi & Menu' 
                : appMode === 'penginput'
                  ? 'Menu Operasional Ronda'
                  : 'Navigasi Lengkap'}
            </h2>
          </div>

          <button
            onClick={onClose}
            className="w-9 h-9 rounded-xl border border-stone-200 hover:border-stone-300 flex items-center justify-center text-stone-400 hover:text-stone-700 hover:bg-stone-50 transition-colors cursor-pointer flex-shrink-0 mt-1"
            id="btn-close-menu-modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* 1. QUICK ACTIONS GRID (Panduan, Gembok, Suara, Tema, Download, Bagikan) */}
        <div className={`${currentTheme.accentCardBg} p-3 rounded-2xl border space-y-2.5 shadow-2xs`}>
          <div className="text-[10px] font-extrabold uppercase tracking-wider flex items-center justify-between text-stone-800">
            <span>Akses Cepat & Pengaturan</span>
            {settings && (
              <span className="font-bold opacity-80">
                {settings.namaRt} / {settings.namaRw}
              </span>
            )}
          </div>

          {/* Quick Buttons Grid - 6 buttons */}
          <div className="grid grid-cols-6 gap-1">
            {/* 1. Panduan SOP */}
            <button
              onClick={() => {
                onClose();
                onOpenPanduan();
              }}
              className="flex flex-col items-center justify-center p-1.5 rounded-xl bg-white border border-stone-200 hover:bg-stone-50 transition-colors shadow-2xs group cursor-pointer text-center"
              title="Buku Panduan SOP Jimpitan & Siskamling"
              id="menu-quick-panduan"
            >
              <div className="w-7 h-7 rounded-lg bg-purple-100 text-purple-700 flex items-center justify-center mb-1 group-hover:scale-110 transition-transform">
                <BookOpen className="w-3.5 h-3.5" />
              </div>
              <span className="text-[9px] font-bold text-stone-800 leading-tight">Panduan</span>
            </button>

            {/* 2. Gembok / Admin Mode */}
            <button
              onClick={() => {
                onClose();
                if (onToggleAdminLock) {
                  onToggleAdminLock();
                } else if (appMode === 'petugas') {
                  onLockApp();
                } else if (onSwitchMode) {
                  onSwitchMode('petugas');
                }
              }}
              className={`flex flex-col items-center justify-center p-1.5 rounded-xl border transition-colors shadow-2xs group cursor-pointer text-center ${
                isAdminUnlocked
                  ? 'bg-amber-50 border-amber-300 hover:bg-amber-100/60 text-amber-900'
                  : 'bg-white border-stone-200 hover:bg-stone-50 text-stone-800'
              }`}
              title={isAdminUnlocked ? 'Mode Admin Terbuka (Klik untuk Kunci)' : 'Buka Kunci Akses Admin'}
              id="menu-quick-lock"
            >
              <div className={`w-7 h-7 rounded-lg flex items-center justify-center mb-1 group-hover:scale-110 transition-transform ${
                isAdminUnlocked ? 'bg-amber-200 text-amber-800' : 'bg-stone-100 text-stone-700'
              }`}>
                {isAdminUnlocked ? <Unlock className="w-3.5 h-3.5" /> : <Lock className="w-3.5 h-3.5" />}
              </div>
              <span className="text-[9px] font-bold leading-tight">
                {isAdminUnlocked ? 'Terbuka' : 'Gembok'}
              </span>
            </button>

            {/* 3. Suara Toggle */}
            <button
              onClick={() => {
                if (onToggleSound) onToggleSound();
              }}
              className={`flex flex-col items-center justify-center p-1.5 rounded-xl border transition-colors shadow-2xs group cursor-pointer text-center ${
                soundEnabled
                  ? 'bg-emerald-50 border-emerald-300 hover:bg-emerald-100/60 text-emerald-950'
                  : 'bg-white border-stone-200 hover:bg-stone-50 text-stone-500'
              }`}
              title={soundEnabled ? 'Suara & Voice Aktif (Klik untuk Mematikan)' : 'Suara Mati (Klik untuk Menyalakan)'}
              id="menu-quick-sound"
            >
              <div className={`w-7 h-7 rounded-lg flex items-center justify-center mb-1 group-hover:scale-110 transition-transform ${
                soundEnabled ? 'bg-emerald-200 text-emerald-800' : 'bg-stone-100 text-stone-400'
              }`}>
                {soundEnabled ? <Volume2 className="w-3.5 h-3.5" /> : <VolumeX className="w-3.5 h-3.5" />}
              </div>
              <span className="text-[9px] font-bold leading-tight">
                {soundEnabled ? 'Suara ON' : 'Suara OFF'}
              </span>
            </button>

            {/* 4. Tema & Warna (NEW) */}
            <button
              onClick={() => {
                onClose();
                if (onOpenThemeModal) onOpenThemeModal();
              }}
              className="flex flex-col items-center justify-center p-1.5 rounded-xl bg-white border border-amber-300 hover:bg-amber-50/60 transition-colors shadow-2xs group cursor-pointer text-center relative"
              title="Kustomisasi Tema & Warna Tampilan"
              id="menu-quick-theme"
            >
              {isAutoRotate && (
                <span className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-amber-500 border border-white" title="Auto-Rotasi Tema Aktif" />
              )}
              <div className="w-7 h-7 rounded-lg bg-amber-100 text-amber-800 flex items-center justify-center mb-1 group-hover:scale-110 transition-transform">
                <Palette className="w-3.5 h-3.5" />
              </div>
              <span className="text-[9px] font-bold text-stone-800 leading-tight">Tema</span>
            </button>

            {/* 5. Download & Pasang PWA */}
            <button
              onClick={() => {
                onClose();
                if (onOpenInstallModal) onOpenInstallModal();
              }}
              className="flex flex-col items-center justify-center p-1.5 rounded-xl bg-white border border-stone-200 hover:bg-stone-50 transition-colors shadow-2xs group cursor-pointer text-center"
              title="Download & Pasang Aplikasi di HP"
              id="menu-quick-download"
            >
              <div className="w-7 h-7 rounded-lg bg-teal-100 text-teal-700 flex items-center justify-center mb-1 group-hover:scale-110 transition-transform">
                <Download className="w-3.5 h-3.5" />
              </div>
              <span className="text-[9px] font-bold text-stone-800 leading-tight">Install</span>
            </button>

            {/* 6. Bagikan WhatsApp */}
            <button
              onClick={() => {
                onClose();
                if (onOpenShareModal) onOpenShareModal();
              }}
              className="flex flex-col items-center justify-center p-1.5 rounded-xl bg-white border border-stone-200 hover:bg-stone-50 transition-colors shadow-2xs group cursor-pointer text-center"
              title="Bagikan Laporan ke WhatsApp"
              id="menu-quick-share"
            >
              <div className="w-7 h-7 rounded-lg bg-green-100 text-green-700 flex items-center justify-center mb-1 group-hover:scale-110 transition-transform">
                <Share2 className="w-3.5 h-3.5" />
              </div>
              <span className="text-[9px] font-bold text-stone-800 leading-tight">Bagikan</span>
            </button>
          </div>

          {/* Tanggal & Saldo Status Bar in Menu */}
          <div className="flex items-center justify-between pt-1 border-t border-black/10 text-xs">
            {/* Tanggal Ronda Picker */}
            <div className="flex items-center space-x-1.5 flex-wrap">
              <span className="font-extrabold text-[10px] uppercase text-stone-700">Tanggal:</span>
              {onDateChange ? (
                <div className="relative">
                  <input
                    type="date"
                    value={selectedDate}
                    onChange={(e) => onDateChange(e.target.value)}
                    className="opacity-0 absolute inset-0 w-full h-full cursor-pointer z-10"
                    id="menu-date-input"
                  />
                  <div className={`px-2 py-0.5 rounded-lg border font-bold text-[11px] flex items-center space-x-1 cursor-pointer shadow-2xs ${
                    selectedDate !== getTodayDateIso()
                      ? 'bg-amber-100 border-amber-300 text-amber-950'
                      : 'bg-white border-stone-300 text-stone-900'
                  }`}>
                    <span>{formatDateDisplay(selectedDate)}</span>
                    <ChevronDown className="w-3 h-3 text-stone-500" />
                  </div>
                </div>
              ) : (
                <span className="font-bold text-stone-900 text-[11px] bg-white px-2 py-0.5 rounded-lg border border-stone-200">
                  {formatDateDisplay(selectedDate)}
                </span>
              )}

              {selectedDate !== getTodayDateIso() && onDateChange && (
                <button
                  type="button"
                  onClick={() => onDateChange(getTodayDateIso())}
                  className="px-1.5 py-0.5 rounded-md bg-amber-400 hover:bg-amber-500 text-amber-950 font-bold text-[10px] flex items-center space-x-0.5 transition-colors cursor-pointer"
                  title="Kembalikan ke tanggal hari ini"
                >
                  <RotateCcw className="w-2.5 h-2.5" />
                  <span>Hari Ini</span>
                </button>
              )}
            </div>

            {/* Saldo Kas RT */}
            <div className="flex items-center space-x-1.5">
              <span className="font-extrabold text-[10px] uppercase text-stone-700">Saldo Kas:</span>
              <span className={`px-2 py-0.5 rounded-lg ${currentTheme.headerBadgeBg} ${currentTheme.headerAccentText} font-black text-[11px] shadow-2xs border ${currentTheme.headerBadgeBorder}`}>
                Rp {saldoKas.toLocaleString('id-ID')}
              </span>
            </div>
          </div>
        </div>

        {/* Menu Navigation Items */}
        <div className="space-y-2">
          {appMode === 'warga' ? (
            /* Mode Warga Restricted Menu */
            <>
              {/* 1. Rekap Kas & Laporan RT */}
              <button
                onClick={() => {
                  onNavigate('kas_rekap');
                  onClose();
                }}
                className="w-full p-3 rounded-2xl bg-white border border-stone-200 hover:border-purple-300 hover:bg-stone-50/80 flex items-center justify-between gap-3 text-left transition-all shadow-2xs cursor-pointer group"
                id="menu-item-kas-warga"
              >
                <div className="flex items-center space-x-3 min-w-0">
                  <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-700 border border-purple-100 flex items-center justify-center flex-shrink-0 group-hover:scale-105 transition-transform">
                    <BarChart3 className="w-5 h-5" />
                  </div>
                  <div className="min-w-0">
                    <h3 className="font-bold text-stone-900 text-sm tracking-tight">
                      Buku Kas & Transparansi RT
                    </h3>
                    <p className="text-xs text-stone-500 truncate">
                      Saldo kas, grafik penerimaan & mutasi dana
                    </p>
                  </div>
                </div>
                <ChevronRight className="w-5 h-5 text-stone-400 group-hover:text-purple-600 transition-colors flex-shrink-0" />
              </button>

              {/* 2. Data Warga & Riwayat Jimpitan */}
              <button
                onClick={() => {
                  onNavigate('data_warga');
                  onClose();
                }}
                className="w-full p-3 rounded-2xl bg-white border border-stone-200 hover:border-purple-300 hover:bg-stone-50/80 flex items-center justify-between gap-3 text-left transition-all shadow-2xs cursor-pointer group"
                id="menu-item-warga-warga"
              >
                <div className="flex items-center space-x-3 min-w-0">
                  <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-700 border border-purple-100 flex items-center justify-center flex-shrink-0 group-hover:scale-105 transition-transform">
                    <Users className="w-5 h-5" />
                  </div>
                  <div className="min-w-0">
                    <h3 className="font-bold text-stone-900 text-sm tracking-tight">
                      Data Warga & Riwayat Rumah
                    </h3>
                    <p className="text-xs text-stone-500 truncate">
                      Cek status & riwayat jimpitan rumah Anda
                    </p>
                  </div>
                </div>
                <ChevronRight className="w-5 h-5 text-stone-400 group-hover:text-purple-600 transition-colors flex-shrink-0" />
              </button>

              {/* 3. Switch to Mode Penginput */}
              {onSwitchMode && (
                <button
                  onClick={() => {
                    onClose();
                    onSwitchMode('penginput');
                  }}
                  className="w-full p-3 rounded-2xl bg-sky-50 border-2 border-sky-300 hover:border-sky-400 flex items-center justify-between gap-3 text-left transition-all shadow-2xs cursor-pointer group mt-2"
                  id="menu-item-switch-penginput"
                >
                  <div className="flex items-center space-x-3 min-w-0">
                    <div className="w-10 h-10 rounded-xl bg-sky-600 text-white flex items-center justify-center flex-shrink-0 group-hover:scale-105 transition-transform shadow-xs">
                      <QrCode className="w-5 h-5" />
                    </div>
                    <div className="min-w-0">
                      <h3 className="font-extrabold text-sky-950 text-sm tracking-tight flex items-center space-x-1.5">
                        <span>Masuk Mode Penginput</span>
                        <Lock className="w-3.5 h-3.5 text-sky-700" />
                      </h3>
                      <p className="text-xs text-sky-700 truncate">
                        Akses Scan QR, Kas & Rekap, Hitung Uang (PIN Ronda)
                      </p>
                    </div>
                  </div>
                  <ChevronRight className="w-5 h-5 text-sky-600 transition-colors flex-shrink-0" />
                </button>
              )}

              {/* 4. Switch to Mode Petugas / Pengurus RT / Admin */}
              {onSwitchMode && (
                <button
                  onClick={() => {
                    onClose();
                    onSwitchMode('petugas');
                  }}
                  className="w-full p-3 rounded-2xl bg-amber-50 border-2 border-amber-300 hover:border-amber-400 flex items-center justify-between gap-3 text-left transition-all shadow-2xs cursor-pointer group"
                  id="menu-item-switch-petugas"
                >
                  <div className="flex items-center space-x-3 min-w-0">
                    <div className="w-10 h-10 rounded-xl bg-amber-600 text-white flex items-center justify-center flex-shrink-0 group-hover:scale-105 transition-transform shadow-xs">
                      <ShieldCheck className="w-5 h-5" />
                    </div>
                    <div className="min-w-0">
                      <h3 className="font-extrabold text-amber-950 text-sm tracking-tight flex items-center space-x-1.5">
                        <span>Masuk Mode Petugas / Admin</span>
                        <Lock className="w-3.5 h-3.5 text-amber-700" />
                      </h3>
                      <p className="text-xs text-amber-700 truncate">
                        Akses Master Warga & Pengaturan Lengkap (1x PIN)
                      </p>
                    </div>
                  </div>
                  <ChevronRight className="w-5 h-5 text-amber-600 transition-colors flex-shrink-0" />
                </button>
              )}
            </>
          ) : appMode === 'penginput' ? (
            /* Mode Penginput Menu (Scan QR, Kas & Rekap, Hitung Uang, Mutasi) */
            <>
              {/* 1. Scan & Input Jimpitan */}
              <button
                onClick={() => {
                  onNavigate('scan');
                  onClose();
                }}
                className="w-full p-3 rounded-2xl bg-white border border-stone-200 hover:border-sky-300 hover:bg-stone-50/80 flex items-center justify-between gap-3 text-left transition-all shadow-2xs cursor-pointer group"
                id="menu-item-scan-penginput"
              >
                <div className="flex items-center space-x-3 min-w-0">
                  <div className="w-10 h-10 rounded-xl bg-sky-50 text-sky-700 border border-sky-200 flex items-center justify-center flex-shrink-0 group-hover:scale-105 transition-transform">
                    <QrCode className="w-5 h-5" />
                  </div>
                  <div className="min-w-0">
                    <h3 className="font-bold text-stone-900 text-sm tracking-tight">
                      Scan & Input Jimpitan
                    </h3>
                    <p className="text-xs text-stone-500 truncate">
                      Kamera scanner & input manual jimpitan
                    </p>
                  </div>
                </div>
                <ChevronRight className="w-5 h-5 text-stone-400 group-hover:text-sky-600 transition-colors flex-shrink-0" />
              </button>

              {/* 2. Rekap Kas & Laporan */}
              <button
                onClick={() => {
                  onNavigate('kas_rekap');
                  onClose();
                }}
                className="w-full p-3 rounded-2xl bg-white border border-stone-200 hover:border-sky-300 hover:bg-stone-50/80 flex items-center justify-between gap-3 text-left transition-all shadow-2xs cursor-pointer group"
                id="menu-item-kas-penginput"
              >
                <div className="flex items-center space-x-3 min-w-0">
                  <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-700 border border-purple-100 flex items-center justify-center flex-shrink-0 group-hover:scale-105 transition-transform">
                    <BarChart3 className="w-5 h-5" />
                  </div>
                  <div className="min-w-0">
                    <h3 className="font-bold text-stone-900 text-sm tracking-tight">
                      Kas & Rekap Laporan
                    </h3>
                    <p className="text-xs text-stone-500 truncate">
                      Buku kas, mutasi & rekap jimpitan
                    </p>
                  </div>
                </div>
                <ChevronRight className="w-5 h-5 text-stone-400 group-hover:text-purple-600 transition-colors flex-shrink-0" />
              </button>

              {/* 3. Hitung Pecahan Uang */}
              <button
                onClick={() => {
                  onNavigate('hitung_uang');
                  onClose();
                }}
                className="w-full p-3 rounded-2xl bg-white border border-stone-200 hover:border-amber-300 hover:bg-stone-50/80 flex items-center justify-between gap-3 text-left transition-all shadow-2xs cursor-pointer group"
                id="menu-item-hitung-uang-penginput"
              >
                <div className="flex items-center space-x-3 min-w-0">
                  <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-700 border border-amber-200 flex items-center justify-center flex-shrink-0 group-hover:scale-105 transition-transform">
                    <Calculator className="w-5 h-5" />
                  </div>
                  <div className="min-w-0">
                    <h3 className="font-extrabold text-stone-900 text-sm tracking-tight">
                      Hitung Pecahan Uang
                    </h3>
                    <p className="text-xs text-stone-500 truncate">
                      Kalkulator koin & lembar kas fisik
                    </p>
                  </div>
                </div>
                <ChevronRight className="w-5 h-5 text-stone-400 group-hover:text-amber-600 transition-colors flex-shrink-0" />
              </button>

              {/* 4. Pengeluaran Kas Modal */}
              <button
                onClick={() => {
                  onClose();
                  onOpenPengeluaranKas();
                }}
                className="w-full p-3 rounded-2xl bg-white border border-stone-200 hover:border-rose-300 hover:bg-rose-50/40 flex items-center justify-between gap-3 text-left transition-all shadow-2xs cursor-pointer group"
                id="menu-item-pengeluaran-kas-penginput"
              >
                <div className="flex items-center space-x-3 min-w-0">
                  <div className="w-10 h-10 rounded-xl bg-rose-50 text-rose-600 border border-rose-100 flex items-center justify-center flex-shrink-0 group-hover:scale-105 transition-transform">
                    <Wallet className="w-5 h-5" />
                  </div>
                  <div className="min-w-0">
                    <h3 className="font-bold text-stone-900 text-sm tracking-tight">
                      Catat Pengeluaran Kas
                    </h3>
                    <p className="text-xs text-stone-500 truncate">
                      Input belanja operasional ronda / fasum
                    </p>
                  </div>
                </div>
                <ChevronRight className="w-5 h-5 text-stone-400 group-hover:text-rose-600 transition-colors flex-shrink-0" />
              </button>

              {/* 5. Switch to Petugas / Admin */}
              {onSwitchMode && (
                <button
                  onClick={() => {
                    onClose();
                    onSwitchMode('petugas');
                  }}
                  className="w-full p-3 rounded-2xl bg-amber-50 border-2 border-amber-300 hover:border-amber-400 flex items-center justify-between gap-3 text-left transition-all shadow-2xs cursor-pointer group mt-2"
                  id="menu-item-switch-to-petugas"
                >
                  <div className="flex items-center space-x-3 min-w-0">
                    <div className="w-10 h-10 rounded-xl bg-amber-600 text-white flex items-center justify-center flex-shrink-0 group-hover:scale-105 transition-transform shadow-xs">
                      <ShieldCheck className="w-5 h-5" />
                    </div>
                    <div className="min-w-0">
                      <h3 className="font-extrabold text-amber-950 text-sm tracking-tight flex items-center space-x-1.5">
                        <span>Beralih ke Mode Petugas / Admin</span>
                        <Lock className="w-3.5 h-3.5 text-amber-700" />
                      </h3>
                      <p className="text-xs text-amber-700 truncate">
                        Kelola data warga, rekap lengkap & pengaturan RT
                      </p>
                    </div>
                  </div>
                  <ChevronRight className="w-5 h-5 text-amber-600 transition-colors flex-shrink-0" />
                </button>
              )}
            </>
          ) : (
            /* Mode Petugas / Admin Full Menu */
            <>
              {/* === PROMINENT LAPORAN & REKAPITULASI RT SECTION === */}
              <div className="p-3.5 rounded-2xl bg-gradient-to-br from-slate-900 via-sky-950 to-slate-900 text-white border border-sky-800/40 shadow-sm space-y-3">
                <div className="flex items-center justify-between border-b border-white/10 pb-2">
                  <div className="flex items-center space-x-2">
                    <div className="p-1.5 rounded-lg bg-sky-500/20 text-sky-300">
                      <FileText className="w-4 h-4" />
                    </div>
                    <div>
                      <h3 className="font-black text-sm text-white tracking-tight">
                        Laporan & Rekapitulasi RT
                      </h3>
                      <p className="text-[10px] text-sky-200/70">
                        Pusat cetak PDF & rincian pertanggungjawaban
                      </p>
                    </div>
                  </div>

                  {onOpenLaporanHub && (
                    <button
                      onClick={() => {
                        onClose();
                        onOpenLaporanHub('kas');
                      }}
                      className="px-2.5 py-1 rounded-lg bg-sky-500 hover:bg-sky-400 text-white font-extrabold text-[11px] flex items-center space-x-1 shadow-xs transition-colors cursor-pointer"
                    >
                      <span>Buka Semua</span>
                      <ChevronRight className="w-3 h-3" />
                    </button>
                  )}
                </div>

                {/* 4+ Direct Report Triggers Grid */}
                <div className="grid grid-cols-2 gap-2">
                  {/* 1. Laporan Kas */}
                  <button
                    onClick={() => {
                      onClose();
                      if (onOpenLaporanHub) onOpenLaporanHub('kas');
                    }}
                    className="p-2.5 rounded-xl bg-white/10 hover:bg-white/20 border border-white/10 text-left transition-all group cursor-pointer"
                  >
                    <div className="flex items-center space-x-2 text-sky-300 mb-1">
                      <Wallet className="w-3.5 h-3.5 group-hover:scale-110 transition-transform" />
                      <span className="text-[11px] font-extrabold text-white">Laporan Kas</span>
                    </div>
                    <p className="text-[9px] text-slate-300 leading-tight">
                      Buku kas & saldo RT
                    </p>
                  </button>

                  {/* 2. Laporan Kurang/Lebih Bayar Warga */}
                  <button
                    onClick={() => {
                      onClose();
                      if (onOpenLaporanHub) onOpenLaporanHub('tunggakan');
                    }}
                    className="p-2.5 rounded-xl bg-white/10 hover:bg-white/20 border border-white/10 text-left transition-all group cursor-pointer"
                  >
                    <div className="flex items-center space-x-2 text-amber-300 mb-1">
                      <UsersIcon className="w-3.5 h-3.5 group-hover:scale-110 transition-transform" />
                      <span className="text-[11px] font-extrabold text-white">Kurang/Lebih Bayar</span>
                    </div>
                    <p className="text-[9px] text-slate-300 leading-tight">
                      Status tunggakan & deposit
                    </p>
                  </button>

                  {/* 3. Laporan Pemasukan */}
                  <button
                    onClick={() => {
                      onClose();
                      if (onOpenLaporanHub) onOpenLaporanHub('pemasukan');
                    }}
                    className="p-2.5 rounded-xl bg-white/10 hover:bg-white/20 border border-white/10 text-left transition-all group cursor-pointer"
                  >
                    <div className="flex items-center space-x-2 text-emerald-300 mb-1">
                      <TrendingUp className="w-3.5 h-3.5 group-hover:scale-110 transition-transform" />
                      <span className="text-[11px] font-extrabold text-white">Laporan Pemasukan</span>
                    </div>
                    <p className="text-[9px] text-slate-300 leading-tight">
                      Jimpitan & donasi masuk
                    </p>
                  </button>

                  {/* 4. Laporan Pengeluaran */}
                  <button
                    onClick={() => {
                      onClose();
                      if (onOpenLaporanHub) onOpenLaporanHub('pengeluaran');
                    }}
                    className="p-2.5 rounded-xl bg-white/10 hover:bg-white/20 border border-white/10 text-left transition-all group cursor-pointer"
                  >
                    <div className="flex items-center space-x-2 text-rose-300 mb-1">
                      <TrendingDown className="w-3.5 h-3.5 group-hover:scale-110 transition-transform" />
                      <span className="text-[11px] font-extrabold text-white">Laporan Pengeluaran</span>
                    </div>
                    <p className="text-[9px] text-slate-300 leading-tight">
                      Rincian nota belanja RT
                    </p>
                  </button>
                </div>

                {/* 5. Laporan Bulanan Pertanggal (1-31 Hari) */}
                <button
                  onClick={() => {
                    onClose();
                    if (onOpenLaporanHub) onOpenLaporanHub('bulanan');
                  }}
                  className="w-full p-2.5 rounded-xl bg-indigo-500/20 hover:bg-indigo-500/30 border border-indigo-400/30 flex items-center justify-between text-left transition-all cursor-pointer"
                >
                  <div className="flex items-center space-x-2 text-indigo-200">
                    <CalendarIcon className="w-4 h-4 text-indigo-300" />
                    <div>
                      <span className="text-xs font-black text-white block leading-tight">
                        Laporan Bulanan Pertanggal (Matriks 1-31)
                      </span>
                      <span className="text-[9px] text-indigo-200/80">
                        Matriks presensi & setoran seluruh rumah A4 Landscape
                      </span>
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-indigo-300" />
                </button>
              </div>

              {/* OPERASIONAL & FITUR UTAMA RT */}
              <div className="text-[10px] font-extrabold uppercase tracking-wider text-stone-500 pt-1">
                Operasional & Fitur Lapangan
              </div>

              {/* 1. Scan & Input Jimpitan */}
              <button
                onClick={() => {
                  onNavigate('scan');
                  onClose();
                }}
                className="w-full p-3 rounded-2xl bg-white border border-stone-200 hover:border-sky-300 hover:bg-stone-50/80 flex items-center justify-between gap-3 text-left transition-all shadow-2xs cursor-pointer group"
                id="menu-item-scan"
              >
                <div className="flex items-center space-x-3 min-w-0">
                  <div className="w-10 h-10 rounded-xl bg-sky-50 text-sky-700 border border-sky-100 flex items-center justify-center flex-shrink-0 group-hover:scale-105 transition-transform">
                    <QrCode className="w-5 h-5" />
                  </div>
                  <div className="min-w-0">
                    <h3 className="font-bold text-stone-900 text-sm tracking-tight">
                      Scan & Input Jimpitan
                    </h3>
                    <p className="text-xs text-stone-500 truncate">
                      Kamera scanner & input manual jimpitan
                    </p>
                  </div>
                </div>
                <ChevronRight className="w-5 h-5 text-stone-400 group-hover:text-sky-600 transition-colors flex-shrink-0" />
              </button>

              {/* 2. Rekap Kas & Buku Transaksi */}
              <button
                onClick={() => {
                  onNavigate('kas_rekap');
                  onClose();
                }}
                className="w-full p-3 rounded-2xl bg-white border border-stone-200 hover:border-purple-300 hover:bg-stone-50/80 flex items-center justify-between gap-3 text-left transition-all shadow-2xs cursor-pointer group"
                id="menu-item-kas"
              >
                <div className="flex items-center space-x-3 min-w-0">
                  <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-700 border border-purple-100 flex items-center justify-center flex-shrink-0 group-hover:scale-105 transition-transform">
                    <BarChart3 className="w-5 h-5" />
                  </div>
                  <div className="min-w-0">
                    <h3 className="font-bold text-stone-900 text-sm tracking-tight">
                      Buku Kas & Riwayat Transaksi
                    </h3>
                    <p className="text-xs text-stone-500 truncate">
                      Grafik tren & daftar mutasi transaksi
                    </p>
                  </div>
                </div>
                <ChevronRight className="w-5 h-5 text-stone-400 group-hover:text-purple-600 transition-colors flex-shrink-0" />
              </button>

              {/* 3. Rekap Piutang & Tunggakan Warga */}
              <button
                onClick={() => {
                  onNavigate('rekap_piutang');
                  onClose();
                }}
                className="w-full p-3 rounded-2xl bg-white border border-stone-200 hover:border-amber-300 hover:bg-stone-50/80 flex items-center justify-between gap-3 text-left transition-all shadow-2xs cursor-pointer group"
                id="menu-item-rekap-piutang-petugas"
              >
                <div className="flex items-center space-x-3 min-w-0">
                  <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-700 border border-amber-200 flex items-center justify-center flex-shrink-0 group-hover:scale-105 transition-transform">
                    <Receipt className="w-5 h-5" />
                  </div>
                  <div className="min-w-0">
                    <h3 className="font-bold text-stone-900 text-sm tracking-tight">
                      Rekap Piutang & Tunggakan Warga
                    </h3>
                    <p className="text-xs text-stone-500 truncate">
                      Filter per tahun, pelunasan kas & penagihan WhatsApp
                    </p>
                  </div>
                </div>
                <ChevronRight className="w-5 h-5 text-stone-400 group-hover:text-amber-600 transition-colors flex-shrink-0" />
              </button>

              {/* 4. Data Warga & Rumah */}
              <button
                onClick={() => {
                  onNavigate('data_warga');
                  onClose();
                }}
                className="w-full p-3 rounded-2xl bg-white border border-stone-200 hover:border-purple-300 hover:bg-stone-50/80 flex items-center justify-between gap-3 text-left transition-all shadow-2xs cursor-pointer group"
                id="menu-item-warga"
              >
                <div className="flex items-center space-x-3 min-w-0">
                  <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-700 border border-purple-100 flex items-center justify-center flex-shrink-0 group-hover:scale-105 transition-transform">
                    <UsersIcon className="w-5 h-5" />
                  </div>
                  <div className="min-w-0">
                    <h3 className="font-bold text-stone-900 text-sm tracking-tight">
                      Data Warga & Rumah
                    </h3>
                    <p className="text-xs text-stone-500 truncate">
                      Direktori KK, nomor rumah & QR token
                    </p>
                  </div>
                </div>
                <ChevronRight className="w-5 h-5 text-stone-400 group-hover:text-purple-600 transition-colors flex-shrink-0" />
              </button>

              {/* 4. Hitung Pecahan Uang */}
              <button
                onClick={() => {
                  onNavigate('hitung_uang');
                  onClose();
                }}
                className="w-full p-3 rounded-2xl bg-white border border-stone-200 hover:border-amber-300 hover:bg-stone-50/80 flex items-center justify-between gap-3 text-left transition-all shadow-2xs cursor-pointer group"
                id="menu-item-hitung-uang"
              >
                <div className="flex items-center space-x-3 min-w-0">
                  <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-700 border border-amber-200 flex items-center justify-center flex-shrink-0 group-hover:scale-105 transition-transform">
                    <Calculator className="w-5 h-5" />
                  </div>
                  <div className="min-w-0">
                    <h3 className="font-extrabold text-stone-900 text-sm tracking-tight">
                      Hitung Pecahan Uang
                    </h3>
                    <p className="text-xs text-stone-500 truncate">
                      Hitung koin & lembar kas fisik
                    </p>
                  </div>
                </div>
                <ChevronRight className="w-5 h-5 text-stone-400 group-hover:text-amber-600 transition-colors flex-shrink-0" />
              </button>

              {/* 5. Pengeluaran Kas Modal */}
              <button
                onClick={() => {
                  onClose();
                  onOpenPengeluaranKas();
                }}
                className="w-full p-3 rounded-2xl bg-white border border-stone-200 hover:border-rose-300 hover:bg-rose-50/40 flex items-center justify-between gap-3 text-left transition-all shadow-2xs cursor-pointer group"
                id="menu-item-pengeluaran-kas"
              >
                <div className="flex items-center space-x-3 min-w-0">
                  <div className="w-10 h-10 rounded-xl bg-rose-50 text-rose-600 border border-rose-100 flex items-center justify-center flex-shrink-0 group-hover:scale-105 transition-transform">
                    <Wallet className="w-5 h-5" />
                  </div>
                  <div className="min-w-0">
                    <h3 className="font-bold text-stone-900 text-sm tracking-tight">
                      Catat Pengeluaran Kas
                    </h3>
                    <p className="text-xs text-stone-500 truncate">
                      Input belanja operasional ronda & fasum
                    </p>
                  </div>
                </div>
                <ChevronRight className="w-5 h-5 text-stone-400 group-hover:text-rose-600 transition-colors flex-shrink-0" />
              </button>

              {/* 6. Cetak Kartu QR Rumah */}
              <button
                onClick={() => {
                  onClose();
                  onOpenCetakQr();
                }}
                className="w-full p-3 rounded-2xl bg-white border border-stone-200 hover:border-indigo-300 hover:bg-indigo-50/40 flex items-center justify-between gap-3 text-left transition-all shadow-2xs cursor-pointer group"
                id="menu-item-cetak-qr"
              >
                <div className="flex items-center space-x-3 min-w-0">
                  <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 border border-indigo-100 flex items-center justify-center flex-shrink-0 group-hover:scale-105 transition-transform">
                    <Printer className="w-5 h-5" />
                  </div>
                  <div className="min-w-0">
                    <h3 className="font-bold text-stone-900 text-sm tracking-tight">
                      Cetak Kartu QR Rumah
                    </h3>
                    <p className="text-xs text-stone-500 truncate">
                      Cetak lembar stiker QR jimpitan
                    </p>
                  </div>
                </div>
                <ChevronRight className="w-5 h-5 text-stone-400 group-hover:text-indigo-600 transition-colors flex-shrink-0" />
              </button>
            </>
          )}
        </div>

        {/* Bottom Actions: Beralih Mode / Kunci */}
        <div className="space-y-2 pt-1 border-t border-stone-200">
          {appMode !== 'warga' && onSwitchMode && (
            <button
              onClick={() => {
                onClose();
                onSwitchMode('warga');
              }}
              className="w-full p-3 rounded-2xl bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 flex items-center justify-between gap-3 text-left transition-all shadow-2xs cursor-pointer"
              id="btn-switch-to-warga-menu"
            >
              <div className="flex items-center space-x-2.5">
                <Users className="w-4 h-4 text-emerald-700" />
                <span className="font-bold text-emerald-950 text-xs sm:text-sm">
                  Beralih ke Mode Warga (Transparansi)
                </span>
              </div>
              <span className="text-xs text-emerald-700 font-extrabold">
                Aktifkan
              </span>
            </button>
          )}

          {appMode === 'petugas' && (
            <button
              onClick={() => {
                onLockApp();
                onClose();
              }}
              className="w-full p-3 rounded-2xl bg-white border border-stone-200 hover:border-stone-300 hover:bg-stone-50 flex items-center justify-between gap-3 text-left transition-all shadow-2xs cursor-pointer"
              id="btn-kunci-aplikasi-modal"
            >
              <div className="flex items-center space-x-2.5">
                <Lock className="w-4 h-4 text-stone-600" />
                <span className="font-bold text-stone-800 text-xs sm:text-sm">
                  Kunci Akses Admin
                </span>
              </div>
              <span className="text-xs text-stone-400 font-medium">
                Kunci Sekarang
              </span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
