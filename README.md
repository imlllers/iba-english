<div align="center">

# IBA English

**Платформа для создания языковых тестов и их прохождения по ссылке**

Преподаватель собирает тест в конструкторе, публикует его и отправляет ссылку.
Участник проходит тест без регистрации, а результат появляется в кабинете преподавателя.

[![Java](https://img.shields.io/badge/Java-21-ED8B00?style=for-the-badge&logo=openjdk&logoColor=white)](https://adoptium.net/)
[![Spring Boot](https://img.shields.io/badge/Spring%20Boot-3.4-6DB33F?style=for-the-badge&logo=springboot&logoColor=white)](https://spring.io/projects/spring-boot)
[![React](https://img.shields.io/badge/React-19-61DAFB?style=for-the-badge&logo=react&logoColor=black)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Mantine](https://img.shields.io/badge/Mantine-9-339AF0?style=for-the-badge&logo=mantine&logoColor=white)](https://mantine.dev/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16-4169E1?style=for-the-badge&logo=postgresql&logoColor=white)](https://www.postgresql.org/)
[![Vite](https://img.shields.io/badge/Vite-6-646CFF?style=for-the-badge&logo=vite&logoColor=white)](https://vitejs.dev/)

</div>

## Содержание

- [О проекте](#о-проекте)
- [Возможности](#возможности)
- [Технологии](#технологии)
- [Начало работы](#начало-работы)
- [Использование](#использование)
- [Конфигурация](#конфигурация)
- [Тестирование](#тестирование)
- [Deploy](#deploy)
- [Документация](#документация)
- [Автор](#автор)

## О проекте

IBA English закрывает полный цикл работы с языковым тестом:

1. Преподаватель собирает тест с нуля или по шаблону IELTS: секции, части, группы вопросов, аудио и изображения.
2. Тест публикуется, и создаётся ссылка для участников. Ссылка действует 12 часов, её можно заменить или отозвать.
3. Участник открывает ссылку, вводит имя и email и проходит тест в интерфейсе, близком к настоящему экзамену.
4. Ответы проверяются автоматически, Writing проверяет преподаватель. Сырые баллы переводятся по шкале в итоговый балл и уровень.
5. Результат виден в кабинете преподавателя и при необходимости уходит участнику на почту.

## Возможности

**Преподаватель**
- Конструктор тестов: секции, части, группы вопросов, общие материалы к группе
- Типы заданий: выбор одного и нескольких ответов, True / False / Not Given, Yes / No / Not Given, пропуски в предложениях и в тексте, короткий ответ, сопоставление, порядок, поиск ошибок, словообразование, развёрнутый письменный ответ
- Шаблоны тестов и шкалы баллов с переводом в band и уровень CEFR
- Медиатека с папками: аудио, изображения, видео
- Демо-просмотр теста глазами участника
- Публикация, замена и отзыв ссылки, копирование теста
- Результаты: автопроверка, ручная проверка, отправка результата на email
- Уведомления о попытках, которые ждут проверки

**Администратор**
- Преподаватели: создание, смена роли, блокировка
- Коды приглашений для самостоятельной регистрации преподавателей
- Лимиты размера файлов отдельно для аудио, изображений, записей голоса и видео

**Участник**
- Старт по ссылке без аккаунта
- Интерфейс в формате экзамена: аудио, карта номеров заданий, таймеры секций
- Автосохранение ответов и продолжение после перезагрузки страницы
- Контроль ухода со страницы, досрочная сдача

## Технологии

| Слой | Стек | Зачем |
| --- | --- | --- |
| Backend | Java 21, Spring Boot 3, Spring Security, Spring Data JPA | API, роли и доступ, проверка ответов |
| БД | PostgreSQL 16, Flyway | Тесты, попытки, результаты, сессии |
| Frontend | React 19, TypeScript, Vite, Mantine, TanStack Query, Tiptap | Кабинеты и интерфейс прохождения |
| Инфра | Docker Compose, Nginx | PostgreSQL, backend и frontend в контейнерах |
| Тесты | JUnit 5, Testcontainers, Vitest, Playwright | Модульные, интеграционные и сквозные проверки |

## Начало работы

### Требования

- Docker
- Для разработки без контейнеров: Java 21, Maven 3.9+, Node.js 20+

### Запуск в Docker

```sh
git clone <url-репозитория>
cd iba-english
cp .env.example .env
docker compose up --build
```

В `.env` задайте свои `POSTGRES_PASSWORD`, `ADMIN_EMAIL`, `ADMIN_PASSWORD` и `ADMIN_LOGIN_SECRET`. При первом старте backend создаст администратора с этими данными.

| Сервис | URL |
| --- | --- |
| UI | http://localhost:5173 |
| API | http://localhost:8080 |
| Swagger | http://localhost:8080/api/swagger |
| PostgreSQL | `localhost:5432` |

```sh
docker compose ps
docker compose logs -f backend
docker compose down
```

`docker compose down -v` удаляет базу и загруженные файлы.

### Запуск для разработки

1. Поднимите только PostgreSQL:

```sh
docker compose up -d postgres
```

2. Запустите backend:

```sh
cd backend
export POSTGRES_USER=iba POSTGRES_PASSWORD=<пароль> ADMIN_EMAIL=<email> ADMIN_PASSWORD=<пароль> ADMIN_LOGIN_SECRET=<секрет>
mvn spring-boot:run
```

Почту для локального запуска удобно задать в `backend/src/main/resources/application-local.yml` (файл не попадает в репозиторий):

```yaml
app:
  mail:
    enabled: true
    host: smtp.gmail.com
    port: 587
    username: <ящик>
    password: <пароль приложения>
    from-email: <ящик>
```

3. Запустите frontend:

```sh
cd frontend
npm install
npm run dev
```

Vite проксирует `/api` на backend, отдельная настройка CORS для разработки не нужна.

## Использование

### Вход администратора

Администратор входит только по секретному адресу:

```
http://localhost:5173/login/<ADMIN_LOGIN_SECRET>
```

Секрет задаётся в `ADMIN_LOGIN_SECRET`. На обычной странице `/login` вход под учёткой администратора не проходит даже с верным паролем: сервер отвечает «Неверный email или пароль», как будто такого аккаунта нет. Если секрет не задан, администратор входит через обычную `/login` – так делать только при локальной разработке.

Логин и пароль первого администратора берутся из `ADMIN_EMAIL` и `ADMIN_PASSWORD`, учётка создаётся при первом старте. После первого входа смените пароль в профиле.

### Вход преподавателя

Преподаватель входит через обычную страницу `/login`. Администратор добавляет его в разделе «Преподаватели» или выдаёт код приглашения: по коду преподаватель регистрируется сам и подтверждает email по ссылке из письма.

### Защита от подбора пароля

После 5 неверных паролей подряд вход для этого email блокируется на 15 минут. С одного IP-адреса допускается не больше 30 неудачных попыток за 15 минут. Ограничение действует и для преподавателей, и для администратора.

### Создание теста

1. «Создать тест» – выбрать тип: IELTS или пользовательский.
2. Добавить секции, части и задания, прикрепить аудио и изображения.
3. Настроить тест: нумерацию, переход между секциями, автозапуск аудио, контроль ухода со страницы, шкалу баллов.
4. Проверить тест в демо-просмотре.
5. Опубликовать и скопировать ссылку для участников.

### Прохождение

1. Участник открывает ссылку вида `/t/<token>`.
2. Вводит имя, фамилию и email.
3. Отвечает на задания и сдаёт тест.
4. Результат появляется в разделе «Результаты»; Writing преподаватель проверяет вручную.

## Конфигурация

Шаблон: [`.env.example`](./.env.example).

| Переменная | Назначение |
| --- | --- |
| `POSTGRES_DB`, `POSTGRES_USER`, `POSTGRES_PASSWORD`, `POSTGRES_PORT` | PostgreSQL |
| `SPRING_DATASOURCE_URL` | Адрес базы для backend |
| `ADMIN_EMAIL`, `ADMIN_PASSWORD`, `ADMIN_DISPLAY_NAME` | Первый администратор при старте |
| `ADMIN_LOGIN_SECRET` | Секрет адреса входа администратора `/login/<секрет>` |
| `BACKEND_PORT`, `FRONTEND_PORT` | Порты сервисов |
| `CORS_ORIGINS`, `FRONTEND_ORIGIN` | Адрес frontend для CORS и ссылок в письмах |
| `MAX_UPLOAD_BYTES` | Верхний предел размера файла на сервере |
| `SESSION_COOKIE_SECURE` | `true` только за HTTPS |
| `MAIL_*` | SMTP для подтверждения email, сброса пароля и результатов |

Для Gmail в `MAIL_PASSWORD` указывается пароль приложения, а не обычный пароль от почты.

## Тестирование

```sh
# Backend: модульные и интеграционные тесты (нужен Docker для Testcontainers)
cd backend && mvn test

# Frontend: тесты и сборка
cd frontend && npm test && npm run build

# Сквозной сценарий: нужен запущенный backend и учётка преподавателя
cd frontend && E2E_TEACHER_EMAIL=<email> E2E_TEACHER_PASSWORD=<пароль> npm run e2e
```

## Deploy

1. Смените все пароли из `.env.example` и задайте длинный случайный `ADMIN_LOGIN_SECRET`.
2. Включите `SESSION_COOKIE_SECURE=true` и отдавайте приложение только по HTTPS.
3. Укажите реальный домен в `CORS_ORIGINS` и `FRONTEND_ORIGIN`.
4. Настройте `MAIL_*` на отдельный ящик для рассылки.
5. Храните тома `postgres_data` и `media_data` на постоянном диске и настройте резервные копии – [docs/backup.md](docs/backup.md).
6. После первого входа смените пароль администратора.

Сборка: frontend – `npm run build`, backend – `mvn -DskipTests package`.

## Документация

- [docs/architecture.md](docs/architecture.md) – модули, роли, границы доступа
- [docs/data-model.md](docs/data-model.md) – сущности
- [docs/api.md](docs/api.md) – REST API
- [docs/question-types.md](docs/question-types.md) – типы заданий и проверка
- [docs/exam-presets.md](docs/exam-presets.md) – шаблоны экзаменов
- [docs/design.md](docs/design.md) – визуальные правила
- [docs/backup.md](docs/backup.md) – резервные копии
- [frontend/README.md](frontend/README.md) – клиент
- [backend/README.md](backend/README.md) – сервер

## Автор

**Валерия Денскевич** – разработка
