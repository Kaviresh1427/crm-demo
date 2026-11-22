import { useEffect, useState } from 'react'
import MoneyInput from '../components/MoneyInput'
import { ShieldCheck, Plus, Pencil, Trash2, Search, Download, CalendarClock, FileText, TrendingUp } from 'lucide-react'
import { supabase } from '../supabaseClient'
import Select from '../components/Select'
import { useConfirm } from '../components/ConfirmDialog'
import { PageHeader, Stats, StatCard, Panel } from '../components/ui'

const CYCLES = ['Monthly', 'Quarterly', 'Yearly']
const STATUSES = ['Active', 'Cancelled']

function today() {
  return new Date().toISOString().slice(0, 10)
}

function addDays(dateStr, days) {
  const d = new Date(dateStr + 'T00:00:00')
  d.setDate(d.getDate() + days)
  return d.toISOString().slice(0, 10)
}

function money(n) {
  return 'RM ' + Number(n || 0).toLocaleString('en-MY', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

function showDate(d) {
  if (!d) return '-'
  const [y, m, day] = String(d).slice(0, 10).split('-')
  return day + '/' + m + '/' + y
}

// Shown status: Active contracts become Expiring Soon or Expired by their end date.
function shownStatus(row) {
  if (row.status === 'Cancelled') return 'Cancelled'
  if (!row.end_date) return 'Active'
  const end = String(row.end_date).slice(0, 10)
  if (end < today()) return 'Expired'
  if (end <= addDays(today(), 30)) return 'Expiring Soon'
  return 'Active'
}

const STATUS_COLOR = {
  Active: '#22c55e',
  'Expiring Soon': '#f59e0b',
  Expired: '#ef4444',
  Cancelled: '#8a8a93',
}

function perYear(row) {
  const a = Number(row.amount || 0)
  if (row.billing_cycle === 'Monthly') return a * 12
  if (row.billing_cycle === 'Quarterly') return a * 4
  return a
}

const emptyForm = {
  customer_id: '',
  title: '',
  start_date: today(),
  end_date: '',
  billing_cycle: 'Yearly',
  amount: '',
  status: 'Active',
  scope: '',
  notes: '',
}

function exportCsv(list) {
  const cols = [
    ['Contract No', 'contract_no'], ['Customer', 'customer_name'], ['Title', 'title'],
    ['Start', 'start_date'], ['End', 'end_date'], ['Billing', 'billing_cycle'],
    ['Amount', 'amount'], ['Status', 'shown_status'],
  ]
  const esc = (v) => '"' + String(v ?? '').replace(/"/g, '""') + '"'
  const lines = [cols.map((c) => esc(c[0])).join(',')].concat(
    list.map((r) => cols.map((c) => esc(r[c[1]])).join(','))
  )
  const blob = new Blob(['\ufeff' + lines.join('\n')], { type: 'text/csv;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = 'maintenance-contracts.csv'
  a.click()
  URL.revokeObjectURL(url)
}

export default function Contracts() {
  const confirm = useConfirm()
  const [rows, setRows] = useState([])
  const [customers, setCustomers] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [form, setForm] = useState(null)
  const [saving, setSaving] = useState(false)

  async function load() {
    setLoading(true)
    const [r, c] = await Promise.all([
      supabase.from('maintenance_contracts').select('*').order('end_date', { ascending: true, nullsFirst: false }),
      supabase.from('customers').select('id, name').order('name'),
    ])
    const err = r.error || c.error
    if (err) {
      setError(err.message)
    } else {
      setError('')
      setRows(r.data || [])
      setCustomers(c.data || [])
    }
    setLoading(false)
  }

  useEffect(() => {
    load()
  }, [])

  const customerName = (id) => {
    const c = customers.find((x) => x.id === id)
    return c ? c.name : ''
  }

  function setField(key, value) {
    setForm((f) => ({ ...f, [key]: value }))
  }

  function startAdd() {
    setForm({ ...emptyForm, start_date: today() })
    setError('')
  }

  function startEdit(row) {
    const f = { id: row.id, contract_no: row.contract_no }
    Object.keys(emptyForm).forEach((k) => {
      f[k] = row[k] ?? ''
    })
    f.start_date = String(row.start_date).slice(0, 10)
    f.end_date = row.end_date ? String(row.end_date).slice(0, 10) : ''
    if (f.status === 'Expired') f.status = 'Active'
    setForm(f)
    setError('')
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  async function save(e) {
    e.preventDefault()
    if (!form.customer_id) {
      setError('Please choose a customer.')
      return
    }
    if (!form.title.trim()) {
      setError('Title is required.')
      return
    }
    const amount = Number(form.amount)
    if (form.amount === '' || Number.isNaN(amount) || amount < 0) {
      setError('Enter a valid amount.')
      return
    }
    if (form.end_date && form.end_date < form.start_date) {
      setError('End date cannot be before the start date.')
      return
    }
    setSaving(true)
    setError('')
    const payload = {
      customer_id: form.customer_id,
      title: form.title.trim(),
      start_date: form.start_date || today(),
      end_date: form.end_date || null,
      billing_cycle: form.billing_cycle,
      amount: Math.round(amount * 100) / 100,
      status: form.status,
      scope: form.scope.trim() || null,
      notes: form.notes.trim() || null,
    }
    let result
    if (form.id) {
      result = await supabase
        .from('maintenance_contracts')
        .update({ ...payload, updated_at: new Date().toISOString() })
        .eq('id', form.id)
    } else {
      const num = await supabase.rpc('next_doc_number', { p_type: 'contract' })
      if (num.error) {
        setSaving(false)
        setError(num.error.message)
        return
      }
      result = await supabase.from('maintenance_contracts').insert({ ...payload, contract_no: num.data })
    }
    setSaving(false)
    if (result.error) {
      setError(result.error.message)
      return
    }
    setForm(null)
    load()
  }

  async function remove(row) {
    if (!(await confirm('Delete contract ' + row.contract_no + '?'))) return
    const { error } = await supabase.from('maintenance_contracts').delete().eq('id', row.id)
    if (error) {
      setError(error.message)
      return
    }
    load()
  }

  const q = search.trim().toLowerCase()
  const withStatus = rows.map((r) => ({
    ...r,
    customer_name: customerName(r.customer_id),
    shown_status: shownStatus(r),
  }))
  const shown = withStatus.filter((r) => {
    if (statusFilter && r.shown_status !== statusFilter) return false
    if (!q) return true
    return [r.contract_no, r.customer_name, r.title]
      .filter(Boolean)
      .some((v) => String(v).toLowerCase().includes(q))
  })

  const live = withStatus.filter((r) => r.shown_status === 'Active' || r.shown_status === 'Expiring Soon')
  const expiring = withStatus.filter((r) => r.shown_status === 'Expiring Soon')
  const yearly = live.reduce((s, r) => s + perYear(r), 0)
  const renewals = withStatus
    .filter((r) => r.shown_status === 'Expiring Soon' || r.shown_status === 'Expired')
    .filter((r) => r.status !== 'Cancelled')

  return (
    <div>
      <PageHeader icon={ShieldCheck} title="Maintenance Contracts" subtitle="Track yearly and monthly support contracts">
        <button className="small icon-btn" onClick={startAdd}>
          <Plus size={15} /> New Contract
        </button>
        <button className="small blue icon-btn" onClick={() => exportCsv(shown)}>
          <Download size={15} /> Export
        </button>
      </PageHeader>

      {error && <p className="error">{error}</p>}

      {form && (
        <form className="form-card" onSubmit={save}>
          <h2>{form.id ? 'Edit contract ' + form.contract_no : 'New contract'}</h2>
          <div className="form-grid">
            <div>
              <label>Customer *</label>
              <Select
                value={form.customer_id}
                onChange={(v) => setField('customer_id', v)}
                options={[{ value: '', label: 'Choose a customer' }, ...customers.map((c) => ({ value: c.id, label: c.name }))]}
              />
            </div>
            <div>
              <label>Title *</label>
              <input
                placeholder="e.g. Yearly IT Maintenance"
                value={form.title}
                onChange={(e) => setField('title', e.target.value)}
              />
            </div>
            <div>
              <label>Start date</label>
              <input type="date" value={form.start_date} onChange={(e) => setField('start_date', e.target.value)} />
            </div>
            <div>
              <label>End date</label>
              <input type="date" value={form.end_date} onChange={(e) => setField('end_date', e.target.value)} />
            </div>
            <div>
              <label>Billing</label>
              <Select value={form.billing_cycle} onChange={(v) => setField('billing_cycle', v)} options={CYCLES} />
            </div>
            <div>
              <label>Amount per billing (RM) *</label>
              <MoneyInput value={form.amount} onChange={(e) => setField('amount', e.target.value)} />
            </div>
            <div>
              <label>Status</label>
              <Select value={form.status} onChange={(v) => setField('status', v)} options={STATUSES} />
            </div>
            <div className="full">
              <label>What is covered</label>
              <textarea rows="3" value={form.scope} onChange={(e) => setField('scope', e.target.value)} />
            </div>
            <div className="full">
              <label>Notes</label>
              <textarea rows="2" value={form.notes} onChange={(e) => setField('notes', e.target.value)} />
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
        <StatCard color="green" icon={ShieldCheck} label="Active Contracts" value={live.length} />
        <StatCard color="orange" icon={CalendarClock} label="Expiring in 30 Days" value={expiring.length} />
        <StatCard color="blue" icon={TrendingUp} label="Yearly Value" value={money(yearly)} />
        <StatCard color="purple" icon={FileText} label="All Contracts" value={rows.length} />
      </Stats>

      <div className="split">
        <div>
          <div className="filter-row">
            <Select
              value={statusFilter}
              onChange={setStatusFilter}
              options={[
                { value: '', label: 'All Status' },
                'Active',
                'Expiring Soon',
                'Expired',
                'Cancelled',
              ]}
            />
            <div className="search-row" style={{ margin: 0 }}>
              <Search size={15} />
              <input
                placeholder="Search contract (number, customer, title)"
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
                {rows.length === 0 ? 'No contracts yet. Click "+ New Contract".' : 'No contracts match.'}
              </div>
            ) : (
              <table className="data">
                <thead>
                  <tr>
                    <th>Contract</th>
                    <th>Customer</th>
                    <th>Ends</th>
                    <th className="num">Amount</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {shown.map((r) => (
                    <tr key={r.id} style={{ cursor: 'default' }}>
                      <td>
                        <strong>{r.contract_no}</strong>
                        <br />
                        <span style={{ fontSize: 12, opacity: 0.8 }}>{r.title}</span>
                      </td>
                      <td>{r.customer_name || '-'}</td>
                      <td>{showDate(r.end_date)}</td>
                      <td className="num">
                        {money(r.amount)}
                        <br />
                        <span style={{ fontSize: 11, opacity: 0.7 }}>{r.billing_cycle}</span>
                      </td>
                      <td>
                        <span style={{ color: STATUS_COLOR[r.shown_status], fontWeight: 600 }}>{r.shown_status}</span>
                      </td>
                      <td>
                        <div className="row-actions">
                          <button className="icon" title="Edit" onClick={() => startEdit(r)}>
                            <Pencil size={14} />
                          </button>
                          <button className="icon del" title="Delete" onClick={() => remove(r)}>
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

        <Panel title="Renewals Due" icon={CalendarClock}>
          {renewals.length === 0 ? (
            <div className="empty-note">No renewals due.</div>
          ) : (
            <div style={{ display: 'grid', gap: 10 }}>
              {renewals.map((r) => (
                <div key={r.id} style={{ fontSize: 12.5, display: 'flex', justifyContent: 'space-between', gap: 8 }}>
                  <span>
                    <b>{r.customer_name || '-'}</b>
                    <br />
                    {r.contract_no}
                  </span>
                  <span style={{ textAlign: 'right', color: STATUS_COLOR[r.shown_status] }}>
                    <b>{showDate(r.end_date)}</b>
                    <br />
                    {r.shown_status}
                  </span>
                </div>
              ))}
            </div>
          )}
        </Panel>
      </div>
    </div>
  )
}