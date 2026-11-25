# 柿柿短链 (EdgeShort)

A private, no-build URL shortener for EdgeOne Makers. It uses Edge Functions and built-in Blob storage—no framework, storage binding, database, or client-side secrets.

## Included

- `/:code` redirects to the destination with a best-effort visit count.
- `/admin` is a responsive password-protected control panel.
- Create auto-generated or custom 1–16 character codes; edit a code, remark, destination, or expiration; delete, search, and copy short links.
- Generate and revoke API Keys from the admin, with a CORS-enabled API for automation and integrations.
- Branded public error pages for missing, expired, and temporarily unavailable short links.
- Signed, `HttpOnly`, `Secure`, `SameSite=Strict` session cookie with seven-day expiry.
- Input validation for URLs and codes, security response headers, no third-party dependencies, and no build command.

## Deploy to EdgeOne Makers

1. Import this repository as a Makers project. It is a plain static project: leave the build command empty and use the repository root as the output directory.
2. Add these encrypted environment variables in the Makers project settings:

   | Name | Type | Value |
   | --- | --- | --- |
   | `ADMIN_PASSWORD` | Secret | A unique password for `/admin` |
   | `SESSION_SECRET` | Secret | At least 32 random characters used to sign sessions |

   Generate a suitable session secret with `openssl rand -hex 32`.
3. Deploy. Open `/admin` (the trailing slash is added automatically), sign in, and create a link. On the first request, Makers automatically creates the private `edgeshort-links` Blob namespace for this project.

For a custom domain, bind the domain in Makers before sharing short links. The admin copies links using the current domain automatically.

## API

Open **API 调用** in `/admin` to generate an API Key. The full key is shown once only; save it somewhere secure. You can revoke it at any time from the same panel.

Use the key in `Authorization: Bearer ...` (or `X-API-Key`). The API returns JSON and permits browser calls with CORS enabled.

```bash
# List links
curl https://your-domain.com/api/v1/links \
  -H "Authorization: Bearer YOUR_API_KEY"

# Create a link; code, title, and expiresAt are optional.
# expiresAt: 3 means the link expires three days after this request.
curl -X POST https://your-domain.com/api/v1/links \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"url":"https://example.com/campaign","code":"summer-26","title":"Summer campaign","expiresAt":3}'

# Read, update, or delete one link
curl https://your-domain.com/api/v1/links/summer-26 \
  -H "Authorization: Bearer YOUR_API_KEY"
curl -X PATCH https://your-domain.com/api/v1/links/summer-26 \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"url":"https://example.com/new-destination","title":"Updated campaign"}'
curl -X DELETE https://your-domain.com/api/v1/links/summer-26 \
  -H "Authorization: Bearer YOUR_API_KEY"
```

`GET /api/v1/links?q=keyword` searches links. `POST` requires `url`; `POST` and `PATCH` accept `url`, plus optional `code`, `title`, and `expiresAt`. Pass `expiresAt` as a whole number of days (for example, `3` expires in three days). The admin uses the same day-based setting and displays the resulting date as `2026年7月31日`; ISO date/time strings remain supported by the API for compatibility. Custom codes must be 1–16 characters and use only letters, numbers, `_`, or `-`.

## Project layout

```text
admin/                    # Plain HTML, CSS, and browser JavaScript
edge-functions/
  [code].js               # Public redirect (hot path)
  _redirect.js            # Link cache + coalesced visit counting
  _links.js               # Link logic shared by the admin API and /api/v1
  _storage.js             # Blob keys and reads/writes
  _ratelimit.js           # Login failure limiter
  api/auth/*              # Password login and session endpoints
  api/links/*             # Admin (session) API
  api/v1/links/*          # Public (API key) API
  api/api-keys/*          # API key management
test/                     # `npm test` (in-memory Blob stand-in, no network)
```

## Operational notes

- **Fast redirects**: a redirect is one eventually-consistent Blob read, memoised for 30 seconds per edge instance, then a `302`. Unknown or malformed paths (`/favicon.ico`, scanners) are rejected without touching storage. Because of the cache, an edit or delete can take up to ~30 seconds (plus Blob propagation) to show on every instance.
- **Visit counts are best effort**: Blob has no atomic increment, so counts live in their own `visits/<code>.json` blob (an edit can never be overwritten by a count) and are coalesced to at most one write per code per ~10 seconds per instance. Counts older than this release stored in the link record are still added in.
- **API keys** embed their id (`esk_<id>.<secret>`), so authentication is a single read. Keys issued by older versions keep working through a slower scan. `lastUsedAt` is written at most every 10 minutes.
- **Login limiter**: 5 wrong passwords within 15 minutes locks that client IP out for the rest of the window. The IP comes from `EO-Connecting-IP` (falling back to `X-Real-IP` / `X-Forwarded-For`).
- **Sessions** are stateless signed cookies; to sign out everywhere, change `SESSION_SECRET`.
- `PATCH` only changes the fields you send.
- Admin list/search reads every link once, which is fine for personal use (up to 5,000 links).
- Redirects return `302`, so changing a destination never fights a browser's permanent cache.
- Never commit real values for `ADMIN_PASSWORD` or `SESSION_SECRET`. `.env.example` is documentation only.
