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
  return res.status(500).json({ error: message || 'Interner Serverfehler.' });
}
