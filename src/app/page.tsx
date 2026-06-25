'use client'

import { useEffect } from 'react'
import {
  Home,
  Newspaper,
  CandlestickChart,
  LineChart,
  TrendingUp,
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
import { timeAgo } from '@/lib/format'
import { useMounted } from '@/lib/use-mounted'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import {
  Sheet,
  SheetContent,
  SheetTrigger,
  SheetTitle,
} from '@/components/ui/sheet'
import { useState } from 'react'
import { PanelLeftClose, PanelLeftOpen } from 'lucide-react'
import { PriceTicker } from '@/components/price-ticker'
import { NotificationsBell } from '@/components/notifications-bell'
import { ThemeToggle } from '@/components/theme-toggle'
import { HomeView } from '@/components/views/home-view'
import { MarketsView } from '@/components/views/markets-view'
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
import { MarginView } from '@/components/views/margin-view'
import { NewsView } from '@/components/views/news-view'

interface NavItem {
  id: ViewId
  label: string
  icon: React.ComponentType<{ className?: string }>
  group: string
}

const NAV: NavItem[] = [
  { id: 'home', label: 'Главная', icon: Home, group: 'Обзор' },
  { id: 'news', label: 'Новости', icon: Newspaper, group: 'Обзор' },
  { id: 'trade', label: 'Торги', icon: CandlestickChart, group: 'Торговля' },
  { id: 'markets', label: 'Рынки', icon: LineChart, group: 'Торговля' },
  { id: 'margin', label: 'Маржа', icon: TrendingUp, group: 'Торговля' },
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
  news: NewsView,
  trade: TradeView,
  markets: MarketsView,
  margin: MarginView,
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

function SidebarContent({ onNavigate, collapsed }: { onNavigate?: () => void; collapsed?: boolean }) {
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
    <TooltipProvider delayDuration={200}>
      <nav className={cn('flex flex-col gap-4', collapsed ? 'p-2' : 'p-3')}>
        {groups.map((group) => (
          <div key={group}>
            {!collapsed && (
              <div className="px-3 mb-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/70">
                {group}
              </div>
            )}
            {collapsed && <div className="h-px mx-2 my-1 bg-border/60" />}
            <div className="flex flex-col gap-0.5">
              {NAV.filter((n) => n.group === group).map((item) => {
                const active = activeView === item.id
                const btn = (
                  <button
                    key={item.id}
                    onClick={() => handleClick(item.id)}
                    className={cn(
                      'flex items-center rounded-xl text-sm font-medium transition-all w-full',
                      collapsed ? 'justify-center p-2.5' : 'gap-3 px-3 py-2.5 text-left',
                      active
                        ? 'bg-primary/15 text-primary'
                        : 'text-muted-foreground hover:text-foreground hover:bg-muted/60'
                    )}
                  >
                    <item.icon className={cn('w-[18px] h-[18px] shrink-0', active && 'text-primary')} />
                    {!collapsed && <span className="flex-1">{item.label}</span>}
                    {!collapsed && item.id === 'compliance' && openAlerts > 0 && (
                      <Badge variant="destructive" className="h-5 px-1.5 text-[10px]">
                        {openAlerts}
                      </Badge>
                    )}
                    {collapsed && item.id === 'compliance' && openAlerts > 0 && (
                      <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-destructive" />
                    )}
                    {!collapsed && active && <div className="w-1 h-5 rounded-full bg-primary" />}
                  </button>
                )
                if (collapsed) {
                  return (
                    <Tooltip key={item.id}>
                      <TooltipTrigger asChild>
                        <div className="relative">{btn}</div>
                      </TooltipTrigger>
                      <TooltipContent side="right" sideOffset={8}>
                        {item.label}
                        {item.id === 'compliance' && openAlerts > 0 && (
                          <span className="ml-1.5 text-destructive">({openAlerts})</span>
                        )}
                      </TooltipContent>
                    </Tooltip>
                  )
                }
                return btn
              })}
            </div>
          </div>
        ))}
      </nav>
    </TooltipProvider>
  )
}

function NewsTicker() {
  const newsItems = useAppStore((s) => s.newsItems)
  const setView = useAppStore((s) => s.setView)
  const mounted = useMounted()
  const headlines = newsItems.slice(0, 4)
  if (headlines.length === 0) return null
  const items = [...headlines, ...headlines, ...headlines] // loop 3x for smooth marquee
  return (
    <div className="hidden md:block border-b border-border bg-card/40 overflow-hidden">
      <div className="flex items-center">
        <div className="shrink-0 px-3 py-1 bg-primary/15 text-primary text-[10px] font-bold uppercase tracking-wider flex items-center gap-1.5 border-r border-border">
          <Newspaper className="w-3 h-3" />
          Новости
        </div>
        <div className="relative flex-1 overflow-hidden">
          <div
            className="flex gap-8 whitespace-nowrap py-1 will-change-transform"
            style={{
              animation: 'news-marquee 48s linear infinite',
            }}
          >
            {items.map((n, i) => (
              <button
                key={`${n.id}-${i}`}
                onClick={() => setView('news')}
                className="text-xs text-muted-foreground hover:text-primary transition-colors shrink-0 inline-flex items-center gap-1.5"
                title={n.title}
              >
                <span className="w-1.5 h-1.5 rounded-full bg-primary/60" />
                <span className="font-medium text-foreground/80">{n.source.split(' • ')[0]}:</span>
                <span className="truncate max-w-[420px]">{n.title}</span>
                <span className="text-[10px] text-muted-foreground/60 ml-1">
                  {mounted ? timeAgo(n.publishedAt) : ''}
                </span>
              </button>
            ))}
          </div>
        </div>
      </div>
      <style jsx>{`
        @keyframes news-marquee {
          0% { transform: translateX(0); }
          100% { transform: translateX(-33.333%); }
        }
      `}</style>
    </div>
  )
}

function Header() {
  const isAuthed = useAppStore((s) => s.isAuthed)
  const userName = useAppStore((s) => s.userName)
  const setView = useAppStore((s) => s.setView)
  const priceAlerts = useAppStore((s) => s.priceAlerts)
  const [mobileOpen, setMobileOpen] = useState(false)

  const activeAlerts = priceAlerts.filter((a) => a.active && !a.triggered).length

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

        <div className="flex items-center gap-1">
          <ThemeToggle />
          {/* Price alerts indicator */}
          {activeAlerts > 0 && (
            <Button
              variant="ghost"
              size="icon"
              className="relative"
              onClick={() => setView('markets')}
              title={`Активных алертов: ${activeAlerts}`}
            >
              <Bell className="w-5 h-5" />
              <span className="absolute top-1 right-1 w-4 h-4 rounded-full bg-primary text-primary-foreground text-[9px] font-bold flex items-center justify-center">
                {activeAlerts > 9 ? '9+' : activeAlerts}
              </span>
            </Button>
          )}
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
      <NewsTicker />
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
  const collapsed = useAppStore((s) => s.sidebarCollapsed)
  const toggleSidebar = useAppStore((s) => s.toggleSidebar)
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
        <aside
          className={cn(
            'hidden lg:flex shrink-0 flex-col border-r border-border bg-sidebar/40 sticky top-[88px] h-[calc(100vh-88px)] overflow-y-auto scrollbar-thin transition-[width] duration-200',
            collapsed ? 'w-[68px]' : 'w-64'
          )}
        >
          {/* Collapse toggle */}
          <div className={cn('flex border-b border-border', collapsed ? 'justify-center p-2' : 'justify-end p-2')}>
            <Button
              variant="ghost"
              size="icon"
              onClick={toggleSidebar}
              className="h-8 w-8 text-muted-foreground hover:text-foreground"
              aria-label={collapsed ? 'Развернуть меню' : 'Свернуть меню'}
            >
              {collapsed ? <PanelLeftOpen className="w-4 h-4" /> : <PanelLeftClose className="w-4 h-4" />}
            </Button>
          </div>
          <SidebarContent collapsed={collapsed} />
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
