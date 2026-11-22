import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  LayoutDashboard, Users, Target, FileText, Wallet, TrendingUp, UserPlus, Zap, Filter, BarChart3,
  CalendarClock, Clock3,
} from 'lucide-react'
import { supabase } from '../supabaseClient'
import { PageHeader, Stats, StatCard, Panel } from '../components/ui'
import { docLabel } from '../docSettings'

const STAGES = ['New', 'Contacted', 'Meeting', 'Proposal Sent', 'Won', 'Lost']
const MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
const STATUS_COLOR = {
  Draft: 'grey', Sent: 'blue', Accepted: 'green', Paid: 'green', Overdue: 'red', Cancelled: 'grey',
}


// Live clock: day, date and time with running seconds
function LiveClock() {
  const [now, setNow] = useState(new Date())
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000)
    return () => clearInterval(t)
  }, [])
  const day = now.toLocaleDateString('en-GB', { weekday: 'long' })
  const date = now.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })
  const time = now.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false })
  return (
    <div className="dash-clock">
      <div style={{ fontSize: 26, fontWeight: 700, letterSpacing: '0.04em', fontVariantNumeric: 'tabular-nums', color: '#fff' }}>{time}</div>
      <div style={{ fontSize: 13, color: 'var(--muted)' }}>{day}, {date}</div>
    </div>
  )
}

const css = `
.bars { display: grid; gap: 9px; }
.bar-row { display: grid; grid-template-columns: 110px 1fr 34px; gap: 10px; align-items: center; font-size: 12.5px; }
.bar-track { background: #17171b; border-radius: 8px; height: 10px; overflow: hidden; }
.bar-fill { height: 100%; border-radius: 8px; background: linear-gradient(90deg, #ff2028, #ff6a70); }
.bar-row b { text-align: right; }
.quick { display: flex; gap: 10px; flex-wrap: wrap; align-items: center; }
.quick h3 { margin: 0 6px 0 0; font-size: 15px; display: flex; align-items: center; gap: 8px; }
.quick h3 svg { color: var(--brand-hot); }
.vchart { display: flex; align-items: flex-end; gap: 10px; height: 170px; }
.vcol { flex: 1; display: flex; flex-direction: column; align-items: center; justify-content: flex-end; gap: 5px; }
.vbar { width: 100%; max-width: 46px; border-radius: 6px 6px 0 0; background: linear-gradient(180deg, #ff2028, #8a0c12); min-height: 3px; box-shadow: 0 0 10px rgba(255, 32, 40, 0.3); }
.vval { font-size: 10.5px; color: var(--muted); }
.vlabel { font-size: 11.5px; }
.fu-row { display: flex; justify-content: space-between; gap: 10px; padding: 8px 0; border-bottom: 1px solid #17171b; font-size: 13px; }
.fu-row:last-child { border-bottom: none; }
.fu-row small { color: var(--muted); display: block; }
.fu-date.overdue { color: #ff8a8f; font-weight: 600; }
.rd-row { display: flex; justify-content: space-between; align-items: center; gap: 12px; padding: 10px 6px; border-bottom: 1px solid #17171b; cursor: pointer; border-radius: 8px; }
.rd-row:last-child { border-bottom: none; }
.rd-row:hover { background: rgba(255, 255, 255, 0.04); }
.rd-left { min-width: 0; flex: 1; }
.rd-num { font-weight: 700; font-size: 13.5px; white-space: nowrap; }
.rd-type { color: var(--muted); font-size: 11px; font-weight: 500; margin-left: 6px; }
.rd-cust { color: var(--muted); font-size: 12.5px; margin-top: 3px; overflow: hidden; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; }
.rd-right { flex-shrink: 0; display: flex; flex-direction: column; align-items: flex-end; gap: 5px; }
.rd-amt { font-weight: 700; font-size: 13.5px; white-space: nowrap; font-variant-numeric: tabular-nums; }
`

