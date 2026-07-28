# MVP Schedule

## Estimate

The working estimate for a private-testable Recipe Library MVP is:

- **14 weeks**
- **5 days per week**
- **3 focused hours per day**
- **Approximately 210 hours total**

This schedule includes 12 weeks of feature development followed by 2 weeks of
mobile integration, testing, documentation, and contingency.

The estimate assumes one developer is learning Python while typing and reviewing
the important backend code. URL importing and mobile integration are the largest
areas of uncertainty.

Alternative paces:

| Daily work | Weekly hours | Estimated duration |
| --- | ---: | ---: |
| 2 hours | 10 | 20–22 weeks |
| 3 hours | 15 | About 14 weeks |
| 4 hours | 20 | 10–12 weeks |
| 6 hours | 30 | 8–10 weeks |

## Daily working pattern

For a three-hour day:

1. Review the previous work and learn the next concept — 20 minutes.
2. Implement one small, bounded task — 100 minutes.
3. Write and run tests — 40 minutes.
4. Review the diff and update `LEARNING_LOG.md` — 20 minutes.

Friday should emphasize testing, cleanup, documentation, and review.

## Week 1 — Python and ingredient scaling

| Day | Work |
| --- | --- |
| Monday | Set up the backend, run existing tests, and understand the project structure and type hints. |
| Tuesday | Study strings, numeric parsing, conditionals, and return values. |
| Wednesday | Implement simple whole-number ingredient scaling. |
| Thursday | Add fraction and mixed-number support. |
| Friday | Test unclear ingredients, review the diff, and update the learning log. |

**Outcome:** Ingredient scaling works conservatively and is tested.

## Week 2 — URL validation

| Day | Work |
| --- | --- |
| Monday | Learn URL parsing, schemes, hostnames, and validation. |
| Tuesday | Accept HTTP/HTTPS URLs and reject unsupported schemes. |
| Wednesday | Extract and normalize source domains. |
| Thursday | Reject localhost, loopback, private IP, and metadata targets. |
| Friday | Add edge-case tests and review the implementation. |

**Outcome:** Unsafe URLs are rejected before fetching.

## Week 3 — Schemas and FastAPI fundamentals

| Day | Work |
| --- | --- |
| Monday | Learn Pydantic models, validation, nested models, and optional fields. |
| Tuesday | Create ingredient and instruction draft schemas. |
| Wednesday | Create recipe and import-preview schemas. |
| Thursday | Build the temporary scaling-preview endpoint. |
| Friday | Test request validation and API error responses. |

**Outcome:** The app has validated recipe shapes and a working learning endpoint.

## Week 4 — SQLAlchemy and database setup

| Day | Work |
| --- | --- |
| Monday | Start PostgreSQL and learn engines, sessions, tables, and migrations. |
| Tuesday | Create user and recipe models. |
| Wednesday | Create ingredient, instruction, and source-tip models. |
| Thursday | Create note, tag, recipe-tag, and import-log models. |
| Friday | Generate and test the initial Alembic migration. |

**Outcome:** The complete MVP schema can be created locally.

## Week 5 — Manual recipe creation

| Day | Work |
| --- | --- |
| Monday | Build recipe request and response schemas. |
| Tuesday | Implement repository creation with nested ingredients and instructions. |
| Wednesday | Add the manual recipe creation endpoint. |
| Thursday | Add validation and transaction handling. |
| Friday | Test successful and invalid recipe creation. |

**Outcome:** Recipes can be manually saved without URL importing.

## Week 6 — Recipe CRUD

| Day | Work |
| --- | --- |
| Monday | Implement recipe listing. |
| Tuesday | Implement recipe detail retrieval. |
| Wednesday | Implement recipe updates. |
| Thursday | Implement recipe deletion. |
| Friday | Test the CRUD lifecycle and review route/repository separation. |

**Outcome:** The basic recipe-library backend works.

## Week 7 — Notes, tags, and favorites

