import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

let pdfModule;
try{pdfModule=await import('../js/matchday/roster-pdf.mjs');}catch{}
assert.equal(typeof pdfModule?.buildRosterPdf,'function','Der Kader-PDF-Generator fehlt.');
assert.equal(typeof pdfModule?.prepareRosterPdf,'function','Die lokale PDF-Engine muss vor dem Export vorbereitet werden können.');
assert.equal(typeof pdfModule?.deliverRosterPdf,'function','Der mobile Share-/Download-Pfad muss getrennt testbar sein.');

let loadedScript='';
globalThis.window={};
globalThis.document={createElement:()=>({}),head:{append:script=>{loadedScript=script.src;window.jspdf={jsPDF:class{}};script.onload();}}};
await pdfModule.prepareRosterPdf();
assert.equal(loadedScript,'./vendor/jspdf.umd.min.js','Die PDF-Engine muss lokal statt aus einem CDN geladen werden.');

let downloadClicks=0;
const FileCtor=class{constructor(parts,name,options){this.parts=parts;this.name=name;this.type=options.type;}};
const deliveryOptions={FileCtor,documentApi:{createElement:()=>({click:()=>{downloadClicks++;}})},urlApi:{createObjectURL:()=>'/pdf',revokeObjectURL:()=>{}},timer:fn=>fn()};
const abortError=Object.assign(Error('abgebrochen'),{name:'AbortError'});
const cancelled=await pdfModule.deliverRosterPdf(new Blob(['pdf']),'kader.pdf',{...deliveryOptions,navigatorApi:{canShare:()=>true,share:async()=>{throw abortError;}}});
assert.equal(cancelled,'cancelled');assert.equal(downloadClicks,0,'Ein bewusst abgebrochenes Teilen darf keinen Download auslösen.');
const downloaded=await pdfModule.deliverRosterPdf(new Blob(['pdf']),'kader.pdf',{...deliveryOptions,navigatorApi:{canShare:()=>true,share:async()=>{throw Error('Teilen nicht verfügbar');}}});
assert.equal(downloaded,'downloaded');assert.equal(downloadClicks,1,'Bei einem technischen Share-Fehler muss der Download-Fallback greifen.');

class PdfStub{
  constructor(){this.events=[];this.pages=1;this.internal={pageSize:{getWidth:()=>595.28,getHeight:()=>841.89},getNumberOfPages:()=>this.pages};}
  setFillColor(...args){this.events.push(['fill',...args]);return this;}
  setDrawColor(...args){this.events.push(['draw',...args]);return this;}
  setTextColor(...args){this.events.push(['color',...args]);return this;}
  setFont(...args){this.events.push(['font',...args]);return this;}
  setFontSize(...args){this.events.push(['size',...args]);return this;}
  rect(...args){this.events.push(['rect',...args]);return this;}
  roundedRect(...args){this.events.push(['roundedRect',...args]);return this;}
  line(...args){this.events.push(['line',...args]);return this;}
  text(value,...args){this.events.push(['text',String(value),...args]);return this;}
  addPage(){this.pages++;this.events.push(['addPage']);return this;}
  setPage(page){this.events.push(['setPage',page]);return this;}
  splitTextToSize(value,maxWidth){const text=String(value),size=Math.max(1,Math.floor(maxWidth/6)),lines=[];for(let i=0;i<text.length;i+=size)lines.push(text.slice(i,i+size));return lines;}
}

