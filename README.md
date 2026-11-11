# 🌸 Праздник — Full Stack проект

Сервис для организации праздников: клиент создаёт праздник, администратор
работает с заказами и получает AI-подсказки, сотрудник ведёт свои задачи.

**Стек:** React + Vite (JSX) · Python + FastAPI · Gemini (AI) · тема Sakura Festival.

## Структура

```
backend/                 основной FastAPI backend (точка входа main.py)
  admin/                 API администратора      → /api/admin
  customer/              API клиента             → /api/customer
  employee/              API сотрудника          → /api/employee
  ai/                    AI-модуль (Gemini, промпты), используется только Admin
  shared/orders_store.py общие данные заказов для Admin и Customer
frontend/
  admin/                 панель администратора   → http://localhost:5173
  user/                  приложение клиента      → http://localhost:5174
  worker/                кабинет сотрудника (пока не подключён к backend)
  shared/sakura/         общая тема Sakura Festival
backend-1/               старый пример работы с LLM (не используется приложением)
```

## Запуск backend

```bash
cd backend

# Создание виртуального окружения
python3 -m venv .venv

# Активация (Mac / Linux)
source .venv/bin/activate
# Windows:
# .venv\Scripts\activate

# Установка зависимостей
python -m pip install -r requirements.txt

# Запуск
uvicorn main:app --reload --host 127.0.0.1 --port 8000
```

> ⚠️ Точка входа — `main:app`. Команда `uvicorn app:app` выдаст
> `Could not import module "app"`.

**AI-функции админки.** Скопируйте `backend/.env.example` в `backend/.env` и впишите ключ:

```
GEMINI_API_KEY=ваш-ключ
# GEMINI_MODEL=gemini-3.5-flash-lite   (необязательно)
```

Без ключа сервер запускается, но AI-эндпоинты отвечают 503.

| Что | Адрес |
|---|---|
| Backend | http://localhost:8000 |
| Документация API (Swagger) | http://localhost:8000/docs |
| Проверка связи | http://localhost:8000/api/health |
| Заказы (Admin) | http://localhost:8000/api/admin/orders |

Остановка сервера: `Ctrl + C`.

## Запуск frontend

Каждое приложение запускается отдельно, в своём терминале (backend должен работать):

**User (клиент)** — http://localhost:5174

```bash
cd frontend/user
npm install
npm run dev
```

**Admin (администратор)** — http://localhost:5173

```bash
cd frontend/admin
npm install
npm run dev
```

**Worker (сотрудник)**

```bash
cd frontend/worker
npm install
npm run dev
```

> Worker тоже настроен на порт 5173. Если admin уже запущен, Vite выберет
> следующий свободный порт — смотрите адрес в терминале.

Адрес backend по умолчанию — `http://localhost:8000/api`. Его можно изменить
файлом `frontend/<app>/.env` со строкой `VITE_API_URL=http://127.0.0.1:8000/api`.

## Что уже работает

**User — приложение клиента**
- Главный экран «Каждый праздник — своя история» и кнопка «Создать праздник».
- «Создать праздник»: заказ сохраняется через `POST /api/customer/orders`, после чего показывается анимация «Ваш праздник начинает расцветать!» и список праздников.
- «Идеи гостей»: добавление и просмотр идей (`/api/customer/ideas`).
- Проверка связи с backend.

**Admin — панель администратора**
- Список заказов (в том числе созданных клиентом) и статистика.
- AI: эмоциональный портрет заказчика и 3 концепции праздника (бюджетная, оптимальная, премиальная) — по заказу или по форме «Ручной анализ».

**Тема Sakura Festival 🌸** (admin и user)
- Падающие лепестки, фон с горами и пагодой, AI-лоадер с веточкой сакуры, анимация успеха.
- Панель «🌸 Анимация»: вкл/выкл, количество, скорость, прозрачность (сохраняется в браузере).
- При системной настройке «уменьшить движение» (`prefers-reduced-motion`) анимации отключаются.

## API

| Модуль | Метод и путь | Назначение |
|---|---|---|
| Customer | `POST /api/customer/orders` | создать заказ |
| Customer | `GET /api/customer/orders`, `GET/PATCH /api/customer/orders/{id}` | заказы |
| Customer | `POST /api/customer/orders/{id}/feedback` | отзыв |
| Customer | `GET /api/customer/packages` | пакеты услуг |
| Customer | `GET/POST /api/customer/ideas` | идеи гостей |
| Admin | `GET /api/admin/dashboard`, `GET /api/admin/orders` | статистика и заказы |
| Admin | `POST /api/admin/orders/{id}/analyze` | AI-портрет заказчика |
| Admin | `POST /api/admin/orders/{id}/concepts` | AI: 3 концепции праздника |
| Admin | `POST /api/admin/ai/client-portrait`, `POST /api/admin/ai/concepts` | AI по форме, заполненной вручную |
| Employee | `GET /api/employee/tasks`, `PATCH /api/employee/tasks/{id}/status` | задачи сотрудника |

Подробности и примеры запросов — в Swagger: http://localhost:8000/docs.

## Пока не готово

- Вкладка «План» в user обращается к `/api/plan`, которого нет в backend.
- Worker обращается к `/api/worker/tasks`, а в backend есть `/api/employee/tasks`.
- Данные хранятся в памяти и пропадают при перезапуске backend; базы данных нет.
- Авторизации нет: клиент видит все заказы, сотрудник — все задачи.

## Частые проблемы

| Симптом | Причина и решение |
|---|---|
| `Could not import module "app"` | запускайте `uvicorn main:app` из папки `backend` |
| `ERR_CONNECTION_TIMED_OUT` / `Failed to fetch` в браузере | backend не запущен — проверьте http://localhost:8000/api/health |
| AI отвечает 503 | нет `GEMINI_API_KEY` в `backend/.env` |
| AI отвечает 502 | ошибка Gemini (лимит, перегрузка, регион); подробности в терминале uvicorn |
| `ModuleNotFoundError: google` | выполните `pip install -r requirements.txt` ещё раз |
