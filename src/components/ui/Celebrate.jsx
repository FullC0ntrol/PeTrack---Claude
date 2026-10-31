import { PET_COLORS } from '../../lib/petColors.js'

// Animowany znak „✓” w kółku – potwierdzenie udanej akcji.
export function CheckBurst({ size = 96, className = '' }) {
  return (
    <span className={`relative inline-grid place-items-center ${className}`} style={{ width: size, height: size }}>
      <span className="absolute inset-0 animate-ping-soft rounded-full bg-pet/50" />
      <span className="relative grid size-full animate-pop place-items-center rounded-full bg-pet text-on-pet shadow-lift">
        <svg viewBox="0 0 24 24" width={size * 0.5} height={size * 0.5} fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M5 12.5l4.5 4.5L19 7.5" strokeDasharray="48" className="animate-draw" />
        </svg>
      </span>
    </span>
  )
}

// Deszcz konfetti z kolorów zwierząt – czysty CSS (klasa .confetti w index.css).
const PIECES = Array.from({ length: 44 }, (_, i) => {
  // Deterministyczny „los” – te same wartości przy każdym renderze.
  const r = (n) => ((Math.sin(i * 9301 + n * 49297) + 1) / 2) % 1
  return {
    left: `${Math.round(r(1) * 100)}%`,
    color: PET_COLORS[i % PET_COLORS.length].hex,
    delay: `${(r(2) * 0.8).toFixed(2)}s`,
    duration: `${(2.2 + r(3) * 1.6).toFixed(2)}s`,
    x: `${Math.round((r(4) - 0.5) * 220)}px`,
    rotate: `${Math.round(360 + r(5) * 540)}deg`,
    round: i % 3 === 0,
  }
})

export function Confetti() {
  return (
    <div className="confetti" aria-hidden="true">
      {PIECES.map((p, i) => (
        <i
          key={i}
          style={{
            left: p.left,
            background: p.color,
            borderRadius: p.round ? '999px' : undefined,
            '--delay': p.delay,
            '--d': p.duration,
            '--x': p.x,
            '--r': p.rotate,
          }}
        />
      ))}
    </div>
  )
}
