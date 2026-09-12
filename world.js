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
      ground:0xdce8c6,road:0x42bde9,roadEdge:0xc8eff6,white:0xfffdf6,
      wood:0xbba187,woodLight:0xe7d9c4,ink:0x294956,trunk:0xa3ada8,
      leaf:0x8fcf93,leafBlue:0x89cdd1,metal:0x739fac,
      blue:0x409fc7,peach:0xe89e80,green:0x72af8a,yellow:0xe7bb60,
      red:0xc74343,rubber:0x71878e,glass:0xd8eaf0,shadow:0x5c5140
    };
    const canvas=$('#town'),container=$('#world'),scene=new T.Scene();
    // 空は地面と別色。上ほど水色を濃くしたグラデーションで、地面との境に抜けを作る。
    const skyCanvas=document.createElement('canvas');skyCanvas.width=2;skyCanvas.height=256;
    const skyCtx=skyCanvas.getContext('2d'),skyGrad=skyCtx.createLinearGradient(0,0,0,256);
    skyGrad.addColorStop(0,'#a8dcf2');skyGrad.addColorStop(.55,'#d6eef8');skyGrad.addColorStop(1,'#f4f4e9');
    skyCtx.fillStyle=skyGrad;skyCtx.fillRect(0,0,2,256);
    const skyTexture=new T.CanvasTexture(skyCanvas);skyTexture.colorSpace=T.SRGBColorSpace;
    scene.background=skyTexture;scene.fog=new T.Fog(0xeaf4f2,72,140);
    const renderOrigin=new T.Vector3();
    const renderer=new T.WebGLRenderer({canvas,antialias:true});
    renderer.setPixelRatio(Math.min(devicePixelRatio||1,1.8));
    renderer.shadowMap.enabled=true;renderer.shadowMap.type=T.PCFSoftShadowMap;
    renderer.outputColorSpace=T.SRGBColorSpace;renderer.toneMapping=T.ACESFilmicToneMapping;renderer.toneMappingExposure=1.24;
    // 暖色の環境光と強めの日差しで、灰色に沈んで見えていた街を晴天の明るさに寄せる。
    scene.add(new T.HemisphereLight(0xfff6e8,0xd9d2bc,1.9));
    const fill=new T.DirectionalLight(0xd8ecff,.45);fill.position.set(10,8,-10);scene.add(fill);
    const sun=new T.DirectionalLight(0xfff1d8,2.9);sun.position.set(-12,24,15);sun.castShadow=true;
    sun.shadow.mapSize.set(2048,2048);Object.assign(sun.shadow.camera,{left:-18,right:18,top:18,bottom:-18,near:.5,far:70});
    sun.shadow.normalBias=.04;sun.shadow.bias=-.0002;sun.shadow.radius=5;scene.add(sun);scene.add(sun.target);
    const materials=new Map();
    function material(color){
      if(!materials.has(color)){
        const mat=new T.MeshStandardMaterial({color,roughness:color===palette.glass?.22:color===palette.metal?.38:color===palette.red?.48:.87,metalness:color===palette.metal?.18:0});
        mat.userData.base=new T.Color(color);materials.set(color,mat);
      }
      return materials.get(color);
    }
    function mesh(geometry,color,pos=[0,0,0],parent=scene){
      const m=new T.Mesh(geometry,material(color));m.position.set(...pos);m.castShadow=true;m.receiveShadow=true;parent.add(m);return m;
    }
    // 小物は同じプリミティブを何度も使うため、ジオメトリを共有する。
    const geometryCache=new Map();
    const cached=(key,make)=>geometryCache.get(key)||(geometryCache.set(key,make()),geometryCache.get(key));
    const box=(w,h,d,c,x,y,z,p)=>mesh(cached('b'+w+'|'+h+'|'+d,()=>new T.BoxGeometry(w,h,d)),c,[x,y,z],p);
    const cylinder=(r1,r2,h,c,x,y,z,p,seg=16)=>mesh(cached('c'+r1+'|'+r2+'|'+h+'|'+seg,()=>new T.CylinderGeometry(r1,r2,h,seg)),c,[x,y,z],p);
    const ball=(r,c,x,y,z,p)=>mesh(cached('s'+r,()=>new T.SphereGeometry(r,12,10)),c,[x,y,z],p);
    const grainCanvas=document.createElement('canvas');grainCanvas.width=grainCanvas.height=128;const grainCtx=grainCanvas.getContext('2d');
    grainCtx.fillStyle='#dedede';grainCtx.fillRect(0,0,128,128);
    for(let i=0;i<650;i++){grainCtx.fillStyle=i%2?'#aaaaaa':'#ffffff';grainCtx.fillRect((i*37)%128,(i*73+Math.floor(i/128)*17)%128,1,1);}
    const grain=new T.CanvasTexture(grainCanvas);grain.wrapS=grain.wrapT=T.RepeatWrapping;grain.repeat.set(28,28);
    const ground=new T.Mesh(new T.PlaneGeometry(2000,2000),new T.MeshStandardMaterial({color:palette.ground,roughness:.94,roughnessMap:grain,bumpMap:grain,bumpScale:.018}));
    ground.rotation.x=-Math.PI/2;ground.position.y=-.065;scene.add(ground);
    const shadow=new T.Mesh(new T.PlaneGeometry(2000,2000),new T.ShadowMaterial({color:palette.shadow,opacity:.20}));
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
      const m=new T.Mesh(geo,new T.MeshStandardMaterial({color,roughness:.78,roughnessMap:grain}));m.receiveShadow=true;scene.add(m);return m;
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
      const roofColor=[0xc67e58,0x4387aa,0x557885,0x91cbb7][i];
      const cream=0xfff1d7,warm=0xffcd83,mint=0xa5d5c3;
      function label(text,w,h,x,y,z,background='#fff3dc',ink='#513e32'){
        const cv=document.createElement('canvas');cv.width=1024;cv.height=320;const c=cv.getContext('2d');
        c.fillStyle=background;c.fillRect(0,0,1024,320);c.fillStyle=ink;c.font='bold 170px Georgia';c.textAlign='center';c.textBaseline='middle';c.fillText(text,512,175,960);
        const texture=new T.CanvasTexture(cv);texture.colorSpace=T.SRGBColorSpace;
        box(w+.09,h+.09,.10,palette.wood,x,y,z,g);
        const face=new T.Mesh(new T.PlaneGeometry(w,h),new T.MeshBasicMaterial({map:texture,toneMapped:false}));face.position.set(x,y,z+.06);g.add(face);return face;
      }
      function plant(x,z,size=.22,y=.12){
        cylinder(size*.78,size*.60,size,palette.peach,x,y+size/2,z,g);
        for(let k=0;k<7;k++){const angle=k*Math.PI*2/7,leaf=ball(size*.48,palette.green,x+Math.cos(angle)*size*.5,y+size*1.4,z+Math.sin(angle)*size*.5,g);leaf.scale.set(.6,1.1,1.6);leaf.rotation.y=-angle;}
      }
      function awning(w,y,z,color){
        for(let k=0;k<10;k++){
          const stripe=box(w/10,.065,.66,k%2?cream:color,-w/2+(k+.5)*w/10,y,z,g);stripe.rotation.x=.16;
          const edge=ball(w/20,k%2?cream:color,-w/2+(k+.5)*w/10,y-.09,z+.31,g);edge.scale.set(1,.60,.24);
        }
      }
      function windowPane(x,y,w=.62,h=.70,z=1.01,lit=false){
        // ガラスの奥にカーテン、家具、窓台を重ね、近寄ったときに室内の気配を残す。
        box(w+.12,h+.12,.09,palette.woodLight,x,y,z,g);const pane=box(w,h,.07,lit?warm:palette.glass,x,y,z+.055,g);
        if(lit)pane.material=new T.MeshStandardMaterial({color:warm,emissive:0xffa341,emissiveIntensity:.35,roughness:.8});
        box(.035,h,.09,cream,x,y,z+.10,g);box(w,.035,.09,cream,x,y,z+.10,g);
        box(w+.18,.065,.19,palette.woodLight,x,y-h/2-.055,z+.13,g);
        for(const side of [-1,1]){const curtain=box(w*.19,h*.82,.035,lit?0xf0c681:0xd9e2d5,x+side*w*.29,y,z+.085,g);curtain.rotation.z=side*.08;}
        box(w*.42,h*.24,.06,lit?palette.wood:palette.ink,x,y-h*.20,z+.08,g);
        for(const side of [-1,1])box(.045,h*.82,.04,cream,x+side*w*.28,y,z+.12,g);
      }
      function gable(w,depth,y,rise,color,x=0,z=0){
        const shape=new T.Shape();shape.moveTo(-w/2,0);shape.lineTo(0,rise);shape.lineTo(w/2,0);shape.closePath();
        return mesh(new T.ExtrudeGeometry(shape,{depth,bevelEnabled:false}),color,[x,y,z-depth/2],g);
      }
      function wallCourse(width,height,y,z,color,rows=5){
        for(let row=0;row<rows;row++){
          const yy=y-height/2+(row+.5)*height/rows;
          box(width,.028,.045,color,0,yy,z,g);
          for(let x=-width/2+.18+(row%2)*.12;x<width/2;x+=.36)box(.018,height/rows-.035,.048,color,x,yy,z+.004,g);
        }
      }
      function roofDetails(width,depth,y,color){
        // 軒先の厚み、雨どい、棟と繰り返すシングルを共通化する。
        box(width+.18,.11,depth+.16,palette.woodLight,0,y,0,g);
        for(let row=0;row<4;row++)for(let x=-width/2+.13+(row%2)*.12;x<width/2;x+=.26){
          const shingle=box(.24,.028,depth/4+.04,color,x,y+.065+row*.035,-depth/2+(row+.5)*depth/4,g);shingle.rotation.x=.08;
        }
        box(width+.22,.075,.07,palette.metal,0,y-.10,depth/2+.06,g);
        for(const x of [-width/2-.04,width/2+.04])cylinder(.035,.035,.38,palette.metal,x,y-.28,depth/2+.06,g);
        box(width*.82,.07,.12,palette.woodLight,0,y+.18,0,g);
      }
      box(2.7,.16,2.8,cream,0,.08,.22,g);
      const hinge=new T.Group();hinge.position.set(-.32,.17,1.04);g.add(hinge);
      if(i!==3){
        box(.73,1.23,.08,palette.ink,0,.76,1.00,g);
        box(.64,1.19,.085,roofColor,.32,.595,0,hinge);ball(.045,palette.woodLight,.51,.58,.075,hinge);
      }
      if(i===0){
        // Introduce: 小さな窓・多肉植物・縞の日よけのある名前の店。
        box(2.36,1.85,1.96,cream,0,1.05,0,g);
        box(2.58,.22,2.10,palette.woodLight,0,2.08,0,g);
        box(2.40,.10,1.94,palette.wood,0,2.23,0,g);
        awning(2.50,1.62,1.29,roofColor);
        roofDetails(2.43,1.98,2.15,roofColor);wallCourse(2.30,1.65,1.08,1.015,0xd6bea1,6);
        windowPane(-.78,1.0,.53,.62);windowPane(.78,1.0,.53,.62);
        label('Ayaka',.62,.26,-.95,.62,1.58);
        box(.055,.5,.055,palette.wood,-.95,.27,1.58,g);
        label('Hello',.42,.42,.92,.52,1.60);
        // 吊り金具と彫りのあるIntroduceネームプレート。
        for(const x of [-.78,.78]){cylinder(.035,.035,.34,palette.metal,x,2.30,1.24,g);ball(.06,palette.metal,x,2.13,1.24,g);}
        const intro=label('Introduce',1.74,.34,0,2.02,1.31);intro.position.z+=.015;
        box(1.96,.50,.12,palette.wood,0,2.02,1.24,g);box(1.78,.032,.035,palette.woodLight,0,2.25,1.32,g);
        // 黒板、ベンチ、カップと室内椅子。
        const blackboard=box(.58,.78,.06,0x31444a,-1.37,.58,1.34,g);blackboard.rotation.z=-.10;box(.68,.07,.09,palette.wood,-1.37,.17,1.34,g);
        for(const x of [-.46,.46])box(.07,.40,.07,palette.wood,x,.25,1.53,g);box(1.08,.09,.28,palette.wood,0,.47,1.53,g);
        cylinder(.10,.10,.06,palette.white,-.60,1.13,1.14,g);cylinder(.08,.08,.22,palette.wood,.42,.65,.91,g);box(.35,.33,.34,palette.wood,.42,.85,.86,g);
        for(const [x,z,size,y] of [[-1.25,1.24,.24,.14],[1.19,1.16,.32,.14],[-.72,-.30,.36,2.27],[.15,-.40,.29,2.27],[.73,-.05,.32,2.27],[-1.02,.0,.23,2.27]])plant(x,z,size,y);
      }else if(i===1){
        // 個人制作: 1階建ての路面店、ガラスの大きなショーウィンドウ。
        box(2.40,1.80,1.94,cream,0,1.03,0,g);
        box(2.60,.17,2.10,palette.woodLight,0,2.01,0,g);
        for(const z of [-1.0,1.0])box(2.55,.26,.09,cream,0,2.15,z,g);
        for(const x of [-1.25,1.25])box(.09,.26,2.0,cream,x,2.15,0,g);
        windowPane(-.78,.93,.59,1.12);windowPane(.78,.93,.59,1.12);
        box(.065,1.1,1.20,palette.glass,1.22,.92,0,g);
        for(const z of [-.6,0,.6])box(.08,1.20,.045,cream,1.24,.92,z,g);
        awning(2.65,1.77,1.25,roofColor);label('Open',.38,.22,.12,1.12,1.16);
        roofDetails(2.58,2.05,2.12,roofColor);wallCourse(2.30,1.58,1.02,1.015,0xb8d2d8,5);
        // ショーウィンドウの棚と小さな制作物、たわむ日よけの支柱。
        for(const x of [-1.25,1.25]){cylinder(.035,.035,.76,palette.metal,x,1.39,1.25,g);ball(.05,palette.metal,x,1.78,1.25,g);}
        for(const x of [-.78,.78])for(const y of [.58,.83,1.08]){box(.44,.035,.12,palette.wood,x,y,1.15,g);box(.12,.16,.09,y===.83?palette.peach:palette.blue,x+(y-.8)*.18,y+.10,1.18,g);}
        const menuBoard=box(.48,.72,.06,palette.ink,1.43,.53,1.35,g);menuBoard.rotation.z=.08;box(.58,.07,.08,palette.wood,1.43,.18,1.35,g);
        // 自転車はフレーム、二輪、ハンドルだけに絞り、店の小回り感を出す。
        for(const x of [-.34,.34]){const wheel=ball(.23,palette.rubber,-1.42+x,.27,1.45,g);wheel.scale.z=.18;}
        box(.62,.045,.05,palette.metal,-1.42,.48,1.45,g);box(.05,.40,.05,palette.metal,-1.15,.45,1.45,g);box(.34,.045,.05,palette.metal,-1.20,.67,1.45,g);
        for(let x=-1.2;x<1.3;x+=.40)for(const z of [1.2,1.57])box(.38,.035,.34,palette.white,x,.18,z,g);
        plant(-1.20,1.48,.27);plant(1.18,1.53,.22);
        box(.30,.33,.18,palette.peach,-.78,.60,1.08,g);box(.24,.23,.18,palette.blue,.78,.55,1.08,g);
      }else if(i===2){
        // チーム制作: 2階建て、屋根窓、暖かい窓、広いポーチと家族の庭。
        box(3.0,.10,3.2,palette.green,0,.06,.30,g);
        box(2.62,2.76,2.06,cream,0,1.56,0,g);
        gable(2.94,2.38,2.94,1.02,roofColor);
        roofDetails(3.06,2.48,3.03,roofColor);wallCourse(2.64,2.67,1.55,1.047,0xd7c9b1,9);
        box(.34,.85,.36,palette.woodLight,.88,3.48,-.55,g);
        for(const y of [.45,.74,1.03,1.32,1.61,1.90,2.19,2.48,2.77])box(2.66,.018,.025,palette.woodLight,0,y,1.047,g);
        for(const x of [-.82,.82]){windowPane(x,2.25,.66,.88,1.055,true);windowPane(x,1.0,.64,.74,1.07,true);}
        box(.62,.47,.70,cream,0,3.28,1.02,g);gable(.85,.76,3.51,.39,roofColor,0,1.07);windowPane(0,3.28,.39,.38,1.39,true);
        const porch=box(2.96,.10,.92,roofColor,0,1.63,1.43,g);porch.rotation.x=.10;
        for(const x of [-1.22,1.22]){box(.13,1.46,.13,cream,x,.86,1.76,g);box(.23,.23,.23,palette.woodLight,x,.28,1.76,g);}
        for(let k=0;k<3;k++)box(1.0,.10,.35,cream,0,.12+k*.10,2.04-k*.27,g);
        for(const side of [-1,1]){
          for(let k=0;k<7;k++)box(.075,.53,.065,cream,side*(.73+k*.17),.40,2.02,g);
          box(1.08,.065,.075,cream,side*1.24,.57,2.02,g);
          for(let k=0;k<3;k++)ball(.22,palette.green,side*(.90+k*.22),.31,1.98,g);
        }
        for(const [x,kind] of [[-.82,'rabbit'],[.82,'dog']]){
          const a=new T.Group();a.name=kind;a.position.set(x,1.02,1.19);g.add(a);
          ball(.14,kind==='rabbit'?palette.white:palette.woodLight,0,0,0,a);
          for(const side of [-1,1]){const ear=ball(.052,kind==='rabbit'?palette.white:palette.wood,side*.085,kind==='rabbit'?.18:.015,0,a);ear.scale.y=kind==='rabbit'?2.1:1.6;ball(.018,palette.ink,side*.046,.02,.126,a);}
          ball(.025,palette.peach,0,-.04,.14,a);
        }
        // 煙突、物干し、遊具、ボール。庭を通り過ぎても暮らしが読める密度にする。
        box(.38,.92,.38,palette.woodLight,-1.02,3.52,-.54,g);box(.48,.10,.48,palette.ink,-1.02,4.00,-.54,g);
        for(const x of [-1.28,1.28]){cylinder(.035,.035,1.12,palette.metal,x,.59,-1.23,g);box(2.55,.028,.035,palette.metal,0,1.08,-1.23,g);}
        for(const x of [-1.00,.93]){box(.06,.70,.06,palette.red,x,.38,1.58,g);box(.72,.06,.10,palette.red,x+.18,.69,1.58,g);}
        ball(.18,palette.yellow,1.36,.20,1.65,g);plant(-1.43,1.58,.23);plant(1.42,1.48,.26);
      }else{
        // 受付キオスク: 前面の壁を作らず、カウンター越しに中が見える。
        box(2.38,1.90,.14,palette.woodLight,0,1.10,-.90,g);
        for(const x of [-1.12,1.12])box(.15,1.88,1.94,mint,x,1.10,0,g);
        box(2.40,.80,.15,mint,0,.58,1.01,g);
        for(let x=-1.1;x<=1.1;x+=.18)box(.018,.70,.02,0x73ab99,x,.57,1.10,g);
        box(2.62,.12,.55,cream,0,1.02,1.12,g);
        box(2.60,.22,2.16,mint,0,2.03,0,g);
        awning(2.64,1.88,1.23,0x79b6a1);
        roofDetails(2.58,2.12,2.16,0x79b6a1);
        for(const y of [1.15,1.60]){box(1.8,.055,.30,palette.wood,0,y,.10,g);for(let k=0;k<5;k++)cylinder(.075,.06,.23,k%2?cream:0x579886,-.65+k*.32,y+.14,.11,g);}
        // 実メッシュの封筒サイン。参考のブランド名は使わない。
        box(.87,.58,.13,cream,0,2.49,.12,g);
        for(const side of [-1,1]){const fold=box(.48,.045,.025,0x579886,side*.20,2.50,.205,g);fold.rotation.z=side*.5;}
        label('Welcome',.78,.33,0,.61,1.13);
        label('Contact',.53,.42,1.47,.67,1.12);box(.05,.55,.05,palette.wood,1.47,.28,1.12,g);
        cylinder(.25,.25,.09,palette.woodLight,-1.48,.58,1.35,g);for(const dx of [-.14,.14])box(.055,.48,.055,mint,-1.48+dx,.30,1.35,g);
        plant(.79,1.12,.16,1.09);
        // 受付のカウンター上：レジ、伝票、カップ、ボトル、吊り下げ照明、スツール。
        box(.42,.23,.28,palette.ink,-.48,1.22,1.18,g);box(.27,.025,.18,palette.white,.12,1.16,1.19,g);
        for(let k=0;k<4;k++)cylinder(.055,.05,.30,k%2?palette.peach:palette.green,.48+k*.14,1.28,1.17,g);
        for(const x of [-.68,.68]){const light=ball(.12,0xffe5a0,x,1.72,1.22,g);light.castShadow=false;cylinder(.018,.018,.38,palette.metal,x,1.94,1.22,g);}
        for(const x of [-1.48,-1.10]){cylinder(.16,.16,.07,palette.woodLight,x,.16,1.48,g);cylinder(.045,.045,.42,palette.metal,x,.39,1.48,g);}
        const stand=box(.48,.72,.06,palette.ink,1.45,.50,1.36,g);stand.rotation.z=.08;box(.58,.07,.08,palette.wood,1.45,.16,1.36,g);
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
      if(i===0){sign.position.copy(g.localToWorld(new T.Vector3(0,1.99,1.70)));sign.position.y-=1.65;}
      else cylinder(.065,.07,1.42,palette.wood,0,.71,0,sign);
      const board=box(boardWidth,boardHeight,.12,palette.woodLight,0,1.65,0,sign);
      const signCanvas=document.createElement('canvas');signCanvas.width=1536;signCanvas.height=512;
      const ctx=signCanvas.getContext('2d');
      if(ctx){
        ctx.fillStyle='#fff7e7';ctx.fillRect(0,0,1536,512);
        ctx.strokeStyle='#9b7659';ctx.lineWidth=14;ctx.strokeRect(20,20,1496,472);
        ctx.fillStyle='#203c48';ctx.textAlign='center';ctx.textBaseline='middle';
        ctx.font='bold 192px "Yu Gothic",sans-serif';
        if(i===3){ctx.fillText('スキル /',768,158);ctx.fillText('お問い合わせ',768,356,1410);}
        else ctx.fillText(i===0?'Introduce':s.title,768,265,1410);
      }
      const texture=new T.CanvasTexture(signCanvas);texture.colorSpace=T.SRGBColorSpace;
      const face=new T.Mesh(new T.PlaneGeometry(boardWidth-.08,boardHeight-.06),new T.MeshBasicMaterial({map:texture,side:T.DoubleSide,toneMapped:false}));
      face.position.set(0,1.65,.068);sign.add(face);
      g.updateMatrixWorld(true);
      const doorPoint=g.localToWorld(new T.Vector3(0,i===2?4.6:i===3?3.5:2.75,1.25));
      return {...s,group:g,hinge,sign,boardWidth,boardHeight,doorPoint,doorAngle:0,doorTarget:0};
    });

    const living=[];
    function roadside(t,offset){return path.getPointAt(t).addScaledVector(normal(t),offset)}
    function tree(t,offset,scale=1,color=palette.leaf,type=0){
      const p=roadside(t,offset),g=new T.Group();g.position.copy(p);g.scale.setScalar(scale);scene.add(g);
      cylinder(.055,.09,1.0,palette.trunk,0,.52,0,g);
      // 樹種ごとに枝分かれと葉の重なりを変え、一本道の反復を和らげる。
      const crowns=[];
      if(type===0){
        for(const [x,y,z,r] of [[0,1.52,0,.54],[-.23,1.37,.02,.36],[.25,1.40,-.05,.39]])crowns.push(ball(r,color,x,y,z,g));
        crowns[0].scale.set(.86,1.36,.86);
      }else if(type===1){
        for(const side of [-1,1]){const branch=box(.055,.42,.055,palette.trunk,side*.16,1.03,0,g);branch.rotation.z=-side*.62;}
        for(const [x,y,z] of [[0,1.63,0],[-.28,1.34,.02],[.28,1.36,-.05]]){const crown=ball(.42,color,x,y,z,g);crown.scale.set(1.16,.78,1.0);crowns.push(crown);}
      }else{
        const crown=ball(.54,color,0,1.55,0,g);crown.scale.set(.78,1.78,.78);crowns.push(crown);
        for(const side of [-1,1])crowns.push(ball(.28,color,side*.20,1.22,.03,g));
      }
      crowns.forEach(crown=>living.push({kind:'tree',object:crown,phase:t*29}));
      cylinder(.36,.4,.06,0x9e815f,0,.02,0,g);
      for(let k=0;k<5;k++){const a=k*Math.PI*2/5;ball(.09,k%2?palette.leaf:palette.green,Math.cos(a)*.34,.11,Math.sin(a)*.34,g);}
    }
    [[.015,4,1.1],[.06,6,1.2],[.23,-6.5,.8],[.22,-4.8,1.1],[.25,5,1.35],[.27,6.3,.85],[.44,-4.2,1.25],[.45,-6,1],[.48,4.5,.85],[.55,5.1,1.2],[.59,6,.85],[.73,-4,.95],[.74,-6,1.2],[.77,4.1,.8],[.95,-4.4,1.2],[.99,7.8,1.0]].forEach((v,i)=>tree(...v,i%3===0?palette.leafBlue:palette.leaf,i%3));
    function lamp(t,offset){
      const p=roadside(t,offset),g=new T.Group();g.position.copy(p);scene.add(g);
      cylinder(.16,.21,.08,palette.woodLight,0,.04,0,g);cylinder(.05,.075,2.6,palette.metal,0,1.3,0,g);box(.57,.055,.065,palette.metal,.22,2.58,0,g);
      cylinder(.075,.075,.10,palette.metal,.43,2.47,0,g);box(.36,.13,.27,palette.white,.46,2.52,0,g);
      box(.42,.035,.33,palette.metal,.46,2.63,0,g);ball(.12,0xffebae,.46,2.49,.02,g).castShadow=false;
    }
    [[.07,2.05],[.28,-2.15],[.51,2.3],[.81,-2.1],[.95,2.05]].forEach(v=>lamp(...v));
    function crosswalk(t){
      const p=path.getPointAt(t),g=new T.Group();g.position.copy(p);g.rotation.y=Math.atan2(path.getTangentAt(t).x,path.getTangentAt(t).z);scene.add(g);
      for(let i=0;i<6;i++){const stripe=box(2.6,.015,.16,palette.white,0,.045,-.78+i*.3,g);stripe.castShadow=false;}
      box(2.92,.016,.085,palette.white,0,.045,-1.05,g); // 停止線
      const manhole=cylinder(.20,.20,.018,palette.metal,-1.08,.04,.78,g,16);manhole.rotation.x=Math.PI/2;manhole.castShadow=false;
      const signal=new T.Group();signal.position.set(1.9,0,1.2);g.add(signal);
      cylinder(.13,.17,.07,palette.woodLight,0,.04,0,signal);cylinder(.045,.06,1.65,palette.metal,0,.82,0,signal);box(.28,.71,.24,palette.ink,0,1.91,0,signal);
      [palette.red,palette.yellow,palette.green].forEach((c,i)=>ball(.067,c,0,2.12-i*.2,.145,signal));
      box(.43,.065,.08,palette.metal,.20,2.25,-.03,signal); // 信号腕金具
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
      for(const x of [-.44,.44])for(const z of [-.5,.5]){const tyre=cylinder(.19,.19,.1,palette.rubber,x,.24,z,g,16);tyre.rotation.z=Math.PI/2;const hub=cylinder(.075,.075,.105,palette.woodLight,x,.24,z+(z>0?.06:-.06),g,12);hub.rotation.z=Math.PI/2;}
      [-.26,.26].forEach(x=>box(.16,.09,.03,palette.white,x,.46,.83,g));
      [-.26,.26].forEach(x=>box(.14,.07,.03,palette.red,x,.48,-.83,g));
      box(.32,.08,.025,palette.white,0,.40,-.84,g);box(.07,.03,.03,palette.ink,0,.95,-.20,g);
    }
    car(.055,-2.1,palette.red);car(.465,2.1,palette.blue);car(.835,-2.1,palette.yellow);
    // 道中は抜けを保ち、交通・休憩・公園を小さなまとまりで置く。
    function curb(t,side,length=2.2){
      const p=roadside(t,side),g=new T.Group();g.position.copy(p);g.rotation.y=Math.atan2(path.getTangentAt(t).x,path.getTangentAt(t).z);scene.add(g);
      for(let k=0;k<Math.ceil(length/.35);k++)box(.16,.10,.31,k%2?palette.white:palette.woodLight,0,.05,-length/2+.17+k*.35,g);
    }
    [[.17,1.84,2.8],[.34,-1.84,2.2],[.61,1.84,2.6],[.89,-1.84,2.4]].forEach(v=>curb(...v));
    function busStop(t,offset){
      const p=roadside(t,offset),g=new T.Group();g.position.copy(p);scene.add(g);
      box(1.45,.05,.65,palette.metal,0,1.76,0,g);for(const x of [-.62,.62])box(.06,1.7,.06,palette.metal,x,.85,0,g);
      box(1.32,.72,.04,palette.glass,0,.92,.16,g);box(.62,.10,.28,palette.wood,0,.39,.32,g);box(.10,.55,.05,palette.metal,-.82,1.44,.12,g);box(.38,.22,.04,palette.blue,-.82,1.75,.14,g);
      cylinder(.13,.16,.06,palette.woodLight,.62,.03,.22,g);box(.44,.44,.05,palette.ink,.62,.32,.24,g);
    }
    busStop(.57,-3.5);
    function utilityPole(t,offset){
      const p=roadside(t,offset),g=new T.Group();g.position.copy(p);scene.add(g);
      cylinder(.075,.10,3.8,palette.wood,0,1.9,0,g);box(1.15,.08,.08,palette.woodLight,0,3.35,0,g);
      for(const x of [-.42,0,.42]){cylinder(.05,.05,.12,palette.white,x,3.24,0,g);const wire=box(.025,.025,2.8,palette.ink,x,3.16,-1.38,g);wire.rotation.x=.035;wire.castShadow=false;}
    }
    utilityPole(.39,5.6);utilityPole(.72,5.8);
    // ちいさな公園: 遊具とゴミ箱をまとめ、道の前面は空ける。
    const park=roadside(.69,-5.3),parkGroup=new T.Group();parkGroup.position.copy(park);scene.add(parkGroup);
    for(const x of [-.62,.62]){box(.07,.86,.07,palette.red,x,.43,0,parkGroup);box(1.42,.07,.09,palette.red,0,.81,0,parkGroup);}
    box(.80,.07,.26,palette.yellow,0,.72,.21,parkGroup);for(const x of [-.28,.28])box(.06,.48,.06,palette.metal,x,.29,.20,parkGroup);
    cylinder(.18,.15,.46,palette.metal,1.15,.23,.46,parkGroup);ball(.18,palette.ink,1.15,.48,.46,parkGroup);box(.22,.04,.22,palette.green,1.15,.66,.46,parkGroup);
    for(const [x,z] of [[-1.12,.58],[-.88,.72],[-1.30,.82]]){cylinder(.12,.10,.16,palette.woodLight,x,.08,z,parkGroup);ball(.11,palette.red,x,.28,z,parkGroup);}
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
      lettering.name='PORTFOLIO';lettering.position.copy(roadside(.007,-1.1));lettering.position.y=.035;lettering.rotation.y=.04;lettering.scale.setScalar(1.12);
      lettering.position.z-=3.5; // スタートのハムスターや木より奥にずらし、文字面を隠さない。
      lettering.material=[material(0xfdfaf1),material(0x216880)];
      lettering.castShadow=true;lettering.receiveShadow=true;scene.add(lettering);
    }
    // Sparse paving clusters give the road a rhythm without evenly repeated scenery.
    [[.175,2.4],[.32,-3.2],[.58,3.6],[.75,-3.4],[.92,-3]].forEach(([t,o],i)=>{const p=roadside(t,o);cylinder(.31,.4,.12,palette.white,p.x,.055,p.z);tree(t+.009,o+.7,.42,i%2?palette.leaf:palette.leafBlue);});

    // 小物は休憩場所ごとのまとまりで配置。歩く中心線と看板の前は空ける。
    for(const [t,side] of [[.32,4.6],[.47,-4.8],[.68,5.0],[.84,-5.2]]){
      const p=roadside(t,side),g=new T.Group();g.position.copy(p);scene.add(g);
      for(let k=0;k<5;k++)box(.08,.58,.08,palette.white,-.64+k*.32,.30,0,g);
      box(1.45,.055,.08,palette.woodLight,0,.45,0,g);
      cylinder(.25,.19,.35,palette.wood,1.05,.18,.1,g);ball(.30,palette.leaf,1.05,.48,.1,g);
      for(let k=0;k<3;k++)ball(.075,k===1?palette.red:palette.yellow,.90+k*.14,.70,.1,g);
    }
    bench(.42,3.5);bench(.86,-3.3);lamp(.39,-2.4);lamp(.68,2.4);
    // 雲は町の外側をゆっくり流し、建物の前を横切らせない。
    for(const [x,z] of [[-11,-28],[12,-8],[-12,17],[11,33]]){
      const cloud=new T.Group();cloud.position.set(x,7,z);scene.add(cloud);
      for(let k=0;k<3;k++){const puff=ball(.8,0xf9fcff,(k-1)*.82,k===1?.25:0,0,cloud);puff.scale.set(1.4,.45,.70);puff.castShadow=false;}
      living.push({kind:'cloud',object:cloud,origin:x,phase:z});
    }
    for(const [x,z] of [[7,-16],[-7,11]]){
      const bird=new T.Group();bird.position.set(x,5,z);scene.add(bird);
      for(const side of [-1,1]){const wing=box(.35,.025,.10,palette.ink,side*.16,0,0,bird);wing.rotation.z=side*.3;wing.castShadow=false;}
      living.push({kind:'bird',object:bird,origin:x,phase:z});
    }

    const finishPoint=path.getPointAt(1),finishGroup=new T.Group();finishGroup.position.copy(finishPoint);scene.add(finishGroup);
    const goalBoard=new T.Group();goalBoard.position.set(2.2,0,1.0);finishGroup.add(goalBoard);
    box(.12,1.5,.12,palette.wood,0,.75,0,goalBoard);box(1.8,.62,.12,palette.woodLight,0,1.6,0,goalBoard);
    const goalCanvas=document.createElement('canvas');goalCanvas.width=512;goalCanvas.height=180;const goalContext=goalCanvas.getContext('2d');goalContext.fillStyle='#fff8e9';goalContext.fillRect(0,0,512,180);goalContext.fillStyle='#a73e3e';goalContext.font='bold 78px Georgia';goalContext.textAlign='center';goalContext.fillText('GOAL',256,117);const goalTexture=new T.CanvasTexture(goalCanvas);goalTexture.colorSpace=T.SRGBColorSpace;
    const goalFace=new T.Mesh(new T.PlaneGeometry(1.7,.55),new T.MeshBasicMaterial({map:goalTexture,toneMapped:false}));goalFace.position.set(0,1.6,.07);goalBoard.add(goalFace);
    const thankYou=new T.Group();thankYou.position.set(0,-2.3,2.5);finishGroup.add(thankYou);thankYou.visible=false;
    if(window.GOAL_TYPE){for(const [i,data] of window.GOAL_TYPE.entries()){const geometry=new T.ExtrudeGeometry(data.map(d=>new T.Shape().fromJSON(d)),{depth:.20,bevelEnabled:true,bevelThickness:.015,bevelSize:.01,bevelSegments:2,curveSegments:6});geometry.computeBoundingBox();geometry.translate(-(geometry.boundingBox.max.x+geometry.boundingBox.min.x)/2,0,0);const letters=new T.Mesh(geometry,[material(palette.white),material(0x216880)]);letters.position.y=(1-i)*.85;letters.castShadow=true;thankYou.add(letters);}}
    let goalAnimation=-1,goalSkip=false;
    window.addEventListener('town:goal',e=>{goalAnimation=e.detail.active?0:-1;goalSkip=!!e.detail.skip;thankYou.visible=e.detail.active;});

    const avatar=new T.Group();avatar.name='RoadAvatar';scene.add(avatar);avatar.visible=false;
    const ring=new T.Mesh(new T.RingGeometry(.37,.39,40),new T.MeshBasicMaterial({color:palette.blue,transparent:true,opacity:.9,side:T.DoubleSide}));ring.rotation.x=-Math.PI/2;scene.add(ring);
    const camera=new T.OrthographicCamera(-12,12,10,-10,.1,150);
    const cameraOffset=CAMERA_OFFSET.clone();
    let cameraFocus=path.getPointAt(0),openingStart=null,model=null,lastT=0,elapsed=0,frameId,gait=null;
    const scenicOffset=new T.Vector3();
    let nearTime=0,lastError=null,contextLost=false;
    let zoom=1,activeNear=null,environmentDim=0,profile=CAMERA_PROFILES.desktop;
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
    const raycaster=new T.Raycaster(),groundPlane=new T.Plane(new T.Vector3(0,1,0),0);
    const destinationMarker=$('#destination-marker');
    let tap=null,markerT=null,markerStarted=0;
    function nearestRoadT(point){
      let best=0,distance=Infinity;
      for(let i=0;i<samples.length;i++){const d=samples[i].distanceToSquared(point);if(d<distance){distance=d;best=i/(samples.length-1);}}
      // サンプル近傍を細かく探し、道から外れたクリックも中心線に投影。
      let lo=Math.max(0,best-.002),hi=Math.min(1,best+.002);
      for(let i=0;i<16;i++){const a=lo+(hi-lo)/3,b=hi-(hi-lo)/3;if(path.getPointAt(a).distanceToSquared(point)<path.getPointAt(b).distanceToSquared(point))hi=b;else lo=a;}
      return (lo+hi)/2;
    }
    function destinationAt(e){
      const r=canvas.getBoundingClientRect();
      raycaster.setFromCamera(new T.Vector2((e.clientX-r.left)/r.width*2-1,1-(e.clientY-r.top)/r.height*2),camera);
      const p=new T.Vector3();return raycaster.ray.intersectPlane(groundPlane,p)?nearestRoadT(p.add(renderOrigin)):null;
    }
    function showDestination(t){
      markerT=t;markerStarted=performance.now();destinationMarker.hidden=false;
      const v=screen(path.getPointAt(t));destinationMarker.style.left=v.x+'px';destinationMarker.style.top=v.y+'px';destinationMarker.style.opacity='1';
      canvas.dataset.destination=t.toFixed(4);
    }
    function clearWalkSelection(){
      const selection=window.getSelection();
      if(selection&&[selection.anchorNode,selection.focusNode].some(n=>n&&(n.nodeType===1?n:n.parentElement)?.closest?.('#town,.walk-controls,.approach-prompt')))selection.removeAllRanges();
    }
    function cancelTap(){
      if(tap){const id=tap.id;tap=null;if(canvas.hasPointerCapture?.(id))canvas.releasePointerCapture(id);}
    }
    function clearInput(){cancelTap();controller.clearIntent();markerT=null;destinationMarker.hidden=true;}
    canvas.addEventListener('pointerdown',e=>{
      if(!['opening','walking'].includes(controller.snapshot.phase)||contextLost||e.button!==0||e.isPrimary===false||tap)return;
      const t=destinationAt(e);if(t===null)return;
      tap={id:e.pointerId,x:e.clientX,y:e.clientY,t,moved:false};
      canvas.setPointerCapture?.(e.pointerId);clearWalkSelection();showDestination(t);
    });
    canvas.addEventListener('pointermove',e=>{
      if(tap?.id!==e.pointerId)return;
      if(Math.hypot(e.clientX-tap.x,e.clientY-tap.y)>8){tap.moved=true;controller.clearIntent();markerT=null;destinationMarker.hidden=true;}
    });
    canvas.addEventListener('pointerup',e=>{
      if(tap?.id!==e.pointerId)return;
      const selected=tap,r=canvas.getBoundingClientRect();cancelTap();
      if(selected.moved||e.clientX<r.left||e.clientX>r.left+r.width||e.clientY<r.top||e.clientY>r.top+r.height)return;
      controller.seek(selected.t);canvas.focus({preventScroll:true});clearWalkSelection();e.preventDefault();
    });
    canvas.addEventListener('pointercancel',e=>{if(tap?.id===e.pointerId)clearInput()});
    canvas.addEventListener('lostpointercapture',e=>{if(tap?.id===e.pointerId)cancelTap()});
    [canvas,prompt].forEach(el=>['contextmenu','dragstart','selectstart'].forEach(type=>el.addEventListener(type,e=>{e.preventDefault();clearWalkSelection()})));
    window.addEventListener('town:clear-input',clearInput);
    window.addEventListener('blur',clearInput);
    document.addEventListener('visibilitychange',()=>{if(document.hidden)clearInput()});
    window.addEventListener('resize',clearInput);
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
    const fallback=makeFallbackHamster();avatar.add(fallback);model=fallback;gait=makeGait(fallback);wheel.setHamster(fallback);controller.ready(true);
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
        model=gltf.scene;styleHamster(model);
        const bounds=new T.Box3().setFromObject(model),size=bounds.getSize(new T.Vector3()),center=bounds.getCenter(new T.Vector3());
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
    function screen(p){projection.copy(p).sub(renderOrigin).project(camera);return {x:(projection.x*.5+.5)*width,y:(-projection.y*.5+.5)*height};}
    function dimMaterial(mat,amount){
      const base=mat.userData.base;if(!base)return;
      const gray=base.r*.2126+base.g*.7152+base.b*.0722;
      mat.color.copy(base).lerp(new T.Color(gray*.84,gray*.87,gray*.89),amount);
    }
    function frame(){
      frameId=requestAnimationFrame(frame);const dt=Math.min(clock.getDelta(),.25);if(document.hidden||contextLost)return;
      try{
      controller.tick(dt);
      const state=controller.snapshot,t=Number.isFinite(state.t)?Math.max(0,Math.min(1,state.t)):0,p=path.getPointAt(t),tan=path.getTangentAt(t);
      const changed=Math.abs(t-lastT)>.00001,moving=state.phase==='walking'&&changed;
      elapsed+=dt;
      for(const item of living){
        const time=state.reduced?0:elapsed;
        if(item.kind==='tree')item.object.rotation.z=state.reduced?0:Math.sin(time*.8+item.phase)*.035;
        else if(item.kind==='cloud')item.object.position.x=item.origin+(state.reduced?0:Math.sin(time*.07+item.phase)*1.8);
        else{item.object.position.x=item.origin+(state.reduced?0:Math.sin(time*.3+item.phase)*1.7);item.object.children.forEach((wing,i)=>wing.rotation.z=state.reduced?(i?1:-1)*.3:(i?1:-1)*Math.sin(time*5)*.45);}
      }
      avatar.position.copy(p);avatar.position.y=.045+(moving&&!state.reduced?Math.abs(Math.sin(elapsed*13))*.045:0);
      gait?.(dt,moving,state.reduced);
      const forward=t>=lastT?1:-1;
      if(changed){const angle=Math.atan2(tan.x*forward,tan.z*forward);avatar.rotation.y=state.reduced?angle:avatar.rotation.y+Math.atan2(Math.sin(angle-avatar.rotation.y),Math.cos(angle-avatar.rotation.y))*Math.min(1,dt*11);}
      else if(state.phase==='opening')avatar.rotation.y=Math.atan2(tan.x,tan.z);
      if(goalAnimation>=0){goalAnimation+=dt;const finish=state.reduced||goalSkip,turn=finish?1:Math.min(1,goalAnimation/.6);avatar.rotation.y=Math.atan2(cameraOffset.x,cameraOffset.z)*turn+Math.atan2(tan.x,tan.z)*(1-turn);avatar.rotation.x=finish?0:Math.sin(Math.min(1,Math.max(0,(goalAnimation-.5)/1.1))*Math.PI)*.28;thankYou.position.y=finish?.12:-2.3+2.42*Math.min(1,Math.max(0,(goalAnimation-.5)/.9));}else avatar.rotation.x=0;
      goalBoard.rotation.y=Math.atan2(cameraOffset.x,cameraOffset.z);thankYou.rotation.y=goalBoard.rotation.y;
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
        const desiredZoom=focused&&!state.reduced?APPROACH_ZOOM*profile.approach*(focused.id==='team'?.85:focused.id==='about'?.93:1):1;
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
      // スクロール座標はここでは一切使わない。パス上の現在位置へ毎フレーム直接固定。
      // 過去のカメラ位置を追いかけず、接近演出の相対オフセットだけを補間する。
      if(['loading','intro','opening'].includes(state.phase))cameraFocus.copy(focus);
      else{
        const offset=focus.clone().sub(p);offset.clampLength(0,6);
        if(state.reduced)scenicOffset.copy(offset);else scenicOffset.lerp(offset,1-Math.exp(-dt*7));
        cameraFocus.copy(p).add(scenicOffset);
      }
      // Floating origin: the renderer always sees the hamster near (0,0,0).
      // Progress moves scenery horizontally, never camera height or page position.
      renderOrigin.copy(p).setY(0);scene.position.copy(renderOrigin).negate();
      const localFocus=cameraFocus.clone().sub(renderOrigin);
      camera.position.copy(localFocus).add(cameraOffset);camera.lookAt(localFocus);camera.zoom=zoom;camera.updateProjectionMatrix();camera.updateMatrixWorld();
      if(!['loading','intro','opening'].includes(state.phase)){
        // 大きなスクロールジャンプでも頭と足を画面内へ。補正は視線と平行な平面内のみ。
        const center=p.clone().sub(renderOrigin).setY(.85).project(camera);
        const dx=center.x-Math.max(-.76,Math.min(.76,center.x)),dy=center.y-Math.max(-.68,Math.min(.68,center.y));
        if(dx||dy){
          const shift=new T.Vector3().setFromMatrixColumn(camera.matrixWorld,0).multiplyScalar(dx*(camera.right-camera.left)/(2*zoom));
          shift.addScaledVector(new T.Vector3().setFromMatrixColumn(camera.matrixWorld,1),dy*(camera.top-camera.bottom)/(2*zoom));
          cameraFocus.add(shift);localFocus.add(shift);camera.position.add(shift);camera.lookAt(localFocus);camera.updateMatrixWorld();
        }
        const actual=p.clone().sub(renderOrigin).setY(.85).project(camera);canvas.dataset.avatarScreen=actual.x.toFixed(4)+','+actual.y.toFixed(4);
        canvas.dataset.cameraAnchor=t.toFixed(4);canvas.dataset.cameraHeight=camera.position.y.toFixed(4);canvas.dataset.origin=renderOrigin.toArray().join(',');
      }
      if(markerT!==null){
        const age=(performance.now()-markerStarted)/550;
        if(age>=1){markerT=null;destinationMarker.hidden=true;}
        else{const v=screen(path.getPointAt(markerT));destinationMarker.style.left=v.x+'px';destinationMarker.style.top=v.y+'px';destinationMarker.style.opacity=String(1-age);destinationMarker.style.transform='translate(-50%,-50%) scale('+(state.reduced?1:.7+age*.9)+')';}
      }
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
      scene.updateMatrixWorld(true);
      // Explicit viewport reset protects the fixed canvas from stale renderer viewport state.
      renderer.setViewport(0,0,width,height);renderer.setScissorTest(false);
      if(!onIntro)renderer.render(scene,camera);wheel.render(dt,state.reduced);
      canvas.dataset.render=onIntro?'intro':'active';canvas.dataset.moving=String(moving);canvas.dataset.progress=t.toFixed(4);
      lastT=t;
      }catch(e){console.error('Town render frame failed',e);if(lastError!==e.message){lastError=e.message;error('街の描画に問題が起きました。メニューから作品を開けます。',e)}cameraFocus.copy(path.getPointAt(controller.snapshot.t));zoom=1;}
    }
    frame();

    function styleHamster(root){
      // GLBは変更しない。元モデルの部品名とHead座標系を使って加工する。
      // HeadShape/ShortFur/Hand/Finger=生成りの毛、Chin/Muzzle=白い腹側の毛。
      root.traverse(o=>{
        if(!o.material)return;const name=o.name.replace(/_\d+$/,'');
        if(['HeadShape','ShortFur','Ear','InnerEar','Hand','Finger','Muzzle','Chin','Nose','NoseTip'].includes(name)){
          o.material=o.material.clone();o.material.vertexColors=false;
          o.material.color.set(['Muzzle','Chin'].includes(name)?0xfff8e9:['Nose','NoseTip','InnerEar'].includes(name)?0xe8b4a8:0xf3dba7);
          o.material.roughness=.92;
        }
        // Ear/InnerEarは小さく丸くし、付け根を頭へ寄せる。アニメーションの親Headは維持。
        if(['Ear','InnerEar'].includes(name)){o.scale.multiply(new T.Vector3(.78,.58,.85));o.position.x*=.90;o.position.y-=.055;}
        // Muzzleの奥行きを半分以下へ。鼻・口・ひげも同じ平たい顔面に揃える。
        if(name==='Muzzle'){o.position.z=.49;o.scale.z*=.42;}
        if(['Nose','NoseTip'].includes(name)){o.position.z=.575;o.scale.multiplyScalar(.85);}
        if(['Mouth','Philtrum','Whisker'].includes(name)){o.geometry=o.geometry.clone();o.geometry.scale(1,1,.79);o.position.z*=.79;}
      });
      const head=root.getObjectByName('Head');if(!head)return;
      for(const side of [-1,1]){
        const cheek=new T.Mesh(new T.SphereGeometry(.34,20,14),new T.MeshStandardMaterial({color:0xffedc8,roughness:.94}));
        cheek.name=side<0?'CheekPouchL':'CheekPouchR';cheek.position.set(side*.48,-.22,.40);cheek.scale.set(1,.86,.83);head.add(cheek);
      }
      const bib=new T.Mesh(new T.SphereGeometry(.37,20,14),new T.MeshStandardMaterial({color:0xfffbef,roughness:1}));
      bib.name='CreamUnderside';bib.position.set(0,-.35,.38);bib.scale.set(1,.60,.45);head.add(bib);
    }
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
      wr.toneMapping=T.ACESFilmicToneMapping;wr.toneMappingExposure=1.0;wr.shadowMap.enabled=true;wr.shadowMap.type=T.PCFSoftShadowMap;
      ws.add(new T.HemisphereLight(0xe6f5ff,0xc6b79c,1.5));const light=new T.DirectionalLight(0xffefd6,3);light.position.set(-3,8,8);light.castShadow=true;light.shadow.mapSize.set(1024,1024);light.shadow.radius=5;light.shadow.normalBias=.025;ws.add(light);
      const rim=new T.DirectionalLight(0xb9e7ff,1.2);rim.position.set(4,3,-4);ws.add(rim);
      // Transparent shadow catcher blends the physical floor into the lit CSS backdrop without a rectangular canvas edge.
      light.shadow.mapSize.set(256,256);light.shadow.radius=6;
      const floor=new T.Mesh(new T.PlaneGeometry(200,200),new T.ShadowMaterial({color:0x657778,opacity:.20}));floor.rotation.x=-Math.PI/2;floor.position.y=-2.85;floor.receiveShadow=true;ws.add(floor);
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
        const paper=new T.BoxGeometry(1.39,2.08,.032,12,18,1),vertices=paper.attributes.position;
        for(let j=0;j<vertices.count;j++){const x=vertices.getX(j),y=vertices.getY(j);vertices.setZ(j,vertices.getZ(j)+.075*(x/.695)**2+.028*Math.sin(y*2.4+theta));}paper.computeVertexNormals();
        const faceMaterial=new T.MeshStandardMaterial({map:paperTexture(entry),roughness:.83});
        const edgeMaterial=new T.MeshStandardMaterial({color:0xe3d8c4,roughness:.95});
        const card=new T.Mesh(paper,[edgeMaterial,edgeMaterial,edgeMaterial,edgeMaterial,faceMaterial,faceMaterial]);card.castShadow=true;card.receiveShadow=true;
        card.position.y=radius;card.rotation.x=-Math.PI/2;card.rotation.y=Math.sin(theta)*.1;pivot.add(card);
        cards.push({pivot,entry,theta});
      }
      // トップでも全ての紙に実画像を使う。画像は外部ファイルのまま読み込む。
      lazyTextures.forEach(load=>load());
      // 時計回りの輪の底面は左へ流れる。ハムスターは右向きに走り、足を後ろへ送る。
      const hamster=new T.Group();hamster.position.set(0,-2.15,1.12);hamster.rotation.y=Math.PI/2;ws.add(hamster);
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
          destination=desired+Math.floor((spin-desired)/(Math.PI*2)-1)*Math.PI*2;
        }else destination=null;
      });
      let wheelTime=0,lastStep=0,audioContext=null,master=null,noiseBuffer=null,soundOn=false;
      const soundButton=$('#sound-toggle'),SOUND_KEY='ayaka-town-sound-v1';
      const readSound=()=>{try{return localStorage.getItem(SOUND_KEY)==='on'}catch(e){return false}};
      function paintSoundButton(){
        soundButton.setAttribute('aria-pressed',String(soundOn));
        soundButton.textContent=soundOn?'音をオフ':'音をオン';
        soundButton.setAttribute('aria-label',soundOn?'足音と息づかいの音をオフにする':'足音と息づかいの音をオンにする');
      }
      async function startAudio(){
        if(!audioContext){
          audioContext=new (window.AudioContext||window.webkitAudioContext)();
          master=audioContext.createGain();master.gain.value=.9;master.connect(audioContext.destination);
          // 紙をこするような足音に使う短いノイズ。小型スピーカーで鳴る帯域だけを通す。
          const frames=Math.floor(audioContext.sampleRate*.2);
          noiseBuffer=audioContext.createBuffer(1,frames,audioContext.sampleRate);
          const data=noiseBuffer.getChannelData(0);
          for(let i=0;i<frames;i++)data[i]=(Math.random()*2-1)*(1-i/frames);
        }
        await audioContext.resume();
      }
      soundButton.addEventListener('click',async()=>{
        try{
          await startAudio();soundOn=!soundOn;paintSoundButton();
          try{localStorage.setItem(SOUND_KEY,soundOn?'on':'off')}catch(e){/* 保存できなくても今回の操作は有効 */}
          if(soundOn)footstep();
        }catch(e){console.error('Sound unavailable',e);soundButton.textContent='音は利用できません';}
      });
      if(readSound())startAudio().then(()=>{soundOn=true;paintSoundButton()}).catch(()=>{});
      function footstep(){
        if(!soundOn||!audioContext||audioContext.state!=='running')return;
        const at=audioContext.currentTime;
        // 足音：紙を蹴る擦過音（可聴域のバンドパス）＋輪郭をつける短い胴鳴り。
        const noise=audioContext.createBufferSource();noise.buffer=noiseBuffer;
        const band=audioContext.createBiquadFilter();band.type='bandpass';band.frequency.value=760;band.Q.value=.9;
        const noiseGain=audioContext.createGain();
        noiseGain.gain.setValueAtTime(.16,at);noiseGain.gain.exponentialRampToValueAtTime(.0006,at+.11);
        noise.connect(band).connect(noiseGain).connect(master);noise.start(at);noise.stop(at+.13);
        const body=audioContext.createOscillator(),bodyGain=audioContext.createGain();
        body.type='triangle';body.frequency.setValueAtTime(330,at);body.frequency.exponentialRampToValueAtTime(170,at+.07);
        bodyGain.gain.setValueAtTime(.09,at);bodyGain.gain.exponentialRampToValueAtTime(.0005,at+.09);
        body.connect(bodyGain).connect(master);body.start(at);body.stop(at+.1);
        if(Math.floor(wheelTime*3)%6===0){
          // 息づかい：鼻から抜ける空気。こちらもノイズなので小型スピーカーで鳴る。
          const breath=audioContext.createBufferSource();breath.buffer=noiseBuffer;
          const shape=audioContext.createBiquadFilter();shape.type='bandpass';shape.frequency.value=1500;shape.Q.value=1.6;
          const level=audioContext.createGain();
          level.gain.setValueAtTime(.0001,at);level.gain.linearRampToValueAtTime(.05,at+.08);level.gain.linearRampToValueAtTime(.0001,at+.26);
          breath.connect(shape).connect(level).connect(master);breath.start(at);breath.stop(at+.27);
        }
      }
      return {setHamster,render(dt,reduced){
        if(host.hidden||(!$('#outbound').open&&$('#intro').hidden))return;
        const w=host.clientWidth||380,h=host.clientHeight||330;
        if(c.width!==Math.round(w*wr.getPixelRatio())||c.height!==Math.round(h*wr.getPixelRatio())){wr.setSize(w,h,false);wc.aspect=w/Math.max(1,h);wc.updateProjectionMatrix();}
        wheelTime+=dt;
        const progress=Math.min(1,controller.introProgress);$('#intro-progress').setAttribute('aria-valuenow',String(Math.round(progress*100)));$('#intro-progress span').style.transform='scaleX('+progress+')';
        $('#intro-status').textContent=progress<1?'街を準備しています':$('#intro').getAttribute('aria-disabled')==='false'?'タップして街へ':'ハムスターを準備しています';
        if(!reduced){
          if(destination!==null)spin+=(destination-spin)*(1-Math.exp(-dt*5.5));else spin-=dt*(.66+.12*Math.sin(wheelTime*2.1));
          wheelGroup.rotation.z=spin;
          if(running)hamster.position.y=-2.15+Math.abs(Math.sin(wheelTime*11))*.04;
          if(running){hamster.scale.y=1+Math.sin(wheelTime*3.2)*.012;if(wheelTime-lastStep>.28){footstep();lastStep=wheelTime;}}
        }
        else hamster.scale.y=1;
        runnerGait?.(dt,true,reduced);
        wr.render(ws,wc);
      }};
    }
  }catch(e){console.error(e);error('この環境では3D表示を利用できません。メニューから全作品をご覧いただけます。');}
})();

