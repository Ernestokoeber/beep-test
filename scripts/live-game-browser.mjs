import http from 'node:http';
import {readFile} from 'node:fs/promises';
import {resolve,extname,sep} from 'node:path';
import {fileURLToPath} from 'node:url';
const root=fileURLToPath(new URL('../',import.meta.url));
const html=`<!doctype html><html lang="de"><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><link rel="stylesheet" href="/live-game.css"><title>Lokale Live-Abnahme</title><style>body{margin:0;font-family:Arial,sans-serif;background:#eee}#fixture{max-width:390px;margin:auto;background:white}nav{display:flex;flex-wrap:wrap;gap:4px;padding:8px}nav button{min-height:44px}#evidence{font-size:12px;overflow-wrap:anywhere;padding:8px}</style><div id="fixture"><nav><button id="advance">120 Sekunden spielen</button><button id="advance60">60 Sekunden spielen</button><button id="reload">Neu laden</button><button id="online">Online quittieren</button><button id="report">Bericht</button><button id="reset">Testdaten neu beginnen</button></nav><output id="evidence"></output><main></main><section id="report-host"></section></div><script type="module" src="/scripts/live-game-browser-fixture.mjs"></script></html>`;
const server=http.createServer(async(req,res)=>{
  const url=new URL(req.url,'http://localhost');
  if(url.pathname==='/live-test'){res.setHeader('Content-Type','text/html; charset=utf-8');res.end(html);return;}
  const path=resolve(root,url.pathname==='/'?'index.html':'.'+decodeURIComponent(url.pathname));
  if(!path.startsWith(root.endsWith(sep)?root:root+sep)){res.writeHead(403).end();return;}
  try{const data=await readFile(path);res.setHeader('Content-Type',({'.mjs':'text/javascript','.js':'text/javascript','.css':'text/css','.html':'text/html','.woff2':'font/woff2'})[extname(path)]||'application/octet-stream');res.end(data);}catch{res.writeHead(404).end();}
});
server.listen(4179,'127.0.0.1',()=>console.log('Synthetic live test only: http://127.0.0.1:4179/live-test?width=320'));
