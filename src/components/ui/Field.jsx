import { useId } from 'react'

/*
  Pole formularza z etykietą, podpowiedzią i błędem. `children` to funkcja dostająca atrybuty
  dostępności (id, aria-describedby, aria-invalid) – dzięki temu działa z input, textarea i select.
*/
export default function Field({ label, hint, error, optional, className = '', children }) {
  const id = useId()
  const describedBy = [hint && `${id}-hint`, error && `${id}-error`].filter(Boolean).join(' ') || undefined
  return (
    <div className={className}>
      <label htmlFor={id} className="mb-1.5 flex items-baseline justify-between gap-2 text-sm font-semibold">
        <span>{label}</span>
        {optional && <span className="text-xs font-medium text-muted">opcjonalnie</span>}
      </label>
      {children({ id, 'aria-describedby': describedBy, 'aria-invalid': error ? true : undefined })}
      {hint && !error && (
        <p id={`${id}-hint`} className="mt-1.5 text-sm text-muted">
          {hint}
        </p>
      )}
      {error && (
        <p id={`${id}-error`} className="mt-1.5 animate-fade text-sm font-medium text-alert-text">
          {error}
        </p>
      )}
    </div>
  )
}

export function TextField({ label, hint, error, optional, className, multiline = false, rows = 3, ...inputProps }) {
  return (
    <Field label={label} hint={hint} error={error} optional={optional} className={className}>
      {(a11y) =>
        multiline ? (
          <textarea rows={rows} className="field resize-none" {...a11y} {...inputProps} />
        ) : (
          <input className="field" {...a11y} {...inputProps} />
        )
      }
    </Field>
  )
}
