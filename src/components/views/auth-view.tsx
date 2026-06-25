'use client'

import { useState } from 'react'
import {
  ShieldCheck,
  Lock,
  Mail,
  Phone,
  Eye,
  EyeOff,
  ArrowRight,
  CheckCircle2,
  Building2,
  Scale,
  Globe2,
  Zap,
  LogOut,
  UserCircle,
  Landmark,
} from 'lucide-react'
import { useAppStore } from '@/lib/store'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import { toast } from 'sonner'

type Mode = 'login' | 'register'

const VALUE_PROPS = [
  {
    icon: ShieldCheck,
    title: 'Полное соответствие ФЗ-1194918-8',
    desc: 'Легальная криптобиржа под надзором ЦБ РФ. AML-комплаенс по 115-ФЗ.',
  },
  {
    icon: Landmark,
    title: 'Кастодия уровня ЦБ',
    desc: 'Hot/Warm/Cold 5/15/80. HSM с 2-of-3 / 3-of-5 multisig.',
  },
  {
    icon: Globe2,
    title: 'Кросс-бордер платежи',
    desc: 'Коридоры в Китай, ОАЭ, Турцию, Индию и страны СНГ.',
  },
  {
    icon: Zap,
    title: 'Matching engine < 10 мс',
    desc: 'Движок на Rust, 100K TPS, price-time FIFO.',
  },
]

const BADGES = [
  { label: 'ФЗ-1194918-8', desc: 'О криптовалютах' },
  { label: '115-ФЗ', desc: 'AML / противодействие' },
  { label: '152-ФЗ', desc: 'Персональные данные' },
  { label: '173-ФЗ', desc: 'Валютный контроль' },
]

