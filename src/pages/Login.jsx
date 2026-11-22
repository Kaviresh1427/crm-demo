import { useState } from 'react'
import { Navigate } from 'react-router-dom'
import { TrendingUp, Users, Layers, ClipboardList, Settings, LogIn, ShieldCheck, Sparkles, MessageCircle } from 'lucide-react'
import { supabase } from '../supabaseClient'
import { useAuth } from '../AuthContext'

const css = `
.lg-wrap {
  min-height: 100vh; display: grid; grid-template-columns: 1.1fr 1fr; align-items: center; gap: 30px;
  padding: 30px 6vw; position: relative; overflow: hidden;
  background:
    radial-gradient(900px 500px at 0% 0%, rgba(255, 32, 40, 0.28), transparent 60%),
    radial-gradient(700px 500px at 100% 100%, rgba(255, 32, 40, 0.16), transparent 60%),
    var(--bg);
}
.lg-hero { display: flex; flex-direction: column; align-items: center; text-align: center; gap: 14px; }
.lg-logo {
  width: 210px; height: 210px; border-radius: 50%; background: var(--text); display: flex; align-items: center;
  justify-content: center; overflow: hidden; box-shadow: 0 0 60px rgba(255, 32, 40, 0.45);
}
.lg-logo img { width: 94%; height: 94%; object-fit: contain; }
.lg-hero h1 { font-size: 30px; margin: 6px 0 0; font-weight: 800; letter-spacing: 0.3px; }
.lg-hero .tag-line { color: var(--muted); font-size: 16px; margin: 0; }
.lg-icons { display: flex; gap: 12px; margin-top: 10px; }
.lg-icon {
  width: 52px; height: 52px; border-radius: 12px; display: flex; align-items: center; justify-content: center;
  background: rgba(255, 255, 255, 0.04); border: 1px solid var(--line); color: var(--brand-hot);
  box-shadow: 0 0 14px rgba(255, 32, 40, 0.18);
}
.lg-motto { color: var(--text); font-size: 15px; margin-top: 6px; }
.lg-motto i { color: var(--brand-hot); font-style: normal; margin: 0 8px; }

.lg-card {
  width: 100%; max-width: 440px; justify-self: center; padding: 34px 30px; border-radius: 22px;
  background: rgba(255, 255, 255, 0.045); border: 1px solid rgba(255, 255, 255, 0.22);
  box-shadow: 0 0 40px rgba(255, 32, 40, 0.25), inset 0 0 30px rgba(255, 255, 255, 0.03);
  backdrop-filter: blur(10px);
}
.lg-card h2 { text-align: center; font-size: 21px; margin: 0 0 4px; }
.lg-secure { display: flex; align-items: center; justify-content: center; gap: 8px; color: var(--text); margin-bottom: 18px; }
.lg-secure svg { color: var(--brand-hot); }
.lg-field { position: relative; margin-bottom: 14px; }
.lg-field > svg { position: absolute; left: 13px; top: 50%; transform: translateY(-50%); color: var(--muted); width: 17px; }
.lg-field input { padding: 13px 44px; border-radius: 12px; background: rgba(0, 0, 0, 0.45); border-color: rgba(255, 255, 255, 0.25); font-size: 15px; }
.lg-field button.icon { position: absolute; right: 8px; top: 50%; transform: translateY(-50%); border: none; background: transparent; }
button.lg-btn { display: flex; align-items: center; justify-content: center; gap: 8px; margin-top: 8px; padding: 13px; font-size: 16px; border-radius: 12px; }
.lg-foot { display: flex; align-items: center; justify-content: center; gap: 8px; margin-top: 22px; color: var(--muted); font-size: 13px; }
.lg-foot svg { color: var(--brand-hot); }

.lg-demo-list { list-style: none; padding: 0; margin: 4px 0 18px; display: grid; gap: 9px; color: var(--text); font-size: 14px; }
.lg-demo-list li { display: flex; gap: 9px; align-items: flex-start; }
.lg-demo-list li svg { color: var(--brand-hot); flex: 0 0 auto; margin-top: 2px; }
.lg-demo-note { color: var(--muted); font-size: 12.5px; text-align: center; margin: 14px 0 0; line-height: 1.5; }
.lg-badge { display: inline-block; padding: 4px 12px; border-radius: 999px; background: #d4a72c; color: #1a1300; font-weight: 800; font-size: 12px; letter-spacing: 0.12em; }
a.lg-wa { display: flex; align-items: center; justify-content: center; gap: 8px; margin-top: 10px; padding: 11px; border-radius: 12px; border: 1px solid var(--line); color: var(--text); text-decoration: none; font-size: 14px; }
a.lg-wa:hover { border-color: #25d366; }
a.lg-wa svg { color: #25d366; }

@media (max-width: 900px) {
  .lg-wrap { grid-template-columns: 1fr; padding: 24px 16px; }
  .lg-logo { width: 130px; height: 130px; }
  .lg-hero h1 { font-size: 22px; }
  .lg-icons { display: none; }
}
`

