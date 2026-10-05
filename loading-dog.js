(() => {
const opening=document.getElementById('opening');
if(!opening||!document.documentElement.hasAttribute('data-opening'))return;
const canvas=opening.querySelector('canvas');
let resolveReady;window.portfolioDogReady=new Promise(resolve=>{resolveReady=resolve;});
const ctx=canvas.getContext('2d');

const actions={yawn:[0,1,2,2,2,3,0,0],breakfast:[4,5],lunch:[4,5],dinner:[4,5],run:[6,7],walk:[8,9],toy:[10,11],roll:[12,13,13,13,12],nap:[14],sleep:[15]};
const descriptions={yawn:'眠そうにあくびするチワワ',breakfast:'朝ごはんを食べるチワワ',lunch:'昼ごはんを食べるチワワ',dinner:'夜ごはんを食べるチワワ',run:'走り回るチワワ',walk:'散歩するチワワ',toy:'おもちゃで遊ぶチワワ',roll:'お腹を見せてゴロンとするチワワ',nap:'お昼寝するチワワ',sleep:'眠っているチワワ'};
function selectBehavior(hour,random=Math.random()){
 let choices;
 if(hour>=4&&hour<7)choices=['yawn'];
 else if(hour>=7&&hour<9)choices=['breakfast','breakfast','run','walk'];
 else if(hour>=9&&hour<11)choices=['run','walk'];
 else if(hour>=11&&hour<13)choices=['lunch','lunch','toy','roll'];
 else if(hour>=13&&hour<18)choices=['toy','roll','nap'];
 else if(hour>=18&&hour<21)choices=['dinner','dinner','yawn'];
 else if(hour>=21&&hour<23)choices=['yawn','sleep'];
 else choices=['sleep'];
 return choices[Math.min(choices.length-1,Math.floor(random*choices.length))];
}
let behavior=selectBehavior(new Date().getHours());
function setBehavior(action){if(!actions[action])return;behavior=action;canvas.dataset.action=action;opening.querySelector('.opening-dog').setAttribute('aria-label',descriptions[action]);}
setBehavior(behavior);
const img=new Image();img.src='assets/pixel-chihuahua-actions.png?v=20261005';
img.onerror=()=>resolveReady();
img.onload=()=>{
 if(!canvas.isConnected){resolveReady();return;}
 // The artwork rows have different spacing. Crop each pose within its own
 // observed row and column boundaries, rather than assuming equal-size cells.
 const columns=[0,326,636,952,1254].map(v=>Math.round(v*img.naturalWidth/1254));
 const rows=[0,400,720,1016,1254].map(v=>Math.round(v*img.naturalHeight/1254));
 const scan=document.createElement('canvas');scan.width=img.naturalWidth;scan.height=img.naturalHeight;
 const sc=scan.getContext('2d',{willReadFrequently:true});sc.drawImage(img,0,0);
 const data=sc.getImageData(0,0,scan.width,scan.height).data;
 const boxes=[];let maxW=0,maxH=0;
 for(let frame=0;frame<16;frame++){
  const column=frame%4,row=Math.floor(frame/4),ox=columns[column],oy=rows[row];
  const cellW=columns[column+1]-ox,cellH=rows[row+1]-oy;let left=cellW,top=cellH,right=-1,bottom=-1;
  for(let y=0;y<cellH;y++)for(let x=0;x<cellW;x++)if(data[((y+oy)*scan.width+x+ox)*4+3]>40){left=Math.min(left,x);top=Math.min(top,y);right=Math.max(right,x);bottom=Math.max(bottom,y);}
  const w=Math.max(1,right-left+1),h=Math.max(1,bottom-top+1);boxes.push({left:ox+left,top:oy+top,w,h});maxW=Math.max(maxW,w);maxH=Math.max(maxH,h);
 }
 // Quantize each supplied sprite once to a small pixel grid; rendering stays crisp.
 const sprites=boxes.map((box,frame)=>{
  const sprite=document.createElement('canvas');sprite.width=56;sprite.height=56;
  const s=sprite.getContext('2d');s.imageSmoothingEnabled=false;
  const scale=48/Math.max(maxW,maxH),w=Math.max(1,Math.round(box.w*scale)),h=Math.max(1,Math.round(box.h*scale));
  s.drawImage(img,box.left,box.top,box.w,box.h,Math.round((56-w)/2),48-h,w,h);
  return sprite;
 });
 canvas.hidden=false;
 const reduced=matchMedia('(prefers-reduced-motion: reduce)');
 function render(ms){
  const t=reduced.matches?0:ms;
  const frames=actions[behavior];
  const interval=behavior==='run'?130:behavior==='walk'?240:behavior==='yawn'?260:behavior==='roll'?380:behavior==='toy'?300:350;
  const frame=frames[Math.floor(t/interval)%frames.length];
  canvas.width=96;canvas.height=96;ctx.imageSmoothingEnabled=false;
  let x=20,y=20,flip=false;
  if(!reduced.matches&&(behavior==='run'||behavior==='walk')){
   const phase=t/(behavior==='run'?2800:5400)*2*Math.PI;
   x+=Math.round(Math.sin(phase)*13);y+=Math.round(Math.cos(phase)*5);flip=Math.cos(phase)>0;
  }
  if(!reduced.matches&&(behavior==='nap'||behavior==='sleep'))y+=Math.sin(t/800)>0?1:0;
  ctx.save();if(flip){ctx.translate(x+56,y);ctx.scale(-1,1);ctx.drawImage(sprites[frame],0,0);}else ctx.drawImage(sprites[frame],x,y);ctx.restore();
 }
 render(0);canvas.dataset.ready='true';resolveReady();
 const start=performance.now();let visibleElapsed=0,last=start;
 function loop(now){if(!canvas.isConnected)return;if(!document.hidden&&document.documentElement.dataset.opening==='active'){visibleElapsed+=Math.max(0,Math.min(now-last,100));render(visibleElapsed);}last=now;requestAnimationFrame(loop);}requestAnimationFrame(loop);
};

})();
