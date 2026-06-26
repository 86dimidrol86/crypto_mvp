import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

// GET /api/p2p — офферы + мои сделки
export async function GET() {
  const user = await db.user.findUnique({
    where: { email: 'ivan.ivanov@gosuslugi.ru' },
    include: { p2pDeals: { orderBy: { createdAt: 'desc' } } },
  })
  const offers = await db.p2POffer.findMany({
    where: { active: true },
    orderBy: { createdAt: 'desc' },
  })
  return NextResponse.json({
    offers: offers.map((o) => ({ ...o, rating: 4.5 + Math.random() * 0.5 })),
    deals: (user?.p2pDeals || []).map((d) => ({
      ...d,
      time: d.createdAt.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' }),
      counterparty: 'Counterparty',
    })),
  })
}

// POST /api/p2p — создать оффер или принять (action=create|accept|update)
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}))
  const user = await db.user.findUnique({ where: { email: 'ivan.ivanov@gosuslugi.ru' } })
  if (!user) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  if (body.action === 'create') {
    const offer = await db.p2POffer.create({
      data: {
        userId: user.id,
        type: body.type || 'sell',
        asset: 'USDT',
        fiat: 'RUB',
        price: body.price,
        amount: body.amount,
        method: body.method || 'СБП',
      },
    })
    return NextResponse.json({ offer })
  }

  if (body.action === 'accept') {
    const offer = await db.p2POffer.findUnique({ where: { id: body.offerId } })
    if (!offer) return NextResponse.json({ error: 'Offer not found' }, { status: 404 })
    const deal = await db.p2PDeal.create({
      data: {
        offerId: offer.id,
        buyerId: user.id,
        asset: offer.asset,
        amount: offer.amount,
        price: offer.price,
        total: offer.amount * offer.price,
        paymentMethod: offer.method,
        status: 'PENDING',
      },
    })
    return NextResponse.json({ deal })
  }

  return NextResponse.json({ error: 'Unknown action' }, { status: 400 })
}

// PATCH /api/p2p — обновить статус сделки
export async function PATCH(req: NextRequest) {
  const body = await req.json().catch(() => ({}))
  const deal = await db.p2PDeal.update({
    where: { id: body.id },
    data: { status: body.status },
  })
  return NextResponse.json({ deal })
}
