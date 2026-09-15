import React, { useState, useMemo, useEffect } from 'react';
import {
  Calendar,
  CheckCircle2,
  AlertTriangle,
  X,
  Sparkles,
  Users,
  Search,
  Check,
  ChevronLeft,
  ChevronRight,
  DollarSign,
  ShieldCheck,
  Clock,
  Share2,
  FileText,
  CalendarDays,
  UserCheck
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { Warga, JimpitanRecord, AppSettings, ReguRonda } from '../types';
import { formatRupiah, formatTanggalIndo } from '../utils/formatters';
import { soundFx } from '../utils/audio';
import { getWeeksInMonth, analyzeWargaWeekStatus, WeekDefinition } from '../utils/weeklyJimpitanHelper';

interface InputJimpitanMingguanModalProps {
  isOpen: boolean;
  onClose: () => void;
  wargaList: Warga[];
  allRecords: JimpitanRecord[];
  onSaveBatchRecords: (records: Omit<JimpitanRecord, 'id' | 'createdAt'>[]) => Promise<void>;
  currentPetugas: string;
  currentReguNama: string;
  currentReguId: string;
  settings: AppSettings;
  preselectedWarga?: Warga | null;
  initialDate?: string;
}

export const InputJimpitanMingguanModal: React.FC<InputJimpitanMingguanModalProps> = ({
  isOpen,
  onClose,
  wargaList,
  allRecords,
  onSaveBatchRecords,
  currentPetugas,
  currentReguNama,
  currentReguId,
  settings,
  preselectedWarga,
  initialDate = new Date().toISOString().split('T')[0],
}) => {
  // Selected Warga
  const [selectedWargaId, setSelectedWargaId] = useState<string>(preselectedWarga?.id || '');
  const [wargaSearch, setWargaSearch] = useState<string>('');

  // Selected Year-Month
  const [activeYearMonth, setActiveYearMonth] = useState<string>(() => {
    if (initialDate && initialDate.includes('-')) {
      const parts = initialDate.split('-');
      return `${parts[0]}-${parts[1]}`;
    }
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  });

  // Selected Week Index (0 for Week 1, 1 for Week 2, etc.)
  const [selectedWeekIdx, setSelectedWeekIdx] = useState<number>(0);

  // Selected Days for Payment (set of dateStr)
  const [selectedDatesToPay, setSelectedDatesToPay] = useState<string[]>([]);

  // Officer & Note details
  const [petugas, setPetugas] = useState<string>(currentPetugas || 'Petugas Ronda');
  const [reguNama, setReguNama] = useState<string>(currentReguNama || 'Regu Ronda RT');
  const [catatan, setCatatan] = useState<string>('');
  const [customNominalPerDay, setCustomNominalPerDay] = useState<number | ''>('');
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [saveSuccessMessage, setSaveSuccessMessage] = useState<string | null>(null);

  // Update selection if preselectedWarga changes
  useEffect(() => {
    if (preselectedWarga) {
      setSelectedWargaId(preselectedWarga.id);
    } else if (!selectedWargaId && wargaList.length > 0) {
      setSelectedWargaId(wargaList[0].id);
    }
  }, [preselectedWarga, wargaList]);

  // Parse active year and month
  const [activeYear, activeMonth] = useMemo(() => {
    const parts = activeYearMonth.split('-').map(Number);
    return [parts[0] || new Date().getFullYear(), parts[1] || new Date().getMonth() + 1];
  }, [activeYearMonth]);

  // Compute weeks in active month
  const weeksInMonth = useMemo(() => {
    return getWeeksInMonth(activeYear, activeMonth);
  }, [activeYear, activeMonth]);

  const activeWeek: WeekDefinition | undefined = weeksInMonth[selectedWeekIdx] || weeksInMonth[0];

  // Selected Warga object
  const currentWarga = useMemo(() => {
    return wargaList.find((w) => w.id === selectedWargaId) || null;
  }, [wargaList, selectedWargaId]);

  // Daily nominal for this warga
  const nominalPerDay = useMemo(() => {
    if (typeof customNominalPerDay === 'number' && customNominalPerDay > 0) {
      return customNominalPerDay;
    }
    return currentWarga?.nominalDefault || settings.defaultNominal || 1000;
  }, [customNominalPerDay, currentWarga, settings.defaultNominal]);

  // Analyze status of days in active week for this warga
  const weekAnalysis = useMemo(() => {
    if (!currentWarga || !activeWeek) {
      return {
        days: [],
        paidDaysCount: 0,
        unpaidDaysCount: 0,
        unpaidDayNames: [],
        totalExpectedNominal: 0,
        totalAlreadyPaid: 0,
        totalRemainingNominal: 0,
        isFullyPaid: false,
        hasEmptyDays: false,
      };
    }
    return analyzeWargaWeekStatus(currentWarga, activeWeek, allRecords, settings.defaultNominal);
  }, [currentWarga, activeWeek, allRecords, settings.defaultNominal]);

  // When week or warga changes, auto-select empty/unpaid days by default
  useEffect(() => {
    if (weekAnalysis.days.length > 0) {
      const unpaidDates = weekAnalysis.days.filter((d) => !d.isPaid).map((d) => d.dateStr);
      setSelectedDatesToPay(unpaidDates);
      setSaveSuccessMessage(null);
    }
  }, [weekAnalysis.days, selectedWargaId, selectedWeekIdx, activeYearMonth]);

  // Toggle selection for a specific date
  const handleToggleDate = (dateStr: string) => {
    setSelectedDatesToPay((prev) => {
      if (prev.includes(dateStr)) {
        return prev.filter((d) => d !== dateStr);
      } else {
        return [...prev, dateStr];
      }
    });
  };

  // Quick action: Select only empty/unpaid days
  const handleSelectOnlyEmptyDays = () => {
    const unpaidDates = weekAnalysis.days.filter((d) => !d.isPaid).map((d) => d.dateStr);
    setSelectedDatesToPay(unpaidDates);
  };

  // Quick action: Select all days in week
  const handleSelectAllDays = () => {
    const allDates = weekAnalysis.days.map((d) => d.dateStr);
    setSelectedDatesToPay(allDates);
  };

  // Quick action: Clear selection
  const handleClearSelection = () => {
    setSelectedDatesToPay([]);
  };

  // Month navigation helpers
  const handlePrevMonth = () => {
    let newYear = activeYear;
    let newMonth = activeMonth - 1;
    if (newMonth < 1) {
      newMonth = 12;
      newYear -= 1;
    }
    setActiveYearMonth(`${newYear}-${String(newMonth).padStart(2, '0')}`);
    setSelectedWeekIdx(0);
  };

  const handleNextMonth = () => {
    let newYear = activeYear;
    let newMonth = activeMonth + 1;
    if (newMonth > 12) {
      newMonth = 1;
      newYear += 1;
    }
    setActiveYearMonth(`${newYear}-${String(newMonth).padStart(2, '0')}`);
    setSelectedWeekIdx(0);
  };

  const monthNames = [
    'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
    'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
  ];
  const activeMonthLabel = `${monthNames[activeMonth - 1]} ${activeYear}`;

  // Filtered warga list for dropdown/search
  const filteredWargaOptions = useMemo(() => {
    if (!wargaSearch.trim()) return wargaList;
    const q = wargaSearch.toLowerCase();
    return wargaList.filter(
      (w) =>
        w.nomorRumah.toLowerCase().includes(q) ||
        w.nama.toLowerCase().includes(q) ||
        (w.blok && w.blok.toLowerCase().includes(q))
    );
  }, [wargaList, wargaSearch]);

  // Total nominal to be paid
  const totalNominalToPay = selectedDatesToPay.length * nominalPerDay;

  // Handle Save Batch
  const handleSubmitPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentWarga) {
      alert('Silakan pilih data warga terlebih dahulu.');
      return;
    }
    if (selectedDatesToPay.length === 0) {
      alert('Pilih minimal satu hari untuk disimpan pembayarannya.');
      return;
    }

    setIsSaving(true);
    try {
      const now = new Date();
      const timeStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}:${String(now.getSeconds()).padStart(2, '0')}`;
      const defaultNote = catatan.trim() || `Setor Jimpitan Mingguan (${selectedDatesToPay.length} hari: ${activeWeek?.label})`;

      const recordsToSave: Omit<JimpitanRecord, 'id' | 'createdAt'>[] = selectedDatesToPay.map((dateStr) => {
        return {
          tanggal: dateStr,
          waktu: timeStr,
          wargaId: currentWarga.id,
          nomorRumah: currentWarga.nomorRumah,
          namaWarga: currentWarga.nama,
          nominal: nominalPerDay,
          status: 'sukses',
          petugas: petugas.trim() || currentPetugas || 'Petugas Ronda',
          reguId: currentReguId || 'regu-1',
          reguNama: reguNama.trim() || currentReguNama || 'Regu Ronda',
          catatan: defaultNote,
        };
      });

      await onSaveBatchRecords(recordsToSave);

      // Play sound fx
      if (settings.soundEnabled) {
        soundFx.playSuccess();
      }

      // Confetti effect
      try {
        confetti({
          particleCount: 40,
          spread: 60,
          origin: { y: 0.6 },
        });
      } catch (e) {
        // ignore
      }

      setSaveSuccessMessage(`Berhasil menyimpan jimpitan ${selectedDatesToPay.length} hari untuk ${currentWarga.nama} (Total: ${formatRupiah(totalNominalToPay)})`);
      setSelectedDatesToPay([]);
    } catch (err) {
      console.error('Failed to save weekly jimpitan:', err);
      alert('Terjadi kesalahan saat menyimpan data jimpitan mingguan.');
    } finally {
      setIsSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 bg-black/70 backdrop-blur-xs z-50 flex items-center justify-center p-2 sm:p-4 overflow-y-auto"
      id="modal-input-jimpitan-mingguan"
    >
      <div className="bg-white rounded-3xl max-w-3xl w-full border border-stone-200 shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150 my-6">
        {/* Modal Header */}
        <div className="px-5 py-4 sm:px-6 sm:py-4.5 bg-gradient-to-r from-sky-900 via-indigo-900 to-slate-900 text-white flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-2xl bg-sky-500/20 border border-sky-400/30 flex items-center justify-center text-sky-300">
              <CalendarDays className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h3 className="font-extrabold text-base sm:text-lg">Input Jimpitan / Kas Perminggu</h3>
                <span className="px-2 py-0.5 rounded-md bg-amber-500/20 border border-amber-400/30 text-amber-300 text-[10px] font-bold">
                  Deteksi Hari Kosong
                </span>
              </div>
              <p className="text-xs text-sky-200/80">
                Pencatatan jimpitan mingguan cerdas dengan deteksi otomatis hari yang belum terbayar
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl text-stone-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <form onSubmit={handleSubmitPayment} className="p-4 sm:p-6 space-y-5 max-h-[78vh] overflow-y-auto">
          {saveSuccessMessage && (
            <div className="p-3.5 rounded-2xl bg-emerald-50 border border-emerald-300 text-emerald-900 flex items-center justify-between animate-in fade-in">
              <div className="flex items-center space-x-2.5">
                <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                <span className="text-xs font-bold">{saveSuccessMessage}</span>
              </div>
              <button
                type="button"
                onClick={() => setSaveSuccessMessage(null)}
                className="text-emerald-700 hover:text-emerald-900 text-xs font-bold underline"
              >
                Tutup
              </button>
            </div>
          )}

          {/* 1. Pilih Warga & Periode Bulan */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Warga Selector */}
            <div className="space-y-1.5">
              <label className="text-xs font-extrabold text-stone-800 flex items-center space-x-1.5">
                <Users className="w-4 h-4 text-sky-600" />
                <span>Pilih Warga / Rumah</span>
              </label>
              <div className="space-y-1.5">
                <select
                  value={selectedWargaId}
                  onChange={(e) => setSelectedWargaId(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-stone-50 border border-stone-200 text-xs font-bold text-stone-900 outline-none focus:ring-2 focus:ring-sky-400"
                >
                  {wargaList.map((w) => (
                    <option key={w.id} value={w.id}>
                      No. {w.nomorRumah} - {w.nama} ({w.blok || 'Blok A'}) • Tarif: {formatRupiah(w.nominalDefault || 1000)}/hr
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Month Selector */}
            <div className="space-y-1.5">
              <label className="text-xs font-extrabold text-stone-800 flex items-center space-x-1.5">
                <Calendar className="w-4 h-4 text-sky-600" />
                <span>Pilih Bulan & Tahun</span>
              </label>
              <div className="flex items-center space-x-1.5 bg-stone-50 p-1 rounded-xl border border-stone-200">
                <button
                  type="button"
                  onClick={handlePrevMonth}
                  className="p-1.5 rounded-lg hover:bg-stone-200 text-stone-600 transition-colors"
                  title="Bulan Sebelumnya"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <span className="flex-1 text-center text-xs font-black text-stone-800">
                  {activeMonthLabel}
                </span>
                <button
                  type="button"
                  onClick={handleNextMonth}
                  className="p-1.5 rounded-lg hover:bg-stone-200 text-stone-600 transition-colors"
                  title="Bulan Berikutnya"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>

          {/* 2. Selector Minggu (Week Buttons Tabs) */}
          <div className="space-y-1.5">
            <label className="text-xs font-extrabold text-stone-800 block">
              Pilih Periode Minggu di Bulan Ini:
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
              {weeksInMonth.map((week, idx) => {
                const isSelected = idx === selectedWeekIdx;
                return (
                  <button
                    key={week.weekNumber}
                    type="button"
                    onClick={() => setSelectedWeekIdx(idx)}
                    className={`px-3 py-2.5 rounded-xl border text-xs font-extrabold text-center transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-sky-600 text-white border-sky-600 shadow-md ring-2 ring-sky-300'
                        : 'bg-stone-50 hover:bg-stone-100 text-stone-700 border-stone-200'
                    }`}
                  >
                    <div className="text-[11px] opacity-80">Minggu {week.weekNumber}</div>
                    <div className="text-[10px] font-bold">
                      Tgl {week.days[0].dayOfMonth} - {week.days[week.days.length - 1].dayOfMonth}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* 3. Smart Empty-Day Detection Banner (Deteksi Hari Kosong Bayar) */}
          <div className="p-4 rounded-2xl border transition-all">
            {weekAnalysis.hasEmptyDays ? (
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-amber-50/90 border border-amber-200/90 p-3.5 rounded-xl text-amber-950">
                <div className="flex items-start space-x-2.5">
                  <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                  <div>
                    <div className="text-xs font-black text-amber-900 flex items-center space-x-1.5">
                      <span>Terdeteksi {weekAnalysis.unpaidDaysCount} Hari Kosong / Belum Bayar:</span>
                    </div>
                    <div className="text-xs font-bold text-amber-800 mt-0.5">
                      {weekAnalysis.unpaidDayNames.join(', ')}
                    </div>
                    <div className="text-[11px] text-amber-700/90 mt-0.5">
                      Sudah terbayar {weekAnalysis.paidDaysCount} hari ({formatRupiah(weekAnalysis.totalAlreadyPaid)}) • Kurang {formatRupiah(weekAnalysis.totalRemainingNominal)}
                    </div>
                  </div>
                </div>

                <div className="flex items-center space-x-2 w-full sm:w-auto">
                  <button
                    type="button"
                    onClick={handleSelectOnlyEmptyDays}
                    className="flex-1 sm:flex-none px-3 py-1.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-[11px] font-bold shadow-2xs transition-colors cursor-pointer"
                  >
                    Pilih Hanya Hari Kosong ({weekAnalysis.unpaidDaysCount} hr)
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex items-center space-x-2.5 bg-emerald-50 border border-emerald-200 p-3.5 rounded-xl text-emerald-900">
                <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                <div>
                  <div className="text-xs font-black text-emerald-900">
                    Lengkap & Lunas! Seluruh 7 hari pada minggu ini sudah terbayar.
                  </div>
                  <div className="text-[11px] text-emerald-700">
                    Total terbayar: {formatRupiah(weekAnalysis.totalAlreadyPaid)} ({weekAnalysis.paidDaysCount} hari)
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* 4. Tampilan 7 Hari Kalender Mingguan (Checklist & Status Hari) */}
          <div className="space-y-2">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <label className="text-xs font-extrabold text-stone-900 flex items-center space-x-1.5">
                <Calendar className="w-4 h-4 text-sky-600" />
                <span>Rincian Hari pada {activeWeek?.label} (Klik hari untuk pilih/batal):</span>
              </label>
              <div className="flex items-center space-x-2 text-[11px]">
                <button
                  type="button"
                  onClick={handleSelectAllDays}
                  className="text-sky-600 hover:text-sky-800 font-bold underline"
                >
                  Pilih Semua (7 Hr)
                </button>
                <span className="text-stone-300">•</span>
                <button
                  type="button"
                  onClick={handleClearSelection}
                  className="text-stone-500 hover:text-stone-800 font-bold underline"
                >
                  Bersihkan
                </button>
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-7 gap-2">
              {weekAnalysis.days.map((day) => {
                const isCheckedToPay = selectedDatesToPay.includes(day.dateStr);
                const isAlreadyPaid = day.isPaid;

                return (
                  <div
                    key={day.dateStr}
                    onClick={() => handleToggleDate(day.dateStr)}
                    className={`p-3 rounded-2xl border text-center transition-all cursor-pointer relative select-none ${
                      isCheckedToPay
                        ? 'bg-sky-50 border-sky-500 ring-2 ring-sky-300 shadow-sm'
                        : isAlreadyPaid
                        ? 'bg-emerald-50/60 border-emerald-200 hover:bg-emerald-50'
                        : 'bg-rose-50/60 border-rose-200 hover:bg-rose-50'
                    }`}
                  >
                    {/* Day Name */}
                    <div className="text-[11px] font-extrabold text-stone-800">
                      {day.dayOfWeekName}
                    </div>
                    {/* Day Number */}
                    <div className="text-lg font-black text-stone-900 my-0.5">
                      {day.dayOfMonth}
                    </div>

                    {/* Status Badge */}
                    <div className="mt-1">
                      {isAlreadyPaid ? (
                        <span className="inline-flex items-center px-1.5 py-0.5 rounded-md bg-emerald-100 text-emerald-800 text-[9px] font-extrabold">
                          ✓ Lunas
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-1.5 py-0.5 rounded-md bg-rose-100 text-rose-800 text-[9px] font-extrabold">
                          ⚠️ Kosong
                        </span>
                      )}
                    </div>

                    {/* Payment checkbox indicator */}
                    <div className="mt-2 pt-2 border-t border-stone-200/60 flex items-center justify-center space-x-1">
                      <div
                        className={`w-4 h-4 rounded-md flex items-center justify-center text-white text-[10px] font-bold ${
                          isCheckedToPay ? 'bg-sky-600' : 'bg-stone-200 text-transparent'
                        }`}
                      >
                        ✓
                      </div>
                      <span className="text-[10px] font-bold text-stone-600">
                        {isCheckedToPay ? 'Bayar' : 'Lewati'}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* 5. Rincian Pembayaran & Nominal */}
          <div className="p-4 rounded-2xl bg-stone-50 border border-stone-200 space-y-3">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <span className="text-xs font-bold text-stone-600">
                Hari yang dipilih untuk dibayar sekarang:
              </span>
              <span className="text-xs font-black text-stone-900">
                {selectedDatesToPay.length} Hari ({selectedDatesToPay.length > 0 ? selectedDatesToPay.map(d => d.slice(8)).join(', ') : 'Belum ada'})
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-stone-200">
              <div className="space-y-1">
                <label className="text-[11px] font-bold text-stone-700 block">
                  Petugas / Penarik Jimpitan
                </label>
                <input
                  type="text"
                  value={petugas}
                  onChange={(e) => setPetugas(e.target.value)}
                  className="w-full px-3 py-1.5 rounded-xl bg-white border border-stone-200 text-xs text-stone-900 outline-none focus:ring-2 focus:ring-sky-400 font-semibold"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-bold text-stone-700 block">
                  Catatan Transaksi (Opsional)
                </label>
                <input
                  type="text"
                  value={catatan}
                  onChange={(e) => setCatatan(e.target.value)}
                  placeholder={`Contoh: Setor Mingguan (${selectedDatesToPay.length} hari)`}
                  className="w-full px-3 py-1.5 rounded-xl bg-white border border-stone-200 text-xs text-stone-900 outline-none focus:ring-2 focus:ring-sky-400"
                />
              </div>
            </div>

            {/* Total Payment Box */}
            <div className="p-3.5 rounded-xl bg-sky-900 text-white flex items-center justify-between">
              <div>
                <div className="text-[11px] text-sky-200 font-bold">TOTAL NOMINAL YANG AKAN DISETOR</div>
                <div className="text-xs text-sky-300">
                  {selectedDatesToPay.length} hari × {formatRupiah(nominalPerDay)}/hari
                </div>
              </div>
              <div className="text-xl sm:text-2xl font-black text-white">
                {formatRupiah(totalNominalToPay)}
              </div>
            </div>
          </div>

          {/* Modal Actions */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="w-full sm:w-auto px-4 py-2.5 rounded-xl border border-stone-300 hover:bg-stone-100 text-stone-700 text-xs font-bold transition-colors cursor-pointer"
            >
              Batal
            </button>

            <button
              type="submit"
              disabled={isSaving || selectedDatesToPay.length === 0}
              className="w-full sm:w-auto px-6 py-2.5 rounded-xl bg-sky-600 hover:bg-sky-700 disabled:bg-stone-300 text-white text-xs font-extrabold flex items-center justify-center space-x-2 shadow-md transition-all cursor-pointer"
              id="btn-simpan-jimpitan-mingguan"
            >
              <Check className="w-4 h-4" />
              <span>
                {isSaving
                  ? 'Menyimpan...'
                  : `Simpan Jimpitan (${selectedDatesToPay.length} Hari - ${formatRupiah(totalNominalToPay)})`}
              </span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
