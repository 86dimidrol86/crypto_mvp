'use client'

import { useEffect, useMemo, useState } from 'react'
import {
  ArrowRight,
  ShieldCheck,
  Zap,
  Globe2,
  TrendingUp,
  TrendingDown,
  Lock,
  Building2,
  CheckCircle2,
  Scale,
  Landmark,
} from 'lucide-react'
import { motion, useSpring, useTransform } from 'framer-motion'
import { useAppStore } from '@/lib/store'
import { fetchTickers, jitterPrice, getUsdRubRate } from '@/lib/market'
import type { CoinTicker } from '@/lib/types'
import { formatPrice, formatPercent } from '@/lib/format'
import { cn } from '@/lib/utils'
import { CoinIcon } from '@/components/coin-icon'
import { Sparkline } from '@/components/sparkline'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { MarketGridSkeleton, StatsSkeleton } from '@/components/page-skeleton'

/** Animated number using framer-motion spring. */
function AnimatedNumber({
  value,
  format,
  className,
}: {
  value: number
  format: (n: number) => string
  className?: string
}) {
  const mv = useSpring(value, { stiffness: 80, damping: 18 })
  const text = useTransform(mv, (v) => format(v))
  useEffect(() => {
    mv.set(value)
  }, [value, mv])
  return <motion.span className={className}>{text}</motion.span>
}

