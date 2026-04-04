import React from 'react';
import { useLanguage } from '@/context/LanguageContext';

const OPTIONS = [
  { id: 'en', label: 'EN' },
  { id: 'cs', label: 'CZ' },
  { id: 'uk', label: 'UA' },
  { id: 'ru', label: 'RU' },
];

/**
 * @param {{ variant?: 'sidebar' | 'light'; size?: 'default' | 'lg' }} props
 */
export default function LanguageSwitcher({ variant = 'light', size = 'default' }) {
  const { locale, setLocale } = useLanguage();

  const isSidebar = variant === 'sidebar';
  const isLg = size === 'lg';

  const shell =
    isLg
      ? 'gap-1 rounded-xl p-1 shadow-md shadow-black/10'
      : 'gap-0.5 rounded-lg p-0.5';

  const btnBase = isLg
    ? 'min-w-[2.5rem] rounded-lg px-3 py-2 text-xs font-bold tracking-wide'
    : 'min-w-[1.75rem] rounded-md px-1.5 py-1 text-[10px] font-bold tracking-wide';

  return (
    <div
      className={`flex shrink-0 items-center ${shell} ${
        isSidebar ? 'bg-slate-800/80 ring-1 ring-slate-700/80' : 'bg-white/95 ring-1 ring-slate-200/90'
      }`}
      role="group"
      aria-label="Language"
    >
      {OPTIONS.map(({ id, label }) => {
        const active = locale === id;
        return (
          <button
            key={id}
            type="button"
            onClick={() => setLocale(id)}
            className={`${btnBase} transition ${
              active
                ? 'bg-indigo-600 text-white shadow-sm'
                : isSidebar
                  ? 'text-slate-400 hover:bg-slate-700/80 hover:text-white'
                  : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
            }`}
          >
            {label}
          </button>
        );
      })}
    </div>
  );
}
