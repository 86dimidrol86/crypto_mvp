'use client'

import { useEffect, useState } from 'react'
import { TrendingUp, TrendingDown } from 'lucide-react'
import { fetchTickers, COINS } from '@/lib/market'
import type { CoinTicker } from '@/lib/types'
import { formatPrice } from '@/lib/format'
import { cn } from '@/lib/utils'

export function PriceTicker() {
  const [tickers, setTickers] = useState<CoinTicker[]>([])
  const [currency, setCurrency] = useState<'rub' | 'usd'>('rub')

  useEffect(() => {
    let mounted = true
    const load = async () => {
      const t = await fetchTickers()
      if (mounted) setTickers(t)
    }
    load()
    const interval = setInterval(load, 15000)
    return () => {
      mounted = false
      clearInterval(interval)
    }
  }, [])

  const display = tickers.length > 0 ? tickers : COINS.map((c) => ({
    id: c.symbol.toLowerCase(),
    symbol: c.symbol,
    name: c.name,
    priceUsd: 0,
    priceRub: 0,
    change24h: 0,
  }))

  return (
    <div className="flex items-center gap-1 overflow-x-auto scrollbar-thin w-full">
      <div className="flex items-center gap-1 mr-2 shrink-0">
        <button
          onClick={() => setCurrency('rub')}
          className={cn(
            'px-2 py-0.5 rounded-md text-[11px] font-semibold transition',
            currency === 'rub' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground'
          )}
        >
          RUB
        </button>
        <button
          onClick={() => setCurrency('usd')}
          className={cn(
            'px-2 py-0.5 rounded-md text-[11px] font-semibold transition',
            currency === 'usd' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground'
          )}
        >
          USD
        </button>
      </div>
      {display.slice(0, 6).map((t) => {
        const price = currency === 'rub' ? t.priceRub : t.priceUsd
        const up = t.change24h >= 0
        return (
          <div
            key={t.symbol}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg hover:bg-muted/60 transition shrink-0"
          >
            <span className="text-[11px] font-semibold text-muted-foreground">{t.symbol}</span>
            <span className="text-[11px] font-mono tabular-nums">
              {price > 0 ? formatPrice(price, currency) : '—'}
            </span>
            <span className={cn('flex items-center text-[10px]', up ? 'text-success' : 'text-destructive')}>
              {up ? <TrendingUp className="w-2.5 h-2.5" /> : <TrendingDown className="w-2.5 h-2.5" />}
              {Math.abs(t.change24h).toFixed(1)}%
            </span>
          </div>
        )
      })}
    </div>
  )
}
