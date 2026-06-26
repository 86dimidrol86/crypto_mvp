// Утилиты форматирования

export function formatPrice(price: number, currency: 'rub' | 'usd' = 'rub'): string {
  const symbol = currency === 'rub' ? '₽' : '$'
  if (price >= 1_000_000) {
    return `${(price / 1_000_000).toFixed(2)}M ${symbol}`
  }
  if (price >= 1000) {
    return `${Math.round(price).toLocaleString('ru-RU')} ${symbol}`
  }
  if (price >= 1) {
    return `${price.toLocaleString('ru-RU', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${symbol}`
  }
  return `${price.toLocaleString('ru-RU', { minimumFractionDigits: 4, maximumFractionDigits: 6 })} ${symbol}`
}

export function formatNumber(n: number, maxDigits = 2): string {
  return n.toLocaleString('ru-RU', { minimumFractionDigits: 0, maximumFractionDigits: maxDigits })
}

export function formatAmount(amount: number, asset: string): string {
  if (['BTC', 'ETH', 'SOL', 'BNB', 'AVAX', 'XRP', 'ADA', 'DOGE'].includes(asset)) {
    const decimals = amount < 1 ? 6 : 4
    return `${amount.toLocaleString('ru-RU', { minimumFractionDigits: decimals, maximumFractionDigits: decimals })} ${asset}`
  }
  return `${amount.toLocaleString('ru-RU', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${asset}`
}

export function formatPercent(n: number): string {
  const sign = n >= 0 ? '+' : ''
  return `${sign}${n.toFixed(2)}%`
}

export function formatTime(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date
  return d.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })
}

export function formatDateTime(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date
  return d.toLocaleString('ru-RU', {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export function timeAgo(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date
  const seconds = Math.floor((Date.now() - d.getTime()) / 1000)
  if (seconds < 60) return 'только что'
  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) return `${minutes} мин назад`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours} ч назад`
  const days = Math.floor(hours / 24)
  return `${days} дн назад`
}
