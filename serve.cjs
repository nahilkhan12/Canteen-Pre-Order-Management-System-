// Optional preview server. Website source is plain HTML, CSS and JavaScript.
const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const root = __dirname;
const port = Number(process.env.PORT || 4186);
const types = {'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.svg':'image/svg+xml'};
const server = http.createServer((req,res) => {
  let pathname;
  try {pathname=decodeURIComponent(new URL(req.url,'http://localhost').pathname);}catch{res.writeHead(400);res.end('Invalid address');return;}
  const file=path.resolve(root,'.'+(pathname==='/'?'/login.html':pathname));
  if(!file.startsWith(root+path.sep)||!types[path.extname(file)]){res.writeHead(404);res.end('Not found');return;}
  fs.readFile(file,(error,data)=>{if(error){res.writeHead(404);res.end('Not found');return;}res.writeHead(200,{'Content-Type':types[path.extname(file)],'Cache-Control':'no-cache'});res.end(data);});
});
server.listen(port,'127.0.0.1',()=>console.log(`QuickBite preview: http://127.0.0.1:${port}/login.html`));
