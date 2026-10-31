import { HttpError } from './errors.js'

/*
  Walidacja danych wejściowych bez zewnętrznych bibliotek. Każdy parser zwraca oczyszczoną
  wartość albo rzuca HttpError 400 z polską wiadomością i nazwą pola (frontend podświetla pole).
*/

export const PET_COLORS = ['coral', 'mandarin', 'sun', 'mint', 'teal', 'sky', 'lavender', 'pink']
export const SPECIES = ['dog', 'cat', 'other']
export const SEXES = ['male', 'female', 'unknown']
export const PET_CONDITIONS = ['safe', 'injured', 'escaped', 'unknown']
export const VET_DURATIONS = { '1h': 60, '24h': 24 * 60, '7d': 7 * 24 * 60 }
export const TAG_CODE_RE = /^[2-9A-HJ-NP-Z]{4}-[2-9A-HJ-NP-Z]{4}$/

function fail(field, message) {
  throw new HttpError(400, message, { field })
}

// Usuwa znaki sterujące (poza nową linią w polach wieloliniowych) i białe znaki z brzegów.
function clean(value, multiline) {
  const pattern = multiline ? /[\u0000-\u0009\u000B-\u001F\u007F]/g : /[\u0000-\u001F\u007F]/g
  return value.replace(pattern, '').trim()
}

export function text(value, field, { max = 200, min = 0, multiline = false, label = 'Pole' } = {}) {
  if (value === undefined || value === null) value = ''
  if (typeof value !== 'string') fail(field, `${label}: nieprawidłowa wartość.`)
  const result = clean(value, multiline)
  if (result.length < min) fail(field, min === 1 ? `${label} jest wymagane.` : `${label}: minimum ${min} znaki.`)
  if (result.length > max) fail(field, `${label}: maksymalnie ${max} znaków.`)
  return result
}

export function email(value, field = 'email') {
  const result = text(value, field, { max: 254, label: 'E-mail' }).toLowerCase()
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(result)) fail(field, 'Podaj poprawny adres e-mail.')
  return result
}

export function phone(value, field = 'phone', label = 'Telefon') {
  const result = text(value, field, { max: 30, label })
  if (result && !/^\+?[\d\s()-]{6,20}$/.test(result)) fail(field, `${label}: wpisz sam numer, np. +48 600 100 200.`)
  return result
}

export function oneOf(value, allowed, field, label = 'Wartość') {
  if (!allowed.includes(value)) fail(field, `${label}: nieprawidłowy wybór.`)
  return value
}

export function bool(value, field) {
  if (typeof value !== 'boolean') fail(field, 'Oczekiwano wartości tak/nie.')
  return value
}

export function dateOnly(value, field, label = 'Data') {
  if (value === undefined || value === null || value === '') return null
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) fail(field, `${label}: nieprawidłowy format.`)
  const date = new Date(`${value}T00:00:00Z`)
  if (Number.isNaN(date.getTime()) || date.toISOString().slice(0, 10) !== value) fail(field, `${label}: nie ma takiego dnia.`)
  if (date > new Date()) fail(field, `${label} nie może być z przyszłości.`)
  if (date.getUTCFullYear() < 1980) fail(field, `${label}: zbyt odległa data.`)
  return value
}

export function timestamp(value, field, label = 'Czas') {
  if (typeof value !== 'string') fail(field, `${label}: nieprawidłowa wartość.`)
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) fail(field, `${label}: nieprawidłowy format.`)
  if (date.getTime() > Date.now() + 5 * 60 * 1000) fail(field, `${label} nie może być w przyszłości.`)
  if (date.getTime() < Date.now() - 365 * 24 * 60 * 60 * 1000) fail(field, `${label}: maksymalnie rok wstecz.`)
  return date.toISOString()
}

export function weight(value, field = 'weightKg') {
  if (value === undefined || value === null || value === '') return null
  const number = typeof value === 'string' ? Number(value.replace(',', '.')) : value
  if (typeof number !== 'number' || !Number.isFinite(number) || number <= 0 || number >= 200) {
    fail(field, 'Waga: podaj liczbę od 0,1 do 199 kg.')
  }
  return Math.round(number * 100) / 100
}

