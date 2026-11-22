import { useEffect, useState } from 'react'
import MoneyInput from '../components/MoneyInput'
import { useNavigate } from 'react-router-dom'
import {
  Wrench, Layers, Code2, CheckCircle2, PauseCircle, Tag, Download, Pencil, Trash2, Search, Plus,
  FileText, Copy, Power, PieChart, AlertTriangle, ChevronLeft, ChevronRight,
} from 'lucide-react'
import { supabase } from '../supabaseClient'
import Select from '../components/Select'
import { useConfirm } from '../components/ConfirmDialog'
import { PageHeader, Stats, StatCard, Tabs, Panel } from '../components/ui'

const CATEGORIES = ['Software', 'IT Services']
const UNITS = ['job', 'hour', 'day', 'month', 'year', 'visit', 'item', 'unit']
const PAGE_SIZE = 15

const emptyForm = {
  name: '',
  category: 'Software',
  description: '',
  unit: 'job',
  price: '',
  active: true,
}

const css = `
.bars { display: grid; gap: 9px; }
.bar-row { display: grid; grid-template-columns: 110px 1fr 34px; gap: 10px; align-items: center; font-size: 12.5px; }
.bar-track { background: #17171b; border-radius: 8px; height: 10px; overflow: hidden; }
.bar-fill { height: 100%; border-radius: 8px; background: linear-gradient(90deg, #ff2028, #ff6a70); }
.bar-row b { text-align: right; }
.sub-line { color: var(--muted); font-size: 12px; max-width: 360px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.check-row { display: flex; align-items: center; gap: 10px; margin-top: 16px; }
.check-row label { margin: 0; }
.pager { display: flex; align-items: center; justify-content: space-between; gap: 10px; padding: 10px 12px; border-top: 1px solid var(--panel); font-size: 12.5px; color: var(--muted); flex-wrap: wrap; }
.pager-btns { display: flex; gap: 6px; align-items: center; }
.zero-note { display: flex; gap: 10px; align-items: flex-start; font-size: 13px; color: #ffcf8e; }
`

