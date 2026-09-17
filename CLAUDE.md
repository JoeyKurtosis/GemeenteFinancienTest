# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**Gemeentefinanciën** is a dashboard that provides insight into the income and expenditure of local government. It also contains information about municipal taxes, debts, and housing costs.

## Commands

### Frontend (run from `frontend/`)

```bash
npm install          # Install dependencies
npm run dev          # Dev server on localhost:5173
npm run build        # Production build (tsc + vite build)
```

### Backend (run from `backend/`)

```bash
python3 -m venv venv && source venv/bin/activate
pip install -r requirements.txt

python manage.py migrate       # Apply migrations
python manage.py runserver     # Dev server on localhost:8000
python manage.py createsuperuser
```

The only automated tests are the formula layer's, on Django's own runner:

```bash
python manage.py test iv3.tests        # expression evaluator + measure parity
python manage.py check_query_budget     # fails if a chart endpoint grew an N+1
```

Run both after touching `queries.py` or adding a `Measure`. The frontend has no tests, and
`npm run build` currently fails its `tsc` step on ~46 pre-existing type errors.

## Architecture

### Frontend

**Stack:** React 19 + Vite + TanStack Router (file-based) + Tailwind CSS 4 + Untitled UI + React Aria Components

**Key patterns:**

- `src/routes/` — File-based routing via TanStack Router. Routes auto-generate `routeTree.gen.ts`. The `_layout.tsx` route provides the sidebar + page header layout.
- `src/features/` — Feature-based modules. Each feature owns its API functions, context, hooks, and components. Don't mix feature concerns.
- `src/components/base/` — Untitled UI base components (Button, Input, Select, etc.).
- `src/components/application/` — Untitled UI application components (sidebar navigation, tabs, modals, etc.).
- `src/components/layout/` — App layout components (AppSidebar, PageHeader).
- `src/hooks/` — Shared custom hooks (use-route-metadata, use-breakpoint, etc.).
- `src/providers/` — React context providers (ThemeProvider, RouteProvider).

**Route context:** Each route defines a `context()` function returning metadata (title, actions, breadcrumbs). The layout reads this via `useRouteMetadata()` and renders the `PageHeader`.

**API calls:** Use `fetch` with `credentials: 'include'`. The Vite dev proxy forwards `/api` and `/media` to `http://127.0.0.1:8000`.

**Contexts:**

- `AuthProvider` — Authentication state and current user session (`features/auth/`)
- `ThemeProvider` — Light/dark/system theme management (`providers/theme-provider.tsx`)

### Backend

**Stack:** Django 5 + Django REST Framework + SQLite (dev) + Session-based auth

**App structure:**

- `config/` — Django settings and root URL router.
- `users/` — Authentication: UserProfile, PasswordResetToken.
- `support/` — Support requests and attachments.
- `iv3/` — The dashboard data: models, the query layer every chart reads, and the two data commands.

**`DEVMODE` (start here for local work):** the deployment-wide switch between "everything local"
and "everything on AWS", read from `DEVMODE` in the environment and defaulting to `True`, so a
fresh checkout runs offline. It is separate from `DEBUG`: `DEBUG` controls what Django reveals
in a response, `DEVMODE` controls whether the process talks to AWS at all. Under `DEVMODE` the
`default` database is the local `db.sqlite3`, mail goes to the console, and 2FA is off. With
`DEVMODE=False` — what the test server sets — `settings.py` resolves `test/iv3/PostgreSQL` from
Secrets Manager at import, so every process needs `secretsmanager:GetSecretValue` on it and dies
at startup without it.

**The iv3 data (important):** the dashboard is served entirely from the app database and never
connects to the IV3 warehouse. The warehouse is a *build-time input*: it holds a 151M-row fact
table that `sync_iv3_summary` aggregates down to ~6.4k `Iv3Summary` rows plus the gemeenten,
inwoners and taakveld names — about 17k rows in total, shipped as a 3.6MB fixture.

```bash
# Deploy (no warehouse, no network):
python manage.py migrate && python manage.py load_iv3_data

# Refresh the data — developer only, and only when CBS publishes, roughly once a year.
# Runs where the warehouse is reachable, i.e. inside AWS; credentials come from the
# Secrets Manager secret, so the instance/task role needs GetSecretValue on it:
AWS_REGION=eu-central-1 IV3_DB_SECRET_NAME=dev/iv3/PostgreSQL \
    python manage.py sync_iv3_summary
python manage.py dumpdata iv3 --indent 0 --output iv3/fixtures/iv3_data.json.gz
git commit iv3/fixtures/iv3_data.json.gz
```

