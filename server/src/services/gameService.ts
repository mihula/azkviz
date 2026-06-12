import prisma from '../lib/prisma'
import { GameState, Round } from 'azkivz-shared'
import { checkWin } from './winChecker'

function parseState(raw: any): GameState {
  return {
    id: raw.id,
    status: raw.status,
    round: raw.round,
    player1Name: raw.player1Name,
    player2Name: raw.player2Name,
    activeField: raw.activeField,
    claimedP1: JSON.parse(raw.claimedP1),
    claimedP2: JSON.parse(raw.claimedP2),
    winner: raw.winner,
    updatedAt: raw.updatedAt.toISOString(),
  }
}

export async function getGameState(): Promise<GameState> {
  const raw = await prisma.gameState.findUnique({ where: { id: 1 } })
  if (!raw) throw new Error('GameState not initialized')
  return parseState(raw)
}

export async function startGame(
  player1Name: string,
  player2Name: string,
  round: Round
): Promise<GameState> {
  const raw = await prisma.gameState.update({
    where: { id: 1 },
    data: {
      status: 'PLAYING',
      player1Name,
      player2Name,
      round,
      activeField: null,
      claimedP1: '[]',
      claimedP2: '[]',
      winner: null,
    },
  })
  return parseState(raw)
}

export async function selectField(fieldNumber: number): Promise<GameState> {
  const raw = await prisma.gameState.update({
    where: { id: 1 },
    data: { activeField: fieldNumber },
  })
  return parseState(raw)
}

export async function claimField(player: 1 | 2): Promise<GameState> {
  const current = await prisma.gameState.findUnique({ where: { id: 1 } })
  if (!current) throw new Error('GameState not initialized')
  if (!current.activeField) throw new Error('No active field')

  const field = current.activeField
  const p1 = JSON.parse(current.claimedP1) as number[]
  const p2 = JSON.parse(current.claimedP2) as number[]

  if (player === 1) p1.push(field)
  else p2.push(field)

  const winner = checkWin(p1) ? 1 : checkWin(p2) ? 2 : null
  const status = winner ? 'FINISHED' : 'PLAYING'

  const raw = await prisma.gameState.update({
    where: { id: 1 },
    data: {
      claimedP1: JSON.stringify(p1),
      claimedP2: JSON.stringify(p2),
      activeField: null,
      winner,
      status,
    },
  })
  return parseState(raw)
}

export async function skipField(): Promise<GameState> {
  const raw = await prisma.gameState.update({
    where: { id: 1 },
    data: { activeField: null },
  })
  return parseState(raw)
}

export async function resetGame(): Promise<GameState> {
  const raw = await prisma.gameState.update({
    where: { id: 1 },
    data: {
      status: 'WAITING',
      player1Name: '',
      player2Name: '',
      activeField: null,
      claimedP1: '[]',
      claimedP2: '[]',
      winner: null,
    },
  })
  return parseState(raw)
}

export async function nextRound(): Promise<GameState> {
  const current = await prisma.gameState.findUnique({ where: { id: 1 } })
  if (!current) throw new Error('GameState not initialized')
  const raw = await prisma.gameState.update({
    where: { id: 1 },
    data: {
      status: 'PLAYING',
      round: 'LETTERS',
      activeField: null,
      claimedP1: '[]',
      claimedP2: '[]',
      winner: null,
    },
  })
  return parseState(raw)
}
