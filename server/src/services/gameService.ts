import prisma from '../lib/prisma'
import { GameState, Round, LETTERS_MAP } from 'azkivz-shared'
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
    updatedAt: raw.updatedAt instanceof Date ? raw.updatedAt.toISOString() : raw.updatedAt,
    activePlayer: raw.activePlayer as 1 | 2 | null,
    unansweredFields: JSON.parse(raw.unansweredFields || '[]'),
    activeQuestionType: raw.activeQuestionType as 'normal' | 'yesno' | null,
    timerStartedAt: raw.timerStartedAt ? (raw.timerStartedAt instanceof Date ? raw.timerStartedAt.toISOString() : raw.timerStartedAt) : null,
    questionAssignments: JSON.parse(raw.questionAssignments || '{}'),
    activeFieldHint: raw.activeFieldHint ?? null,
  }
}

function flipPlayer(p: 1 | 2 | null): 1 | 2 {
  return p === 1 ? 2 : 1
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
  const questions = await prisma.question.findMany({ select: { id: true, answer: true } })
  if (questions.length === 0) throw new Error('No questions in database')

  const assignments: Record<string, number> = {}
  const used = new Set<number>()

  if (round === 'NUMBERS') {
    // Shuffle so each field gets a unique question (cycles only if pool < 28)
    const shuffled = [...questions].sort(() => Math.random() - 0.5)
    for (let f = 1; f <= 28; f++) {
      assignments[String(f)] = shuffled[(f - 1) % shuffled.length].id
    }
  } else {
    for (let f = 1; f <= 28; f++) {
      const letter = LETTERS_MAP[f]
      const letterLower = letter.toLowerCase()
      const matching = questions.filter(q => {
        const a = q.answer.toLowerCase()
        if (!a.startsWith(letterLower)) return false
        // 'C' must not match 'Ch' answers (Ch is a separate Czech letter)
        if (letterLower === 'c' && a.startsWith('ch')) return false
        return true
      })
      const pool = matching.length > 0 ? matching : questions
      // Prefer questions not yet used; fall back to full pool if all used
      const unused = pool.filter(q => !used.has(q.id))
      const candidates = unused.length > 0 ? unused : pool
      const picked = candidates[Math.floor(Math.random() * candidates.length)]
      assignments[String(f)] = picked.id
      used.add(picked.id)
    }
  }

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
      activePlayer: 1,
      unansweredFields: '[]',
      activeQuestionType: null,
      timerStartedAt: null,
      questionAssignments: JSON.stringify(assignments),
      activeFieldHint: null,
    },
  })
  return parseState(raw)
}

export async function selectField(fieldNumber: number, autoStartTimer = false): Promise<GameState> {
  const current = await prisma.gameState.findUnique({ where: { id: 1 } })
  if (!current) throw new Error('GameState not initialized')
  const unanswered: number[] = JSON.parse(current.unansweredFields || '[]')
  const questionType = unanswered.includes(fieldNumber) ? 'yesno' : 'normal'

  const assignments = JSON.parse(current.questionAssignments || '{}') as Record<string, number>
  const questionId = assignments[String(fieldNumber)]
  let activeFieldHint: string | null = null
  if (questionType === 'yesno') {
    activeFieldHint = 'A/N'
  } else if (questionId) {
    const q = await prisma.question.findUnique({ where: { id: questionId }, select: { answerHint: true } })
    activeFieldHint = q?.answerHint ?? null
  }

  const raw = await prisma.gameState.update({
    where: { id: 1 },
    data: {
      activeField: fieldNumber,
      activeQuestionType: questionType,
      timerStartedAt: autoStartTimer ? new Date() : null,
      activeFieldHint,
    },
  })
  return parseState(raw)
}

export async function startTimer(): Promise<GameState> {
  const raw = await prisma.gameState.update({
    where: { id: 1 },
    data: { timerStartedAt: new Date() },
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
      activePlayer: winner ? null : flipPlayer(current.activePlayer as 1 | 2),
      activeQuestionType: null,
      timerStartedAt: null,
      activeFieldHint: null,
    },
  })
  return parseState(raw)
}

export async function stealField(player: 1 | 2): Promise<GameState> {
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
      activePlayer: winner ? null : current.activePlayer,  // does NOT flip — stealer loses next turn
      activeQuestionType: null,
      timerStartedAt: null,
      activeFieldHint: null,
    },
  })
  return parseState(raw)
}

