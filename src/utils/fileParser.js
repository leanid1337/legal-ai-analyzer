import * as pdfjs from 'pdfjs-dist'
import pdfWorker from 'pdfjs-dist/build/pdf.worker.min.mjs?url'
import mammoth from 'mammoth'

pdfjs.GlobalWorkerOptions.workerSrc = pdfWorker

/**
 * @param {number[]} nums
 */
function median(nums) {
  if (!nums.length) return 0
  const s = [...nums].sort((a, b) => a - b)
  return s[Math.floor(s.length / 2)]
}

/**
 * @typedef {{ str: string, x: number, y: number, w: number, h: number, hasEOL: boolean }} PdfTextPiece
 */

/**
 * @param {import('pdfjs-dist').TextContent} content
 * @returns {PdfTextPiece[]}
 */
function extractPieces(content) {
  const out = []
  for (const item of content.items) {
    if (!item || typeof item !== 'object' || !('str' in item)) continue
    const str = item.str
    if (typeof str !== 'string' || str === '') continue
    const t = item.transform
    if (!Array.isArray(t) || t.length < 6) continue
    const x = t[4]
    const y = t[5]
    let w = typeof item.width === 'number' ? item.width : 0
    const h =
      typeof item.height === 'number' && item.height > 0
        ? item.height
        : Math.abs(t[3]) > 0.01
          ? Math.abs(t[3])
          : 10
    if (w <= 0 && str.length > 0) {
      const scale = Math.abs(t[0]) || 1
      w = str.length * scale * 0.48
    }
    out.push({
      str,
      x,
      y,
      w: Math.max(w, 0.01),
      h,
      hasEOL: Boolean(item.hasEOL),
    })
  }
  return out
}

/**
 * @param {PdfTextPiece[]} items
 * @param {number} lineTol
 * @returns {PdfTextPiece[][]}
 */
function clusterLines(items, lineTol) {
  const sorted = [...items].sort((a, b) => b.y - a.y || a.x - b.x)

  /** @type {PdfTextPiece[][]} */
  const lines = []
  /** @type {PdfTextPiece[]} */
  let line = []
  let refY = 0

  for (const it of sorted) {
    if (line.length === 0) {
      line = [it]
      refY = it.y
      continue
    }
    if (Math.abs(it.y - refY) <= lineTol) {
      line.push(it)
      refY = line.reduce((s, p) => s + p.y, 0) / line.length
    } else {
      lines.push(line)
      line = [it]
      refY = it.y
    }
  }
  if (line.length) lines.push(line)
  return lines
}

/**
 * @param {PdfTextPiece[]} line
 * @param {number} leftX
 * @param {number} spaceWidth
 */
function lineToString(line, leftX, spaceWidth) {
  line.sort((a, b) => a.x - b.x)
  const minX = line[0].x
  let indent = 0
  if (spaceWidth > 0.01 && minX - leftX > spaceWidth * 0.65) {
    indent = Math.min(48, Math.round((minX - leftX) / spaceWidth))
  }

  let out = indent > 0 ? ' '.repeat(indent) : ''

  for (let i = 0; i < line.length; i += 1) {
    const it = line[i]
    const prev = line[i - 1]

    if (i === 0) {
      out += it.str
    } else {
      const prevEnd = prev.x + prev.w
      const gap = it.x - prevEnd
      let spaces = 1
      if (gap <= spaceWidth * 0.15) {
        spaces = 0
      } else if (gap > spaceWidth * 0.85) {
        spaces = Math.min(32, Math.max(1, Math.round(gap / spaceWidth)))
      }
      const prevEndsSpace = /\s$/.test(prev.str)
      const curStartsSpace = /^\s/.test(it.str)
      if (prevEndsSpace || curStartsSpace) {
        spaces = Math.min(spaces, 1)
      }
      if (spaces > 0) {
        out += ' '.repeat(spaces)
      }
      out += it.str
    }
  }

  return out.replace(/\s+$/g, '')
}

/**
 * @param {PdfTextPiece[][]} lines
 * @param {number} lineTol
 * @param {number} spaceWidth
 */
