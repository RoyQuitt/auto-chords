import { useEffect, useState } from "react";
import type { NowPlayingResponse } from "@repo/shared";
import { getNowPlaying } from "../api";
import { useSearchChordsInNewTab } from './useSearchChordsInNewTab';

export function useNowPlayingPoll(connected: boolean, onSuccess?: () => void) {
  const [data, setData] = useState<NowPlayingResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  useSearchChordsInNewTab(data?.nowPlaying ?? null);

  useEffect(() => {
    if (!connected) return;
    let mounted = true;

    const poll = async () => {
      try {
        const next = await getNowPlaying();
        if (!mounted) return;
        setData(next);
        setError(null);
        onSuccess?.();
      } catch (e) {
        if (!mounted) return;
        setError((e as Error).message);
      }
    };

    poll();
    const id = window.setInterval(poll, 8000);
    return () => {
      mounted = false;
      clearInterval(id);
    };
  }, [connected, onSuccess]);

  return { data, error };
}
