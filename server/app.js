import { existsSync } from 'node:fs'
import path from 'node:path'
import cookieParser from 'cookie-parser'
import express from 'express'
import { config } from './config.js'
import { HttpError } from './errors.js'
import { requireAppHeader } from './middleware/auth.js'
import { authRouter } from './routes/auth.js'
import { eventsRouter } from './routes/events.js'
import { meRouter } from './routes/me.js'
import { petsRouter } from './routes/pets.js'
import { publicRouter } from './routes/public.js'
import { tagsRouter } from './routes/tags.js'
import { vetRouter } from './routes/vet.js'

const distDir = path.resolve('dist')

// Nagłówki bezpieczeństwa (bez dodatkowych bibliotek). CSP dopuszcza kafelki OpenStreetMap,
// zdjęcia z blob:/data: (podgląd przed wysłaniem, kody QR) i style inline, których używa Leaflet.
function securityHeaders(req, res, next) {
  res.set({
    'X-Content-Type-Options': 'nosniff',
    'Referrer-Policy': 'same-origin',
    'X-Frame-Options': 'DENY',
    'Permissions-Policy': 'camera=(self), geolocation=(self), microphone=()',
    'Content-Security-Policy': [
      "default-src 'self'",
      "script-src 'self'",
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data: blob: https://tile.openstreetmap.org",
      "font-src 'self'",
      "connect-src 'self'",
      "manifest-src 'self'",
      "worker-src 'self'",
      "frame-ancestors 'none'",
      "base-uri 'self'",
      "form-action 'self'",
    ].join('; '),
  })
  next()
}

export function createApp() {
  const app = express()
  app.set('trust proxy', config.trustProxy)
  app.disable('x-powered-by')
  app.use(securityHeaders)

  app.get('/api/health', (req, res) => res.json({ ok: true }))

  app.use('/api', express.json({ limit: '50kb' }), cookieParser(), requireAppHeader)
  app.use('/api/auth', authRouter)
  app.use('/api/me', meRouter)
  app.use('/api/public', publicRouter)
  app.use('/api/pets', petsRouter)
  app.use('/api/pets', eventsRouter)
  app.use('/api/tags', tagsRouter)
  app.use('/api', vetRouter)
  app.use('/api', (req, res, next) => next(new HttpError(404, 'Nie ma takiego adresu API.')))

  // Produkcja: Express serwuje zbudowany frontend. Pliki z hashem w nazwie – cache na rok;
  // index.html i service worker – zawsze świeże, żeby aktualizacja dotarła od razu.
  if (existsSync(distDir)) {
    app.use(
      express.static(distDir, {
        index: false,
        setHeaders(res, filePath) {
          if (filePath.includes(`${path.sep}assets${path.sep}`)) res.set('Cache-Control', 'public, max-age=31536000, immutable')
          else res.set('Cache-Control', 'no-cache')
        },
      }),
    )
    app.get(/^(?!\/api\/).*/, (req, res) => {
      res.set('Cache-Control', 'no-cache')
      res.sendFile(path.join(distDir, 'index.html'))
    })
  }

  app.use((error, req, res, _next) => {
    if (error.type === 'entity.too.large') error = new HttpError(413, 'Plik jest za duży (maks. 3 MB).')
    if (error.type === 'entity.parse.failed') error = new HttpError(400, 'Nieprawidłowe dane.')
    if (error instanceof HttpError) {
      return res.status(error.status).json({ error: error.message, ...(error.details ?? {}) })
    }
    console.error(error)
    res.status(500).json({ error: 'Coś poszło nie tak po naszej stronie. Spróbuj za chwilę.' })
  })

  return app
}
