'use client'

import { useEffect, useRef, useState } from 'react'
import { motion } from 'framer-motion'
import {
  Send,
  Clock,
  ShieldCheck,
  FileText,
  CheckCircle2,
  Loader2,
  Building2,
  Banknote,
  Globe2,
  Receipt,
} from 'lucide-react'
import { toast } from 'sonner'
import { useAppStore } from '@/lib/store'
import { useI18n } from '@/lib/use-i18n'
import { useApi, apiPost, apiPatch } from '@/lib/use-api'
import { useMounted } from '@/lib/use-mounted'
import type { Corridor, CrossBorderPayment, PaymentStatus } from '@/lib/types'
import { formatNumber, timeAgo } from '@/lib/format'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Separator } from '@/components/ui/separator'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { TxRowSkeleton } from '@/components/page-skeleton'

const CORRIDORS: Corridor[] = [
  { id: 'RU-CN', name: 'Россия → Китай', from: 'RUB', to: 'CNY', rate: 0.083, fee: 0.008, eta: '15-40 мин', flag: '🇨🇳' },
  { id: 'RU-AE', name: 'Россия → ОАЭ', from: 'RUB', to: 'AED', rate: 0.04, fee: 0.012, eta: '1-3 часа', flag: '🇦🇪' },
  { id: 'RU-TR', name: 'Россия → Турция', from: 'RUB', to: 'TRY', rate: 0.34, fee: 0.009, eta: '30-60 мин', flag: '🇹🇷' },
  { id: 'RU-IN', name: 'Россия → Индия', from: 'RUB', to: 'INR', rate: 0.91, fee: 0.011, eta: '1-2 часа', flag: '🇮🇳' },
  { id: 'RU-KZ', name: 'Россия → Казахстан', from: 'RUB', to: 'KZT', rate: 5.5, fee: 0.006, eta: '10-30 мин', flag: '🇰🇿' },
  { id: 'RU-AM', name: 'Россия → Армения', from: 'RUB', to: 'AMD', rate: 4.2, fee: 0.007, eta: '15-45 мин', flag: '🇦🇲' },
]

// Normalize a raw API payment record into the frontend CrossBorderPayment type.
// The API stores `corridor` as the corridor id (e.g. 'RU-CN'); the frontend uses
// the localized corridor name. We translate here so the rest of the UI is untouched.
function normalizeApiPayment(raw: any): CrossBorderPayment {
  const corridorId: string = raw.corridor ?? ''
  const corridorObj = CORRIDORS.find((c) => c.id === corridorId)
  return {
    id: raw.id,
    corridor: corridorObj?.name ?? raw.corridor ?? '',
    fromCurrency: raw.fromCurrency ?? corridorObj?.from ?? 'RUB',
    toCurrency: raw.toCurrency ?? corridorObj?.to ?? '',
    amount: Number(raw.amount ?? 0),
    receiveAmount: Number(raw.receiveAmount ?? 0),
    fee: Number(raw.fee ?? 0),
    rate: Number(raw.rate ?? 0),
    beneficiary: raw.beneficiary ?? '',
    purpose: raw.purpose ?? '',
    status: (raw.status ?? 'INITIATED') as PaymentStatus,
    createdAt: raw.createdAt ?? new Date().toISOString(),
  }
}

const STATUS_FLOW: PaymentStatus[] = [
  'INITIATED',
  'CC_PENDING',
  'LIQUIDITY',
  'CONVERTING',
  'SENDING',
  'SETTLED',
]

const STATUS_LABEL_KEY: Record<PaymentStatus, string> = {
  INITIATED: 'payments.status.INITIATED',
  CC_PENDING: 'payments.status.CC_PENDING',
  LIQUIDITY: 'payments.status.LIQUIDITY',
  CONVERTING: 'payments.status.CONVERTING',
  SENDING: 'payments.status.SENDING',
  SETTLED: 'payments.status.SETTLED',
  FAILED: 'payments.status.FAILED',
}

