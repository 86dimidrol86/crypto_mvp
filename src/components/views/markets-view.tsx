'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import {
  Search,
  Star,
  TrendingUp,
  TrendingDown,
  ArrowRight,
  LineChart,
  Bell,
  BellRing,
  Trash2,
  Plus,
  ArrowUp,
  ArrowDown,
  BarChart3,
  Activity,
} from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { useAppStore } from '@/lib/store'
import { useI18n } from '@/lib/use-i18n'
import { fetchTickers, jitterPrice } from '@/lib/market'
import type { CoinTicker, PriceAlertCondition } from '@/lib/types'
import { formatPrice, formatNumber, formatPercent, timeAgo } from '@/lib/format'
import { useMounted } from '@/lib/use-mounted'
import { cn } from '@/lib/utils'
import { CoinIcon } from '@/components/coin-icon'
import { Sparkline } from '@/components/sparkline'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
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

// ─── Price alert dialog (one per row) ────────────────────────────────────────
function PriceAlertDialog({
  symbol,
  currentPrice,
}: {
  symbol: string
  currentPrice: number
}) {
  const priceAlerts = useAppStore((s) => s.priceAlerts)
  const addPriceAlert = useAppStore((s) => s.addPriceAlert)
  const removePriceAlert = useAppStore((s) => s.removePriceAlert)
  const togglePriceAlert = useAppStore((s) => s.togglePriceAlert)
  const { t } = useI18n()

  const [open, setOpen] = useState(false)
  const [condition, setCondition] = useState<PriceAlertCondition>('above')
  const [targetPrice, setTargetPrice] = useState<string>(currentPrice > 0 ? currentPrice.toFixed(2) : '')
  const [note, setNote] = useState('')

  const symbolAlerts = priceAlerts.filter((a) => a.symbol === symbol)

  // Pre-fill target price when dialog opens with fresh price
  useEffect(() => {
    if (open && currentPrice > 0) {
      setTargetPrice(currentPrice.toFixed(2))
      setCondition('above')
      setNote('')
    }
  }, [open, currentPrice])

  const handleAdd = () => {
    const price = parseFloat(targetPrice.replace(',', '.'))
    if (!price || price <= 0) {
      toast.error(t('markets.alert.toast.invalid'))
      return
    }
    addPriceAlert({
      symbol,
      condition,
      targetPrice: price,
      note: note.trim() || undefined,
    })
    toast.success(`${t('markets.alert.toast.created')} ${symbol} ${condition === 'above' ? '≥' : '≤'} ${price.toLocaleString('ru-RU', { maximumFractionDigits: 2 })} ₽`)
    setNote('')
    setOpen(false)
  }

  const activeCount = symbolAlerts.filter((a) => a.active && !a.triggered).length

  return (
    <>
      <Button
        variant="ghost"
        size="icon"
        className="relative h-7 w-7"
        onClick={() => setOpen(true)}
        title={`${t('markets.alert.title.bySymbol')} ${symbol}`}
      >
        {activeCount > 0 ? (
          <BellRing className="w-3.5 h-3.5 text-primary" />
        ) : (
          <Bell className="w-3.5 h-3.5 text-muted-foreground" />
        )}
        {symbolAlerts.length > 0 && (
          <span className="absolute top-0.5 right-0.5 min-w-3.5 h-3.5 px-1 rounded-full bg-primary text-primary-foreground text-[9px] font-bold flex items-center justify-center">
            {symbolAlerts.length}
          </span>
        )}
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <BellRing className="w-5 h-5 text-primary" />
              {t('markets.alert.title.onPair')} {symbol}/RUB
            </DialogTitle>
            <DialogDescription>
              {t('markets.alert.desc')}{' '}
              <span className="font-mono tabular-nums text-foreground">
                {currentPrice > 0
                  ? `${currentPrice.toLocaleString('ru-RU', { maximumFractionDigits: 2 })} ₽`
                  : '—'}
              </span>
            </DialogDescription>
          </DialogHeader>

          {/* Existing alerts for this symbol */}
          {symbolAlerts.length > 0 && (
            <div className="space-y-1.5">
              <div className="text-[11px] uppercase tracking-wider text-muted-foreground">
                {t('markets.alert.current')} ({symbolAlerts.length})
              </div>
              <div className="max-h-32 overflow-y-auto scrollbar-thin space-y-1.5">
                {symbolAlerts.map((a) => (
                  <div
                    key={a.id}
                    className={cn(
                      'flex items-center gap-2 p-2 rounded-md border text-xs',
                      a.triggered
                        ? 'border-destructive/40 bg-destructive/5'
                        : a.active
                          ? 'border-primary/30 bg-primary/5'
                          : 'border-border bg-muted/40 opacity-60'
                    )}
                  >
                    <span
                      className={cn(
                        'inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded font-mono font-semibold',
                        a.condition === 'above'
                          ? 'text-success bg-success/10'
                          : 'text-destructive bg-destructive/10'
                      )}
                    >
                      {a.condition === 'above' ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />}
                      {a.condition === 'above' ? '≥' : '≤'}
                    </span>
                    <span className="font-mono tabular-nums font-semibold">
                      {a.targetPrice.toLocaleString('ru-RU', { maximumFractionDigits: 2 })} ₽
                    </span>
                    {a.triggered ? (
                      <Badge variant="outline" className="h-4 px-1 text-[9px] text-destructive border-destructive/40">
                        {t('markets.alert.triggeredWord')}
                      </Badge>
                    ) : a.active ? (
                      <Badge variant="outline" className="h-4 px-1 text-[9px] text-success border-success/40">
                        {t('markets.alert.activeWord')}
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="h-4 px-1 text-[9px] text-muted-foreground">
                        {t('markets.alert.paused')}
                      </Badge>
                    )}
                    <div className="ml-auto flex items-center gap-2">
                      <Switch
                        checked={a.active}
                        onCheckedChange={() => togglePriceAlert(a.id)}
                        className="scale-75"
                        title={a.active ? t('markets.alert.pauseTitle') : t('markets.alert.resumeTitle')}
                      />
                      <button
                        onClick={() => {
                          removePriceAlert(a.id)
                          toast(`${t('markets.alert.deletedToast')} ${a.symbol} ${a.condition === 'above' ? '≥' : '≤'} ${a.targetPrice} ₽`)
                        }}
                        className="text-muted-foreground hover:text-destructive"
                        title={t('markets.alert.deleteTitle')}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* New alert form */}
          <div className="space-y-3 pt-2 border-t border-border">
            <div className="text-[11px] uppercase tracking-wider text-muted-foreground">
              {t('markets.alert.new')}
            </div>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setCondition('above')}
                className={cn(
                  'flex flex-col items-center justify-center gap-1 px-3 py-2 rounded-lg border transition',
                  condition === 'above'
                    ? 'border-success bg-success/10 text-success'
                    : 'border-border text-muted-foreground hover:text-foreground hover:bg-muted/40'
                )}
              >
                <ArrowUp className="w-4 h-4" />
                <span className="text-xs font-semibold">{t('markets.alert.above')}</span>
                <span className="text-[10px] opacity-70">{t('markets.alert.aboveHint')}</span>
              </button>
              <button
                type="button"
                onClick={() => setCondition('below')}
                className={cn(
                  'flex flex-col items-center justify-center gap-1 px-3 py-2 rounded-lg border transition',
                  condition === 'below'
                    ? 'border-destructive bg-destructive/10 text-destructive'
                    : 'border-border text-muted-foreground hover:text-foreground hover:bg-muted/40'
                )}
              >
                <ArrowDown className="w-4 h-4" />
                <span className="text-xs font-semibold">{t('markets.alert.below')}</span>
                <span className="text-[10px] opacity-70">{t('markets.alert.belowHint')}</span>
              </button>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="alert-price" className="text-[11px] uppercase tracking-wider text-muted-foreground">
                {t('markets.alert.target')}
              </Label>
              <Input
                id="alert-price"
                type="number"
                inputMode="decimal"
                value={targetPrice}
                onChange={(e) => setTargetPrice(e.target.value)}
                placeholder="0.00"
                className="font-mono tabular-nums"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="alert-note" className="text-[11px] uppercase tracking-wider text-muted-foreground">
                {t('markets.alert.note')}
              </Label>
              <Input
                id="alert-note"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder={t('markets.alert.notePlaceholder')}
                maxLength={80}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>
              {t('markets.alert.cancel')}
            </Button>
            <Button onClick={handleAdd} className="gap-1.5 bg-primary text-primary-foreground hover:bg-primary/90">
              <Plus className="w-4 h-4" />
              {t('markets.alert.createBtn')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}

// ─── My alerts section ──────────────────────────────────────────────────────
function MyAlertsSection({ tickers }: { tickers: CoinTicker[] }) {
  const priceAlerts = useAppStore((s) => s.priceAlerts)
  const removePriceAlert = useAppStore((s) => s.removePriceAlert)
  const togglePriceAlert = useAppStore((s) => s.togglePriceAlert)
  const mounted = useMounted()
  const { t } = useI18n()

  if (priceAlerts.length === 0) {
    return (
      <Card className="p-4 mt-3">
        <div className="flex flex-col items-center text-center">
          <div className="w-10 h-10 rounded-full bg-muted/60 flex items-center justify-center mb-2">
            <Bell className="w-5 h-5 text-muted-foreground" />
          </div>
          <h3 className="font-semibold text-sm">{t('markets.alertsSection.title')}</h3>
          <p className="text-xs text-muted-foreground mt-1 max-w-sm">
            {t('markets.alertsSection.desc')}
          </p>
        </div>
      </Card>
    )
  }

  const active = priceAlerts.filter((a) => a.active && !a.triggered)
  const triggeredAlerts = priceAlerts.filter((a) => a.triggered)
  const paused = priceAlerts.filter((a) => !a.active && !a.triggered)

  const priceFor = (symbol: string): number => {
    const tk = tickers.find((x) => x.symbol === symbol)
    return tk?.priceRub ?? 0
  }

  return (
    <Card className="p-3.5 mt-3">
      <div className="flex items-center justify-between mb-2.5">
        <div className="flex items-center gap-2">
          <BellRing className="w-4 h-4 text-primary" />
          <h3 className="font-semibold text-sm">{t('markets.myAlerts.title')}</h3>
          <Badge variant="outline" className="text-[10px] text-muted-foreground">
            {priceAlerts.length}
          </Badge>
        </div>
        <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
          <span className="inline-flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-primary" /> {t('markets.myAlerts.active')} {active.length}
          </span>
          <span className="inline-flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-destructive" /> {t('markets.myAlerts.triggered')} {triggeredAlerts.length}
          </span>
          {paused.length > 0 && (
            <span className="inline-flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground" /> {t('markets.myAlerts.paused')} {paused.length}
            </span>
          )}
        </div>
      </div>

      <div className="max-h-96 overflow-y-auto scrollbar-thin">
        <div className="grid gap-1.5">
          <AnimatePresence initial={false}>
            {priceAlerts.map((a) => {
              const cur = priceFor(a.symbol)
              const distance = cur > 0 ? ((a.targetPrice - cur) / cur) * 100 : 0
              const isTriggered = a.triggered
              return (
                <motion.div
                  key={a.id}
                  layout
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, x: -10 }}
                  className={cn(
                    'flex items-center gap-3 px-3 py-2 rounded-lg border text-sm',
                    isTriggered
                      ? 'border-destructive/40 bg-destructive/5 animate-pulse'
                      : a.active
                        ? 'border-border hover:bg-muted/40'
                        : 'border-border opacity-60'
                  )}
                >
                  <div className="flex items-center gap-2 shrink-0">
                    <CoinIcon symbol={a.symbol} size={22} />
                    <span className="font-semibold text-sm">{a.symbol}</span>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <span
                      className={cn(
                        'inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-mono font-semibold',
                        a.condition === 'above'
                          ? 'text-success bg-success/10'
                          : 'text-destructive bg-destructive/10'
                      )}
                    >
                      {a.condition === 'above' ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />}
                      {a.condition === 'above' ? '≥' : '≤'}
                    </span>
                    <span className="font-mono tabular-nums font-semibold">
                      {a.targetPrice.toLocaleString('ru-RU', { maximumFractionDigits: 2 })} ₽
                    </span>
                  </div>
                  <div className="text-[11px] text-muted-foreground shrink-0">
                    {cur > 0 ? (
                      <>
                        {t('markets.myAlerts.cur')} <span className="font-mono tabular-nums">{cur.toLocaleString('ru-RU', { maximumFractionDigits: 2 })} ₽</span>
                        <span className={cn('ml-1', Math.abs(distance) < 1 ? 'text-warning' : 'text-muted-foreground/70')}>
                          ({distance >= 0 ? '+' : ''}{distance.toFixed(1)}%)
                        </span>
                      </>
                    ) : (
                      '—'
                    )}
                  </div>
                  {a.note && (
                    <span className="text-[11px] text-muted-foreground italic truncate max-w-[160px]">
                      «{a.note}»
                    </span>
                  )}
                  <div className="ml-auto flex items-center gap-2 shrink-0">
                    {isTriggered ? (
                      <Badge variant="outline" className="text-[10px] text-destructive border-destructive/40">
                        {t('markets.alert.triggeredWord')} {a.triggeredAt && mounted ? timeAgo(a.triggeredAt) : ''}
                      </Badge>
                    ) : (
                      <Switch
                        checked={a.active}
                        onCheckedChange={() => togglePriceAlert(a.id)}
                        title={a.active ? t('markets.alert.pauseTitle') : t('markets.alert.resumeTitle')}
                      />
                    )}
                    <button
                      onClick={() => {
                        removePriceAlert(a.id)
                        toast(`${t('markets.alert.deletedToast')} ${a.symbol}`)
                      }}
                      className="text-muted-foreground hover:text-destructive transition"
                      title={t('markets.alert.deleteTitle')}
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </motion.div>
              )
            })}
          </AnimatePresence>
        </div>
      </div>
    </Card>
  )
}

export function MarketsView() {
  const setView = useAppStore((s) => s.setView)
  const setSelectedPair = useAppStore((s) => s.setSelectedPair)
  const priceAlerts = useAppStore((s) => s.priceAlerts)
  const markPriceAlertTriggered = useAppStore((s) => s.markPriceAlertTriggered)
  const pushNotification = useAppStore((s) => s.pushNotification)
  const { t } = useI18n()

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
      const tt = await fetchTickers()
      if (mounted) setTickers(tt)
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

  // Background price-alert checker: compare live tickers vs active alerts.
  // Uses a ref to keep the latest alerts/prices without re-running on every tick.
  const alertsRef = useRef(priceAlerts)
  const tickersRef = useRef<CoinTicker[]>(tickers)
  useEffect(() => {
    alertsRef.current = priceAlerts
  }, [priceAlerts])
  useEffect(() => {
    tickersRef.current = tickers
  }, [tickers])

  useEffect(() => {
    const check = () => {
      const currentAlerts = alertsRef.current
      const currentTickers = tickersRef.current
      if (currentAlerts.length === 0 || currentTickers.length === 0) return
      const activeAlerts = currentAlerts.filter((a) => a.active && !a.triggered)
      if (activeAlerts.length === 0) return
      for (const alert of activeAlerts) {
        const tk = currentTickers.find((x) => x.symbol === alert.symbol)
        if (!tk || tk.priceRub <= 0) continue
        const crossed =
          (alert.condition === 'above' && tk.priceRub >= alert.targetPrice) ||
          (alert.condition === 'below' && tk.priceRub <= alert.targetPrice)
        if (crossed) {
          markPriceAlertTriggered(alert.id)
          const dir = alert.condition === 'above' ? t('markets.toast.dirAbove') : t('markets.toast.dirBelow')
          const msg = `${alert.symbol} ${dir} ${alert.targetPrice.toLocaleString('ru-RU', { maximumFractionDigits: 2 })} ₽ (${t('markets.toast.curWord')} ${tk.priceRub.toLocaleString('ru-RU', { maximumFractionDigits: 2 })} ₽)`
          toast.warning(`🔔 ${t('markets.toast.alertTitle')} ${alert.symbol}`, { description: msg })
          pushNotification(`${t('markets.toast.alertBySymbol')} ${alert.symbol}`, msg)
        }
      }
    }
    // Run on every 12s ticker refresh (poll interval) and every 3.5s jitter
    const interval = setInterval(check, 3500)
    return () => clearInterval(interval)
  }, [markPriceAlertTriggered, pushNotification])

  const toggleFav = (symbol: string) => {
    setFavorites((prev) => {
      const next = new Set(prev)
      if (next.has(symbol)) {
        next.delete(symbol)
        toast(`${symbol} ${t('markets.toast.removedFav')}`)
      } else {
        next.add(symbol)
        toast.success(`${symbol} ${t('markets.toast.addedFav')}`)
      }
      saveFavorites(next)
      return next
    })
  }

  // Build pairs array with derived fields
  const rows = useMemo(() => {
    return PAIR_TICKERS.map((p) => {
      const tk = tickers.find((x) => x.symbol === p.symbol)
      return {
        symbol: p.symbol,
        name: p.name,
        pair: `${p.symbol}/RUB`,
        priceRub: tk?.priceRub ?? 0,
        priceUsd: tk?.priceUsd ?? 0,
        change24h: tk?.change24h ?? 0,
        high24h: tk?.high24h ? tk.high24h * (tk.priceRub / tk.priceUsd || 1) : undefined,
        low24h: tk?.low24h ? tk.low24h * (tk.priceRub / tk.priceUsd || 1) : undefined,
        volume24hRub: tk?.volume24h ? tk.volume24h * (tk.priceRub / tk.priceUsd || 1) : 0,
        spark: generateSpark(tk?.change24h ?? 0),
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
      <div className="mx-auto max-w-[1400px] px-3 lg:px-5 py-4">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 mb-4">
          <div>
            <div className="flex items-center gap-2.5">
              <div className="w-10 h-10 rounded-xl bg-primary/15 text-primary flex items-center justify-center">
                <LineChart className="w-5 h-5" />
              </div>
              <div>
                <h1 className="text-2xl font-bold tracking-tight">{t('markets.title')}</h1>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {t('markets.subtitle')}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Aggregate stats banner */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
          <Card className="p-3.5 hover:border-primary/30 transition-colors group">
            <div className="flex items-center justify-between">
              <div className="text-[11px] uppercase tracking-wider text-muted-foreground">
                {t('markets.stat.volumeAll')}
              </div>
              <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center group-hover:scale-110 transition">
                <BarChart3 className="w-3.5 h-3.5 text-primary" />
              </div>
            </div>
            <div className="text-xl font-bold mt-1.5 font-mono tabular-nums">
              {totalVolume > 0 ? <Volume24h rub={totalVolume} /> : '—'}
            </div>
          </Card>
          <Card className="p-3.5 hover:border-primary/30 transition-colors group">
            <div className="flex items-center justify-between">
              <div className="text-[11px] uppercase tracking-wider text-muted-foreground">
                {t('markets.stat.ratio')}
              </div>
              <div className="w-7 h-7 rounded-lg bg-muted/40 flex items-center justify-center group-hover:scale-110 transition">
                <Activity className="w-3.5 h-3.5 text-muted-foreground" />
              </div>
            </div>
            <div className="text-xl font-bold mt-1.5 flex items-center gap-2">
              <span className="text-success">{gainers}</span>
              <span className="text-muted-foreground text-sm">/</span>
              <span className="text-destructive">{losers}</span>
            </div>
          </Card>
          <Card className="p-3.5 hover:border-success/30 transition-colors group">
            <div className="flex items-center justify-between">
              <div className="text-[11px] uppercase tracking-wider text-muted-foreground">
                {t('markets.stat.topGainer')}
              </div>
              <div className="w-7 h-7 rounded-lg bg-success/10 flex items-center justify-center group-hover:scale-110 transition">
                <TrendingUp className="w-3.5 h-3.5 text-success" />
              </div>
            </div>
            <div className="text-xl font-bold mt-1.5 flex items-center gap-2 text-success">
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
          <Card className="p-3.5 hover:border-destructive/30 transition-colors group">
            <div className="flex items-center justify-between">
              <div className="text-[11px] uppercase tracking-wider text-muted-foreground">
                {t('markets.stat.topLoser')}
              </div>
              <div className="w-7 h-7 rounded-lg bg-destructive/10 flex items-center justify-center group-hover:scale-110 transition">
                <TrendingDown className="w-3.5 h-3.5 text-destructive" />
              </div>
            </div>
            <div className="text-xl font-bold mt-1.5 flex items-center gap-2 text-destructive">
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
        <Card className="p-2.5 mb-3">
          <div className="flex flex-col lg:flex-row lg:items-center gap-2.5">
            <Tabs value={tab} onValueChange={(v) => setTab(v as TabKey)}>
              <TabsList>
                <TabsTrigger value="all">{t('markets.tab.all')}</TabsTrigger>
                <TabsTrigger value="favorites">
                  <Star className="w-3.5 h-3.5 mr-1.5" />
                  {t('markets.tab.favs')}
                </TabsTrigger>
                <TabsTrigger value="gainers">{t('markets.tab.gainers')}</TabsTrigger>
                <TabsTrigger value="losers">{t('markets.tab.losers')}</TabsTrigger>
              </TabsList>
            </Tabs>

            <div className="relative flex-1 lg:max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={t('markets.search')}
                className="pl-9 h-9"
              />
            </div>
          </div>
        </Card>

        {/* Desktop table */}
        <Card className="overflow-hidden hidden lg:block">
          {/* Header */}
          <div className="grid grid-cols-[1.6fr_1fr_0.8fr_0.8fr_0.8fr_1fr_0.5fr_0.7fr] gap-3 px-3 py-2.5 border-b border-border text-[10px] uppercase tracking-wider text-muted-foreground">
            <button onClick={() => toggleSort('name')} className="flex items-center gap-1 text-left">
              {t('markets.col.pair')} {sortKey === 'name' && <span>{sortDir === 'asc' ? '▲' : '▼'}</span>}
            </button>
            <button onClick={() => toggleSort('price')} className="flex items-center gap-1 text-right justify-end">
              {t('markets.col.price')} {sortKey === 'price' && <span>{sortDir === 'asc' ? '▲' : '▼'}</span>}
            </button>
            <button onClick={() => toggleSort('change')} className="flex items-center gap-1 text-right justify-end">
              {t('markets.col.change')} {sortKey === 'change' && <span>{sortDir === 'asc' ? '▲' : '▼'}</span>}
            </button>
            <span className="text-right">{t('markets.col.high24')}</span>
            <span className="text-right">{t('markets.col.low24')}</span>
            <button onClick={() => toggleSort('volume')} className="flex items-center gap-1 text-right justify-end">
              {t('markets.col.volume24')} {sortKey === 'volume' && <span>{sortDir === 'asc' ? '▲' : '▼'}</span>}
            </button>
            <span className="text-center">{t('markets.col.alerts')}</span>
            <span className="text-right">{t('markets.col.action')}</span>
          </div>

          {loading ? (
            <TableSkeleton rows={8} />
          ) : sorted.length === 0 ? (
            <div className="py-12 text-center text-sm text-muted-foreground">
              {t('markets.empty')}
            </div>
          ) : (
            <div className="flex flex-col">
              {sorted.map((r) => {
                const up = r.change24h >= 0
                const dec = priceDecimals(r.priceRub)
                return (
                  <div
                    key={r.symbol}
                    className="grid grid-cols-[1.6fr_1fr_0.8fr_0.8fr_0.8fr_1fr_0.5fr_0.7fr] gap-3 px-3 py-2.5 items-center border-b border-border/60 last:border-0 hover:bg-muted/40 transition group"
                  >
                    {/* Pair + fav star */}
                    <div className="flex items-center gap-2.5 min-w-0">
                      <button
                        onClick={() => toggleFav(r.symbol)}
                        aria-label={r.isFav ? t('markets.fav.remove') : t('markets.fav.add')}
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
                    <div className="text-right">
                      <div className="text-xs font-mono tabular-nums text-muted-foreground">
                        {r.high24h ? formatPrice(r.high24h, 'rub') : '—'}
                      </div>
                    </div>
                    {/* Low + 24h range bar */}
                    <div className="text-right">
                      <div className="text-xs font-mono tabular-nums text-muted-foreground">
                        {r.low24h ? formatPrice(r.low24h, 'rub') : '—'}
                      </div>
                      {r.high24h && r.low24h && r.high24h > r.low24h && (
                        <div className="relative w-full h-1 bg-muted/50 rounded-full mt-1 overflow-hidden" title={`Low ${formatPrice(r.low24h, 'rub')} → High ${formatPrice(r.high24h, 'rub')}`}>
                          <div
                            className="absolute top-1/2 -translate-y-1/2 w-1.5 h-1.5 rounded-full"
                            style={{
                              left: `${Math.min(100, Math.max(0, ((r.priceRub - r.low24h) / (r.high24h - r.low24h)) * 100))}%`,
                              background: up ? 'var(--success)' : 'var(--destructive)',
                              boxShadow: `0 0 4px ${up ? 'var(--success)' : 'var(--destructive)'}`,
                            }}
                          />
                        </div>
                      )}
                    </div>
                    {/* Volume + sparkline */}
                    <div className="flex items-center justify-end gap-2">
                      <Sparkline data={r.spark} width={70} height={28} />
                      <div className="text-right text-xs font-mono tabular-nums">
                        <Volume24h rub={r.volume24hRub} />
                      </div>
                    </div>
                    {/* Alert bell */}
                    <div className="flex justify-center">
                      <PriceAlertDialog symbol={r.symbol} currentPrice={r.priceRub} />
                    </div>
                    {/* Action */}
                    <div className="text-right">
                      <Button
                        size="sm"
                        onClick={() => goTrade(r.pair)}
                        className="h-7 gap-1 bg-primary text-primary-foreground hover:bg-primary/90 text-xs px-2.5"
                      >
                        {t('markets.action.trade')}
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
            <div className="py-12 text-center text-sm text-muted-foreground">
              {t('markets.empty')}
            </div>
          ) : (
            sorted.map((r) => {
              const up = r.change24h >= 0
              const dec = priceDecimals(r.priceRub)
              return (
                <Card key={r.symbol} className="p-3.5">
                  <div className="flex items-center justify-between mb-2.5">
                    <div className="flex items-center gap-2.5">
                      <button onClick={() => toggleFav(r.symbol)} aria-label={t('markets.fav.aria')}>
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

                  <div className="flex items-end justify-between mb-2.5">
                    <div>
                      <div className="text-[10px] text-muted-foreground uppercase">{t('markets.col.price')}</div>
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

                  <div className="grid grid-cols-3 gap-2 text-[11px] mb-2.5">
                    <div>
                      <div className="text-muted-foreground">{t('markets.col.high24')}</div>
                      <div className="font-mono tabular-nums">{r.high24h ? formatPrice(r.high24h, 'rub') : '—'}</div>
                    </div>
                    <div>
                      <div className="text-muted-foreground">{t('markets.col.low24')}</div>
                      <div className="font-mono tabular-nums">{r.low24h ? formatPrice(r.low24h, 'rub') : '—'}</div>
                    </div>
                    <div>
                      <div className="text-muted-foreground">{t('common.volume')}</div>
                      <div className="font-mono tabular-nums"><Volume24h rub={r.volume24hRub} /></div>
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <Button
                      onClick={() => goTrade(r.pair)}
                      className="flex-1 h-9 gap-1.5 bg-primary text-primary-foreground hover:bg-primary/90 text-sm"
                    >
                      {t('markets.action.trade')} {r.symbol}
                      <ArrowRight className="w-4 h-4" />
                    </Button>
                    <PriceAlertDialog symbol={r.symbol} currentPrice={r.priceRub} />
                  </div>
                </Card>
              )
            })
          )}
        </div>

        {/* My alerts section */}
        <MyAlertsSection tickers={tickers} />

        {/* Footer hint */}
        <div className="mt-3 flex flex-wrap items-center gap-2 text-[11px] text-muted-foreground">
          <Badge variant="outline" className="border-border text-muted-foreground">
            <Star className="w-3 h-3 mr-1 fill-primary text-primary" /> {t('markets.note.favs')}
          </Badge>
          <span>•</span>
          <Badge variant="outline" className="border-border text-muted-foreground">
            <Bell className="w-3 h-3 mr-1 text-primary" /> {t('markets.note.alerts')}
          </Badge>
          <span>•</span>
          <span>{t('markets.note.source')}</span>
        </div>
      </div>
    </div>
  )
}
