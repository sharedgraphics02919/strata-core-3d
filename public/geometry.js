// Original low-poly sample meshes. Shared by the OBJ seed generator and live previews.
export function mesh(kind) {
 const faces=[];
 function box(x,y,z,w,h,d,color='#9aa4a7') {
  const v=[[x-w/2,y,z-d/2],[x+w/2,y,z-d/2],[x+w/2,y+h,z-d/2],[x-w/2,y+h,z-d/2],[x-w/2,y,z+d/2],[x+w/2,y,z+d/2],[x+w/2,y+h,z+d/2],[x-w/2,y+h,z+d/2]];
  for(const f of [[0,1,2,3],[4,7,6,5],[0,4,5,1],[3,2,6,7],[0,3,7,4],[1,5,6,2]]) faces.push({v:f.map(i=>v[i]),color});
 }
 function cone(x,y,z,r,h,color,n=10) {
  for(let i=0;i<n;i++){const a=i/n*Math.PI*2,b=(i+1)/n*Math.PI*2; faces.push({v:[[x+Math.cos(a)*r,y,z+Math.sin(a)*r],[x,y+h,z],[x+Math.cos(b)*r,y,z+Math.sin(b)*r]],color});}
 }
 function wheel(x,y,z,r=.34,depth=.22){for(let i=0;i<16;i++){const a=i/16*Math.PI*2,b=(i+1)/16*Math.PI*2;const v=[[x+Math.cos(a)*r,y+Math.sin(a)*r,z-depth/2],[x+Math.cos(b)*r,y+Math.sin(b)*r,z-depth/2],[x+Math.cos(b)*r,y+Math.sin(b)*r,z+depth/2],[x+Math.cos(a)*r,y+Math.sin(a)*r,z+depth/2]];faces.push({v,color:i%2?'#262c30':'#353c42'});faces.push({v:[[x,y,z+depth/2],v[3],v[2]],color:'#67717a'});faces.push({v:[[x,y,z-depth/2],v[1],v[0]],color:'#67717a'});}}
 if(kind==='car'||kind==='rover'){box(0,.4,0,2.7,.35,1.15,'#667782');box(.15,.75,0,1.25,.48,1,'#a6b2b8');box(.12,.83,-.505,1,.32,.02,'#243d49');box(.12,.83,.505,1,.32,.02,'#243d49');box(-1.36,.52,0,.03,.11,.8,'#e9eee6');for(const x of [-.86,.9])for(const z of [-.62,.62])wheel(x,.4,z);if(kind==='rover'){box(0,1.23,0,1.6,.1,1.18,'#c0b6a0');for(const z of [-.65,.65])wheel(0,.4,z);box(.7,1.32,0,.16,.35,.2,'#eab079');}}
 else if(kind==='chair'){box(0,.9,0,1,.18,.95,'#ad9472');box(0,1.05,.4,1,1,.16,'#ad9472');for(const x of [-.38,.38])for(const z of [-.33,.33])box(x,0,z,.09,.9,.09,'#343e43');for(const x of [-.58,.58]){box(x,.95,0,.07,.5,.07,'#343e43');box(x,1.42,0,.13,.07,.9,'#343e43');}}
 else if(kind==='building'){box(0,0,0,1.5,2.6,1.15,'#aa9d8c');for(let y=.3;y<2.5;y+=.55)for(const x of [-.48,0,.48]){box(x,y,-.59,.28,.35,.03,'#34434c');box(.77,y,x,.03,.35,.28,'#34434c');}for(let y=.15;y<2.8;y+=.55)box(0,y,0,1.62,.07,1.27,'#d5c9b6');box(0,2.7,0,1.65,.1,1.3,'#6d7778');}
 else if(kind==='tree'){box(0,0,0,.18,1.6,.18,'#82735c');cone(0,.5,0,.9,1.6,'#697e66');cone(0,1.1,0,.73,1.4,'#809276');cone(0,1.7,0,.48,1,'#95a788');}
 else if(kind==='robot'){box(0,.85,0,.95,.9,.5,'#b8b9ad');box(0,1.84,0,.65,.5,.6,'#c9c9ba');box(0,2,-.31,.5,.13,.02,'#699ba8');for(const x of [-.72,.72]){box(x,.65,0,.28,1,.35,'#848e8e');box(x,.55,-.05,.33,.24,.4,'#424e54');}for(const x of [-.28,.28]){box(x,.12,0,.3,.73,.35,'#748187');box(x,0,-.1,.4,.15,.6,'#424e54');}}
 else if(kind==='lamp'){box(0,0,0,.6,.1,.6,'#8d979b');box(0,.1,0,.045,1.9,.045,'#b5bfc1');cone(0,1.8,0,.6,.45,'#cfba95');}
 else if(kind==='crate'){box(0,0,0,1.6,1.3,1.2,'#788584');for(const x of [-.63,.63])box(x,0,0,.12,1.35,1.24,'#b1b29e');for(const y of [.1,1.1])box(0,y,-.63,1.6,.12,.08,'#bbc0ae');box(0,.5,-.65,.35,.2,.03,'#d79b64');}
 else {box(0,0,0,1,1,1);}
 return faces;
}
export function toOBJ(kind){let index=1;return '# Strata-Core original sample mesh — CC0\n'+mesh(kind).map(f=>{const s=f.v.map(v=>'v '+v.join(' ')).join('\n')+'\nf '+f.v.map((_,i)=>index+i).join(' ');index+=f.v.length;return s;}).join('\n');}
