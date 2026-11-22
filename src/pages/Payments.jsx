import { useEffect, useState } from 'react'
import MoneyInput from '../components/MoneyInput'
import { Banknote, Plus, Pencil, Trash2, Search, Download, CalendarDays, Receipt, FileText } from 'lucide-react'
import { supabase } from '../supabaseClient'
import Select from '../components/Select'
import { useConfirm } from '../components/ConfirmDialog'
import { PageHeader, Stats, StatCard, Panel } from '../components/ui'

const METHODS = ['Bank Transfer', 'Cash', 'Card', 'E-Wallet', 'Cheque']

function today() {
  return new Date().toISOString().slice(0, 10)
}

function money(n) {
  return 'RM ' + Number(n || 0).toLocaleString('en-MY', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

function showDate(d) {
  if (!d) return '-'
  const [y, m, day] = String(d).slice(0, 10).split('-')
  return day + '/' + m + '/' + y
}

function round2(n) {
  return Math.round(Number(n || 0) * 100) / 100
}

const emptyForm = {
  document_id: '',
  payment_date: today(),
  amount: '',
  method: 'Bank Transfer',
  reference: '',
  notes: '',
}

function exportCsv(list) {
  const cols = [
    ['Date', 'payment_date'], ['Invoice', 'invoice_no'], ['Customer', 'customer_name'],
    ['Method', 'method'], ['Amount', 'amount'], ['Reference', 'reference'],
  ]
  const esc = (v) => '"' + String(v ?? '').replace(/"/g, '""') + '"'
  const lines = [cols.map((c) => esc(c[0])).join(',')].concat(
    list.map((r) => cols.map((c) => esc(r[c[1]])).join(','))
  )
  const blob = new Blob(['\ufeff' + lines.join('\n')], { type: 'text/csv;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = 'payments.csv'
  a.click()
  URL.revokeObjectURL(url)
}

// After any payment change, update the invoice: amount paid and status.
async function syncInvoice(docId) {
  if (!docId) return null
  const p = await supabase.from('payments').select('amount').eq('document_id', docId)
  if (p.error) return p.error
  const paid = round2((p.data || []).reduce((s, r) => s + Number(r.amount || 0), 0))
  const d = await supabase.from('documents').select('total, status').eq('id', docId).single()
  if (d.error) return d.error
  const total = Number(d.data.total || 0)
  let status = d.data.status
  if (total > 0 && paid >= total) status = 'Paid'
  else if (status === 'Paid') status = 'Sent'
  const u = await supabase
    .from('documents')
    .update({ amount_paid: paid, status, updated_at: new Date().toISOString() })
    .eq('id', docId)
  return u.error || null
}

export default function Payments() {
  const confirm = useConfirm()
  const [rows, setRows] = useState([])
  const [invoices, setInvoices] = useState([])
  const [customers, setCustomers] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [search, setSearch] = useState('')
  const [form, setForm] = useState(null)
  const [saving, setSaving] = useState(false)

  async function load() {
    setLoading(true)
    const [p, d, c] = await Promise.all([
      supabase.from('payments').select('*').order('payment_date', { ascending: false }),
      supabase
        .from('documents')
        .select('id, doc_number, customer_id, total, amount_paid, status')
        .eq('doc_type', 'invoice'),
      supabase.from('customers').select('id, name').order('name'),
    ])
    const err = p.error || d.error || c.error
    if (err) {
      setError(err.message)
    } else {
      setError('')
      setRows(p.data || [])
      setInvoices(d.data || [])
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
  const invoiceOf = (id) => invoices.find((x) => x.id === id)
  const owing = (inv) => round2(Number(inv.total || 0) - Number(inv.amount_paid || 0))

  const openInvoices = invoices.filter((i) => i.status !== 'Cancelled' && owing(i) > 0.005)

  function setField(key, value) {
    setForm((f) => ({ ...f, [key]: value }))
  }

  function pickInvoice(id) {
    const inv = invoiceOf(id)
    setForm((f) => ({ ...f, document_id: id, amount: inv ? String(owing(inv)) : f.amount }))
  }

  function startAdd() {
    setForm({ ...emptyForm, payment_date: today() })
    setError('')
  }

  function startEdit(row) {
    const f = { id: row.id }
    Object.keys(emptyForm).forEach((k) => {
      f[k] = row[k] ?? ''
    })
    f.payment_date = String(row.payment_date).slice(0, 10)
    setForm(f)
    setError('')
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  async function save(e) {
    e.preventDefault()
    if (!form.document_id) {
      setError('Please choose an invoice.')
      return
    }
    const amount = Number(form.amount)
    if (!form.amount || Number.isNaN(amount) || amount <= 0) {
      setError('Enter an amount greater than 0.')
      return
    }
    const inv = invoiceOf(form.document_id)
    setSaving(true)
    setError('')
    const payload = {
      document_id: form.document_id,
      customer_id: inv ? inv.customer_id : null,
      payment_date: form.payment_date || today(),
      amount: round2(amount),
      method: form.method || null,
      reference: form.reference.trim() || null,
      notes: form.notes.trim() || null,
    }
    let result
    if (form.id) {
      result = await supabase
        .from('payments')
        .update({ ...payload, updated_at: new Date().toISOString() })
        .eq('id', form.id)
    } else {
      result = await supabase.from('payments').insert(payload)
    }
    if (result.error) {
      setSaving(false)
      setError(result.error.message)
      return
    }
    const syncErr = await syncInvoice(form.document_id)
    setSaving(false)
    if (syncErr) {
      setError(syncErr.message)
      return
    }
    setForm(null)
    load()
  }

  async function remove(row) {
    const inv = invoiceOf(row.document_id)
    const label = inv ? inv.doc_number : 'this invoice'
    if (!(await confirm('Delete payment of ' + money(row.amount) + ' for ' + label + '?'))) return
    const { error } = await supabase.from('payments').delete().eq('id', row.id)
    if (error) {
      setError(error.message)
      return
    }
    const syncErr = await syncInvoice(row.document_id)
    if (syncErr) setError(syncErr.message)
    load()
  }

  const q = search.trim().toLowerCase()
  const shown = rows
    .map((r) => {
      const inv = invoiceOf(r.document_id)
      return {
        ...r,
        invoice_no: inv ? inv.doc_number : '',
        customer_name: customerName(r.customer_id),
      }
    })
    .filter((r) => {
      if (!q) return true
      return [r.invoice_no, r.customer_name, r.reference, r.method]
        .filter(Boolean)
        .some((v) => String(v).toLowerCase().includes(q))
    })

  const monthKey = today().slice(0, 7)
  const totalReceived = rows.reduce((s, r) => s + Number(r.amount || 0), 0)
  const thisMonth = rows
    .filter((r) => String(r.payment_date).slice(0, 7) === monthKey)
    .reduce((s, r) => s + Number(r.amount || 0), 0)
  const outstanding = openInvoices.reduce((s, i) => s + owing(i), 0)

  // Invoice choices: open invoices, plus the invoice being edited.
  const choiceInvoices = invoices.filter(
    (i) => openInvoices.some((o) => o.id === i.id) || (form && form.id && i.id === form.document_id)
  )

  return (
    <div>
      <PageHeader icon={Banknote} title="Payments" subtitle="Record money received from customers">
        <button className="small icon-btn" onClick={startAdd}>
          <Plus size={15} /> Record Payment
        </button>
        <button className="small blue icon-btn" onClick={() => exportCsv(shown)}>
          <Download size={15} /> Export
        </button>
      </PageHeader>

      {error && <p className="error">{error}</p>}

      {form && (
        <form className="form-card" onSubmit={save}>
          <h2>{form.id ? 'Edit payment' : 'Record payment'}</h2>
          <div className="form-grid">
            <div className="full">
              <label>Invoice *</label>
              {form.id ? (
                <input
                  disabled
                  value={
                    (invoiceOf(form.document_id)?.doc_number || '') +
                    ' - ' +
                    customerName(invoiceOf(form.document_id)?.customer_id)
                  }
                />
              ) : (
                <Select
                  value={form.document_id}
                  onChange={pickInvoice}
                  options={[
                    { value: '', label: 'Choose an invoice' },
                    ...choiceInvoices.map((i) => ({
                      value: i.id,
                      label: i.doc_number + ' - ' + customerName(i.customer_id) + ' (owing ' + money(owing(i)) + ')',
                    })),
                  ]}
                />
              )}
            </div>
            <div>
              <label>Date</label>
              <input type="date" value={form.payment_date} onChange={(e) => setField('payment_date', e.target.value)} />
            </div>
            <div>
              <label>Amount (RM) *</label>
              <MoneyInput value={form.amount} onChange={(e) => setField('amount', e.target.value)} />
            </div>
            <div>
              <label>Payment method</label>
              <Select value={form.method} onChange={(v) => setField('method', v)} options={METHODS} />
            </div>
            <div>
              <label>Reference (bank slip / transaction no.)</label>
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
        <StatCard color="green" icon={Banknote} label="Total Received" value={money(totalReceived)} />
        <StatCard color="blue" icon={CalendarDays} label="This Month" value={money(thisMonth)} />
        <StatCard color="orange" icon={FileText} label="Outstanding" value={money(outstanding)} />
        <StatCard color="purple" icon={Receipt} label="Payments" value={rows.length} />
      </Stats>

      <div className="split">
        <div>
          <div className="filter-row">
            <div className="search-row" style={{ margin: 0 }}>
              <Search size={15} />
              <input
                placeholder="Search payment (invoice, customer, reference)"
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
                {rows.length === 0 ? 'No payments yet. Click "+ Record Payment".' : 'No payments match.'}
              </div>
            ) : (
              <table className="data">
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Invoice</th>
                    <th>Customer</th>
                    <th>Method</th>
                    <th className="num">Amount</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {shown.map((r) => (
                    <tr key={r.id} style={{ cursor: 'default' }}>
                      <td>{showDate(r.payment_date)}</td>
                      <td><strong>{r.invoice_no || '-'}</strong></td>
                      <td>{r.customer_name || '-'}</td>
                      <td>{r.method || '-'}</td>
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

        <Panel title="Unpaid Invoices" icon={FileText}>
          {openInvoices.length === 0 ? (
            <div className="empty-note">No unpaid invoices.</div>
          ) : (
            <div style={{ display: 'grid', gap: 10 }}>
              {openInvoices.map((i) => (
                <div key={i.id} style={{ fontSize: 12.5, display: 'flex', justifyContent: 'space-between', gap: 8 }}>
                  <span>
                    <b>{i.doc_number}</b>
                    <br />
                    {customerName(i.customer_id) || '-'}
                  </span>
                  <b>{money(owing(i))}</b>
                </div>
              ))}
            </div>
          )}
        </Panel>
      </div>
    </div>
  )
}