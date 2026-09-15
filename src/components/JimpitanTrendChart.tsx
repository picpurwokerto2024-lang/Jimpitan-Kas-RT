import React, { useState, useMemo } from 'react';
import { 
  ResponsiveContainer, 
  AreaChart, 
  Area, 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  Tooltip, 
  CartesianGrid 
} from 'recharts';
import { TrendingUp, BarChart2, Calendar, Sparkles } from 'lucide-react';
import { JimpitanRecord } from '../types';
import { formatRupiah } from '../utils/formatters';

interface JimpitanTrendChartProps {
  allRecords: JimpitanRecord[];
  selectedDate: string;
}

export const JimpitanTrendChart: React.FC<JimpitanTrendChartProps> = ({
  allRecords,
  selectedDate,
}) => {
  const [viewMode, setViewMode] = useState<'monthly' | 'daily'>('monthly');

  // Month names in Indonesian
  const monthNames = [
    'Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun',
    'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'
  ];

  // Current year & month from selectedDate (YYYY-MM-DD)
  const [currYear, currMonth] = selectedDate.split('-');
  const selectedYearMonth = `${currYear}-${currMonth}`;

  // Process monthly data (last 6-12 months)
  const monthlyData = useMemo(() => {
    const map = new Map<string, { total: number; count: number; label: string }>();

    // Sort records by date ascending
    const sorted = [...allRecords].sort((a, b) => a.tanggal.localeCompare(b.tanggal));

    sorted.forEach((r) => {
      if (!r.tanggal) return;
      const parts = r.tanggal.split('-');
      if (parts.length >= 2) {
        const ym = `${parts[0]}-${parts[1]}`;
        const monthIndex = parseInt(parts[1], 10) - 1;
        const shortLabel = `${monthNames[monthIndex] || parts[1]} '${parts[0].slice(2)}`;
        
        const existing = map.get(ym) || { total: 0, count: 0, label: shortLabel };
        map.set(ym, {
          total: existing.total + (r.nominal || 0),
          count: existing.count + 1,
          label: shortLabel,
        });
      }
    });

    // If map is empty, produce fallback months so chart is ready and visually informative
    if (map.size === 0) {
      const now = new Date();
      for (let i = 4; i >= 0; i--) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const y = d.getFullYear();
        const m = String(d.getMonth() + 1).padStart(2, '0');
        const ym = `${y}-${m}`;
        map.set(ym, {
          total: 0,
          count: 0,
          label: `${monthNames[d.getMonth()]} '${String(y).slice(2)}`,
        });
      }
    }

    return Array.from(map.entries()).map(([key, value]) => ({
      key,
      name: value.label,
      total: value.total,
      count: value.count,
    }));
  }, [allRecords]);

  // Process daily data for selected/current month
  const dailyData = useMemo(() => {
    const map = new Map<string, { total: number; count: number }>();

    allRecords
      .filter((r) => r.tanggal.startsWith(selectedYearMonth))
      .forEach((r) => {
        const day = r.tanggal.split('-')[2] || '01';
        const dayNum = parseInt(day, 10);
        const key = `Tgl ${dayNum}`;
        const existing = map.get(key) || { total: 0, count: 0 };
        map.set(key, {
          total: existing.total + (r.nominal || 0),
          count: existing.count + 1,
        });
      });

    // Sort by day number
    return Array.from(map.entries())
      .map(([name, val]) => ({
        name,
        total: val.total,
        count: val.count,
        dayNum: parseInt(name.replace('Tgl ', ''), 10) || 0,
      }))
      .sort((a, b) => a.dayNum - b.dayNum);
  }, [allRecords, selectedYearMonth]);

  const activeData = viewMode === 'monthly' ? monthlyData : dailyData;
  const totalChartSum = activeData.reduce((s, d) => s + d.total, 0);
  const avgChart = activeData.length > 0 ? Math.round(totalChartSum / activeData.length) : 0;

  return (
    <div className="bg-white rounded-3xl border border-sky-100 shadow-sm p-4 sm:p-5 space-y-4" id="chart-tren-jimpitan">
      {/* Header with Title and Mode Switcher */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pb-1 border-b border-stone-100">
        <div className="flex items-center space-x-2.5">
          <div className="w-8 h-8 rounded-xl bg-sky-100 text-sky-600 flex items-center justify-center flex-shrink-0">
            <TrendingUp className="w-4 h-4" />
          </div>
          <div>
            <h3 className="font-extrabold text-stone-900 text-sm sm:text-base leading-tight">
              Tren Pemasukan Jimpitan
            </h3>
            <p className="text-[11px] text-stone-500">
              Visualisasi grafik penarikan kas warga RT
            </p>
          </div>
        </div>

        {/* Mode Toggle Buttons */}
        <div className="flex items-center bg-stone-100 p-1 rounded-xl self-start sm:self-auto border border-stone-200/70">
          <button
            type="button"
            onClick={() => setViewMode('monthly')}
            className={`px-3 py-1 text-xs font-bold rounded-lg transition-all cursor-pointer ${
              viewMode === 'monthly'
                ? 'bg-white text-sky-700 shadow-xs'
                : 'text-stone-600 hover:text-stone-900'
            }`}
            id="btn-chart-mode-monthly"
          >
            Bulanan
          </button>
          <button
            type="button"
            onClick={() => setViewMode('daily')}
            className={`px-3 py-1 text-xs font-bold rounded-lg transition-all cursor-pointer ${
              viewMode === 'daily'
                ? 'bg-white text-sky-700 shadow-xs'
                : 'text-stone-600 hover:text-stone-900'
            }`}
            id="btn-chart-mode-daily"
          >
            Harian Bulan Ini
          </button>
        </div>
      </div>

      {/* Quick Summary Pill Row */}
      <div className="grid grid-cols-2 gap-2.5">
        <div className="bg-sky-50/70 border border-sky-100 rounded-2xl p-2.5">
          <span className="text-[10px] font-extrabold text-stone-500 uppercase tracking-wider block">
            {viewMode === 'monthly' ? 'TOTAL PERIODE INI' : 'TOTAL BULAN INI'}
          </span>
          <span className="text-sm sm:text-base font-extrabold text-sky-700">
            {formatRupiah(totalChartSum)}
          </span>
        </div>
        <div className="bg-stone-50 border border-stone-200/70 rounded-2xl p-2.5">
          <span className="text-[10px] font-extrabold text-stone-500 uppercase tracking-wider block">
            RATA-RATA / {viewMode === 'monthly' ? 'BULAN' : 'HARI'}
          </span>
          <span className="text-sm sm:text-base font-extrabold text-stone-800">
            {formatRupiah(avgChart)}
          </span>
        </div>
      </div>

      {/* Recharts Container */}
      <div className="w-full h-52 sm:h-60 pt-2">
        {activeData.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-stone-400 text-xs text-center p-4 border border-dashed border-stone-200 rounded-2xl">
            <BarChart2 className="w-7 h-7 text-stone-300 mb-1.5" />
            <p className="font-semibold text-stone-600">Belum ada data penarikan untuk grafik.</p>
            <p className="text-[11px] text-stone-400">Data akan otomatis digambar saat jimpitan dicatat.</p>
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart
              data={activeData}
              margin={{ top: 8, right: 8, left: -16, bottom: 0 }}
            >
              <defs>
                <linearGradient id="jimpitanColorGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#0284c7" stopOpacity={0.4} />
                  <stop offset="95%" stopColor="#0284c7" stopOpacity={0.0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
              <XAxis 
                dataKey="name" 
                tick={{ fontSize: 10, fill: '#64748b' }} 
                axisLine={{ stroke: '#cbd5e1' }}
                tickLine={false}
              />
              <YAxis 
                tick={{ fontSize: 9, fill: '#64748b' }} 
                axisLine={false}
                tickLine={false}
                tickFormatter={(val) => val >= 1000 ? `${Math.round(val / 1000)}k` : `${val}`}
              />
              <Tooltip
                content={({ active, payload }) => {
                  if (active && payload && payload.length) {
                    const data = payload[0].payload;
                    return (
                      <div className="bg-stone-900 text-white rounded-xl p-2.5 shadow-lg border border-stone-800 text-xs space-y-1">
                        <p className="font-extrabold text-sky-300">{data.name}</p>
                        <p className="text-white font-bold text-sm">
                          {formatRupiah(data.total)}
                        </p>
                        <p className="text-[10px] text-stone-400">
                          {data.count} kali tarikan jimpitan
                        </p>
                      </div>
                    );
                  }
                  return null;
                }}
              />
              <Area
                type="monotone"
                dataKey="total"
                stroke="#0284c7"
                strokeWidth={2.5}
                fillOpacity={1}
                fill="url(#jimpitanColorGradient)"
                dot={{ r: 3, fill: '#0284c7', strokeWidth: 1.5, stroke: '#ffffff' }}
                activeDot={{ r: 5, fill: '#0369a1', stroke: '#ffffff', strokeWidth: 2 }}
              />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
};
