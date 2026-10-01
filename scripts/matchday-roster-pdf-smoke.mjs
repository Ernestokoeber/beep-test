import assert from 'node:assert/strict';

let pdfModule;
try{pdfModule=await import('../js/matchday/roster-pdf.mjs');}catch{}
assert.equal(typeof pdfModule?.buildRosterPdf,'function','Der Kader-PDF-Generator fehlt.');

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
console.log('Matchday Kader-PDF: nur nominierte Namen ohne Starting Five, Bank und Trikotnummern.');
