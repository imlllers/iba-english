export function secondsToMmSs(totalSeconds: number | null | undefined): string {
  if (totalSeconds == null || totalSeconds <= 0) {
    return "";
  }
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

export function mmSsToSeconds(raw: string): number | null {
  const text = raw.trim();
  if (!text) {
    return null;
  }
  if (/^\d+$/.test(text)) {
    const minutes = Number(text);
    if (Number.isNaN(minutes) || minutes <= 0) {
      return null;
    }
    return minutes * 60;
  }
  const match = /^(\d+):(\d{1,2})$/.exec(text);
  if (!match) {
    return null;
  }
  const minutes = Number(match[1]);
  const seconds = Number(match[2]);
  if (seconds >= 60 || Number.isNaN(minutes) || Number.isNaN(seconds)) {
    return null;
  }
  const total = minutes * 60 + seconds;
  return total > 0 ? total : null;
}

export function limitSecondsFromPart(part: { timeLimitSeconds?: number | null; timeLimitMinutes?: number | null }): number {
  if (typeof part.timeLimitSeconds === "number" && part.timeLimitSeconds > 0) {
    return part.timeLimitSeconds;
  }
  if (typeof part.timeLimitMinutes === "number" && part.timeLimitMinutes > 0) {
    return part.timeLimitMinutes * 60;
  }
  return 0;
}

export function limitSecondsFromSection(section: { timeLimitSeconds?: number | null; timeLimitMinutes?: number | null }): number {
  if (typeof section.timeLimitSeconds === "number" && section.timeLimitSeconds > 0) {
    return section.timeLimitSeconds;
  }
  if (typeof section.timeLimitMinutes === "number" && section.timeLimitMinutes > 0) {
    return section.timeLimitMinutes * 60;
  }
  return 0;
}