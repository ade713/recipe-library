# Codex Handoff Brief: Recipe Library

## 1. App goal

Build a mobile-first recipe-saving app that helps users turn recipe links into a clean, searchable personal recipe library.

The app should let a user paste a recipe URL, import the useful recipe information when the site can be accessed responsibly, return an editable draft, and save the cleaned-up recipe to the user's account. The app should also support manual recipe creation so the product remains useful when import fails or when a user wants to save a family recipe.

The app should remove the pain of scrolling through long recipe pages by extracting and organizing the useful parts:

- Recipe name
- Ingredients
- Prep/cook/total time
- Instructions
- Servings/yield
- Image URL, if available
- Source tips, if available
- Source URL and source domain
- User notes
- Tags/favorites

The app should support portion scaling such as `1x`, `2x`, and `3x`, while preserving the original ingredient text and only scaling ingredients the app can confidently parse.

## 2. Target users

Primary users are people who find recipes online and want a convenient personal place to save, clean up, search, and reuse them.

They likely have recipe links from:

- Food blogs
- Search results
- Social media
- Shared links from friends/family
- Cooking websites

Their core pain point is that recipe pages are often long and inconvenient while cooking. They want the practical recipe details in one clean view, while still being able to return to the original source when needed.

## 3. Key product decisions

These decisions should guide implementation. See `docs/APP_CONSIDERATIONS.md` for the full considerations tracker:

1. **Manual recipe creation is part of the MVP.** Build manual create/edit before URL import so the app is useful even before scraping works.
2. **Recipe imports are editable drafts.** The backend should never blindly save scraped content as final. The user reviews and owns the final saved version.
3. **URL fetching must be safe and responsible.** The import service must include safe-fetch protections, including SSRF prevention, timeouts, redirect limits, response-size limits, and respectful handling of blocked/disallowed sites.
4. **Every user-facing query must be user-scoped.** Recipes, notes, tags, imports, search results, filters, favorites, and duplicate URL checks must be scoped to the current authenticated user.
5. **Source attribution is required.** Save the original source URL and source domain whenever available.
6. **Public recipe sharing is not an MVP goal.** The MVP is a private personal recipe library.
7. **Ingredient scaling is best-effort.** Preserve `original_text` and leave unclear ingredient lines unchanged.

## 4. Updated MVP definition

The MVP is:

```text
A user can create an account, manually create a recipe, paste a recipe URL,
receive an editable imported draft when supported, save the recipe, view it
later, search/filter recipes, scale confidently parsed ingredients by 1x/2x/3x,
add personal notes, and always access the original source link.
```

## 5. Core features

### MVP features

1. User can create an account and sign in.
2. User can manually create a recipe.
3. User can edit manually created or imported recipes.
4. User can paste a recipe URL.
5. Backend validates the URL and fetches it safely.
6. Backend imports recipe data from the URL when supported.
7. Backend returns an editable draft instead of immediately saving it.
8. User can preview imported recipe data before saving.
9. User can edit title, ingredients, instructions, times, servings, source tips, and tags.
10. User can save the recipe to their account.
11. User can view a list of saved recipes.
12. User can search recipes by title and ingredient.
13. User can filter recipes by tag and favorite status.
14. User can open a recipe detail/cooking view.
15. User can scale confidently parsed ingredients by `1x`, `2x`, and `3x`.
16. User can add, edit, and delete personal notes.
17. User can favorite/unfavorite recipes.
18. User can access the original source URL.
19. User gets a useful failure path when import fails: try again, enter manually, or open the source URL.
20. User cannot access another user's recipes, notes, tags, or imports.

### Nice-to-have later features

- Grocery list generation
- Meal planning calendar
- Nutrition estimates
- Browser extension
- Offline mobile mode
- Public recipe sharing, after legal/product review
- AI-assisted recipe cleanup
- Recipe import from screenshot/PDF
- Cook mode with step-by-step screen and keep-awake behavior
- Fuzzy search and typo tolerance
- User-uploaded recipe photos
- Export recipes
- Delete account/data export controls

## 6. Tech stack

### Backend

- Python
- FastAPI
- Pydantic / Pydantic Settings
- SQLAlchemy ORM
- Alembic migrations
- PostgreSQL for the real app
- SQLite may be used for small tests or early local experiments
- pytest for tests
- httpx for fetching pages
- recipe-scrapers for first-pass recipe extraction
- BeautifulSoup as a fallback parser helper
- Uvicorn for local development

