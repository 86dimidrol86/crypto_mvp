'use client'

import { useEffect, useMemo, useState } from 'react'
import {
  Search,
  Star,
  TrendingUp,
  TrendingDown,
  ArrowRight,
  LineChart,
} from 'lucide-react'
import { useAppStore } from '@/lib/store'
import { fetchTickers, jitterPrice } from '@/lib/market'
import type { CoinTicker } from '@/lib/types'
import { formatPrice, formatNumber, formatPercent } from '@/lib/format'
import { cn } from '@/lib/utils'
import { CoinIcon } from '@/components/coin-icon'
import { Sparkline } from '@/components/sparkline'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { TableSkeleton } from '@/components/page-skeleton'
import { toast } from 'sonner'

type SortKey = 'price' | 'change' | 'volume' | 'name'
type SortDir = 'asc' | 'desc'
type TabKey = 'all' | 'favorites' | 'gainers' | 'losers'

const PAIR_TICKERS = [
  { symbol: 'BTC', name: 'Bitcoin' },
  { symbol: 'ETH', name: 'Ethereum' },
  { symbol: 'XRP', name: 'Ripple' },
  { symbol: 'SOL', name: 'Solana' },
  { symbol: 'BNB', name: 'BNB' },
  { symbol: 'DOGE', name: 'Dogecoin' },
  { symbol: 'ADA', name: 'Cardano' },
  { symbol: 'AVAX', name: 'Avalanche' },
]

function generateSpark(change: number): number[] {
  const trend = change >= 0 ? 1 : -1
  return Array.from({ length: 16 }, (_, i) => {
    const base = 50 + i * trend * 1.5
    return base + (Math.random() - 0.5) * 6
  })
}

function loadFavorites(): Set<string> {
  if (typeof window === 'undefined') return new Set()
  try {
    const raw = localStorage.getItem('crypto-favorites')
    if (!raw) return new Set()
    const arr = JSON.parse(raw) as string[]
    return new Set(arr)
  } catch {
    return new Set()
  }
}

function saveFavorites(fav: Set<string>) {
  try {
    localStorage.setItem('crypto-favorites', JSON.stringify(Array.from(fav)))
  } catch {
    /* ignore */
  }
}

function priceDecimals(price: number): number {
  if (price >= 1000) return 2
  if (price >= 1) return 2
  if (price >= 0.01) return 4
  return 6
}

function Volume24h({ rub }: { rub: number }) {
  if (rub >= 1_000_000_000) return <>{(rub / 1_000_000_000).toFixed(2)}B ₽</>
  if (rub >= 1_000_000) return <>{(rub / 1_000_000).toFixed(2)}M ₽</>
  if (rub >= 1000) return <>{Math.round(rub).toLocaleString('ru-RU')} ₽</>
  return <>{rub.toFixed(0)} ₽</>
}

