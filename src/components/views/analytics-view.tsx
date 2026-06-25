'use client'

import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  BarChart3,
  Users,
  CircleDollarSign,
  TrendingUp,
  Activity,
  Layers,
  ArrowUpRight,
  ArrowDownRight,
  Globe2,
  Database,
} from 'lucide-react'
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  ResponsiveContainer,
} from 'recharts'
import { cn } from '@/lib/utils'
import { useI18n } from '@/lib/use-i18n'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { formatNumber, formatPrice, formatPercent } from '@/lib/format'
import { KpiCardSkeleton, ChartSkeleton } from '@/components/page-skeleton'

type Period = '1h' | '24h' | '7d' | '30d'

const PERIODS: { id: Period; labelKey: string }[] = [
  { id: '1h', labelKey: 'analytics.period.1h' },
  { id: '24h', labelKey: 'analytics.period.24h' },
  { id: '7d', labelKey: 'analytics.period.7d' },
  { id: '30d', labelKey: 'analytics.period.30d' },
]

interface AnalyticsData {
  periods: Record<Period, { volume: number; users: number; positions: number; pnl: number; volumeDelta: number; usersDelta: number; positionsDelta: number; pnlDelta: number }>
  pairDistribution: { name: string; value: number; color: string; volume: number }[]
  corridors: { corridor: string; volume: number; count: number; change: number }[]
  volumeSeries: { label: string; volume: number }[]
  usersSeries: { label: string; users: number }[]
  summary: { totalVolume: number; volume24h: number; totalFees: number; totalTrades: number; totalUsers: number; totalPayments: number; openAlerts: number; p2pDeals: number }
  market: { usdRub: number; topGainer: any; topLoser: any }
}

const tooltipStyle = {
  background: 'var(--card)',
  border: '1px solid var(--border)',
  borderRadius: 8,
  fontSize: 12,
  color: 'var(--foreground)',
}

interface StatCardProps {
  title: string
  value: string
  delta: number
  icon: React.ComponentType<{ className?: string }>
  color: string
  positive?: boolean
}

function StatCard({ title, value, delta, icon: Icon, color, positive = true }: StatCardProps) {
  const { t } = useI18n()
  const up = delta >= 0
  return (
    <Card className="p-4">
      <div className="flex items-center justify-between mb-2">
        <div className="text-xs text-muted-foreground">{title}</div>
        <div className={cn('w-8 h-8 rounded-lg flex items-center justify-center', color)}>
          <Icon className="w-4 h-4" />
        </div>
      </div>
      <div className="text-xl font-bold tabular-nums overflow-hidden">
        <AnimatePresence mode="wait" initial={false}>
          <motion.span
            key={value}
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.22, ease: 'easeOut' }}
            className="inline-block"
          >
            {value}
          </motion.span>
        </AnimatePresence>
      </div>
      <div className="flex items-center gap-1 mt-1.5 text-xs">
        <span
          className={cn(
            'flex items-center gap-0.5 font-medium px-1.5 py-0.5 rounded-md',
            up ? 'text-success bg-success/10' : 'text-destructive bg-destructive/10'
          )}
        >
          {up ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
          {formatPercent(delta)}
        </span>
        <span className="text-muted-foreground">{positive ? t('analytics.positiveForPeriod') : ''}</span>
      </div>
    </Card>
  )
}

