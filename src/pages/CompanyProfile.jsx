import { useEffect, useState } from 'react'
import AddressToggle from '../components/AddressToggle'
import { FileStack, Save, Plus, Trash2, Layers, Wrench, CheckCircle2, FileDown, RotateCcw } from 'lucide-react'
import { supabase } from '../supabaseClient'
import { PageHeader, Stats, StatCard } from '../components/ui'
import { COMPANY } from '../docSettings'
import { downloadCompanyProfilePdf } from '../companyProfilePdf'

const KIND = 'company_profile'

// Starting text. You can change everything on the screen and press Save.
// For services and "why choose us", write: Title - short description
const DEFAULTS = {
  version: 2,
  tagline: 'Your Trusted IT Partner in Johor',
  ssm_no: '000000000000 (DEMO-0000)',
  year_started: '2020',
  founder: 'Demo User',
  location: 'Johor Bahru, Johor, Malaysia',
  about:
    'Established in 2020, Demo IT Solutions is a sample company used in this demo. Based in Johor Bahru, we help small and medium businesses with custom software, POS systems and websites, and keep their computers running with fast, friendly IT support.',
  mission:
    'To give small and medium businesses reliable, affordable IT services and custom software that make their daily work easier.',
  vision: "To be Johor's go-to IT partner for growing businesses.",
  services_intro: 'Software is our main focus, backed by full IT support for your computers and staff.',
  software_services:
    'Custom Systems and Database Development - Business systems built around how you work: customers, jobs, stock and reports in one place.\n' +
    'POS Systems - Fast point-of-sale for restaurants and shops, with orders, billing and daily sales records.\n' +
    'Web Application Development - Online apps for bookings, records and daily operations that work on phone, tablet and laptop.\n' +
    'Website Development - Modern business websites with enquiry forms that bring you new customers.',
  it_services:
    'Computer and Laptop Services - Repairs, upgrades, Windows reinstallation and data recovery, including MacBooks and printers.\n' +
    'On-Site IT Support - We come to your office or shop to solve problems quickly.\n' +
    'IT Maintenance and Support - Regular check-ups and ongoing support to keep business computers running.\n' +
    'Microsoft 365 Services - Setup of Microsoft 365, Office apps, email and user accounts.',
  track_intro: 'Real work for businesses in Johor.',
  stats: [
    { value: '120+', label: 'Completed jobs' },
    { value: '15', label: 'Systems delivered' },
    { value: '8', label: 'Support contracts' },
  ],
  projects: [
    {
      name: 'Maju Jaya Grocery POS',
      description:
        'A barcode POS for a grocery shop, with receipt printing, low stock list and daily sales reports.',
    },
    {
      name: 'Senyum Indah Clinic System',
      description:
        'Patient records and appointment system for a dental clinic, used on PC and tablet.',
    },
  ],
  it_work:
    'Laptop and PC repairs\nSSD upgrades\nWindows reinstallation\nData recovery and backup\nMacBook service (macOS, battery)\nMotherboard repair\nScreen and battery replacement\nMicrosoft Office and Adobe installation\nPrinter troubleshooting\nOn-site IT support',
  clients: '',
  why_intro: 'One local team for your software, computers and support.',
  why_choose:
    'Software and hardware in one company - One team for your systems, computers and IT support.\n' +
    'Fast local service in Johor - Based in Johor Bahru, we reach you quickly.\n' +
    'Clear quotations - Written quotes before we start. No hidden costs.\n' +
    'Warranty on our work - Every job is backed by our service warranty.\n' +
    'Ongoing support - We stay with you after delivery with maintenance and help.\n' +
    'Built around your business - Simple screens your staff can learn quickly.',
  reviews: '',
  contact_intro: 'Tell us what you need. The fastest way to reach us is WhatsApp.',
  instagram: 'instagram.com/demo_it_solutions',
  tiktok: 'tiktok.com/@demo.it.solutions',
  review_link: '',
  show_bank: false,
}

function lines(text) {
  return String(text || '')
    .split('\n')
    .map((s) => s.trim())
    .filter(Boolean)
}

