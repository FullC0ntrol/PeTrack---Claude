import { Router } from 'express'
import { query, transaction } from '../db/pool.js'
import { HttpError } from '../errors.js'
import { requireAuth } from '../middleware/auth.js'
import { getOpenLostReport, getOwnedPet, toLostReport } from '../services/pets.js'
import * as v from '../validation.js'

export const eventsRouter = Router()
eventsRouter.use(requireAuth)

/*
  GET /api/pets/:petId/events – kanał zdarzeń: skany, wiadomości od znalazców, zgłoszenia
  zaginięcia i ich zakończenie, otwarcia karty przez weterynarza. Posortowane od najnowszych.
  `route` to trasa na mapę: ostatnio widziane miejsce + skany z lokalizacją w czasie zaginięcia.
*/
eventsRouter.get('/:petId/events', async (req, res) => {
  const petId = v.uuid(req.params.petId)
  const pet = await getOwnedPet(req.user.id, petId)

  const [scans, messages, reports, vet] = await Promise.all([
    query(
      `SELECT id, tag_code, source, scanned_at, lat, lng, accuracy_m, place_label, read_at
       FROM scans WHERE pet_id = $1 ORDER BY scanned_at DESC LIMIT 300`,
      [petId],
    ),
    query(
      `SELECT m.id, m.body, m.pet_condition, m.finder_contact, m.created_at, m.read_at,
              s.lat, s.lng, s.place_label
       FROM finder_messages m LEFT JOIN scans s ON s.id = m.scan_id
       WHERE m.pet_id = $1 ORDER BY m.created_at DESC LIMIT 200`,
      [petId],
    ),
    query('SELECT * FROM lost_reports WHERE pet_id = $1 ORDER BY created_at DESC LIMIT 20', [petId]),
    query(
      `SELECT id, duration, created_at, last_opened_at, open_count FROM vet_shares
       WHERE pet_id = $1 AND last_opened_at IS NOT NULL ORDER BY last_opened_at DESC LIMIT 20`,
      [petId],
    ),
  ])

  const items = [
    ...scans.rows.map((s) => ({
      type: 'scan',
      id: s.id,
      at: s.scanned_at,
      source: s.source,
      tagCode: s.tag_code,
      lat: s.lat,
      lng: s.lng,
      accuracyM: s.accuracy_m,
      place: s.place_label,
      unread: !s.read_at,
    })),
    ...messages.rows.map((m) => ({
      type: 'message',
      id: m.id,
      at: m.created_at,
      body: m.body,
      condition: m.pet_condition,
      contact: m.finder_contact,
      lat: m.lat,
      lng: m.lng,
      place: m.place_label ?? '',
      unread: !m.read_at,
    })),
    ...reports.rows.flatMap((r) => [
      { type: 'lost', id: `lost-${r.id}`, at: r.created_at, place: r.last_seen_place, lat: r.last_seen_lat, lng: r.last_seen_lng },
      ...(r.resolved_at ? [{ type: 'found', id: `found-${r.id}`, at: r.resolved_at }] : []),
    ]),
    ...vet.rows.map((s) => ({ type: 'vet', id: `vet-${s.id}`, at: s.last_opened_at, openCount: s.open_count })),
  ].sort((a, b) => new Date(b.at) - new Date(a.at))

  // Trasa dotyczy otwartego zgłoszenia, a jeśli go nie ma – ostatniego zakończonego.
  const report = reports.rows[0] ?? null
  let route = []
  if (report) {
    const from = new Date(Math.min(new Date(report.last_seen_at), new Date(report.created_at)))
    const to = report.resolved_at ? new Date(report.resolved_at) : new Date()
    route = scans.rows
      .filter((s) => s.lat !== null && new Date(s.scanned_at) >= from && new Date(s.scanned_at) <= to)
      .map((s) => ({ id: s.id, at: s.scanned_at, lat: s.lat, lng: s.lng, place: s.place_label }))
      .reverse()
    if (report.last_seen_lat !== null) {
      route.unshift({ id: 'last-seen', at: report.last_seen_at, lat: report.last_seen_lat, lng: report.last_seen_lng, place: report.last_seen_place, lastSeen: true })
    }
  }

  res.json({
    pet: { id: pet.id, name: pet.name, color: pet.color, species: pet.species },
    items,
    unread: items.filter((item) => item.unread).length,
    report: toLostReport(report),
    route,
  })
})

