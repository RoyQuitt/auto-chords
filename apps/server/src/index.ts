import type { ChordSearchResult } from "@repo/shared";
import cors from "cors";
import express from "express";
import session from "express-session";
import { createHash } from "node:crypto";
import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { env } from "./env.js";
import { getSearchProvider, runSearchDiagnostics, searchChordLinks } from "./lib/chordsSearch.js";
import {
  createSpotifyAuthUrl,
  createState,
  ensureValidToken,
  exchangeCodeForTokens,
  getCurrentlyPlaying
} from "./lib/spotify.js";
import type { TokenSet } from "./types.js";

declare module "express-session" {
  interface SessionData {
    spotifyState?: string;
    tokens?: TokenSet;
  }
}

const app = express();
const isProduction = process.env.NODE_ENV === "production";
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const clientDistPath = path.resolve(__dirname, "../../client/dist");

if (!isProduction) {
  app.use(
    cors({
      origin: env.APP_BASE_URL,
      credentials: true
    })
  );
}
app.use(express.json());
if (isProduction) {
  app.set("trust proxy", 1);
}
app.use(
  session({
    secret: env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      sameSite: "lax",
      secure: isProduction
    }
  })
);

const chordCache = new Map<string, ChordSearchResult>();

function fingerprint(value: string): string {
  return createHash("sha256").update(value).digest("hex").slice(0, 12);
}

app.get("/auth/spotify/login", (req, res) => {
  const remember = String(req.query.remember ?? "") === "1";
  if (remember) {
    req.session.cookie.maxAge = 1000 * 60 * 60 * 24 * 30;
  } else {
    req.session.cookie.expires = undefined;
    req.session.cookie.maxAge = undefined;
  }
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

app.get("/api/diagnostics/search", async (_req, res) => {
  try {
    const { provider, response, parsed } = await runSearchDiagnostics();

    if (!response.ok) {
      return res.status(502).json({
        ok: false,
        provider,
        status: response.status,
        details: parsed
      });
    }

    return res.json({
      ok: true,
      provider,
      status: response.status,
      details: parsed
    });
  } catch (error) {
    return res.status(500).json({
      ok: false,
      provider: getSearchProvider(),
      error: (error as Error).message
    });
  }
});

app.get("/api/now-playing", async (req, res) => {
  try {
    if (!req.session.tokens) {
      return res.status(401).json({ error: "Not connected to Spotify" });
    }

    req.session.tokens = await ensureValidToken(req.session.tokens);
    const track = await getCurrentlyPlaying(req.session.tokens.accessToken);
    if (!track) {
      // eslint-disable-next-line no-console
      console.log("[now-playing] No active track");
      return res.json({
        connected: true,
        nowPlaying: null,
        chordSearch: null
      });
    }
    // eslint-disable-next-line no-console
    console.log(
      `[now-playing] ${track.artists.join(", ")} - ${track.title} (${track.spotifyTrackId})`
    );

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

if (isProduction && existsSync(clientDistPath)) {
  app.use(express.static(clientDistPath));
  app.get("*", (req, res, next) => {
    if (req.path.startsWith("/api") || req.path.startsWith("/auth")) {
      return next();
    }
    return res.sendFile(path.join(clientDistPath, "index.html"));
  });
}

app.listen(env.PORT, "0.0.0.0", () => {
  // eslint-disable-next-line no-console
  console.log(`Server listening on 0.0.0.0:${env.PORT}`);
  if (isProduction) {
    // eslint-disable-next-line no-console
    console.log(`[config] static_client_dist=${clientDistPath} exists=${existsSync(clientDistPath)}`);
  }
  // eslint-disable-next-line no-console
  console.log(
    `[config] BRAVE_SEARCH_API_KEY sha256=${fingerprint(env.BRAVE_SEARCH_API_KEY)} len=${env.BRAVE_SEARCH_API_KEY.length}`
  );
  // eslint-disable-next-line no-console
  console.log(`[config] BRAVE_SEARCH_ENDPOINT=${env.BRAVE_SEARCH_ENDPOINT}`);
  // eslint-disable-next-line no-console
  console.log(`[config] search_provider=${getSearchProvider()}`);
  // eslint-disable-next-line no-console
  console.log(
    `[config] BRAVE_SEARCH_API_KEY source=${process.env.BRAVE_SEARCH_API_KEY ? "process-env" : ".env file"}`
  );
});
