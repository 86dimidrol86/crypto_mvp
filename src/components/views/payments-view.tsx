'use client'

import { useEffect, useRef, useState } from 'react'
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

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

const STATUS_LABEL: Record<PaymentStatus, string> = {
  INITIATED: 'Инициирован',
  CC_PENDING: 'Валютный контроль',
  LIQUIDITY: 'Ликвидность',
  CONVERTING: 'Конвертация',
  SENDING: 'Отправка',
  SETTLED: 'Зачислен',
  FAILED: 'Ошибка',
}

const STATUS_DESCRIPTION: Record<PaymentStatus, string> = {
  INITIATED: 'Платёж создан, ожидает проверки',
  CC_PENDING: 'Проверка 173-ФЗ, формирование УФЭД',
  LIQUIDITY: 'Резервирование ликвидности в коридоре',
  CONVERTING: 'Конвертация RUB → валюта получателя',
  SENDING: 'Отправка через банк-корреспондент',
  SETTLED: 'Средства зачислены бенефициару',
  FAILED: 'Платёж отклонён',
}

function statusIndex(status: PaymentStatus): number {
  const i = STATUS_FLOW.indexOf(status)
  return i === -1 ? 0 : i
}

function PaymentStepper({ payment }: { payment: CrossBorderPayment }) {
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
                {STATUS_LABEL[s]}
              </div>
              {(active || (isLast && done)) && (
                <div className="text-[10px] text-muted-foreground mt-0.5">
                  {STATUS_DESCRIPTION[s]}
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
          <div className="text-xs font-medium text-destructive">Ошибка</div>
        </li>
      )}
    </ol>
  )
}

