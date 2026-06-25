import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { fetchTickers, getUsdRubRate } from '@/lib/market'

// GET /api/portfolio/history — реальная кривая капитала портфеля на основе
// сделок (db.trade) и транзакций (db.transaction) демо-пользователя.
// Стоимость активов рассчитывается по ТЕКУЩИМ котировкам (исторические
// фиды недоступны в демо) — приемлемое приближение для демонстрации.
export async function GET() {
  try {
    const user = await db.user.findUnique({
      where: { email: 'ivan.ivanov@gosuslugi.ru' },
    })
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    const [trades, allTx, balances, tickers, usdRub] = await Promise.all([
      db.trade.findMany({
        where: { userId: user.id },
        orderBy: { createdAt: 'asc' },
      }),
      db.transaction.findMany({
        where: { userId: user.id },
        orderBy: { createdAt: 'asc' },
      }),
      db.balance.findMany({ where: { userId: user.id } }),
      fetchTickers(),
      getUsdRubRate(),
    ])

    // Только депозиты и выводы — сделки учитываем отдельно через Trade,
    // чтобы избежать двойного счёта (type='trade' дублирует Trade-записи).
    const walletTx = allTx.filter(
      (t) => t.type === 'deposit' || t.type === 'withdrawal'
    )

    // Карта цен в RUB
    const priceMap: Record<string, number> = {
      RUB: 1,
      USDT: usdRub,
    }
    for (const t of tickers) priceMap[t.symbol] = t.priceRub

    // Текущие балансы как Record
    const currentBalances: Record<string, number> = {}
    for (const b of balances) currentBalances[b.asset] = b.amount

    // Объединённый поток событий (хронологический)
    type Event = {
      kind: 'trade' | 'tx'
      time: Date
      pair?: string
      side?: string
      quantity?: number
      total?: number
      fee?: number
      asset?: string
      amount?: number
    }
    const events: Event[] = [
      ...trades.map((t) => ({
        kind: 'trade' as const,
        time: t.createdAt,
        pair: t.pair,
        side: t.side,
        quantity: t.quantity,
        total: t.total,
        fee: t.fee,
      })),
      ...walletTx.map((t) => ({
        kind: 'tx' as const,
        time: t.createdAt,
        asset: t.asset,
        amount: t.amount,
      })),
    ].sort((a, b) => a.time.getTime() - b.time.getTime())

    // Вычисляем начальные балансы, «отменяя» все события в обратном порядке
    const initialBalances: Record<string, number> = { ...currentBalances }
    for (const e of [...events].reverse()) {
      if (e.kind === 'trade') {
        const parts = (e.pair || '').split('/')
        const base = parts[0]
        const quote = parts[1]
        if (e.side === 'buy') {
          // forward: -total -fee (quote), +qty (base)
          // undo:    +total +fee (quote), -qty (base)
          if (quote) initialBalances[quote] = (initialBalances[quote] || 0) + (e.total || 0) + (e.fee || 0)
          if (base) initialBalances[base] = (initialBalances[base] || 0) - (e.quantity || 0)
        } else {
          // forward: +total -fee (quote), -qty (base)
          // undo:    -total +fee (quote), +qty (base)
          if (quote) initialBalances[quote] = (initialBalances[quote] || 0) - (e.total || 0) + (e.fee || 0)
          if (base) initialBalances[base] = (initialBalances[base] || 0) + (e.quantity || 0)
        }
      } else {
        // tx: forward применяет amount (со знаком) к активу. undo: вычесть amount.
        if (e.asset) initialBalances[e.asset] = (initialBalances[e.asset] || 0) - (e.amount || 0)
      }
    }

    const portfolioValue = (b: Record<string, number>): number => {
      let sum = 0
      for (const [asset, amount] of Object.entries(b)) {
        const price = priceMap[asset] || 0
        sum += amount * price
      }
      return sum
    }

    const formatLabel = (d: Date): string =>
      d.toLocaleString('ru-RU', {
        day: '2-digit',
        month: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
      })

    // Строим кривую капитала вперёд во времени
    const series: {
      timestamp: number
      label: string
      value: number
      pnl: number
      pnlPct: number
    }[] = []

    const working: Record<string, number> = { ...initialBalances }
    let prevValue = portfolioValue(working)

    // Стартовая точка (начальное состояние)
    const startLabel = events.length > 0 ? formatLabel(events[0].time) : 'Сейчас'
    const startTime = events.length > 0 ? events[0].time.getTime() : Date.now()
    series.push({
      timestamp: startTime,
      label: startLabel,
      value: Math.round(prevValue),
      pnl: 0,
      pnlPct: 0,
    })

    // Применяем события хронологически
    for (const e of events) {
      if (e.kind === 'trade') {
        const parts = (e.pair || '').split('/')
        const base = parts[0]
        const quote = parts[1]
        if (e.side === 'buy') {
          if (quote) working[quote] = (working[quote] || 0) - (e.total || 0) - (e.fee || 0)
          if (base) working[base] = (working[base] || 0) + (e.quantity || 0)
        } else {
          if (quote) working[quote] = (working[quote] || 0) + (e.total || 0) - (e.fee || 0)
          if (base) working[base] = (working[base] || 0) - (e.quantity || 0)
        }
      } else {
        if (e.asset) working[e.asset] = (working[e.asset] || 0) + (e.amount || 0)
      }

      const value = portfolioValue(working)
      const pnl = value - prevValue
      const pnlPct = prevValue > 0 ? (pnl / prevValue) * 100 : 0
      series.push({
        timestamp: e.time.getTime(),
        label: formatLabel(e.time),
        value: Math.round(value),
        pnl: Math.round(pnl),
        pnlPct: Math.round(pnlPct * 100) / 100,
      })
      prevValue = value
    }

    // Текущая точка (now) на основе реальных текущих балансов
    const currentValue = portfolioValue(currentBalances)
    const lastPoint = series[series.length - 1]
    if (Date.now() - lastPoint.timestamp > 60_000) {
      const pnl = currentValue - lastPoint.value
      series.push({
        timestamp: Date.now(),
        label: 'Сейчас',
        value: Math.round(currentValue),
        pnl: Math.round(pnl),
        pnlPct:
          lastPoint.value > 0
            ? Math.round((pnl / lastPoint.value) * 10000) / 100
            : 0,
      })
    } else {
      lastPoint.label = 'Сейчас'
      lastPoint.value = Math.round(currentValue)
    }

    const startValue = series[0].value
    const totalPnl = currentValue - startValue
    const totalPnlPct = startValue > 0 ? (totalPnl / startValue) * 100 : 0
    const feesPaid = trades.reduce((s, t) => s + t.fee, 0)

    return NextResponse.json({
      series,
      summary: {
        startValue,
        currentValue: Math.round(currentValue),
        totalPnl: Math.round(totalPnl),
        totalPnlPct: Math.round(totalPnlPct * 100) / 100,
        tradeCount: trades.length,
        txCount: walletTx.length,
        feesPaid,
      },
    })
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Unknown error' },
      { status: 500 }
    )
  }
}
