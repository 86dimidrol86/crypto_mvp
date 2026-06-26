'use client'

import { Fragment, useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { Panel, PanelGroup, PanelResizeHandle } from 'react-resizable-panels'
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core'
import {
  SortableContext,
  useSortable,
  arrayMove,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'
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
  GripVertical,
  RotateCcw,
} from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { useAppStore } from '@/lib/store'
import { useI18n } from '@/lib/use-i18n'
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
import { useMounted } from '@/lib/use-mounted'
import { PositionRowSkeleton } from '@/components/page-skeleton'

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

// ─── Layout types & constants ───────────────────────────────────────────────
type BlockId = 'chart' | 'positions' | 'history' | 'account' | 'form' | 'risk'
type ColumnId = 'left' | 'right'

const DEFAULT_LEFT_ORDER: BlockId[] = ['chart', 'positions', 'history']
const DEFAULT_RIGHT_ORDER: BlockId[] = ['account', 'form', 'risk']

const DEFAULT_SIZES = {
  columns: [70, 30] as [number, number],
  left: { chart: 55, positions: 28, history: 17 } as Record<BlockId, number>,
  right: { account: 30, form: 45, risk: 25 } as Record<BlockId, number>,
}

const MIN_SIZES = {
  left: { chart: 18, positions: 12, history: 10 } as Record<BlockId, number>,
  right: { account: 12, form: 18, risk: 10 } as Record<BlockId, number>,
}

const LS_KEYS = {
  leftOrder: 'margin-layout-order-left',
  rightOrder: 'margin-layout-order-right',
  leftSizes: 'margin-layout-sizes-left',
  rightSizes: 'margin-layout-sizes-right',
  columns: 'margin-layout-sizes-cols',
}

// ─── Helpers ────────────────────────────────────────────────────────────────
function loadJSON<T>(key: string, fallback: T): T {
  if (typeof window === 'undefined') return fallback
  try {
    const raw = localStorage.getItem(key)
    if (!raw) return fallback
    return JSON.parse(raw) as T
  } catch {
    return fallback
  }
}

function saveJSON(key: string, value: unknown) {
  if (typeof window === 'undefined') return
  try {
    localStorage.setItem(key, JSON.stringify(value))
  } catch {
    /* ignore */
  }
}

function isValidOrder(saved: unknown, def: BlockId[]): saved is BlockId[] {
  return (
    Array.isArray(saved) &&
    saved.length === def.length &&
    saved.every((k) => def.includes(k as BlockId))
  )
}

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

// ─── useMarginLayout: persist block order + panel sizes ─────────────────────
function useMarginLayout() {
  const { t } = useI18n()
  const [leftOrder, setLeftOrder] = useState<BlockId[]>(() => {
    const saved = loadJSON<unknown>(LS_KEYS.leftOrder, DEFAULT_LEFT_ORDER)
    return isValidOrder(saved, DEFAULT_LEFT_ORDER) ? saved : DEFAULT_LEFT_ORDER
  })
  const [rightOrder, setRightOrder] = useState<BlockId[]>(() => {
    const saved = loadJSON<unknown>(LS_KEYS.rightOrder, DEFAULT_RIGHT_ORDER)
    return isValidOrder(saved, DEFAULT_RIGHT_ORDER) ? saved : DEFAULT_RIGHT_ORDER
  })
  const [leftSizes, setLeftSizes] = useState<Record<BlockId, number>>(() =>
    loadJSON(LS_KEYS.leftSizes, DEFAULT_SIZES.left)
  )
  const [rightSizes, setRightSizes] = useState<Record<BlockId, number>>(() =>
    loadJSON(LS_KEYS.rightSizes, DEFAULT_SIZES.right)
  )
  const [columns, setColumns] = useState<[number, number]>(() =>
    loadJSON(LS_KEYS.columns, DEFAULT_SIZES.columns)
  )

  // Per-key debounce timers so simultaneous onLayout callbacks from the three
  // PanelGroups (cols + left + right) don't clobber each other's saves.
  const saveTimers = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map())
  const debouncedSave = useCallback((key: string, value: unknown) => {
    const timers = saveTimers.current
    const existing = timers.get(key)
    if (existing) clearTimeout(existing)
    timers.set(
      key,
      setTimeout(() => {
        saveJSON(key, value)
        timers.delete(key)
      }, 300)
    )
  }, [])

  const onColumnsLayout = useCallback(
    (sizes: number[]) => {
      const next: [number, number] = [sizes[0] ?? 70, sizes[1] ?? 30]
      setColumns(next)
      debouncedSave(LS_KEYS.columns, next)
    },
    [debouncedSave]
  )

  const onLeftLayout = useCallback(
    (sizes: number[]) => {
      setLeftSizes((prev) => {
        const next = { ...prev }
        leftOrder.forEach((id, i) => {
          next[id] = sizes[i] ?? prev[id] ?? 50
        })
        debouncedSave(LS_KEYS.leftSizes, next)
        return next
      })
    },
    [leftOrder, debouncedSave]
  )

  const onRightLayout = useCallback(
    (sizes: number[]) => {
      setRightSizes((prev) => {
        const next = { ...prev }
        rightOrder.forEach((id, i) => {
          next[id] = sizes[i] ?? prev[id] ?? 50
        })
        debouncedSave(LS_KEYS.rightSizes, next)
        return next
      })
    },
    [rightOrder, debouncedSave]
  )

  const handleLeftReorder = useCallback((newOrder: BlockId[]) => {
    setLeftOrder(newOrder)
    saveJSON(LS_KEYS.leftOrder, newOrder)
  }, [])
  const handleRightReorder = useCallback((newOrder: BlockId[]) => {
    setRightOrder(newOrder)
    saveJSON(LS_KEYS.rightOrder, newOrder)
  }, [])

  const reset = useCallback(() => {
    Object.values(LS_KEYS).forEach((k) => {
      try {
        localStorage.removeItem(k)
      } catch {
        /* ignore */
      }
    })
    setLeftOrder(DEFAULT_LEFT_ORDER)
    setRightOrder(DEFAULT_RIGHT_ORDER)
    setLeftSizes(DEFAULT_SIZES.left)
    setRightSizes(DEFAULT_SIZES.right)
    setColumns(DEFAULT_SIZES.columns)
    toast.success(t('margin.reset.toast'))
  }, [t])

  return {
    leftOrder,
    rightOrder,
    leftSizes,
    rightSizes,
    columns,
    onColumnsLayout,
    onLeftLayout,
    onRightLayout,
    handleLeftReorder,
    handleRightReorder,
    reset,
  }
}

