import { AIError, AI_MODEL_ID, buildAIRequest } from './ai-contracts.js';
import {collectOfficialScouting,attachOfficialResearch} from './scouting-official.js';

const ENDPOINT = `https://generativelanguage.googleapis.com/v1beta/models/${AI_MODEL_ID}:generateContent`;
const RETRYABLE_STATUS = new Set([429, 500, 503]);

function providerError(status) {
  if (status === 429) {
    return new AIError('AI_RATE_LIMIT', 'Gemini ist ausgelastet. Bitte versuche es gleich noch einmal.', { status: 429, retryable: true, providerStatus: status });
  }
  if (status === 400) {
    return new AIError('AI_PROVIDER_REQUEST', 'Gemini hat die strukturierte Anfrage abgelehnt.', { status: 502, retryable: false, providerStatus: status });
  }
  if (status === 401 || status === 403) {
    return new AIError('AI_PROVIDER_AUTH', 'Die Gemini-Konfiguration ist ungültig oder nicht berechtigt.', { status: 503, retryable: false, providerStatus: status });
  }
  if (status === 404) {
    return new AIError('AI_MODEL_UNAVAILABLE', 'Das konfigurierte Gemini-Modell ist nicht verfügbar.', { status: 503, retryable: false, providerStatus: status });
  }
  return new AIError('AI_PROVIDER', 'Gemini ist vorübergehend nicht verfügbar.', { status: 503, retryable: true, providerStatus: status });
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
  let searching = Boolean(request.searchParts);
  let searchResponse;
  let parts = request.searchParts || request.parts;
  let generationConfig = searching ? {thinkingConfig:{thinkingLevel:'low'}} : request.generationConfig;

  try {
    let officialEvidence;
    if(action==='researchOpponent'&&Number(payload.opponent?.leagueId)){
      officialEvidence=await collectOfficialScouting(payload.opponent,{fetchImpl,signal:controller.signal});
      parts=[...parts,{text:'Direkt abgerufene aktuelle DBB-Primärdaten. Berücksichtige Teamverknüpfungen, tatsächliche Kadernennungen, Nullwert-Platzhalter und Absagen. Suche gezielt weiter nach den hier genannten Spielern und deren sportlicher Vorgeschichte; diese Daten dürfen nicht pauschal als unzugänglich bezeichnet werden. Künftige Kader sind nicht bestätigt. '+JSON.stringify(officialEvidence)}];
    }
    while (attempt < 2) {
      attempt += 1;
      let response;
      try {
        response = await fetchImpl(ENDPOINT, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'x-goog-api-key': apiKey },
          body: JSON.stringify({
            contents: [{ parts }],
            ...(request.tools && (!request.searchParts || searching) ? {tools:request.tools} : {}),
            generationConfig
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
        // Some Gemini serving versions reject a valid structured schema. Retry
        // this planning request once in JSON mode with the exact same contract
        // in the prompt; request.parse still validates every station and target.
        if (response.status === 400 && action === 'planSeason' && attempt === 1 &&
            generationConfig.responseSchema && deadline - now() >= 5_000) {
          const { responseSchema, ...jsonConfig } = generationConfig;
          generationConfig = jsonConfig;
          parts = [...request.parts, { text: `Antworte ausschließlich mit einem vollständigen JSON-Objekt nach diesem Antwortformat. Alle Pflichtfelder und Wurfvorgaben müssen erhalten bleiben; kein Markdown:\n${JSON.stringify(responseSchema)}` }];
          continue;
        }
        const canRetry = attempt === 1 && RETRYABLE_STATUS.has(response.status) && deadline - now() >= 20_000;
        if (canRetry) continue;
        throw providerError(response.status);
      }

      let data;
      try {
        data = await response.json();
      } catch (error) {
        if (controller.signal.aborted || error?.name === 'AbortError') {
          throw new AIError('AI_TIMEOUT', 'Die KI-Anfrage hat zu lange gedauert.', { status: 504, retryable: true });
        }
        throw new AIError('AI_INVALID_RESPONSE', 'Gemini hat eine unlesbare Antwort geliefert.', { retryable: true });
      }
      const text = readCandidate(data);
      if (searching) {
        const metadata = data.candidates?.[0]?.groundingMetadata;
        if (!metadata?.groundingChunks?.some(chunk => chunk.web?.uri)&&!officialEvidence?.sources.length) {
          throw new AIError('AI_RESEARCH_UNGROUNDED', 'Die Websuche hat keine überprüfbaren Quellen geliefert. Bitte erneut recherchieren; der bisherige Bericht bleibt erhalten.', {retryable:true});
        }
        // Search in ordinary text first: JSON-mode search can omit grounding.
        // Structure only the obtained material; keep the original provider proof.
        searchResponse = data;
        searching = false;
        attempt = 0;
        generationConfig = request.generationConfig;
        parts = [...request.parts, {text:`Strukturiere ausschließlich das folgende Recherchematerial. Führe keine neue Suche aus und ergänze keine Fakten aus Vorwissen. Verwende in sourceUrls die konkreten URLs aus den mitgelieferten Suchbelegen. Direkt abgerufene DBB-Daten sind ebenfalls zitierbare Primärbelege; beachte Absagen. Formuliere fehlende Funde als Suchgrenzen, nicht als Behauptung, dass etwas nicht öffentlich existiert. Unbelegte Angaben bleiben leer. Recherchematerial: ${JSON.stringify({report:text,sources:metadata?.groundingChunks || [],supports:metadata?.groundingSupports || [],officialEvidence})}`}];
        continue;
      }
      const parsed = request.parse(text, { action, payload, providerResponse:searchResponse || data,officialEvidence });
      const value = officialEvidence?attachOfficialResearch(parsed,officialEvidence):parsed;
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

