# School System — agent brief

Read this file at the start of every session, then read `README.md` for full
detail. Keep both accurate when the project changes.

## Status

- **Phase 1 (Foundation) is complete and committed** (`5d61469`).
- **Phase 2 (People & structure) is complete** — CRUD, scoping, CSV import,
  photos, admin/teacher/parent screens, 15/15 tests, both apps build.
- **Phase 3 (Attendance) has NOT started.** Do not begin it until the user
  explicitly approves.
- Work strictly one phase at a time. At the end of each phase: run its checks,
  write the hand-test checklist, then **stop and wait**.

## What this is

A school management platform for Kenyan primary, JSS and secondary schools.
Supports CBC (EE/ME/AE/BE) and 8-4-4 numeric grading per school, KES-only money,
E.164 Kenyan phones, and `Africa/Nairobi` dates.

pnpm monorepo:

- `apps/api` — NestJS 11 + Prisma 7 + PostgreSQL 16
- `apps/web` — Next.js 15 App Router + React 19 + Tailwind 4 + shadcn/ui
- `packages/shared` — roles, Kenyan constants, grade bands, Zod schemas

## Commands

```bash
docker compose up -d db          # Postgres 16 on localhost:5435
pnpm install                     # postinstall: build shared + prisma generate
pnpm prisma migrate dev          # dev migration (or migrate deploy)
pnpm seed                        # idempotent seed
pnpm dev:api                     # :3001  (pnpm --filter api start:dev also works)
pnpm dev:web                     # :3000
pnpm test                        # API unit tests (currently 15)
pnpm typecheck                   # all packages
pnpm build                       # shared -> api -> web
pnpm --filter api openapi        # export OpenAPI (needs DB)
pnpm orval                       # regenerate web client after contract changes
```

Seeded logins (dev only): `admin@mwangaza.ac.ke / Admin@1234`,
`teacher@mwangaza.ac.ke / Teacher@1234`,
`student@mwangaza.ac.ke / Student@1234`,
`parent@mwangaza.ac.ke / Parent@1234`.

## Current architecture

```
Browser ──► Next :3000 (middleware + BFF /api/session/*) ──► API :3001 ──► Postgres :5435
```

- `apps/api/src/auth` — controller, service, JWT/refresh, cookies, repository, tests
- `apps/api/src/common` — envelope, pagination DTO/helper, exception filter, guards (`jwt`, `roles`, `csrf`), decorators
- `apps/api/src/people` — students (CSV import, photos), guardians, teachers, users
- `apps/api/src/structure` — classes, streams, subjects, academic years, terms
- `apps/api/src/scoping` — `ScopingService`, the single source of access rules
- `apps/api/src/prisma` — `PrismaService` (pg driver adapter)
- `apps/web/src/middleware.ts` — verifies HMAC-signed `ss_session`, role routing
- `apps/web/src/app/api/session/*` — BFF login / refresh / logout
- `apps/web/src/lib/auth-context.tsx` — access token kept **in memory**
- `apps/web/src/lib/api/auth-token.ts` — token holder the API client reads
- `apps/web/src/components/data-table/*` — shared DataTable + RHF/Zod dialog
- `apps/web/src/app/(dashboard)/admin/*` — admin CRUD screens (plus parent/teacher scoped tables)
- `apps/web/src/lib/api/generated/*` — Orval output; never edit by hand

## Non-negotiable rules

1. **Repositories only touch Prisma.** No `PrismaService` or query imports in
   controllers/services. Follow `auth/user.repository.ts` (port + implementation).
2. **DTO + validation on every endpoint.** class-validator on the API, Zod on the
   web. Global pipe uses `whitelist` + `forbidNonWhitelisted`.
3. **Permissions are enforced in the backend**, never just the UI. TEACHER sees
   only assigned classes; PARENT sees only linked children.
4. **Response envelope everywhere**: `{ success, data, meta? }` /
   `{ success:false, error:{ code, message, details? } }`.
5. **Orval is the source of truth for API types.** After a contract change:
   `pnpm --filter api openapi && pnpm orval && pnpm typecheck`.
6. **Secrets in `.env` only.** `.env` and `.env.local` are gitignored;
   `.env.example` lists every variable.
