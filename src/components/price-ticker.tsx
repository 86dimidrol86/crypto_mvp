'use client'

import { useEffect, useState } from 'react'
import { TrendingUp, TrendingDown } from 'lucide-react'
import { fetchTickers } from '@/lib/market'
import type { CoinTicker } from '@/lib/types'
import { formatPrice } from '@/lib/format'
import { useAppStore } from '@/lib/store'
import { cn } from '@/lib/utils'
import { useMounted } from '@/lib/use-mounted'

export function PriceTicker() {
  const [tickers, setTickers] = useState<CoinTicker[]>([])
  const currency = useAppStore((s) => s.currency)
  const setCurrency = useAppStore((s) => s.setCurrency)
  const setSelectedPair = useAppStore((s) => s.setSelectedPair)
  const setView = useAppStore((s) => s.setView)
  const mounted = useMounted()

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

  // placeholder пока загружаются
  const display = tickers.length > 0 ? tickers : []
  // дублируем 3x для бесшовного marquee
  const items = display.length > 0 ? [...display, ...display, ...display] : []

  return (
    <div className="flex items-center w-full h-full">
      {/* RUB/USD табы */}
      <div className="flex items-center gap-0.5 mr-2 shrink-0 bg-muted/40 rounded-md p-0.5">
        <button
          onClick={() => setCurrency('rub')}
          className={cn(
            'px-2 py-0.5 rounded text-[10px] font-bold transition',
            currency === 'rub' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground'
          )}
        >
          ₽
        </button>
        <button
          onClick={() => setCurrency('usd')}
          className={cn(
            'px-2 py-0.5 rounded text-[10px] font-bold transition',
            currency === 'usd' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground'
          )}
        >
          $
        </button>
      </div>

      {/* Marquee */}
      <div className="relative flex-1 overflow-hidden">
        {items.length > 0 ? (
          <div
            className="flex gap-5 whitespace-nowrap will-change-transform"
            style={{ animation: 'rc-ticker 80s linear infinite' }}
          >
            {items.map((t, i) => {
              const price = currency === 'rub' ? t.priceRub : t.priceUsd
              const up = t.change24h >= 0
              return (
                <button
                  key={`${t.symbol}-${i}`}
                  onClick={() => {
                    setSelectedPair(`${t.symbol}/RUB`)
                    setView('trade')
                  }}
                  className="flex items-center gap-1.5 shrink-0 hover:opacity-80 transition py-0.5"
                  title={`${t.name} • перейти к торгам`}
                >
                  <span className="text-[11px] font-bold text-foreground/90">{t.symbol}</span>
                  <span className="text-[11px] font-mono tabular-nums text-muted-foreground">
                    {mounted && price > 0 ? formatPrice(price, currency) : '—'}
                  </span>
                  <span className={cn('flex items-center gap-0.5 text-[10px] font-medium', up ? 'text-success' : 'text-destructive')}>
                    {up ? <TrendingUp className="w-2.5 h-2.5" /> : <TrendingDown className="w-2.5 h-2.5" />}
                    {Math.abs(t.change24h).toFixed(1)}%
                  </span>
                  <span className="text-muted-foreground/30 ml-1">|</span>
                </button>
              )
            })}
          </div>
        ) : (
          <div className="flex items-center gap-2 text-[11px] text-muted-foreground py-0.5">
            <span className="inline-block w-2 h-2 rounded-full bg-primary/40 animate-pulse" />
            Загрузка котировок…
          </div>
        )}
      </div>
      <style jsx>{`
        @keyframes rc-ticker {
          0% { transform: translateX(0); }
          100% { transform: translateX(-33.333%); }
        }
      `}</style>
    </div>
  )
}
