'use client'

import { useState, useMemo } from 'react'
import { motion } from 'framer-motion'
import {
  Landmark,
  CircleDollarSign,
  Receipt,
  Banknote,
  Activity,
  AlertTriangle,
  Wallet,
  RefreshCw,
  Plus,
  Pencil,
  CheckCircle2,
  AlertCircle,
  Database,
  Lock,
  FileText,
  Globe2,
  Zap,
  Download,
  ChevronDown,
  ChevronRight,
  Webhook,
  Scale,
} from 'lucide-react'
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  ResponsiveContainer,
} from 'recharts'
import { toast } from 'sonner'
import { useApi, apiPost, apiPatch } from '@/lib/use-api'
import { useI18n } from '@/lib/use-i18n'
import { useMounted } from '@/lib/use-mounted'
import { useAppStore } from '@/lib/store'
import { formatPrice, formatNumber, timeAgo, formatDateTime } from '@/lib/format'
import { cn } from '@/lib/utils'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Progress } from '@/components/ui/progress'
import { Separator } from '@/components/ui/separator'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog'
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion'
import { KpiCardSkeleton, TableSkeleton } from '@/components/page-skeleton'

// ─── Types (returned by /api/finance/*) ──────────────────────────────────────
interface BankFee {
  id: string
  bankId: string
  operationType: string
  feeType: string
  feePercent: number
  feeFixed: number
  feeMin: number
  feeMax: number | null
  payer: string
  tiers: string | null
  currency: string
  active: boolean
}

interface BankLimit {
  id: string
  bankId: string
  dailyLimit: number
  monthlyLimit: number
  perTransactionLimit: number
  perUserDailyLimit: number
  currency: string
  alertThreshold: number
  autoSuspendOnLimit: boolean
}

interface BankAccount {
  id: string
  bankId: string
  accountNumber: string
  currency: string
  balance: number
  minBalance: number
  type: string
  lastSyncAt: string | null
}

interface Bank {
  id: string
  name: string
  bic: string
  swift: string | null
  inn: string | null
  correspondentAccount: string | null
  type: string
  status: string
  priority: number
  contactPerson: string | null
  contactPhone: string | null
  contactEmail: string | null
  contractDate: string | null
  contractExpiry: string | null
  licenseStatus: string
  capitalRequirement: number
  dataProcessorAgreement: string | null
  apiEndpoint: string | null
  apiProtocol: string
  cryptoProtocol: string
  oauthServerUrl: string | null
  merchantLogin: string | null
  signingCertificate: string | null
  paymentPageMode: string
  isSandbox: boolean
  webhookUrl: string | null
  fees: BankFee[]
  limits: BankLimit | null
  accounts: BankAccount[]
}

interface PerBankStat {
  id: string
  name: string
  bic: string
  type: string
  status: string
  volume24h: number
  fees24h: number
  txCount24h: number
  shareOfTotal: number
  dailyUsagePct: number
  limitAlert: boolean
}

interface DashboardData {
  kpi: {
    totalVolume24h: number
    totalFees24h: number
    activeBanks: number
    txCount24h: number
    thresholdOps: number
  }
  perBank: PerBankStat[]
  series: { date: string; volume: number; fees: number }[]
  alerts: {
    limitAlerts: PerBankStat[]
    lowBalanceAccounts: (BankAccount & { bankName?: string })[]
  }
}

interface Reconciliation {
  id: string
  bankId: string
  period: string
  totalTransactions: number
  matchedCount: number
  unmatchedInternal: number
  unmatchedBank: number
  status: string
  discrepancyAmount: number
  resolvedBy: string | null
  resolvedAt: string | null
  notes: string | null
  createdAt: string
  bank: Pick<Bank, 'id' | 'name' | 'bic'>
}

interface Corridor {
  id: string
  corridorId: string
  senderBankId: string | null
  receiverBankId: string | null
  liquidityBridge: string | null
  feePercent: number
  feeMin: number
  feeMax: number | null
  etaMin: number
  etaMax: number
  minAmount: number
  maxAmount: number
  active: boolean
}

interface WebhookLog {
  id: string
  bankId: string
  eventType: string
  payload: string
  status: string
  createdAt: string
  bank: Pick<Bank, 'id' | 'name'>
}

interface ReportData {
  type: string
  title: string
  count: number
  totalAmount?: number
  transactions?: Array<{
    id: string
    type: string
    amount: number
    fee: number
    currency: string
    status: string
    bankReference: string | null
    createdAt: string
    bank: Pick<Bank, 'name'>
  }>
  banks?: Array<{
    bankName: string
    bic: string
    volume: number
    fees: number
    txCount: number
    thresholdCount: number
  }>
}

// ─── Display constants ───────────────────────────────────────────────────────
const tooltipStyle = {
  background: 'var(--card)',
  border: '1px solid var(--border)',
  borderRadius: 8,
  fontSize: 12,
  color: 'var(--foreground)',
}

const BANK_TYPE_LABEL: Record<string, string> = {
  FIAT_DEPOSIT: 'Ввод fiat',
  FIAT_WITHDRAW: 'Вывод fiat',
  CROSS_BORDER: 'Кросс-бордер',
  SBP: 'СБП',
}

const BANK_STATUS_LABEL: Record<string, string> = {
  ACTIVE: 'Активен',
  SUSPENDED: 'Приостановлен',
  INACTIVE: 'Неактивен',
}

const BANK_STATUS_COLOR: Record<string, string> = {
  ACTIVE: 'border-success/40 text-success bg-success/10',
  SUSPENDED: 'border-warning/40 text-warning bg-warning/10',
  INACTIVE: 'border-border text-muted-foreground bg-muted/30',
}

const CRYPTO_PROTOCOL_LABEL: Record<string, string> = {
  STANDARD_TLS: 'Standard TLS',
  GOST_TLS_1_3: 'ГОСТ TLS 1.3',
}

const FEE_TYPE_LABEL: Record<string, string> = {
  PERCENT: 'Процент',
  FIXED: 'Фикс.',
  COMBINED: 'Комби.',
}

const OPERATION_TYPE_LABEL: Record<string, string> = {
  DEPOSIT: 'Пополнение',
  WITHDRAW: 'Вывод',
  CROSS_BORDER: 'Кросс-бордер',
  SBP_TRANSFER: 'СБП-перевод',
}

const OPERATION_TYPE_COLOR: Record<string, string> = {
  DEPOSIT: 'border-success/40 text-success bg-success/10',
  WITHDRAW: 'border-destructive/40 text-destructive bg-destructive/10',
  CROSS_BORDER: 'border-primary/40 text-primary bg-primary/10',
  SBP_TRANSFER: 'border-warning/40 text-warning bg-warning/10',
}

const RECON_STATUS_LABEL: Record<string, string> = {
  PENDING: 'Ожидает',
  IN_PROGRESS: 'В работе',
  MATCHED: 'Сверено',
  DISCREPANCY: 'Расхождение',
}

const RECON_STATUS_COLOR: Record<string, string> = {
  PENDING: 'border-warning/40 text-warning bg-warning/10',
  IN_PROGRESS: 'border-warning/40 text-warning bg-warning/10',
  MATCHED: 'border-success/40 text-success bg-success/10',
  DISCREPANCY: 'border-destructive/40 text-destructive bg-destructive/10',
}

const ACCOUNT_TYPE_LABEL: Record<string, string> = {
  CORRESPONDENT: 'Корр. счёт',
  OPERATIONAL: 'Операционный',
  RESERVE: 'Резервный',
}

const CORRIDOR_FLAG: Record<string, string> = {
  'RU-CN': '🇨🇳',
  'RU-AE': '🇦🇪',
  'RU-TR': '🇹🇷',
  'RU-IN': '🇮🇳',
  'RU-KZ': '🇰🇿',
  'RU-AM': '🇦🇲',
}

const WEBHOOK_STATUS_COLOR: Record<string, string> = {
  PROCESSED: 'border-success/40 text-success bg-success/10',
  RECEIVED: 'border-primary/40 text-primary bg-primary/10',
  FAILED: 'border-destructive/40 text-destructive bg-destructive/10',
}

const BANK_TYPES = ['FIAT_DEPOSIT', 'FIAT_WITHDRAW', 'CROSS_BORDER', 'SBP']
const API_PROTOCOLS = ['REST', 'SOAP', 'GraphQL']
const CRYPTO_PROTOCOLS = ['STANDARD_TLS', 'GOST_TLS_1_3']
const LICENSE_STATUSES = ['ACTIVE', 'PENDING', 'REVOKED']
const PAYMENT_PAGE_MODES = ['HOSTED', 'API', 'WIDGET']
const FEE_TYPES = ['PERCENT', 'FIXED', 'COMBINED']
const OPERATION_TYPES = ['DEPOSIT', 'WITHDRAW', 'CROSS_BORDER', 'SBP_TRANSFER']
const PAYER_OPTIONS = ['USER', 'EXCHANGE']

const EMPTY_BANK_FORM = {
  name: '',
  bic: '',
  swift: '',
  inn: '',
  correspondentAccount: '',
  type: 'SBP',
  status: 'ACTIVE',
  priority: 1,
  contactPerson: '',
  contactPhone: '',
  contactEmail: '',
  apiEndpoint: '',
  apiProtocol: 'REST',
  cryptoProtocol: 'STANDARD_TLS',
  licenseStatus: 'ACTIVE',
  capitalRequirement: 50000000,
  dataProcessorAgreement: '',
  paymentPageMode: 'HOSTED',
  isSandbox: true,
}

// ─── KPI Stat Card ───────────────────────────────────────────────────────────
interface StatCardProps {
  title: string
  value: string
  sub?: string
  icon: React.ComponentType<{ className?: string }>
  iconTone: string
  tone?: 'default' | 'danger' | 'warning' | 'success'
  index?: number
  badge?: string
}

function StatCard({
  title,
  value,
  sub,
  icon: Icon,
  iconTone,
  tone = 'default',
  index = 0,
  badge,
}: StatCardProps) {
  const toneText =
    tone === 'danger'
      ? 'text-destructive'
      : tone === 'warning'
        ? 'text-warning'
        : tone === 'success'
          ? 'text-success'
          : 'text-primary'
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
          {badge && (
            <span className="inline-flex items-center gap-0.5 font-medium px-1.5 py-0.5 rounded-md text-warning bg-warning/10">
              <AlertTriangle className="w-3 h-3" />
              {badge}
            </span>
          )}
          {sub && <span className="text-muted-foreground">{sub}</span>}
        </div>
      </Card>
    </motion.div>
  )
}

// ─── Helpers ─────────────────────────────────────────────────────────────────
function fmtDate(s: string | null): string {
  if (!s) return '—'
  return formatDateTime(s)
}

function fmtPct(n: number): string {
  return `${n.toFixed(1)}%`
}

function computeFeePreview(fee: BankFee, amount = 100000): number {
  let val = 0
  if (fee.feeType === 'PERCENT' || fee.feeType === 'COMBINED') {
    val = (amount * fee.feePercent) / 100
  }
  if (fee.feeType === 'FIXED' || fee.feeType === 'COMBINED') {
    val += fee.feeFixed
  }
  if (fee.feeMin && val < fee.feeMin) val = fee.feeMin
  if (fee.feeMax && val > fee.feeMax) val = fee.feeMax
  return val
}

