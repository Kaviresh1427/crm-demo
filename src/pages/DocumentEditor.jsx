import { useEffect, useState } from 'react'
import MoneyInput from '../components/MoneyInput'
import { Link, useNavigate, useParams } from 'react-router-dom'
import {
  ArrowLeft, FileText, Plus, Trash2, Download, MessageCircle, Mail, Save, Search,
  ArrowRightLeft, Receipt, Users, ListChecks, StickyNote,
} from 'lucide-react'
import { supabase } from '../supabaseClient'
import Select from '../components/Select'
import DatePicker from '../components/DatePicker'
import { PageHeader, Panel } from '../components/ui'
import { DOC_TYPES, STATUSES, PAYMENT_REFERENCE_NOTE, docLabel } from '../docSettings'
import { downloadDocumentPdf } from '../pdf'
import BlockPicker from '../components/BlockPicker'
import { loadTermsLibrary } from '../termsLibrary'

const css = `
.addr-opt { display: flex; align-items: center; gap: 10px; margin: 10px 0 0; font-size: 13px; color: var(--text); cursor: pointer; }
.addr-opt input { margin: 0; }
.blk-pick { margin-bottom: 10px; }
.blk-head { display: flex; justify-content: space-between; font-size: 12.5px; color: var(--muted); margin-bottom: 8px; }
.blk-head a { color: var(--accent); text-decoration: none; }
.blk-list { display: flex; flex-wrap: wrap; gap: 8px; }
.blk-chip { display: inline-flex; align-items: center; gap: 8px; margin: 0; padding: 7px 12px; border: 1px solid var(--glass-b, var(--line)); border-radius: 999px; cursor: pointer; font-size: 13px; color: var(--text); transition: background 0.3s, border-color 0.3s; }
.blk-chip.on { border-color: rgba(255, 59, 67, 0.8); background: rgba(224, 37, 44, 0.16); }
.blk-chip input { margin: 0; }
.back-link { display: inline-flex; align-items: center; gap: 6px; margin-bottom: 12px; color: var(--accent); text-decoration: none; font-size: 13px; }
.back-link:hover { text-decoration: underline; }
.form-grid .full { grid-column: 1 / -1; }
textarea { width: 100%; padding: 11px 13px; border-radius: 10px; border: 1px solid var(--line); background: rgba(0, 0, 0, 0.35); color: var(--text); font-size: 14px; font-family: inherit; }
textarea:focus { outline: 1px solid var(--brand-hot); }
.item-card { background: rgba(255, 255, 255, 0.03); border: 1px solid var(--line); border-radius: 12px; padding: 14px; margin-top: 12px; }
.item-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 0 14px; align-items: end; }
.item-grid .wide { grid-column: 1 / -1; }
.item-total { font-weight: 600; padding: 12px 0; font-size: 14px; }
.item-top { display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px; }
.item-no { color: var(--accent); font-size: 12.5px; font-weight: 600; }
.pick { position: relative; }
.pick-box { position: relative; }
.pick-box > svg { position: absolute; left: 12px; top: 50%; transform: translateY(-50%); color: var(--muted); pointer-events: none; }
.pick input { padding-left: 36px; }
.pick-list { position: absolute; z-index: 30; left: 0; right: 0; top: 100%; margin-top: 4px; max-height: 260px; overflow-y: auto; background: #101014; border: 1px solid var(--brand-hot); border-radius: 10px; box-shadow: 0 0 18px rgba(255, 32, 40, 0.3); }
.pick-opt { padding: 9px 12px; font-size: 13px; cursor: pointer; display: flex; justify-content: space-between; gap: 10px; border-bottom: 1px solid rgba(255, 255, 255, 0.05); }
.pick-opt:hover { background: rgba(255, 32, 40, 0.18); }
.pick-opt small { color: var(--muted); white-space: nowrap; }
.pick-none { padding: 10px 12px; font-size: 12.5px; color: var(--muted); }
.totals-inputs { display: grid; grid-template-columns: 1fr 1fr; gap: 0 12px; }
.totals-row { display: flex; justify-content: space-between; gap: 12px; padding: 6px 0; font-size: 13.5px; }
.totals-row.big { font-size: 17px; font-weight: 700; border-top: 1px solid var(--line); margin-top: 6px; padding-top: 12px; color: var(--accent); }
.ok-note { color: #4ade80; font-size: 13px; margin: 0 0 10px; }
.hint { color: var(--muted); font-size: 12px; margin: 10px 0 0; }
.side-btns { display: grid; gap: 8px; margin-top: 14px; }
.side-btns button { justify-content: center; }
.ed-gap { margin-top: 16px; }
`

