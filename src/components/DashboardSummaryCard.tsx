import React from 'react';
import { JimpitanRecord, RondaSession } from '../types';
import { 
  CheckCircle2, 
  Calendar, 
  ArrowRight,
  Clock,
  RotateCcw,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  AlertTriangle
} from 'lucide-react';
import { formatRupiah, formatTanggalIndo, getTodayDateIso, getShiftedDateIso } from '../utils/formatters';
import { AppTheme, AVAILABLE_THEMES } from '../utils/themeManager';

interface DashboardSummaryCardProps {
  totalTerkumpulMalamIni: number;
  jumlahRumahScanned: number;
  totalRumah: number;
  totalTarget?: number;
  selectedDate: string;
  sessionStatus?: RondaSession;
  onOpenFinishModal: () => void;
  allRecords?: JimpitanRecord[];
  onSelectDate?: (date: string) => void;
  onResetToToday?: () => void;
  reguList?: any[];
  selectedReguId?: string;
  onSelectRegu?: (id: string) => void;
  petugasNama?: string;
  onPetugasChange?: (nama: string) => void;
  settings?: any;
  activeReguName?: string;
  theme?: AppTheme;
}

export const DashboardSummaryCard: React.FC<DashboardSummaryCardProps> = ({
  totalTerkumpulMalamIni,
  jumlahRumahScanned,
  totalRumah,
  totalTarget = 0,
  selectedDate,
  sessionStatus,
  onOpenFinishModal,
  allRecords = [],
  onSelectDate,
  onResetToToday,
  theme = AVAILABLE_THEMES[0],
}) => {
  const liveToday = getTodayDateIso();
  const isPastDate = selectedDate !== liveToday;
  const coveragePercent = totalRumah > 0 ? Math.round((jumlahRumahScanned / totalRumah) * 100) : 0;
  const isFinished = sessionStatus?.status === 'finished';

  const handlePrevDay = () => {
    if (!onSelectDate) return;
    const prevDay = getShiftedDateIso(selectedDate, -1);
    onSelectDate(prevDay);
  };

  const handleNextDay = () => {
    if (!onSelectDate) return;
    const nextDay = getShiftedDateIso(selectedDate, 1);
    onSelectDate(nextDay);
  };

  // Find if there are records on other dates (helpful hint if user is viewing wrong date)
  const otherDateRecords = React.useMemo(() => {
    if (jumlahRumahScanned > 0 || allRecords.length === 0) return null;
    const dateMap = new Map<string, number>();
    allRecords.forEach(r => {
      if (r.tanggal && r.tanggal !== selectedDate) {
        dateMap.set(r.tanggal, (dateMap.get(r.tanggal) || 0) + 1);
      }
    });
    if (dateMap.size === 0) return null;
    const sortedDates = Array.from(dateMap.keys()).sort((a, b) => b.localeCompare(a));
    const mostRecentDate = sortedDates[0];
    return {
      date: mostRecentDate,
      count: dateMap.get(mostRecentDate) || 0
    };
  }, [allRecords, jumlahRumahScanned, selectedDate]);

  return (
    <div className="w-full space-y-2.5" id="dashboard-summary-card">
      {/* Alert banner when viewing previous date */}
      {isPastDate && (
        <div className="p-3 bg-amber-500/15 border border-amber-400/50 rounded-2xl flex items-center justify-between gap-2 shadow-xs animate-in fade-in duration-200">
          <div className="flex items-center space-x-2 min-w-0">
            <Clock className="w-4 h-4 text-amber-600 shrink-0" />
            <div className="text-xs text-amber-950 font-semibold truncate">
              <span>Membuka arsip / data: <strong>{formatTanggalIndo(selectedDate)}</strong></span>
            </div>
          </div>
          {onResetToToday && (
            <button
              type="button"
              onClick={onResetToToday}
              className="px-2.5 py-1 bg-amber-500 hover:bg-amber-600 text-white font-extrabold rounded-xl text-xs flex items-center space-x-1 shrink-0 transition-colors shadow-2xs cursor-pointer"
              title="Kembalikan ke Tanggal Hari Ini"
              id="btn-card-reset-today"
            >
              <RotateCcw className="w-3 h-3" />
              <span>Hari Ini</span>
            </button>
          )}
        </div>
      )}

      {/* Main Card with Dynamic Theme Gradient */}
      <div className={`w-full rounded-3xl ${theme.cardGradient} text-white border ${theme.cardBorder} shadow-lg p-4 sm:p-5 space-y-4 transition-all duration-300`}>
        {/* Top Meta Line: Title & Interactive Date Selector */}
        <div className="flex items-center justify-between flex-wrap gap-2">
          {/* Interactive Date Picker Button with chevrons */}
          <div className="flex items-center space-x-1">
            {onSelectDate && (
              <button
                type="button"
                onClick={handlePrevDay}
                className="w-7 h-7 rounded-lg bg-black/20 hover:bg-black/30 border border-white/15 flex items-center justify-center text-white/90 hover:text-white transition-colors cursor-pointer"
                title="Pindah ke 1 hari sebelumnya"
                id="btn-prev-day"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
            )}

            {/* Date Picker Button with hidden native date input */}
            <div className="relative inline-flex items-center">
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => {
                  if (e.target.value && onSelectDate) {
                    onSelectDate(e.target.value);
                  }
                }}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                id="card-date-native-picker"
                title="Klik untuk memilih tanggal lain (kemarin, arsip jimpitan)"
              />
              <div className={`px-2.5 py-1 rounded-xl flex items-center space-x-1.5 text-xs font-black cursor-pointer transition-all ${
                isPastDate 
                  ? 'bg-amber-400 text-amber-950 shadow-md ring-2 ring-amber-300/60' 
                  : 'bg-white/20 hover:bg-white/30 text-white border border-white/25 shadow-2xs'
              }`}>
                <Calendar className="w-3.5 h-3.5 shrink-0" />
                <span className="truncate max-w-[140px] sm:max-w-none">{formatTanggalIndo(selectedDate)}</span>
                <ChevronDown className="w-3 h-3 opacity-70 shrink-0" />
              </div>
            </div>

            {onSelectDate && (
              <button
                type="button"
                onClick={handleNextDay}
                className="w-7 h-7 rounded-lg bg-black/20 hover:bg-black/30 border border-white/15 flex items-center justify-center text-white/90 hover:text-white transition-colors cursor-pointer"
                title="Pindah ke 1 hari berikutnya"
                id="btn-next-day"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            )}
          </div>

          {isFinished ? (
            <span className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-xl bg-emerald-500/25 border border-emerald-400/40 text-emerald-200 text-xs font-bold shadow-2xs">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-300" />
              <span>Selesai</span>
            </span>
          ) : (
            <span className={`inline-flex items-center space-x-1 px-2.5 py-1 rounded-xl ${theme.cardPillBg} border ${theme.cardPillBorder} text-white text-xs font-bold shadow-2xs`}>
              <Clock className="w-3.5 h-3.5 text-amber-300" />
              <span>{isPastDate ? 'Data Tanggal Lalu' : 'Sedang Berjalan'}</span>
            </span>
          )}
        </div>

        {/* Big Amount Display */}
        <div className="space-y-1">
          <div className="text-3xl sm:text-4xl font-black text-white tracking-tight font-sans drop-shadow-xs">
            {formatRupiah(totalTerkumpulMalamIni)}
          </div>
          <div className={`flex items-center justify-between text-xs ${theme.cardSubText}`}>
            <span>{jumlahRumahScanned} dari {totalRumah} Rumah Terdata</span>
            <span className={`font-extrabold ${theme.cardAccent}`}>{coveragePercent}% Tercapai</span>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="w-full bg-black/30 rounded-full h-2.5 p-0.5 border border-white/15 overflow-hidden">
          <div 
            className={`h-full rounded-full ${theme.cardProgressBar} transition-all duration-500 shadow-xs`}
            style={{ width: `${Math.min(100, Math.max(0, coveragePercent))}%` }}
          />
        </div>

        {/* Bottom Actions & Details */}
        <div className="flex items-center justify-between pt-1 border-t border-white/15">
          <div className={`text-xs ${theme.cardSubText} font-medium`}>
            {totalTarget > 0 ? (
              <span>Target: <strong>{formatRupiah(totalTarget)}</strong></span>
            ) : (
              <span>{totalRumah - jumlahRumahScanned > 0 ? `${totalRumah - jumlahRumahScanned} rumah belum setor` : 'Semua rumah telah tercatat'}</span>
            )}
          </div>

          <button
            onClick={onOpenFinishModal}
            className="px-3.5 py-1.5 rounded-xl bg-white/20 hover:bg-white/30 text-white border border-white/30 text-xs font-black tracking-wide shadow-xs transition-colors flex items-center space-x-1.5 cursor-pointer"
          >
            <span>{isFinished ? 'Lihat Laporan' : 'Selesaikan'}</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Helpful other date records banner if any */}
      {otherDateRecords && onSelectDate && (
        <div className={`p-3 ${theme.badgeBg} border ${theme.badgeBorder} rounded-2xl flex items-center justify-between text-xs ${theme.badgeText} shadow-2xs`}>
          <div className="flex items-center space-x-2">
            <Calendar className="w-4 h-4 text-purple-600 shrink-0" />
            <span>
              Terdapat <strong>{otherDateRecords.count} catatan</strong> pada tanggal <strong>{otherDateRecords.date}</strong>
            </span>
          </div>
          <button
            onClick={() => onSelectDate(otherDateRecords.date)}
            className={`px-2.5 py-1 ${theme.primaryBtn} font-bold rounded-xl flex items-center space-x-1 shrink-0 transition-colors shadow-2xs cursor-pointer`}
          >
            <span>Buka</span>
            <ArrowRight className="w-3 h-3" />
          </button>
        </div>
      )}
    </div>
  );
};
