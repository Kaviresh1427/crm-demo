// Shared helpers so every PDF looks the same: dates, amount in words, aligned "Label : value" lines.
import { amountWordsOnly } from './amountWords'

const MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

// "2026-09-07" -> "07 Sep 2026" (two-digit day, so dates line up in tables)
export function fmtDate(d) {
  if (!d) return ''
  const [y, m, day] = String(d).slice(0, 10).split('-')
  return String(Number(day)).padStart(2, '0') + ' ' + MON[Number(m) - 1] + ' ' + y
}

// "RINGGIT MALAYSIA : THREE THOUSAND ..." where a second line starts under the first word, not under RINGGIT.
// Returns the height used.
export function drawAmountWords(pdf, amount, x, y, maxW, lineH = 4.2) {
  const prefix = 'RINGGIT MALAYSIA : '
  const pw = pdf.getTextWidth(prefix)
  pdf.text(prefix, x, y)
  const lines = pdf.splitTextToSize(amountWordsOnly(amount), Math.max(20, maxW - pw))
  lines.forEach((ln, i) => pdf.text(ln, x + pw, y + i * lineH))
  return lines.length * lineH
}

// A line like "Account Name: Demo IT Solutions" (short label, then a value)
const PAIR = /^([A-Za-z][A-Za-z0-9 .()/&'-]{0,26}?)\s*:\s+(\S.*)$/

// Turns free text into printable rows. Groups of 2+ "Label: value" lines in a row get their colons lined up.
// Returns rows: { type: 'text', t } | { type: 'pair', label, value, colX } | { type: 'gap' }
export function layoutText(pdf, text, maxW) {
  const src = String(text || '').replace(/\r/g, '').split('\n')
  const rows = []
  let i = 0
  while (i < src.length) {
    const ln = src[i].trimEnd()
    if (!ln.trim()) {
      rows.push({ type: 'gap' })
      i++
      continue
    }
    // collect a run of consecutive pair lines
    const run = []
    let j = i
    while (j < src.length && PAIR.test(src[j].trim())) {
      const m = src[j].trim().match(PAIR)
      run.push({ label: m[1].trim(), value: m[2].trim() })
      j++
    }
    if (run.length >= 2) {
      const colX = Math.max(...run.map((p) => pdf.getTextWidth(p.label))) + 2
      run.forEach((p) => {
        const vw = Math.max(30, maxW - colX - 4)
        const parts = pdf.splitTextToSize(p.value, vw)
        parts.forEach((part, k) =>
          rows.push({ type: 'pair', label: k === 0 ? p.label : '', colon: k === 0, value: part, colX })
        )
      })
      i = j
      continue
    }
    pdf.splitTextToSize(ln, maxW).forEach((part) => rows.push({ type: 'text', t: part }))
    i++
  }
  // no blank rows at the start or end
  while (rows.length && rows[0].type === 'gap') rows.shift()
  while (rows.length && rows[rows.length - 1].type === 'gap') rows.pop()
  return rows
}

export function rowsHeight(rows, lineH, gapH = lineH) {
  return rows.reduce((h, r) => h + (r.type === 'gap' ? gapH : lineH), 0)
}

// Draws rows from layoutText. Returns the new y.
export function drawRows(pdf, rows, x, y, lineH, gapH = lineH) {
  rows.forEach((r) => {
    if (r.type === 'gap') {
      y += gapH
      return
    }
    if (r.type === 'pair') {
      if (r.label) pdf.text(r.label, x, y)
      if (r.colon) pdf.text(':', x + r.colX, y)
      pdf.text(r.value, x + r.colX + 3, y)
    } else {
      pdf.text(r.t, x, y)
    }
    y += lineH
  })
  return y
}
