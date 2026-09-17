import React, { useState, useEffect } from 'react';
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
  Sparkles
} from 'lucide-react';
import { AppSettings, ReguRonda, Warga, JimpitanRecord, KasMutation } from '../types';
import { TabType } from './BottomNav';
import { formatRupiah } from '../utils/formatters';
import { LaporanTabKey } from './LaporanHubModal';
import { 
  FileText, 
  TrendingUp, 
  TrendingDown, 
  Calendar as CalendarIcon, 
  FileSpreadsheet
} from 'lucide-react';

interface MenuViewProps {
  settings: AppSettings;
  onUpdateSettings: (newSettings: AppSettings) => Promise<void> | void;
  reguList?: ReguRonda[];
  onUpdateReguList?: (newRegu: ReguRonda[]) => void;
  onResetAllData: () => void;
  onLoadSampleData: () => void;
  onDeleteSeptemberData?: () => void;
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
  onLockApp: () => void;
  isAdminUnlocked?: boolean;
  onUnlockAdmin?: (pin: string) => boolean;
  onOpenChangePinModal?: () => void;
}

export const MenuView: React.FC<MenuViewProps> = ({
  settings,
  onUpdateSettings,
  reguList = [],
  onUpdateReguList,
  onResetAllData,
  onLoadSampleData,
  onDeleteSeptemberData,
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
  onLockApp,
  isAdminUnlocked = false,
  onUnlockAdmin,
  onOpenChangePinModal,
}) => {
  const [formData, setFormData] = useState<AppSettings>(settings);
  const [isSavedAlert, setIsSavedAlert] = useState<boolean>(false);

  // Admin PIN Unlock form state
  const [inputPin, setInputPin] = useState<string>('');
  const [pinError, setPinError] = useState<string>('');
  const [showPin, setShowPin] = useState<boolean>(false);

  // Quick Dedicated Change PIN state
  const [currentPinInput, setCurrentPinInput] = useState<string>('');
  const [newPinInput, setNewPinInput] = useState<string>('');
  const [confirmPinInput, setConfirmPinInput] = useState<string>('');
  const [showNewPin, setShowNewPin] = useState<boolean>(false);
  const [pinChangeMsg, setPinChangeMsg] = useState<{ text: string; isError: boolean } | null>(null);
  const [isPinSaving, setIsPinSaving] = useState<boolean>(false);

  useEffect(() => {
    setFormData(settings);
  }, [settings]);

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    await onUpdateSettings(formData);
    setIsSavedAlert(true);
    setTimeout(() => setIsSavedAlert(false), 2500);
  };

  const handleUnlockSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPinError('');
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

  // Export full JSON Backup
  const handleExportBackup = () => {
    const backupObj = {
      version: '1.0',
      exportedAt: new Date().toISOString(),
      settings: formData,
      reguList,
      allWarga,
      allRecords,
      allMutations,
    };

    const jsonStr = JSON.stringify(backupObj, null, 2);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `backup_jimpitan_${formData.namaRt}_${new Date().toISOString().slice(0, 10)}.json`;
    link.click();
    URL.revokeObjectURL(url);
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
          alert('Data berhasil dipulihkan dari file cadangan!');
        } else {
          alert('Format file cadangan tidak valid.');
        }
      } catch (err) {
        alert('Gagal membaca file cadangan JSON.');
      }
    };
    reader.readAsText(file);
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
        {/* === PROMINENT LAPORAN & REKAPITULASI RT SECTION === */}
        <div className="p-4 rounded-3xl bg-gradient-to-br from-slate-900 via-sky-950 to-slate-900 text-white border border-sky-800/40 shadow-sm space-y-3">
          <div className="flex items-center justify-between border-b border-white/10 pb-2.5">
            <div className="flex items-center space-x-2.5">
              <div className="p-2 rounded-xl bg-sky-500/20 text-sky-300">
                <FileText className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-black text-base text-white tracking-tight">
                  Laporan & Rekapitulasi RT
                </h3>
                <p className="text-xs text-sky-200/70">
                  Pusat cetak PDF & rincian pertanggungjawaban
                </p>
              </div>
            </div>

            {onOpenLaporanHub && (
              <button
                onClick={() => onOpenLaporanHub('kas')}
                className="px-3 py-1.5 rounded-xl bg-sky-500 hover:bg-sky-400 text-white font-extrabold text-xs flex items-center space-x-1 shadow-xs transition-colors cursor-pointer"
              >
                <span>Buka Hub</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* 4 Direct Report Triggers Grid */}
          <div className="grid grid-cols-2 gap-2.5">
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
        </div>

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
                Rekap Kas & Laporan
              </h3>
              <p className="text-xs text-stone-500 truncate">
                Grafik tren & buku riwayat kas RT
              </p>
            </div>
          </div>
          <ChevronRight className="w-5 h-5 text-stone-400 group-hover:text-sky-600 transition-colors flex-shrink-0" />
        </button>

        {/* 3. Data Warga & Rumah */}
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
          /* LOCKED VIEW: Form unlock PIN Admin */
          <div className="bg-stone-50 border border-stone-200 rounded-2xl p-4 space-y-3">
            <div className="flex items-center space-x-2 text-stone-800 font-bold text-xs">
              <Lock className="w-4 h-4 text-amber-600" />
              <span>Akses Pengaturan Terkunci</span>
            </div>
            <p className="text-xs text-stone-500">
              Masukkan PIN Pengurus RT untuk mengubah identitas lingkungan, saldo awal kas, atau PIN keamanan.
            </p>

            <form onSubmit={handleUnlockSubmit} className="space-y-3">
              {pinError && (
                <div className="p-2.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-bold flex items-center space-x-1.5 animate-in fade-in">
                  <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                  <span>{pinError}</span>
                </div>
              )}

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

              <button
                type="submit"
                className="w-full py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-extrabold text-xs sm:text-sm tracking-wide shadow-xs transition-all flex items-center justify-center space-x-2 cursor-pointer"
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
                <span className="text-xs font-extrabold truncate">
                  Mode Pengurus / Admin RT Aktif
                </span>
              </div>
              <button
                type="button"
                onClick={onLockApp}
                className="px-2.5 py-1 rounded-lg bg-white border border-emerald-300 hover:bg-emerald-100 text-emerald-800 text-xs font-bold transition-colors cursor-pointer flex-shrink-0"
              >
                Kunci Kembali
              </button>
            </div>

            {/* DEDICATED RESPONSIVE CARD: UBAH PIN ADMIN */}
            <div className="bg-gradient-to-br from-amber-50/90 via-orange-50/40 to-white rounded-2xl border-2 border-amber-200/90 p-3.5 sm:p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <KeyRound className="w-4 h-4 text-amber-600" />
                  <h4 className="text-xs sm:text-sm font-extrabold text-amber-950">
                    Ubah PIN Admin / Pengurus
                  </h4>
                </div>
                <span className="text-[10px] font-bold text-amber-800 bg-amber-200/80 px-2 py-0.5 rounded-full">
                  Responsif & Cepat
                </span>
              </div>

              {pinChangeMsg && (
                <div
                  className={`p-2.5 rounded-xl border text-xs font-bold flex items-center space-x-1.5 animate-in fade-in ${
                    pinChangeMsg.isError
                      ? 'bg-rose-50 border-rose-200 text-rose-800'
                      : 'bg-emerald-50 border-emerald-200 text-emerald-800'
                  }`}
                >
                  {pinChangeMsg.isError ? (
                    <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                  ) : (
                    <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                  )}
                  <span>{pinChangeMsg.text}</span>
                </div>
              )}

              <form onSubmit={handleQuickChangePin} className="space-y-2.5">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  <div>
                    <label className="block text-[10px] font-bold text-stone-700 mb-0.5">
                      PIN Lama
                    </label>
                    <input
                      type="password"
                      inputMode="numeric"
                      maxLength={8}
                      value={currentPinInput}
                      onChange={(e) => setCurrentPinInput(e.target.value)}
                      placeholder="PIN Lama..."
                      className="w-full px-3 py-2 rounded-xl bg-white border border-stone-300 font-bold text-stone-900 text-xs outline-none focus:ring-2 focus:ring-amber-500"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-stone-700 mb-0.5">
                      PIN Baru (4-8 Digit)
                    </label>
                    <input
                      type={showNewPin ? 'text' : 'password'}
                      inputMode="numeric"
                      maxLength={8}
                      value={newPinInput}
                      onChange={(e) => setNewPinInput(e.target.value)}
                      placeholder="PIN Baru"
                      className="w-full px-3 py-2 rounded-xl bg-white border border-stone-300 font-bold text-stone-900 text-xs outline-none focus:ring-2 focus:ring-amber-500"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-stone-700 mb-0.5">
                      Konfirmasi PIN Baru
                    </label>
                    <input
                      type={showNewPin ? 'text' : 'password'}
                      inputMode="numeric"
                      maxLength={8}
                      value={confirmPinInput}
                      onChange={(e) => setConfirmPinInput(e.target.value)}
                      placeholder="Ulangi PIN Baru"
                      className="w-full px-3 py-2 rounded-xl bg-white border border-stone-300 font-bold text-stone-900 text-xs outline-none focus:ring-2 focus:ring-amber-500"
                      required
                    />
                  </div>
                </div>

                <div className="flex items-center justify-between pt-1">
                  <button
                    type="button"
                    onClick={() => setShowNewPin(!showNewPin)}
                    className="text-[11px] text-stone-500 hover:text-stone-800 font-semibold flex items-center space-x-1"
                  >
                    {showNewPin ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5 text-amber-600" />}
                    <span>{showNewPin ? 'Sembunyikan' : 'Lihat Angka'}</span>
                  </button>

                  <button
                    type="submit"
                    disabled={isPinSaving}
                    className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 disabled:opacity-60 text-white font-extrabold text-xs flex items-center space-x-1.5 shadow-xs transition-all cursor-pointer"
                  >
                    {isPinSaving ? (
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Check className="w-3.5 h-3.5" />
                    )}
                    <span>Simpan PIN Baru</span>
                  </button>
                </div>
              </form>
            </div>

            {isSavedAlert && (
              <div className="p-3 rounded-2xl bg-emerald-100 text-emerald-800 border border-emerald-300 text-xs font-bold flex items-center space-x-2 animate-in fade-in">
                <Check className="w-4 h-4 text-emerald-600" />
                <span>Pengaturan berhasil disimpan!</span>
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
                      Akumulasi Otomatis
                    </span>
                  </div>

                  <p className="text-[11px] text-stone-500 leading-relaxed">
                    Masukkan saldo kas awal lingkungan sebelum sistem digital dimulai.
                  </p>

                  <div className="space-y-1.5 bg-stone-50 p-3 rounded-2xl border border-stone-200">
                    <label className="block text-[11px] font-bold text-stone-700">
                      Nominal Saldo Awal (Rp)
                    </label>
                    <div className="relative">
                      <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-stone-500 font-bold text-xs">
                        Rp
                      </span>
                      <input
                        type="number"
                        min={0}
                        step={1000}
                        value={formData.saldoAwalKas ?? 0}
                        onChange={(e) => setFormData({ ...formData, saldoAwalKas: Math.max(0, Number(e.target.value) || 0) })}
                        placeholder="0"
                        className="w-full pl-10 pr-3 py-2 rounded-xl bg-white border border-stone-300 text-stone-900 text-sm font-extrabold outline-none focus:ring-2 focus:ring-emerald-500"
                        id="input-saldo-awal-kas"
                      />
                    </div>

                    {/* Quick Presets */}
                    <div className="flex items-center space-x-1.5 pt-1 overflow-x-auto no-scrollbar">
                      <span className="text-[10px] font-bold text-stone-400 whitespace-nowrap">Preset:</span>
                      {[0, 250000, 500000, 1000000, 2000000, 5000000].map((nominal) => (
                        <button
                          key={nominal}
                          type="button"
                          onClick={() => setFormData({ ...formData, saldoAwalKas: nominal })}
                          className={`px-2 py-0.5 rounded-lg text-[10px] font-bold whitespace-nowrap transition-colors cursor-pointer ${
                            (formData.saldoAwalKas || 0) === nominal
                              ? 'bg-emerald-600 text-white shadow-2xs'
                              : 'bg-white hover:bg-stone-200 text-stone-700 border border-stone-200'
                          }`}
                        >
                          {nominal === 0 ? 'Rp 0' : formatRupiah(nominal)}
                        </button>
                      ))}
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

              <button
                type="submit"
                className="w-full py-2.5 rounded-2xl bg-sky-500 hover:bg-sky-600 text-white font-extrabold text-xs sm:text-sm tracking-wide shadow-md transition-all cursor-pointer"
              >
                SIMPAN PENGATURAN LINGKUNGAN
              </button>
            </form>

            {/* Backup, Restore & Reset */}
            <div className="space-y-3 pt-3 border-t border-stone-100">
              <div className="flex items-center space-x-2 text-stone-800 font-bold text-xs">
                <Download className="w-4 h-4 text-sky-600" />
                <span>Cadangkan & Pulihkan Data RT</span>
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
                      if (window.confirm('Reset seluruh data kas, warga, dan rekapan jimpitan ke kondisi awal?')) {
                        onResetAllData();
                      }
                    }}
                    className="text-rose-600 hover:text-rose-800 font-bold underline cursor-pointer"
                  >
                    Reset Semua Data
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      if (window.confirm('Muat data contoh simulasi RT lengkap?')) {
                        onLoadSampleData();
                      }
                    }}
                    className="text-sky-600 hover:text-sky-800 font-bold underline cursor-pointer"
                  >
                    Muat Data Simulasi
                  </button>
                </div>

                {onDeleteSeptemberData && (
                  <div className="pt-2 border-t border-stone-100 flex justify-center">
                    <button
                      type="button"
                      onClick={() => {
                        if (window.confirm('Apakah Anda yakin ingin menghapus seluruh data masuk jimpitan dan pengeluaran kas di bulan September?')) {
                          onDeleteSeptemberData();
                        }
                      }}
                      className="px-3 py-1.5 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 font-extrabold text-[11px] transition-colors cursor-pointer"
                    >
                      Hapus Semua Data Bulan September
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
