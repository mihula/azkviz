# AZKvíz Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Vybudovat full-stack webovou aplikaci AZKvíz s veřejným pohledem (pyramida, live stav), moderátorským pohledem (řízení hry) a admin pohledem (správa otázek), s real-time komunikací přes WebSocket.

**Architecture:** React (Vite) + Express + Socket.io jako NPM workspace monorepo. Jeden Express server servuje React build i API. Prisma ORM s SQLite pro dev/test, PostgreSQL pro produkci.

**Tech Stack:** React 18, Vite 5, TypeScript 5, Express 4, Socket.io 4, Prisma 5, Vitest, @testing-library/react, supertest, jsonwebtoken, tsx, concurrently

---

## Struktura souborů

```
AZKviz/
├── package.json                    # workspace root + dev scripts
├── shared/
│   ├── package.json
│   └── types.ts                    # sdílené TS typy (GameState, Question, socket events)
├── server/
│   ├── package.json
│   ├── tsconfig.json
│   ├── prisma/
│   │   └── schema.prisma
│   └── src/
│       ├── index.ts                # Express entrypoint
│       ├── lib/
│       │   └── hexUtils.ts         # fieldToCoord, getNeighbors
│       ├── services/
│       │   ├── winChecker.ts       # BFS win condition
│       │   ├── gameService.ts      # CRUD game_state
│       │   └── questionService.ts  # CRUD questions + JSON import
│       ├── routes/
│       │   ├── auth.ts
│       │   ├── game.ts
│       │   └── questions.ts
│       ├── socket/
│       │   └── gameHandler.ts      # Socket.io event handlers
│       └── middleware/
│           └── auth.ts             # JWT auth middleware
└── client/
    ├── package.json
    ├── tsconfig.json
    ├── vite.config.ts
    ├── index.html
    └── src/
        ├── main.tsx
        ├── App.tsx                 # router (public / moderator / admin)
        ├── components/
        │   ├── HexBoard.tsx        # pyramida — sdílená
        │   ├── HexCell.tsx         # jednotlivý hexagon
        │   └── PinGate.tsx         # PIN přihlášení
        ├── pages/
        │   ├── PublicPage.tsx      # live pohled pro hráče
        │   ├── ModeratorPage.tsx   # řízení hry
        │   └── AdminPage.tsx       # správa otázek
        └── hooks/
            └── useGameSocket.ts    # Socket.io hook
```

---

## Task 1: Monorepo scaffold

**Files:**
- Create: `package.json`
- Create: `shared/package.json`
- Create: `shared/types.ts` (prázdný zatím)
- Create: `server/package.json`
- Create: `server/tsconfig.json`
- Create: `server/src/index.ts` (prázdný zatím)
- Create: `client/package.json`
- Create: `client/tsconfig.json`
- Create: `client/vite.config.ts`
- Create: `client/index.html`
- Create: `client/src/main.tsx`
- Create: `.gitignore`
- Create: `.env.example`

- [ ] **Step 1: Root package.json**

```json
{
  "name": "azkivz",
  "private": true,
  "workspaces": ["shared", "server", "client"],
  "scripts": {
    "dev": "concurrently -n server,client -c cyan,magenta \"npm run dev --workspace=server\" \"npm run dev --workspace=client\"",
    "build": "npm run build --workspace=client && npm run build --workspace=server",
    "test": "npm run test --workspaces --if-present"
  },
  "devDependencies": {
    "concurrently": "^8.2.2"
  }
}
```

- [ ] **Step 2: shared/package.json**

```json
{
  "name": "azkivz-shared",
  "version": "1.0.0",
  "main": "./types.ts",
  "types": "./types.ts"
}
```

- [ ] **Step 3: server/package.json**

```json
{
  "name": "server",
  "version": "1.0.0",
  "scripts": {
    "dev": "tsx watch src/index.ts",
    "build": "tsc",
    "start": "node dist/index.js",
    "test": "vitest run",
    "test:watch": "vitest",
    "db:generate": "prisma generate",
    "db:migrate": "prisma migrate dev",
    "db:push": "prisma db push"
  },
  "dependencies": {
    "express": "^4.18.3",
    "socket.io": "^4.7.5",
    "jsonwebtoken": "^9.0.2",
    "@prisma/client": "^5.14.0",
    "cors": "^2.8.5",
    "azkivz-shared": "*"
  },
  "devDependencies": {
    "prisma": "^5.14.0",
    "tsx": "^4.15.6",
    "typescript": "^5.4.5",
    "vitest": "^1.6.0",
    "supertest": "^7.0.0",
    "@types/express": "^4.17.21",
    "@types/jsonwebtoken": "^9.0.6",
    "@types/supertest": "^6.0.2",
    "@types/cors": "^2.8.17",
    "@types/node": "^20.14.0"
  }
}
```

- [ ] **Step 4: server/tsconfig.json**

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "commonjs",
    "lib": ["ES2022"],
    "outDir": "./dist",
    "rootDir": "./src",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "paths": {
      "azkivz-shared": ["../shared/types.ts"]
    }
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist"]
}
```

- [ ] **Step 5: client/package.json**

```json
{
  "name": "client",
  "version": "1.0.0",
  "scripts": {
    "dev": "vite",
    "build": "tsc && vite build",
    "preview": "vite preview",
    "test": "vitest run",
    "test:watch": "vitest"
  },
  "dependencies": {
    "react": "^18.3.1",
    "react-dom": "^18.3.1",
    "react-router-dom": "^6.23.1",
    "socket.io-client": "^4.7.5",
    "azkivz-shared": "*"
  },
  "devDependencies": {
    "@vitejs/plugin-react": "^4.3.1",
    "vite": "^5.3.1",
    "typescript": "^5.4.5",
    "vitest": "^1.6.0",
    "@testing-library/react": "^16.0.0",
    "@testing-library/jest-dom": "^6.4.6",
    "@testing-library/user-event": "^14.5.2",
    "jsdom": "^24.1.0",
    "@types/react": "^18.3.3",
    "@types/react-dom": "^18.3.0"
  }
}
```

- [ ] **Step 6: client/tsconfig.json**

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "lib": ["ES2020", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "moduleResolution": "bundler",
    "jsx": "react-jsx",
    "strict": true,
    "noEmit": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "paths": {
      "azkivz-shared": ["../shared/types.ts"]
    }
  },
  "include": ["src"]
}
```

- [ ] **Step 7: client/vite.config.ts**

```typescript
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      'azkivz-shared': path.resolve(__dirname, '../shared/types.ts'),
    },
  },
  server: {
    proxy: {
      '/api': 'http://localhost:3001',
      '/socket.io': {
        target: 'http://localhost:3001',
        ws: true,
      },
    },
  },
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/test-setup.ts'],
  },
})
```

- [ ] **Step 8: client/index.html**

```html
<!DOCTYPE html>
<html lang="cs">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>AZKvíz</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
```

- [ ] **Step 9: client/src/test-setup.ts**

```typescript
import '@testing-library/jest-dom'
```

- [ ] **Step 10: .env.example**

```
DATABASE_URL="file:./dev.db"
MODERATOR_PIN="1234"
JWT_SECRET="change-me-in-production"
PORT=3001
```

Zkopírovat do `.env`:
```bash
cp .env.example .env
```

- [ ] **Step 11: .gitignore**

```
node_modules/
dist/
.env
*.db
*.db-journal
```

- [ ] **Step 12: Instalace závislostí**

```bash
npm install
```

Expected: workspace packages nalinkovány, `node_modules/` vytvořen v rootu.

- [ ] **Step 13: Commit**

```bash
git init
git add .
git commit -m "feat: monorepo scaffold"
```

---

## Task 2: Shared types

**Files:**
- Create: `shared/types.ts`

- [ ] **Step 1: Zapsat všechny sdílené typy**

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
  'moderator:nextRound': () => void
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
git commit -m "feat: shared TypeScript types"
```

---

## Task 3: Prisma schema + DB setup

**Files:**
- Create: `server/prisma/schema.prisma`
- Create: `server/src/lib/prisma.ts`

- [ ] **Step 1: server/prisma/schema.prisma**

```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = env("DB_PROVIDER")
  url      = env("DATABASE_URL")
}

model Question {
  id          Int      @id @default(autoincrement())
  round       String   // "NUMBERS" | "LETTERS"
  fieldNumber Int
  text        String
  answer      String
  createdAt   DateTime @default(now())

  @@unique([round, fieldNumber])
}

