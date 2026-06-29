import type { CoinTicker } from './types'

export const COINS = [
  { symbol: 'BTC', name: 'Bitcoin', binance: 'BTCUSDT' },
  { symbol: 'ETH', name: 'Ethereum', binance: 'ETHUSDT' },
  { symbol: 'BNB', name: 'BNB', binance: 'BNBUSDT' },
  { symbol: 'SOL', name: 'Solana', binance: 'SOLUSDT' },
  { symbol: 'XRP', name: 'Ripple', binance: 'XRPUSDT' },
  { symbol: 'ADA', name: 'Cardano', binance: 'ADAUSDT' },
  { symbol: 'DOGE', name: 'Dogecoin', binance: 'DOGEUSDT' },
  { symbol: 'AVAX', name: 'Avalanche', binance: 'AVAXUSDT' },
  { symbol: 'TRX', name: 'TRON', binance: 'TRXUSDT' },
  { symbol: 'LINK', name: 'Chainlink', binance: 'LINKUSDT' },
  { symbol: 'DOT', name: 'Polkadot', binance: 'DOTUSDT' },
  { symbol: 'MATIC', name: 'Polygon', binance: 'MATICUSDT' },
  { symbol: 'LTC', name: 'Litecoin', binance: 'LTCUSDT' },
  { symbol: 'BCH', name: 'Bitcoin Cash', binance: 'BCHUSDT' },
  { symbol: 'ATOM', name: 'Cosmos', binance: 'ATOMUSDT' },
  { symbol: 'UNI', name: 'Uniswap', binance: 'UNIUSDT' },
  { symbol: 'NEAR', name: 'NEAR', binance: 'NEARUSDT' },
  { symbol: 'APT', name: 'Aptos', binance: 'APTUSDT' },
  { symbol: 'FIL', name: 'Filecoin', binance: 'FILUSDT' },
  { symbol: 'ARB', name: 'Arbitrum', binance: 'ARBUSDT' },
] as const

export type CoinSymbol = (typeof COINS)[number]['symbol']

const FALLBACK_USD_RUB = 78.5

// Fallback prices если внешние API недоступны (sandbox без сети)
const FALLBACK_PRICES: Record<string, { usd: number; change: number }> = {
  BTC: { usd: 96850, change: 1.84 },
  ETH: { usd: 3342, change: 2.41 },
  BNB: { usd: 698.4, change: 0.55 },
  SOL: { usd: 184.6, change: 3.17 },
  XRP: { usd: 2.28, change: -0.92 },
  ADA: { usd: 0.928, change: 1.06 },
  DOGE: { usd: 0.314, change: -2.13 },
  AVAX: { usd: 36.72, change: -1.44 },
  TRX: { usd: 0.248, change: 0.82 },
  LINK: { usd: 22.4, change: 2.18 },
  DOT: { usd: 7.8, change: -1.12 },
  MATIC: { usd: 0.52, change: 1.44 },
  LTC: { usd: 104.2, change: -0.88 },
  BCH: { usd: 442.5, change: 1.22 },
  ATOM: { usd: 8.4, change: -1.6 },
  UNI: { usd: 12.8, change: 2.04 },
  NEAR: { usd: 5.2, change: 3.4 },
  APT: { usd: 8.6, change: -2.2 },
  FIL: { usd: 5.4, change: 1.18 },
  ARB: { usd: 0.78, change: -0.94 },
}

let usdRubCache = { rate: FALLBACK_USD_RUB, ts: 0 }

export async function getUsdRubRate(): Promise<number> {
  // кэш 5 минут
  if (Date.now() - usdRubCache.ts < 300_000) return usdRubCache.rate
  try {
    const res = await fetch('https://api.exchangerate-api.com/v4/latest/USD', {
      signal: AbortSignal.timeout(4000),
    })
    const data = await res.json()
    if (data?.rates?.RUB) {
      usdRubCache = { rate: data.rates.RUB, ts: Date.now() }
      return data.rates.RUB
    }
  } catch {
    // ignore
  }
  return FALLBACK_USD_RUB
}

