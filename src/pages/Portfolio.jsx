import { useEffect, useState } from 'react'
import AddressToggle from '../components/AddressToggle'
import { FileStack, Save, Plus, Trash2, Layers, Wrench, FileDown, ImagePlus, Image as ImageIcon } from 'lucide-react'
import { supabase } from '../supabaseClient'
import { PageHeader, Stats, StatCard } from '../components/ui'
import { downloadPortfolioPdf } from '../portfolioPdf'

const KIND = 'portfolio'
const MAX_SHOTS = 4

const EMPTY_PROJECT = {
  name: '',
  client: '',
  category: '',
  tech: '',
  challenge: '',
  solution: '',
  features: '',
  result: '',
  images: [],
}

const EMPTY_CASE = { title: '', problem: '', work: '', result: '', before: '', after: '' }

// Starting text. You can change everything on the screen and press Save.
const DEFAULTS = {
  version: 2,
  tagline: 'Systems and IT work we have delivered for businesses in Johor',
  intro:
    'Here are some of the systems and IT jobs we have delivered. Each one was built around how the business really works.',
  process:
    'Free consultation - We visit or call you to understand how your business works and what you need.\n' +
    'Clear quotation - You get a written quote with the scope, timeline and payment terms.\n' +
    'Build and test - We build the system step by step and show you the progress along the way.\n' +
    'Training and handover - We set it up on your devices and train your staff.\n' +
    'Ongoing support - We stay with you for fixes, changes and new features.',
  projects: [
    {
      name: 'Maju Jaya Grocery POS',
      client: 'Kedai Runcit Maju Jaya',
      category: 'POS System',
      tech: 'Web app, cloud database, cloud hosting',
      challenge:
        'The grocery shop wrote sales in a book and could not see which items were running out or how much they sold each day.',
      solution:
        'We set up a barcode POS that runs in the browser on the shop counter PC, with a receipt printer and cash drawer.',
      features:
        'Barcode scanning\nReceipt printing on an 80mm thermal printer\nCash and e-wallet payments\nLow stock list\nDaily and monthly sales report',
      result:
        'The owner now sees daily sales and low stock on his phone, and checkout is much faster.',
      images: [],
    },
    {
      name: 'Senyum Indah Clinic System',
      client: 'Klinik Gigi Senyum Indah',
      category: 'Custom System',
      tech: 'Web app, cloud database, cloud hosting',
      challenge:
        'The dental clinic kept patient cards on paper and booked appointments in a diary, which caused double bookings.',
      solution:
        'We built a patient records and appointment system that the front desk and dentists use on PC and tablet.',
      features:
        'Patient records and treatment history\nAppointment calendar\nReminder list for the front desk\nStaff logins\nWorks on PC and tablet',
      result:
        'No more double bookings, and patient history is ready before every visit.',
      images: [],
    },
  ],
  it_intro: 'Everyday IT jobs we handle for homes, shops and offices.',
  it_cases: [
    {
      title: 'Slow Laptop: SSD Upgrade and Windows Reinstallation',
      problem: 'The laptop was very slow to start and to open programs.',
      work: 'Replaced the old hard disk with an SSD, reinstalled Windows, and put back the files and software the customer needed.',
      result: 'The laptop starts and runs much faster, with all important files kept.',
      before: '',
      after: '',
    },
    {
      title: 'MacBook Service: Battery and macOS',
      problem: 'The battery drained quickly and macOS was running slowly.',
      work: 'Replaced the battery and reinstalled and updated macOS.',
      result: 'The MacBook is back to normal daily use.',
      before: '',
      after: '',
    },
  ],
  cta: 'Tell us how your business works. We will show you a free demo and give you a clear quotation.',
}

function lines(text) {
  return String(text || '')
    .split('\n')
    .map((s) => s.trim())
    .filter(Boolean)
}

