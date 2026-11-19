# Project knowledge

`README.md` is the canonical documentation. `AGENTS.md` is the session brief.
Keep both in sync when the project changes; this file is only a quick pointer.

## What this project is

`school-system` — a school management platform for Kenyan primary, JSS and
secondary schools, built as a pnpm monorepo:

- `apps/api` — NestJS 11, Prisma 7 + PostgreSQL 16, JWT auth, Swagger
- `apps/web` — Next.js 15 App Router, React 19, Tailwind 4, shadcn/ui, Orval
- `packages/shared` — roles, Kenyan constants, 8-4-4/CBC grade bands, Zod schemas

Grading supports CBC performance levels and 8-4-4 numeric bands per school.
Money is KES (`Decimal`), phones are E.164 (`+254...`), dates use
`Africa/Nairobi`.

## Where we are

Phase 1 (Foundation) is complete: monorepo, full Prisma schema, migration, seed,
auth with refresh rotation and lockout, role guards, Swagger, signed session
cookie, role dashboards, Orval client, 8 unit tests.

**Phase 2 (People & structure) is next and has not started.** Wait for explicit
approval before writing it. See `AGENTS.md` for the Phase 2 checklist and
`README.md` for the roadmap.

## Commands

```bash
docker compose up -d db      # Postgres on :5435
pnpm install                 # builds shared + generates Prisma client
pnpm prisma migrate dev      # or: pnpm prisma migrate deploy
pnpm seed
pnpm dev:api                 # :3001
pnpm dev:web                 # :3000
pnpm test                    # API unit tests
pnpm typecheck
pnpm build
pnpm --filter api openapi && pnpm orval   # after API contract changes
```

Dev logins: `admin@mwangaza.ac.ke / Admin@1234`, `teacher@mwangaza.ac.ke /
Teacher@1234`, `student@mwangaza.ac.ke / Student@1234`,
`parent@mwangaza.ac.ke / Parent@1234`.

## Hard rules

- Only repositories touch Prisma.
- DTO + validation on every endpoint; backend enforces authorization.
- Consistent response envelope and global exception filter.
- Orval-generated types are the source of truth for the web client.
- No secrets in git; `.env.example` is the variable list.
- `Africa/Nairobi`, KES `Decimal`, E.164 phones.

## Layout notes

- `.agents/types/` is vendored Codebuff tooling — not application code. Do not
  edit it to fit the app.
- Generated output that must never be hand-edited:
  `apps/api/src/generated/prisma/`, `apps/web/src/lib/api/generated/`,
  `apps/web/src/components/ui/` (shadcn CLI).
