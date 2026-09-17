# Mobile App

React Native / Expo SDK 57 app using TypeScript and Expo Router. The initial
Recipe Library screen and stack navigation run on a physical Android phone.
Other routes remain placeholders; backend integration is not connected yet.

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
