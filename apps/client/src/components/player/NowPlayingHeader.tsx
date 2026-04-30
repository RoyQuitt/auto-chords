import { Badge, Group, Title } from "@mantine/core";

export function NowPlayingHeader() {
  return (
    <Group justify="space-between" align="center">
      <Title order={2}>Now Playing</Title>
      <Badge variant="light" color="green">
        Live Polling
      </Badge>
    </Group>
  );
}
