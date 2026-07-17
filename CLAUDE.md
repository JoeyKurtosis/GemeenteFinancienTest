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

There are no automated tests configured in this project.

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

**The iv3 data (important):** the dashboard is served entirely from the app database and never
connects to the IV3 warehouse. The warehouse is a *build-time input*: it holds a 151M-row fact
table that `sync_iv3_summary` aggregates down to ~6.4k `Iv3Summary` rows plus the gemeenten,
inwoners and taakveld names — about 17k rows in total, shipped as a 3.6MB fixture.

```bash
# Deploy (no warehouse, no network):
python manage.py migrate && python manage.py load_iv3_data

# Refresh the data — developer only, needs IV3_DB_* pointed at the warehouse.
# Only when CBS publishes, roughly once a year:
python manage.py sync_iv3_summary
python manage.py dumpdata iv3 --indent 0 --output iv3/fixtures/iv3_data.json.gz
git commit iv3/fixtures/iv3_data.json.gz
```

`grep -rn 'connections\["iv3"\]'` must only ever match `sync_iv3_summary.py` — that is the
invariant that keeps the warehouse off the request path. Never set `IV3_DB_*` in production.

**Auth endpoints** (`/api/auth/`):
- `POST /api/auth/login/` — Login by email + password
- `POST /api/auth/logout/` — Clear session
- `GET /api/auth/me/` — Current user info
- `POST /api/auth/signup/` — Register new account
- `POST /api/auth/password-reset/request/` — Request password reset email

## Styling

Uses **Untitled UI** component library with React Aria Components foundation. All files use **kebab-case** naming. All imports from `react-aria-components` must be prefixed with `Aria*` (e.g. `Button as AriaButton`). Use semantic color classes (`text-primary`, `bg-secondary`, `border-brand`) instead of raw Tailwind colors. See `frontend/CLAUDE.md` for the full component and color reference.

## Important Notes

- Django `DEBUG=True` and the secret key are hardcoded in `settings.py` — environment-agnostic config is not yet set up.
- When adding a new route, add the file under `src/routes/` and let TanStack Router auto-generate the tree (run `npm run dev` to trigger generation).
- When adding a new feature, follow the existing pattern: create a `features/<name>/` directory with `api.ts`, `context/`, `components/`, and `index.ts`.
- Dashboard is public (no auth required). Login is available via the sidebar profile card or `/login`.
