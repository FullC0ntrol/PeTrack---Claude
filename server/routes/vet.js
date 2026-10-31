import { Router } from 'express'
import { query, transaction } from '../db/pool.js'
import { HttpError } from '../errors.js'
import { requireAuth } from '../middleware/auth.js'
import { generateToken, sha256 } from '../services/crypto.js'
import { getOwnedPet } from '../services/pets.js'
import * as v from '../validation.js'

// Montowany pod /api, więc requireAuth na poziomie tras, a nie całego routera.
export const vetRouter = Router()

const toShare = (row) => ({
  id: row.id,
  duration: row.duration,
  expiresAt: row.expires_at,
  revokedAt: row.revoked_at,
  createdAt: row.created_at,
  openCount: row.open_count,
  lastOpenedAt: row.last_opened_at,
})

vetRouter.get('/pets/:petId/vet-shares', requireAuth, async (req, res) => {
  const petId = v.uuid(req.params.petId)
  await getOwnedPet(req.user.id, petId)
  const { rows } = await query(
    `SELECT * FROM vet_shares WHERE pet_id = $1 AND revoked_at IS NULL AND expires_at > now() ORDER BY created_at DESC`,
    [petId],
  )
  res.json({ shares: rows.map(toShare) })
})

/*
  POST /api/pets/:petId/vet-shares { duration: '1h' | '24h' | '7d' }
  Nowe udostępnienie unieważnia poprzednie – w danej chwili działa jeden kod QR. Token wraca
  tylko raz, w tej odpowiedzi; w bazie zostaje jego skrót.
*/
vetRouter.post('/pets/:petId/vet-shares', requireAuth, async (req, res) => {
  const petId = v.uuid(req.params.petId)
  await getOwnedPet(req.user.id, petId)
  const duration = v.oneOf(req.body.duration, Object.keys(v.VET_DURATIONS), 'duration', 'Czas ważności')
  const token = generateToken()

  const share = await transaction(async (client) => {
    await client.query(
      `UPDATE vet_shares SET revoked_at = now() WHERE pet_id = $1 AND revoked_at IS NULL AND expires_at > now()`,
      [petId],
    )
    const { rows } = await client.query(
      `INSERT INTO vet_shares (pet_id, token_hash, duration, expires_at)
       VALUES ($1, $2, $3, now() + make_interval(mins => $4)) RETURNING *`,
      [petId, sha256(token), duration, v.VET_DURATIONS[duration]],
    )
    return rows[0]
  })
  res.status(201).json({ share: { ...toShare(share), token } })
})

vetRouter.delete('/vet-shares/:shareId', requireAuth, async (req, res) => {
  const shareId = v.uuid(req.params.shareId)
  const { rowCount } = await query(
    `UPDATE vet_shares SET revoked_at = now()
     WHERE id = $1 AND revoked_at IS NULL AND pet_id IN (SELECT id FROM pets WHERE owner_id = $2)`,
    [shareId, req.user.id],
  )
  if (!rowCount) throw new HttpError(404, 'To udostępnienie już nie działa.')
  res.status(204).end()
})
