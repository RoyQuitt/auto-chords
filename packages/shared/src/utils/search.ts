import { TrackInfo } from "../index.js";

function normalizeTitle(title: string): string {
  return title
    .replace(/\(.*?remaster.*?\)/gi, "")
    .replace(/\(.*?live.*?\)/gi, "")
    .replace(/\(feat\..*?\)/gi, "")
    .replace(/\s+/g, " ")
    .trim();
}

export function buildQuery(track: TrackInfo): string {
  const artist = track.artists[0] ?? "";
  const title = normalizeTitle(track.title);
  const isHebrew = /[\u0590-\u05FF]/.test(title);
  return isHebrew ? `${artist} ${title} אקורדים` : `${artist} ${title} chords`;
}