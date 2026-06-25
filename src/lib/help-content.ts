// Справочный центр РусКрипто — структурированная документация по платформе.
// Каждый раздел содержит: definition (что это), howTo (как пользоваться), faq (Q&A).
// Весь контент双语: ru/en. Используется в help-view и в системном промпте ИИ-консультанта.

export type HelpSection =
  | 'spot'
  | 'margin'
  | 'p2p'
  | 'crossborder'
  | 'wallet'
  | 'portfolio'
  | 'analytics'
  | 'kyc'
  | 'compliance'
  | 'markets'
  | 'news'
  | 'security'

export interface FaqItem {
  q: { ru: string; en: string }
  a: { ru: string; en: string }
}

export interface HelpArticle {
  id: string
  section: HelpSection
  title: { ru: string; en: string }
  definition: { ru: string; en: string }
  howTo: {
    ru: string[]
    en: string[]
  }
  faq: FaqItem[]
}

export interface SectionMeta {
  id: HelpSection | 'all'
  label: { ru: string; en: string }
  icon: string // lucide icon name resolved in help-view
}

export const HELP_SECTIONS: SectionMeta[] = [
  { id: 'all', label: { ru: 'Все', en: 'All' }, icon: 'LayoutGrid' },
  { id: 'spot', label: { ru: 'Спот', en: 'Spot' }, icon: 'CandlestickChart' },
  { id: 'margin', label: { ru: 'Маржа', en: 'Margin' }, icon: 'TrendingUp' },
  { id: 'p2p', label: { ru: 'P2P', en: 'P2P' }, icon: 'Users' },
  { id: 'crossborder', label: { ru: 'Кросс-бордер', en: 'Cross-border' }, icon: 'Send' },
  { id: 'wallet', label: { ru: 'Кошелёк', en: 'Wallet' }, icon: 'Wallet' },
  { id: 'portfolio', label: { ru: 'Портфель', en: 'Portfolio' }, icon: 'PieChart' },
  { id: 'analytics', label: { ru: 'Аналитика', en: 'Analytics' }, icon: 'BarChart3' },
  { id: 'kyc', label: { ru: 'KYC', en: 'KYC' }, icon: 'ShieldCheck' },
  { id: 'compliance', label: { ru: 'Комплаенс', en: 'Compliance' }, icon: 'Scale' },
  { id: 'markets', label: { ru: 'Рынки', en: 'Markets' }, icon: 'LineChart' },
  { id: 'security', label: { ru: 'Безопасность', en: 'Security' }, icon: 'Lock' },
]

// ─────────────────────────────────────────────────────────────────────────────
// Популярные вопросы (кураторская подборка для блока наверху страницы)
// ─────────────────────────────────────────────────────────────────────────────
export const POPULAR_QUESTIONS: FaqItem[] = [
  {
    q: {
      ru: 'Чем отличаются рыночный и лимитный ордер?',
      en: 'What is the difference between a market and a limit order?',
    },
    a: {
      ru: 'Рыночный ордер (market) исполняется мгновенно по лучшей текущей цене из стакана. Лимитный ордер (limit) выставляется по заданной вами цене и ждёт встречной заявки. Market — для скорости, limit — для контроля цены и комиссий (maker ниже, чем taker).',
      en: 'A market order fills instantly at the best available price from the order book. A limit order is placed at your specified price and waits for a matching order. Use market for speed, limit for price control and lower maker fees.',
    },
  },
  {
    q: {
      ru: 'Что такое ликвидация в маржинальной торговле?',
      en: 'What is liquidation in margin trading?',
    },
    a: {
      ru: 'Ликвидация — принудительное закрытие позиции биржей, когда маржинальная позиция теряет всю поддерживающую маржу. Цена ликвидации зависит от плеча, направления (long/short) и ставки поддержания 0,5%. Чтобы избежать ликвидации, держите margin ratio ниже 80% и используйте стоп-лоссы.',
      en: 'Liquidation is the forced closure of a margin position by the exchange when it loses all maintenance margin. The liquidation price depends on leverage, side (long/short) and the 0.5% maintenance rate. To avoid it, keep margin ratio below 80% and use stop-losses.',
    },
  },
  {
    q: {
      ru: 'Сколько подтверждений сети нужно для зачисления депозита?',
      en: 'How many network confirmations are required for a deposit?',
    },
    a: {
      ru: 'BTC — 3 подтверждения, ETH — 12, USDT (TRC-20) — 1, USDT (ERC-20) — 12, BNB — 15. Депозит зачисляется в кошелёк автоматически после достижения нужного порога. Не отправляйте средства по неверной сети — это приведёт к безвозвратной потере.',
      en: 'BTC requires 3 confirmations, ETH — 12, USDT (TRC-20) — 1, USDT (ERC-20) — 12, BNB — 15. Deposits are credited automatically once the threshold is reached. Do not send funds via the wrong network — this leads to irreversible loss.',
    },
  },
  {
    q: {
      ru: 'Как пройти верификацию (KYC) через Госуслуги?',
      en: 'How do I verify my identity (KYC) via Gosuslugi?',
    },
    a: {
      ru: 'Откройте раздел «Верификация», нажмите «Войти через Госуслуги (ЕСИА)». Авторизуйтесь на портале, подтвердите согласие на передачу данных. Уровень L1 присваивается автоматически (паспорт + СНИЛС). Для L2 необходимо загрузить селфи с документом и подтверждение адреса.',
      en: 'Open "Verification", click "Sign in via Gosuslugi (ESIA)". Authorize on the portal and consent to data transfer. Level L1 is granted automatically (passport + SNILS). For L2 upload a selfie with your document and proof of address.',
    },
  },
  {
    q: {
      ru: 'Что такое AML-проверка и зачем она нужна?',
      en: 'What is an AML check and why is it needed?',
    },
    a: {
      ru: 'AML (Anti-Money Laundering) — автоматический анализ входящих транзакций по цепочке блокчейна. Если средства связаны с миксерами, даркнетом или санкционными адресами, платформа приостанавливает зачисление и открывает комплаенс-алерт. Это требование 115-ФЗ и ФАТФ.',
      en: 'AML (Anti-Money Laundering) is an automated analysis of incoming transactions along the blockchain chain. If funds are linked to mixers, darknet or sanctioned addresses, the platform pauses crediting and opens a compliance alert. This is required by 115-FZ and FATF.',
    },
  },
  {
    q: {
      ru: 'Как получить справку 3-НДФЛ для налоговой?',
      en: 'How do I get a 3-NDFL tax report?',
    },
    a: {
      ru: 'В разделе «Портфель» → «Налоги» выберите налоговый год и нажмите «Сформировать 3-НДФЛ». Декларация генерируется в PDF с расчётом доходов, расходов, НДФЛ 13% и приложением сделок. Доступно с уровня KYC L1. Также доступен экспорт сделок в CSV.',
      en: 'In "Portfolio" → "Taxes", select the tax year and click "Generate 3-NDFL". The declaration is generated as a PDF with income, expenses, 13% personal income tax and a trade appendix. Available from KYC L1. CSV export of trades is also available.',
    },
  },
]