model GameState {
  id          Int      @id @default(1)
  status      String   @default("WAITING")   // "WAITING" | "PLAYING" | "FINISHED"
  round       String   @default("NUMBERS")
  player1Name String   @default("")
  player2Name String   @default("")
  activeField Int?
  claimedP1   String   @default("[]")        // JSON array of Int
  claimedP2   String   @default("[]")        // JSON array of Int
  winner      Int?
  updatedAt   DateTime @updatedAt
}
```

- [ ] **Step 2: Přidat DB_PROVIDER do .env**

```
DB_PROVIDER="sqlite"
DATABASE_URL="file:./dev.db"
```

- [ ] **Step 3: server/src/lib/prisma.ts**

```typescript
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()
export default prisma
```

- [ ] **Step 4: Generovat Prisma client a vytvořit migraci**

```bash
cd server
npx prisma generate
npx prisma db push
```

Expected: `server/prisma/dev.db` vytvořen, tabulky `Question` a `GameState` existují.

- [ ] **Step 5: Inicializovat singleton GameState**

```bash
cd server
npx prisma studio
```

Nebo přidat seed skript `server/prisma/seed.ts`:

```typescript
import { PrismaClient } from '@prisma/client'
const prisma = new PrismaClient()

async function main() {
  await prisma.gameState.upsert({
    where: { id: 1 },
    update: {},
    create: { id: 1 },
  })
  console.log('GameState initialized')
}

main().then(() => prisma.$disconnect())
```

Spustit seed:
```bash
cd server && npx tsx prisma/seed.ts
```

- [ ] **Step 6: Commit**

```bash
git add server/prisma/ server/src/lib/prisma.ts .env.example
git commit -m "feat: prisma schema and db setup"
```

---

## Task 4: Hex utilities + win condition (TDD)

**Files:**
- Create: `server/src/lib/hexUtils.ts`
- Create: `server/src/services/winChecker.ts`
- Create: `server/src/services/__tests__/winChecker.test.ts`
- Create: `server/src/lib/__tests__/hexUtils.test.ts`
- Create: `server/vitest.config.ts`

- [ ] **Step 1: vitest.config.ts**

```typescript
// server/vitest.config.ts
import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    environment: 'node',
  },
})
```

- [ ] **Step 2: Zapsat failing testy pro hexUtils**

```typescript
// server/src/lib/__tests__/hexUtils.test.ts
import { describe, it, expect } from 'vitest'
import { fieldToCoord, coordToField, getNeighbors } from '../hexUtils'

describe('fieldToCoord', () => {
  it('field 1 is row 0 col 0', () => {
    expect(fieldToCoord(1)).toEqual({ row: 0, col: 0 })
  })
  it('field 2 is row 1 col 0', () => {
    expect(fieldToCoord(2)).toEqual({ row: 1, col: 0 })
  })
  it('field 3 is row 1 col 1', () => {
    expect(fieldToCoord(3)).toEqual({ row: 1, col: 1 })
  })
  it('field 13 is row 4 col 2', () => {
    expect(fieldToCoord(13)).toEqual({ row: 4, col: 2 })
  })
  it('field 28 is row 6 col 6', () => {
    expect(fieldToCoord(28)).toEqual({ row: 6, col: 6 })
  })
})

describe('coordToField', () => {
  it('row 0 col 0 is field 1', () => {
    expect(coordToField(0, 0)).toBe(1)
  })
  it('row 6 col 0 is field 22', () => {
    expect(coordToField(6, 0)).toBe(22)
  })
  it('invalid row returns null', () => {
    expect(coordToField(-1, 0)).toBeNull()
    expect(coordToField(7, 0)).toBeNull()
  })
  it('invalid col returns null', () => {
    expect(coordToField(3, 4)).toBeNull()
    expect(coordToField(3, -1)).toBeNull()
  })
})

describe('getNeighbors', () => {
  it('field 1 (apex) has neighbors 2 and 3', () => {
    expect(getNeighbors(1).sort()).toEqual([2, 3])
  })
  it('field 5 (row2 col1) has 6 neighbors', () => {
    // same row: 4, 6; above: 2, 3; below: 8, 9
    expect(getNeighbors(5).sort((a, b) => a - b)).toEqual([2, 3, 4, 6, 8, 9])
  })
  it('field 22 (bottom-left corner) has neighbors 16 and 23', () => {
    expect(getNeighbors(22).sort((a, b) => a - b)).toEqual([16, 23])
  })
})
```

- [ ] **Step 3: Spustit testy — musí failovat**

```bash
cd server && npm test
```

Expected: `Cannot find module '../hexUtils'`

- [ ] **Step 4: Implementovat hexUtils.ts**

```typescript
// server/src/lib/hexUtils.ts

// ROW_STARTS[r] = 0-indexed offset of first field in row r
// Row r has (r+1) fields, starts at field r*(r+1)/2 + 1
const ROW_STARTS = [0, 1, 3, 6, 10, 15, 21] as const

export function fieldToCoord(field: number): { row: number; col: number } {
  const idx = field - 1
  let row = 0
  while (row < 6 && ROW_STARTS[row + 1] <= idx) row++
  return { row, col: idx - ROW_STARTS[row] }
}

export function coordToField(row: number, col: number): number | null {
  if (row < 0 || row > 6) return null
  if (col < 0 || col > row) return null
  return ROW_STARTS[row] + col + 1
}

export function getNeighbors(field: number): number[] {
  const { row, col } = fieldToCoord(field)
  const candidates: [number, number][] = [
    [row, col - 1],
    [row, col + 1],
    [row - 1, col - 1],
    [row - 1, col],
    [row + 1, col],
    [row + 1, col + 1],
  ]
  return candidates
    .map(([r, c]) => coordToField(r, c))
    .filter((f): f is number => f !== null)
}
```

- [ ] **Step 5: Spustit hexUtils testy — musí projít**

```bash
cd server && npm test -- hexUtils
```

Expected: 9 tests pass.

- [ ] **Step 6: Zapsat failing testy pro winChecker**

```typescript
// server/src/services/__tests__/winChecker.test.ts
import { describe, it, expect } from 'vitest'
import { checkWin } from '../winChecker'

describe('checkWin - player 1 (top to bottom)', () => {
  it('returns false when nothing claimed', () => {
    expect(checkWin([], 1)).toBe(false)
  })

  it('returns false when field 1 not claimed', () => {
    expect(checkWin([22, 23, 24, 25, 26, 27, 28], 1)).toBe(false)
  })

  it('returns false with path that does not reach bottom', () => {
    expect(checkWin([1, 2, 4], 1)).toBe(false)
  })

  it('returns true with direct left-edge path', () => {
    // 1 → 2 → 4 → 7 → 11 → 16 → 22
    expect(checkWin([1, 2, 4, 7, 11, 16, 22], 1)).toBe(true)
  })

  it('returns true with right-edge path', () => {
    // 1 → 3 → 6 → 10 → 15 → 21 → 28
    expect(checkWin([1, 3, 6, 10, 15, 21, 28], 1)).toBe(true)
  })

  it('returns true with zigzag path through middle', () => {
    // 1 → 2 → 5 → 9 → 13 → 18 → 25
    expect(checkWin([1, 2, 5, 9, 13, 18, 25], 1)).toBe(true)
  })

  it('returns false when path is broken', () => {
    // 1 → 2 → [gap] → 7 → 11 → 16 → 22
    expect(checkWin([1, 2, 7, 11, 16, 22], 1)).toBe(false)
  })
})

describe('checkWin - player 2 (left to right)', () => {
  it('returns false when nothing claimed', () => {
    expect(checkWin([], 2)).toBe(false)
  })

  it('returns false with only left edge fields', () => {
    expect(checkWin([2, 4, 7], 2)).toBe(false)
  })

  it('returns true with simple horizontal path via row 2', () => {
    // 2(left) → 5 → 6(right)
    expect(checkWin([2, 5, 6], 2)).toBe(true)
  })

  it('returns true using apex field 1 as bridge', () => {
    // 2(left) → 1(apex) → 3(right)
    expect(checkWin([1, 2, 3], 2)).toBe(true)
  })

  it('returns false with broken horizontal path', () => {
    // 2(left) → [gap] → 6(right)
    expect(checkWin([2, 6], 2)).toBe(false)
  })

  it('returns true with bottom-spanning path', () => {
    // 22(left) → 23 → 24 → 25 → 26 → 27 → 28(right)
    expect(checkWin([22, 23, 24, 25, 26, 27, 28], 2)).toBe(true)
  })
})
```

- [ ] **Step 7: Spustit testy — musí failovat**

```bash
cd server && npm test -- winChecker
```

Expected: `Cannot find module '../winChecker'`

- [ ] **Step 8: Implementovat winChecker.ts**

```typescript
// server/src/services/winChecker.ts
import { getNeighbors } from '../lib/hexUtils'

// Left edge: leftmost field of each row 1-6 (excluding apex 1)
export const LEFT_EDGE = new Set([2, 4, 7, 11, 16, 22])
// Right edge: rightmost field of each row 1-6 (excluding apex 1)
export const RIGHT_EDGE = new Set([3, 6, 10, 15, 21, 28])
// Bottom row
export const BOTTOM_ROW = new Set([22, 23, 24, 25, 26, 27, 28])

export function checkWin(claimed: number[], player: 1 | 2): boolean {
  const claimedSet = new Set(claimed)

  if (player === 1) {
    if (!claimedSet.has(1)) return false
    return bfs(1, (f) => BOTTOM_ROW.has(f), claimedSet)
  }

  // Player 2: connect left edge to right edge
  const starts = [...LEFT_EDGE].filter((f) => claimedSet.has(f))
  for (const start of starts) {
    if (bfs(start, (f) => RIGHT_EDGE.has(f), claimedSet)) return true
  }
  return false
}

