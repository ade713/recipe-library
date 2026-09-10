# Backend Cleanup Plan

The backend feature work through Week 12 is complete. Before the mobile MVP begins, cleanup should remain split into focused pull requests so mechanical, architectural, and behavioral changes are easy to review and revert.

## Required before Week 13

### PR 1: Strengthen backend quality gates

- Replace manually enumerated Ruff targets with `ruff check .`.
- Replace manually enumerated mypy targets with `mypy app`.
- Confirm CI checks authentication, imports, parsing, safe fetching, and transport code.
- Establish reproducible dependency installation with deliberate compatible ranges or a lockfile.
- Keep dependency changes limited to reproducibility; handle behavior-changing upgrades separately.

### PR 2: Clean backend code and documentation

- Remove the exposed, unimplemented import-detail route until that endpoint is scheduled.
- Remove the completed TODO from `scale_ingredient_line()`.
- Remove or clearly defer the unused ingredient-parser stub.
- Audit unused schemas, helpers, imports, and empty scaffolding before removing them.
- Resolve or explicitly document model/schema drift such as the database-only `difficulty` field.
- Add concise docstrings to remaining undocumented public API route handlers and other meaningful API-level orchestration or error boundaries.
- Avoid docstrings that merely repeat an obvious function name, especially on small private helpers.
- Align API and roadmap documentation with those decisions.

### PR 3: Establish backend formatting

- Apply `ruff format` as a standalone mechanical change.
- Add `ruff format --check .` to CI after establishing the baseline.
- Avoid mixing behavior changes into the formatting PR.

### PR 4: Centralize backend vocabulary and API types

- Introduce shared typed values for import status, recipe origin/import status, and ingredient parse status.
- Replace duplicated literals in schemas, routes, models, services, and tests.
- Review naming consistency for import logs, source tips, parser results, and response types.
- Reuse framework HTTP status constants and existing response schemas where they improve clarity.
- Inventory inconsistent error responses, but defer any client-visible contract changes to a behavioral PR.
- Preserve existing API and database behavior.

### PR 5: Consolidate backend test setup

- Add narrowly scoped shared fixtures for SQLite sessions, authenticated users, FastAPI dependency overrides, and authorization headers.
- Convert endpoint test modules incrementally.
- Keep special-purpose mocks and failure setup local to the tests that need them.
- Keep the PR focused on reusable setup; do not rewrite test behavior.

### PR 6: Refactor import orchestration

- Move import-preview and import-save workflow decisions out of the route module into focused services.
- Keep HTTP concerns in routes, business orchestration in services, and persistence in repositories.
- Preserve current endpoint behavior with characterization tests.

## After mobile work begins, before private MVP release

These items should be planned as focused PRs, but they do not block the start of Week 13:

- Add nonblank/whitespace normalization for titles, tags, notes, ingredients, and instructions.
- Decide whether tag uniqueness should be case-insensitive.
- Add a small PostgreSQL CI job that applies Alembic migrations and exercises important persistence flows.
- Resolve the FastAPI TestClient deprecation warning through a deliberate dependency update.
- Decide whether list endpoints need pagination for the private MVP.

## Before public deployment

These are behavioral, database, security, or operational changes. Split them into independently reviewable PRs when scheduled:

- Define source URL canonicalization, including treatment of common tracking parameters.
- Make duplicate detection and repeated-import saving safe under concurrent requests.
- Review composite indexes and per-recipe ordering constraints based on real query needs.
- Add pagination and bounded list responses before data volume requires them.
- Add import, login, and registration rate limiting.
- Reject insecure production configuration, including the development JWT secret and unsafe CORS settings.
- Define account deletion and related-data retention/cascade behavior.
- Add structured import logging and useful operational metrics without recording sensitive content.
- Review synchronous SQLAlchemy work inside the asynchronous import-preview route if concurrency grows.
- Add separate liveness and database-readiness checks when deployment infrastructure needs them.

None of these later items should be folded silently into cleanup PRs. Each should begin with an explicit API, database, security, or operational decision and suitable tests.
