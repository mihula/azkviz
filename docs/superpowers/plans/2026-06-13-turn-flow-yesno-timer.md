# Turn Flow, Yes/No Questions & Timer Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Přidat sledování tahů, doplňující ano/ne otázky pro neuhodnutá pole a vizuální timer sdílený mezi všemi klienty přes GameState.

**Architecture:** GameState na serveru rozšíříme o 4 nová pole (`activePlayer`, `unansweredFields`, `activeQuestionType`, `timerStartedAt`). Přibyde nový Prisma model `YesNoQuestion` s vlastním CRUD a random endpointem. Nabídka hráči 2 zůstane čistě v lokálním React state ModeratorPage — na server jde jen hotový výsledek. Nové socket eventy: `startTimer`, `stealField`, `markUnanswered`, `resolveYesNo`.

**Tech Stack:** TypeScript, Node.js/Express, Socket.io, Prisma, React 18, Vite, Vitest, @testing-library/react

---

## Mapa souborů

| Soubor | Změna |
|--------|-------|
| `shared/types.ts` | Přidat 4 pole do `GameState`, interface `YesNoQuestion`, nové socket eventy |
| `server/prisma/schema.prisma` | Přidat `YesNoQuestion` model, rozšířit `GameState` |
| `server/src/services/yesNoService.ts` | NOVÝ: CRUD + random pro ano/ne otázky |
| `server/src/services/__tests__/yesNoService.test.ts` | NOVÝ: testy pro yesNoService |
| `server/src/routes/yesno.ts` | NOVÝ: REST endpointy pro ano/ne otázky |
| `server/src/routes/__tests__/yesno.test.ts` | NOVÝ: testy pro yesno routes |
| `server/src/services/gameService.ts` | Rozšířit: parseState, startGame, selectField, claimField, skipField; přidat startTimer, stealField, markUnanswered, resolveYesNo |
| `server/src/services/__tests__/gameService.test.ts` | Aktualizovat mockDbState, přidat testy nových funkcí |
| `server/src/socket/gameHandler.ts` | Přidat handlery pro 4 nové eventy |
| `server/src/createApp.ts` | Přidat yesno router na `/api/questions/yesno` |
| `client/src/components/HexCell.tsx` | Přidat stav `unanswered` do `CellState` |
| `client/src/components/HexBoard.tsx` | Rozšířit `cellState()` o `unanswered` |
| `client/src/components/__tests__/HexBoard.test.tsx` | Přidat test pro `unanswered` stav |
| `client/src/pages/ModeratorPage.tsx` | Přidat `offerPhase` state, yes/no panel, timer tlačítko |
| `client/src/pages/PublicPage.tsx` | Přidat indikátor aktivního hráče a timer odpočet |
| `client/src/pages/AdminPage.tsx` | Přidat sekci pro CRUD ano/ne otázek |

---

## Task 1: Aktualizovat shared types

**Files:**
- Modify: `shared/types.ts`

- [ ] **Step 1: Přepsat soubor**

```typescript
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
}

export interface Question {
  id: number
  round: Round
  fieldNumber: number
  text: string
  answer: string
}

export interface QuestionInput {
  round: Round
  fieldNumber: number
  text: string
  answer: string
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
```

- [ ] **Step 2: Commit**

```bash
git add shared/types.ts
git commit -m "feat: extend shared types — turn flow, yes/no questions, timer"
```

---

## Task 2: Prisma schema + migrace

**Files:**
- Modify: `server/prisma/schema.prisma`

- [ ] **Step 1: Přepsat schema**

```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

model Question {
  id          Int      @id @default(autoincrement())
  round       String
  fieldNumber Int
  text        String
  answer      String
  createdAt   DateTime @default(now())

  @@unique([round, fieldNumber])
}

model YesNoQuestion {
  id        Int      @id @default(autoincrement())
  text      String
  answer    String
  createdAt DateTime @default(now())
}

model GameState {
  id                 Int       @id @default(1)
  status             String    @default("WAITING")
  round              String    @default("NUMBERS")
  player1Name        String    @default("")
  player2Name        String    @default("")
  activeField        Int?
  claimedP1          String    @default("[]")
  claimedP2          String    @default("[]")
  winner             Int?
  updatedAt          DateTime  @updatedAt
  activePlayer       Int?
  unansweredFields   String    @default("[]")
  activeQuestionType String?
  timerStartedAt     DateTime?
}
```

- [ ] **Step 2: Spustit migraci**

```bash
cd server && npx prisma db push
```

Expected: no errors, schema synchronized.

- [ ] **Step 3: Generovat Prisma client**

```bash
cd server && npx prisma generate
```

Expected: `✔ Generated Prisma Client`

- [ ] **Step 4: Commit**

```bash
git add server/prisma/schema.prisma
git commit -m "feat: add YesNoQuestion model, extend GameState with turn/timer fields"
```

---

## Task 3: yesNoService.ts (TDD)

**Files:**
- Create: `server/src/services/yesNoService.ts`
- Create: `server/src/services/__tests__/yesNoService.test.ts`

- [ ] **Step 1: Zapsat failing testy**

```typescript
// server/src/services/__tests__/yesNoService.test.ts
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
```

- [ ] **Step 2: Spustit testy — musí failovat**

```bash
cd server && npm test -- yesNoService
```

Expected: `Cannot find module '../yesNoService'`

- [ ] **Step 3: Implementovat yesNoService.ts**

```typescript
// server/src/services/yesNoService.ts
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
  let count = 0
  for (const item of items) {
    await prisma.yesNoQuestion.create({ data: item })
    count++
  }
  return count
}
```

- [ ] **Step 4: Spustit testy — musí projít**

```bash
cd server && npm test -- yesNoService
```

Expected: 7 tests pass.

- [ ] **Step 5: Commit**

```bash
git add server/src/services/yesNoService.ts server/src/services/__tests__/yesNoService.test.ts
git commit -m "feat: yes/no question service (TDD)"
```

---

## Task 4: Yes/No routes (TDD)

**Files:**
- Create: `server/src/routes/yesno.ts`
- Create: `server/src/routes/__tests__/yesno.test.ts`
- Modify: `server/src/createApp.ts`

- [ ] **Step 1: Zapsat failing testy**

