import { randomUUID } from 'node:crypto'
import express, { Router } from 'express'
import { query, transaction } from '../db/pool.js'
import { HttpError } from '../errors.js'
import { requireAuth } from '../middleware/auth.js'
import { getOwnedPet, getPetDetails, listPetSummaries, PET_COLUMNS, photoUrl } from '../services/pets.js'
import * as v from '../validation.js'

export const petsRouter = Router()
petsRouter.use(requireAuth)

const MAX_PETS = 20

petsRouter.get('/', async (req, res) => {
  res.json({ pets: await listPetSummaries(req.user.id) })
})

petsRouter.post('/', async (req, res) => {
  const input = v.petInput(req.body)
  const { rows: countRows } = await query('SELECT count(*)::int AS n FROM pets WHERE owner_id = $1', [req.user.id])
  if (countRows[0].n >= MAX_PETS) throw new HttpError(400, `Możesz mieć maksymalnie ${MAX_PETS} zwierząt.`)

  const keys = Object.keys(input)
  const columns = keys.map((key) => PET_COLUMNS[key])
  const { rows } = await query(
    `INSERT INTO pets (owner_id, ${columns.join(', ')})
     VALUES ($1, ${keys.map((_, i) => `$${i + 2}`).join(', ')}) RETURNING id`,
    [req.user.id, ...keys.map((key) => input[key])],
  )
  res.status(201).json({ pet: await getPetDetails(req.user.id, rows[0].id) })
})

petsRouter.get('/:petId', async (req, res) => {
  res.json({ pet: await getPetDetails(req.user.id, v.uuid(req.params.petId)) })
})

petsRouter.patch('/:petId', async (req, res) => {
  const petId = v.uuid(req.params.petId)
  await getOwnedPet(req.user.id, petId)
  const input = v.petInput(req.body, { partial: true })
  const keys = Object.keys(input)
  if (keys.length > 0) {
    const sets = keys.map((key, i) => `${PET_COLUMNS[key]} = $${i + 2}`)
    await query(`UPDATE pets SET ${sets.join(', ')}, updated_at = now() WHERE id = $1`, [
      petId,
      ...keys.map((key) => input[key]),
    ])
  }
  res.json({ pet: await getPetDetails(req.user.id, petId) })
})

petsRouter.delete('/:petId', async (req, res) => {
  const petId = v.uuid(req.params.petId)
  await getOwnedPet(req.user.id, petId)
  // Tagi wracają do puli wolnych (pet_id → NULL przez ON DELETE SET NULL).
  await query('UPDATE tags SET assigned_at = NULL WHERE pet_id = $1', [petId])
  await query('DELETE FROM pets WHERE id = $1', [petId])
  res.status(204).end()
})

/*
  Zdjęcie: surowe bajty w ciele żądania (Content-Type: image/jpeg|png|webp). Frontend zmniejsza
  zdjęcie do 900 px przed wysłaniem, więc limit 3 MB to zapas. Typ sprawdzamy po nagłówku pliku
  (magic bytes), a nie tylko po Content-Type, który klient może podać dowolny.
*/
const MAGIC = [
  { mime: 'image/jpeg', test: (b) => b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff },
  { mime: 'image/png', test: (b) => b.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) },
  { mime: 'image/webp', test: (b) => b.subarray(0, 4).toString() === 'RIFF' && b.subarray(8, 12).toString() === 'WEBP' },
]

petsRouter.put(
  '/:petId/photo',
  express.raw({ type: ['image/jpeg', 'image/png', 'image/webp'], limit: '3mb' }),
  async (req, res) => {
    const petId = v.uuid(req.params.petId)
    await getOwnedPet(req.user.id, petId)
    const body = req.body
    if (!Buffer.isBuffer(body) || body.length < 100) throw new HttpError(400, 'Wybierz zdjęcie (JPG, PNG albo WebP).')
    const kind = MAGIC.find((m) => m.test(body))
    if (!kind) throw new HttpError(400, 'To nie wygląda na zdjęcie. Obsługujemy JPG, PNG i WebP.')

    const key = randomUUID()
    await transaction(async (client) => {
      await client.query('DELETE FROM pet_photos WHERE pet_id = $1', [petId])
      await client.query('INSERT INTO pet_photos (key, pet_id, mime, data) VALUES ($1, $2, $3, $4)', [key, petId, kind.mime, body])
      await client.query('UPDATE pets SET photo_key = $2, updated_at = now() WHERE id = $1', [petId, key])
    })
    res.json({ photoUrl: photoUrl(key) })
  },
)

petsRouter.delete('/:petId/photo', async (req, res) => {
  const petId = v.uuid(req.params.petId)
  await getOwnedPet(req.user.id, petId)
  await transaction(async (client) => {
    await client.query('DELETE FROM pet_photos WHERE pet_id = $1', [petId])
    await client.query('UPDATE pets SET photo_key = NULL, updated_at = now() WHERE id = $1', [petId])
  })
  res.status(204).end()
})
