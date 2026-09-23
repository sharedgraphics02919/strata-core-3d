import { mesh } from './geometry.js';
const observers=[];
export function disposeViewers(){observers.splice(0).forEach(o=>o.disconnect());}
export function renderViewers(){
 document.querySelectorAll('canvas[data-model]').forEach(canvas=>{
  let angle=-.65,tilt=.33,zoom=1,drag=false,last=0;
  const faces=mesh(canvas.dataset.model),context=canvas.getContext('2d');
  const interactive=canvas.hasAttribute('data-interactive');
  function draw(){
   const rect=canvas.getBoundingClientRect();if(!rect.width)return;const dpr=Math.min(devicePixelRatio,2);canvas.width=rect.width*dpr;canvas.height=rect.height*dpr;context.scale(dpr,dpr);const w=rect.width,h=rect.height;
   context.clearRect(0,0,w,h);const scale=Math.min(w/4,h/3.3)*zoom;
   const project=([x,y,z])=>{const rx=x*Math.cos(angle)+z*Math.sin(angle),rz=-x*Math.sin(angle)+z*Math.cos(angle);return [w/2+rx*scale,h*.72-((y-.1)*Math.cos(tilt)-rz*Math.sin(tilt))*scale,rz*Math.cos(tilt)+(y-.1)*Math.sin(tilt)];};
   context.strokeStyle='#ffffff09';context.lineWidth=1;for(let i=-5;i<=5;i++){for(const vs of [[[i*.5,0,-2.5],[i*.5,0,2.5]],[[-2.5,0,i*.5],[2.5,0,i*.5]]]){context.beginPath();vs.map(project).forEach((p,n)=>n?context.lineTo(p[0],p[1]):context.moveTo(p[0],p[1]));context.stroke();}}
   const shadow=context.createRadialGradient(w/2,h*.73,0,w/2,h*.73,scale*1.6);shadow.addColorStop(0,'#0009');shadow.addColorStop(1,'#0000');context.fillStyle=shadow;context.fillRect(0,h*.55,w,h*.4);
   const sorted=faces.map(f=>({...f,p:f.v.map(project)})).sort((a,b)=>b.p.reduce((s,v)=>s+v[2],0)/b.p.length-a.p.reduce((s,v)=>s+v[2],0)/a.p.length);
   for(const f of sorted){context.beginPath();f.p.forEach((p,i)=>i?context.lineTo(p[0],p[1]):context.moveTo(p[0],p[1]));context.closePath();const [a,b,c]=f.v;const u=b.map((n,i)=>n-a[i]),v=c.map((n,i)=>n-a[i]),normal=[u[1]*v[2]-u[2]*v[1],u[2]*v[0]-u[0]*v[2],u[0]*v[1]-u[1]*v[0]];const len=Math.hypot(...normal)||1,light=.6+.4*Math.abs((normal[0]*.3+normal[1]*.8+normal[2]*.5)/len);const rgb=f.color.match(/[a-f\d]{2}/gi).map(v=>Math.round(parseInt(v,16)*light));context.fillStyle=`rgb(${rgb})`;context.fill();context.strokeStyle=canvas.dataset.wire==='true'?'#a3d5be99':'#00000010';context.lineWidth=.65;context.stroke();}
  }
  const observer=new ResizeObserver(draw);observer.observe(canvas);observers.push(observer);draw();
  if(interactive){canvas.tabIndex=0;canvas.setAttribute('aria-label','3D preview. Drag or use arrow keys to rotate. Use plus and minus to zoom.');canvas.addEventListener('pointerdown',e=>{drag=true;last=e.clientX;canvas.setPointerCapture(e.pointerId);});canvas.addEventListener('pointermove',e=>{if(drag){angle+=(e.clientX-last)*.01;last=e.clientX;draw();}});canvas.addEventListener('pointerup',()=>drag=false);canvas.addEventListener('pointercancel',()=>drag=false);canvas.addEventListener('keydown',e=>{if(['ArrowLeft','ArrowRight','+','-'].includes(e.key)){e.preventDefault();if(e.key==='ArrowLeft')angle-=.15;if(e.key==='ArrowRight')angle+=.15;if(e.key==='+')zoom=Math.min(1.5,zoom+.1);if(e.key==='-')zoom=Math.max(.6,zoom-.1);draw();}});canvas.addEventListener('wire',()=>{canvas.dataset.wire=canvas.dataset.wire==='true'?'false':'true';draw();});}
 });
}
