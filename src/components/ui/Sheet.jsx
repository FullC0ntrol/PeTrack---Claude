import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'

/*
  Arkusz wysuwany od dołu (bottom sheet). Zamykanie: tło, Escape, przeciągnięcie w dół za uchwyt.
  Fokus trafia do arkusza, a po zamknięciu wraca na przycisk, który go otworzył.
  Na desktopie arkusz jest wyśrodkowaną „kartą” przy dolnej krawędzi, a nie pełną szerokością.
*/
export default function Sheet({ open, onClose, title, children, className = '' }) {
  const panelRef = useRef(null)
  const drag = useRef(null)
  const [offset, setOffset] = useState(0)
  // Rodzic zwykle podaje funkcję inline – trzymamy ją w ref, żeby efekt nie startował co render.
  const onCloseRef = useRef(onClose)
  useEffect(() => {
    onCloseRef.current = onClose
  })

  useEffect(() => {
    if (!open) return undefined
    const previous = document.activeElement
    const onKey = (event) => {
      if (event.key === 'Escape') onCloseRef.current()
      // Prosta pułapka fokusu: Tab nie wychodzi poza arkusz.
      if (event.key === 'Tab' && panelRef.current) {
        const focusable = panelRef.current.querySelectorAll('a[href],button:not([disabled]),input,textarea,select,[tabindex="0"]')
        if (!focusable.length) return
        const first = focusable[0]
        const last = focusable[focusable.length - 1]
        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault()
          last.focus()
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault()
          first.focus()
        }
      }
    }
    document.addEventListener('keydown', onKey)
    const overflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    panelRef.current?.focus()
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = overflow
      setOffset(0)
      previous?.focus?.()
    }
  }, [open])

  if (!open) return null

  const onPointerDown = (event) => {
    drag.current = { y: event.clientY }
    event.currentTarget.setPointerCapture(event.pointerId)
  }
  const onPointerMove = (event) => {
    if (drag.current) setOffset(Math.max(0, event.clientY - drag.current.y))
  }
  const onPointerUp = () => {
    if (!drag.current) return
    drag.current = null
    if (offset > 90) onClose()
    else setOffset(0)
  }

  return createPortal(
    <div className="fixed inset-0 z-900 print:hidden">
      <button
        type="button"
        aria-label="Zamknij"
        tabIndex={-1}
        onClick={onClose}
        className="absolute inset-0 animate-fade bg-black/45 backdrop-blur-[2px]"
      />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        tabIndex={-1}
        style={{ transform: offset ? `translateY(${offset}px)` : undefined }}
        className={`absolute inset-x-0 bottom-0 mx-auto max-h-[88dvh] w-full max-w-xl animate-sheet overflow-y-auto rounded-t-5xl bg-surface pb-[calc(env(safe-area-inset-bottom)+1.25rem)] shadow-lift outline-none sm:bottom-4 sm:rounded-5xl ${offset ? '' : 'transition-transform'} ${className}`}
      >
        <div
          className="sticky top-0 z-10 flex cursor-grab touch-none justify-center bg-surface pt-3 pb-2"
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerUp}
        >
          <span className="h-1.5 w-12 rounded-full bg-line" />
        </div>
        {title && <h2 className="px-6 pb-3 text-xl font-bold">{title}</h2>}
        <div className="px-4 sm:px-5">{children}</div>
      </div>
    </div>,
    document.body,
  )
}
