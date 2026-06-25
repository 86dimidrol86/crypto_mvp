'use client'

import { useAppStore } from '@/lib/store'
import { translate, type Locale } from '@/lib/i18n'

export function useI18n() {
  const locale = useAppStore((s) => s.locale)
  const setLocale = useAppStore((s) => s.setLocale)
  const t = (key: string) => translate(key, locale)
  return { t, locale, setLocale }
}

export type { Locale }
