import { useEffect, useMemo, useState } from 'react'
import MoneyInput from '../components/MoneyInput'
import { useNavigate } from 'react-router-dom'
import {
  Target, Users, Hourglass, CheckCircle2, XCircle, RefreshCw, Download, Eye, Pencil, Trash2,
  MessageCircle, Mail, FileText, Search, Plus, CalendarClock, BarChart3, PieChart,
} from 'lucide-react'
import { supabase } from '../supabaseClient'
import Select from '../components/Select'
import DatePicker from '../components/DatePicker'
import { useConfirm } from '../components/ConfirmDialog'
import { PageHeader, Stats, StatCard, Tabs, Panel } from '../components/ui'

const STAGES = ['New', 'Contacted', 'Meeting', 'Proposal Sent', 'Won', 'Lost']
const IN_PROGRESS = ['Contacted', 'Meeting', 'Proposal Sent']
const SOURCES = ['Manual', 'Website', 'WhatsApp', 'Phone call', 'Referral', 'Walk-in', 'Facebook', 'Instagram']

const STAGE_COLOR = {
  New: 'blue', Contacted: 'purple', Meeting: 'orange', 'Proposal Sent': 'orange', Won: 'green', Lost: 'red',
}

const emptyForm = {
  name: '',
  company: '',
  phone: '',
  email: '',
  source: 'Manual',
  service_interest: '',
  message: '',
  stage: 'New',
  value: '',
  next_follow_up: '',
  notes: '',
  customer_id: '',
}

const css = `
.bars { display: grid; gap: 9px; }
.bar-row { display: grid; grid-template-columns: 110px 1fr 34px; gap: 10px; align-items: center; font-size: 12.5px; }
.bar-track { background: #17171b; border-radius: 8px; height: 10px; overflow: hidden; }
.bar-fill { height: 100%; border-radius: 8px; background: linear-gradient(90deg, #ff2028, #ff6a70); }
.bar-row b { text-align: right; }
.fu-row { display: flex; justify-content: space-between; gap: 10px; padding: 8px 0; border-bottom: 1px solid #17171b; font-size: 13px; }
.fu-row:last-child { border-bottom: none; }
.fu-row small { color: var(--muted); display: block; }
.fu-date.overdue { color: #ff8a8f; font-weight: 600; }
.sub-line { color: var(--muted); font-size: 12px; }
`

