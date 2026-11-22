import { useEffect, useState } from 'react'
import { Mail, Save, Copy, ExternalLink, Send, RotateCcw } from 'lucide-react'
import { supabase } from '../supabaseClient'
import { PageHeader, Stats, StatCard, Panel } from '../components/ui'
import Select from '../components/Select'
import { COMPANY } from '../docSettings'

const KIND = 'email_templates'

const SIGN = 'Best regards,\nDemo User\n{company}\n{phone} | {email}\n{website}'

// Starting emails. Words in { } are filled in automatically.
const DEFAULTS = {
  quote_send: {
    name: 'Send a quotation',
    subject: 'Quotation from {company}',
    body:
      'Dear {customer},\n\nThank you for your interest in our services. Please find our quotation attached.\n\nIf you have any questions or would like to change anything, please call or message us at {phone}.\n\n' +
      SIGN,
  },
  invoice_send: {
    name: 'Send an invoice',
    subject: 'Invoice from {company}',
    body:
      'Dear {customer},\n\nPlease find your invoice attached. Payment details are shown at the bottom of the invoice. Please use the invoice number as the payment reference.\n\nThank you for your business.\n\n' +
      SIGN,
  },
  payment_reminder: {
    name: 'Payment reminder',
    subject: 'Payment reminder from {company}',
    body:
      'Dear {customer},\n\nThis is a friendly reminder that we have not yet received payment for your outstanding invoice. Please arrange payment at your earliest convenience. If you have already paid, kindly ignore this message.\n\nPlease contact us at {phone} if you have any questions.\n\n' +
      SIGN,
  },
  follow_up: {
    name: 'Follow up after meeting',
    subject: 'Thank you for meeting us - {company}',
    body:
      'Dear {customer},\n\nThank you for taking the time to meet us. It was great to learn about your business and what you need.\n\nWe will prepare our proposal and send it to you soon. Please let us know if there is anything else you would like us to include.\n\n' +
      SIGN,
  },
  introduction: {
    name: 'Introduce our company',
    subject: 'Introduction - {company}',
    body:
      'Dear {customer},\n\nWe are {company}, an IT solutions company in Johor, Malaysia. We build custom business systems, POS systems, web applications and websites, and we provide computer repair, on-site IT support and Microsoft 365 services.\n\nI have attached our company profile and portfolio. We would be happy to arrange a short meeting to understand your needs.\n\n' +
      SIGN,
  },
  thank_you: {
    name: 'Thank you after payment',
    subject: 'Thank you - {company}',
    body:
      'Dear {customer},\n\nThank you for your payment. We appreciate your support and look forward to working with you again.\n\nIf you need any help, please contact us at {phone}.\n\n' +
      SIGN,
  },
}

function fill(text, customer) {
  const map = {
    customer: customer ? customer.name : 'Sir/Madam',
    company: COMPANY.name,
    phone: COMPANY.phone,
    email: COMPANY.email,
    website: COMPANY.website,
  }
  return String(text || '').replace(/\{(\w+)\}/g, (m, k) => (map[k] !== undefined ? map[k] : m))
}

