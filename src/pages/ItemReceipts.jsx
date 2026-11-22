import { useEffect, useState } from 'react'
import AddressToggle from '../components/AddressToggle'
import MoneyInput from '../components/MoneyInput'
import { PackageOpen, Plus, Pencil, Trash2, Search, Download, Wrench, CheckCircle2, Inbox, FileDown, Plus as PlusIcon } from 'lucide-react'
import { supabase } from '../supabaseClient'
import Select from '../components/Select'
import { useConfirm } from '../components/ConfirmDialog'
import { PageHeader, Stats, StatCard } from '../components/ui'
import { downloadItemReceiptPdf } from '../itemReceiptPdf'

const STATUSES = ['Received', 'In Progress', 'Ready', 'Collected', 'Cancelled']
const DEVICE_TYPES = ['Laptop', 'Desktop PC', 'MacBook', 'iMac / Mac mini', 'Printer', 'Monitor', 'Other']

const STATUS_COLOR = {
  Received: '#3b82f6',
  'In Progress': '#f59e0b',
  Ready: '#22c55e',
  Collected: '#8a8a93',
  Cancelled: '#ef4444',
}

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

const emptyDevice = () => ({
  device_type: 'Laptop',
  brand: '',
  model: '',
  serial_no: '',
  accessories: '',
  notes: '',
})

const emptyForm = () => ({
  customer_id: '',
  received_date: today(),
  contact_name: '',
  contact_phone: '',
  problem_description: '',
  condition_notes: '',
  estimated_cost: '',
  status: 'Received',
  devices: [emptyDevice()],
})

