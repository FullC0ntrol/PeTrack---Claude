import { Router } from 'express'
import { query } from '../db/pool.js'
import { requireAuth } from '../middleware/auth.js'
import * as v from '../validation.js'

export const meRouter = Router()
meRouter.use(requireAuth)

meRouter.patch('/', async (req, res) => {
  const name = v.text(req.body.name, 'name', { min: 1, max: 60, label: 'Imię' })
  const phone = v.phone(req.body.phone)
  const { rows } = await query('UPDATE users SET name = $2, phone = $3 WHERE id = $1 RETURNING id, email, name, phone', [
    req.user.id,
    name,
    phone,
  ])
  res.json({ user: rows[0] })
})
