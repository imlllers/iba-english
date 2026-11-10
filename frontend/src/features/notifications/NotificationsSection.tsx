import { Alert, Stack } from "@mantine/core";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ACCESS_DATES_ENABLED, DISABLED_SUFFIX } from "@/entities/test/settings";
import { errorMessage } from "@/shared/api/client";
import { Loading } from "@/shared/ui/Loading";
import { notify } from "@/shared/ui/notify";
import { SettingsCard } from "@/shared/ui/SettingsCard";
import { SettingsSectionTitle } from "@/shared/ui/SettingsSectionTitle";
import { Switch } from "@/shared/ui/Switch";
import { NOTIFICATION_GROUPS, notificationsApi, type NotificationPreferences, type NotificationType } from "./notificationsApi";

const KEY = ["notifications", "preferences"];

export function NotificationsSection() {
  const queryClient = useQueryClient();
  const prefs = useQuery({ queryKey: KEY, queryFn: notificationsApi.preferences });
  const save = useMutation({
    mutationFn: notificationsApi.savePreferences,
    onMutate: (next) => {
      const previous = queryClient.getQueryData<NotificationPreferences>(KEY);
      queryClient.setQueryData(KEY, next);
      return { previous };
    },
    onError: (error, _next, context) => {
      if (context?.previous) queryClient.setQueryData(KEY, context.previous);
      notify.error(errorMessage(error, "Не удалось сохранить"));
    },
    onSuccess: (saved) => queryClient.setQueryData(KEY, saved),
  });

  if (prefs.isLoading) return <Loading />;
  if (prefs.isError || !prefs.data) {
    return <Alert color="red" variant="light" role="alert">{errorMessage(prefs.error, "Не удалось загрузить настройки")}</Alert>;
  }
  const data = prefs.data;
  const toggle = (type: NotificationType, value: boolean) => save.mutate({ ...data, [type]: { app: value } });

  return (
    <Stack gap="sm">
      {NOTIFICATION_GROUPS.map((group) => (
        <SettingsCard key={group.title} id={group.anchor}>
          <Stack gap="md">
            <SettingsSectionTitle>{group.title}</SettingsSectionTitle>
            {group.items.map((item) => {
              const off = item.dated && !ACCESS_DATES_ENABLED;
              return (
                <Switch
                  key={item.type}
                  label={off ? item.label + DISABLED_SUFFIX : item.label}
                  description={off ? "Даты доступа к тестам пока отключены, поэтому уведомление не приходит" : item.description}
                  disabled={off}
                  checked={off ? false : data[item.type]?.app ?? true}
                  onChange={(value) => toggle(item.type, value)}
                />
              );
            })}
          </Stack>
        </SettingsCard>
      ))}
    </Stack>
  );
}
