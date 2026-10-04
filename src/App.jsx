import {useRef,useState,useMemo,useEffect,useLayoutEffect} from 'react'
import {Canvas,useFrame,useThree,createPortal} from '@react-three/fiber'
import {PointerLockControls,Sky,Text,Billboard} from '@react-three/drei'
import * as THREE from 'three'
import gsap from 'gsap'
import {PROJECTS,SKILLS,EXPERIENCE,CONTACT,ABOUT} from './data.js'
import {sfx} from './sfx.js'

const FONT='https://cdn.jsdelivr.net/fontsource/fonts/poppins@latest/latin-700-normal.woff'
const T=p=><Text font={FONT} {...p}/>
/* ---------- textures / materials ---------- */
function tex(base,noise,top=0){
 const c=document.createElement('canvas');c.width=c.height=16;const g=c.getContext('2d')
 for(let x=0;x<16;x++)for(let y=0;y<16;y++){const v=(Math.random()-.5)*noise,b=y<top?[80,150,55]:base
  g.fillStyle=`rgb(${b[0]+v|0},${b[1]+v|0},${b[2]+v|0})`;g.fillRect(x,y,1,1)}
 const t=new THREE.CanvasTexture(c);t.magFilter=t.minFilter=THREE.NearestFilter;t.colorSpace=THREE.SRGBColorSpace;return t}
const L=t=>new THREE.MeshLambertMaterial({map:t}),M=(c,n=30)=>L(tex(c,n))
const dirt=M([120,85,55],40),side=L(tex([120,85,55],40,4)),gm=c=>[side,side,M(c,45),dirt,side,side]
const MATS={grass:gm([85,155,60]),moss:gm([45,115,50]),dirt,stone:M([125,125,125],45),planks:M([175,135,80]),brick:M([150,70,60],40),
 log:M([100,75,45],35),leaves:M([40,120,40],60),blossom:M([240,150,190],30),path:M([165,150,110],35),gold:M([240,200,60],40),sand:M([225,210,150],20),
 lapis:M([40,70,170],30),obsidian:M([35,22,55],15),quartz:M([235,235,228],10)}
const BOX=new THREE.BoxGeometry(1,1,1),TYPES=Object.keys(MATS),CAP={grass:30000,moss:30000,dirt:20000,stone:20000,leaves:16000}
const ORDER=['dirt','stone','planks','log','leaves','brick','path','bow']
const COL={dirt:'#785537',stone:'#7d7d7d',planks:'#af8750',log:'#644b2d',leaves:'#32792a',brick:'#96463c',path:'#a59670'}
const HARD={grass:.5,moss:.5,dirt:.4,stone:1.2,planks:.8,log:.9,leaves:.2,blossom:.2,brick:1.2,path:.4,sand:.3}
const DROP={grass:'dirt',moss:'dirt',sand:'path',blossom:'leaves'}
const WATERMAT=new THREE.MeshBasicMaterial({color:'#1f6fe0',transparent:true,opacity:.8,depthWrite:false})

/* ---------- jungle terrain (long map: 100 wide x 260 long) ---------- */
const RX=50,RZ=130,NX=RX*2,NZ=RZ*2,GZ=100
const K=(x,y,z)=>x+','+y+','+z,W=new Map(),FIXED=new Set(),GONE=new Set(),WATER=new Set(),WCOLS=[]
const inb=(x,z)=>x>=-RX&&x<RX&&z>=-RZ&&z<RZ
const put=(x,y,z,t,f)=>{if(!inb(x,z))return;W.set(K(x,y,z),t);if(f)FIXED.add(K(x,y,z))}
const hs=(x,z)=>{const s=Math.sin(x*127.1+z*311.7)*43758.5453;return s-Math.floor(s)}
const vn=(x,z)=>{const xi=Math.floor(x),zi=Math.floor(z),xf=x-xi,zf=z-zi,u=xf*xf*(3-2*xf),v=zf*zf*(3-2*zf)
 const a=hs(xi,zi),b=hs(xi+1,zi),c=hs(xi,zi+1),d=hs(xi+1,zi+1);return a+(b-a)*u+(c-a)*v+(a-b-c+d)*u*v}
const RECTS=[[-9,9,-9,9],[-3,3,-84,86],[-12,0,-48,-42],[0,12,42,48],[-41,41,-129,-83],[-49,-11,-73,-17],[11,49,17,73]]
const dFlat=(x,z)=>Math.min(...RECTS.map(([a,b,c,d])=>Math.hypot(Math.max(a-x,0,x-b),Math.max(c-z,0,z-d))))
const HT=new Int8Array(NX*NZ),ht=(x,z)=>inb(x,z)?HT[(x+RX)*NZ+z+RZ]:0
for(let x=-RX;x<RX;x++)for(let z=-RZ;z<RZ;z++){
 let h=Math.round((vn(x/16,z/16)*.65+vn(x/6,z/6)*.35-.42)*16*Math.min(1,dFlat(x,z)/7))
 const dg=Math.hypot(x,z-GZ);if(dg<16){const t=Math.min(1,(16-dg)/7);h=Math.round(h*(1-t)+4*t)}
 const dl=Math.hypot(x-28,z-GZ-1);if(dl<9)h=dl<6?-2:-1
 HT[(x+RX)*NZ+z+RZ]=Math.max(-2,Math.min(9,h))}
const topType=(x,z,h)=>h<0?'sand':h>=7?'stone':vn(x/4+9,z/4)>.62?'moss':'grass'
const nat=(x,y,z)=>{const h=ht(x,z),d=h-1-y;return d===0?topType(x,z,h):h<0?'sand':d<=2?'dirt':'stone'}
for(let x=-RX;x<RX;x++)for(let z=-RZ;z<RZ;z++){const h=ht(x,z)
 if(h<0){WATER.add(x+','+z);WCOLS.push([x,z])}
 for(let y=Math.max(-3,Math.min(h-1,ht(x+1,z),ht(x-1,z),ht(x,z+1),ht(x,z-1)));y<=h-1;y++)put(x,y,z,nat(x,y,z),y===-3)}
function fillAround(x,y,z){for(const [a,b,c] of[[1,0,0],[-1,0,0],[0,1,0],[0,-1,0],[0,0,1],[0,0,-1]]){
 const X=x+a,Y=y+b,Z=z+c,k=K(X,Y,Z);if(Y<-3||!inb(X,Z)||Y>=ht(X,Z)||W.has(k)||GONE.has(k))continue;put(X,Y,Z,nat(X,Y,Z),Y===-3)}}

