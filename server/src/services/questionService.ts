import prisma from '../lib/prisma'
import { Question, QuestionInput } from 'azkivz-shared'

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

export async function importQuestions(items: QuestionInput[]): Promise<number> {
  const data = items.map((item) => ({
    text: item.text,
    answer: item.answer,
    answerHint: item.answerHint ?? computeAnswerHint(item.answer),
  }))
  const result = await prisma.question.createMany({ data })
  return result.count
}
