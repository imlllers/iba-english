# Модель данных

Схема задаётся миграциями Flyway в `backend/src/main/resources/db/migration`. Гибкие части заданий хранятся в JSONB.

## users

`id`, уникальный `email`, `password_hash`, `display_name`, `role` (`ADMIN`, `TEACHER`), `status` (`ACTIVE`, `BLOCKED`), `created_at`, `updated_at`, `last_login_at`.

Пароль хранится только как хеш. Назначить себе `ADMIN` через форму или запрос нельзя.

## tests

`id`, `owner_id`, `title`, `description`, `exam_preset`, `status` (`DRAFT`, `PUBLISHED`, `ARCHIVED`), `public_token`, `public_token_expires_at`, `settings`, `created_at`, `updated_at`. Тесты только на английском, отдельного поля языка нет. Ссылка действует 12 часов: срок записывается в `public_token_expires_at` в момент публикации или замены ссылки.

`settings` хранит общее время, окно доступности, обязательность имени и показ результата участнику.

## test_sections

`id`, `test_id`, `title`, `instructions`, `order_index`, `section_type`, `time_limit_minutes`.

## questions

`id`, `section_id`, `type`, `prompt_content`, `options`, `answer_key`, `scoring_config`, `order_index`, `required`, `settings`.

`prompt_content` – документ Tiptap в JSON. Ключи ответов не попадают в публичный контент. Типы и их движки описаны в [question-types.md](question-types.md).

## test_versions

`id`, `test_id`, `version_number`, `content_snapshot`, `settings_snapshot`, `published_at`.

Публикация сохраняет снимок теста. Начатые попытки остаются на своей версии.

## test_attempts

`id`, `test_version_id`, `participant_name`, `access_token_hash`, `status` (`IN_PROGRESS`, `SUBMITTED`, `AUTO_GRADED`, `NEEDS_REVIEW`, `REVIEWED`), `started_at`, `submitted_at`, `expires_at`, `score`, `max_score`, `progress`.

В базе лежит только хеш токена попытки. `progress` хранит время запуска секций.

## answers

`id`, `attempt_id`, `question_id`, `answer_data`, `awarded_score`, `max_score`, `feedback`, `needs_review`, `criterion_scores`, `reviewed_by`, `reviewed_at`.

## media_folders

`id`, `owner_id`, `parent_id`, `name`, `created_at`.

Дерево папок библиотеки преподавателя. Имена уникальны среди соседей (без учёта регистра). Вложенность ограничена.

## media_assets

`id`, `owner_id`, `attempt_id`, `folder_id`, `storage_key`, `original_filename`, `mime_type`, `size_bytes`, `created_at`.

Материал преподавателя связан с `owner_id`, запись голоса участника – с `attempt_id`. `folder_id` – папка в библиотеке (null – корень). Файл лежит на диске под случайным `storage_key`, исходное имя путём не используется.

## audit_events

`id`, `actor_id`, `action`, `target_type`, `target_id`, `details`, `created_at`.

## spring_session

Сессия входа хранится в Postgres, а не в памяти сервера. Перезапуск приложения не завершает вход, пока не истекут 24 часа без запросов или пользователь не выйдет сам. Cookie сессии живёт столько же. `spring_session_attributes` хранит содержимое сессии.

## platform_settings

`setting_key`, `setting_value`, `updated_at`.
