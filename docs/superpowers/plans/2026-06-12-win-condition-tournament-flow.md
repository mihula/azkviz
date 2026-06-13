# Win Condition & Tournament Flow Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace asymmetric win conditions with a unified three-sides rule, add tournament-aware finished-game UI, and write project documentation.

**Architecture:** Win logic lives entirely in `server/src/services/winChecker.ts` — rewrite it in isolation, update its call site in `gameService.ts` (remove the `player` param). UI changes are confined to the `isFinished` block in `ModeratorPage.tsx`. Docs are pure markdown writes.

**Tech Stack:** TypeScript, Node.js/Express, React 18, Vite, Prisma, Socket.io, Vitest

---

## File Map

| File | Change |
|------|--------|
| `server/src/services/winChecker.ts` | Rewrite — unified 3-sides logic |
| `server/src/services/__tests__/winChecker.test.ts` | Rewrite — new test cases |
| `server/src/services/gameService.ts` | Remove `player` arg from `checkWin` calls |
| `client/src/pages/ModeratorPage.tsx` | Add `nextForm` state, rewrite `isFinished` block |
| `README.md` | Create |
| `docs/game.md` | Create |
| `docs/rules.md` | Create |

---

## Task 1: Rewrite winChecker.ts

**Files:**
- Modify: `server/src/services/winChecker.ts`

The three sides of the triangular pyramid:
- **Left edge** (col 0): fields 1, 2, 4, 7, 11, 16, 22
- **Right edge** (col = row): fields 1, 3, 6, 10, 15, 21, 28
- **Bottom row** (row 6): fields 22, 23, 24, 25, 26, 27, 28

Win = a player's connected component touches all three sides simultaneously.

- [ ] **Step 1: Replace the file contents**

```typescript
import { getNeighbors } from '../lib/hexUtils'

export const LEFT_EDGE  = new Set([1, 2, 4, 7, 11, 16, 22])
export const RIGHT_EDGE = new Set([1, 3, 6, 10, 15, 21, 28])
export const BOTTOM_ROW = new Set([22, 23, 24, 25, 26, 27, 28])

export function checkWin(claimed: number[]): boolean {
  const claimedSet = new Set(claimed)
  const visited = new Set<number>()

  for (const start of claimed) {
    if (visited.has(start)) continue

    // BFS — collect one connected component
    const component = new Set<number>()
    const queue = [start]
    while (queue.length > 0) {
      const curr = queue.shift()!
      if (component.has(curr)) continue
      component.add(curr)
      visited.add(curr)
      for (const nb of getNeighbors(curr)) {
        if (claimedSet.has(nb) && !component.has(nb)) queue.push(nb)
      }
    }

    // Win if this component touches all three sides
    const touchesLeft   = [...component].some(f => LEFT_EDGE.has(f))
    const touchesRight  = [...component].some(f => RIGHT_EDGE.has(f))
    const touchesBottom = [...component].some(f => BOTTOM_ROW.has(f))
    if (touchesLeft && touchesRight && touchesBottom) return true
  }

  return false
}
```

---

## Task 2: Rewrite winChecker.test.ts

**Files:**
- Modify: `server/src/services/__tests__/winChecker.test.ts`

- [ ] **Step 1: Replace the file contents**

```typescript
import { describe, it, expect } from 'vitest'
import { checkWin } from '../winChecker'

describe('checkWin — three-sides rule', () => {
  it('returns false for empty claimed', () => {
    expect(checkWin([])).toBe(false)
  })

  it('returns false for single field', () => {
    expect(checkWin([1])).toBe(false)  // apex touches left+right but not bottom
    expect(checkWin([22])).toBe(false) // touches left+bottom but not right
    expect(checkWin([28])).toBe(false) // touches right+bottom but not left
  })

  it('returns false when only two sides are connected', () => {
    // Left edge path without reaching right side
    expect(checkWin([2, 4, 7, 11, 16, 22])).toBe(false) // left+bottom, no right
  })

  it('returns false when three sides touched but disconnected', () => {
    // Field 1 (left+right) and field 23 (bottom) with no connecting path
    expect(checkWin([1, 23])).toBe(false)
  })

  it('returns true for left-edge path (includes apex = left+right)', () => {
    // Fields 1,2,4,7,11,16,22 — left edge column
    // Field 1 is in both LEFT_EDGE and RIGHT_EDGE
    // Field 22 is in both LEFT_EDGE and BOTTOM_ROW
    expect(checkWin([1, 2, 4, 7, 11, 16, 22])).toBe(true)
  })

  it('returns true for right-edge path', () => {
    // Fields 1,3,6,10,15,21,28 — right edge column
    // Field 1 is in both LEFT_EDGE and RIGHT_EDGE
    // Field 28 is in both RIGHT_EDGE and BOTTOM_ROW
    expect(checkWin([1, 3, 6, 10, 15, 21, 28])).toBe(true)
  })

  it('returns true for entire bottom row (22 is left, 28 is right)', () => {
    expect(checkWin([22, 23, 24, 25, 26, 27, 28])).toBe(true)
  })

  it('returns true when one component of many satisfies the condition', () => {
    // Two disconnected groups; second group satisfies win
    const isolated = [5, 8, 9] // mid-board, touches no edge
    const winning  = [1, 2, 4, 7, 11, 16, 22]
    expect(checkWin([...isolated, ...winning])).toBe(true)
  })

  it('returns false for full middle cluster with no edge contact', () => {
    expect(checkWin([5, 8, 9, 13, 14])).toBe(false)
  })
})
```

