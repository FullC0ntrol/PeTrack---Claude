import { Router } from 'express'
import { config } from '../config.js'
import { query } from '../db/pool.js'
import { HttpError, notFound } from '../errors.js'
import { loadUser } from '../middleware/auth.js'
import { rateLimit } from '../middleware/rateLimit.js'
import { sha256 } from '../services/crypto.js'
import { geocodeScanInBackground } from '../services/geocode.js'
import { sendFinderMessageEmail } from '../services/mail.js'
import { getOpenLostReport, listPetSummaries, photoUrl } from '../services/pets.js'
import * as v from '../validation.js'

export const publicRouter = Router()

const QUARTER = 15 * 60 * 1000

const tagPageLimit = rateLimit({
  name: 'tag-page',
  windowMs: QUARTER,
  max: 60,
  message: 'Za dużo zapytań o tagi z tego urządzenia. Odczekaj chwilę.',
})
const locationLimit = rateLimit({ name: 'scan-location', windowMs: QUARTER, max: 20 })
const messageByIp = rateLimit({
  name: 'message-ip',
  windowMs: QUARTER,
  max: 5,
  message: 'Wysłano już kilka wiadomości. Odczekaj kwadrans – opiekun na pewno je zobaczy.',
})
const messageByTag = rateLimit({
  name: 'message-tag',
  windowMs: 60 * 60 * 1000,
  max: 20,
  keyFn: (req) => v.normalizeTagCode(req.params.code),
  message: 'Ten opiekun dostał już dużo wiadomości. Spróbuj za jakiś czas.',
})
const vetLimit = rateLimit({ name: 'vet-card', windowMs: QUARTER, max: 60 })

function ageYears(birthDate) {
  if (!birthDate) return null
  const born = new Date(`${birthDate}T00:00:00Z`)
  const years = (Date.now() - born.getTime()) / (365.25 * 86_400_000)
  return Math.max(0, Math.floor(years * 10) / 10)
}

// Profil widoczny dla znalazcy: bez numeru chipa, nazwiska ani adresu e-mail właściciela.
function publicPet(row) {
  return {
    name: row.name,
    species: row.species,
    breed: row.breed,
    sex: row.sex,
    ageYears: ageYears(row.birth_date),
    color: row.color,
    photoUrl: photoUrl(row.photo_key),
    description: row.description,
    allergies: row.allergies,
    medications: row.medications,
    conditions: row.conditions,
    vetClinic: row.vet_clinic,
    vetPhone: row.vet_phone,
    ownerFirstName: (row.contact_name || '').split(/\s+/)[0] || '',
  }
}

/*
  POST /api/public/tags/:code/visit { source?: 'tag'|'poster', preview?: boolean }
  Jedno wejście na stronę tagu. Odpowiedź zależy od sytuacji:
    free   – tag bez zwierzęcia (zalogowany właściciel może go przypisać),
    own    – skanuje właściciel (skanu nie zapisujemy, chyba że to podgląd),
    active – znalazca: profil, ewentualnie zgłoszenie zaginięcia; skan trafia do dziennika.
  POST (a nie GET), bo zapisuje skan – przeglądarki i roboty nie wywołają go przy prefetchu.
*/
publicRouter.post('/tags/:code/visit', tagPageLimit, loadUser, async (req, res) => {
  const code = v.normalizeTagCode(req.params.code)
  if (!code) throw notFound('Nie znamy takiego tagu.')
  const source = req.body?.source === 'poster' ? 'poster' : 'tag'

  const { rows } = await query(
    `SELECT t.code, t.pet_id, p.*, u.email AS owner_email
     FROM tags t LEFT JOIN pets p ON p.id = t.pet_id LEFT JOIN users u ON u.id = p.owner_id
     WHERE t.code = $1`,
    [code],
  )
  const row = rows[0]
  if (!row) throw notFound('Nie znamy takiego tagu.')

  if (!row.pet_id) {
    return res.json({
      status: 'free',
      code,
      pets: req.user ? await listPetSummaries(req.user.id) : null,
    })
  }

  const isOwner = req.user?.id === row.owner_id
  const report = await getOpenLostReport(row.pet_id)
  const lost = report
    ? {
        lastSeenAt: report.last_seen_at,
        lastSeenPlace: report.last_seen_place,
        message: report.message,
        phone: report.show_phone && report.phone ? report.phone : null,
      }
    : null

  if (isOwner && !req.body?.preview) {
    return res.json({ status: 'own', code, petId: row.pet_id, pet: publicPet(row), lost })
  }

  let scanId = null
  if (!isOwner) {
    const scan = await query(
      `INSERT INTO scans (tag_code, pet_id, source) VALUES ($1, $2, $3) RETURNING id`,
      [code, row.pet_id, source],
    )
    scanId = scan.rows[0].id
  }
  res.json({ status: 'active', code, scanId, preview: isOwner, pet: publicPet(row), lost })
})

