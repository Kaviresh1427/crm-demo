import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom'
import {
  ChevronDown, Settings, Plus, LogOut, FileText, Receipt, UserPlus, Target, Wallet, X,
  LayoutDashboard, Users, LayoutGrid, Wrench, Calculator, FileClock, Banknote, FileMinus,
  ShoppingCart, Landmark, ClipboardList, Clock3, Package, PackageOpen, Inbox, Truck, Layers,
  ShieldCheck, CalendarDays, FileStack, Building2, Globe, Send, FileDown, Mail, Briefcase,
  Megaphone, TrendingUp, ListChecks, UserCog, DatabaseBackup, Sun, Moon,
} from 'lucide-react'
import { useAuth } from '../AuthContext'
import { supabase } from '../supabaseClient'
import NotificationBell from './NotificationBell'
import './shell.css'
import './theme-light.css'

// Sarvesh CRM - top pill navigation (Grovia style), black + red.
const OPS_TYPES = ['work_order', 'timesheet', 'purchase_order', 'packing_slip']

const TABS = [
  { key: 'dash', label: 'Overview', to: '/' },
  { key: 'customers', label: 'Customers', to: '/customers' },
  { key: 'leads', label: 'Leads', to: '/leads', badge: 'leads' },
  {
    key: 'docs', label: 'Documents', badge: 'unpaid',
    items: [
      { label: 'Quotation', to: '/documents?type=quote' },
      { label: 'Estimate', to: '/documents?type=estimate' },
      { label: 'Proforma Invoice', to: '/documents?type=proforma' },
      { label: 'Invoice', to: '/documents?type=invoice' },
      { label: 'Receipt', to: '/documents?type=receipt' },
      { label: 'Credit Note', to: '/documents?type=credit_note' },
      { label: 'Sales Order', to: '/documents?type=sales_order' },
      { label: 'Account Statement', to: '/documents?type=statement' },
      { label: 'Service Catalogue', to: '/services' },
    ],
  },
  {
    key: 'ops', label: 'Operations',
    items: [
      { label: 'Work Order', to: '/documents?type=work_order' },
      { label: 'Timesheet', to: '/documents?type=timesheet' },
      { label: 'Purchase Order', to: '/documents?type=purchase_order' },
      { label: 'Packing Slip', to: '/documents?type=packing_slip' },
      { label: 'Item Receipt Letter', to: '/operations/item-receipts' },
      { label: 'Suppliers', to: '/suppliers' },
    ],
  },
  {
    key: 'projects', label: 'Projects',
    items: [
      { label: 'Projects Overview', to: '/projects' },
      { label: 'Payments', to: '/projects/payments' },
      { label: 'Maintenance Contracts', to: '/projects/contracts' },
      { label: 'Expenses', to: '/projects/expenses' },
    ],
  },
  {
    key: 'marketing', label: 'Marketing',
    items: [
      { label: 'Templates Overview', to: '/templates' },
      { label: 'Company Profile', to: '/templates/company-profile' },
      { label: 'Portfolio', to: '/templates/portfolio' },
      { label: 'Proposal', to: '/templates/proposal' },
      { label: 'Cover Letter', to: '/templates/cover-letter' },
      { label: 'Email', to: '/email' },
      { label: 'Meeting Kit', to: '/meeting-kit' },
      { label: 'Social Media Studio', to: '/social-media' },
    ],
  },
  { key: 'reports', label: 'Reports', to: '/reports' },
]

const SETTINGS = {
  key: 'settings', label: 'Settings',
  items: [
    { label: 'Company Details & Bank Details', to: '/settings/company' },
    { label: 'Notes & Terms Library', to: '/settings/terms' },
    { label: 'Users & Roles', to: '/settings/users' },
    { label: 'Backup & Export', to: '/settings/backup' },
  ],
}

// Red "+" quick-create menu
const QUICK = [
  { label: 'New Quotation', icon: FileText, to: '/documents/new/quote' },
  { label: 'New Invoice', icon: Receipt, to: '/documents/new/invoice' },
  { label: 'New Customer', icon: UserPlus, to: '/customers?new=1' },
  { label: 'New Lead', icon: Target, to: '/leads?new=1' },
  { label: 'New Expense', icon: Wallet, to: '/projects/expenses?new=1' },
]

