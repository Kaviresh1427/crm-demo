import { useEffect, useState } from 'react'
import { Building2, Save, Landmark, Phone } from 'lucide-react'
import { supabase } from '../supabaseClient'
import { PageHeader } from '../components/ui'
import { COMPANY } from '../docSettings'

const KIND = 'company_settings'

function toForm(c) {
  return {
    name: c.name || '',
    address: (c.addressLines || []).join('\n'),
    phone: c.phone || '',
    email: c.email || '',
    website: c.website || '',
    bankName: (c.bank && c.bank.bankName) || '',
    accountName: (c.bank && c.bank.accountName) || '',
    accountNumber: (c.bank && c.bank.accountNumber) || '',
  }
}

export function formToCompany(f) {
  return {
    name: f.name.trim(),
    addressLines: f.address
      .split('\n')
      .map((s) => s.trim())
      .filter(Boolean),
    phone: f.phone.trim(),
    email: f.email.trim(),
    website: f.website.trim(),
    bank: {
      bankName: f.bankName.trim(),
      accountName: f.accountName.trim(),
      accountNumber: f.accountNumber.trim(),
    },
  }
}

export default function SettingsCompany() {
  const [form, setForm] = useState(toForm(COMPANY))
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [saved, setSaved] = useState('')

  useEffect(() => {
    async function load() {
      const { data, error: err } = await supabase
        .from('company_templates')
        .select('content')
        .eq('kind', KIND)
        .maybeSingle()
      if (err) setError(err.message)
      else if (data && data.content && Object.keys(data.content).length > 0) {
        setForm(toForm({ ...COMPANY, ...data.content }))
      }
      setLoading(false)
    }
    load()
  }, [])

  function setField(key, value) {
    setSaved('')
    setForm((f) => ({ ...f, [key]: value }))
  }

  async function save() {
    setSaving(true)
    setError('')
    setSaved('')
    const content = formToCompany(form)
    const { error: err } = await supabase
      .from('company_templates')
      .upsert({ kind: KIND, content, updated_at: new Date().toISOString() }, { onConflict: 'kind' })
    setSaving(false)
    if (err) setError(err.message)
    else {
      Object.assign(COMPANY, content)
      setSaved('Saved.')
    }
  }

  if (loading) return <div className="empty-note">Loading...</div>

  return (
    <div>
      <PageHeader
        icon={Building2}
        title="Company & Bank Details"
        subtitle="These details are printed on your documents."
      >
        <button className="small icon-btn" onClick={save} disabled={saving}>
          <Save size={15} /> {saving ? 'Saving...' : 'Save'}
        </button>
      </PageHeader>

      {error && <p className="error">{error}</p>}
      {saved && <p style={{ color: '#3ddc84', fontSize: 13 }}>{saved}</p>}

      <div className="form-card">
        <h2>
          <Phone size={15} /> Company details
        </h2>
        <div className="form-grid">
          <div className="full">
            <label>Company name</label>
            <input value={form.name} onChange={(e) => setField('name', e.target.value)} />
          </div>
          <div className="full">
            <label>Address (one line per row)</label>
            <textarea rows="5" value={form.address} onChange={(e) => setField('address', e.target.value)} />
          </div>
          <div>
            <label>Phone</label>
            <input value={form.phone} onChange={(e) => setField('phone', e.target.value)} />
          </div>
          <div>
            <label>Email</label>
            <input value={form.email} onChange={(e) => setField('email', e.target.value)} />
          </div>
          <div className="full">
            <label>Website</label>
            <input value={form.website} onChange={(e) => setField('website', e.target.value)} />
          </div>
        </div>
      </div>

      <div className="form-card">
        <h2>
          <Landmark size={15} /> Bank details
        </h2>
        <div className="form-grid">
          <div>
            <label>Bank name</label>
            <input value={form.bankName} onChange={(e) => setField('bankName', e.target.value)} />
          </div>
          <div>
            <label>Account name</label>
            <input value={form.accountName} onChange={(e) => setField('accountName', e.target.value)} />
          </div>
          <div className="full">
            <label>Account number</label>
            <input value={form.accountNumber} onChange={(e) => setField('accountNumber', e.target.value)} />
          </div>
        </div>
      </div>

      <div className="form-actions">
        <button className="small icon-btn" onClick={save} disabled={saving}>
          <Save size={15} /> {saving ? 'Saving...' : 'Save'}
        </button>
      </div>
    </div>
  )
}