const doc=new PdfStub();
pdfModule.buildRosterPdf(doc,{
  game:{home:'TSV Lindau',away:'TSV Ottobeuren',date:'2026-10-04',time:'17:00'},
  draft:{ownSide:'home',roster:[
    {id:'p1',name:'Anna Beispiel',jerseyNumber:'77',gameStatus:'starter',gamePosition:'c',role:'Ballhandling'},
    {id:'p2',name:'Berta Muster',jerseyNumber:'88',gameStatus:'bench',gamePosition:'pg',role:''},
    {id:'p3',name:'Carla Nichtdabei',jerseyNumber:'99',gameStatus:'dnp',gamePosition:'sg',role:'Center'}
  ]}
});
const text=doc.events.filter(event=>event[0]==='text').map(event=>event[1]).join('\n');
const textValues=doc.events.filter(event=>event[0]==='text').map(event=>event[1]);
assert.match(text,/Nominierter Kader/,'Die PDF braucht eine eindeutige Kaderüberschrift.');
assert.match(text,/Anna Beispiel/);
assert.match(text,/Berta Muster/);
assert.doesNotMatch(text,/Carla Nichtdabei/,'Nicht nominierte Spieler dürfen nicht exportiert werden.');
assert.doesNotMatch(text,/Starting Five|Bank/,'Die PDF darf keine Starting-Five- oder Bankaufteilung enthalten.');
assert.doesNotMatch(text,/77|88|99/,'Trikotnummern dürfen nicht in der PDF erscheinen.');
assert.equal(textValues.filter(value=>/^\d+$/.test(value)).length,0,'Auch laufende Nummern würden wie Trikotnummern wirken und müssen entfallen.');
assert.match(text,/2 Spieler/,'Die PDF muss die Größe des nominierten Kaders nennen.');
assert.match(text,/Point Guard/,'Die PDF muss die spielbezogene Position sichtbar gruppieren.');
assert.match(text,/Center/,'Die PDF muss alle belegten Positionsgruppen anzeigen.');
assert.ok(text.indexOf('Point Guard')<text.indexOf('Berta Muster')&&text.indexOf('Berta Muster')<text.indexOf('Center')&&text.indexOf('Center')<text.indexOf('Anna Beispiel'),'Der Kader muss als PG, SG, SF, PF, C und danach ohne Position sortiert werden.');

const groupedDoc=new PdfStub();
pdfModule.buildRosterPdf(groupedDoc,{game:{home:'Lindau',away:'Gast'},draft:{roster:[
  {id:'none-z',name:'Zeta ohne Position',gameStatus:'bench',gamePosition:null},{id:'c-z',name:'Zeta C',gameStatus:'bench',gamePosition:'c'},
  {id:'pf-z',name:'Zeta PF',gameStatus:'bench',gamePosition:'pf'},{id:'sf-z',name:'Zeta SF',gameStatus:'bench',gamePosition:'sf'},
  {id:'sg-z',name:'Zeta SG',gameStatus:'bench',gamePosition:'sg'},{id:'pg-z',name:'Zeta PG',gameStatus:'bench',gamePosition:'pg'},
  {id:'none-a',name:'Alpha ohne Position',gameStatus:'bench',gamePosition:null},{id:'c-a',name:'Alpha C',gameStatus:'bench',gamePosition:'c'},
  {id:'pf-a',name:'Alpha PF',gameStatus:'bench',gamePosition:'pf'},{id:'sf-a',name:'Alpha SF',gameStatus:'bench',gamePosition:'sf'},
  {id:'sg-a',name:'Alpha SG',gameStatus:'bench',gamePosition:'sg'},{id:'pg-a',name:'Alpha PG',gameStatus:'bench',gamePosition:'pg'}
]}});
const groupedText=groupedDoc.events.filter(event=>event[0]==='text').map(event=>event[1]).join('\n');
let previous=-1;for(const value of ['Point Guard','Alpha PG','Zeta PG','Shooting Guard','Alpha SG','Zeta SG','Small Forward','Alpha SF','Zeta SF','Power Forward','Alpha PF','Zeta PF','Center','Alpha C','Zeta C','Ohne Position','Alpha ohne Position','Zeta ohne Position']){const index=groupedText.indexOf(value);assert.ok(index>previous,`PDF-Reihenfolge ist bei ${value} falsch.`);previous=index;}

const pagedDoc=new PdfStub();
pdfModule.buildRosterPdf(pagedDoc,{game:{home:'Lindau',away:'Gast'},draft:{roster:Array.from({length:40},(_,index)=>({id:'pg-'+index,name:`Point Guard ${String(index).padStart(2,'0')}`,gameStatus:'bench',gamePosition:'pg'}))}});
const pageBreaks=pagedDoc.events.filter(event=>event[0]==='addPage').length,pointGuardHeaders=pagedDoc.events.filter(event=>event[0]==='text'&&event[1]==='Point Guard').length;
assert.ok(pageBreaks>0,'Der Mehrseiten-Test muss tatsächlich einen Seitenwechsel erzeugen.');
assert.equal(pointGuardHeaders,pageBreaks+1,'Eine Positionsgruppe muss auf jeder Folgeseite erneut beschriftet werden.');