```typescript
// server/src/routes/__tests__/yesno.test.ts
import { describe, it, expect, beforeAll, vi } from 'vitest'
import request from 'supertest'
import { createApp } from '../../createApp'
import { Application } from 'express'

vi.mock('../../services/yesNoService', () => ({
  listYesNoQuestions: vi.fn().mockResolvedValue([
    { id: 1, text: 'Otázka?', answer: 'Ano' },
  ]),
  getRandomYesNoQuestion: vi.fn().mockResolvedValue({ id: 1, text: 'Otázka?', answer: 'Ano' }),
  createYesNoQuestion: vi.fn().mockResolvedValue({ id: 2, text: 'Nová?', answer: 'Ne' }),
  updateYesNoQuestion: vi.fn().mockResolvedValue({ id: 1, text: 'Upravená?', answer: 'Ano' }),
  deleteYesNoQuestion: vi.fn().mockResolvedValue(undefined),
  importYesNoQuestions: vi.fn().mockResolvedValue(3),
}))

let app: Application
let token: string

beforeAll(async () => {
  process.env.MODERATOR_PIN = 'test1234'
  process.env.JWT_SECRET = 'test-secret'
  app = createApp()
  const res = await request(app).post('/api/auth/login').send({ pin: 'test1234' })
  token = res.body.token
})

describe('GET /api/questions/yesno', () => {
  it('returns 401 without token', async () => {
    const res = await request(app).get('/api/questions/yesno')
    expect(res.status).toBe(401)
  })

  it('returns list with token', async () => {
    const res = await request(app)
      .get('/api/questions/yesno')
      .set('Authorization', `Bearer ${token}`)
    expect(res.status).toBe(200)
    expect(res.body).toHaveLength(1)
    expect(res.body[0].answer).toBe('Ano')
  })
})

describe('GET /api/questions/yesno/random', () => {
  it('returns a random question', async () => {
    const res = await request(app)
      .get('/api/questions/yesno/random')
      .set('Authorization', `Bearer ${token}`)
    expect(res.status).toBe(200)
    expect(res.body.text).toBe('Otázka?')
    expect(res.body.answer).toBe('Ano')
  })
})

describe('POST /api/questions/yesno', () => {
  it('creates a question', async () => {
    const res = await request(app)
      .post('/api/questions/yesno')
      .set('Authorization', `Bearer ${token}`)
      .send({ text: 'Nová?', answer: 'Ne' })
    expect(res.status).toBe(201)
    expect(res.body.id).toBe(2)
  })
})

describe('PUT /api/questions/yesno/:id', () => {
  it('updates a question', async () => {
    const res = await request(app)
      .put('/api/questions/yesno/1')
      .set('Authorization', `Bearer ${token}`)
      .send({ text: 'Upravená?' })
    expect(res.status).toBe(200)
    expect(res.body.text).toBe('Upravená?')
  })
})

describe('DELETE /api/questions/yesno/:id', () => {
  it('deletes a question', async () => {
    const res = await request(app)
      .delete('/api/questions/yesno/1')
      .set('Authorization', `Bearer ${token}`)
    expect(res.status).toBe(204)
  })
})

describe('POST /api/questions/yesno/import', () => {
  it('returns count of imported questions', async () => {
    const res = await request(app)
      .post('/api/questions/yesno/import')
      .set('Authorization', `Bearer ${token}`)
      .send([{ text: 'Q1', answer: 'Ano' }])
    expect(res.status).toBe(200)
    expect(res.body.imported).toBe(3)
  })

  it('returns 400 for non-array payload', async () => {
    const res = await request(app)
      .post('/api/questions/yesno/import')
      .set('Authorization', `Bearer ${token}`)
      .send({ invalid: true })
    expect(res.status).toBe(400)
  })
})
```

- [ ] **Step 2: Spustit testy — musí failovat**

```bash
cd server && npm test -- yesno.test
```

Expected: module not found nebo 404 responses.

- [ ] **Step 3: Implementovat yesno.ts**

```typescript
// server/src/routes/yesno.ts
import { Router } from 'express'
import { requireAuth } from '../middleware/auth'
import {
  listYesNoQuestions,
  getRandomYesNoQuestion,
  createYesNoQuestion,
  updateYesNoQuestion,
  deleteYesNoQuestion,
  importYesNoQuestions,
} from '../services/yesNoService'

const router = Router()
router.use(requireAuth)

router.get('/random', async (_req, res) => {
  const q = await getRandomYesNoQuestion()
  if (!q) {
    res.status(404).json({ error: 'Žádné ano/ne otázky v databázi' })
    return
  }
  res.json(q)
})

router.get('/', async (_req, res) => {
  const questions = await listYesNoQuestions()
  res.json(questions)
})

router.post('/import', async (req, res) => {
  if (!Array.isArray(req.body)) {
    res.status(400).json({ error: 'Expected array' })
    return
  }
  const imported = await importYesNoQuestions(req.body)
  res.json({ imported })
})

router.post('/', async (req, res) => {
  try {
    const q = await createYesNoQuestion(req.body)
    res.status(201).json(q)
  } catch (e: any) {
    res.status(400).json({ error: e.message })
  }
})

router.put('/:id', async (req, res) => {
  const q = await updateYesNoQuestion(Number(req.params.id), req.body)
  res.json(q)
})

router.delete('/:id', async (req, res) => {
  await deleteYesNoQuestion(Number(req.params.id))
  res.status(204).send()
})

export default router
```

**Poznámka:** `/random` a `/import` musí být registrovány před `/:id` — jinak Express přiřadí "random"/"import" jako `:id` parametr.

- [ ] **Step 4: Přidat yesno router do createApp.ts**

Najít řádek s `app.use('/api/questions', questionsRouter)` a přidat za něj:

```typescript
import yesnoRouter from './routes/yesno'
// ...
app.use('/api/questions/yesno', yesnoRouter)
```

Celý soubor `server/src/createApp.ts`:

```typescript
import express, { Application } from 'express'
import cors from 'cors'
import path from 'path'
import authRouter from './routes/auth'
import questionsRouter from './routes/questions'
import gameRouter from './routes/game'
import yesnoRouter from './routes/yesno'

export function createApp(): Application {
  const app = express()
  app.use(cors({ origin: process.env.CLIENT_ORIGIN || '*' }))
  app.use(express.json({ limit: '2mb' }))

  app.use('/api/auth', authRouter)
  app.use('/api/questions/yesno', yesnoRouter)
  app.use('/api/questions', questionsRouter)
  app.use('/api/game', gameRouter)

  if (process.env.NODE_ENV === 'production') {
    const clientBuild = path.join(__dirname, '../../client/dist')
    app.use(express.static(clientBuild))
    app.get('*', (_req, res) => {
      res.sendFile(path.join(clientBuild, 'index.html'))
    })
  }

  return app
}
```

