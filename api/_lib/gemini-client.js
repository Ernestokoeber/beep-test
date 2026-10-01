import { AIError, AI_MODEL_ID, buildAIRequest } from './ai-contracts.js';

const ENDPOINT = `https://generativelanguage.googleapis.com/v1beta/models/${AI_MODEL_ID}:generateContent`;
const RETRYABLE_STATUS = new Set([429, 500, 503]);

function providerError(status) {
  if (status === 429) {
    return new AIError('AI_RATE_LIMIT', 'Gemini ist ausgelastet. Bitte versuche es gleich noch einmal.', { status: 429, retryable: true });
  }
  return new AIError('AI_PROVIDER', 'Gemini ist vorübergehend nicht verfügbar.', { status: 503, retryable: true });
}

function readCandidate(data) {
  const candidate = data?.candidates?.[0];
  if (!candidate) throw new AIError('AI_EMPTY_RESPONSE', 'Gemini hat keine Antwort geliefert.', { retryable: true });
  const finishReason = String(candidate.finishReason || '');
  if (finishReason && finishReason !== 'STOP') {
    throw new AIError('AI_TRUNCATED_RESPONSE', 'Gemini konnte die Antwort nicht vollständig abschließen.', { retryable: true });
  }
  const text = candidate.content?.parts?.map((part) => part?.text || '').join('').trim();
  if (!text) throw new AIError('AI_EMPTY_RESPONSE', 'Gemini hat leer geantwortet.', { retryable: true });
  return text;
}

export async function generateWithGemini({
  action,
  payload,
  apiKey,
  requestId,
  fetchImpl = globalThis.fetch,
  now = Date.now,
  setTimer = setTimeout,
  clearTimer = clearTimeout
}) {
  if (!apiKey) throw new AIError('AI_NOT_CONFIGURED', 'Serverseitige KI ist noch nicht konfiguriert.', { status: 503 });
  if (typeof fetchImpl !== 'function') throw new AIError('AI_PROVIDER', 'Der KI-Transport ist nicht verfügbar.', { status: 503, retryable: true });

  const request = buildAIRequest(action, payload);
  const startedAt = now();
  const deadline = startedAt + request.timeoutMs;
  const controller = new AbortController();
  const timer = setTimer(() => controller.abort(), request.timeoutMs);
  let attempt = 0;

  try {
    while (attempt < 2) {
      attempt += 1;
      let response;
      try {
        response = await fetchImpl(ENDPOINT, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'x-goog-api-key': apiKey },
          body: JSON.stringify({
            contents: [{ parts: request.parts }],
            generationConfig: request.generationConfig
          }),
          signal: controller.signal
        });
      } catch (error) {
        if (controller.signal.aborted || error?.name === 'AbortError') {
          throw new AIError('AI_TIMEOUT', 'Die KI-Anfrage hat zu lange gedauert.', { status: 504, retryable: true });
        }
        throw new AIError('AI_PROVIDER', 'Gemini ist vorübergehend nicht erreichbar.', { status: 503, retryable: true });
      }

      if (!response.ok) {
        const canRetry = attempt === 1 && RETRYABLE_STATUS.has(response.status) && deadline - now() >= 20_000;
        if (canRetry) continue;
        throw providerError(response.status);
      }

      let data;
      try {
        data = await response.json();
      } catch {
        throw new AIError('AI_INVALID_RESPONSE', 'Gemini hat eine unlesbare Antwort geliefert.', { retryable: true });
      }
      const text = readCandidate(data);
      const value = request.parse(text, { action, payload });
      return {
        value,
        model: AI_MODEL_ID,
        requestId,
        durationMs: Math.max(0, now() - startedAt)
      };
    }
    throw new AIError('AI_PROVIDER', 'Gemini ist vorübergehend nicht verfügbar.', { status: 503, retryable: true });
  } finally {
    clearTimer(timer);
  }
}

