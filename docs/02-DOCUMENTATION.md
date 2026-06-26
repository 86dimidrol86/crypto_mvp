# 📖 Документация РусКрипто — Криптобиржа РФ

**Версия:** 2.0 (MVP с ролями FINANCE + BANK)  
**Дата:** Июль 2026  
**Статус:** Демонстрационный прототип для инвесторов

> **Что нового в v2.0:** добавлены роли FINANCE (Финансовый контролёр) и BANK (Портал банка), 9 новых моделей Prisma, 14 новых эндпоинтов `/api/finance/*`, 5 новых эндпоинтов `/api/bank-portal/*`, модульные переключатели P2P/Кросс-бордер, реальные sparkline-данные через Binance klines API. Всего: 18 разделов, 5 ролей, 33 API-эндпоинта, 21 модель БД.

---

## Содержание

1. [Обзор платформы](#1-обзор-платформы)
2. [Архитектура системы](#2-архитектура-системы)
3. [Схема базы данных](#3-схема-базы-данных)
4. [Разделы платформы (18 модулей)](#4-разделы-платформы)
5. [Глоссарий терминов](#5-глоссарий-терминов)
6. [API-эндпоинты](#6-api-эндпоинты)
7. [Технологический стек](#7-технологический-стек)
8. [Безопасность и комплаенс](#8-безопасность-и-комплаенс)

---

## 1. Обзор платформы

**РусКрипто** — легальная криптовалютная биржа для российского рынка, соответствующая Федеральному закону № 1194918-8 «О цифровой валюте и цифровых правах» (вступает в силу 1 июля 2026 г.).

### Ключевые особенности
- **Спот-торги** с live order book (WebSocket realtime)
- **Маржинальная торговля** с плечом до 20x и контролем рисков
- **P2P-торговля** с эскроу и чатом (может быть отключена администратором)
- **Кросс-бордер платежи** по 6 коридорам (RU-CN, RU-AE, RU-TR, RU-IN, RU-KZ, RU-AM; может быть отключена)
- **AML-комплаенс-консоль** с SHAP-объяснимостью ML-модели
- **KYC-верификация** через Госуслуги (ЕСИА)
- **ИИ-помощник** для консультаций пользователей (z-ai-web-dev-sdk с fallback)
- **RU/EN локализация** всех разделов (~2200 ключей i18n)
- **Реальные sparklines** через Binance klines API (24h close prices)
- **Финансовый модуль** (роль FINANCE): 9 табов — банки, комиссии, лимиты, счета, свёрка, коридоры, отчёты, вебхуки
- **Портал банка** (роль BANK): 5 табов — дашборд, транзакции, настройки (read-only), свёрка, отчёты
- **Модульные переключатели** в админке (P2P / Кросс-бордер можно включать/отключать)

### Демо-аккаунты (5 ролей)
| Роль | Email | Доступ |
|---|---|---|
| Пользователь (USER) | user@ruscrypto.ru | Стандартные разделы |
| Администратор (ADMIN) | admin@ruscrypto.ru | + операционная панель + управление модулями |
| Комплаенс-офицер (COMPLIANCE) | compliance@ruscrypto.ru | + AML-консоль |
| Финансовый контролёр (FINANCE) | finance@ruscrypto.ru | + раздел «Финансы» (банки, комиссии, свёрка) |
| Банк ВТБ (BANK) | bank@vtb.ru | Только «Портал банка» + публичные разделы |
| Банк Альфа (BANK) | bank@alfa.ru | Только «Портал банка» + публичные разделы |
| Банк Сбер (BANK) | bank@sber.ru | Только «Портал банка» + публичные разделы |

---

## 2. Архитектура системы

### Высокоуровневая схема

```
┌─────────────────────────────────────────────────────────┐
│                    Браузер (клиент)                       │
│  Next.js 16 SPA (single / route, client-side view routing)│
│  18 разделов • 5 ролей • Zustand store (persist)          │
│  i18n RU/EN (~2200 ключей) • enabledModules {p2p,cb}     │
└──────────┬──────────────────────────┬────────────────────┘
           │ HTTP API (REST)            │ WebSocket (socket.io)
           ▼                            ▼
┌─────────────────────┐        ┌─────────────────────┐
│  Next.js API Routes  │        │  Market Service      │
│  (порт 3000)         │        │  (порт 3003)         │
│  33 эндпоинта        │        │  Live order book     │
│  Prisma ORM          │        │  Price ticks         │
│  ┌────────────────┐ │        │  Trades tape         │
│  │ /api/auth,...  │ │        └─────────────────────┘
│  │ /api/finance/* │ │                  ▲
│  │ /api/bank-     │ │                  │ sparkline (24h)
│  │   portal/*     │ │        ┌─────────────────────┐
│  └────────────────┘ │        │  Binance klines API  │
└──────────┬───────────┘        └─────────────────────┘
           │
           ▼
┌─────────────────────┐        ┌─────────────────────┐
│  SQLite (Prisma)     │        │  Внешние API          │
│  21 модель           │        │  Binance (котировки)  │
│  db/custom.db        │        │  ЦБ РФ (USD/RUB)      │
│  ┌─────────────────┐ │        │  z-ai-sdk (LLM)       │
│  │ User+bankId     │ │        │  Bank APIs (ВТБ SOAP, │
│  │ Bank* (9 мод.)  │ │        │  Альфа REST — sandbox)│
│  └─────────────────┘ │        └─────────────────────┘
└─────────────────────┘
```

### Компоненты

| Компонент | Технология | Порт | Назначение |
|---|---|---|---|
| **Фронтенд (SPA)** | Next.js 16 + React 19 + TypeScript | 3000 | Все 18 разделов, routing, UI, role-gating |
| **API** | Next.js API Routes | 3000 | 33 REST-эндпоинта, Prisma-персистенция |
| **WebSocket сервис** | socket.io (Bun) | 3003 | Realtime order book, prices, trades |
| **База данных** | SQLite + Prisma ORM | — | 21 модель, демо-данные (5 банков, ~18 000 tx) |
| **LLM-сервис** | z-ai-web-dev-sdk | — | ИИ-помощник (/api/help/chat) + fallback на справку |
| **Внешние котировки** | Binance API (ticker + klines) + exchangerate API | — | Live-цены топ-20 криптовалют + sparkline 24h |
| **Bank APIs (sandbox)** | ВТБ (SOAP, GOST TLS), Альфа (REST, OAuth) | — | Интеграционные заглушки для банков-партнёров |

### Паттерны
- **Single-page app** — один маршрут `/` с client-side переключением разделов (Zustand store)
- **Hybrid data** — API (Prisma) + Zustand store (fallback/resilience)
- **Persisted state** — балансы, сделки, настройки, locale, layout, enabledModules сохраняются в localStorage
- **Role-gating (5 ролей)** — разделы «Админка» (ADMIN/COMPLIANCE), «Финансы» (ADMIN/FINANCE), «Портал банка» (BANK) видны только соответствующим ролям; роль BANK дополнительно скрывает admin/finance/compliance
- **Module toggles** — P2P и кросс-бордер можно отключать через админку (admin), состояние в `enabledModules` (Zustand persist)

---

## 3. Схема базы данных

### ER-диаграмма (21 модель)

```
┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│     User      │     │   Balance    │     │  KycDocument │
│───────────────│     │──────────────│     │──────────────│
│ id (PK)       │◄──┐│ id (PK)      │     │ id (PK)      │
│ email (unique)│   ││ userId (FK)  │     │ userId (FK)  │
│ name          │   ├│ asset        │     │ docType      │
│ phone         │   ││ amount       │     │ status       │
│ kycLevel      │   ││ locked       │     │ createdAt    │
│ kycStatus     │   │└──────────────┘     └──────────────┘
│ qualified     │   │
│ role          │   │     ┌──────────────┐     ┌──────────────┐
│ bankId (FK?)  │───┼────►│    Bank       │◄────│ User (BANK)  │
│ referralCode  │   │     │──────────────│     │ role=BANK    │
│ createdAt     │   │     │ id, name, bic│     └──────────────┘
└──────┬───────┘   │     │ swift, inn   │
       │           │     │ type, status │
       │           │     │ apiProtocol  │
       │           │     │ cryptoProt.  │
       │           │     │ isSandbox    │
       │           │     └───┬──┬──┬────┘
       │           │         │  │  │
       │           │     ┌───┘  │  └──┐
       │           │     ▼      ▼     ▼
       │           │  BankFee BankLimit BankAccount
       │           │  BankTransaction BankReconciliation
       │           │  BankWebhookLog BankComplianceExport
       │           │
       │           │     CorridorConfig (RU-CN, RU-AE, ...)
       │           │
       │           │     ┌──────────────┐     ┌──────────────┐
       │           ├─────│    Order     │     │    Trade     │
       │           │     │──────────────│     │──────────────│
       │           │     │ id (PK)      │◄──┐│ id (PK)      │
       │           │     │ userId (FK)  │   ││ orderId (FK) │
       │           │     │ pair/side    │   ││ userId (FK)  │
       │           │     │ type         │   ││ pair/side    │
       │           │     │ price/qty    │   ││ price/qty    │
       │           │     │ status       │   ││ total/fee    │
       │           │     └──────────────┘   │└──────────────┘
       │           │                        │
       │           │     ┌──────────────┐   │
       │           ├─────│ Transaction  │   │
       │           │     │ userId (FK)  │   │
       │           │     │ type/asset   │   │
       │           │     │ amount/status│   │
       │           │     │ address      │   │
       │           │     └──────────────┘   │
       │           │                        │
       │           │     ┌──────────────┐   │
       │           ├─────│  P2POffer    │   │
       │           │     │ userId (FK)  │◄──┐
       │           │     │ type/asset   │   │ ┌──────────────┐
       │           │     │ price/amount │   │ │   P2PDeal    │
       │           │     │ method       │   ├─│ offerId (FK) │
       │           │     └──────────────┘   │ │ buyerId (FK) │
       │           │                        │ │ status       │
       │           │     ┌──────────────┐   │ └──────────────┘
       │           ├─────│CrossBorderPay│   │
       │           │     │ userId (FK)  │   │
       │           │     │ corridor     │   │
       │           │     │ amount       │   │
       │           │     │ fee/rate     │   │
       │           │     │ status (7)   │   │
       │           │     └──────────────┘   │
       │           │                        │
       │           │     ┌──────────────┐   │
       │           ├─────│ComplianceAlert│  │
       │           │     │ userId (FK?) │   │
       │           │     │ type/severity│   │
       │           │     │ riskScore    │   │
       │           │     │ status       │   │
       │           │     └──────────────┘   │
       │           │                        │
       │           │     ┌──────────────┐   │
       │           ├─────│  LoginEvent  │   │
       │           │     │ userId (FK)  │   │
       │           │     │ ip/device    │   │
       │           │     │ success      │   │
       │           │     └──────────────┘   │
       │           │                        │
       │           │     ┌──────────────┐   │
       │           └─────│   Referral   │   │
       │                 │ code         │   │
       │                 │ referrerId   │   │
       │                 │ reward       │   │
       │                 └──────────────┘   │
```

### 3.1. Базовые модели (12)

| Модель | Назначение | Ключевые поля |
|---|---|---|
| **User** | Пользователь платформы | email, role (USER/ADMIN/COMPLIANCE/FINANCE/BANK), kycLevel (0-2), bankId (для BANK), referralCode |
| **Balance** | Баланс пользователя по активам | userId, asset (RUB/USDT/BTC/...), amount, locked |
| **Order** | Торговый ордер | pair, side (buy/sell), type (limit/market), price, quantity, status |
| **Trade** | Исполненная сделка | orderId, pair, side, price, quantity, total, fee |
| **Transaction** | Транзакция (депозит/вывод/торг) | type, asset, amount, status, address |
| **P2POffer** | P2P-объявление | type, asset, price, amount, method (СБП/Тинькофф/...) |
| **P2PDeal** | P2P-сделка между пользователями | offerId, buyerId, status (PENDING/PAID/COMPLETED) |
| **CrossBorderPayment** | Кросс-бордер платёж | corridor, fromCurrency/toCurrency, amount, status (7 стадий) |
| **ComplianceAlert** | AML-алерт | type, severity, riskScore, description, status (OPEN/APPROVED/...) |
| **KycDocument** | KYC-документ | docType, status |
| **LoginEvent** | Запись входа пользователя | ip, device, location, success |
| **Referral** | Реферал | code, referrerId, referredEmail, reward |

### 3.2. Банковские/финансовые модели (9) — NEW в v2.0

| Модель | Назначение | Ключевые поля |
|---|---|---|
| **Bank** | Банк-партнёр | name, bic, swift, type, status, apiProtocol (REST/SOAP), cryptoProtocol (GOST_TLS_1_3/STANDARD_TLS), isSandbox, webhookUrl |
| **BankFee** | Комиссия банка по типу операции | bankId, operationType (DEPOSIT/WITHDRAW/CROSS_BORDER/SBP_TRANSFER), feeType (PERCENT/FIXED/COMBINED), payer (USER/EXCHANGE), tiers |
| **BankLimit** | Лимиты банка (4 типа) | bankId, dailyLimit, monthlyLimit, perTransactionLimit, perUserDailyLimit (115-ФЗ), alertThreshold, autoSuspendOnLimit |
| **BankAccount** | Корр./операционный счёт биржи в банке | bankId, accountNumber, currency, balance, minBalance, type (CORRESPONDENT/OPERATIONAL/RESERVE), lastSyncAt |
| **BankTransaction** | Банковская транзакция | bankId, userId?, type, amount, fee, feePayer, status (COMPLETED/PENDING/FAILED/SUSPENDED_BY_BANK), bankReference, isThreshold (>600K ₽) |
| **BankReconciliation** | Свёрка с банковской выпиской | bankId, period, statementFile, totalTransactions, matchedCount, unmatchedInternal, unmatchedBank, status, discrepancyAmount, resolvedBy |
| **BankWebhookLog** | Лог вебхуков от банков | bankId, eventType (PAYMENT_STATUS_CHANGED/REFUND/REVERSAL), payload, status (RECEIVED/PROCESSED/FAILED) |
| **BankComplianceExport** | Выгрузка комплаенс-данных для банка (по 115-ФЗ) | bankId, period, format (XML/CSV/JSON), status, fileUrl, requestedBy |
| **CorridorConfig** | Настройка кросс-бордер коридора | corridorId (RU-CN), senderBankId, receiverBankId, liquidityBridge, feePercent, etaMin/etaMax, minAmount/maxAmount, active |

> Все 9 моделей реализованы в `prisma/schema.prisma` и заполняются скриптом `prisma/seed-finance.ts`.

---

## 4. Разделы платформы

### 4.1. Главная (`home`)
**Назначение:** Лендинг с обзором платформы для инвесторов.

**Что можно делать:**
- Видеть live-тикер топ-20 криптовалют (Binance API, RUB/USD переключатель)
- Рыночные данные: 8 монет по умолчанию, разворачивается до 20
- Топ роста / Топ падения за 24ч
- Блок «Безопасность активов» (холодное хранение, HSM, страхование)
- Партнёры и регуляторы (Банк России, Росфинмониторинг, ЦФА-Реестр, СБП, Visa, Mastercard, Chainalysis)
- CTA: регистрация, кросс-бордер

### 4.2. Новости (`news`)
**Назначение:** Лента новостей платформы и крипторынка.

**Что можно делать:**
- Читать 15 новостей (категории: Регуляторика, Рынок, Платформа, Партнёрство)
- Фильтровать по категориям со счётчиками
- Поиск по заголовкам/содержанию
- Featured/pinned новость сверху
- Бегущая строка новостей в header

### 4.3. Справка (`help`)
**Назначение:** Справочный центр с документацией.

**Что можно делать:**
- 14 статей по всем разделам (спот, маржа, P2P, кросс-бордер, кошелёк, портфель, аналитика, KYC, комплаенс, рынки, новости, безопасность)
- Каждая статья: определение + пошаговая инструкция + FAQ
- Поиск по статьям
- Фильтр по 11 разделам
- Популярные вопросы (6 Q&A)

### 4.4. Торги (`trade`)
**Назначение:** Спот-торговый терминал.

**Что можно делать:**
- Выбрать пару (8 пар: BTC/RUB, ETH/RUB, BNB/RUB, SOL/RUB, XRP/RUB, ADA/RUB, DOGE/RUB, AVAX/RUB)
- Видеть live order book (12 уровней bids/asks, WebSocket, LIVE-индикатор)
- Depth chart (визуализация глубины рынка)
- Лента последних сделок (realtime)
- Разместить ордер: лимитный/рыночный, покупка/продажа, % от баланса (25/50/75/100)
- Мои сделки: фильтры (Все/Покупки/Продажи, Сегодня/7д/Всё), CSV-экспорт
- **Resizable + rearrangeable** блоки (drag-reorder, resize-делители, persist layout)
- «Сбросить layout» — возврат к значениям по умолчанию

### 4.5. Рынки (`markets`)
**Назначение:** Список всех торговых пар с расширенными функциями.

**Что можно делать:**
- Таблица 20 пар с реальными ценами (Binance), изменениями, объёмами, **реальными sparklines 24h** (Binance klines API — close prices)
- Сортировка по цене/изменению/объёму
- Поиск по символу/названию
- Табы: Все / Фавориты / Рост / Падение
- Избранное (⭐, сохраняется в localStorage)
- **Price alerts** — создание алертов (выше/ниже цены), auto-trigger при пересечении + toast + notification
- Мои алерты: список с статусами (активен/сработал/пауза), переключатель, удаление

### 4.6. Маржинальная торговля (`margin`)
**Назначение:** Торговля с кредитным плечом.

**Что можно делать:**
- Открыть Long/Short позицию с плечом 1-20x
- Маржа (RUB), расчёт: размер позиции = маржа × плечо
- Live PnL (обновление каждые 1.5 сек через WebSocket)
- Цена ликвидации (auto-расчёт с maintenance margin 0.5%)
- **Auto-ликвидация** при margin ratio ≥ 100%
- Account summary: эквити, использованная/доступная маржа, margin level (цветовой индикатор)
- Таблица открытых позиций (12 колонок, live PnL flash)
- История позиций (закрытые/ликвидированные)
- Risk warnings (баннер + формулы)
- **Resizable + rearrangeable** блоки (как в Торги)

### 4.7. P2P-торговля (`p2p`)
**Назначение:** Прямая торговля между пользователями.

**Что можно делать:**
- 24 P2P-объявления (купить/продать USDT за RUB)
- Фильтры: поиск, мин/макс цена, сортировка
- Создать объявление (тип, цена, объём, метод оплаты)
- Принять объявление → создаётся сделка (эскроу)
- Мои сделки: активные/завершённые, статусы (PENDING/PAID/COMPLETED/CANCELLED)
- Чат с контрагентом (плавающий виджет, canned-ответы бота)
- Методы оплаты: СБП, Тинькофф, Сбер, СБП+Тинькофф

### 4.8. Кросс-бордер платежи (`payments`)
**Назначение:** Международные переводы через криптокоридоры.

**Что можно делать:**
- 6 коридоров: RU→CN (CNY), RU→AE (AED), RU→TR (TRY), RU→IN (INR), RU→KZ (KZT), RU→AM (AMD)
- Создать платёж: направление, сумма (RUB), бенефициар, счёт, SWIFT, назначение
- Авто-расчёт: получаете ≈, комиссия, ETA
- **7-шаговый tracker статусов**: INITIATED → CC_PENDING → LIQUIDITY → CONVERTING → SENDING → SETTLED
- Мои платежи: список с вертикальным степпером статусов
- Авто-симуляция прогресса (статусы меняются каждые 3.5 сек)
- Валютный контроль 173-ФЗ (авто-формируемые документы)

### 4.9. Кошелёк (`wallet`)
**Назначение:** Управление активами.

**Что можно делать:**
- 4 таба: Активы / Пополнить / Вывести / История
- Балансы: RUB, USDT, BTC, ETH с ≈RUB и ≈USD оценкой
- **Пополнение**: выбор актива + сети (TRC-20/ERC-20/BEP-20/BTC/СБП), генерация адреса + QR-код, копирование
- **Вывод**: выбор актива, сумма (MAX), адрес, 2FA (mock), whitelist, комиссия сети, предупреждение >100K RUB
- История транзакций (депозиты/выводы/торги) с статусами

### 4.10. Портфель (`portfolio`)
**Назначение:** Управление инвестициями и налогами.

**Что можно делать:**
- Общий баланс (₽ + ≈$) + 24h PnL%
- Аллокация (donut chart по активам)
- Таблица активов (количество, ≈RUB, ≈USD, изменение 24ч, аллокация %)
- **Реальный PnL график** (кривая эквити из сделок + транзакций, backward+forward replay)
- Risk-метрики (диверсификация, крупнейшая позиция, стейблкоины %, крипто-экспозиция)
- **3-НДФЛ налоговый отчёт** — CSV-экспорт (реализованный PnL, комиссии, количество сделок)
- Дисклеймер о расчёте по текущим курсам

### 4.11. Аналитика (`analytics`)
**Назначение:** Метрики платформы (realtime из БД).

**Что можно делать:**
- 4 периода: 1ч / 24ч / 7д / 30д
- 4 KPI: Объём торгов, Активные пользователи, Открытые позиции, Средний PnL
- BTCUSDT live-график (TradingView)
- Распределение торговых пар (donut, реальные данные из сделок)
- Объём торгов по времени (bar chart, hourly buckets из БД)
- Активные пользователи (line chart)
- Топ коридоров кросс-бордер (horizontal bar, реальные объёмы из платежей)
- Banner с реальными счётчиками БД (сделок, пользователей, платежей, комиссий)
- Обновление каждые 15 сек

### 4.12. Верификация (`kyc`)
**Назначение:** KYC-процедура (соответствие ФЗ-1194918-8).

**Что можно делать:**
- 5-шаговый wizard: Телефон (OTP) → Документ (OCR mock) → Селфи (liveness) → Адрес-идентификатор (согласие) → Квалификация
- Госуслуги (ЕСИА) fast-track →跳到 шаг 4
- Квалификационный тест (25 вопросов, для неквалифицированных — лимит 300K RUB/год) ИЛИ подтверждение активов ≥3 млн ₽
- После прохождения: Lv.2 verified, address-identifier (RU-AID-XXXX-XXXX)
- Re-verify кнопка
- Compliance badges: 152-ФЗ, 115-ФЗ, 1194918-8

### 4.13. Комплаенс (`compliance`)
**Назначение:** AML-консоль для комплаенс-офицеров.

**Что можно делать:**
- 4 KPI: открытые алерты, критические, средний risk score, обработано
- Лента алертов (severity stripe, risk %, статус, правило, время)
- Детализация алерта: описание, тип, severity, risk score с progress bar
- **SHAP-объяснение** ML-модели (горизонтальные бары contribution по фичам — для регуляторов)
- Действия: Одобрить / Отклонить / Эскалировать / SAR-отчёт (Росфинмониторинг)
- Карантин (m-of-n: Compliance + Risk Manager)
- 5 типов алертов: STRUCTURING, VELOCITY, SANCTION, THRESHOLD, PATTERN

### 4.14. Профиль (`profile`)
**Назначение:** Личный кабинет пользователя.

**Что можно делать:**
- 6 табов: Обзор / Активы / История / Безопасность / Рефералы / Настройки
- Обзор: баланс, позиции, KYC уровень, последние сделки
- Активы: балансы с ≈RUB/USD
- История: транзакции + сделки
- Безопасность: 2FA, anti-phishing код, whitelist адресов, **login history** (из БД: IP, устройство, гео, успех/ошибка), активные сессии
- Рефералы: персональный код (RU-XXXX), приглашённые, заработано (из БД)
- Настройки: имя, email, уведомления, язык (RU/EN)
- Logout

### 4.15. Админка (`admin`)
**Назначение:** Операционная панель для ADMIN/COMPLIANCE.

**Доступ:** только роль ADMIN или COMPLIANCE (role-gating в NAV).

**Что можно делать:**
- 5 KPI: пользователи, объём 24ч, сделки 24ч, открытые алерты, P2P сделки
- Последние сделки (таблица: pair, side, price, qty, total, user, время)
- Распределение KYC (donut: Lv.0/Lv.1/Lv.2)
- Топ пар по объёму (bar chart)
- Последние пользователи (email, name, KYC, role, время)
- Последние платежи (коридор, сумма, статус, бенефициар)
- Инциденты и алерты (severity, risk, статус, описание)
- **Управление модулями** (NEW): переключатели P2P / Кросс-бордер — отключение скрывает раздел из навигации для всех пользователей; состояние хранится в `enabledModules` (Zustand persist)
- Обновление каждые 20 сек

### 4.16. Вход (`auth`)
**Назначение:** Аутентификация.

**Что можно делать:**
- Вход / Регистрация (email + пароль)
- **7 демо-аккаунтов** (5 ролей × до 3 банков) — быстрый вход:
  - USER (`user@ruscrypto.ru`), ADMIN (`admin@ruscrypto.ru`), COMPLIANCE (`compliance@ruscrypto.ru`)
  - FINANCE (`finance@ruscrypto.ru`)
  - BANK × 3 (`bank@vtb.ru`, `bank@alfa.ru`, `bank@sber.ru`)
- Госуслуги (ЕСИА) — демо-вход
- 152-ФЗ consent
- Если уже залогинен — welcome screen с переходом в профиль

### 4.17. Финансы (`finance`) — NEW в v2.0
**Назначение:** Финансовый контролёр биржи — управление банками-партнёрами, комиссиями, лимитами, сверкой.

**Доступ:** только роль ADMIN или FINANCE (role-gating в NAV).

**9 табов:**

| Таб | Назначение |
|---|---|
| **Дашборд** | 4 KPI (оборот 24ч, комиссии, активных банков, транзакций + thresholdOps badge), bar chart оборота по банкам, line chart 30-дневной динамики, таблица топ-5 банков (объём/комиссии/доля/дневной usage% с progress bar/статус), алерты (limitAlerts + lowBalanceAccounts). Фильтр периода: 1ч / 24ч / 7д / 30д |
| **Банки** | CRUD таблица 5 банков (ВТБ, Альфа, Сбер, Газпром, Тинькофф): name, BIC, type badge, priority, apiProtocol+cryptoProtocol badge (GOST=gold/STANDARD=muted), status. Модальное окно добавления/редактирования со всеми полями (реквизиты + регуляторные + технические: apiProtocol, cryptoProtocol, OAuth, sandbox) |
| **Комиссии** | Accordion по банкам; по 4 типа операции (DEPOSIT/WITHDRAW/CROSS_BORDER/SBP_TRANSFER) — feeType, %, fixed, min/max, payer (USER/EXCHANGE), preview расчёта на 100K ₽. PATCH / DELETE / archive |
| **Лимиты** | Карточка по каждому банку: dailyLimit/monthlyLimit/perTransactionLimit/perUserDailyLimit + progress bar (green<50%/yellow 50-80%/red>80%) + реальный `todayUsage` из БД. alertThreshold, autoSuspendOnLimit. LimitEditDialog |
| **Счета** | Таблица 9 счетов: bank, accountNumber (mono), currency, balance, minBalance, type (CORRESPONDENT/OPERATIONAL/RESERVE), lastSyncAt. Красная строка + AlertCircle если balance<minBalance. Кнопка «Синхр.» → POST /api/finance/banks/[id]/accounts |
| **Свёрка** | Список сверок (bank, period, status MATCHED/DISCREPANCY/PENDING, matched/total, discrepancyAmount). Создать сверку (выбор банка+месяц). Детальная карточка + «Разрешить расхождения» (PATCH /api/finance/reconciliation/[id]) |
| **Коридоры** | Таблица 6 коридоров (RU-CN, RU-AE, RU-TR, RU-IN, RU-KZ, RU-AM): флаг+id, senderBank, liquidityBridge, feePercent, etaMin-etaMax, min-max amount, active toggle (PATCH), edit |
| **Отчёты** | 3 типа отчётов: Пороговые >600K ₽ (115-ФЗ) / Оборот по банкам / Комплаенс-выгрузка. Фильтр по месяцу. Формирование → таблица результатов. **CSV-экспорт** (Blob + download) |
| **Вебхуки** | Таблица 10 webhook logs: bank, eventType badge (PAYMENT_STATUS_CHANGED/SUSPENDED/REFUND), payload (expandable), status (PROCESSED/RECEIVED/FAILED), createdAt. Инфо-нота: «Вебхуки от банков автоматически обновляют статусы транзакций» |

**Реализованный регуляторный функционал:**
- ВТБ: apiProtocol=SOAP, cryptoProtocol=GOST_TLS_1_3, OAuth2, signingCertificate (CryptoPro)
- Альфа: apiProtocol=REST, paymentPageMode=HOSTED, merchantLogin
- Для всех: isSandbox, webhookUrl, webhookSecret, dataProcessorAgreement, licenseStatus, capitalRequirement

### 4.18. Портал банка (`bank-portal`) — NEW в v2.0
**Назначение:** Отдельный портал для представителей банков-партнёров (роль BANK).

**Доступ:** только роль BANK (одновременно скрывает admin/finance/compliance из навигации).

**5 табов:**

| Таб | Назначение |
|---|---|
| **Дашборд** | KPI по банку-партнёру: оборот за день/неделю/месяц, кол-во транзакций, средний чек, комиссии собраны. Графики динамики |
| **Транзакции** | Реестр банковских транзакций по своему банку: фильтр по типу (DEPOSIT/WITHDRAW/CROSS_BORDER/SBP), статусу (COMPLETED/PENDING/FAILED/SUSPENDED_BY_BANK), пороговые >600K ₽ (115-ФЗ) отдельно подсвечены. Поиск по bankReference |
| **Настройки** | **Read-only** просмотр реквизитов своего банка: БИК, SWIFT, ИНН, корр. счёт, контакты, apiEndpoint, apiProtocol/cryptoProtocol, webhookUrl. Изменения невозможны — это делает FINANCE/ADMIN |
| **Свёрка** | Просмотр сверок по своему банку (read-only), статусы (MATCHED/DISCREPANCY/PENDING), детализация. Комментарии банка по расхождениям |
| **Отчёты** | Формирование пороговых отчётов (>600K ₽ — 115-ФЗ), оборот по типам операций. CSV-экспорт. Запрос комплаенс-выгрузки (если требуется по запросу Росфинмониторинга) |

**Особенности роли BANK:**
- В навигации видны **только** разделы: Главная, Новости, Справка, Рынки, **Портал банка**, Профиль, Вход (т.е. `bank-portal` + публичные)
- Не видит: Торги, Маржа, P2P, Кросс-бордер, Кошелёк, Портфель, Аналитику, KYC, Комплаенс, Админку, Финансы
- `user.bankId` привязан к конкретному банку — все данные в портале фильтруются по этому bankId
- 3 демо-аккаунта: `bank@vtb.ru` (ВТБ), `bank@alfa.ru` (Альфа), `bank@sber.ru` (Сбер)

> Подробнее см. отдельный документ `06-BANK-PORTAL.md`.

---

## 5. Глоссарий терминов

### Торговые термины

| Термин | Определение |
|---|---|
| **Спот-торги** | Немедленная покупка/продажа актива по текущей рыночной цене с расчётом T+0 (моментально). |
| **Ордер (Order)** | Заявка на покупку/продажу актива. Бывает лимитный (с указанием цены) и рыночный (по текущей цене). |
| **Order book (стакан)** | Список всех лимитных ордеров на покупку (bids) и продажу (asks) с указанием цены и объёма. |
| **Bid / Ask** | Bid — лучшая цена покупки (максимальная среди покупателей). Ask — лучшая цена продажи (минимальная среди продавцов). |
| **Spread** | Разница между лучшей ценой покупки (bid) и продажи (ask). |
| **Liquidity (ликвидность)** | Способность купить/продать актив без существенного изменения цены. |
| **Market order** | Ордер на покупку/продажу по текущей рыночной цене (исполняется мгновенно). |
| **Limit order** | Ордер с указанием желаемой цены (исполняется при достижении рынком этой цены). |
| **TIF (Time in Force)** | Время жизни ордера: GTC (до отмены), IOC (немедленно или отмена), FOK (полностью или отмена). |
| **Maker / Taker** | Maker — создаёт ликвидность (лимитный ордер). Taker — забирает ликвидность (рыночный ордер). |
| **Depth chart** | Визуализация глубины рынка: cumulative объём bids (зелёный) и asks (красный) по уровням цен. |
| **Sparkline** | Мини-график изменения цены без осей (для быстрого визуального обзора тренда). На РусКрипто заполняется реальными close-prices за 24h через Binance klines API. |

### Маржинальная торговля

| Термин | Определение |
|---|---|
| **Маржинальная торговля** | Торговля с заёмными средствами биржи. Позволяет открыть позицию больше суммы депозита. |
| **Плечо (Leverage)** | Множитель заёмных средств. 10x = позиция в 10 раз больше маржи. На РусКрипто: 1x–20x. |
| **Long (лонг)** | Позиция на повышение: прибыль при росте цены (покупка → продажа дороже). |
| **Short (шорт)** | Позиция на понижение: прибыль при падении цены (продажа → покупка дешевле). |
| **Маржа (Margin)** | Залог, обеспечивающий позицию. initial margin = 1/leverage от размера позиции. |
| **Maintenance margin** | Минимальная маржа для удержания позиции (0.5% на РусКрипто). |
| **Ликвидация** | Принудительное закрытие позиции при падении маржи ниже maintenance level. Маржа утрачивается. |
| **Margin ratio** | Использованная маржа / (маржа + PnL). При ≥100% — auto-ликвидация. |
| **PnL (Profit and Loss)** | Прибыль/убыток по позиции. Unrealized — по открытой, Realized — после закрытия. |
| **Цена ликвидации** | Цена, при которой margin ratio достигает 100%. Long: entry × (1 − 1/leverage + 0.005). Short: entry × (1 + 1/leverage − 0.005). |
| **Margin call** | Предупреждение о приближении к ликвидации (margin ratio > 80%). |

### P2P-торговля

| Термин | Определение |
|---|---|
| **P2P (Peer-to-Peer)** | Прямая торговля между пользователями без посредника-биржи в сделке. |
| **Эскроу (Escrow)** | Биржа замораживает актив продавца до подтверждения оплаты покупателем. |
| **Объявление (Offer)** | Предложение купить/продать актив с указанием цены, объёма, метода оплаты. |
| **Сделка (Deal)** | Конкретная транзакция между двумя пользователями по объявлению. |

### Кросс-бордер платежи

| Термин | Определение |
|---|---|
| **Кросс-бордер платёж** | Международный денежный перевод через криптокоридор (RU→CN, RU→AE и т.д.). Альтернатива SWIFT в условиях санкций. |
| **Коридор (Corridor)** | Пара стран для перевода (например, RU-CN). У каждого коридора свой курс, комиссия, ETA. |
| **Валютный контроль (173-ФЗ)** | Требование ЦБ РФ декларировать переводы >$50K. На РусКрипто формируется паспорт сделки и УФЭД автоматически. |
| **Бенефициар** | Получатель платежа (имя, счёт, SWIFT/BIC банка). |
| **Saga** | Многошаговая транзакция с компенсирующими действиями на каждом шаге. На РусКрипто: 7 шагов (INITIATED → CC_PENDING → LIQUIDITY → CONVERTING → SENDING → SETTLED). |
| **Liquidity bridge** | Партнёрский канал ликвидности для конвертации валют. |
| **УФЭД** | Унифицированный формат электронных документов (валютный контроль ЦБ РФ). |

### Кошелёк и кастодия

| Термин | Определение |
|---|---|
| **Кастодия** | Хранение активов пользователя биржей. Hot/Warm/Cold: 5%/15%/80% (горячие/тёплые/холодные кошельки). |
| **Hot wallet** | Онлайн-кошелёк для быстрого вывода. Держит ~5% активов. |
| **Cold wallet** | Офлайн-хранилище (hardware/HSM). Держит ~80% активов. |
| **HSM (Hardware Security Module)** | Аппаратный модуль для управления ключами. FSTEC-сертифицированный. |
| **Multisig** | Мультиподпись: для вывода нужно m-of-n подписей (например, 3-of-5 для cold wallet). |
| **Whitelist адресов** | Список доверенных адресов вывода (защита от подмены). |
| **2FA (Two-Factor Auth)** | Двухфакторная аутентификация (TOTP, Google Authenticator). |
| **Сеть (Network)** | Блокчейн-сеть для перевода: TRC-20 (Tron), ERC-20 (Ethereum), BEP-20 (BSC), Bitcoin Network. |
| **Confirmations** | Количество подтверждений блокчейна для зачисления депозита (защита от double-spend). |

### Комплаенс и AML

| Термин | Определение |
|---|---|
| **AML (Anti-Money Laundering)** | Противодействие отмыванию денег. Регулируется 115-ФЗ в РФ. |
| **KYC (Know Your Customer)** | Идентификация клиента: документ, selfie, адрес. Уровни: L0 (phone), L1 (doc), L2 (full). |
| **Адрес-идентификатор** | Привязка каждого криптоадреса к верифицированной личности (требование ФЗ-1194918-8). |
| **SAR (Suspicious Activity Report)** | Отчёт о подозрительных операциях в Росфинмониторинг. |
| **SHAP (SHapley Additive exPlanations)** | Метод объяснения ML-модели: показывает вклад каждой фичи в решение. Требуется регулятором для апелляции. |
| **Structuring** | Разделение крупной транзакции на мелкие для обхода порога отчётности (10×95K вместо 950K). |
| **Velocity** | Нетипичная скорость операций (много транзакций за короткое время). |
| **Sanction screening** | Проверка бенефициара по санкционным спискам (Росфинмониторинг, OFAC, EU). |
| **Quarantine** | Заморозка счёта при критическом алерте (требует m-of-n: Compliance + Risk Manager). |
| **WORM (Write Once Read Many)** | Хранение аудита: запись один раз, чтение многократно (невозможность изменения). |

### Регуляторика РФ

| Термин | Определение |
|---|---|
| **ФЗ-1194918-8** | Федеральный закон «О цифровой валюте и цифровых правах» (вступает 01.07.2026). Создаёт легальную основу для криптобирж в РФ. |
| **ФЗ-115** | Закон о противодействии отмыванию (AML). Обязывает идентифицировать клиентов и сообщать о подозрительных операциях. |
| **ФЗ-152** | Закон о персональных данных. Требует согласие на обработку ПДн. |
| **ФЗ-173** | Закон о валютном контроле. Требует декларировать трансграничные переводы. |
| **ЕСИА (Госуслуги)** | Единая система идентификации и аутентификации. Используется для KYC через Госуслуги. |
| **Квалифицированный инвестор** | Статус, дающий расширенный доступ. Неквалифицированные — лимит 300K RUB/год. Тест (25 вопросов) или активы ≥3 млн ₽. |
| **ЦБ РФ** | Банк России — регулятор криптобирж в РФ (выдаёт лицензии). |
| **Росфинмониторинг** | Федеральная служба по финансовому мониторингу (получает SAR-отчёты). |
| **FSTEC** | Федеральная служба по техническому и экспортному контролю (сертификация HSM, ЦОД). |

### Банки и финансы (NEW в v2.0)

| Термин | Определение |
|---|---|
| **Роль BANK** | Специальная роль пользователя-представителя банка-партнёра. Видит только «Портал банка» + публичные разделы. Привязан к `user.bankId`. |
| **Портал банка** | Отдельный UI для роли BANK с 5 табами: Дашборд, Транзакции, Настройки (read-only), Свёрка, Отчёты. Не позволяет изменять реквизиты банка — это делает FINANCE. |
| **Свёрка (Reconciliation)** | Сопоставление банковской выписки с внутренними транзакциями биржи. Статусы: PENDING → IN_PROGRESS → MATCHED / DISCREPANCY. Поля: matchedCount, unmatchedInternal, unmatchedBank, discrepancyAmount. |
| **GOST TLS** | ГОСТ-шифрование TLS 1.3 (Кузнечик/Магма). Требуется ВТБ для интеграционного взаимодействия. Обычный HTTPS недостаточен. Поле `cryptoProtocol: GOST_TLS_1_3` в модели Bank. |
| **SOAP** | Simple Object Access Protocol — XML-протокол для интеграции. ВТБ использует SOAP (ИБК — Интеграционный Банк-Клиент), в отличие от Альфы (REST). Поле `apiProtocol: SOAP` в Bank. |
| **Module toggles** | Переключатели в админке для отключения модулей P2P и Кросс-бордер. Состояние хранится в `enabledModules: { p2p, crossBorder }` (Zustand persist). При отключении модуль исчезает из навигации для всех пользователей. |
| **Threshold operation** | Операция >600 000 ₽ — порог 115-ФЗ для обязательного контроля. Поле `isThreshold` в BankTransaction auto-flag при >600K. |
| **Портал банка: threshold reports** | Отчёт по пороговым операциям за период (>600K ₽), формируется представителем банка (роль BANK) через `/api/bank-portal/reports`. |
| **Webhook банка** | HTTP-callback от банка о статусе платежа (PAYMENT_STATUS_CHANGED, REFUND, REVERSAL). Логируется в BankWebhookLog, обновляет BankTransaction.status. |
| **Банк-корреспондент** | Банк, в котором у биржи открыт корреспондентский счёт для fiat on/off ramp. |
| **Коридор (Corridor)** | Тоже что и в cross-border, но с привязкой к банкам: `CorridorConfig { corridorId, senderBankId, receiverBankId, liquidityBridge, feePercent, etaMin/etaMax }`. |

---

## 6. API-эндпоинты

Всего 33 эндпоинта в 11 группах. Ролевые ограничения: USER (базовые), ADMIN/COMPLIANCE (+ admin/compliance), FINANCE/ADMIN (+ finance), BANK (+ bank-portal).

### 6.1. Базовые эндпоинты (24)

| Метод | Путь | Назначение |
|---|---|---|
| GET | `/api/auth?email=...` | Текущий пользователь |
| POST | `/api/auth` | Вход/регистрация (демо) |
| GET | `/api/market` | Котировки топ-20 криптовалют + sparkline 24h |
| GET | `/api/wallet` | Балансы + транзакции |
| POST | `/api/wallet` | Депозит (адрес) / вывод |
| GET | `/api/orders` | История ордеров/сделок |
| POST | `/api/orders` | Разместить ордер (демо-matching) |
| GET | `/api/p2p` | P2P-офферы + сделки |
| POST | `/api/p2p` | Создать/принять оффер |
| PATCH | `/api/p2p` | Обновить статус сделки |
| GET | `/api/payments` | Коридоры + мои платежи |
| POST | `/api/payments` | Создать кросс-бордер платёж |
| PATCH | `/api/payments` | Обновить статус платежа |
| GET | `/api/compliance` | AML-алерты |
| PATCH | `/api/compliance` | Review алерта (approve/reject/escalate/SAR) |
| GET | `/api/kyc` | Статус KYC |
| POST | `/api/kyc` | Обновить уровень KYC |
| GET | `/api/analytics` | Метрики платформы (из БД) |
| GET | `/api/portfolio/history` | Кривая эквити портфеля |
| GET | `/api/admin/stats` | Агрегированные метрики для админки |
| GET | `/api/profile/login-history` | История входов |
| GET | `/api/profile/referral` | Реферальный код + статистика |
| GET | `/api/profile/sessions` | Активные сессии |
| POST | `/api/help/chat` | ИИ-консультант (z-ai-web-dev-sdk с fallback) |

### 6.2. Финансовый модуль `/api/finance/*` (14) — NEW в v2.0

**Доступ:** только роли FINANCE и ADMIN.

| Метод | Путь | Назначение |
|---|---|---|
| GET | `/api/finance/dashboard?period=1h\|24h\|7d\|30d` | KPI + графики по банкам |
| GET | `/api/finance/banks` | Список банков-партнёров |
| POST | `/api/finance/banks` | Добавить банк |
| PATCH | `/api/finance/banks/{id}` | Редактировать банк |
| DELETE | `/api/finance/banks/{id}` | Деактивировать банк (без удаления) |
| GET | `/api/finance/banks/{id}/fees` | Комиссии банка |
| POST | `/api/finance/banks/{id}/fees` | Настроить комиссию |
| PATCH | `/api/finance/banks/{id}/fees` | Обновить комиссию (архив/archive) |
| GET | `/api/finance/banks/{id}/limits` | Лимиты банка + todayUsage |
| PATCH | `/api/finance/banks/{id}/limits` | Обновить лимиты |
| GET | `/api/finance/banks/{id}/accounts` | Корр. счета банка |
| POST | `/api/finance/banks/{id}/accounts` | Синхронизировать баланс (mock bank API) |
| GET | `/api/finance/reconciliation` | Список сверок |
| POST | `/api/finance/reconciliation` | Создать сверку (загрузить выписку) |
| PATCH | `/api/finance/reconciliation/{id}` | Разрешить расхождения |
| GET | `/api/finance/corridors` | Настройка кросс-бордер коридоров |
| PATCH | `/api/finance/corridors` | Обновить коридор (active toggle) |
| GET | `/api/finance/reports?type=threshold\|bank-volumes\|compliance-export&period=YYYY-MM` | Регуляторные отчёты (CSV) |
| GET | `/api/finance/webhooks` | Лог вебхуков от банков |
| POST | `/api/finance/webhooks/{bankSlug}` | Приём вебхука от банка (callback) |

### 6.3. Портал банка `/api/bank-portal/*` (5) — NEW в v2.0

**Доступ:** только роль BANK (привязанная к конкретному `user.bankId`). Все данные фильтруются по bankId пользователя.

| Метод | Путь | Назначение |
|---|---|---|
| GET | `/api/bank-portal/dashboard?period=1h\|24h\|7d\|30d` | KPI дашборда по своему банку |
| GET | `/api/bank-portal/transactions?type=...&status=...&threshold=...` | Реестр транзакций своего банка |
| GET | `/api/bank-portal/settings` | Реквизиты своего банка (read-only) |
| GET | `/api/bank-portal/reconciliation` | Сверки по своему банку (read-only) |
| GET | `/api/bank-portal/reports?type=threshold\|volumes&period=YYYY-MM` | Пороговые/оборотные отчёты своего банка (CSV) |

---

## 7. Технологический стек

### Фронтенд
- **Next.js 16** (App Router, Turbopack)
- **React 19** + **TypeScript 5**
- **Tailwind CSS 4** + **shadcn/ui** (New York style, 40+ компонентов)
- **Zustand 5** (state management + persist)
- **recharts** (графики)
- **framer-motion** (анимации)
- **react-resizable-panels** + **@dnd-kit** (resizable/draggable блоки)
- **lucide-react** (иконки)
- **sonner** (toasts)
- **next-themes** (dark/light)
- **socket.io-client** (WebSocket)

### Бэкенд
- **Next.js API Routes** (33 эндпоинта в 11 группах)
- **Prisma ORM 6** + **SQLite** (21 модель)
- **z-ai-web-dev-sdk** (LLM для ИИ-помощника, fallback на справку)
- **socket.io** (mini-service на порту 3003 — live order book)
- **ВТБ-адаптер** (SOAP + GOST TLS — sandbox)
- **Альфа-адаптер** (REST + OAuth — sandbox)

### Внешние API
- **Binance API** — live-котировки + **klines (24h close prices)** для sparklines
- **exchangerate-api.com** — курс USD/RUB
- **TradingView** — графики (iframe embed)
- **Bank APIs (sandbox)** — ВТБ (api.vtb.ru/ibk), Альфа (alfa.rbslnk.ru)

### DevOps
- **Bun** (runtime + package manager)
- **ESLint** (linting)
- **Git** (версионирование)

---

## 8. Безопасность и комплаенс

### Реализованные меры (MVP v2.0)
- ✅ KYC 3 уровня (L0/L1/L2) + Госуслуги (ЕСИА)
- ✅ Адрес-идентификаторы (привязка криптоадресов к личности)
- ✅ AML-мониторинг (5 типов алертов, rules-based)
- ✅ SHAP-объяснимость ML-решений (для регулятора)
- ✅ SAR-отчёты в Росфинмониторинг
- ✅ Карантин счетов (m-of-n)
- ✅ Login history + session management
- ✅ 2FA (mock), anti-phishing код, whitelist адресов
- ✅ Квалификационный тест инвестора
- ✅ Валютный контроль 173-ФЗ (авто-документы)
- ✅ RU/EN локализация (~2200 ключей)
- ✅ **5 ролей RBAC** (USER/ADMIN/COMPLIANCE/FINANCE/BANK) с role-gating на фронтенде + API
- ✅ **Module toggles** — P2P и кросс-бордер отключаемы через админку (Zustand persist `enabledModules`)
- ✅ **Bank portal role-gating** — роль BANK видит только `bank-portal` + публичные разделы; автоматически скрывает admin/finance/compliance
- ✅ **Регуляторные поля банков** (licenseStatus, capitalRequirement, dataProcessorAgreement, isSandbox, signingCertificate)
- ✅ **Пороговые операции** (auto-flag при >600K ₽, 115-ФЗ) в BankTransaction
- ✅ **Свёрка с банками** (BankReconciliation: matchedCount/unmatchedInternal/unmatchedBank/discrepancyAmount)
- ✅ **Вебхуки от банков** (BankWebhookLog: PAYMENT_STATUS_CHANGED/REFUND/REVERSAL)
- ✅ **Комплаенс-выгрузка для банков** по запросу (BankComplianceExport, 115-ФЗ)
- ✅ **CSV-экспорт** всех отчётов (пороговые/оборотные/комплаенс)
- ✅ **ВТБ-совместимость** — apiProtocol=SOAP, cryptoProtocol=GOST_TLS_1_3 (sandbox)
- ✅ **Альфа-совместимость** — apiProtocol=REST, paymentPageMode=HOSTED, OAuth (sandbox)

### Требуется для production (см. документ «План перехода в production»)
- 🔲 Реальный matching engine (Rust)
- 🔲 HSM + hot/warm/cold кастодия
- 🔲 GOST 28147-89 шифрование (полное, не только в sandbox-схеме)
- 🔲 mTLS + JWT auth (сейчас mock-аутентификация)
- 🔲 PostgreSQL + Kafka + Redis (сейчас SQLite)
- 🔲 Kubernetes + 2 ЦОД (active-active)
- 🔲 Лицензия ЦБ РФ
- 🔲 Пентесты + аудит безопасности
- 🔲 Реальные bank API интеграции (сейчас sandbox-заглушки для ВТБ/Альфа)
- 🔲 Реальная ЕСИА SAML/OAuth интеграция (сейчас demo-login)

---

*Документ актуален на дату: Июль 2026. Версия MVP 2.0 (5 ролей, 18 разделов, 33 API, 21 модель БД).*