**Poznámka:** `/api/questions/yesno` musí být registrováno PŘED `/api/questions` — jinak Express prefix `/api/questions` zachytí yesno requesty jako `/:id` parametr.

- [ ] **Step 5: Spustit testy — musí projít**

```bash
cd server && npm test -- yesno.test
```

Expected: 8 tests pass.

- [ ] **Step 6: Spustit všechny server testy**

```bash
cd server && npm test
```

Expected: všechny testy pass.

- [ ] **Step 7: Commit**

```bash
git add server/src/routes/yesno.ts server/src/routes/__tests__/yesno.test.ts server/src/createApp.ts
git commit -m "feat: yes/no questions routes and CRUD endpoints (TDD)"
```

---

## Task 5: Rozšířit gameService.ts (TDD)

**Files:**
- Modify: `server/src/services/gameService.ts`
- Modify: `server/src/services/__tests__/gameService.test.ts`

- [ ] **Step 1: Přepsat gameService.ts**

```typescript
// server/src/services/gameService.ts
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
    activePlayer: raw.activePlayer as 1 | 2 | null,
    unansweredFields: JSON.parse(raw.unansweredFields || '[]'),
    activeQuestionType: raw.activeQuestionType as 'normal' | 'yesno' | null,
    timerStartedAt: raw.timerStartedAt ? raw.timerStartedAt.toISOString() : null,
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
    },
  })
  return parseState(raw)
}

export async function selectField(fieldNumber: number): Promise<GameState> {
  const current = await prisma.gameState.findUnique({ where: { id: 1 } })
  if (!current) throw new Error('GameState not initialized')
  const unanswered: number[] = JSON.parse(current.unansweredFields || '[]')
  const questionType = unanswered.includes(fieldNumber) ? 'yesno' : 'normal'
  const raw = await prisma.gameState.update({
    where: { id: 1 },
    data: { activeField: fieldNumber, activeQuestionType: questionType, timerStartedAt: null },
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
      activePlayer: winner ? null : current.activePlayer,  // nepřeklopí — zloděj ztrácí svůj příští tah
      activeQuestionType: null,
      timerStartedAt: null,
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
      activePlayer: flipPlayer(current.activePlayer as 1 | 2),
      activeQuestionType: null,
      timerStartedAt: null,
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
    },
  })
  return parseState(raw)
}
```

- [ ] **Step 2: Přepsat gameService testy**

```typescript
// server/src/services/__tests__/gameService.test.ts
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
  vi.mocked(prisma.gameState.update).mockImplementation(async ({ data }) => ({
    ...mockDbState,
    ...data,
    updatedAt: new Date(),
  }) as any)
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
```

- [ ] **Step 3: Spustit testy — musí projít**

```bash
cd server && npm test -- gameService
```

Expected: všechny testy pass.

- [ ] **Step 4: Spustit všechny server testy**

```bash
cd server && npm test
```

Expected: všechny testy pass.

- [ ] **Step 5: Commit**

```bash
git add server/src/services/gameService.ts server/src/services/__tests__/gameService.test.ts
git commit -m "feat: extend game service — turn tracking, steal, unanswered, yes/no, timer (TDD)"
```

---

## Task 6: Rozšířit socket gameHandler.ts

**Files:**
- Modify: `server/src/socket/gameHandler.ts`

- [ ] **Step 1: Přepsat gameHandler.ts**

```typescript
// server/src/socket/gameHandler.ts
import { Server, Socket } from 'socket.io'
import { ServerToClientEvents, ClientToServerEvents } from 'azkivz-shared'
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
} from '../services/gameService'
import jwt from 'jsonwebtoken'

type TypedServer = Server<ClientToServerEvents, ServerToClientEvents>
type TypedSocket = Socket<ClientToServerEvents, ServerToClientEvents>

function isModeratorSocket(socket: TypedSocket): boolean {
  const token = socket.handshake.auth.token as string | undefined
  if (!token) return false
  try {
    jwt.verify(token, process.env.JWT_SECRET!)
    return true
  } catch {
    return false
  }
}

async function broadcast(io: TypedServer) {
  const state = await getGameState()
  io.emit('game:update', state)
}

export function registerGameHandlers(io: TypedServer, socket: TypedSocket) {
  const isMod = isModeratorSocket(socket)

  getGameState().then((state) => socket.emit('game:update', state))

  if (!isMod) return

  socket.on('moderator:startGame', async ({ player1Name, player2Name, round }) => {
    await startGame(player1Name, player2Name, round)
    await broadcast(io)
  })

  socket.on('moderator:selectField', async ({ fieldNumber }) => {
    await selectField(fieldNumber)
    await broadcast(io)
  })

  socket.on('moderator:claimField', async ({ player }) => {
    await claimField(player)
    await broadcast(io)
  })

  socket.on('moderator:stealField', async ({ player }) => {
    await stealField(player)
    await broadcast(io)
  })

  socket.on('moderator:markUnanswered', async () => {
    await markUnanswered()
    await broadcast(io)
  })

  socket.on('moderator:resolveYesNo', async ({ correct }) => {
    await resolveYesNo(correct)
    await broadcast(io)
  })

  socket.on('moderator:startTimer', async () => {
    await startTimer()
    await broadcast(io)
  })

  socket.on('moderator:skipField', async () => {
    await skipField()
    await broadcast(io)
  })

  socket.on('moderator:resetGame', async () => {
    await resetGame()
    await broadcast(io)
  })
}
```

- [ ] **Step 2: Commit**

```bash
git add server/src/socket/gameHandler.ts
git commit -m "feat: add socket handlers for steal, unanswered, yes/no, timer"
```

---

## Task 7: HexCell + HexBoard — stav unanswered (TDD)

**Files:**
- Modify: `client/src/components/HexCell.tsx`
- Modify: `client/src/components/HexBoard.tsx`
- Modify: `client/src/components/__tests__/HexBoard.test.tsx`
- Modify: `client/src/index.css`

- [ ] **Step 1: Přidat failing test pro unanswered stav**

Do `client/src/components/__tests__/HexBoard.test.tsx` přidat na konec:

```typescript
it('marks unanswered fields', () => {
  render(<HexBoard gameState={{ ...baseState, unansweredFields: [7, 8] } as any} />)
  expect(document.querySelector('[data-field="7"]')).toHaveClass('unanswered')
  expect(document.querySelector('[data-field="8"]')).toHaveClass('unanswered')
  expect(document.querySelector('[data-field="9"]')).not.toHaveClass('unanswered')
})
```