const STATUS_DESCRIPTION_KEY: Record<PaymentStatus, string> = {
  INITIATED: 'payments.desc.INITIATED',
  CC_PENDING: 'payments.desc.CC_PENDING',
  LIQUIDITY: 'payments.desc.LIQUIDITY',
  CONVERTING: 'payments.desc.CONVERTING',
  SENDING: 'payments.desc.SENDING',
  SETTLED: 'payments.desc.SETTLED',
  FAILED: 'payments.desc.FAILED',
}

function corridorName(id: string, t: (k: string) => string): string {
  const key = `payments.corridor.${id.toLowerCase()}`
  return t(key)
}

function corridorEta(id: string, t: (k: string) => string): string {
  const idx = CORRIDORS.findIndex((c) => c.id === id)
  if (idx < 0) return ''
  return t(`payments.corridor.eta-${idx + 1}`)
}

function statusIndex(status: PaymentStatus): number {
  const i = STATUS_FLOW.indexOf(status)
  return i === -1 ? 0 : i
}

function PaymentStepper({ payment }: { payment: CrossBorderPayment }) {
  const { t } = useI18n()
  const current = statusIndex(payment.status)
  const failed = payment.status === 'FAILED'
  return (
    <ol className="relative pl-5 space-y-2.5">
      <span
        className="absolute left-[5px] top-1.5 bottom-1.5 w-px bg-border"
        aria-hidden
      />
      {STATUS_FLOW.map((s, i) => {
        const done = i < current
        const active = i === current && !failed
        const isLast = i === STATUS_FLOW.length - 1
        return (
          <li key={s} className="relative flex items-start gap-3">
            <span
              className={cn(
                'absolute -left-5 top-0.5 w-2.5 h-2.5 rounded-full ring-4 ring-background',
                done && 'bg-success',
                active && 'bg-primary animate-pulse',
                !done && !active && 'bg-muted-foreground/40'
              )}
              aria-hidden
            />
            <div className="min-w-0">
              <div
                className={cn(
                  'text-xs font-medium leading-tight',
                  active && 'text-primary',
                  done && 'text-success',
                  !done && !active && 'text-muted-foreground'
                )}
              >
                {t(STATUS_LABEL_KEY[s])}
              </div>
              {(active || (isLast && done)) && (
                <div className="text-[10px] text-muted-foreground mt-0.5">
                  {t(STATUS_DESCRIPTION_KEY[s])}
                </div>
              )}
            </div>
          </li>
        )
      })}
      {failed && (
        <li className="relative flex items-start gap-3">
          <span
            className="absolute -left-5 top-0.5 w-2.5 h-2.5 rounded-full bg-destructive ring-4 ring-background"
            aria-hidden
          />
          <div className="text-xs font-medium text-destructive">{t('payments.status.FAILED')}</div>
        </li>
      )}
    </ol>
  )
}

