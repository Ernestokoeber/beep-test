import {query} from '../../_lib/db.js';
import {hashIndividualInviteToken} from '../../_lib/individual-access.js';
import {method, noStore, safeError} from '../../_lib/http.js';

export function createIndividualInviteHandler(deps = {}) {
  const execute = deps.query || query;
  return async function handler(req, res) {
    noStore(res);
    if (!method(req, res, ['GET'])) return;
    const token = req.query?.token;
    if (typeof token !== 'string' || !/^[A-Za-z0-9_-]{24,512}$/.test(token)) {
      return res.status(400).json({error:'Der Einladungslink ist unvollständig oder ungültig.'});
    }
    try {
      const {rows} = await execute(
        `SELECT ii.expires_at FROM individual_invites ii
           JOIN individual_profiles ip ON ip.id = ii.individual_profile_id AND ip.organization_id = ii.organization_id
          WHERE ii.token_hash = $1 AND ii.used_at IS NULL AND ii.revoked_at IS NULL
            AND ii.expires_at > clock_timestamp() AND ip.active = TRUE AND ip.user_id IS NULL
          LIMIT 1`, [hashIndividualInviteToken(token)]);
      if (!rows.length) return res.status(410).json({error:'Diese Einladung ist abgelaufen, wurde bereits verwendet oder zurückgezogen. Bitte deinen Coach um einen neuen Link.'});
      return res.status(200).json({valid:true, expiresAt:rows[0].expires_at});
    } catch (error) { return safeError('individual-invite', error, res, 'Die Einladung konnte nicht geprüft werden. Bitte später erneut versuchen.'); }
  };
}
export default createIndividualInviteHandler();
