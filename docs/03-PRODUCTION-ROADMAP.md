# 🎯 План перехода РусКрипто из MVP в Production

**Текущий статус:** MVP (демонстрационный прототип для инвесторов)  
**Целевой статус:** Production-ready криптобиржа, лицензия ЦБ РФ  
**Горизонт планирования:** 12–15 месяцев

---

## 📊 Сводная оценка

| Фаза | Длительность | Команда | Бюджет (CAPEX) |
|---|---|---|---|
| Фаза 1. Юридическая + организационная | 2–3 мес | 3–5 чел | 35–50 млн ₽ |
| Фаза 2. Бэкенд + trading engine | 3–4 мес | 8–12 чел | 40–55 млн ₽ |
| Фаза 3. Безопасность + кастодия | 2–3 мес | 5–7 чел | 25–35 млн ₽ |
| Фаза 4. Интеграции + партнёры | 2–3 мес | 6–8 чел | 20–30 млн ₽ |
| Фаза 5. Тестирование + сертификация | 2–3 мес | 8–10 чел | 15–25 млн ₽ |
| Фаза 6. Soft launch + масштабирование | 1–2 мес | 10–15 чел | 10–15 млн ₽ |
| **Итого** | **12–15 мес** | **до 25 чел** | **145–210 млн ₽** |

> Окупаемость: 2.5–3.5 года (IRR 28–35%, по данным PRD)

---

## ❌ Чего не хватает (Gap-анализ MVP → Production)

### 1. Backend / Trading Engine

| Компонент | MVP (сейчас) | Production (требуется) | Приоритет |
|---|---|---|---|
| **Matching engine** | Mock (мгновенный fill в API route) | Rust/C++ движок, price-time FIFO, <10 мс latency, 100K TPS | 🔴 Критич. |
| **Order book** | WebSocket mock (рандомные данные) | Реальный in-memory order book (Red-Black Tree), L2 depth stream | 🔴 Критич. |
| **База данных** | SQLite (1 файл, локально) | PostgreSQL 16 (репликация 2 ЦОД) + TimescaleDB (ticks/candles) + Redis Cluster | 🔴 Критич. |
| **Очереди** | Нет | Apache Kafka (Avro + Schema Registry) для event-driven архитектуры | 🔴 Критич. |
| **API Gateway** | Next.js API Routes | Kong (rate-limit, auth, GOST TLS plugins) | 🟡 Высок. |
| **Микросервисы** | Монолит (Next.js) | 11 bounded contexts (IAM, Trading, Custody, Payments, Compliance, ...) | 🔴 Критич. |
| **gRPC** | Нет | gRPC + Protobuf для inter-service sync | 🟡 Высок. |
| **Idempotency** | Нет | client_order_id + Redis SETNX | 🔴 Критич. |
| **Outbox pattern** | Нет | Debezium CDC → Kafka (exactly-once) | 🟡 Высок. |

### 2. Безопасность

| Компонент | MVP | Production | Приоритет |
|---|---|---|---|
| **Аутентификация** | Демо (любой пароль) | NextAuth.js + JWT + TOTP 2FA + WebAuthn | 🔴 Критич. |
| **Авторизация** | Role-gating (USER/ADMIN) | RBAC + ABAC (11 ролей, контекстные проверки) | 🔴 Критич. |
| **Шифрование** | Нет | GOST 28147-89 + AES-256-GCM, иерархия ключей (Master→KEK→DEK) | 🔴 Критич. |
| **HSM** | Нет | Thales Luna (FIPS 140-2 L3 + FSTEC), key ceremony 5-of-7 | 🔴 Критич. |
| **mTLS** | Нет | mTLS между сервисами (Istio service mesh) | 🟡 Высок. |
| **Сессии** | localStorage (Zustand) | Server-side sessions + Redis, timeout, IP-binding | 🔴 Критич. |
| **CSRF/XSS** | Базовый | Полная защита, CSP headers, CSRF tokens | 🟡 Высок. |
| **Rate limiting** | Нет | 3 уровня: Kong (IP/API-key), app (user×op), TCP (syn cookies) | 🟡 Высок. |
| **Audit log** | Нет | WORM storage + Merkle Root (ежечасно), 5 лет retention | 🔴 Критич. |
| **Пентесты** | Нет | Ежеквартальные пентесты (Bug bounty program) | 🟡 Высок. |

### 3. Кастодия (кошельки)