### Mobile app

- React Native
- Expo
- TypeScript
- TanStack Query for server state
- React Hook Form for forms
- Expo Router or React Navigation

### Desktop/web app later

- React
- TypeScript
- Vite
- Shared API client or OpenAPI-generated client

### Development tooling

- Docker Compose for local Postgres
- Ruff for Python linting/formatting
- pytest for tests
- `.env` files for local configuration

## 7. Data model

Use normalized relational tables for user-facing recipe data. Use JSON/JSONB fields only for flexible import metadata and parser diagnostics.

### users

```text
users
- id UUID primary key
- email string unique required
- password_hash string required
- created_at datetime
- updated_at datetime
```

### recipes

```text
recipes
- id UUID primary key
- user_id UUID foreign key -> users.id
- title string required
- description text nullable
- source_url text nullable
- source_domain string nullable
- source_site_name string nullable
- source_author string nullable
- image_url text nullable
- prep_time_minutes integer nullable
- cook_time_minutes integer nullable
- total_time_minutes integer nullable
- base_servings numeric nullable
- servings_unit string nullable          # servings, cookies, loaf, etc.
- difficulty string nullable
- is_favorite boolean default false
- import_status string                   # manual, imported, edited
- created_at datetime
- updated_at datetime
```

### recipe_ingredients

```text
recipe_ingredients
- id UUID primary key
- recipe_id UUID foreign key -> recipes.id
- position integer required
- original_text text required
- quantity numeric nullable
- quantity_text string nullable          # e.g. "1 1/2", "1-2"
- unit string nullable                   # e.g. cup, tbsp, g
- name string nullable                   # e.g. flour
- preparation_note string nullable       # e.g. chopped, melted
- is_optional boolean default false
- scale_locked boolean default false
- parse_status string                    # parsed, partial, unparsed
```

### recipe_steps

```text
recipe_steps
- id UUID primary key
- recipe_id UUID foreign key -> recipes.id
- position integer required
- instruction text required
- section_title string nullable
```

### recipe_tips

These are source-site tips or author notes extracted from the recipe page. Keep them separate from personal user notes.

```text
recipe_tips
- id UUID primary key
- recipe_id UUID foreign key -> recipes.id
- position integer required
- tip text required
```

### recipe_notes

These are private user-written notes.

```text
recipe_notes
- id UUID primary key
- recipe_id UUID foreign key -> recipes.id
- user_id UUID foreign key -> users.id
- note text required
- created_at datetime
- updated_at datetime
```

### tags

```text
tags
- id UUID primary key
- user_id UUID foreign key -> users.id
- name string required
- created_at datetime
```

### recipe_tags

```text
recipe_tags
- recipe_id UUID foreign key -> recipes.id
- tag_id UUID foreign key -> tags.id
```

### recipe_imports

```text
recipe_imports
- id UUID primary key
- user_id UUID foreign key -> users.id
- recipe_id UUID nullable foreign key -> recipes.id
- source_url text required
- source_domain string nullable
- parser_used string nullable            # recipe-scrapers, json-ld, fallback, manual
- status string required                 # success, partial, failed, blocked, duplicate
- raw_data json/jsonb nullable           # parser output or structured metadata, not full page HTML by default
- warnings json/jsonb nullable
- error_message text nullable
- created_at datetime
```

### Important data rules

- Every user-facing row must be scoped to `user_id` either directly or through its parent recipe.

#### Ownership query rule

Every endpoint that accepts a `recipe_id`, `note_id`, `tag_id`, or `import_id` must verify ownership through the current authenticated user. For example, `GET /recipes/{recipe_id}` should query by both `recipe_id` and `current_user.id`, not by `recipe_id` alone. Search, filters, favorites, notes, tags, and imports must also be scoped to the current user.
- Preserve original ingredient text even when parsed fields exist.
- Use parsed ingredient fields for portion scaling and search.
- Keep source tips separate from user notes.
- Keep import logs separate from saved recipes.
- Do not store full raw webpage HTML by default.
- Use JSON/JSONB for warnings, parser metadata, and limited raw structured data.

## 8. API/routes

Base path:

```text
/api/v1
```

### Health

```http
GET /health
```

### Auth

```http
POST /auth/register
POST /auth/login
POST /auth/logout
GET  /auth/me
```

### Recipes

Manual recipe CRUD should be implemented before scraping/import.

