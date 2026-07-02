import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

// GET /api/bank-portal/transactions?bankId=...&period=24h&page=1&limit=50
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const bankId = searchParams.get('bankId')
    const period = searchParams.get('period') || '24h'
    const page = parseInt(searchParams.get('page') || '1')
    const limit = Math.min(parseInt(searchParams.get('limit') || '50'), 200)
    if (!bankId) return NextResponse.json({ error: 'bankId required' }, { status: 400 })

    const now = new Date()
    let periodStart: Date
    switch (period) {
      case '1h': periodStart = new Date(now.getTime() - 60*60*1000); break
      case '7d': periodStart = new Date(now.getTime() - 7*24*60*60*1000); break
      case '30d': periodStart = new Date(now.getTime() - 30*24*60*60*1000); break
      default: periodStart = new Date(now.getTime() - 24*60*60*1000); break
    }

    const [transactions, total] = await Promise.all([
      db.bankTransaction.findMany({
        where: { bankId, createdAt: { gte: periodStart, lte: now } },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      db.bankTransaction.count({
        where: { bankId, createdAt: { gte: periodStart, lte: now } },
      }),
    ])

    return NextResponse.json({ transactions, total, page, limit })
  } catch (e) {
    return NextResponse.json({ error: 'Failed' }, { status: 500 })
  }
}
