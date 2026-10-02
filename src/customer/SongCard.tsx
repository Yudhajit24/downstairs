import { songLinks, type Song } from '../../shared/songs'

/** A little spinning record, original line art. The spin is skipped for reduced-motion (global CSS rule). */
function Record() {
  return (
    <svg width="64" height="64" viewBox="0 0 64 64" fill="none" stroke="var(--ink)" strokeWidth="2.5" strokeLinecap="round" aria-hidden className="shrink-0 animate-[spin_6s_linear_infinite]">
      <circle cx="33" cy="33" r="28" fill="var(--tomato)" stroke="none" />
      <circle cx="32" cy="32" r="28" fill="var(--paper-raised)" />
      <circle cx="32" cy="32" r="21" strokeWidth="1.5" /><circle cx="32" cy="32" r="15" strokeWidth="1.5" />
      <circle cx="32" cy="32" r="8" fill="var(--tomato)" />
      <circle cx="32" cy="32" r="1.8" fill="var(--ink)" stroke="none" />
      <path d="M12 22q4-10 14-13" strokeWidth="2" />
    </svg>
  )
}

const link = 'press inline-flex min-h-11 items-center justify-center rounded-btn border-2 px-4 text-small font-bold no-underline'

/** Song of the day. Links out only: we host no audio and show no lyrics. */
export function SongCard({ song }: { song: Song }) {
  const l = songLinks(song)
  return (
    <section aria-label="Song of the day" className="rounded-card border-2 border-ink bg-paper-raised p-4 shadow-hard">
      <p className="m-0 font-script text-script font-bold leading-5 text-tomato-text">song of the day</p>
      <div className="mt-2 flex items-center gap-3">
        <Record />
        <div className="min-w-0">
          <p className="m-0 font-display text-[20px] leading-6 text-ink">{song.title}</p>
          <p className="m-0 text-small text-ink-deep/80">{song.artist}</p>
        </div>
      </div>
      <p className="mb-3 mt-2 text-body">{song.line}</p>
      <div className="flex gap-2">
        <a className={`${link} flex-1 border-ink bg-ink text-paper-raised`} href={l.spotify} target="_blank" rel="noopener noreferrer" aria-label={`Listen to ${song.title} on Spotify (opens in a new tab)`}>Spotify</a>
        <a className={`${link} flex-1 border-ink bg-paper-raised text-ink`} href={l.youtube} target="_blank" rel="noopener noreferrer" aria-label={`Listen to ${song.title} on YouTube (opens in a new tab)`}>YouTube</a>
      </div>
    </section>
  )
}
