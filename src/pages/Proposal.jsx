import { useEffect, useState } from 'react'
import AddressToggle from '../components/AddressToggle'
import MoneyInput from '../components/MoneyInput'
import { FileText, Save, Plus, Trash2, Layers, CheckCircle2, Users, FileDown } from 'lucide-react'
import { supabase } from '../supabaseClient'
import { PageHeader, Stats, StatCard } from '../components/ui'
import Select from '../components/Select'
import { downloadProposalPdf } from '../proposalPdf'

const KIND = 'proposal'

function today() {
  return new Date().toISOString().slice(0, 10)
}

// Starting text. You can change everything on the screen and press Save.
const DEFAULTS = {
  customer_id: '',
  title: 'Proposal for Software Development',
  proposal_date: '',
  valid_until: '',
  intro:
    'Thank you for giving Demo IT Solutions the opportunity to present this proposal. Below you will find what we will build for you, what you will receive, how long it will take and the cost.',
  scope: 'Understand your business needs\nDesign and build the system\nTest the system with your staff\nInstall and train your staff',
  deliverables: 'Working system ready to use\nStaff training\nUser guide\n30 days support after delivery',
  timeline: 'Week 1: Requirements and design\nWeeks 2 to 4: Development\nWeek 5: Testing and training\nWeek 6: Go live',
  items: [{ description: '', quantity: '1', unit_price: '' }],
  payment_terms: '50% deposit before work starts\n50% balance on delivery',
  notes: '',
}

function lines(text) {
  return String(text || '')
    .split('\n')
    .map((s) => s.trim())
    .filter(Boolean)
}

