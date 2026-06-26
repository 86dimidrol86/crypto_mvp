import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

// GET /api/bank-portal/settings?bankId=...
export async function GET(req: NextRequest) {
  try {
    const bankId = req.nextUrl.searchParams.get('bankId')
    if (!bankId) return NextResponse.json({ error: 'bankId required' }, { status: 400 })

    const bank = await db.bank.findUnique({
      where: { id: bankId },
      include: { fees: true, limits: true, accounts: true },
    })
    if (!bank) return NextResponse.json({ error: 'Bank not found' }, { status: 404 })

    return NextResponse.json({ bank })
  } catch (e) {
    return NextResponse.json({ error: 'Failed' }, { status: 500 })
  }
}
