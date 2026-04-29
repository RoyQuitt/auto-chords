import { randomBytes } from "node:crypto";
import { env } from "../env.js";
import type { TokenSet, TrackInfo } from "../types.js";

const SPOTIFY_API_BASE = "https://api.spotify.com/v1";
const SPOTIFY_ACCOUNTS_BASE = "https://accounts.spotify.com";

function basicAuthHeader(clientId: string, clientSecret: string): string {
  const raw = `${clientId}:${clientSecret}`;
  return `Basic ${Buffer.from(raw).toString("base64")}`;
}

export function createState(): string {
  return randomBytes(16).toString("hex");
}

export function createSpotifyAuthUrl(state: string): string {
  const params = new URLSearchParams({
    response_type: "code",
    client_id: env.SPOTIFY_CLIENT_ID,
    scope: "user-read-currently-playing",
    redirect_uri: env.SPOTIFY_REDIRECT_URI,
    state
  });
  return `${SPOTIFY_ACCOUNTS_BASE}/authorize?${params.toString()}`;
}

export async function exchangeCodeForTokens(code: string): Promise<TokenSet> {
  const body = new URLSearchParams({
    grant_type: "authorization_code",
    code,
    redirect_uri: env.SPOTIFY_REDIRECT_URI
  });

  const response = await fetch(`${SPOTIFY_ACCOUNTS_BASE}/api/token`, {
    method: "POST",
    headers: {
      Authorization: basicAuthHeader(env.SPOTIFY_CLIENT_ID, env.SPOTIFY_CLIENT_SECRET),
      "Content-Type": "application/x-www-form-urlencoded"
    },
    body
  });

  if (!response.ok) {
    throw new Error(`Spotify token exchange failed (${response.status})`);
  }

  const json = (await response.json()) as {
    access_token: string;
    refresh_token: string;
    expires_in: number;
  };

  return {
    accessToken: json.access_token,
    refreshToken: json.refresh_token,
    expiresAt: Date.now() + json.expires_in * 1000
  };
}

export async function refreshAccessToken(refreshToken: string): Promise<TokenSet> {
  const body = new URLSearchParams({
    grant_type: "refresh_token",
    refresh_token: refreshToken
  });

  const response = await fetch(`${SPOTIFY_ACCOUNTS_BASE}/api/token`, {
    method: "POST",
    headers: {
      Authorization: basicAuthHeader(env.SPOTIFY_CLIENT_ID, env.SPOTIFY_CLIENT_SECRET),
      "Content-Type": "application/x-www-form-urlencoded"
    },
    body
  });

  if (!response.ok) {
    throw new Error(`Spotify token refresh failed (${response.status})`);
  }

  const json = (await response.json()) as {
    access_token: string;
    refresh_token?: string;
    expires_in: number;
  };

  return {
    accessToken: json.access_token,
    refreshToken: json.refresh_token ?? refreshToken,
    expiresAt: Date.now() + json.expires_in * 1000
  };
}

export async function ensureValidToken(tokens: TokenSet): Promise<TokenSet> {
  const now = Date.now();
  if (tokens.expiresAt - now > 15_000) {
    return tokens;
  }
  return refreshAccessToken(tokens.refreshToken);
}

export async function getCurrentlyPlaying(accessToken: string): Promise<TrackInfo | null> {
  const response = await fetch(`${SPOTIFY_API_BASE}/me/player/currently-playing`, {
    headers: { Authorization: `Bearer ${accessToken}` }
  });

  if (response.status === 204) {
    return null;
  }
  if (!response.ok) {
    throw new Error(`Spotify currently-playing failed (${response.status})`);
  }

  const json = (await response.json()) as {
    is_playing: boolean;
    progress_ms: number;
    item?: {
      id?: string;
      name?: string;
      album?: { name?: string; images?: { url: string }[] };
      artists?: { name: string }[];
      external_urls?: { spotify?: string };
      type?: string;
    };
  };

  if (!json.item?.id || !json.item.name || !json.item.artists?.length) {
    return null;
  }

  return {
    spotifyTrackId: json.item.id,
    title: json.item.name,
    artists: json.item.artists.map((a) => a.name),
    album: json.item.album?.name ?? "",
    albumImageUrl: json.item.album?.images?.[0]?.url ?? null,
    spotifyUrl: json.item.external_urls?.spotify ?? null,
    isPlaying: json.is_playing,
    progressMs: json.progress_ms ?? 0
  };
}
