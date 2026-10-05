import { initializeApp, getApps, getApp } from 'firebase/app';
import { 
  getFirestore, 
  initializeFirestore,
  persistentLocalCache,
  persistentMultipleTabManager,
  collection, 
  doc, 
  setDoc, 
  getDocs, 
  deleteDoc, 
  onSnapshot, 
  writeBatch,
  getDoc,
  Firestore,
  Unsubscribe
} from 'firebase/firestore';
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
  MonthlyArchive
} from '../types';
import { DEFAULT_SETTINGS, DEFAULT_REGU, DEFAULT_WARGA, DEFAULT_MUTATIONS } from '../data/defaultData';
import { deduplicateWargaArray } from '../utils/wargaDeduplicator';

// Initialize Firebase App instance
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();

// Initialize Firestore with offline persistence and specific database ID
export const initFirestoreInstance = (): Firestore => {
  try {
    return initializeFirestore(app, {
      localCache: persistentLocalCache({
        tabManager: persistentMultipleTabManager(),
      }),
    }, firebaseConfig.firestoreDatabaseId || undefined);
  } catch {
    return firebaseConfig.firestoreDatabaseId 
      ? getFirestore(app, firebaseConfig.firestoreDatabaseId)
      : getFirestore(app);
  }
};

export const db: Firestore = initFirestoreInstance();

