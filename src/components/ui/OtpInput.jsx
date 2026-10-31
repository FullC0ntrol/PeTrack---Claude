import { useRef, useState } from 'react'

/*
  Pole na 6-cyfrowy kod. Jedno prawdziwe <input> (przezroczyste, na wierzchu) obsługuje wpisywanie,
  wklejanie i autouzupełnianie kodu z SMS/maila (autocomplete="one-time-code"), a pod spodem
  rysujemy 6 „kafelków”. Dzięki temu nie ma problemów z przeskakiwaniem fokusu między polami.
*/
export default function OtpInput({ value, onChange, onComplete, invalid, disabled, id, describedBy, autoFocus }) {
  const inputRef = useRef(null)
  const [focused, setFocused] = useState(false)
  const digits = value.padEnd(6, ' ').slice(0, 6).split('')
  const active = Math.min(value.length, 5)

  return (
    <div className={`relative ${invalid ? 'animate-shake' : ''}`} onClick={() => inputRef.current?.focus()}>
      <input
        ref={inputRef}
        id={id}
        aria-describedby={describedBy}
        aria-invalid={invalid || undefined}
        aria-label="Kod z maila (6 cyfr)"
        // Klawiatura numeryczna na telefonie.
        inputMode="numeric"
        autoComplete="one-time-code"
        pattern="\d{6}"
        maxLength={6}
        autoFocus={autoFocus}
        disabled={disabled}
        value={value}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        onChange={(event) => {
          const next = event.target.value.replace(/\D/g, '').slice(0, 6)
          onChange(next)
          if (next.length === 6) onComplete?.(next)
        }}
        className="absolute inset-0 z-10 h-full w-full cursor-text opacity-0"
      />
      <div className="grid grid-cols-6 gap-2 sm:gap-3" aria-hidden="true">
        {digits.map((digit, i) => {
          const isActive = focused && i === active && !disabled
          return (
            <span
              key={i}
              className={`grid aspect-[4/5] place-items-center rounded-2xl border-2 font-display text-2xl font-bold transition-all duration-150 sm:text-3xl ${
                invalid
                  ? 'border-alert bg-alert-soft'
                  : digit.trim()
                    ? 'animate-pop border-transparent bg-accent-soft text-ink'
                    : 'border-transparent bg-raised'
              } ${isActive ? 'border-accent!' : ''}`}
            >
              {digit.trim()}
            </span>
          )
        })}
      </div>
    </div>
  )
}
