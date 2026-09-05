# Data Model

The app should use relational tables for core recipe data and JSON/JSONB fields only for flexible import metadata.

## Core tables

```text
users
recipes
recipe_ingredients
recipe_steps
recipe_tips
recipe_notes
tags
recipe_tags
recipe_imports
```

## Design principles

- Keep `recipes` as the main parent record.
- Manual recipes and imported recipes share the same recipe tables.
- Keep ingredients and steps in ordered child tables.
- Store original ingredient text even when parsed fields exist.
- Use parsed ingredient fields for portion scaling and search.
- Keep user notes separate from source-site tips.
- Keep import logs separate from saved recipes.
- Preserve import logs when a linked recipe is deleted by setting their nullable `recipe_id` reference to `NULL`.
- Use JSON/JSONB for warnings, parser metadata, and limited raw structured data.
- Do not store full raw webpage HTML by default.
- Scope all recipes, notes, tags, and imports to the current user.

## Import status values

```text
success
partial
failed
blocked
duplicate
```

See `CODEX_HANDOFF.md` for field-level details.
