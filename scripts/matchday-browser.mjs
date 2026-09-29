import http from 'node:http';
import {readFile} from 'node:fs/promises';
import {resolve,extname,sep} from 'node:path';
import {fileURLToPath} from 'node:url';
const root=fileURLToPath(new URL('../',import.meta.url));
const html=`<!doctype html><html lang="de"><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><link rel="stylesheet" href="/live-game.css"><link rel="stylesheet" href="/matchday.css"><title>Spieltag – lokale Abnahme</title><style>body{margin:0;background:#eee;font-family:Arial,sans-serif}#fixture{max-width:390px;margin:auto;background:white}nav{display:flex;flex-wrap:wrap;gap:6px;padding:8px}button{min-height:48px}#evidence{display:block;padding:8px;font-size:12px;overflow-wrap:anywhere}</style><div id="fixture"><nav><button id="advance">Viertel ablaufen lassen</button><button id="reload">Neu laden</button><button id="online">Sync bestätigen</button><button id="reset">Neues Testspiel</button><button id="sw">Offline bereitstellen</button></nav><output id="evidence"></output><main></main></div><script type="module" src="/scripts/matchday-browser-fixture.mjs"></script></html>`;
http.createServer(async(req,res)=>{const url=new URL(req.url,'http://localhost');if(url.pathname==='/matchday-test'){res.setHeader('Content-Type','text/html; charset=utf-8');res.end(html);return;}
 const path=resolve(root,url.pathname==='/'?'index.html':'.'+decodeURIComponent(url.pathname));if(!path.startsWith(root.endsWith(sep)?root:root+sep)){res.writeHead(403).end();return;}
 try{const data=await readFile(path);res.setHeader('Content-Type',({'.mjs':'text/javascript','.js':'text/javascript','.css':'text/css','.html':'text/html'})[extname(path)]||'application/octet-stream');res.end(data);}catch{res.writeHead(404).end();}
}).listen(4180,'127.0.0.1',()=>console.log('Synthetic matchday test: http://127.0.0.1:4180/matchday-test?width=320'));
