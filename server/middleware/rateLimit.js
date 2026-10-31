import { HttpError } from '../errors.js'

/*
  Ogranicznik żądań ze stałym oknem czasu (fixed window), trzymany w pamięci procesu.
  Przy jednym kontenerze aplikacji to wystarcza; przy kilku trzeba by liczniki trzymać wspólnie.
  `keyFn` zwraca klucz (IP, e-mail, kod tagu…); pusty klucz = bez limitu.
*/
export function rateLimit({ name, windowMs, max, keyFn = (req) => req.ip, message }) {
  const hits = new Map()

  setInterval(() => {
    const now = Date.now()
    for (const [key, entry] of hits) if (entry.resetAt <= now) hits.delete(key)
  }, Math.min(windowMs, 60_000)).unref()

  return function rateLimitMiddleware(req, res, next) {
    const key = keyFn(req)
    if (!key) return next()
    const now = Date.now()
    const entry = hits.get(key)

    if (!entry || entry.resetAt <= now) {
      hits.set(key, { count: 1, resetAt: now + windowMs })
      return next()
    }
    entry.count += 1
    if (entry.count > max) {
      res.set('Retry-After', String(Math.ceil((entry.resetAt - now) / 1000)))
      throw new HttpError(429, message ?? 'Za dużo prób. Odczekaj chwilę i spróbuj ponownie.', { limit: name })
    }
    next()
  }
}
