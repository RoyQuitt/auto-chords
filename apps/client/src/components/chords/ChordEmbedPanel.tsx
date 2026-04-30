import { useEffect, useState } from "react";
import type { ChordLink } from "@repo/shared";
import { Alert, Anchor, Button, Group, Stack, Text } from "@mantine/core";

type ChordEmbedPanelProps = {
  links: ChordLink[];
};

export function ChordEmbedPanel({ links }: ChordEmbedPanelProps) {
  const firstLink = links[0]?.url ?? null;
  const [iframeFailed, setIframeFailed] = useState(false);

  useEffect(() => {
    setIframeFailed(false);
  }, [firstLink]);

  if (!firstLink) return null;

  return (
    <Stack gap="sm">
      <Button
        component="a"
        href={firstLink}
        target="_blank"
        rel="noreferrer"
        variant="light"
        w="fit-content"
      >
        Open Top Result in New Tab
      </Button>

      {!iframeFailed ? (
        <div className="iframe-wrap">
          <iframe
            title="Chord Viewer"
            src={firstLink}
            className="chord-iframe"
            onError={() => setIframeFailed(true)}
          />
        </div>
      ) : (
        <Alert color="yellow" title="Embed Blocked">
          <Text size="sm">This site blocks embedding in iframe. Use links below.</Text>
          {links.length > 1 ? (
            <Group mt="xs" gap="xs">
              {links.slice(1, 4).map((link) => (
                <Anchor key={link.url} href={link.url} target="_blank" rel="noreferrer">
                  Try: {link.title}
                </Anchor>
              ))}
            </Group>
          ) : null}
        </Alert>
      )}
    </Stack>
  );
}
