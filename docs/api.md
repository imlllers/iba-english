# REST API

Сессия хранится в cookie. Изменяющие запросы передают CSRF-токен: cookie `XSRF-TOKEN`, заголовок `X-XSRF-TOKEN`. Каждый маршрут кабинета проверяет роль и владельца на сервере. Списки отдаются страницами.

Ошибки приходят одним форматом: `code`, `message`, при ошибке полей – `fields`. Если публикация не прошла проверку, `fields.questionId` указывает на задание с ошибкой.

## Сессия и профиль

- `POST /api/auth/login`
- `POST /api/auth/logout`
- `GET /api/auth/me`
- `PUT /api/auth/profile` – отображаемое имя
- `POST /api/auth/password` – смена пароля с вводом текущего

## Преподаватель

- `GET /api/teacher/overview`
- `GET /api/teacher/presets`
- `GET /api/teacher/tests`, `POST /api/teacher/tests`
- `GET /api/teacher/tests/{id}`, `PUT /api/teacher/tests/{id}`
- `POST /api/teacher/tests/{id}/publish`
- `POST /api/teacher/tests/{id}/duplicate`
- `POST /api/teacher/tests/{id}/archive`, `POST /api/teacher/tests/{id}/restore` – восстановленный тест становится черновиком без ссылки
- `GET /api/teacher/tests/{id}/preview` – тест в публичном виде, без ключей
- `POST /api/teacher/tests/{id}/link/rotate`, `POST /api/teacher/tests/{id}/link/revoke`
- `POST /api/teacher/tests/{id}/sections`, `PUT|DELETE /api/teacher/tests/{id}/sections/{sectionId}`
- `POST /api/teacher/tests/{id}/sections/{sectionId}/questions` – тело `{ type, count }`, count от 1 до 40, без count создаётся одно задание
- `POST /api/teacher/tests/{id}/sections/{sectionId}/questions/reorder`
- `PUT|DELETE /api/teacher/tests/{id}/questions/{questionId}`
- `POST /api/teacher/tests/{id}/questions/{questionId}/duplicate`
- `GET /api/teacher/tests/{id}/export` – zip одного теста
- `GET /api/teacher/media` – обзор папки (`folderId`, `q`, `kind`, `page`, `size`): `path`, `folders`, `items`
- `POST /api/teacher/media` – загрузка (`file`, опционально `folderId`)
- `PATCH /api/teacher/media/{id}` – перенос/переименование файла
- `POST /api/teacher/media/folders`, `PATCH /api/teacher/media/folders/{id}`, `DELETE /api/teacher/media/folders/{id}`
- `GET /api/teacher/media/{id}/content`
- `GET /api/teacher/results` – фильтры по тесту и статусу
- `GET /api/teacher/attempts/{id}`
- `PUT /api/teacher/attempts/{id}/answers/{questionId}/review` – баллы, баллы по критериям, комментарий
- `GET /api/teacher/attempts/{attemptId}/media/{mediaId}` – запись устного ответа

## Администратор

- `GET /api/admin/overview`
- `GET /api/admin/users`, `POST /api/admin/users`
- `PATCH /api/admin/users/{id}/status`, `PATCH /api/admin/users/{id}/role`
- `POST /api/admin/users/{id}/password` – новый пароль; уже открытые сессии пользователя при этом не закрываются
- `GET /api/admin/tests`, `POST /api/admin/tests/{id}/archive`
- `GET /api/admin/audit`
- `GET /api/admin/settings`, `PUT /api/admin/settings` – лимит загрузки не больше серверного `MAX_UPLOAD_BYTES`, срок хранения попыток в днях (0 – без удаления), срок ссылки для участников в часах (0–168, 0 – без ограничения, по умолчанию 12)

Ответы участников администратору не отдаются.

## Публичное прохождение

- `GET /api/public/tests/{publicToken}`
- `POST /api/public/tests/{publicToken}/attempts`
- `GET /api/public/attempts/{attemptToken}` – продолжить попытку; 409, если она уже отправлена
- `PUT /api/public/attempts/{attemptToken}/answers/{questionId}`
- `POST /api/public/attempts/{attemptToken}/sections/{sectionId}/start` – запуск таймера секции
- `POST /api/public/attempts/{attemptToken}/submit` – повторная отправка не пересчитывает попытку
- `GET /api/public/attempts/{attemptToken}/result`
- `GET /api/public/tests/{publicToken}/media/{mediaId}`
- `POST /api/public/attempts/{attemptToken}/media`, `GET /api/public/attempts/{attemptToken}/media/{mediaId}` – запись голоса

Коды ошибок прохождения: `NAME_REQUIRED`, `NOT_OPEN`, `CLOSED`, `TIME_EXPIRED`, `SECTION_EXPIRED`, `ALREADY_SUBMITTED`.

Публичные ответы не содержат `answerKey`. Время теста и секций проверяет сервер.

`GET /api/health` – проверка состояния для Docker.
