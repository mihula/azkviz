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
