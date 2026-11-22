import { useEffect, useState } from 'react'
import { PieChart, Download, FileText, Wallet, TrendingUp, Users, Receipt, Tag, CalendarDays, Clock3 } from 'lucide-react'
import { supabase } from '../supabaseClient'
import Select from '../components/Select'
import { PageHeader, Stats, StatCard, Tabs, Panel } from '../components/ui'

const css = `
.bars { display: grid; gap: 9px; }
.bar-row { display: grid; grid-template-columns: 130px 1fr 110px; gap: 10px; align-items: center; font-size: 12.5px; }
.bar-track { background: #17171b; border-radius: 8px; height: 10px; overflow: hidden; }
.bar-fill { height: 100%; border-radius: 8px; background: linear-gradient(90deg, #ff2028, #ff6a70); }
.bar-row b { text-align: right; }
.rep-bar { display: flex; gap: 10px; align-items: center; flex-wrap: wrap; margin: 14px 0; }
.rep-bar .sel { width: 170px; }
`

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

function money(n) {
  return 'RM ' + Number(n || 0).toLocaleString('en-MY', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

function round2(n) {
  return Math.round(Number(n || 0) * 100) / 100
}

function monthLabel(key) {
  const [y, m] = String(key).split('-')
  return (MONTHS[Number(m) - 1] || m) + ' ' + y
}

function exportCsv(filename, headers, rows) {
  const esc = (v) => '"' + String(v ?? '').replace(/"/g, '""') + '"'
  const lines = [headers.map(esc).join(',')].concat(rows.map((r) => r.map(esc).join(',')))
  const blob = new Blob(['﻿' + lines.join('\n')], { type: 'text/csv;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

function Bars({ items }) {
  const max = Math.max(1, ...items.map((i) => Math.abs(i.value)))
  if (items.length === 0) return <div className="empty-note">No data for this period.</div>
  return (
    <div className="bars">
      {items.map((i) => (
        <div className="bar-row" key={i.label}>
          <span>{i.label}</span>
          <div className="bar-track">
            <div className="bar-fill" style={{ width: (Math.abs(i.value) / max) * 100 + '%' }} />
          </div>
          <b>{money(i.value)}</b>
        </div>
      ))}
    </div>
  )
}

export default function Reports() {
  const [docs, setDocs] = useState([])
  const [expenses, setExpenses] = useState([])
  const [payments, setPayments] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [tab, setTab] = useState('sales')
  const [year, setYear] = useState(String(new Date().getFullYear()))

  useEffect(() => {
    async function load() {
      const [d, e, p] = await Promise.all([
        supabase
          .from('documents')
          .select('id, doc_type, status, total, amount_paid, issue_date, customer_id, customers(name)'),
        supabase.from('expenses').select('expense_date, category, amount'),
        supabase.from('payments').select('payment_date, amount'),
      ])
      const err = d.error || e.error || p.error
      if (err) setError(err.message)
      setDocs(d.data || [])
      setExpenses(e.data || [])
      setPayments(p.data || [])
      setLoading(false)
    }
    load()
  }, [])

  // Years that have any data (plus this year)
  const yearSet = new Set([String(new Date().getFullYear())])
  docs.forEach((r) => r.issue_date && yearSet.add(String(r.issue_date).slice(0, 4)))
  expenses.forEach((r) => r.expense_date && yearSet.add(String(r.expense_date).slice(0, 4)))
  payments.forEach((r) => r.payment_date && yearSet.add(String(r.payment_date).slice(0, 4)))
  const yearOptions = [
    { value: 'all', label: 'All years' },
    ...Array.from(yearSet).sort().reverse().map((y) => ({ value: y, label: y })),
  ]

  const inYear = (d) => year === 'all' || String(d || '').slice(0, 4) === year

  const invoices = docs.filter((r) => r.doc_type === 'invoice' && r.status !== 'Cancelled' && inYear(r.issue_date))
  const quotes = docs.filter((r) => r.doc_type === 'quote' && inYear(r.issue_date))
  const exp = expenses.filter((r) => inYear(r.expense_date))
  const pay = payments.filter((r) => inYear(r.payment_date))

  // ---------- Sales ----------
  const invoiced = round2(invoices.reduce((s, r) => s + Number(r.total || 0), 0))
  const collected = round2(invoices.reduce((s, r) => s + Number(r.amount_paid || 0), 0))
  const outstanding = round2(invoiced - collected)
  const salesByMonth = {}
  invoices.forEach((r) => {
    const k = String(r.issue_date).slice(0, 7)
    if (!salesByMonth[k]) salesByMonth[k] = { count: 0, invoiced: 0, paid: 0 }
    salesByMonth[k].count += 1
    salesByMonth[k].invoiced += Number(r.total || 0)
    salesByMonth[k].paid += Number(r.amount_paid || 0)
  })
  const salesMonths = Object.keys(salesByMonth).sort()

  // ---------- Expenses ----------
  const expTotal = round2(exp.reduce((s, r) => s + Number(r.amount || 0), 0))
  const byCat = {}
  exp.forEach((r) => {
    const k = r.category || 'Other'
    byCat[k] = (byCat[k] || 0) + Number(r.amount || 0)
  })
  const catList = Object.keys(byCat).sort((a, b) => byCat[b] - byCat[a])
  const expByMonth = {}
  exp.forEach((r) => {
    const k = String(r.expense_date).slice(0, 7)
    expByMonth[k] = (expByMonth[k] || 0) + Number(r.amount || 0)
  })
  const expMonths = Object.keys(expByMonth).sort()

  // ---------- Customers ----------
  const custMap = {}
  invoices.forEach((r) => {
    const id = r.customer_id || 'none'
    if (!custMap[id]) {
      custMap[id] = { name: (r.customers && r.customers.name) || 'No customer', count: 0, invoiced: 0, paid: 0 }
    }
    custMap[id].count += 1
    custMap[id].invoiced += Number(r.total || 0)
    custMap[id].paid += Number(r.amount_paid || 0)
  })
  const custList = Object.values(custMap)
    .map((c) => ({ ...c, owing: round2(c.invoiced - c.paid) }))
    .sort((a, b) => b.invoiced - a.invoiced)
  const owingCustomers = custList.filter((c) => c.owing > 0).length

  // ---------- Profit (money received minus money spent) ----------
  const received = round2(pay.reduce((s, r) => s + Number(r.amount || 0), 0))
  const profit = round2(received - expTotal)
  const recByMonth = {}
  pay.forEach((r) => {
    const k = String(r.payment_date).slice(0, 7)
    recByMonth[k] = (recByMonth[k] || 0) + Number(r.amount || 0)
  })
  const profitMonths = Array.from(new Set([...Object.keys(recByMonth), ...Object.keys(expByMonth)])).sort()
  const margin = received > 0 ? Math.round((profit / received) * 100) : 0

  const tabs = [
    { key: 'sales', label: 'Sales' },
    { key: 'expenses', label: 'Expenses' },
    { key: 'customers', label: 'Customers' },
    { key: 'profit', label: 'Profit' },
  ]

  function doExport() {
    if (tab === 'sales') {
      exportCsv(
        'sales-report.csv',
        ['Month', 'Invoices', 'Invoiced', 'Paid', 'Outstanding'],
        salesMonths.map((k) => {
          const m = salesByMonth[k]
          return [monthLabel(k), m.count, round2(m.invoiced), round2(m.paid), round2(m.invoiced - m.paid)]
        })
      )
    } else if (tab === 'expenses') {
      exportCsv(
        'expenses-report.csv',
        ['Category', 'Amount'],
        catList.map((k) => [k, round2(byCat[k])])
      )
    } else if (tab === 'customers') {
      exportCsv(
        'customers-report.csv',
        ['Customer', 'Invoices', 'Invoiced', 'Paid', 'Outstanding'],
        custList.map((c) => [c.name, c.count, round2(c.invoiced), round2(c.paid), c.owing])
      )
    } else {
      exportCsv(
        'profit-report.csv',
        ['Month', 'Received', 'Expenses', 'Profit'],
        profitMonths.map((k) => {
          const r = recByMonth[k] || 0
          const e = expByMonth[k] || 0
          return [monthLabel(k), round2(r), round2(e), round2(r - e)]
        })
      )
    }
  }

  return (
    <div>
      <style>{css}</style>

      <PageHeader icon={PieChart} title="Reports" subtitle="Sales, expenses, customers and profit at a glance">
        <button className="small blue icon-btn" onClick={doExport}>
          <Download size={15} /> Export
        </button>
      </PageHeader>

      {error && <p className="error">{error}</p>}

      <div className="rep-bar">
        <label style={{ fontSize: 12.5 }}>Year</label>
        <Select value={year} onChange={setYear} options={yearOptions} />
      </div>

      <Tabs tabs={tabs} value={tab} onChange={setTab} />

      {loading ? (
        <div className="empty-note">Loading...</div>
      ) : (
        <>
          {tab === 'sales' && (
            <>
              <Stats>
                <StatCard color="blue" icon={FileText} label="Total Invoiced" value={money(invoiced)} sub={invoices.length + ' invoices'} />
                <StatCard color="green" icon={Wallet} label="Collected" value={money(collected)} />
                <StatCard color="orange" icon={Clock3} label="Outstanding" value={money(outstanding)} />
                <StatCard color="purple" icon={Receipt} label="Quotations Made" value={quotes.length} />
              </Stats>
              <Panel title="Sales by month" icon={CalendarDays}>
                <Bars items={salesMonths.map((k) => ({ label: monthLabel(k), value: salesByMonth[k].invoiced }))} />
                {salesMonths.length > 0 && (
                  <div className="table-wrap" style={{ marginTop: 14 }}>
                    <table className="data">
                      <thead>
                        <tr>
                          <th>Month</th>
                          <th className="num">Invoices</th>
                          <th className="num">Invoiced</th>
                          <th className="num">Paid</th>
                          <th className="num">Outstanding</th>
                        </tr>
                      </thead>
                      <tbody>
                        {salesMonths.map((k) => {
                          const m = salesByMonth[k]
                          return (
                            <tr key={k}>
                              <td>{monthLabel(k)}</td>
                              <td className="num">{m.count}</td>
                              <td className="num">{money(m.invoiced)}</td>
                              <td className="num">{money(m.paid)}</td>
                              <td className="num">{money(m.invoiced - m.paid)}</td>
                            </tr>
                          )
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </Panel>
            </>
          )}

          {tab === 'expenses' && (
            <>
              <Stats>
                <StatCard color="red" icon={Wallet} label="Total Expenses" value={money(expTotal)} sub={exp.length + ' records'} />
                <StatCard color="orange" icon={Tag} label="Biggest Category" value={catList[0] || '-'} sub={catList[0] ? money(byCat[catList[0]]) : ''} />
                <StatCard
                  color="blue"
                  icon={CalendarDays}
                  label="Average per Month"
                  value={money(expMonths.length ? expTotal / expMonths.length : 0)}
                />
                <StatCard color="purple" icon={Receipt} label="Categories Used" value={catList.length} />
              </Stats>
              <Panel title="Expenses by category" icon={Tag}>
                <Bars items={catList.map((k) => ({ label: k, value: byCat[k] }))} />
              </Panel>
              <Panel title="Expenses by month" icon={CalendarDays}>
                <Bars items={expMonths.map((k) => ({ label: monthLabel(k), value: expByMonth[k] }))} />
              </Panel>
            </>
          )}

          {tab === 'customers' && (
            <>
              <Stats>
                <StatCard color="blue" icon={Users} label="Customers Invoiced" value={custList.length} />
                <StatCard color="green" icon={TrendingUp} label="Top Customer" value={custList[0] ? custList[0].name : '-'} sub={custList[0] ? money(custList[0].invoiced) : ''} />
                <StatCard color="orange" icon={Clock3} label="Still Owing" value={owingCustomers} sub="customers" />
                <StatCard color="red" icon={Wallet} label="Total Outstanding" value={money(outstanding)} />
              </Stats>
              <Panel title="Customer report" icon={Users}>
                {custList.length === 0 ? (
                  <div className="empty-note">No invoices for this period.</div>
                ) : (
                  <div className="table-wrap">
                    <table className="data">
                      <thead>
                        <tr>
                          <th>Customer</th>
                          <th className="num">Invoices</th>
                          <th className="num">Invoiced</th>
                          <th className="num">Paid</th>
                          <th className="num">Outstanding</th>
                        </tr>
                      </thead>
                      <tbody>
                        {custList.map((c) => (
                          <tr key={c.name}>
                            <td>{c.name}</td>
                            <td className="num">{c.count}</td>
                            <td className="num">{money(c.invoiced)}</td>
                            <td className="num">{money(c.paid)}</td>
                            <td className="num">{money(c.owing)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </Panel>
            </>
          )}

          {tab === 'profit' && (
            <>
              <Stats>
                <StatCard color="green" icon={Wallet} label="Money Received" value={money(received)} />
                <StatCard color="red" icon={Receipt} label="Expenses" value={money(expTotal)} />
                <StatCard color={profit >= 0 ? 'blue' : 'orange'} icon={TrendingUp} label="Profit" value={money(profit)} />
                <StatCard color="purple" icon={PieChart} label="Profit Margin" value={margin + '%'} />
              </Stats>
              <Panel title="Profit by month (money received minus expenses)" icon={CalendarDays}>
                {profitMonths.length === 0 ? (
                  <div className="empty-note">No payments or expenses for this period.</div>
                ) : (
                  <div className="table-wrap">
                    <table className="data">
                      <thead>
                        <tr>
                          <th>Month</th>
                          <th className="num">Received</th>
                          <th className="num">Expenses</th>
                          <th className="num">Profit</th>
                        </tr>
                      </thead>
                      <tbody>
                        {profitMonths.map((k) => {
                          const r = recByMonth[k] || 0
                          const e = expByMonth[k] || 0
                          return (
                            <tr key={k}>
                              <td>{monthLabel(k)}</td>
                              <td className="num">{money(r)}</td>
                              <td className="num">{money(e)}</td>
                              <td className="num" style={{ color: r - e >= 0 ? '#3ddc84' : '#ff5a60' }}>
                                {money(r - e)}
                              </td>
                            </tr>
                          )
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </Panel>
            </>
          )}
        </>
      )}
    </div>
  )
}
