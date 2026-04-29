import cors from "cors";
import express from "express";
import session from "express-session";
import { env } from "./env.js";
import { searchChordLinks } from "./lib/chordsSearch.js";
import {
  createSpotifyAuthUrl,
  createState,
  ensureValidToken,
  exchangeCodeForTokens,
  getCurrentlyPlaying
} from "./lib/spotify.js";
import type { ChordSearchResult, TokenSet } from "./types.js";

declare module "express-session" {
  interface SessionData {
    spotifyState?: string;
    tokens?: TokenSet;
  }
}

const app = express();

app.use(
  cors({
    origin: env.APP_BASE_URL,
    credentials: true
  })
);
app.use(express.json());
app.use(
  session({
    secret: env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      sameSite: "lax"
    }
  })
);

const chordCache = new Map<string, ChordSearchResult>();

app.get("/auth/spotify/login", (req, res) => {
  const state = createState();
  req.session.spotifyState = state;
  const authUrl = createSpotifyAuthUrl(state);
  res.redirect(authUrl);
});

app.get("/auth/spotify/callback", async (req, res) => {
  try {
    const code = String(req.query.code ?? "");
    const state = String(req.query.state ?? "");
    if (!code || !state || state !== req.session.spotifyState) {
      return res.status(400).send("Invalid Spotify callback state.");
    }

    const tokens = await exchangeCodeForTokens(code);
    req.session.tokens = tokens;
    req.session.spotifyState = undefined;
    return res.redirect(env.APP_BASE_URL);
  } catch (error) {
    return res.status(500).json({ error: (error as Error).message });
  }
});

app.post("/auth/logout", (req, res) => {
  req.session.destroy(() => {
    res.status(204).send();
  });
});

app.get("/api/session", (req, res) => {
  res.json({ connected: Boolean(req.session.tokens) });
});

app.get("/api/now-playing", async (req, res) => {
  try {
    if (!req.session.tokens) {
      return res.status(401).json({ error: "Not connected to Spotify" });
    }

    req.session.tokens = await ensureValidToken(req.session.tokens);
    const track = await getCurrentlyPlaying(req.session.tokens.accessToken);
    if (!track) {
      return res.json({
        connected: true,
        nowPlaying: null,
        chordSearch: null
      });
    }

    const key = `${track.artists.join(",")}::${track.title}`.toLowerCase();
    let chordSearch = chordCache.get(key);
    if (!chordSearch) {
      chordSearch = await searchChordLinks(track);
      chordCache.set(key, chordSearch);
    }

    return res.json({
      connected: true,
      nowPlaying: track,
      chordSearch
    });
  } catch (error) {
    return res.status(500).json({ error: (error as Error).message });
  }
});

app.listen(env.PORT, () => {
  // eslint-disable-next-line no-console
  console.log(`Server listening on http://localhost:${env.PORT}`);
});