/* ---------- structures ---------- */
const LABELS=[],GATES=[],ZONES=[],SK=[],PAV=[]
const floor=(x0,x1,z0,z1,t,y=-1)=>{for(let x=x0;x<=x1;x++)for(let z=z0;z<=z1;z++)put(x,y,z,t)}
floor(-4,3,-4,3,'brick');floor(-1,1,-83,-5,'path');floor(-1,1,5,83,'path');floor(-11,-1,-46,-44,'path');floor(1,11,44,46,'path')
for(let z=84;z<=GZ-8;z++)for(let x=-1;x<=1;x++)put(x,ht(x,z)-1,z,'path')
function compound(x0,x1,z0,z1,side,c,text,wm,tm){
 for(let x=x0;x<=x1;x++)for(let z=z0;z<=z1;z++){
  if(!(x<x0+2||x>x1-2||z<z0+2||z>z1-2))continue
  const t=(side==='S'?x:z)-c,gate=side==='S'?z>=z1-1:side==='E'?x>=x1-1:x<=x0+1,at=Math.abs(t),door=gate&&at<=2
  for(let y=0;y<14;y++){if(door&&y<6)continue
   put(x,y,z,y===13?tm:gate&&at>=3&&at<=4&&y<10?tm:door&&y<10?'obsidian':wm,1)}}
 GATES.push(side==='S'?{text,pos:[c+.5,8,z1+1.05],rot:0}:side==='E'?{text,pos:[x1+1.05,8,c+.5],rot:Math.PI/2}:{text,pos:[x0-.05,8,c+.5],rot:-Math.PI/2})}
compound(-40,40,-128,-84,'S',0,'PROJECTS','stone','gold')
compound(-48,-12,-72,-18,'E',-45,'SKILLS','lapis','quartz')
compound(12,48,18,72,'W',45,'EXPERIENCE','brick','gold')
/* projects: one themed pavilion + big screen each */
const THEMES=[{w:'planks',f:'sand',t:'gold',c:'#ffd24a'},{w:'stone',f:'lapis',t:'quartz',c:'#6ee7ff'},{w:'brick',f:'obsidian',t:'gold',c:'#ff8a8a'}]
const PX=PROJECTS.map((_,i)=>Math.round((i-(PROJECTS.length-1)/2)*26)),ZB=-122
PROJECTS.forEach((p,i)=>{const cx=PX[i],th=THEMES[i%3]
 floor(cx-7,cx+7,ZB,ZB+12,th.f)
 for(let x=cx-7;x<=cx+7;x++)for(let y=0;y<=8;y++)put(x,y,ZB,Math.abs(x-cx)===7||y===8?th.t:th.w,1)
 for(const sx of[-7,7]){for(let z=ZB+1;z<=ZB+11;z++)for(let y=0;y<=1;y++)put(cx+sx,y,z,th.w,1);for(let y=0;y<=6;y++)put(cx+sx,y,ZB+12,y===6?'gold':th.t,1)}
 PAV.push({p,i,cx,th});LABELS.push({t:p.t,x:cx+.5,y:10.4,z:ZB+1.6,c:th.c,s:1.2});ZONES.push({id:'p'+i,x:cx+.5,z:ZB+7,r:9,name:p.t})})
/* experience hall: checker floor, red carpet, raised stages with dark boards */
for(let x=14;x<=46;x++)for(let z=19;z<=71;z++)put(x,-1,z,(x+z)%2?'quartz':'sand')
floor(13,46,44,46,'brick');floor(13,46,43,43,'gold');floor(13,46,47,47,'gold')
const MS=EXPERIENCE.map((e,i)=>({e,x:20+i*10,n:i%2===0}))
MS.forEach(({x,n})=>{const [pz0,pz1,bz]=n?[33,40,32]:[50,57,58]
 floor(x-5,x+5,pz0,pz1,'quartz',0)
 for(let dx=-4;dx<=4;dx++)for(let y=1;y<=6;y++)put(x+dx,y,bz,Math.abs(dx)===4||y===1||y===6?'gold':'obsidian',1)
 for(const sx of[-5,5])for(let y=1;y<=3;y++)put(x+sx,y,n?pz1:pz0,y===3?'gold':'quartz',1)
 ZONES.push({id:'exp',x:x+.5,z:n?37:54,r:8,name:'Experience'})})
/* skills arena: floating icons, shooter podium at (-18,-45) */
floor(-46,-20,-69,-21,'sand');floor(-20,-16,-47,-43,'quartz')
SKILLS.forEach((c,j)=>{const th=(-45+22.5*j)*Math.PI/180,r=j%2?12:22,ux=-Math.cos(th),uz=Math.sin(th),tx=Math.sin(th),tz=Math.cos(th),cx=-18+r*ux,cz=-45+r*uz
 c.items.forEach(([n,u],i)=>{const o=(i-(c.items.length-1)/2)*3;SK.push({n,u,x:cx+tx*o,z:cz+tz*o,y:6+(i%2)*3,alive:true})})})
ZONES.push({id:'skills',x:-18,z:-44.5,r:16,name:'Skills Arena - all skills'})
/* about garden: plateau (y=4) with portrait pavilion */
const gx0=GZ-7
for(let x=-7;x<=7;x++)for(let z=gx0;z<=GZ+6;z++){for(let y=ht(x,z);y<3;y++)put(x,y,z,'dirt');put(x,3,z,'quartz')}
for(let x=-7;x<=7;x++)for(let y=4;y<=11;y++)put(x,y,GZ+6,Math.abs(x)===7||y===11?'gold':'quartz',1)
for(const px of[-7,7])for(const pz of[gx0,GZ-1])for(let y=4;y<=10;y++)put(px,y,pz,y===10?'gold':'quartz',1)
for(let x=-7;x<=7;x++)for(let z=gx0;z<=GZ+5;z++)put(x,11,z,x===-7||x===7||z===gx0||z===GZ+5?'gold':'quartz',1)
ZONES.push({id:'about',x:.5,z:GZ-.5,r:9,name:'About Agha Naveed'})
/* signposts + lamp posts along the road */
const sign=(x,z,t)=>{for(let y=0;y<3;y++)put(x,y,z,'planks',1);LABELS.push({t,x:x+.5,y:4.2,z:z+.5,c:'#ffd24a',s:.8,bb:1})}
sign(3,-6,'↑ NORTH\nProjects · Skills');sign(-4,6,'↓ SOUTH\nExperience · About Me')
sign(-4,-50,'← SKILLS ARENA');sign(3,-50,'↑ PROJECTS');sign(3,50,'EXPERIENCE HALL →');sign(-4,50,'↓ ABOUT ME')
for(let z=-80;z<=80;z+=12)if(Math.abs(z)>8&&Math.abs(z+45)>5&&Math.abs(z-45)>5)for(const x of[-2,2]){put(x,0,z,'log',1);put(x,1,z,'log',1);put(x,2,z,'gold',1)}
/* jungle: trees, bushes, cherry trees */
function tree(x,z,hgt,leaf,rad=3){const b=ht(x,z);for(let y=0;y<hgt;y++)put(x,b+y,z,'log')
 for(let dx=-rad;dx<=rad;dx++)for(let dz=-rad;dz<=rad;dz++)for(let dy=-1;dy<=2;dy++)if(dx*dx+dz*dz+(dy*1.6)**2<=rad*rad+.5&&!W.has(K(x+dx,b+hgt+dy,z+dz)))put(x+dx,b+hgt+dy,z+dz,leaf)}
