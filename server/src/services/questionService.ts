import prisma from '../lib/prisma'
import { Question, QuestionInput, LETTERS_MAP } from 'azkivz-shared'

export function computeAnswerHint(answer: string): string {
  return answer
    .trim()
    .split(/\s+/)
    .map((word) => {
      if (/^\d+$/.test(word)) return '0'
      if (word.toLowerCase().startsWith('ch')) return 'CH'
      return word.charAt(0).toUpperCase()
    })
    .join('')
}

function toQuestion(raw: any): Question {
  return {
    id: raw.id,
    text: raw.text,
    answer: raw.answer,
    answerHint: raw.answerHint,
    createdAt: raw.createdAt instanceof Date ? raw.createdAt.toISOString() : raw.createdAt,
  }
}

export async function listQuestions(): Promise<Question[]> {
  const rows = await prisma.question.findMany({ orderBy: { id: 'asc' } })
  return rows.map(toQuestion)
}

export async function getQuestionByAssignment(fieldNumber: number): Promise<Question | null> {
  const gameState = await prisma.gameState.findUnique({ where: { id: 1 } })
  if (!gameState) return null
  const assignments = JSON.parse(gameState.questionAssignments || '{}') as Record<string, number>
  const questionId = assignments[String(fieldNumber)]
  if (!questionId) return null
  const row = await prisma.question.findUnique({ where: { id: questionId } })
  return row ? toQuestion(row) : null
}

export async function createQuestion(data: QuestionInput): Promise<Question> {
  const answerHint = data.answerHint ?? computeAnswerHint(data.answer)
  const row = await prisma.question.create({ data: { text: data.text, answer: data.answer, answerHint } })
  return toQuestion(row)
}

export async function updateQuestion(id: number, data: Partial<QuestionInput>): Promise<Question> {
  const updateData: { text?: string; answer?: string; answerHint?: string } = {}
  if (data.text !== undefined) updateData.text = data.text
  if (data.answer !== undefined) {
    updateData.answer = data.answer
    updateData.answerHint = data.answerHint ?? computeAnswerHint(data.answer)
  } else if (data.answerHint !== undefined) {
    updateData.answerHint = data.answerHint
  }
  const row = await prisma.question.update({ where: { id }, data: updateData })
  return toQuestion(row)
}

export async function deleteQuestion(id: number): Promise<void> {
  await prisma.question.delete({ where: { id } })
}

export async function deleteAllQuestions(): Promise<number> {
  const result = await prisma.question.deleteMany()
  return result.count
}

export async function rerollQuestion(fieldNumber: number): Promise<Question | null> {
  const gameState = await prisma.gameState.findUnique({ where: { id: 1 } })
  if (!gameState) return null

  const assignments = JSON.parse(gameState.questionAssignments || '{}') as Record<string, number>
  const currentId = assignments[String(fieldNumber)]

  const questions = await prisma.question.findMany({ select: { id: true, answer: true } })
  if (questions.length === 0) return null

  let pool: { id: number; answer: string }[]

  if (gameState.round === 'LETTERS') {
    const letter = LETTERS_MAP[fieldNumber]
    const letterLower = letter.toLowerCase()
    const matchingOthers = questions.filter(q => {
      if (q.id === currentId) return false
      const a = q.answer.toLowerCase()
      if (!a.startsWith(letterLower)) return false
      if (letterLower === 'c' && a.startsWith('ch')) return false
      return true
    })
    if (matchingOthers.length > 0) {
      pool = matchingOthers
    } else {
      // fallback: numeric answers (start with digit), excluding current
      const numeric = questions.filter(q => q.id !== currentId && /^\d/.test(q.answer))
      pool = numeric.length > 0 ? numeric : questions.filter(q => q.id !== currentId)
      if (pool.length === 0) pool = questions
    }
  } else {
    const others = questions.filter(q => q.id !== currentId)
    pool = others.length > 0 ? others : questions
  }

  const newId = pool[Math.floor(Math.random() * pool.length)].id

  assignments[String(fieldNumber)] = newId
  const row = await prisma.question.findUnique({ where: { id: newId } })
  if (!row) return null

  await prisma.gameState.update({
    where: { id: 1 },
    data: {
      questionAssignments: JSON.stringify(assignments),
      activeFieldHint: row.answerHint,
    },
  })

  return toQuestion(row)
}

export async function importQuestions(items: QuestionInput[]): Promise<number> {
  const data = items.map((item) => ({
    text: item.text,
    answer: item.answer,
    answerHint: item.answerHint ?? computeAnswerHint(item.answer),
  }))
  const result = await prisma.question.createMany({ data })
  return result.count
}
