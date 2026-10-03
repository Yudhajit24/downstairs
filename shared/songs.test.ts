import { describe, expect, it } from 'vitest'
import { songIndex } from './poster.js'
import { SONGS, songLinks, songOfDay } from './songs.js'

describe('song data', () => {
  it('has unique ids, real fields, and short original lines', () => {
    expect(new Set(SONGS.map((s) => s.id)).size).toBe(SONGS.length)
    for (const s of SONGS) {
      expect(s.title.length, s.id).toBeGreaterThan(1)
      expect(s.artist.length, s.id).toBeGreaterThan(1)
      expect(s.line.length, s.id).toBeLessThanOrEqual(70)
    }
    expect(SONGS.length).toBeGreaterThanOrEqual(12)
  })
  it('every song has a plausible YouTube id, and embed/link URLs use it', () => {
    for (const s of SONGS) {
      expect(s.youtubeId, s.id).toMatch(/^[\w-]{11}$/)
      const l = songLinks(s)
      expect(l.embed).toContain(`/embed/${s.youtubeId}?autoplay=1`)
      expect(l.youtube).toBe(`https://www.youtube.com/watch?v=${s.youtubeId}`)
    }
    expect(songLinks({ title: 'x', artist: 'y' }).embed).toBeNull()
  })
})

describe('songOfDay', () => {
  const at = (d: string, t = '09:00') => new Date(`${d}T${t}:00+05:30`)
  it('is the same all day in IST, and changes at IST midnight', () => {
    expect(songOfDay(at('2026-10-03', '00:05'))).toEqual(songOfDay(at('2026-10-03', '23:55')))
    // 23:59 IST on the 3rd is 18:29 UTC; 00:01 IST on the 4th is 18:31 UTC the same UTC day
    expect(songOfDay(new Date('2026-10-03T18:29:00Z'))).toEqual(songOfDay(at('2026-10-03', '12:00')))
    const days = Array.from({ length: 28 }, (_, i) => songOfDay(at(`2026-11-${String(i + 1).padStart(2, '0')}`)).id)
    expect(new Set(days).size).toBeGreaterThan(6)
  })
  it('is in range and independent of the poster pick', () => {
    for (let d = 1; d <= 31; d++) expect(songIndex(`2026-10-${String(d).padStart(2, '0')}`, 14)).toBeLessThan(14)
    expect(songIndex('2026-10-03', 0)).toBe(0)
  })
})

describe('songLinks', () => {
  it('builds encoded search links for both services', () => {
    const l = songLinks({ title: "Don't Stop Me Now", artist: 'Queen' })
    expect(l.spotify).toBe(`https://open.spotify.com/search/${encodeURIComponent("Don't Stop Me Now Queen")}`)
    expect(l.spotify).not.toMatch(/\s/)
    expect(l.youtube).toContain('https://www.youtube.com/results?search_query=')
    expect(l.youtube).not.toMatch(/\s/)
  })
  it('keeps ampersands from breaking the query', () => {
    expect(songLinks({ title: 'Coffee & TV', artist: 'Blur' }).youtube).toContain('Coffee%20%26%20TV')
  })
})
