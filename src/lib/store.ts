import { create } from 'zustand'
import { persist } from 'zustand/middleware'
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

interface AppState {
  // navigation
  activeView: ViewId
  setView: (v: ViewId) => void

  currency: Currency
  setCurrency: (c: Currency) => void

  // auth (демо)
  isAuthed: boolean
  userEmail: string | null
  userName: string | null
  login: (email: string, name?: string) => void
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

export const useAppStore = create<AppState>()(
  persist(
    (set, get) => ({
      activeView: 'home',
      setView: (v) => set({ activeView: v }),

      currency: 'rub',
      setCurrency: (c) => set({ currency: c }),

      isAuthed: false,
      userEmail: null,
      userName: null,
      login: (email, name) =>
        set({ isAuthed: true, userEmail: email, userName: name || email.split('@')[0] }),
      logout: () => set({ isAuthed: false, userEmail: null, userName: null }),

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
          price: o.price,
          quantity: o.quantity,
          total,
          fee,
          time: now(),
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
    }),
    {
      name: 'ruscrypto-store',
      partialize: (s) => ({
        isAuthed: s.isAuthed,
        userEmail: s.userEmail,
        userName: s.userName,
        kycLevel: s.kycLevel,
        kycStatus: s.kycStatus,
        balances: s.balances,
        orders: s.orders,
        transactions: s.transactions,
        p2pOffers: s.p2pOffers,
        p2pDeals: s.p2pDeals,
        payments: s.payments,
        currency: s.currency,
      }),
    }
  )
)
