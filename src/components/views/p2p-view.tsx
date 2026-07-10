'use client'

import { useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import {
  Users,
  Plus,
  Search,
  Star,
  MessageCircle,
  Check,
  X,
  Send,
  ShieldCheck,
  Clock,
  TrendingUp,
  CheckCircle2,
} from 'lucide-react'
import { useAppStore } from '@/lib/store'
import { useI18n } from '@/lib/use-i18n'
import { useApi, apiPost, apiPatch } from '@/lib/use-api'
import type { P2POffer, P2PDeal, OrderSide, DealStatus } from '@/lib/types'
import { formatNumber, formatPrice } from '@/lib/format'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { ScrollArea } from '@/components/ui/scroll-area'
import { toast } from 'sonner'
import { OfferRowSkeleton } from '@/components/page-skeleton'

const PAYMENT_METHODS = ['СБП', 'Тинькофф', 'Сбер', 'Альфа-Банк', 'Райффайзен', 'СБП + Тинькофф']

// Normalize a raw API P2P offer record into the frontend P2POffer type.
// The DB-backed offer lacks a `user` display name; we synthesize one from the id.
function normalizeApiOffer(raw: any): P2POffer {
  const id: string = raw.id ?? ''
  return {
    id,
    type: (raw.type === 'buy' || raw.type === 'sell' ? raw.type : 'sell') as OrderSide,
    asset: raw.asset ?? 'USDT',
    fiat: raw.fiat ?? 'RUB',
    price: Number(raw.price ?? 0),
    amount: Number(raw.amount ?? 0),
    user: raw.user ?? `Трейдер ${id.slice(-4)}`,
    method: raw.method ?? 'СБП',
    completed: Number(raw.completed ?? 0),
    rating: typeof raw.rating === 'number' ? raw.rating : undefined,
  }
}

// Normalize a raw API P2P deal record into the frontend P2PDeal type.
// The DB schema doesn't carry the taker's side explicitly — default to 'buy'.
function normalizeApiDeal(raw: any): P2PDeal {
  const id: string = raw.id ?? ''
  const time: string =
    raw.time ??
    (raw.createdAt
      ? new Date(raw.createdAt).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })
      : '')
  const amount = Number(raw.amount ?? 0)
  const price = Number(raw.price ?? 0)
  return {
    id,
    type: (raw.type === 'buy' || raw.type === 'sell' ? raw.type : 'buy') as OrderSide,
    asset: raw.asset ?? 'USDT',
    amount,
    price,
    total: Number(raw.total ?? amount * price),
    counterparty: raw.counterparty ?? `Контрагент ${id.slice(-4)}`,
    paymentMethod: raw.paymentMethod ?? raw.method ?? 'СБП',
    status: (raw.status ?? 'PENDING') as DealStatus,
    time,
  }
}

function Avatar({ name, size = 36 }: { name: string; size?: number }) {
  const initial = name.slice(0, 1).toUpperCase()
  const hue = (name.charCodeAt(0) * 47) % 360
  return (
    <div
      className="rounded-full flex items-center justify-center font-bold text-white shrink-0"
      style={{
        width: size,
        height: size,
        fontSize: size * 0.4,
        background: `linear-gradient(135deg, hsl(${hue} 60% 45%), hsl(${(hue + 40) % 360} 65% 35%))`,
      }}
    >
      {initial}
    </div>
  )
}

function RatingStars({ rating }: { rating: number }) {
  return (
    <span className="inline-flex items-center gap-0.5 text-[11px] text-warning">
      <Star className="w-3 h-3 fill-warning" />
      <span className="font-mono tabular-nums">{rating.toFixed(2)}</span>
    </span>
  )
}

