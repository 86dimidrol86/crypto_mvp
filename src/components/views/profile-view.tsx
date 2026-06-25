'use client'

import { useState } from 'react'
import {
  UserCircle,
  Wallet,
  History,
  ShieldCheck,
  Gift,
  Settings,
  LogOut,
  Shield,
  KeyRound,
  Fingerprint,
  Mail,
  Smartphone,
  Monitor,
  Copy,
  Check,
  Bell,
  Globe2,
  Moon,
  CircleDollarSign,
  TrendingUp,
  BadgeCheck,
} from 'lucide-react'
import { useAppStore } from '@/lib/store'
import { fetchTickers } from '@/lib/market'
import type { CoinTicker } from '@/lib/types'
import {
  formatPrice,
  formatNumber,
  formatAmount,
} from '@/lib/format'
import { useEffect } from 'react'
import { cn } from '@/lib/utils'
import { CoinIcon } from '@/components/coin-icon'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Separator } from '@/components/ui/separator'
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from '@/components/ui/select'
import {
  Table,
  TableHeader,
  TableRow,
  TableHead,
  TableBody,
  TableCell,
} from '@/components/ui/table'
import { toast } from 'sonner'

type Tab = 'overview' | 'assets' | 'history' | 'security' | 'referrals' | 'settings'

const TABS: { id: Tab; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { id: 'overview', label: 'Обзор', icon: UserCircle },
  { id: 'assets', label: 'Активы', icon: Wallet },
  { id: 'history', label: 'История', icon: History },
  { id: 'security', label: 'Безопасность', icon: ShieldCheck },
  { id: 'referrals', label: 'Рефералы', icon: Gift },
  { id: 'settings', label: 'Настройки', icon: Settings },
]

const FALLBACK_USD_RUB = 92.5

const MOCK_LOGIN_HISTORY = [
  { device: 'iPhone 15 Pro', ip: '85.140.12.84', location: 'Москва, RU', time: 'Сегодня, 14:32', current: true },
  { device: 'MacBook Pro • Chrome', ip: '85.140.12.84', location: 'Москва, RU', time: 'Вчера, 09:18', current: false },
  { device: 'Android • РусКрипто App', ip: '178.66.24.12', location: 'Санкт-Петербург, RU', time: '12 фев, 21:05', current: false },
  { device: 'Windows • Firefox', ip: '95.153.132.8', location: 'Казань, RU', time: '8 фев, 12:42', current: false },
]

const MOCK_SESSIONS = [
  { device: 'iPhone 15 Pro • App', location: 'Москва, RU', lastActive: 'сейчас', current: true },
  { device: 'MacBook Pro • Web', location: 'Москва, RU', lastActive: '5 мин назад', current: false },
  { device: 'iPad Air • App', location: 'Сочи, RU', lastActive: '2 ч назад', current: false },
]

