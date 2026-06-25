'use client'

import { useEffect } from 'react'
import {
  Home,
  CandlestickChart,
  Users,
  Send,
  Wallet,
  PieChart,
  BarChart3,
  ShieldCheck,
  Scale,
  UserCircle,
  Bell,
  Menu,
  X,
} from 'lucide-react'
import { useAppStore } from '@/lib/store'
import type { ViewId } from '@/lib/types'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Sheet,
  SheetContent,
  SheetTrigger,
  SheetTitle,
} from '@/components/ui/sheet'
import { useState } from 'react'
import { PriceTicker } from '@/components/price-ticker'
import { NotificationsBell } from '@/components/notifications-bell'
import { HomeView } from '@/components/views/home-view'
import { TradeView } from '@/components/views/trade-view'
import { P2PView } from '@/components/views/p2p-view'
import { PaymentsView } from '@/components/views/payments-view'
import { WalletView } from '@/components/views/wallet-view'
import { PortfolioView } from '@/components/views/portfolio-view'
import { AnalyticsView } from '@/components/views/analytics-view'
import { KycView } from '@/components/views/kyc-view'
import { ComplianceView } from '@/components/views/compliance-view'
import { ProfileView } from '@/components/views/profile-view'
import { AuthView } from '@/components/views/auth-view'

interface NavItem {
  id: ViewId
  label: string
  icon: React.ComponentType<{ className?: string }>
  group: string
}

const NAV: NavItem[] = [
  { id: 'home', label: 'Главная', icon: Home, group: 'Обзор' },
  { id: 'trade', label: 'Торги', icon: CandlestickChart, group: 'Торговля' },
  { id: 'p2p', label: 'P2P', icon: Users, group: 'Торговля' },
  { id: 'payments', label: 'Кросс-бордер', icon: Send, group: 'Торговля' },
  { id: 'wallet', label: 'Кошелёк', icon: Wallet, group: 'Активы' },
  { id: 'portfolio', label: 'Портфель', icon: PieChart, group: 'Активы' },
  { id: 'analytics', label: 'Аналитика', icon: BarChart3, group: 'Активы' },
  { id: 'kyc', label: 'Верификация', icon: ShieldCheck, group: 'Аккаунт' },
  { id: 'compliance', label: 'Комплаенс', icon: Scale, group: 'Аккаунт' },
  { id: 'profile', label: 'Профиль', icon: UserCircle, group: 'Аккаунт' },
]

const VIEW_COMPONENTS: Record<ViewId, React.ComponentType> = {
  home: HomeView,
  trade: TradeView,
  p2p: P2PView,
  payments: PaymentsView,
  wallet: WalletView,
  portfolio: PortfolioView,
  analytics: AnalyticsView,
  kyc: KycView,
  compliance: ComplianceView,
  profile: ProfileView,
  auth: AuthView,
}

function Logo() {
  return (
    <div className="flex items-center gap-2.5">
      <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center text-black font-black text-xl shadow-lg shadow-amber-500/20">
        ₿
      </div>
      <div className="leading-none">
        <div className="font-bold text-lg tracking-tight">РусКрипто</div>
        <div className="text-[10px] text-muted-foreground tracking-wider">ЛЕГАЛЬНАЯ БИРЖА РФ</div>
      </div>
    </div>
  )
}

function SidebarContent({ onNavigate }: { onNavigate?: () => void }) {
  const activeView = useAppStore((s) => s.activeView)
  const setView = useAppStore((s) => s.setView)
  const alerts = useAppStore((s) => s.alerts)
  const openAlerts = alerts.filter((a) => a.status === 'OPEN').length

  const groups = Array.from(new Set(NAV.map((n) => n.group)))

  const handleClick = (id: ViewId) => {
    setView(id)
    onNavigate?.()
  }

  return (
    <nav className="flex flex-col gap-5 p-3">
      {groups.map((group) => (
        <div key={group}>
          <div className="px-3 mb-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/70">
            {group}
          </div>
          <div className="flex flex-col gap-0.5">
            {NAV.filter((n) => n.group === group).map((item) => {
              const active = activeView === item.id
              return (
                <button
                  key={item.id}
                  onClick={() => handleClick(item.id)}
                  className={cn(
                    'flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all w-full text-left',
                    active
                      ? 'bg-primary/15 text-primary'
                      : 'text-muted-foreground hover:text-foreground hover:bg-muted/60'
                  )}
                >
                  <item.icon className={cn('w-[18px] h-[18px]', active && 'text-primary')} />
                  <span className="flex-1">{item.label}</span>
                  {item.id === 'compliance' && openAlerts > 0 && (
                    <Badge variant="destructive" className="h-5 px-1.5 text-[10px]">
                      {openAlerts}
                    </Badge>
                  )}
                  {active && <div className="w-1 h-5 rounded-full bg-primary" />}
                </button>
              )
            })}
          </div>
        </div>
      ))}
    </nav>
  )
}

