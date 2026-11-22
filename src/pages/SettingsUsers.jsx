import { useEffect, useState } from 'react'
import { Users, Save, ShieldCheck } from 'lucide-react'
import { supabase } from '../supabaseClient'
import { useAuth } from '../AuthContext'
import { PageHeader, Stats, StatCard } from '../components/ui'

const ROLES = [
  ['owner', 'Owner'],
  ['staff', 'Staff'],
  ['accountant', 'Accountant'],
]

export default function SettingsUsers() {
  const { profile } = useAuth()
  const isOwner = profile && profile.role === 'owner'
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(true)
  const [savingId, setSavingId] = useState('')
  const [error, setError] = useState('')
  const [saved, setSaved] = useState('')

  async function load() {
    const { data, error: err } = await supabase
      .from('profiles')
      .select('id, full_name, role, created_at')
      .order('created_at', { ascending: true })
    if (err) setError(err.message)
    else setRows(data || [])
    setLoading(false)
  }

  useEffect(() => {
    load()
  }, [])

  function change(id, key, value) {
    setSaved('')
    setRows((list) => list.map((r) => (r.id === id ? { ...r, [key]: value } : r)))
  }

  async function saveRow(r) {
    setError('')
    setSaved('')
    const owners = rows.filter((x) => x.role === 'owner').length
    if (profile && r.id === profile.id && r.role !== 'owner' && owners < 1) {
      setError('There must be at least one Owner.')
      return
    }
    setSavingId(r.id)
    const { error: err } = await supabase
      .from('profiles')
      .update({ full_name: r.full_name, role: r.role })
      .eq('id', r.id)
    setSavingId('')
    if (err) setError(err.message)
    else setSaved('Saved.')
  }

  const count = (role) => rows.filter((r) => r.role === role).length

  if (loading) return <div className="empty-note">Loading...</div>

  return (
    <div>
      <PageHeader
        icon={Users}
        title="Users & Roles"
        subtitle="See who can log in and set each person's role."
      />

      {error && <p className="error">{error}</p>}
      {saved && <p style={{ color: '#3ddc84', fontSize: 13 }}>{saved}</p>}
      {!isOwner && <p className="error">Only the Owner can change users.</p>}

      <Stats>
        <StatCard color="blue" icon={Users} label="Users" value={rows.length} />
        <StatCard color="red" icon={ShieldCheck} label="Owners" value={count('owner')} />
        <StatCard color="green" icon={Users} label="Staff" value={count('staff')} />
        <StatCard color="orange" icon={Users} label="Accountants" value={count('accountant')} />
      </Stats>

      <div className="form-card">
        <h2>Users</h2>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Name</th>
                <th style={{ width: 180 }}>Role</th>
                <th style={{ width: 110 }}>Created</th>
                <th style={{ width: 110 }}></th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id}>
                  <td>
                    <input
                      value={r.full_name || ''}
                      disabled={!isOwner}
                      onChange={(e) => change(r.id, 'full_name', e.target.value)}
                    />
                  </td>
                  <td>
                    <select
                      value={r.role}
                      disabled={!isOwner}
                      onChange={(e) => change(r.id, 'role', e.target.value)}
                    >
                      {ROLES.map(([key, label]) => (
                        <option key={key} value={key}>
                          {label}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td>{String(r.created_at || '').slice(0, 10)}</td>
                  <td>
                    <button
                      className="small icon-btn"
                      disabled={!isOwner || savingId === r.id}
                      onClick={() => saveRow(r)}
                    >
                      <Save size={15} /> {savingId === r.id ? 'Saving...' : 'Save'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="form-card">
        <h2>How roles work</h2>
        <p style={{ fontSize: 13, lineHeight: 1.7 }}>
          Owner: full access, can change users and roles.
          <br />
          Staff: day-to-day work (customers, leads, documents).
          <br />
          Accountant: payments, expenses and reports.
        </p>
        <p style={{ fontSize: 13, lineHeight: 1.7 }}>
          To add a new person, create their login in Supabase (Authentication, then Users, then Add user). When they
          log in for the first time, they appear in this list and you can set their role here.
        </p>
      </div>
    </div>
  )
}