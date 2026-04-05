import React, { useId, useMemo } from 'react';
import { Loader2 } from 'lucide-react';
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

/** Детерминированный «шум» для стабильного SSR/рендера без скачков. */
function seededJitter(seed, i) {
  const x = Math.sin(seed * 12.9898 + i * 78.233) * 43758.5453;
  return x - Math.floor(x);
}

function buildMockSeries() {
  const labels = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const seed = 7.31;
  let balance = 2850;
  return labels.map((time, i) => {
    const growth = 380 + i * 95 + seededJitter(seed, i) * 220;
    const dip = i === 5 || i === 9 ? -180 * seededJitter(seed + 1, i) : 0;
    balance = Math.round(balance + growth + dip);
    return { time, balance };
  });
}

/**
 * @param {{
 *   className?: string;
 *   height?: number;
 *   variant?: 'light' | 'dark';
 *   data?: Array<{ time: string; balance: number }>;
 *   isLoading?: boolean;
 * }} props
 */
export default function BalanceChart({
  className = '',
  height = 280,
  variant = 'light',
  data: dataProp,
  isLoading = false,
}) {
  const series = useMemo(() => {
    if (Array.isArray(dataProp) && dataProp.length > 0) {
      return dataProp;
    }
    return buildMockSeries();
  }, [dataProp]);

  const uid = useId().replace(/:/g, '');
  const gradId = `balanceFill-${uid}`;
  const isDark = variant === 'dark';
  const grid = isDark ? '#334155' : '#e2e8f0';
  const tick = isDark ? '#94a3b8' : '#64748b';
  const axisLine = isDark ? '#475569' : '#cbd5e1';
  const tooltipBg = isDark ? '#1e293b' : '#ffffff';
  const tooltipBorder = isDark ? '#475569' : '#e2e8f0';
  const tooltipLabel = isDark ? '#e2e8f0' : '#475569';
  const areaStroke = isDark ? '#818cf8' : '#4f46e5';
  const activeDotStroke = isDark ? '#0f172a' : '#fff';

  return (
    <div className={className} style={{ width: '100%', height }}>
      {isLoading ? (
        <div
          className={`flex h-full w-full items-center justify-center rounded-lg border border-dashed ${isDark ? 'border-slate-600 bg-slate-950/40' : 'border-slate-200 bg-slate-50'}`}
          role="status"
          aria-live="polite"
          aria-busy="true"
        >
          <Loader2
            className={`h-9 w-9 animate-spin ${isDark ? 'text-indigo-400' : 'text-indigo-600'}`}
            aria-hidden
          />
        </div>
      ) : (
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={series} margin={{ top: 8, right: 8, left: 4, bottom: 4 }}>
            <defs>
              <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#6366f1" stopOpacity={isDark ? 0.55 : 0.45} />
                <stop offset="45%" stopColor="#3b82f6" stopOpacity={isDark ? 0.28 : 0.2} />
                <stop offset="100%" stopColor="#1d4ed8" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={grid} />
            <XAxis
              dataKey="time"
              tick={{ fill: tick, fontSize: 11 }}
              tickLine={false}
              axisLine={{ stroke: axisLine }}
              tickMargin={4}
            />
            <YAxis
              dataKey="balance"
              width={52}
              tick={{ fill: tick, fontSize: 11 }}
              tickLine={false}
              axisLine={false}
              tickMargin={4}
              tickFormatter={(v) =>
                v >= 1000 ? `$${(v / 1000).toFixed(v % 1000 === 0 ? 0 : 1)}k` : `$${v}`
              }
            />
            <Tooltip
              contentStyle={{
                borderRadius: '0.75rem',
                border: `1px solid ${tooltipBorder}`,
                backgroundColor: tooltipBg,
                boxShadow: isDark
                  ? '0 10px 40px -10px rgb(0 0 0 / 0.5)'
                  : '0 10px 40px -10px rgb(15 23 42 / 0.15)',
              }}
              labelStyle={{ color: tooltipLabel, fontWeight: 600 }}
              itemStyle={{ color: isDark ? '#c7d2fe' : '#4f46e5' }}
              formatter={(value) => [`$${Number(value).toLocaleString()}`, 'Balance']}
              labelFormatter={(label) => `Time: ${label}`}
            />
            <Area
              type="monotone"
              dataKey="balance"
              name="Balance"
              stroke={areaStroke}
              strokeWidth={2}
              fill={`url(#${gradId})`}
              fillOpacity={1}
              dot={false}
              activeDot={{ r: 4, strokeWidth: 2, stroke: activeDotStroke, fill: areaStroke }}
            />
          </AreaChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}
