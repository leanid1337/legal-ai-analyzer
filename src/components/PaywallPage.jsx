import React, { useEffect, useState } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { Scale } from 'lucide-react';
import { supabaseClient, supabaseConfigured, supabaseInitError } from '@/lib/supabase';
import { logUserEvent } from '@/lib/userEvents';
import { useLanguage } from '@/context/LanguageContext';
import LanguageSwitcher from '@/components/LanguageSwitcher';

/** @typedef {'starter' | 'pro' | 'elite'} PlanId */

function FeatureList({ keys, t }) {
  return (
    <ul className="space-y-2.5 text-left text-xs font-medium leading-snug text-slate-600 sm:text-sm">
      {keys.map((key) => (
        <li key={key} className="flex gap-2">
          <span className="shrink-0 text-slate-400" aria-hidden>
            *
          </span>
          <span>{t(key)}</span>
        </li>
      ))}
    </ul>
  );
}

/**
 * @param {{
 *   id: PlanId,
 *   selected: PlanId | null,
 *   onSelect: (id: PlanId) => void,
 *   headerClass: string,
 *   title: React.ReactNode,
 *   featureKeys: string[],
 *   priceButtonClass: string,
 *   priceLabelKey: string,
 *   t: (k: string) => string,
 * }} props
 */
function PlanCard({ id, selected, onSelect, headerClass, title, featureKeys, priceButtonClass, priceLabelKey, t }) {
  const isSelected = selected === id;

  return (
    <article
      role="button"
      tabIndex={0}
      aria-pressed={isSelected}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onSelect(id);
        }
      }}
      onClick={() => onSelect(id)}
      className={[
        'flex h-full cursor-pointer flex-col overflow-hidden rounded-[28px] bg-white transition duration-300 ease-out will-change-transform',
        'outline-none focus-visible:ring-2 focus-visible:ring-indigo-400 focus-visible:ring-offset-2',
        isSelected
          ? 'relative z-10 shadow-[0_0_60px_-12px_rgba(192,132,252,0.65),0_25px_50px_-12px_rgba(0,0,0,0.28)] ring-2 ring-fuchsia-300/50 lg:scale-[1.06] lg:shadow-[0_0_70px_-8px_rgba(217,70,239,0.55),0_30px_60px_-15px_rgba(0,0,0,0.3)]'
          : 'shadow-[0_20px_40px_-15px_rgba(15,23,42,0.2)] ring-1 ring-slate-200/80 hover:brightness-[1.02]',
      ].join(' ')}
    >
      <div className={`relative flex min-h-[8rem] items-center justify-center px-4 py-6 sm:min-h-[8.5rem] ${headerClass}`}>
        {title}
      </div>
      <div className="flex min-h-0 flex-1 flex-col px-5 py-6 sm:px-6 sm:py-8">
        <FeatureList keys={featureKeys} t={t} />
      </div>
      <div className="px-5 pb-6 sm:px-6 sm:pb-8">
        <div
          className={`w-full rounded-full py-3.5 text-center text-sm font-bold transition sm:text-base ${priceButtonClass}`}
          aria-hidden
        >
          {t(priceLabelKey)}
        </div>
      </div>
    </article>
  );
}

/**
 * Logged-in pricing / paywall view — fires `paywall_view` once per mount when session exists.
 */
