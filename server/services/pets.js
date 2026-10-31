import { notFound } from '../errors.js'
import { query } from '../db/pool.js'

export const photoUrl = (key) => (key ? `/api/public/photos/${key}` : null)

// Mapowanie nazw pól API (camelCase) na kolumny bazy.
export const PET_COLUMNS = {
  name: 'name',
  species: 'species',
  breed: 'breed',
  sex: 'sex',
  birthDate: 'birth_date',
  weightKg: 'weight_kg',
  description: 'description',
  color: 'color',
  chipNumber: 'chip_number',
  allergies: 'allergies',
  medications: 'medications',
  conditions: 'conditions',
  vaccinations: 'vaccinations',
  vetClinic: 'vet_clinic',
  vetPhone: 'vet_phone',
  contactName: 'contact_name',
  contactPhone: 'contact_phone',
}

export function toLostReport(row) {
  if (!row) return null
  return {
    id: row.id,
    lastSeenAt: row.last_seen_at,
    lastSeenLat: row.last_seen_lat,
    lastSeenLng: row.last_seen_lng,
    lastSeenPlace: row.last_seen_place,
    message: row.message,
    showPhone: row.show_phone,
    phone: row.phone,
    createdAt: row.created_at,
    resolvedAt: row.resolved_at,
  }
}

export function toPet(row) {
  return {
    id: row.id,
    name: row.name,
    species: row.species,
    breed: row.breed,
    sex: row.sex,
    birthDate: row.birth_date,
    weightKg: row.weight_kg,
    description: row.description,
    color: row.color,
    chipNumber: row.chip_number,
    allergies: row.allergies,
    medications: row.medications,
    conditions: row.conditions,
    vaccinations: row.vaccinations,
    vetClinic: row.vet_clinic,
    vetPhone: row.vet_phone,
    contactName: row.contact_name,
    contactPhone: row.contact_phone,
    photoUrl: photoUrl(row.photo_key),
    createdAt: row.created_at,
  }
}

// Podsumowanie do przełącznika zwierząt: status, nieprzeczytane zdarzenia, liczba tagów.
export async function listPetSummaries(ownerId) {
  const { rows } = await query(
    `SELECT p.id, p.name, p.species, p.color, p.photo_key,
            EXISTS (SELECT 1 FROM lost_reports r WHERE r.pet_id = p.id AND r.resolved_at IS NULL) AS is_lost,
            (SELECT count(*) FROM scans s WHERE s.pet_id = p.id AND s.read_at IS NULL)::int
              + (SELECT count(*) FROM finder_messages m WHERE m.pet_id = p.id AND m.read_at IS NULL)::int AS unread,
            (SELECT count(*) FROM tags t WHERE t.pet_id = p.id)::int AS tag_count
     FROM pets p WHERE p.owner_id = $1 ORDER BY p.created_at`,
    [ownerId],
  )
  return rows.map((row) => ({
    id: row.id,
    name: row.name,
    species: row.species,
    color: row.color,
    photoUrl: photoUrl(row.photo_key),
    isLost: row.is_lost,
    unread: row.unread,
    tagCount: row.tag_count,
  }))
}

// Zwraca zwierzę właściciela albo 404 – także gdy istnieje, ale należy do kogoś innego
// (nie zdradzamy, że takie id w ogóle jest).
export async function getOwnedPet(ownerId, petId) {
  const { rows } = await query('SELECT * FROM pets WHERE id = $1 AND owner_id = $2', [petId, ownerId])
  if (!rows[0]) throw notFound('Nie znaleziono zwierzęcia.')
  return rows[0]
}

export async function getOpenLostReport(petId) {
  const { rows } = await query('SELECT * FROM lost_reports WHERE pet_id = $1 AND resolved_at IS NULL', [petId])
  return rows[0] ?? null
}

export async function getPetDetails(ownerId, petId) {
  const row = await getOwnedPet(ownerId, petId)
  const [report, tags, counts] = await Promise.all([
    getOpenLostReport(petId),
    query(
      `SELECT t.code, t.assigned_at,
              (SELECT max(scanned_at) FROM scans s WHERE s.tag_code = t.code AND s.pet_id = t.pet_id) AS last_scan_at
       FROM tags t WHERE t.pet_id = $1 ORDER BY t.assigned_at`,
      [petId],
    ),
    query(
      `SELECT (SELECT count(*) FROM scans WHERE pet_id = $1 AND read_at IS NULL)::int
                + (SELECT count(*) FROM finder_messages WHERE pet_id = $1 AND read_at IS NULL)::int AS unread,
              (SELECT count(*) FROM vet_shares WHERE pet_id = $1 AND revoked_at IS NULL AND expires_at > now())::int AS active_vet_shares`,
      [petId],
    ),
  ])
  return {
    ...toPet(row),
    isLost: Boolean(report),
    lostReport: toLostReport(report),
    tags: tags.rows.map((t) => ({ code: t.code, assignedAt: t.assigned_at, lastScanAt: t.last_scan_at })),
    unread: counts.rows[0].unread,
    activeVetShares: counts.rows[0].active_vet_shares,
  }
}
