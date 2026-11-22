import { useEffect, useState } from 'react'
import { Download, X, Share } from 'lucide-react'
import './install.css'

// Popup that asks "Install Sarvesh CRM app?"
// Works on Android phone (Chrome / Samsung Internet) and Windows (Chrome / Edge).
// iPhone / iPad: shows how to add it with Share > Add to Home Screen.
// "Not now" hides it for 3 days. It never shows when the app is already installed.

const HIDE_KEY = 'sce-install-hide-until'
const HIDE_DAYS = 3

function isInstalled() {
  return window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true
}

function isIos() {
  const ua = window.navigator.userAgent
  return /iphone|ipad|ipod/i.test(ua) || (ua.includes('Macintosh') && 'ontouchend' in document)
}

function hiddenNow() {
  try {
    return Number(localStorage.getItem(HIDE_KEY) || 0) > Date.now()
  } catch {
    return false
  }
}

export default function InstallPrompt() {
  const [evt, setEvt] = useState(() => window.__sceInstallEvent || null)
  const [show, setShow] = useState(false)
  const [ios, setIos] = useState(false)
  const [closing, setClosing] = useState(false)

  useEffect(() => {
    if (isInstalled() || hiddenNow()) return

    function onReady() {
      setEvt(window.__sceInstallEvent)
    }
    function onInstalled() {
      setShow(false)
    }
    window.addEventListener('sce-install-ready', onReady)
    window.addEventListener('appinstalled', onInstalled)

    // iPhone has no install button, so show the "Add to Home Screen" help instead
    let t
    if (isIos()) {
      t = setTimeout(() => {
        setIos(true)
        setShow(true)
      }, 2500)
    }
    return () => {
      clearTimeout(t)
      window.removeEventListener('sce-install-ready', onReady)
      window.removeEventListener('appinstalled', onInstalled)
    }
  }, [])

  // When the browser says "this app can be installed", wait 2.5 sec then show the popup
  useEffect(() => {
    if (!evt || isInstalled() || hiddenNow()) return
    const t = setTimeout(() => setShow(true), 2500)
    return () => clearTimeout(t)
  }, [evt])

  function close(remember) {
    if (remember) {
      try {
        localStorage.setItem(HIDE_KEY, String(Date.now() + HIDE_DAYS * 86400000))
      } catch {
        /* ignore */
      }
    }
    setClosing(true)
    setTimeout(() => {
      setShow(false)
      setClosing(false)
    }, 300)
  }

  async function install() {
    if (!evt) return
    evt.prompt()
    try {
      const choice = await evt.userChoice
      if (choice.outcome !== 'accepted') close(true)
      else close(false)
    } catch {
      close(false)
    }
    window.__sceInstallEvent = null
    setEvt(null)
  }

  if (!show) return null

  return (
    <div className={'inst-wrap' + (closing ? ' out' : '')} role="dialog" aria-label="Install app">
      <div className="inst-card">
        <button type="button" className="inst-x" onClick={() => close(true)} aria-label="Close">
          <X size={16} />
        </button>

        <div className="inst-row">
          <div className="inst-logo">
            <img src="/icon-192.png" alt="" />
          </div>
          <div className="inst-txt">
            <b>Install Sarvesh CRM Demo?</b>
            <span>
              {ios
                ? 'Add the app to your Home Screen. It opens full screen, like a normal app.'
                : 'Opens full screen like a normal app, with its own icon on your phone or computer.'}
            </span>
          </div>
        </div>

        {ios ? (
          <div className="inst-ios">
            Tap <Share size={15} /> <b>Share</b> at the bottom of Safari, then <b>Add to Home Screen</b>.
          </div>
        ) : (
          <div className="inst-btns">
            <button type="button" className="inst-later" onClick={() => close(true)}>
              Not now
            </button>
            <button type="button" className="inst-go" onClick={install}>
              <Download size={16} /> Install
            </button>
          </div>
        )}
      </div>
    </div>
  )
}