```http
GET    /recipes
POST   /recipes
GET    /recipes/{recipe_id}
PATCH  /recipes/{recipe_id}
DELETE /recipes/{recipe_id}
```

Supported query params for `GET /recipes`:

```text
q=chicken
tag=Dinner
favorite=true
max_total_time=30
ingredient=garlic
sort=recent
```

`POST /recipes` should accept a full manually entered recipe payload with title, ingredients, steps, tips, tags, times, servings, favorite status, and optional source URL.

### Recipe import

```http
POST /imports/preview
POST /imports/{import_id}/save
GET  /imports/{import_id}
```

`POST /imports/preview` accepts:

```json
{
  "url": "https://example.com/recipe"
}
```

It returns an editable recipe draft when import succeeds or partially succeeds:

```json
{
  "import_id": "uuid",
  "status": "success",
  "parser_used": "recipe-scrapers",
  "draft": {
    "title": "Garlic Butter Chicken",
    "source_url": "https://example.com/recipe",
    "source_domain": "example.com",
    "source_site_name": "Example Recipes",
    "image_url": "https://example.com/image.jpg",
    "prep_time_minutes": 10,
    "cook_time_minutes": 25,
    "total_time_minutes": 35,
    "base_servings": 4,
    "servings_unit": "servings",
    "ingredients": [
      {
        "position": 1,
        "original_text": "4 chicken thighs",
        "quantity": 4,
        "unit": null,
        "name": "chicken thighs",
        "parse_status": "parsed"
      }
    ],
    "steps": [
      {
        "position": 1,
        "instruction": "Season the chicken."
      }
    ],
    "tips": []
  },
  "warnings": []
}
```

It should return a clear error response when import fails or is blocked:

```json
{
  "import_id": "uuid",
  "status": "blocked",
  "draft": null,
  "warnings": ["This site could not be imported responsibly."],
  "next_actions": ["enter_manually", "open_source_url"]
}
```

Allowed import statuses:

```text
success     # enough data found to create a useful draft
partial     # some data found; user must fill gaps
failed      # no recipe could be extracted
blocked     # disallowed by safety/access checks or site blocking
duplicate   # user already saved this source URL
```

### Notes

```http
GET    /recipes/{recipe_id}/notes
POST   /recipes/{recipe_id}/notes
PATCH  /recipes/{recipe_id}/notes/{note_id}
DELETE /recipes/{recipe_id}/notes/{note_id}
```

### Tags

```http
GET    /tags
POST   /tags
PATCH  /tags/{tag_id}
DELETE /tags/{tag_id}
```

### Temporary learning endpoint

A temporary endpoint can be used while learning FastAPI before the full recipe API is complete:

```http
POST /ingredients/scale-preview
```

This endpoint should be removed or hidden later if it is not part of the product.

## 9. UI screens

Mobile first. Desktop/web comes later.

### Screen 1: Recipe Library

Purpose: show saved recipes.

Elements:

- Search bar
- Import Recipe button
- Create Manually button
- Filter chips: All, Favorites, Dinner, Quick, Chicken, Vegetarian
- Recipe cards with image, title, total time, servings, tags, favorite icon
- Empty state when no recipes exist

### Screen 2: Import Recipe

Purpose: paste URL and start import.

Elements:

- URL input
- Import Recipe button
- Loading state while import runs
- Error state if import fails
- Partial success warning if some fields are missing
- Manual entry fallback button
- Open original URL fallback button when safe/applicable

### Screen 3: Import Preview / Edit Recipe

Purpose: review and edit imported recipe before saving.

Elements:

- Editable title
- Source URL/domain display
- Image preview
- Prep/cook/total time fields
- Servings field
- Editable ingredients list
- Editable instructions list
- Editable source tips list
- Tag picker
- Save Recipe button

### Screen 4: Manual Recipe Create/Edit

Purpose: create or edit a recipe without scraping.

Elements:

- Title field
- Optional source URL field
- Optional image URL field
- Prep/cook/total time fields
- Servings field
- Editable ingredients list
- Editable instructions list
- Editable tips list
- Tag picker
- Favorite toggle
- Save button

### Screen 5: Recipe Detail / Cooking View

Purpose: clean cooking view.

Elements:

- Title
- Source link
- Favorite toggle
- Portion scaler: 1x, 2x, 3x
- Time summary
- Ingredients with optional checkboxes
- Instructions in numbered order
- Source tips section
- User notes section
- Edit recipe button

