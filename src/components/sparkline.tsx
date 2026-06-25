'use client'

import { useEffect, useState } from 'react'

interface SparklineProps {
  data: number[]
  color?: string
  width?: number
  height?: number
}

export function Sparkline({ data, color, width = 120, height = 36 }: SparklineProps) {
  const [up, setUp] = useState(true)
  useEffect(() => {
    if (data.length >= 2) setUp(data[data.length - 1] >= data[0])
  }, [data])
  const stroke = color || (up ? 'oklch(0.7 0.17 155)' : 'oklch(0.62 0.22 25)')
  if (!data || data.length < 2) {
    return <div style={{ width, height }} />
  }
  const min = Math.min(...data)
  const max = Math.max(...data)
  const range = max - min || 1
  const step = width / (data.length - 1)
  const points = data
    .map((v, i) => `${i * step},${height - ((v - min) / range) * height}`)
    .join(' ')
  const areaPoints = `0,${height} ${points} ${width},${height}`
  const gradId = `sg-${Math.random().toString(36).slice(2, 8)}`
  return (
    <svg width={width} height={height} className="overflow-visible">
      <defs>
        <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={stroke} stopOpacity="0.3" />
          <stop offset="100%" stopColor={stroke} stopOpacity="0" />
        </linearGradient>
      </defs>
      <polygon points={areaPoints} fill={`url(#${gradId})`} />
      <polyline
        points={points}
        fill="none"
        stroke={stroke}
        strokeWidth="1.5"
        strokeLinejoin="round"
        strokeLinecap="round"
      />
    </svg>
  )
}
