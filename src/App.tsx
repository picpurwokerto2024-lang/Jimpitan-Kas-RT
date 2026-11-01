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
import { ErrorBoundary } from './components/ErrorBoundary';
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
  saveBatchWargaCloud,
  triggerAutoCloudBackup,
  sendPresenceHeartbeat,
  removePresenceSession,
  subscribeToActivePresences,
  forceFetchAuthoritativeCloudData,
  normalizeJimpitanRecordData,
  normalizeKasMutationData
} from './services/firebaseService';
import { checkWargaDuplicate, deduplicateWargaArray, normalizeHouseNumber } from './utils/wargaDeduplicator';

// Storage keys for local caching & offline outbox
const STORAGE_KEYS = {
  SETTINGS: 'jimpitan_settings_v1',
  WARGA: 'jimpitan_warga_v1',
  RECORDS: 'jimpitan_records_v1',
  MUTATIONS: 'jimpitan_mutations_v1',
  OUTBOX_RECORDS: 'jimpitan_outbox_records_v1',
  OUTBOX_MUTATIONS: 'jimpitan_outbox_mutations_v1',
  REGU: 'jimpitan_regu_v1',
  MONEY_COUNTS: 'jimpitan_money_counter_v1',
  SESSIONS: 'jimpitan_sessions_v1',
  SELECTED_DATE: 'jimpitan_selected_date_v1',
  APP_MODE: 'jimpitan_app_mode_v1',
};

const readOutboxRecords = (): JimpitanRecord[] => {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.OUTBOX_RECORDS);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.map((r) => normalizeJimpitanRecordData(r, r?.id)) : [];
  } catch {
    return [];
  }
};

const upsertOutboxRecords = (items: JimpitanRecord[]) => {
  if (!items.length) return;
  try {
    const map = new Map<string, JimpitanRecord>();
    readOutboxRecords().forEach((r) => map.set(r.id, r));
    items.forEach((r) => map.set(r.id, normalizeJimpitanRecordData(r, r.id)));
    localStorage.setItem(STORAGE_KEYS.OUTBOX_RECORDS, JSON.stringify(Array.from(map.values())));
  } catch {
    // ignore storage quota errors
  }
};

const removeOutboxRecordIds = (ids: string[]) => {
  if (!ids.length) return;
  try {
    const removeSet = new Set(ids);
    const next = readOutboxRecords().filter((r) => !removeSet.has(r.id));
    localStorage.setItem(STORAGE_KEYS.OUTBOX_RECORDS, JSON.stringify(next));
  } catch {
    // ignore
  }
};

const readOutboxMutations = (): KasMutation[] => {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.OUTBOX_MUTATIONS);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.map((m) => normalizeKasMutationData(m, m?.id)) : [];
  } catch {
    return [];
  }
};

const upsertOutboxMutations = (items: KasMutation[]) => {
  if (!items.length) return;
  try {
    const map = new Map<string, KasMutation>();
    readOutboxMutations().forEach((m) => map.set(m.id, m));
    items.forEach((m) => map.set(m.id, normalizeKasMutationData(m, m.id)));
    localStorage.setItem(STORAGE_KEYS.OUTBOX_MUTATIONS, JSON.stringify(Array.from(map.values())));
  } catch {
    // ignore storage quota errors
  }
};

