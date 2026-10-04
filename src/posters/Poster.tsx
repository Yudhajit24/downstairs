import clsx from 'clsx'
import { useState } from 'react'
import { dateKey } from '../../shared/slots'
import { posterIndex } from '../../shared/poster'
import data from './posters.json'
import { ACCESSORIES, type AccessoryName } from './Accessories'

export interface PosterData {
  id: string
  image: string
  accessory: string
  accessoryPosition: { x: number; y: number; width: number; rotate: number; scaleY?: number }
  line: string
  alt: string
  source: string
  title: string
  licence: string
}

export const POSTERS = data as PosterData[]

// Vite resolves each processed WebP to a hashed URL, loaded lazily by the browser.
const IMAGES = import.meta.glob('./img/*.webp', { eager: true, query: '?url', import: 'default' }) as Record<string, string>
const imageUrl = (file: string) => IMAGES[`./img/${file}`]

export const posterOfDay = (now: Date): PosterData => POSTERS[posterIndex(dateKey(now), POSTERS.length)]

function Accessory({ p }: { p: PosterData }) {
  const A = ACCESSORIES[p.accessory as AccessoryName]
  if (!A) return null
  const { x, y, width, rotate, scaleY = 1 } = p.accessoryPosition
  return (
    <div className="pointer-events-none absolute" style={{ left: `${x}%`, top: `${y}%`, width: `${width}%`, transform: `translate(-50%, -50%) rotate(${rotate}deg) scale(1, ${scaleY})` }}>
      <A />
    </div>
  )
}

/** The art itself: fixed 4:5 box (no layout shift), halftone on top, accessory positioned per poster. */
function Art({ p, onError, failed, fill }: { p: PosterData; onError: () => void; failed: boolean; fill?: boolean }) {
  return (
    <div className={clsx('relative w-full overflow-hidden bg-ink', fill ? 'h-full' : 'aspect-[4/5]')}>
      {!failed && (
        <img src={imageUrl(p.image)} alt={p.alt} width={720} height={900} loading="lazy" decoding="async" onError={onError} className="absolute inset-0 size-full object-cover" />
      )}
      {!failed && (
        <>
          <div aria-hidden className="halftone absolute inset-0" />
          <Accessory p={p} />
        </>
      )}
    </div>
  )
}

export function creditText(p: PosterData) {
  return `${p.title}. The Metropolitan Museum of Art, ${p.licence.split(' (')[0]}.`
}

type Variant = 'strip' | 'card' | 'full'

export function Poster({ poster, variant = 'card', className }: { poster: PosterData; variant?: Variant; className?: string }) {
  const [failed, setFailed] = useState(false)

  if (variant === 'strip') {
    // The credit is always visible: people will not tap to find out what the art is. The image column stretches to the
    // full card height, so it stays flush with the rounded border however long the text runs.
    return (
      <div className={clsx('flex min-h-[96px] w-full items-stretch overflow-hidden rounded-card border-2 border-ink bg-paper-raised text-left', className)}>
        <div className="w-[84px] shrink-0 self-stretch border-r-2 border-ink"><Art p={poster} failed={failed} fill onError={() => setFailed(true)} /></div>
        <div className="flex min-w-0 flex-1 flex-col justify-center px-3 py-2">
          <p className="m-0 font-display text-[17px] leading-5 text-ink">{poster.line}</p>
          <p className="m-0 mt-1 text-micro text-ink-deep/80">{creditText(poster)}</p>
        </div>
      </div>
    )
  }

  return (
    <figure className={clsx('m-0 overflow-hidden rounded-card border-2 border-ink bg-paper-raised [container-type:inline-size]', variant === 'card' && 'shadow-hard', className)}>
      <div className="relative block w-full text-left">
        {failed ? (
          <div className="grid aspect-[4/5] w-full place-items-center bg-ink p-8 text-center">
            <p className="m-0 font-display leading-[1.12] text-paper [font-size:clamp(14px,7cqw,34px)]">{poster.line}</p>
          </div>
        ) : (
          <>
            <Art p={poster} failed={failed} onError={() => setFailed(true)} />
            <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-ink-deep via-ink-deep/85 to-transparent px-4 pb-4 pt-12">
              <p className="m-0 font-display leading-[1.12] text-paper [font-size:clamp(14px,6.2cqw,34px)]">{poster.line}</p>
            </div>
          </>
        )}
      </div>
      <figcaption className="px-4 py-2 text-micro text-ink-deep/80">
        {creditText(poster)}
      </figcaption>
    </figure>
  )
}