function money(n) {
  return (
    'RM ' +
    Number(n || 0).toLocaleString('en-MY', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
  )
}

export default function Proposal() {
  const [form, setForm] = useState({ ...DEFAULTS, proposal_date: today() })
  const [customers, setCustomers] = useState([])
  const [services, setServices] = useState([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [saved, setSaved] = useState('')

  useEffect(() => {
    async function load() {
      const [t, c, s] = await Promise.all([
        supabase.from('company_templates').select('content').eq('kind', KIND).maybeSingle(),
        supabase.from('customers').select('id, name, phone, email').order('name'),
        supabase.from('services').select('id, name, price, active').order('name'),
      ])
      if (t.error) setError(t.error.message)
      else if (t.data && t.data.content && Object.keys(t.data.content).length > 0) {
        setForm({ ...DEFAULTS, proposal_date: today(), ...t.data.content })
      }
      setCustomers(c.data || [])
      setServices((s.data || []).filter((x) => x.active !== false))
      setLoading(false)
    }
    load()
  }, [])

  function setField(key, value) {
    setSaved('')
    setForm((f) => ({ ...f, [key]: value }))
  }

  function setItem(i, key, value) {
    setSaved('')
    setForm((f) => ({
      ...f,
      items: f.items.map((it, idx) => (idx === i ? { ...it, [key]: value } : it)),
    }))
  }

  function addItem() {
    setSaved('')
    setForm((f) => ({ ...f, items: [...f.items, { description: '', quantity: '1', unit_price: '' }] }))
  }

  function removeItem(i) {
    setSaved('')
    setForm((f) => ({ ...f, items: f.items.filter((_, idx) => idx !== i) }))
  }

  function addService(id) {
    const svc = services.find((s) => s.id === id)
    if (!svc) return
    setSaved('')
    setForm((f) => {
      const first = f.items.length === 1 && !f.items[0].description && !f.items[0].unit_price
      const line = { description: svc.name, quantity: '1', unit_price: String(svc.price ?? 0) }
      return { ...f, items: first ? [line] : [...f.items, line] }
    })
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
      await downloadProposalPdf(form, customer)
    } catch (e) {
      setError('PDF failed: ' + e.message)
    }
  }

  if (loading) return <div className="empty-note">Loading...</div>

  const total = form.items.reduce((sum, it) => sum + Number(it.quantity || 0) * Number(it.unit_price || 0), 0)

  return (
    <div>
      <PageHeader
        icon={FileText}
        title="Proposal"
        subtitle="Choose a customer, edit the text and prices, then download the PDF."
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
        <StatCard color="blue" icon={Layers} label="Scope Items" value={lines(form.scope).length} />
        <StatCard color="purple" icon={CheckCircle2} label="Deliverables" value={lines(form.deliverables).length} />
        <StatCard color="green" icon={FileText} label="Price Lines" value={form.items.filter((i) => i.description).length} />
        <StatCard color="orange" icon={Users} label="Total" value={money(total)} />
      </Stats>

      <div className="form-card">
        <h2>Proposal details</h2>
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
            <label>Proposal title</label>
            <input value={form.title} onChange={(e) => setField('title', e.target.value)} />
          </div>
          <div>
            <label>Date</label>
            <input type="date" value={form.proposal_date} onChange={(e) => setField('proposal_date', e.target.value)} />
          </div>
          <div>
            <label>Valid until</label>
            <input type="date" value={form.valid_until} onChange={(e) => setField('valid_until', e.target.value)} />
          </div>
          <div className="full">
            <label>Introduction</label>
            <textarea rows="4" value={form.intro} onChange={(e) => setField('intro', e.target.value)} />
          </div>
        </div>
      </div>

      <div className="form-card">
        <h2>Scope, deliverables and timeline (one per line)</h2>
        <div className="form-grid">
          <div>
            <label>Scope of work</label>
            <textarea rows="6" value={form.scope} onChange={(e) => setField('scope', e.target.value)} />
          </div>
          <div>
            <label>Deliverables</label>
            <textarea rows="6" value={form.deliverables} onChange={(e) => setField('deliverables', e.target.value)} />
          </div>
          <div className="full">
            <label>Timeline</label>
            <textarea rows="5" value={form.timeline} onChange={(e) => setField('timeline', e.target.value)} />
          </div>
        </div>
      </div>

      <div className="form-card">
        <h2>Pricing</h2>
        <div className="form-grid" style={{ marginBottom: 14 }}>
          <div>
            <label>Add from your services</label>
            <Select
              value=""
              onChange={addService}
              placeholder="Choose a service to add"
              options={services.map((s) => ({ value: s.id, label: s.name }))}
            />
          </div>
        </div>
        {form.items.map((it, i) => (
          <div className="form-grid" key={i} style={{ marginBottom: 14 }}>
            <div className="full">
              <label>Description</label>
              <input value={it.description} onChange={(e) => setItem(i, 'description', e.target.value)} />
            </div>
            <div>
              <label>Quantity</label>
              <input type="number" value={it.quantity} onChange={(e) => setItem(i, 'quantity', e.target.value)} />
            </div>
            <div>
              <label>Unit price (RM)</label>
              <MoneyInput value={it.unit_price} onChange={(e) => setItem(i, 'unit_price', e.target.value)} />
            </div>
            <div>
              <button className="small ghost icon-btn" type="button" onClick={() => removeItem(i)}>
                <Trash2 size={15} /> Remove
              </button>
            </div>
          </div>
        ))}
        <button className="small icon-btn" type="button" onClick={addItem}>
          <Plus size={15} /> Add price line
        </button>
        <p style={{ fontSize: 14, marginTop: 14 }}>
          <strong>Total: {money(total)}</strong>
        </p>
      </div>

      <div className="form-card">
        <h2>Payment terms and notes</h2>
        <div className="form-grid">
          <div className="full">
            <label>Payment terms (one per line)</label>
            <textarea rows="4" value={form.payment_terms} onChange={(e) => setField('payment_terms', e.target.value)} />
          </div>
          <div className="full">
            <label>Notes (optional)</label>
            <textarea rows="3" value={form.notes} onChange={(e) => setField('notes', e.target.value)} />
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