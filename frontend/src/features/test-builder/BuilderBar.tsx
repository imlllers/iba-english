import { ActionIcon, Box, Button, Group, Stack, Text, Tooltip } from "@mantine/core";
import type { ReactNode } from "react";
import type { ExamTest } from "@/entities/test/types";
import { FormatToolbarHost } from "@/features/question-types/prompt/RichTextEditor";
import { Icon } from "@/shared/ui/Icon";

export type BuilderWorkspace = "builder" | "settings";

type BuilderBarProps = {
  test: ExamTest;
  workspace: BuilderWorkspace;
  publishing: boolean;
  onPreview: () => void;
  onPublish: () => void;
  save?: ReactNode;
  showFormatToolbar?: boolean;
};

export function BuilderBar({
  test,
  workspace,
  publishing,
  onPreview,
  onPublish,
  save,
  showFormatToolbar = workspace === "builder",
}: BuilderBarProps) {
  const publication = test.status === "PUBLISHED" ? (
    <Text size="sm" c="dimmed" fw={500} style={{ whiteSpace: "nowrap" }}>
      {test.hasUnpublishedChanges ? "Изменения не опубликованы" : "Опубликовано"}
    </Text>
  ) : null;

  return (
    <Box h="100%" pos="relative">
      {showFormatToolbar ? (
        <Box
          className="builder-format-toolbar-slot iba-grid-cols-5-10"
          pos="absolute"
          top={0}
          bottom={0}
          style={{
            left: "calc(var(--grid-col-start-5) - var(--app-shell-navbar-width, var(--sidebar-width)))",
            width: "var(--grid-cols-5-10-width)",
            maxWidth: "100%",
            display: "flex",
            alignItems: "center",
            pointerEvents: "none",
            zIndex: 1,
          }}
        >
          <Box data-format-toolbar style={{ pointerEvents: "auto", width: "100%", position: "relative", zIndex: 5 }}>
            <FormatToolbarHost hideWhenInactive={workspace === "settings"} />
          </Box>
        </Box>
      ) : null}

      <Group
        justify="flex-end"
        wrap="nowrap"
        gap="md"
        px="md"
        h="100%"
        style={{ position: "relative", zIndex: 2, pointerEvents: "none" }}
      >
        <Group gap="md" wrap="nowrap" style={{ flex: "none", pointerEvents: "auto" }}>
          <Tooltip label="Демо-версия">
            <ActionIcon size="lg" aria-label="Демо-версия" onClick={onPreview}>
              <Icon name="eye" />
            </ActionIcon>
          </Tooltip>
          <Button
            loading={publishing}
            onClick={onPublish}
          >
            {publishing ? "Публикация…" : test.status === "PUBLISHED" ? "Обновить" : "Опубликовать"}
          </Button>
        </Group>
      </Group>

      {(save || publication) && (
        <Box
          pos="absolute"
          top="100%"
          right="var(--mantine-spacing-md)"
          mt={6}
          style={{ zIndex: 50, pointerEvents: "none" }}
        >
          <Stack gap={0} align="flex-end">
            {publication}
            {save}
          </Stack>
        </Box>
      )}
    </Box>
  );
}
