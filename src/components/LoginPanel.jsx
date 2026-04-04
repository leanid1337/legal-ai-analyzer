import React, { useState } from 'react';
import { useLanguage } from '@/context/LanguageContext';

/**
 * @param {{ supabaseClient: import('@supabase/supabase-js').SupabaseClient; linkRecoveryMode?: boolean }} props
 */
export default function LoginPanel({ supabaseClient, linkRecoveryMode = false }) {
  const { t } = useLanguage();
  const [mode, setMode] = useState('sign_in');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [forgotStage, setForgotStage] = useState(null);
  const [recoveryCode, setRecoveryCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
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

  async function handleSendRecovery(e) {
    e.preventDefault();
    setFeedback(null);
    setLoading(true);
    try {
      const redirectTo = `${window.location.origin}/`;
      const { error } = await supabaseClient.auth.resetPasswordForEmail(email.trim(), {
        redirectTo,
      });
      if (error) {
        setFeedback({ type: 'error', message: error.message });
        return;
      }
      setForgotStage('reset');
      setFeedback({ type: 'info', message: t('login.recoveryEmailSent') });
    } finally {
      setLoading(false);
    }
  }

  async function handleCompleteRecovery(e) {
    e.preventDefault();
    setFeedback(null);
    if (newPassword.length < 6) {
      setFeedback({ type: 'error', message: t('login.passwordTooShort') });
      return;
    }
    if (newPassword !== confirmPassword) {
      setFeedback({ type: 'error', message: t('login.passwordMismatch') });
      return;
    }
    const token = recoveryCode.trim();
    if (!token) {
      setFeedback({ type: 'error', message: t('login.recoveryCodeRequired') });
      return;
    }
    setLoading(true);
    try {
      const { error: otpError } = await supabaseClient.auth.verifyOtp({
        email: email.trim(),
        token,
        type: 'recovery',
      });
      if (otpError) {
        setFeedback({ type: 'error', message: otpError.message });
        return;
      }
      const { error: updateError } = await supabaseClient.auth.updateUser({ password: newPassword });
      if (updateError) {
        setFeedback({ type: 'error', message: updateError.message });
        return;
      }
      /* Сессия активна — родитель переключит на дашборд */
    } finally {
      setLoading(false);
    }
  }

  async function handleLinkRecoverySubmit(e) {
    e.preventDefault();
    setFeedback(null);
    if (newPassword.length < 6) {
      setFeedback({ type: 'error', message: t('login.passwordTooShort') });
      return;
    }
    if (newPassword !== confirmPassword) {
      setFeedback({ type: 'error', message: t('login.passwordMismatch') });
      return;
    }
    setLoading(true);
    try {
      const { error } = await supabaseClient.auth.updateUser({ password: newPassword });
      if (error) setFeedback({ type: 'error', message: error.message });
    } finally {
      setLoading(false);
    }
  }

  const inputClass =
    'w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500';

  if (linkRecoveryMode) {
    return (
      <form onSubmit={handleLinkRecoverySubmit} className="space-y-5">
        <h2 className="text-lg font-semibold text-slate-900">{t('login.setNewPasswordTitle')}</h2>
        <p className="text-sm text-slate-600">{t('login.setNewPasswordHint')}</p>
        <div>
          <label htmlFor="new-pass-link" className="mb-1 block text-sm font-medium text-slate-700">
            {t('login.newPassword')}
          </label>
          <input
            id="new-pass-link"
            name="newPassword"
            type="password"
            autoComplete="new-password"
            required
            minLength={6}
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            className={inputClass}
          />
        </div>
        <div>
          <label htmlFor="confirm-pass-link" className="mb-1 block text-sm font-medium text-slate-700">
            {t('login.confirmPassword')}
          </label>
          <input
            id="confirm-pass-link"
            name="confirmPassword"
            type="password"
            autoComplete="new-password"
            required
            minLength={6}
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            className={inputClass}
          />
        </div>
        {feedback && (
          <p
            className={`rounded-lg px-3 py-2 text-sm ${
              feedback.type === 'error' ? 'bg-red-50 text-red-700' : 'bg-emerald-50 text-emerald-800'
            }`}
          >
            {feedback.message}
          </p>
        )}
        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-lg bg-indigo-600 py-2.5 text-sm font-semibold text-white shadow hover:bg-indigo-500 disabled:opacity-60"
        >
          {loading ? t('login.loading') : t('login.savePassword')}
        </button>
      </form>
    );
  }

  if (forgotStage === 'request') {
    return (
      <form onSubmit={handleSendRecovery} className="space-y-5">
        <h2 className="text-lg font-semibold text-slate-900">{t('login.forgotTitle')}</h2>
        <p className="text-sm text-slate-600">{t('login.forgotIntro')}</p>
        <div>
          <label htmlFor="recovery-email" className="mb-1 block text-sm font-medium text-slate-700">
            {t('login.email')}
          </label>
          <input
            id="recovery-email"
            name="email"
            type="email"
            autoComplete="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className={inputClass}
          />
        </div>
        {feedback && (
          <p
            className={`rounded-lg px-3 py-2 text-sm ${
              feedback.type === 'error' ? 'bg-red-50 text-red-700' : 'bg-sky-50 text-sky-900'
            }`}
          >
            {feedback.message}
          </p>
        )}
        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-lg bg-indigo-600 py-2.5 text-sm font-semibold text-white shadow hover:bg-indigo-500 disabled:opacity-60"
        >
          {loading ? t('login.loading') : t('login.sendRecovery')}
        </button>
        <p className="text-center text-sm text-slate-600">
          <button
            type="button"
            className="font-medium text-indigo-600 hover:text-indigo-500"
            onClick={() => {
              setForgotStage(null);
              setFeedback(null);
            }}
          >
            {t('login.backToSignIn')}
          </button>
        </p>
      </form>
    );
  }

  if (forgotStage === 'reset') {
    return (
      <form onSubmit={handleCompleteRecovery} className="space-y-5">
        <h2 className="text-lg font-semibold text-slate-900">{t('login.resetPasswordTitle')}</h2>
        <p className="text-sm text-slate-600">{t('login.resetPasswordIntro')}</p>
        <div>
          <label htmlFor="recovery-code" className="mb-1 block text-sm font-medium text-slate-700">
            {t('login.recoveryCode')}
          </label>
          <input
            id="recovery-code"
            name="recoveryCode"
            type="text"
            inputMode="numeric"
            autoComplete="one-time-code"
            required
            maxLength={32}
            value={recoveryCode}
            onChange={(e) => setRecoveryCode(e.target.value)}
            placeholder={t('login.recoveryCodePlaceholder')}
            className={inputClass}
          />
        </div>
        <div>
          <label htmlFor="new-pass" className="mb-1 block text-sm font-medium text-slate-700">
            {t('login.newPassword')}
          </label>
          <input
            id="new-pass"
            name="newPassword"
            type="password"
            autoComplete="new-password"
            required
            minLength={6}
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            className={inputClass}
          />
        </div>
        <div>
          <label htmlFor="confirm-pass" className="mb-1 block text-sm font-medium text-slate-700">
            {t('login.confirmPassword')}
          </label>
          <input
            id="confirm-pass"
            name="confirmPassword"
            type="password"
            autoComplete="new-password"
            required
            minLength={6}
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            className={inputClass}
          />
        </div>
        {feedback && (
          <p
            className={`rounded-lg px-3 py-2 text-sm ${
              feedback.type === 'error' ? 'bg-red-50 text-red-700' : 'bg-sky-50 text-sky-900'
            }`}
          >
            {feedback.message}
          </p>
        )}
        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-lg bg-indigo-600 py-2.5 text-sm font-semibold text-white shadow hover:bg-indigo-500 disabled:opacity-60"
        >
          {loading ? t('login.loading') : t('login.savePassword')}
        </button>
        <p className="text-center text-sm text-slate-600">
          <button
            type="button"
            className="font-medium text-indigo-600 hover:text-indigo-500"
            onClick={() => {
              setForgotStage('request');
              setRecoveryCode('');
              setNewPassword('');
              setConfirmPassword('');
              setFeedback(null);
            }}
          >
            {t('login.resendRecovery')}
          </button>
        </p>
      </form>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div>
        <label htmlFor="email" className="mb-1 block text-sm font-medium text-slate-700">
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
          className={inputClass}
        />
      </div>
      <div>
        <label htmlFor="password" className="mb-1 block text-sm font-medium text-slate-700">
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
          className={inputClass}
        />
      </div>
      {mode === 'sign_in' && (
        <div className="-mt-2 text-right">
          <button
            type="button"
            className="text-sm font-medium text-indigo-600 hover:text-indigo-500"
            onClick={() => {
              setForgotStage('request');
              setFeedback(null);
            }}
          >
            {t('login.forgotPassword')}
          </button>
        </div>
      )}
      {feedback && (
        <p
          className={`rounded-lg px-3 py-2 text-sm ${
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
