import http from "k6/http";
import exec from "k6/execution";
import { check, group, sleep } from "k6";
import { Counter, Trend } from "k6/metrics";

const BASE = __ENV.BASE_URL || "http://127.0.0.1:8080";
const STUDENTS = Number(__ENV.STUDENTS || 40);
const TEACHERS = Number(__ENV.TEACHERS || 5);
const DURATION = __ENV.DURATION || "4m";
const THINK = Number(__ENV.THINK || 1.5);
const SOURCE_TEST_ID = __ENV.SOURCE_TEST_ID || "93690773-ae01-45ab-8084-b2e7acfeec5e";
const OWNER = { email: __ENV.OWNER_EMAIL || "teacher@example.com", password: __ENV.OWNER_PASSWORD || "teacher-pass" };
const ADMIN = { email: __ENV.ADMIN_EMAIL || "admin@example.com", password: __ENV.ADMIN_PASSWORD || "change-me" };
const TEACHER_PASSWORD = "load-pass-123";

const attemptDuration = new Trend("attempt_duration", true);
const submitted = new Counter("attempts_submitted");
const failedAttempts = new Counter("attempts_failed");

export const options = {
  userAgent: "iba-load-test",
  noCookiesReset: true,
  setupTimeout: "2m",
  teardownTimeout: "1m",
  scenarios: {
    students: {
      executor: "per-vu-iterations",
      exec: "student",
      vus: STUDENTS,
      iterations: 1,
      startTime: "10s",
      maxDuration: "15m",
    },
    teachers: {
      executor: "constant-vus",
      exec: "teacher",
      vus: TEACHERS,
      duration: DURATION,
    },
    owner: {
      executor: "constant-vus",
      exec: "owner",
      vus: 1,
      duration: DURATION,
    },
  },
  thresholds: {
    http_req_failed: ["rate<0.01"],
    checks: ["rate>0.99"],
    "http_req_duration{scenario:students}": ["p(95)<1000"],
    "http_req_duration{scenario:teachers}": ["p(95)<1500"],
    "http_req_duration{name:public/submit}": ["p(95)<3000"],
    attempts_failed: ["count==0"],
  },
};

function xsrf() {
  const cookies = http.cookieJar().cookiesForURL(BASE)["XSRF-TOKEN"];
  return cookies && cookies.length ? cookies[0] : "";
}

function jsonHeaders(name) {
  return { headers: { "Content-Type": "application/json", "X-XSRF-TOKEN": xsrf() }, tags: { name } };
}

function logFailure(res, name) {
  if (__ENV.DEBUG && (res.status === 0 || res.status >= 400)) {
    console.log(`${name} ${res.status} ${res.error || String(res.body || "").slice(0, 200)}`);
  }
  return res;
}

function get(path, name) {
  return logFailure(http.get(`${BASE}${path}`, { tags: { name } }), name);
}

function send(method, path, body, name) {
  return logFailure(http.request(method, `${BASE}${path}`, body === undefined ? null : JSON.stringify(body), jsonHeaders(name)), name);
}

function login(account) {
  http.cookieJar().clear(BASE);
  http.get(`${BASE}/api/auth/me`, { tags: { name: "auth/me-anon" }, responseCallback: http.expectedStatuses(200, 401) });
  const res = send("POST", "/api/auth/login", account, "auth/login");
  check(res, { "вход выполнен": (r) => r.status === 200 });
  const me = get("/api/auth/me", "auth/me");
  if (__ENV.DEBUG) {
    console.log(`login ${account.email} -> ${res.status}, me ${me.status}, jar ${JSON.stringify(http.cookieJar().cookiesForURL(BASE))}`);
  }
  return res.status === 200;
}

function pick(list) {
  return list[Math.floor(Math.random() * list.length)];
}

function think(base = THINK) {
  sleep(base * (0.5 + Math.random()));
}

