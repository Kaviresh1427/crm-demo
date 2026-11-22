import { useState } from 'react'
import { createPortal } from 'react-dom'
import usePopup from './usePopup'

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']
const DAYS = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa']

function pad(n) {
  return String(n).padStart(2, '0')
}
function toStr(y, m, d) {
  return y + '-' + pad(m + 1) + '-' + pad(d)
}
function parse(v) {
  if (!v) return null
  const [y, m, d] = v.split('-').map(Number)
  return { y, m: m - 1, d }
}
function show(v) {
  const p = parse(v)
  return p ? pad(p.d) + '/' + pad(p.m + 1) + '/' + p.y : ''
}

// Our own themed date picker. value and onChange use text like 2026-11-18 (empty text = no date).
export default function DatePicker({ value, onChange, placeholder = 'Select date' }) {
  const { open, setOpen, toggle, ref, menuRef, pos } = usePopup(350, 290)
  const now = new Date()
  const todayStr = toStr(now.getFullYear(), now.getMonth(), now.getDate())
  const [view, setView] = useState({ y: now.getFullYear(), m: now.getMonth() })

  function onToggle() {
    if (!open) {
      const s = parse(value)
      setView(s ? { y: s.y, m: s.m } : { y: now.getFullYear(), m: now.getMonth() })
    }
    toggle()
  }

  function move(months) {
    setView((v) => {
      const t = v.y * 12 + v.m + months
      return { y: Math.floor(t / 12), m: ((t % 12) + 12) % 12 }
    })
  }

  function pick(d) {
    onChange(toStr(view.y, view.m, d))
    setOpen(false)
  }

  const first = new Date(view.y, view.m, 1).getDay()
  const count = new Date(view.y, view.m + 1, 0).getDate()
  const cells = []
  for (let i = 0; i < first; i++) cells.push(null)
  for (let d = 1; d <= count; d++) cells.push(d)

  return (
    <div className="sel" ref={ref}>
      <button type="button" className={'sel-btn' + (open ? ' open' : '')} onClick={onToggle}>
        <span className={value ? 'sel-text' : 'sel-text sel-ph'}>{value ? show(value) : placeholder}</span>
        <span className="sel-arrow">&#9662;</span>
      </button>
      {open && pos && createPortal(
        <div
          className="pop dp"
          ref={menuRef}
          style={{ left: pos.left, width: pos.width, top: pos.top, bottom: pos.bottom }}
        >
          <div className="dp-head">
            <button type="button" className="dp-nav" onClick={() => move(-12)}>&laquo;</button>
            <button type="button" className="dp-nav" onClick={() => move(-1)}>&lsaquo;</button>
            <div className="dp-title">{MONTHS[view.m]} {view.y}</div>
            <button type="button" className="dp-nav" onClick={() => move(1)}>&rsaquo;</button>
            <button type="button" className="dp-nav" onClick={() => move(12)}>&raquo;</button>
          </div>
          <div className="dp-grid">
            {DAYS.map((d) => (
              <div className="dp-dow" key={d}>{d}</div>
            ))}
            {cells.map((d, i) =>
              d === null ? (
                <div key={'e' + i} />
              ) : (
                <button
                  type="button"
                  key={d}
                  className={
                    'dp-day' +
                    (toStr(view.y, view.m, d) === value ? ' on' : '') +
                    (toStr(view.y, view.m, d) === todayStr ? ' today' : '')
                  }
                  onClick={() => pick(d)}
                >
                  {d}
                </button>
              )
            )}
          </div>
          <div className="dp-foot">
            <button
              type="button"
              className="dp-link"
              onClick={() => {
                onChange('')
                setOpen(false)
              }}
            >
              Clear
            </button>
            <button
              type="button"
              className="dp-link"
              onClick={() => {
                onChange(todayStr)
                setOpen(false)
              }}
            >
              Today
            </button>
          </div>
        </div>,
        document.body
      )}
    </div>
  )
}