- [ ] **Step 2: Run tests**

```bash
npm run test --workspace=server
```

Expected: all tests in `winChecker.test.ts` pass. Other test files may have failures from the changed `checkWin` signature — those are fixed in Task 3.

---

## Task 3: Update gameService.ts call sites

**Files:**
- Modify: `server/src/services/gameService.ts` (line ~67)

`checkWin` no longer takes a `player` argument.

- [ ] **Step 1: Update the two call sites in `claimField`**

Find this line (around line 67):
```typescript
const winner = checkWin(p1, 1) ? 1 : checkWin(p2, 2) ? 2 : null
```

Replace with:
```typescript
const winner = checkWin(p1) ? 1 : checkWin(p2) ? 2 : null
```

- [ ] **Step 2: Run all server tests**

```bash
npm run test --workspace=server
```

Expected: all tests pass, no TypeScript errors.

- [ ] **Step 3: Commit**

```bash
git add server/src/services/winChecker.ts \
        server/src/services/__tests__/winChecker.test.ts \
        server/src/services/gameService.ts
git commit -m "feat: unified three-sides win condition for both players"
```

---

## Task 4: Update ModeratorPage.tsx — tournament flow UI

**Files:**
- Modify: `client/src/pages/ModeratorPage.tsx`

Add two pieces of state at the top of the component (after existing `useState` calls):
```typescript
const [nextForm, setNextForm] = useState<'NUMBERS' | 'LETTERS' | null>(null)
const [nextNames, setNextNames] = useState({ p1: '', p2: '' })
```

Reset `nextForm` when a new game starts (status leaves FINISHED). Add this effect after the existing state declarations:
```typescript
const prevStatus = useRef(gameState.status)
useEffect(() => {
  if (prevStatus.current === 'FINISHED' && gameState.status !== 'FINISHED') {
    setNextForm(null)
    setNextNames({ p1: '', p2: '' })
  }
  prevStatus.current = gameState.status
}, [gameState.status])
```

Also add the import at the top: `import { useState, useRef, useEffect } from 'react'`

- [ ] **Step 1: Add imports and new state**

At the top of `ModeratorPage.tsx`, replace:
```typescript
import { useState } from 'react'
```
with:
```typescript
import { useState, useRef, useEffect } from 'react'
```

After the existing `const [startForm, setStartForm]` line, add:
```typescript
const [nextForm, setNextForm] = useState<'NUMBERS' | 'LETTERS' | null>(null)
const [nextNames, setNextNames] = useState({ p1: '', p2: '' })
const prevStatus = useRef(gameState.status)
useEffect(() => {
  if (prevStatus.current === 'FINISHED' && gameState.status !== 'FINISHED') {
    setNextForm(null)
    setNextNames({ p1: '', p2: '' })
  }
  prevStatus.current = gameState.status
}, [gameState.status])
```

- [ ] **Step 2: Replace the `isFinished` block**

Find and replace the entire `{isFinished && ( ... )}` block (currently lines 149–161) with:

