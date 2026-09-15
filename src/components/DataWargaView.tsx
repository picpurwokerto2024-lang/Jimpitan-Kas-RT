import React, { useState, useEffect, useMemo } from 'react';
import { 
  Users, 
  Plus, 
  Search, 
  QrCode, 
  Printer, 
  Edit3, 
  Trash2, 
  Phone, 
  Check, 
  X, 
  Download,
  Share2,
  ExternalLink,
  CalendarDays,
  History,
  CheckCircle2,
  Lock,
  Unlock,
  KeyRound,
  ShieldCheck,
  AlertCircle,
  Eye,
  EyeOff,
  Award,
  Sparkles,
  FileText,
  Table as TableIcon
} from 'lucide-react';
import QRCode from 'qrcode';
import { Warga, AppSettings, JimpitanRecord, AppMode, KasMutation } from '../types';
import { formatRupiah } from '../utils/formatters';
import { WargaDetailHistoryModal } from './WargaDetailHistoryModal';
import { LaporanBulananWargaView } from './LaporanBulananWargaView';
import { InputJimpitanMingguanModal } from './InputJimpitanMingguanModal';
import { checkWargaDuplicate } from '../utils/wargaDeduplicator';

interface DataWargaViewProps {
  wargaList: Warga[];
  onAddWarga: (warga: Omit<Warga, 'id' | 'qrCodeData'>) => void;
  onUpdateWarga: (warga: Warga) => void;
  onDeleteWarga: (id: string) => void;
  onDeduplicateWarga?: () => void;
  settings: AppSettings;
  allRecords?: JimpitanRecord[];
  kasMutations?: KasMutation[];
  onAddMutation?: (mut: Omit<KasMutation, 'id' | 'createdAt'>) => Promise<void>;
  onSaveBatchRecords?: (records: Omit<JimpitanRecord, 'id' | 'createdAt'>[]) => Promise<void>;
  selectedDate?: string;
  isAdminUnlocked?: boolean;
  onUnlockAdmin?: (pin: string) => boolean;
  onLockApp?: () => void;
  appMode?: AppMode;
  currentPetugas?: string;
  currentReguNama?: string;
  currentReguId?: string;
}

