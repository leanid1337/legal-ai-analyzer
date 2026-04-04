import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { AnimatePresence, motion as Motion } from 'framer-motion';
import {
  Scale,
  Send,
  History,
  LogOut,
  ShieldCheck,
  CircleCheck,
  FileText,
  Copy,
  Paperclip,
  Upload,
  Loader2,
  Trash2,
} from 'lucide-react';
import { supabaseClient } from '../lib/supabase';
import {
  analyzeContract,
  parseStoredAnalysisResult,
  translateAnalysis,
  ANALYSIS_TRANSLATION_LOCALES,
} from '@/lib/ai';
import { generateLegalReport } from '@/utils/pdfGenerator';
import { extractTextFromFile } from '@/utils/fileParser';
import { useLanguage } from '@/context/LanguageContext';
import LanguageSwitcher from '@/components/LanguageSwitcher';

const FILE_ERR_KEYS = {
  INVALID: 'file.invalid',
  UNSUPPORTED_EXT: 'file.unsupportedExt',
  NO_TEXT: 'file.noText',
  DOC_LEGACY: 'file.docLegacy',
  WORD_PARSE: 'file.wordParse',
};

/**
 * @param {string} message
 * @param {(k: string) => string} t
 */
function translateFileError(message, t) {
  if (typeof message !== 'string' || !message.startsWith('FILE_ERROR:')) return message;
  const code = message.slice('FILE_ERROR:'.length).trim();
  const key = FILE_ERR_KEYS[/** @type {keyof typeof FILE_ERR_KEYS} */ (code)];
  return key ? t(key) : message;
}

const listVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.1, delayChildren: 0.08 },
  },
};

const cardVariants = {
  hidden: { opacity: 0, y: 28, filter: 'blur(8px)' },
  visible: {
    opacity: 1,
    y: 0,
    filter: 'blur(0px)',
    transition: { type: 'spring', stiffness: 400, damping: 32, mass: 0.78 },
  },
};

const overlayVariants = {
  initial: { opacity: 0 },
  animate: { opacity: 1, transition: { duration: 0.22, ease: [0.22, 1, 0.36, 1] } },
  exit: { opacity: 0, transition: { duration: 0.18, ease: [0.4, 0, 1, 1] } },
};

const historyItemExit = {
  opacity: 0,
  x: -28,
  scale: 0.97,
  transition: { duration: 0.38, ease: [0.22, 1, 0.36, 1] },
};

const deletePlaqueTransition = { duration: 0.28, ease: [0.22, 1, 0.36, 1] };

/** Show analysis in the model's original (document) language */
const ANALYSIS_VIEW_SOURCE = 'source';

function emptyPanel() {
  return {
    summary: '',
    pros: [],
    cons: [],
    risks: '',
  };
}

function hasExportableAnalysis(a) {
  if (!a) return false;
  const hasSummary = typeof a.summary === 'string' && a.summary.trim().length > 0;
  const hasBody =
    (a.pros && a.pros.length > 0) ||
    (a.cons && a.cons.length > 0) ||
    (typeof a.risks === 'string' && a.risks.trim().length > 0);
  return hasSummary || hasBody;
}

