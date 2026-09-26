import React, { useState, useEffect, useRef } from 'react';
import { LogOut, Receipt, Shield, Lock } from 'lucide-react';
import { 
  Warga, 
  JimpitanRecord, 
  ReguRonda, 
  KasMutation, 
  AppSettings,
  MoneyDenomination,
  RondaSession,
  AppMode,
  UserPresence
} from './types';
import { 
  DEFAULT_WARGA, 
  DEFAULT_REGU, 
  DEFAULT_MUTATIONS, 
  DEFAULT_SETTINGS 
} from './data/defaultData';
import { Header } from './components/Header';
import { DashboardSummaryCard } from './components/DashboardSummaryCard';
import { ScannerSection } from './components/ScannerSection';
import { KasRekapView } from './components/KasRekapView';
import { RekapPiutangView } from './components/RekapPiutangView';
import { DataWargaView } from './components/DataWargaView';
import { HitungUangView } from './components/HitungUangView';
import { MenuView } from './components/MenuView';
import { BottomNav, TabType } from './components/BottomNav';
import { PanduanModal } from './components/PanduanModal';
import { WhatsAppShareModal } from './components/WhatsAppShareModal';
import { InstallShareModal } from './components/InstallShareModal';
import { FinishRondaModal } from './components/FinishRondaModal';
import { MenuModal } from './components/MenuModal';
import { JadwalRondaModal } from './components/JadwalRondaModal';
import { AdminPinModal } from './components/AdminPinModal';
import { ThemeModal } from './components/ThemeModal';
import { ModeSelectorModal } from './components/ModeSelectorModal';
import { LaporanHubModal, LaporanTabKey } from './components/LaporanHubModal';
import { OfflineBanner } from './components/OfflineBanner';
import { AppTheme, initializeAppTheme } from './utils/themeManager';
import { getTodayDateIso, formatTanggalIndo } from './utils/formatters';
import { 
  subscribeSettings,
  saveSettingsCloud,
  subscribeWarga,
  saveWargaCloud,
  deleteWargaCloud,
  subscribeJimpitanRecords,
  addJimpitanRecordCloud,
  deleteJimpitanRecordCloud,
  subscribeKasMutations,
  addKasMutationCloud,
  deleteKasMutationCloud,
  subscribeReguList,
  saveReguListCloud,
  subscribeMoneyCounts,
  saveMoneyCountsCloud,
  subscribeRondaSessions,
  saveRondaSessionCloud,
  DEFAULT_MONEY_DENOMINATION,
  resetAllCloudData,
  restoreFullCloudBackup,
  deleteSeptemberDataCloud,
  purgeArchiveAndDemoDataCloud,
  deduplicateCloudWargaNow,
  addBatchJimpitanRecordsCloud,
  sendPresenceHeartbeat,
  removePresenceSession,
  subscribeToActivePresences
} from './services/firebaseService';
import { checkWargaDuplicate, deduplicateWargaArray } from './utils/wargaDeduplicator';

  // Storage keys for local caching
const STORAGE_KEYS = {
  SETTINGS: 'jimpitan_settings_v1',
  WARGA: 'jimpitan_warga_v1',
  RECORDS: 'jimpitan_records_v1',
  MUTATIONS: 'jimpitan_mutations_v1',
  REGU: 'jimpitan_regu_v1',
  MONEY_COUNTS: 'jimpitan_money_counter_v1',
  SESSIONS: 'jimpitan_sessions_v1',
  SELECTED_DATE: 'jimpitan_selected_date_v1',
  APP_MODE: 'jimpitan_app_mode_v1',
};