// Phone: bottom bar + "More" sheet with every page
const BOTTOM = [
  { key: 'dash', label: 'Overview', to: '/', icon: LayoutDashboard },
  { key: 'customers', label: 'Customers', to: '/customers', icon: Users },
  { key: 'leads', label: 'Leads', to: '/leads', icon: Target, badge: 'leads' },
  { key: 'docs', label: 'Documents', to: '/documents', icon: FileText, badge: 'unpaid' },
]

const SHEET = [
  {
    label: 'Sales',
    items: [
      { label: 'Customers', to: '/customers', icon: Users },
      { label: 'Leads', to: '/leads', icon: Target },
      { label: 'Services', to: '/services', icon: Wrench },
    ],
  },
  {
    label: 'Documents',
    items: [
      { label: 'Quotation', to: '/documents?type=quote', icon: FileText },
      { label: 'Estimate', to: '/documents?type=estimate', icon: Calculator },
      { label: 'Proforma', to: '/documents?type=proforma', icon: FileClock },
      { label: 'Invoice', to: '/documents?type=invoice', icon: Receipt },
      { label: 'Receipt', to: '/documents?type=receipt', icon: Banknote },
      { label: 'Credit Note', to: '/documents?type=credit_note', icon: FileMinus },
      { label: 'Sales Order', to: '/documents?type=sales_order', icon: ShoppingCart },
      { label: 'Statement', to: '/documents?type=statement', icon: Landmark },
    ],
  },
  {
    label: 'Operations',
    items: [
      { label: 'Work Order', to: '/documents?type=work_order', icon: ClipboardList },
      { label: 'Timesheet', to: '/documents?type=timesheet', icon: Clock3 },
      { label: 'Purchase Order', to: '/documents?type=purchase_order', icon: Package },
      { label: 'Packing Slip', to: '/documents?type=packing_slip', icon: PackageOpen },
      { label: 'Item Receipt', to: '/operations/item-receipts', icon: Inbox },
      { label: 'Suppliers', to: '/suppliers', icon: Truck },
    ],
  },
  {
    label: 'Projects',
    items: [
      { label: 'Overview', to: '/projects', icon: Layers },
      { label: 'Payments', to: '/projects/payments', icon: Wallet },
      { label: 'Contracts', to: '/projects/contracts', icon: ShieldCheck },
      { label: 'Expenses', to: '/projects/expenses', icon: CalendarDays },
    ],
  },
  {
    label: 'Marketing',
    items: [
      { label: 'Templates', to: '/templates', icon: FileStack },
      { label: 'Company Profile', to: '/templates/company-profile', icon: Building2 },
      { label: 'Portfolio', to: '/templates/portfolio', icon: Globe },
      { label: 'Proposal', to: '/templates/proposal', icon: Send },
      { label: 'Cover Letter', to: '/templates/cover-letter', icon: FileDown },
      { label: 'Email', to: '/email', icon: Mail },
      { label: 'Meeting Kit', to: '/meeting-kit', icon: Briefcase },
      { label: 'Social Media', to: '/social-media', icon: Megaphone },
    ],
  },
  {
    label: 'System',
    items: [
      { label: 'Reports', to: '/reports', icon: TrendingUp },
      { label: 'Company & Bank', to: '/settings/company', icon: Settings },
      { label: 'Notes & Terms', to: '/settings/terms', icon: ListChecks },
      { label: 'Users & Roles', to: '/settings/users', icon: UserCog },
      { label: 'Backup', to: '/settings/backup', icon: DatabaseBackup },
    ],
  },
]

function matchItem(to, loc, exact) {
  const [path, qs] = to.split('?')
  const type = qs ? new URLSearchParams(qs).get('type') : null
  const curType = new URLSearchParams(loc.search).get('type')
  if (type) return loc.pathname === path && curType === type
  if (path === '/') return loc.pathname === '/'
  if (exact) return loc.pathname === path
  return loc.pathname === path || loc.pathname.startsWith(path + '/')
}

