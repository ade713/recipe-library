# Import Pipeline

The import pipeline should produce an editable draft, not an automatically saved recipe.

## Target flow

```text
User submits URL
  -> validate scheme/domain
  -> check duplicate URL for current user
  -> reject unsafe hosts/IPs
  -> fetch with timeout, redirect limit, size limit
  -> parse with recipe-scrapers
  -> fallback to structured data parser later
  -> normalize into RecipeDraft
  -> parse ingredients when possible
  -> save import log
  -> return status + draft/warnings
```

## Output states

```text
success   -> show editable preview
partial   -> show editable preview with warnings
failed    -> offer manual entry
blocked   -> offer manual entry and source link
duplicate -> offer open saved recipe or import as copy
```

Duplicate detection is scoped to the authenticated user and uses an exact match of the normalized source URL stored with a saved recipe. It runs before safe fetching to avoid unnecessary DNS and HTTP work. An explicit `import_as_copy` request bypasses that lookup and continues through the normal preview pipeline.

Blocked and failed results advertise `enter_manually` and `open_source_url` actions. Duplicate results advertise `open_existing` and `import_as_copy` and identify the existing recipe.

## Draft-first rule

The import pipeline should never directly create the final saved recipe without user review. The client should submit the edited draft to a save endpoint.

## Reviewed-draft save

```text
Client submits edited draft + import ID
  -> authenticate user
  -> load import log by import ID + user ID
  -> require success or partial status
  -> reject an already-linked import
  -> replace client source URL/domain with import-log attribution
  -> save recipe and related records as imported
  -> link import log to recipe
  -> commit both changes together
```

Any exception during recipe creation or import-log linkage rolls back the transaction. Missing and unowned imports share the same `404` response. Failed, blocked, duplicate, and already-saved states return `409` without creating a recipe.