export default function Login() {
  const { session } = useAuth()
  const [busy, setBusy] = useState(false)
  const [logoOk, setLogoOk] = useState(true)

  if (session) return <Navigate to="/" replace />

  async function enterDemo() {
    setBusy(true)
    // Demo login: no email or password needed
    await supabase.auth.signInWithPassword({ email: 'demo', password: 'demo' })
    setBusy(false)
  }

  const waText = encodeURIComponent('Hi Sarvesh Computer Enterprise, I tried the CRM demo and I am interested. Please contact me.')

  return (
    <div className="lg-wrap">
      <style>{css}</style>

      <div className="lg-hero">
        {logoOk && (
          <div className="lg-logo">
            <img src="/sarvesh-logo.png" alt="Sarvesh Computer Enterprise" onError={() => setLogoOk(false)} />
          </div>
        )}
        <h1>Sarvesh CRM</h1>
        <p className="tag-line">Business Management System</p>
        <div className="lg-icons">
          <div className="lg-icon"><TrendingUp size={24} /></div>
          <div className="lg-icon"><Users size={24} /></div>
          <div className="lg-icon"><Layers size={24} /></div>
          <div className="lg-icon"><ClipboardList size={24} /></div>
          <div className="lg-icon"><Settings size={24} /></div>
        </div>
        <div className="lg-motto">
          Manage<i>&bull;</i>Operate<i>&bull;</i>Grow
        </div>
      </div>

      <div className="lg-card">
        <div style={{ textAlign: 'center', marginBottom: 10 }}>
          <span className="lg-badge">LIVE DEMO</span>
        </div>
        <h2>Try the full system for free</h2>
        <div className="lg-secure">No sign-up. No password.</div>

        <ul className="lg-demo-list">
          <li><Sparkles size={16} /> Customers, leads pipeline and reminders</li>
          <li><Sparkles size={16} /> Quotations, invoices and receipts with PDF</li>
          <li><Sparkles size={16} /> Payments, expenses and reports</li>
          <li><Sparkles size={16} /> Company profile, portfolio and social media posts</li>
        </ul>

        <button type="button" className="lg-btn" style={{ width: '100%' }} disabled={busy} onClick={enterDemo}>
          <LogIn size={18} /> {busy ? 'Opening demo...' : 'Enter Demo'}
        </button>

        <a className="lg-wa" href={'https://wa.me/601163975503?text=' + waText} target="_blank" rel="noreferrer">
          <MessageCircle size={17} /> Get this system for your business
        </a>

        <p className="lg-demo-note">
          This demo uses a sample company and sample data. Anything you change is saved only in this browser
          and goes back to the sample data every day.
        </p>

        <div className="lg-foot">
          <ShieldCheck size={16} /> Built by Sarvesh Computer Enterprise
        </div>
      </div>
    </div>
  )
}
