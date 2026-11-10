import { ActionIcon, AppShell, Box, Burger, Group, NavLink as MantineNavLink, ScrollArea, Stack, Text } from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import { useContext } from "react";
import { Link, Outlet, useLocation, type To } from "react-router-dom";
import type { Role } from "@/entities/user/types";
import { useSession } from "@/features/auth/useSession";
import { NotificationBell } from "@/features/notifications/NotificationBell";
import {
  IconAdjustments,
  IconCalendar,
  IconChartBar,
  IconClipboardList,
  IconFolder,
  IconHistory,
  IconLayout,
  IconSettings,
  IconTable,
  IconUser,
  IconUsers,
  type Icon as TablerIcon,
} from "@tabler/icons-react";
import { Icon } from "@/shared/ui/Icon";
import { UserAvatar } from "@/shared/ui/UserAvatar";
import { SidebarLogo } from "@/shared/ui/SidebarLogo";
import { sidebarNavLinkProps } from "@/shared/ui/sidebarNav";
import { HeaderSlotProvider, SetHeaderSlotContext } from "./headerSlot";

const TOP_LEVEL_STYLES = { ...sidebarNavLinkProps.styles, label: { fontWeight: 600 } };

type NavItem = {
  to: string;
  label: string;
  icon?: TablerIcon;
  section?: string;
  activeOn?: string;
  disabled?: boolean;
};

type NavEntry =
  | { type: "link"; item: NavItem }
  | { type: "menu"; label: string; icon: TablerIcon; children: NavItem[] };

const NAV: Record<Role, NavEntry[]> = {
  TEACHER: [
    { type: "link", item: { to: "/teacher/tests", label: "Созданные тесты", icon: IconClipboardList } },
    { type: "link", item: { to: "/teacher/calendar", label: "Календарь", icon: IconCalendar, disabled: true } },
    { type: "link", item: { to: "/teacher/results", label: "Результаты", icon: IconChartBar } },
    { type: "link", item: { to: "/teacher/media", label: "Материалы", icon: IconFolder } },
    {
      type: "menu",
      label: "Настройки",
      icon: IconSettings,
      children: [
        { to: "/teacher/settings", label: "Профиль", section: "profile", icon: IconUser },
        { to: "/teacher/settings", label: "Шаблоны тестов", section: "template", icon: IconLayout, activeOn: "/teacher/templates/" },
        { to: "/teacher/settings", label: "Шкалы баллов", section: "scale", icon: IconTable },
      ],
    },
  ],
  ADMIN: [
    { type: "link", item: { to: "/admin/teachers", label: "Преподаватели", icon: IconUsers } },
    { type: "link", item: { to: "/admin/tests", label: "Тесты", icon: IconClipboardList, disabled: true } },
    {
      type: "menu",
      label: "Настройки",
      icon: IconSettings,
      children: [
        { to: "/admin/audit", label: "Журнал действий", icon: IconHistory, disabled: true },
        { to: "/admin/settings", label: "Платформа", icon: IconAdjustments },
        { to: "/admin/profile", label: "Профиль", icon: IconUser },
      ],
    },
  ],
};

function NavIcon({ icon: Tabler }: { icon: TablerIcon }) {
  return <Tabler size={16} stroke={1.5} aria-hidden />;
}

function linkTo(item: NavItem): To {
  if (!item.section || item.section === "profile") {
    return item.to;
  }
  return { pathname: item.to, search: `section=${item.section}` };
}

function isItemActive(item: NavItem, pathname: string, search: string): boolean {
  if (item.activeOn && pathname.startsWith(item.activeOn)) {
    return true;
  }
  if (pathname !== item.to && !pathname.startsWith(`${item.to}/`)) {
    return false;
  }
  if (!item.section) {
    return pathname === item.to || pathname.startsWith(`${item.to}/`);
  }
  if (pathname !== item.to) {
    return false;
  }
  const current = new URLSearchParams(search).get("section");
  if (item.section === "profile") {
    return !current || current === "profile" || current === "notifications";
  }
  return current === item.section;
}

const gridContentStyle = {
  width: "var(--grid-cols-3-12-width)",
  maxWidth: "100%",
  marginLeft: "calc(var(--grid-col-start-3) - var(--app-shell-navbar-width, var(--sidebar-width)))",
  marginRight: "auto",
} as const;

