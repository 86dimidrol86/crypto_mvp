# 🚀 Инструкция по локальному развёртыванию РусКрипто

Пошаговое руководство для развёртывания проекта на локальном компьютере.

---

## 📋 Предварительные требования

| Компонент | Версия | Как проверить |
|---|---|---|
| **Node.js** | ≥ 20.x (рекомендуется 24.x) | `node --version` |
| **Bun** | ≥ 1.2.x | `bun --version` |
| **Git** | ≥ 2.40 | `git --version` |
| ОС | macOS / Linux / Windows (WSL2) | — |

### Установка Bun (если не установлен)
```bash
# macOS / Linux
curl -fsSL https://bun.sh/install | bash
source ~/.bashrc  # или перезапустите терминал

# Windows (PowerShell)
powershell -c "irm bun.sh/install.ps1 | iex"
```

---

## Шаг 1. Клонирование репозитория

```bash
git clone https://github.com/86dimidrol86/crypto_mvp.git
cd crypto_mvp
```

**Ветка по умолчанию:** `main` (стабильная). Для последней разработки:
```bash
git checkout spa-mvp
```

---

## Шаг 2. Установка зависимостей

```bash
bun install
```

Это установит все зависимости из `package.json` (~90 пакетов): Next.js 16, React 19, Prisma, shadcn/ui, recharts, framer-motion, z-ai-web-dev-sdk, socket.io и др.

---

## Шаг 3. Настройка базы данных

### 3.1. Файл окружения `.env`

Создайте файл `.env` в корне проекта:

```bash
# Linux / macOS
cat > .env << 'EOF'
DATABASE_URL=file:./db/custom.db
EOF

# Windows (PowerShell)
echo "DATABASE_URL=file:./db/custom.db" > .env
```

> **Примечание:** Используется SQLite — отдельный сервер БД не требуется. Файл БД создастся автоматически в `db/custom.db`.

### 3.2. Создание директории для БД

```bash
mkdir -p db
```

### 3.3. Генерация Prisma Client + создание схемы БД

```bash
# Генерация типизированного клиента Prisma
bun run db:generate

# Применение схемы к БД (создаёт таблицы)
bun run db:push
```

После этого в `db/custom.db` появится схема из 12 таблиц: User, Balance, Order, Trade, Transaction, P2POffer, P2PDeal, CrossBorderPayment, ComplianceAlert, KycDocument, LoginEvent, Referral.

---

## Шаг 4. Заполнение БД демо-данными (seed)

```bash
bun prisma/seed-extended.ts
```

Скрипт создаст:
- **4 базовых аккаунта**: `user@ruscrypto.ru`, `admin@ruscrypto.ru`, `compliance@ruscrypto.ru`, `ivan.ivanov@gosuslugi.ru`
- **25 дополнительных пользователей** со случайными данными
- **60 сделок** за последние 30 дней
- **8 комплаенс-алертов**, **3 кросс-бордер платежа**, **18 P2P-офферов**
- **8 login events**, **3 реферала**, балансы для 10 пользователей

В консоли появятся учётные данные демо-аккаунтов.

---

## Шаг 5. Запуск мини-сервиса WebSocket (realtime котировки)

В отдельном терминале:

```bash
cd mini-services/market-service
bun install
bun run dev
```

Сервис запустится на порту **3003** и будет генерировать:
- Live order book (12 уровней bids/asks) для 8 торговых пар
- Price ticks каждые 1.5 сек
- Ленту последних сделок

> **Важно:** Этот сервис обязателен для работы live-режима в разделах «Торги» и «Маржинальная торговля». Без него фронтенд использует mock-fallback (статичные данные).

---

## Шаг 6. Запуск основного приложения

В основном терминале (из корня проекта):

```bash
bun run dev
```

Приложение запустится на **http://localhost:3000**

В консоли появится:
```
✓ Ready on http://localhost:3000
✓ Compiled ...
```

Откройте **http://localhost:3000** в браузере.

---

## Шаг 7. Демо-аккаунты для входа

На странице входа (`/auth` → кнопка «Войти») используйте кнопки быстрого входа:

| Роль | Email | Пароль | Доступ |
|---|---|---|---|
| 👤 Пользователь | `user@ruscrypto.ru` | любой | Торги, кошелёк, портфель, P2P, кросс-бордер, комплаенс |
| 🛡️ Администратор | `admin@ruscrypto.ru` | любой | + раздел «Админка» (операционная панель) |
| ⚖️ Комплаенс | `compliance@ruscrypto.ru` | любой | + раздел «Админка» (AML-алерты, пользователи) |

Также доступен вход через «Госуслуги (ЕСИА)» (демо-режим → `ivan.ivanov@gosuslugi.ru`).

---

## ✅ Проверка работоспособности

