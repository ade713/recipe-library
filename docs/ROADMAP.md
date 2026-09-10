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

Status: Complete

- [x] Require authentication and user ownership for implemented preview/save endpoints
- [x] Preview endpoint
- [x] Duplicate URL check
- [x] Safe URL fetcher
  - [x] Validate URL structure and resolved public destinations
  - [x] Define validated limits and operational failure types
  - [x] Enforce connection and read timeouts
  - [x] Limit redirects and revalidate every destination
  - [x] Limit response size and require HTML content
- [x] Parse recipe
- [x] Normalize draft
- [x] Save import logs
- [x] Failed/blocked/manual-entry fallback behavior

## Phase 10: Save imported recipes

Status: Complete

- [x] Save edited import draft and related records transactionally
- [x] Preserve trusted source URL/domain
- [x] Link import log to saved recipe
- [x] Reject unsaveable and already-saved import states
- [x] Test the complete preview-edit-save workflow

## Phase 11: Mobile MVP

Before beginning this phase, complete PRs 1–3 in the [Backend Cleanup Plan](BACKEND_CLEANUP_PLAN.md). PRs 4–6 may be scheduled as later maintenance, and the hardening work in PR 7 is required before public deployment.

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
