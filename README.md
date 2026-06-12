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
