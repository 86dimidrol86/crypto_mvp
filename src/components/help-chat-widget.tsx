'use client'

import { useEffect, useRef, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { HelpCircle, X, Send, Bot, User, Sparkles } from 'lucide-react'
import { toast } from 'sonner'
import { useI18n } from '@/lib/use-i18n'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

interface ChatMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
  ts: number
}

const SUGGESTIONS = [
  { ru: 'Что такое спот-торги?', en: 'What is spot trading?' },
  { ru: 'Как открыть маржу?', en: 'How do I open a margin position?' },
  { ru: 'Как вывести средства?', en: 'How do I withdraw funds?' },
  { ru: 'Что такое AML?', en: 'What is AML?' },
]

// Минимальный markdown-рендерер: **bold**, списки (- или 1.), абзацы.
function renderMarkdown(text: string): React.ReactNode {
  const lines = text.split('\n')
  const out: React.ReactNode[] = []
  let listBuffer: React.ReactNode[] = []
  let listType: 'ul' | 'ol' | null = null
  let key = 0

  const flushList = () => {
    if (listBuffer.length === 0) return
    if (listType === 'ul') {
      out.push(
        <ul key={`ul-${key++}`} className="list-disc pl-4 my-1 space-y-0.5">
          {listBuffer}
        </ul>
      )
    } else if (listType === 'ol') {
      out.push(
        <ol key={`ol-${key++}`} className="list-decimal pl-4 my-1 space-y-0.5">
          {listBuffer}
        </ol>
      )
    }
    listBuffer = []
    listType = null
  }

  for (const raw of lines) {
    const line = raw.trimEnd()
    if (!line.trim()) {
      flushList()
      continue
    }
    // ordered list
    const olMatch = line.match(/^(\d+)\.\s+(.*)$/)
    const ulMatch = line.match(/^[-*]\s+(.*)$/)

    if (olMatch) {
      if (listType && listType !== 'ol') flushList()
      listType = 'ol'
      listBuffer.push(<li key={`li-${key++}`}>{renderInline(olMatch[2])}</li>)
      continue
    }
    if (ulMatch) {
      if (listType && listType !== 'ul') flushList()
      listType = 'ul'
      listBuffer.push(<li key={`li-${key++}`}>{renderInline(ulMatch[1])}</li>)
      continue
    }
    flushList()
    out.push(
      <p key={`p-${key++}`} className="my-0.5 leading-relaxed">
        {renderInline(line)}
      </p>
    )
  }
  flushList()
  return out
}

// inline: **bold** → <strong>
function renderInline(text: string): React.ReactNode {
  const parts = text.split(/(\*\*[^*]+\*\*)/g)
  return parts.map((p, i) => {
    if (p.startsWith('**') && p.endsWith('**') && p.length > 4) {
      return (
        <strong key={i} className="font-semibold text-foreground">
          {p.slice(2, -2)}
        </strong>
      )
    }
    return <span key={i}>{p}</span>
  })
}