| Day | Work |
| --- | --- |
| Monday | Implement personal-note creation and listing. |
| Tuesday | Implement note editing and deletion. |
| Wednesday | Implement tag creation, listing, and renaming. |
| Thursday | Add tag deletion, recipe tagging, and favorite toggling. |
| Friday | Test tag ownership and ensure tag deletion does not delete recipes. |

**Outcome:** Recipes can be organized and annotated.

## Week 8 — Authentication

| Day | Work |
| --- | --- |
| Monday | Learn password hashing and token authentication. |
| Tuesday | Implement account registration. |
| Wednesday | Implement login and current-user retrieval. |
| Thursday | Protect recipe, note, tag, and import routes. |
| Friday | Test invalid credentials, missing tokens, and session behavior. |

**Outcome:** Users can register, sign in, and access protected routes.

## Week 9 — Ownership and search

| Day | Work |
| --- | --- |
| Monday | Scope every recipe query to the current user. |
| Tuesday | Scope notes, tags, imports, favorites, and duplicate checks. |
| Wednesday | Add cross-user access tests. |
| Thursday | Implement title and ingredient search. |
| Friday | Add tag, favorite, total-time filters, and sorting. |

**Outcome:** User data is isolated and searchable.

## Week 10 — Safe URL fetching

| Day | Work |
| --- | --- |
| Monday | Design the safe fetcher and its failure types. |
| Tuesday | Add connection and read timeouts. |
| Wednesday | Add redirect validation and redirect limits. |
| Thursday | Add response-size and content-type limits. |
| Friday | Test with mocked HTTP responses rather than relying on live sites. |

**Outcome:** The backend can fetch permitted HTML without exposing internal services.

## Week 11 — Import pipeline

| Day | Work |
| --- | --- |
| Monday | Integrate the first structured recipe parser. |
| Tuesday | Normalize parsed fields into an editable draft. |
| Wednesday | Handle partial, failed, and blocked results. |
| Thursday | Store import logs, warnings, and parser metadata. |
| Friday | Add duplicate URL detection and import-preview tests. |

**Outcome:** Supported URLs produce drafts and failures remain understandable.

## Week 12 — Saving imports

| Day | Work |
| --- | --- |
| Monday | Accept an edited import draft. |
| Tuesday | Save the recipe and related records transactionally. |
| Wednesday | Link the saved recipe to its import log. |
| Thursday | Preserve source attribution and original ingredient text. |
| Friday | Test the complete preview-edit-save flow. |

**Outcome:** User-approved imported drafts can become saved recipes.

## Week 13 — Mobile MVP foundations

| Day | Work |
| --- | --- |
| Monday | Configure Expo navigation, the API client, and secure token storage. |
| Tuesday | Build registration and login screens. |
| Wednesday | Build the Recipe Library list, search, filters, and navigation. |
| Thursday | Build manual recipe create/edit and tag management. |
| Friday | Build URL import entry and import-preview editing. |

**Outcome:** The main mobile workflows are connected to the backend.

## Week 14 — Cooking view and release readiness

| Day | Work |
| --- | --- |
| Monday | Build the portrait recipe detail/cooking view and scaling controls. |
| Tuesday | Add notes, favorites, source links, and user-facing error states. |
| Wednesday | Run complete user journeys on a physical phone or emulator. |
| Thursday | Fix integration issues and test loading, blocked-import, and expired-session behavior. |
| Friday | Run the full test suite, review security checks, update docs, and complete the MVP checklist. |

**Outcome:** The MVP is ready for private testing.

## Schedule risks

Allow additional time when:

- Python, SQL, authentication, React Native, and Expo are all new.
- Live recipe sites behave differently from mocked importer tests.
- Expo or secure token storage creates platform-specific problems.
- The MVP expands to include password reset, grocery lists, offline access,
  image uploads, public sharing, or public deployment.
- UI refinement goes beyond the approved wireframes.

If importing or mobile integration runs long, reserve up to two additional
weeks before setting a public release target.
