import { Router } from 'express'
import { config } from '../config.js'
import { query, transaction } from '../db/pool.js'
import { HttpError } from '../errors.js'
import { loadUser, requireAuth } from '../middleware/auth.js'
import { rateLimit } from '../middleware/rateLimit.js'
import { generateCode, generateToken, hashCode, safeEqualHex, sha256 } from '../services/crypto.js'
import { sendLoginEmail } from '../services/mail.js'
import { createSession, destroyAllSessions, destroySession, SESSION_COOKIE } from '../services/sessions.js'
import * as v from '../validation.js'

export const authRouter = Router()

const TTL_MINUTES = 15
const MAX_CODE_ATTEMPTS = 5
const QUARTER = 15 * 60 * 1000

const toUser = (row) => ({ id: row.id, email: row.email, name: row.name, phone: row.phone })

// Tylko ścieżki wewnątrz aplikacji – inaczej prawdziwy link logowania mógłby przekierować
// na obcą stronę (open redirect).
function safeNext(value) {
  if (typeof value !== 'string' || value.length > 200) return null
  if (!value.startsWith('/') || value.startsWith('//') || value.includes('\\')) return null
  return value
}

const startByIp = rateLimit({
  name: 'login-ip',
  windowMs: QUARTER,
  max: 10,
  message: 'Za dużo prób logowania z tego urządzenia. Spróbuj za kilkanaście minut.',
})
const startByEmail = rateLimit({
  name: 'login-email',
  windowMs: QUARTER,
  max: 3,
  keyFn: (req) => String(req.body?.email ?? '').trim().toLowerCase(),
  message: 'Wysłaliśmy już kilka kodów na ten adres. Sprawdź skrzynkę (także spam) albo odczekaj kwadrans.',
})
// Kod ma 6 cyfr, więc zgadywanie ograniczamy podwójnie: licznikiem prób na żądanie logowania
// (5) i limitem na IP dla wszystkich prób weryfikacji.
const verifyByIp = rateLimit({
  name: 'verify-ip',
  windowMs: QUARTER,
  max: 20,
  message: 'Za dużo prób. Odczekaj kwadrans i poproś o nowy kod.',
})

async function finishLogin(req, res, email, next) {
  const user = await transaction(async (client) => {
    await client.query(`INSERT INTO users (email, name) VALUES ($1, $2) ON CONFLICT (email) DO NOTHING`, [
      email,
      email.split('@')[0].slice(0, 40),
    ])
    const { rows } = await client.query('SELECT id, email, name, phone FROM users WHERE email = $1', [email])
    return rows[0]
  })
  await createSession(res, user.id, req.get('user-agent') ?? '')
  res.json({ user: toUser(user), next: safeNext(next) ?? '/app' })
}

/*
  POST /api/auth/start { email, next? } → mail z linkiem i kodem.
  Konto powstaje dopiero po potwierdzeniu, a odpowiedź jest taka sama dla nowych i istniejących
  adresów (nie da się sprawdzić, kto ma konto).
*/
authRouter.post('/start', startByIp, startByEmail, async (req, res) => {
  const email = v.email(req.body.email)
  const next = safeNext(req.body.next)
  const token = generateToken()
  const code = generateCode()

  await transaction(async (client) => {
    // Nowe żądanie unieważnia poprzednie – działa tylko ostatni kod.
    await client.query('UPDATE login_challenges SET used_at = now() WHERE email = $1 AND used_at IS NULL', [email])
    const { rows } = await client.query(
      `INSERT INTO login_challenges (email, token_hash, code_hash, next_path, expires_at)
       VALUES ($1, $2, '', $3, now() + make_interval(mins => $4)) RETURNING id`,
      [email, sha256(token), next, TTL_MINUTES],
    )
    await client.query('UPDATE login_challenges SET code_hash = $2 WHERE id = $1', [rows[0].id, hashCode(rows[0].id, code)])
  })

  const params = new URLSearchParams({ token })
  await sendLoginEmail(email, `${config.appUrl}/auth/link?${params}`, code)
  res.json({ email, expiresInMinutes: TTL_MINUTES })
})

