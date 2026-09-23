import http from 'node:http';
import { randomBytes, randomUUID, scrypt as scryptCallback, timingSafeEqual, createHash } from 'node:crypto';
import { promisify } from 'node:util';
import { readFile, writeFile, unlink } from 'node:fs/promises';
import { createReadStream } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { join, extname, resolve } from 'node:path';
import { one, many, run, transaction, dataDir } from './db.mjs';
import { seed } from './seed.mjs';

seed();
const scrypt=promisify(scryptCallback);
const publicDir=fileURLToPath(new URL('../public/',import.meta.url));
const production=process.env.NODE_ENV==='production';
const demo=process.env.DEMO_CHECKOUT==='true' && !production;
const port=Number(process.env.PORT||3000), host=process.env.HOST||'127.0.0.1';
const origin=process.env.APP_ORIGIN||`http://localhost:${port}`;
const categories=['Architecture','Vehicles','Furniture','Characters','Nature','Sci-Fi','Props','Industrial','Electronics','Animals'];
const extensions=['.obj','.fbx','.blend','.glb','.gltf','.stl','.max','.ma','.mb','.c4d','.skp','.usd','.usdz'];
const hash=v=>createHash('sha256').update(v).digest('hex');
const safeUser=u=>u?{id:u.id,name:u.name,email:u.email,role:u.role,store_name:u.store_name,bio:u.bio}:null;
const fail=(message,status=400)=>{throw Object.assign(new Error(message),{status});};
const json=(res,data,status=200)=>{res.writeHead(status,{'Content-Type':'application/json'});res.end(JSON.stringify(data));};
const productSQL='SELECT p.*, u.store_name, u.name AS vendor_name FROM products p JOIN users u ON u.id=p.vendor_id';
function user(req){const token=(req.headers.cookie||'').split(';').map(v=>v.trim()).find(v=>v.startsWith('session='))?.slice(8);return token?one('SELECT u.* FROM sessions s JOIN users u ON u.id=s.user_id WHERE s.token=? AND s.expires>?',hash(token),Date.now()):null;}
function requireUser(req,role){const u=user(req);if(!u)fail('Please sign in to continue.',401);if(role && u.role!==role && u.role!=='admin')fail('You do not have access to this area.',403);return u;}
async function body(req,max=65536){let length=0;const chunks=[];for await(const chunk of req){length+=chunk.length;if(length>max)fail('File or request exceeds the size limit.',413);chunks.push(chunk);}return Buffer.concat(chunks);}
async function payload(req){try{return JSON.parse((await body(req)).toString());}catch(e){if(e.status)throw e;fail('Invalid JSON.');}}
function str(v,label,min=1,max=200){if(typeof v!=='string'||v.trim().length<min||v.trim().length>max)fail(`${label} must be ${min}–${max} characters.`);return v.trim();}
function session(res,id){const token=randomBytes(32).toString('hex');run('DELETE FROM sessions WHERE expires<?',Date.now());run('INSERT INTO sessions VALUES(?,?,?)',hash(token),id,Date.now()+7*86400000);res.setHeader('Set-Cookie',`session=${token}; HttpOnly; SameSite=Lax; Path=/; Max-Age=604800${production?'; Secure':''}`);}
const attempts=new Map();
function rateLimit(req){const key=req.socket.remoteAddress;const now=Date.now();let v=attempts.get(key);if(!v||now-v.start>900000){v={start:now,count:0};attempts.set(key,v);}if(++v.count>30)fail('Too many sign-in attempts. Try again in 15 minutes.',429);}
setInterval(()=>{for(const [k,v]of attempts)if(Date.now()-v.start>900000)attempts.delete(k);},900000).unref();
function getProduct(id,u){const p=one(productSQL+' WHERE p.id=?',id);if(!p||p.status!=='published'&&u?.id!==p.vendor_id&&u?.role!=='admin')fail('Model not found.',404);return p;}
function owned(uid,pid){return one('SELECT 1 FROM order_items i JOIN orders o ON o.id=i.order_id WHERE o.user_id=? AND i.product_id=?',uid,pid);}

