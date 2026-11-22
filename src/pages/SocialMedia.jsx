import { useEffect, useRef, useState } from 'react'
import { Megaphone, Download, RotateCcw, Layers, Ruler, Image as ImageIcon } from 'lucide-react'
import { PageHeader, Stats, StatCard, Tabs } from '../components/ui'
import Select from '../components/Select'
import { COMPANY } from '../docSettings'

const FONT = '"Plus Jakarta Sans", "Segoe UI", Arial, sans-serif'

const SIZES = {
  square: { label: 'Square (1080 x 1080)', w: 1080, h: 1080 },
  portrait: { label: 'Portrait (1080 x 1350)', w: 1080, h: 1350 },
  story: { label: 'Story (1080 x 1920)', w: 1080, h: 1920 },
}

// Starting text for each template. You can change everything on the screen.
const TEMPLATES = {
  service: {
    label: 'Service Promo',
    values: {
      tag: 'Our Service',
      headline: 'Laptop and Computer Service',
      subtitle: 'Fast and honest repairs and upgrades for home and business.',
      points:
        'Hardware and software repair\nSSD, RAM and battery upgrade\nVirus removal and data backup\nOn-site support available',
      highlight: '',
      note: '',
      cta: 'Call or WhatsApp us today',
    },
  },
  pos: {
    label: 'POS Showcase',
    values: {
      tag: 'POS System',
      headline: 'Smart POS for Your Business',
      subtitle: 'For restaurants, cafes and shops. Fast billing, stock and reports.',
      points:
        'Easy billing and receipts\nMenu and stock management\nSales reports anytime\nWorks on tablet, laptop and phone',
      highlight: '',
      note: '',
      cta: 'Ask for a free demo',
    },
  },
  offer: {
    label: 'Special Offer',
    values: {
      tag: 'Special Offer',
      headline: 'Website Development Package',
      subtitle: '',
      points: 'Modern design\nMobile friendly\nContact and quotation form',
      highlight: 'SPECIAL PRICE',
      note: 'Limited time only. Terms apply.',
      cta: 'Message us now',
    },
  },
  tip: {
    label: 'IT Tip',
    values: {
      tag: 'IT Tip of the Day',
      headline: 'Back up your data every week',
      subtitle: '',
      points:
        'Keep one copy on an external drive\nKeep one copy in the cloud\nTest your backup once a month',
      highlight: '',
      note: '',
      cta: 'Need IT help? Contact us',
    },
  },
}

function allDefaults() {
  const out = {}
  Object.keys(TEMPLATES).forEach((k) => {
    out[k] = { ...TEMPLATES[k].values }
  })
  return out
}

function roundRectPath(ctx, x, y, w, h, r) {
  ctx.beginPath()
  ctx.moveTo(x + r, y)
  ctx.lineTo(x + w - r, y)
  ctx.quadraticCurveTo(x + w, y, x + w, y + r)
  ctx.lineTo(x + w, y + h - r)
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h)
  ctx.lineTo(x + r, y + h)
  ctx.quadraticCurveTo(x, y + h, x, y + h - r)
  ctx.lineTo(x, y + r)
  ctx.quadraticCurveTo(x, y, x + r, y)
  ctx.closePath()
}

function wrap(ctx, text, maxW) {
  const out = []
  String(text || '')
    .split('\n')
    .forEach((par) => {
      const words = par.split(' ').filter(Boolean)
      if (!words.length) return
      let line = ''
      words.forEach((w) => {
        const t = line ? line + ' ' + w : w
        if (ctx.measureText(t).width > maxW && line) {
          out.push(line)
          line = w
        } else {
          line = t
        }
      })
      if (line) out.push(line)
    })
  return out
}

