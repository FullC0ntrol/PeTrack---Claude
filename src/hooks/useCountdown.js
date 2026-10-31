import { useEffect, useState } from 'react'

// Ile milisekund zostało do `target` – odświeżane co sekundę, 0 po czasie.
export function useCountdown(target) {
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    if (!target) return undefined
    const timer = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(timer)
  }, [target])
  return target ? Math.max(0, new Date(target).getTime() - now) : 0
}

export function formatCountdown(ms) {
  const total = Math.ceil(ms / 1000)
  const days = Math.floor(total / 86400)
  const h = Math.floor((total % 86400) / 3600)
  const m = Math.floor((total % 3600) / 60)
  const s = total % 60
  const pad = (n) => String(n).padStart(2, '0')
  return days > 0 ? `${days} d ${pad(h)}:${pad(m)}:${pad(s)}` : `${pad(h)}:${pad(m)}:${pad(s)}`
}
