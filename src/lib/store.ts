import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { Locale } from './i18n'
import type {
  ViewId,
  Currency,
  Balance,
  Trade,
  Transaction,
  P2POffer,
  P2PDeal,
  CrossBorderPayment,
  ComplianceAlert,
  OrderSide,
  OrderType,
  KycLevel,
  MarginPosition,
  MarginSide,
  PriceAlert,
  PriceAlertCondition,
  NewsItem,
} from './types'

const uid = () => Math.random().toString(36).slice(2, 11)
const now = () => new Date().toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })

interface PlaceOrderInput {
  pair: string
  side: OrderSide
  type: OrderType
  price: number
  quantity: number
}

interface OpenMarginInput {
  pair: string
  side: MarginSide
  leverage: number
  margin: number
  entryPrice: number
}

interface AddPriceAlertInput {
  symbol: string
  condition: PriceAlertCondition
  targetPrice: number
  note?: string
}

const MAINT_MARGIN_RATE = 0.005 // 0.5% поддерживающая маржа

function computeLiquidationPrice(side: MarginSide, entry: number, leverage: number): number {
  // long: entry * (1 - 1/leverage + maint)
  // short: entry * (1 + 1/leverage - maint)
  if (side === 'long') {
    return entry * (1 - 1 / leverage + MAINT_MARGIN_RATE)
  }
  return entry * (1 + 1 / leverage - MAINT_MARGIN_RATE)
}

interface AppState {
  // navigation
  activeView: ViewId
  setView: (v: ViewId) => void

  // sidebar collapse (desktop)
  sidebarCollapsed: boolean
  toggleSidebar: () => void
  setSidebarCollapsed: (v: boolean) => void

  currency: Currency
  setCurrency: (c: Currency) => void

  locale: Locale
  setLocale: (l: Locale) => void

  // module toggles (админ может отключать модули)
  enabledModules: { p2p: boolean; crossBorder: boolean }
  setModuleEnabled: (module: 'p2p' | 'crossBorder', enabled: boolean) => void

  // auth (демо)
  isAuthed: boolean
  userEmail: string | null
  userName: string | null
  userRole: string
  userId: string | null
  userBankId: string | null
  userBankName: string | null
  login: (email: string, name?: string, role?: string, id?: string, bankId?: string, bankName?: string) => void
  logout: () => void

  // kyc
  kycLevel: KycLevel
  kycStatus: string
  setKyc: (level: KycLevel, status: string) => void

  // balances
  balances: Balance[]
  // trading
  selectedPair: string
  setSelectedPair: (p: string) => void
  orders: Trade[] // история сделок (используется как trade history)
  placeOrder: (o: PlaceOrderInput) => Trade
  openOrders: Trade[]
  // wallet
  depositAddress: string
  generateDepositAddress: (asset: string, network: string) => string
  withdraw: (asset: string, amount: number, address: string) => void
  transactions: Transaction[]
  addTransaction: (t: Omit<Transaction, 'id' | 'time'>) => void
  // p2p
  p2pOffers: P2POffer[]
  addP2POffer: (o: Omit<P2POffer, 'id' | 'completed'>) => void
  p2pDeals: P2PDeal[]
  acceptP2POffer: (offer: P2POffer) => void
  updateDealStatus: (id: string, status: P2PDeal['status']) => void
  // cross-border
  payments: CrossBorderPayment[]
  createPayment: (p: Omit<CrossBorderPayment, 'id' | 'createdAt' | 'status'>) => string
  updatePaymentStatus: (id: string, status: CrossBorderPayment['status']) => void
  // compliance
  alerts: ComplianceAlert[]
  reviewAlert: (id: string, status: ComplianceAlert['status']) => void
  // notifications feed
  notifications: { id: string; title: string; body: string; time: string; read: boolean }[]
  pushNotification: (title: string, body: string) => void
  markNotificationsRead: () => void
  // margin trading
  marginPositions: MarginPosition[]
  marginAccount: { equity: number; usedMargin: number; availableMargin: number }
  openMarginPosition: (input: OpenMarginInput) => MarginPosition
  closeMarginPosition: (id: string, closePrice: number) => void
  liquidatePosition: (id: string) => void
  updateMarginPrices: (prices: Record<string, number>) => void
  // price alerts
  priceAlerts: PriceAlert[]
  addPriceAlert: (input: AddPriceAlertInput) => void
  removePriceAlert: (id: string) => void
  togglePriceAlert: (id: string) => void
  markPriceAlertTriggered: (id: string) => void
  // news feed (static seed, no API)
  newsItems: NewsItem[]
}

