import { useEffect, useState } from 'react'
import { Truck, Plus, Pencil, Trash2, Search, MessageCircle, Mail, Download, Building2, Tag } from 'lucide-react'
import { supabase } from '../supabaseClient'
import { useConfirm } from '../components/ConfirmDialog'
import { PageHeader, Stats, StatCard, Panel } from '../components/ui'

const emptyForm = {
  name: '',
  contact_person: '',
  phone: '',
  email: '',
  address: '',
  city: '',
  state: '',
  postcode: '',
  country: 'Malaysia',
  tax_id: '',
  category: '',
  notes: '',
}

function exportCsv(list) {
  const cols = [
    ['Name', 'name'], ['Contact Person', 'contact_person'], ['Phone', 'phone'], ['Email', 'email'],
    ['Address', 'address'], ['City', 'city'], ['State', 'state'], ['Postcode', 'postcode'],
    ['Country', 'country'], ['Tax ID', 'tax_id'], ['Category', 'category'],
  ]
  const esc = (v) => '"' + String(v ?? '').replace(/"/g, '""') + '"'
  const lines = [cols.map((c) => esc(c[0])).join(',')].concat(
    list.map((r) => cols.map((c) => esc(r[c[1]])).join(','))
  )
  const blob = new Blob(['\ufeff' + lines.join('\n')], { type: 'text/csv;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = 'suppliers.csv'
  a.click()
  URL.revokeObjectURL(url)
}

export default function Suppliers() {
  const confirm = useConfirm()
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [search, setSearch] = useState('')
  const [selectedId, setSelectedId] = useState(null)
  const [form, setForm] = useState(null)
  const [saving, setSaving] = useState(false)

  async function load() {
    setLoading(true)
    const { data, error } = await supabase.from('suppliers').select('*').order('name')
    if (error) {
      setError(error.message)
    } else {
      setError('')
      setRows(data || [])
    }
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
      setError('Supplier name is required.')
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

    let result
    if (form.id) {
      result = await supabase
        .from('suppliers')
        .update({ ...payload, updated_at: new Date().toISOString() })
        .eq('id', form.id)
    } else {
      result = await supabase.from('suppliers').insert(payload)
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
    if (!(await confirm('Delete supplier "' + row.name + '"?'))) return
    const { error } = await supabase.from('suppliers').delete().eq('id', row.id)
    if (error) {
      setError(error.message)
      return
    }
    if (selectedId === row.id) setSelectedId(null)
    load()
  }

  function openWhatsApp(phone) {
    const text = String(phone || '').trim()
    let d = text.replace(/\D/g, '')
    if (!d) return
    if (!text.startsWith('+')) {
      if (d.startsWith('00')) d = d.slice(2)
      else if (d.startsWith('0')) d = '60' + d.slice(1)
      else if (!d.startsWith('60') && d.length <= 10) d = '60' + d
    }
    window.open('https://wa.me/' + d, '_blank')
  }

  const q = search.trim().toLowerCase()
  const shown = rows.filter((r) => {
    if (!q) return true
    return [r.name, r.contact_person, r.phone, r.email, r.city, r.category]
      .filter(Boolean)
      .some((v) => String(v).toLowerCase().includes(q))
  })
  const selected = rows.find((r) => r.id === selectedId) || shown[0] || null
  const categories = new Set(rows.map((r) => r.category).filter(Boolean)).size
  const now = new Date()
  const newThisMonth = rows.filter((r) => {
    const d = new Date(r.created_at)
    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear()
  }).length

  return (
    <div>
      <PageHeader
        icon={Truck}
        title="Suppliers Management"
        subtitle="Manage suppliers and vendors for purchase orders"
      >
        <button className="small icon-btn" onClick={startAdd}>
          <Plus size={15} /> New Supplier
        </button>
        <button className="small blue icon-btn" onClick={() => exportCsv(shown)}>
          <Download size={15} /> Export
        </button>
      </PageHeader>

      {error && <p className="error">{error}</p>}

      {form && (
        <form className="form-card" onSubmit={save}>
          <h2>{form.id ? 'Edit supplier' : 'New supplier'}</h2>
          <div className="form-grid">
            <div>
              <label>Supplier name *</label>
              <input value={form.name} onChange={(e) => setField('name', e.target.value)} />
            </div>
            <div>
              <label>Contact person</label>
              <input value={form.contact_person} onChange={(e) => setField('contact_person', e.target.value)} />
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
              <label>Category (e.g. Laptops, Parts, Software)</label>
              <input value={form.category} onChange={(e) => setField('category', e.target.value)} />
            </div>
            <div>
              <label>Tax ID (SST / TIN / SSM no.)</label>
              <input value={form.tax_id} onChange={(e) => setField('tax_id', e.target.value)} />
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
        <StatCard color="blue" icon={Truck} label="Total Suppliers" value={rows.length} />
        <StatCard color="purple" icon={Tag} label="Categories" value={categories} />
        <StatCard color="green" icon={Building2} label="New This Month" value={newThisMonth} />
      </Stats>

      <div className="split">
        <div>
          <div className="search-row">
            <Search size={15} />
            <input
              placeholder="Search supplier (name, contact, phone, email, category)"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          <div className="table-wrap">
            {loading ? (
              <div className="empty-note">Loading...</div>
            ) : shown.length === 0 ? (
              <div className="empty-note">
                {rows.length === 0 ? 'No suppliers yet. Click "+ New Supplier".' : 'No suppliers match your search.'}
              </div>
            ) : (
              <table className="data">
                <thead>
                  <tr>
                    <th>#</th>
                    <th>Supplier Name</th>
                    <th>Category</th>
                    <th>Contact Person</th>
                    <th>Phone</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {shown.map((r, i) => (
                    <tr
                      key={r.id}
                      className={selected && selected.id === r.id ? 'sel' : ''}
                      onClick={() => setSelectedId(r.id)}
                    >
                      <td>{i + 1}</td>
                      <td><strong>{r.name}</strong></td>
                      <td>{r.category || '-'}</td>
                      <td>{r.contact_person || '-'}</td>
                      <td>{r.phone || '-'}</td>
                      <td onClick={(e) => e.stopPropagation()}>
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

        <Panel title="Supplier Details" icon={Truck}>
          {!selected ? (
            <div className="empty-note">Select a supplier from the list.</div>
          ) : (
            <div>
              <div className="detail-title">
                <h4>{selected.name}</h4>
                {selected.category && <span className="pill blue">{selected.category}</span>}
              </div>
              <dl className="kv">
                <dt>Contact Person</dt>
                <dd>{selected.contact_person || '-'}</dd>
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
                <dt>Notes</dt>
                <dd>{selected.notes || '-'}</dd>
              </dl>
              <div className="detail-actions">
                <button
                  className="small green icon-btn"
                  disabled={!selected.phone}
                  onClick={() => openWhatsApp(selected.phone)}
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
              </div>
            </div>
          )}
        </Panel>
      </div>
    </div>
  )
}