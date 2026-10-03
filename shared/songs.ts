import { songIndex } from './poster.js'
import { dateKey } from './slots.js'

export interface Song {
  id: string
  title: string
  artist: string
  /** Our own short, witty line. Never lyrics. */
  line: string
  /** Exact track on each service, so the buttons open the song itself (not a search page). Absent = search link. */
  youtubeId?: string
  spotifyId?: string
}

/**
 * Song of the day: a small curated list of well-known, café-friendly tracks.
 * We host no audio and quote no lyrics: the buttons open the exact track on Spotify / YouTube, where it plays.
 */
export const SONGS: Song[] = [
  { id: 'here-comes-the-sun', title: 'Here Comes the Sun', artist: 'The Beatles', line: 'Your 7 AM, now with a soundtrack.', youtubeId: 'KQetemT1sWc', spotifyId: '6dGnYIeXmHdcikdzNNDMm2' },
  { id: 'good-day-sunshine', title: 'Good Day Sunshine', artist: 'The Beatles', line: 'For the lift ride down. Humming optional.', youtubeId: 'R9ncBUcInTM', spotifyId: '4F3AOkGrVXF70PBEaRxm3u' },
  { id: 'three-little-birds', title: 'Three Little Birds', artist: 'Bob Marley & The Wailers', line: 'Calm in a song. Pairs well with filter coffee.', youtubeId: 'HNBCVM4KbUM', spotifyId: '7vggqxNKwd6xdRoYS0pQtM' },
  { id: 'walking-on-sunshine', title: 'Walking on Sunshine', artist: 'Katrina & The Waves', line: 'Do not play on an empty stomach. Order first.', youtubeId: 'iPUmE-tne5U', spotifyId: '3Gtxxelz2CqP405oHNSTnB' },
  { id: 'morning-has-broken', title: 'Morning Has Broken', artist: 'Cat Stevens', line: 'A slow start, officially approved.', youtubeId: 'DmAOBosGlHY', spotifyId: '3nMjMgw8I5ZntlMrVVY3th' },
  { id: 'coffee-and-tv', title: 'Coffee & TV', artist: 'Blur', line: 'Half of it is about coffee. Good enough for us.', youtubeId: '6oqXVx3sBOk', spotifyId: '5eSllZgRWCIJsDTAqFRwQw' },
  { id: 'dont-stop-me-now', title: "Don't Stop Me Now", artist: 'Queen', line: 'For the days you are carrying the whole team.', youtubeId: 'HgzGwKwLmgM', spotifyId: '3lrNq7iGL5r3KS93YiKAbC' },
  { id: 'kabira', title: 'Kabira', artist: 'Tochi Raina, Rekha Bhardwaj', line: 'Rainy window, hot chai, this.', youtubeId: 'jHNNMj5bNQw', spotifyId: '3foxc6R9EzTQR16MQcSbKs' },
  { id: 'kun-faya-kun', title: 'Kun Faya Kun', artist: 'A. R. Rahman, Javed Ali, Mohit Chauhan', line: 'Five quiet minutes, courtesy of Rahman.', youtubeId: 'T94PHkuydcw', spotifyId: '4MBcag58s4GmoS5QuhQrPd' },
  { id: 'chaiyya-chaiyya', title: 'Chaiyya Chaiyya', artist: 'Sukhwinder Singh, Sapna Awasthi', line: 'The chai is in the name. Close enough.', youtubeId: '9MX-QejdVaQ', spotifyId: '7ltsfuHdqTZ5LwPpDy1q0v' },
  { id: 'lovely-day', title: 'Lovely Day', artist: 'Bill Withers', line: 'Pick a corner. Order a cutting chai.', youtubeId: 'bEeaS6fuUoA', spotifyId: '0ACACkoHUwgfgY5CxVIL4N' },
  { id: 'sunday-morning', title: 'Sunday Morning', artist: 'Maroon 5', line: 'Even if it is a Tuesday.', youtubeId: 'S2Cti12XBw4', spotifyId: '2AK1DGRqMhIbp8UpJbZlsi' },
  { id: 'ilahi', title: 'Ilahi', artist: 'Arijit Singh', line: 'Window-seat energy. Headphones on.', youtubeId: 'fdubeMFwuGs', spotifyId: '07plNhGw3aGvkBHdgy6BE6' },
  { id: 'yellow', title: 'Yellow', artist: 'Coldplay', line: 'For staring into your cup and thinking.', youtubeId: 'yKNxeF4KMsY', spotifyId: '1aUTJpaxVd8LpUfbb19wZH' },
]

export const songOfDay = (now: Date): Song => SONGS[songIndex(dateKey(now), SONGS.length)]

/**
 * Deep links to the exact track (IDs checked against Spotify's and YouTube's own metadata), so the listener lands on the
 * song and it starts there. A song without an ID falls back to a search link, which cannot go stale.
 */
export function songLinks(s: Pick<Song, 'title' | 'artist' | 'youtubeId' | 'spotifyId'>) {
  const q = encodeURIComponent(`${s.title} ${s.artist}`)
  return {
    spotify: s.spotifyId ? `https://open.spotify.com/track/${s.spotifyId}?autoplay=true` : `https://open.spotify.com/search/${q}`,
    youtube: s.youtubeId ? `https://www.youtube.com/watch?v=${s.youtubeId}&autoplay=1` : `https://www.youtube.com/results?search_query=${q}`,
  }
}
