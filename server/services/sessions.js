import { config } from '../config.js'
import { query } from '../db/pool.js'
import { generateToken, sha256 } from './crypto.js'

export const SESSION_COOKIE = 'petrace_sid'
const SESSION_DAYS = 60

const cookieOptions = {
  httpOnly: true,
  secure: config.cookieSecure,
  sameSite: 'lax',
  path: '/',
}

export async function createSession(res, userId, userAgent = '') {
  const token = generateToken()
  await query(
    `INSERT INTO sessions (user_id, token_hash, user_agent, expires_at)
     VALUES ($1, $2, $3, now() + make_interval(days => $4))`,
    [userId, sha256(token), userAgent.slice(0, 200), SESSION_DAYS],
  )
  res.cookie(SESSION_COOKIE, token, { ...cookieOptions, maxAge: SESSION_DAYS * 86_400_000 })
}

// Zwraca użytkownika z ważnej sesji albo null. Przy okazji przedłuża „ostatnio widziano”
// najwyżej raz na godzinę, żeby nie pisać do bazy przy każdym żądaniu.
export async function findSessionUser(token) {
  if (!token || typeof token !== 'string' || token.length > 100) return null
  const { rows } = await query(
    `WITH s AS (
       UPDATE sessions SET last_seen_at = now()
       WHERE token_hash = $1 AND expires_at > now() AND last_seen_at < now() - interval '1 hour'
       RETURNING user_id
     )
     SELECT u.id, u.email, u.name, u.phone, ses.id AS session_id
     FROM sessions ses JOIN users u ON u.id = ses.user_id
     WHERE ses.token_hash = $1 AND ses.expires_at > now()`,
    [sha256(token)],
  )
  return rows[0] ?? null
}

export async function destroySession(res, token) {
  if (token) await query('DELETE FROM sessions WHERE token_hash = $1', [sha256(token)])
  res.clearCookie(SESSION_COOKIE, cookieOptions)
}

export async function destroyAllSessions(res, userId) {
  await query('DELETE FROM sessions WHERE user_id = $1', [userId])
  res.clearCookie(SESSION_COOKIE, cookieOptions)
}