function DealStatusBadge({ status }: { status: DealStatus }) {
  const { t } = useI18n()
  const map: Record<DealStatus, { label: string; cls: string }> = {
    PENDING: { label: t('p2p.status.PENDING'), cls: 'bg-warning/15 text-warning border-warning/30' },
    PAID: { label: t('p2p.status.PAID'), cls: 'bg-sky-500/15 text-sky-400 border-sky-500/30' },
    COMPLETED: { label: t('p2p.status.COMPLETED'), cls: 'bg-success/15 text-success border-success/30' },
    CANCELLED: { label: t('p2p.status.CANCELLED'), cls: 'bg-muted/60 text-muted-foreground border-border' },
    DISPUTE: { label: t('p2p.status.DISPUTE'), cls: 'bg-destructive/15 text-destructive border-destructive/30' },
  }
  const s = map[status]
  return (
    <Badge variant="outline" className={cn('border', s.cls)}>
      {s.label}
    </Badge>
  )
}

// ─── Offer row ──────────────────────────────────────────────────────────────
function OfferRow({
  offer,
  onAccept,
}: {
  offer: P2POffer
  onAccept: (o: P2POffer) => void
}) {
  const { t } = useI18n()
  // Active tab "buy USDT" shows offers where OTHER users are SELLING (we buy from them).
  // Active tab "sell USDT" shows offers where OTHER users are BUYING (we sell to them).
  // The store keeps offer.type as the maker's side; we accept and the deal is created with opposite side.
  const isBuyOffer = offer.type === 'buy'
  const actionLabel = isBuyOffer ? t('p2p.action.sellUsdt') : t('p2p.action.buyUsdt')
  const actionCls = isBuyOffer
    ? 'bg-destructive text-white hover:bg-destructive/90'
    : 'bg-success text-success-foreground hover:bg-success/90'

  return (
    <div className="grid grid-cols-12 gap-3 px-3 py-3 items-center border-b border-border/60 last:border-0 hover:bg-muted/40 hover:border-primary/20 transition-all group">
      {/* User */}
      <div className="col-span-12 sm:col-span-4 flex items-center gap-2.5 min-w-0">
        <Avatar name={offer.user} size={36} />
        <div className="min-w-0 flex-1">
          <div className="text-sm font-medium truncate group-hover:text-primary transition-colors">{offer.user}</div>
          <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
            <span className="flex items-center gap-0.5">
              <CheckCircle2 className="w-2.5 h-2.5 text-success/70" />
              {offer.completed} {t('p2p.offer.deals')}
            </span>
            {offer.rating && <RatingStars rating={offer.rating} />}
          </div>
        </div>
      </div>

      {/* Payment method */}
      <div className="col-span-6 sm:col-span-3 min-w-0">
        <Badge variant="outline" className="text-[10px] gap-1 font-normal bg-muted/40">
          {offer.method}
        </Badge>
        <div className="text-[10px] text-muted-foreground mt-1 truncate">
          {offer.fiat} • {t('p2p.offer.limits')} 100–{formatNumber(offer.amount * offer.price, 0)} ₽
        </div>
      </div>

      {/* Amount */}
      <div className="col-span-6 sm:col-span-2 text-right">
        <div className="text-[10px] text-muted-foreground uppercase tracking-wide">{t('p2p.offer.available')}</div>
        <div className="text-sm font-mono tabular-nums font-semibold">
          {formatNumber(offer.amount, 0)} {offer.asset}
        </div>
      </div>

      {/* Price + action */}
      <div className="col-span-12 sm:col-span-3 flex sm:flex-col items-end justify-between sm:justify-center gap-2">
        <div className="text-right">
          <div className="text-lg font-mono font-bold tabular-nums text-primary">
            {formatNumber(offer.price, 2)} ₽
          </div>
          <div className="text-[10px] text-muted-foreground">{t('p2p.offer.perUsdt')}</div>
        </div>
        <Button
          size="sm"
          onClick={() => onAccept(offer)}
          className={cn('h-8 px-4 text-xs gap-1 font-semibold shadow-sm transition-all hover:scale-105', actionCls)}
        >
          {actionLabel}
        </Button>
      </div>
    </div>
  )
}