```tsx
{isFinished && (
  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
    <div style={{ textAlign: 'center', padding: '16px 0', color: '#fbbf24', fontSize: '1.2rem', fontWeight: 700 }}>
      🏆 Vyhrál {gameState.winner === 1 ? gameState.player1Name : gameState.player2Name}!
    </div>

    {/* Další semifinále */}
    {nextForm === 'NUMBERS' ? (
      <form onSubmit={(e) => { e.preventDefault(); socket?.emit('moderator:startGame', { player1Name: nextNames.p1, player2Name: nextNames.p2, round: 'NUMBERS' }) }}
        style={{ display: 'flex', flexDirection: 'column', gap: 8, background: 'rgba(34,197,94,0.06)', border: '1px solid rgba(34,197,94,0.2)', borderRadius: 10, padding: 12 }}>
        <div style={{ fontSize: '0.65rem', fontWeight: 700, color: '#475569', letterSpacing: '1.5px', textTransform: 'uppercase' }}>Semifinále — Čísla</div>
        <input value={nextNames.p1} onChange={e => setNextNames(s => ({ ...s, p1: e.target.value }))} placeholder="Jméno týmu 1"
          style={{ padding: '8px 12px', borderRadius: 8, border: '1px solid rgba(249,115,22,0.3)', background: 'rgba(249,115,22,0.08)', color: '#f1f5f9', fontSize: '0.9rem', outline: 'none' }} />
        <input value={nextNames.p2} onChange={e => setNextNames(s => ({ ...s, p2: e.target.value }))} placeholder="Jméno týmu 2"
          style={{ padding: '8px 12px', borderRadius: 8, border: '1px solid rgba(34,211,238,0.3)', background: 'rgba(34,211,238,0.08)', color: '#f1f5f9', fontSize: '0.9rem', outline: 'none' }} />
        <div style={{ display: 'flex', gap: 8 }}>
          <button type="button" onClick={() => setNextForm(null)}
            style={{ flex: 1, padding: 10, borderRadius: 8, border: '1px solid rgba(255,255,255,0.1)', background: 'transparent', color: '#64748b', cursor: 'pointer', fontSize: '0.85rem' }}>Zrušit</button>
          <button type="submit"
            style={{ flex: 2, padding: 10, borderRadius: 8, border: 'none', background: 'linear-gradient(135deg, #22c55e, #15803d)', color: 'white', fontWeight: 700, cursor: 'pointer', fontSize: '0.9rem' }}>▶ Spustit</button>
        </div>
      </form>
    ) : (
      <button onClick={() => { setNextForm('NUMBERS'); setNextNames({ p1: '', p2: '' }) }}
        style={{ width: '100%', padding: 12, border: 'none', borderRadius: 10, background: 'linear-gradient(135deg, #22c55e, #15803d)', color: 'white', fontWeight: 700, cursor: 'pointer', fontSize: '0.95rem' }}>
        ▶ Další semifinále (Čísla)
      </button>
    )}

    {/* Finále */}
    {nextForm === 'LETTERS' ? (
      <form onSubmit={(e) => { e.preventDefault(); socket?.emit('moderator:startGame', { player1Name: nextNames.p1, player2Name: nextNames.p2, round: 'LETTERS' }) }}
        style={{ display: 'flex', flexDirection: 'column', gap: 8, background: 'rgba(99,102,241,0.06)', border: '1px solid rgba(99,102,241,0.2)', borderRadius: 10, padding: 12 }}>
        <div style={{ fontSize: '0.65rem', fontWeight: 700, color: '#475569', letterSpacing: '1.5px', textTransform: 'uppercase' }}>Finále — Písmena</div>
        <input value={nextNames.p1} onChange={e => setNextNames(s => ({ ...s, p1: e.target.value }))} placeholder="Jméno finalisty 1"
          style={{ padding: '8px 12px', borderRadius: 8, border: '1px solid rgba(249,115,22,0.3)', background: 'rgba(249,115,22,0.08)', color: '#f1f5f9', fontSize: '0.9rem', outline: 'none' }} />
        <input value={nextNames.p2} onChange={e => setNextNames(s => ({ ...s, p2: e.target.value }))} placeholder="Jméno finalisty 2"
          style={{ padding: '8px 12px', borderRadius: 8, border: '1px solid rgba(34,211,238,0.3)', background: 'rgba(34,211,238,0.08)', color: '#f1f5f9', fontSize: '0.9rem', outline: 'none' }} />
        <div style={{ display: 'flex', gap: 8 }}>
          <button type="button" onClick={() => setNextForm(null)}
            style={{ flex: 1, padding: 10, borderRadius: 8, border: '1px solid rgba(255,255,255,0.1)', background: 'transparent', color: '#64748b', cursor: 'pointer', fontSize: '0.85rem' }}>Zrušit</button>
          <button type="submit"
            style={{ flex: 2, padding: 10, borderRadius: 8, border: 'none', background: 'linear-gradient(135deg, #6366f1, #4338ca)', color: 'white', fontWeight: 700, cursor: 'pointer', fontSize: '0.9rem' }}>🏆 Spustit finále</button>
        </div>
      </form>
    ) : (
      <button onClick={() => { setNextForm('LETTERS'); setNextNames({ p1: '', p2: '' }) }}
        style={{ width: '100%', padding: 12, border: 'none', borderRadius: 10, background: 'linear-gradient(135deg, #6366f1, #4338ca)', color: 'white', fontWeight: 700, cursor: 'pointer', fontSize: '0.95rem' }}>
        🏆 Finále (Písmena)
      </button>
    )}

    <button onClick={() => socket?.emit('moderator:resetGame')}
      style={{ width: '100%', padding: 12, borderRadius: 10, border: '1px solid rgba(239,68,68,0.25)', background: 'rgba(239,68,68,0.07)', color: '#f87171', fontWeight: 600, cursor: 'pointer', fontSize: '0.9rem' }}>
      ↺ Nová hra od začátku
    </button>
  </div>
)}
```

