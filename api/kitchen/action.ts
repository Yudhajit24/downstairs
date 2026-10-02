import { kitchenActionSchema } from '../../shared/schemas.js'
import { firestoreDb } from '../_lib/admin.js'
import { requireStaff } from '../_lib/auth.js'
import { kitchenAction } from '../_lib/core.js'
import { handler, parseBody } from '../_lib/http.js'

// POST /api/kitchen/action  (Bearer ID token with staff claim)
export default handler(['POST'], async (req, res) => {
  await requireStaff(req)
  const action = parseBody(kitchenActionSchema, req)
  const result = await kitchenAction(firestoreDb(), action, new Date())
  res.status(200).json(result)
})
