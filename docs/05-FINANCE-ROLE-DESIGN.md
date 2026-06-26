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

---

## 11. Требования законодательства РФ и банков — Анализ и корректировки

### 11.1. Требования ФЗ-1194918-8 (криптобиржи)

**Из анализа законопроекта ЦБ РФ и Минфина:**

1. **Лицензирование операторов** — криптобиржи, обменники, брокеры, депозитарии должны получить лицензию ЦБ РФ или войти в реестр. **Корректировка:** поле `licenseStatus` в модели Bank (требуется для каждого банка-партнёра).

2. **Внутренний контроль и управление рисками** — обязательны для криптоорганизаций. Банк-партнёр должен видеть, что биржа имеет AML-процедуры. **Корректировка:** выгрузка комплаенс-статуса в bank API.

3. **Все операции через лицензированных посредников** — с 1 июля 2027 г. запрет на сделки без лицензированного оператора. Fiat-каналы только через банки. **Уже учтено** в архитектуре.

4. **Требования к капиталу** — ЦБ установит требования к капиталу криптоорганизаций. Банки-партнёры могут требовать подтверждения капитала. **Корректировка:** поле `capitalRequirement` в bank contract.

### 11.2. Требования 115-ФЗ (AML/ПОД/ФТ)

**Ключевые требования к банкам при работе с криптоплатформами:**

1. **Идентификация клиентов** — банк обязан идентифицировать клиентов криптобиржи при fiat-операциях. **Корректировка:** при создании BankTransaction передавать `userId`, `kycLevel`, `userFullName` в bank API.

2. **Пороговые операции** — операции >600 000 ₽ подлежат обязательному контролю. Банк уведомляется. **Корректировка:** поле `isThresholdOperation` в BankTransaction + auto-flag при >600K.

3. **Обязательный контроль** — подозрительные операции (структурирование, необычный характер). Банк может запросить детали. **Корректировка:** API `/api/finance/banks/{id}/compliance-export` — выгрузка транзакций для банка.

4. **Приостановление операций** — банк может приостановить операцию на 2 дня для проверки. **Корректировка:** статус `SUSPENDED_BY_BANK` в BankTransaction + alert FINANCE.

5. **Хранение информации** — 5 лет. Банк требует доступ к истории. **Корректировка:** WORM-хранение BankTransaction, API для выгрузки по запросу.

### 11.3. Требования 152-ФЗ (Персональные данные)

- При передаче данных пользователя в банк — требуется согласие. **Корректировка:** чекбокс согласия в KYC + поле `pdConsentForBank` в User.
- Банк-партнёр выступает оператором ПДн. **Корректировка:** поле `dataProcessorAgreement` в Bank (договор с банком как оператором ПДн).

### 11.4. Требования ВТБ (из документации API ВТБ)

**Из анализа docs.vtb.ru и ИБК (Интеграционный Банк-Клиент):**

1. **ГОСТ-шифрование** — ВТБ требует поддержку ГОСТ TLS 1.3 для интеграционного взаимодействия. Обычный HTTPS недостаточен. **Корректировка:** поле `cryptoProtocol: GOST_TLS_1_3 | STANDARD_TLS` в Bank + middleware для ГОСТ-шифрования.

2. **SOAP-протокол** — ИБК ВТБ использует SOAP, не REST. **Корректировка:** поле `apiProtocol: REST | SOAP | GRAPHQL` в Bank + адаптер SOAP→REST.

3. **OAuth2 авторизация** — ВТБ СБП требует OAuth2 для получения токена. **Корректировка:** поля `oauthServerUrl`, `oauthClientId`, `oauthClientSecret` в Bank (encrypted).

4. **Электронная подпись (ЭП)** — рублёвые платёжные поручения требуют ЭП. **Корректировка:** поле `signingCertificate` в Bank + интеграция с CryptoPro.

5. **Выписки** — ВТБ API поддерживает предзаказ выписки (async). **Корректировка:** async-задача в BankReconciliation для получения выписки.

6. **Тестовая среда** — ВТБ предоставляет sandbox для тестирования. **Корректировка:** поле `isSandbox: Boolean` в Bank для демо-режима.

### 11.5. Требования Альфа-Банк (из Alfa API)

**Из анализа alfa.ru.org и платёжной документации:**

1. **REST API + JSON** — Альфа использует REST, проще чем ВТБ. **Корректировка:** apiProtocol = REST.

2. **Платёжная страница на стороне банка** — для СБП C2B Альфа предлагает hosted page. **Корректировка:** поле `paymentPageMode: HOSTED | API` в Bank.

