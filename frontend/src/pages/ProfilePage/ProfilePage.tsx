import { Alert, Avatar, Button, Grid, NavLink, Popover, SimpleGrid, Stack, Text, TextInput, UnstyledButton } from "@mantine/core";
import { zodResolver } from "@hookform/resolvers/zod";
import { IconBell, IconLogout, IconPencil, IconUser } from "@tabler/icons-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { useForm } from "react-hook-form";
import { useLocation, useNavigate, useSearchParams } from "react-router-dom";
import { z } from "zod";
import { authApi } from "@/features/auth/authApi";
import { useLogout } from "@/features/auth/useLogout";
import { useSession } from "@/features/auth/useSession";
import type { User } from "@/entities/user/types";
import { ApiError, applyFieldErrors, errorMessage } from "@/shared/api/client";
import { notify } from "@/shared/ui/notify";
import { PageHeader } from "@/shared/ui/PageHeader";
import { PasswordStrengthMeter } from "@/shared/ui/PasswordStrengthMeter";
import { SettingsCard } from "@/shared/ui/SettingsCard";
import { SettingsSectionTitle } from "@/shared/ui/SettingsSectionTitle";
import { AVATARS, UserAvatar, avatarSrc } from "@/shared/ui/UserAvatar";
import { TemplateSection } from "@/features/templates/TemplateSection";
import { ScoreScalesSection } from "@/features/score-scales/ScoreScalesSection";
import { NotificationsSection } from "@/features/notifications/NotificationsSection";
import { SettingsHeaderSearch } from "./SettingsHeaderSearch";
import { scrollToAnchor, type SettingsSearchItem, type SettingsSectionId } from "./settingsSearch";

const SECTIONS: SettingsSectionId[] = ["profile", "template", "scale", "notifications"];

function resolveSection(value: string | null): SettingsSectionId {
  return SECTIONS.includes(value as SettingsSectionId) ? (value as SettingsSectionId) : "profile";
}

const profileSchema = z.object({
  displayName: z.string().trim().min(1, "Укажите имя").max(120, "Не длиннее 120 символов"),
  email: z.string().trim().email("Укажите email в формате name@example.com"),
});
const passwordSchema = z.object({
  currentPassword: z.string().min(1, "Введите текущий пароль"),
  newPassword: z.string().min(8, "Не короче 8 символов").max(128, "Не длиннее 128 символов"),
  repeat: z.string(),
}).refine((values) => values.newPassword === values.repeat, { path: ["repeat"], message: "Пароли не совпадают" });

type ProfileValues = z.infer<typeof profileSchema>;
type PasswordValues = z.infer<typeof passwordSchema>;

export function ProfilePage() {
  const session = useSession();
  const queryClient = useQueryClient();
  const [params, setParams] = useSearchParams();
  const section = resolveSection(params.get("section"));
  const user = session.data;
  const isTeacher = user?.role === "TEACHER";
  const pendingAnchor = useRef<string | null>(null);
  const navigate = useNavigate();
  const location = useLocation();
  const stateAnchor = (location.state as { anchor?: string } | null)?.anchor;

  const profile = useForm<ProfileValues>({ resolver: zodResolver(profileSchema), defaultValues: { displayName: user?.displayName ?? "", email: user?.email ?? "" } });
  const password = useForm<PasswordValues>({ resolver: zodResolver(passwordSchema), defaultValues: { currentPassword: "", newPassword: "", repeat: "" } });

  useEffect(() => {
    if (user) {
      profile.reset({ displayName: user.displayName, email: user.email });
    }
  }, [user?.displayName, user?.email]);

  useEffect(() => {
    if (!stateAnchor) {
      return;
    }
    const timer = window.setTimeout(() => scrollToAnchor(stateAnchor), 50);
    return () => window.clearTimeout(timer);
  }, [stateAnchor]);

  useEffect(() => {
    const anchor = pendingAnchor.current;
    if (!anchor) {
      return;
    }
    pendingAnchor.current = null;
    const timer = window.setTimeout(() => scrollToAnchor(anchor), 50);
    return () => window.clearTimeout(timer);
  }, [section]);

  const saveProfile = useMutation({
    mutationFn: (values: ProfileValues) => authApi.updateProfile(values.displayName.trim(), isTeacher ? undefined : values.email.trim()),
    onSuccess: (next) => {
      queryClient.setQueryData(["me"], next);
      notify.success(isTeacher ? "Имя сохранено" : "Данные сохранены");
    },
    onError: (error) => {
      if (error instanceof ApiError && error.code === "EMAIL_TAKEN") {
        profile.setError("email", { message: "Такой email уже есть" });
        return;
      }
      if (!applyFieldErrors(error, profile.setError, ["displayName", "email"])) {
        notify.error(errorMessage(error, isTeacher ? "Не удалось сохранить имя" : "Не удалось сохранить данные"));
      }
    },
  });
  const savePassword = useMutation({
    mutationFn: (values: PasswordValues) => authApi.changePassword(values.currentPassword, values.newPassword),
    onSuccess: () => {
      password.reset();
      notify.success("Пароль изменён");
    },
    onError: (error) => {
      if (!applyFieldErrors(error, password.setError, ["currentPassword", "newPassword"])) {
        notify.error(errorMessage(error, "Не удалось сменить пароль"));
      }
    },
  });

  const goToSearchItem = (item: SettingsSearchItem) => {
    if (item.section === "platform") {
      navigate("/admin/settings", { state: { anchor: item.anchor } });
      return;
    }
    const next = new URLSearchParams();
    if (item.section !== "profile") next.set("section", item.section);
    for (const [key, value] of Object.entries(item.params ?? {})) next.set(key, value);
    if (item.section === section) {
      if (item.anchor) scrollToAnchor(item.anchor);
    } else if (item.anchor) {
      pendingAnchor.current = item.anchor;
    }
    setParams(next, { replace: true });
  };

  if (!isTeacher) {
    return (
      <Stack gap="sm">
        <SettingsHeaderSearch teacher={false} onSelect={goToSearchItem} />
        <PageHeader title="Профиль" />
        <ProfileForms
          profile={profile}
          password={password}
          user={user}
          saveProfile={saveProfile}
          savePassword={savePassword}
        />
      </Stack>
    );
  }

  const profileTab = section === "notifications" ? "notifications" : "profile";
  const selectTab = (tab: ProfileTab) => {
    const next = new URLSearchParams();
    if (tab !== "profile") next.set("section", tab);
    setParams(next, { replace: true });
  };

  return (
    <Stack gap="sm">
      <SettingsHeaderSearch teacher onSelect={goToSearchItem} />
      {(section === "profile" || section === "notifications") && (
        <>
          <PageHeader title="Профиль" />
          <ProfileForms
            profile={profile}
            password={password}
            user={user}
            saveProfile={saveProfile}
            savePassword={savePassword}
            tab={profileTab}
            onTab={selectTab}
          />
        </>
      )}
      {section === "template" && <TemplateSection />}
      {section === "scale" && <ScoreScalesSection />}
    </Stack>
  );
}

