'use client'

import { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  ChevronLeft, ChevronRight, ShieldCheck, Scale, Lock, Zap, TrendingUp,
  Wallet, BarChart3, Users, FileText, Building2, Landmark, Database,
  CheckCircle2, ArrowRight, Sparkles, Server, Cpu, Globe2, Award,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card } from '@/components/ui/card'
import { cn } from '@/lib/utils'

// ─── Slide definitions ──────────────────────────────────────────────────────
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
          className="w-24 h-24 rounded-3xl bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center text-5xl font-black text-black shadow-2xl shadow-amber-500/30 mb-8"
        >
          ₿
        </motion.div>
        <motion.h1
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="text-5xl lg:text-7xl font-bold tracking-tight mb-4"
        >
          РусКрипто
        </motion.h1>
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.7 }}
          className="text-xl lg:text-2xl text-primary mb-2"
        >
          Легальная криптобиржа Российской Федерации
        </motion.p>
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.9 }}
          className="text-sm text-muted-foreground max-w-xl"
        >
          Соответствие ФЗ № 1194918-8 • 115-ФЗ • 152-ФЗ • 173-ФЗ
        </motion.p>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1.1 }}
          className="mt-8 flex gap-3"
        >
          <Badge variant="outline" className="border-primary/40 text-primary gap-1.5 px-4 py-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-success animate-pulse" />
            MVP v2.0 • Июль 2026
          </Badge>
        </motion.div>
      </div>
    ),
  },

  // 2. Market & Problem
  {
    id: 'market',
    render: () => (
      <div>
        <SlideHeader icon={TrendingUp} title="Рынок и возможность" />
        <div className="grid lg:grid-cols-2 gap-6 mt-8">
          <motion.div initial={{ opacity: 0, x: -30 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.2 }}>
            <Card className="p-6 h-full">
              <h3 className="font-bold text-lg mb-4 text-primary">Проблема</h3>
              <ul className="space-y-3 text-sm">
                <li className="flex gap-2"><span className="text-destructive">▶</span> Россия — топ-3 по объёму криптоопераций ($20+ млрд/год)</li>
                <li className="flex gap-2"><span className="text-destructive">▶</span> Вся активность в «серой зоне» — нет правовой защиты</li>
                <li className="flex gap-2"><span className="text-destructive">▶</span> SWIFT-санкции блокируют международные расчёты</li>
                <li className="flex gap-2"><span className="text-destructive">▶</span> Бизнес нуждается в альтернативных платёжных каналах</li>
              </ul>
            </Card>
          </motion.div>
          <motion.div initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.4 }}>
            <Card className="p-6 h-full bg-primary/5 border-primary/20">
              <h3 className="font-bold text-lg mb-4 text-primary">Решение</h3>
              <ul className="space-y-3 text-sm">
                <li className="flex gap-2"><CheckCircle2 className="w-4 h-4 text-success shrink-0 mt-0.5" /> <b>ФЗ № 1194918-8</b> (01.07.2026) — легальная основа для криптобирж</li>
                <li className="flex gap-2"><CheckCircle2 className="w-4 h-4 text-success shrink-0 mt-0.5" /> Первая легальная биржа на рынке РФ</li>
                <li className="flex gap-2"><CheckCircle2 className="w-4 h-4 text-success shrink-0 mt-0.5" /> Прогноз рынка: $8-12 млрд к 2027, $15-35 млрд к 2028</li>
                <li className="flex gap-2"><CheckCircle2 className="w-4 h-4 text-success shrink-0 mt-0.5" /> IRR 28-35%, окупаемость 2.5-3.5 года</li>
              </ul>
            </Card>
          </motion.div>
        </div>
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.6 }} className="mt-6">
          <div className="grid grid-cols-4 gap-3">
            {[
              { v: '$20B+', l: 'Объём криптоопераций РФ/год' },
              { v: '18', l: 'Разделов платформы' },
              { v: '5', l: 'Ролей пользователей' },
              { v: '33', l: 'API-эндпоинта' },
            ].map((s, i) => (
              <Card key={i} className="p-4 text-center">
                <div className="text-2xl lg:text-3xl font-bold text-primary">{s.v}</div>
                <div className="text-xs text-muted-foreground mt-1">{s.l}</div>
              </Card>
            ))}
          </div>
        </motion.div>
      </div>
    ),
  },

  // 3. Legal compliance
  {
    id: 'legal',
    render: () => (
      <div>
        <SlideHeader icon={Scale} title="Регуляторное соответствие" />
        <div className="grid md:grid-cols-2 gap-4 mt-8">
          {[
            { law: 'ФЗ № 1194918-8', title: 'О цифровой валюте', desc: 'Легальная основа для криптобирж. 5 типов лицензий ЦБ РФ. Уставный капитал от 100 млн ₽.', impl: ['Лицензирование операторов', 'Адрес-идентификаторы', 'Квалификация инвесторов', 'Уставный капитал ≥100 млн ₽'] },
            { law: 'ФЗ № 115', title: 'ПОД/ФТ (AML)', desc: 'Противодействие отмыванию доходов. Идентификация клиентов, мониторинг операций.', impl: ['AML-консоль с 5 типами алертов', 'SHAP-объяснимость ML-модели', 'SAR-отчёты в Росфинмониторинг', 'Пороговые операции >600K ₽'] },
            { law: 'ФЗ № 152', title: 'Персональные данные', desc: 'Защита ПДн пользователей. Согласие на обработку.', impl: ['Согласие при регистрации', 'Договоры с банками-операторами ПДн', 'Шифрование GOST 28147-89', 'FSTEC-сертифицированные ЦОД'] },
            { law: 'ФЗ № 173', title: 'Валютный контроль', desc: 'Декларирование трансграничных переводов. Паспорт сделки.', impl: ['Авто-формирование документов', 'Контроль коридоров', 'Отчётность для ЦБ РФ'] },
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
      </div>
    ),
  },

  // 4. Platform overview
  {
    id: 'overview',
    render: () => (
      <div>
        <SlideHeader icon={Server} title="Архитектура платформы" />
        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.2 }} className="mt-8">
          <Card className="p-6">
            <div className="grid lg:grid-cols-3 gap-4">
              {[
                { icon: Cpu, title: 'Фронтенд', items: ['Next.js 16 + React 19', 'TypeScript 5', 'Tailwind CSS 4 + shadcn/ui', 'Zustand + recharts', 'framer-motion анимации', 'i18n RU/EN (~2200 ключей)'] },
                { icon: Server, title: 'Бэкенд', items: ['33 API-эндпоинта', 'Prisma ORM + SQLite', 'socket.io (realtime)', 'z-ai-web-dev-sdk (LLM)', '21 модель БД', 'Role-based access (5 ролей)'] },
                { icon: Globe2, title: 'Внешние API', items: ['Binance (котировки + klines)', 'ЦБ РФ (USD/RUB курс)', 'TradingView (графики)', 'Госуслуги ЕСИА (KYC)', 'ГОСТ TLS 1.3 (ВТБ)'] },
              ].map((col, i) => (
                <div key={i}>
                  <div className="flex items-center gap-2 mb-3">
                    <div className="w-8 h-8 rounded-lg bg-primary/15 flex items-center justify-center">
                      <col.icon className="w-4 h-4 text-primary" />
                    </div>
                    <span className="font-semibold text-sm">{col.title}</span>
                  </div>
                  <ul className="space-y-1.5 text-xs text-muted-foreground">
                    {col.items.map((item, j) => (
                      <li key={j} className="flex gap-1.5"><span className="text-primary">▸</span> {item}</li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </Card>
        </motion.div>
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }} className="mt-4">
          <div className="grid grid-cols-3 lg:grid-cols-6 gap-2">
            {['Главная', 'Торги', 'Маржа', 'Кошелёк', 'Портфель', 'Аналитика', 'Верификация', 'Комплаенс', 'Финансы', 'Портал банка', 'Новости', 'Справка'].map((v, i) => (
              <motion.div key={v} initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.6 + i * 0.05 }}>
                <Badge variant="outline" className="w-full justify-center py-1.5 text-xs">{v}</Badge>
              </motion.div>
            ))}
          </div>
        </motion.div>
      </div>
    ),
  },

  // 5. Spot Trading
  {
    id: 'trading',
    render: () => (
      <div>
        <SlideHeader icon={TrendingUp} title="Спот-торги" />
        <div className="grid lg:grid-cols-2 gap-6 mt-8">
          <motion.div initial={{ opacity: 0, x: -30 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.2 }}>
            <Card className="p-6 h-full">
              <h3 className="font-bold mb-4">Торговый терминал</h3>
              <ul className="space-y-2 text-sm">
                <li className="flex gap-2"><CheckCircle2 className="w-4 h-4 text-success shrink-0 mt-0.5" /> <b>Live order book</b> — WebSocket, 12 уровней bids/asks, REAL индикатор</li>
                <li className="flex gap-2"><CheckCircle2 className="w-4 h-4 text-success shrink-0 mt-0.5" /> <b>TradingView</b> график с реальными ценами Binance</li>
                <li className="flex gap-2"><CheckCircle2 className="w-4 h-4 text-success shrink-0 mt-0.5" /> <b>Depth chart</b> — визуализация глубины рынка</li>
                <li className="flex gap-2"><CheckCircle2 className="w-4 h-4 text-success shrink-0 mt-0.5" /> <b>Лимитные и рыночные</b> ордера, % от баланса</li>
                <li className="flex gap-2"><CheckCircle2 className="w-4 h-4 text-success shrink-0 mt-0.5" /> <b>Resize + drag</b> блоков (persist layout)</li>
                <li className="flex gap-2"><CheckCircle2 className="w-4 h-4 text-success shrink-0 mt-0.5" /> <b>CSV-экспорт</b> истории сделок + фильтры</li>
                <li className="flex gap-2"><CheckCircle2 className="w-4 h-4 text-success shrink-0 mt-0.5" /> <b>Flash-анимации</b> цен в real-time</li>
              </ul>
            </Card>
          </motion.div>
          <motion.div initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.4 }}>
            <Card className="p-6 h-full bg-muted/20">
              <h3 className="font-bold mb-4 text-primary">8 торговых пар</h3>
              <div className="grid grid-cols-2 gap-2">
                {['BTC/RUB', 'ETH/RUB', 'BNB/RUB', 'SOL/RUB', 'XRP/RUB', 'ADA/RUB', 'DOGE/RUB', 'AVAX/RUB'].map((pair, i) => (
                  <motion.div key={pair} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 + i * 0.05 }} className="flex items-center justify-between p-2 rounded-lg bg-card border border-border">
                    <span className="font-mono text-sm font-semibold">{pair}</span>
                    <span className="text-xs text-success">+{(Math.random() * 5).toFixed(1)}%</span>
                  </motion.div>
                ))}
              </div>
              <div className="mt-4 p-3 rounded-lg bg-primary/10 border border-primary/20 text-xs">
                <div className="flex justify-between mb-1"><span className="text-muted-foreground">Matching engine:</span> <span className="font-mono">price-time FIFO</span></div>
                <div className="flex justify-between mb-1"><span className="text-muted-foreground">Latency target:</span> <span className="font-mono">&lt; 10 мс</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Throughput:</span> <span className="font-mono">100K TPS</span></div>
              </div>
            </Card>
          </motion.div>
        </div>
      </div>
    ),
  },

  // 6. Margin Trading
  {
    id: 'margin',
    render: () => (
      <div>
        <SlideHeader icon={Zap} title="Маржинальная торговля" />
        <div className="grid lg:grid-cols-3 gap-4 mt-8">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
            <Card className="p-5 h-full">
              <div className="text-3xl mb-2">⚡</div>
              <h3 className="font-bold mb-2">Плечо 1x–20x</h3>
              <p className="text-xs text-muted-foreground">Long и Short позиции с кредитным плечом. Размер = маржа × плечо.</p>
            </Card>
          </motion.div>
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.35 }}>
            <Card className="p-5 h-full">
              <div className="text-3xl mb-2">🛡️</div>
              <h3 className="font-bold mb-2">Risk Control</h3>
              <p className="text-xs text-muted-foreground">Auto-ликвидация при margin ratio ≥100%. Maintenance margin 0.5%. Цена ликвидации auto-расчёт.</p>
            </Card>
          </motion.div>
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }}>
            <Card className="p-5 h-full">
              <div className="text-3xl mb-2">📊</div>
              <h3 className="font-bold mb-2">Live PnL</h3>
              <p className="text-xs text-muted-foreground">Real-time PnL через WebSocket. Margin level bar: зелёный/жёлтый/красный. История позиций.</p>
            </Card>
          </motion.div>
        </div>
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.7 }} className="mt-4">
          <Card className="p-4 bg-destructive/5 border-destructive/20">
            <p className="text-xs text-center text-muted-foreground">
              <Scale className="w-3.5 h-3.5 inline mr-1.5 text-destructive" />
              <b>Внимание:</b> Маржинальная торговля сопряжена с высоким риском. При маржин-колле позиция ликвидируется.
              Квалифицированный инвестор — без ограничений. Неквалифицированный — лимит 300K ₽/год (ФЗ-1194918-8).
            </p>
          </Card>
        </motion.div>
      </div>
    ),
  },

  // 7. Wallet & Custody
  {
    id: 'wallet',
    render: () => (
      <div>
        <SlideHeader icon={Wallet} title="Кошелёк и кастодия" />
        <div className="grid lg:grid-cols-2 gap-6 mt-8">
          <motion.div initial={{ opacity: 0, x: -30 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.2 }}>
            <Card className="p-6">
              <h3 className="font-bold mb-4">Управление активами</h3>
              <ul className="space-y-2 text-sm">
                <li className="flex gap-2"><CheckCircle2 className="w-4 h-4 text-success shrink-0 mt-0.5" /> <b>4 актива:</b> RUB, USDT, BTC, ETH с оценкой в ₽ и $</li>
                <li className="flex gap-2"><CheckCircle2 className="w-4 h-4 text-success shrink-0 mt-0.5" /> <b>Депозит:</b> выбор сети (TRC-20/ERC-20/BEP-20), QR-код, адрес</li>
                <li className="flex gap-2"><CheckCircle2 className="w-4 h-4 text-success shrink-0 mt-0.5" /> <b>Вывод:</b> 2FA, whitelist, комиссия сети, &gt;100K ₽ — доп. подтверждение</li>
                <li className="flex gap-2"><CheckCircle2 className="w-4 h-4 text-success shrink-0 mt-0.5" /> <b>История:</b> все транзакции со статусами</li>
              </ul>
            </Card>
          </motion.div>
          <motion.div initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.4 }}>
            <Card className="p-6 bg-primary/5 border-primary/20">
              <h3 className="font-bold mb-4 text-primary">Кастодия (production)</h3>
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-success/15 flex items-center justify-center"><Lock className="w-5 h-5 text-success" /></div>
                  <div><div className="text-sm font-medium">Hot/Warm/Cold: 5/15/80</div><div className="text-xs text-muted-foreground">Распределение активов</div></div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-primary/15 flex items-center justify-center"><ShieldCheck className="w-5 h-5 text-primary" /></div>
                  <div><div className="text-sm font-medium">HSM Thales Luna</div><div className="text-xs text-muted-foreground">FIPS 140-2 L3 + FSTEC</div></div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-amber-500/15 flex items-center justify-center"><Users className="w-5 h-5 text-amber-400" /></div>
                  <div><div className="text-sm font-medium">Multisig 2-of-3 / 3-of-5</div><div className="text-xs text-muted-foreground">Warm / Cold кошельки</div></div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-violet-500/15 flex items-center justify-center"><Award className="w-5 h-5 text-violet-400" /></div>
                  <div><div className="text-sm font-medium">Страхование $100M</div><div className="text-xs text-muted-foreground">Lloyd's / Marsh</div></div>
                </div>
              </div>
            </Card>
          </motion.div>
        </div>
      </div>
    ),
  },

  // 8. KYC
  {
    id: 'kyc',
    render: () => (
      <div>
        <SlideHeader icon={ShieldCheck} title="KYC верификация" />
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2 }} className="mt-8">
          <div className="flex items-center justify-center gap-2 lg:gap-4 flex-wrap">
            {[
              { step: 1, title: 'Телефон', desc: 'SMS-код', icon: '📱' },
              { step: 2, title: 'Документ', desc: 'OCR паспорт', icon: '📄' },
              { step: 3, title: 'Селфи', desc: 'Liveness check', icon: '🤳' },
              { step: 4, title: 'Адрес-ID', desc: 'Привязка криптоадресов', icon: '🔗' },
              { step: 5, title: 'Квалификация', desc: 'Тест 25 Q / ≥3 млн ₽', icon: '🎓' },
            ].map((s, i) => (
              <motion.div key={s.step} initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.3 + i * 0.15 }}>
                <div className="flex items-center gap-2 lg:gap-4">
                  <Card className="p-4 w-32 lg:w-36 text-center">
                    <div className="text-2xl mb-1">{s.icon}</div>
                    <div className="text-xs font-semibold">{s.step}. {s.title}</div>
                    <div className="text-[10px] text-muted-foreground mt-0.5">{s.desc}</div>
                  </Card>
                  {i < 4 && <ArrowRight className="w-5 h-5 text-primary shrink-0" />}
                </div>
              </motion.div>
            ))}
          </div>
        </motion.div>
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 1.1 }} className="mt-6">
          <Card className="p-4 bg-primary/5 border-primary/20">
            <div className="grid md:grid-cols-2 gap-4 text-sm">
              <div className="flex items-center gap-2"><Building2 className="w-4 h-4 text-primary" /> <b>Госуслуги (ЕСИА)</b> — fast-track, +35% конверсии</div>
              <div className="flex items-center gap-2"><Scale className="w-4 h-4 text-primary" /> <b>ФЗ-1194918-8:</b> адрес-идентификаторы обязательны</div>
              <div className="flex items-center gap-2"><Users className="w-4 h-4 text-primary" /> <b>Неквалифицированный:</b> лимит 300K ₽/год</div>
              <div className="flex items-center gap-2"><Award className="w-4 h-4 text-primary" /> <b>Квалифицированный:</b> без ограничений</div>
            </div>
          </Card>
        </motion.div>
      </div>
    ),
  },

  // 9. Compliance
  {
    id: 'compliance',
    render: () => (
      <div>
        <SlideHeader icon={Scale} title="AML-комплаенс" />
        <div className="grid lg:grid-cols-2 gap-6 mt-8">
          <motion.div initial={{ opacity: 0, x: -30 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.2 }}>
            <Card className="p-6">
              <h3 className="font-bold mb-4">AML-консоль (115-ФЗ)</h3>
              <ul className="space-y-2 text-sm">
                <li className="flex gap-2"><CheckCircle2 className="w-4 h-4 text-success shrink-0 mt-0.5" /> <b>5 типов алертов:</b> Structuring, Velocity, Sanction, Threshold, Pattern</li>
                <li className="flex gap-2"><CheckCircle2 className="w-4 h-4 text-success shrink-0 mt-0.5" /> <b>SHAP-объяснимость</b> ML-модели (для регулятора)</li>
                <li className="flex gap-2"><CheckCircle2 className="w-4 h-4 text-success shrink-0 mt-0.5" /> <b>SAR-отчёты</b> в Росфинмониторинг одним кликом</li>
                <li className="flex gap-2"><CheckCircle2 className="w-4 h-4 text-success shrink-0 mt-0.5" /> <b>Карантин</b> счетов (m-of-n: Compliance + Risk)</li>
                <li className="flex gap-2"><CheckCircle2 className="w-4 h-4 text-success shrink-0 mt-0.5" /> <b>Пороговые операции</b> &gt;600K ₽ — auto-flag</li>
              </ul>
            </Card>
          </motion.div>
          <motion.div initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.4 }}>
            <Card className="p-6 bg-destructive/5 border-destructive/20">
              <h3 className="font-bold mb-4 text-destructive">Severity уровни</h3>
              <div className="space-y-2">
                {[
                  { level: 'CRITICAL', color: 'bg-destructive', desc: 'Санкционный список — match 0.96' },
                  { level: 'HIGH', color: 'bg-orange-500', desc: 'Структурирование — 5×95K за 18 мин' },
                  { level: 'MEDIUM', color: 'bg-amber-500', desc: 'Velocity — 4 устройства за 12 мин' },
                  { level: 'LOW', color: 'bg-sky-500', desc: 'Порог — разовая &gt;1.25M ₽' },
                ].map((s, i) => (
                  <motion.div key={s.level} initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.5 + i * 0.1 }} className="flex items-center gap-3 p-2 rounded-lg bg-card">
                    <span className={cn('w-2 h-8 rounded-full', s.color)} />
                    <div><div className="text-xs font-bold">{s.level}</div><div className="text-[10px] text-muted-foreground">{s.desc}</div></div>
                  </motion.div>
                ))}
              </div>
            </Card>
          </motion.div>
        </div>
      </div>
    ),
  },

  // 10. Finance & Bank Portal
  {
    id: 'finance',
    render: () => (
      <div>
        <SlideHeader icon={Landmark} title="Финансы и банки" />
        <div className="grid lg:grid-cols-2 gap-6 mt-8">
          <motion.div initial={{ opacity: 0, x: -30 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.2 }}>
            <Card className="p-6">
              <div className="flex items-center gap-2 mb-4"><Landmark className="w-5 h-5 text-primary" /> <h3 className="font-bold">Финансовый контролёр (FINANCE)</h3></div>
              <ul className="space-y-1.5 text-sm">
                <li>▸ <b>5 банков:</b> ВТБ (ГОСТ/SOAP), Альфа (REST), Сбер, ГПБ, Тинькофф</li>
                <li>▸ <b>Комиссии</b> с архивированием (PATCH/DELETE, даты действия)</li>
                <li>▸ <b>Лимиты</b> дневные/месячные/per-user (real-time)</li>
                <li>▸ <b>Свёрка</b> с банковскими выписками</li>
                <li>▸ <b>Коридоры</b> через банки</li>
                <li>▸ <b>Отчёты</b> для ЦБ РФ (CSV, пороговые &gt;600K)</li>
                <li>▸ <b>Вебхуки</b> от банков</li>
              </ul>
            </Card>
          </motion.div>
          <motion.div initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.4 }}>
            <Card className="p-6 bg-primary/5 border-primary/20">
              <div className="flex items-center gap-2 mb-4"><Building2 className="w-5 h-5 text-primary" /> <h3 className="font-bold">Портал банка (BANK)</h3></div>
              <ul className="space-y-1.5 text-sm">
                <li>▸ <b>Дашборд</b> по конкретному банку (KPI, графики)</li>
                <li>▸ <b>Транзакции</b> с пагинацией и фильтрами</li>
                <li>▸ <b>Настройки</b> — только просмотр (реквизиты, комиссии)</li>
                <li>▸ <b>Сверка</b> своих данных с выписками</li>
                <li>▸ <b>Отчёты</b> по своему банку</li>
                <li>▸ <b>Role-gating:</b> банк видит только свой портал</li>
              </ul>
              <div className="mt-3 p-2 rounded-lg bg-muted/40 text-xs">
                <b>Демо:</b> bank@vtb.ru (ВТБ), bank@alfa.ru (Альфа), bank@sber.ru (Сбер)
              </div>
            </Card>
          </motion.div>
        </div>
      </div>
    ),
  },

  // 11. Portfolio & Tax
  {
    id: 'portfolio',
    render: () => (
      <div>
        <SlideHeader icon={BarChart3} title="Портфель и налоги" />
        <div className="grid lg:grid-cols-3 gap-4 mt-8">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
            <Card className="p-5 h-full">
              <div className="text-3xl mb-2">📊</div>
              <h3 className="font-bold mb-2">Аллокация</h3>
              <p className="text-xs text-muted-foreground">Donut-диаграмма по активам. Реальные курсы. PnL за 24ч.</p>
            </Card>
          </motion.div>
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.35 }}>
            <Card className="p-5 h-full">
              <div className="text-3xl mb-2">📈</div>
              <h3 className="font-bold mb-2">PnL график</h3>
              <p className="text-xs text-muted-foreground">Реальная кривая эквити из сделок. Backward+forward replay.</p>
            </Card>
          </motion.div>
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }}>
            <Card className="p-5 h-full bg-primary/5 border-primary/20">
              <div className="text-3xl mb-2">🧾</div>
              <h3 className="font-bold mb-2 text-primary">3-НДФЛ</h3>
              <p className="text-xs text-muted-foreground">Авто-генерация налогового отчёта. CSV-экспорт: PnL, комиссии, сделки.</p>
            </Card>
          </motion.div>
        </div>
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.7 }} className="mt-4">
          <Card className="p-4">
            <div className="flex items-center gap-3 text-sm">
              <Database className="w-4 h-4 text-success" />
              <span>Все данные портфеля рассчитываются из <b>реальных сделок</b> в БД (Prisma) — не mock</span>
            </div>
          </Card>
        </motion.div>
      </div>
    ),
  },

  // 12. Help Center & AI
  {
    id: 'help',
    render: () => (
      <div>
        <SlideHeader icon={Sparkles} title="Справка и ИИ-помощник" />
        <div className="grid lg:grid-cols-2 gap-6 mt-8">
          <motion.div initial={{ opacity: 0, x: -30 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.2 }}>
            <Card className="p-6">
              <div className="flex items-center gap-2 mb-4"><FileText className="w-5 h-5 text-primary" /> <h3 className="font-bold">Справочный центр</h3></div>
              <ul className="space-y-1.5 text-sm">
                <li>▸ <b>15 статей</b> по всем разделам (RU/EN)</li>
                <li>▸ Определения + пошаговые инструкции + FAQ</li>
                <li>▸ Поиск + фильтры по 11 разделам</li>
                <li>▸ Популярные вопросы</li>
              </ul>
            </Card>
          </motion.div>
          <motion.div initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.4 }}>
            <Card className="p-6 bg-primary/5 border-primary/20">
              <div className="flex items-center gap-2 mb-4"><Sparkles className="w-5 h-5 text-primary" /> <h3 className="font-bold">ИИ-консультант</h3></div>
              <ul className="space-y-1.5 text-sm">
                <li>▸ <b>z-ai-web-dev-sdk</b> (LLM) для ответов</li>
                <li>▸ <b>Fallback</b> на поиск по справке (без API-ключа)</li>
                <li>▸ Floating кнопка «?» на всех разделах</li>
                <li>▸ Bilingual: отвечает на языке пользователя</li>
                <li>▸ Markdown-форматирование ответов</li>
              </ul>
            </Card>
          </motion.div>
        </div>
      </div>
    ),
  },

  // 13. Security
  {
    id: 'security',
    render: () => (
      <div>
        <SlideHeader icon={Lock} title="Безопасность" />
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-3 mt-8">
          {[
            { icon: Lock, title: 'GOST 28147-89', desc: 'Шифрование regulated данных. AES-256-GCM для остальных.' },
            { icon: ShieldCheck, title: 'HSM + Multisig', desc: 'Thales Luna FIPS 140-2 L3. 2-of-3 warm, 3-of-5 cold.' },
            { icon: Database, title: 'WORM Audit', desc: 'Event Sourcing + Merkle Root. Хранение 5 лет.' },
            { icon: Users, title: 'RBAC + ABAC', desc: '5 ролей. Контекстные проверки (сумма, гео, время).' },
          ].map((s, i) => (
            <motion.div key={i} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 * i }}>
              <Card className="p-5 h-full">
                <div className="w-10 h-10 rounded-lg bg-primary/15 flex items-center justify-center mb-3">
                  <s.icon className="w-5 h-5 text-primary" />
                </div>
                <h3 className="font-semibold text-sm mb-1">{s.title}</h3>
                <p className="text-xs text-muted-foreground">{s.desc}</p>
              </Card>
            </motion.div>
          ))}
        </div>
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.7 }} className="mt-4">
          <Card className="p-4 bg-success/5 border-success/20">
            <div className="flex items-center gap-3 text-sm">
              <CheckCircle2 className="w-5 h-5 text-success" />
              <span>Module toggles: P2P и Кросс-бордер отключаемы через админку — <b>соответствие законодательству на старте</b></span>
            </div>
          </Card>
        </motion.div>
      </div>
    ),
  },

  // 14. Call to action
  {
    id: 'cta',
    render: () => (
      <div className="flex flex-col items-center justify-center min-h-[70vh] text-center">
        <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: 'spring', duration: 1 }}>
          <Award className="w-16 h-16 text-primary mb-6 mx-auto" />
        </motion.div>
        <motion.h2 initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="text-3xl lg:text-5xl font-bold mb-4">
          Готовы к запуску
        </motion.h2>
        <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.5 }} className="text-lg text-muted-foreground max-w-2xl mb-8">
          MVP v2.0 работает. 18 разделов, 5 ролей, 33 API. Реальные котировки, AML-комплаенс, банки-партнёры.
          Следующий шаг — production-разворачивание и лицензия ЦБ РФ.
        </motion.p>
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.7 }} className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-8">
          {[
            { v: 'IRR', l: '28-35%' },
            { v: 'Окупаемость', l: '2.5-3.5 года' },
            { v: 'NPV', l: '850-1200 млн ₽' },
            { v: 'Бюджет', l: '145-210 млн ₽' },
          ].map((s, i) => (
            <Card key={i} className="p-4 text-center min-w-[120px]">
              <div className="text-xs text-muted-foreground">{s.v}</div>
              <div className="text-xl font-bold text-primary">{s.l}</div>
            </Card>
          ))}
        </motion.div>
        <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.9 }} className="text-sm text-muted-foreground">
          РусКрипто © 2026 • Легальная криптобиржа РФ • ФЗ-1194918-8
        </motion.p>
      </div>
    ),
  },
]