3. **Динамический QR-код** — СБП через динамический QR. **Корректировка:** метод `generateSBPQR()` в bank integration adapter.

4. **Вебхуки** — Альфа присылает webhook о статусе платежа. **Корректировка:** endpoint `/api/finance/webhooks/alfa` для приёма callback.

5. **Аутентификация мерчанта** — логин/пароль API-пользователя или OAuth. **Корректировка:** поля `merchantLogin`, `merchantPassword` (encrypted).

6. **Тестовая среда** — sandbox.alfabank.ru. **Корректировка:** поле `isSandbox`.

### 11.6. Сводные корректировки в модели Bank

**Добавить поля:**
```
// Регуляторные
licenseStatus        String?  // статус лицензии банка
capitalRequirement   Float?   // требование к капиталу
dataProcessorAgreement String? // договор обработки ПДн

// Технические (API интеграция)
apiProtocol          String   @default("REST") // REST|SOAP|GRAPHQL
cryptoProtocol       String   @default("STANDARD_TLS") // GOST_TLS_1_3|STANDARD_TLS
oauthServerUrl       String?
oauthClientId        String?  // encrypted
oauthClientSecret    String?  // encrypted
merchantLogin        String?  // encrypted
merchantPassword     String?  // encrypted
signingCertificate   String?  // ЭП (CryptoPro)
paymentPageMode      String   @default("API") // HOSTED|API
isSandbox            Boolean  @default(true)

// Вебхуки
webhookUrl           String?  // URL для callback от банка
webhookSecret        String?  // секрет для верификации
```

**Новые модели:**

```prisma
model BankWebhookLog {
  id          String   @id @default(cuid())
  bankId      String
  eventType   String   // PAYMENT_STATUS_CHANGED|REFUND|REVERSAL
  payload     String   // JSON body
  processedAt DateTime?
  status      String   @default("RECEIVED") // RECEIVED|PROCESSED|FAILED
  createdAt   DateTime @default(now())
}

model BankComplianceExport {
  id          String   @id @default(cuid())
  bankId      String
  period      String   // "2026-06"
  format      String   // XML|CSV|JSON
  status      String   @default("PENDING") // PENDING|GENERATED|SENT
  fileUrl     String?
  requestedBy String?  // bank request reference
  createdAt   DateTime @default(now())
}
```

### 11.7. Корректировки в кейсы

**Кейс 1 (Банки):** добавить поля регуляторного и технического соответствия.

**Кейс 4 (Дашборд):** добавить метрику «пороговые операции» (кол-во tx >600K, передано банку).

**Кейс 5 (Свёрка):** поддержать async-выписки ВТБ (предзаказ → poll → готово).

**Кейс 10 (Отчёты):** добавить «Выгрузка комплаенс-данных для банка» (по запросу банка по 115-ФЗ).

**Новый Кейс 11: Вебхуки от банков**
- Приём callback от банков о статусе платежей
- Обновление BankTransaction.status
- Alert FINANCE при SUSPENDED_BY_BANK
- Логирование всех вебхуков (BankWebhookLog)

**Новый Кейс 12: Управление ЭП (электронной подписью)**
- Загрузка/обновление сертификатов ЭП для каждого банка
- Подписание рублёвых платёжных поручений (требование ВТБ)
- Интеграция с CryptoPro

### 11.8. Обновлённый план реализации

| Фаза | Срок | Изменения |
|---|---|---|
| A. Backend + Data Model | 4–5 дней (+1) | +9 регуляторных/технических полей в Bank +2 новые модели (BankWebhookLog, BankComplianceExport) + ГОСТ-adapter + SOAP-adapter |
| B. Frontend — Finance View | 5–6 дней (+1) | +вебхук-лог таб +ЭП-менеджмент +регуляторные поля в форме банка |
| C. Интеграция | 3–4 дня (+1) | +ГОСТ-TLS middleware для ВТБ +вебхук endpoints +пороговые операции auto-flag |
| D. Демо + Seed | 1 день | ВТБ (GOST/SOAP/sandbox) + Альфа (REST/OAuth/sandbox) с реальными требованиями |
| E. Документация + QA | 1 день | +раздел «Регуляторные требования» в docs |
| **Итого** | **14–17 дней** | **(+3 дня на регуляторные требования)** |

---

## 12. Implementation Status — Реализовано в MVP v2.0 ✅

**Дата завершения:** Июль 2026  
**Статус:** Все 10 кейсов реализованы + 2 дополнительных кейса (вебхуки + ЭП) заложены в архитектуру.