// ─────────────────────────────────────────────────────────────────────────────
// Полные статьи документации (12-15 штук)
// ─────────────────────────────────────────────────────────────────────────────
export const HELP_ARTICLES: HelpArticle[] = [
  // ─── SPOT ─────────────────────────────────────────────────────────────────
  {
    id: 'spot-overview',
    section: 'spot',
    title: { ru: 'Спот-торги: основы', en: 'Spot trading: basics' },
    definition: {
      ru: 'Спот-торги — это покупка и продажа криптовалют по текущей рыночной цене с немедленным расчётом (T+0). На споте вы обмениваете один актив на другой напрямую: например, BTC за USDT. Сделка совершается через стакан ордеров (order book), где сопоставляются заявки покупателей (bids) и продавцов (asks). Приоритет исполнения — по цене, затем по времени (price-time priority).',
      en: 'Spot trading is the buying and selling of cryptocurrency at the current market price with immediate settlement (T+0). On spot you exchange one asset for another directly: e.g. BTC for USDT. Trades happen via the order book, which matches buyer bids and seller asks. Execution priority is price-time priority.',
    },
    howTo: {
      ru: [
        'Откройте раздел «Торги» и выберите торговую пару (например, BTC/USDT) в верхнем селекторе.',
        'В панели ордера укажите сторону: «Купить» (buy) или «Продать» (sell).',
        'Выберите тип ордера: Market (по рынку) или Limit (по цене).',
        'Для лимитного ордера введите цену, для рыночного — только количество.',
        'Укажите количество базового актива или используйте процент-слайдер от баланса (25/50/75/100%).',
        'Проверьте сумму сделки и комиссию, нажмите кнопку «Купить»/«Продать».',
        'Активный ордер появится в блоке «Открытые ордера». Лимитный можно отменить до исполнения.',
      ],
      en: [
        'Open "Trade" and select the trading pair (e.g. BTC/USDT) in the top selector.',
        'In the order panel pick the side: "Buy" or "Sell".',
        'Choose order type: Market or Limit.',
        'For a limit order enter the price; for a market order only the quantity.',
        'Specify the base asset amount or use the percentage slider of your balance (25/50/75/100%).',
        'Verify total and fee, click "Buy"/"Sell".',
        'The active order appears in "Open Orders". Limit orders can be cancelled before fill.',
      ],
    },
    faq: [
      {
        q: { ru: 'Чем отличается maker от taker?', en: 'What is the difference between maker and taker?' },
        a: {
          ru: 'Maker — это ордер, который добавляет ликвидность в стакан (лимитный, не исполненный сразу). Taker — ордер, который забирает ликвидность (рыночный или лимитный, попавший на встречную заявку). Maker-комиссия обычно ниже (0,1% против 0,2%).',
          en: 'A maker adds liquidity to the order book (a limit order that does not fill immediately). A taker removes liquidity (a market order or a limit order that matches an existing one). Maker fee is usually lower (0.1% vs 0.2%).',
        },
      },
      {
        q: { ru: 'Что такое Time-in-Force (TIF)?', en: 'What is Time-in-Force (TIF)?' },
        a: {
          ru: 'TIF задаёт срок жизни ордера. GTC (Good-Till-Cancelled) — действует до отмены. IOC (Immediate-Or-Cancel) — исполнить сколько можно сейчас, остаток снять. FOK (Fill-Or-Kill) — исполнить полностью или отменить. В РусКрипто по умолчанию используется GTC.',
          en: 'TIF defines the lifespan of an order. GTC (Good-Till-Cancelled) stays until cancelled. IOC (Immediate-Or-Cancel) fills what is possible now, the rest is cancelled. FOK (Fill-Or-Kill) fills fully or is cancelled. RusKripto defaults to GTC.',
        },
      },
      {
        q: { ru: 'Какие комиссии на споте?', en: 'What are the spot fees?' },
        a: {
          ru: 'Базовая комиссия: maker 0,1%, taker 0,2%. При удержании RUB-токена или при уровне KYC L2 — скидка 25%. P2P-сделки без комиссии. Кросс-бордер — от 0,5% до 1,5% в зависимости от коридора.',
          en: 'Base fee: maker 0.1%, taker 0.2%. Holding the RUB token or KYC L2 gives a 25% discount. P2P trades are fee-free. Cross-border ranges from 0.5% to 1.5% depending on the corridor.',
        },
      },
    ],
  },
  {
    id: 'spot-orderbook',
    section: 'spot',
    title: { ru: 'Как читать стакан ордеров', en: 'How to read the order book' },
    definition: {
      ru: 'Стакан ордеров (order book) — это список всех активных лимитных заявок на покупку (зелёные bids) и продажу (красные asks). Глубина стакана показывает ликвидность: чем больше объёма у лучшей цены, тем устойчивее рынок. Спред — разница между лучшим bid и лучшим ask.',
      en: 'The order book is a list of all active limit orders to buy (green bids) and sell (red asks). Book depth shows liquidity: more volume near the best price means a more resilient market. Spread is the difference between the best bid and the best ask.',
    },
    howTo: {
      ru: [
        'Откройте «Торги» — стакан отображается в правой части (на десктопе) или под графиком (на мобильном).',
        'Верхняя половина — asks (продавцы), нижняя — bids (покупатели).',
        'Цены отсортированы: лучший ask сверху, лучший bid снизу своей половины.',
        'Цветная полоса за ценой — относительный объём заявки (чем длиннее, тем крупнее ордер).',
        'Совершайте клик по любой цене — она подставится в форму ордера.',
      ],
      en: [
        'Open "Trade" — the order book is on the right (desktop) or below the chart (mobile).',
        'Top half — asks (sellers); bottom half — bids (buyers).',
        'Prices are sorted: best ask at the top, best bid at the bottom of its half.',
        'Coloured bar behind the price shows relative order size (longer = bigger order).',
        'Click any price to insert it into the order form.',
      ],
    },
    faq: [
      {
        q: { ru: 'Что такое «тонкий стакан»?', en: 'What is a "thin book"?' },
        a: {
          ru: 'Тонкий стакан — мало ликвидности, большие спреды, высокая волатильность при исполнении крупных ордеров. В таких условиях рыночный ордер может получить проскальзывание (slippage). Используйте лимитные ордера.',
          en: 'A thin book has little liquidity, wide spreads and high slippage for large market orders. Use limit orders in such conditions.',
        },
      },
    ],
  },
  // ─── MARGIN ────────────────────────────────────────────────────────────────
  {
    id: 'margin-overview',
    section: 'margin',
    title: { ru: 'Маржинальная торговля', en: 'Margin trading' },
    definition: {
      ru: 'Маржинальная торговля — это торговля с плечом, когда вы занимаете средства у биржи, чтобы открыть позицию крупнее своего капитала. В РусКрипто доступно плечо до 20x. Long — ставка на рост, short — на падение. Цена ликвидации — уровень, при котором биржа принудительно закрывает позицию. Margin ratio — отношение использованной маржи к эквити; чем выше, тем выше риск ликвидации.',
      en: 'Margin trading is leveraged trading where you borrow from the exchange to open a position larger than your capital. RusKripto offers up to 20x leverage. Long bets on price growth, short on a decline. The liquidation price is the level at which the exchange forcibly closes the position. Margin ratio is used margin to equity; the higher, the closer to liquidation.',
    },
    howTo: {
      ru: [
        'Откройте раздел «Марж. торговля» и выберите пару.',
        'Выберите направление: Long (рост) или Short (падение).',
        'Установите плечо от 2x до 20x с помощью слайдера. Помните: чем выше плечо — тем ближе ликвидация.',
        'Введите размер маржи (собственный капитал в позиции). Объём позиции = маржа × плечо.',
        'Проверьте цену входа (текущая по рынку) и цену ликвидации.',
        'Нажмите «Открыть позицию». Позиция появится в таблице «Открытые позиции».',
        'Чтобы закрыть — нажмите «Закрыть» в строке позиции. Фиксируется PnL.',
      ],
      en: [
        'Open "Margin" and select the pair.',
        'Choose direction: Long (growth) or Short (decline).',
        'Set leverage from 2x to 20x with the slider. Higher leverage = closer liquidation.',
        'Enter the margin size (your own capital in the position). Position size = margin × leverage.',
        'Verify entry price (current market) and liquidation price.',
        'Click "Open position". The position appears in "Open positions".',
        'To close, click "Close" in the position row. PnL is realized.',
      ],
    },
    faq: [
      {
        q: { ru: 'Что такое margin call?', en: 'What is a margin call?' },
        a: {
          ru: 'Margin call — предупреждение при margin ratio ≥ 80%. Платформа уведомляет пользователя о необходимости пополнить маржу или закрыть часть позиции. При ratio ≥ 100% (цена достигает цены ликвидации) позиция закрывается принудительно.',
          en: 'A margin call is a warning when margin ratio reaches 80%. The platform notifies you to top up margin or reduce the position. At ratio ≥ 100% (price hits liquidation) the position is forcibly closed.',
        },
      },
      {
        q: { ru: 'Как управлять риском в марже?', en: 'How do I manage risk in margin?' },
        a: {
          ru: '1) Не используйте максимальное плечо без опыта. 2) Держите ratio < 50%. 3) Ставьте стоп-лосс сразу при открытии. 4. Не усредняйте убыточную позицию. 5) Закрывайте позицию, если не понимаете движение.',
          en: '1) Do not use max leverage without experience. 2) Keep ratio < 50%. 3) Set a stop-loss immediately. 4) Do not average down a losing position. 5) Close the position if you do not understand the move.',
        },
      },
    ],
  },
  // ─── P2P ───────────────────────────────────────────────────────────────────
  {
    id: 'p2p-overview',
    section: 'p2p',
    title: { ru: 'P2P-торги', en: 'P2P trading' },
    definition: {
      ru: 'P2P (peer-to-peer) — прямая торговля криптовалютой между пользователями, где РусКрипто выступает гарантом сделки через эскроу. Покупатель переводит фиат продавцу вне платформы, а криптовалюта блокируется на эскроу-счёте до подтверждения оплаты. После подтверждения активы переводятся покупателю. Это позволяет покупать крипту за рубли с любого банка.',
      en: 'P2P (peer-to-peer) is direct crypto trading between users where RusKripto guarantees the deal via escrow. The buyer transfers fiat to the seller off-platform, while crypto is locked in escrow until payment is confirmed. Once confirmed, the assets are released to the buyer. This lets you buy crypto for rubles from any bank.',
    },
    howTo: {
      ru: [
        'Откройте раздел «P2P» и выберите направление: «Купить» или «Продать» крипту.',
        'Выберите актив (например, USDT) и валюту (RUB).',
        'Отфильтруйте офферы по банку, лимиту и рейтингу продавца.',
        'Нажмите на подходящий оффер, введите сумму и нажмите «Создать сделку».',
        'Криптовалюта блокируется на эскроу. Откройте чат с контрагентом.',
        'Переведите фиат по реквизитам из чата. НЕ отмечайте оплату, пока не перевели.',
        'Нажмите «Я оплатил». Продавец проверит и освободит крипту.',
        'Если спор — нажмите «Открыть диспут», приложите чек об оплате.',
      ],
      en: [
        'Open "P2P" and choose the direction: "Buy" or "Sell" crypto.',
        'Select the asset (e.g. USDT) and currency (RUB).',
        'Filter offers by bank, limit and seller rating.',
        'Click a suitable offer, enter the amount and click "Create deal".',
        'Crypto is locked in escrow. A chat with the counterparty opens.',
        'Transfer fiat using the bank details from chat. Do NOT mark as paid before transferring.',
        'Click "I have paid". The seller verifies and releases the crypto.',
        'In case of a dispute, click "Open dispute" and attach the payment receipt.',
      ],
    },
    faq: [
      {
        q: { ru: 'Какие платёжные методы поддерживаются?', en: 'Which payment methods are supported?' },
        a: {
          ru: 'СБП, Сбербанк, Тинькофф, ВТБ, Альфа-Банк, Райффайзен, ОЗОН Банк, ЮMoney, QIWI. Полный список — в фильтре P2P. Скорость перевода зависит от банка-эмитента.',
          en: 'SBP (faster payments), Sberbank, Tinkoff, VTB, Alfa-Bank, Raiffeisen, OZON Bank, YooMoney, QIWI. Full list is in the P2P filter. Transfer speed depends on the issuing bank.',
        },
      },
      {
        q: { ru: 'Что делать, если контрагент не подтверждает оплату?', en: 'What if the counterparty does not confirm payment?' },
        a: {
          ru: 'Если вы перевели фиат, но продавец не освобождает крипту в течение 15 минут — откройте диспут и прикрепите чек. Модератор РусКрипто рассмотрит спор в течение 30 минут и завершит сделку в вашу пользу при подтверждении оплаты.',
          en: 'If you transferred fiat but the seller does not release crypto within 15 minutes, open a dispute and attach the receipt. A RusKripto moderator reviews the case within 30 minutes and completes the trade in your favour if payment is confirmed.',
        },
      },
    ],
  },
  // ─── CROSS-BORDER ──────────────────────────────────────────────────────────
  {
    id: 'crossborder-overview',
    section: 'crossborder',
    title: { ru: 'Кросс-бордер платежи', en: 'Cross-border payments' },
    definition: {
      ru: 'Кросс-бордер — международные платежи из РФ в дружественные юрисдикции через криптокоридоры. РусКрипто поддерживает коридоры: RU→CN (Китай), RU→AE (ОАЭ), RU→TR (Турция), RU→IN (Индия), RU→KZ (Казахстан), RU→AM (Армения). Платёж проходит saga-оркестрацию: валютный контроль (173-ФЗ) → ликвидность → конвертация → отправка → расчёт. Каждый статус отслеживается в реальном времени.',
      en: 'Cross-border is international payments from Russia to friendly jurisdictions via crypto corridors. RusKripto supports corridors: RU→CN, RU→AE, RU→TR, RU→IN, RU→KZ, RU→AM. A payment goes through saga orchestration: currency control (173-FZ) → liquidity → conversion → sending → settlement. Each status is tracked in real time.',
    },
    howTo: {
      ru: [
        'Откройте раздел «Кросс-бордер» и нажмите «Новый платёж».',
        'Выберите коридор (например, RU→CN). Укажите валюты: RUB → CNY.',
        'Введите сумму и проверьте расчётную сумму получения с учётом комиссии и курса.',
        'Заполните реквизиты бенефициара: ФИО/название, банк, счёт, SWIFT/IBAN (при наличии).',
        'Укажите назначение платежа. Приложите документы (инвойс, контракт) — обязательно при сумме > 600 000 ₽.',
        'Нажмите «Отправить». Платёж перейдёт в статус INITIATED → CC_PENDING → LIQUIDITY → CONVERTING → SENDING → SETTLED.',
        'В любой момент отслеживайте статус в списке платежей. По завершении — выгрузите SWIFT-MT103.',
      ],
      en: [
        'Open "Cross-border" and click "New payment".',
        'Pick the corridor (e.g. RU→CN). Set currencies: RUB → CNY.',
        'Enter the amount and verify the receive amount after fees and rate.',
        'Fill in beneficiary details: name, bank, account, SWIFT/IBAN if available.',
        'Specify payment purpose. Attach documents (invoice, contract) — mandatory above 600,000 RUB.',
        'Click "Submit". The payment transitions: INITIATED → CC_PENDING → LIQUIDITY → CONVERTING → SENDING → SETTLED.',
        'Track status in the payment list. On completion, download SWIFT MT103.',
      ],
    },
    faq: [
      {
        q: { ru: 'Что такое 173-ФЗ и валютный контроль?', en: 'What is 173-FZ and currency control?' },
        a: {
          ru: 'ФЗ-173 «О валютном регулировании» — основной закон, регулирующий движение капитала. Для платежей > 600 000 ₽ требуется паспорт сделки и подтверждающие документы. РусКрипто автоматически передаёт данные в банк-агент, который формирует валютный контракт в ЦБ.',
          en: 'Federal Law 173-FZ on currency regulation governs capital movement. Payments above 600,000 RUB require a transaction passport and supporting documents. RusKripto automatically submits data to the agent bank, which files the currency contract with the Central Bank.',
        },
      },
      {
        q: { ru: 'Сколько идёт платёж в Китай?', en: 'How long does a payment to China take?' },
        a: {
          ru: 'Среднее время: 2–6 часов. Около 90% платежей завершаются за 4 часа. Задержки возможны на этапе CC_PENDING (валютный контроль) при неполных документах. Статус SENDING означает, что USDT/CNH отправлены, ждём подтверждения корреспондентского банка.',
          en: 'Average time: 2–6 hours. About 90% complete within 4 hours. Delays may occur at CC_PENDING (currency control) when documents are incomplete. SENDING means USDT/CNH has been sent; we wait for the correspondent bank confirmation.',
        },
      },
    ],
  },
  // ─── WALLET ────────────────────────────────────────────────────────────────
  {
    id: 'wallet-overview',
    section: 'wallet',
    title: { ru: 'Кошелёк: депозит и вывод', en: 'Wallet: deposit and withdrawal' },
    definition: {
      ru: 'Кошелёк — единый мультивалютный счёт РусКрипто для хранения криптовалют и фиата. Депозит — пополнение кошелька из внешнего блокчейн-кошелька или банка. Вывод — отправка средств на внешний адрес. Каждый актив поддерживает несколько сетей (BTC, ERC-20, TRC-20, BEP-20). Перед отправкой проверяйте сеть — ошибка приведёт к потере средств.',
      en: 'The wallet is a unified multicurrency RusKripto account for crypto and fiat. Deposit tops up the wallet from an external blockchain wallet or bank. Withdrawal sends funds to an external address. Each asset supports multiple networks (BTC, ERC-20, TRC-20, BEP-20). Always verify the network — a mistake leads to loss of funds.',
    },
    howTo: {
      ru: [
        'Депозит: «Кошелёк» → выберите актив → «Пополнить».',
        'Выберите сеть (BTC / ERC-20 / TRC-20 / BEP-20). Скопируйте адрес или отсканируйте QR.',
        'Отправьте средства с внешнего кошелька по этому адресу в той же сети.',
        'Дождитесь подтверждений сети (BTC — 3, ETH — 12, USDT TRC-20 — 1).',
        'Вывод: «Кошелёк» → актив → «Вывести».',
        'Если включён whitelist — выберите адрес из белого списка (новый адрес доступен через 24ч).',
        'Введите сумму, проверьте комиссию сети и подтвердите через 2FA.',
      ],
      en: [
        'Deposit: "Wallet" → pick the asset → "Deposit".',
        'Choose network (BTC / ERC-20 / TRC-20 / BEP-20). Copy the address or scan the QR.',
        'Send funds from an external wallet to this address on the same network.',
        'Wait for network confirmations (BTC — 3, ETH — 12, USDT TRC-20 — 1).',
        'Withdrawal: "Wallet" → asset → "Withdraw".',
        'If whitelist is on, pick an address from the whitelist (new address is available in 24h).',
        'Enter amount, verify network fee and confirm with 2FA.',
      ],
    },
    faq: [
      {
        q: { ru: 'Что такое whitelist адресов?', en: 'What is the address whitelist?' },
        a: {
          ru: 'Whitelist — список доверенных адресов вывода. При включённой опции вывод возможен только на адреса из списка. Добавление нового адреса замораживается на 24 часа для защиты от взлома аккаунта. Рекомендуется включать всегда.',
          en: 'The whitelist is a list of trusted withdrawal addresses. When enabled, withdrawals go only to addresses from the list. Adding a new address is frozen for 24 hours to protect against account takeover. Recommended to keep enabled.',
        },
      },
      {
        q: { ru: 'Почему депозит не зачисляется?', en: 'Why is my deposit not credited?' },
        a: {
          ru: 'Возможные причины: 1) мало подтверждений сети — подождите; 2) отправили по неверной сети — обратитесь в поддержку немедленно с txid; 3) сумма меньше минимума — зачисление отложено; 4) AML-флаг — средства на карантине до проверки комплаенсом.',
          en: 'Possible reasons: 1) too few network confirmations — wait; 2) sent on the wrong network — contact support immediately with the txid; 3) amount below minimum — credit is postponed; 4) AML flag — funds quarantined pending compliance review.',
        },
      },
    ],
  },
  // ─── PORTFOLIO ─────────────────────────────────────────────────────────────
  {
    id: 'portfolio-overview',
    section: 'portfolio',
    title: { ru: 'Портфель: аналитика активов', en: 'Portfolio: asset analytics' },
    definition: {
      ru: 'Портфель — агрегированный обзор всех ваших активов на платформе. Показывает аллокацию по активам, общую стоимость в ₽ и $, нереализованный и реализованный PnL, историю эквити. Доступны налоговые отчёты 3-НДФЛ и экспорт сделок в CSV. История эквити строится на основе сделок и транзакций с replay-механизмом по историческим ценам.',
      en: 'Portfolio is an aggregated view of all your assets on the platform. It shows allocation by asset, total value in RUB and USD, unrealized and realized PnL, and equity history. Tax reports 3-NDFL and CSV export are available. Equity history is reconstructed from trades and transactions via a replay mechanism.',
    },
    howTo: {
      ru: [
        'Откройте раздел «Портфель». Наверху — общая стоимость и PnL.',
        'Раздел «Аллокация» — диаграмма распределения активов. Клик по сектору — детали.',
        'Вкладка «История» — кривая эквити за период (1д / 7д / 30д / 90д / 1г).',
        'Вкладка «Налоги» — генерация 3-НДФЛ за выбранный год. PDF готов к подаче в ФНС.',
        'Вкладка «Сделки» — список всех сделок. Кнопка «Экспорт CSV» — выгрузка в Excel/Google Sheets.',
        'Нереализованный PnL считается по средней цене входа и текущей котировке.',
      ],
      en: [
        'Open "Portfolio". At the top — total value and PnL.',
        'The "Allocation" section is a pie chart of asset distribution. Click a slice for details.',
        'The "History" tab is the equity curve for the period (1d / 7d / 30d / 90d / 1y).',
        'The "Taxes" tab generates 3-NDFL for the chosen year. PDF is ready for the tax authority.',
        'The "Trades" tab lists all trades. The "Export CSV" button downloads for Excel/Google Sheets.',
        'Unrealized PnL is computed from average entry price and the current quote.',
      ],
    },
    faq: [
      {
        q: { ru: 'Как считается PnL?', en: 'How is PnL calculated?' },
        a: {
          ru: 'Реализованный PnL = (цена продажи − средняя цена покупки) × количество − комиссии. Нереализованный PnL = (текущая цена − средняя цена покупки) × количество. Для short-позиций — наоборот. PnL в ₽ пересчитывается по текущему курсу USDT/RUB.',
          en: 'Realized PnL = (sell price − average buy price) × quantity − fees. Unrealized PnL = (current price − average buy price) × quantity. For short positions, reversed. PnL in RUB is converted at the current USDT/RUB rate.',
        },
      },
    ],
  },
  // ─── ANALYTICS ─────────────────────────────────────────────────────────────
  {
    id: 'analytics-overview',
    section: 'analytics',
    title: { ru: 'Аналитика платформы', en: 'Platform analytics' },
    definition: {
      ru: 'Аналитика — раздел с ключевыми KPI платформы в реальном времени: торговый объём, активные пользователи, открытые позиции, комиссии. Доступны графики: распределение по парам, объём по коридорам, активность по часам. Источники данных: БД trades/payments, биржевые котировки, агрегированные метрики ЦБ РФ. Все значения обновляются каждые 20 секунд.',
      en: 'Analytics is a real-time KPI dashboard: trading volume, active users, open positions, fees. Charts include pair distribution, volume by corridor, hourly activity. Data sources: trades/payments DB, exchange quotes, aggregated Central Bank metrics. Values refresh every 20 seconds.',
    },
    howTo: {
      ru: [
        'Откройте раздел «Аналитика». 4 KPI-карты вверху — мгновенные метрики.',
        'Переключатель периода (1ч / 24ч / 7д / 30д) меняет агрегацию всех графиков.',
        'График «Объём по парам» — распределение торгов по криптовалютам в %.',
        'График «Коридоры» — объём кросс-бордер платежей по направлениям.',
        '«Активность по часам» — гистограмма торгов и регистраций за сутки.',
        'TradingView BTCUSDT — живой график топ-пары с интервалами 1m–1W.',
      ],
      en: [
        'Open "Analytics". Four KPI cards at the top are instant metrics.',
        'The period switch (1h / 24h / 7d / 30d) re-aggregates all charts.',
        'The "Volume by pair" chart shows crypto distribution in %.',
        'The "Corridors" chart shows cross-border payment volume by direction.',
        'The "Hourly activity" histogram shows trades and registrations over 24h.',
        'TradingView BTCUSDT is a live chart of the top pair, intervals 1m–1W.',
      ],
    },
    faq: [
      {
        q: { ru: 'Откуда берутся рыночные данные?', en: 'Where do market data come from?' },
        a: {
          ru: 'Котировки криптовалют — агрегированный Binance API (fallback на Coinbase/Kraken при недоступности). Курс USDT/RUB — средневзвешенный по P2P-площадкам и ЦБ РФ. Коридоры — внутренние данные РусКрипто. Задержка данных < 5 секунд.',
          en: 'Crypto quotes are aggregated from the Binance API (fallback to Coinbase/Kraken). The USDT/RUB rate is a weighted average from P2P platforms and the Central Bank of Russia. Corridors are internal RusKripto data. Latency is under 5 seconds.',
        },
      },
    ],
  },
  // ─── KYC ───────────────────────────────────────────────────────────────────
  {
    id: 'kyc-overview',
    section: 'kyc',
    title: { ru: 'Верификация личности (KYC)', en: 'Identity verification (KYC)' },
    definition: {
      ru: 'KYC (Know Your Customer) — обязательная процедура идентификации для всех пользователей РусКрипто в соответствии с ФЗ-115 и требованиями ЦБ РФ. Уровни: L0 (email, лимит 0 ₽) — только просмотр; L1 (Госуслуги/ЕСИА — паспорт+СНИЛС, лимит 100 000 ₽/мес); L2 (доп. селфи с документом и подтверждение адреса, лимит 1 000 000 ₽/мес и доступ к марже). Квалифицированный инвестор — отдельный статус для маржи 20x и крупных сумм.',
      en: 'KYC (Know Your Customer) is mandatory identity verification for all RusKripto users per 115-FZ and Central Bank requirements. Levels: L0 (email, limit 0 RUB) — view only; L1 (Gosuslugi/ESIA — passport+SNILS, limit 100,000 RUB/month); L2 (extra selfie with document and proof of address, limit 1,000,000 RUB/month and margin access). Qualified investor is a separate status for 20x margin and large amounts.',
    },
    howTo: {
      ru: [
        'Откройте раздел «Верификация». Текущий уровень показан в шапке.',
        'Для L1 нажмите «Войти через Госуслуги (ЕСИА)» и авторизуйтесь на портале.',
        'Подтвердите согласие на передачу данных (паспорт, СНИЛС, ИНН) в РусКрипто.',
        'L1 присваивается автоматически в течение 30 секунд.',
        'Для L2 — загрузите селфи с разворотом паспорта и селфи с геометкой (адрес).',
        'Приложите коммунальную счёт-фактуру или выписку из банка не старше 3 месяцев.',
        'L2 проверяется вручную комплаенс-офицером в течение 1 рабочего дня.',
        'Для статуса «Квалифицированный инвестор» — приложите брокерский отчёт или справку из банка.',
      ],
      en: [
        'Open "Verification". Current level is shown in the header.',
        'For L1 click "Sign in via Gosuslugi (ESIA)" and authorize on the portal.',
        'Consent to data transfer (passport, SNILS, INN) to RusKripto.',
        'L1 is granted automatically within 30 seconds.',
        'For L2 — upload a selfie with the open passport and a selfie with a geotag (address).',
        'Attach a utility bill or bank statement not older than 3 months.',
        'L2 is reviewed manually by a compliance officer within 1 business day.',
        'For "Qualified investor" status attach a broker report or a bank certificate.',
      ],
    },
    faq: [
      {
        q: { ru: 'Что такое address-identifier (идентификатор адреса)?', en: 'What is an address-identifier?' },
        a: {
          ru: 'Address-identifier — это привязка адреса регистрации к аккаунту через селфи с геометкой и подтверждение документа. Требуется для L2. Используется в AML-проверках и для соответствия 215-ФЗ о противодействии финансированию терроризма.',
          en: 'An address-identifier links your registration address to the account via a geotagged selfie and document proof. Required for L2. Used in AML checks and 215-FZ counter-terrorism financing compliance.',
        },
      },
      {
        q: { ru: 'Безопасно ли передавать данные через Госуслуги?', en: 'Is it safe to share data via Gosuslugi?' },
        a: {
          ru: 'Да. Авторизация через ЕСИА выполняется на стороне портала Госуслуг — РусКрипто не видит ваш пароль. Мы получаем только те данные, на которые вы явно согласились. Передача шифруется TLS 1.3, данные хранятся в зашифрованном виде в аттестованной системе.',
          en: 'Yes. ESIA authorization runs on the Gosuslugi portal side — RusKripto never sees your password. We receive only the data you explicitly consented to. Transfer is encrypted with TLS 1.3, data is stored encrypted in a certified system.',
        },
      },
    ],
  },
  // ─── COMPLIANCE ────────────────────────────────────────────────────────────
  {
    id: 'compliance-overview',
    section: 'compliance',
    title: { ru: 'Комплаенс и AML', en: 'Compliance and AML' },
    definition: {
      ru: 'Комплаенс — это соблюдение требований ФЗ-115 (противодействие отмыванию доходов), ФАТФ и нормативов ЦБ РФ. AML (Anti-Money Laundering) — автоматический анализ входящих транзакций по цепочке блокчейна. При срабатывании правила (миксер, даркнет, санкции) создаётся комплаенс-алерт с risk score и SHAP-объяснением модели. Алерт проходит статусы: OPEN → REVIEWING → APPROVED/REJECTED/SAR. SAR — Suspicious Activity Report в Росфинмониторинг.',
      en: 'Compliance is adherence to 115-FZ (anti-money laundering), FATF and Central Bank rules. AML (Anti-Money Laundering) is automated analysis of incoming transactions along the blockchain chain. When a rule fires (mixer, darknet, sanctions), a compliance alert is created with a risk score and SHAP model explanation. Alerts transition: OPEN → REVIEWING → APPROVED/REJECTED/SAR. SAR is a Suspicious Activity Report to Rosfinmonitoring.',
    },
    howTo: {
      ru: [
        'Откройте раздел «Комплаенс». Виден только при роли COMPLIANCE/ADMIN.',
        'Список алертов с фильтром по severity (LOW/MEDIUM/HIGH/CRITICAL) и статусу.',
        'Клик по алерту — детали: тип правила, risk score, SHAP-вкладки признаков.',
        'SHAP показывает, какие факторы повысили риск (например, 45% — связь с миксером).',
        'Действия: Approve (ложное срабатывание), Reject (заблокировать), Escalate (передать СБ), SAR (рапорт в Росфинмониторинг).',
        'Карантин: средства замораживаются до завершения проверки. Пользователь получает уведомление.',
        '115-ФЗ: при сумме > 600 000 ₽ обязательна идентификация и хранение документов 5 лет.',
      ],
      en: [
        'Open "Compliance". Visible only with the COMPLIANCE/ADMIN role.',
        'Alert list with filters by severity (LOW/MEDIUM/HIGH/CRITICAL) and status.',
        'Click an alert for details: rule type, risk score, SHAP feature contributions.',
        'SHAP shows which factors raised the risk (e.g. 45% — mixer connection).',
        'Actions: Approve (false positive), Reject (block), Escalate (escalate to security), SAR (report to Rosfinmonitoring).',
        'Quarantine: funds are frozen until review completes. The user receives a notification.',
        '115-FZ: above 600,000 RUB identification is mandatory and documents are kept for 5 years.',
      ],
    },
    faq: [
      {
        q: { ru: 'Что такое SHAP-объяснение?', en: 'What is a SHAP explanation?' },
        a: {
          ru: 'SHAP (SHapley Additive exPlanations) — метод объяснимого ИИ, показывающий вклад каждого признака в прогноз модели. Например, модель присвоила risk score 0.87; SHAP показывает: 0.45 — связь с миксером, 0.20 — высокая транзакция, 0.12 — новый адрес. Это делает решения комплаенса прозрачными и оспоримыми.',
          en: 'SHAP (SHapley Additive exPlanations) is an explainable AI method showing each feature\'s contribution to the model prediction. E.g. the model assigned risk score 0.87; SHAP shows: 0.45 — mixer link, 0.20 — high transaction, 0.12 — new address. This makes compliance decisions transparent and contestable.',
        },
      },
      {
        q: { ru: 'Что делать, если мой платёж попал в карантин?', en: 'What to do if my payment is quarantined?' },
        a: {
          ru: 'Не паникуйте. Карантин — стандартная процедура при AML-флаге. Откройте тикет в поддержке, приложите происхождение средств (договор продажи, зарплатные выписки). Комплаенс-офицер рассмотрит в течение 24 часов. Если происхождение подтверждено — средства разблокируются.',
          en: 'Do not panic. Quarantine is a standard AML procedure. Open a support ticket and attach proof of source of funds (sale contract, salary statements). A compliance officer reviews within 24 hours. If the source is confirmed, the funds are released.',
        },
      },
    ],
  },
  // ─── MARKETS ───────────────────────────────────────────────────────────────
  {
    id: 'markets-overview',
    section: 'markets',
    title: { ru: 'Рынки: обзор и алерты', en: 'Markets: overview and alerts' },
    definition: {
      ru: 'Рынки — список всех торговых пар с котировками, изменением за 24ч, объёмом и спарклайн-микрографиком. Можно добавить пару в избранное (звёздочка) для быстрого доступа. Доступны ценовые алерты: уведомление, когда цена пересекает заданный порог сверху или снизу. Алерты срабатывают в реальном времени и приходят в центр уведомлений.',
      en: 'Markets is a list of all trading pairs with quotes, 24h change, volume and a sparkline micro-chart. You can favourite a pair (star) for quick access. Price alerts notify when the price crosses a threshold above or below. Alerts trigger in real time and appear in the notification center.',
    },
    howTo: {
      ru: [
        'Откройте раздел «Рынки». Поиск по символу или названию.',
        'Звёздочка слева — добавить в избранное. Избранное показывается первым.',
        'Клик по строке — переход в «Торги» с выбранной парой.',
        'Ценовой алерт: иконка колокольчика в строке пары или кнопка «Создать алерт».',
        'Укажите условие: «Выше» или «Ниже», целевую цену и заметку.',
        'Алерты хранятся в «Рынки → Активные алерты». Сработавшие помечаются.',
      ],
      en: [
        'Open "Markets". Search by symbol or name.',
        'Star on the left — add to favourites. Favourites are shown first.',
        'Click a row to go to "Trade" with that pair.',
        'Price alert: bell icon in the row or "Create alert" button.',
        'Set condition: "Above" or "Below", target price and a note.',
        'Alerts are stored in "Markets → Active alerts". Triggered ones are flagged.',
      ],
    },
    faq: [
      {
        q: { ru: 'Что такое sparkline?', en: 'What is a sparkline?' },
        a: {
          ru: 'Sparkline — маленький линейный микрографик последних 24 значений цены. Показывает краткосрочный тренд без осей. Цвет: зелёный — рост, красный — падение за период.',
          en: 'A sparkline is a small line micro-chart of the last 24 price values. It shows the short-term trend without axes. Colour: green — up, red — down over the period.',
        },
      },
    ],
  },
  // ─── NEWS ──────────────────────────────────────────────────────────────────
  {
    id: 'news-overview',
    section: 'news',
    title: { ru: 'Новости и анонсы', en: 'News and announcements' },
    definition: {
      ru: 'Новости — лента событий платформы и крипторынка. Категории: Регуляторика (ЦБ РФ, Минфин, Госдума), Рынок (BTC, ETH, альтики), Платформа (обновления РусКрипто), Партнёрство (банки, провайдеры ликвидности). Закреплённые материалы показываются вверху. В шапке всех страниц — бегущая строка последних 5 новостей.',
      en: 'News is a feed of platform and crypto-market events. Categories: Regulation (CBR, Minfin, State Duma), Market (BTC, ETH, alts), Platform (RusKripto updates), Partnership (banks, liquidity providers). Pinned items are shown at the top. The header ticker on every page shows the latest 5 news.',
    },
    howTo: {
      ru: [
        'Откройте раздел «Новости». Лента обновляется в реальном времени.',
        'Фильтр по категориям — вкладки под шапкой.',
        'Поиск по заголовку, описанию или источнику — поле справа.',
        'Закреплённые новости — крупные карточки вверху (если фильтр = Все и нет поиска).',
        'Клик по «Читать» — переход на первоисточник.',
      ],
      en: [
        'Open "News". The feed updates in real time.',
        'Filter by category — tabs below the header.',
        'Search by title, summary or source — field on the right.',
        'Pinned news — large cards at the top (when filter is All and no search).',
        'Click "Read" to open the original source.',
      ],
    },
    faq: [
      {
        q: { ru: 'Откуда берутся новости?', en: 'Where do news come from?' },
        a: {
          ru: 'Источники: официальные пресс-релизы ЦБ РФ, Минфина, Riypto-агрегаторы (CoinDesk, РБК-Крипто, ForkLog), собственная редакция РусКрипто. Все материалы проверяются модератором перед публикацией. Источник указан в каждой новости.',
          en: 'Sources: official press releases of CBR, Minfin, crypto aggregators (CoinDesk, RBC-Crypto, ForkLog), RusKripto own editorial. All items are reviewed by a moderator before publishing. The source is shown for each news item.',
        },
      },
    ],
  },
  // ─── SECURITY ──────────────────────────────────────────────────────────────
  {
    id: 'security-overview',
    section: 'security',
    title: { ru: 'Безопасность аккаунта', en: 'Account security' },
    definition: {
      ru: 'Безопасность — комплекс мер для защиты аккаунта: 2FA (TOTP через Google Authenticator), anti-phishing код в письмах, история входов, активные сессии, whitelist вывода. РусКрипто использует TLS 1.3, шифрование данных at-rest (AES-256), HSM для ключей. При подозрительной активности аккаунт автоматически замораживается с уведомлением пользователя.',
      en: 'Security is a set of account-protection measures: 2FA (TOTP via Google Authenticator), anti-phishing code in emails, login history, active sessions, withdrawal whitelist. RusKripto uses TLS 1.3, AES-256 at-rest encryption, HSM for keys. On suspicious activity the account is frozen automatically with user notification.',
    },
    howTo: {
      ru: [
        'Профиль → Настройки → Безопасность.',
        '2FA: отсканируйте QR в Google Authenticator, введите код для подтверждения. Сохраните backup-коды.',
        'Anti-phishing: задайте уникальный код. Все письма от РусКрипто будут содержать его — если кода нет, письмо фишинговое.',
        'История входов: список последних 20 входов с IP, устройством, временем. Незнакомый вход — немедленно смените пароль.',
        'Активные сессии: завершайте чужие сессии одной кнопкой.',
        'Whitelist вывода: включите и добавьте доверенные адреса. Новые адреса — 24 часа задержки.',
        'При подозрении на взлом: Профиль → «Заблокировать аккаунт» → поддержка разблокирует после видео-верификации.',
      ],
      en: [
        'Profile → Settings → Security.',
        '2FA: scan the QR in Google Authenticator, enter the code to confirm. Save backup codes.',
        'Anti-phishing: set a unique code. All RusKripto emails contain it — if missing, the email is phishing.',
        'Login history: list of the last 20 logins with IP, device, time. Unknown login — change password immediately.',
        'Active sessions: end foreign sessions with one click.',
        'Withdrawal whitelist: enable and add trusted addresses. New addresses — 24h delay.',
        'If you suspect a hack: Profile → "Lock account" → support unlocks after video verification.',
      ],
    },
    faq: [
      {
        q: { ru: 'Что делать, если потерял телефон с 2FA?', en: 'What if I lost the phone with 2FA?' },
        a: {
          ru: 'Используйте один из backup-кодов, выданных при настройке. Если кодов нет — подайте заявку в поддержку с видео-селфи и документом. Сброс 2FA занимает до 3 рабочих дней в целях безопасности.',
          en: 'Use one of the backup codes issued during setup. If you do not have them — file a support ticket with a video selfie and your document. 2FA reset takes up to 3 business days for security reasons.',
        },
      },
      {
        q: { ru: 'Как распознать фишинговое письмо от имени РусКрипто?', en: 'How to spot a phishing email pretending to be RusKripto?' },
        a: {
          ru: '1) Проверьте anti-phishing код — если его нет, письмо не от нас. 2) Домен отправителя должен быть @ruscrypto.ru (не @ruscrypto-support.ru и т.п.). 3) Мы никогда не просим пароль или 2FA-код в письме. 4) При сомнении откройте платформу напрямую и проверьте уведомления.',
          en: '1) Check the anti-phishing code — if missing, the email is not from us. 2) Sender domain must be @ruscrypto.ru (not @ruscrypto-support.ru etc.). 3) We never ask for your password or 2FA code by email. 4) In doubt, open the platform directly and check notifications.',
        },
      },
    ],
  },
  // ─── SPOT — третий артикул про комиссии (дополнительный) ─────────────────
  {
    id: 'spot-fees',
    section: 'spot',
    title: { ru: 'Комиссии и лимиты на споте', en: 'Spot fees and limits' },
    definition: {
      ru: 'Структура комиссий РусКрипто прозрачна: maker/taker на споте, отдельные ставки на маржу (funding rate), P2P без комиссии, кросс-бордер с плавающей ставкой. Лимиты зависят от уровня KYC: L0 — 0 ₽, L1 — 100 000 ₽/мес, L2 — 1 000 000 ₽/мес, Квал. инвестор — без лимита. Вывод крипты ограничен 24-часовым лимитом по уровню.',
      en: 'RusKripto has a transparent fee structure: maker/taker on spot, separate margin funding rate, fee-free P2P, floating cross-border rate. Limits depend on KYC level: L0 — 0 RUB, L1 — 100,000 RUB/month, L2 — 1,000,000 RUB/month, Qualified investor — no limit. Crypto withdrawals are subject to a 24h limit by level.',
    },
    howTo: {
      ru: [
        'Текущие комиссии видны под кнопкой ордера в «Торгах».',
        'Для снижения комиссии: 1) держите RUB-токен на балансе, 2) пройдите L2, 3) используйте лимитные ордера (maker).',
        'Лимиты на вывод: L1 — 100 000 ₽/сутки, L2 — 500 000 ₽/сутки, Квал. — 5 000 000 ₽/сутки.',
        'История комиссий — в «Портфель → Сделки» (столбец fee).',
      ],
      en: [
        'Current fees are shown under the order button in "Trade".',
        'To reduce fees: 1) hold the RUB token, 2) complete L2, 3) use limit orders (maker).',
        'Withdrawal limits: L1 — 100,000 RUB/day, L2 — 500,000 RUB/day, Qual. — 5,000,000 RUB/day.',
        'Fee history is in "Portfolio → Trades" (fee column).',
      ],
    },
    faq: [
      {
        q: { ru: 'Что такое funding rate на марже?', en: 'What is the margin funding rate?' },
        a: {
          ru: 'Funding rate — плата за удержание маржинальной позиции каждые 8 часов. Положительный rate платят long-позиции short-позициям (и наоборот). Размер зависит от перекоса рынка. На споте funding нет.',
          en: 'The funding rate is the fee for holding a margin position every 8 hours. A positive rate is paid by longs to shorts (and vice versa). The size depends on market skew. Spot has no funding.',
        },
      },
    ],
  },
  // ─── WALLET — второй артикул про сети ─────────────────────────────────────
  {
    id: 'wallet-networks',
    section: 'wallet',
    title: { ru: 'Сети и подтверждения', en: 'Networks and confirmations' },
    definition: {
      ru: 'USDT поддерживает 4 сети: TRC-20 (Tron, быстрая и дешёвая), ERC-20 (Ethereum, медленная и дорогая, но универсальная), BEP-20 (BSC, баланс скорости и комиссии), OMNI (устаревшая, не рекомендуется). BTC — только BTC-сеть. ETH — ERC-20. BNB — BEP-20. SOL — Solana. Перед выводом всегда сверяйте сеть отправителя и получателя.',
      en: 'USDT supports 4 networks: TRC-20 (Tron, fast and cheap), ERC-20 (Ethereum, slow and expensive, but universal), BEP-20 (BSC, balanced), OMNI (legacy, not recommended). BTC is BTC-network only. ETH is ERC-20. BNB is BEP-20. SOL is Solana. Always verify the sender and receiver network before withdrawing.',
    },
    howTo: {
      ru: [
        'Перед пополнением проверьте, какая сеть указана у получателя (в РусКрипто).',
        'В «Кошелёк → Пополнить» выберите сеть — адрес генерируется для неё.',
        'Не отправляйте USDT TRC-20 на адрес ERC-20 — средства будут потеряны безвозвратно.',
        'Минимальная сумма депозита и комиссия вывода указаны для каждой сети в интерфейсе.',
      ],
      en: [
        'Before depositing, check which network the receiver specified (in RusKripto).',
        'In "Wallet → Deposit" pick the network — an address is generated for it.',
        'Do not send USDT TRC-20 to an ERC-20 address — funds will be irreversibly lost.',
        'Minimum deposit and withdrawal fee are shown for each network in the UI.',
      ],
    },
    faq: [
      {
        q: { ru: 'Какую сеть выбрать для перевода USDT?', en: 'Which USDT network should I pick?' },
        a: {
          ru: 'Для переводов между биржами — TRC-20 (комиссия ~1 USDT, скорость 1-2 мин). Для DeFi-кошельков MetaMask — ERC-20 (Ethereum). Для BSC-DeFi — BEP-20. Универсального правила нет — зависит от кошелька получателя.',
          en: 'For transfers between exchanges — TRC-20 (fee ~1 USDT, 1-2 min). For MetaMask DeFi wallets — ERC-20 (Ethereum). For BSC DeFi — BEP-20. There is no universal rule — it depends on the receiver wallet.',
        },
      },
    ],
  },
]

