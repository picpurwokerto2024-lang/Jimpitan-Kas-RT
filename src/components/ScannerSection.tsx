import React, { useState, useEffect, useRef } from 'react';
import { 
  Camera, 
  Search, 
  Clock, 
  Check, 
  X, 
  AlertCircle, 
  Sparkles, 
  Trash2, 
  Edit3, 
  Volume2, 
  RefreshCw,
  Home,
  CheckCircle2,
  HelpCircle,
  QrCode,
  BellRing,
  Share2,
  MessageSquare,
  RotateCcw
} from 'lucide-react';
import { Html5Qrcode } from 'html5-qrcode';
import confetti from 'canvas-confetti';
import { Warga, JimpitanRecord } from '../types';
import { soundFx } from '../utils/audio';
import { 
  getMonthNameIndo, 
  generateWhatsAppMonthlyAdvanceReceipt, 
  cleanWhatsAppPhone, 
  formatRupiah,
  formatTanggalIndo,
  getTodayDateIso
} from '../utils/formatters';

interface ScannerSectionProps {
  wargaList: Warga[];
  recordsTonight: JimpitanRecord[];
  allRecords?: JimpitanRecord[];
  onSaveRecord: (record: Omit<JimpitanRecord, 'id' | 'createdAt'>) => void;
  onDeleteRecord: (id: string) => void;
  currentReguId: string;
  currentReguNama: string;
  currentPetugas: string;
  selectedDate: string;
  soundEnabled: boolean;
  speechEnabled: boolean;
  rt?: string;
  rw?: string;
  lingkungan?: string;
  onOpenShareModal?: (tab?: 'laporan' | 'pengingat') => void;
  onOpenFinishModal?: () => void;
  onSelectDate?: (date: string) => void;
  onResetToToday?: () => void;
}

