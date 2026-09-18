# Project Memory

## Current app name

The app is now called Recipe Library.

Earlier working name:

- Recipe Vault

Reason for rename:

- Recipe Library is clearer and more direct.
- It describes the app as a personal collection of saved recipes.
- It sounds less abstract than Recipe Vault.

## Current product direction

Recipe Library is a mobile-first personal recipe-saving app.

Users can:

- Manually create recipes.
- Paste recipe URLs.
- Import recipe data when supported.
- Review and edit imported drafts.
- Save recipes to a personal library.
- Search and filter saved recipes.
- Add personal notes.
- Scale ingredients by 1x, 2x, and 3x.

## Current backend progress

The nullable recipe `difficulty` column is reserved for future use and intentionally absent from MVP API schemas. Retain it during cleanup; exposing it or removing it requires a separate feature or migration decision.

Structured ingredient parsing is deferred work for before private MVP release, not abandoned functionality. Imported ingredients currently retain original text and default to `unparsed`. The existing scaling utility handles basic leading quantities but is not connected to import normalization. Implementing conservative parsed fields and connecting them to cooking-view portion scaling remains necessary follow-up work; see `ROADMAP.md` and `BACKEND_CLEANUP_PLAN.md`.

- Manual recipe, note, and tag CRUD are implemented and user-scoped.
- Authentication, recipe search/filter/sort, safe URL fetching, import parsing, editable previews, duplicate handling, and import logging are implemented.
- Reviewed `success` and `partial` import drafts can be saved transactionally with trusted source attribution and a link back to their import log.
- The planned pre-mobile backend cleanup is complete. Week 13 mobile foundation work is now in progress.

## Current mobile progress

- Expo SDK 57 with Expo Router and strict TypeScript is configured in `mobile/`.
- Root stack navigation and the initial Recipe Library placeholder screen are verified in Expo Go on a physical Android phone.
- The user understands the router entry point and the distinction between layout and screen components; TypeScript checking passes.
- Android-to-FastAPI health connectivity is verified through a temporary Check API button using an ignored local API URL setting.
- The API client preserves caller headers and returns undefined for 204 responses. HTTP failures now throw ApiError with a readonly numeric status; network errors propagate unchanged. Eight client tests include parameterized 401/500 coverage, and one ApiError test verifies standard error behavior. Response generics do not provide runtime validation; server error-body parsing remains follow-up work.
- A SecureStore wrapper now saves, reads, and removes access tokens. Missing tokens return null; storage failures propagate. Seven mocked storage tests cover this behavior.
- Typed login and current-user API helpers are implemented independently of storage. They reject empty responses and propagate client failures, with six mocked auth-helper tests.
- The session service coordinates login, profile lookup, and token saving in that order, returning the user only after saving succeeds. Local sign-out awaits token removal without a backend request. Restoration reads the saved token, returns null when missing, and fetches the user when present. A profile 401 triggers awaited removal before returning null; network/server failures preserve the token and propagate. Storage-read and cleanup failures also propagate. Thirteen session tests bring the mobile suite to 35 passing tests; TypeScript checking passes. UI authentication state and end-to-end authentication are not yet connected.
- Mobile CI is merged in PR #41 and runs npm ci, Jest, and tsc using Node 24. Both backend and mobile checks passed on GitHub. Verified main-branch protection requires `Tests, Ruff, and mypy` and `Mobile Tests and TypeScript`, requires up-to-date branches, and applies to administrators. Authentication integration can now continue.
- Native storage smoke testing and restart persistence verification, login/logout UI integration, startup restoration invocation and loading/error/retry state, broader authenticated API integration, richer API-error handling, authentication screens, and functional recipe screens remain upcoming work. Local token removal does not revoke backend tokens. Service-level restoration now distinguishes profile 401 responses from transient failures using structured API errors; it does not restore a user when profile lookup fails.
- Follow `mobile/README.md` for setup. Track dependency audit findings before release without applying incompatible forced upgrades.

## UI exploration

Generated three mobile design/wireframe options based on the planned screens.

Core screens:

1. Recipe Library
2. Import Recipe
3. Import Preview / Edit Recipe
4. Manual Recipe Create/Edit
5. Recipe Detail / Cooking View
6. Search / Filter
7. Settings / Account

Decision status:

- Option C is the preferred UI direction, but it has not been formally finalized.
- Mobile-first remains the priority.
- Recipe Detail / Cooking View is the most important screen.
- Import Preview must make scraped recipes feel editable and trustworthy.

## Development philosophy

The project is also for learning Python.

Codex should:

- Explain concepts.
- Help write tests.
- Review code.
- Debug errors.
- Give hints before full solutions.

Codex should not:

- Build the entire app without explanation.
- Skip the learning process.
- Leave important decisions only in chat.

## Memory rule

Any important product, UI, API, data model, architecture, naming, or roadmap decision should be written into the repo docs before moving on.
