import type { ChordLink, ChordSearchResult, TrackInfo } from "@repo/shared";
import { env } from "../env.js";

const preferredDomains = [
  "ultimate-guitar.com",
  "e-chords.com",
  "azchords.com",
  "chordify.net"
];

function normalizeTitle(title: string): string {
  return title
    .replace(/\(.*?remaster.*?\)/gi, "")
    .replace(/\(.*?live.*?\)/gi, "")
    .replace(/\(feat\..*?\)/gi, "")
    .replace(/\s+/g, " ")
    .trim();
}

function buildQuery(track: TrackInfo): string {
  const artist = track.artists[0] ?? "";
  const title = normalizeTitle(track.title);
  return `${artist} ${title} chords`;
}

function scoreLink(link: ChordLink): number {
  const url = link.url.toLowerCase();
  const title = link.title.toLowerCase();
  let score = 0;
  if (title.includes("chords")) score += 3;
  if (title.includes("tabs")) score += 1;
  preferredDomains.forEach((domain, index) => {
    if (url.includes(domain)) {
      score += 10 - index;
    }
  });
  if (title.includes("lyrics")) score -= 2;
  return score;
}

function dedupeLinks(links: ChordLink[]): ChordLink[] {
  const seen = new Set<string>();
  return links.filter((link) => {
    if (seen.has(link.url)) return false;
    seen.add(link.url);
    return true;
  });
}

export async function searchChordLinks(track: TrackInfo): Promise<ChordSearchResult> {
  const query = buildQuery(track);
  const params = new URLSearchParams({
    key: env.GOOGLE_CSE_API_KEY,
    cx: env.GOOGLE_CSE_CX,
    q: query,
    num: "10"
  });

  const response = await fetch(`https://www.googleapis.com/customsearch/v1?${params.toString()}`);
  if (!response.ok) {
    throw new Error(`Chord search failed (${response.status})`);
  }

  const json = (await response.json()) as {
    items?: { title: string; link: string; displayLink?: string }[];
  };

  const links = (json.items ?? []).map((item) => ({
    title: item.title,
    url: item.link,
    displayLink: item.displayLink
  }));

  const ranked = dedupeLinks(links)
    .sort((a, b) => scoreLink(b) - scoreLink(a))
    .slice(0, 5);

  return { query, links: ranked };
}