- [ ] **Step 3: Commit**

```bash
git add client/src/pages/ModeratorPage.tsx
git commit -m "feat: tournament flow UI — semifinal and final buttons on finished screen"
```

---

## Task 5: Write README.md

**Files:**
- Create: `README.md`

- [ ] **Step 1: Write the file**

```markdown
# AZKviz

Kvízová hra na hexagonální desce pro 2–4 hráče. Dva hráči soupeří o obsazení hexagonálních polí — výhra znamená propojit všechny tři strany trojúhelníkové pyramidy svou barvou.

## Tech stack

| Část | Technologie |
|------|-------------|
| Server | Node.js, Express, Socket.io, Prisma, TypeScript |
| Client | React 18, Vite, TypeScript |
| Databáze | PostgreSQL (prod) / SQLite (dev) |
| Deployment | Railway (PaaS) |

## Struktura monorepa

```
AZKviz/
├── server/          Express API + Socket.io + Prisma
├── client/          React SPA (Vite)
├── shared/          Sdílené TypeScript typy
├── scripts/         Build skripty
├── landing/         Statická landing page (mihula.com/azkviz)
└── docs/            Dokumentace
```

## Předpoklady

- Node.js 20+
- npm 10+

## Vývojové prostředí

```bash
# 1. Nainstalovat závislosti
npm install

# 2. Zkopírovat env soubor
cp .env.example .env
# Upravit .env — nastavit DATABASE_URL, JWT_SECRET, MODERATOR_PIN

# 3. Inicializovat databázi
npm run db:push --workspace=server

# 4. Spustit dev server (server + client paralelně)
npm run dev
```

- Server: http://localhost:3001
- Client: http://localhost:5173

## Build a deploy balíček

```bash
# Sestavit vše (shared → server → client)
npm run build

# Vytvořit release/ složku pro FTP deploy
npm run package
# → obsah release/ zkopírovat na VPS, pak: npm install && NODE_ENV=production npm start
```

## Railway deploy

Projekt je připojen na Railway. Každý `git push` na `main` spustí automatický deploy.

Potřebné env proměnné v Railway (servis s kódem):
```
NODE_ENV=production
DATABASE_URL=${{Postgres.DATABASE_URL}}   # automaticky z PostgreSQL servisu
JWT_SECRET=<náhodný dlouhý string>
MODERATOR_PIN=<PIN pro přihlášení moderátora>
CLIENT_ORIGIN=https://<tvoje-railway-url>
```

## Skripty

| Příkaz | Popis |
|--------|-------|
| `npm run dev` | Dev server (server + client) |
| `npm run build` | Produkční build |
| `npm run package` | Vytvoří `release/` pro FTP deploy |
| `npm run test` | Spustí všechny testy |
| `npm run db:push --workspace=server` | Synchronizuje Prisma schema s DB |
```

- [ ] **Step 2: Commit**

```bash
git add README.md
git commit -m "docs: add README with setup, build, and deploy instructions"
```

---

## Task 6: Write docs/game.md

**Files:**
- Create: `docs/game.md`

- [ ] **Step 1: Write the file**

