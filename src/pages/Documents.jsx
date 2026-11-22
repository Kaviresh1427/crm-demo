import { useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import {
  FileText, Plus, Eye, Trash2, Search, MessageCircle, Mail, PieChart, Clock3,
  ChevronLeft, ChevronRight,
} from 'lucide-react'
import { supabase } from '../supabaseClient'
import Select from '../components/Select'
import { useConfirm } from '../components/ConfirmDialog'
import { PageHeader, Stats, StatCard, Tabs, Panel } from '../components/ui'
import { DOC_TYPES, STATUSES, docLabel } from '../docSettings'
import Statement from './Statement'

const PAGE_SIZE = 15
const STATUS_COLOR = {
  Draft: 'grey', Sent: 'blue', Accepted: 'green', Paid: 'green', Overdue: 'red', Cancelled: 'grey',
}
const CARD_COLORS = ['blue', 'purple', 'orange', 'green', 'red', 'blue', 'purple']
const TYPE_KEYS = Object.keys(DOC_TYPES)

const css = `
.bars { display: grid; gap: 9px; }
.bar-row { display: grid; grid-template-columns: 120px 1fr 100px; gap: 10px; align-items: center; font-size: 12.5px; }
.bar-track { background: #17171b; border-radius: 8px; height: 10px; overflow: hidden; }
.bar-fill { height: 100%; border-radius: 8px; background: linear-gradient(90deg, #ff2028, #ff6a70); }
.bar-row b { text-align: right; }
.pager { display: flex; align-items: center; justify-content: space-between; gap: 10px; padding: 10px 12px; border-top: 1px solid var(--panel); font-size: 12.5px; color: var(--muted); flex-wrap: wrap; }
.pager-btns { display: flex; gap: 6px; align-items: center; }
.new-doc { display: flex; gap: 8px; align-items: center; flex-wrap: wrap; max-width: 100%; }
.new-doc .sel { width: 190px; max-width: 100%; }
@media (max-width: 640px) { .new-doc { width: 100%; } .new-doc .sel { flex: 1 1 160px; width: auto; } }
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

function daysBetween(fromIso, toIso) {
  const a = new Date(String(fromIso).slice(0, 10))
  const b = new Date(String(toIso).slice(0, 10))
  return Math.round((b - a) / 86400000)
}

export default function Documents() {
  const navigate = useNavigate()
  const confirm = useConfirm()
  const [params, setParams] = useSearchParams()
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [page, setPage] = useState(0)
  const [selectedId, setSelectedId] = useState(null)
  const [newType, setNewType] = useState('quote')

  const tab = params.get('type') || 'all'

  function setTab(key) {
    setPage(0)
    if (key === 'all') setParams({})
    else setParams({ type: key })
  }

  async function load() {
    setLoading(true)
    const { data, error } = await supabase
      .from('documents')
      .select('*, customers(name, phone, email)')
      .order('created_at', { ascending: false })
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

  async function remove(row) {
    if (!(await confirm('Delete ' + docLabel(row.doc_type) + ' ' + row.doc_number + '?'))) return
    const items = await supabase.from('document_items').delete().eq('document_id', row.id)
    if (items.error) {
      setError(items.error.message)
      return
    }
    const { error } = await supabase.from('documents').delete().eq('id', row.id)
    if (error) {
      setError(error.message)
      return
    }
    if (selectedId === row.id) setSelectedId(null)
    load()
  }

  const countType = (t) => rows.filter((r) => r.doc_type === t).length
  const typeOptions = TYPE_KEYS.map((k) => ({ value: k, label: DOC_TYPES[k].label }))

  const q = search.trim().toLowerCase()
  const shown = rows.filter((r) => {
    if (tab !== 'all' && r.doc_type !== tab) return false
    if (statusFilter && r.status !== statusFilter) return false
    if (!q) return true
    const customer = r.customers ? r.customers.name : ''
    return [r.doc_number, customer].filter(Boolean).some((v) => String(v).toLowerCase().includes(q))
  })

  const pages = Math.max(1, Math.ceil(shown.length / PAGE_SIZE))
  const pageSafe = Math.min(page, pages - 1)
  const pageRows = shown.slice(pageSafe * PAGE_SIZE, pageSafe * PAGE_SIZE + PAGE_SIZE)
  const selected = rows.find((r) => r.id === selectedId) || shown[0] || null

  // Unpaid invoices grouped by how late they are
  const today = new Date().toISOString().slice(0, 10)
  const aging = [
    { label: 'Current', amount: 0 },
    { label: '1 - 30 days late', amount: 0 },
    { label: '31 - 60 days late', amount: 0 },
    { label: 'Over 60 days', amount: 0 },
  ]
  rows.forEach((r) => {
    if (r.doc_type !== 'invoice' || r.status === 'Cancelled') return
    const owing = Number(r.total || 0) - Number(r.amount_paid || 0)
    if (owing <= 0) return
    const late = daysBetween(r.due_date || r.issue_date, today)
    const i = late <= 0 ? 0 : late <= 30 ? 1 : late <= 60 ? 2 : 3
    aging[i].amount += owing
  })
  const agingTotal = aging.reduce((s, a) => s + a.amount, 0)
  const maxAging = Math.max(1, ...aging.map((a) => a.amount))
  const maxType = Math.max(1, ...TYPE_KEYS.map(countType))

  const isStatement = tab === 'statement'

  return (
    <div>
      <style>{css}</style>

      <PageHeader
        icon={FileText}
        title="Documents Management"
        subtitle="Create, manage and track all business documents"
      >
        <div className="new-doc">
          <Select value={newType} onChange={setNewType} options={typeOptions} />
          <button className="small icon-btn" onClick={() => navigate('/documents/new/' + newType)}>
            <Plus size={15} /> New Document
          </button>
        </div>
      </PageHeader>

      {error && <p className="error">{error}</p>}

      <Stats>
        {TYPE_KEYS.map((t, i) => (
          <StatCard
            key={t}
            color={CARD_COLORS[i % CARD_COLORS.length]}
            icon={FileText}
            label={DOC_TYPES[t].label + 's'}
            value={countType(t)}
          />
        ))}
      </Stats>

      <Tabs
        value={tab}
        onChange={setTab}
        tabs={[
          { key: 'all', label: 'All Documents', count: rows.length },
          ...TYPE_KEYS.map((t) => ({ key: t, label: DOC_TYPES[t].label, count: countType(t) })),
        ]}
      />

      {isStatement ? (
        <Statement rows={rows} />
      ) : (
        <div className="split">
          <div>
            <div className="filter-row">
              <Select
                value={statusFilter}
                onChange={(v) => {
                  setStatusFilter(v)
                  setPage(0)
                }}
                options={[{ value: '', label: 'All Status' }, ...STATUSES]}
              />
              <div className="search-row" style={{ margin: 0 }}>
                <Search size={15} />
                <input
                  placeholder="Search document (number, customer)"
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
                  {rows.length === 0
                    ? 'No documents yet. Choose a type at the top and click "New Document".'
                    : 'No documents match.'}
                </div>
              ) : (
                <>
                  <table className="data">
                    <thead>
                      <tr>
                        <th>#</th>
                        <th>Document No.</th>
                        <th>Type</th>
                        <th>Customer</th>
                        <th>Date</th>
                        <th className="num">Amount</th>
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
                          <td><strong>{r.doc_number}</strong></td>
                          <td>{docLabel(r.doc_type)}</td>
                          <td>{r.customers ? r.customers.name : '-'}</td>
                          <td>{showDate(r.issue_date)}</td>
                          <td className="num">{money(r.total)}</td>
                          <td>
                            <span className={'pill ' + (STATUS_COLOR[r.status] || 'grey')}>{r.status}</span>
                          </td>
                          <td onClick={(e) => e.stopPropagation()}>
                            <div className="row-actions">
                              <button className="icon" title="Open" onClick={() => navigate('/documents/' + r.id)}>
                                <Eye size={14} />
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
                      {shown.length} documents
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

          <Panel title="Document Details" icon={FileText}>
            {!selected ? (
              <div className="empty-note">Select a document from the list.</div>
            ) : (
              <div>
                <div className="detail-title">
                  <h4>{selected.doc_number}</h4>
                  <span className={'pill ' + (STATUS_COLOR[selected.status] || 'grey')}>{selected.status}</span>
                </div>
                <dl className="kv">
                  <dt>Type</dt>
                  <dd>{docLabel(selected.doc_type)}</dd>
                  <dt>Customer</dt>
                  <dd>{selected.customers ? selected.customers.name : '-'}</dd>
                  <dt>Issue Date</dt>
                  <dd>{showDate(selected.issue_date)}</dd>
                  <dt>Due / Valid Until</dt>
                  <dd>{showDate(selected.due_date)}</dd>
                  <dt>Total</dt>
                  <dd>{money(selected.total)}</dd>
                  {['invoice', 'proforma', 'receipt'].includes(selected.doc_type) && (
                    <>
                      <dt>Paid</dt>
                      <dd>{money(selected.amount_paid)}</dd>
                      <dt>Balance</dt>
                      <dd>{money(Number(selected.total || 0) - Number(selected.amount_paid || 0))}</dd>
                    </>
                  )}
                </dl>
                <div className="detail-actions">
                  <button className="small purple icon-btn" onClick={() => navigate('/documents/' + selected.id)}>
                    <Eye size={15} /> Open / PDF
                  </button>
                  <button
                    className="small green icon-btn"
                    disabled={!selected.customers || !waNumber(selected.customers.phone)}
                    onClick={() => window.open('https://wa.me/' + waNumber(selected.customers.phone), '_blank')}
                  >
                    <MessageCircle size={15} /> WhatsApp
                  </button>
                  <button
                    className="small blue icon-btn"
                    disabled={!selected.customers || !selected.customers.email}
                    onClick={() => (window.location.href = 'mailto:' + selected.customers.email)}
                  >
                    <Mail size={15} /> Send Email
                  </button>
                </div>
              </div>
            )}
          </Panel>
        </div>
      )}

      <div className="cols-2">
        <Panel title="Document Summary" icon={PieChart}>
          <div className="bars">
            {TYPE_KEYS.map((t) => (
              <div className="bar-row" key={t}>
                <span>{DOC_TYPES[t].label}</span>
                <div className="bar-track">
                  <div className="bar-fill" style={{ width: (countType(t) / maxType) * 100 + '%' }} />
                </div>
                <b>{countType(t)}</b>
              </div>
            ))}
          </div>
        </Panel>

        <Panel title={'Receivable Aging - ' + money(agingTotal)} icon={Clock3}>
          <div className="bars">
            {aging.map((a) => (
              <div className="bar-row" key={a.label}>
                <span>{a.label}</span>
                <div className="bar-track">
                  <div className="bar-fill" style={{ width: (a.amount / maxAging) * 100 + '%' }} />
                </div>
                <b>{money(a.amount)}</b>
              </div>
            ))}
          </div>
        </Panel>
      </div>
    </div>
  )
}