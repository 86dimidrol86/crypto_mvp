# 🏦 Роль «Финансовый аналитик / Контролёр биржи» — Дизайн и план реализации

## Анализ взаимодействия биржи с банками

**Версия:** 1.0  
**Дата:** Июнь 2026  
**Статус:** Архитектурный дизайн + план реализации

---

## 1. Контекст и проблема

### Текущее состояние
На платформе РусКрипто (MVP) реализованы 3 роли: `USER`, `ADMIN`, `COMPLIANCE`. Раздел «Кросс-бордер» работает с 6 коридорами, но банки-партнёры **захардкожены** в конфигурации. Нет возможности:
- Динамически подключать/отключать банки
- Настраивать комиссии по каждому банку
- Видеть обороты и доходы по банкам
- Сверять транзакции с банковскими выписками
- Управлять лимитами и корреспондентскими счетами

### Зачем нужна эта роль
Производственная криптобиржа работает с **несколькими банками-партнёрами** одновременно:
- **Банк-корреспондент** — для fiat on/off ramp (СБП, банковские переводы)
- **Банк для кросс-бордер** — для международных переводов (SWIFT/SPFS)
- **Банк для СБП** — для мгновенных платежей
- **Резервные банки** — для отказоустойчивости

Каждый банк имеет свои: комиссии, лимиты, сроки, API, требования комплаенса. Нужен **специалист**, который управляет этими подключениями и контролирует финансовые потоки.

---

## 2. Роль: Финансовый аналитик / Контролёр (FINANCE)

### Описание
**FINANCE** — роль с доступом к управлению банками-партнёрами, настройке комиссий, мониторингу оборотов и сверке транзакций. Не имеет доступа к AML-алертам (это COMPLIANCE) или управлению пользователями (это ADMIN).

### Матрица доступа (RBAC)

| Раздел / Действие | USER | COMPLIANCE | ADMIN | **FINANCE** |
|---|---|---|---|---|
| Торги, кошелёк, портфель | ✅ | ✅ | ✅ | ✅ |
| Комплаенс (AML) | ❌ | ✅ | ✅ | ❌ |
| Админка (пользователи) | ❌ | ✅ | ✅ | ❌ |
| **Банки-партнёры** | ❌ | ❌ | ✅ | ✅ |
| **Комиссии банков** | ❌ | ❌ | ✅ | ✅ |
| **Обороты по банкам** | ❌ | ❌ | ✅ | ✅ |
| **Свёрка (reconciliation)** | ❌ | ❌ | ✅ | ✅ |
| **Лимиты банков** | ❌ | ❌ | ✅ | ✅ |
| **Коридоры через банки** | ❌ | ❌ | ✅ | ✅ |
| Настройки системы | ❌ | ❌ | ✅ | ❌ |

### Принцип разделения
- **ADMIN** — полные права (включая FINANCE-функции)
- **COMPLIANCE** — AML, KYC, санкции, SAR
- **FINANCE** — банки, комиссии, обороты, свёрка
- **FINANCE ≠ COMPLIANCE** — разделение обязанностей (SoD), требование 115-ФЗ

---

## 3. Функционал роли — 10 кейсов

### Кейс 1. Управление банками-партнёрами (CRUD)

**Что делает аналитик:**
- Добавляет новый банк-партнёр (Сбер, ВТБ, Газпромбанк, Тинькофф, Альфа-Банк)
- Редактирует реквизиты: название, БИК, SWIFT, ИНН, корр. счёт
- Активирует/деактивирует банк (без удаления — для аудита)
- Назначает банк для типа операций: `FIAT_DEPOSIT`, `FIAT_WITHDRAW`, `CROSS_BORDER`, `SBP`
- Настраивает приоритет (fallback-очередь: если банк 1 недоступен → банк 2)

**Поля модели Bank:**
```
- id, name, bic, swift, inn, correspondentAccount
- type: FIAT_DEPOSIT | FIAT_WITHDRAW | CROSS_BORDER | SBP
- status: ACTIVE | INACTIVE | SUSPENDED
- priority: Int (1 = основной, 2 = резервный)
- apiEndpoint, apiKey (для интеграции)
- logoUrl
- contactPerson, contactPhone, contactEmail
- contractDate, contractExpiry
- createdAt, updatedAt
```

**UI:** Таблица банков + модалка добавления/редактирования. Статус-бейджи (активен/приостановлен/резерв).

---

### Кейс 2. Настройка комиссий банков

