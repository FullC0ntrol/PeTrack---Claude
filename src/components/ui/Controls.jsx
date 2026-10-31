import Icon from './Icon.jsx'

// Przełącznik tak/nie z etykietą i opisem – cały wiersz jest klikalny.
export function Switch({ checked, onChange, label, description, disabled }) {
  return (
    <label className={`flex cursor-pointer items-start gap-4 rounded-3xl bg-raised p-4 ${disabled ? 'opacity-60' : ''}`}>
      <span className="flex-1">
        <span className="block font-semibold">{label}</span>
        {description && <span className="mt-0.5 block text-sm text-muted">{description}</span>}
      </span>
      <input
        type="checkbox"
        role="switch"
        className="peer sr-only"
        checked={checked}
        disabled={disabled}
        onChange={(event) => onChange(event.target.checked)}
      />
      <span
        aria-hidden="true"
        className="relative mt-0.5 h-8 w-14 shrink-0 rounded-full bg-line transition-colors peer-checked:bg-pet peer-focus-visible:outline-3 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-accent after:absolute after:top-1 after:left-1 after:size-6 after:rounded-full after:bg-white after:shadow-soft after:transition-transform after:duration-200 after:ease-spring peer-checked:after:translate-x-6"
      />
    </label>
  )
}

/*
  Duże karty wyboru (gatunek, stan zwierzęcia, czas ważności) – radio w przebraniu.
  `columns` steruje układem siatki.
*/
export function ChoiceCards({ name, value, onChange, options, columns = 3, size = 'md', legend }) {
  return (
    <fieldset>
      {legend && <legend className="mb-2 text-sm font-semibold">{legend}</legend>}
      <div className="grid gap-3" style={{ gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` }}>
        {options.map((option) => {
          const selected = option.value === value
          return (
            <label
              key={option.value}
              className={`relative flex cursor-pointer flex-col items-center justify-center gap-2 rounded-3xl border-2 text-center transition-all duration-200 has-[:focus-visible]:outline-3 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-accent ${
                size === 'lg' ? 'min-h-28 p-4' : 'min-h-20 p-3'
              } ${selected ? 'scale-[1.02] border-pet bg-pet-soft text-ink shadow-soft' : 'border-transparent bg-raised text-ink hover:border-line'}`}
            >
              <input
                type="radio"
                name={name}
                value={option.value}
                checked={selected}
                onChange={() => onChange(option.value)}
                className="sr-only"
              />
              {option.art}
              {option.icon && <Icon name={option.icon} size={26} className={selected ? 'text-pet-text' : 'text-muted'} />}
              <span className="text-sm leading-tight font-semibold">{option.label}</span>
              {option.description && <span className="text-xs leading-snug text-muted">{option.description}</span>}
              {selected && (
                <span className="absolute top-2 right-2 grid size-6 animate-pop place-items-center rounded-full bg-pet text-on-pet">
                  <Icon name="check" size={14} strokeWidth={3} />
                </span>
              )}
            </label>
          )
        })}
      </div>
    </fieldset>
  )
}

// Pasek postępu kreatora: „Krok 2 z 5” + wypełniający się pasek w kolorze zwierzęcia.
export function ProgressBar({ step, total, label }) {
  const percent = Math.round(((step + 1) / total) * 100)
  return (
    <div>
      <div className="mb-2 flex items-baseline justify-between text-sm">
        <span className="font-semibold">{label}</span>
        <span className="text-muted">
          Krok {step + 1} z {total}
        </span>
      </div>
      <div
        className="h-2.5 overflow-hidden rounded-full bg-raised"
        role="progressbar"
        aria-valuemin={1}
        aria-valuemax={total}
        aria-valuenow={step + 1}
        aria-label={`Krok ${step + 1} z ${total}`}
      >
        <div className="h-full rounded-full bg-pet transition-[width] duration-500 ease-out-soft" style={{ width: `${percent}%` }} />
      </div>
    </div>
  )
}

// Kropki postępu na ścieżce znalazcy.
export function StepDots({ step, total }) {
  return (
    <div className="flex items-center gap-1.5" aria-label={`Krok ${step + 1} z ${total}`} role="img">
      {Array.from({ length: total }, (_, i) => (
        <span
          key={i}
          className={`h-2 rounded-full transition-all duration-300 ${i === step ? 'w-7 bg-pet-text' : i < step ? 'w-2 bg-pet-text/60' : 'w-2 bg-line'}`}
        />
      ))}
    </div>
  )
}

export function Badge({ children, tone = 'accent', className = '' }) {
  const tones = {
    accent: 'bg-accent text-on-accent',
    alert: 'bg-alert text-white',
    soft: 'bg-raised text-muted',
    ok: 'bg-ok-soft text-ok-text',
    pet: 'bg-pet-soft text-pet-text',
  }
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-bold ${tones[tone]} ${className}`}>
      {children}
    </span>
  )
}

export function ErrorState({ error, onRetry, title = 'Nie udało się wczytać' }) {
  return (
    <div role="alert" className="card mx-auto max-w-md animate-rise text-center">
      <span className="mx-auto grid size-14 place-items-center rounded-full bg-alert-soft text-alert-text">
        <Icon name="alert" size={28} />
      </span>
      <h2 className="mt-4 text-xl font-bold">{title}</h2>
      <p className="mt-1 text-muted">{error?.message ?? 'Spróbuj ponownie za chwilę.'}</p>
      {onRetry && (
        <button type="button" onClick={() => onRetry()} className="mt-4 font-semibold text-accent-text underline underline-offset-4">
          Spróbuj ponownie
        </button>
      )}
    </div>
  )
}
