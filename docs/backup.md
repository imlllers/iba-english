# Резервное копирование

Образ Docker не заменяет копию базы. Для переноса экземпляра нужны дамп PostgreSQL, каталог медиа, `.env` и миграции Flyway.

Обычная остановка не удаляет данные:

```bash
docker compose down
```

`docker compose down -v` стирает volume базы и медиа. Эту команду не используют как ежедневную остановку.

## База

```bash
docker compose exec postgres pg_dump -U iba -d iba_testing > backup.sql
docker compose exec -T postgres psql -U iba -d iba_testing < backup.sql
```

## Медиа

Файлы лежат в volume `media_data`, внутри контейнера это `/data/media`. Имя файла – ключ хранения, не исходное имя.

```bash
docker compose cp backend:/data/media ./media-backup
```

## Один тест

Преподаватель скачивает zip через «Экспорт»: `test.json` схемы версии 1 и файлы из `media/`. В архиве нет попыток, паролей и токенов.
