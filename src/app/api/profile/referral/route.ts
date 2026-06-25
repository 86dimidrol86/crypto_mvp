import { NextResponse } from 'next/server'
import { db } from '@/lib/db'

// GET /api/profile/referral — реферальный код + статистика + список приглашённых
export async function GET() {
  try {
    const user = await db.user.findUnique({
      where: { email: 'ivan.ivanov@gosuslugi.ru' },
      select: { id: true, referralCode: true },
    })
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    const referrals = await db.referral.findMany({
      where: { referrerId: user.id },
      orderBy: { createdAt: 'desc' },
    })

    const earnedTotal = referrals.reduce((s, r) => s + r.reward, 0)
    const activeCount = referrals.filter((r) => r.status !== 'REGISTERED').length

    const data = {
      code: user.referralCode || `RU-${user.id.slice(0, 6).toUpperCase()}`,
      invitedCount: referrals.length,
      activeCount,
      earnedTotal,
      referrals: referrals.map((r) => ({
        id: r.id,
        referredEmail: r.referredEmail,
        reward: r.reward,
        status: r.status,
        createdAt: r.createdAt.toISOString(),
      })),
    }

    return NextResponse.json(data)
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