export function setup() {
  if (!login(OWNER)) throw new Error("Не удалось войти владельцем теста");
  const copy = send("POST", `/api/teacher/tests/${SOURCE_TEST_ID}/duplicate`, undefined, "setup").json();
  const settings = { ...copy.settings, emailResultToParticipant: false, availableFrom: null, availableUntil: null };
  send("PUT", `/api/teacher/tests/${copy.id}`, { title: `Нагрузка – ${copy.title}`, description: copy.description || "", settings }, "setup");
  let published = send("POST", `/api/teacher/tests/${copy.id}/publish`, undefined, "setup").json();
  if (!published.publicToken) {
    published = send("POST", `/api/teacher/tests/${copy.id}/link/rotate`, undefined, "setup").json();
  }
  if (!published.publicToken) throw new Error("У копии теста нет публичной ссылки");

  if (!login(ADMIN)) throw new Error("Не удалось войти администратором");
  const stamp = Date.now();
  const teachers = [];
  for (let i = 1; i <= TEACHERS; i++) {
    const email = `load-${stamp}-${i}@example.com`;
    const res = send("POST", "/api/admin/users", { email, displayName: `Нагрузка преподаватель ${i}`, password: TEACHER_PASSWORD, role: "TEACHER" }, "setup");
    if (res.status === 200) teachers.push({ email, password: TEACHER_PASSWORD });
  }
  if (teachers.length === 0) throw new Error("Не удалось создать преподавателей");
  return { testId: copy.id, token: published.publicToken, teachers, stamp };
}

export function teardown(data) {
  if (login(OWNER)) {
    send("DELETE", `/api/teacher/tests/${data.testId}`, undefined, "teardown");
  }
  console.log(`Готово. Учётки load-${data.stamp}-*@example.com убирает ./load-test/cleanup.sh`);
}

function collectMediaIds(node, out = new Set()) {
  if (Array.isArray(node)) {
    node.forEach((item) => collectMediaIds(item, out));
  } else if (node && typeof node === "object") {
    if (typeof node.mediaId === "string" && node.mediaId) out.add(node.mediaId);
    Object.values(node).forEach((value) => collectMediaIds(value, out));
  }
  return out;
}

function blankIds(node, out = []) {
  if (Array.isArray(node)) {
    node.forEach((item) => blankIds(item, out));
  } else if (node && typeof node === "object") {
    if (node.type === "blank" && node.attrs && node.attrs.id) out.push(node.attrs.id);
    Object.values(node).forEach((value) => blankIds(value, out));
  }
  return out;
}

function answerFor(question) {
  const options = question.options || {};
  const settings = question.settings || {};
  switch (question.type) {
    case "SINGLE_CHOICE":
      return Array.isArray(options) && options.length ? { optionId: pick(options).id } : {};
    case "MULTIPLE_SELECT": {
      const count = Math.max(1, Number(settings.selectCount || 2));
      return { optionIds: (Array.isArray(options) ? options : []).slice(0, count).map((item) => item.id) };
    }
    case "TRUE_FALSE":
    case "YES_NO":
    case "TRUE_FALSE_NOT_GIVEN":
    case "YES_NO_NOT_GIVEN": {
      const values = question.type.startsWith("YES") ? ["YES", "NO", "NOT_GIVEN"] : ["TRUE", "FALSE", "NOT_GIVEN"];
      const answers = {};
      (options.statements || []).forEach((item) => { answers[item.id] = pick(values); });
      return { answers };
    }
    case "SENTENCE_GAPS":
    case "GAPPED_TEXT": {
      const blanks = {};
      blankIds(question).forEach((id) => { blanks[id] = pick(["answer", "london", "1998", "river"]); });
      return { blanks };
    }
    case "MATCHING": {
      const pairs = {};
      const right = options.right || [];
      (options.left || []).forEach((item) => { if (right.length) pairs[item.id] = pick(right).id; });
      return { pairs };
    }
    case "SHORT_WRITTEN":
      return { text: "Load test essay. ".repeat(40) };
    default:
      return { text: "answer" };
  }
}

