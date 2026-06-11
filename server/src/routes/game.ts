import { Router } from 'express'
import { getGameState } from '../services/gameService'

const router = Router()

// Public — no auth required
router.get('/', async (_req, res) => {
  try {
    const state = await getGameState()
    res.json(state)
  } catch (e: any) {
    res.status(500).json({ error: e.message })
  }
})

export default router
