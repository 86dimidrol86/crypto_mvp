import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

// GET /api/finance/banks/[id]/limits
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const limits = await db.bankLimit.findUnique({ where: { bankId: id } })
    // Текущий оборот за день (с верхней границей = сейчас, чтобы будущие tx не считались)
    const now = new Date()
    const dayStart = new Date(now)
    dayStart.setHours(0, 0, 0, 0)
    const todayTx = await db.bankTransaction.aggregate({
      where: { bankId: id, createdAt: { gte: dayStart, lte: now }, status: 'COMPLETED' },
      _sum: { amount: true },
      _count: true,
    })
    return NextResponse.json({
      limits,
      todayUsage: todayTx._sum.amount || 0,
      todayCount: todayTx._count,
    })
  } catch (e) {
    return NextResponse.json({ error: 'Failed' }, { status: 500 })
  }
}

// PATCH /api/finance/banks/[id]/limits
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const body = await req.json()
    const limits = await db.bankLimit.upsert({
      where: { bankId: id },
      update: {
        dailyLimit: body.dailyLimit,
        monthlyLimit: body.monthlyLimit,
        perTransactionLimit: body.perTransactionLimit,
        perUserDailyLimit: body.perUserDailyLimit,
        alertThreshold: body.alertThreshold,
        autoSuspendOnLimit: body.autoSuspendOnLimit,
      },
      create: {
        bankId: id,
        dailyLimit: body.dailyLimit || 50000000,
        monthlyLimit: body.monthlyLimit || 500000000,
        perTransactionLimit: body.perTransactionLimit || 1000000,
        perUserDailyLimit: body.perUserDailyLimit || 300000,
        alertThreshold: body.alertThreshold || 0.8,
        autoSuspendOnLimit: body.autoSuspendOnLimit ?? true,
      },
    })
    return NextResponse.json({ limits })
  } catch (e) {
    return NextResponse.json({ error: 'Failed' }, { status: 500 })
  }
}
