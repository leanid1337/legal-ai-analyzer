import React from 'react';
import { motion as Motion } from 'framer-motion';
import { Lightbulb, Scale, ShieldAlert, Sparkles } from 'lucide-react';

const insightIcons = [Lightbulb, Scale, ShieldAlert];

const statusStyles = {
  green: {
    ring: 'ring-emerald-500/40',
    dot: 'bg-emerald-500 shadow-emerald-500/50',
    labelKey: 'agent.statusGreen',
    card: 'border-emerald-200/90 bg-gradient-to-br from-emerald-50/90 via-white to-white',
  },
  yellow: {
    ring: 'ring-amber-500/40',
    dot: 'bg-amber-500 shadow-amber-500/50',
    labelKey: 'agent.statusYellow',
    card: 'border-amber-200/90 bg-gradient-to-br from-amber-50/90 via-white to-white',
  },
  red: {
    ring: 'ring-red-500/40',
    dot: 'bg-red-500 shadow-red-500/50',
    labelKey: 'agent.statusRed',
    card: 'border-red-200/90 bg-gradient-to-br from-red-50/90 via-white to-white',
  },
};

/**
 * @param {{ t: (k: string) => string }} props
 */
function AgentSkeleton({ t }) {
  return (
    <div className="space-y-4" aria-busy="true" aria-live="polite">
      <div className="flex items-center gap-2 text-indigo-600">
        <Sparkles className="h-4 w-4 shrink-0 animate-pulse" aria-hidden />
        <span className="text-xs font-semibold tracking-wide">{t('agent.analyzingSkeleton')}</span>
      </div>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div className="space-y-3 rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm">
          <div className="h-3 w-24 animate-pulse rounded-full bg-slate-200" />
          <div className="h-3 w-16 animate-pulse rounded-full bg-slate-200" />
          <div className="h-16 w-full animate-pulse rounded-xl bg-slate-100" />
        </div>
        <div className="space-y-2 rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm">
          <div className="h-3 w-28 animate-pulse rounded-full bg-slate-200" />
          {[0, 1, 2].map((i) => (
            <div key={i} className="flex gap-2">
              <div className="mt-0.5 h-8 w-8 shrink-0 animate-pulse rounded-lg bg-slate-100" />
              <div className="h-10 flex-1 animate-pulse rounded-lg bg-slate-100" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/**
 * @param {{
 *   analysis: import('@/lib/ai').AnalysisPayload | null;
 *   isLoading?: boolean;
 *   t: (k: string) => string;
 * }} props
 */
export default function AnalysisAgentPanel({ analysis, isLoading = false, t }) {
  if (isLoading) {
    return <AgentSkeleton t={t} />;
  }

  if (!analysis) {
    return null;
  }

  const status = analysis.status in statusStyles ? analysis.status : 'yellow';
  const st = statusStyles[status];
  const summaryText = analysis.summary?.trim() ? analysis.summary : t('analysis.noSummary');
  const insights = Array.isArray(analysis.insights) ? analysis.insights : [];

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2 lg:gap-5">
        <Motion.div
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.25 }}
          className={`rounded-2xl border p-5 shadow-md ring-2 ${st.ring} ${st.card}`}
        >
          <div className="flex items-start gap-3">
            <div className={`mt-1 h-3.5 w-3.5 shrink-0 rounded-full shadow-md ${st.dot}`} aria-hidden />
            <div className="min-w-0 flex-1">
              <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-500">{t('agent.verdict')}</p>
              <p className="mt-1 text-xs font-semibold text-slate-700">{t(st.labelKey)}</p>
              <p className="mt-3 text-sm font-medium leading-relaxed text-slate-800">{summaryText}</p>
            </div>
          </div>
        </Motion.div>

        <Motion.div
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.25, delay: 0.05 }}
          className="rounded-2xl border border-slate-200/90 bg-white p-5 shadow-md ring-1 ring-slate-200/60"
        >
          <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-indigo-600">{t('agent.insightsTitle')}</p>
          <ul className="mt-3 space-y-3">
            {[0, 1, 2].map((i) => {
              const text = insights[i]?.trim() || t('card.dash');
              const Icon = insightIcons[i] ?? Lightbulb;
              return (
                <li key={i} className="flex gap-3">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600 ring-1 ring-indigo-100">
                    <Icon className="h-4 w-4" strokeWidth={2} aria-hidden />
                  </div>
                  <p className="min-w-0 flex-1 pt-1 text-sm leading-relaxed text-slate-700">{text}</p>
                </li>
              );
            })}
          </ul>
        </Motion.div>
      </div>
    </div>
  );
}