// Краткое описание разделов для системного промпта ИИ-консультанта
export const SECTION_SUMMARIES: Record<HelpSection, { ru: string; en: string }> = {
  spot: {
    ru: 'Спот-торги: рыночные/лимитные ордера, стакан, price-time priority, maker/taker комиссии 0.1%/0.2%, TIF (GTC/IOC/FOK).',
    en: 'Spot trading: market/limit orders, order book, price-time priority, maker/taker fees 0.1%/0.2%, TIF (GTC/IOC/FOK).',
  },
  margin: {
    ru: 'Маржинальная торговля: плечо до 20x, long/short, цена ликвидации, margin ratio, margin call при 80%, поддерживающая маржа 0.5%.',
    en: 'Margin trading: leverage up to 20x, long/short, liquidation price, margin ratio, margin call at 80%, 0.5% maintenance margin.',
  },
  p2p: {
    ru: 'P2P: прямая торговля между пользователями с эскроу. СБП, Сбербанк, Тинькофф, ВТБ. Диспуты через модератора за 30 мин.',
    en: 'P2P: peer-to-peer trading with escrow. SBP, Sberbank, Tinkoff, VTB. Disputes resolved by a moderator in 30 min.',
  },
  crossborder: {
    ru: 'Кросс-бордер: коридоры RU-CN/AE/TR/IN/KZ/AM. Saga: валютный контроль 173-ФЗ → ликвидность → конвертация → отправка → расчёт. SWIFT MT103.',
    en: 'Cross-border: corridors RU-CN/AE/TR/IN/KZ/AM. Saga: 173-FZ currency control → liquidity → conversion → sending → settlement. SWIFT MT103.',
  },
  wallet: {
    ru: 'Кошелёк: мультивалютный. Сети: BTC, ERC-20, TRC-20, BEP-20. Подтверждения: BTC 3, ETH 12, USDT TRC-20 1. Whitelist 24ч.',
    en: 'Wallet: multicurrency. Networks: BTC, ERC-20, TRC-20, BEP-20. Confirmations: BTC 3, ETH 12, USDT TRC-20 1. Whitelist 24h.',
  },
  portfolio: {
    ru: 'Портфель: аллокация, PnL (реализованный/нереализованный), кривая эквити, 3-НДФЛ PDF, экспорт CSV.',
    en: 'Portfolio: allocation, PnL (realized/unrealized), equity curve, 3-NDFL PDF, CSV export.',
  },
  analytics: {
    ru: 'Аналитика: KPI (объём, юзеры, позиции, комиссии). Графики по парам/коридорам/часам. Источники: Binance API, ЦБ РФ. Обновление 20с.',
    en: 'Analytics: KPIs (volume, users, positions, fees). Charts by pair/corridor/hour. Sources: Binance API, CBR. 20s refresh.',
  },
  kyc: {
    ru: 'KYC: L0/L1/L2. Госуслуги ЕСИА для L1. L2 — селфи с документом + подтверждение адреса. Квалифицированный инвестор для маржи 20x.',
    en: 'KYC: L0/L1/L2. Gosuslugi ESIA for L1. L2 — selfie with document + address proof. Qualified investor for 20x margin.',
  },
  compliance: {
    ru: 'Комплаенс: AML-анализ блокчейна, SHAP-объяснения, алерты OPEN→REVIEWING→SAR. Карантин. 115-ФЗ (свыше 600 000 ₽).',
    en: 'Compliance: AML blockchain analysis, SHAP explanations, alerts OPEN→REVIEWING→SAR. Quarantine. 115-FZ (above 600,000 RUB).',
  },
  markets: {
    ru: 'Рынки: котировки, 24h change, объём, sparkline. Избранное звёздочкой. Ценовые алерты выше/ниже.',
    en: 'Markets: quotes, 24h change, volume, sparkline. Favourites by star. Price alerts above/below.',
  },
  news: {
    ru: 'Новости: Регуляторика / Рынок / Платформа / Партнёрство. Бегущая строка в шапке. Источники: ЦБ РФ, CoinDesk, ForkLog.',
    en: 'News: Regulation / Market / Platform / Partnership. Ticker in header. Sources: CBR, CoinDesk, ForkLog.',
  },
  security: {
    ru: 'Безопасность: 2FA TOTP, anti-phishing код, история входов, активные сессии, whitelist вывода, TLS 1.3, AES-256, HSM.',
    en: 'Security: 2FA TOTP, anti-phishing code, login history, active sessions, withdrawal whitelist, TLS 1.3, AES-256, HSM.',
  },
}
