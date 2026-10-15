import aiDrafts from '../_handlers/individual/ai-drafts.js';
import manage from '../_handlers/individual/manage.js';
import overview from '../_handlers/individual/overview.js';
import push from '../_handlers/individual/push.js';
import reminders from '../_handlers/individual/reminders.js';
import sync from '../_handlers/individual/sync.js';

const handlers = Object.freeze({
  'ai-drafts': aiDrafts,
  manage,
  overview,
  push,
  reminders,
  sync
});

export function individualRouteName(req) {
  const value = req.query?.route;
  return Array.isArray(value) ? String(value[0] || '') : String(value || '');
}

export default function handler(req, res) {
  const selected = handlers[individualRouteName(req)];
  if (!selected) return res.status(404).json({ error: 'Individual-Training-Endpunkt nicht gefunden.' });
  return selected(req, res);
}
