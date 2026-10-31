import { createHash, createHmac, randomBytes, randomInt, timingSafeEqual } from 'node:crypto'
import { config } from '../config.js'

// Losowy token do linków (logowanie, weterynarz, sesja): 32 bajty, zapis base64url.
export function generateToken() {
  return randomBytes(32).toString('base64url')
}

export function sha256(value) {
  return createHash('sha256').update(value).digest('hex')
}

// 6 cyfr z kryptograficznie bezpiecznego generatora, z zerami na początku.
export function generateCode() {
  return String(randomInt(0, 1_000_000)).padStart(6, '0')
}

// HMAC zamiast samego skrótu: kodów 6-cyfrowych jest tylko milion, więc skrót SHA-256
// dałoby się odwrócić natychmiast. Bez AUTH_SECRET – nie.
export function hashCode(challengeId, code) {
  return createHmac('sha256', config.authSecret).update(`${challengeId}:${code}`).digest('hex')
}

export function safeEqualHex(a, b) {
  const left = Buffer.from(a, 'hex')
  const right = Buffer.from(b, 'hex')
  return left.length === right.length && timingSafeEqual(left, right)
}

// Alfabet kodów tagów: bez 0/O i 1/I, które łatwo pomylić przy przepisywaniu z zawieszki.
const TAG_ALPHABET = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ'

export function generateTagCode() {
  let raw = ''
  for (let i = 0; i < 8; i++) raw += TAG_ALPHABET[randomInt(0, TAG_ALPHABET.length)]
  return `${raw.slice(0, 4)}-${raw.slice(4)}`
}
