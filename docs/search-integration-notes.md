# Search Integration Notes

## Goal

Detect currently playing Spotify track, find chord links, and display top links in the app.

## What We Implemented

1. Spotify integration
- OAuth login with backend session.
- Currently playing polling via Spotify Web API.
- Single-user flow with optional "remember me" persistent cookie.

2. Frontend behavior
- Connection state, now-playing state, and error display.
- Error passthrough from backend so UI shows real backend failure reason.

3. Monorepo/workspace setup
- `npm workspaces` with `apps/client`, `apps/server`, `packages/shared`.
- Root `npm run dev` starts both apps.

4. Search logic (current)
- Primary provider: Google CSE when `GOOGLE_CSE_API_KEY` and `GOOGLE_CSE_CX` are set.
- Fallback provider: DuckDuckGo HTML search if Google is not configured or Google request fails.
- Per-request fallback: Google is tried first; if it fails, same request retries with DuckDuckGo.
- DuckDuckGo fallback constrained to:
  - `ultimate-guitar.com`
  - `tab4u.com`
- DuckDuckGo redirect links are unwrapped to real destination URLs.

5. Query behavior
- Non-Hebrew titles: `"Artist Song chords"`.
- Hebrew titles: `"Artist Song אקורדים"`.

6. Diagnostics
- Endpoint: `GET /api/diagnostics/search`
- Returns active provider, status, and provider-specific details.
- Startup logs include masked Google key fingerprint and selected provider.

## Issues Encountered

1. Spotify callback errors
- `redirect_uri: Not matching configuration`
- `Invalid Spotify callback state`
- Resolved by consistently using `127.0.0.1` (not mixed with `localhost`) and matching callback URIs exactly.

2. Google API failures
- `403 PERMISSION_DENIED` (`This project does not have access to Custom Search JSON API`)
- `400 API key expired` / `API_KEY_INVALID`
- Added diagnostics and key fingerprint logs to verify runtime config and isolate provider-side failures.

3. DuckDuckGo link failures
- Raw DuckDuckGo redirect URLs caused `400 Bad Request`.
- Fixed by extracting and decoding `uddg` target URLs.

## Current Expected Behavior

1. If Google works:
- Results come from Google CSE.

2. If Google fails:
- Backend logs Google failure.
- Backend retries same query via DuckDuckGo.
- UI still receives best-effort chord links.