function money(n) {
  return 'RM ' + Number(n || 0).toLocaleString('en-MY', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

function showDate(iso) {
  if (!iso) return '-'
  const [y, m, d] = String(iso).slice(0, 10).split('-')
  return d + '/' + m + '/' + y
}

function waNumber(raw) {
  const text = String(raw || '').trim()
  let d = text.replace(/\D/g, '')
  if (!d) return ''
  if (!text.startsWith('+')) {
    if (d.startsWith('00')) d = d.slice(2)
    else if (d.startsWith('0')) d = '60' + d.slice(1)
    else if (!d.startsWith('60') && d.length <= 10) d = '60' + d
  }
  return d
}

function exportCsv(list) {
  const cols = [
    ['Name', 'name'], ['Company', 'company'], ['Phone', 'phone'], ['Email', 'email'], ['Stage', 'stage'],
    ['Source', 'source'], ['Service', 'service_interest'], ['Value', 'value'], ['Next follow-up', 'next_follow_up'],
  ]
  const esc = (v) => '"' + String(v ?? '').replace(/"/g, '""') + '"'
  const lines = [cols.map((c) => esc(c[0])).join(',')].concat(
    list.map((r) => cols.map((c) => esc(r[c[1]])).join(','))
  )
  const blob = new Blob(['\ufeff' + lines.join('\n')], { type: 'text/csv;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = 'leads.csv'
  a.click()
  URL.revokeObjectURL(url)
}

export default function Leads() {
  const navigate = useNavigate()
  const confirm = useConfirm()
  const [leads, setLeads] = useState([])
  const [customers, setCustomers] = useState([])
  const [services, setServices] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [form, setForm] = useState(null)
  const [saving, setSaving] = useState(false)
  const [tab, setTab] = useState('all')
  const [sourceFilter, setSourceFilter] = useState('')
  const [search, setSearch] = useState('')
  const [selectedId, setSelectedId] = useState(null)

  async function load() {
    setLoading(true)
    const [l, c, s] = await Promise.all([
      supabase.from('leads').select('*').order('created_at', { ascending: false }),
      supabase.from('customers').select('id, name').order('name'),
      supabase.from('services').select('name').order('name'),
    ])
    if (l.error) {
      setError(l.error.message)
    } else {
      setError('')
      setLeads(l.data || [])
    }
    setCustomers(c.data || [])
    setServices(s.data || [])
    setLoading(false)
  }

  useEffect(() => {
    load()
  }, [])

  function setField(key, value) {
    setForm((f) => ({ ...f, [key]: value }))
  }

  function startAdd() {
    setForm({ ...emptyForm })
    setError('')
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  function startEdit(row) {
    const f = { id: row.id }
    Object.keys(emptyForm).forEach((k) => {
      f[k] = row[k] ?? ''
    })
    setForm(f)
    setError('')
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  async function save(e) {
    e.preventDefault()
    if (!form.name.trim()) {
      setError('Name is required.')
      return
    }
    setSaving(true)
    setError('')

    const payload = {}
    Object.keys(emptyForm).forEach((k) => {
      const v = form[k]
      payload[k] = typeof v === 'string' && v.trim() === '' ? null : v
    })
    payload.name = form.name.trim()
    payload.stage = form.stage
    payload.value = form.value === '' ? 0 : Number(form.value)
    if (Number.isNaN(payload.value)) payload.value = 0

    let result
    if (form.id) {
      result = await supabase
        .from('leads')
        .update({ ...payload, updated_at: new Date().toISOString() })
        .eq('id', form.id)
    } else {
      result = await supabase.from('leads').insert(payload)
    }

    setSaving(false)
    if (result.error) {
      setError(result.error.message)
      return
    }
    setForm(null)
    load()
  }

  async function moveStage(lead, stage) {
    const { error } = await supabase
      .from('leads')
      .update({ stage, updated_at: new Date().toISOString() })
      .eq('id', lead.id)
    if (error) {
      setError(error.message)
      return
    }
    load()
  }

  async function remove(lead) {
    if (!(await confirm('Delete lead "' + lead.name + '"?'))) return
    const { error } = await supabase.from('leads').delete().eq('id', lead.id)
    if (error) {
      setError(error.message)
      return
    }
    if (selectedId === lead.id) setSelectedId(null)
    load()
  }

  const today = new Date().toISOString().slice(0, 10)
  const customerName = (id) => {
    const c = customers.find((x) => x.id === id)
    return c ? c.name : ''
  }

  const count = (stage) => leads.filter((l) => l.stage === stage).length
  const inProgress = leads.filter((l) => IN_PROGRESS.includes(l.stage)).length
  const won = count('Won')
  const lost = count('Lost')
  const conversion = leads.length ? ((won / leads.length) * 100).toFixed(1) : '0.0'

  const q = search.trim().toLowerCase()
  const shown = leads.filter((l) => {
    if (tab !== 'all' && l.stage !== tab) return false
    if (sourceFilter && l.source !== sourceFilter) return false
    if (!q) return true
    return [l.name, l.company, l.phone, l.email, l.service_interest]
      .filter(Boolean)
      .some((v) => String(v).toLowerCase().includes(q))
  })

  const selected = leads.find((l) => l.id === selectedId) || shown[0] || null

  const sourceCounts = useMemo(() => {
    const m = {}
    leads.forEach((l) => {
      const s = l.source || 'Other'
      m[s] = (m[s] || 0) + 1
    })
    return Object.entries(m).sort((a, b) => b[1] - a[1])
  }, [leads])

  const upcoming = leads
    .filter((l) => l.next_follow_up && l.stage !== 'Won' && l.stage !== 'Lost')
    .sort((a, b) => a.next_follow_up.localeCompare(b.next_follow_up))
    .slice(0, 6)

  const maxStage = Math.max(1, ...STAGES.map((s) => count(s)))
  const maxSource = Math.max(1, ...sourceCounts.map((s) => s[1]))

  return (
    <div>
      <style>{css}</style>

      <PageHeader
        icon={Target}
        title="Leads Management"
        subtitle="Capture, track and convert business opportunities"
      >
        <button className="small icon-btn" onClick={startAdd}>
          <Plus size={15} /> New Lead
        </button>
        <button className="small blue icon-btn" onClick={() => exportCsv(shown)}>
          <Download size={15} /> Export
        </button>
      </PageHeader>

      {error && <p className="error">{error}</p>}

      {form && (
        <form className="form-card" onSubmit={save}>
          <h2>{form.id ? 'Edit lead' : 'New lead'}</h2>
          <div className="form-grid">
            <div>
              <label>Name *</label>
              <input value={form.name} onChange={(e) => setField('name', e.target.value)} />
            </div>
            <div>
              <label>Company</label>
              <input value={form.company} onChange={(e) => setField('company', e.target.value)} />
            </div>
            <div>
              <label>Phone</label>
              <input value={form.phone} onChange={(e) => setField('phone', e.target.value)} />
            </div>
            <div>
              <label>Email</label>
              <input value={form.email} onChange={(e) => setField('email', e.target.value)} />
            </div>
            <div>
              <label>Stage</label>
              <Select value={form.stage} onChange={(v) => setField('stage', v)} options={STAGES} />
            </div>
            <div>
              <label>Source</label>
              <Select
                value={form.source}
                onChange={(v) => setField('source', v)}
                options={form.source && !SOURCES.includes(form.source) ? [...SOURCES, form.source] : SOURCES}
              />
            </div>
            <div>
              <label>Service interested in</label>
              <Select
                value={form.service_interest}
                onChange={(v) => setField('service_interest', v)}
                placeholder="Select service"
                options={[
                  { value: '', label: 'None' },
                  ...services.map((s) => s.name),
                  ...(form.service_interest && !services.some((s) => s.name === form.service_interest)
                    ? [form.service_interest]
                    : []),
                ]}
              />
            </div>
            <div>
              <label>Expected value (RM)</label>
              <MoneyInput value={form.value} onChange={(e) => setField('value', e.target.value)} />
            </div>
            <div>
              <label>Next follow-up date</label>
              <DatePicker value={form.next_follow_up} onChange={(v) => setField('next_follow_up', v)} />
            </div>
            <div>
              <label>Link to customer (optional)</label>
              <Select
                value={form.customer_id}
                onChange={(v) => setField('customer_id', v)}
                options={[{ value: '', label: 'Not linked' }, ...customers.map((c) => ({ value: c.id, label: c.name }))]}
              />
            </div>
            <div className="full">
              <label>Message from the lead</label>
              <textarea rows="2" value={form.message} onChange={(e) => setField('message', e.target.value)} />
            </div>
            <div className="full">
              <label>Notes</label>
              <textarea rows="3" value={form.notes} onChange={(e) => setField('notes', e.target.value)} />
            </div>
          </div>
          <div className="form-actions">
            <button className="small" type="submit" disabled={saving}>
              {saving ? 'Saving...' : 'Save'}
            </button>
            <button className="small ghost" type="button" onClick={() => setForm(null)}>
              Cancel
            </button>
          </div>
        </form>
      )}

      <Stats>
        <StatCard color="blue" icon={Users} label="Total Leads" value={leads.length} />
        <StatCard color="purple" icon={Target} label="New Leads" value={count('New')} />
        <StatCard color="orange" icon={Hourglass} label="In Progress" value={inProgress} />
        <StatCard color="green" icon={CheckCircle2} label="Won / Converted" value={won} />
        <StatCard color="red" icon={XCircle} label="Lost" value={lost} />
        <StatCard color="blue" icon={RefreshCw} label="Conversion Rate" value={conversion + '%'} />
      </Stats>

      <div className="split">
        <div>
          <Tabs
            value={tab}
            onChange={setTab}
            tabs={[
              { key: 'all', label: 'All Leads', count: leads.length },
              ...STAGES.map((s) => ({ key: s, label: s, count: count(s) })),
            ]}
          />

          <div className="filter-row">
            <Select
              value={sourceFilter}
              onChange={setSourceFilter}
              options={[{ value: '', label: 'All Lead Sources' }, ...SOURCES]}
            />
            <div className="search-row" style={{ margin: 0 }}>
              <Search size={15} />
              <input
                placeholder="Search lead (name, company, phone, email)"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
          </div>

          <div className="table-wrap">
            {loading ? (
              <div className="empty-note">Loading...</div>
            ) : shown.length === 0 ? (
              <div className="empty-note">
                {leads.length === 0 ? 'No leads yet. Click "+ New Lead".' : 'No leads match your filters.'}
              </div>
            ) : (
              <table className="data">
                <thead>
                  <tr>
                    <th>#</th>
                    <th>Lead Name / Company</th>
                    <th>Phone</th>
                    <th>Service Interest</th>
                    <th>Stage</th>
                    <th>Source</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {shown.map((l, i) => (
                    <tr
                      key={l.id}
                      className={selected && selected.id === l.id ? 'sel' : ''}
                      onClick={() => setSelectedId(l.id)}
                    >
                      <td>{i + 1}</td>
                      <td>
                        <strong>{l.company || l.name}</strong>
                        {l.company && <div className="sub-line">{l.name}</div>}
                      </td>
                      <td>{l.phone || '-'}</td>
                      <td>{l.service_interest || '-'}</td>
                      <td>
                        <span className={'pill ' + (STAGE_COLOR[l.stage] || 'grey')}>{l.stage}</span>
                      </td>
                      <td>{l.source || '-'}</td>
                      <td onClick={(e) => e.stopPropagation()}>
                        <div className="row-actions">
                          <button className="icon" title="View" onClick={() => setSelectedId(l.id)}>
                            <Eye size={14} />
                          </button>
                          <button className="icon" title="Edit" onClick={() => startEdit(l)}>
                            <Pencil size={14} />
                          </button>
                          <button className="icon del" title="Delete" onClick={() => remove(l)}>
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>

        <Panel title="Lead Details" icon={Target}>
          {!selected ? (
            <div className="empty-note">Select a lead from the list.</div>
          ) : (
            <div>
              <div className="detail-title">
                <h4>{selected.company || selected.name}</h4>
                <span className={'pill ' + (STAGE_COLOR[selected.stage] || 'grey')}>{selected.stage}</span>
              </div>
              <dl className="kv">
                <dt>Contact Person</dt>
                <dd>{selected.name}</dd>
                <dt>Phone</dt>
                <dd>{selected.phone || '-'}</dd>
                <dt>Email</dt>
                <dd>{selected.email || '-'}</dd>
                <dt>Service</dt>
                <dd>{selected.service_interest || '-'}</dd>
                <dt>Source</dt>
                <dd>{selected.source || '-'}</dd>
                <dt>Expected Value</dt>
                <dd>{money(selected.value)}</dd>
                <dt>Next Follow-up</dt>
                <dd>
                  {showDate(selected.next_follow_up)}
                  {selected.next_follow_up &&
                    selected.next_follow_up < today &&
                    selected.stage !== 'Won' &&
                    selected.stage !== 'Lost' && <span style={{ color: '#ff8a8f' }}> (overdue)</span>}
                </dd>
                <dt>Created On</dt>
                <dd>{showDate(selected.created_at)}</dd>
                {selected.customer_id && customerName(selected.customer_id) && (
                  <>
                    <dt>Customer</dt>
                    <dd>{customerName(selected.customer_id)}</dd>
                  </>
                )}
                {selected.message && (
                  <>
                    <dt>Message</dt>
                    <dd>{selected.message}</dd>
                  </>
                )}
                {selected.notes && (
                  <>
                    <dt>Notes</dt>
                    <dd>{selected.notes}</dd>
                  </>
                )}
              </dl>

              <label>Move to stage</label>
              <Select value={selected.stage} onChange={(v) => moveStage(selected, v)} options={STAGES} />

              <div className="detail-actions">
                <button
                  className="small green icon-btn"
                  disabled={!waNumber(selected.phone)}
                  onClick={() => window.open('https://wa.me/' + waNumber(selected.phone), '_blank')}
                >
                  <MessageCircle size={15} /> WhatsApp
                </button>
                <button
                  className="small blue icon-btn"
                  disabled={!selected.email}
                  onClick={() => (window.location.href = 'mailto:' + selected.email)}
                >
                  <Mail size={15} /> Send Email
                </button>
                <button className="small purple icon-btn" onClick={() => navigate('/documents/new/quote')}>
                  <FileText size={15} /> Create Quotation
                </button>
              </div>
            </div>
          )}
        </Panel>
      </div>

      <div className="cols-2">
        <Panel title={'Lead Pipeline (' + leads.length + ')'} icon={BarChart3}>
          <div className="bars">
            {STAGES.map((s) => (
              <div className="bar-row" key={s}>
                <span>{s}</span>
                <div className="bar-track">
                  <div className="bar-fill" style={{ width: (count(s) / maxStage) * 100 + '%' }} />
                </div>
                <b>{count(s)}</b>
              </div>
            ))}
          </div>
        </Panel>

        <Panel title="Leads by Source" icon={PieChart}>
          {sourceCounts.length === 0 ? (
            <div className="empty-note">No leads yet.</div>
          ) : (
            <div className="bars">
              {sourceCounts.map(([s, n]) => (
                <div className="bar-row" key={s}>
                  <span>{s}</span>
                  <div className="bar-track">
                    <div className="bar-fill" style={{ width: (n / maxSource) * 100 + '%' }} />
                  </div>
                  <b>{n}</b>
                </div>
              ))}
            </div>
          )}
        </Panel>

        <Panel title="Upcoming Follow-ups" icon={CalendarClock}>
          {upcoming.length === 0 ? (
            <div className="empty-note">No follow-ups planned.</div>
          ) : (
            upcoming.map((l) => (
              <div className="fu-row" key={l.id} style={{ cursor: 'pointer' }} onClick={() => setSelectedId(l.id)}>
                <div>
                  {l.company || l.name}
                  <small>{l.service_interest || l.stage}</small>
                </div>
                <div className={'fu-date' + (l.next_follow_up < today ? ' overdue' : '')}>
                  {showDate(l.next_follow_up)}
                </div>
              </div>
            ))
          )}
        </Panel>
      </div>
    </div>
  )
}