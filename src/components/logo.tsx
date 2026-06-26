import { cn } from '@/lib/utils'

interface LogoProps {
  size?: number
  className?: string
  showText?: boolean
}

/**
 * Логотип РусКрипто — золотой гексагональный щит со стилизованным ₽ (рубль)
 * в окружении свечей роста. Символизирует: крипто + рубль + рост + защиту.
 */
export function Logo({ size = 36, className, showText = true }: LogoProps) {
  return (
    <div className={cn('flex items-center gap-2.5', className)}>
      <svg
        width={size}
        height={size}
        viewBox="0 0 48 48"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="shrink-0"
        aria-label="РусКрипто"
      >
        <defs>
          <linearGradient id="rc-gold" x1="0" y1="0" x2="48" y2="48" gradientUnits="userSpaceOnUse">
            <stop stopColor="#FCD535" />
            <stop offset="0.5" stopColor="#F0B90B" />
            <stop offset="1" stopColor="#D89A00" />
          </linearGradient>
          <linearGradient id="rc-gold-shine" x1="10" y1="6" x2="24" y2="24" gradientUnits="userSpaceOnUse">
            <stop stopColor="#FFF6D5" stopOpacity="0.6" />
            <stop offset="1" stopColor="#F0B90B" stopOpacity="0" />
          </linearGradient>
        </defs>
        {/* Гексагональный щит */}
        <path
          d="M24 2.5 L41.5 12.5 V35.5 L24 45.5 L6.5 35.5 V12.5 Z"
          fill="url(#rc-gold)"
          stroke="#B8860B"
          strokeWidth="0.8"
        />
        <path
          d="M24 2.5 L41.5 12.5 V35.5 L24 45.5 L6.5 35.5 V12.5 Z"
          fill="url(#rc-gold-shine)"
        />
        {/* Свечи роста (зелёные) слева */}
        <rect x="11" y="22" width="3" height="10" rx="0.6" fill="#0B1426" opacity="0.85" />
        <rect x="11.6" y="19" width="1.8" height="3" fill="#0B1426" opacity="0.85" />
        {/* Свеча роста крупная справа */}
        <rect x="33" y="16" width="3" height="14" rx="0.6" fill="#0B1426" opacity="0.85" />
        <rect x="33.6" y="12" width="1.8" height="4" fill="#0B1426" opacity="0.85" />
        <rect x="33.6" y="30" width="1.8" height="3" fill="#0B1426" opacity="0.85" />
        {/* Буква Р (рубль) — центральная */}
        <path
          d="M19 14 H25.5 C28 14 29.5 15.8 29.5 18 C29.5 20.2 28 22 25.5 22 H22 V34 H19 V14 Z M22 16.8 V19.2 H25 C26 19.2 26.5 18.7 26.5 18 C26.5 17.3 26 16.8 25 16.8 H22 Z"
          fill="#0B1426"
        />
      </svg>
      {showText && (
        <div className="leading-none">
          <div className="font-bold text-base tracking-tight">РусКрипто</div>
          <div className="text-[9px] text-muted-foreground tracking-[0.15em] uppercase">Криптобиржа РФ</div>
        </div>
      )}
    </div>
  )
}
