import { NextResponse } from 'next/server'
import { db } from '@/lib/db'

// GET /api/finance/webhooks — список последних вебхуков от банков
export async function GET() {
  try {
    const logs = await db.bankWebhookLog.findMany({
      include: { bank: true },
      orderBy: { createdAt: 'desc' },
      take: 50,
    })
    return NextResponse.json({ webhooks: logs })
  } catch (e) {
    return NextResponse.json(
      { error: 'Failed to fetch webhooks' },
      { status: 500 }
    )
  }
}