export default function PaywallPage() {
  const { t } = useLanguage();
  const [session, setSession] = useState(/** @type {import('@supabase/supabase-js').Session | null} */ (null));
  const [ready, setReady] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState(/** @type {PlanId | null} */ (null));

  useEffect(() => {
    if (!supabaseConfigured || supabaseInitError || !supabaseClient) {
      setReady(true);
      return;
    }
    supabaseClient.auth.getSession().then(({ data }) => {
      setSession(data.session ?? null);
      setReady(true);
    });
  }, []);

  useEffect(() => {
    if (!ready || !session?.user) return;
    void logUserEvent('paywall_view', 'success', { path: '/pricing' });
  }, [ready, session]);

  if (!supabaseConfigured || supabaseInitError || !supabaseClient) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-100 p-6">
        <p className="max-w-md text-center text-sm text-slate-600">{t('config.notConfigured')}</p>
      </div>
    );
  }

  if (!ready) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-100">
        <p className="text-sm text-slate-500">{t('nav.loading')}</p>
      </div>
    );
  }

  if (!session) {
    return <Navigate to="/" replace />;
  }

  const starterKeys = ['paywall.plan.starter.f1', 'paywall.plan.starter.f2', 'paywall.plan.starter.f3', 'paywall.plan.starter.f4'];
  const proKeys = ['paywall.plan.pro.f1', 'paywall.plan.pro.f2', 'paywall.plan.pro.f3'];
  const eliteKeys = ['paywall.plan.elite.f1', 'paywall.plan.elite.f2', 'paywall.plan.elite.f3'];

  const handleConfirmPurchase = () => {
    if (!selectedPlan) return;
    void logUserEvent('purchase_confirm', 'clicked', { plan: selectedPlan });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-200 via-slate-100 to-slate-200/90">
      <header className="border-b border-slate-300/60 bg-white/90 px-4 py-4 shadow-sm backdrop-blur sm:px-8">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4">
          <div className="flex min-w-0 items-center gap-3 sm:gap-4">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-indigo-600 shadow-lg shadow-indigo-900/35 sm:h-12 sm:w-12">
              <Scale className="h-5 w-5 text-white sm:h-6 sm:w-6" strokeWidth={2} aria-hidden />
            </div>
            <div className="min-w-0 text-left">
              <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-500 sm:text-xs">
                {t('brand.subtitle')}
              </p>
              <p className="text-lg font-bold tracking-tight text-slate-900 sm:text-xl">{t('paywall.brandWordmark')}</p>
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-3">
            <LanguageSwitcher variant="light" />
            <Link
              to="/"
              className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 shadow-sm transition hover:border-indigo-200 hover:bg-indigo-50 hover:text-indigo-900"
            >
              {t('paywall.backToApp')}
            </Link>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-10 sm:px-6 sm:py-14 lg:px-8">
        <h1 className="mx-auto mb-4 max-w-5xl text-center text-3xl font-bold tracking-[0.2em] text-slate-900 sm:mb-5 sm:text-4xl">
          {t('paywall.title')}
        </h1>

        <div className="mx-auto grid max-w-5xl grid-cols-1 items-stretch gap-8 overflow-visible px-1 lg:grid-cols-3 lg:gap-5 lg:pt-2 lg:pb-8">
          <PlanCard
            id="starter"
            selected={selectedPlan}
            onSelect={setSelectedPlan}
            headerClass="bg-gradient-to-b from-slate-300 via-slate-500 to-slate-800"
            title={
              <p className="text-base font-bold uppercase tracking-[0.25em] text-white drop-shadow-[0_2px_8px_rgba(0,0,0,0.45)] sm:text-lg">
                {t('paywall.plan.starter.name')}
              </p>
            }
            featureKeys={starterKeys}
            priceButtonClass="uppercase tracking-wide text-white shadow-[0_0_28px_rgba(255,255,255,0.35),0_8px_24px_-6px_rgba(15,23,42,0.4)] bg-gradient-to-b from-slate-500 to-slate-800 hover:brightness-110"
            priceLabelKey="paywall.cta.free"
            t={t}
          />

          <PlanCard
            id="pro"
            selected={selectedPlan}
            onSelect={setSelectedPlan}
            headerClass="bg-gradient-to-b from-orange-500 via-amber-500 to-amber-400"
            title={
              <p
                className="text-4xl font-black leading-none text-amber-200 drop-shadow-[0_6px_24px_rgba(0,0,0,0.35)] sm:text-5xl"
                style={{ textShadow: '0 4px 0 rgba(180,83,9,0.35), 0 8px 32px rgba(0,0,0,0.25)' }}
              >
                {t('paywall.plan.pro.name')}
              </p>
            }
            featureKeys={proKeys}
            priceButtonClass="font-bold text-white shadow-[0_0_32px_rgba(250,204,21,0.85),0_10px_28px_-8px_rgba(245,158,11,0.6)] bg-gradient-to-b from-yellow-300 to-amber-400 hover:brightness-105"
            priceLabelKey="paywall.cta.pro"
            t={t}
          />

          <PlanCard
            id="elite"
            selected={selectedPlan}
            onSelect={setSelectedPlan}
            headerClass="bg-gradient-to-b from-violet-600 via-fuchsia-600 to-fuchsia-700"
            title={
              <p className="text-xl font-black uppercase tracking-wide text-pink-300 drop-shadow-[0_4px_16px_rgba(0,0,0,0.4)] sm:text-2xl">
                {t('paywall.plan.elite.name')}
              </p>
            }
            featureKeys={eliteKeys}
            priceButtonClass="font-bold text-white shadow-[0_0_28px_rgba(236,72,153,0.55),0_10px_28px_-8px_rgba(219,39,119,0.45)] bg-gradient-to-r from-fuchsia-600 via-pink-500 to-orange-500 hover:brightness-110"
            priceLabelKey="paywall.cta.elite"
            t={t}
          />
        </div>

        <div className="mx-auto mt-10 max-w-5xl">
          <button
            type="button"
            disabled={!selectedPlan}
            onClick={handleConfirmPurchase}
            className="w-full rounded-2xl border border-indigo-200 bg-gradient-to-r from-indigo-600 to-violet-600 px-6 py-4 text-center text-base font-bold text-white shadow-lg transition hover:from-indigo-500 hover:to-violet-500 disabled:cursor-not-allowed disabled:opacity-45 disabled:hover:from-indigo-600 disabled:hover:to-violet-600"
          >
            {t('paywall.confirmPurchase')}
          </button>
        </div>
      </main>
    </div>
  );
}