**Что делает аналитик:**
- Для каждого банка и типа операции настраивает комиссию:
  - **Процентная** (0.5%, 1.0%, 1.5%)
  - **Фиксированная** (50 ₽, 100 ₽)
  - **Комбинированная** (1% min 50 ₽)
- Настраивает who pays: `USER` (пользователь) или `EXCHANGE` (биржа покрывает)
- Раздельные комиссии для ввода и вывода
- Динамические комиссии по объёму (tiered): до 100K — 1%, 100K-1M — 0.8%, >1M — 0.5%

**Поля модели BankFee:**
```
- id, bankId
- operationType: DEPOSIT | WITHDRAW | CROSS_BORDER | SBP_TRANSFER
- feeType: PERCENT | FIXED | COMBINED
- feePercent, feeFixed, feeMin, feeMax
- payer: USER | EXCHANGE
- tiers: JSON ([{from: 0, to: 100000, percent: 1.0}, ...])
- currency: RUB | USD | EUR
- effectiveFrom, effectiveTo (для истории изменений)
- active: Boolean
```

**UI:** Аккордеон по банкам → для каждого типа операции — форма комиссии с preview-расчётом.

---

### Кейс 3. Управление лимитами банков

**Что делает аналитик:**
- Дневной лимит оборота по банку (например, 50 млн ₽/день)
- Месячный лимит (500 млн ₽/мес)
- Лимит на одну транзакцию (1 млн ₽)
- Лимит на пользователя в день (300K ₽ — требование 115-ФЗ для неквалифицированных)
- Авто-приостановка при достижении лимита (банк переходит в SUSPENDED)

**Поля модели BankLimit:**
```
- id, bankId
- dailyLimit, monthlyLimit, perTransactionLimit
- perUserDailyLimit
- currency
- alertThreshold: Float (0.8 = уведомление при 80% лимита)
- autoSuspendOnLimit: Boolean
```

**UI:** Раздел «Лимиты» в карточке банка. Progress-бары текущего использования.

---

### Кейс 4. Мониторинг оборотов по банкам (Dashboard)

**Что делает аналитик:**
- Видит realtime-дашборд по каждому банку:
  - Оборот за день/неделю/месяц (₽)
  - Количество транзакций
  - Средний чек
  - Сумма комиссий (доход биржи)
  - Доля рынка (какой банк обрабатывает % от общего объёма)
- Сравнение банков (bar chart)
- Динамика по времени (line chart)
- Топ-транзакций за период

**Поля (агрегация из BankTransaction):**
```
- bankId, period, totalVolume, txCount, avgTxSize
- totalFeesCollected, exchangeRevenue, bankRevenue
- shareOfTotalVolume (%)
```

**UI:** KPI-карточки по каждому банку + общий график + таблица сравнения.

---

### Кейс 5. Свёрка с банками (Reconciliation)

**Что делает аналитик:**
- Загружает банковскую выписку (CSV/Excel/API)
- Система автоматически сопоставляет выписку с внутренними транзакциями
- Показывает: matched (совпало), unmatched internal (нет в выписке), unmatched bank (нет в системе)
- Разрешает расхождения: техническая ошибка, задержка, двойной платёж, возврат
- Формирует отчёт сверки для бухгалтерии/аудита

**Поля модели BankReconciliation:**
```
- id, bankId, period (месяц)
- statementFile (путь к загруженной выписке)
- totalTransactions, matchedCount, unmatchedInternal, unmatchedBank
- status: PENDING | IN_PROGRESS | MATCHED | DISCREPANCY
- discrepancyAmount (₽)
- resolvedBy, resolvedAt
- notes
```

**UI:** Мастер сверки: загрузка → автоматический match → таблица расхождений → разрешение.

---

### Кейс 6. Управление корреспондентскими счетами

**Что делает аналитик:**
- Видит корреспондентские счета биржи в каждом банке
- Мониторит балансы (через bank API)
- Инициирует пополнение/перевод между счетами (rebalancing liquidity)
- Настройка минимального остатка (alert при падении ниже)

**Поля модели BankAccount:**
```
- id, bankId, accountNumber, currency
- balance (текущий, из API)
- minBalance (alert threshold)
- type: CORRESPONDENT | OPERATIONAL | RESERVE
- lastSyncAt
```

**UI:** Таблица счетов с балансами + кнопка «Синхронизировать» (запрос к bank API).

---

### Кейс 7. Настройка методов оплаты (Payment Methods)

