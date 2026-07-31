# EdgeShort

A private, no-build URL shortener for EdgeOne Makers. It uses Edge Functions and built-in Blob storage—no framework, storage binding, database, or client-side secrets.

## Included

- `/:code` redirects to the destination with a best-effort visit count.
- `/admin` is a responsive password-protected control panel.
- Create auto-generated or custom codes; edit, delete, search, and copy short links.
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

## Project layout

```text
admin/                    # Plain HTML, CSS, and browser JavaScript
edge-functions/
  [code].js               # Public redirect
  api/auth/*              # Password login and session endpoints
  api/links/*             # Authenticated CRUD API
  _lib.js                 # Validation, cookie signing, and Blob helpers
edgeone.json              # /admin redirect and security headers
```

## Operational notes

- Blob does not need a console binding: the Makers function opens the `edgeshort-links` namespace directly and the platform creates it automatically on first use.
- Link writes and admin reads use Blob strong consistency. The public redirect uses the faster eventual-consistency read, so a just-created or edited link can take a few seconds to propagate globally.
- Blob does not provide an atomic increment, so the visit counter is intentionally best-effort. It is ideal for personal/low-concurrency use, but simultaneous requests can occasionally coalesce into one count.
- Redirects return `302`, so changing a destination takes effect without a browser permanently caching the old target.
- Never commit real values for `ADMIN_PASSWORD` or `SESSION_SECRET`. `.env.example` is documentation only; configure the actual values in Makers.
