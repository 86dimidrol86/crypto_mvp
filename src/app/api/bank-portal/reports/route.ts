import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

// GET /api/bank-portal/reports?bankId=...&type=threshold&period=2026-07
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const bankId = searchParams.get('bankId')
    const type = searchParams.get('type') || 'threshold'
    const period = searchParams.get('period') || new Date().toISOString().slice(0, 7)
    if (!bankId) return NextResponse.json({ error: 'bankId required' }, { status: 400 })

    const [year, month] = period.split('-')
    const periodStart = new Date(parseInt(year), parseInt(month) - 1, 1)
    const periodEnd = new Date(parseInt(year), parseInt(month), 1)
    const bank = await db.bank.findUnique({ where: { id: bankId } })

    if (type === 'threshold') {
      const thresholdTx = await db.bankTransaction.findMany({
        where: { bankId, isThreshold: true, createdAt: { gte: periodStart, lt: periodEnd } },
        orderBy: { createdAt: 'desc' },
      })
      return NextResponse.json({ type: 'threshold', period, bankName: bank?.name, title: `Пороговые операции (>600 000 ₽) — ${bank?.name}`, count: thresholdTx.length, totalAmount: thresholdTx.reduce((s,t)=>s+t.amount,0), transactions: thresholdTx })
    }

    if (type === 'volumes') {
      const txs = await db.bankTransaction.findMany({ where: { bankId, createdAt: { gte: periodStart, lt: periodEnd }, status: 'COMPLETED' } })
      return NextResponse.json({ type: 'volumes', period, bankName: bank?.name, title: `Оборот ${bank?.name} за ${period}`, volume: txs.reduce((s,t)=>s+t.amount,0), fees: txs.reduce((s,t)=>s+t.fee,0), txCount: txs.length, thresholdCount: txs.filter(t=>t.isThreshold).length })
    }

    return NextResponse.json({ error: 'Unknown report type' }, { status: 400 })
  } catch (e) {
    return NextResponse.json({ error: 'Failed' }, { status: 500 })
  }
}
