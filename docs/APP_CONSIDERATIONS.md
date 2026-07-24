# App Considerations Tracker

This file tracks product, technical, security, legal, and UX considerations for Recipe Library so they do not get lost during implementation.

## Highest-priority decisions already accepted

1. **Build manual recipe creation before URL import.** Manual create/edit keeps the app useful even when scraping fails and gives the backend/mobile app a stable foundation before the import pipeline is added.
2. **Add secure URL fetching / SSRF protection to the import plan.** A user-submitted URL must never allow the backend to access internal services, private IPs, cloud metadata endpoints, unsupported schemes, oversized responses, or redirect chains that lead somewhere unsafe.
3. **Treat imported recipes as editable drafts with attribution, not copied public content.** The importer should return a draft. The user reviews/edits it before saving. The saved recipe should retain the source URL and source domain.
4. **Scope every recipe query by user.** Every recipe, note, tag, and import lookup must be filtered by the authenticated user or by a parent record owned by that user.

## Full considerations list

### 1. Import is best-effort, not guaranteed

Recipe websites vary widely. Some expose structured recipe data, some do not, some require JavaScript, and some block automated requests.

Implementation notes:

- Import statuses should include `success`, `partial`, `failed`, `blocked`, and `duplicate`.
- The importer should return an editable draft, not save final records automatically.
- Missing fields should become warnings, not crashes.
- Failed imports should offer manual entry and a link back to the original URL.

### 2. Scraping must be responsible

The app should fetch pages carefully and respectfully.

Implementation notes:

- Respect `robots.txt` where practical.
- Use a clear app user agent.
- Do not bypass bot protection.
- Set request timeouts.
- Limit redirects.
- Limit response size.
- Avoid repeated imports of the same URL without reason.
- Save attribution with `source_url` and `source_domain`.

### 3. URL import needs SSRF protection

Because users can submit arbitrary URLs, safe fetching must be treated as a security feature, not just a helper function.

Block or reject:

- `localhost`
- Loopback addresses such as `127.0.0.1`
- Private/internal IP ranges
- Cloud metadata IPs
- Internal hostnames
- Unsupported schemes such as `file://` and `ftp://`
- Too many redirects
- Redirects that resolve to unsafe destinations
- Oversized responses
- Non-HTML responses for MVP

Suggested backend service:

```text
backend/app/services/safe_fetcher.py
```

### 4. Scope every recipe query by user

Every user-owned query must be scoped to the authenticated user.

Examples:

```sql
SELECT *
FROM recipes
WHERE id = :recipe_id
AND user_id = :current_user_id;
```

This applies to:

- Recipe list
- Recipe detail
- Recipe update
- Recipe delete
- Recipe search/filter
- Notes CRUD
- Tags CRUD
- Import logs
- Duplicate URL checks

Required tests:

- User A cannot read User B's recipe.
- User A cannot update User B's recipe.
- User A cannot delete User B's recipe.
- User A cannot read or mutate User B's notes, tags, or import logs.

### 5. Decide auth strategy early, but do not build it first

Auth is required for the MVP, but it does not have to be the first feature implemented.

Recommended MVP auth:

- Email/password registration
- Password hashing on the backend
- Login returning an access token
- Protected recipe, note, tag, and import endpoints
- Current-user dependency in FastAPI

Recommended implementation order:

1. Manual recipe CRUD with a temporary dev user.
2. Ingredient scaling.
3. Import preview.
4. Auth.
5. User-scoped records and ownership tests.

### 6. Ingredient scaling needs clear limits

Ingredient scaling should be best-effort and conservative.

Rules:

- Preserve `original_text` forever.
- Scale only ingredients the app can confidently parse.
- Leave unclear ingredient lines unchanged.
- Support `scale_locked` for lines that should not scale.

Hard cases to leave unchanged at first:

- `salt to taste`
- `1-2 cloves garlic`
- `a pinch of pepper`
- `one 14-ounce can tomatoes`
- `zest of 1 lemon`
- `optional parsley`

### 7. Manual recipe entry is an MVP safety net

Manual entry should be part of the core product, not a fallback added much later.

Benefits:

