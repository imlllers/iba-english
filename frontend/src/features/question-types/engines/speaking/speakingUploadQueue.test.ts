import { describe, expect, it } from "vitest";
import { trackSpeakingUpload, waitForSpeakingUploads } from "./speakingUploadQueue";

describe("speakingUploadQueue", () => {
  it("waits for in-flight uploads", async () => {
    let done = false;
    trackSpeakingUpload(new Promise<void>((resolve) => {
      setTimeout(() => {
        done = true;
        resolve();
      }, 20);
    }));
    await waitForSpeakingUploads();
    expect(done).toBe(true);
  });
});
