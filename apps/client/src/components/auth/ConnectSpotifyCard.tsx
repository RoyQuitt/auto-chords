import { type ChangeEvent } from "react";
import { Button, Checkbox, Group, Paper, Stack, Text, Title } from "@mantine/core";
import { spotifyLoginUrl } from "../../api";
import { ErrorAlert } from "../common/ErrorAlert";

type ConnectSpotifyCardProps = {
  rememberMe: boolean;
  onRememberChange: (value: boolean) => void;
  error?: string | null;
};

export function ConnectSpotifyCard({
  rememberMe,
  onRememberChange,
  error
}: ConnectSpotifyCardProps) {
  return (
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
            onChange={(e: ChangeEvent<HTMLInputElement>) => onRememberChange(e.currentTarget.checked)}
          />
          <Button component="a" href={spotifyLoginUrl(rememberMe)}>
            Connect Spotify
          </Button>
          {error ? <ErrorAlert title="Connection Error" message={error} /> : null}
        </Stack>
      </Paper>
    </Group>
  );
}