function exportCsv(list) {
  const cols = [
    ['Job No', 'job_no'], ['Date', 'received_date'], ['Customer', 'customer_name'],
    ['Devices', 'device_text'], ['Problem', 'problem_description'], ['Status', 'status'],
  ]
  const esc = (v) => '"' + String(v ?? '').replace(/"/g, '""') + '"'
  const lines = [cols.map((c) => esc(c[0])).join(',')].concat(
    list.map((r) => cols.map((c) => esc(r[c[1]])).join(','))
  )
  const blob = new Blob(['\ufeff' + lines.join('\n')], { type: 'text/csv;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = 'item-receipts.csv'
  a.click()
  URL.revokeObjectURL(url)
}

export default function ItemReceipts() {
  const confirm = useConfirm()
  const [rows, setRows] = useState([])
  const [itemsMap, setItemsMap] = useState({})
  const [customers, setCustomers] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [form, setForm] = useState(null)
  const [saving, setSaving] = useState(false)

  async function load() {
    setLoading(true)
    const [r, i, c] = await Promise.all([
      supabase.from('item_receipts').select('*').order('created_at', { ascending: false }),
      supabase.from('item_receipt_items').select('*').order('position'),
      supabase.from('customers').select('id, name, phone').order('name'),
    ])
    const err = r.error || i.error || c.error
    if (err) {
      setError(err.message)
    } else {
      setError('')
      const map = {}
      ;(i.data || []).forEach((it) => {
        if (!map[it.receipt_id]) map[it.receipt_id] = []
        map[it.receipt_id].push(it)
      })
      setRows(r.data || [])
      setItemsMap(map)
      setCustomers(c.data || [])
    }
    setLoading(false)
  }

  useEffect(() => {
    load()
  }, [])

  const customerOf = (id) => customers.find((x) => x.id === id)
  const customerName = (id) => (customerOf(id) ? customerOf(id).name : '')

  function setField(key, value) {
    setForm((f) => ({ ...f, [key]: value }))
  }

  function pickCustomer(id) {
    const c = customerOf(id)
    setForm((f) => ({
      ...f,
      customer_id: id,
      contact_name: f.contact_name || (c ? c.name : ''),
      contact_phone: f.contact_phone || (c && c.phone ? c.phone : ''),
    }))
  }

  function setDevice(idx, key, value) {
    setForm((f) => ({
      ...f,
      devices: f.devices.map((d, n) => (n === idx ? { ...d, [key]: value } : d)),
    }))
  }

  function addDevice() {
    setForm((f) => ({ ...f, devices: [...f.devices, emptyDevice()] }))
  }

  function removeDevice(idx) {
    setForm((f) => ({
      ...f,
      devices: f.devices.length > 1 ? f.devices.filter((d, n) => n !== idx) : f.devices,
    }))
  }

  function startAdd() {
    setForm(emptyForm())
    setError('')
  }

  function startEdit(row) {
    const devs = (itemsMap[row.id] || []).map((d) => ({
      device_type: d.device_type || 'Other',
      brand: d.brand || '',
      model: d.model || '',
      serial_no: d.serial_no || '',
      accessories: d.accessories || '',
      notes: d.notes || '',
    }))
    setForm({
      id: row.id,
      job_no: row.job_no,
      customer_id: row.customer_id || '',
      received_date: String(row.received_date).slice(0, 10),
      contact_name: row.contact_name || '',
      contact_phone: row.contact_phone || '',
      problem_description: row.problem_description || '',
      condition_notes: row.condition_notes || '',
      estimated_cost: row.estimated_cost ? String(row.estimated_cost) : '',
      status: row.status,
      devices: devs.length ? devs : [emptyDevice()],
    })
    setError('')
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  async function save(e) {
    e.preventDefault()
    if (!form.customer_id) {
      setError('Please choose a customer.')
      return
    }
    const devices = form.devices.filter((d) => d.brand.trim() || d.model.trim() || d.serial_no.trim())
    if (devices.length === 0) {
      setError('Add at least one device (brand, model or serial number).')
      return
    }
    const cost = form.estimated_cost === '' ? 0 : Number(form.estimated_cost)
    if (Number.isNaN(cost) || cost < 0) {
      setError('Estimated cost must be a number.')
      return
    }
    setSaving(true)
    setError('')
    const payload = {
      customer_id: form.customer_id,
      received_date: form.received_date || today(),
      contact_name: form.contact_name.trim() || null,
      contact_phone: form.contact_phone.trim() || null,
      problem_description: form.problem_description.trim() || null,
      condition_notes: form.condition_notes.trim() || null,
      estimated_cost: Math.round(cost * 100) / 100,
      status: form.status,
    }

    let receiptId = form.id
    if (form.id) {
      const u = await supabase
        .from('item_receipts')
        .update({ ...payload, updated_at: new Date().toISOString() })
        .eq('id', form.id)
      if (u.error) {
        setSaving(false)
        setError(u.error.message)
        return
      }
      const del = await supabase.from('item_receipt_items').delete().eq('receipt_id', form.id)
      if (del.error) {
        setSaving(false)
        setError(del.error.message)
        return
      }
    } else {
      const num = await supabase.rpc('next_job_no')
      if (num.error) {
        setSaving(false)
        setError(num.error.message)
        return
      }
      const ins = await supabase
        .from('item_receipts')
        .insert({ ...payload, job_no: num.data })
        .select()
        .single()
      if (ins.error) {
        setSaving(false)
        setError(ins.error.message)
        return
      }
      receiptId = ins.data.id
    }

    const itemRows = devices.map((d, n) => ({
      receipt_id: receiptId,
      position: n + 1,
      device_type: d.device_type,
      brand: d.brand.trim() || null,
      model: d.model.trim() || null,
      serial_no: d.serial_no.trim() || null,
      accessories: d.accessories.trim() || null,
      notes: d.notes.trim() || null,
    }))
    const it = await supabase.from('item_receipt_items').insert(itemRows)
    setSaving(false)
    if (it.error) {
      setError(it.error.message)
      return
    }
    setForm(null)
    load()
  }

  async function remove(row) {
    if (!(await confirm('Delete job ' + row.job_no + '?'))) return
    const { error } = await supabase.from('item_receipts').delete().eq('id', row.id)
    if (error) {
      setError(error.message)
      return
    }
    load()
  }

  async function printPdf(row) {
    setError('')
    const { data: customer } = await supabase.from('customers').select('*').eq('id', row.customer_id).single()
    try {
      await downloadItemReceiptPdf({
        job_no: row.job_no,
        received_date: row.received_date,
        customer: customer || null,
        contact_name: row.contact_name,
        contact_phone: row.contact_phone,
        devices: itemsMap[row.id] || [],
        problem_description: row.problem_description,
        condition_notes: row.condition_notes,
        estimated_cost: row.estimated_cost,
      })
    } catch (err) {
      setError('Could not create the PDF: ' + err.message)
    }
  }

  const q = search.trim().toLowerCase()
  const withInfo = rows.map((r) => {
    const devs = itemsMap[r.id] || []
    return {
      ...r,
      customer_name: customerName(r.customer_id),
      device_text: devs.map((d) => [d.brand, d.model].filter(Boolean).join(' ') || d.device_type).join('; '),
      serials: devs.map((d) => d.serial_no).filter(Boolean).join(' '),
    }
  })
  const shown = withInfo.filter((r) => {
    if (statusFilter && r.status !== statusFilter) return false
    if (!q) return true
    return [r.job_no, r.customer_name, r.device_text, r.serials, r.problem_description]
      .filter(Boolean)
      .some((v) => String(v).toLowerCase().includes(q))
  })

  const countOf = (s) => rows.filter((r) => r.status === s).length

  return (
    <div>
      <PageHeader icon={PackageOpen} title="Item Receipt Letter" subtitle="Record devices customers leave with us for service">
        <AddressToggle />
        <button className="small icon-btn" onClick={startAdd}>
          <Plus size={15} /> New Item Receipt
        </button>
        <button className="small blue icon-btn" onClick={() => exportCsv(shown)}>
          <Download size={15} /> Export
        </button>
      </PageHeader>

      {error && <p className="error">{error}</p>}

      {form && (
        <form className="form-card" onSubmit={save}>
          <h2>{form.id ? 'Edit job ' + form.job_no : 'New item receipt'}</h2>
          <div className="form-grid">
            <div>
              <label>Customer *</label>
              <Select
                value={form.customer_id}
                onChange={pickCustomer}
                options={[{ value: '', label: 'Choose a customer' }, ...customers.map((c) => ({ value: c.id, label: c.name }))]}
              />
            </div>
            <div>
              <label>Date received</label>
              <input type="date" value={form.received_date} onChange={(e) => setField('received_date', e.target.value)} />
            </div>
            <div>
              <label>Contact name</label>
              <input value={form.contact_name} onChange={(e) => setField('contact_name', e.target.value)} />
            </div>
            <div>
              <label>Contact phone</label>
              <input value={form.contact_phone} onChange={(e) => setField('contact_phone', e.target.value)} />
            </div>
            <div className="full">
              <label>Problem reported by customer</label>
              <textarea
                rows="3"
                value={form.problem_description}
                onChange={(e) => setField('problem_description', e.target.value)}
              />
            </div>
            <div className="full">
              <label>Condition when received (scratches, dents, missing parts...)</label>
              <textarea rows="2" value={form.condition_notes} onChange={(e) => setField('condition_notes', e.target.value)} />
            </div>
            <div>
              <label>Estimated cost (RM)</label>
              <MoneyInput value={form.estimated_cost} onChange={(e) => setField('estimated_cost', e.target.value)} />
            </div>
            <div>
              <label>Status</label>
              <Select value={form.status} onChange={(v) => setField('status', v)} options={STATUSES} />
            </div>
          </div>

          <h3 style={{ margin: '18px 0 8px', fontSize: 14 }}>Devices</h3>
          <p style={{ fontSize: 12, opacity: 0.7, margin: '0 0 10px' }}>
            Do not write the customer's password here.
          </p>
          {form.devices.map((d, idx) => (
            <div
              key={idx}
              style={{ border: '1px solid #2a2a30', borderRadius: 10, padding: 12, marginBottom: 10 }}
            >
              <div className="form-grid">
                <div>
                  <label>Device type</label>
                  <Select value={d.device_type} onChange={(v) => setDevice(idx, 'device_type', v)} options={DEVICE_TYPES} />
                </div>
                <div>
                  <label>Brand</label>
                  <input value={d.brand} onChange={(e) => setDevice(idx, 'brand', e.target.value)} />
                </div>
                <div>
                  <label>Model</label>
                  <input value={d.model} onChange={(e) => setDevice(idx, 'model', e.target.value)} />
                </div>
                <div>
                  <label>Serial number</label>
                  <input value={d.serial_no} onChange={(e) => setDevice(idx, 'serial_no', e.target.value)} />
                </div>
                <div className="full">
                  <label>Accessories left (charger, bag, mouse...)</label>
                  <input value={d.accessories} onChange={(e) => setDevice(idx, 'accessories', e.target.value)} />
                </div>
              </div>
              {form.devices.length > 1 && (
                <button type="button" className="small ghost" style={{ marginTop: 8 }} onClick={() => removeDevice(idx)}>
                  Remove this device
                </button>
              )}
            </div>
          ))}
          <button type="button" className="small ghost icon-btn" onClick={addDevice}>
            <PlusIcon size={14} /> Add another device
          </button>

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
        <StatCard color="blue" icon={Inbox} label="Received" value={countOf('Received')} />
        <StatCard color="orange" icon={Wrench} label="In Progress" value={countOf('In Progress')} />
        <StatCard color="green" icon={CheckCircle2} label="Ready to Collect" value={countOf('Ready')} />
        <StatCard color="purple" icon={PackageOpen} label="All Jobs" value={rows.length} />
      </Stats>

      <div className="filter-row">
        <Select
          value={statusFilter}
          onChange={setStatusFilter}
          options={[{ value: '', label: 'All Status' }, ...STATUSES]}
        />
        <div className="search-row" style={{ margin: 0 }}>
          <Search size={15} />
          <input
            placeholder="Search job (number, customer, device, serial)"
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
            {rows.length === 0 ? 'No item receipts yet. Click "+ New Item Receipt".' : 'No jobs match.'}
          </div>
        ) : (
          <table className="data">
            <thead>
              <tr>
                <th>Job No.</th>
                <th>Date</th>
                <th>Customer</th>
                <th>Device</th>
                <th className="num">Estimate</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {shown.map((r) => (
                <tr key={r.id} style={{ cursor: 'default' }}>
                  <td><strong>{r.job_no}</strong></td>
                  <td>{showDate(r.received_date)}</td>
                  <td>{r.customer_name || '-'}</td>
                  <td>{r.device_text || '-'}</td>
                  <td className="num">{Number(r.estimated_cost) > 0 ? money(r.estimated_cost) : '-'}</td>
                  <td>
                    <span style={{ color: STATUS_COLOR[r.status], fontWeight: 600 }}>{r.status}</span>
                  </td>
                  <td>
                    <div className="row-actions">
                      <button className="icon" title="Download PDF" onClick={() => printPdf(r)}>
                        <FileDown size={14} />
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
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}