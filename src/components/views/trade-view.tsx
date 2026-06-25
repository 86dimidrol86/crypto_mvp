'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import {
  ChevronDown,
  TrendingUp,
  TrendingDown,
  CheckCircle2,
  XCircle,
  ArrowDownRight,
  ArrowUpRight,
} from 'lucide-react'
import { useAppStore } from '@/lib/store'
import { fetchTickers, jitterPrice } from '@/lib/market'
import type { CoinTicker, OrderSide, OrderType, Trade } from '@/lib/types'
import { formatPrice, formatNumber, formatPercent, formatAmount } from '@/lib/format'
import { cn } from '@/lib/utils'
import { CoinIcon } from '@/components/coin-icon'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Slider } from '@/components/ui/slider'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from '@/components/ui/dropdown-menu'
import { toast } from 'sonner'

const PAIRS = [
  'BTC/RUB',
  'ETH/RUB',
  'XRP/RUB',
  'SOL/RUB',
  'BNB/RUB',
  'DOGE/RUB',
  'ADA/RUB',
  'AVAX/RUB',
]

interface RecentTrade {
  id: string
  price: number
  amount: number
  side: OrderSide
  time: string
}

function uid() {
  return Math.random().toString(36).slice(2, 11)
}

function fmtTimeNow(): string {
  return new Date().toLocaleTimeString('ru-RU', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  })
}

function priceDecimals(price: number): number {
  if (price >= 1000) return 2
  if (price >= 1) return 2
  if (price >= 0.01) return 4
  return 6
}

// ─── Order Book ─────────────────────────────────────────────────────────────
function OrderBook({ price, pair }: { price: number; pair: string }) {
  const levels = useMemo(() => {
    if (price <= 0) return { asks: [], bids: [] }
    const tick = price * 0.0005
    const askRaw = Array.from({ length: 12 }, (_, i) => {
      const p = price + tick * (i + 1)
      const amount = parseFloat((Math.random() * 4 + 0.05).toFixed(4))
      return { price: p, amount }
    })
    const bidRaw = Array.from({ length: 12 }, (_, i) => {
      const p = price - tick * (i + 1)
      const amount = parseFloat((Math.random() * 4 + 0.05).toFixed(4))
      return { price: Math.max(p, 0.0001), amount }
    })
    const maxAmount = Math.max(...askRaw.map((l) => l.amount), ...bidRaw.map((l) => l.amount))
    return { asks: askRaw, bids: bidRaw, maxAmount }
  }, [price])

  const spread = levels.asks[0] && levels.bids[0] ? levels.asks[0].price - levels.bids[0].price : 0
  const spreadPct = price > 0 ? (spread / price) * 100 : 0
  const decimals = priceDecimals(price)

  return (
    <Card className="overflow-hidden bg-card border-border">
      <div className="px-3 py-2.5 border-b border-border flex items-center justify-between">
        <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Биржевой стакан
        </span>
        <span className="text-[10px] text-muted-foreground">{pair}</span>
      </div>
      <div className="grid grid-cols-3 px-3 py-1.5 text-[10px] uppercase tracking-wider text-muted-foreground">
        <span>Цена ₽</span>
        <span className="text-right">Объём</span>
        <span className="text-right">Сумма</span>
      </div>
      <ScrollArea className="h-[260px]">
        {/* Asks (reversed: lowest first at bottom) */}
        <div className="flex flex-col-reverse">
          {levels.asks.map((l, i) => {
            const total = l.price * l.amount
            const wPct = (l.amount / (levels.maxAmount || 1)) * 100
            return (
              <div
                key={`a-${i}`}
                className="relative grid grid-cols-3 px-3 py-[3px] text-xs font-mono tabular-nums"
              >
                <div
                  className="absolute inset-y-0 right-0 bg-destructive/15"
                  style={{ width: `${wPct}%` }}
                  aria-hidden
                />
                <span className="relative text-destructive">
                  {l.price.toLocaleString('ru-RU', {
                    minimumFractionDigits: decimals,
                    maximumFractionDigits: decimals,
                  })}
                </span>
                <span className="relative text-right text-foreground/90">
                  {l.amount.toLocaleString('ru-RU', { maximumFractionDigits: 4 })}
                </span>
                <span className="relative text-right text-muted-foreground">
                  {total.toLocaleString('ru-RU', { maximumFractionDigits: 0 })}
                </span>
              </div>
            )
          })}
        </div>
      </ScrollArea>

      {/* Spread / last price */}
      <div className="border-y border-border bg-muted/40 px-3 py-2 flex items-center justify-between">
        <div className="flex items-baseline gap-2">
          <span className="text-lg font-mono font-bold tabular-nums text-primary">
            {price > 0
              ? price.toLocaleString('ru-RU', {
                  minimumFractionDigits: decimals,
                  maximumFractionDigits: decimals,
                })
              : '— —'}
          </span>
          <ArrowDownRight className="w-3.5 h-3.5 text-muted-foreground" />
        </div>
        <div className="text-right">
          <div className="text-[10px] text-muted-foreground">Спред</div>
          <div className="text-xs font-mono tabular-nums">
            {spread.toLocaleString('ru-RU', { maximumFractionDigits: decimals })} ₽
            <span className="text-muted-foreground ml-1">({spreadPct.toFixed(3)}%)</span>
          </div>
        </div>
      </div>

      {/* Bids */}
      <ScrollArea className="h-[260px]">
        <div className="flex flex-col">
          {levels.bids.map((l, i) => {
            const total = l.price * l.amount
            const wPct = (l.amount / (levels.maxAmount || 1)) * 100
            return (
              <div
                key={`b-${i}`}
                className="relative grid grid-cols-3 px-3 py-[3px] text-xs font-mono tabular-nums"
              >
                <div
                  className="absolute inset-y-0 right-0 bg-success/15"
                  style={{ width: `${wPct}%` }}
                  aria-hidden
                />
                <span className="relative text-success">
                  {l.price.toLocaleString('ru-RU', {
                    minimumFractionDigits: decimals,
                    maximumFractionDigits: decimals,
                  })}
                </span>
                <span className="relative text-right text-foreground/90">
                  {l.amount.toLocaleString('ru-RU', { maximumFractionDigits: 4 })}
                </span>
                <span className="relative text-right text-muted-foreground">
                  {total.toLocaleString('ru-RU', { maximumFractionDigits: 0 })}
                </span>
              </div>
            )
          })}
        </div>
      </ScrollArea>
    </Card>
  )
}

