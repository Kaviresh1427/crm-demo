import { createPortal } from 'react-dom'
import usePopup from './usePopup'

// Our own themed dropdown. onChange gives the new value directly (not an event).
// options can be a list of text, or a list of { value, label }.
export default function Select({ value, onChange, options, placeholder = 'Select...' }) {
  const { open, setOpen, toggle, ref, menuRef, pos } = usePopup(260, 0)
  const items = options.map((o) => (typeof o === 'string' ? { value: o, label: o } : o))
  const current = items.find((o) => o.value === value)

  return (
    <div className="sel" ref={ref}>
      <button type="button" className={'sel-btn' + (open ? ' open' : '')} onClick={toggle}>
        <span className={current ? 'sel-text' : 'sel-text sel-ph'}>
          {current ? current.label : placeholder}
        </span>
        <span className="sel-arrow">&#9662;</span>
      </button>
      {open && pos && createPortal(
        <div
          className="pop sel-menu"
          ref={menuRef}
          style={{ left: pos.left, width: pos.width, top: pos.top, bottom: pos.bottom, maxHeight: pos.maxHeight }}
        >
          {items.map((o) => (
            <button
              type="button"
              key={String(o.value)}
              className={'sel-opt' + (o.value === value ? ' on' : '')}
              onClick={() => {
                onChange(o.value)
                setOpen(false)
              }}
            >
              {o.label}
            </button>
          ))}
        </div>,
        document.body
      )}
    </div>
  )
}
