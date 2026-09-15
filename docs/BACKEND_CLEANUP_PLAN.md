# Backend Cleanup Plan

The backend feature work through Week 12 is complete. Before the mobile MVP begins, cleanup should remain split into focused pull requests so mechanical, architectural, and behavioral changes are easy to review and revert.

## Required before Week 13

Current status: PRs 1–5 and 6A are merged. PR 6B is implemented and verified, ready for pull request creation. Its review and merge are the remaining pre-mobile cleanup checkpoint before Week 13 begins.

### PR 1: Strengthen backend quality gates

Status: Complete and merged in [PR #29](https://github.com/ade713/recipe-library/pull/29). CI runs whole-backend Ruff and mypy checks and installs dependencies from `uv.lock` with `uv sync --locked --extra dev`. Setup documentation uses the same locked workflow.

- Replace manually enumerated Ruff targets with `ruff check .`.
- Replace manually enumerated mypy targets with `mypy app`.
- Confirm CI checks authentication, imports, parsing, safe fetching, and transport code.
- Establish reproducible dependency installation with deliberate compatible ranges or a lockfile.
- Keep dependency changes limited to reproducibility; handle behavior-changing upgrades separately.

### PR 2: Clean backend code and documentation

Status: Complete and merged in [PR #30](https://github.com/ade713/recipe-library/pull/30).

Completed outcomes:

- Removed the unimplemented import-detail route, unused ingredient-parser stub, and unused `MessageResponse` schema.
- Removed stale scaling learning instructions and the completed TODO.
- Documented API handlers, authentication dependencies, session lifecycle, and import-save behavior.
- Retained `difficulty` as a reserved database-only field outside the MVP API.
- Updated API, handoff, roadmap, and project memory documentation. Structured ingredient parsing and reliable cooking-view scaling remain required before private MVP release.
- Verified 198 tests, Ruff, and mypy pass; the known TestClient deprecation warning remains deferred.

Scope covered:

- Remove the exposed, unimplemented import-detail route until that endpoint is scheduled.
- Remove the completed TODO from `scale_ingredient_line()`.
- Remove or clearly defer the unused ingredient-parser stub.
- Audit unused schemas, helpers, imports, and empty scaffolding before removing them.
- Resolve or explicitly document model/schema drift such as the database-only `difficulty` field.
- Add concise docstrings to remaining undocumented public API route handlers and other meaningful API-level orchestration or error boundaries.
- Avoid docstrings that merely repeat an obvious function name, especially on small private helpers.
- Align API and roadmap documentation with those decisions.

### PR 3: Establish backend formatting

Status: Complete and merged in [PR #31](https://github.com/ade713/recipe-library/pull/31).

Completed outcomes:

- Applied the Ruff formatting baseline across 36 changed Python files in a dedicated commit.
- Added `.venv/bin/ruff format --check .` to CI in a separate commit.
- All 95 Python files pass the formatting check. Tests, Ruff lint, and mypy passed after formatting; the existing test warning remains deferred.

Scope covered:

- Apply `ruff format` as a standalone mechanical change.
- Add `ruff format --check .` to CI after establishing the baseline.
- Avoid mixing behavior changes into the formatting PR.

### PR 4: Centralize backend vocabulary and API types

Status: Complete and merged in [PR #32](https://github.com/ade713/recipe-library/pull/32).

Completed outcomes:

- Added shared import-status, saveable-status, failure-status, next-action, recipe-origin, and ingredient-parse-status aliases in `app/types.py`.
- Reused aliases in preview schemas, import orchestration, and repository inputs while retaining narrower status subsets where appropriate.
- Centralized the saveable-status set, default recipe origin, and default ingredient parse status.
- Preserved database string columns, existing request validation, serialized values, and independent expected values in tests.
- Completed the naming and error-response review below. Targeted tests, Ruff lint/format checks, and mypy passed at each implementation checkpoint.

Scope covered:

- Introduce shared typed values for import status, recipe origin/import status, and ingredient parse status.
- Consolidate repeated type definitions and defaults across schemas, routes, models, and services; retain test literals where they independently verify public values.
- Review naming consistency for import logs, source tips, parser results, and response types.
- Reuse framework HTTP status constants and existing response schemas where they improve clarity.
- Inventory inconsistent error responses, but defer any client-visible contract changes to a behavioral PR.
- Preserve existing API and database behavior.

Review decisions for PR 4:

- Keep `RecipeImport` for the persisted import log, `ParsedRecipe` for scraper output, `NormalizedRecipeDraft` for normalized data plus warnings, and `RecipeImportResult` for a successful preview result. These names distinguish stages of the workflow.
- Keep source tips separate from personal notes. Retain existing `RecipeRead` and `*Response` schema names to avoid unnecessary OpenAPI component-name changes.
- Route HTTP status codes already use FastAPI's named constants. Existing response schemas are reused where appropriate; no additional wrapper is needed.
- Preserve expected string literals in tests as independent checks of public values. Keep database status columns as strings and ingredient `parse_status` validation unchanged; stricter validation requires a separate behavioral change.
- Error-response inventory: HTTP exceptions return a string `detail`, request validation uses a list of errors under `detail`, and expected blocked/failed/duplicate import previews return structured outcomes with HTTP 200. Clients must inspect preview status as well as HTTP status. Preserve these contracts; any unified error shape or machine-readable error codes require a separate behavioral PR.
- List responses also differ: notes return a bare list, while recipes and tags use an `items` wrapper. Consider alignment alongside future pagination, rather than changing response shapes during cleanup.

### PR 5: Consolidate backend test setup

Status: Agreed initial scope complete and merged in [PR #33](https://github.com/ade713/recipe-library/pull/33).

Completed outcomes:

- Added function-scoped session-factory, app, current-user ID, and authorization-header fixtures in `tests/conftest.py`.
- Each test receives a fresh SQLite engine. Request sessions share that test's database; app overrides are cleared before engine disposal.
- Converted import-save setup and all note/tag create/list/update/delete endpoint modules while preserving their assertions and local scenario-specific records and mocks.
- Verified all 198 tests, Ruff lint, formatting, and mypy pass. The known TestClient warning remains deferred.

PR boundary and follow-up:

- Keep this PR focused on the shared fixtures and the five converted endpoint modules for manageable review.
- Recipe, authentication, and import-preview endpoint conversions remain incremental follow-up work. Inspect specialized authentication and failure setup before converting it; do not change database or transaction behavior as part of extraction.
- Full conversion of every test module is not required to finish this initial fixture PR or proceed to PR 6.

Scope covered:

- Add narrowly scoped shared fixtures for SQLite sessions, authenticated users, FastAPI dependency overrides, and authorization headers.
- Convert endpoint test modules incrementally.
- Keep special-purpose mocks and failure setup local to the tests that need them.
- Keep the PR focused on reusable setup; do not rewrite test behavior.

### PR 6A: Refactor import-save orchestration

Status: Complete and merged in [PR #34](https://github.com/ade713/recipe-library/pull/34).

Verification: 210 tests pass, Ruff lint and formatting pass (99 Python files), and mypy passes (50 app files). The known TestClient deprecation warning remains deferred.

- Extract ownership lookup, saveability checks, trusted source attribution, recipe creation, and import-log linkage into `save_reviewed_import()`.
- Keep authentication, HTTP error mapping, commit/rollback, and refresh in the route.
- Cover rejection order, successful saves, unchanged client payloads, and domain-error mapping and rollback with tests.
- Keep import-preview orchestration unchanged in this PR.

### PR 6B: Refactor import-preview orchestration

Status: Implemented and verified on `refactor/import-preview-orchestration`; ready for pull request creation.

Completed outcomes:

- Extracted `preview_recipe_import()` into `app/services/import_preview.py`; the route retains authentication, commit, and rollback.
- Added service tests for duplicate logging, successful/partial previews with redirected source attribution, explicit copies, blocked/failed outcomes, and unexpected-error propagation.
- Preserved endpoint tests and updated repository mock targets to the service. Added characterization coverage for duplicate-lookup failure and route rollback.
- Verified all 218 tests, Ruff lint, formatting (101 Python files), and mypy (51 app files) pass. The known TestClient deprecation warning remains deferred.

Scope covered:

- Extract duplicate detection, preview execution, import logging, and preview outcome construction into a focused service.
- Preserve user scoping, duplicate-before-fetch behavior, explicit copy requests, and success/partial/blocked/failed outcomes.
- Keep HTTP concerns and transaction ownership in the route, business orchestration in the service, and persistence in repositories.
- Preserve endpoint behavior with characterization tests, including rollback on unexpected failures.

PR 6 is split into save and preview changes to keep reviews manageable. Both parts remain in the pre-mobile cleanup scope; this split changes PR boundaries, not the release plan.

## After mobile work begins, before private MVP release

These items should be planned as focused PRs, but they do not block the start of Week 13:

- Implement conservative structured ingredient parsing and connect it to import normalization and portion scaling. This remains important app functionality, deferred from cleanup rather than dropped. Preserve original text, populate quantity/unit/name/preparation only when confident, and leave uncertain lines unchanged. The existing text-scaling utility does not populate stored parsed fields; review the end-to-end cooking-view scaling flow before declaring it complete.
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
