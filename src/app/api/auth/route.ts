import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

// GET /api/auth — текущий демо-пользователь
export async function GET() {
  const user = await db.user.findUnique({
    where: { email: 'ivan.ivanov@gosuslugi.ru' },
    include: { balances: true },
  })
  if (!user) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  return NextResponse.json({
    id: user.id,
    email: user.email,
    name: user.name,
    phone: user.phone,
    kycLevel: user.kycLevel,
    kycStatus: user.kycStatus,
    qualified: user.qualified,
    role: user.role,
    balances: user.balances,
  })
}

// POST /api/auth — login/register (демо: всегда возвращает демо-пользователя)
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}))
  const user = await db.user.upsert({
    where: { email: body.email || 'ivan.ivanov@gosuslugi.ru' },
    update: { name: body.name || 'Иван Иванов' },
    create: {
      email: body.email || 'ivan.ivanov@gosuslugi.ru',
      name: body.name || 'Иван Иванов',
      phone: body.phone,
      kycLevel: 2,
      kycStatus: 'ACTIVE',
    },
    include: { balances: true },
  })
  return NextResponse.json({
    id: user.id,
    email: user.email,
    name: user.name,
    phone: user.phone,
    kycLevel: user.kycLevel,
    kycStatus: user.kycStatus,
    qualified: user.qualified,
    role: user.role,
    balances: user.balances,
  })
}
