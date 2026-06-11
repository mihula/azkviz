// server/src/services/questionService.ts
import prisma from '../lib/prisma'
import { Question, QuestionInput } from 'azkivz-shared'

function toQuestion(raw: any): Question {
  return {
    id: raw.id,
    round: raw.round,
    fieldNumber: raw.fieldNumber,
    text: raw.text,
    answer: raw.answer,
  }
}

export async function listQuestions(round?: string): Promise<Question[]> {
  const rows = await prisma.question.findMany({
    where: round ? { round } : undefined,
    orderBy: [{ round: 'asc' }, { fieldNumber: 'asc' }],
  })
  return rows.map(toQuestion)
}

export async function getQuestionForField(
  round: string,
  fieldNumber: number
): Promise<Question | null> {
  const row = await prisma.question.findUnique({
    where: { round_fieldNumber: { round, fieldNumber } },
  })
  return row ? toQuestion(row) : null
}

export async function createQuestion(data: QuestionInput): Promise<Question> {
  const row = await prisma.question.create({ data })
  return toQuestion(row)
}

export async function updateQuestion(
  id: number,
  data: Partial<QuestionInput>
): Promise<Question> {
  const row = await prisma.question.update({ where: { id }, data })
  return toQuestion(row)
}

export async function deleteQuestion(id: number): Promise<void> {
  await prisma.question.delete({ where: { id } })
}

export async function importQuestions(items: QuestionInput[]): Promise<number> {
  let count = 0
  for (const item of items) {
    await prisma.question.upsert({
      where: { round_fieldNumber: { round: item.round, fieldNumber: item.fieldNumber } },
      update: { text: item.text, answer: item.answer },
      create: item,
    })
    count++
  }
  return count
}
