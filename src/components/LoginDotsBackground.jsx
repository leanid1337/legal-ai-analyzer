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

/** Тёмный фон + мягкое затемнение сверху и снизу. */
export default function LoginDotsBackground() {
  return (
    <div
      className="pointer-events-none fixed inset-0 -z-[1] bg-[#0f172a]"
      aria-hidden
      style={{ backgroundImage: edgeVignette }}
    />
  );
}
