import { query } from '../_lib/db.js';
import { getMembership, signToken, validEmail, verifyPassword } from '../_lib/auth.js';
import { method, noStore, safeError } from '../_lib/http.js';

export default async function handler(req, res) {
  noStore(res);
  if (!method(req, res, ['POST'])) return;

  const { email, password } = req.body || {};
  const normalizedEmail = String(email || '').trim().toLowerCase();
  if (!validEmail(normalizedEmail) || !password) {
    return res.status(400).json({ error: 'E-Mail und Passwort erforderlich.' });
  }

  try {
    const { rows } = await query(
      'SELECT id, email, display_name, password_hash FROM users WHERE email = $1',
      [normalizedEmail]
    );
    const user = rows[0];
    if (!user || !(await verifyPassword(password, user.password_hash))) {
      return res.status(401).json({ error: 'E-Mail oder Passwort falsch.' });
    }
    const membership = await getMembership(user.id);
    if (!membership) return res.status(403).json({ error: 'Keinem Team zugeordnet.' });

    await query('UPDATE users SET last_login_at = now() WHERE id = $1', [user.id]);
    return res.status(200).json({
      token: signToken(user),
      user: {
        id: user.id,
        email: user.email,
        displayName: user.display_name,
        role: membership.role,
        organization: {
          id: membership.organization_id,
          name: membership.organization_name,
          slug: membership.organization_slug
        }
      }
    });
  } catch (error) {
    return safeError('login', error, res, 'Anmeldung fehlgeschlagen.');
  }
}
