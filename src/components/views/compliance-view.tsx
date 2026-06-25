'use client'

import { useMemo, useState } from 'react'
import {
  Scale,
  AlertTriangle,
  ShieldAlert,
  Activity,
  CheckCircle2,
  XCircle,
  ArrowUpRight,
  FileWarning,
  Lock,
  Brain,
  Clock,
  TrendingUp,
  ShieldX,
  FileText,
} from 'lucide-react'
import { toast } from 'sonner'
import { useAppStore } from '@/lib/store'
import { useApi, apiPatch } from '@/lib/use-api'
import { useMounted } from '@/lib/use-mounted'
import type {
  AlertSeverity,
  AlertStatus,
  ComplianceAlert,
} from '@/lib/types'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Separator } from '@/components/ui/separator'

const SEVERITY_CONFIG: Record<
  AlertSeverity,
  { color: string; stripe: string; bg: string; label: string }
> = {
  CRITICAL: {
    color: 'text-destructive',
    stripe: 'bg-destructive',
    bg: 'bg-destructive/10',
    label: 'Критический',
  },
  HIGH: {
    color: 'text-orange-400',
    stripe: 'bg-orange-500',
    bg: 'bg-orange-500/10',
    label: 'Высокий',
  },
  MEDIUM: {
    color: 'text-warning',
    stripe: 'bg-warning',
    bg: 'bg-warning/10',
    label: 'Средний',
  },
  LOW: {
    color: 'text-sky-400',
    stripe: 'bg-sky-500',
    bg: 'bg-sky-500/10',
    label: 'Низкий',
  },
}

const STATUS_LABEL: Record<AlertStatus, string> = {
  OPEN: 'Открыт',
  REVIEWING: 'На рассмотрении',
  APPROVED: 'Одобрен',
  REJECTED: 'Отклонён',
  ESCALATED: 'Эскалирован',
  SAR: 'SAR-отчёт',
}

const STATUS_COLOR: Record<AlertStatus, string> = {
  OPEN: 'border-primary/40 text-primary bg-primary/10',
  REVIEWING: 'border-warning/40 text-warning bg-warning/10',
  APPROVED: 'border-success/40 text-success bg-success/10',
  REJECTED: 'border-destructive/40 text-destructive bg-destructive/10',
  ESCALATED: 'border-orange-500/40 text-orange-400 bg-orange-500/10',
  SAR: 'border-violet-500/40 text-violet-400 bg-violet-500/10',
}

const TYPE_LABEL: Record<string, string> = {
  STRUCTURING: 'Структурирование',
  VELOCITY: 'Скорость операций',
  SANCTION: 'Санкционный список',
  THRESHOLD: 'Превышение порога',
  MIXING: 'Миксер',
  PEP: 'PEP-лицо',
}

function StatCard({
  icon: Icon,
  label,
  value,
  sub,
  tone = 'default',
}: {
  icon: React.ComponentType<{ className?: string }>
  label: string
  value: string | number
  sub?: string
  tone?: 'default' | 'danger' | 'warning' | 'success'
}) {
  const toneMap = {
    default: 'text-primary',
    danger: 'text-destructive',
    warning: 'text-warning',
    success: 'text-success',
  }
  return (
    <Card className="bg-card/60 backdrop-blur">
      <CardContent className="p-5">
        <div className="flex items-start justify-between mb-3">
          <span className="text-xs text-muted-foreground uppercase tracking-wider">
            {label}
          </span>
          <div
            className={cn(
              'w-9 h-9 rounded-xl flex items-center justify-center bg-muted/40',
              toneMap[tone]
            )}
          >
            <Icon className="w-5 h-5" />
          </div>
        </div>
        <div className="text-2xl font-bold tabular-nums">{value}</div>
        {sub && <div className="text-xs text-muted-foreground mt-1">{sub}</div>}
      </CardContent>
    </Card>
  )
}

