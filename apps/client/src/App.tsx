import { useEffect, useState } from "react";
import { getNowPlaying, getSession, spotifyLoginUrl } from "./api";
import type { NowPlayingResponse } from "./types";

function App() {
  const [connected, setConnected] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<NowPlayingResponse | null>(null);

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

  useEffect(() => {
    if (!connected) return;
    let mounted = true;

    const poll = async () => {
      try {
        const next = await getNowPlaying();
        if (!mounted) return;
        setData(next);
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
  }, [connected]);

  if (loading) {
    return <main className="page"><p>Loading…</p></main>;
  }

  if (!connected) {
    return (
      <main className="page">
        <section className="card">
          <h1>Spotify Chord Links</h1>
          <p>Connect Spotify and this app will search for chord pages for your current track.</p>
          <a className="btn" href={spotifyLoginUrl()}>
            Connect Spotify
          </a>
          {error ? <p className="error">{error}</p> : null}
        </section>
      </main>
    );
  }

  return (
    <main className="page">
      <section className="card">
        <h1>Now Playing</h1>
        {!data?.nowPlaying ? (
          <p>Nothing playing right now. Start a song in Spotify.</p>
        ) : (
          <>
            <div className="track">
              {data.nowPlaying.albumImageUrl ? (
                <img src={data.nowPlaying.albumImageUrl} alt="Album art" />
              ) : null}
              <div>
                <h2>{data.nowPlaying.title}</h2>
                <p>{data.nowPlaying.artists.join(", ")}</p>
                {data.nowPlaying.spotifyUrl ? (
                  <a href={data.nowPlaying.spotifyUrl} target="_blank" rel="noreferrer">
                    Open on Spotify
                  </a>
                ) : null}
              </div>
            </div>
            <div className="links">
              <h3>Top Chord Links</h3>
              {data.chordSearch?.links.length ? (
                <ul>
                  {data.chordSearch.links.map((link) => (
                    <li key={link.url}>
                      <a href={link.url} target="_blank" rel="noreferrer">
                        {link.title}
                      </a>
                      {link.displayLink ? <span>{link.displayLink}</span> : null}
                    </li>
                  ))}
                </ul>
              ) : (
                <p>No chord links found for this song yet.</p>
              )}
            </div>
          </>
        )}
        {error ? <p className="error">{error}</p> : null}
      </section>
    </main>
  );
}

export default App;