export default function Email() {
  const [customers, setCustomers] = useState([])
  const [overrides, setOverrides] = useState({})
  const [tplKey, setTplKey] = useState('quote_send')
  const [customerId, setCustomerId] = useState('')
  const [to, setTo] = useState('')
  const [subject, setSubject] = useState(DEFAULTS.quote_send.subject)
  const [body, setBody] = useState(DEFAULTS.quote_send.body)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [note, setNote] = useState('')

  useEffect(() => {
    async function load() {
      const [t, c] = await Promise.all([
        supabase.from('company_templates').select('content').eq('kind', KIND).maybeSingle(),
        supabase.from('customers').select('id, name, email').order('name'),
      ])
      if (t.error) setError(t.error.message)
      const saved = (t.data && t.data.content && t.data.content.templates) || {}
      setOverrides(saved)
      if (saved.quote_send) {
        setSubject(saved.quote_send.subject)
        setBody(saved.quote_send.body)
      }
      setCustomers(c.data || [])
      setLoading(false)
    }
    load()
  }, [])

  function pickTemplate(key) {
    const t = overrides[key] || DEFAULTS[key]
    setTplKey(key)
    setSubject(t.subject)
    setBody(t.body)
    setNote('')
  }

  function pickCustomer(id) {
    setCustomerId(id)
    const c = customers.find((x) => x.id === id)
    setTo(c && c.email ? c.email : '')
    setNote('')
  }

  const customer = customers.find((x) => x.id === customerId) || null
  const finalSubject = fill(subject, customer)
  const finalBody = fill(body, customer)

  async function saveTemplate() {
    setSaving(true)
    setError('')
    setNote('')
    const next = { ...overrides, [tplKey]: { subject, body } }
    const { error: err } = await supabase
      .from('company_templates')
      .upsert({ kind: KIND, content: { templates: next }, updated_at: new Date().toISOString() }, { onConflict: 'kind' })
    setSaving(false)
    if (err) setError(err.message)
    else {
      setOverrides(next)
      setNote('Template saved.')
    }
  }

  async function resetTemplate() {
    const next = { ...overrides }
    delete next[tplKey]
    setSubject(DEFAULTS[tplKey].subject)
    setBody(DEFAULTS[tplKey].body)
    setError('')
    const { error: err } = await supabase
      .from('company_templates')
      .upsert({ kind: KIND, content: { templates: next }, updated_at: new Date().toISOString() }, { onConflict: 'kind' })
    if (err) setError(err.message)
    else {
      setOverrides(next)
      setNote('Template reset to the starting text.')
    }
  }

  function openMailApp() {
    window.location.href =
      'mailto:' + encodeURIComponent(to) + '?subject=' + encodeURIComponent(finalSubject) + '&body=' + encodeURIComponent(finalBody)
  }

  function openGmail() {
    const url =
      'https://mail.google.com/mail/?view=cm&to=' +
      encodeURIComponent(to) +
      '&su=' +
      encodeURIComponent(finalSubject) +
      '&body=' +
      encodeURIComponent(finalBody)
    window.open(url, '_blank', 'noopener')
  }

  async function copyText() {
    try {
      await navigator.clipboard.writeText('Subject: ' + finalSubject + '\n\n' + finalBody)
      setNote('Copied. You can paste it into any email.')
    } catch (e) {
      setError('Copy failed: ' + e.message)
    }
  }

  if (loading) return <div className="empty-note">Loading...</div>

  const keys = Object.keys(DEFAULTS)
  const withEmail = customers.filter((c) => c.email).length

  return (
    <div>
      <PageHeader
        icon={Mail}
        title="Email"
        subtitle="Write an email from a template, then open it in your email app."
      >
        <button className="small icon-btn" onClick={openGmail}>
          <ExternalLink size={15} /> Open in Gmail
        </button>
        <button className="small blue icon-btn" onClick={openMailApp}>
          <Send size={15} /> Open in email app
        </button>
      </PageHeader>

      {error && <p className="error">{error}</p>}
      {note && <p style={{ color: '#3ddc84', fontSize: 13 }}>{note}</p>}

      <Stats>
        <StatCard color="blue" icon={Mail} label="Email Templates" value={keys.length} />
        <StatCard color="green" icon={Save} label="Edited by You" value={Object.keys(overrides).length} />
        <StatCard color="purple" icon={Send} label="Customers with Email" value={withEmail} />
      </Stats>

      <div className="form-card">
        <h2>Write the email</h2>
        <div className="form-grid">
          <div>
            <label>Template</label>
            <Select
              value={tplKey}
              onChange={pickTemplate}
              options={keys.map((k) => ({ value: k, label: DEFAULTS[k].name }))}
            />
          </div>
          <div>
            <label>Customer</label>
            <Select
              value={customerId}
              onChange={pickCustomer}
              placeholder="Select customer"
              options={[{ value: '', label: 'No customer' }, ...customers.map((c) => ({ value: c.id, label: c.name }))]}
            />
          </div>
          <div className="full">
            <label>To (email address)</label>
            <input value={to} placeholder="customer@example.com" onChange={(e) => setTo(e.target.value)} />
          </div>
          <div className="full">
            <label>Subject</label>
            <input value={subject} onChange={(e) => setSubject(e.target.value)} />
          </div>
          <div className="full">
            <label>Message (words in {'{ }'} are filled in automatically)</label>
            <textarea rows="12" value={body} onChange={(e) => setBody(e.target.value)} />
          </div>
        </div>
        <div className="form-actions">
          <button className="small icon-btn" onClick={saveTemplate} disabled={saving}>
            <Save size={15} /> {saving ? 'Saving...' : 'Save this template'}
          </button>
          <button className="small ghost icon-btn" onClick={resetTemplate}>
            <RotateCcw size={15} /> Reset to starting text
          </button>
        </div>
      </div>

      <Panel
        title="Preview"
        icon={Mail}
        action={
          <button className="small icon-btn" onClick={copyText}>
            <Copy size={15} /> Copy
          </button>
        }
      >
        <p style={{ fontSize: 13, margin: '0 0 8px' }}>
          <b>To:</b> {to || '-'}
          <br />
          <b>Subject:</b> {finalSubject}
        </p>
        <pre style={{ whiteSpace: 'pre-wrap', fontFamily: 'inherit', fontSize: 13, lineHeight: 1.6, margin: 0 }}>
          {finalBody}
        </pre>
        <p style={{ fontSize: 12, opacity: 0.7, marginTop: 12 }}>
          Attachments cannot be added automatically. Download the PDF first, open the email, then attach the PDF.
        </p>
      </Panel>
    </div>
  )
}