export function coordinates(lat, lng, field = 'location') {
  if (lat === undefined && lng === undefined) return null
  if (lat === null && lng === null) return null
  const valid = (n, limit) => typeof n === 'number' && Number.isFinite(n) && Math.abs(n) <= limit
  if (!valid(lat, 90) || !valid(lng, 180)) fail(field, 'Nieprawidłowa lokalizacja.')
  return { lat: Math.round(lat * 1e6) / 1e6, lng: Math.round(lng * 1e6) / 1e6 }
}

export function uuid(value, field = 'id') {
  if (typeof value !== 'string' || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value)) {
    throw new HttpError(404, 'Nie znaleziono.', { field })
  }
  return value.toLowerCase()
}

// Kod tagu w dowolnym zapisie („bk7q m9xd”, „BK7QM9XD”) → „BK7Q-M9XD”. Alfabet nie zawiera
// mylących się znaków 0/O i 1/I, więc kod z nimi nie istnieje – zwracamy null.
export function normalizeTagCode(value) {
  if (typeof value !== 'string') return null
  const raw = value.toUpperCase().replace(/[^0-9A-Z]/g, '')
  if (raw.length !== 8) return null
  const code = `${raw.slice(0, 4)}-${raw.slice(4)}`
  return TAG_CODE_RE.test(code) ? code : null
}

export function tagCode(value, field = 'code') {
  const code = normalizeTagCode(value)
  if (!code) fail(field, 'Kod tagu ma 8 znaków, np. BK7Q-M9XD.')
  return code
}

// Wspólna walidacja profilu zwierzęcia. `partial` = PATCH (tylko przesłane pola).
export function petInput(body, { partial = false } = {}) {
  if (!body || typeof body !== 'object') fail('body', 'Brak danych.')
  const out = {}
  const has = (key) => Object.prototype.hasOwnProperty.call(body, key)
  const take = (key, parse) => {
    if (has(key)) out[key] = parse(body[key])
    else if (!partial) out[key] = parse(undefined)
  }

  take('name', (v) => text(v, 'name', { min: 1, max: 40, label: 'Imię' }))
  take('species', (v) => oneOf(v ?? 'dog', SPECIES, 'species', 'Gatunek'))
  take('breed', (v) => text(v, 'breed', { max: 60, label: 'Rasa' }))
  take('sex', (v) => oneOf(v ?? 'unknown', SEXES, 'sex', 'Płeć'))
  take('birthDate', (v) => dateOnly(v, 'birthDate', 'Data urodzenia'))
  take('weightKg', (v) => weight(v))
  take('description', (v) => text(v, 'description', { max: 400, multiline: true, label: 'Znaki szczególne' }))
  take('color', (v) => oneOf(v ?? 'coral', PET_COLORS, 'color', 'Kolor'))
  take('chipNumber', (v) => {
    const chip = text(v, 'chipNumber', { max: 20, label: 'Numer chipa' }).replace(/\s/g, '')
    if (chip && !/^\d{9,15}$/.test(chip)) fail('chipNumber', 'Numer chipa to 9–15 cyfr (najczęściej 15).')
    return chip
  })
  take('allergies', (v) => text(v, 'allergies', { max: 300, multiline: true, label: 'Alergie' }))
  take('medications', (v) => text(v, 'medications', { max: 300, multiline: true, label: 'Leki' }))
  take('conditions', (v) => text(v, 'conditions', { max: 300, multiline: true, label: 'Choroby' }))
  take('vaccinations', (v) => text(v, 'vaccinations', { max: 300, multiline: true, label: 'Szczepienia' }))
  take('vetClinic', (v) => text(v, 'vetClinic', { max: 80, label: 'Przychodnia' }))
  take('vetPhone', (v) => phone(v, 'vetPhone', 'Telefon przychodni'))
  take('contactName', (v) => text(v, 'contactName', { max: 60, label: 'Imię opiekuna' }))
  take('contactPhone', (v) => phone(v, 'contactPhone', 'Telefon opiekuna'))
  return out
}
