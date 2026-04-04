/**
 * Groq — OpenAI-совместимый Chat Completions.
 * VITE_ keys are exposed in the browser — for production, proxy via your backend.
 */

import { viteEnv } from './viteEnv.js'

const SYSTEM_PROMPT = `You are a professional legal analyst. Analyze the contract and return the response strictly as a single JSON object with exactly these keys (English key names only): "summary" (short title string), "pros" (array of strings — positive aspects), "cons" (array of strings — negative aspects), "risks" (single detailed string about dangers and critical issues).

Language rule: Detect the primary language of the contract text provided by the user (e.g. English, Czech, Ukrainian, Russian, or any other language). Write ALL string values inside the JSON — summary, every item in pros and cons, and risks — in that SAME language. If the text mixes languages, use the dominant language of the legal document. Do not translate the user's document language into another language unless the contract is clearly in one language throughout.

No markdown, no code fences, no text before or after the JSON.`

/**
 * @typedef {{ summary: string, pros: string[], cons: string[], risks: string }} AnalysisPayload
 */

/**
 * Parse JSON from model output (handles ```json fences and trailing text).
 * @param {string} content
 * @returns {unknown | null}
 */
function extractJsonFromContent(content) {
  const trimmed = content.trim()
  try {
    return JSON.parse(trimmed)
  } catch {
    /* continue */
  }
  const fence = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i)
  if (fence) {
    try {
      return JSON.parse(fence[1].trim())
    } catch {
      /* continue */
    }
  }
  const start = trimmed.indexOf('{')
  const end = trimmed.lastIndexOf('}')
  if (start >= 0 && end > start) {
    try {
      return JSON.parse(trimmed.slice(start, end + 1))
    } catch {
      return null
    }
  }
  return null
}

/**
 * @param {unknown} obj
 * @returns {AnalysisPayload}
 */
export function normalizeAnalysisPayload(obj) {
  if (!obj || typeof obj !== 'object') {
    return {
      summary: '',
      pros: [],
      cons: [],
      risks: '',
    }
  }
  const o = /** @type {Record<string, unknown>} */ (obj)
  const pros = Array.isArray(o.pros) ? o.pros.map((x) => String(x)) : []
  const cons = Array.isArray(o.cons) ? o.cons.map((x) => String(x)) : []
  return {
    summary: typeof o.summary === 'string' && o.summary.trim() ? o.summary.trim() : '',
    pros,
    cons,
    risks: typeof o.risks === 'string' ? o.risks : '',
  }
}

/**
 * Safe parse for DB `result` column: JSON string, legacy plain text, or empty.
 * @param {string | null | undefined} raw
 * @returns {AnalysisPayload | null} null = nothing to show
 */
export function parseStoredAnalysisResult(raw) {
  if (raw == null || String(raw).trim() === '') return null
  const str = String(raw).trim()
  try {
    const parsed = JSON.parse(str)
    return normalizeAnalysisPayload(parsed)
  } catch {
    return {
      summary: str.length > 72 ? `${str.slice(0, 69)}…` : str || '',
      pros: [],
      cons: [],
      risks: str,
    }
  }
}

/** Locales available for translating the analysis output (not UI). */
export const ANALYSIS_TRANSLATION_LOCALES = /** @type {const} */ (['en', 'cs', 'uk', 'ru'])

const LOCALE_TO_LANGUAGE = {
  en: 'English',
  cs: 'Czech',
  uk: 'Ukrainian',
  ru: 'Russian',
}

/**
 * @param {string} systemPrompt
 * @param {string} userContent
 * @returns {Promise<{ ok: true, data: AnalysisPayload } | { ok: false, error: string }>}
 */
async function groqChatJson(systemPrompt, userContent) {
  const apiKey = viteEnv('VITE_GROQ_API_KEY') || viteEnv('VITE_AI_API_KEY')
  if (!apiKey) {
    return { ok: false, error: 'Missing VITE_GROQ_API_KEY (or VITE_AI_API_KEY) in .env' }
  }

  const baseRaw = viteEnv('VITE_AI_BASE_URL') || 'https://api.groq.com/openai/v1'
  const base = baseRaw.replace(/\/$/, '')
  const model = viteEnv('VITE_AI_MODEL') || 'llama-3.3-70b-versatile'
  const url = `${base}/chat/completions`

  const baseBody = {
    model,
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userContent },
    ],
    temperature: 0.2,
  }

  try {
    const post = (payload) =>
      fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify(payload),
      })

    let res = await post({ ...baseBody, response_format: { type: 'json_object' } })
    let data = await res.json().catch(() => ({}))

    if (!res.ok) {
      const errText = String(data?.error?.message || '').toLowerCase()
      const retryWithoutJsonMode =
        res.status === 400 &&
        (errText.includes('response_format') ||
          errText.includes('json_object') ||
          errText.includes('json mode'))
      if (retryWithoutJsonMode) {
        res = await post(baseBody)
        data = await res.json().catch(() => ({}))
      }
    }

    if (!res.ok) {
      const msg =
        data?.error?.message ||
        data?.message ||
        `HTTP ${res.status}: AI request rejected`
      return { ok: false, error: msg }
    }

    const content = data?.choices?.[0]?.message?.content
    if (typeof content !== 'string' || !content.trim()) {
      return { ok: false, error: 'Empty response from the model' }
    }

    const extracted = extractJsonFromContent(content)
    if (!extracted) {
      return { ok: false, error: 'Model did not return valid JSON. Try again.' }
    }

    const dataPayload = normalizeAnalysisPayload(extracted)
    return { ok: true, data: dataPayload }
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e)
    return { ok: false, error: message || 'Network error calling the AI API' }
  }
}

/**
 * @param {string} text — contract / legal document body
 * @returns {Promise<{ ok: true, data: AnalysisPayload } | { ok: false, error: string }>}
 */
export async function analyzeContract(text) {
  const userContent = `Analyze the following contract or legal document text and return only valid JSON matching the schema above:\n\n${text}`
  return groqChatJson(SYSTEM_PROMPT, userContent)
}

/**
 * Translate analysis fields to a target display language. Keys stay English; values only.
 * @param {AnalysisPayload} payload
 * @param {typeof ANALYSIS_TRANSLATION_LOCALES[number]} targetLocale
 * @returns {Promise<{ ok: true, data: AnalysisPayload } | { ok: false, error: string }>}
 */
export async function translateAnalysis(payload, targetLocale) {
  const language = LOCALE_TO_LANGUAGE[/** @type {keyof typeof LOCALE_TO_LANGUAGE} */ (targetLocale)]
  if (!language) {
    return { ok: false, error: 'Unsupported translation locale' }
  }

  const systemPrompt = `You are a professional legal translator. Translate every string value in the user's JSON into ${language}. Preserve legal meaning and nuance. Output ONLY one JSON object with exactly these keys (English key names, do not rename): "summary" (string), "pros" (array of strings), "cons" (array of strings), "risks" (string). The "pros" array must have the same number of items as in the input; the "cons" array must have the same number of items as in the input. Translate the text inside each string; do not omit items. No markdown, no code fences, no extra text.`

  const userContent = `Translate all human-readable string values into ${language}. Keep the same JSON structure and array lengths:\n\n${JSON.stringify(payload)}`

  return groqChatJson(systemPrompt, userContent)
}
