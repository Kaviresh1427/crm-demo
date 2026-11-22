import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react'

const ConfirmContext = createContext(null)

// Use inside a page:
//   const confirm = useConfirm()
//   if (!(await confirm('Delete this?'))) return
export function useConfirm() {
  return useContext(ConfirmContext)
}

export function ConfirmProvider({ children }) {
  const [state, setState] = useState(null)
  const resolver = useRef(null)
  const cancelRef = useRef(null)

  const confirm = useCallback((message, opts = {}) => {
    return new Promise((resolve) => {
      resolver.current = resolve
      setState({
        message,
        title: opts.title || 'Please confirm',
        yes: opts.yes || 'Yes, delete',
        no: opts.no || 'Cancel',
      })
    })
  }, [])

  function close(result) {
    setState(null)
    if (resolver.current) resolver.current(result)
    resolver.current = null
  }

  useEffect(() => {
    if (!state) return
    if (cancelRef.current) cancelRef.current.focus()
    function onKey(e) {
      if (e.key === 'Escape') close(false)
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [state])

  return (
    <ConfirmContext.Provider value={confirm}>
      {children}
      {state && (
        <div className="dlg-back" onMouseDown={() => close(false)}>
          <div className="dlg" onMouseDown={(e) => e.stopPropagation()}>
            <h3>{state.title}</h3>
            <p>{state.message}</p>
            <div className="dlg-actions">
              <button type="button" className="small ghost" ref={cancelRef} onClick={() => close(false)}>
                {state.no}
              </button>
              <button type="button" className="small danger" onClick={() => close(true)}>
                {state.yes}
              </button>
            </div>
          </div>
        </div>
      )}
    </ConfirmContext.Provider>
  )
}
