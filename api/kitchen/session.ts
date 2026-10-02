import { sessionSchema } from '../../shared/schemas.js'
import { adminAuth } from '../_lib/admin.js'
import { pinMatches, sleep } from '../_lib/auth.js'
import { fail } from '../_lib/errors.js'
import { handler, parseBody } from '../_lib/http.js'

// POST /api/kitchen/session { pin } → Firebase custom token with staff: true
export default handler(['POST'], async (req, res) => {
  const { pin } = parseBody(sessionSchema, req)
  const expected = process.env.KITCHEN_PIN
  if (!expected) throw fail('INTERNAL', 'Kitchen PIN is not configured.')
  if (!pinMatches(pin, expected)) {
    await sleep(800) // slow down guessing
    throw fail('UNAUTHORIZED', 'Wrong PIN.')
  }
  const token = await adminAuth().createCustomToken('kitchen', { staff: true })
  res.status(200).json({ token })
})
