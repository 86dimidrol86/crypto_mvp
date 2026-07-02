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
  Landmark,
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
import { Logo } from '@/components/logo'
import { LanguageSwitcher } from '@/components/language-switcher'
import { useI18n } from '@/lib/use-i18n'
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
import { AdminView } from '@/components/views/admin-view'
import { MarginView } from '@/components/views/margin-view'
import { NewsView } from '@/components/views/news-view'
import { HelpView } from '@/components/views/help-view'
import { FinanceView } from '@/components/views/finance-view'
import { HelpChatWidget } from '@/components/help-chat-widget'
import { HelpCircle } from 'lucide-react'

interface NavItem {
  id: ViewId
  label: string
  icon: React.ComponentType<{ className?: string }>
  group: string
  i18n?: boolean
  groupI18n?: boolean
}

const NAV: NavItem[] = [
  { id: 'home', label: 'nav.home', i18n: true, icon: Home, group: 'nav.group.obzor', groupI18n: true },
  { id: 'news', label: 'nav.news', i18n: true, icon: Newspaper, group: 'nav.group.obzor', groupI18n: true },
  { id: 'help', label: 'nav.help', i18n: true, icon: HelpCircle, group: 'nav.group.obzor', groupI18n: true },
  { id: 'trade', label: 'nav.trade', i18n: true, icon: CandlestickChart, group: 'nav.group.torgovlya', groupI18n: true },
  { id: 'markets', label: 'nav.markets', i18n: true, icon: LineChart, group: 'nav.group.torgovlya', groupI18n: true },
  { id: 'margin', label: 'nav.margin', i18n: true, icon: TrendingUp, group: 'nav.group.torgovlya', groupI18n: true },
  { id: 'p2p', label: 'nav.p2p', i18n: true, icon: Users, group: 'nav.group.torgovlya', groupI18n: true },
  { id: 'payments', label: 'nav.payments', i18n: true, icon: Send, group: 'nav.group.torgovlya', groupI18n: true },
  { id: 'wallet', label: 'nav.wallet', i18n: true, icon: Wallet, group: 'nav.group.aktivy', groupI18n: true },
  { id: 'portfolio', label: 'nav.portfolio', i18n: true, icon: PieChart, group: 'nav.group.aktivy', groupI18n: true },
  { id: 'analytics', label: 'nav.analytics', i18n: true, icon: BarChart3, group: 'nav.group.aktivy', groupI18n: true },
  { id: 'kyc', label: 'nav.kyc', i18n: true, icon: ShieldCheck, group: 'nav.group.akkaunt', groupI18n: true },
  { id: 'compliance', label: 'nav.compliance', i18n: true, icon: Scale, group: 'nav.group.akkaunt', groupI18n: true },
  { id: 'admin', label: 'nav.admin', i18n: true, icon: ShieldCheck, group: 'nav.group.akkaunt', groupI18n: true },
  { id: 'finance', label: 'nav.finance', i18n: true, icon: Landmark, group: 'nav.group.akkaunt', groupI18n: true },
  { id: 'profile', label: 'nav.profile', i18n: true, icon: UserCircle, group: 'nav.group.akkaunt', groupI18n: true },
]

const VIEW_COMPONENTS: Record<ViewId, React.ComponentType> = {
  home: HomeView,
  news: NewsView,
  help: HelpView,
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
  admin: AdminView,
  finance: FinanceView,
}