function tabActive(tab, loc) {
  const p = loc.pathname
  const curType = new URLSearchParams(loc.search).get('type')
  if (tab.key === 'docs' && p.startsWith('/documents') && !(p === '/documents' && OPS_TYPES.includes(curType))) return true
  if (tab.to) return matchItem(tab.to, loc)
  return tab.items.some((it) => matchItem(it.to, loc))
}

// Light / Dark mode: saved on this device
function startTheme() {
  try {
    return localStorage.getItem('sce-theme') === 'light' ? 'light' : 'dark'
  } catch {
    return 'dark'
  }
}

function initials(name) {
  const parts = (name || '').trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return 'U'
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return (parts[0][0] + parts[1][0]).toUpperCase()
}

export default function Layout() {
  const { session, profile, signOut } = useAuth()
  const loc = useLocation()
  const navigate = useNavigate()
  const [counts, setCounts] = useState({ leads: 0, unpaid: 0 })
  const [drop, setDrop] = useState(null) // { key, left, top }
  const [quick, setQuick] = useState(false)
  const [userMenu, setUserMenu] = useState(false)
  const [ind, setInd] = useState(null) // sliding red pill
  const [sheet, setSheet] = useState(false) // phone "More" sheet
  const [bind, setBind] = useState(null) // phone bottom bar pill
  const bottomRef = useRef(null)
  const bottomRefs = useRef({})
  const touchY = useRef(null)
  const navRef = useRef(null)
  const tabRefs = useRef({})
  const dropRef = useRef(null)
  const quickRef = useRef(null)
  const userRef = useRef(null)
  const [theme, setTheme] = useState(startTheme)

  const activeKey = (TABS.find((t) => tabActive(t, loc)) || {}).key
  const fullPath = loc.pathname + loc.search
  const bottomKey = sheet ? 'more' : (BOTTOM.some((b) => b.key === activeKey) ? activeKey : 'more')

  // Light / Dark mode: put it on the page, save it, colour the phone status bar
  useLayoutEffect(() => {
    const root = document.documentElement
    root.dataset.theme = theme
    try {
      localStorage.setItem('sce-theme', theme)
    } catch {
      /* ignore */
    }
    const meta = document.querySelector('meta[name="theme-color"]')
    if (meta) meta.setAttribute('content', theme === 'light' ? '#f3f3f6' : '#080808')
  }, [theme])

  // leaving the system (sign out): login page stays dark
  useEffect(() => {
    return () => {
      delete document.documentElement.dataset.theme
      const meta = document.querySelector('meta[name="theme-color"]')
      if (meta) meta.setAttribute('content', '#080808')
    }
  }, [])

  function toggleTheme() {
    const root = document.documentElement
    root.classList.add('theme-anim')
    setTheme((t) => (t === 'light' ? 'dark' : 'light'))
    setTimeout(() => root.classList.remove('theme-anim'), 500)
  }

  // close every pop-up when the page changes
  useEffect(() => {
    setDrop(null)
    setQuick(false)
    setUserMenu(false)
    setSheet(false)
  }, [loc.pathname, loc.search])

  // phone bottom bar: move the red pill
  useLayoutEffect(() => {
    const bar = bottomRef.current
    function place() {
      const el = bottomRefs.current[bottomKey]
      if (!el) {
        setBind(null)
        return
      }
      setBind({ left: el.offsetLeft, width: el.offsetWidth })
    }
    place()
    const ro = new ResizeObserver(place)
    if (bar) ro.observe(bar)
    window.addEventListener('resize', place)
    if (document.fonts) document.fonts.ready.then(place) // re-check after fonts load
    return () => {
      ro.disconnect()
      window.removeEventListener('resize', place)
    }
  }, [bottomKey, counts])

  // phone sheet open: stop the page behind from scrolling
  useEffect(() => {
    document.body.style.overflow = sheet ? 'hidden' : ''
    return () => {
      document.body.style.overflow = ''
    }
  }, [sheet])

  // move the red pill under the current tab
  useLayoutEffect(() => {
    const nav = navRef.current
    function place() {
      const el = activeKey && tabRefs.current[activeKey]
      if (!el) {
        setInd(null)
        return
      }
      setInd({ left: el.offsetLeft, width: el.offsetWidth })
      if (nav && nav.scrollWidth > nav.clientWidth) {
        nav.scrollTo({ left: el.offsetLeft - nav.clientWidth / 2 + el.offsetWidth / 2, behavior: 'smooth' })
      }
    }
    place()
    const ro = new ResizeObserver(place)
    if (nav) ro.observe(nav)
    window.addEventListener('resize', place)
    if (document.fonts) document.fonts.ready.then(place) // re-check after fonts load
    return () => {
      ro.disconnect()
      window.removeEventListener('resize', place)
    }
  }, [activeKey, counts])

  // number badges: new leads + unpaid invoices
  useEffect(() => {
    let alive = true
    async function load() {
      try {
        const [l, d] = await Promise.all([
          supabase.from('leads').select('id', { count: 'exact', head: true }).eq('stage', 'New'),
          supabase.from('documents').select('total, amount_paid').eq('doc_type', 'invoice')
            .not('status', 'in', '("Paid","Cancelled")'),
        ])
        if (!alive) return
        const unpaid = (d.data || []).filter((r) => Number(r.total || 0) - Number(r.amount_paid || 0) > 0.009).length
        setCounts({ leads: l.count || 0, unpaid })
      } catch {
        // network hiccup: keep the last numbers
      }
    }
    load()
    const t = setInterval(load, 120000)
    return () => {
      alive = false
      clearInterval(t)
    }
  }, [loc.pathname])

  // close pop-ups: tap outside, Esc, scroll or resize
  useEffect(() => {
    const outside = (e) => {
      if (e.target.closest && e.target.closest('[data-drop-btn]')) return
      if (dropRef.current && !dropRef.current.contains(e.target)) setDrop(null)
      if (quickRef.current && !quickRef.current.contains(e.target)) setQuick(false)
      if (userRef.current && !userRef.current.contains(e.target)) setUserMenu(false)
    }
    const esc = (e) => {
      if (e.key === 'Escape') {
        setSheet(false)
        setDrop(null)
        setQuick(false)
        setUserMenu(false)
      }
    }
    const closeDrop = () => setDrop(null)
    document.addEventListener('mousedown', outside)
    document.addEventListener('touchstart', outside)
    document.addEventListener('keydown', esc)
    window.addEventListener('scroll', closeDrop, true)
    window.addEventListener('resize', closeDrop)
    return () => {
      document.removeEventListener('mousedown', outside)
      document.removeEventListener('touchstart', outside)
      document.removeEventListener('keydown', esc)
      window.removeEventListener('scroll', closeDrop, true)
      window.removeEventListener('resize', closeDrop)
    }
  }, [])

  // Phone view: give every table cell its column name, so tables can show as cards
  useEffect(() => {
    const label = () => {
      document.querySelectorAll('table.data').forEach((t) => {
        const heads = [...t.querySelectorAll('thead th')].map((th) => th.textContent.trim())
        t.querySelectorAll('tbody tr').forEach((tr) => {
          ;[...tr.children].forEach((td, i) => {
            const l = heads[i] ?? ''
            if (td.getAttribute('data-label') !== l) td.setAttribute('data-label', l)
          })
        })
      })
    }
    label()
    const obs = new MutationObserver(label)
    obs.observe(document.body, { childList: true, subtree: true })
    return () => obs.disconnect()
  }, [])

  const name = profile?.full_name || session?.user?.email || 'User'
  const email = session?.user?.email || ''

  function openDrop(tab, e) {
    setQuick(false)
    setUserMenu(false)
    if (drop && drop.key === tab.key) {
      setDrop(null)
      return
    }
    const r = e.currentTarget.getBoundingClientRect()
    const w = 260
    const left = Math.max(12, Math.min(r.left + r.width / 2 - w / 2, window.innerWidth - w - 12))
    setDrop({ key: tab.key, left, top: r.bottom + 10 })
  }

  function go(to) {
    setDrop(null)
    setQuick(false)
    setUserMenu(false)
    navigate(to)
  }

  const dropTab = drop && (drop.key === 'settings' ? SETTINGS : TABS.find((t) => t.key === drop.key))
  const onSettings = loc.pathname.startsWith('/settings')

  return (
    <div className="app-shell sx">
      <div className="main-area">
        <header className="gv-top">
          <Link to="/" className="gv-logo" aria-label="Dashboard">
            <span className="gv-logo-img">
              <img src="/sarvesh-logo.png" alt="Sarvesh CRM" />
            </span>
            Sarvesh CRM <span className="demo-pill">DEMO</span>
          </Link>

          <div className="gv-spacer" />
          <div className="gv-break" />

          <nav className="gv-tabs" ref={navRef}>
            {ind && (
              <span
                className="gv-ind"
                style={{ width: ind.width, transform: 'translateX(' + ind.left + 'px)' }}
              />
            )}
            {TABS.map((t) => {
              const on = t.key === activeKey
              const n = t.badge ? counts[t.badge] : 0
              const inner = (
                <>
                  {t.label}
                  {n > 0 && <span className="gv-count">{n > 99 ? '99+' : n}</span>}
                  {t.items && <ChevronDown className="gv-caret" />}
                </>
              )
              const cls = 'gv-tab' + (on ? ' on' : '') + (drop && drop.key === t.key ? ' open' : '')
              return t.items ? (
                <button
                  key={t.key}
                  ref={(el) => { tabRefs.current[t.key] = el }}
                  className={'icon ' + cls}
                  data-drop-btn
                  onClick={(e) => openDrop(t, e)}
                >
                  {inner}
                </button>
              ) : (
                <Link
                  key={t.key}
                  ref={(el) => { tabRefs.current[t.key] = el }}
                  to={t.to}
                  className={cls}
                  onClick={() => setDrop(null)}
                >
                  {inner}
                </Link>
              )
            })}
          </nav>

          <div className="gv-actions">
            <button
              className={'icon gv-pill' + (onSettings ? ' on' : '') + (drop && drop.key === 'settings' ? ' open' : '')}
              data-drop-btn
              onClick={(e) => openDrop(SETTINGS, e)}
              aria-label="Settings"
            >
              <Settings size={16} />
              <span>Settings</span>
            </button>

            <div className="gv-wrap" ref={quickRef}>
              <button
                className={'icon gv-plus' + (quick ? ' on' : '')}
                onClick={() => { setQuick(!quick); setUserMenu(false); setDrop(null) }}
                aria-label="Quick create"
              >
                <Plus size={19} />
              </button>
              {quick && (
                <div className="gv-drop gv-pop">
                  <div className="gv-drop-head">Create new</div>
                  {QUICK.map((q) => {
                    const QIcon = q.icon
                    return (
                      <button key={q.to} className="icon gv-drop-item" onClick={() => go(q.to)}>
                        <span className="gv-drop-ico"><QIcon size={15} /></span>
                        {q.label}
                      </button>
                    )
                  })}
                </div>
              )}
            </div>

            <button
              className="icon gv-me gv-theme"
              onClick={toggleTheme}
              aria-label={theme === 'light' ? 'Switch to dark mode' : 'Switch to light mode'}
              title={theme === 'light' ? 'Dark mode' : 'Light mode'}
            >
              {theme === 'light' ? <Moon key="moon" size={18} className="gv-theme-spin" /> : <Sun key="sun" size={18} className="gv-theme-spin" />}
            </button>

            <NotificationBell />

            <div className="gv-wrap" ref={userRef}>
              <button
                className="icon gv-me"
                onClick={() => { setUserMenu(!userMenu); setQuick(false); setDrop(null) }}
                aria-label="Profile"
              >
                {initials(name)}
              </button>
              {userMenu && (
                <div className="gv-drop gv-pop">
                  <div className="gv-user">
                    <span className="gv-me gv-me-lg">{initials(name)}</span>
                    <div>
                      <b>{name}</b>
                      <small>{email}</small>
                    </div>
                  </div>
                  <button className="icon gv-drop-item" onClick={toggleTheme}>
                    <span className="gv-drop-ico">{theme === 'light' ? <Moon size={15} /> : <Sun size={15} />}</span>
                    {theme === 'light' ? 'Dark mode' : 'Light mode'}
                  </button>
                  <button className="icon gv-drop-item" onClick={() => go('/settings/company')}>
                    <span className="gv-drop-ico"><Settings size={15} /></span>
                    Settings
                  </button>
                  <button className="icon gv-drop-item gv-out" onClick={signOut}>
                    <span className="gv-drop-ico"><LogOut size={15} /></span>
                    Sign out
                  </button>
                </div>
              )}
            </div>
          </div>
        </header>

        {dropTab && (
          <div className="gv-drop gv-fixed" ref={dropRef} style={{ left: drop.left, top: drop.top }}>
            <div className="gv-drop-head">{dropTab.label}</div>
            {dropTab.items.map((it) => {
              const on = fullPath === it.to || matchItem(it.to, loc, true)
              return (
                <Link key={it.to} to={it.to} className={'gv-drop-link' + (on ? ' on' : '')} onClick={() => setDrop(null)}>
                  {it.label}
                  {on && <span className="gv-dot" />}
                </Link>
              )
            })}
          </div>
        )}

        <main className="page gv-page" key={loc.pathname}>
          <Outlet />
        </main>

        {/* ---------- Phone: bottom bar ---------- */}
        <nav className="gv-bottom" ref={bottomRef}>
          {bind && (
            <span className="gv-bind" style={{ width: bind.width, transform: 'translateX(' + bind.left + 'px)' }} />
          )}
          {BOTTOM.map((b) => {
            const BIcon = b.icon
            const n = b.badge ? counts[b.badge] : 0
            return (
              <Link
                key={b.key}
                ref={(el) => { bottomRefs.current[b.key] = el }}
                to={b.to}
                className={'gv-bitem' + (bottomKey === b.key ? ' on' : '')}
                onClick={() => setSheet(false)}
              >
                <BIcon />
                {b.label}
                {n > 0 && <span className="gv-bbadge">{n > 99 ? '99+' : n}</span>}
              </Link>
            )
          })}
          <button
            ref={(el) => { bottomRefs.current.more = el }}
            className={'icon gv-bitem' + (bottomKey === 'more' ? ' on' : '')}
            onClick={() => { setSheet(!sheet); setQuick(false); setUserMenu(false); setDrop(null) }}
          >
            <LayoutGrid />
            More
          </button>
        </nav>

        {/* ---------- Phone: "More" sheet that slides up ---------- */}
        <div className={'gv-sheet-bg' + (sheet ? ' show' : '')} onClick={() => setSheet(false)} />
        <div className={'gv-sheet' + (sheet ? ' show' : '')} aria-hidden={!sheet}>
          <div
            className="gv-sheet-top"
            onTouchStart={(e) => { touchY.current = e.touches[0].clientY }}
            onTouchEnd={(e) => {
              if (touchY.current !== null && e.changedTouches[0].clientY - touchY.current > 70) setSheet(false)
              touchY.current = null
            }}
          >
            <div className="gv-sheet-handle" />
            <div className="gv-sheet-head">
              <b>All pages</b>
              <button className="icon gv-sheet-x" onClick={() => setSheet(false)} aria-label="Close">
                <X size={18} />
              </button>
            </div>
          </div>
          <div className="gv-sheet-body">
            {(() => {
              let i = 0
              return SHEET.map((g) => (
                <div key={g.label}>
                  <div className="gv-drop-head">{g.label}</div>
                  <div className="gv-grid">
                    {g.items.map((it) => {
                      const TIcon = it.icon
                      const on = fullPath === it.to || matchItem(it.to, loc, true)
                      return (
                        <Link
                          key={it.to}
                          to={it.to}
                          className={'gv-tile' + (on ? ' on' : '')}
                          style={{ '--i': i++ }}
                          onClick={() => setSheet(false)}
                          tabIndex={sheet ? 0 : -1}
                        >
                          <span className="gv-tile-ico"><TIcon size={19} /></span>
                          {it.label}
                        </Link>
                      )
                    })}
                  </div>
                </div>
              ))
            })()}
          </div>
        </div>
      </div>
    </div>
  )
}