export async function fetchTickers(): Promise<CoinTicker[]> {
  const usdRub = await getUsdRubRate()
  try {
    const symbols = COINS.map((c) => c.binance)
    const url = `https://api.binance.com/api/v3/ticker/24hr?symbols=${encodeURIComponent(
      JSON.stringify(symbols)
    )}`
    const res = await fetch(url, { signal: AbortSignal.timeout(5000) })
    if (!res.ok) throw new Error('binance not ok')
    const data: any[] = await res.json()

    // Параллельно получаем sparkline-данные (24ч закрытия) через klines API
    const sparklines = await fetchSparklines()

    return COINS.map((coin) => {
      const d = data.find((x) => x.symbol === coin.binance)
      const priceUsd = d ? parseFloat(d.lastPrice) : FALLBACK_PRICES[coin.symbol].usd
      const change24h = d
        ? parseFloat(d.priceChangePercent)
        : FALLBACK_PRICES[coin.symbol].change
      return {
        id: coin.symbol.toLowerCase(),
        symbol: coin.symbol,
        name: coin.name,
        priceUsd,
        priceRub: priceUsd * usdRub,
        change24h,
        high24h: d ? parseFloat(d.highPrice) : undefined,
        low24h: d ? parseFloat(d.lowPrice) : undefined,
        volume24h: d ? parseFloat(d.quoteVolume) : undefined,
        sparkline: sparklines[coin.symbol] || generateFallbackSpark(change24h),
      }
    })
  } catch {
    // fallback на статичные цены
    return COINS.map((coin) => {
      const fb = FALLBACK_PRICES[coin.symbol]
      return {
        id: coin.symbol.toLowerCase(),
        symbol: coin.symbol,
        name: coin.name,
        priceUsd: fb.usd,
        priceRub: fb.usd * usdRub,
        change24h: fb.change,
        sparkline: generateFallbackSpark(fb.change),
      }
    })
  }
}

// Получение реальных цен закрытия за 24 часа через Binance klines API
// Возвращает Map: symbol → number[] (24 точки закрытия в USD)
let sparklineCache: { data: Record<string, number[]>; ts: number } = { data: {}, ts: 0 }

async function fetchSparklines(): Promise<Record<string, number[]>> {
  // Кэш 2 минуты
  if (Date.now() - sparklineCache.ts < 120_000 && Object.keys(sparklineCache.data).length > 0) {
    return sparklineCache.data
  }
  try {
    const results: Record<string, number[]> = {}
    // Запрос klines для всех монет параллельно (24 свечи по 1 часу)
    const promises = COINS.map(async (coin) => {
      try {
        const url = `https://api.binance.com/api/v3/klines?symbol=${coin.binance}&interval=1h&limit=24`
        const res = await fetch(url, { signal: AbortSignal.timeout(6000) })
        if (!res.ok) throw new Error('klines not ok')
        const klines: any[] = await res.json()
        // klines формат: [openTime, open, high, low, close, volume, ...]
        const closes = klines.map((k) => parseFloat(k[4])) // close price
        results[coin.symbol] = closes
      } catch {
        results[coin.symbol] = generateFallbackSpark(FALLBACK_PRICES[coin.symbol].change)
      }
    })
    await Promise.all(promises)
    sparklineCache = { data: results, ts: Date.now() }
    return results
  } catch {
    return {}
  }
}

// Fallback: генерирует правдоподобный sparkline на основе change24h
function generateFallbackSpark(change24h: number): number[] {
  const trend = change24h >= 0 ? 1 : -1
  return Array.from({ length: 24 }, (_, i) => {
    const base = 50 + i * trend * 0.4
    return base + (Math.random() - 0.5) * 3
  })
}

// Локальная микросимуляция цены для анимации подсветки
export function jitterPrice(price: number): number {
  const change = (Math.random() - 0.5) * 0.004
  return Math.max(price * (1 + change), 0.01)
}

export function coinIconUrl(symbol: string): string {
  return `https://raw.githubusercontent.com/spothq/cryptocurrency-icons/master/128/color/${symbol.toLowerCase()}.png`
}

export function avatarFallback(symbol: string): string {
  return `https://ui-avatars.com/api/?name=${symbol}&background=27272a&color=fff&size=64`
}
