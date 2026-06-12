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