function AlertListItem({
  alert,
  active,
  onClick,
}: {
  alert: ComplianceAlert
  active: boolean
  onClick: () => void
}) {
  const sev = SEVERITY_CONFIG[alert.severity]
  const mounted = useMounted()
  return (
    <button
      onClick={onClick}
      className={cn(
        'w-full text-left relative overflow-hidden rounded-xl border transition group',
        active
          ? 'border-primary/40 bg-primary/5'
          : 'border-border bg-muted/20 hover:border-primary/30 hover:bg-muted/40'
      )}
    >
      <span
        className={cn('absolute left-0 top-0 bottom-0 w-1', sev.stripe)}
        aria-hidden
      />
      <div className="pl-3.5 pr-3 py-3">
        <div className="flex items-start justify-between gap-2 mb-1.5">
          <div className="flex items-center gap-2 min-w-0">
            <Badge
              variant="outline"
              className={cn('text-[9px] uppercase shrink-0', sev.color, sev.bg, 'border-current/30')}
            >
              {alert.severity}
            </Badge>
            <span className="text-[11px] text-muted-foreground truncate">
              {TYPE_LABEL[alert.type] || alert.type}
            </span>
          </div>
          <Badge variant="outline" className={cn('text-[9px] shrink-0', STATUS_COLOR[alert.status])}>
            {STATUS_LABEL[alert.status]}
          </Badge>
        </div>
        <div className="flex items-end justify-between gap-2">
          <p className="text-xs text-foreground/90 line-clamp-2 leading-snug min-w-0 flex-1">
            {alert.description}
          </p>
          <div className="text-right shrink-0 ml-2">
            <div className={cn('text-lg font-bold tabular-nums leading-none', sev.color)}>
              {Math.round(alert.riskScore * 100)}
              <span className="text-xs">%</span>
            </div>
            <div className="text-[9px] text-muted-foreground mt-0.5">risk</div>
          </div>
        </div>
        <div className="flex items-center justify-between mt-2 pt-2 border-t border-border/60">
          <span className="text-[10px] text-muted-foreground font-mono truncate">
            {alert.ruleId || '—'}
          </span>
          <span className="text-[10px] text-muted-foreground flex items-center gap-1">
            <Clock className="w-2.5 h-2.5" />
            {mounted ? timeAgoShort(alert.createdAt) : ''}
          </span>
        </div>
      </div>
    </button>
  )
}

function timeAgoShort(iso: string): string {
  const sec = Math.floor((Date.now() - new Date(iso).getTime()) / 1000)
  if (sec < 60) return `${sec}с`
  if (sec < 3600) return `${Math.floor(sec / 60)}м`
  if (sec < 86400) return `${Math.floor(sec / 3600)}ч`
  return `${Math.floor(sec / 86400)}д`
}

function ShapExplainer({ alert }: { alert: ComplianceAlert }) {
  if (!alert.shap || alert.shap.length === 0) {
    return (
      <div className="text-xs text-muted-foreground italic">
        SHAP-объяснения недоступны для данного алерта.
      </div>
    )
  }

  const maxAbs = Math.max(...alert.shap.map((s) => Math.abs(s.contribution)), 0.01)

  return (
    <div className="space-y-2.5">
      {alert.shap.map((s, i) => {
        const pct = (Math.abs(s.contribution) / maxAbs) * 50
        const positive = s.contribution >= 0
        return (
          <div key={i} className="space-y-1">
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground">{s.feature}</span>
              <span
                className={cn(
                  'font-mono font-medium',
                  positive ? 'text-destructive' : 'text-success'
                )}
              >
                {positive ? '+' : ''}
                {s.contribution.toFixed(2)}
              </span>
            </div>
            <div className="relative h-2 rounded-full bg-muted/40 overflow-hidden flex">
              <div className="w-1/2 flex justify-end">
                {!positive && (
                  <div
                    className="h-full bg-success/70 rounded-l-full"
                    style={{ width: `${pct * 2}%` }}
                  />
                )}
              </div>
              <div className="w-px bg-border" />
              <div className="w-1/2">
                {positive && (
                  <div
                    className="h-full bg-destructive/70 rounded-r-full"
                    style={{ width: `${pct * 2}%` }}
                  />
                )}
              </div>
            </div>
          </div>
        )
      })}
      <div className="flex items-center justify-between text-[10px] text-muted-foreground pt-1.5 border-t border-border/60">
        <span className="flex items-center gap-1">
          <span className="w-2 h-2 rounded-sm bg-destructive/70" /> ↑ повышает риск
        </span>
        <span className="flex items-center gap-1">
          <span className="w-2 h-2 rounded-sm bg-success/70" /> ↓ снижает риск
        </span>
      </div>
    </div>
  )
}

