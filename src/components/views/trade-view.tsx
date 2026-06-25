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
  ArrowDownRight,
  GripVertical,
  RotateCcw,
  CandlestickChart,
  Info,
  Download,
} from 'lucide-react'
import { useAppStore } from '@/lib/store'
import { fetchTickers, jitterPrice } from '@/lib/market'
import { useLiveMarket } from '@/lib/use-live-market'
import type { CoinTicker, OrderSide, OrderType, Trade } from '@/lib/types'
import { formatPrice, formatNumber, formatPercent } from '@/lib/format'
import { cn } from '@/lib/utils'
import { CoinIcon } from '@/components/coin-icon'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Slider } from '@/components/ui/slider'
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from '@/components/ui/dropdown-menu'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
  TooltipProvider,
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

// ─── Layout types & constants ───────────────────────────────────────────────
type BlockId = 'chart' | 'trades' | 'book' | 'form' | 'mytrades'
type ColumnId = 'left' | 'right'

const DEFAULT_LEFT_ORDER: BlockId[] = ['chart', 'trades']
const DEFAULT_RIGHT_ORDER: BlockId[] = ['book', 'form', 'mytrades']

const BLOCK_TITLES: Record<BlockId, string> = {
  chart: 'График',
  trades: 'Сделки',
  book: 'Стакан',
  form: 'Ордер',
  mytrades: 'Мои сделки',
}

const DEFAULT_SIZES = {
  columns: [70, 30] as [number, number],
  left: { chart: 75, trades: 25 } as Record<BlockId, number>,
  right: { book: 40, form: 35, mytrades: 25 } as Record<BlockId, number>,
}

const MIN_SIZES = {
  left: { chart: 15, trades: 10 } as Record<BlockId, number>,
  right: { book: 18, form: 18, mytrades: 10 } as Record<BlockId, number>,
}

const LS_KEYS = {
  leftOrder: 'trade-layout-order-left',
  rightOrder: 'trade-layout-order-right',
  leftSizes: 'trade-layout-sizes-left',
  rightSizes: 'trade-layout-sizes-right',
  columns: 'trade-layout-sizes-cols',
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

function uid() {
  return Math.random().toString(36).slice(2, 11)
}

function fmtTimeNow(): string {
  return new Date().toLocaleTimeString('ru-RU', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  })
}

function priceDecimals(price: number): number {
  if (price >= 1) return 2
  if (price >= 0.01) return 4
  return 6
}

// ─── useTradeLayout: persist block order + panel sizes ──────────────────────
function useTradeLayout() {
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
    toast.success('Layout сброшен к значениям по умолчанию')
  }, [])

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

// ─── Small reusable bits ────────────────────────────────────────────────────
function LiveBadge() {
  return (
    <span className="inline-flex items-center gap-0.5 text-[9px] text-success font-semibold uppercase tracking-wide">
      <span className="w-1.5 h-1.5 rounded-full bg-success animate-pulse" />
      LIVE
    </span>
  )
}