export default function App() {
  // Application Mode: 'warga' (transparansi kas & data warga), 'penginput' (scan QR, kas, hitung uang), or 'petugas' (menu lengkap)
  const [appMode, setAppMode] = useState<AppMode>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.APP_MODE);
      if (saved === 'warga' || saved === 'petugas' || saved === 'penginput') return saved as AppMode;
    } catch (e) {
      // ignore
    }
    return 'warga';
  });

  // Navigation tab state (defaults to kas_rekap for warga mode, scan for penginput & petugas)
  const [activeTab, setActiveTab] = useState<TabType>(() => {
    try {
      const savedMode = localStorage.getItem(STORAGE_KEYS.APP_MODE);
      if (savedMode === 'petugas' || savedMode === 'penginput') return 'scan';
      return 'kas_rekap';
    } catch (e) {
      // ignore
    }
    return 'kas_rekap';
  });

  const handleSwitchMode = (mode: AppMode, bypassPinCheck = false) => {
    // Mode Warga: Lock admin & set read-only transparency mode
    if (mode === 'warga') {
      setIsAdminUnlocked(false);
      setAppMode('warga');
      try {
        localStorage.setItem(STORAGE_KEYS.APP_MODE, 'warga');
      } catch (e) {
        // ignore
      }
      if (activeTab !== 'kas_rekap' && activeTab !== 'data_warga') {
        setActiveTab('kas_rekap');
      }
      return;
    }

    // Mode Penginput (Operasional Ronda & Jimpitan)
    if (mode === 'penginput') {
      if (!bypassPinCheck && appMode === 'warga' && !isAdminUnlocked) {
        setModeSelectorTarget('penginput');
        setIsModeSelectorOpen(true);
        return;
      }
      setAppMode('penginput');
      try {
        localStorage.setItem(STORAGE_KEYS.APP_MODE, 'penginput');
      } catch (e) {
        // ignore
      }
      if (activeTab !== 'scan' && activeTab !== 'kas_rekap' && activeTab !== 'data_warga' && activeTab !== 'hitung_uang') {
        setActiveTab('scan');
      }
      return;
    }

    // Mode Petugas / Pengurus RT / Admin (Akses Penuh):
    // If not unlocked and not bypassed, prompt for PIN once
    if (!bypassPinCheck && !isAdminUnlocked) {
      setModeSelectorTarget('petugas');
      setIsModeSelectorOpen(true);
      return;
    }

    // Unlocked: Grant full access (Petugas == Pengurus RT == Admin)
    setIsAdminUnlocked(true);
    setAppMode('petugas');
    try {
      localStorage.setItem(STORAGE_KEYS.APP_MODE, 'petugas');
    } catch (e) {
      // ignore
    }
  };

  // Selected date state (defaults to today's date upon fresh load / refresh)
  const liveToday = getTodayDateIso();
  const [selectedDate, setSelectedDateState] = useState<string>(() => {
    return liveToday;
  });

  const setSelectedDate = (newDate: string | ((prev: string) => string)) => {
    setSelectedDateState((prev) => {
      const resolved = typeof newDate === 'function' ? newDate(prev) : newDate;
      try {
        localStorage.setItem(STORAGE_KEYS.SELECTED_DATE, resolved);
      } catch (e) {
        // ignore
      }
      return resolved;
    });
  };

  const handleResetToTodayDate = () => {
    const today = getTodayDateIso();
    setSelectedDate(today);
  };

  const isViewingPastDate = selectedDate !== liveToday;

  // Cloud sync indicator state
  const [isSyncing, setIsSyncing] = useState<boolean>(false);

  // App Settings
  const [settings, setSettings] = useState<AppSettings>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.SETTINGS);
      if (saved) return JSON.parse(saved);
    } catch (e) {
      console.warn('Failed to load settings', e);
    }
    return DEFAULT_SETTINGS;
  });

  // Warga List
  const [wargaList, setWargaList] = useState<Warga[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.WARGA);
      if (saved) {
        const parsed = JSON.parse(saved);
        const { cleanList } = deduplicateWargaArray(parsed);
        return cleanList;
      }
    } catch (e) {
      console.warn('Failed to load warga', e);
    }
    return DEFAULT_WARGA;
  });

  // Regu Ronda List
  const [reguList, setReguList] = useState<ReguRonda[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.REGU);
      if (saved) return JSON.parse(saved);
    } catch (e) {
      console.warn('Failed to load regu', e);
    }
    return DEFAULT_REGU;
  });

  // Petugas
  const [selectedReguId, setSelectedReguId] = useState<string>(DEFAULT_REGU[1].id);
  const [petugasNama, setPetugasNama] = useState<string>('Petugas RT');

  // Jimpitan Records (All Time)
  const [allRecords, setAllRecords] = useState<JimpitanRecord[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.RECORDS);
      if (saved) return JSON.parse(saved);
    } catch (e) {
      console.warn('Failed to load records', e);
    }
    return [];
  });

  // Kas Mutations
  const [kasMutations, setKasMutations] = useState<KasMutation[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.MUTATIONS);
      if (saved) return JSON.parse(saved);
    } catch (e) {
      console.warn('Failed to load mutations', e);
    }
    return DEFAULT_MUTATIONS;
  });

  // Money Counter (Pecahan Fisik) State
  const [moneyCounts, setMoneyCounts] = useState<MoneyDenomination>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.MONEY_COUNTS);
      if (saved) return JSON.parse(saved);
    } catch (e) {
      console.warn('Failed to load money counts', e);
    }
    return DEFAULT_MONEY_DENOMINATION;
  });

  // Ronda Sessions (per-date finish & closure status)
  const [rondaSessions, setRondaSessions] = useState<Record<string, RondaSession>>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.SESSIONS);
      if (saved) return JSON.parse(saved);
    } catch (e) {
      console.warn('Failed to load sessions', e);
    }
    return {};
  });

  // Admin lock toggle & PIN modal state (Persist unlock if in Petugas mode)
  const [isAdminUnlocked, setIsAdminUnlocked] = useState<boolean>(() => {
    try {
      const savedMode = localStorage.getItem(STORAGE_KEYS.APP_MODE);
      return savedMode === 'petugas';
    } catch (e) {
      return false;
    }
  });

  // Active User Presences State (Real-time monitoring warga online)
  const [activePresences, setActivePresences] = useState<UserPresence[]>([]);

  // Heartbeat & Presence reporting
  useEffect(() => {
    sendPresenceHeartbeat(appMode);
    const interval = setInterval(() => {
      sendPresenceHeartbeat(appMode);
    }, 30000);

    const handleUnload = () => {
      removePresenceSession();
    };
    window.addEventListener('beforeunload', handleUnload);

    return () => {
      clearInterval(interval);
      window.removeEventListener('beforeunload', handleUnload);
    };
  }, [appMode]);

  // Subscribe to real-time active presences from Firestore
  useEffect(() => {
    const unsub = subscribeToActivePresences((list) => {
      setActivePresences(list);
    });
    return () => {
      if (unsub) unsub();
    };
  }, []);

  const [isAdminPinModalOpen, setIsAdminPinModalOpen] = useState<boolean>(false);
  const [adminPinModalMode, setAdminPinModalMode] = useState<'unlock' | 'change_pin'>('unlock');
  const [isModeSelectorOpen, setIsModeSelectorOpen] = useState<boolean>(false);
  const [modeSelectorTarget, setModeSelectorTarget] = useState<AppMode | null>(null);

  // Modals state
  const [isPanduanOpen, setIsPanduanOpen] = useState<boolean>(false);
  const [isShareModalOpen, setIsShareModalOpen] = useState<boolean>(false);
  const [isInstallModalOpen, setIsInstallModalOpen] = useState<boolean>(false);
  const [isFinishModalOpen, setIsFinishModalOpen] = useState<boolean>(false);
  const [shareModalInitialTab, setShareModalInitialTab] = useState<'laporan' | 'pengingat'>('laporan');
  const [isQuickMenuOpen, setIsQuickMenuOpen] = useState<boolean>(false);
  const [isJadwalRondaOpen, setIsJadwalRondaOpen] = useState<boolean>(false);
  const [isThemeModalOpen, setIsThemeModalOpen] = useState<boolean>(false);
  const [isLaporanHubOpen, setIsLaporanHubOpen] = useState<boolean>(false);
  const [laporanHubInitialTab, setLaporanHubInitialTab] = useState<LaporanTabKey>('kas');
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);

  const handleOpenLaporanHub = (tab: LaporanTabKey = 'kas') => {
    setLaporanHubInitialTab(tab);
    setIsLaporanHubOpen(true);
  };

  // Double tap back to exit state & refs for mobile back navigation
  const [showExitToast, setShowExitToast] = useState<boolean>(false);
  const isPanduanOpenRef = useRef(isPanduanOpen);
  const isShareModalOpenRef = useRef(isShareModalOpen);
  const isInstallModalOpenRef = useRef(isInstallModalOpen);
  const isFinishModalOpenRef = useRef(isFinishModalOpen);
  const isQuickMenuOpenRef = useRef(isQuickMenuOpen);
  const isJadwalRondaOpenRef = useRef(isJadwalRondaOpen);
  const isAdminPinModalOpenRef = useRef(isAdminPinModalOpen);
  const isThemeModalOpenRef = useRef(isThemeModalOpen);
  const isLaporanHubOpenRef = useRef(isLaporanHubOpen);
  const isModeSelectorOpenRef = useRef(isModeSelectorOpen);
  const activeTabRef = useRef(activeTab);
  const appModeRef = useRef(appMode);

  useEffect(() => {
    isPanduanOpenRef.current = isPanduanOpen;
    isShareModalOpenRef.current = isShareModalOpen;
    isInstallModalOpenRef.current = isInstallModalOpen;
    isFinishModalOpenRef.current = isFinishModalOpen;
    isQuickMenuOpenRef.current = isQuickMenuOpen;
    isJadwalRondaOpenRef.current = isJadwalRondaOpen;
    isAdminPinModalOpenRef.current = isAdminPinModalOpen;
    isThemeModalOpenRef.current = isThemeModalOpen;
    isLaporanHubOpenRef.current = isLaporanHubOpen;
    isModeSelectorOpenRef.current = isModeSelectorOpen;
    activeTabRef.current = activeTab;
    appModeRef.current = appMode;
  }, [
    isPanduanOpen,
    isShareModalOpen,
    isInstallModalOpen,
    isFinishModalOpen,
    isQuickMenuOpen,
    isJadwalRondaOpen,
    isAdminPinModalOpen,
    isThemeModalOpen,
    isLaporanHubOpen,
    isModeSelectorOpen,
    activeTab,
    appMode,
  ]);

  // DOUBLE BACK TO EXIT LISTENER (Mobile / Android Back Button Support for Warga & Petugas)
  useEffect(() => {
    // Seed initial history state so back button can be intercepted
    if (!window.history.state || window.history.state.app !== 'jimpitan-main') {
      window.history.pushState({ app: 'jimpitan-main' }, '');
    }

    let lastBackPressTime = 0;
    let toastTimeout: any = null;

    const handlePopState = (_e: PopStateEvent) => {
      // 1. If any modal is currently open, close it first and keep app open
      if (isModeSelectorOpenRef.current) {
        setIsModeSelectorOpen(false);
        window.history.pushState({ app: 'jimpitan-main' }, '');
        return;
      }
      if (isQuickMenuOpenRef.current) {
        setIsQuickMenuOpen(false);
        window.history.pushState({ app: 'jimpitan-main' }, '');
        return;
      }
      if (isShareModalOpenRef.current) {
        setIsShareModalOpen(false);
        window.history.pushState({ app: 'jimpitan-main' }, '');
        return;
      }
      if (isPanduanOpenRef.current) {
        setIsPanduanOpen(false);
        window.history.pushState({ app: 'jimpitan-main' }, '');
        return;
      }
      if (isAdminPinModalOpenRef.current) {
        setIsAdminPinModalOpen(false);
        window.history.pushState({ app: 'jimpitan-main' }, '');
        return;
      }
      if (isFinishModalOpenRef.current) {
        setIsFinishModalOpen(false);
        window.history.pushState({ app: 'jimpitan-main' }, '');
        return;
      }
      if (isJadwalRondaOpenRef.current) {
        setIsJadwalRondaOpen(false);
        window.history.pushState({ app: 'jimpitan-main' }, '');
        return;
      }
      if (isThemeModalOpenRef.current) {
        setIsThemeModalOpen(false);
        window.history.pushState({ app: 'jimpitan-main' }, '');
        return;
      }
      if (isLaporanHubOpenRef.current) {
        setIsLaporanHubOpen(false);
        window.history.pushState({ app: 'jimpitan-main' }, '');
        return;
      }
      if (isInstallModalOpenRef.current) {
        setIsInstallModalOpen(false);
        window.history.pushState({ app: 'jimpitan-main' }, '');
        return;
      }

      // 2. Check if user is on a secondary tab: return to home tab first if single press
      const currentMode = appModeRef.current;
      const currentTab = activeTabRef.current;
      const now = Date.now();
      const isDoublePress = now - lastBackPressTime < 2000;

      // If in warga mode and on secondary tab (Data Warga), go back to Kas Rekap on single press
      if (!isDoublePress && currentMode === 'warga' && currentTab !== 'kas_rekap') {
        setActiveTab('kas_rekap');
        lastBackPressTime = now;
        window.history.pushState({ app: 'jimpitan-main' }, '');
        return;
      }

      // If in petugas mode and on secondary tab, go back to Scan tab on single press
      if (!isDoublePress && currentMode === 'petugas' && currentTab !== 'scan') {
        setActiveTab('scan');
        lastBackPressTime = now;
        window.history.pushState({ app: 'jimpitan-main' }, '');
        return;
      }

      // 3. Double-tap to exit timing check (applies to both Mode Warga and Mode Petugas)
      if (isDoublePress) {
        // Double tap confirmed within 2 seconds -> allow exit
        setShowExitToast(false);
        if (toastTimeout) clearTimeout(toastTimeout);
        try {
          window.close();
        } catch (err) {
          // ignore
        }
        // If window.close is ignored by browser/PWA, let history exit
        return;
      } else {
        // First back press -> prevent exit, push state back, and show toast
        lastBackPressTime = now;
        window.history.pushState({ app: 'jimpitan-main' }, '');

        // Haptic vibration feedback if supported
        try {
          if (navigator.vibrate) {
            navigator.vibrate(40);
          }
        } catch (err) {
          // ignore
        }

        setShowExitToast(true);
        if (toastTimeout) clearTimeout(toastTimeout);
        toastTimeout = setTimeout(() => {
          setShowExitToast(false);
        }, 2000);
      }
    };

    window.addEventListener('popstate', handlePopState);
    return () => {
      window.removeEventListener('popstate', handlePopState);
      if (toastTimeout) clearTimeout(toastTimeout);
    };
  }, []);

  // Automatic one-time cleanup of archive & demo transactions in cloud & local storage
  useEffect(() => {
    const hasPurged = localStorage.getItem('purged_archive_and_demo_v2');
    if (!hasPurged) {
      purgeArchiveAndDemoDataCloud()
        .then((res) => {
          localStorage.setItem('purged_archive_and_demo_v2', 'true');
          console.log('✅ Archive and demo transactions cleaned successfully:', res);
        })
        .catch((err) => {
          console.warn('Archive cleanup note:', err);
        });
    }
  }, []);

  // Dynamic Theme state (Initialized with auto-rotation on every app open)
  const [themeState, setThemeState] = useState<{ theme: AppTheme; isAutoRotate: boolean }>(() => {
    return initializeAppTheme();
  });

  const handleOpenShareModal = (tab: 'laporan' | 'pengingat' = 'laporan') => {
    setShareModalInitialTab(tab);
    setIsShareModalOpen(true);
  };

  // Listen for beforeinstallprompt event (PWA installation)
  useEffect(() => {
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstallPwa = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') {
        setDeferredPrompt(null);
        setIsInstallModalOpen(false);
      }
    }
  };

  // =========================================================================
  // REAL-TIME FIRESTORE SUBSCRIPTIONS (Automatic multi-device synchronization)
  // =========================================================================
  useEffect(() => {
    setIsSyncing(true);

    const unsubSettings = subscribeSettings((cloudSettings) => {
      setSettings(cloudSettings);
      localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(cloudSettings));
      setIsSyncing(false);
    });

    const unsubWarga = subscribeWarga((cloudWarga) => {
      setWargaList(cloudWarga);
      localStorage.setItem(STORAGE_KEYS.WARGA, JSON.stringify(cloudWarga));
      setIsSyncing(false);
    });

    const unsubRecords = subscribeJimpitanRecords((cloudRecords) => {
      setAllRecords(cloudRecords);
      localStorage.setItem(STORAGE_KEYS.RECORDS, JSON.stringify(cloudRecords));
      setIsSyncing(false);
    });

    const unsubMutations = subscribeKasMutations((cloudMutations) => {
      setKasMutations(cloudMutations);
      localStorage.setItem(STORAGE_KEYS.MUTATIONS, JSON.stringify(cloudMutations));
      setIsSyncing(false);
    });

    const unsubRegu = subscribeReguList((cloudRegu) => {
      setReguList(cloudRegu);
      localStorage.setItem(STORAGE_KEYS.REGU, JSON.stringify(cloudRegu));
      setIsSyncing(false);
    });

    const unsubMoney = subscribeMoneyCounts((cloudCounts) => {
      setMoneyCounts(cloudCounts);
      localStorage.setItem(STORAGE_KEYS.MONEY_COUNTS, JSON.stringify(cloudCounts));
      setIsSyncing(false);
    });

    const unsubSessions = subscribeRondaSessions((cloudSessions) => {
      setRondaSessions(cloudSessions);
      localStorage.setItem(STORAGE_KEYS.SESSIONS, JSON.stringify(cloudSessions));
      setIsSyncing(false);
    });

    return () => {
      unsubSettings();
      unsubWarga();
      unsubRecords();
      unsubMutations();
      unsubRegu();
      unsubMoney();
      unsubSessions();
    };
  }, []);

  // Derived metrics
  const activeRegu = reguList.find((r) => r.id === selectedReguId) || reguList[0];

  // Records for selected date
  const recordsTonight = allRecords.filter((r) => r.tanggal === selectedDate);
  const totalTerkumpulMalamIni = recordsTonight.reduce((sum, r) => sum + (r.nominal || 0), 0);
  const totalRumah = wargaList.length;
  const jumlahRumahScanned = recordsTonight.length;
  const totalTarget = wargaList.reduce((sum, w) => sum + (w.nominalDefault || 1000), 0);

  // Total Kas Balance (Akumulasi Saldo Awal + Seluruh Jimpitan + Mutasi Masuk - Pengeluaran)
  const saldoAwalKas = Number(settings.saldoAwalKas) || 0;

  const totalPemasukanMutasi = kasMutations
    .filter((m) => m.jenis === 'masuk')
    .reduce((sum, m) => sum + (m.nominal || 0), 0);

  const totalPengeluaranMutasi = kasMutations
    .filter((m) => m.jenis === 'keluar')
    .reduce((sum, m) => sum + (m.nominal || 0), 0);

  const totalJimpitanAllTime = allRecords.reduce((sum, r) => sum + (r.nominal || 0), 0);
  const saldoKas = saldoAwalKas + totalPemasukanMutasi + totalJimpitanAllTime - totalPengeluaranMutasi;

  // Handlers for Jimpitan Records (Cloud Synchronized)
  const handleSaveRecord = async (record: Omit<JimpitanRecord, 'id' | 'createdAt'>) => {
    const existing = allRecords.find(
      (r) => r.tanggal === record.tanggal && r.wargaId === record.wargaId
    );

    const targetId = existing ? existing.id : `rec-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`;
    const fullRecord: JimpitanRecord = {
      ...record,
      id: targetId,
      createdAt: existing ? existing.createdAt : Date.now(),
    };

    // Optimistic local update & instant local storage save
    setAllRecords((prev) => {
      const idx = prev.findIndex((r) => r.id === targetId);
      let next: JimpitanRecord[];
      if (idx >= 0) {
        next = [...prev];
        next[idx] = fullRecord;
      } else {
        next = [fullRecord, ...prev];
      }
      try {
        localStorage.setItem(STORAGE_KEYS.RECORDS, JSON.stringify(next));
      } catch (e) {
        console.warn('Storage save failed:', e);
      }
      return next;
    });

    // Cloud firestore sync
    try {
      await addJimpitanRecordCloud(fullRecord);
    } catch (err) {
      console.error('Failed to sync record to cloud:', err);
    }
  };

  const handleSaveBatchRecords = async (records: Omit<JimpitanRecord, 'id' | 'createdAt'>[]) => {
    if (!records || records.length === 0) return;

    const fullRecords: JimpitanRecord[] = records.map((r, i) => {
      const targetId = `jimpitan-${r.nomorRumah}-${r.tanggal}`;
      return {
        ...r,
        id: targetId,
        createdAt: Date.now() + i,
      };
    });

    // Optimistic local update
    setAllRecords((prev) => {
      const map = new Map<string, JimpitanRecord>();
      prev.forEach((p) => map.set(p.id, p));
      fullRecords.forEach((r) => map.set(r.id, r));
      const next = Array.from(map.values()).sort((a, b) => (b.tanggal || '').localeCompare(a.tanggal || ''));
      try {
        localStorage.setItem(STORAGE_KEYS.RECORDS, JSON.stringify(next));
      } catch (e) {
        console.warn('Storage save failed:', e);
      }
      return next;
    });

    // Cloud firestore sync
    try {
      await addBatchJimpitanRecordsCloud(fullRecords);
    } catch (err) {
      console.error('Failed to sync batch records to cloud:', err);
    }
  };

  const handleUpdateRecord = async (updated: JimpitanRecord) => {
    setAllRecords((prev) => {
      const next = prev.map((r) => (r.id === updated.id ? updated : r));
      localStorage.setItem(STORAGE_KEYS.RECORDS, JSON.stringify(next));
      return next;
    });
    try {
      await addJimpitanRecordCloud(updated);
    } catch (err) {
      console.error('Failed to update record in cloud:', err);
    }
  };

  const handleDeleteRecord = async (recordId: string) => {
    setAllRecords((prev) => {
      const next = prev.filter((r) => r.id !== recordId);
      localStorage.setItem(STORAGE_KEYS.RECORDS, JSON.stringify(next));
      return next;
    });
    try {
      await deleteJimpitanRecordCloud(recordId);
    } catch (err) {
      console.error('Failed to delete record in cloud:', err);
    }
  };

  // Handlers for Warga (Cloud Synchronized with anti-duplicate enforcement)
  const handleAddWarga = async (newWarga: Omit<Warga, 'id' | 'qrCodeData'>): Promise<boolean> => {
    const dupCheck = checkWargaDuplicate(wargaList, newWarga);
    if (dupCheck.isDuplicate) {
      alert(`⚠️ Gagal Menambahkan: Data warga duplikat terdeteksi!\n\n${dupCheck.reason}`);
      return false;
    }

    const id = `warga-${Date.now()}`;
    const qrCodeData = `JIMPITAN-${settings.namaRt.replace(/\s+/g, '')}-${settings.namaRw.replace(/\s+/g, '')}-NO${newWarga.nomorRumah}`;
    const fullWarga: Warga = {
      ...newWarga,
      id,
      qrCodeData,
    };
    setWargaList((prev) => {
      const next = [...prev, fullWarga];
      const { cleanList } = deduplicateWargaArray(next);
      localStorage.setItem(STORAGE_KEYS.WARGA, JSON.stringify(cleanList));
      return cleanList;
    });
    try {
      await saveWargaCloud(fullWarga);
    } catch (err) {
      console.error('Failed to add warga to cloud:', err);
    }
    return true;
  };

  const handleUpdateWarga = async (updated: Warga): Promise<boolean> => {
    const dupCheck = checkWargaDuplicate(wargaList, updated, updated.id);
    if (dupCheck.isDuplicate) {
      alert(`⚠️ Gagal Memperbarui: Data warga duplikat terdeteksi!\n\n${dupCheck.reason}`);
      return false;
    }

    setWargaList((prev) => {
      const next = prev.map((w) => (w.id === updated.id ? updated : w));
      const { cleanList } = deduplicateWargaArray(next);
      localStorage.setItem(STORAGE_KEYS.WARGA, JSON.stringify(cleanList));
      return cleanList;
    });
    try {
      await saveWargaCloud(updated);
    } catch (err) {
      console.error('Failed to update warga in cloud:', err);
    }
    return true;
  };

  const handleDeduplicateWarga = async () => {
    try {
      const result = await deduplicateCloudWargaNow();
      setWargaList((prev) => {
        const { cleanList } = deduplicateWargaArray(prev);
        localStorage.setItem(STORAGE_KEYS.WARGA, JSON.stringify(cleanList));
        return cleanList;
      });
      if (result.cleanedCount > 0) {
        alert(`Pembersihan duplikat selesai!\n• ${result.cleanedCount} data duplikat berhasil dihapus.\n• Total warga aktif sekarang: ${result.totalWarga} rumah.`);
      } else {
        alert(`Semua data warga sudah bersih dan unik (tidak ada duplikat).\nTotal: ${result.totalWarga} rumah.`);
      }
    } catch (err) {
      console.error('Failed to deduplicate warga:', err);
      setWargaList((prev) => {
        const { cleanList } = deduplicateWargaArray(prev);
        localStorage.setItem(STORAGE_KEYS.WARGA, JSON.stringify(cleanList));
        return cleanList;
      });
      alert('Data warga lokal telah dibersihkan dari duplikat.');
    }
  };

  const handleSaveWargaPhone = async (wargaId: string, nomorHp: string) => {
    const targetWarga = wargaList.find((w) => w.id === wargaId);
    if (!targetWarga) return;
    const updated = { ...targetWarga, nomorHp };
    setWargaList((prev) => {
      const next = prev.map((w) => (w.id === wargaId ? updated : w));
      localStorage.setItem(STORAGE_KEYS.WARGA, JSON.stringify(next));
      return next;
    });
    try {
      await saveWargaCloud(updated);
    } catch (err) {
      console.error('Failed to update warga phone in cloud:', err);
    }
  };

  const handleDeleteWarga = async (id: string) => {
    setWargaList((prev) => {
      const next = prev.filter((w) => w.id !== id);
      localStorage.setItem(STORAGE_KEYS.WARGA, JSON.stringify(next));
      return next;
    });
    try {
      await deleteWargaCloud(id);
    } catch (err) {
      console.error('Failed to delete warga in cloud:', err);
    }
  };

  // Reset / Pemutihan Piutang Massal: Hapus data piutang lampau & setel default 0 Rupiah
  const handleResetAllPiutangToZero = async () => {
    if (!window.confirm('KONFIRMASI PENGURUS RT: Hapus seluruh data piutang lampau dan buat default 0 Rupiah (pemutihan piutang) untuk SEMUA warga?')) {
      return;
    }
    const today = getTodayDateIso();
    const updatedList = wargaList.map((w) => ({
      ...w,
      saldoTunggakanAwal: 0,
      koreksiPiutang: 0,
      catatanKoreksiPiutang: `Pemutihan piutang (Default Rp 0) pada ${formatTanggalIndo(today)} oleh ${petugasNama}`,
      tanggalKoreksiPiutang: today,
    }));

    setWargaList(updatedList);
    try {
      localStorage.setItem(STORAGE_KEYS.WARGA, JSON.stringify(updatedList));
      for (const w of updatedList) {
        await saveWargaCloud(w);
      }
      alert('✅ Berhasil! Seluruh data piutang warga telah direset menjadi 0 Rupiah.');
    } catch (err) {
      console.error('Failed to reset all piutang to zero:', err);
    }
  };

  // Handlers for Mutations (Cloud Synchronized)
  const handleAddMutation = async (mut: Omit<KasMutation, 'id' | 'createdAt'>) => {
    const newMut: KasMutation = {
      ...mut,
      id: `mut-${Date.now()}`,
      createdAt: Date.now(),
    };
    setKasMutations((prev) => {
      const next = [newMut, ...prev];
      localStorage.setItem(STORAGE_KEYS.MUTATIONS, JSON.stringify(next));
      return next;
    });
    try {
      await addKasMutationCloud(newMut);
    } catch (err) {
      console.error('Failed to add mutation in cloud:', err);
    }
  };

  const handleUpdateMutation = async (updated: KasMutation) => {
    setKasMutations((prev) => {
      const next = prev.map((m) => (m.id === updated.id ? updated : m));
      localStorage.setItem(STORAGE_KEYS.MUTATIONS, JSON.stringify(next));
      return next;
    });
    try {
      await addKasMutationCloud(updated);
    } catch (err) {
      console.error('Failed to update mutation in cloud:', err);
    }
  };

  const handleDeleteMutation = async (id: string) => {
    setKasMutations((prev) => {
      const next = prev.filter((m) => m.id !== id);
      localStorage.setItem(STORAGE_KEYS.MUTATIONS, JSON.stringify(next));
      return next;
    });
    try {
      await deleteKasMutationCloud(id);
    } catch (err) {
      console.error('Failed to delete mutation in cloud:', err);
    }
  };

  // Money Counter (Pecahan Fisik) update handler
  const handleUpdateMoneyCounts = async (newCounts: MoneyDenomination) => {
    setMoneyCounts(newCounts);
    try {
      localStorage.setItem(STORAGE_KEYS.MONEY_COUNTS, JSON.stringify(newCounts));
    } catch (e) {
      console.warn('Failed to save money counts to local storage', e);
    }
    try {
      await saveMoneyCountsCloud(newCounts);
    } catch (err) {
      console.error('Failed to save money counts to cloud:', err);
    }
  };

  // Settings update cloud handler
  const handleUpdateSettings = async (newSettings: AppSettings) => {
    setSettings(newSettings);
    localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(newSettings));
    try {
      await saveSettingsCloud(newSettings);
    } catch (err) {
      console.error('Failed to update settings in cloud:', err);
    }
  };

  // Regu list update cloud handler
  const handleUpdateReguList = async (newRegu: ReguRonda[]) => {
    setReguList(newRegu);
    localStorage.setItem(STORAGE_KEYS.REGU, JSON.stringify(newRegu));
    try {
      await saveReguListCloud(newRegu);
    } catch (err) {
      console.error('Failed to update regu list in cloud:', err);
    }
  };

  // Sound toggle
  const handleToggleSound = () => {
    const updated = {
      ...settings,
      soundEnabled: !settings.soundEnabled,
      speechEnabled: !settings.soundEnabled,
    };
    setSettings(updated);
    localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(updated));
    saveSettingsCloud(updated).catch(console.error);
  };

  // Admin PIN toggle & unlock handler (Strict: old PIN immediately ceases to work once changed)
  const handleUnlockAdminWithPin = (pin: string): boolean => {
    const activePin = (settings.pinAdmin && settings.pinAdmin.trim()) ? settings.pinAdmin.trim() : '1234';
    if (pin.trim() === activePin) {
      setIsAdminUnlocked(true);
      return true;
    }
    return false;
  };

  const handleOpenAdminPinModal = (mode: 'unlock' | 'change_pin' = 'unlock') => {
    setAdminPinModalMode(mode);
    setIsAdminPinModalOpen(true);
  };

  const handleToggleAdminLock = () => {
    if (isAdminUnlocked) {
      setIsAdminUnlocked(false);
      setAppMode('warga');
      try {
        localStorage.setItem(STORAGE_KEYS.APP_MODE, 'warga');
      } catch (e) {
        // ignore
      }
      if (activeTab !== 'kas_rekap' && activeTab !== 'data_warga') {
        setActiveTab('kas_rekap');
      }
    } else {
      handleOpenAdminPinModal('unlock');
    }
  };

  const handleChangeAdminPin = async (newPin: string) => {
    const cleanPin = newPin.trim();
    const updated: AppSettings = {
      ...settings,
      pinAdmin: cleanPin,
    };
    setSettings(updated);
    try {
      localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(updated));
    } catch (e) {
      console.warn('Failed to cache settings locally', e);
    }
    try {
      await saveSettingsCloud(updated);
    } catch (err) {
      console.error('Failed to sync new PIN to cloud:', err);
    }
  };

  // Reset & Sample data handlers (Cloud aware)
  const handlePurgeArchiveAndDemoData = async () => {
    try {
      const res = await purgeArchiveAndDemoDataCloud();
      setAllRecords([]);
      setKasMutations([]);
      setRondaSessions({});
      setMoneyCounts(DEFAULT_MONEY_DENOMINATION);
      setWargaList((prev) => prev.filter((w) => !['warga-01', 'warga-02', 'warga-03'].includes(w.id)));
      alert(`Data arsip dan data demo berhasil dibersihkan secara total:\n• Catatan jimpitan: ${res.deletedRecCount} data dibersihkan\n• Mutasi kas: ${res.deletedMutCount} data dibersihkan\n• Sesi ronda: ${res.deletedSessCount} data dibersihkan\n• Data demo warga: ${res.deletedDemoWargaCount} data dibersihkan`);
    } catch (err) {
      console.error('Gagal membersihkan data arsip & demo:', err);
      setAllRecords([]);
      setKasMutations([]);
      setRondaSessions({});
      setMoneyCounts(DEFAULT_MONEY_DENOMINATION);
      alert('Data arsip dan demo telah dibersihkan dari penyimpanan.');
    }
  };

  const handleDeleteSeptemberData = async () => {
    try {
      const res = await deleteSeptemberDataCloud();
      setAllRecords((prev) => prev.filter((r) => !r.tanggal || (!r.tanggal.includes('-09-') && !r.tanggal.startsWith('2026-09'))));
      setKasMutations((prev) => prev.filter((m) => !m.tanggal || (!m.tanggal.includes('-09-') && !m.tanggal.startsWith('2026-09'))));
      setRondaSessions((prev) => {
        const next: Record<string, RondaSession> = {};
        for (const k in prev) {
          if (!k.includes('-09-') && !k.startsWith('2026-09')) {
            next[k] = prev[k];
          }
        }
        return next;
      });
      alert(`Berhasil menghapus seluruh data bulan September.\n• Jimpitan masuk: ${res.deletedRecCount} data dibersihkan\n• Pengeluaran kas: ${res.deletedMutCount} data dibersihkan\n• Sesi ronda: ${res.deletedSessCount} data dibersihkan`);
    } catch (err) {
      console.error('Gagal menghapus data September:', err);
      // Fallback local cleanup
      setAllRecords((prev) => prev.filter((r) => !r.tanggal || (!r.tanggal.includes('-09-') && !r.tanggal.startsWith('2026-09'))));
      setKasMutations((prev) => prev.filter((m) => !m.tanggal || (!m.tanggal.includes('-09-') && !m.tanggal.startsWith('2026-09'))));
      alert('Data bulan September berhasil dibersihkan dari memori aplikasi.');
    }
  };

  const handleResetAllData = async () => {
    try {
      await resetAllCloudData();
      alert('Data cloud berhasil di-reset bersih.');
    } catch (e) {
      setAllRecords([]);
      setKasMutations([]);
      setMoneyCounts(DEFAULT_MONEY_DENOMINATION);
      alert('Data lokal di-reset.');
    }
  };

  const handleLoadSampleData = async () => {
    try {
      await restoreFullCloudBackup({
        settings: DEFAULT_SETTINGS,
        reguList: DEFAULT_REGU,
        allWarga: DEFAULT_WARGA,
        allMutations: DEFAULT_MUTATIONS,
        allRecords: [],
        moneyCounts: DEFAULT_MONEY_DENOMINATION,
      });
      alert('Data contoh RT berhasil disinkronkan ke Cloud!');
    } catch (e) {
      setWargaList(DEFAULT_WARGA);
      setReguList(DEFAULT_REGU);
      setKasMutations(DEFAULT_MUTATIONS);
      setSettings(DEFAULT_SETTINGS);
      setMoneyCounts(DEFAULT_MONEY_DENOMINATION);
      alert('Data contoh dimuat secara lokal.');
    }
  };

  const handleRestoreFullBackup = async (data: any) => {
    try {
      await restoreFullCloudBackup(data);
      alert('Data backup berhasil disinkronkan ke seluruh warga dan pengurus RT!');
    } catch (err) {
      if (data.settings) setSettings(data.settings);
      if (data.allWarga) setWargaList(data.allWarga);
      if (data.allRecords) setAllRecords(data.allRecords);
      if (data.allMutations) setKasMutations(data.allMutations);
      if (data.reguList) setReguList(data.reguList);
      if (data.moneyCounts) setMoneyCounts(data.moneyCounts);
      alert('Backup berhasil dipulihkan secara lokal.');
    }
  };

  // Ronda Session Finish Handler (Cloud Synchronized)
  const handleFinishSession = async (catatan?: string) => {
    const newSession: RondaSession = {
      tanggal: selectedDate,
      status: 'finished',
      finishedAt: Date.now(),
      reguId: selectedReguId,
      reguNama: activeRegu.nama,
      petugas: petugasNama,
      totalTerkumpul: totalTerkumpulMalamIni,
      jumlahRumahScanned: jumlahRumahScanned,
      catatan: catatan || 'Penarikan jimpitan selesai.',
    };

    setRondaSessions((prev) => {
      const updated = { ...prev, [selectedDate]: newSession };
      localStorage.setItem(STORAGE_KEYS.SESSIONS, JSON.stringify(updated));
      return updated;
    });

    try {
      await saveRondaSessionCloud(newSession);
    } catch (err) {
      console.error('Failed to save ronda session to cloud:', err);
    }
  };

  const handleReopenSession = async () => {
    const reopened: RondaSession = {
      tanggal: selectedDate,
      status: 'active',
      reguId: selectedReguId,
      reguNama: activeRegu.nama,
      petugas: petugasNama,
      totalTerkumpul: totalTerkumpulMalamIni,
      jumlahRumahScanned: jumlahRumahScanned,
    };

    setRondaSessions((prev) => {
      const updated = { ...prev, [selectedDate]: reopened };
      localStorage.setItem(STORAGE_KEYS.SESSIONS, JSON.stringify(updated));
      return updated;
    });

    try {
      await saveRondaSessionCloud(reopened);
    } catch (err) {
      console.error('Failed to reopen ronda session in cloud:', err);
    }
  };

  return (
    <div className={`min-h-screen ${themeState.theme.bodyBg} text-stone-900 flex flex-col font-['Plus_Jakarta_Sans',sans-serif] selection:bg-purple-200 transition-colors duration-300`}>
      {/* Sticky App Header */}
      <Header
        settings={settings}
        selectedDate={selectedDate}
        onDateChange={setSelectedDate}
        saldoKas={saldoKas}
        activeReguName={activeRegu.nama}
        isAdminUnlocked={isAdminUnlocked}
        onToggleAdminLock={handleToggleAdminLock}
        onOpenPanduan={() => setIsPanduanOpen(true)}
        onOpenShareModal={() => handleOpenShareModal('laporan')}
        onOpenQuickMenu={() => setIsQuickMenuOpen(true)}
        onToggleSound={handleToggleSound}
        onOpenInstallModal={() => setIsInstallModalOpen(true)}
        isSyncing={isSyncing}
        appMode={appMode}
        onSwitchMode={handleSwitchMode}
        onOpenModeSelector={() => setIsModeSelectorOpen(true)}
        theme={themeState.theme}
      />

      {/* Offline Connectivity & Restored Sync Indicator */}
      <OfflineBanner />

      {/* Main Content Area */}
      <main className="flex-1 max-w-xl w-full mx-auto px-4 py-4 space-y-4 pb-20 overflow-x-hidden">
        {/* Top Summary Card (Always visible on Scan tab) */}
        {activeTab === 'scan' && (
          <DashboardSummaryCard
            totalTerkumpulMalamIni={totalTerkumpulMalamIni}
            jumlahRumahScanned={jumlahRumahScanned}
            totalRumah={totalRumah}
            reguList={reguList}
            selectedReguId={selectedReguId}
            onSelectRegu={setSelectedReguId}
            petugasNama={petugasNama}
            onPetugasChange={setPetugasNama}
            selectedDate={selectedDate}
            sessionStatus={rondaSessions[selectedDate]}
            onOpenFinishModal={() => setIsFinishModalOpen(true)}
            allRecords={allRecords}
            onSelectDate={setSelectedDate}
            onResetToToday={handleResetToTodayDate}
            settings={settings}
            activeReguName={activeRegu.nama}
            theme={themeState.theme}
            onBack={() => setIsModeSelectorOpen(true)}
          />
        )}

        {/* Tab Content with Smooth Transition */}
        <div
          key={`${appMode}-${activeTab}`}
          className="w-full space-y-4 animate-tab-content"
        >
          {/* TAB 1: SCAN QR */}
          {activeTab === 'scan' && (
            <ScannerSection
              wargaList={wargaList}
              recordsTonight={recordsTonight}
              allRecords={allRecords}
              onSaveRecord={handleSaveRecord}
              onDeleteRecord={handleDeleteRecord}
              currentReguId={selectedReguId}
              currentReguNama={activeRegu.nama}
              currentPetugas={petugasNama}
              selectedDate={selectedDate}
              soundEnabled={settings.soundEnabled}
              speechEnabled={settings.speechEnabled}
              rt={settings.namaRt}
              rw={settings.namaRw}
              lingkungan={settings.lingkungan}
              onOpenShareModal={handleOpenShareModal}
              onOpenFinishModal={() => setIsFinishModalOpen(true)}
              onSelectDate={setSelectedDate}
              onResetToToday={handleResetToTodayDate}
            />
          )}

          {/* TAB 2: KAS & REKAP */}
          {activeTab === 'kas_rekap' && (
            <KasRekapView
              allRecords={allRecords}
              kasMutations={kasMutations}
              wargaList={wargaList}
              onAddMutation={handleAddMutation}
              onUpdateMutation={handleUpdateMutation}
              onDeleteMutation={handleDeleteMutation}
              onUpdateRecord={handleUpdateRecord}
              onDeleteRecord={handleDeleteRecord}
              onDeleteSeptemberData={handleDeleteSeptemberData}
              onPurgeArchiveAndDemoData={handlePurgeArchiveAndDemoData}
              onUpdateWarga={handleUpdateWarga}
              reguList={reguList}
              settings={settings}
              selectedDate={selectedDate}
              onOpenShareModal={() => handleOpenShareModal('laporan')}
              onSelectDate={setSelectedDate}
              onResetToToday={handleResetToTodayDate}
              isAdmin={isAdminUnlocked}
              appMode={appMode}
              theme={themeState.theme}
              activePresences={activePresences}
              currentPetugas={petugasNama}
            />
          )}

          {/* TAB: REKAP PIUTANG & TUNGGAKAN WARGA (KHUSUS ADMIN / PETUGAS) */}
          {activeTab === 'rekap_piutang' && (
            isAdminUnlocked ? (
              <RekapPiutangView
                allRecords={allRecords}
                kasMutations={kasMutations}
                wargaList={wargaList}
                onAddMutation={handleAddMutation}
                onUpdateMutation={handleUpdateMutation}
                onUpdateRecord={handleUpdateRecord}
                onUpdateWarga={handleUpdateWarga}
                onResetAllPiutangToZero={handleResetAllPiutangToZero}
                settings={settings}
                selectedDate={selectedDate}
                isAdmin={isAdminUnlocked}
                appMode={appMode}
                theme={themeState.theme}
                currentPetugas={petugasNama}
                onNavigateToKas={() => setActiveTab('kas_rekap')}
              />
            ) : (
              <div className="p-6 sm:p-8 bg-white rounded-3xl border border-stone-200 shadow-sm text-center space-y-4 max-w-md mx-auto my-8 animate-in fade-in zoom-in-95">
                <div className="w-16 h-16 rounded-3xl bg-amber-50 text-amber-600 border border-amber-200 flex items-center justify-center mx-auto shadow-xs">
                  <Receipt className="w-8 h-8" />
                </div>
                <div className="space-y-1">
                  <div className="inline-flex items-center space-x-1.5 px-2.5 py-1 rounded-full bg-amber-100 text-amber-900 text-[10px] font-black uppercase tracking-wider mb-1">
                    <Shield className="w-3.5 h-3.5 text-amber-700" />
                    <span>Akses Khusus Admin RT</span>
                  </div>
                  <h3 className="text-lg font-black text-stone-900">Rekap Piutang Dikunci</h3>
                  <p className="text-xs text-stone-500 leading-relaxed max-w-xs mx-auto">
                    Data rincian piutang, pelunasan hutang lampau, dan tagihan warga hanya dapat diakses dalam Mode Pengurus RT / Admin.
                  </p>
                </div>
                <div className="flex flex-col gap-2 pt-2">
                  <button
                    onClick={() => {
                      setModeSelectorTarget('petugas');
                      setIsModeSelectorOpen(true);
                    }}
                    className="w-full py-3 px-4 rounded-2xl bg-amber-600 hover:bg-amber-700 text-white font-black text-xs transition-all shadow-md active:scale-98 cursor-pointer flex items-center justify-center space-x-2"
                  >
                    <Lock className="w-4 h-4" />
                    <span>Buka Kunci Admin (PIN)</span>
                  </button>
                  <button
                    onClick={() => setActiveTab('kas_rekap')}
                    className="w-full py-2.5 px-4 rounded-2xl bg-stone-100 hover:bg-stone-200 text-stone-700 font-extrabold text-xs transition-colors cursor-pointer"
                  >
                    Kembali ke Buku Kas RT
                  </button>
                </div>
              </div>
            )
          )}

          {/* TAB 3: DATA WARGA */}
          {activeTab === 'data_warga' && (
            <DataWargaView
              wargaList={wargaList}
              onAddWarga={handleAddWarga}
              onUpdateWarga={handleUpdateWarga}
              onDeleteWarga={handleDeleteWarga}
              onDeduplicateWarga={handleDeduplicateWarga}
              settings={settings}
              allRecords={allRecords}
              kasMutations={kasMutations}
              onAddMutation={handleAddMutation}
              onSaveBatchRecords={handleSaveBatchRecords}
              selectedDate={selectedDate}
              isAdminUnlocked={isAdminUnlocked}
              onUnlockAdmin={handleUnlockAdminWithPin}
              onLockApp={() => {
                setIsAdminUnlocked(false);
                alert('Aplikasi terkunci. Mode admin dinonaktifkan.');
              }}
              appMode={appMode}
              currentPetugas={petugasNama}
              currentReguNama={activeRegu.nama}
              currentReguId={activeRegu.id}
            />
          )}

          {/* TAB 4: HITUNG UANG */}
          {activeTab === 'hitung_uang' && (
            <HitungUangView 
              totalTerkumpulTonight={totalTerkumpulMalamIni} 
              counts={moneyCounts}
              onUpdateCounts={handleUpdateMoneyCounts}
              isSyncing={isSyncing}
              onNavigateToMenu={() => setActiveTab('menu')}
            />
          )}

          {/* TAB 5: MENU */}
          {activeTab === 'menu' && (
            <MenuView
              settings={settings}
              onUpdateSettings={handleUpdateSettings}
              reguList={reguList}
              onUpdateReguList={handleUpdateReguList}
              onResetAllData={handleResetAllData}
              onLoadSampleData={handleLoadSampleData}
              onDeleteSeptemberData={handleDeleteSeptemberData}
              allWarga={wargaList}
              allRecords={allRecords}
              allMutations={kasMutations}
              onRestoreFullBackup={handleRestoreFullBackup}
              onNavigate={setActiveTab}
              onOpenPengeluaranKas={() => setActiveTab('kas_rekap')}
              onOpenCetakQr={() => setActiveTab('data_warga')}
              onOpenPanduan={() => setIsPanduanOpen(true)}
              onOpenInstallModal={() => setIsInstallModalOpen(true)}
              onOpenLaporanHub={handleOpenLaporanHub}
              onLockApp={() => {
                setIsAdminUnlocked(false);
              }}
              isAdminUnlocked={isAdminUnlocked}
              onUnlockAdmin={handleUnlockAdminWithPin}
              onOpenChangePinModal={() => handleOpenAdminPinModal('change_pin')}
            />
          )}
        </div>
      </main>

      {/* Admin PIN & Security Modal */}
      <AdminPinModal
        isOpen={isAdminPinModalOpen}
        onClose={() => setIsAdminPinModalOpen(false)}
        mode={adminPinModalMode}
        currentPin={settings.pinAdmin || '1234'}
        onSuccessUnlock={() => {
          setIsAdminUnlocked(true);
          setAppMode('petugas');
          try {
            localStorage.setItem(STORAGE_KEYS.APP_MODE, 'petugas');
          } catch (e) {
            // ignore
          }
        }}
        onChangePin={handleChangeAdminPin}
      />

      {/* Mode Selector Modal (Warga, Penginput, Petugas) */}
      <ModeSelectorModal
        isOpen={isModeSelectorOpen}
        onClose={() => {
          setIsModeSelectorOpen(false);
          setModeSelectorTarget(null);
        }}
        currentMode={appMode}
        initialTargetMode={modeSelectorTarget}
        onSelectMode={(mode) => {
          if (mode === 'petugas') {
            setIsAdminUnlocked(true);
          }
          handleSwitchMode(mode, true);
          setIsModeSelectorOpen(false);
          setModeSelectorTarget(null);
        }}
        settings={settings}
        isAdminUnlocked={isAdminUnlocked}
        onRequestUnlockAdmin={() => {
          setIsModeSelectorOpen(false);
          handleOpenAdminPinModal('unlock');
        }}
      />

      {/* Quick Menu Sheet / Modal */}
      <MenuModal
        isOpen={isQuickMenuOpen}
        onClose={() => setIsQuickMenuOpen(false)}
        onNavigate={setActiveTab}
        onOpenJadwalRonda={() => setIsJadwalRondaOpen(true)}
        onOpenPengeluaranKas={() => setActiveTab('kas_rekap')}
        onOpenCetakQr={() => setActiveTab('data_warga')}
        onOpenPanduan={() => setIsPanduanOpen(true)}
        onOpenShareModal={() => handleOpenShareModal('laporan')}
        onOpenInstallModal={() => setIsInstallModalOpen(true)}
        onOpenThemeModal={() => setIsThemeModalOpen(true)}
        onOpenLaporanHub={handleOpenLaporanHub}
        soundEnabled={settings.soundEnabled}
        onToggleSound={handleToggleSound}
        isAdminUnlocked={isAdminUnlocked}
        onToggleAdminLock={handleToggleAdminLock}
        selectedDate={selectedDate}
        onDateChange={setSelectedDate}
        saldoKas={saldoKas}
        settings={settings}
        currentTheme={themeState.theme}
        isAutoRotate={themeState.isAutoRotate}
        onLockApp={() => {
          setIsAdminUnlocked(false);
          setAppMode('warga');
          try {
            localStorage.setItem(STORAGE_KEYS.APP_MODE, 'warga');
          } catch (e) {
            // ignore
          }
          if (activeTab !== 'kas_rekap' && activeTab !== 'data_warga') {
            setActiveTab('kas_rekap');
          }
          setIsQuickMenuOpen(false);
        }}
        appMode={appMode}
        onSwitchMode={handleSwitchMode}
      />

      {/* Jadwal Ronda 7 Hari Modal */}
      <JadwalRondaModal
        isOpen={isJadwalRondaOpen}
        onClose={() => setIsJadwalRondaOpen(false)}
        reguList={reguList}
        activeReguId={selectedReguId}
        onSelectRegu={(id) => {
          setSelectedReguId(id);
          setIsJadwalRondaOpen(false);
        }}
        settings={settings}
        isAdmin={isAdminUnlocked}
        onUpdateReguList={handleUpdateReguList}
      />

      {/* Global Modals */}
      <PanduanModal
        isOpen={isPanduanOpen}
        onClose={() => setIsPanduanOpen(false)}
        namaRt={settings.namaRt}
        namaRw={settings.namaRw}
      />

      <WhatsAppShareModal
        isOpen={isShareModalOpen}
        onClose={() => setIsShareModalOpen(false)}
        namaRt={settings.namaRt}
        namaRw={settings.namaRw}
        lingkungan="Pliken Kembaran"
        selectedDate={selectedDate}
        reguNama={activeRegu.nama}
        petugas={petugasNama}
        totalTerkumpul={totalTerkumpulMalamIni}
        totalTarget={totalTarget}
        jumlahRumahScanned={jumlahRumahScanned}
        totalRumah={totalRumah}
        totalSaldoKas={saldoKas}
        allWarga={wargaList}
        allRecords={allRecords}
        allMutations={kasMutations}
        onSaveWargaPhone={handleSaveWargaPhone}
        initialTab={shareModalInitialTab}
      />

      <FinishRondaModal
        isOpen={isFinishModalOpen}
        onClose={() => setIsFinishModalOpen(false)}
        selectedDate={selectedDate}
        regu={activeRegu}
        petugas={petugasNama}
        totalTerkumpulTonight={totalTerkumpulMalamIni}
        totalTarget={totalTarget}
        jumlahRumahScanned={jumlahRumahScanned}
        totalRumah={totalRumah}
        saldoKas={saldoKas}
        settings={settings}
        moneyCounts={moneyCounts}
        sessionStatus={rondaSessions[selectedDate]}
        onFinishSession={handleFinishSession}
        onReopenSession={handleReopenSession}
        onOpenDetailedShare={(tab) => handleOpenShareModal(tab)}
      />

      <InstallShareModal
        isOpen={isInstallModalOpen}
        onClose={() => setIsInstallModalOpen(false)}
        namaRt={settings.namaRt}
        namaRw={settings.namaRw}
        lingkungan="Pliken Kembaran"
        deferredPrompt={deferredPrompt}
        onInstallPwa={handleInstallPwa}
      />

      {/* Theme Customizer Modal */}
      <ThemeModal
        isOpen={isThemeModalOpen}
        onClose={() => setIsThemeModalOpen(false)}
        currentTheme={themeState.theme}
        isAutoRotate={themeState.isAutoRotate}
        onSelectTheme={(selectedTheme, isAuto) => {
          setThemeState({ theme: selectedTheme, isAutoRotate: isAuto });
        }}
      />

      {/* Pusat Laporan & Rekapitulasi RT Modal */}
      <LaporanHubModal
        isOpen={isLaporanHubOpen}
        onClose={() => setIsLaporanHubOpen(false)}
        initialTab={laporanHubInitialTab}
        allWarga={wargaList}
        allRecords={allRecords}
        kasMutations={kasMutations}
        settings={settings}
        selectedDate={selectedDate}
        reguList={reguList}
        activeReguId={selectedReguId}
        saldoKas={saldoKas}
        onOpenShareModal={() => handleOpenShareModal('laporan')}
      />

      {/* Exit Toast Notification (Tekan kembali 2 kali pada HP untuk keluar) */}
      {showExitToast && (
        <div 
          id="double-back-exit-toast"
          className="fixed bottom-20 left-1/2 -translate-x-1/2 z-50 pointer-events-none transition-all duration-200 animate-in fade-in slide-in-from-bottom-3"
        >
          <div className="flex items-center space-x-2.5 px-4 py-2.5 rounded-full bg-stone-900/95 backdrop-blur-md text-white text-xs font-bold shadow-2xl border border-stone-700/80">
            <LogOut className="w-4 h-4 text-amber-400 flex-shrink-0 animate-pulse" />
            <span>Tekan kembali sekali lagi untuk keluar dari aplikasi</span>
          </div>
        </div>
      )}

      {/* Persistent Bottom Navigation (Filtered based on appMode) */}
      <BottomNav activeTab={activeTab} onChangeTab={setActiveTab} appMode={appMode} theme={themeState.theme} />
    </div>
  );
}
