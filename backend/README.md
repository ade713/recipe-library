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
pytest
ruff check .
ruff format .
```

## API docs

Run the server and open:

```text
http://localhost:8000/docs
```

## First coding task

Start with `app/services/scaling.py` and `tests/test_scaling.py`.
