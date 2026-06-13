import { Router } from 'express'
import { requireAuth } from '../middleware/auth'
import {
  listYesNoQuestions,
  getRandomYesNoQuestion,
  createYesNoQuestion,
  updateYesNoQuestion,
  deleteYesNoQuestion,
  importYesNoQuestions,
} from '../services/yesNoService'

const router = Router()
router.use(requireAuth)

router.get('/random', async (_req, res) => {
  const q = await getRandomYesNoQuestion()
  if (!q) {
    res.status(404).json({ error: 'Žádné ano/ne otázky v databázi' })
    return
  }
  res.json(q)
})

router.get('/', async (_req, res) => {
  const questions = await listYesNoQuestions()
  res.json(questions)
})

router.post('/import', async (req, res) => {
  if (!Array.isArray(req.body)) {
    res.status(400).json({ error: 'Expected array' })
    return
  }
  const imported = await importYesNoQuestions(req.body)
  res.json({ imported })
})

router.post('/', async (req, res) => {
  try {
    const q = await createYesNoQuestion(req.body)
    res.status(201).json(q)
  } catch (e: any) {
    res.status(400).json({ error: e.message })
  }
})

router.put('/:id', async (req, res) => {
  const q = await updateYesNoQuestion(Number(req.params.id), req.body)
  res.json(q)
})

router.delete('/:id', async (req, res) => {
  await deleteYesNoQuestion(Number(req.params.id))
  res.status(204).send()
})

export default router