// Makes a photo smaller (max 1200 px, JPEG) so it saves quickly
function compressImage(file, max = 1200, quality = 0.8) {
  return new Promise((resolve, reject) => {
    const fr = new FileReader()
    fr.onerror = () => reject(new Error('Could not read the picture'))
    fr.onload = () => {
      const img = new Image()
      img.onerror = () => reject(new Error('This file is not a picture'))
      img.onload = () => {
        const scale = Math.min(1, max / Math.max(img.width, img.height))
        const canvas = document.createElement('canvas')
        canvas.width = Math.round(img.width * scale)
        canvas.height = Math.round(img.height * scale)
        const ctx = canvas.getContext('2d')
        ctx.fillStyle = '#ffffff'
        ctx.fillRect(0, 0, canvas.width, canvas.height)
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height)
        resolve(canvas.toDataURL('image/jpeg', quality))
      }
      img.src = fr.result
    }
    fr.readAsDataURL(file)
  })
}

const thumbBox = {
  position: 'relative',
  width: 120,
  height: 90,
  borderRadius: 10,
  overflow: 'hidden',
  border: '1px solid rgba(255,255,255,0.16)',
  background: 'rgba(0,0,0,0.35)',
}
const thumbImg = { width: '100%', height: '100%', objectFit: 'contain' }
const thumbX = {
  position: 'absolute',
  top: 4,
  right: 4,
  padding: '2px 6px',
  fontSize: 12,
  borderRadius: 6,
}

function Thumb({ src, onRemove }) {
  return (
    <div style={thumbBox}>
      <img src={src} alt="" style={thumbImg} />
      <button type="button" className="small ghost" style={thumbX} onClick={onRemove}>
        X
      </button>
    </div>
  )
}

function PickButton({ text, multiple, onFiles }) {
  return (
    <label className="small icon-btn" style={{ cursor: 'pointer', display: 'inline-flex' }}>
      <ImagePlus size={15} /> {text}
      <input
        type="file"
        accept="image/*"
        multiple={multiple}
        style={{ display: 'none' }}
        onChange={(e) => {
          const files = Array.from(e.target.files || [])
          e.target.value = ''
          if (files.length) onFiles(files)
        }}
      />
    </label>
  )
}

