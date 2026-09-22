# Mobile App

React Native / Expo SDK 57 app using TypeScript and Expo Router. The initial
Recipe Library screen and stack navigation run on a physical Android phone.
The temporary Check API button verifies FastAPI health connectivity. Other
routes remain placeholders; authentication and recipe integration are not connected yet.

## Local setup

Use Node.js LTS (initial setup verified with Node 24.11.0 and npm 11.6.2).
From the repository root:

```bash
cd mobile
npm ci
npm start
```

Install Expo Go on the Android phone, connect it to the same Wi-Fi as the
computer, and scan this server's QR code. Start the server from this folder,
not the temporary generated starter. Stop it with Ctrl+C.

Type-check from `mobile/`:

```bash
npx tsc --noEmit
```

No output with a successful exit means the check passed. Expo generates
`expo-env.d.ts` and `.expo/`; these are ignored. Commit `package-lock.json`
for reproducible installs. Web support is not configured yet despite the
placeholder `web` script.

## Configuration

- `app.json`: app identity, portrait orientation, and Expo Router configuration.
- `app/_layout.tsx`: shared stack navigation and screen headers.
- `app/index.tsx`: the initial Recipe Library screen.
- `tsconfig.json`: Expo defaults, strict checking, and the `@/*` source alias.

## Connect a physical Android phone to FastAPI

From the repository root, with backend dependencies and settings configured:

```bash
cd backend
.venv/bin/uvicorn app.main:app --reload --host 0.0.0.0
```

Use a trusted local network: this exposes the development server to other
devices. Keep the Mac and phone on the same Wi-Fi. Find the Mac's Wi-Fi IP in
System Settings → Wi-Fi → Details → TCP/IP, then open
`http://YOUR_MAC_IP:8000/api/v1/health` in the phone browser. Expect
`{"status":"ok"}`. This checks API availability, not database connectivity.

Create `mobile/.env.local` with the same IP:

```dotenv
EXPO_PUBLIC_API_BASE_URL=http://YOUR_MAC_IP:8000/api/v1
```

Replace the placeholder, restart Expo from `mobile/`, and tap Check API. Expect
`ok`. Keep FastAPI running. On a phone, `localhost` means the phone itself;
`0.0.0.0` is a server listening address, not the address to enter in the app.
If the Mac's IP changes, update this file and restart Expo.

`.env.local` is ignored by Git. `EXPO_PUBLIC_` values are bundled into the app,
so never put secrets or access tokens in them. Local HTTP is for development;
deployed API connections should use HTTPS.

## Client behavior and tests

`src/api/client.ts` prepends the configured API base URL, normalizes request
headers, and defaults Content-Type to application/json only when absent.
Caller-provided headers are preserved. Unsuccessful HTTP responses throw
`ApiError` (defined in `src/api/errors.ts`), an Error subclass with a readonly
numeric `status` and the message `API request failed: <status>`. Network errors
propagate unchanged rather than being converted to HTTP errors. Callers can
use `error instanceof ApiError` and `error.status` instead of parsing messages.
Successful JSON responses are parsed; 204 responses return undefined without
parsing. The return type is `Promise<T | undefined>`; the generic type is an
expectation, not runtime response validation.

From `mobile/`:

```bash
npm test -- --runInBand
npx tsc --noEmit
```

Use `npm run test:watch` during development. Jest uses the jest-expo preset;
client tests mock fetch rather than calling the backend. Eight tests cover JSON
responses, default/preserved headers, HTTP 401/500 errors, network errors, and 204
responses. Each JSON mock creates a fresh Response; spies are restored between
tests. A separate ApiError test verifies its status and standard error behavior.
Authentication UI integration and server error-body parsing remain separate
follow-up work; this change exposes HTTP status, not backend validation details.

## Authentication API helpers

`src/types/auth.ts` defines LoginRequest, TokenResponse, and UserResponse to
match backend JSON, including snake_case token fields and string user IDs.
These TypeScript types do not validate responses at runtime.

