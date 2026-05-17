import { useEffect, useMemo } from 'react';
import {
  AppShell,
  Group,
  Paper,
  Stack,
  Text,
  ThemeIcon,
  Title,
} from '@mantine/core';
import { IconMusic, IconPlayerPlay } from '@tabler/icons-react';
import { ConnectSpotifyCard } from './components/auth/ConnectSpotifyCard';
import { ChordEmbedPanel } from './components/chords/ChordEmbedPanel';
import { ChordLinksList } from './components/chords/ChordLinksList';
import { ErrorAlert } from './components/common/ErrorAlert';
import { NowPlayingHeader } from './components/player/NowPlayingHeader';
import { NowPlayingTrackCard } from './components/player/NowPlayingTrackCard';
import { useNowPlayingPoll } from './hooks/useNowPlayingPoll';
import { useRememberPreference } from './hooks/useRememberPreference';
import { useSpotifySession } from './hooks/useSpotifySession';

function App() {
  const { rememberMe, setRememberMe } = useRememberPreference();
  const { connected, loading, error: sessionError } = useSpotifySession();
  const { data, error: pollingError } = useNowPlayingPoll(connected);
  const error = pollingError ?? sessionError;
  const trackLabel = useMemo(() => {
    if (!data?.nowPlaying) return 'No track playing';
    return `${data.nowPlaying.title} - ${data.nowPlaying.artists.join(', ')}`;
  }, [data]);

  if (loading) {
    return (
      <AppShell padding="lg">
        <Text>Loading...</Text>
      </AppShell>
    );
  }

  return (
    <AppShell
      header={{ height: 64 }}
      padding={connected ? 'md' : 'xl'}
      layout="alt"
      withBorder
    >
      <AppShell.Header px="md">
        <Group h="100%" justify="space-between" wrap="nowrap">
          <Group wrap="nowrap" gap="sm">
            <ThemeIcon variant="light" size="lg" radius="md">
              <IconMusic size={18} />
            </ThemeIcon>
            <div>
              <Text fw={700}>Auto Chords</Text>
              <Text size="xs" c="dimmed">
                Spotify live chord finder
              </Text>
            </div>
          </Group>
          {connected ? (
            <Group gap="xs" wrap="nowrap">
              <ThemeIcon variant="light" size="sm">
                <IconPlayerPlay size={14} />
              </ThemeIcon>
              <Text size="sm" c="dimmed" lineClamp={1}>
                {trackLabel}
              </Text>
            </Group>
          ) : null}
        </Group>
      </AppShell.Header>

      <AppShell.Main>
        {!connected ? (
          <ConnectSpotifyCard
            rememberMe={rememberMe}
            onRememberChange={setRememberMe}
            error={error}
          />
        ) : (
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

            {error ? (
              <ErrorAlert title="Request Error" message={error} />
            ) : null}
          </Stack>
        )}
      </AppShell.Main>
    </AppShell>
  );
}

export default App;