function NewPaymentForm({ onCreated }: { onCreated?: () => void }) {
  const { t } = useI18n()
  const createPayment = useAppStore((s) => s.createPayment)
  const updatePaymentStatus = useAppStore((s) => s.updatePaymentStatus)
  const pushNotification = useAppStore((s) => s.pushNotification)
  const timersRef = useRef<Record<string, ReturnType<typeof setInterval> | undefined>>({})

  const [corridorId, setCorridorId] = useState(CORRIDORS[0].id)
  const [amount, setAmount] = useState('100000')
  const [beneficiary, setBeneficiary] = useState('')
  const [account, setAccount] = useState('')
  const [swift, setSwift] = useState('')
  const [purpose, setPurpose] = useState(t('payments.form.defaultPurpose'))
  const [submitting, setSubmitting] = useState(false)

  const corridor = CORRIDORS.find((c) => c.id === corridorId)!
  const amountNum = parseFloat(amount.replace(/\s/g, '').replace(',', '.')) || 0
  const feeAmount = amountNum * corridor.fee
  const receiveAmount = amountNum * corridor.rate * (1 - corridor.fee)

  useEffect(() => {
    return () => {
      Object.values(timersRef.current).forEach((t) => t && clearInterval(t))
    }
  }, [])

  const handleSubmit = async () => {
    if (amountNum <= 0) {
      toast.error(t('payments.toast.amountRequired'))
      return
    }
    if (!beneficiary.trim()) {
      toast.error(t('payments.toast.beneficiaryRequired'))
      return
    }
    if (!account.trim()) {
      toast.error(t('payments.toast.accountRequired'))
      return
    }
    if (!swift.trim()) {
      toast.error(t('payments.toast.swiftRequired'))
      return
    }
    setSubmitting(true)
    // Persist payment via API (resilience: local store mirror happens regardless)
    let apiId: string | null = null
    try {
      const res = await apiPost<{ payment: { id: string } }>('/api/payments', {
        corridor: corridor.id,
        amount: amountNum,
        beneficiary: beneficiary.trim(),
        purpose: purpose.trim(),
        account: account.trim(),
        swift: swift.trim(),
      })
      apiId = res?.payment?.id ?? null
    } catch {
      // Ignore API error — local store mirror is still created below
    }
    const id = createPayment({
      corridor: corridor.name,
      fromCurrency: corridor.from,
      toCurrency: corridor.to,
      amount: amountNum,
      receiveAmount,
      fee: feeAmount,
      rate: corridor.rate,
      beneficiary: beneficiary.trim(),
      purpose: purpose.trim(),
    })
    toast.success(t('payments.toast.created'), {
      description: `${formatNumber(amountNum)} ${corridor.from} → ${corridor.to}`,
    })
    setSubmitting(false)
    // Refresh the API-sourced list so the new payment appears immediately
    onCreated?.()

    // Status simulation (existing behaviour): advance the local record through
    // the regulatory step flow so the stepper animates in the UI. The API record
    // is also advanced in lockstep so the persisted status stays consistent.
    let step = 0
    if (timersRef.current[id]) clearInterval(timersRef.current[id]!)
    timersRef.current[id] = setInterval(() => {
      step += 1
      if (step >= STATUS_FLOW.length) {
        const t = timersRef.current[id]
        if (t) clearInterval(t)
        delete timersRef.current[id]
        if (apiId) {
          apiPatch('/api/payments', { id: apiId, status: 'SETTLED' }).catch(() => {})
        }
        pushNotification(
          t('payments.toast.settled'),
          `${formatNumber(amountNum)} ${corridor.from} → ${formatNumber(receiveAmount)} ${corridor.to}`
        )
        onCreated?.()
        return
      }
      const next = STATUS_FLOW[step]
      updatePaymentStatus(id, next)
      if (apiId) {
        apiPatch('/api/payments', { id: apiId, status: next }).catch(() => {})
      }
      pushNotification(`${t('payments.toast.statusUpdate')} ${t(STATUS_LABEL_KEY[next])}`, t(STATUS_DESCRIPTION_KEY[next]))
    }, 3500)
  }

  return (
    <Card className="bg-card/60 backdrop-blur">
      <CardHeader>
        <div className="flex items-center gap-2">
          <div className="w-9 h-9 rounded-xl bg-primary/15 text-primary flex items-center justify-center">
            <Send className="w-5 h-5" />
          </div>
          <div>
            <CardTitle className="text-base">{t('payments.form.title')}</CardTitle>
            <CardDescription className="text-xs">
              {t('payments.form.subtitle')}
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground">{t('payments.form.corridor')}</Label>
          <Select value={corridorId} onValueChange={setCorridorId}>
            <SelectTrigger className="w-full h-10">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {CORRIDORS.map((c) => (
                <SelectItem key={c.id} value={c.id}>
                  <span className="text-base mr-1.5">{c.flag}</span>
                  <span className="flex-1">{corridorName(c.id, t)}</span>
                  <Badge variant="outline" className="ml-2 text-[10px]">
                    {corridorEta(c.id, t)}
                  </Badge>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground">{t('payments.form.amount')}</Label>
          <div className="relative">
            <Input
              inputMode="decimal"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="h-12 text-xl font-mono tabular-nums pr-14 bg-input/40"
              placeholder="0"
            />
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm font-semibold text-muted-foreground">
              {corridor.from}
            </span>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">{t('payments.form.beneficiary')}</Label>
            <Input
              value={beneficiary}
              onChange={(e) => setBeneficiary(e.target.value)}
              placeholder={t('payments.form.beneficiaryPlaceholder')}
              className="bg-input/40"
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">{t('payments.form.account')}</Label>
            <Input
              value={account}
              onChange={(e) => setAccount(e.target.value)}
              placeholder="CN12 3456 7890 1234"
              className="bg-input/40 font-mono text-xs"
            />
          </div>
        </div>

        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground">{t('payments.form.swift')}</Label>
          <Input
            value={swift}
            onChange={(e) => setSwift(e.target.value.toUpperCase())}
            placeholder="BKCHCNBJXXX"
            className="bg-input/40 font-mono uppercase"
          />
        </div>

        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground">{t('payments.form.purpose')}</Label>
          <Textarea
            value={purpose}
            onChange={(e) => setPurpose(e.target.value)}
            rows={2}
            className="bg-input/40 text-sm resize-none"
          />
        </div>

        {/* Live computed summary */}
        <div className="rounded-xl border border-border bg-muted/30 p-3 space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="text-muted-foreground">{t('payments.form.rate')}</span>
            <span className="font-mono">
              1 {corridor.from} = {corridor.rate} {corridor.to}
            </span>
          </div>
          <div className="flex items-center justify-between text-xs">
            <span className="text-muted-foreground">{t('payments.form.corridorFee')} ({(corridor.fee * 100).toFixed(1)}%)</span>
            <span className="font-mono text-muted-foreground">
              −{formatNumber(feeAmount)} {corridor.from}
            </span>
          </div>
          <Separator />
          <div className="flex items-center justify-between">
            <span className="sm:text-muted-foreground">{t('payments.form.receive')}</span>
            <span className="text-lg font-mono font-bold text-primary tabular-nums">
              {formatNumber(receiveAmount)} {corridor.to}
            </span>
          </div>
          <div className="flex items-center justify-between text-[11px] pt-1">
            <span className="flex items-center gap-1 text-muted-foreground">
              <Clock className="w-3 h-3" /> ETA
            </span>
            <span className="font-medium">{corridorEta(corridor.id, t)}</span>
          </div>
        </div>

        <Button
          onClick={handleSubmit}
          disabled={submitting}
          className="w-full h-10 bg-primary text-primary-foreground hover:bg-primary/90 gap-2 font-semibold"
        >
          {submitting ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Send className="w-4 h-4" />
          )}
          {t('payments.form.submit')}
        </Button>
      </CardContent>
    </Card>
  )
}

function CorridorsCard() {
  const { t } = useI18n()
  return (
    <Card className="bg-card/60 backdrop-blur">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-xl bg-primary/15 text-primary flex items-center justify-center">
              <Globe2 className="w-5 h-5" />
            </div>
            <div>
              <CardTitle className="text-base">{t('payments.corridors.title')}</CardTitle>
              <CardDescription className="text-xs">
                {t('payments.corridors.subtitle')}
              </CardDescription>
            </div>
          </div>
          <Badge variant="outline" className="text-[10px] border-success/40 text-success">
            <span className="w-1.5 h-1.5 rounded-full bg-success mr-1" />
            ONLINE
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-2">
        {CORRIDORS.map((c) => (
          <div
            key={c.id}
            className="flex items-center justify-between p-2.5 rounded-lg border border-border bg-muted/20 hover:border-primary/30 transition group"
          >
            <div className="flex items-center gap-2.5 min-w-0">
              <span className="text-xl leading-none">{c.flag}</span>
              <div className="min-w-0">
                <div className="text-sm font-medium truncate">{corridorName(c.id, t)}</div>
                <div className="text-[11px] text-muted-foreground font-mono">
                  1 {c.from} = {c.rate} {c.to}
                </div>
              </div>
            </div>
            <div className="text-right shrink-0">
              <div className="text-xs font-medium text-success">
                fee {(c.fee * 100).toFixed(1)}%
              </div>
              <div className="text-[10px] text-muted-foreground flex items-center gap-1 justify-end">
                <Clock className="w-2.5 h-2.5" />
                {corridorEta(c.id, t)}
              </div>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  )
}

function MyPayments({
  apiPayments,
  loading,
}: {
  apiPayments: CrossBorderPayment[] | null
  loading: boolean
}) {
  const { t } = useI18n()
  const storePayments = useAppStore((s) => s.payments)
  const mounted = useMounted()
  // Prefer API payments when present; fall back to store for resilience.
  // Also surface store-only payments (e.g. the just-created local record whose
  // status simulation is mid-flight) so the UI doesn't lose them.
  const payments = apiPayments && apiPayments.length > 0 ? apiPayments : storePayments

  // First-paint skeleton: API still loading, no payments to show yet
  if (loading && !apiPayments && storePayments.length === 0) {
    return (
      <Card className="bg-card/60 backdrop-blur">
        <CardHeader>
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-xl bg-primary/15 text-primary flex items-center justify-center">
              <Receipt className="w-5 h-5" />
            </div>
            <div className="space-y-1.5">
              <Skeleton className="h-4 w-28" />
              <Skeleton className="h-3 w-40" />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-2.5">
            {Array.from({ length: 3 }).map((_, i) => (
              <div
                key={i}
                className="p-3 rounded-xl border border-border bg-muted/20"
              >
                <div className="flex items-start justify-between gap-3 mb-2.5">
                  <div className="flex items-center gap-2.5">
                    <Skeleton className="w-8 h-8 rounded-lg" />
                    <div className="space-y-1.5">
                      <Skeleton className="h-3.5 w-32" />
                      <Skeleton className="h-2.5 w-24" />
                    </div>
                  </div>
                  <Skeleton className="h-5 w-20 rounded-md" />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <Skeleton className="h-8 w-full rounded-md" />
                  <Skeleton className="h-8 w-full rounded-md" />
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="bg-card/60 backdrop-blur">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-xl bg-primary/15 text-primary flex items-center justify-center">
              <Receipt className="w-5 h-5" />
            </div>
            <div>
              <CardTitle className="text-base">{t('payments.mine.title')}</CardTitle>
              <CardDescription className="text-xs">
                {payments.length > 0
                  ? `${payments.length} ${payments.length === 1 ? t('payments.mine.countSingular') : t('payments.mine.countPlural')}`
                  : t('payments.mine.emptyActive')}
              </CardDescription>
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {payments.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-10 text-center">
            <div className="w-12 h-12 rounded-2xl bg-muted/40 flex items-center justify-center mb-2.5">
              <Send className="w-6 h-6 text-muted-foreground" />
            </div>
            <div className="text-sm font-medium">{t('payments.mine.emptyTitle')}</div>
            <div className="text-xs text-muted-foreground mt-1 max-w-xs">
              {t('payments.mine.emptyHint')}
            </div>
          </div>
        ) : (
          <div className="space-y-2.5 max-h-[520px] overflow-y-auto scrollbar-thin pr-1">
            {payments.map((p, i) => {
              const corridorObj = CORRIDORS.find((c) => c.name === p.corridor) || CORRIDORS.find((c) => c.id === p.corridor)
              const flag = corridorObj?.flag || '🌐'
              const corridorDisplay = corridorObj ? corridorName(corridorObj.id, t) : p.corridor
              return (
                <motion.div
                  key={p.id}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.22, delay: Math.min(i * 0.03, 0.4), ease: 'easeOut' }}
                  className="p-3 rounded-xl border border-border bg-muted/20 hover:border-primary/30 transition"
                >
                  <div className="flex items-start justify-between gap-3 mb-2.5">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <span className="text-2xl leading-none">{flag}</span>
                      <div className="min-w-0">
                        <div className="text-sm font-medium truncate">{p.beneficiary}</div>
                        <div className="text-[11px] text-muted-foreground">
                          {corridorDisplay} • {mounted ? timeAgo(p.createdAt) : ''}
                        </div>
                      </div>
                    </div>
                    <Badge
                      variant="outline"
                      className={cn(
                        'shrink-0 text-[10px]',
                        p.status === 'SETTLED' && 'border-success/40 text-success bg-success/10',
                        p.status === 'FAILED' && 'border-destructive/40 text-destructive bg-destructive/10',
                        p.status !== 'SETTLED' &&
                          p.status !== 'FAILED' &&
                          'border-primary/40 text-primary bg-primary/10'
                      )}
                    >
                      {t(STATUS_LABEL_KEY[p.status])}
                    </Badge>
                  </div>

                  <div className="grid grid-cols-[1fr_auto] gap-x-4 gap-y-1 mb-2.5">
                    <div className="text-[11px] text-muted-foreground">{t('payments.mine.sent')}</div>
                    <div className="text-[11px] text-muted-foreground text-right">{t('payments.mine.received')}</div>
                    <div className="text-sm font-mono font-semibold">
                      {formatNumber(p.amount)} {p.fromCurrency}
                    </div>
                    <div className="text-sm font-mono font-semibold text-primary text-right">
                      {formatNumber(p.receiveAmount)} {p.toCurrency}
                    </div>
                  </div>

                  <PaymentStepper payment={p} />
                </motion.div>
              )
            })}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

function RegulatoryNote() {
  const { t } = useI18n()
  return (
    <Card className="bg-gradient-to-r from-primary/5 via-card to-card border-primary/20">
      <CardContent className="flex items-start gap-3 p-4">
        <div className="w-9 h-9 rounded-xl bg-primary/15 text-primary flex items-center justify-center shrink-0">
          <ShieldCheck className="w-5 h-5" />
        </div>
        <div className="text-sm">
          <div className="font-semibold mb-1 flex items-center gap-2">
            {t('payments.regulatory.title')}
            <Badge variant="outline" className="text-[10px] border-primary/30 text-primary">
              {t('payments.regulatory.badge')}
            </Badge>
          </div>
          <p className="text-muted-foreground text-xs leading-relaxed">
            {t('payments.regulatory.desc')}
          </p>
          <div className="flex flex-wrap gap-2.5 mt-2.5 text-[11px] text-muted-foreground">
            <span className="flex items-center gap-1">
              <FileText className="w-3 h-3 text-primary" /> {t('payments.regulatory.dealPassport')}
            </span>
            <span className="flex items-center gap-1">
              <FileText className="w-3 h-3 text-primary" /> {t('payments.regulatory.ufed')}
            </span>
            <span className="flex items-center gap-1">
              <CheckCircle2 className="w-3 h-3 text-success" /> {t('payments.regulatory.cbReport')}
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

export function PaymentsView() {
  const { t } = useI18n()
  // Refresh trigger — bump after a payment is created to refetch from /api/payments
  const [refreshKey, setRefreshKey] = useState(0)
  const paymentsUrl = refreshKey ? `/api/payments?t=${refreshKey}` : '/api/payments'
  const { data, loading } = useApi<{ payments: any[] }>(paymentsUrl)

  const apiPayments: CrossBorderPayment[] | null =
    data?.payments && Array.isArray(data.payments) && data.payments.length > 0
      ? data.payments.map(normalizeApiPayment)
      : null

  const refresh = () => setRefreshKey((k) => k + 1)

  return (
    <div className="flex-1 py-4">
      <div className="max-w-[1400px] mx-auto px-3 lg:px-5 space-y-4">
        {/* Header */}
        <header className="flex flex-col lg:flex-row lg:items-end justify-between gap-3">
          <div>
            <div className="flex items-center gap-2 mb-1.5">
              <Badge variant="outline" className="border-primary/30 text-primary gap-1.5">
                <Send className="w-3 h-3" />
                CROSS-BORDER
              </Badge>
              <Badge variant="outline" className="text-[10px] text-muted-foreground">
                {t('payments.header.173fz')}
              </Badge>
            </div>
            <h1 className="text-xl lg:text-2xl font-bold tracking-tight">
              {t('payments.header.title')}
            </h1>
            <p className="text-xs text-muted-foreground mt-1">
              {t('payments.header.subtitle')}
            </p>
          </div>
          <div className="flex items-center gap-2.5">
            <div className="flex items-center gap-2 px-2.5 py-1.5 rounded-xl bg-muted/40 border border-border">
              <Building2 className="w-4 h-4 text-primary" />
              <div className="text-xs">
                <div className="text-muted-foreground">{t('payments.header.correspondent')}</div>
                <div className="font-semibold"> Gazprombank (RUB)</div>
              </div>
            </div>
            <div className="hidden sm:flex items-center gap-2 px-2.5 py-1.5 rounded-xl bg-muted/40 border border-border">
              <Banknote className="w-4 h-4 text-success" />
              <div className="text-xs">
                <div className="text-muted-foreground">{t('payments.header.liquidity24')}</div>
                <div className="font-semibold">$8.4M</div>
              </div>
            </div>
          </div>
        </header>

        {/* Two-column layout */}
        <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,420px)_minmax(0,1fr)] gap-4">
          <div className="space-y-4">
            <NewPaymentForm onCreated={refresh} />
          </div>
          <div className="space-y-4">
            {/* First-paint skeletons for corridors card + my payments */}
            {loading && !data ? (
              <>
                {/* Corridors skeleton (2 cards) */}
                <Card className="bg-card/60 backdrop-blur">
                  <CardHeader>
                    <div className="flex items-center gap-2">
                      <div className="w-9 h-9 rounded-xl bg-primary/15 text-primary flex items-center justify-center">
                        <Globe2 className="w-5 h-5" />
                      </div>
                      <div className="space-y-1.5">
                        <Skeleton className="h-4 w-36" />
                        <Skeleton className="h-3 w-44" />
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    {Array.from({ length: 2 }).map((_, i) => (
                      <div
                        key={i}
                        className="flex items-center justify-between p-2.5 rounded-lg border border-border bg-muted/20"
                      >
                        <div className="flex items-center gap-2.5">
                          <Skeleton className="w-6 h-6 rounded-md" />
                          <div className="space-y-1.5">
                            <Skeleton className="h-3 w-32" />
                            <Skeleton className="h-2.5 w-20" />
                          </div>
                        </div>
                        <div className="text-right space-y-1.5">
                          <Skeleton className="h-2.5 w-12 ml-auto" />
                          <Skeleton className="h-2.5 w-16 ml-auto" />
                        </div>
                      </div>
                    ))}
                  </CardContent>
                </Card>
                {/* My payments skeleton (3 rows) */}
                <Card className="bg-card/60 backdrop-blur">
                  <CardHeader>
                    <div className="flex items-center gap-2">
                      <div className="w-9 h-9 rounded-xl bg-primary/15 text-primary flex items-center justify-center">
                        <Receipt className="w-5 h-5" />
                      </div>
                      <div className="space-y-1.5">
                        <Skeleton className="h-4 w-28" />
                        <Skeleton className="h-3 w-40" />
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2.5">
                      {Array.from({ length: 3 }).map((_, i) => (
                        <TxRowSkeleton key={i} />
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </>
            ) : (
              <>
                <CorridorsCard />
                <MyPayments apiPayments={apiPayments} loading={loading} />
              </>
            )}
          </div>
        </div>

        <RegulatoryNote />
      </div>
    </div>
  )
}