Také aktualizovat `baseState` v testu — přidat nová pole:

```typescript
const baseState: GameState = {
  id: 1,
  status: 'PLAYING',
  round: 'NUMBERS',
  player1Name: 'Jakub',
  player2Name: 'Lukáš',
  activeField: null,
  claimedP1: [],
  claimedP2: [],
  winner: null,
  updatedAt: new Date().toISOString(),
  activePlayer: 1,
  unansweredFields: [],
  activeQuestionType: null,
  timerStartedAt: null,
}
```

- [ ] **Step 2: Spustit testy — nový test musí failovat**

```bash
cd client && npm test -- HexBoard
```

Expected: `unanswered` test fails (class not found).

- [ ] **Step 3: Aktualizovat HexCell.tsx**

```typescript
// client/src/components/HexCell.tsx
import { LETTERS_MAP } from 'azkivz-shared'
import type { Round } from 'azkivz-shared'

type CellState = 'free' | 'active' | 'p1' | 'p2' | 'unanswered'

interface HexCellProps {
  fieldNumber: number
  round: Round
  state: CellState
  onClick?: (fieldNumber: number) => void
  style?: React.CSSProperties
}

export default function HexCell({ fieldNumber, round, state, onClick, style }: HexCellProps) {
  const label = round === 'LETTERS' ? LETTERS_MAP[fieldNumber] : String(fieldNumber)

  return (
    <div
      className={`hex ${state}`}
      data-field={fieldNumber}
      style={style}
      onClick={() => onClick?.(fieldNumber)}
    >
      {label}
    </div>
  )
}
```

- [ ] **Step 4: Aktualizovat HexBoard.tsx — rozšířit cellState()**

V `HexBoard.tsx` najít funkci `cellState` a přepsat ji:

```typescript
function cellState(f: number): 'free' | 'active' | 'p1' | 'p2' | 'unanswered' {
  if (f === gameState.activeField) return 'active'
  if (gameState.claimedP1.includes(f)) return 'p1'
  if (gameState.claimedP2.includes(f)) return 'p2'
  if (gameState.unansweredFields?.includes(f)) return 'unanswered'
  return 'free'
}
```

- [ ] **Step 5: Přidat CSS pro unanswered do client/src/index.css**

Najít sekci s `.hex.p2` a přidat za ni:

```css
.hex.unanswered {
  background: linear-gradient(160deg, #1c1917, #0c0a09);
  color: #f59e0b;
  border: 2px dashed rgba(245,158,11,0.45);
  box-shadow: inset 0 0 10px rgba(245,158,11,0.07);
}
```

- [ ] **Step 6: Spustit testy — musí projít**

```bash
cd client && npm test -- HexBoard
```

Expected: všechny testy pass.

- [ ] **Step 7: Commit**

```bash
git add client/src/components/HexCell.tsx client/src/components/HexBoard.tsx client/src/components/__tests__/HexBoard.test.tsx client/src/index.css
git commit -m "feat: add unanswered cell state to HexCell and HexBoard (TDD)"
```

---

## Task 8: ModeratorPage — nový herní flow UI

**Files:**
- Modify: `client/src/pages/ModeratorPage.tsx`

- [ ] **Step 1: Přidat `offerPhase` state a reset efekt**

Na začátek komponenty, za stávající `useState` volání, přidat:

```typescript
const [offerPhase, setOfferPhase] = useState(false)
```

Přidat efekt pro reset `offerPhase` při změně `activeField`:

```typescript
useEffect(() => {
  setOfferPhase(false)
}, [gameState.activeField])
```

Import `useEffect` je již přidán z předchozí práce. Pokud chybí: `import { useState, useRef, useEffect } from 'react'`

- [ ] **Step 2: Přidat fetch funkci pro yes/no otázku**

Za stávající `loadQuestion` funkci přidat:

```typescript
async function loadYesNoQuestion() {
  if (!token) return
  const res = await fetch('/api/questions/yesno/random', {
    headers: { Authorization: `Bearer ${token}` },
  })
  if (res.ok) setQuestion(await res.json())
  else setQuestion(null)
}
```

- [ ] **Step 3: Aktualizovat handleFieldClick pro yes/no**

Přepsat `handleFieldClick`:

```typescript
function handleFieldClick(fieldNumber: number) {
  socket?.emit('moderator:selectField', { fieldNumber })
  // activeQuestionType se nastaví po broadcast — pak spustíme fetch
  // Detekujeme přes unansweredFields ještě před broadcastem
  const isYesNo = gameState.unansweredFields.includes(fieldNumber)
  if (isYesNo) loadYesNoQuestion()
  else loadQuestion(fieldNumber)
}
```

- [ ] **Step 4: Nahradit sekci "Action buttons" novým panelem**

Najít celou sekci začínající `{/* Action buttons */}` (přibližně řádky 143–155 v aktuálním souboru) a nahradit:

