import React from 'react';
import { JimpitanRecord, RondaSession } from '../types';
import { 
  Calendar, 
  ArrowRight,
  Clock,
  RotateCcw,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  Wallet,
  Target,
  Home,
  Check,
  FileText,
  CheckCircle2
} from 'lucide-react';
import { formatRupiah, formatTanggalIndo, formatTanggalSingkat, getTodayDateIso, getShiftedDateIso } from '../utils/formatters';
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
  onBack?: () => void;
  onCardClick?: (type: 'sudah' | 'belum' | 'total') => void;
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
  onBack,
  onCardClick,
}) => {
  const liveToday = getTodayDateIso();
  const isPastDate = selectedDate !== liveToday;
  const coveragePercent = totalRumah > 0 ? Math.round((jumlahRumahScanned / totalRumah) * 100) : 0;
  const isFinished = sessionStatus?.status === 'finished';
  const rumahBelumSetor = Math.max(0, totalRumah - jumlahRumahScanned);

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
    <div className="w-full space-y-3" id="dashboard-summary-card">
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

      {/* Top Header Bar: Back Button, Date Dropdown, and Status Badge */}
      <div className="flex items-center justify-between gap-1.5 sm:gap-2 w-full">
        <div className="flex items-center space-x-1.5 sm:space-x-2 min-w-0 flex-1">
          {/* Back Circular Button */}
          {onBack ? (
            <button
              type="button"
              onClick={onBack}
              className="w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-[#3d2215] hover:bg-[#4d2d1d] text-white border border-white/10 flex items-center justify-center shrink-0 shadow-xs cursor-pointer transition-colors"
              title="Kembali"
              id="btn-dashboard-back"
            >
              <ChevronLeft className="w-4 h-4 sm:w-5 sm:h-5 stroke-[2.5]" />
            </button>
          ) : (
            <button
              type="button"
              onClick={handlePrevDay}
              className="w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-[#3d2215] hover:bg-[#4d2d1d] text-white border border-white/10 flex items-center justify-center shrink-0 shadow-xs cursor-pointer transition-colors"
              title="Hari Sebelumnya"
              id="btn-dashboard-back-day"
            >
              <ChevronLeft className="w-4 h-4 sm:w-5 sm:h-5 stroke-[2.5]" />
            </button>
          )}

          {/* Interactive Date Picker Pill */}
          <div className="relative inline-flex items-center min-w-0 max-w-[190px] sm:max-w-none">
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
              title="Klik untuk memilih tanggal"
            />
            <div className={`px-2.5 sm:px-3.5 py-1.5 sm:py-2 rounded-full flex items-center space-x-1.5 sm:space-x-2 text-[11px] sm:text-sm font-bold cursor-pointer transition-all shadow-xs truncate ${
              isPastDate 
                ? 'bg-amber-400 text-amber-950 ring-2 ring-amber-300/60' 
                : 'bg-[#3d2215] hover:bg-[#4d2d1d] text-white border border-white/10'
            }`}>
              <Calendar className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-white/90 shrink-0" />
              <span className="hidden sm:inline truncate">{formatTanggalIndo(selectedDate)}</span>
              <span className="inline sm:hidden truncate">{formatTanggalSingkat(selectedDate)}</span>
              <ChevronDown className="w-3 h-3 sm:w-3.5 sm:h-3.5 opacity-70 shrink-0" />
            </div>
          </div>
        </div>

        {/* Status Pill on the Right */}
        <div className="shrink-0">
          {isFinished ? (
            <div className="px-2.5 sm:px-3.5 py-1.5 sm:py-2 rounded-full bg-[#3d2215] border border-white/10 text-emerald-300 text-[11px] sm:text-xs font-bold flex items-center space-x-1 sm:space-x-1.5 shadow-xs whitespace-nowrap">
              <CheckCircle2 className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-emerald-400 shrink-0" />
              <span>Selesai</span>
              <span className="w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full bg-emerald-400 inline-block ml-0.5" />
            </div>
          ) : (
            <div className="px-2.5 sm:px-3.5 py-1.5 sm:py-2 rounded-full bg-[#3d2215] border border-white/10 text-amber-200 text-[11px] sm:text-xs font-semibold flex items-center space-x-1 sm:space-x-1.5 shadow-xs whitespace-nowrap">
              <Clock className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-amber-300 shrink-0" />
              <span>{isPastDate ? 'Arsip Lalu' : 'Sedang Berjalan'}</span>
              <span className="w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full bg-emerald-400 animate-pulse inline-block ml-0.5" />
            </div>
          )}
        </div>
      </div>

      {/* Main Big Brown Card */}
      <div className={`w-full rounded-3xl ${theme.cardGradient} text-white border ${theme.cardBorder} shadow-lg p-4 sm:p-5 space-y-4 transition-all duration-300`}>
        {/* Upper section: Amount & Target */}
        <div className="flex items-center justify-between gap-3">
          {/* Left: Wallet + Amount + Subtitle */}
          <div className="flex items-center space-x-3 sm:space-x-3.5 min-w-0">
            <div className="w-11 h-11 sm:w-14 sm:h-14 rounded-full bg-white/20 border border-white/20 flex items-center justify-center text-white flex-shrink-0 shadow-inner">
              <Wallet className="w-5 h-5 sm:w-7 sm:h-7 stroke-[2.2]" />
            </div>
            <div className="min-w-0">
              <div className="text-2xl sm:text-3xl md:text-4xl font-black text-white tracking-tight truncate font-sans">
                {formatRupiah(totalTerkumpulMalamIni)}
              </div>
              <div className="text-xs sm:text-sm text-white/80 font-medium">
                Total Terkumpul
              </div>
            </div>
          </div>

          {/* Right: Divider + Target + Percent + Subtitle */}
          <div className="flex items-center space-x-2.5 sm:space-x-3 border-l border-white/15 pl-2.5 sm:pl-5 flex-shrink-0">
            <div className="w-9 h-9 sm:w-12 sm:h-12 rounded-full bg-amber-500/20 border border-amber-400/30 flex items-center justify-center text-amber-300 flex-shrink-0">
              <Target className="w-4 h-4 sm:w-6 sm:h-6 stroke-[2.2]" />
            </div>
            <div>
              <div className="text-xl sm:text-2xl font-black text-white tracking-tight font-sans">
                {coveragePercent}%
              </div>
              <div className="text-xs sm:text-sm text-white/80 font-medium">
                Tercapai
              </div>
            </div>
          </div>
        </div>

        {/* Middle section: Progress Bar */}
        <div className="w-full bg-black/30 rounded-full h-2.5 p-0.5 border border-white/15 overflow-hidden">
          <div 
            className={`h-full rounded-full ${theme.cardProgressBar} transition-all duration-500 shadow-xs`}
            style={{ width: `${Math.min(100, Math.max(0, coveragePercent))}%` }}
          />
        </div>

        {/* Lower section: Houses Left & Finish Button */}
        <div className="flex items-center justify-between gap-3 pt-1">
          <div className="flex items-center space-x-2 sm:space-x-2.5 min-w-0">
            <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-white/20 border border-white/20 flex items-center justify-center text-white flex-shrink-0">
              <Home className="w-3.5 h-3.5 sm:w-4 sm:h-4 stroke-[2.5]" />
            </div>
            <span className="text-xs sm:text-sm font-bold text-white truncate">
              {rumahBelumSetor > 0 
                ? `${rumahBelumSetor} rumah belum setor` 
                : 'Semua rumah sudah setor!'}
            </span>
          </div>

          <button
            type="button"
            onClick={onOpenFinishModal}
            className="px-3.5 sm:px-5 py-2 rounded-2xl bg-amber-600 hover:bg-amber-500 active:bg-amber-700 text-white font-extrabold text-xs sm:text-sm shadow-md transition-all flex items-center space-x-1 sm:space-x-1.5 flex-shrink-0 cursor-pointer"
            id="btn-selesaikan-ronda"
          >
            <span>{isFinished ? 'Lihat Laporan' : 'Selesaikan'}</span>
            <ArrowRight className="w-3.5 h-3.5 sm:w-4 sm:h-4 stroke-[2.5]" />
          </button>
        </div>
      </div>

      {/* Bottom 3 Quick Summary Cards */}
      <div className="grid grid-cols-3 gap-1.5 sm:gap-3 pt-0.5">
        {/* Card 1: Sudah Setor (Green) */}
        <div 
          onClick={() => onCardClick && onCardClick('sudah')}
          className="bg-emerald-50/90 hover:bg-emerald-100/90 border border-emerald-200/80 rounded-2xl p-2 sm:p-3.5 flex items-center justify-between transition-all shadow-xs cursor-pointer group"
          id="card-stat-sudah-setor"
        >
          <div className="flex flex-col sm:flex-row items-center sm:items-center space-x-0 sm:space-x-2.5 min-w-0 w-full sm:w-auto text-center sm:text-left">
            <div className="w-7 h-7 sm:w-9 sm:h-9 rounded-full bg-emerald-600 text-white flex items-center justify-center flex-shrink-0 shadow-xs mb-1 sm:mb-0">
              <Check className="w-3.5 h-3.5 sm:w-4.5 sm:h-4.5 stroke-[3]" />
            </div>
            <div className="min-w-0">
              <div className="text-base sm:text-xl font-black text-emerald-950 leading-tight">
                {jumlahRumahScanned}
              </div>
              <div className="text-[10px] sm:text-xs font-bold text-emerald-700 leading-tight whitespace-nowrap">
                Sudah Setor
              </div>
            </div>
          </div>
          <ChevronRight className="hidden sm:block w-4 h-4 text-emerald-400 group-hover:text-emerald-600 transition-colors shrink-0 ml-1" />
        </div>

        {/* Card 2: Belum Setor (Red/Pink) */}
        <div 
          onClick={() => onCardClick && onCardClick('belum')}
          className="bg-rose-50/90 hover:bg-rose-100/90 border border-rose-200/80 rounded-2xl p-2 sm:p-3.5 flex items-center justify-between transition-all shadow-xs cursor-pointer group"
          id="card-stat-belum-setor"
        >
          <div className="flex flex-col sm:flex-row items-center sm:items-center space-x-0 sm:space-x-2.5 min-w-0 w-full sm:w-auto text-center sm:text-left">
            <div className="w-7 h-7 sm:w-9 sm:h-9 rounded-full bg-rose-500 text-white flex items-center justify-center flex-shrink-0 shadow-xs mb-1 sm:mb-0">
              <Home className="w-3.5 h-3.5 sm:w-4.5 sm:h-4.5 stroke-[2.5]" />
            </div>
            <div className="min-w-0">
              <div className="text-base sm:text-xl font-black text-rose-950 leading-tight">
                {rumahBelumSetor}
              </div>
              <div className="text-[10px] sm:text-xs font-bold text-rose-700 leading-tight whitespace-nowrap">
                Belum Setor
              </div>
            </div>
          </div>
          <ChevronRight className="hidden sm:block w-4 h-4 text-rose-400 group-hover:text-rose-600 transition-colors shrink-0 ml-1" />
        </div>

        {/* Card 3: Total Tagihan (Blue/Sky) */}
        <div 
          onClick={() => onCardClick && onCardClick('total')}
          className="bg-sky-50/90 hover:bg-sky-100/90 border border-sky-200/80 rounded-2xl p-2 sm:p-3.5 flex items-center justify-between transition-all shadow-xs cursor-pointer group"
          id="card-stat-total-tagihan"
        >
          <div className="flex flex-col sm:flex-row items-center sm:items-center space-x-0 sm:space-x-2.5 min-w-0 w-full sm:w-auto text-center sm:text-left">
            <div className="w-7 h-7 sm:w-9 sm:h-9 rounded-full bg-sky-600 text-white flex items-center justify-center flex-shrink-0 shadow-xs mb-1 sm:mb-0">
              <FileText className="w-3.5 h-3.5 sm:w-4.5 sm:h-4.5 stroke-[2.5]" />
            </div>
            <div className="min-w-0">
              <div className="text-base sm:text-xl font-black text-sky-950 leading-tight">
                {totalRumah}
              </div>
              <div className="text-[10px] sm:text-xs font-bold text-sky-700 leading-tight whitespace-nowrap">
                Total Tagihan
              </div>
            </div>
          </div>
          <ChevronRight className="hidden sm:block w-4 h-4 text-sky-400 group-hover:text-sky-600 transition-colors shrink-0 ml-1" />
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

