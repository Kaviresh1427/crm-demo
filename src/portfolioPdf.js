import { jsPDF } from 'jspdf'
import { COMPANY, showCompanyAddress } from './docSettings'

// Colours (blush / red scheme, same as other documents)
const RED = [214, 40, 48]
const BLUSH = [251, 236, 237]
const ROSE = [200, 36, 46]
const DEEP = [92, 16, 24]
const WHITE = [255, 255, 255]
const BOX = [244, 244, 246]
const TEXT = [25, 25, 28]
const MUTED = [105, 105, 112]
const LINE = [221, 221, 226]
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

// Fit a picture inside a box (w x h) without stretching it
function fitBox(size, w, h) {
  const r = Math.min(w / size.w, h / size.h)
  return { w: size.w * r, h: size.h * r }
}

function imgType(dataUrl) {
  return String(dataUrl).startsWith('data:image/png') ? 'PNG' : 'JPEG'
}

// c = the saved Portfolio content
export async function downloadPortfolioPdf(c) {
  const pdf = new jsPDF({ unit: 'mm', format: 'a4' })
  const logo = await loadImage('/logo.png')
  const logoSize = logo ? await imageSize(logo) : null

  // Get every picture's size first
  const sizes = new Map()
  const allImages = []
  ;(c.projects || []).forEach((p) => (p.images || []).forEach((im) => allImages.push(im)))
  ;(c.it_cases || []).forEach((k) => [k.before, k.after].filter(Boolean).forEach((im) => allImages.push(im)))
  for (const im of allImages) sizes.set(im, await imageSize(im))

  const font = (style, size, color) => {
    pdf.setFont('helvetica', style)
    pdf.setFontSize(size)
    pdf.setTextColor(...color)
  }

  // ================= Cover =================
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
    const f = fitBox(logoSize, 56, 56)
    pdf.addImage(logo, 'PNG', 105 - f.w / 2, 85 - f.h / 2, f.w, f.h)
  }

  font('bold', 24, DEEP)
  pdf.text(COMPANY.name, 105, 142, { align: 'center' })
  pdf.setFillColor(...RED)
  pdf.rect(85, 150, 40, 1, 'F')
  font('bold', 15, ROSE)
  pdf.text('PORTFOLIO', 105, 164, { align: 'center' })
  if (c.tagline) {
    font('normal', 12, SOFT)
    pdf.text(pdf.splitTextToSize(c.tagline, 150), 105, 176, { align: 'center' })
  }

  font('normal', 10, DEEP)
  pdf.text(COMPANY.phone + '   |   ' + COMPANY.email, 105, 258, { align: 'center' })
  pdf.text(COMPANY.website, 105, 265, { align: 'center' })
  if (showCompanyAddress()) {
    font('normal', 9, SOFT)
    pdf.text(COMPANY.addressLines.join(' '), 105, 273, { align: 'center' })
  }

  // ================= Helpers =================
  let y = 0
  let pageTitle = 'PORTFOLIO'

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

  function label(text) {
    ensure(14)
    font('bold', 9, RED)
    pdf.text(text, LEFT, y)
    pdf.setDrawColor(...LINE)
    pdf.setLineWidth(0.3)
    pdf.line(LEFT + pdf.getTextWidth(text) + 3, y - 1.2, LEFT + WIDTH, y - 1.2)
    y += 7
  }

  function pill(text, x, yy, fill = RED, color = WHITE) {
    font('bold', 8.5, color)
    const w = pdf.getTextWidth(text) + 8
    pdf.setFillColor(...fill)
    pdf.roundedRect(x, yy - 4.8, w, 7, 3.5, 3.5, 'F')
    pdf.text(text, x + 4, yy)
    return w
  }

  function dot(x, yy) {
    pdf.setFillColor(...RED)
    pdf.circle(x, yy - 1.2, 0.9, 'F')
  }

  // Two boxes side by side: [[title, text, fill], ...]
  function twoBoxes(items) {
    const shown = items.filter(([, t]) => t)
    if (!shown.length) return
    const colW = shown.length === 2 ? 89 : WIDTH
    font('normal', 10, TEXT)
    const texts = shown.map(([, t]) => pdf.splitTextToSize(t, colW - 12))
    const h = 16 + Math.max(...texts.map((t) => t.length)) * 5
    ensure(h + 6)
    shown.forEach(([title, , fill], i) => {
      const x = LEFT + i * (colW + (WIDTH - colW * 2))
      pdf.setFillColor(...fill)
      pdf.roundedRect(x, y, colW, h, 3, 3, 'F')
      font('bold', 9, RED)
      pdf.text(title, x + 6, y + 8)
      font('normal', 10, TEXT)
      pdf.text(texts[i], x + 6, y + 14.5)
    })
    y += h + 7
  }

  // Draw a picture inside a white frame
  function framed(im, x, yy, w, h) {
    pdf.setFillColor(...WHITE)
    pdf.setDrawColor(...LINE)
    pdf.setLineWidth(0.3)
    pdf.roundedRect(x, yy, w, h, 2, 2, 'FD')
    const s = sizes.get(im)
    if (!s) return
    const f = fitBox(s, w - 4, h - 4)
    pdf.addImage(im, imgType(im), x + (w - f.w) / 2, yy + (h - f.h) / 2, f.w, f.h)
  }

  // Screenshot grid: 1 picture = wide, more = 2 per row
  function screenshots(images) {
    const list = images.filter((im) => sizes.get(im)).slice(0, 4)
    if (!list.length) return
    label('SCREENSHOTS')
    if (list.length === 1) {
      const s = sizes.get(list[0])
      const f = fitBox(s, WIDTH - 4, 95)
      const h = f.h + 4
      ensure(h + 6)
      framed(list[0], LEFT, y, WIDTH, h)
      y += h + 7
      return
    }
    const colW = 89
    const gap = WIDTH - colW * 2
    for (let i = 0; i < list.length; i += 2) {
      const pair = list.slice(i, i + 2)
      // Row height: tallest picture when fitted to the column, max 80 mm
      const h = Math.max(...pair.map((im) => fitBox(sizes.get(im), colW - 4, 80).h)) + 4
      ensure(h + 5)
      pair.forEach((im, j) => framed(im, LEFT + j * (colW + gap), y, colW, h))
      y += h + 5
    }
    y += 2
  }

  // Bullets in two columns
  function twoColBullets(list) {
    if (!list.length) return
    font('normal', 10, TEXT)
    const half = Math.ceil(list.length / 2)
    const cols = [list.slice(0, half), list.slice(half)].map((col) =>
      col.map((t) => pdf.splitTextToSize(t, 82))
    )
    const colH = (col) => col.reduce((sum, l) => sum + l.length * 5 + 1.8, 0)
    const h = Math.max(colH(cols[0]), colH(cols[1]))
    ensure(h + 4)
    const top = y
    cols.forEach((col, ci) => {
      let yy = top
      col.forEach((l) => {
        font('normal', 10, TEXT)
        dot(LEFT + 2 + ci * 92, yy)
        pdf.text(l, LEFT + 6 + ci * 92, yy)
        yy += l.length * 5 + 1.8
      })
    })
    y = top + h + 5
  }

  // ================= Page 2: Overview + How we work =================
  const projects = (c.projects || []).filter((p) => p.name || p.solution)
  const cases = (c.it_cases || []).filter((k) => k.title || k.problem)

  newPage('PORTFOLIO')
  heading('Our Work', c.intro)

  if (projects.length || cases.length) {
    label('IN THIS PORTFOLIO')
    let n = 1
    const row = (name, cat) => {
      ensure(12)
      pdf.setFillColor(...BOX)
      pdf.roundedRect(LEFT, y - 6, WIDTH, 10, 2, 2, 'F')
      font('bold', 11, RED)
      pdf.text(String(n).padStart(2, '0'), LEFT + 5, y)
      font('bold', 10.5, TEXT)
      pdf.text(name, LEFT + 16, y)
      if (cat) {
        font('normal', 9, MUTED)
        pdf.text(cat, LEFT + WIDTH - 5, y, { align: 'right' })
      }
      y += 12
      n += 1
    }
    projects.forEach((p) => row(p.name, p.category))
    if (cases.length) row('IT Service Case Studies', cases.length + ' jobs')
    y += 4
  }

  const steps = lines(c.process).map(splitItem)
  if (steps.length) {
    label('HOW WE WORK')
    steps.forEach(([t, d], i) => {
      font('normal', 9.5, MUTED)
      const dl = d ? pdf.splitTextToSize(d, WIDTH - 22) : []
      const h = 9 + dl.length * 4.6
      ensure(h + 3)
      pdf.setFillColor(...RED)
      pdf.circle(LEFT + 5, y - 1.2, 4, 'F')
      font('bold', 10, WHITE)
      pdf.text(String(i + 1), LEFT + 5, y, { align: 'center' })
      if (i < steps.length - 1) {
        pdf.setDrawColor(...LINE)
        pdf.setLineWidth(0.4)
        pdf.line(LEFT + 5, y + 3, LEFT + 5, y + h - 1)
      }
      font('bold', 10.5, TEXT)
      pdf.text(t, LEFT + 14, y)
      font('normal', 9.5, MUTED)
      if (dl.length) pdf.text(dl, LEFT + 14, y + 5)
      y += h + 3
    })
  }

  // ================= One case study per software project =================
  projects.forEach((p) => {
    newPage('CASE STUDY')
    let x = LEFT
    if (p.category) x += pill(p.category.toUpperCase(), x, y) + 3
    y += 10
    font('bold', 20, TEXT)
    pdf.text(p.name || '', LEFT, y)
    y += 7
    const meta = []
    if (p.client) meta.push('Client: ' + p.client)
    if (p.tech) meta.push('Built with: ' + p.tech)
    if (meta.length) {
      font('normal', 10, MUTED)
      pdf.text(meta.join('     |     '), LEFT, y)
      y += 6
    }
    pdf.setFillColor(...RED)
    pdf.rect(LEFT, y, 30, 0.9, 'F')
    y += 9

    twoBoxes([
      ['THE CHALLENGE', p.challenge, BOX],
      ['OUR SOLUTION', p.solution, BLUSH],
    ])

    screenshots(p.images || [])

    const feats = lines(p.features)
    if (feats.length) {
      label('KEY FEATURES')
      twoColBullets(feats)
    }

    if (p.result) {
      font('normal', 10.5, DEEP)
      const l = pdf.splitTextToSize(p.result, WIDTH - 16)
      const h = 15 + l.length * 5.2
      ensure(h + 4)
      pdf.setFillColor(...BLUSH)
      pdf.roundedRect(LEFT, y, WIDTH, h, 3, 3, 'F')
      pdf.setFillColor(...RED)
      pdf.rect(LEFT, y, 2.5, h, 'F')
      font('bold', 9, RED)
      pdf.text('THE RESULT', LEFT + 8, y + 8)
      font('normal', 10.5, DEEP)
      pdf.text(l, LEFT + 8, y + 14.5)
      y += h + 6
    }
  })

  // ================= IT service case studies =================
  if (cases.length) {
    newPage('IT SERVICES')
    heading('IT Service Case Studies', c.it_intro)
    cases.forEach((k, idx) => {
      // Title row
      ensure(40)
      font('bold', 12.5, TEXT)
      pdf.text(k.title || '', LEFT, y)
      y += 7

      const rows = [
        ['Problem', k.problem],
        ['What we did', k.work],
        ['Result', k.result],
      ].filter(([, v]) => v)
      rows.forEach(([lab, v]) => {
        font('normal', 10, TEXT)
        const vl = pdf.splitTextToSize(v, WIDTH - 32)
        ensure(vl.length * 5 + 2)
        font('bold', 9.5, RED)
        pdf.text(lab, LEFT, y)
        font('normal', 10, TEXT)
        pdf.text(vl, LEFT + 30, y)
        y += vl.length * 5 + 2
      })
      y += 3

      const pics = [
        ['BEFORE', k.before],
        ['AFTER', k.after],
      ].filter(([, im]) => im && sizes.get(im))
      if (pics.length) {
        const colW = pics.length === 2 ? 89 : 110
        const gap = WIDTH - colW * 2
        const h = Math.max(...pics.map(([, im]) => fitBox(sizes.get(im), colW - 4, 62).h)) + 4
        ensure(h + 8)
        pics.forEach(([lab, im], j) => {
          const xx = LEFT + j * (colW + gap)
          framed(im, xx, y, colW, h)
          pill(lab, xx + 3, y + 7, j === 0 ? DEEP : RED)
        })
        y += h + 4
      }

      if (idx < cases.length - 1) {
        y += 3
        pdf.setDrawColor(...LINE)
        pdf.setLineWidth(0.3)
        pdf.line(LEFT, y, LEFT + WIDTH, y)
        y += 10
      }
    })
  }

  // ================= Call to action =================
  y += 6
  ensure(46)
  pdf.setFillColor(...BLUSH)
  pdf.roundedRect(LEFT, y, WIDTH, 40, 3, 3, 'F')
  pdf.setFillColor(...RED)
  pdf.rect(LEFT, y, 2.5, 40, 'F')
  font('bold', 14, DEEP)
  pdf.text("LET'S BUILD YOURS", LEFT + 9, y + 11)
  font('normal', 10, SOFT)
  pdf.text(pdf.splitTextToSize(c.cta || '', 95), LEFT + 9, y + 18)
  font('bold', 10, DEEP)
  pdf.text(COMPANY.phone + ' (WhatsApp)', 118, y + 13)
  font('normal', 10, DEEP)
  pdf.text(COMPANY.email, 118, y + 20)
  pdf.text(COMPANY.website, 118, y + 27)

  // ================= Footer =================
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

  pdf.save('Portfolio - Demo IT Solutions.pdf')
}
