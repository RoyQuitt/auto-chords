import type { ChordLink } from "@repo/shared";
import { Anchor, List, Text } from "@mantine/core";

type ChordLinksListProps = {
  links: ChordLink[];
};

export function ChordLinksList({ links }: ChordLinksListProps) {
  return (
    <List spacing="sm" center={false}>
      {links.map((link) => (
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
  );
}
