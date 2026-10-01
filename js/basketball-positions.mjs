export const GAME_POSITIONS=Object.freeze([
  Object.freeze({value:'pg',label:'Point Guard'}),
  Object.freeze({value:'sg',label:'Shooting Guard'}),
  Object.freeze({value:'sf',label:'Small Forward'}),
  Object.freeze({value:'pf',label:'Power Forward'}),
  Object.freeze({value:'c',label:'Center'})
]);
export const GAME_POSITION_VALUES=Object.freeze(GAME_POSITIONS.map(position=>position.value));

const labels=new Map(GAME_POSITIONS.map(position=>[position.value,position.label]));
const ranks=new Map(GAME_POSITIONS.map((position,index)=>[position.value,index]));
const aliases=new Map([
  ['pg','pg'],['point guard','pg'],['pointguard','pg'],
  ['sg','sg'],['shooting guard','sg'],['shootingguard','sg'],
  ['sf','sf'],['small forward','sf'],['smallforward','sf'],
  ['pf','pf'],['power forward','pf'],['powerforward','pf'],
  ['c','c'],['center','c']
]);

export function normalizeGamePosition(value){
  return aliases.get(String(value??'').trim().toLowerCase())||null;
}

export function gamePositionLabel(value){
  return labels.get(value)||'Ohne Position';
}

export function sortRosterByGamePosition(roster){
  return [...roster].sort((left,right)=>{
    const position=(ranks.get(left.gamePosition)??GAME_POSITIONS.length)-(ranks.get(right.gamePosition)??GAME_POSITIONS.length);
    return position||String(left.name||'').localeCompare(String(right.name||''),'de',{sensitivity:'base'});
  });
}
