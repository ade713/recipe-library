# Backend Cleanup Plan

The backend feature work through Week 12 is complete. Before the mobile MVP begins, cleanup should remain split into focused pull requests so mechanical, architectural, and behavioral changes are easy to review and revert.

## Before Week 13

### PR 1: Expand backend CI coverage

- Replace manually enumerated Ruff targets with `ruff check .`.
- Replace manually enumerated mypy targets with `mypy app`.
- Confirm CI checks authentication, imports, parsing, safe fetching, and transport code.

### PR 2: Remove stale backend scaffolding

- Remove the exposed, unimplemented import-detail route until that endpoint is scheduled.
- Remove the completed TODO from `scale_ingredient_line()`.
- Remove or clearly defer the unused ingredient-parser stub.
- Add concise docstrings to remaining undocumented public API route handlers and other meaningful API-level orchestration or error boundaries.
- Avoid docstrings that merely repeat an obvious function name, especially on small private helpers.
- Align API and roadmap documentation with those decisions.

### PR 3: Establish backend formatting

- Apply `ruff format` as a standalone mechanical change.
- Add `ruff format --check .` to CI after establishing the baseline.
- Avoid mixing behavior changes into the formatting PR.

## Also before Week 13

### PR 4: Centralize backend status types

- Introduce shared typed values for import status, recipe origin/import status, and ingredient parse status.
- Replace duplicated literals in schemas, routes, models, services, and tests.
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

## Before public deployment

### PR 7: Harden duplicate and import behavior

- Define source URL canonicalization, including treatment of common tracking parameters.
- Make concurrent repeated-import saves safe at the database/transaction level.
- Add import and authentication rate limiting.
- Resolve the current FastAPI TestClient deprecation warning through a deliberate dependency update.

These items are behavioral and operational changes, not cleanup-only work, so each may be split further when implementation begins.
