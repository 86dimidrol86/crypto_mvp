'use client'

import { useState } from 'react'
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
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { formatNumber, formatPrice, formatPercent } from '@/lib/format'

type Period = '1h' | '24h' | '7d' | '30d'

const PERIODS: { id: Period; label: string }[] = [
  { id: '1h', label: '1ч' },
  { id: '24h', label: '24ч' },
  { id: '7d', label: '7д' },
  { id: '30d', label: '30д' },
]

const STATS: Record<Period, { volume: number; users: number; positions: number; pnl: number; volumeDelta: number; usersDelta: number; positionsDelta: number; pnlDelta: number }> = {
  '1h': { volume: 12_400_000, users: 4_240, positions: 8_420, pnl: 0.42, volumeDelta: 3.4, usersDelta: 1.8, positionsDelta: 0.9, pnlDelta: 0.12 },
  '24h': { volume: 184_200_000, users: 38_450, positions: 24_680, pnl: 2.18, volumeDelta: 12.4, usersDelta: 8.7, positionsDelta: 4.2, pnlDelta: 0.84 },
  '7d': { volume: 1_240_000_000, users: 142_840, positions: 42_840, pnl: 5.74, volumeDelta: 28.4, usersDelta: 14.2, positionsDelta: 11.8, pnlDelta: 1.92 },
  '30d': { volume: 5_640_000_000, users: 480_280, positions: 68_240, pnl: 12.86, volumeDelta: 64.2, usersDelta: 32.1, positionsDelta: 24.8, pnlDelta: 4.18 },
}

const PAIR_DIST = [
  { name: 'BTC', value: 40, color: '#F0B90B' },
  { name: 'ETH', value: 25, color: '#38bdf8' },
  { name: 'SOL', value: 15, color: '#a78bfa' },
  { name: 'USDT', value: 12, color: '#22c55e' },
  { name: 'Другие', value: 8, color: '#94a3b8' },
]

const CORRIDORS = [
  { corridor: 'RU → CN', volume: 84_200_000, change: 18.4 },
  { corridor: 'RU → AE', volume: 62_400_000, change: 12.8 },
  { corridor: 'RU → TR', volume: 48_600_000, change: 8.2 },
  { corridor: 'RU → IN', volume: 32_100_000, change: -2.4 },
  { corridor: 'RU → KZ', volume: 18_400_000, change: 4.6 },
  { corridor: 'RU → UZ', volume: 9_800_000, change: 22.1 },
]

function generateVolumeBars(period: Period): { label: string; volume: number }[] {
  const baseVolume = STATS[period].volume / 12
  const labelsByPeriod: Record<Period, string[]> = {
    '1h': ['08:00', '08:05', '08:10', '08:15', '08:20', '08:25', '08:30', '08:35', '08:40', '08:45', '08:50', '08:55'],
    '24h': ['00', '02', '04', '06', '08', '10', '12', '14', '16', '18', '20', '22'],
    '7d': ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс', 'Пн', 'Вт', 'Ср', 'Чт', 'Пт'],
    '30d': ['1', '3', '5', '7', '9', '11', '13', '15', '17', '19', '21', '23'],
  }
  return labelsByPeriod[period].map((label, i) => ({
    label,
    volume: Math.round(baseVolume * (0.7 + Math.sin(i * 0.7) * 0.25 + Math.random() * 0.2)),
  }))
}

function generateUsersLine(period: Period): { label: string; users: number }[] {
  const baseUsers = STATS[period].users / 12
  const labelsByPeriod: Record<Period, string[]> = {
    '1h': ['08:00', '08:05', '08:10', '08:15', '08:20', '08:25', '08:30', '08:35', '08:40', '08:45', '08:50', '08:55'],
    '24h': ['00', '02', '04', '06', '08', '10', '12', '14', '16', '18', '20', '22'],
    '7d': ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс', 'Пн', 'Вт', 'Ср', 'Чт', 'Пт'],
    '30d': ['1', '3', '5', '7', '9', '11', '13', '15', '17', '19', '21', '23'],
  }
  return labelsByPeriod[period].map((label, i) => ({
    label,
    users: Math.round(baseUsers * (0.5 + (i / 12) * 0.6 + Math.sin(i * 0.5) * 0.15 + Math.random() * 0.1)),
  }))
}

