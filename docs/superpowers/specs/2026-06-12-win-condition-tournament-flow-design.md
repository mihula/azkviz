# Win Condition & Tournament Flow — Design

Date: 2026-06-12

## Summary

Replace the current asymmetric win conditions with a unified three-sides rule for both players.
Add tournament-aware UI to the finished-game screen. Write project documentation.

---

## 1. Win Condition

### Current (to be removed)
- Player 1: must hold apex (field 1) and connect to bottom row via BFS
- Player 2: must connect left edge to right edge via BFS

### New — identical for both players
A player wins when their claimed hexes contain a **connected component that simultaneously touches all three sides** of the triangular pyramid:

| Side | Fields |
|------|--------|
| Left edge (col 0) | 1, 2, 4, 7, 11, 16, 22 |
| Right edge (col = row) | 1, 3, 6, 10, 15, 21, 28 |
| Bottom row (row 6) | 22, 23, 24, 25, 26, 27, 28 |

**Algorithm:** BFS/flood-fill over a player's claimed fields. For each connected component, check whether it intersects all three side-sets. Any component that touches all three → win.

Note: field 1 (apex) belongs to both left and right edges. Fields 22 and 28 are corners shared between the bottom row and the left/right edges respectively.

### Files changed
- `server/src/services/winChecker.ts` — rewrite `checkWin` and edge sets
- `server/src/services/__tests__/winChecker.test.ts` — update tests for new logic

---

## 2. Tournament Flow

### Tournament structure
- **4-team tournament:** Semi-final 1 (NUMBERS) → Semi-final 2 (NUMBERS) → Final (LETTERS)
- **2-player variant:** Moderator chooses NUMBERS or LETTERS at the start of a single game

### FINISHED screen (ModeratorPage)

After a game ends, the moderator sees:

```
🏆 Vyhrál [winner name]!

[ Další semifinále (Čísla) ]   ← expands inline name form, round=NUMBERS
[ Finále (Písmena)          ]  ← expands inline name form, round=LETTERS
[ ↺ Nová hra od začátku     ]  ← resetGame → back to WAITING
```

Clicking "Další semifinále" or "Finále" expands an inline form with two name fields. Submitting calls the existing `moderator:startGame` socket event with the correct `round` value. The existing start-game form in WAITING state is unchanged (supports both rounds for the 2-player variant).

### Files changed
- `client/src/pages/ModeratorPage.tsx` — update `isFinished` section

---

## 3. Documentation

Three new files:

| File | Content |
|------|---------|
| `README.md` | Tech stack, monorepo structure, dev setup, build/package scripts, Railway deploy |
| `docs/game.md` | Moderator guide: starting a game, controlling the board, assigning fields |
| `docs/rules.md` | Game rules: board layout, win condition, tournament structure (4-team + 2-player variant) |

---

## Out of scope
- Tracking winners across games (no cross-game state)
- Automatic bracket management
- Any changes to question management or admin page