// Draws (or only measures) the middle part of the post. Returns the end position.
function paintContent(ctx, W, H, v, s, draw) {
  const M = 70
  const maxW = W - 2 * M
  let y = 250 + Math.round((H - 1080) * 0.15)
  ctx.textBaseline = 'top'
  ctx.textAlign = 'left'

  if (v.tag && v.tag.trim()) {
    ctx.font = 'bold ' + 26 * s + 'px ' + FONT
    const label = v.tag.toUpperCase()
    const tw = ctx.measureText(label).width
    if (draw) {
      ctx.fillStyle = '#FF2028'
      roundRectPath(ctx, M, y, tw + 44, 52 * s, 26 * s)
      ctx.fill()
      ctx.fillStyle = '#ffffff'
      ctx.fillText(label, M + 22, y + 12 * s)
    }
    y += 52 * s + 30 * s
  }

  if (v.headline && v.headline.trim()) {
    ctx.font = 'bold ' + 66 * s + 'px ' + FONT
    const lines = wrap(ctx, v.headline, maxW)
    lines.forEach((ln, i) => {
      if (draw) {
        ctx.fillStyle = '#ffffff'
        ctx.fillText(ln, M, y + i * 76 * s)
      }
    })
    y += lines.length * 76 * s + 6
    if (draw) {
      ctx.fillStyle = '#FF2028'
      ctx.fillRect(M, y, 120, 8)
    }
    y += 8 + 26 * s
  }

  if (v.subtitle && v.subtitle.trim()) {
    ctx.font = 30 * s + 'px ' + FONT
    const lines = wrap(ctx, v.subtitle, maxW)
    lines.forEach((ln, i) => {
      if (draw) {
        ctx.fillStyle = '#cfcfcf'
        ctx.fillText(ln, M, y + i * 42 * s)
      }
    })
    y += lines.length * 42 * s + 26 * s
  }

  if (v.highlight && v.highlight.trim()) {
    ctx.font = 'bold ' + 64 * s + 'px ' + FONT
    const hh = 110 * s
    if (draw) {
      const g = ctx.createLinearGradient(M, y, W - M, y + hh)
      g.addColorStop(0, '#FF2028')
      g.addColorStop(1, '#a80c14')
      ctx.fillStyle = g
      roundRectPath(ctx, M, y, maxW, hh, 22)
      ctx.fill()
      ctx.fillStyle = '#ffffff'
      ctx.textAlign = 'center'
      ctx.fillText(v.highlight, W / 2, y + hh / 2 - 32 * s)
      ctx.textAlign = 'left'
    }
    y += hh + 30 * s
  }

  if (v.points && v.points.trim()) {
    ctx.font = 32 * s + 'px ' + FONT
    String(v.points)
      .split('\n')
      .filter((p) => p.trim())
      .forEach((p) => {
        const lines = wrap(ctx, p, maxW - 50)
        if (draw) {
          ctx.fillStyle = '#FF2028'
          ctx.beginPath()
          ctx.arc(M + 12, y + 19 * s, 9, 0, Math.PI * 2)
          ctx.fill()
          ctx.fillStyle = '#ffffff'
          lines.forEach((ln, i) => ctx.fillText(ln, M + 45, y + i * 42 * s))
        }
        y += lines.length * 42 * s + 14 * s
      })
  }

  if (v.note && v.note.trim()) {
    ctx.font = 'italic ' + 24 * s + 'px ' + FONT
    const lines = wrap(ctx, v.note, maxW)
    y += 6
    lines.forEach((ln, i) => {
      if (draw) {
        ctx.fillStyle = '#9a9a9a'
        ctx.fillText(ln, M, y + i * 32 * s)
      }
    })
    y += lines.length * 32 * s
  }
  return y
}