export function AuthView() {
  const isAuthed = useAppStore((s) => s.isAuthed)
  const userName = useAppStore((s) => s.userName)
  const userEmail = useAppStore((s) => s.userEmail)
  const login = useAppStore((s) => s.login)
  const logout = useAppStore((s) => s.logout)
  const setView = useAppStore((s) => s.setView)

  const [mode, setMode] = useState<Mode>('login')
  const [showPassword, setShowPassword] = useState(false)
  const [phone, setPhone] = useState('+7 ')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    if (mode === 'register') {
      if (!email || !password || !phone) {
        toast.error('Заполните все поля')
        return
      }
      if (password !== confirm) {
        toast.error('Пароли не совпадают')
        return
      }
      if (password.length < 8) {
        toast.error('Пароль должен быть не менее 8 символов')
        return
      }
    } else {
      if (!email || !password) {
        toast.error('Введите email и пароль')
        return
      }
    }

    setLoading(true)
    setTimeout(() => {
      const name = mode === 'register' ? email.split('@')[0] : 'Иван Иванов'
      login(email, name)
      setLoading(false)
      toast.success(mode === 'register' ? 'Аккаунт создан' : 'Добро пожаловать', {
        description: `Вы вошли как ${email}`,
      })
      setView('home')
    }, 800)
  }

  const handleGosuslugi = () => {
    setLoading(true)
    setTimeout(() => {
      login('ivan.ivanov@gosuslugi.ru', 'Иван Иванов')
      setLoading(false)
      toast.success('Вход через Госуслуги выполнен', {
        description: 'ЕСИА • уровень учётной записи: подтверждённая',
      })
      setView('home')
    }, 900)
  }

  // If already authed
  if (isAuthed) {
    return (
      <div className="flex-1 flex items-center justify-center p-6 lg:p-12">
        <Card className="p-8 lg:p-10 max-w-md w-full text-center relative overflow-hidden bg-gradient-to-br from-primary/5 via-card to-card border-primary/20">
          <div className="absolute -top-16 -right-16 w-48 h-48 rounded-full bg-primary/10 blur-3xl" aria-hidden />
          <div className="relative">
            <div className="w-16 h-16 rounded-2xl bg-success/15 flex items-center justify-center mx-auto mb-4">
              <CheckCircle2 className="w-8 h-8 text-success" />
            </div>
            <h1 className="text-2xl font-bold mb-2">Вы уже вошли</h1>
            <p className="text-sm text-muted-foreground mb-6">
              Аккаунт: <span className="text-foreground font-medium">{userName}</span>
              <br />
              {userEmail}
            </p>
            <div className="space-y-2.5">
              <Button
                onClick={() => setView('profile')}
                className="bg-primary text-primary-foreground hover:bg-primary/90 w-full gap-2"
              >
                <UserCircle className="w-4 h-4" />
                Перейти в профиль
              </Button>
              <Button
                onClick={() => setView('home')}
                variant="outline"
                className="w-full gap-2"
              >
                На главную
                <ArrowRight className="w-4 h-4" />
              </Button>
              <Button
                onClick={() => {
                  logout()
                  toast.success('Вы вышли из аккаунта')
                }}
                variant="ghost"
                className="w-full text-destructive hover:bg-destructive/10 gap-2"
              >
                <LogOut className="w-4 h-4" />
                Выйти
              </Button>
            </div>
          </div>
        </Card>
      </div>
    )
  }

  return (
    <div className="flex-1">
      <div className="max-w-[1200px] mx-auto px-4 lg:px-8 py-8 lg:py-12">
        <div className="grid lg:grid-cols-2 gap-8 lg:gap-12 items-stretch">
          {/* Side panel with value props (hidden on mobile) */}
          <div className="hidden lg:flex flex-col">
            <div className="flex items-center gap-3 mb-8">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center text-black font-black text-2xl shadow-lg shadow-amber-500/20">
                ₿
              </div>
              <div>
                <div className="font-bold text-2xl tracking-tight">РусКрипто</div>
                <div className="text-xs text-muted-foreground tracking-wider">ЛЕГАЛЬНАЯ КРИПТОПЛАТФОРМА РФ</div>
              </div>
            </div>

            <h2 className="text-3xl font-bold leading-tight mb-3">
              Торговля криптовалютой <span className="text-primary">по закону РФ</span>
            </h2>
            <p className="text-sm text-muted-foreground mb-8">
              Первая лицензированная криптобиржа под надзором ЦБ. Спот-торги,
              P2P, кросс-бордер платежи и кастодия в единой экосистеме.
            </p>

            <div className="space-y-4 mb-8">
              {VALUE_PROPS.map((v) => (
                <div key={v.title} className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-xl bg-primary/15 flex items-center justify-center shrink-0">
                    <v.icon className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <div className="font-semibold text-sm">{v.title}</div>
                    <div className="text-xs text-muted-foreground mt-0.5">{v.desc}</div>
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-auto">
              <div className="text-xs text-muted-foreground uppercase tracking-wider mb-3 flex items-center gap-2">
                <Scale className="w-3.5 h-3.5" />
                Регуляторная база
              </div>
              <div className="grid grid-cols-2 gap-2.5">
                {BADGES.map((b) => (
                  <div key={b.label} className="rounded-xl bg-muted/40 border border-border p-3">
                    <div className="font-mono font-bold text-sm text-primary">{b.label}</div>
                    <div className="text-[11px] text-muted-foreground mt-0.5">{b.desc}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Form card */}
          <Card className="p-6 lg:p-8 relative overflow-hidden">
            <div className="absolute -top-20 -right-20 w-56 h-56 rounded-full bg-primary/5 blur-3xl" aria-hidden />
            <div className="relative">
              {/* Mobile logo */}
              <div className="lg:hidden flex items-center gap-2.5 mb-6">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center text-black font-black text-xl shadow-lg shadow-amber-500/20">
                  ₿
                </div>
                <div className="leading-none">
                  <div className="font-bold text-lg">РусКрипто</div>
                  <div className="text-[10px] text-muted-foreground tracking-wider mt-0.5">ЛЕГАЛЬНАЯ КРИПТОПЛАТФОРМА РФ</div>
                </div>
              </div>

              {/* Toggle */}
              <div className="flex gap-1 bg-muted/60 p-1 rounded-xl mb-6">
                <button
                  type="button"
                  onClick={() => setMode('login')}
                  className={cn(
                    'flex-1 py-2 rounded-lg text-sm font-semibold transition',
                    mode === 'login' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground'
                  )}
                >
                  Вход
                </button>
                <button
                  type="button"
                  onClick={() => setMode('register')}
                  className={cn(
                    'flex-1 py-2 rounded-lg text-sm font-semibold transition',
                    mode === 'register' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground'
                  )}
                >
                  Регистрация
                </button>
              </div>

              <h1 className="text-2xl font-bold mb-1">
                {mode === 'login' ? 'Вход в аккаунт' : 'Создать аккаунт'}
              </h1>
              <p className="text-sm text-muted-foreground mb-6">
                {mode === 'login'
                  ? 'Введите данные для входа в личный кабинет'
                  : 'Зарегистрируйтесь для доступа к торгам и кошельку'}
              </p>

              <form onSubmit={handleSubmit} className="space-y-4">
                {mode === 'register' && (
                  <div>
                    <Label className="text-xs text-muted-foreground">Телефон</Label>
                    <div className="relative mt-1.5">
                      <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <Input
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        placeholder="+7 999 123-45-67"
                        className="pl-10"
                        type="tel"
                      />
                    </div>
                  </div>
                )}

                <div>
                  <Label className="text-xs text-muted-foreground">Email</Label>
                  <div className="relative mt-1.5">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="you@example.com"
                      className="pl-10"
                      type="email"
                      autoComplete="email"
                    />
                  </div>
                </div>

                <div>
                  <Label className="text-xs text-muted-foreground">Пароль</Label>
                  <div className="relative mt-1.5">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder={mode === 'register' ? 'Не менее 8 символов' : '••••••••'}
                      className="pl-10 pr-10"
                      type={showPassword ? 'text' : 'password'}
                      autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((v) => !v)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition"
                      tabIndex={-1}
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {mode === 'register' && (
                  <div>
                    <Label className="text-xs text-muted-foreground">Подтверждение пароля</Label>
                    <div className="relative mt-1.5">
                      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <Input
                        value={confirm}
                        onChange={(e) => setConfirm(e.target.value)}
                        placeholder="••••••••"
                        className="pl-10"
                        type={showPassword ? 'text' : 'password'}
                        autoComplete="new-password"
                      />
                    </div>
                  </div>
                )}

                {mode === 'login' && (
                  <div className="flex items-center justify-between text-xs">
                    <label className="flex items-center gap-2 text-muted-foreground cursor-pointer">
                      <input type="checkbox" className="rounded border-border accent-primary" defaultChecked />
                      Запомнить меня
                    </label>
                    <button type="button" className="text-primary hover:underline" onClick={() => toast.info('Восстановление пароля', { description: 'Ссылка отправлена на email' })}>
                      Забыли пароль?
                    </button>
                  </div>
                )}

                <Button
                  type="submit"
                  disabled={loading}
                  className="bg-primary text-primary-foreground hover:bg-primary/90 w-full h-11 gap-2"
                >
                  {loading ? (
                    <span className="w-4 h-4 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
                  ) : (
                    <>
                      {mode === 'login' ? 'Войти' : 'Создать аккаунт'}
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </Button>
              </form>

              <div className="flex items-center gap-3 my-5">
                <Separator className="flex-1" />
                <span className="text-xs text-muted-foreground uppercase tracking-wider">или</span>
                <Separator className="flex-1" />
              </div>

              {/* Gosuslugi button */}
              <Button
                type="button"
                onClick={handleGosuslugi}
                disabled={loading}
                variant="outline"
                className="w-full h-11 gap-2.5 border-primary/40 text-primary hover:bg-primary/5"
              >
                <Building2 className="w-4 h-4" />
                Войти через Госуслуги (ЕСИА)
              </Button>

              {/* Toggle link */}
              <div className="text-center text-sm text-muted-foreground mt-6">
                {mode === 'login' ? (
                  <>
                    Нет аккаунта?{' '}
                    <button
                      type="button"
                      onClick={() => setMode('register')}
                      className="text-primary font-semibold hover:underline"
                    >
                      Зарегистрироваться
                    </button>
                  </>
                ) : (
                  <>
                    Уже есть аккаунт?{' '}
                    <button
                      type="button"
                      onClick={() => setMode('login')}
                      className="text-primary font-semibold hover:underline"
                    >
                      Войти
                    </button>
                  </>
                )}
              </div>

              {/* Small print */}
              <div className="mt-6 pt-5 border-t border-border text-[11px] text-muted-foreground leading-relaxed">
                {mode === 'register' ? (
                  <>
                    Регистрируясь, вы соглашаетесь с{' '}
                    <span className="text-foreground underline cursor-pointer">условиями обслуживания</span>{' '}
                    и{' '}
                    <span className="text-foreground underline cursor-pointer">политикой конфиденциальности</span>{' '}
                    в соответствии с 152-ФЗ «О персональных данных».
                  </>
                ) : (
                  <>
                    Защищено 152-ФЗ. Используется шифрование TLS 1.3. Логи аутентификации
                    хранятся согласно 115-ФЗ.
                  </>
                )}
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  )
}
