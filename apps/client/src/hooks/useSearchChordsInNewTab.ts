import { buildQuery, TrackInfo } from '@repo/shared';
import { useEffect, useState } from 'react';

export const useSearchChordsInNewTab = (track: TrackInfo | null) => {
  const [prevTrackId, setPrevTrack] = useState<string | null>(null);

  useEffect(() => {
    if (!track || track.spotifyTrackId === prevTrackId) {
      return;
    }
    const query = buildQuery(track);
    const url = `https://www.google.com/search?q=${encodeURIComponent(query)}`;
    window.open(url, '_blank');
    setPrevTrack(track.spotifyTrackId);
  }, [track]);
};