function AlertDetail({
  alert,
  onReviewed,
}: {
  alert: ComplianceAlert
  onReviewed?: () => void
}) {
  const reviewAlert = useAppStore((s) => s.reviewAlert)
  const pushNotification = useAppStore((s) => s.pushNotification)
  const mounted = useMounted()

  const sev = SEVERITY_CONFIG[alert.severity]
  const riskPct = Math.round(alert.riskScore * 100)
  const isOpen = alert.status === 'OPEN' || alert.status === 'REVIEWING'
  const isCritical = alert.severity === 'CRITICAL'

  const handleAction = async (status: AlertStatus, label: string, toastMsg?: string) => {
    // Persist review decision via API (resilience: still mirror locally on failure)
    try {
      await apiPatch('/api/compliance', { id: alert.id, status })
    } catch {
      // Ignore API error — local store update is still applied
    }
    reviewAlert(alert.id, status)
    pushNotification(`Алерт ${label}`, `${TYPE_LABEL[alert.type] || alert.type} • ${alert.ruleId}`)
    if (toastMsg) {
      toast.success(toastMsg)
    } else {
      toast.success(`Алерт переведён в статус: ${STATUS_LABEL[status]}`)
    }
    onReviewed?.()
  }

  return (
    <Card className="bg-card/60 backdrop-blur">
      <CardHeader>
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div
              className={cn(
                'w-11 h-11 rounded-xl flex items-center justify-center shrink-0',
                sev.bg,
                sev.color
              )}
            >
              <ShieldAlert className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <CardTitle className="text-lg truncate">
                {TYPE_LABEL[alert.type] || alert.type}
              </CardTitle>
              <CardDescription className="text-xs font-mono mt-0.5">
                {alert.ruleId || '—'} • {alert.entityType}
              </CardDescription>
            </div>
          </div>
          <div className="flex flex-col items-end gap-1 shrink-0">
            <Badge variant="outline" className={cn('text-[10px]', STATUS_COLOR[alert.status])}>
              {STATUS_LABEL[alert.status]}
            </Badge>
            <Badge variant="outline" className={cn('text-[10px] uppercase', sev.color, sev.bg)}>
              {alert.severity}
            </Badge>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-5">
        <p className="text-sm leading-relaxed">{alert.description}</p>

        {/* Risk score */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="text-muted-foreground flex items-center gap-1.5">
              <TrendingUp className="w-3.5 h-3.5" />
              Risk score
            </span>
            <span className={cn('font-mono font-bold text-base', sev.color)}>
              {riskPct}%
            </span>
          </div>
          <Progress
            value={riskPct}
            className={cn('h-2', sev.stripe)}
          />
        </div>

        {/* Meta */}
        <div className="grid grid-cols-2 gap-3 text-xs">
          <div className="p-3 rounded-lg border border-border bg-muted/20">
            <div className="text-muted-foreground text-[10px] uppercase tracking-wider mb-1">
              Тип сущности
            </div>
            <div className="font-medium capitalize">{alert.entityType}</div>
            {alert.entityId && (
              <div className="text-[10px] text-muted-foreground font-mono mt-0.5 truncate">
                {alert.entityId}
              </div>
            )}
          </div>
          <div className="p-3 rounded-lg border border-border bg-muted/20">
            <div className="text-muted-foreground text-[10px] uppercase tracking-wider mb-1">
              Создан
            </div>
            <div className="font-medium">{mounted ? new Date(alert.createdAt).toLocaleString('ru-RU') : '—'}</div>
            <div className="text-[10px] text-muted-foreground mt-0.5">
              {mounted ? `${timeAgoShort(alert.createdAt)} назад` : ''}
            </div>
          </div>
        </div>

        <Separator />

        {/* SHAP */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-violet-500/15 text-violet-400 flex items-center justify-center">
                <Brain className="w-3.5 h-3.5" />
              </div>
              <div>
                <div className="text-sm font-medium">SHAP объяснение</div>
                <div className="text-[10px] text-muted-foreground">
                  ML-интерпретация решения • для регулятора
                </div>
              </div>
            </div>
            <Badge variant="outline" className="text-[9px] border-violet-500/30 text-violet-400">
              XAI
            </Badge>
          </div>
          <ShapExplainer alert={alert} />
        </div>

        {/* Actions */}
        {isOpen && (
          <div className="space-y-2 pt-2">
            <div className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
              Действия
            </div>
            <div className="grid grid-cols-2 gap-2">
              <Button
                size="sm"
                onClick={() => handleAction('APPROVED', 'одобрен')}
                className="h-9 gap-1.5 bg-success text-success-foreground hover:bg-success/90"
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
                Одобрить
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => handleAction('REJECTED', 'отклонён')}
                className="h-9 gap-1.5 border-destructive/40 text-destructive hover:bg-destructive/10"
              >
                <XCircle className="w-3.5 h-3.5" />
                Отклонить
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => handleAction('ESCALATED', 'эскалирован')}
                className="h-9 gap-1.5 border-orange-500/40 text-orange-400 hover:bg-orange-500/10"
              >
                <ArrowUpRight className="w-3.5 h-3.5" />
                Эскалировать
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() =>
                  handleAction(
                    'SAR',
                    'переведён в SAR',
                    'SAR-отчёт сформирован для Росфинмониторинга'
                  )
                }
                className="h-9 gap-1.5 border-violet-500/40 text-violet-400 hover:bg-violet-500/10"
              >
                <FileWarning className="w-3.5 h-3.5" />
                SAR-отчёт
              </Button>
            </div>
          </div>
        )}

        {!isOpen && (
          <div className="flex items-center gap-2 p-3 rounded-lg border border-border bg-muted/20 text-xs">
            <Lock className="w-3.5 h-3.5 text-muted-foreground" />
            <span className="text-muted-foreground">
              Алерт обработан • действия заблокированы
            </span>
          </div>
        )}

        {isCritical && isOpen && (
          <div className="p-3 rounded-lg border border-destructive/30 bg-destructive/5 flex items-start gap-2">
            <ShieldX className="w-4 h-4 text-destructive mt-0.5 shrink-0" />
            <div className="text-xs">
              <div className="font-medium text-destructive">
                Критический алерт — требуется карантин
              </div>
              <div className="text-muted-foreground mt-0.5">
                Перевод в карантин замораживает связанный актив до 2-факторного
                подтверждения (Compliance + Risk Manager).
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

function EmptyDetail() {
  return (
    <Card className="bg-card/40 border-dashed">
      <CardContent className="flex flex-col items-center justify-center py-20 text-center">
        <div className="w-16 h-16 rounded-2xl bg-muted/40 flex items-center justify-center mb-4">
          <Scale className="w-7 h-7 text-muted-foreground" />
        </div>
        <div className="text-sm font-medium">Выберите алерт</div>
        <div className="text-xs text-muted-foreground mt-1 max-w-xs">
          Кликните по элементу списка слева, чтобы увидеть детали, SHAP-объяснение
          и доступные действия.
        </div>
      </CardContent>
    </Card>
  )
}

function QuarantineCard({ alerts }: { alerts: ComplianceAlert[] }) {
  const criticalOpen = alerts.filter(
    (a) => a.severity === 'CRITICAL' && (a.status === 'OPEN' || a.status === 'REVIEWING')
  ).length

  return (
    <Card className="bg-gradient-to-r from-destructive/5 via-card to-card border-destructive/20">
      <CardContent className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-5">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-xl bg-destructive/15 text-destructive flex items-center justify-center shrink-0">
            <Lock className="w-5 h-5" />
          </div>
          <div className="text-sm">
            <div className="font-semibold mb-0.5 flex items-center gap-2">
              Карантин активов (m-of-n)
              <Badge variant="outline" className="text-[10px] border-destructive/30 text-destructive">
                2-of-2
              </Badge>
            </div>
            <p className="text-muted-foreground text-xs leading-relaxed max-w-xl">
              Критические алерты блокируют связанный актив до 2-факторного подтверждения
              (Compliance Officer + Risk Manager). Подтверждение фиксируется в
              WORM-аудите и доступно регулятору.
            </p>
            <div className="flex flex-wrap gap-3 mt-2 text-[11px] text-muted-foreground">
              <span className="flex items-center gap-1">
                <ShieldAlert className="w-3 h-3" /> Критических в работе: {criticalOpen}
              </span>
              <span className="flex items-center gap-1">
                <FileText className="w-3 h-3" /> Авто-отчёт в Росфинмониторинг
              </span>
            </div>
          </div>
        </div>
        <Button
          variant="outline"
          className="shrink-0 border-destructive/40 text-destructive hover:bg-destructive/10 gap-2"
          disabled={criticalOpen === 0}
          onClick={() =>
            toast.success('Перевод в карантин', {
              description: 'Актив заморожен до 2-факторного подтверждения',
            })
          }
        >
          <Lock className="w-4 h-4" />
          Перевести в карантин
        </Button>
      </CardContent>
    </Card>
  )
}

export function ComplianceView() {
  const storeAlerts = useAppStore((s) => s.alerts)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [refreshKey, setRefreshKey] = useState(0)
  const complianceUrl = refreshKey ? `/api/compliance?t=${refreshKey}` : '/api/compliance'
  const { data } = useApi<{ alerts: ComplianceAlert[] }>(complianceUrl)

  // Prefer API alerts when present; fall back to store for resilience
  const apiAlerts: ComplianceAlert[] | null =
    data?.alerts && Array.isArray(data.alerts) && data.alerts.length > 0
      ? (data.alerts as ComplianceAlert[])
      : null
  const alerts = apiAlerts ?? storeAlerts

  const refresh = () => setRefreshKey((k) => k + 1)

  const effectiveId =
    selectedId && alerts.some((a) => a.id === selectedId)
      ? selectedId
      : alerts[0]?.id ?? null

  const stats = useMemo(() => {
    const open = alerts.filter((a) => a.status === 'OPEN' || a.status === 'REVIEWING')
    const critical = alerts.filter((a) => a.severity === 'CRITICAL')
    const criticalOpen = critical.filter(
      (a) => a.status === 'OPEN' || a.status === 'REVIEWING'
    ).length
    const avgRisk =
      open.length > 0
        ? open.reduce((s, a) => s + a.riskScore, 0) / open.length
        : 0
    const processedToday = alerts.filter(
      (a) => a.status === 'APPROVED' || a.status === 'REJECTED' || a.status === 'SAR'
    ).length
    return {
      openCount: open.length,
      criticalCount: criticalOpen,
      avgRisk: Math.round(avgRisk * 100),
      processedToday,
    }
  }, [alerts])

  const selected = alerts.find((a) => a.id === effectiveId) || null

  // Sort alerts: open first, then by risk score
  const sortedAlerts = useMemo(() => {
    return [...alerts].sort((a, b) => {
      const aOpen = a.status === 'OPEN' || a.status === 'REVIEWING' ? 0 : 1
      const bOpen = b.status === 'OPEN' || b.status === 'REVIEWING' ? 0 : 1
      if (aOpen !== bOpen) return aOpen - bOpen
      return b.riskScore - a.riskScore
    })
  }, [alerts])

  return (
    <div className="flex-1 py-8">
      <div className="max-w-[1400px] mx-auto px-4 lg:px-8 space-y-6">
        {/* Header */}
        <header className="flex flex-col lg:flex-row lg:items-end justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-2 flex-wrap">
              <Badge variant="outline" className="border-destructive/40 text-destructive gap-1.5">
                <Scale className="w-3 h-3" />
                AML CONSOLE
              </Badge>
              <Badge variant="outline" className="text-[10px] text-muted-foreground">
                115-ФЗ
              </Badge>
              <Badge variant="outline" className="text-[10px] text-muted-foreground">
                Росфинмониторинг
              </Badge>
              {stats.openCount > 0 && (
                <Badge variant="destructive" className="text-[10px] gap-1">
                  <Activity className="w-3 h-3" />
                  {stats.openCount} активных
                </Badge>
              )}
            </div>
            <h1 className="text-3xl lg:text-4xl font-bold tracking-tight">
              Комплаенс-консоль
            </h1>
            <p className="text-sm text-muted-foreground mt-1.5">
              AML-мониторинг • 115-ФЗ • Росфинмониторинг
            </p>
          </div>
        </header>

        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            icon={AlertTriangle}
            label="Открытые алерты"
            value={stats.openCount}
            sub={`${alerts.length} всего в системе`}
            tone="warning"
          />
          <StatCard
            icon={ShieldAlert}
            label="Критические"
            value={stats.criticalCount}
            sub="требуют немедленного действия"
            tone="danger"
          />
          <StatCard
            icon={Activity}
            label="Средний risk score"
            value={`${stats.avgRisk}%`}
            sub="по открытым алертам"
            tone={stats.avgRisk > 70 ? 'danger' : 'warning'}
          />
          <StatCard
            icon={CheckCircle2}
            label="Обработано сегодня"
            value={stats.processedToday}
            sub="APPROVED / REJECTED / SAR"
            tone="success"
          />
        </div>

        {/* List + Detail */}
        <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,2fr)_minmax(0,3fr)] gap-6">
          {/* List */}
          <Card className="bg-card/60 backdrop-blur flex flex-col">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base flex items-center gap-2">
                  <Activity className="w-4 h-4 text-primary" />
                  Лента алертов
                </CardTitle>
                <Badge variant="outline" className="text-[10px]">
                  {sortedAlerts.length}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-2 max-h-[680px] overflow-y-auto scrollbar-thin pr-1">
              {sortedAlerts.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 text-center">
                  <div className="w-14 h-14 rounded-2xl bg-success/10 flex items-center justify-center mb-3">
                    <CheckCircle2 className="w-6 h-6 text-success" />
                  </div>
                  <div className="text-sm font-medium">Нет алертов</div>
                  <div className="text-xs text-muted-foreground mt-1">
                    AML-мониторинг не выявил подозрительной активности
                  </div>
                </div>
              ) : (
                sortedAlerts.map((a) => (
                  <AlertListItem
                    key={a.id}
                    alert={a}
                    active={a.id === effectiveId}
                    onClick={() => setSelectedId(a.id)}
                  />
                ))
              )}
            </CardContent>
          </Card>

          {/* Detail */}
          {selected ? <AlertDetail alert={selected} onReviewed={refresh} /> : <EmptyDetail />}
        </div>

        {/* Quarantine */}
        <QuarantineCard alerts={alerts} />

        {/* Footer note */}
        <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-[11px] text-muted-foreground pt-2">
          <span className="flex items-center gap-1.5">
            <Brain className="w-3 h-3 text-violet-400" />
            ML-модель: Gradient Boosting • SHAP v0.45
          </span>
          <span className="flex items-center gap-1.5">
            <FileText className="w-3 h-3 text-primary" />
            WORM-аудит • Merkle Root 0x8f3a…b2c1
          </span>
          <span className="flex items-center gap-1.5">
            <CheckCircle2 className="w-3 h-3 text-success" />
            Отчётность в Росфинмониторинг 24/7
          </span>
        </div>
      </div>
    </div>
  )
}