function drawPost(canvas, size, v, logo) {
  const W = size.w
  const H = size.h
  canvas.width = W
  canvas.height = H
  const ctx = canvas.getContext('2d')
  const M = 70

  // Background and red glow
  ctx.fillStyle = '#080808'
  ctx.fillRect(0, 0, W, H)
  const glow = ctx.createRadialGradient(W, 0, 0, W, 0, W * 0.9)
  glow.addColorStop(0, 'rgba(255,32,40,0.38)')
  glow.addColorStop(1, 'rgba(8,8,8,0)')
  ctx.fillStyle = glow
  ctx.fillRect(0, 0, W, H)
  const glow2 = ctx.createRadialGradient(0, H, 0, 0, H, W * 0.8)
  glow2.addColorStop(0, 'rgba(255,32,40,0.22)')
  glow2.addColorStop(1, 'rgba(8,8,8,0)')
  ctx.fillStyle = glow2
  ctx.fillRect(0, 0, W, H)

  // Glowing red border
  ctx.save()
  ctx.strokeStyle = '#FF2028'
  ctx.lineWidth = 4
  ctx.shadowColor = '#FF2028'
  ctx.shadowBlur = 30
  roundRectPath(ctx, 24, 24, W - 48, H - 48, 28)
  ctx.stroke()
  ctx.restore()

  // Logo in a light circle + company name
  const cx = M + 46
  const cy = 70 + 46
  ctx.fillStyle = '#f2f2f2'
  ctx.beginPath()
  ctx.arc(cx, cy, 46, 0, Math.PI * 2)
  ctx.fill()
  if (logo) {
    const box = 70
    const r = Math.min(box / logo.width, box / logo.height)
    const lw = logo.width * r
    const lh = logo.height * r
    ctx.drawImage(logo, cx - lw / 2, cy - lh / 2, lw, lh)
  }
  ctx.textBaseline = 'top'
  ctx.textAlign = 'left'
  ctx.fillStyle = '#ffffff'
  ctx.font = 'bold 36px ' + FONT
  ctx.fillText('DEMO IT', M + 112, 76)
  ctx.fillStyle = '#FF2028'
  ctx.font = 'bold 22px ' + FONT
  ctx.fillText('COMPUTER ENTERPRISE', M + 112, 120)

  // Middle content: shrink the text a little if it is too long
  const limit = H - 300
  let s = 1
  while (s > 0.55 && paintContent(ctx, W, H, v, s, false) > limit) s -= 0.05
  paintContent(ctx, W, H, v, s, true)

  // Button
  if (v.cta && v.cta.trim()) {
    ctx.font = 'bold 32px ' + FONT
    const tw = ctx.measureText(v.cta).width
    const by = H - 262
    ctx.fillStyle = '#FF2028'
    roundRectPath(ctx, M, by, tw + 80, 76, 38)
    ctx.fill()
    ctx.fillStyle = '#ffffff'
    ctx.textBaseline = 'middle'
    ctx.fillText(v.cta, M + 40, by + 39)
    ctx.textBaseline = 'top'
  }

  // Footer
  ctx.fillStyle = 'rgba(255,255,255,0.18)'
  ctx.fillRect(M, H - 150, W - 2 * M, 2)
  ctx.textAlign = 'center'
  ctx.fillStyle = '#ffffff'
  ctx.font = 'bold 30px ' + FONT
  ctx.fillText(COMPANY.phone + '   |   ' + COMPANY.website, W / 2, H - 125)
  ctx.fillStyle = '#9a9a9a'
  ctx.font = '24px ' + FONT
  ctx.fillText(COMPANY.email, W / 2, H - 82)
  ctx.textAlign = 'left'
}

