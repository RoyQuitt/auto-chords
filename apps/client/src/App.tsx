import { type ChangeEvent, useEffect, useState } from "react";
import type { NowPlayingResponse } from "@repo/shared";
import {
  Alert,
  AppShell,
  Anchor,
  Avatar,
  Badge,
  Button,
  Checkbox,
  Group,
  List,
  Paper,
  Stack,
  Text,
  Title
} from "@mantine/core";
import { getNowPlaying, getSession, spotifyLoginUrl } from "./api";

const REMEMBER_KEY = "spotify_chords_remember_me";

function App() {
  const [connected, setConnected] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<NowPlayingResponse | null>(null);
  const [iframeFailed, setIframeFailed] = useState<boolean>(false);
  const [rememberMe, setRememberMe] = useState<boolean>(() => {
    return window.localStorage.getItem(REMEMBER_KEY) === "1";
  });

  useEffect(() => {
    window.localStorage.setItem(REMEMBER_KEY, rememberMe ? "1" : "0");
  }, [rememberMe]);

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
        setError(null);
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

  const firstChordLink = data?.chordSearch?.links?.[0]?.url ?? null;

  useEffect(() => {
    setIframeFailed(false);
  }, [firstChordLink]);

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
        <Group justify="center" mt="xl">
          <Paper shadow="sm" radius="lg" p="xl" maw={560} w="100%">
            <Stack gap="md">
              <Title order={2}>Spotify Chord Links</Title>
              <Text c="dimmed">
                Connect Spotify and this app will search for chord pages for your current track.
              </Text>
              <Checkbox
                label="Remember me on this browser"
                checked={rememberMe}
                onChange={(e: ChangeEvent<HTMLInputElement>) =>
                  setRememberMe(e.currentTarget.checked)
                }
              />
              <Button component="a" href={spotifyLoginUrl(rememberMe)}>
                Connect Spotify
              </Button>
              {error ? (
                <Alert color="red" title="Connection Error">
                  {error}
                </Alert>
              ) : null}
            </Stack>
          </Paper>
        </Group>
      </AppShell>
    );
  }

  return (
    <AppShell padding="md">
      <Stack gap="md">
        <Group justify="space-between" align="center">
          <Title order={2}>Now Playing</Title>
          <Badge variant="light" color="green">
            Live Polling
          </Badge>
        </Group>

        {!data?.nowPlaying ? (
          <Paper withBorder radius="md" p="md">
            <Text>Nothing playing right now. Start a song in Spotify.</Text>
          </Paper>
        ) : (
          <>
            <Paper withBorder radius="md" p="md">
              <Group wrap="nowrap" align="center">
                <Avatar src={data.nowPlaying.albumImageUrl ?? undefined} radius="md" size={96} />
                <Stack gap={2}>
                  <Title order={3}>{data.nowPlaying.title}</Title>
                  <Text c="dimmed">{data.nowPlaying.artists.join(", ")}</Text>
                  {data.nowPlaying.spotifyUrl ? (
                    <Anchor href={data.nowPlaying.spotifyUrl} target="_blank" rel="noreferrer">
                      Open on Spotify
                    </Anchor>
                  ) : null}
                </Stack>
              </Group>
            </Paper>

            <Paper withBorder radius="md" p="md">
              <Stack gap="sm">
                <Title order={4}>Top Chord Links</Title>

                {data.chordSearch?.links.length ? (
                  <>
                    {firstChordLink ? (
                      <Button
                        component="a"
                        href={firstChordLink}
                        target="_blank"
                        rel="noreferrer"
                        variant="light"
                        w="fit-content"
                      >
                        Open Top Result in New Tab
                      </Button>
                    ) : null}

                    {firstChordLink && !iframeFailed ? (
                      <div className="iframe-wrap">
                        <iframe
                          title="Chord Viewer"
                          src={firstChordLink}
                          className="chord-iframe"
                          onError={() => setIframeFailed(true)}
                        />
                      </div>
                    ) : (
                      <Alert color="yellow" title="Embed Blocked">
                        This site blocks embedding in iframe. Use the links below.
                      </Alert>
                    )}

                    <List spacing="sm" center={false}>
                      {data.chordSearch.links.map((link) => (
                        <List.Item key={link.url}>
                          <Anchor href={link.url} target="_blank" rel="noreferrer">
                            {link.title}
                          </Anchor>
                          {link.displayLink ? (
                            <Text c="dimmed" size="xs">
                              {link.displayLink}
                            </Text>
                          ) : null}
                        </List.Item>
                      ))}
                    </List>
                  </>
                ) : (
                  <Text>No chord links found for this song yet.</Text>
                )}
              </Stack>
            </Paper>
          </>
        )}

        {error ? (
          <Alert color="red" title="Request Error">
            {error}
          </Alert>
        ) : null}
      </Stack>
    </AppShell>
  );
}

export default App;