### Screen 6: Search / Filter

Can be part of the Recipe Library screen for MVP.

Filters:

- Search text
- Tags
- Favorites only
- Max total time
- Ingredient contains
- Sort by newest/title/time

### Screen 7: Settings / Account

MVP can be minimal:

- Current user email
- Logout
- App version

## 10. Authentication requirements

MVP auth should be simple and portfolio-friendly:

- Email/password registration
- Password hashing on the backend
- Login endpoint returns an access token
- Protected recipe/note/tag/import endpoints
- User can only access their own recipes, notes, tags, and imports
- Token stored securely by the client

Do not implement social login in MVP.

Recommended backend approach:

- `users` table with `email` and `password_hash`
- FastAPI dependency such as `get_current_user`
- Access token auth
- Tests for "user cannot access another user's recipe"

Implementation note: auth is required for MVP, but it does not need to be the first feature built. It is fine to build manual recipe CRUD with a temporary dev user first, then add real auth and ownership checks.

## 11. Constraints and non-goals

### Constraints

- The user wants to learn Python and should type core implementation code manually.
- Codex should guide, test, review, and debug rather than build everything automatically.
- Backend should be API-first for mobile and desktop/web clients.
- Manual recipe creation should be built before URL import.
- Imported recipe data should be treated as a draft, not automatically trusted.
- Keep the original source URL and source domain for attribution and fallback.
- Respect website access limitations and `robots.txt` when possible.
- Do not try to bypass bot protection.
- Do not render raw scraped HTML in the app.
- Do not store full webpage HTML by default.
- Only scale ingredients when parsing is confident.
- Store original ingredient text even when parsed fields exist.
- All recipe, note, tag, and import queries must be scoped to the current user.

### Safe URL fetching requirements

The importer must not fetch arbitrary unsafe targets. The safe fetcher should:

- Allow only `http://` and `https://` URLs.
- Reject `file://`, `ftp://`, and other schemes.
- Reject localhost and loopback hosts.
- Reject private/internal IP ranges.
- Reject cloud metadata IPs such as `169.254.169.254`.
- Resolve hostnames and verify that resolved IPs are public.
- Re-check redirects before following them.
- Limit redirects.
- Set connection/read timeouts.
- Limit maximum response size.
- Prefer HTML responses.
- Use a clear user agent.
- Rate-limit import attempts per user before public deployment.
- Save import failures and warnings to `recipe_imports`.

### Non-goals for MVP

- Public recipe sharing
- Social features
- Nutrition calculation
- Grocery list generation
- Meal planning calendar
- Offline sync
- AI rewriting
- Browser extension
- Import from image/PDF
- Payment/subscription system
- Bypassing paywalls, login walls, anti-bot systems, or site restrictions

## 12. Learning plan

The app should be built in a way that teaches Python gradually.

### Learning mode rule

The user types implementation code. Codex provides:

- Concept explanation
- Small tasks
- Skeletons/TODOs
- Tests
- Hints
- Debugging help
- Code review
- Quizzes/reflection

### Stage 1: Pure Python utilities

Build these before the database or full API:

```text
app/services/scaling.py
app/services/ingredient_parser.py
app/services/url_validator.py
```

Concepts:

- Functions
- Type hints
- Strings
- Lists
- Dictionaries
- `None`
- Conditionals
- Exceptions
- `fractions.Fraction`
- Unit tests with pytest

Tasks:

1. Scale simple ingredient lines.
2. Parse fractions like `1/2` and `1 1/2`.
3. Extract URL domain.
4. Return unchanged text when parsing is not confident.

### Stage 2: URL validation and safe-fetch concepts

Build URL validation before real scraping:

```text
app/services/url_validator.py
app/services/safe_fetcher.py
```

Concepts:

- URL parsing
- Schemes and hostnames
- DNS/IP safety checks
- Exceptions
- Timeouts
- Defensive programming
- Tests for dangerous inputs

Tasks:

1. Validate only HTTP/HTTPS URLs.
2. Reject localhost/private/internal targets.
3. Extract source domain.
4. Write tests for unsafe URLs.
5. Add a safe-fetch skeleton before actual web requests.

### Stage 3: Pydantic schemas

Learn request/response modeling:

- `BaseModel`
- Nested models
- Optional fields
- Lists of models
- Validation errors

### Stage 4: FastAPI basics