function money(n) {
  return 'RM ' + Number(n || 0).toLocaleString('en-MY', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

function shortMoney(n) {
  const v = Number(n || 0)
  if (v >= 1000) return (v / 1000).toFixed(v >= 10000 ? 0 : 1) + 'k'
  return String(Math.round(v))
}

function showDate(d) {
  if (!d) return '-'
  const [y, m, day] = String(d).slice(0, 10).split('-')
  return day + '/' + m + '/' + y
}

export default function Dashboard() {
  const navigate = useNavigate()
  const [customers, setCustomers] = useState([])
  const [leads, setLeads] = useState([])
  const [docs, setDocs] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    async function load() {
      const [c, l, d] = await Promise.all([
        supabase.from('customers').select('id, created_at'),
        supabase.from('leads').select('id, name, company, stage, service_interest, next_follow_up'),
        supabase
          .from('documents')
          .select('id, doc_type, doc_number, status, issue_date, total, amount_paid, created_at, customers(name)')
          .order('created_at', { ascending: false }),
      ])
      const err = c.error || l.error || d.error
      if (err) setError(err.message)
      setCustomers(c.data || [])
      setLeads(l.data || [])
      setDocs(d.data || [])
      setLoading(false)
    }
    load()
  }, [])

  const now = new Date()
  const thisMonth = now.getFullYear() + '-' + String(now.getMonth() + 1).padStart(2, '0')
  const today = now.toISOString().slice(0, 10)

  const invoices = docs.filter((d) => d.doc_type === 'invoice' && d.status !== 'Cancelled')
  const outstanding = invoices.reduce((s, d) => s + Math.max(Number(d.total || 0) - Number(d.amount_paid || 0), 0), 0)
  const monthSales = invoices
    .filter((d) => String(d.issue_date).slice(0, 7) === thisMonth)
    .reduce((s, d) => s + Number(d.total || 0), 0)
  const openQuotes = docs.filter(
    (d) => d.doc_type === 'quote' && (d.status === 'Draft' || d.status === 'Sent')
  ).length
  const openLeads = leads.filter((l) => l.stage !== 'Won' && l.stage !== 'Lost').length
  const newCustomers = customers.filter((c) => String(c.created_at).slice(0, 7) === thisMonth).length

  // Sales for the last 6 months
  const months = []
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
    const key = d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0')
    months.push({
      key,
      label: MON[d.getMonth()],
      total: invoices.filter((x) => String(x.issue_date).slice(0, 7) === key).reduce((s, x) => s + Number(x.total || 0), 0),
    })
  }
  const maxMonth = Math.max(1, ...months.map((m) => m.total))

  // Newest documents first (by document date, then number)
  const recent = [...docs]
    .sort(
      (a, b) =>
        String(b.issue_date || '').localeCompare(String(a.issue_date || '')) ||
        String(b.doc_number || '').localeCompare(String(a.doc_number || ''))
    )
    .slice(0, 6)

  const stageCount = (s) => leads.filter((l) => l.stage === s).length
  const maxStage = Math.max(1, ...STAGES.map(stageCount))

  const upcoming = leads
    .filter((l) => l.next_follow_up && l.stage !== 'Won' && l.stage !== 'Lost')
    .sort((a, b) => a.next_follow_up.localeCompare(b.next_follow_up))
    .slice(0, 6)

  return (
    <div>
      <style>{css}</style>

      <PageHeader
        icon={LayoutDashboard}
        title="Dashboard"
        subtitle="Business overview, performance and key activities"
      >
        <LiveClock />
      </PageHeader>

      {error && <p className="error">{error}</p>}

      <Stats>
        <StatCard color="blue" icon={Users} label="Customers" value={customers.length} sub={newCustomers + ' new this month'} />
        <StatCard color="purple" icon={Target} label="Open Leads" value={openLeads} />
        <StatCard color="green" icon={FileText} label="Open Quotations" value={openQuotes} />
        <StatCard color="orange" icon={Wallet} label="Outstanding Invoices" value={money(outstanding)} />
        <StatCard color="blue" icon={TrendingUp} label="Sales This Month" value={money(monthSales)} />
      </Stats>

      <Panel className="quick" >
        <div className="quick">
          <h3>
            <Zap size={17} /> Quick Actions
          </h3>
          <button className="small icon-btn" onClick={() => navigate('/customers')}>
            <UserPlus size={15} /> Customers
          </button>
          <button className="small purple icon-btn" onClick={() => navigate('/leads')}>
            <Target size={15} /> Leads
          </button>
          <button className="small blue icon-btn" onClick={() => navigate('/documents/new/quote')}>
            <FileText size={15} /> Create Quotation
          </button>
          <button className="small green icon-btn" onClick={() => navigate('/documents/new/invoice')}>
            <FileText size={15} /> Create Invoice
          </button>
        </div>
      </Panel>

      <div style={{ height: 14 }} />

      <div className="cols-2">
        <Panel title="Lead Pipeline" icon={Filter}>
          <div className="bars">
            {STAGES.map((s) => (
              <div className="bar-row" key={s}>
                <span>{s}</span>
                <div className="bar-track">
                  <div className="bar-fill" style={{ width: (stageCount(s) / maxStage) * 100 + '%' }} />
                </div>
                <b>{stageCount(s)}</b>
              </div>
            ))}
          </div>
        </Panel>

        <Panel title="Sales - Last 6 Months" icon={BarChart3}>
          <div className="vchart">
            {months.map((m) => (
              <div className="vcol" key={m.key}>
                <div className="vval">{m.total > 0 ? shortMoney(m.total) : ''}</div>
                <div className="vbar" style={{ height: Math.round((m.total / maxMonth) * 120) + 'px' }} />
                <div className="vlabel">{m.label}</div>
              </div>
            ))}
          </div>
        </Panel>

        <Panel title="Upcoming Follow-ups" icon={CalendarClock}>
          {loading ? (
            <div className="empty-note">Loading...</div>
          ) : upcoming.length === 0 ? (
            <div className="empty-note">No follow-ups planned.</div>
          ) : (
            upcoming.map((l) => (
              <div className="fu-row" key={l.id} style={{ cursor: 'pointer' }} onClick={() => navigate('/leads')}>
                <div>
                  {l.company || l.name}
                  <small>{l.service_interest || l.stage}</small>
                </div>
                <div className={'fu-date' + (l.next_follow_up < today ? ' overdue' : '')}>
                  {showDate(l.next_follow_up)}
                </div>
              </div>
            ))
          )}
        </Panel>

        <Panel
          title="Recent Documents"
          icon={Clock3}
          action={
            <button className="small ghost" type="button" onClick={() => navigate('/documents')}>
              View all
            </button>
          }
        >
          {loading ? (
            <div className="empty-note">Loading...</div>
          ) : recent.length === 0 ? (
            <div className="empty-note">No documents yet.</div>
          ) : (
            recent.map((d) => (
              <div className="rd-row" key={d.id} onClick={() => navigate('/documents/' + d.id)}>
                <div className="rd-left">
                  <div className="rd-num">
                    {d.doc_number}
                    <span className="rd-type">{docLabel(d.doc_type)}</span>
                  </div>
                  <div className="rd-cust">{d.customers ? d.customers.name : '-'}</div>
                </div>
                <div className="rd-right">
                  <div className="rd-amt">{money(d.total)}</div>
                  <span className={'pill ' + (STATUS_COLOR[d.status] || 'grey')}>{d.status}</span>
                </div>
              </div>
            ))
          )}
        </Panel>
      </div>
    </div>
  )
}