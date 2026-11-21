import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { 
  Settings, 
  Shield, 
  Users, 
  Volume2, 
  Lock, 
  Unlock,
  Download, 
  Upload, 
  Check, 
  Building,
  QrCode,
  BarChart3,
  Receipt,
  Calculator,
  Wallet,
  Printer,
  BookOpen,
  ChevronRight,
  ChevronDown,
  KeyRound,
  Eye,
  EyeOff,
  AlertCircle,
  ShieldCheck,
  RefreshCw,
  Sparkles,
  Archive,
  Cloud,
  Database,
  Trash2,
  Mail
} from 'lucide-react';
import { AppSettings, ReguRonda, Warga, JimpitanRecord, KasMutation, AppBackup, MonthlyArchive } from '../types';
import { TabType } from './BottomNav';
import { formatRupiah, formatTanggalIndo, getTodayDateIso, formatLocalDateIsoFromMs } from '../utils/formatters';
import { LaporanTabKey } from './LaporanHubModal';
import { 
  FileText, 
  TrendingUp, 
  TrendingDown, 
  Calendar as CalendarIcon, 
  FileSpreadsheet,
  Share2
} from 'lucide-react';
import { generateKasReportExcel, generateWargaMonthlyReportExcel } from '../utils/excelReportGenerator';
import { calculateWargaMonthDistribution } from '../utils/jimpitanCalculations';
import { PdfReportModal } from './PdfReportModal';
import { CetakQrBarcodeModal } from './CetakQrBarcodeModal';
import { AdminEmailVerificationCard } from './AdminEmailVerificationCard';
import { triggerFileDownloadOrShare, triggerCsvDownload, notifyDownloadError } from '../utils/fileDownloader';
import { 
  saveCloudBackup, 
  getCloudBackups, 
  resolveFullCloudBackup,
  deleteCloudBackup, 
  saveMonthlyArchiveCloud, 
  getMonthlyArchivesCloud, 
  deleteMonthlyArchiveCloud,
  PRIMARY_ADMIN_EMAIL,
  getAllowedAdminEmails
} from '../services/firebaseService';

interface MenuViewProps {
  settings: AppSettings;
  onUpdateSettings: (newSettings: AppSettings) => Promise<void> | void;
  reguList?: ReguRonda[];
  onUpdateReguList?: (newRegu: ReguRonda[]) => void;
  onResetAllData: () => void;
  onLoadSampleData: () => void;
  allWarga: Warga[];
  allRecords: JimpitanRecord[];
  allMutations: KasMutation[];
  onRestoreFullBackup: (data: any) => void;
  onNavigate: (tab: TabType) => void;
  onOpenPengeluaranKas: () => void;
  onOpenCetakQr: () => void;
  onOpenPanduan: () => void;
  onOpenInstallModal?: () => void;
  onOpenLaporanHub?: (tab?: LaporanTabKey) => void;
  onOpenShareModal?: (tab?: 'laporan' | 'pengingat') => void;
  onLockApp: () => void;
  isAdminUnlocked?: boolean;
  onUnlockAdmin?: (pin: string) => boolean;
  onOpenChangePinModal?: () => void;
  verifiedAdminEmail?: string | null;
  onEmailVerified?: (email: string) => void;
  onResetVerified?: () => void;
}