export function student(data) {
  const label = String(exec.vu.idInTest).padStart(3, "0");
  const started = Date.now();
  let ok = true;

  group("открыть ссылку и начать", () => {
    get(`/api/public/tests/${data.token}`, "public/test");
  });
  const start = send("POST", `/api/public/tests/${data.token}/attempts`, {
    participantName: `Нагрузка ${label}`,
    participantEmail: `load-${data.stamp}-student-${label}@example.com`,
  }, "public/start");
  if (!check(start, { "попытка начата": (r) => r.status === 200 })) {
    failedAttempts.add(1);
    return;
  }
  const { attemptToken, test } = start.json();
  const base = `/api/public/attempts/${attemptToken}`;
  check(get(base, "public/resume"), { "попытка загружена": (r) => r.status === 200 });

  group("скачать аудио и картинки", () => {
    for (const mediaId of collectMediaIds(test)) {
      const res = http.get(`${BASE}${base}/media/${mediaId}`, { responseType: "none", tags: { name: "public/media" } });
      check(res, { "файл получен": (r) => r.status === 200 });
    }
  });

  for (const section of test.sections) {
    send("POST", `${base}/sections/${section.id}/start`, undefined, "public/section-start");
    const startedParts = new Set();
    for (const question of section.questions) {
      if (question.partId && !startedParts.has(question.partId)) {
        startedParts.add(question.partId);
        send("POST", `${base}/parts/${question.partId}/start`, undefined, "public/part-start");
      }
      if (question.settings && question.settings.timeLimitSeconds) {
        send("POST", `${base}/questions/${question.id}/start`, undefined, "public/question-start");
      }
      think();
      const res = send("PUT", `${base}/answers/${question.id}`, answerFor(question), "public/answer");
      ok = check(res, { "ответ сохранён": (r) => r.status === 200 }) && ok;
    }
  }

  const submit = send("POST", `${base}/submit`, undefined, "public/submit");
  ok = check(submit, { "тест сдан": (r) => r.status === 200 }) && ok;
  check(get(`${base}/result`, "public/result"), { "результат открыт": (r) => r.status === 200 });

  attemptDuration.add(Date.now() - started);
  if (ok) submitted.add(1);
  else failedAttempts.add(1);
}

let teacherReady = false;

export function teacher(data) {
  if (!teacherReady) {
    const account = data.teachers[exec.vu.idInTest % data.teachers.length];
    teacherReady = login(account);
    if (!teacherReady) {
      sleep(5);
      return;
    }
  }

  let templates = [];
  group("кабинет", () => {
    check(get("/api/auth/me", "teacher/me"), { "кабинет открыт": (r) => r.status === 200 });
    get("/api/teacher/tests?page=0&size=20", "teacher/tests");
    const list = get("/api/teacher/templates", "teacher/templates");
    templates = list.status === 200 ? list.json() : [];
    get("/api/teacher/score-scales", "teacher/score-scales");
    get("/api/teacher/presets", "teacher/presets");
    get("/api/teacher/media?page=0&size=40", "teacher/media");
    get("/api/teacher/media/folders", "teacher/media-folders");
    get("/api/teacher/results?page=0&size=20", "teacher/results");
    get("/api/teacher/notifications/unread-count", "teacher/notifications-count");
    get("/api/teacher/notifications", "teacher/notifications");
  });
  think(2);

  group("черновик теста", () => {
    const template = templates.length ? pick(templates) : null;
    const created = send("POST", "/api/teacher/tests", { title: "Нагрузка черновик", description: "", templateId: template ? template.id : null }, "teacher/test-create");
    if (!check(created, { "тест создан": (r) => r.status === 200 })) return;
    const test = created.json();
    get(`/api/teacher/tests/${test.id}`, "teacher/test-open");
    think(1);
    send("PUT", `/api/teacher/tests/${test.id}`, { title: "Нагрузка черновик – правка", description: "Проверка", settings: test.settings }, "teacher/test-update");
    get(`/api/teacher/tests/${test.id}/preview`, "teacher/test-preview");
    think(1);
    check(send("DELETE", `/api/teacher/tests/${test.id}`, undefined, "teacher/test-delete"), { "тест удалён": (r) => r.status === 200 || r.status === 204 });
  });
  think(3);
}

let ownerReady = false;

export function owner(data) {
  if (!ownerReady) {
    ownerReady = login(OWNER);
    if (!ownerReady) {
      sleep(5);
      return;
    }
  }
  const results = get(`/api/teacher/results?testId=${data.testId}&page=0&size=20`, "owner/results");
  check(results, { "результаты открыты": (r) => r.status === 200 });
  const items = results.status === 200 ? results.json().items || [] : [];
  if (items.length) {
    check(get(`/api/teacher/attempts/${pick(items).id}`, "owner/attempt"), { "попытка открыта": (r) => r.status === 200 });
  }
  get("/api/teacher/notifications/unread-count", "owner/notifications-count");
  sleep(3);
}
