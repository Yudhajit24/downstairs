import { createOrderSchema } from '../../shared/schemas.js'
import { firestoreDb } from '../_lib/admin.js'
import { createOrder } from '../_lib/core.js'
import { handler, parseBody } from '../_lib/http.js'

// POST /api/orders: 201 when created, 200 when the client's order id already exists (idempotent retry).
export default handler(['POST'], async (req, res) => {
  const input = parseBody(createOrderSchema, req)
  const { created, order } = await createOrder(firestoreDb(), input, new Date())
  res.status(created ? 201 : 200).json({ order })
})