export function AnalyticsView() {
  const { t } = useI18n()
  const [period, setPeriod] = useState<Period>('24h')
  const [data, setData] = useState<AnalyticsData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let mounted = true
    const load = async () => {
      try {
        const res = await fetch('/api/analytics')
        if (res.ok) {
          const json = await res.json()
          if (mounted) {
            setData(json)
            setLoading(false)
          }
        }
      } catch {
        if (mounted) setLoading(false)
      }
    }
    load()
    const interval = setInterval(load, 15000)
    return () => {
      mounted = false
      clearInterval(interval)
    }
  }, [])

  const stats = data?.periods[period] || {
    volume: 0, users: 0, positions: 0, pnl: 0,
    volumeDelta: 0, usersDelta: 0, positionsDelta: 0, pnlDelta: 0,
  }
  const pairDist = data?.pairDistribution ?? []
  const corridors = data?.corridors ?? []
  const volumeData = data?.volumeSeries ?? []
  const usersData = data?.usersSeries ?? []

  return (
    <div className="flex-1">
      <div className="max-w-[1400px] mx-auto px-3 lg:px-5 py-4">
        {/* Header */}
        <div className="flex items-center justify-between flex-wrap gap-3 mb-3">
          <div>
            <h1 className="text-xl lg:text-2xl font-bold flex items-center gap-2.5">
              <BarChart3 className="w-6 h-6 text-primary" />
              {t('analytics.title')}
            </h1>
            <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1.5">
              <Database className="w-3.5 h-3.5 text-success" />
              {t('analytics.subtitle')} {data && <span className="text-success">{t('analytics.subtitleUpdated')} {new Date().toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}</span>}
            </p>
          </div>
          <div className="flex gap-1 bg-muted/60 p-1 rounded-xl">
            {PERIODS.map((p) => (
              <button
                key={p.id}
                onClick={() => setPeriod(p.id)}
                className={cn(
                  'px-4 py-1.5 rounded-lg text-sm font-semibold transition',
                  period === p.id
                    ? 'bg-primary text-primary-foreground'
                    : 'text-muted-foreground hover:text-foreground'
                )}
              >
                {t(p.labelKey)}
              </button>
            ))}
          </div>
        </div>

        {/* First-paint skeleton: API still loading, no data yet */}
        {loading && !data ? (
          <>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-3">
              {Array.from({ length: 4 }).map((_, i) => (
                <KpiCardSkeleton key={i} />
              ))}
            </div>
            <div className="grid lg:grid-cols-2 gap-3 mb-3">
              <ChartSkeleton />
              <ChartSkeleton />
            </div>
          </>
        ) : (
          <>
            {/* Real data summary banner */}
            {data && (
              <Card className="p-2.5 mb-3 bg-success/5 border-success/20">
                <div className="flex flex-wrap items-center gap-x-6 gap-y-1.5 text-xs">
                  <span className="text-muted-foreground">{t('analytics.sourceData')} <span className="text-success font-medium">{t('analytics.sourceValue')}</span></span>
                  <span className="text-muted-foreground">{t('analytics.tradesInDb')} <span className="font-mono text-foreground">{data.summary.totalTrades}</span></span>
                  <span className="text-muted-foreground">{t('analytics.usersWord')} <span className="font-mono text-foreground">{data.summary.totalUsers}</span></span>
                  <span className="text-muted-foreground">{t('analytics.paymentsWord')} <span className="font-mono text-foreground">{data.summary.totalPayments}</span></span>
                  <span className="text-muted-foreground">{t('analytics.p2pWord')} <span className="font-mono text-foreground">{data.summary.p2pDeals}</span></span>
                  <span className="text-muted-foreground">{t('analytics.feesCollected')} <span className="font-mono text-primary">{formatPrice(data.summary.totalFees, 'rub')}</span></span>
                </div>
              </Card>
            )}

            {/* Stats row */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-3">
              <StatCard
                title={t('analytics.kpi.volume')}
                value={formatPrice(stats.volume, 'rub')}
                delta={stats.volumeDelta}
                icon={CircleDollarSign}
                color="bg-primary/15 text-primary"
              />
              <StatCard
                title={t('analytics.kpi.users')}
                value={formatNumber(stats.users, 0)}
                delta={stats.usersDelta}
                icon={Users}
                color="bg-sky-500/15 text-sky-400"
              />
              <StatCard
                title={t('analytics.kpi.positions')}
                value={formatNumber(stats.positions, 0)}
                delta={stats.positionsDelta}
                icon={Activity}
                color="bg-violet-400/15 text-violet-400"
              />
              <StatCard
                title={t('analytics.kpi.pnl')}
                value={formatPercent(stats.pnl)}
                delta={stats.pnlDelta}
                icon={TrendingUp}
                color="bg-success/15 text-success"
              />
            </div>

            {/* BTC price chart + Top pairs */}
            <div className="grid lg:grid-cols-3 gap-3 mb-3">
              <Card className="lg:col-span-2 p-4">
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <h2 className="font-semibold">BTCUSDT</h2>
                    <p className="text-xs text-muted-foreground mt-0.5">TradingView • Binance</p>
                  </div>
                  <Badge variant="outline" className="gap-1.5 border-primary/30 text-primary">
                    <span className="w-1.5 h-1.5 rounded-full bg-success animate-pulse" />
                    LIVE
                  </Badge>
                </div>
                <div className="rounded-xl overflow-hidden border border-border h-[320px] bg-background">
                  <iframe
                    title="BTCUSDT chart"
                    src="https://www.tradingview.com/widgetembed/?frameElementId=tv&symbol=BINANCE%3ABTCUSDT&interval=60&theme=dark&hide_side_toolbar=false&hide_top_toolbar=false&allow_symbol_change=false&hideideas=true&hide_volume=false"
                    className="w-full h-full border-0"
                    allowFullScreen
                  />
                </div>
              </Card>

              <Card className="p-4">
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <h2 className="font-semibold">{t('analytics.pairs.title')}</h2>
                    <p className="text-xs text-muted-foreground mt-0.5">{t('analytics.pairs.subtitle')}</p>
                  </div>
                  <Layers className="w-4 h-4 text-muted-foreground" />
                </div>
                <div className="h-[180px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={pairDist}
                        dataKey="value"
                        nameKey="name"
                        innerRadius={48}
                        outerRadius={76}
                        paddingAngle={2}
                        stroke="none"
                      >
                        {pairDist.map((d) => (
                          <Cell key={d.name} fill={d.color} />
                        ))}
                      </Pie>
                      <Tooltip contentStyle={tooltipStyle} formatter={(v: number) => `${v}%`} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="mt-3 space-y-1.5">
                  {pairDist.map((p) => (
                    <div key={p.name} className="flex items-center justify-between text-sm">
                      <div className="flex items-center gap-2">
                        <span className="w-2.5 h-2.5 rounded-sm" style={{ background: p.color }} />
                        <span className="font-medium">{p.name}</span>
                      </div>
                      <span className="font-mono text-xs tabular-nums">{p.value}%</span>
                    </div>
                  ))}
                </div>
              </Card>
            </div>

            {/* Volume + Users charts */}
            <div className="grid lg:grid-cols-2 gap-3 mb-3">
              <Card className="p-4">
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <h2 className="font-semibold">{t('analytics.volume.title')}</h2>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {t('analytics.periodWord')} {t(PERIODS.find((p) => p.id === period)?.labelKey || '')}
                    </p>
                  </div>
                  <Badge variant="outline" className="gap-1.5 border-primary/30 text-primary">
                    <CircleDollarSign className="w-3 h-3" />
                    {formatPrice(stats.volume, 'rub')}
                  </Badge>
                </div>
                <div className="h-[240px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={volumeData} margin={{ top: 8, right: 8, left: 8, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" strokeOpacity={0.4} vertical={false} />
                      <XAxis
                        dataKey="label"
                        stroke="var(--muted-foreground)"
                        fontSize={11}
                        tickLine={false}
                        axisLine={false}
                        interval={1}
                      />
                      <YAxis
                        stroke="var(--muted-foreground)"
                        fontSize={11}
                        tickLine={false}
                        axisLine={false}
                        tickFormatter={(v) => formatNumber(v / 1_000_000, 1) + 'M'}
                        width={48}
                      />
                      <Tooltip
                        contentStyle={tooltipStyle}
                        formatter={(v: number) => [formatPrice(v, 'rub'), t('analytics.volumeWord')]}
                      />
                      <Bar dataKey="volume" fill="#F0B90B" radius={[4, 4, 0, 0]} maxBarSize={28} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </Card>

              <Card className="p-4">
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <h2 className="font-semibold">{t('analytics.users.title')}</h2>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {t('analytics.periodWord')} {t(PERIODS.find((p) => p.id === period)?.labelKey || '')}
                    </p>
                  </div>
                  <Badge variant="outline" className="gap-1.5 border-sky-400/30 text-sky-400">
                    <Users className="w-3 h-3" />
                    {formatNumber(stats.users, 0)}
                  </Badge>
                </div>
                <div className="h-[240px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={usersData} margin={{ top: 8, right: 8, left: 8, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" strokeOpacity={0.4} vertical={false} />
                      <XAxis
                        dataKey="label"
                        stroke="var(--muted-foreground)"
                        fontSize={11}
                        tickLine={false}
                        axisLine={false}
                        interval={1}
                      />
                      <YAxis
                        stroke="var(--muted-foreground)"
                        fontSize={11}
                        tickLine={false}
                        axisLine={false}
                        tickFormatter={(v) => formatNumber(v / 1000, 0) + 'K'}
                        width={48}
                      />
                      <Tooltip
                        contentStyle={tooltipStyle}
                        formatter={(v: number) => [formatNumber(v, 0), t('analytics.usersWord2')]}
                      />
                      <Line
                        type="monotone"
                        dataKey="users"
                        stroke="#38bdf8"
                        strokeWidth={2.5}
                        dot={false}
                        activeDot={{ r: 4, fill: '#38bdf8' }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </Card>
            </div>

            {/* Corridors chart */}
            <Card className="p-4 mb-3">
              <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
                <div>
                  <h2 className="font-semibold flex items-center gap-2">
                    <Globe2 className="w-4 h-4 text-primary" />
                    {t('analytics.corridors.title')}
                  </h2>
                  <p className="text-xs text-muted-foreground mt-0.5">{t('analytics.corridors.subtitle')}</p>
                </div>
                <Button variant="outline" size="sm" className="text-primary border-primary/30">
                  {t('analytics.corridors.all')}
                </Button>
              </div>
              <div className="h-[280px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={corridors}
                    layout="vertical"
                    margin={{ top: 8, right: 16, left: 8, bottom: 0 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" strokeOpacity={0.4} horizontal={false} />
                    <XAxis
                      type="number"
                      stroke="var(--muted-foreground)"
                      fontSize={11}
                      tickLine={false}
                      axisLine={false}
                      tickFormatter={(v) => formatNumber(v / 1_000_000, 0) + 'M'}
                    />
                    <YAxis
                      type="category"
                      dataKey="corridor"
                      stroke="var(--muted-foreground)"
                      fontSize={12}
                      tickLine={false}
                      axisLine={false}
                      width={80}
                    />
                    <Tooltip
                      contentStyle={tooltipStyle}
                      formatter={(v: number) => [formatPrice(v, 'rub'), t('analytics.volumeWord')]}
                    />
                    <Bar dataKey="volume" radius={[0, 4, 4, 0]} maxBarSize={26}>
                      {corridors.map((c) => (
                        <Cell key={c.corridor} fill={c.change >= 0 ? '#F0B90B' : '#ef4444'} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
              <div className="mt-3 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
                {corridors.map((c) => (
                  <div key={c.corridor} className="rounded-xl bg-muted/40 p-2.5">
                    <div className="text-xs text-muted-foreground">{c.corridor}</div>
                    <div className="font-bold text-sm mt-1 tabular-nums">
                      {formatNumber(c.volume / 1_000_000, 1)}M ₽
                    </div>
                    <div
                      className={cn(
                        'text-xs mt-0.5 flex items-center gap-0.5',
                        c.change >= 0 ? 'text-success' : 'text-destructive'
                      )}
                    >
                      {c.change >= 0 ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
                      {formatPercent(c.change)}
                    </div>
                  </div>
                ))}
              </div>
            </Card>

            {/* Footer info */}
            <Card className="p-3.5 bg-card/60 border-border">
              <div className="flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-muted-foreground">
                <div className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-success animate-pulse" />
                  {t('analytics.footer.refresh')}
                </div>
                <div>{t('analytics.footer.source')}</div>
              </div>
            </Card>
          </>
        )}
      </div>
    </div>
  )
}