// ─── Offers section ─────────────────────────────────────────────────────────
function OffersSection({
  apiOffers,
  loading,
  onAcceptOffer,
}: {
  apiOffers: P2POffer[] | null
  loading: boolean
  onAcceptOffer: (offer: P2POffer) => void
}) {
  const { t } = useI18n()
  const storeOffers = useAppStore((s) => s.p2pOffers)
  const offers = apiOffers && apiOffers.length > 0 ? apiOffers : storeOffers
  const [tab, setTab] = useState<'buy' | 'sell'>('buy')
  const [search, setSearch] = useState('')
  const [minPrice, setMinPrice] = useState('')
  const [maxPrice, setMaxPrice] = useState('')
  const [sort, setSort] = useState<'none' | 'price-asc' | 'price-desc'>('none')

  // buy tab: show offers where maker is SELLING (so we can BUY from them)
  // sell tab: show offers where maker is BUYING (so we can SELL to them)
  const filtered = useMemo(() => {
    let list = offers.filter((o) => (tab === 'buy' ? o.type === 'sell' : o.type === 'buy'))
    const q = search.trim().toLowerCase()
    if (q) {
      list = list.filter(
        (o) =>
          o.user.toLowerCase().includes(q) || o.method.toLowerCase().includes(q)
      )
    }
    const min = parseFloat(minPrice)
    const max = parseFloat(maxPrice)
    if (!isNaN(min)) list = list.filter((o) => o.price >= min)
    if (!isNaN(max)) list = list.filter((o) => o.price <= max)
    if (sort === 'price-asc') list = [...list].sort((a, b) => a.price - b.price)
    if (sort === 'price-desc') list = [...list].sort((a, b) => b.price - a.price)
    return list
  }, [offers, tab, search, minPrice, maxPrice, sort])

  const handleAccept = (offer: P2POffer) => {
    onAcceptOffer(offer)
    toast.success(t('p2p.toast.created'), {
      description: `${formatNumber(offer.amount, 0)} USDT • ${formatNumber(
        offer.price,
        2
      )} ₽ → ${offer.user}`,
    })
  }

  // First-paint skeleton: API still loading, no offers yet to show
  const showSkeleton = loading && !apiOffers && storeOffers.length === 0

  return (
    <Card className="overflow-hidden">
      {/* Buy / Sell toggle */}
      <div className="p-2.5 border-b border-border">
        <div className="grid grid-cols-2 gap-1.5">
          <button
            onClick={() => setTab('buy')}
            className={cn(
              'py-2.5 rounded-lg text-sm font-semibold transition border',
              tab === 'buy'
                ? 'bg-success/15 border-success/50 text-success'
                : 'border-border bg-muted/30 text-muted-foreground hover:bg-muted/60'
            )}
          >
            {t('p2p.listings.buyTab')}
          </button>
          <button
            onClick={() => setTab('sell')}
            className={cn(
              'py-2.5 rounded-lg text-sm font-semibold transition border',
              tab === 'sell'
                ? 'bg-destructive/15 border-destructive/50 text-destructive'
                : 'border-border bg-muted/30 text-muted-foreground hover:bg-muted/60'
            )}
          >
            {t('p2p.listings.sellTab')}
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="p-2.5 border-b border-border grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2">
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t('p2p.listings.searchPlaceholder')}
            className="pl-8 h-9 text-sm"
          />
        </div>
        <Input
          type="number"
          value={minPrice}
          onChange={(e) => setMinPrice(e.target.value)}
          placeholder={t('p2p.listings.minPrice')}
          className="h-9 text-sm font-mono"
        />
        <Input
          type="number"
          value={maxPrice}
          onChange={(e) => setMaxPrice(e.target.value)}
          placeholder={t('p2p.listings.maxPrice')}
          className="h-9 text-sm font-mono"
        />
        <Select value={sort} onValueChange={(v) => setSort(v as typeof sort)}>
          <SelectTrigger className="h-9 text-sm">
            <SelectValue placeholder={t('p2p.listings.sort')} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="none">{t('p2p.listings.sortNone')}</SelectItem>
            <SelectItem value="price-asc">{t('p2p.listings.sortPriceAsc')}</SelectItem>
            <SelectItem value="price-desc">{t('p2p.listings.sortPriceDesc')}</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Header row (desktop) */}
      <div className="hidden sm:grid grid-cols-12 gap-3 px-3 py-1.5 text-[10px] uppercase tracking-wider text-muted-foreground bg-muted/30 border-b border-border">
        <span className="col-span-4">{t('p2p.listings.col.advertiser')}</span>
        <span className="col-span-3">{t('p2p.listings.col.method')}</span>
        <span className="col-span-2 text-right">{t('p2p.listings.col.available')}</span>
        <span className="col-span-3 text-right">{t('p2p.listings.col.price')}</span>
      </div>

      {showSkeleton ? (
        <div>
          {Array.from({ length: 6 }).map((_, i) => (
            <OfferRowSkeleton key={i} />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="p-10 text-center flex flex-col items-center">
          <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center mb-3">
            <Users className="w-7 h-7 text-primary/70" />
          </div>
          <p className="text-sm font-medium text-foreground/80">{t('p2p.listings.empty')}</p>
          <p className="text-[11px] text-muted-foreground mt-1 max-w-xs">
            {t('p2p.listings.emptyHint')}
          </p>
        </div>
      ) : (
        <ScrollArea className="max-h-[640px]">
          {filtered.map((o, i) => (
            <motion.div
              key={o.id}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.22, delay: Math.min(i * 0.03, 0.4), ease: 'easeOut' }}
            >
              <OfferRow offer={o} onAccept={handleAccept} />
            </motion.div>
          ))}
        </ScrollArea>
      )}
    </Card>
  )
}

