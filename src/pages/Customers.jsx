import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Users, Building2, User, UserPlus, FileText, Wallet, Download,
  Eye, Pencil, Trash2, MessageCircle, Mail, Search, Plus,
} from 'lucide-react'
import { supabase } from '../supabaseClient'
import Select from '../components/Select'
import { useConfirm } from '../components/ConfirmDialog'
import { PageHeader, Stats, StatCard, Tabs, Panel } from '../components/ui'
import { docLabel } from '../docSettings'

const emptyForm = {
  name: '',
  type: 'company',
  phone: '',
  email: '',
  address: '',
  city: '',
  state: '',
  postcode: '',
  country: 'Malaysia',
  tax_id: '',
  notes: '',
}

// Turns what you type into an international number for WhatsApp, e.g. 011-2345 6789 -> +601123456789
function normalizePhone(raw) {
  const text = String(raw || '').trim()
  let d = text.replace(/\D/g, '')
  if (!d) return ''
  if (!text.startsWith('+')) {
    if (d.startsWith('00')) d = d.slice(2)
    else if (d.startsWith('0')) d = '60' + d.slice(1)
    else if (!d.startsWith('60') && d.length <= 10) d = '60' + d
  }
  if (d.length < 9 || d.length > 15) return ''
  return '+' + d
}

