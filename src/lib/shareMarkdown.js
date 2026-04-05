import { normalizeAnalysisPayload } from '@/lib/ai';

/**
 * Markdown document for ResultMarkdown on the public share page.
 * @param {unknown} analysis
 * @param {(key: string) => string} t
 */
export function buildShareMarkdown(analysis, t) {
  const a = normalizeAnalysisPayload(analysis && typeof analysis === 'object' ? analysis : {});
  const summaryLine = a.summary?.trim() ? a.summary.trim() : t('analysis.noSummary');
  const riskLabel =
    a.risk_level === 'low'
      ? t('dashboard.riskLow')
      : a.risk_level === 'high'
        ? t('dashboard.riskHigh')
        : t('dashboard.riskMedium');

  const parts = [
    `### ${t('card.summaryTitle')}\n\n${summaryLine}`,
    `### ${t('dashboard.riskMeter')}\n\n**${riskLabel}**`,
  ];

  const posBlock =
    a.positive.length > 0
      ? a.positive.map((p, i) => `${i + 1}. ${String(p).replace(/\n/g, ' ')}`).join('\n')
      : t('card.dash');
  parts.push(`### ${t('dashboard.positiveTitle')}\n\n${posBlock}`);

  const negBlock =
    a.negative.length > 0
      ? a.negative.map((p, i) => `${i + 1}. ${String(p).replace(/\n/g, ' ')}`).join('\n')
      : t('card.dash');
  parts.push(`### ${t('dashboard.negativesSub')}\n\n${negBlock}`);

  const anoBlock =
    a.anomalies.length > 0
      ? a.anomalies.map((p, i) => `${i + 1}. ${String(p).replace(/\n/g, ' ')}`).join('\n')
      : t('card.dash');
  parts.push(`### ${t('dashboard.anomaliesSub')}\n\n${anoBlock}`);

  return parts.join('\n\n---\n\n');
}
