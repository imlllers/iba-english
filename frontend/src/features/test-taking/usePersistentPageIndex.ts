import { useEffect, useState } from "react";

export function usePersistentPageIndex(pages: { key: string }[], storageKey?: string) {
  const [index, setIndex] = useState(() => {
    if (!storageKey) return 0;
    try {
      const saved = localStorage.getItem(storageKey);
      const found = saved ? pages.findIndex((page) => page.key === saved) : -1;
      return found >= 0 ? found : 0;
    } catch {
      return 0;
    }
  });

  useEffect(() => {
    const key = pages[index]?.key;
    if (!storageKey || !key) return;
    try {
      localStorage.setItem(storageKey, key);
    } catch {
    }
  }, [storageKey, index, pages]);

  return [index, setIndex] as const;
}
