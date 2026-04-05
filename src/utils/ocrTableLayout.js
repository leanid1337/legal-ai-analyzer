/**
 * Rebuild table-like layout from Tesseract page geometry (words + bbox).
 * @typedef {{ bbox?: { x0: number; y0: number; x1: number; y1: number }; text?: string }} OcrWord
 * @typedef {{ words?: OcrWord[]; text?: string; bbox?: { x0: number; y0: number; x1: number; y1: number } }} OcrLine
 * @typedef {{ lines?: OcrLine[] | null; text?: string; blocks?: unknown[] | null }} OcrPage
 */

/** @param {OcrWord} w */
function x0(w) {
  return w.bbox?.x0 ?? 0
}

/** @param {OcrWord} w */
function x1(w) {
  return w.bbox?.x1 ?? 0
}

/** @param {OcrLine} line */
function lineTop(line) {
  return line.bbox?.y0 ?? 0
}

/** @param {OcrLine} line */
function lineBottom(line) {
  return line.bbox?.y1 ?? 0
}

/**
 * @param {OcrLine[]} lines
 */
function medianLineHeight(lines) {
  const hs = []
  for (const ln of lines) {
    const b = ln.bbox
    if (b && b.y1 > b.y0) hs.push(b.y1 - b.y0)
  }
  if (!hs.length) return 24
  hs.sort((a, b) => a - b)
  return hs[Math.floor(hs.length / 2)]
}

/**
 * Horizontal gap threshold: larger → tab (new column), smaller → space inside cell.
 * @param {OcrLine[]} lines
 */
function estimateColumnGapThreshold(lines) {
  /** @type {number[]} */
  const gaps = []
  for (const line of lines) {
    const words = sortedWords(line)
    for (let i = 1; i < words.length; i++) {
      const g = x0(words[i]) - x1(words[i - 1])
      if (g > -2) gaps.push(Math.max(0, g))
    }
  }
  if (gaps.length === 0) return 32
  gaps.sort((a, b) => a - b)
  const med = gaps[Math.floor(gaps.length * 0.5)]
  const p75 = gaps[Math.floor(gaps.length * 0.75)]
  const p90 = gaps[Math.floor(gaps.length * 0.9)] ?? p75
  return Math.max(20, Math.min(140, med * 2.6 + (p75 + p90) * 0.2))
}

/** @param {OcrLine} line */
function sortedWords(line) {
  const words = [...(line.words || [])].filter((w) => w.text != null && String(w.text).trim() !== '')
  return words.sort((a, b) => x0(a) - x0(b))
}

/**
 * @param {OcrLine} line
 * @param {number} gapThreshold
 */
function lineToTabRow(line, gapThreshold) {
  const words = sortedWords(line)
  if (words.length === 0) {
    const t = (line.text || '').trim()
    if (!t) return ''
    return t.replace(/\s{2,}/g, '\t')
  }
  let out = normalizeCell(words[0].text)
  for (let i = 1; i < words.length; i++) {
    const gap = x0(words[i]) - x1(words[i - 1])
    const sep = gap >= gapThreshold ? '\t' : ' '
    out += sep + normalizeCell(words[i].text)
  }
  return out
}

/** @param {string | undefined} t */
function normalizeCell(t) {
  return String(t || '')
    .replace(/\s+/g, ' ')
    .trim()
}

/**
 * Pad columns so plain-text table aligns (best with monospace font).
 * @param {string[]} rows
 */
function padAlignedGrid(rows) {
  const cells = rows.map((r) => r.split('\t').map((c) => c.trim()))
  const colCount = Math.max(...cells.map((r) => r.length), 0)
  if (colCount < 2) return rows.join('\n')

  const widths = Array(colCount).fill(0)
  for (const r of cells) {
    for (let i = 0; i < r.length; i++) {
      const len = (r[i] || '').length
      if (len > widths[i]) widths[i] = len
    }
  }

  return cells
    .map((r) =>
      Array.from({ length: colCount }, (_, i) => (r[i] || '').padEnd(widths[i], ' ')).join(' │ ')
    )
    .join('\n')
}

/**
 * @param {OcrPage} page
 * @returns {string}
 */
export function reconstructStructuredTextFromPage(page) {
  const rawLines = page.lines
  if (!rawLines || !Array.isArray(rawLines) || rawLines.length === 0) {
    return (page.text || '').trim()
  }

  const lines = [...rawLines].sort((a, b) => lineTop(a) - lineTop(b))
  const gapTh = estimateColumnGapThreshold(lines)
  const medianH = medianLineHeight(lines)

  /** @type {string[]} */
  const out = []
  let prevBottom = -Infinity

  for (const line of lines) {
    const row = lineToTabRow(line, gapTh)
    if (!row) continue

    const top = lineTop(line)
    if (prevBottom > -Infinity && top - prevBottom > medianH * 1.75) {
      out.push('')
    }
    out.push(row)
    prevBottom = Math.max(prevBottom, lineBottom(line))
  }

  if (out.length === 0) {
    return (page.text || '').trim()
  }

  const tabRows = out.filter((r) => r.length > 0)
  const colCounts = tabRows.map((r) => r.split('\t').length)
  const maxC = Math.max(...colCounts)
  const minC = Math.min(...colCounts)

  if (maxC >= 2 && maxC === minC && tabRows.length >= 2) {
    return padAlignedGrid(tabRows)
  }

  return tabRows.join('\n')
}

/**
 * Long prose without real columns: geometric layout adds noise — use flat OCR text.
 * @param {string} structured
 * @param {string} plain
 */
export function shouldPreferPlainOcrText(structured, plain) {
  const rows = structured.split('\n').filter((r) => r.trim())
  if (rows.length === 0) return true
  const tabOrPipe = rows.filter((r) => r.includes('\t') || r.includes('│')).length
  if (tabOrPipe >= rows.length * 0.2) return false
  const words = rows.reduce((s, r) => s + r.trim().split(/\s+/).filter(Boolean).length, 0)
  const avg = words / rows.length
  return avg > 12 && plain.trim().length > structured.trim().length * 0.85
}
