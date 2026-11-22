import { jsPDF } from 'jspdf'
import { COMPANY } from './docSettings'
import { fmtDate, drawAmountWords, layoutText, rowsHeight, drawRows } from './pdfText'

const RED = [214, 40, 48]
const BLACK = [251, 236, 237] // soft blush band (easy on the eyes)
const ROSE = [200, 36, 46]
const DEEP = [92, 16, 24]
const WHITE = [255, 255, 255]
const BOX = [244, 244, 246]
const PINK = [253, 236, 237]
const TEXT = [25, 25, 28]
const MUTED = [105, 105, 112]
const LINE = [221, 221, 226]
const LOGO_BG = [255, 255, 255]

// number only (the RM sign is shown once in the column heading or in its own aligned column)
function num(n) {
  const v = Number(n || 0)
  const t = Math.abs(v).toLocaleString('en-MY', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
  return (v < 0 ? '-' : '') + t
}

function money(n) {
  return 'RM ' + Number(n || 0).toLocaleString('en-MY', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

// Loads an image from the public folder. Returns null if it is missing.
async function loadImage(path) {
  try {
    const res = await fetch(path)
    if (!res.ok) return null
    const blob = await res.blob()
    if (!blob.type.startsWith('image/')) return null
    return await new Promise((resolve) => {
      const fr = new FileReader()
      fr.onload = () => resolve(fr.result)
      fr.onerror = () => resolve(null)
      fr.readAsDataURL(blob)
    })
  } catch (e) {
    return null
  }
}

function imageSize(dataUrl) {
  return new Promise((resolve) => {
    const img = new Image()
    img.onload = () => resolve({ w: img.naturalWidth, h: img.naturalHeight })
    img.onerror = () => resolve(null)
    img.src = dataUrl
  })
}

function fit(size, box) {
  let w = box
  let h = box
  const ratio = size.w / size.h
  if (ratio > 1) h = box / ratio
  else w = box * ratio
  return { w, h }
}

// d = { title, number, issueDate, dueDate, dueLabel, customer, items, subtotal, discount,
//       taxRate, taxAmount, total, paid, balance, showPaid, showBank, notes, terms }
export async function downloadDocumentPdf(d) {
  const pdf = new jsPDF({ unit: 'mm', format: 'a4' })
  const W = 210
  const logo = await loadImage('/logo.png')
  const logoSize = logo ? await imageSize(logo) : null
  const sign = await loadImage('/signature.png')
  const signSize = sign ? await imageSize(sign) : null

  const BODY_TOP = 58
  const BODY_BOTTOM = 262
  let y = BODY_TOP

  // Layout changes by document type (taken from the title)
  const T = String(d.title || '').toUpperCase()
  const hidePrices = T === 'PACKING SLIP' || T === 'WORK ORDER'
  const partyLabel =
    T === 'PURCHASE ORDER' ? 'VENDOR' : T === 'PACKING SLIP' ? 'SHIP TO' : T === 'WORK ORDER' ? 'CUSTOMER' : 'BILL TO'
  const qtyLabel = T === 'TIMESHEET' ? 'HOURS' : 'QTY'
  const rateLabel = T === 'TIMESHEET' ? 'RATE / HR (RM)' : 'RATE (RM)'
  const descWidth = hidePrices ? 140 : 92

  function fill(c) {
    pdf.setFillColor(c[0], c[1], c[2])
  }
  function color(c) {
    pdf.setTextColor(c[0], c[1], c[2])
  }
  function stroke(c) {
    pdf.setDrawColor(c[0], c[1], c[2])
  }

  function newPage() {
    pdf.addPage()
    y = BODY_TOP
  }

  function ensure(h) {
    if (y + h > BODY_BOTTOM) newPage()
  }

  // ---------- Header and footer (drawn on every page) ----------
  function headerWave(depth, c) {
    fill(c)
    pdf.lines(
      [
        [W, 0],
        [0, depth],
        [-70, 9, -140, -11, -W, -3],
      ],
      0,
      0,
      [1, 1],
      'F',
      true
    )
  }

  function drawHeader() {
    headerWave(46, RED)
    headerWave(41, BLACK)

    // logo inside a light circle
    fill(LOGO_BG)
    pdf.setFillColor(...RED)
    pdf.circle(27, 21, 14.3, 'F')
    pdf.setFillColor(...LOGO_BG)
    pdf.circle(27, 21, 13.5, 'F')
    if (logo && logoSize) {
      const s = fit(logoSize, 24)
      pdf.addImage(logo, 'PNG', 27 - s.w / 2, 21 - s.h / 2, s.w, s.h)
    }

    pdf.setFont('helvetica', 'bold')
    pdf.setFontSize(14)
    color(DEEP)
    pdf.text(COMPANY.name, 45, 17)
    pdf.setFont('helvetica', 'normal')
    pdf.setFontSize(8.5)
    color(ROSE)
    pdf.text('IT Services  \u2022  Solutions  \u2022  Support', 45, 23)
    color(MUTED)
    pdf.setFontSize(7.5)
    if (d.showAddress !== false) pdf.text(COMPANY.addressLines.join(' '), 45, 29, { maxWidth: 100 })

    pdf.setFont('helvetica', 'bold')
    let tsz = 22
    pdf.setFontSize(tsz)
    while (tsz > 11 && pdf.getTextWidth(d.title) > 44) {
      tsz -= 1
      pdf.setFontSize(tsz)
    }
    color(DEEP)
    pdf.text(d.title, 196, 21, { align: 'right' })
    pdf.setFontSize(10)
    color(ROSE)
    pdf.text('# ' + d.number, 196, 29, { align: 'right' })
  }

  function footerWave(top, c) {
    fill(c)
    pdf.lines(
      [
        [70, -7, 140, 7, W, -3],
        [0, 40],
        [-W, 0],
      ],
      0,
      top,
      [1, 1],
      'F',
      true
    )
  }

  function drawFooter(page, pages) {
    footerWave(274, RED)
    footerWave(278, BLACK)

    pdf.setFont('helvetica', 'normal')
    pdf.setFontSize(8)
    color(DEEP)
    pdf.text('Tel: ' + COMPANY.phone, 14, 288)
    pdf.text(COMPANY.email, 105, 288, { align: 'center' })
    pdf.text(COMPANY.website, 196, 288, { align: 'right' })
    pdf.setFontSize(7)
    color(MUTED)
    pdf.text('Page ' + page + ' of ' + pages, 105, 293, { align: 'center' })
  }

  // ---------- Bill to + details box ----------
  const c = d.customer
  const custLines = []
  if (c) {
    if (c.address) custLines.push(c.address)
    const cityLine = [c.postcode, c.city, c.state].filter(Boolean).join(' ')
    if (cityLine) custLines.push(cityLine)
    if (c.phone) custLines.push('Tel: ' + c.phone)
    if (c.email) custLines.push(c.email)
    if (c.tax_id) custLines.push('Tax ID: ' + c.tax_id)
  }

  pdf.setFont('helvetica', 'bold')
  pdf.setFontSize(8)
  color(RED)
  pdf.text(partyLabel, 14, y)
  pdf.setFontSize(12)
  color(TEXT)
  pdf.text(String(c ? c.name : 'Customer').toUpperCase(), 14, y + 6.5, { maxWidth: 100 })
  pdf.setFont('helvetica', 'normal')
  pdf.setFontSize(9.5)
  color(MUTED)
  let ly = y + 12.5
  custLines.forEach((line) => {
    pdf.splitTextToSize(line, 95).forEach((part) => {
      pdf.text(part, 14, ly)
      ly += 4.7
    })
  })

  // details box (right)
  const boxX = 124
  const boxW = 72
  const rows = [['Date', fmtDate(d.issueDate)]]
  if (d.dueDate) rows.push([d.dueLabel, fmtDate(d.dueDate)])
  if (d.showPaid) rows.push(['Balance Due', money(d.balance)])
  const boxH = 9 + rows.length * 7 + 2
  fill(BOX)
  pdf.roundedRect(boxX, y - 4, boxW, boxH, 2, 2, 'F')
  fill(RED)
  pdf.roundedRect(boxX, y - 4, boxW, 8, 2, 2, 'F')
  pdf.rect(boxX, y, boxW, 4, 'F')
  pdf.setFont('helvetica', 'bold')
  pdf.setFontSize(9)
  color(WHITE)
  pdf.text(d.number, boxX + boxW / 2, y + 1.2, { align: 'center' })
  let ry = y + 11
  rows.forEach((r) => {
    pdf.setFont('helvetica', 'normal')
    pdf.setFontSize(9)
    color(MUTED)
    pdf.text(r[0], boxX + 4, ry)
    pdf.setFont('helvetica', 'bold')
    color(TEXT)
    pdf.text(r[1], boxX + boxW - 4, ry, { align: 'right' })
    ry += 7
  })

  y = Math.max(ly, y - 4 + boxH) + 8

  // ---------- Items table ----------
  function tableHeader() {
    fill(BLACK)
    pdf.rect(14, y, 182, 9, 'F')
    fill(RED)
    pdf.rect(14, y + 9, 182, 0.8, 'F')
    pdf.setFont('helvetica', 'bold')
    pdf.setFontSize(9)
    color(DEEP)
    pdf.text('NO', 18, y + 6)
    pdf.text('DESCRIPTION', 28, y + 6)
    if (hidePrices) {
      pdf.text(qtyLabel, 193, y + 6, { align: 'right' })
    } else {
      pdf.text(qtyLabel, 128, y + 6, { align: 'right' })
      pdf.text(rateLabel, 160, y + 6, { align: 'right' })
      pdf.text('AMOUNT (RM)', 193, y + 6, { align: 'right' })
    }
    y += 10
  }
  tableHeader()

  d.items.forEach((it, idx) => {
    const parts = String(it.description).split('\n')
    const title = parts[0]
    const rest = parts.slice(1).join('\n')
    pdf.setFont('helvetica', 'bold')
    pdf.setFontSize(9.5)
    const titleLines = pdf.splitTextToSize(title, descWidth)
    pdf.setFont('helvetica', 'normal')
    pdf.setFontSize(8.5)
    const restLines = rest ? pdf.splitTextToSize(rest, descWidth) : []
    const h = titleLines.length * 4.6 + restLines.length * 4 + 5

    if (y + h > BODY_BOTTOM) {
      newPage()
      tableHeader()
    }

    if (idx % 2 === 1) {
      fill([250, 250, 251])
      pdf.rect(14, y, 182, h, 'F')
    }

    pdf.setFont('helvetica', 'normal')
    pdf.setFontSize(9.5)
    color(TEXT)
    pdf.text(String(idx + 1), 18, y + 5.2)

    pdf.setFont('helvetica', 'bold')
    pdf.text(titleLines, 28, y + 5.2)
    let ty = y + 5.2 + titleLines.length * 4.6
    if (restLines.length) {
      pdf.setFont('helvetica', 'normal')
      pdf.setFontSize(8.5)
      color(MUTED)
      pdf.text(restLines, 28, ty - 0.6)
    }

    pdf.setFont('helvetica', 'normal')
    pdf.setFontSize(9.5)
    color(TEXT)
    if (hidePrices) {
      pdf.text(String(Number(it.quantity)), 193, y + 5.2, { align: 'right' })
    } else {
      pdf.text(String(Number(it.quantity)), 128, y + 5.2, { align: 'right' })
      pdf.text(num(it.unit_price), 160, y + 5.2, { align: 'right' })
      pdf.setFont('helvetica', 'bold')
      pdf.text(num(it.line_total), 193, y + 5.2, { align: 'right' })
    }

    y += h
    stroke(LINE)
    pdf.setLineWidth(0.25)
    pdf.line(14, y, 196, y)
  })

  // ---------- Totals (not shown on Packing Slip and Work Order) ----------
  y += 7
  if (!hidePrices) {
    ensure(54)
    const totalRow = (label, value) => {
      pdf.setFont('helvetica', 'normal')
      pdf.setFontSize(10)
      color(MUTED)
      pdf.text(label, 126, y)
      color(TEXT)
      pdf.text('RM', 166, y)
      pdf.text(value, 192, y, { align: 'right' })
      y += 6.5
    }
    // Subtotal only appears when there is a discount or tax (otherwise it just repeats the total)
    if (d.discount > 0 || d.taxRate > 0) totalRow('Subtotal', num(d.subtotal))
    if (d.discount > 0) totalRow('Discount', '-' + num(d.discount))
    if (d.taxRate > 0) totalRow('Tax (' + d.taxRate + '%)', num(d.taxAmount))

    y += 3.5
    fill(RED)
    pdf.roundedRect(122, y - 4.8, 74, 10, 1.5, 1.5, 'F')
    pdf.setFont('helvetica', 'bold')
    pdf.setFontSize(11)
    color(WHITE)
    pdf.text('Total Amount', 126, y + 1.6)
    pdf.text('RM', 166, y + 1.6)
    pdf.text(num(d.total), 192, y + 1.6, { align: 'right' })
    pdf.setFont('helvetica', 'bold')
    pdf.setFontSize(8.5)
    pdf.setTextColor(...DEEP)
    drawAmountWords(pdf, d.total, 14, y + 1.6, 102)
    y += 16
    if (d.showPaid) {
      totalRow('Paid', num(d.paid))
      pdf.setFont('helvetica', 'bold')
      pdf.setFontSize(10.5)
      color(RED)
      pdf.text('Balance Due', 126, y)
      pdf.text('RM', 166, y)
      pdf.text(num(d.balance), 192, y, { align: 'right' })
      y += 8
    }
  }

  // ---------- Text boxes ----------
  function textBox(heading, text, bg, barColor) {
    pdf.setFont('helvetica', 'normal')
    pdf.setFontSize(9)
    const parts = layoutText(pdf, text, 168)
    const h = rowsHeight(parts, 4.4) + 13
    ensure(h + 4)
    fill(bg)
    pdf.roundedRect(14, y, 182, h, 2, 2, 'F')
    fill(barColor)
    pdf.rect(14, y + 1, 1.6, h - 2, 'F')
    pdf.setFont('helvetica', 'bold')
    pdf.setFontSize(9.5)
    color(barColor)
    pdf.text(heading, 20, y + 6)
    pdf.setFont('helvetica', 'normal')
    pdf.setFontSize(9)
    color(TEXT)
    drawRows(pdf, parts, 20, y + 11.5, 4.4)
    y += h + 5
  }

  // box with aligned "label : value" lines
  function infoBox(heading, pairs, bg, barColor) {
    const h = pairs.length * 5.2 + 13
    ensure(h + 4)
    fill(bg)
    pdf.roundedRect(14, y, 182, h, 2, 2, 'F')
    fill(barColor)
    pdf.rect(14, y + 1, 1.6, h - 2, 'F')
    pdf.setFont('helvetica', 'bold')
    pdf.setFontSize(9.5)
    color(barColor)
    pdf.text(heading, 20, y + 6)
    pdf.setFontSize(9)
    pairs.forEach((p, i) => {
      const ly2 = y + 12 + i * 5.2
      pdf.setFont('helvetica', 'normal')
      color(MUTED)
      pdf.text(p[0], 20, ly2)
      color(TEXT)
      pdf.text(':', 52, ly2)
      pdf.setFont('helvetica', 'bold')
      pdf.text(String(p[1]), 56, ly2)
    })
    y += h + 5
  }

  // Notes or terms that may contain titled sections ("## Title" then text, "- " for bullets)
  function richBox(heading, text, bg, barColor) {
    if (!String(text).includes('## ')) {
      textBox(heading, text, bg, barColor)
      return
    }
    const sections = []
    let cur = { title: '', lines: [] }
    String(text).split('\n').forEach((ln) => {
      if (ln.startsWith('## ')) {
        if (cur.title || cur.lines.some((l) => l.trim())) sections.push(cur)
        cur = { title: ln.slice(3).trim(), lines: [] }
      } else cur.lines.push(ln)
    })
    if (cur.title || cur.lines.some((l) => l.trim())) sections.push(cur)

    ensure(20)
    fill(barColor)
    pdf.rect(14, y - 4, 2.2, 6.5, 'F')
    pdf.setFont('helvetica', 'bold')
    pdf.setFontSize(10.5)
    color(DEEP)
    pdf.text(heading, 20, y + 0.8)
    y += 8

    sections.forEach((sec) => {
      const items = []
      pdf.setFont('helvetica', 'normal')
      pdf.setFontSize(8.8)
      let flat = []
      const flushFlat = () => {
        if (!flat.length) return
        layoutText(pdf, flat.join('\n'), 182)
          .filter((r) => r.type !== 'gap')
          .forEach((r) => items.push({ row: r, flat: true }))
        flat = []
      }
      sec.lines.forEach((ln) => {
        const t = ln.trim()
        if (!t) return
        if (t.startsWith('- ')) {
          flushFlat()
          pdf.splitTextToSize(t.slice(2), 172).forEach((part, i) => items.push({ t: part, bullet: i === 0 }))
        } else flat.push(t)
      })
      flushFlat()
      const need = (sec.title ? 6 : 0) + items.length * 4.3 + 3
      ensure(Math.min(need, 40))
      if (sec.title) {
        pdf.setFont('helvetica', 'bold')
        pdf.setFontSize(9.8)
        color(TEXT)
        pdf.text(sec.title, 14, y)
        y += 5.4
      }
      pdf.setFont('helvetica', 'normal')
      pdf.setFontSize(8.8)
      color(MUTED)
      items.forEach((it) => {
        if (y + 4.3 > BODY_BOTTOM) newPage()
        if (it.bullet) {
          color(barColor)
          pdf.text('\u2022', 15.5, y)
          color(MUTED)
        }
        if (it.row) drawRows(pdf, [it.row], 14, y, 4.3)
        else pdf.text(it.t, 20, y)
        y += 4.3
      })
      y += 3.5
    })
    y += 2
  }

  y += 2
  if (d.terms) richBox('Terms & Conditions', d.terms, BOX, RED)
  if (d.showBank) {
    infoBox(
      'Payment Information',
      [
        ['Bank Name', COMPANY.bank.bankName],
        ['Account Name', COMPANY.bank.accountName],
        ['Account Number', COMPANY.bank.accountNumber],
      ],
      BOX,
      RED
    )
  }
  if (d.notes) richBox('Notes', d.notes, PINK, RED)

  // ---------- Signature ----------
  ensure(38)
  y += 4
  // our signature: left side for Packing Slip and Work Order, right side for the others
  const sx = hidePrices ? 14 : 140
  if (sign && signSize) {
    const s = fit(signSize, 18)
    pdf.addImage(sign, 'PNG', sx + 28 - s.w / 2, y, s.w, s.h)
  }
  stroke(DEEP)
  pdf.setLineWidth(0.4)
  pdf.line(sx, y + 20, sx + 56, y + 20)
  pdf.setFont('helvetica', 'bold')
  pdf.setFontSize(9.5)
  color(TEXT)
  pdf.text('Demo User', sx + 28, y + 25, { align: 'center' })
  pdf.setFont('helvetica', 'normal')
  pdf.setFontSize(8.5)
  color(MUTED)
  pdf.text(hidePrices ? 'Prepared by' : 'Director', sx + 28, y + 29.5, { align: 'center' })
  pdf.text('Demo IT Solutions Sdn Bhd', sx + 28, y + 34, { align: 'center' })

  if (hidePrices) {
    // blank line for the customer to sign
    stroke(DEEP)
    pdf.setLineWidth(0.4)
    pdf.line(140, y + 20, 196, y + 20)
    pdf.setFont('helvetica', 'bold')
    pdf.setFontSize(9.5)
    color(TEXT)
    pdf.text(T === 'WORK ORDER' ? 'Customer Acceptance' : 'Received by', 168, y + 25, { align: 'center' })
    pdf.setFont('helvetica', 'normal')
    pdf.setFontSize(8.5)
    color(MUTED)
    pdf.text('Name, signature and date', 168, y + 29.5, { align: 'center' })
  }

  // ---------- Header + footer on every page ----------
  const pages = pdf.getNumberOfPages()
  for (let i = 1; i <= pages; i++) {
    pdf.setPage(i)
    drawHeader()
    drawFooter(i, pages)
  }

  pdf.save(d.number + '.pdf')
}