export default function CompanyProfile() {
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

  function setListItem(list, i, key, value) {
    setSaved('')
    setForm((f) => ({
      ...f,
      [list]: f[list].map((p, idx) => (idx === i ? { ...p, [key]: value } : p)),
    }))
  }

  function addListItem(list, empty) {
    setSaved('')
    setForm((f) => ({ ...f, [list]: [...f[list], empty] }))
  }

  function removeListItem(list, i) {
    setSaved('')
    setForm((f) => ({ ...f, [list]: f[list].filter((_, idx) => idx !== i) }))
  }

  function resetText() {
    if (!window.confirm('Put back the starting text? Your changes on this screen will be replaced.')) return
    setSaved('')
    setForm(DEFAULTS)
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

  async function makePdf() {
    setError('')
    try {
      await downloadCompanyProfilePdf(form)
    } catch (e) {
      setError('PDF failed: ' + e.message)
    }
  }

  if (loading) return <div className="empty-note">Loading...</div>

  const hint = { fontSize: 12, opacity: 0.7, marginTop: -4, marginBottom: 12 }

  return (
    <div>
      <PageHeader
        icon={FileStack}
        title="Company Profile"
        subtitle="Edit the text of your company profile, then download the PDF (6 pages)."
      >
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
        <StatCard
          color="blue"
          icon={Wrench}
          label="Services"
          value={lines(form.software_services).length + lines(form.it_services).length}
        />
        <StatCard color="green" icon={Layers} label="Projects" value={form.projects.length} />
        <StatCard color="purple" icon={FileStack} label="Businesses Named" value={lines(form.clients).length} />
        <StatCard color="orange" icon={CheckCircle2} label="Reviews" value={lines(form.reviews).length} />
      </Stats>

      {/* Page 1 + 2 */}
      <div className="form-card">
        <h2>Cover and About Us (pages 1 and 2)</h2>
        <div className="form-grid">
          <div>
            <label>Company name</label>
            <input value={COMPANY.name} disabled />
          </div>
          <div>
            <label>Tagline</label>
            <input value={form.tagline} onChange={(e) => setField('tagline', e.target.value)} />
          </div>
          <div>
            <label>SSM registration no.</label>
            <input value={form.ssm_no} onChange={(e) => setField('ssm_no', e.target.value)} />
          </div>
          <div>
            <label>Established</label>
            <input value={form.year_started} onChange={(e) => setField('year_started', e.target.value)} />
          </div>
          <div>
            <label>Founder</label>
            <input value={form.founder} onChange={(e) => setField('founder', e.target.value)} />
          </div>
          <div>
            <label>Based in</label>
            <input value={form.location} onChange={(e) => setField('location', e.target.value)} />
          </div>
          <div className="full">
            <label>About us</label>
            <textarea rows="5" value={form.about} onChange={(e) => setField('about', e.target.value)} />
          </div>
          <div>
            <label>Our mission</label>
            <textarea rows="3" value={form.mission} onChange={(e) => setField('mission', e.target.value)} />
          </div>
          <div>
            <label>Our vision</label>
            <textarea rows="3" value={form.vision} onChange={(e) => setField('vision', e.target.value)} />
          </div>
        </div>
      </div>

      {/* Page 3 */}
      <div className="form-card">
        <h2>Our Services (page 3)</h2>
        <p style={hint}>One service per line. Write: Service name - short description</p>
        <div className="form-grid">
          <div className="full">
            <label>Short line under the title</label>
            <input value={form.services_intro} onChange={(e) => setField('services_intro', e.target.value)} />
          </div>
          <div className="full">
            <label>Software services</label>
            <textarea
              rows="5"
              value={form.software_services}
              onChange={(e) => setField('software_services', e.target.value)}
            />
          </div>
          <div className="full">
            <label>IT services</label>
            <textarea rows="5" value={form.it_services} onChange={(e) => setField('it_services', e.target.value)} />
          </div>
        </div>
      </div>

      {/* Page 4 */}
      <div className="form-card">
        <h2>Track Record (page 4)</h2>
        <div className="form-grid">
          <div className="full">
            <label>Short line under the title</label>
            <input value={form.track_intro} onChange={(e) => setField('track_intro', e.target.value)} />
          </div>
        </div>

        <h3 style={{ marginTop: 16 }}>Numbers (up to 4)</h3>
        {form.stats.map((s, i) => (
          <div className="form-grid" key={'s' + i} style={{ marginBottom: 10 }}>
            <div>
              <label>Number</label>
              <input value={s.value} onChange={(e) => setListItem('stats', i, 'value', e.target.value)} />
            </div>
            <div>
              <label>Label</label>
              <input value={s.label} onChange={(e) => setListItem('stats', i, 'label', e.target.value)} />
            </div>
            <div style={{ display: 'flex', alignItems: 'flex-end' }}>
              <button className="small ghost icon-btn" type="button" onClick={() => removeListItem('stats', i)}>
                <Trash2 size={15} /> Remove
              </button>
            </div>
          </div>
        ))}
        {form.stats.length < 4 && (
          <button className="small icon-btn" type="button" onClick={() => addListItem('stats', { value: '', label: '' })}>
            <Plus size={15} /> Add number
          </button>
        )}

        <h3 style={{ marginTop: 20 }}>Featured projects</h3>
        {form.projects.map((p, i) => (
          <div className="form-grid" key={'p' + i} style={{ marginBottom: 14 }}>
            <div>
              <label>Project name</label>
              <input value={p.name} onChange={(e) => setListItem('projects', i, 'name', e.target.value)} />
            </div>
            <div style={{ display: 'flex', alignItems: 'flex-end' }}>
              <button className="small ghost icon-btn" type="button" onClick={() => removeListItem('projects', i)}>
                <Trash2 size={15} /> Remove
              </button>
            </div>
            <div className="full">
              <label>Description (2 short lines)</label>
              <textarea
                rows="3"
                value={p.description}
                onChange={(e) => setListItem('projects', i, 'description', e.target.value)}
              />
            </div>
          </div>
        ))}
        <button
          className="small icon-btn"
          type="button"
          onClick={() => addListItem('projects', { name: '', description: '' })}
        >
          <Plus size={15} /> Add project
        </button>

        <div className="form-grid" style={{ marginTop: 20 }}>
          <div>
            <label>IT work we do (one per line)</label>
            <textarea rows="8" value={form.it_work} onChange={(e) => setField('it_work', e.target.value)} />
          </div>
          <div>
            <label>Businesses we have worked with (one per line)</label>
            <textarea
              rows="8"
              placeholder="Only add a business after they agree to be named."
              value={form.clients}
              onChange={(e) => setField('clients', e.target.value)}
            />
          </div>
        </div>
      </div>

      {/* Page 5 */}
      <div className="form-card">
        <h2>Why Choose Us (page 5)</h2>
        <p style={hint}>One reason per line. Write: Reason - short description</p>
        <div className="form-grid">
          <div className="full">
            <label>Short line under the title</label>
            <input value={form.why_intro} onChange={(e) => setField('why_intro', e.target.value)} />
          </div>
          <div className="full">
            <label>Reasons</label>
            <textarea rows="7" value={form.why_choose} onChange={(e) => setField('why_choose', e.target.value)} />
          </div>
          <div className="full">
            <label>Google review quotes (one per line, optional)</label>
            <textarea
              rows="4"
              placeholder="Paste short review text here. No customer names."
              value={form.reviews}
              onChange={(e) => setField('reviews', e.target.value)}
            />
          </div>
        </div>
      </div>

      {/* Page 6 */}
      <div className="form-card">
        <h2>Contact (page 6)</h2>
        <div className="form-grid">
          <div className="full">
            <label>Short line under the title</label>
            <input value={form.contact_intro} onChange={(e) => setField('contact_intro', e.target.value)} />
          </div>
          <div>
            <label>Instagram</label>
            <input value={form.instagram} onChange={(e) => setField('instagram', e.target.value)} />
          </div>
          <div>
            <label>TikTok</label>
            <input value={form.tiktok} onChange={(e) => setField('tiktok', e.target.value)} />
          </div>
          <div className="full">
            <label>Google review link</label>
            <input value={form.review_link} onChange={(e) => setField('review_link', e.target.value)} />
          </div>
        </div>
        <p style={{ fontSize: 13, lineHeight: 1.7, marginTop: 12 }}>
          From your company details: {COMPANY.addressLines.join(' ')}
          <br />
          {COMPANY.phone} | {COMPANY.email} | {COMPANY.website}
        </p>
        <label className="addr-opt" style={{ marginTop: 10 }}>
          <input
            type="checkbox"
            checked={!!form.show_bank}
            onChange={(e) => setField('show_bank', e.target.checked)}
          />
          Show bank details on the Contact page
        </label>
      </div>

      <div className="form-actions">
        <button className="small ghost icon-btn" type="button" onClick={resetText}>
          <RotateCcw size={15} /> Starting text
        </button>
        <button className="small icon-btn" onClick={save} disabled={saving}>
          <Save size={15} /> {saving ? 'Saving...' : 'Save'}
        </button>
      </div>
    </div>
  )
}
