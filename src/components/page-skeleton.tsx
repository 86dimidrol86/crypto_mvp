'use client'

import { Card } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'

/**
 * Shimmering placeholder grid for loading states.
 * Matches the visual rhythm of the home/markets MarketGrid cards.
 */
export function MarketGridSkeleton({ count = 8 }: { count?: number }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {Array.from({ length: count }).map((_, i) => (
        <Card key={i} className="p-5 border-border">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2.5">
              <Skeleton className="w-9 h-9 rounded-full" />
              <div className="space-y-1.5">
                <Skeleton className="h-3 w-12" />
                <Skeleton className="h-2.5 w-16" />
              </div>
            </div>
            <Skeleton className="h-5 w-16 rounded-md" />
          </div>
          <Skeleton className="h-7 w-28 mb-3" />
          <div className="flex items-center justify-between">
            <Skeleton className="h-7 w-20" />
            <Skeleton className="h-4 w-4 rounded-full" />
          </div>
        </Card>
      ))}
    </div>
  )
}

/**
 * Skeleton row for tables (markets-view desktop table).
 */
export function TableSkeleton({ rows = 8 }: { rows?: number }) {
  return (
    <div className="flex flex-col">
      {Array.from({ length: rows }).map((_, i) => (
        <div
          key={i}
          className={cn(
            'grid grid-cols-[1.6fr_1fr_0.8fr_0.8fr_0.8fr_1fr_0.7fr] gap-3 px-3 py-2.5 items-center border-b border-border/60'
          )}
        >
          <div className="flex items-center gap-2.5">
            <Skeleton className="w-7 h-7 rounded-full" />
            <div className="space-y-1">
              <Skeleton className="h-3 w-16" />
              <Skeleton className="h-2 w-20" />
            </div>
          </div>
          <Skeleton className="h-4 w-20" />
          <Skeleton className="h-4 w-12" />
          <Skeleton className="h-4 w-20" />
          <Skeleton className="h-4 w-20" />
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-7 w-16 rounded-md" />
        </div>
      ))}
    </div>
  )
}

/**
 * Card skeletons for hero stat blocks.
 */
export function StatsSkeleton() {
  return (
    <div className="grid grid-cols-2 gap-5">
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i}>
          <Skeleton className="h-3 w-24 mb-1.5" />
          <Skeleton className="h-7 w-32 mb-1" />
          <Skeleton className="h-3 w-20" />
        </div>
      ))}
    </div>
  )
}

/**
 * Wallet balance card skeleton — icon circle + 2 lines.
 * Matches TotalBalanceCard (wallet-view) rhythm.
 */
export function BalanceCardSkeleton() {
  return (
    <Card className="relative overflow-hidden p-4 lg:p-5 border-primary/20">
      <div className="relative flex flex-col lg:flex-row items-start lg:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <Skeleton className="w-3.5 h-3.5 rounded-full" />
            <Skeleton className="h-3 w-40" />
          </div>
          <Skeleton className="h-8 w-48 mb-1" />
          <Skeleton className="h-3 w-32" />
        </div>
        <div className="flex gap-2">
          <Skeleton className="h-9 w-28 rounded-md" />
          <Skeleton className="h-9 w-28 rounded-md" />
        </div>
      </div>
    </Card>
  )
}

/**
 * Transaction row skeleton — icon + 3 lines.
 * Matches HistoryTab row (wallet-view) rhythm.
 */
export function TxRowSkeleton() {
  return (
    <div className="flex items-center gap-3 px-3 py-2.5 border-b border-border/60 last:border-0">
      <Skeleton className="w-8 h-8 rounded-full shrink-0" />
      <div className="flex-1 min-w-0 space-y-1.5">
        <div className="flex items-center gap-2">
          <Skeleton className="h-3.5 w-24" />
          <Skeleton className="h-5 w-10 rounded-md" />
          <Skeleton className="h-5 w-16 rounded-md" />
        </div>
        <Skeleton className="h-2.5 w-44" />
      </div>
      <div className="text-right shrink-0 space-y-1.5">
        <Skeleton className="h-3.5 w-20 ml-auto" />
        <Skeleton className="h-2.5 w-16 ml-auto" />
      </div>
    </div>
  )
}

/**
 * P2P offer row skeleton — avatar + 4 lines.
 * Matches OfferRow (p2p-view) 12-col grid rhythm.
 */
export function OfferRowSkeleton() {
  return (
    <div className="grid grid-cols-12 gap-3 px-3 py-3 items-center border-b border-border/60 last:border-0">
      <div className="col-span-12 sm:col-span-4 flex items-center gap-2.5">
        <Skeleton className="w-8 h-8 rounded-full" />
        <div className="min-w-0 space-y-1.5">
          <Skeleton className="h-3.5 w-24" />
          <Skeleton className="h-2.5 w-32" />
        </div>
      </div>
      <div className="col-span-6 sm:col-span-3 space-y-1.5">
        <Skeleton className="h-4 w-20 rounded-md" />
        <Skeleton className="h-2.5 w-28" />
      </div>
      <div className="col-span-6 sm:col-span-2 text-right space-y-1.5">
        <Skeleton className="h-2.5 w-12 ml-auto" />
        <Skeleton className="h-3.5 w-20 ml-auto" />
      </div>
      <div className="col-span-12 sm:col-span-3 flex sm:flex-col items-end justify-between sm:justify-center gap-2">
        <div className="text-right space-y-1.5">
          <Skeleton className="h-5 w-24 ml-auto" />
          <Skeleton className="h-2.5 w-16 ml-auto" />
        </div>
        <Skeleton className="h-8 w-28 rounded-md" />
      </div>
    </div>
  )
}

