import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

// GET /api/orders — история ордеров/сделок демо-пользователя
export async function GET() {
  const user = await db.user.findUnique({
    where: { email: 'ivan.ivanov@gosuslugi.ru' },
    include: {
      orders: { orderBy: { createdAt: 'desc' }, take: 50 },
      trades: { orderBy: { createdAt: 'desc' }, take: 50 },
    },
  })
  if (!user) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  return NextResponse.json({
    orders: user.orders,
    trades: user.trades.map((t) => ({
      ...t,
      time: t.createdAt.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' }),
    })),
  })
}

// POST /api/orders — разместить ордер (демо matching: мгновенный fill)
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}))
  const { pair, side, type, price, quantity } = body
  if (!pair || !side || !price || !quantity) {
    return NextResponse.json({ error: 'Missing fields' }, { status: 400 })
  }

  const user = await db.user.findUnique({ where: { email: 'ivan.ivanov@gosuslugi.ru' } })
  if (!user) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const [base, quote] = pair.split('/')
  const total = price * quantity
  const fee = total * 0.002

  // Проверка баланса
  const quoteBal = await db.balance.findUnique({
    where: { userId_asset: { userId: user.id, asset: quote } },
  })
  const baseBal = await db.balance.findUnique({
    where: { userId_asset: { userId: user.id, asset: base } },
  })

  if (side === 'buy' && (!quoteBal || quoteBal.amount < total + fee)) {
    return NextResponse.json({ error: 'Insufficient ' + quote + ' balance' }, { status: 400 })
  }
  if (side === 'sell' && (!baseBal || baseBal.amount < quantity)) {
    return NextResponse.json({ error: 'Insufficient ' + base + ' balance' }, { status: 400 })
  }

  // Создать ордер (мгновенный fill в демо)
  const order = await db.order.create({
    data: {
      userId: user.id,
      pair,
      side,
      type: type || 'limit',
      price,
      quantity,
      filledQty: quantity,
      status: 'FILLED',
    },
  })

  // Обновить балансы
  if (side === 'buy') {
    await db.balance.upsert({
      where: { userId_asset: { userId: user.id, asset: base } },
      update: { amount: (baseBal?.amount || 0) + quantity },
      create: { userId: user.id, asset: base, amount: quantity },
    })
    await db.balance.update({
      where: { id: quoteBal!.id },
      data: { amount: quoteBal!.amount - total - fee },
    })
  } else {
    await db.balance.update({
      where: { id: baseBal!.id },
      data: { amount: baseBal!.amount - quantity },
    })
    await db.balance.upsert({
      where: { userId_asset: { userId: user.id, asset: quote } },
      update: { amount: (quoteBal?.amount || 0) + total - fee },
      create: { userId: user.id, asset: quote, amount: total - fee },
    })
  }

  // Создать trade
  const trade = await db.trade.create({
    data: { orderId: order.id, userId: user.id, pair, side, price, quantity, total, fee },
  })

  // Транзакция
  await db.transaction.create({
    data: {
      userId: user.id,
      type: 'trade',
      asset: base,
      amount: side === 'buy' ? quantity : -quantity,
      status: 'COMPLETED',
    },
  })

  return NextResponse.json({
    order,
    trade: { ...trade, time: trade.createdAt.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' }) },
    fee,
    total,
  })
}
