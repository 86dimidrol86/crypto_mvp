import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

const CORRIDORS = {
  'RU-CN': { from: 'RUB', to: 'CNY', rate: 0.083, fee: 0.008, eta: '15-40 мин', flag: '🇨🇳' },
  'RU-AE': { from: 'RUB', to: 'AED', rate: 0.04, fee: 0.012, eta: '1-3 часа', flag: '🇦🇪' },
  'RU-TR': { from: 'RUB', to: 'TRY', rate: 0.34, fee: 0.009, eta: '30-60 мин', flag: '🇹🇷' },
  'RU-IN': { from: 'RUB', to: 'INR', rate: 0.91, fee: 0.011, eta: '1-2 часа', flag: '🇮🇳' },
  'RU-KZ': { from: 'RUB', to: 'KZT', rate: 5.5, fee: 0.006, eta: '10-30 мин', flag: '🇰🇿' },
  'RU-AM': { from: 'RUB', to: 'AMD', rate: 4.2, fee: 0.007, eta: '15-45 мин', flag: '🇦🇲' },
} as const

// GET /api/payments — список коридоров + мои платежи
export async function GET() {
  const user = await db.user.findUnique({
    where: { email: 'ivan.ivanov@gosuslugi.ru' },
    include: { payments: { orderBy: { createdAt: 'desc' } } },
  })
  return NextResponse.json({
    corridors: Object.entries(CORRIDORS).map(([id, v]) => ({ id, ...v, name: id.replace('-', ' → ') })),
    payments: user?.payments || [],
  })
}

// POST /api/payments — создать платёж
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}))
  const { corridor, amount, beneficiary, purpose, account, swift } = body
  const c = CORRIDORS[corridor as keyof typeof CORRIDORS]
  if (!c || !amount) return NextResponse.json({ error: 'Invalid corridor or amount' }, { status: 400 })

  const user = await db.user.findUnique({ where: { email: 'ivan.ivanov@gosuslugi.ru' } })
  if (!user) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const feeAmount = amount * c.fee
  const receiveAmount = amount * c.rate * (1 - c.fee)

  const payment = await db.crossBorderPayment.create({
    data: {
      userId: user.id,
      corridor,
      fromCurrency: c.from,
      toCurrency: c.to,
      amount,
      receiveAmount,
      fee: feeAmount,
      rate: c.rate,
      beneficiary: `${beneficiary || ''} | ${account || ''} | ${swift || ''}`,
      purpose: purpose || '',
      status: 'INITIATED',
    },
  })
  return NextResponse.json({ payment })
}

// PATCH /api/payments — обновить статус
export async function PATCH(req: NextRequest) {
  const body = await req.json().catch(() => ({}))
  const { id, status } = body
  const payment = await db.crossBorderPayment.update({
    where: { id },
    data: { status },
  })
  return NextResponse.json({ payment })
}
