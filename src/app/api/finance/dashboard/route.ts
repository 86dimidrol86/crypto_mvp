import { NextResponse } from 'next/server'
import { db } from '@/lib/db'

// GET /api/finance/dashboard — агрегированные метрики
export async function GET() {
  try {
    const now = new Date()
    const day24h = new Date(now.getTime() - 24 * 60 * 60 * 1000)
    const day30 = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)

    const banks = await db.bank.findMany({
      include: { limits: true, accounts: true, transactions: true },
    })

    // KPI
    const tx24h = await db.bankTransaction.findMany({
      where: { createdAt: { gte: day24h }, status: 'COMPLETED' },
    })
    const totalVolume24h = tx24h.reduce((s, t) => s + t.amount, 0)
    const totalFees24h = tx24h.reduce((s, t) => s + t.fee, 0)
    const activeBanks = banks.filter((b) => b.status === 'ACTIVE').length
    const txCount24h = tx24h.length

    // Per-bank breakdown
    const perBank = await Promise.all(
      banks.map(async (b) => {
        const btx24h = tx24h.filter((t) => t.bankId === b.id)
        const volume = btx24h.reduce((s, t) => s + t.amount, 0)
        const fees = btx24h.reduce((s, t) => s + t.fee, 0)
        const dailyUsage = b.limits ? (volume / b.limits.dailyLimit) * 100 : 0
        return {
          id: b.id,
          name: b.name,
          bic: b.bic,
          type: b.type,
          status: b.status,
          priority: b.priority,
          volume24h: volume,
          fees24h: fees,
          txCount24h: btx24h.length,
          shareOfTotal: totalVolume24h > 0 ? (volume / totalVolume24h) * 100 : 0,
          dailyUsagePct: dailyUsage,
          limitAlert: dailyUsage > (b.limits?.alertThreshold || 0.8) * 100,
        }
      })
    )

    // 30-day series
    const tx30d = await db.bankTransaction.findMany({
      where: { createdAt: { gte: day30 }, status: 'COMPLETED' },
      select: { amount: true, fee: true, createdAt: true, bankId: true },
    })
    const series: { date: string; volume: number; fees: number }[] = []
    for (let i = 29; i >= 0; i--) {
      const dayStart = new Date(now.getTime() - i * 24 * 60 * 60 * 1000)
      dayStart.setHours(0, 0, 0, 0)
      const dayEnd = new Date(dayStart.getTime() + 24 * 60 * 60 * 1000)
      const dayTx = tx30d.filter((t) => t.createdAt >= dayStart && t.createdAt < dayEnd)
      series.push({
        date: dayStart.toISOString().slice(0, 10),
        volume: dayTx.reduce((s, t) => s + t.amount, 0),
        fees: dayTx.reduce((s, t) => s + t.fee, 0),
      })
    }

    // Accounts below minBalance
    const lowBalanceAccounts = banks
      .flatMap((b) => b.accounts.map((a) => ({ ...a, bankName: b.name })))
      .filter((a) => a.balance < a.minBalance)

    // Threshold operations (>600K, 115-ФЗ)
    const thresholdOps = await db.bankTransaction.count({
      where: { isThreshold: true, createdAt: { gte: day24h } },
    })

    return NextResponse.json({
      kpi: {
        totalVolume24h,
        totalFees24h,
        activeBanks,
        txCount24h,
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
