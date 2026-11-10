export class ApiError extends Error {
  status: number;
  code: string;
  fields: Record<string, string>;

  constructor(status: number, code: string, message: string, fields: Record<string, string> = {}) {
    super(message);
    this.status = status;
    this.code = code;
    this.fields = fields;
  }
}

type ErrorBody = { code?: string; message?: string; fields?: Record<string, string> };

const FALLBACK_MESSAGES: Record<number, string> = {
  400: "Проверьте введённые данные",
  401: "Требуется вход",
  403: "Нет доступа",
  404: "Не найдено",
  409: "Действие сейчас недоступно",
  413: "Файл слишком большой",
};

function fallbackMessage(status: number) {
  return FALLBACK_MESSAGES[status] ?? (status >= 500 ? "Сервер временно недоступен" : "Ошибка запроса");
}

function csrfToken() {
  const match = document.cookie.match(/(?:^|; )XSRF-TOKEN=([^;]*)/);
  return match ? decodeURIComponent(match[1]) : "";
}

function parse(text: string): unknown {
  if (!text) {
    return null;
  }
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

async function send(path: string, options: RequestInit, accept: string) {
  const headers = new Headers(options.headers);
  headers.set("Accept", accept);
  const method = (options.method ?? "GET").toUpperCase();
  if (method !== "GET" && method !== "HEAD") {
    headers.set("X-XSRF-TOKEN", csrfToken());
    if (options.body !== undefined && !(options.body instanceof FormData) && !headers.has("Content-Type")) {
      headers.set("Content-Type", "application/json");
    }
  }
  try {
    return await fetch(path, { ...options, headers, credentials: "include" });
  } catch {
    throw new ApiError(0, "NETWORK", "Нет связи с сервером");
  }
}

async function failure(response: Response) {
  const body = (parse(await response.text()) ?? {}) as ErrorBody;
  return new ApiError(response.status, body.code ?? `HTTP_${response.status}`, body.message ?? fallbackMessage(response.status), body.fields ?? {});
}

export async function api<T>(path: string, options: RequestInit = {}): Promise<T> {
  const response = await send(path, options, "application/json");
  if (!response.ok) {
    throw await failure(response);
  }
  if (response.status === 204) {
    return undefined as T;
  }
  return parse(await response.text()) as T;
}

export function json(method: string, body?: unknown): RequestInit {
  return { method, body: body === undefined ? undefined : JSON.stringify(body) };
}

export function formData(file: File | Blob, name?: string): RequestInit {
  const data = new FormData();
  data.append("file", file, name ?? (file instanceof File ? file.name : "file"));
  return { method: "POST", body: data };
}

export async function downloadFile(path: string, fallbackName: string) {
  const response = await send(path, {}, "*/*");
  if (!response.ok) {
    throw await failure(response);
  }
  const disposition = response.headers.get("Content-Disposition") ?? "";
  const match = disposition.match(/filename\*=UTF-8''([^;]+)|filename="?([^";]+)"?/i);
  const name = match ? decodeURIComponent(match[1] ?? match[2]) : fallbackName;
  const url = URL.createObjectURL(await response.blob());
  const link = document.createElement("a");
  link.href = url;
  link.download = name;
  link.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function queryString(params: Record<string, string | number | undefined | null>) {
  const search = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== "") {
      search.set(key, String(value));
    }
  });
  const text = search.toString();
  return text ? `?${text}` : "";
}

export function errorMessage(error: unknown, fallback = "Не удалось выполнить действие") {
  return error instanceof ApiError ? error.message : fallback;
}

export function applyFieldErrors<Name extends string>(
  error: unknown,
  setError: (name: Name, error: { type: string; message: string }) => void,
  names: readonly Name[],
): boolean {
  if (!(error instanceof ApiError)) return false;
  let applied = false;
  for (const name of names) {
    const message = error.fields[name];
    if (message) {
      setError(name, { type: "server", message });
      applied = true;
    }
  }
  return applied;
}
