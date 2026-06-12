# AZKvíz — Design Specification

**Date:** 2026-06-11  
**Status:** Approved

---

## Overview

Webová aplikace pro hraní hry ve stylu AZ kvíz. Moderátor řídí hru přes chráněný pohled, hráči a publikum sledují live stav pyramidy na svých zařízeních (read-only). Aplikace podporuje dvě kola (čísla, písmena) s klasickým win condition — propojení strany pyramidy.

---

## Architektura

**Stack:** React 18 + Vite + TypeScript (frontend) · Express + Socket.io + TypeScript (backend) · PostgreSQL + Prisma ORM

**Deployment:** Jeden server (Express servuje React build ze `dist/` + API routes + WebSocket). Nasazení na Railway nebo Render. PostgreSQL jako managed addon.

```
Browser (hráči)  ──WS──┐
Browser (moderátor) ──WS──┤── Express server ── PostgreSQL
Browser (admin)    ──HTTP─┘
```

**Autentizace:** Jednoduchý PIN pro přístup na `/moderator` a `/admin`. PIN uložen v env proměnné `MODERATOR_PIN`. JWT session token v localStorage po ověření.

---

## Routes

| Route | Přístup | Popis |
|---|---|---|
| `/` | Veřejný | Live pohled — pyramida, jména hráčů, aktuální stav |
| `/moderator` | PIN | Řízení hry — výběr pole, přiřazení odpovědí, reset |
| `/admin` | PIN | Správa otázek — CRUD + JSON import |

---

## Datový model

### `questions`
```
id           Int      @id @default(autoincrement())
round        Round    (NUMBERS | LETTERS)
fieldNumber  Int      (1–28)
text         String
answer       String
createdAt    DateTime
```
Unique constraint: `(round, fieldNumber)` — každé pole má právě jednu otázku v každém kole.

### `game_state` (singleton, vždy max 1 řádek)
```
id           Int      @id @default(1)
status       Status   (WAITING | PLAYING | FINISHED)
round        Round    (NUMBERS | LETTERS)
player1Name  String
player2Name  String
activeField  Int?     (1–28, null = žádné aktivní)
claimedP1    Int[]    (pole čísel získaných hráčem 1)
claimedP2    Int[]    (pole čísel získaných hráčem 2)
winner       Int?     (1 | 2 | null)
updatedAt    DateTime
```

---

## Pyramida — struktura

7 řad, 28 políček celkem (1+2+3+4+5+6+7):

```
        [1]
      [2] [3]
    [4] [5] [6]
  [7] [8] [9] [10]
[11][12][13][14][15]
[16][17][18][19][20][21]
[22][23][24][25][26][27][28]
```

**Kolo 1 — čísla:** pole označena 1–28  
**Kolo 2 — písmena:** pole označena českou abecedou (A, B, C, Č, D, E, F, G, H, Ch, I, J, K, L, M, N, O, P, R, Ř, S, Š, T, U, V, W, Z, Ž)

### Sousedství (pro win condition BFS)
Pole `n` v řadě `r` (0-indexed, řada r má r+1 polí) má sousedy:
- Ve stejné řadě: `n-1`, `n+1`
- V řadě nad (r-1): pole `col-1` a `col`
- V řadě pod (r+1): pole `col` a `col+1`

### Win condition
- **Hráč 1** (oranžový): propojí pole z **řady 1** (pole 1) s **řadou 7** (pole 22–28) — BFS shora dolů
- **Hráč 2** (tyrkysový): propojí **levý okraj** (2, 4, 7, 11, 16, 22) s **pravým okrajem** (3, 6, 10, 15, 21, 28) — BFS zleva doprava

Pole 1 (vrchol pyramidy) je součástí cesty obou hráčů, ale samo o sobě nezakládá výhru — hráč 2 ho může použít jako most mezi levým a pravým okrajem.

Win condition se kontroluje po každém přiřazení pole.

---

## Herní flow

1. Moderátor zadá PIN → dostane JWT token → přístup na `/moderator`
2. Zadá jména hráčů, vybere kolo, spustí hru (`status: PLAYING`)
3. Klikne na pole v pyramidě → `activeField` se nastaví, zobrazí se otázka + odpověď
4. Moderátor klikne „Hráč 1 získal" nebo „Hráč 2 získal" nebo „Přeskočit"
5. Server aktualizuje `game_state`, spustí BFS win check
6. Socket.io event `game:update` se broadcastuje všem připojeným klientům
7. Pokud je vítěz → `status: FINISHED`, zobrazí se vítěz na všech obrazovkách
8. Moderátor může resetovat hru (vše od začátku) nebo přejít do 2. kola (zachová jména hráčů, vymaže claimed pole, přepne `round` na LETTERS, `status` zpět na PLAYING)

