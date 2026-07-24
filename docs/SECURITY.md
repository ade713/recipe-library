# Security Notes

## Highest-priority security concerns

1. User-submitted recipe URLs can create SSRF risk.
2. User-owned records must be scoped by the current user.
3. Auth endpoints and import endpoints need rate limiting before public deployment.
4. Scraped content should be extracted as text/data, not rendered as raw HTML.

## URL importer safety checklist

Before public deployment, implement and test:

- Only `http://` and `https://` schemes.
- Reject `localhost`, loopback, private/internal IP ranges, and cloud metadata IPs.
- Reject unsupported schemes such as `file://` and `ftp://`.
- Limit redirects and re-check the final destination.
- Set request timeout.
- Enforce max response size.
- Require HTML content type for MVP.
- Convert fetch failures into safe import statuses.
- Rate-limit import attempts per user.

## Object ownership checklist

Every endpoint that takes an ID must check ownership:

```text
recipe_id -> recipe.user_id == current_user.id
note_id   -> note.user_id == current_user.id
tag_id    -> tag.user_id == current_user.id
import_id -> import.user_id == current_user.id
```

Add tests proving that user A cannot access or mutate user B's records.


## User-scoped query checklist

Recipe list/search queries must include user scope, not only detail/update/delete endpoints.

Scope by current user for:

- Recipe list
- Recipe detail
- Recipe update
- Recipe delete
- Recipe search/filter
- Duplicate URL checks
- Notes CRUD
- Tags CRUD
- Import logs

Example query shape:

```sql
SELECT *
FROM recipes
WHERE user_id = :current_user_id;
```
