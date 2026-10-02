import type { ReactNode } from 'react'
import { HeroScene } from '../illustrations'

/** Centred 440px column. Outside it: cobalt with a large faded line illustration. */
export function CustomerFrame({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-dvh bg-ink md:flex md:justify-center">
      <div aria-hidden className="pointer-events-none fixed inset-0 hidden items-center justify-center opacity-[0.14] md:flex" style={{ color: 'var(--paper)' }}>
        <div className="w-[min(90vw,1100px)] [&_svg]:!stroke-paper [&_path[fill]]:!fill-transparent">
          <HeroScene />
        </div>
      </div>
      <main className="relative min-h-dvh w-full bg-paper md:max-w-[440px] md:border-x-2 md:border-ink-deep">{children}</main>
    </div>
  )
}
