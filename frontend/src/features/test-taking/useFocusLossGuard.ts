import { useEffect, useRef, useState } from "react";

const HIDE_GRACE_MS = 400;

type Options = {
  enabled: boolean;
  maxWarnings: number;
  storageKey: string;
  onExhausted: () => void;
};

function readCount(key: string) {
  const raw = sessionStorage.getItem(key);
  const value = raw ? Number(raw) : 0;
  return Number.isFinite(value) && value > 0 ? Math.floor(value) : 0;
}

export function useFocusLossGuard({ enabled, maxWarnings, storageKey, onExhausted }: Options) {
  const [count, setCount] = useState(() => (enabled ? readCount(storageKey) : 0));
  const [warningOpen, setWarningOpen] = useState(false);
  const exhausted = useRef(false);
  const onExhaustedRef = useRef(onExhausted);
  onExhaustedRef.current = onExhausted;

  useEffect(() => {
    if (!enabled) {
      return;
    }
    const stored = readCount(storageKey);
    setCount(stored);
    if (stored >= maxWarnings) {
      exhausted.current = true;
      onExhaustedRef.current();
    }
  }, [enabled, maxWarnings, storageKey]);

  useEffect(() => {
    if (!enabled || exhausted.current) {
      return;
    }

    let hideTimer: ReturnType<typeof setTimeout> | null = null;

    const record = () => {
      if (exhausted.current) {
        return;
      }
      setCount((prev) => {
        const next = prev + 1;
        sessionStorage.setItem(storageKey, String(next));
        if (next >= maxWarnings) {
          exhausted.current = true;
          setWarningOpen(false);
          onExhaustedRef.current();
        } else {
          setWarningOpen(true);
        }
        return next;
      });
    };

    const onVisibility = () => {
      if (document.hidden) {
        if (hideTimer) {
          clearTimeout(hideTimer);
        }
        hideTimer = setTimeout(record, HIDE_GRACE_MS);
        return;
      }
      if (hideTimer) {
        clearTimeout(hideTimer);
        hideTimer = null;
      }
    };

    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      document.removeEventListener("visibilitychange", onVisibility);
      if (hideTimer) {
        clearTimeout(hideTimer);
      }
    };
  }, [enabled, maxWarnings, storageKey]);

  return {
    count,
    maxWarnings,
    warningOpen,
    dismissWarning: () => setWarningOpen(false),
  };
}
