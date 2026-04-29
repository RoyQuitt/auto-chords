import type { NowPlayingResponse } from "@repo/shared";

const API_BASE = import.meta.env.VITE_API_BASE_URL ?? "http://127.0.0.1:8787";

export async function getSession(): Promise<{ connected: boolean }> {
  const res = await fetch(`${API_BASE}/api/session`, {
    credentials: "include"
  });
  if (!res.ok) throw new Error("Failed to load session");
  return res.json();
}

export async function getNowPlaying(): Promise<NowPlayingResponse> {
  const res = await fetch(`${API_BASE}/api/now-playing`, {
    credentials: "include"
  });
  if (res.status === 401) {
    return { connected: false, nowPlaying: null, chordSearch: null };
  }
  if (!res.ok) throw new Error("Failed to load now playing");
  return res.json();
}

export function spotifyLoginUrl(): string {
  return `${API_BASE}/auth/spotify/login`;
}