const removeOutboxMutationIds = (ids: string[]) => {
  if (!ids.length) return;
  try {
    const removeSet = new Set(ids);
    const next = readOutboxMutations().filter((m) => !removeSet.has(m.id));
    localStorage.setItem(STORAGE_KEYS.OUTBOX_MUTATIONS, JSON.stringify(next));
  } catch {
    // ignore
  }
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
      if (activeTab !== 'scan' && activeTab !== 'data_warga') {
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

  // Selected date state (defaults to today's date and auto-advances when PWA wakes on a new day)
  const [liveToday, setLiveToday] = useState<string>(() => getTodayDateIso());
  const [selectedDate, setSelectedDateState] = useState<string>(() => getTodayDateIso());

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

  useEffect(() => {
    const syncLiveCalendarDay = () => {
      const freshToday = getTodayDateIso();
      setLiveToday((prevLive) => {
        if (prevLive !== freshToday) {
          setSelectedDateState((prevSelected) => (prevSelected === prevLive ? freshToday : prevSelected));
          return freshToday;
        }
        return prevLive;
      });
    };

    const onVisibility = () => {
      if (document.visibilityState === 'visible') {
        syncLiveCalendarDay();
      }
    };

    window.addEventListener('focus', syncLiveCalendarDay);
    document.addEventListener('visibilitychange', onVisibility);
    const interval = setInterval(syncLiveCalendarDay, 60000);
    return () => {
      window.removeEventListener('focus', syncLiveCalendarDay);
      document.removeEventListener('visibilitychange', onVisibility);
      clearInterval(interval);
    };
  }, []);

  const handleResetToTodayDate = () => {
    const today = getTodayDateIso();
    setLiveToday(today);
    setSelectedDate(today);
  };

  const isViewingPastDate = selectedDate !== liveToday;

  // Cloud sync indicator state & non-blocking toast notifications
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [appToast, setAppToast] = useState<{ message: string; tone: 'success' | 'error' } | null>(null);
  const pendingDeletedMutationIdsRef = useRef<Set<string>>(new Set());
  const pendingDeletedRecordIdsRef = useRef<Set<string>>(new Set());

  const showAppToast = (message: string, tone: 'success' | 'error' = 'success') => {
    setAppToast({ message, tone });
    setTimeout(() => {
      setAppToast((prev) => (prev?.message === message ? null : prev));
    }, 3500);
  };

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
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          return parsed.map((r) => normalizeJimpitanRecordData(r, r?.id));
        }
      }
    } catch (e) {
      console.warn('Failed to load records', e);
    }
    return [];
  });

  // Kas Mutations
  const [kasMutations, setKasMutations] = useState<KasMutation[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.MUTATIONS);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          return parsed.map((m) => normalizeKasMutationData(m, m?.id));
        }
      }
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
  // REAL-TIME FIRESTORE SUBSCRIPTIONS (Authoritative multi-device sync)
  // =========================================================================
  useEffect(() => {
    setIsSyncing(true);

    // One-time migration: flush any legacy per-device deleted mutation IDs to Firestore
    // so all devices (Android & PC) see the exact same mutation list.
    try {
      const legacyDeletedRaw = localStorage.getItem('jimpitan_rt_deleted_mutations');
      if (legacyDeletedRaw) {
        const legacyIds: string[] = JSON.parse(legacyDeletedRaw);
        if (Array.isArray(legacyIds) && legacyIds.length > 0) {
          legacyIds.forEach((id) => {
            deleteKasMutationCloud(id).catch(() => {});
          });
        }
        localStorage.removeItem('jimpitan_rt_deleted_mutations');
      }
    } catch {
      // ignore
    }

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

    const unsubRecords = subscribeJimpitanRecords((cloudRecords, meta) => {
      const cloudIds = new Set(cloudRecords.map((r) => r.id));
      const currentOutbox = readOutboxRecords();

      if (!meta.fromCache && currentOutbox.length > 0) {
        const syncedIds = currentOutbox.filter((r) => cloudIds.has(r.id)).map((r) => r.id);
        if (syncedIds.length > 0) {
          removeOutboxRecordIds(syncedIds);
        }
      }

      const remainingOutbox = readOutboxRecords().filter((r) => !cloudIds.has(r.id));
      if (!meta.fromCache && remainingOutbox.length > 0) {
        remainingOutbox.forEach((rec) => {
          addJimpitanRecordCloud(rec)
            .then(() => removeOutboxRecordIds([rec.id]))
            .catch((err) => console.warn('Retrying pending outbox record later:', err));
        });
      }

      const mergedMap = new Map<string, JimpitanRecord>();
      cloudRecords.forEach((r) => {
        if (!pendingDeletedRecordIdsRef.current.has(r.id)) {
          mergedMap.set(r.id, r);
        }
      });
      remainingOutbox.forEach((r) => {
        if (!pendingDeletedRecordIdsRef.current.has(r.id)) {
          mergedMap.set(r.id, r);
        }
      });

      const merged = Array.from(mergedMap.values()).sort(
        (a, b) => (b.tanggal || '').localeCompare(a.tanggal || '') || (b.createdAt || 0) - (a.createdAt || 0)
      );

      setAllRecords(merged);
      try {
        localStorage.setItem(STORAGE_KEYS.RECORDS, JSON.stringify(merged));
      } catch (e) {
        console.warn('Storage save failed:', e);
      }
      setIsSyncing(false);
    });

    const unsubMutations = subscribeKasMutations((cloudMutations, meta) => {
      const cloudIds = new Set(cloudMutations.map((m) => m.id));
      const currentOutbox = readOutboxMutations();

      if (!meta.fromCache && currentOutbox.length > 0) {
        const syncedIds = currentOutbox.filter((m) => cloudIds.has(m.id)).map((m) => m.id);
        if (syncedIds.length > 0) {
          removeOutboxMutationIds(syncedIds);
        }
      }

      const remainingOutbox = readOutboxMutations().filter((m) => !cloudIds.has(m.id));
      if (!meta.fromCache && remainingOutbox.length > 0) {
        remainingOutbox.forEach((mut) => {
          addKasMutationCloud(mut)
            .then(() => removeOutboxMutationIds([mut.id]))
            .catch((err) => console.warn('Retrying pending outbox mutation later:', err));
        });
      }

      const mergedMap = new Map<string, KasMutation>();
      cloudMutations.forEach((m) => {
        if (!pendingDeletedMutationIdsRef.current.has(m.id)) {
          mergedMap.set(m.id, m);
        }
      });
      remainingOutbox.forEach((m) => {
        if (!pendingDeletedMutationIdsRef.current.has(m.id)) {
          mergedMap.set(m.id, m);
        }
      });

      const merged = Array.from(mergedMap.values()).sort(
        (a, b) => (b.tanggal || '').localeCompare(a.tanggal || '') || (b.createdAt || 0) - (a.createdAt || 0)
      );

      setKasMutations(merged);
      try {
        localStorage.setItem(STORAGE_KEYS.MUTATIONS, JSON.stringify(merged));
      } catch (e) {
        console.warn('Failed to cache mutations in localStorage:', e);
      }
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

  // Force authoritative refresh from Firestore server (1-tap reconciliation across Android & Web)
  const handleForceCloudSync = async () => {
    setIsSyncing(true);
    try {
      // Check calendar day rollover as well
      const freshToday = getTodayDateIso();
      if (freshToday !== liveToday) {
        setLiveToday(freshToday);
        if (selectedDate === liveToday) {
          setSelectedDate(freshToday);
        }
      }

      // Flush any offline pending outbox items first
      const pendingRecs = readOutboxRecords();
      if (pendingRecs.length > 0) {
        await addBatchJimpitanRecordsCloud(pendingRecs);
        removeOutboxRecordIds(pendingRecs.map((r) => r.id));
      }

      const pendingMuts = readOutboxMutations();
      if (pendingMuts.length > 0) {
        for (const mut of pendingMuts) {
          await addKasMutationCloud(mut);
          removeOutboxMutationIds([mut.id]);
        }
      }

      const fresh = await forceFetchAuthoritativeCloudData();
      if (fresh.settings) {
        setSettings(fresh.settings);
        localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(fresh.settings));
      }
      if (fresh.wargaList.length > 0) {
        setWargaList(fresh.wargaList);
        localStorage.setItem(STORAGE_KEYS.WARGA, JSON.stringify(fresh.wargaList));
      }
      setAllRecords(fresh.records);
      localStorage.setItem(STORAGE_KEYS.RECORDS, JSON.stringify(fresh.records));
      setKasMutations(fresh.mutations);
      localStorage.setItem(STORAGE_KEYS.MUTATIONS, JSON.stringify(fresh.mutations));

      if ('serviceWorker' in navigator) {
        navigator.serviceWorker.getRegistration().then((reg) => reg?.update()).catch(() => {});
      }
    } catch (err) {
      console.warn('Force cloud sync fallback:', err);
    } finally {
      setIsSyncing(false);
    }
  };

  // Derived metrics
  const activeRegu = reguList.find((r) => r.id === selectedReguId) || reguList[0];

  const getEffectiveNominal = (r: JimpitanRecord): number =>
    r.status === 'kosong' || r.status === 'lewat' ? 0 : Number(r.nominal) || 0;

  // Records for selected date
  const recordsTonight = allRecords.filter((r) => r.tanggal === selectedDate);
  const totalTerkumpulMalamIni = recordsTonight.reduce((sum, r) => sum + getEffectiveNominal(r), 0);
  const totalRumah = wargaList.length;
  const jumlahRumahScanned = recordsTonight.length;
  const totalTarget = wargaList.reduce(
    (sum, w) => sum + (w.isActive === false ? 0 : typeof w.nominalDefault === 'number' ? w.nominalDefault : 1000),
    0
  );

  // Total Kas Balance (Akumulasi Saldo Awal + Seluruh Jimpitan + Mutasi Masuk - Pengeluaran)
  const saldoAwalKas = Number(settings.saldoAwalKas) || 0;

  const totalPemasukanMutasi = kasMutations
    .filter((m) => m.jenis === 'masuk')
    .reduce((sum, m) => sum + (Number(m.nominal) || 0), 0);

  const totalPengeluaranMutasi = kasMutations
    .filter((m) => m.jenis === 'keluar')
    .reduce((sum, m) => sum + (Number(m.nominal) || 0), 0);

  const totalJimpitanAllTime = allRecords.reduce((sum, r) => sum + getEffectiveNominal(r), 0);
  const saldoKas = saldoAwalKas + totalPemasukanMutasi + totalJimpitanAllTime - totalPengeluaranMutasi;

  const findExistingSameDayRecord = (
    list: JimpitanRecord[],
    candidate: Pick<JimpitanRecord, 'tanggal' | 'wargaId' | 'nomorRumah'>
  ): JimpitanRecord | undefined => {
    const normHouse = candidate.nomorRumah ? normalizeHouseNumber(candidate.nomorRumah) : '';
    return list.find((r) => {
      if (r.tanggal !== candidate.tanggal) return false;
      if (candidate.wargaId && r.wargaId && r.wargaId === candidate.wargaId) return true;
      if (normHouse && r.nomorRumah && normalizeHouseNumber(r.nomorRumah) === normHouse) return true;
      return false;
    });
  };

  // Handlers for Jimpitan Records (Cloud Synchronized)
  const handleSaveRecord = async (record: Omit<JimpitanRecord, 'id' | 'createdAt'>) => {
    const existing = findExistingSameDayRecord(allRecords, record);

    const targetId = existing ? existing.id : `jimpitan-${normalizeHouseNumber(record.nomorRumah || record.wargaId)}-${record.tanggal}`;
    const fullRecord = normalizeJimpitanRecordData(
      {
        ...record,
        id: targetId,
        createdAt: existing ? existing.createdAt : Date.now(),
      },
      targetId
    );

    upsertOutboxRecords([fullRecord]);

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
      removeOutboxRecordIds([fullRecord.id]);
    } catch (err) {
      console.error('Failed to sync record to cloud (queued in offline outbox):', err);
    }
  };

  const handleSaveBatchRecords = async (records: Omit<JimpitanRecord, 'id' | 'createdAt'>[]) => {
    if (!records || records.length === 0) return;

    const fullRecords: JimpitanRecord[] = records.map((r, i) => {
      const existing = findExistingSameDayRecord(allRecords, r);
      const targetId = existing ? existing.id : `jimpitan-${normalizeHouseNumber(r.nomorRumah || r.wargaId)}-${r.tanggal}`;
      return normalizeJimpitanRecordData(
        {
          ...r,
          id: targetId,
          createdAt: existing ? existing.createdAt : Date.now() + i,
        },
        targetId
      );
    });

    upsertOutboxRecords(fullRecords);

    // Optimistic local update
    setAllRecords((prev) => {
      const map = new Map<string, JimpitanRecord>();
      prev.forEach((p) => map.set(p.id, p));
      fullRecords.forEach((r) => map.set(r.id, r));
      const next = Array.from(map.values()).sort(
        (a, b) => (b.tanggal || '').localeCompare(a.tanggal || '') || (b.createdAt || 0) - (a.createdAt || 0)
      );
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
      removeOutboxRecordIds(fullRecords.map((r) => r.id));
    } catch (err) {
      console.error('Failed to sync batch records to cloud (queued in offline outbox):', err);
    }
  };

  const handleUpdateRecord = async (updated: JimpitanRecord) => {
    const normalized = normalizeJimpitanRecordData(updated, updated.id);
    upsertOutboxRecords([normalized]);
    setAllRecords((prev) => {
      const next = prev.map((r) => (r.id === normalized.id ? normalized : r));
      localStorage.setItem(STORAGE_KEYS.RECORDS, JSON.stringify(next));
      return next;
    });
    try {
      await addJimpitanRecordCloud(normalized);
      removeOutboxRecordIds([normalized.id]);
    } catch (err) {
      console.error('Failed to update record in cloud (queued in offline outbox):', err);
    }
  };

  const handleDeleteRecord = async (recordId: string) => {
    if (!recordId) return;
    pendingDeletedRecordIdsRef.current.add(recordId);
    removeOutboxRecordIds([recordId]);
    setAllRecords((prev) => {
      const next = prev.filter((r) => r.id !== recordId);
      try {
        localStorage.setItem(STORAGE_KEYS.RECORDS, JSON.stringify(next));
      } catch {
        // ignore
      }
      return next;
    });
    try {
      await deleteJimpitanRecordCloud(recordId);
      showAppToast('Catatan jimpitan berhasil dihapus dari Cloud.');
    } catch (err) {
      console.error('Failed to delete record in cloud:', err);
      showAppToast('Gagal menghapus catatan di Cloud. Periksa koneksi internet.', 'error');
    } finally {
      pendingDeletedRecordIdsRef.current.delete(recordId);
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

    const oldWarga = wargaList.find((w) => w.id === updated.id);

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

    // Cascade update all existing jimpitan records if name or house number was updated
    if (oldWarga && (oldWarga.nama !== updated.nama || oldWarga.nomorRumah !== updated.nomorRumah)) {
      const affectedRecords: JimpitanRecord[] = [];
      setAllRecords((prevRecords) => {
        const nextRecords = prevRecords.map((rec) => {
          if (
            rec.wargaId === updated.id ||
            rec.nomorRumah === oldWarga.nomorRumah ||
            rec.nomorRumah === updated.nomorRumah
          ) {
            const updatedRec: JimpitanRecord = {
              ...rec,
              wargaId: updated.id,
              nomorRumah: updated.nomorRumah,
              namaWarga: updated.nama,
            };
            affectedRecords.push(updatedRec);
            return updatedRec;
          }
          return rec;
        });

        try {
          localStorage.setItem(STORAGE_KEYS.RECORDS, JSON.stringify(nextRecords));
        } catch (e) {
          console.warn('Failed to save cascaded records to localStorage:', e);
        }
        return nextRecords;
      });

      // Sync affected records to Firestore cloud
      if (affectedRecords.length > 0) {
        addBatchJimpitanRecordsCloud(affectedRecords).catch((err) =>
          console.warn('Failed to sync cascaded records to cloud:', err)
        );
      }
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

  // Reset / Pemutihan Piutang Massal: Hapus data piutang lampau & setel default 0 Rupiah hingga tanggal hari ini
  const handleResetAllPiutangToZero = async () => {
    const today = getTodayDateIso();
    const updatedList = wargaList.map((w) => ({
      ...w,
      saldoTunggakanAwal: 0,
      koreksiPiutang: undefined,
      catatanKoreksiPiutang: `Pemutihan piutang s/d bulan sebelumnya (Default Rp 0) pada ${formatTanggalIndo(today)} oleh ${petugasNama}`,
      tanggalKoreksiPiutang: today,
    }));

    setWargaList(updatedList);
    try {
      localStorage.setItem(STORAGE_KEYS.WARGA, JSON.stringify(updatedList));
      await saveBatchWargaCloud(updatedList);
    } catch (err) {
      console.error('Failed to reset all piutang to zero:', err);
    }
  };

  // Kembalikan Perhitungan Piutang Otomatis Murni Berdasarkan Target Bulanan & Riwayat Transaksi
  const handleRestoreAutoPiutangCalculation = async () => {
    const updatedList: Warga[] = wargaList.map((w) => {
      const next = { ...w };
      delete next.saldoTunggakanAwal;
      delete next.koreksiPiutang;
      delete next.catatanKoreksiPiutang;
      delete next.tanggalKoreksiPiutang;
      return next;
    });

    setWargaList(updatedList);
    try {
      localStorage.setItem(STORAGE_KEYS.WARGA, JSON.stringify(updatedList));
      await saveBatchWargaCloud(updatedList);
    } catch (err) {
      console.error('Failed to restore automatic piutang calculation:', err);
    }
  };

  // Handlers for Mutations (Cloud Synchronized)
  const handleAddMutation = async (mut: Omit<KasMutation, 'id' | 'createdAt'>) => {
    const targetId = `mut-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
    const newMut = normalizeKasMutationData(
      {
        ...mut,
        id: targetId,
        createdAt: Date.now(),
      },
      targetId
    );

    upsertOutboxMutations([newMut]);

    setKasMutations((prev) => {
      const next = [newMut, ...prev.filter((m) => m.id !== newMut.id)];
      try {
        localStorage.setItem(STORAGE_KEYS.MUTATIONS, JSON.stringify(next));
      } catch (e) {
        console.warn('Storage save error:', e);
      }
      return next;
    });
    try {
      await addKasMutationCloud(newMut);
      removeOutboxMutationIds([newMut.id]);
    } catch (err) {
      console.error('Failed to add mutation in cloud (queued in offline outbox):', err);
    }
  };

  const handleUpdateMutation = async (updated: KasMutation) => {
    const normalized = normalizeKasMutationData(updated, updated.id);
    upsertOutboxMutations([normalized]);
    setKasMutations((prev) => {
      const next = prev.map((m) => (m.id === normalized.id ? normalized : m));
      try {
        localStorage.setItem(STORAGE_KEYS.MUTATIONS, JSON.stringify(next));
      } catch (e) {
        console.warn('Storage save error:', e);
      }
      return next;
    });
    try {
      await addKasMutationCloud(normalized);
      removeOutboxMutationIds([normalized.id]);
    } catch (err) {
      console.error('Failed to update mutation in cloud (queued in offline outbox):', err);
    }
  };

  const handleDeleteMutation = async (id: string) => {
    if (!id) return;
    pendingDeletedMutationIdsRef.current.add(id);
    removeOutboxMutationIds([id]);

    setKasMutations((prev) => {
      const next = prev.filter((m) => m.id !== id);
      try {
        localStorage.setItem(STORAGE_KEYS.MUTATIONS, JSON.stringify(next));
      } catch (e) {
        console.warn('Storage save error:', e);
      }
      return next;
    });
    try {
      await deleteKasMutationCloud(id);
      showAppToast('Mutasi kas berhasil dihapus dari sistem & Cloud.');
    } catch (err) {
      console.error('Failed to delete mutation in cloud:', err);
      showAppToast('Gagal menghapus mutasi di Cloud. Periksa koneksi internet.', 'error');
    } finally {
      pendingDeletedMutationIdsRef.current.delete(id);
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
      setAppMode('petugas');
      try {
        localStorage.setItem(STORAGE_KEYS.APP_MODE, 'petugas');
      } catch {
        // ignore
      }
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
      localStorage.removeItem(STORAGE_KEYS.OUTBOX_RECORDS);
      localStorage.removeItem(STORAGE_KEYS.OUTBOX_MUTATIONS);
      const res = await purgeArchiveAndDemoDataCloud();
      setAllRecords([]);
      setKasMutations([]);
      setRondaSessions({});
      setMoneyCounts(DEFAULT_MONEY_DENOMINATION);
      setWargaList((prev) => prev.filter((w) => !['warga-01', 'warga-02', 'warga-03'].includes(w.id)));
      showAppToast(
        `Arsip & demo dibersihkan (${res.deletedRecCount} jimpitan, ${res.deletedMutCount} mutasi kas, ${res.deletedSessCount} sesi).`
      );
    } catch (err) {
      console.error('Gagal membersihkan data arsip & demo:', err);
      setAllRecords([]);
      setKasMutations([]);
      setRondaSessions({});
      setMoneyCounts(DEFAULT_MONEY_DENOMINATION);
      showAppToast('Data arsip dan demo telah dibersihkan dari penyimpanan.');
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
      showAppToast(
        `Data September dihapus (${res.deletedRecCount} jimpitan, ${res.deletedMutCount} mutasi kas).`
      );
    } catch (err) {
      console.error('Gagal menghapus data September:', err);
      setAllRecords((prev) => prev.filter((r) => !r.tanggal || (!r.tanggal.includes('-09-') && !r.tanggal.startsWith('2026-09'))));
      setKasMutations((prev) => prev.filter((m) => !m.tanggal || (!m.tanggal.includes('-09-') && !m.tanggal.startsWith('2026-09'))));
      showAppToast('Data bulan September berhasil dibersihkan dari memori aplikasi.');
    }
  };

  const handleResetAllData = async () => {
    try {
      localStorage.removeItem(STORAGE_KEYS.OUTBOX_RECORDS);
      localStorage.removeItem(STORAGE_KEYS.OUTBOX_MUTATIONS);
      await resetAllCloudData();
      showAppToast('Data Cloud berhasil di-reset bersih.');
    } catch (e) {
      setAllRecords([]);
      setKasMutations([]);
      setMoneyCounts(DEFAULT_MONEY_DENOMINATION);
      showAppToast('Data lokal berhasil di-reset.');
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
      showAppToast('Data contoh RT berhasil disinkronkan ke Cloud!');
    } catch (e) {
      setWargaList(DEFAULT_WARGA);
      setReguList(DEFAULT_REGU);
      setKasMutations(DEFAULT_MUTATIONS);
      setSettings(DEFAULT_SETTINGS);
      setMoneyCounts(DEFAULT_MONEY_DENOMINATION);
      showAppToast('Data contoh dimuat secara lokal.');
    }
  };

  const handleRestoreFullBackup = async (data: any) => {
    try {
      await restoreFullCloudBackup(data);
      showAppToast('Data backup berhasil disinkronkan ke seluruh warga dan pengurus RT!');
    } catch (err) {
      if (data.settings) setSettings(data.settings);
      if (data.allWarga) setWargaList(data.allWarga);
      if (data.allRecords) setAllRecords(data.allRecords);
      if (data.allMutations) setKasMutations(data.allMutations);
      if (data.reguList) setReguList(data.reguList);
      if (data.moneyCounts) setMoneyCounts(data.moneyCounts);
      showAppToast('Backup berhasil dipulihkan secara lokal.');
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
      // Automatically generate a cloud snapshot when ronda finishes
      triggerAutoCloudBackup({
        settings,
        warga: wargaList,
        records: allRecords,
        mutations: kasMutations,
        regu: reguList,
        moneyCounts,
        totalKas: saldoKas,
      }).catch(console.warn);
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
        onForceSync={handleForceCloudSync}
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
            <ErrorBoundary fallbackTitle="Kendala Memuat Buku Kas RT">
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
                onOpenLaporanHub={appMode !== 'warga' ? handleOpenLaporanHub : undefined}
                onSelectDate={setSelectedDate}
                onResetToToday={handleResetToTodayDate}
                onForceSync={handleForceCloudSync}
                isSyncing={isSyncing}
                isAdmin={isAdminUnlocked}
                appMode={appMode}
                theme={themeState.theme}
                activePresences={activePresences}
                currentPetugas={petugasNama}
              />
            </ErrorBoundary>
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
                onRestoreAutoPiutang={handleRestoreAutoPiutangCalculation}
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
                showAppToast('Aplikasi terkunci. Mode admin dinonaktifkan.');
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
              onOpenShareModal={() => handleOpenShareModal('laporan')}
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

      {/* Pusat Laporan & Rekapitulasi RT Modal (Khusus Petugas & Admin) */}
      {isLaporanHubOpen && appMode !== 'warga' && (
        <ErrorBoundary fallbackTitle="Kendala Membuka Pusat Laporan RT">
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
            onDeleteMutation={handleDeleteMutation}
            isAdmin={isAdminUnlocked || appMode === 'petugas'}
          />
        </ErrorBoundary>
      )}

      {/* Global Action Toast Feedback */}
      {appToast && (
        <div className="fixed bottom-20 left-1/2 -translate-x-1/2 z-[70] px-4 w-full max-w-sm pointer-events-none animate-in fade-in slide-in-from-bottom-3">
          <div
            className={`px-4 py-2.5 rounded-2xl text-xs font-extrabold shadow-xl border text-center ${
              appToast.tone === 'error'
                ? 'bg-rose-900/95 text-rose-50 border-rose-700'
                : 'bg-stone-900/95 text-emerald-300 border-stone-700'
            }`}
          >
            {appToast.message}
          </div>
        </div>
      )}

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
