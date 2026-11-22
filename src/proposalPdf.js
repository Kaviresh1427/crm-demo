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
const SOFT = [108, 74, 78]

function lines(text) {
  return String(text || '')
    .split('\n')
    .map((s) => s.trim())
    .filter(Boolean)
}

function num(n) {
  return Number(n || 0).toLocaleString('en-MY', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

function money(n) {
  return (
    'RM ' +
    Number(n || 0).toLocaleString('en-MY', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
  )
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

// p = the proposal text, customer = the chosen customer (or null)
export async function downloadProposalPdf(p, customer) {
  const pdf = new jsPDF({ unit: 'mm', format: 'a4' })
  const logo = await loadImage('/logo.png')
  const logoSize = logo ? await imageSize(logo) : null
  const customerName = customer && customer.name ? customer.name : ''

  // ---------- Page 1: cover ----------
  pdf.setFillColor(...BLACK)
  pdf.rect(0, 0, 210, 297, 'F')
  pdf.setDrawColor(...RED)
  pdf.setLineWidth(0.6)
  pdf.rect(8, 8, 194, 281)

  pdf.setFillColor(...LOGO_BG)
  pdf.setFillColor(...RED)
  pdf.circle(105, 80, 28.8, 'F')
  pdf.setFillColor(...LOGO_BG)
  pdf.circle(105, 80, 28, 'F')
  if (logo && logoSize) {
    const f = fit(logoSize, 49)
    pdf.addImage(logo, 'PNG', 105 - f.w / 2, 80 - f.h / 2, f.w, f.h)
  }

  pdf.setTextColor(...DEEP)
  pdf.setFont('helvetica', 'bold')
  pdf.setFontSize(22)
  pdf.text(COMPANY.name, 105, 128, { align: 'center' })

  pdf.setFillColor(...RED)
  pdf.rect(85, 136, 40, 1, 'F')

  pdf.setTextColor(...ROSE)
  pdf.setFontSize(18)
  pdf.text('PROPOSAL', 105, 152, { align: 'center' })

  if (p.title) {
    pdf.setFont('helvetica', 'bold')
    pdf.setFontSize(14)
    pdf.setTextColor(...DEEP)
    pdf.text(pdf.splitTextToSize(p.title, 150), 105, 166, { align: 'center' })
  }

  let cy = 200
  pdf.setFont('helvetica', 'normal')
  pdf.setFontSize(10)
  pdf.setTextColor(...SOFT)
  if (customerName) {
    pdf.text('PREPARED FOR', 105, cy, { align: 'center' })
    pdf.setFont('helvetica', 'bold')
    pdf.setFontSize(13)
    pdf.setTextColor(...DEEP)
    pdf.text(customerName, 105, cy + 8, { align: 'center' })
    cy += 20
  }
  pdf.setFont('helvetica', 'normal')
  pdf.setFontSize(10)
  pdf.setTextColor(...SOFT)
  const facts = []
  if (p.proposal_date) facts.push('Date: ' + p.proposal_date)
  if (p.valid_until) facts.push('Valid until: ' + p.valid_until)
  if (facts.length) pdf.text(facts.join('   |   '), 105, cy, { align: 'center' })

  pdf.setFontSize(10)
  pdf.setTextColor(...DEEP)
  pdf.text(COMPANY.phone + '   |   ' + COMPANY.email, 105, 262, { align: 'center' })
  pdf.text(COMPANY.website, 105, 269, { align: 'center' })
  pdf.setFontSize(9)
  pdf.setTextColor(...SOFT)
  if (showCompanyAddress()) pdf.text(COMPANY.addressLines.join(' '), 105, 277, { align: 'center' })

  // ---------- Content pages ----------
  let y = 0

  function newPage() {
    pdf.addPage()
    pdf.setFillColor(...BLACK)
    pdf.rect(0, 0, 210, 18, 'F')
    pdf.setFillColor(...RED)
    pdf.rect(0, 18, 210, 1.2, 'F')
    pdf.setFont('helvetica', 'bold')
    pdf.setFontSize(11)
    pdf.setTextColor(...DEEP)
    pdf.text(COMPANY.name, 14, 12)
    pdf.setTextColor(...ROSE)
    pdf.text('PROPOSAL', 196, 12, { align: 'right' })
    y = 32
  }

  function ensure(need) {
    if (y + need > 277) newPage()
  }

  function heading(text) {
    ensure(16)
    pdf.setFillColor(...RED)
    pdf.rect(14, y - 4.5, 3, 6.5, 'F')
    pdf.setFont('helvetica', 'bold')
    pdf.setFontSize(12)
    pdf.setTextColor(...TEXT)
    pdf.text(text, 20, y)
    y += 9
  }

  function bullet(x, yy) {
    pdf.setFillColor(...RED)
    pdf.circle(x, yy - 1.2, 0.9, 'F')
  }

  function paragraph(text) {
    pdf.setFont('helvetica', 'normal')
    pdf.setFontSize(10.5)
    pdf.setTextColor(...TEXT)
    const rows = pdf.splitTextToSize(text, 182)
    rows.forEach((r) => {
      ensure(6)
      pdf.text(r, 14, y)
      y += 5.4
    })
    y += 6
  }

  function bulletList(text) {
    pdf.setFont('helvetica', 'normal')
    pdf.setFontSize(10.5)
    pdf.setTextColor(...TEXT)
    lines(text).forEach((w) => {
      const l = pdf.splitTextToSize(w, 172)
      ensure(l.length * 5.4 + 2)
      bullet(16, y)
      pdf.text(l, 21, y)
      y += l.length * 5.4 + 2
    })
    y += 6
  }

  newPage()

  // Greeting
  if (customerName) {
    pdf.setFont('helvetica', 'bold')
    pdf.setFontSize(11)
    pdf.setTextColor(...TEXT)
    pdf.text('Dear ' + customerName + ',', 14, y)
    y += 9
  }

  if (p.intro) {
    heading('INTRODUCTION')
    paragraph(p.intro)
  }

  if (lines(p.scope).length) {
    heading('SCOPE OF WORK')
    bulletList(p.scope)
  }

  if (lines(p.deliverables).length) {
    heading('DELIVERABLES')
    bulletList(p.deliverables)
  }

  if (lines(p.timeline).length) {
    heading('TIMELINE')
    bulletList(p.timeline)
  }

  // Price table
  const items = (p.items || []).filter((it) => it.description)
  if (items.length) {
    heading('PRICING')
    const colQty = 128
    const colPrice = 152
    const colAmt = 196

    const drawHead = () => {
      pdf.setFillColor(...BLACK)
      pdf.rect(14, y - 5, 182, 8, 'F')
      pdf.setFont('helvetica', 'bold')
      pdf.setFontSize(9)
      pdf.setTextColor(...DEEP)
      pdf.text('DESCRIPTION', 17, y)
      pdf.text('QTY', colQty, y, { align: 'right' })
      pdf.text('UNIT PRICE (RM)', colPrice + 6, y, { align: 'right' })
      pdf.text('AMOUNT (RM)', colAmt - 3, y, { align: 'right' })
      y += 8
    }

    ensure(24)
    drawHead()

    let total = 0
    items.forEach((it, idx) => {
      const qty = Number(it.quantity || 0)
      const price = Number(it.unit_price || 0)
      const amount = Math.round(qty * price * 100) / 100
      total += amount
      pdf.setFont('helvetica', 'normal')
      pdf.setFontSize(10)
      const d = pdf.splitTextToSize(it.description, 92)
      const h = Math.max(7, d.length * 5 + 3)
      if (y + h > 277) {
        newPage()
        drawHead()
      }
      if (idx % 2 === 0) {
        pdf.setFillColor(...BOX)
        pdf.rect(14, y - 5, 182, h, 'F')
      }
      pdf.setTextColor(...TEXT)
      pdf.text(d, 17, y)
      pdf.text(String(qty), colQty, y, { align: 'right' })
      pdf.text(num(price), colPrice + 6, y, { align: 'right' })
      pdf.text(num(amount), colAmt - 3, y, { align: 'right' })
      y += h
    })

    ensure(16)
    y += 2
    pdf.setDrawColor(...LINE)
    pdf.setLineWidth(0.3)
    pdf.line(110, y - 4, 196, y - 4)
    pdf.setFont('helvetica', 'bold')
    pdf.setFontSize(11)
    pdf.setTextColor(...RED)
    pdf.text('TOTAL', 112, y + 2)
    pdf.text('RM', colAmt - 24, y + 2)
    pdf.text(num(total), colAmt - 3, y + 2, { align: 'right' })
    pdf.setFont('helvetica', 'bold')
    pdf.setFontSize(8.5)
    pdf.setTextColor(...DEEP)
    drawAmountWords(pdf, total, 14, y + 1.6, 92)
    y += 14
  }

  if (lines(p.payment_terms).length) {
    heading('PAYMENT TERMS')
    bulletList(p.payment_terms)

    ensure(26)
    pdf.setFillColor(...BOX)
    pdf.roundedRect(14, y - 2, 182, 24, 2, 2, 'F')
    pdf.setFont('helvetica', 'bold')
    pdf.setFontSize(9)
    pdf.setTextColor(...RED)
    pdf.text('BANK DETAILS', 20, y + 5)
    pdf.setFont('helvetica', 'normal')
    pdf.setFontSize(10)
    pdf.setTextColor(...TEXT)
    pdf.text(COMPANY.bank.bankName + '  |  ' + COMPANY.bank.accountName, 20, y + 12)
    pdf.text('Account No: ' + COMPANY.bank.accountNumber, 20, y + 18)
    y += 32
  }

  if (p.notes) {
    heading('NOTES')
    paragraph(p.notes)
  }

  // Accept block
  ensure(40)
  pdf.setDrawColor(...LINE)
  pdf.setLineWidth(0.3)
  pdf.line(14, y + 22, 90, y + 22)
  pdf.line(120, y + 22, 196, y + 22)
  pdf.setFont('helvetica', 'normal')
  pdf.setFontSize(9)
  pdf.setTextColor(...MUTED)
  pdf.text('Accepted by (name, signature and date)', 14, y + 27)
  pdf.text('For ' + COMPANY.name, 120, y + 27)
  y += 36

  // Contact block
  ensure(42)
  pdf.setFillColor(...BLACK)
  pdf.roundedRect(14, y, 182, 36, 3, 3, 'F')
  pdf.setFont('helvetica', 'bold')
  pdf.setFontSize(10)
  pdf.setTextColor(...ROSE)
  pdf.text('CONTACT US', 20, y + 9)
  pdf.setFont('helvetica', 'normal')
  pdf.setFontSize(10)
  pdf.setTextColor(...DEEP)
  pdf.text(COMPANY.phone, 20, y + 17)
  pdf.text(COMPANY.email, 20, y + 23)
  pdf.text(COMPANY.website, 20, y + 29)
  pdf.setFontSize(9)
  pdf.setTextColor(...SOFT)
  if (showCompanyAddress()) COMPANY.addressLines.forEach((a, i) => pdf.text(a, 125, y + 17 + i * 5))

  // ---------- Footer on content pages ----------
  const total = pdf.getNumberOfPages()
  for (let i = 2; i <= total; i++) {
    pdf.setPage(i)
    pdf.setDrawColor(...LINE)
    pdf.setLineWidth(0.3)
    pdf.line(14, 285, 196, 285)
    pdf.setFont('helvetica', 'normal')
    pdf.setFontSize(8)
    pdf.setTextColor(...MUTED)
    pdf.text(COMPANY.name + '  |  ' + COMPANY.website, 14, 291)
    pdf.text('Page ' + i + ' of ' + total, 196, 291, { align: 'right' })
  }

  const fileName = customerName ? 'Proposal - ' + customerName + '.pdf' : 'Proposal - Demo IT Solutions.pdf'
  pdf.save(fileName)
}