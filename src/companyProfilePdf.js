import { jsPDF } from 'jspdf'
import { COMPANY, showCompanyAddress } from './docSettings'

// Colours (blush / red scheme, same as other documents)
const RED = [214, 40, 48]
const BLUSH = [251, 236, 237] // soft blush band
const ROSE = [200, 36, 46]
const DEEP = [92, 16, 24]
const BOX = [244, 244, 246]
const TEXT = [25, 25, 28]
const MUTED = [105, 105, 112]
const LINE = [221, 221, 226]
const WHITE = [255, 255, 255]
const SOFT = [108, 74, 78]

const LEFT = 14
const WIDTH = 182
const BOTTOM = 279

function lines(text) {
  return String(text || '')
    .split('\n')
    .map((s) => s.trim())
    .filter(Boolean)
}

// "Title - description" -> ['Title', 'description']
function splitItem(s) {
  const i = s.indexOf(' - ')
  if (i < 0) return [s, '']
  return [s.slice(0, i).trim(), s.slice(i + 3).trim()]
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

// c = the saved Company Profile text
export async function downloadCompanyProfilePdf(c) {
  const pdf = new jsPDF({ unit: 'mm', format: 'a4' })
  const logo = await loadImage('/logo.png')
  const logoSize = logo ? await imageSize(logo) : null
  // Optional: put a QR code picture at public/review-qr.png and it prints on the Contact page
  const qr = await loadImage('/review-qr.png')

  const font = (style, size, color) => {
    pdf.setFont('helvetica', style)
    pdf.setFontSize(size)
    pdf.setTextColor(...color)
  }

  // ================= Page 1: Cover =================
  pdf.setFillColor(...BLUSH)
  pdf.rect(0, 0, 210, 297, 'F')
  pdf.setDrawColor(...RED)
  pdf.setLineWidth(0.6)
  pdf.rect(8, 8, 194, 281)

  pdf.setFillColor(...RED)
  pdf.circle(105, 85, 32.8, 'F')
  pdf.setFillColor(...WHITE)
  pdf.circle(105, 85, 32, 'F')
  if (logo && logoSize) {
    const f = fit(logoSize, 56)
    pdf.addImage(logo, 'PNG', 105 - f.w / 2, 85 - f.h / 2, f.w, f.h)
  }

  font('bold', 24, DEEP)
  pdf.text(COMPANY.name, 105, 142, { align: 'center' })

  pdf.setFillColor(...RED)
  pdf.rect(85, 150, 40, 1, 'F')

  font('bold', 15, ROSE)
  pdf.text('COMPANY PROFILE', 105, 164, { align: 'center' })

  if (c.tagline) {
    font('normal', 12, SOFT)
    pdf.text(pdf.splitTextToSize(c.tagline, 150), 105, 176, { align: 'center' })
  }

  const facts = []
  if (c.ssm_no) facts.push('SSM No. ' + c.ssm_no)
  if (c.year_started) facts.push('Established ' + c.year_started)
  if (facts.length) {
    font('normal', 10, SOFT)
    pdf.text(facts.join('   |   '), 105, 235, { align: 'center' })
  }

  font('normal', 10, DEEP)
  pdf.text(COMPANY.phone + '   |   ' + COMPANY.email, 105, 258, { align: 'center' })
  pdf.text(COMPANY.website, 105, 265, { align: 'center' })
  if (showCompanyAddress()) {
    font('normal', 9, SOFT)
    pdf.text(COMPANY.addressLines.join(' '), 105, 273, { align: 'center' })
  }

  // ================= Helpers for inside pages =================
  let y = 0
  let pageTitle = ''

  function newPage(title) {
    if (title) pageTitle = title
    pdf.addPage()
    pdf.setFillColor(...BLUSH)
    pdf.rect(0, 0, 210, 18, 'F')
    pdf.setFillColor(...RED)
    pdf.rect(0, 18, 210, 1.2, 'F')
    font('bold', 11, DEEP)
    pdf.text(COMPANY.name, LEFT, 12)
    font('bold', 11, ROSE)
    pdf.text(pageTitle, 196, 12, { align: 'right' })
    y = 34
  }

  function ensure(need) {
    if (y + need > BOTTOM) newPage()
  }

  // Big page title with a short line under it
  function heading(text, sub) {
    pdf.setFillColor(...RED)
    pdf.rect(LEFT, y - 6, 3.2, 8.5, 'F')
    font('bold', 18, TEXT)
    pdf.text(text, LEFT + 7, y)
    y += 7
    if (sub) {
      font('normal', 10, MUTED)
      const l = pdf.splitTextToSize(sub, WIDTH - 7)
      pdf.text(l, LEFT + 7, y)
      y += l.length * 5
    }
    y += 6
  }

  // Small red capital label
  function label(text) {
    ensure(14)
    font('bold', 9, RED)
    pdf.text(text, LEFT, y)
    pdf.setDrawColor(...LINE)
    pdf.setLineWidth(0.3)
    pdf.line(LEFT + pdf.getTextWidth(text) + 3, y - 1.2, LEFT + WIDTH, y - 1.2)
    y += 7
  }

  function para(text, size = 10.5, color = TEXT) {
    font('normal', size, color)
    const l = pdf.splitTextToSize(text, WIDTH)
    const lh = size * 0.5
    ensure(l.length * lh)
    pdf.text(l, LEFT, y)
    y += l.length * lh
  }

  function dot(x, yy) {
    pdf.setFillColor(...RED)
    pdf.circle(x, yy - 1.2, 0.9, 'F')
  }

  // Rows like  "Label   :  value"  with the colons lined up
  function infoRows(rows, x, labelW, valueW) {
    rows.forEach(([k, v]) => {
      font('normal', 10, TEXT)
      const vl = pdf.splitTextToSize(String(v || ''), valueW)
      ensure(vl.length * 5.2 + 2)
      font('bold', 9.5, MUTED)
      pdf.text(k, x, y)
      pdf.text(':', x + labelW, y)
      font('normal', 10, TEXT)
      pdf.text(vl, x + labelW + 4, y)
      y += vl.length * 5.2 + 2
    })
  }

  // Cards in two columns. items = [[title, description], ...]
  function cardGrid(items, numbered) {
    const colW = 89
    const gap = WIDTH - colW * 2
    const pad = numbered ? 15 : 9
    for (let i = 0; i < items.length; i += 2) {
      const pair = items.slice(i, i + 2).map(([t, d]) => {
        font('bold', 10.5, TEXT)
        const tl = pdf.splitTextToSize(t, colW - pad - 5)
        font('normal', 9.5, MUTED)
        const dl = d ? pdf.splitTextToSize(d, colW - pad - 5) : []
        return { tl, dl }
      })
      const h = Math.max(...pair.map((p) => 7 + p.tl.length * 5 + p.dl.length * 4.6 + 3))
      ensure(h + 5)
      pair.forEach((p, j) => {
        const x = LEFT + j * (colW + gap)
        pdf.setFillColor(...BOX)
        pdf.roundedRect(x, y, colW, h, 2, 2, 'F')
        pdf.setFillColor(...RED)
        pdf.rect(x, y, 2.5, h, 'F')
        if (numbered) {
          pdf.circle(x + 9, y + 7.5, 3.6, 'F')
          font('bold', 9, WHITE)
          pdf.text(String(i + j + 1), x + 9, y + 8.8, { align: 'center' })
        }
        font('bold', 10.5, TEXT)
        pdf.text(p.tl, x + pad, y + 8)
        font('normal', 9.5, MUTED)
        if (p.dl.length) pdf.text(p.dl, x + pad, y + 8 + p.tl.length * 5)
      })
      y += h + 5
    }
  }

  // ================= Page 2: About Us =================
  newPage('ABOUT US')
  heading('About Us', c.tagline)
  if (c.about) {
    para(c.about)
    y += 8
  }

  const factRows = [['Registered name', COMPANY.name]]
  if (c.ssm_no) factRows.push(['SSM No.', c.ssm_no])
  if (c.year_started) factRows.push(['Established', c.year_started])
  if (c.founder) factRows.push(['Founder', c.founder])
  if (c.location) factRows.push(['Based in', c.location])
  label('COMPANY DETAILS')
  const factsTop = y
  pdf.setFillColor(...BOX)
  pdf.roundedRect(LEFT, factsTop - 2, WIDTH, factRows.length * 7.2 + 8, 2, 2, 'F')
  y += 5
  infoRows(factRows, LEFT + 6, 36, 130)
  y = factsTop + factRows.length * 7.2 + 16

  // Mission and vision side by side
  const mv = [
    ['OUR MISSION', c.mission],
    ['OUR VISION', c.vision],
  ].filter(([, t]) => t)
  if (mv.length) {
    const colW = mv.length === 2 ? 89 : WIDTH
    font('normal', 10.5, TEXT)
    const texts = mv.map(([, t]) => pdf.splitTextToSize(t, colW - 14))
    const h = 18 + Math.max(...texts.map((t) => t.length)) * 5.3
    ensure(h)
    mv.forEach(([title], i) => {
      const x = LEFT + i * (colW + (WIDTH - colW * 2))
      pdf.setFillColor(...BLUSH)
      pdf.roundedRect(x, y, colW, h, 3, 3, 'F')
      pdf.setFillColor(...RED)
      pdf.rect(x + 7, y + 6, 12, 0.9, 'F')
      font('bold', 10, ROSE)
      pdf.text(title, x + 7, y + 13)
      font('normal', 10.5, DEEP)
      pdf.text(texts[i], x + 7, y + 20)
    })
    y += h + 8
  }

  // ================= Page 3: Our Services =================
  const sw = lines(c.software_services).map(splitItem)
  const it = lines(c.it_services).map(splitItem)
  if (sw.length || it.length) {
    newPage('OUR SERVICES')
    heading('Our Services', c.services_intro)
    if (sw.length) {
      label('SOFTWARE')
      cardGrid(sw)
      y += 4
    }
    if (it.length) {
      label('IT SERVICES')
      cardGrid(it)
    }
  }

  // ================= Page 4: Track Record =================
  const stats = (c.stats || []).filter((s) => s.value || s.label).slice(0, 4)
  const projects = (c.projects || []).filter((p) => p.name || p.description)
  const work = lines(c.it_work)
  const clients = lines(c.clients)
  if (stats.length || projects.length || work.length || clients.length) {
    newPage('TRACK RECORD')
    heading('Track Record', c.track_intro)

    if (stats.length) {
      const gap = 5
      const w = (WIDTH - gap * (stats.length - 1)) / stats.length
      stats.forEach((s, i) => {
        const x = LEFT + i * (w + gap)
        pdf.setFillColor(...BLUSH)
        pdf.roundedRect(x, y, w, 28, 3, 3, 'F')
        font('bold', 22, RED)
        pdf.text(String(s.value || ''), x + w / 2, y + 13, { align: 'center' })
        font('normal', 8.5, DEEP)
        pdf.text(pdf.splitTextToSize(String(s.label || ''), w - 6), x + w / 2, y + 20, { align: 'center' })
      })
      y += 36
    }

    if (projects.length) {
      label('FEATURED PROJECTS')
      projects.forEach((p) => {
        font('normal', 9.5, MUTED)
        const d = pdf.splitTextToSize(p.description || '', WIDTH - 14)
        const h = 14 + d.length * 4.7
        ensure(h + 5)
        pdf.setFillColor(...BOX)
        pdf.roundedRect(LEFT, y, WIDTH, h, 2, 2, 'F')
        pdf.setFillColor(...RED)
        pdf.rect(LEFT, y, 2.5, h, 'F')
        font('bold', 11, TEXT)
        pdf.text(p.name || '', LEFT + 7, y + 8)
        font('normal', 9.5, MUTED)
        pdf.text(d, LEFT + 7, y + 14)
        y += h + 5
      })
      y += 3
    }

    if (work.length) {
      label('IT WORK WE DO')
      const half = Math.ceil(work.length / 2)
      const cols = [work.slice(0, half), work.slice(half)]
      const rows = half
      ensure(rows * 6.5)
      const top = y
      cols.forEach((col, ci) => {
        let yy = top
        col.forEach((w) => {
          font('normal', 10, TEXT)
          dot(LEFT + 2 + ci * 92, yy)
          pdf.text(pdf.splitTextToSize(w, 84)[0], LEFT + 6 + ci * 92, yy)
          yy += 6.5
        })
      })
      y = top + rows * 6.5 + 6
    }

    if (clients.length) {
      label('BUSINESSES WE HAVE WORKED WITH')
      let x = LEFT
      font('bold', 9, DEEP)
      ensure(10)
      clients.forEach((name) => {
        const w = pdf.getTextWidth(name) + 10
        if (x + w > LEFT + WIDTH) {
          x = LEFT
          y += 11
          ensure(10)
        }
        pdf.setFillColor(...BLUSH)
        pdf.setDrawColor(...RED)
        pdf.setLineWidth(0.3)
        pdf.roundedRect(x, y - 5.5, w, 8.5, 4, 4, 'FD')
        font('bold', 9, DEEP)
        pdf.text(name, x + 5, y)
        x += w + 4
      })
      y += 12
    }
  }

  // ================= Page 5: Why Choose Us =================
  const why = lines(c.why_choose).map(splitItem)
  const reviews = lines(c.reviews)
  if (why.length || reviews.length) {
    newPage('WHY CHOOSE US')
    heading('Why Choose Us', c.why_intro)
    if (why.length) {
      cardGrid(why, true)
      y += 4
    }
    if (reviews.length) {
      label('WHAT OUR CUSTOMERS SAY')
      reviews.forEach((r) => {
        font('italic', 10.5, DEEP)
        const l = pdf.splitTextToSize(r.replace(/^["']|["']$/g, ''), WIDTH - 24)
        const h = 14 + l.length * 5.2
        ensure(h + 5)
        pdf.setFillColor(...BLUSH)
        pdf.roundedRect(LEFT, y, WIDTH, h, 3, 3, 'F')
        font('bold', 26, RED)
        pdf.text('"', LEFT + 5, y + 13)
        font('italic', 10.5, DEEP)
        pdf.text(l, LEFT + 15, y + 8)
        font('normal', 8.5, SOFT)
        pdf.text('Google review', LEFT + 15, y + 9 + l.length * 5.2)
        y += h + 5
      })
    }
  }

  // ================= Page 6: Contact =================
  newPage('CONTACT US')
  heading('Get In Touch', c.contact_intro)

  const contactRows = []
  if (showCompanyAddress()) contactRows.push(['Address', COMPANY.addressLines.join(' ')])
  contactRows.push(['Phone / WhatsApp', COMPANY.phone])
  contactRows.push(['Email', COMPANY.email])
  contactRows.push(['Website', COMPANY.website])
  if (c.instagram) contactRows.push(['Instagram', c.instagram])
  if (c.tiktok) contactRows.push(['TikTok', c.tiktok])
  if (c.review_link) contactRows.push(['Google review', c.review_link])

  font('normal', 10, TEXT)
  const contactH = contactRows.reduce(
    (sum, [, v]) => sum + pdf.splitTextToSize(String(v), 118).length * 5.2 + 2,
    0
  )
  const boxTop = y
  pdf.setFillColor(...BOX)
  pdf.roundedRect(LEFT, boxTop - 2, WIDTH, contactH + 10, 3, 3, 'F')
  pdf.setFillColor(...RED)
  pdf.rect(LEFT, boxTop - 2, 2.5, contactH + 10, 'F')
  y += 5
  infoRows(contactRows, LEFT + 8, 36, 118)
  y = boxTop + contactH + 18

  if (qr) {
    const qrSize = await imageSize(qr)
    const f = fit(qrSize || { w: 1, h: 1 }, 34)
    ensure(f.h + 14)
    pdf.setFillColor(...WHITE)
    pdf.setDrawColor(...LINE)
    pdf.roundedRect(LEFT, y, WIDTH, f.h + 10, 3, 3, 'FD')
    pdf.addImage(qr, 'PNG', LEFT + 6, y + 5, f.w, f.h)
    font('bold', 12, TEXT)
    pdf.text('Happy with our service?', LEFT + f.w + 14, y + 5 + f.h / 2 - 2)
    font('normal', 10, MUTED)
    pdf.text('Scan the QR code to leave us a Google review.', LEFT + f.w + 14, y + 5 + f.h / 2 + 4)
    y += f.h + 18
  }

  if (c.show_bank) {
    ensure(34)
    label('BANK DETAILS')
    infoRows(
      [
        ['Bank', COMPANY.bank.bankName],
        ['Account name', COMPANY.bank.accountName],
        ['Account no.', COMPANY.bank.accountNumber],
      ],
      LEFT + 2,
      36,
      130
    )
    y += 6
  }

  // Thank you band
  ensure(26)
  pdf.setFillColor(...BLUSH)
  pdf.roundedRect(LEFT, y, WIDTH, 22, 3, 3, 'F')
  font('bold', 12, DEEP)
  pdf.text('Thank you for considering ' + COMPANY.name + '.', 105, y + 9.5, { align: 'center' })
  font('normal', 10, ROSE)
  pdf.text(c.tagline || 'We look forward to working with you.', 105, y + 16, { align: 'center' })

  // ================= Footer on inside pages =================
  const total = pdf.getNumberOfPages()
  for (let i = 2; i <= total; i++) {
    pdf.setPage(i)
    pdf.setDrawColor(...LINE)
    pdf.setLineWidth(0.3)
    pdf.line(LEFT, 285, 196, 285)
    font('normal', 8, MUTED)
    pdf.text(COMPANY.name + '  |  ' + COMPANY.website, LEFT, 291)
    pdf.text('Page ' + i + ' of ' + total, 196, 291, { align: 'right' })
  }

  pdf.save('Company Profile - Demo IT Solutions.pdf')
}
