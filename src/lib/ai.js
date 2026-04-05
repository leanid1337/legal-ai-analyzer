/**
 * Groq — OpenAI-совместимый Chat Completions.
 * VITE_ keys are exposed in the browser — for production, proxy via your backend.
 */

import { viteEnv } from './viteEnv.js'

const SYSTEM_PROMPT = `You are a professional analytical legal agent. Analyze the user's input (contract or legal document text). Respond with EXACTLY ONE JSON object and NOTHING else — no markdown, no code fences, no commentary before or after the JSON.

Required JSON shape (English keys only):
{
  "summary": "string — concise analytical conclusion, max 200 characters",
  "risk_level": "low" | "medium" | "high",
  "positive": ["string", "string", ...] — favorable clauses, strengths, or opportunities (use [] if none),
  "negative": ["string", ...] — unfavorable terms, weaknesses, or burdens (use [] if none),
  "anomalies": ["string", ...] — critical dangers, red flags, unusual or high-risk items (use [] if none),
  "chartData": [] OR [ { "name": "Jan", "income": 400, "expenses": 250 }, ... ]
}

Rules:
- "summary": one tight paragraph or sentence; stay at or under 200 characters.
- "risk_level": "low" = generally favorable; "medium" = mixed or needs attention; "high" = serious legal/financial risk.
- "positive", "negative", "anomalies": distinct arrays; do not duplicate the same point across arrays.
- "chartData": CRITICAL — use ONLY when the document materially discusses money or measurable economic flows. That includes: amounts, fees, salaries, rent, payment schedules, penalties, fines, prices, budgets, compensation, invoices, deposits, loans, revenue, costs, currency, or similar. If the text is purely non-financial (e.g. only confidentiality, jurisdiction, liability wording, HR policy without numbers, generic obligations with no sums), you MUST set "chartData" to an empty array []. When financial context exists, provide 6–12 points. Each object MUST have "name" (short period label in the document language), "income", and "expenses" as numbers only (no currency symbols). Optional "balance" for cumulative position; if omitted, a running balance may be inferred. Use REAL figures from the document when present; otherwise infer a plausible coherent series consistent with the document scale. Never invent charts for documents with no monetary or numeric economic substance.

Language: Detect the document language. Write "summary", list items, and each chartData "name" in that language. JSON keys stay in English.

Output valid JSON only.`

/**
 * @typedef {{ name: string, balance: number, income: number, expenses: number }} ChartDataRow
 * @typedef {'low' | 'medium' | 'high'} RiskLevel
 * @typedef {{ summary: string, risk_level: RiskLevel, positive: string[], negative: string[], anomalies: string[], chartData: ChartDataRow[] }} AnalysisPayload
 */

/**
 * @param {unknown} raw
 * @returns {ChartDataRow[]}
 */
function normalizeChartData(raw) {
  if (!Array.isArray(raw)) return []
  /** @type {ChartDataRow[]} */
  const out = []
  let running = 0
  for (const row of raw) {
    if (!row || typeof row !== 'object') continue
    const r = /** @type {Record<string, unknown>} */ (row)
    const nameRaw =
      typeof r.name === 'string'
        ? r.name.trim()
        : typeof r.month === 'string'
          ? r.month.trim()
          : ''
    const name = nameRaw.slice(0, 24)
    const income = Number(r.income)
    const expenses = Number(r.expenses)
    const balRaw = Number(r.balance)
    if (!name || !Number.isFinite(income) || !Number.isFinite(expenses)) {
      continue
    }
    let balance
    if (Number.isFinite(balRaw)) {
      balance = balRaw
      running = balRaw
    } else {
      running += income - expenses
      balance = running
    }
    out.push({ name, balance, income, expenses })
  }
  return out
}

/**
 * @param {unknown} v
 * @returns {RiskLevel}
 */
function normalizeRiskLevel(v) {
  const s = typeof v === 'string' ? v.toLowerCase().trim() : ''
  if (s === 'low' || s === 'medium' || s === 'high') {
    return /** @type {RiskLevel} */ (s)
  }
  if (s === 'green') return 'low'
  if (s === 'yellow') return 'medium'
  if (s === 'red') return 'high'
  return 'medium'
}

/**
 * @param {unknown} raw
 * @returns {string[]}
 */
function normalizeStringList(raw) {
  if (Array.isArray(raw)) {
    return raw.map((x) => String(x).trim()).filter(Boolean)
  }
  if (typeof raw === 'string' && raw.trim()) {
    return [raw.trim()]
  }
  return []
}

/**
 * @param {Record<string, unknown>} o
 */
