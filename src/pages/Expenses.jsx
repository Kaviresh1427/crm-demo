import { useEffect, useState } from 'react'
import MoneyInput from '../components/MoneyInput'
import { Wallet, Plus, Pencil, Trash2, Search, Download, CalendarDays, Receipt, Tag } from 'lucide-react'
import { supabase } from '../supabaseClient'
import Select from '../components/Select'
import { useConfirm } from '../components/ConfirmDialog'
import { PageHeader, Stats, StatCard, Panel } from '../components/ui'

const CATEGORIES = [
  'Parts & Hardware', 'Software & Licences', 'Transport', 'Hosting & Domain',
  'Subcontractor', 'Office', 'Marketing', 'Other',
]
const METHODS = ['Bank Transfer', 'Cash', 'Card', 'E-Wallet']

function today() {
  return new Date().toISOString().slice(0, 10)
}

const emptyForm = {
  expense_date: today(),
  description: '',
  category: 'Other',
  supplier_id: '',
  amount: '',
  payment_method: 'Bank Transfer',
  reference: '',
  notes: '',
}

function money(n) {
  return 'RM ' + Number(n || 0).toLocaleString('en-MY', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

function showDate(d) {
  if (!d) return '-'
  const [y, m, day] = String(d).slice(0, 10).split('-')
  return day + '/' + m + '/' + y
}

function exportCsv(list) {
  const cols = [
    ['Date', 'expense_date'], ['Description', 'description'], ['Category', 'category'],
    ['Supplier', 'supplier_name'], ['Amount', 'amount'], ['Method', 'payment_method'], ['Reference', 'reference'],
  ]
  const esc = (v) => '"' + String(v ?? '').replace(/"/g, '""') + '"'
  const lines = [cols.map((c) => esc(c[0])).join(',')].concat(
    list.map((r) => cols.map((c) => esc(r[c[1]])).join(','))
  )
  const blob = new Blob(['\ufeff' + lines.join('\n')], { type: 'text/csv;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = 'expenses.csv'
  a.click()
  URL.revokeObjectURL(url)
}

export default function Expenses() {
  const confirm = useConfirm()
  const [rows, setRows] = useState([])
  const [suppliers, setSuppliers] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [search, setSearch] = useState('')
  const [catFilter, setCatFilter] = useState('')
  const [form, setForm] = useState(null)
  const [saving, setSaving] = useState(false)

  async function load() {
    setLoading(true)
    const [e, s] = await Promise.all([
      supabase.from('expenses').select('*').order('expense_date', { ascending: false }),
      supabase.from('suppliers').select('id, name').order('name'),
    ])
    const err = e.error || s.error
    if (err) {
      setError(err.message)
    } else {
      setError('')
      setRows(e.data || [])
      setSuppliers(s.data || [])
    }
    setLoading(false)
  }

  useEffect(() => {
    load()
  }, [])

  const supplierName = (id) => {
    const s = suppliers.find((x) => x.id === id)
    return s ? s.name : ''
  }

  function setField(key, value) {
    setForm((f) => ({ ...f, [key]: value }))
  }

  function startAdd() {
    setForm({ ...emptyForm, expense_date: today() })
    setError('')
  }

  function startEdit(row) {
    const f = { id: row.id }
    Object.keys(emptyForm).forEach((k) => {
      f[k] = row[k] ?? ''
    })
    f.expense_date = String(row.expense_date).slice(0, 10)
    setForm(f)
    setError('')
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  async function save(e) {
    e.preventDefault()
    if (!form.description.trim()) {
      setError('Description is required.')
      return
    }
    const amount = Number(form.amount)
    if (!form.amount || Number.isNaN(amount) || amount <= 0) {
      setError('Enter an amount greater than 0.')
      return
    }
    setSaving(true)
    setError('')
    const payload = {
      expense_date: form.expense_date || today(),
      description: form.description.trim(),
      category: form.category || null,
      supplier_id: form.supplier_id || null,
      amount: Math.round(amount * 100) / 100,
      payment_method: form.payment_method || null,
      reference: form.reference.trim() || null,
      notes: form.notes.trim() || null,
    }
    let result
    if (form.id) {
      result = await supabase
        .from('expenses')
        .update({ ...payload, updated_at: new Date().toISOString() })
        .eq('id', form.id)
    } else {
      result = await supabase.from('expenses').insert(payload)
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
    if (!(await confirm('Delete expense "' + row.description + '"?'))) return
    const { error } = await supabase.from('expenses').delete().eq('id', row.id)
    if (error) {
      setError(error.message)
      return
    }
    load()
  }

  const q = search.trim().toLowerCase()
  const shown = rows
    .map((r) => ({ ...r, supplier_name: supplierName(r.supplier_id) }))
    .filter((r) => {
      if (catFilter && r.category !== catFilter) return false
      if (!q) return true
      return [r.description, r.reference, r.supplier_name, r.category]
        .filter(Boolean)
        .some((v) => String(v).toLowerCase().includes(q))
    })

  const monthKey = today().slice(0, 7)
  const total = rows.reduce((s, r) => s + Number(r.amount || 0), 0)
  const thisMonth = rows
    .filter((r) => String(r.expense_date).slice(0, 7) === monthKey)
    .reduce((s, r) => s + Number(r.amount || 0), 0)

  const byCat = {}
  rows.forEach((r) => {
    const k = r.category || 'Other'
    byCat[k] = (byCat[k] || 0) + Number(r.amount || 0)
  })
  const catList = Object.keys(byCat).sort((a, b) => byCat[b] - byCat[a])
  const maxCat = Math.max(1, ...catList.map((k) => byCat[k]))

  return (
    <div>
      <PageHeader icon={Wallet} title="Expenses" subtitle="Record and track company spending">
        <button className="small icon-btn" onClick={startAdd}>
          <Plus size={15} /> New Expense
        </button>
        <button className="small blue icon-btn" onClick={() => exportCsv(shown)}>
          <Download size={15} /> Export
        </button>
      </PageHeader>

      {error && <p className="error">{error}</p>}

      {form && (
        <form className="form-card" onSubmit={save}>
          <h2>{form.id ? 'Edit expense' : 'New expense'}</h2>
          <div className="form-grid">
            <div>
              <label>Date</label>
              <input type="date" value={form.expense_date} onChange={(e) => setField('expense_date', e.target.value)} />
            </div>
            <div>
              <label>Amount (RM) *</label>
              <MoneyInput value={form.amount} onChange={(e) => setField('amount', e.target.value)} />
            </div>
            <div className="full">
              <label>Description *</label>
              <input value={form.description} onChange={(e) => setField('description', e.target.value)} />
            </div>
            <div>
              <label>Category</label>
              <Select value={form.category} onChange={(v) => setField('category', v)} options={CATEGORIES} />
            </div>
            <div>
              <label>Supplier</label>
              <Select
                value={form.supplier_id}
                onChange={(v) => setField('supplier_id', v)}
                options={[{ value: '', label: 'None' }, ...suppliers.map((s) => ({ value: s.id, label: s.name }))]}
              />
            </div>
            <div>
              <label>Payment method</label>
              <Select value={form.payment_method} onChange={(v) => setField('payment_method', v)} options={METHODS} />
            </div>
            <div>
              <label>Reference / receipt no.</label>
              <input value={form.reference} onChange={(e) => setField('reference', e.target.value)} />
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
        <StatCard color="red" icon={Wallet} label="Total Expenses" value={money(total)} />
        <StatCard color="orange" icon={CalendarDays} label="This Month" value={money(thisMonth)} />
        <StatCard color="blue" icon={Receipt} label="Records" value={rows.length} />
        <StatCard color="purple" icon={Tag} label="Categories Used" value={catList.length} />
      </Stats>

      <div className="split">
        <div>
          <div className="filter-row">
            <Select
              value={catFilter}
              onChange={setCatFilter}
              options={[{ value: '', label: 'All Categories' }, ...CATEGORIES]}
            />
            <div className="search-row" style={{ margin: 0 }}>
              <Search size={15} />
              <input
                placeholder="Search expense (description, supplier, reference)"
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
                {rows.length === 0 ? 'No expenses yet. Click "+ New Expense".' : 'No expenses match.'}
              </div>
            ) : (
              <table className="data">
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Description</th>
                    <th>Category</th>
                    <th>Supplier</th>
                    <th className="num">Amount</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {shown.map((r) => (
                    <tr key={r.id} style={{ cursor: 'default' }}>
                      <td>{showDate(r.expense_date)}</td>
                      <td><strong>{r.description}</strong></td>
                      <td>{r.category || '-'}</td>
                      <td>{r.supplier_name || '-'}</td>
                      <td className="num">{money(r.amount)}</td>
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

        <Panel title="Spending by Category" icon={Tag}>
          {catList.length === 0 ? (
            <div className="empty-note">No data yet.</div>
          ) : (
            <div style={{ display: 'grid', gap: 10 }}>
              {catList.map((k) => (
                <div key={k} style={{ fontSize: 12.5 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                    <span>{k}</span>
                    <b>{money(byCat[k])}</b>
                  </div>
                  <div style={{ background: '#17171b', borderRadius: 8, height: 10, overflow: 'hidden' }}>
                    <div
                      style={{
                        height: '100%',
                        width: (byCat[k] / maxCat) * 100 + '%',
                        background: 'linear-gradient(90deg, #ff2028, #ff6a70)',
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </Panel>
      </div>
    </div>
  )
}