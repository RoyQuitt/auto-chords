import {
  buildQuery,
  type ChordLink,
  type ChordSearchResult,
  type TrackInfo,
} from '@repo/shared';
import { createHash } from 'node:crypto';
import { env } from '../env.js';

const preferredDomains = [
  'tab4u.com',
  'ultimate-guitar.com',
  'e-chords.com',
  'azchords.com',
  'chordify.net',
];
type SearchProvider = 'brave' | 'duckduckgo';

function scoreLink(link: ChordLink): number {
  const url = link.url.toLowerCase();
  const title = link.title.toLowerCase();
  let score = 0;
  if (title.includes('chords')) score += 3;
  if (title.includes('tabs')) score += 1;
  preferredDomains.forEach((domain, index) => {
    if (url.includes(domain)) {
      score += 10 - index;
    }
  });
  if (title.includes('lyrics')) score -= 2;
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
  return createHash('sha256').update(value).digest('hex').slice(0, 12);
}

export function getSearchProvider(): SearchProvider {
  return 'brave';
}

async function queryBraveSearch(
  query: string,
  caller: 'now-playing' | 'diagnostics',
) {
  const keyFp = fingerprint(env.BRAVE_SEARCH_API_KEY);
  const timestamp = new Date().toISOString();
  console.log(
    `[chord-search] ts=${timestamp} pid=${process.pid} provider=brave caller=${caller} keyFp=${keyFp} query="${query}"`,
  );

  const endpoint = new URL(env.BRAVE_SEARCH_ENDPOINT);
  endpoint.searchParams.set('q', query);
  endpoint.searchParams.set('count', '10');

  const response = await fetch(endpoint, {
    headers: {
      'X-Subscription-Token': env.BRAVE_SEARCH_API_KEY,
    },
  });
  const bodyText = await response.text();

  let parsed: unknown = null;
  try {
    parsed = JSON.parse(bodyText);
  } catch {
    parsed = { raw: bodyText };
  }

  if (!response.ok) {
    console.error(`[chord-search] Brave ${response.status}: ${bodyText}`);
  }
  return { response, parsed };
}

async function queryDuckDuckGo(
  query: string,
  caller: 'now-playing' | 'diagnostics',
) {
  const constrainedQuery = `${query} (site:ultimate-guitar.com OR site:tab4u.com)`;
  const timestamp = new Date().toISOString();
  console.log(
    `[chord-search] ts=${timestamp} pid=${process.pid} provider=duckduckgo caller=${caller} query="${constrainedQuery}"`,
  );

  const url = `https://duckduckgo.com/html/?${new URLSearchParams({ q: constrainedQuery }).toString()}`;
  const response = await fetch(url, {
    headers: {
      'User-Agent':
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
    },
  });
  const html = await response.text();
  if (!response.ok) {
    console.error(
      `[chord-search] DuckDuckGo ${response.status}: ${html.slice(0, 500)}`,
    );
  }
  return { response, parsed: html };
}

function parseDuckDuckGoLinks(html: string): ChordLink[] {
  const links: ChordLink[] = [];
  const re =
    /<a[^>]*class="[^"]*result__a[^"]*"[^>]*href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/gi;
  let match: RegExpExecArray | null = null;

  const decodeHtml = (value: string) =>
    value
      .replace(/&amp;/g, '&')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>');

  const unwrapDuckDuckGoRedirect = (url: string): string => {
    try {
      const parsed = url.startsWith('http')
        ? new URL(url)
        : new URL(url, 'https://duckduckgo.com');
      const uddg = parsed.searchParams.get('uddg');
      if (uddg) {
        return decodeURIComponent(uddg);
      }
    } catch {
      // Fall through.
    }
    return url;
  };

  while ((match = re.exec(html)) !== null) {
    const rawUrl = decodeHtml(match[1] ?? '');
    const titleHtml = match[2] ?? '';
    const title = titleHtml.replace(/<[^>]+>/g, '').trim();
    const resolvedUrl = rawUrl.startsWith('//') ? `https:${rawUrl}` : rawUrl;
    const finalUrl = unwrapDuckDuckGoRedirect(resolvedUrl);
    if (finalUrl.startsWith('http')) {
      links.push({ title: title || finalUrl, url: finalUrl });
    }
  }
  return links;
}

function parseBraveLinks(parsed: unknown): ChordLink[] {
  const json = parsed as {
    web?: {
      results?: {
        title?: string;
        url?: string;
        meta_url?: { hostname?: string };
      }[];
    };
  };

  return (json.web?.results ?? [])
    .map((item) => ({
      title: item.title ?? item.url ?? '',
      url: item.url ?? '',
      displayLink: item.meta_url?.hostname,
    }))
    .filter((item) => item.url.startsWith('http'));
}

export async function runSearchDiagnostics() {
  const { response, parsed } = await queryBraveSearch(
    'test chords',
    'diagnostics',
  );
  return {
    provider: 'brave' as const,
    response,
    parsed,
  };
}

export async function searchChordLinks(
  track: TrackInfo,
): Promise<ChordSearchResult> {
  const query = buildQuery(track);
  let links: ChordLink[] = [];

  const brave = await queryBraveSearch(query, 'now-playing');
  if (brave.response.ok) {
    links = parseBraveLinks(brave.parsed);
  } else {
    console.warn(
      '[chord-search] Brave failed, retrying with DuckDuckGo fallback',
    );
  }

  if (links.length === 0) {
    const ddg = await queryDuckDuckGo(query, 'now-playing');
    if (!ddg.response.ok) {
      throw new Error(`Chord search failed (${ddg.response.status})`);
    }
    links = parseDuckDuckGoLinks(ddg.parsed as string);
  }

  const ranked = dedupeLinks(links)
    .sort((a, b) => scoreLink(b) - scoreLink(a))
    .slice(0, 5);

  return { query, links: ranked };
}