```markdown
# Návod pro moderátora

## Přihlášení

Přejdi na `/moderator` a zadej PIN (nastavený jako `MODERATOR_PIN` v prostředí).

## Spuštění hry

1. Zadej jméno **Hráče 1** a **Hráče 2**
2. Vyber kolo:
   - **1. kolo — Čísla** (semifinále): pole označená čísly 1–28
   - **2. kolo — Písmena** (finále): pole označená písmeny A–Ž
3. Klikni **▶ Spustit hru**

## Průběh hry

### Výběr pole
Klikni na libovolné volné pole na desce — pole se zvýrazní jako aktivní.

### Zobrazení otázky
Po kliknutí se automaticky načte otázka pro dané pole z databáze.

### Přiřazení pole
Po zodpovězení otázky:
- **🟠 Hráč 1 získal pole** — pole se obarví oranžovou barvou
- **🔵 Hráč 2 získal pole** — pole se obarví modrou barvou
- **⏭ Přeskočit** — pole zůstane volné, žádný hráč ho nezíská

### Konec hry
Jakmile některý hráč splní výherní podmínku, hra přejde do stavu **FINISHED**.

## Po skončení hry

Na obrazovce se zobrazí vítěz a tři možnosti:

| Tlačítko | Akce |
|----------|------|
| **▶ Další semifinále (Čísla)** | Zadej jména nových týmů, spustí novou hru s číselnými otázkami |
| **🏆 Finále (Písmena)** | Zadej jména finalistů, spustí hru s písmenkovými otázkami |
| **↺ Nová hra od začátku** | Reset do výchozího stavu |

## Reset a odhlášení

- **↺ Reset** (během hry) — okamžitě ukončí rozehranou hru
- **Odhlásit** (pravý horní roh) — odstraní token z prohlížeče
```

- [ ] **Step 2: Commit**

```bash
git add docs/game.md
git commit -m "docs: add moderator game guide"
```

---

## Task 7: Write docs/rules.md

**Files:**
- Create: `docs/rules.md`

- [ ] **Step 1: Write the file**

```markdown
# Pravidla hry AZKviz

## Herní deska

Deska má tvar trojúhelníkové pyramidy — **28 hexagonálních polí** uspořádaných do 7 řad:

```
        [ 1 ]
      [ 2 ][ 3 ]
    [ 4 ][ 5 ][ 6 ]
  [ 7 ][ 8 ][ 9 ][10]
[11][12][13][14][15]
[16][17][18][19][20][21]
[22][23][24][25][26][27][28]
```

V kole **Čísla** jsou pole označena čísly 1–28.  
V kole **Písmena** jsou pole označena písmeny české abecedy (A, B, C, Č … Ž).

## Průběh hry

1. Moderátor vybere pole na desce
2. Zobrazí se otázka pro dané pole
3. Hráči odpovídají — kdo odpoví správně, získá pole (moderátor přiřadí)
4. Pole se natrvalo zabarví barvou hráče
5. Postup se opakuje až do výhry

## Výherní podmínka

Hráč vyhraje, pokud jeho obsazená pole vytvoří **spojitou cestu propojující všechny tři strany pyramidy**:

| Strana | Pole |
|--------|------|
| Levá hrana | 1, 2, 4, 7, 11, 16, 22 |
| Pravá hrana | 1, 3, 6, 10, 15, 21, 28 |
| Spodní řada | 22, 23, 24, 25, 26, 27, 28 |

> **Příklad výhry:** Hráč obsadí celou levou hranu (pole 1→2→4→7→11→16→22). Pole 1 leží na levé i pravé hraně, pole 22 leží na levé hraně i spodní řadě — podmínka je splněna.

Pole musí být **propojená hranou** (každý hexagon sousedí s až 6 dalšími).

## Turnajová struktura

### Varianta A — 4 týmy (doporučeno)

| Fáze | Kolo | Týmy |
|------|------|------|
| Semifinále 1 | Čísla | Tým 1 vs Tým 2 |
| Semifinále 2 | Čísla | Tým 3 vs Tým 4 |
| Finále | Písmena | Vítěz SF1 vs Vítěz SF2 |

### Varianta B — 2 hráči

Moderátor zvolí kolo na začátku:
- **Čísla** — standardní hra
- **Písmena** — rovnou finálová obtížnost

## Otázky

- Každé pole má přiřazenou otázku v databázi
- Kolo **Čísla**: otázky na čísla/počítání
- Kolo **Písmena**: otázky na písmena/slova (obtížnější)
- Otázky spravuje moderátor přes `/admin`
```

- [ ] **Step 2: Commit**

```bash
git add docs/rules.md
git commit -m "docs: add game rules with board layout, win condition, tournament structure"
```

---

## Task 8: Final build check and push

- [ ] **Step 1: Run full build**

```bash
npm run build
```

Expected: no TypeScript errors, all workspaces build successfully.

- [ ] **Step 2: Run all tests**

```bash
npm run test
```

Expected: all tests pass.

- [ ] **Step 3: Push to GitHub**

```bash
git push
```

Railway will automatically deploy from the `main` branch.
