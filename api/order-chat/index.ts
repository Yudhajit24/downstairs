import { z } from 'zod'
import { orderIdSchema } from '../../shared/schemas.js'
import type { Status } from '../../shared/types.js'
import { adminFirestore } from '../_lib/admin.js'
import { fail } from '../_lib/errors.js'
import { handler, parseBody } from '../_lib/http.js'
import { clientIp, llmConfigFromEnv } from '../_lib/llm.js'
import { orderChat } from '../_lib/orderChat.js'

const bodySchema = z.object({
  orderId: orderIdSchema,
  question: z.string().trim().min(2, 'Ask a question').max(140, 'Keep it under 140 characters'),
})

const ms = (v: unknown) => (v as { toMillis?: () => number } | undefined)?.toMillis?.() ?? Date.now()

async function load(orderId: string) {
  const fs = adminFirestore()
  const snap = await fs.doc(`orders/${orderId}`).get()
  if (!snap.exists) return null
  const o = snap.data()!
  const todays = await fs.collection('orders').where('date', '==', o.date).get()
  return {
    order: {
      token: o.token, status: o.status as Status, total: o.total, slotTime: o.slotTime, createdAtMs: ms(o.createdAt),
      cancelReason: o.cancelReason ?? null,
      items: (o.items ?? []).map((i: { name: string; qty: number }) => ({ name: i.name, qty: i.qty })),
    },
    others: todays.docs.filter((d) => d.id !== orderId).map((d) => {
      const x = d.data()
      return { status: x.status as Status, slotTime: x.slotTime as string, createdAtMs: ms(x.createdAt) }
    }),
    slotStartMs: ms(o.slotStart),
  }
}

// POST /api/order-chat { orderId, question } → { source: 'ai' | 'rules', answer }
// Read-only. Answers about one order (the id is an unguessable 21-character capability, like the order page itself).
export default handler(['POST'], async (req, res) => {
  const { orderId, question } = parseBody(bodySchema, req)
  const r = await orderChat({ load, llm: llmConfigFromEnv() }, orderId, question, clientIp(req))
  if (!r) throw fail('NOT_FOUND', "We couldn't find that order.")
  res.status(200).json(r)
})