let sd=7;const rnd=()=>(sd=sd*16807%2147483647)/2147483647
for(let n=0;n<2600;n++){const x=Math.floor(rnd()*98-49),z=Math.floor(rnd()*258-129),h=ht(x,z),r=rnd()
 if(h<0||dFlat(x,z)<3||Math.hypot(x,z-GZ)<19||Math.hypot(x-28,z-GZ-1)<11)continue
 if(r<.22)tree(x,z,7+Math.floor(rnd()*5),'leaves');else if(r<.6){put(x,h,z,'leaves');if(rnd()<.5)put(x,h+1,z,'leaves')}}
for(let i=0;i<9;i++){const a=i/9*Math.PI*2+.3,x=Math.round(Math.cos(a)*12),z=Math.round(GZ+Math.sin(a)*12);if(Math.abs(x)>3||z>GZ-6)tree(x,z,5,'blossom',2)}
const HORSES=[[6,7,'#8b5a2b'],[-7,8,'#f2f2f2'],[2.5,-30,'#2b2b2b'],[-2.5,40,'#c98a4a']].map(([x,z,col])=>({x,z,y:ht(Math.floor(x),Math.floor(z)),rot:0,col,moving:false}))
const INFO={x:0,z:6,yaw:0}

function ray(o,d,reach=5){let prev=null;for(let t=0;t<reach;t+=.04){
 const c=[Math.floor(o.x+d.x*t),Math.floor(o.y+d.y*t),Math.floor(o.z+d.z*t)];if(W.has(K(...c)))return{hit:c,prev};prev=c}return null}
const col=(x,y,z)=>{for(const a of[-.3,.3])for(const b of[-.3,.3])if(W.has(K(Math.floor(x+a),Math.floor(y),Math.floor(z+b))))return true;return false}
const body=(x,y,z)=>col(x,y+.05,z)||col(x,y+.95,z)||col(x,y+1.75,z)
const NOBUILD=[[-43,43,-131,-81],[-51,-9,-75,-15],[9,51,15,75],[-9,9,GZ-10,GZ+10]]
const noBuild=(x,y,z)=>y>10||NOBUILD.some(([a,b,c,d])=>x>=a&&x<=b&&z>=c&&z<=d)
const inR=(x,z,[a,b,c,d])=>x>=a&&x<=b&&z>=c&&z<=d
const areaAt=(x,z,wet)=>inR(x,z,[-40,41,-128,-83])?'📁 Projects Gallery':inR(x,z,[-48,-11,-72,-17])?'🏹 Skills Arena':inR(x,z,[12,49,18,73])?'💼 Experience Hall':
 Math.hypot(x,z-GZ)<17?'🌸 About Garden':Math.abs(x)<9&&Math.abs(z)<9?'🏠 Spawn Plaza':wet?'🌊 Lake':Math.abs(x)<4?'🛤 Main Road':'🌴 Jungle'

/* ---------- rendering ---------- */
const WGEO=new THREE.BoxGeometry(1,.88,1)
function Blocks({ver}){
 const refs=useRef({}),wr=useRef()
 useLayoutEffect(()=>{const m=new THREE.Matrix4(),n={};TYPES.forEach(t=>n[t]=0)
  for(const [k,t] of W){const [x,y,z]=k.split(',').map(Number);if(n[t]<(CAP[t]||6000))refs.current[t].setMatrixAt(n[t]++,m.setPosition(x+.5,y+.5,z+.5))}
  TYPES.forEach(t=>{const r=refs.current[t];r.count=n[t];r.instanceMatrix.needsUpdate=true})},[ver])
 useLayoutEffect(()=>{const m=new THREE.Matrix4();WCOLS.forEach(([x,z],i)=>wr.current.setMatrixAt(i,m.setPosition(x+.5,-.56,z+.5)));wr.current.instanceMatrix.needsUpdate=true},[])
 return <>{TYPES.map(t=><instancedMesh key={t} ref={e=>refs.current[t]=e} args={[BOX,MATS[t],CAP[t]||6000]} frustumCulled={false}/>)}
  <instancedMesh ref={wr} args={[WGEO,WATERMAT,WCOLS.length]} frustumCulled={false} renderOrder={5}/></>}

function drawSlide(g,p,i,ox,imgs,hue){
 g.save();g.translate(ox,0);const im=imgs[i]
 if(im&&im.complete&&im.naturalWidth){const r=Math.max(1024/im.naturalWidth,576/im.naturalHeight),w=im.naturalWidth*r,h=im.naturalHeight*r;g.drawImage(im,(1024-w)/2,(576-h)/2,w,h)}
 else{const gr=g.createLinearGradient(0,0,1024,576);gr.addColorStop(0,`hsl(${(hue+i*40)%360},60%,35%)`);gr.addColorStop(1,`hsl(${(hue+i*40+60)%360},70%,16%)`)
  g.fillStyle=gr;g.fillRect(0,0,1024,576);g.fillStyle='#fff';g.textAlign='center';g.font='bold 56px sans-serif';g.fillText(p.t,512,260)
  g.font='28px sans-serif';g.fillText(p.s,512,320);g.font='22px sans-serif';g.fillText('Screenshot '+(i+1)+' (add yours in src/data.js)',512,380)}
 g.restore()}

