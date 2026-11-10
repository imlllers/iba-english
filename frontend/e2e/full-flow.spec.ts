import { expect, test } from "@playwright/test";

const teacher = {
  email: process.env.E2E_TEACHER_EMAIL ?? "teacher@example.com",
  password: process.env.E2E_TEACHER_PASSWORD ?? "teacher-pass",
};

test("login page shows validation", async ({ page }) => {
  await page.goto("/login");
  await page.getByRole("button", { name: "Войти" }).click();
  await expect(page.getByText("Укажите email в формате name@example.com")).toBeVisible();
  await expect(page.getByText("Введите пароль")).toBeVisible();
});

test("teacher publishes a test, participant passes it, teacher sees the result", async ({ page, browser }) => {
  const title = `E2E ${Date.now()}`;

  await page.goto("/login");
  await page.getByLabel("Email").fill(teacher.email);
  await page.getByLabel("Пароль").fill(teacher.password);
  await page.getByRole("button", { name: "Войти" }).click();
  await expect(page.getByRole("heading", { name: "Созданные тесты" })).toBeVisible();

  await page.goto("/teacher/tests?create=1");
  await page.getByLabel("Название").fill(title);
  await page.getByRole("button", { name: "Создать", exact: true }).click();
  await expect(page.getByLabel("Название теста")).toHaveValue(title);

  await page.getByRole("button", { name: "Добавить задание" }).first().click();
  await page.getByRole("dialog").getByRole("button", { name: /^Выбор одного ответа/ }).click();
  await expect(page.getByText("Текст задания")).toBeVisible();

  await page.getByRole("button", { name: "Опубликовать" }).click();
  const published = page.getByRole("dialog", { name: "Тест опубликован" });
  await expect(published).toBeVisible();
  const link = (await published.locator("code").textContent())?.trim() ?? "";
  expect(link).toContain("/t/");
  await published.getByRole("button", { name: "Готово" }).click();

  const participant = await browser.newContext();
  const take = await participant.newPage();
  await take.goto(link);
  await expect(take.getByRole("heading", { name: title })).toBeVisible();
  await take.getByRole("button", { name: "Начать тест" }).click();
  await expect(take.getByText("Задание 1 из 1")).toBeVisible();
  await take.getByLabel(/goes/).check();
  await expect(take.getByText("Сохранено")).toBeVisible();
  await take.getByRole("button", { name: "Завершить тест" }).click();
  await take.getByRole("dialog").getByRole("button", { name: "Отправить" }).click();
  await expect(take.getByRole("heading", { name: "Ответы отправлены" })).toBeVisible();
  await expect(take.getByText(/Баллы:/)).toBeVisible();
  await expect(take.getByText(/не являются официальной оценкой/)).toBeVisible();
  await participant.close();

  await page.goto("/teacher/results");
  const row = page.getByRole("row").filter({ hasText: title });
  await expect(row).toBeVisible();
  await row.getByRole("link").first().click();
  await expect(page.getByText("Выбор одного ответа")).toBeVisible();
});
