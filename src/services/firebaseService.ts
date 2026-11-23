import { initializeApp, getApps, getApp } from 'firebase/app';
import { 
  getFirestore, 
  initializeFirestore,
  persistentLocalCache,
  persistentMultipleTabManager,
  memoryLocalCache,
  setLogLevel,
  collection, 
  doc, 
  setDoc, 
  getDocs, 
  getDocsFromServer,
  deleteDoc, 
  onSnapshot, 
  writeBatch,
  getDoc,
  getDocFromServer,
  deleteField,
  query,
  where,
  Firestore,
  Unsubscribe
} from 'firebase/firestore';
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  signOut,
  onAuthStateChanged,
  User,
} from 'firebase/auth';
import firebaseConfig from '../../firebase-applet-config.json';
import { 
  AppSettings, 
  Warga, 
  JimpitanRecord, 
  KasMutation, 
  ReguRonda, 
  MoneyDenomination, 
  RondaSession, 
  UserPresence, 
  AppMode,
  AppBackup,
  MonthlyArchive,
  DesignatedOfficerDevice
} from '../types';
import { DEFAULT_SETTINGS, DEFAULT_REGU, DEFAULT_WARGA, DEFAULT_MUTATIONS } from '../data/defaultData';
import { deduplicateWargaArray } from '../utils/wargaDeduplicator';
import { formatLocalDateIsoFromMs, getTodayDateIso } from '../utils/formatters';

// Suppress noisy internal @firebase/firestore 10s offline-mode console.error logs
// (App handles offline state gracefully via OfflineBanner + localStorage outbox)
try {
  setLogLevel('silent');
} catch {
  // ignore
}

// Initialize Firebase App instance
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();

// Initialize Firestore with auto-detected long polling (prevents 10s WebChannel timeout
// behind proxies, mobile carriers, and sandboxed iframes) + resilient cache fallback
export const initFirestoreInstance = (): Firestore => {
  const dbId = firebaseConfig.firestoreDatabaseId || undefined;
  try {
    return initializeFirestore(
      app,
      {
        experimentalAutoDetectLongPolling: true,
        localCache: persistentLocalCache({
          tabManager: persistentMultipleTabManager(),
        }),
      },
      dbId
    );
  } catch {
    try {
      return initializeFirestore(
        app,
        {
          experimentalAutoDetectLongPolling: true,
          localCache: memoryLocalCache(),
        },
        dbId
      );
    } catch {
      return dbId ? getFirestore(app, dbId) : getFirestore(app);
    }
  }
};

export const db: Firestore = initFirestoreInstance();
export const auth = getAuth(app);

export const PRIMARY_ADMIN_EMAIL = 'picpurwokerto2024@gmail.com';

export const getAllowedAdminEmails = (settings?: Partial<AppSettings>): string[] => {
  const allowed = new Set<string>([PRIMARY_ADMIN_EMAIL.toLowerCase()]);
  if (Array.isArray(settings?.adminEmails)) {
    settings.adminEmails.forEach((item) => {
      const clean = String(item || '').trim().toLowerCase();
      if (clean && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(clean)) {
        allowed.add(clean);
      }
    });
  }
  return Array.from(allowed);
};

export const isAuthorizedAdminEmail = (
  email: string | null | undefined,
  settings?: Partial<AppSettings>
): boolean => {
  if (!email) return false;
  const clean = email.trim().toLowerCase();
  return getAllowedAdminEmails(settings).includes(clean);
};

export const getCurrentAuthUser = (): User | null => auth.currentUser;

export const subscribeAdminAuthState = (callback: (user: User | null) => void): Unsubscribe => {
  return onAuthStateChanged(auth, callback);
};

export const verifyAdminEmailInput = (
  rawEmail: string,
  settings?: Partial<AppSettings>
): { ok: true; email: string } | { ok: false; message: string } => {
  const clean = (rawEmail || '').trim().toLowerCase();
  if (!clean) {
    return {
      ok: false,
      message: 'Silakan masukkan alamat Email Admin RT yang terdaftar.',
    };
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(clean)) {
    return {
      ok: false,
      message: 'Format alamat email tidak valid. Contoh: namaadmin@gmail.com',
    };
  }
  if (!isAuthorizedAdminEmail(clean, settings)) {
    return {
      ok: false,
      message: `AKSES DITOLAK! Email "${clean}" bukan Email Admin RT terdaftar. Hanya Email Admin resmi yang dapat melanjutkan ke pengisian PIN.`,
    };
  }
  return { ok: true, email: clean };
};

export const verifyAdminWithGooglePopup = async (
  settings?: Partial<AppSettings>
): Promise<{ ok: true; email: string } | { ok: false; message: string; rejectedEmail?: string; code?: string }> => {
  try {
    const provider = new GoogleAuthProvider();
    provider.setCustomParameters({ prompt: 'select_account' });
    const result = await signInWithPopup(auth, provider);
    const user = result.user;
    const email = (user?.email || '').trim().toLowerCase();

    if (!email || !user.emailVerified) {
      await signOut(auth).catch(() => {});
      return {
        ok: false,
        message: 'Akun Google tidak memiliki alamat email terverifikasi.',
      };
    }

    if (!isAuthorizedAdminEmail(email, settings)) {
      await signOut(auth).catch(() => {});
      return {
        ok: false,
        rejectedEmail: email,
        message: `AKSES DITOLAK! Email "${email}" bukan Email Admin RT terdaftar. Hanya Email Admin resmi yang diizinkan masuk ke Mode Admin.`,
      };
    }

    return { ok: true, email };
  } catch (err: any) {
    const code = String(err?.code || '');
    if (code === 'auth/unauthorized-domain') {
      const host = typeof window !== 'undefined' ? window.location.hostname : '';
      return {
        ok: false,
        code,
        message: `Login pop-up Google diblokir oleh Firebase karena domain (${host || 'link ini'}) belum diotorisasi. Silakan pilih metode "Input Email Terdaftar" agar tetap bisa verifikasi email & lanjut isi PIN.`,
      };
    }
    if (code === 'auth/popup-closed-by-user' || code === 'auth/cancelled-popup-request') {
      return {
        ok: false,
        code,
        message: 'Verifikasi Google dibatalkan. Pilih akun Email Admin untuk melanjutkan.',
      };
    }
    if (code === 'auth/popup-blocked') {
      return {
        ok: false,
        code,
        message: 'Pop-up login Google diblokir oleh browser. Mohon izinkan pop-up atau gunakan pilihan "Input Email Terdaftar".',
      };
    }
    if (code === 'auth/network-request-failed') {
      return {
        ok: false,
        code,
        message: 'Koneksi internet diperlukan untuk memverifikasi akun Google.',
      };
    }
    return {
      ok: false,
      code,
      message: err?.message || 'Gagal memverifikasi Email Google Admin. Silakan coba kembali.',
    };
  }
};

export const signOutAdminGoogle = async (): Promise<void> => {
  try {
    await signOut(auth);
  } catch {
    // ignore
  }
};

// Test connection on boot gracefully with server check and local cache fallback
export const testFirestoreConnection = async (): Promise<boolean> => {
  if (typeof navigator !== 'undefined' && navigator.onLine === false) {
    return false;
  }
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
    return true;
  } catch (err: any) {
    if (err?.message?.includes('the client is offline') || err?.code === 'unavailable') {
      console.info('ℹ️ Firestore operating in offline cache mode (will auto-sync when online)');
    } else {
      console.info('ℹ️ Firestore status checked');
    }
    return true;
  }
};

// Immediately invoke connection test safely
testFirestoreConnection().catch(() => {});

