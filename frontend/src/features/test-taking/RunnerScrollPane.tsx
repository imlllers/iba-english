import { Box } from "@mantine/core";
import { useCallback, useLayoutEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";

const PANEL_RAIL_PX = 10;

const panelShellStyle: CSSProperties = {
  minWidth: 0,
  minHeight: 0,
  height: "100%",
  background: "var(--mantine-color-body)",
  borderRadius: "var(--mantine-radius-md)",
  boxShadow: "var(--mantine-shadow-sm)",
};

const scrollPositions = new Map<string, number>();

type RunnerScrollPaneProps = {
  className?: string;
  children: ReactNode;
  variant?: "panel" | "embed";
  persistScrollKey?: string;
  style?: CSSProperties;
};

export function RunnerScrollPane({
  className,
  children,
  variant = "panel",
  persistScrollKey,
  style,
}: RunnerScrollPaneProps) {
  const scrollerRef = useRef<HTMLDivElement>(null);
  const [thumb, setThumb] = useState({ top: 0, size: 1 });
  const [scrollable, setScrollable] = useState(false);

  const sync = useCallback(() => {
    const el = scrollerRef.current;
    if (!el) return;
    const { scrollTop, scrollHeight, clientHeight } = el;
    const canScroll = scrollHeight > clientHeight + 1;
    setScrollable(canScroll);
    const size = Math.min(1, clientHeight / Math.max(scrollHeight, 1));
    const travel = Math.max(scrollHeight - clientHeight, 0);
    const top = travel === 0 ? 0 : (scrollTop / travel) * (1 - size);
    setThumb({ top, size: canScroll ? Math.max(size, 0.12) : 1 });
  }, []);

  const onScroll = useCallback(() => {
    const el = scrollerRef.current;
    if (!el) return;
    if (persistScrollKey) {
      scrollPositions.set(persistScrollKey, el.scrollTop);
    }
    sync();
  }, [persistScrollKey, sync]);

  useLayoutEffect(() => {
    const el = scrollerRef.current;
    if (!el) return;
    if (persistScrollKey) {
      const saved = scrollPositions.get(persistScrollKey);
      if (saved != null) {
        el.scrollTop = saved;
      }
    }
    sync();
    el.addEventListener("scroll", onScroll, { passive: true });
    const ro = new ResizeObserver(sync);
    ro.observe(el);
    const inner = el.firstElementChild;
    if (inner) ro.observe(inner);
    return () => {
      el.removeEventListener("scroll", onScroll);
      ro.disconnect();
    };
  }, [sync, onScroll, children, persistScrollKey]);

  const isPanel = variant === "panel";
  const shellStyle: CSSProperties = isPanel
    ? { ...panelShellStyle, ...style }
    : { minWidth: 0, minHeight: 0, ...style };

  return (
    <Box
      className={className}
      style={{
        ...shellStyle,
        overflow: "hidden",
        padding: 0,
        display: "flex",
        flexDirection: "row",
      }}
    >
      <Box
        ref={scrollerRef}
        className="runner-scroll-body"
        style={{
          flex: 1,
          minWidth: 0,
          minHeight: 0,
          overflow: "auto",
          padding: isPanel
            ? `var(--runner-task-pad-y) var(--runner-task-pad-x)`
            : `0 var(--runner-task-pad-x) var(--runner-task-pad-y)`,
        }}
      >
        {children}
      </Box>
      {scrollable ? (
        <Box
          aria-hidden
          style={{
            flex: "none",
            width: PANEL_RAIL_PX,
            alignSelf: "stretch",
            position: "relative",
            background: isPanel ? "var(--mantine-color-body)" : "transparent",
            borderTopRightRadius: isPanel ? "var(--mantine-radius-md)" : undefined,
            borderBottomRightRadius: isPanel ? "var(--mantine-radius-md)" : undefined,
          }}
        >
          <Box
            style={{
              position: "absolute",
              left: 2,
              right: 2,
              top: `${thumb.top * 100}%`,
              height: `${thumb.size * 100}%`,
              borderRadius: 4,
              background: "color-mix(in srgb, var(--color-dark) 28%, transparent)",
            }}
          />
        </Box>
      ) : null}
    </Box>
  );
}