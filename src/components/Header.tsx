import React from 'react';
import { 
  Menu as MenuIcon,
  CloudCheck,
  RefreshCw,
  Users,
  ShieldCheck,
  Calendar,
  QrCode,
  CloudOff,
  WifiOff
} from 'lucide-react';
import { AppSettings, AppMode } from '../types';
import { AppTheme, AVAILABLE_THEMES } from '../utils/themeManager';
import { getTodayDateIso, formatTanggalSingkat } from '../utils/formatters';
import { RtLogo } from './RtLogo';
import { useOnlineStatus } from '../hooks/useOnlineStatus';

interface HeaderProps {
  settings: AppSettings;
  selectedDate: string;
  onDateChange: (newDate: string) => void;
  saldoKas: number;
  activeReguName?: string;
  isAdminUnlocked: boolean;
  onToggleAdminLock: () => void;
  onOpenPanduan: () => void;
  onOpenShareModal: () => void;
  onOpenQuickMenu: () => void;
  onToggleSound: () => void;
  onOpenInstallModal?: () => void;
  isSyncing?: boolean;
  appMode?: AppMode;
  onSwitchMode?: (mode: AppMode) => void;
  onOpenModeSelector?: () => void;
  theme?: AppTheme;
}

export const Header: React.FC<HeaderProps> = ({
  settings,
  selectedDate,
  onDateChange,
  onOpenQuickMenu,
  isSyncing = false,
  appMode = 'warga',
  onSwitchMode,
  onOpenModeSelector,
  theme = AVAILABLE_THEMES[0],
}) => {
  const isOnline = useOnlineStatus();
  const liveToday = getTodayDateIso();
  const isPastDate = selectedDate !== liveToday;

  return (
    <header className={`w-full ${theme.headerGradient} border-b ${theme.headerBorder} sticky top-0 z-30 shadow-md text-white transition-colors duration-300`} id="jimpitan-app-header">
      {/* Top Main Bar */}
      <div className="max-w-xl mx-auto px-4 py-2.5 flex items-center justify-between">
        {/* Left: App Logo & RT Tag */}
        <div className="flex items-center space-x-2.5">
          {/* RT Logo Emblem Box */}
          <div className={`w-10 h-10 rounded-2xl ${theme.headerBadgeBg} border ${theme.headerBadgeBorder} flex items-center justify-center p-1 shadow-md`}>
            <RtLogo className="w-8 h-8 drop-shadow-xs" />
          </div>

          <div>
            <div className="flex items-center space-x-1.5 flex-wrap gap-y-1">
              <h1 className="font-black text-white text-base sm:text-lg tracking-tight flex items-center font-sans">
                <span>JIMPITAN RT</span>
                <span className={`w-2 h-2 rounded-full ml-1.5 inline-block ${isOnline ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'}`} title={isOnline ? "Online & Sync Aktif" : "Offline (Tersimpan Lokal)"} />
              </h1>
              {/* Cloud Sync / Offline indicator badge */}
              {isOnline ? (
                <span className={`inline-flex items-center space-x-1 px-1.5 py-0.5 rounded-md ${theme.headerBadgeBg} border ${theme.headerBadgeBorder} text-emerald-300 text-[10px] font-bold`}>
                  {isSyncing ? (
                    <RefreshCw className="w-2.5 h-2.5 animate-spin text-emerald-400" />
                  ) : (
                    <CloudCheck className="w-3 h-3 text-emerald-400" />
                  )}
                  <span>SYNC</span>
                </span>
              ) : (
                <span className="inline-flex items-center space-x-1 px-1.5 py-0.5 rounded-md bg-amber-500/30 border border-amber-400/50 text-amber-200 text-[10px] font-bold shadow-2xs">
                  <CloudOff className="w-3 h-3 text-amber-300" />
                  <span>OFFLINE</span>
                </span>
              )}

              {/* Mode Switcher Pill */}
              {(onOpenModeSelector || onSwitchMode) && (
                <button
                  type="button"
                  onClick={() => {
                    if (onOpenModeSelector) {
                      onOpenModeSelector();
                    } else if (onSwitchMode) {
                      if (appMode === 'warga') onSwitchMode('penginput');
                      else if (appMode === 'penginput') onSwitchMode('petugas');
                      else onSwitchMode('warga');
                    }
                  }}
                  className={`inline-flex items-center space-x-1 px-2 py-0.5 rounded-full text-[10px] font-extrabold border transition-all cursor-pointer shadow-2xs ${
                    appMode === 'warga'
                      ? 'bg-emerald-500/30 text-emerald-200 border-emerald-400/60 hover:bg-emerald-500/40'
                      : appMode === 'penginput'
                        ? 'bg-sky-500/30 text-sky-200 border-sky-400/60 hover:bg-sky-500/40 ring-1 ring-sky-300/40'
                        : 'bg-amber-500/30 text-amber-200 border-amber-400/60 hover:bg-amber-500/40 ring-1 ring-amber-300/40'
                  }`}
                  title={`Mode saat ini: ${appMode.toUpperCase()}. Klik untuk memilih atau beralih mode.`}
                  id="btn-header-mode-toggle"
                >
                  {appMode === 'warga' ? (
                    <>
                      <Users className="w-2.5 h-2.5 text-emerald-300" />
                      <span>Mode Warga</span>
                    </>
                  ) : appMode === 'penginput' ? (
                    <>
                      <QrCode className="w-2.5 h-2.5 text-sky-300" />
                      <span>Penginput</span>
                    </>
                  ) : (
                    <>
                      <ShieldCheck className="w-2.5 h-2.5 text-amber-300" />
                      <span>Petugas / Admin</span>
                    </>
                  )}
                </button>
              )}

              {/* Past date indicator badge */}
              {isPastDate && (
                <button
                  type="button"
                  onClick={() => onDateChange(liveToday)}
                  className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-amber-400 text-amber-950 border border-amber-300 shadow-xs hover:bg-amber-300 transition-colors cursor-pointer"
                  title="Klik untuk kembali ke tanggal hari ini"
                >
                  <Calendar className="w-2.5 h-2.5" />
                  <span>{formatTanggalSingkat(selectedDate)}</span>
                  <span className="opacity-70 text-[9px]">(Klik Reset)</span>
                </button>
              )}
            </div>

            {/* RT/RW & Lingkungan */}
            <div className={`flex items-center space-x-1.5 text-xs ${theme.subText} font-semibold mt-0.5`}>
              <span className={`tracking-wide ${theme.headerAccentText}`}>{settings.namaRt} / {settings.namaRw}</span>
              <span className="opacity-60">•</span>
              <span className="opacity-90 font-medium truncate max-w-[140px] sm:max-w-[180px]">
                {settings.lingkungan || 'Sistem Jimpitan RT'}
              </span>
            </div>
          </div>
        </div>

        {/* Right: ONLY Hamburger Menu Button (Garis 3) */}
        <div className="flex items-center">
          <button
            onClick={onOpenQuickMenu}
            className={`w-10 h-10 rounded-2xl flex items-center justify-center text-white ${theme.headerBadgeBg} hover:opacity-90 border ${theme.headerBadgeBorder} shadow-md transition-all cursor-pointer`}
            title="Buka Menu, Panduan, Gembok, Suara, Download & Bagikan"
            id="btn-menu-header"
          >
            <MenuIcon className="w-5 h-5" />
          </button>
        </div>
      </div>
    </header>
  );
};
