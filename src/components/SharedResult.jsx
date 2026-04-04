import React, { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { Scale, Loader2 } from 'lucide-react';
import { supabaseClient, supabaseConfigured } from '@/lib/supabase';
import { parseStoredAnalysisResult } from '@/lib/ai';
import { buildShareMarkdown } from '@/lib/shareMarkdown';
import ResultMarkdown from '@/components/ResultMarkdown';
import LanguageSwitcher from '@/components/LanguageSwitcher';
import { useLanguage } from '@/context/LanguageContext';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export default function SharedResult() {
  const { id } = useParams();
  const { t } = useLanguage();
  const [loading, setLoading] = useState(true);
  const [errorKey, setErrorKey] = useState(/** @type {string | null} */ (null));
  const [errorDetail, setErrorDetail] = useState(/** @type {string | null} */ (null));
  const [markdown, setMarkdown] = useState(/** @type {string | null} */ (null));

  useEffect(() => {
    let cancelled = false;

    async function run() {
      if (!supabaseConfigured || !supabaseClient) {
        setLoading(false);
        setErrorKey('share.configRequired');
        return;
      }

      if (!id || !UUID_RE.test(id)) {
        setLoading(false);
        setErrorKey('share.notFound');
        return;
      }

      const { data, error } = await supabaseClient
        .from('analyses')
        .select('result')
        .eq('id', id)
        .maybeSingle();

      if (cancelled) return;

      if (error) {
        setLoading(false);
        setErrorKey('share.loadError');
        setErrorDetail(error.message);
        return;
      }

      if (!data?.result) {
        setLoading(false);
        setErrorKey('share.notFound');
        return;
      }

      const parsed = parseStoredAnalysisResult(data.result);
      if (!parsed) {
        setLoading(false);
        setErrorKey('share.notFound');
        return;
      }

      setMarkdown(buildShareMarkdown(parsed, t));
      setLoading(false);
      setErrorKey(null);
      setErrorDetail(null);
    }

    void run();
    return () => {
      cancelled = true;
    };
  }, [id, t]);

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-100 to-slate-200/90">
      <header className="border-b border-slate-200/80 bg-white/95 shadow-sm">
        <div className="mx-auto flex max-w-4xl items-center justify-between gap-4 px-4 py-4 sm:px-6">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-indigo-600 shadow-md shadow-indigo-900/25">
              <Scale className="h-5 w-5 text-white" strokeWidth={2} />
            </div>
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-500">{t('brand.subtitle')}</p>
              <p className="text-base font-bold tracking-tight text-slate-900">{t('share.pageTitle')}</p>
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-2 sm:gap-3">
            <LanguageSwitcher variant="light" />
            <Link
              to="/"
              className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 shadow-sm transition hover:border-indigo-200 hover:bg-indigo-50 hover:text-indigo-900"
            >
              {t('share.openApp')}
            </Link>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-4xl px-4 py-10 sm:px-6 sm:py-14">
        {loading && (
          <div className="flex flex-col items-center justify-center gap-3 py-20 text-slate-600">
            <Loader2 className="h-10 w-10 animate-spin text-indigo-600" aria-hidden />
            <p className="text-sm font-medium">{t('nav.loading')}</p>
          </div>
        )}

        {!loading && errorKey && (
          <div className="rounded-2xl border border-amber-200 bg-amber-50 px-6 py-8 text-center shadow-sm">
            <p className="text-lg font-semibold text-amber-950">{t(errorKey)}</p>
            {errorDetail && <p className="mt-2 text-sm text-amber-900/80">{errorDetail}</p>}
          </div>
        )}

        {!loading && !errorKey && markdown && (
          <article className="rounded-2xl border border-slate-200/90 bg-white p-6 shadow-lg shadow-slate-300/40 ring-1 ring-slate-200/60 sm:p-8">
            <p className="mb-6 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">{t('analysis.outputLabel')}</p>
            <ResultMarkdown className="text-slate-800 [&_h3]:text-slate-900 [&_h3]:text-base">{markdown}</ResultMarkdown>
            <p className="mt-10 border-t border-slate-100 pt-6 text-center text-xs leading-relaxed text-slate-500">{t('share.disclaimer')}</p>
          </article>
        )}
      </main>
    </div>
  );
}
