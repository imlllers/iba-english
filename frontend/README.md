# Frontend

React 19, TypeScript, Vite, Mantine, React Router, TanStack Query, React Hook Form, Zod, Tiptap, шрифт Montserrat.

```bash
npm install
npm run dev
npm test
npm run build
npm run e2e
```

Клиент разработки работает на `http://127.0.0.1:5173` и проксирует `/api` на `http://127.0.0.1:8080`. В Docker тот же путь проксирует Nginx.

- `src/app` – маршруты, шапка, меню, проверка роли
- `src/pages` – страницы, стили рядом
- `src/features` – конструктор, типы заданий, прохождение, результаты, админка
- `src/entities` – типы и API-модули
- `src/shared` – клиент API, общие компоненты, хуки
- `src/styles` – токены, сетка, базовая типографика
- `e2e` – сквозной сценарий Playwright

`npm test` проверяет реестр типов по enum backend, контент заданий и рендер всех плееров. `npm run e2e` создаёт и публикует тест под учёткой преподавателя, проходит его по ссылке и открывает результат.
