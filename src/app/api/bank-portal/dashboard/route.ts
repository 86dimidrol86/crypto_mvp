import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

// GET /api/bank-portal/dashboard?bankId=...&period=1h|24h|7d|30d
export async function GET(req: NextRequest) {
  try {
    const bankId = req.nextUrl.searchParams.get('bankId')
    const period = req.nextUrl.searchParams.get('period') || '24h'
    if (!bankId) return NextResponse.json({ error: 'bankId required' }, { status: 400 })

    const now = new Date()
    let periodStart: Date
    let seriesDays: number
    let seriesBuckets: 'hour' | 'day'
    switch (period) {
      case '1h': periodStart = new Date(now.getTime() - 60*60*1000); seriesDays = 1; seriesBuckets = 'hour'; break
      case '7d': periodStart = new Date(now.getTime() - 7*24*60*60*1000); seriesDays = 7; seriesBuckets = 'day'; break
      case '30d': periodStart = new Date(now.getTime() - 30*24*60*60*1000); seriesDays = 30; seriesBuckets = 'day'; break
      default: periodStart = new Date(now.getTime() - 24*60*60*1000); seriesDays = 1; seriesBuckets = 'hour'; break
    }

    const bank = await db.bank.findUnique({
      where: { id: bankId },
      include: { fees: { where: { active: true } }, limits: true, accounts: true },
    })
    if (!bank) return NextResponse.json({ error: 'Bank not found' }, { status: 404 })

    // KPI
    const txPeriod = await db.bankTransaction.findMany({
      where: { bankId, createdAt: { gte: periodStart, lte: now }, status: 'COMPLETED' },
    })
    const totalVolume = txPeriod.reduce((s, t) => s + t.amount, 0)
    const totalFees = txPeriod.reduce((s, t) => s + t.fee, 0)
    const txCount = txPeriod.length
    const thresholdOps = txPeriod.filter((t) => t.isThreshold).length

    // Today's usage for limits
    const dayStart = new Date(); dayStart.setHours(0,0,0,0)
    const todayTx = await db.bankTransaction.aggregate({
      where: { bankId, createdAt: { gte: dayStart, lte: now }, status: 'COMPLETED' },
      _sum: { amount: true },
    })
    const todayVolume = todayTx._sum.amount || 0
    const dailyUsagePct = bank.limits ? (todayVolume / bank.limits.dailyLimit) * 100 : 0

    // Breakdown by type
    const byType = txTypes.map((type) => {
      const typeTx = txPeriod.filter((t) => t.type === type)
      return { type, count: typeTx.length, volume: typeTx.reduce((s, t) => s + t.amount, 0), fees: typeTx.reduce((s, t) => s + t.fee, 0) }
    })

    // Time series
    const seriesStart = new Date(now.getTime() - seriesDays * 24 * 60 * 60 * 1000)
    const txSeries = await db.bankTransaction.findMany({
      where: { bankId, createdAt: { gte: seriesStart, lte: now }, status: 'COMPLETED' },
      select: { amount: true, fee: true, createdAt: true },
    })
    const series: { date: string; volume: number; fees: number }[] = []
    if (seriesBuckets === 'hour') {
      for (let i = 23; i >= 0; i--) {
        const bs = new Date(now.getTime() - i * 60 * 60 * 1000); bs.setMinutes(0,0,0)
        const be = new Date(bs.getTime() + 60 * 60 * 1000)
        const bt = txSeries.filter((t) => t.createdAt >= bs && t.createdAt < be)
        series.push({ date: `${String(bs.getHours()).padStart(2,'0')}:00`, volume: bt.reduce((s,t)=>s+t.amount,0), fees: bt.reduce((s,t)=>s+t.fee,0) })
      }
    } else {
      for (let i = seriesDays - 1; i >= 0; i--) {
        const ds = new Date(now.getTime() - i * 24 * 60 * 60 * 1000); ds.setHours(0,0,0,0)
        const de = new Date(ds.getTime() + 24 * 60 * 60 * 1000)
        const dt = txSeries.filter((t) => t.createdAt >= ds && t.createdAt < de)
        series.push({ date: ds.toISOString().slice(5, 10), volume: dt.reduce((s,t)=>s+t.amount,0), fees: dt.reduce((s,t)=>s+t.fee,0) })
      }
    }

    return NextResponse.json({
      bank: { id: bank.id, name: bank.name, bic: bank.bic, type: bank.type, status: bank.status, cryptoProtocol: bank.cryptoProtocol, apiProtocol: bank.apiProtocol, isSandbox: bank.isSandbox },
      period,
      kpi: { totalVolume, totalFees, txCount, thresholdOps, dailyUsagePct },
      byType,
      series,
      limits: bank.limits,
      accounts: bank.accounts,
      fees: bank.fees,
    })
  } catch (e) {
    return NextResponse.json({ error: 'Failed' }, { status: 500 })
  }
}

const txTypes = ['DEPOSIT', 'WITHDRAW', 'CROSS_BORDER', 'SBP']
