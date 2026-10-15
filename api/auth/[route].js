import login from '../_handlers/auth/login.js';
import me from '../_handlers/auth/me.js';
import register from '../_handlers/auth/register.js';

const handlers = Object.freeze({ login, me, register });

export function authRouteName(req) {
  const value = req.query?.route;
  return Array.isArray(value) ? String(value[0] || '') : String(value || '');
}

export default function handler(req, res) {
  const selected = handlers[authRouteName(req)];
  if (!selected) return res.status(404).json({ error: 'Authentifizierungs-Endpunkt nicht gefunden.' });
  return selected(req, res);
}
