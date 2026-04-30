# Spotify Chord Links (Option A)

Single-user app that:
- Connects to Spotify via OAuth
- Polls your currently playing track
- Searches the web for chord pages
- Displays top chord links (no scraping/parsing of chord content)

## Stack

- Frontend: React + Vite + TypeScript
- Backend: Express + TypeScript

## Project Structure

- `apps/client/` React app
- `apps/server/` Express API
- `packages/shared/` shared TypeScript types

## 1) Create Spotify App

In Spotify Developer Dashboard:
1. Create an app
2. Add redirect URI: `http://127.0.0.1:8787/auth/spotify/callback`
3. Copy `Client ID` and `Client Secret`

Required scope:
- `user-read-currently-playing`

## 2) Search API

Primary provider is Brave Search API. If Brave returns an error or no useful results, server falls back to DuckDuckGo.

Required Brave vars:
- `BRAVE_SEARCH_API_KEY`
- `BRAVE_SEARCH_ENDPOINT` (optional, defaults to Brave web search endpoint)

## 3) Environment

Create `apps/server/.env`:

```env
PORT=8787
APP_BASE_URL=http://127.0.0.1:5173
SPOTIFY_CLIENT_ID=your_spotify_client_id
SPOTIFY_CLIENT_SECRET=your_spotify_client_secret
SPOTIFY_REDIRECT_URI=http://127.0.0.1:8787/auth/spotify/callback
SESSION_SECRET=replace_with_random_string

BRAVE_SEARCH_API_KEY=your_brave_search_api_key
BRAVE_SEARCH_ENDPOINT=https://api.search.brave.com/res/v1/web/search
```

Create `apps/client/.env`:

```env
VITE_API_BASE_URL=http://127.0.0.1:8787
```

## 4) Install + Run

From repo root:

```bash
npm install
npm run dev
```

Open `http://127.0.0.1:5173`.

## Notes

- This is intentionally single-user and uses in-memory session/token storage.
- If Spotify returns no active track, UI shows a waiting state.
- Chord results are links only (Option A), with simple ranking and filtering.
- Diagnostics endpoint: `GET /api/diagnostics/search`
- If Brave returns an error (or empty results), backend retries that request with DuckDuckGo.
