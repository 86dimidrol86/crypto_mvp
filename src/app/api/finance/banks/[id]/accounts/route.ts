import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

// GET /api/finance/banks/[id]/accounts
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const accounts = await db.bankAccount.findMany({ where: { bankId: id } })
    return NextResponse.json({ accounts })
  } catch (e) {
    return NextResponse.json({ error: 'Failed' }, { status: 500 })
  }
}

// POST /api/finance/banks/[id]/accounts/sync — синхронизация баланса (mock)
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const accounts = await db.bankAccount.findMany({ where: { bankId: id } })
    for (const acc of accounts) {
      // Mock: случайное изменение баланса ±5%
      const delta = acc.balance * (Math.random() - 0.5) * 0.1
      await db.bankAccount.update({
        where: { id: acc.id },
        data: { balance: Math.max(0, acc.balance + delta), lastSyncAt: new Date() },
      })
    }
    const updated = await db.bankAccount.findMany({ where: { bankId: id } })
    return NextResponse.json({ accounts: updated, synced: true })
  } catch (e) {
    return NextResponse.json({ error: 'Failed' }, { status: 500 })
  }
}
