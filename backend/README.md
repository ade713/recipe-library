# Backend

FastAPI backend for Recipe Library.

## Setup

```bash
python -m venv .venv
source .venv/bin/activate
pip install -e ".[dev]"
cp .env.example .env
uvicorn app.main:app --reload
```

## Useful commands

```bash
python -m pytest tests -q
python -m ruff check app tests alembic
python -m ruff format app tests alembic
python -m mypy app/api/routes/recipes.py app/repositories app/schemas
```

## Database migrations

Start PostgreSQL from the repository root:

```bash
docker compose up -d postgres
```

Then run migrations from `backend/`:

```bash
python -m alembic upgrade head
python -m alembic current
python -m alembic check
```

## API docs

Run the server and open:

```text
http://localhost:8000/docs
```

## Implemented API endpoints

```text
POST   /api/v1/auth/register
POST   /api/v1/auth/login
GET    /api/v1/auth/me

POST /api/v1/recipes
GET  /api/v1/recipes
GET  /api/v1/recipes/{recipe_id}
PATCH  /api/v1/recipes/{recipe_id}
DELETE /api/v1/recipes/{recipe_id}
```

Recipe, note, and tag endpoints require JWT bearer authentication. Database queries are scoped to the authenticated user's ownership.
