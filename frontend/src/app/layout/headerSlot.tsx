import { createContext, useState, type ReactNode } from "react";

export const HeaderSlotContext = createContext<HTMLElement | null>(null);
export const SetHeaderSlotContext = createContext<(node: HTMLElement | null) => void>(() => {});

export function HeaderSlotProvider({ children }: { children: ReactNode }) {
  const [slot, setSlot] = useState<HTMLElement | null>(null);
  return (
    <SetHeaderSlotContext.Provider value={setSlot}>
      <HeaderSlotContext.Provider value={slot}>{children}</HeaderSlotContext.Provider>
    </SetHeaderSlotContext.Provider>
  );
}
