import { requireStaff } from '../_lib/auth.js'
import { kitchenBrief } from '../_lib/brief.js'
import { loadBriefData } from '../_lib/briefLoad.js'
import { handler } from '../_lib/http.js'
import { llmConfigFromEnv } from '../_lib/llm.js'

// POST /api/kitchen/brief (Bearer ID token with staff claim) → { source: 'ai' | 'rules', text, facts }
// Read-only: summarises today's live orders for the cook. Needs the LLM_* env vars for the AI path; rules otherwise.
export default handler(['POST'], async (req, res) => {
  const staff = await requireStaff(req)
  res.status(200).json(await kitchenBrief({ load: loadBriefData, llm: llmConfigFromEnv() }, staff.uid))
})
