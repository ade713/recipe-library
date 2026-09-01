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

Status: Complete

- [x] Create recipe manually
- [x] List recipes
- [x] View recipe detail
- [x] Update recipe
- [x] Delete recipe
- [x] Manual entry as fallback path for failed imports

## Phase 6: Notes and tags basics

Status: Complete

- [x] Notes CRUD
- [x] Tags CRUD

## Phase 7: Auth and ownership

Status: Complete

- [x] Register/login
- [x] Current user dependency
- [x] Protected recipe, note, and tag routes
- [x] Ownership checks for recipes, notes, and tags

## Phase 8: Search and filters

Status: Complete

- [x] Title and ingredient search
- [x] Tag filter
- [x] Favorite filter
- [x] Maximum total-time filter
- [x] Sort options

## Phase 9: Safe recipe import

- [ ] Require authentication and user ownership for import endpoints
- [ ] Preview endpoint
- [ ] Duplicate URL check
- [ ] Safe URL fetcher
  - [x] Validate URL structure and resolved public destinations
  - [x] Define validated limits and operational failure types
  - [ ] Enforce connection and read timeouts
  - [ ] Limit redirects and revalidate every destination
  - [ ] Limit response size and require HTML content
- [ ] Parse recipe
- [ ] Normalize draft
- [ ] Save import logs
- [ ] Failed/blocked/manual-entry fallback behavior

## Phase 10: Save imported recipes

- Save edited import draft
- Preserve source URL/domain
- Link import log to saved recipe

## Phase 11: Mobile MVP

- Expo setup
- Library screen
- Manual create/edit screen
- Import screen
- Preview/edit screen
- Recipe detail screen
- Notes UI

## Phase 12: Portfolio polish

- Screenshots
- README demo flow
- Tests
- Deployment notes
- Seed data