const twelvePlayers=['pg','pg','sg','sg','sf','sf','pf','pf','c','c',null,null].map((gamePosition,index)=>({id:'twelve-'+index,name:`Spieler ${String(index+1).padStart(2,'0')}`,gameStatus:'bench',gamePosition,role:index%2?'Shooter und Verteidiger':''}));
const twelveDoc=new PdfStub();
pdfModule.buildRosterPdf(twelveDoc,{game:{home:'TSV Lindau',away:'Gast'},draft:{roster:twelvePlayers}});
assert.equal(twelveDoc.internal.getNumberOfPages(),1,'Ein Kader mit zwölf Spielern muss auf genau eine A4-Seite passen.');

const longDoc=new PdfStub(),longName='Alexander Maximilian Mustermann mit einem außergewöhnlich langen vollständigen Namen',longRole='Primärer Ballhandler und verantwortlicher Organisator für das gesamte Umschaltspiel';
pdfModule.buildRosterPdf(longDoc,{game:{home:'TSV Lindau',away:'Gast'},draft:{roster:[{id:'lang',name:longName,gameStatus:'bench',role:longRole}]}});
const nameEvent=longDoc.events.find(event=>event[0]==='text'&&event[1].includes('Alexander'));
const roleEvent=longDoc.events.find(event=>event[0]==='text'&&event[1].includes('Primärer'));
assert.ok(nameEvent&&roleEvent,'Langer Name und lange Rolle müssen vollständig gesetzt werden.');
assert.notEqual(nameEvent[3],roleEvent[3],'Name und Rolle dürfen nicht auf derselben Zeile kollidieren.');

function loadVendoredJsPdf(){
  const source=fs.readFileSync(new URL('../vendor/jspdf.umd.min.js',import.meta.url),'utf8');
  const sandbox={console,atob,btoa,Blob,TextEncoder,TextDecoder,ArrayBuffer,Uint8Array,Uint8ClampedArray,Int8Array,Int16Array,Int32Array,Uint16Array,Uint32Array,Float32Array,Float64Array,DataView,setTimeout,clearTimeout,navigator:{},document:{createElement:()=>({getContext:()=>({})})}};
  sandbox.globalThis=sandbox;sandbox.global=sandbox;sandbox.self=sandbox;sandbox.window=sandbox;
  vm.runInNewContext(source,sandbox);
  return sandbox.jspdf.jsPDF;
}

