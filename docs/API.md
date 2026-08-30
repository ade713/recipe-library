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

`GET /recipes` supports case-insensitive partial title and ingredient searches:

```text
q=chicken
ingredient=garlic
```

When both parameters are supplied, recipes must match both conditions. Search results remain scoped to the authenticated user.

Planned filters and sorting:

```text
tag=Dinner
favorite=true
max_total_time=30
sort=recent
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
