'use client'

import { useMemo, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  HelpCircle,
  Search,
  BookOpen,
  Lightbulb,
  ChevronRight,
  ListChecks,
  MessageCircleQuestion,
  CandlestickChart,
  TrendingUp,
  Users,
  Send,
  Wallet,
  PieChart,
  BarChart3,
  ShieldCheck,
  Scale,
  LineChart,
  Lock,
  LayoutGrid,
  Newspaper,
} from 'lucide-react'
import { useI18n } from '@/lib/use-i18n'
import {
  HELP_ARTICLES,
  HELP_SECTIONS,
  POPULAR_QUESTIONS,
  type HelpSection,
} from '@/lib/help-content'
import { cn } from '@/lib/utils'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion'

const ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  LayoutGrid,
  CandlestickChart,
  TrendingUp,
  Users,
  Send,
  Wallet,
  PieChart,
  BarChart3,
  ShieldCheck,
  Scale,
  LineChart,
  Lock,
  Newspaper,
  HelpCircle,
}

function PopularQuestions({
  locale,
}: {
  locale: 'ru' | 'en'
}) {
  const [open, setOpen] = useState<string>('popular-0')
  return (
    <Card className="p-4 lg:p-5 bg-primary/5 border-primary/20">
      <div className="flex items-center gap-2 mb-3">
        <div className="w-7 h-7 rounded-lg bg-primary/15 text-primary flex items-center justify-center">
          <Lightbulb className="w-4 h-4" />
        </div>
        <div>
          <h2 className="text-sm font-bold tracking-tight">
            {locale === 'ru' ? 'Популярные вопросы' : 'Popular questions'}
          </h2>
          <p className="text-[11px] text-muted-foreground">
            {locale === 'ru'
              ? 'Самые частые вопросы наших пользователей'
              : 'The most frequent questions from our users'}
          </p>
        </div>
      </div>
      <Accordion
        type="single"
        collapsible
        value={open}
        onValueChange={setOpen}
        className="bg-card/60 rounded-xl border border-border px-3"
      >
        {POPULAR_QUESTIONS.map((item, i) => (
          <AccordionItem key={i} value={`popular-${i}`} className="last:border-b-0">
            <AccordionTrigger className="text-[13px] font-medium hover:no-underline py-3">
              <span className="flex items-start gap-2">
                <span className="text-primary text-[11px] font-mono shrink-0 mt-0.5">
                  {String(i + 1).padStart(2, '0')}
                </span>
                <span>{item.q[locale]}</span>
              </span>
            </AccordionTrigger>
            <AccordionContent className="text-[13px] text-muted-foreground leading-relaxed">
              {item.a[locale]}
            </AccordionContent>
          </AccordionItem>
        ))}
      </Accordion>
    </Card>
  )
}