export const MenuView: React.FC<MenuViewProps> = ({
  settings,
  onUpdateSettings,
  reguList = [],
  onUpdateReguList,
  onResetAllData,
  onLoadSampleData,
  allWarga,
  allRecords,
  allMutations,
  onRestoreFullBackup,
  onNavigate,
  onOpenPengeluaranKas,
  onOpenCetakQr,
  onOpenPanduan,
  onOpenInstallModal,
  onOpenLaporanHub,
  onOpenShareModal,
  onLockApp,
  isAdminUnlocked = false,
  onUnlockAdmin,
  onOpenChangePinModal,
  verifiedAdminEmail = null,
  onEmailVerified,
  onResetVerified,
}) => {
  const currYearMonth = getTodayDateIso().slice(0, 7);
  const currMonthLabel = useMemo(() => {
    const [y, m] = currYearMonth.split('-').map(Number);
    return new Date(y, Math.max(0, (m || 1) - 1), 1).toLocaleDateString('id-ID', { month: 'long', year: 'numeric' });
  }, [currYearMonth]);

  const { pastNetPreviousMonths, currentMonthNet } = useMemo(() => {
    const getSafeNom = (r: JimpitanRecord) =>
      r.status === 'kosong' || r.status === 'lewat' ? 0 : Number(r.nominal) || 0;
    const pastJimpitan = allRecords
      .filter((r) => r.tanggal && r.tanggal < `${currYearMonth}-01`)
      .reduce((s, r) => s + getSafeNom(r), 0);
    const pastMutMasuk = allMutations
      .filter((m) => {
        const tgl = m.tanggal ? m.tanggal.split('T')[0] : m.createdAt ? formatLocalDateIsoFromMs(m.createdAt) : '';
        return tgl && tgl < `${currYearMonth}-01` && m.jenis === 'masuk';
      })
      .reduce((s, m) => s + (Number(m.nominal) || 0), 0);
    const pastMutKeluar = allMutations
      .filter((m) => {
        const tgl = m.tanggal ? m.tanggal.split('T')[0] : m.createdAt ? formatLocalDateIsoFromMs(m.createdAt) : '';
        return tgl && tgl < `${currYearMonth}-01` && m.jenis === 'keluar';
      })
      .reduce((s, m) => s + (Number(m.nominal) || 0), 0);

    const currJimpitan = allRecords
      .filter((r) => r.tanggal && r.tanggal.startsWith(currYearMonth))
      .reduce((s, r) => s + getSafeNom(r), 0);
    const currMutMasuk = allMutations
      .filter((m) => {
        const tgl = m.tanggal ? m.tanggal.split('T')[0] : m.createdAt ? formatLocalDateIsoFromMs(m.createdAt) : '';
        return tgl && tgl.startsWith(currYearMonth) && m.jenis === 'masuk';
      })
      .reduce((s, m) => s + (Number(m.nominal) || 0), 0);
    const currMutKeluar = allMutations
      .filter((m) => {
        const tgl = m.tanggal ? m.tanggal.split('T')[0] : m.createdAt ? formatLocalDateIsoFromMs(m.createdAt) : '';
        return tgl && tgl.startsWith(currYearMonth) && m.jenis === 'keluar';
      })
      .reduce((s, m) => s + (Number(m.nominal) || 0), 0);

    return {
      pastNetPreviousMonths: pastJimpitan + pastMutMasuk - pastMutKeluar,
      currentMonthNet: currJimpitan + currMutMasuk - currMutKeluar,
    };
  }, [allRecords, allMutations, currYearMonth]);

  const [saldoInputMode, setSaldoInputMode] = useState<'bulan_ini' | 'master'>('bulan_ini');

  const formatSignedNumericText = (val: number) => {
    if (!val) return '0';
    return val < 0 ? `-${Math.abs(val).toLocaleString('id-ID')}` : val.toLocaleString('id-ID');
  };

  const [formData, setFormData] = useState<AppSettings>(settings);
  const [saldoAwalText, setSaldoAwalText] = useState<string>(() => {
    const masterVal = Number(settings.saldoAwalKas) || 0;
    return formatSignedNumericText(masterVal + pastNetPreviousMonths);
  });
  const hasEditedSaldoRef = React.useRef<boolean>(false);
  const lastSyncedSettingsJsonRef = React.useRef<string>(JSON.stringify(settings));
  const [isSavedAlert, setIsSavedAlert] = useState<boolean>(false);
  const [isSavingSettings, setIsSavingSettings] = useState<boolean>(false);
  const [saveErrorAlert, setSaveErrorAlert] = useState<string>('');

  // Admin PIN Unlock form state
  const [inputPin, setInputPin] = useState<string>('');
  const [pinError, setPinError] = useState<string>('');
  const [showPin, setShowPin] = useState<boolean>(false);

  // PDF Preview & Excel Export states
  const [isPdfModalOpen, setIsPdfModalOpen] = useState<boolean>(false);
  const [isCetakQrModalOpen, setIsCetakQrModalOpen] = useState<boolean>(false);
  const [isExportingKasExcel, setIsExportingKasExcel] = useState<boolean>(false);
  const [isExportingMatriksExcel, setIsExportingMatriksExcel] = useState<boolean>(false);

  const handleExportKasExcel = async () => {
    setIsExportingKasExcel(true);
    try {
      const now = new Date();
      const currMonthLabel = now.toLocaleDateString('id-ID', { month: 'long', year: 'numeric' });
      const currentYearMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
      
      const filteredRecs = allRecords.filter((r) => r.tanggal && r.tanggal.startsWith(currentYearMonth));
      const filteredMuts = allMutations.filter((m) => {
        const tgl = m.tanggal ? m.tanggal.split('T')[0] : (m.createdAt ? formatLocalDateIsoFromMs(m.createdAt) : '');
        return tgl.startsWith(currentYearMonth);
      });

      const totalKas = (Number(settings.saldoAwalKas) || 0) + 
        allRecords.reduce((s, r) => s + (r.nominal || 0), 0) + 
        allMutations.filter((m) => m.jenis === 'masuk').reduce((s, m) => s + (m.nominal || 0), 0) - 
        allMutations.filter((m) => m.jenis === 'keluar').reduce((s, m) => s + (m.nominal || 0), 0);

      await generateKasReportExcel({
        records: filteredRecs.length > 0 ? filteredRecs : allRecords,
        mutations: filteredMuts.length > 0 ? filteredMuts : allMutations,
        settings,
        periodText: currMonthLabel,
        totalSaldoKas: totalKas,
        saldoAwalPeriode: Number(settings.saldoAwalKas) || 0,
        wargaList: allWarga,
      });
    } catch (err) {
      notifyDownloadError('Terjadi kendala saat mengunduh file Excel Kas.', err);
    } finally {
      setIsExportingKasExcel(false);
    }
  };

  const handleExportMatriksExcel = async () => {
    setIsExportingMatriksExcel(true);
    try {
      const now = new Date();
      const year = now.getFullYear();
      const month = now.getMonth() + 1;
      const daysInMonth = new Date(year, month, 0).getDate();
      const currMonthLabel = now.toLocaleDateString('id-ID', { month: 'long', year: 'numeric' });
      const currentYearMonth = `${year}-${String(month).padStart(2, '0')}`;

      const wargaData = allWarga.map((warga) => {
        const dist = calculateWargaMonthDistribution(warga, allRecords, currentYearMonth, settings);
        const dailyAmounts: { [day: number]: number } = {};

        for (let d = 1; d <= daysInMonth; d++) {
          dailyAmounts[d] = dist.dailyMap[d]?.nominal || 0;
        }

        return {
          warga,
          totalAmount: dist.totalTerbayar,
          countDays: dist.countPaidDays,
          dailyAmounts,
          isTargetMet: dist.isLunas,
          isOverTarget: dist.totalTerbayar > dist.targetBulan,
          difference: dist.selisih,
        };
      });

      await generateWargaMonthlyReportExcel({
        wargaData,
        settings,
        activeMonthLabel: currMonthLabel,
        daysInMonth,
      });
    } catch (err) {
      notifyDownloadError('Terjadi kendala saat mengunduh file Excel Matriks.', err);
    } finally {
      setIsExportingMatriksExcel(false);
    }
  };

  const handleExportCsvMenu = () => {
    try {
      const escapeCsvCell = (val: unknown) =>
        `"${String(val ?? '').replace(/"/g, '""')}"`;

      const headers = ['ID', 'Tanggal', 'Waktu', 'Nomor Rumah', 'Nama Warga', 'Nominal', 'Status', 'Petugas', 'Regu', 'Catatan'];
      const rows = allRecords.map((r) => [
        escapeCsvCell(r.id),
        escapeCsvCell(r.tanggal),
        escapeCsvCell(r.waktu),
        escapeCsvCell(r.nomorRumah),
        escapeCsvCell(r.namaWarga),
        Number(r.nominal) || 0,
        escapeCsvCell(r.status),
        escapeCsvCell(r.petugas),
        escapeCsvCell(r.reguNama),
        escapeCsvCell(r.catatan || ''),
      ].join(','));

      triggerCsvDownload(
        [headers.join(','), ...rows],
        `Rekap_Jimpitan_${settings?.namaRt || 'RT08'}_${getTodayDateIso()}.csv`
      );
    } catch (err) {
      notifyDownloadError('Gagal mengekspor data CSV.', err);
    }
  };

  // Quick Dedicated Change PIN state
  const [currentPinInput, setCurrentPinInput] = useState<string>('');
  const [newPinInput, setNewPinInput] = useState<string>('');
  const [confirmPinInput, setConfirmPinInput] = useState<string>('');
  const [showNewPin, setShowNewPin] = useState<boolean>(false);
  const [pinChangeMsg, setPinChangeMsg] = useState<{ text: string; isError: boolean } | null>(null);
  const [isPinSaving, setIsPinSaving] = useState<boolean>(false);

  useEffect(() => {
    const serialized = JSON.stringify(settings);
    const settingsChanged = lastSyncedSettingsJsonRef.current !== serialized;
    if (settingsChanged) {
      lastSyncedSettingsJsonRef.current = serialized;
      hasEditedSaldoRef.current = false;
      setFormData(settings);
    }
    if (settingsChanged || !hasEditedSaldoRef.current) {
      const masterVal = Number(settings.saldoAwalKas) || 0;
      const shownVal = saldoInputMode === 'bulan_ini' ? masterVal + pastNetPreviousMonths : masterVal;
      setSaldoAwalText(formatSignedNumericText(shownVal));
    }
  }, [settings, saldoInputMode, pastNetPreviousMonths]);

  const parseSignedSaldoText = (rawText: string): number => {
    const trimmed = rawText.trim();
    const isNeg = trimmed.startsWith('-');
    const digits = trimmed.replace(/\D/g, '');
    const num = Number(digits) || 0;
    return isNeg && num > 0 ? -num : num;
  };

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaveErrorAlert('');
    const candidatePenginput = (formData.pinPenginput || '').trim();
    const safePinPenginput = /^\d{4,8}$/.test(candidatePenginput)
      ? candidatePenginput
      : (settings.pinPenginput && settings.pinPenginput.trim()) || '4321';

    if (candidatePenginput && !/^\d{4,8}$/.test(candidatePenginput)) {
      setSaveErrorAlert('PIN Penginput harus berupa 4 - 8 digit angka.');
      return;
    }

    const enteredDisplayVal = parseSignedSaldoText(saldoAwalText);
    const parsedMasterSaldoAwal =
      saldoInputMode === 'bulan_ini' ? enteredDisplayVal - pastNetPreviousMonths : enteredDisplayVal;

    setIsSavingSettings(true);
    try {
      await onUpdateSettings({
        ...settings,
        ...formData,
        saldoAwalKas: parsedMasterSaldoAwal,
        pinAdmin: (settings.pinAdmin && settings.pinAdmin.trim()) || '1234',
        pinPenginput: safePinPenginput,
      });
      setSaldoAwalText(formatSignedNumericText(enteredDisplayVal));
      hasEditedSaldoRef.current = false;
      setIsSavedAlert(true);
      setTimeout(() => setIsSavedAlert(false), 3500);
    } catch {
      setSaveErrorAlert('Gagal menyimpan pengaturan ke Cloud. Periksa koneksi internet.');
    } finally {
      setIsSavingSettings(false);
    }
  };

  const handleUnlockSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPinError('');

    if (!verifiedAdminEmail) {
      setPinError('Verifikasi Email Google Admin wajib diselesaikan terlebih dahulu pada Langkah 1.');
      return;
    }

    const clean = inputPin.trim();
    if (!clean) {
      setPinError('Silakan masukkan PIN Admin.');
      return;
    }

    if (onUnlockAdmin) {
      const isSuccess = onUnlockAdmin(clean);
      if (isSuccess) {
        setInputPin('');
        setPinError('');
      } else {
        setPinError('PIN Admin salah. Silakan coba kembali.');
      }
    } else {
      const activePin = (settings.pinAdmin && settings.pinAdmin.trim()) ? settings.pinAdmin.trim() : '1234';
      if (clean === activePin) {
        setInputPin('');
        setPinError('');
      } else {
        setPinError('PIN Admin salah. Silakan coba kembali.');
      }
    }
  };

  const handleQuickChangePin = async (e: React.FormEvent) => {
    e.preventDefault();
    setPinChangeMsg(null);

    const cleanOld = currentPinInput.trim();
    const cleanNew = newPinInput.trim();
    const cleanConfirm = confirmPinInput.trim();

    const activePin = (settings.pinAdmin && settings.pinAdmin.trim()) ? settings.pinAdmin.trim() : '1234';

    // Strict validation: Old PIN must match the active PIN currently in effect
    if (cleanOld !== activePin) {
      setPinChangeMsg({ text: 'PIN Lama salah. Masukkan PIN saat ini yang aktif.', isError: true });
      return;
    }

    if (!/^\d{4,8}$/.test(cleanNew)) {
      setPinChangeMsg({ text: 'PIN Baru harus berupa 4 sampai 8 digit angka.', isError: true });
      return;
    }

    if (cleanNew !== cleanConfirm) {
      setPinChangeMsg({ text: 'Konfirmasi PIN Baru tidak cocok.', isError: true });
      return;
    }

    if (cleanNew === cleanOld) {
      setPinChangeMsg({ text: 'PIN Baru tidak boleh sama dengan PIN Lama.', isError: true });
      return;
    }

    setIsPinSaving(true);
    try {
      const updated = { ...settings, pinAdmin: cleanNew };
      await onUpdateSettings(updated);
      setFormData(updated);
      setPinChangeMsg({ text: 'PIN Pengurus berhasil diubah! PIN lama sudah tidak berlaku.', isError: false });
      setCurrentPinInput('');
      setNewPinInput('');
      setConfirmPinInput('');
      setTimeout(() => setPinChangeMsg(null), 3500);
    } catch (err) {
      setPinChangeMsg({ text: 'Gagal memperbarui PIN. Silakan coba lagi.', isError: true });
    } finally {
      setIsPinSaving(false);
    }
  };

  // Quick Dedicated Change PIN Penginput State
  const [currentPenginputPinInput, setCurrentPenginputPinInput] = useState<string>('');
  const [newPenginputPinInput, setNewPenginputPinInput] = useState<string>('');
  const [confirmPenginputPinInput, setConfirmPenginputPinInput] = useState<string>('');
  const [showNewPenginputPin, setShowNewPenginputPin] = useState<boolean>(false);
  const [penginputPinChangeMsg, setPenginputPinChangeMsg] = useState<{ text: string; isError: boolean } | null>(null);
  const [isPenginputPinSaving, setIsPenginputPinSaving] = useState<boolean>(false);

  const handleQuickChangePenginputPin = async (e: React.FormEvent) => {
    e.preventDefault();
    setPenginputPinChangeMsg(null);

    const cleanOld = currentPenginputPinInput.trim();
    const cleanNew = newPenginputPinInput.trim();
    const cleanConfirm = confirmPenginputPinInput.trim();

    const activePin = (settings.pinPenginput && settings.pinPenginput.trim()) ? settings.pinPenginput.trim() : '4321';

    if (cleanOld !== activePin) {
      setPenginputPinChangeMsg({ text: 'PIN Penginput Lama salah.', isError: true });
      return;
    }

    if (!/^\d{4,8}$/.test(cleanNew)) {
      setPenginputPinChangeMsg({ text: 'PIN Baru harus 4 sampai 8 digit angka.', isError: true });
      return;
    }

    if (cleanNew !== cleanConfirm) {
      setPenginputPinChangeMsg({ text: 'Konfirmasi PIN Baru tidak cocok.', isError: true });
      return;
    }

    setIsPenginputPinSaving(true);
    try {
      const updated = { ...settings, pinPenginput: cleanNew };
      await onUpdateSettings(updated);
      setFormData(updated);
      setPenginputPinChangeMsg({ text: 'PIN Penginput berhasil diperbarui!', isError: false });
      setCurrentPenginputPinInput('');
      setNewPenginputPinInput('');
      setConfirmPenginputPinInput('');
      setTimeout(() => setPenginputPinChangeMsg(null), 3500);
    } catch (err) {
      setPenginputPinChangeMsg({ text: 'Gagal memperbarui PIN Penginput.', isError: true });
    } finally {
      setIsPenginputPinSaving(false);
    }
  };

  // Whitelist Email Admin Management State
  const [newAdminEmailInput, setNewAdminEmailInput] = useState<string>('');
  const [adminEmailMsg, setAdminEmailMsg] = useState<{ text: string; isError: boolean } | null>(null);
  const [isSavingAdminEmail, setIsSavingAdminEmail] = useState<boolean>(false);
  const allowedAdminEmails = useMemo(() => getAllowedAdminEmails(settings), [settings]);

  const handleAddAdminEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    setAdminEmailMsg(null);
    const cleanEmail = newAdminEmailInput.trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
      setAdminEmailMsg({ text: 'Format alamat email Google tidak valid.', isError: true });
      return;
    }
    if (allowedAdminEmails.includes(cleanEmail)) {
      setAdminEmailMsg({ text: 'Email tersebut sudah terdaftar sebagai Admin resmi.', isError: true });
      return;
    }
    setIsSavingAdminEmail(true);
    try {
      const extraEmails = allowedAdminEmails.filter((em) => em !== PRIMARY_ADMIN_EMAIL.toLowerCase());
      extraEmails.push(cleanEmail);
      const updated: AppSettings = { ...settings, adminEmails: extraEmails };
      await onUpdateSettings(updated);
      setFormData(updated);
      setNewAdminEmailInput('');
      setAdminEmailMsg({ text: `Email ${cleanEmail} ditambahkan ke daftar Admin resmi.`, isError: false });
      setTimeout(() => setAdminEmailMsg(null), 3500);
    } catch {
      setAdminEmailMsg({ text: 'Gagal menyimpan daftar Email Admin ke Cloud.', isError: true });
    } finally {
      setIsSavingAdminEmail(false);
    }
  };

  const handleRemoveAdminEmail = async (emailToRemove: string) => {
    const clean = emailToRemove.trim().toLowerCase();
    if (clean === PRIMARY_ADMIN_EMAIL.toLowerCase()) return;
    setAdminEmailMsg(null);
    setIsSavingAdminEmail(true);
    try {
      const extraEmails = allowedAdminEmails.filter(
        (em) => em !== PRIMARY_ADMIN_EMAIL.toLowerCase() && em !== clean
      );
      const updated: AppSettings = { ...settings, adminEmails: extraEmails };
      await onUpdateSettings(updated);
      setFormData(updated);
      setAdminEmailMsg({ text: `Email ${clean} dihapus dari akses Admin.`, isError: false });
      setTimeout(() => setAdminEmailMsg(null), 3500);
    } catch {
      setAdminEmailMsg({ text: 'Gagal memperbarui daftar Email Admin.', isError: true });
    } finally {
      setIsSavingAdminEmail(false);
    }
  };

  // Cloud Backups & Monthly Archives States
  const [cloudBackupsList, setCloudBackupsList] = useState<AppBackup[]>([]);
  const [monthlyArchivesList, setMonthlyArchivesList] = useState<MonthlyArchive[]>([]);
  const [isLoadingCloudSnapshots, setIsLoadingCloudSnapshots] = useState<boolean>(false);
  const [isCreatingCloudSnapshot, setIsCreatingCloudSnapshot] = useState<boolean>(false);
  const [isRestoringCloudId, setIsRestoringCloudId] = useState<string | null>(null);
  const [backupStatusBanner, setBackupStatusBanner] = useState<{ text: string; tone: 'success' | 'error' } | null>(null);
  const [pendingConfirmAction, setPendingConfirmAction] = useState<
    | { type: 'restore_cloud'; backup: AppBackup }
    | { type: 'delete_cloud'; backupId: string }
    | { type: 'delete_archive'; archiveId: string }
    | { type: 'reset_all' }
    | { type: 'load_sample' }
    | null
  >(null);
  const [resetConfirmText, setResetConfirmText] = useState<string>('');
  const [selectedArchiveYearMonth, setSelectedArchiveYearMonth] = useState<string>(
    getTodayDateIso().slice(0, 7)
  );

  const showBackupNotice = (text: string, tone: 'success' | 'error' = 'success') => {
    setBackupStatusBanner({ text, tone });
    setTimeout(() => {
      setBackupStatusBanner((prev) => (prev?.text === text ? null : prev));
    }, 4500);
  };

  const loadCloudBackupsAndArchives = useCallback(async () => {
    setIsLoadingCloudSnapshots(true);
    try {
      const [backups, archives] = await Promise.all([
        getCloudBackups(),
        getMonthlyArchivesCloud(),
      ]);
      setCloudBackupsList(backups);
      setMonthlyArchivesList(archives);
    } catch (err) {
      console.warn('Failed to load cloud backups/archives:', err);
    } finally {
      setIsLoadingCloudSnapshots(false);
    }
  }, []);

  useEffect(() => {
    if (isAdminUnlocked) {
      loadCloudBackupsAndArchives();
    }
  }, [isAdminUnlocked, loadCloudBackupsAndArchives]);

  // Create Manual Cloud Snapshot
  const handleCreateManualCloudSnapshot = async () => {
    setIsCreatingCloudSnapshot(true);
    const activeMasterSaldo = Number(settings.saldoAwalKas) || 0;
    const totalKasCalculated =
      activeMasterSaldo +
      allRecords.reduce((s, r) => s + (r.status === 'kosong' || r.status === 'lewat' ? 0 : Number(r.nominal) || 0), 0) +
      allMutations.filter((m) => m.jenis === 'masuk').reduce((s, m) => s + (Number(m.nominal) || 0), 0) -
      allMutations.filter((m) => m.jenis === 'keluar').reduce((s, m) => s + (Number(m.nominal) || 0), 0);

    const backupId = `manual-snapshot-${Date.now()}`;
    const backupObj: AppBackup = {
      id: backupId,
      timestamp: Date.now(),
      createdAtIso: new Date().toISOString(),
      source: 'manual',
      stats: {
        wargaCount: allWarga.length,
        recordsCount: allRecords.length,
        mutationsCount: allMutations.length,
        reguCount: reguList.length,
        totalKas: totalKasCalculated,
      },
      data: {
        settings: { ...settings, ...formData, saldoAwalKas: activeMasterSaldo },
        warga: allWarga,
        records: allRecords,
        mutations: allMutations,
        regu: reguList,
      },
    };

    try {
      await saveCloudBackup(backupObj);
      showBackupNotice('Berhasil membuat Snapshot Cadangan Cloud RT!', 'success');
      await loadCloudBackupsAndArchives();
    } catch {
      showBackupNotice('Gagal menyimpan snapshot cloud. Periksa koneksi internet.', 'error');
    } finally {
      setIsCreatingCloudSnapshot(false);
    }
  };

  // Execute Confirmed Cloud Restore (reassembles multi-part chunks cleanly)
  const executeRestoreCloudSnapshot = async (backup: AppBackup) => {
    setIsRestoringCloudId(backup.id);
    try {
      const fullBackup = await resolveFullCloudBackup(backup);
      onRestoreFullBackup({
        settings: fullBackup.data.settings,
        allWarga: fullBackup.data.warga,
        allRecords: fullBackup.data.records,
        allMutations: fullBackup.data.mutations,
        reguList: fullBackup.data.regu,
        moneyCounts: fullBackup.data.moneyCounts,
        sessions: fullBackup.data.sessions,
      });
      showBackupNotice(
        `Pemulihan selesai (${fullBackup.data.warga?.length || 0} rumah, ${fullBackup.data.records?.length || 0} catatan).`,
        'success'
      );
    } catch {
      showBackupNotice('Gagal memulihkan cadangan dari Cloud.', 'error');
    } finally {
      setIsRestoringCloudId(null);
    }
  };

  // Execute Confirmed Cloud Snapshot Delete
  const executeDeleteCloudSnapshot = async (backupId: string) => {
    try {
      await deleteCloudBackup(backupId);
      setCloudBackupsList((prev) => prev.filter((b) => b.id !== backupId));
      showBackupNotice('Snapshot cloud berhasil dihapus.', 'success');
    } catch {
      showBackupNotice('Gagal menghapus snapshot cloud.', 'error');
    }
  };

  // Create Monthly Archive
  const handleCreateMonthlyArchiveSnapshot = async () => {
    const ym = selectedArchiveYearMonth;
    const [year, month] = ym.split('-').map(Number);
    const dateObj = new Date(year, month - 1, 1);
    const monthLabel = dateObj.toLocaleDateString('id-ID', { month: 'long', year: 'numeric' });

    const monthRecords = allRecords.filter((r) => r.tanggal && r.tanggal.startsWith(ym));
    const monthMutations = allMutations.filter((m) => {
      const tgl = m.tanggal ? m.tanggal.split('T')[0] : m.createdAt ? formatLocalDateIsoFromMs(m.createdAt) : '';
      return tgl.startsWith(ym);
    });

    const totalTerkumpul = monthRecords.reduce((sum, r) => sum + (r.nominal || 0), 0);
    let totalTarget = 0;
    let totalKurangBayar = 0;
    let totalLebihBayar = 0;
    allWarga.forEach((w) => {
      const dist = calculateWargaMonthDistribution(w, allRecords, ym, settings);
      totalTarget += dist.targetBulan;
      totalKurangBayar += dist.nominalKurang;
      totalLebihBayar += dist.nominalLebih;
    });
    const totalPemasukanMutasi = monthMutations.filter((m) => m.jenis === 'masuk').reduce((sum, m) => sum + (m.nominal || 0), 0);
    const totalPengeluaranMutasi = monthMutations.filter((m) => m.jenis === 'keluar').reduce((sum, m) => sum + (m.nominal || 0), 0);

    const archiveObj: MonthlyArchive = {
      id: `archive-${ym}`,
      yearMonth: ym,
      monthLabel,
      totalWarga: allWarga.length,
      totalTarget,
      totalTerkumpul,
      totalKurangBayar,
      totalLebihBayar,
      saldoAwalBulan: Number(settings.saldoAwalKas) || 0,
      totalPemasukanMutasi,
      totalPengeluaranMutasi,
      saldoAkhirBulan: (Number(settings.saldoAwalKas) || 0) + totalTerkumpul + totalPemasukanMutasi - totalPengeluaranMutasi,
      recordsCount: monthRecords.length,
      archivedAt: Date.now(),
    };

    try {
      await saveMonthlyArchiveCloud(archiveObj);
      showBackupNotice(`Arsip Bulanan (${monthLabel}) berhasil disimpan ke Cloud!`, 'success');
      loadCloudBackupsAndArchives();
    } catch {
      showBackupNotice('Gagal membuat arsip bulanan.', 'error');
    }
  };

  // Delete Monthly Archive
  const executeDeleteMonthlyArchive = async (archiveId: string) => {
    try {
      await deleteMonthlyArchiveCloud(archiveId);
      setMonthlyArchivesList((prev) => prev.filter((a) => a.id !== archiveId));
      showBackupNotice('Arsip bulanan berhasil dihapus.', 'success');
    } catch {
      showBackupNotice('Gagal menghapus arsip bulanan.', 'error');
    }
  };

  // Export full JSON Backup
  const handleExportBackup = () => {
    try {
      const backupObj = {
        version: '1.0',
        exportedAt: new Date().toISOString(),
        settings,
        reguList,
        allWarga,
        allRecords,
        allMutations,
      };

      const jsonStr = JSON.stringify(backupObj, null, 2);
      const blob = new Blob([jsonStr], { type: 'application/json;charset=utf-8;' });
      triggerFileDownloadOrShare(
        blob,
        `Backup_Jimpitan_${settings?.namaRt || 'RT08'}_${getTodayDateIso()}.json`
      );
      showBackupNotice('File cadangan JSON berhasil disiapkan.', 'success');
    } catch (err) {
      notifyDownloadError('Gagal mengunduh file cadangan JSON.', err);
    }
  };

  // Restore JSON Backup
  const handleImportBackup = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const parsed = JSON.parse(event.target?.result as string);
        if (parsed.allWarga && parsed.settings) {
          onRestoreFullBackup(parsed);
          showBackupNotice('Data berhasil dipulihkan dari file cadangan JSON!', 'success');
        } else {
          showBackupNotice('Format file cadangan JSON tidak valid.', 'error');
        }
      } catch {
        showBackupNotice('Gagal membaca file cadangan JSON.', 'error');
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const handleConfirmPendingAction = async () => {
    const action = pendingConfirmAction;
    if (!action) return;
    if (action.type === 'reset_all' && resetConfirmText.trim().toUpperCase() !== 'RESET') {
      return;
    }
    setPendingConfirmAction(null);
    setResetConfirmText('');

    if (action.type === 'restore_cloud') {
      await executeRestoreCloudSnapshot(action.backup);
    } else if (action.type === 'delete_cloud') {
      await executeDeleteCloudSnapshot(action.backupId);
    } else if (action.type === 'delete_archive') {
      await executeDeleteMonthlyArchive(action.archiveId);
    } else if (action.type === 'reset_all') {
      onResetAllData();
      loadCloudBackupsAndArchives();
    } else if (action.type === 'load_sample') {
      onLoadSampleData();
    }
  };

  return (
    <div className="w-full space-y-4 pb-12" id="menu-pengaturan-view-root">
      {/* 1. Header with Badge */}
      <div className="bg-white rounded-3xl border border-sky-100 p-4 sm:p-5 shadow-sm space-y-1">
        <span className="inline-block px-3 py-1 rounded-xl bg-sky-50 border border-sky-200 text-sky-950 font-extrabold text-[11px] uppercase tracking-wider">
          MENU & FITUR RT
        </span>
        <h2 className="text-xl sm:text-2xl font-extrabold text-stone-900 tracking-tight font-sans">
          Navigasi Lengkap
        </h2>
      </div>

      {/* 2. Menu Item Cards */}
      <div className="space-y-3">
        {/* === PROMINENT LAPORAN & REKAPITULASI RT SECTION (KHUSUS MODE ADMIN / PETUGAS) === */}
        {isAdminUnlocked && (
          <div className="p-4 sm:p-5 rounded-3xl bg-gradient-to-br from-slate-900 via-sky-950 to-slate-900 text-white border border-sky-800/40 shadow-md space-y-3.5 animate-in fade-in" id="menu-laporan-admin-section">
            <div className="flex items-center justify-between border-b border-white/10 pb-2.5">
              <div className="flex items-center space-x-2.5">
                <div className="p-2 rounded-xl bg-sky-500/20 text-sky-300">
                  <FileText className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center space-x-2">
                    <h3 className="font-black text-base text-white tracking-tight">
                      Laporan & Rekapitulasi RT
                    </h3>
                    <span className="px-2 py-0.5 rounded-full bg-amber-400/20 text-amber-300 border border-amber-400/30 text-[10px] font-extrabold">
                      Mode Admin
                    </span>
                  </div>
                  <p className="text-xs text-sky-200/70">
                    Cetak PDF Resmi (Bendahara & Ketua RT), Unduh Excel (.xlsx) & Bagikan WA
                  </p>
                </div>
              </div>

              <div className="flex items-center space-x-1.5">
                <button
                  type="button"
                  onClick={handleExportCsvMenu}
                  className="px-2.5 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 border border-white/15 text-white font-bold text-xs flex items-center space-x-1 transition-colors cursor-pointer"
                  title="Unduh Data Mentah Format CSV"
                  id="btn-menu-export-csv"
                >
                  <Download className="w-3.5 h-3.5 text-sky-300" />
                  <span>CSV</span>
                </button>
                {onOpenLaporanHub && (
                  <button
                    onClick={() => onOpenLaporanHub('kas')}
                    className="px-3 py-1.5 rounded-xl bg-sky-500 hover:bg-sky-400 text-white font-extrabold text-xs flex items-center space-x-1 shadow-xs transition-colors cursor-pointer"
                    title="Buka Pusat Hub Laporan RT"
                  >
                    <span>Pusat Hub</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>

            {/* BAR MENU CEPAT: PRATINJAU PDF, UNDUH EXCEL, KIRIM WA, PUSAT HUB */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-0.5">
              {/* Button 1: Pratinjau & Cetak PDF (2 TTD) */}
              <button
                type="button"
                onClick={() => setIsPdfModalOpen(true)}
                className="p-2.5 rounded-2xl bg-sky-600/90 hover:bg-sky-500 text-white border border-sky-400/30 flex items-center space-x-2 text-left transition-all shadow-xs cursor-pointer group"
                title="Buka Pratinjau Dokumen PDF Resmi Lengkap 2 Tanda Tangan (Bendahara & Ketua RT)"
                id="btn-menu-preview-pdf"
              >
                <div className="p-1.5 rounded-xl bg-sky-400/20 text-sky-200 group-hover:scale-110 transition-transform shrink-0">
                  <Printer className="w-4 h-4" />
                </div>
                <div className="min-w-0">
                  <span className="text-xs font-black block text-white leading-tight truncate">Pratinjau PDF</span>
                  <span className="text-[9px] text-sky-200/80 block leading-tight">2 TTD Resmi</span>
                </div>
              </button>

              {/* Button 2: Unduh Excel Kas (.xlsx) */}
              <button
                type="button"
                onClick={handleExportKasExcel}
                disabled={isExportingKasExcel}
                className="p-2.5 rounded-2xl bg-emerald-600/90 hover:bg-emerald-500 text-white border border-emerald-400/30 flex items-center space-x-2 text-left transition-all shadow-xs cursor-pointer group"
                title="Unduh Lembar Kerja Excel (.xlsx) Kas RT dengan Kop Surat & 2 TTD"
                id="btn-menu-excel-kas"
              >
                <div className="p-1.5 rounded-xl bg-emerald-400/20 text-emerald-200 group-hover:scale-110 transition-transform shrink-0">
                  <FileSpreadsheet className="w-4 h-4" />
                </div>
                <div className="min-w-0">
                  <span className="text-xs font-black block text-white leading-tight truncate">
                    {isExportingKasExcel ? 'Menyiapkan...' : 'Excel Kas'}
                  </span>
                  <span className="text-[9px] text-emerald-200/80 block leading-tight">Format .xlsx Rapi</span>
                </div>
              </button>

              {/* Button 3: Unduh Excel Matriks (1-31) */}
              <button
                type="button"
                onClick={handleExportMatriksExcel}
                disabled={isExportingMatriksExcel}
                className="p-2.5 rounded-2xl bg-indigo-600/90 hover:bg-indigo-500 text-white border border-indigo-400/30 flex items-center space-x-2 text-left transition-all shadow-xs cursor-pointer group"
                title="Unduh Tabel Matriks Jimpitan Bulanan Format Excel .xlsx"
                id="btn-menu-excel-matriks"
              >
                <div className="p-1.5 rounded-xl bg-indigo-400/20 text-indigo-200 group-hover:scale-110 transition-transform shrink-0">
                  <CalendarIcon className="w-4 h-4" />
                </div>
                <div className="min-w-0">
                  <span className="text-xs font-black block text-white leading-tight truncate">
                    {isExportingMatriksExcel ? 'Menyiapkan...' : 'Excel Matriks'}
                  </span>
                  <span className="text-[9px] text-indigo-200/80 block leading-tight">Matriks 1-31 Warga</span>
                </div>
              </button>

              {/* Button 4: Kirim WA Rekap RT */}
              <button
                type="button"
                onClick={() => onOpenShareModal && onOpenShareModal('laporan')}
                className="p-2.5 rounded-2xl bg-teal-600/90 hover:bg-teal-500 text-white border border-teal-400/30 flex items-center space-x-2 text-left transition-all shadow-xs cursor-pointer group"
                title="Bagikan Ringkasan Laporan ke WhatsApp Grup Warga"
                id="btn-menu-share-wa"
              >
                <div className="p-1.5 rounded-xl bg-teal-400/20 text-teal-200 group-hover:scale-110 transition-transform shrink-0">
                  <Share2 className="w-4 h-4" />
                </div>
                <div className="min-w-0">
                  <span className="text-xs font-black block text-white leading-tight truncate">Kirim WA</span>
                  <span className="text-[9px] text-teal-200/80 block leading-tight">Grup Warga RT</span>
                </div>
              </button>
            </div>

            {/* 4 Direct Report Triggers Grid */}
            <div className="grid grid-cols-2 gap-2.5 pt-1">
              {/* 1. Laporan Kas */}
              <button
                onClick={() => onOpenLaporanHub && onOpenLaporanHub('kas')}
                className="p-3 rounded-2xl bg-white/10 hover:bg-white/20 border border-white/10 text-left transition-all group cursor-pointer"
              >
                <div className="flex items-center space-x-2 text-sky-300 mb-1">
                  <Wallet className="w-4 h-4 group-hover:scale-110 transition-transform" />
                  <span className="text-xs font-extrabold text-white">Laporan Kas</span>
                </div>
                <p className="text-[10px] text-slate-300 leading-tight">
                  Buku kas & saldo RT
                </p>
              </button>

              {/* 2. Laporan Kurang/Lebih Bayar Warga */}
              <button
                onClick={() => onOpenLaporanHub && onOpenLaporanHub('tunggakan')}
                className="p-3 rounded-2xl bg-white/10 hover:bg-white/20 border border-white/10 text-left transition-all group cursor-pointer"
              >
                <div className="flex items-center space-x-2 text-amber-300 mb-1">
                  <Users className="w-4 h-4 group-hover:scale-110 transition-transform" />
                  <span className="text-xs font-extrabold text-white">Kurang/Lebih Bayar</span>
                </div>
                <p className="text-[10px] text-slate-300 leading-tight">
                  Status tunggakan & deposit
                </p>
              </button>

              {/* 3. Laporan Pemasukan */}
              <button
                onClick={() => onOpenLaporanHub && onOpenLaporanHub('pemasukan')}
                className="p-3 rounded-2xl bg-white/10 hover:bg-white/20 border border-white/10 text-left transition-all group cursor-pointer"
              >
                <div className="flex items-center space-x-2 text-emerald-300 mb-1">
                  <TrendingUp className="w-4 h-4 group-hover:scale-110 transition-transform" />
                  <span className="text-xs font-extrabold text-white">Laporan Pemasukan</span>
                </div>
                <p className="text-[10px] text-slate-300 leading-tight">
                  Jimpitan & donasi masuk
                </p>
              </button>

              {/* 4. Laporan Pengeluaran */}
              <button
                onClick={() => onOpenLaporanHub && onOpenLaporanHub('pengeluaran')}
                className="p-3 rounded-2xl bg-white/10 hover:bg-white/20 border border-white/10 text-left transition-all group cursor-pointer"
              >
                <div className="flex items-center space-x-2 text-rose-300 mb-1">
                  <TrendingDown className="w-4 h-4 group-hover:scale-110 transition-transform" />
                  <span className="text-xs font-extrabold text-white">Laporan Pengeluaran</span>
                </div>
                <p className="text-[10px] text-slate-300 leading-tight">
                  Rincian nota belanja RT
                </p>
              </button>
            </div>

            {/* 5. Laporan Bulanan Pertanggal (1-31 Hari) */}
            <button
              onClick={() => onOpenLaporanHub && onOpenLaporanHub('bulanan')}
              className="w-full p-3 rounded-2xl bg-indigo-500/20 hover:bg-indigo-500/30 border border-indigo-400/30 flex items-center justify-between text-left transition-all cursor-pointer"
            >
              <div className="flex items-center space-x-2.5 text-indigo-200">
                <CalendarIcon className="w-4.5 h-4.5 text-indigo-300" />
                <div>
                  <span className="text-xs font-black text-white block leading-tight">
                    Laporan Bulanan Pertanggal (Matriks 1-31)
                  </span>
                  <span className="text-[10px] text-indigo-200/80">
                    Matriks presensi & setoran seluruh rumah A4 Landscape
                  </span>
                </div>
              </div>
              <ChevronRight className="w-4 h-4 text-indigo-300" />
            </button>

            {/* 6. Cetak & Unduh QR Barcode Warga (Bisa Edit Ukuran) */}
            <button
              onClick={() => setIsCetakQrModalOpen(true)}
              className="w-full p-3 rounded-2xl bg-sky-500/25 hover:bg-sky-500/35 border border-sky-400/40 flex items-center justify-between text-left transition-all cursor-pointer group"
              id="btn-menu-cetak-qr-barcode"
            >
              <div className="flex items-center space-x-2.5 text-sky-200">
                <div className="p-1.5 rounded-xl bg-sky-400/20 text-sky-300 group-hover:scale-110 transition-transform">
                  <QrCode className="w-4.5 h-4.5" />
                </div>
                <div>
                  <span className="text-xs font-black text-white block leading-tight">
                    Cetak & Unduh QR Barcode Warga (Siap Cetak A4)
                  </span>
                  <span className="text-[10px] text-sky-200/80">
                    Bisa atur ukuran barcode (Kecil/Sedang/Besar), pilih rumah & unduh PDF
                  </span>
                </div>
              </div>
              <ChevronRight className="w-4 h-4 text-sky-300" />
            </button>
          </div>
        )}

        <div className="text-[10px] font-extrabold uppercase tracking-wider text-stone-500 pt-1">
          Operasional & Fitur Utama
        </div>

        {/* 1. Scan & Input Jimpitan */}
        <button
          onClick={() => onNavigate('scan')}
          className="w-full p-3.5 rounded-2xl bg-white border border-stone-200/80 hover:border-sky-300 hover:bg-sky-50/40 flex items-center justify-between gap-3 text-left transition-all shadow-2xs cursor-pointer group"
          id="menu-item-scan"
        >
          <div className="flex items-center space-x-3 min-w-0">
            <div className="w-11 h-11 rounded-2xl bg-sky-50 text-sky-600 border border-sky-100 flex items-center justify-center flex-shrink-0 group-hover:scale-105 transition-transform">
              <QrCode className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <h3 className="font-bold text-stone-900 text-sm tracking-tight">
                Scan & Input Jimpitan
              </h3>
              <p className="text-xs text-stone-500 truncate">
                Kamera scanner & input penarikan jimpitan
              </p>
            </div>
          </div>
          <ChevronRight className="w-5 h-5 text-stone-400 group-hover:text-sky-600 transition-colors flex-shrink-0" />
        </button>

        {/* 2. Rekap Kas & Laporan */}
        <button
          onClick={() => onNavigate('kas_rekap')}
          className="w-full p-3.5 rounded-2xl bg-white border border-stone-200/80 hover:border-sky-300 hover:bg-sky-50/40 flex items-center justify-between gap-3 text-left transition-all shadow-2xs cursor-pointer group"
          id="menu-item-kas"
        >
          <div className="flex items-center space-x-3 min-w-0">
            <div className="w-11 h-11 rounded-2xl bg-sky-50 text-sky-600 border border-sky-100 flex items-center justify-center flex-shrink-0 group-hover:scale-105 transition-transform">
              <BarChart3 className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <h3 className="font-bold text-stone-900 text-sm tracking-tight">
                Rekap Kas & Laporan RT
              </h3>
              <p className="text-xs text-stone-500 truncate">
                Grafik tren & buku riwayat kas RT
              </p>
            </div>
          </div>
          <ChevronRight className="w-5 h-5 text-stone-400 group-hover:text-sky-600 transition-colors flex-shrink-0" />
        </button>

        {/* 3. Rekap Piutang & Tunggakan Warga (Khusus Mode Admin) */}
        {isAdminUnlocked && (
          <button
            onClick={() => onNavigate('rekap_piutang')}
            className="w-full p-3.5 rounded-2xl bg-white border border-stone-200/80 hover:border-amber-300 hover:bg-amber-50/40 flex items-center justify-between gap-3 text-left transition-all shadow-2xs cursor-pointer group"
            id="menu-item-rekap-piutang"
          >
            <div className="flex items-center space-x-3 min-w-0">
              <div className="w-11 h-11 rounded-2xl bg-amber-50 text-amber-600 border border-amber-200 flex items-center justify-center flex-shrink-0 group-hover:scale-105 transition-transform">
                <Receipt className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <h3 className="font-bold text-stone-900 text-sm tracking-tight">
                  Rekap Piutang & Tunggakan Warga
                </h3>
                <p className="text-xs text-stone-500 truncate">
                  Filter per tahun, status hutang lampau & penagihan WA
                </p>
              </div>
            </div>
            <ChevronRight className="w-5 h-5 text-stone-400 group-hover:text-amber-600 transition-colors flex-shrink-0" />
          </button>
        )}

        {/* 4. Data Warga & Rumah */}
        <button
          onClick={() => onNavigate('data_warga')}
          className="w-full p-3.5 rounded-2xl bg-white border border-stone-200/80 hover:border-sky-300 hover:bg-sky-50/40 flex items-center justify-between gap-3 text-left transition-all shadow-2xs cursor-pointer group"
          id="menu-item-warga"
        >
          <div className="flex items-center space-x-3 min-w-0">
            <div className="w-11 h-11 rounded-2xl bg-sky-50 text-sky-600 border border-sky-100 flex items-center justify-center flex-shrink-0 group-hover:scale-105 transition-transform">
              <Users className="w-5 h-5" />
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
          <ChevronRight className="w-5 h-5 text-stone-400 group-hover:text-sky-600 transition-colors flex-shrink-0" />
        </button>

        {/* 4. Hitung Pecahan Uang */}
        <button
          onClick={() => onNavigate('hitung_uang')}
          className="w-full p-3.5 rounded-2xl bg-white border-2 border-sky-300 hover:border-sky-400 hover:bg-amber-50/30 flex items-center justify-between gap-3 text-left transition-all shadow-2xs cursor-pointer group"
          id="menu-item-hitung-uang"
        >
          <div className="flex items-center space-x-3 min-w-0">
            <div className="w-11 h-11 rounded-2xl bg-amber-50 text-amber-600 border border-amber-200 flex items-center justify-center flex-shrink-0 group-hover:scale-105 transition-transform">
              <Calculator className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <h3 className="font-extrabold text-sky-950 text-sm tracking-tight">
                Hitung Pecahan Uang
              </h3>
              <p className="text-xs text-stone-500 truncate">
                Hitung koin & lembar kas fisik
              </p>
            </div>
          </div>
          <ChevronRight className="w-5 h-5 text-sky-600 transition-colors flex-shrink-0" />
        </button>

        {/* 5. Pengeluaran Kas */}
        <button
          onClick={onOpenPengeluaranKas}
          className="w-full p-3.5 rounded-2xl bg-white border border-stone-200/80 hover:border-rose-300 hover:bg-rose-50/40 flex items-center justify-between gap-3 text-left transition-all shadow-2xs cursor-pointer group"
          id="menu-item-pengeluaran-kas"
        >
          <div className="flex items-center space-x-3 min-w-0">
            <div className="w-11 h-11 rounded-2xl bg-rose-50 text-rose-600 border border-rose-100 flex items-center justify-center flex-shrink-0 group-hover:scale-105 transition-transform">
              <Wallet className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <h3 className="font-bold text-stone-900 text-sm tracking-tight">
                Pengeluaran Kas
              </h3>
              <p className="text-xs text-stone-500 truncate">
                Catat pengeluaran operasional & sosial RT
              </p>
            </div>
          </div>
          <ChevronRight className="w-5 h-5 text-stone-400 group-hover:text-rose-600 transition-colors flex-shrink-0" />
        </button>

        {/* 6. Cetak Kartu QR Rumah */}
        <button
          onClick={onOpenCetakQr}
          className="w-full p-3.5 rounded-2xl bg-white border border-stone-200/80 hover:border-indigo-300 hover:bg-indigo-50/40 flex items-center justify-between gap-3 text-left transition-all shadow-2xs cursor-pointer group"
          id="menu-item-cetak-qr"
        >
          <div className="flex items-center space-x-3 min-w-0">
            <div className="w-11 h-11 rounded-2xl bg-indigo-50 text-indigo-600 border border-indigo-100 flex items-center justify-center flex-shrink-0 group-hover:scale-105 transition-transform">
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

        {/* 7. Download & Bagikan ke Warga */}
        {onOpenInstallModal && (
          <button
            onClick={onOpenInstallModal}
            className="w-full p-3.5 rounded-2xl bg-gradient-to-r from-emerald-50 to-teal-50/60 border border-emerald-300 hover:border-emerald-400 flex items-center justify-between gap-3 text-left transition-all shadow-2xs cursor-pointer group"
            id="menu-item-download-share"
          >
            <div className="flex items-center space-x-3 min-w-0">
              <div className="w-11 h-11 rounded-2xl bg-emerald-600 text-white flex items-center justify-center flex-shrink-0 group-hover:scale-105 transition-transform shadow-xs">
                <Download className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <h3 className="font-extrabold text-emerald-950 text-sm tracking-tight flex items-center space-x-1.5">
                  <span>Download & Bagikan ke Warga</span>
                  <span className="px-1.5 py-0.5 rounded-md bg-emerald-200/80 text-emerald-900 text-[10px] font-black uppercase">PWA</span>
                </h3>
                <p className="text-xs text-emerald-700 truncate">
                  Pasang di layar HP & bagikan link via WhatsApp
                </p>
              </div>
            </div>
            <ChevronRight className="w-5 h-5 text-emerald-600 transition-colors flex-shrink-0" />
          </button>
        )}

        {/* 8. Panduan Penggunaan */}
        <button
          onClick={onOpenPanduan}
          className="w-full p-3.5 rounded-2xl bg-white border border-stone-200/80 hover:border-sky-300 hover:bg-sky-50/40 flex items-center justify-between gap-3 text-left transition-all shadow-2xs cursor-pointer group"
          id="menu-item-panduan"
        >
          <div className="flex items-center space-x-3 min-w-0">
            <div className="w-11 h-11 rounded-2xl bg-sky-100 text-sky-600 border border-sky-200 flex items-center justify-center flex-shrink-0 group-hover:scale-105 transition-transform">
              <BookOpen className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <h3 className="font-bold text-stone-900 text-sm tracking-tight">
                Panduan Penggunaan
              </h3>
              <p className="text-xs text-stone-500 truncate">
                Petunjuk cara pakai & SOP jimpitan RT
              </p>
            </div>
          </div>
          <ChevronRight className="w-5 h-5 text-stone-400 group-hover:text-sky-600 transition-colors flex-shrink-0" />
        </button>
      </div>

      {/* 3. Section Pengaturan Admin RT & PIN */}
      <div className="bg-white rounded-3xl border border-sky-100 p-4 sm:p-5 shadow-xs space-y-4" id="section-pengaturan-admin">
        <div className="flex items-center space-x-2.5 border-b border-stone-100 pb-3">
          <div className="w-10 h-10 rounded-2xl bg-amber-100 text-amber-800 border border-amber-200 flex items-center justify-center flex-shrink-0">
            <Shield className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-extrabold text-stone-900 text-sm sm:text-base">
              Pengaturan & Akses Pengurus RT
            </h3>
            <p className="text-xs text-stone-500">
              Konfigurasi lingkungan, saldo awal, dan PIN keamanan
            </p>
          </div>
        </div>

        {!isAdminUnlocked ? (
          /* LOCKED VIEW: Strict Email Verification + PIN Admin */
          <div className="bg-stone-50 border border-stone-200 rounded-2xl p-4 space-y-3">
            <div className="flex items-center space-x-2 text-stone-800 font-bold text-xs">
              <Lock className="w-4 h-4 text-amber-600" />
              <span>Akses Pengaturan Terkunci (Verifikasi Ketat)</span>
            </div>
            <p className="text-xs text-stone-500">
              Warga tidak dapat membuka pengaturan RT. Wajib verifikasi Email Google Admin resmi dan PIN Pengurus RT.
            </p>

            <AdminEmailVerificationCard
              settings={settings}
              verifiedEmail={verifiedAdminEmail}
              onVerified={(email) => {
                setPinError('');
                if (onEmailVerified) onEmailVerified(email);
              }}
              onResetVerified={onResetVerified}
              accentTone="amber"
            />

            <form onSubmit={handleUnlockSubmit} className="space-y-3">
              {pinError && (
                <div className="p-2.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-bold flex items-center space-x-1.5 animate-in fade-in">
                  <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                  <span>{pinError}</span>
                </div>
              )}

              <div>
                <label className="block text-[10px] font-black uppercase tracking-wider text-stone-600 mb-1">
                  Langkah 2 • PIN Admin RT
                </label>
                <div className="relative">
                  <input
                    type={showPin ? 'text' : 'password'}
                    inputMode="numeric"
                    maxLength={8}
                    value={inputPin}
                    onChange={(e) => {
                      setInputPin(e.target.value);
                      setPinError('');
                    }}
                    placeholder="Ketik PIN Admin..."
                    className="w-full pl-3.5 pr-10 py-2.5 rounded-xl bg-white border border-stone-300 font-bold text-stone-900 text-xs sm:text-sm outline-none focus:ring-2 focus:ring-amber-500"
                    autoComplete="off"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPin(!showPin)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-700"
                  >
                    {showPin ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={!verifiedAdminEmail}
                className="w-full py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 disabled:opacity-50 disabled:cursor-not-allowed text-white font-extrabold text-xs sm:text-sm tracking-wide shadow-xs transition-all flex items-center justify-center space-x-2 cursor-pointer"
                id="btn-submit-unlock-admin"
              >
                <Unlock className="w-4 h-4" />
                <span>BUKA AKSES PENGURUS</span>
              </button>
            </form>
          </div>
        ) : (
          /* UNLOCKED VIEW: FULL CONTROLS & DEDICATED PIN CARD */
          <div className="space-y-4">
            {/* Admin Status Banner */}
            <div className="p-3 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-900 flex items-center justify-between gap-2">
              <div className="flex items-center space-x-2 min-w-0">
                <ShieldCheck className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                <div className="min-w-0">
                  <span className="text-xs font-extrabold block truncate">
                    Mode Pengurus / Admin RT Aktif
                  </span>
                  {verifiedAdminEmail && (
                    <span className="text-[10px] font-bold text-emerald-700 block truncate">
                      Terverifikasi: {verifiedAdminEmail}
                    </span>
                  )}
                </div>
              </div>
              <button
                type="button"
                onClick={onLockApp}
                className="px-2.5 py-1 rounded-lg bg-white border border-emerald-300 hover:bg-emerald-100 text-emerald-800 text-xs font-bold transition-colors cursor-pointer flex-shrink-0"
              >
                Kunci Kembali
              </button>
            </div>

            {/* DEDICATED RESPONSIVE CARD: UBAH PIN ADMIN & PENGINPUT */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* Card PIN Admin */}
              <div className="bg-gradient-to-br from-amber-50/90 via-orange-50/40 to-white rounded-2xl border-2 border-amber-200/90 p-3.5 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <KeyRound className="w-4 h-4 text-amber-600" />
                    <h4 className="text-xs sm:text-sm font-extrabold text-amber-950">
                      PIN Admin (Pengurus RT)
                    </h4>
                  </div>
                  <span className="text-[10px] font-bold text-amber-800 bg-amber-200/80 px-2 py-0.5 rounded-full">
                    Akses Penuh
                  </span>
                </div>

                {pinChangeMsg && (
                  <div
                    className={`p-2 rounded-xl border text-[11px] font-bold flex items-center space-x-1.5 animate-in fade-in ${
                      pinChangeMsg.isError
                        ? 'bg-rose-50 border-rose-200 text-rose-800'
                        : 'bg-emerald-50 border-emerald-200 text-emerald-800'
                    }`}
                  >
                    {pinChangeMsg.isError ? (
                      <AlertCircle className="w-3.5 h-3.5 text-rose-600 shrink-0" />
                    ) : (
                      <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                    )}
                    <span>{pinChangeMsg.text}</span>
                  </div>
                )}

                <form onSubmit={handleQuickChangePin} className="space-y-2">
                  <div>
                    <label className="block text-[10px] font-bold text-stone-700 mb-0.5">
                      PIN Admin Lama
                    </label>
                    <input
                      type="password"
                      inputMode="numeric"
                      maxLength={8}
                      value={currentPinInput}
                      onChange={(e) => setCurrentPinInput(e.target.value)}
                      placeholder="PIN Lama..."
                      className="w-full px-2.5 py-1.5 rounded-xl bg-white border border-stone-300 font-bold text-stone-900 text-xs outline-none focus:ring-2 focus:ring-amber-500"
                      required
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-1.5">
                    <div>
                      <label className="block text-[10px] font-bold text-stone-700 mb-0.5">
                        PIN Baru
                      </label>
                      <input
                        type={showNewPin ? 'text' : 'password'}
                        inputMode="numeric"
                        maxLength={8}
                        value={newPinInput}
                        onChange={(e) => setNewPinInput(e.target.value)}
                        placeholder="PIN Baru"
                        className="w-full px-2.5 py-1.5 rounded-xl bg-white border border-stone-300 font-bold text-stone-900 text-xs outline-none focus:ring-2 focus:ring-amber-500"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-stone-700 mb-0.5">
                        Konfirmasi
                      </label>
                      <input
                        type={showNewPin ? 'text' : 'password'}
                        inputMode="numeric"
                        maxLength={8}
                        value={confirmPinInput}
                        onChange={(e) => setConfirmPinInput(e.target.value)}
                        placeholder="Ulangi"
                        className="w-full px-2.5 py-1.5 rounded-xl bg-white border border-stone-300 font-bold text-stone-900 text-xs outline-none focus:ring-2 focus:ring-amber-500"
                        required
                      />
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-1">
                    <button
                      type="button"
                      onClick={() => setShowNewPin(!showNewPin)}
                      className="text-[10px] text-stone-500 hover:text-stone-800 font-semibold flex items-center space-x-1"
                    >
                      {showNewPin ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3 text-amber-600" />}
                      <span>{showNewPin ? 'Sembunyikan' : 'Lihat'}</span>
                    </button>

                    <button
                      type="submit"
                      disabled={isPinSaving}
                      className="px-3 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-600 disabled:opacity-60 text-white font-extrabold text-xs flex items-center space-x-1 shadow-2xs transition-all cursor-pointer"
                    >
                      {isPinSaving ? <RefreshCw className="w-3 h-3 animate-spin" /> : <Check className="w-3 h-3" />}
                      <span>Simpan PIN Admin</span>
                    </button>
                  </div>
                </form>
              </div>

              {/* Card PIN Penginput */}
              <div className="bg-gradient-to-br from-sky-50/90 via-cyan-50/40 to-white rounded-2xl border-2 border-sky-200/90 p-3.5 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <QrCode className="w-4 h-4 text-sky-600" />
                    <h4 className="text-xs sm:text-sm font-extrabold text-sky-950">
                      PIN Penginput (Ronda Lapangan)
                    </h4>
                  </div>
                  <span className="text-[10px] font-bold text-sky-800 bg-sky-200/80 px-2 py-0.5 rounded-full">
                    Scan & Kas
                  </span>
                </div>

                {penginputPinChangeMsg && (
                  <div
                    className={`p-2 rounded-xl border text-[11px] font-bold flex items-center space-x-1.5 animate-in fade-in ${
                      penginputPinChangeMsg.isError
                        ? 'bg-rose-50 border-rose-200 text-rose-800'
                        : 'bg-emerald-50 border-emerald-200 text-emerald-800'
                    }`}
                  >
                    {penginputPinChangeMsg.isError ? (
                      <AlertCircle className="w-3.5 h-3.5 text-rose-600 shrink-0" />
                    ) : (
                      <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                    )}
                    <span>{penginputPinChangeMsg.text}</span>
                  </div>
                )}

                <form onSubmit={handleQuickChangePenginputPin} className="space-y-2">
                  <div>
                    <label className="block text-[10px] font-bold text-stone-700 mb-0.5">
                      PIN Penginput Lama
                    </label>
                    <input
                      type="password"
                      inputMode="numeric"
                      maxLength={8}
                      value={currentPenginputPinInput}
                      onChange={(e) => setCurrentPenginputPinInput(e.target.value)}
                      placeholder="PIN Lama..."
                      className="w-full px-2.5 py-1.5 rounded-xl bg-white border border-stone-300 font-bold text-stone-900 text-xs outline-none focus:ring-2 focus:ring-sky-500"
                      required
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-1.5">
                    <div>
                      <label className="block text-[10px] font-bold text-stone-700 mb-0.5">
                        PIN Baru
                      </label>
                      <input
                        type={showNewPenginputPin ? 'text' : 'password'}
                        inputMode="numeric"
                        maxLength={8}
                        value={newPenginputPinInput}
                        onChange={(e) => setNewPenginputPinInput(e.target.value)}
                        placeholder="PIN Baru"
                        className="w-full px-2.5 py-1.5 rounded-xl bg-white border border-stone-300 font-bold text-stone-900 text-xs outline-none focus:ring-2 focus:ring-sky-500"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-stone-700 mb-0.5">
                        Konfirmasi
                      </label>
                      <input
                        type={showNewPenginputPin ? 'text' : 'password'}
                        inputMode="numeric"
                        maxLength={8}
                        value={confirmPenginputPinInput}
                        onChange={(e) => setConfirmPenginputPinInput(e.target.value)}
                        placeholder="Ulangi"
                        className="w-full px-2.5 py-1.5 rounded-xl bg-white border border-stone-300 font-bold text-stone-900 text-xs outline-none focus:ring-2 focus:ring-sky-500"
                        required
                      />
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-1">
                    <button
                      type="button"
                      onClick={() => setShowNewPenginputPin(!showNewPenginputPin)}
                      className="text-[10px] text-stone-500 hover:text-stone-800 font-semibold flex items-center space-x-1"
                    >
                      {showNewPenginputPin ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3 text-sky-600" />}
                      <span>{showNewPenginputPin ? 'Sembunyikan' : 'Lihat'}</span>
                    </button>

                    <button
                      type="submit"
                      disabled={isPenginputPinSaving}
                      className="px-3 py-1.5 rounded-xl bg-sky-600 hover:bg-sky-700 disabled:opacity-60 text-white font-extrabold text-xs flex items-center space-x-1 shadow-2xs transition-all cursor-pointer"
                    >
                      {isPenginputPinSaving ? <RefreshCw className="w-3 h-3 animate-spin" /> : <Check className="w-3 h-3" />}
                      <span>Simpan PIN Penginput</span>
                    </button>
                  </div>
                </form>
              </div>
            </div>

            {/* DEDICATED CARD: EMAIL ADMIN RESMI (VERIFIKASI KETAT) */}
            <div className="bg-gradient-to-br from-emerald-50/80 via-teal-50/30 to-white rounded-2xl border-2 border-emerald-200/90 p-3.5 space-y-3">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center space-x-2">
                  <Mail className="w-4 h-4 text-emerald-700" />
                  <h4 className="text-xs sm:text-sm font-extrabold text-emerald-950">
                    Daftar Email Google Admin Resmi
                  </h4>
                </div>
                <span className="text-[10px] font-bold text-emerald-800 bg-emerald-200/80 px-2 py-0.5 rounded-full">
                  Verifikasi Ketat
                </span>
              </div>
              <p className="text-[11px] text-stone-600 leading-snug">
                Hanya alamat email Google di bawah ini yang diizinkan membuka Mode Admin &amp; Pengaturan RT. Warga biasa akan otomatis ditolak.
              </p>

              {adminEmailMsg && (
                <div
                  className={`p-2 rounded-xl border text-[11px] font-bold flex items-center space-x-1.5 animate-in fade-in ${
                    adminEmailMsg.isError
                      ? 'bg-rose-50 border-rose-200 text-rose-800'
                      : 'bg-emerald-50 border-emerald-200 text-emerald-800'
                  }`}
                >
                  {adminEmailMsg.isError ? (
                    <AlertCircle className="w-3.5 h-3.5 text-rose-600 shrink-0" />
                  ) : (
                    <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                  )}
                  <span>{adminEmailMsg.text}</span>
                </div>
              )}

              <div className="space-y-1.5">
                {allowedAdminEmails.map((em) => {
                  const isPrimary = em === PRIMARY_ADMIN_EMAIL.toLowerCase();
                  return (
                    <div
                      key={em}
                      className="flex items-center justify-between gap-2 px-3 py-2 rounded-xl bg-white border border-emerald-200/80"
                    >
                      <div className="flex items-center space-x-2 min-w-0">
                        <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                        <span className="text-xs font-bold text-stone-800 truncate">{em}</span>
                      </div>
                      {isPrimary ? (
                        <span className="px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-900 text-[10px] font-extrabold shrink-0">
                          Utama
                        </span>
                      ) : (
                        <button
                          type="button"
                          disabled={isSavingAdminEmail}
                          onClick={() => handleRemoveAdminEmail(em)}
                          className="p-1 rounded-lg text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer shrink-0 disabled:opacity-50"
                          title="Hapus akses Admin untuk email ini"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>

              <form onSubmit={handleAddAdminEmail} className="flex items-center gap-2 pt-1">
                <input
                  type="email"
                  value={newAdminEmailInput}
                  onChange={(e) => {
                    setNewAdminEmailInput(e.target.value);
                    setAdminEmailMsg(null);
                  }}
                  placeholder="Tambah email Gmail pengurus lain..."
                  className="flex-1 min-w-0 px-3 py-2 rounded-xl bg-white border border-stone-300 text-xs font-bold text-stone-900 outline-none focus:ring-2 focus:ring-emerald-500"
                />
                <button
                  type="submit"
                  disabled={isSavingAdminEmail}
                  className="px-3 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60 text-white text-xs font-extrabold transition-colors cursor-pointer shrink-0"
                >
                  {isSavingAdminEmail ? '...' : 'Tambah'}
                </button>
              </form>
            </div>

            {isSavedAlert && (
              <div className="p-3 rounded-2xl bg-emerald-100 text-emerald-800 border border-emerald-300 text-xs font-bold flex items-center space-x-2 animate-in fade-in">
                <Check className="w-4 h-4 text-emerald-600" />
                <span>Pengaturan berhasil disimpan ke Cloud!</span>
              </div>
            )}

            {saveErrorAlert && (
              <div className="p-3 rounded-2xl bg-rose-50 text-rose-800 border border-rose-200 text-xs font-bold flex items-center space-x-2 animate-in fade-in">
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                <span>{saveErrorAlert}</span>
              </div>
            )}

            {/* General Settings Form */}
            <form onSubmit={handleSaveSettings} className="space-y-4">
              <div className="space-y-3">
                <div className="flex items-center space-x-2 text-stone-800 font-bold text-xs border-b border-stone-100 pb-2">
                  <Building className="w-4 h-4 text-sky-600" />
                  <span>Identitas Lingkungan RT / RW</span>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-bold text-stone-700 mb-1">
                      Nama RT
                    </label>
                    <input
                      type="text"
                      value={formData.namaRt}
                      onChange={(e) => setFormData({ ...formData, namaRt: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl bg-stone-50 border border-stone-300 text-stone-900 text-xs font-bold outline-none focus:ring-2 focus:ring-sky-400"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-stone-700 mb-1">
                      Nama RW
                    </label>
                    <input
                      type="text"
                      value={formData.namaRw}
                      onChange={(e) => setFormData({ ...formData, namaRw: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl bg-stone-50 border border-stone-300 text-stone-900 text-xs font-bold outline-none focus:ring-2 focus:ring-sky-400"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-stone-600 mb-1">
                    Nama Kelurahan / Dusun / Komplek
                  </label>
                  <input
                    type="text"
                    value={formData.lingkungan}
                    onChange={(e) => setFormData({ ...formData, lingkungan: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-stone-50 border border-stone-300 text-stone-900 text-xs outline-none"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-stone-600 mb-1">
                    Nominal Default Jimpitan (Rp)
                  </label>
                  <input
                    type="number"
                    value={formData.defaultNominal}
                    onChange={(e) => setFormData({ ...formData, defaultNominal: Number(e.target.value) })}
                    step="500"
                    className="w-full px-3 py-2 rounded-xl bg-stone-50 border border-stone-300 text-stone-900 text-xs font-bold outline-none"
                  />
                </div>

                {/* SALDO AWAL KAS RT */}
                <div className="pt-2 border-t border-stone-100 space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2 text-stone-800 font-bold text-xs">
                      <Wallet className="w-4 h-4 text-emerald-600" />
                      <span>Saldo Awal Kas RT</span>
                    </div>
                    <span className="text-[10px] font-extrabold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                      {saldoInputMode === 'bulan_ini' ? `Target ${currMonthLabel}` : 'Master Pra-Sistem'}
                    </span>
                  </div>

                  {/* Mode Switcher: Set Saldo Awal Bulan Ini directly vs Master Pra-Oktober */}
                  {pastNetPreviousMonths !== 0 && (
                    <div className="grid grid-cols-2 gap-1.5 bg-stone-100 p-1 rounded-xl">
                      <button
                        type="button"
                        onClick={() => {
                          setSaldoInputMode('bulan_ini');
                          const curMaster = Number(formData.saldoAwalKas) || 0;
                          setSaldoAwalText(formatSignedNumericText(curMaster + pastNetPreviousMonths));
                        }}
                        className={`py-1.5 px-2 rounded-lg text-[10.5px] font-extrabold transition-all cursor-pointer ${
                          saldoInputMode === 'bulan_ini'
                            ? 'bg-emerald-600 text-white shadow-2xs'
                            : 'text-stone-600 hover:text-stone-900'
                        }`}
                      >
                        Saldo Awal {currMonthLabel}
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setSaldoInputMode('master');
                          const curMaster = Number(formData.saldoAwalKas) || 0;
                          setSaldoAwalText(formatSignedNumericText(curMaster));
                        }}
                        className={`py-1.5 px-2 rounded-lg text-[10.5px] font-extrabold transition-all cursor-pointer ${
                          saldoInputMode === 'master'
                            ? 'bg-emerald-600 text-white shadow-2xs'
                            : 'text-stone-600 hover:text-stone-900'
                        }`}
                      >
                        Saldo Awal Master (Awal)
                      </button>
                    </div>
                  )}

                  <p className="text-[11px] text-stone-500 leading-relaxed">
                    {saldoInputMode === 'bulan_ini'
                      ? `Masukkan angka pasti Saldo Awal untuk bulan ${currMonthLabel} (sistem otomatis menyesuaikan selisih akumulasi bulan sebelumnya).`
                      : 'Masukkan saldo kas awal lingkungan sebelum catatan transaksi pertama dimulai.'}
                  </p>

                  <div className="space-y-2 bg-stone-50 p-3 rounded-2xl border border-stone-200">
                    <label className="block text-[11px] font-bold text-stone-700">
                      {saldoInputMode === 'bulan_ini'
                        ? `Nominal Saldo Awal ${currMonthLabel} (Rp)`
                        : 'Nominal Saldo Awal Master (Rp)'}
                    </label>
                    <div className="relative">
                      <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-stone-500 font-bold text-xs">
                        Rp
                      </span>
                      <input
                        type="text"
                        inputMode="numeric"
                        value={saldoAwalText}
                        onChange={(e) => {
                          hasEditedSaldoRef.current = true;
                          const raw = e.target.value;
                          const isNeg = saldoInputMode === 'master' && raw.trim().startsWith('-');
                          const digits = raw.replace(/\D/g, '');
                          if (!digits) {
                            setSaldoAwalText(isNeg ? '-' : '');
                            const nextMaster = saldoInputMode === 'bulan_ini' ? -pastNetPreviousMonths : 0;
                            setFormData({ ...formData, saldoAwalKas: nextMaster });
                            return;
                          }
                          const num = Number(digits) || 0;
                          const signedVal = isNeg && num > 0 ? -num : num;
                          setSaldoAwalText(formatSignedNumericText(signedVal));
                          const nextMaster =
                            saldoInputMode === 'bulan_ini' ? signedVal - pastNetPreviousMonths : signedVal;
                          setFormData({ ...formData, saldoAwalKas: nextMaster });
                        }}
                        onBlur={() => {
                          const parsed = parseSignedSaldoText(saldoAwalText);
                          setSaldoAwalText(formatSignedNumericText(parsed));
                        }}
                        placeholder="Contoh: 2.987.000"
                        className="w-full pl-10 pr-3 py-2 rounded-xl bg-white border border-stone-300 text-stone-900 text-sm font-extrabold outline-none focus:ring-2 focus:ring-emerald-500"
                        id="input-saldo-awal-kas"
                      />
                    </div>

                    {/* Live Preview Breakdown */}
                    {(() => {
                      const previewMaster = Number(formData.saldoAwalKas) || 0;
                      const previewBulanIni = previewMaster + pastNetPreviousMonths;
                      const previewTersedia = previewBulanIni + currentMonthNet;
                      return (
                        <div className="p-2.5 rounded-xl bg-emerald-50/90 border border-emerald-200 space-y-1 text-[10.5px]">
                          <div className="flex items-center justify-between text-emerald-950 font-extrabold">
                            <span>Saldo Awal {currMonthLabel}:</span>
                            <span>{formatRupiah(previewBulanIni)}</span>
                          </div>
                          {pastNetPreviousMonths !== 0 && (
                            <div className="flex items-center justify-between text-emerald-700">
                              <span>Saldo Master (sebelum {currMonthLabel}):</span>
                              <span className="font-bold">{formatRupiah(previewMaster)}</span>
                            </div>
                          )}
                          <div className="flex items-center justify-between text-emerald-900 font-extrabold pt-1 border-t border-emerald-200/70">
                            <span>Estimasi Saldo Kas Tersedia:</span>
                            <span>{formatRupiah(previewTersedia)}</span>
                          </div>
                        </div>
                      );
                    })()}

                    {/* Quick Presets */}
                    <div className="flex items-center space-x-1.5 pt-1 overflow-x-auto no-scrollbar">
                      <span className="text-[10px] font-bold text-stone-400 whitespace-nowrap">Preset:</span>
                      {[0, 250000, 500000, 1000000, 2000000, 5000000].map((nominal) => {
                        const targetMaster =
                          saldoInputMode === 'bulan_ini' ? nominal - pastNetPreviousMonths : nominal;
                        const isActive = (Number(formData.saldoAwalKas) || 0) === targetMaster;
                        return (
                          <button
                            key={nominal}
                            type="button"
                            onClick={() => {
                              hasEditedSaldoRef.current = true;
                              setSaldoAwalText(formatSignedNumericText(nominal));
                              setFormData({ ...formData, saldoAwalKas: targetMaster });
                            }}
                            className={`px-2 py-0.5 rounded-lg text-[10px] font-bold whitespace-nowrap transition-colors cursor-pointer ${
                              isActive
                                ? 'bg-emerald-600 text-white shadow-2xs'
                                : 'bg-white hover:bg-stone-200 text-stone-700 border border-stone-200'
                            }`}
                          >
                            {nominal === 0 ? 'Rp 0' : formatRupiah(nominal)}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>

                {/* PIN MODE PENGINPUT (JURU PUNGUT / OPERASIONAL) */}
                <div className="pt-2 border-t border-stone-100 space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2 text-stone-800 font-bold text-xs">
                      <QrCode className="w-4 h-4 text-sky-600" />
                      <span>PIN Khusus Mode Penginput (Ronda / Juru Pungut)</span>
                    </div>
                    <span className="text-[10px] font-extrabold text-sky-700 bg-sky-50 px-2 py-0.5 rounded-md border border-sky-200">
                      Terpisah dari PIN Admin
                    </span>
                  </div>

                  <p className="text-[11px] text-stone-500 leading-relaxed">
                    PIN terpisah yang diberikan kepada petugas regu ronda untuk akses operasional (Scan QR, Kas/Rekap, dan Hitung Uang) tanpa memberikan akses ke pengaturan RT atau master data warga.
                  </p>

                  <div className="space-y-1.5 bg-stone-50 p-3 rounded-2xl border border-stone-200">
                    <label className="block text-[11px] font-bold text-stone-700">
                      PIN Penginput (4 - 8 Digit)
                    </label>
                    <input
                      type="text"
                      inputMode="numeric"
                      maxLength={8}
                      value={formData.pinPenginput ?? '4321'}
                      onChange={(e) => setFormData({ ...formData, pinPenginput: e.target.value })}
                      placeholder="Masukkan PIN Penginput (4 - 8 digit)..."
                      className="w-full px-3 py-2 rounded-xl bg-white border border-stone-300 text-stone-900 text-xs font-bold outline-none focus:ring-2 focus:ring-sky-400"
                    />
                    <p className="text-[10px] text-stone-500">
                      * Pastikan PIN Penginput berbeda dengan PIN Admin demi keamanan dan pemisahan wewenang.
                    </p>
                  </div>
                </div>
              </div>

              {/* Suara & Audio Feedback */}
              <div className="space-y-2 pt-2 border-t border-stone-100">
                <div className="flex items-center space-x-2 text-stone-800 font-bold text-xs pb-1">
                  <Volume2 className="w-4 h-4 text-sky-600" />
                  <span>Suara & Notifikasi Suara</span>
                </div>

                <label className="flex items-center justify-between p-2.5 rounded-xl bg-stone-50 border border-stone-200 cursor-pointer">
                  <span className="text-xs font-bold text-stone-800">
                    Bunyi Beep / Chime saat QR ter-scan
                  </span>
                  <input
                    type="checkbox"
                    checked={formData.soundEnabled}
                    onChange={(e) => setFormData({ ...formData, soundEnabled: e.target.checked })}
                    className="w-4 h-4 accent-sky-600 cursor-pointer"
                  />
                </label>

                <label className="flex items-center justify-between p-2.5 rounded-xl bg-stone-50 border border-stone-200 cursor-pointer">
                  <span className="text-xs font-bold text-stone-800">
                    Suara Pembaca Nama & Nominal (TTS)
                  </span>
                  <input
                    type="checkbox"
                    checked={formData.speechEnabled}
                    onChange={(e) => setFormData({ ...formData, speechEnabled: e.target.checked })}
                    className="w-4 h-4 accent-sky-600 cursor-pointer"
                  />
                </label>
              </div>

              {isSavedAlert && (
                <div className="p-3 rounded-2xl bg-emerald-100 text-emerald-800 border border-emerald-300 text-xs font-bold flex items-center space-x-2 animate-in fade-in">
                  <Check className="w-4 h-4 text-emerald-600" />
                  <span>Pengaturan & Saldo Awal berhasil disimpan ke Cloud!</span>
                </div>
              )}

              {saveErrorAlert && (
                <div className="p-3 rounded-2xl bg-rose-50 text-rose-800 border border-rose-200 text-xs font-bold flex items-center space-x-2 animate-in fade-in">
                  <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                  <span>{saveErrorAlert}</span>
                </div>
              )}

              <button
                type="submit"
                disabled={isSavingSettings}
                className="w-full py-2.5 rounded-2xl bg-sky-500 hover:bg-sky-600 disabled:opacity-60 text-white font-extrabold text-xs sm:text-sm tracking-wide shadow-md transition-all cursor-pointer"
              >
                {isSavingSettings ? 'MENYIMPAN KE CLOUD...' : 'SIMPAN PENGATURAN LINGKUNGAN'}
              </button>
            </form>

            {/* Backup, Restore & Reset */}
            <div className="space-y-3 pt-3 border-t border-stone-100">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2 text-stone-800 font-bold text-xs">
                  <Cloud className="w-4 h-4 text-sky-600" />
                  <span>Cadangan Otomatis & Pulihkan Data RT</span>
                </div>
                <button
                  type="button"
                  onClick={loadCloudBackupsAndArchives}
                  disabled={isLoadingCloudSnapshots}
                  className="text-[11px] font-bold text-sky-700 hover:text-sky-900 flex items-center space-x-1 cursor-pointer disabled:opacity-50"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isLoadingCloudSnapshots ? 'animate-spin' : ''}`} />
                  <span>Muat Ulang</span>
                </button>
              </div>

              {backupStatusBanner && (
                <div
                  className={`p-2.5 rounded-xl border text-xs font-bold flex items-center space-x-2 animate-in fade-in ${
                    backupStatusBanner.tone === 'error'
                      ? 'bg-rose-50 border-rose-200 text-rose-800'
                      : 'bg-emerald-50 border-emerald-200 text-emerald-800'
                  }`}
                >
                  {backupStatusBanner.tone === 'error' ? (
                    <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                  ) : (
                    <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                  )}
                  <span>{backupStatusBanner.text}</span>
                </div>
              )}

              {/* Cloud Snapshot Actions & List */}
              <div className="p-3 rounded-2xl bg-sky-50/70 border border-sky-200/80 space-y-2.5">
                <div className="flex items-center justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-[11px] font-extrabold text-sky-950">
                      Cadangan Cloud Real-Time (Anti Hilang)
                    </p>
                    <p className="text-[10px] text-sky-800/80">
                      Sistem otomatis membuat snapshot berkala & setiap selesai ronda.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={handleCreateManualCloudSnapshot}
                    disabled={isCreatingCloudSnapshot}
                    className="px-3 py-1.5 rounded-xl bg-sky-600 hover:bg-sky-700 disabled:opacity-60 text-white text-[11px] font-extrabold flex items-center space-x-1.5 shrink-0 shadow-xs cursor-pointer"
                  >
                    <Database className="w-3.5 h-3.5" />
                    <span>{isCreatingCloudSnapshot ? 'Menyimpan...' : 'Cadangkan Cloud'}</span>
                  </button>
                </div>

                {cloudBackupsList.length > 0 ? (
                  <div className="space-y-1.5 max-h-56 overflow-y-auto pr-0.5">
                    {cloudBackupsList.slice(0, 8).map((b) => {
                      const datePart = (b.createdAtIso || '').slice(0, 10);
                      const timeStr = b.timestamp
                        ? new Date(b.timestamp).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })
                        : '';
                      const isRestoringThis = isRestoringCloudId === b.id;
                      return (
                        <div
                          key={b.id}
                          className="p-2.5 rounded-xl bg-white border border-sky-100 flex items-center justify-between gap-2"
                        >
                          <div className="min-w-0">
                            <div className="flex items-center space-x-1.5">
                              <span
                                className={`px-1.5 py-0.5 rounded text-[9px] font-black uppercase ${
                                  b.source === 'auto'
                                    ? 'bg-emerald-100 text-emerald-800'
                                    : 'bg-amber-100 text-amber-800'
                                }`}
                              >
                                {b.source === 'auto' ? 'Otomatis' : 'Manual'}
                              </span>
                              <span className="text-[11px] font-extrabold text-stone-800 truncate">
                                {datePart ? formatTanggalIndo(datePart) : b.id} {timeStr ? `• ${timeStr}` : ''}
                              </span>
                            </div>
                            <p className="text-[10px] text-stone-500 mt-0.5">
                              {b.stats?.wargaCount || 0} rumah • {b.stats?.recordsCount || 0} catatan • {b.stats?.mutationsCount || 0} mutasi
                            </p>
                          </div>
                          <div className="flex items-center space-x-1 shrink-0">
                            <button
                              type="button"
                              disabled={Boolean(isRestoringCloudId)}
                              onClick={() => setPendingConfirmAction({ type: 'restore_cloud', backup: b })}
                              className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-[10px] font-extrabold cursor-pointer"
                            >
                              {isRestoringThis ? 'Memulihkan...' : 'Pulihkan'}
                            </button>
                            <button
                              type="button"
                              onClick={() => setPendingConfirmAction({ type: 'delete_cloud', backupId: b.id })}
                              className="p-1.5 rounded-lg bg-stone-100 hover:bg-rose-100 text-stone-500 hover:text-rose-700 cursor-pointer"
                              title="Hapus Snapshot"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <p className="text-[11px] text-stone-500 italic">
                    {isLoadingCloudSnapshots ? 'Memuat daftar cadangan Cloud...' : 'Belum ada snapshot cloud tersimpan.'}
                  </p>
                )}
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <button
                  type="button"
                  onClick={handleExportBackup}
                  className="p-3 rounded-2xl bg-stone-50 hover:bg-sky-50 border border-stone-200 hover:border-sky-300 text-stone-800 text-xs font-bold flex flex-col items-center justify-center space-y-1 transition-all cursor-pointer"
                >
                  <Download className="w-5 h-5 text-sky-600" />
                  <span>Unduh Backup JSON</span>
                </button>

                <label className="p-3 rounded-2xl bg-stone-50 hover:bg-sky-50 border border-stone-200 hover:border-sky-300 text-stone-800 text-xs font-bold flex flex-col items-center justify-center space-y-1 transition-all cursor-pointer text-center">
                  <Upload className="w-5 h-5 text-emerald-600" />
                  <span>Pulihkan Backup</span>
                  <input
                    type="file"
                    accept=".json"
                    onChange={handleImportBackup}
                    className="hidden"
                  />
                </label>
              </div>

              {/* Reset Data & Load Sample */}
              <div className="pt-2 flex flex-col space-y-2 text-xs">
                <div className="flex items-center justify-between">
                  <button
                    type="button"
                    onClick={() => {
                      setResetConfirmText('');
                      setPendingConfirmAction({ type: 'reset_all' });
                    }}
                    className="text-rose-600 hover:text-rose-800 font-bold underline cursor-pointer"
                  >
                    Reset Semua Data
                  </button>

                  <button
                    type="button"
                    onClick={() => setPendingConfirmAction({ type: 'load_sample' })}
                    className="text-sky-600 hover:text-sky-800 font-bold underline cursor-pointer"
                  >
                    Muat Data Simulasi
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* IN-APP CONFIRMATION MODAL FOR BACKUP / RESTORE / RESET ACTIONS */}
      {pendingConfirmAction && (
        <div className="fixed inset-0 z-[80] bg-stone-950/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in">
          <div className="w-full max-w-sm bg-white rounded-3xl border border-stone-200 shadow-2xl p-5 space-y-4">
            <div className="flex items-start space-x-3">
              <div
                className={`w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 ${
                  pendingConfirmAction.type === 'restore_cloud'
                    ? 'bg-emerald-100 text-emerald-700'
                    : 'bg-rose-100 text-rose-700'
                }`}
              >
                <AlertCircle className="w-5 h-5" />
              </div>
              <div className="space-y-1">
                <h4 className="text-sm font-black text-stone-900">
                  {pendingConfirmAction.type === 'restore_cloud'
                    ? 'Konfirmasi Pemulihan Data Cloud'
                    : pendingConfirmAction.type === 'delete_cloud'
                      ? 'Hapus Snapshot Cloud?'
                      : pendingConfirmAction.type === 'delete_archive'
                        ? 'Hapus Arsip Bulanan?'
                        : pendingConfirmAction.type === 'reset_all'
                          ? 'Reset Semua Data RT?'
                          : 'Muat Data Simulasi?'}
                </h4>
                <p className="text-xs text-stone-600 leading-relaxed">
                  {pendingConfirmAction.type === 'restore_cloud' && (
                    <>
                      Pulihkan database dari cadangan{' '}
                      <strong>
                        {pendingConfirmAction.backup.createdAtIso
                          ? formatTanggalIndo(pendingConfirmAction.backup.createdAtIso.slice(0, 10))
                          : ''}
                      </strong>{' '}
                      ({pendingConfirmAction.backup.stats.wargaCount} rumah,{' '}
                      {pendingConfirmAction.backup.stats.recordsCount} catatan jimpitan,{' '}
                      {pendingConfirmAction.backup.stats.mutationsCount} mutasi kas)?
                    </>
                  )}
                  {pendingConfirmAction.type === 'delete_cloud' &&
                    'Snapshot cadangan cloud ini akan dihapus permanen.'}
                  {pendingConfirmAction.type === 'delete_archive' &&
                    'Arsip bulanan ini akan dihapus permanen dari cloud.'}
                  {pendingConfirmAction.type === 'reset_all' &&
                    'Sistem akan menyimpan cadangan keamanan otomatis sebelum mengosongkan seluruh transaksi kas & jimpitan. Ketik RESET untuk melanjutkan.'}
                  {pendingConfirmAction.type === 'load_sample' &&
                    'Data aktif saat ini akan diganti dengan data contoh simulasi RT.'}
                </p>
              </div>
            </div>

            {pendingConfirmAction.type === 'reset_all' && (
              <div>
                <input
                  type="text"
                  value={resetConfirmText}
                  onChange={(e) => setResetConfirmText(e.target.value)}
                  placeholder="Ketik RESET di sini..."
                  className="w-full px-3 py-2 rounded-xl bg-stone-50 border border-rose-300 text-xs font-black text-rose-900 uppercase outline-none focus:ring-2 focus:ring-rose-500"
                  autoFocus
                />
              </div>
            )}

            <div className="flex items-center justify-end space-x-2 pt-1">
              <button
                type="button"
                onClick={() => {
                  setPendingConfirmAction(null);
                  setResetConfirmText('');
                }}
                className="px-3.5 py-2 rounded-xl bg-stone-100 hover:bg-stone-200 text-stone-700 text-xs font-extrabold cursor-pointer"
              >
                Batal
              </button>
              <button
                type="button"
                disabled={
                  pendingConfirmAction.type === 'reset_all' &&
                  resetConfirmText.trim().toUpperCase() !== 'RESET'
                }
                onClick={handleConfirmPendingAction}
                className={`px-4 py-2 rounded-xl text-white text-xs font-extrabold cursor-pointer disabled:opacity-40 ${
                  pendingConfirmAction.type === 'restore_cloud'
                    ? 'bg-emerald-600 hover:bg-emerald-700'
                    : 'bg-rose-600 hover:bg-rose-700'
                }`}
              >
                {pendingConfirmAction.type === 'restore_cloud' ? 'Ya, Pulihkan Data' : 'Ya, Lanjutkan'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* PDF REPORT & CETAK LAPORAN RESMI RT (MODAL) */}
      <PdfReportModal
        isOpen={isPdfModalOpen}
        onClose={() => setIsPdfModalOpen(false)}
        allRecords={allRecords}
        kasMutations={allMutations}
        settings={settings}
        selectedDate={getTodayDateIso()}
        wargaList={allWarga}
      />

      {/* CETAK & UNDUH LEMBAR QR BARCODE WARGA (MODAL DENGAN PENGATURAN UKURAN) */}
      <CetakQrBarcodeModal
        isOpen={isCetakQrModalOpen}
        onClose={() => setIsCetakQrModalOpen(false)}
        wargaList={allWarga}
        settings={settings}
      />
    </div>
  );
};
