import { createTemplateSchema } from '../../shared/schemas.js'
import { firestoreDb } from '../_lib/admin.js'
import { handler, parseBody } from '../_lib/http.js'
import { createTemplate } from '../_lib/templates.js'

// POST /api/templates { items } → { id }. 201 when new, 200 when this exact cart was already shared.
export default handler(['POST'], async (req, res) => {
  const input = parseBody(createTemplateSchema, req)
  const { created, template } = await createTemplate(firestoreDb(), input, new Date())
  res.status(created ? 201 : 200).json({ id: template.id })
})
