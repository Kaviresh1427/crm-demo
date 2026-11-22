import { useState } from 'react'
import { DatabaseBackup, Download, FileJson } from 'lucide-react'
import { supabase } from '../supabaseClient'
import { PageHeader } from '../components/ui'

const TABLES = [
  ['customers', 'Customers'],
  ['contacts', 'Customer contacts'],
  ['leads', 'Leads'],
  ['activities', 'Notes and reminders'],
  ['services', 'Service catalogue'],
  ['documents', 'Documents (quotations, invoices...)'],
  ['document_items', 'Document line items'],
  ['document_counters', 'Document number counters'],
  ['suppliers', 'Suppliers'],
  ['expenses', 'Expenses'],
  ['payments', 'Payments'],
  ['maintenance_contracts', 'Maintenance contracts'],
  ['item_receipts', 'Item receipts'],
  ['item_receipt_items', 'Item receipt items'],
  ['company_templates', 'Templates and company settings'],
  ['profiles', 'Users'],
]

async function fetchAll(table) {
  const rows = []
  const size = 1000
  for (let from = 0; ; from += size) {
    const { data, error } = await supabase.from(table).select('*').range(from, from + size - 1)
    if (error) throw new Error(table + ': ' + error.message)
    rows.push(...data)
    if (data.length < size) break
  }
  return rows
}

function csvCell(v) {
  if (v === null || v === undefined) return ''
  const s = typeof v === 'object' ? JSON.stringify(v) : String(v)
  return /[",\n\r]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s
}

function toCsv(rows) {
  if (rows.length === 0) return ''
  const cols = Object.keys(rows[0])
  const lines = [cols.join(',')]
  rows.forEach((r) => lines.push(cols.map((c) => csvCell(r[c])).join(',')))
  return lines.join('\r\n')
}

function download(filename, text, type) {
  const blob = new Blob(['\uFEFF' + text], { type })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

function today() {
  return new Date().toISOString().slice(0, 10)
}

export default function SettingsBackup() {
  const [busy, setBusy] = useState('')
  const [error, setError] = useState('')
  const [done, setDone] = useState('')

  async function exportCsv(table) {
    setBusy(table)
    setError('')
    setDone('')
    try {
      const rows = await fetchAll(table)
      if (rows.length === 0) {
        setDone('Nothing to export in this table yet (it is empty).')
      } else {
        download(table + '-' + today() + '.csv', toCsv(rows), 'text/csv;charset=utf-8')
        setDone('Downloaded ' + table + ' (' + rows.length + ' rows).')
      }
    } catch (e) {
      setError(e.message)
    }
    setBusy('')
  }

  async function fullBackup() {
    setBusy('all')
    setError('')
    setDone('')
    try {
      const backup = { created_at: new Date().toISOString(), tables: {} }
      for (const [table] of TABLES) {
        backup.tables[table] = await fetchAll(table)
      }
      download('sarvesh-backup-' + today() + '.json', JSON.stringify(backup, null, 2), 'application/json')
      setDone('Full backup downloaded. Keep the file somewhere safe.')
    } catch (e) {
      setError(e.message)
    }
    setBusy('')
  }

  return (
    <div>
      <PageHeader
        icon={DatabaseBackup}
        title="Backup & Export"
        subtitle="Download a copy of your data to keep safe."
      >
        <button className="small blue icon-btn" onClick={fullBackup} disabled={busy !== ''}>
          <FileJson size={15} /> {busy === 'all' ? 'Preparing...' : 'Download full backup'}
        </button>
      </PageHeader>

      {error && <p className="error">{error}</p>}
      {done && <p style={{ color: '#3ddc84', fontSize: 13 }}>{done}</p>}

      <div className="form-card">
        <h2>Export one table as CSV (opens in Excel)</h2>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Data</th>
                <th style={{ width: 140 }}></th>
              </tr>
            </thead>
            <tbody>
              {TABLES.map(([table, label]) => (
                <tr key={table}>
                  <td>{label}</td>
                  <td>
                    <button
                      className="small icon-btn"
                      onClick={() => exportCsv(table)}
                      disabled={busy !== ''}
                    >
                      <Download size={15} /> {busy === table ? 'Wait...' : 'CSV'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}