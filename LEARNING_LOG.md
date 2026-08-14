# Learning Log

Use this file to track what you build and what you learn.

## Template

```md
## YYYY-MM-DD

Built:

-

Learned:

-

Still confused by:

-

Next:

-
```

## First entry

```md
## 2026-07-22

Built:

- Created initial project scaffold.

Learned:

- Project will start with pure Python utility functions before moving into FastAPI, database work, and React Native.

Next:

- Ingredient scaling kata.
```

## Ingredient Scaling

```md
## 2026-08-06

Built:

- Ingredient scaling kata

Learned:

- Used `Fraction` for exact arithmetic.
- Parsed whole numbers, fractions, and mixed numbers.
- Preserved unclear ingredient lines.
- Added parameterized pytest cases and ran Ruff.

Next:

- URL-validator.
```

## URL-Validator

```md
## 2026-08-07

Built:

- URL validator

Learned:

- Used `urlparse` to parse URLs and inspect `netloc` and `hostname`.
- Used `ip_address` to determine whether a hostname is a global IP address.
- Handled the expected `ValueError` when a hostname is a domain rather than an IP address.
- Addressed a mypy error by narrowing the optional domain with an explicit `None` check.
- Learned that redirects require renewed safety checks because they can point to unsafe destinations.

Next:

- Pydantic recipe draft schemas.
```

## Pydantic Recipe Draft Schemas

```md
## 2026-08-13

Built:

- Added and tested ingredient, instruction, source-tip, recipe-draft, and import-preview schemas.
- Added validation for required text, one-based positions, source attribution, and supported import statuses.
- Separated editable `RecipeDraft` data from save-ready `RecipeCreate` data.

Learned:

- Type annotations validate data types, while `Field` adds value constraints.
- `str | None` permits `None`; adding `= None` also makes the field optional to omit.
- Pydantic converts nested dictionaries into nested models.
- `Literal` restricts fields to specific allowed values.
- Imported recipes remain editable drafts until reviewed and approved for saving.
- FastAPI will use these schemas for request validation, response serialization, OpenAPI documentation, and `422` validation errors.

Next:

- Connect the schemas to a small FastAPI endpoint.
```

## FastAPI Ingredient Scale Preview

```md
## 2026-08-13

Built:

- Added request and response schemas for ingredient scaling.
- Added and registered `POST /api/v1/ingredients/scale-preview`.
- Connected the FastAPI route to the ingredient-scaling service.
- Added successful-request and invalid-request tests.

Learned:

- FastAPI validates Pydantic request models before executing route logic.
- Invalid request data automatically produces a `422` response.
- `response_model` validates, serializes, and documents outgoing responses.
- Router prefixes and route paths combine to form the complete endpoint URL.
- FastAPI generates OpenAPI documentation from request and response schemas.
- Integration with mypy exposed an older inconsistent variable-type assignment.

Next:

- Inspect and exercise the endpoint in FastAPI `/docs`.
```