function SidebarContent({ onNavigate, collapsed }: { onNavigate?: () => void; collapsed?: boolean }) {
  const activeView = useAppStore((s) => s.activeView)
  const setView = useAppStore((s) => s.setView)
  const alerts = useAppStore((s) => s.alerts)
  const userRole = useAppStore((s) => s.userRole)
  const enabledModules = useAppStore((s) => s.enabledModules)
  const openAlerts = alerts.filter((a) => a.status === 'OPEN').length
  const { t } = useI18n()

  const isAdmin = userRole === 'ADMIN' || userRole === 'COMPLIANCE'
  const isFinance = userRole === 'ADMIN' || userRole === 'FINANCE'
  // Filter admin/finance nav items + disabled modules (p2p, crossBorder)
  const visibleNav = NAV.filter(
    (n) =>
      (n.id !== 'admin' || isAdmin) &&
      (n.id !== 'finance' || isFinance) &&
      (n.id !== 'p2p' || enabledModules.p2p) &&
      (n.id !== 'payments' || enabledModules.crossBorder)
  )
  const groups = Array.from(new Set(visibleNav.map((n) => n.group)))

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
                {group.includes('.') ? t(group) : group}
              </div>
            )}
            {collapsed && <div className="h-px mx-2 my-1 bg-border/60" />}
            <div className="flex flex-col gap-0.5">
              {visibleNav.filter((n) => n.group === group).map((item) => {
                const active = activeView === item.id
                const label = item.i18n ? t(item.label) : item.label
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
                    {!collapsed && <span className="flex-1">{label}</span>}
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
                        {label}
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
  const headlines = newsItems.slice(0, 5)
  if (headlines.length === 0) return null
  const items = [...headlines, ...headlines, ...headlines]
  return (
    <div className="hidden md:block border-b border-border bg-card/30 overflow-hidden h-6">
      <div className="flex items-center h-full">
        <div className="shrink-0 px-2 h-full bg-primary/15 text-primary text-[9px] font-bold uppercase tracking-wider flex items-center gap-1 border-r border-border">
          <Newspaper className="w-2.5 h-2.5" />
          Новости
        </div>
        <div className="relative flex-1 overflow-hidden h-full flex items-center">
          <div
            className="flex gap-6 whitespace-nowrap will-change-transform"
            style={{ animation: 'news-marquee 55s linear infinite' }}
          >
            {items.map((n, i) => (
              <button
                key={`${n.id}-${i}`}
                onClick={() => setView('news')}
                className="text-[11px] text-muted-foreground hover:text-primary transition-colors shrink-0 inline-flex items-center gap-1.5"
                title={n.title}
              >
                <span className="w-1 h-1 rounded-full bg-primary/50" />
                <span className="font-medium text-foreground/70">{n.source.split(' • ')[0]}:</span>
                <span className="truncate max-w-[380px]">{n.title}</span>
                <span className="text-[9px] text-muted-foreground/50 ml-0.5">
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
  const { t } = useI18n()

  const activeAlerts = priceAlerts.filter((a) => a.active && !a.triggered).length

  return (
    <header className="sticky top-0 z-40 border-b border-border bg-background/80 backdrop-blur-xl">
      <div className="flex items-center px-3 lg:px-4 h-12 gap-3">
        {/* Mobile menu */}
        <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
          <SheetTrigger asChild>
            <Button variant="ghost" size="icon" className="lg:hidden h-9 w-9">
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

        {/* Logo — mobile only (desktop has it in sidebar) */}
        <div className="lg:hidden shrink-0">
          <button onClick={() => setView('home')}>
            <Logo size={26} showText={false} />
          </button>
        </div>

        {/* Price ticker — full width */}
        <div className="hidden md:flex items-center flex-1 min-w-0 h-9">
          <PriceTicker />
        </div>

        {/* Right controls */}
        <div className="flex items-center gap-0.5 shrink-0">
          <LanguageSwitcher />
          <ThemeToggle />
          {activeAlerts > 0 && (
            <Button
              variant="ghost"
              size="icon"
              className="relative h-9 w-9"
              onClick={() => setView('markets')}
              title={`${t('header.alerts')}: ${activeAlerts}`}
            >
              <Bell className="w-[18px] h-[18px]" />
              <span className="absolute top-0.5 right-0.5 min-w-[14px] h-[14px] px-1 rounded-full bg-primary text-primary-foreground text-[9px] font-bold flex items-center justify-center">
                {activeAlerts > 9 ? '9+' : activeAlerts}
              </span>
            </Button>
          )}
          <NotificationsBell />
          {isAuthed ? (
            <Button
              variant="ghost"
              onClick={() => setView('profile')}
              className="gap-2 px-2 h-9"
            >
              <div className="w-7 h-7 rounded-full bg-gradient-to-br from-sky-500 to-violet-600 flex items-center justify-center text-xs font-bold">
                {userName?.slice(0, 1).toUpperCase() || 'U'}
              </div>
              <span className="hidden xl:inline text-sm">{userName}</span>
            </Button>
          ) : (
            <Button
              onClick={() => setView('auth')}
              className="bg-primary text-primary-foreground hover:bg-primary/90 h-9 px-4 text-sm"
            >
              {t('header.login')}
            </Button>
          )}
        </div>
      </div>
      <NewsTicker />
    </header>
  )
}

function Footer() {
  const { t } = useI18n()
  return (
    <footer className="mt-auto border-t border-border bg-background/60">
      <div className="max-w-[1600px] mx-auto px-4 lg:px-6 py-4">
        <div className="flex flex-col md:flex-row items-center justify-between gap-2 text-xs text-muted-foreground">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-3.5 h-3.5 text-success" />
            <span>{t('footer.compliance')}</span>
          </div>
          <div>{t('footer.demo')}</div>
        </div>
      </div>
    </footer>
  )
}

export default function CryptoExchangeApp() {
  const activeView = useAppStore((s) => s.activeView)
  const setView = useAppStore((s) => s.setView)
  const collapsed = useAppStore((s) => s.sidebarCollapsed)
  const toggleSidebar = useAppStore((s) => s.toggleSidebar)
  const userRole = useAppStore((s) => s.userRole)
  const isAdmin = userRole === 'ADMIN' || userRole === 'COMPLIANCE'
  const ViewComponent = VIEW_COMPONENTS[activeView] || HomeView

  // Лого: переход на главную + toggle свернуть/развернуть
  const handleLogoClick = () => {
    setView('home')
    toggleSidebar()
  }

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
            'hidden lg:flex shrink-0 flex-col border-r border-border bg-sidebar/40 sticky top-0 h-screen overflow-hidden transition-[width] duration-200',
            collapsed ? 'w-[68px]' : 'w-64'
          )}
        >
          {/* Logo at top — click toggles sidebar + goes home */}
          <button
            onClick={handleLogoClick}
            className={cn(
              'shrink-0 border-b border-border hover:bg-muted/40 transition',
              collapsed ? 'p-2 flex justify-center' : 'px-3 py-2.5 flex items-center gap-2.5'
            )}
            aria-label="РусКрипто — на главную / свернуть меню"
            title={collapsed ? 'Развернуть меню' : 'Свернуть меню'}
          >
            <Logo size={collapsed ? 30 : 30} showText={!collapsed} />
          </button>

          {/* Nav content (scrollable) */}
          <div className="flex-1 overflow-y-auto scrollbar-thin">
            <SidebarContent collapsed={collapsed} />
          </div>

          {/* Collapse toggle at bottom (duplicates logo click) */}
          <div className={cn('shrink-0 border-t border-border', collapsed ? 'p-2 flex justify-center' : 'p-2 flex justify-end')}>
            <Button
              variant="ghost"
              size="icon"
              onClick={toggleSidebar}
              className="h-8 w-8 text-muted-foreground hover:text-foreground"
              aria-label={collapsed ? 'Развернуть меню' : 'Свернуть меню'}
              title={collapsed ? 'Развернуть меню' : 'Свернуть меню'}
            >
              {collapsed ? <PanelLeftOpen className="w-4 h-4" /> : <PanelLeftClose className="w-4 h-4" />}
            </Button>
          </div>
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
      {/* Floating AI assistant — hidden on help view (redundant) */}
      {activeView !== 'help' && <HelpChatWidget />}
    </div>
  )
}
