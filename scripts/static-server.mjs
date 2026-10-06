// Local/CI preview with HTTP byte ranges, required for native video seeking.
import {createServer} from 'node:http';
import {createReadStream} from 'node:fs';
import {stat} from 'node:fs/promises';
import {resolve,sep,extname} from 'node:path';
const root=resolve('.'),port=Number(process.env.PORT||4173);
const types={'.html':'text/html','.js':'text/javascript','.css':'text/css','.json':'application/json','.svg':'image/svg+xml','.png':'image/png','.jpg':'image/jpeg','.mp4':'video/mp4','.glb':'model/gltf-binary','.woff2':'font/woff2','.webmanifest':'application/manifest+json'};
createServer(async(req,res)=>{
 try{
  let path=resolve(root,'.'+decodeURIComponent(new URL(req.url,'http://localhost').pathname));
  if(path!==root&&!path.startsWith(root+sep)){res.writeHead(403).end();return;}
  let info=await stat(path);if(info.isDirectory()){path=resolve(path,'index.html');info=await stat(path);}
  let start=0,end=info.size-1,status=200;
  if(req.headers.range){
   const match=/^bytes=(\d*)-(\d*)$/.exec(req.headers.range);
   if(!match){res.writeHead(416,{'Content-Range':`bytes */${info.size}`}).end();return;}
   if(match[1]){start=Number(match[1]);if(match[2])end=Math.min(end,Number(match[2]));}
   else if(match[2])start=Math.max(0,info.size-Number(match[2]));
   if(start>end||start>=info.size){res.writeHead(416,{'Content-Range':`bytes */${info.size}`}).end();return;}status=206;
  }
  const headers={'Content-Type':types[extname(path)]||'application/octet-stream','Content-Length':end-start+1,'Accept-Ranges':'bytes','Cache-Control':'no-cache'};
  if(status===206)headers['Content-Range']=`bytes ${start}-${end}/${info.size}`;
  res.writeHead(status,headers);if(req.method==='HEAD')res.end();else createReadStream(path,{start,end}).pipe(res);
 }catch{res.writeHead(404).end();}
}).listen(port,'127.0.0.1',()=>console.log(`Courthub preview: http://127.0.0.1:${port}`));
