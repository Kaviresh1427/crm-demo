import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import {
  ArrowLeft, Building2, User, Phone, Mail, MapPin, FileText, Wallet, Users, Plus,
  Pencil, Trash2, MessageCircle, Eye,
} from 'lucide-react'
import { supabase } from '../supabaseClient'
import { useConfirm } from '../components/ConfirmDialog'
import { PageHeader, Stats, StatCard, Panel } from '../components/ui'
import { docLabel } from '../docSettings'

const emptyContact = {
  name: '',
  position: '',
  phone: '',
  email: '',
  is_primary: false,
}

const STATUS_COLOR = {
  Draft: 'grey', Sent: 'blue', Accepted: 'green', Paid: 'green', Overdue: 'red', Cancelled: 'grey',
}

const css = `
.back-link { display: inline-flex; align-items: center; gap: 6px; margin-bottom: 12px; color: var(--accent); text-decoration: none; font-size: 13px; }
.back-link:hover { text-decoration: underline; }
.info-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(210px, 1fr)); gap: 14px 20px; padding: 4px 2px 2px; }
.info-label { font-size: 11.5px; color: var(--muted); margin-bottom: 3px; display: flex; align-items: center; gap: 6px; }
.info-label svg { color: var(--accent); }
.info-value { font-size: 13.5px; word-break: break-word; }
.check-row { display: flex; align-items: center; gap: 10px; margin-top: 14px; }
.check-row input { width: auto; }
.check-row label { margin: 0; }
.contact-list { display: grid; grid-template-columns: repeat(auto-fit, minmax(260px, 1fr)); gap: 12px; }
.contact-card { background: rgba(255, 255, 255, 0.03); border: 1px solid var(--line); border-radius: 12px; padding: 14px; }
.contact-name { font-weight: 600; font-size: 14px; margin-bottom: 4px; }
.contact-line { font-size: 12.5px; color: var(--muted); margin-bottom: 2px; }
.contact-actions { display: flex; gap: 6px; margin-top: 10px; }
.empty-note { padding: 16px; color: var(--muted); font-size: 13px; }
.cd-gap { margin-top: 16px; }
`

