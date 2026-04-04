import React, { useState, useEffect } from 'react';
import { supabaseClient, supabaseConfigured, supabaseInitError } from './lib/supabase';
import Dashboard from './components/Dashboard';
import LoginPanel from './components/LoginPanel';
import LanguageSwitcher from './components/LanguageSwitcher';
import LoginDotsBackground from './components/LoginDotsBackground';
import { useLanguage } from './context/LanguageContext';

const loginShellBgClass =
  'relative z-0 min-h-screen overflow-hidden flex items-center justify-center p-4';

function ConfigOrLoginShell() {
  const { t } = useLanguage();

  if (!supabaseConfigured || supabaseInitError || !supabaseClient) {
    const wrongKey = supabaseConfigured && supabaseInitError;
    return (
      <div className={`${loginShellBgClass} text-white`}>
        <LoginDotsBackground />
        <div className="fixed right-4 top-4 z-50 sm:right-6 sm:top-6">
          <LanguageSwitcher variant="sidebar" size="lg" />
        </div>
        <div className="relative z-10 w-full max-w-md rounded-2xl border border-slate-600/80 bg-slate-900/95 p-8 shadow-[0_52px_100px_-14px_rgb(0_0_0/0.82),0_28px_56px_-12px_rgb(0_0_0/0.65),0_10px_28px_-6px_rgb(0_0_0/0.5)]">
          <h1 className="text-xl font-semibold text-white mb-2">
            {wrongKey ? t('config.wrongKey') : t('config.notConfigured')}
          </h1>
          {wrongKey ? (
            <p className="text-slate-400 text-sm mb-4">
              {t('config.replaceEnv')}{' '}
              <code className="text-indigo-300">.env</code> ·{' '}
              <code className="text-indigo-300">npm run dev</code>
            </p>
          ) : (
            <p className="text-slate-400 text-sm mb-4">
              {t('config.createEnv')}{' '}
              <code className="text-indigo-300">VITE_SUPABASE_URL</code>,{' '}
              <code className="text-indigo-300">VITE_SUPABASE_ANON_KEY</code>. {t('config.bomHint')}
            </p>
          )}
          {supabaseInitError && (
            <p className="text-sm text-red-300 bg-red-950/50 rounded-lg px-3 py-2">{supabaseInitError}</p>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className={loginShellBgClass}>
      <LoginDotsBackground />
      <div className="fixed right-4 top-4 z-50 sm:right-6 sm:top-6">
        <LanguageSwitcher variant="light" size="lg" />
      </div>
      <div className="relative z-10 w-full max-w-md rounded-2xl bg-white p-8 shadow-[0_56px_120px_-16px_rgb(0_0_0/0.72),0_32px_72px_-14px_rgb(0_0_0/0.58),0_14px_36px_-8px_rgb(0_0_0/0.42),0_4px_14px_-2px_rgb(0_0_0/0.28)]">
        <h1 className="mb-8 text-center text-3xl font-black tracking-tight text-slate-900">
          LEGAL <span className="text-indigo-600">AI</span>
        </h1>
        <LoginPanel supabaseClient={supabaseClient} />
      </div>
    </div>
  );
}

export default function App() {
  const [session, setSession] = useState(null);

  useEffect(() => {
    if (!supabaseClient) return undefined;
    supabaseClient.auth.getSession().then(({ data: { session: s } }) => setSession(s));
    const {
      data: { subscription },
    } = supabaseClient.auth.onAuthStateChange((_event, s) => setSession(s));
    return () => subscription.unsubscribe();
  }, []);

  if (!supabaseConfigured || supabaseInitError || !supabaseClient || !session) {
    return <ConfigOrLoginShell />;
  }

  return <Dashboard session={session} />;
}
