import { jsPDF } from 'jspdf'
import { COMPANY, showCompanyAddress } from './docSettings'

// Edit these lines any time. They print on page 2 of the letter.
const TERMS = [
  'The customer is responsible for backing up all data before leaving the device with us. We are not responsible for any data loss.',
  'The estimated cost is only a guide. If the final cost will be higher, we will inform you and wait for your approval before doing extra work.',
  'Please bring this letter (or show the job number) when collecting your device.',
  'Accessories not listed in this letter are not recorded as received.',
  'We will contact you using the phone number written in this letter once the device is ready.',
]

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

const MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

function fmtDate(d) {
  if (!d) return ''
  const [y, m, day] = String(d).slice(0, 10).split('-')
  return String(Number(day)).padStart(2, '0') + ' ' + MON[Number(m) - 1] + ' ' + y
}

function money(n) {
  return 'RM ' + Number(n || 0).toLocaleString('en-MY', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
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

// d = { job_no, received_date, customer, contact_name, contact_phone, devices,
//       problem_description, condition_notes, estimated_cost }
export async function downloadItemReceiptPdf(d) {
  const pdf = new jsPDF({ unit: 'mm', format: 'a4' })
  const W = 210
  const logo = await loadImage('/logo.png')
  const logoSize = logo ? await imageSize(logo) : null
  const sign = await loadImage('/signature.png')
  const signSize = sign ? await imageSize(sign) : null

  const BODY_TOP = 58
  const BODY_BOTTOM = 262
  let y = BODY_TOP

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
    let tsz = 16
    pdf.setFontSize(tsz)
    while (tsz > 10 && pdf.getTextWidth('ITEM RECEIPT LETTER') > 44) {
      tsz -= 1
      pdf.setFontSize(tsz)
    }
    color(DEEP)
    pdf.text('ITEM RECEIPT LETTER', 196, 21, { align: 'right' })
    pdf.setFontSize(10)
    color(ROSE)
    pdf.text('Job No: ' + d.job_no, 196, 29, { align: 'right' })
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

  // ---------- Customer + job box ----------
  const c = d.customer || {}
  const lines = []
  if (d.contact_name && d.contact_name !== c.name) lines.push('Contact: ' + d.contact_name)
  if (d.contact_phone) lines.push('Tel: ' + d.contact_phone)
  if (c.address) lines.push(c.address)
  const cityLine = [c.postcode, c.city, c.state].filter(Boolean).join(' ')
  if (cityLine) lines.push(cityLine)

  pdf.setFont('helvetica', 'bold')
  pdf.setFontSize(8)
  color(RED)
  pdf.text('RECEIVED FROM', 14, y)
  pdf.setFontSize(12)
  color(TEXT)
  pdf.text(String(c.name || d.contact_name || 'Customer').toUpperCase(), 14, y + 6.5, { maxWidth: 100 })
  pdf.setFont('helvetica', 'normal')
  pdf.setFontSize(9.5)
  color(MUTED)
  let ly = y + 12.5
  lines.forEach((line) => {
    pdf.splitTextToSize(line, 95).forEach((part) => {
      pdf.text(part, 14, ly)
      ly += 4.7
    })
  })

  const boxX = 124
  const boxW = 72
  const rows = [['Date Received', fmtDate(d.received_date)]]
  if (Number(d.estimated_cost) > 0) rows.push(['Estimated Cost', money(d.estimated_cost)])
  const boxH = 9 + rows.length * 7 + 2
  fill(BOX)
  pdf.roundedRect(boxX, y - 4, boxW, boxH, 2, 2, 'F')
  fill(RED)
  pdf.roundedRect(boxX, y - 4, boxW, 8, 2, 2, 'F')
  pdf.rect(boxX, y, boxW, 4, 'F')
  pdf.setFont('helvetica', 'bold')
  pdf.setFontSize(9)
  color(WHITE)
  pdf.text(d.job_no, boxX + boxW / 2, y + 1.2, { align: 'center' })
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

  // ---------- Devices table ----------
  function tableHeader() {
    fill(BLACK)
    pdf.rect(14, y, 182, 9, 'F')
    fill(RED)
    pdf.rect(14, y + 9, 182, 0.8, 'F')
    pdf.setFont('helvetica', 'bold')
    pdf.setFontSize(9)
    color(DEEP)
    pdf.text('NO', 18, y + 6)
    pdf.text('DEVICE', 28, y + 6)
    pdf.text('BRAND / MODEL', 62, y + 6)
    pdf.text('SERIAL NO.', 112, y + 6)
    pdf.text('ACCESSORIES', 150, y + 6)
    y += 10
  }
  tableHeader()

  d.devices.forEach((dev, idx) => {
    pdf.setFont('helvetica', 'normal')
    pdf.setFontSize(9)
    const bm = pdf.splitTextToSize([dev.brand, dev.model].filter(Boolean).join(' ') || '-', 46)
    const sn = pdf.splitTextToSize(dev.serial_no || '-', 34)
    const ac = pdf.splitTextToSize(dev.accessories || '-', 44)
    const n = Math.max(bm.length, sn.length, ac.length, 1)
    const h = n * 4.4 + 4

    if (y + h > BODY_BOTTOM) {
      newPage()
      tableHeader()
    }
    if (idx % 2 === 1) {
      fill([250, 250, 251])
      pdf.rect(14, y, 182, h, 'F')
    }
    color(TEXT)
    pdf.text(String(idx + 1), 18, y + 5)
    pdf.setFont('helvetica', 'bold')
    pdf.text(pdf.splitTextToSize(dev.device_type || '-', 30), 28, y + 5)
    pdf.setFont('helvetica', 'normal')
    pdf.text(bm, 62, y + 5)
    pdf.text(sn, 112, y + 5)
    pdf.text(ac, 150, y + 5)
    y += h
    stroke(LINE)
    pdf.setLineWidth(0.25)
    pdf.line(14, y, 196, y)
  })

  y += 8

  // ---------- Text boxes ----------
  function textBox(heading, text, bg, barColor) {
    pdf.setFont('helvetica', 'normal')
    pdf.setFontSize(9)
    const parts = pdf.splitTextToSize(text, 168)
    const h = parts.length * 4.4 + 13
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
    pdf.text(parts, 20, y + 11.5)
    y += h + 5
  }

  textBox('Problem Reported', d.problem_description || 'Not stated', BOX, DEEP)
  textBox('Condition When Received', d.condition_notes || 'No visible damage noted', PINK, RED)

  // ---------- Signatures ----------
  ensure(40)
  y += 6
  // customer signature (left, blank line)
  stroke(DEEP)
  pdf.setLineWidth(0.4)
  pdf.line(14, y + 20, 70, y + 20)
  pdf.setFont('helvetica', 'bold')
  pdf.setFontSize(9.5)
  color(TEXT)
  pdf.text('Customer Signature', 42, y + 25, { align: 'center' })
  pdf.setFont('helvetica', 'normal')
  pdf.setFontSize(8.5)
  color(MUTED)
  pdf.text('Name and date', 42, y + 29.5, { align: 'center' })

  // our signature (right)
  const sx = 140
  if (sign && signSize) {
    const s = fit(signSize, 18)
    pdf.addImage(sign, 'PNG', sx + 28 - s.w / 2, y, s.w, s.h)
  }
  pdf.line(sx, y + 20, sx + 56, y + 20)
  pdf.setFont('helvetica', 'bold')
  pdf.setFontSize(9.5)
  color(TEXT)
  pdf.text('Demo User', sx + 28, y + 25, { align: 'center' })
  pdf.setFont('helvetica', 'normal')
  pdf.setFontSize(8.5)
  color(MUTED)
  pdf.text('Received by', sx + 28, y + 29.5, { align: 'center' })
  pdf.text('Demo IT Solutions Sdn Bhd', sx + 28, y + 34, { align: 'center' })

  // ---------- Page 2: terms ----------
  newPage()
  pdf.setFont('helvetica', 'bold')
  pdf.setFontSize(12)
  color(TEXT)
  pdf.text('Terms of Service', 14, y)
  y += 8
  TERMS.forEach((t, i) => {
    pdf.setFont('helvetica', 'normal')
    pdf.setFontSize(9.5)
    const parts = pdf.splitTextToSize(t, 172)
    const h = parts.length * 4.8 + 4
    ensure(h)
    pdf.setFont('helvetica', 'bold')
    color(RED)
    pdf.text(String(i + 1) + '.', 14, y)
    pdf.setFont('helvetica', 'normal')
    color(TEXT)
    pdf.text(parts, 22, y)
    y += h
  })
  y += 6
  pdf.setFont('helvetica', 'normal')
  pdf.setFontSize(9)
  color(MUTED)
  pdf.text('By signing page 1, the customer agrees to the terms above.', 14, y)

  const pages = pdf.getNumberOfPages()
  for (let i = 1; i <= pages; i++) {
    pdf.setPage(i)
    drawHeader()
    drawFooter(i, pages)
  }

  pdf.save(d.job_no + '.pdf')
}