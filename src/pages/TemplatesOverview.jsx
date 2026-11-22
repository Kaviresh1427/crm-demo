import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { FileStack, Briefcase, Mail, FileText, CheckCircle2 } from 'lucide-react'
import { supabase } from '../supabaseClient'
import { PageHeader, Stats, StatCard, Panel } from '../components/ui'
import { DOC_TYPES } from '../docSettings'

const TEMPLATES = [
  { kind: 'company_profile', title: 'Company Profile', desc: 'About us, services, why choose us. Download as PDF.', to: '/templates/company-profile' },
  { kind: 'portfolio', title: 'Portfolio', desc: 'Your projects and IT jobs, with photos.', to: '/templates/portfolio' },
  { kind: 'proposal', title: 'Proposal', desc: 'A proposal for a customer with scope and price.', to: '/templates/proposal' },
  { kind: 'cover_letter', title: 'Cover Letter', desc: 'A letter to go with your quotation or profile.', to: '/templates/cover-letter' },
  { kind: 'meeting_kit', title: 'Meeting Kit', desc: 'Agenda, questions and notes for a customer visit.', to: '/meeting-kit' },
  { kind: 'email_templates', title: 'Email Templates', desc: 'Ready-made emails for quotations, reminders and follow-ups.', to: '/email' },
]

export default function TemplatesOverview() {
  const nav = useNavigate()
  const [saved, setSaved] = useState({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    async function load() {
      const { data, error: err } = await supabase.from('company_templates').select('kind, updated_at')
      if (err) setError(err.message)
      const map = {}
      ;(data || []).forEach((r) => {
        map[r.kind] = r.updated_at
      })
      setSaved(map)
      setLoading(false)
    }
    load()
  }, [])

  if (loading) return <div className="empty-note">Loading...</div>

  const savedCount = TEMPLATES.filter((t) => saved[t.kind]).length
  const docKeys = Object.keys(DOC_TYPES)
  const grid = { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(260px, 100%), 1fr))', gap: 14 }

  return (
    <div>
      <PageHeader
        icon={FileStack}
        title="Templates"
        subtitle="All your editable templates in one place."
      />

      {error && <p className="error">{error}</p>}

      <Stats>
        <StatCard color="blue" icon={FileStack} label="Template Types" value={TEMPLATES.length} />
        <StatCard color="green" icon={CheckCircle2} label="Saved by You" value={savedCount} />
        <StatCard color="purple" icon={FileText} label="Document Designs" value={docKeys.length} />
        <StatCard color="orange" icon={Mail} label="Email Templates" value={saved.email_templates ? 'Edited' : 'Default'} />
      </Stats>

      <div style={grid}>
        {TEMPLATES.map((t) => (
          <Panel key={t.kind} title={t.title} icon={t.kind === 'meeting_kit' ? Briefcase : FileStack}>
            <p style={{ fontSize: 13, lineHeight: 1.6, margin: '0 0 10px' }}>{t.desc}</p>
            <p style={{ fontSize: 12, opacity: 0.7, margin: '0 0 12px' }}>
              {saved[t.kind] ? 'Last saved: ' + String(saved[t.kind]).slice(0, 10) : 'Not saved yet (using starting text)'}
            </p>
            <button className="small icon-btn" onClick={() => nav(t.to)}>
              Open
            </button>
          </Panel>
        ))}
      </div>

      <div style={{ marginTop: 14 }}>
        <Panel title="Document designs (all use the quotation / invoice design)" icon={FileText}>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {docKeys.map((k) =>
              k === 'item_receipt' ? (
                <button key={k} className="small ghost" onClick={() => nav('/operations/item-receipts')}>
                  {DOC_TYPES[k].label}
                </button>
              ) : (
                <button key={k} className="small ghost" onClick={() => nav('/documents?type=' + k)}>
                  {DOC_TYPES[k].label}
                </button>
              )
            )}
          </div>
        </Panel>
      </div>
    </div>
  )
}
