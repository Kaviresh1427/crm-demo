import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Layers, Wallet, CalendarDays, FileText, CheckCircle2 } from 'lucide-react'
import { supabase } from '../supabaseClient'
import { PageHeader, Stats, StatCard, Panel } from '../components/ui'

function money(n) {
  return 'RM ' + Number(n || 0).toLocaleString('en-MY', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

function pad(n) {
  return String(n).padStart(2, '0')
}

function dateStr(d) {
  return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate())
}

export default function ProjectsOverview() {
  const nav = useNavigate()
  const [payments, setPayments] = useState([])
  const [expenses, setExpenses] = useState([])
  const [contracts, setContracts] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    async function load() {
      const [p, e, c] = await Promise.all([
        supabase
          .from('payments')
          .select('id, payment_date, amount, method, customers(name)')
          .order('payment_date', { ascending: false })
          .limit(500),
        supabase
          .from('expenses')
          .select('id, expense_date, description, amount, category')
          .order('expense_date', { ascending: false })
          .limit(500),
        supabase
          .from('maintenance_contracts')
          .select('id, contract_no, title, end_date, amount, billing_cycle, status, customers(name)')
          .order('end_date', { ascending: true }),
      ])
      const err = p.error || e.error || c.error
      if (err) setError(err.message)
      setPayments(p.data || [])
      setExpenses(e.data || [])
      setContracts(c.data || [])
      setLoading(false)
    }
    load()
  }, [])

  if (loading) return <div className="empty-note">Loading...</div>

  const now = new Date()
  const monthStart = dateStr(new Date(now.getFullYear(), now.getMonth(), 1))
  const soon = dateStr(new Date(now.getFullYear(), now.getMonth(), now.getDate() + 60))

  const paidThisMonth = payments
    .filter((x) => x.payment_date >= monthStart)
    .reduce((s, x) => s + Number(x.amount || 0), 0)
  const spentThisMonth = expenses
    .filter((x) => x.expense_date >= monthStart)
    .reduce((s, x) => s + Number(x.amount || 0), 0)
  const active = contracts.filter((c) => c.status === 'Active')
  const activeValue = active.reduce((s, c) => s + Number(c.amount || 0), 0)
  const ending = active.filter((c) => c.end_date && c.end_date <= soon)

  const grid = { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(320px, 100%), 1fr))', gap: 14 }

  return (
    <div>
      <PageHeader
        icon={Layers}
        title="Projects Overview"
        subtitle="Payments, expenses and maintenance contracts at a glance."
      >
        <button className="small icon-btn" onClick={() => nav('/projects/payments')}>
          <Wallet size={15} /> Payments
        </button>
        <button className="small icon-btn" onClick={() => nav('/projects/contracts')}>
          <FileText size={15} /> Contracts
        </button>
        <button className="small icon-btn" onClick={() => nav('/projects/expenses')}>
          <CalendarDays size={15} /> Expenses
        </button>
      </PageHeader>

      {error && <p className="error">{error}</p>}

      <Stats>
        <StatCard color="green" icon={Wallet} label="Received This Month" value={money(paidThisMonth)} />
        <StatCard color="red" icon={CalendarDays} label="Spent This Month" value={money(spentThisMonth)} />
        <StatCard color="blue" icon={CheckCircle2} label="Active Contracts" value={active.length} sub={money(activeValue)} />
        <StatCard color="orange" icon={FileText} label="Ending in 60 Days" value={ending.length} />
      </Stats>

      <div style={grid}>
        <Panel title="Recent payments" icon={Wallet}>
          {payments.length === 0 ? (
            <p className="empty-note">No payments yet.</p>
          ) : (
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Customer</th>
                    <th className="num">Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {payments.slice(0, 6).map((x) => (
                    <tr key={x.id}>
                      <td>{x.payment_date}</td>
                      <td>{x.customers ? x.customers.name : '-'}</td>
                      <td className="num">{money(x.amount)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Panel>

        <Panel title="Recent expenses" icon={CalendarDays}>
          {expenses.length === 0 ? (
            <p className="empty-note">No expenses yet.</p>
          ) : (
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Description</th>
                    <th className="num">Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {expenses.slice(0, 6).map((x) => (
                    <tr key={x.id}>
                      <td>{x.expense_date}</td>
                      <td>{x.description}</td>
                      <td className="num">{money(x.amount)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Panel>

        <Panel title="Contracts ending soon" icon={FileText}>
          {ending.length === 0 ? (
            <p className="empty-note">No active contracts ending in the next 60 days.</p>
          ) : (
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>No.</th>
                    <th>Customer</th>
                    <th>Ends</th>
                  </tr>
                </thead>
                <tbody>
                  {ending.map((c) => (
                    <tr key={c.id}>
                      <td>{c.contract_no}</td>
                      <td>{c.customers ? c.customers.name : '-'}</td>
                      <td>{c.end_date}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Panel>
      </div>
    </div>
  )
}