function AnalysisCards({ analysis, t }) {
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

export default function Dashboard({ session }) {
  const { t } = useLanguage();
  const [docText, setDocText] = useState('');
  const [history, setHistory] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(true);
  const [historyError, setHistoryError] = useState(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analyzeError, setAnalyzeError] = useState(null);
  const [panelAnalysis, setPanelAnalysis] = useState(null);
  const [activeRecordId, setActiveRecordId] = useState(null);
  const [pdfExporting, setPdfExporting] = useState(false);
  const [copyFeedback, setCopyFeedback] = useState(false);
  const [fileParsing, setFileParsing] = useState(false);
  const [uploadError, setUploadError] = useState(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const [deletingId, setDeletingId] = useState(null);
  const [pendingDeleteId, setPendingDeleteId] = useState(null);
  const [analysisViewLocale, setAnalysisViewLocale] = useState(ANALYSIS_VIEW_SOURCE);
  const [translationCache, setTranslationCache] = useState(
    /** @type {Record<string, import('@/lib/ai').AnalysisPayload>} */ ({})
  );
  const [translationLoading, setTranslationLoading] = useState(false);
  const [translationError, setTranslationError] = useState(/** @type {string | null} */ (null));
  const translationCacheRef = useRef(translationCache);
  const fileInputRef = useRef(null);

  useEffect(() => {
    translationCacheRef.current = translationCache;
  }, [translationCache]);

  const userId = session?.user?.id;
  const userEmail = session?.user?.email ?? 'User';

  const fetchHistory = useCallback(async () => {
    if (!supabaseClient || !userId) {
      setHistoryLoading(false);
      return;
    }
    setHistoryError(null);
    setHistoryLoading(true);
    const { data, error } = await supabaseClient
      .from('analyzed_docs')
      .select('id, original_text, status, result, created_at')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) {
      setHistoryError(error.message);
      setHistory([]);
    } else {
      setHistory(data ?? []);
    }
    setHistoryLoading(false);
  }, [userId]);

  useEffect(() => {
    fetchHistory();
  }, [fetchHistory]);

  useEffect(() => {
    setAnalysisViewLocale(ANALYSIS_VIEW_SOURCE);
    setTranslationCache({});
    translationCacheRef.current = {};
    setTranslationError(null);
  }, [activeRecordId]);

  const displayAnalysis = useMemo(() => {
    if (!panelAnalysis) return null;
    if (analysisViewLocale === ANALYSIS_VIEW_SOURCE) return panelAnalysis;
    return translationCache[analysisViewLocale] ?? panelAnalysis;
  }, [panelAnalysis, analysisViewLocale, translationCache]);

  const handleAnalysisLocaleChange = useCallback(
    async (value) => {
      setTranslationError(null);
      if (value === ANALYSIS_VIEW_SOURCE) {
        setAnalysisViewLocale(ANALYSIS_VIEW_SOURCE);
        return;
      }
      setAnalysisViewLocale(value);
      if (!panelAnalysis) return;
      if (translationCacheRef.current[value]) return;

      setTranslationLoading(true);
      try {
        const res = await translateAnalysis(
          panelAnalysis,
          /** @type {(typeof ANALYSIS_TRANSLATION_LOCALES)[number]} */ (value)
        );
        if (!res.ok) {
          setTranslationError(`${t('analysis.translateFailed')} ${res.error}`);
          setAnalysisViewLocale(ANALYSIS_VIEW_SOURCE);
          return;
        }
        setTranslationCache((c) => ({ ...c, [value]: res.data }));
      } finally {
        setTranslationLoading(false);
      }
    },
    [panelAnalysis, t]
  );

  function openRecordInMain(row) {
    setPendingDeleteId(null);
    setActiveRecordId(row.id);
    setDocText(row.original_text || '');
    const parsed = parseStoredAnalysisResult(row.result);
    setPanelAnalysis(parsed || emptyPanel());
  }

  function togglePendingDelete(rowId) {
    if (deletingId != null) return;
    setPendingDeleteId((cur) => (cur === rowId ? null : rowId));
  }

  function cancelPendingDelete() {
    setPendingDeleteId(null);
  }

  async function handleConfirmDelete(rowId) {
    if (!supabaseClient || !userId || deletingId != null) return;
    setDeletingId(rowId);
    try {
      const { error } = await supabaseClient
        .from('analyzed_docs')
        .delete()
        .eq('id', rowId)
        .eq('user_id', userId);
      if (error) {
        window.alert(error.message);
        return;
      }
      setPendingDeleteId(null);
      if (activeRecordId === rowId) {
        setActiveRecordId(null);
        setPanelAnalysis(null);
        setDocText('');
      }
      setHistory((prev) => prev.filter((r) => r.id !== rowId));
    } finally {
      setDeletingId(null);
    }
  }

  async function handleLogout() {
    if (!supabaseClient) return;
    await supabaseClient.auth.signOut();
  }

  async function handleCopySummary() {
    if (!displayAnalysis?.summary?.trim()) return;
    try {
      await navigator.clipboard.writeText(displayAnalysis.summary);
      setCopyFeedback(true);
      window.setTimeout(() => setCopyFeedback(false), 2000);
    } catch {
      window.alert(t('clipboard.fail'));
    }
  }

  async function handleExportPdf() {
    if (!hasExportableAnalysis(displayAnalysis) || pdfExporting) return;
    setPdfExporting(true);
    try {
      await generateLegalReport(displayAnalysis);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      window.alert(`${t('pdfFailed')} ${msg}`);
    } finally {
      setPdfExporting(false);
    }
  }

  const processUploadedFile = useCallback(
    async (file) => {
      if (!file || isAnalyzing) return;
      setUploadError(null);
      setFileParsing(true);
      try {
        const text = await extractTextFromFile(file);
        setDocText(text);
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        setUploadError(translateFileError(msg, t));
      } finally {
        setFileParsing(false);
        setIsDragOver(false);
      }
    },
    [isAnalyzing, t]
  );

  function handleFileInputChange(e) {
    const f = e.target.files?.[0];
    if (f) void processUploadedFile(f);
    e.target.value = '';
  }

  function handleDrop(e) {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
    if (isAnalyzing || fileParsing) return;
    const f = e.dataTransfer.files?.[0];
    if (f) void processUploadedFile(f);
  }

  function handleDragOver(e) {
    e.preventDefault();
    e.stopPropagation();
    if (!isAnalyzing && !fileParsing) setIsDragOver(true);
  }

  function handleDragLeave(e) {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
  }

  function handleClearDocument() {
    setDocText('');
    setUploadError(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  }

  async function handleAnalyze(e) {
    e.preventDefault();
    const trimmed = docText.trim();
    if (!trimmed || !supabaseClient || !userId || isAnalyzing) return;

    setAnalyzeError(null);
    setIsAnalyzing(true);
    try {
      const aiResult = await analyzeContract(trimmed);
      if (!aiResult.ok) {
        setAnalyzeError(aiResult.error);
        window.alert(aiResult.error);
        return;
      }

      const resultJson = JSON.stringify(aiResult.data);
      const { data: inserted, error } = await supabaseClient
        .from('analyzed_docs')
        .insert({
          user_id: userId,
          original_text: trimmed,
          status: 'done',
          result: resultJson,
        })
        .select('id')
        .single();

      if (error) {
        const msg = `${t('saveFailed')} ${error.message}`;
        setAnalyzeError(msg);
        window.alert(msg);
        return;
      }

      setPanelAnalysis(aiResult.data);
      setActiveRecordId(inserted?.id ?? null);
      setDocText('');
      await fetchHistory();
    } finally {
      setIsAnalyzing(false);
    }
  }

  return (
    <div className="flex min-h-screen flex-col bg-slate-50 lg:flex-row">
      <aside className="flex w-full shrink-0 flex-col border-b border-slate-800 bg-slate-900 lg:min-h-screen lg:w-[22rem] lg:min-w-[22rem] lg:max-w-[22rem] lg:flex-none lg:border-b-0 lg:border-r">
        <div className="flex items-center justify-between gap-3 border-b border-slate-800 px-5 py-5">
          <div className="flex min-w-0 flex-1 items-center gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-indigo-600 shadow-lg shadow-indigo-900/40">
              <Scale className="h-6 w-6 text-white" strokeWidth={2} />
            </div>
            <div className="min-w-0 shrink-0">
              <p className="whitespace-nowrap text-xs font-medium uppercase tracking-widest text-slate-500">{t('brand.subtitle')}</p>
              <p className="whitespace-nowrap text-lg font-bold tracking-tight text-white">{t('brand.title')}</p>
            </div>
          </div>
          <LanguageSwitcher variant="sidebar" />
        </div>

        <div className="flex min-h-0 flex-1 flex-col px-3 pt-4">
          <div className="mb-2 flex items-center gap-2 px-2 text-slate-400">
            <History className="h-4 w-4 shrink-0" />
            <span className="text-xs font-semibold uppercase tracking-wider">{t('nav.history')}</span>
          </div>
          <div className="max-h-48 flex-1 space-y-1.5 overflow-y-auto overscroll-contain pb-2 lg:max-h-none">
            {historyLoading && (
              <div className="flex items-center justify-center gap-2 py-8 text-slate-500">
                <History className="h-5 w-5 animate-pulse" />
                <span className="text-sm">{t('nav.loading')}</span>
              </div>
            )}
            {!historyLoading && historyError && (
              <p className="rounded-lg bg-red-950/50 px-3 py-2 text-xs text-red-300">{historyError}</p>
            )}
            {!historyLoading && !historyError && history.length === 0 && (
              <div className="rounded-xl border border-dashed border-slate-700 px-3 py-6 text-center">
                <History className="mx-auto mb-2 h-8 w-8 text-slate-600" />
                <p className="text-xs text-slate-500">{t('nav.emptyHistory')}</p>
              </div>
            )}
            {!historyLoading && !historyError && (
              <AnimatePresence mode="popLayout" initial={false}>
                {history.map((row) => {
                  const parsed = parseStoredAnalysisResult(row.result);
                  const summaryLine = parsed?.summary?.trim() ? parsed.summary : t('history.noTitle');
                  const isActive = activeRecordId === row.id;
                  const dateHint = row.created_at
                    ? new Date(row.created_at).toLocaleString(undefined, {
                        dateStyle: 'medium',
                        timeStyle: 'short',
                      })
                    : '';
                  const showPlaque = pendingDeleteId === row.id;
                  return (
                    <Motion.div
                      key={row.id}
                      layout
                      title={dateHint ? `${summaryLine} · ${dateHint}` : summaryLine}
                      initial={{ opacity: 0, x: -14 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={historyItemExit}
                      transition={{ layout: { duration: 0.32, ease: [0.22, 1, 0.36, 1] } }}
                      className={`rounded-xl border px-3 py-2.5 transition-colors ${
                        isActive
                          ? 'border-indigo-500/60 bg-indigo-950/40'
                          : 'border-slate-800 bg-slate-800/40 hover:border-slate-700 hover:bg-slate-800/70'
                      } ${showPlaque ? 'border-red-500/35 ring-1 ring-red-500/20' : ''}`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <p className="line-clamp-2 min-w-0 flex-1 text-xs font-semibold leading-snug text-slate-100">
                          {summaryLine}
                        </p>
                        <div className="flex shrink-0 items-center gap-1">
                          <button
                            type="button"
                            title={t('nav.checkTitle')}
                            onClick={() => openRecordInMain(row)}
                            className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-700/50 text-indigo-300 transition hover:bg-indigo-600/80 hover:text-white"
                          >
                            <CircleCheck className="h-4 w-4" strokeWidth={2.25} />
                          </button>
                          <button
                            type="button"
                            title={t('nav.deleteTitle')}
                            disabled={deletingId === row.id}
                            onClick={() => togglePendingDelete(row.id)}
                            className={`flex h-8 w-8 items-center justify-center rounded-lg text-red-400 transition hover:bg-red-950/70 hover:text-red-300 disabled:pointer-events-none disabled:opacity-45 ${
                              showPlaque ? 'bg-red-950/50 ring-1 ring-red-500/40' : 'bg-slate-700/50'
                            }`}
                          >
                            <Trash2 className="h-4 w-4" strokeWidth={2.25} />
                          </button>
                        </div>
                      </div>
                      <AnimatePresence initial={false}>
                        {showPlaque && (
                          <Motion.div
                            key="delete-plaque"
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            transition={deletePlaqueTransition}
                            className="overflow-hidden"
                          >
                            <div className="mt-2.5 border-t border-red-500/25 pt-2.5">
                              <p className="text-[11px] leading-snug text-red-100/90">{t('history.deleteConfirm')}</p>
                              <div className="mt-2.5 flex flex-wrap justify-end gap-2">
                                <button
                                  type="button"
                                  disabled={deletingId === row.id}
                                  onClick={cancelPendingDelete}
                                  className="rounded-lg border border-slate-600/80 bg-slate-800/80 px-3 py-1.5 text-[11px] font-semibold text-slate-200 transition hover:border-slate-500 hover:bg-slate-700/80 disabled:pointer-events-none disabled:opacity-50"
                                >
                                  {t('history.deleteCancel')}
                                </button>
                                <button
                                  type="button"
                                  disabled={deletingId === row.id}
                                  onClick={() => void handleConfirmDelete(row.id)}
                                  className="inline-flex min-h-8 min-w-[4.5rem] items-center justify-center rounded-lg bg-red-600 px-3 py-1.5 text-[11px] font-semibold text-white shadow-sm transition hover:bg-red-500 disabled:pointer-events-none disabled:opacity-60"
                                >
                                  {deletingId === row.id ? (
                                    <Loader2 className="h-4 w-4 animate-spin" strokeWidth={2.25} />
                                  ) : (
                                    t('history.deleteSubmit')
                                  )}
                                </button>
                              </div>
                            </div>
                          </Motion.div>
                        )}
                      </AnimatePresence>
                    </Motion.div>
                  );
                })}
              </AnimatePresence>
            )}
          </div>
        </div>

        <div className="mt-auto border-t border-slate-800 p-3">
          <p className="mb-2 truncate px-2 text-xs text-slate-500" title={userEmail}>
            {userEmail}
          </p>
          <button
            type="button"
            onClick={handleLogout}
            className="flex w-full items-center justify-center gap-2 rounded-xl border border-slate-700 bg-slate-800/50 py-2.5 text-sm font-medium text-slate-200 transition hover:border-slate-600 hover:bg-slate-800"
          >
            <LogOut className="h-4 w-4" />
            {t('nav.logout')}
          </button>
        </div>
      </aside>

      <main className="relative flex min-h-[100dvh] flex-1 flex-col lg:min-h-0">
        <AnimatePresence>
          {isAnalyzing && (
            <Motion.div
              className="absolute inset-0 z-20 flex items-center justify-center bg-slate-900/25 px-4 backdrop-blur-[10px]"
              variants={overlayVariants}
              initial="initial"
              animate="animate"
              exit="exit"
            >
              <Motion.div
                className="relative w-full max-w-sm rounded-3xl border border-white/50 bg-white/85 p-10 shadow-2xl shadow-indigo-900/15 ring-1 ring-slate-200/80"
                initial={{ scale: 0.94, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ type: 'spring', stiffness: 320, damping: 28 }}
              >
                <div className="relative mx-auto flex h-24 w-24 items-center justify-center">
                  <Motion.div
                    className="relative flex h-[4.5rem] w-[4.5rem] items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-600 to-slate-900 shadow-xl"
                    animate={{ scale: [1, 1.06, 1] }}
                    transition={{ repeat: Infinity, duration: 2, ease: [0.4, 0, 0.2, 1] }}
                  >
                    <Scale className="h-10 w-10 text-white" strokeWidth={1.5} />
                  </Motion.div>
                  <Motion.div
                    className="absolute -inset-1 rounded-[1.15rem] border-2 border-indigo-400/40"
                    animate={{ opacity: [0.35, 0.9, 0.35], scale: [1, 1.04, 1] }}
                    transition={{ repeat: Infinity, duration: 2.2, ease: 'easeInOut' }}
                  />
                </div>
                <p className="mt-8 text-center text-[15px] font-semibold tracking-tight text-slate-800">{t('loading.main')}</p>
                <p className="mt-1 text-center text-xs text-slate-500">{t('loading.sub')}</p>
                <div className="mt-6 flex justify-center gap-1.5">
                  {[0, 1, 2, 3, 4].map((i) => (
                    <Motion.span
                      key={i}
                      className="h-1.5 w-1.5 rounded-full bg-indigo-500"
                      animate={{ opacity: [0.2, 1, 0.2], y: [0, -4, 0] }}
                      transition={{
                        repeat: Infinity,
                        duration: 0.9,
                        delay: i * 0.12,
                        ease: 'easeInOut',
                      }}
                    />
                  ))}
                </div>
                <Motion.div
                  className="mx-auto mt-6 h-1 w-full max-w-[200px] overflow-hidden rounded-full bg-slate-200"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.2 }}
                >
                  <Motion.div
                    className="h-full w-1/3 rounded-full bg-gradient-to-r from-indigo-500 to-indigo-700"
                    animate={{ x: ['-120%', '280%'] }}
                    transition={{ repeat: Infinity, duration: 1.25, ease: [0.4, 0, 0.2, 1] }}
                  />
                </Motion.div>
              </Motion.div>
            </Motion.div>
          )}
        </AnimatePresence>

        <header className="relative z-10 border-b border-slate-200/80 bg-white/90 px-4 py-4 backdrop-blur-sm sm:px-8 sm:py-5">
          <div className="mx-auto max-w-4xl">
            <h1 className="text-xl font-bold tracking-tight text-slate-900 sm:text-2xl">{t('doc.title')}</h1>
            <p className="mt-1 text-sm text-slate-500">{t('doc.subtitle')}</p>
          </div>
        </header>

        <div className="relative z-0 flex flex-1 flex-col overflow-auto px-4 py-6 sm:px-8 sm:py-8">
          <div className="mx-auto w-full max-w-4xl">
            <form onSubmit={handleAnalyze} className="flex flex-col gap-4">
              <label className="sr-only" htmlFor="doc-input">
                {t('doc.title')}
              </label>

              <input
                ref={fileInputRef}
                id="contract-file-input"
                type="file"
                accept=".pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                className="sr-only"
                tabIndex={-1}
                onChange={handleFileInputChange}
                disabled={isAnalyzing || fileParsing}
              />

              <div
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    if (!isAnalyzing && !fileParsing) fileInputRef.current?.click();
                  }
                }}
                onClick={() => {
                  if (!isAnalyzing && !fileParsing) fileInputRef.current?.click();
                }}
                onDrop={handleDrop}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                className={`group relative cursor-pointer rounded-2xl border-2 border-dashed px-4 py-8 text-center transition ${
                  isDragOver
                    ? 'border-indigo-500 bg-indigo-100/70 shadow-inner shadow-indigo-500/10'
                    : 'border-slate-300/90 bg-slate-50/80 hover:border-indigo-400 hover:bg-indigo-50/50'
                } ${isAnalyzing || fileParsing ? 'pointer-events-none opacity-60' : ''}`}
              >
                <div className="mx-auto flex max-w-md flex-col items-center gap-3">
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-white shadow-sm ring-1 ring-slate-200/80 transition group-hover:bg-indigo-50 group-hover:ring-indigo-200/60">
                    {fileParsing ? (
                      <Loader2 className="h-6 w-6 animate-spin text-indigo-600" aria-hidden />
                    ) : (
                      <Paperclip className="h-6 w-6 text-indigo-600 transition group-hover:scale-105" aria-hidden />
                    )}
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-slate-800">{fileParsing ? t('doc.extracting') : t('doc.upload')}</p>
                    <p className="mt-1 flex items-center justify-center gap-1.5 text-xs text-slate-500">
                      <Upload className="h-3.5 w-3.5 shrink-0 text-indigo-500" aria-hidden />
                      {t('doc.uploadHint')}
                    </p>
                    <p className="mt-2 text-[11px] text-slate-400">{t('doc.uploadFormats')}</p>
                  </div>
                </div>
              </div>

              {uploadError && (
                <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
                  <p className="font-medium">{t('file.label')}</p>
                  <p className="mt-1">{uploadError}</p>
                </div>
              )}

              <div className="flex flex-wrap items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={handleClearDocument}
                  disabled={isAnalyzing || fileParsing || (!docText && !uploadError)}
                  className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-600 transition hover:border-slate-300 hover:bg-slate-50 disabled:pointer-events-none disabled:opacity-40"
                >
                  {t('doc.clear')}
                </button>
              </div>

              <textarea
                id="doc-input"
                value={docText}
                onChange={(e) => setDocText(e.target.value)}
                placeholder={t('doc.placeholder')}
                rows={12}
                disabled={isAnalyzing || fileParsing}
                className="min-h-[240px] w-full resize-y rounded-2xl border border-slate-200/90 bg-white px-5 py-4 font-doc font-light text-[calc(0.875rem*1.3)] leading-[calc(1.625*1.3)] text-slate-800 shadow-sm shadow-slate-200/50 outline-none ring-slate-200/80 transition placeholder:text-slate-400 focus:border-indigo-300 focus:ring-4 focus:ring-indigo-500/15 disabled:cursor-not-allowed disabled:opacity-60"
              />

              {analyzeError && (
                <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                  <p className="font-medium">{t('error.title')}</p>
                  <p className="mt-1 whitespace-pre-wrap">{analyzeError}</p>
                </div>
              )}

              <div className="flex flex-wrap items-center gap-3">
                <button
                  type="submit"
                  disabled={isAnalyzing || !docText.trim()}
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-indigo-600 px-6 py-3 text-sm font-semibold text-white shadow-md shadow-indigo-600/25 transition hover:bg-indigo-500 disabled:pointer-events-none disabled:opacity-50"
                >
                  {isAnalyzing ? (
                    <>
                      <Send className="h-4 w-4 animate-pulse" />
                      {t('doc.analyzing')}
                    </>
                  ) : (
                    <>
                      <Send className="h-4 w-4" />
                      {t('doc.analyze')}
                    </>
                  )}
                </button>
                <span className="flex items-center gap-1.5 text-xs text-slate-500">
                  <ShieldCheck className="h-3.5 w-3.5 text-emerald-600" />
                  {t('doc.secureNote')}
                </span>
              </div>
            </form>

            <AnimatePresence mode="wait">
              {panelAnalysis && displayAnalysis && (
                <Motion.div
                  key={`${activeRecordId ?? 'draft'}-${analysisViewLocale}`}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0, transition: { duration: 0.15 } }}
                  transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
                >
                  <div className="mt-8 flex flex-col gap-4 sm:mt-10 lg:flex-row lg:items-start lg:justify-between lg:gap-6">
                    <div className="min-w-0 flex-1 space-y-3">
                      <div>
                        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">{t('analysis.outputLabel')}</p>
                        <p className="mt-0.5 text-sm font-medium text-slate-600">{t('analysis.outputSub')}</p>
                      </div>
                      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-3">
                        <label htmlFor="analysis-lang-select" className="shrink-0 text-xs font-medium text-slate-500">
                          {t('analysis.translateLabel')}
                        </label>
                        <div className="flex flex-wrap items-center gap-2">
                          <select
                            id="analysis-lang-select"
                            value={analysisViewLocale}
                            onChange={(e) => void handleAnalysisLocaleChange(e.target.value)}
                            disabled={translationLoading || !hasExportableAnalysis(panelAnalysis)}
                            className="min-w-[12rem] rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-800 shadow-sm outline-none transition focus:border-indigo-400 focus:ring-2 focus:ring-indigo-500/20 disabled:cursor-not-allowed disabled:opacity-50"
                          >
                            <option value={ANALYSIS_VIEW_SOURCE}>{t('analysis.originalLanguage')}</option>
                            {ANALYSIS_TRANSLATION_LOCALES.map((loc) => (
                              <option key={loc} value={loc}>
                                {t(`analysis.lang.${loc}`)}
                              </option>
                            ))}
                          </select>
                          {translationLoading && (
                            <span className="inline-flex items-center gap-1.5 text-xs text-indigo-600">
                              <Loader2 className="h-4 w-4 animate-spin" strokeWidth={2.25} aria-hidden />
                              {t('analysis.translating')}
                            </span>
                          )}
                        </div>
                      </div>
                      {translationError && <p className="text-xs leading-snug text-red-600">{translationError}</p>}
                    </div>
                    <div className="flex shrink-0 flex-wrap items-center gap-2 lg:justify-end">
                      <button
                        type="button"
                        title={t('analysis.copySummary')}
                        onClick={handleCopySummary}
                        disabled={!displayAnalysis?.summary?.trim()}
                        className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm font-semibold text-slate-700 shadow-sm transition hover:border-indigo-200 hover:bg-indigo-50/80 hover:text-indigo-900 active:scale-[0.99] disabled:pointer-events-none disabled:opacity-40"
                      >
                        <Copy className="h-4 w-4 shrink-0" />
                        {copyFeedback ? t('analysis.copied') : t('analysis.copySummary')}
                      </button>
                      {hasExportableAnalysis(displayAnalysis) && (
                        <>
                          <span className="hidden text-[11px] text-slate-400 sm:inline" title={t('analysis.exportHint')}>
                            {t('analysis.exportHint')}
                          </span>
                          <button
                            type="button"
                            title={t('analysis.downloadPdf')}
                            disabled={pdfExporting}
                            onClick={handleExportPdf}
                            className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white shadow-md shadow-indigo-600/30 transition hover:bg-indigo-500 hover:shadow-lg hover:shadow-indigo-600/35 active:scale-[0.99] disabled:pointer-events-none disabled:opacity-55"
                          >
                            <FileText className="h-4 w-4 shrink-0" />
                            {pdfExporting ? t('analysis.preparingPdf') : t('analysis.downloadPdf')}
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                  <AnalysisCards analysis={displayAnalysis} t={t} />
                </Motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </main>
    </div>
  );
}
