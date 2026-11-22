import { useEffect, useRef, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { Bell, Globe, CalendarClock, Wallet, Wrench, FileClock, ShieldCheck, CheckCheck } from 'lucide-react'
import { supabase } from '../supabaseClient'

// Bell in the top bar: collects things that need attention from your existing data.

const SEEN_KEY = 'sce-seen-notifications'

function localDate(offsetDays = 0) {
  const d = new Date()
  d.setDate(d.getDate() + offsetDays)
  return d.toLocaleDateString('en-CA') // YYYY-MM-DD in your own time zone
}

function money(n) {
  return 'RM ' + Number(n || 0).toLocaleString('en-MY', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

function showDate(d) {
  if (!d) return ''
  const [y, m, day] = d.split('-')
  return day + '/' + m + '/' + y
}

function readSeen() {
  try {
    return new Set(JSON.parse(localStorage.getItem(SEEN_KEY) || '[]'))
  } catch {
    return new Set()
  }
}

function saveSeen(set) {
  try {
    localStorage.setItem(SEEN_KEY, JSON.stringify([...set].slice(-500)))
  } catch {
    // storage not available: badge simply won't remember
  }
}

async function loadNotifications() {
  const today = localDate()
  const in3 = localDate(3)
  const in30 = localDate(30)
  const weekAgo = localDate(-7)

  const [enquiries, followLeads, reminders, invoices, quotes, jobs, contracts] = await Promise.all([
    supabase.from('leads').select('id, name, company, created_at').eq('source', 'Website').eq('stage', 'New')
      .order('created_at', { ascending: false }).limit(20),
    supabase.from('leads').select('id, name, company, next_follow_up, stage').lte('next_follow_up', today)
      .not('stage', 'in', '("Won","Lost")').order('next_follow_up').limit(20),
    supabase.from('activities').select('id, summary, follow_up_at, customer_id, lead_id, customers(name)')
      .lte('follow_up_at', today).eq('done', false).order('follow_up_at').limit(20),
    supabase.from('documents').select('id, doc_number, due_date, total, amount_paid, status, customers(name)')
      .eq('doc_type', 'invoice').lt('due_date', today).not('status', 'in', '("Paid","Cancelled")').limit(30),
    supabase.from('documents').select('id, doc_number, due_date, status, customers(name)')
      .eq('doc_type', 'quote').gte('due_date', today).lte('due_date', in3).in('status', ['Draft', 'Sent']).limit(20),
    supabase.from('item_receipts').select('id, job_no, status, received_date, contact_name, customers(name)')
      .in('status', ['Received', 'In Progress', 'Ready']).limit(40),
    supabase.from('maintenance_contracts').select('id, contract_no, title, end_date, customers(name)')
      .eq('status', 'Active').gte('end_date', today).lte('end_date', in30).order('end_date').limit(20),
  ])

  const list = []
  const who = (r) => r.customers?.name || r.contact_name || r.company || ''

  ;(enquiries.data || []).forEach((l) =>
    list.push({ key: 'enq-' + l.id, kind: 'enquiry', title: 'New website enquiry', text: l.name + (l.company ? ' (' + l.company + ')' : ''), to: '/leads', urgent: true }))

  ;(followLeads.data || []).forEach((l) =>
    list.push({
      key: 'fu-' + l.id + '-' + l.next_follow_up, kind: 'follow', urgent: l.next_follow_up < today,
      title: l.next_follow_up < today ? 'Follow-up overdue' : 'Follow-up today',
      text: l.name + ' · ' + showDate(l.next_follow_up), to: '/leads',
    }))

  ;(reminders.data || []).forEach((a) =>
    list.push({
      key: 'rem-' + a.id, kind: 'follow', urgent: a.follow_up_at < today,
      title: a.follow_up_at < today ? 'Reminder overdue' : 'Reminder today',
      text: (a.summary || 'Reminder') + (a.customers?.name ? ' · ' + a.customers.name : ''),
      to: a.customer_id ? '/customers/' + a.customer_id : '/leads',
    }))

  ;(invoices.data || [])
    .filter((d) => Number(d.total || 0) - Number(d.amount_paid || 0) > 0.009)
    .forEach((d) =>
      list.push({
        key: 'inv-' + d.id + '-' + d.amount_paid, kind: 'invoice', urgent: true, title: 'Invoice overdue',
        text: d.doc_number + ' · ' + who(d) + ' · ' + money(Number(d.total) - Number(d.amount_paid || 0)) + ' due ' + showDate(d.due_date),
        to: '/documents/' + d.id,
      }))

  ;(quotes.data || []).forEach((d) =>
    list.push({ key: 'qt-' + d.id + '-' + d.due_date, kind: 'quote', title: 'Quotation expiring', text: d.doc_number + ' · ' + who(d) + ' · valid until ' + showDate(d.due_date), to: '/documents/' + d.id }))

  ;(jobs.data || []).forEach((j) => {
    if (j.status === 'Ready') {
      list.push({ key: 'job-ready-' + j.id, kind: 'job', title: 'Ready for pickup', text: j.job_no + ' · ' + who(j), to: '/operations/item-receipts' })
    } else if (j.received_date && j.received_date <= weekAgo) {
      list.push({ key: 'job-wait-' + j.id, kind: 'job', urgent: true, title: 'Repair waiting 7+ days', text: j.job_no + ' · ' + who(j) + ' · since ' + showDate(j.received_date), to: '/operations/item-receipts' })
    }
  })

  ;(contracts.data || []).forEach((c) =>
    list.push({ key: 'con-' + c.id + '-' + c.end_date, kind: 'contract', title: 'Contract ending soon', text: (c.contract_no || c.title || 'Contract') + ' · ' + who(c) + ' · ends ' + showDate(c.end_date), to: '/projects/contracts' }))

  // urgent first
  return list.sort((a, b) => Number(!!b.urgent) - Number(!!a.urgent))
}

const ICONS = { enquiry: Globe, follow: CalendarClock, invoice: Wallet, quote: FileClock, job: Wrench, contract: ShieldCheck }

export default function NotificationBell() {
  const [items, setItems] = useState([])
  const [open, setOpen] = useState(false)
  const [seen, setSeen] = useState(() => readSeen())
  const box = useRef(null)
  const navigate = useNavigate()
  const loc = useLocation()

  async function refresh() {
    try {
      setItems(await loadNotifications())
    } catch {
      // network hiccup: keep the last list
    }
  }

  useEffect(() => {
    refresh()
    const t = setInterval(refresh, 120000) // every 2 minutes
    return () => clearInterval(t)
  }, [])

  useEffect(() => {
    refresh()
    setOpen(false)
  }, [loc.pathname])

  useEffect(() => {
    if (!open) return
    const close = (e) => { if (box.current && !box.current.contains(e.target)) setOpen(false) }
    document.addEventListener('mousedown', close)
    document.addEventListener('touchstart', close)
    return () => {
      document.removeEventListener('mousedown', close)
      document.removeEventListener('touchstart', close)
    }
  }, [open])

  const unseen = items.filter((i) => !seen.has(i.key)).length

  function toggle() {
    const next = !open
    setOpen(next)
    if (next && unseen) {
      const s = new Set(seen)
      items.forEach((i) => s.add(i.key))
      setSeen(s)
      saveSeen(s)
    }
  }

  return (
    <div className="nb" ref={box}>
      <button className="tb-icon nb-btn" aria-label="Notifications" onClick={toggle}>
        <Bell size={17} />
        {unseen > 0 && <span className="nb-badge">{unseen > 9 ? '9+' : unseen}</span>}
      </button>

      {open && (
        <div className="nb-panel">
          <div className="nb-head">
            <b>Notifications</b>
            <span>{items.length ? items.length + ' item' + (items.length > 1 ? 's' : '') : ''}</span>
          </div>
          {items.length === 0 ? (
            <div className="nb-empty">
              <CheckCheck size={22} />
              All clear. Nothing needs your attention.
            </div>
          ) : (
            <div className="nb-list">
              {items.map((n) => {
                const Icon = ICONS[n.kind] || Bell
                return (
                  <button
                    key={n.key}
                    className={'nb-item' + (n.urgent ? ' urgent' : '')}
                    onClick={() => { setOpen(false); navigate(n.to) }}
                  >
                    <span className="nb-ico"><Icon size={16} /></span>
                    <span className="nb-txt">
                      <b>{n.title}</b>
                      <small>{n.text}</small>
                    </span>
                  </button>
                )
              })}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
