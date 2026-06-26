'use client'

import { useState } from 'react'
import { Bell } from 'lucide-react'
import { useAppStore } from '@/lib/store'
import { useI18n } from '@/lib/use-i18n'
import { Button } from '@/components/ui/button'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { ScrollArea } from '@/components/ui/scroll-area'
import { cn } from '@/lib/utils'
import { timeAgo } from '@/lib/format'

export function NotificationsBell() {
  const notifications = useAppStore((s) => s.notifications)
  const markRead = useAppStore((s) => s.markNotificationsRead)
  const { t } = useI18n()
  const [open, setOpen] = useState(false)
  const unread = notifications.filter((n) => !n.read).length

  return (
    <Popover open={open} onOpenChange={(o) => { setOpen(o); if (o) setTimeout(markRead, 1500) }}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="w-5 h-5" />
          {unread > 0 && (
            <span className="absolute top-1 right-1 w-4 h-4 rounded-full bg-destructive text-destructive-foreground text-[9px] font-bold flex items-center justify-center">
              {unread > 9 ? '9+' : unread}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0" align="end">
        <div className="flex items-center justify-between px-4 py-3 border-b border-border">
          <span className="font-semibold text-sm">{t('notif.title')}</span>
          {unread > 0 && (
            <span className="text-[10px] text-muted-foreground">{unread} {t('notif.unread')}</span>
          )}
        </div>
        <ScrollArea className="h-80">
          {notifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-40 text-center px-4">
              <Bell className="w-6 h-6 text-muted-foreground/40 mb-2" />
              <p className="text-xs text-muted-foreground">{t('notif.empty')}</p>
            </div>
          ) : (
            <div className="flex flex-col">
              {notifications.map((n) => (
                <div
                  key={n.id}
                  className={cn(
                    'px-4 py-3 border-b border-border/50 hover:bg-muted/40 transition cursor-default',
                    !n.read && 'bg-primary/5'
                  )}
                >
                  <div className="flex items-start justify-between gap-2">
                    <span className="text-sm font-medium">{n.title}</span>
                    <span className="text-[10px] text-muted-foreground shrink-0">{n.time}</span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">{n.body}</p>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
      </PopoverContent>
    </Popover>
  )
}
