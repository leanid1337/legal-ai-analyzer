import { jsPDF } from 'jspdf'
import autoTable from 'jspdf-autotable'

/** Brand colors (Tailwind-aligned) */
const SLATE_900 = [15, 23, 42]
const INDIGO_600 = [79, 70, 229]
const WHITE = [255, 255, 255]
const SLATE_100_BLOCK = [241, 245, 249]

const EMERALD_BLOCK = [236, 253, 245]
const AMBER_BLOCK = [255, 251, 235]
const RED_BLOCK = [254, 242, 242]

const EMERALD_BORDER = [5, 150, 105]
const AMBER_BORDER = [217, 119, 6]
const RED_BORDER = [220, 38, 38]

/**
 * Noto Sans first (Google), then DejaVu — both full TTF with Cyrillic.
 * jsPDF needs a real TTF in VFS; embedding multi‑MB base64 in source is avoided — CDN + cache.
 */
const FONT_CANDIDATES = [
  {
    url: 'https://cdn.jsdelivr.net/gh/googlefonts/noto-fonts@main/hinted/ttf/NotoSans/NotoSans-Regular.ttf',
    vfs: 'NotoSans-Regular.ttf',
    family: 'NotoSans',
  },
  {
    url: 'https://unpkg.com/dejavu-fonts-ttf@2.37.3/ttf/DejaVuSans.ttf',
    vfs: 'DejaVuSans.ttf',
    family: 'DejaVuSans',
  },
]

/** @type {{ base64: string, vfs: string, family: string } | null} */
let fontCache = null

function bufferToBase64(buffer) {
  const bytes = new Uint8Array(buffer)
  let binary = ''
  const chunk = 0x8000
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode.apply(null, bytes.subarray(i, i + chunk))
  }
  return btoa(binary)
}

/** Loads Cyrillic-capable font into jsPDF VFS. */
async function loadUnicodeFont(doc) {
  if (!fontCache) {
    let lastErr = 'unknown'
    for (const c of FONT_CANDIDATES) {
      try {
        const res = await fetch(c.url)
        if (!res.ok) {
          lastErr = String(res.status)
          continue
        }
        const buf = await res.arrayBuffer()
        fontCache = { base64: bufferToBase64(buf), vfs: c.vfs, family: c.family }
        break
      } catch (e) {
        lastErr = e instanceof Error ? e.message : String(e)
      }
    }
    if (!fontCache) {
      throw new Error(
        `Не удалось загрузить шрифт для кириллицы (${lastErr}). Проверьте сеть или положите NotoSans-Regular.ttf в /public/fonts/.`
      )
    }
  }

  doc.addFileToVFS(fontCache.vfs, fontCache.base64)
  doc.addFont(fontCache.vfs, fontCache.family, 'normal')
  doc.setFont(fontCache.family, 'normal')
  return fontCache.family
}

function normalizeReportData(data) {
  return {
    summary: typeof data?.summary === 'string' ? data.summary : String(data?.summary ?? ''),
    pros: Array.isArray(data?.pros) ? data.pros.map((x) => String(x)) : [],
    cons: Array.isArray(data?.cons) ? data.cons.map((x) => String(x)) : [],
    risks: typeof data?.risks === 'string' ? data.risks : String(data?.risks ?? ''),
  }
}

/**
 * @param {{ summary: string, pros: string[], cons: string[], risks: string }} data
 */