const INITIAL_BALANCES: Balance[] = [
  { asset: 'RUB', amount: 1245800 },
  { asset: 'USDT', amount: 2450.75 },
  { asset: 'BTC', amount: 0.1245, locked: 0 },
  { asset: 'ETH', amount: 3.45 },
]

const INITIAL_OFFERS: P2POffer[] = (() => {
  const users = ['CryptoKing', 'RubTrader', 'FastP2P', 'SberExchange', 'TinkoffPro', 'QuickSwap', 'MskBank', 'CryptoFlow']
  const methods = ['СБП', 'Тинькофф', 'Сбер', 'СБП + Тинькофф']
  return Array.from({ length: 24 }, (_, i) => {
    const type: OrderSide = Math.random() > 0.5 ? 'buy' : 'sell'
    const price = parseFloat((92 + Math.random() * 2.5).toFixed(2))
    const amount = Math.floor(Math.random() * 8000) + 200
    return {
      id: uid(),
      type,
      asset: 'USDT',
      fiat: 'RUB',
      price,
      amount,
      user: users[i % users.length],
      method: methods[i % methods.length],
      completed: Math.floor(Math.random() * 400) + 15,
      rating: 4.5 + Math.random() * 0.5,
    }
  })
})()

const INITIAL_DEALS: P2PDeal[] = [
  {
    id: uid(),
    type: 'buy',
    asset: 'USDT',
    amount: 500,
    price: 93.7,
    total: 46850,
    counterparty: 'CryptoKing',
    paymentMethod: 'СБП',
    status: 'PENDING',
    time: '19:12',
  },
  {
    id: uid(),
    type: 'sell',
    asset: 'USDT',
    amount: 300,
    price: 94.2,
    total: 28260,
    counterparty: 'RubTrader',
    paymentMethod: 'Тинькофф',
    status: 'PAID',
    time: '18:45',
  },
]

const INITIAL_ALERTS: ComplianceAlert[] = [
  {
    id: uid(),
    type: 'STRUCTURING',
    severity: 'HIGH',
    riskScore: 0.87,
    description: 'Серия из 5 выводов по 95 000 ₽ за 18 минут — признаки структурирования (115-ФЗ ст.6).',
    entityType: 'withdrawal',
    status: 'OPEN',
    ruleId: 'R-STRUCT-001',
    createdAt: new Date(Date.now() - 1000 * 60 * 22).toISOString(),
    shap: [
      { feature: 'Кол-во операций за час', contribution: 0.31 },
      { feature: 'Сумма около порога 100К', contribution: 0.24 },
      { feature: 'Новый адрес получателя', contribution: 0.18 },
      { feature: 'Время суток (ночь)', contribution: 0.14 },
    ],
  },
  {
    id: uid(),
    type: 'VELOCITY',
    severity: 'MEDIUM',
    riskScore: 0.64,
    description: 'Вход на 4 новых устройства за 12 минут из разных гео (RU → KZ → AE).',
    entityType: 'user',
    status: 'OPEN',
    ruleId: 'R-VEL-002',
    createdAt: new Date(Date.now() - 1000 * 60 * 55).toISOString(),
    shap: [
      { feature: 'Гео-расстояние входов', contribution: 0.29 },
      { feature: 'Новые устройства', contribution: 0.21 },
      { feature: 'Скорость смены IP', contribution: 0.14 },
    ],
  },
  {
    id: uid(),
    type: 'SANCTION',
    severity: 'CRITICAL',
    riskScore: 0.96,
    description: 'Совпадение бенефициара со списком Росфинмониторинга (match score 0.96).',
    entityType: 'transaction',
    status: 'OPEN',
    ruleId: 'R-SANC-001',
    createdAt: new Date(Date.now() - 1000 * 60 * 120).toISOString(),
    shap: [
      { feature: 'Fuzzy match ФИО', contribution: 0.42 },
      { feature: 'Совпадение банка', contribution: 0.28 },
      { feature: 'Совпадение ИНН', contribution: 0.26 },
    ],
  },
  {
    id: uid(),
    type: 'THRESHOLD',
    severity: 'LOW',
    riskScore: 0.28,
    description: 'Разовая транзакция 1 250 000 ₽ — превышение порога мониторинга.',
    entityType: 'transaction',
    status: 'REVIEWING',
    ruleId: 'R-THR-001',
    createdAt: new Date(Date.now() - 1000 * 60 * 200).toISOString(),
    shap: [
      { feature: 'Сумма транзакции', contribution: 0.18 },
      { feature: 'История клиента (Lv.2)', contribution: -0.1 },
    ],
  },
]

