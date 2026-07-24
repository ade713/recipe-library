# AGENTS.md

## Project

This is a recipe-saving app built to help the human user learn Python while creating a portfolio-quality backend and mobile app.

Backend:
- Python
- FastAPI
- SQLAlchemy
- Alembic
- PostgreSQL for the real app
- SQLite may be used for small tests or early experiments
- pytest

Mobile:
- React Native
- Expo
- TypeScript

Desktop later:
- React
- TypeScript

## Learning mode

The human user wants to type most of the code manually and learn Python through the project.

When helping:
- Do not immediately write full implementations unless explicitly asked.
- Start with a short explanation of the concept.
- Prefer small tasks over large generated features.
- Give skeleton code with TODO comments when helpful.
- Ask the user to implement the TODOs.
- Give hints before giving final answers.
- Explain error messages in plain English.
- Review the user's code after they write it.
- Keep feedback focused on correctness, readability, Python style, and missing tests.
- Recommend tests for each feature.
- Ask 2-3 quick review questions after each completed learning task.

## Codex behavior preferences

Use these modes unless the user asks otherwise:

### Tutor mode
Explain the Python concept before code.

### Test mode
Write tests and skeletons, but leave the implementation for the user.

### Review mode
Review the user's diff and suggest improvements without rewriting everything.

Avoid using Builder mode for core learning tasks. Builder mode is acceptable for repetitive boilerplate after the user understands the pattern.

## Done means

A task is done when:
- The user understands the code.
- Relevant tests pass.
- The code was typed or reviewed line-by-line by the user.
- The implementation is small, readable, and tested.
- Codex has reviewed the diff.

## Planning checklist

Before implementing a feature, review `docs/APP_CONSIDERATIONS.md` and check whether the feature touches ownership, URL fetching, source attribution, privacy, search, rate limiting, ingredient scaling, or mobile cooking UX.

## Coding conventions

Backend:
- Use Python type hints.
- Keep route handlers thin.
- Put business logic in `app/services/`.
- Put database access in `app/repositories/`.
- Put request/response shapes in `app/schemas/`.
- Put SQLAlchemy models in `app/models/`.
- Prefer small functions with tests.

API:
- Use `/api/v1` prefix.
- Return clear error messages.
- Do not silently swallow scraper/import failures.
- Keep original recipe source URL for attribution and fallback.
- Scope recipe, note, tag, and import queries to the current user.

Scraping/importing:
- Build manual recipe creation before URL import.
- Respect website access limits and `robots.txt` when possible.
- Do not try to bypass bot protection.
- Treat imported recipes as editable drafts.
- Preserve source URL and source domain.
- Do not render raw scraped HTML.
- Do not store full webpage HTML by default.
- Add safe-fetch protections before making real URL requests: HTTP/HTTPS only, no localhost/private IPs, timeout, redirect limit, response-size limit, and import rate limits before public deployment.
- Save parser warnings and import metadata for debugging.

Ingredient scaling:
- Store both original ingredient text and parsed fields.
- Only scale ingredients when parsing is confident.
- Leave unclear ingredients unchanged.
