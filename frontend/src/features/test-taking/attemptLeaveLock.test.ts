import { describe, expect, it } from "vitest";
import { attemptStorageKey } from "./attemptLeaveLock";

describe("attemptStorageKey", () => {
  it("scopes the token by public link", () => {
    expect(attemptStorageKey("abc")).toBe("iba-attempt:abc");
  });
});