import { Box } from "@mantine/core";
import type { CSSProperties, ReactNode } from "react";

type RunnerDemoChromeLayoutProps = {
  children: ReactNode;
  nav: ReactNode;
  style?: CSSProperties;
  className?: string;
};

export function RunnerDemoChromeLayout({
  children,
  nav,
  style,
  className,
}: RunnerDemoChromeLayoutProps) {
  return (
    <Box
      className={className}
      style={{
        flex: 1,
        minHeight: 0,
        display: "flex",
        flexDirection: "column",
        width: "100%",
        ...style,
      }}
    >
      <Box style={{ flex: 1, minHeight: 0, display: "flex", flexDirection: "column", minWidth: 0 }}>
        {children}
      </Box>
      <Box
        className="runner-demo-page-nav runner-demo-page-nav--in-card"
        style={{
          flex: "none",
          background: "var(--mantine-color-white)",
        }}
      >
        {nav}
      </Box>
    </Box>
  );
}

export function withDemoPageNav(
  demoMode: boolean,
  nav: ReactNode | null,
  content: ReactNode,
) {
  if (demoMode && nav) {
    return <RunnerDemoChromeLayout nav={nav}>{content}</RunnerDemoChromeLayout>;
  }
  return (
    <>
      {content}
      {nav}
    </>
  );
}