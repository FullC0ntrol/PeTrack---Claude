export default function Spinner({ size = 22, label, className = '' }) {
  return (
    <span className={`inline-flex items-center gap-3 ${className}`} role={label ? 'status' : undefined}>
      <svg width={size} height={size} viewBox="0 0 24 24" className="animate-spin" aria-hidden="true">
        <circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" strokeOpacity="0.2" strokeWidth="3" />
        <path d="M21 12a9 9 0 00-9-9" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
      </svg>
      {label && <span className="text-muted">{label}</span>}
    </span>
  )
}

export function PageSpinner({ label = 'Wczytuję…' }) {
  return (
    <div className="grid min-h-[50dvh] place-items-center text-pet-text">
      <Spinner size={32} label={label} />
    </div>
  )
}
