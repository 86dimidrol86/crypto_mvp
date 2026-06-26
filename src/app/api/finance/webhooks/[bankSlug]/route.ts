import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

// GET /api/finance/webhooks — список вебхуков
export async function GET() {
  try {
    const logs = await db.bankWebhookLog.findMany({
      include: { bank: true },
      orderBy: { createdAt: 'desc' },
      take: 50,
    })
    return NextResponse.json({ webhooks: logs })
  } catch (e) {
    return NextResponse.json({ error: 'Failed' }, { status: 500 })
  }
}

// POST /api/finance/webhooks/[bankSlug] — приём webhook от банка
export async function POST(req: NextRequest, { params }: { params: Promise<{ bankSlug: string }> }) {
  try {
    const { bankSlug } = await params
    const body = await req.json()

    // Найти банк по slug (имя в lowercase)
    const bank = await db.bank.findFirst({
      where: {
        OR: [
          { name: { contains: bankSlug.charAt(0).toUpperCase() + bankSlug.slice(1) } },
          { webhookUrl: { contains: bankSlug } },
        ],
      },
    })

    if (!bank) {
      return NextResponse.json({ error: 'Bank not found' }, { status: 404 })
    }

    // Логирование вебхука
    const log = await db.bankWebhookLog.create({
      data: {
        bankId: bank.id,
        eventType: body.eventType || 'UNKNOWN',
        payload: JSON.stringify(body),
        status: 'PROCESSED',
        processedAt: new Date(),
      },
    })

    // Обновить транзакцию если есть bankReference
    if (body.bankReference) {
      const tx = await db.bankTransaction.findFirst({
        where: { bankReference: body.bankReference },
      })
      if (tx) {
        await db.bankTransaction.update({
          where: { id: tx.id },
          data: {
            status: body.status || tx.status,
            processedAt: body.status === 'COMPLETED' ? new Date() : tx.processedAt,
          },
        })
      }
    }

    return NextResponse.json({ received: true, logId: log.id })
  } catch (e) {
    return NextResponse.json({ error: 'Failed to process webhook' }, { status: 500 })
  }
}
