'use client'

import { useEffect, useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import {
  Wallet as WalletIcon,
  ArrowDownToLine,
  ArrowUpFromLine,
  History,
  Copy,
  Check,
  QrCode,
  ShieldAlert,
  ArrowDownLeft,
  ArrowUpRight,
  ArrowLeftRight,
  Loader2,
  Network,
  TrendingUp,
  TrendingDown,
  Lock,
} from 'lucide-react'
import { useAppStore } from '@/lib/store'
import { useI18n } from '@/lib/use-i18n'
import { useApi, apiPost } from '@/lib/use-api'
import { fetchTickers, getUsdRubRate } from '@/lib/market'
import type { Balance, CoinTicker, Transaction, TxType } from '@/lib/types'
import {
  formatPrice,
  formatNumber,
  formatAmount,
  formatDateTime,
  timeAgo,
} from '@/lib/format'
import { cn } from '@/lib/utils'
import { CoinIcon } from '@/components/coin-icon'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Separator } from '@/components/ui/separator'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { toast } from 'sonner'
import { BalanceCardSkeleton, TxRowSkeleton } from '@/components/page-skeleton'

const ASSETS = ['USDT', 'BTC', 'ETH', 'RUB'] as const
type Asset = (typeof ASSETS)[number]

const NETWORKS_BY_ASSET: Record<Asset, { id: string }[]> = {
  BTC: [{ id: 'BTC' }],
  ETH: [{ id: 'ERC-20' }, { id: 'BEP-20' }],
  USDT: [{ id: 'TRC-20' }, { id: 'ERC-20' }, { id: 'BEP-20' }],
  RUB: [{ id: 'SBP' }, { id: 'BANK' }],
}

function networkLabel(id: string, t: (k: string) => string): string {
  switch (id) {
    case 'TRC-20':
      return t('wallet.network.trc20')
    case 'SBP':
      return t('wallet.network.sbp')
    case 'BANK':
      return t('wallet.network.bank')
    case 'BTC':
      return t('wallet.network.btc')
    case 'ERC-20':
      return t('wallet.network.eth')
    case 'BEP-20':
      return t('wallet.network.bnb')
    default:
      return id
  }
}

const NETWORK_FEES: Record<string, number> = {
  'TRC-20': 1,
  'ERC-20': 8,
  'BEP-20': 0.4,
  BTC: 0.0001,
  SBP: 0,
  BANK: 0,
}

function txIcon(type: TxType) {
  switch (type) {
    case 'deposit':
      return <ArrowDownLeft className="w-4 h-4 text-success" />
    case 'withdrawal':
      return <ArrowUpRight className="w-4 h-4 text-destructive" />
    case 'trade':
      return <ArrowLeftRight className="w-4 h-4 text-primary" />
    default:
      return <ArrowLeftRight className="w-4 h-4 text-muted-foreground" />
  }
}

function statusBadge(status: string, t: (k: string) => string) {
  const map: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
    COMPLETED: 'default',
    PENDING: 'secondary',
    FAILED: 'destructive',
  }
  const cls: Record<string, string> = {
    COMPLETED: 'bg-success/15 text-success border-success/30',
    PENDING: 'bg-warning/15 text-warning border-warning/30',
    FAILED: 'bg-destructive/15 text-destructive border-destructive/30',
  }
  const labelKey: Record<string, string> = {
    COMPLETED: 'wallet.tx.completed',
    PENDING: 'wallet.tx.pending',
    FAILED: 'wallet.tx.failed',
  }
  return (
    <Badge variant={map[status] ?? 'outline'} className={cn('border', cls[status] ?? '')}>
      {labelKey[status] ? t(labelKey[status]) : status}
    </Badge>
  )
}

