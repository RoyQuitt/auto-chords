import { useEffect, useState } from "react";
import { getSession } from "../api";

export function useSpotifySession() {
  const [connected, setConnected] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    const fetchSession = async () => {
      try {
        const session = await getSession();
        if (mounted) setConnected(session.connected);
      } catch (e) {
        if (mounted) setError((e as Error).message);
      } finally {
        if (mounted) setLoading(false);
      }
    };
    fetchSession();
    return () => {
      mounted = false;
    };
  }, []);

  return { connected, loading, error, setError };
}