// POST /api/auth/verify-link { token } – kliknięcie w link z maila.
authRouter.post('/verify-link', verifyByIp, async (req, res) => {
  const token = typeof req.body.token === 'string' ? req.body.token.slice(0, 100) : ''
  const { rows } = await query(
    `UPDATE login_challenges SET used_at = now()
     WHERE token_hash = $1 AND used_at IS NULL AND expires_at > now() AND attempts < $2
     RETURNING email, next_path`,
    [sha256(token), MAX_CODE_ATTEMPTS],
  )
  if (!rows[0]) throw new HttpError(400, 'Ten link wygasł albo został już użyty. Poproś o nowy kod.')
  await finishLogin(req, res, rows[0].email, rows[0].next_path)
})

// POST /api/auth/verify-code { email, code } – 6 cyfr przepisanych z maila.
authRouter.post('/verify-code', verifyByIp, async (req, res) => {
  const email = v.email(req.body.email)
  const code = typeof req.body.code === 'string' ? req.body.code.replace(/\D/g, '') : ''
  if (code.length !== 6) throw new HttpError(400, 'Kod ma 6 cyfr.', { field: 'code' })

  const result = await transaction(async (client) => {
    // FOR UPDATE: dwie równoczesne próby nie ominą licznika.
    const { rows } = await client.query(
      `SELECT id, code_hash, attempts, next_path FROM login_challenges
       WHERE email = $1 AND used_at IS NULL AND expires_at > now()
       ORDER BY created_at DESC LIMIT 1 FOR UPDATE`,
      [email],
    )
    const challenge = rows[0]
    if (!challenge || challenge.attempts >= MAX_CODE_ATTEMPTS) return { status: 'expired' }
    if (!safeEqualHex(challenge.code_hash, hashCode(challenge.id, code))) {
      await client.query('UPDATE login_challenges SET attempts = attempts + 1 WHERE id = $1', [challenge.id])
      return { status: 'wrong', left: MAX_CODE_ATTEMPTS - challenge.attempts - 1 }
    }
    await client.query('UPDATE login_challenges SET used_at = now() WHERE id = $1', [challenge.id])
    return { status: 'ok', next: challenge.next_path }
  })

  if (result.status === 'expired') throw new HttpError(400, 'Kod wygasł. Poproś o nowy.', { field: 'code', expired: true })
  if (result.status === 'wrong') {
    throw new HttpError(
      400,
      result.left > 0 ? `Nieprawidłowy kod. Zostało prób: ${result.left}.` : 'Nieprawidłowy kod. Poproś o nowy.',
      { field: 'code', expired: result.left <= 0 },
    )
  }
  await finishLogin(req, res, email, result.next)
})

authRouter.get('/me', loadUser, (req, res) => {
  res.json({ user: req.user ? toUser(req.user) : null, demoLogin: config.demoLogin })
})

authRouter.post('/logout', async (req, res) => {
  await destroySession(res, req.cookies?.[SESSION_COOKIE])
  res.status(204).end()
})

authRouter.post('/logout-all', requireAuth, async (req, res) => {
  await destroyAllSessions(res, req.user.id)
  res.status(204).end()
})

// Wejście na konto demo jednym przyciskiem (DEMO_LOGIN=true). Wyłącznie na konto demo.
authRouter.post('/demo', startByIp, async (req, res) => {
  if (!config.demoLogin) throw new HttpError(404, 'Logowanie demo jest wyłączone.')
  const { rows } = await query('SELECT id FROM users WHERE email = $1', [config.demoEmail])
  if (!rows[0]) throw new HttpError(404, 'Konto demo nie istnieje. Uruchom serwer z SEED_DEMO=true.')
  await finishLogin(req, res, config.demoEmail, req.body?.next)
})
