'use client'

import { useEffect, useState } from 'react'

// Хук для предотвращения hydration mismatch при рендере
// зависящих от времени/окружения значений (Date.now(), localStorage и т.д.)
export function useMounted() {
  const [mounted, setMounted] = useState(false)
  useEffect(() => {
    setMounted(true)
  }, [])
  return mounted
}
