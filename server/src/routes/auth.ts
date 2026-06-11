import { Router } from 'express'
import jwt from 'jsonwebtoken'

const router = Router()

router.post('/login', (req, res) => {
  const { pin } = req.body
  if (!pin) {
    res.status(400).json({ error: 'PIN required' })
    return
  }
  if (pin !== process.env.MODERATOR_PIN) {
    res.status(401).json({ error: 'Invalid PIN' })
    return
  }
  const token = jwt.sign({ role: 'moderator' }, process.env.JWT_SECRET!, {
    expiresIn: '24h',
  })
  res.json({ token })
})

export default router