const tooltipStyle = {
  background: 'hsl(var(--card))',
  border: '1px solid hsl(var(--border))',
  borderRadius: 8,
  fontSize: 12,
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
  const up = delta >= 0
  return (
    <Card className="p-5">
      <div className="flex items-center justify-between mb-3">
        <div className="text-xs text-muted-foreground">{title}</div>
        <div className={cn('w-8 h-8 rounded-lg flex items-center justify-center', color)}>
          <Icon className="w-4 h-4" />
        </div>
      </div>
      <div className="text-2xl font-bold tabular-nums">{value}</div>
      <div className="flex items-center gap-1 mt-2 text-xs">
        <span
          className={cn(
            'flex items-center gap-0.5 font-medium px-1.5 py-0.5 rounded-md',
            up ? 'text-success bg-success/10' : 'text-destructive bg-destructive/10'
          )}
        >
          {up ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
          {formatPercent(delta)}
        </span>
        <span className="text-muted-foreground">{positive ? 'за период' : ''}</span>
      </div>
    </Card>
  )
}

export function AnalyticsView() {
  const [period, setPeriod] = useState<Period>('24h')
  const stats = STATS[period]
  const volumeData = generateVolumeBars(period)
  const usersData = generateUsersLine(period)

  return (
    <div className="flex-1">
      <div className="max-w-[1400px] mx-auto px-4 lg:px-8 py-8">
        {/* Header */}
        <div className="flex items-center justify-between flex-wrap gap-4 mb-6">
          <div>
            <h1 className="text-2xl lg:text-3xl font-bold flex items-center gap-2.5">
              <BarChart3 className="w-7 h-7 text-primary" />
              Аналитика
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              Метрики платформы в реальном времени
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
                {p.label}
              </button>
            ))}
          </div>
        </div>

        {/* Stats row */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <StatCard
            title="Объём торгов"
            value={formatPrice(stats.volume, 'rub')}
            delta={stats.volumeDelta}
            icon={CircleDollarSign}
            color="bg-primary/15 text-primary"
          />
          <StatCard
            title="Активные пользователи"
            value={formatNumber(stats.users, 0)}
            delta={stats.usersDelta}
            icon={Users}
            color="bg-sky-500/15 text-sky-400"
          />
          <StatCard
            title="Открытые позиции"
            value={formatNumber(stats.positions, 0)}
            delta={stats.positionsDelta}
            icon={Activity}
            color="bg-violet-400/15 text-violet-400"
          />
          <StatCard
            title="Средний PnL"
            value={formatPercent(stats.pnl)}
            delta={stats.pnlDelta}
            icon={TrendingUp}
            color="bg-success/15 text-success"
          />
        </div>

        {/* BTC price chart + Top pairs */}
        <div className="grid lg:grid-cols-3 gap-6 mb-6">
          <Card className="lg:col-span-2 p-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="font-semibold">BTC/RUB — живой график</h2>
                <p className="text-xs text-muted-foreground mt-0.5">TradingView • BTCUSDT</p>
              </div>
              <Badge variant="outline" className="gap-1.5 border-primary/30 text-primary">
                <span className="w-1.5 h-1.5 rounded-full bg-success animate-pulse" />
                LIVE
              </Badge>
            </div>
            <div className="rounded-xl overflow-hidden border border-border h-[320px] bg-background">
              <iframe
                title="BTC chart"
                src="https://s3.tradingview.com/external-embedding/embed-chart.html?symbol=BINANCE%3ABTCUSDT&theme=dark&interval=60&hide_top_toolbar=false&hide_side_toolbar=true&hide_legend=false&save_image=false"
                className="w-full h-full"
                loading="lazy"
              />
            </div>
          </Card>

          <Card className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="font-semibold">Торговые пары</h2>
                <p className="text-xs text-muted-foreground mt-0.5">Распределение объёма</p>
              </div>
              <Layers className="w-4 h-4 text-muted-foreground" />
            </div>
            <div className="h-[180px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={PAIR_DIST}
                    dataKey="value"
                    nameKey="name"
                    innerRadius={48}
                    outerRadius={76}
                    paddingAngle={2}
                    stroke="none"
                  >
                    {PAIR_DIST.map((d) => (
                      <Cell key={d.name} fill={d.color} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={tooltipStyle} formatter={(v: number) => `${v}%`} />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="mt-4 space-y-2">
              {PAIR_DIST.map((p) => (
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
        <div className="grid lg:grid-cols-2 gap-6 mb-6">
          <Card className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="font-semibold">Объём торгов</h2>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Период: {PERIODS.find((p) => p.id === period)?.label}
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
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" strokeOpacity={0.4} vertical={false} />
                  <XAxis
                    dataKey="label"
                    stroke="hsl(var(--muted-foreground))"
                    fontSize={11}
                    tickLine={false}
                    axisLine={false}
                    interval={1}
                  />
                  <YAxis
                    stroke="hsl(var(--muted-foreground))"
                    fontSize={11}
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={(v) => formatNumber(v / 1_000_000, 1) + 'M'}
                    width={48}
                  />
                  <Tooltip
                    contentStyle={tooltipStyle}
                    formatter={(v: number) => [formatPrice(v, 'rub'), 'Объём']}
                  />
                  <Bar dataKey="volume" fill="#F0B90B" radius={[4, 4, 0, 0]} maxBarSize={28} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Card>

          <Card className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="font-semibold">Активные пользователи</h2>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Период: {PERIODS.find((p) => p.id === period)?.label}
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
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" strokeOpacity={0.4} vertical={false} />
                  <XAxis
                    dataKey="label"
                    stroke="hsl(var(--muted-foreground))"
                    fontSize={11}
                    tickLine={false}
                    axisLine={false}
                    interval={1}
                  />
                  <YAxis
                    stroke="hsl(var(--muted-foreground))"
                    fontSize={11}
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={(v) => formatNumber(v / 1000, 0) + 'K'}
                    width={48}
                  />
                  <Tooltip
                    contentStyle={tooltipStyle}
                    formatter={(v: number) => [formatNumber(v, 0), 'Пользователей']}
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
        <Card className="p-6 mb-6">
          <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
            <div>
              <h2 className="font-semibold flex items-center gap-2">
                <Globe2 className="w-4 h-4 text-primary" />
                Топ коридоров кросс-бордер
              </h2>
              <p className="text-xs text-muted-foreground mt-0.5">Объём за последние 24 часа</p>
            </div>
            <Button variant="outline" size="sm" className="text-primary border-primary/30">
              Все коридоры
            </Button>
          </div>
          <div className="h-[280px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={CORRIDORS}
                layout="vertical"
                margin={{ top: 8, right: 16, left: 8, bottom: 0 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" strokeOpacity={0.4} horizontal={false} />
                <XAxis
                  type="number"
                  stroke="hsl(var(--muted-foreground))"
                  fontSize={11}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(v) => formatNumber(v / 1_000_000, 0) + 'M'}
                />
                <YAxis
                  type="category"
                  dataKey="corridor"
                  stroke="hsl(var(--muted-foreground))"
                  fontSize={12}
                  tickLine={false}
                  axisLine={false}
                  width={80}
                />
                <Tooltip
                  contentStyle={tooltipStyle}
                  formatter={(v: number) => [formatPrice(v, 'rub'), 'Объём']}
                />
                <Bar dataKey="volume" radius={[0, 4, 4, 0]} maxBarSize={26}>
                  {CORRIDORS.map((c) => (
                    <Cell key={c.corridor} fill={c.change >= 0 ? '#F0B90B' : '#ef4444'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-4 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            {CORRIDORS.map((c) => (
              <div key={c.corridor} className="rounded-xl bg-muted/40 p-3">
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
        <Card className="p-5 bg-card/60 border-border">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-muted-foreground">
            <div className="flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-success animate-pulse" />
              Данные обновляются каждые 5 секунд
            </div>
            <div>Источник: внутренний matching engine • Binance API для котировок</div>
          </div>
        </Card>
      </div>
    </div>
  )
}
