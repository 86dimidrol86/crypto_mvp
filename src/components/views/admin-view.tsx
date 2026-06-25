'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import {
  BarChart3,
  Users,
  CircleDollarSign,
  Activity,
  AlertTriangle,
  ShieldAlert,
  ArrowUpRight,
  ArrowDownRight,
  RefreshCw,
  Database,
  Lock,
  Scale,
  Clock,
  Send,
} from 'lucide-react'
import {
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from 'recharts'
import { toast } from 'sonner'
import { useApi } from '@/lib/use-api'
import { useI18n } from '@/lib/use-i18n'
import { useMounted } from '@/lib/use-mounted'
import { useAppStore } from '@/lib/store'
import { formatNumber, formatPrice, timeAgo } from '@/lib/format'
import { cn } from '@/lib/utils'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import { KpiCardSkeleton, TableSkeleton } from '@/components/page-skeleton'

// ─── Types (returned by /api/admin/stats) ────────────────────────────────────
interface AdminRecentUser {
  id: string
  email: string
  name: string | null
  kycLevel: number
  role: string
  createdAt: string
}

interface AdminRecentTrade {
  id: string
  pair: string
  side: string
  type: string
  price: number
  quantity: number
  total: number
  fee: number
  userEmail: string | null
  userName: string | null
  createdAt: string
}

interface AdminRecentPayment {
  id: string
  corridor: string
  fromCurrency: string
  toCurrency: string
  amount: number
  receiveAmount: number
  status: string
  beneficiary: string
  createdAt: string
}

interface AdminRecentAlert {
  id: string
  type: string
  severity: string
  riskScore: number
  status: string
  description: string
  entityType: string
  ruleId: string | null
  createdAt: string
}

interface AdminStats {
  totalUsers: number
  newUsers24h: number
  totalTrades: number
  trades24hCount: number
  volume24h: number
  totalPayments: number
  paymentsVolume: number
  openAlerts: number
  criticalAlerts: number
  openP2PDeals: number
  openMarginPositions: number
  recentUsers: AdminRecentUser[]
  recentTrades: AdminRecentTrade[]
  recentPayments: AdminRecentPayment[]
  recentAlerts: AdminRecentAlert[]
  usersByKycLevel: { level0: number; level1: number; level2: number }
  tradesByPair: { pair: string; count: number; volume: number }[]
  generatedAt: string
}

// ─── Display constants ───────────────────────────────────────────────────────
const tooltipStyle = {
  background: 'var(--card)',
  border: '1px solid var(--border)',
  borderRadius: 8,
  fontSize: 12,
  color: 'var(--foreground)',
}

const PAYMENT_STATUS_LABEL_KEY: Record<string, string> = {
  INITIATED: 'admin.status.INITIATED',
  CC_PENDING: 'admin.status.CC_PENDING',
  LIQUIDITY: 'admin.status.LIQUIDITY',
  CONVERTING: 'admin.status.CONVERTING',
  SENDING: 'admin.status.SENDING',
  SETTLED: 'admin.status.SETTLED',
  FAILED: 'admin.status.FAILED',
}

const PAYMENT_STATUS_COLOR: Record<string, string> = {
  INITIATED: 'border-primary/40 text-primary bg-primary/10',
  CC_PENDING: 'border-warning/40 text-warning bg-warning/10',
  LIQUIDITY: 'border-sky-400/40 text-sky-400 bg-sky-400/10',
  CONVERTING: 'border-sky-400/40 text-sky-400 bg-sky-400/10',
  SENDING: 'border-violet-400/40 text-violet-400 bg-violet-400/10',
  SETTLED: 'border-success/40 text-success bg-success/10',
  FAILED: 'border-destructive/40 text-destructive bg-destructive/10',
}

const ALERT_STATUS_LABEL_KEY: Record<string, string> = {
  OPEN: 'admin.status.OPEN',
  REVIEWING: 'admin.status.REVIEWING',
  APPROVED: 'admin.status.APPROVED',
  REJECTED: 'admin.status.REJECTED',
  ESCALATED: 'admin.status.ESCALATED',
  SAR: 'admin.status.SAR',
}

const ALERT_STATUS_COLOR: Record<string, string> = {
  OPEN: 'border-primary/40 text-primary bg-primary/10',
  REVIEWING: 'border-warning/40 text-warning bg-warning/10',
  APPROVED: 'border-success/40 text-success bg-success/10',
  REJECTED: 'border-destructive/40 text-destructive bg-destructive/10',
  ESCALATED: 'border-orange-500/40 text-orange-400 bg-orange-500/10',
  SAR: 'border-violet-500/40 text-violet-400 bg-violet-500/10',
}

const SEVERITY_CONFIG: Record<
  string,
  { color: string; stripe: string; bg: string; labelKey: string }
> = {
  CRITICAL: {
    color: 'text-destructive',
    stripe: 'bg-destructive',
    bg: 'bg-destructive/10',
    labelKey: 'admin.severity.critical',
  },
  HIGH: {
    color: 'text-orange-400',
    stripe: 'bg-orange-500',
    bg: 'bg-orange-500/10',
    labelKey: 'admin.severity.high',
  },
  MEDIUM: {
    color: 'text-warning',
    stripe: 'bg-warning',
    bg: 'bg-warning/10',
    labelKey: 'admin.severity.medium',
  },
  LOW: {
    color: 'text-sky-400',
    stripe: 'bg-sky-500',
    bg: 'bg-sky-500/10',
    labelKey: 'admin.severity.low',
  },
}

const TYPE_LABEL_KEY: Record<string, string> = {
  STRUCTURING: 'admin.type.STRUCTURING',
  VELOCITY: 'admin.type.VELOCITY',
  SANCTION: 'admin.type.SANCTION',
  THRESHOLD: 'admin.type.THRESHOLD',
  PATTERN: 'admin.type.PATTERN',
  MIXING: 'admin.type.MIXING',
  PEP: 'admin.type.PEP',
}

const KYC_DONUT_COLORS = ['#64748b', '#F0B90B', '#22c55e']

const CORRIDOR_FLAG: Record<string, string> = {
  'RU-CN': '🇨🇳',
  'RU-AE': '🇦🇪',
  'RU-TR': '🇹🇷',
  'RU-IN': '🇮🇳',
  'RU-KZ': '🇰🇿',
  'RU-AM': '🇦🇲',
}

// ─── KPI Stat Card ───────────────────────────────────────────────────────────
interface StatCardProps {
  title: string
  value: string
  sub?: string
  icon: React.ComponentType<{ className?: string }>
  iconTone: string
  delta?: number
  deltaSuffix?: string
  tone?: 'default' | 'danger' | 'warning' | 'success'
  index?: number
}

function StatCard({
  title,
  value,
  sub,
  icon: Icon,
  iconTone,
  delta,
  deltaSuffix,
  tone = 'default',
  index = 0,
}: StatCardProps) {
  const { t } = useI18n()
  const effectiveDeltaSuffix = deltaSuffix ?? t('admin.deltaSuffix')
  const toneText =
    tone === 'danger'
      ? 'text-destructive'
      : tone === 'warning'
        ? 'text-warning'
        : tone === 'success'
          ? 'text-success'
          : 'text-primary'
  const showDelta = typeof delta === 'number'
  const up = (delta ?? 0) >= 0
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.32, delay: index * 0.06, ease: 'easeOut' }}
    >
      <Card className="bg-card/60 backdrop-blur p-4 h-full">
        <div className="flex items-start justify-between mb-3">
          <span className="text-[11px] text-muted-foreground uppercase tracking-wider">
            {title}
          </span>
          <div
            className={cn(
              'w-8 h-8 rounded-lg flex items-center justify-center bg-muted/40',
              iconTone
            )}
          >
            <Icon className="w-4 h-4" />
          </div>
        </div>
        <div className={cn('text-2xl font-bold tabular-nums font-mono', toneText)}>
          {value}
        </div>
        <div className="flex items-center gap-1.5 mt-2 text-[11px]">
          {showDelta && (
            <span
              className={cn(
                'inline-flex items-center gap-0.5 font-medium px-1.5 py-0.5 rounded-md',
                up
                  ? 'text-success bg-success/10'
                  : 'text-destructive bg-destructive/10'
              )}
            >
              {up ? (
                <ArrowUpRight className="w-3 h-3" />
              ) : (
                <ArrowDownRight className="w-3 h-3" />
              )}
              {up ? '+' : ''}
              {delta}
            </span>
          )}
          {sub && <span className="text-muted-foreground">{sub}</span>}
          {showDelta && !sub && (
            <span className="text-muted-foreground">{effectiveDeltaSuffix}</span>
          )}
        </div>
      </Card>
    </motion.div>
  )
}

