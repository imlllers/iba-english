import { createContext, useState, type ReactNode } from "react";

export const TitleSlotContext = createContext<HTMLElement | null>(null);
export const SetTitleSlotContext = createContext<(node: HTMLElement | null) => void>(() => {});
export const ActionsSlotContext = createContext<HTMLElement | null>(null);
export const SetActionsSlotContext = createContext<(node: HTMLElement | null) => void>(() => {});

export function TitleSlotProvider({ children }: { children: ReactNode }) {
  const [title, setTitle] = useState<HTMLElement | null>(null);
  const [actions, setActions] = useState<HTMLElement | null>(null);
  return (
    <SetTitleSlotContext.Provider value={setTitle}>
      <TitleSlotContext.Provider value={title}>
        <SetActionsSlotContext.Provider value={setActions}>
          <ActionsSlotContext.Provider value={actions}>{children}</ActionsSlotContext.Provider>
        </SetActionsSlotContext.Provider>
      </TitleSlotContext.Provider>
    </SetTitleSlotContext.Provider>
  );
}
