'use client'

import { useEffect, useState } from 'react'
import { useTheme } from 'next-themes'
import { Sun, Moon } from 'lucide-react'
import { Button } from '@/components/ui/button'

export function ThemeToggle() {
  const { theme, setTheme, resolvedTheme } = useTheme()
  const [mounted, setMounted] = useState(false)

  // Avoid hydration mismatch: only render interactive state after mount.
  useEffect(() => setMounted(true), [])

  const current = mounted ? (theme === 'system' ? resolvedTheme : theme) : 'dark'
  const isDark = current === 'dark'

  const toggle = () => {
    setTheme(isDark ? 'light' : 'dark')
  }

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={toggle}
      aria-label={isDark ? 'Включить светлую тему' : 'Включить тёмную тему'}
      title={isDark ? 'Светлая тема' : 'Тёмная тема'}
      className="relative"
    >
      {mounted ? (
        isDark ? (
          <Sun className="w-[18px] h-[18px] text-primary" />
        ) : (
          <Moon className="w-[18px] h-[18px] text-foreground" />
        )
      ) : (
        <Sun className="w-[18px] h-[18px] opacity-0" />
      )}
    </Button>
  )
}