// ─── Recent Trades Tape ─────────────────────────────────────────────────────
function RecentTrades({ price, pair }: { price: number; pair: string }) {
  const [trades, setTrades] = useState<RecentTrade[]>([])

  // Seed initial trades + append a new mock trade every 2s
  useEffect(() => {
    if (price <= 0) return
    // Seed if empty (deferred to microtask to satisfy lint).
    const seedTimer = setTimeout(() => {
      setTrades((prev) => {
        if (prev.length > 0) return prev
        return Array.from({ length: 18 }, () => {
          const side: OrderSide = Math.random() > 0.5 ? 'buy' : 'sell'
          const drift = price * (Math.random() - 0.5) * 0.0015
          return {
            id: uid(),
            price: Math.max(price + drift, 0.0001),
            amount: parseFloat((Math.random() * 2 + 0.005).toFixed(4)),
            side,
            time: fmtTimeNow(),
          }
        })
      })
    }, 0)
    const interval = setInterval(() => {
      const side: OrderSide = Math.random() > 0.5 ? 'buy' : 'sell'
      const drift = price * (Math.random() - 0.5) * 0.0015
      const t: RecentTrade = {
        id: uid(),
        price: Math.max(price + drift, 0.0001),
        amount: parseFloat((Math.random() * 2 + 0.005).toFixed(4)),
        side,
        time: fmtTimeNow(),
      }
      setTrades((prev) => [t, ...prev].slice(0, 30))
    }, 2000)
    return () => {
      clearTimeout(seedTimer)
      clearInterval(interval)
    }
  }, [price])

  const decimals = priceDecimals(price)

  return (
    <Card className="overflow-hidden bg-card border-border">
      <div className="px-3 py-2.5 border-b border-border flex items-center justify-between">
        <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Последние сделки
        </span>
        <span className="text-[10px] text-muted-foreground">{pair}</span>
      </div>
      <div className="grid grid-cols-3 px-3 py-1.5 text-[10px] uppercase tracking-wider text-muted-foreground border-b border-border">
        <span>Цена ₽</span>
        <span className="text-right">Объём</span>
        <span className="text-right">Время</span>
      </div>
      <ScrollArea className="max-h-48">
        <div className="flex flex-col">
          {trades.map((t) => (
            <div
              key={t.id}
              className="grid grid-cols-3 px-3 py-[3px] text-xs font-mono tabular-nums hover:bg-muted/40"
            >
              <span className={cn(t.side === 'buy' ? 'text-success' : 'text-destructive')}>
                {t.price.toLocaleString('ru-RU', {
                  minimumFractionDigits: decimals,
                  maximumFractionDigits: decimals,
                })}
              </span>
              <span className="text-right text-foreground/90">
                {t.amount.toLocaleString('ru-RU', { maximumFractionDigits: 4 })}
              </span>
              <span className="text-right text-muted-foreground">{t.time}</span>
            </div>
          ))}
        </div>
      </ScrollArea>
    </Card>
  )
}

