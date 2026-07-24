# Product Brief

Recipe Library is a mobile-first app for saving recipes into a clean personal library.

## Problem

Recipe pages can be long, cluttered, and inconvenient while cooking. Users want to save the recipe content they care about and access it later in a clean, searchable library. They also need a fallback when a website cannot be imported.

## Solution

A user can create recipes manually or paste a recipe URL. The backend imports recipe data when supported, normalizes it, returns an editable draft, and saves the cleaned-up version to the user's account.

## Updated MVP value proposition

A user can create an account, manually create a recipe, paste a recipe URL, receive an editable imported draft when supported, save the recipe, view it later, search/filter saved recipes, scale confidently parsed ingredients by `1x`, `2x`, and `3x`, add personal notes, and always access the original source link.

## Product principles

- Manual recipe entry is part of MVP.
- URL import is best-effort and returns an editable draft.
- Failed, blocked, partial, and duplicate imports should be handled gracefully.
- The app is a private personal recipe library first.
- Public recipe sharing is not part of MVP.


## Related planning docs

- `docs/APP_CONSIDERATIONS.md` tracks product, security, privacy, scraping, UX, and future-feature considerations.
