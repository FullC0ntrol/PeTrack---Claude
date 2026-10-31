import { useCallback, useMemo, useRef, useState } from 'react'
import Icon from '../components/ui/Icon.jsx'
import { ToastContext } from './contexts.js'

// Krótkie potwierdzenia („Zapisano”, „Skopiowano link”) – pigułka u góry ekranu.
export default function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([])
  const nextId = useRef(1)

  const show = useCallback((message, { tone = 'success' } = {}) => {
    const id = nextId.current++
    setToasts((list) => [...list.slice(-2), { id, message, tone }])
    setTimeout(() => setToasts((list) => list.filter((t) => t.id !== id)), 3200)
  }, [])

  const value = useMemo(() => ({ show }), [show])

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div
        aria-live="polite"
        className="pointer-events-none fixed inset-x-0 top-[calc(env(safe-area-inset-top)+0.75rem)] z-1000 flex flex-col items-center gap-2 px-4 print:hidden"
      >
        {toasts.map((toast) => (
          <div
            key={toast.id}
            role="status"
            className="flex animate-pop items-center gap-2 rounded-full bg-ink px-4 py-2.5 text-sm font-semibold text-bg shadow-lift"
          >
            <span
              className={`grid size-6 place-items-center rounded-full ${toast.tone === 'error' ? 'bg-alert text-white' : 'bg-accent text-on-accent'}`}
            >
              <Icon name={toast.tone === 'error' ? 'alert' : 'check'} size={14} strokeWidth={3} />
            </span>
            {toast.message}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  )
}
