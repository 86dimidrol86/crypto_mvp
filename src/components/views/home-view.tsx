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
      <div className="relative max-w-[1400px] mx-auto px-4 lg:px-8 py-16 lg:py-24">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          <div>
            <Badge
              variant="outline"
              className="mb-6 gap-1.5 border-primary/30 bg-primary/5 text-primary"
            >
              <span className="w-1.5 h-1.5 rounded-full bg-success animate-pulse" />
              ЛЕГАЛЬНАЯ ПЛАТФОРМА РФ • ЗАПУСК 01.07.2026
            </Badge>
            <h1 className="text-4xl lg:text-6xl font-bold tracking-tight leading-[1.05]">
              Российская криптобиржа
              <br />
              <span className="text-primary">по закону РФ</span>
            </h1>
            <p className="mt-6 text-lg text-muted-foreground max-w-xl">
              Спот-торги, P2P, кросс-бордер платежи и кастодия в единой
              экосистеме. Полное соответствие ФЗ-1194918-8, AML и валютному
              контролю.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Button
                size="lg"
                onClick={() => setView(isAuthed ? 'trade' : 'auth')}
                className="bg-primary text-primary-foreground hover:bg-primary/90 gap-2 h-12 px-7 text-base"
              >
                {isAuthed ? 'Начать торговать' : 'Создать аккаунт'}
                <ArrowRight className="w-4 h-4" />
              </Button>
              <Button
                size="lg"
                variant="outline"
                onClick={() => setView('payments')}
                className="h-12 px-7 text-base"
              >
                Кросс-бордер платежи
              </Button>
            </div>
            <div className="mt-8 flex flex-wrap items-center gap-x-6 gap-y-2 text-xs text-muted-foreground">
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

          <Card className="p-6 lg:p-8 bg-card/60 backdrop-blur border-border">
            {loading ? (
              <StatsSkeleton />
            ) : (
              <>
                <div className="grid grid-cols-2 gap-5">
                  <div>
                    <div className="text-xs text-muted-foreground">Объём 24ч</div>
                    <div className="text-2xl font-bold mt-1 font-mono tabular-nums">
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
                    <div className="text-2xl font-bold mt-1 font-mono tabular-nums">
                      <AnimatedNumber
                        value={usdRub}
                        format={(n) => `${n.toFixed(2)} ₽`}
                      />
                    </div>
                    <div className="text-xs text-muted-foreground mt-0.5">exchangerate-api</div>
                  </div>
                  <div>
                    <div className="text-xs text-muted-foreground">Топ роста 24ч</div>
                    <div className="text-2xl font-bold mt-1 flex items-center gap-2">
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
                    <div className="text-2xl font-bold mt-1 flex items-center gap-2">
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
                <div className="mt-6 pt-6 border-t border-border grid grid-cols-3 gap-4 text-center">
                  <div>
                    <div className="text-lg font-bold text-primary">&lt;10 мс</div>
                    <div className="text-[10px] text-muted-foreground">matching latency</div>
                  </div>
                  <div>
                    <div className="text-lg font-bold text-primary">99.95%</div>
                    <div className="text-[10px] text-muted-foreground">SLA</div>
                  </div>
                  <div>
                    <div className="text-lg font-bold text-primary">100K TPS</div>
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
    <section className="border-b border-border py-14">
      <div className="max-w-[1400px] mx-auto px-4 lg:px-8">
        <div className="flex items-center justify-between mb-8 flex-wrap gap-4">
          <div>
            <h2 className="text-2xl lg:text-3xl font-bold">Рыночные данные</h2>
            <p className="text-sm text-muted-foreground mt-1">
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
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {tickers.map((coin) => {
              const status = highlight[coin.id]
              const price = currency === 'rub' ? coin.priceRub : coin.priceUsd
              const up = coin.change24h >= 0
              return (
                <Card
                  key={coin.id}
                  className={cn(
                    'p-5 cursor-pointer transition-all hover:border-primary/40 hover:-translate-y-0.5 group',
                    status === 'up' && 'ring-1 ring-success/40',
                    status === 'down' && 'ring-1 ring-destructive/40'
                  )}
                  onClick={() => goTrade(coin.symbol)}
                >
                  <div className="flex items-center justify-between mb-4">
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
                  <div className="text-2xl font-mono font-bold tabular-nums">
                    {formatPrice(price, currency)}
                  </div>
                  <div className="mt-3 flex items-center justify-between">
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
    <section className="border-b border-border py-16 bg-sidebar/20">
      <div className="max-w-[1400px] mx-auto px-4 lg:px-8">
        <div className="text-center mb-12">
          <Badge variant="outline" className="mb-3 border-primary/30 text-primary">
            ПРЕИМУЩЕСТВА ПЛАТФОРМЫ
          </Badge>
          <h2 className="text-3xl lg:text-4xl font-bold">Почему РусКрипто</h2>
          <p className="text-muted-foreground mt-3 max-w-2xl mx-auto">
            Первая легальная криптобиржа на рынке РФ с готовой инфраструктурой
            для розничных и корпоративных клиентов.
          </p>
        </div>
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
          {FEATURES.map((f) => (
            <Card key={f.title} className="p-6 hover:border-primary/30 transition group">
              <div
                className={cn(
                  'w-12 h-12 rounded-2xl bg-muted/60 flex items-center justify-center mb-4 group-hover:scale-110 transition',
                  f.color
                )}
              >
                <f.icon className="w-6 h-6" />
              </div>
              <h3 className="font-semibold text-lg mb-2">{f.title}</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">{f.desc}</p>
            </Card>
          ))}
        </div>
      </div>
    </section>
  )
}

function CtaBand() {
  const setView = useAppStore((s) => s.setView)
  return (
    <section className="py-16">
      <div className="max-w-[1400px] mx-auto px-4 lg:px-8">
        <Card className="relative overflow-hidden p-8 lg:p-12 bg-gradient-to-br from-primary/10 via-card to-card border-primary/20">
          <div className="absolute -bottom-16 -right-16 w-64 h-64 rounded-full bg-primary/10 blur-3xl" />
          <div className="relative flex flex-col lg:flex-row items-center justify-between gap-6">
            <div>
              <h3 className="text-2xl lg:text-3xl font-bold">Готовы начать торговать?</h3>
              <p className="text-muted-foreground mt-2">
                Верификация за 5 минут через Госуслуги. Демо-режим без рисков.
              </p>
            </div>
            <div className="flex gap-3 shrink-0">
              <Button
                size="lg"
                onClick={() => setView('auth')}
                className="bg-primary text-primary-foreground hover:bg-primary/90 h-12 px-7"
              >
                Создать аккаунт
              </Button>
              <Button
                size="lg"
                variant="outline"
                onClick={() => setView('kyc')}
                className="h-12 px-7"
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
      <Features />
      <CtaBand />
    </div>
  )
}
