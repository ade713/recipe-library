# MVP Decisions

## Current MVP definition

```text
A user can create an account, manually create a recipe, paste a recipe URL,
receive an editable imported draft when supported, save the recipe, view it
later, search/filter recipes, scale confidently parsed ingredients by 1x/2x/3x,
add personal notes, and always access the original source link.
```

## Four most important implementation decisions

1. Build manual recipe creation before URL import.
2. Add secure URL fetching / SSRF protection to the import plan.
3. Treat imported recipes as editable drafts with attribution, not copied public content.
4. Scope every recipe, note, tag, import, search, filter, and favorite query to the current authenticated user.

## Why these decisions matter

Manual creation keeps the app useful even if import is not yet implemented or a site cannot be imported. Safe fetching prevents the URL importer from becoming a security risk. Editable drafts make import failures and partial parses manageable while keeping the user in control of the saved recipe. User scoping prevents users from accessing another user's recipes or related data by guessing IDs or changing API parameters.

See `APP_CONSIDERATIONS.md` for the full checklist of product, security, scraping, data, and UX considerations.
