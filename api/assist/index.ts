import { z } from 'zod'
import { dateKey } from '../../shared/slots.js'
import type { MenuRow } from '../../shared/suggest.js'
import type { CafeSettings, MenuItem, SlotDoc } from '../../shared/types.js'
import { adminFirestore } from '../_lib/admin.js'
import { assist, llmConfigFromEnv, type AssistContext } from '../_lib/assist.js'
import { fail } from '../_lib/errors.js'
import { handler, parseBody } from '../_lib/http.js'
import { currentWeather } from '../_lib/weather.js'

const bodySchema = z.object({ query: z.string().trim().min(1, 'Tell us what you feel like').max(140, 'Keep it under 140 characters') })

async function loadContext(): Promise<AssistContext> {
  const fs = adminFirestore()
  const [menuSnap, settingsSnap, slotsSnap, weather] = await Promise.all([
    fs.collection('menu').get(),
    fs.doc('settings/cafe').get(),
    fs.collection('slots').where('date', '==', dateKey(new Date())).get(),
    currentWeather(),
  ])
  if (!settingsSnap.exists) throw fail('INTERNAL', 'Café settings missing. Run the seed script.')
  return {
    menu: menuSnap.docs.map((d) => ({ id: d.id, ...(d.data() as MenuItem) }) as MenuRow),
    settings: settingsSnap.data() as CafeSettings,
    slots: Object.fromEntries(slotsSnap.docs.map((d) => [d.id, d.data() as SlotDoc])),
    weather,
  }
}

// POST /api/assist { query } → { source: 'ai' | 'rules', picks: [{ itemId, reason }], note? }
// Needs LLM_BASE_URL + LLM_MODEL (and LLM_API_KEY if the provider wants one) for the AI path; without them
// the rule-based engine answers. Always returns something useful.
export default handler(['POST'], async (req, res) => {
  const { query } = parseBody(bodySchema, req)
  const fwd = req.headers['x-forwarded-for']
  const ip = (Array.isArray(fwd) ? fwd[0] : fwd)?.split(',')[0].trim() || req.socket?.remoteAddress || 'unknown'
  const result = await assist({ load: loadContext, llm: llmConfigFromEnv() }, query, ip)
  res.status(200).json(result)
})
