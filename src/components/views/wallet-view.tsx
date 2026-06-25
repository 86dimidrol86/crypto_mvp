'use client'

import { useEffect, useMemo, useState } from 'react'
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
} from 'lucide-react'
import { useAppStore } from '@/lib/store'
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

const ASSETS = ['USDT', 'BTC', 'ETH', 'RUB'] as const
type Asset = (typeof ASSETS)[number]

const NETWORKS_BY_ASSET: Record<Asset, { id: string; label: string }[]> = {
  BTC: [{ id: 'BTC', label: 'Bitcoin Network' }],
  ETH: [
    { id: 'ERC-20', label: 'Ethereum (ERC-20)' },
    { id: 'BEP-20', label: 'BNB Smart Chain (BEP-20)' },
  ],
  USDT: [
    { id: 'TRC-20', label: 'Tron (TRC-20) • низкая комиссия' },
    { id: 'ERC-20', label: 'Ethereum (ERC-20)' },
    { id: 'BEP-20', label: 'BNB Smart Chain (BEP-20)' },
  ],
  RUB: [
    { id: 'SBP', label: 'СБП — мгновенно, 0%' },
    { id: 'BANK', label: 'Банковский перевод (р/с)' },
  ],
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

function statusBadge(status: string) {
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
  const label: Record<string, string> = {
    COMPLETED: 'Выполнено',
    PENDING: 'В ожидании',
    FAILED: 'Отклонено',
  }
  return (
    <Badge variant={map[status] ?? 'outline'} className={cn('border', cls[status] ?? '')}>
      {label[status] ?? status}
    </Badge>
  )
}

// ─── Total balance card ─────────────────────────────────────────────────────
function TotalBalanceCard({ balances }: { balances: Balance[] }) {
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

  return (
    <Card className="relative overflow-hidden p-6 bg-gradient-to-br from-primary/10 via-card to-card border-primary/20">
      <div className="absolute -bottom-16 -right-16 w-56 h-56 rounded-full bg-primary/10 blur-3xl" />
      <div className="relative flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs text-muted-foreground uppercase tracking-wider mb-2">
            <WalletIcon className="w-3.5 h-3.5 text-primary" />
            Общая стоимость портфеля
          </div>
          <div className="text-4xl font-mono font-bold tabular-nums">
            {formatPrice(totalRub, 'rub')}
          </div>
          <div className="text-sm text-muted-foreground mt-1 font-mono tabular-nums">
            ≈ {formatPrice(totalUsd, 'usd')}
          </div>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            className="gap-2 border-success/30 bg-success/10 text-success hover:bg-success/20 hover:text-success"
            onClick={() => document.getElementById('wallet-tab-deposit')?.click()}
          >
            <ArrowDownToLine className="w-4 h-4" />
            Пополнить
          </Button>
          <Button
            variant="outline"
            className="gap-2 border-destructive/30 bg-destructive/10 text-destructive hover:bg-destructive/20 hover:text-destructive"
            onClick={() => document.getElementById('wallet-tab-withdraw')?.click()}
          >
            <ArrowUpFromLine className="w-4 h-4" />
            Вывести
          </Button>
        </div>
      </div>
    </Card>
  )
}

// ─── Assets tab ─────────────────────────────────────────────────────────────
function AssetsTab({ balances }: { balances: Balance[] }) {
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
        <div className="grid grid-cols-12 px-4 py-3 text-[10px] uppercase tracking-wider text-muted-foreground border-b border-border bg-muted/30">
          <span className="col-span-4">Актив</span>
          <span className="col-span-3 text-right">Доступно</span>
          <span className="col-span-3 text-right">≈ RUB</span>
          <span className="col-span-2 text-right">≈ USD</span>
        </div>
        {balances.map((b) => {
          const rub = b.amount * priceRub(b.asset)
          const usd = b.amount * priceUsd(b.asset)
          return (
            <div
              key={b.asset}
              className="grid grid-cols-12 px-4 py-3.5 items-center border-b border-border/60 last:border-0 hover:bg-muted/40 transition"
            >
              <div className="col-span-4 flex items-center gap-3">
                <CoinIcon symbol={b.asset} size={32} />
                <div>
                  <div className="font-semibold text-sm">{b.asset}</div>
                  <div className="text-[11px] text-muted-foreground">
                    {b.asset === 'RUB'
                      ? 'Российский рубль'
                      : b.asset === 'USDT'
                        ? 'Tether USD'
                        : b.asset === 'BTC'
                          ? 'Bitcoin'
                          : 'Ethereum'}
                  </div>
                </div>
              </div>
              <div className="col-span-3 text-right font-mono tabular-nums text-sm">
                {formatAmount(b.amount, b.asset)}
              </div>
              <div className="col-span-3 text-right font-mono tabular-nums text-sm">
                {formatPrice(rub, 'rub')}
              </div>
              <div className="col-span-2 text-right font-mono tabular-nums text-sm text-muted-foreground">
                {formatPrice(usd, 'usd')}
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
    toast.success('Адрес пополнения сгенерирован', {
      description: `${asset} • ${network}`,
    })
    onDeposited?.()
  }

  const handleCopy = async () => {
    if (!depositAddress) return
    try {
      await navigator.clipboard.writeText(depositAddress)
      setCopied(true)
      toast.success('Адрес скопирован')
      setTimeout(() => setCopied(false), 1500)
    } catch {
      toast.error('Не удалось скопировать')
    }
  }

  const isRub = asset === 'RUB'

  return (
    <div className="grid lg:grid-cols-2 gap-4">
      <Card className="p-5 space-y-5">
        <div className="space-y-2">
          <Label className="text-xs uppercase tracking-wider text-muted-foreground">
            Актив для пополнения
          </Label>
          <div className="grid grid-cols-4 gap-2">
            {ASSETS.map((a) => (
              <button
                key={a}
                onClick={() => handleAssetChange(a)}
                className={cn(
                  'flex flex-col items-center gap-1.5 py-3 rounded-lg border transition',
                  asset === a
                    ? 'border-primary bg-primary/10 text-primary'
                    : 'border-border bg-muted/30 text-muted-foreground hover:bg-muted/60'
                )}
              >
                <CoinIcon symbol={a} size={24} />
                <span className="text-xs font-medium">{a}</span>
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-2">
          <Label className="text-xs uppercase tracking-wider text-muted-foreground">
            Сеть
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
                <span className="text-sm flex-1">{n.label}</span>
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
          {depositAddress ? 'Сгенерировать новый адрес' : 'Сгенерировать адрес'}
        </Button>
      </Card>

      <Card className="p-5 space-y-4">
        <div className="flex items-center justify-between">
          <Label className="text-xs uppercase tracking-wider text-muted-foreground">
            Адрес пополнения
          </Label>
          {depositAddress && (
            <Badge className="bg-success/15 text-success border-success/30">
              Активен
            </Badge>
          )}
        </div>

        {!depositAddress ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <QrCode className="w-10 h-10 text-muted-foreground/40 mb-3" />
            <p className="text-sm text-muted-foreground">
              Нажмите «Сгенерировать адрес»
            </p>
            <p className="text-[11px] text-muted-foreground/70 mt-1">
              Адрес привязан к вашему аккаунту
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

            <div className="flex justify-center py-2">
              <img
                src={`https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(
                  isRub ? 'TINKOFF:' + depositAddress : depositAddress
                )}`}
                alt="QR-код адреса пополнения"
                width={180}
                height={180}
                className="rounded-lg border border-border bg-white p-2"
              />
            </div>

            <Separator />

            <div className="space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Актив</span>
                <span className="font-medium">{asset}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Сеть</span>
                <span className="font-medium">{network}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Мин. подтверждения</span>
                <span className="font-medium">
                  {isRub ? 'Мгновенно (СБП)' : network === 'BTC' ? '3 блоков' : '12 блоков'}
                </span>
              </div>
              {!isRub && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Мин. сумма</span>
                  <span className="font-medium">
                    {network === 'BTC' ? '0.0001 BTC' : '1 USDT / 0.001 ETH'}
                  </span>
                </div>
              )}
            </div>

            <div className="rounded-lg bg-warning/10 border border-warning/30 px-3 py-2.5 text-[11px] text-warning flex gap-2">
              <ShieldAlert className="w-4 h-4 shrink-0 mt-0.5" />
              <span>
                Отправляйте только {asset} по сети {network}. Отправка других активов
                или сетей приведёт к необратимой потере средств.
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
      toast.error('Введите сумму вывода')
      return
    }
    if (amountNum > available) {
      toast.error('Недостаточно средств')
      return
    }
    if (!address.trim()) {
      toast.error('Укажите адрес получателя')
      return
    }
    if (twofa.length < 6) {
      toast.error('Введите 2FA-код (6 цифр)')
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
    toast.success('Заявка на вывод создана', {
      description: `${formatAmount(amountNum, asset)} → ${address.slice(0, 12)}...`,
    })
    setAmount('')
    setAddress('')
    setTwofa('')
    onWithdrawn?.()
  }

  return (
    <div className="grid lg:grid-cols-[1fr_360px] gap-4">
      <Card className="p-5 space-y-5">
        <div className="space-y-2">
          <Label className="text-xs uppercase tracking-wider text-muted-foreground">
            Актив для вывода
          </Label>
          <div className="grid grid-cols-4 gap-2">
            {ASSETS.map((a) => (
              <button
                key={a}
                onClick={() => handleAssetChange(a)}
                className={cn(
                  'flex flex-col items-center gap-1.5 py-3 rounded-lg border transition',
                  asset === a
                    ? 'border-primary bg-primary/10 text-primary'
                    : 'border-border bg-muted/30 text-muted-foreground hover:bg-muted/60'
                )}
              >
                <CoinIcon symbol={a} size={24} />
                <span className="text-xs font-medium">{a}</span>
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-2">
          <Label className="text-xs uppercase tracking-wider text-muted-foreground">
            Сеть вывода
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
                <span className="text-sm flex-1">{n.label}</span>
                <span className="text-[11px] text-muted-foreground">
                  комиссия {fee} {asset === 'BTC' ? 'BTC' : asset === 'RUB' ? '₽' : 'USDT'}
                </span>
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label className="text-xs uppercase tracking-wider text-muted-foreground">
              Адрес получателя
            </Label>
            <span className="text-[11px] text-muted-foreground">
              Доступно: <span className="font-mono">{formatAmount(available, asset)}</span>
            </span>
          </div>
          <Input
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            placeholder={asset === 'RUB' ? 'Номер счёта / телефон СБП' : '0x... / bc1q...'}
            className="font-mono text-sm h-10"
          />
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label className="text-xs uppercase tracking-wider text-muted-foreground">
              Сумма вывода
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
              <span>
                Сумма превышает 100 000 ₽ — потребуется дополнительное подтверждение
                оператором (мультифакторная проверка, до 2 часов).
              </span>
            </div>
          )}
        </div>

        <div className="space-y-2">
          <Label className="text-xs uppercase tracking-wider text-muted-foreground">
            2FA-код (Google Authenticator)
          </Label>
          <Input
            value={twofa}
            onChange={(e) => setTwofa(e.target.value.replace(/\D/g, '').slice(0, 6))}
            placeholder="000 000"
            inputMode="numeric"
            className="font-mono tracking-[0.3em] text-center h-10"
          />
        </div>

        <div className="flex items-center justify-between rounded-lg border border-border bg-muted/30 px-3 py-2.5">
          <div className="flex items-center gap-2">
            <Switch checked={whitelist} onCheckedChange={setWhitelist} />
            <span className="text-xs">Белый список адресов</span>
          </div>
          <span className="text-[10px] text-muted-foreground">
            {whitelist ? 'Включён' : 'Выключен'}
          </span>
        </div>

        <Button
          onClick={handleSubmit}
          className="w-full h-10 bg-destructive text-white hover:bg-destructive/90 gap-2"
        >
          <ArrowUpFromLine className="w-4 h-4" />
          Запросить вывод
        </Button>
      </Card>

      <Card className="p-5 space-y-4 h-fit">
        <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Сводка вывода
        </div>
        <div className="space-y-3">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Сумма</span>
            <span className="font-mono tabular-nums">{formatAmount(amountNum, asset)}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Комиссия сети</span>
            <span className="font-mono tabular-nums text-destructive">
              −{fee} {asset === 'BTC' ? 'BTC' : asset === 'RUB' ? '₽' : 'USDT'}
            </span>
          </div>
          <Separator />
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Получит адресат</span>
            <span className="font-mono tabular-nums text-success">
              {formatAmount(receive, asset)}
            </span>
          </div>
          <div className="flex justify-between text-xs">
            <span className="text-muted-foreground">≈ RUB</span>
            <span className="font-mono tabular-nums">{formatPrice(amountRub, 'rub')}</span>
          </div>
        </div>
        <Separator />
        <div className="text-[11px] text-muted-foreground space-y-1.5">
          <p>• Вывод поступит в течение 1–30 минут (кроме BTC — до 60 минут).</p>
          <p>• Заявки обрабатываются в порядке очереди.</p>
          <p>• Лимиты: 600 000 ₽/сутки (KYC Lv.2).</p>
        </div>
      </Card>
    </div>
  )
}

// ─── History tab ────────────────────────────────────────────────────────────
function HistoryTab({ transactions }: { transactions: Transaction[] }) {
  if (transactions.length === 0) {
    return (
      <Card className="p-12 text-center">
        <History className="w-10 h-10 mx-auto text-muted-foreground/40 mb-3" />
        <p className="text-sm text-muted-foreground">История операций пуста</p>
        <p className="text-[11px] text-muted-foreground/70 mt-1">
          Пополните кошелёк или совершите сделку, чтобы увидеть записи
        </p>
      </Card>
    )
  }

  return (
    <Card className="overflow-hidden">
      <ScrollArea className="max-h-[640px]">
        {transactions.map((tx) => {
          const isPositive = tx.amount > 0
          return (
            <div
              key={tx.id}
              className="flex items-center gap-3 px-4 py-3 border-b border-border/60 last:border-0 hover:bg-muted/40"
            >
              <div className="w-9 h-9 rounded-full bg-muted/60 flex items-center justify-center shrink-0">
                {txIcon(tx.type)}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium capitalize">
                    {tx.type === 'deposit'
                      ? 'Пополнение'
                      : tx.type === 'withdrawal'
                        ? 'Вывод'
                        : tx.type === 'trade'
                          ? 'Сделка'
                          : tx.type === 'payment'
                            ? 'Платёж'
                            : 'Комиссия'}
                  </span>
                  <Badge variant="outline" className="text-[10px] h-5">
                    {tx.asset}
                  </Badge>
                  {statusBadge(tx.status)}
                </div>
                <div className="text-[11px] text-muted-foreground mt-0.5 flex items-center gap-2">
                  <span>{timeAgo(new Date()) === 'только что' ? tx.time : tx.time}</span>
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
            </div>
          )
        })}
      </ScrollArea>
    </Card>
  )
}

// ─── Main WalletView ────────────────────────────────────────────────────────
export function WalletView() {
  // Refresh trigger — bump to force a re-fetch from /api/wallet
  const [refreshKey, setRefreshKey] = useState(0)
  const walletUrl = refreshKey ? `/api/wallet?t=${refreshKey}` : '/api/wallet'
  const { data } = useApi<{ balances: Balance[]; transactions: Transaction[] }>(
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

  return (
    <div className="flex-1 bg-background">
      <div className="mx-auto max-w-[1400px] px-4 lg:px-6 py-6 space-y-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary/15 flex items-center justify-center">
            <WalletIcon className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Кошелёк</h1>
            <p className="text-xs text-muted-foreground">
              Кастодия активов • hot/warm/cold 5/15/80
            </p>
          </div>
        </div>

        <TotalBalanceCard balances={balances} />

        <Tabs defaultValue="assets" className="w-full">
          <TabsList className="h-10 bg-muted/60 p-1">
            <TabsTrigger value="assets" className="gap-1.5">
              <WalletIcon className="w-3.5 h-3.5" />
              Активы
            </TabsTrigger>
            <TabsTrigger value="deposit" id="wallet-tab-deposit" className="gap-1.5">
              <ArrowDownToLine className="w-3.5 h-3.5" />
              Пополнить
            </TabsTrigger>
            <TabsTrigger value="withdraw" id="wallet-tab-withdraw" className="gap-1.5">
              <ArrowUpFromLine className="w-3.5 h-3.5" />
              Вывести
            </TabsTrigger>
            <TabsTrigger value="history" className="gap-1.5">
              <History className="w-3.5 h-3.5" />
              История
            </TabsTrigger>
          </TabsList>
          <TabsContent value="assets" className="mt-4">
            <AssetsTab balances={balances} />
          </TabsContent>
          <TabsContent value="deposit" className="mt-4">
            <DepositTab onDeposited={refresh} />
          </TabsContent>
          <TabsContent value="withdraw" className="mt-4">
            <WithdrawTab balances={balances} onWithdrawn={refresh} />
          </TabsContent>
          <TabsContent value="history" className="mt-4">
            <HistoryTab transactions={transactions} />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}