`src/api/auth.ts` provides:

- `login(payload)`: POST credentials as JSON to `/auth/login` and return the
  token response without storing it.
- `getCurrentUser(token)`: GET `/auth/me` with the supplied Bearer token and
  return the user profile without reading SecureStore.

Both helpers reject unexpected undefined responses and propagate API client
failures. The session service coordinates sign-in and storage; the provider
exposes restoration state, and the backend validates tokens. Six tests mock apiFetch to cover successful
requests, empty responses, and failures for both helpers.

```bash
npm test -- auth.test.ts --runInBand
```

Login screens and registration are
not implemented. These helper tests do not establish end-to-end authentication.

## Sign-in, local sign-out, and session restoration

`src/auth/session.ts` coordinates the API and storage helpers:

- `signIn(payload)` awaits login, fetches the user with the issued token, then
  awaits secure token storage before returning the user. Login failure prevents
  profile lookup and saving; profile failure prevents saving; storage failure
  rejects instead of reporting successful sign-in.
- `signOut()` awaits local token removal without a backend request, allowing
  local sign-out while offline. Removal failures propagate. The provider now
  clears auth state after this helper succeeds; it does not revoke backend tokens.
- `restoreSession()` reads the stored token and returns null when none exists.
  Otherwise, it fetches the user. A profile lookup rejected with ApiError status
  401 triggers awaited token removal before returning null. Other errors
  propagate without removing the token. Storage-read failures prevent profile
  lookup; a failed removal after 401 propagates the cleanup error rather than
  reporting successful cleanup.

Thirteen mocked tests cover sign-in and local sign-out, plus restoration with
no token, a valid profile response, HTTP 401, network failure, HTTP 500,
storage-read failure, and cleanup failure.

```bash
npm test -- session.test.ts --runInBand
```

Restoration uses ApiError type/status checks, not message parsing. Network or
server failure does not establish that credentials are invalid, so the stored
token is preserved. The provider invokes this service on mount, with visible
loading/error/retry UI. Native restart-persistence verification remains pending.
No user is restored on a failed profile request.

## React authentication state

`src/auth/auth-state.ts` defines a discriminated union for loading, signedOut,
authenticated (with a user), and error (with a message). Its pure reducer handles
restoration, signInSucceeded, and signOutSucceeded actions without calling the API or storage.

`src/auth/auth-provider.tsx` owns this state and exposes it through `useAuth()`.
The provider starts restoration on mount, dispatches the result, and exposes a
safe error message instead of raw dependency errors. Its effect cleanup guard
prevents dispatch after cleanup; it does not cancel the underlying request.
Using useAuth outside AuthProvider throws a clear error. Its return value is now
`{ state, retryRestoration, signIn, signOut }`; consumers read state with `const { state } = useAuth()`.
Raw dispatch is not exposed.

The provider's `signOut(): Promise<void>` awaits the session service's local
token removal before dispatching signOutSucceeded. The reducer returns a fresh
signedOut state without the previous user. Pending or failed removal preserves
the authenticated state; failures propagate for the caller to handle. No backend
request is made, and local removal does not revoke a copied token on the server.
The app's sign-out control is not connected yet; tests use a consumer button.

The provider's `signIn(payload): Promise<void>` awaits the session service before
dispatching signInSucceeded with the returned user. Authentication, profile lookup,
and token storage must all succeed first. Pending or failed sign-in leaves a
signed-out caller signed out; failures propagate to the caller. The future login
screen will own submitting indicators and login-error feedback, rather than using
the restoration error state and hiding the form behind the restoration gate.

`retryRestoration()` dispatches restoreStarted to show loading and clear the
previous error, then increments an attempt counter using a functional state
update. The counter is an effect dependency, so changing it cleans up the prior
effect and starts another restoration attempt. Success updates the auth state;
failure exposes the same safe message and permits another retry. The cleanup
guard suppresses late dispatch, not network or storage side effects.

