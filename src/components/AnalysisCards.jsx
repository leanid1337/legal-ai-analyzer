import React from 'react';
import { motion as Motion } from 'framer-motion';

const listVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.1, delayChildren: 0.08 },
  },
};

const cardVariants = {
  hidden: { opacity: 0, y: 12 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { type: 'spring', stiffness: 520, damping: 36, mass: 0.65 },
  },
};

/**
 * @param {{ analysis: import('@/lib/ai').AnalysisPayload; t: (k: string) => string }} props
 */
export default function AnalysisCards({ analysis, t }) {
  const { summary, pros, cons, risks } = analysis;
  const summaryDisplay = summary?.trim() ? summary : t('analysis.noSummary');

  return (
    <Motion.div className="mt-4 space-y-4" variants={listVariants} initial="hidden" animate="visible">
      <Motion.div
        variants={cardVariants}
        className="rounded-2xl border border-slate-200/80 border-l-[5px] border-l-indigo-600 bg-gradient-to-br from-slate-50 via-white to-indigo-50/50 p-5 shadow-md shadow-slate-200/50 ring-1 ring-slate-200/60"
      >
        <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-indigo-600">{t('card.summaryTitle')}</p>
        <h2 className="mt-2 text-lg font-bold leading-snug tracking-tight text-slate-800 sm:text-xl">{summaryDisplay}</h2>
      </Motion.div>

      <Motion.div
        variants={cardVariants}
        className="rounded-2xl border-2 border-emerald-600/40 bg-emerald-50/95 p-5 shadow-md shadow-emerald-900/5"
      >
        <p className="text-sm font-bold tracking-tight text-emerald-900">{t('card.positive')}</p>
        {pros.length === 0 ? (
          <p className="mt-2 text-sm text-emerald-800/70">{t('card.dash')}</p>
        ) : (
          <ul className="mt-3 list-disc space-y-1.5 pl-5 text-sm leading-relaxed text-emerald-950">
            {pros.map((item, i) => (
              <li key={i}>{item}</li>
            ))}
          </ul>
        )}
      </Motion.div>

      <Motion.div
        variants={cardVariants}
        className="rounded-2xl border-2 border-amber-500/45 bg-amber-50/95 p-5 shadow-md shadow-amber-900/5"
      >
        <p className="text-sm font-bold tracking-tight text-amber-950">{t('card.negative')}</p>
        {cons.length === 0 ? (
          <p className="mt-2 text-sm text-amber-900/70">{t('card.dash')}</p>
        ) : (
          <ul className="mt-3 list-disc space-y-1.5 pl-5 text-sm leading-relaxed text-amber-950">
            {cons.map((item, i) => (
              <li key={i}>{item}</li>
            ))}
          </ul>
        )}
      </Motion.div>

      <Motion.div
        variants={cardVariants}
        className="rounded-2xl border-2 border-red-600/50 bg-red-50/95 p-5 shadow-lg shadow-red-900/10 ring-1 ring-red-200/40"
      >
        <p className="text-sm font-bold tracking-tight text-red-950">{t('card.risks')}</p>
        <p className="mt-3 whitespace-pre-wrap text-sm leading-relaxed text-red-950">{risks?.trim() ? risks : t('card.dash')}</p>
      </Motion.div>
    </Motion.div>
  );
}