function money(n) {
  return 'RM ' + Number(n || 0).toLocaleString('en-MY', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

function showDate(iso) {
  if (!iso) return '-'
  const [y, m, d] = String(iso).slice(0, 10).split('-')
  return d + '/' + m + '/' + y
}

const STATUS_COLOR = {
  Draft: 'grey', Sent: 'blue', Accepted: 'green', Paid: 'green', Overdue: 'red', Cancelled: 'grey',
}

function exportCsv(list) {
  const cols = [
    ['Name', 'name'], ['Type', 'type'], ['Phone', 'phone'], ['Email', 'email'], ['Address', 'address'],
    ['City', 'city'], ['State', 'state'], ['Postcode', 'postcode'], ['Country', 'country'], ['Tax ID', 'tax_id'],
  ]
  const esc = (v) => '"' + String(v ?? '').replace(/"/g, '""') + '"'
  const lines = [cols.map((c) => esc(c[0])).join(',')].concat(
    list.map((r) => cols.map((c) => esc(r[c[1]])).join(','))
  )
  const blob = new Blob(['\ufeff' + lines.join('\n')], { type: 'text/csv;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = 'customers.csv'
  a.click()
  URL.revokeObjectURL(url)
}

export default function Customers() {
  const navigate = useNavigate()
  const confirm = useConfirm()
  const [rows, setRows] = useState([])
  const [contacts, setContacts] = useState([])
  const [docs, setDocs] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [search, setSearch] = useState('')
  const [tab, setTab] = useState('all')
  const [selectedId, setSelectedId] = useState(null)
  const [form, setForm] = useState(null)
  const [saving, setSaving] = useState(false)

  async function load() {
    setLoading(true)
    const [c, ct, d] = await Promise.all([
      supabase.from('customers').select('*').order('name'),
      supabase.from('contacts').select('*'),
      supabase
        .from('documents')
        .select('id, customer_id, doc_type, doc_number, status, issue_date, total, amount_paid'),
    ])
    const err = c.error || ct.error || d.error
    if (err) {
      setError(err.message)
    } else {
      setError('')
      setRows(c.data || [])
      setContacts(ct.data || [])
      setDocs(d.data || [])
    }
    setLoading(false)
  }

  useEffect(() => {
    load()
  }, [])

  const info = useMemo(() => {
    const map = {}
    rows.forEach((r) => {
      map[r.id] = { contacts: [], docs: [], outstanding: 0 }
    })
    contacts.forEach((c) => {
      if (map[c.customer_id]) map[c.customer_id].contacts.push(c)
    })
    docs.forEach((d) => {
      const m = map[d.customer_id]
      if (!m) return
      m.docs.push(d)
      if (d.doc_type === 'invoice' && d.status !== 'Cancelled') {
        m.outstanding += Math.max(Number(d.total || 0) - Number(d.amount_paid || 0), 0)
      }
    })
    Object.values(map).forEach((m) => {
      m.contacts.sort((a, b) => Number(b.is_primary) - Number(a.is_primary))
      m.docs.sort((a, b) => String(b.issue_date).localeCompare(String(a.issue_date)))
    })
    return map
  }, [rows, contacts, docs])

  function setField(key, value) {
    setForm((f) => ({ ...f, [key]: value }))
  }

  function startAdd() {
    setForm({ ...emptyForm })
    setError('')
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
    const phone = normalizePhone(form.phone)
    if (!phone) {
      setError('A valid phone number is required (it is used for WhatsApp).')
      return
    }
    setSaving(true)
    setError('')

    const payload = {}
    Object.keys(emptyForm).forEach((k) => {
      const v = form[k]
      payload[k] = typeof v === 'string' && v.trim() === '' ? null : v
    })
    payload.name = form.name.trim().toUpperCase()
    payload.type = form.type
    payload.phone = phone

    let result
    if (form.id) {
      result = await supabase
        .from('customers')
        .update({ ...payload, updated_at: new Date().toISOString() })
        .eq('id', form.id)
    } else {
      result = await supabase.from('customers').insert(payload)
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
    if (!(await confirm('Delete customer "' + row.name + '"?'))) return
    const { error } = await supabase.from('customers').delete().eq('id', row.id)
    if (error) {
      if (error.code === '23503') {
        const names = { item_receipts: 'Item Receipts (laptop/repair jobs)', payments: 'Payments', maintenance_contracts: 'Maintenance Contracts' }
        const m = (error.message.match(/on table "([a-z_]+)"\s*$/) || [])[1]
        setError(
          'Cannot delete "' + row.name + '" yet: this customer still has ' + (names[m] || 'other records') +
          ' linked. Delete those first, then delete the customer.'
        )
      } else {
        setError(error.message)
      }
      return
    }
    if (selectedId === row.id) setSelectedId(null)
    load()
  }

  const q = search.trim().toLowerCase()
  const shown = rows.filter((r) => {
    if (tab !== 'all' && r.type !== tab) return false
    if (!q) return true
    const contactNames = (info[r.id]?.contacts || []).map((c) => c.name)
    return [r.name, r.email, r.phone, r.city, ...contactNames]
      .filter(Boolean)
      .some((v) => String(v).toLowerCase().includes(q))
  })

  const selected = rows.find((r) => r.id === selectedId) || shown[0] || null
  const sel = selected ? info[selected.id] : null

  const now = new Date()
  const companyCount = rows.filter((r) => r.type === 'company').length
  const individualCount = rows.filter((r) => r.type === 'individual').length
  const newThisMonth = rows.filter((r) => {
    const d = new Date(r.created_at)
    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear()
  }).length
  const withDocs = rows.filter((r) => (info[r.id]?.docs.length || 0) > 0).length
  const totalOutstanding = Object.values(info).reduce((s, m) => s + m.outstanding, 0)

  function openWhatsApp(phone) {
    const digits = String(phone || '').replace(/\D/g, '')
    if (digits) window.open('https://wa.me/' + digits, '_blank')
  }

  return (
    <div>
      <PageHeader
        icon={Users}
        title="Customers Management"
        subtitle="Manage customer records, contacts, documents and history"
      >
        <button className="small icon-btn" onClick={startAdd}>
          <Plus size={15} /> New Customer
        </button>
        <button className="small blue icon-btn" onClick={() => exportCsv(shown)}>
          <Download size={15} /> Export
        </button>
      </PageHeader>

      {error && <p className="error">{error}</p>}

      {form && (
        <form className="form-card" onSubmit={save}>
          <h2>{form.id ? 'Edit customer' : 'New customer'}</h2>
          <div className="form-grid">
            <div>
              <label>Name *</label>
              <input value={form.name} style={{ textTransform: 'uppercase' }} onChange={(e) => setField('name', e.target.value)} />
            </div>
            <div>
              <label>Type</label>
              <Select
                value={form.type}
                onChange={(v) => setField('type', v)}
                options={[{ value: 'company', label: 'Company' }, { value: 'individual', label: 'Individual' }]}
              />
            </div>
            <div>
              <label>Phone (WhatsApp number) *</label>
              <input
                placeholder="e.g. 011-6397 5503"
                value={form.phone}
                onChange={(e) => setField('phone', e.target.value)}
              />
            </div>
            <div>
              <label>Email</label>
              <input value={form.email} onChange={(e) => setField('email', e.target.value)} />
            </div>
            <div className="full">
              <label>Address</label>
              <input value={form.address} onChange={(e) => setField('address', e.target.value)} />
            </div>
            <div>
              <label>City</label>
              <input value={form.city} onChange={(e) => setField('city', e.target.value)} />
            </div>
            <div>
              <label>State</label>
              <input value={form.state} onChange={(e) => setField('state', e.target.value)} />
            </div>
            <div>
              <label>Postcode</label>
              <input value={form.postcode} onChange={(e) => setField('postcode', e.target.value)} />
            </div>
            <div>
              <label>Country</label>
              <input value={form.country} onChange={(e) => setField('country', e.target.value)} />
            </div>
            <div>
              <label>Tax ID (SST / TIN / SSM no.)</label>
              <input value={form.tax_id} onChange={(e) => setField('tax_id', e.target.value)} />
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
        <StatCard color="blue" icon={Users} label="Total Customers" value={rows.length} />
        <StatCard color="purple" icon={Building2} label="Companies" value={companyCount} />
        <StatCard color="orange" icon={User} label="Individuals" value={individualCount} />
        <StatCard color="green" icon={UserPlus} label="New This Month" value={newThisMonth} />
        <StatCard color="blue" icon={FileText} label="With Documents" value={withDocs} />
        <StatCard color="red" icon={Wallet} label="Outstanding" value={money(totalOutstanding)} />
      </Stats>

      <div className="split">
        <div>
          <Tabs
            value={tab}
            onChange={setTab}
            tabs={[
              { key: 'all', label: 'All Customers', count: rows.length },
              { key: 'company', label: 'Company', count: companyCount },
              { key: 'individual', label: 'Individual', count: individualCount },
            ]}
          />

          <div className="search-row">
            <Search size={15} />
            <input
              placeholder="Search customer (name, contact, phone, email, city)"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          <div className="table-wrap">
            {loading ? (
              <div className="empty-note">Loading...</div>
            ) : shown.length === 0 ? (
              <div className="empty-note">
                {rows.length === 0 ? 'No customers yet. Click "+ New Customer".' : 'No customers match your search.'}
              </div>
            ) : (
              <table className="data">
                <thead>
                  <tr>
                    <th>#</th>
                    <th>Customer Name</th>
                    <th>Type</th>
                    <th>Contact Person</th>
                    <th>Phone</th>
                    <th>Email</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {shown.map((r, i) => {
                    const cp = info[r.id]?.contacts[0]
                    return (
                      <tr
                        key={r.id}
                        className={selected && selected.id === r.id ? 'sel' : ''}
                        onClick={() => setSelectedId(r.id)}
                      >
                        <td>{i + 1}</td>
                        <td><strong>{r.name}</strong></td>
                        <td>
                          <span className={'pill ' + (r.type === 'company' ? 'blue' : 'orange')}>
                            {r.type === 'company' ? 'Company' : 'Individual'}
                          </span>
                        </td>
                        <td>{cp ? cp.name : '-'}</td>
                        <td>{r.phone || '-'}</td>
                        <td>{r.email || '-'}</td>
                        <td onClick={(e) => e.stopPropagation()}>
                          <div className="row-actions">
                            <button className="icon" title="Open profile" onClick={() => navigate('/customers/' + r.id)}>
                              <Eye size={14} />
                            </button>
                            <button className="icon" title="Edit" onClick={() => startEdit(r)}>
                              <Pencil size={14} />
                            </button>
                            <button className="icon del" title="Delete" onClick={() => remove(r)}>
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            )}
          </div>
        </div>

        <Panel title="Customer Details" icon={Users}>
          {!selected ? (
            <div className="empty-note">Select a customer from the list.</div>
          ) : (
            <div>
              <div className="detail-title">
                <h4>{selected.name}</h4>
                <span className={'pill ' + (selected.type === 'company' ? 'blue' : 'orange')}>
                  {selected.type === 'company' ? 'Company' : 'Individual'}
                </span>
              </div>
              <dl className="kv">
                <dt>Contact Person</dt>
                <dd>{sel.contacts[0] ? sel.contacts[0].name : '-'}</dd>
                <dt>Phone</dt>
                <dd>{selected.phone || '-'}</dd>
                <dt>Email</dt>
                <dd>{selected.email || '-'}</dd>
                <dt>Address</dt>
                <dd>
                  {[selected.address, selected.postcode, selected.city, selected.state, selected.country]
                    .filter(Boolean)
                    .join(', ') || '-'}
                </dd>
                <dt>Tax ID</dt>
                <dd>{selected.tax_id || '-'}</dd>
                <dt>Customer Since</dt>
                <dd>{showDate(selected.created_at)}</dd>
                <dt>Documents</dt>
                <dd>{sel.docs.length}</dd>
                <dt>Outstanding</dt>
                <dd>{money(sel.outstanding)}</dd>
              </dl>
              <div className="detail-actions">
                <button className="small green icon-btn" onClick={() => openWhatsApp(selected.phone)}>
                  <MessageCircle size={15} /> WhatsApp
                </button>
                <button
                  className="small blue icon-btn"
                  disabled={!selected.email}
                  onClick={() => (window.location.href = 'mailto:' + selected.email)}
                >
                  <Mail size={15} /> Send Email
                </button>
                <button className="small purple icon-btn" onClick={() => navigate('/customers/' + selected.id)}>
                  <Eye size={15} /> Open Profile
                </button>
              </div>
            </div>
          )}
        </Panel>
      </div>

      {selected && (
        <div className="cols-2">
          <Panel title={'Documents (' + sel.docs.length + ')'} icon={FileText}>
            {sel.docs.length === 0 ? (
              <div className="empty-note">No documents for this customer yet.</div>
            ) : (
              <div className="table-wrap" style={{ boxShadow: 'none', border: 'none' }}>
                <table className="data">
                  <thead>
                    <tr>
                      <th>Document No.</th>
                      <th>Type</th>
                      <th>Date</th>
                      <th className="num">Amount</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sel.docs.slice(0, 6).map((d) => (
                      <tr key={d.id} onClick={() => navigate('/documents/' + d.id)}>
                        <td>{d.doc_number}</td>
                        <td>{docLabel(d.doc_type)}</td>
                        <td>{showDate(d.issue_date)}</td>
                        <td className="num">{money(d.total)}</td>
                        <td>
                          <span className={'pill ' + (STATUS_COLOR[d.status] || 'grey')}>{d.status}</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Panel>

          <Panel title={'Contact Persons (' + sel.contacts.length + ')'} icon={User}>
            {sel.contacts.length === 0 ? (
              <div className="empty-note">No contact persons yet. Add them in Open Profile.</div>
            ) : (
              <div className="table-wrap" style={{ boxShadow: 'none', border: 'none' }}>
                <table className="data">
                  <thead>
                    <tr>
                      <th>Name</th>
                      <th>Position</th>
                      <th>Phone</th>
                      <th>Email</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sel.contacts.map((c) => (
                      <tr key={c.id} style={{ cursor: 'default' }}>
                        <td>
                          {c.name} {c.is_primary && <span className="pill green">Primary</span>}
                        </td>
                        <td>{c.position || '-'}</td>
                        <td>{c.phone || '-'}</td>
                        <td>{c.email || '-'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Panel>
        </div>
      )}
    </div>
  )
}