| Что проверить | Ожидаемый результат |
|---|---|
| Главная страница | Hero + live-тикер топ-20 криптовалют + рыночные данные |
| Раздел «Торги» | График TradingView + live order book (LIVE индикатор) + форма ордера |
| Раздел «Маржа» | Открытие Long/Short позиций с плечом 1-20x |
| Раздел «Кошелёк» | Балансы (RUB, USDT, BTC, ETH) + депозит/вывод |
| Раздел «Комплаенс» | AML-алерты с SHAP-объяснением |
| ИИ-помощник | Золотая кнопка «?» внизу справа → чат с ИИ-консультантом |

---

## 🔄 Полный цикл команд (копировать-вставить)

```bash
# 1. Клонировать
git clone https://github.com/86dimidrol86/crypto_mvp.git
cd crypto_mvp

# 2. Установить зависимости
bun install

# 3. Настроить БД
echo "DATABASE_URL=file:./db/custom.db" > .env
mkdir -p db
bun run db:generate
bun run db:push

# 4. Заполнить демо-данными
bun prisma/seed-extended.ts

# 5. В отдельном терминале — WebSocket сервис
cd mini-services/market-service && bun install && bun run dev &

# 6. Запустить приложение
cd ../..
bun run dev
```

Открыть: **http://localhost:3000**

---

## 🛠️ Команды разработки

| Команда | Описание |
|---|---|
| `bun run dev` | Запуск dev-сервера (порт 3000, hot reload) |
| `bun run build` | Production-сборка |
| `bun run start` | Запуск production-сервера |
| `bun run lint` | Проверка ESLint |
| `bun run db:push` | Применить изменения Prisma-схемы к БД |
| `bun run db:generate` | Регенерация Prisma Client |
| `bun run db:reset` | Сброс БД (⚠️ удаляет все данные) |
| `bun prisma/seed-extended.ts` | Заполнить БД демо-данными |

---

## 🐛 Решение проблем

### Порт 3000 занят
```bash
# Linux / macOS
lsof -ti:3000 | xargs kill -9
# Windows
netstat -ano | findstr :3000
taskkill /PID <PID> /F
```

### Ошибка Prisma «database connection failed»
```bash
rm -f db/custom.db
bun run db:push
bun prisma/seed-extended.ts
```

### Live-котировки не обновляются (LIVE индикатор не горит)
Проверьте, что market-service запущен на порту 3003:
```bash
curl http://localhost:3003
# Ожидаемый ответ: {"code":0,"message":"Transport unknown"} — это нормально для socket.io
```

### ИИ-помощник не отвечает
Проверьте endpoint:
```bash
curl -X POST http://localhost:3000/api/help/chat \
  -H "Content-Type: application/json" \
  -d '{"message":"Привет","locale":"ru","history":[]}'
```
Должен вернуть JSON с полем `answer`. Если ошибка — проверьте, что `z-ai-web-dev-sdk` установлен (`bun install`).

### Котировки Binance не загружаются (sandbox без интернета)
Приложение автоматически переключается на fallback-цены (зашитые в `src/lib/market.ts`). Функциональность сохраняется, но котировки будут статичными.

---

## 📁 Структура проекта

```
crypto_mvp/
├── src/
│   ├── app/
│   │   ├── api/              # API-роуты (14 эндпоинтов)
│   │   ├── globals.css       # Тема (золото + dark navy)
│   │   ├── layout.tsx        # Root layout + ThemeProvider
│   │   └── page.tsx          # SPA shell (sidebar + header + view router)
│   ├── components/
│   │   ├── ui/               # shadcn/ui компоненты (40+)
│   │   ├── views/            # 16 разделов (home, trade, margin, ...)
│   │   ├── logo.tsx          # SVG-логотип
│   │   ├── price-ticker.tsx  # Бегущий тикер топ-20 криптовалют
│   │   ├── help-chat-widget.tsx  # Floating ИИ-помощник
│   │   └── ...
│   └── lib/
│       ├── store.ts          # Zustand store (состояние + persist)
│       ├── db.ts             # Prisma client
│       ├── market.ts         # Котировки Binance + fallback
│       ├── i18n.ts           # RU/EN словарь (~500 ключей)
│       ├── help-content.ts   # 14 статей справки
│       └── ...
├── prisma/
│   ├── schema.prisma         # Схема БД (12 моделей)
│   ├── seed.ts               # Базовый seed
│   └── seed-extended.ts      # Расширенный seed (демо-данные)
├── mini-services/
│   └── market-service/       # socket.io WebSocket (порт 3003)
├── public/
│   ├── favicon.svg           # Логотип РусКрипто
│   └── logo.svg
├── .env                      # DATABASE_URL
└── package.json
```

---

## 🔧 Конфигурация для production

### Переменные окружения (`.env.production`)
```env
DATABASE_URL=file:./db/custom.db
# Для production с PostgreSQL:
# DATABASE_URL=postgresql://user:pass@localhost:5432/ruscrypto
```

### Сборка
```bash
bun run build
bun run start
```

> ⚠️ Для production рекомендуется PostgreSQL вместо SQLite, а также запуск market-service через systemd/pm2.
