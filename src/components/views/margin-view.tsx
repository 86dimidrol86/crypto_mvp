'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import {
  ChevronDown,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  ShieldAlert,
  Zap,
  Activity,
  XCircle,
  CheckCircle2,
  ArrowUpRight,
  ArrowDownRight,
  Wallet,
  Flame,
  Info,
} from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { useAppStore } from '@/lib/store'
import { fetchTickers, jitterPrice } from '@/lib/market'
import { useLiveMarket } from '@/lib/use-live-market'
import type { CoinTicker, MarginSide, MarginPosition } from '@/lib/types'
import { formatPrice, formatNumber, formatPercent } from '@/lib/format'
import { cn } from '@/lib/utils'
import { CoinIcon } from '@/components/coin-icon'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Slider } from '@/components/ui/slider'
import { Switch } from '@/components/ui/switch'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from '@/components/ui/dropdown-menu'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { toast } from 'sonner'

const PAIRS = [
  'BTC/RUB',
  'ETH/RUB',
  'XRP/RUB',
  'SOL/RUB',
  'BNB/RUB',
  'DOGE/RUB',
  'ADA/RUB',
  'AVAX/RUB',
]

const LEVERAGE_PRESETS = [1, 2, 5, 10, 20]
const MAX_LEVERAGE = 20
const TAKER_FEE_RATE = 0.0006 // 0.06% taker (margin preferential)
const MAINT_MARGIN_RATE = 0.005 // 0.5%

function priceDecimals(price: number): number {
  if (price >= 1000) return 2
  if (price >= 1) return 2
  if (price >= 0.01) return 4
  return 6
}

function computeLiquidationPrice(side: MarginSide, entry: number, leverage: number): number {
  if (side === 'long') {
    return entry * (1 - 1 / leverage + MAINT_MARGIN_RATE)
  }
  return entry * (1 + 1 / leverage - MAINT_MARGIN_RATE)
}

function fmtSignedRub(n: number): string {
  const sign = n >= 0 ? '+' : '−'
  return `${sign}${Math.abs(Math.round(n)).toLocaleString('ru-RU')} ₽`
}

// ─── Margin level bar (warning-color) ──────────────────────────────────────
function MarginLevelBar({ ratio, label }: { ratio: number; label?: string }) {
  const v = Math.min(Math.max(ratio, 0), 100)
  let color = 'bg-success'
  if (v >= 80) color = 'bg-destructive'
  else if (v >= 50) color = 'bg-warning'
  return (
    <div className="space-y-1">
      {label && (
        <div className="flex items-center justify-between text-[10px] uppercase tracking-wider text-muted-foreground">
          <span>{label}</span>
          <span className="font-mono tabular-nums text-foreground">{v.toFixed(1)}%</span>
        </div>
      )}
      <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden">
        <motion.div
          className={cn('h-full rounded-full', color)}
          initial={false}
          animate={{ width: `${v}%` }}
          transition={{ type: 'spring', stiffness: 90, damping: 18 }}
        />
      </div>
    </div>
  )
}

// ─── Account summary card ──────────────────────────────────────────────────
function AccountSummaryCard({
  positions,
  equity,
  usedMargin,
  availableMargin,
}: {
  positions: MarginPosition[]
  equity: number
  usedMargin: number
  availableMargin: number
}) {
  const openPositions = positions.filter((p) => p.status === 'OPEN')
  const unrealizedPnl = openPositions.reduce((s, p) => s + p.unrealizedPnl, 0)
  const netEquity = equity + unrealizedPnl
  // Account-level margin ratio: usedMargin / netEquity * 100
  const marginRatio = netEquity > 0 ? (usedMargin / netEquity) * 100 : 0

  return (
    <Card className="overflow-hidden bg-card border-border">
      <div className="px-4 py-3 border-b border-border flex items-center justify-between">
        <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
          <Wallet className="w-3.5 h-3.5 text-primary" />
          Маржинальный аккаунт
        </span>
        <Badge variant="outline" className="text-[10px] border-primary/30 text-primary">
          RUB
        </Badge>
      </div>
      <div className="p-4 space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Эквити</div>
            <div className="text-lg font-mono font-bold tabular-nums mt-0.5">
              {formatNumber(Math.round(netEquity))} ₽
            </div>
          </div>
          <div>
            <div className="text-[10px] uppercase tracking-wider text-muted-foreground">
              Нереализованный PnL
            </div>
            <div
              className={cn(
                'text-lg font-mono font-bold tabular-nums mt-0.5',
                unrealizedPnl > 0
                  ? 'text-success'
                  : unrealizedPnl < 0
                    ? 'text-destructive'
                    : 'text-foreground'
              )}
            >
              {fmtSignedRub(unrealizedPnl)}
            </div>
          </div>
          <div>
            <div className="text-[10px] uppercase tracking-wider text-muted-foreground">
              Использовано
            </div>
            <div className="text-sm font-mono tabular-nums mt-0.5">
              {formatNumber(Math.round(usedMargin))} ₽
            </div>
          </div>
          <div>
            <div className="text-[10px] uppercase tracking-wider text-muted-foreground">
              Доступно
            </div>
            <div className="text-sm font-mono tabular-nums mt-0.5 text-primary">
              {formatNumber(Math.round(availableMargin))} ₽
            </div>
          </div>
        </div>

        <div className="pt-2 border-t border-border">
          <MarginLevelBar ratio={marginRatio} label="Маржин уровень" />
          {marginRatio >= 80 && (
            <div className="mt-2 flex items-center gap-1.5 text-[10px] text-destructive">
              <Flame className="w-3 h-3" />
              Критический уровень. Снизьте риск или закройте позиции.
            </div>
          )}
        </div>
      </div>
    </Card>
  )
}

