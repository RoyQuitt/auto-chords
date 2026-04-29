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
2. Add redirect URI: `http://localhost:8787/auth/spotify/callback`
3. Copy `Client ID` and `Client Secret`

Required scope:
- `user-read-currently-playing`

## 2) Search API

This starter uses Google Programmable Search JSON API.

Set:
- `GOOGLE_CSE_API_KEY`
- `GOOGLE_CSE_CX`

## 3) Environment

Create `apps/server/.env`:

```env
PORT=8787
APP_BASE_URL=http://localhost:5173
SPOTIFY_CLIENT_ID=your_spotify_client_id
SPOTIFY_CLIENT_SECRET=your_spotify_client_secret
SPOTIFY_REDIRECT_URI=http://localhost:8787/auth/spotify/callback
SESSION_SECRET=replace_with_random_string

GOOGLE_CSE_API_KEY=your_google_api_key
GOOGLE_CSE_CX=your_programmable_search_engine_id
```

Create `apps/client/.env`:

```env
VITE_API_BASE_URL=http://localhost:8787
```

## 4) Install + Run

From repo root:

```bash
npm install
npm run dev
```

Open `http://localhost:5173`.

## Notes

- This is intentionally single-user and uses in-memory session/token storage.
- If Spotify returns no active track, UI shows a waiting state.
- Chord results are links only (Option A), with simple ranking and filtering.
