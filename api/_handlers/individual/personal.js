import {query} from '../../_lib/db.js';
import {requireAuth} from '../../_lib/auth.js';
import {method,noStore,safeError} from '../../_lib/http.js';
import {validateStore} from '../../../js/personal-core.mjs';
export const PERSONAL_SCHEMA = `CREATE TABLE IF NOT EXISTS personal_training (
  user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  data JSONB NOT NULL DEFAULT '{"plan":null,"records":[]}'::jsonb,
  version INTEGER NOT NULL DEFAULT 1,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp()
)`;
export function createPersonalHandler(deps={}) {
  const db=deps.query||query, authenticate=deps.requireAuth||requireAuth;
  let ready;
  return async function handler(req,res) {
    noStore(res);
    if(!method(req,res,['GET','PUT'])) return;
    const auth=await authenticate(req,res); if(!auth) return;
    try {
      let data,version;
      if(req.method==='PUT') {
        if(Buffer.byteLength(JSON.stringify(req.body||{}))>1_000_000) return res.status(413).json({error:'Die Trainingsdaten sind zu groß.'});
        version=req.body?.version;
        if(!Number.isSafeInteger(version)||version<0||version>=2147483646) throw new TypeError('Speicherversion ist ungültig.');
        data=validateStore(req.body?.data);
      }
      // Additive, idempotent initialization; no existing data is modified.
      if(!ready) ready=db(PERSONAL_SCHEMA).catch(error=>{ready=null;throw error;});
      await ready;
      if(req.method==='GET') {
        const {rows}=await db('SELECT data, version, updated_at FROM personal_training WHERE user_id = $1',[auth.sub]);
        return res.json(rows[0]||{data:{plan:null,records:[]},version:0,updated_at:null});
      }
      const result=version===0
        ? await db(`INSERT INTO personal_training (user_id,data) VALUES ($1,$2::jsonb)
            ON CONFLICT (user_id) DO NOTHING RETURNING data,version,updated_at`,[auth.sub,JSON.stringify(data)])
        : await db(`UPDATE personal_training SET data=$2::jsonb,version=version+1,updated_at=clock_timestamp()
            WHERE user_id=$1 AND version=$3 RETURNING data,version,updated_at`,[auth.sub,JSON.stringify(data),version]);
      if(!result.rows.length) return res.status(409).json({error:'Auf einem anderen Gerät wurde inzwischen gespeichert. Lade den aktuellen Stand; dein Eingabeentwurf bleibt erhalten.'});
      return res.json(result.rows[0]);
    } catch(error) {
      if(error instanceof TypeError) return res.status(400).json({error:error.message});
      return safeError('personal-training', {code:error.code,message:'Persönliche Trainingsdaten konnten nicht verarbeitet werden.'},res,'Dein persönlicher Trainingsbereich ist momentan nicht erreichbar. Bitte erneut versuchen.');
    }
  };
}
export default createPersonalHandler();