function Screen({p,i,x,y,z}){
 const cv=useMemo(()=>{const c=document.createElement('canvas');c.width=1024;c.height=576;return c},[])
 const tx=useMemo(()=>{const t=new THREE.CanvasTexture(cv);t.colorSpace=THREE.SRGBColorSpace;return t},[cv])
 const s=useRef({i:0,from:0,k:1,dirty:1}),imgs=useRef([])
 useEffect(()=>{const n=Math.max(p.images.length,3)
  imgs.current=Array.from({length:n},(_,j)=>{if(!p.images[j])return null;const im=new Image();im.src=p.images[j];im.onload=()=>s.current.dirty=1;return im})
  const id=setInterval(()=>{const q=s.current;if(q.k<1)return;q.from=q.i;q.i=(q.i+1)%n;q.k=0;gsap.to(q,{k:1,duration:.9,ease:'power2.inOut',onComplete:()=>q.dirty=1})},4500)
  return()=>clearInterval(id)},[p])
 useFrame(()=>{const q=s.current;if(q.k>=1&&!q.dirty)return;q.dirty=0;const g=cv.getContext('2d'),a=imgs.current
  if(q.k<1){drawSlide(g,p,q.from,-q.k*1024,a,i*110);drawSlide(g,p,q.i,(1-q.k)*1024,a,i*110)}else drawSlide(g,p,q.i,0,a,i*110)
  g.fillStyle='rgba(0,0,0,.55)';g.fillRect(0,530,1024,46);g.fillStyle='#fff';g.font='22px sans-serif';g.textAlign='left';g.fillText(p.t+'   '+(q.i+1)+' / '+a.length,20,560);tx.needsUpdate=true})
 return <group position={[x,y,z]}><mesh scale={[11.8,6.8,.3]} geometry={BOX}><meshBasicMaterial color="#111"/></mesh>
  <mesh position={[0,0,.17]}><planeGeometry args={[11,6.2]}/><meshBasicMaterial map={tx}/></mesh></group>}

function Portrait(){
 const [tx,setTx]=useState(null)
 useEffect(()=>{new THREE.TextureLoader().load('/me.jpg',x=>{x.colorSpace=THREE.SRGBColorSpace;setTx(x)},undefined,()=>{
  const c=document.createElement('canvas');c.width=400;c.height=520;const g=c.getContext('2d');const gr=g.createLinearGradient(0,0,400,520);gr.addColorStop(0,'#3b6fd0');gr.addColorStop(1,'#1b2a52')
  g.fillStyle=gr;g.fillRect(0,0,400,520);g.fillStyle='#fff';g.font='bold 150px sans-serif';g.textAlign='center';g.fillText('AN',200,300);g.font='22px sans-serif';g.fillText('add public/me.jpg',200,360);setTx(new THREE.CanvasTexture(c))})},[])
 return <group position={[-2.7,7.6,GZ+5.9]} rotation={[0,Math.PI,0]}><mesh scale={[5.4,6.6,.2]} geometry={BOX}><meshBasicMaterial color="#5a3b1a"/></mesh>
  <mesh position={[0,0,.12]}><planeGeometry args={[4.9,6.1]}/><meshBasicMaterial map={tx}/></mesh></group>}

function Icon({t,i}){
 const r=useRef(),[tx,setTx]=useState(null)
 useEffect(()=>{const l=new THREE.TextureLoader();l.setCrossOrigin('anonymous')
  l.load(t.u,x=>{x.colorSpace=THREE.SRGBColorSpace;setTx(x)},undefined,()=>{const c=document.createElement('canvas');c.width=c.height=64;const g=c.getContext('2d')
   g.fillStyle='#ffd24a';g.fillRect(0,0,64,64);g.fillStyle='#000';g.font='bold 44px monospace';g.fillText(t.n[0],18,48);setTx(new THREE.CanvasTexture(c))})},[])
 useFrame(s=>{r.current.visible=t.alive;r.current.position.set(t.x,t.y+Math.sin(s.clock.elapsedTime*1.5+i)*.4,t.z)})
 return <Billboard ref={r}>
  <mesh><circleGeometry args={[1.7,28]}/><meshBasicMaterial color="#fff"/></mesh>
  <mesh position={[0,0,-.01]} scale={1.1}><circleGeometry args={[1.7,28]}/><meshBasicMaterial color="#ffd24a"/></mesh>
  <mesh position={[0,0,.02]}><planeGeometry args={[2.1,2.1]}/><meshBasicMaterial map={tx} transparent/></mesh></Billboard>}

function Horse({h}){
 const g=useRef(),legs=useRef([]),m=c=><meshLambertMaterial color={c}/>
 useFrame(s=>{g.current.position.set(h.x,h.y,h.z);g.current.rotation.y=h.rot
  legs.current.forEach((l,i)=>l&&(l.rotation.x=h.moving?Math.sin(s.clock.elapsedTime*14+(i%2?Math.PI:0))*.7:0))})
 return <group ref={g}>
  <mesh position={[0,1.25,0]}><boxGeometry args={[.8,.8,1.7]}/>{m(h.col)}</mesh>
  {[[-.28,.7],[.28,.7],[-.28,-.7],[.28,-.7]].map(([x,z],i)=><group key={i} ref={e=>legs.current[i]=e} position={[x,.9,z]}><mesh position={[0,-.45,0]}><boxGeometry args={[.22,.9,.22]}/>{m(h.col)}</mesh></group>)}
  <mesh position={[0,1.85,.95]} rotation={[-.5,0,0]}><boxGeometry args={[.35,.9,.4]}/>{m(h.col)}</mesh>
  <mesh position={[0,2.25,1.35]}><boxGeometry args={[.32,.35,.7]}/>{m(h.col)}</mesh>
  <mesh position={[0,2.1,.85]} rotation={[-.5,0,0]}><boxGeometry args={[.1,.8,.12]}/>{m('#222')}</mesh>
  <mesh position={[0,1.6,-.95]} rotation={[.5,0,0]}><boxGeometry args={[.12,.7,.12]}/>{m('#222')}</mesh>
  <mesh position={[0,1.7,0]}><boxGeometry args={[.85,.12,.6]}/>{m('#a02020')}</mesh></group>}

