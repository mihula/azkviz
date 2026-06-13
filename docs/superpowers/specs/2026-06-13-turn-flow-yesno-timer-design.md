# AZKvíz — Turn Flow, Yes/No Questions & Timer Design

**Date:** 2026-06-13  
**Status:** Approved

---

## Overview

Rozšíření herního flow o sledování tahů, doplňující ano/ne otázky pro neuhodnutá pole a vizuální timer na odpověď. Všechny tři novinky jsou provázané přes rozšířený `GameState` broadcastovaný přes Socket.io všem klientům.

---

## Nová pravidla hry

Každé kolo probíhá takto:

1. Aktivní hráč vybere volné pole (nebo neuhodnuté — viz níže)
2. Moderátor mu položí otázku a spustí timer
3. Hráč odpoví:
   - **Správně** → hráč získá pole, tah přechází na soupeře
   - **Špatně** → moderátor nabídne soupeři možnost odpovídat
     - Soupeř odpoví **správně** → soupeř získá pole, jeho příští tah se přeskočí (tah zpět na původního hráče)
     - Soupeř **nechce nebo odpoví špatně** → pole je označeno jako neuhodnuté, tah přechází dále

**Neuhodnutá pole** — na jakémkoli pozdějším tahu si hráč může místo prázdného pole vybrat neuhodnuté pole. Dostane náhodnou ano/ne otázku:
- Správně → hráč získá pole
- Špatně → pole získá soupeř
- Tah se vždy přepne na soupeře

---

## Rozšíření datového modelu

### `GameState` — nová pole

```prisma
activePlayer      Int?     // 1 | 2 | null (null = hra nespuštěna)
unansweredFields  String   @default("[]")  // JSON array of Int
activeQuestionType String? // "normal" | "yesno" | null
timerStartedAt    DateTime?
```

### Nový model `YesNoQuestion`

```prisma
model YesNoQuestion {
  id        Int      @id @default(autoincrement())
  text      String
  answer    String   // "Ano" | "Ne"
  createdAt DateTime @default(now())
}
```

---

## Sdílené typy (`shared/types.ts`)

```typescript
export interface GameState {
  // ... stávající pole ...
  activePlayer: 1 | 2 | null
  unansweredFields: number[]
  activeQuestionType: 'normal' | 'yesno' | null
  timerStartedAt: string | null  // ISO timestamp
}

export interface YesNoQuestion {
  id: number
  text: string
  answer: string  // "Ano" | "Ne"
}
```

Nové socket eventy v `ClientToServerEvents`:

```typescript
'moderator:startTimer': () => void
'moderator:stealField': (data: { player: 1 | 2 }) => void
'moderator:markUnanswered': () => void
'moderator:resolveYesNo': (data: { correct: boolean }) => void
```

---

## Turn Advancement Logika

| Akce | Co se stane s polem | `activePlayer` po akci |
|---|---|---|
| `claimField(player)` | Pole hráči, normální výsledek | Překlopí (1↔2) |
| `stealField(player)` | Hráč 2 ukradl z tahu hráče 1 | **Nepřeklopí** — zůstane na původním hráči |
| `markUnanswered` | Pole do `unansweredFields` | Překlopí |
| `resolveYesNo(correct: true)` | Pole aktivnímu hráči | Překlopí |
| `resolveYesNo(correct: false)` | Pole soupeři aktivního hráče | Překlopí |
| `skipField` | Pole volné (bez neuhodnutí) | Překlopí |

`activePlayer` se nastavuje na 1 při `startGame`. Timer (`timerStartedAt`) se maže při každé akci, která uzavře aktivní pole.

---

## Socket Events

Stávající eventy se nemění (chování `claimField` se rozšíří o přepnutí `activePlayer`).

Nové:

| Event | Směr | Popis |
|---|---|---|
| `moderator:startTimer` | client→server | Zapíše `timerStartedAt = now()`, broadcastuje |
| `moderator:stealField` | client→server | Přiřadí pole soupeři, nepřeklopí `activePlayer` |
| `moderator:markUnanswered` | client→server | Přidá aktivní pole do `unansweredFields`, překlopí `activePlayer` |
| `moderator:resolveYesNo` | client→server | Přiřadí pole dle výsledku, překlopí `activePlayer` |

Server při `moderator:selectField` automaticky detekuje, zda je vybrané pole v `unansweredFields` → nastaví `activeQuestionType: 'yesno'`, jinak `'normal'`.

---

## REST API

| Method | Path | Auth | Popis |
|---|---|---|---|
| `GET` | `/api/questions/yesno` | PIN | Seznam všech ano/ne otázek |
| `GET` | `/api/questions/yesno/random` | PIN | Vrátí náhodnou `YesNoQuestion` |
| `POST` | `/api/questions/yesno` | PIN | Vytvoření ano/ne otázky |
| `PUT` | `/api/questions/yesno/:id` | PIN | Editace |
| `DELETE` | `/api/questions/yesno/:id` | PIN | Smazání |
| `POST` | `/api/questions/yesno/import` | PIN | Hromadný import z JSON |

Import formát:
```json
[{ "text": "Je Země větší než Měsíc?", "answer": "Ano" }]
```

---

## Moderátor UI — nový panel

Lokální stav `offerPhase: boolean` — nezobrazuje se publiku, jen moderátorovi.

### Normální otázka — fáze 1

- Tlačítko **▶ Timer** (emituje `startTimer`)
- **[🟠/🔵 Hráč X získal pole]** → `claimField`
- **[Hráč X odpověděl špatně]** → přepne `offerPhase = true` (lokální state)

### Normální otázka — fáze 2 (nabídka soupeři)

- Text: *"Chce odpovídat [jméno soupeře]?"*
- **[Soupeř odpověděl správně]** → `stealField`
- **[Nikdo neuhodl]** → `markUnanswered`

### Ano/ne otázka

- Zobrazí text otázky + správnou odpověď (Ano/Ne)
- Tlačítko **▶ Timer**
- **[✓ Správně → pole hráče X]** → `resolveYesNo({ correct: true })`
- **[✗ Špatně → pole soupeře]** → `resolveYesNo({ correct: false })`

---

## Veřejný pohled (`/`) — nové prvky

- **Indikátor aktivního hráče** pod pyramidou: *"Na tahu: [jméno]"*
- **Vizuální timer** — klienti počítají odpočet lokálně z `timerStartedAt` (ISO timestamp); délka timeru je konstanta na frontendu (např. 30 s); moderátor timer jen spustí, nevynucuje — po vypršení jen vizuální indikace
- **Stav `unanswered`** na hexagonu — odlišná barva od volného i obsazeného pole (návrh: invertovaná/tmavá verze s outline)

---

## HexCell — nový stav

```typescript
type CellState = 'free' | 'active' | 'p1' | 'p2' | 'unanswered'
```

CSS třída `.unanswered` — vizuálně odlišná od `.free` (tmavší pozadí s barevným outline, naznačuje "bylo tu, ale nikdo nevzal").

---

## Admin — správa ano/ne otázek

Nová záložka v `/admin` pro CRUD ano/ne otázek. Stejný pattern jako stávající `QuestionTable` + `QuestionForm`, ale pro `YesNoQuestion` (bez `round` a `fieldNumber`).

---

## Co se nemění

- Win condition (checkWin) — beze změny
- Struktura pyramidy, sousedství — beze změny
- Autentizace, JWT — beze změny
- `claimedP1`, `claimedP2` — beze změny (ano/ne výsledky se zapisují do existujících polí)
