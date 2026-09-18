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
Caller-provided headers are preserved. Unsuccessful HTTP responses throw an
error containing the status code; network errors propagate unchanged.
Successful JSON responses are parsed; 204 responses return undefined without
parsing. The return type is `Promise<T | undefined>`; the generic type is an
expectation, not runtime response validation.

From `mobile/`:

```bash
npm test -- --runInBand
npx tsc --noEmit
```

Use `npm run test:watch` during development. Jest uses the jest-expo preset;
client tests mock fetch rather than calling the backend. Seven tests cover JSON
responses, default/preserved headers, HTTP errors, network errors, and 204
responses. Each JSON mock creates a fresh Response; spies are restored between
tests. Authentication flow integration and richer API-error handling remain
separate follow-up work.

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
failures. The caller will coordinate token storage and authentication state;
the backend validates tokens. Six tests mock apiFetch to cover successful
requests, empty responses, and failures for both helpers.

```bash
npm test -- auth.test.ts --runInBand
```

Login screens, registration, logout orchestration, and session restoration are
not implemented. These helper tests do not establish end-to-end authentication.

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
operation. Together with seven client tests and six auth-helper tests, the
mobile suite contains 20 passing tests; TypeScript checking also passes.

```bash
npm test -- token-storage.test.ts --runInBand
```

These tests do not verify native device storage. A real-device save/read/remove
smoke check, app-restart persistence verification, login/logout integration,
expired-token handling, and automatic authorization headers remain pending.

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
