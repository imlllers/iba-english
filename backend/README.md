# Backend

Java 21, Spring Boot 3, Spring Security, Spring Data JPA, Flyway, Maven. Пакет `com.iba.testing`, состав модулей – в [docs/architecture.md](../docs/architecture.md).

```bash
mvn test
mvn spring-boot:run
```

Нужен PostgreSQL и переменные из `.env.example`. Миграции применяет Flyway. Первый администратор создаётся при старте, если в базе ещё нет роли `ADMIN`.

Тесты движков проверки – модульные. Интеграционные тесты поднимают PostgreSQL через Testcontainers и проверяют роли, изоляцию преподавателей, публикацию, смену и отзыв ссылки, архив, прохождение с однократной оценкой, продолжение попытки, ручную проверку, профиль, настройки платформы и отклонение битых файлов.

Файлы лежат в `MEDIA_DIR`, лимит размера – `MAX_UPLOAD_BYTES`. Описание API: `/api/swagger`.
