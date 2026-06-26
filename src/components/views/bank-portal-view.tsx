'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import {
  Building2, CircleDollarSign, Receipt, Activity, AlertTriangle,
  TrendingUp, ArrowUpRight, ArrowDownRight, RefreshCw, Database,
  Settings, FileText, Scale, Eye, Power,
} from 'lucide-react'
import {
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
  XAxis, YAxis, Tooltip, CartesianGrid, ResponsiveContainer,
} from 'recharts'
import { useAppStore } from '@/lib/store'
import { useApi, apiPost } from '@/lib/use-api'
import { useMounted } from '@/lib/use-mounted'
import { formatPrice, formatNumber, formatPercent, timeAgo } from '@/lib/format'
import { cn } from '@/lib/utils'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { Separator } from '@/components/ui/separator'
import { KpiCardSkeleton, TableSkeleton } from '@/components/page-skeleton'
import { toast } from 'sonner'

// ─── Types ──────────────────────────────────────────────────────────────────
interface BankPortalData {
  bank: { id: string; name: string; bic: string; type: string; status: string; cryptoProtocol: string; apiProtocol: string; isSandbox: boolean }
  period: string
  kpi: { totalVolume: number; totalFees: number; txCount: number; thresholdOps: number; dailyUsagePct: number }
  byType: { type: string; count: number; volume: number; fees: number }[]
  series: { date: string; volume: number; fees: number }[]
  limits: any
  accounts: any[]
  fees: any[]
}

interface TxData {
  transactions: any[]
  total: number
  page: number
  limit: number
}

const TYPE_COLORS: Record<string, string> = {
  DEPOSIT: '#22c55e', WITHDRAW: '#ef4444', CROSS_BORDER: '#F0B90B', SBP: '#38bdf8',
}
const TYPE_LABELS: Record<string, string> = {
  DEPOSIT: 'Пополнение', WITHDRAW: 'Вывод', CROSS_BORDER: 'Кросс-бордер', SBP: 'СБП',
}

const PERIODS = [
  { id: '1h', label: '1ч' }, { id: '24h', label: '24ч' }, { id: '7d', label: '7д' }, { id: '30d', label: '30д' },
] as const

const tooltipStyle = { background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 8, fontSize: 12, color: 'var(--foreground)' }