function Hero() {
  const setView = useAppStore((s) => s.setView)
  const isAuthed = useAppStore((s) => s.isAuthed)
  const [tickers, setTickers] = useState<CoinTicker[]>([])
  const [usdRub, setUsdRub] = useState<number>(0)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let mounted = true
    const load = async () => {
      const [t, r] = await Promise.all([fetchTickers(), getUsdRubRate()])
      if (mounted) {
        setTickers(t)
        setUsdRub(r)
        setLoading(false)
      }
    }
    load()
    const interval = setInterval(load, 15000)
    return () => {
      mounted = false
      clearInterval(interval)
    }
  }, [])

  // Aggregate 24h volume in RUB (sum of volume24h * usdRub)
  const totalVolumeRub = useMemo(() => {
    return tickers.reduce((s, c) => s + (c.volume24h ?? 0) * usdRub, 0)
  }, [tickers, usdRub])

  const topGainer = useMemo(() => {
    return [...tickers].sort((a, b) => b.change24h - a.change24h)[0]
  }, [tickers])
  const topLoser = useMemo(() => {
    return [...tickers].sort((a, b) => a.change24h - b.change24h)[0]
  }, [tickers])

  return (
    <section className="relative overflow-hidden border-b border-border">
      <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-transparent" />
      <div
        className="absolute -top-24 -right-24 w-96 h-96 rounded-full bg-primary/10 blur-3xl"
        aria-hidden
      />
      <div className="relative max-w-[1400px] mx-auto px-3 lg:px-5 py-8 lg:py-12">
        <div className="grid lg:grid-cols-2 gap-6 items-center">
          <div>
            <Badge
              variant="outline"
              className="mb-4 gap-1.5 border-primary/30 bg-primary/5 text-primary"
            >
              <span className="w-1.5 h-1.5 rounded-full bg-success animate-pulse" />
              ЛЕГАЛЬНАЯ ПЛАТФОРМА РФ • ЗАПУСК 01.07.2026
            </Badge>
            <h1 className="text-3xl lg:text-5xl font-bold tracking-tight leading-[1.05]">
              Российская криптобиржа{' '}
              <span className="text-primary whitespace-nowrap">по закону РФ</span>
            </h1>
            <p className="mt-3 text-base lg:text-lg text-muted-foreground max-w-xl">
              Спот-торги, P2P, кросс-бордер платежи и кастодия в единой
              экосистеме. Полное соответствие ФЗ-1194918-8, AML и валютному
              контролю.
            </p>
            <div className="mt-5 flex flex-wrap gap-3">
              <Button
                size="lg"
                onClick={() => setView(isAuthed ? 'trade' : 'auth')}
                className="bg-primary text-primary-foreground hover:bg-primary/90 gap-2 h-11 px-6 text-base"
              >
                {isAuthed ? 'Начать торговать' : 'Создать аккаунт'}
                <ArrowRight className="w-4 h-4" />
              </Button>
              <Button
                size="lg"
                variant="outline"
                onClick={() => setView('payments')}
                className="h-11 px-6 text-base"
              >
                Кросс-бордер платежи
              </Button>
            </div>
            <div className="mt-5 flex flex-wrap items-center gap-x-5 gap-y-2 text-xs text-muted-foreground">
              <span className="flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-success" /> Адрес-идентификаторы
              </span>
              <span className="flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-success" /> KYC через Госуслуги
              </span>
              <span className="flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-success" /> Кастодия ЦБ РФ
              </span>
            </div>
          </div>

          <Card className="p-4 lg:p-5 bg-card/60 backdrop-blur border-border">
            {loading ? (
              <StatsSkeleton />
            ) : (
              <>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <div className="text-xs text-muted-foreground">Объём 24ч</div>
                    <div className="text-xl font-bold mt-1 font-mono tabular-nums">
                      <AnimatedNumber
                        value={totalVolumeRub}
                        format={(n) =>
                          n >= 1_000_000_000
                            ? `${(n / 1_000_000_000).toFixed(2)}B ₽`
                            : n >= 1_000_000
                            ? `${(n / 1_000_000).toFixed(2)}M ₽`
                            : `${Math.round(n).toLocaleString('ru-RU')} ₽`
                        }
                      />
                    </div>
                    <div className="text-xs text-success mt-0.5 flex items-center gap-1">
                      <TrendingUp className="w-3 h-3" />
                      Реальные данные Binance
                    </div>
                  </div>
                  <div>
                    <div className="text-xs text-muted-foreground">USD/RUB</div>
                    <div className="text-xl font-bold mt-1 font-mono tabular-nums">
                      <AnimatedNumber
                        value={usdRub}
                        format={(n) => `${n.toFixed(2)} ₽`}
                      />
                    </div>
                    <div className="text-xs text-muted-foreground mt-0.5">exchangerate-api</div>
                  </div>
                  <div>
                    <div className="text-xs text-muted-foreground">Топ роста 24ч</div>
                    <div className="text-xl font-bold mt-1 flex items-center gap-2">
                      {topGainer ? (
                        <>
                          <span className="text-success">{topGainer.symbol}</span>
                          <span className="text-sm font-mono text-success">
                            {formatPercent(topGainer.change24h)}
                          </span>
                        </>
                      ) : (
                        '—'
                      )}
                    </div>
                    <div className="text-xs text-muted-foreground mt-0.5">
                      {topGainer ? topGainer.name : 'загрузка…'}
                    </div>
                  </div>
                  <div>
                    <div className="text-xs text-muted-foreground">Топ падения 24ч</div>
                    <div className="text-xl font-bold mt-1 flex items-center gap-2">
                      {topLoser ? (
                        <>
                          <span className="text-destructive">{topLoser.symbol}</span>
                          <span className="text-sm font-mono text-destructive">
                            {formatPercent(topLoser.change24h)}
                          </span>
                        </>
                      ) : (
                        '—'
                      )}
                    </div>
                    <div className="text-xs text-muted-foreground mt-0.5">
                      {topLoser ? topLoser.name : 'загрузка…'}
                    </div>
                  </div>
                </div>
                <div className="mt-4 pt-4 border-t border-border grid grid-cols-3 gap-3 text-center">
                  <div>
                    <div className="text-base font-bold text-primary">&lt;10 мс</div>
                    <div className="text-[10px] text-muted-foreground">matching latency</div>
                  </div>
                  <div>
                    <div className="text-base font-bold text-primary">99.95%</div>
                    <div className="text-[10px] text-muted-foreground">SLA</div>
                  </div>
                  <div>
                    <div className="text-base font-bold text-primary">100K TPS</div>
                    <div className="text-[10px] text-muted-foreground">пропускная</div>
                  </div>
                </div>
              </>
            )}
          </Card>
        </div>
      </div>
    </section>
  )
}

function generateSpark(change: number): number[] {
  const trend = change >= 0 ? 1 : -1
  return Array.from({ length: 16 }, (_, i) => {
    const base = 50 + i * trend * 1.5
    return base + (Math.random() - 0.5) * 6
  })
}

