import { Alert, Button, SimpleGrid, Stack, Text } from "@mantine/core";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { adminApi, type UploadKind } from "@/features/admin/adminApi";
import { NumberField } from "@/features/question-types/widgets/NumberField";
import { errorMessage } from "@/shared/api/client";
import { Loading } from "@/shared/ui/Loading";
import { notify } from "@/shared/ui/notify";
import { PageHeader } from "@/shared/ui/PageHeader";
import { SettingsCard } from "@/shared/ui/SettingsCard";
import { SettingsSectionTitle } from "@/shared/ui/SettingsSectionTitle";
import { scrollToAnchor } from "@/pages/ProfilePage/settingsSearch";
import { SettingsHeaderSearch } from "@/pages/ProfilePage/SettingsHeaderSearch";

const MB = 1024 * 1024;

const UPLOAD_FIELDS: { kind: UploadKind; label: string }[] = [
  { kind: "audio", label: "Аудио, МБ" },
  { kind: "image", label: "Изображения, МБ" },
  { kind: "recording", label: "Записи голоса, МБ" },
  { kind: "video", label: "Видео, МБ" },
];

export function AdminSettingsPage() {
  const queryClient = useQueryClient();
  const settings = useQuery({ queryKey: ["platform-settings"], queryFn: adminApi.settings });
  const [megabytes, setMegabytes] = useState<Partial<Record<UploadKind, number>>>({});
  const [days, setDays] = useState<number>();
  const [hours, setHours] = useState<number>();
  const navigate = useNavigate();
  const location = useLocation();
  const stateAnchor = (location.state as { anchor?: string } | null)?.anchor;
  const save = useMutation({
    mutationFn: () => adminApi.updateSettings({
      uploadLimits: Object.fromEntries(UPLOAD_FIELDS.map(({ kind }) => [kind, (megabytes[kind] ?? 0) * MB])) as Record<UploadKind, number>,
      attemptRetentionDays: days ?? 0,
      linkLifetimeHours: hours ?? 12,
    }),
    onSuccess: (next) => {
      queryClient.setQueryData(["platform-settings"], next);
      notify.success("Настройки сохранены");
    },
    onError: (error) => notify.error(errorMessage(error, "Настройки не сохранены")),
  });
  useEffect(() => {
    if (settings.data) {
      setMegabytes(Object.fromEntries(UPLOAD_FIELDS.map(({ kind }) => [
        kind,
        Math.max(1, Math.round((settings.data!.uploadLimits?.[kind] ?? settings.data!.maxUploadBytes) / MB)),
      ])));
      setDays(settings.data.attemptRetentionDays);
      setHours(settings.data.linkLifetimeHours);
    }
  }, [settings.data]);

  const loaded = Boolean(settings.data);
  useEffect(() => {
    if (!loaded || !stateAnchor) {
      return;
    }
    const timer = window.setTimeout(() => scrollToAnchor(stateAnchor), 50);
    return () => window.clearTimeout(timer);
  }, [loaded, stateAnchor]);

  const serverMaxMb = Math.max(1, Math.floor((settings.data?.serverMaxUploadBytes ?? 20 * MB) / MB));
  const valid = UPLOAD_FIELDS.every(({ kind }) => {
    const value = megabytes[kind];
    return value !== undefined && value >= 1 && value <= serverMaxMb;
  });

  return (
    <Stack gap="sm">
      <SettingsHeaderSearch
        teacher={false}
        onSelect={(item) => (item.section === "platform" && item.anchor
          ? scrollToAnchor(item.anchor)
          : navigate("/admin/profile", { state: { anchor: item.anchor } }))}
      />
      <PageHeader title="Настройки платформы" />
      {settings.isLoading && <Loading />}
      {settings.isError && (
        <Alert color="red" variant="light" role="alert">{errorMessage(settings.error, "Не удалось загрузить настройки")}</Alert>
      )}
      {settings.data && (
        <Stack gap="sm">
          <SettingsCard id="platform-general">
            <form
              noValidate
              onSubmit={(event) => {
                event.preventDefault();
                if (valid) save.mutate();
              }}
            >
              <Stack gap="md">
                <SettingsSectionTitle>Общие</SettingsSectionTitle>
                <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="md">
                  {UPLOAD_FIELDS.map(({ kind, label }) => (
                    <NumberField
                      key={kind}
                      label={label}
                      withAsterisk
                      value={megabytes[kind]}
                      min={1}
                      max={serverMaxMb}
                      onChange={(value) => setMegabytes((prev) => ({ ...prev, [kind]: value }))}
                    />
                  ))}
                </SimpleGrid>
                {!valid && <Text c="red" size="sm">Укажите размер от 1 до {serverMaxMb} МБ для каждого вида файлов</Text>}
                <Button type="submit" disabled={!valid} loading={save.isPending} w="fit-content">
                  Сохранить
                </Button>
              </Stack>
            </form>
          </SettingsCard>
        </Stack>
      )}
    </Stack>
  );
}