// ─── News seed (static, no API) ─────────────────────────────────────────────
// Timestamps are computed relative to "now" so the feed always feels fresh.
const MIN = 60_000
const HOUR = 60 * MIN
const DAY = 24 * HOUR

const NEWS_SEED: NewsItem[] = [
  {
    id: 'n-1',
    category: 'Регуляторика',
    title: 'ЦБ РФ выдал первую лицензию криптобирже в экспериментальном режиме',
    summary:
      'Банк России зарегистрировал первую организацию, получившую право оказывать услуги обмена цифровых валют в рамках правового sandbox. Документ предусматривает обязательный комплаенс по 115-ФЗ и хранение средств на segregated-счетах.',
    body: 'Лицензия выдана на 12 месяцев в экспериментальном правовом режиме (ЭПР). Требования: уставной капитал от 100 млн ₽, собственный ML-стек AML, ежедневная отчётность в ЦБ. РусКрипто стала одной из 3 площадок, подавших заявку на участие.',
    source: 'ЦБ РФ • Пресс-релиз',
    publishedAt: new Date(Date.now() - 2 * HOUR).toISOString(),
    pinned: true,
  },
  {
    id: 'n-2',
    category: 'Регуляторика',
    title: 'ФЗ-1194918-8 «О цифровых финансовых активах» вступил в силу',
    summary:
      'Опубликован федеральный закон, регулирующий выпуск и обращение ЦФА в РФ. Закон определяет статус цифровых валют, операторов обмена и обязанности по идентификации клиентов (KYC/AML).',
    body: 'Ключевые нормы: обязательная верификация всех пользователей, лимиты на операции без идентификации отменены, биржи обязаны передавать данные в Росфинмониторинг. Штрафы за нарушения — до 1% оборота.',
    source: 'Гарант • Документ',
    publishedAt: new Date(Date.now() - 5 * HOUR).toISOString(),
  },
  {
    id: 'n-3',
    category: 'Платформа',
    title: 'РусКрипто подключил коридор RU-CN для расчётов в цифровых юанях',
    summary:
      'Запущен пилотный платёжный коридор Россия — Китай с расчётами в CBDC. Время перевода сокращено с 3 дней до 8 секунд, комиссии — до 0,3%.',
    body: 'Коридор интегрирован с системой mBridge (BIS). Первый пилотный платёж — 1,2 млн ₽ в эквиваленте e-CNY — проведён за 8 секунд. К концу 2026 года ожидается подключение ещё 12 банков-партнёров.',
    source: 'РусКрипто • Блог',
    publishedAt: new Date(Date.now() - 35 * MIN).toISOString(),
  },
  {
    id: 'n-4',
    category: 'Рынок',
    title: 'Объём торгов на РусКрипто превысил 184 млн ₽ за сутки',
    summary:
      'Суточный оборот биржи обновил максимум с момента запуска, превысив 184 млн ₽. Лидерами торгов стали пары BTC/RUB и ETH/RUB.',
    source: 'РусКрипто • Аналитика',
    publishedAt: new Date(Date.now() - 12 * MIN).toISOString(),
  },
  {
    id: 'n-5',
    category: 'Партнёрство',
    title: 'РусКрипто и Сбер заключили соглашение о ликвидности',
    summary:
      'Сбербанк предоставит банковскую инфраструктуру для обеспечения фиатной ликвидности. Соглашение включает интеграцию со СБП и кастодиальные услуги для институциональных клиентов.',
    source: 'ТАСС',
    publishedAt: new Date(Date.now() - 90 * MIN).toISOString(),
  },
  {
    id: 'n-6',
    category: 'Регуляторика',
    title: 'Минфин РФ опубликовал методические указания по налогообложению ЦФА',
    summary:
      'Министерство финансов разъяснило порядок расчёта НДФЛ при операциях с цифровыми финансовыми активами. Ставка — 13/15%, налоговая база определяется по цене сделки.',
    body: 'Указания касаются сделок купли-продажи, обмена и погашения ЦФА. Биржи выступают налоговыми агентами при выводе фиата. Документ вступает в силу с 1 января следующего года.',
    source: 'Минфин РФ',
    publishedAt: new Date(Date.now() - 8 * HOUR).toISOString(),
  },
  {
    id: 'n-7',
    category: 'Платформа',
    title: 'Запущена маржинальная торговля с плечом до 20x',
    summary:
      'РусКрипто открыл маржинальный терминал для верифицированных пользователей с уровнем KYC 2. Поддерживаются 8 пар к рублю, автоматический margin call и изоляция маржи по позициям.',
    source: 'РусКрипто • Обновления',
    publishedAt: new Date(Date.now() - 3 * HOUR - 20 * MIN).toISOString(),
  },
  {
    id: 'n-8',
    category: 'Рынок',
    title: 'Биткоин обновил локальный максимум на фоне притока в спотовые ETF',
    summary:
      'BTC вырос на 4,2% за сутки, обновив максимум месяца. Аналитики связывают рост с притоком $847 млн в спотовые биткоин-ETF и смягчением риторики ФРС США.',
    source: 'Bloomberg',
    publishedAt: new Date(Date.now() - 6 * HOUR).toISOString(),
  },
  {
    id: 'n-9',
    category: 'Партнёрство',
    title: 'Интеграция с Тинькофф для мгновенных пополнений через СБП',
    summary:
      'Пользователи РусКрипто могут пополнять счёт с карт Тинькофф через СБП без комиссии. Лимит одной операции — 600 000 ₽, зачисление — мгновенно.',
    source: 'РусКрипто • Блог',
    publishedAt: new Date(Date.now() - 22 * HOUR).toISOString(),
  },
  {
    id: 'n-10',
    category: 'Платформа',
    title: 'Обновлённый P2P-маркетплейс: 24 новых способа оплаты',
    summary:
      'Добавлены способы оплаты: СБП всех банков РФ, карты Мир, Visa, Mastercard российских банков, а также наличные в 8 городах. Расширена система арбитража и escrow.',
    source: 'РусКрипто • Обновления',
    publishedAt: new Date(Date.now() - 1 * DAY - 3 * HOUR).toISOString(),
  },
  {
    id: 'n-11',
    category: 'Регуляторика',
    title: 'Росфинмониторинг обновил список идентификаторов для контроля',
    summary:
      'Внесены дополнения в перечень оснований для мер по замораживанию активов. Биржи обязаны обновить AML-правила в течение 30 дней и провести ретроспективную проверку клиентов.',
    source: 'Росфинмониторинг',
    publishedAt: new Date(Date.now() - 1 * DAY - 6 * HOUR).toISOString(),
  },
  {
    id: 'n-12',
    category: 'Рынок',
    title: 'Эфириум вырос на фоне ожидаемого апгрейда сети Pectra',
    summary:
      'ETH прибавил 6,8% за неделю на ожиданиях активации обновления Pectra, которое повысит пропускную способность сети и снизит комиссии в L2-рулерах.',
    source: 'CoinDesk',
    publishedAt: new Date(Date.now() - 1 * DAY - 9 * HOUR).toISOString(),
  },
  {
    id: 'n-13',
    category: 'Платформа',
    title: 'РусКрипто внедрил ML-скоринг транзакций в реальном времени',
    summary:
      'Запущена модель градиентного бустинга с SHAP-объяснениями для оценки риска каждой операции. Скоринг работает за 120 мс, покрывает 100% транзакций.',
    source: 'РусКрипто • Технологии',
    publishedAt: new Date(Date.now() - 2 * DAY - 4 * HOUR).toISOString(),
  },
  {
    id: 'n-14',
    category: 'Партнёрство',
    title: 'Совместный пилот с ВТБ по токенизации коммерческих векселей',
    summary:
      'РусКрипто и банк ВТБ запустили пилот по выпуску цифровых коммерческих векселей на блокчейне. Первый выпуск — 50 млн ₽ для корпоративного клиента.',
    source: 'Ведомости',
    publishedAt: new Date(Date.now() - 2 * DAY - 11 * HOUR).toISOString(),
  },
  {
    id: 'n-15',
    category: 'Рынок',
    title: 'Объём стейблкоинов на российских биржах вырос на 38% за квартал',
    summary:
      'Доля USDT в общем обороте легальных криптоплощадок РФ достигла 41%. Аналитики отмечают рост спроса на стейблкоины как инструмент хеджирования рублевой волатильности.',
    source: 'РБК Crypto',
    publishedAt: new Date(Date.now() - 3 * DAY).toISOString(),
  },
]

