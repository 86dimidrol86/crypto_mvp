import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

// GET /api/auth?email=... — текущий пользователь (по умолчанию демо-user)
export async function GET(req: NextRequest) {
  const email = req.nextUrl.searchParams.get('email') || 'user@ruscrypto.ru'
  const user = await db.user.findUnique({
    where: { email },
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
    referralCode: user.referralCode,
    balances: user.balances,
  })
}

// POST /api/auth — login (демо: любой email, пароль не проверяется)
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}))
  const email = body.email || 'user@ruscrypto.ru'
  const user = await db.user.upsert({
    where: { email },
    update: {},
    create: {
      email,
      name: body.name || email.split('@')[0],
      phone: body.phone,
      kycLevel: 2,
      kycStatus: 'ACTIVE',
      role: 'USER',
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
    referralCode: user.referralCode,
    balances: user.balances,
  })
}
