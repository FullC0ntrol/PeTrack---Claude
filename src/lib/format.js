const timeFmt = new Intl.DateTimeFormat('pl-PL', { hour: '2-digit', minute: '2-digit' })
const dateFmt = new Intl.DateTimeFormat('pl-PL', { day: 'numeric', month: 'long' })
const dateYearFmt = new Intl.DateTimeFormat('pl-PL', { day: 'numeric', month: 'long', year: 'numeric' })
const weekdayFmt = new Intl.DateTimeFormat('pl-PL', { weekday: 'long', day: 'numeric', month: 'long' })

export const formatTime = (value) => timeFmt.format(new Date(value))

export function formatDate(value) {
  const date = new Date(value)
  return date.getFullYear() === new Date().getFullYear() ? dateFmt.format(date) : dateYearFmt.format(date)
}

export const formatDateTime = (value) => `${formatDate(value)}, ${formatTime(value)}`

function startOfDay(date) {
  const d = new Date(date)
  d.setHours(0, 0, 0, 0)
  return d
}

export function dayLabel(value) {
  const diff = Math.round((startOfDay(new Date()) - startOfDay(value)) / 86_400_000)
  if (diff === 0) return 'Dziś'
  if (diff === 1) return 'Wczoraj'
  if (diff < 7) return weekdayFmt.format(new Date(value)).replace(/^./, (c) => c.toUpperCase())
  return formatDate(value)
}

// Polska odmiana liczebników: 1 skan, 2 skany, 5 skanów, 22 skany, 12 skanów.
export function plural(n, one, few, many) {
  if (n === 1) return one
  const mod10 = n % 10
  const mod100 = n % 100
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return few
  return many
}

export const countLabel = (n, one, few, many) => `${n} ${plural(n, one, few, many)}`

export function relativeTime(value) {
  const minutes = Math.round((Date.now() - new Date(value).getTime()) / 60_000)
  if (minutes < 1) return 'przed chwilą'
  if (minutes < 60) return `${minutes} min temu`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours} godz. temu`
  const days = Math.floor(hours / 24)
  if (days === 1) return 'wczoraj'
  if (days < 30) return `${days} dni temu`
  return formatDate(value)
}

export function durationLabel(fromValue, toValue = Date.now()) {
  const minutes = Math.max(0, Math.round((new Date(toValue) - new Date(fromValue)) / 60_000))
  if (minutes < 60) return countLabel(minutes, 'minuta', 'minuty', 'minut')
  const hours = Math.floor(minutes / 60)
  if (hours < 48) return countLabel(hours, 'godzina', 'godziny', 'godzin')
  return countLabel(Math.floor(hours / 24), 'dzień', 'dni', 'dni')
}

export function ageLabel(years) {
  if (years === null || years === undefined) return ''
  if (years < 1) {
    const months = Math.max(1, Math.round(years * 12))
    return countLabel(months, 'miesiąc', 'miesiące', 'miesięcy')
  }
  const full = Math.floor(years)
  return countLabel(full, 'rok', 'lata', 'lat')
}

export function ageFromBirthDate(birthDate) {
  if (!birthDate) return null
  return (Date.now() - new Date(`${birthDate}T00:00:00`).getTime()) / (365.25 * 86_400_000)
}

export const SPECIES = {
  dog: { label: 'Pies', female: 'Suczka' },
  cat: { label: 'Kot', female: 'Kotka' },
  other: { label: 'Inne zwierzę', female: 'Inne zwierzę' },
}

export function speciesLabel(species, sex) {
  const entry = SPECIES[species] ?? SPECIES.other
  return sex === 'female' ? entry.female : entry.label
}

export const SEX_LABELS = { male: 'Samiec', female: 'Samica', unknown: 'Nie wiem' }

/*
  Dopełniacz imienia („tag Burka”, „tag Luny”) – uproszczona odmiana, która dobrze radzi sobie
  z typowymi imionami zwierząt. Imiona nieodmienne (Kitty, Bambi) zostają bez zmian.
*/
export function genitive(name) {
  if (!name) return name
  const n = name.trim()
  const lower = n.toLowerCase()
  if (/[yieuó]$/.test(lower)) return n
  if (/[kg]a$/.test(lower)) return `${n.slice(0, -1)}i`
  if (/ia$/.test(lower)) return `${n.slice(0, -1)}i`
  if (/a$/.test(lower)) return `${n.slice(0, -1)}y`
  if (/[^aeiouy]ek$/.test(lower)) return `${n.slice(0, -2)}ka`
  if (/o$/.test(lower)) return `${n.slice(0, -1)}a`
  return `${n}a`
}

// Rodzaj gramatyczny do komunikatów („zaginął”/„zaginęła”).
export const isFemale = (pet) => pet?.sex === 'female'
export const byGender = (pet, male, female) => (isFemale(pet) ? female : male)

export function formatCoords(lat, lng) {
  return `${lat.toFixed(4)}, ${lng.toFixed(4)}`
}

export function placeLabel(item) {
  if (item.place) return `okolice: ${item.place}`
  if (item.lat !== null && item.lat !== undefined) return `~ ${formatCoords(item.lat, item.lng)}`
  return 'bez lokalizacji'
}

// Kod tagu wpisywany ręcznie: wielkie litery, myślnik po 4 znakach.
export function formatTagInput(value) {
  const raw = value.toUpperCase().replace(/[^0-9A-Z]/g, '').slice(0, 8)
  return raw.length > 4 ? `${raw.slice(0, 4)}-${raw.slice(4)}` : raw
}

export const telHref = (phone) => `tel:${phone.replace(/[^\d+]/g, '')}`