**Что делает аналитик:**
- Для каждого банка настраивает доступные методы:
  - СБП (по номеру телефона)
  - Банковский перевод (по реквизитам)
  - Банковская карта (Visa/Mastercard/Мир)
  - Наличный deposit (через кассу банка)
- Настраивает таймауты (например, СБП — 15 мин, банковский перевод — 24ч)
- Привязывает методы к валютам (RUB, USD, EUR)

**UI:** Чекбоксы методов в карточке банка + поля настроек.

---

### Кейс 8. Аналитика по fiat on/off ramp

**Что делает аналитик:**
- Общая статистика ввода/вывода fiat:
  - Объём ввода vs вывода (net flow)
  - По валютам (RUB, USD, EUR)
  - По методам (СБП %, карта %, перевод %)
  - Конверсия (сколько пользователей делают первый deposit)
  - Funnel: регистрация → KYC → первый deposit → trade
- Выявляет узкие места (например, СБП даёт 80% ввода, но вывод через банковский перевод занимает 24ч → пользователи недовольны)

**UI:** Отдельный раздел аналитики с funnel-визуализацией и cohort-анализом.

---

### Кейс 9. Управление валютными коридорами через банки

**Что делает аналитик:**
- Для каждого кросс-бордер коридора (RU-CN, RU-AE и т.д.) настраивает:
  - Банк-отправитель (российский)
  - Банк-получатель (зарубежный)
  - Liquidity bridge (партнёр конвертации)
  - Комиссия коридора (% от суммы)
  - ETA (15-40 мин, 1-3 часа)
  - Мин/макс сумма
- A/B тестирование коридоров (2 банка на один коридор, выбор по rate/ETA)

**Поля модели CorridorConfig:**
```
- id, corridorId (RU-CN), 
- senderBankId, receiverBankId, liquidityBridge
- feePercent, feeMin, feeMax
- etaMin, etaMax (минуты)
- minAmount, maxAmount
- active: Boolean
```

**UI:** Таблица коридоров с банками и настройками.

---

### Кейс 10. Регуляторная отчётность по банкам

**Что делает аналитик:**
- Формирует отчёты для ЦБ РФ / Росфинмониторинга:
  - Оборот по банкам за период (с разбивкой по типам операций)
  - Крупные транзакции (>600K ₽ — порог 115-ФЗ)
  - Подозрительные паттерны (структурирование через разные банки)
  - Статус сверки с каждым банком
- Экспорт в CSV/XML (форматы ЦБ РФ)
- Data Room — доступ для инспекторов ЦБ

**UI:** Раздел «Отчёты» с шаблонами + кнопка «Сформировать» + экспорт.

---

## 4. Новые модели базы данных

### 4.1. Bank
```prisma
model Bank {
  id                  String   @id @default(cuid())
  name                String   // "Сбербанк"
  bic                 String   @unique // БИК
  swift               String?  // SWIFT код
  inn                 String?  // ИНН
  correspondentAccount String? // Корр. счёт
  type                String   // FIAT_DEPOSIT|FIAT_WITHDRAW|CROSS_BORDER|SBP
  status              String   @default("ACTIVE") // ACTIVE|INACTIVE|SUSPENDED
  priority            Int      @default(1) // 1=основной, 2=резервный
  apiEndpoint         String?  // URL bank API
  apiKey              String?  // ключ (encrypted)
  logoUrl             String?
  contactPerson       String?
  contactPhone        String?
  contactEmail        String?
  contractDate        DateTime?
  contractExpiry      DateTime?
  createdAt           DateTime @default(now())
  updatedAt           DateTime @updatedAt

  fees                BankFee[]
  limits              BankLimit?
  accounts            BankAccount[]
  transactions        BankTransaction[]
  reconciliations     BankReconciliation[]
}
```

### 4.2. BankFee
```prisma
model BankFee {
  id              String   @id @default(cuid())
  bankId          String
  bank            Bank     @relation(fields: [bankId], references: [id], onDelete: Cascade)
  operationType   String   // DEPOSIT|WITHDRAW|CROSS_BORDER|SBP_TRANSFER
  feeType         String   // PERCENT|FIXED|COMBINED
  feePercent      Float    @default(0)
  feeFixed        Float    @default(0)
  feeMin          Float    @default(0)
  feeMax          Float?   // null = без максимума
  payer           String   @default("USER") // USER|EXCHANGE
  tiers           String?  // JSON: [{from,to,percent}]
  currency        String   @default("RUB")
  effectiveFrom   DateTime @default(now())
  effectiveTo     DateTime?
  active          Boolean  @default(true)
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt
}
```

