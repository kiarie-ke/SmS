# School System

A school management platform for Kenyan primary, JSS and secondary schools.
It supports **CBC** (PP1–Grade 9 performance levels) and **8-4-4 / CBC Senior
School** numeric grading behind one school-level setting, with KES fees, Kenyan
phone numbers, NEMIS UPIs, TSC numbers and `Africa/Nairobi` date logic.

> **Status: Phase 2 (People & structure) complete — awaiting approval for Phase 3.**
> Authentication, roles, people/structure CRUD, server-side teacher/parent
> scoping, CSV student import, photo upload and the admin DataTable screens all
> work. Attendance, exams, fees and notifications are still to come; see
> [Roadmap](#roadmap).

---

## Table of contents

1. [What is built today](#what-is-built-today)
2. [Tech stack](#tech-stack)
3. [Prerequisites](#prerequisites)
4. [Quick start](#quick-start)
5. [Seeded accounts](#seeded-accounts)
6. [Environment variables](#environment-variables)
7. [Scripts](#scripts)
8. [Architecture](#architecture)
9. [Authentication and sessions](#authentication-and-sessions)
10. [API reference](#api-reference)
11. [Data model](#data-model)
12. [Grading model](#grading-model)
13. [Web app routes and permissions](#web-app-routes-and-permissions)
14. [Testing and verification](#testing-and-verification)
15. [Roadmap](#roadmap)
16. [Continuing tomorrow](#continuing-tomorrow)
17. [Troubleshooting](#troubleshooting)
18. [Known limitations and deliberate decisions](#known-limitations-and-deliberate-decisions)
19. [Team and responsibilities](#team-and-responsibilities)
20. [Security and data protection](#security-and-data-protection)
21. [Conventions](#conventions)

---

## What is built today

**Phase 1 — Foundation**

- pnpm monorepo: `apps/api`, `apps/web`, `packages/shared`.
- PostgreSQL 16 via Docker Compose with healthcheck and named volume.
- **Full Prisma schema for all six phases**, not just auth — CBC strands and
  assessments, 8-4-4 exams/marks/grade scales, attendance, fees and M-Pesa
  transactions, report cards, notifications and audit logs.
- Initial migration applied and an idempotent seed for a realistic school.
- API: Swagger, response envelope, global exception filter, DTO validation,
  JWT auth with refresh-token rotation and reuse revocation, account lockout,
  role guard, CSRF double-submit, throttling, helmet, pino logs, CORS.
- Web: login form (React Hook Form + shared Zod), signed session cookie,
  middleware role gate, responsive dashboard shells for all four roles,
  shadcn/UI primitives, TanStack Query provider, Orval-generated API client.
- 8 auth unit tests; both apps typecheck and build.

**Phase 2 — People & structure**

- Paginated/searchable/sortable list endpoints for students, guardians,
  teachers, classes, streams, subjects, academic years and terms, plus a
  read-only `GET /api/users` for linking teacher accounts.
- **Server-side scoping** (`ScopingService`): ADMIN unrestricted; TEACHER sees
  students in classes they teach or are class teacher of, and only those
  classes; PARENT sees linked children; STUDENT sees only their own record.
  Enforced in services (list, detail, import, photo), not just controllers.
- Links: `POST /api/students/:id/guardians`,
  `POST /api/teachers/:id/class-subjects`.
- CSV import (`papaparse`) with a per-row success/error report and a 500-row cap.
- Photo upload (`multer` + `sharp`): 2 MB, JPEG/PNG/WebP, metadata/EXIF stripped
  by re-encoding, then a signed Cloudinary upload.
- Admin DataTable screens (loading/empty/error states) with RHF + shared Zod
  dialogs, a CSV import wizard, student detail tabs (profile/guardians/photo),
  and scoped parent "My children" and teacher "My classes" tables.
- 15 unit tests (8 auth + 7 scoping); API and web typecheck and build.

**Not built yet:** everything in Phases 3–6 ([Roadmap](#roadmap)).

---

## Tech stack

| Layer | Choice | Version |
|---|---|---|
| Runtime | Node.js | 22+ (verified on 24) |
| Package manager | pnpm (via corepack) | 12.21.0 |
| API | NestJS + Express | 11.2.11 |
| ORM | Prisma + `@prisma/adapter-pg` | 7.10.1 |
| Database | PostgreSQL (Docker) | 16 |
| Auth | `@nestjs/jwt`, `passport-jwt`, `argon2` (argon2id) | current |
| Validation (API) | `class-validator` + `class-transformer` | current |
| Validation (web/shared) | Zod | 4.x |
| Docs | `@nestjs/swagger` | 11.x |
| Config / logging | `@nestjs/config` + Joi, `nestjs-pino` + pino | current |
| Web | Next.js App Router + React | 15.5.29 / 19 |
| Styling | Tailwind CSS 4 + shadcn/ui (`base-nova`) | current |
| Server state | TanStack Query | 5.x |
| Forms | React Hook Form + `@hookform/resolvers` | current |
| Dates | `date-fns`, `date-fns-tz` | current |
| API client | Orval (fetch client, tags-split, Zod) | 8.48 |
| Tests | Jest + ts-jest | 29.x |

Tailwind is wired for v4 (`@tailwindcss/postcss`, CSS-first theme). Fonts use the
system stack because the build environment cannot reach Google Fonts.

---

## Prerequisites

- Node.js **22 or newer**
- pnpm **12** (`corepack enable` uses the `packageManager` field)
- Docker with Compose v2
- Ports **3000**, **3001** and **5435** free

---

## Quick start

```bash
# 1. Dependencies (also builds @school-system/shared and generates Prisma client)
corepack enable
pnpm install

# 2. Database
docker compose up -d db
docker compose ps                    # wait for "healthy"

# 3. API environment
cp .env.example apps/api/.env
# Replace every "replace-with-..." value, e.g. with: openssl rand -hex 32

# 4. Web environment (no /api suffix — OpenAPI paths already include /api)
printf 'NEXT_PUBLIC_API_URL=http://localhost:3001\nSESSION_SECRET=%s\n' \
  "$(openssl rand -hex 32)" > apps/web/.env.local

# 5. Schema + data
pnpm prisma migrate dev              # or: pnpm prisma migrate deploy
pnpm seed

# 6. Run (two terminals)
pnpm dev:api                         # http://localhost:3001
pnpm dev:web                         # http://localhost:3000
```

| URL | Purpose |
|---|---|
| `http://localhost:3000` | Web app (redirects to `/login` or your role dashboard) |
| `http://localhost:3001/api` | API base path |
| `http://localhost:3001/api/docs` | Swagger UI |
| `http://localhost:3001/api/docs-json` | OpenAPI document |
| `http://localhost:3001/api/health` | Health check (public) |
| `postgresql://school:school@localhost:5435/school_system` | Database |

The Compose file maps host **5435** to container 5432 because 5432–5434 may
already be in use on a shared machine. If you change it, update
`DATABASE_URL` too.

### Production-style run (no watchers)

```bash
pnpm build
pnpm --filter @school-system/api start        # node dist/main.js
pnpm --filter @school-system/web start        # next start
```

---

## Seeded accounts

All accounts are development-only and created by `apps/api/prisma/seed.ts`.

| Role | Email | Password | Linked record |
|---|---|---|---|
| ADMIN | `admin@mwangaza.ac.ke` | `Admin@1234` | — |
| TEACHER | `teacher@mwangaza.ac.ke` | `Teacher@1234` | Peter Mwangi (TSC) |
| TEACHER | `james.kamau@mwangaza.ac.ke` | `Teacher@1234` | James Kamau (TSC) |
| TEACHER | `esther.chepkoech@mwangaza.ac.ke` | `Teacher@1234` | Esther Chepkoech (BOM) |
| STUDENT | `student@mwangaza.ac.ke` | `Student@1234` | Brian Otieno |
| PARENT | `parent@mwangaza.ac.ke` | `Parent@1234` | Joseph Otieno (guardian) |

Seed contents: 1 school (Mwangaza Academy), 2 academic years, 3 terms (Term 2 is
current), 4 classes with one stream each (PP1, Grade 4, Grade 7, Form 3),
5 subjects, 3 teachers, 10 students, 10 guardians, one TUITION fee structure per
class for Term 1, and both grade scales (12 Kenyan 8-4-4 bands, 4 CBC levels).

---

## Environment variables

`apps/api/.env` is loaded by `@nestjs/config` and by `prisma.config.ts`
(`import 'dotenv/config'`). `apps/web/.env.local` is loaded by Next.

| Variable | App | Required | Default | Notes |
|---|---|---|---|---|
| `NODE_ENV` | api | no | `development` | `development` / `test` / `production` |
| `PORT` | api | no | `3001` | API port |
| `WEB_ORIGIN` | api | no | `http://localhost:3000` | CORS origin, credentials allowed |
| `SWAGGER_ENABLED` | api | no | `true` | `/api/docs` |
| `DATABASE_URL` | api | **yes** | — | `postgresql://user:pass@host:port/db?schema=public` |
| `JWT_ACCESS_SECRET` | api | **yes** | — | ≥32 chars |
| `JWT_ACCESS_TTL` | api | no | `15m` | Access-token lifetime |
| `JWT_REFRESH_SECRET` | api | **yes** | — | ≥32 chars, different from access secret |
| `JWT_REFRESH_TTL` | api | no | `7d` | Also sets cookie max-age |
| `COOKIE_SECURE` | api | no | `false` | Set `true` in production (HTTPS) |
| `DARAJA_*` | api | no | empty | Phase 5 (M-Pesa) |
| `AT_*` | api | no | empty | Phase 5 (Africa's Talking SMS) |
| `CLOUDINARY_*` | api | no | empty | Phase 2 (student photos) |
| `NEXT_PUBLIC_API_URL` | web | **yes** | — | API origin **without** `/api`, e.g. `http://localhost:3001` |
| `SESSION_SECRET` | web | **yes** | — | ≥32 chars; signs the `ss_session` cookie (HMAC-SHA256) |

Never commit `.env` or `.env.local`; both are gitignored. `.env.example` is the
single source of truth for the variable list.

---

## Scripts

### Root

| Command | What it does |
|---|---|
| `pnpm install` | Install workspace; postinstall builds shared and generates Prisma |
| `pnpm dev` | API + web in parallel |
| `pnpm dev:api` / `pnpm dev:web` | One app with watch mode |
| `pnpm build` | Shared → API → web production builds |
| `pnpm test` | API unit tests (Jest) |
| `pnpm typecheck` | All packages, no emit |
| `pnpm seed` | Run the Prisma seed |
| `pnpm migrate` | `prisma migrate dev` (development) |
| `pnpm prisma <args>` | Forward a command to the API's Prisma CLI |
| `pnpm orval` | Regenerate the web API client from `apps/api/openapi.json` |
| `pnpm lint` | Placeholder until ESLint is added (Phase 6) |
| `pnpm db:up` / `pnpm db:down` | Start / stop Postgres |

### API (`apps/api`)

`dev` / `start:dev`, `build`, `start`, `test`, `typecheck`,
`prisma:generate`, `migrate`, `migrate:deploy`, `seed`, `openapi`, `postinstall`.

### Web (`apps/web`)

`dev`, `build`, `start`, `typecheck`, `orval`.

### Contract workflow (Orval is the source of truth)

```bash
pnpm --filter @school-system/api openapi   # boots the API, writes openapi.json
pnpm orval                                 # regenerate endpoints, models, Zod
pnpm typecheck                             # fix any contract drift
```

Never hand-write backend request/response types in the web app.

---

## Architecture

```
Browser (React 19, access token in memory)
   │  same-origin fetch
   ▼
Next.js :3000 ── /api/session/{login,refresh} (BFF) ──► NestJS API :3001
   │  middleware verifies ss_session (HMAC)               │
   │  server components render dashboards                 │  Prisma 7 + pg adapter
   └──────────────────────────────────────────────────────┴──► PostgreSQL 16 :5435
```

```
apps/
  api/
    prisma/            schema, migration, seed
    scripts/           export-openapi.ts
    src/
      auth/            controller, service, repository, JWT, cookies, tests
      common/          envelope, pagination, filter, guards, decorators
      config/          Joi env validation, Swagger config
      health/          public health endpoint
      people/          students (CSV import, photos), guardians, teachers, users
      structure/       classes, streams, subjects, academic years, terms
      scoping/         ScopingService (student/class access rules)
      prisma/          PrismaService + global module
  web/
    src/
      middleware.ts    server-side role gate
      app/             login, (dashboard) admin/teacher/parent pages, session BFF
      components/      auth, dashboard shell, data-table, admin, shadcn/ui
      lib/             session signing, auth context, API client + generated
packages/
  shared/              roles, Kenyan constants, grade bands, Zod schemas
```

### Request lifecycle (API)

1. `helmet`, `cookie-parser`, CORS.
2. Global `ThrottlerGuard` (20 req/min per IP).
3. Global `JwtAuthGuard` (skipped by `@Public()`).
4. Global `RolesGuard` (enforced by `@Roles(...)`).
5. Global `CsrfGuard` (only routes marked `@CsrfProtected()`).
6. `ValidationPipe` — `whitelist`, `forbidNonWhitelisted`, transform.
7. Controller → service → **repository** → Prisma.
8. `ResponseEnvelopeInterceptor` wraps success.
9. `AllExceptionsFilter` formats errors and maps Prisma codes.

### Response envelope

```jsonc
// success
{ "success": true, "data": { }, "meta": { "page": 1, "limit": 20, "total": 42, "totalPages": 3 } }

// error
{ "success": false, "error": { "code": "VALIDATION_ERROR", "message": "Validation failed", "details": ["property role should not exist"] } }
```

Error codes: `VALIDATION_ERROR`, `UNAUTHORIZED`, `FORBIDDEN`, `NOT_FOUND`,
`CONFLICT`, `TOO_MANY_REQUESTS`, `ACCOUNT_LOCKED`, `CSRF_TOKEN_INVALID`,
`INTERNAL_ERROR`. Prisma `P2002` → 409, `P2025` → 404, `P2003` → 409; stack
traces are never returned.

### Repository boundary (non-negotiable)

Only `*.repository.ts` files may import `PrismaService` or generated Prisma types
for queries. Controllers and services never do. Repositories expose domain types
(`UserRecord`), not Prisma models, so services are unit-testable with in-memory
fakes — see `apps/api/src/auth/user.repository.ts` and
`apps/api/src/auth/auth.service.spec.ts`.

---

## Authentication and sessions

Tokens: **access 15 minutes** (JWT, bearer), **refresh 7 days** (JWT with a
unique `jti`, httpOnly cookie). Passwords are hashed with **argon2id**.
Failed logins: 5 attempts → account locked for 15 minutes.

```
Login
  Browser → POST /api/session/login (Next BFF)
  BFF     → POST /api/auth/login
  API     → verifies argon2, issues access + refresh, sets ss_refresh (httpOnly)
            and ss_csrf (readable) cookies, stores a hash of the refresh token
  BFF     → forwards Set-Cookie, signs ss_session (HMAC, role/email/sub, 7d,
            httpOnly), returns { accessToken, user }
  Browser → keeps accessToken in React memory only

Every API request
  Authorization: Bearer <accessToken> → JwtStrategy → request.user

Page navigation
  middleware.ts verifies ss_session signature/expiry and compares the URL prefix
  with the session role; dashboard layout re-checks server-side

Reload / expiry
  AuthProvider → POST /api/session/refresh → BFF forwards cookies + x-csrf-token
  API rotates the refresh token (reuse revokes the session) and returns a new
  access token; BFF re-signs ss_session

Logout
  BFF DELETE /api/session → API revokes the refresh hash and clears cookies,
  BFF clears ss_session
```

Why a BFF: the refresh token never reaches browser JavaScript, CSRF is handled
server-side, and the signed `ss_session` cookie lets middleware make routing
decisions before rendering. The API remains the authority — every endpoint
re-checks the bearer token and role.

**CSRF**: refresh and logout require `x-csrf-token` to match the `ss_csrf`
cookie (double-submit, timing-safe compare).

**Cookie paths**: `ss_refresh` and `ss_session` use path `/` so the web BFF can
receive them. In development `localhost` cookies are shared across ports; in
production serve the web and API on the same site or configure a cookie domain.

---

## API reference

All routes are under `/api`. Swagger is authoritative for request/response
schemas.

| Method | Path | Auth | Throttle | Notes |
|---|---|---|---|---|
| GET | `/api/health` | public | global | Liveness probe |
| POST | `/api/auth/login` | public | **5/min** | Returns access token; sets cookies |
| POST | `/api/auth/refresh` | cookie + CSRF | global | Rotates refresh token |
| POST | `/api/auth/logout` | cookie + CSRF | global | Revokes session, clears cookies |
| POST | `/api/auth/register` | bearer, **ADMIN** | global | No public signup |
| POST | `/api/auth/change-password` | bearer | global | Revokes the refresh session |
| POST | `/api/auth/forgot-password` | public | **5/min** | Logs token; returns it outside production |
| GET | `/api/auth/me` | bearer | global | Current user |
| GET | `/api/auth/csrf` | public | global | Cookie/header names for clients |

Phase 2 resources (all under `/api`, bearer auth; lists return `{ data, meta }`):

| Resource | Endpoints | Who |
|---|---|---|
| Students | `GET /students`, `GET /students/:id`, `POST /students`, `PATCH /students/:id`, `DELETE /students/:id` (soft), `POST /students/:id/guardians`, `POST /students/import`, `POST /students/:id/photo` | reads scoped by role; writes ADMIN |
| Guardians | `GET/POST /guardians`, `GET/PATCH/DELETE /guardians/:id` | ADMIN |
| Teachers | `GET/POST /teachers`, `GET/PATCH/DELETE /teachers/:id` (soft), `POST /teachers/:id/class-subjects` | ADMIN |
| Classes | `GET/POST /classes`, `GET/PATCH/DELETE /classes/:id` | read ADMIN/TEACHER (scoped), write ADMIN |
| Streams | `GET/POST /streams`, `GET/PATCH/DELETE /streams/:id` | read ADMIN/TEACHER (scoped), write ADMIN |
| Subjects | `GET/POST /subjects`, `GET/PATCH/DELETE /subjects/:id` | read ADMIN/TEACHER, write ADMIN |
| Academic years | `GET/POST /academic-years`, `GET/PATCH/DELETE /academic-years/:id` | read ADMIN/TEACHER, write ADMIN |
| Terms | `GET/POST /terms`, `GET /terms/current`, `GET/PATCH/DELETE /terms/:id` | read ADMIN/TEACHER, write ADMIN |
| Users | `GET /users` (read-only, filter by `role`) | ADMIN |

Shared list query: `page` (default 1), `limit` (default 20, max 100), `search`
(case-insensitive), `sortBy` (whitelisted per resource), `sortOrder`
(`asc`/`desc`). Filters are resource specific (`classId`, `level`, `gender`,
`relationship`, `employmentType`, `academicYearId`, `isCurrent`).

Login request/response:

```bash
curl -s -c cookies.txt -X POST http://localhost:3001/api/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"email":"admin@mwangaza.ac.ke","password":"Admin@1234"}'
```

```jsonc
{
  "success": true,
  "data": {
    "accessToken": "eyJ...",
    "expiresIn": 900,
    "user": { "id": "...", "email": "admin@mwangaza.ac.ke", "phone": "+254720123457",
              "role": "ADMIN", "isActive": true, "lastLoginAt": "..." }
  }
}
```

The registration DTO accepts `{ email, phone, password, role }`; phone numbers are
normalized to `+2547XXXXXXXX` / `+2541XXXXXXXX`.

---

## Data model

UUID primary keys, `createdAt`/`updatedAt`, indexes on every foreign key and
search field. Soft delete only on `Student` and `Teacher` (`isDeleted`).

| Group | Models |
|---|---|
| School | `School`, `GradeScale` |
| Identity | `User` (role, lockout, refresh hash, reset token) |
| People | `Student`, `Guardian`, `StudentGuardian`, `Teacher` |
| Structure | `AcademicYear`, `Term`, `Class`, `Stream`, `Subject`, `ClassSubject` |
| CBC | `Strand`, `SubStrand`, `LearningOutcome`, `CbcAssessment` |
| 8-4-4 | `Exam`, `Mark`, `GradeScale` |
| Attendance | `Attendance` (daily register only) |
| Fees | `FeeStructure`, `FeeInvoice`, `FeePayment`, `MpesaTransaction` |
| Reporting | `ReportCard`, `Notification`, `AuditLog` |

Important constraints:

- `Student.admissionNumber`, `Student.upi`, `Student.knecIndexNumber`,
  `Teacher.tscNumber`, `Teacher.nationalId`, `Subject.code` — unique.
- `Term (academicYearId, termNumber)`, `Class (academicYearId, level, name)`,
  `Stream (classId, name)`, `ClassSubject (classId, subjectId)` — unique.
- `Attendance (studentId, date)` — one mark per student per day.
- `Mark (examId, studentId)`, `CbcAssessment (studentId, learningOutcomeId, termId)`,
  `FeeInvoice (studentId, termId)`, `ReportCard (studentId, termId)` — unique.
- `Exam` is unique per `(termId, subjectId, classId, name)`.

Additions made in Phase 1 beyond the original model list, needed by later phases:
`Student.userId` and `Guardian.userId` (nullable, unique — links login accounts
for scoping), `FeeInvoice.invoiceNumber` (M-Pesa account reference) and the
`MpesaTransaction` table (callback reconciliation).

---

## Grading model

`School.gradeScaleType` selects the flow; `GradeScale.type` stores the bands as
JSON per school.

**8-4-4** (`CBC_8_4_4`) — seeded default:

| Score | Grade | Points |
|---|---|---|
| 80–100 | A | 12 |
| 75–79 | A- | 11 |
| 70–74 | B+ | 10 |
| 65–69 | B | 9 |
| 60–64 | B- | 8 |
| 55–59 | C+ | 7 |
| 50–54 | C | 6 |
| 45–49 | C- | 5 |
| 40–44 | D+ | 4 |
| 35–39 | D | 3 |
| 30–34 | D- | 2 |
| 0–29 | E | 1 |

**CBC** — `EE` / `ME` / `AE` / `BE` per learning outcome, plus a seeded
performance-level descriptor scale for reporting.

Marks and CBC assessments are schema-ready; grade computation, ranking, report
cards and PDFs arrive in Phase 4. Grade bounds are inclusive and must be tested
at edges (79.5, 80, 29.5, 30).

Time: all business dates use `Africa/Nairobi` (attendance "today" is the Kenyan
date). Money: `Decimal`, currency `KES` only.

---

## Web app routes and permissions

| Route | Who | Behaviour |
|---|---|---|
| `/` | anyone | Redirects to the session role's dashboard or `/login` |
| `/login` | anonymous | Form; redirects authenticated users to their dashboard |
| `/admin` | ADMIN | School-wide shell |
| `/teacher` | TEACHER | Teacher shell |
| `/student` | STUDENT | Student shell |
| `/parent` | PARENT | Parent shell |
| `/api/session/*` | same origin | BFF login/refresh/logout (not public API) |

`middleware.ts` matches `/admin/:path*`, `/teacher/:path*`, `/student/:path*`,
`/parent/:path*`, verifies the signed cookie, and redirects a wrong-role user to
their own home. Dashboard layouts verify the session again. **The API enforces
authorization independently** — the middleware is UX, not security.

---

## Testing and verification

```bash
pnpm test                    # API unit tests (15)
pnpm typecheck               # api + web + shared
pnpm build                   # all packages
pnpm --filter api openapi    # contract export (requires DB)
```

Verification (last run):

| Check | Result |
|---|---|
| Unit tests | **15/15 pass** — 8 auth + 7 scoping (teacher out-of-scope read denied, parent reading another child denied, scoped list, admin unrestricted, archived → 404) |
| TypeScript | API, web and shared clean (`strict`, `noImplicitAny`, `strictNullChecks`) |
| Builds | `nest build` and `next build` (18 routes, middleware 141 kB) |
| Contract | `openapi.json` re-exported; Orval regenerated for all nine resources |
| Live smoke | admin list 10; create 201 → patch 200 → delete 200 and archived hidden; teacher GET out-of-scope **403**; parent list 1, own child 200, other child **403**; photo without file 400, non-image 400; Swagger exposes `/api/students/import` and 5 student paths |
| CSV import | 50 rows → **47 imported, 3 failed** with row-level reasons (missing `lastName`, unknown gender, duplicate admission number); imported rows removed afterwards |
| Manual browser click-through | **Not performed** |

### Manual checklist

Phase 1:

1. `http://localhost:3000` redirects to `/login`.
2. Sign in as each seeded role → each lands on its own dashboard.
3. Wrong password → visible error; 5 failures → lockout message.
4. DevTools → `ss_refresh` and `ss_session` are httpOnly; `ss_csrf` is readable.
5. As TEACHER, open `/admin` → redirected to `/teacher`.
6. Sign out → `/admin` redirects to `/login`.
7. Reload a dashboard → session survives; no token in localStorage.

Phase 2 (start the API before the web app):

8. `/admin/students` lists the 10 seeded students with search and paging;
   loading, empty-search and error states are visible on the table.
9. Create a student in Grade 4 North, edit the class, then archive it and
   confirm it disappears (soft delete).
10. Open a student → profile, guardians and photo tabs render; link a guardian
    and see it listed with the Primary badge.
11. `/admin/students/import` → upload
    `apps/api/test/fixtures/students-import.csv` → report shows 50 total,
    47 imported and 3 failed with reasons.
12. Teacher login → `/teacher/classes` shows only Peter Mwangi's classes; a
    Grade 4 student returns 403 from `GET /api/students/:id`.
13. Parent login → `/parent/children` shows only the linked child.
14. `/admin/staff`, `/admin/classes` (Classes/Streams tabs), `/admin/subjects`
    and `/admin/academic-years` (Years/Terms tabs) list seeded data; create,
    edit and delete work and the "current" flag moves to the chosen record.
15. Photo upload without `CLOUDINARY_*` configured → clear 503 message; with
    credentials set, the stored image has no EXIF metadata.
16. `/api/docs` documents every Phase 2 endpoint.

---

## Roadmap

| Phase | Scope | Status |
|---|---|---|
| **1. Foundation** | Monorepo, DB, full schema, seed, auth, roles, Swagger, shells | **Done** |
| **2. People & structure** | CRUD for students/guardians/teachers/classes/streams/subjects/years/terms; teacher & parent scoping enforced server-side; CSV student import; Cloudinary photos with EXIF stripping; shadcn DataTable pages; student detail tabs | **Done — awaiting approval** |
| **3. Attendance** | Daily register with `(studentId, date)` upsert; parent/teacher views; class and student reports; ABSENT creates a notification | Next |
| **4. Exams & results** | 8-4-4 marks with server-computed grades/points; CBC assessments; ranking; two report-card templates; Puppeteer PDFs; publish/lock; parent visibility gated on `isPublished` | Planned |
| **5. Fees & notifications** | Fee structures/invoices/payments; Daraja STK push + callback reconciliation; Africa's Talking SMS behind a provider interface; admin charts; audit viewer; fee statement PDF | Planned |
| **6. Hardening** | E2E tests, frontend form tests, multi-stage Dockerfiles, Caddy production compose, GitHub Actions CI, deployment/backup guide, Kenya DPA note | Planned |

Each phase ends with the definition of done from the brief, a hand-test
checklist, and an explicit stop for approval.

---

## Continuing tomorrow

This section is the handoff brief; `AGENTS.md` holds the short version that is
loaded automatically.

### Session start

1. Read this README and `AGENTS.md`.
2. `docker compose up -d db` and confirm `docker compose ps` shows healthy.
3. If `node_modules` is missing: `pnpm install` (runs Prisma generate).
4. If the database is new: `pnpm prisma migrate deploy && pnpm seed`
   (otherwise skip; the seed is idempotent but will re-hash passwords).
5. Baseline: `pnpm test`; optionally `pnpm typecheck`.
6. Confirm no stray server holds 3001 (`ss -ltnp | grep 3001`). Start the API
   **before** the web app — Next will silently take 3001 if 3000 is busy.

### Next task — Phase 3 (attendance) only, after explicit approval

Phase 2 is complete: see [What is built today](#what-is-built-today) and the
verification table above. Phase 3 backend order:

1. `AttendanceRepository` — one row per student per day, upsert on
   `(studentId, date)`; queries by class + date and by student + date range.
2. `AttendanceService` on top of `ScopingService`: TEACHER may mark only
   assigned classes, ADMIN any class, PARENT/STUDENT read-only and scoped.
3. `POST /attendance/register` (bulk upsert for a class/day), `GET /attendance`
   (`classId` + `date`), `GET /attendance/student/:id` (range), plus class and
   student summary reports.
4. ABSENT marks create an in-app `Notification` for linked guardians (SMS via a
   provider interface in Phase 5).
5. Tests: teacher cannot mark another class; parent can only read their child.

Frontend: teacher daily register (class + date picker, PRESENT/ABSENT/LATE/
EXCUSED), parent and student attendance history, class attendance summary.

**Done when:** the register is idempotent per student/day; scoping tests pass;
Orval regenerated; web compiles; hand-test checklist written.

Do not start Phase 4 work in the same session.

---

## Troubleshooting

| Symptom | Cause / fix |
|---|---|
| `EADDRINUSE :::3001` | A stray `next start` grabbed 3001 because 3000 was busy. Find it with `ss -ltnp \| grep 3001`, kill it, start the API first. |
| `429 Too Many Requests` during curl loops | Global limit is 20/min per IP. Wait ~60s or restart the API (in-memory counters). |
| `Could not find a production build in '.next'` | Run `pnpm --filter @school-system/web build`; `.next/BUILD_ID` must exist. |
| `Cannot find module '../generated/prisma/client'` | `pnpm --filter @school-system/api prisma:generate`. |
| Prisma CLI cannot find `DATABASE_URL` | Prisma 7 does not auto-load `.env`; `prisma.config.ts` imports `dotenv/config`. Run from `apps/api` or via `pnpm prisma ...`. |
| API `dist` missing `common/duration.js` | Incremental build + `deleteOutDir` skipped unchanged files. `incremental` is disabled in `tsconfig.build.json` — keep it off. |
| `tsx` script that boots Nest exits silently | tsx/esbuild does not emit decorator metadata. Use ts-node for OpenAPI export (`pnpm --filter api openapi`). |
| pnpm install fails with `ERR_PNPM_IGNORED_BUILDS` | pnpm 12 uses `allowBuilds` in `pnpm-workspace.yaml`; approve the named package or run `pnpm approve-builds`. |
| Google Fonts build error | Fonts use the system stack; do not re-introduce `next/font/google` without network access. |
| Login works via API but not web | Check `NEXT_PUBLIC_API_URL` has **no** `/api`, and `SESSION_SECRET` is ≥32 chars. |

---

## Known limitations and deliberate decisions

- **Integration SDKs are deliberately not installed yet**: Daraja, Africa's
  Talking, Cloudinary, Puppeteer and Recharts arrive with the phases that use
  them (2, 4, 5).
- **No public signup**; admins create accounts. There is no password-reset
  completion endpoint yet (Phase 1 only issues/logs a token).
- **No ESLint/Prettier enforcement**, CI, Docker images or production compose
  until Phase 6; `pnpm lint` is a placeholder.
- **Single-school deployment** in practice, but `School` is a table and
  `gradeScaleType` is per school.
- **Daily attendance only** — no per-lesson registers.
- **Fees**: one invoice per student per term (`@@unique(studentId, termId)`) to
  keep bulk generation idempotent.
- **Access tokens can be byte-identical within the same second** (same claims);
  refresh tokens always differ because of `jti`.
- **Rate limits are per IP** and in-memory, so they reset on restart and do not
  coordinate across replicas.
- **Refresh cookie path is `/`** so the web BFF can read it. Secure in
  production requires HTTPS (`COOKIE_SECURE=true`).
- The smoke suite reported 19/21 during development; the two failures were
  harness assertions (identical same-second access tokens, and logout returning
  403 because CSRF cookies were already cleared), both re-verified afterwards.
- Extra schema fields (`Student.userId`, `Guardian.userId`,
  `FeeInvoice.invoiceNumber`, `MpesaTransaction`) were added intentionally for
  later phases.
- **Photo upload needs Cloudinary credentials.** Without `CLOUDINARY_*` in
  `apps/api/.env`, `POST /api/students/:id/photo` returns 503 after still
  validating the image and stripping metadata. The signed upload is implemented
  with `node:crypto` + `fetch`, so the `cloudinary` SDK is not installed.
- `GET /api/users` is read-only; accounts are still created with
  `POST /api/auth/register`. Teacher creation requires an existing TEACHER
  account, and a student's stream must belong to the chosen class.
- CSV import requires `className` (or `classId`), caps at 500 rows, and reports
  duplicate admission numbers / UPIs per row instead of failing the batch.
- Deleting a guardian cascades their student links and hard-deletes the row;
  students and teachers are soft-deleted and excluded from lists.
- Deleting a class that still has students is blocked by the FK (409).

---

## Team and responsibilities

Minimum viable team. One person may hold several roles.

| Role | Responsibility | Needed by |
|---|---|---|
| Product owner / school administrator | Approves each phase, confirms school policy (grading mode, fee rules, term dates), performs UAT | All phases |
| Backend engineer | NestJS modules, repositories, DTOs, scoping, payments/SMS integration, tests | All phases |
| Frontend engineer | Next.js routes, DataTables, forms, dashboards, report previews | All phases |
| QA engineer | Manual checklists per phase, E2E and form tests, regression | Phases 2–6 |
| DevOps engineer | Dockerfiles, Caddy/TLS, CI, backups, restore drills | Phase 6 (can be shared) |
| Design (optional) | Review shadcn-based screens, mobile at 375 px | Phases 2–5 |

### Permission matrix

`ADMIN` is unrestricted. Server-side scoping is the source of truth; the table
shows what exists **today** and what each phase must add.

| Capability | ADMIN | TEACHER | STUDENT | PARENT | Status |
|---|---|---|---|---|---|
| Sign in, view own dashboard | ✓ | ✓ | ✓ | ✓ | Implemented |
| Create user accounts | ✓ | — | — | — | Implemented |
| CRUD students/guardians/staff/structure | ✓ | — | — | — | Implemented |
| Read students in own classes | ✓ | scoped | — | — | Implemented |
| Read own / linked children | ✓ | — | self | linked | Implemented |
| Mark daily attendance | ✓ | assigned classes | — | — | Phase 3 |
| View attendance | ✓ | scoped | self | linked | Phase 3 |
| Enter marks/CBC assessments | ✓ | assigned classes | — | — | Phase 4 |
| Publish/lock exams | ✓ | — | — | — | Phase 4 |
| View published results | ✓ | scoped | self | linked | Phase 4 |
| Fees, invoices, payments | ✓ | — | read self | read linked | Phase 5 |
| Audit log viewer | ✓ | — | — | — | Phase 5 |

---

## Security and data protection

- argon2id password hashing; uniform "invalid email or password" responses;
  lockout after 5 failures.
- Refresh tokens are stored only as argon2 hashes and rotated on every refresh;
  reuse revokes the session.
- Access token in memory; refresh token in an httpOnly, SameSite=Strict cookie;
  CSRF double-submit on cookie-authenticated routes.
- Backend RBAC on every request; never trust the frontend.
- Helmet, strict CORS with credentials, whitelist validation, rate limiting.
- pino redacts authorization, cookie, set-cookie and password fields.
- Student photos: EXIF stripping is required in Phase 2 (privacy).
- This system holds **children's personal data**. The Kenya Data Protection Act
  (2019) applies: collect the minimum, restrict access by role, retain only as
  long as needed, log access (the `AuditLog` table exists), and document
  retention/backup handling in Phase 6.

---

## Conventions

- **Conventional commits**, one logical feature per commit
  (`feat(people): add CSV student import`, `fix(auth): rotate refresh token on reuse`).
- One Nest module per feature; one folder per feature in the web app.
- DTOs + validation on every endpoint (`class-validator` on the API, Zod on the
  web, shared schemas where possible). No raw `@Body()`.
- Backend permissions are authoritative; scope checks live in services.
- Orval is the source of truth for API types — regenerate, never hand-write.
- Dates in `Africa/Nairobi`; money as `Decimal` in KES; Kenyan phones in E.164.
- Small functions and files (justify anything over ~300 lines).
- Every screen has loading, empty and error states; mobile at 375 px.
- No secrets or `.env` files in git.

---

**Owner:** project owner (`kenneth`).
**Repository:** private, local git (Phases 1–2).
**Next milestone:** Phase 3 — Attendance, after explicit approval.
