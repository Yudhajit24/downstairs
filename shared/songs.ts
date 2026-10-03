import { songIndex } from './poster.js'
import { dateKey } from './slots.js'

export interface Song {
  id: string
  title: string
  artist: string
  /** Our own short, witty line. Never lyrics. */
  line: string
  /** Official YouTube video (checked embeddable). Plays in the app; absent = search links only. */
  youtubeId?: string
}

/**
 * Song of the day: a small curated list of well-known, café-friendly tracks.
 * We host no audio and quote no lyrics: the song plays from YouTube's own embedded player, and we link out to Spotify/YouTube.
 */
export const SONGS: Song[] = [
  { id: 'here-comes-the-sun', title: 'Here Comes the Sun', artist: 'The Beatles', line: 'Your 7 AM, now with a soundtrack.', youtubeId: 'KQetemT1sWc' },
  { id: 'good-day-sunshine', title: 'Good Day Sunshine', artist: 'The Beatles', line: 'For the lift ride down. Humming optional.', youtubeId: 'R9ncBUcInTM' },
  { id: 'three-little-birds', title: 'Three Little Birds', artist: 'Bob Marley & The Wailers', line: 'Calm in a song. Pairs well with filter coffee.', youtubeId: 'HNBCVM4KbUM' },
  { id: 'walking-on-sunshine', title: 'Walking on Sunshine', artist: 'Katrina & The Waves', line: 'Do not play on an empty stomach. Order first.', youtubeId: 'iPUmE-tne5U' },
  { id: 'morning-has-broken', title: 'Morning Has Broken', artist: 'Cat Stevens', line: 'A slow start, officially approved.', youtubeId: 'DmAOBosGlHY' },
  { id: 'coffee-and-tv', title: 'Coffee & TV', artist: 'Blur', line: 'Half of it is about coffee. Good enough for us.', youtubeId: '6oqXVx3sBOk' },
  { id: 'dont-stop-me-now', title: "Don't Stop Me Now", artist: 'Queen', line: 'For the days you are carrying the whole team.', youtubeId: 'HgzGwKwLmgM' },
  { id: 'kabira', title: 'Kabira', artist: 'Tochi Raina, Rekha Bhardwaj', line: 'Rainy window, hot chai, this.', youtubeId: 'jHNNMj5bNQw' },
  { id: 'kun-faya-kun', title: 'Kun Faya Kun', artist: 'A. R. Rahman, Javed Ali, Mohit Chauhan', line: 'Five quiet minutes, courtesy of Rahman.', youtubeId: 'T94PHkuydcw' },
  { id: 'chaiyya-chaiyya', title: 'Chaiyya Chaiyya', artist: 'Sukhwinder Singh, Sapna Awasthi', line: 'The chai is in the name. Close enough.', youtubeId: '9MX-QejdVaQ' },
  { id: 'lovely-day', title: 'Lovely Day', artist: 'Bill Withers', line: 'Pick a corner. Order a cutting chai.', youtubeId: 'bEeaS6fuUoA' },
  { id: 'sunday-morning', title: 'Sunday Morning', artist: 'Maroon 5', line: 'Even if it is a Tuesday.', youtubeId: 'S2Cti12XBw4' },
  { id: 'ilahi', title: 'Ilahi', artist: 'Arijit Singh', line: 'Window-seat energy. Headphones on.', youtubeId: 'fdubeMFwuGs' },
  { id: 'yellow', title: 'Yellow', artist: 'Coldplay', line: 'For staring into your cup and thinking.', youtubeId: 'yKNxeF4KMsY' },
]

export const songOfDay = (now: Date): Song => SONGS[songIndex(dateKey(now), SONGS.length)]

/**
 * Search links rather than stored track URLs: they cannot go stale or point at the wrong track,
 * and the listener picks the service they already use.
 */
export function songLinks(s: Pick<Song, 'title' | 'artist' | 'youtubeId'>) {
  const q = encodeURIComponent(`${s.title} ${s.artist}`)
  return {
    spotify: `https://open.spotify.com/search/${q}`,
    youtube: s.youtubeId ? `https://www.youtube.com/watch?v=${s.youtubeId}` : `https://www.youtube.com/results?search_query=${q}`,
    /** Privacy-enhanced embed; autoplay is allowed because it only mounts after the listener taps Play. */
    embed: s.youtubeId ? `https://www.youtube-nocookie.com/embed/${s.youtubeId}?autoplay=1&playsinline=1&rel=0&modestbranding=1` : null,
  }
}
