/* 一本道の3D世界。既存の同梱Three.jsとhamster GLBを使用。
 * 進行度は TownState.snapshot.t だけ。位置は path.getPointAt(t) から導出。
 * 道の制御点：PATH_POINTS / 家の順序・t：script.jsのstops。
 * file:// の画像テクスチャは PORTFOLIO_SCREENSHOTS の埋め込みデータを使用。
 */
(() => {
  'use strict';
  const $=s=>document.querySelector(s), controller=window.TownState;
  const error=message=>{$('#world-error').hidden=false;$('#world-error').textContent=message;controller.ready(false)};
  if(!window.TownVendor){error('街を読み込めませんでした。下のメニューから全作品をご覧いただけます。');return;}
  const {THREE:T,GLTFLoader}=TownVendor;
  try {
    const palette={
      ground:0xf1f4f5,road:0xaad8e8,roadEdge:0xdcebf0,white:0xfafcfb,
      wood:0xbba187,woodLight:0xe7d9c4,ink:0x294956,trunk:0xa3ada8,
      leaf:0xd8e7df,leafBlue:0xc9dfe4,metal:0x9cb0b7,
      blue:0x8bbfd4,peach:0xdfc6b9,green:0xb9ccbb,yellow:0xe4d8b5,
      red:0xca8e85,rubber:0x71878e,glass:0xd8eaf0,shadow:0x425e68
    };
    const canvas=$('#town'),container=$('#world'),scene=new T.Scene();
    scene.background=new T.Color(palette.ground);
    const renderer=new T.WebGLRenderer({canvas,antialias:true});
    renderer.setPixelRatio(Math.min(devicePixelRatio||1,1.8));
    renderer.shadowMap.enabled=true;renderer.shadowMap.type=T.PCFSoftShadowMap;
    renderer.outputColorSpace=T.SRGBColorSpace;renderer.toneMapping=T.ACESFilmicToneMapping;renderer.toneMappingExposure=1.05;
    scene.add(new T.HemisphereLight(palette.white,0xc5d4d8,2.4));
    const sun=new T.DirectionalLight(0xffffff,2.6);sun.position.set(-12,24,15);sun.castShadow=true;
    sun.shadow.mapSize.set(2048,2048);Object.assign(sun.shadow.camera,{left:-18,right:18,top:18,bottom:-18,near:.5,far:70});
    sun.shadow.normalBias=.04;sun.shadow.bias=-.0002;sun.shadow.radius=5;scene.add(sun);scene.add(sun.target);
    const materials=new Map();
    function material(color){
      if(!materials.has(color)){
        const mat=new T.MeshStandardMaterial({color,roughness:.92});
        mat.userData.base=new T.Color(color);materials.set(color,mat);
      }
      return materials.get(color);
    }
    function mesh(geometry,color,pos=[0,0,0],parent=scene){
      const m=new T.Mesh(geometry,material(color));m.position.set(...pos);m.castShadow=true;m.receiveShadow=true;parent.add(m);return m;
    }
    const box=(w,h,d,c,x,y,z,p)=>mesh(new T.BoxGeometry(w,h,d),c,[x,y,z],p);
    const cylinder=(r1,r2,h,c,x,y,z,p,seg=16)=>mesh(new T.CylinderGeometry(r1,r2,h,seg),c,[x,y,z],p);
    const ball=(r,c,x,y,z,p)=>mesh(new T.SphereGeometry(r,12,10),c,[x,y,z],p);
    const ground=new T.Mesh(new T.PlaneGeometry(180,180),new T.MeshBasicMaterial({color:palette.ground}));
    ground.rotation.x=-Math.PI/2;ground.position.y=-.065;scene.add(ground);
    const shadow=new T.Mesh(new T.PlaneGeometry(160,160),new T.ShadowMaterial({color:palette.shadow,opacity:.105}));
    shadow.rotation.x=-Math.PI/2;shadow.position.y=-.025;shadow.receiveShadow=true;scene.add(shadow);
    const PATH_POINTS=[[-1,0,-28],[-3.8,0,-19],[2.8,0,-7],[-2.8,0,7],[2.7,0,21],[.3,0,30]];
    const path=new T.CatmullRomCurve3(PATH_POINTS.map(p=>new T.Vector3(...p)),false,'catmullrom',.38);
    path.arcLengthDivisions=700;path.updateArcLengths();
    const samples=Array.from({length:501},(_,i)=>path.getPointAt(i/500));
    const normal=t=>{const v=path.getTangentAt(t);return new T.Vector3(v.z,0,-v.x).normalize()};
    function roadStrip(halfWidth,y,color){
      const positions=[],indices=[];
      for(let i=0;i<=420;i++){
        const t=i/420,p=path.getPointAt(t),n=normal(t);
        for(const side of [-1,1])positions.push(p.x+n.x*halfWidth*side,y,p.z+n.z*halfWidth*side);
        if(i<420){const k=i*2;indices.push(k,k+2,k+1,k+1,k+2,k+3);}
      }
      const geo=new T.BufferGeometry();geo.setAttribute('position',new T.Float32BufferAttribute(positions,3));geo.setIndex(indices);geo.computeVertexNormals();
      const m=new T.Mesh(geo,material(color));m.receiveShadow=true;scene.add(m);return m;
    }
    roadStrip(1.68,.003,palette.roadEdge);roadStrip(1.48,.013,palette.road);
    const roadLength=path.getLength();
    for(let i=0;i<42;i++){
      const t=(i+.3)/42,p=path.getPointAt(t),tan=path.getTangentAt(t);
      const dash=box(.045,.012,.38,palette.white,p.x,.026,p.z);dash.rotation.y=Math.atan2(tan.x,tan.z);dash.castShadow=false;
    }

    const houses=controller.stops.map((s,i)=>{
      const p=path.getPointAt(s.t),n=normal(s.t),g=new T.Group();g.position.copy(p).addScaledVector(n,s.side*4.6);
      // All door fronts face the fixed isometric viewing direction, including right-side houses.
      g.rotation.y=.43;scene.add(g);
      const roofColor=[palette.peach,palette.blue,palette.green,palette.yellow][i];
      box(2.55,.15,2.08,palette.white,0,.075,0,g);
      box(2.28,1.5,1.85,palette.white,0,.89,0,g);
      const shape=new T.Shape();shape.moveTo(-1.36,0);shape.lineTo(0,.93);shape.lineTo(1.36,0);shape.closePath();
      mesh(new T.ExtrudeGeometry(shape,{depth:2.24,bevelEnabled:false}),roofColor,[0,1.65,-1.12],g);
      box(.32,.68,.36,palette.white,.62,2.25,-.46,g);box(.44,.07,.46,roofColor,.62,2.6,-.46,g);
      box(.72,1.08,.06,palette.ink,0,.72,.958,g);
      const hinge=new T.Group();hinge.position.set(-.33,.19,.998);g.add(hinge);
      box(.65,1.04,.085,roofColor,.325,.52,0,hinge);ball(.04,palette.woodLight,.53,.53,.064,hinge);
      box(.98,.07,.46,palette.white,0,.11,1.16,g);
      for(const x of [-.78,.78]){
        box(.43,.57,.06,palette.woodLight,x,1.04,.955,g);
        box(.34,.47,.07,palette.glass,x,1.04,.985,g);
        box(.025,.47,.08,palette.white,x,1.04,1,g);
      }
      box(.07,.56,.66,palette.glass,1.15,1.02,0,g);
      if(i===1){
        for(let k=0;k<4;k++)box(.14,.18+.055*k,.12,[palette.peach,palette.green,palette.blue,palette.yellow][k],-.99+k*.16,.86,1.04,g);
      }
      if(i===2){
        const awning=box(2.45,.075,.58,roofColor,0,1.48,1.13,g);awning.rotation.x=.12;
        [-1.04,1.04].forEach(x=>cylinder(.035,.035,1.25,palette.wood,x,.7,1.36,g));
      }
      if(i===3){box(.08,.9,.08,palette.metal,1.55,.45,.8,g);box(.42,.32,.34,roofColor,1.55,.98,.8,g);}
      g.traverse(o=>{if(o.isMesh){o.material=o.material.clone();o.material.userData.base=o.material.color.clone();}});
      // Entry path and sign sit beside, never in front of, the door sightline.
      g.updateMatrixWorld(true);
      const doorstep=g.localToWorld(new T.Vector3(0,0,1.5));
      const walkStart=p.clone().addScaledVector(n,s.side*1.7),walkDirection=doorstep.clone().sub(walkStart);
      for(let k=0;k<5;k++){
        const r=walkStart.clone().lerp(doorstep,k/4);
        const stone=box(.65,.025,.38,palette.white,r.x,.035,r.z);stone.rotation.y=Math.atan2(walkDirection.x,walkDirection.z);
      }
      const sign=new T.Group();
      sign.position.copy(p).addScaledVector(n,s.side*2.4).addScaledVector(path.getTangentAt(s.t),-2.35);
      sign.rotation.y=.43;scene.add(sign);
      const boardWidth=i===3?3.8:3.5,boardHeight=i===3?1.4:1.05;
      cylinder(.065,.07,1.42,palette.wood,0,.71,0,sign);
      const board=box(boardWidth,boardHeight,.12,palette.woodLight,0,1.65,0,sign);
      const signCanvas=document.createElement('canvas');signCanvas.width=1536;signCanvas.height=512;
      const ctx=signCanvas.getContext('2d');
      if(ctx){
        ctx.fillStyle='#e7d9c4';ctx.fillRect(0,0,1536,512);
        ctx.strokeStyle='#baa18a';ctx.lineWidth=10;ctx.strokeRect(20,20,1496,472);
        ctx.fillStyle='#294956';ctx.textAlign='center';ctx.textBaseline='middle';
        ctx.font='46px "Yu Gothic",sans-serif';ctx.fillText(s.number+'  /  '+s.english,768,102);
        ctx.font='bold 136px "Yu Gothic",sans-serif';
        if(i===3){ctx.fillText('スキル /',768,242);ctx.fillText('お問い合わせ',768,401,1410);}
        else ctx.fillText(s.title,768,300,1410);
      }
      const texture=new T.CanvasTexture(signCanvas);texture.colorSpace=T.SRGBColorSpace;
      const face=new T.Mesh(new T.PlaneGeometry(boardWidth-.08,boardHeight-.06),new T.MeshBasicMaterial({map:texture,side:T.DoubleSide}));
      face.position.set(0,1.65,.068);sign.add(face);
      g.updateMatrixWorld(true);
      const doorPoint=g.localToWorld(new T.Vector3(0,1.55,1.25));
      return {...s,group:g,hinge,sign,doorPoint,doorAngle:0,doorTarget:0};
    });

    function roadside(t,offset){return path.getPointAt(t).addScaledVector(normal(t),offset)}
    function tree(t,offset,scale=1,color=palette.leaf){
      const p=roadside(t,offset),g=new T.Group();g.position.copy(p);g.scale.setScalar(scale);scene.add(g);
      cylinder(.055,.09,1.0,palette.trunk,0,.52,0,g);
      const crown=ball(.6,color,0,1.53,0,g);crown.scale.set(.86,1.5,.86);
      cylinder(.36,.4,.06,palette.white,0,.02,0,g);
    }
    [[.015,4,1.1],[.04,-5.5,.85],[.06,6,1.2],[.19,-3.5,.8],[.22,-4.8,1.1],[.25,5,1.35],[.27,6.3,.85],[.44,-4.2,1.25],[.45,-6,1],[.48,4.5,.85],[.55,5.1,1.2],[.59,6,.85],[.73,-4,.95],[.74,-6,1.2],[.77,4.1,.8],[.95,-4.4,1.2],[.97,5,1.3]].forEach((v,i)=>tree(...v,i%3===0?palette.leafBlue:palette.leaf));
    function lamp(t,offset){
      const p=roadside(t,offset),g=new T.Group();g.position.copy(p);scene.add(g);
      cylinder(.05,.075,2.6,palette.metal,0,1.3,0,g);box(.57,.055,.065,palette.metal,.22,2.58,0,g);
      box(.36,.13,.27,palette.white,.46,2.52,0,g);
    }
    [[.07,2.05],[.28,-2.15],[.51,2.3],[.81,-2.1],[.95,2.05]].forEach(v=>lamp(...v));
    function crosswalk(t){
      const p=path.getPointAt(t),g=new T.Group();g.position.copy(p);g.rotation.y=Math.atan2(path.getTangentAt(t).x,path.getTangentAt(t).z);scene.add(g);
      for(let i=0;i<6;i++){const stripe=box(2.6,.015,.16,palette.white,0,.045,-.78+i*.3,g);stripe.castShadow=false;}
      const signal=new T.Group();signal.position.set(1.9,0,1.2);g.add(signal);
      cylinder(.045,.06,1.65,palette.metal,0,.82,0,signal);box(.28,.71,.24,palette.ink,0,1.91,0,signal);
      [palette.red,palette.yellow,palette.green].forEach((c,i)=>ball(.067,c,0,2.12-i*.2,.145,signal));
    }
    [.22,.54,.78].forEach(crosswalk);
    function bench(t,offset){
      const p=roadside(t,offset),g=new T.Group();g.position.copy(p);g.rotation.y=Math.atan2(normal(t).x,normal(t).z);scene.add(g);
      for(let i=0;i<3;i++)box(1.6,.065,.12,palette.wood,0,.48,i*.13,g);
      for(let i=0;i<2;i++)box(1.6,.16,.06,palette.wood,0,.79+i*.19,-.1,g);
      [-.62,.62].forEach(x=>{box(.06,.96,.06,palette.metal,x,.5,-.13,g);box(.06,.46,.06,palette.metal,x,.25,.3,g)});
    }
    [[.29,2.5],[.71,-2.5],[.97,-2.7]].forEach(v=>bench(...v));
    function car(t,offset,color){
      const p=roadside(t,offset),g=new T.Group();g.position.copy(p);g.rotation.y=Math.atan2(path.getTangentAt(t).x,path.getTangentAt(t).z);scene.add(g);
      box(.86,.39,1.62,color,0,.43,0,g);box(.72,.42,.81,color,0,.8,-.15,g);
      box(.63,.3,.025,palette.glass,0,.82,.27,g);box(.63,.3,.025,palette.glass,0,.82,-.57,g);
      for(const x of [-.44,.44])for(const z of [-.5,.5]){const tyre=cylinder(.19,.19,.1,palette.rubber,x,.24,z,g,16);tyre.rotation.z=Math.PI/2;}
      [-.26,.26].forEach(x=>box(.16,.09,.03,palette.white,x,.46,.83,g));
    }
    car(.055,-2.1,palette.peach);car(.465,2.1,palette.blue);car(.835,-2.1,palette.yellow);
    // Sparse paving clusters give the road a rhythm without evenly repeated scenery.
    [[.175,2.4],[.32,-3.2],[.58,3.6],[.75,-3.4],[.92,-3]].forEach(([t,o],i)=>{const p=roadside(t,o);cylinder(.31,.4,.12,palette.white,p.x,.055,p.z);tree(t+.009,o+.7,.42,i%2?palette.leaf:palette.leafBlue);});

    const avatar=new T.Group();avatar.name='RoadAvatar';scene.add(avatar);avatar.visible=false;
    const ring=new T.Mesh(new T.RingGeometry(.37,.39,40),new T.MeshBasicMaterial({color:palette.blue,transparent:true,opacity:.9,side:T.DoubleSide}));ring.rotation.x=-Math.PI/2;scene.add(ring);
    const camera=new T.OrthographicCamera(-12,12,10,-10,.1,150);
    const cameraOffset=new T.Vector3(9,14,18);
    let cameraFocus=path.getPointAt(0),openingStart=null,model=null,lastT=0,elapsed=0,frameId;
    let gesture=null,keys=new Set(),zoom=1,activeNear=null,environmentDim=0;
    let width=1,height=1;const clock=new T.Clock();
    const groundPlane=new T.Plane(new T.Vector3(0,1,0),0),raycaster=new T.Raycaster();
    const prompt=$('#approach-prompt'),handle=$('#avatar-handle');

    function resize(){
      width=container.clientWidth||window.innerWidth;height=container.clientHeight||window.innerHeight;
      renderer.setSize(width,height,false);
      const aspect=width/Math.max(1,height),half=width<700?6.5:Math.max(9.8,aspect*7.5);
      houses.forEach(h=>h.sign.scale.setScalar(width<700?1.65:1));
      camera.left=-half;camera.right=half;camera.top=half/aspect;camera.bottom=-half/aspect;camera.updateProjectionMatrix();
    }
    const resizeObserver=new ResizeObserver(resize);resizeObserver.observe(container);resize();
    function nearestT(point){let distance=Infinity,best=0;for(let i=0;i<samples.length;i++){const d=(samples[i].x-point.x)**2+(samples[i].z-point.z)**2;if(d<distance){distance=d;best=i/500;}}return best;}
    function dragPoint(e,g){
      if(g.mode==='handle'){
        const dy=e.clientY-g.y,dx=e.clientX-g.x;
        return g.t+(dy+dx*.22)/Math.max(320,height)*.34;
      }
      const r=canvas.getBoundingClientRect();raycaster.setFromCamera(new T.Vector2((e.clientX-r.left)/r.width*2-1,-(e.clientY-r.top)/r.height*2+1),g.camera);
      const p=new T.Vector3();return raycaster.ray.intersectPlane(groundPlane,p)?nearestT(p):g.t;
    }
    function begin(e,mode){
      if(controller.snapshot.phase!=='walking'||gesture||e.button!==0)return;
      if(mode==='canvas'&&e.pointerType==='touch')return; // canvasのタッチはブラウザーの縦スクロールに任せる
      const target=e.currentTarget;
      gesture={id:e.pointerId,target,mode,x:e.clientX,y:e.clientY,t:controller.snapshot.t,camera:camera.clone()};
      target.setPointerCapture?.(e.pointerId);
      if(mode==='canvas')canvas.focus({preventScroll:true});
      if(mode==='canvas')controller.seek(dragPoint(e,gesture));
      e.preventDefault();
    }
    function move(e){if(gesture?.id===e.pointerId){controller.seek(dragPoint(e,gesture));e.preventDefault();}}
    function end(e){if(gesture?.id!==e.pointerId)return;controller.seek(dragPoint(e,gesture));releaseGesture(false);}
    function releaseGesture(cancel=true){
      if(gesture){const g=gesture;gesture=null;if(g.target.hasPointerCapture?.(g.id))g.target.releasePointerCapture(g.id);}
      if(cancel)controller.clearIntent();
    }
    [canvas,$('#drag-walk'),handle].forEach(el=>{
      el.addEventListener('pointerdown',e=>begin(e,el===canvas?'canvas':'handle'));
      el.addEventListener('pointermove',move);el.addEventListener('pointerup',end);
      el.addEventListener('pointercancel',()=>releaseGesture(true));
      el.addEventListener('lostpointercapture',()=>{if(gesture)releaseGesture(true)});
    });
    document.addEventListener('keydown',e=>{
      if(controller.snapshot.phase!=='walking'||!['ArrowUp','ArrowDown','ArrowLeft','ArrowRight'].includes(e.key))return;
      if(e.target.closest?.('input,textarea,select,[data-house]'))return;
      e.preventDefault();
      if(controller.snapshot.reduced){if(!e.repeat)controller.move(controller.snapshot.t+(['ArrowDown','ArrowRight'].includes(e.key)?.025:-.025));}
      else keys.add(e.key);
    });
    window.addEventListener('keyup',e=>keys.delete(e.key));
    function clearInput(){keys.clear();releaseGesture(true);}
    window.addEventListener('town:clear-input',clearInput);
    window.addEventListener('blur',clearInput);
    document.addEventListener('visibilitychange',()=>{if(document.hidden)clearInput()});
    window.addEventListener('town:start',()=>{openingStart=performance.now();avatar.visible=!!model;});
    window.addEventListener('town:door',e=>{houses.forEach(h=>{h.doorTarget=h.id===e.detail.id&&e.detail.open?-Math.PI*.52:0;});});
    canvas.addEventListener('webglcontextlost',e=>{e.preventDefault();clearInput();error('3D表示が停止しました。下のメニューから作品をご覧いただけます。');});

    // Same wheel component is used in the opening and the external-link transition.
    let wheel;
    try{wheel=createWheel(T,palette);}catch(e){
      console.warn('Paper wheel unavailable',e);
      $('#wheel-host').classList.add('wheel-fallback');
      wheel={setHamster(){},render(){}};
    }
    function loadHamster(){
      if(!window.HAMSTER_GLB)throw new Error('hamster data missing');
      const bytes=Uint8Array.from(atob(window.HAMSTER_GLB),c=>c.charCodeAt(0));
      new GLTFLoader().parse(bytes.buffer,'',gltf=>{
        model=gltf.scene;const bounds=new T.Box3().setFromObject(model),size=bounds.getSize(new T.Vector3()),center=bounds.getCenter(new T.Vector3());
        const scale=1.2/size.y;model.scale.setScalar(scale);model.position.set(-center.x*scale,-bounds.min.y*scale,-center.z*scale);
        model.traverse(o=>{if(o.isMesh){o.castShadow=true;o.receiveShadow=true;}});
        avatar.add(model);wheel.setHamster(model);
        controller.ready(true);window.townReady=true;
        if(!['intro','loading'].includes(controller.snapshot.phase))avatar.visible=true;
      },()=>error('ハムスターを読み込めませんでした。メニューから作品をご覧ください。'));
    }
    loadHamster();

    const projection=new T.Vector3();
    function screen(p){projection.copy(p).project(camera);return {x:(projection.x*.5+.5)*width,y:(-projection.y*.5+.5)*height};}
    function dimMaterial(mat,amount){
      const base=mat.userData.base;if(!base)return;
      const gray=base.r*.2126+base.g*.7152+base.b*.0722;
      mat.color.copy(base).lerp(new T.Color(gray*.84,gray*.87,gray*.89),amount);
    }
    function frame(){
      frameId=requestAnimationFrame(frame);const dt=Math.min(clock.getDelta(),.045);if(document.hidden)return;
      const movingByGoal=controller.tick(dt),s=controller.snapshot;
      if(s.phase==='walking'&&keys.size){
        const direction=Number(keys.has('ArrowDown')||keys.has('ArrowRight'))-Number(keys.has('ArrowUp')||keys.has('ArrowLeft'));
        controller.move(s.t+direction*dt*.058);
      }
      const state=controller.snapshot,t=state.t,p=path.getPointAt(t),tan=path.getTangentAt(t);
      const changed=Math.abs(t-lastT)>.00001,moving=state.phase==='walking'&&(changed||movingByGoal);
      elapsed+=dt;
      avatar.position.copy(p);avatar.position.y=.045+(moving&&!state.reduced?Math.abs(Math.sin(elapsed*13))*.045:0);
      const forward=t>=lastT?1:-1;
      if(changed){const angle=Math.atan2(tan.x*forward,tan.z*forward);avatar.rotation.y=state.reduced?angle:avatar.rotation.y+Math.atan2(Math.sin(angle-avatar.rotation.y),Math.cos(angle-avatar.rotation.y))*Math.min(1,dt*11);}
      else if(state.phase==='opening')avatar.rotation.y=Math.atan2(tan.x,tan.z);
      ring.position.set(p.x,.035,p.z);ring.visible=avatar.visible;
      if(state.phase==='walking'){
        const current=houses.find(h=>h.id===activeNear);
        const candidate=current&&Math.abs(t-current.t)<.042?current:houses.find(h=>Math.abs(t-h.t)<.029);
        activeNear=candidate?.id||null;controller.setNear(activeNear);
      }else{activeNear=null;controller.setNear(null);}
      const focused=houses.find(h=>h.id===(controller.snapshot.near||state.activeHouse));
      let focus=p.clone();focus.y=.5;
      if(focused&&!state.reduced)focus.lerp(focused.group.position.clone().setY(.8),.27);
      const desiredZoom=focused&&!state.reduced?1.16:1;
      let opening=1;
      if(['loading','intro'].includes(state.phase)){
        focus=path.getPointAt(.2);focus.y=.7;zoom=.48;avatar.visible=false;opening=0;
      }else if(state.phase==='opening'&&openingStart!==null){
        opening=state.reduced?1:Math.min(1,(performance.now()-openingStart)/800);
        const eased=1-(1-opening)**3;focus.lerp(path.getPointAt(.2),1-eased);zoom=.48+.52*eased;
        avatar.visible=!!model;avatar.scale.setScalar(Math.max(.001,eased));
      }else{
        avatar.visible=!!model;avatar.scale.setScalar(1);
        zoom=state.reduced?1:zoom+(desiredZoom-zoom)*(1-Math.exp(-dt*4.5));
      }
      if(state.reduced||!camera.position.lengthSq())cameraFocus.copy(focus);else cameraFocus.lerp(focus,1-Math.exp(-dt*7));
      camera.position.copy(cameraFocus).add(cameraOffset);camera.lookAt(cameraFocus);camera.zoom=zoom;camera.updateProjectionMatrix();camera.updateMatrixWorld();
      sun.position.copy(cameraFocus).add(new T.Vector3(-12,24,15));sun.target.position.copy(cameraFocus);sun.target.updateMatrixWorld();
      const dimTarget=focused&&!state.reduced?.5:0;environmentDim+=(dimTarget-environmentDim)*(1-Math.exp(-dt*4));
      materials.forEach(mat=>dimMaterial(mat,environmentDim));
      for(const h of houses){
        h.hinge.rotation.y=state.reduced?h.doorTarget:h.hinge.rotation.y+(h.doorTarget-h.hinge.rotation.y)*(1-Math.exp(-dt*12));
        h.group.traverse(o=>{if(o.isMesh)dimMaterial(o.material,focused&&focused.id!==h.id?environmentDim:0)});
        const signAngle=focused?.id===h.id?.5:.43;h.sign.rotation.y=state.reduced?.43:h.sign.rotation.y+(signAngle-h.sign.rotation.y)*dt*3;
      }
      if(controller.snapshot.near){
        const h=houses.find(h=>h.id===controller.snapshot.near),v=screen(h.doorPoint);
        const pw=prompt.offsetWidth||250,ph=prompt.offsetHeight||90;
        const x=Math.max(pw/2+14,Math.min(width-pw/2-14,v.x));
        const y=Math.max(125,Math.min(height-205,v.y-ph-12));
        prompt.style.transform='translate('+x+'px,'+y+'px) translateX(-50%)';
      }
      const v=screen(avatar.position.clone().add(new T.Vector3(0,-.05,0)));
      handle.style.transform='translate('+v.x+'px,'+(v.y+26)+'px) translate(-50%,-50%)';
      handle.hidden=!avatar.visible||state.phase!=='walking';
      renderer.render(scene,camera);wheel.render(dt,state.reduced);
      lastT=t;
    }
    frame();

    function createWheel(T,palette){
      const host=$('#wheel-host'),c=$('#wheel'),ws=new T.Scene();
      const wr=new T.WebGLRenderer({canvas:c,alpha:true,antialias:true});wr.setPixelRatio(Math.min(devicePixelRatio||1,1.5));wr.outputColorSpace=T.SRGBColorSpace;
      wr.toneMapping=T.ACESFilmicToneMapping;wr.toneMappingExposure=1.1;
      ws.add(new T.HemisphereLight(0xffffff,0xbacbd4,2.7));const light=new T.DirectionalLight(0xffffff,2.2);light.position.set(-3,8,8);ws.add(light);
      const wc=new T.PerspectiveCamera(36,1,.1,60);wc.position.set(5.8,2.8,10.5);wc.lookAt(0,.2,0);
      const outer=new T.Group();outer.rotation.y=-.18;outer.rotation.z=.12;ws.add(outer);
      const wheelGroup=new T.Group();outer.add(wheelGroup);
      const all=[...window.PORTFOLIO.projects,...window.PORTFOLIO.teamProjects];
      const paperEntries=all.flatMap(p=>(p.screenshots?.length?p.screenshots:[null]).map(im=>({project:p,image:im})));
      const count=Math.max(10,paperEntries.length),cards=[],radius=2.35;
      let spin=0,destination=null,selected=null,running=null;
      function paperTexture(entry){
        const cv=document.createElement('canvas');cv.width=512;cv.height=768;
        const ctx=cv.getContext('2d');if(!ctx)return new T.Texture();
        const texture=new T.CanvasTexture(cv);texture.colorSpace=T.SRGBColorSpace;
        const base=()=>{ctx.fillStyle='#fcfdfd';ctx.fillRect(0,0,512,768);ctx.fillStyle='#294956';ctx.font='bold 40px "Yu Gothic",sans-serif';ctx.textAlign='center';ctx.fillText(entry.project.title,256,705,450);texture.needsUpdate=true;};
        base();
        const source=controller.imageSource(entry.image?.src);
        if(source){
          const image=new Image();
          if(/^https?:/.test(source)&&!source.startsWith(location.origin))image.crossOrigin='anonymous';
          image.onload=()=>{base();const scale=Math.min(464/image.width,630/image.height),w=image.width*scale,h=image.height*scale;try{ctx.drawImage(image,(512-w)/2,20,w,h);texture.needsUpdate=true}catch{base()}};
          image.onerror=base;image.src=source;
        }
        return texture;
      }
      for(let i=0;i<count;i++){
        const entry=paperEntries[i%paperEntries.length]||{project:{title:'Ayaka'},image:null};
        const theta=i*Math.PI*2/count,pivot=new T.Group();pivot.rotation.z=-theta;wheelGroup.add(pivot);
        // Panels form a lightly twisted paper band; every face is an application screenshot.
        const card=new T.Mesh(new T.PlaneGeometry(1.39,2.08,1,1),new T.MeshStandardMaterial({map:paperTexture(entry),roughness:.9,side:T.DoubleSide}));
        card.position.y=radius;card.rotation.x=-Math.PI/2;card.rotation.y=Math.sin(theta)*.1;pivot.add(card);
        cards.push({pivot,entry,theta});
      }
      const base=new T.Mesh(new T.CylinderGeometry(1.18,1.3,.07,40),new T.MeshStandardMaterial({color:palette.roadEdge,roughness:1}));base.scale.z=.8;base.position.y=-2.43;ws.add(base);
      const hamster=new T.Group();hamster.position.set(0,-2.23,.36);hamster.rotation.y=1.1;ws.add(hamster);
      const armOriginal=new Map();
      function setHamster(model){
        const copy=model.clone(true);copy.scale.multiplyScalar(1.05);hamster.add(copy);running=copy;
        copy.traverse(o=>{if(/^Arm[LR]$/.test(o.name))armOriginal.set(o,o.rotation.x)});
      }
      window.addEventListener('town:wheel',e=>{
        selected=e.detail.project||null;
        const index=cards.findIndex(c=>c.entry.project.id===selected?.id);
        if(index>=0){
          // Bring the selected screenshot to the forward/right arc on the final rotation.
          const desired=cards[index].theta+.8;
          destination=desired+Math.ceil((spin-desired)/(Math.PI*2)+1)*Math.PI*2;
        }else destination=null;
        $('#wheel-caption').textContent=selected?selected.title.toUpperCase():'A LITTLE WARM-UP';
      });
      let wheelTime=0;
      return {setHamster,render(dt,reduced){
        if(host.hidden||(!$('#outbound').open&&$('#intro').hidden))return;
        const w=host.clientWidth||380,h=host.clientHeight||330;
        if(c.width!==Math.round(w*wr.getPixelRatio())||c.height!==Math.round(h*wr.getPixelRatio())){wr.setSize(w,h,false);wc.aspect=w/Math.max(1,h);wc.updateProjectionMatrix();}
        wheelTime+=dt;
        if(!reduced){
          if(destination!==null)spin+=(destination-spin)*(1-Math.exp(-dt*5.5));else spin+=dt*.65;
          wheelGroup.rotation.z=spin;
          if(running){hamster.position.y=-2.23+Math.abs(Math.sin(wheelTime*17))*.045;armOriginal.forEach((x,arm)=>{arm.rotation.x=x+Math.sin(wheelTime*17)*(arm.name==='ArmL'?1:-1)*.5});}
        }
        wr.render(ws,wc);
      }};
    }
  }catch(e){console.error(e);error('この環境では3D表示を利用できません。メニューから全作品をご覧いただけます。');}
})();
