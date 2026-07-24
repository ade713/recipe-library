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

## Draft-first rule

The import pipeline should never directly create the final saved recipe without user review. The client should submit the edited draft to a save endpoint.
