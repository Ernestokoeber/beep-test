const GREEN=[0,92,57],ORANGE=[242,158,65],INK=[24,39,32],MUTED=[94,109,101],PAPER=[247,249,247],LINE=[214,222,217];
let jsPdfPromise=null;

function formatDate(value){
  if(!value)return'Datum offen';
  const date=new Date(`${value}T12:00:00`);
  return Number.isNaN(date.getTime())?String(value):new Intl.DateTimeFormat('de-DE',{day:'2-digit',month:'2-digit',year:'numeric'}).format(date);
}
function nominatedPlayers(draft){return (draft?.roster||[]).filter(player=>player.gameStatus!=='dnp');}
function loadJsPdf(){
  if(globalThis.window?.jspdf?.jsPDF)return Promise.resolve(window.jspdf.jsPDF);
  if(jsPdfPromise)return jsPdfPromise;
  jsPdfPromise=new Promise((resolve,reject)=>{
    const script=document.createElement('script');script.src='./vendor/jspdf.umd.min.js';
    script.onload=()=>window.jspdf?.jsPDF?resolve(window.jspdf.jsPDF):reject(Error('PDF-Modul konnte nicht gestartet werden.'));
    script.onerror=()=>{jsPdfPromise=null;reject(Error('PDF-Modul konnte nicht geladen werden. Bitte Internetverbindung prüfen.'));};
    document.head.append(script);
  });
  return jsPdfPromise;
}
export function prepareRosterPdf(){return loadJsPdf();}
function safeFilename(game){
  const opponent=String(game?.away||game?.home||'spiel').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'');
  return `courthub-kader-${game?.date||'spiel'}-${opponent||'spiel'}.pdf`;
}
function download(blob,filename,{documentApi,urlApi,timer}){const url=urlApi.createObjectURL(blob),link=documentApi.createElement('a');link.href=url;link.download=filename;link.click();timer(()=>urlApi.revokeObjectURL(url),1000);}
export async function deliverRosterPdf(blob,filename,{navigatorApi=globalThis.navigator,FileCtor=globalThis.File,documentApi=globalThis.document,urlApi=globalThis.URL,timer=globalThis.setTimeout}={}){
  if(typeof FileCtor==='function'&&navigatorApi?.share){
    const file=new FileCtor([blob],filename,{type:'application/pdf'});
    if(!navigatorApi.canShare||navigatorApi.canShare({files:[file]})){try{await navigatorApi.share({title:'CourtHub Spielkader',files:[file]});return'shared';}catch(error){if(error?.name==='AbortError')return'cancelled';}}
  }
  download(blob,filename,{documentApi,urlApi,timer});return'downloaded';
}

export function buildRosterPdf(doc,{game={},draft={}}={}){
  const roster=nominatedPlayers(draft);
  if(!roster.length)throw Error('Für den PDF-Export ist noch kein Spieler nominiert.');
  const width=doc.internal.pageSize.getWidth(),height=doc.internal.pageSize.getHeight(),margin=42,contentWidth=width-margin*2-39;
  let page=1,y=0;
  const drawHeader=continued=>{
    const matchup=`${game.home||'Heim'} - ${game.away||'Gast'}`;
    doc.setFont('helvetica','bold').setFontSize(16);
    const matchupLines=doc.splitTextToSize(matchup,width-margin*2-36),headerExtra=Math.max(0,matchupLines.length-1)*18;
    doc.setFillColor(...GREEN).rect(0,0,width,118,'F');
    doc.setFillColor(...ORANGE).rect(margin,92,126,5,'F');
    doc.setTextColor(255,255,255).setFont('helvetica','bold').setFontSize(12).text('TSV LINDAU BASKETBALL',margin,38);
    doc.setFontSize(27).text(continued?'Spielkader - Fortsetzung':'Spielkader',margin,73);
    doc.setTextColor(...INK).setFillColor(...PAPER).setDrawColor(...LINE).roundedRect(margin,142,width-margin*2,72+headerExtra,10,10,'FD');
    doc.setFont('helvetica','bold').setFontSize(16).text(matchupLines,margin+18,169,{lineHeightFactor:1.12});
    const meta=[formatDate(game.date),game.time?`${game.time} Uhr`:null,draft.ownSide==='home'?'Heimspiel':draft.ownSide==='away'?'Auswärtsspiel':null].filter(Boolean).join('  |  ');
    doc.setFont('helvetica','normal').setFontSize(10).setTextColor(...MUTED).text(meta,margin+18,192+headerExtra);
    doc.setTextColor(...INK).setFont('helvetica','bold').setFontSize(17).text('Nominierter Kader',margin,254+headerExtra);
    doc.setFont('helvetica','normal').setFontSize(10).setTextColor(...MUTED).text(`${roster.length} ${roster.length===1?'Spieler':'Spieler'}`,width-margin,254+headerExtra,{align:'right'});
    y=267+headerExtra;
  };
  const drawFooter=()=>{
    doc.setDrawColor(...LINE).line(margin,height-45,width-margin,height-45);
    doc.setTextColor(...MUTED).setFont('helvetica','normal').setFontSize(8).text('Erstellt mit CourtHub',margin,height-27);
    doc.text(`Seite ${page}`,width-margin,height-27,{align:'right'});
  };
  drawHeader(false);
  roster.forEach((player,index)=>{
    doc.setFont('helvetica','bold').setFontSize(11);
    const nameLines=doc.splitTextToSize(String(player.name||'Spieler'),contentWidth);
    doc.setFont('helvetica','normal').setFontSize(9);
    const roleLines=player.role?doc.splitTextToSize(String(player.role),contentWidth):[];
    const itemHeight=14+nameLines.length*13+(roleLines.length?3+roleLines.length*10.5:0);
    if(y+itemHeight>height-66){drawFooter();doc.addPage();page++;drawHeader(true);}
    doc.setFillColor(index%2?255:247,index%2?255:249,index%2?255:247).roundedRect(margin,y,width-margin*2,itemHeight,6,6,'F');
    doc.setFillColor(...ORANGE).roundedRect(margin+11,y+8,4,Math.max(14,itemHeight-16),2,2,'F');
    doc.setTextColor(...INK).setFont('helvetica','bold').setFontSize(11).text(nameLines,margin+27,y+18,{lineHeightFactor:1.18});
    if(roleLines.length)doc.setTextColor(...MUTED).setFont('helvetica','normal').setFontSize(9).text(roleLines,margin+27,y+21+nameLines.length*13,{lineHeightFactor:1.15});
    y+=itemHeight+4;
  });
  drawFooter();
  return doc;
}

export async function exportRosterPdf(payload){
  const JsPdf=await loadJsPdf(),doc=new JsPdf({unit:'pt',format:'a4',orientation:'portrait'});
  buildRosterPdf(doc,payload);
  const blob=doc.output('blob'),filename=safeFilename(payload?.game);
  const delivery=await deliverRosterPdf(blob,filename);
  return {blob,filename,delivery};
}
