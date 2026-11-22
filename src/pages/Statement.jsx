import { useState } from 'react'
import AddressToggle from '../components/AddressToggle'
import { FileText, Download } from 'lucide-react'
import { supabase } from '../supabaseClient'
import Select from '../components/Select'
import { Panel } from '../components/ui'
import { downloadStatementPdf } from '../statementPdf'

function money(n) {
  return 'RM ' + Number(n || 0).toLocaleString('en-MY', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

function showDate(d) {
  if (!d) return '-'
  const [y, m, day] = String(d).slice(0, 10).split('-')
  return day + '/' + m + '/' + y
}

export default function Statement({ rows }) {
  const [customerId, setCustomerId] = useState('')
  const [busy, setBusy] = useState(false)

  // customers that have at least one invoice or credit note
  const seen = {}
  rows.forEach((r) => {
    if (!r.customer_id || !['invoice', 'credit_note'].includes(r.doc_type)) return
    if (!seen[r.customer_id]) seen[r.customer_id] = r.customers ? r.customers.name : 'Customer'
  })
  const options = [
    { value: '', label: 'Choose a customer' },
    ...Object.keys(seen).map((id) => ({ value: id, label: seen[id] })),
  ]

  const mine = rows
    .filter(
      (r) =>
        r.customer_id === customerId &&
        ['invoice', 'credit_note'].includes(r.doc_type) &&
        r.status !== 'Cancelled'
    )
    .sort((a, b) => String(a.issue_date).localeCompare(String(b.issue_date)))

  let invoiced = 0
  let paid = 0
  let credits = 0
  mine.forEach((r) => {
    if (r.doc_type === 'invoice') {
      invoiced += Number(r.total || 0)
      paid += Number(r.amount_paid || 0)
    } else {
      credits += Number(r.total || 0)
    }
  })
  const owing = invoiced - paid - credits

  async function download() {
    setBusy(true)
    const { data } = await supabase.from('customers').select('*').eq('id', customerId).single()
    await downloadStatementPdf({
      customer: data || { name: seen[customerId] },
      rows: mine,
      invoiced,
      paid,
      credits,
      owing,
      date: new Date().toISOString().slice(0, 10),
    })
    setBusy(false)
  }

  const action =
    customerId && mine.length > 0 ? (
      <>
        <AddressToggle />
        <button className="small icon-btn" onClick={download} disabled={busy}>
          <Download size={15} /> {busy ? 'Making PDF...' : 'Download PDF'}
        </button>
      </>
    ) : null

  return (
    <Panel title="Account Statement" icon={FileText} action={action}>
      <div style={{ maxWidth: 320, marginBottom: 14 }}>
        <Select value={customerId} onChange={setCustomerId} options={options} />
      </div>

      {!customerId ? (
        <div className="empty-note">Choose a customer to see the statement.</div>
      ) : mine.length === 0 ? (
        <div className="empty-note">No invoices for this customer.</div>
      ) : (
        <>
          <div className="table-wrap">
            <table className="data">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Document No.</th>
                  <th>Type</th>
                  <th className="num">Amount</th>
                  <th className="num">Paid</th>
                  <th className="num">Balance</th>
                </tr>
              </thead>
              <tbody>
                {mine.map((r) => {
                  const isInv = r.doc_type === 'invoice'
                  const bal = isInv ? Number(r.total || 0) - Number(r.amount_paid || 0) : -Number(r.total || 0)
                  return (
                    <tr key={r.id}>
                      <td>{showDate(r.issue_date)}</td>
                      <td><strong>{r.doc_number}</strong></td>
                      <td>{isInv ? 'Invoice' : 'Credit Note'}</td>
                      <td className="num">{money(r.total)}</td>
                      <td className="num">{isInv ? money(r.amount_paid) : '-'}</td>
                      <td className="num">{money(bal)}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
          <div style={{ textAlign: 'right', marginTop: 14, fontSize: 15 }}>
            Total Outstanding: <strong style={{ color: '#ff2028' }}>{money(owing)}</strong>
          </div>
        </>
      )}
    </Panel>
  )
}