// ─── Slide header ───────────────────────────────────────────────────────────
function SlideHeader({ icon: Icon, title }: { icon: React.ComponentType<{ className?: string }>, title: string }) {
  return (
    <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="flex items-center gap-3">
      <div className="w-10 h-10 rounded-xl bg-primary/15 flex items-center justify-center">
        <Icon className="w-5 h-5 text-primary" />
      </div>
      <h2 className="text-2xl lg:text-3xl font-bold">{title}</h2>
    </motion.div>
  )
}

// ─── Main Presentation View ─────────────────────────────────────────────────
export function PresentationView({ onClose }: { onClose: () => void }) {
  const [current, setCurrent] = useState(0)
  const [direction, setDirection] = useState(1)

  const next = useCallback(() => {
    setDirection(1)
    setCurrent((c) => Math.min(c + 1, SLIDES.length - 1))
  }, [])

  const prev = useCallback(() => {
    setDirection(-1)
    setCurrent((c) => Math.max(c - 1, 0))
  }, [])

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
          <div className="flex-1 max-w-[200px] h-1 rounded-full bg-muted overflow-hidden">
            <motion.div className="h-full bg-primary rounded-full" animate={{ width: `${((current + 1) / SLIDES.length) * 100}%` }} transition={{ type: 'spring' }} />
          </div>
          <Button variant="ghost" size="sm" onClick={onClose} className="text-xs gap-1.5">
            ✕ Закрыть
          </Button>
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
            <button
              key={s.id}
              onClick={() => { setDirection(i > current ? 1 : -1); setCurrent(i) }}
              className={cn(
                'w-2 h-2 rounded-full transition-all',
                i === current ? 'bg-primary w-6' : 'bg-muted-foreground/30 hover:bg-muted-foreground/60'
              )}
            />
          ))}
        </div>
        <Button variant="ghost" size="sm" onClick={next} disabled={current === SLIDES.length - 1} className="gap-1.5">
          Далее <ChevronRight className="w-4 h-4" />
        </Button>
      </div>
    </div>
  )
}
