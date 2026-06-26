// Типы домена криптобиржи

export type ViewId =
  | 'home'
  | 'news'
  | 'trade'
  | 'markets'
  | 'margin'
  | 'p2p'
  | 'payments'
  | 'wallet'
  | 'portfolio'
  | 'analytics'
  | 'kyc'
  | 'compliance'
  | 'admin'
  | 'finance'
  | 'bank-portal'
  | 'profile'
  | 'auth'
  | 'help'

// ─── News & Announcements ───────────────────────────────────────────────────
export type NewsCategory = 'Регуляторика' | 'Рынок' | 'Платформа' | 'Партнёрство'

export interface NewsItem {
  id: string
  category: NewsCategory
  title: string
  summary: string
  body?: string
  source: string
  publishedAt: string // ISO string
  pinned?: boolean
  url?: string
}

// ─── Price Alerts ───────────────────────────────────────────────────────────
export type PriceAlertCondition = 'above' | 'below'

export interface PriceAlert {
  id: string
  symbol: string // e.g. 'BTC'
  condition: PriceAlertCondition
  targetPrice: number
  note?: string
  active: boolean
  triggered: boolean
  createdAt: string // ISO string
  triggeredAt?: string
}

export type Currency = 'rub' | 'usd'

export interface CoinTicker {
  id: string
  symbol: string
  name: string
  priceRub: number
  priceUsd: number
  change24h: number
  high24h?: number
  low24h?: number
  volume24h?: number
  sparkline?: number[]
}

export interface Balance {
  asset: string
  amount: number
  locked?: number
}

export interface OrderBookLevel {
  price: number
  amount: number
  total: number
}

export interface OrderBook {
  bids: OrderBookLevel[]
  asks: OrderBookLevel[]
}

export type OrderSide = 'buy' | 'sell'
export type OrderType = 'limit' | 'market'
export type OrderStatus = 'OPEN' | 'PARTIAL' | 'FILLED' | 'CANCELLED'

export interface Order {
  id: string
  pair: string
  side: OrderSide
  type: OrderType
  price: number
  quantity: number
  filledQty: number
  status: OrderStatus
  createdAt: string
}

export interface Trade {
  id: string
  pair: string
  side: OrderSide
  type: OrderType
  price: number
  quantity: number
  total: number
  fee: number
  time: string
  createdAt?: string // ISO timestamp (for date filtering); legacy entries may omit
}

export type TxType = 'deposit' | 'withdrawal' | 'trade' | 'fee' | 'payment'
export type TxStatus = 'PENDING' | 'COMPLETED' | 'FAILED'

export interface Transaction {
  id: string
  type: TxType
  asset: string
  amount: number
  status: TxStatus
  address?: string
  txHash?: string
  time: string
}

export interface P2POffer {
  id: string
  type: OrderSide
  asset: string
  fiat: string
  price: number
  amount: number
  user: string
  method: string
  completed: number
  rating?: number
}

export type DealStatus =
  | 'PENDING'
  | 'PAID'
  | 'COMPLETED'
  | 'CANCELLED'
  | 'DISPUTE'

export interface P2PDeal {
  id: string
  type: OrderSide
  asset: string
  amount: number
  price: number
  total: number
  counterparty: string
  paymentMethod: string
  status: DealStatus
  time: string
}

export interface Corridor {
  id: string
  name: string
  from: string
  to: string
  rate: number
  fee: number
  eta: string
  flag: string
}

export type PaymentStatus =
  | 'INITIATED'
  | 'CC_PENDING'
  | 'LIQUIDITY'
  | 'CONVERTING'
  | 'SENDING'
  | 'SETTLED'
  | 'FAILED'

export interface CrossBorderPayment {
  id: string
  corridor: string
  fromCurrency: string
  toCurrency: string
  amount: number
  receiveAmount: number
  fee: number
  rate: number
  beneficiary: string
  purpose: string
  status: PaymentStatus
  createdAt: string
}

export type KycLevel = 0 | 1 | 2

export type AlertSeverity = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'
export type AlertStatus =
  | 'OPEN'
  | 'REVIEWING'
  | 'APPROVED'
  | 'REJECTED'
  | 'ESCALATED'
  | 'SAR'

export interface ComplianceAlert {
  id: string
  type: string
  severity: AlertSeverity
  riskScore: number
  description: string
  entityType: string
  entityId?: string
  status: AlertStatus
  ruleId?: string
  createdAt: string
  shap?: { feature: string; contribution: number }[]
}

// ─── Margin Trading ─────────────────────────────────────────────────────────
export type MarginSide = 'long' | 'short'
export type MarginPositionStatus = 'OPEN' | 'CLOSED' | 'LIQUIDATED'

export interface MarginPosition {
  id: string
  pair: string
  side: MarginSide
  leverage: number
  margin: number
  quantity: number
  entryPrice: number
  liquidationPrice: number
  currentPrice: number
  unrealizedPnl: number
  unrealizedPnlPct: number
  marginRatio: number
  status: MarginPositionStatus
  openedAt: string
  closedAt?: string
  closePrice?: number
  realizedPnl?: number
}

export interface MarginAccount {
  equity: number
  usedMargin: number
  availableMargin: number
  marginRatio: number
  unrealizedPnl: number
}