Build:

- `GET /health`
- `POST /ingredients/scale-preview`
- Simple recipe draft endpoint without database

Concepts:

- Route handlers
- Request bodies
- Response models
- HTTP status codes
- Error handling

### Stage 5: Database basics

Build:

- SQLAlchemy models
- Alembic migrations
- Manual recipe CRUD
- Notes
- Tags

Concepts:

- Tables
- Relationships
- Foreign keys
- Queries
- Transactions
- Migrations

### Stage 6: Auth and ownership

Build:

- Register
- Login
- Current user dependency
- Protected routes
- User ownership checks

### Stage 7: Import pipeline

Build:

- Safe URL validation
- Safe HTML fetching
- Extract recipe data
- Normalize into draft
- Save import logs
- Return warnings when partial
- Return manual-entry fallback when failed/blocked

### Stage 8: Search/filter

Build:

- Title search
- Ingredient search
- Tag filter
- Favorite filter
- Sort options

### Stage 9: Mobile app

Build screens after the backend has stable endpoints:

- Recipe Library
- Manual Recipe Create/Edit
- Import Recipe
- Import Preview
- Recipe Detail
- Notes

## 13. Step-by-step implementation plan

### Phase 0: Repo setup

Already started in this scaffold.

Done when:

- Backend app imports successfully.
- `GET /api/v1/health` works.
- Project has `AGENTS.md`, `CODEX_HANDOFF.md`, and docs.

### Phase 1: Ingredient scaling kata

Goal: learn Python through a useful app feature.

Steps:

1. Open `backend/app/services/scaling.py`.
2. Open `backend/tests/test_scaling.py`.
3. Ask Codex to explain the function goal.
4. Remove the skip marker from the tests.
5. Implement support for simple quantities.
6. Add support for fractions.
7. Leave unclear ingredients unchanged.
8. Ask Codex to review your code.

Done when:

- Scaling tests pass.
- User understands the function.
- Codex has reviewed the diff.

### Phase 2: URL validator, domain extraction, and safe-fetch skeleton

Steps:

1. Implement `is_valid_http_url`.
2. Implement `extract_domain`.
3. Add tests for invalid URLs and domains.
4. Add tests for dangerous URLs such as localhost, private IPs, non-HTTP schemes, and cloud metadata IPs.
5. Create a `safe_fetcher.py` skeleton with TODOs for timeouts, redirect checks, response-size limits, and content-type checks.

Done when:

- Invalid URLs are rejected.
- Domain extraction works for common URLs.
- Dangerous internal/private targets are rejected before any fetch attempt.
- The safe-fetch requirements are documented in tests/TODOs.

### Phase 3: Pydantic recipe draft schemas

Steps:

1. Define `IngredientDraft`.
2. Define `RecipeStepDraft`.
3. Define `RecipeDraft`.
4. Define `RecipeImportPreviewResponse`.
5. Include fields for source URL, source domain, source site name, source tips, and warnings.

Done when:

- Schemas validate a realistic manual recipe draft and imported recipe draft.
- Tests cover missing optional fields.

### Phase 4: FastAPI preview utility endpoint

Steps:

1. Add `POST /ingredients/scale-preview` or a temporary learning endpoint.
2. Send ingredient text and multiplier.
3. Return scaled result.

Done when:

- User can test it in `/docs`.

### Phase 5: Database models and migrations

Steps:

1. Configure SQLAlchemy engine/session.
2. Create `users`, `recipes`, `recipe_ingredients`, `recipe_steps`, `recipe_tips`, `recipe_notes`, `tags`, `recipe_tags`, `recipe_imports` models.
3. Configure Alembic.
4. Create first migration.

Done when:

- Migration creates tables in local Postgres.

### Phase 6: Manual recipe CRUD

Build this before URL import.

Steps:

1. Create recipe manually.
2. List recipes for current user or temporary dev user.
3. Get recipe detail.
4. Update recipe.
5. Delete recipe.
6. Add source URL field as optional.
7. Add source tips and user notes as separate concepts.

Done when:

- Basic recipe library works without scraping.
- Manual recipe creation can be used as fallback for failed imports.

### Phase 7: Notes and tags

Steps:

1. Add notes endpoints.
2. Add tag endpoints.
3. Add tag filtering.

Done when:

- User can add notes to a recipe.
- User can filter recipes by tag.

### Phase 8: Auth and ownership checks

Steps:

