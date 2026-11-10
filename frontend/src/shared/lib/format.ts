const dateFormat = new Intl.DateTimeFormat("ru-RU", { day: "2-digit", month: "2-digit", year: "numeric" });
const dateTimeFormat = new Intl.DateTimeFormat("ru-RU", {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
});

export function formatDate(value: string | null | undefined) {
  return value ? dateFormat.format(new Date(value)) : "–";
}

export function formatDateTime(value: string | null | undefined) {
  return value ? dateTimeFormat.format(new Date(value)) : "–";
}

export function formatBytes(bytes: number) {
  if (bytes < 1024) {
    return `${bytes} Б`;
  }
  if (bytes < 1024 * 1024) {
    return `${Math.round(bytes / 1024)} КБ`;
  }
  return `${(bytes / 1024 / 1024).toFixed(1)} МБ`;
}

export function formatScore(score: number | null | undefined, max: number | null | undefined) {
  if (score === null || score === undefined) {
    return "–";
  }
  const value = Number(score).toLocaleString("ru-RU", { maximumFractionDigits: 2 });
  if (max === null || max === undefined || Number(max) <= 0) {
    return value;
  }
  return `${value} / ${Number(max).toLocaleString("ru-RU", { maximumFractionDigits: 2 })}`;
}

export function formatClock(totalSeconds: number) {
  const safe = Math.max(0, Math.floor(totalSeconds));
  const hours = Math.floor(safe / 3600);
  const minutes = Math.floor((safe % 3600) / 60);
  const seconds = safe % 60;
  const tail = `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
  return hours > 0 ? `${hours}:${tail}` : tail;
}

const pluralRules = new Intl.PluralRules("ru-RU");

export function plural(count: number, one: string, few: string, many: string) {
  const form = pluralRules.select(count);
  return form === "one" ? one : form === "few" ? few : many;
}

export function letter(index: number) {
  return String.fromCharCode(65 + (index % 26));
}

export function toLocalInput(value: string | null | undefined) {
  if (!value) {
    return "";
  }
  const date = new Date(value);
  const offset = date.getTimezoneOffset() * 60000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 16);
}

export function fromLocalInput(value: string) {
  return value ? new Date(value).toISOString() : null;
}

export function countWords(text: string) {
  const trimmed = text.trim();
  return trimmed ? trimmed.split(/\s+/).length : 0;
}
