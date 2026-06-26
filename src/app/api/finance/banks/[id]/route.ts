import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

// GET /api/finance/banks/[id]
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const bank = await db.bank.findUnique({
      where: { id },
      include: { fees: true, limits: true, accounts: true, transactions: { take: 10, orderBy: { createdAt: 'desc' } } },
    })
    if (!bank) return NextResponse.json({ error: 'Bank not found' }, { status: 404 })
    return NextResponse.json({ bank })
  } catch (e) {
    return NextResponse.json({ error: 'Failed to fetch bank' }, { status: 500 })
  }
}

// PATCH /api/finance/banks/[id]
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const body = await req.json()
    const bank = await db.bank.update({
      where: { id },
      data: { ...body, updatedAt: new Date() },
    })
    return NextResponse.json({ bank })
  } catch (e) {
    return NextResponse.json({ error: 'Failed to update bank' }, { status: 500 })
  }
}

// DELETE /api/finance/banks/[id] — деактивировать (status → INACTIVE)
export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const bank = await db.bank.update({
      where: { id },
      data: { status: 'INACTIVE' },
    })
    return NextResponse.json({ bank })
  } catch (e) {
    return NextResponse.json({ error: 'Failed to deactivate bank' }, { status: 500 })
  }
}
