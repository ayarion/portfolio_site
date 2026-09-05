/* 3D街コンポーネント。ビルド不要で実行できます。
   家の配置：HOUSESのx/z、ラベルの高さ：labelY、接近距離：ENTRY_RADIUS。
   hamster.glbから同梱したデータを直接読み込むため、file://でも動作します。 */
(() => {
  const loading=document.querySelector('#loading');
  try {
    const {THREE:T,GLTFLoader}=TownVendor;
    const canvas=document.querySelector('#town'),container=document.querySelector('#world');
    const scene=new T.Scene();
    const renderer=new T.WebGLRenderer({canvas,antialias:true,alpha:true});
    renderer.setPixelRatio(Math.min(devicePixelRatio,2));renderer.shadowMap.enabled=true;renderer.shadowMap.type=T.PCFSoftShadowMap;
    renderer.outputColorSpace=T.SRGBColorSpace;renderer.toneMapping=T.ACESFilmicToneMapping;renderer.toneMappingExposure=1.3;
    const camera=new T.OrthographicCamera(-10,10,7,-7,.1,100);camera.position.set(0,13,18);camera.lookAt(0,0,0);
    scene.add(new T.HemisphereLight(0xfffcf0,0xabb696,2.8));
    const sun=new T.DirectionalLight(0xfff4dc,3.1);sun.position.set(-8,15,8);sun.castShadow=true;sun.shadow.mapSize.set(2048,2048);sun.shadow.camera.left=-10;sun.shadow.camera.right=10;sun.shadow.camera.top=10;sun.shadow.camera.bottom=-10;sun.shadow.normalBias=.035;sun.shadow.bias=-.0001;sun.shadow.radius=4;scene.add(sun);
    const palette={grass:0xc9d5ad,rim:0xe6e3d0,earth:0xa8b494,path:0xf0ebdd,wood:0xb48460,trunk:0xab8058,leaf:0xb1c88b,leafLight:0xc2d49d,cream:0xf1e8d6,window:0x6b8276,coral:0xc68e73,green:0x829d83,ochre:0xc0a46a,slate:0x8c9eaa};
    const mats=new Map();const material=c=>{if(!mats.has(c))mats.set(c,new T.MeshStandardMaterial({color:c,roughness:1}));return mats.get(c)};
    function mesh(geometry,color,x,y,z,parent=scene){const m=new T.Mesh(geometry,material(color));m.position.set(x,y,z);m.castShadow=true;m.receiveShadow=true;parent.add(m);return m}
    function box(w,h,d,c,x,y,z,p){return mesh(new T.BoxGeometry(w,h,d),c,x,y,z,p)}
    function cylinder(r1,r2,h,c,x,y,z,p,segments=64){return mesh(new T.CylinderGeometry(r1,r2,h,segments),c,x,y,z,p)}
    function ball(r,c,x,y,z,p){return mesh(new T.IcosahedronGeometry(r,2),c,x,y,z,p)}
    cylinder(6.5,6.5,.18,palette.earth,0,-.25,0);cylinder(6.53,6.5,.11,palette.rim,0,-.105,0);cylinder(6.4,6.4,.08,palette.grass,0,-.015,0);
    cylinder(2.42,2.42,.025,palette.path,0,.038,.3);
    const floor=mesh(new T.PlaneGeometry(200,200),0xeeeee6,0,-.36,0);floor.material=new T.ShadowMaterial({color:0x536047,opacity:.12});floor.rotation.x=-Math.PI/2;floor.castShadow=false;
    // Four fixed houses. Door is on the positive Z side.
    const HOUSES=[
      {id:'about',x:-3.25,z:-1.55,color:palette.coral,labelY:2.7,name:'自己紹介'},
      {id:'team',x:2.45,z:-2.65,color:palette.green,labelY:2.9,name:'チーム制作作品'},
      {id:'projects',x:-3.1,z:2.05,color:palette.ochre,labelY:2.5,name:'個人制作作品'},
      {id:'contact',x:3.1,z:1.7,color:palette.slate,labelY:2.7,name:'スキル / お問い合わせ'}
    ];
    const ENTRY_RADIUS=.85;
    HOUSES.forEach((h,index)=>{
      const g=new T.Group();g.position.set(h.x,0,h.z);scene.add(g);
      box(1.82,.13,1.54,palette.rim,0,.1,0,g);box(1.6,1.25,1.32,palette.cream,0,.77,0,g);
      // Gabled roof, modeled as a triangular extrusion.
      const roofShape=new T.Shape();roofShape.moveTo(-1,0);roofShape.lineTo(0,.76);roofShape.lineTo(1,0);roofShape.closePath();
      const roofGeo=new T.ExtrudeGeometry(roofShape,{depth:1.66,bevelEnabled:false});mesh(roofGeo,h.color,0,1.4,-.83,g);
      for(let k=0;k<8;k++){const z=-.78+k*.22;const a=box(1.28,.035,.027,palette.rim,-.5,1.79,z,g);a.rotation.z=.65;const b=box(1.28,.035,.027,palette.rim,.5,1.79,z,g);b.rotation.z=-.65;}
      box(.38,.65,.045,h.color,.2,.51,.69,g);ball(.025,palette.ochre,.31,.52,.73,g);
      box(.43,.43,.045,palette.wood,-.46,.94,.69,g);box(.33,.33,.06,palette.window,-.46,.94,.71,g);box(.03,.35,.065,palette.cream,-.46,.94,.73,g);box(.36,.03,.065,palette.cream,-.46,.94,.73,g);
      box(.065,.4,.43,palette.wood,.82,.9,0,g);box(.07,.3,.33,palette.window,.83,.9,0,g);box(.075,.03,.35,palette.cream,.84,.9,0,g);
      box(.55,.09,.31,palette.rim,.2,.16,.88,g);box(.7,.08,.27,palette.path,.2,.08,1.12,g);
      box(.2,.5,.25,h.color,.52,1.96,-.36,g);box(.28,.07,.32,palette.rim,.52,2.22,-.36,g);
      if(index===1){const awning=box(1.72,.07,.55,palette.cream,0,1.15,.92,g);awning.rotation.x=.17;for(let k=0;k<6;k++)box(.14,.08,.56,h.color,-.72+k*.29,1.17,.92,g);}
      if(index===2){box(.57,.07,.32,palette.wood,-.52,.64,.84,g);for(let k=0;k<3;k++)box(.11,.28+.03*k,.13,[palette.coral,palette.green,palette.slate][k],-.68+k*.14,.82,.84,g);}
      if(index===3){box(.1,.68,.1,palette.wood,1.05,.38,.72,g);box(.32,.24,.3,h.color,1.05,.78,.72,g);box(.14,.025,.03,palette.cream,1.05,.79,.885,g);}
      h.entry=new T.Vector3(h.x+.2,0,h.z+1.4);h.label=document.querySelector(`.house-label[data-house="${h.id}"]`);
      // Stepping stones connect the central plaza to each entrance.
      const start=new T.Vector3(h.x*.38,0,h.z*.38+.35);
      for(let k=0;k<5;k++){const pos=start.clone().lerp(h.entry,k/5);const stone=box(.48,.035,.29,palette.path,pos.x,.055,pos.z);stone.rotation.y=Math.atan2(h.entry.x-start.x,h.entry.z-start.z);}
    });
    function tree(x,z,s=1){const g=new T.Group();g.position.set(x,0,z);g.scale.setScalar(s);scene.add(g);cylinder(.4,.43,.14,palette.rim,0,.08,0,g);cylinder(.34,.34,.025,palette.earth,0,.16,0,g);cylinder(.07,.1,1.1,palette.trunk,0,.67,0,g,8);ball(.58,palette.leaf,0,1.6,0,g).scale.set(1,1.15,1);ball(.43,palette.leafLight,.26,1.67,.12,g);ball(.4,palette.leaf,-.24,1.6,.07,g);}
    [[-4.9,-.35,.95],[-4.25,-3.3,1.05],[-.95,-4.85,.9],[4.25,-3.4,.95],[5.1,-.3,1.08],[4.2,3.4,.9],[-4.15,3.65,.85],[1.55,5.0,1],[-1.8,5.1,.8]].forEach(t=>tree(...t));
    function pot(x,z){cylinder(.19,.13,.3,palette.coral,x,.19,z,scene,12);for(let i=0;i<5;i++){const a=i*1.26;ball(.115,palette.green,x+Math.sin(a)*.09,.43,z+Math.cos(a)*.09).scale.y=1.8;}}
    [[-2,-.9],[1.3,-2.3],[-2,3.1],[2.2,3.5],[.5,4.7]].forEach(t=>pot(...t));
    const bench=new T.Group();bench.position.set(-.2,0,3.85);bench.rotation.y=-.13;scene.add(bench);
    for(let i=0;i<4;i++)box(1.15,.055,.09,palette.wood,0,.43,i*.105,bench);
    for(let i=0;i<3;i++)box(1.15,.09,.05,palette.wood,0,.68+i*.12,-.08,bench);
    [-.45,.45].forEach(x=>{box(.075,.83,.075,palette.green,x,.44,-.1,bench);box(.075,.4,.075,palette.green,x,.22,.32,bench)});
    // Deterministic grass tufts stay outside the walking plaza and houses.
    let seed=23;const random=()=>{seed=(seed*1664525+1013904223)>>>0;return seed/4294967296};
    for(let i=0;i<140;i++){const a=random()*Math.PI*2,r=2.8+random()*3.2,x=Math.cos(a)*r,z=Math.sin(a)*r;if(HOUSES.some(h=>Math.hypot(x-h.x,z-h.z)<1.5))continue;const blade=mesh(new T.ConeGeometry(.027,.09+random()*.09,3),palette.green,x,.09,z);blade.castShadow=false;}
    const avatar=new T.Group();avatar.position.set(0,.07,.5);scene.add(avatar);
    const target=avatar.position.clone();target.y=.07;
    const ring=mesh(new T.RingGeometry(.3,.34,40),palette.wood,0,.07,.5);ring.rotation.x=-Math.PI/2;ring.castShadow=false;
    const marker=mesh(new T.RingGeometry(.16,.2,32),palette.wood,0,.075,0);marker.rotation.x=-Math.PI/2;marker.visible=false;marker.castShadow=false;
    let hamster,paused=false,pointer=null,blockedHouse=null,clock=new T.Clock(),walkTime=0;
    const keys=new Set(),reduced=matchMedia('(prefers-reduced-motion: reduce)');
    const bytes=Uint8Array.from(atob(window.HAMSTER_GLB),c=>c.charCodeAt(0));
    new GLTFLoader().parse(bytes.buffer,'',gltf=>{
      hamster=gltf.scene;const bounds=new T.Box3().setFromObject(hamster),size=bounds.getSize(new T.Vector3()),center=bounds.getCenter(new T.Vector3());
      const scale=1.13/size.y;hamster.scale.setScalar(scale);hamster.position.set(-center.x*scale,-bounds.min.y*scale,-center.z*scale);hamster.traverse(o=>{if(o.isMesh){o.castShadow=true;o.receiveShadow=true}});avatar.add(hamster);loading.hidden=true;
    },()=>{loading.textContent='ハムスターを読み込めませんでした。家のラベルからご覧ください。';loading.classList.add('error')});
    const ray=new T.Raycaster(),plane=new T.Plane(new T.Vector3(0,1,0),0),point=new T.Vector3();
    function setTarget(e){const r=canvas.getBoundingClientRect();ray.setFromCamera(new T.Vector2((e.clientX-r.left)/r.width*2-1,-(e.clientY-r.top)/r.height*2+1),camera);if(ray.ray.intersectPlane(plane,point)){target.set(point.x,.07,point.z);const len=Math.hypot(target.x,target.z);if(len>5.95){target.x*=5.95/len;target.z*=5.95/len}marker.position.set(target.x,.075,target.z);marker.visible=true}}
    canvas.addEventListener('pointerdown',e=>{if(paused||pointer!==null||e.button!==0)return;pointer=e.pointerId;canvas.setPointerCapture(pointer);canvas.focus({preventScroll:true});setTarget(e)});
    canvas.addEventListener('pointermove',e=>{if(e.pointerId===pointer&&!paused)setTarget(e)});
    canvas.addEventListener('pointerup',e=>{if(e.pointerId===pointer){if(!paused)setTarget(e);pointer=null}});
    canvas.addEventListener('pointercancel',()=>{pointer=null;target.copy(avatar.position);marker.visible=false});
    canvas.addEventListener('lostpointercapture',()=>{pointer=null});
    canvas.addEventListener('keydown',e=>{if(['ArrowUp','ArrowDown','ArrowLeft','ArrowRight'].includes(e.key)&&!paused){keys.add(e.key);e.preventDefault()}});
    window.addEventListener('keyup',e=>keys.delete(e.key));canvas.addEventListener('blur',()=>keys.clear());window.addEventListener('blur',()=>{keys.clear();target.copy(avatar.position);pointer=null});
    window.addEventListener('town:pause',()=>{paused=true;keys.clear();pointer=null;target.copy(avatar.position);marker.visible=false});
    window.addEventListener('town:resume',()=>{paused=false});
    window.addEventListener('town:reset',()=>{avatar.position.set(0,.07,.5);avatar.rotation.y=0;target.copy(avatar.position);blockedHouse=null;keys.clear();marker.visible=false;document.querySelector('#walk-status').textContent='はじめの位置に戻りました'});
    function resize(){const w=container.clientWidth,h=container.clientHeight;renderer.setSize(w,h,false);const aspect=w/h;const halfWidth=w<700?7.7:Math.max(8,aspect*4.8);camera.left=-halfWidth;camera.right=halfWidth;camera.top=halfWidth/aspect;camera.bottom=-halfWidth/aspect;camera.updateProjectionMatrix();camera.updateMatrixWorld();}
    new ResizeObserver(resize).observe(container);resize();
    const screenPos=new T.Vector3();const tag=document.querySelector('#avatar-tag');
    function project(x,y,z){screenPos.set(x,y,z).project(camera);return{x:(screenPos.x*.5+.5)*container.clientWidth,y:(-screenPos.y*.5+.5)*container.clientHeight}}
    function canWalk(x,z){return Math.hypot(x,z)<6 && !HOUSES.some(h=>Math.abs(x-h.x)<1.03&&Math.abs(z-h.z)<.96)}
    function frame(){requestAnimationFrame(frame);const dt=Math.min(clock.getDelta(),.045);if(document.hidden)return;
      let moving=false;
      if(!paused&&hamster){
        if(keys.size){const dx=Number(keys.has('ArrowRight'))-Number(keys.has('ArrowLeft')),dz=Number(keys.has('ArrowDown'))-Number(keys.has('ArrowUp'));target.set(avatar.position.x+dx,.07,avatar.position.z+dz);marker.visible=false;}
        const dx=target.x-avatar.position.x,dz=target.z-avatar.position.z,d=Math.hypot(dx,dz);
        if(d>.045){const step=Math.min(d,2.5*dt),nx=avatar.position.x+dx/d*step,nz=avatar.position.z+dz/d*step;
          if(canWalk(nx,nz)){avatar.position.x=nx;avatar.position.z=nz;moving=true}else if(canWalk(nx,avatar.position.z)){avatar.position.x=nx;moving=true}else if(canWalk(avatar.position.x,nz)){avatar.position.z=nz;moving=true}else{target.copy(avatar.position);marker.visible=false}
          if(moving){const angle=Math.atan2(dx,dz);avatar.rotation.y+=Math.atan2(Math.sin(angle-avatar.rotation.y),Math.cos(angle-avatar.rotation.y))*Math.min(1,dt*12);}
        }else marker.visible=false;
        walkTime+=dt*(moving?11:0);avatar.position.y=.07+(moving&&!reduced.matches?Math.abs(Math.sin(walkTime))*.035:0);
        if(blockedHouse&&avatar.position.distanceTo(blockedHouse.entry)>1.35)blockedHouse=null;
        for(const h of HOUSES){const near=Math.hypot(avatar.position.x-h.entry.x,avatar.position.z-h.entry.z)<ENTRY_RADIUS;h.label.classList.toggle('near',near);if(near&&h!==blockedHouse){blockedHouse=h;document.querySelector('#walk-status').textContent=h.name+'に到着';window.dispatchEvent(new CustomEvent('town:enter',{detail:h.id}));break;}}
      }
      ring.position.set(avatar.position.x,.067,avatar.position.z);
      for(const h of HOUSES){const p=project(h.x,h.labelY,h.z);const w=h.label.offsetWidth;const x=Math.max(w/2+8,Math.min(container.clientWidth-w/2-8,p.x));h.label.style.transform=`translate(${x}px,${p.y}px) translate(-50%,-100%)`;h.label.style.opacity='1';}
      const p=project(avatar.position.x,1.47,avatar.position.z);tag.style.transform=`translate(${p.x}px,${p.y}px) translate(-50%,-100%)`;tag.style.opacity=hamster?'1':'0';
      renderer.render(scene,camera);
    }
    canvas.addEventListener('webglcontextlost',e=>{e.preventDefault();paused=true;loading.hidden=false;loading.textContent='3D表示が停止しました。ページを再読み込みするか、下のメニューをご利用ください。';loading.classList.add('error')});
    window.townReady=true;frame();
  }catch(error){console.error(error);loading.textContent='この環境では3Dの街を表示できません。下のメニューから各ページをご覧いただけます。';loading.classList.add('error');}
})();
