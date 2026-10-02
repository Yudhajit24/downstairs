import type { ReactNode, SVGProps } from 'react'

/** Shared monoline wrapper: 2.5px ink stroke, round caps/joins, no fill by default. */
export function Ill({
  size = 64, viewBox = '0 0 64 64', title, children, ...rest
}: { size?: number | string; viewBox?: string; title?: string; children: ReactNode } & Omit<SVGProps<SVGSVGElement>, 'viewBox'>) {
  return (
    <svg
      width={size} height={size} viewBox={viewBox}
      style={{ display: 'inline-block' }}
      fill="none" stroke="var(--ink)" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round"
      role={title ? 'img' : undefined} aria-label={title} aria-hidden={title ? undefined : true}
      {...rest}
    >
      {children}
    </svg>
  )
}

/** Riso misregistration: a tomato fill nudged 1.5px off the line art. */
export const RISO = 'translate(1.5 1.5)'
export const T = { fill: 'var(--tomato)', stroke: 'none' } as const
