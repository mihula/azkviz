import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('../../lib/prisma', () => ({
  default: {
    yesNoQuestion: {
      findMany: vi.fn(),
      count: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
  },
}))

import prisma from '../../lib/prisma'
import {
  listYesNoQuestions,
  getRandomYesNoQuestion,
  createYesNoQuestion,
  updateYesNoQuestion,
  deleteYesNoQuestion,
  importYesNoQuestions,
} from '../yesNoService'

const mockQ = { id: 1, text: 'Je Nile delší než Amazon?', answer: 'Ano', createdAt: new Date() }

beforeEach(() => { vi.clearAllMocks() })

describe('listYesNoQuestions', () => {
  it('returns mapped list', async () => {
    vi.mocked(prisma.yesNoQuestion.findMany).mockResolvedValue([mockQ] as any)
    const result = await listYesNoQuestions()
    expect(result).toHaveLength(1)
    expect(result[0]).toEqual({ id: 1, text: mockQ.text, answer: mockQ.answer })
  })
})

describe('getRandomYesNoQuestion', () => {
  it('returns null when database is empty', async () => {
    vi.mocked(prisma.yesNoQuestion.count).mockResolvedValue(0)
    const result = await getRandomYesNoQuestion()
    expect(result).toBeNull()
  })

  it('returns a question when questions exist', async () => {
    vi.mocked(prisma.yesNoQuestion.count).mockResolvedValue(5)
    vi.mocked(prisma.yesNoQuestion.findMany).mockResolvedValue([mockQ] as any)
    const result = await getRandomYesNoQuestion()
    expect(result).not.toBeNull()
    expect(result?.text).toBe(mockQ.text)
    expect(result?.answer).toBe('Ano')
  })
})

describe('createYesNoQuestion', () => {
  it('creates and returns question', async () => {
    vi.mocked(prisma.yesNoQuestion.create).mockResolvedValue(mockQ as any)
    const result = await createYesNoQuestion({ text: mockQ.text, answer: mockQ.answer })
    expect(result.id).toBe(1)
    expect(result.text).toBe(mockQ.text)
  })
})

describe('updateYesNoQuestion', () => {
  it('updates and returns question', async () => {
    const updated = { ...mockQ, text: 'Nová otázka?' }
    vi.mocked(prisma.yesNoQuestion.update).mockResolvedValue(updated as any)
    const result = await updateYesNoQuestion(1, { text: 'Nová otázka?' })
    expect(result.text).toBe('Nová otázka?')
  })
})

describe('deleteYesNoQuestion', () => {
  it('calls prisma delete', async () => {
    vi.mocked(prisma.yesNoQuestion.delete).mockResolvedValue(mockQ as any)
    await deleteYesNoQuestion(1)
    expect(prisma.yesNoQuestion.delete).toHaveBeenCalledWith({ where: { id: 1 } })
  })
})

describe('importYesNoQuestions', () => {
  it('creates each item and returns count', async () => {
    vi.mocked(prisma.yesNoQuestion.create).mockResolvedValue(mockQ as any)
    const count = await importYesNoQuestions([
      { text: 'Q1', answer: 'Ano' },
      { text: 'Q2', answer: 'Ne' },
    ])
    expect(count).toBe(2)
    expect(prisma.yesNoQuestion.create).toHaveBeenCalledTimes(2)
  })
})
