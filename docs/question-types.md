# Типы заданий

Типы в `QuestionType` сведены к 11 движкам. Движок отвечает за шаблон, проверку перед публикацией, публичный вид без ключа и оценку. На frontend тому же движку соответствуют один редактор и один плеер. Тест `registry.test.ts` сверяет список типов frontend с enum на backend.

Устаревшие имена читаются через алиасы: `FILL_BLANKS` / `DROPDOWN_GAPS` / `WORD_BANK_GAPS` / `PARAGRAPH_INSERTION` → `GAPPED_TEXT`; `SENTENCE_INSERTION` / `LOCATE_IN_TEXT` / `HIGHLIGHT_TEXT` / `CLASSIFICATION` → `MATCHING`; `SENTENCE_TRANSFORM` / `PARAPHRASE` / `ERROR_CORRECTION` → `SHORT_ANSWER`; `FIND_ERRORS` → `TEXT_ERRORS`; `ESSAY` → `SHORT_WRITTEN`; плюс старые шаблоны экзаменов (`FRAGMENT_CHOICE`, `MATCH_*`, `ORDER_PARAGRAPHS` и т.д.).

| Движок | Типы | Проверка |
| --- | --- | --- |
| CHOICE | SINGLE_CHOICE | авто |
| MULTI_CHOICE | MULTIPLE_SELECT | авто, частичный балл и штраф по настройке |
| JUDGEMENT | TRUE_FALSE, YES_NO, TRUE_FALSE_NOT_GIVEN, YES_NO_NOT_GIVEN | авто |
| INLINE | SENTENCE_GAPS, GAPPED_TEXT | авто по списку допустимых / выбору из списка |
| TEXT_ANSWER | SHORT_ANSWER | авто: текст, число с допуском, дата, время (формат в ключе) |
| MATCHING | MATCHING | авто; у элементов слева опционально аудио |
| ORDERING | ORDER_SENTENCES | авто; `presentation: list|slots` (список или банк со слотами) |
| ERROR_HUNT | SENTENCE_ERRORS, TEXT_ERRORS | авто, без совпадения – ручная проверка по настройке |
| TRANSFORM | WORD_TRANSFORM | авто, без совпадения – ручная проверка по настройке |
| WRITTEN | SHORT_WRITTEN | ручная, баллы по критериям |
| SPEAKING | SPEAKING_RECORDING | ручная; запись в браузере, лимит времени задаёт автор |

**ORDERING.** Один тип в каталоге. `presentation: "list"` – участник переставляет список; `"slots"` – банк и слоты (в слоты кладётся ровно число `items`, лишние из `distractors` остаются в банке; `prefix`/`suffix` – фиксированный текст вокруг). Без `presentation` режим угадывается по distractors/prefix/suffix (старые задания). В режиме списка `joiner: " "` – слова в ряд, иначе части текста столбиком.

Одна аудиозапись на несколько заданий – через группу вопросов в секции, не отдельным типом вопроса.

Текстовые ответы по умолчанию сравниваются без учёта регистра и лишних пробелов. Автор может отключить оба правила.

Если в попытке есть ответ на ручную проверку, она получает статус `NEEDS_REVIEW`. Преподаватель может изменить балл любого ответа на странице проверки, когда не остаётся непроверенных ответов, попытка переходит в `REVIEWED`.

Баллы – внутренняя оценка теста. Они не являются официальным баллом IELTS, TOEFL или TOEIC.
