# Mobile App

React Native / Expo TypeScript app scaffold.

This folder is intentionally light for now. Build the backend first, then create the Expo app here.

Recommended future setup:

```bash
cd mobile
npx create-expo-app@latest . --template
npm install @tanstack/react-query react-hook-form
```

Planned screens:

```text
app/index.tsx                 Recipe Library
app/import.tsx                Import Recipe
app/import-preview.tsx        Import Preview / Edit Recipe
app/recipes/[id].tsx          Recipe Detail / Cooking View
app/recipes/[id]/edit.tsx     Edit Recipe
app/settings.tsx              Settings / Account
```