From a laptop there is no instance role, so Secrets Manager is out of reach and the
credentials go in `.env` as plaintext instead — `IV3_DB_HOST`, `IV3_DB_USER`,
`IV3_DB_PASSWORD`, `IV3_DB_NAME`, `IV3_DB_PORT`. `_HOST` and `_USER` together are the switch:
set, they win over `IV3_DB_SECRET_NAME` in the same file and nothing calls AWS.

`grep -rn 'connections\["iv3"\]'` must only ever match `sync_iv3_summary.py` — that is the
invariant that keeps the warehouse off the request path. Setting `IV3_DB_*` in a deployed
environment is harmless: `settings.py` leaves the `iv3` alias unresolved and never opens it,
and only `sync_iv3_summary` connects, so no web process ever calls Secrets Manager.

**Assistant (`chat/`):** Django is the public same-origin gateway to the JAH Answer
Engine. `ANSWER_ENGINE_BASE_URL` selects the deployment and `ANSWER_ENGINE_PACK` selects the
governed domain pack (normally `kurtosis-gf`). Development defaults to the shared test engine;
production deliberately has no URL default and returns 503 until it is configured.

`POST /api/chat/` validates the browser's question and selected `GM####` municipality, forces
the configured pack and Dutch language, and passes the upstream SSE stream through unchanged.
The browser keeps and resends `resolved_context`, `answer_ref`, and suggestion `alternative`
tokens as opaque values. `GET /api/chat/capabilities/` supplies the empty-thread starter
questions for the selected municipality. Both endpoints allow anonymous access; throttles key
signed-in users by account and anonymous users by client IP.

**Email:** Amazon SES over its SMTP endpoint, through `config.email.SesSmtpEmailBackend`.
`EMAIL_SECRET_NAME` drives the whole thing and its presence is the switch — unset, everything
prints to the console and nothing reaches AWS. `DEVMODE` blanks it before anything reads it, so
under `DEVMODE` the console backend is forced no matter what the environment holds. It names an
AWS secret holding `smtp_server`,
`smtp_port`, `smtp_username`, `smtp_password` and an optional `from_email` (which must sit under
a verified SES identity; without it, `DEFAULT_FROM_EMAIL` is used). The secret is read on the
first send, never at settings import, so no worker pays a Secrets Manager call for mail it may
never send — the instance/task role does need `GetSecretValue` on it.

```bash
EMAIL_SECRET_NAME=AWS_SES_SMTP python manage.py send_test_email you@example.com
```

`users/email.py` logs send failures and never raises: mail is never fatal to a login or reset
request, but a bad secret or an unverified From domain has to show up in the logs.

**Two-factor auth:** `TWO_FACTOR_ENABLED` in `settings.py` is deployment-wide, not per-user, and
is `not DEVMODE` — on wherever `DEVMODE=False`. Every login then answers 202 `requires_2fa` and
mails a six-digit code, valid for `TWO_FACTOR_CODE_EXPIRY_MINUTES` (10, in `users/views.py`),
before a session is created. It only works where mail actually goes out — without a working
`EMAIL_SECRET_NAME` the code is printed to the server console instead, which locks everyone out.

Turning it off is not a full bypass: `users/views.py` reads `TWO_FACTOR_ENABLED or not
email_verified`, so an address that was never confirmed still gets the challenge. Under
`DEVMODE` the console backend prints the code to the `runserver` terminal, so that path stays
completable locally.

**Auth endpoints** (`/api/auth/`):
- `POST /api/auth/login/` — Login by email + password
- `POST /api/auth/logout/` — Clear session
- `GET /api/auth/me/` — Current user info
- `POST /api/auth/signup/` — Register new account
- `POST /api/auth/password-reset/request/` — Request password reset email
- `POST /api/auth/2fa/verify/` — Verify the emailed code (only reachable when `TWO_FACTOR_ENABLED`)
- `POST /api/auth/2fa/resend/` — Resend the code

## Styling

Uses **Untitled UI** component library with React Aria Components foundation. All files use **kebab-case** naming. All imports from `react-aria-components` must be prefixed with `Aria*` (e.g. `Button as AriaButton`). Use semantic color classes (`text-primary`, `bg-secondary`, `border-brand`) instead of raw Tailwind colors. See `frontend/CLAUDE.md` for the full component and color reference.

## Important Notes

- `SECRET_KEY`, `DEBUG` and `DEVMODE` all read from the environment (`.env`, via `load_dotenv`), each with a development-friendly default — so a fresh checkout runs with no `.env` at all. See `.env.example` for the full set of keys.
- When adding a new route, add the file under `src/routes/` and let TanStack Router auto-generate the tree (run `npm run dev` to trigger generation).
- When adding a new feature, follow the existing pattern: create a `features/<name>/` directory with `api.ts`, `context/`, `components/`, and `index.ts`.
- Dashboard is public (no auth required). Login is available via the sidebar profile card or `/login`.