// Collection Names
const SETTINGS_DOC = 'settings/current';
const WARGA_COL = 'warga';
const RECORDS_COL = 'jimpitan_records';
const MUTATIONS_COL = 'kas_mutations';
const REGU_COL = 'regu_ronda';
const SESSIONS_COL = 'ronda_sessions';
const MONEY_COUNTS_DOC = 'money_counts/latest';
const BACKUPS_COL = 'backups';
const ARCHIVES_COL = 'monthly_archives';

// Helper to chunk arrays into groups of max 400 items (safely below Firestore's 500 batch limit)
export const chunkArray = <T>(array: T[], size = 400): T[][] => {
  if (!array || array.length === 0) return [];
  const result: T[][] = [];
  for (let i = 0; i < array.length; i += size) {
    result.push(array.slice(i, i + size));
  }
  return result;
};

// Generic batch executor with chunking for large datasets (>500 items)
export const commitChunkedBatch = async <T>(
  items: T[],
  operation: (batch: ReturnType<typeof writeBatch>, item: T) => void,
  chunkSize = 400
) => {
  if (!items || items.length === 0) return;
  const chunks = chunkArray(items, chunkSize);
  for (const chunk of chunks) {
    const batch = writeBatch(db);
    chunk.forEach((item) => operation(batch, item));
    await batch.commit();
  }
};

const isPlainObject = (val: unknown): val is Record<string, any> => {
  if (val === null || typeof val !== 'object' || Array.isArray(val)) return false;
  const proto = Object.getPrototypeOf(val);
  return proto === Object.prototype || proto === null;
};

export const cleanFirestoreValue = (val: any): any => {
  if (val === undefined) return undefined;
  if (Array.isArray(val)) {
    return val
      .map((item) => cleanFirestoreValue(item))
      .filter((item) => item !== undefined);
  }
  if (isPlainObject(val)) {
    const result: Record<string, any> = {};
    for (const key of Object.keys(val)) {
      const cleaned = cleanFirestoreValue(val[key]);
      if (cleaned !== undefined) {
        result[key] = cleaned;
      }
    }
    return result;
  }
  return val;
};

// Helper to recursively remove undefined fields (including objects inside arrays) so Firestore setDoc/updateDoc never fails
export const cleanFirestoreData = <T extends Record<string, any>>(obj: T): T => {
  return cleanFirestoreValue(obj) as T;
};

// ==========================================
// 1. SETTINGS SYNC
// ==========================================
const hasCustomSettings = (s: Partial<AppSettings>): boolean => {
  const hasExtraAdminEmails =
    Array.isArray(s.adminEmails) &&
    s.adminEmails.some((em) => String(em || '').trim().toLowerCase() !== PRIMARY_ADMIN_EMAIL.toLowerCase());
  return (
    Number(s.saldoAwalKas || 0) !== 0 ||
    (Boolean(s.pinAdmin) && s.pinAdmin !== DEFAULT_SETTINGS.pinAdmin) ||
    (Boolean(s.pinPenginput) && s.pinPenginput !== DEFAULT_SETTINGS.pinPenginput) ||
    hasExtraAdminEmails ||
    Boolean(s.namaBendahara?.trim()) ||
    Boolean(s.namaKetuaRt?.trim()) ||
    (s.namaRt !== undefined && s.namaRt !== DEFAULT_SETTINGS.namaRt) ||
    (s.namaRw !== undefined && s.namaRw !== DEFAULT_SETTINGS.namaRw) ||
    (s.lingkungan !== undefined && s.lingkungan !== DEFAULT_SETTINGS.lingkungan) ||
    (s.defaultNominal !== undefined && Number(s.defaultNominal) !== DEFAULT_SETTINGS.defaultNominal)
  );
};

const normalizeSettingsPayload = (raw: Record<string, any>): AppSettings => {
  const { updatedAt: _ignoredUpdatedAt, ...rest } = raw || {};
  return {
    ...DEFAULT_SETTINGS,
    ...(rest as Partial<AppSettings>),
    saldoAwalKas: rest.saldoAwalKas !== undefined ? Number(rest.saldoAwalKas) || 0 : 0,
    pinAdmin: rest.pinAdmin && String(rest.pinAdmin).trim() ? String(rest.pinAdmin).trim() : DEFAULT_SETTINGS.pinAdmin,
    pinPenginput:
      rest.pinPenginput && String(rest.pinPenginput).trim()
        ? String(rest.pinPenginput).trim()
        : DEFAULT_SETTINGS.pinPenginput,
    adminEmails: getAllowedAdminEmails(rest as Partial<AppSettings>),
  };
};

export const subscribeSettings = (callback: (settings: AppSettings) => void): Unsubscribe => {
  const settingsDocRef = doc(db, 'settings', 'current');
  const settingsBackupRef = doc(db, 'settings', 'backup');
  let didAttemptServerSeed = false;
  let lastBackupRecoveryAttemptMs = 0;

  return onSnapshot(
    settingsDocRef,
    { includeMetadataChanges: true },
    (snap) => {
      const isFromCache = snap.metadata.fromCache;
      if (snap.exists()) {
        const raw = snap.data() as Record<string, any>;
        const normalized = normalizeSettingsPayload(raw);

        // Ignore un-timestamped cache-only default settings on cold/legacy devices until server responds
        if (isFromCache && raw.updatedAt === undefined && !hasCustomSettings(normalized)) {
          return;
        }

        // If an older client/PWA overwrote settings/current with un-timestamped DEFAULT_SETTINGS,
        // automatically recover custom PINs & Saldo Awal from settings/backup (cooldown 5s).
        const now = Date.now();
        if (
          !isFromCache &&
          raw.updatedAt === undefined &&
          !hasCustomSettings(normalized) &&
          now - lastBackupRecoveryAttemptMs > 5000
        ) {
          lastBackupRecoveryAttemptMs = now;
          getDocFromServer(settingsBackupRef)
            .then((backupSnap) => {
              if (backupSnap.exists()) {
                const backupRaw = backupSnap.data() as Record<string, any>;
                const restored = normalizeSettingsPayload(backupRaw);
                if (hasCustomSettings(restored)) {
                  setDoc(
                    settingsDocRef,
                    cleanFirestoreData({ ...restored, updatedAt: Date.now() }),
                    { merge: true }
                  ).catch(console.error);
                  callback(restored);
                  return;
                }
              }
              callback(normalized);
            })
            .catch(() => {
              callback(normalized);
            });
          return;
        }

        callback(normalized);
      } else if (!isFromCache && !didAttemptServerSeed) {
        // Double-check directly against the server before seeding defaults so a transient
        // cache miss never overwrites existing RT settings, PINs, or Saldo Awal Kas.
        didAttemptServerSeed = true;
        getDocFromServer(settingsDocRef)
          .then(async (serverSnap) => {
            if (serverSnap.exists()) {
              callback(normalizeSettingsPayload(serverSnap.data()));
              return;
            }
            try {
              const backupSnap = await getDocFromServer(settingsBackupRef);
              if (backupSnap.exists()) {
                const restored = normalizeSettingsPayload(backupSnap.data());
                if (hasCustomSettings(restored)) {
                  await setDoc(settingsDocRef, cleanFirestoreData({ ...restored, updatedAt: Date.now() }));
                  callback(restored);
                  return;
                }
              }
            } catch {
              // ignore backup read error
            }
            setDoc(settingsDocRef, cleanFirestoreData({ ...DEFAULT_SETTINGS, updatedAt: Date.now() })).catch(
              console.error
            );
            callback(DEFAULT_SETTINGS);
          })
          .catch(() => {
            // Offline or unreachable server: keep local state intact without overwriting cloud
          });
      }
    },
    (err) => {
      console.warn('Settings sync fallback:', err);
    }
  );
};

