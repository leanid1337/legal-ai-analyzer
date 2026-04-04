/**
 * Read `import.meta.env` with trimming and UTF-8 BOM key fallback (common when saving `.env` with Windows Notepad).
 * Only `VITE_*` keys are exposed to the client (Vite default).
 *
 * @param {string} name - Full key, e.g. `VITE_SUPABASE_URL`
 * @returns {string | undefined}
 */
export function viteEnv(name) {
  const env = import.meta.env
  const raw = env[name] ?? env[`\uFEFF${name}`]
  return typeof raw === 'string' ? raw.trim() : raw
}
