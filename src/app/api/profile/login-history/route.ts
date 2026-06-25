import { NextResponse } from 'next/server'
import { db } from '@/lib/db'

// GET /api/profile/login-history — последние 20 событий входа демо-пользователя
export async function GET() {
  try {
    const user = await db.user.findUnique({
      where: { email: 'ivan.ivanov@gosuslugi.ru' },
      select: { id: true },
    })
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    const events = await db.loginEvent.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: 'desc' },
      take: 20,
    })

    const data = events.map((e, i) => ({
      id: e.id,
      ip: e.ip,
      device: e.device,
      browser: e.browser,
      location: e.location,
      success: e.success,
      current: i === 0 && e.success, // помечаем самую свежую успешную сессию как текущую
      createdAt: e.createdAt.toISOString(),
    }))

    return NextResponse.json(data)
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