function Header() {
  const isAuthed = useAppStore((s) => s.isAuthed)
  const userName = useAppStore((s) => s.userName)
  const setView = useAppStore((s) => s.setView)
  const [mobileOpen, setMobileOpen] = useState(false)

  return (
    <header className="sticky top-0 z-40 border-b border-border bg-background/80 backdrop-blur-xl">
      <div className="flex items-center justify-between px-4 lg:px-6 h-16">
        <div className="flex items-center gap-3">
          {/* Mobile menu */}
          <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="lg:hidden">
                <Menu className="w-5 h-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-72 p-0 border-r border-border">
              <SheetTitle className="sr-only">Меню навигации</SheetTitle>
              <div className="p-4 border-b border-border">
                <Logo />
              </div>
              <div className="overflow-y-auto scrollbar-thin h-[calc(100vh-80px)]">
                <SidebarContent onNavigate={() => setMobileOpen(false)} />
              </div>
            </SheetContent>
          </Sheet>
          <div className="lg:hidden">
            <Logo />
          </div>
        </div>

        <div className="hidden md:flex items-center gap-1 flex-1 max-w-md mx-6">
          <PriceTicker />
        </div>

        <div className="flex items-center gap-2">
          <NotificationsBell />
          {isAuthed ? (
            <Button
              variant="ghost"
              onClick={() => setView('profile')}
              className="gap-2 px-3"
            >
              <div className="w-7 h-7 rounded-full bg-gradient-to-br from-sky-500 to-violet-600 flex items-center justify-center text-xs font-bold">
                {userName?.slice(0, 1).toUpperCase() || 'U'}
              </div>
              <span className="hidden sm:inline text-sm">{userName}</span>
            </Button>
          ) : (
            <Button
              onClick={() => setView('auth')}
              className="bg-primary text-primary-foreground hover:bg-primary/90"
            >
              Войти
            </Button>
          )}
        </div>
      </div>
    </header>
  )
}

function Footer() {
  return (
    <footer className="mt-auto border-t border-border bg-background/60">
      <div className="max-w-[1600px] mx-auto px-4 lg:px-6 py-6">
        <div className="flex flex-col md:flex-row items-center justify-between gap-3 text-xs text-muted-foreground">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-3.5 h-3.5 text-success" />
            <span>Соответствие ФЗ-1194918-8 • 115-ФЗ • 152-ФЗ</span>
          </div>
          <div>Демонстрационный MVP • Лицензия ЦБ РФ (ожидается) • © 2026 РусКрипто</div>
        </div>
      </div>
    </footer>
  )
}

export default function CryptoExchangeApp() {
  const activeView = useAppStore((s) => s.activeView)
  const ViewComponent = VIEW_COMPONENTS[activeView] || HomeView

  // Прокрутка наверх при смене view
  useEffect(() => {
    if (typeof window !== 'undefined') {
      window.scrollTo({ top: 0, behavior: 'smooth' })
    }
  }, [activeView])

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <div className="flex flex-1">
        {/* Desktop sidebar */}
        <aside className="hidden lg:flex w-64 shrink-0 flex-col border-r border-border bg-sidebar/40 sticky top-16 h-[calc(100vh-4rem)] overflow-y-auto scrollbar-thin">
          <SidebarContent />
        </aside>

        {/* Main */}
        <div className="flex-1 flex flex-col min-w-0">
          <Header />
          <main className="flex-1 flex flex-col">
            <ViewComponent />
          </main>
          <Footer />
        </div>
      </div>
    </div>
  )
}