function MarketGrid() {
  const setView = useAppStore((s) => s.setView)
  const setSelectedPair = useAppStore((s) => s.setSelectedPair)
  const [tickers, setTickers] = useState<CoinTicker[]>([])
  const [currency, setCurrency] = useState<'rub' | 'usd'>('rub')
  const [highlight, setHighlight] = useState<Record<string, 'up' | 'down'>>({})

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

  useEffect(() => {
    if (tickers.length === 0) return
    const interval = setInterval(() => {
      setTickers((prev) =>
        prev.map((c) => {
          const oldPrice = currency === 'rub' ? c.priceRub : c.priceUsd
          const newPrice = jitterPrice(oldPrice)
          const direction = newPrice > oldPrice ? 'up' : 'down'
          setHighlight((h) => (h[c.id] !== direction ? { ...h, [c.id]: direction } : h))
          const ratio = c.priceUsd > 0 ? c.priceRub / c.priceUsd : 92.5
          return currency === 'rub'
            ? { ...c, priceRub: newPrice, priceUsd: newPrice / ratio }
            : { ...c, priceUsd: newPrice, priceRub: newPrice * ratio }
        })
      )
    }, 3500)
    return () => clearInterval(interval)
  }, [tickers.length, currency])

  const goTrade = (symbol: string) => {
    setSelectedPair(`${symbol}/RUB`)
    setView('trade')
  }

  return (
    <section className="border-b border-border py-8">
      <div className="max-w-[1400px] mx-auto px-3 lg:px-5">
        <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
          <div>
            <h2 className="text-xl lg:text-2xl font-bold">Рыночные данные</h2>
            <p className="text-xs text-muted-foreground mt-1">
              Реальные котировки Binance • обновление каждые 12 сек
            </p>
          </div>
          <div className="flex gap-1 bg-muted/60 p-1 rounded-xl">
            <button
              onClick={() => setCurrency('rub')}
              className={cn(
                'px-4 py-1.5 rounded-lg text-sm font-semibold transition',
                currency === 'rub' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground'
              )}
            >
              RUB
            </button>
            <button
              onClick={() => setCurrency('usd')}
              className={cn(
                'px-4 py-1.5 rounded-lg text-sm font-semibold transition',
                currency === 'usd' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground'
              )}
            >
              USD
            </button>
          </div>
        </div>

        {tickers.length === 0 ? (
          <MarketGridSkeleton count={8} />
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {tickers.map((coin) => {
              const status = highlight[coin.id]
              const price = currency === 'rub' ? coin.priceRub : coin.priceUsd
              const up = coin.change24h >= 0
              return (
                <Card
                  key={coin.id}
                  className={cn(
                    'p-4 cursor-pointer transition-all hover:border-primary/40 hover:-translate-y-0.5 group',
                    status === 'up' && 'ring-1 ring-success/40',
                    status === 'down' && 'ring-1 ring-destructive/40'
                  )}
                  onClick={() => goTrade(coin.symbol)}
                >
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2.5">
                      <CoinIcon symbol={coin.symbol} size={36} />
                      <div>
                        <div className="font-semibold text-sm">{coin.symbol}</div>
                        <div className="text-[11px] text-muted-foreground">{coin.name}</div>
                      </div>
                    </div>
                    <span
                      className={cn(
                        'flex items-center gap-0.5 text-xs font-medium px-2 py-0.5 rounded-md',
                        up ? 'text-success bg-success/10' : 'text-destructive bg-destructive/10'
                      )}
                    >
                      {up ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                      {formatPercent(coin.change24h)}
                    </span>
                  </div>
                  <div className="text-xl font-mono font-bold tabular-nums">
                    {formatPrice(price, currency)}
                  </div>
                  <div className="mt-2 flex items-center justify-between">
                    <Sparkline data={generateSpark(coin.change24h)} width={90} height={28} />
                    <ArrowRight className="w-4 h-4 text-muted-foreground group-hover:text-primary group-hover:translate-x-0.5 transition" />
                  </div>
                </Card>
              )
            })}
          </div>
        )}
      </div>
    </section>
  )
}

const FEATURES = [
  {
    icon: ShieldCheck,
    title: 'Полное соответствие 115-ФЗ и 1194918-8',
    desc: 'Адрес-идентификаторы, KYC, AML-мониторинг, квалификационное тестирование инвесторов.',
    color: 'text-success',
  },
  {
    icon: Zap,
    title: 'Высокопроизводительный движок',
    desc: 'Matching engine на Rust, latency < 10 мс, 100K TPS, price-time FIFO.',
    color: 'text-warning',
  },
  {
    icon: Globe2,
    title: 'Кросс-бордер платежи',
    desc: 'Коридоры RU-CN, RU-AE, RU-TR, RU-IN. Валютный контроль 173-ФЗ автоматически.',
    color: 'text-sky-400',
  },
  {
    icon: Lock,
    title: 'Кастодия и HSM',
    desc: 'Hot/Warm/Cold 5/15/80. FSTEC-сертифицированные HSM, 2-of-3 / 3-of-5 multisig.',
    color: 'text-violet-400',
  },
  {
    icon: Building2,
    title: 'Экосистема лицензий ЦБ',
    desc: 'Биржа + обменник + депозитарий + брокер в едином холдинге.',
    color: 'text-primary',
  },
  {
    icon: Scale,
    title: 'Комплаенс и аудит',
    desc: 'Event Sourcing + WORM-аудит, Merkle Root, отчётность Росфинмониторингу.',
    color: 'text-rose-400',
  },
]

function Features() {
  return (
    <section className="border-b border-border py-8 bg-sidebar/20">
      <div className="max-w-[1400px] mx-auto px-3 lg:px-5">
        <div className="text-center mb-6">
          <Badge variant="outline" className="mb-2 border-primary/30 text-primary">
            ПРЕИМУЩЕСТВА ПЛАТФОРМЫ
          </Badge>
          <h2 className="text-2xl lg:text-3xl font-bold">Почему РусКрипто</h2>
          <p className="text-muted-foreground mt-2 max-w-2xl mx-auto text-sm">
            Первая легальная криптобиржа на рынке РФ с готовой инфраструктурой
            для розничных и корпоративных клиентов.
          </p>
        </div>
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {FEATURES.map((f) => (
            <Card key={f.title} className="p-4 hover:border-primary/30 transition group">
              <div
                className={cn(
                  'w-10 h-10 rounded-xl bg-muted/60 flex items-center justify-center mb-3 group-hover:scale-110 transition',
                  f.color
                )}
              >
                <f.icon className="w-5 h-5" />
              </div>
              <h3 className="font-semibold text-base mb-1.5">{f.title}</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">{f.desc}</p>
            </Card>
          ))}
        </div>
      </div>
    </section>
  )
}

// ─── Top Movers (gainers + losers) — fills empty space after MarketGrid ──────
function MoversSection() {
  const setView = useAppStore((s) => s.setView)
  const setSelectedPair = useAppStore((s) => s.setSelectedPair)
  const [tickers, setTickers] = useState<CoinTicker[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let mounted = true
    const load = async () => {
      const t = await fetchTickers()
      if (mounted) {
        setTickers(t)
        setLoading(false)
      }
    }
    load()
    const interval = setInterval(load, 15000)
    return () => {
      mounted = false
      clearInterval(interval)
    }
  }, [])

  const { gainers, losers } = useMemo(() => {
    const sorted = [...tickers].sort((a, b) => b.change24h - a.change24h)
    return {
      gainers: sorted.slice(0, 3),
      losers: sorted.slice(-3).reverse(),
    }
  }, [tickers])

  const goTrade = (symbol: string) => {
    setSelectedPair(`${symbol}/RUB`)
    setView('trade')
  }

  const container = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: { staggerChildren: 0.08, delayChildren: 0.05 },
    },
  }
  const item = {
    hidden: { opacity: 0, y: 12 },
    show: { opacity: 1, y: 0, transition: { type: 'spring' as const, stiffness: 240, damping: 22 } },
  }

  return (
    <section className="border-b border-border py-8">
      <div className="max-w-[1400px] mx-auto px-3 lg:px-5">
        <div className="flex items-end justify-between mb-4 flex-wrap gap-3">
          <div>
            <h2 className="text-xl lg:text-2xl font-bold">Топ роста / Топ падения</h2>
            <p className="text-xs text-muted-foreground mt-1">
              Лидеры и аутсайдеры за 24 часа • обновление каждые 15 сек
            </p>
          </div>
          <Badge variant="outline" className="border-primary/30 text-primary gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-success animate-pulse" />
            LIVE • BINANCE
          </Badge>
        </div>

        {loading ? (
          <div className="grid md:grid-cols-2 gap-4">
            <Card className="p-4 h-44 animate-pulse bg-muted/30" />
            <Card className="p-4 h-44 animate-pulse bg-muted/30" />
          </div>
        ) : (
          <div className="grid md:grid-cols-2 gap-4">
            {/* Gainers */}
            <Card className="p-4 border-success/20 bg-gradient-to-br from-success/5 to-transparent">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-9 h-9 rounded-xl bg-success/15 flex items-center justify-center">
                  <TrendingUp className="w-5 h-5 text-success" />
                </div>
                <div>
                  <div className="font-semibold text-base">Топ роста 24ч</div>
                  <div className="text-[11px] text-muted-foreground">Лидеры рынка</div>
                </div>
              </div>
              <motion.div
                variants={container}
                initial="hidden"
                animate="show"
                className="flex flex-col divide-y divide-border/60"
              >
                {gainers.map((c) => (
                  <motion.button
                    key={c.id}
                    variants={item}
                    onClick={() => goTrade(c.symbol)}
                    className="flex items-center gap-3 py-3 first:pt-0 last:pb-0 text-left hover:bg-success/5 -mx-2 px-2 rounded-lg transition group"
                  >
                    <CoinIcon symbol={c.symbol} size={32} />
                    <div className="flex-1 min-w-0">
                      <div className="font-semibold text-sm">{c.symbol}</div>
                      <div className="text-[11px] text-muted-foreground truncate">{c.name}</div>
                    </div>
                    <Sparkline data={generateSpark(c.change24h)} width={72} height={24} />
                    <div className="text-right shrink-0 min-w-[90px]">
                      <div className="text-sm font-mono font-bold tabular-nums">
                        {formatPrice(c.priceRub, 'rub')}
                      </div>
                      <div className="text-[11px] font-mono text-success font-semibold tabular-nums">
                        {formatPercent(c.change24h)}
                      </div>
                    </div>
                    <ArrowRight className="w-4 h-4 text-muted-foreground group-hover:text-success group-hover:translate-x-0.5 transition shrink-0" />
                  </motion.button>
                ))}
              </motion.div>
            </Card>

            {/* Losers */}
            <Card className="p-4 border-destructive/20 bg-gradient-to-br from-destructive/5 to-transparent">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-9 h-9 rounded-xl bg-destructive/15 flex items-center justify-center">
                  <TrendingDown className="w-5 h-5 text-destructive" />
                </div>
                <div>
                  <div className="font-semibold text-base">Топ падения 24ч</div>
                  <div className="text-[11px] text-muted-foreground">Аутсайдеры рынка</div>
                </div>
              </div>
              <motion.div
                variants={container}
                initial="hidden"
                animate="show"
                className="flex flex-col divide-y divide-border/60"
              >
                {losers.map((c) => (
                  <motion.button
                    key={c.id}
                    variants={item}
                    onClick={() => goTrade(c.symbol)}
                    className="flex items-center gap-3 py-3 first:pt-0 last:pb-0 text-left hover:bg-destructive/5 -mx-2 px-2 rounded-lg transition group"
                  >
                    <CoinIcon symbol={c.symbol} size={32} />
                    <div className="flex-1 min-w-0">
                      <div className="font-semibold text-sm">{c.symbol}</div>
                      <div className="text-[11px] text-muted-foreground truncate">{c.name}</div>
                    </div>
                    <Sparkline data={generateSpark(c.change24h)} width={72} height={24} />
                    <div className="text-right shrink-0 min-w-[90px]">
                      <div className="text-sm font-mono font-bold tabular-nums">
                        {formatPrice(c.priceRub, 'rub')}
                      </div>
                      <div className="text-[11px] font-mono text-destructive font-semibold tabular-nums">
                        {formatPercent(c.change24h)}
                      </div>
                    </div>
                    <ArrowRight className="w-4 h-4 text-muted-foreground group-hover:text-destructive group-hover:translate-x-0.5 transition shrink-0" />
                  </motion.button>
                ))}
              </motion.div>
            </Card>
          </div>
        )}
      </div>
    </section>
  )
}

