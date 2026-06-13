// shared/types.ts

export type Round = 'NUMBERS' | 'LETTERS'
export type GameStatus = 'WAITING' | 'PLAYING' | 'FINISHED'

export interface GameState {
  id: number
  status: GameStatus
  round: Round
  player1Name: string
  player2Name: string
  activeField: number | null
  claimedP1: number[]
  claimedP2: number[]
  winner: number | null
  updatedAt: string
  activePlayer: 1 | 2 | null
  unansweredFields: number[]
  activeQuestionType: 'normal' | 'yesno' | null
  timerStartedAt: string | null
  questionAssignments: Record<string, number>
  activeFieldHint: string | null
}

export interface Question {
  id: number
  text: string
  answer: string
  answerHint: string
  createdAt: string
}

export interface QuestionInput {
  text: string
  answer: string
  answerHint?: string
}

export interface YesNoQuestion {
  id: number
  text: string
  answer: string  // "Ano" | "Ne"
}

export interface YesNoQuestionInput {
  text: string
  answer: string
}

// Socket.io typed events
export interface ServerToClientEvents {
  'game:update': (state: GameState) => void
}

export interface ClientToServerEvents {
  'moderator:selectField': (data: { fieldNumber: number }) => void
  'moderator:claimField': (data: { player: 1 | 2 }) => void
  'moderator:skipField': () => void
  'moderator:startGame': (data: { player1Name: string; player2Name: string; round: Round }) => void
  'moderator:resetGame': () => void
  'moderator:startTimer': () => void
  'moderator:stealField': (data: { player: 1 | 2 }) => void
  'moderator:markUnanswered': () => void
  'moderator:resolveYesNo': (data: { correct: boolean }) => void
}

export interface AuthResponse {
  token: string
}

export const LETTERS_MAP: Record<number, string> = {
  1: 'A', 2: 'B', 3: 'C', 4: 'Č', 5: 'D', 6: 'E',
  7: 'F', 8: 'G', 9: 'H', 10: 'Ch', 11: 'I', 12: 'J',
  13: 'K', 14: 'L', 15: 'M', 16: 'N', 17: 'O', 18: 'P',
  19: 'R', 20: 'Ř', 21: 'S', 22: 'Š', 23: 'T', 24: 'U',
  25: 'V', 26: 'W', 27: 'Z', 28: 'Ž',
}