function linesToPageText(lines, lineTol, spaceWidth) {
  if (lines.length === 0) return ''

  const flat = lines.flat()
  const leftX = Math.min(...flat.map((p) => p.x))

  const lineCentersY = lines.map((ln) => ln.reduce((s, p) => s + p.y, 0) / ln.length)

  const gaps = []
  for (let i = 0; i < lineCentersY.length - 1; i += 1) {
    const g = lineCentersY[i] - lineCentersY[i + 1]
    if (g > 0) gaps.push(g)
  }
  const typicalGap = median(gaps) || lineTol * 2.2
  const paragraphGap = Math.max(typicalGap * 1.55, lineTol * 2.8)

  /** @type {string[]} */
  const parts = []
  for (let i = 0; i < lines.length; i += 1) {
    parts.push(lineToString(lines[i], leftX, spaceWidth))
    if (i < lines.length - 1) {
      const g = lineCentersY[i] - lineCentersY[i + 1]
      if (g > paragraphGap) {
        parts.push('')
      }
    }
  }

  return parts.join('\n').trimEnd()
}

/**
 * @param {PdfTextPiece[]} items
 */
function layoutPageText(items) {
  if (items.length === 0) return ''
  const heights = items.map((p) => p.h).filter((h) => h > 0)
  const medianH = median(heights) || 12
  const lineTol = Math.max(medianH * 0.42, 2.2)

  const charWidths = items
    .filter((p) => p.str.length > 0)
    .map((p) => p.w / p.str.length)
  const avgCharW = median(charWidths) || medianH * 0.35
  const spaceWidth = Math.max(avgCharW * 0.55, medianH * 0.22)

  const lines = clusterLines(items, lineTol)
  return linesToPageText(lines, lineTol, spaceWidth)
}

/**
 * @param {File} file
 * @returns {Promise<string>}
 */
export async function parsePDF(file) {
  const data = await file.arrayBuffer()
  const loadingTask = pdfjs.getDocument({ data: new Uint8Array(data) })
  const pdf = await loadingTask.promise
  const pageTexts = []

  for (let i = 1; i <= pdf.numPages; i += 1) {
    const page = await pdf.getPage(i)
    const content = await page.getTextContent()
    const pieces = extractPieces(content)
    const text = layoutPageText(pieces)
    if (text) pageTexts.push(text)
  }

  return pageTexts.filter(Boolean).join('\n\n').trim()
}

/**
 * @param {File} file
 * @returns {Promise<string>}
 */
export async function parseDOCX(file) {
  const arrayBuffer = await file.arrayBuffer()
  try {
    const result = await mammoth.extractRawText({ arrayBuffer })
    const text = (result.value || '').trim()
    if (result.messages?.length) {
      const errs = result.messages.filter((m) => m.type === 'error')
      if (errs.length && !text) {
        throw new Error('FILE_ERROR:WORD_PARSE')
      }
    }
    return text
  } catch (e) {
    if (e instanceof Error && e.message.startsWith('FILE_ERROR:')) throw e
    throw new Error('FILE_ERROR:WORD_PARSE')
  }
}

const ACCEPT_EXT = ['.pdf', '.docx', '.doc']

function extensionOf(name) {
  const lower = name.toLowerCase()
  for (const ext of ACCEPT_EXT) {
    if (lower.endsWith(ext)) return ext
  }
  return ''
}

/**
 * @param {File} file
 * @returns {Promise<string>}
 */
export async function extractTextFromFile(file) {
  if (!file || !(file instanceof File)) {
    throw new Error('FILE_ERROR:INVALID')
  }

  const ext = extensionOf(file.name)
  if (!ext) {
    throw new Error('FILE_ERROR:UNSUPPORTED_EXT')
  }

  let out = ''

  if (ext === '.pdf') {
    out = await parsePDF(file)
  } else if (ext === '.docx') {
    out = await parseDOCX(file)
  } else {
    try {
      out = await parseDOCX(file)
    } catch {
      out = ''
    }
    if (!out) {
      throw new Error('FILE_ERROR:DOC_LEGACY')
    }
  }

  const trimmed = out.trim()
  if (!trimmed) {
    throw new Error('FILE_ERROR:NO_TEXT')
  }
  return trimmed
}