/*
  POST /api/public/scans/:scanId/location { lat, lng, accuracy }
  Znalazca udostępnia lokalizację (za zgodą przeglądarki). Tylko raz i tylko do 2 h po skanie –
  identyfikator skanu jest losowy (UUID) i zna go wyłącznie przeglądarka znalazcy.
*/
publicRouter.post('/scans/:scanId/location', locationLimit, async (req, res) => {
  const scanId = v.uuid(req.params.scanId)
  const point = v.coordinates(req.body?.lat, req.body?.lng)
  if (!point) throw new HttpError(400, 'Brak lokalizacji.')
  const accuracy = Number.isFinite(req.body?.accuracy) ? Math.min(Math.round(req.body.accuracy), 100_000) : null

  const { rowCount } = await query(
    `UPDATE scans SET lat = $2, lng = $3, accuracy_m = $4, located_at = now()
     WHERE id = $1 AND located_at IS NULL AND scanned_at > now() - interval '2 hours'`,
    [scanId, point.lat, point.lng, accuracy],
  )
  if (!rowCount) throw new HttpError(409, 'Lokalizacja została już zapisana albo sesja wygasła. Odśwież stronę.')
  geocodeScanInBackground(scanId, point.lat, point.lng)
  res.json({ ok: true })
})

/*
  POST /api/public/tags/:code/messages { body, condition, contact?, scanId? }
  Anonimowa wiadomość do opiekuna – znalazca nie widzi danych właściciela, a właściciel widzi
  kontakt zwrotny tylko, jeśli znalazca sam go poda.
*/
publicRouter.post('/tags/:code/messages', messageByIp, messageByTag, async (req, res) => {
  const code = v.normalizeTagCode(req.params.code)
  if (!code) throw notFound('Nie znamy takiego tagu.')
  const body = v.text(req.body?.body, 'body', { min: 1, max: 1000, multiline: true, label: 'Wiadomość' })
  const condition = v.oneOf(req.body?.condition ?? 'unknown', v.PET_CONDITIONS, 'condition', 'Stan zwierzęcia')
  const contact = v.text(req.body?.contact, 'contact', { max: 120, label: 'Kontakt' })
  const scanId = req.body?.scanId ? v.uuid(req.body.scanId, 'scanId') : null

  const { rows } = await query(
    `SELECT p.id, p.name, u.email FROM tags t JOIN pets p ON p.id = t.pet_id JOIN users u ON u.id = p.owner_id
     WHERE t.code = $1`,
    [code],
  )
  const pet = rows[0]
  if (!pet) throw notFound('Ten tag nie jest przypisany do żadnego zwierzęcia.')

  // Skan musi dotyczyć tego samego tagu – inaczej ignorujemy powiązanie (nie zdradzamy niczego).
  let linkedScan = null
  if (scanId) {
    const scan = await query('SELECT id FROM scans WHERE id = $1 AND tag_code = $2', [scanId, code])
    linkedScan = scan.rows[0]?.id ?? null
  }

  await query(
    `INSERT INTO finder_messages (pet_id, scan_id, pet_condition, body, finder_contact) VALUES ($1, $2, $3, $4, $5)`,
    [pet.id, linkedScan, condition, body, contact],
  )
  sendFinderMessageEmail(pet.email, pet.name, body, `${config.appUrl}/app/p/${pet.id}/zdarzenia`).catch((error) =>
    console.error('[mail] nie wysłano powiadomienia:', error.message),
  )
  res.status(201).json({ ok: true })
})

/*
  GET /api/public/vet/:token – karta zdrowia dla weterynarza (tylko odczyt, do czasu wygaśnięcia).
  Każde otwarcie zwiększa licznik, który właściciel widzi w dzienniku zdarzeń.
*/
publicRouter.get('/vet/:token', vetLimit, async (req, res) => {
  const token = String(req.params.token).slice(0, 100)
  const { rows } = await query(
    `UPDATE vet_shares SET open_count = open_count + 1, last_opened_at = now()
     WHERE token_hash = $1 AND revoked_at IS NULL AND expires_at > now()
     RETURNING pet_id, expires_at`,
    [sha256(token)],
  )
  if (!rows[0]) throw new HttpError(410, 'Ten kod wygasł albo opiekun go unieważnił. Poproś o nowy.')

  const { rows: petRows } = await query(
    `SELECT p.*, u.name AS owner_name, u.phone AS owner_phone, u.email AS owner_email
     FROM pets p JOIN users u ON u.id = p.owner_id WHERE p.id = $1`,
    [rows[0].pet_id],
  )
  const p = petRows[0]
  res.set('Cache-Control', 'no-store')
  res.json({
    expiresAt: rows[0].expires_at,
    pet: {
      name: p.name,
      species: p.species,
      breed: p.breed,
      sex: p.sex,
      birthDate: p.birth_date,
      weightKg: p.weight_kg,
      color: p.color,
      photoUrl: photoUrl(p.photo_key),
      description: p.description,
      chipNumber: p.chip_number,
      allergies: p.allergies,
      medications: p.medications,
      conditions: p.conditions,
      vaccinations: p.vaccinations,
      vetClinic: p.vet_clinic,
      vetPhone: p.vet_phone,
    },
    owner: {
      name: p.contact_name || p.owner_name,
      phone: p.contact_phone || p.owner_phone,
      email: p.owner_email,
    },
  })
})

// GET /api/public/photos/:key – klucz zmienia się przy każdej zmianie zdjęcia, więc cache „na zawsze”.
publicRouter.get('/photos/:key', async (req, res) => {
  const key = v.uuid(req.params.key)
  const { rows } = await query('SELECT mime, data FROM pet_photos WHERE key = $1', [key])
  if (!rows[0]) throw notFound('Nie ma takiego zdjęcia.')
  res.set('Content-Type', rows[0].mime)
  res.set('Cache-Control', 'public, max-age=31536000, immutable')
  res.send(rows[0].data)
})