// ─── Total balance card ─────────────────────────────────────────────────────
function TotalBalanceCard({ balances }: { balances: Balance[] }) {
  const { t } = useI18n()
  const [tickers, setTickers] = useState<CoinTicker[]>([])
  const [usdRub, setUsdRub] = useState<number>(92.5)

  useEffect(() => {
    let mounted = true
    const load = async () => {
      const [t, r] = await Promise.all([fetchTickers(), getUsdRubRate()])
      if (!mounted) return
      setTickers(t)
      setUsdRub(r)
    }
    load()
    const i = setInterval(load, 30000)
    return () => {
      mounted = false
      clearInterval(i)
    }
  }, [])

  const priceRub = (asset: string): number => {
    if (asset === 'RUB') return 1
    if (asset === 'USDT') return usdRub
    const tk = tickers.find((t) => t.symbol === asset)
    return tk ? tk.priceRub : 0
  }

  const totalRub = balances.reduce((sum, b) => sum + b.amount * priceRub(b.asset), 0)
  const totalUsd = totalRub / (usdRub || 1)

  // Asset distribution for mini stacked bar
  const distribution = balances
    .map((b) => ({
      asset: b.asset,
      rub: b.amount * priceRub(b.asset),
    }))
    .filter((d) => d.rub > 0)
    .sort((a, b) => b.rub - a.rub)
  const distTotal = distribution.reduce((s, d) => s + d.rub, 0) || 1

  const ASSET_COLORS: Record<string, string> = {
    BTC: '#F0B90B',
    ETH: '#a78bfa',
    USDT: '#22c55e',
    RUB: '#38bdf8',
  }

  return (
    <Card className="relative overflow-hidden p-4 lg:p-5 bg-gradient-to-br from-primary/10 via-card to-card border-primary/20">
      <div className="absolute -bottom-16 -right-16 w-56 h-56 rounded-full bg-primary/10 blur-3xl animate-pulse" />
      <div className="relative flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 text-xs text-muted-foreground uppercase tracking-wider mb-1.5">
            <WalletIcon className="w-3.5 h-3.5 text-primary" />
            {t('wallet.totalValue')}
          </div>
          <div className="text-3xl lg:text-4xl font-mono font-bold tabular-nums">
            {formatPrice(totalRub, 'rub')}
          </div>
          <div className="text-xs text-muted-foreground mt-1 font-mono tabular-nums">
            ≈ {formatPrice(totalUsd, 'usd')}
          </div>

          {/* Distribution mini stacked bar */}
          {distribution.length > 0 && (
            <div className="mt-3">
              <div className="flex h-2 rounded-full overflow-hidden bg-muted/40 max-w-md gap-0.5">
                {distribution.map((d) => (
                  <div
                    key={d.asset}
                    className="h-full transition-all hover:brightness-110"
                    style={{
                      width: `${(d.rub / distTotal) * 100}%`,
                      background: ASSET_COLORS[d.asset] || '#888',
                    }}
                    title={`${d.asset}: ${formatPrice(d.rub, 'rub')} (${((d.rub / distTotal) * 100).toFixed(1)}%)`}
                  />
                ))}
              </div>
              {/* Legend */}
              <div className="flex flex-wrap gap-x-3 gap-y-1 mt-2">
                {distribution.slice(0, 6).map((d) => (
                  <div key={d.asset} className="flex items-center gap-1.5 text-[11px]">
                    <span
                      className="w-2 h-2 rounded-sm"
                      style={{ background: ASSET_COLORS[d.asset] || '#888' }}
                    />
                    <span className="font-semibold text-foreground/90">{d.asset}</span>
                    <span className="text-muted-foreground font-mono tabular-nums">
                      {((d.rub / distTotal) * 100).toFixed(1)}%
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
        <div className="flex gap-2 shrink-0">
          <Button
            variant="outline"
            className="gap-2 border-success/30 bg-success/10 text-success hover:bg-success/20 hover:text-success h-10 px-4"
            onClick={() => document.getElementById('wallet-tab-deposit')?.click()}
          >
            <ArrowDownToLine className="w-4 h-4" />
            {t('wallet.deposit')}
          </Button>
          <Button
            variant="outline"
            className="gap-2 border-destructive/30 bg-destructive/10 text-destructive hover:bg-destructive/20 hover:text-destructive h-10 px-4"
            onClick={() => document.getElementById('wallet-tab-withdraw')?.click()}
          >
            <ArrowUpFromLine className="w-4 h-4" />
            {t('wallet.withdraw')}
          </Button>
        </div>
      </div>
    </Card>
  )
}

// ─── Wallet stats row: 3 mini KPI cards (assets count, 24h PnL estimate, locked) ─
function WalletStatsRow({ balances }: { balances: Balance[] }) {
  const { t } = useI18n()
  const [tickers, setTickers] = useState<CoinTicker[]>([])
  const [usdRub, setUsdRub] = useState<number>(92.5)

  useEffect(() => {
    let mounted = true
    const load = async () => {
      const [t, r] = await Promise.all([fetchTickers(), getUsdRubRate()])
      if (!mounted) return
      setTickers(t)
      setUsdRub(r)
    }
    load()
    const i = setInterval(load, 30000)
    return () => {
      mounted = false
      clearInterval(i)
    }
  }, [])

  const priceRub = (asset: string): number => {
    if (asset === 'RUB') return 1
    if (asset === 'USDT') return usdRub
    const tk = tickers.find((t) => t.symbol === asset)
    return tk ? tk.priceRub : 0
  }

  const totalRub = balances.reduce((sum, b) => sum + b.amount * priceRub(b.asset), 0)
  const activeAssets = balances.filter((b) => b.amount > 0).length
  const lockedTotal = balances.reduce((sum, b) => sum + (b.locked || 0) * priceRub(b.asset), 0)

  // 24h PnL estimate: sum of (amount * change24h * price) for crypto assets
  const pnl24h = balances.reduce((sum, b) => {
    if (b.asset === 'RUB' || b.asset === 'USDT') return sum
    const tk = tickers.find((t) => t.symbol === b.asset)
    if (!tk) return sum
    return sum + b.amount * tk.priceRub * (tk.change24h / 100)
  }, 0)
  const pnlPct = totalRub > 0 ? (pnl24h / totalRub) * 100 : 0
  const pnlPositive = pnl24h >= 0

  const stats = [
    {
      label: t('wallet.stats.assets'),
      value: String(activeAssets),
      sub: t('wallet.stats.assetsSub'),
      icon: WalletIcon,
      color: 'text-primary',
      bg: 'bg-primary/10',
    },
    {
      label: t('wallet.stats.pnl24h'),
      value: `${pnlPositive ? '+' : ''}${formatPrice(Math.abs(pnl24h), 'rub')}`,
      sub: `${pnlPositive ? '+' : ''}${pnlPct.toFixed(2)}%`,
      icon: pnlPositive ? TrendingUp : TrendingDown,
      color: pnlPositive ? 'text-success' : 'text-destructive',
      bg: pnlPositive ? 'bg-success/10' : 'bg-destructive/10',
    },
    {
      label: t('wallet.stats.locked'),
      value: lockedTotal > 0 ? formatPrice(lockedTotal, 'rub') : '0 ₽',
      sub: t('wallet.stats.lockedSub'),
      icon: Lock,
      color: 'text-muted-foreground',
      bg: 'bg-muted/40',
    },
  ]

  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
      {stats.map((s) => (
        <Card
          key={s.label}
          className="p-3 lg:p-4 flex items-center gap-3 hover:border-primary/30 transition-colors"
        >
          <div
            className={cn(
              'w-10 h-10 rounded-xl flex items-center justify-center shrink-0',
              s.bg,
              s.color
            )}
          >
            <s.icon className="w-5 h-5" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-[11px] text-muted-foreground uppercase tracking-wide truncate">
              {s.label}
            </div>
            <div className="text-base lg:text-lg font-bold font-mono tabular-nums truncate">
              {s.value}
            </div>
            <div className={cn('text-[11px] font-mono tabular-nums', s.color)}>
              {s.sub}
            </div>
          </div>
        </Card>
      ))}
    </div>
  )
}

// ─── Assets tab ─────────────────────────────────────────────────────────────
function AssetsTab({ balances }: { balances: Balance[] }) {
  const { t } = useI18n()
  const [tickers, setTickers] = useState<CoinTicker[]>([])
  const [usdRub, setUsdRub] = useState<number>(92.5)

  useEffect(() => {
    let mounted = true
    const load = async () => {
      const [t, r] = await Promise.all([fetchTickers(), getUsdRubRate()])
      if (!mounted) return
      setTickers(t)
      setUsdRub(r)
    }
    load()
    const i = setInterval(load, 30000)
    return () => {
      mounted = false
      clearInterval(i)
    }
  }, [])

  const priceRub = (asset: string): number => {
    if (asset === 'RUB') return 1
    if (asset === 'USDT') return usdRub
    const tk = tickers.find((t) => t.symbol === asset)
    return tk ? tk.priceRub : 0
  }
  const priceUsd = (asset: string): number => priceRub(asset) / (usdRub || 1)

  return (
    <Card className="overflow-hidden">
      <ScrollArea className="max-h-[640px]">
        <div className="grid grid-cols-12 px-3 py-2 text-[10px] uppercase tracking-wider text-muted-foreground border-b border-border bg-muted/30">
          <span className="col-span-4">{t('wallet.col.asset')}</span>
          <span className="col-span-2 text-right">{t('wallet.col.available')}</span>
          <span className="col-span-2 text-right">24h</span>
          <span className="col-span-2 text-right">{t('wallet.col.rubValue')}</span>
          <span className="col-span-2 text-right">{t('wallet.col.actions') || 'Действия'}</span>
        </div>
        {balances.map((b) => {
          const rub = b.amount * priceRub(b.asset)
          const usd = b.amount * priceUsd(b.asset)
          const tk = tickers.find((t) => t.symbol === b.asset)
          const change24h = tk?.change24h ?? 0
          const isCrypto = b.asset !== 'RUB' && b.asset !== 'USDT'
          return (
            <div
              key={b.asset}
              className="grid grid-cols-12 px-3 py-3 items-center border-b border-border/60 last:border-0 hover:bg-muted/40 transition group"
            >
              <div className="col-span-4 flex items-center gap-2.5">
                <CoinIcon symbol={b.asset} size={28} />
                <div>
                  <div className="font-semibold text-sm">{b.asset}</div>
                  <div className="text-[11px] text-muted-foreground">
                    {b.asset === 'RUB'
                      ? t('wallet.asset.rub')
                      : b.asset === 'USDT'
                        ? t('wallet.asset.usdt')
                        : b.asset === 'BTC'
                          ? t('wallet.asset.btc')
                          : t('wallet.asset.eth')}
                  </div>
                </div>
              </div>
              <div className="col-span-2 text-right font-mono tabular-nums text-sm">
                {formatAmount(b.amount, b.asset)}
              </div>
              <div className="col-span-2 text-right font-mono tabular-nums text-sm">
                {isCrypto && tk ? (
                  <span className={cn('inline-flex items-center gap-0.5 text-xs font-semibold px-1.5 py-0.5 rounded',
                    change24h >= 0 ? 'text-success bg-success/10' : 'text-destructive bg-destructive/10')}>
                    {change24h >= 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                    {change24h >= 0 ? '+' : ''}{change24h.toFixed(2)}%
                  </span>
                ) : (
                  <span className="text-muted-foreground text-xs">—</span>
                )}
              </div>
              <div className="col-span-2 text-right">
                <div className="font-mono tabular-nums text-sm">{formatPrice(rub, 'rub')}</div>
                <div className="font-mono tabular-nums text-[11px] text-muted-foreground">
                  {formatPrice(usd, 'usd')}
                </div>
              </div>
              <div className="col-span-2 flex items-center justify-end gap-1">
                <button
                  onClick={() => document.getElementById('wallet-tab-deposit')?.click()}
                  className="p-1.5 rounded-lg text-success hover:bg-success/10 transition opacity-60 group-hover:opacity-100"
                  title={t('wallet.deposit')}
                >
                  <ArrowDownToLine className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => document.getElementById('wallet-tab-withdraw')?.click()}
                  className="p-1.5 rounded-lg text-destructive hover:bg-destructive/10 transition opacity-60 group-hover:opacity-100"
                  title={t('wallet.withdraw')}
                >
                  <ArrowUpFromLine className="w-3.5 h-3.5" />
                </button>
                {(b.asset === 'BTC' || b.asset === 'ETH' || b.asset === 'USDT') && (
                  <button
                    onClick={() => {
                      const setView = useAppStore.getState().setView
                      const setSelectedPair = useAppStore.getState().setSelectedPair
                      setSelectedPair(`${b.asset}/RUB`)
                      setView('trade')
                    }}
                    className="p-1.5 rounded-lg text-primary hover:bg-primary/10 transition opacity-60 group-hover:opacity-100"
                    title={t('wallet.trade') || 'Торговать'}
                  >
                    <ArrowLeftRight className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>
          )
        })}
      </ScrollArea>
    </Card>
  )
}

// ─── Deposit tab ────────────────────────────────────────────────────────────
function DepositTab({ onDeposited }: { onDeposited?: () => void }) {
  const { t } = useI18n()
  const generateDepositAddress = useAppStore((s) => s.generateDepositAddress)
  const depositAddress = useAppStore((s) => s.depositAddress)
  const [asset, setAsset] = useState<Asset>('USDT')
  const [network, setNetwork] = useState<string>(NETWORKS_BY_ASSET['USDT'][0].id)
  const [copied, setCopied] = useState(false)
  const [loading, setLoading] = useState(false)

  const handleAssetChange = (a: Asset) => {
    setAsset(a)
    setNetwork(NETWORKS_BY_ASSET[a][0].id)
  }

  const handleGenerate = async () => {
    setLoading(true)
    let addr = ''
    try {
      const res = await apiPost<{ address: string }>(
        '/api/wallet',
        { action: 'deposit', asset, network }
      )
      addr = res.address
    } catch {
      // Network/API failure — fall back to local generator (resilience)
      addr = generateDepositAddress(asset, network)
    }
    if (!addr) {
      addr = generateDepositAddress(asset, network)
    }
    // Mirror address into store so it persists for the UI session
    useAppStore.setState({ depositAddress: addr })
    setLoading(false)
    toast.success(t('wallet.deposit.toast.generated'), {
      description: `${asset} • ${network}`,
    })
    onDeposited?.()
  }

  const handleCopy = async () => {
    if (!depositAddress) return
    try {
      await navigator.clipboard.writeText(depositAddress)
      setCopied(true)
      toast.success(t('wallet.deposit.toast.copied'))
      setTimeout(() => setCopied(false), 1500)
    } catch {
      toast.error(t('wallet.deposit.toast.copyFailed'))
    }
  }

  const isRub = asset === 'RUB'

  return (
    <div className="grid lg:grid-cols-2 gap-3">
      <Card className="p-4 space-y-4">
        <div className="space-y-1.5">
          <Label className="text-xs uppercase tracking-wider text-muted-foreground">
            {t('wallet.deposit.asset')}
          </Label>
          <div className="grid grid-cols-4 gap-2">
            {ASSETS.map((a) => (
              <button
                key={a}
                onClick={() => handleAssetChange(a)}
                className={cn(
                  'flex flex-col items-center gap-1 py-2.5 rounded-lg border transition',
                  asset === a
                    ? 'border-primary bg-primary/10 text-primary'
                    : 'border-border bg-muted/30 text-muted-foreground hover:bg-muted/60'
                )}
              >
                <CoinIcon symbol={a} size={22} />
                <span className="text-xs font-medium">{a}</span>
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-1.5">
          <Label className="text-xs uppercase tracking-wider text-muted-foreground">
            {t('wallet.deposit.network')}
          </Label>
          <div className="space-y-1.5">
            {NETWORKS_BY_ASSET[asset].map((n) => (
              <button
                key={n.id}
                onClick={() => setNetwork(n.id)}
                className={cn(
                  'w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg border transition text-left',
                  network === n.id
                    ? 'border-primary bg-primary/10'
                    : 'border-border bg-muted/30 hover:bg-muted/60'
                )}
              >
                <Network
                  className={cn(
                    'w-4 h-4',
                    network === n.id ? 'text-primary' : 'text-muted-foreground'
                  )}
                />
                <span className="text-sm flex-1">{networkLabel(n.id, t)}</span>
                {network === n.id && <Check className="w-4 h-4 text-primary" />}
              </button>
            ))}
          </div>
        </div>

        <Button
          onClick={handleGenerate}
          disabled={loading}
          className="w-full h-10 bg-primary text-primary-foreground hover:bg-primary/90 gap-2"
        >
          {loading ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <QrCode className="w-4 h-4" />
          )}
          {depositAddress ? t('wallet.deposit.regenerateBtn') : t('wallet.deposit.generateBtn')}
        </Button>
      </Card>

      <Card className="p-4 space-y-3">
        <div className="flex items-center justify-between">
          <Label className="text-xs uppercase tracking-wider text-muted-foreground">
            {t('wallet.deposit.addressTitle')}
          </Label>
          {depositAddress && (
            <Badge className="bg-success/15 text-success border-success/30">
              {t('wallet.deposit.active')}
            </Badge>
          )}
        </div>

        {!depositAddress ? (
          <div className="flex flex-col items-center justify-center py-10 text-center">
            <QrCode className="w-9 h-9 text-muted-foreground/40 mb-2.5" />
            <p className="text-sm text-muted-foreground">
              {t('wallet.deposit.emptyHint')}
            </p>
            <p className="text-[11px] text-muted-foreground/70 mt-1">
              {t('wallet.deposit.bound')}
            </p>
          </div>
        ) : (
          <>
            <div className="rounded-lg border border-border bg-muted/40 p-3 flex items-center gap-3">
              <code className="flex-1 text-xs font-mono break-all leading-relaxed text-foreground">
                {depositAddress}
              </code>
              <Button size="icon" variant="ghost" onClick={handleCopy} className="shrink-0">
                {copied ? (
                  <Check className="w-4 h-4 text-success" />
                ) : (
                  <Copy className="w-4 h-4" />
                )}
              </Button>
            </div>

            <div className="flex justify-center py-1">
              <img
                src={`https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(
                  isRub ? 'TINKOFF:' + depositAddress : depositAddress
                )}`}
                alt={t('wallet.deposit.qrAlt')}
                width={180}
                height={180}
                className="rounded-lg border border-border bg-white p-2"
              />
            </div>

            <Separator />

            <div className="space-y-1.5 text-xs">
              <div className="flex justify-between">
                <span className="text-muted-foreground">{t('wallet.deposit.assetLabel')}</span>
                <span className="font-medium">{asset}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">{t('wallet.deposit.networkLabel')}</span>
                <span className="font-medium">{network}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">{t('wallet.deposit.confirmations')}</span>
                <span className="font-medium">
                  {isRub
                    ? t('wallet.deposit.confirmationsSbp')
                    : network === 'BTC'
                      ? t('wallet.deposit.confirmationsBtc')
                      : t('wallet.deposit.confirmationsDefault')}
                </span>
              </div>
              {!isRub && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">{t('wallet.deposit.minAmount')}</span>
                  <span className="font-medium">
                    {network === 'BTC' ? '0.0001 BTC' : '1 USDT / 0.001 ETH'}
                  </span>
                </div>
              )}
            </div>

            <div className="rounded-lg bg-warning/10 border border-warning/30 px-3 py-2 text-[11px] text-warning flex gap-2">
              <ShieldAlert className="w-4 h-4 shrink-0 mt-0.5" />
              <span>
                {t('wallet.deposit.warning')} {asset} {t('wallet.deposit.warningMid')} {network}. {t('wallet.deposit.warningEnd')}
              </span>
            </div>
          </>
        )}
      </Card>
    </div>
  )
}

// ─── Withdraw tab ───────────────────────────────────────────────────────────
function WithdrawTab({
  balances,
  onWithdrawn,
}: {
  balances: Balance[]
  onWithdrawn?: () => void
}) {
  const { t } = useI18n()
  const withdraw = useAppStore((s) => s.withdraw)
  const [tickers, setTickers] = useState<CoinTicker[]>([])
  const [usdRub, setUsdRub] = useState<number>(92.5)

  const [asset, setAsset] = useState<Asset>('USDT')
  const [network, setNetwork] = useState<string>(NETWORKS_BY_ASSET['USDT'][0].id)
  const [amount, setAmount] = useState<string>('')
  const [address, setAddress] = useState<string>('')
  const [twofa, setTwofa] = useState<string>('')
  const [whitelist, setWhitelist] = useState(false)

  useEffect(() => {
    let mounted = true
    const load = async () => {
      const [t, r] = await Promise.all([fetchTickers(), getUsdRubRate()])
      if (!mounted) return
      setTickers(t)
      setUsdRub(r)
    }
    load()
    const i = setInterval(load, 30000)
    return () => {
      mounted = false
      clearInterval(i)
    }
  }, [])

  const handleAssetChange = (a: Asset) => {
    setAsset(a)
    setNetwork(NETWORKS_BY_ASSET[a][0].id)
    setAmount('')
    setAddress('')
  }

  const available = balances.find((b) => b.asset === asset)?.amount ?? 0
  const fee = NETWORK_FEES[network] ?? 0
  const amountNum = parseFloat(amount) || 0
  const receive = Math.max(amountNum - fee, 0)

  const priceRub = (a: string): number => {
    if (a === 'RUB') return 1
    if (a === 'USDT') return usdRub
    const tk = tickers.find((t) => t.symbol === a)
    return tk ? tk.priceRub : 0
  }
  const amountRub = amountNum * priceRub(asset)
  const isLargeAmount = asset === 'RUB' ? amountNum > 100000 : amountRub > 100000

  const handleMax = () => {
    setAmount(String(available))
  }

  const handleSubmit = async () => {
    if (amountNum <= 0) {
      toast.error(t('wallet.withdraw.toast.amountRequired'))
      return
    }
    if (amountNum > available) {
      toast.error(t('wallet.withdraw.toast.insufficient'))
      return
    }
    if (!address.trim()) {
      toast.error(t('wallet.withdraw.toast.addressRequired'))
      return
    }
    if (twofa.length < 6) {
      toast.error(t('wallet.withdraw.toast.2faRequired'))
      return
    }
    try {
      await apiPost('/api/wallet', {
        action: 'withdraw',
        asset,
        amount: amountNum,
        address,
      })
    } catch {
      // API failure — still mirror locally for UX continuity (resilience)
    }
    // Apply local optimistic update + notification + toast regardless
    withdraw(asset, amountNum, address)
    toast.success(t('wallet.withdraw.toast.created'), {
      description: `${formatAmount(amountNum, asset)} → ${address.slice(0, 12)}...`,
    })
    setAmount('')
    setAddress('')
    setTwofa('')
    onWithdrawn?.()
  }

  return (
    <div className="grid lg:grid-cols-[1fr_360px] gap-3">
      <Card className="p-4 space-y-4">
        <div className="space-y-1.5">
          <Label className="text-xs uppercase tracking-wider text-muted-foreground">
            {t('wallet.withdraw.asset')}
          </Label>
          <div className="grid grid-cols-4 gap-2">
            {ASSETS.map((a) => (
              <button
                key={a}
                onClick={() => handleAssetChange(a)}
                className={cn(
                  'flex flex-col items-center gap-1 py-2.5 rounded-lg border transition',
                  asset === a
                    ? 'border-primary bg-primary/10 text-primary'
                    : 'border-border bg-muted/30 text-muted-foreground hover:bg-muted/60'
                )}
              >
                <CoinIcon symbol={a} size={22} />
                <span className="text-xs font-medium">{a}</span>
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-1.5">
          <Label className="text-xs uppercase tracking-wider text-muted-foreground">
            {t('wallet.withdraw.network')}
          </Label>
          <div className="space-y-1.5">
            {NETWORKS_BY_ASSET[asset].map((n) => (
              <button
                key={n.id}
                onClick={() => setNetwork(n.id)}
                className={cn(
                  'w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg border transition text-left',
                  network === n.id
                    ? 'border-primary bg-primary/10'
                    : 'border-border bg-muted/30 hover:bg-muted/60'
                )}
              >
                <Network
                  className={cn(
                    'w-4 h-4',
                    network === n.id ? 'text-primary' : 'text-muted-foreground'
                  )}
                />
                <span className="text-sm flex-1">{networkLabel(n.id, t)}</span>
                <span className="text-[11px] text-muted-foreground">
                  {t('wallet.withdraw.feeWord')} {fee} {asset === 'BTC' ? 'BTC' : asset === 'RUB' ? '₽' : 'USDT'}
                </span>
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <Label className="text-xs uppercase tracking-wider text-muted-foreground">
              {t('wallet.withdraw.addressLabel')}
            </Label>
            <span className="text-[11px] text-muted-foreground">
              {t('wallet.withdraw.availableWord')} <span className="font-mono">{formatAmount(available, asset)}</span>
            </span>
          </div>
          <Input
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            placeholder={asset === 'RUB' ? t('wallet.withdraw.addressPlaceholderRub') : t('wallet.withdraw.addressPlaceholderCrypto')}
            className="font-mono text-sm h-10"
          />
        </div>

        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <Label className="text-xs uppercase tracking-wider text-muted-foreground">
              {t('wallet.withdraw.amountLabel')}
            </Label>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleMax}
              className="h-6 text-[11px] text-primary hover:text-primary"
            >
              MAX
            </Button>
          </div>
          <div className="relative">
            <Input
              type="number"
              inputMode="decimal"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0.00"
              className="pr-14 font-mono tabular-nums h-10"
            />
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">
              {asset}
            </span>
          </div>
          {isLargeAmount && (
            <div className="rounded-lg bg-warning/10 border border-warning/30 px-3 py-2 text-[11px] text-warning flex gap-2">
              <ShieldAlert className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{t('wallet.withdraw.largeWarn')}</span>
            </div>
          )}
        </div>

        <div className="space-y-1.5">
          <Label className="text-xs uppercase tracking-wider text-muted-foreground">
            {t('wallet.withdraw.2faLabel')}
          </Label>
          <Input
            value={twofa}
            onChange={(e) => setTwofa(e.target.value.replace(/\D/g, '').slice(0, 6))}
            placeholder="000 000"
            inputMode="numeric"
            className="font-mono tracking-[0.3em] text-center h-10"
          />
        </div>

        <div className="flex items-center justify-between rounded-lg border border-border bg-muted/30 px-3 py-2">
          <div className="flex items-center gap-2">
            <Switch checked={whitelist} onCheckedChange={setWhitelist} />
            <span className="text-xs">{t('wallet.withdraw.whitelist')}</span>
          </div>
          <span className="text-[10px] text-muted-foreground">
            {whitelist ? t('wallet.withdraw.whitelistOn') : t('wallet.withdraw.whitelistOff')}
          </span>
        </div>

        <Button
          onClick={handleSubmit}
          className="w-full h-10 bg-destructive text-white hover:bg-destructive/90 gap-2"
        >
          <ArrowUpFromLine className="w-4 h-4" />
          {t('wallet.withdraw.submit')}
        </Button>
      </Card>

      <Card className="p-4 space-y-3 h-fit">
        <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          {t('wallet.withdraw.summary')}
        </div>
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">{t('wallet.withdraw.amountLabel2')}</span>
            <span className="font-mono tabular-nums">{formatAmount(amountNum, asset)}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">{t('wallet.withdraw.networkFee')}</span>
            <span className="font-mono tabular-nums text-destructive">
              −{fee} {asset === 'BTC' ? 'BTC' : asset === 'RUB' ? '₽' : 'USDT'}
            </span>
          </div>
          <Separator />
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">{t('wallet.withdraw.receive')}</span>
            <span className="font-mono tabular-nums text-success">
              {formatAmount(receive, asset)}
            </span>
          </div>
          <div className="flex justify-between text-xs">
            <span className="text-muted-foreground">{t('wallet.col.rubValue')}</span>
            <span className="font-mono tabular-nums">{formatPrice(amountRub, 'rub')}</span>
          </div>
        </div>
        <Separator />
        <div className="text-[11px] text-muted-foreground space-y-1.5">
          <p>{t('wallet.withdraw.note1')}</p>
          <p>{t('wallet.withdraw.note2')}</p>
          <p>{t('wallet.withdraw.note3')}</p>
        </div>
      </Card>
    </div>
  )
}

// ─── History tab ────────────────────────────────────────────────────────────
function HistoryTab({ transactions }: { transactions: Transaction[] }) {
  const { t } = useI18n()
  if (transactions.length === 0) {
    return (
      <Card className="p-10 text-center">
        <History className="w-9 h-9 mx-auto text-muted-foreground/40 mb-2.5" />
        <p className="text-sm text-muted-foreground">{t('wallet.history.empty')}</p>
        <p className="text-[11px] text-muted-foreground/70 mt-1">
          {t('wallet.history.emptyHint')}
        </p>
      </Card>
    )
  }

  return (
    <Card className="overflow-hidden">
      <ScrollArea className="max-h-[640px]">
        {transactions.map((tx, i) => {
          const isPositive = tx.amount > 0
          return (
            <motion.div
              key={tx.id}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.2, delay: Math.min(i * 0.03, 0.4), ease: 'easeOut' }}
              className="flex items-center gap-3 px-3 py-2.5 border-b border-border/60 last:border-0 hover:bg-muted/40"
            >
              <div className="w-8 h-8 rounded-full bg-muted/60 flex items-center justify-center shrink-0">
                {txIcon(tx.type)}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium capitalize">
                    {tx.type === 'deposit'
                      ? t('wallet.tx.deposit')
                      : tx.type === 'withdrawal'
                        ? t('wallet.tx.withdrawal')
                        : tx.type === 'trade'
                          ? t('wallet.tx.trade')
                          : tx.type === 'payment'
                            ? t('wallet.tx.payment')
                            : t('wallet.tx.fee')}
                  </span>
                  <Badge variant="outline" className="text-[10px] h-5">
                    {tx.asset}
                  </Badge>
                  {statusBadge(tx.status, t)}
                </div>
                <div className="text-[11px] text-muted-foreground mt-0.5 flex items-center gap-2">
                  <span>{timeAgo(new Date()) === t('wallet.justNow') ? tx.time : tx.time}</span>
                  {tx.address && (
                    <span className="font-mono truncate max-w-[200px]">→ {tx.address}</span>
                  )}
                </div>
              </div>
              <div className="text-right shrink-0">
                <div
                  className={cn(
                    'text-sm font-mono tabular-nums font-semibold',
                    isPositive ? 'text-success' : 'text-destructive'
                  )}
                >
                  {isPositive ? '+' : ''}
                  {formatAmount(tx.amount, tx.asset)}
                </div>
                <div className="text-[10px] text-muted-foreground">{tx.time}</div>
              </div>
            </motion.div>
          )
        })}
      </ScrollArea>
    </Card>
  )
}

// ─── Main WalletView ────────────────────────────────────────────────────────
export function WalletView() {
  const { t } = useI18n()
  // Refresh trigger — bump to force a re-fetch from /api/wallet
  const [refreshKey, setRefreshKey] = useState(0)
  const walletUrl = refreshKey ? `/api/wallet?t=${refreshKey}` : '/api/wallet'
  const { data, loading } = useApi<{ balances: Balance[]; transactions: Transaction[] }>(
    walletUrl,
    { refresh: 0 }
  )

  const storeBalances = useAppStore((s) => s.balances)
  const storeTransactions = useAppStore((s) => s.transactions)

  // Prefer API data when present; fall back to store for resilience
  const apiBalances = data?.balances && data.balances.length > 0 ? data.balances : null
  const apiTransactions = data?.transactions ?? null

  const balances = apiBalances ?? storeBalances

  // Merge transactions: API takes precedence by id; store-only txs come after
  const transactions = useMemo(() => {
    if (!apiTransactions || apiTransactions.length === 0) return storeTransactions
    const apiIds = new Set(apiTransactions.map((t) => t.id))
    return [...apiTransactions, ...storeTransactions.filter((t) => !apiIds.has(t.id))]
  }, [apiTransactions, storeTransactions])

  const refresh = () => setRefreshKey((k) => k + 1)

  // First-paint skeleton: API still loading and no data yet
  if (loading && !data) {
    return (
      <div className="flex-1 bg-background">
        <div className="mx-auto max-w-[1400px] px-3 lg:px-5 py-4 space-y-4">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-primary/15 flex items-center justify-center">
              <WalletIcon className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight">{t('wallet.header.title')}</h1>
              <p className="text-xs text-muted-foreground">
                {t('wallet.header.subtitle')}
              </p>
            </div>
          </div>
          <BalanceCardSkeleton />
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <BalanceCardSkeleton key={i} />
            ))}
          </div>
          <Card className="overflow-hidden">
            <div className="px-3 py-2 text-[10px] uppercase tracking-wider text-muted-foreground border-b border-border bg-muted/30">
              {t('wallet.recent')}
            </div>
            {Array.from({ length: 4 }).map((_, i) => (
              <TxRowSkeleton key={i} />
            ))}
          </Card>
        </div>
      </div>
    )
  }

  return (
    <div className="flex-1 bg-background">
      <div className="mx-auto max-w-[1400px] px-3 lg:px-5 py-4 space-y-4">
        <div className="flex items-center gap-2.5">
          <div className="w-10 h-10 rounded-xl bg-primary/15 flex items-center justify-center">
            <WalletIcon className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight">{t('wallet.header.title')}</h1>
            <p className="text-xs text-muted-foreground">
              {t('wallet.header.subtitle')}
            </p>
          </div>
        </div>

        <TotalBalanceCard balances={balances} />

        <WalletStatsRow balances={balances} />

        <Tabs defaultValue="assets" className="w-full">
          <TabsList className="h-9 bg-muted/60 p-1">
            <TabsTrigger value="assets" className="gap-1.5">
              <WalletIcon className="w-3.5 h-3.5" />
              {t('wallet.tabs.assets')}
            </TabsTrigger>
            <TabsTrigger value="deposit" id="wallet-tab-deposit" className="gap-1.5">
              <ArrowDownToLine className="w-3.5 h-3.5" />
              {t('wallet.tabs.deposit')}
            </TabsTrigger>
            <TabsTrigger value="withdraw" id="wallet-tab-withdraw" className="gap-1.5">
              <ArrowUpFromLine className="w-3.5 h-3.5" />
              {t('wallet.tabs.withdraw')}
            </TabsTrigger>
            <TabsTrigger value="history" className="gap-1.5">
              <History className="w-3.5 h-3.5" />
              {t('wallet.tabs.history')}
            </TabsTrigger>
          </TabsList>
          <TabsContent value="assets" className="mt-3">
            <AssetsTab balances={balances} />
          </TabsContent>
          <TabsContent value="deposit" className="mt-3">
            <DepositTab onDeposited={refresh} />
          </TabsContent>
          <TabsContent value="withdraw" className="mt-3">
            <WithdrawTab balances={balances} onWithdrawn={refresh} />
          </TabsContent>
          <TabsContent value="history" className="mt-3">
            <HistoryTab transactions={transactions} />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}