// ─── Recent Trades Table ─────────────────────────────────────────────────────
function RecentTradesTable({ trades }: { trades: AdminRecentTrade[] }) {
  const { t } = useI18n()
  const mounted = useMounted()
  return (
    <Card className="bg-card/60 backdrop-blur flex flex-col h-full">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <Activity className="w-4 h-4 text-primary" />
            {t('admin.trades.title')}
          </CardTitle>
          <Badge variant="outline" className="text-[10px]">
            {trades.length}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <ScrollArea className="max-h-96">
          <div className="px-4 pb-3">
            {/* Header row */}
            <div className="grid grid-cols-[1fr_0.5fr_1fr_1fr_1.4fr_0.8fr] gap-2 text-[10px] uppercase tracking-wider text-muted-foreground py-2 border-b border-border sticky top-0 bg-card/95 backdrop-blur z-10">
              <span>{t('admin.trades.col.pair')}</span>
              <span className="text-center">{t('admin.trades.col.side')}</span>
              <span className="text-right">{t('admin.trades.col.price')}</span>
              <span className="text-right">{t('admin.trades.col.qty')}</span>
              <span className="text-right">{t('admin.trades.col.sum')}</span>
              <span className="text-right">{t('admin.trades.col.time')}</span>
            </div>
            {trades.length === 0 ? (
              <div className="py-10 text-center text-sm text-muted-foreground">
                {t('admin.trades.empty')}
              </div>
            ) : (
              trades.map((t, i) => {
                const isBuy = t.side === 'buy'
                return (
                  <motion.div
                    key={t.id}
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.22, delay: Math.min(i * 0.03, 0.4), ease: 'easeOut' }}
                    className="grid grid-cols-[1fr_0.5fr_1fr_1fr_1.4fr_0.8fr] gap-2 items-center py-2 border-b border-border/40 hover:bg-muted/30 transition text-xs"
                  >
                    <span className="font-medium truncate">{t.pair}</span>
                    <span className="flex justify-center">
                      <Badge
                        variant="outline"
                        className={cn(
                          'text-[9px] px-1.5',
                          isBuy
                            ? 'border-success/40 text-success bg-success/10'
                            : 'border-destructive/40 text-destructive bg-destructive/10'
                        )}
                      >
                        {isBuy ? 'BUY' : 'SELL'}
                      </Badge>
                    </span>
                    <span className="text-right font-mono tabular-nums">
                      {formatPrice(t.price, 'rub')}
                    </span>
                    <span className="text-right font-mono tabular-nums text-muted-foreground">
                      {formatNumber(t.quantity, 4)}
                    </span>
                    <span className="text-right font-mono tabular-nums text-primary">
                      {formatPrice(t.total, 'rub')}
                    </span>
                    <span className="text-right text-[10px] text-muted-foreground">
                      {mounted ? timeAgo(t.createdAt) : ''}
                    </span>
                  </motion.div>
                )
              })
            )}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  )
}

