import { useState } from 'react'
import { MessageCircle, Globe, RotateCcw, X, LogIn } from 'lucide-react'
import { resetDemo, supabase } from './demoDb'

// Gold "DEMO" tab on the side of the screen.
// Opens a small panel with WhatsApp, website and Reset buttons.
const WA_NUMBER = '601163975503'
const WEBSITE = 'https://www.sarveshcomputer.com.my'

const css = `
button.dm-tab {
  margin: 0 !important; position: fixed; right: 0; top: 46%; z-index: 9000; transform: translateY(-50%) !important;
  writing-mode: vertical-rl; text-orientation: mixed;
  background: linear-gradient(180deg, #f2c94c, #d4a72c) !important; color: #1a1300 !important; border: none !important;
  border-radius: 12px 0 0 12px; padding: 14px 7px !important; font-weight: 800; font-size: 13px; letter-spacing: 0.18em;
  box-shadow: 0 6px 22px rgba(212, 167, 44, 0.45) !important; cursor: pointer; width: auto !important;
}
button.dm-tab:hover { padding-right: 10px; background: linear-gradient(180deg, #f7d76a, #dcb23a) !important; }
.dm-back { position: fixed; inset: 0; background: rgba(0, 0, 0, 0.45) !important; z-index: 9001; }
.dm-panel {
  position: fixed; right: 14px; top: 50%; transform: translateY(-50%) !important; z-index: 9002;
  width: min(340px, calc(100vw - 28px)) !important; background: #141414 !important; color: #f4f4f5 !important;
  border: 1px solid rgba(212, 167, 44, 0.6) !important; border-radius: 18px; padding: 20px 18px 16px !important;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.6), 0 0 30px rgba(212, 167, 44, 0.18) !important;
  font-family: inherit;
}
.dm-panel h3 { margin: 0 0 6px !important; font-size: 18px; display: flex; align-items: center; gap: 8px; }
.dm-panel h3 span { background: #d4a72c !important; color: #1a1300 !important; font-size: 11px; letter-spacing: 0.14em; padding: 3px 9px !important; border-radius: 999px; }
.dm-panel p { margin: 0 0 14px !important; color: #a1a1aa !important; font-size: 13.5px; line-height: 1.5; }
button.dm-close, button.dm-close:hover { margin: 0 !important; position: absolute; top: 10px; right: 10px; width: 32px !important; height: 32px; padding: 0 !important; border-radius: 50%;
  background: transparent !important; border: 1px solid rgba(255,255,255,0.15) !important; color: #f4f4f5 !important; display: flex; align-items: center; justify-content: center; }
.dm-panel .dm-btn { display: flex; align-items: center; justify-content: center; gap: 8px; width: 100% !important; padding: 12px !important; border-radius: 12px;
  font-size: 14.5px; font-weight: 700; text-decoration: none; margin-top: 9px; cursor: pointer; border: 1px solid transparent !important; box-sizing: border-box; }
.dm-panel .dm-wa, .dm-panel .dm-wa:hover { background: #25d366 !important; color: #06290f !important; }
.dm-panel .dm-web, .dm-panel .dm-web:hover { background: transparent !important; color: #f4f4f5 !important; border-color: rgba(255,255,255,0.2) !important; }
.dm-panel button.dm-reset, .dm-panel button.dm-reset:hover { background: transparent !important; color: #f2c94c !important; border-color: rgba(212,167,44,0.55) !important; }
.dm-panel button.dm-exit, .dm-panel button.dm-exit:hover { background: transparent !important; color: #a1a1aa !important; border-color: rgba(255,255,255,0.12) !important; font-weight: 600; }
.dm-small { color: #71717a !important; font-size: 11.5px; text-align: center; margin-top: 12px; }
.demo-pill { display: inline-block; margin-left: 6px; padding: 2px 7px !important; border-radius: 999px; background: #d4a72c !important; color: #1a1300 !important;
  font-size: 10px; font-weight: 800; letter-spacing: 0.12em; vertical-align: middle; }
@media print { .dm-tab, .dm-panel, .dm-back { display: none !important; } }
`

export default function DemoPanel() {
  const [open, setOpen] = useState(false)
  const [sure, setSure] = useState(false)

  const waText = encodeURIComponent(
    'Hi Sarvesh Computer Enterprise, I tried the CRM demo and I am interested. Please contact me.'
  )

  function reset() {
    if (!sure) {
      setSure(true)
      return
    }
    resetDemo()
    window.location.reload()
  }

  async function exitDemo() {
    await supabase.auth.signOut()
    setOpen(false)
  }

  return (
    <>
      <style>{css}</style>
      {!open && (
        <button className="dm-tab" onClick={() => setOpen(true)} aria-label="About this demo">
          DEMO
        </button>
      )}
      {open && (
        <>
          <div className="dm-back" onClick={() => { setOpen(false); setSure(false) }} />
          <div className="dm-panel" role="dialog" aria-label="About this demo">
            <button className="dm-close" onClick={() => { setOpen(false); setSure(false) }} aria-label="Close">
              <X size={16} />
            </button>
            <h3>Sarvesh CRM <span>DEMO</span></h3>
            <p>
              You are using a demo with a sample company. Try anything: add customers, create quotations and
              invoices, download PDFs. Your changes stay only in this browser.
            </p>
            <a className="dm-btn dm-wa" href={'https://wa.me/' + WA_NUMBER + '?text=' + waText} target="_blank" rel="noreferrer">
              <MessageCircle size={18} /> WhatsApp us
            </a>
            <a className="dm-btn dm-web" href={WEBSITE} target="_blank" rel="noreferrer">
              <Globe size={17} /> Visit our website
            </a>
            <button className="dm-btn dm-reset" onClick={reset}>
              <RotateCcw size={17} /> {sure ? 'Tap again to confirm reset' : 'Reset demo data'}
            </button>
            <button className="dm-btn dm-exit" onClick={exitDemo}>
              <LogIn size={16} /> Back to demo start screen
            </button>
            <div className="dm-small">Built by Sarvesh Computer Enterprise &bull; sample data resets daily</div>
          </div>
        </>
      )}
    </>
  )
}