function ArticleCard({
  articleId,
  locale,
}: {
  articleId: string
  locale: 'ru' | 'en'
}) {
  const article = HELP_ARTICLES.find((a) => a.id === articleId)
  if (!article) return null
  const Icon = ICONS[
    HELP_SECTIONS.find((s) => s.id === article.section)?.icon ?? 'HelpCircle'
  ] ?? HelpCircle
  const sectionLabel =
    HELP_SECTIONS.find((s) => s.id === article.section)?.label[locale] ?? article.section

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -6 }}
      transition={{ duration: 0.2, ease: 'easeOut' }}
    >
      <Card className="overflow-hidden">
        <Accordion type="single" collapsible>
          <AccordionItem value={article.id} className="border-b-0">
            <AccordionTrigger className="px-4 py-3.5 hover:no-underline items-start">
              <div className="flex items-start gap-3 flex-1">
                <div className="w-8 h-8 shrink-0 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
                  <Icon className="w-4 h-4" />
                </div>
                <div className="flex-1 min-w-0 text-left">
                  <div className="flex flex-wrap items-center gap-2 mb-1">
                    <Badge
                      variant="outline"
                      className="text-[10px] px-1.5 py-0 font-semibold bg-primary/10 text-primary border-primary/20"
                    >
                      {sectionLabel}
                    </Badge>
                  </div>
                  <h3 className="text-sm font-bold tracking-tight leading-snug">
                    {article.title[locale]}
                  </h3>
                  <p className="text-[12px] text-muted-foreground line-clamp-2 mt-1 leading-relaxed">
                    {article.definition[locale]}
                  </p>
                </div>
              </div>
            </AccordionTrigger>
            <AccordionContent className="px-4 pb-4 pt-1">
              {/* Definition */}
              <div className="mb-3 p-3 rounded-lg bg-muted/40 border border-border/60">
                <div className="flex items-center gap-1.5 mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-primary">
                  <BookOpen className="w-3.5 h-3.5" />
                  {locale === 'ru' ? 'Определение' : 'Definition'}
                </div>
                <p className="text-[13px] text-foreground/90 leading-relaxed">
                  {article.definition[locale]}
                </p>
              </div>

              {/* How to */}
              <div className="mb-3 p-3 rounded-lg bg-card border border-border/60">
                <div className="flex items-center gap-1.5 mb-2 text-[11px] font-semibold uppercase tracking-wide text-primary">
                  <ListChecks className="w-3.5 h-3.5" />
                  {locale === 'ru' ? 'Как пользоваться' : 'How to use'}
                </div>
                <ol className="space-y-1.5">
                  {article.howTo[locale].map((step, i) => (
                    <li key={i} className="flex items-start gap-2 text-[13px] text-foreground/90 leading-relaxed">
                      <span className="shrink-0 w-5 h-5 rounded-md bg-primary/15 text-primary text-[10px] font-bold font-mono flex items-center justify-center mt-0.5">
                        {i + 1}
                      </span>
                      <span className="flex-1">{step}</span>
                    </li>
                  ))}
                </ol>
              </div>

              {/* FAQ */}
              {article.faq.length > 0 && (
                <div className="p-3 rounded-lg bg-card border border-border/60">
                  <div className="flex items-center gap-1.5 mb-2 text-[11px] font-semibold uppercase tracking-wide text-primary">
                    <MessageCircleQuestion className="w-3.5 h-3.5" />
                    {locale === 'ru' ? 'Частые вопросы' : 'FAQ'}
                  </div>
                  <div className="space-y-2.5">
                    {article.faq.map((f, i) => (
                      <div key={i} className="border-l-2 border-primary/30 pl-2.5">
                        <p className="text-[12.5px] font-semibold text-foreground leading-snug">
                          {f.q[locale]}
                        </p>
                        <p className="text-[12px] text-muted-foreground mt-0.5 leading-relaxed">
                          {f.a[locale]}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      </Card>
    </motion.div>
  )
}

export function HelpView() {
  const { locale } = useI18n()
  const [section, setSection] = useState<HelpSection | 'all'>('all')
  const [query, setQuery] = useState('')

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    return HELP_ARTICLES.filter((a) => {
      if (section !== 'all' && a.section !== section) return false
      if (!q) return true
      return (
        a.title.ru.toLowerCase().includes(q) ||
        a.title.en.toLowerCase().includes(q) ||
        a.definition.ru.toLowerCase().includes(q) ||
        a.definition.en.toLowerCase().includes(q) ||
        a.faq.some(
          (f) =>
            f.q.ru.toLowerCase().includes(q) ||
            f.q.en.toLowerCase().includes(q) ||
            f.a.ru.toLowerCase().includes(q) ||
            f.a.en.toLowerCase().includes(q)
        ) ||
        a.howTo.ru.some((s) => s.toLowerCase().includes(q)) ||
        a.howTo.en.some((s) => s.toLowerCase().includes(q))
      )
    })
  }, [section, query])

  const counts = useMemo(() => {
    const base: Record<string, number> = { all: HELP_ARTICLES.length }
    for (const s of HELP_SECTIONS) {
      if (s.id === 'all') continue
      base[s.id] = HELP_ARTICLES.filter((a) => a.section === s.id).length
    }
    return base
  }, [])

  const visibleSections = HELP_SECTIONS.filter((s) => s.id === 'all' || counts[s.id] > 0)

  return (
    <div className="flex-1 bg-background">
      <div className="mx-auto max-w-[1200px] px-3 lg:px-5 py-4">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 mb-4">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-primary/15 text-primary flex items-center justify-center">
              <HelpCircle className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight">
                {locale === 'ru' ? 'Справочный центр' : 'Help Center'}
              </h1>
              <p className="text-xs text-muted-foreground mt-0.5">
                {locale === 'ru'
                  ? `Документация платформы РусКрипто • ${HELP_ARTICLES.length} статей`
                  : `RusKripto platform documentation • ${HELP_ARTICLES.length} articles`}
              </p>
            </div>
          </div>
          <div className="relative w-full sm:w-80">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={locale === 'ru' ? 'Поиск по статьям и вопросам…' : 'Search articles and FAQs…'}
              className="pl-9 h-9"
            />
          </div>
        </div>

        {/* Popular questions */}
        {section === 'all' && !query.trim() && (
          <div className="mb-4">
            <PopularQuestions locale={locale} />
          </div>
        )}

        {/* Section tabs */}
        <Tabs
          value={section}
          onValueChange={(v) => setSection(v as HelpSection | 'all')}
          className="mb-4"
        >
          <div className="overflow-x-auto scrollbar-thin -mx-3 px-3">
            <TabsList className="h-9 flex-wrap">
              {visibleSections.map((s) => {
                const Icon = ICONS[s.icon] ?? HelpCircle
                return (
                  <TabsTrigger key={s.id} value={s.id} className="gap-1.5">
                    <Icon className="w-3.5 h-3.5" />
                    {s.label[locale]}
                    <span className="text-[10px] text-muted-foreground font-mono">
                      {counts[s.id]}
                    </span>
                  </TabsTrigger>
                )
              })}
            </TabsList>
          </div>
        </Tabs>

        {/* Articles list */}
        {filtered.length === 0 ? (
          <Card className="p-10 text-center">
            <Search className="w-8 h-8 mx-auto text-muted-foreground/40 mb-2" />
            <p className="text-sm text-muted-foreground">
              {locale === 'ru' ? 'Ничего не найдено по запросу' : 'Nothing found for your query'}
            </p>
          </Card>
        ) : (
          <div className="grid gap-2.5 lg:grid-cols-2">
            <AnimatePresence mode="popLayout">
              {filtered.map((a) => (
                <ArticleCard key={a.id} articleId={a.id} locale={locale} />
              ))}
            </AnimatePresence>
          </div>
        )}

        {/* Footer */}
        <div className="mt-4 flex items-center justify-center gap-2 text-[11px] text-muted-foreground">
          <Badge variant="outline" className="border-border text-muted-foreground gap-1">
            <HelpCircle className="w-3 h-3" />
            {locale === 'ru' ? 'Не нашли ответ?' : "Didn't find an answer?"}
          </Badge>
          <span>
            {locale === 'ru'
              ? 'Нажмите кнопку чата в правом нижнем углу — ИИ-помощник ответит 24/7'
              : 'Click the chat button in the bottom-right corner — AI assistant is online 24/7'}
          </span>
          <ChevronRight className="w-3 h-3 text-primary" />
        </div>
      </div>
    </div>
  )
}
