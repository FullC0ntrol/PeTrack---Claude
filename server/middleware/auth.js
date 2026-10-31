import { HttpError } from '../errors.js'
import { findSessionUser, SESSION_COOKIE } from '../services/sessions.js'

// Wczytuje użytkownika, jeśli jest zalogowany. Nie blokuje – strona tagu działa i bez sesji.
export async function loadUser(req, res, next) {
  if (req.user === undefined) req.user = await findSessionUser(req.cookies?.[SESSION_COOKIE])
  next()
}

export async function requireAuth(req, res, next) {
  // Kilka routerów pod tym samym prefiksem – sesję sprawdzamy w bazie tylko raz na żądanie.
  if (req.user === undefined) req.user = await findSessionUser(req.cookies?.[SESSION_COOKIE])
  if (!req.user) throw new HttpError(401, 'Zaloguj się, aby kontynuować.')
  next()
}

/*
  Ochrona przed CSRF. Ciasteczko ma SameSite=Lax, a dodatkowo każde żądanie zmieniające dane
  musi mieć nagłówek X-PeTrace. Zwykły formularz z obcej strony nie może go ustawić, a fetch
  z obcej strony z takim nagłówkiem wymaga zgody CORS, której serwer nie udziela.
*/
export function requireAppHeader(req, res, next) {
  if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) return next()
  if (req.get('X-PeTrace') !== '1') throw new HttpError(403, 'Żądanie odrzucone.')
  next()
}
