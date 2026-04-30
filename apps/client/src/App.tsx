import { AppShell, Paper, Stack, Text, Title } from "@mantine/core";
import { ConnectSpotifyCard } from "./components/auth/ConnectSpotifyCard";
import { ChordEmbedPanel } from "./components/chords/ChordEmbedPanel";
import { ChordLinksList } from "./components/chords/ChordLinksList";
import { ErrorAlert } from "./components/common/ErrorAlert";
import { NowPlayingHeader } from "./components/player/NowPlayingHeader";
import { NowPlayingTrackCard } from "./components/player/NowPlayingTrackCard";
import { useNowPlayingPoll } from "./hooks/useNowPlayingPoll";
import { useRememberPreference } from "./hooks/useRememberPreference";
import { useSpotifySession } from "./hooks/useSpotifySession";

function App() {
  const { rememberMe, setRememberMe } = useRememberPreference();
  const { connected, loading, error: sessionError } = useSpotifySession();
  const { data, error: pollingError } = useNowPlayingPoll(connected);
  const error = pollingError ?? sessionError;

  if (loading) {
    return (
      <AppShell padding="lg">
        <Text>Loading...</Text>
      </AppShell>
    );
  }

  if (!connected) {
    return (
      <AppShell padding="xl">
        <ConnectSpotifyCard
          rememberMe={rememberMe}
          onRememberChange={setRememberMe}
          error={error}
        />
      </AppShell>
    );
  }

  return (
    <AppShell padding="md">
      <Stack gap="md">
        <NowPlayingHeader />

        {!data?.nowPlaying ? (
          <Paper withBorder radius="md" p="md">
            <Text>Nothing playing right now. Start a song in Spotify.</Text>
          </Paper>
        ) : (
          <>
            <NowPlayingTrackCard track={data.nowPlaying} />
            <Paper withBorder radius="md" p="md">
              <Stack gap="sm">
                <Title order={4}>Top Chord Links</Title>
                {data.chordSearch?.links.length ? (
                  <>
                    <ChordEmbedPanel links={data.chordSearch.links} />
                    <ChordLinksList links={data.chordSearch.links} />
                  </>
                ) : (
                  <Text>No chord links found for this song yet.</Text>
                )}
              </Stack>
            </Paper>
          </>
        )}

        {error ? <ErrorAlert title="Request Error" message={error} /> : null}
      </Stack>
    </AppShell>
  );
}

export default App;