export const server=http.createServer(async(req,res)=>{
 try{
  res.setHeader('X-Content-Type-Options','nosniff');res.setHeader('Referrer-Policy','same-origin');res.setHeader('X-Frame-Options','DENY');res.setHeader('Cache-Control','no-store');
  res.setHeader('Content-Security-Policy',"default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' blob:; connect-src 'self'; object-src 'none'; base-uri 'self'; frame-ancestors 'none'; form-action 'self'");
  const url=new URL(req.url,origin),path=url.pathname,method=req.method,u=user(req);
  if(!['GET','HEAD'].includes(method) && (req.headers.origin!==origin || req.headers['sec-fetch-site']==='cross-site'))fail('Request origin rejected.',403);
  if(path==='/api/session'&&method==='GET')return json(res,{user:safeUser(u),demo,categories});
  if(['/api/register','/api/login'].includes(path)&&method==='POST'){
   rateLimit(req);const b=await payload(req),email=str(b.email,'Email',3,254).toLowerCase(),password=str(b.password,'Password',12,128);
   if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))fail('Enter a valid email address.');
   let account;
   if(path==='/api/register'){
    const name=str(b.name,'Name',2,80),role=b.role==='vendor'?'vendor':'buyer';
    if(one('SELECT id FROM users WHERE email=?',email))fail('An account with that email already exists.',409);
    const salt=randomBytes(16).toString('hex'),key=await scrypt(password,salt,64);const id=randomUUID();
    try{run('INSERT INTO users(id,name,email,password,role,store_name) VALUES(?,?,?,?,?,?)',id,name,email,`${salt}:${key.toString('hex')}`,role,role==='vendor'?name+' Studio':'');}catch(e){if(e.code?.includes('SQLITE'))fail('An account with that email already exists.',409);throw e;}
    account=one('SELECT * FROM users WHERE id=?',id);
   }else{
    account=one('SELECT * FROM users WHERE email=?',email);const [salt,key]=(account?.password||'').split(':');
    const actual=await scrypt(password,salt||'dummy-salt-for-unknown-account',64);
    if(!key||key.length!==128||!timingSafeEqual(actual,Buffer.from(key,'hex')))fail('Email or password is incorrect.',401);
   }
   session(res,account.id);return json(res,{user:safeUser(account)});
  }
  if(path==='/api/logout'&&method==='POST'){const token=(req.headers.cookie||'').match(/(?:^|;\s*)session=([^;]+)/)?.[1];if(token)run('DELETE FROM sessions WHERE token=?',hash(token));res.setHeader('Set-Cookie','session=; HttpOnly; SameSite=Lax; Path=/; Max-Age=0');return json(res,{ok:true});}
  if(path==='/api/products'&&method==='GET'){
   let sql=productSQL+" WHERE p.status='published'",args=[];
   if(url.searchParams.get('q')){sql+=' AND (p.title LIKE ? OR p.description LIKE ?)';args.push('%'+url.searchParams.get('q')+'%','%'+url.searchParams.get('q')+'%');}
   for(const key of ['category','format','vendor_id'])if(url.searchParams.get(key)){sql+=` AND p.${key}=?`;args.push(url.searchParams.get(key));}
   if(url.searchParams.get('free')==='true')sql+=' AND p.price=0';
   if(url.searchParams.get('rigged')==='true')sql+=' AND p.rigged=1';
   const sort={'price-asc':'p.price ASC','price-desc':'p.price DESC',newest:'p.created_at DESC'}[url.searchParams.get('sort')]||"CASE WHEN p.preview_kind='rover' THEN 0 ELSE 1 END,p.created_at DESC";
   return json(res,many(sql+' ORDER BY '+sort+' LIMIT 200',...args));
  }
  if(path.startsWith('/api/products/')&&method==='GET')return json(res,getProduct(path.split('/')[3],u));
  if(path.startsWith('/api/stores/')&&method==='GET'){const id=path.split('/')[3],v=one("SELECT id,name,store_name,bio FROM users WHERE id=? AND role IN ('vendor','admin')",id);if(!v)fail('Store not found.',404);return json(res,v);}
  if(path==='/api/store'&&method==='PATCH'){const v=requireUser(req,'vendor'),b=await payload(req);run('UPDATE users SET store_name=?,bio=? WHERE id=?',str(b.store_name,'Store name',2,80),str(b.bio||'','Bio',0,1600),v.id);return json(res,{ok:true});}
  if(path==='/api/become-vendor'&&method==='POST'){const v=requireUser(req);if(v.role==='buyer')run("UPDATE users SET role='vendor',store_name=? WHERE id=?",v.name+' Studio',v.id);return json(res,{user:safeUser(one('SELECT * FROM users WHERE id=?',v.id))});}
  if(path==='/api/upload'&&method==='POST'){
   const v=requireUser(req,'vendor');let name;try{name=decodeURIComponent(req.headers['x-file-name']||'');}catch{fail('Invalid filename.');}name=str(name,'Filename',1,180).replace(/[^a-zA-Z0-9._ -]/g,'_');const extension=extname(name).toLowerCase(),isImage=['.png','.jpg','.jpeg','.webp'].includes(extension);
   if(!extensions.includes(extension)&&!isImage)fail('Upload a supported 3D file, or a PNG, JPEG, or WebP preview.');
   const quota=one('SELECT COALESCE(SUM(size),0) AS used FROM files WHERE owner_id=?',v.id).used;if(quota>=1024*1024*1024)fail('Your starter storage limit is 1 GB.',413);
   const buffer=await body(req,isImage?5*1024*1024:100*1024*1024);if(!buffer.length)fail('The file is empty.');
   if(isImage){const valid=extension==='.png'?buffer.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10])):extension==='.webp'?buffer.toString('ascii',0,4)==='RIFF'&&buffer.toString('ascii',8,12)==='WEBP':buffer[0]===255&&buffer[1]===216&&buffer[2]===255;if(!valid)fail('This file is not a valid preview image.');}
   const id=randomUUID();await writeFile(join(dataDir,'files',id),buffer,{flag:'wx'});
   try{run('INSERT INTO files(id,owner_id,name,extension,size) VALUES(?,?,?,?,?)',id,v.id,name,extension,buffer.length);}catch(e){await unlink(join(dataDir,'files',id));throw e;}
   return json(res,{id,name,format:extension.slice(1).toUpperCase(),size:buffer.length},201);
  }
  if(path==='/api/vendor/products'&&method==='GET'){const v=requireUser(req,'vendor');return json(res,many(productSQL+' WHERE p.vendor_id=? ORDER BY p.created_at DESC',v.id));}
  if(path==='/api/vendor/products'&&method==='POST'){
   const v=requireUser(req,'vendor'),b=await payload(req),title=str(b.title,'Title',3,120),description=str(b.description,'Description',20,5000);
   if(!categories.includes(b.category))fail('Choose a category.');
   if(!Number.isInteger(b.price)||b.price<0||b.price>1000000)fail('Price must be between $0 and $10,000.');
   if(!Number.isInteger(b.polygons)||b.polygons<0||b.polygons>100000000)fail('Enter a valid polygon count.');
   const f=one('SELECT * FROM files WHERE id=? AND owner_id=?',b.file_id||'',v.id);if(!f||!extensions.includes(f.extension))fail('Upload your 3D model first.');
   if(b.image_id){const image=one('SELECT * FROM files WHERE id=? AND owner_id=?',b.image_id,v.id);if(!image||!['.png','.jpg','.jpeg','.webp'].includes(image.extension))fail('Invalid preview image.');}
   const id=randomUUID();run('INSERT INTO products(id,vendor_id,title,description,category,price,format,polygons,rigged,file_id,image_id) VALUES(?,?,?,?,?,?,?,?,?,?,?)',id,v.id,title,description,b.category,b.price,f.extension.slice(1).toUpperCase(),b.polygons,b.rigged?1:0,f.id,b.image_id||null);return json(res,{id},201);
  }
  if(path.startsWith('/api/vendor/products/')&&method==='PATCH'){const v=requireUser(req,'vendor'),id=path.split('/')[4],p=one('SELECT * FROM products WHERE id=? AND vendor_id=?',id,v.id);if(!p)fail('Model not found.',404);const b=await payload(req);if(b.status!=='archived')fail('Only archiving is supported here.');run("UPDATE products SET status='archived' WHERE id=?",id);return json(res,{ok:true});}
  if(path==='/api/vendor/orders'&&method==='GET'){const v=requireUser(req,'vendor');return json(res,many('SELECT o.id,o.created_at,o.mode,i.price,p.title,u.name AS buyer FROM order_items i JOIN orders o ON o.id=i.order_id JOIN products p ON p.id=i.product_id JOIN users u ON u.id=o.user_id WHERE p.vendor_id=? ORDER BY o.created_at DESC',v.id));}
  if(['/api/cart','/api/wishlist'].includes(path)){
   const v=requireUser(req),table=path.endsWith('cart')?'cart':'wishlist';
   if(method==='GET')return json(res,many(productSQL+` JOIN ${table} c ON c.product_id=p.id WHERE c.user_id=?`,v.id));
   const b=await payload(req);if(method==='POST'){getProduct(b.product_id,v);if(table==='cart'&&owned(v.id,b.product_id))fail('This model is already in your library.');run(`INSERT OR IGNORE INTO ${table}(user_id,product_id) VALUES(?,?)`,v.id,b.product_id);return json(res,{ok:true});}
   if(method==='DELETE'){run(`DELETE FROM ${table} WHERE user_id=? AND product_id=?`,v.id,b.product_id);return json(res,{ok:true});}
  }
  if(path==='/api/checkout'&&method==='POST'){
   const v=requireUser(req);
   const result=transaction(()=>{const items=many('SELECT p.* FROM cart c JOIN products p ON p.id=c.product_id WHERE c.user_id=?',v.id);if(!items.length)fail('Your cart is empty.');if(items.some(p=>p.status!=='published'))fail('A model in your cart is no longer available. Remove it to continue.');if(items.some(p=>owned(v.id,p.id)))fail('A model is already in your library. Remove it from the cart.');const total=items.reduce((a,p)=>a+p.price,0);if(total>0&&!demo)fail('Paid checkout is not connected yet. Free models can still be downloaded.',503);const id=randomUUID(),mode=total===0?'free':'demo';run('INSERT INTO orders(id,user_id,total,mode) VALUES(?,?,?,?)',id,v.id,total,mode);for(const p of items)run('INSERT INTO order_items VALUES(?,?,?)',id,p.id,p.price);run('DELETE FROM cart WHERE user_id=?',v.id);return{id,mode,total};});return json(res,result,201);
  }
  if(path==='/api/library'&&method==='GET'){const v=requireUser(req);return json(res,many(productSQL+' JOIN order_items i ON i.product_id=p.id JOIN orders o ON o.id=i.order_id WHERE o.user_id=? GROUP BY p.id ORDER BY p.created_at DESC',v.id));}
  if(path.startsWith('/api/download/')&&method==='GET'){
   const v=requireUser(req),id=path.split('/')[3],p=one('SELECT * FROM products WHERE id=?',id);if(!p||!(owned(v.id,id)||p.vendor_id===v.id||v.role==='admin'))fail('Purchase this model to download it.',403);
   const f=one('SELECT * FROM files WHERE id=?',p.file_id);res.writeHead(200,{'Content-Type':'application/octet-stream','Content-Disposition':`attachment; filename="${f.name.replace(/["\r\n]/g,'_')}"`,'Content-Length':f.size});const stream=createReadStream(join(dataDir,'files',f.id));stream.on('error',()=>res.destroy());return stream.pipe(res);
  }
  if(path.startsWith('/api/images/')&&method==='GET'){
   const id=path.split('/')[3],f=one('SELECT f.* FROM files f JOIN products p ON p.image_id=f.id WHERE f.id=? AND (p.status=\'published\' OR p.vendor_id=? OR ?=\'admin\')',id,u?.id||'',u?.role||'');if(!f||!['.png','.jpg','.jpeg','.webp'].includes(f.extension))fail('Image not found.',404);res.setHeader('Content-Type',f.extension==='.png'?'image/png':f.extension==='.webp'?'image/webp':'image/jpeg');return res.end(await readFile(join(dataDir,'files',f.id)));
  }
  if(path==='/api/admin'&&method==='GET'){requireUser(req,'admin');return json(res,{products:many(productSQL+' ORDER BY p.created_at DESC'),users:many('SELECT id,name,email,role,created_at FROM users'),orders:many('SELECT o.*,u.name FROM orders o JOIN users u ON u.id=o.user_id ORDER BY o.created_at DESC')});}
  if(path.startsWith('/api/admin/products/')&&method==='PATCH'){requireUser(req,'admin');const b=await payload(req),id=path.split('/')[4];if(!['published','rejected','archived'].includes(b.status))fail('Invalid status.');if(!one('SELECT id FROM products WHERE id=?',id))fail('Model not found.',404);run('UPDATE products SET status=? WHERE id=?',b.status,id);return json(res,{ok:true});}
  if(path.startsWith('/api/'))fail('Endpoint not found.',404);
  if(!['GET','HEAD'].includes(method))fail('Method not allowed.',405);
  const knownAsset=/\.(css|js|svg|png|jpg|webp)$/i.test(path);
  const file=knownAsset?resolve(publicDir,'.'+decodeURIComponent(path)):join(publicDir,'index.html');
  if(!file.startsWith(publicDir))fail('Not found.',404);
  const data=await readFile(file).catch(()=>fail('Not found.',404));res.setHeader('Content-Type',({'.html':'text/html; charset=utf-8','.css':'text/css','.js':'text/javascript','.svg':'image/svg+xml','.png':'image/png','.jpg':'image/jpeg','.webp':'image/webp'})[extname(file)]||'application/octet-stream');res.end(method==='HEAD'?undefined:data);
 }catch(e){if(res.headersSent)return res.destroy();if(!e.status)console.error(e);json(res,{error:e.status?e.message:'Something went wrong. Please try again.'},e.status||500);}
});
server.requestTimeout=120000;
server.listen(port,host,()=>console.log(`Strata-Core 3D: ${origin}\nCheckout: ${demo?'DEMO — no money is charged':'free models only; paid checkout disabled'}`));
