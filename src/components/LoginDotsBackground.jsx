import React from 'react';

/** Точки + виньетка (сверху сильнее). */
export default function LoginDotsBackground() {
  return (
    <div className="login-bg-dots pointer-events-none absolute inset-0 z-0 overflow-hidden" aria-hidden>
      <div className="login-bg-dots__layer login-bg-dots__layer--dots" />
      <div className="login-bg-dots__vignette" />
    </div>
  );
}
