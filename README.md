# Gemeentefinanciën

Dashboard over inkomsten, uitgaven, belastingen en schulden van gemeenten.

- `backend/` — Django 5 + DRF (Python 3.12, gunicorn)
- `frontend/` — React 19 + Vite (Node 22), static build

---

## Docker development

Start Docker Desktop, then run from the repository root:

```bash
docker compose up --build -d
docker compose logs -f backend frontend
```

Open http://localhost:5173. Django is available at http://localhost:8000 and
PostgreSQL at localhost:5432. These ports must be free before starting.
Source files are mounted for hot reload. The first backend startup runs migrations
and loads the bundled IV3 fixture; subsequent starts skip loading existing data.

Compose sets `DEVMODE=True` and connects Django to its PostgreSQL service without
AWS database secrets. Email is printed to the backend logs. The local database
credentials are `gemeentefinancien` / `localdev`, with database `gemeentefinancien`.
Existing SQLite data is not imported. The root `.env` is not passed wholesale into
the containers; add any optional application environment overrides explicitly to
Compose. `ALLOWED_HOSTS` accepts comma-separated hostnames; Compose includes
`backend` for the Vite proxy.

Create an administrator:

```bash
docker compose exec backend python manage.py createsuperuser
```

Stop the stack while retaining database and uploaded media volumes:

```bash
docker compose down
```

Avoid `docker compose down -v` unless you intend to delete those volumes.

### Production images

```bash
docker build -t gemeentefinancien-backend ./backend
docker build --target prod -t gemeentefinancien-frontend ./frontend
```

The backend image serves Gunicorn on port 8000, collects static files during the
build, and runs migrations and the conditional fixture load on startup. Supply
runtime database credentials, `SECRET_KEY`, `DEBUG=False`, and `ALLOWED_HOSTS`
through your hosting environment. This branch's `DEVMODE=False` path uses AWS
Secrets Manager; select it only in an environment configured for that integration.

The frontend image serves Nginx on port 80. Set `BACKEND_HOST` to the backend's
resolvable hostname (without scheme or port) on their shared container network.
Nginx proxies API, media, admin, and static requests and preserves chat streaming.
These commands build images only; Compose is the local development configuration.

## Local development

Backend (`backend/`):

```bash
python3 -m venv venv && source venv/bin/activate
pip install -r requirements.txt
python manage.py migrate
python manage.py load_iv3_data
python manage.py createsuperuser
python manage.py runserver          # http://127.0.0.1:8000
```

Frontend (`frontend/`):

```bash
npm install
npm run dev                          # http://localhost:5173, proxies /api to :8000
```

Tests:

```bash
python manage.py test iv3.tests
python manage.py check_query_budget
```

---

## Environment variables

See `.env.example`.

Category coverage and “(Leeg)” checks: see [the IV3 category audit](docs/category-audit.md) for the page inventory, findings and repeatable read-only commands.
