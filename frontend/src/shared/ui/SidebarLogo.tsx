import { Box, Image } from "@mantine/core";
import { Link } from "react-router-dom";

type SidebarLogoProps = {
  to?: string;
  onClick?: () => void;
};

export function SidebarLogo({ to = "/teacher/tests", onClick }: SidebarLogoProps) {
  return (
    <Box
      component={Link}
      to={to}
      onClick={onClick}
      aria-label="IBA English – на главную"
      style={{
        display: "flex",
        alignItems: "center",
        flexShrink: 0,
        textDecoration: "none",
        height: "var(--chrome-header-height)",
        paddingInline: "var(--mantine-spacing-md)",
      }}
    >
      <Image src="/logo-white.png" alt="IBA Institute" h="var(--logo-height)" w="auto" fit="contain" />
    </Box>
  );
}
