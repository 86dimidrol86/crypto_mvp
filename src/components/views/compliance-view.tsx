'use client'

import { useMemo, useState } from 'react'
import { motion } from 'framer-motion'
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
import { useI18n } from '@/lib/use-i18n'
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
import { AlertCardSkeleton } from '@/components/page-skeleton'

const SEVERITY_CONFIG: Record<
  AlertSeverity,
  { color: string; stripe: string; bg: string; labelKey: string }
> = {
  CRITICAL: {
    color: 'text-destructive',
    stripe: 'bg-destructive',
    bg: 'bg-destructive/10',
    labelKey: 'compliance.severity.critical',
  },
  HIGH: {
    color: 'text-orange-400',
    stripe: 'bg-orange-500',
    bg: 'bg-orange-500/10',
    labelKey: 'compliance.severity.high',
  },
  MEDIUM: {
    color: 'text-warning',
    stripe: 'bg-warning',
    bg: 'bg-warning/10',
    labelKey: 'compliance.severity.medium',
  },
  LOW: {
    color: 'text-sky-400',
    stripe: 'bg-sky-500',
    bg: 'bg-sky-500/10',
    labelKey: 'compliance.severity.low',
  },
}

const STATUS_LABEL_KEY: Record<AlertStatus, string> = {
  OPEN: 'compliance.status.OPEN',
  REVIEWING: 'compliance.status.REVIEWING',
  APPROVED: 'compliance.status.APPROVED',
  REJECTED: 'compliance.status.REJECTED',
  ESCALATED: 'compliance.status.ESCALATED',
  SAR: 'compliance.status.SAR',
}

const STATUS_COLOR: Record<AlertStatus, string> = {
  OPEN: 'border-primary/40 text-primary bg-primary/10',
  REVIEWING: 'border-warning/40 text-warning bg-warning/10',
  APPROVED: 'border-success/40 text-success bg-success/10',
  REJECTED: 'border-destructive/40 text-destructive bg-destructive/10',
  ESCALATED: 'border-orange-500/40 text-orange-400 bg-orange-500/10',
  SAR: 'border-violet-500/40 text-violet-400 bg-violet-500/10',
}

const TYPE_LABEL_KEY: Record<string, string> = {
  STRUCTURING: 'compliance.type.STRUCTURING',
  VELOCITY: 'compliance.type.VELOCITY',
  SANCTION: 'compliance.type.SANCTION',
  THRESHOLD: 'compliance.type.THRESHOLD',
  MIXING: 'compliance.type.MIXING',
  PEP: 'compliance.type.PEP',
}

