import { useEffect, useRef, useState } from 'react'

// Shared helper for our own dropdown and date picker pop-ups.
// It places the pop-up under (or above) the field and closes it on outside click, Escape, scroll or resize.
export default function usePopup(menuHeight = 260, minWidth = 0) {
  const [open, setOpen] = useState(false)
  const [pos, setPos] = useState(null)
  const ref = useRef(null)
  const menuRef = useRef(null)

  function toggle() {
    if (open) {
      setOpen(false)
      return
    }
    if (ref.current) {
      const r = ref.current.getBoundingClientRect()
      const spaceBelow = window.innerHeight - r.bottom
      const up = spaceBelow < menuHeight && r.top > spaceBelow
      const width = Math.max(r.width, minWidth)
      const left = Math.max(8, Math.min(r.left, window.innerWidth - width - 8))
      setPos({
        left,
        width,
        top: up ? undefined : r.bottom + 4,
        bottom: up ? window.innerHeight - r.top + 4 : undefined,
        maxHeight: Math.max(160, Math.min(menuHeight, (up ? r.top : spaceBelow) - 12)),
      })
    }
    setOpen(true)
  }

  useEffect(() => {
    if (!open) return
    function onDown(e) {
      const inField = ref.current && ref.current.contains(e.target)
      const inMenu = menuRef.current && menuRef.current.contains(e.target)
      if (!inField && !inMenu) setOpen(false)
    }
    function onKey(e) {
      if (e.key === 'Escape') setOpen(false)
    }
    function onScroll(e) {
      if (menuRef.current && menuRef.current.contains(e.target)) return
      setOpen(false)
    }
    function onResize() {
      setOpen(false)
    }
    document.addEventListener('mousedown', onDown)
    document.addEventListener('keydown', onKey)
    window.addEventListener('scroll', onScroll, true)
    window.addEventListener('resize', onResize)
    return () => {
      document.removeEventListener('mousedown', onDown)
      document.removeEventListener('keydown', onKey)
      window.removeEventListener('scroll', onScroll, true)
      window.removeEventListener('resize', onResize)
    }
  }, [open])

  return { open, setOpen, toggle, ref, menuRef, pos }
}
