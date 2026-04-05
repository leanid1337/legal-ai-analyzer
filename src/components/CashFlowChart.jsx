import React, { useMemo } from 'react';
import { Loader2 } from 'lucide-react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

const INCOME_TEAL = '#14b8a6';
const EXPENSES_TEAL = '#14b8a6';
const EXPENSES_OVER_RED = '#ef4444';

function seededJitter(seed, i) {
  const x = Math.sin(seed * 9.123 + i * 47.11) * 31278.5453;
  return x - Math.floor(x);
}

function buildMockCashFlow() {
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const seed = 3.17;
  let baseIn = 4800;
  let baseOut = 3900;
  return months.map((month, i) => {
    const wave = Math.sin((i / 12) * Math.PI * 2) * 420;
    const income = Math.round(
      baseIn + wave + seededJitter(seed, i) * 650 + i * 45
    );
    const expenses = Math.round(
      baseOut + wave * 0.85 + seededJitter(seed + 0.5, i) * 720 - (i % 4) * 80 + i * 38
    );
    baseIn += seededJitter(seed + 1, i) * 40;
    baseOut += seededJitter(seed + 2, i) * 35;
    return { month, income, expenses: Math.max(1200, expenses) };
  });
}

function formatMoney(v) {
  const n = Number(v);
  if (!Number.isFinite(n)) return '—';
  return `$${n.toLocaleString()}`;
}

/**
 * @param {{
 *   active?: boolean;
 *   payload?: Array<{ name?: string; value?: number; dataKey?: string; color?: string }>;
 *   label?: string;
 *   isDark: boolean;
 *   tooltipBg: string;
 *   tooltipBorder: string;
 *   tooltipLabel: string;
 *   labels: { income: string; expenses: string; difference: string };
 * }} props
 */
function CashFlowTooltip({ active, payload, label, isDark, tooltipBg, tooltipBorder, tooltipLabel, labels }) {
  if (!active || !payload?.length) {
    return null;
  }
  let income = 0;
  let expenses = 0;
  for (const p of payload) {
    if (p.dataKey === 'income') income = Number(p.value);
    if (p.dataKey === 'expenses') expenses = Number(p.value);
  }
  const difference = income - expenses;
  const diffColor =
    difference >= 0 ? (isDark ? '#5eead4' : '#0d9488') : isDark ? '#f87171' : '#dc2626';
  const expenseLineColor = expenses > income ? EXPENSES_OVER_RED : EXPENSES_TEAL;

  return (
    <div
      className="rounded-xl px-3 py-2.5 text-sm shadow-lg"
      style={{
        backgroundColor: tooltipBg,
        border: `1px solid ${tooltipBorder}`,
        boxShadow: isDark ? '0 10px 40px -10px rgb(0 0 0 / 0.5)' : '0 10px 40px -10px rgb(15 23 42 / 0.12)',
      }}
    >
      <p className="mb-2 font-semibold" style={{ color: tooltipLabel }}>
        {label}
      </p>
      <div className="space-y-1.5 text-[13px]">
        <div className="flex justify-between gap-6">
          <span style={{ color: tooltipLabel }}>{labels.income}</span>
          <span className="font-medium tabular-nums" style={{ color: INCOME_TEAL }}>
            {formatMoney(income)}
          </span>
        </div>
        <div className="flex justify-between gap-6">
          <span style={{ color: tooltipLabel }}>{labels.expenses}</span>
          <span className="font-medium tabular-nums" style={{ color: expenseLineColor }}>
            {formatMoney(expenses)}
          </span>
        </div>
        <div
          className="mt-2 flex justify-between gap-6 border-t pt-2"
          style={{ borderColor: tooltipBorder }}
        >
          <span style={{ color: tooltipLabel }}>{labels.difference}</span>
          <span className="font-semibold tabular-nums" style={{ color: diffColor }}>
            {difference >= 0 ? '+' : ''}
            {formatMoney(difference)}
          </span>
        </div>
      </div>
    </div>
  );
}

const defaultLabels = {
  income: 'Income',
  expenses: 'Expenses',
  difference: 'Difference',
  avgMonthlyExpense: 'Avg. monthly expense',
};

