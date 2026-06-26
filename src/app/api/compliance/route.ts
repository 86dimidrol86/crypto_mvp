import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

const SHAP_DATA: Record<string, { feature: string; contribution: number }[]> = {
  STRUCTURING: [
    { feature: 'Кол-во операций за час', contribution: 0.31 },
    { feature: 'Сумма около порога 100К', contribution: 0.24 },
    { feature: 'Новый адрес получателя', contribution: 0.18 },
    { feature: 'Время суток (ночь)', contribution: 0.14 },
  ],
  VELOCITY: [
    { feature: 'Гео-расстояние входов', contribution: 0.29 },
    { feature: 'Новые устройства', contribution: 0.21 },
    { feature: 'Скорость смены IP', contribution: 0.14 },
  ],
  SANCTION: [
    { feature: 'Fuzzy match ФИО', contribution: 0.42 },
    { feature: 'Совпадение банка', contribution: 0.28 },
    { feature: 'Совпадение ИНН', contribution: 0.26 },
  ],
  THRESHOLD: [
    { feature: 'Сумма транзакции', contribution: 0.18 },
    { feature: 'История клиента (Lv.2)', contribution: -0.1 },
  ],
  PATTERN: [
    { feature: 'Нерабочее время', contribution: 0.16 },
    { feature: 'Новый адрес', contribution: 0.22 },
    { feature: 'Нетипичный объём', contribution: 0.2 },
  ],
}

// GET /api/compliance — все алерты
export async function GET() {
  const alerts = await db.complianceAlert.findMany({ orderBy: { createdAt: 'desc' } })
  return NextResponse.json({
    alerts: alerts.map((a) => ({
      ...a,
      shap: SHAP_DATA[a.type] || [],
      createdAt: a.createdAt.toISOString(),
    })),
  })
}

// PATCH /api/compliance — review alert
export async function PATCH(req: NextRequest) {
  const body = await req.json().catch(() => ({}))
  const { id, status } = body
  const officer = await db.user.findUnique({ where: { email: 'compliance@ruscrypto.ru' } })
  const alert = await db.complianceAlert.update({
    where: { id },
    data: { status, reviewerId: officer?.id, reviewedAt: new Date() },
  })
  return NextResponse.json({ alert })
}
