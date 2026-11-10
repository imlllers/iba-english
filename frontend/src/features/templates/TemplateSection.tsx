import { Alert, Badge, Grid, Group, NavLink, Stack } from "@mantine/core";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { isExamTypeDisabled } from "@/entities/test/settings";
import { errorMessage } from "@/shared/api/client";
import { EmptyState } from "@/shared/ui/EmptyState";
import { Icon } from "@/shared/ui/Icon";
import { Loading } from "@/shared/ui/Loading";
import { IconButton } from "@/shared/ui/IconButton";
import { notify } from "@/shared/ui/notify";
import { PageHeader } from "@/shared/ui/PageHeader";
import { SettingsCard } from "@/shared/ui/SettingsCard";
import { SettingsHint } from "@/shared/ui/SettingsHint";
import { SettingsSectionTitle } from "@/shared/ui/SettingsSectionTitle";
import { TemplateEditor } from "./TemplateEditor";
import { defaultCustomSettings, emptyCustomSections, templatesApi } from "./templatesApi";

export function TemplateSection() {
  const queryClient = useQueryClient();
  const [params, setParams] = useSearchParams();
  const list = useQuery({ queryKey: ["templates"], queryFn: templatesApi.list });
  const items = list.data ?? [];
  const selectedId = params.get("id");
  const available = items.filter((item) => !isExamTypeDisabled(item.family) && !isExamTypeDisabled(item.defaultSettings.examType));
  const selected = available.find((item) => item.id === selectedId) ?? available[0];
  const [headerTarget, setHeaderTarget] = useState<HTMLDivElement | null>(null);

  const select = (id: string | null) => {
    const next = new URLSearchParams(params);
    if (id) next.set("id", id);
    else next.delete("id");
    setParams(next, { replace: true });
  };

  useEffect(() => {
    if (list.isSuccess && selected && selected.id !== selectedId) select(selected.id);
  }, [list.isSuccess, selected?.id, selectedId]);

  const create = useMutation({
    mutationFn: () =>
      templatesApi.create({
        title: "Новый шаблон",
        sections: emptyCustomSections(),
        defaultSettings: defaultCustomSettings(),
      }),
    onSuccess: (created) => {
      queryClient.setQueryData(["template", created.id], created);
      void queryClient.invalidateQueries({ queryKey: ["templates"] });
      select(created.id);
    },
    onError: (error) => notify.error(errorMessage(error, "Не удалось создать шаблон")),
  });

  if (list.isLoading) {
    return (
      <Stack gap="sm">
        <PageHeader title="Шаблоны тестов" />
        <Loading />
      </Stack>
    );
  }
  if (list.isError) {
    return (
      <Stack gap="sm">
        <PageHeader title="Шаблоны тестов" />
        <Alert color="red" variant="light" role="alert">{errorMessage(list.error, "Не удалось загрузить шаблоны")}</Alert>
      </Stack>
    );
  }

  const listCard = (
    <SettingsCard>
      <Stack gap="sm">
        <Group justify="space-between" gap="md" wrap="nowrap">
          <SettingsSectionTitle>Шаблоны</SettingsSectionTitle>
          <IconButton
            variant="subtle"
            color="gray"
            size="lg"
            label="Новый шаблон"
            loading={create.isPending}
            onClick={() => create.mutate()}
          >
            <Icon name="plus" size={20} />
          </IconButton>
        </Group>
        {items.length === 0 && <SettingsHint>Шаблонов нет. Нажмите «+», чтобы создать</SettingsHint>}
        <Stack gap={4}>
          {items.map((item) => {
            const off = isExamTypeDisabled(item.family) || isExamTypeDisabled(item.defaultSettings.examType);
            return (
              <NavLink
                key={item.id}
                component="button"
                type="button"
                noWrap
                disabled={off}
                active={item.id === selected?.id}
                label={item.title}
                rightSection={off
                  ? <Badge variant="light" color="gray" size="xs">недоступен</Badge>
                  : item.builtin ? <Badge variant="light" color="gray" size="xs">встроенный</Badge> : null}
                styles={{ label: { fontWeight: 600 } }}
                onClick={() => select(item.id)}
              />
            );
          })}
        </Stack>
      </Stack>
    </SettingsCard>
  );

  return (
    <Stack gap="sm">
      {selected ? <div ref={setHeaderTarget} /> : <PageHeader title="Шаблоны тестов" />}
      <Grid columns={10} gap="var(--grid-gutter)" align="flex-start">
        <Grid.Col span={{ base: 10, md: 2 }}>{listCard}</Grid.Col>
        <Grid.Col span={{ base: 10, md: 8 }}>
          {selected ? (
            <TemplateEditor key={selected.id} templateId={selected.id} headerTarget={headerTarget} onRemoved={() => select(null)} />
          ) : (
            <EmptyState title="Шаблонов пока нет">Создайте свой шаблон структуры теста</EmptyState>
          )}
        </Grid.Col>
      </Grid>
    </Stack>
  );
}
