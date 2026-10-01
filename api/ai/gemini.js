import { query } from '../_lib/db.js';
import { requireMembership } from '../_lib/auth.js';
import { createAIHandler } from '../_lib/ai-handler.js';
import { generateWithGemini } from '../_lib/gemini-client.js';

const handler = createAIHandler({
  requireMembership,
  query,
  generate: generateWithGemini,
  getApiKey: () => process.env.GEMINI_API_KEY
});

export default handler;
