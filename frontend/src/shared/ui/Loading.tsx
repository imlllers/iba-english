import { Center, Loader, Stack } from "@mantine/core";
import { SettingsHint } from "@/shared/ui/SettingsHint";

export function Loading({
  text,
  fullPage = false,
}: {
  text?: string;
  fullPage?: boolean;
}) {
  const body = (
    <Stack align="center" gap="sm" role="status" aria-live="polite" aria-label={text ?? "Загрузка"}>
      <Loader color="iba" size="md" />
      {text ? <SettingsHint>{text}</SettingsHint> : null}
    </Stack>
  );

  if (fullPage) {
    return (
      <Center mih="100vh" miw="100%" bg="gray.0" px="md" py="xl">
        {body}
      </Center>
    );
  }

  return (
    <Center py={48} px="md">
      {body}
    </Center>
  );
}