function timeAgoShort(iso: string, t: (k: string) => string): string {
  const sec = Math.floor((Date.now() - new Date(iso).getTime()) / 1000)
  if (sec < 60) return `${sec}${t('compliance.time.sec')}`
  if (sec < 3600) return `${Math.floor(sec / 60)}${t('compliance.time.min')}`
  if (sec < 86400) return `${Math.floor(sec / 3600)}${t('compliance.time.hour')}`
  return `${Math.floor(sec / 86400)}${t('compliance.time.day')}`
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
    default: { text: 'text-primary', bg: 'bg-primary/10', border: 'hover:border-primary/30' },
    danger: { text: 'text-destructive', bg: 'bg-destructive/10', border: 'hover:border-destructive/30' },
    warning: { text: 'text-warning', bg: 'bg-warning/10', border: 'hover:border-warning/30' },
    success: { text: 'text-success', bg: 'bg-success/10', border: 'hover:border-success/30' },
  }
  const cfg = toneMap[tone]
  return (
    <Card className={cn('bg-card/60 backdrop-blur transition-colors group', cfg.border)}>
      <CardContent className="p-4">
        <div className="flex items-start justify-between mb-2">
          <span className="text-xs text-muted-foreground uppercase tracking-wider">
            {label}
          </span>
          <div
            className={cn(
              'w-9 h-9 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform',
              cfg.bg,
              cfg.text
            )}
          >
            <Icon className="w-4 h-4" />
          </div>
        </div>
        <div className="text-xl font-bold tabular-nums">{value}</div>
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
  const { t } = useI18n()
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
      <div className="pl-3.5 pr-2.5 py-2.5">
        <div className="flex items-start justify-between gap-2 mb-1.5">
          <div className="flex items-center gap-2 min-w-0">
            <Badge
              variant="outline"
              className={cn('text-[9px] uppercase shrink-0', sev.color, sev.bg, 'border-current/30')}
            >
              {t(sev.labelKey)}
            </Badge>
            <span className="text-[11px] text-muted-foreground truncate">
              {TYPE_LABEL_KEY[alert.type] ? t(TYPE_LABEL_KEY[alert.type]) : alert.type}
            </span>
          </div>
          <Badge variant="outline" className={cn('text-[9px] shrink-0', STATUS_COLOR[alert.status])}>
            {t(STATUS_LABEL_KEY[alert.status])}
          </Badge>
        </div>
        <div className="flex items-end justify-between gap-2">
          <p className="text-xs text-foreground/90 line-clamp-2 leading-snug min-w-0 flex-1">
            {alert.description}
          </p>
          <div className="text-right shrink-0 ml-2">
            <div className={cn('text-base font-bold tabular-nums leading-none', sev.color)}>
              {Math.round(alert.riskScore * 100)}
              <span className="text-xs">%</span>
            </div>
            <div className="text-[9px] text-muted-foreground mt-0.5">risk</div>
            <div className="w-12 h-1 bg-muted/50 rounded-full mt-1 overflow-hidden">
              <div
                className={cn('h-full rounded-full transition-all', sev.stripe)}
                style={{ width: `${Math.round(alert.riskScore * 100)}%` }}
              />
            </div>
          </div>
        </div>
        <div className="flex items-center justify-between mt-1.5 pt-1.5 border-t border-border/60">
          <span className="text-[10px] text-muted-foreground font-mono truncate">
            {alert.ruleId || '—'}
          </span>
          <span className="text-[10px] text-muted-foreground flex items-center gap-1">
            <Clock className="w-2.5 h-2.5" />
            {mounted ? timeAgoShort(alert.createdAt, t) : ''}
          </span>
        </div>
      </div>
    </button>
  )
}

