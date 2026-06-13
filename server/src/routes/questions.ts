import { Router } from 'express'
import { requireAuth } from '../middleware/auth'
import {
  listQuestions,
  createQuestion,
  updateQuestion,
  deleteQuestion,
  deleteAllQuestions,
  importQuestions,
  getQuestionByAssignment,
} from '../services/questionService'

const router = Router()

router.use(requireAuth)

router.get('/', async (_req, res) => {
  const questions = await listQuestions()
  res.json(questions)
})

// /for-field and /import must come before /:id
router.get('/for-field/:fieldNumber', async (req, res) => {
  const q = await getQuestionByAssignment(Number(req.params.fieldNumber))
  if (!q) {
    res.status(404).json({ error: 'Question not found' })
    return
  }
  res.json(q)
})

router.post('/', async (req, res) => {
  try {
    const q = await createQuestion(req.body)
    res.status(201).json(q)
  } catch (e: any) {
    res.status(400).json({ error: e.message })
  }
})

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

router.delete('/all', async (_req, res) => {
  const count = await deleteAllQuestions()
  res.json({ deleted: count })
})

router.delete('/:id', async (req, res) => {
  await deleteQuestion(Number(req.params.id))
  res.status(204).send()
})

export default router