function World(){
 return <>
  {LABELS.map((l,i)=>l.bb?<Billboard key={i} position={[l.x,l.y,l.z]}><T fontSize={l.s} color={l.c} outlineWidth={.06} outlineColor="#000" textAlign="center">{l.t}</T></Billboard>
   :<T key={i} position={[l.x,l.y,l.z]} fontSize={l.s} color={l.c} outlineWidth={.07} outlineColor="#000">{l.t}</T>)}
  {GATES.map(g=><T key={g.text} position={g.pos} rotation={[0,g.rot,0]} fontSize={Math.min(1.5,8.4/(g.text.length*.68))} color="#ffd24a" outlineWidth={.08} outlineColor="#2a0d0d">{g.text}</T>)}
  {PAV.map(({p,i,cx,th})=><group key={i}><Screen p={p} i={i} x={cx+.5} y={4.5} z={ZB+1.02}/><pointLight position={[cx+.5,6,ZB+6]} color={th.c} intensity={25} distance={16}/></group>)}
  {MS.map(({e,x,n},i)=>{const rot=n?0:Math.PI,tz=n?33.06:57.94,ex=x+.5
   return <group key={i}>
    <T position={[ex,5.55,tz]} rotation={[0,rot,0]} fontSize={.62} color="#ffd24a" maxWidth={7.4} textAlign="center">{e.role}</T>
    <T position={[ex,4.8,tz]} rotation={[0,rot,0]} fontSize={.4} color="#7fe3ff" maxWidth={7.4} textAlign="center">{e.org+'  ·  '+e.period}</T>
    <T position={[ex,4.2,tz]} rotation={[0,rot,0]} fontSize={.34} color="#ffffff" anchorY="top" maxWidth={7.2} lineHeight={1.4}>{e.pts.map(p=>'• '+p).join('\n')}</T>
    <pointLight position={[ex,4,n?36:55]} color="#ffd24a" intensity={20} distance={14}/></group>})}
  <Billboard position={[30,10,45]}><T fontSize={1.6} color="#ffd24a" outlineWidth={.08} outlineColor="#000">CAREER TIMELINE</T></Billboard>
  {SK.map((t,i)=><Icon key={t.n} t={t} i={i}/>)}
  <Portrait/><pointLight position={[0,8,GZ-1]} color="#ffc0e0" intensity={30} distance={22}/>
  <T position={[3.2,7.6,GZ+5.88]} rotation={[0,Math.PI,0]} fontSize={.5} maxWidth={5.4} lineHeight={1.4} color="#1f2a44" anchorY="middle" textAlign="center">
   {`${ABOUT.name}\n${ABOUT.role}\n\nGitHub: agha-naveed\nLinkedIn: agha-naveed\n\nPress E to open`}</T>
  {HORSES.map((h,i)=><Horse key={i} h={h}/>)}
  {Array.from({length:16},(_,i)=><mesh key={i} position={[(i*37%120)-60,36+i%3*3,(i*61%300)-150]} scale={[10,1.5,6]} geometry={BOX}><meshBasicMaterial color="#fff"/></mesh>)}
 </>}

function Hand({m,g}){
 const a=useRef(),b=useRef(),bw=useRef()
 useFrame((s,dt)=>{const q=m.current,it=g.sel.current,bow=it==='bow';q.swing=Math.max(0,q.swing-dt*3.5);if(q.mining&&q.swing===0&&!bow)q.swing=1
  const w=q.swing>0?Math.sin((1-q.swing)*Math.PI):0,t=s.clock.elapsedTime
  a.current.position.set(.45,-.5+Math.sin(t*1.6)*.008-(bow?0:w*.12),-.8-w*(bow?.12:.25));a.current.rotation.set(-.15-(bow?0:w*.9),-.45,.1)
  const has=!bow&&g.inv.current[it]>0;b.current.visible=has;bw.current.visible=bow
  if(has&&b.current.material!==MATS[it])b.current.material=MATS[it]})
 const bm=<meshBasicMaterial color="#6b4a2b" depthTest={false}/>
 return <group ref={a}>
  <mesh renderOrder={999} position={[0,0,.2]}><boxGeometry args={[.22,.22,.6]}/><meshBasicMaterial color="#3b6fd0" depthTest={false}/></mesh>
  <mesh renderOrder={1000} position={[0,0,-.2]}><boxGeometry args={[.2,.2,.45]}/><meshBasicMaterial color="#c68b5f" depthTest={false}/></mesh>
  <mesh ref={b} renderOrder={1001} position={[-.1,.17,-.5]} rotation={[.3,.6,0]} geometry={BOX} scale={.3}/>
  <group ref={bw} position={[-.12,.12,-.55]} rotation={[0,.3,0]}>
   <mesh renderOrder={1002}><boxGeometry args={[.05,.3,.05]}/>{bm}</mesh>
   <mesh renderOrder={1002} position={[0,.24,.06]} rotation={[.6,0,0]}><boxGeometry args={[.04,.26,.04]}/>{bm}</mesh>
   <mesh renderOrder={1002} position={[0,-.24,.06]} rotation={[-.6,0,0]}><boxGeometry args={[.04,.26,.04]}/>{bm}</mesh>
   <mesh renderOrder={1003} position={[0,0,.14]}><boxGeometry args={[.01,.6,.01]}/><meshBasicMaterial color="#fff" depthTest={false}/></mesh></group>
 </group>}

