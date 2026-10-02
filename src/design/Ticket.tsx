import clsx from 'clsx'
import type { ReactNode } from 'react'

export type TicketTone = 'normal' | 'soon' | 'late' | 'flash'

/** Indian-style KOT ticket: mono type, dashed perforation under the header, big token. */
export function Ticket({
  token, time, tone = 'normal', header, children, footer,
}: { token: number; time: string; tone?: TicketTone; header?: ReactNode; children: ReactNode; footer?: ReactNode }) {
  return (
    <article
      className={clsx(
        'rounded-[14px] border-[3px] bg-paper-raised font-mono text-ink-deep shadow-hard-paper',
        tone === 'soon' && 'border-mustard',
        tone === 'late' && 'border-tomato',
        tone === 'flash' && 'border-tomato animate-[ticket-flash_3s_ease-out_forwards]',
        tone === 'normal' && 'border-ink-deep',
      )}
    >
      <header className="flex items-baseline justify-between px-4 pt-3 pb-2">
        <h3 className="m-0 font-display text-[40px] leading-none">
          <span className="mr-1 align-middle font-mono text-micro font-bold tracking-widest">KOT</span>
          #{String(token).padStart(3, '0')}
        </h3>
        <span className="text-body font-bold">{time}</span>
      </header>
      {header && <div className="px-4 pb-2 text-small">{header}</div>}
      <div className="mx-3 border-t-2 border-dashed border-ink-deep/60" />
      <div className="px-4 py-3 text-[20px] leading-7">{children}</div>
      {footer && <footer className="px-3 pb-3">{footer}</footer>}
    </article>
  )
}