export const saveSettingsCloud = async (settings: AppSettings) => {
  try {
    const settingsDocRef = doc(db, 'settings', 'current');
    const normalized = normalizeSettingsPayload(settings as Record<string, any>);
    const payload = cleanFirestoreData({
      ...normalized,
      updatedAt: Date.now(),
    });
    await setDoc(settingsDocRef, payload, { merge: true });

    // Maintain a lightweight settings-only mirror so Saldo Awal & PINs survive any legacy client reset
    if (hasCustomSettings(normalized)) {
      const settingsBackupRef = doc(db, 'settings', 'backup');
      setDoc(settingsBackupRef, payload, { merge: true }).catch((backupErr) => {
        console.warn('Settings mirror backup notice:', backupErr);
      });
    }
  } catch (err) {
    console.error('Failed to save settings to cloud:', err);
    throw err;
  }
};

// ==========================================
// 2. WARGA SYNC (Real-time)
// ==========================================
export const seedCleanWarga = async (initialList?: Warga[]) => {
  try {
    const listToSeed = initialList && initialList.length > 0 ? initialList : DEFAULT_WARGA;
    const batch = writeBatch(db);
    listToSeed.forEach((w) => {
      const wargaRef = doc(db, WARGA_COL, w.id);
      const { id, ...data } = w;
      batch.set(wargaRef, cleanFirestoreData(data), { merge: true });
    });
    await batch.commit();
    console.log('✅ Warga data seeded to Firestore');
  } catch (err) {
    console.error('Failed to seed warga:', err);
  }
};

export const subscribeWarga = (callback: (wargaList: Warga[]) => void): Unsubscribe => {
  const colRef = collection(db, WARGA_COL);
  return onSnapshot(
    colRef,
    { includeMetadataChanges: true },
    (snapshot) => {
      if (snapshot.empty) {
        if (!snapshot.metadata.fromCache) {
          callback([]);
        }
      } else {
        const list: Warga[] = [];
        snapshot.forEach((docSnap) => {
          list.push({ id: docSnap.id, ...docSnap.data() } as Warga);
        });
        // Deduplicate for in-memory view to ensure clean UI presentation
        const { cleanList } = deduplicateWargaArray(list);
        callback(cleanList);
      }
    },
    (err) => {
      console.warn('Warga sync fallback:', err);
    }
  );
};

export const deduplicateCloudWargaNow = async (): Promise<{ cleanedCount: number; totalWarga: number }> => {
  try {
    const snap = await getDocs(collection(db, WARGA_COL));
    const list: Warga[] = [];
    snap.forEach((docSnap) => {
      list.push({ id: docSnap.id, ...docSnap.data() } as Warga);
    });
    const { cleanList, duplicateIds } = deduplicateWargaArray(list);
    if (duplicateIds.length > 0) {
      const batch = writeBatch(db);
      duplicateIds.forEach((dupId) => {
        batch.delete(doc(db, WARGA_COL, dupId));
      });
      // Ensure merged clean records are updated
      cleanList.forEach((w) => {
        const { id, ...data } = w;
        batch.set(doc(db, WARGA_COL, id), cleanFirestoreData(data), { merge: true });
      });
      await batch.commit();
    }
    return { cleanedCount: duplicateIds.length, totalWarga: cleanList.length };
  } catch (err) {
    console.error('Failed to deduplicate cloud warga:', err);
    throw err;
  }
};

const prepareWargaCloudPayload = (warga: Warga) => {
  const { id, ...data } = warga;
  const cleaned: Record<string, any> = cleanFirestoreData(data);
  if (warga.saldoTunggakanAwal === undefined) {
    cleaned.saldoTunggakanAwal = deleteField();
  }
  if (warga.koreksiPiutang === undefined) {
    cleaned.koreksiPiutang = deleteField();
  }
  if (warga.catatanKoreksiPiutang === undefined) {
    cleaned.catatanKoreksiPiutang = deleteField();
  }
  if (warga.tanggalKoreksiPiutang === undefined) {
    cleaned.tanggalKoreksiPiutang = deleteField();
  }
  return cleaned;
};

export const saveWargaCloud = async (warga: Warga) => {
  try {
    const wargaRef = doc(db, WARGA_COL, warga.id);
    await setDoc(wargaRef, prepareWargaCloudPayload(warga), { merge: true });
  } catch (err) {
    console.error('Failed to save warga to cloud:', err);
    throw err;
  }
};

export const saveBatchWargaCloud = async (wargaList: Warga[]) => {
  if (!wargaList || wargaList.length === 0) return;
  try {
    await commitChunkedBatch(wargaList, (batch, w) => {
      const wargaRef = doc(db, WARGA_COL, w.id);
      batch.set(wargaRef, prepareWargaCloudPayload(w), { merge: true });
    });
  } catch (err) {
    console.error('Failed to batch save warga to cloud:', err);
    throw err;
  }
};

export const deleteWargaCloud = async (wargaId: string) => {
  try {
    const wargaRef = doc(db, WARGA_COL, wargaId);
    await deleteDoc(wargaRef);
  } catch (err) {
    console.error('Failed to delete warga from cloud:', err);
    throw err;
  }
};

// ==========================================
// 3. JIMPITAN RECORDS SYNC (Real-time updates)
// ==========================================
export const seedCleanRecords = async (initialList?: JimpitanRecord[]) => {
  try {
    if (!initialList || initialList.length === 0) return;
    await commitChunkedBatch(initialList, (batch, r) => {
      const recRef = doc(db, RECORDS_COL, r.id);
      const { id, ...data } = r;
      batch.set(recRef, cleanFirestoreData({ ...data, updatedAt: Date.now() }), { merge: true });
    });
    console.log('✅ Jimpitan records seeded to Firestore');
  } catch (err) {
    console.error('Failed to seed jimpitan records:', err);
  }
};

const VALID_RECORD_STATUSES = new Set(['sukses', 'kosong', 'titip', 'lewat']);

export const normalizeJimpitanRecordData = (raw: Partial<JimpitanRecord>, fallbackId?: string): JimpitanRecord => {
  const rawStatus = String(raw.status || 'sukses').toLowerCase().trim();
  const status = (VALID_RECORD_STATUSES.has(rawStatus) ? rawStatus : 'sukses') as JimpitanRecord['status'];
  const rawNominal = typeof raw.nominal === 'number' ? raw.nominal : Number(raw.nominal) || 0;
  const nominal = status === 'kosong' || status === 'lewat' ? 0 : Math.max(0, rawNominal);
  const rawDate = String(raw.tanggal || '').trim().split('T')[0];
  const tanggal = rawDate.length >= 8
    ? rawDate
    : raw.createdAt
      ? formatLocalDateIsoFromMs(raw.createdAt)
      : getTodayDateIso();
  const cleanFallback = fallbackId ? String(fallbackId).trim() : '';
  const cleanRawId = raw.id ? String(raw.id).trim() : '';

  return {
    id: cleanFallback || cleanRawId || `rec-${Date.now()}`,
    tanggal,
    waktu: String(raw.waktu || '21:00:00'),
    wargaId: String(raw.wargaId || ''),
    nomorRumah: String(raw.nomorRumah ?? ''),
    namaWarga: String(raw.namaWarga || 'Warga RT'),
    nominal,
    status,
    petugas: String(raw.petugas || 'Petugas RT'),
    reguId: String(raw.reguId || ''),
    reguNama: String(raw.reguNama || ''),
    catatan: raw.catatan ? String(raw.catatan) : undefined,
    createdAt: typeof raw.createdAt === 'number' && Number.isFinite(raw.createdAt) ? raw.createdAt : Date.now(),
  };
};