function bfs(
  start: number,
  isTarget: (f: number) => boolean,
  claimed: Set<number>
): boolean {
  const visited = new Set([start])
  const queue = [start]
  while (queue.length > 0) {
    const curr = queue.shift()!
    if (isTarget(curr)) return true
    for (const neighbor of getNeighbors(curr)) {
      if (claimed.has(neighbor) && !visited.has(neighbor)) {
        visited.add(neighbor)
        queue.push(neighbor)
      }
    }
  }
  return false
}
```

- [ ] **Step 9: Spustit všechny server testy — musí projít**

```bash
cd server && npm test
```

Expected: 20 tests pass.

- [ ] **Step 10: Commit**

```bash
git add server/src/lib/ server/src/services/winChecker.ts server/src/services/__tests__/ server/vitest.config.ts
git commit -m "feat: hex utilities and win condition algorithm (TDD)"
```

---

## Task 5: Game service

**Files:**
- Create: `server/src/services/gameService.ts`
- Create: `server/src/services/__tests__/gameService.test.ts`

- [ ] **Step 1: Zapsat failing testy (mock Prisma)**

```typescript
// server/src/services/__tests__/gameService.test.ts
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
```

- [ ] **Step 2: Spustit testy — musí failovat**

```bash
cd server && npm test -- gameService
```

Expected: `Cannot find module '../gameService'`

- [ ] **Step 3: Implementovat gameService.ts**

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

  const winner = checkWin(p1, 1) ? 1 : checkWin(p2, 2) ? 2 : null
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
```

- [ ] **Step 4: Spustit testy — musí projít**

```bash
cd server && npm test
```

Expected: všechny testy pass.

- [ ] **Step 5: Commit**

```bash
git add server/src/services/gameService.ts server/src/services/__tests__/gameService.test.ts
git commit -m "feat: game service with win condition integration (TDD)"
```

---

## Task 6: Auth middleware

**Files:**
- Create: `server/src/middleware/auth.ts`
- Create: `server/src/routes/auth.ts`
- Create: `server/src/routes/__tests__/auth.test.ts`

- [ ] **Step 1: Zapsat failing testy**

```typescript
// server/src/routes/__tests__/auth.test.ts
import { describe, it, expect, beforeAll } from 'vitest'
import request from 'supertest'
import { createApp } from '../../createApp'
import { Application } from 'express'

let app: Application

beforeAll(() => {
  process.env.MODERATOR_PIN = 'test1234'
  process.env.JWT_SECRET = 'test-secret'
  app = createApp()
})

describe('POST /api/auth/login', () => {
  it('returns 200 and token with correct PIN', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ pin: 'test1234' })
    expect(res.status).toBe(200)
    expect(res.body.token).toBeTruthy()
  })

  it('returns 401 with wrong PIN', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ pin: 'wrong' })
    expect(res.status).toBe(401)
  })

  it('returns 400 with missing PIN', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({})
    expect(res.status).toBe(400)
  })
})
```

- [ ] **Step 2: Spustit testy — musí failovat**

```bash
cd server && npm test -- auth
```

- [ ] **Step 3: server/src/middleware/auth.ts**

```typescript
import { Request, Response, NextFunction } from 'express'
import jwt from 'jsonwebtoken'

export function requireAuth(req: Request, res: Response, next: NextFunction) {
  const header = req.headers.authorization
  if (!header?.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Missing token' })
    return
  }
  const token = header.slice(7)
  try {
    jwt.verify(token, process.env.JWT_SECRET!)
    next()
  } catch {
    res.status(401).json({ error: 'Invalid token' })
  }
}
```

- [ ] **Step 4: server/src/routes/auth.ts**

```typescript
import { Router } from 'express'
import jwt from 'jsonwebtoken'

const router = Router()

router.post('/login', (req, res) => {
  const { pin } = req.body
  if (!pin) {
    res.status(400).json({ error: 'PIN required' })
    return
  }
  if (pin !== process.env.MODERATOR_PIN) {
    res.status(401).json({ error: 'Invalid PIN' })
    return
  }
  const token = jwt.sign({ role: 'moderator' }, process.env.JWT_SECRET!, {
    expiresIn: '24h',
  })
  res.json({ token })
})

export default router
```

- [ ] **Step 5: server/src/createApp.ts** (extrahovaná factory funkce pro testování)

```typescript
import express from 'express'
import cors from 'cors'
import authRouter from './routes/auth'

export function createApp() {
  const app = express()
  app.use(cors())
  app.use(express.json())
  app.use('/api/auth', authRouter)
  return app
}
```

- [ ] **Step 6: Spustit testy — musí projít**

```bash
cd server && npm test -- auth
```

Expected: 3 tests pass.

- [ ] **Step 7: Commit**

```bash
git add server/src/middleware/ server/src/routes/auth.ts server/src/routes/__tests__/ server/src/createApp.ts
git commit -m "feat: auth middleware and login route (TDD)"
```

---

## Task 7: Questions routes

**Files:**
- Create: `server/src/services/questionService.ts`
- Create: `server/src/routes/questions.ts`
- Create: `server/src/routes/__tests__/questions.test.ts`

- [ ] **Step 1: questionService.ts**

```typescript
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
```

- [ ] **Step 2: Zapsat failing testy pro questions route**

```typescript
// server/src/routes/__tests__/questions.test.ts
import { describe, it, expect, beforeAll, vi } from 'vitest'
import request from 'supertest'
import { createApp } from '../../createApp'
import { Application } from 'express'

vi.mock('../../services/questionService', () => ({
  listQuestions: vi.fn().mockResolvedValue([
    { id: 1, round: 'NUMBERS', fieldNumber: 1, text: 'Otázka?', answer: 'Odpověď' },
  ]),
  createQuestion: vi.fn().mockResolvedValue(
    { id: 2, round: 'NUMBERS', fieldNumber: 2, text: 'Nová?', answer: 'Nová' }
  ),
  updateQuestion: vi.fn().mockResolvedValue(
    { id: 1, round: 'NUMBERS', fieldNumber: 1, text: 'Upravená?', answer: 'Upravená' }
  ),
  deleteQuestion: vi.fn().mockResolvedValue(undefined),
  importQuestions: vi.fn().mockResolvedValue(3),
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

describe('GET /api/questions', () => {
  it('returns 401 without token', async () => {
    const res = await request(app).get('/api/questions')
    expect(res.status).toBe(401)
  })

  it('returns questions list with token', async () => {
    const res = await request(app)
      .get('/api/questions')
      .set('Authorization', `Bearer ${token}`)
    expect(res.status).toBe(200)
    expect(res.body).toHaveLength(1)
    expect(res.body[0].text).toBe('Otázka?')
  })
})

describe('POST /api/questions/import', () => {
  it('returns count of imported questions', async () => {
    const payload = [
      { round: 'NUMBERS', fieldNumber: 1, text: 'Q1', answer: 'A1' },
    ]
    const res = await request(app)
      .post('/api/questions/import')
      .set('Authorization', `Bearer ${token}`)
      .send(payload)
    expect(res.status).toBe(200)
    expect(res.body.imported).toBe(3)
  })

  it('returns 400 for non-array payload', async () => {
    const res = await request(app)
      .post('/api/questions/import')
      .set('Authorization', `Bearer ${token}`)
      .send({ invalid: true })
    expect(res.status).toBe(400)
  })
})
```

- [ ] **Step 3: server/src/routes/questions.ts**

```typescript
import { Router } from 'express'
import { requireAuth } from '../middleware/auth'
import {
  listQuestions,
  createQuestion,
  updateQuestion,
  deleteQuestion,
  importQuestions,
} from '../services/questionService'

const router = Router()
router.use(requireAuth)

router.get('/', async (req, res) => {
  const { round } = req.query
  const questions = await listQuestions(round as string | undefined)
  res.json(questions)
})

router.post('/', async (req, res) => {
  try {
    const q = await createQuestion(req.body)
    res.status(201).json(q)
  } catch (e: any) {
    res.status(400).json({ error: e.message })
  }
})

router.put('/:id', async (req, res) => {
  const q = await updateQuestion(Number(req.params.id), req.body)
  res.json(q)
})

router.delete('/:id', async (req, res) => {
  await deleteQuestion(Number(req.params.id))
  res.status(204).send()
})

router.post('/import', async (req, res) => {
  if (!Array.isArray(req.body)) {
    res.status(400).json({ error: 'Expected array of questions' })
    return
  }
  const imported = await importQuestions(req.body)
  res.json({ imported })
})

export default router
```

- [ ] **Step 4: Přidat questions router do createApp.ts**

```typescript
// server/src/createApp.ts
import express from 'express'
import cors from 'cors'
import authRouter from './routes/auth'
import questionsRouter from './routes/questions'

export function createApp() {
  const app = express()
  app.use(cors())
  app.use(express.json())
  app.use('/api/auth', authRouter)
  app.use('/api/questions', questionsRouter)
  return app
}
```

