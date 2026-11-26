const STORAGE_PREFIX = "iba-speak-prep:";

export function speakingPrepStorageKey(scope: string, questionId: string) {
  return `${STORAGE_PREFIX}${scope}:${questionId}`;
}

export function readSpeakingPrepStart(key: string, now = Date.now()): number {
  try {
    const raw = sessionStorage.getItem(key);
    const stored = raw ? Number(raw) : NaN;
    if (Number.isFinite(stored) && stored > 0 && stored <= now) {
      return stored;
    }
    sessionStorage.setItem(key, String(now));
  } catch {
    return now;
  }
  return now;
}

export function speakingPrepSecondsLeft(startedAt: number, totalSeconds: number, now = Date.now()) {
  if (totalSeconds <= 0) {
    return 0;
  }
  return Math.max(0, totalSeconds - Math.floor((now - startedAt) / 1000));
}
