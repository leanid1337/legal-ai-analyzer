import React, { useState } from 'react';
import { useLanguage } from '@/context/LanguageContext';

export default function LoginPanel({ supabaseClient }) {
  const { t } = useLanguage();
  const [mode, setMode] = useState('sign_in');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [feedback, setFeedback] = useState(null);

  async function handleSubmit(e) {
    e.preventDefault();
    setFeedback(null);
    setLoading(true);
    try {
      if (mode === 'sign_in') {
        const { error } = await supabaseClient.auth.signInWithPassword({ email, password });
        if (error) setFeedback({ type: 'error', message: error.message });
      } else {
        const { error } = await supabaseClient.auth.signUp({ email, password });
        if (error) setFeedback({ type: 'error', message: error.message });
        else setFeedback({ type: 'success' });
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div>
        <label htmlFor="email" className="block text-sm font-medium text-slate-700 mb-1">
          {t('login.email')}
        </label>
        <input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
        />
      </div>
      <div>
        <label htmlFor="password" className="block text-sm font-medium text-slate-700 mb-1">
          {t('login.password')}
        </label>
        <input
          id="password"
          name="password"
          type="password"
          autoComplete={mode === 'sign_in' ? 'current-password' : 'new-password'}
          required
          minLength={6}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
        />
      </div>
      {feedback && (
        <p
          className={`text-sm rounded-lg px-3 py-2 ${
            feedback.type === 'success' ? 'bg-emerald-50 text-emerald-800' : 'bg-red-50 text-red-700'
          }`}
        >
          {feedback.type === 'success' ? t('login.checkEmail') : feedback.message}
        </p>
      )}
      <button
        type="submit"
        disabled={loading}
        className="w-full rounded-lg bg-indigo-600 py-2.5 text-sm font-semibold text-white shadow hover:bg-indigo-500 disabled:opacity-60"
      >
        {loading ? t('login.loading') : mode === 'sign_in' ? t('login.signIn') : t('login.signUp')}
      </button>
      <p className="text-center text-sm text-slate-600">
        {mode === 'sign_in' ? (
          <>
            {t('login.noAccount')}{' '}
            <button
              type="button"
              className="font-medium text-indigo-600 hover:text-indigo-500"
              onClick={() => {
                setMode('sign_up');
                setFeedback(null);
              }}
            >
              {t('login.register')}
            </button>
          </>
        ) : (
          <>
            {t('login.hasAccount')}{' '}
            <button
              type="button"
              className="font-medium text-indigo-600 hover:text-indigo-500"
              onClick={() => {
                setMode('sign_in');
                setFeedback(null);
              }}
            >
              {t('login.signInLink')}
            </button>
          </>
        )}
      </p>
    </form>
  );
}
