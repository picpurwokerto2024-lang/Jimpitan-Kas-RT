import React from 'react';
import { 
  QrCode, 
  BarChart3, 
  Users, 
  Receipt,
  Menu 
} from 'lucide-react';
import { AppMode } from '../types';
import { AppTheme, AVAILABLE_THEMES } from '../utils/themeManager';

export type TabType = 'scan' | 'kas_rekap' | 'rekap_piutang' | 'data_warga' | 'hitung_uang' | 'menu';

interface BottomNavProps {
  activeTab: TabType;
  onChangeTab: (tab: TabType) => void;
  appMode?: AppMode;
  theme?: AppTheme;
}

export const BottomNav: React.FC<BottomNavProps> = ({ 
  activeTab, 
  onChangeTab, 
  appMode = 'warga',
  theme = AVAILABLE_THEMES[0],
}) => {
  const allTabs = [
    { id: 'scan', label: 'Scan QR', icon: QrCode },
    { id: 'kas_rekap', label: 'Kas RT', icon: BarChart3 },
    { id: 'rekap_piutang', label: 'Rekap Piutang', icon: Receipt },
    { id: 'data_warga', label: 'Data Warga', icon: Users },
    { id: 'menu', label: 'Menu', icon: Menu },
  ] as const;

  const wargaTabs = [
    { id: 'kas_rekap', label: 'Kas RT', icon: BarChart3 },
    { id: 'rekap_piutang', label: 'Rekap Piutang', icon: Receipt },
    { id: 'data_warga', label: 'Data Warga', icon: Users },
  ] as const;

  const penginputTabs = [
    { id: 'scan', label: 'Scan QR', icon: QrCode },
    { id: 'kas_rekap', label: 'Kas RT', icon: BarChart3 },
    { id: 'rekap_piutang', label: 'Rekap Piutang', icon: Receipt },
    { id: 'menu', label: 'Menu', icon: Menu },
  ] as const;

  const tabs = appMode === 'warga'
    ? wargaTabs
    : appMode === 'penginput'
      ? penginputTabs
      : allTabs;

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-stone-200/90 shadow-lg select-none" id="app-bottom-navigation">
      <div className="max-w-xl mx-auto flex items-center justify-around relative">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;

          return (
            <button
              key={tab.id}
              onClick={() => onChangeTab(tab.id as TabType)}
              className={`flex-1 ${appMode === 'warga' ? 'py-3 sm:py-3.5' : 'py-2 sm:py-2.5'} flex flex-col items-center justify-center relative transition-all duration-200 active:scale-92 cursor-pointer ${
                isActive
                  ? `${theme.bottomNavActive} font-extrabold`
                  : 'text-stone-400 hover:text-stone-600 font-medium'
              }`}
              id={`nav-tab-${tab.id}`}
            >
              {/* Active Animated Top Highlight Bar Indicator */}
              {isActive && (
                <div 
                  className={`absolute top-0 ${appMode === 'warga' ? 'left-10 right-10' : 'left-3 sm:left-4 right-3 sm:right-4'} h-0.5 ${theme.bottomNavIndicator} rounded-full shadow-xs transition-all duration-300 animate-in fade-in zoom-in-95`} 
                />
              )}

              {/* Active Tab Background Bubble */}
              {isActive && (
                <div
                  className="absolute inset-x-2 inset-y-1 rounded-xl bg-stone-100/70 -z-10 transition-all duration-200"
                />
              )}

              <div
                className={`transition-transform duration-200 ${isActive ? 'scale-110 -translate-y-0.5' : 'scale-100 translate-y-0'}`}
              >
                <Icon className={`${appMode === 'warga' ? 'w-6 h-6' : 'w-5 h-5 sm:w-5.5 sm:h-5.5'} ${isActive ? theme.bottomNavIcon : ''}`} />
              </div>

              <span className={`${appMode === 'warga' ? 'text-xs font-bold' : 'text-[10px] sm:text-[11px]'} mt-1 tracking-tight truncate max-w-full transition-colors duration-200`}>
                {tab.label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
};
