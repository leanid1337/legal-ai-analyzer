import { jsPDF } from 'jspdf'
import autoTable from 'jspdf-autotable'
import { normalizeAnalysisPayload } from '@/lib/ai'

/** Brand colors (Tailwind-aligned) */
const SLATE_900 = [15, 23, 42]
const INDIGO_600 = [79, 70, 229]
const WHITE = [255, 255, 255]
const SLATE_100_BLOCK = [241, 245, 249]

const EMERALD_BLOCK = [236, 253, 245]

const EMERALD_BORDER = [5, 150, 105]

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

const RED_HEAD = [185, 28, 28]
const RED_BLOCK = [254, 242, 242]

/**
 * @param {unknown} data
 */
export async function generateLegalReport(data) {
  const a = normalizeAnalysisPayload(data && typeof data === 'object' ? data : {})
  const summary = a.summary || '—'
  const riskLabel =
    a.risk_level === 'low' ? 'LOW' : a.risk_level === 'high' ? 'HIGH' : 'MEDIUM'
  const positive = a.positive.map((x) => String(x))
  const negative = a.negative.map((x) => String(x))
  const anomalies = a.anomalies.map((x) => String(x))

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

  autoTable(doc, {
    startY: y,
    head: [['2. RISK LEVEL']],
    body: [[riskLabel]],
    theme: 'plain',
    styles: {
      ...tableFont,
      fontSize: 9,
      cellPadding: { top: 3, right: 4, bottom: 3, left: 4 },
      textColor: SLATE_900,
      lineColor: INDIGO_600,
      lineWidth: 0.25,
      fillColor: SLATE_100_BLOCK,
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

  function listBody(lines) {
    if (!lines.length) return [['—']]
    const rows = lines.map((line, idx) => {
      const wrapped = doc.splitTextToSize(line || '—', pageW - margin * 2 - 14)
      return wrapped.map((w, j) => (j === 0 ? [`${idx + 1}. ${w}`] : [w]))
    })
    return rows.flat()
  }

  autoTable(doc, {
    startY: y,
    head: [['3. POSITIVE ASPECTS']],
    body: listBody(positive),
    theme: 'plain',
    styles: {
      ...tableFont,
      fontSize: 9,
      cellPadding: { top: 2, right: 4, bottom: 2, left: 4 },
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
  autoTable(doc, {
    startY: y,
    head: [['4. NEGATIVE ASPECTS']],
    body: listBody(negative),
    theme: 'plain',
    styles: {
      ...tableFont,
      fontSize: 9,
      cellPadding: { top: 2, right: 4, bottom: 2, left: 4 },
      textColor: [127, 29, 29],
      lineColor: [248, 113, 113],
      lineWidth: 0.25,
      fillColor: RED_BLOCK,
    },
    headStyles: {
      ...tableFont,
      fillColor: RED_HEAD,
      textColor: WHITE,
      fontSize: 9,
      halign: 'left',
    },
    margin: { left: margin, right: margin },
  })

  y = doc.lastAutoTable.finalY + 10
  autoTable(doc, {
    startY: y,
    head: [['5. RISKS & ANOMALIES']],
    body: listBody(anomalies),
    theme: 'plain',
    styles: {
      ...tableFont,
      fontSize: 9,
      cellPadding: { top: 2, right: 4, bottom: 2, left: 4 },
      textColor: [127, 29, 29],
      lineColor: [248, 113, 113],
      lineWidth: 0.25,
      fillColor: RED_BLOCK,
    },
    headStyles: {
      ...tableFont,
      fillColor: RED_HEAD,
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
