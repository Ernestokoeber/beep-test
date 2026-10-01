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
    const script=document.createElement('script');script.src='https://cdn.jsdelivr.net/npm/jspdf@2.5.2/dist/jspdf.umd.min.js';
    script.onload=()=>window.jspdf?.jsPDF?resolve(window.jspdf.jsPDF):reject(Error('PDF-Modul konnte nicht gestartet werden.'));
    script.onerror=()=>{jsPdfPromise=null;reject(Error('PDF-Modul konnte nicht geladen werden. Bitte Internetverbindung prüfen.'));};
    document.head.append(script);
  });
  return jsPdfPromise;
}
function safeFilename(game){
  const opponent=String(game?.away||game?.home||'spiel').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'');
  return `courthub-kader-${game?.date||'spiel'}-${opponent||'spiel'}.pdf`;
}
function download(blob,filename){const url=URL.createObjectURL(blob),link=document.createElement('a');link.href=url;link.download=filename;link.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}
async function shareOrDownload(blob,filename){
  if(typeof File==='function'&&navigator.share){
    const file=new File([blob],filename,{type:'application/pdf'});
    if(!navigator.canShare||navigator.canShare({files:[file]})){try{await navigator.share({title:'CourtHub Spielkader',files:[file]});return;}catch(error){if(error?.name==='AbortError')return;}}
  }
  download(blob,filename);
}

export function buildRosterPdf(doc,{game={},draft={}}={}){
  const roster=nominatedPlayers(draft);
  if(!roster.length)throw Error('Für den PDF-Export ist noch kein Spieler nominiert.');
  const width=doc.internal.pageSize.getWidth(),height=doc.internal.pageSize.getHeight(),margin=42,rowHeight=34;
  let page=1,y=0;
  const drawHeader=continued=>{
    doc.setFillColor(...GREEN).rect(0,0,width,118,'F');
    doc.setFillColor(...ORANGE).rect(margin,92,126,5,'F');
    doc.setTextColor(255,255,255).setFont('helvetica','bold').setFontSize(12).text('TSV LINDAU BASKETBALL',margin,38);
    doc.setFontSize(27).text(continued?'Spielkader - Fortsetzung':'Spielkader',margin,73);
    doc.setTextColor(...INK).setFillColor(...PAPER).setDrawColor(...LINE).roundedRect(margin,142,width-margin*2,72,10,10,'FD');
    doc.setFont('helvetica','bold').setFontSize(16).text(`${game.home||'Heim'} - ${game.away||'Gast'}`,margin+18,169);
    const meta=[formatDate(game.date),game.time?`${game.time} Uhr`:null,draft.ownSide==='home'?'Heimspiel':draft.ownSide==='away'?'Auswärtsspiel':null].filter(Boolean).join('  |  ');
    doc.setFont('helvetica','normal').setFontSize(10).setTextColor(...MUTED).text(meta,margin+18,192);
    doc.setTextColor(...INK).setFont('helvetica','bold').setFontSize(17).text('Nominierter Kader',margin,254);
    doc.setFont('helvetica','normal').setFontSize(10).setTextColor(...MUTED).text(`${roster.length} ${roster.length===1?'Spieler':'Spieler'}`,width-margin,254,{align:'right'});
    y=278;
  };
  const drawFooter=()=>{
    doc.setDrawColor(...LINE).line(margin,height-45,width-margin,height-45);
    doc.setTextColor(...MUTED).setFont('helvetica','normal').setFontSize(8).text('Erstellt mit CourtHub',margin,height-27);
    doc.text(`Seite ${page}`,width-margin,height-27,{align:'right'});
  };
  drawHeader(false);
  roster.forEach((player,index)=>{
    if(y+rowHeight>height-66){drawFooter();doc.addPage();page++;drawHeader(true);}
    doc.setFillColor(index%2?255:247,index%2?255:249,index%2?255:247).roundedRect(margin,y-17,width-margin*2,rowHeight-3,6,6,'F');
    doc.setFillColor(...ORANGE).roundedRect(margin+11,y-9,4,18,2,2,'F');
    doc.setTextColor(...INK).setFont('helvetica','bold').setFontSize(11).text(String(player.name||'Spieler'),margin+27,y);
    if(player.role)doc.setTextColor(...MUTED).setFont('helvetica','normal').setFontSize(9).text(String(player.role),width-margin-12,y,{align:'right'});
    y+=rowHeight;
  });
  drawFooter();
  return doc;
}

export async function exportRosterPdf(payload){
  const JsPdf=await loadJsPdf(),doc=new JsPdf({unit:'pt',format:'a4',orientation:'portrait'});
  buildRosterPdf(doc,payload);
  const blob=doc.output('blob'),filename=safeFilename(payload?.game);
  await shareOrDownload(blob,filename);
  return {blob,filename};
}
