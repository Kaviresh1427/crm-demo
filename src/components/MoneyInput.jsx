import { useEffect, useRef } from 'react'

// Amount box that works like a bank app: digits fill in from the right.
// Typing 1 2 5 0 0 shows 125.00. Backspace removes the last digit.
// It gives the parent the amount as text (for example "125.00"), or "" when empty.
function toCents(value) {
  if (value === '' || value === null || value === undefined) return 0
  const n = Number(value)
  if (!isFinite(n)) return 0
  return Math.round(n * 100)
}

function show(cents) {
  const whole = Math.floor(cents / 100).toLocaleString('en-MY')
  const dec = String(cents % 100).padStart(2, '0')
  return whole + '.' + dec
}

export default function MoneyInput({ value, onChange, placeholder = '0.00', disabled, className }) {
  const ref = useRef(null)
  const cents = toCents(value)
  const text = cents === 0 && (value === '' || value === null || value === undefined) ? '' : show(cents)

  // keep the cursor at the end
  useEffect(() => {
    const el = ref.current
    if (el && document.activeElement === el) {
      const n = el.value.length
      el.setSelectionRange(n, n)
    }
  })

  function handle(e) {
    const digits = e.target.value.replace(/\D/g, '').replace(/^0+/, '').slice(0, 12)
    const next = digits ? Number(digits) : 0
    onChange({ target: { value: next === 0 ? '' : (next / 100).toFixed(2) } })
  }

  return (
    <input
      ref={ref}
      type="text"
      inputMode="numeric"
      autoComplete="off"
      className={className}
      style={{ textAlign: 'right' }}
      placeholder={placeholder}
      disabled={disabled}
      value={text}
      onChange={handle}
      onFocus={(e) => {
        const n = e.target.value.length
        requestAnimationFrame(() => e.target.setSelectionRange(n, n))
      }}
      onClick={(e) => {
        const n = e.target.value.length
        e.target.setSelectionRange(n, n)
      }}
    />
  )
}
