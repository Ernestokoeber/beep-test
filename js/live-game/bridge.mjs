import {openJournal} from './journal.mjs';
import {clone,ensure} from './core.mjs';
import {mergeLiveStats,protectWorkspace} from './merge.mjs';
import {createMatchdayBridge,getMatchdayJournal} from '../matchday/bridge.mjs';
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
    async mergeAccepted(local,accepted,scope){
      const data=clone(local);data.games=data.games||[];
      // A live game first encountered on the server must also become visible locally.
      for(const game of accepted?.games||[])if((game.liveStats||game.matchday)&&!data.games.some(g=>g.id===game.id))data.games.push(clone(game));
      return (await overlay(protectWorkspace(data,accepted),scope)).data;
    },
    async beforeApply(workspace,scope){return (await overlay(workspace,scope)).data;},
    async ack(receipt,scope){if(receipt.length)await (await provider(scope)).ack(receipt);},
    async hasPending(scope){return scope?.organizationId ? (await (await provider(scope)).pending()).length>0:false;}
  };
}
export function createWorkspaceBridge(liveProvider=getJournal,matchdayProvider=getMatchdayJournal){
  const live=createBridge(liveProvider),matchday=createMatchdayBridge(matchdayProvider);
  return {
    async beforeSend(data,scope){const a=await live.beforeSend(data,scope),b=await matchday.beforeSend(a.data,scope);return {data:b.data,receipt:[...a.receipt.map(r=>({...r,kind:'live'})),...b.receipt.map(r=>({...r,kind:'matchday'}))]};},
    async beforeApply(data,scope){return matchday.beforeApply(await live.beforeApply(data,scope),scope);},
    async mergeAccepted(local,accepted,scope){return matchday.mergeAccepted(await live.mergeAccepted(local,accepted,scope),accepted,scope);},
    async ack(receipt,scope){await live.ack(receipt.filter(r=>!r.kind||r.kind==='live'),scope);await matchday.ack(receipt.filter(r=>r.kind==='matchday'),scope);},
    async hasPending(scope){return await live.hasPending(scope)||await matchday.hasPending(scope);}
  };
}
export const bridge=createWorkspaceBridge();