export function ProfileView() {
  const userName = useAppStore((s) => s.userName)
  const userEmail = useAppStore((s) => s.userEmail)
  const isAuthed = useAppStore((s) => s.isAuthed)
  const kycLevel = useAppStore((s) => s.kycLevel)
  const kycStatus = useAppStore((s) => s.kycStatus)
  const balances = useAppStore((s) => s.balances)
  const orders = useAppStore((s) => s.orders)
  const transactions = useAppStore((s) => s.transactions)
  const logout = useAppStore((s) => s.logout)
  const setView = useAppStore((s) => s.setView)

  const [tab, setTab] = useState<Tab>('overview')
  const [tickers, setTickers] = useState<CoinTicker[]>([])
  const [twoFa, setTwoFa] = useState(true)
  const [antiPhishing, setAntiPhishing] = useState(false)
  const [whitelist, setWhitelist] = useState(false)
  const [notifPush, setNotifPush] = useState(true)
  const [notifEmail, setNotifEmail] = useState(true)
  const [notifSms, setNotifSms] = useState(false)
  const [notifTrades, setNotifTrades] = useState(true)
  const [nameInput, setNameInput] = useState(userName || 'Иван Иванов')
  const [emailInput, setEmailInput] = useState(userEmail || 'ivan.ivanov@ruscrypto.ru')
  const [language, setLanguage] = useState('ru')
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    let mounted = true
    fetchTickers().then((t) => mounted && setTickers(t))
    return () => {
      mounted = false
    }
  }, [])

  const btc = tickers.find((t) => t.symbol === 'BTC')
  const usdRub = btc && btc.priceUsd > 0 ? btc.priceRub / btc.priceUsd : FALLBACK_USD_RUB

  const totalRub = balances.reduce((s, b) => {
    if (b.asset === 'RUB') return s + b.amount
    if (b.asset === 'USDT') return s + b.amount * usdRub
    const t = tickers.find((x) => x.symbol === b.asset)
    return s + (t ? b.amount * t.priceRub : 0)
  }, 0)

  const displayName = userName || 'Иван Иванов'
  const displayEmail = userEmail || 'ivan.ivanov@ruscrypto.ru'
  const uid = 'RU-7842-9241'
  const kycLabel = kycLevel === 0 ? 'Без верификации' : kycLevel === 1 ? 'Уровень 1' : 'Уровень 2'
  const kycBadgeColor =
    kycLevel === 0
      ? 'border-muted-foreground/30 text-muted-foreground'
      : kycLevel === 1
      ? 'border-warning/30 text-warning bg-warning/5'
      : 'border-success/30 text-success bg-success/5'

  const handleLogout = () => {
    logout()
    setView('home')
    toast.success('Вы вышли из аккаунта')
  }

  const handleSaveSettings = () => {
    toast.success('Настройки сохранены', {
      description: 'Профиль обновлён',
    })
  }

  const handleCopyReferral = () => {
    navigator.clipboard?.writeText('Q49P0M7')
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
    toast.success('Реферальный код скопирован')
  }

  const handleShare = (platform: string) => {
    toast.success(`Поделиться через ${platform}`, {
      description: 'Ссылка скопирована в буфер обмена',
    })
  }

  // If not authed — show CTA
  if (!isAuthed) {
    return (
      <div className="flex-1 flex items-center justify-center p-8">
        <Card className="p-8 max-w-md text-center">
          <div className="w-16 h-16 rounded-2xl bg-primary/15 flex items-center justify-center mx-auto mb-4">
            <UserCircle className="w-8 h-8 text-primary" />
          </div>
          <h2 className="text-xl font-bold mb-2">Войдите в аккаунт</h2>
          <p className="text-sm text-muted-foreground mb-5">
            Для доступа к профилю, активам и настройкам необходимо авторизоваться
          </p>
          <Button
            onClick={() => setView('auth')}
            className="bg-primary text-primary-foreground hover:bg-primary/90 w-full"
          >
            Войти / Зарегистрироваться
          </Button>
        </Card>
      </div>
    )
  }

  return (
    <div className="flex-1">
      <div className="max-w-[1400px] mx-auto px-4 lg:px-8 py-8">
        {/* Header */}
        <Card className="relative overflow-hidden p-6 lg:p-8 mb-6 bg-gradient-to-br from-primary/10 via-card to-card border-primary/20">
          <div className="absolute -top-20 -right-20 w-64 h-64 rounded-full bg-primary/10 blur-3xl" aria-hidden />
          <div className="relative flex flex-col sm:flex-row items-start sm:items-center gap-5">
            <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center text-3xl font-black text-black shadow-lg shadow-amber-500/20 shrink-0">
              {displayName.slice(0, 1).toUpperCase()}
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2.5 flex-wrap">
                <h1 className="text-2xl font-bold">{displayName}</h1>
                <Badge variant="outline" className={cn('gap-1.5', kycBadgeColor)}>
                  <BadgeCheck className="w-3.5 h-3.5" />
                  KYC {kycLabel}
                </Badge>
              </div>
              <div className="text-sm text-muted-foreground mt-1.5 flex items-center gap-3 flex-wrap">
                <span className="flex items-center gap-1.5">
                  <Mail className="w-3.5 h-3.5" />
                  {displayEmail}
                </span>
                <span className="flex items-center gap-1.5 font-mono">
                  <Fingerprint className="w-3.5 h-3.5" />
                  UID: {uid}
                </span>
              </div>
            </div>
            <Button
              variant="outline"
              onClick={() => setView('kyc')}
              className="border-primary/30 text-primary shrink-0"
            >
              {kycLevel === 2 ? 'Управление' : 'Пройти верификацию'}
            </Button>
          </div>
        </Card>

        <div className="grid lg:grid-cols-[220px_1fr] gap-6">
          {/* Sidebar */}
          <nav className="flex lg:flex-col gap-1 overflow-x-auto lg:overflow-visible pb-2 lg:pb-0">
            {TABS.map((t) => {
              const active = tab === t.id
              return (
                <button
                  key={t.id}
                  onClick={() => setTab(t.id)}
                  className={cn(
                    'flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all whitespace-nowrap shrink-0 lg:w-full',
                    active
                      ? 'bg-primary/15 text-primary'
                      : 'text-muted-foreground hover:text-foreground hover:bg-muted/60'
                  )}
                >
                  <t.icon className={cn('w-[18px] h-[18px]', active && 'text-primary')} />
                  <span className="flex-1 text-left">{t.label}</span>
                  {active && <div className="hidden lg:block w-1 h-5 rounded-full bg-primary" />}
                </button>
              )
            })}
            <Separator className="hidden lg:block my-2" />
            <button
              onClick={handleLogout}
              className="hidden lg:flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl text-sm font-medium text-destructive hover:bg-destructive/10 transition-all w-full"
            >
              <LogOut className="w-[18px] h-[18px]" />
              Выйти
            </button>
          </nav>

          {/* Content */}
          <div>
            {tab === 'overview' && (
              <div className="space-y-6">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <Card className="p-5">
                    <div className="flex items-center justify-between mb-3">
                      <div className="text-xs text-muted-foreground">Общий баланс</div>
                      <CircleDollarSign className="w-4 h-4 text-primary" />
                    </div>
                    <div className="text-2xl font-bold tabular-nums">{formatPrice(totalRub, 'rub')}</div>
                    <div className="text-xs text-success mt-2 flex items-center gap-1">
                      <TrendingUp className="w-3 h-3" />
                      +2.18% за 24ч
                    </div>
                  </Card>
                  <Card className="p-5">
                    <div className="flex items-center justify-between mb-3">
                      <div className="text-xs text-muted-foreground">Открытые позиции</div>
                      <Wallet className="w-4 h-4 text-violet-400" />
                    </div>
                    <div className="text-2xl font-bold tabular-nums">{orders.length}</div>
                    <div className="text-xs text-muted-foreground mt-2">Активных сделок</div>
                  </Card>
                  <Card className="p-5">
                    <div className="flex items-center justify-between mb-3">
                      <div className="text-xs text-muted-foreground">KYC уровень</div>
                      <ShieldCheck className="w-4 h-4 text-success" />
                    </div>
                    <div className="text-2xl font-bold tabular-nums">{kycLevel} <span className="text-base text-muted-foreground">/ 2</span></div>
                    <div className="text-xs text-muted-foreground mt-2">{kycStatus === 'APPROVED' ? 'Верифицирован' : kycStatus === 'UNINITIATED' ? 'Не пройден' : 'На проверке'}</div>
                  </Card>
                </div>

                <Card className="p-6">
                  <h2 className="font-semibold mb-4">Мои активы</h2>
                  <div className="space-y-2">
                    {balances.map((b) => {
                      const priceRub = b.asset === 'RUB' ? 1 : b.asset === 'USDT' ? usdRub : tickers.find((t) => t.symbol === b.asset)?.priceRub || 0
                      const value = b.amount * priceRub
                      return (
                        <div key={b.asset} className="flex items-center justify-between py-2.5 border-b border-border last:border-0">
                          <div className="flex items-center gap-3">
                            <CoinIcon symbol={b.asset} size={32} />
                            <div>
                              <div className="font-semibold text-sm">{b.asset}</div>
                              <div className="text-xs text-muted-foreground">{formatAmount(b.amount, b.asset)}</div>
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="font-mono text-sm font-semibold tabular-nums">{formatPrice(value, 'rub')}</div>
                            <div className="text-xs text-muted-foreground">≈ {formatPrice(value / usdRub, 'usd')}</div>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </Card>

                <Card className="p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="font-semibold">Последние сделки</h2>
                    <Button variant="ghost" size="sm" onClick={() => setTab('history')} className="text-primary">
                      Вся история
                    </Button>
                  </div>
                  {orders.length === 0 ? (
                    <div className="text-center py-8 text-sm text-muted-foreground">
                      Сделок пока нет.{' '}
                      <button onClick={() => setView('trade')} className="text-primary underline">
                        Начать торговать
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {orders.slice(0, 5).map((o) => (
                        <div key={o.id} className="flex items-center justify-between py-2 border-b border-border last:border-0">
                          <div className="flex items-center gap-3">
                            <div className={cn('w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold', o.side === 'buy' ? 'bg-success/15 text-success' : 'bg-destructive/15 text-destructive')}>
                              {o.side === 'buy' ? 'BUY' : 'SELL'}
                            </div>
                            <div>
                              <div className="font-semibold text-sm">{o.pair}</div>
                              <div className="text-xs text-muted-foreground">{o.time}</div>
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="font-mono text-sm font-semibold tabular-nums">{formatPrice(o.total, 'rub')}</div>
                            <div className="text-xs text-muted-foreground">{formatAmount(o.quantity, o.pair.split('/')[0])}</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </Card>
              </div>
            )}

            {tab === 'assets' && (
              <Card className="p-0 overflow-hidden">
                <div className="p-6 pb-4">
                  <h2 className="font-semibold">Активы</h2>
                  <p className="text-xs text-muted-foreground mt-0.5">Реальные цены по рынку</p>
                </div>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="hover:bg-transparent border-border">
                        <TableHead className="pl-6">Актив</TableHead>
                        <TableHead className="text-right">Доступно</TableHead>
                        <TableHead className="text-right">Заблокировано</TableHead>
                        <TableHead className="text-right">Цена</TableHead>
                        <TableHead className="text-right pr-6">Стоимость</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {balances.map((b) => {
                        const priceRub = b.asset === 'RUB' ? 1 : b.asset === 'USDT' ? usdRub : tickers.find((t) => t.symbol === b.asset)?.priceRub || 0
                        const value = b.amount * priceRub
                        const locked = b.locked || 0
                        return (
                          <TableRow key={b.asset} className="border-border">
                            <TableCell className="pl-6">
                              <div className="flex items-center gap-2.5">
                                <CoinIcon symbol={b.asset} size={28} />
                                <div>
                                  <div className="font-semibold">{b.asset}</div>
                                  <div className="text-[11px] text-muted-foreground">
                                    {b.asset === 'RUB' ? 'Российский рубль' : b.asset === 'USDT' ? 'Tether' : b.asset}
                                  </div>
                                </div>
                              </div>
                            </TableCell>
                            <TableCell className="text-right font-mono text-sm tabular-nums">
                              {formatAmount(b.amount, b.asset)}
                            </TableCell>
                            <TableCell className="text-right font-mono text-sm text-muted-foreground tabular-nums">
                              {locked > 0 ? formatAmount(locked, b.asset) : '—'}
                            </TableCell>
                            <TableCell className="text-right font-mono text-sm tabular-nums">
                              {b.asset === 'RUB' ? '1 ₽' : formatPrice(priceRub, 'rub')}
                            </TableCell>
                            <TableCell className="pr-6 text-right font-mono text-sm font-semibold tabular-nums">
                              {formatPrice(value, 'rub')}
                            </TableCell>
                          </TableRow>
                        )
                      })}
                    </TableBody>
                  </Table>
                </div>
              </Card>
            )}

            {tab === 'history' && (
              <Card className="p-0 overflow-hidden">
                <div className="p-6 pb-4">
                  <h2 className="font-semibold">История операций</h2>
                  <p className="text-xs text-muted-foreground mt-0.5">Сделки и транзакции</p>
                </div>
                <div className="overflow-x-auto max-h-[600px] overflow-y-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="hover:bg-transparent border-border">
                        <TableHead className="pl-6">Время</TableHead>
                        <TableHead>Тип</TableHead>
                        <TableHead>Детали</TableHead>
                        <TableHead className="text-right">Сумма</TableHead>
                        <TableHead className="text-right pr-6">Статус</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {transactions.length === 0 && orders.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={5} className="text-center text-sm text-muted-foreground py-12">
                            История пуста
                          </TableCell>
                        </TableRow>
                      ) : (
                        <>
                          {orders.map((o) => (
                            <TableRow key={`o-${o.id}`} className="border-border">
                              <TableCell className="pl-6 text-xs text-muted-foreground">{o.time}</TableCell>
                              <TableCell>
                                <Badge variant="outline" className={cn(o.side === 'buy' ? 'text-success border-success/30' : 'text-destructive border-destructive/30')}>
                                  {o.side === 'buy' ? 'Покупка' : 'Продажа'}
                                </Badge>
                              </TableCell>
                              <TableCell className="text-sm">{o.pair} • {formatAmount(o.quantity, o.pair.split('/')[0])} @ {formatPrice(o.price, 'rub')}</TableCell>
                              <TableCell className="text-right font-mono text-sm tabular-nums">{formatPrice(o.total, 'rub')}</TableCell>
                              <TableCell className="pr-6 text-right">
                                <Badge variant="outline" className="text-success border-success/30 bg-success/5">Выполнено</Badge>
                              </TableCell>
                            </TableRow>
                          ))}
                          {transactions.map((t) => (
                            <TableRow key={`t-${t.id}`} className="border-border">
                              <TableCell className="pl-6 text-xs text-muted-foreground">{t.time}</TableCell>
                              <TableCell>
                                <Badge variant="outline" className="text-muted-foreground">
                                  {t.type === 'deposit' ? 'Пополнение' : t.type === 'withdrawal' ? 'Вывод' : t.type === 'trade' ? 'Сделка' : t.type === 'payment' ? 'Платёж' : 'Комиссия'}
                                </Badge>
                              </TableCell>
                              <TableCell className="text-sm">{t.asset}{t.address ? ` • ${t.address.slice(0, 10)}...` : ''}</TableCell>
                              <TableCell className={cn('text-right font-mono text-sm tabular-nums', t.amount >= 0 ? 'text-success' : 'text-destructive')}>
                                {t.amount >= 0 ? '+' : ''}{formatAmount(t.amount, t.asset)}
                              </TableCell>
                              <TableCell className="pr-6 text-right">
                                <Badge
                                  variant="outline"
                                  className={cn(
                                    t.status === 'COMPLETED' && 'text-success border-success/30 bg-success/5',
                                    t.status === 'PENDING' && 'text-warning border-warning/30 bg-warning/5',
                                    t.status === 'FAILED' && 'text-destructive border-destructive/30 bg-destructive/5'
                                  )}
                                >
                                  {t.status === 'COMPLETED' ? 'Выполнено' : t.status === 'PENDING' ? 'В ожидании' : 'Ошибка'}
                                </Badge>
                              </TableCell>
                            </TableRow>
                          ))}
                        </>
                      )}
                    </TableBody>
                  </Table>
                </div>
              </Card>
            )}

            {tab === 'security' && (
              <div className="space-y-5">
                <Card className="p-6">
                  <div className="flex items-center justify-between">
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 rounded-xl bg-success/15 flex items-center justify-center">
                        <Smartphone className="w-5 h-5 text-success" />
                      </div>
                      <div>
                        <h3 className="font-semibold">Двухфакторная аутентификация</h3>
                        <p className="text-sm text-muted-foreground mt-0.5">Защита через Google Authenticator или SMS</p>
                      </div>
                    </div>
                    <Switch checked={twoFa} onCheckedChange={setTwoFa} />
                  </div>
                  {twoFa && (
                    <div className="mt-4 pt-4 border-t border-border flex items-center gap-2 text-sm text-success">
                      <Check className="w-4 h-4" />
                      2FA активна • привязано устройство iPhone 15 Pro
                    </div>
                  )}
                </Card>

                <Card className="p-6">
                  <div className="flex items-center justify-between">
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 rounded-xl bg-primary/15 flex items-center justify-center">
                        <Shield className="w-5 h-5 text-primary" />
                      </div>
                      <div>
                        <h3 className="font-semibold">Антифишинговый код</h3>
                        <p className="text-sm text-muted-foreground mt-0.5">Код в письмах для защиты от подделки</p>
                      </div>
                    </div>
                    <Switch checked={antiPhishing} onCheckedChange={(v) => {
                      setAntiPhishing(v)
                      if (v) toast.success('Антифишинговый код установлен')
                    }} />
                  </div>
                  {antiPhishing && (
                    <div className="mt-4 pt-4 border-t border-border">
                      <Label className="text-xs text-muted-foreground">Ваш код</Label>
                      <div className="font-mono text-lg font-bold tracking-wider text-primary mt-1">RC-9F2A7K</div>
                    </div>
                  )}
                </Card>

                <Card className="p-6">
                  <div className="flex items-center justify-between">
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 rounded-xl bg-violet-400/15 flex items-center justify-center">
                        <KeyRound className="w-5 h-5 text-violet-400" />
                      </div>
                      <div>
                        <h3 className="font-semibold">Whitelist адресов вывода</h3>
                        <p className="text-sm text-muted-foreground mt-0.5">Только проверенные адреса могут получать выводы</p>
                      </div>
                    </div>
                    <Switch checked={whitelist} onCheckedChange={setWhitelist} />
                  </div>
                  {whitelist && (
                    <div className="mt-4 pt-4 border-t border-border space-y-2">
                      {['bc1qxy2k...dyf5hk', '0x742d35Cc...6634C0'].map((addr) => (
                        <div key={addr} className="flex items-center justify-between text-sm">
                          <span className="font-mono text-muted-foreground">{addr}</span>
                          <Badge variant="outline" className="text-success border-success/30">Подтверждён</Badge>
                        </div>
                      ))}
                    </div>
                  )}
                </Card>

                <Card className="p-6">
                  <h3 className="font-semibold mb-4 flex items-center gap-2">
                    <History className="w-4 h-4 text-primary" />
                    История входов
                  </h3>
                  <div className="space-y-3">
                    {MOCK_LOGIN_HISTORY.map((h, i) => (
                      <div key={i} className="flex items-center justify-between py-2 border-b border-border last:border-0">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center">
                            <Monitor className="w-4 h-4 text-muted-foreground" />
                          </div>
                          <div>
                            <div className="text-sm font-medium flex items-center gap-2">
                              {h.device}
                              {h.current && <Badge variant="outline" className="text-success border-success/30 bg-success/5">Сейчас</Badge>}
                            </div>
                            <div className="text-xs text-muted-foreground">{h.ip} • {h.location}</div>
                          </div>
                        </div>
                        <div className="text-xs text-muted-foreground">{h.time}</div>
                      </div>
                    ))}
                  </div>
                </Card>

                <Card className="p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="font-semibold flex items-center gap-2">
                      <Monitor className="w-4 h-4 text-primary" />
                      Активные сессии
                    </h3>
                    <Button
                      variant="outline"
                      size="sm"
                      className="text-destructive border-destructive/30 hover:bg-destructive/10"
                      onClick={() => toast.success('Все сессии завершены, кроме текущей')}
                    >
                      Завершить все
                    </Button>
                  </div>
                  <div className="space-y-3">
                    {MOCK_SESSIONS.map((s, i) => (
                      <div key={i} className="flex items-center justify-between py-2 border-b border-border last:border-0">
                        <div>
                          <div className="text-sm font-medium">{s.device}</div>
                          <div className="text-xs text-muted-foreground">{s.location} • {s.lastActive}</div>
                        </div>
                        {!s.current && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-destructive"
                            onClick={() => toast.success('Сессия завершена')}
                          >
                            Завершить
                          </Button>
                        )}
                      </div>
                    ))}
                  </div>
                </Card>
              </div>
            )}

            {tab === 'referrals' && (
              <div className="space-y-6">
                <Card className="relative overflow-hidden p-6 lg:p-8 bg-gradient-to-br from-primary/10 via-card to-card border-primary/20">
                  <div className="absolute -bottom-16 -right-16 w-56 h-56 rounded-full bg-primary/10 blur-3xl" aria-hidden />
                  <div className="relative">
                    <Badge variant="outline" className="mb-3 border-primary/30 text-primary">РЕФЕРАЛЬНАЯ ПРОГРАММА</Badge>
                    <h2 className="text-2xl font-bold mb-2">Приглашайте друзей — зарабатывайте</h2>
                    <p className="text-sm text-muted-foreground mb-6 max-w-lg">
                      Получайте 20% от торговых комиссий приглашённых пользователей.
                      Без ограничений по сумме вывода.
                    </p>
                    <div className="flex flex-col sm:flex-row items-stretch gap-3">
                      <div className="flex-1 rounded-xl bg-background/60 border border-border p-4">
                        <div className="text-xs text-muted-foreground">Ваш реферальный код</div>
                        <div className="text-2xl font-mono font-bold tracking-wider text-primary mt-1">Q49P0M7</div>
                      </div>
                      <div className="flex-1 rounded-xl bg-background/60 border border-border p-4 flex items-center justify-between">
                        <div>
                          <div className="text-xs text-muted-foreground">Ваша ссылка</div>
                          <div className="text-sm font-mono mt-1 truncate">ruscrypto.ru/r/Q49P0M7</div>
                        </div>
                        <Button size="icon" variant="ghost" onClick={handleCopyReferral} className="shrink-0">
                          {copied ? <Check className="w-4 h-4 text-success" /> : <Copy className="w-4 h-4" />}
                        </Button>
                      </div>
                    </div>
                    <div className="mt-4 flex flex-wrap gap-2">
                      <Button onClick={() => handleShare('Telegram')} variant="outline" size="sm" className="gap-2">
                        <Copy className="w-3.5 h-3.5" /> Telegram
                      </Button>
                      <Button onClick={() => handleShare('WhatsApp')} variant="outline" size="sm" className="gap-2">
                        <Copy className="w-3.5 h-3.5" /> WhatsApp
                      </Button>
                      <Button onClick={() => handleShare('VK')} variant="outline" size="sm" className="gap-2">
                        <Copy className="w-3.5 h-3.5" /> ВКонтакте
                      </Button>
                      <Button onClick={() => handleShare('Email')} variant="outline" size="sm" className="gap-2">
                        <Mail className="w-3.5 h-3.5" /> Email
                      </Button>
                    </div>
                  </div>
                </Card>

                <div className="grid sm:grid-cols-3 gap-4">
                  <Card className="p-5">
                    <div className="flex items-center justify-between mb-3">
                      <div className="text-xs text-muted-foreground">Приглашено</div>
                      <Gift className="w-4 h-4 text-primary" />
                    </div>
                    <div className="text-2xl font-bold tabular-nums">12</div>
                    <div className="text-xs text-muted-foreground mt-2">Из них активных: 8</div>
                  </Card>
                  <Card className="p-5">
                    <div className="flex items-center justify-between mb-3">
                      <div className="text-xs text-muted-foreground">Заработано</div>
                      <CircleDollarSign className="w-4 h-4 text-success" />
                    </div>
                    <div className="text-2xl font-bold tabular-nums text-success">{formatNumber(4800, 0)} ₽</div>
                    <div className="text-xs text-muted-foreground mt-2">Доступно к выводу</div>
                  </Card>
                  <Card className="p-5">
                    <div className="flex items-center justify-between mb-3">
                      <div className="text-xs text-muted-foreground">Структура</div>
                      <TrendingUp className="w-4 h-4 text-violet-400" />
                    </div>
                    <div className="text-2xl font-bold tabular-nums">2 ур.</div>
                    <div className="text-xs text-muted-foreground mt-2">5 на втором уровне</div>
                  </Card>
                </div>

                <Card className="p-6">
                  <h3 className="font-semibold mb-4">Как это работает</h3>
                  <div className="grid sm:grid-cols-3 gap-4">
                    {[
                      { n: '1', title: 'Поделитесь ссылкой', desc: 'Отправьте реферальную ссылку друзьям' },
                      { n: '2', title: 'Они регистрируются', desc: 'И проходят верификацию KYC' },
                      { n: '3', title: 'Вы получаете 20%', desc: 'От их торговых комиссий навсегда' },
                    ].map((s) => (
                      <div key={s.n} className="rounded-xl bg-muted/40 p-4">
                        <div className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold text-sm mb-3">
                          {s.n}
                        </div>
                        <div className="font-semibold text-sm">{s.title}</div>
                        <div className="text-xs text-muted-foreground mt-1">{s.desc}</div>
                      </div>
                    ))}
                  </div>
                </Card>
              </div>
            )}

            {tab === 'settings' && (
              <div className="space-y-6">
                <Card className="p-6">
                  <h3 className="font-semibold mb-5 flex items-center gap-2">
                    <UserCircle className="w-4 h-4 text-primary" />
                    Личные данные
                  </h3>
                  <div className="grid sm:grid-cols-2 gap-4">
                    <div>
                      <Label className="text-xs text-muted-foreground">Имя</Label>
                      <Input value={nameInput} onChange={(e) => setNameInput(e.target.value)} className="mt-1.5" />
                    </div>
                    <div>
                      <Label className="text-xs text-muted-foreground">Email</Label>
                      <Input value={emailInput} onChange={(e) => setEmailInput(e.target.value)} className="mt-1.5" type="email" />
                    </div>
                  </div>
                  <Button onClick={handleSaveSettings} className="bg-primary text-primary-foreground hover:bg-primary/90 mt-5">
                    Сохранить изменения
                  </Button>
                </Card>

                <Card className="p-6">
                  <h3 className="font-semibold mb-5 flex items-center gap-2">
                    <Bell className="w-4 h-4 text-primary" />
                    Уведомления
                  </h3>
                  <div className="space-y-1">
                    {[
                      { label: 'Push-уведомления', desc: 'На мобильное устройство', value: notifPush, setter: setNotifPush },
                      { label: 'Email-уведомления', desc: 'На почту', value: notifEmail, setter: setNotifEmail },
                      { label: 'SMS-уведомления', desc: 'Только критические операции', value: notifSms, setter: setNotifSms },
                      { label: 'Уведомления о сделках', desc: 'Исполнение ордеров, PnL', value: notifTrades, setter: setNotifTrades },
                    ].map((n) => (
                      <div key={n.label} className="flex items-center justify-between py-3 border-b border-border last:border-0">
                        <div>
                          <div className="text-sm font-medium">{n.label}</div>
                          <div className="text-xs text-muted-foreground mt-0.5">{n.desc}</div>
                        </div>
                        <Switch checked={n.value} onCheckedChange={n.setter} />
                      </div>
                    ))}
                  </div>
                </Card>

                <Card className="p-6">
                  <h3 className="font-semibold mb-5 flex items-center gap-2">
                    <Globe2 className="w-4 h-4 text-primary" />
                    Язык и оформление
                  </h3>
                  <div className="space-y-4">
                    <div>
                      <Label className="text-xs text-muted-foreground">Язык интерфейса</Label>
                      <Select value={language} onValueChange={setLanguage}>
                        <SelectTrigger className="mt-1.5 w-full sm:w-60">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="ru">Русский</SelectItem>
                          <SelectItem value="en">English</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="flex items-center justify-between py-3 border-t border-border">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-lg bg-violet-400/15 flex items-center justify-center">
                          <Moon className="w-4 h-4 text-violet-400" />
                        </div>
                        <div>
                          <div className="text-sm font-medium">Тёмная тема</div>
                          <div className="text-xs text-muted-foreground">Активна по умолчанию</div>
                        </div>
                      </div>
                      <Badge variant="outline" className="text-success border-success/30 bg-success/5">Включена</Badge>
                    </div>
                  </div>
                </Card>

                <Card className="p-6 border-destructive/20">
                  <h3 className="font-semibold mb-3 text-destructive">Опасная зона</h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    Выход из аккаунта завершит все сессии, кроме текущей.
                  </p>
                  <Button
                    onClick={handleLogout}
                    variant="outline"
                    className="text-destructive border-destructive/30 hover:bg-destructive/10 gap-2"
                  >
                    <LogOut className="w-4 h-4" />
                    Выйти из аккаунта
                  </Button>
                </Card>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
