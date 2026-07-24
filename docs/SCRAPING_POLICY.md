# Scraping and Import Policy

## Product approach

Recipe imports should be treated as drafts. The user must be able to review and edit the imported result before saving.

Manual recipe creation is part of the MVP and should be available as the fallback when import fails, is blocked, or returns only unusable data.

## Technical approach

Import flow:

```text
Validate URL
Reject unsafe URL targets
Check access rules when possible
Check duplicate source URL for current user
Fetch HTML with timeout, redirect limit, and response-size limit
Try recipe-scrapers
Try structured data fallback later
Normalize result
Return draft + warnings
Save import log
```

## Safe-fetch requirements

The importer must not fetch arbitrary unsafe targets. Before making a request, the backend should:

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

## Constraints

- Do not try to bypass bot protection.
- Respect `robots.txt` and website access limitations when practical.
- Use respectful request timeouts.
- Store source URL and source domain.
- Keep parser warnings.
- Do not store the entire page by default.
- Do not render raw scraped HTML in the app.
- Prefer structured recipe data when available.
- Save import failures and warnings for debugging.

## Import statuses

| Status | Meaning |
|---|---|
| `success` | Enough recipe data was found to create a useful draft. |
| `partial` | Some recipe data was found, but important fields are missing. |
| `failed` | No usable recipe data could be extracted. |
| `blocked` | Import was disallowed or blocked by safe-fetch/access rules. |
| `duplicate` | The user already saved this source URL. |

## Import failure behavior

| Failure | App behavior |
|---|---|
| Invalid URL | Show validation error. |
| Unsafe URL | Block request before fetching and explain that the URL cannot be imported. |
| Blocked site | Show import failure and allow manual entry. |
| No recipe found | Offer manual entry. |
| Partial recipe found | Show preview with warnings. |
| Duplicate URL | Ask whether to open existing recipe or import again as a copy. |
