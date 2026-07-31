import { query } from '../_lib/db.js';
import { requireMembership } from '../_lib/auth.js';
import { method, noStore, safeError } from '../_lib/http.js';

export default async function handler(req, res) {
  noStore(res);
  if (!method(req, res, ['GET'])) return;
  try {
    const auth = await requireMembership(req, res);
    if (!auth) return;
    const { rows } = await query('SELECT email, display_name FROM users WHERE id = $1', [auth.sub]);
    const user = rows[0];
    return res.status(200).json({
      user: {
        id: auth.sub,
        email: user.email,
        displayName: user.display_name,
        role: auth.role,
        organization: {
          id: auth.organization_id,
          name: auth.organization_name,
          slug: auth.organization_slug
        }
      }
    });
  } catch (error) {
    return safeError('me', error, res, 'Kontodaten konnten nicht geladen werden.');
  }
}
