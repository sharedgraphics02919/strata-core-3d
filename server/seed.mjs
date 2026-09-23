import { writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { db, one, run, dataDir, transaction } from './db.mjs';
import { toOBJ, mesh } from '../public/geometry.js';
export function seed(){
 if(one('SELECT id FROM users WHERE id=?','sample-studio'))return;
 transaction(()=>{
 run('INSERT INTO users(id,name,email,password,role,store_name,bio) VALUES(?,?,?,?,?,?,?)','sample-studio','Strata Studio','samples@strata.invalid','disabled','vendor','Strata Studio','Original low-poly sample models included with the Strata-Core starter. All sample meshes are CC0. Explore, download, and make them your own.');
 const items=[['rover','Atlas • Lunar Rover','Sci-Fi',4900],['chair','Forma Lounge Chair','Furniture',1900],['building','Cornerstone Building','Architecture',3900],['car','Apex Touring Coupe','Vehicles',2900],['robot','Companion Android','Characters',2400],['tree','Alpine Evergreen','Nature',0],['crate','Expedition Cargo Crate','Props',1200],['lamp','Arc Studio Lamp','Furniture',0]];
 for(const [kind,title,category,price] of items){const id='sample-'+kind,contents=toOBJ(kind);writeFileSync(join(dataDir,'files',id),contents);run('INSERT INTO files(id,owner_id,name,extension,size) VALUES(?,?,?,?,?)',id,'sample-studio',kind+'.obj','.obj',Buffer.byteLength(contents));run('INSERT INTO products(id,vendor_id,title,description,category,price,format,polygons,file_id,preview_kind,status) VALUES(?,?,?,?,?,?,?,?,?,?,?)',id,'sample-studio',title,'An original low-poly '+title.toLowerCase()+' mesh. This starter sample includes an untextured OBJ file, ready to explore in your favorite 3D application. The interactive preview displays the included geometry. Sample mesh license: CC0. Prices are illustrative; demo checkout does not charge money.',category,price,'OBJ',mesh(kind).length,id,kind,'published');}
 });
}
