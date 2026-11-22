import { useEffect, useState } from 'react'
import { Briefcase, Save, FileDown, ListChecks, Package, Users, ClipboardList } from 'lucide-react'
import { supabase } from '../supabaseClient'
import { PageHeader, Stats, StatCard } from '../components/ui'
import Select from '../components/Select'
import { downloadMeetingKitPdf } from '../meetingKitPdf'

const KIND = 'meeting_kit'

function today() {
  return new Date().toISOString().slice(0, 10)
}

// Starting text. You can change everything on the screen and press Save.
const DEFAULTS = {
  customer_id: '',
  meeting_date: '',
  meeting_time: '',
  location: '',
  purpose: '',
  attendees: 'Demo User',
  agenda:
    'Introduction to Demo IT Solutions\nUnderstand the customer business\nDiscuss the problem and what they need\nShow our past projects\nNext steps and timeline',
  questions:
    'What does your business do and how many staff do you have?\nHow do you manage this work today?\nWhat problems or delays do you face?\nWhich devices and software do you use now?\nWhat is your budget and when do you need it?\nWho will make the final decision?',
  bring_list:
    'Company Profile\nPortfolio\nBlank Quotation\nBusiness cards\nLaptop or tablet for demo\nPen and notebook',
  notes: '',
  action_items: '',
  next_meeting: '',
}

function count(text) {
  return String(text || '').split('\n').filter((l) => l.trim()).length
}

export default function MeetingKit() {
  const [form, setForm] = useState({ ...DEFAULTS, meeting_date: today() })
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
        setForm({ ...DEFAULTS, ...t.data.content })
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
      await downloadMeetingKitPdf(form, customer)
    } catch (e) {
      setError('PDF failed: ' + e.message)
    }
  }

  if (loading) return <div className="empty-note">Loading...</div>

  return (
    <div>
      <PageHeader
        icon={Briefcase}
        title="Meeting Kit"
        subtitle="Prepare for a customer visit, then print the meeting sheet as a PDF."
      >
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
        <StatCard color="blue" icon={ClipboardList} label="Agenda Items" value={count(form.agenda)} />
        <StatCard color="purple" icon={ListChecks} label="Questions" value={count(form.questions)} />
        <StatCard color="green" icon={Package} label="Things to Bring" value={count(form.bring_list)} />
        <StatCard color="orange" icon={Users} label="Attendees" value={count(form.attendees)} />
      </Stats>

      <div className="form-card">
        <h2>Meeting details</h2>
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
            <label>Purpose</label>
            <input
              value={form.purpose}
              placeholder="Example: POS system discussion"
              onChange={(e) => setField('purpose', e.target.value)}
            />
          </div>
          <div>
            <label>Date</label>
            <input type="date" value={form.meeting_date} onChange={(e) => setField('meeting_date', e.target.value)} />
          </div>
          <div>
            <label>Time</label>
            <input type="time" value={form.meeting_time} onChange={(e) => setField('meeting_time', e.target.value)} />
          </div>
          <div className="full">
            <label>Place</label>
            <input value={form.location} onChange={(e) => setField('location', e.target.value)} />
          </div>
        </div>
      </div>

      <div className="form-card">
        <h2>Prepare (one per line)</h2>
        <div className="form-grid">
          <div>
            <label>Attendees</label>
            <textarea rows="4" value={form.attendees} onChange={(e) => setField('attendees', e.target.value)} />
          </div>
          <div>
            <label>Agenda</label>
            <textarea rows="4" value={form.agenda} onChange={(e) => setField('agenda', e.target.value)} />
          </div>
          <div>
            <label>Questions to ask</label>
            <textarea rows="7" value={form.questions} onChange={(e) => setField('questions', e.target.value)} />
          </div>
          <div>
            <label>Things to bring</label>
            <textarea rows="7" value={form.bring_list} onChange={(e) => setField('bring_list', e.target.value)} />
          </div>
        </div>
      </div>

      <div className="form-card">
        <h2>After the meeting</h2>
        <p style={{ fontSize: 12, opacity: 0.7, marginBottom: 10 }}>
          Leave Notes and Action items empty if you want blank lines on the printed sheet to write on.
        </p>
        <div className="form-grid">
          <div className="full">
            <label>Meeting notes</label>
            <textarea rows="6" value={form.notes} onChange={(e) => setField('notes', e.target.value)} />
          </div>
          <div className="full">
            <label>Action items (one per line)</label>
            <textarea rows="4" value={form.action_items} onChange={(e) => setField('action_items', e.target.value)} />
          </div>
          <div className="full">
            <label>Next step</label>
            <input
              value={form.next_meeting}
              placeholder="Example: Send quotation by Friday"
              onChange={(e) => setField('next_meeting', e.target.value)}
            />
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