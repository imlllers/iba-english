import type { NavLinkProps } from "@mantine/core";

export const sidebarNavLinkProps: Pick<NavLinkProps, "variant" | "c" | "vars" | "styles"> = {
  variant: "subtle",
  c: "white",
  vars: () => ({
    root: {
      "--nl-bg": "color-mix(in srgb, var(--mantine-color-white) 16%, transparent)",
      "--nl-hover": "color-mix(in srgb, var(--mantine-color-white) 24%, transparent)",
      "--nl-color": "var(--mantine-color-white)",
    },
    children: {},
  }),
  styles: {
    description: {
      color: "color-mix(in srgb, var(--mantine-color-white) 72%, transparent)",
    },
  },
};