export async function markUnanswered(): Promise<GameState> {
  const current = await prisma.gameState.findUnique({ where: { id: 1 } })
  if (!current) throw new Error('GameState not initialized')
  if (!current.activeField) throw new Error('No active field')

  const field = current.activeField
  const unanswered = JSON.parse(current.unansweredFields || '[]') as number[]
  if (!unanswered.includes(field)) unanswered.push(field)

  const raw = await prisma.gameState.update({
    where: { id: 1 },
    data: {
      activeField: null,
      unansweredFields: JSON.stringify(unanswered),
      activePlayer: flipPlayer(current.activePlayer as 1 | 2), // B declined → B plays next
      activeQuestionType: null,
      timerStartedAt: null,
      activeFieldHint: null,
    },
  })
  return parseState(raw)
}

export async function stealFailed(): Promise<GameState> {
  const current = await prisma.gameState.findUnique({ where: { id: 1 } })
  if (!current) throw new Error('GameState not initialized')
  if (!current.activeField) throw new Error('No active field')

  const field = current.activeField
  const unanswered = JSON.parse(current.unansweredFields || '[]') as number[]
  if (!unanswered.includes(field)) unanswered.push(field)

  const raw = await prisma.gameState.update({
    where: { id: 1 },
    data: {
      activeField: null,
      unansweredFields: JSON.stringify(unanswered),
      activePlayer: current.activePlayer, // B tried but failed → A plays next (B used their chance)
      activeQuestionType: null,
      timerStartedAt: null,
      activeFieldHint: null,
    },
  })
  return parseState(raw)
}

export async function resolveYesNo(correct: boolean): Promise<GameState> {
  const current = await prisma.gameState.findUnique({ where: { id: 1 } })
  if (!current) throw new Error('GameState not initialized')
  if (!current.activeField) throw new Error('No active field')

  const field = current.activeField
  const activePlayer = current.activePlayer as 1 | 2
  const winnerPlayer = correct ? activePlayer : flipPlayer(activePlayer)

  const p1 = JSON.parse(current.claimedP1) as number[]
  const p2 = JSON.parse(current.claimedP2) as number[]
  const unanswered = (JSON.parse(current.unansweredFields || '[]') as number[]).filter(f => f !== field)

  if (winnerPlayer === 1) p1.push(field)
  else p2.push(field)

  const winner = checkWin(p1) ? 1 : checkWin(p2) ? 2 : null
  const status = winner ? 'FINISHED' : 'PLAYING'

  const raw = await prisma.gameState.update({
    where: { id: 1 },
    data: {
      claimedP1: JSON.stringify(p1),
      claimedP2: JSON.stringify(p2),
      unansweredFields: JSON.stringify(unanswered),
      activeField: null,
      winner,
      status,
      activePlayer: winner ? null : flipPlayer(activePlayer),
      activeQuestionType: null,
      timerStartedAt: null,
      activeFieldHint: null,
    },
  })
  return parseState(raw)
}

export async function correctField(action: 'free' | 'p1' | 'p2' | 'unanswered'): Promise<GameState> {
  const current = await prisma.gameState.findUnique({ where: { id: 1 } })
  if (!current) throw new Error('GameState not initialized')
  if (!current.activeField) throw new Error('No active field')

  const field = current.activeField
  let p1 = (JSON.parse(current.claimedP1) as number[]).filter(f => f !== field)
  let p2 = (JSON.parse(current.claimedP2) as number[]).filter(f => f !== field)
  let unanswered = (JSON.parse(current.unansweredFields || '[]') as number[]).filter(f => f !== field)

  if (action === 'p1') p1.push(field)
  else if (action === 'p2') p2.push(field)
  else if (action === 'unanswered') unanswered.push(field)

  const winner = checkWin(p1) ? 1 : checkWin(p2) ? 2 : null
  const status = winner ? 'FINISHED' : 'PLAYING'

  const raw = await prisma.gameState.update({
    where: { id: 1 },
    data: {
      claimedP1: JSON.stringify(p1),
      claimedP2: JSON.stringify(p2),
      unansweredFields: JSON.stringify(unanswered),
      activeField: null,
      winner,
      status,
      activePlayer: winner ? null : current.activePlayer,
      activeQuestionType: null,
      timerStartedAt: null,
      activeFieldHint: null,
    },
  })
  return parseState(raw)
}

export async function skipField(): Promise<GameState> {
  const current = await prisma.gameState.findUnique({ where: { id: 1 } })
  if (!current) throw new Error('GameState not initialized')
  const raw = await prisma.gameState.update({
    where: { id: 1 },
    data: {
      activeField: null,
      activeQuestionType: null,
      timerStartedAt: null,
      activeFieldHint: null,
      activePlayer: flipPlayer(current.activePlayer as 1 | 2),
    },
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
      activePlayer: null,
      unansweredFields: '[]',
      activeQuestionType: null,
      timerStartedAt: null,
      questionAssignments: '{}',
      activeFieldHint: null,
    },
  })
  return parseState(raw)
}
