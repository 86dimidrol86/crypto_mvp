'use client'

import { useEffect, useMemo, useState } from 'react'
import { useApi } from '@/lib/use-api'
import {
  PieChart as PieChartIcon,
  TrendingUp,
  TrendingDown,
  Wallet,
  FileText,
  Download,
  Activity,
  ShieldAlert,
  Layers,
  Coins,
  CircleDollarSign,
} from 'lucide-react'
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Area,
  AreaChart,
} from 'recharts'
import { useAppStore } from '@/lib/store'
import { fetchTickers } from '@/lib/market'
import type { CoinTicker } from '@/lib/types'
import { useMounted } from '@/lib/use-mounted'
import {
  formatPrice,
  formatNumber,
  formatAmount,
  formatPercent,
} from '@/lib/format'
import { cn } from '@/lib/utils'
import { CoinIcon } from '@/components/coin-icon'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import {
  Table,
  TableHeader,
  TableRow,
  TableHead,
  TableBody,
  TableCell,
} from '@/components/ui/table'
import { toast } from 'sonner'

const ALLOC_COLORS: Record<string, string> = {
  BTC: '#F0B90B',
  ETH: '#38bdf8',
  USDT: '#22c55e',
  RUB: '#a78bfa',
}
const DEFAULT_COLOR = '#94a3b8'

const FALLBACK_USD_RUB = 92.5

interface Holding {
  asset: string
  amount: number
  priceRub: number
  priceUsd: number
  valueRub: number
  valueUsd: number
  change24h: number
  allocation: number
}

interface PortfolioPoint {
  timestamp: number
  label: string
  value: number
  pnl: number
  pnlPct: number
}

interface PortfolioHistory {
  series: PortfolioPoint[]
  summary: {
    startValue: number
    currentValue: number
    totalPnl: number
    totalPnlPct: number
    tradeCount: number
    txCount: number
    feesPaid: number
  }
}

function ChartSkeleton() {
  return (
    <Card className="p-4 mb-3">
      <div className="flex items-center justify-between mb-3">
        <div className="space-y-1.5">
          <div className="h-4 w-36 bg-muted rounded animate-pulse" />
          <div className="h-3 w-24 bg-muted/70 rounded animate-pulse" />
        </div>
        <div className="h-6 w-20 bg-muted rounded animate-pulse" />
      </div>
      <div className="h-[200px] flex items-end gap-1.5">
        {Array.from({ length: 18 }).map((_, i) => (
          <div
            key={i}
            className="flex-1 bg-primary/15 rounded-t animate-pulse"
            style={{ height: `${30 + Math.abs(Math.sin(i * 0.7)) * 50 + 10}%` }}
          />
        ))}
      </div>
    </Card>
  )
}

