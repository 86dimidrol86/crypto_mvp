'use client'

import { useEffect, useState } from 'react'
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
  Users,
} from 'lucide-react'
import { useAppStore } from '@/lib/store'
import { useI18n } from '@/lib/use-i18n'
import { useApi } from '@/lib/use-api'
import { useMounted } from '@/lib/use-mounted'
import { fetchTickers } from '@/lib/market'
import type { Balance, CoinTicker } from '@/lib/types'
import {
  formatPrice,
  formatNumber,
  formatAmount,
  timeAgo,
} from '@/lib/format'
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
import { KpiCardSkeleton } from '@/components/page-skeleton'

type Tab = 'overview' | 'assets' | 'history' | 'security' | 'referrals' | 'settings'

// Shape returned by GET /api/auth
interface ApiUser {
  id: string
  email: string
  name: string | null
  phone: string | null
  kycLevel: number
  kycStatus: string
  qualified: boolean
  role: string
  balances: Balance[]
}

const TABS: { id: Tab; labelKey: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { id: 'overview', labelKey: 'profile.tab.overview', icon: UserCircle },
  { id: 'assets', labelKey: 'profile.tab.assets', icon: Wallet },
  { id: 'history', labelKey: 'profile.tab.history', icon: History },
  { id: 'security', labelKey: 'profile.tab.security', icon: ShieldCheck },
  { id: 'referrals', labelKey: 'profile.tab.referrals', icon: Gift },
  { id: 'settings', labelKey: 'profile.tab.settings', icon: Settings },
]

const FALLBACK_USD_RUB = 92.5

// GET /api/profile/login-history
interface LoginHistoryEntry {
  id: string
  ip: string
  device: string
  browser: string
  location: string
  success: boolean
  current: boolean
  createdAt: string
}

// GET /api/profile/sessions
interface SessionEntry {
  id: string
  device: string
  location: string
  ip: string
  current: boolean
  lastActiveAt: string
}

// GET /api/profile/referral
interface ReferralEntry {
  id: string
  referredEmail: string
  reward: number
  status: string
  createdAt: string
}

interface ReferralData {
  code: string
  invitedCount: number
  activeCount: number
  earnedTotal: number
  referrals: ReferralEntry[]
}

const REFERRAL_STATUS_INFO: Record<string, { labelKey: string; className: string }> = {
  REWARDED: { labelKey: 'profile.status.REWARDED', className: 'text-success border-success/30 bg-success/5' },
  VERIFIED: { labelKey: 'profile.status.VERIFIED', className: 'text-primary border-primary/30 bg-primary/5' },
  REGISTERED: { labelKey: 'profile.status.REGISTERED', className: 'text-muted-foreground border-muted-foreground/30' },
}

