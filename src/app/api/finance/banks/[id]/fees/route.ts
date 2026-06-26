import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

// GET /api/finance/banks/[id]/fees
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const fees = await db.bankFee.findMany({
      where: { bankId: id },
      orderBy: [{ active: 'desc' }, { operationType: 'asc' }, { effectiveFrom: 'desc' }],
    })
    return NextResponse.json({ fees })
  } catch (e) {
    return NextResponse.json({ error: 'Failed' }, { status: 500 })
  }
}

// POST /api/finance/banks/[id]/fees — создать новую комиссию
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
        effectiveFrom: body.effectiveFrom ? new Date(body.effectiveFrom) : new Date(),
        effectiveTo: body.effectiveTo ? new Date(body.effectiveTo) : null,
        active: body.active ?? true,
      },
    })
    return NextResponse.json({ fee })
  } catch (e) {
    return NextResponse.json({ error: 'Failed' }, { status: 500 })
  }
}

// PATCH /api/finance/banks/[id]/fees — обновить комиссию (body.feeId required)
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const body = await req.json()
    if (!body.feeId) return NextResponse.json({ error: 'feeId required' }, { status: 400 })

    const fee = await db.bankFee.update({
      where: { id: body.feeId },
      data: {
        feeType: body.feeType,
        feePercent: body.feePercent,
        feeFixed: body.feeFixed,
        feeMin: body.feeMin,
        feeMax: body.feeMax,
        payer: body.payer,
        effectiveFrom: body.effectiveFrom ? new Date(body.effectiveFrom) : undefined,
        effectiveTo: body.effectiveTo ? new Date(body.effectiveTo) : undefined,
        active: body.active,
      },
    })
    return NextResponse.json({ fee })
  } catch (e) {
    return NextResponse.json({ error: 'Failed' }, { status: 500 })
  }
}

// DELETE /api/finance/banks/[id]/fees — архивировать комиссию (active=false + effectiveTo=now)
export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const { searchParams } = new URL(req.url)
    const feeId = searchParams.get('feeId')
    if (!feeId) return NextResponse.json({ error: 'feeId required' }, { status: 400 })

    const fee = await db.bankFee.update({
      where: { id: feeId },
      data: {
        active: false,
        effectiveTo: new Date(),
      },
    })
    return NextResponse.json({ fee, archived: true })
  } catch (e) {
    return NextResponse.json({ error: 'Failed' }, { status: 500 })
  }
}
