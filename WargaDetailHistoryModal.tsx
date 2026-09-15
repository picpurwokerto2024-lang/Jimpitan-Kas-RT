import React, { useState, useMemo } from 'react';
import { 
  X, 
  Calendar, 
  Clock, 
  CheckCircle2, 
  XCircle, 
  ChevronLeft, 
  ChevronRight, 
  Share2, 
  MessageSquare, 
  DollarSign, 
  TrendingUp, 
  Award, 
  Home, 
  Phone, 
  ExternalLink,
  ShieldCheck,
  ListFilter,
  CalendarDays,
  FileText
} from 'lucide-react';
import { Warga, JimpitanRecord, AppSettings } from '../types';
import { 
  formatRupiah, 
  formatTanggalIndo, 
  cleanWhatsAppPhone, 
  generateWhatsAppWargaMonthlyRecap 
} from '../utils/formatters';

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
  if (!isOpen || !warga) return null;

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

  const totalPaidThisMonth = useMemo(() => {
    return monthRecords.reduce((sum, r) => sum + (r.nominal || 0), 0);
  }, [monthRecords]);

  // Days in selected month
  const daysInMonth = useMemo(() => {
    return new Date(activeYear, activeMonth, 0).getDate();
  }, [activeYear, activeMonth]);

  const nominalDefault = warga.nominalDefault || 1000;

  // Detect advance / multi-day records in this month
  const advanceRecords = useMemo(() => {
    return monthRecords.filter(
      (r) =>
        r.status === 'sukses' &&
        ((r.nominal && r.nominal >= nominalDefault * 5) ||
          (r.catatan &&
            (r.catatan.toLowerCase().includes('lunas 1 bulan') ||
              r.catatan.toLowerCase().includes('lunas bulan') ||
              r.catatan.toLowerCase().includes('bayar dimuka') ||
              r.catatan.toLowerCase().includes('lunas dimuka') ||
              r.catatan.toLowerCase().includes('pelunasan') ||
              r.catatan.toLowerCase().includes('lunas 1 minggu') ||
              r.catatan.toLowerCase().includes('7 hari'))))
    );
  }, [monthRecords, nominalDefault]);

  // Primary 1-Month advance record if any
  const monthlyAdvanceRecord = useMemo(() => {
    return advanceRecords.find(
      (r) =>
        (r.nominal && r.nominal >= nominalDefault * 20) ||
        (r.catatan &&
          (r.catatan.toLowerCase().includes('lunas 1 bulan') ||
            r.catatan.toLowerCase().includes('lunas bulan') ||
            r.catatan.toLowerCase().includes('30 hari')))
    ) || advanceRecords[0];
  }, [advanceRecords, nominalDefault]);

  const isMonthlyLunas = useMemo(() => {
    const hasFullMonthRecord = advanceRecords.some(
      (r) =>
        (r.nominal && r.nominal >= nominalDefault * 25) ||
        (r.catatan &&
          (r.catatan.toLowerCase().includes('lunas 1 bulan') ||
            r.catatan.toLowerCase().includes('lunas bulan') ||
            r.catatan.toLowerCase().includes('30 hari')))
    );
    return Boolean(
      hasFullMonthRecord ||
      totalPaidThisMonth >= nominalDefault * (daysInMonth - 2)
    );
  }, [advanceRecords, totalPaidThisMonth, nominalDefault, daysInMonth]);

  // Daily allocation amount
  const dailyAllocatedNominal = useMemo(() => {
    if (isMonthlyLunas && totalPaidThisMonth > 0 && daysInMonth > 0) {
      return nominalDefault || Math.round(totalPaidThisMonth / daysInMonth);
    }
    return nominalDefault;
  }, [isMonthlyLunas, totalPaidThisMonth, daysInMonth, nominalDefault]);

  // Map raw records by date string (e.g. '2026-09-01')
  const rawRecordsByDateMap = useMemo(() => {
    const map = new Map<string, JimpitanRecord[]>();
    monthRecords.forEach((r) => {
      const existing = map.get(r.tanggal) || [];
      existing.push(r);
      map.set(r.tanggal, existing);
    });
    return map;
  }, [monthRecords]);

  // Comprehensive Daily Breakdown for every day (1 .. daysInMonth)
  const dailyDistributionList = useMemo(() => {
    const list = [];

    // Pre-calculate day coverage map from all advance records
    const advanceCoverageMap = new Map<number, { record: JimpitanRecord; isSource: boolean; note: string; dayIndex?: number; totalDays?: number }>();

    advanceRecords.forEach((adv) => {
      const isFullMonth =
        (adv.nominal && adv.nominal >= nominalDefault * 25) ||
        (adv.catatan &&
          (adv.catatan.toLowerCase().includes('1 bulan') ||
            adv.catatan.toLowerCase().includes('lunas bulan') ||
            adv.catatan.toLowerCase().includes('30 hari')));

      const isOneWeek =
        (adv.catatan && (adv.catatan.toLowerCase().includes('1 minggu') || adv.catatan.toLowerCase().includes('7 hari'))) ||
        (adv.nominal >= nominalDefault * 6 && adv.nominal <= nominalDefault * 8);

      const paymentDay = parseInt(adv.tanggal.slice(8, 10), 10) || 1;

      if (isFullMonth) {
        // Covers entire month 1..daysInMonth
        for (let d = 1; d <= daysInMonth; d++) {
          const isSource = d === paymentDay;
          if (!advanceCoverageMap.has(d) || isSource) {
            advanceCoverageMap.set(d, {
              record: adv,
              isSource,
              note: isSource
                ? `Setoran Pelunasan 1 Bulan: ${formatRupiah(adv.nominal)} (${formatRupiah(dailyAllocatedNominal)}/hari)`
                : `Tercover Pelunasan 1 Bulan (${formatTanggalIndo(adv.tanggal)})`,
              dayIndex: d,
              totalDays: daysInMonth,
            });
          }
        }
      } else {
        // Week advance or proportional days starting from payment date
        const daysToCover = isOneWeek
          ? 7
          : Math.max(1, Math.floor(adv.nominal / nominalDefault));

        for (let offset = 0; offset < daysToCover; offset++) {
          const targetDay = paymentDay + offset;
          if (targetDay <= daysInMonth) {
            const isSource = offset === 0;
            if (!advanceCoverageMap.has(targetDay) || isSource) {
              advanceCoverageMap.set(targetDay, {
                record: adv,
                isSource,
                note: isSource
                  ? `Setoran Pelunasan 1 Minggu (${daysToCover} Hari): ${formatRupiah(adv.nominal)}`
                  : `Tercover Pelunasan 1 Minggu (Hari ke-${offset + 1} dari ${daysToCover} hari)`,
                dayIndex: offset + 1,
                totalDays: daysToCover,
              });
            }
          }
        }
      }
    });

    for (let d = 1; d <= daysInMonth; d++) {
      const dateIso = `${activeYearMonth}-${String(d).padStart(2, '0')}`;
      const rawOnDay = rawRecordsByDateMap.get(dateIso) || [];
      const hasRegularPaid = rawOnDay.some((r) => r.status === 'sukses' && r.nominal > 0);
      const advInfo = advanceCoverageMap.get(d);

      let isPaid = false;
      let nominal = 0;
      let isAdvanceCovered = false;
      let isAdvanceSource = false;
      let petugas = '-';
      let reguNama = 'Pengurus RT';
      let waktu = '22:00';
      let catatan = '';

      if (advInfo) {
        // Covered by advance payment (either 1-week starting on payment day or 1-month)
        isPaid = true;
        nominal = dailyAllocatedNominal;
        isAdvanceCovered = true;
        isAdvanceSource = advInfo.isSource;
        petugas = advInfo.record.petugas || '-';
        reguNama = advInfo.record.reguNama || 'Pengurus RT';
        waktu = advInfo.record.waktu || '22:00';
        catatan = advInfo.note;
      } else if (hasRegularPaid) {
        // Normal individual daily record
        isPaid = true;
        nominal = rawOnDay.reduce((sum, r) => sum + (r.nominal || 0), 0);
        const first = rawOnDay[0];
        petugas = first?.petugas || '-';
        reguNama = first?.reguNama || 'Pengurus RT';
        waktu = first?.waktu || '22:00';
        catatan = first?.catatan || '';
      } else if (rawOnDay.length > 0) {
        // Entry with 0 or other status
        const first = rawOnDay[0];
        isPaid = first?.status === 'sukses' && (first.nominal || 0) > 0;
        nominal = first?.nominal || 0;
        petugas = first?.petugas || '-';
        reguNama = first?.reguNama || 'Pengurus RT';
        waktu = first?.waktu || '22:00';
        catatan = first?.catatan || '';
      }

      list.push({
        dateIso,
        dayNum: d,
        isPaid,
        nominal,
        isAdvanceCovered,
        isAdvanceSource,
        advanceRecord: advInfo?.record || monthlyAdvanceRecord,
        rawRecords: rawOnDay,
        petugas,
        reguNama,
        waktu,
        catatan,
      });
    }

    return list;
  }, [
    activeYearMonth,
    daysInMonth,
    rawRecordsByDateMap,
    advanceRecords,
    monthlyAdvanceRecord,
    dailyAllocatedNominal,
    nominalDefault,
  ]);

  // Map daily distribution by dateIso
  const dailyDistributionMap = useMemo(() => {
    const map = new Map<string, typeof dailyDistributionList[0]>();
    dailyDistributionList.forEach((item) => {
      map.set(item.dateIso, item);
    });
    return map;
  }, [dailyDistributionList]);

  // Effective days paid count (accounting for 1-month pelunasan distribution)
  const distinctDaysPaidThisMonth = useMemo(() => {
    return dailyDistributionList.filter((item) => item.isPaid).length;
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
    const firstDayOfWeek = new Date(activeYear, activeMonth - 1, 1).getDay(); // 0 = Sunday, 1 = Monday, ...
    
    // Shift so Monday is index 0 (Indonesian standard: Sen, Sel, Rab, Kam, Jum, Sab, Min)
    const shiftedFirstDay = (firstDayOfWeek + 6) % 7;

    // Empty padding slots
    for (let i = 0; i < shiftedFirstDay; i++) {
      days.push({ dayNum: null, dateIso: '' });
    }

    // Days 1 to daysInMonth
    for (let d = 1; d <= daysInMonth; d++) {
      const dateIso = `${activeYearMonth}-${String(d).padStart(2, '0')}`;
      days.push({ dayNum: d, dateIso });
    }

    return days;
  }, [activeYear, activeMonth, activeYearMonth, daysInMonth]);

  const daysHeader = ['Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab', 'Min'];

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-xs z-50 flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
      <div className="bg-white rounded-3xl border border-stone-200 shadow-2xl max-w-xl w-full p-4 sm:p-6 space-y-4 my-auto max-h-[92vh] overflow-y-auto animate-in fade-in zoom-in-95" id="modal-warga-detail-history">
        
        {/* Top Header with Resident Profile */}
        <div className="flex items-start justify-between border-b border-stone-100 pb-3 gap-3">
          <div className="flex items-center space-x-3 min-w-0">
            {/* House Number Badge */}
            <div className="w-12 h-12 rounded-2xl bg-sky-500 text-white font-black flex flex-col items-center justify-center flex-shrink-0 shadow-sm">
              <span className="text-[9px] uppercase tracking-wider opacity-90">No</span>
              <span className="text-base leading-none">{warga.nomorRumah}</span>
            </div>

            <div className="min-w-0">
              <div className="flex items-center space-x-2">
                <h3 className="font-extrabold text-stone-900 text-base sm:text-lg truncate">
                  {warga.nama}
                </h3>
                {isPaidToday ? (
                  <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-black uppercase tracking-wider flex items-center space-x-1 flex-shrink-0">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                    <span>HARI INI LUNAS</span>
                  </span>
                ) : (
                  <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-900 text-[10px] font-black uppercase tracking-wider flex-shrink-0">
                    BELUM TERAMBIL
                  </span>
                )}
              </div>
              <p className="text-xs text-stone-500 truncate">
                {warga.alamat || `${warga.blok || 'Blok A'} • RT ${warga.rt || settings.namaRt} / RW ${warga.rw || settings.namaRw}`}
              </p>
              {warga.nomorHp && (
                <a
                  href={`https://wa.me/${cleanWhatsAppPhone(warga.nomorHp)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center space-x-1 text-[11px] text-emerald-700 font-bold hover:underline mt-0.5"
                >
                  <Phone className="w-3 h-3" />
                  <span>{warga.nomorHp}</span>
                  <ExternalLink className="w-2.5 h-2.5" />
                </a>
              )}
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl text-stone-400 hover:text-stone-700 hover:bg-stone-100 cursor-pointer flex-shrink-0"
            id="btn-close-warga-history"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Month Navigator Header */}
        <div className="bg-sky-50/70 border border-sky-200/80 rounded-2xl p-2.5 flex items-center justify-between gap-2">
          <button
            type="button"
            onClick={handlePrevMonth}
            className="p-1.5 rounded-xl bg-white hover:bg-sky-100 text-sky-800 border border-sky-200 transition-colors cursor-pointer"
            title="Bulan Sebelumnya"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>

          <div className="text-center">
            <span className="text-[10px] font-extrabold uppercase tracking-wider text-sky-700 block">
              PERIODE BULAN
            </span>
            <span className="font-extrabold text-stone-900 text-sm sm:text-base">
              {activeMonthLabel}
            </span>
          </div>

          <button
            type="button"
            onClick={handleNextMonth}
            className="p-1.5 rounded-xl bg-white hover:bg-sky-100 text-sky-800 border border-sky-200 transition-colors cursor-pointer"
            title="Bulan Berikutnya"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        {/* Advance Payment Banner if resident paid for the month */}
        {isMonthlyLunas && (
          <div className="bg-gradient-to-r from-amber-50 via-orange-50 to-amber-50 border border-amber-200/90 rounded-2xl p-3 flex items-start space-x-2.5 shadow-2xs">
            <Award className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
            <div className="text-xs">
              <div className="flex items-center space-x-1.5 flex-wrap">
                <span className="font-black text-amber-950">
                  Warga Ini Telah Lunas 1 Bulan Penuh!
                </span>
                <span className="px-1.5 py-0.2 rounded bg-amber-200 text-amber-900 text-[10px] font-extrabold">
                  {activeMonthLabel}
                </span>
              </div>
              <p className="text-amber-900/90 text-[11px] mt-0.5 leading-relaxed">
                Tercatat setoran kas jimpitan sebesar <strong>{formatRupiah(totalPaidThisMonth)}</strong>. Seluruh <strong>{daysInMonth} hari</strong> otomatis terisi lunas dengan pembagian alokasi <strong>{formatRupiah(dailyAllocatedNominal)}/hari</strong>.
              </p>
            </div>
          </div>
        )}

        {/* 3 Metric Summary Cards */}
        <div className="grid grid-cols-3 gap-2 sm:gap-3">
          {/* Card 1: Total Bulan Ini */}
          <div className="p-3 rounded-2xl bg-white border border-sky-100 shadow-2xs space-y-0.5">
            <span className="text-[10px] font-extrabold uppercase text-stone-500 tracking-wider block">
              TOTAL KAS BULAN INI
            </span>
            <div className="text-sm sm:text-base font-black text-sky-700 truncate">
              {formatRupiah(totalPaidThisMonth)}
            </div>
            <span className="text-[10px] text-stone-500 font-semibold block">
              {distinctDaysPaidThisMonth} dari {daysInMonth} Hari
            </span>
          </div>

          {/* Card 2: Tingkat Partisipasi */}
          <div className="p-3 rounded-2xl bg-white border border-stone-200 shadow-2xs space-y-0.5">
            <span className="text-[10px] font-extrabold uppercase text-stone-500 tracking-wider block">
              STATUS PARTISIPASI
            </span>
            <div className="text-sm sm:text-base font-black text-emerald-700 truncate flex items-center space-x-1">
              <span>{paymentPercentage}%</span>
              {paymentPercentage >= 100 && <span className="text-xs">🌟</span>}
            </div>
            <div className="w-full bg-stone-100 h-1.5 rounded-full overflow-hidden mt-1">
              <div
                className="bg-emerald-500 h-full rounded-full transition-all duration-300"
                style={{ width: `${Math.min(paymentPercentage, 100)}%` }}
              />
            </div>
          </div>

          {/* Card 3: Total Sepanjang Waktu */}
          <div className="p-3 rounded-2xl bg-white border border-stone-200 shadow-2xs space-y-0.5">
            <span className="text-[10px] font-extrabold uppercase text-stone-500 tracking-wider block">
              KUMULATIF MASUK
            </span>
            <div className="text-sm sm:text-base font-black text-stone-900 truncate">
              {formatRupiah(totalAllTime)}
            </div>
            <span className="text-[10px] text-stone-500 font-semibold block">
              {residentRecords.length} kali penarikan
            </span>
          </div>
        </div>

        {/* View Mode Toggle: Kalender Harian vs Daftar Tabel Catatan */}
        <div className="flex items-center justify-between border-b border-stone-100 pb-2">
          <div className="flex items-center space-x-1 bg-stone-100 p-1 rounded-xl border border-stone-200/70">
            <button
              type="button"
              onClick={() => {
                setActiveViewMode('calendar');
                setSelectedDayDetail(null);
              }}
              className={`px-3 py-1 text-xs font-extrabold rounded-lg transition-all flex items-center space-x-1.5 cursor-pointer ${
                activeViewMode === 'calendar'
                  ? 'bg-white text-sky-800 shadow-xs'
                  : 'text-stone-600 hover:text-stone-900'
              }`}
            >
              <CalendarDays className="w-3.5 h-3.5" />
              <span>Kalender ({distinctDaysPaidThisMonth}/{daysInMonth} Hari)</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveViewMode('list')}
              className={`px-3 py-1 text-xs font-extrabold rounded-lg transition-all flex items-center space-x-1.5 cursor-pointer ${
                activeViewMode === 'list'
                  ? 'bg-white text-sky-800 shadow-xs'
                  : 'text-stone-600 hover:text-stone-900'
              }`}
            >
              <FileText className="w-3.5 h-3.5" />
              <span>Daftar Rincian</span>
            </button>
          </div>

          <a
            href={waShareUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-extrabold flex items-center space-x-1.5 shadow-xs transition-colors cursor-pointer"
            title="Kirim Rekapitulasi via WhatsApp ke Warga"
          >
            <MessageSquare className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Kirim Rekap WA</span>
            <span className="sm:hidden">Kirim WA</span>
          </a>
        </div>

        {/* VIEW 1: KALENDER STATUS PER TANGGAL */}
        {activeViewMode === 'calendar' && (
          <div className="space-y-3">
            {/* Days Header */}
            <div className="grid grid-cols-7 gap-1 text-center">
              {daysHeader.map((dh) => (
                <div key={dh} className="text-[11px] font-black text-stone-500 py-1">
                  {dh}
                </div>
              ))}
            </div>

            {/* Calendar Cells Grid */}
            <div className="grid grid-cols-7 gap-1.5">
              {calendarDays.map((item, idx) => {
                if (!item.dayNum) {
                  return <div key={`empty-${idx}`} className="h-14 rounded-xl bg-stone-50/50" />;
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
                    className={`h-14 rounded-xl p-1 flex flex-col justify-between text-left transition-all border cursor-pointer relative ${
                      isPaid
                        ? isAdv
                          ? 'bg-amber-50/70 hover:bg-amber-100/80 border-amber-300 text-amber-950 shadow-2xs'
                          : 'bg-sky-50 hover:bg-sky-100 border-sky-300 text-sky-950 shadow-2xs'
                        : 'bg-white hover:bg-stone-50 border-stone-200 text-stone-400'
                    } ${
                      isSelected ? 'ring-2 ring-sky-500 ring-offset-1 z-10' : ''
                    } ${
                      isCurrentToday ? 'border-amber-500 font-black' : ''
                    }`}
                  >
                    <div className="flex items-center justify-between w-full">
                      <span className={`text-[11px] font-black ${isPaid ? (isAdv ? 'text-amber-900' : 'text-sky-900') : 'text-stone-700'}`}>
                        {item.dayNum}
                      </span>
                      {isPaid ? (
                        <CheckCircle2 className={`w-3.5 h-3.5 flex-shrink-0 ${isAdv ? 'text-amber-600' : 'text-sky-600'}`} />
                      ) : (
                        <span className="w-1.5 h-1.5 rounded-full bg-stone-300" />
                      )}
                    </div>

                    <div className="truncate">
                      {isPaid ? (
                        <span className={`text-[9px] font-black block truncate leading-tight ${isAdv ? 'text-amber-800' : 'text-sky-700'}`}>
                          {nominalDisp >= 1000 ? `${nominalDisp / 1000}k` : `${nominalDisp}`}
                        </span>
                      ) : (
                        <span className="text-[8px] text-stone-400 block truncate leading-tight">
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
              <div className="p-3.5 rounded-2xl bg-sky-50 border border-sky-200 space-y-2 animate-in fade-in slide-in-from-top-2">
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
                    className="text-xs font-bold text-stone-500 hover:text-stone-800 cursor-pointer"
                  >
                    Tutup
                  </button>
                </div>

                {selectedDayDetail.isPaid ? (
                  <div className="bg-white p-3 rounded-xl border border-sky-100 space-y-2 shadow-2xs">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <span className="text-sm font-black text-stone-900">
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
                      <span className="text-[11px] text-stone-500 font-semibold">
                        ⏰ {selectedDayDetail.waktu || '22:00'} WIB
                      </span>
                    </div>

                    <p className="text-xs text-stone-600">
                      👮‍♂️ <strong>Regu:</strong> {selectedDayDetail.reguNama} ({selectedDayDetail.petugas})
                    </p>

                    {selectedDayDetail.catatan && (
                      <div className="bg-stone-50 p-2 rounded-lg border border-stone-200/80 text-[11px] text-stone-700">
                        📝 <strong>Catatan:</strong> {selectedDayDetail.catatan}
                      </div>
                    )}

                    {selectedDayDetail.isAdvanceSource && selectedDayDetail.advanceRecord && (
                      <div className="bg-amber-50 p-2 rounded-lg border border-amber-200 text-[11px] text-amber-900">
                        🌟 <strong>Transaksi Setoran Dimuka:</strong> Disetor tunai {formatRupiah(selectedDayDetail.advanceRecord.nominal)} pada tanggal ini untuk pelunasan 1 bulan penuh.
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="bg-white p-3 rounded-xl border border-stone-200 text-center text-xs text-stone-500">
                    Tidak ada catatan penarikan jimpitan pada tanggal ini (Belum diambil).
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* VIEW 2: DAFTAR RINCIAN CATATAN TABEL/LIST */}
        {activeViewMode === 'list' && (
          <div className="space-y-3">
            {/* Sub-tabs for List Mode */}
            <div className="flex items-center space-x-2 bg-stone-100 p-1 rounded-xl border border-stone-200 text-xs">
              <button
                type="button"
                onClick={() => setListViewSubTab('distributed')}
                className={`flex-1 py-1.5 font-bold rounded-lg transition-all cursor-pointer ${
                  listViewSubTab === 'distributed'
                    ? 'bg-white text-sky-800 shadow-xs'
                    : 'text-stone-600 hover:text-stone-900'
                }`}
              >
                📅 Rincian Terdistribusi ({dailyDistributionList.length} Hari)
              </button>
              <button
                type="button"
                onClick={() => setListViewSubTab('raw')}
                className={`flex-1 py-1.5 font-bold rounded-lg transition-all cursor-pointer ${
                  listViewSubTab === 'raw'
                    ? 'bg-white text-sky-800 shadow-xs'
                    : 'text-stone-600 hover:text-stone-900'
                }`}
              >
                💰 Transaksi Kas Riil ({monthRecords.length})
              </button>
            </div>

            {/* SubTab 1: Distributed Days */}
            {listViewSubTab === 'distributed' && (
              <div className="space-y-1.5 max-h-72 overflow-y-auto pr-1">
                {dailyDistributionList
                  .slice()
                  .reverse()
                  .map((item) => (
                    <div
                      key={item.dateIso}
                      className={`p-2.5 rounded-2xl border transition-all flex items-center justify-between gap-2 ${
                        item.isPaid
                          ? item.isAdvanceCovered
                            ? 'bg-amber-50/40 border-amber-200'
                            : 'bg-white border-stone-200'
                          : 'bg-stone-50/50 border-stone-200 opacity-60'
                      }`}
                    >
                      <div className="flex items-center space-x-2.5 min-w-0">
                        <div
                          className={`w-8 h-8 rounded-xl font-extrabold flex items-center justify-center text-xs flex-shrink-0 ${
                            item.isPaid
                              ? item.isAdvanceCovered
                                ? 'bg-amber-500 text-white'
                                : 'bg-sky-100 text-sky-800'
                              : 'bg-stone-200 text-stone-500'
                          }`}
                        >
                          {item.dayNum}
                        </div>
                        <div className="min-w-0">
                          <h6 className="font-extrabold text-stone-900 text-xs truncate">
                            {formatTanggalIndo(item.dateIso)}
                          </h6>
                          <p className="text-[11px] text-stone-500 truncate">
                            {item.isPaid ? (
                              item.isAdvanceCovered ? (
                                <span className="text-amber-800 font-semibold">
                                  🌟 Alokasi Pelunasan 1 Bulan • {item.reguNama}
                                </span>
                              ) : (
                                <span>⏰ {item.waktu} • 👮‍♂️ {item.petugas}</span>
                              )
                            ) : (
                              <span className="text-stone-400">Belum Ada Penarikan</span>
                            )}
                          </p>
                        </div>
                      </div>

                      <div className="text-right flex-shrink-0">
                        <span className="font-black text-stone-900 text-xs block">
                          {formatRupiah(item.nominal)}
                        </span>
                        {item.isPaid ? (
                          <span className={`text-[9px] font-extrabold uppercase ${item.isAdvanceCovered ? 'text-amber-700' : 'text-emerald-600'}`}>
                            {item.isAdvanceCovered ? 'LUNAS (1 BULAN)' : 'LUNAS'}
                          </span>
                        ) : (
                          <span className="text-[9px] font-semibold text-stone-400 uppercase">
                            KOSONG
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
              </div>
            )}

            {/* SubTab 2: Raw Records */}
            {listViewSubTab === 'raw' && (
              <div className="space-y-1.5 max-h-72 overflow-y-auto pr-1">
                {monthRecords.length === 0 ? (
                  <div className="p-8 text-center bg-stone-50 rounded-2xl border border-dashed border-stone-200 space-y-1.5">
                    <FileText className="w-8 h-8 text-stone-300 mx-auto" />
                    <p className="text-xs font-bold text-stone-700">
                      Belum ada transaksi kas jimpitan pada {activeMonthLabel}.
                    </p>
                  </div>
                ) : (
                  monthRecords
                    .sort((a, b) => b.tanggal.localeCompare(a.tanggal) || (b.createdAt || 0) - (a.createdAt || 0))
                    .map((rec, idx) => (
                      <div
                        key={rec.id || idx}
                        className="p-3 rounded-2xl bg-white border border-stone-200 hover:border-sky-300 transition-all flex items-center justify-between gap-2 shadow-2xs"
                      >
                        <div className="flex items-center space-x-3 min-w-0">
                          <div className="w-8 h-8 rounded-xl bg-sky-100 text-sky-700 font-extrabold flex items-center justify-center text-xs flex-shrink-0">
                            {rec.tanggal.split('-')[2] || '•'}
                          </div>
                          <div className="min-w-0">
                            <h6 className="font-extrabold text-stone-900 text-xs sm:text-sm truncate">
                              {formatTanggalIndo(rec.tanggal)}
                            </h6>
                            <p className="text-[11px] text-stone-500 truncate">
                              ⏰ {rec.waktu || '22:00'} WIB • 👮‍♂️ {rec.reguNama} ({rec.petugas || '-'})
                            </p>
                            {rec.catatan && (
                              <p className="text-[10px] text-amber-700 font-medium truncate mt-0.5">
                                📝 {rec.catatan}
                              </p>
                            )}
                          </div>
                        </div>

                        <div className="text-right flex-shrink-0">
                          <span className="font-black text-sky-700 text-xs sm:text-sm block">
                            {formatRupiah(rec.nominal)}
                          </span>
                          <span className="text-[9px] font-bold text-emerald-600 uppercase">
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

        {/* Footer Actions */}
        <div className="pt-2 border-t border-stone-100 flex items-center justify-between gap-2">
          <div className="text-[11px] text-stone-500">
            Tarif Default: <strong className="text-stone-800 font-bold">{formatRupiah(warga.nominalDefault || 1000)}</strong> / malam
          </div>

          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-stone-100 hover:bg-stone-200 text-stone-800 text-xs font-bold transition-colors cursor-pointer"
          >
            Tutup
          </button>
        </div>
      </div>
    </div>
  );
};