function AvatarPicker({ user }: { user: User }) {
  const queryClient = useQueryClient();
  const [opened, setOpened] = useState(false);
  const save = useMutation({
    mutationFn: (avatar: string | null) => authApi.updateAvatar(avatar),
    onMutate: (avatar) => {
      queryClient.setQueryData<User | null>(["me"], (current) => (current ? { ...current, avatar } : current));
    },
    onSuccess: (next) => {
      queryClient.setQueryData(["me"], next);
      setOpened(false);
    },
    onError: () => queryClient.invalidateQueries({ queryKey: ["me"] }),
  });
  const choose = (avatar: string | null) => save.mutate(avatar);
  return (
    <Popover opened={opened} onChange={setOpened} position="bottom" shadow="md" withinPortal>
      <Popover.Target>
        <UnstyledButton
          className="profile-avatar"
          aria-label="Выбрать аватар"
          title="Выбрать аватар"
          onClick={() => setOpened((value) => !value)}
        >
          <UserAvatar user={user} size={148} />
          <span className="profile-avatar-edit">
            <IconPencil size={18} stroke={1.75} />
          </span>
        </UnstyledButton>
      </Popover.Target>
      <Popover.Dropdown>
        <Stack gap="sm">
          <SimpleGrid cols={6} spacing="xs">
            {AVATARS.map((avatar) => {
              const selected = user.avatar === avatar;
              return (
                <UnstyledButton
                  key={avatar}
                  aria-label={`Аватар ${avatar.slice(-2)}`}
                  aria-pressed={selected}
                  onClick={() => choose(avatar)}
                  style={{
                    borderRadius: "50%",
                    outline: selected ? "2px solid var(--color-primary)" : "none",
                    outlineOffset: 2,
                  }}
                >
                  <Avatar src={avatarSrc(avatar)} alt="" size={48} radius="50%" />
                </UnstyledButton>
              );
            })}
          </SimpleGrid>
          {user.avatar && (
            <Button variant="subtle" size="compact-sm" onClick={() => choose(null)} style={{ alignSelf: "flex-start" }}>
              Убрать аватар
            </Button>
          )}
          {save.isError && (
            <Alert color="red" variant="light" role="alert">{errorMessage(save.error, "Не удалось сохранить аватар")}</Alert>
          )}
        </Stack>
      </Popover.Dropdown>
    </Popover>
  );
}

type ProfileTab = "profile" | "notifications";

const PROFILE_TABS: { id: ProfileTab; label: string; icon: ReactNode }[] = [
  { id: "profile", label: "Личные данные и пароль", icon: <IconUser size={16} stroke={2} aria-hidden /> },
  { id: "notifications", label: "Уведомления", icon: <IconBell size={16} stroke={2} aria-hidden /> },
];

