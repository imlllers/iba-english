import { api, json } from "@/shared/api/client";
import type { Page } from "@/shared/api/types";

export type NotificationType =
  | "REVIEW_NEEDED"
  | "STALE_REVIEW"
  | "TEST_OPENED"
  | "TEST_CLOSING"
  | "TEST_CLOSED"
  | "RESULT_EMAIL_FAILED"
  | "PASSWORD_CHANGED"
  | "NEW_DEVICE_LOGIN";

export type AppNotification = {
  id: string;
  type: NotificationType;
  title: string;
  body: string;
  link: string | null;
  createdAt: string;
  read: boolean;
};

export type NotificationPreferences = Record<NotificationType, { app: boolean }>;

export const notificationsApi = {
  list: () => api<Page<AppNotification>>("/api/teacher/notifications?size=20"),
  unread: () => api<{ count: number }>("/api/teacher/notifications/unread-count"),
  read: (id: string) => api<{ ok: boolean }>(`/api/teacher/notifications/${id}/read`, json("POST")),
  readAll: () => api<{ ok: boolean }>("/api/teacher/notifications/read-all", json("POST")),
  clear: () => api<{ ok: boolean }>("/api/teacher/notifications/clear", json("POST")),
  preferences: () => api<NotificationPreferences>("/api/teacher/notifications/preferences"),
  savePreferences: (prefs: NotificationPreferences) =>
    api<NotificationPreferences>("/api/teacher/notifications/preferences", json("PUT", prefs)),
};

export const NOTIFICATION_GROUPS: { anchor: string; title: string; items: { type: NotificationType; label: string; description: string; dated?: boolean }[] }[] = [
  {
    anchor: "notif-results",
    title: "Результаты",
    items: [
      { type: "REVIEW_NEEDED", label: "Попытка ждёт проверки", description: "Участник сдал тест, и часть ответов нужно оценить вручную" },
      { type: "STALE_REVIEW", label: "Напоминание о непроверенных", description: "Раз в день, если попытки ждут проверки больше 3 дней" },
      { type: "RESULT_EMAIL_FAILED", label: "Письмо с результатом не доставлено", description: "Не удалось отправить участнику результат на email" },
    ],
  },
  {
    anchor: "notif-tests",
    title: "Тесты",
    items: [
      { type: "TEST_OPENED", dated: true, label: "Тест открылся", description: "Наступила дата начала доступа к опубликованному тесту" },
      { type: "TEST_CLOSING", dated: true, label: "Тест скоро закроется", description: "До окончания доступа осталось меньше суток" },
      { type: "TEST_CLOSED", dated: true, label: "Тест закрылся", description: "Доступ закончился – сколько участников сдали и сколько ждут проверки" },
    ],
  },
  {
    anchor: "notif-account",
    title: "Учётная запись",
    items: [
      { type: "PASSWORD_CHANGED", label: "Пароль изменён", description: "Пароль от вашей учётной записи сменили" },
      { type: "NEW_DEVICE_LOGIN", label: "Вход с нового устройства", description: "Вход выполнен из браузера или устройства, которого раньше не было" },
    ],
  },
];
