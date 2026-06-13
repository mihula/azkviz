import prisma from '../lib/prisma'
import { YesNoQuestion, YesNoQuestionInput } from 'azkivz-shared'

function toYesNo(raw: any): YesNoQuestion {
  return { id: raw.id, text: raw.text, answer: raw.answer }
}

export async function listYesNoQuestions(): Promise<YesNoQuestion[]> {
  const rows = await prisma.yesNoQuestion.findMany({ orderBy: { id: 'asc' } })
  return rows.map(toYesNo)
}

export async function getRandomYesNoQuestion(): Promise<YesNoQuestion | null> {
  const count = await prisma.yesNoQuestion.count()
  if (count === 0) return null
  const skip = Math.floor(Math.random() * count)
  const rows = await prisma.yesNoQuestion.findMany({ skip, take: 1 })
  return rows[0] ? toYesNo(rows[0]) : null
}

export async function createYesNoQuestion(data: YesNoQuestionInput): Promise<YesNoQuestion> {
  const row = await prisma.yesNoQuestion.create({ data })
  return toYesNo(row)
}

export async function updateYesNoQuestion(id: number, data: Partial<YesNoQuestionInput>): Promise<YesNoQuestion> {
  const row = await prisma.yesNoQuestion.update({ where: { id }, data })
  return toYesNo(row)
}

export async function deleteYesNoQuestion(id: number): Promise<void> {
  await prisma.yesNoQuestion.delete({ where: { id } })
}

export async function importYesNoQuestions(items: YesNoQuestionInput[]): Promise<number> {
  const result = await prisma.yesNoQuestion.createMany({ data: items })
  return result.count
}
