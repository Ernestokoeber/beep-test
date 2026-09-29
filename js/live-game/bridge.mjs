import {openJournal} from './journal.mjs';
import {clone,ensure} from './core.mjs';
import {mergeLiveStats} from './merge.mjs';
const journals=new Map();
export function getJournal(scope){const key=JSON.stringify([scope.organizationId,scope.actorId]);if(!journals.has(key))journals.set(key,openJournal(scope).catch(e=>{journals.delete(key);throw e;}));return journals.get(key);}
export function createBridge(provider=getJournal){
  async function overlay(workspace,scope){
    const data=clone(workspace),receipt=[];
    if(!scope?.organizationId || !scope?.actorId)return {data,receipt};
    const journal=await provider(scope);const pending=await journal.pending();
    for(const row of pending){
      const game=data.games?.find(g=>g.id===row.gameId);
      ensure(game,'deletion','Spiel wurde entfernt. Lokale Live-Aktionen sind im Journal gesichert; Löschkonflikt zuerst klären.');
      game.liveStats=mergeLiveStats(row.live,game.liveStats).value;
      receipt.push({gameId:row.gameId,stamp:row.stamp});
    }
    return {data,receipt};
  }
  return {
    beforeSend:overlay,
    async beforeApply(workspace,scope){return (await overlay(workspace,scope)).data;},
    async ack(receipt,scope){if(receipt.length)await (await provider(scope)).ack(receipt);},
    async hasPending(scope){return scope?.organizationId ? (await (await provider(scope)).pending()).length>0:false;}
  };
}
export const bridge=createBridge();
