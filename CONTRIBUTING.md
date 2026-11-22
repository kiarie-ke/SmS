# Contributing

Thanks for your interest in contributing to the School System. Please open an
issue first to discuss bugs, significant changes, or new features. Keep pull
requests focused and consistent with the project's current scope.

## Development setup

See the [README quick start](README.md#quick-start) for the full setup,
including environment variables and database configuration. In brief:

1. Install Node.js 22+, Docker Compose v2, and pnpm 12.
2. Run `corepack enable` and `pnpm install`.
3. Configure local API and web environment files as described in the README.
   Never commit these files or put real credentials in examples.
4. Start PostgreSQL with `docker compose up -d db`.
5. Apply migrations and load development data with
   `pnpm prisma migrate deploy && pnpm seed`.
6. Start the API first with `pnpm dev:api`, then start the web app with
   `pnpm dev:web` in another terminal.

Use synthetic data only. Do not copy real student, guardian, staff, financial,
or other personal information into development fixtures, issues, screenshots,
logs, or pull requests.

## Before opening a pull request

Run the checks relevant to your change:

```bash
pnpm test
pnpm typecheck
pnpm build
```

For API contract changes, also regenerate the OpenAPI contract and web client:

```bash
pnpm --filter @school-system/api openapi
pnpm orval
pnpm typecheck
```

Do not edit files under `apps/web/src/lib/api/generated` by hand; regenerate
them from the API contract.

## Project conventions

- Follow the repository boundary: Prisma queries belong in repository files,
  not controllers or services.
- Validate API inputs with DTOs and enforce permissions in the backend.
- Keep API responses in the existing success/error envelope.
- Use `Africa/Nairobi` for date logic and KES for school money.
- Add or update focused tests for behavior you change.
- Do not add a new feature phase or broaden an agreed issue without discussing
  it with the project owner.
- Never commit `.env` files, passwords, API keys, tokens, database dumps, or
  personal data. Use environment variables for local secrets.

## Branches and commits

Create a branch from the latest `main`, for example:

```text
feat/123-weekly-timetable
fix/456-attendance-filter
```

Use [Conventional Commits](https://www.conventionalcommits.org/) for commit
messages, such as `feat(operations): add timetable filters` or
`fix(attendance): validate register date`.

## Pull requests

In your pull request, explain the problem and solution, link the related issue,
and include screenshots for visible UI changes. Mention database migrations or
API contract changes, and report which checks you ran. Before requesting
review, ensure the change is focused, generated API code is up to date, and
there are no secrets or real personal data in the diff.
