import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

// GET /api/finance/dashboard?period=1h|24h|7d|30d — агрегированные метрики
export async function GET(req: NextRequest) {
  try {
    const period = req.nextUrl.searchParams.get('period') || '24h'
    const now = new Date()

    // Determine period start
    let periodStart: Date
    let seriesDays: number
    let seriesBuckets: 'hour' | 'day'
    switch (period) {
      case '1h':
        periodStart = new Date(now.getTime() - 60 * 60 * 1000)
        seriesDays = 1
        seriesBuckets = 'hour'
        break
      case '7d':
        periodStart = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
        seriesDays = 7
        seriesBuckets = 'day'
        break
      case '30d':
        periodStart = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
        seriesDays = 30
        seriesBuckets = 'day'
        break
      case '24h':
      default:
        periodStart = new Date(now.getTime() - 24 * 60 * 60 * 1000)
        seriesDays = 1
        seriesBuckets = 'hour'
        break
    }

    const banks = await db.bank.findMany({
      include: { limits: true, accounts: true },
    })

    // KPI — транзакции за выбранный период (с верхней границей = сейчас,
    // чтобы будущие транзакции из seed не попадали)
    const txPeriod = await db.bankTransaction.findMany({
      where: { createdAt: { gte: periodStart, lte: now }, status: 'COMPLETED' },
    })
    const totalVolume = txPeriod.reduce((s, t) => s + t.amount, 0)
    const totalFees = txPeriod.reduce((s, t) => s + t.fee, 0)
    const activeBanks = banks.filter((b) => b.status === 'ACTIVE').length
    const txCount = txPeriod.length

    // Per-bank breakdown за период
    const perBank = await Promise.all(
      banks.map(async (b) => {
        const btx = txPeriod.filter((t) => t.bankId === b.id)
        const volume = btx.reduce((s, t) => s + t.amount, 0)
        const fees = btx.reduce((s, t) => s + t.fee, 0)
        // Daily usage — relative to today only (not full period)
        const dayStart = new Date()
        dayStart.setHours(0, 0, 0, 0)
        const todayTx = await db.bankTransaction.aggregate({
          where: { bankId: b.id, createdAt: { gte: dayStart }, status: 'COMPLETED' },
          _sum: { amount: true },
        })
        const todayVolume = todayTx._sum.amount || 0
        const dailyUsage = b.limits ? (todayVolume / b.limits.dailyLimit) * 100 : 0
        return {
          id: b.id,
          name: b.name,
          bic: b.bic,
          type: b.type,
          status: b.status,
          priority: b.priority,
          volume24h: volume, // keep field name for frontend compat
          fees24h: fees,
          txCount24h: btx.length,
          shareOfTotal: totalVolume > 0 ? (volume / totalVolume) * 100 : 0,
          dailyUsagePct: dailyUsage,
          limitAlert: dailyUsage > (b.limits?.alertThreshold || 0.8) * 100,
        }
      })
    )

    // Time series за период
    const seriesStart = new Date(now.getTime() - seriesDays * 24 * 60 * 60 * 1000)
    const txSeries = await db.bankTransaction.findMany({
      where: { createdAt: { gte: seriesStart, lte: now }, status: 'COMPLETED' },
      select: { amount: true, fee: true, createdAt: true, bankId: true },
    })

    const series: { date: string; volume: number; fees: number }[] = []
    if (seriesBuckets === 'hour') {
      // Hourly buckets for 1h/24h periods — 24 buckets
      for (let i = 23; i >= 0; i--) {
        const bucketStart = new Date(now.getTime() - i * 60 * 60 * 1000)
        bucketStart.setMinutes(0, 0, 0)
        const bucketEnd = new Date(bucketStart.getTime() + 60 * 60 * 1000)
        const bucketTx = txSeries.filter((t) => t.createdAt >= bucketStart && t.createdAt < bucketEnd)
        series.push({
          date: `${String(bucketStart.getHours()).padStart(2, '0')}:00`,
          volume: bucketTx.reduce((s, t) => s + t.amount, 0),
          fees: bucketTx.reduce((s, t) => s + t.fee, 0),
        })
      }
    } else {
      // Daily buckets for 7d/30d periods
      const bucketCount = seriesDays
      for (let i = bucketCount - 1; i >= 0; i--) {
        const dayStart = new Date(now.getTime() - i * 24 * 60 * 60 * 1000)
        dayStart.setHours(0, 0, 0, 0)
        const dayEnd = new Date(dayStart.getTime() + 24 * 60 * 60 * 1000)
        const dayTx = txSeries.filter((t) => t.createdAt >= dayStart && t.createdAt < dayEnd)
        series.push({
          date: dayStart.toISOString().slice(5, 10), // MM-DD
          volume: dayTx.reduce((s, t) => s + t.amount, 0),
          fees: dayTx.reduce((s, t) => s + t.fee, 0),
        })
      }
    }

    // Accounts below minBalance
    const lowBalanceAccounts = banks
      .flatMap((b) => b.accounts.map((a) => ({ ...a, bankName: b.name })))
      .filter((a) => a.balance < a.minBalance)

    // Threshold operations (>600K, 115-ФЗ) за период
    const thresholdOps = await db.bankTransaction.count({
      where: { isThreshold: true, createdAt: { gte: periodStart, lte: now } },
    })

    return NextResponse.json({
      period,
      kpi: {
        totalVolume24h: totalVolume,
        totalFees24h: totalFees,
        activeBanks,
        txCount24h: txCount,
        thresholdOps,
      },
      perBank: perBank.sort((a, b) => b.volume24h - a.volume24h),
      series,
      alerts: {
        limitAlerts: perBank.filter((b) => b.limitAlert),
        lowBalanceAccounts,
      },
    })
  } catch (e) {
    return NextResponse.json({ error: 'Failed to fetch dashboard' }, { status: 500 })
  }
}
