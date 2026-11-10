export const STATUS_LABELS: Record<string, string> = {
  DRAFT: "Черновик",
  PUBLISHED: "Опубликован",
  SCHEDULED: "Запланирован",
  OPEN: "Доступ открыт",
  CLOSED: "Доступ закрыт",
  ACTIVE: "Активен",
  BLOCKED: "Заблокирован",
  IN_PROGRESS: "В процессе",
  SUBMITTED: "Отправлен",
  AUTO_GRADED: "Проверен автоматически",
  NEEDS_REVIEW: "Ждёт проверки",
  REVIEWED: "Проверен",
};

export const ROLE_LABELS: Record<string, string> = {
  ADMIN: "Администратор",
  TEACHER: "Преподаватель",
};

export const SECTION_LABELS: Record<string, string> = {
  LISTENING: "Listening",
  READING: "Reading",
  WRITING: "Writing",
  SPEAKING: "Speaking",
  CUSTOM: "Своя секция",
};

export const AUDIT_LABELS: Record<string, string> = {
  USER_CREATED: "Создан пользователь",
  USER_BLOCKED: "Пользователь заблокирован",
  USER_UNBLOCKED: "Пользователь разблокирован",
  ROLE_CHANGED: "Изменена роль",
  PASSWORD_RESET: "Сброшен пароль",
  SETTINGS_UPDATED: "Изменены настройки платформы",  TEST_PUBLISHED: "Тест опубликован",
  TEST_ARCHIVED: "Тест перенесён в архив",
  TEST_RESTORED: "Тест восстановлен из архива",
  TEST_ARCHIVED_BY_ADMIN: "Тест архивирован администратором",
  TEST_DELETED: "Тест удалён",
  TEST_DELETED_BY_ADMIN: "Тест удалён администратором",
  TEST_IMPORTED: "Тест импортирован",
  LINK_REVOKED: "Ссылка отозвана",
  LINK_ROTATED: "Ссылка заменена",
};

export const TARGET_LABELS: Record<string, string> = {
  USER: "Пользователь",
  TEST: "Тест",
  PLATFORM: "Платформа",
};