// Test connection on boot gracefully with local cache fallback
export const testFirestoreConnection = async (): Promise<boolean> => {
  try {
    await getDoc(doc(db, 'test', 'connection'));
    return true;
  } catch (err: any) {
    if (err?.message?.includes('the client is offline') || err?.code === 'unavailable') {
      console.warn('ℹ️ Firestore operating in offline cache mode (will auto-sync when online)');
    } else {
      console.log('ℹ️ Firestore status checked');
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

// Helper to recursively remove undefined fields so Firestore setDoc/updateDoc never fails
export const cleanFirestoreData = <T extends Record<string, any>>(obj: T): T => {
  const result: any = {};
  for (const key of Object.keys(obj)) {
    const val = obj[key];
    if (val !== undefined) {
      if (val !== null && typeof val === 'object' && !Array.isArray(val) && !(val instanceof Date)) {
        result[key] = cleanFirestoreData(val);
      } else {
        result[key] = val;
      }
    }
  }
  return result;
};

// ==========================================
// 1. SETTINGS SYNC
// ==========================================
export const subscribeSettings = (callback: (settings: AppSettings) => void): Unsubscribe => {
  const settingsDocRef = doc(db, 'settings', 'current');
  return onSnapshot(settingsDocRef, (snap) => {
    if (snap.exists()) {
      const data = snap.data() as AppSettings;
      callback({
        ...DEFAULT_SETTINGS,
        ...data,
        saldoAwalKas: data.saldoAwalKas !== undefined ? Number(data.saldoAwalKas) : 0,
      });
    } else {
      setDoc(settingsDocRef, cleanFirestoreData(DEFAULT_SETTINGS)).catch(console.error);
      callback(DEFAULT_SETTINGS);
    }
  }, (err) => {
    console.warn('Settings sync fallback:', err);
  });
};

export const saveSettingsCloud = async (settings: AppSettings) => {
  try {
    const settingsDocRef = doc(db, 'settings', 'current');
    await setDoc(settingsDocRef, cleanFirestoreData(settings), { merge: true });
  } catch (err) {
    console.error('Failed to save settings to cloud:', err);
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
  return onSnapshot(colRef, (snapshot) => {
    if (snapshot.empty) {
      callback([]);
    } else {
      const list: Warga[] = [];
      snapshot.forEach((docSnap) => {
        list.push({ id: docSnap.id, ...docSnap.data() } as Warga);
      });
      // Deduplicate to guarantee no duplicate warga ever exists
      const { cleanList, duplicateIds } = deduplicateWargaArray(list);

      // Auto-prune duplicate documents from Firestore in the background if found
      if (duplicateIds.length > 0) {
        console.warn(`🧹 Auto-cleaning ${duplicateIds.length} duplicate warga documents from Firestore.`);
        const batch = writeBatch(db);
        duplicateIds.forEach((dupId) => {
          batch.delete(doc(db, WARGA_COL, dupId));
        });
        batch.commit().catch((err) => console.warn('Duplicate auto-clean error:', err));
      }

      callback(cleanList);
    }
  }, (err) => {
    console.warn('Warga sync fallback:', err);
  });
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

export const saveWargaCloud = async (warga: Warga) => {
  try {
    const wargaRef = doc(db, WARGA_COL, warga.id);
    const { id, ...data } = warga;
    await setDoc(wargaRef, cleanFirestoreData(data), { merge: true });
  } catch (err) {
    console.error('Failed to save warga to cloud:', err);
  }
};

export const saveBatchWargaCloud = async (wargaList: Warga[]) => {
  if (!wargaList || wargaList.length === 0) return;
  try {
    await commitChunkedBatch(wargaList, (batch, w) => {
      const wargaRef = doc(db, WARGA_COL, w.id);
      const { id, ...data } = w;
      batch.set(wargaRef, cleanFirestoreData(data), { merge: true });
    });
  } catch (err) {
    console.error('Failed to batch save warga to cloud:', err);
  }
};

export const deleteWargaCloud = async (wargaId: string) => {
  try {
    const wargaRef = doc(db, WARGA_COL, wargaId);
    await deleteDoc(wargaRef);
  } catch (err) {
    console.error('Failed to delete warga from cloud:', err);
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

export const subscribeJimpitanRecords = (callback: (records: JimpitanRecord[]) => void): Unsubscribe => {
  const colRef = collection(db, RECORDS_COL);
  return onSnapshot(colRef, (snapshot) => {
    if (snapshot.empty) {
      callback([]);
    } else {
      const list: JimpitanRecord[] = [];
      snapshot.forEach((docSnap) => {
        const d = docSnap.data();
        list.push({ 
          id: docSnap.id, 
          tanggal: d.tanggal || '',
          waktu: d.waktu || '',
          wargaId: d.wargaId || '',
          nomorRumah: d.nomorRumah || '',
          namaWarga: d.namaWarga || '',
          nominal: typeof d.nominal === 'number' ? d.nominal : Number(d.nominal) || 0,
          status: d.status || 'sukses',
          petugas: d.petugas || '',
          reguId: d.reguId || '',
          reguNama: d.reguNama || '',
          catatan: d.catatan || undefined,
          createdAt: typeof d.createdAt === 'number' ? d.createdAt : Date.now(),
        } as JimpitanRecord);
      });
      list.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
      callback(list);
    }
  }, (err) => {
    console.warn('Records sync fallback:', err);
  });
};

export const addJimpitanRecordCloud = async (record: JimpitanRecord) => {
  try {
    const recRef = doc(db, RECORDS_COL, record.id);
    const { id, ...data } = record;
    await setDoc(recRef, cleanFirestoreData({
      ...data,
      nominal: Number(data.nominal) || 0,
      updatedAt: Date.now(),
    }));
  } catch (err) {
    console.error('Failed to add jimpitan record to cloud:', err);
  }
};

export const addBatchJimpitanRecordsCloud = async (records: JimpitanRecord[]) => {
  if (!records || records.length === 0) return;
  try {
    await commitChunkedBatch(records, (batch, record) => {
      const recRef = doc(db, RECORDS_COL, record.id);
      const { id, ...data } = record;
      batch.set(
        recRef,
        cleanFirestoreData({
          ...data,
          nominal: Number(data.nominal) || 0,
          updatedAt: Date.now(),
        }),
        { merge: true }
      );
    });
  } catch (err) {
    console.error('Failed to batch save jimpitan records to cloud:', err);
  }
};

export const deleteJimpitanRecordCloud = async (recordId: string) => {
  try {
    const recRef = doc(db, RECORDS_COL, recordId);
    await deleteDoc(recRef);
  } catch (err) {
    console.error('Failed to delete jimpitan record from cloud:', err);
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
      const mutRef = doc(db, MUTATIONS_COL, m.id);
      const { id, ...data } = m;
      batch.set(
        mutRef,
        cleanFirestoreData({
          ...data,
          nominal: Number(data.nominal) || 0,
          createdAt: data.createdAt || Date.now(),
          updatedAt: Date.now(),
        }),
        { merge: true }
      );
    });
    console.log('✅ Kas mutations seeded to Firestore');
  } catch (err) {
    console.error('Failed to seed kas mutations:', err);
  }
};

export const subscribeKasMutations = (callback: (mutations: KasMutation[]) => void): Unsubscribe => {
  const colRef = collection(db, MUTATIONS_COL);
  return onSnapshot(colRef, (snapshot) => {
    if (snapshot.empty) {
      // Check if localStorage has existing mutations before declaring empty
      let localList: KasMutation[] = [];
      try {
        const saved = localStorage.getItem('jimpitan_rt_kas_mutations');
        if (saved) localList = JSON.parse(saved);
      } catch (e) {
        console.warn('Failed to parse local mutations during empty snapshot', e);
      }

      if (Array.isArray(localList) && localList.length > 0) {
        console.log(`📦 Found ${localList.length} local kas mutations. Syncing to empty cloud collection...`);
        seedCleanMutations(localList).then(() => {
          callback(localList);
        });
      } else {
        callback([]);
      }
    } else {
      const list: KasMutation[] = [];
      snapshot.forEach((docSnap) => {
        const d = docSnap.data();
        list.push({ 
          id: docSnap.id, 
          tanggal: d.tanggal || '',
          jenis: d.jenis || 'keluar',
          nominal: typeof d.nominal === 'number' ? d.nominal : Number(d.nominal) || 0,
          kategori: d.kategori || 'Umum',
          keterangan: d.keterangan || '',
          petugas: d.petugas || undefined,
          createdAt: typeof d.createdAt === 'number' ? d.createdAt : Date.now(),
        } as KasMutation);
      });
      list.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
      callback(list);
    }
  }, (err) => {
    console.warn('Kas mutations sync fallback:', err);
  });
};

export const addKasMutationCloud = async (mutation: KasMutation) => {
  try {
    const mutRef = doc(db, MUTATIONS_COL, mutation.id);
    const { id, ...data } = mutation;
    await setDoc(mutRef, cleanFirestoreData({
      ...data,
      nominal: Number(data.nominal) || 0,
      createdAt: data.createdAt || Date.now(),
      updatedAt: Date.now(),
    }), { merge: true });
    console.log(`✅ Kas mutation synchronized to cloud: ${mutation.id} (${mutation.keterangan})`);
  } catch (err) {
    console.error('Failed to add kas mutation to cloud:', err);
    throw err;
  }
};

export const deleteKasMutationCloud = async (mutationId: string) => {
  try {
    const mutRef = doc(db, MUTATIONS_COL, mutationId);
    await deleteDoc(mutRef);
    console.log(`🗑️ Kas mutation deleted from cloud: ${mutationId}`);
  } catch (err) {
    console.error('Failed to delete kas mutation from cloud:', err);
    throw err;
  }
};

// ==========================================
// 5. REGU RONDA SYNC (Real-time)
// ==========================================
export const subscribeReguList = (callback: (reguList: ReguRonda[]) => void): Unsubscribe => {
  const colRef = collection(db, REGU_COL);
  return onSnapshot(colRef, (snapshot) => {
    if (snapshot.empty) {
      seedCleanRegu().catch(console.error);
      callback(DEFAULT_REGU);
    } else {
      const list: ReguRonda[] = [];
      snapshot.forEach((docSnap) => {
        list.push({ id: docSnap.id, ...docSnap.data() } as ReguRonda);
      });
      callback(list);
    }
  }, (err) => {
    console.warn('Regu list sync fallback:', err);
  });
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
      batch.set(ref, cleanFirestoreData(data), { merge: true });
    });

    await batch.commit();
  } catch (err) {
    console.error('Failed to save regu list to cloud:', err);
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
  return onSnapshot(moneyDocRef, (snap) => {
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
  }, (err) => {
    console.warn('Money counts sync fallback:', err);
  });
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
  }
};

// ==========================================
// 7. RONDA SESSIONS & FINISH STATUS SYNC
// ==========================================
export const subscribeRondaSessions = (callback: (sessions: Record<string, RondaSession>) => void): Unsubscribe => {
  const colRef = collection(db, SESSIONS_COL);
  return onSnapshot(colRef, (snapshot) => {
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
  }, (err) => {
    console.warn('Ronda sessions sync fallback:', err);
  });
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
  }
};

// ==========================================
// 8. PURGE DUMMY & RESET ALL & DELETE SEPTEMBER DATA (>500 Data Batch Safe)
// ==========================================
export const deleteMonthDataCloud = async (monthQuery: string = '09') => {
  try {
    let deletedRecCount = 0;
    let deletedMutCount = 0;
    let deletedSessCount = 0;

    // Helper to check if a date string belongs to the target month (e.g. '09' for September)
    const isTargetMonth = (dateStr?: string) => {
      if (!dateStr) return false;
      return (
        dateStr.includes(`-${monthQuery}-`) ||
        dateStr.startsWith(`2026-${monthQuery}`) ||
        dateStr.startsWith(`2025-${monthQuery}`) ||
        dateStr.startsWith(`2024-${monthQuery}`)
      );
    };

    // 1. Delete matching jimpitan records from Firestore using safe chunked batches
    try {
      const recSnap = await getDocs(collection(db, RECORDS_COL));
      const docsToDelete: { ref: any }[] = [];
      recSnap.forEach((docSnap) => {
        const d = docSnap.data();
        if (isTargetMonth(d.tanggal)) {
          docsToDelete.push({ ref: docSnap.ref });
        }
      });
      deletedRecCount = docsToDelete.length;
      if (deletedRecCount > 0) {
        await commitChunkedBatch(docsToDelete, (batch, item) => {
          batch.delete(item.ref);
        });
        console.log(`✅ Deleted ${deletedRecCount} jimpitan records for month ${monthQuery}`);
      }
    } catch (err) {
      console.warn('Failed to batch delete records from cloud:', err);
    }

    // 2. Delete matching kas mutations from Firestore
    try {
      const mutSnap = await getDocs(collection(db, MUTATIONS_COL));
      const mutDocsToDelete: { ref: any }[] = [];
      mutSnap.forEach((docSnap) => {
        const d = docSnap.data();
        if (isTargetMonth(d.tanggal)) {
          mutDocsToDelete.push({ ref: docSnap.ref });
        }
      });
      deletedMutCount = mutDocsToDelete.length;
      if (deletedMutCount > 0) {
        await commitChunkedBatch(mutDocsToDelete, (batch, item) => {
          batch.delete(item.ref);
        });
        console.log(`✅ Deleted ${deletedMutCount} kas mutations for month ${monthQuery}`);
      }
    } catch (err) {
      console.warn('Failed to batch delete mutations from cloud:', err);
    }

    // 3. Delete matching ronda sessions from Firestore
    try {
      const sessSnap = await getDocs(collection(db, SESSIONS_COL));
      const sessDocsToDelete: { ref: any }[] = [];
      sessSnap.forEach((docSnap) => {
        if (isTargetMonth(docSnap.id) || isTargetMonth(docSnap.data().tanggal)) {
          sessDocsToDelete.push({ ref: docSnap.ref });
        }
      });
      deletedSessCount = sessDocsToDelete.length;
      if (deletedSessCount > 0) {
        await commitChunkedBatch(sessDocsToDelete, (batch, item) => {
          batch.delete(item.ref);
        });
        console.log(`✅ Deleted ${deletedSessCount} ronda sessions for month ${monthQuery}`);
      }
    } catch (err) {
      console.warn('Failed to batch delete sessions from cloud:', err);
    }

    // 4. Clean local storage cache
    try {
      const rawRec = localStorage.getItem('jimpitan_records_v1');
      if (rawRec) {
        const parsed = JSON.parse(rawRec);
        const filtered = parsed.filter((r: any) => !isTargetMonth(r.tanggal));
        localStorage.setItem('jimpitan_records_v1', JSON.stringify(filtered));
      }
      const rawMut = localStorage.getItem('jimpitan_mutations_v1');
      if (rawMut) {
        const parsed = JSON.parse(rawMut);
        const filtered = parsed.filter((m: any) => !isTargetMonth(m.tanggal));
        localStorage.setItem('jimpitan_mutations_v1', JSON.stringify(filtered));
      }
      const rawSess = localStorage.getItem('jimpitan_sessions_v1');
      if (rawSess) {
        const parsed = JSON.parse(rawSess);
        const newSess: Record<string, any> = {};
        for (const k in parsed) {
          if (!isTargetMonth(k)) {
            newSess[k] = parsed[k];
          }
        }
        localStorage.setItem('jimpitan_sessions_v1', JSON.stringify(newSess));
      }
    } catch (e) {
      console.warn('Error clearing local month storage cache:', e);
    }

    return { success: true, deletedRecCount, deletedMutCount, deletedSessCount };
  } catch (err) {
    console.error('Failed to delete month data:', err);
    throw err;
  }
};

export const deleteSeptemberDataCloud = async () => {
  return deleteMonthDataCloud('09');
};

export const purgeArchiveAndDemoDataCloud = async () => {
  let deletedRecCount = 0;
  let deletedMutCount = 0;
  let deletedSessCount = 0;
  let deletedDemoWargaCount = 0;

  // 1. Delete all jimpitan records safely with chunked batching
  try {
    const recSnap = await getDocs(collection(db, RECORDS_COL));
    const docs = recSnap.docs;
    deletedRecCount = docs.length;
    if (deletedRecCount > 0) {
      await commitChunkedBatch(docs, (batch, d) => batch.delete(d.ref));
    }
  } catch (e) {
    console.warn('Records purge error:', e);
  }

  // 2. Delete all kas mutations safely with chunked batching
  try {
    const mutSnap = await getDocs(collection(db, MUTATIONS_COL));
    const docs = mutSnap.docs;
    deletedMutCount = docs.length;
    if (deletedMutCount > 0) {
      await commitChunkedBatch(docs, (batch, d) => batch.delete(d.ref));
    }
  } catch (e) {
    console.warn('Mutations purge error:', e);
  }

  // 3. Delete all ronda sessions
  try {
    const sessSnap = await getDocs(collection(db, SESSIONS_COL));
    const docs = sessSnap.docs;
    deletedSessCount = docs.length;
    if (deletedSessCount > 0) {
      await commitChunkedBatch(docs, (batch, d) => batch.delete(d.ref));
    }
  } catch (e) {
    console.warn('Sessions purge error:', e);
  }

  // 4. Delete demo / sample warga
  try {
    const wargaSnap = await getDocs(collection(db, WARGA_COL));
    const demoWargaIds = ['warga-01', 'warga-02', 'warga-03'];
    const demoDocs = wargaSnap.docs.filter((d) => {
      const data = d.data();
      return (
        demoWargaIds.includes(d.id) ||
        (data.nama && (data.nama.includes('Slamet Riyadi') || data.nama.includes('Joko Purnomo') || data.nama.includes('Siti Aminah')))
      );
    });
    deletedDemoWargaCount = demoDocs.length;
    if (deletedDemoWargaCount > 0) {
      await commitChunkedBatch(demoDocs, (batch, d) => batch.delete(d.ref));
    }
  } catch (e) {
    console.warn('Demo warga purge error:', e);
  }

  // 5. Reset physical money counts
  try {
    await setDoc(doc(db, 'money_counts', 'latest'), DEFAULT_MONEY_DENOMINATION);
  } catch (e) {
    console.warn('Money counts reset error:', e);
  }

  // 6. Clear local storage caches
  try {
    localStorage.setItem('jimpitan_records_v1', '[]');
    localStorage.setItem('jimpitan_mutations_v1', '[]');
    localStorage.setItem('jimpitan_sessions_v1', '{}');
    localStorage.setItem('jimpitan_money_v1', JSON.stringify(DEFAULT_MONEY_DENOMINATION));
  } catch (e) {
    console.warn('Local storage clear error:', e);
  }

  return { deletedRecCount, deletedMutCount, deletedSessCount, deletedDemoWargaCount };
};

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
      const ref = doc(db, RECORDS_COL, r.id);
      const { id, ...data } = r;
      batch.set(ref, cleanFirestoreData(data));
    });
  }
  if (backupData.allMutations && backupData.allMutations.length > 0) {
    await commitChunkedBatch(backupData.allMutations, (batch, m) => {
      const ref = doc(db, MUTATIONS_COL, m.id);
      const { id, ...data } = m;
      batch.set(ref, cleanFirestoreData(data));
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
// 6. CLOUD BACKUPS (AUTOMATIC & MANUAL)
// ==========================================
export const saveCloudBackup = async (backup: AppBackup): Promise<void> => {
  try {
    const docRef = doc(db, BACKUPS_COL, backup.id);
    await setDoc(docRef, cleanFirestoreData(backup));
    console.log(`✅ Cloud backup saved: ${backup.id}`);

    // Prune older auto-backups (keep max 15 latest auto-backups to maintain lean database)
    if (backup.source === 'auto') {
      try {
        const snap = await getDocs(collection(db, BACKUPS_COL));
        const autoBackups: { id: string; timestamp: number }[] = [];
        snap.forEach((d) => {
          const data = d.data();
          if (data.source === 'auto') {
            autoBackups.push({ id: d.id, timestamp: data.timestamp || 0 });
          }
        });
        if (autoBackups.length > 15) {
          autoBackups.sort((a, b) => b.timestamp - a.timestamp);
          const toDelete = autoBackups.slice(15);
          for (const oldB of toDelete) {
            deleteDoc(doc(db, BACKUPS_COL, oldB.id)).catch(() => {});
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

export const triggerAutoCloudBackup = async (payload: {
  settings: AppSettings;
  warga: Warga[];
  records: JimpitanRecord[];
  mutations: KasMutation[];
  regu: ReguRonda[];
  moneyCounts?: MoneyDenomination;
  sessions?: Record<string, RondaSession>;
  totalKas: number;
}): Promise<AppBackup | null> => {
  try {
    const lastBackupTime = Number(localStorage.getItem('jimpitan_last_auto_backup') || '0');
    const now = Date.now();
    // Throttle auto-backups to once per 15 minutes unless it's the very first time
    if (now - lastBackupTime < 15 * 60 * 1000) {
      return null;
    }
    const today = new Date().toISOString().slice(0, 10);
    const backupId = `auto-backup-${today}-${Math.random().toString(36).substring(2, 7)}`;
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
      list.push({ id: docSnap.id, ...docSnap.data() } as AppBackup);
    });
    return list.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
  } catch (err) {
    console.error('Failed to fetch cloud backups:', err);
    return [];
  }
};

export const deleteCloudBackup = async (backupId: string): Promise<void> => {
  try {
    await deleteDoc(doc(db, BACKUPS_COL, backupId));
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
// REAL-TIME USER PRESENCE TRACKING
// ==========================================
const PRESENCE_COL = 'active_presences';

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
    const presenceRef = doc(db, PRESENCE_COL, sId);
    const isMobile = typeof navigator !== 'undefined' && /Android|iPhone|iPad|iPod|webOS/i.test(navigator.userAgent);
    const data: UserPresence = {
      id: sId,
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
