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
- Typed login, current-user, and registration API helpers are implemented independently of storage. They reject empty responses and propagate client failures, with ten mocked auth-helper tests. RegisterRequest is distinct from LoginRequest. Registration posts JSON to /auth/register and returns UserResponse (backend HTTP 201), without signing in, storing a token, or changing auth state. Tests cover creation, undefined response, duplicate-account ApiError(409), and network failure propagation. RegisterScreen now reuses AuthForm and is connected at /register.
- The session service coordinates login, profile lookup, and token saving in that order, returning the user only after saving succeeds. Local sign-out awaits token removal without a backend request. Restoration reads the saved token, returns null when missing, and fetches the user when present. A profile 401 triggers awaited removal before returning null; network/server failures preserve the token and propagate. Storage-read and cleanup failures also propagate. Thirteen session tests cover this behavior.
- A discriminated authentication-state union and pure reducer now support loading, signedOut, authenticated, and error states. AuthProvider runs restoration on mount; useAuth returns `{ state, retryRestoration, signIn, signOut }`. Retry dispatches loading, clears the previous error, and increments an effect dependency to start another attempt. Cleanup prevents late dispatch but does not cancel requests or storage effects.
- Provider signIn awaits the session service (authentication, profile lookup, and token storage) before dispatching signInSucceeded. Pending or failed sign-in leaves signed-out state unchanged; errors propagate for the future login screen to handle locally, not through the restoration error state. Tests cover success through a consumer button and failure/pending through renderHook. Repeated strings in provider/restoration tests now use file-local constants.
- Provider signOut awaits local token removal through the session service before dispatching signOutSucceeded, which clears the user with a fresh signedOut state. Pending or failed removal preserves the authenticated state; errors propagate. Success, failure, and pending behavior are tested. No backend request or server-side token revocation occurs. The library screen now owns the sign-out control, pending/duplicate-press protection, and safe failure feedback. Keep this behavior in the screen rather than creating a one-off button component; extract shared components when reuse or complexity warrants it.
- The root layout nests AuthProvider → AuthRestorationGate → AppNavigator → Stack. The restoration gate handles loading/error; AppNavigator uses Stack.Protected for authenticated library access and signed-out login access. Backend auth/ownership enforcement remains required. The mobile suite has 97 passing tests across fifteen suites, including twelve shared auth-form tests, four registration-screen tests, one login-screen integration test, six navigation tests, and two library-screen feedback/pending tests; TypeScript checking passes.
- The typed listRecipes(token) helper requests /recipes with a Bearer token and returns RecipeListResponse containing RecipeSummary items. It accepts an empty list, rejects undefined responses, and preserves API/network errors; five mocked tests cover these cases. Ownership is enforced by the backend, not a client-supplied user ID. Library-screen integration remains next; search and filter controls are outside this helper PR.
- LoginForm was renamed to shared AuthForm in src/auth/auth-form.tsx, with a form-owned AuthFormValues type independent of API request types. Required submitLabel and submitErrorMessage props let screens choose workflow-specific copy without branching inside the form. LoginScreen supplies sign-in configuration and connects onSubmit to useAuth().signIn. The form retains controlled, labeled inputs, secure password entry, missing-field checks, pending protection, safe failure feedback, and retry cleanup. Password whitespace remains unchanged; email trim is only a blank check. Twelve tests cover existing behavior, configurable copy, and optional synchronous validation; the test helper alone provides defaults through an options object. RegisterScreen reuses this form, supplying its own password validator. Option C styling and broader keyboard/accessibility checks remain pending.
- Android smoke testing confirmed invalid-credential feedback, login and profile HTTP 200 responses, automatic library navigation, Back not returning to login, and saved-session restoration after reopening. Connectivity required the current Mac LAN IP and Uvicorn bound to 0.0.0.0; phone and Mac must share a reachable network. No credentials or tokens are recorded in docs.
- Follow-up: audit test overlap in a focused cleanup without delaying mobile work. Keep form/provider behavior coverage separate from navigation/wiring coverage. The API client has no explicit request timeout; add stalled-request handling in follow-up work.
- Mobile CI is merged in PR #41 and runs npm ci, Jest, and tsc using Node 24. Both backend and mobile checks passed on GitHub. Verified main-branch protection requires `Tests, Ruff, and mypy` and `Mobile Tests and TypeScript`, requires up-to-date branches, and applies to administrators. Authentication integration can now continue.
- Android sign-out smoke checks passed: pressing Sign out opens login, Back cannot reopen the library, closing/reopening remains signed out, and signing in again succeeds. Device restoration error/retry verification, broader authenticated API integration, richer API-error handling, and functional recipe screens remain upcoming work. Local token removal does not revoke backend tokens. Restoration distinguishes profile 401 responses from transient failures using structured API errors; it does not restore a user when profile lookup fails.
- Follow `mobile/README.md` for setup. Track dependency audit findings before release without applying incompatible forced upgrades.

Registration now includes a signed-out route, login entry link, screen-owned eight-character password validation, success-only account-created feedback, and a replace link back to login. It does not automatically authenticate. The user confirmed the Android registration smoke checklist, including short-password validation, account creation, return to login, and sign-in with the new account. Navigation test helpers include all declared routes. Restart Expo if generated route types lag behind newly added files.

Post-auth follow-up: audit test overlap and repeated frontend constants without delaying MVP work. Share genuinely reusable values through focused modules, while keeping local fixtures/copy local where appropriate; avoid a catch-all constants utility.

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
