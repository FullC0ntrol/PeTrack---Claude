import { Router } from 'express'
import { query } from '../db/pool.js'
import { HttpError } from '../errors.js'
import { requireAuth } from '../middleware/auth.js'
import { rateLimit } from '../middleware/rateLimit.js'
import { generateTagCode } from '../services/crypto.js'
import { getOwnedPet } from '../services/pets.js'
import * as v from '../validation.js'

export const tagsRouter = Router()
tagsRouter.use(requireAuth)

// Wpisywanie kodów ręcznie – limit, żeby nie dało się zgadywać istniejących kodów.
const claimLimit = rateLimit({
  name: 'tag-claim',
  windowMs: 15 * 60 * 1000,
  max: 30,
  keyFn: (req) => req.user?.id,
  message: 'Za dużo prób przypisania tagu. Odczekaj chwilę.',
})

/*
  POST /api/tags/claim { code, petId } – przypisanie wolnego tagu (po zeskanowaniu albo wpisaniu kodu).
  Tylko istniejące, wolne tagi: kody są nadawane wcześniej (seed, `npm run tags:generate`).
*/
tagsRouter.post('/claim', claimLimit, async (req, res) => {
  const code = v.tagCode(req.body.code)
  const petId = v.uuid(req.body.petId, 'petId')
  const pet = await getOwnedPet(req.user.id, petId)

  const { rows } = await query(
    `UPDATE tags SET pet_id = $2, assigned_at = now()
     WHERE code = $1 AND pet_id IS NULL RETURNING code, assigned_at`,
    [code, petId],
  )
  if (rows[0]) return res.json({ tag: { code: rows[0].code, assignedAt: rows[0].assigned_at }, pet: { id: pet.id, name: pet.name } })

  const { rows: existing } = await query(
    `SELECT t.pet_id, p.owner_id FROM tags t LEFT JOIN pets p ON p.id = t.pet_id WHERE t.code = $1`,
    [code],
  )
  if (!existing[0]) throw new HttpError(404, 'Nie znamy takiego kodu. Sprawdź znaki na zawieszce.', { field: 'code' })
  if (existing[0].pet_id === petId) throw new HttpError(409, `Ten tag już należy do: ${pet.name}.`, { field: 'code' })
  if (existing[0].owner_id === req.user.id) {
    throw new HttpError(409, 'Ten tag jest przypisany do innego Twojego zwierzęcia. Najpierw go odepnij.', { field: 'code' })
  }
  throw new HttpError(409, 'Ten tag jest już zajęty.', { field: 'code' })
})

const newTagLimit = rateLimit({
  name: 'tag-new',
  windowMs: 60 * 60 * 1000,
  max: 20,
  keyFn: (req) => req.user?.id,
  message: 'Za dużo nowych tagów naraz. Odczekaj chwilę.',
})

/*
  POST /api/tags/new – nowy wolny kod dla pustego tagu NFC (albo tagu z kodem spoza tej bazy).
  Aplikacja zapisuje go na tagu i dopiero wtedy przypisuje przez /claim – nieudany zapis zostawia
  tylko wolny, nikomu nieznany kod.
*/
tagsRouter.post('/new', newTagLimit, async (req, res) => {
  for (;;) {
    const code = generateTagCode()
    // ON CONFLICT: przy (bardzo mało prawdopodobnym) powtórzeniu kodu po prostu losujemy kolejny.
    const { rowCount } = await query(`INSERT INTO tags (code, batch) VALUES ($1, 'nfc') ON CONFLICT DO NOTHING`, [code])
    if (rowCount) return res.status(201).json({ code })
  }
})

// DELETE /api/tags/:code – odpięcie (np. zgubiona zawieszka). Tag wraca do puli wolnych.
tagsRouter.delete('/:code', async (req, res) => {
  const code = v.tagCode(req.params.code)
  const { rowCount } = await query(
    `UPDATE tags SET pet_id = NULL, assigned_at = NULL
     WHERE code = $1 AND pet_id IN (SELECT id FROM pets WHERE owner_id = $2)`,
    [code, req.user.id],
  )
  if (!rowCount) throw new HttpError(404, 'Nie znaleziono tagu.')
  res.status(204).end()
})