// ─── Order Form ─────────────────────────────────────────────────────────────
function OrderForm({
  price,
  pair,
  ticker,
}: {
  price: number
  pair: string
  ticker: CoinTicker | null
}) {
  const balances = useAppStore((s) => s.balances)
  const placeOrder = useAppStore((s) => s.placeOrder)
  const [side, setSide] = useState<OrderSide>('buy')
  const [orderType, setOrderType] = useState<OrderType>('limit')
  const [inputPrice, setInputPrice] = useState<string>('')
  const [inputQty, setInputQty] = useState<string>('')
  const [pct, setPct] = useState<number>(0)
  const priceDirty = useRef(false)

  const [base, quote] = pair.split('/')
  const decimals = priceDecimals(price)

  const effectivePrice = orderType === 'limit' ? parseFloat(inputPrice) || price : price
  const qty = parseFloat(inputQty) || 0
  const total = effectivePrice * qty
  const fee = total * 0.002

  const baseBalance = balances.find((b) => b.asset === base)?.amount ?? 0
  const quoteBalance = balances.find((b) => b.asset === quote)?.amount ?? 0
  const available = side === 'buy' ? quoteBalance : baseBalance

  // Reset price input when pair or order type changes (NOT on every live price tick)
  useEffect(() => {
    // Deferred to satisfy lint rule about setState in effect body.
    const resetTimer = setTimeout(() => {
      priceDirty.current = false
      setInputQty('')
      setPct(0)
      if (orderType === 'limit' && price > 0) {
        setInputPrice(
          price.toLocaleString('ru-RU', {
            minimumFractionDigits: decimals,
            maximumFractionDigits: decimals,
          })
        )
      } else {
        setInputPrice('')
      }
    }, 0)
    return () => clearTimeout(resetTimer)
  }, [pair, orderType])

  const applyPercent = (p: number) => {
    setPct(p)
    if (p <= 0) {
      setInputQty('')
      return
    }
    if (side === 'buy') {
      const usable = (available / effectivePrice) * (p / 100)
      setInputQty(usable.toFixed(6))
    } else {
      setInputQty((baseBalance * (p / 100)).toFixed(6))
    }
  }

  const handleSubmit = () => {
    if (qty <= 0) {
      toast.error('Введите количество')
      return
    }
    if (orderType === 'limit' && effectivePrice <= 0) {
      toast.error('Введите корректную цену')
      return
    }
    if (side === 'buy' && total > quoteBalance) {
      toast.error('Недостаточно средств для покупки')
      return
    }
    if (side === 'sell' && qty > baseBalance) {
      toast.error(`Недостаточно ${base} для продажи`)
      return
    }
    const trade: Trade = placeOrder({
      pair,
      side,
      type: orderType,
      price: effectivePrice,
      quantity: qty,
    })
    toast.success(
      `${side === 'buy' ? 'Куплено' : 'Продано'} ${qty} ${base} по ${effectivePrice.toLocaleString(
        'ru-RU',
        { minimumFractionDigits: decimals, maximumFractionDigits: decimals }
      )} ₽`,
      {
        description: `Сумма ${formatNumber(total)} ₽ • комиссия ${formatNumber(fee)} ₽ • ${trade.time}`,
      }
    )
    setInputQty('')
    setPct(0)
  }

  return (
    <Card className="overflow-hidden bg-card border-border">
      <div className="grid grid-cols-2 gap-1 p-1.5">
        <button
          onClick={() => setSide('buy')}
          className={cn(
            'py-2 rounded-md text-sm font-semibold transition',
            side === 'buy'
              ? 'bg-success text-success-foreground shadow-sm'
              : 'bg-muted/60 text-muted-foreground hover:bg-muted'
          )}
        >
          Купить {base}
        </button>
        <button
          onClick={() => setSide('sell')}
          className={cn(
            'py-2 rounded-md text-sm font-semibold transition',
            side === 'sell'
              ? 'bg-destructive text-white shadow-sm'
              : 'bg-muted/60 text-muted-foreground hover:bg-muted'
          )}
        >
          Продать {base}
        </button>
      </div>

      <div className="px-3 pb-3 pt-1 space-y-3">
        {/* Order type toggle */}
        <div className="flex gap-1 bg-muted/60 p-1 rounded-lg">
          <button
            onClick={() => setOrderType('limit')}
            className={cn(
              'flex-1 py-1.5 text-xs font-semibold rounded-md transition',
              orderType === 'limit' ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground'
            )}
          >
            Лимит
          </button>
          <button
            onClick={() => setOrderType('market')}
            className={cn(
              'flex-1 py-1.5 text-xs font-semibold rounded-md transition',
              orderType === 'market' ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground'
            )}
          >
            Маркет
          </button>
        </div>

        {/* Available balance */}
        <div className="flex items-center justify-between text-xs">
          <span className="text-muted-foreground">Доступно</span>
          <span className="font-mono tabular-nums">
            {formatNumber(available, 6)} {side === 'buy' ? quote : base}
          </span>
        </div>

        {/* Price input */}
        <div className="space-y-1">
          <label className="text-[10px] uppercase tracking-wider text-muted-foreground">
            Цена {orderType === 'market' && '(рыночная)'}
          </label>
          <div className="relative">
            <Input
              type="number"
              inputMode="decimal"
              value={orderType === 'market' ? '' : inputPrice}
              onChange={(e) => setInputPrice(e.target.value)}
              disabled={orderType === 'market'}
              placeholder={orderType === 'market' ? 'По рынку' : ''}
              className="pr-12 font-mono tabular-nums h-9"
            />
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">
              {quote}
            </span>
          </div>
        </div>

        {/* Quantity input */}
        <div className="space-y-1">
          <label className="text-[10px] uppercase tracking-wider text-muted-foreground">
            Количество
          </label>
          <div className="relative">
            <Input
              type="number"
              inputMode="decimal"
              value={inputQty}
              onChange={(e) => {
                setInputQty(e.target.value)
                setPct(0)
              }}
              placeholder="0.00"
              className="pr-10 font-mono tabular-nums h-9"
            />
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">
              {base}
            </span>
          </div>
        </div>

        {/* Percent slider */}
        <div className="space-y-2">
          <div className="grid grid-cols-4 gap-1.5">
            {[25, 50, 75, 100].map((p) => (
              <button
                key={p}
                onClick={() => applyPercent(p)}
                className={cn(
                  'py-1 text-xs font-medium rounded-md transition border',
                  pct === p
                    ? side === 'buy'
                      ? 'bg-success/20 border-success/50 text-success'
                      : 'bg-destructive/20 border-destructive/50 text-destructive'
                    : 'bg-muted/40 border-border text-muted-foreground hover:bg-muted'
                )}
              >
                {p}%
              </button>
            ))}
          </div>
          <Slider value={[pct]} onValueChange={(v) => applyPercent(v[0])} max={100} step={1} />
        </div>

        {/* Summary */}
        <div className="space-y-1 pt-1 border-t border-border">
          <div className="flex justify-between text-xs">
            <span className="text-muted-foreground">Итого</span>
            <span className="font-mono tabular-nums">
              {formatNumber(total)} {quote}
            </span>
          </div>
          <div className="flex justify-between text-xs">
            <span className="text-muted-foreground">Комиссия 0.2%</span>
            <span className="font-mono tabular-nums text-muted-foreground">
              {formatNumber(fee)} {quote}
            </span>
          </div>
        </div>

        <Button
          onClick={handleSubmit}
          className={cn(
            'w-full h-10 font-semibold text-white shadow-sm',
            side === 'buy' ? 'bg-success hover:bg-success/90' : 'bg-destructive hover:bg-destructive/90'
          )}
        >
          {side === 'buy' ? 'Купить' : 'Продать'} {base}
        </Button>
        {ticker && (
          <div className="text-[10px] text-muted-foreground text-center">
            ≈ {formatPrice(ticker.priceUsd, 'usd')} за 1 {base}
          </div>
        )}
      </div>
    </Card>
  )
}