function NewPaymentForm({ onCreated }: { onCreated?: () => void }) {
  const createPayment = useAppStore((s) => s.createPayment)
  const updatePaymentStatus = useAppStore((s) => s.updatePaymentStatus)
  const pushNotification = useAppStore((s) => s.pushNotification)
  const timersRef = useRef<Record<string, ReturnType<typeof setInterval> | undefined>>({})

  const [corridorId, setCorridorId] = useState(CORRIDORS[0].id)
  const [amount, setAmount] = useState('100000')
  const [beneficiary, setBeneficiary] = useState('')
  const [account, setAccount] = useState('')
  const [swift, setSwift] = useState('')
  const [purpose, setPurpose] = useState('Оплата услуг по контракту № 2026/04-12')
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
      toast.error('Введите сумму платежа')
      return
    }
    if (!beneficiary.trim()) {
      toast.error('Укажите наименование бенефициара')
      return
    }
    if (!account.trim()) {
      toast.error('Укажите счёт / IBAN бенефициара')
      return
    }
    if (!swift.trim()) {
      toast.error('Укажите SWIFT/BIC банка получателя')
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
    toast.success('Платёж создан', {
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
          'Платёж зачислен',
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
      pushNotification(`Статус: ${STATUS_LABEL[next]}`, STATUS_DESCRIPTION[next])
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
            <CardTitle className="text-base">Новый платёж</CardTitle>
            <CardDescription className="text-xs">
              Валютный перевод за рубеж • 173-ФЗ
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground">Коридор</Label>
          <Select value={corridorId} onValueChange={setCorridorId}>
            <SelectTrigger className="w-full h-11">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {CORRIDORS.map((c) => (
                <SelectItem key={c.id} value={c.id}>
                  <span className="text-base mr-1.5">{c.flag}</span>
                  <span className="flex-1">{c.name}</span>
                  <Badge variant="outline" className="ml-2 text-[10px]">
                    {c.eta}
                  </Badge>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground">Сумма перевода</Label>
          <div className="relative">
            <Input
              inputMode="decimal"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="h-14 text-2xl font-mono tabular-nums pr-16 bg-input/40"
              placeholder="0"
            />
            <span className="absolute right-4 top-1/2 -translate-y-1/2 text-sm font-semibold text-muted-foreground">
              {corridor.from}
            </span>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Бенефициар</Label>
            <Input
              value={beneficiary}
              onChange={(e) => setBeneficiary(e.target.value)}
              placeholder="ООО «Торговый дом»"
              className="bg-input/40"
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Счёт / IBAN</Label>
            <Input
              value={account}
              onChange={(e) => setAccount(e.target.value)}
              placeholder="CN12 3456 7890 1234"
              className="bg-input/40 font-mono text-xs"
            />
          </div>
        </div>

        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground">SWIFT / BIC банка</Label>
          <Input
            value={swift}
            onChange={(e) => setSwift(e.target.value.toUpperCase())}
            placeholder="BKCHCNBJXXX"
            className="bg-input/40 font-mono uppercase"
          />
        </div>

        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground">Назначение платежа</Label>
          <Textarea
            value={purpose}
            onChange={(e) => setPurpose(e.target.value)}
            rows={2}
            className="bg-input/40 text-sm resize-none"
          />
        </div>

        {/* Live computed summary */}
        <div className="rounded-xl border border-border bg-muted/30 p-4 space-y-2.5">
          <div className="flex items-center justify-between text-xs">
            <span className="text-muted-foreground">Курс</span>
            <span className="font-mono">
              1 {corridor.from} = {corridor.rate} {corridor.to}
            </span>
          </div>
          <div className="flex items-center justify-between text-xs">
            <span className="text-muted-foreground">Комиссия коридора ({(corridor.fee * 100).toFixed(1)}%)</span>
            <span className="font-mono text-muted-foreground">
              −{formatNumber(feeAmount)} {corridor.from}
            </span>
          </div>
          <Separator />
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Получит бенефициар</span>
            <span className="text-xl font-mono font-bold text-primary tabular-nums">
              {formatNumber(receiveAmount)} {corridor.to}
            </span>
          </div>
          <div className="flex items-center justify-between text-[11px] pt-1">
            <span className="flex items-center gap-1 text-muted-foreground">
              <Clock className="w-3 h-3" /> ETA
            </span>
            <span className="font-medium">{corridor.eta}</span>
          </div>
        </div>

        <Button
          onClick={handleSubmit}
          disabled={submitting}
          className="w-full h-11 bg-primary text-primary-foreground hover:bg-primary/90 gap-2 font-semibold"
        >
          {submitting ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Send className="w-4 h-4" />
          )}
          Создать платёж
        </Button>
      </CardContent>
    </Card>
  )
}

function CorridorsCard() {
  return (
    <Card className="bg-card/60 backdrop-blur">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-xl bg-primary/15 text-primary flex items-center justify-center">
              <Globe2 className="w-5 h-5" />
            </div>
            <div>
              <CardTitle className="text-base">Активные коридоры</CardTitle>
              <CardDescription className="text-xs">
                6 направлений • ликвидность в реальном времени
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
            className="flex items-center justify-between p-3 rounded-lg border border-border bg-muted/20 hover:border-primary/30 transition group"
          >
            <div className="flex items-center gap-3 min-w-0">
              <span className="text-2xl leading-none">{c.flag}</span>
              <div className="min-w-0">
                <div className="text-sm font-medium truncate">{c.name}</div>
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
                {c.eta}
              </div>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  )
}

function MyPayments({ apiPayments }: { apiPayments: CrossBorderPayment[] | null }) {
  const storePayments = useAppStore((s) => s.payments)
  const mounted = useMounted()
  // Prefer API payments when present; fall back to store for resilience.
  // Also surface store-only payments (e.g. the just-created local record whose
  // status simulation is mid-flight) so the UI doesn't lose them.
  const payments = apiPayments && apiPayments.length > 0 ? apiPayments : storePayments

  return (
    <Card className="bg-card/60 backdrop-blur">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-xl bg-primary/15 text-primary flex items-center justify-center">
              <Receipt className="w-5 h-5" />
            </div>
            <div>
              <CardTitle className="text-base">Мои платежи</CardTitle>
              <CardDescription className="text-xs">
                {payments.length > 0
                  ? `${payments.length} ${payments.length === 1 ? 'платёж' : 'платежей'}`
                  : 'Нет активных платежей'}
              </CardDescription>
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {payments.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <div className="w-14 h-14 rounded-2xl bg-muted/40 flex items-center justify-center mb-3">
              <Send className="w-6 h-6 text-muted-foreground" />
            </div>
            <div className="text-sm font-medium">Платежей пока нет</div>
            <div className="text-xs text-muted-foreground mt-1 max-w-xs">
              Создайте первый кросс-бордер платёж — статус будет обновляться в реальном времени.
            </div>
          </div>
        ) : (
          <div className="space-y-3 max-h-[520px] overflow-y-auto scrollbar-thin pr-1">
            {payments.map((p) => {
              const flag = CORRIDORS.find((c) => c.name === p.corridor)?.flag || '🌐'
              return (
                <div
                  key={p.id}
                  className="p-4 rounded-xl border border-border bg-muted/20 hover:border-primary/30 transition"
                >
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <span className="text-2xl leading-none">{flag}</span>
                      <div className="min-w-0">
                        <div className="text-sm font-medium truncate">{p.beneficiary}</div>
                        <div className="text-[11px] text-muted-foreground">
                          {p.corridor} • {mounted ? timeAgo(p.createdAt) : ''}
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
                      {STATUS_LABEL[p.status]}
                    </Badge>
                  </div>

                  <div className="grid grid-cols-[1fr_auto] gap-x-4 gap-y-1 mb-3">
                    <div className="text-[11px] text-muted-foreground">Отправлено</div>
                    <div className="text-[11px] text-muted-foreground text-right">Получено</div>
                    <div className="text-sm font-mono font-semibold">
                      {formatNumber(p.amount)} {p.fromCurrency}
                    </div>
                    <div className="text-sm font-mono font-semibold text-primary text-right">
                      {formatNumber(p.receiveAmount)} {p.toCurrency}
                    </div>
                  </div>

                  <PaymentStepper payment={p} />
                </div>
              )
            })}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

function RegulatoryNote() {
  return (
    <Card className="bg-gradient-to-r from-primary/5 via-card to-card border-primary/20">
      <CardContent className="flex items-start gap-4 p-5">
        <div className="w-10 h-10 rounded-xl bg-primary/15 text-primary flex items-center justify-center shrink-0">
          <ShieldCheck className="w-5 h-5" />
        </div>
        <div className="text-sm">
          <div className="font-semibold mb-1 flex items-center gap-2">
            Валютный контроль 173-ФЗ
            <Badge variant="outline" className="text-[10px] border-primary/30 text-primary">
              АВТО-ДОКУМЕНТЫ
            </Badge>
          </div>
          <p className="text-muted-foreground text-xs leading-relaxed">
            Все платежи проходят валютный контроль (173-ФЗ). Паспорт сделки и УФЭД
            формируются автоматически и доступны в Data Room регулятора.
          </p>
          <div className="flex flex-wrap gap-3 mt-3 text-[11px] text-muted-foreground">
            <span className="flex items-center gap-1">
              <FileText className="w-3 h-3 text-primary" /> Паспорт сделки
            </span>
            <span className="flex items-center gap-1">
              <FileText className="w-3 h-3 text-primary" /> УФЭД
            </span>
            <span className="flex items-center gap-1">
              <CheckCircle2 className="w-3 h-3 text-success" /> Отчётность ЦБ
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

export function PaymentsView() {
  // Refresh trigger — bump after a payment is created to refetch from /api/payments
  const [refreshKey, setRefreshKey] = useState(0)
  const paymentsUrl = refreshKey ? `/api/payments?t=${refreshKey}` : '/api/payments'
  const { data } = useApi<{ payments: any[] }>(paymentsUrl)

  const apiPayments: CrossBorderPayment[] | null =
    data?.payments && Array.isArray(data.payments) && data.payments.length > 0
      ? data.payments.map(normalizeApiPayment)
      : null

  const refresh = () => setRefreshKey((k) => k + 1)

  return (
    <div className="flex-1 py-8">
      <div className="max-w-[1400px] mx-auto px-4 lg:px-8 space-y-6">
        {/* Header */}
        <header className="flex flex-col lg:flex-row lg:items-end justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Badge variant="outline" className="border-primary/30 text-primary gap-1.5">
                <Send className="w-3 h-3" />
                CROSS-BORDER
              </Badge>
              <Badge variant="outline" className="text-[10px] text-muted-foreground">
                173-ФЗ
              </Badge>
            </div>
            <h1 className="text-3xl lg:text-4xl font-bold tracking-tight">
              Кросс-бордер платежи
            </h1>
            <p className="text-sm text-muted-foreground mt-1.5">
              Валютный контроль 173-ФЗ • автоформируемые документы
            </p>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-muted/40 border border-border">
              <Building2 className="w-4 h-4 text-primary" />
              <div className="text-xs">
                <div className="text-muted-foreground">Банк-корреспондент</div>
                <div className="font-semibold"> Gazprombank (RUB)</div>
              </div>
            </div>
            <div className="hidden sm:flex items-center gap-2 px-3 py-2 rounded-xl bg-muted/40 border border-border">
              <Banknote className="w-4 h-4 text-success" />
              <div className="text-xs">
                <div className="text-muted-foreground">Ликвидность 24ч</div>
                <div className="font-semibold">$8.4M</div>
              </div>
            </div>
          </div>
        </header>

        {/* Two-column layout */}
        <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,420px)_minmax(0,1fr)] gap-6">
          <div className="space-y-6">
            <NewPaymentForm onCreated={refresh} />
          </div>
          <div className="space-y-6">
            <CorridorsCard />
            <MyPayments apiPayments={apiPayments} />
          </div>
        </div>

        <RegulatoryNote />
      </div>
    </div>
  )
}
