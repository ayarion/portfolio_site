/* 一本道の3D世界。既存の同梱Three.jsとhamster GLBを使用。
 * 進行度は TownState.snapshot.t だけ。位置は path.getPointAt(t) から導出。
 * 道の制御点：PATH_POINTS / 家の順序・t：script.jsのstops。
 * GLBはgzip実ファイルをfetchし、画像テクスチャは作品を開くときに遅延読込。
 */
(() => {
  'use strict';
  const $=s=>document.querySelector(s), controller=window.TownState;
  const error=(message,cause)=>{console.error(message,cause||new Error(message));$('#world-error').hidden=false;$('#world-error').textContent=message;controller.ready(false)};
  if(!window.TownVendor){error('街の表示ライブラリを読み込めませんでした。右上のメニューから全作品をご覧いただけます。');return;}
  const {THREE:T,GLTFLoader}=TownVendor;
  // 接近ズームの調整はここだけ。1 = 通常、1.35 = 家・庭・ハムスターを一緒に見せる。
  const APPROACH_ZOOM=1.35;
  const CAMERA_OFFSET=new T.Vector3(9,14,18);
  // 幅ごとに独立調整：half=正投影の横半幅、ahead=道の先を見る量、house=接近時の家への重み。
  const CAMERA_PROFILES={phone:{half:7.1,ahead:.07,house:.72,approach:.85,offset:[0,14,22]},tablet:{half:8.4,ahead:.05,house:.60,approach:.90,offset:[3,14,21]},desktop:{half:null,ahead:0,house:.40,approach:1,offset:[9,14,18]}};
  try {
    const palette={
      ground:0xe9ecee,road:0x49bde9,roadEdge:0xd6f1fc,white:0xfffdf6,
      wood:0xbba187,woodLight:0xe7d9c4,ink:0x294956,trunk:0xa3ada8,
      leaf:0x8fcf93,leafBlue:0x89cdd1,metal:0x739fac,
      blue:0x409fc7,peach:0xe89e80,green:0x72af8a,yellow:0xe7bb60,
      red:0xc74343,rubber:0x71878e,glass:0xd8eaf0,shadow:0x425e68
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
    const ground=new T.Mesh(new T.PlaneGeometry(180,180),new T.MeshBasicMaterial({color:palette.ground,toneMapped:false}));
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
      const m=new T.Mesh(geo,new T.MeshBasicMaterial({color,toneMapped:false}));scene.add(m);return m;
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
      g.rotation.y=.43;g.scale.setScalar(1.5);scene.add(g);
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
      // Distinct front details: a welcoming porch, an atelier, animal windows, and a garden room.
      box(2.5,.09,.12,roofColor,0,1.65,1.02,g);
      box(.30,.28,.065,palette.glass,.325,.76,.06,hinge);
      function planter(x,z,c){
        cylinder(.15,.11,.26,palette.peach,x,.2,z,g);
        const shrub=ball(.22,c,x,.46,z,g);shrub.scale.y=1.15;
        ball(.065,palette.yellow,x+.10,.64,z+.03,g);
      }
      planter(-1.13,1.31,palette.green);planter(1.1,1.32,palette.leaf);
      if(i===0){
        box(1.3,.075,.85,roofColor,0,1.4,1.25,g);
        [-.57,.57].forEach(x=>box(.065,1.24,.065,palette.white,x,.73,1.57,g));
        box(1.48,.12,.9,palette.woodLight,0,.14,1.32,g);
        const plaque=document.createElement('canvas');plaque.width=512;plaque.height=220;const pc=plaque.getContext('2d');
        pc.fillStyle='#fffdf6';pc.fillRect(0,0,512,220);pc.fillStyle='#294956';pc.font='bold 100px Georgia';pc.textAlign='center';pc.textBaseline='middle';pc.fillText('Ayaka',256,115);
        const pt=new T.CanvasTexture(plaque);pt.colorSpace=T.SRGBColorSpace;
        box(.055,.7,.055,palette.wood,-.97,.44,1.8,g);
        box(.64,.28,.07,palette.woodLight,-.97,.84,1.8,g);
        const nameplate=new T.Mesh(new T.PlaneGeometry(.61,.25),new T.MeshBasicMaterial({map:pt}));nameplate.position.set(-.97,.84,1.84);g.add(nameplate);
      }
      if(i===1){
        const skylight=box(.72,.035,.56,palette.glass,.54,2.23,-.12,g);skylight.rotation.z=-.6;
        box(.035,.77,.035,palette.wood,1.44,.50,1.27,g);const easel=box(.53,.60,.06,palette.white,1.44,.85,1.27,g);easel.rotation.x=-.1;
        ball(.11,palette.blue,1.37,.95,1.32,g);box(.21,.12,.02,palette.yellow,1.55,.73,1.32,g);
        for(const x of [-.78,.78]){box(.64,.12,.26,palette.woodLight,x,.75,1.06,g);[-.15,0,.15].forEach(dx=>ball(.065,palette.peach,x+dx,.86,1.1,g));}
      }
      if(i===2){
        for(const [x,kind] of [[-.78,'rabbit'],[.78,'dog']]){
          box(.58,.71,.06,palette.ink,x,1.07,1.018,g);
          const a=new T.Group();a.position.set(x,1.06,1.085);g.add(a);
          ball(.13,kind==='rabbit'?palette.white:palette.woodLight,0,0,0,a);
          for(const side of [-1,1]){
            const ear=ball(.05,kind==='rabbit'?palette.white:palette.wood,side*.075,kind==='rabbit'?.17:.025,0,a);ear.scale.y=kind==='rabbit'?2.05:1.6;
            ball(.018,palette.ink,side*.043,.02,.115,a);
          }
          ball(.024,palette.peach,0,-.035,.13,a);box(.67,.07,.20,palette.white,x,.73,1.09,g);
        }
      }
      if(i===3){
        box(.92,1.18,1.18,palette.glass,1.59,.69,-.13,g);
        for(const x of [1.17,1.59,2.01])box(.05,1.32,1.23,palette.white,x,.73,-.13,g);
        box(1.05,.08,1.3,roofColor,1.58,1.41,-.13,g);
        for(const k of [0,1,2])planter(1.35+k*.24,-.05,palette.green);
        for(const x of [-1.42,-1.1,-.78])box(.045,.46,.055,palette.white,x,.34,1.96,g);
        box(.75,.05,.055,palette.white,-1.1,.47,1.96,g);
      }
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
      // カメラ側の道端へ置く。道の接線の「奥」へ置くと屋根に隠れるため使わない。
      sign.position.copy(path.getPointAt(Math.min(1,s.t+.065))).addScaledVector(normal(Math.min(1,s.t+.065)),s.side*2.6);
      sign.rotation.y=Math.atan2(CAMERA_OFFSET.x,CAMERA_OFFSET.z);scene.add(sign);
      const boardWidth=i===3?3.8:3.5,boardHeight=i===3?1.4:1.05;
      cylinder(.065,.07,1.42,palette.wood,0,.71,0,sign);
      const board=box(boardWidth,boardHeight,.12,palette.woodLight,0,1.65,0,sign);
      const signCanvas=document.createElement('canvas');signCanvas.width=1536;signCanvas.height=512;
      const ctx=signCanvas.getContext('2d');
      if(ctx){
        ctx.fillStyle='#fff7e7';ctx.fillRect(0,0,1536,512);
        ctx.strokeStyle='#9b7659';ctx.lineWidth=14;ctx.strokeRect(20,20,1496,472);
        ctx.fillStyle='#203c48';ctx.textAlign='center';ctx.textBaseline='middle';
        ctx.font='bold 192px "Yu Gothic",sans-serif';
        if(i===3){ctx.fillText('スキル /',768,158);ctx.fillText('お問い合わせ',768,356,1410);}
        else ctx.fillText(s.title,768,265,1410);
      }
      const texture=new T.CanvasTexture(signCanvas);texture.colorSpace=T.SRGBColorSpace;
      const face=new T.Mesh(new T.PlaneGeometry(boardWidth-.08,boardHeight-.06),new T.MeshBasicMaterial({map:texture,side:T.DoubleSide,toneMapped:false}));
      face.position.set(0,1.65,.068);sign.add(face);
      g.updateMatrixWorld(true);
      const doorPoint=g.localToWorld(new T.Vector3(0,1.55,1.25));
      return {...s,group:g,hinge,sign,boardWidth,boardHeight,doorPoint,doorAngle:0,doorTarget:0};
    });

    function roadside(t,offset){return path.getPointAt(t).addScaledVector(normal(t),offset)}
    function tree(t,offset,scale=1,color=palette.leaf){
      const p=roadside(t,offset),g=new T.Group();g.position.copy(p);g.scale.setScalar(scale);scene.add(g);
      cylinder(.055,.09,1.0,palette.trunk,0,.52,0,g);
      const crown=ball(.6,color,0,1.53,0,g);crown.scale.set(.86,1.5,.86);
      cylinder(.36,.4,.06,palette.white,0,.02,0,g);
    }
    [[.015,4,1.1],[.06,6,1.2],[.23,-6.5,.8],[.22,-4.8,1.1],[.25,5,1.35],[.27,6.3,.85],[.44,-4.2,1.25],[.45,-6,1],[.48,4.5,.85],[.55,5.1,1.2],[.59,6,.85],[.73,-4,.95],[.74,-6,1.2],[.77,4.1,.8],[.95,-4.4,1.2],[.97,5,1.3]].forEach((v,i)=>tree(...v,i%3===0?palette.leafBlue:palette.leaf));
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
    car(.055,-2.1,palette.red);car(.465,2.1,palette.blue);car(.835,-2.1,palette.yellow);
    // 赤は3つの小さな集まりに限定し、等間隔にしない。
    const post=roadside(.31,-3.4);cylinder(.07,.08,.85,palette.metal,post.x,.43,post.z);
    box(.48,.48,.38,palette.red,post.x,1.03,post.z);box(.29,.04,.02,palette.ink,post.x,1.09,post.z+.20);
    const stop=roadside(.79,2.2);cylinder(.04,.06,1.5,palette.metal,stop.x,.75,stop.z);
    const stopDisc=cylinder(.31,.31,.065,palette.red,stop.x,1.65,stop.z,scene,8);stopDisc.rotation.x=Math.PI/2;
    box(.37,.07,.075,palette.white,stop.x,1.65,stop.z+.05);
    for(const d of [0,.25,.5]){const f=roadside(.805,3.1+d);cylinder(.13,.10,.24,palette.woodLight,f.x,.13,f.z);ball(.11,palette.red,f.x,.38,f.z);}

    // 同梱の輪郭データから実際に押し出す立体文字。前面は白、厚みは水色。
    if(window.PORTFOLIO_TYPE){
      const letterShapes=window.PORTFOLIO_TYPE.map(data=>new T.Shape().fromJSON(data));
      const geometry=new T.ExtrudeGeometry(letterShapes,{depth:.32,bevelEnabled:true,bevelThickness:.02,bevelSize:.015,bevelSegments:2,curveSegments:8});
      geometry.computeBoundingBox();geometry.translate(-geometry.boundingBox.max.x/2,0,0);
      const lettering=new T.Mesh(geometry,[material(palette.white),material(palette.blue)]);
      lettering.name='PORTFOLIO';lettering.position.copy(roadside(.007,-4.8));lettering.position.y=.035;lettering.rotation.y=.16;
      lettering.castShadow=true;lettering.receiveShadow=true;scene.add(lettering);
    }
    // Sparse paving clusters give the road a rhythm without evenly repeated scenery.
    [[.175,2.4],[.32,-3.2],[.58,3.6],[.75,-3.4],[.92,-3]].forEach(([t,o],i)=>{const p=roadside(t,o);cylinder(.31,.4,.12,palette.white,p.x,.055,p.z);tree(t+.009,o+.7,.42,i%2?palette.leaf:palette.leafBlue);});

    const avatar=new T.Group();avatar.name='RoadAvatar';scene.add(avatar);avatar.visible=false;
    const ring=new T.Mesh(new T.RingGeometry(.37,.39,40),new T.MeshBasicMaterial({color:palette.blue,transparent:true,opacity:.9,side:T.DoubleSide}));ring.rotation.x=-Math.PI/2;scene.add(ring);
    const camera=new T.OrthographicCamera(-12,12,10,-10,.1,150);
    const cameraOffset=CAMERA_OFFSET.clone();
    let cameraFocus=path.getPointAt(0),openingStart=null,model=null,lastT=0,elapsed=0,frameId,gait=null;
    let nearTime=0,lastError=null,contextLost=false;
    let gesture=null,keys=new Set(),zoom=1,activeNear=null,environmentDim=0,profile=CAMERA_PROFILES.desktop;
    const pad=$('#walk-pad'),knob=pad.querySelector('.walk-pad-knob'),PAD_RADIUS=38,DEAD_ZONE=5;
    let width=1,height=1;const clock=new T.Clock();
    const prompt=$('#approach-prompt');

    function resize(){
      width=Math.max(1,container.clientWidth||window.innerWidth);height=Math.max(1,container.clientHeight||window.innerHeight);
      renderer.setSize(width,height,false);
      const key=width<=480?'phone':width<1024?'tablet':'desktop';profile=CAMERA_PROFILES[key];
      const aspect=width/Math.max(1,height),half=profile.half??Math.max(9.8,aspect*7.5);
      canvas.dataset.cameraProfile=key;
      cameraOffset.fromArray(profile.offset);
      houses.forEach(h=>h.sign.scale.setScalar(1));
      camera.left=-half;camera.right=half;camera.top=half/aspect;camera.bottom=-half/aspect;camera.updateProjectionMatrix();
    }
    const resizeObserver=new ResizeObserver(resize);resizeObserver.observe(container);resize();
    function clearWalkSelection(){
      const selection=window.getSelection();
      if(selection&&[selection.anchorNode,selection.focusNode].some(n=>n&&(n.nodeType===1?n:n.parentElement)?.closest?.('#town,.walk-controls,.walk-pad,.scroll-lane')))selection.removeAllRanges();
    }
    function updatePad(e){
      const g=gesture;if(!g)return;
      const dx=e.clientX-g.x,dy=e.clientY-g.y,d=Math.hypot(dx,dy),scale=d>PAD_RADIUS?PAD_RADIUS/d:1;
      knob.style.transform='translate('+dx*scale+'px,'+dy*scale+'px)';
      // 押した瞬間の道の向きを固定。カメラ追従やアバター位置で符号を反転させない。
      const along=(dx*g.forward.x+dy*g.forward.y)*scale;
      g.direction=Math.sign(along)*Math.max(0,(Math.abs(along)-DEAD_ZONE)/(PAD_RADIUS-DEAD_ZONE));
      if(controller.snapshot.reduced&&Math.abs(g.direction)>.15&&!g.stepped){controller.move(controller.snapshot.t+Math.sign(g.direction)*.025);g.stepped=true;}
    }
    function begin(e,mode){
      if(controller.snapshot.phase!=='walking'||gesture||e.button!==0||e.isPrimary===false)return;
      const target=e.currentTarget;
      const t=controller.snapshot.t,p=path.getPointAt(t),a=p.clone().project(camera),b=p.clone().add(path.getTangentAt(t)).project(camera);
      const forward=new T.Vector2((b.x-a.x)*width,-(b.y-a.y)*height).normalize();
      gesture={id:e.pointerId,target,mode,x:e.clientX,y:e.clientY,forward,direction:mode==='control'?Number(target.dataset.direction):0};
      pad.style.left=e.clientX+'px';pad.style.top=e.clientY+'px';knob.style.transform='translate(0,0)';pad.classList.add('is-active');container.classList.add('is-steering');
      clearWalkSelection();
      target.setPointerCapture?.(e.pointerId);
      if(mode==='canvas')canvas.focus({preventScroll:true});
      if(controller.snapshot.reduced)controller.move(controller.snapshot.t+gesture.direction*.025);
      e.preventDefault();
    }
    function move(e){if(gesture?.id!==e.pointerId)return;if(e.pointerType==='mouse'&&!(e.buttons&1)){releaseGesture();return;}if(gesture.mode==='canvas')updatePad(e);clearWalkSelection();e.preventDefault();}
    function end(e){if(gesture?.id===e.pointerId)releaseGesture(true);}
    function releaseGesture(cancel=true){
      if(gesture){const g=gesture;gesture=null;if(g.target.hasPointerCapture?.(g.id))g.target.releasePointerCapture(g.id);}
      pad.classList.remove('is-active');container.classList.remove('is-steering');
      if(cancel)controller.clearIntent();
    }
    [canvas,$('#walk-forward'),$('#walk-back')].forEach(el=>{
      el.addEventListener('pointerdown',e=>begin(e,el===canvas?'canvas':'control'));
      el.addEventListener('pointermove',move);el.addEventListener('pointerup',end);
        el.addEventListener('pointercancel',end);el.addEventListener('lostpointercapture',end);
        ['contextmenu','dragstart','selectstart'].forEach(type=>el.addEventListener(type,e=>{e.preventDefault();clearWalkSelection()}));
      });
      window.addEventListener('pointerup',end);window.addEventListener('pointercancel',end);
      [prompt,$('.scroll-lane')].forEach(el=>['contextmenu','dragstart','selectstart'].forEach(type=>el.addEventListener(type,e=>e.preventDefault())));
      window.addEventListener('resize',()=>clearInput());
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
    canvas.addEventListener('webglcontextlost',e=>{e.preventDefault();contextLost=true;clearInput();error('街の描画を復旧しています。メニューも利用できます。',new Error('WebGL context lost'));});
    canvas.addEventListener('webglcontextrestored',()=>{contextLost=false;lastError=null;resize();$('#world-error').hidden=true;});
    window.addEventListener('pageshow',()=>{clearInput();resize();});

    // Same wheel component is used in the opening and the external-link transition.
    let wheel;
    try{wheel=createWheel(T,palette);}catch(e){
      console.error('Paper wheel unavailable',e);
      $('#wheel-host').classList.add('wheel-fallback');
      wheel={setHamster(){},render(){}};
    }
    function makeFallbackHamster(){
      const g=new T.Group();
      const head=ball(.36,0xe0ba82,0,.98,0,g);head.name='Head';
      ball(.28,palette.red,0,.48,0,g).scale.y=1.35;
      for(const side of [-1,1]){ball(.12,0xe0ba82,side*.26,1.25,0,g);ball(.03,palette.ink,side*.12,1.03,.33,g);const arm=ball(.075,0xe0ba82,side*.29,.57,0,g);arm.name=side<0?'ArmL':'ArmR';const leg=ball(.10,palette.ink,side*.13,.11,.025,g);leg.name=side<0?'LegL':'LegR';}
      ball(.06,0xc27e72,0,.91,.35,g);return g;
    }
    const fallback=makeFallbackHamster();avatar.add(fallback);model=fallback;wheel.setHamster(fallback);controller.ready(true);
    async function loadHamster(){
      try{
      let bytes;
      if(location.protocol!=='file:'&&'DecompressionStream' in window){
        try{const zipped=await fetch('assets/hamster.glb.gz',{signal:AbortSignal.timeout(15000)});if(!zipped.ok)throw new Error('compressed GLB HTTP '+zipped.status);bytes=await new Response(zipped.body.pipeThrough(new DecompressionStream('gzip'))).arrayBuffer();}
        catch(e){console.error('Compressed model failed; retrying the original GLB',e);}
      }
      if(!bytes){
      const response=await fetch('assets/hamster.glb',{signal:AbortSignal.timeout(15000)});
      if(!response.ok)throw new Error('hamster.glb HTTP '+response.status);
      bytes=await response.arrayBuffer();}
      const gltf=await new GLTFLoader().parseAsync(bytes,'assets/');
        model=gltf.scene;const bounds=new T.Box3().setFromObject(model),size=bounds.getSize(new T.Vector3()),center=bounds.getCenter(new T.Vector3());
        if(!Number.isFinite(size.y)||size.y<=0)throw new Error('Invalid hamster model bounds');
        const scale=1.6/size.y;model.scale.setScalar(scale);model.position.set(-center.x*scale,-bounds.min.y*scale,-center.z*scale);
        // 元GLBにはマテリアル名が無い。Shirt / ShirtSleeve / Cuff / Collar /
        // ButtonPlacket の部品名と、共通の元の水色を手がかりに服だけを特定。
        model.traverse(o=>{if(o.isMesh){o.castShadow=true;o.receiveShadow=true;
          if(/^(Shirt|ShirtSleeve|Cuff|Collar|ButtonPlacket)(?:_\d+)?$/.test(o.name)){
            o.material=o.material.clone();o.material.color.set(palette.red);o.material.name='AyakaRedShirt';
          }
        }});
        avatar.remove(fallback);avatar.add(model);wheel.setHamster(model);gait=makeGait(model);
        $('#world-error').hidden=true;window.townReady=true;canvas.dataset.model='loaded';
        if(!['intro','loading'].includes(controller.snapshot.phase))avatar.visible=true;
      }catch(e){model=fallback;gait=makeGait(fallback);canvas.dataset.model='fallback';error(location.protocol==='file:'?'モデルを読むにはローカルサーバーで開いてください。現在は簡易表示です。':'ハムスターのモデルを読み込めなかったため、簡易表示で続けます。',e)}
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
      frameId=requestAnimationFrame(frame);const dt=Math.min(clock.getDelta(),.25);if(document.hidden||contextLost)return;
      try{
      const s=controller.snapshot;
      if(s.phase==='walking'&&gesture&&!s.reduced)controller.move(s.t+gesture.direction*dt*.08);
        if(s.phase==='walking'&&keys.size&&!gesture){
        const direction=Number(keys.has('ArrowDown')||keys.has('ArrowRight'))-Number(keys.has('ArrowUp')||keys.has('ArrowLeft'));
        controller.move(s.t+direction*dt*.08);
      }
      const state=controller.snapshot,t=state.t,p=path.getPointAt(t),tan=path.getTangentAt(t);
      const changed=Math.abs(t-lastT)>.00001,moving=state.phase==='walking'&&changed;
      elapsed+=dt;
      avatar.position.copy(p);avatar.position.y=.045+(moving&&!state.reduced?Math.abs(Math.sin(elapsed*13))*.045:0);
      gait?.(dt,moving,state.reduced);
      const forward=t>=lastT?1:-1;
      if(changed){const angle=Math.atan2(tan.x*forward,tan.z*forward);avatar.rotation.y=state.reduced?angle:avatar.rotation.y+Math.atan2(Math.sin(angle-avatar.rotation.y),Math.cos(angle-avatar.rotation.y))*Math.min(1,dt*11);}
      else if(state.phase==='opening')avatar.rotation.y=Math.atan2(tan.x,tan.z);
      ring.position.set(p.x,.035,p.z);ring.visible=avatar.visible;
      if(state.phase==='walking'){
        const current=houses.find(h=>h.id===activeNear);
        const candidate=current&&Math.abs(t-current.t)<.042?current:houses.find(h=>Math.abs(t-h.t)<.029);
        if(activeNear!==(candidate?.id||null))nearTime=0;
        activeNear=candidate?.id||null;nearTime+=dt;
        controller.setNear(activeNear&&(state.reduced||nearTime>.6)?activeNear:null);
      }else{activeNear=null;controller.setNear(null);}
      const focused=houses.find(h=>h.id===(activeNear||state.activeHouse));
        let focus=p.clone();focus.y=.5;
        // 横方向だけ道の先へ寄せる。デスクトップの従来画角は変えない。
        if(profile.ahead){
          focus=path.getPointAt(Math.min(1,t+profile.ahead));focus.y=.5;
          const right=new T.Vector3(cameraOffset.z,0,-cameraOffset.x).normalize(),values=[];
          for(let i=0;i<=20;i++)values.push(path.getPointAt(Math.min(1,t+i*.015)).dot(right));
          focus.addScaledVector(right,(Math.min(...values)+Math.max(...values))/2-focus.dot(right));
        }
        if(focused&&!state.reduced)focus.lerp(focused.group.position.clone().setY(1.8),profile.house);
        const desiredZoom=focused&&!state.reduced?APPROACH_ZOOM*profile.approach:1;
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
      const dimTarget=focused&&!state.reduced?.2:0;environmentDim+=(dimTarget-environmentDim)*(1-Math.exp(-dt*4));
      materials.forEach(mat=>dimMaterial(mat,environmentDim));
      for(const h of houses){
        h.hinge.rotation.y=state.reduced?h.doorTarget:h.hinge.rotation.y+(h.doorTarget-h.hinge.rotation.y)*(1-Math.exp(-dt*12));
        h.group.traverse(o=>{if(o.isMesh)dimMaterial(o.material,focused&&focused.id!==h.id?environmentDim:0)});
        // 正投影ではカメラ位置でなく視線方向が共通。常に文字面を正面へ向ける。
        h.sign.rotation.y=Math.atan2(cameraOffset.x,cameraOffset.z);
      }
      if(controller.snapshot.near){
        const h=houses.find(h=>h.id===controller.snapshot.near),v=screen(h.doorPoint);
        const pw=prompt.offsetWidth||250,ph=prompt.offsetHeight||90;
        const x=Math.max(pw/2+14,Math.min(width-pw/2-14,v.x));
        const y=Math.max(125,Math.min(height-205,v.y-ph-12));
        prompt.style.transform='translate('+x+'px,'+y+'px) translateX(-50%)';
      }
      const onIntro=['loading','intro'].includes(state.phase);
      if(!onIntro)renderer.render(scene,camera);wheel.render(dt,state.reduced);
      canvas.dataset.render=onIntro?'intro':'active';canvas.dataset.moving=String(moving);canvas.dataset.progress=t.toFixed(4);
      lastT=t;
      }catch(e){console.error('Town render frame failed',e);if(lastError!==e.message){lastError=e.message;error('街の描画に問題が起きました。メニューから作品を開けます。',e)}cameraFocus.copy(path.getPointAt(controller.snapshot.t));zoom=1;}
    }
    frame();

    function makeGait(root){
      const body=root.getObjectByName('Body');
      if(body&&!root.getObjectByName('LegL')){
        for(const side of ['L','R']){
          const trouser=root.getObjectByName('Trouser'+side);if(!trouser)continue;
          const index=body.children.indexOf(trouser),parts=body.children.slice(index,index+3);
          const pivot=new T.Group();pivot.name='Leg'+side;pivot.position.set(side==='L'?-.205:.205,.72,0);body.add(pivot);root.updateMatrixWorld(true);
          parts.forEach(part=>pivot.attach(part));
        }
      }
      const limbs=['ArmL','ArmR','LegL','LegR'].map(name=>root.getObjectByName(name));
      const bases=limbs.map(part=>part?.rotation.x||0),head=root.getObjectByName('Head'),headBase=head?.rotation.y||0;
      let time=0,strength=0;
      return (dt,moving,reduced)=>{
        time+=dt;strength=reduced?0:strength+(Number(moving)-strength)*(1-Math.exp(-dt*14));
        limbs.forEach((part,i)=>{if(part)part.rotation.x=bases[i]+Math.sin(time*11)*strength*(i===0||i===3?1:-1)*(i<2?.65:.55)});
        if(head)head.rotation.y=headBase+(reduced?0:Math.sin(time*1.8)*.045*(1-strength));
      };
    }

    function createWheel(T,palette){
      const host=$('#wheel-host'),c=$('#wheel'),ws=new T.Scene();
      const wr=new T.WebGLRenderer({canvas:c,alpha:true,antialias:true});wr.setPixelRatio(Math.min(devicePixelRatio||1,1.5));wr.outputColorSpace=T.SRGBColorSpace;
      wr.toneMapping=T.ACESFilmicToneMapping;wr.toneMappingExposure=1.1;
      ws.add(new T.HemisphereLight(0xffffff,0xbacbd4,2.7));const light=new T.DirectionalLight(0xffffff,2.2);light.position.set(-3,8,8);ws.add(light);
      const wc=new T.PerspectiveCamera(36,1,.1,60);wc.position.set(3,1.6,12);wc.lookAt(0,-.1,0);
      const outer=new T.Group();outer.rotation.y=-.18;outer.rotation.z=.12;ws.add(outer);
      const wheelGroup=new T.Group();outer.add(wheelGroup);
      const all=[...window.PORTFOLIO.projects,...window.PORTFOLIO.teamProjects];
      const paperEntries=all.flatMap(p=>(p.screenshots?.length?p.screenshots:[null]).map(im=>({project:p,image:im})));
      const count=Math.max(10,paperEntries.length),cards=[],radius=2.35;
      let spin=0,destination=null,selected=null,running=null,runnerGait=null;
      const lazyTextures=[];let imagesLoaded=0;c.dataset.cards=String(count);c.dataset.imagesLoaded='0';
      function paperTexture(entry){
        const cv=document.createElement('canvas');cv.width=512;cv.height=768;
        const ctx=cv.getContext('2d');if(!ctx)return new T.Texture();
        const texture=new T.CanvasTexture(cv);texture.colorSpace=T.SRGBColorSpace;
        const base=(label=false)=>{ctx.fillStyle='#fffdf6';ctx.fillRect(0,0,512,768);if(label){ctx.fillStyle='#294956';ctx.font='bold 40px "Yu Gothic",sans-serif';ctx.textAlign='center';ctx.fillText(entry.project.title,256,705,450);}texture.needsUpdate=true;};
        base(true);
        const source=controller.imageSource(entry.image?.src);
        let loaded=false;
        lazyTextures.push(()=>{if(loaded)return;loaded=true;base(true);if(source){
          const image=new Image();
          if(/^https?:/.test(source)&&!source.startsWith(location.origin))image.crossOrigin='anonymous';
          image.onload=()=>{base(true);const scale=Math.min(464/image.width,630/image.height),w=image.width*scale,h=image.height*scale;try{ctx.drawImage(image,(512-w)/2,20,w,h);texture.needsUpdate=true;c.dataset.imagesLoaded=String(++imagesLoaded)}catch(e){console.error('Screenshot texture failed',e);base(true)}};
          image.onerror=e=>{console.error('Screenshot unavailable: '+source,e);base(true)};image.src=source;
        }});
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
      // トップでも全ての紙に実画像を使う。画像は外部ファイルのまま読み込む。
      lazyTextures.forEach(load=>load());
      const hamster=new T.Group();hamster.position.set(0,-2.15,1.12);hamster.rotation.y=.75;ws.add(hamster);
      function setHamster(model){
        hamster.clear();const copy=model.clone(true);copy.scale.multiplyScalar(1.35);copy.position.multiplyScalar(1.35);hamster.add(copy);running=copy;runnerGait=makeGait(copy);
      }
      window.addEventListener('town:wheel',e=>{
        selected=e.detail.project||null;
        if(selected)lazyTextures.forEach(load=>load());
        const index=cards.findIndex(c=>c.entry.project.id===selected?.id);
        if(index>=0){
          // Bring the selected screenshot to the forward/right arc on the final rotation.
          const desired=cards[index].theta+.8;
          destination=desired+Math.ceil((spin-desired)/(Math.PI*2)+1)*Math.PI*2;
        }else destination=null;
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
          if(running)hamster.position.y=-2.15+Math.abs(Math.sin(wheelTime*11))*.04;
        }
        runnerGait?.(dt,true,reduced);
        wr.render(ws,wc);
      }};
    }
  }catch(e){console.error(e);error('この環境では3D表示を利用できません。メニューから全作品をご覧いただけます。');}
})();
