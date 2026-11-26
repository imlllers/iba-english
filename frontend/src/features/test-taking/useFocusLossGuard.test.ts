import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useFocusLossGuard } from "./useFocusLossGuard";

describe("useFocusLossGuard", () => {
  beforeEach(() => {
    sessionStorage.clear();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  const setHidden = (hidden: boolean) => {
    Object.defineProperty(document, "hidden", { configurable: true, get: () => hidden });
  };

  const hideTab = () => {
    setHidden(true);
    document.dispatchEvent(new Event("visibilitychange"));
    act(() => {
      vi.advanceTimersByTime(400);
    });
  };

  const showTab = () => {
    setHidden(false);
    document.dispatchEvent(new Event("visibilitychange"));
  };

  it("does nothing when disabled", () => {
    const onExhausted = vi.fn();
    const { result } = renderHook(() => useFocusLossGuard({
      enabled: false,
      maxWarnings: 2,
      storageKey: "test-focus",
      onExhausted,
    }));
    hideTab();
    expect(result.current.count).toBe(0);
    expect(onExhausted).not.toHaveBeenCalled();
  });

  it("opens warning on first tab switch", () => {
    const onExhausted = vi.fn();
    const { result } = renderHook(() => useFocusLossGuard({
      enabled: true,
      maxWarnings: 2,
      storageKey: "test-focus",
      onExhausted,
    }));
    hideTab();
    expect(result.current.count).toBe(1);
    expect(result.current.warningOpen).toBe(true);
    expect(sessionStorage.getItem("test-focus")).toBe("1");
    expect(onExhausted).not.toHaveBeenCalled();
  });

  it("ignores brief tab switch within grace period", () => {
    const onExhausted = vi.fn();
    const { result } = renderHook(() => useFocusLossGuard({
      enabled: true,
      maxWarnings: 2,
      storageKey: "test-focus",
      onExhausted,
    }));
    setHidden(true);
    document.dispatchEvent(new Event("visibilitychange"));
    act(() => {
      vi.advanceTimersByTime(200);
    });
    showTab();
    act(() => {
      vi.advanceTimersByTime(400);
    });
    expect(result.current.count).toBe(0);
    expect(onExhausted).not.toHaveBeenCalled();
  });

  it("submits on exhausting warnings", () => {
    const onExhausted = vi.fn();
    const { result } = renderHook(() => useFocusLossGuard({
      enabled: true,
      maxWarnings: 2,
      storageKey: "test-focus",
      onExhausted,
    }));
    hideTab();
    result.current.dismissWarning();
    showTab();
    hideTab();
    expect(result.current.count).toBe(2);
    expect(result.current.warningOpen).toBe(false);
    expect(onExhausted).toHaveBeenCalledTimes(1);
  });

  it("restores count from session storage", () => {
    sessionStorage.setItem("test-focus", "1");
    const onExhausted = vi.fn();
    const { result } = renderHook(() => useFocusLossGuard({
      enabled: true,
      maxWarnings: 2,
      storageKey: "test-focus",
      onExhausted,
    }));
    expect(result.current.count).toBe(1);
    expect(onExhausted).not.toHaveBeenCalled();
  });

  it("exhausts immediately when storage already at limit", () => {
    sessionStorage.setItem("test-focus", "2");
    const onExhausted = vi.fn();
    renderHook(() => useFocusLossGuard({
      enabled: true,
      maxWarnings: 2,
      storageKey: "test-focus",
      onExhausted,
    }));
    expect(onExhausted).toHaveBeenCalledTimes(1);
  });
});