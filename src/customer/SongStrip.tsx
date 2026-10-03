import clsx from 'clsx'
import { useState } from 'react'
import { songLinks, type Song } from '../../shared/songs'
import { BottomSheet } from '../design'

/** A little spinning record, original line art. The spin is skipped for reduced-motion (global CSS rule). */
function Record({ size }: { size: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" fill="none" stroke="var(--ink)" strokeWidth="2.5" strokeLinecap="round" aria-hidden className="shrink-0 animate-[spin_6s_linear_infinite]">
      <circle cx="33" cy="33" r="28" fill="var(--tomato)" stroke="none" />
      <circle cx="32" cy="32" r="28" fill="var(--paper-raised)" />
      <circle cx="32" cy="32" r="21" strokeWidth="1.5" /><circle cx="32" cy="32" r="15" strokeWidth="1.5" />
      <circle cx="32" cy="32" r="8" fill="var(--tomato)" />
      <circle cx="32" cy="32" r="1.8" fill="var(--ink)" stroke="none" />
      <path d="M12 22q4-10 14-13" strokeWidth="2" />
    </svg>
  )
}

const link = 'press inline-flex min-h-14 flex-1 items-center justify-center rounded-btn border-2 px-4 text-body font-bold no-underline'

/**
 * Song of the day: a slim bar pinned at the very top of the menu, always visible (never hidden by rush hour, a promo or
 * closing time, and not tucked into a carousel). One line of text plus a Listen pill; tap it for the full card with our
 * blurb, a Play button (YouTube's own embedded player, mounted only after the tap) and Spotify / YouTube links. No audio hosted, no lyrics.
 */
export function SongStrip({ song, className }: { song: Song; className?: string }) {
  const [open, setOpen] = useState(false)
  const [playing, setPlaying] = useState(false)
  const l = songLinks(song)
  const close = () => { setOpen(false); setPlaying(false) } // unmounting the player stops the music
  return (
    <>
      <button
        type="button" onClick={() => setOpen(true)} aria-haspopup="dialog" aria-label={`Song of the day: ${song.title} by ${song.artist}. Tap to listen.`}
        className={clsx('flex min-h-14 w-full items-center gap-3 border-0 border-b-2 border-ink bg-paper-raised px-4 py-1.5 text-left cursor-pointer', className)}
      >
        <Record size={36} />
        <span className="min-w-0 flex-1">
          <span className="block truncate font-display text-[15px] leading-5 text-ink">{song.title}</span>
          <span className="block truncate text-micro text-ink-deep/80"><span className="font-script text-[15px] font-bold text-tomato-text">song of the day</span> · {song.artist}</span>
        </span>
        <span aria-hidden className="shrink-0 rounded-full border-2 border-ink bg-ink px-3 py-1 text-small font-bold text-paper-raised">Listen</span>
      </button>

      <BottomSheet open={open} onClose={close} title="Song of the day">
        <div className="flex items-center gap-4">
          <Record size={84} />
          <div className="min-w-0">
            <p className="m-0 font-script text-script font-bold leading-5 text-tomato-text">song of the day</p>
            <h2 className="m-0 font-display text-display-m text-ink">{song.title}</h2>
            <p className="m-0 text-small text-ink-deep/80">{song.artist}</p>
          </div>
        </div>
        <p className="mb-3 mt-3 text-body">{song.line}</p>
        {l.embed && (playing ? (
          <div className="mb-3 aspect-video w-full overflow-hidden rounded-btn border-2 border-ink bg-ink-deep">
            <iframe
              src={l.embed} title={`${song.title} by ${song.artist}`} className="h-full w-full border-0"
              allow="autoplay; encrypted-media; picture-in-picture" referrerPolicy="strict-origin-when-cross-origin" allowFullScreen
            />
          </div>
        ) : (
          <button type="button" onClick={() => setPlaying(true)} className={`${link} mb-3 w-full border-ink bg-tomato text-paper-raised cursor-pointer`}>
            ▶ Play here
          </button>
        ))}
        <div className="flex gap-2">
          <a className={`${link} border-ink bg-ink text-paper-raised`} href={l.spotify} target="_blank" rel="noopener noreferrer" aria-label={`Listen to ${song.title} on Spotify (opens in a new tab)`}>Spotify</a>
          <a className={`${link} border-ink bg-paper-raised text-ink`} href={l.youtube} target="_blank" rel="noopener noreferrer" aria-label={`Listen to ${song.title} on YouTube (opens in a new tab)`}>Open YouTube</a>
        </div>
      </BottomSheet>
    </>
  )
}