// ─── My Trades History ──────────────────────────────────────────────────────
function MyTrades({ pair }: { pair: string }) {
  const orders = useAppStore((s) => s.orders)
  const filtered = orders.filter((o) => o.pair === pair)

  return (
    <Card className="overflow-hidden bg-card border-border">
      <div className="px-3 py-2.5 border-b border-border">
        <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Мои сделки
        </span>
      </div>
      {filtered.length === 0 ? (
        <div className="px-3 py-10 text-center">
          <CheckCircle2 className="w-8 h-8 mx-auto text-muted-foreground/40 mb-2" />
          <p className="text-sm text-muted-foreground">Пока нет сделок</p>
          <p className="text-[11px] text-muted-foreground/70 mt-1">
            Создайте ордер в форме выше
          </p>
        </div>
      ) : (
        <ScrollArea className="max-h-72">
          <div className="flex flex-col">
            {filtered.map((o) => {
              const isBuy = o.side === 'buy'
              return (
                <div
                  key={o.id}
                  className="grid grid-cols-12 gap-2 px-3 py-2 items-center text-xs border-b border-border/60 last:border-0 hover:bg-muted/40"
                >
                  <div className="col-span-3 flex items-center gap-1.5">
                    <Badge
                      className={cn(
                        'h-5 px-1.5 text-[10px]',
                        isBuy ? 'bg-success/20 text-success' : 'bg-destructive/20 text-destructive'
                      )}
                    >
                      {isBuy ? 'Купить' : 'Продать'}
                    </Badge>
                  </div>
                  <div className="col-span-3 font-mono tabular-nums">
                    {o.price.toLocaleString('ru-RU', { maximumFractionDigits: 2 })}
                  </div>
                  <div className="col-span-3 font-mono tabular-nums text-muted-foreground">
                    {o.quantity.toLocaleString('ru-RU', { maximumFractionDigits: 6 })}
                  </div>
                  <div className="col-span-3 text-right text-muted-foreground">{o.time}</div>
                </div>
              )
            })}
          </div>
        </ScrollArea>
      )}
    </Card>
  )
}

