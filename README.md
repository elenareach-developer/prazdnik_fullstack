# Праздник — стартовый Full Stack проект

Первый этап: React + Flask, три страницы и проверка обмена данными без ИИ.

## Запуск backend
## Запуск backend

```bash
cd backend

# Создание виртуального окружения
python3 -m venv .venv

# Активация окружения (Mac / Linux)
source .venv/bin/activate

# Windows:
# .venv\Scripts\activate

# Установка зависимостей
python -m pip install -r requirements.txt

# Запуск FastAPI
uvicorn app:app --reload --host 127.0.0.1 --port 8000
```
//ToDo creane .env look exaple
**Одной строкой**
```
cd backend
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
uvicorn app:app --reload --host 127.0.0.1 --port 8000
```
**Одной строкой** LLM
```
cd backend
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
uvicorn appG:app --reload --host 127.0.0.1 --port 8000
```
**Backend:** http://localhost:8000

**API Documentation (Swagger):** http://localhost:8000/docs

**Health check:** http://localhost:8000/api/health

**План праздника:** http://localhost:8000/api/plan

**Остановка сервера:** `Ctrl + C`

## Запуск frontend
Worker 
cd frontend
cd worker
npm install
npm run dev

user 
cd frontend
cd user
npm install
npm run dev 

admin 
cd frontend
cd admin
npm install
npm run dev 


В другом терминале:
```bash
cd frontend
npm install
npm run dev
```
Frontend: http://localhost:5173

## Что уже работает
- Страница «Брейншторм»: отправляет описание праздника во Flask.
- Страница «Идеи гостей»: отправляет идеи во Flask и получает общий список.
- Страница «План»: получает с backend тестовый план.
- Проверка связи: кнопка «Проверить backend».

Пока данные хранятся в памяти backend и исчезают при перезапуске сервера.
ИИ и постоянную базу данных подключим следующим этапом.
