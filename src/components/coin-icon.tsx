'use client'

import { useState } from 'react'
import { cn } from '@/lib/utils'

interface CoinIconProps {
  symbol: string
  size?: number
  className?: string
}

export function CoinIcon({ symbol, size = 32, className }: CoinIconProps) {
  const [errored, setErrored] = useState(false)
  const url = `https://raw.githubusercontent.com/spothq/cryptocurrency-icons/master/128/color/${symbol.toLowerCase()}.png`
  if (errored) {
    return (
      <div
        className={cn(
          'rounded-full bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center font-bold text-black shrink-0',
          className
        )}
        style={{ width: size, height: size, fontSize: size * 0.4 }}
      >
        {symbol.slice(0, 1)}
      </div>
    )
  }
  return (
    <img
      src={url}
      alt={symbol}
      width={size}
      height={size}
      className={cn('rounded-full shrink-0', className)}
      onError={() => setErrored(true)}
    />
  )
}