export const DataWargaView: React.FC<DataWargaViewProps> = ({
  wargaList = [],
  onAddWarga,
  onUpdateWarga,
  onDeleteWarga,
  onDeduplicateWarga,
  settings,
  allRecords = [],
  kasMutations = [],
  onAddMutation,
  onSaveBatchRecords,
  selectedDate = new Date().toISOString().split('T')[0],
  isAdminUnlocked = false,
  onUnlockAdmin,
  onLockApp,
  appMode = 'warga',
  currentPetugas = 'Petugas Ronda',
  currentReguNama = 'Regu Ronda',
  currentReguId = 'regu-1',
}) => {
  const [search, setSearch] = useState<string>('');
  const [activeSubTab, setActiveSubTab] = useState<'directory' | 'monthly_report'>('directory');
  const [isAddModalOpen, setIsAddModalOpen] = useState<boolean>(false);
  const [editingWarga, setEditingWarga] = useState<Warga | null>(null);
  const [isWeeklyInputOpen, setIsWeeklyInputOpen] = useState<boolean>(false);
  const [selectedWargaForWeekly, setSelectedWargaForWeekly] = useState<Warga | null>(null);

  // History Modal State
  const [selectedWargaForHistory, setSelectedWargaForHistory] = useState<Warga | null>(null);

  // Admin PIN Protection State for Add/Edit/Delete
  const [isPinModalOpen, setIsPinModalOpen] = useState<boolean>(false);
  const [pinInput, setPinInput] = useState<string>('');
  const [pinError, setPinError] = useState<string>('');
  const [showPin, setShowPin] = useState<boolean>(false);
  const [pendingAction, setPendingAction] = useState<
    | { type: 'add' }
    | { type: 'edit'; warga: Warga }
    | { type: 'delete'; warga: Warga }
    | { type: 'monthly_report' }
    | null
  >(null);

  // Form State for Add / Edit
  const [nomorRumah, setNomorRumah] = useState<string>('');
  const [nama, setNama] = useState<string>('');
  const [blok, setBlok] = useState<string>('Blok A');
  const [alamat, setAlamat] = useState<string>('');
  const [nomorHp, setNomorHp] = useState<string>('');
  const [nominalDefault, setNominalDefault] = useState<number>(settings.defaultNominal || 1000);

  // Print Card Modal State
  const [selectedWargaForQr, setSelectedWargaForQr] = useState<Warga | null>(null);
  const [isBatchPrintOpen, setIsBatchPrintOpen] = useState<boolean>(false);
  const [qrDataUrl, setQrDataUrl] = useState<string>('');
  const [batchQrUrls, setBatchQrUrls] = useState<Record<string, string>>({});

  // Current year-month prefix
  const currentYearMonth = selectedDate ? selectedDate.substring(0, 7) : '';

  // Calculate days in current selected month
  const currentDaysInMonth = useMemo(() => {
    if (!currentYearMonth) return 30;
    const [y, m] = currentYearMonth.split('-').map(Number);
    return new Date(y, m, 0).getDate();
  }, [currentYearMonth]);

  // Quick lookup map: resident total paid this month & today status
  const residentMonthlyStatsMap = useMemo(() => {
    const map = new Map<string, { totalThisMonth: number; countThisMonth: number; paidToday: boolean; isMonthlyLunas: boolean; isWeeklyLunas: boolean }>();
    
    // Group records by citizen
    const citizenRecordsMap = new Map<string, JimpitanRecord[]>();
    allRecords.forEach((r) => {
      const isThisMonth = r.tanggal && r.tanggal.startsWith(currentYearMonth);
      if (!isThisMonth) return;

      if (r.wargaId) {
        const list = citizenRecordsMap.get(r.wargaId) || [];
        list.push(r);
        citizenRecordsMap.set(r.wargaId, list);
      }
      if (r.nomorRumah) {
        const list = citizenRecordsMap.get(`no_${r.nomorRumah}`) || [];
        list.push(r);
        citizenRecordsMap.set(`no_${r.nomorRumah}`, list);
      }
    });

    wargaList.forEach((w) => {
      const recs = citizenRecordsMap.get(w.id) || citizenRecordsMap.get(`no_${w.nomorRumah}`) || [];
      const totalThisMonth = recs.reduce((sum, r) => sum + (r.nominal || 0), 0);
      const nominalDefault = w.nominalDefault || 1000;

      // Check full 1-month advance
      const hasFullMonthAdvance = recs.some(
        (r) =>
          r.status === 'sukses' &&
          ((r.nominal && r.nominal >= nominalDefault * 25) ||
            (r.catatan &&
              (r.catatan.toLowerCase().includes('lunas 1 bulan') ||
                r.catatan.toLowerCase().includes('lunas bulan') ||
                r.catatan.toLowerCase().includes('30 hari'))))
      );

      const isMonthlyLunas = Boolean(
        hasFullMonthAdvance || totalThisMonth >= nominalDefault * (currentDaysInMonth - 2)
      );

      // Check 1-week advance that covers selectedDate
      let isWeeklyLunas = false;
      if (!isMonthlyLunas && selectedDate) {
        const selectedDay = parseInt(selectedDate.slice(8, 10), 10) || 1;
        recs.forEach((r) => {
          if (r.status !== 'sukses') return;
          const isWeek =
            (r.catatan && (r.catatan.toLowerCase().includes('1 minggu') || r.catatan.toLowerCase().includes('7 hari'))) ||
            (r.nominal >= nominalDefault * 6 && r.nominal <= nominalDefault * 8);

          if (isWeek && r.tanggal) {
            const startDay = parseInt(r.tanggal.slice(8, 10), 10) || 1;
            if (selectedDay >= startDay && selectedDay <= startDay + 6) {
              isWeeklyLunas = true;
            }
          }
        });
      }

      const distinctDates = new Set(recs.filter((r) => r.status === 'sukses' && r.nominal > 0).map((r) => r.tanggal));
      const countThisMonth = isMonthlyLunas ? currentDaysInMonth : distinctDates.size;
      const paidToday = isMonthlyLunas || isWeeklyLunas || recs.some((r) => r.tanggal === selectedDate && r.status === 'sukses');

      const statObj = {
        totalThisMonth,
        countThisMonth,
        paidToday,
        isMonthlyLunas,
        isWeeklyLunas,
      };

      map.set(w.id, statObj);
      map.set(`no_${w.nomorRumah}`, statObj);
    });

    return map;
  }, [allRecords, currentYearMonth, currentDaysInMonth, wargaList, selectedDate]);


  // Generate QR for single selected warga
  useEffect(() => {
    if (selectedWargaForQr) {
      QRCode.toDataURL(selectedWargaForQr.qrCodeData, {
        width: 320,
        margin: 2,
        color: {
          dark: '#0369a1', // Sky 700
          light: '#ffffff',
        },
      })
        .then((url) => setQrDataUrl(url))
        .catch(console.warn);
    }
  }, [selectedWargaForQr]);

  // Generate all QRs when batch print modal is opened
  useEffect(() => {
    if (isBatchPrintOpen) {
      const promises = wargaList.map((w) =>
        QRCode.toDataURL(w.qrCodeData, {
          width: 200,
          margin: 1,
          color: { dark: '#0369a1', light: '#ffffff' },
        }).then((url) => ({ id: w.id, url }))
      );

      Promise.all(promises).then((results) => {
        const map: Record<string, string> = {};
        results.forEach((r) => {
          map[r.id] = r.url;
        });
        setBatchQrUrls(map);
      });
    }
  }, [isBatchPrintOpen, wargaList]);

  // Execute actual Add modal open
  const executeOpenAddModal = () => {
    setEditingWarga(null);
    setNomorRumah(String(wargaList.length + 1).padStart(2, '0'));
    setNama('');
    setBlok('Blok A');
    setAlamat('');
    setNomorHp('');
    setNominalDefault(settings.defaultNominal || 1000);
    setIsAddModalOpen(true);
  };

  // Execute actual Edit modal open
  const executeOpenEditModal = (warga: Warga) => {
    setEditingWarga(warga);
    setNomorRumah(warga.nomorRumah);
    setNama(warga.nama);
    setBlok(warga.blok || '');
    setAlamat(warga.alamat || '');
    setNomorHp(warga.nomorHp || '');
    setNominalDefault(warga.nominalDefault || 1000);
    setIsAddModalOpen(true);
  };

  // Execute actual Delete
  const executeDeleteWarga = (warga: Warga) => {
    if (window.confirm(`PERINGATAN PENGURUS RT: Hapus data warga No. ${warga.nomorRumah} (${warga.nama}) secara permanen?`)) {
      onDeleteWarga(warga.id);
    }
  };

  // Gatekeeper: Check admin authorization before modifying data or accessing reports
  const handleProtectedAction = (
    action:
      | { type: 'add' }
      | { type: 'edit'; warga: Warga }
      | { type: 'delete'; warga: Warga }
      | { type: 'monthly_report' }
  ) => {
    if (isAdminUnlocked || appMode !== 'warga') {
      if (action.type === 'add') executeOpenAddModal();
      else if (action.type === 'edit') executeOpenEditModal(action.warga);
      else if (action.type === 'delete') executeDeleteWarga(action.warga);
      else if (action.type === 'monthly_report') setActiveSubTab('monthly_report');
    } else {
      setPendingAction(action);
      setPinInput('');
      setPinError('');
      setIsPinModalOpen(true);
    }
  };

  // Handle PIN Unlock Submission
  const handlePinSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPinError('');

    if (!pinInput.trim()) {
      setPinError('Silakan masukkan PIN Admin.');
      return;
    }

    let isSuccess = false;
    if (onUnlockAdmin) {
      isSuccess = onUnlockAdmin(pinInput.trim());
    } else {
      const activePin = (settings.pinAdmin && settings.pinAdmin.trim()) ? settings.pinAdmin.trim() : '1234';
      isSuccess = pinInput.trim() === activePin;
    }

    if (isSuccess) {
      setIsPinModalOpen(false);
      const actionToRun = pendingAction;
      setPendingAction(null);
      setPinInput('');

      // Auto-execute pending action
      if (actionToRun) {
        if (actionToRun.type === 'add') executeOpenAddModal();
        else if (actionToRun.type === 'edit') executeOpenEditModal(actionToRun.warga);
        else if (actionToRun.type === 'delete') executeDeleteWarga(actionToRun.warga);
        else if (actionToRun.type === 'monthly_report') setActiveSubTab('monthly_report');
      }
    } else {
      setPinError('PIN Pengurus / Admin salah. Silakan coba lagi.');
    }
  };

  // Real-time duplicate detection for form inputs
  const formDuplicateStatus = useMemo(() => {
    if (!isAddModalOpen || !nomorRumah.trim()) return { isDuplicate: false };
    return checkWargaDuplicate(
      wargaList,
      {
        nomorRumah: nomorRumah.trim(),
        blok: blok.trim(),
        nama: nama.trim(),
      },
      editingWarga ? editingWarga.id : undefined
    );
  }, [isAddModalOpen, nomorRumah, blok, nama, wargaList, editingWarga]);

  const handleSaveForm = (e: React.FormEvent) => {
    e.preventDefault();
    if (!nomorRumah.trim() || !nama.trim()) {
      alert('Nomor rumah dan nama warga wajib diisi.');
      return;
    }

    // Strict duplicate check before submission
    const dupCheck = checkWargaDuplicate(
      wargaList,
      {
        nomorRumah: nomorRumah.trim(),
        blok: blok.trim(),
        nama: nama.trim(),
      },
      editingWarga ? editingWarga.id : undefined
    );

    if (dupCheck.isDuplicate) {
      alert(`⚠️ Peringatan Duplikat:\n\n${dupCheck.reason}\n\nSistem tidak mengizinkan data warga yang dobel atau memiliki nomor rumah yang sama.`);
      return;
    }

    if (editingWarga) {
      onUpdateWarga({
        ...editingWarga,
        nomorRumah: nomorRumah.trim(),
        nama: nama.trim(),
        blok: blok.trim(),
        alamat: alamat.trim(),
        nomorHp: nomorHp.trim(),
        nominalDefault: Number(nominalDefault),
        qrCodeData: `JIMPITAN-${settings.namaRt.replace(/\s+/g, '')}-${settings.namaRw.replace(/\s+/g, '')}-NO${nomorRumah.trim()}`,
      });
    } else {
      onAddWarga({
        nomorRumah: nomorRumah.trim(),
        nama: nama.trim(),
        blok: blok.trim(),
        rt: settings.namaRt.replace(/\D/g, '') || '01',
        rw: settings.namaRw.replace(/\D/g, '') || '01',
        alamat: alamat.trim(),
        nomorHp: nomorHp.trim(),
        nominalDefault: Number(nominalDefault),
        isActive: true,
      });
    }

    setIsAddModalOpen(false);
  };

  const filtered = wargaList.filter(
    (w) =>
      w.nama.toLowerCase().includes(search.toLowerCase()) ||
      w.nomorRumah.toLowerCase().includes(search.toLowerCase()) ||
      (w.blok && w.blok.toLowerCase().includes(search.toLowerCase()))
  );

  return (
    <div className="w-full space-y-4 pb-12" id="data-warga-view-root">
      {/* Header action bar */}
      <div className="bg-white rounded-3xl border border-sky-100 p-4 sm:p-5 shadow-sm space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center space-x-2.5">
                <div className="w-10 h-10 rounded-xl bg-sky-100 text-sky-700 flex items-center justify-center font-bold">
                  <Users className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="font-extrabold text-stone-900 text-base sm:text-lg tracking-tight">
                    {appMode === 'warga' ? 'Direktori & Riwayat Warga' : `Data Warga ${settings.namaRt} / ${settings.namaRw}`}
                  </h2>
                  <p className="text-xs text-stone-500">
                    {appMode === 'warga' 
                      ? `Transparansi status jimpitan • Total ${wargaList.length} Rumah`
                      : `Total ${wargaList.length} Rumah Terdaftar`}
                  </p>
                </div>
              </div>

              {/* Action buttons */}
              <div className="flex items-center space-x-2 flex-wrap gap-y-2">
                {appMode === 'warga' ? (
                  <div className="flex items-center space-x-2">
                    <span className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-[11px] font-bold">
                      <Users className="w-3.5 h-3.5 text-emerald-600" />
                      <span>Mode Warga</span>
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        setPendingAction(null);
                        setPinInput('');
                        setPinError('');
                        setIsPinModalOpen(true);
                      }}
                      className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-sky-50 hover:bg-sky-100 border border-sky-200 text-sky-700 text-[11px] font-bold transition-colors cursor-pointer"
                      title="Masuk sebagai Pengurus RT"
                    >
                      <Lock className="w-3 h-3 text-sky-600" />
                      <span>Akses Pengurus</span>
                    </button>
                  </div>
                ) : (
                  <>
                    {/* Admin status indicator */}
                    {isAdminUnlocked ? (
                      <div className="flex items-center space-x-1.5 px-2.5 py-1.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-[11px] font-bold">
                        <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                        <span>Pengurus Aktif</span>
                        {onLockApp && (
                          <button
                            type="button"
                            onClick={onLockApp}
                            className="ml-1 px-1.5 py-0.5 rounded bg-white hover:bg-emerald-100 text-emerald-900 border border-emerald-200 text-[10px] font-black cursor-pointer"
                            title="Kunci Akses Admin"
                          >
                            Kunci
                          </button>
                        )}
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => {
                          setPendingAction(null);
                          setPinInput('');
                          setPinError('');
                          setIsPinModalOpen(true);
                        }}
                        className="flex items-center space-x-1.5 px-2.5 py-1.5 rounded-xl bg-stone-100 hover:bg-stone-200 border border-stone-200 text-stone-700 text-[11px] font-bold transition-colors cursor-pointer"
                        title="Buka Akses Pengurus RT"
                      >
                        <Lock className="w-3 h-3 text-stone-500" />
                        <span>Buka Akses Pengurus</span>
                      </button>
                    )}

                    {onSaveBatchRecords && (
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedWargaForWeekly(null);
                          setIsWeeklyInputOpen(true);
                        }}
                        className="px-3 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold flex items-center space-x-1.5 shadow-2xs transition-colors cursor-pointer"
                        title="Input Jimpitan Perminggu dengan Deteksi Hari Kosong"
                        id="btn-input-mingguan-warga"
                      >
                        <CalendarDays className="w-3.5 h-3.5 text-indigo-200" />
                        <span>Input Perminggu</span>
                      </button>
                    )}

                    {isAdminUnlocked && onDeduplicateWarga && (
                      <button
                        type="button"
                        onClick={onDeduplicateWarga}
                        className="px-3 py-2 rounded-xl bg-amber-50 hover:bg-amber-100 border border-amber-200 text-amber-900 text-xs font-bold flex items-center space-x-1.5 transition-colors cursor-pointer"
                        title="Cek dan bersihkan data warga duplikat di sistem"
                      >
                        <Sparkles className="w-3.5 h-3.5 text-amber-600" />
                        <span>Cek Anti-Duplikat</span>
                      </button>
                    )}

                    <button
                      onClick={() => setIsBatchPrintOpen(true)}
                      className="px-3.5 py-2 rounded-xl bg-stone-900 hover:bg-stone-800 text-white text-xs font-bold flex items-center space-x-1.5 shadow-2xs transition-colors cursor-pointer"
                      title="Cetak Semua Kartu QR"
                    >
                      <Printer className="w-3.5 h-3.5 text-sky-400" />
                      <span>Cetak Kartu QR</span>
                    </button>

                    <button
                      onClick={() => handleProtectedAction({ type: 'add' })}
                      className="px-3.5 py-2 rounded-xl bg-sky-500 hover:bg-sky-600 text-white text-xs font-bold flex items-center space-x-1.5 shadow-2xs transition-colors cursor-pointer"
                      title={isAdminUnlocked ? 'Tambah Warga Baru' : 'Tambah Warga Baru (Khusus Pengurus/Admin)'}
                      id="btn-tambah-warga"
                    >
                      {!isAdminUnlocked && <Lock className="w-3.5 h-3.5 text-sky-200" />}
                      <Plus className="w-4 h-4" />
                      <span>Tambah Warga</span>
                    </button>
                  </>
                )}
              </div>
            </div>

            {/* Search input */}
            <div className="relative">
              <Search className="w-4 h-4 text-stone-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Cari berdasarkan nomor rumah, nama warga, atau blok..."
                className="w-full pl-10 pr-4 py-2.5 rounded-2xl bg-stone-50/70 border border-sky-200 text-stone-900 text-xs sm:text-sm outline-none focus:ring-2 focus:ring-sky-400"
              />
            </div>
          </div>

          {/* List of Residents */}
          <div className="space-y-2.5">
            {filtered.map((warga) => {
              const stats = residentMonthlyStatsMap.get(warga.id) || residentMonthlyStatsMap.get(`no_${warga.nomorRumah}`) || { totalThisMonth: 0, countThisMonth: 0, paidToday: false };

              return (
                <div
                  key={warga.id}
                  className="p-3.5 sm:p-4 rounded-2xl bg-white border border-stone-200 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:border-sky-300 transition-all"
                >
                  <div className="flex items-start sm:items-center space-x-3 min-w-0">
                    {/* House Number badge (Clickable to open history) */}
                    <button
                      type="button"
                      onClick={() => setSelectedWargaForHistory(warga)}
                      className="w-12 h-12 rounded-2xl bg-sky-50 hover:bg-sky-100 border border-sky-200 text-sky-900 font-extrabold flex flex-col items-center justify-center flex-shrink-0 transition-colors cursor-pointer group"
                      title="Klik untuk melihat riwayat jimpitan rumah ini"
                    >
                      <span className="text-[9px] uppercase font-semibold text-sky-700 group-hover:underline">No</span>
                      <span className="text-base leading-none">{warga.nomorRumah}</span>
                    </button>

                    <div className="min-w-0 flex-1">
                      <div className="flex items-center space-x-2 flex-wrap">
                        <h4 
                          onClick={() => setSelectedWargaForHistory(warga)}
                          className="font-bold text-stone-900 text-sm truncate hover:text-sky-700 cursor-pointer"
                          title="Lihat riwayat jimpitan"
                        >
                          {warga.nama}
                        </h4>
                        {stats.isMonthlyLunas ? (
                          <span className="px-1.5 py-0.5 rounded-md bg-amber-100 text-amber-900 border border-amber-300 text-[10px] font-extrabold flex items-center space-x-1">
                            <Award className="w-2.5 h-2.5 text-amber-600" />
                            <span>Lunas 1 Bulan</span>
                          </span>
                        ) : stats.isWeeklyLunas ? (
                          <span className="px-1.5 py-0.5 rounded-md bg-sky-100 text-sky-900 border border-sky-300 text-[10px] font-extrabold flex items-center space-x-1">
                            <Sparkles className="w-2.5 h-2.5 text-sky-600" />
                            <span>Lunas 1 Minggu</span>
                          </span>
                        ) : stats.paidToday ? (
                          <span className="px-1.5 py-0.5 rounded-md bg-emerald-100 text-emerald-800 text-[10px] font-extrabold flex items-center space-x-1">
                            <CheckCircle2 className="w-2.5 h-2.5" />
                            <span>Hari ini Lunas</span>
                          </span>
                        ) : (
                          <span className="px-1.5 py-0.5 rounded-md bg-stone-100 text-stone-600 text-[10px] font-semibold">
                            Belum Diambil
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-stone-500 truncate mt-0.5">
                        {warga.alamat || `${warga.blok || 'Blok A'} • RT ${warga.rt || settings.namaRt}/${warga.rw || settings.namaRw}`}
                      </p>
                      
                      {/* Monthly total & meta tags */}
                      <div className="flex items-center space-x-2 text-[11px] font-semibold mt-1 flex-wrap gap-y-1">
                        <span className={`px-2 py-0.5 rounded-lg font-bold ${
                          stats.isMonthlyLunas
                            ? 'bg-amber-50 text-amber-900 border border-amber-200'
                            : 'bg-sky-50 text-sky-800 border border-sky-200/80'
                        }`}>
                          Bulan ini: {formatRupiah(stats.totalThisMonth)} ({stats.countThisMonth} hari{stats.isMonthlyLunas ? ' lunas' : ''})
                        </span>
                        <span className="text-stone-500">
                          Def: {formatRupiah(warga.nominalDefault)}
                        </span>
                        {warga.nomorHp && (
                          <>
                            <span className="text-stone-300">•</span>
                            <span className="text-stone-500">{warga.nomorHp}</span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Quick Actions: Riwayat Detail, QR Card, Edit, Delete */}
                  <div className="flex items-center justify-end space-x-1.5 flex-shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-stone-100">
                    {/* Riwayat Jimpitan Detail Button */}
                    <button
                      type="button"
                      onClick={() => setSelectedWargaForHistory(warga)}
                      className="px-2.5 py-2 rounded-xl bg-sky-500 hover:bg-sky-600 text-white text-xs font-bold flex items-center space-x-1.5 shadow-2xs transition-colors cursor-pointer"
                      title="Lihat Riwayat & Kalender Jimpitan Warga"
                      id={`btn-history-warga-${warga.nomorRumah}`}
                    >
                      <CalendarDays className="w-3.5 h-3.5" />
                      <span>Riwayat</span>
                    </button>

                    {/* Weekly Input Button */}
                    {onSaveBatchRecords && appMode !== 'warga' && (
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedWargaForWeekly(warga);
                          setIsWeeklyInputOpen(true);
                        }}
                        className="p-2 rounded-xl bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 transition-colors cursor-pointer"
                        title="Input Jimpitan Perminggu Rumah Ini"
                      >
                        <CalendarDays className="w-4 h-4" />
                      </button>
                    )}

                    {/* QR Button */}
                    <button
                      type="button"
                      onClick={() => setSelectedWargaForQr(warga)}
                      className="p-2 rounded-xl bg-sky-50 hover:bg-sky-100 text-sky-700 border border-sky-200 transition-colors cursor-pointer"
                      title="Lihat & Cetak Kartu QR Warga"
                    >
                      <QrCode className="w-4 h-4" />
                    </button>

                    {/* Edit & Delete Buttons (Only in Petugas Mode) */}
                    {appMode !== 'warga' && (
                      <>
                        <button
                          type="button"
                          onClick={() => handleProtectedAction({ type: 'edit', warga })}
                          className="p-2 rounded-xl text-stone-600 hover:bg-stone-100 border border-stone-200 transition-colors cursor-pointer"
                          title={isAdminUnlocked ? 'Edit Data Warga' : 'Edit Data Warga (Khusus Pengurus/Admin)'}
                        >
                          <Edit3 className="w-4 h-4" />
                        </button>

                        <button
                          type="button"
                          onClick={() => handleProtectedAction({ type: 'delete', warga })}
                          className="p-2 rounded-xl text-stone-400 hover:text-rose-600 hover:bg-rose-50 border border-transparent transition-colors cursor-pointer"
                          title={isAdminUnlocked ? 'Hapus Warga' : 'Hapus Warga (Khusus Pengurus/Admin)'}
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

      {/* MODAL 1: ADD / EDIT WARGA */}
      {isAddModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl border border-stone-200 shadow-2xl max-w-md w-full p-5 space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-stone-100 pb-3">
              <h3 className="font-bold text-stone-900 text-base">
                {editingWarga ? 'Edit Data Warga' : 'Tambah Warga Baru'}
              </h3>
              <button
                onClick={() => setIsAddModalOpen(false)}
                className="p-1.5 rounded-xl text-stone-400 hover:text-stone-700 hover:bg-stone-100"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveForm} className="space-y-3">
              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="block text-xs font-bold text-stone-700 mb-1">
                    No. Rumah *
                  </label>
                  <input
                    type="text"
                    required
                    value={nomorRumah}
                    onChange={(e) => setNomorRumah(e.target.value)}
                    placeholder="01"
                    className="w-full px-3 py-2 rounded-xl bg-stone-50 border border-stone-300 text-stone-900 text-xs font-bold outline-none focus:ring-2 focus:ring-sky-400"
                  />
                </div>

                <div className="col-span-2">
                  <label className="block text-xs font-bold text-stone-700 mb-1">
                    Nama Lengkap Kepala Keluarga *
                  </label>
                  <input
                    type="text"
                    required
                    value={nama}
                    onChange={(e) => setNama(e.target.value)}
                    placeholder="Bpk. Budi Santoso"
                    className="w-full px-3 py-2 rounded-xl bg-stone-50 border border-stone-300 text-stone-900 text-xs outline-none focus:ring-2 focus:ring-sky-400"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-semibold text-stone-600 mb-1">
                    Blok / Gang
                  </label>
                  <input
                    type="text"
                    value={blok}
                    onChange={(e) => setBlok(e.target.value)}
                    placeholder="Blok A"
                    className="w-full px-3 py-2 rounded-xl bg-stone-50 border border-stone-300 text-stone-900 text-xs outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-stone-600 mb-1">
                    Nominal Default (Rp)
                  </label>
                  <input
                    type="number"
                    value={nominalDefault}
                    onChange={(e) => setNominalDefault(Number(e.target.value))}
                    step="500"
                    className="w-full px-3 py-2 rounded-xl bg-stone-50 border border-stone-300 text-stone-900 text-xs font-bold outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-stone-600 mb-1">
                  Alamat Lengkap (Opsional)
                </label>
                <input
                  type="text"
                  value={alamat}
                  onChange={(e) => setAlamat(e.target.value)}
                  placeholder="Jl. Melati No. 01"
                  className="w-full px-3 py-2 rounded-xl bg-stone-50 border border-stone-300 text-stone-900 text-xs outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-stone-600 mb-1">
                  Nomor WhatsApp / HP (Opsional)
                </label>
                <input
                  type="tel"
                  value={nomorHp}
                  onChange={(e) => setNomorHp(e.target.value)}
                  placeholder="08123456789"
                  className="w-full px-3 py-2 rounded-xl bg-stone-50 border border-stone-300 text-stone-900 text-xs outline-none"
                />
              </div>

              {formDuplicateStatus.isDuplicate && (
                <div className="p-3 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 space-y-1 animate-in fade-in duration-150">
                  <div className="flex items-center space-x-1.5 font-bold text-xs text-rose-700">
                    <AlertCircle className="w-4 h-4 text-rose-600 flex-shrink-0" />
                    <span>Data Warga / No. Rumah Duplikat!</span>
                  </div>
                  <p className="text-[11px] text-rose-700 leading-snug">
                    {formDuplicateStatus.reason}. Data warga tidak boleh dobel di sistem.
                  </p>
                </div>
              )}

              <div className="pt-3">
                <button
                  type="submit"
                  disabled={formDuplicateStatus.isDuplicate}
                  className={`w-full py-2.5 rounded-2xl text-white font-extrabold text-xs sm:text-sm tracking-wide shadow-md transition-all ${
                    formDuplicateStatus.isDuplicate
                      ? 'bg-stone-300 cursor-not-allowed opacity-60 text-stone-600'
                      : 'bg-sky-500 hover:bg-sky-600 cursor-pointer'
                  }`}
                >
                  {editingWarga ? 'SIMPAN PERUBAHAN' : 'TAMBAH WARGA'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: INDIVIDUAL QR CARD PREVIEW & PRINT */}
      {selectedWargaForQr && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl border border-stone-200 shadow-2xl max-w-sm w-full p-5 space-y-4 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-stone-100 pb-2">
              <h3 className="font-bold text-stone-900 text-sm sm:text-base">
                Kartu QR Jimpitan Warga
              </h3>
              <button
                onClick={() => setSelectedWargaForQr(null)}
                className="p-1 rounded-xl text-stone-400 hover:text-stone-700"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Printable Card Area */}
            <div
              id="printable-single-qr-card"
              className="p-5 rounded-2xl bg-sky-50/50 border-2 border-sky-500 text-center space-y-3 shadow-sm relative overflow-hidden"
            >
              <div className="border-b border-sky-200 pb-2">
                <span className="text-[10px] font-extrabold uppercase tracking-widest text-sky-800 block">
                  KARTU JIMPITAN SISKAMLING
                </span>
                <h4 className="font-extrabold text-stone-900 text-base">
                  {settings.namaRt} / {settings.namaRw}
                </h4>
                <p className="text-[11px] text-stone-500">{settings.lingkungan}</p>
              </div>

              {/* QR Image Box */}
              <div className="bg-white p-3 rounded-2xl border border-sky-200 shadow-xs inline-block mx-auto">
                {qrDataUrl ? (
                  <img
                    src={qrDataUrl}
                    alt={`QR Code Rumah ${selectedWargaForQr.nomorRumah}`}
                    className="w-44 h-44 object-contain"
                  />
                ) : (
                  <div className="w-44 h-44 bg-stone-100 animate-pulse rounded-xl" />
                )}
              </div>

              <div>
                <span className="text-[11px] font-bold text-sky-700 uppercase block">
                  NOMOR RUMAH:
                </span>
                <div className="text-3xl font-extrabold text-stone-900 leading-none my-1">
                  {selectedWargaForQr.nomorRumah}
                </div>
                <p className="font-bold text-stone-800 text-xs">
                  {selectedWargaForQr.nama}
                </p>
                <p className="text-[10px] text-stone-500">
                  {selectedWargaForQr.alamat || selectedWargaForQr.blok}
                </p>
              </div>

              <div className="text-[9px] text-stone-400 pt-1 border-t border-sky-100 italic">
                Tempelkan kartu QR ini di kotak jimpitan depan pintu / pagar rumah.
              </div>
            </div>

            {/* Print Button */}
            <div className="flex items-center space-x-2">
              <button
                onClick={() => window.print()}
                className="flex-1 py-2.5 rounded-xl bg-sky-500 hover:bg-sky-600 text-white font-bold text-xs flex items-center justify-center space-x-1.5 shadow-sm transition-colors cursor-pointer"
              >
                <Printer className="w-4 h-4" />
                <span>Cetak Kartu Ini</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 3: BATCH PRINT ALL QR CARDS (GRID A4) */}
      {isBatchPrintOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl border border-stone-200 shadow-2xl max-w-4xl w-full p-6 space-y-5 my-auto max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-stone-100 pb-3">
              <div>
                <h3 className="font-bold text-stone-900 text-lg">
                  Cetak Lembar Kartu QR Seluruh Warga
                </h3>
                <p className="text-xs text-stone-500">
                  Siap dicetak di kertas A4 untuk dipotong dan ditempel di depan rumah warga.
                </p>
              </div>
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => window.print()}
                  className="px-4 py-2 rounded-xl bg-sky-500 hover:bg-sky-600 text-white text-xs font-bold flex items-center space-x-1.5 shadow-sm cursor-pointer"
                >
                  <Printer className="w-4 h-4" />
                  <span>Cetak Lembar A4</span>
                </button>
                <button
                  onClick={() => setIsBatchPrintOpen(false)}
                  className="p-1.5 rounded-xl text-stone-400 hover:text-stone-700"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Grid of QR cards */}
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 p-2 bg-stone-50 rounded-2xl border border-stone-200">
              {wargaList.map((w) => (
                <div
                  key={w.id}
                  className="bg-white p-3 rounded-xl border-2 border-sky-500 text-center space-y-1.5 shadow-2xs"
                >
                  <div className="border-b border-sky-100 pb-1">
                    <span className="text-[8px] font-extrabold uppercase tracking-wider text-sky-800 block">
                      JIMPITAN {settings.namaRt}
                    </span>
                  </div>

                  <div className="w-24 h-24 mx-auto bg-white p-1 rounded-lg border border-sky-200 flex items-center justify-center">
                    {batchQrUrls[w.id] ? (
                      <img src={batchQrUrls[w.id]} alt={`QR ${w.nomorRumah}`} className="w-full h-full object-contain" />
                    ) : (
                      <div className="w-full h-full bg-stone-100 animate-pulse rounded" />
                    )}
                  </div>

                  <div>
                    <div className="text-xl font-extrabold text-stone-900 leading-none">
                      NO. {w.nomorRumah}
                    </div>
                    <p className="text-[10px] font-bold text-stone-700 truncate">{w.nama}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* MODAL 4: DETAIL RIWAYAT & STATUS PEMBAYARAN JIMPITAN WARGA */}
      <WargaDetailHistoryModal
        isOpen={Boolean(selectedWargaForHistory)}
        onClose={() => setSelectedWargaForHistory(null)}
        warga={selectedWargaForHistory}
        allRecords={allRecords}
        selectedDate={selectedDate}
        settings={settings}
      />

      {/* MODAL 5: VERIFIKASI PIN ADMIN / PENGURUS RT */}
      {isPinModalOpen && (
        <div className="fixed inset-0 bg-black/65 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl border border-stone-200 shadow-2xl max-w-sm w-full p-5 sm:p-6 space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-stone-100 pb-3">
              <div className="flex items-center space-x-2.5">
                <div className="w-9 h-9 rounded-xl bg-amber-100 text-amber-800 flex items-center justify-center">
                  <Lock className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-extrabold text-stone-900 text-sm sm:text-base">
                    Akses Pengurus RT
                  </h3>
                  <span className="text-[10px] font-bold text-amber-800 uppercase tracking-wider block">
                    Verifikasi PIN Admin
                  </span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setIsPinModalOpen(false);
                  setPendingAction(null);
                  setPinInput('');
                  setPinError('');
                }}
                className="p-1.5 rounded-xl text-stone-400 hover:text-stone-700 hover:bg-stone-100"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-1 bg-stone-50 p-3 rounded-2xl border border-stone-200/80">
              <p className="text-xs text-stone-700 font-bold">
                {pendingAction?.type === 'add' && 'Penambahan data warga baru diproteksi.'}
                {pendingAction?.type === 'edit' && `Pengubahan data warga No. ${pendingAction.warga.nomorRumah} (${pendingAction.warga.nama}) diproteksi.`}
                {pendingAction?.type === 'delete' && `Penghapusan data warga No. ${pendingAction.warga.nomorRumah} (${pendingAction.warga.nama}) diproteksi.`}
                {!pendingAction && 'Akses modifikasi data warga diproteksi khusus Pengurus/Admin RT.'}
              </p>
              <p className="text-[11px] text-stone-500">
                Masukkan PIN Pengurus RT aktif untuk melanjutkan.
              </p>
            </div>

            <form onSubmit={handlePinSubmit} className="space-y-3.5">
              <div className="space-y-1.5">
                <label className="text-[11px] font-black uppercase tracking-wider text-stone-600 block">
                  PIN PENGURUS RT
                </label>
                <div className="relative">
                  <KeyRound className="w-4 h-4 text-stone-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type={showPin ? 'text' : 'password'}
                    autoFocus
                    inputMode="numeric"
                    maxLength={8}
                    value={pinInput}
                    onChange={(e) => {
                      setPinInput(e.target.value.replace(/\D/g, ''));
                      if (pinError) setPinError('');
                    }}
                    placeholder="Masukkan PIN Pengurus..."
                    className="w-full pl-10 pr-10 py-2.5 rounded-2xl bg-stone-50 border border-stone-300 text-stone-900 text-sm font-bold tracking-widest outline-none focus:ring-2 focus:ring-sky-500 focus:border-sky-500"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPin(!showPin)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-700 p-1 cursor-pointer"
                  >
                    {showPin ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                {pinError && (
                  <p className="text-[11px] text-rose-600 font-bold flex items-center space-x-1 mt-1">
                    <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
                    <span>{pinError}</span>
                  </p>
                )}
              </div>

              <div className="flex items-center space-x-2 pt-1">
                <button
                  type="button"
                  onClick={() => {
                    setIsPinModalOpen(false);
                    setPendingAction(null);
                    setPinInput('');
                    setPinError('');
                  }}
                  className="flex-1 py-2.5 rounded-2xl bg-stone-100 hover:bg-stone-200 text-stone-700 text-xs font-bold transition-colors cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 rounded-2xl bg-sky-500 hover:bg-sky-600 text-white text-xs font-extrabold flex items-center justify-center space-x-1.5 shadow-sm transition-colors cursor-pointer"
                >
                  <Unlock className="w-3.5 h-3.5" />
                  <span>Buka & Lanjutkan</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Input Jimpitan Mingguan Modal */}
      {onSaveBatchRecords && (
        <InputJimpitanMingguanModal
          isOpen={isWeeklyInputOpen}
          onClose={() => {
            setIsWeeklyInputOpen(false);
            setSelectedWargaForWeekly(null);
          }}
          wargaList={wargaList}
          allRecords={allRecords}
          onSaveBatchRecords={onSaveBatchRecords}
          currentPetugas={currentPetugas}
          currentReguNama={currentReguNama}
          currentReguId={currentReguId}
          settings={settings}
          preselectedWarga={selectedWargaForWeekly}
          initialDate={selectedDate}
        />
      )}
    </div>
  );
};