let keySeq = 0
function newItem(extra) {
  keySeq += 1
  return { key: 'k' + keySeq, service_id: '', description: '', quantity: '1', unit_price: '', search: '', ...extra }
}

function todayStr() {
  const d = new Date()
  return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0')
}

function r2(x) {
  return Math.round((Number(x) + Number.EPSILON) * 100) / 100
}

function money(n) {
  return 'RM ' + Number(n || 0).toLocaleString('en-MY', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
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

// Default note on quotations, estimates and proforma invoices
const DEPOSIT_NOTE =
  'A 50% deposit is required before we start the job. The balance is payable once the job is completed.'
const DEPOSIT_DOCS = ['quote', 'estimate', 'proforma']

const blankDoc = {
  doc_number: '',
  customer_id: '',
  status: 'Draft',
  issue_date: '',
  due_date: '',
  discount_amount: '',
  tax_rate: '',
  amount_paid: '',
  notes: '',
  terms: '',
  show_address: true,
}

// Type-to-search box for the service catalogue
function ItemPicker({ services, onPick }) {
  const [text, setText] = useState('')
  const [open, setOpen] = useState(false)

  const q = text.trim().toLowerCase()
  const matches = services
    .filter((s) => !q || [s.name, s.category].filter(Boolean).some((v) => String(v).toLowerCase().includes(q)))
    .slice(0, 10)

  return (
    <div className="pick">
      <label>Search the Service Catalogue (or type your own item below)</label>
      <div className="pick-box">
        <Search size={16} />
        <input
          value={text}
          placeholder="Type a few letters, e.g. pos, laptop"
          onChange={(e) => { setText(e.target.value); setOpen(true) }}
          onFocus={() => setOpen(true)}
          onBlur={() => setTimeout(() => setOpen(false), 150)}
        />
      </div>
      {open && (
        <div className="pick-list">
          {matches.length === 0 ? (
            <div className="pick-none">No matching service. You can type a custom item below.</div>
          ) : (
            matches.map((s) => (
              <div
                key={s.id}
                className="pick-opt"
                onMouseDown={(e) => {
                  e.preventDefault()
                  onPick(s)
                  setText('')
                  setOpen(false)
                }}
              >
                <span>{s.name}</span>
                <small>{s.category}{s.price ? ' · ' + money(s.price) : ''}</small>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  )
}

export default function DocumentEditor() {
  const { id, type: typeParam } = useParams()
  const navigate = useNavigate()
  const [docType, setDocType] = useState(typeParam || '')
  const [doc, setDoc] = useState({ ...blankDoc })
  const [library, setLibrary] = useState([])
  useEffect(() => {
    loadTermsLibrary().then(setLibrary)
  }, [])
  const [items, setItems] = useState([])
  const [customers, setCustomers] = useState([])
  const [services, setServices] = useState([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    async function load() {
      setLoading(true)
      setError('')
      setSaved(false)

      const [c, s] = await Promise.all([
        supabase.from('customers').select('id, name, phone, email').order('name'),
        supabase.from('services').select('id, name, description, price, active, category').order('name'),
      ])
      setCustomers(c.data || [])
      setServices((s.data || []).filter((x) => x.active))

      if (id) {
        const d = await supabase.from('documents').select('*').eq('id', id).single()
        if (d.error) {
          setError(d.error.message)
          setLoading(false)
          return
        }
        const it = await supabase.from('document_items').select('*').eq('document_id', id).order('position')
        setDocType(d.data.doc_type)
        setDoc({
          doc_number: d.data.doc_number || '',
          customer_id: d.data.customer_id || '',
          status: d.data.status || 'Draft',
          issue_date: d.data.issue_date || '',
          due_date: d.data.due_date || '',
          discount_amount: d.data.discount_amount ? String(d.data.discount_amount) : '',
          tax_rate: d.data.tax_rate ? String(d.data.tax_rate) : '',
          amount_paid: d.data.amount_paid ? String(d.data.amount_paid) : '',
          notes: d.data.notes || '',
          show_address: d.data.show_address !== false,
          terms: d.data.terms || '',
        })
        setItems(
          (it.data || []).map((x) =>
            newItem({
              service_id: x.service_id || '',
              description: x.description || '',
              quantity: String(x.quantity),
              unit_price: String(x.unit_price),
            })
          )
        )
      } else {
        setDocType(typeParam)
        setDoc({
          ...blankDoc,
          issue_date: todayStr(),
          notes: DEPOSIT_DOCS.includes(typeParam) ? DEPOSIT_NOTE : '',
          terms: PAYMENT_REFERENCE_NOTE,
        })
        setItems([newItem()])
      }
      setLoading(false)
    }
    load()
  }, [id, typeParam])

  function setField(key, value) {
    setDoc((d) => ({ ...d, [key]: value }))
    setSaved(false)
  }

  function setItemField(key, field, value) {
    setItems((list) => list.map((it) => (it.key === key ? { ...it, [field]: value } : it)))
    setSaved(false)
  }

  function pickService(key, svc) {
    setItems((list) =>
      list.map((it) => {
        if (it.key !== key) return it
        return {
          ...it,
          service_id: svc.id,
          description: svc.description ? svc.name + '\n' + svc.description : svc.name,
          unit_price: String(svc.price ?? 0),
        }
      })
    )
    setSaved(false)
  }

  function addItem() {
    setItems((list) => [...list, newItem()])
  }

  function removeItem(key) {
    setItems((list) => list.filter((it) => it.key !== key))
    setSaved(false)
  }

  const typeInfo = DOC_TYPES[docType]
  const lineTotal = (it) => r2(Number(it.quantity || 0) * Number(it.unit_price || 0))
  const subtotal = r2(items.reduce((sum, it) => sum + lineTotal(it), 0))
  const discount = r2(Number(doc.discount_amount || 0))
  const taxable = Math.max(0, r2(subtotal - discount))
  const taxRate = Number(doc.tax_rate || 0)
  const taxAmount = r2((taxable * taxRate) / 100)
  const total = r2(taxable + taxAmount)
  const paid = r2(Number(doc.amount_paid || 0))
  const balance = r2(total - paid)
  const showPaid = ['invoice', 'proforma', 'receipt'].includes(docType)
  const showBank = ['quote', 'estimate', 'proforma', 'invoice', 'sales_order'].includes(docType)
  const dueLabel = ['quote', 'estimate', 'proforma'].includes(docType) ? 'Valid until' : 'Due date'
  const pickedCustomer = customers.find((c) => c.id === doc.customer_id) || null

  async function save(e) {
    if (e && e.preventDefault) e.preventDefault()
    if (!typeInfo) {
      setError('Unknown document type.')
      return
    }
    const usable = items.filter((it) => it.description.trim() !== '')
    if (usable.length === 0) {
      setError('Add at least one item with a description.')
      return
    }
    if ([doc.discount_amount, doc.tax_rate, doc.amount_paid].some((v) => v !== '' && Number.isNaN(Number(v)))) {
      setError('Discount, tax and amount paid must be numbers.')
      return
    }

    setSaving(true)
    setError('')

    let docId = id
    let number = doc.doc_number

    if (!docId) {
      const n = await supabase.rpc('next_doc_number', { p_type: docType })
      if (n.error) {
        setSaving(false)
        setError(n.error.message)
        return
      }
      number = n.data
    }

    const payload = {
      doc_type: docType,
      doc_number: number,
      customer_id: doc.customer_id || null,
      status: doc.status,
      issue_date: doc.issue_date || todayStr(),
      due_date: doc.due_date || null,
      currency: 'MYR',
      subtotal,
      discount_amount: discount,
      tax_rate: taxRate,
      tax_amount: taxAmount,
      total,
      amount_paid: paid,
      notes: doc.notes.trim() || null,
      terms: doc.terms.trim() || null,
      show_address: doc.show_address,
      updated_at: new Date().toISOString(),
    }

    if (docId) {
      const u = await supabase.from('documents').update(payload).eq('id', docId)
      if (u.error) {
        setSaving(false)
        setError(u.error.message)
        return
      }
      const del = await supabase.from('document_items').delete().eq('document_id', docId)
      if (del.error) {
        setSaving(false)
        setError(del.error.message)
        return
      }
    } else {
      const ins = await supabase.from('documents').insert(payload).select().single()
      if (ins.error) {
        setSaving(false)
        setError(ins.error.message)
        return
      }
      docId = ins.data.id
    }

    const rows = usable.map((it, i) => ({
      document_id: docId,
      position: i + 1,
      service_id: it.service_id || null,
      description: it.description.trim(),
      quantity: Number(it.quantity || 0),
      unit_price: Number(it.unit_price || 0),
      line_total: lineTotal(it),
    }))
    const itemsResult = await supabase.from('document_items').insert(rows)
    if (itemsResult.error) {
      setSaving(false)
      setError(itemsResult.error.message)
      return
    }

    setSaving(false)
    if (!id) {
      navigate('/documents/' + docId, { replace: true })
    } else {
      setSaved(true)
    }
  }

  async function downloadPdf() {
    setError('')
    const usable = items.filter((it) => it.description.trim() !== '')
    if (usable.length === 0) {
      setError('Add at least one item with a description.')
      return false
    }
    setBusy(true)
    let customer = null
    if (doc.customer_id) {
      const r = await supabase.from('customers').select('*').eq('id', doc.customer_id).single()
      if (!r.error) customer = r.data
    }
    let ok = true
    try {
      await downloadDocumentPdf({
        title: typeInfo.title,
        number: doc.doc_number,
        issueDate: doc.issue_date,
        dueDate: doc.due_date,
        dueLabel,
        customer,
        items: usable.map((it) => ({
          description: it.description.trim(),
          quantity: Number(it.quantity || 0),
          unit_price: Number(it.unit_price || 0),
          line_total: lineTotal(it),
        })),
        subtotal,
        discount,
        taxRate,
        taxAmount,
        total,
        paid,
        balance,
        showPaid,
        showBank,
        notes: doc.notes.trim(),
        terms: doc.terms.trim(),
        showAddress: doc.show_address,
      })
    } catch (err) {
      setError('Could not create the PDF: ' + err.message)
      ok = false
    }
    setBusy(false)
    return ok
  }

  async function sendWhatsApp() {
    if (!pickedCustomer || !pickedCustomer.phone) {
      setError('Pick a customer with a phone number first.')
      return
    }
    const ok = await downloadPdf()
    if (!ok) return
    const msg =
      'Hello ' + pickedCustomer.name + ', please find our ' + typeInfo.label + ' ' + doc.doc_number +
      ' (' + money(total) + ') attached. Thank you. - Demo IT Solutions'
    window.open('https://wa.me/' + waNumber(pickedCustomer.phone) + '?text=' + encodeURIComponent(msg), '_blank')
  }

  async function sendEmail() {
    if (!pickedCustomer || !pickedCustomer.email) {
      setError('Pick a customer with an email address first.')
      return
    }
    const ok = await downloadPdf()
    if (!ok) return
    const subject = typeInfo.label + ' ' + doc.doc_number + ' - Demo IT Solutions'
    const body =
      'Hello ' + pickedCustomer.name + ',\n\nPlease find our ' + typeInfo.label + ' ' + doc.doc_number +
      ' attached.\n\nThank you.\nDemo IT Solutions'
    window.location.href =
      'mailto:' + pickedCustomer.email + '?subject=' + encodeURIComponent(subject) + '&body=' + encodeURIComponent(body)
  }

  async function convert(toType) {
    if (!id) return
    setError('')
    setBusy(true)

    const src = await supabase.from('documents').select('*').eq('id', id).single()
    if (src.error) {
      setBusy(false)
      setError(src.error.message)
      return
    }
    const srcItems = await supabase.from('document_items').select('*').eq('document_id', id).order('position')
    if (srcItems.error) {
      setBusy(false)
      setError(srcItems.error.message)
      return
    }
    const n = await supabase.rpc('next_doc_number', { p_type: toType })
    if (n.error) {
      setBusy(false)
      setError(n.error.message)
      return
    }

    const isReceipt = toType === 'receipt'
    const s = src.data
    const ins = await supabase
      .from('documents')
      .insert({
        doc_type: toType,
        doc_number: n.data,
        customer_id: s.customer_id,
        status: isReceipt ? 'Paid' : 'Draft',
        issue_date: todayStr(),
        due_date: null,
        currency: s.currency,
        subtotal: s.subtotal,
        discount_amount: s.discount_amount,
        tax_rate: s.tax_rate,
        tax_amount: s.tax_amount,
        total: s.total,
        amount_paid: isReceipt ? s.total : 0,
        notes: s.notes,
        terms: s.terms,
        show_address: s.show_address,
        converted_from: id,
      })
      .select()
      .single()
    if (ins.error) {
      setBusy(false)
      setError(ins.error.message)
      return
    }

    const rows = (srcItems.data || []).map((x) => ({
      document_id: ins.data.id,
      position: x.position,
      service_id: x.service_id,
      description: x.description,
      quantity: x.quantity,
      unit_price: x.unit_price,
      line_total: x.line_total,
    }))
    if (rows.length > 0) {
      const r = await supabase.from('document_items').insert(rows)
      if (r.error) {
        setBusy(false)
        setError(r.error.message)
        return
      }
    }

    setBusy(false)
    navigate('/documents/' + ins.data.id)
  }

  if (loading) return <div>Loading...</div>

  if (!typeInfo) {
    return (
      <div>
        <style>{css}</style>
        <Link className="back-link" to="/documents"><ArrowLeft size={14} /> Back to documents</Link>
        {error ? <p className="error">{error}</p> : <p className="error">Unknown document type.</p>}
      </div>
    )
  }

  return (
    <div>
      <style>{css}</style>

      <Link className="back-link" to={'/documents?type=' + docType}><ArrowLeft size={14} /> Back to documents</Link>

      <PageHeader
        icon={FileText}
        title={typeInfo.label + ' ' + (doc.doc_number ? doc.doc_number : '(new)')}
        subtitle={id ? 'Edit this document' : 'Create a new ' + typeInfo.label.toLowerCase()}
      />

      {error && <p className="error">{error}</p>}
      {saved && <p className="ok-note">Saved.</p>}

      <form onSubmit={save}>
        <div className="split">
          <div>
            <Panel title="Customer and Dates" icon={Users}>
              <div className="form-grid">
                <div>
                  <label>Customer</label>
                  <Select
                    value={doc.customer_id}
                    onChange={(v) => setField('customer_id', v)}
                    placeholder="Select customer"
                    options={[{ value: '', label: 'No customer' }, ...customers.map((c) => ({ value: c.id, label: c.name }))]}
                  />
                  <label className="addr-opt">
                    <input
                      type="checkbox"
                      checked={doc.show_address}
                      onChange={(e) => setField('show_address', e.target.checked)}
                    />
                    Show my company address on the PDF
                  </label>
                </div>
                <div>
                  <label>Status</label>
                  <Select value={doc.status} onChange={(v) => setField('status', v)} options={STATUSES} />
                </div>
                <div>
                  <label>Date</label>
                  <DatePicker value={doc.issue_date} onChange={(v) => setField('issue_date', v)} />
                </div>
                <div>
                  <label>{dueLabel}</label>
                  <DatePicker value={doc.due_date} onChange={(v) => setField('due_date', v)} />
                </div>
              </div>
            </Panel>

            <div className="ed-gap" />

            <Panel title="Items" icon={ListChecks}>
              {items.map((it, i) => (
                <div className="item-card" key={it.key}>
                  <div className="item-top">
                    <span className="item-no">Item {i + 1}</span>
                    <button type="button" className="small icon-btn danger" title="Remove item" onClick={() => removeItem(it.key)}>
                      <Trash2 size={14} />
                    </button>
                  </div>
                  <div className="item-grid">
                    <div className="wide">
                      <ItemPicker services={services} onPick={(svc) => pickService(it.key, svc)} />
                    </div>
                    <div className="wide" style={{ marginTop: 10 }}>
                      <label>Description</label>
                      <textarea
                        rows="2"
                        value={it.description}
                        onChange={(e) => setItemField(it.key, 'description', e.target.value)}
                      />
                    </div>
                    <div>
                      <label>Quantity</label>
                      <input
                        type="number"
                        min="0"
                        step="any"
                        value={it.quantity}
                        onChange={(e) => setItemField(it.key, 'quantity', e.target.value)}
                      />
                    </div>
                    <div>
                      <label>Unit price (RM)</label>
                      <MoneyInput value={it.unit_price} onChange={(e) => setItemField(it.key, 'unit_price', e.target.value)} />
                    </div>
                    <div>
                      <label>Amount</label>
                      <div className="item-total">{money(lineTotal(it))}</div>
                    </div>
                  </div>
                </div>
              ))}
              <div className="detail-actions" style={{ marginTop: 12 }}>
                <button type="button" className="small ghost" onClick={addItem}>
                  <Plus size={15} /> Add Item
                </button>
              </div>
            </Panel>

            <div className="ed-gap" />

            <Panel title="Notes and Terms" icon={StickyNote}>
              <div className="form-grid">
                <div className="full">
                  <label>Notes (printed on the PDF)</label>
                  <BlockPicker blocks={library.filter((b) => b.kind === 'note')} value={doc.notes} onChange={(v) => setField('notes', v)} />
                  <textarea rows="3" value={doc.notes} onChange={(e) => setField('notes', e.target.value)} />
                </div>
                <div className="full">
                  <label>Terms and conditions (printed on the PDF)</label>
                  <BlockPicker blocks={library.filter((b) => b.kind === 'terms')} value={doc.terms} onChange={(v) => setField('terms', v)} />
                  <textarea rows="6" value={doc.terms} onChange={(e) => setField('terms', e.target.value)} />
                </div>
              </div>
            </Panel>
          </div>

          <div>
            <Panel title="Summary" icon={Receipt}>
              <div className="totals-inputs">
                <div>
                  <label>Discount (RM)</label>
                  <MoneyInput value={doc.discount_amount} onChange={(e) => setField('discount_amount', e.target.value)} />
                </div>
                <div>
                  <label>Tax (%)</label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={doc.tax_rate}
                    onChange={(e) => setField('tax_rate', e.target.value)}
                  />
                </div>
                {showPaid && (
                  <div>
                    <label>Amount paid (RM)</label>
                    <MoneyInput value={doc.amount_paid} onChange={(e) => setField('amount_paid', e.target.value)} />
                  </div>
                )}
              </div>

              <div style={{ marginTop: 14 }}>
                <div className="totals-row"><span>Subtotal</span><span>{money(subtotal)}</span></div>
                <div className="totals-row"><span>Discount</span><span>- {money(discount)}</span></div>
                {taxRate > 0 && (
                  <div className="totals-row"><span>Tax ({taxRate}%)</span><span>{money(taxAmount)}</span></div>
                )}
                <div className="totals-row big"><span>Total</span><span>{money(total)}</span></div>
                {showPaid && (
                  <>
                    <div className="totals-row"><span>Paid</span><span>{money(paid)}</span></div>
                    <div className="totals-row"><span>Balance due</span><span>{money(balance)}</span></div>
                  </>
                )}
              </div>

              <div className="side-btns">
                <button className="small" type="submit" disabled={saving}>
                  <Save size={15} /> {saving ? 'Saving...' : 'Save'}
                </button>

                {id && (
                  <>
                    <button className="small blue" type="button" onClick={downloadPdf} disabled={busy}>
                      <Download size={15} /> Download PDF
                    </button>
                    <button className="small green" type="button" onClick={sendWhatsApp} disabled={busy}>
                      <MessageCircle size={15} /> WhatsApp
                    </button>
                    <button className="small purple" type="button" onClick={sendEmail} disabled={busy}>
                      <Mail size={15} /> Email
                    </button>
                    {typeInfo.convertTo.map((t) => (
                      <button key={t} className="small ghost" type="button" onClick={() => convert(t)} disabled={busy}>
                        <ArrowRightLeft size={15} /> Convert to {docLabel(t)}
                      </button>
                    ))}
                  </>
                )}

                <button className="small ghost" type="button" onClick={() => navigate('/documents?type=' + docType)}>
                  Back
                </button>
              </div>

              {id && (
                <p className="hint">
                  Click Save before you download, send or convert, so the PDF and the new document use your latest changes.
                  For WhatsApp and Email, the PDF downloads first. Then attach it in the chat or email that opens.
                </p>
              )}
              {!id && <p className="hint">Click Save first. After saving, the Download, WhatsApp, Email and Convert buttons appear.</p>}
            </Panel>
          </div>
        </div>
      </form>
    </div>
  )
}