export function ProfileView() {
  const { t, locale, setLocale } = useI18n()
  const userName = useAppStore((s) => s.userName)
  const userEmail = useAppStore((s) => s.userEmail)
  const isAuthed = useAppStore((s) => s.isAuthed)
  const kycLevel = useAppStore((s) => s.kycLevel)
  const kycStatus = useAppStore((s) => s.kycStatus)
  const storeBalances = useAppStore((s) => s.balances)
  const orders = useAppStore((s) => s.orders)
  const transactions = useAppStore((s) => s.transactions)
  const logout = useAppStore((s) => s.logout)
  const setView = useAppStore((s) => s.setView)

  // Hybrid: prefer /api/auth for cross-session persisted user data; fall back to store
  const { data: apiUser, loading: authLoading } = useApi<ApiUser>('/api/auth')
  const apiBalances =
    apiUser?.balances && apiUser.balances.length > 0 ? apiUser.balances : null
  const balances: Balance[] = apiBalances ?? storeBalances
  const effectiveKycLevel: number = apiUser?.kycLevel ?? kycLevel
  const effectiveKycStatus: string = apiUser?.kycStatus ?? kycStatus

  // Real API-backed data for security + referral tabs
  const mounted = useMounted()
  const { data: loginHistory, loading: loginHistoryLoading } = useApi<LoginHistoryEntry[]>(
    '/api/profile/login-history'
  )
  const { data: sessions, loading: sessionsLoading } = useApi<SessionEntry[]>(
    '/api/profile/sessions'
  )
  const { data: referralData, loading: referralLoading } = useApi<ReferralData>(
    '/api/profile/referral'
  )
  const referralCode = referralData?.code || '—'
  const referralLink = referralCode !== '—' ? `ruscrypto.ru/r/${referralCode}` : 'ruscrypto.ru/r/—'

  const [tab, setTab] = useState<Tab>('overview')
  const [tickers, setTickers] = useState<CoinTicker[]>([])
  const [twoFa, setTwoFa] = useState(true)
  const [antiPhishing, setAntiPhishing] = useState(false)
  const [whitelist, setWhitelist] = useState(false)
  const [notifPush, setNotifPush] = useState(true)
  const [notifEmail, setNotifEmail] = useState(true)
  const [notifSms, setNotifSms] = useState(false)
  const [notifTrades, setNotifTrades] = useState(true)
  const [nameInput, setNameInput] = useState(apiUser?.name || userName || '')
  const [emailInput, setEmailInput] = useState(apiUser?.email || userEmail || 'ivan.ivanov@ruscrypto.ru')
  const [language, setLanguage] = useState(locale)
  const [copied, setCopied] = useState(false)

  // Keep settings inputs in sync with the API once it loads
  useEffect(() => {
    if (apiUser?.name) setNameInput(apiUser.name)
    if (apiUser?.email) setEmailInput(apiUser.email)
  }, [apiUser?.name, apiUser?.email])

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

  const displayName = apiUser?.name || userName || t('profile.defaultName')
  const displayEmail = apiUser?.email || userEmail || 'ivan.ivanov@ruscrypto.ru'
  const uid = 'RU-7842-9241'
  const kycLabel = effectiveKycLevel === 0 ? t('profile.kyc.none') : effectiveKycLevel === 1 ? t('profile.kyc.lv1') : t('profile.kyc.lv2')
  const kycBadgeColor =
    effectiveKycLevel === 0
      ? 'border-muted-foreground/30 text-muted-foreground'
      : effectiveKycLevel === 1
      ? 'border-warning/30 text-warning bg-warning/5'
      : 'border-success/30 text-success bg-success/5'

  const handleLogout = () => {
    logout()
    setView('home')
    toast.success(t('profile.toast.logout'))
  }

  const handleSaveSettings = () => {
    setLocale(language as 'ru' | 'en')
    toast.success(t('profile.toast.saved'), {
      description: t('profile.toast.savedDesc'),
    })
  }

  const handleCopyReferral = () => {
    if (!referralCode || referralCode === '—') return
    navigator.clipboard?.writeText(referralCode)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
    toast.success(t('profile.toast.refCopied'))
  }

  const handleShare = (platform: string) => {
    toast.success(`${t('profile.toast.shareVia')} ${platform}`, {
      description: t('profile.toast.shareDesc'),
    })
  }

  // If not authed — show CTA
  if (!isAuthed) {
    return (
      <div className="flex-1 flex items-center justify-center p-4">
        <Card className="p-5 max-w-md text-center">
          <div className="w-14 h-14 rounded-2xl bg-primary/15 flex items-center justify-center mx-auto mb-3">
            <UserCircle className="w-7 h-7 text-primary" />
          </div>
          <h2 className="text-lg font-bold mb-1.5">{t('profile.loginRequired.title')}</h2>
          <p className="text-xs text-muted-foreground mb-4">
            {t('profile.loginRequired.desc')}
          </p>
          <Button
            onClick={() => setView('auth')}
            className="bg-primary text-primary-foreground hover:bg-primary/90 w-full"
          >
            {t('profile.loginRequired.btn')}
          </Button>
        </Card>
      </div>
    )
  }

  return (
    <div className="flex-1">
      <div className="max-w-[1400px] mx-auto px-3 lg:px-5 py-4">
        {/* Header */}
        <Card className="relative overflow-hidden p-4 lg:p-5 mb-3 bg-gradient-to-br from-primary/10 via-card to-card border-primary/20">
          <div className="absolute -top-20 -right-20 w-64 h-64 rounded-full bg-primary/10 blur-3xl" aria-hidden />
          <div className="relative flex flex-col sm:flex-row items-start sm:items-center gap-3">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center text-2xl font-black text-black shadow-lg shadow-amber-500/20 shrink-0">
              {displayName.slice(0, 1).toUpperCase()}
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2.5 flex-wrap">
                <h1 className="text-xl font-bold">{displayName}</h1>
                <Badge variant="outline" className={cn('gap-1.5', kycBadgeColor)}>
                  <BadgeCheck className="w-3.5 h-3.5" />
                  KYC {kycLabel}
                </Badge>
              </div>
              <div className="text-xs text-muted-foreground mt-1 flex items-center gap-3 flex-wrap">
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
              {effectiveKycLevel === 2 ? t('profile.cta.manage') : t('profile.cta.verify')}
            </Button>
          </div>
        </Card>

        <div className="grid lg:grid-cols-[220px_1fr] gap-4">
          {/* Sidebar */}
          <nav className="flex lg:flex-col gap-1 overflow-x-auto lg:overflow-visible pb-2 lg:pb-0">
            {TABS.map((t) => {
              const active = tab === t.id
              return (
                <button
                  key={t.id}
                  onClick={() => setTab(t.id)}
                  className={cn(
                    'flex items-center gap-2.5 px-3 py-2 rounded-xl text-sm font-medium transition-all whitespace-nowrap shrink-0 lg:w-full',
                    active
                      ? 'bg-primary/15 text-primary'
                      : 'text-muted-foreground hover:text-foreground hover:bg-muted/60'
                  )}
                >
                  <t.icon className={cn('w-[18px] h-[18px]', active && 'text-primary')} />
                  <span className="flex-1 text-left">{t(t.labelKey)}</span>
                  {active && <div className="hidden lg:block w-1 h-5 rounded-full bg-primary" />}
                </button>
              )
            })}
            <Separator className="hidden lg:block my-2" />
            <button
              onClick={handleLogout}
              className="hidden lg:flex items-center gap-2.5 px-3 py-2 rounded-xl text-sm font-medium text-destructive hover:bg-destructive/10 transition-all w-full"
            >
              <LogOut className="w-[18px] h-[18px]" />
              {t('profile.logoutBtn')}
            </button>
          </nav>

          {/* Content */}
          <div>
            {tab === 'overview' && (
              <div className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {authLoading && !apiUser ? (
                    <>
                      <KpiCardSkeleton />
                      <KpiCardSkeleton />
                      <KpiCardSkeleton />
                    </>
                  ) : (
                    <>
                      <Card className="p-4">
                        <div className="flex items-center justify-between mb-2">
                          <div className="text-xs text-muted-foreground">{t('profile.overview.totalBalance')}</div>
                          <CircleDollarSign className="w-4 h-4 text-primary" />
                        </div>
                        <div className="text-xl font-bold tabular-nums">{formatPrice(totalRub, 'rub')}</div>
                        <div className="text-xs text-success mt-1.5 flex items-center gap-1">
                          <TrendingUp className="w-3 h-3" />
                          {t('profile.overview.pnl24')}
                        </div>
                      </Card>
                      <Card className="p-4">
                        <div className="flex items-center justify-between mb-2">
                          <div className="text-xs text-muted-foreground">{t('profile.overview.positions')}</div>
                          <Wallet className="w-4 h-4 text-violet-400" />
                        </div>
                        <div className="text-xl font-bold tabular-nums">{orders.length}</div>
                        <div className="text-xs text-muted-foreground mt-1.5">{t('profile.overview.activeTrades')}</div>
                      </Card>
                      <Card className="p-4">
                        <div className="flex items-center justify-between mb-2">
                          <div className="text-xs text-muted-foreground">{t('profile.overview.kycLevel')}</div>
                          <ShieldCheck className="w-4 h-4 text-success" />
                        </div>
                        <div className="text-xl font-bold tabular-nums">{effectiveKycLevel} <span className="text-sm text-muted-foreground">/ 2</span></div>
                        <div className="text-xs text-muted-foreground mt-1.5">{effectiveKycStatus === 'APPROVED' || effectiveKycStatus === 'ACTIVE' ? t('profile.kyc.verified') : effectiveKycStatus === 'UNINITIATED' ? t('profile.kyc.notPassed') : t('profile.kyc.onReview')}</div>
                      </Card>
                    </>
                  )}
                </div>

                <Card className="p-4">
                  <h2 className="font-semibold mb-3">{t('profile.overview.myAssets')}</h2>
                  <div className="space-y-1.5">
                    {balances.map((b) => {
                      const priceRub = b.asset === 'RUB' ? 1 : b.asset === 'USDT' ? usdRub : tickers.find((t) => t.symbol === b.asset)?.priceRub || 0
                      const value = b.amount * priceRub
                      return (
                        <div key={b.asset} className="flex items-center justify-between py-2 border-b border-border last:border-0">
                          <div className="flex items-center gap-2.5">
                            <CoinIcon symbol={b.asset} size={28} />
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

                <Card className="p-4">
                  <div className="flex items-center justify-between mb-3">
                    <h2 className="font-semibold">{t('profile.overview.recentTrades')}</h2>
                    <Button variant="ghost" size="sm" onClick={() => setTab('history')} className="text-primary">
                      {t('profile.overview.viewAll')}
                    </Button>
                  </div>
                  {orders.length === 0 ? (
                    <div className="text-center py-6 text-sm text-muted-foreground">
                      {t('profile.overview.noTrades')}{' '}
                      <button onClick={() => setView('trade')} className="text-primary underline">
                        {t('profile.overview.startTrading')}
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-1.5">
                      {orders.slice(0, 5).map((o) => (
                        <div key={o.id} className="flex items-center justify-between py-1.5 border-b border-border last:border-0">
                          <div className="flex items-center gap-2.5">
                            <div className={cn('w-7 h-7 rounded-lg flex items-center justify-center text-[10px] font-bold', o.side === 'buy' ? 'bg-success/15 text-success' : 'bg-destructive/15 text-destructive')}>
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
                <div className="p-4 pb-2.5">
                  <h2 className="font-semibold">{t('profile.assets.title')}</h2>
                  <p className="text-xs text-muted-foreground mt-0.5">{t('profile.assets.subtitle')}</p>
                </div>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="hover:bg-transparent border-border">
                        <TableHead className="pl-4">{t('profile.assets.col.asset')}</TableHead>
                        <TableHead className="text-right">{t('profile.assets.col.available')}</TableHead>
                        <TableHead className="text-right">{t('profile.assets.col.locked')}</TableHead>
                        <TableHead className="text-right">{t('profile.assets.col.price')}</TableHead>
                        <TableHead className="text-right pr-4">{t('profile.assets.col.value')}</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {balances.map((b) => {
                        const priceRub = b.asset === 'RUB' ? 1 : b.asset === 'USDT' ? usdRub : tickers.find((t) => t.symbol === b.asset)?.priceRub || 0
                        const value = b.amount * priceRub
                        const locked = b.locked || 0
                        return (
                          <TableRow key={b.asset} className="border-border">
                            <TableCell className="pl-4">
                              <div className="flex items-center gap-2">
                                <CoinIcon symbol={b.asset} size={24} />
                                <div>
                                  <div className="font-semibold">{b.asset}</div>
                                  <div className="text-[11px] text-muted-foreground">
                                    {b.asset === 'RUB' ? t('wallet.asset.rub') : b.asset === 'USDT' ? t('wallet.asset.usdt') : b.asset}
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
                            <TableCell className="pr-4 text-right font-mono text-sm font-semibold tabular-nums">
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
                <div className="p-4 pb-2.5">
                  <h2 className="font-semibold">{t('profile.history.title')}</h2>
                  <p className="text-xs text-muted-foreground mt-0.5">{t('profile.history.subtitle')}</p>
                </div>
                <div className="overflow-x-auto max-h-[600px] overflow-y-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="hover:bg-transparent border-border">
                        <TableHead className="pl-4">{t('profile.history.col.time')}</TableHead>
                        <TableHead>{t('profile.history.col.type')}</TableHead>
                        <TableHead>{t('profile.history.col.details')}</TableHead>
                        <TableHead className="text-right">{t('profile.history.col.amount')}</TableHead>
                        <TableHead className="text-right pr-4">{t('profile.history.col.status')}</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {transactions.length === 0 && orders.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={5} className="text-center text-sm text-muted-foreground py-10">
                            {t('profile.history.empty')}
                          </TableCell>
                        </TableRow>
                      ) : (
                        <>
                          {orders.map((o) => (
                            <TableRow key={`o-${o.id}`} className="border-border">
                              <TableCell className="pl-4 text-xs text-muted-foreground">{o.time}</TableCell>
                              <TableCell>
                                <Badge variant="outline" className={cn(o.side === 'buy' ? 'text-success border-success/30' : 'text-destructive border-destructive/30')}>
                                  {o.side === 'buy' ? t('profile.history.buy') : t('profile.history.sell')}
                                </Badge>
                              </TableCell>
                              <TableCell className="text-sm">{o.pair} • {formatAmount(o.quantity, o.pair.split('/')[0])} @ {formatPrice(o.price, 'rub')}</TableCell>
                              <TableCell className="text-right font-mono text-sm tabular-nums">{formatPrice(o.total, 'rub')}</TableCell>
                              <TableCell className="pr-4 text-right">
                                <Badge variant="outline" className="text-success border-success/30 bg-success/5">{t('profile.history.completed')}</Badge>
                              </TableCell>
                            </TableRow>
                          ))}
                          {transactions.map((t) => (
                            <TableRow key={`t-${t.id}`} className="border-border">
                              <TableCell className="pl-4 text-xs text-muted-foreground">{t.time}</TableCell>
                              <TableCell>
                                <Badge variant="outline" className="text-muted-foreground">
                                  {t.type === 'deposit' ? t('profile.history.deposit') : t.type === 'withdrawal' ? t('profile.history.withdrawal') : t.type === 'trade' ? t('profile.history.trade') : t.type === 'payment' ? t('profile.history.payment') : t('profile.history.fee')}
                                </Badge>
                              </TableCell>
                              <TableCell className="text-sm">{t.asset}{t.address ? ` • ${t.address.slice(0, 10)}...` : ''}</TableCell>
                              <TableCell className={cn('text-right font-mono text-sm tabular-nums', t.amount >= 0 ? 'text-success' : 'text-destructive')}>
                                {t.amount >= 0 ? '+' : ''}{formatAmount(t.amount, t.asset)}
                              </TableCell>
                              <TableCell className="pr-4 text-right">
                                <Badge
                                  variant="outline"
                                  className={cn(
                                    t.status === 'COMPLETED' && 'text-success border-success/30 bg-success/5',
                                    t.status === 'PENDING' && 'text-warning border-warning/30 bg-warning/5',
                                    t.status === 'FAILED' && 'text-destructive border-destructive/30 bg-destructive/5'
                                  )}
                                >
                                  {t.status === 'COMPLETED' ? t('profile.history.completed') : t.status === 'PENDING' ? t('profile.history.pending') : t('profile.history.failed')}
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
              <div className="space-y-4">
                <Card className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-start gap-2.5">
                      <div className="w-9 h-9 rounded-xl bg-success/15 flex items-center justify-center">
                        <Smartphone className="w-5 h-5 text-success" />
                      </div>
                      <div>
                        <h3 className="font-semibold">{t('profile.security.2fa.title')}</h3>
                        <p className="text-xs text-muted-foreground mt-0.5">{t('profile.security.2fa.subtitle')}</p>
                      </div>
                    </div>
                    <Switch checked={twoFa} onCheckedChange={setTwoFa} />
                  </div>
                  {twoFa && (
                    <div className="mt-3 pt-3 border-t border-border flex items-center gap-2 text-sm text-success">
                      <Check className="w-4 h-4" />
                      {t('profile.security.2fa.active')}
                    </div>
                  )}
                </Card>

                <Card className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-start gap-2.5">
                      <div className="w-9 h-9 rounded-xl bg-primary/15 flex items-center justify-center">
                        <Shield className="w-5 h-5 text-primary" />
                      </div>
                      <div>
                        <h3 className="font-semibold">{t('profile.security.antiphishing.title')}</h3>
                        <p className="text-xs text-muted-foreground mt-0.5">{t('profile.security.antiphishing.subtitle')}</p>
                      </div>
                    </div>
                    <Switch checked={antiPhishing} onCheckedChange={(v) => {
                      setAntiPhishing(v)
                      if (v) toast.success(t('profile.security.antiphishing.toast'))
                    }} />
                  </div>
                  {antiPhishing && (
                    <div className="mt-3 pt-3 border-t border-border">
                      <Label className="text-xs text-muted-foreground">{t('profile.security.antiphishing.label')}</Label>
                      <div className="font-mono text-base font-bold tracking-wider text-primary mt-1">RC-9F2A7K</div>
                    </div>
                  )}
                </Card>

                <Card className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-start gap-2.5">
                      <div className="w-9 h-9 rounded-xl bg-violet-400/15 flex items-center justify-center">
                        <KeyRound className="w-5 h-5 text-violet-400" />
                      </div>
                      <div>
                        <h3 className="font-semibold">{t('profile.security.whitelist.title')}</h3>
                        <p className="text-xs text-muted-foreground mt-0.5">{t('profile.security.whitelist.subtitle')}</p>
                      </div>
                    </div>
                    <Switch checked={whitelist} onCheckedChange={setWhitelist} />
                  </div>
                  {whitelist && (
                    <div className="mt-3 pt-3 border-t border-border space-y-1.5">
                      {['bc1qxy2k...dyf5hk', '0x742d35Cc...6634C0'].map((addr) => (
                        <div key={addr} className="flex items-center justify-between text-sm">
                          <span className="font-mono text-muted-foreground">{addr}</span>
                          <Badge variant="outline" className="text-success border-success/30">{t('profile.security.whitelist.confirmed')}</Badge>
                        </div>
                      ))}
                    </div>
                  )}
                </Card>

                <Card className="p-4">
                  <h3 className="font-semibold mb-3 flex items-center gap-2">
                    <History className="w-4 h-4 text-primary" />
                    {t('profile.security.loginHistory.title')}
                  </h3>
                  <div className="space-y-2 max-h-96 overflow-y-auto">
                    {loginHistoryLoading ? (
                      Array.from({ length: 4 }).map((_, i) => (
                        <div key={i} className="flex items-center gap-2.5 py-1.5">
                          <div className="w-8 h-8 rounded-lg bg-muted animate-pulse" />
                          <div className="flex-1 space-y-1.5">
                            <div className="h-3 w-1/3 bg-muted rounded animate-pulse" />
                            <div className="h-2.5 w-1/2 bg-muted/60 rounded animate-pulse" />
                          </div>
                          <div className="h-2.5 w-16 bg-muted/60 rounded animate-pulse" />
                        </div>
                      ))
                    ) : loginHistory && loginHistory.length > 0 ? (
                      loginHistory.map((h) => {
                        const isMobile = /iphone|android|ipad|app/i.test(h.device)
                        const DeviceIcon = !h.success ? KeyRound : isMobile ? Smartphone : Monitor
                        return (
                          <div key={h.id} className="flex items-center justify-between py-1.5 border-b border-border last:border-0">
                            <div className="flex items-center gap-2.5 min-w-0">
                              <div className={cn('w-8 h-8 rounded-lg flex items-center justify-center shrink-0', h.success ? 'bg-muted' : 'bg-destructive/10')}>
                                <DeviceIcon className={cn('w-4 h-4', h.success ? 'text-muted-foreground' : 'text-destructive')} />
                              </div>
                              <div className="min-w-0">
                                <div className="text-sm font-medium flex items-center gap-2">
                                  <span className="truncate">{h.device}</span>
                                  <span className="text-muted-foreground text-xs shrink-0">• {h.browser}</span>
                                  {h.current && <Badge variant="outline" className="text-success border-success/30 bg-success/5 shrink-0">{t('profile.security.loginHistory.current')}</Badge>}
                                  {!h.success && <Badge variant="outline" className="text-destructive border-destructive/30 bg-destructive/5 shrink-0">{t('profile.security.loginHistory.failed')}</Badge>}
                                </div>
                                <div className="text-xs text-muted-foreground font-mono tabular-nums truncate">{h.ip} • {h.location}</div>
                              </div>
                            </div>
                            <div className="text-xs text-muted-foreground whitespace-nowrap shrink-0 ml-2">
                              {mounted ? timeAgo(h.createdAt) : ''}
                            </div>
                          </div>
                        )
                      })
                    ) : (
                      <div className="text-center py-6 text-sm text-muted-foreground">{t('profile.security.loginHistory.empty')}</div>
                    )}
                  </div>
                </Card>

                <Card className="p-4">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="font-semibold flex items-center gap-2">
                      <Monitor className="w-4 h-4 text-primary" />
                      {t('profile.security.sessions.title')}
                    </h3>
                    <Button
                      variant="outline"
                      size="sm"
                      className="text-destructive border-destructive/30 hover:bg-destructive/10"
                      onClick={() => toast.success(t('profile.security.sessions.terminateAllToast'))}
                    >
                      {t('profile.security.sessions.terminateAll')}
                    </Button>
                  </div>
                  <div className="space-y-2">
                    {sessionsLoading ? (
                      Array.from({ length: 3 }).map((_, i) => (
                        <div key={i} className="flex items-center justify-between py-1.5">
                          <div className="space-y-1.5">
                            <div className="h-3 w-32 bg-muted rounded animate-pulse" />
                            <div className="h-2.5 w-48 bg-muted/60 rounded animate-pulse" />
                          </div>
                          <div className="h-6 w-20 bg-muted/60 rounded animate-pulse" />
                        </div>
                      ))
                    ) : sessions && sessions.length > 0 ? (
                      sessions.map((s) => (
                        <div key={s.id} className="flex items-center justify-between py-1.5 border-b border-border last:border-0">
                          <div className="min-w-0">
                            <div className="text-sm font-medium flex items-center gap-2">
                              <span className="truncate">{s.device}</span>
                              {s.current && <Badge variant="outline" className="text-success border-success/30 bg-success/5 shrink-0">{t('profile.security.sessions.current')}</Badge>}
                            </div>
                            <div className="text-xs text-muted-foreground">{s.location} • {mounted ? timeAgo(s.lastActiveAt) : ''}</div>
                          </div>
                          {!s.current && (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-destructive shrink-0"
                              onClick={() => toast.success(t('profile.security.sessions.terminateToast'))}
                            >
                              {t('profile.security.sessions.terminate')}
                            </Button>
                          )}
                        </div>
                      ))
                    ) : (
                      <div className="text-center py-6 text-sm text-muted-foreground">{t('profile.security.sessions.empty')}</div>
                    )}
                  </div>
                </Card>
              </div>
            )}

            {tab === 'referrals' && (
              <div className="space-y-4">
                <Card className="relative overflow-hidden p-4 lg:p-5 bg-gradient-to-br from-primary/10 via-card to-card border-primary/20">
                  <div className="absolute -bottom-16 -right-16 w-56 h-56 rounded-full bg-primary/10 blur-3xl" aria-hidden />
                  <div className="relative">
                    <Badge variant="outline" className="mb-2 border-primary/30 text-primary">{t('profile.referrals.badge')}</Badge>
                    <h2 className="text-xl font-bold mb-1.5">{t('profile.referrals.title')}</h2>
                    <p className="text-xs text-muted-foreground mb-4 max-w-lg">
                      {t('profile.referrals.desc')}
                    </p>
                    <div className="flex flex-col sm:flex-row items-stretch gap-2.5">
                      <div className="flex-1 rounded-xl bg-background/60 border border-border p-3">
                        <div className="text-xs text-muted-foreground">{t('profile.referrals.codeLabel')}</div>
                        <div className="text-xl font-mono font-bold tracking-wider text-primary mt-1">
                          {referralLoading ? <span className="opacity-50">······</span> : referralCode}
                        </div>
                      </div>
                      <div className="flex-1 rounded-xl bg-background/60 border border-border p-3 flex items-center justify-between">
                        <div className="min-w-0">
                          <div className="text-xs text-muted-foreground">{t('profile.referrals.linkLabel')}</div>
                          <div className="text-sm font-mono mt-1 truncate">
                            {referralLoading ? <span className="opacity-50">ruscrypto.ru/r/······</span> : referralLink}
                          </div>
                        </div>
                        <Button size="icon" variant="ghost" onClick={handleCopyReferral} className="shrink-0" disabled={referralLoading || referralCode === '—'}>
                          {copied ? <Check className="w-4 h-4 text-success" /> : <Copy className="w-4 h-4" />}
                        </Button>
                      </div>
                    </div>
                    <div className="mt-3 flex flex-wrap gap-2">
                      <Button onClick={() => handleShare('Telegram')} variant="outline" size="sm" className="gap-2">
                        <Copy className="w-3.5 h-3.5" /> Telegram
                      </Button>
                      <Button onClick={() => handleShare('WhatsApp')} variant="outline" size="sm" className="gap-2">
                        <Copy className="w-3.5 h-3.5" /> WhatsApp
                      </Button>
                      <Button onClick={() => handleShare('VK')} variant="outline" size="sm" className="gap-2">
                        <Copy className="w-3.5 h-3.5" /> {t('profile.referrals.vk')}
                      </Button>
                      <Button onClick={() => handleShare('Email')} variant="outline" size="sm" className="gap-2">
                        <Mail className="w-3.5 h-3.5" /> Email
                      </Button>
                    </div>
                  </div>
                </Card>

                <div className="grid sm:grid-cols-3 gap-3">
                  <Card className="p-4">
                    <div className="flex items-center justify-between mb-2">
                      <div className="text-xs text-muted-foreground">{t('profile.referrals.invitedLabel')}</div>
                      <Gift className="w-4 h-4 text-primary" />
                    </div>
                    <div className="text-xl font-bold tabular-nums">
                      {referralLoading ? <span className="opacity-50">—</span> : formatNumber(referralData?.invitedCount ?? 0, 0)}
                    </div>
                    <div className="text-xs text-muted-foreground mt-1.5">{t('profile.referrals.activeOf')} {referralLoading ? '—' : formatNumber(referralData?.activeCount ?? 0, 0)}</div>
                  </Card>
                  <Card className="p-4">
                    <div className="flex items-center justify-between mb-2">
                      <div className="text-xs text-muted-foreground">{t('profile.referrals.earnedLabel')}</div>
                      <CircleDollarSign className="w-4 h-4 text-success" />
                    </div>
                    <div className="text-xl font-bold tabular-nums text-success">
                      {referralLoading ? <span className="opacity-50">— ₽</span> : formatPrice(referralData?.earnedTotal ?? 0, 'rub')}
                    </div>
                    <div className="text-xs text-muted-foreground mt-1.5">{t('profile.referrals.withdrawableLabel')}</div>
                  </Card>
                  <Card className="p-4">
                    <div className="flex items-center justify-between mb-2">
                      <div className="text-xs text-muted-foreground">{t('profile.referrals.structureLabel')}</div>
                      <TrendingUp className="w-4 h-4 text-violet-400" />
                    </div>
                    <div className="text-xl font-bold tabular-nums">{t('profile.referrals.levelsShort')}</div>
                    <div className="text-xs text-muted-foreground mt-1.5">{t('profile.referrals.level2Hint')}</div>
                  </Card>
                </div>

                <Card className="p-4">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="font-semibold flex items-center gap-2">
                      <Users className="w-4 h-4 text-primary" />
                      {t('profile.referrals.invitedTitle')}
                    </h3>
                    {referralData && referralData.referrals.length > 0 && (
                      <span className="text-xs text-muted-foreground">{t('profile.referrals.total')} {referralData.referrals.length}</span>
                    )}
                  </div>
                  {referralLoading ? (
                    <div className="space-y-2">
                      {Array.from({ length: 3 }).map((_, i) => (
                        <div key={i} className="flex items-center justify-between py-2">
                          <div className="space-y-1.5">
                            <div className="h-3 w-40 bg-muted rounded animate-pulse" />
                            <div className="h-2.5 w-24 bg-muted/60 rounded animate-pulse" />
                          </div>
                          <div className="space-y-1.5 flex flex-col items-end">
                            <div className="h-3 w-20 bg-muted/60 rounded animate-pulse" />
                            <div className="h-3 w-16 bg-muted/60 rounded animate-pulse" />
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : referralData && referralData.referrals.length > 0 ? (
                    <div className="space-y-1.5 max-h-96 overflow-y-auto">
                      {referralData.referrals.map((r) => {
                        const info = REFERRAL_STATUS_INFO[r.status] || REFERRAL_STATUS_INFO.REGISTERED
                        return (
                          <div key={r.id} className="flex items-center justify-between py-2 border-b border-border last:border-0">
                            <div className="flex items-center gap-2.5 min-w-0">
                              <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                                <Mail className="w-4 h-4 text-primary" />
                              </div>
                              <div className="min-w-0">
                                <div className="text-sm font-medium truncate">{r.referredEmail}</div>
                                <div className="text-xs text-muted-foreground">
                                  {mounted ? timeAgo(r.createdAt) : ''}
                                </div>
                              </div>
                            </div>
                            <div className="text-right shrink-0 ml-2">
                              <div className="text-sm font-mono font-semibold tabular-nums text-success">+{formatPrice(r.reward, 'rub')}</div>
                              <Badge variant="outline" className={cn('mt-0.5', info.className)}>{t(info.labelKey)}</Badge>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  ) : (
                    <div className="text-center py-6 text-sm text-muted-foreground">
                      {t('profile.referrals.empty')}
                    </div>
                  )}
                </Card>

                <Card className="p-4">
                  <h3 className="font-semibold mb-3">{t('profile.referrals.howTitle')}</h3>
                  <div className="grid sm:grid-cols-3 gap-3">
                    {[
                      { n: '1', title: t('profile.referrals.step1.title'), desc: t('profile.referrals.step1.desc') },
                      { n: '2', title: t('profile.referrals.step2.title'), desc: t('profile.referrals.step2.desc') },
                      { n: '3', title: t('profile.referrals.step3.title'), desc: t('profile.referrals.step3.desc') },
                    ].map((s) => (
                      <div key={s.n} className="rounded-xl bg-muted/40 p-3">
                        <div className="w-7 h-7 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold text-xs mb-2">
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
              <div className="space-y-4">
                <Card className="p-4">
                  <h3 className="font-semibold mb-3 flex items-center gap-2">
                    <UserCircle className="w-4 h-4 text-primary" />
                    {t('profile.settings.personal')}
                  </h3>
                  <div className="grid sm:grid-cols-2 gap-3">
                    <div>
                      <Label className="text-xs text-muted-foreground">{t('profile.settings.nameLabel')}</Label>
                      <Input value={nameInput} onChange={(e) => setNameInput(e.target.value)} className="mt-1.5" />
                    </div>
                    <div>
                      <Label className="text-xs text-muted-foreground">Email</Label>
                      <Input value={emailInput} onChange={(e) => setEmailInput(e.target.value)} className="mt-1.5" type="email" />
                    </div>
                  </div>
                  <Button onClick={handleSaveSettings} className="bg-primary text-primary-foreground hover:bg-primary/90 mt-3">
                    {t('profile.settings.save')}
                  </Button>
                </Card>

                <Card className="p-4">
                  <h3 className="font-semibold mb-3 flex items-center gap-2">
                    <Bell className="w-4 h-4 text-primary" />
                    {t('profile.settings.notifications')}
                  </h3>
                  <div className="space-y-1">
                    {[
                      { label: t('profile.settings.notifPush'), desc: t('profile.settings.notifPushDesc'), value: notifPush, setter: setNotifPush },
                      { label: t('profile.settings.notifEmail'), desc: t('profile.settings.notifEmailDesc'), value: notifEmail, setter: setNotifEmail },
                      { label: t('profile.settings.notifSms'), desc: t('profile.settings.notifSmsDesc'), value: notifSms, setter: setNotifSms },
                      { label: t('profile.settings.notifTrades'), desc: t('profile.settings.notifTradesDesc'), value: notifTrades, setter: setNotifTrades },
                    ].map((n) => (
                      <div key={n.label} className="flex items-center justify-between py-2.5 border-b border-border last:border-0">
                        <div>
                          <div className="text-sm font-medium">{n.label}</div>
                          <div className="text-xs text-muted-foreground mt-0.5">{n.desc}</div>
                        </div>
                        <Switch checked={n.value} onCheckedChange={n.setter} />
                      </div>
                    ))}
                  </div>
                </Card>

                <Card className="p-4">
                  <h3 className="font-semibold mb-3 flex items-center gap-2">
                    <Globe2 className="w-4 h-4 text-primary" />
                    {t('profile.settings.language')}
                  </h3>
                  <div className="space-y-3">
                    <div>
                      <Label className="text-xs text-muted-foreground">{t('profile.settings.languageLabel')}</Label>
                      <Select value={language} onValueChange={(v) => { setLanguage(v); setLocale(v as 'ru' | 'en') }}>
                        <SelectTrigger className="mt-1.5 w-full sm:w-60">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="ru">{t('profile.settings.languageRu')}</SelectItem>
                          <SelectItem value="en">{t('profile.settings.languageEn')}</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="flex items-center justify-between py-2.5 border-t border-border">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-lg bg-violet-400/15 flex items-center justify-center">
                          <Moon className="w-4 h-4 text-violet-400" />
                        </div>
                        <div>
                          <div className="text-sm font-medium">{t('profile.settings.darkTheme')}</div>
                          <div className="text-xs text-muted-foreground">{t('profile.settings.darkThemeDesc')}</div>
                        </div>
                      </div>
                      <Badge variant="outline" className="text-success border-success/30 bg-success/5">{t('profile.settings.enabled')}</Badge>
                    </div>
                  </div>
                </Card>

                <Card className="p-4 border-destructive/20">
                  <h3 className="font-semibold mb-2 text-destructive">{t('profile.settings.dangerZone')}</h3>
                  <p className="text-xs text-muted-foreground mb-3">
                    {t('profile.settings.dangerDesc')}
                  </p>
                  <Button
                    onClick={handleLogout}
                    variant="outline"
                    className="text-destructive border-destructive/30 hover:bg-destructive/10 gap-2"
                  >
                    <LogOut className="w-4 h-4" />
                    {t('profile.settings.logoutBtn')}
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
