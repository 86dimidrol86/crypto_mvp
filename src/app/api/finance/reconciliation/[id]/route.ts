import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

// PATCH /api/finance/reconciliation/[id] — разрешить расхождения
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const body = await req.json()
    const recon = await db.bankReconciliation.update({
      where: { id },
      data: {
        status: body.status || 'MATCHED',
        unmatchedInternal: 0,
        discrepancyAmount: 0,
        resolvedAt: new Date(),
        notes: body.notes || 'Расхождения разрешены',
      },
    })
    return NextResponse.json({ reconciliation: recon })
  } catch (e) {
    return NextResponse.json({ error: 'Failed' }, { status: 500 })
  }
}
