import { customerPatchSchema, orderIdSchema } from '../../shared/schemas.js'
import { firestoreDb } from '../_lib/admin.js'
import { customerCancel, editOrder } from '../_lib/core.js'
import { fail } from '../_lib/errors.js'
import { handler, parseBody } from '../_lib/http.js'

// PATCH /api/orders/:id  { action: 'edit', items, slotId, note } | { action: 'cancel' }
export default handler(['PATCH'], async (req, res) => {
  const id = orderIdSchema.safeParse(req.query.id)
  if (!id.success) throw fail('NOT_FOUND', 'Order not found.')
  const body = parseBody(customerPatchSchema, req)
  const db = firestoreDb()
  const order = body.action === 'edit' ? await editOrder(db, id.data, body, new Date()) : await customerCancel(db, id.data, new Date())
  res.status(200).json({ order })
})