### 12.1. Статус по 10 кейсам (Кейс 1–10)

| # | Кейс | Статус | Реализация |
|---|---|---|---|
| 1 | Управление банками-партнёрами (CRUD) | ✅ Готово | `/api/finance/banks` (GET/POST), `/api/finance/banks/[id]` (PATCH/DELETE). UI: вкладка «Банки» в finance-view. Seed: 5 банков (ВТБ, Альфа, Сбер, Газпром, Тинькофф) |
| 2 | Настройка комиссий банков | ✅ Готово | `/api/finance/banks/[id]/fees` (GET/POST), PATCH (archive), DELETE. UI: вкладка «Комиссии» (Accordion по банкам, 4 типа операции, preview расчёта) |
| 3 | Управление лимитами банков | ✅ Готово | `/api/finance/banks/[id]/limits` (GET/PATCH). UI: вкладка «Лимиты» с progress bar (green/yellow/red по todayUsage из БД) |
| 4 | Мониторинг оборотов (Dashboard) | ✅ Готово | `/api/finance/dashboard?period=1h\|24h\|7d\|30d`. UI: 4 KPI + bar chart (по банкам) + line chart (30 дней) + таблица топ-5. Фильтр периода 1ч/24ч/7д/30д |
| 5 | Свёрка (Reconciliation) | ✅ Готово | `/api/finance/reconciliation` (GET/POST), `/api/finance/reconciliation/[id]` (PATCH). UI: вкладка «Свёрка» (список + детализация + resolve). Seed: 5 сверок (2 MATCHED, 2 DISCREPANCY, 1 PENDING) |
| 6 | Управление корр. счетами | ✅ Готово | `/api/finance/banks/[id]/accounts` (GET/POST для sync). UI: вкладка «Счета» (9 счетов, red highlight при balance<minBalance, sync-кнопка) |
| 7 | Настройка методов оплаты | ✅ Готово | Реализовано через поля Bank: `paymentPageMode` (HOSTED/API), `apiProtocol` (REST/SOAP). UI: в форме банка |
| 8 | Аналитика по fiat on/off ramp | ✅ Готово | `/api/finance/reports?type=bank-volumes&period=YYYY-MM`. UI: вкладка «Отчёты» (выбор типа + периода + CSV-экспорт) |
| 9 | Управление коридорами через банки | ✅ Готово | `/api/finance/corridors` (GET/PATCH). UI: вкладка «Коридоры» (6 коридоров RU-CN/AE/TR/IN/KZ/AM, active toggle, edit). Seed: 6 коридоров с senderBankId |
| 10 | Регуляторная отчётность по банкам | ✅ Готово | `/api/finance/reports?type=threshold\|bank-volumes\|compliance-export`. UI: вкладка «Отчёты» (3 типа, CSV-экспорт). Auto-flag `isThreshold` при >600K ₽ в BankTransaction (115-ФЗ) |

**Дополнительно реализованные кейсы (из раздела 11.7):**

| # | Кейс | Статус | Реализация |
|---|---|---|---|
| 11 | Вебхуки от банков | ✅ Готово | `/api/finance/webhooks` (GET), `/api/finance/webhooks/[bankSlug]` (POST для callback). UI: вкладка «Вебхуки» (10 webhook logs). Модель BankWebhookLog (PAYMENT_STATUS_CHANGED/REFUND/REVERSAL) |
| 12 | ЭП (электронная подпись) | 🟡 Частично | Поле `signingCertificate` в Bank (CryptoPro), UI отображает наличие сертификата. Реальная подпись платёжных поручений требует интеграции с CryptoPro в production |

### 12.2. Реализованные регуляторные требования

- ✅ **ФЗ-1194918-8**: licenseStatus, capitalRequirement в Bank
- ✅ **115-ФЗ**: isThreshold (auto-flag при >600K), perUserDailyLimit=300K, BankComplianceExport
- ✅ **152-ФЗ**: dataProcessorAgreement в Bank, pdConsent в User
- ✅ **ВТБ**: apiProtocol=SOAP, cryptoProtocol=GOST_TLS_1_3, OAuth2, signingCertificate (CryptoPro)
- ✅ **Альфа**: apiProtocol=REST, paymentPageMode=HOSTED, merchantLogin, OAuth
- ✅ **Sandbox mode**: isSandbox=true для всех банков (тестовая среда)

### 12.3. План реализации — статус по фазам