- [ ] **Step 5: Spustit testy**

```bash
cd server && npm test
```

Expected: všechny testy pass.

- [ ] **Step 6: Commit**

```bash
git add server/src/services/questionService.ts server/src/routes/questions.ts server/src/routes/__tests__/questions.test.ts server/src/createApp.ts
git commit -m "feat: questions CRUD and JSON import routes (TDD)"
```

---

## Task 8: Game route + Socket.io handler

**Files:**
- Create: `server/src/routes/game.ts`
- Create: `server/src/socket/gameHandler.ts`

- [ ] **Step 1: server/src/routes/game.ts**

```typescript
import { Router } from 'express'
import { getGameState } from '../services/gameService'

const router = Router()

// Public — veřejný stav hry (bez otázek/odpovědí)
router.get('/', async (_req, res) => {
  try {
    const state = await getGameState()
    res.json(state)
  } catch (e: any) {
    res.status(500).json({ error: e.message })
  }
})

export default router
```

- [ ] **Step 2: server/src/socket/gameHandler.ts**

```typescript
import { Server, Socket } from 'socket.io'
import { ServerToClientEvents, ClientToServerEvents } from 'azkivz-shared'
import {
  getGameState,
  startGame,
  selectField,
  claimField,
  skipField,
  resetGame,
  nextRound,
} from '../services/gameService'
import jwt from 'jsonwebtoken'

// Otázky záměrně NEPOSÍLÁME přes socket — odpovědi nesmí dostat veřejní klienti.
// Moderátorský klient načítá otázku sám přes REST GET /api/questions/field

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

  // Send current state to newly connected client
  getGameState().then((state) => socket.emit('game:update', state))

  if (!isMod) return // public clients are read-only

  socket.on('moderator:startGame', async ({ player1Name, player2Name, round }) => {
    await startGame(player1Name, player2Name, round)
    await broadcast(io)
  })

  socket.on('moderator:selectField', async ({ fieldNumber }) => {
    await selectField(fieldNumber)
    await broadcast(io)
    // Moderátor načte otázku přes REST /api/questions/field ihned po tomto eventu
  })

  socket.on('moderator:claimField', async ({ player }) => {
    await claimField(player)
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

  socket.on('moderator:nextRound', async () => {
    await nextRound()
    await broadcast(io)
  })
}
```

> **Poznámka:** Moderátor načítá otázku přes REST GET `/api/questions/field?round=X&fieldNumber=Y` (přidat endpoint) po `selectField` eventu. Tím se odpověď nikdy neposílá veřejným klientům přes WebSocket.

- [ ] **Step 3: Přidat endpoint pro konkrétní otázku v questions.ts**

Upravit existující import v `server/src/routes/questions.ts` — přidat `getQuestionForField`:

```typescript
// Upravit existující import (přidat getQuestionForField):
import {
  listQuestions,
  createQuestion,
  updateQuestion,
  deleteQuestion,
  importQuestions,
  getQuestionForField,   // ← přidat
} from '../services/questionService'
```

Pak přidat route PŘED `router.use(requireAuth)`:

```typescript
// Přidat do server/src/routes/questions.ts, PŘED router.use(requireAuth)
router.get('/field', requireAuth, async (req, res) => {
  const { round, fieldNumber } = req.query
  if (!round || !fieldNumber) {
    res.status(400).json({ error: 'round and fieldNumber required' })
    return
  }
  const q = await getQuestionForField(String(round), Number(fieldNumber))
  if (!q) {
    res.status(404).json({ error: 'Question not found' })
    return
  }
  res.json(q)
})
```

- [ ] **Step 4: Commit**

```bash
git add server/src/routes/game.ts server/src/socket/gameHandler.ts server/src/routes/questions.ts
git commit -m "feat: game route and socket.io game handler"
```

---

## Task 9: Express server entrypoint

**Files:**
- Modify: `server/src/createApp.ts`
- Create: `server/src/index.ts`

- [ ] **Step 1: Finalizovat createApp.ts**

```typescript
// server/src/createApp.ts
import express, { Application } from 'express'
import cors from 'cors'
import path from 'path'
import authRouter from './routes/auth'
import questionsRouter from './routes/questions'
import gameRouter from './routes/game'

export function createApp(): Application {
  const app = express()
  app.use(cors({ origin: process.env.CLIENT_ORIGIN || '*' }))
  app.use(express.json({ limit: '2mb' }))

  app.use('/api/auth', authRouter)
  app.use('/api/questions', questionsRouter)
  app.use('/api/game', gameRouter)

  // Serve React build in production
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

- [ ] **Step 2: server/src/index.ts**

```typescript
import 'dotenv/config'
import http from 'http'
import { Server } from 'socket.io'
import { ServerToClientEvents, ClientToServerEvents } from 'azkivz-shared'
import { createApp } from './createApp'
import { registerGameHandlers } from './socket/gameHandler'
import prisma from './lib/prisma'

const PORT = Number(process.env.PORT) || 3001

async function main() {
  // Ensure GameState singleton exists
  await prisma.gameState.upsert({
    where: { id: 1 },
    update: {},
    create: { id: 1 },
  })

  const app = createApp()
  const httpServer = http.createServer(app)

  const io = new Server<ClientToServerEvents, ServerToClientEvents>(httpServer, {
    cors: { origin: '*' },
  })

  io.on('connection', (socket) => {
    registerGameHandlers(io, socket)
  })

  httpServer.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`)
  })
}

main().catch(console.error)
```

- [ ] **Step 3: Ověřit spuštění serveru**

```bash
cd server && npm run dev
```

Expected: `Server running on http://localhost:3001`

```bash
curl http://localhost:3001/api/game
```

Expected: JSON s GameState (status: WAITING)

- [ ] **Step 4: Spustit všechny server testy**

```bash
cd server && npm test
```

Expected: všechny pass.

- [ ] **Step 5: Commit**

```bash
git add server/src/index.ts server/src/createApp.ts
git commit -m "feat: express server entrypoint with socket.io"
```

---

## Task 10: HexBoard + HexCell komponenty

**Files:**
- Create: `client/src/components/HexCell.tsx`
- Create: `client/src/components/HexBoard.tsx`
- Create: `client/src/components/__tests__/HexBoard.test.tsx`
- Modify: `client/src/main.tsx`

- [ ] **Step 1: Zapsat failing testy**

```typescript
// client/src/components/__tests__/HexBoard.test.tsx
import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { userEvent } from '@testing-library/user-event'
import HexBoard from '../HexBoard'
import { GameState } from 'azkivz-shared'

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
}

describe('HexBoard', () => {
  it('renders 28 cells', () => {
    render(<HexBoard gameState={baseState} />)
    // každý hexagon má role="button" nebo data-field
    const cells = document.querySelectorAll('[data-field]')
    expect(cells).toHaveLength(28)
  })

  it('shows numbers 1-28 in NUMBERS round', () => {
    render(<HexBoard gameState={baseState} />)
    expect(screen.getByText('1')).toBeInTheDocument()
    expect(screen.getByText('28')).toBeInTheDocument()
  })

  it('shows letters in LETTERS round', () => {
    render(<HexBoard gameState={{ ...baseState, round: 'LETTERS' }} />)
    expect(screen.getByText('A')).toBeInTheDocument()
    expect(screen.getByText('Ž')).toBeInTheDocument()
  })

  it('calls onFieldClick when cell is clicked (if provided)', async () => {
    const onFieldClick = vi.fn()
    render(<HexBoard gameState={baseState} onFieldClick={onFieldClick} />)
    await userEvent.click(screen.getByText('5'))
    expect(onFieldClick).toHaveBeenCalledWith(5)
  })

  it('marks active field', () => {
    render(<HexBoard gameState={{ ...baseState, activeField: 13 }} />)
    const cell = document.querySelector('[data-field="13"]')
    expect(cell).toHaveClass('active')
  })

  it('marks p1 and p2 claimed fields', () => {
    render(<HexBoard gameState={{ ...baseState, claimedP1: [1, 2], claimedP2: [3] }} />)
    expect(document.querySelector('[data-field="1"]')).toHaveClass('p1')
    expect(document.querySelector('[data-field="3"]')).toHaveClass('p2')
  })
})
```

- [ ] **Step 2: Spustit testy — musí failovat**

```bash
cd client && npm test -- HexBoard
```

- [ ] **Step 3: client/src/components/HexCell.tsx**

```typescript
import { LETTERS_MAP } from 'azkivz-shared'
import type { Round } from 'azkivz-shared'

type CellState = 'free' | 'active' | 'p1' | 'p2'

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

- [ ] **Step 4: client/src/components/HexBoard.tsx**

```typescript
import { GameState } from 'azkivz-shared'
import HexCell from './HexCell'
import { useEffect, useState } from 'react'

interface HexBoardProps {
  gameState: GameState
  onFieldClick?: (fieldNumber: number) => void
  compact?: boolean
}

function calcHexSize(compact: boolean) {
  if (compact) return { hexW: 52, hexH: 60, gap: 3 }
  const GAP = 5
  const nonBoardH = 168
  const availH = window.innerHeight - nonBoardH
  const availW = window.innerWidth - 24
  const hexHfromH = availH / 5.5
  const hexHfromW = (availW - 6 * GAP) / (7 * 0.866)
  const hexH = Math.floor(Math.min(hexHfromH, hexHfromW))
  return { hexW: Math.floor(hexH * 0.866), hexH, gap: GAP }
}

export default function HexBoard({ gameState, onFieldClick, compact = false }: HexBoardProps) {
  const [size, setSize] = useState(() => calcHexSize(compact))

  useEffect(() => {
    if (compact) return
    const handle = () => setSize(calcHexSize(false))
    window.addEventListener('resize', handle)
    return () => window.removeEventListener('resize', handle)
  }, [compact])

  const { hexW, hexH, gap } = size
  const overlap = Math.floor(hexH * 0.25)

  const rows: number[][] = []
  let field = 1
  for (let r = 0; r < 7; r++) {
    const row: number[] = []
    for (let c = 0; c <= r; c++) row.push(field++)
    rows.push(row)
  }

  function cellState(f: number): 'free' | 'active' | 'p1' | 'p2' {
    if (f === gameState.activeField) return 'active'
    if (gameState.claimedP1.includes(f)) return 'p1'
    if (gameState.claimedP2.includes(f)) return 'p2'
    return 'free'
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
      {rows.map((row, ri) => (
        <div
          key={ri}
          style={{
            display: 'flex',
            gap: `${gap}px`,
            marginTop: ri === 0 ? 0 : `-${overlap}px`,
          }}
        >
          {row.map((f) => (
            <HexCell
              key={f}
              fieldNumber={f}
              round={gameState.round}
              state={cellState(f)}
              onClick={onFieldClick}
              style={{ width: hexW, height: hexH }}
            />
          ))}
        </div>
      ))}
    </div>
  )
}
```

- [ ] **Step 5: CSS pro hexagony — client/src/index.css** (přidat nebo vytvořit)

```css
/* client/src/index.css */
* { box-sizing: border-box; margin: 0; padding: 0; }

body {
  background: #0d1117;
  font-family: 'Segoe UI', system-ui, sans-serif;
  color: #f1f5f9;
}

.hex {
  clip-path: polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%);
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 800;
  cursor: pointer;
  transition: transform 0.12s, filter 0.12s;
  font-size: calc(var(--hex-font, 1rem));
  user-select: none;
  position: relative;
  z-index: 1;
}
.hex:hover { transform: scale(1.08); z-index: 10; }

