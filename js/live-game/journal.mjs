import {canonical,ensure} from './core.mjs';
import {mergeLiveStats,validateLive} from './merge.mjs';
export async function openJournal(scope,idb=globalThis.indexedDB) {
  ensure(scope?.organizationId && scope?.actorId,'identity','Für Live-Erfassung zuerst im Team anmelden.');
  ensure(idb,'storage','Dieser Browser unterstützt den sicheren Offline-Speicher nicht.');
  const prefix=JSON.stringify([scope.organizationId,scope.actorId]);
  const db=await new Promise((resolve,reject)=>{
    const req=idb.open('courthub-live-v1',1);
    req.onupgradeneeded=()=>{req.result.createObjectStore('sessions',{keyPath:'key'});req.result.createObjectStore('leases',{keyPath:'key'});};
    req.onsuccess=()=>resolve(req.result);req.onerror=()=>reject(req.error);
    req.onblocked=()=>reject(new Error('Offline-Speicher ist durch einen anderen Tab blockiert.'));
  });
  const key=gameId=>JSON.stringify([scope.organizationId,scope.actorId,gameId]);
  function transaction(store,mode,work){return new Promise((resolve,reject)=>{
    const tx=db.transaction(store,mode);let value,error;
    tx.oncomplete=()=>resolve(value);tx.onerror=()=>reject(error||tx.error);tx.onabort=()=>reject(error||tx.error||new Error('Speicherung abgebrochen.'));
    const done=result=>{value=result;};
    const fail=e=>{error=e;tx.abort();};
    try{work(tx.objectStore(store),done,fail);}catch(e){fail(e);}
  });}
  async function rows(){return transaction('sessions','readonly',(store,done)=>{const r=store.getAll();r.onsuccess=()=>done(r.result.filter(row=>row.scope===prefix));});}
  return {
    async append(gameId,live){
      validateLive(live);
      return transaction('sessions','readwrite',(store,done,fail)=>{
        const r=store.get(key(gameId));r.onsuccess=()=>{try{
          const value=mergeLiveStats(live,r.result?.live).value;
          store.put({key:key(gameId),scope:prefix,gameId,live:value,pending:true,stamp:canonical(value)});done(value);
        }catch(e){fail(e);}};
      });
    },
    async pending(){return (await rows()).filter(row=>row.pending);},
    async read(gameId){return transaction('sessions','readonly',(store,done)=>{const r=store.get(key(gameId));r.onsuccess=()=>done(r.result?.live);});},
    async ack(receipt){return transaction('sessions','readwrite',(store,done)=>{
      for(const item of receipt){const r=store.get(key(item.gameId));r.onsuccess=()=>{if(r.result?.stamp===item.stamp){store.put({...r.result,pending:false});}};}done();
    });},
    async acquire(gameId,owner,now=Date.now()){return transaction('leases','readwrite',(store,done,fail)=>{
      const r=store.get(key(gameId));r.onsuccess=()=>{try{ensure(!r.result||r.result.owner===owner||r.result.expires<=now,'lease','Dieses Spiel wird bereits in einem anderen Tab erfasst.');store.put({key:key(gameId),owner,expires:now+15000});done();}catch(e){fail(e);}};
    });},
    async release(gameId,owner){return transaction('leases','readwrite',(store,done)=>{const r=store.get(key(gameId));r.onsuccess=()=>{if(r.result?.owner===owner)store.delete(key(gameId));done();};});}
  };
}