function ProfileForms({
  profile,
  password,
  user,
  saveProfile,
  savePassword,
  tab = "profile",
  onTab,
}: {
  profile: ReturnType<typeof useForm<ProfileValues>>;
  password: ReturnType<typeof useForm<PasswordValues>>;
  user?: User | null;
  saveProfile: ReturnType<typeof useMutation<unknown, Error, ProfileValues>>;
  savePassword: ReturnType<typeof useMutation<unknown, Error, PasswordValues>>;
  tab?: ProfileTab;
  onTab?: (tab: ProfileTab) => void;
}) {
  const logout = useLogout();
  return (
    <Grid columns={20} gap="var(--grid-gutter)" align="flex-start">
      {user && (
        <Grid.Col span={{ base: 20, lg: 5 }}>
          <SettingsCard>
            <Stack gap="md">
              <Stack gap="md" align="center" ta="center" pt="xs">
                <AvatarPicker user={user} />
                <Stack gap={6} align="center" style={{ minWidth: 0, maxWidth: "100%" }}>
                  <Text fz="h3" fw={700} lh={1.2} style={{ overflowWrap: "anywhere" }}>{user.displayName}</Text>
                  <Text size="sm" c="dimmed" fw={500}>{user.role === "ADMIN" ? "Администратор" : "Преподаватель"}</Text>
                </Stack>
              </Stack>
              {onTab && (
                <Stack gap={4} role="tablist" aria-orientation="vertical">
                    {PROFILE_TABS.map((item) => (
                      <NavLink
                        key={item.id}
                        component="button"
                        type="button"
                        role="tab"
                        aria-selected={tab === item.id}
                        active={tab === item.id}
                        label={item.label}
                        leftSection={item.icon}
                        styles={{ label: { fontWeight: 600 } }}
                        onClick={() => onTab(item.id)}
                      />
                    ))}
                </Stack>
              )}
              <NavLink
                component="button"
                type="button"
                noWrap
                mt="md"
                className="profile-logout"
                label="Выйти из аккаунта"
                leftSection={<IconLogout size={16} stroke={2} aria-hidden />}
                styles={{ label: { fontWeight: 600 } }}
                onClick={logout}
              />
            </Stack>
          </SettingsCard>
        </Grid.Col>
      )}

      <Grid.Col span={{ base: 20, lg: user ? 15 : 20 }}>
        {tab === "notifications" ? <NotificationsSection /> : (
        <Stack gap="sm">
          <SettingsCard>
            <form id="settings-name" noValidate onSubmit={profile.handleSubmit((values) => saveProfile.mutate(values))}>
              <Stack gap="md">
                <SettingsSectionTitle>Личные данные</SettingsSectionTitle>
                <TextInput
                  label="Имя"
                  withAsterisk
                  autoComplete="name"
                  placeholder="Введите имя"
                  error={profile.formState.errors.displayName?.message}
                  {...profile.register("displayName")}
                />
                {user && (user.role === "ADMIN" ? (
                  <TextInput
                    label="Email"
                    withAsterisk
                    type="email"
                    autoComplete="email"
                    placeholder="name@example.com"
                    error={profile.formState.errors.email?.message}
                    {...profile.register("email")}
                  />
                ) : (
                  <TextInput label="Email" value={user.email} readOnly disabled />
                ))}
                <Button type="submit" loading={saveProfile.isPending} disabled={!profile.formState.isDirty} w="fit-content">
                  Сохранить
                </Button>
              </Stack>
            </form>
          </SettingsCard>

          <SettingsCard>
            <form id="settings-password" noValidate onSubmit={password.handleSubmit((values) => savePassword.mutate(values))}>
              <Stack gap="md">
                <SettingsSectionTitle>Пароль</SettingsSectionTitle>
                <TextInput
                  type="password"
                  label="Текущий пароль"
                  withAsterisk
                  autoComplete="current-password"
                  placeholder="Введите текущий пароль"
                  error={password.formState.errors.currentPassword?.message}
                  {...password.register("currentPassword")}
                />
                <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="md" style={{ alignItems: "start" }}>
                  <div>
                    <TextInput
                      type="password"
                      label="Новый пароль"
                      withAsterisk
                      autoComplete="new-password"
                      placeholder="Введите новый пароль"
                      error={password.formState.errors.newPassword?.message}
                      {...password.register("newPassword")}
                    />
                    <PasswordStrengthMeter password={password.watch("newPassword")} />
                  </div>
                  <TextInput
                    type="password"
                    label="Повторите новый пароль"
                    withAsterisk
                    autoComplete="new-password"
                    placeholder="Повторите пароль"
                    error={password.formState.errors.repeat?.message}
                    {...password.register("repeat")}
                  />
                </SimpleGrid>
                <Button type="submit" loading={savePassword.isPending} w="fit-content">
                  Сменить пароль
                </Button>
              </Stack>
            </form>
          </SettingsCard>
        </Stack>
        )}
      </Grid.Col>
    </Grid>
  );
}