/* ---------- player ---------- */
function Player({g,paused,onNear}){
 const {camera,scene}=useThree()
 const pos=useRef(new THREE.Vector3(.5,0,6)),vy=useRef(0),gr=useRef(false),keys=useRef({}),st=useRef(0),near=useRef(null),last=useRef(0)
 const ms=useRef(0),mine=useRef({prog:0,key:'',swing:0,t:0,mining:0}),hi=useRef(),crack=useRef(),ghost=useRef(),riding=useRef(-1),wasWet=useRef(false),envK=useRef('')
 const arrows=useRef(Array.from({length:14},()=>({on:false,p:new THREE.Vector3(),v:new THREE.Vector3(),mesh:null})))
 const edges=useMemo(()=>new THREE.EdgesGeometry(new THREE.BoxGeometry(1.01,1.01,1.01)),[])
 g.paused.current=paused
 const target=()=>{const d=new THREE.Vector3();camera.getWorldDirection(d);return ray(camera.position,d)}
 useEffect(()=>{scene.add(camera)
  const pick=n=>{g.sel.current=n;g.setSel(n)}
  const place=()=>{if(g.paused.current)return;const r=target(),it=g.sel.current
   if(it==='bow')return g.msg('Switch to a block (keys 1-7) to build')
   if(!(g.inv.current[it]>0))return g.msg('No '+it+' left - break blocks to collect more')
   if(!r||!r.prev)return g.msg('Aim at a block surface (within reach)')
   const [x,y,z]=r.prev,p=pos.current
   if(noBuild(x,y,z))return g.msg('You can\'t build here')
   if(x+1>p.x-.3&&x<p.x+.3&&y+1>p.y&&y<p.y+1.8&&z+1>p.z-.3&&z<p.z+.3)return g.msg('Step aside first')
   put(x,y,z,it);GONE.delete(K(x,y,z));g.inv.current[it]--;g.sync();g.bump();mine.current.swing=1;sfx.place()}
  const shoot=()=>{const now=performance.now();if(now-last.current<450)return;const a=arrows.current.find(x=>!x.on);if(!a)return;last.current=now
   const d=new THREE.Vector3();camera.getWorldDirection(d);a.p.copy(camera.position).addScaledVector(d,.8);a.v.copy(d).multiplyScalar(42);a.on=true;mine.current.swing=1;sfx.shoot()}
  const ride=()=>{if(g.paused.current)return;const p=pos.current
   if(riding.current>=0){HORSES[riding.current].moving=false;riding.current=-1;sfx.neigh();return}
   let bi=-1,bd=4;HORSES.forEach((h,i)=>{const d=Math.hypot(h.x-p.x,h.z-p.z);if(d<bd){bd=d;bi=i}})
   if(bi>=0){riding.current=bi;p.x=HORSES[bi].x;p.z=HORSES[bi].z;p.y=Math.max(p.y,HORSES[bi].y);sfx.neigh()}else g.msg('No horse nearby')}
  const kd=e=>{keys.current[e.code]=e.type==='keydown'
   if(e.type==='keydown'){const n=+e.key;if(n>=1&&n<=ORDER.length)pick(ORDER[n-1]);if(e.code==='Space')e.preventDefault();if(e.code==='KeyF')place();if(e.code==='KeyR')ride()}}
  const md=e=>{if(g.paused.current)return;const bow=g.sel.current==='bow'
   if(e.button===0){if(bow)shoot();else ms.current=1}if(e.button===2)place()}
  const mu=e=>{if(e.button===0)ms.current=0}
  const wh=e=>{const i=ORDER.indexOf(g.sel.current);pick(ORDER[(i+(e.deltaY>0?1:-1)+ORDER.length)%ORDER.length])}
  const cm=e=>e.preventDefault()
  addEventListener('keydown',kd);addEventListener('keyup',kd);addEventListener('mousedown',md);addEventListener('mouseup',mu);addEventListener('wheel',wh);addEventListener('contextmenu',cm)
  return()=>{removeEventListener('keydown',kd);removeEventListener('keyup',kd);removeEventListener('mousedown',md);removeEventListener('mouseup',mu);removeEventListener('wheel',wh);removeEventListener('contextmenu',cm)}},[])
 useFrame((s,dt)=>{
  dt=Math.min(dt,.05);const k=keys.current,p=pos.current,m=mine.current,hz=riding.current>=0?HORSES[riding.current]:null
  const fwd=new THREE.Vector3();camera.getWorldDirection(fwd);INFO.x=p.x;INFO.z=p.z;INFO.yaw=Math.atan2(fwd.x,fwd.z)
  const wet=WATER.has(Math.floor(p.x)+','+Math.floor(p.z))&&p.y<-.3
  if(wet&&!wasWet.current)sfx.splash();wasWet.current=wet
  let moving=false
  const axis=(dx,dz)=>{const nx=p.x+dx,nz=p.z+dz
   if(!body(nx,p.y,nz)){p.x=nx;p.z=nz;return}
   if((gr.current||wet)&&!body(nx,p.y+1,nz)){p.x=nx;p.z=nz;p.y+=1;vy.current=0}}
  if(!paused){
   const f=(k.KeyW||k.ArrowUp?1:0)-(k.KeyS||k.ArrowDown?1:0),sd=(k.KeyD||k.ArrowRight?1:0)-(k.KeyA||k.ArrowLeft?1:0)
   const dir=new THREE.Vector3(fwd.x,0,fwd.z);if(dir.lengthSq()<1e-6)dir.set(0,0,-1);dir.normalize()
   const mv=dir.clone().multiplyScalar(f).add(new THREE.Vector3(-dir.z,0,dir.x).multiplyScalar(sd))
   if(mv.lengthSq()>0){moving=true;mv.normalize()
    if(hz){let d=Math.atan2(mv.x,mv.z)-hz.rot;d=Math.atan2(Math.sin(d),Math.cos(d));hz.rot+=d*Math.min(1,dt*8)}
    const sp=(hz?(k.ShiftLeft?15:10):(k.ShiftLeft?8:5))*(wet?.55:1)*dt
    axis(mv.x*sp,0);axis(0,mv.z*sp)
    p.x=THREE.MathUtils.clamp(p.x,-RX+1,RX-1);p.z=THREE.MathUtils.clamp(p.z,-RZ+1,RZ-1)
    st.current+=dt;if(st.current>(hz?.22:k.ShiftLeft?.28:.4)&&gr.current&&!wet){st.current=0;sfx.step()}}
   if(k.Space&&gr.current&&!wet){vy.current=hz?10.5:9;sfx.jump()}}
  if(wet){vy.current=Math.max(-2.5,vy.current-6*dt);if(k.Space&&!paused)vy.current=Math.max(vy.current,3.2)}else vy.current-=24*dt
  const ny=p.y+vy.current*dt
  if(vy.current<0){if(col(p.x,ny,p.z)){p.y=Math.floor(ny)+1;vy.current=0;gr.current=true}else{p.y=ny;gr.current=false}}
  else{gr.current=false;if(col(p.x,ny+1.8,p.z))vy.current=0;else p.y=ny}
  if(p.y<-8){p.set(.5,0,6);vy.current=0}
  if(hz){hz.x=p.x;hz.y=p.y;hz.z=p.z;hz.moving=moving}
  camera.position.set(p.x,p.y+1.62+(hz?.95:0),p.z)
  /* mining / placement preview */
  const bow=g.sel.current==='bow',r=paused||bow?null:target(),tg=r&&r.hit
  hi.current.visible=!!tg;crack.current.visible=false
  if(tg)hi.current.position.set(tg[0]+.5,tg[1]+.5,tg[2]+.5)
  const gp=r&&r.prev&&g.inv.current[g.sel.current]>0&&!noBuild(...r.prev)
  ghost.current.visible=!!gp;if(gp)ghost.current.position.set(r.prev[0]+.5,r.prev[1]+.5,r.prev[2]+.5)
  const key=tg&&K(...tg)
  if(tg&&ms.current&&!FIXED.has(key)){
   const t=W.get(key),h=HARD[t]||1;m.mining=1
   if(m.key!==key){m.key=key;m.prog=0}
   m.prog+=dt;m.t+=dt;if(m.t>.25){m.t=0;sfx.hit()}
   crack.current.visible=true;crack.current.position.copy(hi.current.position);crack.current.material.opacity=Math.min(.75,m.prog/h*.75)
   if(m.prog>=h){W.delete(key);GONE.add(key);fillAround(tg[0],tg[1],tg[2])
    const d=DROP[t]||t;if(ORDER.includes(d)){g.inv.current[d]=(g.inv.current[d]||0)+1;g.sync()}
    g.bump();sfx.break();m.prog=0;m.key=''}
  }else{m.mining=0;m.prog=0;m.key=''}
  /* arrows */
  const tmp=new THREE.Vector3()
  arrows.current.forEach(a=>{if(!a.mesh)return
   if(a.on){a.v.y-=9*dt
    for(let q=0;q<3&&a.on;q++){a.p.addScaledVector(a.v,dt/3)
     if(W.has(K(Math.floor(a.p.x),Math.floor(a.p.y),Math.floor(a.p.z)))||a.p.y<-4)a.on=false
     SK.forEach((t,i)=>{if(a.on&&t.alive&&a.p.distanceTo(tmp.set(t.x,t.y+Math.sin(s.clock.elapsedTime*1.5+i)*.4,t.z))<1.6){
      t.alive=false;a.on=false;sfx.pop();g.hit(t.n);setTimeout(()=>t.alive=true,9000)}})}
    a.mesh.position.copy(a.p);a.mesh.lookAt(tmp.copy(a.p).add(a.v))}
   a.mesh.visible=a.on})
  /* zones + environment HUD */
  let best=null,bd=1e9;for(const z of ZONES){const d=Math.hypot(p.x-z.x,p.z-z.z);if(d<z.r&&d<bd){bd=d;best=z}}
  const id=best?best.id+'|'+best.name:null
  if(id!==near.current){near.current=id;if(id)sfx.near();onNear(best)}
  const under=camera.position.y<-.1&&WATER.has(Math.floor(p.x)+','+Math.floor(p.z))
  const horse=!hz&&HORSES.some(h=>Math.hypot(h.x-p.x,h.z-p.z)<4),area=areaAt(p.x,p.z,wet)+(wet?' (swimming)':''),ek=area+horse+under+!!hz
  if(ek!==envK.current){envK.current=ek;g.setEnv({area,horse,under,riding:!!hz})}})
 return <>
  {createPortal(<Hand m={mine} g={g}/>,camera)}
  <lineSegments ref={hi} geometry={edges}><lineBasicMaterial color="#000"/></lineSegments>
  <mesh ref={ghost} geometry={BOX} scale={.98}><meshBasicMaterial color="#fff" transparent opacity={.3} depthWrite={false}/></mesh>
  <mesh ref={crack} geometry={BOX} scale={1.005}><meshBasicMaterial color="#000" transparent opacity={0} depthWrite={false}/></mesh>
  {arrows.current.map((a,i)=><mesh key={i} ref={e=>a.mesh=e} visible={false}><boxGeometry args={[.07,.07,1]}/><meshBasicMaterial color="#e8d9a8"/></mesh>)}
 </>}