// ─── Create Offer Dialog ────────────────────────────────────────────────────
function CreateOfferDialog({
  open,
  onOpenChange,
  onCreated,
}: {
  open: boolean
  onOpenChange: (v: boolean) => void
  onCreated?: () => void
}) {
  const addP2POffer = useAppStore((s) => s.addP2POffer)
  const { t } = useI18n()
  const [type, setType] = useState<OrderSide>('buy')
  const [price, setPrice] = useState('')
  const [amount, setAmount] = useState('')
  const [method, setMethod] = useState<string>('СБП')

  const handleSubmit = async () => {
    const p = parseFloat(price)
    const a = parseFloat(amount)
    if (!p || p <= 0) {
      toast.error(t('p2p.create.toast.priceInvalid'))
      return
    }
    if (!a || a <= 0) {
      toast.error(t('p2p.create.toast.qtyRequired'))
      return
    }
    // Persist via API (fire-and-forget resilience; local store update is the source of UI truth)
    try {
      await apiPost('/api/p2p', {
        action: 'create',
        type,
        price: p,
        amount: a,
        method,
      })
    } catch {
      // Ignore API error — still mirror locally
    }
    addP2POffer({
      type,
      asset: 'USDT',
      fiat: 'RUB',
      price: p,
      amount: a,
      user: t('p2p.create.you'),
      method,
      rating: 5,
    })
    toast.success(t('p2p.create.toast.created'), {
      description: `${type === 'buy' ? t('p2p.create.toast.buyWord') : t('p2p.create.toast.sellWord')} ${formatNumber(
        a,
        0
      )} USDT ${t('p2p.create.toast.byWord')} ${formatNumber(p, 2)} ₽`,
    })
    setPrice('')
    setAmount('')
    onOpenChange(false)
    onCreated?.()
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{t('p2p.create.title')}</DialogTitle>
          <DialogDescription>
            {t('p2p.create.desc')}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 py-2">
          <div className="space-y-1.5">
            <Label className="text-xs uppercase tracking-wider text-muted-foreground">
              {t('p2p.create.typeLabel')}
            </Label>
            <div className="grid grid-cols-2 gap-1.5">
              <button
                onClick={() => setType('buy')}
                className={cn(
                  'py-1.5 rounded-lg text-sm font-medium border transition',
                  type === 'buy'
                    ? 'bg-success/15 border-success/50 text-success'
                    : 'border-border bg-muted/30 text-muted-foreground hover:bg-muted/60'
                )}
              >
                {t('p2p.listings.buyTab')}
              </button>
              <button
                onClick={() => setType('sell')}
                className={cn(
                  'py-1.5 rounded-lg text-sm font-medium border transition',
                  type === 'sell'
                    ? 'bg-destructive/15 border-destructive/50 text-destructive'
                    : 'border-border bg-muted/30 text-muted-foreground hover:bg-muted/60'
                )}
              >
                {t('p2p.listings.sellTab')}
              </button>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2.5">
            <div className="space-y-1.5">
              <Label className="text-xs uppercase tracking-wider text-muted-foreground">
                {t('p2p.create.priceLabel')}
              </Label>
              <Input
                type="number"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                placeholder="93.50"
                className="font-mono tabular-nums"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs uppercase tracking-wider text-muted-foreground">
                {t('p2p.create.qtyLabel')}
              </Label>
              <Input
                type="number"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="500"
                className="font-mono tabular-nums"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs uppercase tracking-wider text-muted-foreground">
              {t('p2p.create.methodLabel')}
            </Label>
            <Select value={method} onValueChange={setMethod}>
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {PAYMENT_METHODS.map((m) => (
                  <SelectItem key={m} value={m}>
                    {m}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {price && amount && (
            <div className="rounded-lg bg-muted/40 border border-border px-3 py-2.5 flex justify-between text-sm">
              <span className="text-muted-foreground">{t('p2p.create.totalLabel')}</span>
              <span className="font-mono tabular-nums font-semibold">
                {formatNumber((parseFloat(price) || 0) * (parseFloat(amount) || 0), 0)} ₽
              </span>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {t('p2p.create.cancel')}
          </Button>
          <Button
            onClick={handleSubmit}
            className="bg-primary text-primary-foreground hover:bg-primary/90"
          >
            {t('p2p.create.publish')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ─── Chat widget ────────────────────────────────────────────────────────────
interface ChatMsg {
  id: string
  from: 'me' | 'them'
  text: string
  time: string
}

const CANNED_REPLIES = [
  'Привет! Готов к сделке, отправляю реквизиты.',
  'Оплатил, проверьте поступление.',
  'Подтвердил получение, отпускаю USDT.',
  'Спасибо за сделку! Буду рад отзыву.',
  'Подождите пару минут, сверяю платёж.',
]

function ChatWidget({
  deal,
  onClose,
}: {
  deal: P2PDeal
  onClose: () => void
}) {
  const { t } = useI18n()
  const [messages, setMessages] = useState<ChatMsg[]>(() => [
    {
      id: '1',
      from: 'them',
      text: `${t('p2p.chat.helloPrefix')} ${formatNumber(deal.amount, 0)} USDT ${t('p2p.chat.readyWord')}. ${
        deal.type === 'buy' ? t('p2p.chat.helloSuffix1') : t('p2p.chat.helloSuffix2')
      }`,
      time: new Date().toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' }),
    },
  ])
  const [input, setInput] = useState('')

  const send = () => {
    const text = input.trim()
    if (!text) return
    const me: ChatMsg = {
      id: Math.random().toString(36).slice(2),
      from: 'me',
      text,
      time: new Date().toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' }),
    }
    setMessages((p) => [...p, me])
    setInput('')
    setTimeout(() => {
      const reply: ChatMsg = {
        id: Math.random().toString(36).slice(2),
        from: 'them',
        text: CANNED_REPLIES[Math.floor(Math.random() * CANNED_REPLIES.length)],
        time: new Date().toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' }),
      }
      setMessages((p) => [...p, reply])
    }, 1200)
  }

  return (
    <div className="fixed bottom-4 right-4 z-50 w-[340px] max-w-[calc(100vw-2rem)] shadow-2xl rounded-xl border border-border bg-card overflow-hidden">
      <div className="flex items-center gap-2.5 p-2.5 border-b border-border bg-muted/40">
        <Avatar name={deal.counterparty} size={32} />
        <div className="flex-1 min-w-0">
          <div className="text-sm font-semibold truncate">{deal.counterparty}</div>
          <div className="text-[10px] text-success flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-success" />
            {t('p2p.chat.online')} • {deal.paymentMethod}
          </div>
        </div>
        <Button size="icon" variant="ghost" className="h-7 w-7" onClick={onClose}>
          <X className="w-4 h-4" />
        </Button>
      </div>

      <div className="h-64 overflow-y-auto scrollbar-thin p-2.5 space-y-2 bg-background/40">
        {messages.map((m) => (
          <div
            key={m.id}
            className={cn('flex', m.from === 'me' ? 'justify-end' : 'justify-start')}
          >
            <div
              className={cn(
                'max-w-[80%] px-3 py-2 rounded-2xl text-sm',
                m.from === 'me'
                  ? 'bg-primary text-primary-foreground rounded-br-sm'
                  : 'bg-muted text-foreground rounded-bl-sm'
              )}
            >
              <div>{m.text}</div>
              <div
                className={cn(
                  'text-[9px] mt-0.5',
                  m.from === 'me' ? 'text-primary-foreground/70' : 'text-muted-foreground'
                )}
              >
                {m.time}
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="p-2 border-t border-border flex gap-1.5 bg-card">
        <Input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') send()
          }}
          placeholder={t('p2p.chat.placeholder')}
          className="h-9 text-sm"
        />
        <Button size="icon" className="h-9 w-9 bg-primary hover:bg-primary/90" onClick={send}>
          <Send className="w-4 h-4" />
        </Button>
      </div>
    </div>
  )
}

// ─── My Deals section ───────────────────────────────────────────────────────
function MyDealsSection({
  apiDeals,
  onRefresh,
}: {
  apiDeals: P2PDeal[] | null
  onRefresh?: () => void
}) {
  const { t } = useI18n()
  const storeDeals = useAppStore((s) => s.p2pDeals)
  const updateDealStatus = useAppStore((s) => s.updateDealStatus)
  const [subtab, setSubtab] = useState<'active' | 'completed'>('active')
  const [chatDealId, setChatDealId] = useState<string | null>(null)

  const activeStatuses: DealStatus[] = ['PENDING', 'PAID', 'DISPUTE']
  const completedStatuses: DealStatus[] = ['COMPLETED', 'CANCELLED']

  // Merge API deals + store deals (dedupe by id; API takes precedence)
  const p2pDeals = useMemo(() => {
    if (!apiDeals || apiDeals.length === 0) return storeDeals
    const apiIds = new Set(apiDeals.map((d) => d.id))
    return [...apiDeals, ...storeDeals.filter((d) => !apiIds.has(d.id))]
  }, [apiDeals, storeDeals])

  const filtered = p2pDeals.filter((d) =>
    subtab === 'active' ? activeStatuses.includes(d.status) : completedStatuses.includes(d.status)
  )

  const chatDeal = p2pDeals.find((d) => d.id === chatDealId) ?? null

  const handleConfirm = async (d: P2PDeal) => {
    try {
      await apiPatch('/api/p2p', { id: d.id, status: 'COMPLETED' })
    } catch {
      // Ignore API error — still mirror locally
    }
    updateDealStatus(d.id, 'COMPLETED')
    toast.success(t('p2p.deals.toast.completed'), {
      description: `${formatNumber(d.amount, 0)} USDT • ${formatNumber(
        d.total || d.amount * d.price,
        0
      )} ₽`,
    })
    onRefresh?.()
  }
  const handleCancel = async (d: P2PDeal) => {
    try {
      await apiPatch('/api/p2p', { id: d.id, status: 'CANCELLED' })
    } catch {
      // Ignore API error — still mirror locally
    }
    updateDealStatus(d.id, 'CANCELLED')
    toast.error(t('p2p.deals.toast.cancelled'), {
      description: `${d.counterparty} • ${formatNumber(d.amount, 0)} USDT`,
    })
    onRefresh?.()
  }

  return (
    <Card className="overflow-hidden">
      <div className="px-3 py-2.5 border-b border-border flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <Users className="w-4 h-4 text-primary" />
          <h3 className="text-sm font-semibold">{t('p2p.deals.title')}</h3>
          <Badge variant="secondary" className="text-[10px]">
            {p2pDeals.length}
          </Badge>
        </div>
        <Tabs value={subtab} onValueChange={(v) => setSubtab(v as typeof subtab)}>
          <TabsList className="h-8">
            <TabsTrigger value="active" className="text-xs px-2.5">
              {t('p2p.deals.active')} ({p2pDeals.filter((d) => activeStatuses.includes(d.status)).length})
            </TabsTrigger>
            <TabsTrigger value="completed" className="text-xs px-2.5">
              {t('p2p.deals.completed')} ({p2pDeals.filter((d) => completedStatuses.includes(d.status)).length})
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {filtered.length === 0 ? (
        <div className="p-8 text-center">
          <Clock className="w-8 h-8 mx-auto text-muted-foreground/40 mb-2" />
          <p className="text-sm text-muted-foreground">
            {subtab === 'active' ? t('p2p.deals.emptyActive') : t('p2p.deals.emptyCompleted')}
          </p>
          <p className="text-[11px] text-muted-foreground/70 mt-1">
            {t('p2p.deals.emptyHint')}
          </p>
        </div>
      ) : (
        <div className="flex flex-col">
          {filtered.map((d) => {
            const isBuy = d.type === 'buy'
            return (
              <div
                key={d.id}
                className="grid grid-cols-12 gap-3 px-3 py-2.5 items-center border-b border-border/60 last:border-0 hover:bg-muted/30"
              >
                <div className="col-span-12 sm:col-span-3 flex items-center gap-2">
                  <Avatar name={d.counterparty} size={32} />
                  <div>
                    <div className="text-sm font-medium">{d.counterparty}</div>
                    <Badge
                      className={cn(
                        'h-5 text-[10px] mt-0.5',
                        isBuy
                          ? 'bg-success/15 text-success'
                          : 'bg-destructive/15 text-destructive'
                      )}
                    >
                      {isBuy ? t('common.buy2') : t('common.sell2')} {d.asset}
                    </Badge>
                  </div>
                </div>
                <div className="col-span-6 sm:col-span-3">
                  <div className="text-[10px] text-muted-foreground">{t('p2p.deals.qty')}</div>
                  <div className="text-sm font-mono tabular-nums">
                    {formatNumber(d.amount, 2)} {d.asset}
                  </div>
                </div>
                <div className="col-span-6 sm:col-span-2">
                  <div className="text-[10px] text-muted-foreground">{t('p2p.deals.price')}</div>
                  <div className="text-sm font-mono tabular-nums">
                    {formatNumber(d.price, 2)} ₽
                  </div>
                </div>
                <div className="col-span-6 sm:col-span-2">
                  <div className="text-[10px] text-muted-foreground">{t('p2p.deals.sum')}</div>
                  <div className="text-sm font-mono tabular-nums font-semibold">
                    {formatPrice(d.total || d.amount * d.price, 'rub')}
                  </div>
                </div>
                <div className="col-span-6 sm:col-span-2 flex flex-col items-end gap-1">
                  <DealStatusBadge status={d.status} />
                  {activeStatuses.includes(d.status) && (
                    <div className="flex gap-1">
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-7 px-2 text-[11px] gap-1"
                        onClick={() => setChatDealId(d.id)}
                      >
                        <MessageCircle className="w-3 h-3" />
                        {t('p2p.deals.chat')}
                      </Button>
                      {d.status === 'PENDING' && (
                        <>
                          <Button
                            size="sm"
                            className="h-7 px-2 text-[11px] gap-1 bg-success text-success-foreground hover:bg-success/90"
                            onClick={() => handleConfirm(d)}
                          >
                            <Check className="w-3 h-3" />
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-7 px-2 text-[11px] gap-1 text-destructive border-destructive/40 hover:bg-destructive/10"
                            onClick={() => handleCancel(d)}
                          >
                            <X className="w-3 h-3" />
                          </Button>
                        </>
                      )}
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {chatDeal && <ChatWidget deal={chatDeal} onClose={() => setChatDealId(null)} />}
    </Card>
  )
}

// ─── Main P2PView ───────────────────────────────────────────────────────────
export function P2PView() {
  const { t } = useI18n()
  const [createOpen, setCreateOpen] = useState(false)
  const [refreshKey, setRefreshKey] = useState(0)
  const p2pUrl = refreshKey ? `/api/p2p?t=${refreshKey}` : '/api/p2p'
  const { data, loading } = useApi<any>(p2pUrl)
  const acceptP2POffer = useAppStore((s) => s.acceptP2POffer)

  // Normalize API payloads (offers/deals come back as raw DB rows + rating/time)
  const apiOffers: P2POffer[] | null = useMemo(() => {
    if (!data?.offers || !Array.isArray(data.offers) || data.offers.length === 0) return null
    return data.offers.map(normalizeApiOffer)
  }, [data])
  const apiDeals: P2PDeal[] | null = useMemo(() => {
    if (!data?.deals || !Array.isArray(data.deals) || data.deals.length === 0) return null
    return data.deals.map(normalizeApiDeal)
  }, [data])

  const refresh = () => setRefreshKey((k) => k + 1)

  // Accept an offer: persist via API then mirror in store for instant UI
  const handleAcceptOffer = async (offer: P2POffer) => {
    try {
      await apiPost('/api/p2p', { action: 'accept', offerId: offer.id })
    } catch {
      // Ignore API error — still mirror locally
    }
    acceptP2POffer(offer)
    refresh()
  }

  return (
    <div className="flex-1 bg-background">
      <div className="mx-auto max-w-[1400px] px-3 lg:px-5 py-4 space-y-4">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-primary/15 flex items-center justify-center">
              <Users className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight">{t('p2p.header.title')}</h1>
              <p className="text-xs text-muted-foreground">
                {t('p2p.header.subtitle')}
              </p>
            </div>
          </div>
          <Button
            onClick={() => setCreateOpen(true)}
            className="bg-primary text-primary-foreground hover:bg-primary/90 gap-2"
          >
            <Plus className="w-4 h-4" />
            {t('p2p.header.create')}
          </Button>
        </div>

        {/* Trust band */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <Card className="p-3 flex items-center gap-2.5">
            <ShieldCheck className="w-5 h-5 text-success shrink-0" />
            <div>
              <div className="text-sm font-semibold">{t('p2p.features.escrow.title')}</div>
              <div className="text-[10px] text-muted-foreground">{t('p2p.features.escrow.sub')}</div>
            </div>
          </Card>
          <Card className="p-3 flex items-center gap-2.5">
            <Clock className="w-5 h-5 text-warning shrink-0" />
            <div>
              <div className="text-sm font-semibold">{t('p2p.features.window.title')}</div>
              <div className="text-[10px] text-muted-foreground">{t('p2p.features.window.sub')}</div>
            </div>
          </Card>
          <Card className="p-3 flex items-center gap-2.5">
            <TrendingUp className="w-5 h-5 text-primary shrink-0" />
            <div>
              <div className="text-sm font-semibold">{t('p2p.features.fee.title')}</div>
              <div className="text-[10px] text-muted-foreground">{t('p2p.features.fee.sub')}</div>
            </div>
          </Card>
          <Card className="p-3 flex items-center gap-2.5">
            <MessageCircle className="w-5 h-5 text-sky-400 shrink-0" />
            <div>
              <div className="text-sm font-semibold">{t('p2p.features.chat.title')}</div>
              <div className="text-[10px] text-muted-foreground">{t('p2p.features.chat.sub')}</div>
            </div>
          </Card>
        </div>

        <OffersSection apiOffers={apiOffers} loading={loading} onAcceptOffer={handleAcceptOffer} />

        <MyDealsSection apiDeals={apiDeals} onRefresh={refresh} />
      </div>

      <CreateOfferDialog open={createOpen} onOpenChange={setCreateOpen} onCreated={refresh} />
    </div>
  )
}