export async function generateLegalReport(data) {
  const { summary, pros, cons, risks } = normalizeReportData(data)

  const doc = new jsPDF({ unit: 'mm', format: 'a4', orientation: 'portrait' })
  const FONT = await loadUnicodeFont(doc)

  const pageW = doc.internal.pageSize.getWidth()
  const margin = 16

  // Header
  doc.setFillColor(...SLATE_900)
  doc.rect(0, 0, pageW, 28, 'F')
  doc.setDrawColor(...INDIGO_600)
  doc.setLineWidth(1.2)
  doc.line(0, 28, pageW, 28)

  doc.setTextColor(...WHITE)
  doc.setFontSize(15)
  doc.setFont(FONT, 'normal')
  doc.text('LEGAL AI ANALYSIS REPORT', margin, 13)

  doc.setFontSize(9)
  doc.setTextColor(200, 210, 225)
  doc.text(
    new Date().toLocaleString('en-GB', { dateStyle: 'long', timeStyle: 'short' }),
    margin,
    21
  )

  doc.setTextColor(...SLATE_900)
  let y = 36

  const tableFont = { font: FONT, fontStyle: 'normal' }

  // —— 1. Summary / Title ——
  autoTable(doc, {
    startY: y,
    head: [['1. SUMMARY / TITLE']],
    body: [[summary || '—']],
    theme: 'plain',
    styles: {
      ...tableFont,
      fontSize: 10,
      cellPadding: { top: 4, right: 5, bottom: 4, left: 5 },
      textColor: SLATE_900,
      fillColor: SLATE_100_BLOCK,
      lineColor: INDIGO_600,
      lineWidth: 0.35,
    },
    headStyles: {
      ...tableFont,
      fillColor: INDIGO_600,
      textColor: WHITE,
      fontSize: 9,
      halign: 'left',
    },
    margin: { left: margin, right: margin },
  })
  y = doc.lastAutoTable.finalY + 10

  // —— 2. Positive Aspects ——
  autoTable(doc, {
    startY: y,
    head: [['2. POSITIVE ASPECTS']],
    body: pros.length ? pros.map((p) => [p]) : [['—']],
    theme: 'plain',
    styles: {
      ...tableFont,
      fontSize: 9,
      cellPadding: { top: 3, right: 4, bottom: 3, left: 4 },
      textColor: SLATE_900,
      lineColor: EMERALD_BORDER,
      lineWidth: 0.25,
      fillColor: EMERALD_BLOCK,
    },
    headStyles: {
      ...tableFont,
      fillColor: [16, 185, 129],
      textColor: WHITE,
      fontSize: 9,
      halign: 'left',
    },
    margin: { left: margin, right: margin },
  })
  y = doc.lastAutoTable.finalY + 10

  // —— 3. Negative Aspects ——
  autoTable(doc, {
    startY: y,
    head: [['3. NEGATIVE ASPECTS']],
    body: cons.length ? cons.map((c) => [c]) : [['—']],
    theme: 'plain',
    styles: {
      ...tableFont,
      fontSize: 9,
      cellPadding: { top: 3, right: 4, bottom: 3, left: 4 },
      textColor: SLATE_900,
      lineColor: AMBER_BORDER,
      lineWidth: 0.25,
      fillColor: AMBER_BLOCK,
    },
    headStyles: {
      ...tableFont,
      fillColor: [217, 119, 6],
      textColor: WHITE,
      fontSize: 9,
      halign: 'left',
    },
    margin: { left: margin, right: margin },
  })
  y = doc.lastAutoTable.finalY + 10

  // —— 4. Critical Risks & Dangers ——
  const risksText = risks.trim() || '—'
  const risksLines = doc.splitTextToSize(risksText, pageW - margin * 2 - 8)
  const riskRows = risksLines.map((line) => [line])

  autoTable(doc, {
    startY: y,
    head: [['4. CRITICAL RISKS & DANGERS']],
    body: riskRows,
    theme: 'plain',
    styles: {
      ...tableFont,
      fontSize: 9,
      cellPadding: { top: 2, right: 4, bottom: 2, left: 4 },
      textColor: SLATE_900,
      lineColor: RED_BORDER,
      lineWidth: 0.25,
      fillColor: RED_BLOCK,
    },
    headStyles: {
      ...tableFont,
      fillColor: [220, 38, 38],
      textColor: WHITE,
      fontSize: 9,
      halign: 'left',
    },
    margin: { left: margin, right: margin },
  })

  const pageCount = doc.getNumberOfPages()
  doc.setPage(pageCount)
  const pageH = doc.internal.pageSize.getHeight()
  doc.setFont(FONT, 'normal')
  doc.setFontSize(7.5)
  doc.setTextColor(100, 116, 139)
  const foot = doc.splitTextToSize('Legal AI — draft analysis. Not legal advice.', pageW - margin * 2)
  doc.text(foot, margin, pageH - 6 - (foot.length - 1) * 3)

  doc.save(`legal-ai-report-${new Date().toISOString().slice(0, 10)}.pdf`)
}