function money(n) {
  return 'RM ' + Number(n || 0).toLocaleString('en-MY', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

function showDate(d) {
  if (!d) return '-'
  const [y, m, day] = String(d).slice(0, 10).split('-')
  return day + '/' + m + '/' + y
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

function Info({ icon: Icon, label, value }) {
  return (
    <div>
      <div className="info-label">
        {Icon && <Icon size={13} />}
        {label}
      </div>
      <div className="info-value">{value || '-'}</div>
    </div>
  )
}

export default function CustomerDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const confirm = useConfirm()
  const [customer, setCustomer] = useState(null)
  const [contacts, setContacts] = useState([])
  const [docs, setDocs] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [form, setForm] = useState(null)
  const [saving, setSaving] = useState(false)

  async function load() {
    const c = await supabase.from('customers').select('*').eq('id', id).single()
    if (c.error) {
      setError(c.error.message)
      setLoading(false)
      return
    }
    setCustomer(c.data)

    const p = await supabase
      .from('contacts')
      .select('*')
      .eq('customer_id', id)
      .order('is_primary', { ascending: false })
      .order('name')
    if (p.error) {
      setError(p.error.message)
    } else {
      setError('')
      setContacts(p.data || [])
    }

    const d = await supabase
      .from('documents')
      .select('*')
      .eq('customer_id', id)
      .order('created_at', { ascending: false })
    setDocs(d.data || [])

    setLoading(false)
  }

  useEffect(() => {
    load()
  }, [id])

  function setField(key, value) {
    setForm((f) => ({ ...f, [key]: value }))
  }

  function startAdd() {
    setForm({ ...emptyContact, is_primary: contacts.length === 0 })
    setError('')
  }

  function startEdit(row) {
    setForm({
      id: row.id,
      name: row.name || '',
      position: row.position || '',
      phone: row.phone || '',
      email: row.email || '',
      is_primary: !!row.is_primary,
    })
    setError('')
  }

  async function save(e) {
    e.preventDefault()
    if (!form.name.trim()) {
      setError('Name is required.')
      return
    }
    setSaving(true)
    setError('')

    const payload = {
      name: form.name.trim(),
      position: form.position.trim() || null,
      phone: form.phone.trim() || null,
      email: form.email.trim() || null,
      is_primary: form.is_primary,
    }

    let savedId = form.id
    if (form.id) {
      const r = await supabase.from('contacts').update(payload).eq('id', form.id)
      if (r.error) {
        setSaving(false)
        setError(r.error.message)
        return
      }
    } else {
      const r = await supabase
        .from('contacts')
        .insert({ ...payload, customer_id: id })
        .select()
        .single()
      if (r.error) {
        setSaving(false)
        setError(r.error.message)
        return
      }
      savedId = r.data.id
    }

    if (form.is_primary) {
      await supabase
        .from('contacts')
        .update({ is_primary: false })
        .eq('customer_id', id)
        .neq('id', savedId)
    }

    setSaving(false)
    setForm(null)
    load()
  }

  async function remove(row) {
    if (!(await confirm('Delete contact "' + row.name + '"?'))) return
    const { error } = await supabase.from('contacts').delete().eq('id', row.id)
    if (error) {
      setError(error.message)
      return
    }
    load()
  }

  if (loading) return <div>Loading...</div>

  if (!customer) {
    return (
      <div>
        <style>{css}</style>
        <Link className="back-link" to="/customers"><ArrowLeft size={14} /> Back to customers</Link>
        {error && <p className="error">{error}</p>}
      </div>
    )
  }

  const addressLine = [customer.address, customer.postcode, customer.city, customer.state, customer.country]
    .filter(Boolean)
    .join(', ')

  const live = docs.filter((d) => d.status !== 'Cancelled')
  const billed = live
    .filter((d) => d.doc_type === 'invoice')
    .reduce((s, d) => s + Number(d.total || 0), 0)
  const outstanding = live
    .filter((d) => d.doc_type === 'invoice')
    .reduce((s, d) => s + Math.max(0, Number(d.total || 0) - Number(d.amount_paid || 0)), 0)

  const isCompany = customer.type === 'company'

  return (
    <div>
      <style>{css}</style>

      <Link className="back-link" to="/customers"><ArrowLeft size={14} /> Back to customers</Link>

      <PageHeader
        icon={isCompany ? Building2 : User}
        title={customer.name}
        subtitle={isCompany ? 'Company customer' : 'Individual customer'}
      >
        {customer.phone && (
          <button
            className="small green"
            onClick={() => window.open('https://wa.me/' + waNumber(customer.phone), '_blank')}
          >
            <MessageCircle size={15} /> WhatsApp
          </button>
        )}
        {customer.email && (
          <button className="small blue" onClick={() => (window.location.href = 'mailto:' + customer.email)}>
            <Mail size={15} /> Email
          </button>
        )}
        <button className="small" onClick={() => navigate('/documents/new/quote')}>
          <Plus size={15} /> New Quotation
        </button>
      </PageHeader>

      <Stats>
        <StatCard color="blue" icon={FileText} label="Documents" value={docs.length} />
        <StatCard color="green" icon={Wallet} label="Total Invoiced" value={money(billed)} />
        <StatCard color="red" icon={Wallet} label="Outstanding" value={money(outstanding)} />
        <StatCard color="purple" icon={Users} label="Contact Persons" value={contacts.length} />
      </Stats>

      <Panel title="Customer Details" icon={isCompany ? Building2 : User}>
        <div className="info-grid">
          <Info icon={User} label="Type" value={isCompany ? 'Company' : 'Individual'} />
          <Info icon={Phone} label="Phone (WhatsApp)" value={customer.phone} />
          <Info icon={Mail} label="Email" value={customer.email} />
          <Info icon={FileText} label="Tax ID" value={customer.tax_id} />
          <Info icon={MapPin} label="Address" value={addressLine} />
          <Info label="Notes" value={customer.notes} />
        </div>
      </Panel>

      <div className="cd-gap" />

      <Panel
        title="Contact Persons"
        icon={Users}
        action={
          !form && (
            <button className="small" onClick={startAdd}>
              <Plus size={15} /> Add Contact
            </button>
          )
        }
      >
        {error && <p className="error">{error}</p>}

        {form && (
          <form className="form-card" onSubmit={save}>
            <h3 style={{ marginTop: 0 }}>{form.id ? 'Edit contact' : 'New contact'}</h3>
            <div className="form-grid">
              <div>
                <label>Name *</label>
                <input value={form.name} onChange={(e) => setField('name', e.target.value)} />
              </div>
              <div>
                <label>Position</label>
                <input value={form.position} onChange={(e) => setField('position', e.target.value)} />
              </div>
              <div>
                <label>Phone</label>
                <input value={form.phone} onChange={(e) => setField('phone', e.target.value)} />
              </div>
              <div>
                <label>Email</label>
                <input value={form.email} onChange={(e) => setField('email', e.target.value)} />
              </div>
            </div>
            <div className="check-row">
              <input
                id="is_primary"
                type="checkbox"
                checked={form.is_primary}
                onChange={(e) => setField('is_primary', e.target.checked)}
              />
              <label htmlFor="is_primary">Main contact person</label>
            </div>
            <div className="detail-actions" style={{ marginTop: 14 }}>
              <button className="small" type="submit" disabled={saving}>
                {saving ? 'Saving...' : 'Save'}
              </button>
              <button className="small ghost" type="button" onClick={() => setForm(null)}>
                Cancel
              </button>
            </div>
          </form>
        )}

        {contacts.length === 0 ? (
          <div className="empty-note">No contact persons yet. Click "Add Contact".</div>
        ) : (
          <div className="contact-list">
            {contacts.map((c) => (
              <div className="contact-card" key={c.id}>
                <div className="contact-name">
                  {c.name} {c.is_primary && <span className="pill green">Main</span>}
                </div>
                {c.position && <div className="contact-line">{c.position}</div>}
                {c.phone && <div className="contact-line">{c.phone}</div>}
                {c.email && <div className="contact-line">{c.email}</div>}
                <div className="contact-actions">
                  <button className="small icon-btn ghost" title="Edit" onClick={() => startEdit(c)}>
                    <Pencil size={14} />
                  </button>
                  <button className="small icon-btn danger" title="Delete" onClick={() => remove(c)}>
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </Panel>

      <div className="cd-gap" />

      <Panel title="Documents" icon={FileText}>
        {docs.length === 0 ? (
          <div className="empty-note">No documents for this customer yet.</div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table className="data">
              <thead>
                <tr>
                  <th>Number</th>
                  <th>Type</th>
                  <th>Date</th>
                  <th>Status</th>
                  <th style={{ textAlign: 'right' }}>Total</th>
                  <th style={{ textAlign: 'right' }}>Balance</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {docs.map((d) => {
                  const bal = d.doc_type === 'invoice'
                    ? Math.max(0, Number(d.total || 0) - Number(d.amount_paid || 0))
                    : null
                  return (
                    <tr key={d.id}>
                      <td>{d.doc_number}</td>
                      <td>{docLabel(d.doc_type)}</td>
                      <td>{showDate(d.issue_date)}</td>
                      <td><span className={'pill ' + (STATUS_COLOR[d.status] || 'grey')}>{d.status}</span></td>
                      <td style={{ textAlign: 'right' }}>{money(d.total)}</td>
                      <td style={{ textAlign: 'right' }}>{bal === null ? '-' : money(bal)}</td>
                      <td>
                        <button className="icon" title="Open" onClick={() => navigate('/documents/' + d.id)}>
                          <Eye size={16} />
                        </button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </Panel>
    </div>
  )
}