export default function SocialMedia() {
  const canvasRef = useRef(null)
  const [tpl, setTpl] = useState('service')
  const [sizeKey, setSizeKey] = useState('square')
  const [data, setData] = useState(allDefaults())
  const [logo, setLogo] = useState(null)
  const [count, setCount] = useState(0)

  useEffect(() => {
    const img = new Image()
    img.onload = () => setLogo(img)
    img.src = '/logo.png'
  }, [])

  useEffect(() => {
    if (canvasRef.current) drawPost(canvasRef.current, SIZES[sizeKey], data[tpl], logo)
  }, [tpl, sizeKey, data, logo])

  function setField(key, value) {
    setData((d) => ({ ...d, [tpl]: { ...d[tpl], [key]: value } }))
  }

  function resetTemplate() {
    setData((d) => ({ ...d, [tpl]: { ...TEMPLATES[tpl].values } }))
  }

  function download() {
    const canvas = canvasRef.current
    if (!canvas) return
    canvas.toBlob((blob) => {
      if (!blob) return
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = 'sarvesh-' + tpl + '-' + sizeKey + '.png'
      document.body.appendChild(a)
      a.click()
      a.remove()
      URL.revokeObjectURL(url)
      setCount((c) => c + 1)
    }, 'image/png')
  }

  const v = data[tpl]
  const size = SIZES[sizeKey]
  const previewMax = sizeKey === 'story' ? 340 : 520

  return (
    <div>
      <PageHeader
        icon={Megaphone}
        title="Social Media Studio"
        subtitle="Pick a template, type your text, and download the post as a PNG image."
      >
        <button className="small icon-btn" onClick={resetTemplate}>
          <RotateCcw size={15} /> Reset text
        </button>
        <button className="small blue icon-btn" onClick={download}>
          <Download size={15} /> Download PNG
        </button>
      </PageHeader>

      <Stats>
        <StatCard color="blue" icon={Layers} label="Templates" value={Object.keys(TEMPLATES).length} />
        <StatCard color="purple" icon={Ruler} label="Sizes" value={Object.keys(SIZES).length} />
        <StatCard color="green" icon={ImageIcon} label="Downloaded (this visit)" value={count} />
        <StatCard color="orange" icon={Megaphone} label="Current" value={TEMPLATES[tpl].label} />
      </Stats>

      <Tabs
        tabs={Object.keys(TEMPLATES).map((k) => ({ key: k, label: TEMPLATES[k].label }))}
        value={tpl}
        onChange={setTpl}
      />

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(min(320px, 100%), 1fr))',
          gap: 16,
          alignItems: 'start',
        }}
      >
        <div className="form-card">
          <h2>Post text</h2>
          <p style={{ fontSize: 12, opacity: 0.7, marginBottom: 10 }}>
            Keep the text short for the best look. Leave a box empty to hide it on the post.
          </p>
          <div className="form-grid">
            <div className="full">
              <label>Size</label>
              <Select
                value={sizeKey}
                onChange={setSizeKey}
                options={Object.keys(SIZES).map((k) => ({ value: k, label: SIZES[k].label }))}
              />
            </div>
            <div>
              <label>Small tag (top)</label>
              <input value={v.tag} onChange={(e) => setField('tag', e.target.value)} />
            </div>
            <div>
              <label>Button text</label>
              <input value={v.cta} onChange={(e) => setField('cta', e.target.value)} />
            </div>
            <div className="full">
              <label>Headline</label>
              <input value={v.headline} onChange={(e) => setField('headline', e.target.value)} />
            </div>
            <div className="full">
              <label>Sub heading</label>
              <textarea rows="2" value={v.subtitle} onChange={(e) => setField('subtitle', e.target.value)} />
            </div>
            <div className="full">
              <label>Points (one per line)</label>
              <textarea rows="5" value={v.points} onChange={(e) => setField('points', e.target.value)} />
            </div>
            <div className="full">
              <label>Big highlight box (example: 20% OFF)</label>
              <input value={v.highlight} onChange={(e) => setField('highlight', e.target.value)} />
            </div>
            <div className="full">
              <label>Small note</label>
              <input value={v.note} onChange={(e) => setField('note', e.target.value)} />
            </div>
          </div>
        </div>

        <div className="form-card">
          <h2>Preview</h2>
          <div style={{ maxWidth: previewMax, margin: '0 auto' }}>
            <canvas
              ref={canvasRef}
              style={{
                width: '100%',
                height: 'auto',
                aspectRatio: size.w + ' / ' + size.h,
                borderRadius: 10,
                display: 'block',
              }}
            />
          </div>
        </div>
      </div>
    </div>
  )
}
