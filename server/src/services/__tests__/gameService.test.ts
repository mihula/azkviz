import { describe, it, expect, vi, beforeEach } from 'vitest'
import { GameStatus, Round } from 'azkivz-shared'

// Mock Prisma before importing service
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
  skipField,
  resetGame,
  nextRound,
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
}

beforeEach(() => {
  vi.clearAllMocks()
  vi.mocked(prisma.gameState.findUnique).mockResolvedValue(mockDbState as any)
  vi.mocked(prisma.gameState.update).mockResolvedValue(mockDbState as any)
  vi.mocked(prisma.gameState.upsert).mockResolvedValue(mockDbState as any)
})

describe('getGameState', () => {
  it('returns parsed game state', async () => {
    const state = await getGameState()
    expect(state.claimedP1).toEqual([])
    expect(state.claimedP2).toEqual([])
    expect(state.status).toBe('WAITING')
  })
})

describe('startGame', () => {
  it('calls prisma update with PLAYING status and player names', async () => {
    await startGame('Jakub', 'Lukáš', 'NUMBERS')
    expect(prisma.gameState.update).toHaveBeenCalledWith({
      where: { id: 1 },
      data: expect.objectContaining({
        status: 'PLAYING',
        player1Name: 'Jakub',
        player2Name: 'Lukáš',
        round: 'NUMBERS',
        claimedP1: '[]',
        claimedP2: '[]',
        activeField: null,
        winner: null,
      }),
    })
  })
})

describe('claimField', () => {
  it('adds field to claimedP1 and clears activeField', async () => {
    vi.mocked(prisma.gameState.findUnique).mockResolvedValue({
      ...mockDbState,
      status: 'PLAYING',
      activeField: 5,
      claimedP1: '[1,2]',
    } as any)

    await claimField(1)

    expect(prisma.gameState.update).toHaveBeenCalledWith({
      where: { id: 1 },
      data: expect.objectContaining({
        claimedP1: '[1,2,5]',
        activeField: null,
      }),
    })
  })

  it('throws when no active field', async () => {
    vi.mocked(prisma.gameState.findUnique).mockResolvedValue({
      ...mockDbState,
      activeField: null,
    } as any)

    await expect(claimField(1)).rejects.toThrow('No active field')
  })
})
