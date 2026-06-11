import { Router } from 'express'
import { requireAuth } from '../middleware/auth'
import {
  listQuestions,
  createQuestion,
  updateQuestion,
  deleteQuestion,
  importQuestions,
  getQuestionForField,
} from '../services/questionService'

const router = Router()

// /field is defined before router.use(requireAuth), so requireAuth is passed explicitly
router.get('/field', requireAuth, async (req, res) => {
  const { round, fieldNumber } = req.query
  if (!round || !fieldNumber) {
    res.status(400).json({ error: 'round and fieldNumber required' })
    return
  }
  const q = await getQuestionForField(String(round), Number(fieldNumber))
  if (!q) {
    res.status(404).json({ error: 'Question not found' })
    return
  }
  res.json(q)
})

router.use(requireAuth)

router.get('/', async (req, res) => {
  const { round } = req.query
  const questions = await listQuestions(round as string | undefined)
  res.json(questions)
})

router.post('/', async (req, res) => {
  try {
    const q = await createQuestion(req.body)
    res.status(201).json(q)
  } catch (e: any) {
    res.status(400).json({ error: e.message })
  }
})

// /import must come before /:id to avoid being matched as an id
router.post('/import', async (req, res) => {
  if (!Array.isArray(req.body)) {
    res.status(400).json({ error: 'Expected array of questions' })
    return
  }
  const imported = await importQuestions(req.body)
  res.json({ imported })
})

router.put('/:id', async (req, res) => {
  const q = await updateQuestion(Number(req.params.id), req.body)
  res.json(q)
})

router.delete('/:id', async (req, res) => {
  await deleteQuestion(Number(req.params.id))
  res.status(204).send()
})

export default router