### 4.3. BankLimit
```prisma
model BankLimit {
  id                  String   @id @default(cuid())
  bankId              String   @unique
  bank                Bank     @relation(fields: [bankId], references: [id], onDelete: Cascade)
  dailyLimit          Float    @default(50000000) // 50M ₽
  monthlyLimit        Float    @default(500000000) // 500M ₽
  perTransactionLimit Float    @default(1000000) // 1M ₽
  perUserDailyLimit   Float    @default(300000) // 300K (115-ФЗ)
  currency            String   @default("RUB")
  alertThreshold      Float    @default(0.8) // 80%
  autoSuspendOnLimit  Boolean  @default(true)
  createdAt           DateTime @default(now())
  updatedAt           DateTime @updatedAt
}
```

### 4.4. BankAccount
```prisma
model BankAccount {
  id            String   @id @default(cuid())
  bankId        String
  bank          Bank     @relation(fields: [bankId], references: [id], onDelete: Cascade)
  accountNumber String   // номер счёта
  currency      String   @default("RUB")
  balance       Float    @default(0) // из bank API
  minBalance    Float    @default(1000000) // alert threshold
  type          String   @default("CORRESPONDENT") // CORRESPONDENT|OPERATIONAL|RESERVE
  lastSyncAt    DateTime?
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt
}
```

### 4.5. BankTransaction
```prisma
model BankTransaction {
  id              String   @id @default(cuid())
  bankId          String
  bank            Bank     @relation(fields: [bankId], references: [id])
  transactionId   String?  // ссылка на Transaction (внутренняя)
  userId          String?  // пользователь
  type            String   // DEPOSIT|WITHDRAW|CROSS_BORDER|SBP
  amount          Float    // сумма
  fee             Float    // комиссия
  feePayer        String   // USER|EXCHANGE
  currency        String   @default("RUB")
  status          String   @default("PENDING") // PENDING|COMPLETED|FAILED|REVERSED
  bankReference   String?  // ID транзакции в банке
  processedAt     DateTime?
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt
}
```

### 4.6. BankReconciliation
```prisma
model BankReconciliation {
  id                  String   @id @default(cuid())
  bankId              String
  bank                Bank     @relation(fields: [bankId], references: [id])
  period              String   // "2026-06"
  statementFile       String?  // путь к файлу выписки
  totalTransactions   Int      @default(0)
  matchedCount        Int      @default(0)
  unmatchedInternal   Int      @default(0) // есть в системе, нет в выписке
  unmatchedBank       Int      @default(0) // есть в выписке, нет в системе
  status              String   @default("PENDING") // PENDING|IN_PROGRESS|MATCHED|DISCREPANCY
  discrepancyAmount   Float    @default(0)
  resolvedBy          String?  // userId
  resolvedAt          DateTime?
  notes               String?
  createdAt           DateTime @default(now())
  updatedAt           DateTime @updatedAt
}
```

### 4.7. CorridorConfig
```prisma
model CorridorConfig {
  id              String   @id @default(cuid())
  corridorId      String   @unique // "RU-CN"
  senderBankId    String?  // банк-отправитель (РФ)
  receiverBankId  String?  // банк-получатель (зарубежный)
  liquidityBridge String?  // партнёр конвертации
  feePercent      Float    @default(1.0)
  feeMin          Float    @default(0)
  feeMax          Float?
  etaMin          Int      @default(15) // минуты
  etaMax          Int      @default(40)
  minAmount       Float    @default(10000)
  maxAmount       Float    @default(10000000)
  active          Boolean  @default(true)
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt
}
```

### Обновление User model
```prisma
// Добавить роль FINANCE
role String @default("USER") // USER|COMPLIANCE|ADMIN|FINANCE
```

---

## 5. API-эндпоинты (14 новых)

