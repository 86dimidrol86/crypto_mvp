import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

// GET /api/kyc — статус KYC
export async function GET() {
  const user = await db.user.findUnique({ where: { email: 'ivan.ivanov@gosuslugi.ru' } })
  if (!user) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  return NextResponse.json({
    kycLevel: user.kycLevel,
    kycStatus: user.kycStatus,
    qualified: user.qualified,
    addressId: user.kycLevel >= 2 ? 'RU-AID-' + user.id.slice(0, 4).toUpperCase() + '-' + user.id.slice(4, 8).toUpperCase() : null,
  })
}

// POST /api/kyc — обновить уровень KYC
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}))
  const user = await db.user.update({
    where: { email: 'ivan.ivanov@gosuslugi.ru' },
    data: {
      kycLevel: body.level ?? 2,
      kycStatus: body.status || 'ACTIVE',
      qualified: body.qualified ?? false,
    },
  })
  return NextResponse.json({
    kycLevel: user.kycLevel,
    kycStatus: user.kycStatus,
    qualified: user.qualified,
  })
}