eventsRouter.post('/:petId/events/read', async (req, res) => {
  const petId = v.uuid(req.params.petId)
  await getOwnedPet(req.user.id, petId)
  await query('UPDATE scans SET read_at = now() WHERE pet_id = $1 AND read_at IS NULL', [petId])
  await query('UPDATE finder_messages SET read_at = now() WHERE pet_id = $1 AND read_at IS NULL', [petId])
  res.status(204).end()
})

function lostInput(body, { partial = false } = {}) {
  const out = {}
  if (!partial || body.lastSeenAt !== undefined) out.lastSeenAt = v.timestamp(body.lastSeenAt, 'lastSeenAt', 'Czas')
  if (!partial || body.lat !== undefined || body.lng !== undefined) out.point = v.coordinates(body.lat, body.lng, 'location')
  if (!partial || body.place !== undefined) out.place = v.text(body.place, 'place', { max: 120, label: 'Opis miejsca' })
  if (!partial || body.message !== undefined) {
    out.message = v.text(body.message, 'message', { max: 500, multiline: true, label: 'Komunikat' })
  }
  if (!partial || body.showPhone !== undefined) out.showPhone = v.bool(body.showPhone ?? false, 'showPhone')
  if (!partial || body.phone !== undefined) out.phone = v.phone(body.phone, 'phone')
  if (out.showPhone && !out.phone && !partial) throw new HttpError(400, 'Podaj numer, który zobaczy znalazca.', { field: 'phone' })
  return out
}

// POST /api/pets/:petId/lost – kreator „Zgłoś zaginięcie”.
eventsRouter.post('/:petId/lost', async (req, res) => {
  const petId = v.uuid(req.params.petId)
  await getOwnedPet(req.user.id, petId)
  const input = lostInput(req.body ?? {})
  if (!input.point && !input.place) {
    throw new HttpError(400, 'Zaznacz miejsce na mapie albo opisz je słowami.', { field: 'location' })
  }
  if (await getOpenLostReport(petId)) throw new HttpError(409, 'To zwierzę jest już zgłoszone jako zaginione.')

  const { rows } = await query(
    `INSERT INTO lost_reports (pet_id, last_seen_at, last_seen_lat, last_seen_lng, last_seen_place, message, show_phone, phone)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *`,
    [petId, input.lastSeenAt, input.point?.lat ?? null, input.point?.lng ?? null, input.place, input.message, input.showPhone, input.phone],
  )
  res.status(201).json({ report: toLostReport(rows[0]) })
})

eventsRouter.patch('/:petId/lost', async (req, res) => {
  const petId = v.uuid(req.params.petId)
  await getOwnedPet(req.user.id, petId)
  const report = await getOpenLostReport(petId)
  if (!report) throw new HttpError(404, 'Brak aktywnego zgłoszenia.')
  const input = lostInput(req.body ?? {}, { partial: true })
  const showPhone = input.showPhone ?? report.show_phone
  const phone = input.phone ?? report.phone
  if (showPhone && !phone) throw new HttpError(400, 'Podaj numer, który zobaczy znalazca.', { field: 'phone' })
  const { rows } = await query(
    `UPDATE lost_reports SET message = $2, show_phone = $3, phone = $4 WHERE id = $1 RETURNING *`,
    [report.id, input.message ?? report.message, showPhone, phone],
  )
  res.json({ report: toLostReport(rows[0]) })
})

// POST /api/pets/:petId/found – „Znaleziony!”. Zwraca podsumowanie do ekranu potwierdzenia.
eventsRouter.post('/:petId/found', async (req, res) => {
  const petId = v.uuid(req.params.petId)
  await getOwnedPet(req.user.id, petId)
  const summary = await transaction(async (client) => {
    const { rows } = await client.query(
      `UPDATE lost_reports SET resolved_at = now() WHERE pet_id = $1 AND resolved_at IS NULL RETURNING *`,
      [petId],
    )
    const report = rows[0]
    if (!report) throw new HttpError(409, 'To zwierzę nie jest zgłoszone jako zaginione.')
    const { rows: counts } = await client.query(
      `SELECT (SELECT count(*) FROM scans WHERE pet_id = $1 AND scanned_at >= $2)::int AS scans,
              (SELECT count(*) FROM finder_messages WHERE pet_id = $1 AND created_at >= $2)::int AS messages`,
      [petId, report.created_at],
    )
    return {
      lostSince: report.last_seen_at,
      foundAt: report.resolved_at,
      scans: counts[0].scans,
      messages: counts[0].messages,
    }
  })
  res.json({ summary })
})