// ─── TradeResizeHandle: thin draggable divider between panels ───────────────
function TradeResizeHandle({
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
  const { attributes, listeners, setNodeRef, isDragging, isOver } = useSortable({ id })
  const dragHandle = (
    <button
      type="button"
      {...attributes}
      {...listeners}
      className="cursor-grab active:cursor-grabbing text-muted-foreground hover:text-primary touch-none flex items-center justify-center shrink-0"
      aria-label="Перетащить блок"
      title="Перетащите, чтобы изменить порядок"
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
        id={`trade-${columnId}`}
        onLayout={onLayout}
        className="h-full"
      >
        <SortableContext items={order} strategy={verticalListSortingStrategy}>
          {order.map((blockId, i) => (
            <Fragment key={blockId}>
              {i > 0 && (
                <TradeResizeHandle id={`${columnId}-h-${i}`} orientation="vertical" />
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

// ─── Block: Chart (TradingView iframe, auto-reloads on significant resize) ─
function ChartBlock({ dragHandle, symbol }: { dragHandle: ReactNode; symbol: string }) {
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
      // Only reload on a meaningful size change (avoids spamming on every tick)
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
      <div className="px-2 py-1 border-b border-border flex items-center gap-1.5 shrink-0">
        {dragHandle}
        <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
          График
        </span>
        <span className="ml-auto text-[10px] text-muted-foreground font-mono">
          {symbol.replace('BINANCE:', '')}
        </span>
      </div>
      <div ref={containerRef} className="flex-1 min-h-0 bg-black">
        <iframe
          key={reloadKey}
          title="TradingView Chart"
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

// ─── Block: OrderBook (with depth chart) ────────────────────────────────────
interface BookRowProps {
  price: number
  amount: number
  maxAmount: number
  side: 'ask' | 'bid'
  decimals: number
}

function BookRow({ price, amount, maxAmount, side, decimals }: BookRowProps) {
  const prevPriceRef = useRef<number>(price)
  const [flash, setFlash] = useState<'up' | 'down' | null>(null)

  useEffect(() => {
    const prev = prevPriceRef.current
    if (price !== prev) {
      setFlash(price > prev ? 'up' : 'down')
      prevPriceRef.current = price
      const t = setTimeout(() => setFlash(null), 600)
      return () => clearTimeout(t)
    }
    return undefined
  }, [price])

  const total = price * amount
  const wPct = (amount / (maxAmount || 1)) * 100
  const colorClass = side === 'ask' ? 'text-destructive' : 'text-success'
  const barClass = side === 'ask' ? 'bg-destructive/20' : 'bg-success/20'

  return (
    <div
      className={cn(
        'relative grid grid-cols-3 px-2 py-[2px] text-[13px] font-mono tabular-nums transition-colors',
        flash === 'up' && 'flash-up',
        flash === 'down' && 'flash-down'
      )}
    >
      <div className={cn('absolute inset-y-0 right-0', barClass)} style={{ width: `${wPct}%` }} aria-hidden />
      <span className={cn('relative font-semibold', colorClass)}>
        {price.toLocaleString('ru-RU', {
          minimumFractionDigits: decimals,
          maximumFractionDigits: decimals,
        })}
      </span>
      <span className="relative text-right text-foreground/90 font-medium">
        {amount.toLocaleString('ru-RU', { maximumFractionDigits: 4 })}
      </span>
      <span className="relative text-right text-muted-foreground">
        {total.toLocaleString('ru-RU', { maximumFractionDigits: 0 })}
      </span>
    </div>
  )
}

interface DepthChartProps {
  asks: { price: number; amount: number }[]
  bids: { price: number; amount: number }[]
  midPrice: number
}

function DepthChart({ asks, bids, midPrice }: DepthChartProps) {
  const W = 320
  const H = 60
  const PAD = 2

  if (asks.length === 0 || bids.length === 0 || midPrice <= 0) {
    return (
      <div className="h-[60px] flex items-center justify-center text-[10px] text-muted-foreground">
        Загрузка глубины…
      </div>
    )
  }

  const bidLevels = [...bids].sort((a, b) => b.price - a.price)
  const askLevels = [...asks].sort((a, b) => a.price - b.price)

  const bidCurve = bidLevels.reduce<Array<{ price: number; cum: number }>>(
    (acc, l) => {
      const prev = acc.length > 0 ? acc[acc.length - 1].cum : 0
      acc.push({ price: l.price, cum: prev + l.amount })
      return acc
    },
    []
  )
  const bidCum = bidCurve.length > 0 ? bidCurve[bidCurve.length - 1].cum : 0

  const askCurve = askLevels.reduce<Array<{ price: number; cum: number }>>(
    (acc, l) => {
      const prev = acc.length > 0 ? acc[acc.length - 1].cum : 0
      acc.push({ price: l.price, cum: prev + l.amount })
      return acc
    },
    []
  )
  const askCum = askCurve.length > 0 ? askCurve[askCurve.length - 1].cum : 0

  const minPrice = bidCurve[bidCurve.length - 1]?.price ?? midPrice
  const maxPrice = askCurve[askCurve.length - 1]?.price ?? midPrice
  const priceRange = Math.max(maxPrice - minPrice, midPrice * 0.0001)
  const maxCum = Math.max(bidCum, askCum, 1)
  const halfW = (W - PAD * 2) / 2

  const bidPts = bidCurve.map((p) => {
    const x = PAD + ((p.price - minPrice) / priceRange) * halfW
    const y = H - PAD - (p.cum / maxCum) * (H - PAD * 2)
    return `${x.toFixed(2)},${y.toFixed(2)}`
  })
  const bidArea = `${PAD},${H - PAD} ${bidPts.join(' ')} ${PAD + halfW},${H - PAD}`

  const askPts = askCurve.map((p) => {
    const x = PAD + halfW + ((p.price - midPrice) / priceRange) * halfW
    const y = H - PAD - (p.cum / maxCum) * (H - PAD * 2)
    return `${x.toFixed(2)},${y.toFixed(2)}`
  })
  const askArea = `${PAD + halfW},${H - PAD} ${askPts.join(' ')} ${W - PAD},${H - PAD}`

  const bidLine = bidPts.join(' ')
  const askLine = askPts.join(' ')
  const midX = PAD + halfW

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      width="100%"
      height={H}
      preserveAspectRatio="none"
      className="overflow-visible"
    >
      <defs>
        <linearGradient id="depthBid" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="oklch(0.7 0.17 155)" stopOpacity="0.45" />
          <stop offset="100%" stopColor="oklch(0.7 0.17 155)" stopOpacity="0.05" />
        </linearGradient>
        <linearGradient id="depthAsk" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="oklch(0.62 0.22 25)" stopOpacity="0.45" />
          <stop offset="100%" stopColor="oklch(0.62 0.22 25)" stopOpacity="0.05" />
        </linearGradient>
      </defs>
      <polygon points={bidArea} fill="url(#depthBid)" />
      <polyline points={bidLine} fill="none" stroke="oklch(0.7 0.17 155)" strokeWidth="1.2" />
      <polygon points={askArea} fill="url(#depthAsk)" />
      <polyline points={askLine} fill="none" stroke="oklch(0.62 0.22 25)" strokeWidth="1.2" />
      <line
        x1={midX}
        y1={PAD}
        x2={midX}
        y2={H - PAD}
        stroke="oklch(0.82 0.16 85)"
        strokeWidth="1"
        strokeDasharray="2,2"
        opacity="0.6"
      />
    </svg>
  )
}

function OrderBook({
  price,
  pair,
  liveBook,
  connected,
  dragHandle,
}: {
  price: number
  pair: string
  liveBook: ReturnType<typeof useLiveMarket>['orderBook']
  connected: boolean
  dragHandle: ReactNode
}) {
  const levels = useMemo(() => {
    if (liveBook && liveBook.asks.length > 0) {
      const asks = liveBook.asks.slice(0, 12)
      const bids = liveBook.bids.slice(0, 12)
      const maxAmount = Math.max(...asks.map((l) => l.amount), ...bids.map((l) => l.amount))
      return { asks, bids, maxAmount, spread: liveBook.spread }
    }
    if (price <= 0) return { asks: [], bids: [], maxAmount: 1, spread: 0 }
    const tick = price * 0.0005
    const askRaw = Array.from({ length: 12 }, (_, i) => {
      const p = price + tick * (i + 1)
      const amount = parseFloat((Math.random() * 4 + 0.05).toFixed(4))
      return { price: p, amount, total: 0 }
    })
    const bidRaw = Array.from({ length: 12 }, (_, i) => {
      const p = price - tick * (i + 1)
      const amount = parseFloat((Math.random() * 4 + 0.05).toFixed(4))
      return { price: Math.max(p, 0.0001), amount, total: 0 }
    })
    const maxAmount = Math.max(...askRaw.map((l) => l.amount), ...bidRaw.map((l) => l.amount))
    return {
      asks: askRaw,
      bids: bidRaw,
      maxAmount,
      spread: askRaw[0] && bidRaw[0] ? askRaw[0].price - bidRaw[0].price : 0,
    }
  }, [price, liveBook])

  const spread = levels.spread || 0
  const spreadPct = price > 0 ? (spread / price) * 100 : 0
  const decimals = priceDecimals(price)
  const midPrice = price > 0 ? price : (liveBook?.midPrice ?? 0)

  return (
    <div className="flex-1 min-h-0 flex flex-col bg-card border border-border rounded-md overflow-hidden">
      <div className="px-2 py-1 border-b border-border flex items-center justify-between gap-2 shrink-0">
        <div className="flex items-center gap-1.5 min-w-0">
          {dragHandle}
          <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
            Стакан
          </span>
          {connected && <LiveBadge />}
        </div>
        <span className="text-[10px] text-muted-foreground font-mono">{pair}</span>
      </div>
      <div className="grid grid-cols-3 px-2 py-1 text-[9px] uppercase tracking-wider text-muted-foreground shrink-0">
        <span>Цена ₽</span>
        <span className="text-right">Объём</span>
        <span className="text-right">Сумма</span>
      </div>
      <div className="flex-1 min-h-0 overflow-y-auto scrollbar-thin">
        <div className="flex flex-col-reverse">
          {levels.asks.map((l, i) => (
            <BookRow
              key={`a-${i}`}
              price={l.price}
              amount={l.amount}
              maxAmount={levels.maxAmount}
              side="ask"
              decimals={decimals}
            />
          ))}
        </div>
      </div>
      <div className="border-y border-border bg-muted/40 px-2 py-1 flex items-center justify-between shrink-0">
        <div className="flex items-baseline gap-1.5">
          <span className="text-sm font-mono font-bold tabular-nums text-primary">
            {price > 0
              ? price.toLocaleString('ru-RU', {
                  minimumFractionDigits: decimals,
                  maximumFractionDigits: decimals,
                })
              : '— —'}
          </span>
          <ArrowDownRight className="w-3 h-3 text-muted-foreground" />
        </div>
        <div className="text-right">
          <div className="text-[9px] text-muted-foreground leading-tight">Спред</div>
          <div className="text-[10px] font-mono tabular-nums leading-tight">
            {spread.toLocaleString('ru-RU', { maximumFractionDigits: decimals })}
            <span className="text-muted-foreground ml-1">({spreadPct.toFixed(3)}%)</span>
          </div>
        </div>
      </div>
      <div className="flex-1 min-h-0 overflow-y-auto scrollbar-thin">
        <div className="flex flex-col">
          {levels.bids.map((l, i) => (
            <BookRow
              key={`b-${i}`}
              price={l.price}
              amount={l.amount}
              maxAmount={levels.maxAmount}
              side="bid"
              decimals={decimals}
            />
          ))}
        </div>
      </div>
      <div className="border-t border-border px-2 pt-1 pb-1.5 shrink-0">
        <div className="flex items-center justify-between mb-0.5">
          <span className="text-[9px] uppercase tracking-wider text-muted-foreground">
            Глубина
          </span>
          <div className="flex items-center gap-2 text-[9px] text-muted-foreground">
            <span className="flex items-center gap-0.5">
              <span className="w-2 h-2 rounded-sm bg-success/60" /> Bids
            </span>
            <span className="flex items-center gap-0.5">
              <span className="w-2 h-2 rounded-sm bg-destructive/60" /> Asks
            </span>
          </div>
        </div>
        <DepthChart asks={levels.asks} bids={levels.bids} midPrice={midPrice} />
      </div>
    </div>
  )
}

// ─── Block: RecentTrades (tape) ─────────────────────────────────────────────
interface RecentTrade {
  id: string
  price: number
  amount: number
  side: OrderSide
  time: string
}

function RecentTrades({
  price,
  pair,
  liveTrades,
  connected,
  dragHandle,
}: {
  price: number
  pair: string
  liveTrades: ReturnType<typeof useLiveMarket>['trades']
  connected: boolean
  dragHandle: ReactNode
}) {
  const [mockTrades, setMockTrades] = useState<RecentTrade[]>([])

  useEffect(() => {
    if (connected && liveTrades.length > 0) return
    if (price <= 0) return
    const seedTimer = setTimeout(() => {
      setMockTrades((prev) => {
        if (prev.length > 0) return prev
        return Array.from({ length: 18 }, () => {
          const side: OrderSide = Math.random() > 0.5 ? 'buy' : 'sell'
          const drift = price * (Math.random() - 0.5) * 0.0015
          return {
            id: uid(),
            price: Math.max(price + drift, 0.0001),
            amount: parseFloat((Math.random() * 2 + 0.005).toFixed(4)),
            side,
            time: fmtTimeNow(),
          }
        })
      })
    }, 0)
    const interval = setInterval(() => {
      const side: OrderSide = Math.random() > 0.5 ? 'buy' : 'sell'
      const drift = price * (Math.random() - 0.5) * 0.0015
      const t: RecentTrade = {
        id: uid(),
        price: Math.max(price + drift, 0.0001),
        amount: parseFloat((Math.random() * 2 + 0.005).toFixed(4)),
        side,
        time: fmtTimeNow(),
      }
      setMockTrades((prev) => [t, ...prev].slice(0, 30))
    }, 2000)
    return () => {
      clearTimeout(seedTimer)
      clearInterval(interval)
    }
  }, [price, connected, liveTrades.length])

  const trades =
    connected && liveTrades.length > 0
      ? liveTrades.map((t) => ({
          id: t.id,
          price: t.price,
          amount: t.amount,
          side: t.side,
          time: t.time,
        }))
      : mockTrades

  const decimals = priceDecimals(price)

  return (
    <div className="flex-1 min-h-0 flex flex-col bg-card border border-border rounded-md overflow-hidden">
      <div className="px-2 py-1 border-b border-border flex items-center justify-between gap-2 shrink-0">
        <div className="flex items-center gap-1.5 min-w-0">
          {dragHandle}
          <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
            Сделки
          </span>
          {connected && <LiveBadge />}
        </div>
        <span className="text-[10px] text-muted-foreground font-mono">{pair}</span>
      </div>
      <div className="grid grid-cols-3 px-2 py-1 text-[9px] uppercase tracking-wider text-muted-foreground border-b border-border shrink-0">
        <span>Цена ₽</span>
        <span className="text-right">Объём</span>
        <span className="text-right">Время</span>
      </div>
      <div className="flex-1 min-h-0 overflow-y-auto scrollbar-thin">
        <div className="flex flex-col">
          {trades.map((t) => (
            <div
              key={t.id}
              className="grid grid-cols-3 px-2 py-[2px] text-[11px] font-mono tabular-nums hover:bg-muted/40"
            >
              <span className={cn(t.side === 'buy' ? 'text-success' : 'text-destructive')}>
                {t.price.toLocaleString('ru-RU', {
                  minimumFractionDigits: decimals,
                  maximumFractionDigits: decimals,
                })}
              </span>
              <span className="text-right text-foreground/90">
                {t.amount.toLocaleString('ru-RU', { maximumFractionDigits: 4 })}
              </span>
              <span className="text-right text-muted-foreground">{t.time}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

// ─── Block: OrderForm (buy/sell) ────────────────────────────────────────────
function OrderForm({
  price,
  pair,
  ticker,
  dragHandle,
}: {
  price: number
  pair: string
  ticker: CoinTicker | null
  dragHandle: ReactNode
}) {
  const balances = useAppStore((s) => s.balances)
  const placeOrder = useAppStore((s) => s.placeOrder)
  const [side, setSide] = useState<OrderSide>('buy')
  const [orderType, setOrderType] = useState<OrderType>('limit')
  const [inputPrice, setInputPrice] = useState<string>('')
  const [inputQty, setInputQty] = useState<string>('')
  const [pct, setPct] = useState<number>(0)
  const priceDirty = useRef(false)

  const [base, quote] = pair.split('/')
  const decimals = priceDecimals(price)

  const effectivePrice = orderType === 'limit' ? parseFloat(inputPrice) || price : price
  const qty = parseFloat(inputQty) || 0
  const total = effectivePrice * qty
  const fee = total * 0.002

  const baseBalance = balances.find((b) => b.asset === base)?.amount ?? 0
  const quoteBalance = balances.find((b) => b.asset === quote)?.amount ?? 0
  const available = side === 'buy' ? quoteBalance : baseBalance

  useEffect(() => {
    const resetTimer = setTimeout(() => {
      priceDirty.current = false
      setInputQty('')
      setPct(0)
      if (orderType === 'limit' && price > 0) {
        setInputPrice(
          price.toLocaleString('ru-RU', {
            minimumFractionDigits: decimals,
            maximumFractionDigits: decimals,
          })
        )
      } else {
        setInputPrice('')
      }
    }, 0)
    return () => clearTimeout(resetTimer)
  }, [pair, orderType])

  const applyPercent = (p: number) => {
    setPct(p)
    if (p <= 0) {
      setInputQty('')
      return
    }
    if (side === 'buy') {
      const usable = (available / effectivePrice) * (p / 100)
      setInputQty(usable.toFixed(6))
    } else {
      setInputQty((baseBalance * (p / 100)).toFixed(6))
    }
  }

  const handleSubmit = () => {
    if (qty <= 0) {
      toast.error('Введите количество')
      return
    }
    if (orderType === 'limit' && effectivePrice <= 0) {
      toast.error('Введите корректную цену')
      return
    }
    if (side === 'buy' && total > quoteBalance) {
      toast.error('Недостаточно средств для покупки')
      return
    }
    if (side === 'sell' && qty > baseBalance) {
      toast.error(`Недостаточно ${base} для продажи`)
      return
    }
    const trade: Trade = placeOrder({
      pair,
      side,
      type: orderType,
      price: effectivePrice,
      quantity: qty,
    })
    toast.success(
      `${side === 'buy' ? 'Куплено' : 'Продано'} ${qty} ${base} по ${effectivePrice.toLocaleString(
        'ru-RU',
        { minimumFractionDigits: decimals, maximumFractionDigits: decimals }
      )} ₽`,
      {
        description: `Сумма ${formatNumber(total)} ₽ • комиссия ${formatNumber(fee)} ₽ • ${trade.time}`,
      }
    )
    setInputQty('')
    setPct(0)
  }

  return (
    <div className="flex-1 min-h-0 flex flex-col bg-card border border-border rounded-md overflow-hidden">
      <div className="px-2 py-1 border-b border-border flex items-center gap-1.5 shrink-0">
        {dragHandle}
        <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
          Ордер
        </span>
        <span className="ml-auto text-[10px] text-muted-foreground font-mono">{pair}</span>
      </div>

      <div className="grid grid-cols-2 gap-1 p-1.5 shrink-0">
        <button
          onClick={() => setSide('buy')}
          className={cn(
            'py-1.5 rounded-md text-xs font-semibold transition',
            side === 'buy'
              ? 'bg-success text-success-foreground shadow-sm'
              : 'bg-muted/60 text-muted-foreground hover:bg-muted'
          )}
        >
          Купить {base}
        </button>
        <button
          onClick={() => setSide('sell')}
          className={cn(
            'py-1.5 rounded-md text-xs font-semibold transition',
            side === 'sell'
              ? 'bg-destructive text-white shadow-sm'
              : 'bg-muted/60 text-muted-foreground hover:bg-muted'
          )}
        >
          Продать {base}
        </button>
      </div>

      <div className="px-2 pb-1 pt-0.5 space-y-2 flex-1 min-h-0 overflow-y-auto scrollbar-thin">
        <div className="flex gap-1 bg-muted/60 p-0.5 rounded-md">
          <button
            onClick={() => setOrderType('limit')}
            className={cn(
              'flex-1 py-1 text-[11px] font-semibold rounded transition',
              orderType === 'limit' ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground'
            )}
          >
            Лимит
          </button>
          <button
            onClick={() => setOrderType('market')}
            className={cn(
              'flex-1 py-1 text-[11px] font-semibold rounded transition',
              orderType === 'market' ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground'
            )}
          >
            Маркет
          </button>
        </div>

        <div className="flex items-center justify-between text-[11px]">
          <span className="text-muted-foreground">Доступно</span>
          <span className="font-mono tabular-nums">
            {formatNumber(available, 6)} {side === 'buy' ? quote : base}
          </span>
        </div>

        <div className="space-y-0.5">
          <label className="text-[9px] uppercase tracking-wider text-muted-foreground">
            Цена {orderType === 'market' && '(рыночная)'}
          </label>
          <div className="relative">
            <Input
              type="number"
              inputMode="decimal"
              value={orderType === 'market' ? '' : inputPrice}
              onChange={(e) => setInputPrice(e.target.value)}
              disabled={orderType === 'market'}
              placeholder={orderType === 'market' ? 'По рынку' : ''}
              className="pr-10 font-mono tabular-nums h-8 text-xs"
            />
            <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] text-muted-foreground">
              {quote}
            </span>
          </div>
        </div>

        <div className="space-y-0.5">
          <label className="text-[9px] uppercase tracking-wider text-muted-foreground">
            Количество
          </label>
          <div className="relative">
            <Input
              type="number"
              inputMode="decimal"
              value={inputQty}
              onChange={(e) => {
                setInputQty(e.target.value)
                setPct(0)
              }}
              placeholder="0.00"
              className="pr-9 font-mono tabular-nums h-8 text-xs"
            />
            <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] text-muted-foreground">
              {base}
            </span>
          </div>
        </div>

        <div className="space-y-1">
          <div className="grid grid-cols-4 gap-1">
            {[25, 50, 75, 100].map((p) => (
              <button
                key={p}
                onClick={() => applyPercent(p)}
                className={cn(
                  'py-0.5 text-[11px] font-medium rounded transition border',
                  pct === p
                    ? side === 'buy'
                      ? 'bg-success/20 border-success/50 text-success'
                      : 'bg-destructive/20 border-destructive/50 text-destructive'
                    : 'bg-muted/40 border-border text-muted-foreground hover:bg-muted'
                )}
              >
                {p}%
              </button>
            ))}
          </div>
          <Slider value={[pct]} onValueChange={(v) => applyPercent(v[0])} max={100} step={1} className="py-0.5" />
        </div>
      </div>

      <div className="px-2 pb-2 pt-1 shrink-0 border-t border-border space-y-1">
        <div className="flex justify-between items-start text-[11px]">
          <span className="text-muted-foreground pt-0.5">Объём</span>
          <div className="text-right">
            <div className="font-mono tabular-nums">
              {formatNumber(qty, 6)} {base}
            </div>
            <div className="text-[9px] font-mono text-muted-foreground tabular-nums">
              ≈ {formatNumber(total)} {quote}
            </div>
          </div>
        </div>
        <div className="flex justify-between text-[11px]">
          <span className="text-muted-foreground">Итого</span>
          <span className="font-mono tabular-nums">
            {formatNumber(total)} {quote}
          </span>
        </div>
        <div className="flex justify-between text-[11px]">
          <span className="flex items-center gap-1 text-foreground/70">
            Комиссия 0.2%
            <Tooltip>
              <TooltipTrigger asChild>
                <Info className="w-3 h-3 cursor-help text-muted-foreground hover:text-primary transition" />
              </TooltipTrigger>
              <TooltipContent side="top" className="text-xs max-w-[220px]">
                Taker-комиссия 0.2% от суммы сделки. Для maker-ордеров (ликвидность) — 0.06%.
              </TooltipContent>
            </Tooltip>
          </span>
          <span className="font-mono tabular-nums text-foreground/70">
            {formatNumber(fee)} {quote}
          </span>
        </div>
        <Button
          onClick={handleSubmit}
          className={cn(
            'w-full h-9 font-semibold text-white shadow-sm text-xs',
            side === 'buy' ? 'bg-success hover:bg-success/90' : 'bg-destructive hover:bg-destructive/90'
          )}
        >
          {side === 'buy' ? 'Купить' : 'Продать'} {base}
        </Button>
        {ticker && (
          <div className="text-[10px] text-muted-foreground text-center">
            ≈ {formatPrice(ticker.priceUsd, 'usd')} за 1 {base}
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Block: MyTrades (history from store.orders) ───────────────────────────
type SideFilter = 'all' | 'buy' | 'sell'
type DateFilter = 'today' | '7d' | 'all'

function downloadTradesCsv(trades: Trade[]) {
  const headers = ['time', 'pair', 'side', 'type', 'price', 'quantity', 'total', 'fee']
  const escape = (v: string | number) => {
    const s = String(v)
    if (s.includes(',') || s.includes('"') || s.includes('\n')) {
      return `"${s.replace(/"/g, '""')}"`
    }
    return s
  }
  const rows = trades.map((t) =>
    [
      t.createdAt ? new Date(t.createdAt).toLocaleString('ru-RU') : t.time,
      t.pair,
      t.side,
      t.type,
      t.price,
      t.quantity,
      t.total,
      t.fee,
    ]
      .map(escape)
      .join(',')
  )
  const csv = [headers.join(','), ...rows].join('\n')
  // Add BOM so Excel reads UTF-8 Cyrillic correctly
  const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `ruscrypto-trades-${new Date().toISOString().slice(0, 10)}.csv`
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

function MyTrades({ pair, dragHandle }: { pair: string; dragHandle: ReactNode }) {
  const orders = useAppStore((s) => s.orders)
  const [sideFilter, setSideFilter] = useState<SideFilter>('all')
  const [dateFilter, setDateFilter] = useState<DateFilter>('all')

  const pairOrders = useMemo(() => orders.filter((o) => o.pair === pair), [orders, pair])

  const filtered = useMemo(() => {
    let r = pairOrders
    if (sideFilter !== 'all') r = r.filter((o) => o.side === sideFilter)
    if (dateFilter !== 'all') {
      const now = Date.now()
      const cutoff =
        dateFilter === 'today' ? now - 24 * 60 * 60 * 1000 : now - 7 * 24 * 60 * 60 * 1000
      r = r.filter((o) => {
        const ts = o.createdAt ? new Date(o.createdAt).getTime() : now
        return ts >= cutoff
      })
    }
    return r
  }, [pairOrders, sideFilter, dateFilter])

  const totalCount = filtered.length
  const totalVolume = filtered.reduce((s, o) => s + o.total, 0)

  const handleCsv = () => {
    if (orders.length === 0) {
      toast.error('Нет сделок для экспорта')
      return
    }
    downloadTradesCsv(orders)
    toast.success(`Экспортировано ${orders.length} сделок в CSV`)
  }

  const FilterBtn = ({
    active,
    onClick,
    children,
  }: {
    active: boolean
    onClick: () => void
    children: ReactNode
  }) => (
    <button
      onClick={onClick}
      className={cn(
        'px-1.5 py-0.5 rounded text-[10px] font-medium transition',
        active
          ? 'bg-primary/15 text-primary'
          : 'text-muted-foreground hover:text-foreground hover:bg-muted/60'
      )}
    >
      {children}
    </button>
  )

  return (
    <div className="flex-1 min-h-0 flex flex-col bg-card border border-border rounded-md overflow-hidden">
      <div className="px-2 py-1 border-b border-border flex items-center gap-1.5 shrink-0">
        {dragHandle}
        <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
          Мои сделки
        </span>
        <span className="text-[10px] text-muted-foreground/70 font-mono">{pair}</span>
        <div className="ml-auto flex items-center gap-1">
          <TooltipProvider delayDuration={300}>
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  onClick={handleCsv}
                  className="p-1 rounded hover:bg-muted/60 text-muted-foreground hover:text-primary transition disabled:opacity-40"
                  aria-label="Скачать CSV"
                  disabled={orders.length === 0}
                >
                  <Download className="w-3.5 h-3.5" />
                </button>
              </TooltipTrigger>
              <TooltipContent side="bottom" className="text-xs">
                Скачать CSV (все сделки: {orders.length})
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      </div>

      {/* Compact filter toolbar */}
      <div className="px-2 py-1 border-b border-border/60 flex items-center gap-2 shrink-0 flex-wrap">
        <div className="flex items-center gap-0.5">
          <FilterBtn active={sideFilter === 'all'} onClick={() => setSideFilter('all')}>
            Все
          </FilterBtn>
          <FilterBtn active={sideFilter === 'buy'} onClick={() => setSideFilter('buy')}>
            Покупки
          </FilterBtn>
          <FilterBtn active={sideFilter === 'sell'} onClick={() => setSideFilter('sell')}>
            Продажи
          </FilterBtn>
        </div>
        <span className="w-px h-3 bg-border" />
        <div className="flex items-center gap-0.5">
          <FilterBtn active={dateFilter === 'today'} onClick={() => setDateFilter('today')}>
            Сегодня
          </FilterBtn>
          <FilterBtn active={dateFilter === '7d'} onClick={() => setDateFilter('7d')}>
            7д
          </FilterBtn>
          <FilterBtn active={dateFilter === 'all'} onClick={() => setDateFilter('all')}>
            Всё
          </FilterBtn>
        </div>
        <div className="ml-auto text-[10px] text-muted-foreground font-mono tabular-nums">
          {totalCount} • {formatNumber(totalVolume)} ₽
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center text-center px-3 py-6 min-h-[160px]">
          <div className="w-full max-w-[200px] border border-dashed border-border/80 rounded-lg py-5 px-3 flex flex-col items-center gap-2 bg-muted/20">
            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
              <CandlestickChart className="w-5 h-5 text-primary" />
            </div>
            <p className="text-[11px] font-semibold text-foreground/80">
              {pairOrders.length === 0 ? 'Пока нет сделок' : 'Ничего не найдено'}
            </p>
            <p className="text-[10px] text-muted-foreground leading-snug">
              {pairOrders.length === 0
                ? 'Создайте ордер в форме выше, чтобы увидеть историю здесь'
                : 'Измените фильтры, чтобы увидеть больше записей'}
            </p>
          </div>
        </div>
      ) : (
        <div className="flex-1 min-h-0 overflow-y-auto scrollbar-thin">
          <div className="flex flex-col">
            {filtered.map((o) => {
              const isBuy = o.side === 'buy'
              return (
                <div
                  key={o.id}
                  className="grid grid-cols-12 gap-1 px-2 py-1 items-center text-[11px] border-b border-border/60 last:border-0 hover:bg-muted/40"
                >
                  <div className="col-span-3 flex items-center gap-1">
                    <Badge
                      className={cn(
                        'h-4 px-1 text-[9px]',
                        isBuy ? 'bg-success/20 text-success' : 'bg-destructive/20 text-destructive'
                      )}
                    >
                      {isBuy ? 'Купить' : 'Продать'}
                    </Badge>
                  </div>
                  <div className="col-span-3 font-mono tabular-nums">
                    {o.price.toLocaleString('ru-RU', { maximumFractionDigits: 2 })}
                  </div>
                  <div className="col-span-3 font-mono tabular-nums text-muted-foreground">
                    {o.quantity.toLocaleString('ru-RU', { maximumFractionDigits: 6 })}
                  </div>
                  <div className="col-span-3 text-right text-muted-foreground">{o.time}</div>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Main TradeView ─────────────────────────────────────────────────────────
export function TradeView() {
  const selectedPair = useAppStore((s) => s.selectedPair)
  const setSelectedPair = useAppStore((s) => s.setSelectedPair)
  const collapsed = useAppStore((s) => s.sidebarCollapsed)
  const [tickers, setTickers] = useState<CoinTicker[]>([])
  const [livePrice, setLivePrice] = useState<number>(0)
  const [highlight, setHighlight] = useState<'up' | 'down' | null>(null)

  const layout = useTradeLayout()

  const { orderBook: liveBook, livePrice: wsPrice, trades: liveTrades, connected } =
    useLiveMarket(selectedPair)

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

  useEffect(() => {
    if (connected && wsPrice > 0) {
      setLivePrice((prev) => {
        if (prev > 0 && wsPrice !== prev) setHighlight(wsPrice > prev ? 'up' : 'down')
        return wsPrice
      })
    }
  }, [wsPrice, connected])

  useEffect(() => {
    if (!highlight) return
    const t = setTimeout(() => setHighlight(null), 500)
    return () => clearTimeout(t)
  }, [highlight])

  const change24h = ticker?.change24h ?? 0
  const volume24h = ticker?.volume24h ? ticker.volume24h * (livePrice || ticker.priceRub) : 0
  const isUp = change24h >= 0
  const tvSymbol = `BINANCE:${base}USDT`

  const renderBlock = useCallback(
    (blockId: BlockId, dragHandle: ReactNode): ReactNode => {
      switch (blockId) {
        case 'chart':
          return <ChartBlock dragHandle={dragHandle} symbol={tvSymbol} />
        case 'trades':
          return (
            <RecentTrades
              dragHandle={dragHandle}
              price={livePrice}
              pair={selectedPair}
              liveTrades={liveTrades}
              connected={connected}
            />
          )
        case 'book':
          return (
            <OrderBook
              dragHandle={dragHandle}
              price={livePrice}
              pair={selectedPair}
              liveBook={liveBook}
              connected={connected}
            />
          )
        case 'form':
          return (
            <OrderForm dragHandle={dragHandle} price={livePrice} pair={selectedPair} ticker={ticker} />
          )
        case 'mytrades':
          return <MyTrades dragHandle={dragHandle} pair={selectedPair} />
        default:
          return null
      }
    },
    [livePrice, selectedPair, liveBook, liveTrades, connected, ticker, tvSymbol]
  )

  // Right column min: target ~260px. Use a responsive % based on sidebar state.
  const rightMinSize = collapsed ? 19 : 23

  return (
    <div className="flex-1 bg-background">
      <div className="mx-auto max-w-[1600px] px-2 lg:px-3 py-2">
        {/* Top pair bar (compact) */}
        <div className="flex flex-wrap items-center gap-2 lg:gap-4 mb-2 p-2 bg-card border border-border rounded-lg">
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

          <div className="flex items-center gap-2">
            {connected && <LiveBadge />}
            <span
              className={cn(
                'inline-block rounded-md px-1.5 py-0.5 text-xl lg:text-2xl font-mono font-bold tabular-nums transition-colors',
                highlight === 'up' && 'flash-up text-success',
                highlight === 'down' && 'flash-down text-destructive',
                !highlight && 'text-foreground'
              )}
            >
              {livePrice > 0
                ? `${livePrice.toLocaleString('ru-RU', { maximumFractionDigits: 2 })} ₽`
                : '— —'}
            </span>
            <span className="text-[11px] text-muted-foreground">
              ≈ {ticker ? formatPrice(ticker.priceUsd, 'usd') : '—'}
            </span>
          </div>

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
              24ч
            </span>
          </div>

          <div className="hidden md:flex items-center gap-3 ml-auto text-[11px]">
            <div>
              <span className="text-muted-foreground">Макс: </span>
              <span className="font-mono tabular-nums">
                {ticker?.high24h
                  ? formatPrice(ticker.high24h * (livePrice / ticker.priceRub || 1), 'rub')
                  : '—'}
              </span>
            </div>
            <div>
              <span className="text-muted-foreground">Мин: </span>
              <span className="font-mono tabular-nums">
                {ticker?.low24h
                  ? formatPrice(ticker.low24h * (livePrice / ticker.priceRub || 1), 'rub')
                  : '—'}
              </span>
            </div>
            <div>
              <span className="text-muted-foreground">Объём: </span>
              <span className="font-mono tabular-nums">{formatPrice(volume24h, 'rub')}</span>
            </div>
          </div>

          <Button
            variant="ghost"
            size="sm"
            onClick={layout.reset}
            className="md:ml-0 ml-auto h-8 gap-1.5 text-[11px] text-muted-foreground hover:text-primary"
            title="Сбросить layout"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Сбросить layout</span>
          </Button>
        </div>

        {/* Desktop (lg+): resizable + rearrangeable panel grid */}
        <div className="hidden lg:block h-[calc(100vh-160px)] min-h-[480px]">
          <PanelGroup direction="horizontal" id="trade-cols" onLayout={layout.onColumnsLayout}>
            <Panel
              id="left-col"
              order={0}
              defaultSize={layout.columns[0]}
              minSize={45}
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
            <TradeResizeHandle id="cols-h" orientation="horizontal" />
            <Panel
              id="right-col"
              order={1}
              defaultSize={layout.columns[1]}
              minSize={rightMinSize}
              maxSize={45}
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
          {[...layout.leftOrder, ...layout.rightOrder].map((blockId) => {
            const height =
              blockId === 'chart'
                ? 'h-[360px]'
                : blockId === 'book'
                  ? 'h-[440px]'
                  : blockId === 'form'
                    ? 'h-[400px]'
                    : 'h-[260px]'
            return (
              <div key={blockId} className={cn(height, 'flex flex-col')}>
                {renderBlock(blockId, <span aria-hidden />)}
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