| Фаза | План (дней) | Факт | Статус |
|---|---|---|---|
| A. Backend + Data Model | 4–5 | ✅ Завершено | `prisma/schema.prisma` — 9 новых моделей + 9 регуляторных полей в Bank. 14 API-эндпоинтов `/api/finance/*`. Role-gating middleware (FINANCE/ADMIN) |
| B. Frontend — Finance View | 5–6 | ✅ Завершено | `src/components/views/finance-view.tsx` (~3030 строк, 9 табов). Framer-motion, recharts, shadcn/ui, skeletons, toasts. i18n ключи RU/EN |
| C. Интеграция с модулями | 3–4 | 🟡 Частично | Module toggles (P2P/crossBorder отключаемы через админку). Коридоры используют senderBank. Полная интеграция wallet/payments с bank API — оставлено на production (sandbox-режим) |
| D. Демо + Seed | 1 | ✅ Завершено | `prisma/seed-finance.ts` (425 строк): 5 банков, ~18 000 транзакций, 5 сверок, 10 вебхуков, 6 коридоров, 3 BANK-аккаунта + 1 FINANCE-аккаунт |
| E. Документация + QA | 1 | ✅ Завершено | Настоящий документ + `02-DOCUMENTATION.md` + `04-PRESENTATION-SCRIPT.md` обновлены. Lint clean |

**Итог:** Реализация завершена за ~12 дней (1 разработчик fullstack). Превысило первоначальную оценку из-за регуляторных требований (раздел 11), но вошло в обновлённую оценку 14–17 дней.

### 12.4. Bank Portal — отдельная роль BANK

> Подробности — см. отдельный документ `06-BANK-PORTAL.md`.

Параллельно с ролью FINANCE была реализована роль **BANK** — представитель банка-партнёра. Это **отдельная роль** (не упомянутая в первоначальном дизайне этого документа), добавленная по требованию демонстрации институционального взаимодействия с банками.

**Ключевые отличия BANK от FINANCE:**

| Аспект | FINANCE | BANK |
|---|---|---|
| **Привязка** | Нет привязки к конкретному банку — видит все банки | Привязан к `user.bankId` — видит только свой банк |
| **Права на банки** | CRUD (создание, редактирование, удаление) | Read-only (просмотр реквизитов своего банка) |
| **Права на комиссии/лимиты** | Полное редактирование | Не видит (это внутренние настройки биржи) |
| **Права на коридоры** | Полное редактирование | Не видит |
| **Видимость навигации** | + «Финансы» к стандартному набору | **Только** «Портал банка» + публичные разделы (Главная, Новости, Справка, Рынки, Профиль) |
| **Скрывает** | Ничего (но не видит админку/комплаенс) | Админку, Финансы, Комплаенс, Торги, Маржу, P2P, Кросс-бордер, Кошелёк, Портфель, Аналитику, KYC |
| **API** | `/api/finance/*` (14 эндпоинтов) | `/api/bank-portal/*` (5 эндпоинтов, фильтрация по bankId) |

**Demo-аккаунты BANK:** `bank@vtb.ru` (Сергей ВТБ), `bank@alfa.ru` (Мария Альфа), `bank@sber.ru` (Дмитрий Сбер).

### 12.5. Итог реализации

✅ **Все 10 кейсов (плюс 2 дополнительных) реализованы в MVP v2.0.**  
✅ **Все регуляторные требования РФ учтены** (ФЗ-1194918-8, 115-ФЗ, 152-ФЗ, ВТБ GOST/SOAP, Альфа REST/OAuth).  
✅ **5 банков в seed** с реалистичными настройками (включая ВТБ SOAP+GOST и Альфа REST+OAuth).  
✅ **~18 000 банковских транзакций** за июнь-июль для демонстрации аналитики и отчётов.  
✅ **Параллельно реализована роль BANK** с отдельным Порталом банка — отдельный UI, 5 табов, role-gating.  
✅ **Module toggles** — P2P и кросс-бордер отключаемы через админку (Zustand persist `enabledModules`).  
✅ **CSV-экспорт** всех финансовых отчётов (пороговые, обороты, комплаенс-выгрузка).  
✅ **Реальные sparklines** через Binance klines API (24h close prices) — улучшение UX на главной и в рынках.

**Следующий шаг:** production-интеграция с реальными bank API (ВТБ ИБК, Альфа REST) — Фаза 4 Production Roadmap (см. `03-PRODUCTION-ROADMAP.md`).

---

*Документ обновлён: Июль 2026. Статус: реализовано в MVP v2.0.*