// ─── MarginLevelBar ─────────────────────────────────────────────────────────
function MarginLevelBar({ ratio, label }: { ratio: number; label?: string }) {
  const { t } = useI18n()
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

// ─── Block: Chart (TradingView iframe, auto-reloads on significant resize) ─
function ChartBlock({ dragHandle, symbol }: { dragHandle: ReactNode; symbol: string }) {
  const { t } = useI18n()
  const containerRef = useRef<HTMLDivElement>(null)
  const [reloadKey, setReloadKey] = useState(0)

  useEffect(() => {
    const container = containerRef.current
    if (!container) return
    let lastW = container.offsetWidth
    let lastH = container.offsetHeight
    let timer: ReturnType<typeof setTimeout> | null = null
    const ro = new ResizeObserver(() => {
      const w = container.offsetWidth
      const h = container.offsetHeight
      if (Math.abs(w - lastW) > 60 || Math.abs(h - lastH) > 60) {
        lastW = w
        lastH = h
        if (timer) clearTimeout(timer)
        timer = setTimeout(() => setReloadKey((k) => k + 1), 600)
      }
    })
    ro.observe(container)
    return () => {
      ro.disconnect()
      if (timer) clearTimeout(timer)
    }
  }, [])

  return (
    <div className="flex-1 min-h-0 flex flex-col bg-card border border-border rounded-md overflow-hidden">
      <div className="px-2.5 py-1.5 border-b border-border flex items-center gap-1.5 shrink-0">
        {dragHandle}
        <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
          {t('margin.tabs.chart')}
        </span>
        <span className="ml-auto text-[10px] text-muted-foreground font-mono">
          {symbol.replace('BINANCE:', '')}
        </span>
      </div>
      <div ref={containerRef} className="flex-1 min-h-0 bg-black">
        <iframe
          key={reloadKey}
          title="TradingView Margin Chart"
          src={`https://www.tradingview.com/widgetembed/?frameElementId=tv&symbol=${encodeURIComponent(
            symbol
          )}&interval=5&theme=dark&hide_side_toolbar=false&hide_top_toolbar=false&allow_symbol_change=false&hideideas=true&hide_volume=false&autosize=true`}
          className="w-full h-full border-0"
          allowFullScreen
        />
      </div>
    </div>
  )
}

// ─── AccountSummaryCard ─────────────────────────────────────────────────────
function AccountSummaryCard({
  dragHandle,
  positions,
  equity,
  usedMargin,
  availableMargin,
}: {
  dragHandle: ReactNode
  positions: MarginPosition[]
  equity: number
  usedMargin: number
  availableMargin: number
}) {
  const { t } = useI18n()
  const openPositions = positions.filter((p) => p.status === 'OPEN')
  const unrealizedPnl = openPositions.reduce((s, p) => s + p.unrealizedPnl, 0)
  const netEquity = equity + unrealizedPnl
  const marginRatio = netEquity > 0 ? (usedMargin / netEquity) * 100 : 0

  return (
    <div className="flex-1 min-h-0 flex flex-col bg-card border border-border rounded-md overflow-hidden">
      <div className="px-2.5 py-1.5 border-b border-border flex items-center gap-1.5 shrink-0">
        {dragHandle}
        <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
          <Wallet className="w-3.5 h-3.5 text-primary" />
          {t('margin.account.title')}
        </span>
        <Badge variant="outline" className="ml-auto text-[10px] border-primary/30 text-primary">
          RUB
        </Badge>
      </div>
      <div className="p-3 space-y-3 overflow-y-auto scrollbar-thin">
        <div className="grid grid-cols-2 gap-2.5">
          <div>
            <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{t('margin.account.equity')}</div>
            <div className="text-base font-mono font-bold tabular-nums mt-0.5">
              {formatNumber(Math.round(netEquity))} ₽
            </div>
          </div>
          <div>
            <div className="text-[10px] uppercase tracking-wider text-muted-foreground">
              {t('margin.account.unrealizedPnl')}
            </div>
            <div
              className={cn(
                'text-base font-mono font-bold tabular-nums mt-0.5',
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
              {t('margin.account.used')}
            </div>
            <div className="text-xs font-mono tabular-nums mt-0.5">
              {formatNumber(Math.round(usedMargin))} ₽
            </div>
          </div>
          <div>
            <div className="text-[10px] uppercase tracking-wider text-muted-foreground">
              {t('margin.account.available')}
            </div>
            <div className="text-xs font-mono tabular-nums mt-0.5 text-primary">
              {formatNumber(Math.round(availableMargin))} ₽
            </div>
          </div>
        </div>

        <div className="pt-2 border-t border-border">
          <MarginLevelBar ratio={marginRatio} label={t('margin.account.marginLevel')} />
          {marginRatio >= 80 && (
            <div className="mt-2 flex items-center gap-1.5 text-[10px] text-destructive">
              <Flame className="w-3 h-3" />
              {t('margin.account.critical')}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// ─── OpenPositionForm ───────────────────────────────────────────────────────
function OpenPositionForm({
  dragHandle,
  pair,
  price,
  availableMargin,
}: {
  dragHandle: ReactNode
  pair: string
  price: number
  availableMargin: number
}) {
  const openMarginPosition = useAppStore((s) => s.openMarginPosition)
  const { t } = useI18n()
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
      toast.error(t('margin.toast.priceNotLoaded'))
      return
    }
    if (margin <= 0) {
      toast.error(t('margin.toast.marginRequired'))
      return
    }
    if (margin > availableMargin) {
      toast.error(t('margin.toast.insufficientMargin'), {
        description: `${t('margin.toast.availableWord')} ${formatNumber(Math.floor(availableMargin))} ₽`,
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
        `${side === 'long' ? 'Long' : 'Short'} ${pair} ${t('margin.toast.openedPrefix')} • ${leverage}x`,
        {
          description: `${t('margin.toast.marginWord')} ${formatNumber(margin)} ₽ • ${t('margin.toast.volumeWord')} ${formatNumber(positionSize)} ₽ • ${t('margin.toast.liquidationWord')} ${liquidationPrice.toLocaleString('ru-RU', { minimumFractionDigits: decimals, maximumFractionDigits: decimals })} ₽`,
        }
      )
      setMarginInput('')
      void pos
    } catch (e) {
      toast.error(t('margin.toast.openFailed'), {
        description: e instanceof Error ? e.message : t('margin.toast.unknownError'),
      })
    }
  }

  return (
    <div className="flex-1 min-h-0 flex flex-col bg-card border border-border rounded-md overflow-hidden">
      <div className="px-2.5 py-1.5 border-b border-border flex items-center gap-1.5 shrink-0">
        {dragHandle}
        <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
          <Zap className="w-3.5 h-3.5 text-primary" />
          {t('margin.form.title')}
        </span>
      </div>
      <div className="p-3 space-y-2.5 overflow-y-auto scrollbar-thin">
        {/* Side toggle */}
        <div className="grid grid-cols-2 gap-1.5">
          <button
            onClick={() => setSide('long')}
            className={cn(
              'py-2 rounded-lg text-sm font-semibold transition flex items-center justify-center gap-1.5',
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
              'py-2 rounded-lg text-sm font-semibold transition flex items-center justify-center gap-1.5',
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
        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-[10px] uppercase tracking-wider text-muted-foreground">
            <span>{t('margin.form.leverage')}</span>
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
            <span>{t('margin.form.margin')}</span>
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
            {t('margin.form.availableLabel')}{' '}
            <span className="font-mono tabular-nums">
              {formatNumber(Math.floor(availableMargin))} ₽
            </span>
          </div>
        </div>

        {/* Computed preview */}
        <div className="space-y-1 p-2.5 rounded-lg bg-muted/40 border border-border">
          <div className="flex justify-between text-xs">
            <span className="text-muted-foreground">{t('margin.form.positionSize')}</span>
            <span className="font-mono tabular-nums font-semibold">
              {formatNumber(positionSize)} ₽
            </span>
          </div>
          <div className="flex justify-between text-xs">
            <span className="text-muted-foreground">{t('margin.form.qty')} {base}</span>
            <span className="font-mono tabular-nums">
              {quantity.toLocaleString('ru-RU', { maximumFractionDigits: 6 })}
            </span>
          </div>
          <div className="flex justify-between text-xs">
            <span className="text-muted-foreground">{t('margin.form.entryPrice')}</span>
            <span className="font-mono tabular-nums">
              {price > 0
                ? price.toLocaleString('ru-RU', { minimumFractionDigits: decimals, maximumFractionDigits: decimals })
                : '—'}{' '}
              ₽
            </span>
          </div>
          <div className="flex justify-between text-xs">
            <span className="text-muted-foreground">{t('margin.form.liquidation')}</span>
            <span className="font-mono tabular-nums text-warning">
              {liquidationPrice > 0
                ? liquidationPrice.toLocaleString('ru-RU', { minimumFractionDigits: decimals, maximumFractionDigits: decimals })
                : '—'}{' '}
              ₽
            </span>
          </div>
          <div className="flex justify-between text-xs">
            <span className="text-muted-foreground">{t('margin.form.feeTaker')}</span>
            <span className="font-mono tabular-nums text-muted-foreground">
              {formatNumber(fee)} ₽
            </span>
          </div>
        </div>

        <Button
          onClick={handleSubmit}
          className={cn(
            'w-full h-10 font-semibold text-white shadow-sm gap-1.5',
            side === 'long' ? 'bg-success hover:bg-success/90' : 'bg-destructive hover:bg-destructive/90'
          )}
        >
          {side === 'long' ? t('margin.form.submitLong') : t('margin.form.submitShort')} {pair}
        </Button>
      </div>
    </div>
  )
}

// ─── RiskMetricsCard ────────────────────────────────────────────────────────
function RiskMetricsCard({ dragHandle }: { dragHandle: ReactNode }) {
  const { t } = useI18n()
  return (
    <div className="flex-1 min-h-0 flex flex-col bg-card border border-border rounded-md overflow-hidden">
      <div className="px-2.5 py-1.5 border-b border-border flex items-center gap-1.5 shrink-0">
        {dragHandle}
        <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
          <ShieldAlert className="w-3.5 h-3.5 text-warning" />
          {t('margin.params.title')}
        </span>
      </div>
      <div className="p-3 space-y-2 text-xs overflow-y-auto scrollbar-thin">
        <div className="flex justify-between">
          <span className="text-muted-foreground">{t('margin.params.initial')}</span>
          <span className="font-mono tabular-nums">{t('margin.params.initialValue')}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-muted-foreground">{t('margin.params.maint')}</span>
          <span className="font-mono tabular-nums">0.5%</span>
        </div>
        <div className="flex justify-between">
          <span className="text-muted-foreground">{t('margin.params.feeTaker')}</span>
          <span className="font-mono tabular-nums">0.06%</span>
        </div>
        <div className="flex justify-between">
          <span className="text-muted-foreground">{t('margin.params.maxLeverage')}</span>
          <span className="font-mono tabular-nums">{MAX_LEVERAGE}x</span>
        </div>
        <div className="pt-2 border-t border-border space-y-1.5">
          <div className="text-[10px] uppercase tracking-wider text-muted-foreground">
            {t('margin.params.liqFormula')}
          </div>
          <div className="font-mono text-[10px] text-muted-foreground leading-relaxed">
            <div>Long: P × (1 − 1/L + 0.005)</div>
            <div>Short: P × (1 + 1/L − 0.005)</div>
          </div>
        </div>
        <div className="flex items-start gap-1.5 text-[10px] text-muted-foreground pt-2 border-t border-border">
          <Info className="w-3 h-3 mt-0.5 shrink-0" />
          <span>
            {t('margin.params.liqDesc')}
          </span>
        </div>
      </div>
    </div>
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
  const { t: tPos } = useI18n()
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
        'grid grid-cols-12 gap-2 px-2.5 py-2 items-center text-xs border-b border-border/60 last:border-0 hover:bg-muted/40 transition-colors',
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
          {tPos('margin.positions.close')}
        </Button>
      </div>
    </div>
  )
}

function OpenPositionsTable({
  dragHandle,
  positions,
  onClose,
}: {
  dragHandle: ReactNode
  positions: MarginPosition[]
  onClose: (id: string) => void
}) {
  const { t } = useI18n()
  const open = positions.filter((p) => p.status === 'OPEN')
  const mounted = useMounted()
  // First-paint skeleton: render before store hydrates (mounted false)
  const showSkeleton = !mounted && open.length === 0
  return (
    <div className="flex-1 min-h-0 flex flex-col bg-card border border-border rounded-md overflow-hidden">
      <div className="px-2.5 py-1.5 border-b border-border flex items-center gap-1.5 shrink-0">
        {dragHandle}
        <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
          <Activity className="w-3.5 h-3.5 text-primary" />
          {t('margin.positions.title')}
          {open.length > 0 && (
            <Badge variant="outline" className="text-[10px] border-primary/30 text-primary">
              {open.length}
            </Badge>
          )}
        </span>
      </div>
      {showSkeleton ? (
        <div className="p-2.5">
          {Array.from({ length: 3 }).map((_, i) => (
            <PositionRowSkeleton key={i} />
          ))}
        </div>
      ) : open.length === 0 ? (
        <div className="px-3 py-10 text-center">
          <CheckCircle2 className="w-7 h-7 mx-auto text-muted-foreground/40 mb-2" />
          <p className="text-sm text-muted-foreground">{t('margin.positions.empty')}</p>
          <p className="text-[11px] text-muted-foreground/70 mt-1">
            {t('margin.positions.emptyHint')}
          </p>
        </div>
      ) : (
        <>
          <div className="hidden md:grid grid-cols-12 gap-2 px-2.5 py-1.5 text-[10px] uppercase tracking-wider text-muted-foreground border-b border-border shrink-0">
            <span className="col-span-2">{t('margin.positions.col.pairDir')}</span>
            <span className="col-span-1">{t('margin.positions.col.size')}</span>
            <span className="col-span-1">{t('margin.positions.col.entry')}</span>
            <span className="col-span-1">{t('margin.positions.col.current')}</span>
            <span className="col-span-3">PnL</span>
            <span className="col-span-1">{t('margin.positions.col.margin')}</span>
            <span className="col-span-1">{t('margin.positions.col.liq')}</span>
            <span className="col-span-2">{t('margin.positions.col.call')}</span>
          </div>
          <ScrollArea className="flex-1 min-h-0 scrollbar-thin">
            <div className="flex flex-col">
              {open.map((p) => (
                <PositionRow key={p.id} pos={p} onClose={onClose} />
              ))}
            </div>
          </ScrollArea>
        </>
      )}
    </div>
  )
}

// ─── Position history table ────────────────────────────────────────────────
function PositionHistory({
  dragHandle,
  positions,
}: {
  dragHandle: ReactNode
  positions: MarginPosition[]
}) {
  const { t } = useI18n()
  const closed = positions.filter((p) => p.status !== 'OPEN')
  return (
    <div className="flex-1 min-h-0 flex flex-col bg-card border border-border rounded-md overflow-hidden">
      <div className="px-2.5 py-1.5 border-b border-border flex items-center gap-1.5 shrink-0">
        {dragHandle}
        <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
          <XCircle className="w-3.5 h-3.5 text-muted-foreground" />
          {t('margin.history.title')}
        </span>
      </div>
      {closed.length === 0 ? (
        <div className="px-3 py-8 text-center">
          <p className="text-sm text-muted-foreground">{t('margin.history.empty')}</p>
          <p className="text-[11px] text-muted-foreground/70 mt-1">
            {t('margin.history.emptyHint')}
          </p>
        </div>
      ) : (
        <ScrollArea className="flex-1 min-h-0 scrollbar-thin">
          <div className="flex flex-col">
            <div className="hidden md:grid grid-cols-12 gap-2 px-2.5 py-1.5 text-[10px] uppercase tracking-wider text-muted-foreground border-b border-border">
              <span className="col-span-2">{t('margin.history.col.pairDir')}</span>
              <span className="col-span-2">{t('margin.history.col.pnlReal')}</span>
              <span className="col-span-5">{t('margin.history.col.entryExit')}</span>
              <span className="col-span-2">{t('margin.history.col.status')}</span>
              <span className="col-span-1 text-right">{t('margin.history.col.time')}</span>
            </div>
            {closed.map((p) => {
              const isLong = p.side === 'long'
              const pnl = p.realizedPnl ?? 0
              const decimals = priceDecimals(p.entryPrice)
              return (
                <div
                  key={p.id}
                  className="grid grid-cols-12 gap-2 px-2.5 py-2 items-center text-xs border-b border-border/60 last:border-0 hover:bg-muted/40"
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
                      {p.status === 'CLOSED' ? t('margin.history.closed') : t('margin.history.liquidated')}
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
    </div>
  )
}

// ─── MarginResizeHandle: thin draggable divider between panels ──────────────
function MarginResizeHandle({
  id,
  orientation,
}: {
  id: string
  orientation: 'horizontal' | 'vertical'
}) {
  const isHoriz = orientation === 'horizontal'
  return (
    <PanelResizeHandle
      id={id}
      className={cn(
        'relative group flex items-center justify-center shrink-0 z-10',
        isHoriz ? 'w-2 cursor-col-resize' : 'h-2 cursor-row-resize'
      )}
    >
      <div
        className={cn(
          'bg-border group-hover:bg-primary transition-colors',
          isHoriz ? 'w-px h-full' : 'h-px w-full'
        )}
      />
      <div
        className={cn(
          'absolute rounded-full bg-primary/50 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none',
          isHoriz ? 'h-6 w-1' : 'w-6 h-1'
        )}
      />
    </PanelResizeHandle>
  )
}

// ─── SortableBlock: wrapper that makes a block drag-reorderable ─────────────
function SortableBlock({
  id,
  render,
}: {
  id: BlockId
  render: (dragHandle: ReactNode) => ReactNode
}) {
  const { t } = useI18n()
  const { attributes, listeners, setNodeRef, isDragging, isOver } = useSortable({ id })
  const dragHandle = (
    <button
      type="button"
      {...attributes}
      {...listeners}
      className="cursor-grab active:cursor-grabbing text-muted-foreground hover:text-primary touch-none flex items-center justify-center shrink-0"
      aria-label={t('margin.drag.aria')}
      title={t('margin.drag.title')}
    >
      <GripVertical className="w-3.5 h-3.5" />
    </button>
  )
  return (
    <div
      ref={setNodeRef}
      className={cn(
        'flex-1 min-h-0 flex flex-col',
        isDragging && 'opacity-30',
        isOver && !isDragging && 'ring-2 ring-inset ring-primary/70 z-20'
      )}
    >
      {render(dragHandle)}
    </div>
  )
}

// ─── ColumnPanelGroup: a vertical PanelGroup with drag-reorderable blocks ──
function ColumnPanelGroup({
  columnId,
  order,
  sizes,
  minSizes,
  onLayout,
  onReorder,
  renderBlock,
}: {
  columnId: ColumnId
  order: BlockId[]
  sizes: Record<BlockId, number>
  minSizes: Record<BlockId, number>
  onLayout: (sizes: number[]) => void
  onReorder: (newOrder: BlockId[]) => void
  renderBlock: (blockId: BlockId, dragHandle: ReactNode) => ReactNode
}) {
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } })
  )
  const [isDragging, setIsDragging] = useState(false)

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      const { active, over } = event
      if (!over || active.id === over.id) return
      const oldIndex = order.indexOf(active.id as BlockId)
      const newIndex = order.indexOf(over.id as BlockId)
      if (oldIndex < 0 || newIndex < 0) return
      onReorder(arrayMove(order, oldIndex, newIndex))
    },
    [order, onReorder]
  )

  // While dragging, disable iframe pointer events so the TradingView chart
  // can't steal the cursor (see globals.css `body.trade-dnd-dragging`).
  useEffect(() => {
    if (isDragging) {
      document.body.classList.add('trade-dnd-dragging')
      return () => document.body.classList.remove('trade-dnd-dragging')
    }
    return undefined
  }, [isDragging])

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={() => setIsDragging(true)}
      onDragEnd={(e) => {
        setIsDragging(false)
        handleDragEnd(e)
      }}
      onDragCancel={() => setIsDragging(false)}
    >
      <PanelGroup
        direction="vertical"
        id={`margin-${columnId}`}
        onLayout={onLayout}
        className="h-full"
      >
        <SortableContext items={order} strategy={verticalListSortingStrategy}>
          {order.map((blockId, i) => (
            <Fragment key={blockId}>
              {i > 0 && (
                <MarginResizeHandle id={`${columnId}-h-${i}`} orientation="vertical" />
              )}
              <Panel
                id={blockId}
                order={i}
                defaultSize={sizes[blockId] ?? 50}
                minSize={minSizes[blockId] ?? 10}
                className="flex flex-col"
              >
                <SortableBlock
                  id={blockId}
                  render={(dh) => renderBlock(blockId, dh)}
                />
              </Panel>
            </Fragment>
          ))}
        </SortableContext>
      </PanelGroup>
    </DndContext>
  )
}

// ─── Main MarginView ────────────────────────────────────────────────────────
export function MarginView() {
  const { t } = useI18n()
  const [selectedPair, setSelectedPair] = useState<string>('BTC/RUB')
  const [tickers, setTickers] = useState<CoinTicker[]>([])
  const [livePrice, setLivePrice] = useState<number>(0)
  const [highlight, setHighlight] = useState<'up' | 'down' | null>(null)
  const [marginActivated, setMarginActivated] = useState<boolean>(true)

  const marginPositions = useAppStore((s) => s.marginPositions)
  const marginAccount = useAppStore((s) => s.marginAccount)
  const closeMarginPosition = useAppStore((s) => s.closeMarginPosition)
  const updateMarginPrices = useAppStore((s) => s.updateMarginPrices)

  const layout = useMarginLayout()

  // Live WS market data for selected pair
  const { livePrice: wsPrice, connected } = useLiveMarket(selectedPair)

  // Fetch tickers every 5s
  useEffect(() => {
    let mounted = true
    const load = async () => {
      const tt = await fetchTickers()
      if (mounted) setTickers(tt)
    }
    load()
    const interval = setInterval(load, 5000)
    return () => {
      mounted = false
      clearInterval(interval)
    }
  }, [])

  const base = selectedPair.split('/')[0]
  const ticker = useMemo(() => tickers.find((tk) => tk.symbol === base) ?? null, [tickers, base])

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
      toast.error(t('margin.close.toast.noPrice'))
      return
    }
    closeMarginPosition(id, livePrice)
    toast.success(`${pos.side === 'long' ? 'Long' : 'Short'} ${pos.pair} ${t('margin.close.toast.closedPrefix')}`, {
      description: `${t('margin.close.toast.priceWord')} ${livePrice.toLocaleString('ru-RU', { minimumFractionDigits: decimals, maximumFractionDigits: decimals })} ₽`,
    })
  }

  const renderBlock = useCallback(
    (blockId: BlockId, dragHandle: ReactNode): ReactNode => {
      switch (blockId) {
        case 'chart':
          return <ChartBlock dragHandle={dragHandle} symbol={tvSymbol} />
        case 'positions':
          return (
            <OpenPositionsTable
              dragHandle={dragHandle}
              positions={marginPositions}
              onClose={handleClose}
            />
          )
        case 'history':
          return <PositionHistory dragHandle={dragHandle} positions={marginPositions} />
        case 'account':
          return (
            <AccountSummaryCard
              dragHandle={dragHandle}
              positions={marginPositions}
              equity={marginAccount.equity}
              usedMargin={marginAccount.usedMargin}
              availableMargin={marginAccount.availableMargin}
            />
          )
        case 'form':
          return (
            <OpenPositionForm
              dragHandle={dragHandle}
              pair={selectedPair}
              price={livePrice}
              availableMargin={marginAccount.availableMargin}
            />
          )
        case 'risk':
          return <RiskMetricsCard dragHandle={dragHandle} />
        default:
          return null
      }
    },
    [
      tvSymbol,
      marginPositions,
      handleClose,
      marginAccount.equity,
      marginAccount.usedMargin,
      marginAccount.availableMargin,
      selectedPair,
      livePrice,
    ]
  )

  // Mobile stacked-block heights
  const mobileHeight = (id: BlockId): string => {
    switch (id) {
      case 'chart':
        return 'h-[400px]'
      case 'positions':
        return 'h-[440px]'
      case 'history':
        return 'h-[260px]'
      case 'account':
        return 'h-[300px]'
      case 'form':
        return 'h-[560px]'
      case 'risk':
        return 'h-[280px]'
      default:
        return 'h-[260px]'
    }
  }

  return (
    <div className="flex-1 bg-background">
      <div className="px-2 lg:px-3 py-2">
        {/* Risk warning banner (fixed outside resizable area) */}
        <div className="mb-2 flex items-start gap-2 px-2.5 py-1.5 rounded-lg bg-destructive/10 border border-destructive/30 text-destructive">
          <AlertTriangle className="w-3.5 h-3.5 mt-0.5 shrink-0" />
          <p className="text-[11px] leading-relaxed">
            <span className="font-semibold">{t('margin.risk.warn')}</span> {t('margin.risk.warnBody')}
          </p>
        </div>

        {/* Top pair bar (fixed outside resizable area) */}
        <div className="flex flex-wrap items-center gap-2 lg:gap-4 mb-2 p-2 bg-card border border-border rounded-lg">
          {/* Pair selector */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" className="gap-1.5 h-8 px-2.5 font-semibold text-sm">
                <CoinIcon symbol={base} size={20} />
                <span>{selectedPair}</span>
                <ChevronDown className="w-3.5 h-3.5 text-muted-foreground" />
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
                    className="gap-2 cursor-pointer py-1.5"
                  >
                    <CoinIcon symbol={sym} size={18} />
                    <span className="flex-1 font-medium text-sm">{p}</span>
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
          <div className="flex items-baseline gap-2">
            <span
              className={cn(
                'inline-block rounded-md px-1.5 py-0.5 text-xl lg:text-2xl font-mono font-bold tabular-nums transition-colors',
                highlight === 'up' && 'flash-up text-success',
                highlight === 'down' && 'flash-down text-destructive',
                !highlight && 'text-foreground'
              )}
            >
              {livePrice > 0
                ? `${livePrice.toLocaleString('ru-RU', { maximumFractionDigits: decimals })} ₽`
                : '— —'}
            </span>
            <span className="text-[11px] text-muted-foreground">
              ≈ {ticker ? formatPrice(ticker.priceUsd, 'usd') : '—'}
            </span>
            {connected && (
              <span className="inline-flex items-center gap-1 text-[10px] text-success">
                <span className="w-1.5 h-1.5 rounded-full bg-success animate-pulse" /> LIVE
              </span>
            )}
          </div>

          {/* 24h change */}
          <div className="flex items-center gap-1">
            <span
              className={cn(
                'flex items-center gap-1 text-xs font-semibold px-1.5 py-0.5 rounded-md',
                isUp ? 'text-success bg-success/10' : 'text-destructive bg-destructive/10'
              )}
            >
              {isUp ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
              {formatPercent(change24h)}
            </span>
            <span className="text-[9px] uppercase tracking-wider text-muted-foreground hidden sm:inline">
              {t('margin.chart.24h')}
            </span>
          </div>

          {/* Right side: margin activation toggle + reset layout */}
          <div className="ml-auto flex items-center gap-1.5">
            <TooltipProvider delayDuration={200}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="flex items-center gap-1.5 px-2 py-1.5 rounded-lg bg-muted/40 border border-border">
                    <Zap className="w-3.5 h-3.5 text-primary" />
                    <span className="text-[11px] font-medium hidden sm:inline">{t('margin.activate.active')}</span>
                    <Switch checked={marginActivated} onCheckedChange={setMarginActivated} />
                  </div>
                </TooltipTrigger>
                <TooltipContent side="bottom">
                  {t('margin.activate.title')}
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>

            <Button
              variant="ghost"
              size="sm"
              onClick={layout.reset}
              className="h-8 gap-1.5 text-[11px] text-muted-foreground hover:text-primary"
              title={t('margin.reset.button')}
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span className="hidden lg:inline">{t('margin.reset.button')}</span>
            </Button>
          </div>
        </div>

        <AnimatePresence>
          {marginActivated ? (
            <motion.div
              key="margin-active"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              {/* Desktop (lg+): resizable + rearrangeable panel grid */}
              <div className="hidden lg:block h-[calc(100vh-200px)] min-h-[480px]">
                <PanelGroup
                  direction="horizontal"
                  id="margin-cols"
                  onLayout={layout.onColumnsLayout}
                >
                  <Panel
                    id="left-col"
                    order={0}
                    defaultSize={layout.columns[0]}
                    minSize={45}
                    maxSize={78}
                    className="flex flex-col"
                  >
                    <ColumnPanelGroup
                      columnId="left"
                      order={layout.leftOrder}
                      sizes={layout.leftSizes}
                      minSizes={MIN_SIZES.left}
                      onLayout={layout.onLeftLayout}
                      onReorder={layout.handleLeftReorder}
                      renderBlock={renderBlock}
                    />
                  </Panel>
                  <MarginResizeHandle id="cols-h" orientation="horizontal" />
                  <Panel
                    id="right-col"
                    order={1}
                    defaultSize={layout.columns[1]}
                    minSize={22}
                    maxSize={55}
                    className="flex flex-col"
                  >
                    <ColumnPanelGroup
                      columnId="right"
                      order={layout.rightOrder}
                      sizes={layout.rightSizes}
                      minSizes={MIN_SIZES.right}
                      onLayout={layout.onRightLayout}
                      onReorder={layout.handleRightReorder}
                      renderBlock={renderBlock}
                    />
                  </Panel>
                </PanelGroup>
              </div>

              {/* Mobile (<lg): stacked blocks, no resize/drag */}
              <div className="lg:hidden space-y-2">
                {[...layout.leftOrder, ...layout.rightOrder].map((blockId) => (
                  <div key={blockId} className={cn(mobileHeight(blockId), 'flex flex-col')}>
                    {renderBlock(blockId, <span aria-hidden />)}
                  </div>
                ))}
              </div>
            </motion.div>
          ) : (
            <motion.div
              key="margin-inactive"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              <Card className="p-12 bg-card border-border text-center">
                <div className="w-16 h-16 mx-auto rounded-full bg-warning/10 flex items-center justify-center mb-4">
                  <ShieldAlert className="w-8 h-8 text-warning" />
                </div>
                <h3 className="text-lg font-semibold mb-2">
                  {t('margin.deactivated')}
                </h3>
                <p className="text-sm text-muted-foreground max-w-md mx-auto mb-6">
                  {t('margin.deactivatedDesc')}
                </p>
                <Button
                  onClick={() => setMarginActivated(true)}
                  className="bg-primary text-primary-foreground hover:bg-primary/90"
                >
                  <Zap className="w-4 h-4 mr-1.5" />
                  {t('margin.activateBtn')}
                </Button>
              </Card>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}
