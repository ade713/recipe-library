# Recipe Library

A repo for a mobile-first recipe-saving app.

The app lets a user manually create recipes, paste recipe URLs, import useful recipe data when supported, review/edit imported drafts, save recipes to a personal library, and use notes, search/filtering, and portion scaling.

The backend is Python/FastAPI-first, and Codex should be used as a tutor, test-writer, reviewer, and debugging assistant rather than as the primary coder.

## Current MVP definition

```text
A user can create an account, manually create a recipe, paste a recipe URL,
receive an editable imported draft when supported, save the recipe, view it
later, search/filter recipes, scale confidently parsed ingredients by 1x/2x/3x,
add personal notes, and always access the original source link.
```

Four implementation principles are especially important:

1. Build manual recipe creation before URL import.
2. Treat imported recipes as editable drafts, not final saved content.
3. Use safe, responsible URL fetching with SSRF protections, timeouts, redirect limits, and response-size limits.
4. Scope every recipe, note, tag, import, search, filter, and favorite query to the current user.

## Repo layout

```text
recipe-library-starter/
  AGENTS.md                  # Codex behavior instructions: learning mode
  CODEX_HANDOFF.md           # Full app/product/technical handoff brief
  LEARNING_LOG.md            # Running notes for what you learn
  docker-compose.yml         # Local Postgres setup
  .env.example               # Root environment template
  backend/                   # FastAPI backend starter
  mobile/                    # React Native/Expo starter planning scaffold
  docs/                      # Product, API, data model, UI, roadmap, and considerations docs
    APP_CONSIDERATIONS.md    # Product, security, scraping, data, privacy, and UX checklist
```

See `docs/APP_CONSIDERATIONS.md` for the full product, security, data, scraping, and UX checklist.
See `docs/MVP_SCHEDULE.md` for the estimated 14-week, five-days-per-week MVP plan.

## Recommended workflow

Use this project in small loops:

```text
1. Ask Codex to explain the next concept.
2. Ask Codex for tests or a skeleton, not a full solution.
3. Type the implementation yourself.
4. Run tests.
5. Ask Codex to explain errors with hints first.
6. Ask Codex to review your diff.
7. Write a short note in LEARNING_LOG.md.
```

## Backend quick start

From the `backend/` folder:

```bash
python -m venv .venv
source .venv/bin/activate  # Windows: .venv\Scripts\activate
pip install -e ".[dev]"
cp .env.example .env
uvicorn app.main:app --reload
```

Then open:

```text
http://localhost:8000/docs
http://localhost:8000/api/v1/health
```

## Database quick start

From the repo root:

```bash
docker compose up -d postgres
```

The default local database URL is shown in `backend/.env.example`.

## First recommended Codex prompt

```text
I am learning Python by building this recipe app. Read AGENTS.md and CODEX_HANDOFF.md first.

Start with the first task in CODEX_HANDOFF.md: ingredient scaling.
Do not write the implementation for me yet.
Explain the Python concepts involved, then help me unskip the tests and implement the function myself using hints.
```

## Current status

The backend database foundations and initial Alembic migration are complete. Email/password registration, login, JWT bearer authentication, and the current-user endpoint are implemented. Manual recipe CRUD, nested personal-note CRUD, and tag management are protected and scoped to the authenticated user. Logout remains to be completed.
