import React, { useState, useEffect } from 'react';
import { supabaseClient, supabaseConfigured, supabaseInitError } from './lib/supabase';
import Dashboard from './components/Dashboard';
import LoginPanel from './components/LoginPanel';
import LanguageSwitcher from './components/LanguageSwitcher';
import { useLanguage } from './context/LanguageContext';

function ConfigOrLoginShell() {
  const { t } = useLanguage();

  if (!supabaseConfigured || supabaseInitError || !supabaseClient) {
    const wrongKey = supabaseConfigured && supabaseInitError;
    return (
      <div className="relative min-h-screen bg-slate-950 flex items-center justify-center p-4 text-white">
        <div className="fixed right-4 top-4 z-50 sm:right-6 sm:top-6">
          <LanguageSwitcher variant="sidebar" size="lg" />
        </div>
        <div className="w-full max-w-md rounded-2xl border border-slate-700 bg-slate-900 p-8 shadow-xl">
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
    <div className="relative min-h-screen bg-slate-950 flex items-center justify-center p-4">
      <div className="fixed right-4 top-4 z-50 sm:right-6 sm:top-6">
        <LanguageSwitcher variant="light" size="lg" />
      </div>
      <div className="w-full max-w-md rounded-2xl bg-white p-8 shadow-2xl">
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
