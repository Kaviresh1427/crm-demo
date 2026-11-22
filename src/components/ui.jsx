import { useLayoutEffect, useRef, useState } from 'react'

export function PageHeader({ icon: Icon, title, subtitle, children }) {
  return (
    <div className="ph">
      {Icon && (
        <div className="ph-icon">
          <Icon size={30} />
        </div>
      )}
      <div>
        <h2>{title}</h2>
        {subtitle && <p>{subtitle}</p>}
      </div>
      <div className="ph-actions">{children}</div>
    </div>
  )
}

export function Stats({ children }) {
  return <div className="stats">{children}</div>
}

export function StatCard({ color = 'blue', icon: Icon, label, value, sub }) {
  return (
    <div className={'stat ' + color}>
      {Icon && (
        <div className="stat-icon">
          <Icon size={20} />
        </div>
      )}
      <div>
        <div className="stat-label">{label}</div>
        <div className="stat-value">{value}</div>
        {sub && <div className="stat-sub">{sub}</div>}
      </div>
    </div>
  )
}

// Pill tabs with a red highlight that slides to the chosen tab (same as the top menu).
// Many tabs wrap onto a second row - no sideways scrolling.
// More than 5 tabs = neat grid of equal boxes (name on the left, count on the right).
export function Tabs({ tabs, value, onChange }) {
  const boxRef = useRef(null)
  const btnRefs = useRef({})
  const [ind, setInd] = useState(null)
  const sig = tabs.map((t) => t.key + ':' + (t.count ?? '') + ':' + t.label).join('|')

  useLayoutEffect(() => {
    const box = boxRef.current
    function place() {
      const el = btnRefs.current[value]
      if (!el) {
        setInd(null)
        return
      }
      setInd({ left: el.offsetLeft, top: el.offsetTop, width: el.offsetWidth, height: el.offsetHeight })
    }
    place()
    const ro = new ResizeObserver(place)
    if (box) ro.observe(box)
    window.addEventListener('resize', place)
    if (document.fonts) document.fonts.ready.then(place) // re-check after fonts load
    return () => {
      ro.disconnect()
      window.removeEventListener('resize', place)
    }
  }, [value, sig])

  return (
    <div className={tabs.length > 5 ? 'tabs tabs-grid' : 'tabs'} ref={boxRef}>
      {ind && (
        <span
          className="gv-ind"
          style={{ width: ind.width, height: ind.height, transform: 'translate(' + ind.left + 'px, ' + ind.top + 'px)' }}
        />
      )}
      {tabs.map((t) => (
        <button
          key={t.key}
          ref={(el) => { btnRefs.current[t.key] = el }}
          type="button"
          className={value === t.key ? 'tab on' : 'tab'}
          onClick={() => onChange(t.key)}
        >
          <span className="tab-l">{t.label}</span>
          {t.count !== undefined && <span className="tab-n">{t.count}</span>}
        </button>
      ))}
    </div>
  )
}

export function Panel({ title, icon: Icon, action, children, className = '' }) {
  return (
    <div className={'panel ' + className}>
      {(title || action) && (
        <div className="panel-head">
          <h3>
            {Icon && <Icon size={17} />}
            {title}
          </h3>
          {action}
        </div>
      )}
      {children}
    </div>
  )
}