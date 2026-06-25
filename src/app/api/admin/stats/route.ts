import { NextResponse } from 'next/server'
import { db } from '@/lib/db'

// GET /api/admin/stats — aggregated platform metrics for admin/operations panel
export async function GET() {
  try {
    const dayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000)

    const [
      totalUsers,
      newUsers24h,
      totalTrades,
      trades24h,
      volume24hAgg,
      totalPayments,
      paymentsVolumeAgg,
      openAlerts,
      criticalAlerts,
      openP2PDeals,
      recentUsers,
      recentTrades,
      recentPayments,
      recentAlerts,
      kycLevel0,
      kycLevel1,
      kycLevel2,
      allTradesForPairGrouping,
    ] = await Promise.all([
      db.user.count(),
      db.user.count({ where: { createdAt: { gte: dayAgo } } }),
      db.trade.count(),
      db.trade.count({ where: { createdAt: { gte: dayAgo } } }),
      db.trade.aggregate({ where: { createdAt: { gte: dayAgo } }, _sum: { total: true } }),
      db.crossBorderPayment.count(),
      db.crossBorderPayment.aggregate({ _sum: { amount: true } }),
      db.complianceAlert.count({
        where: { status: { in: ['OPEN', 'REVIEWING'] } },
      }),
      db.complianceAlert.count({
        where: { severity: 'CRITICAL', status: { in: ['OPEN', 'REVIEWING'] } },
      }),
      db.p2PDeal.count({
        where: { status: { in: ['PENDING', 'PAID'] } },
      }),
      db.user.findMany({
        orderBy: { createdAt: 'desc' },
        take: 10,
        select: {
          id: true,
          email: true,
          name: true,
          kycLevel: true,
          role: true,
          createdAt: true,
        },
      }),
      db.trade.findMany({
        orderBy: { createdAt: 'desc' },
        take: 15,
        include: {
          user: { select: { email: true, name: true } },
        },
      }),
      db.crossBorderPayment.findMany({
        orderBy: { createdAt: 'desc' },
        take: 10,
      }),
      db.complianceAlert.findMany({
        orderBy: { createdAt: 'desc' },
        take: 8,
      }),
      db.user.count({ where: { kycLevel: 0 } }),
      db.user.count({ where: { kycLevel: 1 } }),
      db.user.count({ where: { kycLevel: 2 } }),
      db.trade.findMany({ select: { pair: true, total: true } }),
    ])

    // Group trades by pair (top by volume)
    const pairMap: Record<string, { count: number; volume: number }> = {}
    for (const t of allTradesForPairGrouping) {
      if (!pairMap[t.pair]) pairMap[t.pair] = { count: 0, volume: 0 }
      pairMap[t.pair].count += 1
      pairMap[t.pair].volume += t.total
    }
    const tradesByPair = Object.entries(pairMap)
      .map(([pair, v]) => ({ pair, count: v.count, volume: v.volume }))
      .sort((a, b) => b.volume - a.volume)
      .slice(0, 8)

    return NextResponse.json({
      totalUsers,
      newUsers24h,
      totalTrades,
      trades24hCount: trades24h,
      volume24h: volume24hAgg._sum.total ?? 0,
      totalPayments,
      paymentsVolume: paymentsVolumeAgg._sum.amount ?? 0,
      openAlerts,
      criticalAlerts,
      openP2PDeals,
      openMarginPositions: 0, // not tracked in DB
      recentUsers: recentUsers.map((u) => ({
        id: u.id,
        email: u.email,
        name: u.name,
        kycLevel: u.kycLevel,
        role: u.role,
        createdAt: u.createdAt.toISOString(),
      })),
      recentTrades: recentTrades.map((t) => ({
        id: t.id,
        pair: t.pair,
        side: t.side,
        type: t.side, // trade side acts as order direction in matching engine
        price: t.price,
        quantity: t.quantity,
        total: t.total,
        fee: t.fee,
        userEmail: t.user?.email ?? null,
        userName: t.user?.name ?? null,
        createdAt: t.createdAt.toISOString(),
      })),
      recentPayments: recentPayments.map((p) => ({
        id: p.id,
        corridor: p.corridor,
        fromCurrency: p.fromCurrency,
        toCurrency: p.toCurrency,
        amount: p.amount,
        receiveAmount: p.receiveAmount,
        status: p.status,
        beneficiary: p.beneficiary,
        createdAt: p.createdAt.toISOString(),
      })),
      recentAlerts: recentAlerts.map((a) => ({
        id: a.id,
        type: a.type,
        severity: a.severity,
        riskScore: a.riskScore,
        status: a.status,
        description: a.description,
        entityType: a.entityType,
        ruleId: a.ruleId,
        createdAt: a.createdAt.toISOString(),
      })),
      usersByKycLevel: {
        level0: kycLevel0,
        level1: kycLevel1,
        level2: kycLevel2,
      },
      tradesByPair,
      generatedAt: new Date().toISOString(),
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    return NextResponse.json(
      { error: 'Failed to compute admin stats', detail: message },
      { status: 500 }
    )
  }
}