| Компонент | MVP | Production | Приоритет |
|---|---|---|---|
| **Кошельки** | Mock (фейковые адреса) | HD-кошельки BIP-32/44, hot/warm/cold 5/15/80 | 🔴 Критич. |
| **Вывод средств** | Mock (alert) | Multi-sig (2-of-3 warm, 3-of-5 cold), multi-factor confirmation | 🔴 Критич. |
| **Sweeper** | Нет | Auto-rebalance между hot/warm/cold каждые 15 мин | 🟡 Высок. |
| **On-chain мониторинг** | Нет | Отслеживание депозитов, confirmations, double-spend protection | 🔴 Критич. |
| **Страхование** | Нет | Страхование активов $100M (Lloyd's / Marsh) | 🟡 Высок. |

### 4. KYC / Compliance

| Компонент | MVP | Production | Приоритет |
|---|---|---|---|
| **KYC провайдер** | Mock (fake OCR) | Integration: Regula / Sumsub / IDNow, PaddleOCR (fallback) | 🔴 Критич. |
| **Госуслуги (ЕСИА)** | Mock (auto-login) | Реальная SAML 2.0 / OAuth 2.0 интеграция с ЕСИА | 🔴 Критич. |
| **Liveness** | Mock (progress bar) | 3D depth + blink + head movement (FaceTec / Veriff) | 🔴 Критич. |
| **Sanctions screening** | Mock (fake match) | Chainalysis + Rosfinmonitoring API + OFAC/EU lists, real-time | 🔴 Критич. |
| **AML rules engine** | 5 статичных алертов | 200+ rules (JSON-declarative, hot-reload via Kafka), threshold/velocity/pattern | 🟡 Высок. |
| **ML-модель AML** | Mock SHAP | XGBoost (F1=0.87) + GNN (F1=0.82), Airflow retraining, Feature Store | 🟡 Высок. |
| **Regulatory reporting** | Нет | Auto-генерация: паспорт сделки, УФЭД, SAR в Росфинмониторинг (XML/API) | 🔴 Критич. |
| **Data Room** | Нет | Read-only портал для инспекторов ЦБ (P47/P49) | 🟡 Высок. |

### 5. Платежи / Cross-border

| Компонент | MVP | Production | Приоритет |
|---|---|---|---|
| **Банк-партнёр** | Нет | Корреспондентский счёт в банке-партнёре (Сбер/Газпромбанк/ВТБ) | 🔴 Критич. |
| **Fiat on/off ramp** | Нет | Интеграция СБП + банковские переводы (RUB deposit/withdraw) | 🔴 Критич. |
| **Corridor plugins** | 6 статичных | CorridorPlugin interface (validate/execute/settle/compensate), real liquidity bridges | 🟡 Высок. |
| **SWIFT/SPFS** | Нет | Интеграция с SWIFT (или SPFS как fallback) для международных переводов | 🟡 Высок. |
| **Валютный контроль** | Mock (note) | Авто-генерация паспорта сделки (>50K USD), УФЭД, MinIO хранение (GOST-encrypted) | 🔴 Критич. |

### 6. Инфраструктура

| Компонент | MVP | Production | Приоритет |
|---|---|---|---|
| **Хостинг** | Локальный (sandbox) | 2 FSTEC-сертифицированных ЦОД (Москва + СПб), active-active | 🔴 Критич. |
| **Оркестрация** | Нет | Kubernetes 1.29+ (Calico, Falco, Trivy) | 🔴 Критич. |
| **CI/CD** | Нет | GitLab CI (lint→unit→integration→SAST/DAST→staging→canary→prod) | 🟡 Высок. |
| **Мониторинг** | Нет | Prometheus + Grafana + ELK + OpenTelemetry/Jaeger | 🟡 Высок. |
| **DR (Disaster Recovery)** | Нет | Active-Active, RPO <1 мин, RTO <15 мин, quarterly chaos drills | 🔴 Критич. |
| **Бэкапы** | Нет | Automated backups + point-in-time recovery, encrypted (GOST) | 🔴 Критич. |

### 7. Фронтенд

| Компонент | MVP | Production | Приоритет |
|---|---|---|---|
| **Auth** | Mock (любой пароль) | NextAuth.js + email verification + password reset + session timeout | 🔴 Критич. |
| **Real-time** | socket.io mock | Production socket.io cluster (Redis adapter, sticky sessions) | 🟡 Высок. |
| **Мобильное приложение** | Нет (только web) | React Native (Expo) — iOS + Android, shared types с web | 🟡 Высок. |
| **PWA** | Нет | Offline support, push notifications, install to home screen | 🟢 Низк. |
| **Тесты** | Нет | Unit (Jest) + E2E (Playwright) + visual regression | 🟡 Высок. |

### 8. Юридическое / Регуляторное

| Компонент | MVP | Production | Приоритет |
|---|---|---|---|
| **Юр. лицо** | Нет | ООО «РусКрипто» (или АО), уставный капитал ≥100 млн ₽ (биржа) / ≥35 млн (обменник) | 🔴 Критич. |
| **Лицензия ЦБ РФ** | Нет | Заявка на лицензию оператора обмена цифровой валюты / биржи | 🔴 Критич. |
| **Комплаенс-офицер** | Нет | Штатный комплаенс-офицер (требование 115-ФЗ) | 🔴 Критич. |
| **Договоры с банками** | Нет | Корреспондентские договоры с банками-партнёрами | 🔴 Критич. |
| **Пользовательское соглашение** | Нет | Полное пользовательское соглашение, оферта, политика конфиденциальности | 🔴 Критич. |
| **Страхование** | Нет | Страхование проф. ответственности + страхование активов | 🟡 Высок. |

---

## 📅 Детальный план по фазам

### Фаза 1. Юридическая + организационная (2–3 мес)

**Цель:** Создать легальную основу для работы биржи.

| Задача | Срок | Ответственный |
|---|---|---|
| Регистрация юр. лица (ООО/АО), уставный капитал ≥100 млн ₽ | 2 нед | Юрист |
| Подготовка и подача заявки на лицензию ЦБ РФ | 4 нед | Юрист + CEO |
| Найм core-команды (CTO, комплаенс-офицер, risk manager, 3 разработчика) | 6 нед | HR + CEO |
| Аренда офиса + закупка оборудования | 2 нед | Администратор |
| Разработка внутренних политик (AML, KYC, risk management) | 4 нед | Комплаенс |
| Договор с банком-партнёром (корреспондентский счёт) | 6 нед | CEO + юрист |
| Договор с HSM-провайдером (Thales Luna) | 3 нед | CTO |
| Договор с FSTEC-сертифицированным ЦОД (Москва + СПб) | 4 нед | CTO |

**Результат:** Юр. лицо зарегистрировано, заявка на лицензию подана, команда нанята, партнёры подключены.

---

### Фаза 2. Бэкенд + Trading Engine (3–4 мес)

**Цель:** Построить production-бэкенд с реальным matching engine.

| Задача | Срок | Команда |
|---|---|---|
| **Matching engine (Rust)** | 8 нед | 2 Rust-разработчика |
| Price-time FIFO, <10 мс latency, 100K TPS | | |
| In-memory order book (Red-Black Tree) | | |
| Order types: limit (GTC/IOC/FOK), market, stop-limit, stop-market | | |
| Pre-trade risk engine (5 checks) | | |
| **Микросервисы (Go)** | 10 нед | 3 Go-разработчика |
| IAM (auth, KYC, sessions) | | |
| Custody (wallets, HSM, withdrawal) | | |
| Payments (fiat, cross-border, settlement) | | |
| Compliance (AML engine, transaction monitor) | | |
| Notification (email, push, SMS) | | |
| **Инфраструктура данных** | 6 нед | DevOps |
| PostgreSQL 16 (репликация 2 ЦОД) | | |
| TimescaleDB (ticks/candles) | | |
| Redis Cluster (order book cache, rate limits) | | |
| Kafka + Schema Registry (event bus) | | |
| EventStoreDB (event sourcing) | | |
| **API Gateway (Kong)** | 3 нед | DevOps |
| Rate limiting, auth, GOST TLS plugins | | |
| **gRPC inter-service** | 4 нед | Backend |
| Protobuf schemas, mTLS | | |
| **Outbox + CDC** | 3 нед | Backend |
| Debezium → Kafka, exactly-once semantics | | |
| **Idempotency** | 2 нед | Backend |
| client_order_id + Redis SETNX | | |
| **Migration фронтенда** | 4 нед | Frontend |
| Замена mock-API на реальные эндпоинты | | |
| NextAuth.js auth (JWT + TOTP) | | |

**Результат:** Production-бэкенд с реальным matching engine, 11 микросервисов, PostgreSQL + Kafka + Redis.

---

### Фаза 3. Безопасность + Кастодия (2–3 мес)

**Цель:** Обеспечить институциональный уровень безопасности активов.

| Задача | Срок | Команда |
|---|---|---|
| **HSM интеграция** | 4 нед | 2 крипто-инженера |
| Thales Luna (FIPS 140-2 L3 + FSTEC) | | |
| Key ceremony (5-of-7 quorum) | | |
| Иерархия ключей: Master → KEK → DEK → ephemeral | | |
| **Кастодия (кошельки)** | 6 нед | 2 блокчейн-разработчика |
| HD-кошельки BIP-32/44 + GOST | | |
| Hot/Warm/Cold 5/15/80 | | |
| Multisig (2-of-3 warm, 3-of-5 cold) | | |
| Sweeper (auto-rebalance каждые 15 мин) | | |
| On-chain мониторинг депозитов | | |
| **Шифрование** | 3 нед | Крипто-инженер |
| GOST 28147-89 / R 34.12-2015 (Магма/Кузнечик) | | |
| AES-256-GCM для остальных данных | | |
| **Auth & Sessions** | 3 нед | Backend |
| NextAuth.js + JWT + TOTP 2FA + WebAuthn | | |
| Server-side sessions (Redis), timeout, IP-binding | | |
| RBAC + ABAC (11 ролей) | | |
| **Audit log** | 2 нед | Backend |
| WORM storage + Merkle Root (ежечасно) | | |
| 5 лет retention | | |
| **Пентест** | 2 нед | Внешний подрядчик |
| Внешний пентест (OWASP, STRIDE) | | |

**Результат:** HSM + кастодия + шифрование + audit + пентест пройден.

---

### Фаза 4. Интеграции + Партнёры (2–3 мес)

**Цель:** Подключить реальные внешние сервисы.

| Задача | Срок | Команда |
|---|---|---|
| **KYC провайдер** | 4 нед | 2 backend |
| Sumsub / Regula интеграция | | |
| PaddleOCR (fallback для документов РФ) | | |
| Liveness (FaceTec / Veriff) | | |
| **Госуслуги (ЕСИА)** | 3 нед | Backend |
| SAML 2.0 / OAuth 2.0 реальная интеграция | | |
| **Sanctions screening** | 3 нед | Backend |
| Chainalysis API (source-of-funds) | | |
| Росфинмониторинг API (real-time checks) | | |
| OFAC / EU sanctions lists | | |
| **Fiat on/off ramp** | 4 нед | 2 backend |
| СБП интеграция (через банк-партнёр) | | |
| Банковские переводы (RUB deposit/withdraw) | | |
| **Cross-border corridors** | 5 нед | 2 backend |
| CorridorPlugin interface | | |
| Реальные liquidity bridges (RU-CN, RU-AE, RU-TR) | | |
| SWIFT/SPFS интеграция | | |
| Валютный контроль (авто-паспорт сделки, УФЭД) | | |
| **Regulatory reporting** | 3 нед | Backend + комплаенс |
| SAR в Росфинмониторинг (XML/API) | | |
| Data Room для инспекторов ЦБ | | |
| **Мобильное приложение** | 8 нед | 2 mobile-разработчика |
| React Native (Expo) — iOS + Android | | |

**Результат:** Реальные KYC, Госуслуги, fiat-платежи, кросс-бордер, санкционный скрининг, мобильное приложение.

---

### Фаза 5. Тестирование + Сертификация (2–3 мес)

**Цель:** Доказать надёжность и получить сертификации.

| Задача | Срок | Команда |
|---|---|---|
| **Load testing** | 2 нед | QA + DevOps |
| 100K TPS matching, 50K req/s API, 1M concurrent WS | | |
| **Integration testing** | 3 нед | QA |
| E2E сценарии (onboarding → trade → withdraw) | | |
| **Security audit** | 3 нед | Внешний аудитор |
| SOC 2 Type II аудит | | |
| Пентест (повторный, после фиксов) | | |
| **FSTEC сертификация** | 4 нед | Юрист + CTO |
| Сертификация ЦОД + HSM | | |
| **ML-модель AML** | 4 нед | Data Scientist |
| XGBoost + GNN, 150+ фичей, Feature Store | | |
| Airflow retraining pipeline | | |
| Canary 10% → full deployment | | |
| **CI/CD pipeline** | 2 нед | DevOps |
| GitLab CI: lint→unit→integration→SAST/DAST→staging→canary→prod | | |
| Auto-rollback (>1% error/5 мин) | | |
| **DR тестирование** | 2 нед | DevOps |
| Chaos engineering, failover тесты | | |
| Quarterly chaos drills | | |

**Результат:** Нагрузочные тесты пройдены, security-аудит чистый, FSTEC сертификация получена, ML-модель в проде.

---

### Фаза 6. Soft Launch + Масштабирование (1–2 мес)

**Цель:** Запуск с ограниченной аудиторией, масштабирование.

| Задача | Срок | Команда |
|---|---|---|
| **Soft launch** | 2 нед | Вся команда |
| Инвайт-only, 100–500 пользователей | | |
| Мониторинг метрик, фикс багов | | |
| **Получение лицензии ЦБ РФ** | 4 нед | Юрист + CEO |
| Финальное рассмотрение заявки | | |
| **Public launch** | 2 нед | Marketing + команда |
| Открытая регистрация | | |
| Marketing campaign | | |
| **Масштабирование** | ongoing | DevOps |
| Горизонтальное масштабирование до 1M пользователей | | |
| Добавление новых коридоров (RU-UZ, RU-BY, ...) | | |
| Добавление новых торговых пар (50+) | | |
| Listing/tokenization module | | |

**Результат:** Биржа запущена в production, лицензия ЦБ РФ получена, пользователи торгуют.

---

## 👥 Команда (целевая структура)

| Роль | Кол-во | Зона ответственности |
|---|---|---|
| CEO | 1 | Стратегия, инвесторы, ЦБ РФ |
| CTO | 1 | Архитектура, тех. лидерство |
| Комплаенс-офицер | 1 | AML, регуляторика, отчётность |
| Risk-менеджер | 1 | Рыночный/кредитный риск, лимиты |
| Юрист | 1 | Договоры, лицензии, регуляторика |
| Backend-разработчики (Go/Rust) | 4 | Микросервисы, matching engine |
| Frontend-разработчики (React/Next) | 2 | Web + мобильное приложение |
| Blockchain-инженеры | 2 | Кастодия, кошельки, on-chain |
| DevOps/SRE | 2 | Kubernetes, CI/CD, мониторинг |
| Data Scientist | 1 | AML ML-модель, аналитика |
| QA-инженеры | 2 | Тестирование, автоматизация |
| Support | 2 | Пользовательская поддержка |
| **Итого** | **20–25** | |

---

## ⚠️ Ключевые риски

| Риск | Вероятность | Влияние | Митигация |
|---|---|---|---|
| **Отказ ЦБ РФ в лицензии** | Средняя | 🔴 Критич. | Раннее взаимодействие с ЦБ, превентивный комплаенс |
| **Регуляторные изменения** (вторичное законодательство) | Высокая | 🟡 Высок. | Гибкая архитектура, юр. мониторинг |
| **Хакерская атака / кража средств** | Средняя | 🔴 Критич. | HSM, multisig, страхование $100M, bug bounty |
| **Сбой matching engine** | Низкая | 🔴 Критич. | Active-Active 2 ЦОД, DR <15 мин |
| **Санкции на биржу** | Средняя | 🟡 Высок. | Кросс-бордер коридоры через дружественные юрисдикции |
| **Нехватка ликвидности** | Высокая | 🟡 Высок. | Партнёры-маркетмейкеры, liquidity bridges |
| **Уход ключевых разработчиков** | Средняя | 🟡 Высок. | Опционы (esop), документация, парное программирование |

---

## 📈 KPI для перехода в production

| Метрика | Целевое значение |
|---|---|
| Matching latency (p99) | < 10 мс |
| API latency (p95) | < 200 мс |
| Throughput | 100K TPS (matching), 50K req/s (API) |
| Concurrent WebSocket connections | 1M |
| SLA | 99.95% (≤4.38 ч downtime/год) |
| RPO / RTO | <1 мин / <15 мин |
| Пентест | 0 критических уязвимостей |
| Load test | 100K TPS без деградации |
| Сертификация | FSTEC (ЦОД + HSM) |
| Лицензия | ЦБ РФ (оператор обмена / биржа) |

---

## 🎯 Рекомендации по приоритетам

### Минимально жизнеспособный production (MVProd) — 8 месяцев
Если нужно запустить быстрее с ограниченным бюджетом:

1. **Фаза 1** (юридическая) — обязательно
2. **Фаза 2** (matching engine на Rust + PostgreSQL + Redis) — минимальный набор
3. **Фаза 3** (HSM + кастодия + 2FA) — обязательно
4. **Фаза 4** — только RU-CN коридор + СБП + 1 KYC-провайдер
5. **Фаза 5** — базовый load test + пентест (без FSTEC)
6. **Фаза 6** — soft launch 100 пользователей

**Бюджет MVProd:** ~80–100 млн ₽, 12–15 чел.

### Полный production — 12–15 месяцев
Все фазы по плану выше. Бюджет 145–210 млн ₽, до 25 чел.

---

*Документ актуален на: Июнь 2026. Оценки основаны на PRD и архитектурной документации проекта.*
