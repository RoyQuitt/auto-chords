import type { TrackInfo } from "@repo/shared";
import { Anchor, Avatar, Group, Paper, Stack, Text, Title } from "@mantine/core";

type NowPlayingTrackCardProps = {
  track: TrackInfo;
};

export function NowPlayingTrackCard({ track }: NowPlayingTrackCardProps) {
  return (
    <Paper withBorder radius="md" p="md">
      <Group wrap="nowrap" align="center">
        <Avatar src={track.albumImageUrl ?? undefined} radius="md" size={96} />
        <Stack gap={2}>
          <Title order={3}>{track.title}</Title>
          <Text c="dimmed">{track.artists.join(", ")}</Text>
          {track.spotifyUrl ? (
            <Anchor href={track.spotifyUrl} target="_blank" rel="noreferrer">
              Open on Spotify
            </Anchor>
          ) : null}
        </Stack>
      </Group>
    </Paper>
  );
}