```tsx
{/* Action buttons */}
<div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
    <div style={{ fontSize: '0.65rem', fontWeight: 700, color: '#475569', letterSpacing: '1.5px', textTransform: 'uppercase' }}>
      {gameState.activeQuestionType === 'yesno' ? 'Ano / Ne otázka' : 'Přiřadit pole'}
    </div>
    <button
      disabled={!gameState.activeField || !!gameState.timerStartedAt}
      onClick={() => socket?.emit('moderator:startTimer')}
      style={{ padding: '4px 10px', borderRadius: 6, border: '1px solid rgba(251,191,36,0.3)', background: gameState.timerStartedAt ? 'rgba(251,191,36,0.15)' : 'rgba(251,191,36,0.06)', color: gameState.timerStartedAt ? '#fbbf24' : '#78716c', cursor: gameState.activeField && !gameState.timerStartedAt ? 'pointer' : 'default', fontSize: '0.75rem', fontWeight: 600, opacity: gameState.activeField ? 1 : 0.4 }}>
      {gameState.timerStartedAt ? '⏱ Běží' : '▶ Timer'}
    </button>
  </div>

  {gameState.activeQuestionType === 'yesno' ? (
    // Ano/ne otázka
    <>
      <button
        disabled={!gameState.activeField}
        onClick={() => { socket?.emit('moderator:resolveYesNo', { correct: true }); setQuestion(null) }}
        style={{ width: '100%', padding: 12, border: 'none', borderRadius: 10, background: 'linear-gradient(135deg, #22c55e, #15803d)', color: 'white', fontWeight: 700, cursor: 'pointer', fontSize: '0.9rem', opacity: gameState.activeField ? 1 : 0.4 }}>
        ✓ Správně → pole {gameState.activePlayer === 1 ? gameState.player1Name || 'Hráče 1' : gameState.player2Name || 'Hráče 2'}
      </button>
      <button
        disabled={!gameState.activeField}
        onClick={() => { socket?.emit('moderator:resolveYesNo', { correct: false }); setQuestion(null) }}
        style={{ width: '100%', padding: 12, border: 'none', borderRadius: 10, background: 'linear-gradient(135deg, #ef4444, #b91c1c)', color: 'white', fontWeight: 700, cursor: 'pointer', fontSize: '0.9rem', opacity: gameState.activeField ? 1 : 0.4 }}>
        ✗ Špatně → pole {gameState.activePlayer === 1 ? gameState.player2Name || 'Hráče 2' : gameState.player1Name || 'Hráče 1'}
      </button>
    </>
  ) : offerPhase ? (
    // Nabídka soupeři
    <>
      <div style={{ fontSize: '0.8rem', color: '#94a3b8', textAlign: 'center', padding: '4px 0' }}>
        Chce odpovídat {gameState.activePlayer === 1 ? gameState.player2Name || 'Hráč 2' : gameState.player1Name || 'Hráč 1'}?
      </div>
      <button
        onClick={() => { socket?.emit('moderator:stealField', { player: (gameState.activePlayer === 1 ? 2 : 1) as 1 | 2 }); setQuestion(null); setOfferPhase(false) }}
        style={{ width: '100%', padding: 12, border: 'none', borderRadius: 10, background: 'linear-gradient(135deg, #22d3ee, #0e7490)', color: '#042f2e', fontWeight: 700, cursor: 'pointer', fontSize: '0.9rem' }}>
        ✓ Soupeř odpověděl správně
      </button>
      <button
        onClick={() => { socket?.emit('moderator:markUnanswered'); setQuestion(null); setOfferPhase(false) }}
        style={{ width: '100%', padding: 12, borderRadius: 10, border: '1px solid rgba(245,158,11,0.3)', background: 'rgba(245,158,11,0.07)', color: '#fbbf24', fontWeight: 600, cursor: 'pointer', fontSize: '0.9rem' }}>
        ✗ Nikdo neuhodl
      </button>
    </>
  ) : (
    // Normální otázka — fáze 1
    <>
      <button
        disabled={!gameState.activeField}
        onClick={() => handleClaim(gameState.activePlayer as 1 | 2)}
        style={{ width: '100%', padding: 12, border: 'none', borderRadius: 10, background: gameState.activePlayer === 1 ? 'linear-gradient(135deg, #f97316, #c2410c)' : 'linear-gradient(135deg, #22d3ee, #0e7490)', color: gameState.activePlayer === 1 ? 'white' : '#042f2e', fontWeight: 700, cursor: 'pointer', fontSize: '0.95rem', opacity: gameState.activeField ? 1 : 0.4 }}>
        {gameState.activePlayer === 1 ? '🟠' : '🔵'} {gameState.activePlayer === 1 ? gameState.player1Name || 'Hráč 1' : gameState.player2Name || 'Hráč 2'} odpověděl správně
      </button>
      <button
        disabled={!gameState.activeField}
        onClick={() => setOfferPhase(true)}
        style={{ width: '100%', padding: 10, borderRadius: 10, border: '1px solid rgba(255,255,255,0.12)', background: 'rgba(255,255,255,0.05)', color: '#94a3b8', fontWeight: 600, cursor: 'pointer', fontSize: '0.85rem', opacity: gameState.activeField ? 1 : 0.4 }}>
        ✗ {gameState.activePlayer === 1 ? gameState.player1Name || 'Hráč 1' : gameState.player2Name || 'Hráč 2'} odpověděl špatně
      </button>
    </>
  )}

  <div style={{ display: 'flex', gap: 8 }}>
    <button onClick={handleSkip} style={{ flex: 1, padding: 10, borderRadius: 10, border: '1px solid rgba(255,255,255,0.12)', background: 'rgba(255,255,255,0.05)', color: '#94a3b8', fontWeight: 600, cursor: 'pointer', fontSize: '0.85rem' }}>⏭ Přeskočit</button>
    <button onClick={() => socket?.emit('moderator:resetGame')} style={{ flex: 1, padding: 10, borderRadius: 10, border: '1px solid rgba(239,68,68,0.25)', background: 'rgba(239,68,68,0.07)', color: '#f87171', fontWeight: 600, cursor: 'pointer', fontSize: '0.85rem' }}>↺ Reset</button>
  </div>
</div>
```

- [ ] **Step 5: Přidat indikátor aktivního hráče do levého panelu**

Ve `{/* Left: Board */}` sekci, najít div s `<HexBoard ... />` a přidat pod ním před player strip:

```tsx
{gameState.status === 'PLAYING' && gameState.activePlayer && (
  <div style={{ fontSize: '0.75rem', color: '#94a3b8', textAlign: 'center' }}>
    Na tahu: <span style={{ color: gameState.activePlayer === 1 ? '#f97316' : '#22d3ee', fontWeight: 700 }}>
      {gameState.activePlayer === 1 ? gameState.player1Name || 'Hráč 1' : gameState.player2Name || 'Hráč 2'}
    </span>
  </div>
)}
```

- [ ] **Step 6: Commit**

```bash
git add client/src/pages/ModeratorPage.tsx
git commit -m "feat: moderator UI — offer phase, yes/no panel, timer button, active player indicator"
```

---

## Task 9: PublicPage — aktivní hráč a timer

**Files:**
- Modify: `client/src/pages/PublicPage.tsx`

- [ ] **Step 1: Přidat timer hook na začátek souboru**

Na začátek `PublicPage.tsx` přidat import a hook:

```typescript
import { useGameSocket } from '../hooks/useGameSocket'
import HexBoard from '../components/HexBoard'
import { useState, useEffect } from 'react'

const TIMER_SECONDS = 30

function useCountdown(timerStartedAt: string | null): number | null {
  const [remaining, setRemaining] = useState<number | null>(null)

  useEffect(() => {
    if (!timerStartedAt) {
      setRemaining(null)
      return
    }
    const tick = () => {
      const elapsed = (Date.now() - new Date(timerStartedAt).getTime()) / 1000
      setRemaining(Math.max(0, TIMER_SECONDS - elapsed))
    }
    tick()
    const id = setInterval(tick, 100)
    return () => clearInterval(id)
  }, [timerStartedAt])

  return remaining
}
```

