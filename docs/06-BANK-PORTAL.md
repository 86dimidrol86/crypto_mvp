# 🏦 Портал банка — Роль BANK

**Версия:** 1.0 (MVP v2.0)  
**Дата:** Июль 2026  
**Статус:** Реализовано в MVP v2.0 — отдельный UI для представителей банков-партнёров

---

## Содержание

1. [Обзор](#1-обзор)
2. [Role-gating и доступ](#2-role-gating-и-доступ)
3. [Демо-аккаунты (3 банка)](#3-демо-аккаунты-3-банка)
4. [5 табов портала](#4-5-табов-портала)
5. [API-эндпоинты (5)](#5-api-эндпоинты-5)
6. [Регуляторные возможности](#6-регуляторные-возможности)
7. [Отличия от роли FINANCE](#7-отличия-от-роли-finance)
8. [Демо-сценарий](#8-демо-сценарий)

---

## 1. Обзор

**Портал банка** — отдельный UI-раздел (`bank-portal`) для пользователей с ролью **BANK**. Это представители банков-партнёров биржи (ВТБ, Альфа-Банк, Сбербанк), которые получают доступ к данным **только по своему банку**.

**Назначение:**
- Дать банкам-партнёрам visibility по операциям биржи через их банк
- Обеспечить self-service доступ к сверкам и пороговым отчётам (115-ФЗ)
- Разгрузить FINANCE-команду от рутинных запросов от банков
- Соблюсти принцип разделения обязанностей (SoD): банк не может изменять настройки — только FINANCE/ADMIN

**Локация в коде:**
- Фронтенд: `src/components/views/bank-portal-view.tsx`
- API: `src/app/api/bank-portal/{dashboard,transactions,settings,reconciliation,reports}/route.ts`
- Роль добавлена в `User.role` enum: `USER | COMPLIANCE | ADMIN | FINANCE | BANK`
- `User.bankId` — FK на Bank, привязка пользователя-представителя к конкретному банку

---

## 2. Role-gating и доступ

### Что видит роль BANK в навигации

Только следующие разделы:
- 🏠 **Главная** (`home`)
- 📰 **Новости** (`news`)
- ❓ **Справка** (`help`)
- 📊 **Рынки** (`markets`)
- 🏦 **Портал банка** (`bank-portal`) — основной раздел
- 👤 **Профиль** (`profile`)
- 🚪 **Вход** (`auth`)

### Что **скрыто** от роли BANK

- ❌ Торги (`trade`)
- ❌ Маржинальная торговля (`margin`)
- ❌ P2P-торговля (`p2p`)
- ❌ Кросс-бордер платежи (`payments`)
- ❌ Кошелёк (`wallet`)
- ❌ Портфель (`portfolio`)
- ❌ Аналитика (`analytics`)
- ❌ Верификация KYC (`kyc`)
- ❌ Комплаенс (`compliance`)
- ❌ Админка (`admin`)
- ❌ Финансы (`finance`) — даже если бы FINANCE-роль была включена

### Реализация role-gating

В `src/app/page.tsx`, функция `SidebarContent`:

```typescript
const isBank = userRole === 'BANK'
// ...
const visibleNav = NAV.filter(
  (n) =>
    (n.id !== 'admin' || isAdmin) &&
    (n.id !== 'finance' || isFinance) &&
    (n.id !== 'compliance' || isAdmin) &&
    (n.id !== 'bank-portal' || isBank) &&
    (n.id !== 'p2p' || enabledModules.p2p) &&
    (n.id !== 'payments' || enabledModules.crossBorder) &&
    // BANK role doesn't see admin/finance/compliance even if somehow allowed above
    (!isBank || !['admin', 'finance', 'compliance'].includes(n.id))
)
```

Дополнительно: каждый `/api/bank-portal/*`-эндпоинт проверяет `user.role === 'BANK'` и фильтрует данные по `user.bankId` (на стороне API).

---

## 3. Демо-аккаунты (3 банка)

Создаются скриптом `prisma/seed-finance.ts`:

| Email | Имя | Банк | Код | KYC |
|---|---|---|---|---|
| `bank@vtb.ru` | Сергей ВТБ | ВТБ | RU-VTB01 | L2 (ACTIVE) |
| `bank@alfa.ru` | Мария Альфа | Альфа-Банк | RU-ALFA1 | L2 (ACTIVE) |
| `bank@sber.ru` | Дмитрий Сбер | Сбербанк | RU-SBER1 | L2 (ACTIVE) |

**Пароль:** любой (демо-режим, mock-аутентификация через `/api/auth`).

**Особенность:** каждый пользователь имеет `bankId` — FK на конкретный банк. API автоматически фильтрует все данные по этому `bankId`, поэтому:
- `bank@vtb.ru` видит только транзакции ВТБ
- `bank@alfa.ru` видит только транзакции Альфа-Банк
- `bank@sber.ru` видит только транзакции Сбербанк

---

## 4. 5 табов портала

Реализованы в `src/components/views/bank-portal-view.tsx` (~600+ строк). Используются: `Tabs`, `TabsList`, `TabsTrigger`, `TabsContent` из shadcn/ui.

### 4.1. Дашборд (`dashboard`)

**API:** `GET /api/bank-portal/dashboard?period=1h|24h|7d|30d`

**Что показывает:**
- KPI по своему банку за выбранный период:
  - Оборот (₽) — сумма транзакций
  - Количество транзакций
  - Средний чек
  - Комиссии собраны (доход биржи)
  - Пороговые операции (>600K ₽ — 115-ФЗ)
- Графики динамики (line chart по дням)
- Фильтр периода: 1ч / 24ч / 7д / 30д (переключатель сверху)

### 4.2. Транзакции (`transactions`)

**API:** `GET /api/bank-portal/transactions?type=...&status=...&threshold=...`

**Что показывает:**
- Реестр банковских транзакций по своему банку (фильтр по `user.bankId`):
  - bankReference (ID транзакции в банке)
  - Тип: DEPOSIT / WITHDRAW / CROSS_BORDER / SBP
  - Сумма (₽) + комиссия
  - feePayer (USER / EXCHANGE)
  - Статус: COMPLETED / PENDING / FAILED / SUSPENDED_BY_BANK
  - isThreshold (>600K ₽) — подсвечивается отдельно (115-ФЗ)
  - Дата/время
- **Фильтры:**
  - По типу операции
  - По статусу (включая SUSPENDED_BY_BANK — банк приостановил)
  - Только пороговые (checkbox)
- **Поиск** по bankReference
- Пагинация / virtual scroll для больших объёмов

### 4.3. Настройки (`settings`) — **Read-only**

**API:** `GET /api/bank-portal/settings`

**Что показывает:**
- Реквизиты своего банка (read-only, без возможности редактирования):
  - Название, БИК, SWIFT, ИНН, корр. счёт
  - Тип (FIAT_DEPOSIT / FIAT_WITHDRAW / CROSS_BORDER / SBP)
  - Статус (ACTIVE / SUSPENDED / INACTIVE)
  - Контактные данные (contactPerson, contactPhone, contactEmail)
  - apiEndpoint, apiProtocol (REST/SOAP), cryptoProtocol (GOST_TLS_1_3/STANDARD_TLS)
  - paymentPageMode (HOSTED/API)
  - webhookUrl, webhookSecret (последний — частично замаскирован)
  - isSandbox (boolean)
  - licenseStatus, capitalRequirement, dataProcessorAgreement
  - signingCertificate (CryptoPro) — наличие

**Принцип SoD:** изменения реквизитов банка делает только FINANCE/ADMIN через `/api/finance/banks/[id]`. Представитель банка видит свою конфигурацию, но не может её изменить.

### 4.4. Свёрка (`reconciliation`)

**API:** `GET /api/bank-portal/reconciliation`

**Что показывает:**
- Список сверок по своему банку (read-only):
  - Период (например, «2026-06»)
  - Статус: MATCHED / DISCREPANCY / PENDING / IN_PROGRESS
  - Кол-во транзакций: matchedCount / totalTransactions
  - unmatchedInternal / unmatchedBank
  - discrepancyAmount (₽)
  - resolvedBy / resolvedAt
- Детализация по конкретной сверке:
  - Полная статистика
  - Возможность **комментировать** расхождения (от лица банка)
  - Запросить разъяснения у FINANCE-команды биржи

**Принцип:** банк является второй стороной сверки, может подтверждать или оспаривать расхождения. Разрешение расхождений делает FINANCE через `/api/finance/reconciliation/[id]`.

### 4.5. Отчёты (`reports`)

**API:** `GET /api/bank-portal/reports?type=threshold|volumes&period=YYYY-MM`

**Что показывает:**
- 2 типа отчётов (по своему банку):
  1. **Пороговые операции** (>600K ₽ — 115-ФЗ): список транзакций с bankReference, суммой, типом, статусом, пользователем
  2. **Оборот по типам операций**: DEPOSIT/WITHDRAW/CROSS_BORDER/SBP — суммы и количество
- Фильтр по месяцу (YYYY-MM)
- **CSV-экспорт** (Blob + download)
- Запрос **комплаенс-выгрузки** (если требуется по запросу Росфинмониторинга) — создаёт запрос в BankComplianceExport

---

## 5. API-эндпоинты (5)

Все эндпоинты:
- Требуют `user.role === 'BANK'` (проверка в каждом route.ts)
- Фильтруют данные по `user.bankId` (из сессии/запроса)
- Возвращают 403 Forbidden при попытке доступа к чужому банку

| Метод | Путь | Назначение |
|---|---|---|
| GET | `/api/bank-portal/dashboard?period=1h\|24h\|7d\|30d` | KPI дашборда по своему банку |
| GET | `/api/bank-portal/transactions?type=...&status=...&threshold=...&q=...` | Реестр транзакций своего банка |
| GET | `/api/bank-portal/settings` | Реквизиты своего банка (read-only) |
| GET | `/api/bank-portal/reconciliation` | Сверки по своему банку (read-only) |
| GET | `/api/bank-portal/reports?type=threshold\|volumes&period=YYYY-MM` | Пороговые/оборотные отчёты (CSV) |

**Локация:** `src/app/api/bank-portal/{dashboard,transactions,settings,reconciliation,reports}/route.ts`

---

## 6. Регуляторные возможности

### 6.1. ФЗ-115 (AML/ПОД/ФТ)

- ✅ Видимость пороговых операций (>600K ₽) — `isThreshold` flag
- ✅ Фильтр «только пороговые» в реестре транзакций
- ✅ Отдельный отчёт по пороговым операциям за период
- ✅ Видимость `SUSPENDED_BY_BANK` статуса (банк приостановил операцию для проверки)
- ✅ Запрос комплаенс-выгрузки (BankComplianceExport) — если Росфинмониторинг требует детали

### 6.2. ФЗ-152 (Персональные данные)

- ✅ Банк видит только необходимые данные (bankReference, суммы, типы) — не видит полные данные пользователя (кроме ID и базовой идентификации)
- ✅ `dataProcessorAgreement` в реквизитах банка — подтверждение договора обработки ПДн

### 6.3. ФЗ-1194918-8 (Цифровая валюта)

- ✅ `licenseStatus` банка — статус лицензии
- ✅ `capitalRequirement` — подтверждение требований к капиталу
- ✅ Соответствие bank API требованиям: ВТБ (GOST TLS + SOAP), Альфа (REST + OAuth)

### 6.4. Принцип разделения обязанностей (SoD)

- ✅ Банк может **просматривать** свои данные (read-only)
- ❌ Банк не может **изменять** настройки своего банка — это делает FINANCE/ADMIN
- ❌ Банк не может **создавать** сверки — только FINANCE
- ✅ Банк может **комментировать** расхождения в сверках (но не разрешать их)
- ✅ Банк может **запрашивать** комплаенс-выгрузку (но FINANCE её генерирует и отправляет)

---

## 7. Отличия от роли FINANCE

| Аспект | FINANCE (Финансовый контролёр) | BANK (Представитель банка) |
|---|---|---|
| **Привязка** | Нет привязки — видит все банки | Привязан к `user.bankId` — видит только свой банк |
| **Права на банки** | CRUD (создание, редактирование, удаление) | Read-only (только просмотр своего банка) |
| **Права на комиссии** | Полное редактирование + archive | Не видит (внутренние настройки биржи) |
| **Права на лимиты** | Полное редактирование | Не видит |
| **Права на счета** | Просмотр + sync (mock bank API) | Не видит (это счета биржи в банке, не банка) |
| **Права на свёрку** | Создание + разрешение расхождений | Просмотр + комментарии |
| **Права на коридоры** | Полное редактирование | Не видит |
| **Права на отчёты** | Все типы (threshold + bank-volumes + compliance-export) | Только threshold + volumes по своему банку |
| **Права на вебхуки** | Просмотр логов + приём callback | Не видит |
| **Видимость навигации** | Стандартные разделы + «Финансы» | Только «Портал банка» + публичные (Главная/Новости/Справка/Рынки/Профиль) |
| **API** | `/api/finance/*` (14 эндпоинтов) | `/api/bank-portal/*` (5 эндпоинтов, фильтр по bankId) |
| **Demo-аккаунты** | `finance@ruscrypto.ru` | `bank@vtb.ru`, `bank@alfa.ru`, `bank@sber.ru` |

> Подробности о роли FINANCE — см. `05-FINANCE-ROLE-DESIGN.md`.

---

## 8. Демо-сценарий

**Цель:** показать инвесторам институциональный уровень взаимодействия с банками-партнёрами.

### Шаги:

1. **Войти как `bank@vtb.ru`** (роль BANK)
   - Обратить внимание: в навигации **только** Главная, Новости, Справка, Рынки, Портал банка, Профиль. Никакого доступа к торгам, кошельку, комплаенсу, финансам — строгий role-gating.

2. **Портал банка → Дашборд**
   - KPI по ВТБ: оборот 12+ млн ₽ за день, ~80 транзакций, 3 пороговых >600K ₽
   - График динамики за 30 дней
   - Фильтр периода 1ч/24ч/7д/30д — переключить на «7д»

3. **Портал банка → Транзакции**
   - Реестр транзакций ВТБ
   - Фильтр «только пороговые» → видно только >600K ₽ (115-ФЗ)
   - Фильтр по статусу → показать SUSPENDED_BY_BANK (банк приостановил)

4. **Портал банка → Настройки** (read-only)
   - Видит реквизиты ВТБ: БИК, SWIFT, apiEndpoint, apiProtocol=SOAP, cryptoProtocol=GOST_TLS_1_3
   - Кнопки «Изменить» отсутствуют — это делает FINANCE/ADMIN с нашей стороны

5. **Портал банка → Свёрка**
   - Видит сверки по ВТБ за июнь-июль
   - Статус DISCREPANCY — есть расхождения, банк может прокомментировать
   - Кнопки «Создать сверку» нет — это делает FINANCE

6. **Портал банка → Отчёты**
   - Сформировать отчёт «Пороговые операции за 2026-06» → список транзакций >600K ₽
   - Экспорт CSV → скачать для отчёта в Росфинмониторинг

7. (Опционально) **Войти как `bank@alfa.ru`** → показать, что данные Альфа-Банк отличаются (REST/OAuth, другой объём)

### Ключевой месседж для инвесторов

> «Биржа предоставляет банкам-партнёрам **отдельный портал** с доступом только к их данным. Банк видит свои транзакции, сверки, может формировать регуляторные отчёты — но **не может** изменять настройки биржи. Это институциональный уровень разделения обязанностей (SoD), требуемый 115-ФЗ и согласованный с регулятором.»

---

## Технические детали

### Схема БД (relevant fields)

```prisma
model User {
  // ...
  role   String  @default("USER") // USER|COMPLIANCE|ADMIN|FINANCE|BANK
  bankId String? // для роли BANK — привязка к конкретному банку
  bank   Bank?   @relation(fields: [bankId], references: [id])
  // ...
}

model Bank {
  id          String   @id @default(cuid())
  name        String   // "ВТБ" / "Альфа-Банк" / "Сбербанк"
  bic         String   @unique
  swift       String?
  inn         String?
  // ...регуляторные и технические поля
  apiProtocol    String @default("REST")    // REST|SOAP
  cryptoProtocol String @default("STANDARD_TLS") // GOST_TLS_1_3|STANDARD_TLS
  isSandbox      Boolean @default(true)
  // ...
}
```

### Реализация в коде

| Файл | Назначение |
|---|---|
| `src/components/views/bank-portal-view.tsx` | React-компонент с 5 табами |
| `src/app/page.tsx` | NAV + role-gating (функция `SidebarContent`) |
| `src/app/api/bank-portal/dashboard/route.ts` | GET дашборд |
| `src/app/api/bank-portal/transactions/route.ts` | GET реестр транзакций |
| `src/app/api/bank-portal/settings/route.ts` | GET настройки (read-only) |
| `src/app/api/bank-portal/reconciliation/route.ts` | GET сверки (read-only) |
| `src/app/api/bank-portal/reports/route.ts` | GET отчёты (CSV) |
| `prisma/seed-finance.ts` | Создание 3 BANK-аккаунтов (строки 377-422) |

### Связанные документы

- `02-DOCUMENTATION.md` — раздел 4.18 (Портал банка), раздел 6.3 (API), раздел 8 (Безопасность)
- `05-FINANCE-ROLE-DESIGN.md` — раздел 12.4 (Bank Portal — отдельная роль BANK)
- `01-DEPLOYMENT.md` — Шаг 7 (демо-аккаунты), Шаг 4.2 (seed-finance)
- `04-PRESENTATION-SCRIPT.md` — Слайд 11.1 (демонстрация Финансы + Портал банка)

---

*Документ актуален на дату: Июль 2026. Статус: реализовано в MVP v2.0.*
