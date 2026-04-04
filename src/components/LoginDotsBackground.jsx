const edgeVignette = `linear-gradient(
  to bottom,
  rgb(0 0 0 / 0.88) 0%,
  rgb(0 0 0 / 0.45) 10%,
  rgb(0 0 0 / 0.12) 20%,
  transparent 32%,
  transparent 68%,
  rgb(0 0 0 / 0.1) 80%,
  rgb(0 0 0 / 0.32) 90%,
  rgb(0 0 0 / 0.62) 100%
)`;

/** Тёмный фон, мягкое голубое «дыхание» по бокам (GPU: transform + opacity), виньетка сверху/снизу. */
export default function LoginDotsBackground() {
  return (
    <div className="login-bg-shell pointer-events-none fixed inset-0 -z-[1]" aria-hidden>
      <div className="login-bg-breathe-side login-bg-breathe-side--left" />
      <div className="login-bg-breathe-side login-bg-breathe-side--right" />
      <div className="login-bg-breathe-vignette" style={{ backgroundImage: edgeVignette }} />
    </div>
  );
}