export const ScannerSection: React.FC<ScannerSectionProps> = ({
  wargaList = [],
  recordsTonight = [],
  allRecords = [],
  onSaveRecord,
  onDeleteRecord,
  currentReguId,
  currentReguNama,
  currentPetugas,
  selectedDate,
  soundEnabled,
  speechEnabled,
  rt = 'RT 08',
  rw = 'RW 06',
  lingkungan = 'Pliken',
  onOpenShareModal,
  onOpenFinishModal,
  onSelectDate,
  onResetToToday,
}) => {
  const liveToday = getTodayDateIso();
  const isPastDate = selectedDate !== liveToday;

  const [activeTab, setActiveTab] = useState<'camera' | 'pilih_rumah' | 'log'>('camera');
  const [isCameraActive, setIsCameraActive] = useState<boolean>(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  
  // Search & Filter in "Pilih Rumah"
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'pending' | 'completed'>('all');

  // Confirmation Modal state
  const [scannedWarga, setScannedWarga] = useState<Warga | null>(null);
  const [nominalInput, setNominalInput] = useState<number>(1000);
  const [statusInput, setStatusInput] = useState<'sukses' | 'kosong' | 'titip' | 'lewat'>('sukses');
  const [catatanInput, setCatatanInput] = useState<string>('');
  const [isConfirmModalOpen, setIsConfirmModalOpen] = useState<boolean>(false);

  // HTML5 Scanner Ref
  const html5QrCodeRef = useRef<Html5Qrcode | null>(null);

  // Map of scanned house IDs tonight
  const scannedWargaIds = new Set(recordsTonight.map((r) => r.wargaId));

  // Current Month Helpers
  const currentMonthIso = selectedDate.substring(0, 7); // e.g. "2026-09"
  const currentMonthLabel = getMonthNameIndo(selectedDate);

  // Helper to check if a warga already has a monthly advance record in this month
  const getWargaMonthlyAdvanceRecord = (wargaId: string) => {
    return allRecords.find((r) => 
      r.wargaId === wargaId && 
      r.tanggal.startsWith(currentMonthIso) && 
      (
        (r.nominal >= 15000 && r.status === 'sukses') || 
        (r.catatan && (
          r.catatan.toLowerCase().includes('lunas 1 bulan') || 
          r.catatan.toLowerCase().includes('lunas bulan') || 
          r.catatan.toLowerCase().includes('bayar dimuka') ||
          r.catatan.toLowerCase().includes('lunas dimuka')
        ))
      )
    );
  };

  // State for showing monthly payment receipt dialog
  const [monthlyReceiptData, setMonthlyReceiptData] = useState<{
    warga: Warga;
    nominal: number;
    tanggal: string;
    bulan: string;
    catatan?: string;
  } | null>(null);

  // Trigger sound and speech feedback
  const triggerSuccessFeedback = (warga: Warga, nominal: number, status: string) => {
    if (soundEnabled) {
      soundFx.playSuccess();
    }
    if (speechEnabled) {
      if (status === 'sukses') {
        const nominalStr = nominal === 1000 ? 'seribu rupiah' : nominal === 2000 ? 'dua ribu rupiah' : `${nominal} rupiah`;
        soundFx.speakIndonesian(`Rumah nomor ${warga.nomorRumah}, ${warga.nama}, ${nominalStr} berhasil dicatat.`);
      } else if (status === 'kosong') {
        soundFx.speakIndonesian(`Rumah nomor ${warga.nomorRumah}, ${warga.nama}, dicatat kosong.`);
      } else if (status === 'lewat') {
        soundFx.speakIndonesian(`Rumah nomor ${warga.nomorRumah}, ${warga.nama}, dilewati karena sudah lunas.`);
      }
    }
    try {
      confetti({
        particleCount: 35,
        spread: 60,
        origin: { y: 0.7 },
        colors: ['#0284c7', '#38bdf8', '#34d399', '#fbbf24'],
      });
    } catch (e) {
      // Ignore
    }
  };


  // Process raw QR string (e.g. "JIMPITAN-RT01-RW01-NO05" or "NO:05" or just "05")
  const processScannedCode = (decodedText: string) => {
    let matchedWarga: Warga | undefined;

    // Direct match by qrCodeData
    matchedWarga = wargaList.find((w) => w.qrCodeData.toUpperCase() === decodedText.trim().toUpperCase());

    // Match by nomorRumah if not found
    if (!matchedWarga) {
      const cleanNum = decodedText.replace(/\D/g, '');
      matchedWarga = wargaList.find((w) => w.nomorRumah === cleanNum || w.nomorRumah === decodedText.trim());
    }

    // Match by JSON format if scanned QR has JSON payload
    if (!matchedWarga) {
      try {
        const parsed = JSON.parse(decodedText);
        if (parsed.nomorRumah) {
          matchedWarga = wargaList.find((w) => w.nomorRumah === String(parsed.nomorRumah));
        } else if (parsed.id) {
          matchedWarga = wargaList.find((w) => w.id === parsed.id);
        }
      } catch {
        // Not JSON
      }
    }

    if (matchedWarga) {
      openConfirmModal(matchedWarga);
    } else {
      if (soundEnabled) soundFx.playWarning();
      alert(`Kode QR tidak dikenali: "${decodedText}". Pastikan kartu QR terdaftar pada data warga RT.`);
    }
  };

  const openConfirmModal = (warga: Warga) => {
    setScannedWarga(warga);
    // Check if already scanned tonight to pre-fill or default
    const existing = recordsTonight.find((r) => r.wargaId === warga.id);
    if (existing) {
      setNominalInput(existing.nominal);
      setStatusInput(existing.status);
      setCatatanInput(existing.catatan || '');
    } else {
      setNominalInput(warga.nominalDefault || 1000);
      setStatusInput('sukses');
      setCatatanInput('');
    }
    setIsConfirmModalOpen(true);
  };

  const handleSaveConfirmed = () => {
    if (!scannedWarga) return;

    const now = new Date();
    const waktu = now.toTimeString().split(' ')[0];
    const finalNominal = statusInput === 'kosong' || statusInput === 'lewat' ? 0 : Number(nominalInput);

    onSaveRecord({
      tanggal: selectedDate,
      waktu,
      wargaId: scannedWarga.id,
      nomorRumah: scannedWarga.nomorRumah,
      namaWarga: scannedWarga.nama,
      nominal: finalNominal,
      status: statusInput,
      petugas: currentPetugas || 'Petugas',
      reguId: currentReguId,
      reguNama: currentReguNama,
      catatan: catatanInput.trim() || undefined,
    });

    triggerSuccessFeedback(scannedWarga, finalNominal, statusInput);
    setIsConfirmModalOpen(false);

    // If this was a monthly advance payment (>= 15000 or marked lunas 1 bulan), prompt receipt option
    const isMonthlyAdvance = finalNominal >= 15000 || (catatanInput && catatanInput.toLowerCase().includes('lunas 1 bulan'));
    if (isMonthlyAdvance && statusInput === 'sukses') {
      setMonthlyReceiptData({
        warga: scannedWarga,
        nominal: finalNominal,
        tanggal: selectedDate,
        bulan: currentMonthLabel,
        catatan: catatanInput.trim() || undefined,
      });
    }

    setScannedWarga(null);
  };


  // Start Camera
  const startCamera = async () => {
    setCameraError(null);
    setIsCameraActive(true);

    try {
      // Small delay for DOM element to mount
      setTimeout(async () => {
        try {
          const scanner = new Html5Qrcode('qr-reader-container');
          html5QrCodeRef.current = scanner;

          const config = {
            fps: 10,
            qrbox: { width: 250, height: 250 },
            aspectRatio: 1.0,
          };

          await scanner.start(
            { facingMode: 'environment' },
            config,
            (decodedText) => {
              // On QR successfully scanned
              processScannedCode(decodedText);
              // Pause or stop camera briefly
              stopCamera();
            },
            () => {
              // Ignore scan errors while seeking
            }
          );
        } catch (err: any) {
          console.error('Camera start error:', err);
          setCameraError(
            err.message || 'Tidak dapat mengakses kamera. Pastikan izin kamera telah diberikan di peramban Anda.'
          );
          setIsCameraActive(false);
        }
      }, 200);
    } catch (err: any) {
      setCameraError(err.message || 'Gagal menyalakan kamera.');
      setIsCameraActive(false);
    }
  };

  // Stop Camera
  const stopCamera = async () => {
    if (html5QrCodeRef.current) {
      try {
        if (html5QrCodeRef.current.isScanning) {
          await html5QrCodeRef.current.stop();
        }
        await html5QrCodeRef.current.clear();
      } catch (e) {
        console.warn('Error stopping scanner:', e);
      }
      html5QrCodeRef.current = null;
    }
    setIsCameraActive(false);
  };

  // Clean up on unmount or tab switch
  useEffect(() => {
    return () => {
      if (html5QrCodeRef.current && html5QrCodeRef.current.isScanning) {
        html5QrCodeRef.current.stop().catch(console.warn);
      }
    };
  }, []);

  // Filtered warga list for "Pilih Rumah"
  const filteredWarga = wargaList.filter((w) => {
    const matchesSearch =
      w.nama.toLowerCase().includes(searchQuery.toLowerCase()) ||
      w.nomorRumah.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (w.blok && w.blok.toLowerCase().includes(searchQuery.toLowerCase()));

    const isScanned = scannedWargaIds.has(w.id);

    if (!matchesSearch) return false;
    if (filterStatus === 'pending') return !isScanned;
    if (filterStatus === 'completed') return isScanned;
    return true;
  });

  return (
    <div className="w-full space-y-4" id="scanner-section-root">
      {/* Alert banner when scanning / recording for past date */}
      {isPastDate && (
        <div className="p-3 bg-amber-50 border border-amber-300/80 rounded-2xl flex items-center justify-between gap-2 shadow-2xs">
          <div className="flex items-center space-x-2 min-w-0">
            <Clock className="w-4 h-4 text-amber-600 shrink-0" />
            <div className="text-xs text-amber-950 font-semibold truncate">
              <span>Mode Pengurus: Mencatat untuk <strong>{formatTanggalIndo(selectedDate)}</strong></span>
            </div>
          </div>
          {onResetToToday && (
            <button
              type="button"
              onClick={onResetToToday}
              className="px-2.5 py-1 bg-amber-500 hover:bg-amber-600 text-white font-extrabold rounded-xl text-xs flex items-center space-x-1 shrink-0 transition-colors shadow-2xs cursor-pointer"
              title="Kembalikan ke Tanggal Hari Ini"
              id="btn-scanner-reset-today"
            >
              <RotateCcw className="w-3 h-3" />
              <span>Hari Ini</span>
            </button>
          )}
        </div>
      )}

      {/* 3 Nav Tabs: Kamera QR | Pilih Rumah | Log (X) */}
      <div className="flex items-center space-x-2 border-b border-sky-100/60 pb-1">
        {/* Tab 1: Kamera QR */}
        <button
          onClick={() => {
            setActiveTab('camera');
            if (isCameraActive) stopCamera();
          }}
          className={`flex-1 py-2.5 px-3 rounded-2xl font-bold text-xs sm:text-sm flex items-center justify-center space-x-2 transition-all cursor-pointer ${
            activeTab === 'camera'
              ? 'bg-sky-500 text-white shadow-sm'
              : 'bg-white border border-sky-200 text-sky-900 hover:bg-sky-50/60'
          }`}
          id="tab-kamera-qr"
        >
          <Camera className="w-4 h-4" />
          <span>Kamera QR</span>
        </button>

        {/* Tab 2: Pilih Rumah */}
        <button
          onClick={() => {
            setActiveTab('pilih_rumah');
            if (isCameraActive) stopCamera();
          }}
          className={`flex-1 py-2.5 px-3 rounded-2xl font-bold text-xs sm:text-sm flex items-center justify-center space-x-2 transition-all cursor-pointer ${
            activeTab === 'pilih_rumah'
              ? 'bg-sky-500 text-white shadow-sm'
              : 'bg-white border border-sky-200 text-sky-900 hover:bg-sky-50/60'
          }`}
          id="tab-pilih-rumah"
        >
          <Search className="w-4 h-4" />
          <span>Pilih Rumah</span>
        </button>

        {/* Tab 3: Log (X) */}
        <button
          onClick={() => {
            setActiveTab('log');
            if (isCameraActive) stopCamera();
          }}
          className={`flex-1 py-2.5 px-3 rounded-2xl font-bold text-xs sm:text-sm flex items-center justify-center space-x-2 transition-all cursor-pointer ${
            activeTab === 'log'
              ? 'bg-sky-500 text-white shadow-sm'
              : 'bg-white border border-sky-200 text-sky-900 hover:bg-sky-50/60'
          }`}
          id="tab-log-history"
        >
          <Clock className="w-4 h-4" />
          <span>Log ({recordsTonight.length})</span>
        </button>
      </div>

      {/* TAB 1: KAMERA QR VIEW */}
      {activeTab === 'camera' && (
        <div className="space-y-4">
          {/* Dark Scanner Card */}
          <div
            className="w-full relative bg-[#0b1626] rounded-3xl p-6 sm:p-8 text-center text-white border border-sky-900/50 shadow-xl overflow-hidden min-h-[340px] flex flex-col items-center justify-center"
            id="camera-scanner-viewport-card"
          >
            {/* Blue Corner Brackets HUD */}
            <div className="absolute top-4 left-4 w-6 h-6 border-t-2 border-l-2 border-sky-400 rounded-tl-md pointer-events-none" />
            <div className="absolute top-4 right-4 w-6 h-6 border-t-2 border-r-2 border-sky-400 rounded-tr-md pointer-events-none" />
            <div className="absolute bottom-4 left-4 w-6 h-6 border-b-2 border-l-2 border-sky-400 rounded-bl-md pointer-events-none" />
            <div className="absolute bottom-4 right-4 w-6 h-6 border-b-2 border-r-2 border-sky-400 rounded-br-md pointer-events-none" />

            {!isCameraActive ? (
              <div className="space-y-4 max-w-sm mx-auto z-10 flex flex-col items-center">
                {/* Blue Circular Camera Icon */}
                <div className="w-16 h-16 rounded-full bg-sky-600/30 border border-sky-400/40 flex items-center justify-center text-sky-400 shadow-inner">
                  <Camera className="w-8 h-8" />
                </div>

                <div className="space-y-1.5">
                  <h3 className="font-extrabold text-lg sm:text-xl text-white tracking-tight font-sans">
                    Scanner QR Siskamling
                  </h3>
                  <p className="text-xs sm:text-sm text-stone-300 leading-relaxed">
                    Arahkan kamera HP ke kartu QR di depan rumah warga.
                  </p>
                </div>

                {cameraError && (
                  <div className="p-3 rounded-xl bg-rose-950/80 border border-rose-800 text-rose-200 text-xs flex items-center space-x-2 text-left">
                    <AlertCircle className="w-4 h-4 flex-shrink-0 text-rose-400" />
                    <span>{cameraError}</span>
                  </div>
                )}

                {/* Big Action Button: BUKA KAMERA SCANNER */}
                <button
                  onClick={startCamera}
                  className="w-full sm:w-auto px-7 py-3 rounded-2xl bg-sky-500 hover:bg-sky-400 text-white font-extrabold text-xs sm:text-sm tracking-wide uppercase flex items-center justify-center space-x-2 shadow-lg shadow-sky-950/50 hover:scale-102 active:scale-98 transition-all cursor-pointer"
                  id="btn-buka-kamera-scanner"
                >
                  <Camera className="w-4.5 h-4.5" />
                  <span>BUKA KAMERA SCANNER</span>
                </button>
              </div>
            ) : (
              /* Live Camera Stream View */
              <div className="w-full space-y-4 flex flex-col items-center z-10">
                <div
                  id="qr-reader-container"
                  className="w-full max-w-[280px] sm:max-w-[320px] rounded-2xl overflow-hidden border-2 border-sky-400 bg-black aspect-square shadow-2xl"
                />

                <div className="flex items-center space-x-3">
                  <button
                    onClick={stopCamera}
                    className="px-5 py-2.5 rounded-xl bg-stone-800 hover:bg-stone-700 text-white text-xs font-bold flex items-center space-x-1.5 border border-stone-600 transition-colors cursor-pointer"
                  >
                    <X className="w-4 h-4 text-rose-400" />
                    <span>Tutup Kamera</span>
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Live Today's Recorded List (Tetap Muncul di Layar) */}
          <div className="bg-white rounded-3xl border border-sky-100 p-4 space-y-3 shadow-2xs">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                <h3 className="font-extrabold text-stone-900 text-xs sm:text-sm">
                  Catatan Masuk Hari Ini ({recordsTonight.length} Rumah)
                </h3>
              </div>
              <span className="text-xs font-extrabold text-sky-700 bg-sky-50 px-2.5 py-1 rounded-xl border border-sky-200">
                Rp {recordsTonight.reduce((sum, r) => sum + (r.nominal || 0), 0).toLocaleString('id-ID')}
              </span>
            </div>

            {recordsTonight.length === 0 ? (
              <div className="py-6 px-4 bg-sky-50/40 rounded-2xl border border-dashed border-sky-200 text-center space-y-1">
                <p className="text-xs font-bold text-sky-900">Belum ada jimpitan yang dicatat hari ini</p>
                <p className="text-[11px] text-stone-500">
                  Scan QR atau pilih rumah untuk mulai mengumpulkan jimpitan malam ini.
                </p>
              </div>
            ) : (
              <div className="space-y-2 max-h-[320px] overflow-y-auto pr-1">
                {recordsTonight.map((record) => (
                  <div
                    key={record.id}
                    className="p-3 rounded-2xl bg-sky-50/50 hover:bg-sky-50 border border-sky-100 flex items-center justify-between gap-2 transition-colors"
                  >
                    <div className="flex items-center space-x-2.5 min-w-0">
                      <div className="w-8 h-8 rounded-lg bg-emerald-600 text-white font-bold flex flex-col items-center justify-center shrink-0">
                        <span className="text-[7px] uppercase leading-none font-normal">No</span>
                        <span className="text-xs font-extrabold leading-none">{record.nomorRumah}</span>
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs font-bold text-stone-900 truncate">{record.namaWarga}</p>
                        <p className="text-[10px] text-stone-500 truncate">
                          {record.waktu} • {record.petugas}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center space-x-2 shrink-0">
                      <span className="text-xs font-extrabold text-emerald-700">
                        Rp {record.nominal.toLocaleString('id-ID')}
                      </span>
                      <button
                        onClick={() => {
                          const targetWarga = wargaList.find((w) => w.id === record.wargaId || w.nomorRumah === record.nomorRumah);
                          if (targetWarga) openConfirmModal(targetWarga);
                        }}
                        className="p-1 rounded-lg text-stone-400 hover:text-sky-600 hover:bg-white transition-colors"
                        title="Edit Catatan"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 2: PILIH RUMAH VIEW */}
      {activeTab === 'pilih_rumah' && (
        <div className="space-y-4" id="pilih-rumah-view">
          {/* Search bar & status filters */}
          <div className="space-y-2.5">
            <div className="relative">
              <Search className="w-4 h-4 text-stone-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Cari nomor rumah atau nama warga..."
                className="w-full pl-10 pr-4 py-2.5 rounded-2xl bg-white border border-sky-200 text-stone-900 text-xs sm:text-sm outline-none focus:ring-2 focus:ring-sky-300 shadow-2xs"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600 p-1"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Filter chips */}
            <div className="flex items-center space-x-2 overflow-x-auto pb-1">
              <button
                onClick={() => setFilterStatus('all')}
                className={`px-3 py-1 rounded-xl text-xs font-bold whitespace-nowrap cursor-pointer ${
                  filterStatus === 'all'
                    ? 'bg-sky-600 text-white shadow-2xs'
                    : 'bg-white border border-stone-200 text-stone-600 hover:bg-stone-50'
                }`}
              >
                Semua ({wargaList.length})
              </button>
              <button
                onClick={() => setFilterStatus('pending')}
                className={`px-3 py-1 rounded-xl text-xs font-bold whitespace-nowrap cursor-pointer ${
                  filterStatus === 'pending'
                    ? 'bg-sky-600 text-white shadow-2xs'
                    : 'bg-white border border-stone-200 text-stone-600 hover:bg-stone-50'
                }`}
              >
                Belum Diambil ({wargaList.length - scannedWargaIds.size})
              </button>
              <button
                onClick={() => setFilterStatus('completed')}
                className={`px-3 py-1 rounded-xl text-xs font-bold whitespace-nowrap cursor-pointer ${
                  filterStatus === 'completed'
                    ? 'bg-sky-600 text-white shadow-2xs'
                    : 'bg-white border border-stone-200 text-stone-600 hover:bg-stone-50'
                }`}
              >
                Sudah Diambil ({scannedWargaIds.size})
              </button>
            </div>

            {/* Action Banner for Pending Warga */}
            {wargaList.length - scannedWargaIds.size > 0 && onOpenShareModal && (
              <div className="p-3 rounded-2xl bg-sky-50 border border-sky-200 flex items-center justify-between gap-2 shadow-2xs">
                <div className="flex items-center space-x-2 text-xs text-sky-900 font-semibold min-w-0">
                  <BellRing className="w-4 h-4 text-sky-600 flex-shrink-0" />
                  <span className="truncate">
                    <strong>{wargaList.length - scannedWargaIds.size} rumah</strong> belum setor jimpitan
                  </span>
                </div>
                <button
                  onClick={() => onOpenShareModal('pengingat')}
                  className="px-3 py-1.5 rounded-xl bg-sky-600 hover:bg-sky-700 text-white text-xs font-extrabold flex items-center space-x-1.5 shadow-2xs flex-shrink-0 cursor-pointer transition-colors"
                  id="btn-quick-remind-wa"
                >
                  <Share2 className="w-3.5 h-3.5" />
                  <span>Kirim Pengingat WA</span>
                </button>
              </div>
            )}
          </div>

          {/* List of Warga */}
          <div className="space-y-2 max-h-[460px] overflow-y-auto pr-1">
            {filteredWarga.length === 0 ? (
              <div className="bg-white rounded-2xl border border-stone-200 p-8 text-center text-stone-500 text-xs">
                Tidak ada warga yang sesuai dengan pencarian "{searchQuery}".
              </div>
            ) : (
              filteredWarga.map((warga) => {
                const existingRecord = recordsTonight.find((r) => r.wargaId === warga.id);
                const isScanned = Boolean(existingRecord);
                const monthlyAdvance = getWargaMonthlyAdvanceRecord(warga.id);

                return (
                  <div
                    key={warga.id}
                    className={`p-3.5 rounded-2xl border transition-all flex items-center justify-between gap-3 ${
                      isScanned
                        ? 'bg-emerald-50/70 border-emerald-200'
                        : monthlyAdvance
                        ? 'bg-amber-50/40 border-amber-200 hover:border-amber-300 shadow-2xs'
                        : 'bg-white border-stone-200 hover:border-sky-300 shadow-2xs'
                    }`}
                  >
                    <div className="flex items-center space-x-3 min-w-0">
                      {/* House badge */}
                      <div
                        className={`w-10 h-10 rounded-xl flex flex-col items-center justify-center flex-shrink-0 font-bold ${
                          isScanned
                            ? 'bg-emerald-600 text-white'
                            : monthlyAdvance
                            ? 'bg-amber-500 text-white shadow-xs'
                            : 'bg-sky-100 text-sky-900 border border-sky-200'
                        }`}
                      >
                        <span className="text-[9px] uppercase leading-none font-normal">No</span>
                        <span className="text-sm font-extrabold leading-none">{warga.nomorRumah}</span>
                      </div>

                      {/* Name and info */}
                      <div className="min-w-0">
                        <div className="flex items-center space-x-1.5">
                          <h4 className="font-bold text-stone-900 text-xs sm:text-sm truncate">
                            {warga.nama}
                          </h4>
                          {monthlyAdvance && !isScanned && (
                            <span className="px-1.5 py-0.5 rounded-md bg-amber-100 text-amber-900 text-[10px] font-extrabold shrink-0 border border-amber-200">
                              Lunas 1 Bln
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] text-stone-500 truncate">
                          {warga.alamat || `${warga.blok || ''} RT ${warga.rt}`} • Def: Rp {warga.nominalDefault.toLocaleString('id-ID')}
                        </p>
                      </div>
                    </div>

                    {/* Action button */}
                    <div className="flex items-center space-x-2 flex-shrink-0">
                      {isScanned ? (
                        <button
                          onClick={() => openConfirmModal(warga)}
                          className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center space-x-1 cursor-pointer"
                        >
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>Rp {existingRecord?.nominal.toLocaleString('id-ID')}</span>
                        </button>
                      ) : monthlyAdvance ? (
                        <button
                          onClick={() => openConfirmModal(warga)}
                          className="px-3 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold shadow-2xs transition-colors cursor-pointer flex items-center space-x-1"
                        >
                          <Sparkles className="w-3.5 h-3.5" />
                          <span>Lunas</span>
                        </button>
                      ) : (
                        <button
                          onClick={() => openConfirmModal(warga)}
                          className="px-3.5 py-1.5 rounded-xl bg-sky-500 hover:bg-sky-600 text-white text-xs font-bold shadow-2xs transition-colors cursor-pointer"
                        >
                          Ambil
                        </button>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>

        </div>
      )}

      {/* TAB 3: LOG HISTORY VIEW */}
      {activeTab === 'log' && (
        <div className="space-y-3" id="log-history-view">
          <div className="flex items-center justify-between text-xs text-stone-600 font-bold px-1">
            <span>Riwayat Jimpitan Malam Ini ({recordsTonight.length} Rumah)</span>
            <span className="text-sky-600 font-extrabold">
              Total: Rp {recordsTonight.reduce((sum, r) => sum + r.nominal, 0).toLocaleString('id-ID')}
            </span>
          </div>

          {recordsTonight.length === 0 ? (
            <div className="bg-white rounded-3xl border border-dashed border-stone-300 p-10 text-center space-y-2">
              <Clock className="w-8 h-8 text-stone-400 mx-auto" />
              <h4 className="font-bold text-stone-800 text-sm">Belum ada jimpitan yang dicatat</h4>
              <p className="text-xs text-stone-500">
                Gunakan tab Kamera QR atau Pilih Rumah untuk mulai mencatat jimpitan malam ini.
              </p>
            </div>
          ) : (
            <div className="space-y-2 max-h-[460px] overflow-y-auto pr-1">
              {recordsTonight.map((record) => (
                <div
                  key={record.id}
                  className="bg-white rounded-2xl border border-stone-200 p-3.5 flex items-center justify-between gap-2 shadow-2xs hover:border-sky-300 transition-all"
                >
                  <div className="flex items-center space-x-3 min-w-0">
                    <div className="w-10 h-10 rounded-xl bg-sky-100 text-sky-900 font-bold flex flex-col items-center justify-center flex-shrink-0">
                      <span className="text-[8px] uppercase">No</span>
                      <span className="text-xs font-extrabold">{record.nomorRumah}</span>
                    </div>

                    <div className="min-w-0">
                      <div className="flex items-center space-x-1.5">
                        <h4 className="font-bold text-stone-900 text-xs truncate">
                          {record.namaWarga}
                        </h4>
                        <span
                          className={`px-1.5 py-0.5 rounded-md text-[10px] font-bold ${
                            record.status === 'sukses'
                              ? 'bg-emerald-100 text-emerald-800'
                              : record.status === 'kosong'
                              ? 'bg-rose-100 text-rose-800'
                              : 'bg-amber-100 text-amber-800'
                          }`}
                        >
                          {record.status}
                        </span>
                      </div>
                      <p className="text-[11px] text-stone-400">
                        {record.waktu} • {record.petugas}
                        {record.catatan && ` • "${record.catatan}"`}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center space-x-1.5 flex-shrink-0">
                    <span className="font-extrabold text-sky-600 text-xs sm:text-sm">
                      Rp {record.nominal.toLocaleString('id-ID')}
                    </span>

                    <button
                      onClick={() => {
                        const targetWarga = wargaList.find((w) => w.id === record.wargaId || w.nomorRumah === record.nomorRumah);
                        if (targetWarga) {
                          openConfirmModal(targetWarga);
                        }
                      }}
                      className="p-1.5 rounded-lg text-stone-400 hover:text-sky-600 hover:bg-sky-50 transition-colors"
                      title="Ubah / Edit Catatan Ini"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                    </button>

                    <button
                      onClick={() => {
                        if (window.confirm(`Hapus catatan jimpitan Rumah No. ${record.nomorRumah}?`)) {
                          onDeleteRecord(record.id);
                        }
                      }}
                      className="p-1.5 rounded-lg text-stone-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                      title="Hapus / Batalkan Catatan"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}

              {onOpenFinishModal && (
                <div className="pt-2">
                  <button
                    onClick={onOpenFinishModal}
                    className="w-full py-3 px-4 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs sm:text-sm flex items-center justify-center space-x-2 shadow-xs transition-all cursor-pointer"
                  >
                    <MessageSquare className="w-4 h-4 fill-current" />
                    <span>Selesaikan Penarikan & Kirim Laporan WA</span>
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* CONFIRMATION / RECORD MODAL */}
      {isConfirmModalOpen && scannedWarga && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl border border-stone-200 shadow-2xl max-w-sm w-full p-5 space-y-4 max-h-[90vh] overflow-y-auto animate-in fade-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="flex items-start justify-between border-b border-stone-100 pb-3">
              <div className="flex items-center space-x-3">
                <div className="w-12 h-12 rounded-2xl bg-sky-500 text-white font-extrabold flex flex-col items-center justify-center shadow-sm">
                  <span className="text-[9px] uppercase font-normal">Rumah</span>
                  <span className="text-base font-extrabold leading-none">{scannedWarga.nomorRumah}</span>
                </div>
                <div>
                  <h3 className="font-bold text-stone-900 text-sm sm:text-base line-clamp-1">
                    {scannedWarga.nama}
                  </h3>
                  <p className="text-xs text-stone-500">{scannedWarga.alamat || `${scannedWarga.rt}/${scannedWarga.rw}`}</p>
                </div>
              </div>
              <button
                onClick={() => setIsConfirmModalOpen(false)}
                className="p-1.5 rounded-xl text-stone-400 hover:text-stone-700 hover:bg-stone-100"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Advance Payment Info Banner if Already Paid This Month */}
            {(() => {
              const advRecord = getWargaMonthlyAdvanceRecord(scannedWarga.id);
              if (advRecord) {
                return (
                  <div className="bg-amber-50 border border-amber-200 rounded-2xl p-3 flex items-start space-x-2.5">
                    <Sparkles className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                    <div className="text-xs">
                      <span className="font-extrabold text-amber-900 block">Warga Ini Sudah Lunas Bulan Ini!</span>
                      <span className="text-amber-800 text-[11px] leading-relaxed">
                        Tercatat {formatRupiah(advRecord.nominal)} pada {formatTanggalIndo(advRecord.tanggal)}. 
                        Gunakan tombol <strong>"Bebas Tarik"</strong> jika tidak perlu menarik malam ini.
                      </span>
                    </div>
                  </div>
                );
              }
              return null;
            })()}

            {/* PRESET BAYAR DIMUKA / 1 BULAN */}
            <div className="bg-gradient-to-br from-amber-50 to-orange-50/60 rounded-2xl border border-amber-200/80 p-3 space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-extrabold uppercase tracking-wider text-amber-900 flex items-center space-x-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-amber-600" />
                  <span>Preset Bayar Dimuka:</span>
                </span>
                <span className="text-[10px] text-amber-800 font-bold bg-amber-200/80 px-2 py-0.5 rounded-full">
                  {currentMonthLabel}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-2">
                {/* Tombol Lunas 1 Bulan */}
                <button
                  type="button"
                  onClick={() => {
                    const monthlyAmount = (scannedWarga.nominalDefault || 1000) * 30;
                    setNominalInput(monthlyAmount);
                    setStatusInput('sukses');
                    setCatatanInput(`Lunas Jimpitan 1 Bulan (${currentMonthLabel})`);
                  }}
                  className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                    nominalInput === (scannedWarga.nominalDefault || 1000) * 30 && statusInput === 'sukses'
                      ? 'bg-amber-600 text-white border-amber-700 shadow-xs'
                      : 'bg-white text-stone-800 border-amber-200 hover:bg-amber-100/70'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-extrabold">🌟 Lunas 1 Bulan</span>
                    <span className="text-[10px] opacity-80 font-bold">30 Hari</span>
                  </div>
                  <p className="text-xs font-black mt-1">
                    {formatRupiah((scannedWarga.nominalDefault || 1000) * 30)}
                  </p>
                </button>

                {/* Tombol Lunas 1 Minggu */}
                <button
                  type="button"
                  onClick={() => {
                    const weeklyAmount = (scannedWarga.nominalDefault || 1000) * 7;
                    setNominalInput(weeklyAmount);
                    setStatusInput('sukses');
                    setCatatanInput(`Lunas Jimpitan 1 Minggu`);
                  }}
                  className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                    nominalInput === (scannedWarga.nominalDefault || 1000) * 7 && statusInput === 'sukses'
                      ? 'bg-amber-600 text-white border-amber-700 shadow-xs'
                      : 'bg-white text-stone-800 border-amber-200 hover:bg-amber-100/70'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-extrabold">📅 Lunas 1 Minggu</span>
                    <span className="text-[10px] opacity-80 font-bold">7 Hari</span>
                  </div>
                  <p className="text-xs font-black mt-1">
                    {formatRupiah((scannedWarga.nominalDefault || 1000) * 7)}
                  </p>
                </button>
              </div>

              {/* Tombol Status: Bebas Tarik (Sudah Lunas Dimuka) */}
              <button
                type="button"
                onClick={() => {
                  setNominalInput(0);
                  setStatusInput('lewat');
                  setCatatanInput(`Sudah Lunas 1 Bulan Dimuka`);
                }}
                className={`w-full py-2 px-3 rounded-xl border text-xs font-bold transition-all flex items-center justify-between cursor-pointer ${
                  statusInput === 'lewat'
                    ? 'bg-emerald-600 text-white border-emerald-700 shadow-xs'
                    : 'bg-white text-emerald-800 border-emerald-300 hover:bg-emerald-50'
                }`}
              >
                <span className="flex items-center space-x-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                  <span>Tandai: Bebas Tarik (Sudah Lunas Dimuka)</span>
                </span>
                <span className="text-xs font-extrabold">Rp 0</span>
              </button>
            </div>

            {/* Quick Daily Nominal Selector Chips */}
            <div className="space-y-2">
              <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider">
                Nominal Jimpitan Harian:
              </label>
              <div className="grid grid-cols-3 gap-2">
                {[500, 1000, 2000, 5000, 10000, 0].map((nom) => (
                  <button
                    key={nom}
                    type="button"
                    onClick={() => {
                      setNominalInput(nom);
                      if (nom === 0) setStatusInput('kosong');
                      else setStatusInput('sukses');
                    }}
                    className={`py-2 px-2 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                      nominalInput === nom && statusInput !== 'lewat'
                        ? 'bg-sky-500 text-white border-sky-600 shadow-xs'
                        : 'bg-stone-50 text-stone-700 border-stone-200 hover:bg-stone-100'
                    }`}
                  >
                    {nom === 0 ? 'Rp 0 (Kosong)' : `Rp ${nom.toLocaleString('id-ID')}`}
                  </button>
                ))}
              </div>
            </div>

            {/* Custom Nominal & Status Radio */}
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-stone-600 mb-1">
                  Nominal Kustom (Rp):
                </label>
                <input
                  type="number"
                  value={nominalInput}
                  onChange={(e) => setNominalInput(Number(e.target.value))}
                  className="w-full px-3 py-2 rounded-xl bg-stone-50 border border-stone-300 font-bold text-stone-900 text-sm outline-none focus:ring-2 focus:ring-sky-400"
                />
              </div>

              {/* Status Selector */}
              <div className="grid grid-cols-3 gap-1.5 text-xs">
                {(['sukses', 'kosong', 'titip'] as const).map((st) => (
                  <button
                    key={st}
                    type="button"
                    onClick={() => {
                      setStatusInput(st);
                      if (st === 'kosong') setNominalInput(0);
                    }}
                    className={`py-1.5 rounded-xl capitalize font-bold border transition-all cursor-pointer ${
                      statusInput === st
                        ? 'bg-stone-900 text-white border-stone-900'
                        : 'bg-white text-stone-600 border-stone-200'
                    }`}
                  >
                    {st === 'sukses' ? '✅ Terambil' : st === 'kosong' ? '❌ Kosong' : '📦 Titipan'}
                  </button>
                ))}
              </div>

              {/* Catatan Tambahan */}
              <div>
                <input
                  type="text"
                  value={catatanInput}
                  onChange={(e) => setCatatanInput(e.target.value)}
                  placeholder="Catatan tambahan (misal: Lunas 1 Bulan September)"
                  className="w-full px-3 py-2 rounded-xl bg-stone-50 border border-stone-200 text-xs text-stone-800 outline-none"
                />
              </div>
            </div>

            {/* Action Save Button */}
            <div className="pt-2">
              <button
                onClick={handleSaveConfirmed}
                className="w-full py-3 rounded-2xl bg-sky-500 hover:bg-sky-400 text-white font-extrabold text-xs sm:text-sm tracking-wide shadow-md transition-all cursor-pointer"
                id="btn-simpan-jimpitan"
              >
                SIMPAN CATATAN JIMPITAN
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL BUKTI PEMBAYARAN LUNAS 1 BULAN (WHATSAPP RECEIPT) */}
      {monthlyReceiptData && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs z-50 flex items-center justify-center p-4 animate-in fade-in duration-150">
          <div className="bg-white rounded-3xl border border-stone-200 shadow-2xl max-w-sm w-full p-5 space-y-4">
            <div className="text-center space-y-1.5">
              <div className="w-12 h-12 bg-amber-100 text-amber-600 rounded-2xl flex items-center justify-center mx-auto mb-2">
                <Sparkles className="w-6 h-6" />
              </div>
              <h3 className="text-base font-extrabold text-stone-900">
                Pembayaran Lunas 1 Bulan Tercatat!
              </h3>
              <p className="text-xs text-stone-600">
                Penerimaan jimpitan Rumah No. <strong>{monthlyReceiptData.warga.nomorRumah}</strong> ({monthlyReceiptData.warga.nama}) sejumlah <strong>{formatRupiah(monthlyReceiptData.nominal)}</strong> telah berhasil disimpan ke kas RT.
              </p>
            </div>

            <div className="bg-stone-50 rounded-2xl p-3 border border-stone-200 space-y-1 text-xs">
              <div className="flex justify-between text-stone-600">
                <span>Periode:</span>
                <span className="font-bold text-stone-900">{monthlyReceiptData.bulan}</span>
              </div>
              <div className="flex justify-between text-stone-600">
                <span>Jumlah Diterima:</span>
                <span className="font-bold text-emerald-700">{formatRupiah(monthlyReceiptData.nominal)}</span>
              </div>
              <div className="flex justify-between text-stone-600">
                <span>Nomor HP/WA:</span>
                <span className="font-bold text-stone-900">
                  {monthlyReceiptData.warga.nomorHp || 'Belum diisi'}
                </span>
              </div>
            </div>

            <div className="space-y-2 pt-1">
              {monthlyReceiptData.warga.nomorHp ? (
                <a
                  href={`https://wa.me/${cleanWhatsAppPhone(monthlyReceiptData.warga.nomorHp)}?text=${generateWhatsAppMonthlyAdvanceReceipt(
                    monthlyReceiptData.warga,
                    monthlyReceiptData.nominal,
                    monthlyReceiptData.tanggal,
                    monthlyReceiptData.bulan,
                    currentPetugas,
                    rt,
                    rw,
                    lingkungan
                  )}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={() => setMonthlyReceiptData(null)}
                  className="w-full py-3 px-4 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs sm:text-sm flex items-center justify-center space-x-2 shadow-xs transition-colors"
                >
                  <MessageSquare className="w-4 h-4 fill-current" />
                  <span>Kirim Struk WA ke Warga</span>
                </a>
              ) : (
                <a
                  href={`https://api.whatsapp.com/send?text=${generateWhatsAppMonthlyAdvanceReceipt(
                    monthlyReceiptData.warga,
                    monthlyReceiptData.nominal,
                    monthlyReceiptData.tanggal,
                    monthlyReceiptData.bulan,
                    currentPetugas,
                    rt,
                    rw,
                    lingkungan
                  )}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={() => setMonthlyReceiptData(null)}
                  className="w-full py-3 px-4 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs sm:text-sm flex items-center justify-center space-x-2 shadow-xs transition-colors"
                >
                  <Share2 className="w-4 h-4" />
                  <span>Bagikan Struk ke WhatsApp</span>
                </a>
              )}

              <button
                type="button"
                onClick={() => setMonthlyReceiptData(null)}
                className="w-full py-2.5 rounded-2xl bg-stone-100 hover:bg-stone-200 text-stone-700 font-bold text-xs transition-colors cursor-pointer"
              >
                Selesai / Tutup
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

