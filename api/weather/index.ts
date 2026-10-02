import { currentWeather } from '../_lib/weather.js'
import { handler } from '../_lib/http.js'

// GET /api/weather → { weather: { tempC, precipMm, code } | null }
// A CDN cache header on top of the in-memory cache; failures return { weather: null } with a short cache.
export default handler(['GET'], async (_req, res) => {
  const weather = await currentWeather()
  res.setHeader('Cache-Control', weather ? 'public, s-maxage=600, stale-while-revalidate=1800' : 'public, s-maxage=60')
  res.status(200).json({ weather })
})
