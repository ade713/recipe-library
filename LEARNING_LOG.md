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