export function HelpChatWidget() {
  const { locale } = useI18n()
  const [open, setOpen] = useState(false)
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'greet',
      role: 'assistant',
      ts: Date.now(),
      content:
        locale === 'ru'
          ? 'Здравствуйте! Я ИИ-консультант РусКрипто. Помогу разобраться с платформой — спот, маржа, P2P, кошелёк, KYC и комплаенс. Задайте вопрос или выберите подсказку ниже.'
          : 'Hello! I am the RusKripto AI assistant. I can help with the platform — spot, margin, P2P, wallet, KYC and compliance. Ask a question or pick a suggestion below.',
    },
  ])
  const scrollRef = useRef<HTMLDivElement>(null)

  // Перепрокрутка вниз при новых сообщениях / изменении loading
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [messages, loading, open])

  const send = async (text: string) => {
    const trimmed = text.trim()
    if (!trimmed || loading) return

    const userMsg: ChatMessage = {
      id: `u-${Date.now()}`,
      role: 'user',
      content: trimmed,
      ts: Date.now(),
    }
    const history = messages
      .filter((m) => m.id !== 'greet')
      .map((m) => ({ role: m.role, content: m.content }))

    setMessages((prev) => [...prev, userMsg])
    setInput('')
    setLoading(true)

    try {
      const res = await fetch('/api/help/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: trimmed, locale, history }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data?.error || `HTTP ${res.status}`)
      const answer: string = data.answer || ''
      setMessages((prev) => [
        ...prev,
        {
          id: `a-${Date.now()}`,
          role: 'assistant',
          content: answer,
          ts: Date.now(),
        },
      ])
    } catch (e) {
      const errMsg = e instanceof Error ? e.message : 'Unknown error'
      setMessages((prev) => [
        ...prev,
        {
          id: `e-${Date.now()}`,
          role: 'assistant',
          content:
            locale === 'ru'
              ? `**Не удалось получить ответ.** Попробуйте позже.\n\n_Техническая ошибка: ${errMsg}_`
              : `**Could not get an answer.** Please try again later.\n\n_Technical error: ${errMsg}_`,
          ts: Date.now(),
        },
      ])
      toast.error(
        locale === 'ru' ? 'Ошибка ИИ-консультанта' : 'AI assistant error'
      )
    } finally {
      setLoading(false)
    }
  }

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    send(input)
  }

  const onSuggestion = (s: string) => send(s)

  const suggestions = SUGGESTIONS.map((s) => s[locale])

  return (
    <>
      {/* Floating button */}
      <motion.button
        initial={{ scale: 0, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ delay: 0.4, type: 'spring', stiffness: 260, damping: 20 }}
        whileHover={{ scale: 1.06 }}
        whileTap={{ scale: 0.94 }}
        onClick={() => setOpen((v) => !v)}
        aria-label={locale === 'ru' ? 'Открыть чат с помощником' : 'Open AI assistant'}
        className={cn(
          'fixed bottom-3 right-3 lg:bottom-4 lg:right-4 z-50',
          'w-9 h-9 lg:w-10 lg:h-10 rounded-full',
          'bg-primary text-primary-foreground shadow-md shadow-primary/20',
          'flex items-center justify-center',
          'ring-1 ring-primary/20 hover:ring-primary/40 transition-all'
        )}
      >
        <AnimatePresence mode="wait" initial={false}>
          {open ? (
            <motion.span
              key="x"
              initial={{ rotate: -90, opacity: 0 }}
              animate={{ rotate: 0, opacity: 1 }}
              exit={{ rotate: 90, opacity: 0 }}
              transition={{ duration: 0.15 }}
            >
              <X className="w-4 h-4 lg:w-[18px] lg:h-[18px]" />
            </motion.span>
          ) : (
            <motion.span
              key="help"
              initial={{ rotate: 90, opacity: 0 }}
              animate={{ rotate: 0, opacity: 1 }}
              exit={{ rotate: -90, opacity: 0 }}
              transition={{ duration: 0.15 }}
            >
              <HelpCircle className="w-4 h-4 lg:w-[18px] lg:h-[18px]" />
            </motion.span>
          )}
        </AnimatePresence>
        {!open && (
          <span className="absolute -top-0.5 -right-0.5 w-3 h-3 rounded-full bg-success ring-2 ring-background animate-pulse" />
        )}
      </motion.button>

      {/* Chat panel */}
      <AnimatePresence>
        {open && (
          <motion.div
            key="panel"
            initial={{ opacity: 0, y: 24, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 24, scale: 0.96 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
            className={cn(
              'fixed z-50 flex flex-col',
              'bg-card border border-border shadow-2xl rounded-2xl overflow-hidden',
              'bottom-20 right-3 left-3 h-[70vh] sm:left-auto sm:bottom-6 sm:right-6',
              'sm:w-[380px] sm:h-[540px]'
            )}
          >
            {/* Header */}
            <div className="flex items-center gap-2.5 px-3.5 py-3 border-b border-border bg-gradient-to-r from-primary/10 to-transparent">
              <div className="w-9 h-9 rounded-xl bg-primary/15 text-primary flex items-center justify-center shrink-0">
                <Bot className="w-5 h-5" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-sm font-bold tracking-tight leading-tight">
                  {locale === 'ru' ? 'Помощник РусКрипто' : 'RusKripto Assistant'}
                </h3>
                <p className="text-[11px] text-muted-foreground truncate">
                  {locale === 'ru' ? 'ИИ-консультант по платформе' : 'AI platform consultant'}
                </p>
              </div>
              <span className="flex items-center gap-1 text-[10px] font-medium text-success bg-success/10 border border-success/30 rounded-full px-1.5 py-0.5">
                <span className="w-1.5 h-1.5 rounded-full bg-success animate-pulse" />
                {locale === 'ru' ? 'онлайн' : 'online'}
              </span>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 text-muted-foreground hover:text-foreground shrink-0"
                onClick={() => setOpen(false)}
                aria-label={locale === 'ru' ? 'Закрыть' : 'Close'}
              >
                <X className="w-4 h-4" />
              </Button>
            </div>

            {/* Messages */}
            <div
              ref={scrollRef}
              className="flex-1 overflow-y-auto scrollbar-thin px-3 py-3 space-y-2.5 bg-background/40"
            >
              {messages.map((m) => (
                <motion.div
                  key={m.id}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.18 }}
                  className={cn(
                    'flex gap-2 max-w-[92%]',
                    m.role === 'user' ? 'ml-auto flex-row-reverse' : 'mr-auto'
                  )}
                >
                  <div
                    className={cn(
                      'w-6 h-6 rounded-md flex items-center justify-center shrink-0 mt-0.5',
                      m.role === 'user'
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-muted text-muted-foreground border border-border'
                    )}
                  >
                    {m.role === 'user' ? (
                      <User className="w-3.5 h-3.5" />
                    ) : (
                      <Bot className="w-3.5 h-3.5" />
                    )}
                  </div>
                  <div
                    className={cn(
                      'px-3 py-2 rounded-xl text-[13px] leading-relaxed',
                      m.role === 'user'
                        ? 'bg-primary text-primary-foreground rounded-tr-sm'
                        : 'bg-card border border-border text-foreground rounded-tl-sm'
                    )}
                  >
                    {m.role === 'assistant' ? renderMarkdown(m.content) : m.content}
                  </div>
                </motion.div>
              ))}

              {/* Typing indicator */}
              <AnimatePresence>
                {loading && (
                  <motion.div
                    initial={{ opacity: 0, y: 4 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -4 }}
                    className="flex gap-2 max-w-[92%] mr-auto"
                  >
                    <div className="w-6 h-6 rounded-md flex items-center justify-center shrink-0 mt-0.5 bg-muted text-muted-foreground border border-border">
                      <Bot className="w-3.5 h-3.5" />
                    </div>
                    <div className="px-3 py-2.5 rounded-xl rounded-tl-sm bg-card border border-border">
                      <div className="flex gap-1">
                        {[0, 1, 2].map((i) => (
                          <motion.span
                            key={i}
                            className="w-1.5 h-1.5 rounded-full bg-muted-foreground/70"
                            animate={{ opacity: [0.3, 1, 0.3], y: [0, -2, 0] }}
                            transition={{
                              duration: 0.8,
                              repeat: Infinity,
                              delay: i * 0.15,
                            }}
                          />
                        ))}
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Suggestions (only show before first user message) */}
              {messages.filter((m) => m.role === 'user').length === 0 && !loading && (
                <div className="pt-1.5">
                  <div className="flex items-center gap-1 text-[11px] text-muted-foreground mb-1.5 px-1">
                    <Sparkles className="w-3 h-3 text-primary" />
                    {locale === 'ru' ? 'Популярные вопросы' : 'Popular questions'}
                  </div>
                  <div className="flex flex-col gap-1.5">
                    {suggestions.map((s) => (
                      <button
                        key={s}
                        onClick={() => onSuggestion(s)}
                        className="text-left text-[12.5px] px-2.5 py-1.5 rounded-lg border border-border bg-card hover:border-primary/40 hover:bg-primary/5 text-foreground/90 transition-colors"
                      >
                        {s}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Input */}
            <form
              onSubmit={onSubmit}
              className="flex items-center gap-1.5 px-2.5 py-2 border-t border-border bg-card"
            >
              <Input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder={
                  locale === 'ru' ? 'Спросите что-нибудь…' : 'Ask anything…'
                }
                disabled={loading}
                className="h-9 text-[13px] bg-background flex-1"
                autoComplete="off"
              />
              <Button
                type="submit"
                size="icon"
                disabled={loading || !input.trim()}
                className="h-9 w-9 bg-primary text-primary-foreground hover:bg-primary/90 shrink-0"
                aria-label={locale === 'ru' ? 'Отправить' : 'Send'}
              >
                <Send className="w-4 h-4" />
              </Button>
            </form>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}
