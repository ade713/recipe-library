# Learning Plan

## Principle

Use Codex as a coach and reviewer, not as the primary coder.

```text
You type the implementation.
Codex explains, writes tests/skeletons, gives hints, reviews, and debugs.
```

## Daily loop

```text
1. Pick one small task.
2. Ask Codex to explain the concept.
3. Ask for tests or a skeleton.
4. Type the code yourself.
5. Run tests.
6. Ask for hints when stuck.
7. Ask Codex to review your diff.
8. Log what you learned.
```

## First learning sequence

1. `scale_ingredient_line`
2. Fraction parsing
3. Basic URL validation and domain extraction
4. Safe URL checks: reject localhost, private IPs, non-HTTP schemes, and cloud metadata IPs
5. Pydantic recipe draft models
6. Simple FastAPI endpoint
7. SQLAlchemy model
8. Manual recipe CRUD
9. Notes and tags basics
10. Auth dependency and ownership checks
11. Recipe search and filters
12. Safe import preview service

## Why manual recipes come before scraping

Manual recipe CRUD teaches the core backend skills without getting blocked by messy websites:

- API request/response models
- Database relationships
- Create/read/update/delete flows
- Notes and tags
- Ownership checks

It also gives the app a fallback path when URL import fails.

## Hint ladder

Use this when stuck:

```text
Give me Hint 1 only. No code yet.
```

Then:

```text
Give me Hint 2 with a small example, but not the full solution.
```

Only then:

```text
Show the solution and explain every line. Then give me a similar exercise.
```