- [ ] **Step 2: Použít hook v komponentě**

Na začátek `PublicPage()` funkce přidat (za destructuring `gameState`):

```typescript
const countdown = useCountdown(gameState.timerStartedAt)
```

- [ ] **Step 3: Přidat timer display do top baru**

Ve `{/* Top bar */}` sekci, za existující `{gameState.activeField && (...)}` blok přidat:

```tsx
{countdown !== null && (
  <div style={{
    display: 'flex', alignItems: 'center', gap: 8,
    background: countdown < 5 ? 'rgba(239,68,68,0.15)' : 'rgba(251,191,36,0.1)',
    border: `1px solid ${countdown < 5 ? 'rgba(239,68,68,0.35)' : 'rgba(251,191,36,0.25)'}`,
    borderRadius: 24, padding: '6px 18px',
    fontSize: '1.2rem', fontWeight: 800,
    color: countdown < 5 ? '#f87171' : '#fbbf24',
    fontVariantNumeric: 'tabular-nums',
  }}>
    ⏱ {Math.ceil(countdown)}
  </div>
)}
```

- [ ] **Step 4: Přidat indikátor aktivního hráče do players strip**

Ve `{/* Players */}` sekci, najít `<div key={p} style={{ flex: 1, ...` a přidat border highlight pro aktivního hráče:

```tsx
{[1, 2].map((p) => {
  const name = p === 1 ? gameState.player1Name : gameState.player2Name
  const isActive = gameState.status === 'PLAYING' && gameState.activePlayer === p
  const color = p === 1
    ? { bg: 'rgba(249,115,22,.2)', border: 'rgba(249,115,22,.35)', dot: '#f97316', dotBg: 'linear-gradient(135deg,#fb923c,#c2410c)' }
    : { bg: 'rgba(34,211,238,.2)', border: 'rgba(34,211,238,.35)', dot: '#22d3ee', dotBg: 'linear-gradient(135deg,#67e8f9,#0e7490)' }
  return (
    <div key={p} style={{
      flex: 1, borderRadius: 14, padding: '0 20px',
      display: 'flex', alignItems: 'center', gap: 14,
      border: `${isActive ? 2 : 1}px solid ${color.border}`,
      background: color.bg,
      flexDirection: p === 2 ? 'row-reverse' : 'row',
      boxShadow: isActive ? `0 0 16px ${color.dot}44` : 'none',
      transition: 'box-shadow 0.3s',
    }}>
      <div style={{ width: 40, height: 46, clipPath: 'polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%)', background: color.dotBg, flexShrink: 0 }} />
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: '1.35rem', fontWeight: 800, color: '#f1f5f9', textAlign: p === 2 ? 'right' : 'left' }}>
          {name || (p === 1 ? 'Hráč 1' : 'Hráč 2')}
        </div>
        {isActive && (
          <div style={{ fontSize: '0.7rem', color: color.dot, fontWeight: 600, textAlign: p === 2 ? 'right' : 'left', letterSpacing: '0.5px' }}>
            NA TAHU
          </div>
        )}
      </div>
    </div>
  )
})}
```

- [ ] **Step 5: Commit**

```bash
git add client/src/pages/PublicPage.tsx
git commit -m "feat: public view — active player indicator and countdown timer"
```

---

## Task 10: AdminPage — sekce ano/ne otázek

**Files:**
- Modify: `client/src/pages/AdminPage.tsx`

- [ ] **Step 1: Přidat state a fetch pro ano/ne otázky**

Na začátek `AdminPage()` funkce, za stávající `useState` volání, přidat:

```typescript
const [activeTab, setActiveTab] = useState<'questions' | 'yesno'>('questions')
const [yesnoQuestions, setYesnoQuestions] = useState<{ id: number; text: string; answer: string }[]>([])
const [yesnoForm, setYesnoForm] = useState({ text: '', answer: 'Ano' })
const [yesnoEditing, setYesnoEditing] = useState<number | null>(null)
const [yesnoImportText, setYesnoImportText] = useState('')
const [yesnoImportStatus, setYesnoImportStatus] = useState('')
```

Přidat fetch funkci za stávající `fetchQuestions`:

```typescript
const fetchYesno = useCallback(async () => {
  if (!token) return
  const res = await fetch('/api/questions/yesno', { headers: authHeaders })
  if (res.ok) setYesnoQuestions(await res.json())
}, [token, authHeaders])

useEffect(() => { fetchYesno() }, [fetchYesno])
```

- [ ] **Step 2: Přidat handlery pro ano/ne CRUD**

Za stávající `handleImport` funkci přidat:

```typescript
async function handleYesnoSave(e: React.FormEvent) {
  e.preventDefault()
  let res: Response
  if (yesnoEditing !== null) {
    res = await fetch(`/api/questions/yesno/${yesnoEditing}`, { method: 'PUT', headers: authHeaders, body: JSON.stringify(yesnoForm) })
  } else {
    res = await fetch('/api/questions/yesno', { method: 'POST', headers: authHeaders, body: JSON.stringify(yesnoForm) })
  }
  if (!res.ok) { alert('Uložení selhalo'); return }
  setYesnoForm({ text: '', answer: 'Ano' })
  setYesnoEditing(null)
  fetchYesno()
}

async function handleYesnoDelete(id: number) {
  if (!confirm('Smazat otázku?')) return
  const res = await fetch(`/api/questions/yesno/${id}`, { method: 'DELETE', headers: authHeaders })
  if (!res.ok) { alert('Smazání selhalo'); return }
  fetchYesno()
}

async function handleYesnoImport() {
  setYesnoImportStatus('Importuji…')
  try {
    const data = JSON.parse(yesnoImportText)
    const res = await fetch('/api/questions/yesno/import', { method: 'POST', headers: authHeaders, body: JSON.stringify(data) })
    const result = await res.json()
    setYesnoImportStatus(`✓ Importováno ${result.imported} otázek`)
    setYesnoImportText('')
    fetchYesno()
  } catch (e: unknown) {
    setYesnoImportStatus(`✗ Chyba: ${e instanceof Error ? e.message : String(e)}`)
  }
}
```

- [ ] **Step 3: Přidat tab switcher do headeru AdminPage**

Nahradit `<h2 style=... >Otázky ({questions.length})</h2>` tímto (je to celý div uvnitř left sloupce):