function money(n) {
  return 'RM ' + Number(n || 0).toLocaleString('en-MY', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

function exportCsv(list) {
  const cols = [
    ['Service', 'name'], ['Category', 'category'], ['Charged per', 'unit'], ['Price', 'price'],
    ['Active', 'active'], ['Description', 'description'],
  ]
  const esc = (v) => '"' + String(v ?? '').replace(/"/g, '""') + '"'
  const lines = [cols.map((c) => esc(c[0])).join(',')].concat(
    list.map((r) => cols.map((c) => esc(r[c[1]])).join(','))
  )
  const blob = new Blob(['\ufeff' + lines.join('\n')], { type: 'text/csv;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = 'services.csv'
  a.click()
  URL.revokeObjectURL(url)
}

export default function Services() {
  const navigate = useNavigate()
  const confirm = useConfirm()
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [form, setForm] = useState(null)
  const [saving, setSaving] = useState(false)
  const [tab, setTab] = useState('all')
  const [statusFilter, setStatusFilter] = useState('')
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(0)
  const [selectedId, setSelectedId] = useState(null)

  async function load() {
    setLoading(true)
    const { data, error } = await supabase
      .from('services')
      .select('*')
      .order('category', { ascending: false })
      .order('name')
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
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  function formFrom(row) {
    return {
      name: row.name || '',
      category: row.category || 'Software',
      description: row.description || '',
      unit: row.unit || 'job',
      price: row.price === null || row.price === undefined ? '' : String(row.price),
      active: !!row.active,
    }
  }

  function startEdit(row) {
    setForm({ id: row.id, ...formFrom(row) })
    setError('')
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  function startDuplicate(row) {
    const f = formFrom(row)
    setForm({ ...f, name: f.name + ' (copy)' })
    setError('')
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  async function save(e) {
    e.preventDefault()
    if (!form.name.trim()) {
      setError('Name is required.')
      return
    }
    const price = form.price === '' ? 0 : Number(form.price)
    if (Number.isNaN(price) || price < 0) {
      setError('Price must be a number, 0 or more.')
      return
    }
    setSaving(true)
    setError('')

    const payload = {
      name: form.name.trim(),
      category: form.category,
      description: form.description.trim() || null,
      unit: form.unit,
      price,
      active: form.active,
    }

    let result
    if (form.id) {
      result = await supabase.from('services').update(payload).eq('id', form.id)
    } else {
      result = await supabase.from('services').insert(payload)
    }

    setSaving(false)
    if (result.error) {
      setError(result.error.message)
      return
    }
    setForm(null)
    load()
  }

  async function toggleActive(row) {
    const { error } = await supabase.from('services').update({ active: !row.active }).eq('id', row.id)
    if (error) {
      setError(error.message)
      return
    }
    load()
  }

  async function remove(row) {
    if (!(await confirm('Delete service "' + row.name + '"?'))) return
    const { error } = await supabase.from('services').delete().eq('id', row.id)
    if (error) {
      setError(
        'Cannot delete this service. If it is already used in a document, switch it to Inactive instead. (' +
          error.message +
          ')'
      )
      return
    }
    if (selectedId === row.id) setSelectedId(null)
    load()
  }

  const countCat = (c) => rows.filter((r) => r.category === c).length
  const activeCount = rows.filter((r) => r.active).length
  const inactiveCount = rows.length - activeCount
  const priced = rows.filter((r) => Number(r.price) > 0)
  const avgPrice = priced.length ? priced.reduce((s, r) => s + Number(r.price), 0) / priced.length : 0
  const zeroCount = rows.filter((r) => Number(r.price) === 0 && r.active).length

  const q = search.trim().toLowerCase()
  const shown = rows.filter((r) => {
    if (tab !== 'all' && r.category !== tab) return false
    if (statusFilter === 'active' && !r.active) return false
    if (statusFilter === 'inactive' && r.active) return false
    if (!q) return true
    return [r.name, r.description, r.category].filter(Boolean).some((v) => String(v).toLowerCase().includes(q))
  })

  const pages = Math.max(1, Math.ceil(shown.length / PAGE_SIZE))
  const pageSafe = Math.min(page, pages - 1)
  const pageRows = shown.slice(pageSafe * PAGE_SIZE, pageSafe * PAGE_SIZE + PAGE_SIZE)
  const selected = rows.find((r) => r.id === selectedId) || shown[0] || null
  const maxCat = Math.max(1, ...CATEGORIES.map(countCat))

  return (
    <div>
      <style>{css}</style>

      <PageHeader
        icon={Wrench}
        title="Services (Service Catalogue)"
        subtitle="Manage your service offerings, prices and descriptions"
      >
        <button className="small icon-btn" onClick={startAdd}>
          <Plus size={15} /> New Service
        </button>
        <button className="small blue icon-btn" onClick={() => exportCsv(shown)}>
          <Download size={15} /> Export
        </button>
      </PageHeader>

      {error && <p className="error">{error}</p>}

      {form && (
        <form className="form-card" onSubmit={save}>
          <h2>{form.id ? 'Edit service' : 'New service'}</h2>
          <div className="form-grid">
            <div className="full">
              <label>Name *</label>
              <input value={form.name} onChange={(e) => setField('name', e.target.value)} />
            </div>
            <div>
              <label>Category</label>
              <Select value={form.category} onChange={(v) => setField('category', v)} options={CATEGORIES} />
            </div>
            <div>
              <label>Charged per</label>
              <Select value={form.unit} onChange={(v) => setField('unit', v)} options={UNITS} />
            </div>
            <div>
              <label>Price (RM)</label>
              <MoneyInput value={form.price} onChange={(e) => setField('price', e.target.value)} />
            </div>
            <div className="full">
              <label>Description (shown on quotations)</label>
              <textarea rows="3" value={form.description} onChange={(e) => setField('description', e.target.value)} />
            </div>
          </div>
          <div className="check-row">
            <input
              id="svc_active"
              type="checkbox"
              checked={form.active}
              onChange={(e) => setField('active', e.target.checked)}
            />
            <label htmlFor="svc_active">Active (can be used in quotations and invoices)</label>
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
        <StatCard color="blue" icon={Wrench} label="Total Services" value={rows.length} />
        <StatCard color="purple" icon={Code2} label="Software" value={countCat('Software')} />
        <StatCard color="orange" icon={Layers} label="IT Services" value={countCat('IT Services')} />
        <StatCard color="green" icon={CheckCircle2} label="Active" value={activeCount} />
        <StatCard color="red" icon={PauseCircle} label="Inactive" value={inactiveCount} />
        <StatCard color="blue" icon={Tag} label="Average Price" value={money(avgPrice)} />
      </Stats>

      <div className="split">
        <div>
          <Tabs
            value={tab}
            onChange={(v) => {
              setTab(v)
              setPage(0)
            }}
            tabs={[
              { key: 'all', label: 'All Services', count: rows.length },
              { key: 'Software', label: 'Software', count: countCat('Software') },
              { key: 'IT Services', label: 'IT Services', count: countCat('IT Services') },
            ]}
          />

          <div className="filter-row">
            <Select
              value={statusFilter}
              onChange={(v) => {
                setStatusFilter(v)
                setPage(0)
              }}
              options={[
                { value: '', label: 'All Status' },
                { value: 'active', label: 'Active' },
                { value: 'inactive', label: 'Inactive' },
              ]}
            />
            <div className="search-row" style={{ margin: 0 }}>
              <Search size={15} />
              <input
                placeholder="Search service (name, description)"
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value)
                  setPage(0)
                }}
              />
            </div>
          </div>

          <div className="table-wrap">
            {loading ? (
              <div className="empty-note">Loading...</div>
            ) : shown.length === 0 ? (
              <div className="empty-note">
                {rows.length === 0 ? 'No services yet. Click "+ New Service".' : 'No services match your filters.'}
              </div>
            ) : (
              <>
                <table className="data">
                  <thead>
                    <tr>
                      <th>#</th>
                      <th>Service Name</th>
                      <th>Category</th>
                      <th>Per</th>
                      <th className="num">Price</th>
                      <th>Status</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pageRows.map((r, i) => (
                      <tr
                        key={r.id}
                        className={selected && selected.id === r.id ? 'sel' : ''}
                        onClick={() => setSelectedId(r.id)}
                      >
                        <td>{pageSafe * PAGE_SIZE + i + 1}</td>
                        <td>
                          <strong>{r.name}</strong>
                          {r.description && <div className="sub-line">{r.description}</div>}
                        </td>
                        <td>
                          <span className={'pill ' + (r.category === 'Software' ? 'purple' : 'blue')}>{r.category}</span>
                        </td>
                        <td>{r.unit || '-'}</td>
                        <td className="num">{money(r.price)}</td>
                        <td>
                          <span className={'pill ' + (r.active ? 'green' : 'grey')}>{r.active ? 'Active' : 'Inactive'}</span>
                        </td>
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
                <div className="pager">
                  <span>
                    Showing {pageSafe * PAGE_SIZE + 1} - {Math.min((pageSafe + 1) * PAGE_SIZE, shown.length)} of{' '}
                    {shown.length} services
                  </span>
                  <div className="pager-btns">
                    <button className="icon" disabled={pageSafe === 0} onClick={() => setPage(pageSafe - 1)}>
                      <ChevronLeft size={15} />
                    </button>
                    <span>
                      Page {pageSafe + 1} of {pages}
                    </span>
                    <button className="icon" disabled={pageSafe >= pages - 1} onClick={() => setPage(pageSafe + 1)}>
                      <ChevronRight size={15} />
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>

        <Panel title="Service Details" icon={Wrench}>
          {!selected ? (
            <div className="empty-note">Select a service from the list.</div>
          ) : (
            <div>
              <div className="detail-title">
                <h4>{selected.name}</h4>
                <span className={'pill ' + (selected.active ? 'green' : 'grey')}>
                  {selected.active ? 'Active' : 'Inactive'}
                </span>
              </div>
              <dl className="kv">
                <dt>Category</dt>
                <dd>{selected.category}</dd>
                <dt>Charged per</dt>
                <dd>{selected.unit || '-'}</dd>
                <dt>Price</dt>
                <dd>{money(selected.price)}</dd>
                <dt>Description</dt>
                <dd>{selected.description || '-'}</dd>
              </dl>
              <div className="detail-actions">
                <button className="small green icon-btn" onClick={() => navigate('/documents/new/quote')}>
                  <FileText size={15} /> Create Quotation
                </button>
                <button className="small blue icon-btn" onClick={() => startEdit(selected)}>
                  <Pencil size={15} /> Edit
                </button>
                <button className="small purple icon-btn" onClick={() => startDuplicate(selected)}>
                  <Copy size={15} /> Duplicate
                </button>
                <button className="small ghost icon-btn" onClick={() => toggleActive(selected)}>
                  <Power size={15} /> {selected.active ? 'Deactivate' : 'Activate'}
                </button>
              </div>
            </div>
          )}
        </Panel>
      </div>

      <div className="cols-2">
        <Panel title="Service Categories" icon={PieChart}>
          <div className="bars">
            {CATEGORIES.map((c) => (
              <div className="bar-row" key={c}>
                <span>{c}</span>
                <div className="bar-track">
                  <div className="bar-fill" style={{ width: (countCat(c) / maxCat) * 100 + '%' }} />
                </div>
                <b>{countCat(c)}</b>
              </div>
            ))}
          </div>
        </Panel>

        <Panel title="Prices to Set" icon={AlertTriangle}>
          {zeroCount === 0 ? (
            <div className="empty-note">All active services have a price.</div>
          ) : (
            <div className="zero-note">
              <span>
                {zeroCount} active service{zeroCount > 1 ? 's are' : ' is'} still at RM 0.00. Select a service and click
                Edit to set the real price.
              </span>
            </div>
          )}
        </Panel>
      </div>
    </div>
  )
}