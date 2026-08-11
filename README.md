# AI Future Skills Intelligence Engine

SaaS platform that models how AI and business transformation change workforce skills: process mapping, role analysis, future-skill scoring, reskilling recommendations, and an AI assistant.

## Stack

- **Backend**: Node.js + Express + TypeScript + Prisma (SQLite by default) + Zod
- **Frontend**: React + Vite + TypeScript
- **Monorepo**: npm workspaces (`backend/`, `frontend/`)

## Local development

```bash
npm install
npm run setup       # generate Prisma client, run migrations, seed demo org "NovaTech Solutions"
npm run dev         # backend :4000 + frontend :5173
```

- UI: http://localhost:5173
- API: http://localhost:4000/api
- API reference: http://localhost:4000/docs
- Demo login: `admin@novatech.demo` / `demo1234` (see `DEMO_SEED_PASSWORD` in `.env`)

## Production (single container)

The backend serves the built frontend from `frontend/dist` when it exists, so one container runs everything. Test it locally:

```bash
npm run build
npm start           # serves API + SPA on http://localhost:4000
```

### Docker

```bash
docker compose up -d --build
```

Opens http://localhost:4000. Data persists in the `app-data` volume (`/data/dev.db`), and demo data is seeded on first start.

Useful options (see `docker-compose.yml`):

| Variable        | Purpose                                                              |
| --------------- | -------------------------------------------------------------------- |
| `JWT_SECRET`    | **Set this in production.** Signs auth tokens.                       |
| `DATABASE_URL`  | SQLite path; swap to `postgresql://...` for PostgreSQL.              |
| `AI_PROVIDER`   | `template` (built-in, no key) or `openai` (requires `OPENAI_API_KEY`). |
| `OPENAI_API_KEY`| Key for GPT-based analysis when `AI_PROVIDER=openai`.                |
| `SEED_ON_START` | `true` re-seeds demo data on every container start.                  |

Run manually:

```bash
docker build -t ai-future-skills-intelligence-engine .
docker run -d -p 4000:4000 -e JWT_SECRET=$(some long random string) -v app-data:/data ai-future-skills-intelligence-engine
```

## Scripts

| Command            | Description                              |
| ------------------ | ---------------------------------------- |
| `npm run dev`      | Backend + frontend dev servers           |
| `npm run build`    | Compile backend + build frontend bundle  |
| `npm start`        | Run compiled backend (serves SPA too)    |
| `npm test`         | Backend test suite                       |
| `npm run typecheck`| Type-check both workspaces               |
| `npm run seed`     | Re-seed demo data                        |
