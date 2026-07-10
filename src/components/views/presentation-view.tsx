'use client'

import { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  ChevronLeft, ChevronRight, ArrowRight, ArrowDown, CheckCircle2,
  Landmark, Building2, Users, Wallet, TrendingUp, Scale, Zap,
  AlertCircle, Sparkles,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card } from '@/components/ui/card'
import { cn } from '@/lib/utils'

// ─── Slides ──────────────────────────────────────────────────────────────────
const SLIDES = [
  // 1. Title
  {
    id: 'title',
    render: () => (
      <div className="flex flex-col items-center justify-center min-h-[70vh] text-center">
        <motion.div
          initial={{ scale: 0, rotate: -180 }}
          animate={{ scale: 1, rotate: 0 }}
          transition={{ type: 'spring', duration: 1.2, bounce: 0.4 }}
          className="w-20 h-20 rounded-3xl bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center text-4xl font-black text-black shadow-2xl shadow-amber-500/30 mb-6"
        >₿</motion.div>
        <motion.h1 initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }} className="text-4xl lg:text-6xl font-bold tracking-tight mb-3">РусКрипто</motion.h1>
        <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.6 }} className="text-lg lg:text-xl text-primary mb-1">Легальная криптобиржа Российской Федерации</motion.p>
        <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.8 }} className="text-sm text-muted-foreground max-w-xl mb-6">
          ФЗ № 259-ФЗ «О ЦФА» • ФЗ № 1194918-8 «О цифровой валюте» • ФЗ № 115 «О ПОД/ФТ» • Платформа цифрового рубля ЦБ РФ
        </motion.p>
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 1 }} className="flex gap-3">
          <Badge variant="outline" className="border-primary/40 text-primary gap-1.5 px-4 py-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-success animate-pulse" /> MVP v2.0 • Июль 2026
          </Badge>
        </motion.div>
      </div>
    ),
  },

  // 2. Money flow scheme
  {
    id: 'scheme',
    render: () => (
      <div>
        <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-xl bg-primary/15 flex items-center justify-center"><TrendingUp className="w-5 h-5 text-primary" /></div>
          <h2 className="text-2xl lg:text-3xl font-bold">Трафик денег и комиссии</h2>
        </motion.div>

        {/* SVG flow diagram */}
        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.2 }}>
          <Card className="p-6 overflow-x-auto">
            <div className="min-w-[700px]">
              {/* Row 1: User → Bank → Exchange */}
              <div className="flex items-center justify-between gap-2 mb-2">
                {/* User */}
                <motion.div initial={{ opacity: 0, x: -30 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.3 }} className="flex flex-col items-center text-center w-28">
                  <div className="w-14 h-14 rounded-2xl bg-sky-500/15 flex items-center justify-center mb-1.5"><Users className="w-7 h-7 text-sky-400" /></div>
                  <div className="text-xs font-semibold">Пользователь</div>
                  <div className="text-[10px] text-muted-foreground">Личный счёт</div>
                </motion.div>

                {/* Arrow 1: User → Bank */}
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.4 }} className="flex flex-col items-center flex-1">
                  <div className="text-[10px] text-primary font-semibold mb-0.5">1. Перевод ₽</div>
                  <div className="flex items-center w-full">
                    <div className="flex-1 h-0.5 bg-primary/30" />
                    <ArrowRight className="w-5 h-5 text-primary shrink-0" />
                  </div>
                  <div className="text-[9px] text-muted-foreground mt-0.5">банк: 0.5-1%</div>
                </motion.div>

                {/* Bank */}
                <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }} className="flex flex-col items-center text-center w-28">
                  <div className="w-14 h-14 rounded-2xl bg-amber-500/15 flex items-center justify-center mb-1.5"><Building2 className="w-7 h-7 text-amber-400" /></div>
                  <div className="text-xs font-semibold">Банк</div>
                  <div className="text-[10px] text-muted-foreground">Спецсчёт биржи</div>
                </motion.div>

                {/* Arrow 2: Bank → Exchange */}
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.6 }} className="flex flex-col items-center flex-1">
                  <div className="text-[10px] text-primary font-semibold mb-0.5">2. Конвертация ₽→ЦР</div>
                  <div className="flex items-center w-full">
                    <div className="flex-1 h-0.5 bg-primary/30" />
                    <ArrowRight className="w-5 h-5 text-primary shrink-0" />
                  </div>
                  <div className="text-[9px] text-muted-foreground mt-0.5">ЦБ РФ: цифровой ₽</div>
                </motion.div>

                {/* Exchange */}
                <motion.div initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.7 }} className="flex flex-col items-center text-center w-28">
                  <div className="w-14 h-14 rounded-2xl bg-primary/15 flex items-center justify-center mb-1.5"><Landmark className="w-7 h-7 text-primary" /></div>
                  <div className="text-xs font-semibold">Биржа</div>
                  <div className="text-[10px] text-muted-foreground">Спот-торги</div>
                </motion.div>
              </div>

              {/* AML bar */}
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.9 }} className="mt-4 p-3 rounded-xl bg-destructive/5 border border-destructive/20 flex items-center justify-center gap-3">
                <Scale className="w-4 h-4 text-destructive" />
                <span className="text-xs text-muted-foreground">
                  <b>AML-контроль (115-ФЗ)</b> на каждом этапе: банк → биржа → ЦБ РФ → Росфинмониторинг
                </span>
              </motion.div>

              {/* Row 2: Revenue split */}
              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 1.1 }} className="mt-4 grid grid-cols-3 gap-3">
                <div className="text-center p-3 rounded-xl bg-amber-500/5 border border-amber-500/20">
                  <div className="text-2xl font-bold text-amber-400">0.5-1%</div>
                  <div className="text-[10px] text-muted-foreground">Банк<br/>за перевод ₽</div>
                </div>
                <div className="text-center p-3 rounded-xl bg-primary/5 border border-primary/20">
                  <div className="text-2xl font-bold text-primary">0.1-0.5%</div>
                  <div className="text-[10px] text-muted-foreground">Биржа<br/>за торговлю</div>
                </div>
                <div className="text-center p-3 rounded-xl bg-success/5 border border-success/20">
                  <div className="text-2xl font-bold text-success">0.5-1.5%</div>
                  <div className="text-[10px] text-muted-foreground">Биржа+Банк<br/>за вывод</div>
                </div>
              </motion.div>
            </div>
          </Card>
        </motion.div>

        <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1.3 }} className="text-xs text-muted-foreground text-center mt-3">
          Пользователь переводит рубли на спецсчёт биржи в банке → банк конвертирует ₽ в цифровой рубль (ЦБ РФ) → зачисление на биржу → торговля → вывод через банк обратно в ₽
        </motion.p>
      </div>
    ),
  },

  // 3. Bank revenue model
  {
    id: 'revenue',
    render: () => (
      <div>
        <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-xl bg-amber-500/15 flex items-center justify-center"><Building2 className="w-5 h-5 text-amber-400" /></div>
          <h2 className="text-2xl lg:text-3xl font-bold">Заработок банка</h2>
        </motion.div>

        <div className="grid lg:grid-cols-2 gap-4">
          {/* Input flow */}
          <motion.div initial={{ opacity: 0, x: -30 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.2 }}>
            <Card className="p-6 h-full">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-8 h-8 rounded-lg bg-success/15 flex items-center justify-center"><ArrowDown className="w-4 h-4 text-success" /></div>
                <h3 className="font-bold">Ввод средств (₽ → Биржа)</h3>
              </div>
              <div className="space-y-3">
                {[
                  { step: '1', title: 'Перевод ₽ на спецсчёт', desc: 'Пользователь → спецсчёт биржи в банке', fee: '0.5-1%', who: 'Банк' },
                  { step: '2', title: 'Конвертация ₽ → Цифровой ₽', desc: 'Банк → платформа цифрового рубля ЦБ РФ (ФЗ-259)', fee: '0.1-0.3%', who: 'Банк + ЦБ' },
                  { step: '3', title: 'Зачисление на биржу', desc: 'Цифровой ₽ → баланс пользователя на бирже', fee: '—', who: 'Биржа' },
                ].map((s, i) => (
                  <motion.div key={s.step} initial={{ opacity: 0, x: -15 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.3 + i * 0.15 }} className="flex items-start gap-3 p-3 rounded-lg bg-muted/20">
                    <div className="w-6 h-6 rounded-full bg-primary/15 flex items-center justify-center text-xs font-bold text-primary shrink-0 mt-0.5">{s.step}</div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium">{s.title}</div>
                      <div className="text-xs text-muted-foreground">{s.desc}</div>
                    </div>
                    <div className="text-right shrink-0">
                      <div className="text-sm font-bold text-amber-400">{s.fee}</div>
                      <div className="text-[10px] text-muted-foreground">{s.who}</div>
                    </div>
                  </motion.div>
                ))}
              </div>
              <div className="mt-4 p-3 rounded-lg bg-amber-500/10 border border-amber-500/20 text-center">
                <div className="text-xs text-muted-foreground">Итого банк зарабатывает на вводе:</div>
                <div className="text-2xl font-bold text-amber-400">0.6-1.3%</div>
              </div>
            </Card>
          </motion.div>

          {/* Output flow */}
          <motion.div initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.4 }}>
            <Card className="p-6 h-full">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-8 h-8 rounded-lg bg-destructive/15 flex items-center justify-center"><ArrowRight className="w-4 h-4 text-destructive rotate-180" /></div>
                <h3 className="font-bold">Вывод средств (Биржа → ₽)</h3>
              </div>
              <div className="space-y-3">
                {[
                  { step: '1', title: 'Списание с биржи', desc: 'Баланс пользователя → конвертация в ₽', fee: '0.5%', who: 'Биржа' },
                  { step: '2', title: 'Конвертация Цифровой ₽ → ₽', desc: 'ЦБ РФ → банк (ФЗ-259, ФЗ-1194918-8)', fee: '0.1-0.3%', who: 'Банк + ЦБ' },
                  { step: '3', title: 'Перевод ₽ пользователю', desc: 'Спецсчёт → личный счёт пользователя', fee: '0.5-1%', who: 'Банк' },
                ].map((s, i) => (
                  <motion.div key={s.step} initial={{ opacity: 0, x: 15 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.5 + i * 0.15 }} className="flex items-start gap-3 p-3 rounded-lg bg-muted/20">
                    <div className="w-6 h-6 rounded-full bg-primary/15 flex items-center justify-center text-xs font-bold text-primary shrink-0 mt-0.5">{s.step}</div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium">{s.title}</div>
                      <div className="text-xs text-muted-foreground">{s.desc}</div>
                    </div>
                    <div className="text-right shrink-0">
                      <div className="text-sm font-bold text-amber-400">{s.fee}</div>
                      <div className="text-[10px] text-muted-foreground">{s.who}</div>
                    </div>
                  </motion.div>
                ))}
              </div>
              <div className="mt-4 p-3 rounded-lg bg-amber-500/10 border border-amber-500/20 text-center">
                <div className="text-xs text-muted-foreground">Итого банк зарабатывает на выводе:</div>
                <div className="text-2xl font-bold text-amber-400">0.6-1.3%</div>
              </div>
            </Card>
          </motion.div>
        </div>

        {/* Trading */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.8 }} className="mt-4">
          <Card className="p-4 bg-primary/5 border-primary/20">
            <div className="flex items-center justify-between flex-wrap gap-3">
              <div className="flex items-center gap-2">
                <Zap className="w-5 h-5 text-primary" />
                <span className="text-sm font-medium">Каждая торговая сделка на бирже</span>
              </div>
              <div className="flex gap-4 text-sm">
                <span>Биржа: <b className="text-primary">0.1-0.5%</b></span>
                <span>Банк (эквайринг): <b className="text-amber-400">0.05-0.2%</b></span>
              </div>
            </div>
          </Card>
        </motion.div>
      </div>
    ),
  },

  // 4. Regulatory compliance
  {
    id: 'legal',
    render: () => (
      <div>
        <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-xl bg-primary/15 flex items-center justify-center"><Scale className="w-5 h-5 text-primary" /></div>
          <h2 className="text-2xl lg:text-3xl font-bold">Регуляторная база</h2>
        </motion.div>

        <div className="grid md:grid-cols-2 gap-4">
          {[
            { law: 'ФЗ № 259-ФЗ', title: 'О цифровых финансовых активах', desc: 'Правовая основа для ЦФА и цифрового рубля. Операторы ЦФА-платформ лицензируются ЦБ РФ.', impl: ['Цифровой рубль — законное средство', 'Платформа ЦБ РФ для конвертации', 'Оператор ЦФА — лицензия ЦБ'] },
            { law: 'ФЗ № 1194918-8', title: 'О цифровой валюте', desc: 'Легализация криптобирж с 01.07.2026. 5 типов лицензий. Уставный капитал от 100 млн ₽.', impl: ['Лицензия оператора обмена', 'Адрес-идентификаторы', 'Квалификация инвесторов', 'Капитал ≥ 100 млн ₽'] },
            { law: 'ФЗ № 115-ФЗ', title: 'ПОД/ФТ (AML)', desc: 'Противодействие отмыванию. Идентификация, мониторинг, отчётность.', impl: ['AML-консоль: 5 типов алертов', 'SHAP-объяснимость ML', 'SAR в Росфинмониторинг', 'Порог >600K ₽ — авто-контроль'] },
            { law: 'ЦБ РФ: Цифровой рубль', title: 'Платформа цифрового рубля', desc: 'С 01.09.2026 — массовое внедрение. Банки-операторы конвертируют ₽ ↔ ЦР.', impl: ['Спецсчёт биржи в банке', 'Конвертация ₽ → цифровой ₽', 'ЦБ РФ — оператор платформы', 'Банк — оператор кошельков'] },
          ].map((item, i) => (
            <motion.div key={i} initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 * i }}>
              <Card className="p-5 h-full">
                <div className="flex items-center gap-2 mb-3">
                  <Badge variant="outline" className="border-primary/40 text-primary text-xs">{item.law}</Badge>
                  <span className="text-sm font-semibold">{item.title}</span>
                </div>
                <p className="text-xs text-muted-foreground mb-3">{item.desc}</p>
                <div className="space-y-1.5">
                  {item.impl.map((impl, j) => (
                    <div key={j} className="flex items-center gap-1.5 text-xs">
                      <CheckCircle2 className="w-3 h-3 text-success shrink-0" />
                      <span>{impl}</span>
                    </div>
                  ))}
                </div>
              </Card>
            </motion.div>
          ))}
        </div>

        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.7 }} className="mt-4">
          <Card className="p-4 bg-primary/5 border-primary/20">
            <div className="flex items-center gap-3 text-sm">
              <Sparkles className="w-5 h-5 text-primary" />
              <span>Банк выступает <b>оператором кошельков цифрового рубля</b> и <b>партнёром биржи</b> — зарабатывает на каждом переводе ₽ ↔ цифровой ₽ и комиссии за эквайринг</span>
            </div>
          </Card>
        </motion.div>
      </div>
    ),
  },

  // 5. Call to action
  {
    id: 'cta',
    render: () => (
      <div className="flex flex-col items-center justify-center min-h-[70vh] text-center">
        <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: 'spring', duration: 1 }}>
          <Building2 className="w-14 h-14 text-primary mb-5 mx-auto" />
        </motion.div>
        <motion.h2 initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="text-3xl lg:text-5xl font-bold mb-3">
          Выгодное партнёрство
        </motion.h2>
        <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.5 }} className="text-base text-muted-foreground max-w-2xl mb-6">
          Банк-партнёр зарабатывает на каждом рубле, проходящем через биржу: ввод, вывод, конвертация в цифровой рубль, торговые сделки.
        </motion.p>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.7 }} className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
          {[
            { v: '1.2-2.6%', l: 'с каждого ввода/вывода' },
            { v: '$20B+', l: 'объём крипторынка РФ/год' },
            { v: '0.05-0.2%', l: 'эквайринг сделок' },
            { v: '01.09.2026', l: 'цифровой рубль — старт' },
          ].map((s, i) => (
            <Card key={i} className="p-4 text-center min-w-[120px]">
              <div className="text-xl font-bold text-primary">{s.v}</div>
              <div className="text-[10px] text-muted-foreground mt-0.5">{s.l}</div>
            </Card>
          ))}
        </motion.div>

        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.9 }} className="flex gap-3 mb-6">
          <Badge variant="outline" className="border-primary/40 text-primary">ВТБ (ГОСТ TLS)</Badge>
          <Badge variant="outline" className="border-primary/40 text-primary">Альфа-Банк (REST)</Badge>
          <Badge variant="outline" className="border-primary/40 text-primary">Сбербанк</Badge>
        </motion.div>

        <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1.1 }} className="text-sm text-muted-foreground">
          РусКрипто © 2026 • ФЗ-259 • ФЗ-1194918-8 • ФЗ-115 • ЦБ РФ: цифровой рубль
        </motion.p>
      </div>
    ),
  },
]