function migrateLegacyLists(o) {
  /** @type {string[]} */
  let positive = normalizeStringList(o.positive)
  /** @type {string[]} */
  let negative = normalizeStringList(o.negative)
  /** @type {string[]} */
  let anomalies = normalizeStringList(o.anomalies)

  if (positive.length === 0 && Array.isArray(o.pros)) {
    positive = o.pros.map((x) => String(x).trim()).filter(Boolean)
  }
  if (negative.length === 0 && Array.isArray(o.cons)) {
    negative = o.cons.map((x) => String(x).trim()).filter(Boolean)
  }

  if (Array.isArray(o.insights) && positive.length === 0 && negative.length === 0) {
    for (const item of o.insights) {
      const s = String(item).trim()
      if (!s) continue
      if (s.startsWith('−') || s.startsWith('-')) {
        negative.push(s.replace(/^[\u2212\-]\s*/, ''))
      } else if (s.startsWith('+')) {
        positive.push(s.replace(/^\+\s*/, ''))
      } else {
        positive.push(s)
      }
    }
  }

  if (anomalies.length === 0) {
    anomalies = [
      ...normalizeStringList(o.risks),
      ...normalizeStringList(o.negativeAspects),
    ]
  }

  return { positive, negative, anomalies }
}

/**
 * @param {unknown} obj
 * @returns {AnalysisPayload}
 */
export function normalizeAnalysisPayload(obj) {
  if (!obj || typeof obj !== 'object') {
    return {
      summary: '',
      risk_level: 'medium',
      positive: [],
      negative: [],
      anomalies: [],
      chartData: [],
    }
  }
  const o = /** @type {Record<string, unknown>} */ (obj)

  const { positive, negative, anomalies } = migrateLegacyLists(o)

  let summary = typeof o.summary === 'string' ? o.summary.trim() : ''
  if (summary.length > 200) {
    summary = `${summary.slice(0, 197)}…`
  }

  const risk_level = normalizeRiskLevel(o.risk_level ?? o.status)

  return {
    summary,
    risk_level,
    positive,
    negative,
    anomalies,
    chartData: normalizeChartData(o.chartData),
  }
}

/**
 * Parse JSON from model output (handles markdown code fences and trailing text).
 * @param {string} content
 * @returns {unknown | null}
 */
function extractJsonFromContent(content) {
  const trimmed = content.trim()
  const braceMatch = trimmed.match(/\{[\s\S]*\}/)
  if (braceMatch) {
    const rawJson = braceMatch[0]
    try {
      return JSON.parse(rawJson)
    } catch {
      /* continue */
    }
  }
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
    const body = str.length > 1800 ? `${str.slice(0, 1797)}…` : str
    return {
      summary: str.length > 72 ? `${str.slice(0, 69)}…` : str || '',
      risk_level: 'medium',
      positive: [],
      negative: [body],
      anomalies: [],
      chartData: [],
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

    let extracted
    try {
      extracted = extractJsonFromContent(content)
    } catch {
      return { ok: false, error: 'Model returned invalid JSON. Try again.' }
    }
    if (!extracted) {
      return { ok: false, error: 'Model did not return valid JSON. Try again.' }
    }

    let dataPayload
    try {
      dataPayload = normalizeAnalysisPayload(extracted)
    } catch {
      return { ok: false, error: 'Could not read analysis structure. Try again.' }
    }
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
  const userContent = `Analyze the following document. Output ONLY the JSON object with "summary", "risk_level", "positive", "negative", "anomalies", and "chartData" as specified. Use "chartData": [] unless the document actually discusses money or numeric financial flows as defined in the rules.\n\n${text}`
  return groqChatJson(SYSTEM_PROMPT, userContent)
}

/**
 * Translate analysis strings to a target display language. Keys stay English; values only.
 * @param {AnalysisPayload} payload
 * @param {typeof ANALYSIS_TRANSLATION_LOCALES[number]} targetLocale
 * @returns {Promise<{ ok: true, data: AnalysisPayload } | { ok: false, error: string }>}
 */
export async function translateAnalysis(payload, targetLocale) {
  const language = LOCALE_TO_LANGUAGE[/** @type {keyof typeof LOCALE_TO_LANGUAGE} */ (targetLocale)]
  if (!language) {
    return { ok: false, error: 'Unsupported translation locale' }
  }

  const systemPrompt = `You are a professional legal translator. Translate string values into ${language}. Output ONLY one JSON object with keys: "summary" (string), "risk_level" ("low"|"medium"|"high" — keep the SAME value as input), "positive" (array of strings, same length and order), "negative" (array of strings, same length and order), "anomalies" (array of strings, same length and order), "chartData" (array of objects with "name", "balance" optional, "income", "expenses" — or empty array if input chartData is empty). Translate summary, each positive, negative, and anomalies string, and each chartData "name". Keep risk_level unchanged. Keep numeric fields identical. Same array lengths and order; if input chartData is [], output []. No markdown, no extra text.`

  const userContent = `Translate into ${language}:\n\n${JSON.stringify(payload)}`

  return groqChatJson(systemPrompt, userContent)
}
