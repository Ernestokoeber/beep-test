import {canonical,ensure} from '../live-game/core.mjs';
import {mergeMatchday,validateMatchday} from './model.mjs';
export async function openMatchdayJournal(scope,idb=globalThis.indexedDB){
  ensure(scope?.organizationId&&scope?.actorId,'identity','Für den Spieltag zuerst im Team anmelden.');
  ensure(idb,'storage','Sicherer Offline-Speicher nicht verfügbar.');
  const prefix=JSON.stringify([scope.organizationId,scope.actorId]);
  const key=gameId=>JSON.stringify([scope.organizationId,scope.actorId,gameId]);
  const db=await new Promise((resolve,reject)=>{const r=idb.open('courthub-matchday-v1',1);r.onupgradeneeded=()=>r.result.createObjectStore('drafts',{keyPath:'key'});r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error);r.onblocked=()=>reject(Error('Offline-Speicher durch anderen Tab blockiert.'));});
  function tx(mode,work){return new Promise((resolve,reject)=>{const t=db.transaction('drafts',mode);let result,error;
    t.oncomplete=()=>resolve(result);t.onerror=()=>reject(error||t.error);t.onabort=()=>reject(error||t.error||Error('Speicherung abgebrochen.'));
    const fail=e=>{error=e;t.abort();};try{work(t.objectStore('drafts'),v=>{result=v;},fail);}catch(e){fail(e);}
  });}
  return {
    async append(gameId,value){validateMatchday(value);return tx('readwrite',(s,done,fail)=>{const r=s.get(key(gameId));r.onsuccess=()=>{try{const matchday=mergeMatchday(value,r.result?.matchday).value;s.put({key:key(gameId),scope:prefix,gameId,matchday,pending:true,stamp:canonical(matchday)});done(matchday);}catch(e){fail(e);}};});},
    async read(gameId){return tx('readonly',(s,done)=>{const r=s.get(key(gameId));r.onsuccess=()=>done(r.result?.matchday);});},
    async pending(){return tx('readonly',(s,done)=>{const r=s.getAll();r.onsuccess=()=>done(r.result.filter(x=>x.scope===prefix&&x.pending));});},
    async ack(receipt){return tx('readwrite',(s,done)=>{for(const item of receipt){const r=s.get(key(item.gameId));r.onsuccess=()=>{if(r.result?.stamp===item.stamp)s.put({...r.result,pending:false});};}done();});}
  };
}
