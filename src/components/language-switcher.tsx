'use client'

import { Globe } from 'lucide-react'
import { useI18n } from '@/lib/use-i18n'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from '@/components/ui/dropdown-menu'
import { cn } from '@/lib/utils'

export function LanguageSwitcher() {
  const { locale, setLocale } = useI18n()
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="h-9 w-9 relative" title="Language / Язык">
          <Globe className="w-[18px] h-[18px]" />
          <span className="absolute -bottom-0.5 -right-0.5 text-[8px] font-bold bg-primary text-primary-foreground rounded px-0.5 leading-tight">
            {locale.toUpperCase()}
          </span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-36">
        <DropdownMenuItem
          onClick={() => setLocale('ru')}
          className={cn('gap-2 cursor-pointer', locale === 'ru' && 'bg-primary/10')}
        >
          <span className="text-base">🇷🇺</span>
          <span className="flex-1">Русский</span>
          {locale === 'ru' && <span className="text-primary text-xs">✓</span>}
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() => setLocale('en')}
          className={cn('gap-2 cursor-pointer', locale === 'en' && 'bg-primary/10')}
        >
          <span className="text-base">🇬🇧</span>
          <span className="flex-1">English</span>
          {locale === 'en' && <span className="text-primary text-xs">✓</span>}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
