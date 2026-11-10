export type SettingsSectionId = "profile" | "template" | "scale" | "notifications" | "platform";

export type SettingsSearchItem = {
  id: string;
  label: string;
  keywords: string[];
  section: SettingsSectionId;
  anchor?: string;
  params?: Record<string, string>;
  teacherOnly?: boolean;
  adminOnly?: boolean;
};

export const SECTION_LABELS: Record<SettingsSectionId, string> = {
  profile: "Профиль",
  template: "Шаблоны тестов",
  scale: "Шкалы баллов",
  notifications: "Уведомления",
  platform: "Платформа",
};

export const SETTINGS_SEARCH_ITEMS: SettingsSearchItem[] = [
  { id: "profile", label: "Профиль", keywords: ["аккаунт", "учётная запись", "личные данные"], section: "profile" },
  { id: "name", label: "Имя", keywords: ["отображаемое имя", "фамилия", "display name"], section: "profile", anchor: "settings-name" },
  { id: "email", label: "Email", keywords: ["почта", "e-mail", "адрес"], section: "profile", anchor: "settings-name" },
  { id: "password", label: "Сменить пароль", keywords: ["пароль", "password", "безопасность"], section: "profile", anchor: "settings-password" },

  { id: "template", label: "Шаблоны тестов", keywords: ["шаблон", "структура теста", "ielts", "toefl", "toeic"], section: "template", teacherOnly: true },
  { id: "template-structure", label: "Структура шаблона", keywords: ["секции", "части", "время", "минуты"], section: "template", teacherOnly: true },
  { id: "template-access", label: "Доступ участника", keywords: ["имя участника", "email участника", "доступ"], section: "template", teacherOnly: true },
  { id: "template-flow", label: "Прохождение", keywords: ["нумерация", "возврат", "перемешивать", "автозапуск аудио", "уход со страницы", "досрочная сдача"], section: "template", teacherOnly: true },
  { id: "template-after", label: "После сдачи", keywords: ["показывать результат", "пояснения при ошибке", "результат на email", "письмо участнику"], section: "template", teacherOnly: true },

  { id: "scale", label: "Шкалы баллов", keywords: ["шкала", "перевод", "баллы", "экзамен", "ielts", "toefl", "toeic", "cefr", "уровень", "уровни", "таблица"], section: "scale", teacherOnly: true },
  { id: "scale-table", label: "Таблица перевода", keywords: ["сырой балл", "таблица", "пропорционально", "вручную"], section: "scale", teacherOnly: true },
  { id: "scale-cefr", label: "Уровни CEFR", keywords: ["a1", "a2", "b1", "b2", "c1", "c2"], section: "scale", teacherOnly: true },

  { id: "notifications", label: "Уведомления", keywords: ["оповещения", "колокольчик", "notifications"], section: "notifications", teacherOnly: true },
  { id: "notif-review", label: "Попытка ждёт проверки", keywords: ["проверка", "уведомление"], section: "notifications", anchor: "notif-results", teacherOnly: true },
  { id: "notif-stale", label: "Напоминание о непроверенных", keywords: ["3 дня", "напоминание"], section: "notifications", anchor: "notif-results", teacherOnly: true },
  { id: "notif-mail", label: "Письмо с результатом не доставлено", keywords: ["письмо", "email"], section: "notifications", anchor: "notif-results", teacherOnly: true },
  { id: "notif-opened", label: "Тест открылся", keywords: ["дата начала", "уведомление"], section: "notifications", anchor: "notif-tests", teacherOnly: true },
  { id: "notif-closing", label: "Тест скоро закроется", keywords: ["дата окончания", "срок"], section: "notifications", anchor: "notif-tests", teacherOnly: true },
  { id: "notif-closed", label: "Тест закрылся", keywords: ["итоги", "срок"], section: "notifications", anchor: "notif-tests", teacherOnly: true },
  { id: "notif-password", label: "Пароль изменён", keywords: ["безопасность", "уведомление"], section: "notifications", anchor: "notif-account", teacherOnly: true },
  { id: "notif-device", label: "Вход с нового устройства", keywords: ["безопасность", "браузер"], section: "notifications", anchor: "notif-account", teacherOnly: true },

  { id: "platform", label: "Настройки платформы", keywords: ["платформа", "общие"], section: "platform", anchor: "platform-general", adminOnly: true },
  { id: "platform-upload", label: "Размер файлов", keywords: ["лимит", "загрузка", "мб", "аудио", "изображение", "видео", "запись голоса"], section: "platform", anchor: "platform-general", adminOnly: true },
];

const normalize = (text: string) => text.toLowerCase().replaceAll("ё", "е").trim();
const words = (text: string) => normalize(text).split(/[^\p{L}\p{N}]+/u).filter(Boolean);

export function filterSettingsItems(query: string, items: SettingsSearchItem[]): SettingsSearchItem[] {
  const tokens = words(query);
  if (tokens.length === 0) return [];
  const scored: { item: SettingsSearchItem; score: number }[] = [];
  for (const item of items) {
    const labelWords = words(item.label);
    const allWords = [...labelWords, ...item.keywords.flatMap(words), ...words(SECTION_LABELS[item.section])];
    if (!tokens.every((token) => allWords.some((word) => word.startsWith(token)))) continue;
    const label = normalize(item.label);
    const phrase = tokens.join(" ");
    const score = label.startsWith(phrase) ? 0 : tokens.every((token) => labelWords.some((word) => word.startsWith(token))) ? 1 : 2;
    scored.push({ item, score });
  }
  return scored.sort((a, b) => a.score - b.score).slice(0, 12).map((entry) => entry.item);
}

export function scrollToAnchor(anchor: string) {
  window.requestAnimationFrame(() => {
    document.getElementById(anchor)?.scrollIntoView({ behavior: "smooth", block: "start" });
  });
}
