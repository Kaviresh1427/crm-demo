import { jsPDF } from 'jspdf'
import { COMPANY } from './docSettings'

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

// m = the meeting kit text, customer = the chosen customer (or null)
export async function downloadMeetingKitPdf(m, customer) {
  const pdf = new jsPDF({ unit: 'mm', format: 'a4' })
  const logo = await loadImage('/logo.png')
  const logoSize = logo ? await imageSize(logo) : null
  const customerName = customer && customer.name ? customer.name : ''

  let y = 0

  function header() {
    pdf.setFillColor(...BLACK)
    pdf.rect(0, 0, 210, 30, 'F')
    pdf.setFillColor(...RED)
    pdf.rect(0, 30, 210, 1.2, 'F')

    pdf.setFillColor(...LOGO_BG)
    pdf.setFillColor(...RED)
    pdf.circle(22, 15, 10.8, 'F')
    pdf.setFillColor(...LOGO_BG)
    pdf.circle(22, 15, 10, 'F')
    if (logo && logoSize) {
      const f = fit(logoSize, 17.5)
      pdf.addImage(logo, 'PNG', 22 - f.w / 2, 15 - f.h / 2, f.w, f.h)
    }

    pdf.setFont('helvetica', 'bold')
    pdf.setFontSize(13)
    pdf.setTextColor(...DEEP)
    pdf.text(COMPANY.name, 38, 13)
    pdf.setFont('helvetica', 'normal')
    pdf.setFontSize(8.5)
    pdf.setTextColor(...SOFT)
    pdf.text(COMPANY.phone + '  |  ' + COMPANY.email, 38, 20)

    pdf.setFont('helvetica', 'bold')
    pdf.setFontSize(14)
    pdf.setTextColor(...ROSE)
    pdf.text('MEETING SHEET', 196, 17, { align: 'right' })
    y = 42
  }

  function newPage() {
    pdf.addPage()
    header()
  }

  function ensure(need) {
    if (y + need > 275) newPage()
  }

  function heading(text) {
    ensure(16)
    pdf.setFillColor(...RED)
    pdf.rect(14, y - 4.5, 3, 6.5, 'F')
    pdf.setFont('helvetica', 'bold')
    pdf.setFontSize(11.5)
    pdf.setTextColor(...TEXT)
    pdf.text(text, 20, y)
    y += 8
  }

  function checkList(text) {
    pdf.setFont('helvetica', 'normal')
    pdf.setFontSize(10.5)
    pdf.setTextColor(...TEXT)
    lines(text).forEach((w) => {
      const l = pdf.splitTextToSize(w, 170)
      ensure(l.length * 5.4 + 2.5)
      pdf.setDrawColor(...MUTED)
      pdf.setLineWidth(0.3)
      pdf.rect(15, y - 3.4, 3.6, 3.6)
      pdf.text(l, 22, y)
      y += l.length * 5.4 + 2.5
    })
    y += 5
  }

  function bulletList(text) {
    pdf.setFont('helvetica', 'normal')
    pdf.setFontSize(10.5)
    pdf.setTextColor(...TEXT)
    lines(text).forEach((w) => {
      const l = pdf.splitTextToSize(w, 172)
      ensure(l.length * 5.4 + 2)
      pdf.setFillColor(...RED)
      pdf.circle(16, y - 1.2, 0.9, 'F')
      pdf.text(l, 21, y)
      y += l.length * 5.4 + 2
    })
    y += 5
  }

  header()

  // Details box
  const details = [
    ['CUSTOMER', customerName || '-'],
    ['DATE', m.meeting_date || '-'],
    ['TIME', m.meeting_time || '-'],
    ['PLACE', m.location || '-'],
    ['PURPOSE', m.purpose || '-'],
    ['PHONE', customer && customer.phone ? customer.phone : '-'],
  ]
  pdf.setFillColor(...BOX)
  pdf.roundedRect(14, y - 4, 182, 40, 2, 2, 'F')
  details.forEach((d, i) => {
    const col = i % 2
    const row = Math.floor(i / 2)
    const x = 20 + col * 92
    const yy = y + 3 + row * 11
    pdf.setFont('helvetica', 'bold')
    pdf.setFontSize(8)
    pdf.setTextColor(...RED)
    pdf.text(d[0], x, yy)
    pdf.setFont('helvetica', 'normal')
    pdf.setFontSize(10)
    pdf.setTextColor(...TEXT)
    pdf.text(pdf.splitTextToSize(String(d[1]), 78)[0], x, yy + 5)
  })
  y += 46

  if (lines(m.attendees).length) {
    heading('ATTENDEES')
    bulletList(m.attendees)
  }
  if (lines(m.agenda).length) {
    heading('AGENDA')
    bulletList(m.agenda)
  }
  if (lines(m.questions).length) {
    heading('QUESTIONS TO ASK')
    checkList(m.questions)
  }
  if (lines(m.bring_list).length) {
    heading('THINGS TO BRING')
    checkList(m.bring_list)
  }

  // Notes
  heading('MEETING NOTES')
  if (m.notes && m.notes.trim()) {
    pdf.setFont('helvetica', 'normal')
    pdf.setFontSize(10.5)
    pdf.setTextColor(...TEXT)
    pdf.splitTextToSize(m.notes, 182).forEach((r) => {
      ensure(6)
      pdf.text(r, 14, y)
      y += 5.4
    })
    y += 6
  } else {
    pdf.setDrawColor(...LINE)
    pdf.setLineWidth(0.3)
    for (let i = 0; i < 8; i++) {
      ensure(9)
      pdf.line(14, y + 2, 196, y + 2)
      y += 9
    }
    y += 4
  }

  // Action items
  heading('ACTION ITEMS')
  if (lines(m.action_items).length) {
    checkList(m.action_items)
  } else {
    pdf.setDrawColor(...LINE)
    pdf.setLineWidth(0.3)
    for (let i = 0; i < 4; i++) {
      ensure(9)
      pdf.setDrawColor(...MUTED)
      pdf.rect(15, y - 1, 3.6, 3.6)
      pdf.setDrawColor(...LINE)
      pdf.line(22, y + 2.6, 196, y + 2.6)
      y += 9
    }
    y += 4
  }

  if (m.next_meeting) {
    heading('NEXT STEP')
    pdf.setFont('helvetica', 'normal')
    pdf.setFontSize(10.5)
    pdf.setTextColor(...TEXT)
    pdf.splitTextToSize(m.next_meeting, 182).forEach((r) => {
      ensure(6)
      pdf.text(r, 14, y)
      y += 5.4
    })
  }

  // Footer
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
    pdf.text('Page ' + i + ' of ' + total, 196, 291, { align: 'right' })
  }

  pdf.save(customerName ? 'Meeting Sheet - ' + customerName + '.pdf' : 'Meeting Sheet.pdf')
}