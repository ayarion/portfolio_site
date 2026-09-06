// ビルド不要のローカル表示。node serve.cjs → http://127.0.0.1:8080/
const http=require('http'),fs=require('fs'),path=require('path');
const root=__dirname,mime={'.html':'text/html; charset=utf-8','.js':'application/javascript','.css':'text/css','.svg':'image/svg+xml','.png':'image/png','.jpg':'image/jpeg','.glb':'model/gltf-binary','.gz':'application/octet-stream'};
http.createServer((req,res)=>{
  let file;try{file=path.resolve(root,'.'+decodeURIComponent(new URL(req.url,'http://localhost').pathname));}catch(e){console.error('Invalid request',e);res.writeHead(400);return res.end();}
  if(file!==root&&!file.startsWith(root+path.sep)){res.writeHead(403);return res.end();}
  if(file===root)file=path.join(root,'index.html');
  fs.readFile(file,(err,data)=>{if(err){res.writeHead(404);return res.end('Not found');}res.setHeader('Content-Type',mime[path.extname(file)]||'application/octet-stream');res.end(data);});
}).listen(8080,'127.0.0.1',()=>console.log('http://127.0.0.1:8080/'));