1. Register user.
2. Hash password.
3. Login and return token.
4. Protect recipe endpoints.
5. Add ownership checks for recipes, notes, tags, and imports.
6. Add tests that one user cannot access another user's objects.

Done when:

- Users can only see their own recipes, notes, tags, and imports.

### Phase 9: Safe import preview

Steps:

1. Use the URL validator and safe fetcher.
2. Check duplicate source URL for the current user.
3. Fetch recipe URL with safe timeout, redirect limit, and size limit.
4. Use `recipe-scrapers` for first parse attempt.
5. Fallback to structured data/basic parser later.
6. Normalize result into `RecipeDraft`.
7. Save import log.
8. Return draft and warnings.
9. Return manual-entry fallback when failed or blocked.

Done when:

- User can paste a URL and receive a draft recipe when supported.
- Failed/blocked imports are handled clearly.
- No unsafe URL target is fetched.

### Phase 10: Save imported recipe

Steps:

1. Accept edited draft from client.
2. Save recipe, ingredients, steps, source tips, tags.
3. Link saved recipe to import log.
4. Preserve source URL/domain.

Done when:

- Imported recipe appears in saved recipe library.
- Saved result reflects the user's edited draft, not unreviewed scrape output.

### Phase 11: Search/filter

Steps:

1. Search by title.
2. Search by ingredient.
3. Filter by favorite.
4. Filter by tag.
5. Filter by max total time.

Done when:

- Recipe list supports the MVP query params.

### Phase 12: Mobile MVP

Steps:

1. Set up Expo app.
2. Build Recipe Library screen.
3. Build Manual Recipe Create/Edit screen.
4. Build Import Recipe screen.
5. Build Import Preview screen.
6. Build Recipe Detail screen.
7. Build Notes UI.
8. Connect to backend with typed API client.

Done when:

- Mobile app can manually create, import, edit, save, view, search, scale, and note recipes.

## 14. Definition of done for MVP

The MVP is done when:

- User can register and log in.
- User can manually create a recipe.
- User can paste a recipe URL.
- Backend validates and fetches URLs safely.
- Backend returns an editable recipe draft when import succeeds or partially succeeds.
- Backend gives a clear manual-entry fallback when import fails or is blocked.
- User can edit imported fields before saving.
- User can save a recipe.
- User can view saved recipes.
- User can search by title and ingredient.
- User can filter by tag and favorite.
- User can open a clean recipe detail/cooking view.
- User can scale confidently parsed ingredients by `1x`, `2x`, and `3x`.
- Unclear ingredients remain unchanged during scaling.
- User can add/edit/delete personal notes.
- User can access the original source URL.
- Users cannot access each other's recipes, notes, tags, or imports.
- Backend tests cover core services and API routes.
- README explains how to run the app.
- Codex handoff and learning docs are kept updated.

## 15. First task Codex should start with

Start with the pure Python ingredient scaling kata.

Prompt:

```text
I am learning Python by building this recipe app. Read AGENTS.md and CODEX_HANDOFF.md first.

Start with Phase 1: Ingredient scaling kata.
Do not write the implementation for me yet.

Please:
1. Explain the goal of `scale_ingredient_line`.
2. Explain the Python concepts I need: strings, splitting, numbers, fractions, conditionals, and return values.
3. Walk me through the tests in `backend/tests/test_scaling.py`.
4. Tell me which skip marker to remove.
5. Give me Hint 1 only.
6. Wait for me to type the implementation.
```

Expected first function:

```python
def scale_ingredient_line(line: str, multiplier: float) -> str:
    """Return a scaled ingredient line when the leading quantity can be parsed.

    Examples:
    - "2 cups flour", 2 -> "4 cups flour"
    - "1/2 tsp salt", 2 -> "1 tsp salt"
    - "3 eggs", 3 -> "9 eggs"
    - "salt to taste", 2 -> "salt to taste"
    """
```

## 16. Follow-up task after scaling

After Phase 1, Codex should guide the user through safe URL validation before any real scraping.

Prompt:

```text
I finished the ingredient scaling kata. Next, guide me through Phase 2: URL validation and safe-fetch planning.

Do not fetch any real URLs yet.
Please create tests and skeletons for:
- accepting only http/https URLs
- rejecting localhost
- rejecting private IP ranges
- rejecting non-http schemes
- extracting source domains
- documenting safe_fetcher TODOs

I want to type the implementation myself.
```