// ─── Asset Security (3 mini-cards) ───────────────────────────────────────────
const SECURITY_FEATURES = [
  {
    icon: Lock,
    title: 'Холодное хранение 80%',
    desc: 'Мультисиг 3-of-5, географическое распределение ключей, air-gapped подпись.',
    accent: 'text-primary',
    bg: 'bg-primary/10',
  },
  {
    icon: ShieldCheck,
    title: 'HSM FSTEC-сертифицирован',
    desc: 'Аппаратные модули Thales Luna 7, соответствие приказу ФСТЭК №21.',
    accent: 'text-success',
    bg: 'bg-success/10',
  },
  {
    icon: Landmark,
    title: 'Страхование $100M',
    desc: 'Покрытие Marsh застраховано через Lloyd’s syndicate. Защита от hot-wallet взлома.',
    accent: 'text-warning',
    bg: 'bg-warning/10',
  },
]

function AssetSecurity() {
  return (
    <section className="border-b border-border py-8 bg-sidebar/20">
      <div className="max-w-[1400px] mx-auto px-3 lg:px-5">
        <div className="text-center mb-6">
          <Badge variant="outline" className="mb-2 border-primary/30 text-primary gap-1.5">
            <ShieldCheck className="w-3 h-3" />
            БЕЗОПАСНОСТЬ АКТИВОВ
          </Badge>
          <h2 className="text-xl lg:text-2xl font-bold">Защита клиентских средств</h2>
          <p className="text-muted-foreground mt-1.5 max-w-2xl mx-auto text-sm">
            Институциональный уровень защиты: холодное хранение, сертифицированные HSM,
            страховое покрытие.
          </p>
        </div>
        <div className="grid md:grid-cols-3 gap-4">
          {SECURITY_FEATURES.map((f) => (
            <Card key={f.title} className="p-4 hover:border-primary/30 transition group">
              <div
                className={cn(
                  'w-10 h-10 rounded-xl flex items-center justify-center mb-3 group-hover:scale-110 transition',
                  f.bg,
                  f.accent
                )}
              >
                <f.icon className="w-5 h-5" />
              </div>
              <h3 className="font-semibold text-base mb-1.5">{f.title}</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">{f.desc}</p>
            </Card>
          ))}
        </div>
      </div>
    </section>
  )
}

