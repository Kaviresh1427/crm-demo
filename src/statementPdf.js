import { jsPDF } from 'jspdf'
import { COMPANY, showCompanyAddress } from './docSettings'
import { drawAmountWords } from './pdfText'

const RED = [214, 40, 48]
const BLACK = [251, 236, 237] // soft blush band (easy on the eyes)
const ROSE = [200, 36, 46]
const DEEP = [92, 16, 24]
const WHITE = [255, 255, 255]
const BOX = [244, 244, 246]
const TEXT = [25, 25, 28]
const MUTED = [105, 105, 112]
const LINE = [221, 221, 226]
const LOGO_BG = [255, 255, 255]

const MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

function fmtDate(d) {
  if (!d) return ''
  const [y, m, day] = String(d).slice(0, 10).split('-')
  return String(Number(day)).padStart(2, '0') + ' ' + MON[Number(m) - 1] + ' ' + y
}

function num(n) {
  const v = Number(n || 0)
  const s = Math.abs(v).toLocaleString('en-MY', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
  return (v < 0 ? '-' : '') + s
}

function money(n) {
  const v = Number(n || 0)
  const s = Math.abs(v).toLocaleString('en-MY', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
  return (v < 0 ? '- RM ' : 'RM ') + s
}

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

// d = { customer, rows, invoiced, paid, credits, owing, date }
// rows = invoices and credit notes (doc_number, doc_type, issue_date, total, amount_paid)
export async function downloadStatementPdf(d) {
  const pdf = new jsPDF({ unit: 'mm', format: 'a4' })
  const W = 210
  const logo = await loadImage('/logo.png')
  const logoSize = logo ? await imageSize(logo) : null

  const BODY_TOP = 58
  const BODY_BOTTOM = 262
  let y = BODY_TOP

  const stamp = String(d.date).replace(/-/g, '')
  const number = 'ST-' + stamp

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

  function headerWave(depth, c) {
    fill(c)
    pdf.lines([[W, 0], [0, depth], [-70, 9, -140, -11, -W, -3]], 0, 0, [1, 1], 'F', true)
  }

  function drawHeader() {
    headerWave(46, RED)
    headerWave(41, BLACK)
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
    if (d.showAddress !== undefined ? d.showAddress : showCompanyAddress()) {
      pdf.text(COMPANY.addressLines.join(' '), 45, 29, { maxWidth: 100 })
    }
    pdf.setFont('helvetica', 'bold')
    let tsz = 18
    pdf.setFontSize(tsz)
    while (tsz > 10 && pdf.getTextWidth('ACCOUNT STATEMENT') > 44) {
      tsz -= 1
      pdf.setFontSize(tsz)
    }
    color(DEEP)
    pdf.text('ACCOUNT STATEMENT', 196, 21, { align: 'right' })
    pdf.setFontSize(10)
    color(ROSE)
    pdf.text('# ' + number, 196, 29, { align: 'right' })
  }

  function footerWave(top, c) {
    fill(c)
    pdf.lines([[70, -7, 140, 7, W, -3], [0, 40], [-W, 0]], 0, top, [1, 1], 'F', true)
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

  // ---------- Customer + statement box ----------
  const c = d.customer || {}
  const custLines = []
  if (c.address) custLines.push(c.address)
  const cityLine = [c.postcode, c.city, c.state].filter(Boolean).join(' ')
  if (cityLine) custLines.push(cityLine)
  if (c.phone) custLines.push('Tel: ' + c.phone)
  if (c.email) custLines.push(c.email)

  pdf.setFont('helvetica', 'bold')
  pdf.setFontSize(8)
  color(RED)
  pdf.text('STATEMENT FOR', 14, y)
  pdf.setFontSize(12)
  color(TEXT)
  pdf.text(String(c.name || 'Customer').toUpperCase(), 14, y + 6.5, { maxWidth: 100 })
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

  const boxX = 124
  const boxW = 72
  const rows = [
    ['Statement Date', fmtDate(d.date)],
    ['Amount Due', money(d.owing)],
  ]
  const boxH = 9 + rows.length * 7 + 2
  fill(BOX)
  pdf.roundedRect(boxX, y - 4, boxW, boxH, 2, 2, 'F')
  fill(RED)
  pdf.roundedRect(boxX, y - 4, boxW, 8, 2, 2, 'F')
  pdf.rect(boxX, y, boxW, 4, 'F')
  pdf.setFont('helvetica', 'bold')
  pdf.setFontSize(9)
  color(WHITE)
  pdf.text(number, boxX + boxW / 2, y + 1.2, { align: 'center' })
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

  // ---------- Table ----------
  function tableHeader() {
    fill(BLACK)
    pdf.rect(14, y, 182, 9, 'F')
    fill(RED)
    pdf.rect(14, y + 9, 182, 0.8, 'F')
    pdf.setFont('helvetica', 'bold')
    pdf.setFontSize(9)
    color(DEEP)
    pdf.text('DATE', 18, y + 6)
    pdf.text('DOCUMENT NO.', 46, y + 6)
    pdf.text('TYPE', 88, y + 6)
    pdf.text('AMOUNT (RM)', 133, y + 6, { align: 'right' })
    pdf.text('PAID (RM)', 164, y + 6, { align: 'right' })
    pdf.text('BALANCE (RM)', 193, y + 6, { align: 'right' })
    y += 10
  }
  tableHeader()

  d.rows.forEach((r, idx) => {
    const h = 8
    if (y + h > BODY_BOTTOM) {
      newPage()
      tableHeader()
    }
    if (idx % 2 === 1) {
      fill([250, 250, 251])
      pdf.rect(14, y, 182, h, 'F')
    }
    const isInv = r.doc_type === 'invoice'
    const bal = isInv ? Number(r.total || 0) - Number(r.amount_paid || 0) : -Number(r.total || 0)
    pdf.setFont('helvetica', 'normal')
    pdf.setFontSize(9.5)
    color(TEXT)
    pdf.text(fmtDate(r.issue_date), 18, y + 5.4)
    pdf.setFont('helvetica', 'bold')
    pdf.text(String(r.doc_number), 46, y + 5.4)
    pdf.setFont('helvetica', 'normal')
    pdf.text(isInv ? 'Invoice' : 'Credit Note', 88, y + 5.4)
    pdf.text(num(r.total), 133, y + 5.4, { align: 'right' })
    pdf.text(isInv ? num(r.amount_paid) : '-', 164, y + 5.4, { align: 'right' })
    pdf.setFont('helvetica', 'bold')
    pdf.text(num(bal), 193, y + 5.4, { align: 'right' })
    y += h
    stroke(LINE)
    pdf.setLineWidth(0.25)
    pdf.line(14, y, 196, y)
  })

  // ---------- Summary ----------
  y += 8
  ensure(48)
  function sumRow(label, value) {
    pdf.setFont('helvetica', 'normal')
    pdf.setFontSize(10)
    color(MUTED)
    pdf.text(label, 126, y)
    color(TEXT)
    pdf.text('RM', 166, y)
    pdf.text(value, 192, y, { align: 'right' })
    y += 6.5
  }
  sumRow('Total Invoiced', num(d.invoiced))
  sumRow('Total Paid', num(d.paid))
  if (d.credits > 0) sumRow('Credit Notes', '-' + num(d.credits))

  y += 3.5
  fill(RED)
  pdf.roundedRect(122, y - 4.8, 74, 10, 1.5, 1.5, 'F')
  pdf.setFont('helvetica', 'bold')
  pdf.setFontSize(11)
  color(WHITE)
  pdf.text('Total Outstanding', 126, y + 1.6)
  pdf.text('RM', 166, y + 1.6)
  pdf.text(num(d.owing), 192, y + 1.6, { align: 'right' })
  pdf.setFont('helvetica', 'bold')
  pdf.setFontSize(8.5)
  pdf.setTextColor(...DEEP)
  drawAmountWords(pdf, d.owing, 14, y + 1.6, 102)
  y += 18

  // ---------- Bank details ----------
  const bankPairs = [
    ['Bank Name', COMPANY.bank.bankName],
    ['Account Name', COMPANY.bank.accountName],
    ['Account Number', COMPANY.bank.accountNumber],
  ]
  const bh = bankPairs.length * 5.2 + 13 + 5
  ensure(bh + 4)
  fill(BOX)
  pdf.roundedRect(14, y, 182, bh, 2, 2, 'F')
  fill(RED)
  pdf.rect(14, y + 1, 1.6, bh - 2, 'F')
  pdf.setFont('helvetica', 'bold')
  pdf.setFontSize(9.5)
  color(RED)
  pdf.text('Payment Information', 20, y + 6)
  pdf.setFontSize(9)
  bankPairs.forEach((p, i) => {
    const ly2 = y + 12 + i * 5.2
    pdf.setFont('helvetica', 'normal')
    color(MUTED)
    pdf.text(p[0], 20, ly2)
    color(TEXT)
    pdf.text(':', 52, ly2)
    pdf.setFont('helvetica', 'bold')
    pdf.text(String(p[1]), 56, ly2)
  })
  pdf.setFont('helvetica', 'normal')
  color(MUTED)
  pdf.text('Please use the invoice number as the payment reference.', 20, y + 12 + bankPairs.length * 5.2)

  const pages = pdf.getNumberOfPages()
  for (let i = 1; i <= pages; i++) {
    pdf.setPage(i)
    drawHeader()
    drawFooter(i, pages)
  }

  const safeName = String(c.name || 'Customer').replace(/[^a-zA-Z0-9]+/g, '-').replace(/^-|-$/g, '')
  pdf.save('Statement-' + safeName + '-' + stamp + '.pdf')
}