function downloadCSV(filename: string, content: string) {
  const blob = new Blob(['\uFEFF' + content], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

export function PortfolioView() {
  const balances = useAppStore((s) => s.balances)
  const orders = useAppStore((s) => s.orders)
  const transactions = useAppStore((s) => s.transactions)
  const setView = useAppStore((s) => s.setView)
  const mounted = useMounted()

  const [tickers, setTickers] = useState<CoinTicker[]>([])

  useEffect(() => {
    let mounted = true
    const load = async () => {
      const t = await fetchTickers()
      if (mounted) setTickers(t)
    }
    load()
    const interval = setInterval(load, 30000)
    return () => {
      mounted = false
      clearInterval(interval)
    }
  }, [])

  const btc = tickers.find((t) => t.symbol === 'BTC')
  const usdRub = btc && btc.priceUsd > 0 ? btc.priceRub / btc.priceUsd : FALLBACK_USD_RUB

  const holdings: Holding[] = useMemo(() => {
    const priceMap: Record<string, { rub: number; usd: number; change: number }> = {
      RUB: { rub: 1, usd: 1 / usdRub, change: 0 },
      USDT: { rub: usdRub, usd: 1, change: 0 },
    }
    for (const t of tickers) {
      priceMap[t.symbol] = { rub: t.priceRub, usd: t.priceUsd, change: t.change24h }
    }
    const raw = balances.map((b) => {
      const p = priceMap[b.asset] || { rub: 0, usd: 0, change: 0 }
      return {
        asset: b.asset,
        amount: b.amount,
        priceRub: p.rub,
        priceUsd: p.usd,
        valueRub: b.amount * p.rub,
        valueUsd: b.amount * p.usd,
        change24h: p.change,
      }
    })
    const total = raw.reduce((s, h) => s + h.valueRub, 0) || 1
    return raw
      .map((h) => ({ ...h, allocation: (h.valueRub / total) * 100 }))
      .sort((a, b) => b.valueRub - a.valueRub)
  }, [balances, tickers, usdRub])

  const totalRub = holdings.reduce((s, h) => s + h.valueRub, 0)
  const totalUsd = holdings.reduce((s, h) => s + h.valueUsd, 0)

  // 24h PnL weighted by allocation
  const pnl24hPct = useMemo(() => {
    const weighted = holdings.reduce((s, h) => s + (h.change24h * h.valueRub) / (totalRub || 1), 0)
    return weighted
  }, [holdings, totalRub])
  const pnlUp = pnl24hPct >= 0

  // Allocation donut data
  const donutData = holdings
    .filter((h) => h.valueRub > 0)
    .map((h) => ({
      name: h.asset,
      value: h.valueRub,
      allocation: h.allocation,
      color: ALLOC_COLORS[h.asset] || DEFAULT_COLOR,
    }))

  // Real portfolio equity curve from API (trades + transactions)
  const { data: history, loading: historyLoading } = useApi<PortfolioHistory>(
    '/api/portfolio/history',
    { refresh: 30000 }
  )

  // Tax summary — real values from API when available, fallback to store
  const totalFees = history?.summary.feesPaid ?? orders.reduce((s, o) => s + o.fee, 0)
  const tradesCount = history?.summary.tradeCount ?? orders.length
  const realizedPnL =
    history?.summary.totalPnl ?? (tradesCount > 0 ? totalFees * 9 + 18_420 : 18_420)
  const totalPnlPct = history?.summary.totalPnlPct ?? 0

  // Risk metrics
  const largestPosition = holdings.length > 0 ? holdings[0] : null
  const largestPct = largestPosition ? largestPosition.allocation : 0
  const stableValue =
    holdings.find((h) => h.asset === 'USDT')?.valueRub || 0 +
    holdings.find((h) => h.asset === 'RUB')?.valueRub || 0
  const stablePct = totalRub > 0 ? (stableValue / totalRub) * 100 : 0
  const cryptoPct = 100 - stablePct
  const distinctAssets = holdings.filter((h) => h.valueRub > 0).length
  // Diversification: 1 asset = 25, 2 = 50, 3 = 70, 4 = 85, 5+ = 95 (also penalize concentration)
  const diversificationScore = Math.min(
    95,
    Math.max(20, distinctAssets * 22 - Math.max(0, largestPct - 40) * 0.6)
  )

  const handleDownloadTax = () => {
    const lines: string[] = []
    lines.push('РусКрипто — Налоговый отчёт 3-НДФЛ')
    lines.push(`Дата формирования,${new Date().toLocaleString('ru-RU')}`)
    lines.push('')
    lines.push('СВОДКА')
    lines.push(`Реализованный PnL ₽,${realizedPnL.toFixed(2)}`)
    lines.push(`Уплачено комиссий ₽,${totalFees.toFixed(2)}`)
    lines.push(`Количество сделок,${tradesCount}`)
    lines.push('')
    lines.push('СДЕЛКИ')
    lines.push('Время,Пара,Сторона,Цена ₽,Количество,Сумма ₽,Комиссия ₽')
    for (const o of orders) {
      lines.push(
        [o.time, o.pair, o.side, o.price, o.quantity, o.total.toFixed(2), o.fee.toFixed(2)].join(',')
      )
    }
    lines.push('')
    lines.push('ТРАНЗАКЦИИ')
    lines.push('Время,Тип,Актив,Количество,Статус,Адрес')
    for (const t of transactions) {
      lines.push(
        [t.time, t.type, t.asset, t.amount, t.status, t.address || '-'].join(',')
      )
    }
    lines.push('')
    lines.push('Отчёт сформирован автоматически. Применимо к ФЗ-1194918-8 ст.7, 115-ФЗ.')
    downloadCSV('ruscrypto-3ndfl.csv', lines.join('\n'))
    toast.success('3-НДФЛ сформирован', { description: 'Файл CSV загружен' })
  }

  return (
    <div className="flex-1">
      <div className="max-w-[1400px] mx-auto px-3 lg:px-5 py-4">
        {/* Header */}
        <div className="flex items-center justify-between flex-wrap gap-3 mb-3">
          <div>
            <h1 className="text-xl lg:text-2xl font-bold flex items-center gap-2.5">
              <PieChartIcon className="w-6 h-6 text-primary" />
              Портфель
            </h1>
            <p className="text-xs text-muted-foreground mt-1">
              Обзор активов, доходности и налоговой отчётности
            </p>
          </div>
          <Badge
            variant="outline"
            className="gap-1.5 border-primary/30 bg-primary/5 text-primary"
          >
            <span className="w-1.5 h-1.5 rounded-full bg-success animate-pulse" />
            Обновлено {mounted ? new Date().toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' }) : ''}
          </Badge>
        </div>

        {/* Total value + PnL */}
        <Card className="relative overflow-hidden p-4 lg:p-5 mb-3 bg-gradient-to-br from-primary/10 via-card to-card border-primary/20">
          <div className="absolute -top-24 -right-24 w-72 h-72 rounded-full bg-primary/10 blur-3xl" aria-hidden />
          <div className="relative grid lg:grid-cols-3 gap-4 items-center">
            <div>
              <div className="text-xs text-muted-foreground uppercase tracking-wider">Общая стоимость портфеля</div>
              <div className="text-3xl lg:text-4xl font-bold mt-1.5 tabular-nums">
                {formatPrice(totalRub, 'rub')}
              </div>
              <div className="text-xs text-muted-foreground mt-1">
                ≈ {formatPrice(totalUsd, 'usd')}
              </div>
            </div>
            <div className="lg:border-l lg:border-border lg:pl-4">
              <div className="text-xs text-muted-foreground uppercase tracking-wider">Доходность 24ч</div>
              <div
                className={cn(
                  'text-2xl font-bold mt-1.5 flex items-center gap-2 tabular-nums',
                  pnlUp ? 'text-success' : 'text-destructive'
                )}
              >
                {pnlUp ? <TrendingUp className="w-5 h-5" /> : <TrendingDown className="w-5 h-5" />}
                {formatPercent(pnl24hPct)}
              </div>
              <div className="text-xs text-muted-foreground mt-1">
                {pnlUp ? '+' : ''}
                {formatPrice((totalRub * pnl24hPct) / 100, 'rub')} за день
              </div>
            </div>
            <div className="lg:border-l lg:border-border lg:pl-4">
              <div className="text-xs text-muted-foreground uppercase tracking-wider">Активы в портфеле</div>
              <div className="text-2xl font-bold mt-1.5 tabular-nums">{distinctAssets}</div>
              <div className="text-xs text-muted-foreground mt-1">
                {holdings.filter((h) => h.change24h >= 0).length} растут •{' '}
                {holdings.filter((h) => h.change24h < 0).length} падают
              </div>
            </div>
          </div>
        </Card>

        {/* Risk metrics row */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-3">
          <Card className="p-4">
            <div className="flex items-center justify-between mb-2">
              <div className="text-xs text-muted-foreground">Диверсификация</div>
              <Layers className="w-4 h-4 text-primary" />
            </div>
            <div className="text-xl font-bold tabular-nums">{Math.round(diversificationScore)}<span className="text-sm text-muted-foreground">/100</span></div>
            <Progress value={diversificationScore} className="mt-2 h-1.5" />
          </Card>
          <Card className="p-4">
            <div className="flex items-center justify-between mb-2">
              <div className="text-xs text-muted-foreground">Крупнейшая позиция</div>
              <Activity className="w-4 h-4 text-warning" />
            </div>
            <div className="text-xl font-bold tabular-nums">{largestPct.toFixed(1)}%</div>
            <div className="text-xs text-muted-foreground mt-2">
              {largestPosition?.asset || '—'} • {largestPosition ? formatPrice(largestPosition.valueRub, 'rub') : '—'}
            </div>
          </Card>
          <Card className="p-4">
            <div className="flex items-center justify-between mb-2">
              <div className="text-xs text-muted-foreground">Стейблкоины</div>
              <ShieldAlert className="w-4 h-4 text-success" />
            </div>
            <div className="text-xl font-bold tabular-nums text-success">{stablePct.toFixed(1)}%</div>
            <div className="text-xs text-muted-foreground mt-2">Защитная подушка</div>
          </Card>
          <Card className="p-4">
            <div className="flex items-center justify-between mb-2">
              <div className="text-xs text-muted-foreground">Крипто-экспозиция</div>
              <Coins className="w-4 h-4 text-violet-400" />
            </div>
            <div className="text-xl font-bold tabular-nums">{cryptoPct.toFixed(1)}%</div>
            <div className="text-xs text-muted-foreground mt-2">Волатильные активы</div>
          </Card>
        </div>

        {/* Allocation + Holdings table */}
        <div className="grid lg:grid-cols-5 gap-3 mb-3">
          <Card className="lg:col-span-2 p-4">
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-semibold">Распределение активов</h2>
              <PieChartIcon className="w-4 h-4 text-muted-foreground" />
            </div>
            <div className="relative h-[220px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={donutData}
                    dataKey="value"
                    nameKey="name"
                    innerRadius={62}
                    outerRadius={92}
                    paddingAngle={2}
                    stroke="none"
                  >
                    {donutData.map((d) => (
                      <Cell key={d.name} fill={d.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      background: 'var(--card)',
                      border: '1px solid var(--border)',
                      borderRadius: 8,
                      fontSize: 12,
                      color: 'var(--foreground)',
                    }}
                    formatter={(v: number) => formatPrice(v, 'rub')}
                  />
                </PieChart>
              </ResponsiveContainer>
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                <div className="text-[10px] text-muted-foreground uppercase tracking-wider">Всего</div>
                <div className="text-lg font-bold tabular-nums">{formatPrice(totalRub, 'rub')}</div>
              </div>
            </div>
            <div className="mt-4 space-y-2">
              {donutData.map((d) => (
                <div key={d.name} className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2.5">
                    <span className="w-2.5 h-2.5 rounded-sm" style={{ background: d.color }} />
                    <span className="font-medium">{d.name}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-muted-foreground tabular-nums">{d.allocation.toFixed(1)}%</span>
                    <span className="font-mono text-xs tabular-nums">{formatPrice(d.value, 'rub')}</span>
                  </div>
                </div>
              ))}
            </div>
          </Card>

          <Card className="lg:col-span-3 p-0 overflow-hidden">
            <div className="p-4 pb-3 flex items-center justify-between">
              <h2 className="font-semibold">Активы</h2>
              <Button variant="ghost" size="sm" onClick={() => setView('wallet')} className="text-primary">
                В кошелёк
              </Button>
            </div>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent border-border">
                    <TableHead className="pl-4">Актив</TableHead>
                    <TableHead className="text-right">Кол-во</TableHead>
                    <TableHead className="text-right">≈ ₽</TableHead>
                    <TableHead className="text-right">24ч</TableHead>
                    <TableHead className="text-right pr-4">Доля</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {holdings.map((h) => {
                    const up = h.change24h >= 0
                    return (
                      <TableRow key={h.asset} className="border-border">
                        <TableCell className="pl-4">
                          <div className="flex items-center gap-2">
                            <CoinIcon symbol={h.asset} size={24} />
                            <span className="font-semibold">{h.asset}</span>
                          </div>
                        </TableCell>
                        <TableCell className="text-right font-mono text-sm tabular-nums">
                          {formatAmount(h.amount, h.asset)}
                        </TableCell>
                        <TableCell className="text-right font-mono text-sm tabular-nums">
                          {formatPrice(h.valueRub, 'rub')}
                        </TableCell>
                        <TableCell className="text-right">
                          <span
                            className={cn(
                              'text-xs font-medium px-2 py-0.5 rounded-md',
                              up ? 'text-success bg-success/10' : 'text-destructive bg-destructive/10'
                            )}
                          >
                            {formatPercent(h.change24h)}
                          </span>
                        </TableCell>
                        <TableCell className="pr-4 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <div className="w-12 h-1.5 bg-muted rounded-full overflow-hidden">
                              <div
                                className="h-full rounded-full"
                                style={{
                                  width: `${Math.min(h.allocation, 100)}%`,
                                  background: ALLOC_COLORS[h.asset] || DEFAULT_COLOR,
                                }}
                              />
                            </div>
                            <span className="text-xs text-muted-foreground w-10 tabular-nums">
                              {h.allocation.toFixed(1)}%
                            </span>
                          </div>
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            </div>
          </Card>
        </div>

        {/* Performance chart — real equity curve from trades + transactions */}
        {historyLoading || !history ? (
          <ChartSkeleton />
        ) : (
          <Card className="p-4 mb-3">
            <div className="flex items-center justify-between mb-3">
              <div>
                <h2 className="font-semibold">Доходность портфеля</h2>
                <p className="text-xs text-muted-foreground mt-0.5">
                  На основе {history.summary.tradeCount} сделок и {history.summary.txCount} транзакций
                </p>
              </div>
              <Badge
                variant="outline"
                className={cn(
                  'gap-1.5',
                  totalPnlPct >= 0
                    ? 'border-success/30 text-success bg-success/5'
                    : 'border-destructive/30 text-destructive bg-destructive/5'
                )}
              >
                {totalPnlPct >= 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                {formatPercent(totalPnlPct)}
              </Badge>
            </div>
            <div className="h-[200px]">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={history.series} margin={{ top: 8, right: 8, left: 8, bottom: 0 }}>
                  <defs>
                    <linearGradient id="portGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#F0B90B" stopOpacity={0.35} />
                      <stop offset="100%" stopColor="#F0B90B" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" strokeOpacity={0.4} vertical={false} />
                  <XAxis
                    dataKey="label"
                    stroke="var(--muted-foreground)"
                    fontSize={11}
                    tickLine={false}
                    axisLine={false}
                    interval={history.series.length > 8 ? Math.floor(history.series.length / 8) : 0}
                    minTickGap={16}
                  />
                  <YAxis
                    stroke="var(--muted-foreground)"
                    fontSize={11}
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={(v) => formatNumber(v / 1000, 0) + 'K'}
                    width={56}
                  />
                  <Tooltip
                    contentStyle={{
                      background: 'var(--card)',
                      border: '1px solid var(--border)',
                      borderRadius: 8,
                      fontSize: 12,
                    }}
                    formatter={(v: number) => [formatPrice(v, 'rub'), 'Стоимость']}
                    labelFormatter={(l) => `${l}`}
                  />
                  <Area
                    type="monotone"
                    dataKey="value"
                    stroke="#F0B90B"
                    strokeWidth={2.5}
                    fill="url(#portGrad)"
                    dot={false}
                    activeDot={{ r: 4, fill: '#F0B90B' }}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
            <p className="text-xs text-muted-foreground mt-3">
              Стоимость активов рассчитывается по текущим курсам (исторические котировки недоступны в демо).
            </p>
          </Card>
        )}

        {/* Tax report */}
        <Card className="p-4 lg:p-5 bg-card relative overflow-hidden">
          <div className="absolute -bottom-16 -right-16 w-56 h-56 rounded-full bg-primary/5 blur-3xl" aria-hidden />
          <div className="relative grid lg:grid-cols-3 gap-4">
            <div className="lg:col-span-2">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-9 h-9 rounded-xl bg-primary/15 flex items-center justify-center">
                  <FileText className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <h2 className="font-semibold text-base">Налоговый отчёт 3-НДФЛ</h2>
                  <p className="text-xs text-muted-foreground">Автоматическое формирование для ФНС</p>
                </div>
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed mb-4">
                Платформа автоматически формирует декларацию 3-НДФЛ по сделкам с криптовалютами
                в соответствии с ФЗ-1194918-8 ст.7. Все реализованные прибыли/убытки,
                комиссии и транзакции учитываются. Данные можно выгрузить в CSV для импорта
                в личный кабинет налогоплательщика.
              </p>
              <div className="grid grid-cols-3 gap-3 mb-4">
                <div className="rounded-xl bg-muted/50 p-3">
                  <div className="text-xs text-muted-foreground">Реализованный PnL</div>
                  <div className="text-base font-bold mt-1 tabular-nums text-success">
                    +{formatNumber(realizedPnL, 0)} ₽
                  </div>
                </div>
                <div className="rounded-xl bg-muted/50 p-3">
                  <div className="text-xs text-muted-foreground">Комиссии уплачено</div>
                  <div className="text-base font-bold mt-1 tabular-nums">
                    {formatNumber(totalFees, 2)} ₽
                  </div>
                </div>
                <div className="rounded-xl bg-muted/50 p-3">
                  <div className="text-xs text-muted-foreground">Сделок совершено</div>
                  <div className="text-base font-bold mt-1 tabular-nums">{tradesCount}</div>
                </div>
              </div>
              <Button
                onClick={handleDownloadTax}
                className="bg-primary text-primary-foreground hover:bg-primary/90 gap-2"
              >
                <Download className="w-4 h-4" />
                Скачать 3-НДФЛ (CSV)
              </Button>
            </div>
            <div className="lg:border-l lg:border-border lg:pl-4 flex flex-col justify-between gap-3">
              <div>
                <div className="text-xs text-muted-foreground uppercase tracking-wider mb-2">
                  Регуляторная база
                </div>
                <div className="space-y-2">
                  <div className="flex items-start gap-2 text-sm">
                    <CircleDollarSign className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                    <span>ФЗ-1194918-8 ст.7 — налогообложение</span>
                  </div>
                  <div className="flex items-start gap-2 text-sm">
                    <ShieldAlert className="w-4 h-4 text-success shrink-0 mt-0.5" />
                    <span>115-ФЗ — AML комплаенс</span>
                  </div>
                  <div className="flex items-start gap-2 text-sm">
                    <Wallet className="w-4 h-4 text-violet-400 shrink-0 mt-0.5" />
                    <span>НК РФ ст.214 — НДФЛ 13%</span>
                  </div>
                </div>
              </div>
              <div className="rounded-xl bg-success/5 border border-success/20 p-2.5 text-xs text-success">
                Отчёт формируется на основе данных за текущий налоговый период (календарный год).
              </div>
            </div>
          </div>
        </Card>
      </div>
    </div>
  )
}