```tsx
<div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
  <button onClick={() => setActiveTab('questions')} style={{ padding: '6px 16px', borderRadius: 8, border: 'none', background: activeTab === 'questions' ? 'linear-gradient(135deg, #f97316, #c2410c)' : 'rgba(255,255,255,0.06)', color: activeTab === 'questions' ? 'white' : '#64748b', fontWeight: 600, cursor: 'pointer', fontSize: '0.85rem' }}>
    Otázky ({questions.length})
  </button>
  <button onClick={() => setActiveTab('yesno')} style={{ padding: '6px 16px', borderRadius: 8, border: 'none', background: activeTab === 'yesno' ? 'linear-gradient(135deg, #f59e0b, #b45309)' : 'rgba(255,255,255,0.06)', color: activeTab === 'yesno' ? 'white' : '#64748b', fontWeight: 600, cursor: 'pointer', fontSize: '0.85rem' }}>
    Ano/Ne ({yesnoQuestions.length})
  </button>
  {activeTab === 'questions' && (
    <select value={filterRound} onChange={e => setFilterRound(e.target.value as Round | '')} style={{ ...inputStyle, width: 'auto' }}>
      <option value="">Všechna kola</option>
      <option value="NUMBERS">Kolo 1 — Čísla</option>
      <option value="LETTERS">Kolo 2 — Písmena</option>
    </select>
  )}
</div>
```

- [ ] **Step 4: Podmínit zobrazení question listu a přidat yesno list**

Najít div se `questions.map(q => ...)` a zabalit ho do podmínky:

```tsx
{activeTab === 'questions' ? (
  <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
    {questions.map(q => (
      // ... stávající kód beze změny ...
    ))}
    {questions.length === 0 && <div style={{ color: '#475569', textAlign: 'center', padding: 24 }}>Žádné otázky</div>}
  </div>
) : (
  <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
    {yesnoQuestions.map(q => (
      <div key={q.id} style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 10, padding: '10px 14px', display: 'flex', alignItems: 'flex-start', gap: 12 }}>
        <div style={{ flexShrink: 0, width: 40, height: 46, clipPath: 'polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%)', background: 'linear-gradient(135deg, #f59e0b, #b45309)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: 800, fontSize: '0.7rem' }}>
          A/N
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: '0.85rem', color: '#e2e8f0', marginBottom: 4 }}>{q.text}</div>
          <div style={{ fontSize: '0.78rem', color: '#22d3ee' }}>→ {q.answer}</div>
        </div>
        <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
          <button onClick={() => { setYesnoEditing(q.id); setYesnoForm({ text: q.text, answer: q.answer }) }} style={{ padding: '4px 10px', borderRadius: 6, border: '1px solid rgba(255,255,255,0.12)', background: 'rgba(255,255,255,0.05)', color: '#94a3b8', cursor: 'pointer', fontSize: '0.78rem' }}>Editovat</button>
          <button onClick={() => handleYesnoDelete(q.id)} style={{ padding: '4px 10px', borderRadius: 6, border: '1px solid rgba(239,68,68,0.2)', background: 'rgba(239,68,68,0.06)', color: '#f87171', cursor: 'pointer', fontSize: '0.78rem' }}>Smazat</button>
        </div>
      </div>
    ))}
    {yesnoQuestions.length === 0 && <div style={{ color: '#475569', textAlign: 'center', padding: 24 }}>Žádné ano/ne otázky</div>}
  </div>
)}
```

- [ ] **Step 5: Přidat yesno form do pravého sloupce**

V pravém sloupci, podmínit zobrazení formuláře podle `activeTab`. Celý pravý sloupec (`{/* Right: Add/Edit form + JSON import */}`):

