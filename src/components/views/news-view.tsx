'use client'

import { useMemo, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Newspaper,
  Search,
  Pin,
  ExternalLink,
  Building2,
  TrendingUp,
  Server,
  Handshake,
  Clock,
} from 'lucide-react'
import { useAppStore } from '@/lib/store'
import type { NewsCategory, NewsItem } from '@/lib/types'
import { timeAgo, formatDateTime } from '@/lib/format'
import { cn } from '@/lib/utils'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'

type FilterTab = 'all' | NewsCategory

const CATEGORY_CONFIG: Record<
  NewsCategory,
  { icon: React.ComponentType<{ className?: string }>; classes: string; dot: string }
> = {
  Регуляторика: {
    icon: Building2,
    classes: 'bg-amber-500/15 text-amber-500 border-amber-500/30',
    dot: 'bg-amber-500',
  },
  Рынок: {
    icon: TrendingUp,
    classes: 'bg-success/15 text-success border-success/30',
    dot: 'bg-success',
  },
  Платформа: {
    icon: Server,
    classes: 'bg-primary/15 text-primary border-primary/30',
    dot: 'bg-primary',
  },
  Партнёрство: {
    icon: Handshake,
    classes: 'bg-violet-500/15 text-violet-400 border-violet-500/30',
    dot: 'bg-violet-500',
  },
}

function CategoryBadge({ category }: { category: NewsCategory }) {
  const cfg = CATEGORY_CONFIG[category]
  const Icon = cfg.icon
  return (
    <Badge
      variant="outline"
      className={cn('gap-1 px-2 py-0.5 text-[10px] font-semibold', cfg.classes)}
    >
      <Icon className="w-3 h-3" />
      {category}
    </Badge>
  )
}

function NewsCard({ item, featured = false }: { item: NewsItem; featured?: boolean }) {
  const cfg = CATEGORY_CONFIG[item.category]
  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      transition={{ duration: 0.22, ease: 'easeOut' }}
    >
      <Card
        className={cn(
          'group relative overflow-hidden transition-colors',
          featured ? 'p-5 md:p-6' : 'p-4 hover:bg-muted/40'
        )}
      >
        {featured && (
          <div
            className={cn(
              'absolute inset-x-0 top-0 h-1 bg-gradient-to-r',
              item.category === 'Регуляторика' && 'from-amber-500/0 via-amber-500/80 to-amber-500/0',
              item.category === 'Рынок' && 'from-success/0 via-success/80 to-success/0',
              item.category === 'Платформа' && 'from-primary/0 via-primary/80 to-primary/0',
              item.category === 'Партнёрство' && 'from-violet-500/0 via-violet-500/80 to-violet-500/0'
            )}
          />
        )}
        <div className="flex flex-col gap-2">
          <div className="flex flex-wrap items-center gap-2">
            <CategoryBadge category={item.category} />
            {item.pinned && (
              <Badge variant="outline" className="gap-1 px-2 py-0.5 text-[10px] text-primary border-primary/30 bg-primary/5">
                <Pin className="w-3 h-3" />
                Закреплено
              </Badge>
            )}
            <span className="ml-auto flex items-center gap-1 text-[11px] text-muted-foreground">
              <Clock className="w-3 h-3" />
              {timeAgo(item.publishedAt)}
            </span>
          </div>

          <h3
            className={cn(
              'font-bold tracking-tight leading-snug',
              featured ? 'text-xl md:text-2xl' : 'text-base'
            )}
          >
            {item.title}
          </h3>

          <p
            className={cn(
              'text-muted-foreground leading-relaxed',
              featured ? 'text-sm md:text-[15px]' : 'text-[13px]'
            )}
          >
            {item.summary}
          </p>

          {featured && item.body && (
            <div className="mt-1 border-l-2 border-border pl-3 text-[13px] text-muted-foreground/90 leading-relaxed">
              {item.body}
            </div>
          )}

          <div className="flex items-center justify-between gap-2 mt-1">
            <div className="flex items-center gap-2">
              <span className={cn('w-1.5 h-1.5 rounded-full', cfg.dot)} />
              <span className="text-[11px] text-muted-foreground">{item.source}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] text-muted-foreground/70 font-mono tabular-nums">
                {formatDateTime(item.publishedAt)}
              </span>
              {item.url && (
                <a
                  href={item.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[11px] text-primary hover:underline inline-flex items-center gap-1"
                >
                  Читать <ExternalLink className="w-3 h-3" />
                </a>
              )}
            </div>
          </div>
        </div>
      </Card>
    </motion.div>
  )
}