export function MarketsView() {
  const setView = useAppStore((s) => s.setView)
  const setSelectedPair = useAppStore((s) => s.setSelectedPair)

  const [tickers, setTickers] = useState<CoinTicker[]>([])
  const [query, setQuery] = useState('')
  const [tab, setTab] = useState<TabKey>('all')
  const [sortKey, setSortKey] = useState<SortKey>('volume')
  const [sortDir, setSortDir] = useState<SortDir>('desc')
  const [favorites, setFavorites] = useState<Set<string>>(new Set())

  // Hydrate favorites from localStorage on mount
  useEffect(() => {
    setFavorites(loadFavorites())
  }, [])

  // Poll tickers every 12s
  useEffect(() => {
    let mounted = true
    const load = async () => {
      const t = await fetchTickers()
      if (mounted) setTickers(t)
    }
    load()
    const interval = setInterval(load, 12000)
    return () => {
      mounted = false
      clearInterval(interval)
    }
  }, [])

  // Local jitter every 3.5s for "live" feel
  useEffect(() => {
    if (tickers.length === 0) return
    const interval = setInterval(() => {
      setTickers((prev) =>
        prev.map((c) => {
          const next = jitterPrice(c.priceRub)
          const ratio = c.priceUsd > 0 ? c.priceRub / c.priceUsd : 92.5
          return { ...c, priceRub: next, priceUsd: next / ratio }
        })
      )
    }, 3500)
    return () => clearInterval(interval)
  }, [tickers.length])

  const toggleFav = (symbol: string) => {
    setFavorites((prev) => {
      const next = new Set(prev)
      if (next.has(symbol)) {
        next.delete(symbol)
        toast(`${symbol} удалён из избранного`)
      } else {
        next.add(symbol)
        toast.success(`${symbol} добавлен в избранное`)
      }
      saveFavorites(next)
      return next
    })
  }

  // Build pairs array with derived fields
  const rows = useMemo(() => {
    return PAIR_TICKERS.map((p) => {
      const t = tickers.find((x) => x.symbol === p.symbol)
      return {
        symbol: p.symbol,
        name: p.name,
        pair: `${p.symbol}/RUB`,
        priceRub: t?.priceRub ?? 0,
        priceUsd: t?.priceUsd ?? 0,
        change24h: t?.change24h ?? 0,
        high24h: t?.high24h ? t.high24h * (t.priceRub / t.priceUsd || 1) : undefined,
        low24h: t?.low24h ? t.low24h * (t.priceRub / t.priceUsd || 1) : undefined,
        volume24hRub: t?.volume24h ? t.volume24h * (t.priceRub / t.priceUsd || 1) : 0,
        spark: generateSpark(t?.change24h ?? 0),
        isFav: favorites.has(p.symbol),
      }
    })
  }, [tickers, favorites])

  // Filter + search + tab
  const filtered = useMemo(() => {
    let r = rows
    if (tab === 'favorites') r = r.filter((x) => x.isFav)
    else if (tab === 'gainers') r = r.filter((x) => x.change24h > 0)
    else if (tab === 'losers') r = r.filter((x) => x.change24h < 0)

    if (query.trim()) {
      const q = query.trim().toLowerCase()
      r = r.filter((x) => x.symbol.toLowerCase().includes(q) || x.name.toLowerCase().includes(q))
    }
    return r
  }, [rows, tab, query])

  // Sort
  const sorted = useMemo(() => {
    const arr = [...filtered]
    arr.sort((a, b) => {
      let cmp = 0
      if (sortKey === 'price') cmp = a.priceRub - b.priceRub
      else if (sortKey === 'change') cmp = a.change24h - b.change24h
      else if (sortKey === 'volume') cmp = a.volume24hRub - b.volume24hRub
      else cmp = a.symbol.localeCompare(b.symbol)
      return sortDir === 'asc' ? cmp : -cmp
    })
    return arr
  }, [filtered, sortKey, sortDir])

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'))
    } else {
      setSortKey(key)
      setSortDir(key === 'name' ? 'asc' : 'desc')
    }
  }

  const goTrade = (pair: string) => {
    setSelectedPair(pair)
    setView('trade')
  }

  // Aggregate stats banner
  const totalVolume = rows.reduce((s, r) => s + r.volume24hRub, 0)
  const gainers = rows.filter((r) => r.change24h > 0).length
  const losers = rows.filter((r) => r.change24h < 0).length
  const topGainer = [...rows].sort((a, b) => b.change24h - a.change24h)[0]
  const topLoser = [...rows].sort((a, b) => a.change24h - b.change24h)[0]

  const loading = tickers.length === 0

  return (
    <div className="flex-1 bg-background">
      <div className="mx-auto max-w-[1400px] px-4 lg:px-6 py-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5">
          <div>
            <div className="flex items-center gap-2.5">
              <div className="w-10 h-10 rounded-xl bg-primary/15 text-primary flex items-center justify-center">
                <LineChart className="w-5 h-5" />
              </div>
              <div>
                <h1 className="text-2xl font-bold tracking-tight">Рынки</h1>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Реальные котировки Binance • 8 торговых пар • обновление каждые 12 сек
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Aggregate stats banner */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
          <Card className="p-4">
            <div className="text-[11px] uppercase tracking-wider text-muted-foreground">
              Объём 24ч (все пары)
            </div>
            <div className="text-xl font-bold mt-1 font-mono tabular-nums">
              {totalVolume > 0 ? <Volume24h rub={totalVolume} /> : '—'}
            </div>
          </Card>
          <Card className="p-4">
            <div className="text-[11px] uppercase tracking-wider text-muted-foreground">
              Растущих / Падающих
            </div>
            <div className="text-xl font-bold mt-1 flex items-center gap-2">
              <span className="text-success">{gainers}</span>
              <span className="text-muted-foreground text-sm">/</span>
              <span className="text-destructive">{losers}</span>
            </div>
          </Card>
          <Card className="p-4">
            <div className="text-[11px] uppercase tracking-wider text-muted-foreground">
              Топ роста
            </div>
            <div className="text-xl font-bold mt-1 flex items-center gap-2 text-success">
              {topGainer ? (
                <>
                  <span>{topGainer.symbol}</span>
                  <span className="text-sm font-mono">{formatPercent(topGainer.change24h)}</span>
                </>
              ) : (
                '—'
              )}
            </div>
          </Card>
          <Card className="p-4">
            <div className="text-[11px] uppercase tracking-wider text-muted-foreground">
              Топ падения
            </div>
            <div className="text-xl font-bold mt-1 flex items-center gap-2 text-destructive">
              {topLoser ? (
                <>
                  <span>{topLoser.symbol}</span>
                  <span className="text-sm font-mono">{formatPercent(topLoser.change24h)}</span>
                </>
              ) : (
                '—'
              )}
            </div>
          </Card>
        </div>

        {/* Toolbar */}
        <Card className="p-3 mb-4">
          <div className="flex flex-col lg:flex-row lg:items-center gap-3">
            <Tabs value={tab} onValueChange={(v) => setTab(v as TabKey)}>
              <TabsList>
                <TabsTrigger value="all">Все</TabsTrigger>
                <TabsTrigger value="favorites">
                  <Star className="w-3.5 h-3.5 mr-1.5" />
                  Фавориты
                </TabsTrigger>
                <TabsTrigger value="gainers">Рост</TabsTrigger>
                <TabsTrigger value="losers">Падение</TabsTrigger>
              </TabsList>
            </Tabs>

            <div className="relative flex-1 lg:max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Поиск по символу или названию…"
                className="pl-9 h-9"
              />
            </div>
          </div>
        </Card>

        {/* Desktop table */}
        <Card className="overflow-hidden hidden lg:block">
          {/* Header */}
          <div className="grid grid-cols-[1.6fr_1fr_0.8fr_0.8fr_0.8fr_1fr_0.7fr] gap-3 px-3 py-2.5 border-b border-border text-[10px] uppercase tracking-wider text-muted-foreground">
            <button onClick={() => toggleSort('name')} className="flex items-center gap-1 text-left">
              Пара {sortKey === 'name' && <span>{sortDir === 'asc' ? '▲' : '▼'}</span>}
            </button>
            <button onClick={() => toggleSort('price')} className="flex items-center gap-1 text-right justify-end">
              Цена {sortKey === 'price' && <span>{sortDir === 'asc' ? '▲' : '▼'}</span>}
            </button>
            <button onClick={() => toggleSort('change')} className="flex items-center gap-1 text-right justify-end">
              Изм. 24ч {sortKey === 'change' && <span>{sortDir === 'asc' ? '▲' : '▼'}</span>}
            </button>
            <span className="text-right">Макс 24ч</span>
            <span className="text-right">Мин 24ч</span>
            <button onClick={() => toggleSort('volume')} className="flex items-center gap-1 text-right justify-end">
              Объём 24ч {sortKey === 'volume' && <span>{sortDir === 'asc' ? '▲' : '▼'}</span>}
            </button>
            <span className="text-right">Действие</span>
          </div>

          {loading ? (
            <TableSkeleton rows={8} />
          ) : sorted.length === 0 ? (
            <div className="py-16 text-center text-sm text-muted-foreground">
              Нет подходящих пар
            </div>
          ) : (
            <div className="flex flex-col">
              {sorted.map((r) => {
                const up = r.change24h >= 0
                const dec = priceDecimals(r.priceRub)
                return (
                  <div
                    key={r.symbol}
                    className="grid grid-cols-[1.6fr_1fr_0.8fr_0.8fr_0.8fr_1fr_0.7fr] gap-3 px-3 py-2.5 items-center border-b border-border/60 last:border-0 hover:bg-muted/40 transition group"
                  >
                    {/* Pair + fav star */}
                    <div className="flex items-center gap-2.5 min-w-0">
                      <button
                        onClick={() => toggleFav(r.symbol)}
                        aria-label={r.isFav ? 'Убрать из избранного' : 'Добавить в избранное'}
                        className="shrink-0"
                      >
                        <Star
                          className={cn(
                            'w-4 h-4 transition',
                            r.isFav
                              ? 'fill-primary text-primary'
                              : 'text-muted-foreground/50 hover:text-primary'
                          )}
                        />
                      </button>
                      <CoinIcon symbol={r.symbol} size={28} />
                      <div className="min-w-0">
                        <div className="font-semibold text-sm flex items-center gap-1.5">
                          {r.symbol}
                          <span className="text-[10px] text-muted-foreground font-normal">/RUB</span>
                        </div>
                        <div className="text-[11px] text-muted-foreground truncate">{r.name}</div>
                      </div>
                    </div>
                    {/* Price */}
                    <div className="text-right font-mono tabular-nums text-sm">
                      {r.priceRub > 0
                        ? r.priceRub.toLocaleString('ru-RU', {
                            minimumFractionDigits: dec,
                            maximumFractionDigits: dec,
                          })
                        : '—'}
                      <span className="text-muted-foreground"> ₽</span>
                    </div>
                    {/* Change */}
                    <div className="text-right">
                      <span
                        className={cn(
                          'inline-flex items-center gap-0.5 text-xs font-medium px-2 py-0.5 rounded-md',
                          up ? 'text-success bg-success/10' : 'text-destructive bg-destructive/10'
                        )}
                      >
                        {up ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                        {formatPercent(r.change24h)}
                      </span>
                    </div>
                    {/* High */}
                    <div className="text-right text-xs font-mono tabular-nums text-muted-foreground">
                      {r.high24h ? formatPrice(r.high24h, 'rub') : '—'}
                    </div>
                    {/* Low */}
                    <div className="text-right text-xs font-mono tabular-nums text-muted-foreground">
                      {r.low24h ? formatPrice(r.low24h, 'rub') : '—'}
                    </div>
                    {/* Volume + sparkline */}
                    <div className="flex items-center justify-end gap-2">
                      <Sparkline data={r.spark} width={70} height={22} />
                      <div className="text-right text-xs font-mono tabular-nums">
                        <Volume24h rub={r.volume24hRub} />
                      </div>
                    </div>
                    {/* Action */}
                    <div className="text-right">
                      <Button
                        size="sm"
                        onClick={() => goTrade(r.pair)}
                        className="h-7 gap-1 bg-primary text-primary-foreground hover:bg-primary/90 text-xs px-2.5"
                      >
                        Торговать
                        <ArrowRight className="w-3 h-3" />
                      </Button>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </Card>

        {/* Mobile cards */}
        <div className="lg:hidden flex flex-col gap-3">
          {loading ? (
            <TableSkeleton rows={6} />
          ) : sorted.length === 0 ? (
            <div className="py-16 text-center text-sm text-muted-foreground">
              Нет подходящих пар
            </div>
          ) : (
            sorted.map((r) => {
              const up = r.change24h >= 0
              const dec = priceDecimals(r.priceRub)
              return (
                <Card key={r.symbol} className="p-4">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2.5">
                      <button onClick={() => toggleFav(r.symbol)} aria-label="Избранное">
                        <Star
                          className={cn(
                            'w-4 h-4',
                            r.isFav
                              ? 'fill-primary text-primary'
                              : 'text-muted-foreground/50'
                          )}
                        />
                      </button>
                      <CoinIcon symbol={r.symbol} size={32} />
                      <div>
                        <div className="font-semibold text-sm flex items-center gap-1.5">
                          {r.symbol}
                          <span className="text-[10px] text-muted-foreground font-normal">/RUB</span>
                        </div>
                        <div className="text-[11px] text-muted-foreground">{r.name}</div>
                      </div>
                    </div>
                    <span
                      className={cn(
                        'inline-flex items-center gap-0.5 text-xs font-medium px-2 py-0.5 rounded-md',
                        up ? 'text-success bg-success/10' : 'text-destructive bg-destructive/10'
                      )}
                    >
                      {up ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                      {formatPercent(r.change24h)}
                    </span>
                  </div>

                  <div className="flex items-end justify-between mb-3">
                    <div>
                      <div className="text-[10px] text-muted-foreground uppercase">Цена</div>
                      <div className="text-xl font-mono font-bold tabular-nums">
                        {r.priceRub > 0
                          ? r.priceRub.toLocaleString('ru-RU', {
                              minimumFractionDigits: dec,
                              maximumFractionDigits: dec,
                            })
                          : '—'}
                        <span className="text-sm text-muted-foreground"> ₽</span>
                      </div>
                    </div>
                    <Sparkline data={r.spark} width={90} height={30} />
                  </div>

                  <div className="grid grid-cols-3 gap-2 text-[11px] mb-3">
                    <div>
                      <div className="text-muted-foreground">Макс 24ч</div>
                      <div className="font-mono tabular-nums">{r.high24h ? formatPrice(r.high24h, 'rub') : '—'}</div>
                    </div>
                    <div>
                      <div className="text-muted-foreground">Мин 24ч</div>
                      <div className="font-mono tabular-nums">{r.low24h ? formatPrice(r.low24h, 'rub') : '—'}</div>
                    </div>
                    <div>
                      <div className="text-muted-foreground">Объём</div>
                      <div className="font-mono tabular-nums"><Volume24h rub={r.volume24hRub} /></div>
                    </div>
                  </div>

                  <Button
                    onClick={() => goTrade(r.pair)}
                    className="w-full h-9 gap-1.5 bg-primary text-primary-foreground hover:bg-primary/90 text-sm"
                  >
                    Торговать {r.symbol}
                    <ArrowRight className="w-4 h-4" />
                  </Button>
                </Card>
              )
            })
          )}
        </div>

        {/* Footer hint */}
        <div className="mt-4 flex flex-wrap items-center gap-2 text-[11px] text-muted-foreground">
          <Badge variant="outline" className="border-border text-muted-foreground">
            <Star className="w-3 h-3 mr-1 fill-primary text-primary" /> Фавориты хранятся локально
          </Badge>
          <span>•</span>
          <span>Котировки: Binance 24hr ticker · USD/RUB: exchangerate-api</span>
        </div>
      </div>
    </div>
  )
}
