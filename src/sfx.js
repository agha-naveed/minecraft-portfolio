// All sound is synthesized with WebAudio - no asset files needed.
let ac
const A=()=>ac||(ac=new (window.AudioContext||window.webkitAudioContext)())
function beep(f,d=.1,type='square',v=.06,to=0){try{const a=A(),o=a.createOscillator(),g=a.createGain(),t=a.currentTime
o.type=type;o.frequency.setValueAtTime(f,t);if(to)o.frequency.exponentialRampToValueAtTime(to,t+d)
g.gain.setValueAtTime(v,t);g.gain.exponentialRampToValueAtTime(.001,t+d);o.connect(g).connect(a.destination);o.start(t);o.stop(t+d)}catch{}}
export const sfx={
 step:()=>beep(80+Math.random()*50,.07,'triangle',.12),
 jump:()=>beep(200,.15,'square',.05,520),
 near:()=>beep(880,.08,'sine',.05),
 open:()=>{beep(440,.1);setTimeout(()=>beep(660,.15),90);setTimeout(()=>beep(880,.2),180)},
 close:()=>beep(420,.15,'square',.05,180)}
function noise(d=.15,v=.15){try{const a=A(),n=a.sampleRate*d|0,b=a.createBuffer(1,n,a.sampleRate),c=b.getChannelData(0)
for(let i=0;i<n;i++)c[i]=(Math.random()*2-1)*(1-i/n);const s=a.createBufferSource(),g=a.createGain();g.gain.value=v;s.buffer=b;s.connect(g).connect(a.destination);s.start()}catch{}}
sfx.break=()=>noise(.2,.22);sfx.hit=()=>noise(.05,.09);sfx.place=()=>beep(150,.09,'square',.08,90)
sfx.pop=()=>{beep(600,.1,'sine',.08,1100);setTimeout(()=>beep(900,.15,'sine',.06,1500),80)}
sfx.shoot=()=>{noise(.1,.1);beep(300,.12,'sawtooth',.04,120)}
sfx.splash=()=>noise(.3,.14);sfx.neigh=()=>{beep(700,.25,'sawtooth',.05,350);setTimeout(()=>beep(800,.2,'sawtooth',.04,400),200)}
