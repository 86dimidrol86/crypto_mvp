import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

// GET /api/finance/banks/[id]/fees
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const fees = await db.bankFee.findMany({ where: { bankId: id }, orderBy: { operationType: 'asc' } })
    return NextResponse.json({ fees })
  } catch (e) {
    return NextResponse.json({ error: 'Failed' }, { status: 500 })
  }
}

// POST /api/finance/banks/[id]/fees
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const body = await req.json()
    const fee = await db.bankFee.create({
      data: {
        bankId: id,
        operationType: body.operationType,
        feeType: body.feeType || 'PERCENT',
        feePercent: body.feePercent || 0,
        feeFixed: body.feeFixed || 0,
        feeMin: body.feeMin || 0,
        feeMax: body.feeMax || null,
        payer: body.payer || 'USER',
        currency: body.currency || 'RUB',
      },
    })
    return NextResponse.json({ fee })
  } catch (e) {
    return NextResponse.json({ error: 'Failed' }, { status: 500 })
  }
}