.hex.free {
  background: linear-gradient(160deg, #e2e8f0 0%, #c8d5e3 60%, #94a3b8 100%);
  color: #1e293b;
  filter: drop-shadow(0 3px 5px rgba(0,0,0,0.5));
}
.hex.active {
  background: linear-gradient(160deg, #fef08a 0%, #fbbf24 55%, #d97706 100%);
  color: #1c0f00;
  filter: drop-shadow(0 0 16px rgba(251,191,36,0.9)) drop-shadow(0 3px 5px rgba(0,0,0,0.4));
  animation: pulse-hex 1.1s ease-in-out infinite;
  z-index: 20;
}
.hex.p1 {
  background: linear-gradient(160deg, #fdba74 0%, #f97316 55%, #c2410c 100%);
  color: white;
  filter: drop-shadow(0 3px 8px rgba(249,115,22,0.55));
}
.hex.p2 {
  background: linear-gradient(160deg, #a5f3fc 0%, #22d3ee 55%, #0e7490 100%);
  color: #042f2e;
  filter: drop-shadow(0 3px 8px rgba(34,211,238,0.55));
}

@keyframes pulse-hex {
  0%,100% { filter: drop-shadow(0 0 10px rgba(251,191,36,.7)) drop-shadow(0 3px 5px rgba(0,0,0,.4)); }
  50%      { filter: drop-shadow(0 0 24px rgba(251,191,36,1))  drop-shadow(0 3px 5px rgba(0,0,0,.4)); }
}

/* Hex background pattern */
body::before {
  content: '';
  position: fixed; inset: 0;
  background-image: url("data:image/svg+xml,%3Csvg width='60' height='52' viewBox='0 0 60 52' xmlns='http://www.w3.org/2000/svg'%3E%3Cpolygon points='30,2 58,16 58,36 30,50 2,36 2,16' fill='none' stroke='%23ffffff07' stroke-width='1'/%3E%3C/svg%3E");
  background-size: 60px 52px;
  pointer-events: none; z-index: 0;
}
```

- [ ] **Step 6: client/src/main.tsx**

```typescript
import React from 'react'
import ReactDOM from 'react-dom/client'
import './index.css'
import App from './App'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
)
```

- [ ] **Step 7: Spustit testy — musí projít**

```bash
cd client && npm test -- HexBoard
```

Expected: 6 tests pass.

- [ ] **Step 8: Commit**

```bash
git add client/src/components/ client/src/index.css client/src/main.tsx
git commit -m "feat: HexBoard and HexCell components (TDD)"
```

---

## Task 11: useGameSocket hook + PublicPage

**Files:**
- Create: `client/src/hooks/useGameSocket.ts`
- Create: `client/src/pages/PublicPage.tsx`
- Create: `client/src/App.tsx`

- [ ] **Step 1: client/src/hooks/useGameSocket.ts**

```typescript
import { useEffect, useState } from 'react'
import { io, Socket } from 'socket.io-client'
import { GameState, ServerToClientEvents, ClientToServerEvents } from 'azkivz-shared'

type GameSocket = Socket<ServerToClientEvents, ClientToServerEvents>

const INITIAL_STATE: GameState = {
  id: 1,
  status: 'WAITING',
  round: 'NUMBERS',
  player1Name: '',
  player2Name: '',
  activeField: null,
  claimedP1: [],
  claimedP2: [],
  winner: null,
  updatedAt: new Date().toISOString(),
}

export function useGameSocket(token?: string) {
  const [gameState, setGameState] = useState<GameState>(INITIAL_STATE)
  const [socket, setSocket] = useState<GameSocket | null>(null)
  const [connected, setConnected] = useState(false)

  useEffect(() => {
    const s: GameSocket = io('/', {
      auth: token ? { token } : {},
    })

    s.on('connect', () => setConnected(true))
    s.on('disconnect', () => setConnected(false))
    s.on('game:update', (state) => setGameState(state))

    setSocket(s)
    return () => { s.disconnect() }
  }, [token])

  return { gameState, socket, connected }
}
```

- [ ] **Step 2: client/src/pages/PublicPage.tsx**

```typescript
import { useGameSocket } from '../hooks/useGameSocket'
import HexBoard from '../components/HexBoard'

export default function PublicPage() {
  const { gameState, connected } = useGameSocket()

  return (
    <div style={{
      height: '100vh', width: '100vw', overflow: 'hidden',
      display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'space-between',
      padding: '8px 12px', gap: '6px', position: 'relative', zIndex: 1,
    }}>
      {/* Top bar */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', flexShrink: 0, height: 52 }}>
        <div style={{ fontSize: '1.8rem', fontWeight: 900, background: 'linear-gradient(135deg, #f97316, #fbbf24)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
          AZkvíz
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 20, padding: '4px 14px', fontSize: '0.85rem', color: '#94a3b8' }}>
          <span style={{ display: 'inline-block', width: 7, height: 7, borderRadius: '50%', background: connected ? '#22c55e' : '#ef4444', boxShadow: connected ? '0 0 6px #22c55e' : 'none' }} />
          {gameState.round === 'NUMBERS' ? '1. kolo — Čísla' : '2. kolo — Písmena'}
        </div>
        {gameState.activeField && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'rgba(251,191,36,0.1)', border: '1px solid rgba(251,191,36,0.25)', borderRadius: 24, padding: '6px 18px', fontSize: '1rem', color: '#fbbf24', fontWeight: 500 }}>
            <span style={{ width: 8, height: 8, background: '#fbbf24', borderRadius: '50%', animation: 'blink 1s ease-in-out infinite' as any }} />
            Aktivní: <strong style={{ marginLeft: 4, color: '#fde68a', fontSize: '1.2rem' }}>{gameState.activeField}</strong>
          </div>
        )}
      </div>

      {/* Board */}
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', width: '100%', minHeight: 0 }}>
        {gameState.status === 'WAITING' ? (
          <div style={{ color: '#475569', fontSize: '1.2rem', textAlign: 'center' }}>
            <div style={{ fontSize: '3rem', marginBottom: 12 }}>⏳</div>
            Hra ještě nezačala…
          </div>
        ) : gameState.status === 'FINISHED' ? (
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '3rem', marginBottom: 16 }}>🏆</div>
            <div style={{ fontSize: '2rem', fontWeight: 900, color: '#fbbf24' }}>
              Vyhrál {gameState.winner === 1 ? gameState.player1Name : gameState.player2Name}!
            </div>
          </div>
        ) : (
          <HexBoard gameState={gameState} />
        )}
      </div>

      {/* Players */}
      <div style={{ display: 'flex', gap: 12, width: '100%', flexShrink: 0, height: 72 }}>
        {[1, 2].map((p) => {
          const name = p === 1 ? gameState.player1Name : gameState.player2Name
          const color = p === 1 ? { bg: 'rgba(249,115,22,.2)', border: 'rgba(249,115,22,.35)', dot: '#f97316' } : { bg: 'rgba(34,211,238,.2)', border: 'rgba(34,211,238,.35)', dot: '#22d3ee' }
          return (
            <div key={p} style={{ flex: 1, borderRadius: 14, padding: '0 20px', display: 'flex', alignItems: 'center', gap: 14, border: `1px solid ${color.border}`, background: color.bg, flexDirection: p === 2 ? 'row-reverse' : 'row' }}>
              <div style={{ width: 40, height: 46, clipPath: 'polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%)', background: `linear-gradient(135deg, ${color.dot}, #000)`, flexShrink: 0 }} />
              <div style={{ fontSize: '1.35rem', fontWeight: 800, color: '#f1f5f9', textAlign: p === 2 ? 'right' : 'left' }}>
                {name || (p === 1 ? 'Hráč 1' : 'Hráč 2')}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
```

- [ ] **Step 3: client/src/components/PinGate.tsx**

```typescript
import { useState } from 'react'

interface PinGateProps {
  onSuccess: (token: string) => void
}

export default function PinGate({ onSuccess }: PinGateProps) {
  const [pin, setPin] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pin }),
      })
      if (!res.ok) throw new Error('Nesprávný PIN')
      const { token } = await res.json()
      onSuccess(token)
    } catch (e: any) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 16 }}>
      <div style={{ fontSize: '1.8rem', fontWeight: 900, background: 'linear-gradient(135deg, #f97316, #fbbf24)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>AZkvíz</div>
      <div style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 16, padding: 24, width: 280 }}>
        <h2 style={{ marginBottom: 16, fontSize: '1rem', color: '#94a3b8', textAlign: 'center' }}>Zadej PIN</h2>
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <input
            type="password"
            value={pin}
            onChange={(e) => setPin(e.target.value)}
            placeholder="PIN"
            autoFocus
            style={{ padding: '10px 14px', borderRadius: 8, border: '1px solid rgba(255,255,255,0.15)', background: 'rgba(255,255,255,0.08)', color: '#f1f5f9', fontSize: '1rem', outline: 'none' }}
          />
          {error && <div style={{ color: '#f87171', fontSize: '0.85rem' }}>{error}</div>}
          <button type="submit" disabled={loading} style={{ padding: '10px', borderRadius: 8, border: 'none', background: 'linear-gradient(135deg, #f97316, #ea580c)', color: 'white', fontWeight: 700, cursor: 'pointer', fontSize: '0.95rem' }}>
            {loading ? 'Přihlašuji…' : 'Vstoupit'}
          </button>
        </form>
      </div>
    </div>
  )
}
```

- [ ] **Step 4: client/src/App.tsx**

```typescript
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import PublicPage from './pages/PublicPage'
import ModeratorPage from './pages/ModeratorPage'
import AdminPage from './pages/AdminPage'

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<PublicPage />} />
        <Route path="/moderator" element={<ModeratorPage />} />
        <Route path="/admin" element={<AdminPage />} />
      </Routes>
    </BrowserRouter>
  )
}
```

Prozatím `ModeratorPage` a `AdminPage` jen exportují prázdný placeholder:
```typescript
// client/src/pages/ModeratorPage.tsx
export default function ModeratorPage() { return <div>Moderátor (brzy)</div> }
// client/src/pages/AdminPage.tsx  
export default function AdminPage() { return <div>Admin (brzy)</div> }
```

- [ ] **Step 5: Ověřit veřejný pohled v prohlížeči**

```bash
# Terminal 1
cd server && npm run dev

