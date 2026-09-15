import { JimpitanRecord, Warga } from '../types';

export interface DayStatusInWeek {
  dateStr: string; // YYYY-MM-DD
  dayOfWeekName: string; // Senin, Selasa, etc.
  dayOfMonth: number; // 1..31
  isPaid: boolean;
  paidNominal: number;
  existingRecord?: JimpitanRecord;
  status: 'paid' | 'unpaid';
}

export interface WeekDefinition {
  weekNumber: number;
  label: string; // e.g. "Minggu 1 (Tgl 01 - 07)"
  startDateStr: string;
  endDateStr: string;
  days: {
    dateStr: string;
    dayOfWeekName: string;
    dayOfMonth: number;
  }[];
}

const INDO_DAYS = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];

/**
 * Generate 7-day week chunks for a given year and month
 */
export const getWeeksInMonth = (year: number, month: number): WeekDefinition[] => {
  const daysInMonth = new Date(year, month, 0).getDate();
  const weeks: WeekDefinition[] = [];
  
  let currentStartDay = 1;
  let weekNum = 1;

  while (currentStartDay <= daysInMonth) {
    const currentEndDay = Math.min(daysInMonth, currentStartDay + 6);
    const days: WeekDefinition['days'] = [];

    for (let d = currentStartDay; d <= currentEndDay; d++) {
      const dateObj = new Date(year, month - 1, d);
      const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      const dayOfWeekName = INDO_DAYS[dateObj.getDay()];
      days.push({
        dateStr,
        dayOfWeekName,
        dayOfMonth: d,
      });
    }

    const startPad = String(currentStartDay).padStart(2, '0');
    const endPad = String(currentEndDay).padStart(2, '0');

    weeks.push({
      weekNumber: weekNum,
      label: `Minggu ${weekNum} (Tgl ${startPad} - ${endPad})`,
      startDateStr: days[0].dateStr,
      endDateStr: days[days.length - 1].dateStr,
      days,
    });

    currentStartDay += 7;
    weekNum++;
  }

  return weeks;
};

/**
 * Detect status for each day of a specified week for a specific warga
 */
export const analyzeWargaWeekStatus = (
  warga: Warga,
  week: WeekDefinition,
  allRecords: JimpitanRecord[],
  defaultNominal: number = 1000
): {
  days: DayStatusInWeek[];
  paidDaysCount: number;
  unpaidDaysCount: number;
  unpaidDayNames: string[];
  totalExpectedNominal: number;
  totalAlreadyPaid: number;
  totalRemainingNominal: number;
  isFullyPaid: boolean;
  hasEmptyDays: boolean;
} => {
  const nominalDaily = warga.nominalDefault || defaultNominal || 1000;

  // Filter records for this warga
  const wargaRecords = allRecords.filter(
    (r) =>
      r.status === 'sukses' &&
      (r.wargaId === warga.id || r.nomorRumah === warga.nomorRumah)
  );

  const days: DayStatusInWeek[] = week.days.map((d) => {
    // Check if record exists on this exact date
    const rec = wargaRecords.find((r) => r.tanggal === d.dateStr);
    const isPaid = !!rec && (rec.nominal || 0) > 0;
    const paidNominal = rec ? rec.nominal : 0;

    return {
      dateStr: d.dateStr,
      dayOfWeekName: d.dayOfWeekName,
      dayOfMonth: d.dayOfMonth,
      isPaid,
      paidNominal,
      existingRecord: rec,
      status: isPaid ? 'paid' : 'unpaid',
    };
  });

  const paidDaysCount = days.filter((d) => d.isPaid).length;
  const unpaidDays = days.filter((d) => !d.isPaid);
  const unpaidDaysCount = unpaidDays.length;
  const unpaidDayNames = unpaidDays.map((d) => `${d.dayOfWeekName} (${String(d.dayOfMonth).padStart(2, '0')})`);

  const totalExpectedNominal = days.length * nominalDaily;
  const totalAlreadyPaid = days.reduce((sum, d) => sum + (d.paidNominal || 0), 0);
  const totalRemainingNominal = Math.max(0, totalExpectedNominal - totalAlreadyPaid);

  return {
    days,
    paidDaysCount,
    unpaidDaysCount,
    unpaidDayNames,
    totalExpectedNominal,
    totalAlreadyPaid,
    totalRemainingNominal,
    isFullyPaid: unpaidDaysCount === 0,
    hasEmptyDays: unpaidDaysCount > 0,
  };
};