// ─── Main TradeView ─────────────────────────────────────────────────────────
export function TradeView() {
  const selectedPair = useAppStore((s) => s.selectedPair)
  const setSelectedPair = useAppStore((s) => s.setSelectedPair)
  const [tickers, setTickers] = useState<CoinTicker[]>([])
  const [livePrice, setLivePrice] = useState<number>(0)
  const [highlight, setHighlight] = useState<'up' | 'down' | null>(null)

  // Fetch tickers + poll every 5s
  useEffect(() => {
    let mounted = true
    const load = async () => {
      const t = await fetchTickers()
      if (mounted) setTickers(t)
    }
    load()
    const interval = setInterval(load, 5000)
    return () => {
      mounted = false
      clearInterval(interval)
    }
  }, [])

  const base = selectedPair.split('/')[0]
  const ticker = useMemo(
    () => tickers.find((t) => t.symbol === base) ?? null,
    [tickers, base]
  )

  // Smooth jitter every 1.2s for the live price ticker feel.
  // Reset baseline whenever the ticker symbol changes (pair switch or fresh fetch).
  const tickerSymbol = ticker?.symbol
  const tickerPrice = ticker?.priceRub ?? 0
  const prevPriceRef = useRef(0)
  useEffect(() => {
    if (tickerPrice <= 0) return
    prevPriceRef.current = tickerPrice
    // Seed the live price (deferred to a microtask to satisfy lint).
    const seedTimer = setTimeout(() => setLivePrice(tickerPrice), 0)
    const interval = setInterval(() => {
      const baseline = prevPriceRef.current > 0 ? prevPriceRef.current : tickerPrice
      const next = jitterPrice(baseline)
      prevPriceRef.current = next
      setLivePrice(next)
      setHighlight(next > baseline ? 'up' : 'down')
    }, 1200)
    return () => {
      clearTimeout(seedTimer)
      clearInterval(interval)
    }
  }, [tickerSymbol, tickerPrice])

  // Auto-clear highlight
  useEffect(() => {
    if (!highlight) return
    const t = setTimeout(() => setHighlight(null), 500)
    return () => clearTimeout(t)
  }, [highlight])

  const change24h = ticker?.change24h ?? 0
  const volume24h = ticker?.volume24h ? ticker.volume24h * (livePrice || ticker.priceRub) : 0
  const isUp = change24h >= 0
  const tvSymbol = `BINANCE:${base}USDT`

  return (
    <div className="flex-1 bg-background">
      <div className="mx-auto max-w-[1600px] px-3 lg:px-5 py-4">
        {/* Top pair bar */}
        <div className="flex flex-wrap items-center gap-3 lg:gap-6 mb-4 p-3 bg-card border border-border rounded-xl">
          {/* Pair selector */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" className="gap-2 h-10 px-3 font-semibold">
                <CoinIcon symbol={base} size={22} />
                <span>{selectedPair}</span>
                <ChevronDown className="w-4 h-4 text-muted-foreground" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-56">
              {PAIRS.map((p) => {
                const sym = p.split('/')[0]
                const tk = tickers.find((t) => t.symbol === sym)
                return (
                  <DropdownMenuItem
                    key={p}
                    onClick={() => setSelectedPair(p)}
                    className="gap-2.5 cursor-pointer py-2"
                  >
                    <CoinIcon symbol={sym} size={20} />
                    <span className="flex-1 font-medium">{p}</span>
                    {tk && (
                      <span className="text-xs font-mono text-muted-foreground">
                        {formatPrice(tk.priceRub, 'rub')}
                      </span>
                    )}
                  </DropdownMenuItem>
                )
              })}
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Live price */}
          <div className="flex items-baseline gap-3">
            <span
              className={cn(
                'text-2xl lg:text-3xl font-mono font-bold tabular-nums transition-colors',
                highlight === 'up' && 'text-success',
                highlight === 'down' && 'text-destructive',
                !highlight && 'text-foreground'
              )}
            >
              {livePrice > 0
                ? `${livePrice.toLocaleString('ru-RU', { maximumFractionDigits: 2 })} ₽`
                : '— —'}
            </span>
            <span className="text-xs text-muted-foreground">≈ {ticker ? formatPrice(ticker.priceUsd, 'usd') : '—'}</span>
          </div>

          {/* 24h change */}
          <div className="flex items-center gap-1.5">
            <span
              className={cn(
                'flex items-center gap-1 text-sm font-semibold px-2 py-1 rounded-md',
                isUp ? 'text-success bg-success/10' : 'text-destructive bg-destructive/10'
              )}
            >
              {isUp ? <TrendingUp className="w-3.5 h-3.5" /> : <TrendingDown className="w-3.5 h-3.5" />}
              {formatPercent(change24h)}
            </span>
            <span className="text-[10px] uppercase tracking-wider text-muted-foreground hidden sm:inline">
              24ч
            </span>
          </div>

          {/* 24h high / low / volume */}
          <div className="hidden md:flex items-center gap-4 ml-auto text-xs">
            <div>
              <span className="text-muted-foreground">Макс 24ч: </span>
              <span className="font-mono tabular-nums">
                {ticker?.high24h ? formatPrice(ticker.high24h * (livePrice / ticker.priceRub || 1), 'rub') : '—'}
              </span>
            </div>
            <div>
              <span className="text-muted-foreground">Мин 24ч: </span>
              <span className="font-mono tabular-nums">
                {ticker?.low24h ? formatPrice(ticker.low24h * (livePrice / ticker.priceRub || 1), 'rub') : '—'}
              </span>
            </div>
            <div>
              <span className="text-muted-foreground">Объём 24ч: </span>
              <span className="font-mono tabular-nums">{formatPrice(volume24h, 'rub')}</span>
            </div>
          </div>
        </div>

        {/* Main 3-column layout */}
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_340px] gap-4">
          {/* LEFT/CENTER */}
          <div className="space-y-4 min-w-0">
            {/* Chart */}
            <Card className="overflow-hidden bg-black border-border p-0">
              <div className="h-[400px] w-full">
                <iframe
                  title="TradingView Chart"
                  src={`https://www.tradingview.com/widgetembed/?frameElementId=tv&symbol=${encodeURIComponent(
                    tvSymbol
                  )}&interval=5&theme=dark&hide_side_toolbar=false&hide_top_toolbar=false&allow_symbol_change=false&hideideas=true&hide_volume=false`}
                  className="w-full h-full border-0"
                  allowFullScreen
                />
              </div>
            </Card>

            <RecentTrades price={livePrice} pair={selectedPair} />
          </div>

          {/* RIGHT */}
          <div className="space-y-4">
            <OrderBook price={livePrice} pair={selectedPair} />
            <OrderForm price={livePrice} pair={selectedPair} ticker={ticker} />
            <MyTrades pair={selectedPair} />
          </div>
        </div>
      </div>
    </div>
  )
}
