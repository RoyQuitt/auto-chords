export type NowPlayingResponse = {
  connected: boolean;
  nowPlaying: {
    spotifyTrackId: string;
    title: string;
    artists: string[];
    album: string;
    albumImageUrl: string | null;
    spotifyUrl: string | null;
    isPlaying: boolean;
    progressMs: number;
  } | null;
  chordSearch: {
    query: string;
    links: { title: string; url: string; displayLink?: string }[];
  } | null;
};