/**
 * Compliance alert card skeleton — stripe + 3 lines.
 * Matches AlertListItem (compliance-view) rhythm.
 */
export function AlertCardSkeleton() {
  return (
    <div className="relative overflow-hidden rounded-xl border border-border bg-muted/20">
      <Skeleton className="absolute left-0 top-0 bottom-0 w-1 rounded-none" />
      <div className="pl-3.5 pr-2.5 py-2.5 space-y-2">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2">
            <Skeleton className="h-4 w-16 rounded-md" />
            <Skeleton className="h-2.5 w-24" />
          </div>
          <Skeleton className="h-4 w-20 rounded-md" />
        </div>
        <div className="flex items-end justify-between gap-2">
          <div className="flex-1 space-y-1.5">
            <Skeleton className="h-2.5 w-full" />
            <Skeleton className="h-2.5 w-3/4" />
          </div>
          <div className="text-right space-y-1 shrink-0">
            <Skeleton className="h-5 w-10 ml-auto" />
            <Skeleton className="h-2 w-8 ml-auto" />
          </div>
        </div>
        <div className="flex items-center justify-between pt-1.5 border-t border-border/60">
          <Skeleton className="h-2.5 w-24" />
          <Skeleton className="h-2.5 w-12" />
        </div>
      </div>
    </div>
  )
}

/**
 * KPI stat card skeleton — label + big number + delta.
 * Matches StatCard (analytics, admin, profile) rhythm.
 */
export function KpiCardSkeleton() {
  return (
    <Card className="p-4">
      <div className="flex items-center justify-between mb-2">
        <Skeleton className="h-3 w-28" />
        <Skeleton className="w-8 h-8 rounded-lg" />
      </div>
      <Skeleton className="h-6 w-32 mb-2" />
      <div className="flex items-center gap-1.5">
        <Skeleton className="h-4 w-16 rounded-md" />
        <Skeleton className="h-2.5 w-20" />
      </div>
    </Card>
  )
}

/**
 * Chart placeholder skeleton — h-[240px] card with animated bars.
 * Matches analytics/admin chart card rhythm.
 */
export function ChartSkeleton() {
  return (
    <Card className="p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="space-y-1.5">
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-2.5 w-24" />
        </div>
        <Skeleton className="h-5 w-16 rounded-md" />
      </div>
      <div className="h-[240px] flex items-end gap-2 px-1">
        {Array.from({ length: 12 }).map((_, i) => (
          <Skeleton
            key={i}
            className="flex-1 rounded-t-md"
            style={{ height: `${30 + ((i * 13) % 70)}%` }}
          />
        ))}
      </div>
    </Card>
  )
}

/**
 * KYC step card skeleton — matches the step content card rhythm.
 */
export function StepSkeleton() {
  return (
    <Card className="bg-card/60 backdrop-blur">
      <div className="flex items-start justify-between gap-3 p-4 border-b border-border">
        <div className="flex items-center gap-2.5">
          <Skeleton className="w-10 h-10 rounded-xl" />
          <div className="space-y-1.5">
            <Skeleton className="h-4 w-40" />
            <Skeleton className="h-2.5 w-32" />
          </div>
        </div>
        <Skeleton className="h-5 w-12 rounded-md" />
      </div>
      <div className="p-4 space-y-4">
        <div className="space-y-1.5">
          <Skeleton className="h-3 w-32" />
          <Skeleton className="h-10 w-full rounded-md" />
        </div>
        <div className="space-y-1.5">
          <Skeleton className="h-3 w-24" />
          <Skeleton className="h-10 w-full rounded-md" />
        </div>
        <Skeleton className="h-10 w-full rounded-md" />
        <div className="pt-3 border-t border-border flex justify-end">
          <Skeleton className="h-9 w-28 rounded-md" />
        </div>
      </div>
    </Card>
  )
}

/**
 * Margin position row skeleton — 12-col grid matching PositionRow rhythm.
 */
export function PositionRowSkeleton() {
  return (
    <div className="grid grid-cols-12 gap-2 px-2.5 py-2.5 items-center border-b border-border/40">
      <div className="col-span-2 space-y-1.5">
        <Skeleton className="h-3 w-20" />
        <Skeleton className="h-2.5 w-14" />
      </div>
      <Skeleton className="col-span-1 h-3.5" />
      <Skeleton className="col-span-1 h-3.5" />
      <Skeleton className="col-span-1 h-3.5" />
      <div className="col-span-3 space-y-1.5">
        <Skeleton className="h-3.5 w-24" />
        <Skeleton className="h-2.5 w-16" />
      </div>
      <Skeleton className="col-span-1 h-3.5" />
      <Skeleton className="col-span-1 h-3.5" />
      <div className="col-span-2 flex justify-end">
        <Skeleton className="h-7 w-20 rounded-md" />
      </div>
    </div>
  )
}