// ─── Dashboard Tab ──────────────────────────────────────────────────────────
function DashboardTab({ bankId }: { bankId: string }) {
  const [period, setPeriod] = useState<'1h' | '24h' | '7d' | '30d'>('24h')
  const url = `/api/bank-portal/dashboard?bankId=${bankId}&period=${period}`
  const { data, loading } = useApi<BankPortalData>(url, { refresh: 30000 })

  if (loading && !data) {
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">{Array.from({length:4}).map((_,i)=><KpiCardSkeleton key={i} />)}</div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3"><Card className="h-[300px]" /><Card className="h-[300px]" /></div>
      </div>
    )
  }
  if (!data) return <div className="py-10 text-center text-sm text-muted-foreground">Нет данных</div>

  const { kpi, byType, series, bank, limits, dailyUsagePct: _ } = data
  const barData = byType.map((b) => ({ name: TYPE_LABELS[b.type] || b.type, volume: Math.round(b.volume / 1_000_000), fees: Math.round(b.fees / 1000) }))
  const lineData = series.map((s) => ({ date: s.date, volume: Math.round(s.volume / 1_000_000), fees: Math.round(s.fees / 1000) }))
  const usagePct = data.kpi.dailyUsagePct

  return (
    <div className="space-y-4">
      {/* Period filter */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex gap-1 bg-muted/60 p-1 rounded-xl">
          {PERIODS.map((p) => (
            <button key={p.id} onClick={() => setPeriod(p.id)}
              className={cn('px-4 py-1.5 rounded-lg text-sm font-semibold transition', period === p.id ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground')}>
              {p.label}
            </button>
          ))}
        </div>
        <div className="text-xs text-muted-foreground">
          {bank.name} • {bank.bic} • {bank.apiProtocol} • {bank.cryptoProtocol === 'GOST_TLS_1_3' ? 'ГОСТ TLS' : 'Standard TLS'}
        </div>
      </div>

      {/* KPI */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card className="p-4"><div className="text-xs text-muted-foreground">Оборот</div><div className="text-xl font-bold font-mono tabular-nums mt-1">{formatPrice(kpi.totalVolume, 'rub')}</div><div className="text-xs text-muted-foreground mt-0.5">{kpi.txCount} транз.</div></Card>
        <Card className="p-4"><div className="text-xs text-muted-foreground">Комиссии</div><div className="text-xl font-bold font-mono tabular-nums mt-1 text-success">{formatPrice(kpi.totalFees, 'rub')}</div><div className="text-xs text-muted-foreground mt-0.5">доход</div></Card>
        <Card className="p-4"><div className="text-xs text-muted-foreground">Пороговые (&gt;600K)</div><div className="text-xl font-bold font-mono tabular-nums mt-1 text-destructive">{kpi.thresholdOps}</div><div className="text-xs text-muted-foreground mt-0.5">115-ФЗ</div></Card>
        <Card className="p-4"><div className="text-xs text-muted-foreground">Исп. дневн. лимита</div><div className="text-xl font-bold font-mono tabular-nums mt-1">{usagePct.toFixed(1)}%</div>
          <div className="mt-1 h-1.5 rounded-full bg-muted overflow-hidden"><div className={cn('h-full rounded-full', usagePct > 80 ? 'bg-destructive' : usagePct > 50 ? 'bg-warning' : 'bg-success')} style={{ width: `${Math.min(usagePct, 100)}%` }} /></div>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
        <Card className="p-4">
          <h3 className="font-semibold text-sm mb-3">Объём по типам операций</h3>
          <div className="h-[240px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={barData}><CartesianGrid strokeDasharray="3 3" stroke="var(--border)" strokeOpacity={0.3} vertical={false} /><XAxis dataKey="name" stroke="var(--muted-foreground)" fontSize={11} tickLine={false} axisLine={false} /><YAxis stroke="var(--muted-foreground)" fontSize={11} tickLine={false} axisLine={false} tickFormatter={(v) => `${v}M`} /><Tooltip contentStyle={tooltipStyle} /><Bar dataKey="volume" fill="#F0B90B" radius={[4,4,0,0]} maxBarSize={40} /></BarChart>
            </ResponsiveContainer>
          </div>
        </Card>
        <Card className="p-4">
          <h3 className="font-semibold text-sm mb-3">Динамика оборота</h3>
          <div className="h-[240px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={lineData}><CartesianGrid strokeDasharray="3 3" stroke="var(--border)" strokeOpacity={0.3} vertical={false} /><XAxis dataKey="date" stroke="var(--muted-foreground)" fontSize={11} tickLine={false} axisLine={false} /><YAxis stroke="var(--muted-foreground)" fontSize={11} tickLine={false} axisLine={false} tickFormatter={(v) => `${v}M`} /><Tooltip contentStyle={tooltipStyle} /><Line type="monotone" dataKey="volume" stroke="#F0B90B" strokeWidth={2} dot={false} /></LineChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>

      {/* Breakdown by type */}
      <Card className="p-4">
        <h3 className="font-semibold text-sm mb-3">Детализация по типам</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {byType.map((b) => (
            <div key={b.type} className="rounded-xl border border-border p-3">
              <div className="flex items-center gap-2 mb-2"><span className="w-2.5 h-2.5 rounded-full" style={{ background: TYPE_COLORS[b.type] }} /><span className="text-xs font-medium">{TYPE_LABELS[b.type] || b.type}</span></div>
              <div className="text-sm font-mono font-bold">{formatPrice(b.volume, 'rub')}</div>
              <div className="text-xs text-muted-foreground mt-0.5">{b.count} транз. • {formatPrice(b.fees, 'rub')}</div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  )
}

// ─── Transactions Tab ───────────────────────────────────────────────────────
function TransactionsTab({ bankId }: { bankId: string }) {
  const [period, setPeriod] = useState<'24h' | '7d' | '30d'>('24h')
  const [page, setPage] = useState(1)
  const url = `/api/bank-portal/transactions?bankId=${bankId}&period=${period}&page=${page}&limit=50`
  const { data, loading } = useApi<TxData>(url)

  if (loading && !data) return <Card className="p-4"><TableSkeleton rows={8} /></Card>
  if (!data) return <div className="py-10 text-center text-sm text-muted-foreground">Нет данных</div>

  return (
    <div className="space-y-3">
      <div className="flex gap-1 bg-muted/60 p-1 rounded-xl w-fit">
        {(['24h','7d','30d'] as const).map((p) => (
          <button key={p} onClick={() => { setPeriod(p); setPage(1) }} className={cn('px-4 py-1.5 rounded-lg text-sm font-semibold transition', period === p ? 'bg-primary text-primary-foreground' : 'text-muted-foreground')}>{p === '24h' ? '24ч' : p === '7d' ? '7д' : '30д'}</button>
        ))}
      </div>
      <Card className="p-0 overflow-hidden">
        <div className="overflow-x-auto scrollbar-thin">
          <table className="w-full text-xs">
            <thead className="bg-muted/40 text-muted-foreground">
              <tr>
                <th className="text-left p-2.5 font-medium">Тип</th>
                <th className="text-right p-2.5 font-medium">Сумма</th>
                <th className="text-right p-2.5 font-medium">Комиссия</th>
                <th className="text-left p-2.5 font-medium">Плательщик</th>
                <th className="text-left p-2.5 font-medium">Статус</th>
                <th className="text-left p-2.5 font-medium">Пороговая</th>
                <th className="text-left p-2.5 font-medium">Дата</th>
              </tr>
            </thead>
            <tbody>
              {data.transactions.map((t, i) => (
                <tr key={t.id} className={cn('border-t border-border/50', i % 2 === 1 && 'bg-muted/10')}>
                  <td className="p-2.5"><span className="px-1.5 py-0.5 rounded text-[10px] font-medium" style={{ background: `${TYPE_COLORS[t.type]}20`, color: TYPE_COLORS[t.type] }}>{TYPE_LABELS[t.type] || t.type}</span></td>
                  <td className="text-right p-2.5 font-mono tabular-nums">{formatNumber(t.amount, 0)} ₽</td>
                  <td className="text-right p-2.5 font-mono tabular-nums text-muted-foreground">{formatNumber(t.fee, 0)} ₽</td>
                  <td className="p-2.5"><span className={cn('text-[10px]', t.feePayer === 'USER' ? 'text-foreground' : 'text-primary')}>{t.feePayer === 'USER' ? 'Пользователь' : 'Биржа'}</span></td>
                  <td className="p-2.5"><span className={cn('text-[10px] font-medium', t.status === 'COMPLETED' ? 'text-success' : t.status === 'SUSPENDED_BY_BANK' ? 'text-destructive' : 'text-warning')}>{t.status === 'COMPLETED' ? 'Завершена' : t.status === 'SUSPENDED_BY_BANK' ? 'Приостановлена' : t.status === 'PENDING' ? 'В ожидании' : 'Ошибка'}</span></td>
                  <td className="p-2.5">{t.isThreshold ? <span className="text-[10px] text-destructive font-medium">Да</span> : <span className="text-[10px] text-muted-foreground">—</span>}</td>
                  <td className="p-2.5 text-muted-foreground whitespace-nowrap">{new Date(t.createdAt).toLocaleString('ru-RU', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
      <div className="flex items-center justify-between">
        <span className="text-xs text-muted-foreground">Всего: {data.total} • Страница {data.page}</span>
        <div className="flex gap-2">
          <Button size="sm" variant="outline" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>Назад</Button>
          <Button size="sm" variant="outline" disabled={data.transactions.length < data.limit} onClick={() => setPage(p => p + 1)}>Далее</Button>
        </div>
      </div>
    </div>
  )
}

// ─── Settings Tab (read-only) ───────────────────────────────────────────────
function SettingsTab({ bankId }: { bankId: string }) {
  const { data, loading } = useApi<{ bank: any }>(`/api/bank-portal/settings?bankId=${bankId}`)
  if (loading && !data) return <Card className="p-4"><div className="animate-pulse h-40 bg-muted/40 rounded" /></Card>
  if (!data) return <div className="py-10 text-center text-sm text-muted-foreground">Нет данных</div>
  const { bank } = data

  return (
    <div className="space-y-3">
      <Card className="p-4">
        <div className="flex items-center gap-2 mb-4"><Settings className="w-4 h-4 text-primary" /><h3 className="font-semibold text-sm">Реквизиты банка</h3><Badge variant="outline" className="ml-auto text-[10px]"><Eye className="w-3 h-3 mr-1" /> Только просмотр</Badge></div>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3 text-sm">
          <div><div className="text-xs text-muted-foreground">Название</div><div className="font-medium">{bank.name}</div></div>
          <div><div className="text-xs text-muted-foreground">БИК</div><div className="font-mono">{bank.bic}</div></div>
          <div><div className="text-xs text-muted-foreground">SWIFT</div><div className="font-mono">{bank.swift || '—'}</div></div>
          <div><div className="text-xs text-muted-foreground">Корр. счёт</div><div className="font-mono text-xs">{bank.correspondentAccount || '—'}</div></div>
          <div><div className="text-xs text-muted-foreground">Тип</div><div className="font-medium">{bank.type}</div></div>
          <div><div className="text-xs text-muted-foreground">Статус</div><span className={cn('text-xs font-medium', bank.status === 'ACTIVE' ? 'text-success' : 'text-muted-foreground')}>{bank.status === 'ACTIVE' ? 'Активен' : bank.status}</span></div>
          <div><div className="text-xs text-muted-foreground">Протокол API</div><div className="font-mono text-xs">{bank.apiProtocol}</div></div>
          <div><div className="text-xs text-muted-foreground">Шифрование</div><div className="font-mono text-xs">{bank.cryptoProtocol === 'GOST_TLS_1_3' ? 'ГОСТ TLS 1.3' : 'Standard TLS'}</div></div>
          <div><div className="text-xs text-muted-foreground">Sandbox</div><span className="text-xs">{bank.isSandbox ? 'Да' : 'Нет'}</span></div>
        </div>
      </Card>

      <Card className="p-4">
        <h3 className="font-semibold text-sm mb-3">Комиссии</h3>
        <div className="space-y-2">
          {bank.fees.map((f: any) => (
            <div key={f.id} className="flex items-center justify-between p-2 rounded-lg bg-muted/20 text-sm">
              <span className="font-medium">{TYPE_LABELS[f.operationType] || f.operationType}</span>
              <div className="text-right">
                <span className="font-mono">{f.feeType === 'PERCENT' ? `${f.feePercent}%` : f.feeType === 'FIXED' ? `${f.feeFixed} ₽` : `${f.feePercent}% + ${f.feeFixed} ₽`}</span>
                <span className="text-xs text-muted-foreground ml-2">({f.payer === 'USER' ? 'пользователь' : 'биржа'})</span>
              </div>
            </div>
          ))}
        </div>
      </Card>

      <Card className="p-4">
        <h3 className="font-semibold text-sm mb-3">Лимиты</h3>
        {bank.limits ? (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
            <div><div className="text-xs text-muted-foreground">Дневной</div><div className="font-mono font-medium">{formatPrice(bank.limits.dailyLimit, 'rub')}</div></div>
            <div><div className="text-xs text-muted-foreground">Месячный</div><div className="font-mono font-medium">{formatPrice(bank.limits.monthlyLimit, 'rub')}</div></div>
            <div><div className="text-xs text-muted-foreground">На транзакцию</div><div className="font-mono font-medium">{formatPrice(bank.limits.perTransactionLimit, 'rub')}</div></div>
            <div><div className="text-xs text-muted-foreground">На польз./день</div><div className="font-mono font-medium">{formatPrice(bank.limits.perUserDailyLimit, 'rub')}</div></div>
          </div>
        ) : <div className="text-sm text-muted-foreground">Лимиты не настроены</div>}
      </Card>

      <Card className="p-4">
        <h3 className="font-semibold text-sm mb-3">Корреспондентские счета</h3>
        <div className="space-y-2">
          {bank.accounts.map((a: any) => (
            <div key={a.id} className="flex items-center justify-between p-2 rounded-lg bg-muted/20 text-sm">
              <div><span className="font-mono text-xs">{a.accountNumber}</span><span className="text-xs text-muted-foreground ml-2">({a.currency})</span></div>
              <div className="text-right"><span className="font-mono font-medium">{formatPrice(a.balance, 'rub')}</span><span className={cn('text-xs ml-2', a.balance < a.minBalance ? 'text-destructive' : 'text-muted-foreground')}>min: {formatPrice(a.minBalance, 'rub')}</span></div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  )
}

// ─── Reconciliation Tab ─────────────────────────────────────────────────────
function ReconciliationTab({ bankId }: { bankId: string }) {
  const [refreshKey, setRefreshKey] = useState(0)
  const url = `/api/bank-portal/reconciliation?bankId=${bankId}${refreshKey ? `&r=${refreshKey}` : ''}`
  const { data, loading } = useApi<{ reconciliations: any[] }>(url)
  const [showCreate, setShowCreate] = useState(false)
  const [period, setPeriod] = useState(new Date().toISOString().slice(0, 7))

  const handleCreate = async () => {
    try {
      await apiPost('/api/bank-portal/reconciliation', { bankId, period })
      toast.success('Сверка создана', { description: `Период: ${period}` })
      setShowCreate(false)
      setRefreshKey(k => k + 1)
    } catch { toast.error('Ошибка создания сверки') }
  }

  if (loading && !data) return <Card className="p-4"><TableSkeleton rows={5} /></Card>

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-sm">Сверка внутренних транзакций с банковскими выписками</h3>
        <Button size="sm" onClick={() => setShowCreate(!showCreate)}>Новая сверка</Button>
      </div>
      {showCreate && (
        <Card className="p-4 flex items-center gap-3">
          <span className="text-sm text-muted-foreground">Период:</span>
          <input type="month" value={period} onChange={(e) => setPeriod(e.target.value)} className="bg-muted border border-border rounded-lg px-3 py-1.5 text-sm" />
          <Button size="sm" onClick={handleCreate}>Создать</Button>
        </Card>
      )}
      <Card className="p-0 overflow-hidden">
        {data?.reconciliations.length === 0 ? (
          <div className="py-10 text-center text-sm text-muted-foreground">Сверок пока нет</div>
        ) : (
          <table className="w-full text-xs">
            <thead className="bg-muted/40 text-muted-foreground"><tr><th className="text-left p-2.5 font-medium">Период</th><th className="text-center p-2.5 font-medium">Всего</th><th className="text-center p-2.5 font-medium">Совпало</th><th className="text-center p-2.5 font-medium">Расхождения</th><th className="text-right p-2.5 font-medium">Сумма расх.</th><th className="text-left p-2.5 font-medium">Статус</th></tr></thead>
            <tbody>
              {data?.reconciliations.map((r: any) => (
                <tr key={r.id} className="border-t border-border/50">
                  <td className="p-2.5 font-medium">{r.period}</td>
                  <td className="text-center p-2.5">{r.totalTransactions}</td>
                  <td className="text-center p-2.5 text-success">{r.matchedCount}</td>
                  <td className="text-center p-2.5 text-destructive">{r.unmatchedInternal}</td>
                  <td className="text-right p-2.5 font-mono">{r.discrepancyAmount > 0 ? formatPrice(r.discrepancyAmount, 'rub') : '—'}</td>
                  <td className="p-2.5"><span className={cn('text-[10px] font-medium', r.status === 'MATCHED' ? 'text-success' : r.status === 'DISCREPANCY' ? 'text-destructive' : 'text-warning')}>{r.status === 'MATCHED' ? 'Совпадает' : r.status === 'DISCREPANCY' ? 'Расхождения' : 'В работе'}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>
    </div>
  )
}

// ─── Reports Tab ────────────────────────────────────────────────────────────
function ReportsTab({ bankId }: { bankId: string }) {
  const [type, setType] = useState<'threshold' | 'volumes'>('threshold')
  const [period, setPeriod] = useState(new Date().toISOString().slice(0, 7))
  const url = `/api/bank-portal/reports?bankId=${bankId}&type=${type}&period=${period}`
  const { data, loading } = useApi<any>(url)

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-3 flex-wrap">
        <div className="flex gap-1 bg-muted/60 p-1 rounded-xl">
          <button onClick={() => setType('threshold')} className={cn('px-4 py-1.5 rounded-lg text-sm font-semibold', type === 'threshold' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground')}>Пороговые (&gt;600K)</button>
          <button onClick={() => setType('volumes')} className={cn('px-4 py-1.5 rounded-lg text-sm font-semibold', type === 'volumes' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground')}>Оборот</button>
        </div>
        <input type="month" value={period} onChange={(e) => setPeriod(e.target.value)} className="bg-muted border border-border rounded-lg px-3 py-1.5 text-sm" />
      </div>
      {loading && !data ? <Card className="p-4"><TableSkeleton rows={5} /></Card> : data ? (
        <Card className="p-4">
          <h3 className="font-semibold text-sm mb-3">{data.title || 'Отчёт'}</h3>
          {type === 'threshold' && data.transactions ? (
            <>
              <div className="flex gap-4 mb-4 text-sm">
                <span className="text-muted-foreground">Количество: <span className="font-mono text-foreground">{data.count}</span></span>
                <span className="text-muted-foreground">Сумма: <span className="font-mono text-primary">{formatPrice(data.totalAmount, 'rub')}</span></span>
              </div>
              <div className="max-h-96 overflow-y-auto scrollbar-thin">
                <table className="w-full text-xs">
                  <thead className="bg-muted/40 text-muted-foreground sticky top-0"><tr><th className="text-left p-2 font-medium">Тип</th><th className="text-right p-2 font-medium">Сумма</th><th className="text-left p-2 font-medium">Статус</th><th className="text-left p-2 font-medium">Дата</th></tr></thead>
                  <tbody>
                    {data.transactions.map((t: any) => (
                      <tr key={t.id} className="border-t border-border/50"><td className="p-2"><span className="text-[10px]" style={{ color: TYPE_COLORS[t.type] }}>{TYPE_LABELS[t.type] || t.type}</span></td><td className="text-right p-2 font-mono">{formatNumber(t.amount, 0)} ₽</td><td className="p-2 text-[10px]">{t.status}</td><td className="p-2 text-muted-foreground">{new Date(t.createdAt).toLocaleString('ru-RU', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}</td></tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          ) : type === 'volumes' && data.volume !== undefined ? (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
              <div><div className="text-xs text-muted-foreground">Оборот</div><div className="font-mono font-bold">{formatPrice(data.volume, 'rub')}</div></div>
              <div><div className="text-xs text-muted-foreground">Комиссии</div><div className="font-mono font-bold text-success">{formatPrice(data.fees, 'rub')}</div></div>
              <div><div className="text-xs text-muted-foreground">Транзакций</div><div className="font-mono font-bold">{data.txCount}</div></div>
              <div><div className="text-xs text-muted-foreground">Пороговых</div><div className="font-mono font-bold text-destructive">{data.thresholdCount}</div></div>
            </div>
          ) : (
            <div className="py-6 text-center text-sm text-muted-foreground">Загрузка...</div>
          )}
        </Card>
      ) : <div className="py-10 text-center text-sm text-muted-foreground">Нет данных</div>}
    </div>
  )
}

// ─── Main View ──────────────────────────────────────────────────────────────
export function BankPortalView() {
  const userBankId = useAppStore((s) => s.userBankId)
  const userBankName = useAppStore((s) => s.userBankName)
  const [tab, setTab] = useState('dashboard')

  if (!userBankId) {
    return <div className="py-20 text-center"><Building2 className="w-12 h-12 mx-auto text-muted-foreground/40 mb-3" /><p className="text-sm text-muted-foreground">Не привязан банк. Обратитесь к администратору.</p></div>
  }

  return (
    <div className="flex-1 py-4">
      <div className="max-w-[1600px] mx-auto px-3 lg:px-5 space-y-4">
        {/* Header */}
        <header className="flex flex-col lg:flex-row lg:items-end justify-between gap-3">
          <div>
            <div className="flex items-center gap-2 mb-1.5">
              <Badge variant="outline" className="border-primary/40 text-primary gap-1.5"><Building2 className="w-3 h-3" /> BANK PORTAL</Badge>
              <Badge variant="outline" className="text-[10px] text-muted-foreground">{userBankName}</Badge>
            </div>
            <h1 className="text-xl lg:text-2xl font-bold">Портал банка — {userBankName}</h1>
            <p className="text-xs text-muted-foreground mt-0.5">Статистика, транзакции, сверка и отчёты по вашему банку</p>
          </div>
        </header>

        <Tabs value={tab} onValueChange={setTab}>
          <TabsList className="flex flex-wrap h-auto gap-1 p-1 bg-muted/40 rounded-xl">
            <TabsTrigger value="dashboard" className="gap-1.5 text-xs"><CircleDollarSign className="w-3.5 h-3.5" /> Дашборд</TabsTrigger>
            <TabsTrigger value="transactions" className="gap-1.5 text-xs"><Activity className="w-3.5 h-3.5" /> Транзакции</TabsTrigger>
            <TabsTrigger value="settings" className="gap-1.5 text-xs"><Settings className="w-3.5 h-3.5" /> Настройки</TabsTrigger>
            <TabsTrigger value="reconciliation" className="gap-1.5 text-xs"><Scale className="w-3.5 h-3.5" /> Сверка</TabsTrigger>
            <TabsTrigger value="reports" className="gap-1.5 text-xs"><FileText className="w-3.5 h-3.5" /> Отчёты</TabsTrigger>
          </TabsList>

          <TabsContent value="dashboard" className="mt-4"><DashboardTab bankId={userBankId} /></TabsContent>
          <TabsContent value="transactions" className="mt-4"><TransactionsTab bankId={userBankId} /></TabsContent>
          <TabsContent value="settings" className="mt-4"><SettingsTab bankId={userBankId} /></TabsContent>
          <TabsContent value="reconciliation" className="mt-4"><ReconciliationTab bankId={userBankId} /></TabsContent>
          <TabsContent value="reports" className="mt-4"><ReportsTab bankId={userBankId} /></TabsContent>
        </Tabs>
      </div>
    </div>
  )
}
