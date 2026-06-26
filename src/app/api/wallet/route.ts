import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

// GET /api/wallet — балансы + транзакции демо-пользователя
export async function GET() {
  const user = await db.user.findUnique({
    where: { email: 'ivan.ivanov@gosuslugi.ru' },
    include: {
      balances: true,
      transactions: { orderBy: { createdAt: 'desc' }, take: 50 },
    },
  })
  if (!user) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  return NextResponse.json({
    balances: user.balances,
    transactions: user.transactions.map((t) => ({
      ...t,
      time: t.createdAt.toLocaleString('ru-RU', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit' }),
    })),
  })
}

// POST /api/wallet — депозит (сгенерировать адрес) или вывод
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}))
  const user = await db.user.findUnique({ where: { email: 'ivan.ivanov@gosuslugi.ru' } })
  if (!user) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  if (body.action === 'deposit') {
    // Генерация адреса (демо)
    const prefix = body.asset === 'BTC' ? 'bc1q' : body.asset === 'ETH' || body.asset === 'USDT' ? '0x' : 'addr'
    const body_hash = Array.from({ length: 34 }, () =>
      '0123456789abcdefghjkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ'[Math.floor(Math.random() * 56)]
    ).join('')
    const address = prefix + body_hash
    const tx = await db.transaction.create({
      data: {
        userId: user.id,
        type: 'deposit',
        asset: body.asset,
        amount: 0,
        status: 'PENDING',
        address,
      },
    })
    return NextResponse.json({ address, transaction: tx })
  }

  if (body.action === 'withdraw') {
    const { asset, amount, address } = body
    if (!asset || !amount || !address) {
      return NextResponse.json({ error: 'Missing fields' }, { status: 400 })
    }
    // Списать баланс
    const balance = await db.balance.findUnique({
      where: { userId_asset: { userId: user.id, asset } },
    })
    if (!balance || balance.amount < amount) {
      return NextResponse.json({ error: 'Insufficient balance' }, { status: 400 })
    }
    await db.balance.update({
      where: { id: balance.id },
      data: { amount: balance.amount - amount },
    })
    const tx = await db.transaction.create({
      data: {
        userId: user.id,
        type: 'withdrawal',
        asset,
        amount: -amount,
        status: amount > 100000 ? 'PENDING' : 'COMPLETED',
        address,
      },
    })
    return NextResponse.json({ transaction: tx })
  }

  return NextResponse.json({ error: 'Unknown action' }, { status: 400 })
}
