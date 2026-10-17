export function method(req, res, allowed) {
  if (allowed.includes(req.method)) return true;
  res.setHeader('Allow', allowed.join(', '));
  res.status(405).json({ error: 'Methode nicht erlaubt.' });
  return false;
}

export function noStore(res) {
  res.setHeader('Cache-Control', 'no-store');
}

export function safeError(scope, error, res, message) {
  console.error('[' + scope + ']', error);
  if (error?.code === '53000' && /exceeded.*quota/i.test(error.message || '')) {
    return res.status(503).json({
      error: 'Das Datenbank-Kontingent ist erschöpft. Der Konto-Abgleich ist vorübergehend nicht verfügbar. Deine lokal gespeicherten Daten bleiben erhalten.',
      code: 'DATABASE_QUOTA_EXCEEDED', retryable: true
    });
  }
  return res.status(500).json({ error: message || 'Interner Serverfehler.' });
}