export const useAppStore = create<AppState>()(
  persist(
    (set, get) => ({
      activeView: 'home',
      setView: (v) => set({ activeView: v }),

      sidebarCollapsed: false,
      toggleSidebar: () => set((s) => ({ sidebarCollapsed: !s.sidebarCollapsed })),
      setSidebarCollapsed: (v) => set({ sidebarCollapsed: v }),

      currency: 'rub',
      setCurrency: (c) => set({ currency: c }),

      locale: 'ru',
      setLocale: (l) => set({ locale: l }),

      enabledModules: { p2p: true, crossBorder: true },
      setModuleEnabled: (module, enabled) =>
        set((s) => ({
          enabledModules: { ...s.enabledModules, [module]: enabled },
        })),

      isAuthed: false,
      userEmail: null,
      userName: null,
      userRole: 'USER',
      userId: null,
      userBankId: null,
      userBankName: null,
      login: (email, name, role, id, bankId, bankName) =>
        set({
          isAuthed: true,
          userEmail: email,
          userName: name || email.split('@')[0],
          userRole: role || 'USER',
          userId: id || null,
          userBankId: bankId || null,
          userBankName: bankName || null,
        }),
      logout: () => set({ isAuthed: false, userEmail: null, userName: null, userRole: 'USER', userId: null, userBankId: null, userBankName: null }),

      kycLevel: 0,
      kycStatus: 'UNINITIATED',
      setKyc: (level, status) => set({ kycLevel: level, kycStatus: status }),

      balances: INITIAL_BALANCES,
      selectedPair: 'BTC/RUB',
      setSelectedPair: (p) => set({ selectedPair: p }),

      orders: [],
      openOrders: [],
      placeOrder: (o) => {
        const total = o.price * o.quantity
        const fee = total * 0.002 // 0.2% taker
        const trade: Trade = {
          id: uid(),
          pair: o.pair,
          side: o.side,
          type: o.type,
          price: o.price,
          quantity: o.quantity,
          total,
          fee,
          time: now(),
          createdAt: new Date().toISOString(),
        }
        set((s) => {
          const [base, quote] = o.pair.split('/')
          const newBalances = s.balances.map((b) => {
            if (o.side === 'buy') {
              if (b.asset === base) return { ...b, amount: b.amount + o.quantity }
              if (b.asset === quote)
                return { ...b, amount: b.amount - total - fee }
            } else {
              if (b.asset === base) return { ...b, amount: b.amount - o.quantity }
              if (b.asset === quote) return { ...b, amount: b.amount + total - fee }
            }
            return b
          })
          return {
            orders: [trade, ...s.orders].slice(0, 50),
            balances: newBalances,
            transactions: [
              {
                id: uid(),
                type: 'trade' as const,
                asset: base,
                amount: o.side === 'buy' ? o.quantity : -o.quantity,
                status: 'COMPLETED' as const,
                time: now(),
              },
              ...s.transactions,
            ].slice(0, 50),
          }
        })
        return trade
      },

      depositAddress: '',
      generateDepositAddress: (asset, network) => {
        const prefix = asset === 'BTC' ? 'bc1q' : asset === 'ETH' || asset === 'USDT' ? '0x' : 'addr'
        const body = Array.from({ length: 34 }, () =>
          '0123456789abcdefghjkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ'[Math.floor(Math.random() * 56)]
        ).join('')
        const addr = prefix + body
        set({ depositAddress: addr })
        get().addTransaction({
          type: 'deposit',
          asset,
          amount: 0,
          status: 'PENDING',
          address: addr,
        })
        get().pushNotification(
          'Адрес пополнения создан',
          `${asset} • сеть ${network} • ожидаем поступления`
        )
        return addr
      },
      withdraw: (asset, amount, address) => {
        set((s) => ({
          balances: s.balances.map((b) =>
            b.asset === asset ? { ...b, amount: Math.max(b.amount - amount, 0) } : b
          ),
          transactions: [
            {
              id: uid(),
              type: 'withdrawal' as const,
              asset,
              amount: -amount,
              status: 'PENDING' as const,
              address,
              time: now(),
            },
            ...s.transactions,
          ].slice(0, 50),
        }))
        get().pushNotification(
          'Запрос на вывод отправлен',
          `${amount} ${asset} → ${address.slice(0, 10)}... • ожидает подтверждения`
        )
      },

      transactions: [],
      addTransaction: (t) =>
        set((s) => ({
          transactions: [{ ...t, id: uid(), time: now() }, ...s.transactions].slice(0, 50),
        })),

      p2pOffers: INITIAL_OFFERS,
      addP2POffer: (o) =>
        set((s) => ({
          p2pOffers: [{ ...o, id: uid(), completed: 0 }, ...s.p2pOffers],
        })),
      p2pDeals: INITIAL_DEALS,
      acceptP2POffer: (offer) => {
        const deal: P2PDeal = {
          id: uid(),
          type: offer.type === 'buy' ? 'sell' : 'buy',
          asset: offer.asset,
          amount: offer.amount,
          price: offer.price,
          total: offer.total,
          counterparty: offer.user,
          paymentMethod: offer.method,
          status: 'PENDING',
          time: now(),
        }
        set((s) => ({ p2pDeals: [deal, ...s.p2pDeals] }))
        get().pushNotification('Сделка P2P создана', `Ожидает подтверждения оплаты • ${offer.asset}`)
      },
      updateDealStatus: (id, status) =>
        set((s) => ({
          p2pDeals: s.p2pDeals.map((d) => (d.id === id ? { ...d, status } : d)),
        })),

      payments: [],
      createPayment: (p) => {
        const id = uid()
        const payment: CrossBorderPayment = {
          ...p,
          id,
          status: 'INITIATED',
          createdAt: new Date().toISOString(),
        }
        set((s) => ({ payments: [payment, ...s.payments] }))
        get().pushNotification('Платёж инициирован', `${p.corridor} • ${p.amount} ${p.fromCurrency}`)
        return id
      },
      updatePaymentStatus: (id, status) =>
        set((s) => ({
          payments: s.payments.map((p) => (p.id === id ? { ...p, status } : p)),
        })),

      alerts: INITIAL_ALERTS,
      reviewAlert: (id, status) =>
        set((s) => ({
          alerts: s.alerts.map((a) =>
            a.id === id ? { ...a, status, reviewedAt: new Date().toISOString() } : a
          ),
        })),

      notifications: [],
      pushNotification: (title, body) =>
        set((s) => ({
          notifications: [
            { id: uid(), title, body, time: now(), read: false },
            ...s.notifications,
          ].slice(0, 30),
        })),
      markNotificationsRead: () =>
        set((s) => ({ notifications: s.notifications.map((n) => ({ ...n, read: true })) })),

      // ─── Margin trading ──────────────────────────────────────────────────
      marginPositions: [],
      marginAccount: { equity: 500000, usedMargin: 0, availableMargin: 500000 },
      openMarginPosition: (input) => {
        const { pair, side, leverage, margin, entryPrice } = input
        if (entryPrice <= 0 || margin <= 0) {
          throw new Error('Некорректные параметры позиции')
        }
        const available = get().marginAccount.availableMargin
        if (margin > available) {
          throw new Error('Недостаточно доступной маржи')
        }
        const quantity = (margin * leverage) / entryPrice
        const liquidationPrice = computeLiquidationPrice(side, entryPrice, leverage)
        const position: MarginPosition = {
          id: uid(),
          pair,
          side,
          leverage,
          margin,
          quantity,
          entryPrice,
          liquidationPrice,
          currentPrice: entryPrice,
          unrealizedPnl: 0,
          unrealizedPnlPct: 0,
          marginRatio: 0,
          status: 'OPEN',
          openedAt: new Date().toISOString(),
        }
        set((s) => {
          const usedMargin = s.marginAccount.usedMargin + margin
          const availableMargin = s.marginAccount.equity - usedMargin
          return {
            marginPositions: [position, ...s.marginPositions],
            marginAccount: { ...s.marginAccount, usedMargin, availableMargin },
          }
        })
        get().pushNotification(
          'Маржинальная позиция открыта',
          `${side === 'long' ? 'Long' : 'Short'} ${pair} • ${leverage}x • маржа ${Math.round(margin).toLocaleString('ru-RU')} ₽`
        )
        return position
      },
      closeMarginPosition: (id, closePrice) => {
        const pos = get().marginPositions.find((p) => p.id === id)
        if (!pos || pos.status !== 'OPEN') return
        const realizedPnl =
          pos.side === 'long'
            ? (closePrice - pos.entryPrice) * pos.quantity
            : (pos.entryPrice - closePrice) * pos.quantity
        set((s) => {
          const updated = s.marginPositions.map((p) =>
            p.id === id
              ? {
                  ...p,
                  status: 'CLOSED' as const,
                  closePrice,
                  realizedPnl,
                  closedAt: new Date().toISOString(),
                  currentPrice: closePrice,
                  unrealizedPnl: 0,
                  unrealizedPnlPct: 0,
                  marginRatio: 0,
                }
              : p
          )
          // remove margin from used, add margin + realized back to equity
          const usedMargin = Math.max(s.marginAccount.usedMargin - pos.margin, 0)
          const equity = s.marginAccount.equity + realizedPnl
          const availableMargin = equity - usedMargin
          return {
            marginPositions: updated,
            marginAccount: { equity, usedMargin, availableMargin },
          }
        })
        const sign = realizedPnl >= 0 ? '+' : ''
        get().pushNotification(
          'Позиция закрыта',
          `${pos.side === 'long' ? 'Long' : 'Short'} ${pos.pair} • PnL ${sign}${Math.round(realizedPnl).toLocaleString('ru-RU')} ₽`
        )
      },
      liquidatePosition: (id) => {
        const pos = get().marginPositions.find((p) => p.id === id)
        if (!pos || pos.status !== 'OPEN') return
        const realizedPnl = -pos.margin
        set((s) => {
          const updated = s.marginPositions.map((p) =>
            p.id === id
              ? {
                  ...p,
                  status: 'LIQUIDATED' as const,
                  realizedPnl,
                  closePrice: p.currentPrice,
                  closedAt: new Date().toISOString(),
                  unrealizedPnl: realizedPnl,
                  unrealizedPnlPct: -100,
                  marginRatio: 100,
                }
              : p
          )
          const usedMargin = Math.max(s.marginAccount.usedMargin - pos.margin, 0)
          const equity = s.marginAccount.equity + realizedPnl // realized = -margin
          const availableMargin = equity - usedMargin
          return {
            marginPositions: updated,
            marginAccount: { equity, usedMargin, availableMargin },
          }
        })
        get().pushNotification(
          'Маржин-колл: позиция ликвидирована',
          `${pos.side === 'long' ? 'Long' : 'Short'} ${pos.pair} • потеря маржи ${Math.round(pos.margin).toLocaleString('ru-RU')} ₽`
        )
      },
      updateMarginPrices: (prices) => {
        const open = get().marginPositions.filter((p) => p.status === 'OPEN')
        if (open.length === 0) return
        let changed = false
        const toLiquidate: string[] = []
        const updatedMap = new Map<string, Partial<MarginPosition>>()
        for (const p of open) {
          const price = prices[p.pair]
          if (typeof price !== 'number' || price <= 0) continue
          if (price === p.currentPrice) continue
          changed = true
          const pnl =
            p.side === 'long'
              ? (price - p.entryPrice) * p.quantity
              : (p.entryPrice - price) * p.quantity
          const pnlPct = (pnl / p.margin) * 100
          // margin ratio: if pnl negative, ratio = usedMargin / (usedMargin + pnl) * 100
          // if pnl positive or zero, ratio stays low (we use the effective equity)
          let ratio = 0
          const equityFromPos = p.margin + pnl
          if (equityFromPos <= 0) {
            ratio = 100
          } else if (pnl < 0) {
            ratio = (p.margin / equityFromPos) * 100
          } else {
            ratio = 0
          }
          if (ratio >= 100) {
            toLiquidate.push(p.id)
          }
          updatedMap.set(p.id, {
            currentPrice: price,
            unrealizedPnl: pnl,
            unrealizedPnlPct: pnlPct,
            marginRatio: ratio,
          })
        }
        if (!changed && toLiquidate.length === 0) return
        set((s) => ({
          marginPositions: s.marginPositions.map((p) => {
            const upd = updatedMap.get(p.id)
            return upd ? { ...p, ...upd } : p
          }),
        }))
        // Liquidate after state update
        for (const id of toLiquidate) {
          get().liquidatePosition(id)
        }
      },

      // ─── Price alerts ────────────────────────────────────────────────────
      priceAlerts: [],
      addPriceAlert: (input) => {
        if (!input.symbol || input.targetPrice <= 0) return
        const alert: PriceAlert = {
          id: uid(),
          symbol: input.symbol.toUpperCase(),
          condition: input.condition,
          targetPrice: input.targetPrice,
          note: input.note?.trim() || undefined,
          active: true,
          triggered: false,
          createdAt: new Date().toISOString(),
        }
        set((s) => ({ priceAlerts: [alert, ...s.priceAlerts] }))
        get().pushNotification(
          'Создан алерт по цене',
          `${alert.symbol} ${alert.condition === 'above' ? '≥' : '≤'} ${alert.targetPrice.toLocaleString('ru-RU', { maximumFractionDigits: 2 })} ₽`
        )
      },
      removePriceAlert: (id) =>
        set((s) => ({ priceAlerts: s.priceAlerts.filter((a) => a.id !== id) })),
      togglePriceAlert: (id) =>
        set((s) => ({
          priceAlerts: s.priceAlerts.map((a) =>
            a.id === id
              ? { ...a, active: !a.active, triggered: a.active ? a.triggered : false }
              : a
          ),
        })),
      markPriceAlertTriggered: (id) =>
        set((s) => ({
          priceAlerts: s.priceAlerts.map((a) =>
            a.id === id
              ? { ...a, triggered: true, triggeredAt: new Date().toISOString(), active: false }
              : a
          ),
        })),

      // ─── News feed (static seed) ─────────────────────────────────────────
      newsItems: NEWS_SEED,
    }),
    {
      name: 'ruscrypto-store',
      partialize: (s) => ({
        isAuthed: s.isAuthed,
        userEmail: s.userEmail,
        userName: s.userName,
        userRole: s.userRole,
        userId: s.userId,
        userBankId: s.userBankId,
        userBankName: s.userBankName,
        kycLevel: s.kycLevel,
        kycStatus: s.kycStatus,
        balances: s.balances,
        orders: s.orders,
        transactions: s.transactions,
        p2pOffers: s.p2pOffers,
        p2pDeals: s.p2pDeals,
        payments: s.payments,
        currency: s.currency,
        sidebarCollapsed: s.sidebarCollapsed,
        locale: s.locale,
        enabledModules: s.enabledModules,
        marginPositions: s.marginPositions,
        marginAccount: s.marginAccount,
        priceAlerts: s.priceAlerts,
      }),
    }
  )
)