const RealJsPdf=loadVendoredJsPdf(),realDoc=new RealJsPdf({unit:'pt',format:'a4',orientation:'portrait'}),renderedText=[];
const realText=realDoc.text.bind(realDoc);
realDoc.text=(value,x,y,options)=>{
  const lines=Array.isArray(value)?value:[String(value)];
  renderedText.push({lines,x,widths:lines.map(line=>realDoc.getTextWidth(String(line)))});
  return realText(value,x,y,options);
};
const veryLongName='Alexander Maximilian Mustermann-von-Beispielhausen mit einem außergewöhnlich langen vollständigen Namen';
const veryLongHome='TSV Lindau Basketballabteilung mit außergewöhnlich langem Vereinsnamen';
const veryLongAway='Basketballgemeinschaft Ottobeuren und Umgebung mit langem Vereinsnamen';
pdfModule.buildRosterPdf(realDoc,{game:{home:veryLongHome,away:veryLongAway,date:'2026-10-04',time:'17:00'},draft:{roster:[{id:'lang',name:veryLongName,gameStatus:'bench',role:longRole}]}});
const pageWidth=realDoc.internal.pageSize.getWidth(),rightEdge=pageWidth-42;
const realName=renderedText.find(event=>event.lines.join(' ').includes('Alexander Maximilian'));
const realMatchup=renderedText.find(event=>event.lines.join(' ').includes('Basketballabteilung'));
assert.ok(realName&&realMatchup,'Name und Spielpaarung müssen mit der echten PDF-Engine gerendert werden.');
for(const event of [realName,realMatchup])for(const lineWidth of event.widths)assert.ok(event.x+lineWidth<=rightEdge+0.1,'Lange Namen und Vereinsbezeichnungen dürfen den rechten Seitenrand nicht überschreiten.');
const compactRealDoc=new RealJsPdf({unit:'pt',format:'a4',orientation:'portrait'});
const compactRoster=['pg','pg','sg','sg','sf','sf','pf','pf','c','c',null,null].map((gamePosition,index)=>({
  id:'compact-'+index,
  name:`Alexander Maximilian Spielername ${String(index+1).padStart(2,'0')} mit langem Familiennamen`,
  gameStatus:'bench',gamePosition,
  role:'Primäre taktische Rolle mit zusätzlicher Verantwortung im Umschaltspiel'
}));
pdfModule.buildRosterPdf(compactRealDoc,{game:{home:veryLongHome,away:veryLongAway,date:'2026-10-04',time:'17:00'},draft:{roster:compactRoster}});
assert.equal(compactRealDoc.internal.getNumberOfPages(),1,'Auch zwölf Spieler mit langen Namen und Rollen müssen in der echten PDF auf einer Seite bleiben.');
const boundaryDoc=new RealJsPdf({unit:'pt',format:'a4',orientation:'portrait'}),boundaryCards=[],boundaryText=[];
const boundaryRoundedRect=boundaryDoc.roundedRect.bind(boundaryDoc),boundaryTextMethod=boundaryDoc.text.bind(boundaryDoc);
boundaryDoc.roundedRect=(x,y,w,h,...args)=>{if(w>200&&w<300)boundaryCards.push({x,y,w,h});return boundaryRoundedRect(x,y,w,h,...args);};
boundaryDoc.text=(value,x,y,options)=>{boundaryText.push(Array.isArray(value)?value.join(''):String(value));return boundaryTextMethod(value,x,y,options);};
const boundaryPositions=['pg','pg','pg','pg','pg','pg','pg','sg','sf','pf','c',null];
const boundaryRoster=boundaryPositions.map((gamePosition,index)=>({
  id:'boundary-'+index,
  name:(`Spieler ${String(index+1).padStart(2,'0')} `+'N'.repeat(100)).slice(0,100),
  gameStatus:'bench',gamePosition,
  role:(`Rolle ${String(index+1).padStart(2,'0')} `+'R'.repeat(120)).slice(0,120)
}));
pdfModule.buildRosterPdf(boundaryDoc,{game:{home:veryLongHome,away:veryLongAway,date:'2026-10-04',time:'17:00'},draft:{roster:boundaryRoster}});
assert.equal(boundaryDoc.internal.getNumberOfPages(),1,'Auch der ungünstigste zulässige Zwölf-Spieler-Kader muss auf einer Seite bleiben.');
assert.equal(boundaryCards.length,12,'Alle zwölf Spielerkarten müssen vollständig gerendert werden.');
assert.ok(boundaryCards.every(card=>card.y+card.h<=boundaryDoc.internal.pageSize.getHeight()-66+0.1),'Keine Spielerkarte darf in den Fußbereich ragen oder abgeschnitten werden.');
for(const player of boundaryRoster){assert.ok(boundaryText.some(value=>value===player.name),`Der vollständige Name von ${player.id} fehlt.`);assert.ok(boundaryText.some(value=>value===player.role),`Die vollständige Rolle von ${player.id} fehlt.`);}
const thirteenDoc=new RealJsPdf({unit:'pt',format:'a4',orientation:'portrait'}),thirteenCards=[],thirteenRoundedRect=thirteenDoc.roundedRect.bind(thirteenDoc);
thirteenDoc.roundedRect=(x,y,w,h,...args)=>{if(w>400&&h<100&&y>240)thirteenCards.push({x,y,w,h});return thirteenRoundedRect(x,y,w,h,...args);};
pdfModule.buildRosterPdf(thirteenDoc,{game:{home:'Lindau',away:'Gast'},draft:{roster:Array.from({length:13},(_,index)=>({id:'thirteen-'+index,name:`Spieler ${index+1}`,gameStatus:'bench',gamePosition:'pg',role:''}))}});
assert.equal(thirteenCards.length,13,'Ab 13 Spielern muss weiterhin der vollbreite, mehrseitenfähige Exportpfad verwendet werden.');
console.log('Matchday Kader-PDF: nur nominierte Namen ohne Starting Five, Bank und Trikotnummern.');
