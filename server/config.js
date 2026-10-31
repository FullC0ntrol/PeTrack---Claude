import { existsSync } from 'node:fs'

// Lokalnie zmienne czytamy z .env w katalogu głównym (Node 22: process.loadEnvFile).
// W Dockerze podaje je docker-compose, a pliku .env w obrazie nie ma.
if (existsSync('.env')) process.loadEnvFile('.env')

const env = process.env
const isProduction = env.NODE_ENV === 'production'

function bool(name, fallback) {
  if (env[name] === undefined || env[name] === '') return fallback
  return env[name] === 'true'
}

const appUrl = (env.APP_URL || 'http://localhost:5180').replace(/\/$/, '')
const isLocal = /^https?:\/\/(localhost|127\.0\.0\.1)(:|\/|$)/.test(appUrl)

const authSecret = env.AUTH_SECRET || (isProduction ? '' : 'dev-only-secret-dev-only-secret')
if (!authSecret) throw new Error('Brak AUTH_SECRET. Ustaw długi losowy sekret: openssl rand -hex 32')
if (isProduction && !isLocal && (authSecret.length < 32 || authSecret.includes('zmien'))) {
  throw new Error('AUTH_SECRET jest domyślny albo za krótki – ustaw w .env losowy sekret (openssl rand -hex 32).')
}
if (isProduction && !isLocal && bool('DEV_SHOW_CODE', false)) {
  throw new Error('DEV_SHOW_CODE=true na publicznym serwerze pozwala zalogować się na dowolne konto – ustaw false.')
}

export const config = {
  isProduction,
  isLocal,
  port: Number(env.PORT || 3000),
  appUrl,
  databaseUrl: env.DATABASE_URL || 'postgres://petrace:petrace@localhost:5442/petrace',
  authSecret,
  seedDemo: bool('SEED_DEMO', !isProduction),
  demoLogin: bool('DEMO_LOGIN', isLocal),
  devShowCode: bool('DEV_SHOW_CODE', false),
  demoEmail: 'demo@petrace.app',
  cookieSecure: bool('COOKIE_SECURE', isProduction && !isLocal),
  trustProxy: Number(env.TRUST_PROXY || 0),
  reverseGeocoding: bool('REVERSE_GEOCODING', true),
  smtp: {
    host: env.SMTP_HOST || '',
    port: Number(env.SMTP_PORT || 587),
    user: env.SMTP_USER || '',
    pass: env.SMTP_PASS || '',
    from: env.MAIL_FROM || 'PeTrace <no-reply@petrace.app>',
  },
}