/**
 * @param {{
 *   className?: string;
 *   height?: number;
 *   variant?: 'light' | 'dark';
 *   data?: Array<{ month: string; income: number; expenses: number }>;
 *   isLoading?: boolean;
 *   labels?: Partial<typeof defaultLabels>;
 * }} props
 */
export default function CashFlowChart({
  className = '',
  height = 300,
  variant = 'light',
  data: dataProp,
  isLoading = false,
  labels: labelsProp,
}) {
  const labels = { ...defaultLabels, ...labelsProp };

  const series = useMemo(() => {
    if (Array.isArray(dataProp) && dataProp.length > 0) {
      return dataProp;
    }
    return buildMockCashFlow();
  }, [dataProp]);

  const avgMonthlyExpense = useMemo(() => {
    if (!series.length) return 0;
    const sum = series.reduce((acc, row) => acc + Number(row.expenses), 0);
    return sum / series.length;
  }, [series]);

  const isDark = variant === 'dark';
  const grid = isDark ? '#334155' : '#e2e8f0';
  const tick = isDark ? '#94a3b8' : '#64748b';
  const axisLine = isDark ? '#475569' : '#cbd5e1';
  const tooltipBg = isDark ? '#1e293b' : '#ffffff';
  const tooltipBorder = isDark ? '#475569' : '#e2e8f0';
  const tooltipLabel = isDark ? '#e2e8f0' : '#475569';
  const legendColor = isDark ? '#cbd5e1' : '#475569';
  const refLineStroke = isDark ? '#fbbf24' : '#d97706';
  const refLabelFill = isDark ? '#fcd34d' : '#b45309';

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
            className={`h-9 w-9 animate-spin ${isDark ? 'text-teal-400' : 'text-teal-600'}`}
            aria-hidden
          />
        </div>
      ) : (
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={series}
            margin={{ top: 8, right: 12, left: 0, bottom: 0 }}
            barCategoryGap="18%"
            barGap={4}
          >
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={grid} />
            <XAxis
              dataKey="month"
              tick={{ fill: tick, fontSize: 11 }}
              tickLine={false}
              axisLine={{ stroke: axisLine }}
            />
            <YAxis
              tick={{ fill: tick, fontSize: 11 }}
              tickLine={false}
              axisLine={false}
              tickFormatter={(v) => (v >= 1000 ? `$${(v / 1000).toFixed(v % 1000 === 0 ? 0 : 1)}k` : `$${v}`)}
            />
            <ReferenceLine
              y={avgMonthlyExpense}
              stroke={refLineStroke}
              strokeDasharray="5 5"
              strokeWidth={1.5}
              strokeOpacity={0.9}
              ifOverflow="extendDomain"
              label={{
                value: labels.avgMonthlyExpense,
                position: 'insideTopRight',
                fill: refLabelFill,
                fontSize: 10,
                fontWeight: 600,
              }}
            />
            <Tooltip
              cursor={{ fill: isDark ? 'rgb(255 255 255 / 0.04)' : 'rgb(15 23 42 / 0.04)' }}
              content={(tooltipProps) => (
                <CashFlowTooltip
                  {...tooltipProps}
                  isDark={isDark}
                  tooltipBg={tooltipBg}
                  tooltipBorder={tooltipBorder}
                  tooltipLabel={tooltipLabel}
                  labels={labels}
                />
              )}
            />
            <Legend
              wrapperStyle={{ paddingTop: 12 }}
              formatter={(value) => <span style={{ color: legendColor, fontSize: 12 }}>{value}</span>}
            />
            <Bar dataKey="income" name={labels.income} fill={INCOME_TEAL} radius={[4, 4, 0, 0]} maxBarSize={36} />
            <Bar dataKey="expenses" name={labels.expenses} radius={[4, 4, 0, 0]} maxBarSize={36}>
              {series.map((entry, index) => (
                <Cell
                  key={`exp-${entry.month}-${index}`}
                  fill={
                    Number(entry.expenses) > Number(entry.income) ? EXPENSES_OVER_RED : EXPENSES_TEAL
                  }
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}