// ─── Tab 1: Дашборд ──────────────────────────────────────────────────────────
function DashboardTab({ refreshKey }: { refreshKey: number }) {
  const mounted = useMounted()
  const url = refreshKey
    ? `/api/finance/dashboard?r=${refreshKey}`
    : '/api/finance/dashboard'
  const { data, loading } = useApi<DashboardData>(url, { refresh: 30000 })

  if (loading && !data) {
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <KpiCardSkeleton key={i} />
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
          <Card className="bg-card/60 p-4 h-[300px]" />
          <Card className="bg-card/60 p-4 h-[300px]" />
        </div>
        <Card className="bg-card/60">
          <div className="p-4">
            <TableSkeleton rows={5} />
          </div>
        </Card>
      </div>
    )
  }

  if (!data) {
    return (
      <div className="py-10 text-center text-sm text-muted-foreground">
        Нет данных
      </div>
    )
  }

  const { kpi, perBank, series, alerts } = data
  const barData = perBank.map((b) => ({
    name: b.name,
    volume: Math.round(b.volume24h / 1_000_000),
  }))
  const lineData = series.slice(-30).map((s) => ({
    date: s.date.slice(5),
    volume: Math.round(s.volume / 1_000_000),
    fees: Math.round(s.fees / 1000),
  }))

  return (
    <div className="space-y-4">
      {/* KPI row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard
          title="Оборот 24ч"
          value={formatPrice(kpi.totalVolume24h, 'rub')}
          sub={`за ${kpi.txCount24h} транз.`}
          icon={CircleDollarSign}
          iconTone="bg-primary/15 text-primary"
          index={0}
        />
        <StatCard
          title="Комиссии 24ч"
          value={formatPrice(kpi.totalFees24h, 'rub')}
          sub="доход биржи"
          icon={Receipt}
          iconTone="bg-success/15 text-success"
          tone="success"
          index={1}
        />
        <StatCard
          title="Активных банков"
          value={formatNumber(kpi.activeBanks, 0)}
          sub="из подключённых"
          icon={Landmark}
          iconTone="bg-warning/15 text-warning"
          index={2}
        />
        <StatCard
          title="Транзакций 24ч"
          value={formatNumber(kpi.txCount24h, 0)}
          sub="пороговых: 115-ФЗ"
          icon={Activity}
          iconTone="bg-destructive/15 text-destructive"
          tone={kpi.thresholdOps > 0 ? 'warning' : 'default'}
          badge={kpi.thresholdOps > 0 ? `${kpi.thresholdOps} >600K` : undefined}
          index={3}
        />
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
        <Card className="bg-card/60 backdrop-blur">
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <BarChart className="w-4 h-4 text-primary" />
              Оборот по банкам (млн ₽, 24ч)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[260px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={barData} margin={{ top: 4, right: 8, bottom: 4, left: -10 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" opacity={0.4} />
                  <XAxis
                    dataKey="name"
                    tick={{ fontSize: 10, fill: 'var(--muted-foreground)' }}
                    interval={0}
                    angle={-15}
                    textAnchor="end"
                    height={50}
                  />
                  <YAxis tick={{ fontSize: 10, fill: 'var(--muted-foreground)' }} />
                  <Tooltip
                    contentStyle={tooltipStyle}
                    formatter={(v: number) => [`${v} млн ₽`, 'Оборот']}
                  />
                  <Bar dataKey="volume" radius={[4, 4, 0, 0]} fill="#F0B90B" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card/60 backdrop-blur">
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <Activity className="w-4 h-4 text-success" />
              Динамика оборота 30 дней (млн ₽)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[260px]">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={lineData} margin={{ top: 4, right: 8, bottom: 4, left: -10 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" opacity={0.4} />
                  <XAxis
                    dataKey="date"
                    tick={{ fontSize: 9, fill: 'var(--muted-foreground)' }}
                    interval={3}
                  />
                  <YAxis tick={{ fontSize: 10, fill: 'var(--muted-foreground)' }} />
                  <Tooltip
                    contentStyle={tooltipStyle}
                    formatter={(v: number, n: string) => [
                      n === 'volume' ? `${v} млн ₽` : `${v}K ₽`,
                      n === 'volume' ? 'Оборот' : 'Комиссии',
                    ]}
                  />
                  <Line
                    type="monotone"
                    dataKey="volume"
                    stroke="#F0B90B"
                    strokeWidth={2}
                    dot={false}
                  />
                  <Line
                    type="monotone"
                    dataKey="fees"
                    stroke="#22c55e"
                    strokeWidth={1.5}
                    strokeDasharray="4 4"
                    dot={false}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Per-bank table */}
      <Card className="bg-card/60 backdrop-blur">
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <Landmark className="w-4 h-4 text-primary" />
            Обороты по банкам
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <ScrollArea className="max-h-96">
            <div className="px-4 pb-3">
              <div className="grid grid-cols-[1.4fr_1fr_1fr_0.8fr_1.2fr_0.7fr] gap-2 text-[10px] uppercase tracking-wider text-muted-foreground py-2 border-b border-border sticky top-0 bg-card/95 backdrop-blur z-10">
                <span>Банк</span>
                <span className="text-right">Оборот 24ч</span>
                <span className="text-right">Комиссии</span>
                <span className="text-right">Доля</span>
                <span className="text-right">Дневн. лимит</span>
                <span className="text-right">Статус</span>
              </div>
              {perBank.map((b, i) => {
                const usagePct = b.dailyUsagePct
                const usageColor =
                  usagePct >= 80
                    ? 'bg-destructive'
                    : usagePct >= 50
                      ? 'bg-warning'
                      : 'bg-success'
                return (
                  <motion.div
                    key={b.id}
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.22, delay: Math.min(i * 0.03, 0.4), ease: 'easeOut' }}
                    className="grid grid-cols-[1.4fr_1fr_1fr_0.8fr_1.2fr_0.7fr] gap-2 items-center py-2 border-b border-border/40 hover:bg-muted/30 transition text-xs"
                  >
                    <span className="font-medium truncate">{b.name}</span>
                    <span className="text-right font-mono tabular-nums text-primary">
                      {formatPrice(b.volume24h, 'rub')}
                    </span>
                    <span className="text-right font-mono tabular-nums text-success">
                      {formatPrice(b.fees24h, 'rub')}
                    </span>
                    <span className="text-right font-mono tabular-nums">
                      {fmtPct(b.shareOfTotal)}
                    </span>
                    <div className="flex items-center gap-1.5">
                      <Progress
                        value={usagePct}
                        className={cn('h-1.5 flex-1', `[&>div]:${usageColor}`)}
                      />
                      <span className="text-[10px] font-mono tabular-nums w-8 text-right">
                        {usagePct.toFixed(0)}%
                      </span>
                    </div>
                    <span className="flex justify-end">
                      <Badge
                        variant="outline"
                        className={cn('text-[9px] px-1.5', BANK_STATUS_COLOR[b.status])}
                      >
                        {BANK_STATUS_LABEL[b.status] ?? b.status}
                      </Badge>
                    </span>
                  </motion.div>
                )
              })}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>

      {/* Alerts */}
      {(alerts.limitAlerts.length > 0 || alerts.lowBalanceAccounts.length > 0) && (
        <Card className="bg-card/60 backdrop-blur border-warning/30">
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-warning" />
              Оповещения
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {alerts.limitAlerts.length > 0 && (
              <div className="space-y-1.5">
                <div className="text-[11px] text-muted-foreground uppercase tracking-wider">
                  Банки &gt; 80% дневного лимита
                </div>
                {alerts.limitAlerts.map((b) => (
                  <div
                    key={b.id}
                    className="flex items-center justify-between gap-2 p-2 rounded-md bg-warning/10 border border-warning/30 text-xs"
                  >
                    <span className="font-medium">{b.name}</span>
                    <span className="font-mono tabular-nums text-warning">
                      {b.dailyUsagePct.toFixed(1)}%
                    </span>
                  </div>
                ))}
              </div>
            )}
            {alerts.lowBalanceAccounts.length > 0 && (
              <div className="space-y-1.5">
                <div className="text-[11px] text-muted-foreground uppercase tracking-wider">
                  Счета с низким балансом
                </div>
                {alerts.lowBalanceAccounts.map((a) => (
                  <div
                    key={a.id}
                    className="flex items-center justify-between gap-2 p-2 rounded-md bg-destructive/10 border border-destructive/30 text-xs"
                  >
                    <span className="font-medium truncate">
                      {a.bankName ?? '—'} • {a.accountNumber}
                    </span>
                    <span className="font-mono tabular-nums text-destructive">
                      {formatPrice(a.balance, 'rub')} / {formatPrice(a.minBalance, 'rub')}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      <Card className="bg-card/40 border-dashed">
        <CardContent className="flex items-center justify-between gap-2 p-3 text-[11px] text-muted-foreground">
          <div className="flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-success animate-pulse" />
            Автообновление каждые 30 секунд
            {mounted && data && (
              <span className="text-success">
                • обновлено {new Date().toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
              </span>
            )}
          </div>
          <div className="flex items-center gap-1.5">
            <Database className="w-3 h-3 text-success" />
            Источник: BankTransaction (агрегация)
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

// ─── Tab 2: Банки ────────────────────────────────────────────────────────────
function BankFormFields({
  form,
  setForm,
}: {
  form: typeof EMPTY_BANK_FORM
  setForm: (f: typeof EMPTY_BANK_FORM) => void
}) {
  const update = (k: keyof typeof EMPTY_BANK_FORM, v: string | number | boolean) =>
    setForm({ ...form, [k]: v })

  return (
    <div className="space-y-4 max-h-[60vh] overflow-y-auto scrollbar-thin pr-1">
      {/* Basic */}
      <div className="space-y-2">
        <div className="text-[11px] uppercase tracking-wider text-muted-foreground">Основное</div>
        <div className="grid grid-cols-2 gap-2">
          <div className="col-span-2 space-y-1.5">
            <Label className="text-xs">Название банка</Label>
            <Input
              value={form.name}
              onChange={(e) => update('name', e.target.value)}
              placeholder="Альфа-Банк"
              className="h-9"
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">БИК</Label>
            <Input
              value={form.bic}
              onChange={(e) => update('bic', e.target.value)}
              placeholder="044525593"
              className="h-9 font-mono"
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">SWIFT</Label>
            <Input
              value={form.swift}
              onChange={(e) => update('swift', e.target.value)}
              placeholder="ALFARUMM"
              className="h-9 font-mono"
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">ИНН</Label>
            <Input
              value={form.inn}
              onChange={(e) => update('inn', e.target.value)}
              placeholder="7728168971"
              className="h-9 font-mono"
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Корр. счёт</Label>
            <Input
              value={form.correspondentAccount}
              onChange={(e) => update('correspondentAccount', e.target.value)}
              placeholder="30101810200000000593"
              className="h-9 font-mono"
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Тип</Label>
            <Select value={form.type} onValueChange={(v) => update('type', v)}>
              <SelectTrigger className="h-9">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {BANK_TYPES.map((t) => (
                  <SelectItem key={t} value={t}>
                    {BANK_TYPE_LABEL[t]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Приоритет</Label>
            <Select
              value={String(form.priority)}
              onValueChange={(v) => update('priority', Number(v))}
            >
              <SelectTrigger className="h-9">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="1">1 — Основной</SelectItem>
                <SelectItem value="2">2 — Резервный</SelectItem>
                <SelectItem value="3">3 — Запас</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      <Separator />

      {/* Regulatory */}
      <div className="space-y-2">
        <div className="text-[11px] uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
          <Scale className="w-3 h-3" /> Регуляторика
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div className="space-y-1.5">
            <Label className="text-xs">Статус лицензии</Label>
            <Select value={form.licenseStatus} onValueChange={(v) => update('licenseStatus', v)}>
              <SelectTrigger className="h-9">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {LICENSE_STATUSES.map((s) => (
                  <SelectItem key={s} value={s}>
                    {s}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Капитал (₽)</Label>
            <Input
              type="number"
              value={form.capitalRequirement}
              onChange={(e) => update('capitalRequirement', Number(e.target.value))}
              className="h-9 font-mono"
            />
          </div>
          <div className="col-span-2 space-y-1.5">
            <Label className="text-xs">Договор ПДн (152-ФЗ)</Label>
            <Input
              value={form.dataProcessorAgreement}
              onChange={(e) => update('dataProcessorAgreement', e.target.value)}
              placeholder="Договор ПДн №2026/01 от 15.01.2025"
              className="h-9"
            />
          </div>
        </div>
      </div>

      <Separator />

      {/* Technical */}
      <div className="space-y-2">
        <div className="text-[11px] uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
          <Zap className="w-3 h-3" /> Технические параметры
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div className="space-y-1.5">
            <Label className="text-xs">API protocol</Label>
            <Select value={form.apiProtocol} onValueChange={(v) => update('apiProtocol', v)}>
              <SelectTrigger className="h-9">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {API_PROTOCOLS.map((p) => (
                  <SelectItem key={p} value={p}>
                    {p}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Crypto protocol</Label>
            <Select value={form.cryptoProtocol} onValueChange={(v) => update('cryptoProtocol', v)}>
              <SelectTrigger className="h-9">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {CRYPTO_PROTOCOLS.map((p) => (
                  <SelectItem key={p} value={p}>
                    {CRYPTO_PROTOCOL_LABEL[p]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="col-span-2 space-y-1.5">
            <Label className="text-xs">API endpoint</Label>
            <Input
              value={form.apiEndpoint}
              onChange={(e) => update('apiEndpoint', e.target.value)}
              placeholder="https://alfa-pay.demo.alfabank.ru/api/v1"
              className="h-9 font-mono text-[11px]"
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Payment page</Label>
            <Select value={form.paymentPageMode} onValueChange={(v) => update('paymentPageMode', v)}>
              <SelectTrigger className="h-9">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {PAYMENT_PAGE_MODES.map((m) => (
                  <SelectItem key={m} value={m}>
                    {m}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Контакт (ФИО)</Label>
            <Input
              value={form.contactPerson}
              onChange={(e) => update('contactPerson', e.target.value)}
              placeholder="Петров А.В."
              className="h-9"
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Телефон</Label>
            <Input
              value={form.contactPhone}
              onChange={(e) => update('contactPhone', e.target.value)}
              placeholder="+7 (495) 788-88-78"
              className="h-9"
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Email</Label>
            <Input
              value={form.contactEmail}
              onChange={(e) => update('contactEmail', e.target.value)}
              placeholder="ecom@alfabank.ru"
              className="h-9"
            />
          </div>
          <div className="col-span-2 flex items-center justify-between gap-3 p-2 rounded-md bg-muted/30 border border-border">
            <div>
              <div className="text-xs font-medium">Песочница (sandbox)</div>
              <div className="text-[10px] text-muted-foreground">
                Тестовая среда без реальных платежей
              </div>
            </div>
            <Switch
              checked={form.isSandbox}
              onCheckedChange={(v) => update('isSandbox', v)}
            />
          </div>
        </div>
      </div>
    </div>
  )
}

function BanksTab({ refreshKey, onRefresh }: { refreshKey: number; onRefresh: () => void }) {
  const url = refreshKey ? `/api/finance/banks?r=${refreshKey}` : '/api/finance/banks'
  const { data, loading } = useApi<{ banks: Bank[] }>(url)

  const [dialogOpen, setDialogOpen] = useState(false)
  const [editing, setEditing] = useState<Bank | null>(null)
  const [form, setForm] = useState<typeof EMPTY_BANK_FORM>(EMPTY_BANK_FORM)
  const [saving, setSaving] = useState(false)

  const openCreate = () => {
    setEditing(null)
    setForm(EMPTY_BANK_FORM)
    setDialogOpen(true)
  }

  const openEdit = (b: Bank) => {
    setEditing(b)
    setForm({
      name: b.name,
      bic: b.bic,
      swift: b.swift ?? '',
      inn: b.inn ?? '',
      correspondentAccount: b.correspondentAccount ?? '',
      type: b.type,
      status: b.status,
      priority: b.priority,
      contactPerson: b.contactPerson ?? '',
      contactPhone: b.contactPhone ?? '',
      contactEmail: b.contactEmail ?? '',
      apiEndpoint: b.apiEndpoint ?? '',
      apiProtocol: b.apiProtocol,
      cryptoProtocol: b.cryptoProtocol,
      licenseStatus: b.licenseStatus,
      capitalRequirement: b.capitalRequirement,
      dataProcessorAgreement: b.dataProcessorAgreement ?? '',
      paymentPageMode: b.paymentPageMode,
      isSandbox: b.isSandbox,
    })
    setDialogOpen(true)
  }

  const handleSave = async () => {
    if (!form.name || !form.bic) {
      toast.error('Заполните название и БИК')
      return
    }
    setSaving(true)
    try {
      if (editing) {
        await apiPatch(`/api/finance/banks/${editing.id}`, form)
        toast.success('Банк обновлён', { description: form.name })
      } else {
        await apiPost('/api/finance/banks', form)
        toast.success('Банк добавлен', { description: form.name })
      }
      setDialogOpen(false)
      onRefresh()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Ошибка сохранения')
    } finally {
      setSaving(false)
    }
  }

  if (loading && !data) {
    return (
      <Card className="bg-card/60">
        <div className="p-4">
          <TableSkeleton rows={6} />
        </div>
      </Card>
    )
  }

  const banks = data?.banks ?? []

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="text-xs text-muted-foreground">
          Всего банков: <span className="text-foreground font-medium">{banks.length}</span>
        </div>
        <Button
          size="sm"
          onClick={openCreate}
          className="gap-1.5 bg-primary text-primary-foreground hover:bg-primary/90 h-8"
        >
          <Plus className="w-3.5 h-3.5" />
          Добавить банк
        </Button>
      </div>

      <Card className="bg-card/60 backdrop-blur">
        <CardContent className="p-0">
          <ScrollArea className="max-h-[70vh]">
            <div className="px-4 pb-3">
              <div className="grid grid-cols-[1.4fr_1fr_1fr_0.6fr_0.9fr_0.8fr_0.5fr] gap-2 text-[10px] uppercase tracking-wider text-muted-foreground py-2 border-b border-border sticky top-0 bg-card/95 backdrop-blur z-10">
                <span>Банк</span>
                <span>BIC</span>
                <span>Тип</span>
                <span>Приор.</span>
                <span>API / Crypto</span>
                <span>Статус</span>
                <span className="text-right">·</span>
              </div>
              {banks.map((b, i) => (
                <motion.button
                  key={b.id}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.22, delay: Math.min(i * 0.03, 0.4), ease: 'easeOut' }}
                  onClick={() => openEdit(b)}
                  className="w-full text-left grid grid-cols-[1.4fr_1fr_1fr_0.6fr_0.9fr_0.8fr_0.5fr] gap-2 items-center py-2 border-b border-border/40 hover:bg-muted/30 transition text-xs"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <div className="w-7 h-7 rounded-md bg-primary/15 text-primary flex items-center justify-center text-[10px] font-bold shrink-0">
                      {b.name.slice(0, 2).toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <div className="font-medium truncate">{b.name}</div>
                      {b.isSandbox && (
                        <span className="text-[9px] text-warning">sandbox</span>
                      )}
                    </div>
                  </div>
                  <span className="font-mono tabular-nums text-muted-foreground">{b.bic}</span>
                  <span>
                    <Badge variant="outline" className="text-[9px] px-1.5">
                      {BANK_TYPE_LABEL[b.type] ?? b.type}
                    </Badge>
                  </span>
                  <span className="font-mono tabular-nums">{b.priority}</span>
                  <div className="flex flex-col gap-0.5 text-[10px]">
                    <span className="text-muted-foreground">{b.apiProtocol}</span>
                    <Badge
                      variant="outline"
                      className={cn(
                        'text-[8px] px-1 py-0 w-fit',
                        b.cryptoProtocol === 'GOST_TLS_1_3'
                          ? 'border-primary/40 text-primary bg-primary/10'
                          : 'border-border text-muted-foreground'
                      )}
                    >
                      {CRYPTO_PROTOCOL_LABEL[b.cryptoProtocol] ?? b.cryptoProtocol}
                    </Badge>
                  </div>
                  <span>
                    <Badge
                      variant="outline"
                      className={cn('text-[9px] px-1.5', BANK_STATUS_COLOR[b.status])}
                    >
                      {BANK_STATUS_LABEL[b.status] ?? b.status}
                    </Badge>
                  </span>
                  <span className="flex justify-end">
                    <Pencil className="w-3 h-3 text-muted-foreground" />
                  </span>
                </motion.button>
              ))}
              {banks.length === 0 && (
                <div className="py-10 text-center text-sm text-muted-foreground">
                  Банки не подключены
                </div>
              )}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>

      {/* Create/Edit dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Landmark className="w-4 h-4 text-primary" />
              {editing ? `Редактировать: ${editing.name}` : 'Новый банк-партнёр'}
            </DialogTitle>
            <DialogDescription>
              {editing
                ? 'Измените реквизиты и нажмите «Сохранить»'
                : 'Заполните форму подключения банка-партнёра'}
            </DialogDescription>
          </DialogHeader>

          <BankFormFields form={form} setForm={setForm} />

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)} disabled={saving}>
              Отмена
            </Button>
            <Button
              onClick={handleSave}
              disabled={saving}
              className="bg-primary text-primary-foreground hover:bg-primary/90 gap-1.5"
            >
              {saving ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
              Сохранить
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

// ─── Tab 3: Комиссии ─────────────────────────────────────────────────────────
function FeeEditDialog({
  fee,
  bankId,
  onClose,
  onSaved,
}: {
  fee: BankFee | null
  bankId: string
  onClose: () => void
  onSaved: () => void
}) {
  const [form, setForm] = useState({
    operationType: fee?.operationType ?? 'DEPOSIT',
    feeType: fee?.feeType ?? 'PERCENT',
    feePercent: fee?.feePercent ?? 0.5,
    feeFixed: fee?.feeFixed ?? 0,
    feeMin: fee?.feeMin ?? 0,
    feeMax: fee?.feeMax ?? 0,
    payer: fee?.payer ?? 'USER',
    active: fee?.active ?? true,
  })
  const [saving, setSaving] = useState(false)

  const handleSave = async () => {
    setSaving(true)
    try {
      const payload = { ...form, feeMax: form.feeMax || null }
      if (fee) {
        // PATCH not implemented for fee [id], use POST to create new + deactivate old
        await apiPost(`/api/finance/banks/${bankId}/fees`, payload)
        toast.success('Комиссия обновлена (создана новая версия)')
      } else {
        await apiPost(`/api/finance/banks/${bankId}/fees`, payload)
        toast.success('Комиссия создана')
      }
      onSaved()
      onClose()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Ошибка')
    } finally {
      setSaving(false)
    }
  }

  const previewAmount = 100000
  const previewFee = computeFeePreview({ ...form, feeMax: form.feeMax || null } as BankFee, previewAmount)

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Receipt className="w-4 h-4 text-primary" />
            {fee ? 'Изменить комиссию' : 'Новая комиссия'}
          </DialogTitle>
          <DialogDescription>Настройте параметры комиссии банка</DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1.5">
              <Label className="text-xs">Тип операции</Label>
              <Select value={form.operationType} onValueChange={(v) => setForm({ ...form, operationType: v })}>
                <SelectTrigger className="h-9">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {OPERATION_TYPES.map((t) => (
                    <SelectItem key={t} value={t}>
                      {OPERATION_TYPE_LABEL[t]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Модель расчёта</Label>
              <Select value={form.feeType} onValueChange={(v) => setForm({ ...form, feeType: v })}>
                <SelectTrigger className="h-9">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {FEE_TYPES.map((t) => (
                    <SelectItem key={t} value={t}>
                      {FEE_TYPE_LABEL[t]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Процент (%)</Label>
              <Input
                type="number"
                step="0.01"
                value={form.feePercent}
                onChange={(e) => setForm({ ...form, feePercent: Number(e.target.value) })}
                className="h-9 font-mono"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Фикс. (₽)</Label>
              <Input
                type="number"
                value={form.feeFixed}
                onChange={(e) => setForm({ ...form, feeFixed: Number(e.target.value) })}
                className="h-9 font-mono"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Минимум (₽)</Label>
              <Input
                type="number"
                value={form.feeMin}
                onChange={(e) => setForm({ ...form, feeMin: Number(e.target.value) })}
                className="h-9 font-mono"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Максимум (₽)</Label>
              <Input
                type="number"
                value={form.feeMax}
                onChange={(e) => setForm({ ...form, feeMax: Number(e.target.value) })}
                className="h-9 font-mono"
              />
            </div>
            <div className="col-span-2 space-y-1.5">
              <Label className="text-xs">Плательщик</Label>
              <Select value={form.payer} onValueChange={(v) => setForm({ ...form, payer: v })}>
                <SelectTrigger className="h-9">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PAYER_OPTIONS.map((p) => (
                    <SelectItem key={p} value={p}>
                      {p === 'USER' ? 'Пользователь' : 'Биржа'}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="p-2 rounded-md bg-primary/10 border border-primary/30 text-xs">
            <div className="text-muted-foreground mb-0.5">Предпросмотр для 100 000 ₽:</div>
            <div className="font-mono tabular-nums text-primary font-bold">
              комиссия = {formatPrice(previewFee, 'rub')}
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={saving}>
            Отмена
          </Button>
          <Button
            onClick={handleSave}
            disabled={saving}
            className="bg-primary text-primary-foreground hover:bg-primary/90 gap-1.5"
          >
            {saving ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
            Сохранить
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function FeesTab({ refreshKey, onRefresh }: { refreshKey: number; onRefresh: () => void }) {
  const url = refreshKey ? `/api/finance/banks?r=${refreshKey}` : '/api/finance/banks'
  const { data, loading } = useApi<{ banks: Bank[] }>(url)
  const [editing, setEditing] = useState<{ bankId: string; fee: BankFee | null } | null>(null)

  if (loading && !data) {
    return (
      <Card className="bg-card/60 p-4">
        <TableSkeleton rows={5} />
      </Card>
    )
  }

  const banks = data?.banks ?? []
  const accordionValue = banks.length > 0 ? banks[0].id : ''

  return (
    <div className="space-y-3">
      <div className="text-xs text-muted-foreground">
        Настройка комиссий по банкам: 4 типа операций (Пополнение, Вывод, Кросс-бордер, СБП)
      </div>

      <Card className="bg-card/60 backdrop-blur">
        <CardContent className="p-3">
          {banks.length === 0 ? (
            <div className="py-10 text-center text-sm text-muted-foreground">
              Нет банков для настройки комиссий
            </div>
          ) : (
            <Accordion type="single" collapsible defaultValue={accordionValue}>
              {banks.map((b) => (
                <AccordionItem key={b.id} value={b.id} className="border-border/60">
                  <AccordionTrigger className="hover:no-underline py-3">
                    <div className="flex items-center gap-2 flex-1">
                      <div className="w-7 h-7 rounded-md bg-primary/15 text-primary flex items-center justify-center text-[10px] font-bold shrink-0">
                        {b.name.slice(0, 2).toUpperCase()}
                      </div>
                      <span className="font-medium text-sm">{b.name}</span>
                      <Badge variant="outline" className="text-[9px] px-1.5">
                        {BANK_TYPE_LABEL[b.type] ?? b.type}
                      </Badge>
                      <Badge variant="outline" className="text-[9px] px-1.5 ml-auto mr-2">
                        {b.fees.length} комиссий
                      </Badge>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent>
                    <div className="space-y-1.5 pt-1">
                      {b.fees.map((f) => {
                        const preview = computeFeePreview(f, 100000)
                        return (
                          <div
                            key={f.id}
                            className="grid grid-cols-[1.2fr_0.8fr_0.7fr_0.7fr_0.7fr_0.6fr_1fr_0.4fr] gap-2 items-center py-2 px-2 border border-border/40 rounded-md hover:bg-muted/30 transition text-xs"
                          >
                            <span>
                              <Badge
                                variant="outline"
                                className={cn('text-[9px] px-1.5', OPERATION_TYPE_COLOR[f.operationType])}
                              >
                                {OPERATION_TYPE_LABEL[f.operationType] ?? f.operationType}
                              </Badge>
                            </span>
                            <span className="font-mono tabular-nums">
                              {FEE_TYPE_LABEL[f.feeType] ?? f.feeType}
                            </span>
                            <span className="font-mono tabular-nums text-primary">
                              {f.feePercent}%
                            </span>
                            <span className="font-mono tabular-nums text-muted-foreground">
                              фикс: {formatNumber(f.feeFixed, 0)}
                            </span>
                            <span className="font-mono tabular-nums text-muted-foreground">
                              мин: {formatNumber(f.feeMin, 0)}
                            </span>
                            <span className="font-mono tabular-nums text-muted-foreground">
                              макс: {f.feeMax ? formatNumber(f.feeMax, 0) : '—'}
                            </span>
                            <span className="text-[10px]">
                              <span className="text-muted-foreground">100K ₽ →</span>{' '}
                              <span className="font-mono tabular-nums text-success">
                                {formatPrice(preview, 'rub')}
                              </span>
                            </span>
                            <span className="flex justify-end gap-1">
                              <Badge
                                variant="outline"
                                className={cn(
                                  'text-[8px] px-1',
                                  f.payer === 'USER'
                                    ? 'border-primary/40 text-primary bg-primary/10'
                                    : 'border-muted text-muted-foreground'
                                )}
                              >
                                {f.payer === 'USER' ? 'USER' : 'EXCH'}
                              </Badge>
                              <button
                                onClick={() => setEditing({ bankId: b.id, fee: f })}
                                className="text-muted-foreground hover:text-primary p-0.5"
                              >
                                <Pencil className="w-3 h-3" />
                              </button>
                            </span>
                          </div>
                        )
                      })}
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setEditing({ bankId: b.id, fee: null })}
                        className="h-7 text-[11px] gap-1 text-primary hover:bg-primary/10 mt-1"
                      >
                        <Plus className="w-3 h-3" />
                        Добавить комиссию
                      </Button>
                    </div>
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          )}
        </CardContent>
      </Card>

      {editing && (
        <FeeEditDialog
          fee={editing.fee}
          bankId={editing.bankId}
          onClose={() => setEditing(null)}
          onSaved={onRefresh}
        />
      )}
    </div>
  )
}

// ─── Tab 4: Лимиты ───────────────────────────────────────────────────────────
function LimitEditDialog({
  bank,
  limits,
  onClose,
  onSaved,
}: {
  bank: Bank
  limits: BankLimit | null
  onClose: () => void
  onSaved: () => void
}) {
  const [form, setForm] = useState({
    dailyLimit: limits?.dailyLimit ?? 50000000,
    monthlyLimit: limits?.monthlyLimit ?? 500000000,
    perTransactionLimit: limits?.perTransactionLimit ?? 1000000,
    perUserDailyLimit: limits?.perUserDailyLimit ?? 300000,
    alertThreshold: limits?.alertThreshold ?? 0.8,
    autoSuspendOnLimit: limits?.autoSuspendOnLimit ?? true,
  })
  const [saving, setSaving] = useState(false)

  const handleSave = async () => {
    setSaving(true)
    try {
      await apiPatch(`/api/finance/banks/${bank.id}/limits`, form)
      toast.success('Лимиты обновлены', { description: bank.name })
      onSaved()
      onClose()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Ошибка')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Banknote className="w-4 h-4 text-primary" />
            Лимиты: {bank.name}
          </DialogTitle>
          <DialogDescription>Установите лимиты оборота (₽)</DialogDescription>
        </DialogHeader>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label className="text-xs">Дневной лимит</Label>
            <Input
              type="number"
              value={form.dailyLimit}
              onChange={(e) => setForm({ ...form, dailyLimit: Number(e.target.value) })}
              className="h-9 font-mono"
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Месячный лимит</Label>
            <Input
              type="number"
              value={form.monthlyLimit}
              onChange={(e) => setForm({ ...form, monthlyLimit: Number(e.target.value) })}
              className="h-9 font-mono"
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">На транзакцию</Label>
            <Input
              type="number"
              value={form.perTransactionLimit}
              onChange={(e) => setForm({ ...form, perTransactionLimit: Number(e.target.value) })}
              className="h-9 font-mono"
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">На пользователя/день (115-ФЗ)</Label>
            <Input
              type="number"
              value={form.perUserDailyLimit}
              onChange={(e) => setForm({ ...form, perUserDailyLimit: Number(e.target.value) })}
              className="h-9 font-mono"
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Порог алерта ({(form.alertThreshold * 100).toFixed(0)}%)</Label>
            <Input
              type="number"
              step="0.05"
              min="0.5"
              max="0.95"
              value={form.alertThreshold}
              onChange={(e) => setForm({ ...form, alertThreshold: Number(e.target.value) })}
              className="h-9 font-mono"
            />
          </div>
          <div className="flex items-center justify-between p-2 rounded-md bg-muted/30 border border-border">
            <div className="text-xs">Авто-приостановка</div>
            <Switch
              checked={form.autoSuspendOnLimit}
              onCheckedChange={(v) => setForm({ ...form, autoSuspendOnLimit: v })}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={saving}>
            Отмена
          </Button>
          <Button
            onClick={handleSave}
            disabled={saving}
            className="bg-primary text-primary-foreground hover:bg-primary/90 gap-1.5"
          >
            {saving ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
            Сохранить
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function BankLimitsCard({
  bank,
  onEdit,
}: {
  bank: Bank
  onEdit: (b: Bank) => void
}) {
  const { data, loading } = useApi<{
    limits: BankLimit | null
    todayUsage: number
    todayCount: number
  }>(`/api/finance/banks/${bank.id}/limits`)

  const limits = data?.limits ?? bank.limits ?? null
  const todayUsage = data?.todayUsage ?? 0
  const todayCount = data?.todayCount ?? 0

  const usagePct = limits ? (todayUsage / limits.dailyLimit) * 100 : 0
  const barColor =
    usagePct >= 80 ? 'bg-destructive' : usagePct >= 50 ? 'bg-warning' : 'bg-success'

  return (
    <Card className="bg-card/60 backdrop-blur">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm flex items-center gap-2">
            <div className="w-6 h-6 rounded-md bg-primary/15 text-primary flex items-center justify-center text-[9px] font-bold">
              {bank.name.slice(0, 2).toUpperCase()}
            </div>
            {bank.name}
          </CardTitle>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onEdit(bank)}
            className="h-7 text-[11px] gap-1 text-primary hover:bg-primary/10"
          >
            <Pencil className="w-3 h-3" />
            Изменить
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {loading ? (
          <div className="space-y-2">
            <div className="h-3 w-full bg-muted/40 rounded animate-pulse" />
            <div className="h-3 w-2/3 bg-muted/40 rounded animate-pulse" />
          </div>
        ) : !limits ? (
          <div className="text-xs text-muted-foreground">Лимиты не настроены</div>
        ) : (
          <>
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-[11px]">
                <span className="text-muted-foreground">Дневной лимит</span>
                <span className="font-mono tabular-nums text-primary font-bold">
                  {formatPrice(todayUsage, 'rub')} / {formatPrice(limits.dailyLimit, 'rub')}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <Progress
                  value={usagePct}
                  className={cn('h-2 flex-1', `[&>div]:${barColor}`)}
                />
                <span className="text-[11px] font-mono tabular-nums w-10 text-right">
                  {usagePct.toFixed(1)}%
                </span>
              </div>
              <div className="text-[10px] text-muted-foreground">
                Транзакций сегодня: {todayCount}
              </div>
            </div>

            <Separator />

            <div className="grid grid-cols-2 gap-2 text-xs">
              <div>
                <div className="text-[10px] text-muted-foreground uppercase">Месячный</div>
                <div className="font-mono tabular-nums">{formatPrice(limits.monthlyLimit, 'rub')}</div>
              </div>
              <div>
                <div className="text-[10px] text-muted-foreground uppercase">На транзакцию</div>
                <div className="font-mono tabular-nums">{formatPrice(limits.perTransactionLimit, 'rub')}</div>
              </div>
              <div>
                <div className="text-[10px] text-muted-foreground uppercase">На польз./день</div>
                <div className="font-mono tabular-nums">{formatPrice(limits.perUserDailyLimit, 'rub')}</div>
              </div>
              <div>
                <div className="text-[10px] text-muted-foreground uppercase">Порог алерта</div>
                <div className="font-mono tabular-nums">
                  {(limits.alertThreshold * 100).toFixed(0)}%
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between p-2 rounded-md bg-muted/30 border border-border text-[11px]">
              <span className="text-muted-foreground">Авто-приостановка на лимите</span>
              <Badge
                variant="outline"
                className={cn(
                  'text-[9px] px-1.5',
                  limits.autoSuspendOnLimit
                    ? 'border-success/40 text-success bg-success/10'
                    : 'border-border text-muted-foreground'
                )}
              >
                {limits.autoSuspendOnLimit ? 'ВКЛ' : 'ВЫКЛ'}
              </Badge>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  )
}

function LimitsTab({ refreshKey, onRefresh }: { refreshKey: number; onRefresh: () => void }) {
  const url = refreshKey ? `/api/finance/banks?r=${refreshKey}` : '/api/finance/banks'
  const { data, loading } = useApi<{ banks: Bank[] }>(url)
  const [editing, setEditing] = useState<Bank | null>(null)

  if (loading && !data) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <KpiCardSkeleton key={i} />
        ))}
      </div>
    )
  }

  const banks = data?.banks ?? []

  return (
    <div className="space-y-3">
      <div className="text-xs text-muted-foreground">
        Лимиты по банкам: дневные, месячные, на транзакцию, на пользователя (115-ФЗ — 300K ₽)
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        {banks.map((b) => (
          <BankLimitsCard key={b.id} bank={b} onEdit={setEditing} />
        ))}
      </div>
      {editing && (
        <LimitEditDialog
          bank={editing}
          limits={editing.limits}
          onClose={() => setEditing(null)}
          onSaved={onRefresh}
        />
      )}
    </div>
  )
}

// ─── Tab 5: Счета ────────────────────────────────────────────────────────────
function AccountsTab({ refreshKey, onRefresh }: { refreshKey: number; onRefresh: () => void }) {
  const mounted = useMounted()
  const url = refreshKey ? `/api/finance/banks?r=${refreshKey}` : '/api/finance/banks'
  const { data, loading } = useApi<{ banks: Bank[] }>(url)
  const [syncing, setSyncing] = useState<string | null>(null)

  const handleSync = async (bankId: string, accountNumber: string) => {
    setSyncing(accountNumber)
    try {
      await apiPost(`/api/finance/banks/${bankId}/accounts`, {})
      toast.success('Синхронизация запущена', { description: accountNumber })
      onRefresh()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Ошибка синхронизации')
    } finally {
      setSyncing(null)
    }
  }

  if (loading && !data) {
    return (
      <Card className="bg-card/60 p-4">
        <TableSkeleton rows={6} />
      </Card>
    )
  }

  const banks = data?.banks ?? []
  const accounts = banks.flatMap((b) =>
    (b.accounts ?? []).map((a) => ({ ...a, bankName: b.name }))
  )

  return (
    <div className="space-y-3">
      <div className="text-xs text-muted-foreground">
        Корреспондентские счета биржи в банках-партнёрах. Баланс обновляется через bank API.
      </div>
      <Card className="bg-card/60 backdrop-blur">
        <CardContent className="p-0">
          <ScrollArea className="max-h-[70vh]">
            <div className="px-4 pb-3">
              <div className="grid grid-cols-[1.2fr_1.4fr_0.5fr_1fr_1fr_0.8fr_0.6fr] gap-2 text-[10px] uppercase tracking-wider text-muted-foreground py-2 border-b border-border sticky top-0 bg-card/95 backdrop-blur z-10">
                <span>Банк</span>
                <span>Счёт</span>
                <span>Вал.</span>
                <span className="text-right">Баланс</span>
                <span className="text-right">Мин. остаток</span>
                <span className="text-right">Синхр.</span>
                <span className="text-right">·</span>
              </div>
              {accounts.map((a, i) => {
                const lowBalance = a.balance < a.minBalance
                return (
                  <motion.div
                    key={a.id}
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.22, delay: Math.min(i * 0.03, 0.4), ease: 'easeOut' }}
                    className={cn(
                      'grid grid-cols-[1.2fr_1.4fr_0.5fr_1fr_1fr_0.8fr_0.6fr] gap-2 items-center py-2 border-b border-border/40 text-xs',
                      lowBalance && 'bg-destructive/5'
                    )}
                  >
                    <span className="font-medium truncate flex items-center gap-1.5">
                      {lowBalance && <AlertCircle className="w-3 h-3 text-destructive shrink-0" />}
                      {a.bankName}
                    </span>
                    <span className="font-mono tabular-nums text-muted-foreground truncate">
                      {a.accountNumber}
                    </span>
                    <span>
                      <Badge variant="outline" className="text-[9px] px-1.5">
                        {a.currency}
                      </Badge>
                    </span>
                    <span
                      className={cn(
                        'text-right font-mono tabular-nums font-bold',
                        lowBalance ? 'text-destructive' : 'text-foreground'
                      )}
                    >
                      {formatPrice(a.balance, a.currency.toLowerCase() as 'rub' | 'usd')}
                    </span>
                    <span className="text-right font-mono tabular-nums text-muted-foreground">
                      {formatPrice(a.minBalance, a.currency.toLowerCase() as 'rub' | 'usd')}
                    </span>
                    <span className="text-right text-[10px] text-muted-foreground">
                      {mounted && a.lastSyncAt ? timeAgo(a.lastSyncAt) : '—'}
                    </span>
                    <span className="flex justify-end">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleSync(a.bankId, a.accountNumber)}
                        disabled={syncing === a.accountNumber}
                        className="h-7 text-[11px] gap-1 text-primary hover:bg-primary/10"
                      >
                        {syncing === a.accountNumber ? (
                          <RefreshCw className="w-3 h-3 animate-spin" />
                        ) : (
                          <RefreshCw className="w-3 h-3" />
                        )}
                        Синхр.
                      </Button>
                    </span>
                  </motion.div>
                )
              })}
              {accounts.length === 0 && (
                <div className="py-10 text-center text-sm text-muted-foreground">
                  Счета не подключены
                </div>
              )}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>

      <Card className="bg-card/40 border-dashed">
        <CardContent className="flex items-center gap-2 p-3 text-[11px] text-muted-foreground">
          <AlertCircle className="w-3.5 h-3.5 text-warning" />
          Строки с низким балансом (баланс &lt; мин. остаток) подсвечиваются красным.
          Синхронизация инициирует запрос к bank API.
        </CardContent>
      </Card>
    </div>
  )
}

// ─── Tab 6: Свёрка ───────────────────────────────────────────────────────────
function ReconciliationTab({
  refreshKey,
  onRefresh,
  banks,
}: {
  refreshKey: number
  onRefresh: () => void
  banks: Bank[]
}) {
  const mounted = useMounted()
  const url = refreshKey ? `/api/finance/reconciliation?r=${refreshKey}` : '/api/finance/reconciliation'
  const { data, loading } = useApi<{ reconciliations: Reconciliation[] }>(url)
  const [createOpen, setCreateOpen] = useState(false)
  const [selected, setSelected] = useState<Reconciliation | null>(null)
  const [createForm, setCreateForm] = useState({ bankId: '', period: new Date().toISOString().slice(0, 7) })
  const [creating, setCreating] = useState(false)
  const [resolving, setResolving] = useState(false)

  const handleCreate = async () => {
    if (!createForm.bankId || !createForm.period) {
      toast.error('Выберите банк и период')
      return
    }
    setCreating(true)
    try {
      await apiPost('/api/finance/reconciliation', createForm)
      toast.success('Свёрка создана', {
        description: `${createForm.period} • банк ${
          banks.find((b) => b.id === createForm.bankId)?.name ?? '—'
        }`,
      })
      setCreateOpen(false)
      onRefresh()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Ошибка')
    } finally {
      setCreating(false)
    }
  }

  const handleResolve = async (id: string) => {
    setResolving(true)
    try {
      await apiPatch(`/api/finance/reconciliation/${id}`, {
        status: 'MATCHED',
        notes: 'Расхождения разрешены вручную',
      })
      toast.success('Свёрка отмечена как сверённая')
      setSelected(null)
      onRefresh()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Ошибка')
    } finally {
      setResolving(false)
    }
  }

  if (loading && !data) {
    return (
      <Card className="bg-card/60 p-4">
        <TableSkeleton rows={5} />
      </Card>
    )
  }

  const reconciliations = data?.reconciliations ?? []

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="text-xs text-muted-foreground">
          Сверка внутренних транзакций с банковскими выписками ({reconciliations.length})
        </div>
        <Button
          size="sm"
          onClick={() => setCreateOpen(true)}
          className="gap-1.5 bg-primary text-primary-foreground hover:bg-primary/90 h-8"
        >
          <Plus className="w-3.5 h-3.5" />
          Новая свёрка
        </Button>
      </div>

      <Card className="bg-card/60 backdrop-blur">
        <CardContent className="p-0">
          <div className="px-4 pb-3">
            <div className="grid grid-cols-[1.4fr_0.7fr_1fr_1fr_1fr_0.7fr] gap-2 text-[10px] uppercase tracking-wider text-muted-foreground py-2 border-b border-border">
              <span>Банк</span>
              <span>Период</span>
              <span className="text-right">Совпало</span>
              <span className="text-right">Расхождения</span>
              <span className="text-right">Сумма расхожд.</span>
              <span className="text-right">Статус</span>
            </div>
            {reconciliations.map((r, i) => (
              <motion.button
                key={r.id}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.22, delay: Math.min(i * 0.03, 0.4), ease: 'easeOut' }}
                onClick={() => setSelected(r)}
                className="w-full text-left grid grid-cols-[1.4fr_0.7fr_1fr_1fr_1fr_0.7fr] gap-2 items-center py-2 border-b border-border/40 hover:bg-muted/30 transition text-xs"
              >
                <span className="font-medium truncate">{r.bank.name}</span>
                <span className="font-mono tabular-nums text-muted-foreground">{r.period}</span>
                <span className="text-right font-mono tabular-nums text-success">
                  {r.matchedCount} / {r.totalTransactions}
                </span>
                <span className="text-right font-mono tabular-nums text-destructive">
                  {r.unmatchedInternal + r.unmatchedBank}
                </span>
                <span className="text-right font-mono tabular-nums">
                  {r.discrepancyAmount > 0 ? formatPrice(r.discrepancyAmount, 'rub') : '—'}
                </span>
                <span className="flex justify-end">
                  <Badge
                    variant="outline"
                    className={cn('text-[9px] px-1.5', RECON_STATUS_COLOR[r.status])}
                  >
                    {RECON_STATUS_LABEL[r.status] ?? r.status}
                  </Badge>
                </span>
              </motion.button>
            ))}
            {reconciliations.length === 0 && (
              <div className="py-10 text-center text-sm text-muted-foreground">
                Сверки не найдены
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Create dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Scale className="w-4 h-4 text-primary" />
              Новая свёрка
            </DialogTitle>
            <DialogDescription>Выберите банк и период сверки</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label className="text-xs">Банк</Label>
              <Select value={createForm.bankId} onValueChange={(v) => setCreateForm({ ...createForm, bankId: v })}>
                <SelectTrigger className="h-9">
                  <SelectValue placeholder="Выберите банк" />
                </SelectTrigger>
                <SelectContent>
                  {banks.map((b) => (
                    <SelectItem key={b.id} value={b.id}>
                      {b.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Период (месяц)</Label>
              <Input
                type="month"
                value={createForm.period}
                onChange={(e) => setCreateForm({ ...createForm, period: e.target.value })}
                className="h-9 font-mono"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)} disabled={creating}>
              Отмена
            </Button>
            <Button
              onClick={handleCreate}
              disabled={creating}
              className="bg-primary text-primary-foreground hover:bg-primary/90 gap-1.5"
            >
              {creating ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
              Создать
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Detail dialog */}
      <Dialog open={!!selected} onOpenChange={(o) => !o && setSelected(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Scale className="w-4 h-4 text-primary" />
              Свёрка: {selected?.bank.name}
            </DialogTitle>
            <DialogDescription>
              Период {selected?.period}
            </DialogDescription>
          </DialogHeader>
          {selected && (
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="p-2 rounded-md bg-muted/30 border border-border">
                  <div className="text-[10px] uppercase text-muted-foreground">Всего транзакций</div>
                  <div className="font-mono tabular-nums font-bold">
                    {selected.totalTransactions}
                  </div>
                </div>
                <div className="p-2 rounded-md bg-success/10 border border-success/30">
                  <div className="text-[10px] uppercase text-muted-foreground">Совпало</div>
                  <div className="font-mono tabular-nums font-bold text-success">
                    {selected.matchedCount}
                  </div>
                </div>
                <div className="p-2 rounded-md bg-warning/10 border border-warning/30">
                  <div className="text-[10px] uppercase text-muted-foreground">Нет в выписке</div>
                  <div className="font-mono tabular-nums font-bold text-warning">
                    {selected.unmatchedInternal}
                  </div>
                </div>
                <div className="p-2 rounded-md bg-destructive/10 border border-destructive/30">
                  <div className="text-[10px] uppercase text-muted-foreground">Нет в системе</div>
                  <div className="font-mono tabular-nums font-bold text-destructive">
                    {selected.unmatchedBank}
                  </div>
                </div>
              </div>
              {selected.discrepancyAmount > 0 && (
                <div className="p-2 rounded-md bg-destructive/10 border border-destructive/30 text-xs">
                  <span className="text-muted-foreground">Сумма расхождений: </span>
                  <span className="font-mono tabular-nums font-bold text-destructive">
                    {formatPrice(selected.discrepancyAmount, 'rub')}
                  </span>
                </div>
              )}
              <div className="text-[11px] text-muted-foreground">
                Создано: {mounted ? fmtDate(selected.createdAt) : ''}
                {selected.resolvedAt && (
                  <> • Разрешено: {mounted ? fmtDate(selected.resolvedAt) : ''}</>
                )}
              </div>
            </div>
          )}
          <DialogFooter>
            {selected && selected.status !== 'MATCHED' && (
              <Button
                onClick={() => handleResolve(selected.id)}
                disabled={resolving}
                className="bg-primary text-primary-foreground hover:bg-primary/90 gap-1.5"
              >
                {resolving ? (
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <CheckCircle2 className="w-3.5 h-3.5" />
                )}
                Разрешить расхождения
              </Button>
            )}
            <Button variant="outline" onClick={() => setSelected(null)}>
              Закрыть
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

// ─── Tab 7: Коридоры ─────────────────────────────────────────────────────────
function CorridorEditDialog({
  corridor,
  banks,
  onClose,
  onSaved,
}: {
  corridor: Corridor
  banks: Bank[]
  onClose: () => void
  onSaved: () => void
}) {
  const [form, setForm] = useState({
    feePercent: corridor.feePercent,
    etaMin: corridor.etaMin,
    etaMax: corridor.etaMax,
    minAmount: corridor.minAmount,
    maxAmount: corridor.maxAmount,
    active: corridor.active,
    liquidityBridge: corridor.liquidityBridge ?? '',
    senderBankId: corridor.senderBankId ?? '',
  })
  const [saving, setSaving] = useState(false)

  const handleSave = async () => {
    setSaving(true)
    try {
      await apiPatch('/api/finance/corridors', {
        corridorId: corridor.corridorId,
        ...form,
        senderBankId: form.senderBankId || null,
      })
      toast.success('Коридор обновлён', { description: corridor.corridorId })
      onSaved()
      onClose()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Ошибка')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Globe2 className="w-4 h-4 text-primary" />
            Коридор {corridor.corridorId} {CORRIDOR_FLAG[corridor.corridorId]}
          </DialogTitle>
          <DialogDescription>Настройка параметров кросс-бордер перевода</DialogDescription>
        </DialogHeader>
        <div className="grid grid-cols-2 gap-3">
          <div className="col-span-2 space-y-1.5">
            <Label className="text-xs">Банк-отправитель</Label>
            <Select
              value={form.senderBankId}
              onValueChange={(v) => setForm({ ...form, senderBankId: v })}
            >
              <SelectTrigger className="h-9">
                <SelectValue placeholder="Не выбран" />
              </SelectTrigger>
              <SelectContent>
                {banks.map((b) => (
                  <SelectItem key={b.id} value={b.id}>
                    {b.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="col-span-2 space-y-1.5">
            <Label className="text-xs">Liquidity bridge</Label>
            <Input
              value={form.liquidityBridge}
              onChange={(e) => setForm({ ...form, liquidityBridge: e.target.value })}
              placeholder="Binance Pay (off-ramp CNY)"
              className="h-9"
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Комиссия (%)</Label>
            <Input
              type="number"
              step="0.1"
              value={form.feePercent}
              onChange={(e) => setForm({ ...form, feePercent: Number(e.target.value) })}
              className="h-9 font-mono"
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">ETA мин (мин)</Label>
            <Input
              type="number"
              value={form.etaMin}
              onChange={(e) => setForm({ ...form, etaMin: Number(e.target.value) })}
              className="h-9 font-mono"
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">ETA макс (мин)</Label>
            <Input
              type="number"
              value={form.etaMax}
              onChange={(e) => setForm({ ...form, etaMax: Number(e.target.value) })}
              className="h-9 font-mono"
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Мин. сумма (₽)</Label>
            <Input
              type="number"
              value={form.minAmount}
              onChange={(e) => setForm({ ...form, minAmount: Number(e.target.value) })}
              className="h-9 font-mono"
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Макс. сумма (₽)</Label>
            <Input
              type="number"
              value={form.maxAmount}
              onChange={(e) => setForm({ ...form, maxAmount: Number(e.target.value) })}
              className="h-9 font-mono"
            />
          </div>
          <div className="col-span-2 flex items-center justify-between p-2 rounded-md bg-muted/30 border border-border">
            <div className="text-xs">Коридор активен</div>
            <Switch
              checked={form.active}
              onCheckedChange={(v) => setForm({ ...form, active: v })}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={saving}>
            Отмена
          </Button>
          <Button
            onClick={handleSave}
            disabled={saving}
            className="bg-primary text-primary-foreground hover:bg-primary/90 gap-1.5"
          >
            {saving ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
            Сохранить
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function CorridorsTab({
  refreshKey,
  onRefresh,
  banks,
}: {
  refreshKey: number
  onRefresh: () => void
  banks: Bank[]
}) {
  const url = refreshKey ? `/api/finance/corridors?r=${refreshKey}` : '/api/finance/corridors'
  const { data, loading } = useApi<{ corridors: Corridor[] }>(url)
  const [editing, setEditing] = useState<Corridor | null>(null)
  const [toggling, setToggling] = useState<string | null>(null)

  const bankLookup = useMemo(() => {
    const m = new Map<string, Bank>()
    banks.forEach((b) => m.set(b.id, b))
    return m
  }, [banks])

  const handleToggle = async (c: Corridor) => {
    setToggling(c.corridorId)
    try {
      await apiPatch('/api/finance/corridors', {
        corridorId: c.corridorId,
        active: !c.active,
      })
      toast.success(c.active ? 'Коридор отключён' : 'Коридор включён', {
        description: c.corridorId,
      })
      onRefresh()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Ошибка')
    } finally {
      setToggling(null)
    }
  }

  if (loading && !data) {
    return (
      <Card className="bg-card/60 p-4">
        <TableSkeleton rows={5} />
      </Card>
    )
  }

  const corridors = data?.corridors ?? []

  return (
    <div className="space-y-3">
      <div className="text-xs text-muted-foreground">
        Настройка валютных коридоров через банки: банк-отправитель, liquidity bridge, комиссии, ETA
      </div>
      <Card className="bg-card/60 backdrop-blur">
        <CardContent className="p-0">
          <div className="px-4 pb-3">
            <div className="grid grid-cols-[0.7fr_1.2fr_1.3fr_0.7fr_0.8fr_1fr_0.6fr_0.5fr] gap-2 text-[10px] uppercase tracking-wider text-muted-foreground py-2 border-b border-border">
              <span>Коридор</span>
              <span>Банк-отправитель</span>
              <span>Liquidity bridge</span>
              <span className="text-right">Комиссия</span>
              <span className="text-right">ETA (мин)</span>
              <span className="text-right">Лимит (₽)</span>
              <span className="text-right">Активен</span>
              <span className="text-right">·</span>
            </div>
            {corridors.map((c, i) => {
              const sender = c.senderBankId ? bankLookup.get(c.senderBankId) : null
              return (
                <motion.div
                  key={c.id}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.22, delay: Math.min(i * 0.03, 0.4), ease: 'easeOut' }}
                  className="grid grid-cols-[0.7fr_1.2fr_1.3fr_0.7fr_0.8fr_1fr_0.6fr_0.5fr] gap-2 items-center py-2 border-b border-border/40 hover:bg-muted/30 transition text-xs"
                >
                  <span className="font-medium flex items-center gap-1">
                    {CORRIDOR_FLAG[c.corridorId] && <span>{CORRIDOR_FLAG[c.corridorId]}</span>}
                    {c.corridorId}
                  </span>
                  <span className="truncate text-muted-foreground">
                    {sender?.name ?? '—'}
                  </span>
                  <span className="truncate text-muted-foreground">
                    {c.liquidityBridge ?? '—'}
                  </span>
                  <span className="text-right font-mono tabular-nums text-primary">
                    {c.feePercent}%
                  </span>
                  <span className="text-right font-mono tabular-nums">
                    {c.etaMin}–{c.etaMax}
                  </span>
                  <span className="text-right font-mono tabular-nums text-[10px]">
                    {formatNumber(c.minAmount, 0)} – {formatNumber(c.maxAmount, 0)}
                  </span>
                  <span className="flex justify-end">
                    <button
                      onClick={() => handleToggle(c)}
                      disabled={toggling === c.corridorId}
                      className={cn(
                        'inline-flex items-center h-5 px-1.5 rounded-md text-[9px] font-medium border transition',
                        c.active
                          ? 'border-success/40 text-success bg-success/10'
                          : 'border-border text-muted-foreground bg-muted/30'
                      )}
                    >
                      {toggling === c.corridorId ? (
                        <RefreshCw className="w-2.5 h-2.5 animate-spin" />
                      ) : c.active ? (
                        'ON'
                      ) : (
                        'OFF'
                      )}
                    </button>
                  </span>
                  <span className="flex justify-end">
                    <button
                      onClick={() => setEditing(c)}
                      className="text-muted-foreground hover:text-primary p-0.5"
                    >
                      <Pencil className="w-3 h-3" />
                    </button>
                  </span>
                </motion.div>
              )
            })}
            {corridors.length === 0 && (
              <div className="py-10 text-center text-sm text-muted-foreground">
                Коридоры не настроены
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {editing && (
        <CorridorEditDialog
          corridor={editing}
          banks={banks}
          onClose={() => setEditing(null)}
          onSaved={onRefresh}
        />
      )}
    </div>
  )
}

// ─── Tab 8: Отчёты ───────────────────────────────────────────────────────────
function downloadCsv(filename: string, rows: string[][]) {
  const csv = rows
    .map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(','))
    .join('\n')
  const blob = new Blob([`\uFEFF${csv}`], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

function ReportsTab() {
  const mounted = useMounted()
  const [period, setPeriod] = useState(new Date().toISOString().slice(0, 7))
  const [reportType, setReportType] = useState<'threshold' | 'bank-volumes' | 'compliance'>('threshold')
  const [report, setReport] = useState<ReportData | null>(null)
  const [loading, setLoading] = useState(false)

  const handleGenerate = async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/finance/reports?type=${reportType}&period=${period}`)
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const json = (await res.json()) as ReportData
      setReport(json)
      toast.success('Отчёт сформирован', {
        description: `${json.title} • ${json.count} записей`,
      })
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Ошибка формирования отчёта')
    } finally {
      setLoading(false)
    }
  }

  const handleExport = () => {
    if (!report) return
    if (report.type === 'threshold' && report.transactions) {
      const rows: string[][] = [
        ['ID', 'Тип', 'Сумма', 'Валюта', 'Комиссия', 'Статус', 'Bank Ref', 'Банк', 'Дата'],
        ...report.transactions.map((t) => [
          t.id,
          t.type,
          String(t.amount),
          t.currency,
          String(t.fee),
          t.status,
          t.bankReference ?? '',
          t.bank.name,
          t.createdAt,
        ]),
      ]
      downloadCsv(`threshold-ops-${period}.csv`, rows)
    } else if (report.type === 'bank-volumes' && report.banks) {
      const rows: string[][] = [
        ['Банк', 'BIC', 'Оборот', 'Комиссии', 'Транзакций', 'Пороговых'],
        ...report.banks.map((b) => [
          b.bankName,
          b.bic,
          String(b.volume),
          String(b.fees),
          String(b.txCount),
          String(b.thresholdCount),
        ]),
      ]
      downloadCsv(`bank-volumes-${period}.csv`, rows)
    } else {
      downloadCsv(`report-${report.type}-${period}.csv`, [['Report', report.title]])
    }
    toast.success('CSV экспортирован')
  }

  const reportCards = [
    {
      type: 'threshold' as const,
      title: 'Пороговые операции (>600K ₽)',
      desc: 'Транзакции свыше 600 000 ₽ — требование 115-ФЗ',
      icon: AlertTriangle,
      tone: 'bg-warning/15 text-warning',
    },
    {
      type: 'bank-volumes' as const,
      title: 'Оборот по банкам',
      desc: 'Сводный оборот, комиссии, кол-во транзакций по каждому банку',
      icon: Landmark,
      tone: 'bg-primary/15 text-primary',
    },
    {
      type: 'compliance' as const,
      title: 'Комплаенс-выгрузка',
      desc: 'Сводка для ЦБ РФ / Росфинмониторинга',
      icon: FileText,
      tone: 'bg-success/15 text-success',
    },
  ]

  return (
    <div className="space-y-3">
      <div className="text-xs text-muted-foreground">
        Регуляторные отчёты для ЦБ РФ и Росфинмониторинга. Выберите тип и период, сформируйте и экспортируйте в CSV.
      </div>

      {/* Report cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {reportCards.map((c) => {
          const active = reportType === c.type
          return (
            <button
              key={c.type}
              onClick={() => setReportType(c.type)}
              className={cn(
                'text-left p-3 rounded-xl border transition',
                active
                  ? 'border-primary/50 bg-primary/5'
                  : 'border-border bg-card/60 hover:border-primary/30'
              )}
            >
              <div className="flex items-start gap-2 mb-2">
                <div className={cn('w-8 h-8 rounded-lg flex items-center justify-center', c.tone)}>
                  <c.icon className="w-4 h-4" />
                </div>
                {active && (
                  <CheckCircle2 className="w-4 h-4 text-primary ml-auto" />
                )}
              </div>
              <div className="font-medium text-sm mb-0.5">{c.title}</div>
              <div className="text-[11px] text-muted-foreground leading-snug">{c.desc}</div>
            </button>
          )
        })}
      </div>

      {/* Period + actions */}
      <Card className="bg-card/60 backdrop-blur">
        <CardContent className="flex flex-col sm:flex-row items-stretch sm:items-end gap-3 p-3">
          <div className="space-y-1.5">
            <Label className="text-xs">Период (месяц)</Label>
            <Input
              type="month"
              value={period}
              onChange={(e) => setPeriod(e.target.value)}
              className="h-9 font-mono w-44"
            />
          </div>
          <div className="flex-1" />
          <Button
            variant="outline"
            size="sm"
            onClick={handleExport}
            disabled={!report}
            className="h-9 gap-1.5"
          >
            <Download className="w-3.5 h-3.5" />
            Экспорт CSV
          </Button>
          <Button
            size="sm"
            onClick={handleGenerate}
            disabled={loading}
            className="bg-primary text-primary-foreground hover:bg-primary/90 h-9 gap-1.5"
          >
            {loading ? (
              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <FileText className="w-3.5 h-3.5" />
            )}
            Сформировать
          </Button>
        </CardContent>
      </Card>

      {/* Results */}
      {report && (
        <Card className="bg-card/60 backdrop-blur">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base flex items-center gap-2">
                <FileText className="w-4 h-4 text-primary" />
                {report.title}
              </CardTitle>
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="text-[10px]">
                  {report.count} записей
                </Badge>
                {report.totalAmount && (
                  <Badge variant="outline" className="text-[10px] border-primary/40 text-primary">
                    {formatPrice(report.totalAmount, 'rub')}
                  </Badge>
                )}
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {report.type === 'threshold' && report.transactions && (
              <ScrollArea className="max-h-96">
                <div className="px-4 pb-3">
                  <div className="grid grid-cols-[1fr_1fr_1fr_1fr_1.2fr_1fr] gap-2 text-[10px] uppercase tracking-wider text-muted-foreground py-2 border-b border-border sticky top-0 bg-card/95 backdrop-blur z-10">
                    <span>Тип</span>
                    <span className="text-right">Сумма</span>
                    <span className="text-right">Комиссия</span>
                    <span>Статус</span>
                    <span>Bank Ref</span>
                    <span className="text-right">Дата</span>
                  </div>
                  {report.transactions.slice(0, 100).map((t, i) => (
                    <motion.div
                      key={t.id}
                      initial={{ opacity: 0, y: 6 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.22, delay: Math.min(i * 0.02, 0.4), ease: 'easeOut' }}
                      className="grid grid-cols-[1fr_1fr_1fr_1fr_1.2fr_1fr] gap-2 items-center py-2 border-b border-border/40 text-xs"
                    >
                      <span>
                        <Badge variant="outline" className="text-[9px] px-1.5">
                          {t.type}
                        </Badge>
                      </span>
                      <span className="text-right font-mono tabular-nums text-primary">
                        {formatPrice(t.amount, 'rub')}
                      </span>
                      <span className="text-right font-mono tabular-nums text-muted-foreground">
                        {formatPrice(t.fee, 'rub')}
                      </span>
                      <span className="truncate text-[10px]">{t.status}</span>
                      <span className="font-mono tabular-nums text-[10px] text-muted-foreground truncate">
                        {t.bankReference ?? '—'}
                      </span>
                      <span className="text-right text-[10px] text-muted-foreground">
                        {mounted ? fmtDate(t.createdAt) : ''}
                      </span>
                    </motion.div>
                  ))}
                  {report.transactions.length > 100 && (
                    <div className="py-2 text-center text-[10px] text-muted-foreground">
                      Показано 100 из {report.transactions.length}. Полный список — в CSV-экспорте.
                    </div>
                  )}
                </div>
              </ScrollArea>
            )}

            {report.type === 'bank-volumes' && report.banks && (
              <div className="px-4 pb-3">
                <div className="grid grid-cols-[1.5fr_1fr_1fr_1fr_0.7fr_0.7fr] gap-2 text-[10px] uppercase tracking-wider text-muted-foreground py-2 border-b border-border">
                  <span>Банк</span>
                  <span className="text-right">Оборот</span>
                  <span className="text-right">Комиссии</span>
                  <span className="text-right">Транзакций</span>
                  <span className="text-right">Пороговых</span>
                  <span className="text-right">BIC</span>
                </div>
                {report.banks.map((b, i) => (
                  <motion.div
                    key={b.bic + i}
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.22, delay: Math.min(i * 0.04, 0.4), ease: 'easeOut' }}
                    className="grid grid-cols-[1.5fr_1fr_1fr_1fr_0.7fr_0.7fr] gap-2 items-center py-2 border-b border-border/40 text-xs"
                  >
                    <span className="font-medium truncate">{b.bankName}</span>
                    <span className="text-right font-mono tabular-nums text-primary">
                      {formatPrice(b.volume, 'rub')}
                    </span>
                    <span className="text-right font-mono tabular-nums text-success">
                      {formatPrice(b.fees, 'rub')}
                    </span>
                    <span className="text-right font-mono tabular-nums">{b.txCount}</span>
                    <span className="text-right font-mono tabular-nums text-warning">
                      {b.thresholdCount}
                    </span>
                    <span className="text-right font-mono tabular-nums text-[10px] text-muted-foreground">
                      {b.bic}
                    </span>
                  </motion.div>
                ))}
              </div>
            )}

            {report.type === 'compliance' && (
              <div className="p-4 text-sm text-muted-foreground">
                <div className="font-medium text-foreground mb-1">{report.title}</div>
                <div className="text-xs">
                  Всего записей: {report.count}. Сформируйте CSV-экспорт для отправки в Росфинмониторинг.
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  )
}

// ─── Tab 9: Вебхуки ──────────────────────────────────────────────────────────
function WebhooksTab({ refreshKey }: { refreshKey: number }) {
  const mounted = useMounted()
  const url = refreshKey ? `/api/finance/webhooks?r=${refreshKey}` : '/api/finance/webhooks'
  const { data, loading } = useApi<{ webhooks: WebhookLog[] }>(url)
  const [expanded, setExpanded] = useState<string | null>(null)

  if (loading && !data) {
    return (
      <Card className="bg-card/60 p-4">
        <TableSkeleton rows={6} />
      </Card>
    )
  }

  const webhooks = data?.webhooks ?? []

  return (
    <div className="space-y-3">
      <Card className="bg-card/40 border-dashed">
        <CardContent className="flex items-center gap-2 p-3 text-[11px] text-muted-foreground">
          <Webhook className="w-3.5 h-3.5 text-primary" />
          Вебхуки от банков автоматически обновляют статусы транзакций. Логи последних 50 событий.
        </CardContent>
      </Card>

      <Card className="bg-card/60 backdrop-blur">
        <CardContent className="p-0">
          <ScrollArea className="max-h-[70vh]">
            <div className="px-4 pb-3">
              <div className="grid grid-cols-[1.2fr_1.2fr_2fr_0.6fr_0.8fr] gap-2 text-[10px] uppercase tracking-wider text-muted-foreground py-2 border-b border-border sticky top-0 bg-card/95 backdrop-blur z-10">
                <span>Банк</span>
                <span>Событие</span>
                <span>Payload</span>
                <span className="text-right">Статус</span>
                <span className="text-right">Время</span>
              </div>
              {webhooks.map((w, i) => (
                <motion.div
                  key={w.id}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.22, delay: Math.min(i * 0.02, 0.4), ease: 'easeOut' }}
                  className="grid grid-cols-[1.2fr_1.2fr_2fr_0.6fr_0.8fr] gap-2 items-center py-2 border-b border-border/40 hover:bg-muted/30 transition text-xs"
                >
                  <span className="font-medium truncate">{w.bank.name}</span>
                  <span>
                    <Badge variant="outline" className="text-[9px] px-1.5 border-primary/40 text-primary bg-primary/10">
                      {w.eventType}
                    </Badge>
                  </span>
                  <button
                    onClick={() => setExpanded(expanded === w.id ? null : w.id)}
                    className="text-left text-[10px] font-mono text-muted-foreground truncate flex items-center gap-1 hover:text-foreground"
                  >
                    {expanded === w.id ? (
                      <ChevronDown className="w-3 h-3 shrink-0" />
                    ) : (
                      <ChevronRight className="w-3 h-3 shrink-0" />
                    )}
                    <span className={cn('truncate', expanded === w.id && 'break-all whitespace-pre-wrap')}>
                      {w.payload.slice(0, expanded === w.id ? 500 : 60)}
                      {expanded !== w.id && w.payload.length > 60 && '…'}
                    </span>
                  </button>
                  <span className="flex justify-end">
                    <Badge
                      variant="outline"
                      className={cn('text-[9px] px-1.5', WEBHOOK_STATUS_COLOR[w.status])}
                    >
                      {w.status}
                    </Badge>
                  </span>
                  <span className="text-right text-[10px] text-muted-foreground">
                    {mounted ? timeAgo(w.createdAt) : ''}
                  </span>
                </motion.div>
              ))}
              {webhooks.length === 0 && (
                <div className="py-10 text-center text-sm text-muted-foreground">
                  Вебхуки не зарегистрированы
                </div>
              )}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  )
}

// ─── Main View ───────────────────────────────────────────────────────────────
export function FinanceView() {
  const { t } = useI18n()
  const enabledModules = useAppStore((s) => s.enabledModules)
  const [refreshKey, setRefreshKey] = useState(0)
  const [tab, setTab] = useState('dashboard')

  // Banks are needed by multiple tabs — fetch once at the parent level for Reconciliation/Corridors lookups
  const banksUrl = refreshKey ? `/api/finance/banks?r=${refreshKey}` : '/api/finance/banks'
  const { data: banksData } = useApi<{ banks: Bank[] }>(banksUrl)
  const banks = banksData?.banks ?? []

  const handleRefresh = () => setRefreshKey((k) => k + 1)

  return (
    <div className="flex-1 py-4">
      <div className="max-w-[1600px] mx-auto px-3 lg:px-5 space-y-4">
        {/* Header */}
        <header className="flex flex-col lg:flex-row lg:items-end justify-between gap-3">
          <div>
            <div className="flex items-center gap-2 mb-1.5 flex-wrap">
              <Badge variant="outline" className="border-primary/40 text-primary gap-1.5">
                <Lock className="w-3 h-3" />
                FINANCE CONSOLE
              </Badge>
              <Badge variant="outline" className="text-[10px] text-muted-foreground">
                {t('finance.subtitle')}
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
              <Landmark className="w-7 h-7 text-primary" />
              {t('finance.title')}
            </h1>
            <p className="text-xs text-muted-foreground mt-1.5 flex items-center gap-1.5">
              <Database className="w-3.5 h-3.5 text-success" />
              Управление банками-партнёрами, комиссиями, лимитами, сверкой и регуляторными отчётами
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            className="gap-2 border-primary/30 text-primary hover:bg-primary/10 shrink-0"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            Обновить
          </Button>
        </header>

        {/* Tabs */}
        <Tabs value={tab} onValueChange={setTab} className="w-full">
          <ScrollArea className="w-full">
            <TabsList className="h-9 bg-muted/60 p-1 inline-flex w-max">
              <TabsTrigger value="dashboard" className="gap-1.5 text-xs">
                <Activity className="w-3.5 h-3.5" />
                {t('finance.tab.dashboard')}
              </TabsTrigger>
              <TabsTrigger value="banks" className="gap-1.5 text-xs">
                <Landmark className="w-3.5 h-3.5" />
                {t('finance.tab.banks')}
              </TabsTrigger>
              <TabsTrigger value="fees" className="gap-1.5 text-xs">
                <Receipt className="w-3.5 h-3.5" />
                {t('finance.tab.fees')}
              </TabsTrigger>
              <TabsTrigger value="limits" className="gap-1.5 text-xs">
                <Banknote className="w-3.5 h-3.5" />
                {t('finance.tab.limits')}
              </TabsTrigger>
              <TabsTrigger value="accounts" className="gap-1.5 text-xs">
                <Wallet className="w-3.5 h-3.5" />
                {t('finance.tab.accounts')}
              </TabsTrigger>
              <TabsTrigger value="reconciliation" className="gap-1.5 text-xs">
                <Scale className="w-3.5 h-3.5" />
                {t('finance.tab.reconciliation')}
              </TabsTrigger>
              {enabledModules.crossBorder && (
                <TabsTrigger value="corridors" className="gap-1.5 text-xs">
                  <Globe2 className="w-3.5 h-3.5" />
                  {t('finance.tab.corridors')}
                </TabsTrigger>
              )}
              <TabsTrigger value="reports" className="gap-1.5 text-xs">
                <FileText className="w-3.5 h-3.5" />
                {t('finance.tab.reports')}
              </TabsTrigger>
              <TabsTrigger value="webhooks" className="gap-1.5 text-xs">
                <Webhook className="w-3.5 h-3.5" />
                {t('finance.tab.webhooks')}
              </TabsTrigger>
            </TabsList>
          </ScrollArea>

          <TabsContent value="dashboard" className="mt-4">
            <DashboardTab refreshKey={refreshKey} />
          </TabsContent>
          <TabsContent value="banks" className="mt-4">
            <BanksTab refreshKey={refreshKey} onRefresh={handleRefresh} />
          </TabsContent>
          <TabsContent value="fees" className="mt-4">
            <FeesTab refreshKey={refreshKey} onRefresh={handleRefresh} />
          </TabsContent>
          <TabsContent value="limits" className="mt-4">
            <LimitsTab refreshKey={refreshKey} onRefresh={handleRefresh} />
          </TabsContent>
          <TabsContent value="accounts" className="mt-4">
            <AccountsTab refreshKey={refreshKey} onRefresh={handleRefresh} />
          </TabsContent>
          <TabsContent value="reconciliation" className="mt-4">
            <ReconciliationTab
              refreshKey={refreshKey}
              onRefresh={handleRefresh}
              banks={banks}
            />
          </TabsContent>
          {enabledModules.crossBorder && (
            <TabsContent value="corridors" className="mt-4">
              <CorridorsTab
                refreshKey={refreshKey}
                onRefresh={handleRefresh}
                banks={banks}
              />
            </TabsContent>
          )}
          <TabsContent value="reports" className="mt-4">
            <ReportsTab />
          </TabsContent>
          <TabsContent value="webhooks" className="mt-4">
            <WebhooksTab refreshKey={refreshKey} />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}
