# EdgeShort

A private, no-build URL shortener for EdgeOne Makers. It uses Edge Functions and a bound KV namespace—no framework, database, or client-side secrets.

## Included

- `/:code` redirects to the destination with a best-effort visit count.
- `/admin` is a responsive password-protected control panel.
- Create auto-generated or custom codes; edit, delete, search, and copy short links.
- Signed, `HttpOnly`, `Secure`, `SameSite=Strict` session cookie with seven-day expiry.
- Input validation for URLs and codes, security response headers, no third-party dependencies, and no build command.

## Deploy to EdgeOne Makers

1. Import this repository as a Makers project. It is a plain static project: leave the build command empty and use the repository root as the output directory.
2. In **Storage → KV**, enable KV and create a namespace, for example `edge-short`.
3. Bind that namespace to this project with the exact runtime variable name **`URLS_KV`**.
4. Add these encrypted environment variables in the Makers project settings:

   | Name | Type | Value |
   | --- | --- | --- |
   | `ADMIN_PASSWORD` | Secret | A unique password for `/admin` |
   | `SESSION_SECRET` | Secret | At least 32 random characters used to sign sessions |

   Generate a suitable session secret with `openssl rand -hex 32`.
5. Deploy. Open `/admin` (the trailing slash is added automatically), sign in, and create a link.

For a custom domain, bind the domain in Makers before sharing short links. The admin copies links using the current domain automatically.

## Project layout

```text
admin/                    # Plain HTML, CSS, and browser JavaScript
edge-functions/
  [code].js               # Public redirect
  api/auth/*              # Password login and session endpoints
  api/links/*             # Authenticated CRUD API
  _lib.js                 # Validation, cookie signing, and KV helpers
edgeone.json              # /admin redirect and security headers
```

## Operational notes

- EdgeOne KV is eventually consistent. A change can take up to roughly 60 seconds to be visible at a different edge location.
- KV does not provide atomic increments, so the visit counter is intentionally best-effort. It is ideal for personal/low-concurrency use, but simultaneous requests can occasionally coalesce into one count.
- Redirects return `302`, so changing a destination takes effect without a browser permanently caching the old target.
- Never commit real values for `ADMIN_PASSWORD` or `SESSION_SECRET`. `.env.example` is documentation only; configure the actual values in Makers.
