import { jsPDF } from 'jspdf'
import { COMPANY, showCompanyAddress } from './docSettings'

const RED = [214, 40, 48]
const BLACK = [251, 236, 237] // soft blush band (easy on the eyes)
const ROSE = [200, 36, 46]
const DEEP = [92, 16, 24]
const WHITE = [255, 255, 255]
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

// c = the cover letter text, customer = the chosen customer (or null)
export async function downloadCoverLetterPdf(c, customer) {
  const pdf = new jsPDF({ unit: 'mm', format: 'a4' })
  const logo = await loadImage('/logo.png')
  const logoSize = logo ? await imageSize(logo) : null
  const signature = await loadImage('/signature.png')
  const signatureSize = signature ? await imageSize(signature) : null

  let y = 0

  function letterhead() {
    pdf.setFillColor(...BLACK)
    pdf.rect(0, 0, 210, 34, 'F')
    pdf.setFillColor(...RED)
    pdf.rect(0, 34, 210, 1.2, 'F')

    pdf.setFillColor(...LOGO_BG)
    pdf.setFillColor(...RED)
    pdf.circle(25, 17, 11.8, 'F')
    pdf.setFillColor(...LOGO_BG)
    pdf.circle(25, 17, 11, 'F')
    if (logo && logoSize) {
      const f = fit(logoSize, 19)
      pdf.addImage(logo, 'PNG', 25 - f.w / 2, 17 - f.h / 2, f.w, f.h)
    }

    pdf.setFont('helvetica', 'bold')
    pdf.setFontSize(14)
    pdf.setTextColor(...DEEP)
    pdf.text(COMPANY.name, 41, 15)
    pdf.setFont('helvetica', 'normal')
    pdf.setFontSize(8.5)
    pdf.setTextColor(...SOFT)
    pdf.text(COMPANY.phone + '  |  ' + COMPANY.email, 41, 22)
    pdf.text(COMPANY.website, 41, 27)

    pdf.setFontSize(8)
    if (showCompanyAddress()) {
      COMPANY.addressLines.forEach((a, i) => pdf.text(a, 196, 10 + i * 4.5, { align: 'right' }))
    }
    y = 48
  }

  function newPage() {
    pdf.addPage()
    letterhead()
  }

  function ensure(need) {
    if (y + need > 270) newPage()
  }

  letterhead()

  pdf.setFont('helvetica', 'normal')
  pdf.setFontSize(10.5)
  pdf.setTextColor(...TEXT)

  // Date
  if (c.letter_date) {
    pdf.text(c.letter_date, 14, y)
    y += 9
  }

  // Recipient
  const recipient = []
  if (customer && customer.name) recipient.push(customer.name)
  lines(c.recipient_address).forEach((l) => recipient.push(l))
  if (recipient.length) {
    recipient.forEach((l, i) => {
      pdf.setFont('helvetica', i === 0 ? 'bold' : 'normal')
      pdf.text(l, 14, y)
      y += 5.4
    })
    y += 5
  }

  // Subject
  if (c.subject) {
    pdf.setFont('helvetica', 'bold')
    pdf.setFontSize(11)
    const s = pdf.splitTextToSize(c.subject.toUpperCase(), 182)
    pdf.text(s, 14, y)
    y += s.length * 5.6 + 2
    pdf.setFillColor(...RED)
    pdf.rect(14, y - 2, 30, 0.8, 'F')
    y += 6
  }

  // Salutation
  pdf.setFont('helvetica', 'normal')
  pdf.setFontSize(10.5)
  pdf.setTextColor(...TEXT)
  const salutation = c.salutation || (customer && customer.name ? 'Dear ' + customer.name + ',' : '')
  if (salutation) {
    pdf.text(salutation, 14, y)
    y += 8
  }

  // Body: blank line = new paragraph
  String(c.body || '')
    .split(/\n\s*\n/)
    .map((p) => p.replace(/\n/g, ' ').trim())
    .filter(Boolean)
    .forEach((para) => {
      const rows = pdf.splitTextToSize(para, 182)
      rows.forEach((r) => {
        ensure(6)
        pdf.text(r, 14, y)
        y += 5.6
      })
      y += 4
    })

  // Enclosures
  const enclosed = lines(c.enclosures)
  if (enclosed.length) {
    y += 2
    ensure(10 + enclosed.length * 5.4)
    pdf.setFont('helvetica', 'bold')
    pdf.setFontSize(10)
    pdf.text('Enclosed:', 14, y)
    y += 5.6
    pdf.setFont('helvetica', 'normal')
    enclosed.forEach((e) => {
      pdf.setFillColor(...RED)
      pdf.circle(16, y - 1.2, 0.9, 'F')
      pdf.text(e, 21, y)
      y += 5.4
    })
    pdf.setFontSize(10.5)
  }

  // Closing and signature
  y += 6
  ensure(52)
  if (c.closing) {
    pdf.setFont('helvetica', 'normal')
    pdf.setFontSize(10.5)
    pdf.setTextColor(...TEXT)
    pdf.text(c.closing, 14, y)
    y += 4
  }
  if (signature && signatureSize) {
    const f = fit(signatureSize, 30)
    pdf.addImage(signature, 'PNG', 14, y, f.w, f.h)
    y += f.h + 2
  } else {
    y += 22
  }
  if (c.signer_name) {
    pdf.setFont('helvetica', 'bold')
    pdf.setFontSize(10.5)
    pdf.setTextColor(...TEXT)
    pdf.text(c.signer_name, 14, y)
    y += 5.4
  }
  pdf.setFont('helvetica', 'normal')
  pdf.setFontSize(10)
  pdf.setTextColor(...MUTED)
  if (c.signer_title) {
    pdf.text(c.signer_title, 14, y)
    y += 5
  }
  pdf.text(COMPANY.name, 14, y)

  // ---------- Footer on every page ----------
  const total = pdf.getNumberOfPages()
  for (let i = 1; i <= total; i++) {
    pdf.setPage(i)
    pdf.setDrawColor(...LINE)
    pdf.setLineWidth(0.3)
    pdf.line(14, 285, 196, 285)
    pdf.setFont('helvetica', 'normal')
    pdf.setFontSize(8)
    pdf.setTextColor(...MUTED)
    pdf.text(COMPANY.name + '  |  ' + COMPANY.website, 14, 291)
    if (total > 1) pdf.text('Page ' + i + ' of ' + total, 196, 291, { align: 'right' })
  }

  const customerName = customer && customer.name ? customer.name : ''
  pdf.save(customerName ? 'Cover Letter - ' + customerName + '.pdf' : 'Cover Letter - Demo IT Solutions.pdf')
}