// ─── Open position form ────────────────────────────────────────────────────
function OpenPositionForm({
  pair,
  price,
  availableMargin,
}: {
  pair: string
  price: number
  availableMargin: number
}) {
  const openMarginPosition = useAppStore((s) => s.openMarginPosition)
  const [side, setSide] = useState<MarginSide>('long')
  const [leverage, setLeverage] = useState<number>(5)
  const [marginInput, setMarginInput] = useState<string>('')

  const base = pair.split('/')[0]
  const decimals = priceDecimals(price)
  const margin = parseFloat(marginInput) || 0
  const positionSize = margin * leverage
  const quantity = price > 0 ? positionSize / price : 0
  const liquidationPrice = price > 0 ? computeLiquidationPrice(side, price, leverage) : 0
  const fee = positionSize * TAKER_FEE_RATE

  const handleMax = () => {
    setMarginInput(String(Math.floor(availableMargin)))
  }

  const handleSubmit = () => {
    if (price <= 0) {
      toast.error('Цена ещё не загружена')
      return
    }
    if (margin <= 0) {
      toast.error('Введите сумму маржи')
      return
    }
    if (margin > availableMargin) {
      toast.error('Недостаточно доступной маржи', {
        description: `Доступно: ${formatNumber(Math.floor(availableMargin))} ₽`,
      })
      return
    }
    try {
      const pos = openMarginPosition({
        pair,
        side,
        leverage,
        margin,
        entryPrice: price,
      })
      toast.success(
        `${side === 'long' ? 'Long' : 'Short'} ${pair} открыт • ${leverage}x`,
        {
          description: `Маржа ${formatNumber(margin)} ₽ • объём ${formatNumber(positionSize)} ₽ • ликвидация ${liquidationPrice.toLocaleString('ru-RU', { minimumFractionDigits: decimals, maximumFractionDigits: decimals })} ₽`,
        }
      )
      setMarginInput('')
      void pos
    } catch (e) {
      toast.error('Не удалось открыть позицию', {
        description: e instanceof Error ? e.message : 'Неизвестная ошибка',
      })
    }
  }

  return (
    <Card className="overflow-hidden bg-card border-border">
      <div className="px-4 py-3 border-b border-border">
        <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
          <Zap className="w-3.5 h-3.5 text-primary" />
          Открыть позицию
        </span>
      </div>
      <div className="p-4 space-y-3">
        {/* Side toggle */}
        <div className="grid grid-cols-2 gap-1.5">
          <button
            onClick={() => setSide('long')}
            className={cn(
              'py-2.5 rounded-lg text-sm font-semibold transition flex items-center justify-center gap-1.5',
              side === 'long'
                ? 'bg-success text-success-foreground shadow-sm'
                : 'bg-muted/60 text-muted-foreground hover:bg-muted'
            )}
          >
            <ArrowUpRight className="w-4 h-4" />
            Long
          </button>
          <button
            onClick={() => setSide('short')}
            className={cn(
              'py-2.5 rounded-lg text-sm font-semibold transition flex items-center justify-center gap-1.5',
              side === 'short'
                ? 'bg-destructive text-white shadow-sm'
                : 'bg-muted/60 text-muted-foreground hover:bg-muted'
            )}
          >
            <ArrowDownRight className="w-4 h-4" />
            Short
          </button>
        </div>

        {/* Leverage */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-[10px] uppercase tracking-wider text-muted-foreground">
            <span>Плечо</span>
            <span className="font-mono tabular-nums text-primary font-bold text-sm normal-case tracking-normal">
              {leverage}x
            </span>
          </div>
          <div className="grid grid-cols-5 gap-1">
            {LEVERAGE_PRESETS.map((l) => (
              <button
                key={l}
                onClick={() => setLeverage(l)}
                className={cn(
                  'py-1.5 text-xs font-semibold rounded-md transition border',
                  leverage === l
                    ? 'bg-primary/15 border-primary/50 text-primary'
                    : 'bg-muted/40 border-border text-muted-foreground hover:bg-muted'
                )}
              >
                {l}x
              </button>
            ))}
          </div>
          <Slider
            value={[leverage]}
            onValueChange={(v) => setLeverage(Math.min(Math.max(v[0], 1), MAX_LEVERAGE))}
            min={1}
            max={MAX_LEVERAGE}
            step={1}
          />
          <div className="flex justify-between text-[9px] text-muted-foreground">
            <span>1x</span>
            <span>10x</span>
            <span>{MAX_LEVERAGE}x ⚠</span>
          </div>
        </div>

        {/* Margin input */}
        <div className="space-y-1">
          <div className="flex items-center justify-between text-[10px] uppercase tracking-wider text-muted-foreground">
            <span>Маржа</span>
            <button
              onClick={handleMax}
              className="text-primary hover:underline normal-case tracking-normal text-[11px] font-semibold"
            >
              MAX
            </button>
          </div>
          <div className="relative">
            <Input
              type="number"
              inputMode="decimal"
              value={marginInput}
              onChange={(e) => setMarginInput(e.target.value)}
              placeholder="0"
              className="pr-12 font-mono tabular-nums h-10"
            />
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">
              RUB
            </span>
          </div>
          <div className="text-[10px] text-muted-foreground">
            Доступно: <span className="font-mono tabular-nums">{formatNumber(Math.floor(availableMargin))} ₽</span>
          </div>
        </div>

        {/* Computed preview */}
        <div className="space-y-1.5 p-3 rounded-lg bg-muted/40 border border-border">
          <div className="flex justify-between text-xs">
            <span className="text-muted-foreground">Размер позиции</span>
            <span className="font-mono tabular-nums font-semibold">
              {formatNumber(positionSize)} ₽
            </span>
          </div>
          <div className="flex justify-between text-xs">
            <span className="text-muted-foreground">Количество {base}</span>
            <span className="font-mono tabular-nums">
              {quantity.toLocaleString('ru-RU', { maximumFractionDigits: 6 })}
            </span>
          </div>
          <div className="flex justify-between text-xs">
            <span className="text-muted-foreground">Цена входа</span>
            <span className="font-mono tabular-nums">
              {price > 0
                ? price.toLocaleString('ru-RU', { minimumFractionDigits: decimals, maximumFractionDigits: decimals })
                : '—'}{' '}
              ₽
            </span>
          </div>
          <div className="flex justify-between text-xs">
            <span className="text-muted-foreground">Ликвидация</span>
            <span className="font-mono tabular-nums text-warning">
              {liquidationPrice > 0
                ? liquidationPrice.toLocaleString('ru-RU', { minimumFractionDigits: decimals, maximumFractionDigits: decimals })
                : '—'}{' '}
              ₽
            </span>
          </div>
          <div className="flex justify-between text-xs">
            <span className="text-muted-foreground">Комиссия (0.06%)</span>
            <span className="font-mono tabular-nums text-muted-foreground">
              {formatNumber(fee)} ₽
            </span>
          </div>
        </div>

        <Button
          onClick={handleSubmit}
          className={cn(
            'w-full h-11 font-semibold text-white shadow-sm gap-1.5',
            side === 'long' ? 'bg-success hover:bg-success/90' : 'bg-destructive hover:bg-destructive/90'
          )}
        >
          Открыть {side === 'long' ? 'Long' : 'Short'} {pair}
        </Button>
      </div>
    </Card>
  )
}

// ─── Risk metrics card ─────────────────────────────────────────────────────
function RiskMetricsCard() {
  return (
    <Card className="overflow-hidden bg-card border-border">
      <div className="px-4 py-3 border-b border-border">
        <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
          <ShieldAlert className="w-3.5 h-3.5 text-warning" />
          Параметры риска
        </span>
      </div>
      <div className="p-4 space-y-3 text-xs">
        <div className="flex justify-between">
          <span className="text-muted-foreground">Начальная маржа</span>
          <span className="font-mono tabular-nums">1 / плечо</span>
        </div>
        <div className="flex justify-between">
          <span className="text-muted-foreground">Поддерживающая маржа</span>
          <span className="font-mono tabular-nums">0.5%</span>
        </div>
        <div className="flex justify-between">
          <span className="text-muted-foreground">Комиссия тейкера</span>
          <span className="font-mono tabular-nums">0.06%</span>
        </div>
        <div className="flex justify-between">
          <span className="text-muted-foreground">Макс. плечо</span>
          <span className="font-mono tabular-nums">{MAX_LEVERAGE}x</span>
        </div>
        <div className="pt-2 border-t border-border space-y-1.5">
          <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Формула ликвидации</div>
          <div className="font-mono text-[10px] text-muted-foreground leading-relaxed">
            <div>Long: P × (1 − 1/L + 0.005)</div>
            <div>Short: P × (1 + 1/L − 0.005)</div>
          </div>
        </div>
        <div className="flex items-start gap-1.5 text-[10px] text-muted-foreground pt-2 border-t border-border">
          <Info className="w-3 h-3 mt-0.5 shrink-0" />
          <span>
            При достижении маржин-уровня 100% позиция автоматически
            ликвидируется. Вы теряете всю предоставленную маржу.
          </span>
        </div>
      </div>
    </Card>
  )
}

// ─── Open positions table ──────────────────────────────────────────────────
function PositionRow({
  pos,
  onClose,
}: {
  pos: MarginPosition
  onClose: (id: string) => void
}) {
  const isLong = pos.side === 'long'
  const pnl = pos.unrealizedPnl
  const pnlPct = pos.unrealizedPnlPct
  const decimals = priceDecimals(pos.currentPrice || pos.entryPrice)
  const liqDecimals = priceDecimals(pos.liquidationPrice)
  const prevPnlRef = useRef(pnl)
  const [flash, setFlash] = useState<'up' | 'down' | null>(null)

  useEffect(() => {
    const prev = prevPnlRef.current
    if (pnl !== prev) {
      setFlash(pnl > prev ? 'up' : 'down')
      prevPnlRef.current = pnl
      const t = setTimeout(() => setFlash(null), 600)
      return () => clearTimeout(t)
    }
    return undefined
  }, [pnl])

  return (
    <div
      className={cn(
        'grid grid-cols-12 gap-2 px-3 py-2.5 items-center text-xs border-b border-border/60 last:border-0 hover:bg-muted/40 transition-colors',
        flash === 'up' && 'flash-up',
        flash === 'down' && 'flash-down'
      )}
    >
      {/* Pair + side */}
      <div className="col-span-2 flex items-center gap-1.5 min-w-0">
        <CoinIcon symbol={pos.pair.split('/')[0]} size={18} />
        <div className="min-w-0">
          <div className="font-semibold truncate">{pos.pair.split('/')[0]}</div>
          <Badge
            className={cn(
              'h-4 px-1 text-[9px] mt-0.5',
              isLong ? 'bg-success/20 text-success' : 'bg-destructive/20 text-destructive'
            )}
          >
            {isLong ? 'LONG' : 'SHORT'} {pos.leverage}x
          </Badge>
        </div>
      </div>
      {/* Size */}
      <div className="col-span-1 font-mono tabular-nums">
        {pos.quantity.toLocaleString('ru-RU', { maximumFractionDigits: 4 })}
      </div>
      {/* Entry */}
      <div className="col-span-1 font-mono tabular-nums text-muted-foreground">
        {pos.entryPrice.toLocaleString('ru-RU', { minimumFractionDigits: decimals, maximumFractionDigits: decimals })}
      </div>
      {/* Current */}
      <div className="col-span-1 font-mono tabular-nums">
        {pos.currentPrice.toLocaleString('ru-RU', { minimumFractionDigits: decimals, maximumFractionDigits: decimals })}
      </div>
      {/* PnL */}
      <div className="col-span-3 font-mono tabular-nums">
        <div className={cn(pnl > 0 ? 'text-success' : pnl < 0 ? 'text-destructive' : 'text-foreground')}>
          {fmtSignedRub(pnl)}
        </div>
        <div className={cn('text-[10px]', pnl >= 0 ? 'text-success' : 'text-destructive')}>
          {formatPercent(pnlPct)}
        </div>
      </div>
      {/* Margin */}
      <div className="col-span-1 font-mono tabular-nums text-muted-foreground">
        {formatNumber(Math.round(pos.margin))}
      </div>
      {/* Liquidation */}
      <div className="col-span-1 font-mono tabular-nums text-warning">
        {pos.liquidationPrice.toLocaleString('ru-RU', { minimumFractionDigits: liqDecimals, maximumFractionDigits: liqDecimals })}
      </div>
      {/* Margin ratio */}
      <div className="col-span-2 flex flex-col gap-1">
        <div className="flex items-center gap-1.5">
          <div className="flex-1 h-1.5 rounded-full bg-muted overflow-hidden">
            <div
              className={cn(
                'h-full rounded-full transition-all',
                pos.marginRatio >= 80 ? 'bg-destructive' : pos.marginRatio >= 50 ? 'bg-warning' : 'bg-success'
              )}
              style={{ width: `${Math.min(pos.marginRatio, 100)}%` }}
            />
          </div>
          <span
            className={cn(
              'text-[10px] font-mono tabular-nums w-8 text-right',
              pos.marginRatio >= 80 ? 'text-destructive' : pos.marginRatio >= 50 ? 'text-warning' : 'text-muted-foreground'
            )}
          >
            {pos.marginRatio.toFixed(0)}%
          </span>
        </div>
        <Button
          size="sm"
          variant="outline"
          className="h-6 text-[10px] px-2 py-0 w-full"
          onClick={() => onClose(pos.id)}
        >
          Закрыть
        </Button>
      </div>
    </div>
  )
}

function OpenPositionsTable({
  positions,
  onClose,
}: {
  positions: MarginPosition[]
  onClose: (id: string) => void
}) {
  const open = positions.filter((p) => p.status === 'OPEN')
  return (
    <Card className="overflow-hidden bg-card border-border">
      <div className="px-4 py-3 border-b border-border flex items-center justify-between">
        <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
          <Activity className="w-3.5 h-3.5 text-primary" />
          Открытые позиции
          {open.length > 0 && (
            <Badge variant="outline" className="text-[10px] border-primary/30 text-primary">
              {open.length}
            </Badge>
          )}
        </span>
      </div>
      {open.length === 0 ? (
        <div className="px-4 py-12 text-center">
          <CheckCircle2 className="w-8 h-8 mx-auto text-muted-foreground/40 mb-2" />
          <p className="text-sm text-muted-foreground">Нет открытых позиций</p>
          <p className="text-[11px] text-muted-foreground/70 mt-1">
            Откройте Long или Short в форме справа
          </p>
        </div>
      ) : (
        <>
          <div className="hidden md:grid grid-cols-12 gap-2 px-3 py-2 text-[10px] uppercase tracking-wider text-muted-foreground border-b border-border">
            <span className="col-span-2">Пара / Напр.</span>
            <span className="col-span-1">Размер</span>
            <span className="col-span-1">Вход</span>
            <span className="col-span-1">Тек.</span>
            <span className="col-span-3">PnL</span>
            <span className="col-span-1">Маржа</span>
            <span className="col-span-1">Ликв.</span>
            <span className="col-span-2">Маржин-колл</span>
          </div>
          <ScrollArea className="max-h-[420px] scrollbar-thin">
            <div className="flex flex-col">
              {open.map((p) => (
                <PositionRow key={p.id} pos={p} onClose={onClose} />
              ))}
            </div>
          </ScrollArea>
        </>
      )}
    </Card>
  )
}

// ─── Position history table ────────────────────────────────────────────────
function PositionHistory({ positions }: { positions: MarginPosition[] }) {
  const closed = positions.filter((p) => p.status !== 'OPEN')
  return (
    <Card className="overflow-hidden bg-card border-border">
      <div className="px-4 py-3 border-b border-border">
        <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
          <XCircle className="w-3.5 h-3.5 text-muted-foreground" />
          История позиций
        </span>
      </div>
      {closed.length === 0 ? (
        <div className="px-4 py-10 text-center">
          <p className="text-sm text-muted-foreground">История пуста</p>
          <p className="text-[11px] text-muted-foreground/70 mt-1">
            Здесь появятся закрытые и ликвидированные позиции
          </p>
        </div>
      ) : (
        <ScrollArea className="max-h-72 scrollbar-thin">
          <div className="flex flex-col">
            <div className="hidden md:grid grid-cols-12 gap-2 px-3 py-2 text-[10px] uppercase tracking-wider text-muted-foreground border-b border-border">
              <span className="col-span-2">Пара / Напр.</span>
              <span className="col-span-2">PnL реализованный</span>
              <span className="col-span-5">Вход → Выход</span>
              <span className="col-span-2">Статус</span>
              <span className="col-span-1 text-right">Время</span>
            </div>
            {closed.map((p) => {
              const isLong = p.side === 'long'
              const pnl = p.realizedPnl ?? 0
              const decimals = priceDecimals(p.entryPrice)
              return (
                <div
                  key={p.id}
                  className="grid grid-cols-12 gap-2 px-3 py-2.5 items-center text-xs border-b border-border/60 last:border-0 hover:bg-muted/40"
                >
                  <div className="col-span-12 md:col-span-2 flex items-center gap-1.5">
                    <CoinIcon symbol={p.pair.split('/')[0]} size={16} />
                    <span className="font-semibold">{p.pair.split('/')[0]}</span>
                    <Badge
                      className={cn(
                        'h-4 px-1 text-[9px]',
                        isLong ? 'bg-success/20 text-success' : 'bg-destructive/20 text-destructive'
                      )}
                    >
                      {isLong ? 'LONG' : 'SHORT'}
                    </Badge>
                  </div>
                  <div className="col-span-6 md:col-span-2 font-mono tabular-nums">
                    <span className={cn(pnl >= 0 ? 'text-success' : 'text-destructive')}>
                      {fmtSignedRub(pnl)}
                    </span>
                  </div>
                  <div className="col-span-6 md:col-span-5 font-mono tabular-nums text-muted-foreground text-[11px]">
                    {p.entryPrice.toLocaleString('ru-RU', { minimumFractionDigits: decimals, maximumFractionDigits: decimals })}
                    {' → '}
                    {p.closePrice
                      ? p.closePrice.toLocaleString('ru-RU', { minimumFractionDigits: decimals, maximumFractionDigits: decimals })
                      : '—'}{' '}
                    ₽
                  </div>
                  <div className="col-span-6 md:col-span-2">
                    <Badge
                      className={cn(
                        'h-5 px-1.5 text-[10px]',
                        p.status === 'CLOSED'
                          ? 'bg-muted text-muted-foreground'
                          : 'bg-destructive/20 text-destructive'
                      )}
                    >
                      {p.status === 'CLOSED' ? 'Закрыта' : 'Ликвидация'}
                    </Badge>
                  </div>
                  <div className="col-span-6 md:col-span-1 text-right text-muted-foreground text-[10px]">
                    {p.closedAt ? new Date(p.closedAt).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' }) : '—'}
                  </div>
                </div>
              )
            })}
          </div>
        </ScrollArea>
      )}
    </Card>
  )
}

// ─── Main MarginView ───────────────────────────────────────────────────────
export function MarginView() {
  const [selectedPair, setSelectedPair] = useState<string>('BTC/RUB')
  const [tickers, setTickers] = useState<CoinTicker[]>([])
  const [livePrice, setLivePrice] = useState<number>(0)
  const [highlight, setHighlight] = useState<'up' | 'down' | null>(null)
  const [marginActivated, setMarginActivated] = useState<boolean>(true)

  const marginPositions = useAppStore((s) => s.marginPositions)
  const marginAccount = useAppStore((s) => s.marginAccount)
  const closeMarginPosition = useAppStore((s) => s.closeMarginPosition)
  const updateMarginPrices = useAppStore((s) => s.updateMarginPrices)

  // Live WS market data for selected pair
  const { livePrice: wsPrice, connected } = useLiveMarket(selectedPair)

  // Fetch tickers every 5s
  useEffect(() => {
    let mounted = true
    const load = async () => {
      const t = await fetchTickers()
      if (mounted) setTickers(t)
    }
    load()
    const interval = setInterval(load, 5000)
    return () => {
      mounted = false
      clearInterval(interval)
    }
  }, [])

  const base = selectedPair.split('/')[0]
  const ticker = useMemo(() => tickers.find((t) => t.symbol === base) ?? null, [tickers, base])

  // Smooth jitter for the live price ticker feel (1.2s)
  const tickerSymbol = ticker?.symbol
  const tickerPrice = ticker?.priceRub ?? 0
  const prevPriceRef = useRef(0)
  useEffect(() => {
    if (tickerPrice <= 0) return
    prevPriceRef.current = tickerPrice
    const seedTimer = setTimeout(() => setLivePrice(tickerPrice), 0)
    const interval = setInterval(() => {
      const baseline = prevPriceRef.current > 0 ? prevPriceRef.current : tickerPrice
      const next = jitterPrice(baseline)
      prevPriceRef.current = next
      setLivePrice(next)
      setHighlight(next > baseline ? 'up' : 'down')
    }, 1200)
    return () => {
      clearTimeout(seedTimer)
      clearInterval(interval)
    }
  }, [tickerSymbol, tickerPrice])

  // Sync live price from WebSocket (overrides jitter when WS is live)
  useEffect(() => {
    if (connected && wsPrice > 0) {
      setLivePrice((prev) => {
        if (prev > 0 && wsPrice !== prev) setHighlight(wsPrice > prev ? 'up' : 'down')
        return wsPrice
      })
    }
  }, [wsPrice, connected])

  // Auto-clear highlight
  useEffect(() => {
    if (!highlight) return
    const t = setTimeout(() => setHighlight(null), 500)
    return () => clearTimeout(t)
  }, [highlight])

  // Live-update margin positions on each price tick for the selected pair.
  // This recomputes PnL and margin ratio for all OPEN positions of this pair
  // and auto-liquidates any that hit 100%.
  useEffect(() => {
    if (livePrice <= 0) return
    updateMarginPrices({ [selectedPair]: livePrice })
  }, [livePrice, selectedPair, updateMarginPrices])

  // For other pairs (positions whose pair != selectedPair), poll tickers every 5s
  const otherOpenPairs = useMemo(() => {
    const set = new Set(
      marginPositions
        .filter((p) => p.status === 'OPEN' && p.pair !== selectedPair)
        .map((p) => p.pair)
    )
    return Array.from(set)
  }, [marginPositions, selectedPair])

  useEffect(() => {
    if (otherOpenPairs.length === 0 || tickers.length === 0) return
    const map: Record<string, number> = {}
    for (const pair of otherOpenPairs) {
      const sym = pair.split('/')[0]
      const t = tickers.find((x) => x.symbol === sym)
      if (t && t.priceRub > 0) map[pair] = t.priceRub
    }
    if (Object.keys(map).length > 0) {
      updateMarginPrices(map)
    }
  }, [tickers, otherOpenPairs, updateMarginPrices])

  const change24h = ticker?.change24h ?? 0
  const isUp = change24h >= 0
  const tvSymbol = `BINANCE:${base}USDT`
  const decimals = priceDecimals(livePrice)

  const handleClose = (id: string) => {
    const pos = marginPositions.find((p) => p.id === id)
    if (!pos) return
    if (livePrice <= 0) {
      toast.error('Нет актуальной цены для закрытия')
      return
    }
    closeMarginPosition(id, livePrice)
    toast.success(`${pos.side === 'long' ? 'Long' : 'Short'} ${pos.pair} закрыт по рынку`, {
      description: `Цена ${livePrice.toLocaleString('ru-RU', { minimumFractionDigits: decimals, maximumFractionDigits: decimals })} ₽`,
    })
  }

  return (
    <div className="flex-1 bg-background">
      <div className="mx-auto max-w-[1600px] px-3 lg:px-5 py-4">
        {/* Risk warning banner */}
        <div className="mb-3 flex items-start gap-2.5 px-3 py-2.5 rounded-lg bg-destructive/10 border border-destructive/30 text-destructive">
          <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
          <p className="text-xs leading-relaxed">
            <span className="font-semibold">Внимание:</span> маржинальная торговля
            сопряжена с высоким риском. При маржин-колле позиция ликвидируется, а
            маржа полностью утрачивается. Используйте умеренное плечо и
            устанавливайте стопы.
          </p>
        </div>

        {/* Top pair bar */}
        <div className="flex flex-wrap items-center gap-3 lg:gap-5 mb-4 p-3 bg-card border border-border rounded-xl">
          {/* Pair selector */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" className="gap-2 h-10 px-3 font-semibold">
                <CoinIcon symbol={base} size={22} />
                <span>{selectedPair}</span>
                <ChevronDown className="w-4 h-4 text-muted-foreground" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-56">
              {PAIRS.map((p) => {
                const sym = p.split('/')[0]
                const tk = tickers.find((t) => t.symbol === sym)
                return (
                  <DropdownMenuItem
                    key={p}
                    onClick={() => setSelectedPair(p)}
                    className="gap-2.5 cursor-pointer py-2"
                  >
                    <CoinIcon symbol={sym} size={20} />
                    <span className="flex-1 font-medium">{p}</span>
                    {tk && (
                      <span className="text-xs font-mono text-muted-foreground">
                        {formatPrice(tk.priceRub, 'rub')}
                      </span>
                    )}
                  </DropdownMenuItem>
                )
              })}
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Live price */}
          <div className="flex items-baseline gap-3">
            <span
              className={cn(
                'inline-block rounded-md px-2 py-0.5 text-2xl lg:text-3xl font-mono font-bold tabular-nums transition-colors',
                highlight === 'up' && 'flash-up text-success',
                highlight === 'down' && 'flash-down text-destructive',
                !highlight && 'text-foreground'
              )}
            >
              {livePrice > 0
                ? `${livePrice.toLocaleString('ru-RU', { maximumFractionDigits: decimals })} ₽`
                : '— —'}
            </span>
            <span className="text-xs text-muted-foreground">
              ≈ {ticker ? formatPrice(ticker.priceUsd, 'usd') : '—'}
            </span>
            {connected && (
              <span className="inline-flex items-center gap-1 text-[10px] text-success">
                <span className="w-1.5 h-1.5 rounded-full bg-success animate-pulse" /> LIVE
              </span>
            )}
          </div>

          {/* 24h change */}
          <div className="flex items-center gap-1.5">
            <span
              className={cn(
                'flex items-center gap-1 text-sm font-semibold px-2 py-1 rounded-md',
                isUp ? 'text-success bg-success/10' : 'text-destructive bg-destructive/10'
              )}
            >
              {isUp ? <TrendingUp className="w-3.5 h-3.5" /> : <TrendingDown className="w-3.5 h-3.5" />}
              {formatPercent(change24h)}
            </span>
            <span className="text-[10px] uppercase tracking-wider text-muted-foreground hidden sm:inline">
              24ч
            </span>
          </div>

          {/* Activate margin toggle */}
          <div className="ml-auto flex items-center gap-2">
            <TooltipProvider delayDuration={200}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-muted/40 border border-border">
                    <Zap className="w-3.5 h-3.5 text-primary" />
                    <span className="text-xs font-medium">Маржа активна</span>
                    <Switch checked={marginActivated} onCheckedChange={setMarginActivated} />
                  </div>
                </TooltipTrigger>
                <TooltipContent side="bottom">
                  Активация маржинального счёта
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
        </div>

        <AnimatePresence>
          {marginActivated ? (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="grid grid-cols-1 lg:grid-cols-[1fr_340px] gap-4"
            >
              {/* LEFT/CENTER */}
              <div className="space-y-4 min-w-0">
                {/* Chart */}
                <Card className="overflow-hidden bg-black border-border p-0">
                  <div className="h-[400px] w-full">
                    <iframe
                      title="TradingView Margin Chart"
                      src={`https://www.tradingview.com/widgetembed/?frameElementId=tv&symbol=${encodeURIComponent(
                        tvSymbol
                      )}&interval=5&theme=dark&hide_side_toolbar=false&hide_top_toolbar=false&allow_symbol_change=false&hideideas=true&hide_volume=false`}
                      className="w-full h-full border-0"
                      allowFullScreen
                    />
                  </div>
                </Card>

                <OpenPositionsTable positions={marginPositions} onClose={handleClose} />
                <PositionHistory positions={marginPositions} />
              </div>

              {/* RIGHT */}
              <div className="space-y-4">
                <AccountSummaryCard
                  positions={marginPositions}
                  equity={marginAccount.equity}
                  usedMargin={marginAccount.usedMargin}
                  availableMargin={marginAccount.availableMargin}
                />
                <OpenPositionForm
                  pair={selectedPair}
                  price={livePrice}
                  availableMargin={marginAccount.availableMargin}
                />
                <RiskMetricsCard />
              </div>
            </motion.div>
          ) : (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              <Card className="p-12 bg-card border-border text-center">
                <div className="w-16 h-16 mx-auto rounded-full bg-warning/10 flex items-center justify-center mb-4">
                  <ShieldAlert className="w-8 h-8 text-warning" />
                </div>
                <h3 className="text-lg font-semibold mb-2">Маржинальная торговля деактивирована</h3>
                <p className="text-sm text-muted-foreground max-w-md mx-auto mb-6">
                  Активируйте маржу, чтобы открывать позиции с плечом. Убедитесь,
                  что вы понимаете риски маржинальной торговли перед
                  использованием.
                </p>
                <Button
                  onClick={() => setMarginActivated(true)}
                  className="bg-primary text-primary-foreground hover:bg-primary/90"
                >
                  <Zap className="w-4 h-4 mr-1.5" />
                  Активировать маржу
                </Button>
              </Card>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}