export const normalizeKasMutationData = (raw: Partial<KasMutation>, fallbackId?: string): KasMutation => {
  const rawJenis = String(raw.jenis || (raw as any)?.tipe || 'keluar').toLowerCase().trim();
  const jenis: 'masuk' | 'keluar' = rawJenis === 'masuk' ? 'masuk' : 'keluar';
  const rawNominal = typeof raw.nominal === 'number' ? raw.nominal : Number(raw.nominal) || 0;
  const nominal = Math.max(0, rawNominal);
  const rawDate = String(raw.tanggal || '').trim().split('T')[0];
  const tanggal = rawDate.length >= 8
    ? rawDate
    : raw.createdAt
      ? formatLocalDateIsoFromMs(raw.createdAt)
      : getTodayDateIso();
  const cleanFallback = fallbackId ? String(fallbackId).trim() : '';
  const cleanRawId = raw.id ? String(raw.id).trim() : '';

  return {
    id: cleanFallback || cleanRawId || `mut-${Date.now()}`,
    tanggal,
    jenis,
    nominal,
    kategori: String(raw.kategori || 'Umum'),
    keterangan: String(raw.keterangan || raw.kategori || 'Transaksi Kas RT'),
    petugas: raw.petugas ? String(raw.petugas) : undefined,
    createdAt: typeof raw.createdAt === 'number' && Number.isFinite(raw.createdAt) ? raw.createdAt : Date.now(),
  };
};

export interface SnapshotSyncMeta {
  fromCache: boolean;
  hasPendingWrites: boolean;
}

export const subscribeJimpitanRecords = (
  callback: (records: JimpitanRecord[], meta: SnapshotSyncMeta) => void
): Unsubscribe => {
  const colRef = collection(db, RECORDS_COL);
  return onSnapshot(
    colRef,
    { includeMetadataChanges: true },
    (snapshot) => {
      const meta: SnapshotSyncMeta = {
        fromCache: snapshot.metadata.fromCache,
        hasPendingWrites: snapshot.metadata.hasPendingWrites,
      };
      if (snapshot.empty) {
        callback([], meta);
      } else {
        const list: JimpitanRecord[] = [];
        snapshot.forEach((docSnap) => {
          list.push(normalizeJimpitanRecordData(docSnap.data(), docSnap.id));
        });
        list.sort(
          (a, b) => (b.tanggal || '').localeCompare(a.tanggal || '') || (b.createdAt || 0) - (a.createdAt || 0)
        );
        callback(list, meta);
      }
    },
    (err) => {
      console.warn('Records sync fallback:', err);
    }
  );
};

export const addJimpitanRecordCloud = async (record: JimpitanRecord) => {
  const normalized = normalizeJimpitanRecordData(record, record.id);
  const recRef = doc(db, RECORDS_COL, normalized.id);
  const { id, ...data } = normalized;
  await setDoc(
    recRef,
    cleanFirestoreData({
      ...data,
      updatedAt: Date.now(),
    })
  );
};

export const addBatchJimpitanRecordsCloud = async (records: JimpitanRecord[]) => {
  if (!records || records.length === 0) return;
  await commitChunkedBatch(records, (batch, record) => {
    const normalized = normalizeJimpitanRecordData(record, record.id);
    const recRef = doc(db, RECORDS_COL, normalized.id);
    const { id, ...data } = normalized;
    batch.set(
      recRef,
      cleanFirestoreData({
        ...data,
        updatedAt: Date.now(),
      }),
      { merge: true }
    );
  });
};

export const deleteJimpitanRecordCloud = async (recordId: string) => {
  if (!recordId) return;
  const recRef = doc(db, RECORDS_COL, recordId);
  await deleteDoc(recRef);

  // Also clean up any legacy document whose internal `id` field matches recordId
  try {
    const q = query(collection(db, RECORDS_COL), where('id', '==', recordId));
    const snap = await getDocs(q);
    if (!snap.empty) {
      const batch = writeBatch(db);
      snap.forEach((d) => batch.delete(d.ref));
      await batch.commit();
    }
  } catch {
    // ignore secondary query error when offline
  }
};

// ==========================================
// 4. KAS MUTATIONS SYNC (Real-time)
// ==========================================
export const seedCleanMutations = async (initialList?: KasMutation[]) => {
  try {
    const listToSeed = initialList && initialList.length > 0 ? initialList : DEFAULT_MUTATIONS;
    if (!listToSeed || listToSeed.length === 0) return;
    await commitChunkedBatch(listToSeed, (batch, m) => {
      const normalized = normalizeKasMutationData(m, m.id);
      const mutRef = doc(db, MUTATIONS_COL, normalized.id);
      const { id, ...data } = normalized;
      batch.set(
        mutRef,
        cleanFirestoreData({
          ...data,
          updatedAt: Date.now(),
        }),
        { merge: true }
      );
    });
  } catch (err) {
    console.error('Failed to seed kas mutations:', err);
  }
};

export const subscribeKasMutations = (
  callback: (mutations: KasMutation[], meta: SnapshotSyncMeta) => void
): Unsubscribe => {
  const colRef = collection(db, MUTATIONS_COL);
  return onSnapshot(
    colRef,
    { includeMetadataChanges: true },
    (snapshot) => {
      const meta: SnapshotSyncMeta = {
        fromCache: snapshot.metadata.fromCache,
        hasPendingWrites: snapshot.metadata.hasPendingWrites,
      };
      if (snapshot.empty) {
        callback([], meta);
      } else {
        const list: KasMutation[] = [];
        snapshot.forEach((docSnap) => {
          list.push(normalizeKasMutationData(docSnap.data(), docSnap.id));
        });
        list.sort(
          (a, b) => (b.tanggal || '').localeCompare(a.tanggal || '') || (b.createdAt || 0) - (a.createdAt || 0)
        );
        callback(list, meta);
      }
    },
    (err) => {
      console.warn('Kas mutations sync fallback:', err);
    }
  );
};

export const addKasMutationCloud = async (mutation: KasMutation) => {
  const normalized = normalizeKasMutationData(mutation, mutation.id);
  const mutRef = doc(db, MUTATIONS_COL, normalized.id);
  const { id, ...data } = normalized;
  await setDoc(
    mutRef,
    cleanFirestoreData({
      ...data,
      updatedAt: Date.now(),
    }),
    { merge: true }
  );
};

export const deleteKasMutationCloud = async (mutationId: string) => {
  if (!mutationId) return;
  const mutRef = doc(db, MUTATIONS_COL, mutationId);
  await deleteDoc(mutRef);

  // Also clean up any legacy document whose internal `id` field matches mutationId
  try {
    const q = query(collection(db, MUTATIONS_COL), where('id', '==', mutationId));
    const snap = await getDocs(q);
    if (!snap.empty) {
      const batch = writeBatch(db);
      snap.forEach((d) => batch.delete(d.ref));
      await batch.commit();
    }
  } catch {
    // ignore secondary query error when offline
  }
};

