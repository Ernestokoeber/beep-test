import crypto from 'node:crypto';
import { AIError, buildAIRequest } from './ai-contracts.js';

export function limitForAction(action) {
  return action === 'planSeason' ? 60 : 30;
}

async function consumeRateLimit(query, userId, action, limit) {
  const { rows } = await query(
    `INSERT INTO ai_rate_limit (user_id, action, window_start, count)
     VALUES ($1, $2, now(), 1)
     ON CONFLICT (user_id, action)
     DO UPDATE SET
       count = CASE
         WHEN ai_rate_limit.window_start < now() - interval '1 hour' THEN 1
         ELSE ai_rate_limit.count + 1
       END,
       window_start = CASE
         WHEN ai_rate_limit.window_start < now() - interval '1 hour' THEN now()
         ELSE ai_rate_limit.window_start
       END
     RETURNING count, $3::integer AS limit`,
    [userId, action, limit]
  );
  return Number(rows?.[0]?.count || 0) <= limit;
}

function sendError(res, error, requestId) {
  const normalized = error instanceof AIError
    ? error
    : new AIError('AI_PROVIDER', 'KI-Anfrage fehlgeschlagen.', { status: 500, retryable: false });
  return res.status(normalized.status || 502).json({
    error: normalized.message,
    code: normalized.code || 'AI_PROVIDER',
    retryable: normalized.retryable === true,
    requestId
  });
}

export function createAIHandler({ requireMembership, query, generate, getApiKey }) {
  if (typeof requireMembership !== 'function' || typeof query !== 'function') throw new TypeError('KI-Handler benötigt Authentifizierung und Datenbankzugriff.');
  if (typeof generate !== 'function' || typeof getApiKey !== 'function') throw new TypeError('KI-Handler benötigt Gemini-Transport und Schlüsselzugriff.');

  return async function aiHandler(req, res) {
    res.setHeader('Cache-Control', 'no-store');
    if (req.method !== 'POST') {
      res.setHeader('Allow', 'POST');
      res.status(405).json({ error: 'Methode nicht erlaubt.' });
      return;
    }

    const requestId = `ai_${crypto.randomUUID()}`;
    let action = '';
    try {
      const auth = await requireMembership(req, res);
      if (!auth) return;

      const apiKey = String(getApiKey() || '');
      if (!apiKey) throw new AIError('AI_NOT_CONFIGURED', 'Serverseitige KI ist noch nicht konfiguriert.', { status: 503 });

      action = String(req.body?.action || '');
      const payload = req.body?.payload || {};
      buildAIRequest(action, payload);

      const limit = limitForAction(action);
      const allowed = await consumeRateLimit(query, auth.sub, action, limit);
      if (!allowed) {
        throw new AIError('AI_RATE_LIMIT', 'KI-Limit erreicht. Bitte später erneut versuchen.', { status: 429, retryable: true });
      }

      const result = await generate({ action, payload, apiKey, requestId });
      if (action === 'summarizeTraining') {
        res.status(200).json({ text: result.value.text, model: result.model, requestId: result.requestId });
        return;
      }
      if (action === 'explainTactic') {
        res.status(200).json({
          text: result.value.explanation,
          coachingPoints: result.value.coachingPoints,
          model: result.model,
          requestId: result.requestId
        });
        return;
      }
      res.status(200).json({ data: result.value, model: result.model, requestId: result.requestId });
    } catch (error) {
      if (!(error instanceof AIError)) {
        console.error('[gemini]', { action, requestId, error: error?.name || 'Error' });
      }
      sendError(res, error, requestId);
    }
  };
}