export default function Portfolio() {
  const [form, setForm] = useState(DEFAULTS)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [saved, setSaved] = useState('')

  useEffect(() => {
    async function load() {
      const { data, error: err } = await supabase
        .from('company_templates')
        .select('content')
        .eq('kind', KIND)
        .maybeSingle()
      if (err) setError(err.message)
      else if (data && data.content && data.content.version === 2) {
        setForm({ ...DEFAULTS, ...data.content })
      }
      setLoading(false)
    }
    load()
  }, [])

  function setField(key, value) {
    setSaved('')
    setForm((f) => ({ ...f, [key]: value }))
  }

  function setItem(list, i, key, value) {
    setSaved('')
    setForm((f) => ({
      ...f,
      [list]: f[list].map((p, idx) => (idx === i ? { ...p, [key]: value } : p)),
    }))
  }

  function addItem(list, empty) {
    setSaved('')
    setForm((f) => ({ ...f, [list]: [...f[list], { ...empty }] }))
  }

  function removeItem(list, i, what) {
    if (!window.confirm('Remove this ' + what + '?')) return
    setSaved('')
    setForm((f) => ({ ...f, [list]: f[list].filter((_, idx) => idx !== i) }))
  }

  async function addShots(i, files) {
    setError('')
    try {
      const room = MAX_SHOTS - (form.projects[i].images || []).length
      if (room <= 0) {
        setError('Up to ' + MAX_SHOTS + ' screenshots per project. Remove one first.')
        return
      }
      const pics = []
      for (const file of files.slice(0, room)) pics.push(await compressImage(file))
      setSaved('')
      setForm((f) => ({
        ...f,
        projects: f.projects.map((p, idx) =>
          idx === i ? { ...p, images: [...(p.images || []), ...pics] } : p
        ),
      }))
      if (files.length > room) setError('Only ' + room + ' more screenshot(s) could be added.')
    } catch (e) {
      setError(e.message)
    }
  }

  function removeShot(i, j) {
    setSaved('')
    setForm((f) => ({
      ...f,
      projects: f.projects.map((p, idx) =>
        idx === i ? { ...p, images: p.images.filter((_, k) => k !== j) } : p
      ),
    }))
  }

  async function setCasePhoto(i, key, files) {
    setError('')
    try {
      const pic = await compressImage(files[0])
      setItem('it_cases', i, key, pic)
    } catch (e) {
      setError(e.message)
    }
  }

  async function save() {
    setSaving(true)
    setError('')
    setSaved('')
    const { error: err } = await supabase
      .from('company_templates')
      .upsert(
        { kind: KIND, content: { ...form, version: 2 }, updated_at: new Date().toISOString() },
        { onConflict: 'kind' }
      )
    setSaving(false)
    if (err) setError(err.message)
    else setSaved('Saved.')
  }

  function resetText() {
    if (!window.confirm('Put back the starting text? Your changes and pictures on this screen will be replaced.'))
      return
    setSaved('')
    setForm(DEFAULTS)
  }

  async function makePdf() {
    setError('')
    try {
      await downloadPortfolioPdf(form)
    } catch (e) {
      setError('PDF failed: ' + e.message)
    }
  }

  if (loading) return <div className="empty-note">Loading...</div>

  const shotCount =
    form.projects.reduce((sum, p) => sum + (p.images || []).length, 0) +
    form.it_cases.reduce((sum, k) => sum + (k.before ? 1 : 0) + (k.after ? 1 : 0), 0)
  const hint = { fontSize: 12, opacity: 0.7, marginTop: -4, marginBottom: 12 }

  return (
    <div>
      <PageHeader icon={FileStack} title="Portfolio" subtitle="Your best work in detail. Edit, add screenshots, then download the PDF.">
        <AddressToggle />
        <button className="small blue icon-btn" onClick={makePdf}>
          <FileDown size={15} /> Download PDF
        </button>
        <button className="small icon-btn" onClick={save} disabled={saving}>
          <Save size={15} /> {saving ? 'Saving...' : 'Save'}
        </button>
      </PageHeader>

      {error && <p className="error">{error}</p>}
      {saved && <p style={{ color: '#3ddc84', fontSize: 13 }}>{saved}</p>}

      <Stats>
        <StatCard color="blue" icon={Layers} label="Software Projects" value={form.projects.length} />
        <StatCard color="purple" icon={Wrench} label="IT Case Studies" value={form.it_cases.length} />
        <StatCard color="green" icon={ImageIcon} label="Pictures" value={shotCount} />
      </Stats>

      {/* Intro */}
      <div className="form-card">
        <h2>Cover and introduction</h2>
        <div className="form-grid">
          <div className="full">
            <label>Line on the cover</label>
            <input value={form.tagline} onChange={(e) => setField('tagline', e.target.value)} />
          </div>
          <div className="full">
            <label>Short introduction</label>
            <textarea rows="3" value={form.intro} onChange={(e) => setField('intro', e.target.value)} />
          </div>
          <div className="full">
            <label>How we work (one step per line. Write: Step - short description)</label>
            <textarea rows="6" value={form.process} onChange={(e) => setField('process', e.target.value)} />
          </div>
        </div>
      </div>

      {/* Software projects */}
      {form.projects.map((p, i) => (
        <div className="form-card" key={'p' + i}>
          <h2>Software project {i + 1}</h2>
          <div className="form-grid">
            <div>
              <label>Project name</label>
              <input value={p.name} onChange={(e) => setItem('projects', i, 'name', e.target.value)} />
            </div>
            <div>
              <label>Client (business name)</label>
              <input value={p.client} onChange={(e) => setItem('projects', i, 'client', e.target.value)} />
            </div>
            <div>
              <label>Category</label>
              <input value={p.category} onChange={(e) => setItem('projects', i, 'category', e.target.value)} />
            </div>
            <div>
              <label>Built with</label>
              <input value={p.tech} onChange={(e) => setItem('projects', i, 'tech', e.target.value)} />
            </div>
            <div>
              <label>The challenge (their problem)</label>
              <textarea rows="4" value={p.challenge} onChange={(e) => setItem('projects', i, 'challenge', e.target.value)} />
            </div>
            <div>
              <label>Our solution</label>
              <textarea rows="4" value={p.solution} onChange={(e) => setItem('projects', i, 'solution', e.target.value)} />
            </div>
            <div>
              <label>Key features (one per line)</label>
              <textarea rows="6" value={p.features} onChange={(e) => setItem('projects', i, 'features', e.target.value)} />
            </div>
            <div>
              <label>The result</label>
              <textarea rows="6" value={p.result} onChange={(e) => setItem('projects', i, 'result', e.target.value)} />
            </div>
          </div>

          <h3 style={{ marginTop: 16 }}>Screenshots (up to {MAX_SHOTS})</h3>
          <p style={hint}>Use screenshots without real customer names, phone numbers or prices.</p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, marginBottom: 12 }}>
            {(p.images || []).map((src, j) => (
              <Thumb key={j} src={src} onRemove={() => removeShot(i, j)} />
            ))}
          </div>
          <div className="form-actions" style={{ justifyContent: 'space-between' }}>
            {(p.images || []).length < MAX_SHOTS ? (
              <PickButton text="Add screenshots" multiple onFiles={(files) => addShots(i, files)} />
            ) : (
              <span />
            )}
            <button className="small ghost icon-btn" type="button" onClick={() => removeItem('projects', i, 'project')}>
              <Trash2 size={15} /> Remove this project
            </button>
          </div>
        </div>
      ))}
      <div className="form-actions" style={{ marginBottom: 18 }}>
        <button className="small icon-btn" type="button" onClick={() => addItem('projects', EMPTY_PROJECT)}>
          <Plus size={15} /> Add software project
        </button>
      </div>

      {/* IT case studies */}
      <div className="form-card">
        <h2>IT service case studies</h2>
        <div className="form-grid">
          <div className="full">
            <label>Short line under the title</label>
            <input value={form.it_intro} onChange={(e) => setField('it_intro', e.target.value)} />
          </div>
        </div>
      </div>

      {form.it_cases.map((k, i) => (
        <div className="form-card" key={'c' + i}>
          <h2>IT job {i + 1}</h2>
          <div className="form-grid">
            <div className="full">
              <label>Title</label>
              <input value={k.title} onChange={(e) => setItem('it_cases', i, 'title', e.target.value)} />
            </div>
            <div className="full">
              <label>Problem</label>
              <textarea rows="2" value={k.problem} onChange={(e) => setItem('it_cases', i, 'problem', e.target.value)} />
            </div>
            <div className="full">
              <label>What we did</label>
              <textarea rows="2" value={k.work} onChange={(e) => setItem('it_cases', i, 'work', e.target.value)} />
            </div>
            <div className="full">
              <label>Result</label>
              <textarea rows="2" value={k.result} onChange={(e) => setItem('it_cases', i, 'result', e.target.value)} />
            </div>
          </div>

          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 24, marginTop: 14 }}>
            {[
              ['before', 'Before photo'],
              ['after', 'After photo'],
            ].map(([key, text]) => (
              <div key={key}>
                <label>{text}</label>
                <div style={{ marginTop: 6, marginBottom: 8 }}>
                  {k[key] ? (
                    <Thumb src={k[key]} onRemove={() => setItem('it_cases', i, key, '')} />
                  ) : (
                    <PickButton text={'Add ' + text.toLowerCase()} onFiles={(files) => setCasePhoto(i, key, files)} />
                  )}
                </div>
              </div>
            ))}
          </div>

          <div className="form-actions">
            <button className="small ghost icon-btn" type="button" onClick={() => removeItem('it_cases', i, 'IT job')}>
              <Trash2 size={15} /> Remove this IT job
            </button>
          </div>
        </div>
      ))}
      <div className="form-actions" style={{ marginBottom: 18 }}>
        <button className="small icon-btn" type="button" onClick={() => addItem('it_cases', EMPTY_CASE)}>
          <Plus size={15} /> Add IT job
        </button>
      </div>

      {/* Ending */}
      <div className="form-card">
        <h2>Last box: Let's build yours</h2>
        <div className="form-grid">
          <div className="full">
            <label>Text</label>
            <textarea rows="2" value={form.cta} onChange={(e) => setField('cta', e.target.value)} />
          </div>
        </div>
      </div>

      <div className="form-actions">
        <button className="small ghost icon-btn" type="button" onClick={resetText}>
          Starting text
        </button>
        <button className="small icon-btn" onClick={save} disabled={saving}>
          <Save size={15} /> {saving ? 'Saving...' : 'Save'}
        </button>
      </div>
    </div>
  )
}
