import { config } from '../config'

interface Props {
  feature: string
  children: React.ReactNode
  isPremium: boolean
}

export default function PremiumGate({ feature, children, isPremium }: Props) {
  if (isPremium) return <>{children}</>

  return (
    <div className="relative w-full max-w-sm">
      {/* Blurred preview of the actual content */}
      <div className="pointer-events-none select-none blur-[6px] opacity-40 overflow-hidden max-h-48">
        {children}
      </div>

      {/* Lock overlay */}
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <div className="glass rounded-2xl p-6 text-center max-w-[280px]">
          <div className="w-12 h-12 rounded-2xl bg-accent/10 border border-accent/20 flex items-center justify-center mx-auto mb-3">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="var(--color-accent-glow)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
              <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
            </svg>
          </div>

          <p className="text-text text-sm font-semibold mb-1">{feature}</p>
          <p className="text-text-muted text-xs mb-4">$4.99 one-time unlock</p>

          {config.stripeLink ? (
            <a
              href={config.stripeLink}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 bg-accent hover:bg-accent-glow text-white font-semibold text-sm py-3 px-6 rounded-2xl transition-all duration-200 active:scale-[0.97] min-h-[44px]"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M12 2a10 10 0 0 1 0 20 10 10 0 0 1 0-20"/>
                <path d="M12 6v6l4 2"/>
              </svg>
              Unlock Premium
            </a>
          ) : (
            <p className="text-text-muted text-[11px] italic">Coming soon</p>
          )}
        </div>
      </div>
    </div>
  )
}