| Метод | Путь | Назначение | Роль |
|---|---|---|---|
| GET | `/api/finance/banks` | Список банков | FINANCE/ADMIN |
| POST | `/api/finance/banks` | Добавить банк | FINANCE/ADMIN |
| PATCH | `/api/finance/banks/{id}` | Редактировать банк | FINANCE/ADMIN |
| DELETE | `/api/finance/banks/{id}` | Деактивировать банк | ADMIN only |
| GET | `/api/finance/banks/{id}/fees` | Комиссии банка | FINANCE/ADMIN |
| POST | `/api/finance/banks/{id}/fees` | Настроить комиссию | FINANCE/ADMIN |
| GET | `/api/finance/banks/{id}/limits` | Лимиты банка | FINANCE/ADMIN |
| PATCH | `/api/finance/banks/{id}/limits` | Обновить лимиты | FINANCE/ADMIN |
| GET | `/api/finance/banks/{id}/accounts` | Корр. счета банка | FINANCE/ADMIN |
| POST | `/api/finance/banks/{id}/accounts/sync` | Синхронизировать баланс | FINANCE/ADMIN |
| GET | `/api/finance/dashboard` | Дашборд оборотов | FINANCE/ADMIN |
| GET | `/api/finance/reconciliation` | Список сверок | FINANCE/ADMIN |
| POST | `/api/finance/reconciliation` | Создать сверку (загрузить выписку) | FINANCE/ADMIN |
| PATCH | `/api/finance/reconciliation/{id}` | Разрешить расхождения | FINANCE/ADMIN |
| GET | `/api/finance/reports` | Регуляторные отчёты | FINANCE/ADMIN |
| GET | `/api/finance/corridors` | Настройка коридоров | FINANCE/ADMIN |
| PATCH | `/api/finance/corridors/{id}` | Обновить коридор | FINANCE/ADMIN |

---

## 6. UI — новый раздел «Финансы»

### Структура раздела (вкладки)

```
Финансы (роль FINANCE)
├── Дашборд          — KPI по банкам, графики оборотов
├── Банки            — CRUD банков, карточки с реквизитами
├── Комиссии         — настройка fee по банкам и операциям
├── Лимиты           — дневные/месячные/per-user лимиты
├── Счета            — корреспондентские счета, балансы, sync
├── Свёрка           — reconciliation мастер
├── Коридоры         — настройка кросс-бордер через банки
├── Отчёты           — регуляторные отчёты, экспорт
└── Аналитика        — fiat on/off ramp, funnel, cohort
```

### Дашборд (главный экран)
- **4 KPI-карточки**: общий оборот за день, комиссии собраны, активных банков, транзакций
- **Bar chart**: оборот по банкам (сравнение)
- **Line chart**: динамика оборота за 30 дней
- **Таблица**: топ-5 банков с метриками (объём, комиссии, доля, статус)
- **Alerts**: банки с превышением лимита 80%, счета с низким балансом

---

## 7. План реализации

### Фаза A. Backend + Data Model (3–4 дня)

| # | Задача | Срок | Артефакт |
|---|---|---|---|
| A1 | Обновить Prisma-схему: 7 новых моделей | 0.5 дня | `schema.prisma` |
| A2 | Добавить роль FINANCE в User model | 0.5 дня | schema + seed |
| A3 | Создать seed для банков (5 банков: Сбер, ВТБ, Газпром, Тинькофф, Альфа) | 0.5 дня | `seed-banks.ts` |
| A4 | Реализовать 16 API-эндпоинтов `/api/finance/*` | 2 дня | route.ts files |
| A5 | Role-gating middleware (FINANCE/ADMIN only) | 0.5 дня | middleware |

**Результат:** Бэкенд готов, API работает с БД.

---

### Фаза B. Frontend — Finance View (4–5 дней)

| # | Задача | Срок | Артефакт |
|---|---|---|---|
| B1 | Создать `finance-view.tsx` с табами (9 разделов) | 0.5 дня | shell |
| B2 | **Дашборд-таб**: KPI + графики (recharts) | 1 день | dashboard |
| B3 | **Банки-таб**: таблица + CRUD-модалка | 1 день | banks CRUD |
| B4 | **Комиссии-таб**: аккордеон по банкам + формы | 1 день | fees config |
| B5 | **Лимиты-таб**: формы + progress-бары | 0.5 дня | limits |
| B6 | **Счета-таб**: таблица + sync-кнопка | 0.5 дня | accounts |
| B7 | **Свёрка-таб**: мастер (upload → match → resolve) | 1 день | reconciliation |
| B8 | **Коридоры-таб**: таблица + формы | 0.5 дня | corridors |
| B9 | **Отчёты-таб**: шаблоны + экспорт CSV/XML | 0.5 дня | reports |
| B10 | **Аналитика-таб**: funnel + cohort | 1 день | analytics |
| B11 | Добавить 'finance' в NAV (role-gated) | 0.5 дня | page.tsx |
| B12 | i18n ключи (RU/EN) для Finance | 0.5 дня | i18n.ts |

