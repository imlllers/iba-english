import { Alert, Button, List, Modal, Stack, Text, TextInput } from "@mantine/core";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { useNavigate } from "react-router-dom";
import { z } from "zod";
import { DISABLED_SUFFIX, isExamTypeDisabled } from "@/entities/test/settings";
import { templatesApi } from "@/features/templates/templatesApi";
import { errorMessage } from "@/shared/api/client";
import { Select } from "@/shared/ui/Select";
import { testsApi } from "./testsApi";

const schema = z.object({
  title: z.string().trim().min(1, "Укажите название").max(200, "Не длиннее 200 символов"),
  templateId: z.string(),
});

type Values = z.infer<typeof schema>;

export function CreateTestDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const templates = useQuery({
    queryKey: ["templates"],
    queryFn: templatesApi.list,
    enabled: open,
    staleTime: 60_000,
  });
  const form = useForm<Values>({ resolver: zodResolver(schema), defaultValues: { title: "", templateId: "" } });
  const create = useMutation({
    mutationFn: (values: Values) =>
      testsApi.create({
        title: values.title.trim(),
        description: "",
        templateId: values.templateId || null,
      }),
    onSuccess: (test) => {
      queryClient.setQueryData(["test", test.id], test);
      void queryClient.invalidateQueries({ queryKey: ["tests"] });
      navigate(`/teacher/tests/${test.id}`, { replace: true });
    },
  });
  const templateId = form.watch("templateId");
  const template = templates.data?.find((item) => item.id === templateId);

  useEffect(() => {
    if (open) {
      form.reset({ title: "", templateId: "" });
      void import("@/pages/TestBuilderPage/TestBuilderPage");
    }
  }, [open, form]);

  return (
    <Modal opened={open} onClose={onClose} title="Новый тест" centered>
      <form noValidate onSubmit={form.handleSubmit((values) => create.mutate(values))}>
        <Stack gap="md">
          <TextInput
            label="Название"
            withAsterisk
            autoFocus
            placeholder="Введите название"
            error={form.formState.errors.title?.message}
            {...form.register("title")}
          />
          <Select
            label="Шаблон"
            value={form.watch("templateId")}
            onChange={(next) => form.setValue("templateId", next)}
            options={[
              { value: "", label: "Пустой тест" },
              ...(templates.data?.map((item) => {
                const off = isExamTypeDisabled(item.family) || isExamTypeDisabled(item.defaultSettings.examType);
                return {
                  value: item.id,
                  label: (item.builtin ? item.title : `${item.title} (свой)`) + (off ? DISABLED_SUFFIX : ""),
                  disabled: off,
                };
              }) ?? []),
            ]}
          />
          {template && (
            <Stack gap="xs">
              <List size="sm" spacing="xs">
                {template.sections.map((section) => (
                  <List.Item key={`${section.title}-${section.sectionType}`}>
                    <Text component="span" fw={600}>{section.title}</Text>
                    <Text component="span" size="xs" c="dimmed" ml={8}>
                      {section.timeLimitMinutes != null ? `${section.timeLimitMinutes} мин` : "без лимита"}
                    </Text>
                    {section.parts && section.parts.length > 0 ? (
                      <Text size="xs" c="dimmed" mt={2}>
                        {section.parts.map((part) => part.title).join(" · ")}
                      </Text>
                    ) : null}
                  </List.Item>
                ))}
              </List>
            </Stack>
          )}
          {create.isError && (
            <Alert color="red" variant="light" role="alert">
              {errorMessage(create.error, "Не удалось создать тест")}
            </Alert>
          )}
          <Button type="submit" loading={create.isPending}>
            {create.isPending ? "Создание…" : "Создать"}
          </Button>
        </Stack>
      </form>
    </Modal>
  );
}
