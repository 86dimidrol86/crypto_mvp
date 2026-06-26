# 📋 CHANGELOG — РусКрипто MVP

**Репозиторий:** https://github.com/86dimidrol86/crypto_mvp  
**Текущая версия:** MVP v2.0 (Июль 2026)  
**Статус:** Демонстрационный прототип для инвесторов

Все заметные изменения проекта документированы здесь. Формат основан на [Keep a Changelog](https://keepachangelog.com/ru/1.1.0/).

---

## [MVP v2.0] — 2026-07-02

### Добавлено

#### Роль BANK + Портал банка
- **Новая роль `BANK`** — представитель банка-партнёра (ВТБ, Альфа, Сбер)
- **`User.bankId`** — FK на Bank, привязка пользователя-представителя к конкретному банку
- **Портал банка** (`bank-portal-view.tsx`) — отдельный UI с 5 табами:
  - Дашборд (KPI по своему банку, фильтр периода 1ч/24ч/7д/30д)
  - Транзакции (реестр с фильтрами по типу/статусу/пороговым, поиск по bankReference)
  - Настройки (read-only — реквизиты своего банка)
  - Свёрка (просмотр + комментарии, без редактирования)
  - Отчёты (пороговые >600K ₽ — 115-ФЗ, оборотные, CSV-экспорт)
- **5 API-эндпоинтов** `/api/bank-portal/*` с фильтрацией по `user.bankId`
- **3 демо-аккаунта BANK**: `bank@vtb.ru` (Сергей ВТБ), `bank@alfa.ru` (Мария Альфа), `bank@sber.ru` (Дмитрий Сбер)
- **Role-gating**: BANK видит только `bank-portal` + публичные разделы; автоматически скрывает admin/finance/compliance/trade/margin/p2p/payments/wallet/portfolio/analytics/kyc

#### Module toggles (управление модулями)
- **Переключатели в админке** для отключения модулей P2P и Кросс-бордер
- Состояние в Zustand persist `enabledModules: { p2p, crossBorder }`
- При отключении модуль исчезает из навигации для всех пользователей
- Реализация в `src/app/page.tsx` (функция `SidebarContent`)

#### Реальные sparklines (24h)
- **Binance klines API** для получения close-prices за 24h
- Заполнение sparkline-виджетов на главной и в рынках реальными данными
- Fallback на статику при недоступности Binance API

#### Демо-аккаунт FINANCE
- **`finance@ruscrypto.ru`** (Дмитрий Финансов) — роль FINANCE
- Кнопка быстрого входа в auth-view

### Изменено

- **`prisma/seed-finance.ts`** — генерация ~18 000 банковских транзакций за июнь-июль (~300 в день, равномерно)
- **`/api/finance/dashboard`** — добавлен параметр `period=1h|24h|7d|30d` для KPI и графиков
- **`/api/finance/banks/[id]/limits`** — добавлен реальный `todayUsage` из БД (а не mock)
- **`/api/finance/reports`** — добавлен тип `compliance-export` для выгрузки комплаенс-данных банку (115-ФЗ)

### Исправлено

- **bank portal Reports tab crash** при переключении threshold↔volumes — исправлен null-state
- **3 бага в Финансах**: compliance-отчёт (CSV columns), комиссии (PATCH + DELETE + archive), лимиты (PATCH)
- **Равномерная генерация транзакций**: upper bound now в API предотвращает перегрузку при больших периодах

---

## [MVP v1.5] — 2026-06-26

### Добавлено

#### Полный модуль «Финансы» (роль FINANCE)
- **Новая роль `FINANCE`** — Финансовый контролёр
- **9 табов** в `finance-view.tsx` (~3030 строк):
  1. **Дашборд** — 4 KPI (оборот/комиссии/банков/транзакций + thresholdOps badge), bar+line charts, таблица топ-5 банков с progress bar дневного usage
  2. **Банки** — CRUD 5 банков (ВТБ, Альфа, Сбер, Газпром, Тинькофф), модальное окно со всеми реквизитами + регуляторные + технические поля
  3. **Комиссии** — Accordion по банкам, 4 типа операции (DEPOSIT/WITHDRAW/CROSS_BORDER/SBP_TRANSFER), feeType, payer, preview расчёта
  4. **Лимиты** — карточка по каждому банку, progress bar (green/yellow/red по todayUsage), LimitEditDialog
  5. **Счета** — 9 счетов (CORRESPONDENT/OPERATIONAL/RESERVE), red highlight при balance<minBalance, sync-кнопка
  6. **Свёрка** — список сверок, статус MATCHED/DISCREPANCY/PENDING, разрешение расхождений
  7. **Коридоры** — 6 коридоров (RU-CN/AE/TR/IN/KZ/AM), senderBank, active toggle
  8. **Отчёты** — 3 типа (threshold/bank-volumes/compliance-export), фильтр месяца, CSV-экспорт
  9. **Вебхуки** — 10 webhook logs, eventType (PAYMENT_STATUS_CHANGED/SUSPENDED/REFUND), status (PROCESSED/RECEIVED/FAILED)
- **14 API-эндпоинтов** `/api/finance/*`
- **`prisma/seed-finance.ts`** — seed 5 банков с реалистичными настройками
- **Демо-аккаунт** `finance@ruscrypto.ru` (Дмитрий Финансов)
- **Role-gating**: FINANCE видит «Финансы» + стандартные разделы, но не админку/комплаенс

#### Регуляторный анализ (банки)
- **9 новых моделей Prisma**: Bank, BankFee, BankLimit, BankAccount, BankTransaction, BankReconciliation, BankWebhookLog, BankComplianceExport, CorridorConfig
- **Регуляторные поля Bank**: licenseStatus, capitalRequirement, dataProcessorAgreement (ФЗ-1194918-8, 152-ФЗ)
- **Технические поля Bank**: apiProtocol (REST/SOAP), cryptoProtocol (GOST_TLS_1_3/STANDARD_TLS), OAuth2, signingCertificate (CryptoPro)
- **ВТБ-совместимость**: apiProtocol=SOAP, cryptoProtocol=GOST_TLS_1_3, OAuth2, signingCertificate
- **Альфа-совместимость**: apiProtocol=REST, paymentPageMode=HOSTED, merchantLogin, OAuth
- **Sandbox mode**: isSandbox=true для всех банков (тестовая среда)
- **Пороговые операции** (115-ФЗ): auto-flag `isThreshold` при >600K ₽ в BankTransaction

### Документация
- **`05-FINANCE-ROLE-DESIGN.md`** — полный дизайн роли FINANCE (10 кейсов + 12 кейсов с регуляторными корректировками + план реализации)
- **`02-DOCUMENTATION.md`** — обновлён: 21 модель БД, роль FINANCE, 9 новых терминов в глоссарии

---

## [MVP v1.4] — 2026-06-25

### Добавлено

#### ИИ-помощник + Справочный центр
- **`/api/help/chat`** — LLM-чатбот через z-ai-web-dev-sdk
- **Fallback-режим** — поиск по справке, если z-ai-config недоступен
- **15 статей справки** (bilingual RU/EN): спот, маржа, P2P, кросс-бордер, кошелёк, портфель, аналитика, KYC, комплаенс, рынки, новости, безопасность, финансы, банк-портал, рефералы
- **`help-view.tsx`** — поиск, 11 разделов, expandable article cards с Definition/How-To/FAQ
- **`help-chat-widget.tsx`** — floating золотая кнопка «?» внизу справа, чат-панель 380×540, suggestion chips, typing indicator, markdown render

#### 8 задач user-batch
- **Full-width** для trade-view и margin-view (убран max-w-[1600px])
- **Compact home market grid** (2 ряда → expand до 5 рядов по 20 монет)
- **Logo в sidebar** (вместо header)
- **Расширенный seed** (`seed-extended.ts`): 29 пользователей, 60 сделок за 30 дней, 8 комплаенс-алертов, 3 кросс-бордер платежа, 18 P2P-офферов, 8 login events, 3 реферала
- **3 демо-аккаунта** с role-gating (USER/ADMIN/COMPLIANCE) — кнопки быстрого входа
- **i18n full EN** — ~500 → ~2200 ключей, все 16 (тогда) разделов переведены, helper-функции принимают `t` как параметр (rules-of-hooks safe)
- **Favicon** — public/favicon.svg (золотой гексагональный щит + ₽ + свечи)
- **Help Center** добавлен в NAV

### Изменено

- **`/api/auth`** — добавлен GET?email= для demo-login, POST принимает любой email
- **`store.ts`** — добавлены `userRole`, `userId`, `enabledModules` (+persist)
- **NAV** — добавлен role-gating для admin (только ADMIN/COMPLIANCE)

### Исправлено

- **trade-view MyTrades + useTradeLayout** — добавлен useI18n (t was not defined)
- **Лого в верхнем левом** — market grid центрирован
- **5 визуальных правок** — sidebar logo, market widget, help button, 2 бага

---

## [MVP v1.3] — 2026-06-25

### Добавлено

#### Маржинальная торговля
- **`margin-view.tsx`** — торговля с кредитным плечом 1x–20x
- Long/Short позиции, live PnL (WebSocket), цена ликвидации (auto-расчёт с maintenance margin 0.5%)
- **Auto-ликвидация** при margin ratio ≥ 100%
- Account summary: эквити, использованная/доступная маржа, margin level (цветовой индикатор)
- Таблица открытых позиций (12 колонок, live PnL flash), история позиций
- **Resizable + rearrangeable** блоки (как в Торги)

#### Compact trade-view (resize + drag)
- **react-resizable-panels** + **@dnd-kit** для перетаскивания и resize блоков
- Layout сохраняется в localStorage (Zustand persist)
- Кнопка «Сбросить layout» — возврат к default

#### Collapsible sidebar
- Сворачиваемая боковая навигация (icon-only в collapsed state)
- Сохранение состояния в localStorage

#### Mock→real аналитика
- `/api/analytics` — реальные метрики из БД (объём 24ч, активные пользователи, открытые позиции, средний PnL)
- BTCUSDT live-график (TradingView)
- Распределение торговых пар (donut, реальные данные из сделок)
- Объём торгов по времени (bar chart, hourly buckets из БД)
- Топ коридоров кросс-бордер (horizontal bar, реальные объёмы)

### Изменено

- **`/api/auth`** — добавлен GET?email= для demo-login, POST принимает любой email
- **`store.ts`** — добавлены `userRole`, `userId` (+persist)

---

## [MVP v1.2] — 2026-06-25

### Добавлено

#### Полиш home + trade
- **Hero section** с CTA
- **Live-тикер топ-20 криптовалют** (Binance API, RUB/USD переключатель)
- **Рыночные данные** — 8 монет по умолчанию, разворачивается до 20
- **Топ роста / Топ падения** за 24ч
- **Блок «Безопасность активов»** (холодное хранение, HSM, страхование)
- **Партнёры и регуляторы** (Банк России, Росфинмониторинг, ЦФА-Реестр, СБП, Visa, Mastercard, Chainalysis)

#### Новости
- **15 новостей** (категории: Регуляторика, Рынок, Платформа, Партнёрство)
- Фильтр по категориям со счётчиками, поиск по заголовкам/содержанию
- Featured/pinned новость сверху, бегущая строка в header

#### Price alerts
- **Создание алертов** (выше/ниже цены)
- Auto-trigger при пересечении + toast + notification
- Мои алерты: список с статусами (активен/сработал/пауза), переключатель, удаление

#### CSV-экспорт
- Мои сделки (trade-view): фильтры (Все/Покупки/Продажи, Сегодня/7д/Всё) + CSV-экспорт
- 3-НДФЛ налоговый отчёт (portfolio-view): CSV-экспорт (реализованный PnL, комиссии, количество сделок)

### Изменено

- **portfolio-view** — реальный PnL-график (кривая эквити из сделок + транзакций, backward+forward replay)
- **profile-view** — 6 табов (Обзор/Активы/История/Безопасность/Рефералы/Настройки), login history из БД

---

## [MVP v1.1] — 2026-06-25

### Добавлено

#### Бэкенд + Prisma
- **Prisma ORM** + **SQLite** — 12 моделей (User, Balance, Order, Trade, Transaction, P2POffer, P2PDeal, CrossBorderPayment, ComplianceAlert, KycDocument, LoginEvent, Referral)
- **`/api/auth`** — вход/регистрация (демо)
- **`/api/market`** — котировки топ-20 криптовалют (Binance API + fallback)
- **`/api/wallet`** — балансы + транзакции, депозит (адрес) / вывод
- **`/api/orders`** — история ордеров/сделок, разместить ордер (демо-matching)
- **`/api/p2p`** — P2P-офферы + сделки, создать/принять оффер, обновить статус
- **`/api/payments`** — коридоры + мои платежи, создать кросс-бордер платёж, обновить статус
- **`/api/compliance`** — AML-алерты, review алерта (approve/reject/escalate/SAR)
- **`/api/kyc`** — статус KYC, обновить уровень
- **`/api/analytics`** — метрики платформы (из БД)
- **`/api/portfolio/history`** — кривая эквити портфеля
- **`/api/admin/stats`** — агрегированные метрики для админки
- **`/api/profile/{login-history,referral,sessions}`** — данные профиля из БД

#### Socket.io realtime
- **mini-services/market-service** — socket.io WebSocket (порт 3003)
- Live order book (12 уровней bids/asks) для 8 торговых пар
- Price ticks каждые 1.5 сек
- Лента последних сделок
- Mock-fallback (статичные данные) при недоступности сервиса

#### Новые фичи
- **P2P-торговля** с эскроу и чатом (24 P2P-объявления, методы оплаты: СБП/Тинькофф/Сбер)
- **Кросс-бордер платежи** — 6 коридоров (RU-CN, RU-AE, RU-TR, RU-IN, RU-KZ, RU-AM), 7-шаговый tracker статусов (Saga)
- **AML-комплаенс-консоль** — 5 типов алертов (STRUCTURING/VELOCITY/SANCTION/THRESHOLD/PATTERN), SHAP-объяснимость, SAR-отчёты, карантин (m-of-n)
- **KYC wizard** — 5 шагов (Телефон → Документ → Селфи → Адрес-идентификатор → Квалификация), Госуслуги (ЕСИА) fast-track

---

## [MVP v1.0] — 2026-06-25

### Добавлено — Initial Release

#### Базовый SPA
- **Next.js 16** (App Router, Turbopack) + **React 19** + **TypeScript 5**
- **Tailwind CSS 4** + **shadcn/ui** (New York style, 40+ компонентов)
- **Zustand 5** (state management + persist)
- **recharts** (графики), **framer-motion** (анимации)
- **lucide-react** (иконки), **sonner** (toasts), **next-themes** (dark/light)
- **socket.io-client** (WebSocket)

#### Разделы (изначально 11)
- **Главная** (`home`) — hero + live-тикер топ-20
- **Торги** (`trade`) — график TradingView + order book + форма ордера
- **Рынки** (`markets`) — таблица 20 пар
- **Кошелёк** (`wallet`) — 4 таба (Активы/Пополнить/Вывести/История)
- **Портфель** (`portfolio`) — общий баланс, аллокация, история
- **Аналитика** (`analytics`) — метрики платформы
- **Верификация** (`kyc`) — KYC wizard
- **Комплаенс** (`compliance`) — AML-консоль
- **Профиль** (`profile`) — личный кабинет
- **Админка** (`admin`) — операционная панель
- **Вход** (`auth`) — аутентификация

#### Дизайн
- **Тёмная тема** в стиле Binance/Bybit, фирменная золотая гамма (#F0B90B + dark navy)
- **SVG-логотип** РусКрипто (золотой гексагональный щит + ₽ + свечи)
- Responsive (mobile-first), touch-friendly (min 44px touch targets)

#### Регуляторное соответствие
- **ФЗ-1194918-8** — адрес-идентификаторы, квалификация инвестора
- **ФЗ-115** — AML-мониторинг, пороговые операции
- **ФЗ-152** — согласие на обработку ПДн
- **ФЗ-173** — валютный контроль (авто-документы)

---

## Сводка версий

| Версия | Дата | Разделы | Роли | API | Модели БД | Демо-аккаунты |
|---|---|---|---|---|---|---|
| v1.0 | 2026-06-25 | 11 | 1 (USER) | 0 | 0 | 0 |
| v1.1 | 2026-06-25 | 13 | 3 (USER/ADMIN/COMPLIANCE) | 14 | 12 | 3 |
| v1.2 | 2026-06-25 | 14 | 3 | 14 | 12 | 3 |
| v1.3 | 2026-06-25 | 15 | 3 | 14 | 12 | 3 |
| v1.4 | 2026-06-25 | 16 | 3 | 14 | 12 | 3 |
| v1.5 | 2026-06-26 | 17 | 4 (+FINANCE) | 28 (+14 finance) | 21 (+9 bank/finance) | 4 (+FINANCE) |
| **v2.0** | **2026-07-02** | **18** (+bank-portal) | **5** (+BANK) | **33** (+5 bank-portal) | **21** | **7** (+3 BANK) |

---

## Ключевые архитектурные решения

1. **Single-page app** — один маршрут `/` с client-side routing (Zustand store), все 18 разделов
2. **Hybrid data** — API (Prisma) + Zustand store (fallback/resilience)
3. **Persisted state** — балансы, сделки, настройки, locale, layout, enabledModules в localStorage
4. **Role-gating (5 ролей)** — ADMIN/COMPLIANCE (admin), FINANCE/ADMIN (finance), BANK (bank-portal)
5. **Module toggles** — P2P/crossBorder отключаемы через админку
6. **WebSocket** — socket.io mini-service на порту 3003 для live order book
7. **i18n** — ~2200 ключей RU/EN, helper-функции принимают `t` как параметр (rules-of-hooks safe)
8. **Bank API compatibility** — ВТБ (SOAP + GOST TLS), Альфа (REST + OAuth) — sandbox mode

---

## Технологический стек (текущий)

### Фронтенд
- Next.js 16 (App Router, Turbopack)
- React 19 + TypeScript 5
- Tailwind CSS 4 + shadcn/ui (40+ компонентов)
- Zustand 5 (state + persist)
- recharts, framer-motion, react-resizable-panels, @dnd-kit
- lucide-react, sonner, next-themes, socket.io-client

### Бэкенд
- Next.js API Routes (33 эндпоинта в 11 группах)
- Prisma ORM 6 + SQLite (21 модель)
- z-ai-web-dev-sdk (LLM с fallback)
- socket.io (mini-service порт 3003)

### Внешние API
- Binance API (ticker + klines для sparklines)
- exchangerate-api.com (USD/RUB)
- TradingView (графики, iframe)
- Bank APIs (ВТБ SOAP/GOST, Альфа REST/OAuth — sandbox)

---

*CHANGELOG актуален на дату: Июль 2026. Текущая версия: MVP v2.0.*
