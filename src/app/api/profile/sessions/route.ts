import { NextResponse } from 'next/server'
import { db } from '@/lib/db'

// GET /api/profile/sessions — "активные сессии" за последние 24ч, сгруппированные по устройству
// (демо-вывод: последняя успешная запись LoginEvent на устройство = одна сессия)
export async function GET() {
  try {
    const user = await db.user.findUnique({
      where: { email: 'ivan.ivanov@gosuslugi.ru' },
      select: { id: true },
    })
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    const since = new Date(Date.now() - 24 * 60 * 60 * 1000)
    const recent = await db.loginEvent.findMany({
      where: { userId: user.id, success: true, createdAt: { gte: since } },
      orderBy: { createdAt: 'desc' },
    })

    // Группируем по устройству — последняя запись на устройство = одна сессия
    const byDevice = new Map<string, (typeof recent)[number]>()
    for (const ev of recent) {
      if (!byDevice.has(ev.device)) {
        byDevice.set(ev.device, ev)
      }
    }

    const sessions = Array.from(byDevice.values()).map((ev, i) => ({
      id: ev.id,
      device: `${ev.device} • ${ev.browser}`,
      location: ev.location,
      ip: ev.ip,
      current: i === 0, // самая свежая сессия = текущая
      lastActiveAt: ev.createdAt.toISOString(),
    }))

    return NextResponse.json(sessions)
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
