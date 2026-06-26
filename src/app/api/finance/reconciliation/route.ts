import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

// GET /api/finance/reconciliation — список сверок
export async function GET() {
  try {
    const reconciliations = await db.bankReconciliation.findMany({
      include: { bank: true },
      orderBy: { createdAt: 'desc' },
    })
    return NextResponse.json({ reconciliations })
  } catch (e) {
    return NextResponse.json({ error: 'Failed' }, { status: 500 })
  }
}

// POST /api/finance/reconciliation — создать сверку (mock auto-match)
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { bankId, period } = body
    // Подсчёт транзакций за период
    const [year, month] = period.split('-')
    const periodStart = new Date(parseInt(year), parseInt(month) - 1, 1)
    const periodEnd = new Date(parseInt(year), parseInt(month), 1)

    const txs = await db.bankTransaction.findMany({
      where: { bankId, createdAt: { gte: periodStart, lt: periodEnd } },
    })
    const total = txs.length
    // Mock: 95% matched
    const matched = Math.floor(total * 0.95)
    const unmatchedInternal = total - matched
    const discrepancyAmount = unmatchedInternal > 0 ? unmatchedInternal * 50000 : 0

    const recon = await db.bankReconciliation.create({
      data: {
        bankId,
        period,
        totalTransactions: total,
        matchedCount: matched,
        unmatchedInternal,
        unmatchedBank: 0,
        status: unmatchedInternal > 0 ? 'DISCREPANCY' : 'MATCHED',
        discrepancyAmount,
      },
      include: { bank: true },
    })
    return NextResponse.json({ reconciliation: recon })
  } catch (e) {
    return NextResponse.json({ error: 'Failed' }, { status: 500 })
  }
}
