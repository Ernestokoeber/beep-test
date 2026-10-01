import assert from 'node:assert/strict';

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
    {id:'p1',name:'Anna Beispiel',jerseyNumber:'77',gameStatus:'starter',role:'Ballhandling'},
    {id:'p2',name:'Berta Muster',jerseyNumber:'88',gameStatus:'bench',role:''},
    {id:'p3',name:'Carla Nichtdabei',jerseyNumber:'99',gameStatus:'dnp',role:'Center'}
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

const longDoc=new PdfStub(),longName='Alexander Maximilian Mustermann mit einem außergewöhnlich langen vollständigen Namen',longRole='Primärer Ballhandler und verantwortlicher Organisator für das gesamte Umschaltspiel';
pdfModule.buildRosterPdf(longDoc,{game:{home:'TSV Lindau',away:'Gast'},draft:{roster:[{id:'lang',name:longName,gameStatus:'bench',role:longRole}]}});
const nameEvent=longDoc.events.find(event=>event[0]==='text'&&event[1].includes('Alexander'));
const roleEvent=longDoc.events.find(event=>event[0]==='text'&&event[1].includes('Primärer'));
assert.ok(nameEvent&&roleEvent,'Langer Name und lange Rolle müssen vollständig gesetzt werden.');
assert.notEqual(nameEvent[3],roleEvent[3],'Name und Rolle dürfen nicht auf derselben Zeile kollidieren.');
console.log('Matchday Kader-PDF: nur nominierte Namen ohne Starting Five, Bank und Trikotnummern.');
