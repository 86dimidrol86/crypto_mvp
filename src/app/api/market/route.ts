import { NextRequest, NextResponse } from 'next/server'
import { COINS, fetchTickers, getUsdRubRate } from '@/lib/market'

// GET /api/market — котировки всех монет (proxy на Binance с fallback)
export async function GET() {
  const tickers = await fetchTickers()
  const usdRub = await getUsdRubRate()
  return NextResponse.json({ tickers, usdRub, coins: COINS })
}
