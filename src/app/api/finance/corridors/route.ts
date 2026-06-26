import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

// GET /api/finance/corridors — список коридоров
export async function GET() {
  try {
    const corridors = await db.corridorConfig.findMany({
      orderBy: { corridorId: 'asc' },
    })
    return NextResponse.json({ corridors })
  } catch (e) {
    return NextResponse.json({ error: 'Failed' }, { status: 500 })
  }
}

// PATCH /api/finance/corridors — обновить коридор
export async function PATCH(req: NextRequest) {
  try {
    const body = await req.json()
    const { corridorId, ...data } = body
    const corridor = await db.corridorConfig.update({
      where: { corridorId },
      data,
    })
    return NextResponse.json({ corridor })
  } catch (e) {
    return NextResponse.json({ error: 'Failed' }, { status: 500 })
  }
}
