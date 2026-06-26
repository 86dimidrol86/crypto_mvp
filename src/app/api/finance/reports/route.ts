import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

// GET /api/finance/reports — регуляторные отчёты
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const type = searchParams.get('type') || 'threshold'
    const period = searchParams.get('period') || new Date().toISOString().slice(0, 7)

    const [year, month] = period.split('-')
    const periodStart = new Date(parseInt(year), parseInt(month) - 1, 1)
    const periodEnd = new Date(parseInt(year), parseInt(month), 1)

    if (type === 'threshold') {
      // Пороговые операции >600K (115-ФЗ)
      const thresholdTx = await db.bankTransaction.findMany({
        where: { isThreshold: true, createdAt: { gte: periodStart, lt: periodEnd } },
        include: { bank: true },
        orderBy: { createdAt: 'desc' },
      })
      return NextResponse.json({
        type: 'threshold',
        period,
        title: 'Пороговые операции (>600 000 ₽) — 115-ФЗ',
        count: thresholdTx.length,
        totalAmount: thresholdTx.reduce((s, t) => s + t.amount, 0),
        transactions: thresholdTx,
      })
    }

    if (type === 'bank-volumes') {
      // Оборот по банкам за период
      const banks = await db.bank.findMany()
      const report = await Promise.all(
        banks.map(async (b) => {
          const txs = await db.bankTransaction.findMany({
            where: { bankId: b.id, createdAt: { gte: periodStart, lt: periodEnd }, status: 'COMPLETED' },
          })
          return {
            bankName: b.name,
            bic: b.bic,
            volume: txs.reduce((s, t) => s + t.amount, 0),
            fees: txs.reduce((s, t) => s + t.fee, 0),
            txCount: txs.length,
            thresholdCount: txs.filter((t) => t.isThreshold).length,
          }
        })
      )
      return NextResponse.json({
        type: 'bank-volumes',
        period,
        title: 'Оборот по банкам за период',
        banks: report,
      })
    }

    if (type === 'compliance-export') {
      // Выгрузка комплаенс-данных для банка (115-ФЗ)
      const allTx = await db.bankTransaction.findMany({
        where: { createdAt: { gte: periodStart, lt: periodEnd } },
        include: { bank: true },
        orderBy: { createdAt: 'asc' },
      })
      return NextResponse.json({
        type: 'compliance-export',
        period,
        title: 'Комплаенс-выгрузка для банка (115-ФЗ)',
        format: 'JSON',
        count: allTx.length,
        transactions: allTx.map((t) => ({
          date: t.createdAt.toISOString(),
          bank: t.bank.name,
          type: t.type,
          amount: t.amount,
          currency: t.currency,
          status: t.status,
          isThreshold: t.isThreshold,
          bankReference: t.bankReference,
        })),
      })
    }

    return NextResponse.json({ error: 'Unknown report type' }, { status: 400 })
  } catch (e) {
    return NextResponse.json({ error: 'Failed' }, { status: 500 })
  }
}
