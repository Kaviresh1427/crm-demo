import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'

// Catch the browser's "this app can be installed" signal early,
// so the Install popup can use it later.
window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault()
  window.__sceInstallEvent = e
  window.dispatchEvent(new Event('sce-install-ready'))
})

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>
)

// Make the system installable as an app on phone, tablet and laptop
if ('serviceWorker' in navigator && import.meta.env.PROD) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(() => {})
  })
}