export function NewsView() {
  const newsItems = useAppStore((s) => s.newsItems)
  const [tab, setTab] = useState<FilterTab>('all')
  const [query, setQuery] = useState('')

  const pinned = useMemo(() => newsItems.filter((n) => n.pinned), [newsItems])

  const filtered = useMemo(() => {
    let r = newsItems.filter((n) => !n.pinned)
    if (tab !== 'all') r = r.filter((n) => n.category === tab)
    if (query.trim()) {
      const q = query.trim().toLowerCase()
      r = r.filter(
        (n) =>
          n.title.toLowerCase().includes(q) ||
          n.summary.toLowerCase().includes(q) ||
          n.source.toLowerCase().includes(q)
      )
    }
    return r
  }, [newsItems, tab, query, pinned])

  const counts = useMemo(() => {
    const base = newsItems.filter((n) => !n.pinned)
    return {
      all: base.length,
      Регуляторика: base.filter((n) => n.category === 'Регуляторика').length,
      Рынок: base.filter((n) => n.category === 'Рынок').length,
      Платформа: base.filter((n) => n.category === 'Платформа').length,
      Партнёрство: base.filter((n) => n.category === 'Партнёрство').length,
    }
  }, [newsItems])

  return (
    <div className="flex-1 bg-background">
      <div className="mx-auto max-w-[1200px] px-4 lg:px-6 py-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-primary/15 text-primary flex items-center justify-center">
              <Newspaper className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight">Новости и анонсы</h1>
              <p className="text-xs text-muted-foreground mt-0.5">
                Регуляторика · Рынок · Платформа · Партнёрство — {newsItems.length} материалов
              </p>
            </div>
          </div>
          <div className="relative w-full sm:w-80">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Поиск по новостям…"
              className="pl-9 h-9"
            />
          </div>
        </div>

        {/* Filter tabs */}
        <Tabs value={tab} onValueChange={(v) => setTab(v as FilterTab)} className="mb-5">
          <TabsList className="h-9 flex-wrap">
            <TabsTrigger value="all" className="gap-1.5">
              Все <span className="text-[10px] text-muted-foreground font-mono">{counts.all}</span>
            </TabsTrigger>
            <TabsTrigger value="Регуляторика" className="gap-1.5">
              Регуляторика <span className="text-[10px] text-muted-foreground font-mono">{counts.Регуляторика}</span>
            </TabsTrigger>
            <TabsTrigger value="Рынок" className="gap-1.5">
              Рынок <span className="text-[10px] text-muted-foreground font-mono">{counts.Рынок}</span>
            </TabsTrigger>
            <TabsTrigger value="Платформа" className="gap-1.5">
              Платформа <span className="text-[10px] text-muted-foreground font-mono">{counts.Платформа}</span>
            </TabsTrigger>
            <TabsTrigger value="Партнёрство" className="gap-1.5">
              Партнёрство <span className="text-[10px] text-muted-foreground font-mono">{counts.Партнёрство}</span>
            </TabsTrigger>
          </TabsList>
        </Tabs>

        {/* Featured pinned news */}
        {pinned.length > 0 && tab === 'all' && !query.trim() && (
          <div className="grid gap-3 mb-5">
            {pinned.map((item) => (
              <NewsCard key={item.id} item={item} featured />
            ))}
          </div>
        )}

        {/* News feed */}
        {filtered.length === 0 ? (
          <Card className="p-12 text-center">
            <Newspaper className="w-8 h-8 mx-auto text-muted-foreground/40 mb-2" />
            <p className="text-sm text-muted-foreground">Ничего не найдено по запросу</p>
          </Card>
        ) : (
          <div className="grid gap-3 md:grid-cols-2">
            <AnimatePresence mode="popLayout">
              {filtered.map((item) => (
                <NewsCard key={item.id} item={item} />
              ))}
            </AnimatePresence>
          </div>
        )}

        {/* Footer */}
        <div className="mt-6 flex items-center justify-center gap-2 text-[11px] text-muted-foreground">
          <Badge variant="outline" className="border-border text-muted-foreground">
            <Newspaper className="w-3 h-3 mr-1" /> Демо-лента РусКрипто
          </Badge>
          <span>•</span>
          <span>Источник: внутренние анонсы и публичные пресс-релизы</span>
        </div>
      </div>
    </div>
  )
}
