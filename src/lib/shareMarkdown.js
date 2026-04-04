import { normalizeAnalysisPayload } from '@/lib/ai';

/**
 * Markdown document for ResultMarkdown on the public share page.
 * @param {unknown} analysis
 * @param {(key: string) => string} t
 */
export function buildShareMarkdown(analysis, t) {
  const a = normalizeAnalysisPayload(analysis && typeof analysis === 'object' ? analysis : {});
  const summaryLine = a.summary?.trim() ? a.summary.trim() : t('analysis.noSummary');
  const parts = [`### ${t('card.summaryTitle')}\n\n${summaryLine}`];

  const prosBlock =
    a.pros.length > 0
      ? a.pros.map((p) => `- ${String(p).replace(/\n/g, ' ')}`).join('\n')
      : t('card.dash');
  parts.push(`### ${t('card.positive')}\n\n${prosBlock}`);

  const consBlock =
    a.cons.length > 0
      ? a.cons.map((c) => `- ${String(c).replace(/\n/g, ' ')}`).join('\n')
      : t('card.dash');
  parts.push(`### ${t('card.negative')}\n\n${consBlock}`);

  const risksBlock = a.risks?.trim() ? a.risks.trim() : t('card.dash');
  parts.push(`### ${t('card.risks')}\n\n${risksBlock}`);

  return parts.join('\n\n---\n\n');
}
