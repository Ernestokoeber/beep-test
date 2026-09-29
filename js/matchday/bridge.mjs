import {clone,ensure} from '../live-game/core.mjs';
import {mergeMatchday} from './model.mjs';
import {openMatchdayJournal} from './journal.mjs';
const journals=new Map();
export function getMatchdayJournal(scope){const key=JSON.stringify([scope.organizationId,scope.actorId]);if(!journals.has(key))journals.set(key,openMatchdayJournal(scope).catch(e=>{journals.delete(key);throw e;}));return journals.get(key);}
export function createMatchdayBridge(provider=getMatchdayJournal){
  async function overlay(workspace,scope){
    const data=clone(workspace),receipt=[];
    if(!scope?.organizationId||!scope?.actorId)return {data,receipt};
    for(const row of await(await provider(scope)).pending()){
      const game=data.games?.find(g=>g.id===row.gameId);ensure(game,'deletion','Spiel entfernt. Lokale Vorbereitung bleibt gesichert; Löschkonflikt klären.');
      game.matchday=mergeMatchday(game.matchday,row.matchday).value;receipt.push({gameId:row.gameId,stamp:row.stamp});
    }
    return {data,receipt};
  }
  return {beforeSend:overlay,
    async beforeApply(workspace,scope){return (await overlay(workspace,scope)).data;},
    async mergeAccepted(local,accepted,scope){const data=clone(local);data.games=data.games||[];
      for(const remote of accepted?.games||[]){if(!remote.matchday)continue;const game=data.games.find(g=>g.id===remote.id);if(game)game.matchday=mergeMatchday(game.matchday,remote.matchday).value;else data.games.push(clone(remote));}
      return (await overlay(data,scope)).data;
    },
    async ack(receipt,scope){if(receipt.length)await(await provider(scope)).ack(receipt);},
    async hasPending(scope){return !!scope?.organizationId&&(await(await provider(scope)).pending()).length>0;}
  };
}
