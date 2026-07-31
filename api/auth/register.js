import { transaction } from '../_lib/db.js';
import { hashPassword, safeEqual, signToken, validEmail, validPassword } from '../_lib/auth.js';
import { method, noStore, safeError } from '../_lib/http.js';

export default async function handler(req, res) {
  noStore(res);
  if (!method(req, res, ['POST'])) return;

  const { email, password, displayName, inviteCode } = req.body || {};
  const normalizedEmail = String(email || '').trim().toLowerCase();
  const name = String(displayName || '').trim();

  if (!validEmail(normalizedEmail)) return res.status(400).json({ error: 'Ungültige E-Mail-Adresse.' });
  if (!validPassword(password)) return res.status(400).json({ error: 'Das Passwort muss 10 bis 128 Zeichen haben.' });
  if (name.length < 2 || name.length > 80) return res.status(400).json({ error: 'Bitte einen gültigen Namen eintragen.' });

  try {
    const result = await transaction(async (client) => {
      await client.query("SELECT pg_advisory_xact_lock(hashtext('beep-test-registration'))");

      const existing = await client.query('SELECT 1 FROM users WHERE email = $1', [normalizedEmail]);
      if (existing.rowCount > 0) return { status: 409, error: 'Diese E-Mail ist bereits registriert.' };

      const countResult = await client.query('SELECT count(*)::int AS count FROM users');
      const isFirstUser = countResult.rows[0].count === 0;
      const bootstrapEmail = String(process.env.BOOTSTRAP_ADMIN_EMAIL || '').trim().toLowerCase();
      if (isFirstUser && (!bootstrapEmail || normalizedEmail !== bootstrapEmail)) {
        return { status: 403, error: 'Das erste Administratorkonto ist für die konfigurierte TSV-E-Mail reserviert.' };
      }
      const configuredInvite = process.env.REGISTRATION_INVITE_CODE;
      if (!isFirstUser && (!configuredInvite || !safeEqual(inviteCode, configuredInvite))) {
        return { status: 403, error: 'Der Einladungscode ist ungültig.' };
      }

      const teamName = process.env.TEAM_NAME || 'TSV Lindau Basketball';
      const teamSlug = process.env.TEAM_SLUG || 'tsv-lindau-basketball';
      const organizationResult = await client.query(
        `INSERT INTO organizations (name, slug)
         VALUES ($1, $2)
         ON CONFLICT (slug) DO UPDATE SET name = EXCLUDED.name
         RETURNING id, name, slug`,
        [teamName, teamSlug]
      );
      const organization = organizationResult.rows[0];

      const passwordHash = await hashPassword(password);
      const userResult = await client.query(
        `INSERT INTO users (email, display_name, password_hash, last_login_at)
         VALUES ($1, $2, $3, now())
         RETURNING id, email, display_name`,
        [normalizedEmail, name, passwordHash]
      );
      const user = userResult.rows[0];
      const role = isFirstUser ? 'admin' : 'coach';

      await client.query(
        'INSERT INTO memberships (user_id, organization_id, role) VALUES ($1, $2, $3)',
        [user.id, organization.id, role]
      );
      await client.query(
        `INSERT INTO workspaces (organization_id, data, version, updated_by)
         VALUES ($1, '{}'::jsonb, 0, $2)
         ON CONFLICT (organization_id) DO NOTHING`,
        [organization.id, user.id]
      );

      return { status: 201, user, role, organization };
    });

    if (result.error) return res.status(result.status).json({ error: result.error });
    const account = {
      id: result.user.id,
      email: result.user.email,
      displayName: result.user.display_name,
      role: result.role,
      organization: result.organization
    };
    return res.status(201).json({ token: signToken(result.user), user: account });
  } catch (error) {
    return safeError('register', error, res, 'Konto konnte nicht erstellt werden.');
  }
}
