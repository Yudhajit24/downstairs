import { z } from 'zod'
import type { MenuRow } from '../../shared/suggest.js'
import type { MenuItem } from '../../shared/types.js'
import { adminFirestore } from '../_lib/admin.js'
import { handler, parseBody } from '../_lib/http.js'
import { clientIp, llmConfigFromEnv } from '../_lib/llm.js'
import { parseOrder } from '../_lib/parseOrder.js'

const bodySchema = z.object({ text: z.string().trim().min(1, 'Paste a message first').max(500, 'Keep it under 500 characters') })

async function loadMenu(): Promise<MenuRow[]> {
  const snap = await adminFirestore().collection('menu').get()
  return snap.docs.map((d) => ({ id: d.id, ...(d.data() as MenuItem) }) as MenuRow)
}

// POST /api/parse-order { text } → { source: 'ai' | 'rules', lines: [{ itemId, qty, sugar }], unmatched, needsChoices, soldOut }
// Reads a pasted chat message into a cart. Never creates an order: the client shows the lines for review.
export default handler(['POST'], async (req, res) => {
  const { text } = parseBody(bodySchema, req)
  res.status(200).json(await parseOrder({ load: loadMenu, llm: llmConfigFromEnv() }, text, clientIp(req)))
})
