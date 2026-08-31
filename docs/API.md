# API Plan

Base path:

```text
/api/v1
```

## Health

```http
GET /health
```

## Auth

```http
POST /auth/register
POST /auth/login
POST /auth/logout
GET  /auth/me
```

Registration, login, JWT bearer authentication, and current-user lookup are implemented. Recipe, note, and tag endpoints require authentication and scope records to the current user. Logout validates the bearer token and returns 204; the client is responsible for deleting its stored token.

## Recipes

Manual recipe CRUD should be implemented before URL import.

```http
GET    /recipes
POST   /recipes
GET    /recipes/{recipe_id}
PATCH  /recipes/{recipe_id}
DELETE /recipes/{recipe_id}
```

`GET /recipes` supports user-scoped search, filters, and sorting:

```text
q=chicken
ingredient=garlic
tag=Dinner
favorite=true
max_total_time=30
sort=recent
```

Title and ingredient searches use case-insensitive partial matching. Tag filtering uses a case-insensitive exact match. `favorite` accepts `true` or `false`, and `max_total_time` must be a nonnegative integer.

When multiple search and filter parameters are supplied, recipes must match every condition. Results remain scoped to the authenticated user.

Supported sort values:

```text
recent  newest recipes first; default
title   case-insensitive title order from A to Z
time    shortest total time first; unknown times last
```

## Imports

Imports create editable drafts; they do not blindly save scraped content.

```http
POST /imports/preview
POST /imports/{import_id}/save
GET  /imports/{import_id}
```

Allowed import statuses:

```text
success
partial
failed
blocked
duplicate
```

Failed or blocked imports should return enough information for the client to show manual-entry and open-source-url fallback actions.

## Notes

```http
GET    /recipes/{recipe_id}/notes
POST   /recipes/{recipe_id}/notes
PATCH  /recipes/{recipe_id}/notes/{note_id}
DELETE /recipes/{recipe_id}/notes/{note_id}
```

## Tags

```http
GET    /tags
POST   /tags
PATCH  /tags/{tag_id}
DELETE /tags/{tag_id}
```

## Ownership rule

Every endpoint that uses `recipe_id`, `note_id`, `tag_id`, or `import_id` must verify that the object belongs to the current user.
