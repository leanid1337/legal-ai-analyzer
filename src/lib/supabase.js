import { createClient } from '@supabase/supabase-js'
import { viteEnv } from './viteEnv.js'

const supabaseUrl = viteEnv('VITE_SUPABASE_URL')
const supabaseAnonKey = viteEnv('VITE_SUPABASE_ANON_KEY')

export const supabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey)

/** Секретные ключи (sb_secret_…) нельзя встраивать во фронтенд — Supabase вернёт «Forbidden use of secret API key». */
const anonKeyIsBrowserForbidden =
  typeof supabaseAnonKey === 'string' && /^sb_secret_/i.test(supabaseAnonKey)

let initError = null
let client = null

if (anonKeyIsBrowserForbidden) {
  initError =
    'В VITE_SUPABASE_ANON_KEY указан секретный ключ (sb_secret_…). В браузере нужен только публичный anon-ключ: Supabase Dashboard → Project Settings → API → раздел API Keys → ключ «anon» / «public» (обычно длинная строка, начинается с eyJ…). Секретный ключ никогда не кладите в Vite/React.'
} else if (supabaseConfigured) {
  try {
    client = createClient(supabaseUrl, supabaseAnonKey)
  } catch (e) {
    initError = e instanceof Error ? e.message : String(e)
  }
}

export const supabaseInitError = initError
export const supabaseClient = client
