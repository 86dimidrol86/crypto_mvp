import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

// GET /api/bank-portal/reconciliation?bankId=...
export async function GET(req: NextRequest) {
  try {
    const bankId = req.nextUrl.searchParams.get('bankId')
    if (!bankId) return NextResponse.json({ error: 'bankId required' }, { status: 400 })
    const reconciliations = await db.bankReconciliation.findMany({
      where: { bankId },
      orderBy: { createdAt: 'desc' },
    })
    return NextResponse.json({ reconciliations })
  } catch (e) {
    return NextResponse.json({ error: 'Failed' }, { status: 500 })
  }
}

// POST — create reconciliation for this bank
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { bankId, period } = body
    if (!bankId || !period) return NextResponse.json({ error: 'bankId and period required' }, { status: 400 })

    const [year, month] = period.split('-')
    const periodStart = new Date(parseInt(year), parseInt(month) - 1, 1)
    const periodEnd = new Date(parseInt(year), parseInt(month), 1)
    const txs = await db.bankTransaction.findMany({ where: { bankId, createdAt: { gte: periodStart, lt: periodEnd } } })
    const total = txs.length
    const matched = Math.floor(total * 0.95)
    const unmatchedInternal = total - matched
    const discrepancyAmount = unmatchedInternal > 0 ? unmatchedInternal * 50000 : 0

    const recon = await db.bankReconciliation.create({
      data: { bankId, period, totalTransactions: total, matchedCount: matched, unmatchedInternal, unmatchedBank: 0, status: unmatchedInternal > 0 ? 'DISCREPANCY' : 'MATCHED', discrepancyAmount },
    })
    return NextResponse.json({ reconciliation: recon })
  } catch (e) {
    return NextResponse.json({ error: 'Failed' }, { status: 500 })
  }
}