/* ---------- UI ---------- */
const MC={grass:'#4c8f3a',moss:'#2f7a3a',stone:'#8a8a8a',sand:'#d8c98a',path:'#b09b6a',brick:'#9a4a40',quartz:'#eee',planks:'#af8750',lapis:'#3050b0',obsidian:'#302040',gold:'#e0b030',log:'#654',leaves:'#1f5a22',dirt:'#785537',blossom:'#f0a0c0'}
const MARKS=[['PROJECTS',0,-105],['SKILLS',-30,-45],['EXPERIENCE',30,45],['ABOUT ME',0,100],['PLAZA',0,0]]
function Minimap(){
 const ref=useRef()
 useEffect(()=>{const bg=document.createElement('canvas');bg.width=NX;bg.height=NZ;const b=bg.getContext('2d')
  for(let x=-RX;x<RX;x++)for(let z=-RZ;z<RZ;z++){let c=null
   for(let y=14;y>=-3;y--){const t=W.get(K(x,y,z));if(t){c=MC[t]||'#888';break}}
   if(WATER.has(x+','+z)&&!W.has(K(x,-1,z)))c='#2a6fdb'
   b.fillStyle=c||'#222';b.fillRect(x+RX,z+RZ,1,1)}
  const sc=1;let raf
  const loop=()=>{const cv=ref.current;if(cv){const g=cv.getContext('2d');g.imageSmoothingEnabled=false;g.drawImage(bg,0,0)
   g.font='bold 10px Poppins, sans-serif';g.lineWidth=3;g.fillStyle='#ffd24a'
   MARKS.forEach(([t,x,z])=>{g.textAlign=x>15?'right':x<-15?'left':'center';g.strokeStyle='#000';g.strokeText(t,(x+RX)*sc,(z+RZ)*sc);g.fillText(t,(x+RX)*sc,(z+RZ)*sc)})
   g.fillStyle='#8b5a2b';HORSES.forEach(h=>g.fillRect((h.x+RX)*sc-2,(h.z+RZ)*sc-2,4,4))
   g.save();g.translate((INFO.x+RX)*sc,(INFO.z+RZ)*sc);g.rotate(Math.atan2(Math.cos(INFO.yaw),Math.sin(INFO.yaw)));g.fillStyle='#f00';g.strokeStyle='#fff';g.lineWidth=1.5
   g.beginPath();g.moveTo(7,0);g.lineTo(-5,-5);g.lineTo(-5,5);g.closePath();g.fill();g.stroke();g.restore()}
   raf=requestAnimationFrame(loop)};loop();return()=>cancelAnimationFrame(raf)},[])
 return <canvas ref={ref} width={NX} height={NZ} className="pointer-events-none absolute right-3 top-14 border-4 border-black"/>}

function Chip({n,u,hit}){const [bad,setBad]=useState(false)
 return <span title={n} className={'item grid h-16 w-16 place-items-center border-2 bg-white p-2 '+(hit?'border-yellow-400 ring-4 ring-yellow-300':'border-[#555]')}>
  {bad?<b className="text-xl text-black">{n[0]}</b>:<img src={u} alt={n} className="h-full w-full object-contain" onError={()=>setBad(true)}/>}</span>}

function Panel({id,hits,onClose}){
 const ref=useRef(),pi=/^p\d+$/.test(id)?+id.slice(1):-1,P=PROJECTS[pi]
 const title=P?P.t:{skills:'⚔ Skills Arena',exp:'⚒ Experience',about:'☺ About Me'}[id]
 useEffect(()=>{const c=gsap.context(()=>{
  gsap.fromTo(ref.current,{scale:.7,opacity:0,y:40},{scale:1,opacity:1,y:0,duration:.5,ease:'back.out(1.6)'})
  gsap.from('.item',{opacity:0,y:20,stagger:.04,delay:.25,duration:.35})},ref);return()=>c.revert()},[id])
 const card="item mb-3 block border-2 border-[#555] bg-[#8b8b8b] p-3 text-white hover:bg-[#6b8f3a]"
 return <div className="absolute inset-0 z-20 flex items-center justify-center bg-black/60 p-4">
  <div ref={ref} className="max-h-[90vh] w-full max-w-3xl overflow-auto border-4 border-black bg-[#c6c6c6] p-6 text-[15px] leading-7 text-[#2b2b2b] shadow-[inset_-4px_-4px_#555,inset_4px_4px_#fff]">
   <h2 className="mb-4 text-2xl font-bold">{title}</h2>
   {P&&<a href={P.l} target="_blank" rel="noreferrer" className={card}><p className="mb-2">{P.d}</p><i className="text-cyan-200">{P.s}</i><p className="mt-2 text-yellow-200">Open project ↗</p></a>}
   {id==='skills'&&<><p className="item mb-4">Pick the bow (slot 8) and shoot the floating logos! Highlighted = already hit.</p>
    <div className="flex flex-wrap gap-3">{SKILLS.flatMap(c=>c.items).map(([n,u])=><Chip key={n} n={n} u={u} hit={hits.includes(n)}/>)}</div></>}
   {id==='exp'&&EXPERIENCE.map(e=><div key={e.role} className={card}><b className="text-lg text-yellow-200">{e.role}</b> @ {e.org}<div className="text-cyan-200">{e.period}</div>{e.pts.map(p=><div key={p}>• {p}</div>)}</div>)}
   {id==='about'&&<div className="item flex flex-col gap-4 md:flex-row">
    <img src="/me.jpg" alt="" className="h-56 w-44 shrink-0 border-4 border-black object-cover" onError={e=>e.currentTarget.style.display='none'}/>
    <div><p className="mb-2 text-sm">{ABOUT.name}</p><p className="mb-2 text-[#2d6a1f]">{ABOUT.role}</p><p className="mb-3">{ABOUT.bio}</p>
     {CONTACT.map(([n,t,l])=><a key={n} href={l} target="_blank" rel="noreferrer" className={card}><b className="text-yellow-200">{n}</b> — {t} ↗</a>)}</div></div>}
   <button onClick={onClose} className="mt-4 border-4 border-black bg-[#7a7a7a] px-4 py-2 text-white hover:bg-[#9a9a9a]">Close [E]</button>
  </div></div>}

