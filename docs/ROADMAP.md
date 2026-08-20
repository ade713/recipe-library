# Roadmap

## Phase 0: Scaffold

- Repo structure
- Backend FastAPI app
- Health route
- Handoff docs

## Phase 1: Pure Python learning utilities

- Ingredient scaling
- Ingredient quantity parsing
- URL validation
- Domain extraction

## Phase 2: Safe URL planning

- Tests for unsafe URLs
- Safe-fetch skeleton
- SSRF prevention TODOs
- Timeout, redirect, response-size TODOs

## Phase 3: API basics

- Pydantic schemas
- Temporary utility endpoints
- FastAPI request/response practice

## Phase 4: Database

Status: Complete

- [x] SQLAlchemy models
- [x] Alembic migrations
- [x] Core recipe tables

## Phase 5: Manual recipe CRUD

Status: In progress

- [x] Create recipe manually
- [ ] List recipes
- [ ] View recipe detail
- [ ] Update recipe
- [ ] Delete recipe
- [x] Manual entry as fallback path for failed imports

## Phase 6: Notes/tags/search basics

- Notes CRUD
- Tags CRUD
- Search and filters

## Phase 7: Auth and ownership

- Register/login
- Current user dependency
- Protected routes
- Ownership checks for recipes, notes, tags, and imports

## Phase 8: Safe recipe import

- Preview endpoint
- Duplicate URL check
- Safe URL fetcher
- Parse recipe
- Normalize draft
- Save import logs
- Failed/blocked/manual-entry fallback behavior

## Phase 9: Save imported recipes

- Save edited import draft
- Preserve source URL/domain
- Link import log to saved recipe

## Phase 10: Mobile MVP

- Expo setup
- Library screen
- Manual create/edit screen
- Import screen
- Preview/edit screen
- Recipe detail screen
- Notes UI

## Phase 11: Portfolio polish

- Screenshots
- README demo flow
- Tests
- Deployment notes
- Seed data
