import type { ReactNode } from 'react'

/** Our own monoline pop accessories (spec 3.12). Tomato / mustard fills, ink-deep lines. */
const line = { fill: 'none', stroke: 'var(--ink-deep)', strokeLinecap: 'round', strokeLinejoin: 'round' } as const

function Svg({ viewBox, children }: { viewBox: string; children: ReactNode }) {
  return <svg viewBox={viewBox} className="block h-auto w-full overflow-visible" aria-hidden>{children}</svg>
}

export function Sunglasses() {
  return (
    <Svg viewBox="0 0 130 46">
      <path d="M4 12 L14 10 M126 12 L116 10" {...line} strokeWidth={4} />
      <path d="M12 10 H54 Q58 10 58 16 V26 Q58 40 44 40 H26 Q12 40 12 26 Z" fill="var(--tomato)" stroke="var(--ink-deep)" strokeWidth={4} strokeLinejoin="round" />
      <path d="M118 10 H76 Q72 10 72 16 V26 Q72 40 86 40 H104 Q118 40 118 26 Z" fill="var(--tomato)" stroke="var(--ink-deep)" strokeWidth={4} strokeLinejoin="round" />
      <path d="M58 14 Q65 6 72 14" {...line} strokeWidth={4} />
      <path d="M20 18 L30 18 M20 24 L25 24 M80 18 L90 18 M80 24 L85 24" stroke="var(--paper)" strokeWidth={3} strokeLinecap="round" />
    </Svg>
  )
}

export function Headphones() {
  return (
    <Svg viewBox="0 0 170 150">
      <path d="M22 84 C 22 8, 148 8, 148 84" {...line} strokeWidth={9} />
      <path d="M22 84 C 22 12, 148 12, 148 84" fill="none" stroke="var(--mustard)" strokeWidth={4} strokeLinecap="round" />
      <rect x="4" y="70" width="34" height="62" rx="15" fill="var(--mustard)" stroke="var(--ink-deep)" strokeWidth={4.5} />
      <rect x="132" y="70" width="34" height="62" rx="15" fill="var(--mustard)" stroke="var(--ink-deep)" strokeWidth={4.5} />
      <path d="M13 86 V116 M157 86 V116" stroke="var(--tomato)" strokeWidth={5} strokeLinecap="round" />
    </Svg>
  )
}

function SteamWisps({ x = 0 }: { x?: number }) {
  return (
    <g transform={`translate(${x} 0)`}>
      {[0, 20, 40].map((d) => (
        <g key={d}>
          <path d={`M${14 + d} 54 q-9 -12 0 -24 t0 -24`} fill="none" stroke="var(--ink-deep)" strokeWidth={9} strokeLinecap="round" />
          <path d={`M${14 + d} 54 q-9 -12 0 -24 t0 -24`} fill="none" stroke="var(--mustard)" strokeWidth={4.5} strokeLinecap="round" />
        </g>
      ))}
    </g>
  )
}

export function Steam() {
  return <Svg viewBox="0 0 80 60"><SteamWisps /></Svg>
}

export function ChaiGlass() {
  return (
    <Svg viewBox="0 0 80 150">
      <g transform="translate(8 0) scale(.9 1)"><SteamWisps /></g>
      <path d="M12 62 L18 138 Q18 144 24 144 H56 Q62 144 62 138 L68 62 Z" fill="var(--paper-raised)" stroke="var(--ink-deep)" strokeWidth={4.5} strokeLinejoin="round" />
      <path d="M14 78 L66 78 L62 138 Q62 144 56 144 H24 Q18 144 18 138 Z" fill="var(--tomato)" />
      <path d="M12 62 L18 138 Q18 144 24 144 H56 Q62 144 62 138 L68 62 Z" {...line} strokeWidth={4.5} />
      <path d="M15 90 H65 M16.5 104 H63.5 M17.5 118 H62.5" {...line} strokeWidth={2.8} />
    </Svg>
  )
}

export const ACCESSORIES = { sunglasses: Sunglasses, headphones: Headphones, chai: ChaiGlass, steam: Steam } as const
export type AccessoryName = keyof typeof ACCESSORIES