- Useful when import fails.
- Supports family/personal recipes.
- Lets backend CRUD and mobile UI be built before scraping.
- Makes the app useful even if no scraper exists yet.

### 8. Add duplicate URL detection

Users may paste the same recipe URL multiple times.

MVP behavior:

- Detect whether the current user already has a recipe with the same normalized `source_url`.
- Offer to open the existing recipe or import as a copy.

Later behavior:

- Optional update flow for replacing fields on an existing recipe.

### 9. Add import logs for debugging

Import failures will happen often enough that logs are valuable.

Track:

- `user_id`
- `recipe_id`, nullable
- `source_url`
- `source_domain`
- `status`
- `parser_used`
- `warnings`
- `error_message`
- `created_at`

Later:

- Limited raw structured metadata in JSON/JSONB.
- Parser confidence.
- Import duration.

### 10. Do not render scraped HTML

The app should extract text and structured data, not display raw scraped HTML.

Allowed:

- Plain-text title
- Plain-text ingredients
- Plain-text instructions
- Plain-text source tips
- Source URL link

Avoid:

- Raw HTML snippets
- Scripts
- Scraped page styling
- Embedded third-party page content

### 11. Keep source attribution and avoid public sharing in MVP

MVP should be a private personal recipe library.

Rules:

- Save `source_url`.
- Save `source_domain`.
- Show a link back to the original recipe.
- Do not build public recipe sharing in MVP.
- Do not present the app as a public scraped recipe database.

### 12. Mobile cooking UX needs special care

Recipe detail should be usable while cooking.

Consider:

- Large readable text
- Ingredient checkboxes
- Step checkboxes
- Clear `1x`, `2x`, `3x` scaling controls
- Notes available but not distracting
- Edit action present but not easy to tap accidentally
- Original source link available but secondary
- Keep-screen-awake later

### 13. Organization can expand beyond tags later

MVP organization:

- Tags
- Favorites
- Search
- Time filter

Later organization:

- Recently cooked
- Meal type
- Cuisine
- Diet labels
- Main ingredient
- Source site
- Collections/folders

### 14. Search should be phased

MVP search:

- Recipe title
- Ingredients
- Tags
- Favorite status
- Max total time

Later search:

- Instructions
- Notes
- Source domain
- Full-text search
- Fuzzy/typo-tolerant search

Important design rule:

- Keep searchable fields queryable in tables, not buried only in one large JSON blob.

### 15. Offline mode is useful but not MVP

Offline access is attractive for cooking, but sync adds complexity.

Later feature:

- Offline read access to recently opened or saved recipes.

Not MVP:

- Full offline create/edit sync.
- Conflict resolution.
- Image caching strategy.

### 16. Image handling should start simple

MVP:

- Store `image_url` when available.
- Allow it to be nullable.
- Display a remote image when present.

Later:

- User-uploaded recipe photos.
- Image caching.
- Image proxying/resizing.
- Object storage.

### 17. Add privacy and deletion planning

Saved recipes can reveal user preferences and habits.

Future account/data controls:

- Export recipes.
- Delete account.
- Delete all recipes.
- Delete import history.

MVP design implication:

- Keep records related by user so deletion is straightforward later.

### 18. Observability matters because imports fail

Track import behavior from the beginning, even if only through logs and the `recipe_imports` table.

Useful signals:

- Import success rate
- Partial import rate
- Failed import rate
- Blocked domains
- Common parser errors
- Average import duration

### 19. Add rate limiting before public deployment

Rate limits are especially important for:

- `POST /api/v1/imports/preview`
- `POST /api/v1/auth/login`
- `POST /api/v1/auth/register`

MVP note:

- Document rate limiting early.
- Implement before a public deployment.

### 20. Decide what “tips” means

Keep source tips and personal user notes separate.

Recommended fields:

```text
source_tips -> extracted from the recipe site, editable
user_notes  -> personal notes written by the user
```

Do not mix source tips and user notes into the same table or field.

## Implementation reminder for Codex

When unsure, prioritize safety and user control:

1. Manual entry works even without scraping.
2. Imports produce editable drafts.
3. User-owned queries are scoped by the authenticated user.
4. Unsafe URLs are rejected before fetching.
5. Original ingredient text and source attribution are preserved.