---

## Real-time (Socket.io events)

| Event | Směr | Payload |
|---|---|---|
| `game:update` | server → all | celý `game_state` objekt |
| `moderator:selectField` | client → server | `{ fieldNumber: number }` |
| `moderator:claimField` | client → server | `{ player: 1 \| 2 }` |
| `moderator:skipField` | client → server | `{}` |
| `moderator:startGame` | client → server | `{ player1Name, player2Name, round }` |
| `moderator:resetGame` | client → server | `{}` |

Všechny moderátorské eventy vyžadují validní JWT token (middleware na Socket.io handshake).

---

## API Routes

| Method | Path | Auth | Popis |
|---|---|---|---|
| `POST` | `/api/auth/login` | — | Ověření PIN, vrátí JWT |
| `GET` | `/api/game` | — | Aktuální stav hry |
| `GET` | `/api/questions` | PIN | Seznam otázek (s filtrem) |
| `POST` | `/api/questions` | PIN | Vytvoření otázky |
| `PUT` | `/api/questions/:id` | PIN | Editace otázky |
| `DELETE` | `/api/questions/:id` | PIN | Smazání otázky |
| `POST` | `/api/questions/import` | PIN | Hromadný import z JSON |

### JSON import formát
```json
[
  {
    "round": "NUMBERS",
    "fieldNumber": 1,
    "text": "Text otázky",
    "answer": "Správná odpověď"
  }
]
```
Import je upsert — existující otázka pro stejné `(round, fieldNumber)` se přepíše.

---

## Frontend komponenty

### Sdílené
- `HexBoard` — vykreslí celou pyramidu, přijímá `gameState` + `onFieldClick?`
- `HexCell` — jednotlivý hexagon, stavy: `free | active | p1 | p2`

### Veřejný pohled (`/`)
- `PublicPage` — layout, připojí Socket.io, předává stav do `HexBoard`
- `PlayerStrip` — jméno hráče + barevný identifikátor

### Moderátorský pohled (`/moderator`)
- `ModeratorPage` — chráněná stránka, layout dvě sloupce
- `QuestionPanel` — zobrazí otázku + odpověď pro aktivní pole
- `GameControls` — tlačítka claim/skip/reset/start

### Admin (`/admin`)
- `AdminPage` — chráněná stránka
- `QuestionTable` — seznam otázek s filtrem a inline editací
- `QuestionForm` — formulář pro přidání/editaci
- `JsonImport` — upload JSON souboru nebo paste textu, preview před importem

---

## Adresářová struktura

```
AZKviz/
├── client/                  # React + Vite
│   ├── src/
│   │   ├── components/
│   │   │   ├── HexBoard.tsx
│   │   │   ├── HexCell.tsx
│   │   │   └── ...
│   │   ├── pages/
│   │   │   ├── PublicPage.tsx
│   │   │   ├── ModeratorPage.tsx
│   │   │   └── AdminPage.tsx
│   │   ├── hooks/
│   │   │   └── useGameSocket.ts
│   │   └── lib/
│   │       └── hexUtils.ts   # BFS, sousedství
│   └── index.html
├── server/                  # Express + Socket.io
│   ├── src/
│   │   ├── index.ts          # Entry point
│   │   ├── routes/
│   │   ├── socket/
│   │   │   └── gameHandler.ts
│   │   ├── services/
│   │   │   ├── gameService.ts
│   │   │   └── winChecker.ts
│   │   └── prisma/
│   │       └── schema.prisma
│   └── tsconfig.json
├── shared/                  # Sdílené typy
│   └── types.ts
└── package.json             # Workspace root
```

---

## Verifikace

1. `npm run dev` spustí oba servery (concurrently)
2. Otevřít `/` — pyramida se zobrazí, čeká na hru
3. Otevřít `/moderator` s PIN → zadat jména, spustit hru
4. Kliknout na pole → otázka se zobrazí v moderátorském panelu
5. Přiřadit pole → pyramid se aktualizuje na veřejném pohledu v reálném čase
6. Přiřazovat dokud jeden hráč nepropojí strany → zobrazí se vítěz
7. Otevřít `/admin` → přidat otázku ručně + importovat JSON soubor