// ─── KYC Donut + Top Pairs Bar ───────────────────────────────────────────────
function KycAndPairsCard({
  usersByKycLevel,
  tradesByPair,
}: {
  usersByKycLevel: { level0: number; level1: number; level2: number }
  tradesByPair: { pair: string; count: number; volume: number }[]
}) {
  const { t } = useI18n()
  const kycData = [
    { name: 'Lv.0', value: usersByKycLevel.level0, color: KYC_DONUT_COLORS[0], labelKey: 'admin.kyc.lv0' },
    { name: 'Lv.1', value: usersByKycLevel.level1, color: KYC_DONUT_COLORS[1], labelKey: 'admin.kyc.lv1' },
    { name: 'Lv.2', value: usersByKycLevel.level2, color: KYC_DONUT_COLORS[2], labelKey: 'admin.kyc.lv2' },
  ]
  const kycTotal =
    usersByKycLevel.level0 + usersByKycLevel.level1 + usersByKycLevel.level2

  const maxPairVolume = tradesByPair.length
    ? Math.max(...tradesByPair.map((p) => p.volume))
    : 1

  return (
    <Card className="bg-card/60 backdrop-blur h-full">
      <CardHeader className="pb-2">
        <CardTitle className="text-base flex items-center gap-2">
          <Users className="w-4 h-4 text-primary" />
          {t('admin.kyc.title')}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Donut */}
        <div className="flex items-center gap-4">
          <div className="w-[120px] h-[120px] shrink-0 relative">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={kycData}
                  dataKey="value"
                  nameKey="name"
                  innerRadius={36}
                  outerRadius={58}
                  paddingAngle={2}
                  stroke="none"
                >
                  {kycData.map((d) => (
                    <Cell key={d.name} fill={d.color} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={tooltipStyle}
                  formatter={(v: number, n: string) => [formatNumber(v, 0), n]}
                />
              </PieChart>
            </ResponsiveContainer>
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
              <div className="text-lg font-bold font-mono tabular-nums">
                {formatNumber(kycTotal, 0)}
              </div>
              <div className="text-[9px] text-muted-foreground uppercase">
                {t('admin.kyc.total')}
              </div>
            </div>
          </div>
          <div className="flex-1 space-y-1.5">
            {kycData.map((d, i) => (
              <div
                key={d.name}
                className="flex items-center justify-between text-xs"
              >
                <div className="flex items-center gap-2">
                  <span
                    className="w-2.5 h-2.5 rounded-sm"
                    style={{ background: d.color }}
                  />
                  <span className="font-medium">
                    {t(d.labelKey)}
                  </span>
                </div>
                <span className="font-mono tabular-nums text-muted-foreground">
                  {formatNumber(d.value, 0)}
                  {kycTotal > 0 && (
                    <span className="text-[10px] ml-1">
                      ({Math.round((d.value / kycTotal) * 100)}%)
                    </span>
                  )}
                </span>
              </div>
            ))}
          </div>
        </div>

        <Separator />

        {/* Top pairs bar */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] text-muted-foreground uppercase tracking-wider">
              {t('admin.pairs.title')}
            </span>
            <BarChart3 className="w-3.5 h-3.5 text-muted-foreground" />
          </div>
          {tradesByPair.length === 0 ? (
            <div className="py-6 text-center text-xs text-muted-foreground">
              {t('admin.pairs.empty')}
            </div>
          ) : (
            <div className="h-[160px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={tradesByPair}
                  layout="vertical"
                  margin={{ top: 4, right: 12, left: 0, bottom: 0 }}
                >
                  <CartesianGrid
                    strokeDasharray="3 3"
                    stroke="var(--border)"
                    strokeOpacity={0.4}
                    horizontal={false}
                  />
                  <XAxis
                    type="number"
                    stroke="var(--muted-foreground)"
                    fontSize={10}
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={(v) =>
                      v >= 1_000_000
                        ? `${(v / 1_000_000).toFixed(1)}M`
                        : v >= 1000
                          ? `${Math.round(v / 1000)}K`
                          : `${v}`
                    }
                  />
                  <YAxis
                    type="category"
                    dataKey="pair"
                    stroke="var(--muted-foreground)"
                    fontSize={11}
                    tickLine={false}
                    axisLine={false}
                    width={70}
                  />
                  <Tooltip
                    contentStyle={tooltipStyle}
                    formatter={(v: number) => [formatPrice(v, 'rub'), t('admin.pairs.volume')]}
                  />
                  <Bar dataKey="volume" radius={[0, 4, 4, 0]} maxBarSize={20}>
                    {tradesByPair.map((p) => (
                      <Cell
                        key={p.pair}
                        fill={
                          p.volume >= maxPairVolume * 0.66
                            ? '#F0B90B'
                            : p.volume >= maxPairVolume * 0.33
                              ? '#d4a017'
                              : '#8a7126'
                        }
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}

// ─── Recent Users List ───────────────────────────────────────────────────────
function RecentUsersList({ users }: { users: AdminRecentUser[] }) {
  const { t } = useI18n()
  const mounted = useMounted()
  return (
    <Card className="bg-card/60 backdrop-blur h-full flex flex-col">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <Users className="w-4 h-4 text-primary" />
            {t('admin.users.title')}
          </CardTitle>
          <Badge variant="outline" className="text-[10px]">
            {users.length}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="p-0 flex-1 min-h-0">
        <ScrollArea className="max-h-80">
          <div className="px-4 pb-3 space-y-1.5">
            {users.length === 0 ? (
              <div className="py-8 text-center text-sm text-muted-foreground">
                {t('admin.users.empty')}
              </div>
            ) : (
              users.map((u) => (
                <div
                  key={u.id}
                  className="flex items-center gap-3 py-2 px-2 rounded-lg hover:bg-muted/30 transition border border-transparent hover:border-border/40"
                >
                  <div
                    className={cn(
                      'w-9 h-9 rounded-full flex items-center justify-center shrink-0 text-xs font-bold',
                      u.role === 'ADMIN'
                        ? 'bg-destructive/15 text-destructive'
                        : u.role === 'COMPLIANCE'
                          ? 'bg-primary/15 text-primary'
                          : 'bg-muted/60 text-foreground/70'
                    )}
                  >
                    {(u.name || u.email).slice(0, 1).toUpperCase()}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-medium truncate">
                      {u.name || u.email}
                    </div>
                    <div className="text-[10px] text-muted-foreground truncate font-mono">
                      {u.email}
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-1 shrink-0">
                    <Badge
                      variant="outline"
                      className={cn(
                        'text-[9px] px-1.5',
                        u.kycLevel === 2
                          ? 'border-success/40 text-success bg-success/10'
                          : u.kycLevel === 1
                            ? 'border-primary/40 text-primary bg-primary/10'
                            : 'border-muted-foreground/40 text-muted-foreground bg-muted/30'
                      )}
                    >
                      KYC Lv.{u.kycLevel}
                    </Badge>
                    <span className="text-[9px] text-muted-foreground">
                      {mounted ? timeAgo(u.createdAt) : ''}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  )
}

// ─── Recent Payments List ────────────────────────────────────────────────────
function RecentPaymentsList({ payments }: { payments: AdminRecentPayment[] }) {
  const { t } = useI18n()
  const mounted = useMounted()
  return (
    <Card className="bg-card/60 backdrop-blur h-full flex flex-col">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <Send className="w-4 h-4 text-primary" />
            {t('admin.payments.title')}
          </CardTitle>
          <Badge variant="outline" className="text-[10px]">
            {payments.length}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="p-0 flex-1 min-h-0">
        <ScrollArea className="max-h-80">
          <div className="px-4 pb-3 space-y-1.5">
            {payments.length === 0 ? (
              <div className="py-8 text-center text-sm text-muted-foreground">
                {t('admin.payments.empty')}
              </div>
            ) : (
              payments.map((p) => {
                const flag = CORRIDOR_FLAG[p.corridor] || '🌐'
                return (
                  <div
                    key={p.id}
                    className="flex items-center gap-3 py-2 px-2 rounded-lg hover:bg-muted/30 transition border border-transparent hover:border-border/40"
                  >
                    <div className="w-9 h-9 rounded-lg bg-muted/40 flex items-center justify-center shrink-0 text-base">
                      {flag}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="text-sm font-medium truncate">
                        {p.corridor} •{' '}
                        <span className="font-mono tabular-nums text-primary">
                          {formatPrice(p.amount, 'rub')}
                        </span>
                      </div>
                      <div className="text-[10px] text-muted-foreground truncate">
                        {p.beneficiary}
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-1 shrink-0">
                      <Badge
                        variant="outline"
                        className={cn(
                          'text-[9px] px-1.5',
                          PAYMENT_STATUS_COLOR[p.status] ||
                            'border-border text-muted-foreground'
                        )}
                      >
                        {PAYMENT_STATUS_LABEL_KEY[p.status] ? t(PAYMENT_STATUS_LABEL_KEY[p.status]) : p.status}
                      </Badge>
                      <span className="text-[9px] text-muted-foreground">
                        {mounted ? timeAgo(p.createdAt) : ''}
                      </span>
                    </div>
                  </div>
                )
              })
            )}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  )
}

// ─── Incidents / Alerts Table ────────────────────────────────────────────────
function AlertsTable({ alerts }: { alerts: AdminRecentAlert[] }) {
  const { t } = useI18n()
  const mounted = useMounted()
  const setView = useAppStore((s) => s.setView)

  const handleClick = () => {
    setView('compliance')
    toast.success(t('admin.alerts.toCompliance'), {
      description: t('admin.alerts.toComplianceDesc'),
    })
  }

  return (
    <Card className="bg-card/60 backdrop-blur">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <ShieldAlert className="w-4 h-4 text-destructive" />
            {t('admin.alerts.title')}
          </CardTitle>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="text-[10px]">
              {alerts.length}
            </Badge>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleClick}
              className="h-7 text-[11px] gap-1 text-primary hover:text-primary hover:bg-primary/10"
            >
              <Scale className="w-3 h-3" />
              {t('admin.alerts.openAml')}
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        {alerts.length === 0 ? (
          <div className="py-10 flex flex-col items-center justify-center text-center">
            <div className="w-12 h-12 rounded-xl bg-success/10 flex items-center justify-center mb-3">
              <ShieldAlert className="w-5 h-5 text-success" />
            </div>
            <div className="text-sm font-medium">{t('admin.alerts.empty')}</div>
            <div className="text-xs text-muted-foreground mt-1">
              {t('admin.alerts.emptyHint')}
            </div>
          </div>
        ) : (
          <ScrollArea className="max-h-96">
            <div className="px-4 pb-3">
              <div className="grid grid-cols-[0.3fr_1.2fr_0.7fr_0.9fr_2fr_0.7fr] gap-2 text-[10px] uppercase tracking-wider text-muted-foreground py-2 border-b border-border sticky top-0 bg-card/95 backdrop-blur z-10">
                <span>Sev</span>
                <span>{t('admin.alerts.col.type')}</span>
                <span className="text-right">Risk</span>
                <span>{t('admin.alerts.col.status')}</span>
                <span>{t('admin.alerts.col.desc')}</span>
                <span className="text-right">{t('admin.alerts.col.time')}</span>
              </div>
              {alerts.map((a, i) => {
                const sev = SEVERITY_CONFIG[a.severity] || SEVERITY_CONFIG.MEDIUM
                return (
                  <motion.button
                    key={a.id}
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.22, delay: Math.min(i * 0.03, 0.4), ease: 'easeOut' }}
                    onClick={handleClick}
                    className="w-full text-left grid grid-cols-[0.3fr_1.2fr_0.7fr_0.9fr_2fr_0.7fr] gap-2 items-center py-2 border-b border-border/40 hover:bg-muted/30 transition text-xs relative"
                  >
                    <span
                      className={cn('absolute left-0 top-0 bottom-0 w-1', sev.stripe)}
                      aria-hidden
                    />
                    <span className="pl-2">
                      <span
                        className={cn(
                          'inline-block w-2 h-2 rounded-full',
                          sev.stripe
                        )}
                        title={t(sev.labelKey)}
                      />
                    </span>
                    <span className="font-medium truncate">
                      {TYPE_LABEL_KEY[a.type] ? t(TYPE_LABEL_KEY[a.type]) : a.type}
                    </span>
                    <span
                      className={cn(
                        'text-right font-mono tabular-nums font-bold',
                        sev.color
                      )}
                    >
                      {Math.round(a.riskScore * 100)}%
                    </span>
                    <span>
                      <Badge
                        variant="outline"
                        className={cn(
                          'text-[9px] px-1.5',
                          ALERT_STATUS_COLOR[a.status] ||
                            'border-border text-muted-foreground'
                        )}
                      >
                        {ALERT_STATUS_LABEL_KEY[a.status] ? t(ALERT_STATUS_LABEL_KEY[a.status]) : a.status}
                      </Badge>
                    </span>
                    <span className="text-foreground/80 line-clamp-1 text-[11px]">
                      {a.description}
                    </span>
                    <span className="text-right text-[10px] text-muted-foreground">
                      {mounted ? timeAgo(a.createdAt) : ''}
                    </span>
                  </motion.button>
                )
              })}
            </div>
          </ScrollArea>
        )}
      </CardContent>
    </Card>
  )
}

// ─── Main View ───────────────────────────────────────────────────────────────
export function AdminView() {
  const { t } = useI18n()
  const mounted = useMounted()
  const [refreshKey, setRefreshKey] = useState(0)
  const url = refreshKey ? `/api/admin/stats?r=${refreshKey}` : '/api/admin/stats'
  const { data, loading } = useApi<AdminStats>(url, { refresh: 20000 })

  const handleRefresh = () => {
    setRefreshKey((k) => k + 1)
    toast.success(t('admin.refresh.toast'), {
      description: t('admin.refresh.toastDesc'),
    })
  }

  const stats: AdminStats | null = data ?? null
  const generatedAt = stats?.generatedAt
  const showSkeleton = loading && !data

  return (
    <div className="flex-1 py-4">
      <div className="max-w-[1600px] mx-auto px-3 lg:px-5 space-y-4">
        {/* Header */}
        <header className="flex flex-col lg:flex-row lg:items-end justify-between gap-3">
          <div>
            <div className="flex items-center gap-2 mb-1.5 flex-wrap">
              <Badge variant="outline" className="border-primary/40 text-primary gap-1.5">
                <Lock className="w-3 h-3" />
                ADMIN CONSOLE
              </Badge>
              <Badge variant="outline" className="text-[10px] text-muted-foreground">
                {t('admin.header.access')}
              </Badge>
              <Badge
                variant="outline"
                className="text-[10px] border-success/40 text-success gap-1.5"
              >
                <span className="w-1.5 h-1.5 rounded-full bg-success animate-pulse" />
                LIVE
              </Badge>
            </div>
            <h1 className="text-2xl lg:text-3xl font-bold tracking-tight flex items-center gap-2.5">
              <BarChart3 className="w-7 h-7 text-primary" />
              {t('admin.header.title')}
            </h1>
            <p className="text-xs text-muted-foreground mt-1.5 flex items-center gap-1.5">
              <Database className="w-3.5 h-3.5 text-success" />
              {t('admin.header.subtitle')}
              {generatedAt && mounted && (
                <span className="text-success">
                  {t('admin.header.updatedAt')} {new Date(generatedAt).toLocaleTimeString('ru-RU', {
                    hour: '2-digit',
                    minute: '2-digit',
                    second: '2-digit',
                  })}
                </span>
              )}
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            disabled={loading}
            className="gap-2 border-primary/30 text-primary hover:bg-primary/10 shrink-0"
          >
            <RefreshCw className={cn('w-3.5 h-3.5', loading && 'animate-spin')} />
            {t('admin.refreshBtn')}
          </Button>
        </header>

        {/* First-paint skeleton: API still loading, no data yet */}
        {showSkeleton ? (
          <>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
              {Array.from({ length: 4 }).map((_, i) => (
                <KpiCardSkeleton key={i} />
              ))}
            </div>
            <Card className="bg-card/60 backdrop-blur">
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Activity className="w-4 h-4 text-primary" />
                    {t('admin.trades.title')}
                  </CardTitle>
                  <Badge variant="outline" className="text-[10px]">
                    —
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="p-0">
                <div className="px-4 pb-3">
                  <div className="grid grid-cols-[1fr_0.5fr_1fr_1fr_1.4fr_0.8fr] gap-2 text-[10px] uppercase tracking-wider text-muted-foreground py-2 border-b border-border">
                    <span>{t('admin.trades.col.pair')}</span>
                    <span className="text-center">{t('admin.trades.col.side')}</span>
                    <span className="text-right">{t('admin.trades.col.price')}</span>
                    <span className="text-right">{t('admin.trades.col.qty')}</span>
                    <span className="text-right">{t('admin.trades.col.sum')}</span>
                    <span className="text-right">{t('admin.trades.col.time')}</span>
                  </div>
                  <TableSkeleton rows={6} />
                </div>
              </CardContent>
            </Card>
          </>
        ) : (
          <>
            {/* Row 1 — KPI cards */}
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
              <StatCard
                title={t('admin.kpi.users')}
                value={stats ? formatNumber(stats.totalUsers, 0) : '—'}
                sub={stats ? `${t('admin.kpi.usersSub')} ${stats.newUsers24h}` : ''}
                icon={Users}
                iconTone="bg-primary/15 text-primary"
                delta={stats?.newUsers24h}
                index={0}
              />
              <StatCard
                title={t('admin.kpi.volume24')}
                value={stats ? formatPrice(stats.volume24h, 'rub') : '—'}
                sub={stats ? `${t('admin.kpi.volume24Sub')} ${stats.trades24hCount}` : ''}
                icon={CircleDollarSign}
                iconTone="bg-success/15 text-success"
                index={1}
              />
              <StatCard
                title={t('admin.kpi.trades24')}
                value={stats ? formatNumber(stats.trades24hCount, 0) : '—'}
                sub={stats ? `${t('admin.kpi.trades24Sub')} ${formatNumber(stats.totalTrades, 0)}` : ''}
                icon={Activity}
                iconTone="bg-violet-400/15 text-violet-400"
                index={2}
              />
              <StatCard
                title={t('admin.kpi.openAlerts')}
                value={stats ? formatNumber(stats.openAlerts, 0) : '—'}
                sub={stats ? `${t('admin.kpi.openAlertsSub')} ${stats.criticalAlerts}` : ''}
                icon={AlertTriangle}
                iconTone="bg-destructive/15 text-destructive"
                tone={stats && stats.criticalAlerts > 0 ? 'danger' : 'warning'}
                index={3}
              />
              <StatCard
                title={t('admin.kpi.p2p')}
                value={stats ? formatNumber(stats.openP2PDeals, 0) : '—'}
                sub={t('admin.kpi.p2pSub')}
                icon={Users}
                iconTone="bg-orange-500/15 text-orange-400"
                index={4}
              />
            </div>

            {/* Row 2 — Recent trades (left, 2/3) + KYC donut & top pairs (right, 1/3) */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
              <div className="lg:col-span-2">
                <RecentTradesTable trades={stats?.recentTrades ?? []} />
              </div>
              <KycAndPairsCard
                usersByKycLevel={
                  stats?.usersByKycLevel ?? { level0: 0, level1: 0, level2: 0 }
                }
                tradesByPair={stats?.tradesByPair ?? []}
              />
            </div>

            {/* Row 3 — Recent users (left) + Recent payments (right) */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
              <RecentUsersList users={stats?.recentUsers ?? []} />
              <RecentPaymentsList payments={stats?.recentPayments ?? []} />
            </div>

            {/* Row 4 — Incidents & alerts */}
            <AlertsTable alerts={stats?.recentAlerts ?? []} />

            {/* Footer */}
            <Card className="bg-card/40 border-dashed">
              <CardContent className="flex flex-col sm:flex-row items-center justify-between gap-2 p-4 text-[11px] text-muted-foreground">
                <div className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-success animate-pulse" />
                  {t('admin.footer.autoRefresh')}
                </div>
                <div className="flex items-center gap-1.5">
                  <Database className="w-3 h-3 text-success" />
                  {t('admin.footer.source')}
                </div>
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </div>
  )
}