export const forceFetchAuthoritativeCloudData = async (): Promise<{
  settings: AppSettings | null;
  wargaList: Warga[];
  records: JimpitanRecord[];
  mutations: KasMutation[];
  reguList: ReguRonda[];
  moneyCounts: MoneyDenomination | null;
  sessions: Record<string, RondaSession>;
}> => {
  const fetchCollectionFresh = async (colName: string) => {
    const colRef = collection(db, colName);
    try {
      return await getDocsFromServer(colRef);
    } catch {
      return await getDocs(colRef);
    }
  };

  let settings: AppSettings | null = null;
  try {
    const settingsRef = doc(db, 'settings', 'current');
    let snap;
    try {
      snap = await getDocFromServer(settingsRef);
    } catch {
      snap = await getDoc(settingsRef);
    }
    if (snap.exists()) {
      const raw = snap.data() as Record<string, any>;
      settings = normalizeSettingsPayload(raw);
      if (raw.updatedAt === undefined && !hasCustomSettings(settings)) {
        try {
          const backupSnap = await getDocFromServer(doc(db, 'settings', 'backup'));
          if (backupSnap.exists()) {
            const restored = normalizeSettingsPayload(backupSnap.data());
            if (hasCustomSettings(restored)) {
              settings = restored;
            }
          }
        } catch {
          // ignore
        }
      }
    }
  } catch (err) {
    console.warn('Force fetch settings fallback:', err);
  }

  let moneyCounts: MoneyDenomination | null = null;
  try {
    const moneyRef = doc(db, 'money_counts', 'latest');
    let mSnap;
    try {
      mSnap = await getDocFromServer(moneyRef);
    } catch {
      mSnap = await getDoc(moneyRef);
    }
    if (mSnap.exists()) {
      const d = mSnap.data();
      moneyCounts = {
        koin100: Number(d.koin100) || 0,
        koin200: Number(d.koin200) || 0,
        koin500: Number(d.koin500) || 0,
        koin1000: Number(d.koin1000) || 0,
        kertas1000: Number(d.kertas1000) || 0,
        kertas2000: Number(d.kertas2000) || 0,
        kertas5000: Number(d.kertas5000) || 0,
        kertas10000: Number(d.kertas10000) || 0,
        kertas20000: Number(d.kertas20000) || 0,
        kertas50000: Number(d.kertas50000) || 0,
        kertas100000: Number(d.kertas100000) || 0,
      };
    }
  } catch (err) {
    console.warn('Force fetch money counts fallback:', err);
  }

  const [wargaSnap, recSnap, mutSnap, reguSnap, sessSnap] = await Promise.all([
    fetchCollectionFresh(WARGA_COL),
    fetchCollectionFresh(RECORDS_COL),
    fetchCollectionFresh(MUTATIONS_COL),
    fetchCollectionFresh(REGU_COL),
    fetchCollectionFresh(SESSIONS_COL),
  ]);

  const rawWarga: Warga[] = [];
  wargaSnap.forEach((d) => rawWarga.push({ id: d.id, ...d.data() } as Warga));
  const { cleanList: wargaList } = deduplicateWargaArray(rawWarga);

  const records: JimpitanRecord[] = [];
  recSnap.forEach((d) => records.push(normalizeJimpitanRecordData(d.data(), d.id)));
  records.sort(
    (a, b) => (b.tanggal || '').localeCompare(a.tanggal || '') || (b.createdAt || 0) - (a.createdAt || 0)
  );

  const mutations: KasMutation[] = [];
  mutSnap.forEach((d) => mutations.push(normalizeKasMutationData(d.data(), d.id)));
  mutations.sort(
    (a, b) => (b.tanggal || '').localeCompare(a.tanggal || '') || (b.createdAt || 0) - (a.createdAt || 0)
  );

  const reguList: ReguRonda[] = [];
  reguSnap.forEach((d) => reguList.push({ id: d.id, ...d.data() } as ReguRonda));

  const sessions: Record<string, RondaSession> = {};
  sessSnap.forEach((d) => {
    const data = d.data();
    sessions[d.id] = {
      tanggal: d.id,
      status: data.status || 'active',
      finishedAt: data.finishedAt,
      reguId: data.reguId,
      reguNama: data.reguNama,
      petugas: data.petugas,
      totalTerkumpul: typeof data.totalTerkumpul === 'number' ? data.totalTerkumpul : 0,
      jumlahRumahScanned: typeof data.jumlahRumahScanned === 'number' ? data.jumlahRumahScanned : 0,
      catatan: data.catatan,
    };
  });

  return { settings, wargaList, records, mutations, reguList, moneyCounts, sessions };
};

// ==========================================
// 5. REGU RONDA SYNC (Real-time)
// ==========================================
export const subscribeReguList = (callback: (reguList: ReguRonda[]) => void): Unsubscribe => {
  const colRef = collection(db, REGU_COL);
  let didAttemptServerSeed = false;

  return onSnapshot(
    colRef,
    { includeMetadataChanges: true },
    (snapshot) => {
      if (snapshot.empty) {
        if (!snapshot.metadata.fromCache && !didAttemptServerSeed) {
          didAttemptServerSeed = true;
          getDocsFromServer(colRef)
            .then((serverSnap) => {
              if (serverSnap.empty) {
                seedCleanRegu().catch(console.error);
                callback(DEFAULT_REGU);
              } else {
                const list: ReguRonda[] = [];
                serverSnap.forEach((docSnap) => {
                  list.push({ id: docSnap.id, ...docSnap.data() } as ReguRonda);
                });
                callback(list);
              }
            })
            .catch(() => {
              // Offline or unreachable server: keep cached regu list untouched
            });
        }
      } else {
        const list: ReguRonda[] = [];
        snapshot.forEach((docSnap) => {
          list.push({ id: docSnap.id, ...docSnap.data() } as ReguRonda);
        });
        callback(list);
      }
    },
    (err) => {
      console.warn('Regu list sync fallback:', err);
    }
  );
};

export const saveReguListCloud = async (reguList: ReguRonda[]) => {
  try {
    const currentSnap = await getDocs(collection(db, REGU_COL));
    const newIds = new Set(reguList.map((r) => r.id));
    const batch = writeBatch(db);

    currentSnap.forEach((docSnap) => {
      if (!newIds.has(docSnap.id)) {
        batch.delete(docSnap.ref);
      }
    });

    reguList.forEach((r) => {
      const ref = doc(db, REGU_COL, r.id);
      const { id, ...data } = r;
      batch.set(ref, cleanFirestoreData({ ...data, updatedAt: Date.now() }), { merge: true });
    });

    await batch.commit();
  } catch (err) {
    console.error('Failed to save regu list to cloud:', err);
    throw err;
  }
};

export const seedCleanRegu = async () => {
  try {
    const batch = writeBatch(db);
    DEFAULT_REGU.forEach((r) => {
      const ref = doc(db, REGU_COL, r.id);
      const { id, ...data } = r;
      batch.set(ref, cleanFirestoreData(data));
    });
    await batch.commit();
  } catch (err) {
    console.error('Failed to seed clean regu:', err);
  }
};