export default function App(){
 const ctrl=useRef(),title=useRef(),nearRef=useRef(null),openRef=useRef(null)
 const inv=useRef({dirt:10,stone:0,planks:10,log:0,leaves:0,brick:0,path:0}),sel=useRef('dirt'),paused=useRef(true)
 const [locked,setLocked]=useState(false),[near,setNear]=useState(null),[open,setOpen]=useState(null),[seen,setSeen]=useState([])
 const [ver,setVer]=useState(0),[invS,setInvS]=useState({...inv.current}),[selS,setSelS]=useState('dirt'),[hits,setHits]=useState([]),[toast,setToast]=useState('')
 const [env,setEnv]=useState({area:'',horse:false,under:false,riding:false})
 const g=useMemo(()=>{const o={inv,sel,paused,sync:()=>setInvS({...inv.current}),setSel:setSelS,bump:()=>setVer(v=>v+1),setEnv,
  msg:t=>{setToast(t);clearTimeout(o.tt);o.tt=setTimeout(()=>setToast(''),1800)}};o.hit=n=>{setHits(h=>h.includes(n)?h:[...h,n]);o.msg('🏹 Hit: '+n+'!')};return o},[])
 openRef.current=open
 const onNear=z=>{nearRef.current=z;setNear(z)}
 const close=()=>{sfx.close();setOpen(null);try{ctrl.current?.lock()}catch{}}
 const enter=id=>{sfx.open();setOpen(id);setSeen(s=>s.includes(id)?s:[...s,id]);document.exitPointerLock?.()}
 useEffect(()=>{const h=e=>{if(e.code!=='KeyE')return;if(openRef.current)close();else if(nearRef.current)enter(nearRef.current.id)}
  addEventListener('keydown',h);return()=>removeEventListener('keydown',h)},[])
 useEffect(()=>{gsap.from(title.current,{y:-60,opacity:0,duration:1,ease:'bounce.out'})},[])
 return <div className="relative h-full w-full select-none">
  <Canvas camera={{fov:75,near:.05,far:300}} gl={{antialias:false}}>
   <Sky sunPosition={[100,60,50]}/><fog attach="fog" args={['#bcd8ff',70,170]}/>
   <ambientLight intensity={1.1}/><directionalLight position={[30,50,20]} intensity={1.6}/>
   <Blocks ver={ver}/><World/>
   <Player g={g} paused={!!open||!locked} onNear={onNear}/>
   <PointerLockControls ref={ctrl} onLock={()=>setLocked(true)} onUnlock={()=>setLocked(false)}/>
  </Canvas>
  {env.under&&<div className="pointer-events-none absolute inset-0 bg-blue-600/40"/>}
  <Minimap/>
  <div className="pointer-events-none absolute left-1/2 top-3 -translate-x-1/2 border-2 border-black bg-black/60 px-4 py-2 text-sm font-semibold text-white">📍 {env.area}</div>
  {locked&&<div className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 text-xl text-white mix-blend-difference">+</div>}
  {locked&&(near||env.horse||env.riding)&&<div className="pointer-events-none absolute bottom-28 left-1/2 -translate-x-1/2 bg-black/70 px-4 py-3 text-center text-sm font-semibold leading-6 text-white">
   {near&&<div>[E] — {near.name}</div>}{env.riding?<div>[R] dismount horse</div>:env.horse&&<div>[R] ride the horse 🐎</div>}</div>}
  {toast&&<div className="pointer-events-none absolute left-1/2 top-16 -translate-x-1/2 bg-black/70 px-4 py-2 text-base font-semibold text-yellow-300">{toast}</div>}
  <div className="pointer-events-none absolute bottom-3 left-1/2 flex -translate-x-1/2 gap-1 border-4 border-[#222] bg-black/60 p-1">
   {ORDER.map((t,i)=><div key={t} className={'relative flex h-14 w-14 items-center justify-center border-4 '+(selS===t?'border-white':'border-[#555]')}>
    {t==='bow'?<span className="text-2xl">🏹</span>:<><div style={{background:COL[t]}} className="h-7 w-7 border border-black/40"/><span className="absolute bottom-0 right-1 text-xs font-bold text-white">{invS[t]||0}</span></>}
    <i className="absolute left-1 top-0 text-[11px] not-italic text-white/70">{i+1}</i></div>)}</div>
  <div className="pointer-events-none absolute left-3 top-3 text-xs font-medium leading-5 text-white drop-shadow">Explored {seen.length} · Skills hit {hits.length}/{SK.length}<br/>Follow the road & signs. Long map: Projects (far N), Skills (NW), Experience (SE), About (far S)</div>
  {!locked&&!open&&<div onClick={()=>ctrl.current?.lock()} className="absolute inset-0 z-10 flex cursor-pointer flex-col items-center justify-center gap-6 bg-black/70 p-6 text-center text-white">
   <h1 ref={title} className="title text-4xl text-yellow-300 md:text-6xl">{ABOUT.name}'s World</h1>
   <p className="text-base leading-8">WASD move · Mouse look · Space jump / swim up · Shift sprint<br/>Hold Left Click: break · Right Click or F: place block · 1-7 blocks · 8 bow<br/>R: ride horse · E: interact · Esc: pause</p>
   <p className="animate-pulse text-xl font-bold">Click to play</p></div>}
  {open&&<Panel id={open} hits={hits} onClose={close}/>}
 </div>}
