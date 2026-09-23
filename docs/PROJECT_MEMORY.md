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
- The session service coordinates login, profile lookup, and token saving in that order, returning the user only after saving succeeds. Local sign-out awaits token removal without a backend request. Restoration reads the saved token, returns null when missing, and fetches the user when present. A profile 401 triggers awaited removal before returning null; network/server failures preserve the token and propagate. Storage-read and cleanup failures also propagate. Thirteen session tests cover this behavior.
- A discriminated authentication-state union and pure reducer now support loading, signedOut, authenticated, and error states. AuthProvider runs restoration on mount; useAuth returns `{ state, retryRestoration, signIn, signOut }`. Retry dispatches loading, clears the previous error, and increments an effect dependency to start another attempt. Cleanup prevents late dispatch but does not cancel requests or storage effects.
- Provider signIn awaits the session service (authentication, profile lookup, and token storage) before dispatching signInSucceeded. Pending or failed sign-in leaves signed-out state unchanged; errors propagate for the future login screen to handle locally, not through the restoration error state. Tests cover success through a consumer button and failure/pending through renderHook. Repeated strings in provider/restoration tests now use file-local constants.
- Provider signOut awaits local token removal through the session service before dispatching signOutSucceeded, which clears the user with a fresh signedOut state. Pending or failed removal preserves the authenticated state; errors propagate. Success, failure, and pending behavior are tested. No backend request or server-side token revocation occurs. The real app sign-out control remains pending.
- The root layout nests AuthProvider → AuthRestorationGate → Stack. The gate shows AuthRestorationStatus for loading/error, including a real Retry button, and renders children for both signedOut and authenticated; it is not route protection. Six reducer, fourteen provider, four status, four gate, and nine login-form tests bring the mobile suite to 72 passing tests across ten suites; TypeScript checking passes. Gate tests cover loading, retry recovery, and both settled states. The user verified Android launch and Check API success after reconnecting phone and Mac to the same Wi-Fi; persisted-token restoration and device retry recovery remain unverified.
- Standalone LoginForm accepts an async onSubmit callback, without API/storage/navigation coupling. It has controlled, labeled email/password inputs with secure password entry, rejects missing credentials (including whitespace-only email), disables submission while pending, catches failures with safe generic feedback, clears errors on valid retry, and resets submitting state in finally. Email trim is only a blank check; submitted values and password whitespace remain unchanged. Nine tests cover these behaviors. Route/provider integration, Option C styling, and device/keyboard checks remain pending; no end-to-end login is claimed.
- Mobile CI is merged in PR #41 and runs npm ci, Jest, and tsc using Node 24. Both backend and mobile checks passed on GitHub. Verified main-branch protection requires `Tests, Ruff, and mypy` and `Mobile Tests and TypeScript`, requires up-to-date branches, and applies to administrators. Authentication integration can now continue.
- Native storage smoke testing and restart persistence verification, device restoration error/retry verification, login/logout UI integration, route protection, broader authenticated API integration, richer API-error handling, authentication screens, and functional recipe screens remain upcoming work. Local token removal does not revoke backend tokens. Restoration distinguishes profile 401 responses from transient failures using structured API errors; it does not restore a user when profile lookup fails.
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
