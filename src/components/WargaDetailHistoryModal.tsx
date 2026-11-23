import React, { useState, useMemo, useEffect, useCallback } from 'react';
import {
  Calendar,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  MessageSquare,
  Award,
  Phone,
  ExternalLink,
  CalendarDays,
  FileText,
  ArrowLeft,
  MapPin,
  Wallet
} from 'lucide-react';
import { Warga, JimpitanRecord, AppSettings } from '../types';
import {
  formatRupiah,
  formatTanggalIndo,
  cleanWhatsAppPhone,
  generateWhatsAppWargaMonthlyRecap
} from '../utils/formatters';
import { calculateWargaMonthDistribution, DailyStatus } from '../utils/jimpitanCalculations';

interface WargaDetailHistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  warga: Warga | null;
  allRecords: JimpitanRecord[];
  selectedDate: string;
  settings: AppSettings;
}

export const WargaDetailHistoryModal: React.FC<WargaDetailHistoryModalProps> = ({
  isOpen,
  onClose,
  warga,
  allRecords,
  selectedDate,
  settings,
}) => {
  // Month navigation state: 'YYYY-MM'
  const initialYearMonth = useMemo(() => {
    if (selectedDate && selectedDate.includes('-')) {
      const parts = selectedDate.split('-');
      return `${parts[0]}-${parts[1]}`;
    }
    const now = new Date();
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, '0');
    return `${y}-${m}`;
  }, [selectedDate]);

  const [activeYearMonth, setActiveYearMonth] = useState<string>(initialYearMonth);
  const [activeViewMode, setActiveViewMode] = useState<'calendar' | 'list'>('calendar');
  const [listViewSubTab, setListViewSubTab] = useState<'distributed' | 'raw'>('distributed');
  const [isClosing, setIsClosing] = useState<boolean>(false);
  const [selectedDayDetail, setSelectedDayDetail] = useState<{
    dateStr: string;
    dayNum: number;
    isPaid: boolean;
    nominal: number;
    isAdvanceCovered: boolean;
    isAdvanceSource: boolean;
    advanceRecord?: JimpitanRecord;
    rawRecords: JimpitanRecord[];
    petugas: string;
    reguNama: string;
    waktu?: string;
    catatan?: string;
  } | null>(null);

  // Sync month & reset day selection whenever a resident screen opens or changes
  useEffect(() => {
    if (isOpen) {
      setIsClosing(false);
      setActiveYearMonth(initialYearMonth);
      setSelectedDayDetail(null);
    }
  }, [isOpen, warga?.id, initialYearMonth]);

  const handleRequestClose = useCallback(() => {
    if (isClosing) return;
    setIsClosing(true);
    setTimeout(() => {
      setIsClosing(false);
      onClose();
    }, 180);
  }, [isClosing, onClose]);

  useEffect(() => {
    if (!isOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        handleRequestClose();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [isOpen, handleRequestClose]);

  // Parse active year and month
  const [activeYear, activeMonth] = useMemo(() => {
    const parts = activeYearMonth.split('-').map(Number);
    return [parts[0] || new Date().getFullYear(), parts[1] || new Date().getMonth() + 1];
  }, [activeYearMonth]);

  // Indonesian Month Name
  const monthNames = [
    'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
    'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
  ];
  const activeMonthLabel = `${monthNames[activeMonth - 1]} ${activeYear}`;

  // Month navigator helpers
  const handlePrevMonth = () => {
    let newYear = activeYear;
    let newMonth = activeMonth - 1;
    if (newMonth < 1) {
      newMonth = 12;
      newYear -= 1;
    }
    setActiveYearMonth(`${newYear}-${String(newMonth).padStart(2, '0')}`);
    setSelectedDayDetail(null);
  };

  const handleNextMonth = () => {
    let newYear = activeYear;
    let newMonth = activeMonth + 1;
    if (newMonth > 12) {
      newMonth = 1;
      newYear += 1;
    }
    setActiveYearMonth(`${newYear}-${String(newMonth).padStart(2, '0')}`);
    setSelectedDayDetail(null);
  };

  // Filter records specifically for this resident
  const residentRecords = useMemo(() => {
    if (!warga) return [];
    return allRecords.filter(
      (r) => r.wargaId === warga.id || r.nomorRumah === warga.nomorRumah
    );
  }, [allRecords, warga]);

  // All-time metrics
  const totalAllTime = useMemo(() => {
    return residentRecords.reduce((sum, r) => sum + (r.nominal || 0), 0);
  }, [residentRecords]);

  // Active month records
  const monthRecords = useMemo(() => {
    return residentRecords.filter((r) => r.tanggal.startsWith(activeYearMonth));
  }, [residentRecords, activeYearMonth]);

  // Calculated accurate monthly distribution
  const monthDistribution = useMemo(() => {
    if (!warga) return null;
    return calculateWargaMonthDistribution(warga, allRecords, activeYearMonth, settings);
  }, [warga, allRecords, activeYearMonth, settings]);

  const daysInMonth = monthDistribution?.daysInMonth ?? 30;
  const nominalDefault = monthDistribution?.tarifHarian ?? 1000;
  const targetMurniBulan = monthDistribution?.targetMurniBulan ?? 30000;
  const potonganSurplus = monthDistribution?.potonganSurplus ?? 0;
  const targetBulan = monthDistribution?.targetBulan ?? 30000;
  const totalPaidThisMonth = monthDistribution?.totalTerbayar ?? 0;
  const distinctDaysPaidThisMonth = monthDistribution?.countPaidDays ?? 0;
  const nominalKurang = monthDistribution?.nominalKurang ?? 0;
  const nominalLebih = monthDistribution?.nominalLebih ?? 0;
  const isMonthlyLunas = monthDistribution?.isLunas ?? false;
  const dailyDistributionList = monthDistribution?.dailyList ?? [];

  // Map daily distribution by dateIso
  const dailyDistributionMap = useMemo(() => {
    const map = new Map<string, DailyStatus>();
    dailyDistributionList.forEach((item) => {
      map.set(item.dateIso, item);
    });
    return map;
  }, [dailyDistributionList]);

  const paymentPercentage = daysInMonth > 0 ? Math.round((distinctDaysPaidThisMonth / daysInMonth) * 100) : 0;

  // Status for today (selectedDate)
  const isPaidToday = useMemo(() => {
    const todayItem = dailyDistributionMap.get(selectedDate);
    if (todayItem && todayItem.isPaid) return true;
    return residentRecords.some((r) => r.tanggal === selectedDate && r.status === 'sukses');
  }, [dailyDistributionMap, selectedDate, residentRecords]);

  // Generate WhatsApp Share URL
  const waShareUrl = useMemo(() => {
    if (!warga) return '';
    const phone = cleanWhatsAppPhone(warga.nomorHp);
    const encodedText = generateWhatsAppWargaMonthlyRecap(
      warga,
      activeMonthLabel,
      totalPaidThisMonth,
      distinctDaysPaidThisMonth,
      daysInMonth,
      settings.namaRt,
      settings.namaRw,
      settings.lingkungan
    );
    return phone ? `https://wa.me/${phone}?text=${encodedText}` : `https://wa.me/?text=${encodedText}`;
  }, [warga, activeMonthLabel, totalPaidThisMonth, distinctDaysPaidThisMonth, daysInMonth, settings]);

  // Construct Calendar Grid Days
  const calendarDays = useMemo(() => {
    const days = [];
    const firstDayOfWeek = new Date(activeYear, activeMonth - 1, 1).getDay();
    const shiftedFirstDay = (firstDayOfWeek + 6) % 7;

    for (let i = 0; i < shiftedFirstDay; i++) {
      days.push({ dayNum: null, dateIso: '' });
    }

    for (let d = 1; d <= daysInMonth; d++) {
      const dateIso = `${activeYearMonth}-${String(d).padStart(2, '0')}`;
      days.push({ dayNum: d, dateIso });
    }

    return days;
  }, [activeYear, activeMonth, activeYearMonth, daysInMonth]);

  if (!isOpen || !warga) return null;

  const daysHeader = ['Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab', 'Min'];
  const addressSummary =
    warga.alamat || `${warga.blok || 'Blok A'} • RT ${warga.rt || settings.namaRt} / RW ${warga.rw || settings.namaRw}`;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={`Riwayat Jimpitan ${warga.nama}`}
      id="modal-warga-detail-history"
      className={`fixed inset-0 z-50 bg-stone-50 flex flex-col overflow-hidden ${
        isClosing ? 'animate-screen-slide-out-right' : 'animate-screen-slide-in-right'
      }`}
    >
      {/* Top Sticky Navigation & Resident Identity Bar */}
      <header className="bg-white/95 backdrop-blur-sm border-b border-stone-200 sticky top-0 z-20 shrink-0 shadow-2xs">
        <div className="max-w-5xl mx-auto px-3 sm:px-6 py-3 flex items-center justify-between gap-2.5">
          <div className="flex items-center gap-2.5 sm:gap-3.5 min-w-0">
            <button
              type="button"
              onClick={handleRequestClose}
              id="btn-close-warga-history"
              aria-label="Kembali ke Data Warga"
              className="min-w-[44px] min-h-[44px] px-2.5 sm:px-3.5 rounded-xl bg-stone-100 hover:bg-stone-200 active:scale-95 text-stone-800 font-extrabold text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer shrink-0"
            >
              <ArrowLeft className="w-4 h-4" />
              <span className="hidden sm:inline">Kembali</span>
            </button>

            <div className="w-11 h-11 rounded-2xl bg-sky-600 text-white font-black flex flex-col items-center justify-center shrink-0 shadow-xs">
              <span className="text-[9px] uppercase tracking-wider opacity-85">No</span>
              <span className="text-sm leading-none tabular-nums">{warga.nomorRumah}</span>
            </div>

            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="font-black text-stone-900 text-sm sm:text-lg truncate leading-tight">
                  {warga.nama}
                </h2>
                {isPaidToday ? (
                  <span className="px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-900 border border-emerald-200 text-[10px] font-black uppercase tracking-wider shrink-0">
                    Hari Ini Lunas
                  </span>
                ) : (
                  <span className="px-2 py-0.5 rounded-md bg-amber-100 text-amber-900 border border-amber-200 text-[10px] font-black uppercase tracking-wider shrink-0">
                    Belum Terambil
                  </span>
                )}
              </div>
              <p className="text-[11px] sm:text-xs text-stone-500 truncate mt-0.5">
                {addressSummary} · Tarif {formatRupiah(warga.nominalDefault || 1000)}/malam
              </p>
            </div>
          </div>

          <a
            href={waShareUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="min-h-[40px] px-3 sm:px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-extrabold flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer shrink-0"
            title="Kirim Rekapitulasi via WhatsApp ke Warga"
          >
            <MessageSquare className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Kirim Rekap WA</span>
            <span className="sm:hidden">WA</span>
          </a>
        </div>
      </header>

      {/* Full-Screen Scrollable Content */}
      <main className="flex-1 overflow-y-auto overscroll-contain">
        <div className="max-w-5xl mx-auto w-full p-4 sm:p-6 pb-20">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
            {/* LEFT COLUMN: Month Navigator, Resident Info, Summary Metrics & Banners */}
            <div className="lg:col-span-5 space-y-4">
              {/* Month Navigator Header */}
              <div className="bg-white border border-sky-200 rounded-2xl p-2.5 flex items-center justify-between gap-2 shadow-2xs">
                <button
                  type="button"
                  onClick={handlePrevMonth}
                  className="min-w-[44px] min-h-[44px] rounded-xl bg-sky-50 hover:bg-sky-100 text-sky-900 border border-sky-200 flex items-center justify-center transition-colors cursor-pointer"
                  title="Bulan Sebelumnya"
                >
                  <ChevronLeft className="w-5 h-5" />
                </button>

                <div className="text-center">
                  <span className="text-[10px] font-extrabold uppercase tracking-wider text-sky-700 block">
                    Periode Riwayat
                  </span>
                  <span className="font-black text-stone-900 text-sm sm:text-base">
                    {activeMonthLabel}
                  </span>
                </div>

                <button
                  type="button"
                  onClick={handleNextMonth}
                  className="min-w-[44px] min-h-[44px] rounded-xl bg-sky-50 hover:bg-sky-100 text-sky-900 border border-sky-200 flex items-center justify-center transition-colors cursor-pointer"
                  title="Bulan Berikutnya"
                >
                  <ChevronRight className="w-5 h-5" />
                </button>
              </div>

              {/* 3 Metric Summary Cards */}
              <div className="grid grid-cols-3 gap-2.5">
                <div className="p-3 sm:p-3.5 rounded-2xl bg-white border border-sky-200/80 shadow-2xs space-y-1">
                  <span className="text-[10px] font-extrabold uppercase text-stone-500 tracking-wider block">
                    Bulan Ini
                  </span>
                  <div className="text-sm sm:text-base font-black text-sky-700 tabular-nums truncate">
                    {formatRupiah(totalPaidThisMonth)}
                  </div>
                  <span className="text-[10.5px] text-stone-500 font-semibold block tabular-nums">
                    {distinctDaysPaidThisMonth}/{daysInMonth} Hari
                  </span>
                </div>

                <div className="p-3 sm:p-3.5 rounded-2xl bg-white border border-stone-200 shadow-2xs space-y-1">
                  <span className="text-[10px] font-extrabold uppercase text-stone-500 tracking-wider block">
                    Partisipasi
                  </span>
                  <div className="text-sm sm:text-base font-black text-emerald-700 tabular-nums truncate">
                    {paymentPercentage}%
                  </div>
                  <div className="w-full bg-stone-100 h-1.5 rounded-full overflow-hidden mt-1.5">
                    <div
                      className="bg-emerald-500 h-full rounded-full transition-all duration-300"
                      style={{ width: `${Math.min(paymentPercentage, 100)}%` }}
                    />
                  </div>
                </div>

                <div className="p-3 sm:p-3.5 rounded-2xl bg-white border border-stone-200 shadow-2xs space-y-1">
                  <span className="text-[10px] font-extrabold uppercase text-stone-500 tracking-wider block">
                    Kumulatif
                  </span>
                  <div className="text-sm sm:text-base font-black text-stone-900 tabular-nums truncate">
                    {formatRupiah(totalAllTime)}
                  </div>
                  <span className="text-[10.5px] text-stone-500 font-semibold block tabular-nums">
                    {residentRecords.length} setoran
                  </span>
                </div>
              </div>

              {/* Resident Detail Identity Card */}
              <div className="bg-white border border-stone-200 rounded-2xl p-4 space-y-2.5 shadow-2xs">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[11px] font-black uppercase tracking-wider text-stone-500">
                    Ringkasan Rumah &amp; Target {activeMonthLabel}
                  </span>
                  <span className="text-xs font-extrabold text-stone-800 tabular-nums">
                    Target: {formatRupiah(targetBulan)}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2 pt-1 text-xs">
                  <div className="p-2.5 rounded-xl bg-stone-50 border border-stone-200/80 flex items-center gap-2">
                    <MapPin className="w-4 h-4 text-sky-600 shrink-0" />
                    <div className="min-w-0">
                      <span className="text-[10px] text-stone-500 block font-semibold">Lokasi / Blok</span>
                      <span className="font-bold text-stone-800 truncate block">{addressSummary}</span>
                    </div>
                  </div>
                  <div className="p-2.5 rounded-xl bg-stone-50 border border-stone-200/80 flex items-center gap-2">
                    <Wallet className="w-4 h-4 text-amber-600 shrink-0" />
                    <div className="min-w-0">
                      <span className="text-[10px] text-stone-500 block font-semibold">Tarif Harian</span>
                      <span className="font-bold text-stone-800 tabular-nums block">
                        {formatRupiah(warga.nominalDefault || 1000)}
                      </span>
                    </div>
                  </div>
                </div>

                {!isMonthlyLunas && nominalKurang > 0 && (
                  <div className="p-2.5 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-900 flex items-center justify-between">
                    <span className="font-bold">Sisa Kurang Bulan Ini:</span>
                    <strong className="font-black tabular-nums">{formatRupiah(nominalKurang)}</strong>
                  </div>
                )}

                {warga.nomorHp && (
                  <div className="pt-1 flex items-center justify-between text-xs border-t border-stone-100">
                    <span className="text-stone-500 font-semibold">Kontak WhatsApp Warga:</span>
                    <a
                      href={`https://wa.me/${cleanWhatsAppPhone(warga.nomorHp)}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center space-x-1 text-emerald-700 font-extrabold hover:underline"
                    >
                      <Phone className="w-3.5 h-3.5" />
                      <span>{warga.nomorHp}</span>
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>
                )}
              </div>

              {/* Surplus Carry-Over Banner */}
              {potonganSurplus > 0 && (
                <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-3.5 flex items-start space-x-2.5 shadow-2xs">
                  <Award className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                  <div className="text-xs text-emerald-950 leading-relaxed">
                    <strong className="font-extrabold">Potongan Surplus Bulan Lalu Aktif:</strong> Target {activeMonthLabel} dikurangi{' '}
                    <strong className="tabular-nums">-{formatRupiah(potonganSurplus)}</strong> (dari{' '}
                    <span className="tabular-nums">{formatRupiah(targetMurniBulan)}</span> menjadi{' '}
                    <strong className="tabular-nums">{formatRupiah(targetBulan)}</strong>).
                  </div>
                </div>
              )}

              {/* Advance / Monthly Target Completed Banner */}
              {isMonthlyLunas && nominalDefault > 0 && (
                <div className="bg-amber-50 border border-amber-200 rounded-2xl p-3.5 flex items-start space-x-2.5 shadow-2xs">
                  <Award className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                  <div className="text-xs">
                    <div className="flex items-center space-x-1.5 flex-wrap">
                      <span className="font-black text-amber-950">
                        Target Jimpitan Bulan Ini Lunas Penuh
                      </span>
                      <span className="px-1.5 py-0.5 rounded bg-amber-200 text-amber-950 text-[10px] font-extrabold">
                        {activeMonthLabel}
                      </span>
                    </div>
                    <p className="text-amber-900/90 text-[11.5px] mt-1 leading-relaxed">
                      Tercatat setoran kas bulan ini sebesar{' '}
                      <strong className="tabular-nums">{formatRupiah(totalPaidThisMonth)}</strong> (Target bersih:{' '}
                      <strong className="tabular-nums">{formatRupiah(targetBulan)}</strong>).
                      {nominalLebih > 0 && (
                        <>
                          {' '}Kelebihan bayar (surplus){' '}
                          <strong className="tabular-nums">+{formatRupiah(nominalLebih)}</strong> otomatis mengurangi target bulan berikutnya.
                        </>
                      )}
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* RIGHT COLUMN: Interactive Full-Width Calendar & Daily/Raw History Lists */}
            <div className="lg:col-span-7 bg-white border border-stone-200 rounded-3xl p-4 sm:p-5 space-y-4 shadow-2xs">
              {/* View Mode Toggle */}
              <div className="flex items-center justify-between gap-2 flex-wrap border-b border-stone-100 pb-3">
                <div className="flex items-center space-x-1 bg-stone-100 p-1 rounded-xl border border-stone-200/70 w-full sm:w-auto">
                  <button
                    type="button"
                    onClick={() => {
                      setActiveViewMode('calendar');
                      setSelectedDayDetail(null);
                    }}
                    className={`flex-1 sm:flex-initial px-3.5 py-2 text-xs font-extrabold rounded-lg transition-all flex items-center justify-center space-x-1.5 cursor-pointer ${
                      activeViewMode === 'calendar'
                        ? 'bg-white text-sky-800 shadow-xs'
                        : 'text-stone-600 hover:text-stone-900'
                    }`}
                  >
                    <CalendarDays className="w-3.5 h-3.5" />
                    <span className="tabular-nums">Kalender ({distinctDaysPaidThisMonth}/{daysInMonth} Hari)</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveViewMode('list')}
                    className={`flex-1 sm:flex-initial px-3.5 py-2 text-xs font-extrabold rounded-lg transition-all flex items-center justify-center space-x-1.5 cursor-pointer ${
                      activeViewMode === 'list'
                        ? 'bg-white text-sky-800 shadow-xs'
                        : 'text-stone-600 hover:text-stone-900'
                    }`}
                  >
                    <FileText className="w-3.5 h-3.5" />
                    <span>Daftar Rincian</span>
                  </button>
                </div>

                <span className="text-[11px] font-bold text-stone-500 hidden sm:inline">
                  Ketuk tanggal untuk melihat rincian penarikan
                </span>
              </div>

              {/* VIEW 1: KALENDER STATUS PER TANGGAL */}
              {activeViewMode === 'calendar' && (
                <div className="space-y-3">
                  {/* Days Header */}
                  <div className="grid grid-cols-7 gap-1.5 text-center">
                    {daysHeader.map((dh) => (
                      <div key={dh} className="text-[11px] font-black text-stone-500 py-1 uppercase tracking-wider">
                        {dh}
                      </div>
                    ))}
                  </div>

                  {/* Calendar Cells Grid */}
                  <div className="grid grid-cols-7 gap-1.5 sm:gap-2">
                    {calendarDays.map((item, idx) => {
                      if (!item.dayNum) {
                        return <div key={`empty-${idx}`} className="h-16 sm:h-20 rounded-2xl bg-stone-50/70" />;
                      }

                      const dayInfo = dailyDistributionMap.get(item.dateIso);
                      const isPaid = Boolean(dayInfo?.isPaid);
                      const nominalDisp = dayInfo?.nominal || 0;
                      const isSelected = selectedDayDetail?.dateStr === item.dateIso;
                      const isCurrentToday = item.dateIso === selectedDate;
                      const isAdv = Boolean(dayInfo?.isAdvanceCovered);

                      return (
                        <button
                          key={item.dateIso}
                          type="button"
                          onClick={() => {
                            if (dayInfo) {
                              setSelectedDayDetail({
                                dateStr: item.dateIso,
                                dayNum: item.dayNum || 0,
                                isPaid: dayInfo.isPaid,
                                nominal: dayInfo.nominal,
                                isAdvanceCovered: dayInfo.isAdvanceCovered,
                                isAdvanceSource: dayInfo.isAdvanceSource,
                                advanceRecord: dayInfo.advanceRecord,
                                rawRecords: dayInfo.rawRecords,
                                petugas: dayInfo.petugas,
                                reguNama: dayInfo.reguNama,
                                waktu: dayInfo.waktu,
                                catatan: dayInfo.catatan,
                              });
                            }
                          }}
                          className={`h-16 sm:h-20 rounded-2xl p-1.5 sm:p-2 flex flex-col justify-between text-left transition-all border cursor-pointer relative ${
                            isPaid
                              ? isAdv
                                ? 'bg-amber-50/80 hover:bg-amber-100/80 border-amber-300 text-amber-950 shadow-2xs'
                                : 'bg-sky-50 hover:bg-sky-100 border-sky-300 text-sky-950 shadow-2xs'
                              : 'bg-white hover:bg-stone-50 border-stone-200 text-stone-400'
                          } ${
                            isSelected ? 'ring-2 ring-sky-600 ring-offset-1 z-10' : ''
                          } ${
                            isCurrentToday ? 'border-amber-500 font-black' : ''
                          }`}
                        >
                          <div className="flex items-center justify-between w-full">
                            <span
                              className={`text-xs sm:text-sm font-black tabular-nums ${
                                isPaid ? (isAdv ? 'text-amber-900' : 'text-sky-900') : 'text-stone-700'
                              }`}
                            >
                              {item.dayNum}
                            </span>
                            {isPaid ? (
                              <CheckCircle2
                                className={`w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0 ${
                                  isAdv ? 'text-amber-600' : 'text-sky-600'
                                }`}
                              />
                            ) : (
                              <span className="w-1.5 h-1.5 rounded-full bg-stone-300" />
                            )}
                          </div>

                          <div className="truncate w-full">
                            {isPaid ? (
                              <span
                                className={`text-[10px] sm:text-[11px] font-black block truncate leading-tight tabular-nums ${
                                  isAdv ? 'text-amber-800' : 'text-sky-700'
                                }`}
                              >
                                {nominalDisp >= 1000 ? `${nominalDisp / 1000}k` : `${nominalDisp}`}
                              </span>
                            ) : (
                              <span className="text-[9px] text-stone-400 block truncate leading-tight">
                                -
                              </span>
                            )}
                          </div>
                        </button>
                      );
                    })}
                  </div>

                  {/* Selected Date Detail Drawer */}
                  {selectedDayDetail && (
                    <div className="p-4 rounded-2xl bg-sky-50 border border-sky-200 space-y-2.5 animate-in fade-in slide-in-from-top-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                          <Calendar className="w-4 h-4 text-sky-700" />
                          <h5 className="font-extrabold text-stone-900 text-xs sm:text-sm">
                            {formatTanggalIndo(selectedDayDetail.dateStr)} (Hari Ke-{selectedDayDetail.dayNum})
                          </h5>
                        </div>
                        <button
                          type="button"
                          onClick={() => setSelectedDayDetail(null)}
                          className="text-xs font-bold text-stone-500 hover:text-stone-800 cursor-pointer px-2 py-1 rounded-lg hover:bg-white"
                        >
                          Tutup
                        </button>
                      </div>

                      {selectedDayDetail.isPaid ? (
                        <div className="bg-white p-3.5 rounded-xl border border-sky-100 space-y-2 shadow-2xs">
                          <div className="flex items-center justify-between flex-wrap gap-2">
                            <div className="flex items-center space-x-2">
                              <span className="text-sm sm:text-base font-black text-stone-900 tabular-nums">
                                {formatRupiah(selectedDayDetail.nominal)}
                              </span>
                              {selectedDayDetail.isAdvanceCovered ? (
                                <span className="px-2 py-0.5 rounded-md bg-amber-100 text-amber-900 text-[10px] font-extrabold border border-amber-200 flex items-center space-x-1">
                                  <Award className="w-3 h-3 text-amber-600" />
                                  <span>Lunas (Pelunasan 1 Bulan)</span>
                                </span>
                              ) : (
                                <span className="px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-800 text-[10px] font-extrabold">
                                  Sukses Terambil
                                </span>
                              )}
                            </div>
                            <span className="text-[11px] text-stone-500 font-semibold tabular-nums">
                              Pukul {selectedDayDetail.waktu || '22:00'} WIB
                            </span>
                          </div>

                          <p className="text-xs text-stone-600">
                            <strong>Regu:</strong> {selectedDayDetail.reguNama} ({selectedDayDetail.petugas})
                          </p>

                          {selectedDayDetail.catatan && (
                            <div className="bg-stone-50 p-2.5 rounded-lg border border-stone-200/80 text-[11.5px] text-stone-700">
                              <strong>Catatan:</strong> {selectedDayDetail.catatan}
                            </div>
                          )}

                          {selectedDayDetail.isAdvanceSource && selectedDayDetail.advanceRecord && (
                            <div className="bg-amber-50 p-2.5 rounded-lg border border-amber-200 text-[11.5px] text-amber-900">
                              <strong>Transaksi Setoran Dimuka:</strong> Disetor tunai{' '}
                              <span className="tabular-nums font-bold">
                                {formatRupiah(selectedDayDetail.advanceRecord.nominal)}
                              </span>{' '}
                              pada tanggal ini untuk pelunasan 1 bulan penuh.
                            </div>
                          )}
                        </div>
                      ) : (
                        <div className="bg-white p-3.5 rounded-xl border border-stone-200 text-center text-xs text-stone-500">
                          Tidak ada catatan penarikan jimpitan pada tanggal ini (Belum diambil).
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* VIEW 2: DAFTAR RINCIAN CATATAN TABEL/LIST (Full-height flow) */}
              {activeViewMode === 'list' && (
                <div className="space-y-3">
                  {/* Sub-tabs for List Mode */}
                  <div className="flex items-center space-x-2 bg-stone-100 p-1 rounded-xl border border-stone-200 text-xs">
                    <button
                      type="button"
                      onClick={() => setListViewSubTab('distributed')}
                      className={`flex-1 py-2 font-bold rounded-lg transition-all cursor-pointer tabular-nums ${
                        listViewSubTab === 'distributed'
                          ? 'bg-white text-sky-800 shadow-xs'
                          : 'text-stone-600 hover:text-stone-900'
                      }`}
                    >
                      Rekap Harian ({dailyDistributionList.length} Hari)
                    </button>
                    <button
                      type="button"
                      onClick={() => setListViewSubTab('raw')}
                      className={`flex-1 py-2 font-bold rounded-lg transition-all cursor-pointer tabular-nums ${
                        listViewSubTab === 'raw'
                          ? 'bg-white text-sky-800 shadow-xs'
                          : 'text-stone-600 hover:text-stone-900'
                      }`}
                    >
                      Riwayat Transaksi ({monthRecords.length})
                    </button>
                  </div>

                  {/* SubTab 1: Distributed Days */}
                  {listViewSubTab === 'distributed' && (
                    <div className="space-y-2">
                      {dailyDistributionList
                        .slice()
                        .reverse()
                        .map((item) => (
                          <div
                            key={item.dateIso}
                            className={`p-3 rounded-2xl border transition-all flex items-center justify-between gap-2.5 ${
                              item.isPaid
                                ? 'bg-white border-sky-200'
                                : 'bg-stone-50/70 border-stone-200 opacity-70'
                            }`}
                          >
                            <div className="flex items-center space-x-3 min-w-0">
                              <div
                                className={`w-9 h-9 rounded-xl font-black flex items-center justify-center text-xs shrink-0 tabular-nums ${
                                  item.isPaid
                                    ? 'bg-sky-600 text-white'
                                    : 'bg-stone-200 text-stone-600'
                                }`}
                              >
                                {item.dayNum}
                              </div>
                              <div className="min-w-0">
                                <h6 className="font-extrabold text-stone-900 text-xs sm:text-sm truncate">
                                  {formatTanggalIndo(item.dateIso)}
                                </h6>
                                <p className="text-[11px] text-stone-500 truncate">
                                  {item.isPaid ? (
                                    <span>
                                      {item.waktu || '22:00'} WIB · {item.petugas || item.reguNama}
                                    </span>
                                  ) : (
                                    <span className="text-stone-400">Belum Ada Penarikan</span>
                                  )}
                                </p>
                              </div>
                            </div>

                            <div className="text-right shrink-0">
                              <span className="font-black text-stone-900 text-xs sm:text-sm block tabular-nums">
                                {formatRupiah(item.nominal)}
                              </span>
                              {item.isPaid ? (
                                <span className="text-[9.5px] font-extrabold uppercase text-emerald-700">
                                  TERBAYAR
                                </span>
                              ) : (
                                <span className="text-[9.5px] font-semibold text-stone-400 uppercase">
                                  -
                                </span>
                              )}
                            </div>
                          </div>
                        ))}
                    </div>
                  )}

                  {/* SubTab 2: Raw Records */}
                  {listViewSubTab === 'raw' && (
                    <div className="space-y-2">
                      {monthRecords.length === 0 ? (
                        <div className="p-10 text-center bg-stone-50 rounded-2xl border border-dashed border-stone-200 space-y-2">
                          <FileText className="w-9 h-9 text-stone-300 mx-auto" />
                          <p className="text-xs font-bold text-stone-700">
                            Belum ada transaksi kas jimpitan pada {activeMonthLabel}.
                          </p>
                        </div>
                      ) : (
                        monthRecords
                          .slice()
                          .sort((a, b) => b.tanggal.localeCompare(a.tanggal) || (b.createdAt || 0) - (a.createdAt || 0))
                          .map((rec, idx) => (
                            <div
                              key={rec.id || idx}
                              className="p-3.5 rounded-2xl bg-white border border-stone-200 hover:border-sky-300 transition-all flex items-center justify-between gap-2.5 shadow-2xs"
                            >
                              <div className="flex items-center space-x-3 min-w-0">
                                <div className="w-9 h-9 rounded-xl bg-sky-100 text-sky-800 font-black flex items-center justify-center text-xs shrink-0 tabular-nums">
                                  {rec.tanggal.split('-')[2] || '•'}
                                </div>
                                <div className="min-w-0">
                                  <h6 className="font-extrabold text-stone-900 text-xs sm:text-sm truncate">
                                    {formatTanggalIndo(rec.tanggal)}
                                  </h6>
                                  <p className="text-[11px] text-stone-500 truncate">
                                    {rec.waktu || '22:00'} WIB · {rec.reguNama} ({rec.petugas || '-'})
                                  </p>
                                  {rec.catatan && (
                                    <p className="text-[11px] text-amber-800 font-medium truncate mt-0.5">
                                      Catatan: {rec.catatan}
                                    </p>
                                  )}
                                </div>
                              </div>

                              <div className="text-right shrink-0">
                                <span className="font-black text-sky-700 text-xs sm:text-sm block tabular-nums">
                                  {formatRupiah(rec.nominal)}
                                </span>
                                <span className="text-[9.5px] font-bold text-emerald-700 uppercase">
                                  LUNAS
                                </span>
                              </div>
                            </div>
                          ))
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </main>

      {/* Bottom Bar */}
      <footer className="bg-white border-t border-stone-200 px-4 sm:px-6 py-3 shrink-0">
        <div className="max-w-5xl mx-auto flex items-center justify-between gap-3">
          <div className="text-xs text-stone-500">
            Tarif Default:{' '}
            <strong className="text-stone-900 font-black tabular-nums">
              {formatRupiah(warga.nominalDefault || 1000)}
            </strong>{' '}
            / malam
          </div>

          <button
            type="button"
            onClick={handleRequestClose}
            className="min-h-[44px] px-5 py-2 rounded-xl bg-stone-900 hover:bg-stone-800 text-white text-xs font-extrabold transition-colors cursor-pointer"
          >
            Kembali ke Data Warga
          </button>
        </div>
      </footer>
    </div>
  );
};
