import { Box, Card } from "@mantine/core";
import type { ReactNode } from "react";
import { TakeHeader } from "../../TakeHeader";
import { TOEFL_CARD_CONTENT_TOP_OFFSET } from "./toeflCardLayout";

type ToeflTakeShellProps = {
  children: ReactNode;
  centerContent?: boolean;
};

export function ToeflTakeShell({ children, centerContent = false }: ToeflTakeShellProps) {
  return (
    <Box
      data-runner-layout="toefl"
      style={{
        minHeight: "100vh",
        height: "100vh",
        display: "flex",
        flexDirection: "column",
        background: "var(--color-page)",
        overflow: "hidden",
      }}
    >
      <Box
        component="main"
        id="main"
        style={{
          flex: 1,
          minHeight: 0,
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
          paddingBlock: "var(--space-16)",
          paddingInline: "var(--space-16)",
        }}
      >
        <Box
          className="runner-toefl-workspace"
          style={{
            flex: 1,
            minHeight: 0,
            width: "100%",
            maxWidth: "var(--runner-toefl-card-max)",
            marginInline: "auto",
            display: "flex",
            flexDirection: "column",
          }}
        >
          <TakeHeader variant="stacked" tone="iba" />
          <Card
            w="100%"
            shadow="sm"
            bg="white"
            className="runner-task-card"
            style={{
              flex: 1,
              minHeight: 0,
              display: "flex",
              flexDirection: "column",
              overflow: "hidden",
              borderTopLeftRadius: 0,
              borderTopRightRadius: 0,
            }}
          >
            <Box
              px="md"
              py="sm"
              style={{
                flex: 1,
                minHeight: 0,
                overflow: "auto",
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
          </Card>
        </Box>
      </Box>
    </Box>
  );
}