export type TrackInfo = {
  spotifyTrackId: string;
  title: string;
  artists: string[];
  album: string;
  albumImageUrl: string | null;
  spotifyUrl: string | null;
  isPlaying: boolean;
  progressMs: number;
};

export type ChordLink = {
  title: string;
  url: string;
  displayLink?: string;
};

export type ChordSearchResult = {
  query: string;
  links: ChordLink[];
};

export type NowPlayingResponse = {
  connected: boolean;
  nowPlaying: TrackInfo | null;
  chordSearch: ChordSearchResult | null;
};

export * from './utils/index.js';
