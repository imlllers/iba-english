import { MantineProvider } from "@mantine/core";
import { ModalsProvider } from "@mantine/modals";
import { Notifications } from "@mantine/notifications";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState, type ReactNode } from "react";
import { ibaCssVariablesResolver, ibaTheme } from "./mantine/ibaTheme";
import "@mantine/core/styles.css";
import "@mantine/notifications/styles.css";
import "@mantine/dropzone/styles.css";
import "@mantine/tiptap/styles.css";

export function Providers({ children }: { children: ReactNode }) {
  const [client] = useState(() => new QueryClient({
    defaultOptions: { queries: { retry: false, refetchOnWindowFocus: false } },
  }));
  return (
    <QueryClientProvider client={client}>
      <MantineProvider theme={ibaTheme} cssVariablesResolver={ibaCssVariablesResolver} forceColorScheme="light">
        <Notifications position="top-right" zIndex={4000} autoClose={1500} />
        <ModalsProvider labels={{ confirm: "Подтвердить", cancel: "Отмена" }}>
          {children}
        </ModalsProvider>
      </MantineProvider>
    </QueryClientProvider>
  );
}
