import { describe, expect, it, vi } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useAnswerSaver } from "./useAnswerSaver";
import { publicApi } from "./publicApi";
import { ApiError } from "@/shared/api/client";

vi.mock("./publicApi", () => ({
  publicApi: {
    saveAnswer: vi.fn(),
  },
}));

describe("useAnswerSaver", () => {
  it("drops PART_EXPIRED without error or retry", async () => {
    vi.mocked(publicApi.saveAnswer).mockRejectedValue(new ApiError(409, "PART_EXPIRED", "Время части истекло"));
    const onFinal = vi.fn();
    const { result } = renderHook(() => useAnswerSaver("token", onFinal));
    act(() => {
      result.current.setAnswer("q1", { optionId: "a" });
    });
    await act(async () => {
      const ok = await result.current.flush();
      expect(ok).toBe(true);
    });
    expect(result.current.error).toBe("");
    expect(onFinal).not.toHaveBeenCalled();
  });

  it("retries on generic failure", async () => {
    vi.mocked(publicApi.saveAnswer).mockRejectedValue(new ApiError(500, "SERVER", "fail"));
    const onFinal = vi.fn();
    const { result } = renderHook(() => useAnswerSaver("token", onFinal));
    act(() => {
      result.current.setAnswer("q1", { optionId: "a" });
    });
    await act(async () => {
      const ok = await result.current.flush();
      expect(ok).toBe(false);
    });
    expect(result.current.error).toBe("Your answer was not saved");
  });
});