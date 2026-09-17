# Gemeentefinanciën

Dashboard over inkomsten, uitgaven, belastingen en schulden van gemeenten.

- `backend/` — Django 5 + DRF (Python 3.12, gunicorn)
- `frontend/` — React 19 + Vite (Node 22), static build

---

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