// ─── Partners & Regulators trust band ────────────────────────────────────────
const PARTNERS = [
  { name: 'Банк России', subtitle: 'Регулятор' },
  { name: 'Росфинмониторинг', subtitle: 'Финразведка' },
  { name: 'ЦФА-Реестр', subtitle: 'Блокчейн-реестр' },
  { name: 'СБП', subtitle: 'Платёжная система' },
  { name: 'Visa', subtitle: 'Карты' },
  { name: 'Mastercard', subtitle: 'Карты' },
  { name: 'Chainalysis', subtitle: 'AML-аналитика' },
]

function PartnersBand() {
  return (
    <section className="border-b border-border py-6">
      <div className="max-w-[1400px] mx-auto px-3 lg:px-5">
        <div className="text-center mb-4">
          <h2 className="text-lg lg:text-xl font-bold">Поднадзорность и партнёры</h2>
          <p className="text-xs text-muted-foreground mt-1">
            Платформа работает в правовом поле РФ и интегрирована с ключевыми
            финансовыми и комплаенс-инфраструктурами
          </p>
        </div>
        <Card className="p-4 lg:p-5 bg-card/60 backdrop-blur">
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-7 gap-2.5">
            {PARTNERS.map((p) => (
              <div
                key={p.name}
                className="flex flex-col items-center justify-center text-center px-2.5 py-3 rounded-xl border border-border/60 bg-muted/30 hover:border-primary/40 hover:bg-primary/5 transition group"
              >
                <Building2 className="w-5 h-5 text-muted-foreground group-hover:text-primary transition mb-1.5" />
                <div className="text-xs font-semibold leading-tight">{p.name}</div>
                <div className="text-[10px] text-muted-foreground mt-0.5 leading-tight">
                  {p.subtitle}
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </section>
  )
}

function CtaBand() {
  const setView = useAppStore((s) => s.setView)
  return (
    <section className="py-8">
      <div className="max-w-[1400px] mx-auto px-3 lg:px-5">
        <Card className="relative overflow-hidden p-5 lg:p-7 bg-gradient-to-br from-primary/10 via-card to-card border-primary/20">
          <div className="absolute -bottom-16 -right-16 w-64 h-64 rounded-full bg-primary/10 blur-3xl" />
          <div className="relative flex flex-col lg:flex-row items-center justify-between gap-4">
            <div>
              <h3 className="text-xl lg:text-2xl font-bold">Готовы начать торговать?</h3>
              <p className="text-muted-foreground mt-1.5 text-sm">
                Верификация за 5 минут через Госуслуги. Демо-режим без рисков.
              </p>
            </div>
            <div className="flex gap-3 shrink-0">
              <Button
                size="lg"
                onClick={() => setView('auth')}
                className="bg-primary text-primary-foreground hover:bg-primary/90 h-11 px-6"
              >
                Создать аккаунт
              </Button>
              <Button
                size="lg"
                variant="outline"
                onClick={() => setView('kyc')}
                className="h-11 px-6"
              >
                Узнать о KYC
              </Button>
            </div>
          </div>
        </Card>
      </div>
    </section>
  )
}

export function HomeView() {
  return (
    <div>
      <Hero />
      <MarketGrid />
      <MoversSection />
      <Features />
      <AssetSecurity />
      <PartnersBand />
      <CtaBand />
    </div>
  )
}