7. **All date logic uses `Africa/Nairobi`; currency is KES as `Decimal`.**
8. Conventional commits; one logical change per commit.

## Phase 2 — People & structure (complete)

Delivered: shared pagination DTO + `paginate()` helper; repositories for
students, guardians, teachers, users, classes, streams, subjects, academic
years and terms; `ScopingService` called from services; CRUD + Swagger for all
nine resources; `POST /students/:id/guardians`,
`POST /teachers/:id/class-subjects`; CSV import (per-row report, 500-row cap);
photo upload (2 MB, JPEG/PNG/WebP, EXIF stripped with `sharp`, signed
Cloudinary upload via `fetch`); admin DataTable screens, import wizard, student
detail tabs, parent/teacher scoped tables; 7 scoping tests.

Dependencies added: `papaparse`, `multer`, `sharp`, `@tanstack/react-table`
(plus `@types/papaparse`, `@types/multer`).

## Phase 3 — Attendance (next, on approval)

1. `AttendanceRepository` — upsert on `(studentId, date)`, queries by class/day
   and student/date-range.
2. `AttendanceService` using `ScopingService` (teacher: assigned classes only).
3. `POST /attendance/register`, `GET /attendance`, `GET /attendance/student/:id`,
   plus class/student summaries.
4. ABSENT creates an in-app notification for linked guardians.
5. Tests: teacher marking another class denied; parent reading another child denied.

Frontend: teacher register (class + date, PRESENT/ABSENT/LATE/EXCUSED), parent
and student history, class summary. Regenerate Orval after contract changes.

**Done when:** register is idempotent per student/day; scoping tests pass; Orval
regenerated; web compiles; hand-test checklist written.

## Verification baseline

`pnpm test` → 15/15 pass. API and web typecheck clean. `nest build` and
`next build` (18 routes) succeed. Seeded DB: 10 students, 3 teachers,
4 classes, 5 subjects. Live smoke covers CRUD, teacher/parent scoping 403s,
CSV import 50 rows → 47 imported / 3 failed, photo validation, and Swagger.

## Gotchas (learned the hard way)

- Next auto-selects **3001** if 3000 is busy, which then blocks the API. Start
  the API first; find strays with `ss -ltnp | grep 3001`.
- Global throttle is **20 req/min per IP** and in-memory. Rapid curl loops get
  429; wait ~60s or restart the API.
- Prisma 7 does not auto-load `.env`; `prisma.config.ts` imports `dotenv/config`.
- **Do not** re-enable `incremental` in `tsconfig.build.json` — combined with
  `deleteOutDir` it emits an incomplete `dist`.
- `tsx` cannot boot Nest (no decorator metadata). Use `ts-node` for
  `scripts/export-openapi.ts`.
- pnpm 12 blocks dependency build scripts unless listed under `allowBuilds` in
  `pnpm-workspace.yaml`.
- `NEXT_PUBLIC_API_URL` has **no** `/api` suffix; OpenAPI paths already include it.
- Refresh/session cookies use path `/` so the web BFF can read them.
- `next/font/google` fails in this environment; keep the system font stack.
- Prisma keeps camelCase column names; quote them in `psql`
  (`"admissionNumber"`, not `admission_number`).
- Photo upload returns **503** until `CLOUDINARY_*` is set — by design.
- `pnpm --filter api openapi` needs the DB up and boots the API once.

## Session start checklist

1. Read `README.md`.
2. `docker compose up -d db`; confirm healthy.
3. `pnpm install` only if `node_modules` is missing; otherwise ensure
   `apps/api/src/generated/prisma` exists (`prisma:generate`).
4. If the DB is empty: `pnpm prisma migrate deploy && pnpm seed`.
5. `pnpm test` for a green baseline.
6. Confirm no stray process on 3001, then start API, then web.
7. Ask for/confirm phase approval before writing Phase 3 code.

## Do not

- Start a later phase, or expand a phase, without approval.
- Hand-write API request/response types in the web app.
- Import Prisma into controllers/services, or bypass DTO validation.
- Weaken/skip tests, suppress type errors, or commit `.env` files.
- Swap pinned libraries (Nest 11, Next 15, Prisma 7, Tailwind 4, Orval) without
  asking.