export function Shell({ role }: { role: Role }) {
  const home = role === "ADMIN" ? "/admin/teachers" : "/teacher/tests";
  const location = useLocation();
  const [opened, { toggle, close }] = useDisclosure();
  return (
    <HeaderSlotProvider>
      <AppShell
        layout="alt"
        header={{ height: "var(--chrome-header-height)" }}
        navbar={{ width: "var(--sidebar-width)", breakpoint: "sm", collapsed: { mobile: !opened } }}
        padding={0}
        withBorder={false}
        styles={{
          root: { minHeight: "100vh", background: "var(--mantine-color-gray-0)" },
          main: {
            background: "var(--mantine-color-gray-0)",
            minHeight: "calc(100vh - var(--chrome-header-height))",
          },
          header: { background: "var(--mantine-color-body)", boxShadow: "var(--shadow-chrome)" },
          navbar: { background: "var(--color-primary)" },
        }}
      >
        <AppShell.Header px={0}>
          <ShellHeaderBar opened={opened} onToggle={toggle} />
        </AppShell.Header>

        <AppShell.Navbar p={0} withBorder={false} className="iba-sidebar">
          <Stack h="100%" gap={0} style={{ minHeight: 0 }}>
            <SidebarLogo to={home} onClick={close} />
            <ScrollArea flex={1} type="never" px="md" py="sm">
              <Stack gap={4} component="nav" aria-label="Разделы">
                {NAV[role].map((entry) => {
                  if (entry.type === "link" && entry.item.disabled) {
                    return (
                      <MantineNavLink
                        key={`${entry.item.to}-${entry.item.label}`}
                        component="button"
                        type="button"
                        disabled
                        label={entry.item.label}
                        leftSection={entry.item.icon ? <NavIcon icon={entry.item.icon} /> : undefined}
                        {...sidebarNavLinkProps}
                        styles={TOP_LEVEL_STYLES}
                      />
                    );
                  }
                  if (entry.type === "link") {
                    return (
                      <MantineNavLink
                        key={`${entry.item.to}-${entry.item.label}`}
                        component={Link}
                        to={linkTo(entry.item)}
                        active={isItemActive(entry.item, location.pathname, location.search)}
                        label={entry.item.label}
                        leftSection={entry.item.icon ? <NavIcon icon={entry.item.icon} /> : undefined}
                        onClick={close}
                        {...sidebarNavLinkProps}
                        styles={TOP_LEVEL_STYLES}
                      />
                    );
                  }

                  const childActive = entry.children.some((child) =>
                    isItemActive(child, location.pathname, location.search),
                  );

                  return (
                    <MantineNavLink
                      key={entry.label}
                      label={entry.label}
                      leftSection={<NavIcon icon={entry.icon} />}
                      defaultOpened={childActive}
                      childrenOffset="sm"
                      {...sidebarNavLinkProps}
                      styles={TOP_LEVEL_STYLES}
                    >
                      {entry.children.map((child) => (child.disabled ? (
                        <MantineNavLink
                          key={`${child.to}-${child.section ?? child.label}`}
                          component="button"
                          type="button"
                          disabled
                          label={child.label}
                          leftSection={child.icon ? <NavIcon icon={child.icon} /> : undefined}
                          {...sidebarNavLinkProps}
                        />
                      ) : (
                        <MantineNavLink
                          key={`${child.to}-${child.section ?? child.label}`}
                          component={Link}
                          to={linkTo(child)}
                          active={isItemActive(child, location.pathname, location.search)}
                          label={child.label}
                          leftSection={child.icon ? <NavIcon icon={child.icon} /> : undefined}
                          onClick={close}
                          {...sidebarNavLinkProps}
                        />
                      )))}
                    </MantineNavLink>
                  );
                })}
              </Stack>
            </ScrollArea>
          </Stack>
        </AppShell.Navbar>

        <AppShell.Main style={{ paddingBottom: "var(--page-pad-bottom)" }}>
          <Box py="sm" className="iba-grid-cols-3-12" style={gridContentStyle}>
            <Outlet />
          </Box>
        </AppShell.Main>
      </AppShell>
    </HeaderSlotProvider>
  );
}

function ShellHeaderBar({ opened, onToggle }: { opened: boolean; onToggle: () => void }) {
  const setHeaderSlot = useContext(SetHeaderSlotContext);
  const session = useSession();
  const user = session.data;

  return (
    <Box className="iba-grid-cols-3-12" h="100%" style={gridContentStyle}>
      <Group h="100%" wrap="nowrap" gap="md" align="center">
        <Burger opened={opened} onClick={onToggle} hiddenFrom="sm" size="sm" aria-label="Меню" />
        <Box
          ref={setHeaderSlot}
          className="shell-header-slot"
          style={{ display: "flex", alignItems: "center", justifyContent: "flex-start", minWidth: 0, flex: 1 }}
        />
        {user?.role === "TEACHER" ? (
          <NotificationBell />
        ) : (
          <ActionIcon variant="subtle" color="gray" size="lg" aria-label="Уведомления – временно недоступны" disabled style={{ background: "transparent" }}>
            <Icon name="bell" size={20} />
          </ActionIcon>
        )}
        {user ? (
          <Group gap="sm" wrap="nowrap" align="center" style={{ minWidth: 0 }}>
            <UserAvatar user={user} size="md" />
            <Stack gap={0} align="flex-start" style={{ minWidth: 0, maxWidth: 220 }}>
              <Text size="sm" fw={600} lh="var(--mantine-line-height-sm)" truncate>
                {user.displayName}
              </Text>
              <Text size="xs" c="dimmed" truncate>
                {user.email}
              </Text>
            </Stack>
          </Group>
        ) : null}
      </Group>
    </Box>
  );
}