`app/_layout.tsx` nests AuthProvider → AuthRestorationGate → Stack.
The gate reads context and displays AuthRestorationStatus while loading or in
error. The status component shows a progress indicator or the safe error message
and a Retry button wired to retryRestoration. Both signedOut and authenticated
states show children; this gate waits for restoration, not authentication, and
does not protect routes. Login/logout UI integration remains follow-up work.

The user verified that the app launches on the Android phone and Check API
returns OK after putting the phone and Mac on the same Wi-Fi. This smoke check
does not verify persisted-token restoration or device error/retry recovery.

Six reducer tests cover state transitions; fourteen provider tests cover initial
loading, signed-out and authenticated results, safe error messaging, and the
missing-provider guard, successful retry, pending-retry loading/error clearing,
and failed retry without raw error leakage, plus successful, failed, and pending
sign-in and sign-out. Failure and pending tests use renderHook to exercise the context method
directly; success tests exercise a test consumer's buttons. Repeated test
strings are kept in file-local constants independent of production messages.
Four status-component tests cover
progress, error/retry, and both settled states. Four gate tests use the real
provider with mocked restoration to cover hidden content while loading,
failed-restoration retry recovery, and both settled states. React Native Testing
Library supports the component tests.

```bash
npm test -- auth-provider.test.tsx --runInBand
npm test -- auth-state.test.ts --runInBand
npm test -- auth-restoration-status.test.tsx auth-restoration-gate.test.tsx --runInBand
```

## Secure token storage

`src/auth/token-storage.ts` wraps Expo SecureStore with three operations:

- `saveAccessToken(token)`: persist the access token.
- `getAccessToken()`: return the stored token, or null when none exists.
- `removeAccessToken()`: delete the local token.

All operations use the fixed key `recipe-library.access-token`. Storage errors
propagate to the caller; a read failure is not treated as a missing token.
Removing the local token does not revoke it on the backend. Store only access
tokens, not passwords, and never log token values or put them in public
environment variables.

The SecureStore dependency and Expo config plugin are registered. Seven mocked
storage tests cover saving, reading, absence, removal, and failures for each
operation. Together with eight client tests, one ApiError test, six auth-helper
tests, thirteen session tests, six reducer tests, fourteen provider tests, four
status tests, and four gate tests, the mobile suite contains 63 passing tests
across nine suites; TypeScript checking also passes.

```bash
npm test -- token-storage.test.ts --runInBand
```

These tests do not verify native device storage. A real-device save/read/remove
smoke check, app-restart persistence verification, login/logout UI integration,
device restoration error/retry verification, handling expiry during later API requests,
and automatic authorization headers remain pending.

## CI and merge requirements

Mobile CI runs on pull requests targeting main and pushes to main, using Node
24, `npm ci`, `npm test -- --ci --runInBand`, and `npx tsc --noEmit`.
PR #41 passed both workflows and is merged. Main-branch protection requires
`Tests, Ruff, and mypy` and `Mobile Tests and TypeScript`, with branches up to
date before merging. Protection applies to administrators too. These settings
were verified through GitHub; they are repository settings, not workflow YAML.
Neither workflow uses path filters, so required checks run for every PR to main.

## Dependency follow-up

The generated SDK 57 starter reported 14 moderate affected packages, tracing
to `uuid` and `decode-uri-component`. Re-audit this app's dependency tree before
release and review compatible fixes. Do not blindly run `npm audit fix --force`:
the starter audit proposed incompatible Expo downgrades.

## Planned screens

```text
app/index.tsx                 Recipe Library
app/import.tsx                Import Recipe
app/import-preview.tsx        Import Preview / Edit Recipe
app/recipes/[id].tsx          Recipe Detail / Cooking View
app/recipes/[id]/edit.tsx     Edit Recipe
app/settings.tsx              Settings / Account
```