```tsx
{/* Right: Add/Edit form + JSON import */}
<div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
  {activeTab === 'questions' ? (
    <>
      {/* Stávající Form pro otázky — beze změny */}
      <div style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 12, padding: 16 }}>
        <h3 style={{ fontSize: '0.85rem', fontWeight: 700, color: '#94a3b8', marginBottom: 12 }}>{editing !== null ? 'Upravit otázku' : 'Přidat otázku'}</h3>
        <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <select value={form.round ?? ''} onChange={e => setForm(f => ({ ...f, round: e.target.value as Round }))} style={inputStyle} required>
            <option value="" disabled>Kolo</option>
            <option value="NUMBERS">Kolo 1 — Čísla</option>
            <option value="LETTERS">Kolo 2 — Písmena</option>
          </select>
          <input type="number" min={1} max={28} value={form.fieldNumber ?? ''} onChange={e => setForm(f => ({ ...f, fieldNumber: Number(e.target.value) }))} placeholder="Číslo pole (1–28)" style={inputStyle} required />
          <textarea value={form.text ?? ''} onChange={e => setForm(f => ({ ...f, text: e.target.value }))} placeholder="Text otázky" rows={3} style={{ ...inputStyle, resize: 'vertical' }} required />
          <input value={form.answer ?? ''} onChange={e => setForm(f => ({ ...f, answer: e.target.value }))} placeholder="Správná odpověď" style={inputStyle} required />
          <div style={{ display: 'flex', gap: 8 }}>
            <button type="submit" style={{ flex: 1, padding: '9px', borderRadius: 8, border: 'none', background: 'linear-gradient(135deg, #f97316, #ea580c)', color: 'white', fontWeight: 700, cursor: 'pointer', fontSize: '0.9rem' }}>
              {editing !== null ? '✓ Uložit' : '+ Přidat'}
            </button>
            {editing !== null && (
              <button type="button" onClick={() => { setEditing(null); setForm({}) }} style={{ padding: '9px 12px', borderRadius: 8, border: '1px solid rgba(255,255,255,0.1)', background: 'transparent', color: '#64748b', cursor: 'pointer', fontSize: '0.9rem' }}>Zrušit</button>
            )}
          </div>
        </form>
      </div>
      {/* Stávající JSON Import — beze změny */}
      <div style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 12, padding: 16 }}>
        <h3 style={{ fontSize: '0.85rem', fontWeight: 700, color: '#94a3b8', marginBottom: 8 }}>Import z JSON</h3>
        <div style={{ fontSize: '0.75rem', color: '#475569', marginBottom: 8, fontFamily: 'monospace', background: 'rgba(0,0,0,0.3)', borderRadius: 6, padding: 8 }}>
          {`[{"round":"NUMBERS","fieldNumber":1,"text":"...","answer":"..."}]`}
        </div>
        <textarea value={importText} onChange={e => setImportText(e.target.value)} placeholder="Vlož JSON nebo načti soubor…" rows={5} style={{ ...inputStyle, fontFamily: 'monospace', fontSize: '0.78rem', marginBottom: 8, resize: 'vertical' }} />
        <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
          <label style={{ flex: 1, padding: '9px', borderRadius: 8, border: '1px solid rgba(255,255,255,0.12)', background: 'rgba(255,255,255,0.05)', color: '#94a3b8', cursor: 'pointer', fontSize: '0.85rem', textAlign: 'center' as const }}>
            📂 Načíst soubor
            <input type="file" accept=".json" style={{ display: 'none' }} onChange={e => {
              const file = e.target.files?.[0]
              if (!file) return
              const reader = new FileReader()
              reader.onload = ev => setImportText(ev.target?.result as string)
              reader.readAsText(file)
            }} />
          </label>
          <button onClick={handleImport} disabled={!importText.trim()} style={{ flex: 1, padding: '9px', borderRadius: 8, border: 'none', background: importText.trim() ? 'linear-gradient(135deg, #6366f1, #4338ca)' : 'rgba(99,102,241,0.2)', color: importText.trim() ? 'white' : '#6366f1', fontWeight: 700, cursor: importText.trim() ? 'pointer' : 'default', fontSize: '0.85rem' }}>
            ⬆ Importovat
          </button>
        </div>
        {importStatus && <div style={{ fontSize: '0.8rem', color: importStatus.startsWith('✓') ? '#22c55e' : '#f87171' }}>{importStatus}</div>}
      </div>
    </>
  ) : (
    <>
      {/* Form pro ano/ne otázky */}
      <div style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 12, padding: 16 }}>
        <h3 style={{ fontSize: '0.85rem', fontWeight: 700, color: '#94a3b8', marginBottom: 12 }}>{yesnoEditing !== null ? 'Upravit ano/ne otázku' : 'Přidat ano/ne otázku'}</h3>
        <form onSubmit={handleYesnoSave} style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <textarea value={yesnoForm.text} onChange={e => setYesnoForm(f => ({ ...f, text: e.target.value }))} placeholder="Text otázky" rows={3} style={{ ...inputStyle, resize: 'vertical' }} required />
          <select value={yesnoForm.answer} onChange={e => setYesnoForm(f => ({ ...f, answer: e.target.value }))} style={inputStyle} required>
            <option value="Ano">Ano</option>
            <option value="Ne">Ne</option>
          </select>
          <div style={{ display: 'flex', gap: 8 }}>
            <button type="submit" style={{ flex: 1, padding: '9px', borderRadius: 8, border: 'none', background: 'linear-gradient(135deg, #f59e0b, #b45309)', color: 'white', fontWeight: 700, cursor: 'pointer', fontSize: '0.9rem' }}>
              {yesnoEditing !== null ? '✓ Uložit' : '+ Přidat'}
            </button>
            {yesnoEditing !== null && (
              <button type="button" onClick={() => { setYesnoEditing(null); setYesnoForm({ text: '', answer: 'Ano' }) }} style={{ padding: '9px 12px', borderRadius: 8, border: '1px solid rgba(255,255,255,0.1)', background: 'transparent', color: '#64748b', cursor: 'pointer', fontSize: '0.9rem' }}>Zrušit</button>
            )}
          </div>
        </form>
      </div>
      {/* Import ano/ne otázek */}
      <div style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 12, padding: 16 }}>
        <h3 style={{ fontSize: '0.85rem', fontWeight: 700, color: '#94a3b8', marginBottom: 8 }}>Import z JSON</h3>
        <div style={{ fontSize: '0.75rem', color: '#475569', marginBottom: 8, fontFamily: 'monospace', background: 'rgba(0,0,0,0.3)', borderRadius: 6, padding: 8 }}>
          {`[{"text":"Je Nile delší než Amazon?","answer":"Ano"}]`}
        </div>
        <textarea value={yesnoImportText} onChange={e => setYesnoImportText(e.target.value)} placeholder="Vlož JSON nebo načti soubor…" rows={4} style={{ ...inputStyle, fontFamily: 'monospace', fontSize: '0.78rem', marginBottom: 8, resize: 'vertical' }} />
        <button onClick={handleYesnoImport} disabled={!yesnoImportText.trim()} style={{ width: '100%', padding: '9px', borderRadius: 8, border: 'none', background: yesnoImportText.trim() ? 'linear-gradient(135deg, #f59e0b, #b45309)' : 'rgba(245,158,11,0.2)', color: yesnoImportText.trim() ? 'white' : '#f59e0b', fontWeight: 700, cursor: yesnoImportText.trim() ? 'pointer' : 'default', fontSize: '0.85rem' }}>
          ⬆ Importovat
        </button>
        {yesnoImportStatus && <div style={{ fontSize: '0.8rem', marginTop: 8, color: yesnoImportStatus.startsWith('✓') ? '#22c55e' : '#f87171' }}>{yesnoImportStatus}</div>}
      </div>
    </>
  )}
</div>
```

- [ ] **Step 6: Commit**

```bash
git add client/src/pages/AdminPage.tsx
git commit -m "feat: admin — add yes/no questions tab with CRUD and import"
```

---

## Task 11: Build check, testy a push

- [ ] **Step 1: Spustit všechny server testy**

```bash
npm run test --workspace=server
```

Expected: všechny testy pass.

- [ ] **Step 2: Spustit všechny client testy**

```bash
npm run test --workspace=client
```

Expected: všechny testy pass.

- [ ] **Step 3: TypeScript build check**

```bash
npm run build
```

Expected: no TypeScript errors, build succeeds.

- [ ] **Step 4: Zkontrolovat shodu spec a implementace**

Projít `docs/superpowers/specs/2026-06-13-turn-flow-yesno-timer-design.md` a ověřit:
- `activePlayer`, `unansweredFields`, `activeQuestionType`, `timerStartedAt` jsou v GameState ✓
- `YesNoQuestion` model existuje v schema ✓
- Socket eventy `startTimer`, `stealField`, `markUnanswered`, `resolveYesNo` jsou implementovány ✓
- Turn advancement logika odpovídá tabulce ve spec ✓
- REST endpointy `/api/questions/yesno`, `/random`, `/import` existují ✓
- HexCell má stav `unanswered` ✓
- PublicPage zobrazuje activePlayer a timer ✓
- AdminPage má tab pro ano/ne otázky ✓

- [ ] **Step 5: Push na main**

```bash
git push
```

Railway automaticky nasadí ze `main` branch.