function ShapExplainer({ alert }: { alert: ComplianceAlert }) {
  const { t } = useI18n()
  if (!alert.shap || alert.shap.length === 0) {
    return (
      <div className="text-xs text-muted-foreground italic">
        {t('compliance.shap.empty')}
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
          <span className="w-2 h-2 rounded-sm bg-destructive/70" /> ↑ {t('compliance.shap.increase')}
        </span>
        <span className="flex items-center gap-1">
          <span className="w-2 h-2 rounded-sm bg-success/70" /> ↓ {t('compliance.shap.decrease')}
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
  const { t } = useI18n()
  const reviewAlert = useAppStore((s) => s.reviewAlert)
  const pushNotification = useAppStore((s) => s.pushNotification)
  const mounted = useMounted()

  const sev = SEVERITY_CONFIG[alert.severity]
  const riskPct = Math.round(alert.riskScore * 100)
  const isOpen = alert.status === 'OPEN' || alert.status === 'REVIEWING'
  const isCritical = alert.severity === 'CRITICAL'

  const handleAction = async (status: AlertStatus, labelKey: string, toastKey?: string) => {
    // Persist review decision via API (resilience: still mirror locally on failure)
    try {
      await apiPatch('/api/compliance', { id: alert.id, status })
    } catch {
      // Ignore API error — local store update is still applied
    }
    reviewAlert(alert.id, status)
    pushNotification(`${t('compliance.toast.alertWord')} ${t(labelKey)}`, `${TYPE_LABEL_KEY[alert.type] ? t(TYPE_LABEL_KEY[alert.type]) : alert.type} • ${alert.ruleId}`)
    if (toastKey) {
      toast.success(t(toastKey))
    } else {
      toast.success(`${t('compliance.toast.statusChanged')} ${t(STATUS_LABEL_KEY[status])}`)
    }
    onReviewed?.()
  }

  return (
    <Card className="bg-card/60 backdrop-blur">
      <CardHeader>
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-2.5 min-w-0">
            <div
              className={cn(
                'w-10 h-10 rounded-xl flex items-center justify-center shrink-0',
                sev.bg,
                sev.color
              )}
            >
              <ShieldAlert className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <CardTitle className="text-base truncate">
                {TYPE_LABEL_KEY[alert.type] ? t(TYPE_LABEL_KEY[alert.type]) : alert.type}
              </CardTitle>
              <CardDescription className="text-xs font-mono mt-0.5">
                {alert.ruleId || '—'} • {alert.entityType}
              </CardDescription>
            </div>
          </div>
          <div className="flex flex-col items-end gap-1 shrink-0">
            <Badge variant="outline" className={cn('text-[10px]', STATUS_COLOR[alert.status])}>
              {t(STATUS_LABEL_KEY[alert.status])}
            </Badge>
            <Badge variant="outline" className={cn('text-[10px] uppercase', sev.color, sev.bg)}>
              {t(sev.labelKey)}
            </Badge>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm leading-relaxed">{alert.description}</p>

        {/* Risk score */}
        <div className="space-y-1.5">
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
        <div className="grid grid-cols-2 gap-2.5 text-xs">
          <div className="p-2.5 rounded-lg border border-border bg-muted/20">
            <div className="text-muted-foreground text-[10px] uppercase tracking-wider mb-1">
              {t('compliance.detail.entityType')}
            </div>
            <div className="font-medium capitalize">{alert.entityType}</div>
            {alert.entityId && (
              <div className="text-[10px] text-muted-foreground font-mono mt-0.5 truncate">
                {alert.entityId}
              </div>
            )}
          </div>
          <div className="p-2.5 rounded-lg border border-border bg-muted/20">
            <div className="text-muted-foreground text-[10px] uppercase tracking-wider mb-1">
              {t('compliance.detail.created')}
            </div>
            <div className="font-medium">{mounted ? new Date(alert.createdAt).toLocaleString('ru-RU') : '—'}</div>
            <div className="text-[10px] text-muted-foreground mt-0.5">
              {mounted ? `${timeAgoShort(alert.createdAt, t)} ${t('compliance.time.ago')}` : ''}
            </div>
          </div>
        </div>

        <Separator />

        {/* SHAP */}
        <div className="space-y-2.5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-violet-500/15 text-violet-400 flex items-center justify-center">
                <Brain className="w-3.5 h-3.5" />
              </div>
              <div>
                <div className="text-sm font-medium">{t('compliance.detail.shapTitle')}</div>
                <div className="text-[10px] text-muted-foreground">
                  {t('compliance.detail.shapSubtitle')}
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
          <div className="space-y-2 pt-1.5">
            <div className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
              {t('compliance.actions.title')}
            </div>
            <div className="grid grid-cols-2 gap-2">
              <Button
                size="sm"
                onClick={() => handleAction('APPROVED', 'compliance.actions.approveToast')}
                className="h-9 gap-1.5 bg-success text-success-foreground hover:bg-success/90"
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
                {t('compliance.actions.approve')}
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => handleAction('REJECTED', 'compliance.actions.rejectToast')}
                className="h-9 gap-1.5 border-destructive/40 text-destructive hover:bg-destructive/10"
              >
                <XCircle className="w-3.5 h-3.5" />
                {t('compliance.actions.reject')}
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => handleAction('ESCALATED', 'compliance.actions.escalateToast')}
                className="h-9 gap-1.5 border-orange-500/40 text-orange-400 hover:bg-orange-500/10"
              >
                <ArrowUpRight className="w-3.5 h-3.5" />
                {t('compliance.actions.escalate')}
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() =>
                  handleAction(
                    'SAR',
                    'compliance.actions.sarToast1',
                    'compliance.actions.sarToast2'
                  )
                }
                className="h-9 gap-1.5 border-violet-500/40 text-violet-400 hover:bg-violet-500/10"
              >
                <FileWarning className="w-3.5 h-3.5" />
                {t('compliance.actions.sar')}
              </Button>
            </div>
          </div>
        )}

        {!isOpen && (
          <div className="flex items-center gap-2 p-2.5 rounded-lg border border-border bg-muted/20 text-xs">
            <Lock className="w-3.5 h-3.5 text-muted-foreground" />
            <span className="text-muted-foreground">
              {t('compliance.actions.handled')}
            </span>
          </div>
        )}

        {isCritical && isOpen && (
          <div className="p-2.5 rounded-lg border border-destructive/30 bg-destructive/5 flex items-start gap-2">
            <ShieldX className="w-4 h-4 text-destructive mt-0.5 shrink-0" />
            <div className="text-xs">
              <div className="font-medium text-destructive">
                {t('compliance.actions.criticalQuarantine')}
              </div>
              <div className="text-muted-foreground mt-0.5">
                {t('compliance.actions.quarantineDesc')}
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

function EmptyDetail() {
  const { t } = useI18n()
  return (
    <Card className="bg-card/40 border-dashed">
      <CardContent className="flex flex-col items-center justify-center py-16 text-center">
        <div className="w-14 h-14 rounded-2xl bg-muted/40 flex items-center justify-center mb-3">
          <Scale className="w-6 h-6 text-muted-foreground" />
        </div>
        <div className="text-sm font-medium">{t('compliance.empty.title')}</div>
        <div className="text-xs text-muted-foreground mt-1 max-w-xs">
          {t('compliance.empty.desc')}
        </div>
      </CardContent>
    </Card>
  )
}

function QuarantineCard({ alerts }: { alerts: ComplianceAlert[] }) {
  const { t } = useI18n()
  const criticalOpen = alerts.filter(
    (a) => a.severity === 'CRITICAL' && (a.status === 'OPEN' || a.status === 'REVIEWING')
  ).length

  return (
    <Card className="bg-gradient-to-r from-destructive/5 via-card to-card border-destructive/20">
      <CardContent className="flex flex-col md:flex-row md:items-center justify-between gap-3 p-4">
        <div className="flex items-start gap-3">
          <div className="w-9 h-9 rounded-xl bg-destructive/15 text-destructive flex items-center justify-center shrink-0">
            <Lock className="w-5 h-5" />
          </div>
          <div className="text-sm">
            <div className="font-semibold mb-0.5 flex items-center gap-2">
              {t('compliance.quarantine.title')}
              <Badge variant="outline" className="text-[10px] border-destructive/30 text-destructive">
                2-of-2
              </Badge>
            </div>
            <p className="text-muted-foreground text-xs leading-relaxed max-w-xl">
              {t('compliance.quarantine.desc')}
            </p>
            <div className="flex flex-wrap gap-2.5 mt-2 text-[11px] text-muted-foreground">
              <span className="flex items-center gap-1">
                <ShieldAlert className="w-3 h-3" /> {t('compliance.quarantine.criticalInWork')} {criticalOpen}
              </span>
              <span className="flex items-center gap-1">
                <FileText className="w-3 h-3" /> {t('compliance.quarantine.autoReport')}
              </span>
            </div>
          </div>
        </div>
        <Button
          variant="outline"
          className="shrink-0 border-destructive/40 text-destructive hover:bg-destructive/10 gap-2"
          disabled={criticalOpen === 0}
          onClick={() =>
            toast.success(t('compliance.quarantine.toast.title'), {
              description: t('compliance.quarantine.toast.desc'),
            })
          }
        >
          <Lock className="w-4 h-4" />
          {t('compliance.quarantine.btn')}
        </Button>
      </CardContent>
    </Card>
  )
}

export function ComplianceView() {
  const { t } = useI18n()
  const storeAlerts = useAppStore((s) => s.alerts)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [refreshKey, setRefreshKey] = useState(0)
  const complianceUrl = refreshKey ? `/api/compliance?t=${refreshKey}` : '/api/compliance'
  const { data, loading } = useApi<{ alerts: ComplianceAlert[] }>(complianceUrl)

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

  // First-paint skeleton: API still loading, no alerts yet
  const showSkeleton = loading && !apiAlerts && storeAlerts.length === 0

  return (
    <div className="flex-1 py-4">
      <div className="max-w-[1400px] mx-auto px-3 lg:px-5 space-y-4">
        {/* Header */}
        <header className="flex flex-col lg:flex-row lg:items-end justify-between gap-3">
          <div>
            <div className="flex items-center gap-2 mb-1.5 flex-wrap">
              <Badge variant="outline" className="border-destructive/40 text-destructive gap-1.5">
                <Scale className="w-3 h-3" />
                AML CONSOLE
              </Badge>
              <Badge variant="outline" className="text-[10px] text-muted-foreground">
                {t('compliance.header.115fz')}
              </Badge>
              <Badge variant="outline" className="text-[10px] text-muted-foreground">
                {t('compliance.header.rosfin')}
              </Badge>
              {!showSkeleton && stats.openCount > 0 && (
                <Badge variant="destructive" className="text-[10px] gap-1">
                  <Activity className="w-3 h-3" />
                  {stats.openCount} {t('compliance.header.activeWord')}
                </Badge>
              )}
            </div>
            <h1 className="text-xl lg:text-2xl font-bold tracking-tight">
              {t('compliance.header.title')}
            </h1>
            <p className="text-xs text-muted-foreground mt-1">
              {t('compliance.header.subtitle')}
            </p>
          </div>
        </header>

        {/* Stats (only show real numbers when not skeleton) */}
        {!showSkeleton && (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <StatCard
              icon={AlertTriangle}
              label={t('compliance.kpi.openAlerts')}
              value={stats.openCount}
              sub={`${alerts.length} ${t('compliance.kpi.openAlertsSub')}`}
              tone="warning"
            />
            <StatCard
              icon={ShieldAlert}
              label={t('compliance.kpi.critical')}
              value={stats.criticalCount}
              sub={t('compliance.kpi.criticalSub')}
              tone="danger"
            />
            <StatCard
              icon={Activity}
              label={t('compliance.kpi.avgRisk')}
              value={`${stats.avgRisk}%`}
              sub={t('compliance.kpi.avgRiskSub')}
              tone={stats.avgRisk > 70 ? 'danger' : 'warning'}
            />
            <StatCard
              icon={CheckCircle2}
              label={t('compliance.kpi.handledToday')}
              value={stats.processedToday}
              sub="APPROVED / REJECTED / SAR"
              tone="success"
            />
          </div>
        )}

        {/* List + Detail */}
        <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,2fr)_minmax(0,3fr)] gap-4">
          {/* List */}
          <Card className="bg-card/60 backdrop-blur flex flex-col">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base flex items-center gap-2">
                  <Activity className="w-4 h-4 text-primary" />
                  {t('compliance.feed.title')}
                </CardTitle>
                <Badge variant="outline" className="text-[10px]">
                  {showSkeleton ? '—' : sortedAlerts.length}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-2 max-h-[680px] overflow-y-auto scrollbar-thin pr-1">
              {showSkeleton ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <AlertCardSkeleton key={i} />
                ))
              ) : sortedAlerts.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <div className="w-12 h-12 rounded-2xl bg-success/10 flex items-center justify-center mb-2.5">
                    <CheckCircle2 className="w-6 h-6 text-success" />
                  </div>
                  <div className="text-sm font-medium">{t('compliance.feed.empty')}</div>
                  <div className="text-xs text-muted-foreground mt-1">
                    {t('compliance.feed.emptyHint')}
                  </div>
                </div>
              ) : (
                sortedAlerts.map((a, i) => (
                  <motion.div
                    key={a.id}
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.22, delay: Math.min(i * 0.04, 0.5), ease: 'easeOut' }}
                  >
                    <AlertListItem
                      alert={a}
                      active={a.id === effectiveId}
                      onClick={() => setSelectedId(a.id)}
                    />
                  </motion.div>
                ))
              )}
            </CardContent>
          </Card>

          {/* Detail */}
          {showSkeleton ? (
            <Card className="bg-card/40 border-dashed">
              <CardContent className="flex flex-col items-center justify-center py-16 text-center">
                <div className="w-14 h-14 rounded-2xl bg-muted/40 flex items-center justify-center mb-3">
                  <Scale className="w-6 h-6 text-muted-foreground" />
                </div>
                <div className="text-sm font-medium">{t('compliance.detail.loading')}</div>
                <div className="text-xs text-muted-foreground mt-1 max-w-xs">
                  {t('compliance.detail.loadingHint')}
                </div>
              </CardContent>
            </Card>
          ) : selected ? (
            <AlertDetail alert={selected} onReviewed={refresh} />
          ) : (
            <EmptyDetail />
          )}
        </div>

        {/* Quarantine */}
        {!showSkeleton && <QuarantineCard alerts={alerts} />}

        {/* Footer note */}
        <div className="flex flex-wrap items-center justify-center gap-x-5 gap-y-1.5 text-[11px] text-muted-foreground pt-1.5">
          <span className="flex items-center gap-1.5">
            <Brain className="w-3 h-3 text-violet-400" />
            {t('compliance.footer.ml')}
          </span>
          <span className="flex items-center gap-1.5">
            <FileText className="w-3 h-3 text-primary" />
            {t('compliance.footer.worm')}
          </span>
          <span className="flex items-center gap-1.5">
            <CheckCircle2 className="w-3 h-3 text-success" />
            {t('compliance.footer.report')}
          </span>
        </div>
      </div>
    </div>
  )
}