**Результат:** Полнофункциональный раздел «Финансы» в UI.

---

### Фаза C. Интеграция с существующими модулями (2–3 дня)

| # | Задача | Срок | Артефакт |
|---|---|---|---|
| C1 | Обновить wallet-view: депозит/вывод через Bank API | 1 день | wallet integration |
| C2 | Обновить payments-view: коридоры из CorridorConfig | 0.5 дня | payments integration |
| C3 | При размещении ордера: проверка лимитов банка | 0.5 дня | order flow |
| C4 | При транзакции: запись в BankTransaction + расчёт fee | 0.5 дня | tx flow |
| C5 | Auto-suspend банка при превышении лимита | 0.5 дня | limit enforcement |

**Результат:** Банки интегрированы в пользовательские флоу.

---

### Фаза D. Демо-аккаунт + Seed (1 день)

| # | Задача | Срок | Артефакт |
|---|---|---|---|
| D1 | Создать demo FINANCE-аккаунт: `finance@ruscrypto.ru` | 0.5 дня | seed |
| D2 | Кнопка быстрого входа в auth-view (4-я роль) | 0.5 дня | auth-view |
| D3 | Seed 5 банков с комиссиями, лимитами, счетами | 0.5 дня | seed-banks |
| D4 | Seed 100 BankTransaction за 30 дней | 0.5 дня | seed-tx |
| D5 | Seed 3 BankReconciliation (1 matched, 1 discrepancy) | 0.5 дня | seed-recon |

**Результат:** Готовое демо с реальными данными.

---

### Фаза E. Документация + QA (1 день)

| # | Задача | Срок | Артефакт |
|---|---|---|---|
| E1 | Обновить `02-DOCUMENTATION.md` — раздел «Финансы» | 0.5 дня | docs |
| E2 | Обновить `04-PRESENTATION-SCRIPT.md` — демо Finance | 0.5 дня | docs |
| E3 | QA через agent-browser (все 9 табов) | 0.5 дня | QA report |
| E4 | Lint + фикс багов | 0.5 дня | clean |

**Результат:** Документация актуальна, демо готово к показу.

---

## 8. Сводка по срокам

| Фаза | Срок | Команда |
|---|---|---|
| A. Backend + Data Model | 3–4 дня | 1 backend |
| B. Frontend — Finance View | 4–5 дней | 1 frontend |
| C. Интеграция с модулями | 2–3 дня | 1 fullstack |
| D. Демо-аккаунт + Seed | 1 день | 1 backend |
| E. Документация + QA | 1 день | 1 QA |
| **Итого** | **11–14 дней** | **1–2 человека** |

> Можно ускорить до 7–8 дней, если запустить backend (A) и frontend (B) параллельно.

---

## 9. Демо-сценарий для инвесторов

### Что показать на презентации

1. **Войти как `finance@ruscrypto.ru`** → видит раздел «Финансы» в меню
2. **Дашборд** — оборот 50M ₽ за день, 5 банков активны, комиссии 500K ₽
3. **Банки** — показать Сбер (основной, 60% оборота) и Альфа (резервный, 5%)
4. **Комиссии** — изменить комиссию Сбера на вывод с 0.5% на 0.8% → показать расчёт
5. **Лимиты** — показать progress-бар: Сбер использовал 42M из 50M дневного лимита (84%, жёлтый alert)
6. **Счета** — корр. счёт в Сбере: 12M ₽, синхронизация с bank API
7. **Свёрка** — показать расхождение: 2 транзакции не совпали, разрешить
8. **Отчёты** — сформировать отчёт для ЦБ РФ за июнь, экспорт XML

**Ключевой месседж:** «Биржа полностью контролирует финансовые потоки через банки — комиссии, лимиты, свёрка, отчётность. Это институциональный уровень управления.»

---

## 10. Риски и митигация

| Риск | Митигация |
|---|---|
| Bank API недоступен | Fallback на ручной ввод + mock для демо |
| Расхождения в сверке | Автоматический match по сумме+дате+референсу, ручное разрешение для остальных |
| Превышение лимитов | Auto-suspend банка + alert FINANCE + fallback на резервный банк |
| Комплаенс-конфликт | Разделение FINANCE и COMPLIANCE (SoD), аудит-лог всех изменений комиссий |
| Регуляторные изменения | Гибкая конфигурация комиссий и лимитов (без код-изменений) |

---

*Документ подготовлен для реализации. Общий срок: 11–14 дней, 1–2 разработчика.*
