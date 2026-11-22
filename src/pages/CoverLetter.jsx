import { useEffect, useState } from 'react'
import AddressToggle from '../components/AddressToggle'
import { Mail, Save, FileDown } from 'lucide-react'
import { supabase } from '../supabaseClient'
import { PageHeader, Stats, StatCard } from '../components/ui'
import Select from '../components/Select'
import { downloadCoverLetterPdf } from '../coverLetterPdf'

const KIND = 'cover_letter'

function today() {
  return new Date().toISOString().slice(0, 10)
}

// Starting text. You can change everything on the screen and press Save.
const DEFAULTS = {
  customer_id: '',
  letter_date: '',
  recipient_address: '',
  subject: 'Introduction to Demo IT Solutions',
  salutation: '',
  body:
    'Thank you for your interest in Demo IT Solutions. We are an IT solutions company in Johor, Malaysia. We build custom business systems, POS systems, web applications and websites, and we support our customers with computer repair, on-site IT support, IT maintenance and Microsoft 365 services.\n\nWe would be happy to understand your business needs and suggest a solution that fits your budget. Please find our documents enclosed for your review.\n\nIf you have any question, please call or WhatsApp us on +601163975503. We look forward to working with you.',
  enclosures: 'Company Profile\nPortfolio',
  closing: 'Yours sincerely,',
  signer_name: 'Demo User',
  signer_title: 'Founder',
}

function wordCount(text) {
  return String(text || '').trim().split(/\s+/).filter(Boolean).length
}

export default function CoverLetter() {
  const [form, setForm] = useState({ ...DEFAULTS, letter_date: today() })
  const [customers, setCustomers] = useState([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [saved, setSaved] = useState('')

  useEffect(() => {
    async function load() {
      const [t, c] = await Promise.all([
        supabase.from('company_templates').select('content').eq('kind', KIND).maybeSingle(),
        supabase.from('customers').select('id, name, phone, email').order('name'),
      ])
      if (t.error) setError(t.error.message)
      else if (t.data && t.data.content && Object.keys(t.data.content).length > 0) {
        setForm({ ...DEFAULTS, ...t.data.content, letter_date: today() })
      }
      setCustomers(c.data || [])
      setLoading(false)
    }
    load()
  }, [])

  function setField(key, value) {
    setSaved('')
    setForm((f) => ({ ...f, [key]: value }))
  }

  async function save() {
    setSaving(true)
    setError('')
    setSaved('')
    const { error: err } = await supabase
      .from('company_templates')
      .upsert({ kind: KIND, content: form, updated_at: new Date().toISOString() }, { onConflict: 'kind' })
    setSaving(false)
    if (err) setError(err.message)
    else setSaved('Saved.')
  }

  async function makePdf() {
    setError('')
    try {
      const customer = customers.find((c) => c.id === form.customer_id) || null
      await downloadCoverLetterPdf(form, customer)
    } catch (e) {
      setError('PDF failed: ' + e.message)
    }
  }

  if (loading) return <div className="empty-note">Loading...</div>

  const customer = customers.find((c) => c.id === form.customer_id)
  const paragraphs = String(form.body || '').split(/\n\s*\n/).filter((p) => p.trim()).length
  const enclosures = String(form.enclosures || '').split('\n').filter((l) => l.trim()).length

  return (
    <div>
      <PageHeader
        icon={Mail}
        title="Cover Letter"
        subtitle="Choose a customer, edit the letter, then download the PDF."
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
        <StatCard color="blue" icon={Mail} label="Paragraphs" value={paragraphs} />
        <StatCard color="purple" icon={Mail} label="Words" value={wordCount(form.body)} />
        <StatCard color="green" icon={Mail} label="Enclosures" value={enclosures} />
        <StatCard color="orange" icon={Mail} label="Customer" value={customer ? customer.name : 'None'} />
      </Stats>

      <div className="form-card">
        <h2>Letter details</h2>
        <div className="form-grid">
          <div>
            <label>Customer</label>
            <Select
              value={form.customer_id}
              onChange={(v) => setField('customer_id', v)}
              placeholder="Select customer"
              options={[{ value: '', label: 'No customer' }, ...customers.map((c) => ({ value: c.id, label: c.name }))]}
            />
          </div>
          <div>
            <label>Date</label>
            <input type="date" value={form.letter_date} onChange={(e) => setField('letter_date', e.target.value)} />
          </div>
          <div className="full">
            <label>Recipient address (one line per row, optional)</label>
            <textarea rows="3" value={form.recipient_address} onChange={(e) => setField('recipient_address', e.target.value)} />
          </div>
          <div className="full">
            <label>Subject</label>
            <input value={form.subject} onChange={(e) => setField('subject', e.target.value)} />
          </div>
          <div className="full">
            <label>Greeting (leave empty to use "Dear customer name,")</label>
            <input
              value={form.salutation}
              placeholder="Dear Sir/Madam,"
              onChange={(e) => setField('salutation', e.target.value)}
            />
          </div>
        </div>
      </div>

      <div className="form-card">
        <h2>Letter text (leave a blank line between paragraphs)</h2>
        <div className="form-grid">
          <div className="full">
            <label>Body</label>
            <textarea rows="12" value={form.body} onChange={(e) => setField('body', e.target.value)} />
          </div>
          <div className="full">
            <label>Enclosed documents (one per line)</label>
            <textarea rows="3" value={form.enclosures} onChange={(e) => setField('enclosures', e.target.value)} />
          </div>
        </div>
      </div>

      <div className="form-card">
        <h2>Closing</h2>
        <div className="form-grid">
          <div>
            <label>Closing words</label>
            <input value={form.closing} onChange={(e) => setField('closing', e.target.value)} />
          </div>
          <div>
            <label>Your name</label>
            <input value={form.signer_name} onChange={(e) => setField('signer_name', e.target.value)} />
          </div>
          <div>
            <label>Your title</label>
            <input value={form.signer_title} onChange={(e) => setField('signer_title', e.target.value)} />
          </div>
        </div>
      </div>

      <div className="form-actions">
        <button className="small icon-btn" onClick={save} disabled={saving}>
          <Save size={15} /> {saving ? 'Saving...' : 'Save'}
        </button>
      </div>
    </div>
  )
}