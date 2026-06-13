import { describe, it, expect, vi, beforeEach } from 'vitest'
import { GameStatus, Round } from 'azkivz-shared'

vi.mock('../../lib/prisma', () => ({
  default: {
    gameState: {
      findUnique: vi.fn(),
      update: vi.fn(),
      upsert: vi.fn(),
    },
  },
}))

import prisma from '../../lib/prisma'
import {
  getGameState,
  startGame,
  selectField,
  claimField,
  stealField,
  markUnanswered,
  resolveYesNo,
  startTimer,
  skipField,
  resetGame,
} from '../gameService'

const mockDbState = {
  id: 1,
  status: 'WAITING',
  round: 'NUMBERS',
  player1Name: '',
  player2Name: '',
  activeField: null,
  claimedP1: '[]',
  claimedP2: '[]',
  winner: null,
  updatedAt: new Date(),
  activePlayer: null,
  unansweredFields: '[]',
  activeQuestionType: null,
  timerStartedAt: null,
}

beforeEach(() => {
  vi.clearAllMocks()
  vi.mocked(prisma.gameState.findUnique).mockResolvedValue(mockDbState as any)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  vi.mocked(prisma.gameState.update).mockImplementation((async ({ data }: any) => ({
    ...mockDbState,
    ...data,
    updatedAt: new Date(),
  })) as any)
})

describe('getGameState', () => {
  it('returns parsed game state with new fields', async () => {
    const state = await getGameState()
    expect(state.claimedP1).toEqual([])
    expect(state.unansweredFields).toEqual([])
    expect(state.activePlayer).toBeNull()
    expect(state.timerStartedAt).toBeNull()
  })
})

describe('startGame', () => {
  it('sets activePlayer to 1 and clears unansweredFields', async () => {
    await startGame('Jakub', 'Lukáš', 'NUMBERS')
    expect(prisma.gameState.update).toHaveBeenCalledWith({
      where: { id: 1 },
      data: expect.objectContaining({
        status: 'PLAYING',
        player1Name: 'Jakub',
        activePlayer: 1,
        unansweredFields: '[]',
      }),
    })
  })
})

describe('selectField', () => {
  it('sets activeQuestionType to normal for free field', async () => {
    vi.mocked(prisma.gameState.findUnique).mockResolvedValue({
      ...mockDbState,
      status: 'PLAYING',
      unansweredFields: '[]',
    } as any)
    await selectField(5)
    expect(prisma.gameState.update).toHaveBeenCalledWith({
      where: { id: 1 },
      data: expect.objectContaining({ activeField: 5, activeQuestionType: 'normal' }),
    })
  })

  it('sets activeQuestionType to yesno for unanswered field', async () => {
    vi.mocked(prisma.gameState.findUnique).mockResolvedValue({
      ...mockDbState,
      status: 'PLAYING',
      unansweredFields: '[5]',
    } as any)
    await selectField(5)
    expect(prisma.gameState.update).toHaveBeenCalledWith({
      where: { id: 1 },
      data: expect.objectContaining({ activeField: 5, activeQuestionType: 'yesno' }),
    })
  })
})

describe('startTimer', () => {
  it('updates timerStartedAt', async () => {
    await startTimer()
    const call = vi.mocked(prisma.gameState.update).mock.calls[0][0]
    expect(call.data.timerStartedAt).toBeInstanceOf(Date)
  })
})

describe('claimField', () => {
  it('flips activePlayer after claim', async () => {
    vi.mocked(prisma.gameState.findUnique).mockResolvedValue({
      ...mockDbState,
      status: 'PLAYING',
      activeField: 5,
      activePlayer: 1,
      claimedP1: '[]',
    } as any)
    await claimField(1)
    expect(prisma.gameState.update).toHaveBeenCalledWith({
      where: { id: 1 },
      data: expect.objectContaining({ claimedP1: '[5]', activePlayer: 2 }),
    })
  })

  it('throws when no active field', async () => {
    await expect(claimField(1)).rejects.toThrow('No active field')
  })
})

describe('stealField', () => {
  it('does NOT flip activePlayer (stealer loses next turn)', async () => {
    vi.mocked(prisma.gameState.findUnique).mockResolvedValue({
      ...mockDbState,
      status: 'PLAYING',
      activeField: 7,
      activePlayer: 1,
      claimedP2: '[]',
    } as any)
    await stealField(2)
    expect(prisma.gameState.update).toHaveBeenCalledWith({
      where: { id: 1 },
      data: expect.objectContaining({ claimedP2: '[7]', activePlayer: 1 }),
    })
  })
})

describe('markUnanswered', () => {
  it('adds field to unansweredFields and flips activePlayer', async () => {
    vi.mocked(prisma.gameState.findUnique).mockResolvedValue({
      ...mockDbState,
      status: 'PLAYING',
      activeField: 9,
      activePlayer: 1,
      unansweredFields: '[]',
    } as any)
    await markUnanswered()
    expect(prisma.gameState.update).toHaveBeenCalledWith({
      where: { id: 1 },
      data: expect.objectContaining({
        activeField: null,
        unansweredFields: '[9]',
        activePlayer: 2,
      }),
    })
  })
})

describe('resolveYesNo', () => {
  it('gives field to activePlayer when correct and flips', async () => {
    vi.mocked(prisma.gameState.findUnique).mockResolvedValue({
      ...mockDbState,
      status: 'PLAYING',
      activeField: 11,
      activePlayer: 2,
      claimedP1: '[]',
      claimedP2: '[]',
      unansweredFields: '[11]',
    } as any)
    await resolveYesNo(true)
    expect(prisma.gameState.update).toHaveBeenCalledWith({
      where: { id: 1 },
      data: expect.objectContaining({
        claimedP2: '[11]',
        unansweredFields: '[]',
        activePlayer: 1,
      }),
    })
  })

  it('gives field to opponent when wrong and flips', async () => {
    vi.mocked(prisma.gameState.findUnique).mockResolvedValue({
      ...mockDbState,
      status: 'PLAYING',
      activeField: 11,
      activePlayer: 1,
      claimedP1: '[]',
      claimedP2: '[]',
      unansweredFields: '[11]',
    } as any)
    await resolveYesNo(false)
    expect(prisma.gameState.update).toHaveBeenCalledWith({
      where: { id: 1 },
      data: expect.objectContaining({
        claimedP2: '[11]',
        activePlayer: 2,
      }),
    })
  })
})

describe('skipField', () => {
  it('flips activePlayer and clears active field', async () => {
    vi.mocked(prisma.gameState.findUnique).mockResolvedValue({
      ...mockDbState,
      status: 'PLAYING',
      activeField: 3,
      activePlayer: 2,
    } as any)
    await skipField()
    expect(prisma.gameState.update).toHaveBeenCalledWith({
      where: { id: 1 },
      data: expect.objectContaining({ activeField: null, activePlayer: 1 }),
    })
  })
})