# Terminal 2
cd client && npm run dev
```

Otevřít http://localhost:5173 — měla by se zobrazit tmavá stránka s „Hra ještě nezačala…".

- [ ] **Step 6: Commit**

```bash
git add client/src/
git commit -m "feat: public view with live socket connection"
```

---

## Task 12: ModeratorPage

**Files:**
- Modify: `client/src/pages/ModeratorPage.tsx`

- [ ] **Step 1: Implementovat ModeratorPage**

```typescript
// client/src/pages/ModeratorPage.tsx
import { useState, useEffect } from 'react'
import { useGameSocket } from '../hooks/useGameSocket'
import HexBoard from '../components/HexBoard'
import PinGate from '../components/PinGate'
import { Question, Round } from 'azkivz-shared'

export default function ModeratorPage() {
  const [token, setToken] = useState<string | null>(() => localStorage.getItem('mod_token'))
  const { gameState, socket } = useGameSocket(token ?? undefined)
  const [question, setQuestion] = useState<Question | null>(null)
  const [startForm, setStartForm] = useState({ p1: '', p2: '', round: 'NUMBERS' as Round })

  if (!token) return <PinGate onSuccess={(t) => { localStorage.setItem('mod_token', t); setToken(t) }} />

  async function loadQuestion(fieldNumber: number) {
    if (!token) return
    const res = await fetch(`/api/questions/field?round=${gameState.round}&fieldNumber=${fieldNumber}`, {
      headers: { Authorization: `Bearer ${token}` },
    })
    if (res.ok) setQuestion(await res.json())
    else setQuestion(null)
  }

  function handleFieldClick(fieldNumber: number) {
    socket?.emit('moderator:selectField', { fieldNumber })
    loadQuestion(fieldNumber)
  }

  function handleClaim(player: 1 | 2) {
    socket?.emit('moderator:claimField', { player })
    setQuestion(null)
  }

  function handleSkip() {
    socket?.emit('moderator:skipField')
    setQuestion(null)
  }

  function handleStart(e: React.FormEvent) {
    e.preventDefault()
    socket?.emit('moderator:startGame', {
      player1Name: startForm.p1,
      player2Name: startForm.p2,
      round: startForm.round,
    })
  }

  const isWaiting = gameState.status === 'WAITING'
  const isFinished = gameState.status === 'FINISHED'

  return (
    <div style={{ height: '100vh', width: '100vw', overflow: 'hidden', display: 'grid', gridTemplateColumns: '1fr 380px', gridTemplateRows: '48px 1fr', background: '#0d1117', position: 'relative', zIndex: 1 }}>
      {/* Top bar */}
      <div style={{ gridColumn: '1/-1', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 16px', borderBottom: '1px solid rgba(255,255,255,0.07)', background: 'rgba(255,255,255,0.03)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <span style={{ fontSize: '1.1rem', fontWeight: 900, background: 'linear-gradient(135deg, #f97316, #fbbf24)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>AZkvíz</span>
          <span style={{ background: 'rgba(139,92,246,0.2)', border: '1px solid rgba(139,92,246,0.4)', borderRadius: 20, padding: '2px 10px', fontSize: '0.7rem', fontWeight: 600, color: '#a78bfa', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Moderátor</span>
        </div>
        <div style={{ fontSize: '0.75rem', color: '#475569' }}>
          {isWaiting ? 'Čeká na start' : isFinished ? `Vítěz: ${gameState.winner === 1 ? gameState.player1Name : gameState.player2Name}` : `Kolo ${gameState.round === 'NUMBERS' ? '1' : '2'} — Probíhá`}
        </div>
        <button onClick={() => { localStorage.removeItem('mod_token'); setToken(null) }} style={{ padding: '4px 12px', borderRadius: 6, border: '1px solid rgba(255,255,255,0.1)', background: 'transparent', color: '#64748b', cursor: 'pointer', fontSize: '0.75rem' }}>
          Odhlásit
        </button>
      </div>

      {/* Left: Board */}
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 12, borderRight: '1px solid rgba(255,255,255,0.07)', gap: 10, overflow: 'hidden' }}>
        <HexBoard gameState={gameState} onFieldClick={gameState.status === 'PLAYING' ? handleFieldClick : undefined} compact />
        <div style={{ display: 'flex', gap: 8, width: '100%' }}>
          {[1, 2].map((p) => {
            const name = p === 1 ? gameState.player1Name : gameState.player2Name
            const color = p === 1 ? { bg: 'rgba(249,115,22,.15)', border: 'rgba(249,115,22,.3)', dot: '#f97316' } : { bg: 'rgba(34,211,238,.15)', border: 'rgba(34,211,238,.3)', dot: '#22d3ee' }
            return (
              <div key={p} style={{ flex: 1, borderRadius: 10, padding: '8px 12px', display: 'flex', alignItems: 'center', gap: 8, border: `1px solid ${color.border}`, background: color.bg, flexDirection: p === 2 ? 'row-reverse' : 'row' }}>
                <div style={{ width: 10, height: 10, borderRadius: '50%', background: color.dot, boxShadow: `0 0 6px ${color.dot}`, flexShrink: 0 }} />
                <span style={{ fontSize: '0.9rem', fontWeight: 700, color: '#f1f5f9' }}>{name || `Hráč ${p}`}</span>
              </div>
            )
          })}
        </div>
      </div>

      {/* Right: Control panel */}
      <div style={{ display: 'flex', flexDirection: 'column', padding: 16, gap: 12, overflowY: 'auto' }}>
        {isWaiting && (
          <form onSubmit={handleStart} style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <div style={{ fontSize: '0.65rem', fontWeight: 700, color: '#475569', letterSpacing: '1.5px', textTransform: 'uppercase' }}>Nová hra</div>
            <input value={startForm.p1} onChange={e => setStartForm(s => ({ ...s, p1: e.target.value }))} placeholder="Jméno hráče 1" style={{ padding: '8px 12px', borderRadius: 8, border: '1px solid rgba(249,115,22,0.3)', background: 'rgba(249,115,22,0.08)', color: '#f1f5f9', fontSize: '0.9rem', outline: 'none' }} />
            <input value={startForm.p2} onChange={e => setStartForm(s => ({ ...s, p2: e.target.value }))} placeholder="Jméno hráče 2" style={{ padding: '8px 12px', borderRadius: 8, border: '1px solid rgba(34,211,238,0.3)', background: 'rgba(34,211,238,0.08)', color: '#f1f5f9', fontSize: '0.9rem', outline: 'none' }} />
            <select value={startForm.round} onChange={e => setStartForm(s => ({ ...s, round: e.target.value as Round }))} style={{ padding: '8px 12px', borderRadius: 8, border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.05)', color: '#f1f5f9', fontSize: '0.9rem' }}>
              <option value="NUMBERS">1. kolo — Čísla</option>
              <option value="LETTERS">2. kolo — Písmena</option>
            </select>
            <button type="submit" style={{ padding: '10px', borderRadius: 8, border: 'none', background: 'linear-gradient(135deg, #22c55e, #15803d)', color: 'white', fontWeight: 700, cursor: 'pointer', fontSize: '0.9rem' }}>▶ Spustit hru</button>
          </form>
        )}

        {gameState.status === 'PLAYING' && (
          <>
            {/* Active field */}
            <div>
              <div style={{ fontSize: '0.65rem', fontWeight: 700, color: '#475569', letterSpacing: '1.5px', textTransform: 'uppercase', marginBottom: 6 }}>Aktivní pole</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, background: 'rgba(251,191,36,0.08)', border: '1px solid rgba(251,191,36,0.2)', borderRadius: 12, padding: '12px 14px' }}>
                <div style={{ width: 52, height: 60, clipPath: 'polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%)', background: 'linear-gradient(160deg, #fef08a, #fbbf24 55%, #d97706)', color: '#1c0f00', fontWeight: 900, fontSize: '1.3rem', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, filter: 'drop-shadow(0 0 10px rgba(251,191,36,0.7))' }}>
                  {gameState.activeField ?? '—'}
                </div>
                <div>
                  <div style={{ fontSize: '0.7rem', color: '#94a3b8' }}>Vybráno</div>
                  <div style={{ fontSize: '1.1rem', fontWeight: 800, color: '#fde68a' }}>{gameState.activeField ? `Pole ${gameState.activeField}` : 'Klikni na pole'}</div>
                </div>
              </div>
            </div>

            {/* Question */}
            {question && (
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 8 }}>
                <div style={{ fontSize: '0.65rem', fontWeight: 700, color: '#475569', letterSpacing: '1.5px', textTransform: 'uppercase' }}>Otázka</div>
                <div style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 12, padding: 14, display: 'flex', flexDirection: 'column', gap: 10, flex: 1 }}>
                  <div style={{ fontSize: '1rem', fontWeight: 500, color: '#e2e8f0', lineHeight: 1.5 }}>{question.text}</div>
                  <div style={{ height: 1, background: 'rgba(255,255,255,0.08)' }} />
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
                    <span style={{ fontSize: '0.65rem', fontWeight: 700, color: '#22d3ee', letterSpacing: 1, textTransform: 'uppercase', paddingTop: 2, flexShrink: 0 }}>Odpověď</span>
                    <span style={{ fontSize: '1rem', fontWeight: 700, color: '#a5f3fc', lineHeight: 1.4 }}>{question.answer}</span>
                  </div>
                </div>
              </div>
            )}

            {/* Action buttons */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <div style={{ fontSize: '0.65rem', fontWeight: 700, color: '#475569', letterSpacing: '1.5px', textTransform: 'uppercase' }}>Přiřadit pole</div>
              <button disabled={!gameState.activeField} onClick={() => handleClaim(1)} style={{ width: '100%', padding: 12, border: 'none', borderRadius: 10, background: 'linear-gradient(135deg, #f97316, #c2410c)', color: 'white', fontWeight: 700, cursor: 'pointer', fontSize: '0.95rem', opacity: gameState.activeField ? 1 : 0.4 }}>
                🟠 {gameState.player1Name || 'Hráč 1'} získal pole
              </button>
              <button disabled={!gameState.activeField} onClick={() => handleClaim(2)} style={{ width: '100%', padding: 12, border: 'none', borderRadius: 10, background: 'linear-gradient(135deg, #22d3ee, #0e7490)', color: '#042f2e', fontWeight: 700, cursor: 'pointer', fontSize: '0.95rem', opacity: gameState.activeField ? 1 : 0.4 }}>
                🔵 {gameState.player2Name || 'Hráč 2'} získal pole
              </button>
              <div style={{ display: 'flex', gap: 8 }}>
                <button onClick={handleSkip} style={{ flex: 1, padding: 10, borderRadius: 10, border: '1px solid rgba(255,255,255,0.12)', background: 'rgba(255,255,255,0.05)', color: '#94a3b8', fontWeight: 600, cursor: 'pointer', fontSize: '0.85rem' }}>⏭ Přeskočit</button>
                <button onClick={() => socket?.emit('moderator:resetGame')} style={{ flex: 1, padding: 10, borderRadius: 10, border: '1px solid rgba(239,68,68,0.25)', background: 'rgba(239,68,68,0.07)', color: '#f87171', fontWeight: 600, cursor: 'pointer', fontSize: '0.85rem' }}>↺ Reset</button>
              </div>
            </div>
          </>
        )}

        {isFinished && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <div style={{ textAlign: 'center', padding: '20px 0', color: '#fbbf24', fontSize: '1.2rem', fontWeight: 700 }}>
              🏆 Vyhrál {gameState.winner === 1 ? gameState.player1Name : gameState.player2Name}!
            </div>
            <button onClick={() => socket?.emit('moderator:nextRound')} style={{ width: '100%', padding: 12, border: 'none', borderRadius: 10, background: 'linear-gradient(135deg, #6366f1, #4338ca)', color: 'white', fontWeight: 700, cursor: 'pointer', fontSize: '0.95rem' }}>
              ▶ 2. kolo (Písmena)
            </button>
            <button onClick={() => socket?.emit('moderator:resetGame')} style={{ width: '100%', padding: 12, borderRadius: 10, border: '1px solid rgba(239,68,68,0.25)', background: 'rgba(239,68,68,0.07)', color: '#f87171', fontWeight: 600, cursor: 'pointer', fontSize: '0.9rem' }}>
              ↺ Nová hra od začátku
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Otestovat v prohlížeči**

```bash
# Spustit oba servery (pokud neběží)
npm run dev
```

1. Otevřít http://localhost:5173/moderator
2. Zadat PIN (z `.env` — výchozí `1234`)
3. Vyplnit jména, kliknout Spustit hru
4. Otevřít http://localhost:5173 v druhé záložce
5. Kliknout na pole v moderátorovi → ověřit, že se zvýrazní v obou záložkách
6. Přiřadit pole → ověřit barevnou změnu v obou záložkách

- [ ] **Step 3: Commit**

```bash
git add client/src/pages/ModeratorPage.tsx client/src/components/PinGate.tsx client/src/App.tsx client/src/hooks/
git commit -m "feat: moderator page with full game controls"
```

---

## Task 13: AdminPage — správa otázek

**Files:**
- Modify: `client/src/pages/AdminPage.tsx`

- [ ] **Step 1: Implementovat AdminPage**

```typescript
// client/src/pages/AdminPage.tsx
import { useState, useEffect, useCallback } from 'react'
import PinGate from '../components/PinGate'
import { Question, QuestionInput, Round } from 'azkivz-shared'

const ROUNDS: Round[] = ['NUMBERS', 'LETTERS']

export default function AdminPage() {
  const [token, setToken] = useState<string | null>(() => localStorage.getItem('mod_token'))
  const [questions, setQuestions] = useState<Question[]>([])
  const [filterRound, setFilterRound] = useState<Round | ''>('')
  const [form, setForm] = useState<Partial<QuestionInput & { id?: number }>>({})
  const [editing, setEditing] = useState<number | null>(null)
  const [importText, setImportText] = useState('')
  const [importStatus, setImportStatus] = useState('')

  if (!token) return <PinGate onSuccess={(t) => { localStorage.setItem('mod_token', t); setToken(t) }} />

  const authHeaders = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }

  const fetchQuestions = useCallback(async () => {
    const url = filterRound ? `/api/questions?round=${filterRound}` : '/api/questions'
    const res = await fetch(url, { headers: authHeaders })
    if (res.ok) setQuestions(await res.json())
  }, [filterRound, token])

  useEffect(() => { fetchQuestions() }, [fetchQuestions])

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    if (editing !== null) {
      await fetch(`/api/questions/${editing}`, { method: 'PUT', headers: authHeaders, body: JSON.stringify(form) })
    } else {
      await fetch('/api/questions', { method: 'POST', headers: authHeaders, body: JSON.stringify(form) })
    }
    setForm({})
    setEditing(null)
    fetchQuestions()
  }

  async function handleDelete(id: number) {
    if (!confirm('Smazat otázku?')) return
    await fetch(`/api/questions/${id}`, { method: 'DELETE', headers: authHeaders })
    fetchQuestions()
  }

  async function handleImport() {
    setImportStatus('Importuji…')
    try {
      const data = JSON.parse(importText)
      const res = await fetch('/api/questions/import', { method: 'POST', headers: authHeaders, body: JSON.stringify(data) })
      const result = await res.json()
      setImportStatus(`✓ Importováno ${result.imported} otázek`)
      setImportText('')
      fetchQuestions()
    } catch (e: any) {
      setImportStatus(`✗ Chyba: ${e.message}`)
    }
  }

  const inputStyle = { padding: '8px 12px', borderRadius: 8, border: '1px solid rgba(255,255,255,0.12)', background: 'rgba(255,255,255,0.06)', color: '#f1f5f9', fontSize: '0.9rem', outline: 'none', width: '100%' } as const

  return (
    <div style={{ minHeight: '100vh', background: '#0d1117', color: '#f1f5f9', padding: 24, fontFamily: 'Segoe UI, system-ui, sans-serif' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
        <span style={{ fontSize: '1.4rem', fontWeight: 900, background: 'linear-gradient(135deg, #f97316, #fbbf24)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>AZkvíz</span>
        <span style={{ background: 'rgba(139,92,246,0.2)', border: '1px solid rgba(139,92,246,0.4)', borderRadius: 20, padding: '2px 10px', fontSize: '0.7rem', fontWeight: 600, color: '#a78bfa', textTransform: 'uppercase' as const }}>Admin</span>
        <div style={{ flex: 1 }} />
        <a href="/" style={{ color: '#64748b', fontSize: '0.8rem', textDecoration: 'none' }}>← Zpět na hru</a>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: 24, alignItems: 'start' }}>
        {/* Left: Question list */}
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
            <h2 style={{ fontSize: '1rem', fontWeight: 700, color: '#94a3b8' }}>Otázky ({questions.length})</h2>
            <select value={filterRound} onChange={e => setFilterRound(e.target.value as Round | '')} style={{ ...inputStyle, width: 'auto' }}>
              <option value="">Všechna kola</option>
              <option value="NUMBERS">Kolo 1 — Čísla</option>
              <option value="LETTERS">Kolo 2 — Písmena</option>
            </select>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {questions.map(q => (
              <div key={q.id} style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 10, padding: '10px 14px', display: 'flex', alignItems: 'flex-start', gap: 12 }}>
                <div style={{ flexShrink: 0, width: 40, height: 46, clipPath: 'polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%)', background: q.round === 'NUMBERS' ? 'linear-gradient(135deg, #f97316, #c2410c)' : 'linear-gradient(135deg, #6366f1, #4338ca)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: 800, fontSize: '0.8rem' }}>
                  {q.fieldNumber}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: '0.85rem', color: '#e2e8f0', marginBottom: 4 }}>{q.text}</div>
                  <div style={{ fontSize: '0.78rem', color: '#22d3ee' }}>→ {q.answer}</div>
                </div>
                <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                  <button onClick={() => { setEditing(q.id); setForm({ round: q.round, fieldNumber: q.fieldNumber, text: q.text, answer: q.answer }) }} style={{ padding: '4px 10px', borderRadius: 6, border: '1px solid rgba(255,255,255,0.12)', background: 'rgba(255,255,255,0.05)', color: '#94a3b8', cursor: 'pointer', fontSize: '0.78rem' }}>Editovat</button>
                  <button onClick={() => handleDelete(q.id)} style={{ padding: '4px 10px', borderRadius: 6, border: '1px solid rgba(239,68,68,0.2)', background: 'rgba(239,68,68,0.06)', color: '#f87171', cursor: 'pointer', fontSize: '0.78rem' }}>Smazat</button>
                </div>
              </div>
            ))}
            {questions.length === 0 && <div style={{ color: '#475569', textAlign: 'center', padding: 24 }}>Žádné otázky</div>}
          </div>
        </div>

        {/* Right: Add/Edit + Import */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* Form */}
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

          {/* JSON Import */}
          <div style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 12, padding: 16 }}>
            <h3 style={{ fontSize: '0.85rem', fontWeight: 700, color: '#94a3b8', marginBottom: 8 }}>Import z JSON</h3>
            <div style={{ fontSize: '0.75rem', color: '#475569', marginBottom: 8, fontFamily: 'monospace', background: 'rgba(0,0,0,0.3)', borderRadius: 6, padding: 8 }}>
              {`[{"round":"NUMBERS","fieldNumber":1,"text":"...","answer":"..."}]`}
            </div>
            <textarea value={importText} onChange={e => setImportText(e.target.value)} placeholder="Vlož JSON nebo načti soubor…" rows={5} style={{ ...inputStyle, fontFamily: 'monospace', fontSize: '0.78rem', marginBottom: 8, resize: 'vertical' }} />
            <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
              <label style={{ flex: 1, padding: '9px', borderRadius: 8, border: '1px solid rgba(255,255,255,0.12)', background: 'rgba(255,255,255,0.05)', color: '#94a3b8', cursor: 'pointer', fontSize: '0.85rem', textAlign: 'center' }}>
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
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Ověřit v prohlížeči**

1. Otevřít http://localhost:5173/admin
2. Přidat otázku ručně (vyplnit formulář, kliknout Přidat)
3. Otázka se zobrazí v seznamu
4. Editovat otázku, uložit
5. Importovat JSON:
   ```json
   [
     {"round":"NUMBERS","fieldNumber":1,"text":"Co je hlavní město ČR?","answer":"Praha"},
     {"round":"NUMBERS","fieldNumber":2,"text":"Kolik cm má metr?","answer":"100"}
   ]
   ```
6. Ověřit import

- [ ] **Step 3: Commit**

```bash
git add client/src/pages/AdminPage.tsx
git commit -m "feat: admin page with question CRUD and JSON import"
```

---

## Task 14: Build + deploy config

**Files:**
- Modify: `server/package.json` (build script)
- Create: `Procfile` (pro Railway/Render)
- Create: `railway.toml` nebo `render.yaml`
- Create: `.env.production.example`

- [ ] **Step 1: Ověřit production build**

```bash
# Build klienta
cd client && npm run build
# Build serveru
cd server && npm run build
```

Expected: `client/dist/` a `server/dist/` existují.

- [ ] **Step 2: Ověřit production server (servuje React build)**

```bash
cd server
NODE_ENV=production node dist/index.js
```

Otevřít http://localhost:3001 — musí zobrazit React aplikaci.

- [ ] **Step 3: railway.toml** (pro nasazení na Railway)

```toml
[build]
builder = "NIXPACKS"
buildCommand = "npm install && npm run build"

[deploy]
startCommand = "cd server && node dist/index.js"
healthcheckPath = "/api/game"
```

- [ ] **Step 4: .env.production.example**

```
DB_PROVIDER="postgresql"
DATABASE_URL="postgresql://user:pass@host:5432/azkivz"
MODERATOR_PIN="silne-heslo-zde"
JWT_SECRET="nahodny-dlouhy-retezec"
PORT=3001
NODE_ENV=production
```

- [ ] **Step 5: Přidat production db migrate do build procesu**

V `server/package.json` upravit build script:
```json
"build": "prisma generate && tsc",
"start": "prisma db push && node dist/index.js"
```

- [ ] **Step 6: Final test suite**

```bash
cd server && npm test
cd client && npm test
```

Expected: všechny testy pass.

- [ ] **Step 7: Final commit**

```bash
git add railway.toml .env.production.example server/package.json
git commit -m "feat: production build config and deploy setup"
```

---

## Shrnutí

Po dokončení všech tasků bude funkční:
- **`/`** — live pyramida pro hráče (WebSocket, automatické aktualizace)
- **`/moderator`** — řízení hry (PIN přístup, výběr polí, přiřazení, reset)
- **`/admin`** — správa otázek (CRUD + JSON import)
- Automatická win condition detekce (BFS)
- Production build připravený pro Railway/Render

**Testování E2E:**
1. `npm run dev` → http://localhost:5173
2. Přidat alespoň 2 otázky v `/admin`
3. Spustit hru v `/moderator`, přiřazovat pole
4. Ověřit real-time update ve veřejném pohledu
5. Přiřazovat dokud jeden hráč nepropojí strany pyramidy
