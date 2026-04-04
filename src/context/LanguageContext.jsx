import React, { createContext, useCallback, useContext, useMemo, useState } from 'react';
import { translations, resolveInitialLocale, SUPPORTED_LOCALES } from '@/i18n/translations';

const LanguageContext = createContext(null);

export function LanguageProvider({ children }) {
  const [locale, setLocaleState] = useState(resolveInitialLocale);

  const setLocale = useCallback((next) => {
    if (!SUPPORTED_LOCALES.includes(next)) return;
    setLocaleState(next);
    try {
      localStorage.setItem('legal-ai-lang', next);
    } catch {
      /* ignore */
    }
  }, []);

  const t = useCallback(
    (key) => {
      const pack = translations[locale] || translations.en;
      return pack[key] ?? translations.en[key] ?? key;
    },
    [locale]
  );

  const value = useMemo(() => ({ locale, setLocale, t }), [locale, setLocale, t]);

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}

export function useLanguage() {
  const ctx = useContext(LanguageContext);
  if (!ctx) {
    throw new Error('useLanguage must be used within LanguageProvider');
  }
  return ctx;
}