// ─── Main Presentation View ─────────────────────────────────────────────────
export function PresentationView({ onClose }: { onClose: () => void }) {
  const [current, setCurrent] = useState(0)
  const [direction, setDirection] = useState(1)

  const next = useCallback(() => { setDirection(1); setCurrent((c) => Math.min(c + 1, SLIDES.length - 1)) }, [])
  const prev = useCallback(() => { setDirection(-1); setCurrent((c) => Math.max(c - 1, 0)) }, [])

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight' || e.key === ' ') next()
      if (e.key === 'ArrowLeft') prev()
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [next, prev, onClose])

  const slide = SLIDES[current]
  const variants = {
    enter: (dir: number) => ({ opacity: 0, x: dir > 0 ? 300 : -300, scale: 0.9 }),
    center: { opacity: 1, x: 0, scale: 1 },
    exit: (dir: number) => ({ opacity: 0, x: dir > 0 ? -300 : 300, scale: 0.9 }),
  }

  return (
    <div className="fixed inset-0 z-50 bg-background flex flex-col">
      {/* Top bar */}
      <div className="shrink-0 flex items-center justify-between px-4 py-2 border-b border-border bg-card/40 backdrop-blur">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center text-black font-black text-sm">₿</div>
          <span className="text-sm font-bold">РусКрипто — Презентация</span>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs text-muted-foreground">{current + 1} / {SLIDES.length}</span>
          <div className="w-[120px] h-1 rounded-full bg-muted overflow-hidden">
            <motion.div className="h-full bg-primary rounded-full" animate={{ width: `${((current + 1) / SLIDES.length) * 100}%` }} transition={{ type: 'spring' }} />
          </div>
          <Button variant="ghost" size="sm" onClick={onClose} className="text-xs">✕ Закрыть</Button>
        </div>
      </div>

      {/* Slide content */}
      <div className="flex-1 overflow-y-auto scrollbar-thin relative">
        <AnimatePresence mode="wait" custom={direction}>
          <motion.div
            key={slide.id}
            custom={direction}
            variants={variants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
            className="min-h-full max-w-[1200px] mx-auto px-6 lg:px-10 py-8"
          >
            {slide.render()}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Navigation */}
      <div className="shrink-0 flex items-center justify-between px-4 py-2 border-t border-border bg-card/40 backdrop-blur">
        <Button variant="ghost" size="sm" onClick={prev} disabled={current === 0} className="gap-1.5">
          <ChevronLeft className="w-4 h-4" /> Назад
        </Button>
        <div className="flex gap-1">
          {SLIDES.map((s, i) => (
            <button key={s.id} onClick={() => { setDirection(i > current ? 1 : -1); setCurrent(i) }}
              className={cn('w-2 h-2 rounded-full transition-all', i === current ? 'bg-primary w-6' : 'bg-muted-foreground/30 hover:bg-muted-foreground/60')} />
          ))}
        </div>
        <Button variant="ghost" size="sm" onClick={next} disabled={current === SLIDES.length - 1} className="gap-1.5">
          Далее <ChevronRight className="w-4 h-4" />
        </Button>
      </div>
    </div>
  )
}
