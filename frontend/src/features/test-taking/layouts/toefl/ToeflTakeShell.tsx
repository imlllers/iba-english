import { Box, Card } from "@mantine/core";
import type { ReactNode } from "react";
import { RunnerScrollPane } from "../../RunnerScrollPane";
import { TakeHeader } from "../../TakeHeader";
import { TOEFL_CARD_CONTENT_TOP_OFFSET } from "./toeflCardLayout";

export type RunnerStackedLayout = "toefl" | "toeic";

type ToeflTakeShellProps = {
  children: ReactNode;
  layout?: RunnerStackedLayout;
  centerContent?: boolean;
  fillHeight?: boolean;
  embedded?: boolean;
  demoNav?: ReactNode;
  headerCenter?: ReactNode;
  headerLeading?: ReactNode;
  headerChildren?: ReactNode;
  beforeWorkspace?: ReactNode;
  cardFooter?: ReactNode;
};

export function ToeflTakeShell({
  children,
  layout = "toefl",
  centerContent = false,
  fillHeight = false,
  embedded = false,
  demoNav,
  headerCenter,
  headerLeading,
  headerChildren,
  beforeWorkspace,
  cardFooter,
}: ToeflTakeShellProps) {
  const fill = fillHeight || centerContent;
  const stretchPage = fillHeight || centerContent;
  const toeicScrollFill = fillHeight && layout === "toeic";
  const demoLayout = Boolean(demoNav);
  const taskColumn = (
  <Box
    style={{
      flex: stretchPage ? 1 : undefined,
      minHeight: stretchPage ? 0 : undefined,
      display: "flex",
      flexDirection: "column",
      width: "100%",
    }}
  >
    <TakeHeader variant="stacked" tone="iba" center={headerCenter} leading={headerLeading}>
      {headerChildren}
    </TakeHeader>
    <Card
      w="100%"
      shadow="sm"
      bg="white"
      className="runner-task-card"
      style={{
        flex: fill ? 1 : undefined,
        minHeight: fill ? 0 : undefined,
        display: fill ? "flex" : undefined,
        flexDirection: fill ? "column" : undefined,
        overflow: fill ? "hidden" : undefined,
        borderTopLeftRadius: 0,
        borderTopRightRadius: 0,
      }}
    >
      {toeicScrollFill ? (
        <>
          <RunnerScrollPane variant="embed" style={{ flex: 1, minHeight: 0, width: "100%" }}>
            <Box
              className="runner-toeic-task-fill"
              px="md"
              py="sm"
              style={{
                display: "flex",
                flexDirection: "column",
                width: "100%",
                flex: 1,
                minHeight: 0,
              }}
            >
              {children}
            </Box>
          </RunnerScrollPane>
          {cardFooter ? (
            <Box
              className={`runner-demo-page-nav runner-demo-page-nav--in-card${layout === "toeic" ? " runner-toeic-page-nav" : ""}`}
              style={{
                flex: "none",
                background: "var(--mantine-color-white)",
              }}
            >
              {cardFooter}
            </Box>
          ) : null}
        </>
      ) : (
        <Box
          px="md"
          py="sm"
          style={{
            flex: fill ? 1 : undefined,
            minHeight: fill ? 0 : undefined,
            overflow: fill ? (centerContent ? "auto" : "hidden") : undefined,
            display: "flex",
            flexDirection: "column",
            ...(centerContent
              ? {
                justifyContent: "flex-start",
                alignItems: "center",
                width: "100%",
                paddingTop: TOEFL_CARD_CONTENT_TOP_OFFSET,
              }
              : {}),
          }}
        >
          {children}
        </Box>
      )}
    </Card>
  </Box>
);

  return (
    <Box
      data-runner-layout={embedded ? undefined : layout}
      style={{
        minHeight: embedded ? 0 : "100vh",
        height: embedded ? "100%" : stretchPage ? "100vh" : undefined,
        flex: embedded ? 1 : undefined,
        display: "flex",
        flexDirection: "column",
        background: embedded ? undefined : "var(--color-page)",
        overflow: fillHeight ? "hidden" : undefined,
      }}
    >
      <Box
        component="main"
        id="main"
        style={{
          flex: stretchPage ? 1 : undefined,
          minHeight: stretchPage ? 0 : undefined,
          display: "flex",
          flexDirection: "column",
          overflow: fillHeight ? "hidden" : undefined,
          paddingBlock: "var(--space-16)",
          paddingInline: "var(--space-16)",
        }}
      >
        {beforeWorkspace}
        <Box
          className="runner-toefl-workspace"
          style={{
            flex: stretchPage ? 1 : undefined,
            minHeight: stretchPage ? 0 : undefined,
            width: "100%",
            maxWidth: demoLayout ? "none" : "var(--runner-toefl-card-max)",
            marginInline: demoLayout ? undefined : "auto",
            display: "flex",
            flexDirection: "column",
          }}
        >
          {demoLayout ? (
            <Box
              className="runner-toefl-workspace-row"
              style={{
                flex: 1,
                minHeight: 0,
                width: "100%",
                display: "flex",
                flexDirection: "row",
                alignItems: "stretch",
                gap: "var(--mantine-spacing-md)",
              }}
            >
              <Box
                aria-hidden
                className="runner-toefl-demo-nav-balancer"
                style={{ flex: "1 1 0", minWidth: 0 }}
              />
              <Box
                style={{
                  flex: "0 1 var(--runner-toefl-card-max)",
                  minWidth: 0,
                  width: "min(100%, var(--runner-toefl-card-max))",
                  maxWidth: "var(--runner-toefl-card-max)",
                  display: "flex",
                  flexDirection: "column",
                }}
              >
                {taskColumn}
              </Box>
              <Box
                className="runner-toefl-demo-nav-column"
                style={{
                  flex: "1 1 0",
                  minWidth: "var(--runner-toefl-demo-nav-min, 12rem)",
                  minHeight: 0,
                  display: "flex",
                  flexDirection: "column",
                  alignSelf: "stretch",
                }}
              >
                {demoNav}
              </Box>
            </Box>
          ) : (
            taskColumn
          )}
        </Box>
      </Box>
    </Box>
  );
}