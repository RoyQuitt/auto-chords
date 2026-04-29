import type { ChordLink, ChordSearchResult, TrackInfo } from "@repo/shared";
import { createHash } from "node:crypto";
import { env } from "../env.js";

const preferredDomains = [
  "ultimate-guitar.com",
  "e-chords.com",
  "azchords.com",
  "chordify.net"
];

type SearchProvider = "google-cse" | "duckduckgo";

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
  const isHebrew = /[\u0590-\u05FF]/.test(title);
  return isHebrew ? `${artist} ${title} אקורדים` : `${artist} ${title} chords`;
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

function fingerprint(value: string): string {
  return createHash("sha256").update(value).digest("hex").slice(0, 12);
}

export function getSearchProvider(): SearchProvider {
  if (env.GOOGLE_CSE_API_KEY && env.GOOGLE_CSE_CX) {
    return "google-cse";
  }
  return "duckduckgo";
}

async function queryGoogleCse(query: string, caller: "now-playing" | "diagnostics") {
  const keyFp = fingerprint(env.GOOGLE_CSE_API_KEY ?? "");
  const timestamp = new Date().toISOString();
  console.log(
    `[chord-search] ts=${timestamp} pid=${process.pid} provider=google-cse caller=${caller} keyFp=${keyFp} query="${query}"`
  );

  const params = new URLSearchParams({
    key: env.GOOGLE_CSE_API_KEY ?? "",
    cx: env.GOOGLE_CSE_CX ?? "",
    q: query,
    num: "10"
  });
  const response = await fetch(`https://www.googleapis.com/customsearch/v1?${params.toString()}`);
  const bodyText = await response.text();

  let parsed: unknown = null;
  try {
    parsed = JSON.parse(bodyText);
  } catch {
    parsed = { raw: bodyText };
  }

  if (!response.ok) {
    console.error(`[chord-search] Google CSE ${response.status}: ${bodyText}`);
  }
  return { response, parsed };
}

async function queryDuckDuckGo(query: string, caller: "now-playing" | "diagnostics") {
  const constrainedQuery = `${query} (site:ultimate-guitar.com OR site:tab4u.com)`;
  const timestamp = new Date().toISOString();
  console.log(
    `[chord-search] ts=${timestamp} pid=${process.pid} provider=duckduckgo caller=${caller} query="${constrainedQuery}"`
  );
  const url = `https://duckduckgo.com/html/?${new URLSearchParams({ q: constrainedQuery }).toString()}`;
  const response = await fetch(url, {
    headers: {
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36"
    }
  });
  const html = await response.text();
  if (!response.ok) {
    console.error(`[chord-search] DuckDuckGo ${response.status}: ${html.slice(0, 500)}`);
  }
  return { response, parsed: html };
}

function parseDuckDuckGoLinks(html: string): ChordLink[] {
  const links: ChordLink[] = [];
  const re = /<a[^>]*class="[^"]*result__a[^"]*"[^>]*href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/gi;
  let match: RegExpExecArray | null = null;

  const decodeHtml = (value: string) =>
    value
      .replace(/&amp;/g, "&")
      .replace(/&quot;/g, "\"")
      .replace(/&#39;/g, "'")
      .replace(/&lt;/g, "<")
      .replace(/&gt;/g, ">");

  const unwrapDuckDuckGoRedirect = (url: string): string => {
    try {
      const parsed = url.startsWith("http") ? new URL(url) : new URL(url, "https://duckduckgo.com");
      const uddg = parsed.searchParams.get("uddg");
      if (uddg) {
        return decodeURIComponent(uddg);
      }
    } catch {
      // Fall through and return original URL.
    }
    return url;
  };

  while ((match = re.exec(html)) !== null) {
    const rawUrl = decodeHtml(match[1] ?? "");
    const titleHtml = match[2] ?? "";
    const title = titleHtml.replace(/<[^>]+>/g, "").trim();
    const resolvedUrl = rawUrl.startsWith("//") ? `https:${rawUrl}` : rawUrl;
    const finalUrl = unwrapDuckDuckGoRedirect(resolvedUrl);
    if (finalUrl.startsWith("http")) {
      links.push({ title: title || finalUrl, url: finalUrl });
    }
  }
  return links;
}

export async function runSearchDiagnostics() {
  const provider = getSearchProvider();
  if (provider === "google-cse") {
    const { response, parsed } = await queryGoogleCse("test chords", "diagnostics");
    return { provider, response, parsed };
  }
  const { response, parsed } = await queryDuckDuckGo("test chords", "diagnostics");
  const links = parseDuckDuckGoLinks(parsed as string).slice(0, 3);
  return { provider, response, parsed: { linksPreview: links } };
}

export async function searchChordLinks(track: TrackInfo): Promise<ChordSearchResult> {
  const query = buildQuery(track);
  let links: ChordLink[] = [];
  if (getSearchProvider() === "google-cse") {
    const { response, parsed } = await queryGoogleCse(query, "now-playing");
    if (response.ok) {
      const json = parsed as {
        items?: { title: string; link: string; displayLink?: string }[];
      };
      links = (json.items ?? []).map((item) => ({
        title: item.title,
        url: item.link,
        displayLink: item.displayLink
      }));
    } else {
      console.warn("[chord-search] Google failed, retrying with DuckDuckGo fallback");
    }
  }

  if (links.length === 0) {
    const { response, parsed } = await queryDuckDuckGo(query, "now-playing");
    if (!response.ok) {
      throw new Error(`Chord search failed (${response.status})`);
    }
    links = parseDuckDuckGoLinks(parsed as string);
  }

  const ranked = dedupeLinks(links)
    .sort((a, b) => scoreLink(b) - scoreLink(a))
    .slice(0, 5);

  return { query, links: ranked };
}