// ==========================================
// 6. MONEY COUNTER (Pecahan Fisik) SYNC
// ==========================================
export const DEFAULT_MONEY_DENOMINATION: MoneyDenomination = {
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

export const subscribeMoneyCounts = (callback: (counts: MoneyDenomination) => void): Unsubscribe => {
  const moneyDocRef = doc(db, 'money_counts', 'latest');
  return onSnapshot(
    moneyDocRef,
    { includeMetadataChanges: true },
    (snap) => {
      if (snap.exists()) {
        const data = snap.data();
        callback({
          koin100: Number(data.koin100) || 0,
          koin200: Number(data.koin200) || 0,
          koin500: Number(data.koin500) || 0,
          koin1000: Number(data.koin1000) || 0,
          kertas1000: Number(data.kertas1000) || 0,
          kertas2000: Number(data.kertas2000) || 0,
          kertas5000: Number(data.kertas5000) || 0,
          kertas10000: Number(data.kertas10000) || 0,
          kertas20000: Number(data.kertas20000) || 0,
          kertas50000: Number(data.kertas50000) || 0,
          kertas100000: Number(data.kertas100000) || 0,
        });
      }
    },
    (err) => {
      console.warn('Money counts sync fallback:', err);
    }
  );
};

export const saveMoneyCountsCloud = async (counts: MoneyDenomination) => {
  try {
    const moneyDocRef = doc(db, 'money_counts', 'latest');
    await setDoc(moneyDocRef, cleanFirestoreData({
      ...counts,
      updatedAt: Date.now(),
    }), { merge: true });
  } catch (err) {
    console.error('Failed to save money counts to cloud:', err);
    throw err;
  }
};

// ==========================================
// 7. RONDA SESSIONS & FINISH STATUS SYNC
// ==========================================
export const subscribeRondaSessions = (callback: (sessions: Record<string, RondaSession>) => void): Unsubscribe => {
  const colRef = collection(db, SESSIONS_COL);
  return onSnapshot(
    colRef,
    { includeMetadataChanges: true },
    (snapshot) => {
      if (snapshot.empty && snapshot.metadata.fromCache) {
        return;
      }
      const sessionsMap: Record<string, RondaSession> = {};
      snapshot.forEach((docSnap) => {
        const data = docSnap.data();
        sessionsMap[docSnap.id] = {
          tanggal: docSnap.id,
          status: data.status || 'active',
          finishedAt: data.finishedAt,
          reguId: data.reguId,
          reguNama: data.reguNama,
          petugas: data.petugas,
          totalTerkumpul: typeof data.totalTerkumpul === 'number' ? data.totalTerkumpul : 0,
          jumlahRumahScanned: typeof data.jumlahRumahScanned === 'number' ? data.jumlahRumahScanned : 0,
          catatan: data.catatan,
        };
      });
      callback(sessionsMap);
    },
    (err) => {
      console.warn('Ronda sessions sync fallback:', err);
    }
  );
};

export const saveRondaSessionCloud = async (session: RondaSession) => {
  try {
    const sessionRef = doc(db, SESSIONS_COL, session.tanggal);
    await setDoc(sessionRef, cleanFirestoreData({
      ...session,
      updatedAt: Date.now(),
    }), { merge: true });
  } catch (err) {
    console.error('Failed to save ronda session to cloud:', err);
    throw err;
  }
};

// ==========================================
// 8. PURGE DUMMY & RESET ALL (>500 Data Batch Safe)
// ==========================================
export const purgeDummyDataCloud = async () => {
  const collectionsToClear = [WARGA_COL, RECORDS_COL, MUTATIONS_COL, SESSIONS_COL];
  for (const colName of collectionsToClear) {
    const snap = await getDocs(collection(db, colName));
    if (!snap.empty) {
      await commitChunkedBatch(snap.docs, (batch, d) => batch.delete(d.ref));
    }
  }
  await setDoc(doc(db, 'money_counts', 'latest'), DEFAULT_MONEY_DENOMINATION);
  await seedCleanRegu();
};

export const resetAllCloudData = async () => {
  await purgeDummyDataCloud();
  await setDoc(doc(db, 'settings', 'current'), DEFAULT_SETTINGS);
};

export const restoreFullCloudBackup = async (backupData: {
  settings?: AppSettings;
  reguList?: ReguRonda[];
  allWarga?: Warga[];
  allRecords?: JimpitanRecord[];
  allMutations?: KasMutation[];
  moneyCounts?: MoneyDenomination;
  sessions?: RondaSession[];
}) => {
  if (backupData.settings) {
    await saveSettingsCloud(backupData.settings);
  }
  if (backupData.reguList && backupData.reguList.length > 0) {
    await saveReguListCloud(backupData.reguList);
  }
  if (backupData.allWarga && backupData.allWarga.length > 0) {
    const { cleanList } = deduplicateWargaArray(backupData.allWarga);
    await commitChunkedBatch(cleanList, (batch, w) => {
      const ref = doc(db, WARGA_COL, w.id);
      const { id, ...data } = w;
      batch.set(ref, cleanFirestoreData(data));
    });
  }
  if (backupData.allRecords && backupData.allRecords.length > 0) {
    await commitChunkedBatch(backupData.allRecords, (batch, r) => {
      const normalized = normalizeJimpitanRecordData(r, r.id);
      const ref = doc(db, RECORDS_COL, normalized.id);
      const { id, ...data } = normalized;
      batch.set(ref, cleanFirestoreData({ ...data, updatedAt: Date.now() }));
    });
  }
  if (backupData.allMutations && backupData.allMutations.length > 0) {
    await commitChunkedBatch(backupData.allMutations, (batch, m) => {
      const normalized = normalizeKasMutationData(m, m.id);
      const ref = doc(db, MUTATIONS_COL, normalized.id);
      const { id, ...data } = normalized;
      batch.set(ref, cleanFirestoreData({ ...data, updatedAt: Date.now() }));
    });
  }
  if (backupData.sessions && backupData.sessions.length > 0) {
    await commitChunkedBatch(backupData.sessions, (batch, s) => {
      const ref = doc(db, SESSIONS_COL, s.tanggal);
      batch.set(ref, cleanFirestoreData(s));
    });
  }
  if (backupData.moneyCounts) {
    await saveMoneyCountsCloud(backupData.moneyCounts);
  }
};

// ==========================================
// 6. CLOUD BACKUPS (AUTOMATIC & MANUAL, >1MB CHUNK-SAFE)
// ==========================================
const BACKUP_RECORDS_PER_DOC = 900; // ~280 KB per doc, safely under Firestore's 1 MiB limit

export const saveCloudBackup = async (backup: AppBackup): Promise<void> => {
  try {
    const allRecs = Array.isArray(backup.data?.records) ? backup.data.records : [];
    const recordChunks = chunkArray(allRecs, BACKUP_RECORDS_PER_DOC);
    const firstChunk = recordChunks[0] || [];
    const extraChunks = recordChunks.slice(1);
    const chunkPartIds = extraChunks.map((_, idx) => `${backup.id}__part_${idx + 1}`);

    const mainDocPayload: AppBackup = {
      ...backup,
      chunkPartIds: chunkPartIds.length > 0 ? chunkPartIds : undefined,
      data: {
        ...backup.data,
        records: firstChunk,
      },
    };

    await setDoc(doc(db, BACKUPS_COL, backup.id), cleanFirestoreData(mainDocPayload));

    if (extraChunks.length > 0) {
      for (let i = 0; i < extraChunks.length; i++) {
        const partId = chunkPartIds[i];
        const partDoc = {
          id: partId,
          timestamp: backup.timestamp,
          createdAtIso: backup.createdAtIso,
          source: backup.source,
          isChunk: true,
          parentBackupId: backup.id,
          partIndex: i + 1,
          stats: backup.stats,
          data: {
            records: extraChunks[i],
          },
        };
        await setDoc(doc(db, BACKUPS_COL, partId), cleanFirestoreData(partDoc));
      }
    }

    console.log(`✅ Cloud backup saved: ${backup.id} (${allRecs.length} records, ${1 + extraChunks.length} part(s))`);

    // Prune older auto-backups (keep max 10 latest auto-backups + their chunk parts)
    if (backup.source === 'auto') {
      try {
        const snap = await getDocs(collection(db, BACKUPS_COL));
        const autoBackups: { id: string; timestamp: number; chunkPartIds?: string[] }[] = [];
        const allChunkDocsByParent = new Map<string, string[]>();

        snap.forEach((d) => {
          const data = d.data();
          if (data.isChunk && data.parentBackupId) {
            const arr = allChunkDocsByParent.get(data.parentBackupId) || [];
            arr.push(d.id);
            allChunkDocsByParent.set(data.parentBackupId, arr);
            return;
          }
          if (data.source === 'auto') {
            autoBackups.push({
              id: d.id,
              timestamp: data.timestamp || 0,
              chunkPartIds: Array.isArray(data.chunkPartIds) ? data.chunkPartIds : undefined,
            });
          }
        });

        if (autoBackups.length > 10) {
          autoBackups.sort((a, b) => b.timestamp - a.timestamp);
          const toDelete = autoBackups.slice(10);
          for (const oldB of toDelete) {
            deleteDoc(doc(db, BACKUPS_COL, oldB.id)).catch(() => {});
            const partIds = new Set<string>([
              ...(oldB.chunkPartIds || []),
              ...(allChunkDocsByParent.get(oldB.id) || []),
            ]);
            partIds.forEach((pid) => {
              deleteDoc(doc(db, BACKUPS_COL, pid)).catch(() => {});
            });
          }
        }
      } catch (pruneErr) {
        console.warn('Auto-backup prune notice:', pruneErr);
      }
    }
  } catch (err) {
    console.error('Failed to save cloud backup:', err);
    throw err;
  }
};

export const triggerAutoCloudBackup = async (
  payload: {
    settings: AppSettings;
    warga: Warga[];
    records: JimpitanRecord[];
    mutations: KasMutation[];
    regu: ReguRonda[];
    moneyCounts?: MoneyDenomination;
    sessions?: Record<string, RondaSession>;
    totalKas: number;
  },
  options?: { force?: boolean }
): Promise<AppBackup | null> => {
  try {
    const lastBackupTime = Number(localStorage.getItem('jimpitan_last_auto_backup') || '0');
    const now = Date.now();
    const minIntervalMs = options?.force ? 2 * 60 * 1000 : 15 * 60 * 1000;
    if (now - lastBackupTime < minIntervalMs) {
      return null;
    }
    const today = getTodayDateIso();
    const backupId = `auto-backup-${today}-${Math.random().toString(36).substring(2, 7)}`;
    const sessionsArr = payload.sessions ? Object.values(payload.sessions) : undefined;
    const backupObj: AppBackup = {
      id: backupId,
      timestamp: now,
      createdAtIso: new Date().toISOString(),
      source: 'auto',
      stats: {
        wargaCount: payload.warga.length,
        recordsCount: payload.records.length,
        mutationsCount: payload.mutations.length,
        reguCount: payload.regu.length,
        totalKas: payload.totalKas,
      },
      data: {
        settings: payload.settings,
        warga: payload.warga,
        records: payload.records,
        mutations: payload.mutations,
        regu: payload.regu,
        moneyCounts: payload.moneyCounts,
        sessions: sessionsArr,
      },
    };
    await saveCloudBackup(backupObj);
    localStorage.setItem('jimpitan_last_auto_backup', String(now));
    return backupObj;
  } catch (err) {
    console.warn('Auto backup skipped/failed:', err);
    return null;
  }
};

export const getCloudBackups = async (): Promise<AppBackup[]> => {
  try {
    const snap = await getDocs(collection(db, BACKUPS_COL));
    const list: AppBackup[] = [];
    snap.forEach((docSnap) => {
      const data = docSnap.data() as AppBackup;
      if (data.isChunk) return;
      list.push({ ...data, id: docSnap.id });
    });
    return list.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
  } catch (err) {
    console.error('Failed to fetch cloud backups:', err);
    return [];
  }
};

export const resolveFullCloudBackup = async (backup: AppBackup): Promise<AppBackup> => {
  if (!backup.chunkPartIds || backup.chunkPartIds.length === 0) {
    return backup;
  }
  const extraRecords: JimpitanRecord[] = [];
  for (const partId of backup.chunkPartIds) {
    try {
      const partSnap = await getDoc(doc(db, BACKUPS_COL, partId));
      if (partSnap.exists()) {
        const partData = partSnap.data();
        if (Array.isArray(partData?.data?.records)) {
          extraRecords.push(...partData.data.records);
        }
      }
    } catch (err) {
      console.warn(`Failed to fetch backup chunk ${partId}:`, err);
    }
  }
  return {
    ...backup,
    data: {
      ...backup.data,
      records: [...(backup.data?.records || []), ...extraRecords],
    },
  };
};

export const deleteCloudBackup = async (backupId: string): Promise<void> => {
  try {
    const mainSnap = await getDoc(doc(db, BACKUPS_COL, backupId));
    const partIds: string[] =
      mainSnap.exists() && Array.isArray(mainSnap.data()?.chunkPartIds)
        ? mainSnap.data().chunkPartIds
        : [];
    await deleteDoc(doc(db, BACKUPS_COL, backupId));
    for (const partId of partIds) {
      await deleteDoc(doc(db, BACKUPS_COL, partId)).catch(() => {});
    }
    console.log(`🗑️ Cloud backup deleted: ${backupId}`);
  } catch (err) {
    console.error('Failed to delete cloud backup:', err);
    throw err;
  }
};

// ==========================================
// 7. MONTHLY ARCHIVES (SNAPSHOT REKAP BULANAN)
// ==========================================
export const saveMonthlyArchiveCloud = async (archive: MonthlyArchive): Promise<void> => {
  try {
    const docRef = doc(db, ARCHIVES_COL, archive.id);
    await setDoc(docRef, cleanFirestoreData(archive), { merge: true });
    console.log(`✅ Monthly archive saved to cloud: ${archive.id}`);
  } catch (err) {
    console.error('Failed to save monthly archive to cloud:', err);
    throw err;
  }
};

export const getMonthlyArchivesCloud = async (): Promise<MonthlyArchive[]> => {
  try {
    const snap = await getDocs(collection(db, ARCHIVES_COL));
    const list: MonthlyArchive[] = [];
    snap.forEach((docSnap) => {
      list.push({ id: docSnap.id, ...docSnap.data() } as MonthlyArchive);
    });
    return list.sort((a, b) => (b.yearMonth || '').localeCompare(a.yearMonth || ''));
  } catch (err) {
    console.error('Failed to fetch monthly archives:', err);
    return [];
  }
};

export const deleteMonthlyArchiveCloud = async (archiveId: string): Promise<void> => {
  try {
    await deleteDoc(doc(db, ARCHIVES_COL, archiveId));
    console.log(`🗑️ Monthly archive deleted: ${archiveId}`);
  } catch (err) {
    console.error('Failed to delete monthly archive:', err);
    throw err;
  }
};

// ==========================================
// REAL-TIME USER PRESENCE TRACKING & PERSISTENT DEVICE ID
// ==========================================
const PRESENCE_COL = 'active_presences';
const DESIGNATED_OFFICERS_COL = 'designated_officers';
const DEVICE_ID_STORAGE_KEY = 'jimpitan_device_id_v1';

export const getPersistentDeviceId = (): string => {
  try {
    let existing = localStorage.getItem(DEVICE_ID_STORAGE_KEY);
    if (existing && /^DEV-[A-Z0-9]{6,}$/.test(existing.trim().toUpperCase())) {
      return existing.trim().toUpperCase();
    }
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let code = 'DEV-';
    for (let i = 0; i < 6; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    localStorage.setItem(DEVICE_ID_STORAGE_KEY, code);
    return code;
  } catch {
    return 'DEV-' + Math.random().toString(36).substring(2, 8).toUpperCase();
  }
};

// Get or generate stable session ID for this browser tab session
export const getSessionId = (): string => {
  try {
    let sId = sessionStorage.getItem('jimpitan_pwa_session_id');
    if (!sId) {
      sId = 'sess_' + Math.random().toString(36).substring(2, 9) + '_' + Date.now().toString(36);
      sessionStorage.setItem('jimpitan_pwa_session_id', sId);
    }
    return sId;
  } catch {
    return 'sess_' + Math.random().toString(36).substring(2, 9);
  }
};

// Send heartbeat to Cloud Firestore
export const sendPresenceHeartbeat = async (mode: AppMode, label?: string) => {
  try {
    const sId = getSessionId();
    const deviceId = getPersistentDeviceId();
    const presenceRef = doc(db, PRESENCE_COL, sId);
    const isMobile = typeof navigator !== 'undefined' && /Android|iPhone|iPad|iPod|webOS/i.test(navigator.userAgent);
    const data: UserPresence = {
      id: sId,
      deviceId,
      mode,
      label: label || (mode === 'warga' ? 'Warga (Akses Publik)' : mode === 'petugas' ? 'Petugas Ronda' : 'Penginput Data'),
      device: isMobile ? 'HP / Mobile' : 'PC / Desktop',
      lastSeen: Date.now(),
    };
    await setDoc(presenceRef, cleanFirestoreData(data), { merge: true });
  } catch (e) {
    console.warn('Presence heartbeat error:', e);
  }
};

// Remove presence on leave/close
export const removePresenceSession = async () => {
  try {
    const sId = getSessionId();
    const presenceRef = doc(db, PRESENCE_COL, sId);
    await deleteDoc(presenceRef);
  } catch {
    // Ignore on exit
  }
};

// Real-time listener for active presences
export const subscribeToActivePresences = (callback: (presences: UserPresence[]) => void): Unsubscribe => {
  const presenceColRef = collection(db, PRESENCE_COL);
  return onSnapshot(
    presenceColRef,
    (snap) => {
      const now = Date.now();
      const cutoff = now - 90 * 1000; // active in last 90 seconds
      const activeList: UserPresence[] = [];
      snap.forEach((docSnap) => {
        const item = { id: docSnap.id, ...docSnap.data() } as UserPresence;
        if (item.lastSeen && item.lastSeen > cutoff) {
          activeList.push(item);
        }
      });
      callback(activeList);
    },
    (err) => {
      console.warn('Active presences subscription error:', err);
    }
  );
};

// ==========================================
// DESIGNATED OFFICER DEVICE ACCESS (PIN-LESS GRANT & ADMIN-ONLY REVOKE)
// ==========================================
export const subscribeDesignatedOfficers = (
  callback: (list: DesignatedOfficerDevice[], isFromCache: boolean) => void
): Unsubscribe => {
  const colRef = collection(db, DESIGNATED_OFFICERS_COL);
  return onSnapshot(
    colRef,
    { includeMetadataChanges: true },
    (snap) => {
      const list: DesignatedOfficerDevice[] = [];
      snap.forEach((docSnap) => {
        const raw = docSnap.data() as Partial<DesignatedOfficerDevice>;
        if (!raw || !raw.officerName) return;
        list.push({
          id: docSnap.id,
          token: String(raw.token || docSnap.id),
          officerName: String(raw.officerName),
          nomorRumah: raw.nomorRumah ? String(raw.nomorRumah) : undefined,
          reguNama: raw.reguNama ? String(raw.reguNama) : undefined,
          status:
            raw.status === 'active' || raw.status === 'revoked' || raw.status === 'pending'
              ? raw.status
              : 'pending',
          deviceId: raw.deviceId ? String(raw.deviceId).trim().toUpperCase() : undefined,
          deviceLabel: raw.deviceLabel ? String(raw.deviceLabel) : undefined,
          createdAt: Number(raw.createdAt) || Date.now(),
          activatedAt: raw.activatedAt ? Number(raw.activatedAt) : undefined,
          revokedAt: raw.revokedAt ? Number(raw.revokedAt) : undefined,
          updatedAt: raw.updatedAt ? Number(raw.updatedAt) : undefined,
          createdByEmail: raw.createdByEmail ? String(raw.createdByEmail) : undefined,
        });
      });
      list.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
      callback(list, snap.metadata.fromCache);
    },
    (err) => {
      console.warn('Designated officers subscription error:', err);
    }
  );
};

export const createDesignatedOfficerGrant = async (payload: {
  officerName: string;
  nomorRumah?: string;
  reguNama?: string;
  deviceId?: string;
  deviceLabel?: string;
  createdByEmail?: string;
}): Promise<DesignatedOfficerDevice> => {
  const now = Date.now();
  const safeName = payload.officerName.trim().slice(0, 120);
  if (!safeName) {
    throw new Error('Nama petugas wajib diisi.');
  }
  const cleanDeviceId = payload.deviceId ? payload.deviceId.trim().toUpperCase() : undefined;
  const randomSuffix = Math.random().toString(36).substring(2, 8).toUpperCase();
  const id = `off_${now}_${randomSuffix}`;
  const token = `PTG-${now.toString(36).toUpperCase()}-${randomSuffix}`;

  const docData: DesignatedOfficerDevice = {
    id,
    token,
    officerName: safeName,
    nomorRumah: payload.nomorRumah?.trim() || undefined,
    reguNama: payload.reguNama?.trim() || undefined,
    status: cleanDeviceId ? 'active' : 'pending',
    deviceId: cleanDeviceId,
    deviceLabel: payload.deviceLabel?.trim() || (cleanDeviceId ? 'Perangkat Terdaftar' : undefined),
    createdAt: now,
    activatedAt: cleanDeviceId ? now : undefined,
    updatedAt: now,
    createdByEmail: payload.createdByEmail?.trim().toLowerCase() || undefined,
  };

  await setDoc(doc(db, DESIGNATED_OFFICERS_COL, id), cleanFirestoreData(docData));
  return docData;
};

export const claimOfficerActivationToken = async (
  rawToken: string,
  myDeviceId: string
): Promise<{ ok: true; grant: DesignatedOfficerDevice } | { ok: false; message: string }> => {
  const token = (rawToken || '').trim();
  const cleanDeviceId = (myDeviceId || '').trim().toUpperCase();
  if (!token || !cleanDeviceId) {
    return { ok: false, message: 'Token aktivasi petugas tidak valid.' };
  }

  try {
    const q = query(collection(db, DESIGNATED_OFFICERS_COL), where('token', '==', token));
    let snap;
    try {
      snap = await getDocsFromServer(q);
    } catch {
      snap = await getDocs(q);
    }

    if (snap.empty) {
      return {
        ok: false,
        message: 'Link akses petugas tidak ditemukan atau sudah dihapus oleh Admin RT.',
      };
    }

    const docSnap = snap.docs[0];
    const grant = { id: docSnap.id, ...(docSnap.data() as Omit<DesignatedOfficerDevice, 'id'>) };

    if (grant.status === 'revoked') {
      return {
        ok: false,
        message: `Akses petugas untuk "${grant.officerName}" telah dinonaktifkan oleh Admin RT.`,
      };
    }

    if (grant.status === 'active') {
      const boundId = (grant.deviceId || '').trim().toUpperCase();
      if (boundId && boundId !== cleanDeviceId) {
        return {
          ok: false,
          message:
            'Link akses petugas ini sudah dipakai di perangkat HP lain. Hubungi Admin RT untuk membuat akses baru.',
        };
      }
      return { ok: true, grant };
    }

    // status === 'pending' -> Bind strictly to this deviceId
    const isMobile = typeof navigator !== 'undefined' && /Android|iPhone|iPad|iPod|webOS/i.test(navigator.userAgent);
    const now = Date.now();
    const updatedGrant: DesignatedOfficerDevice = {
      ...grant,
      status: 'active',
      deviceId: cleanDeviceId,
      deviceLabel: isMobile ? 'HP / Mobile' : 'PC / Desktop',
      activatedAt: now,
      updatedAt: now,
    };

    await setDoc(doc(db, DESIGNATED_OFFICERS_COL, docSnap.id), cleanFirestoreData(updatedGrant), { merge: true });
    return { ok: true, grant: updatedGrant };
  } catch (err: any) {
    console.error('Claim officer token failed:', err);
    return {
      ok: false,
      message: 'Gagal memverifikasi akses petugas ke server. Periksa koneksi internet Anda.',
    };
  }
};

export const updateDesignatedOfficerStatusCloud = async (
  id: string,
  status: 'active' | 'revoked'
): Promise<void> => {
  const now = Date.now();
  const patch: Record<string, any> = {
    status,
    updatedAt: now,
  };
  if (status === 'revoked') {
    patch.revokedAt = now;
  } else {
    patch.activatedAt = now;
  }
  await setDoc(doc(db, DESIGNATED_OFFICERS_COL, id), cleanFirestoreData(patch), { merge: true });
};

export const deleteDesignatedOfficerCloud = async (id: string): Promise<void> => {
  await deleteDoc(doc(db, DESIGNATED_OFFICERS_COL, id));
};

