/* ===== 後から差し替える内容は、すべてこのデータにまとめています =====
 * description: 作品の説明文（現在はプレースホルダー。事実は推測していません）
 * screenshots: {src, alt} を追加・差し替え。先頭が一覧と遷移時の代表画像です。
 * 画像なしの作品は screenshots: []。作品名の紙カードに自動で切り替わります。
 * email: 未設定の間は「準備中」。外部CDNは使いません。
 */
window.PORTFOLIO = {
  name: 'Ayaka',
  bio: 'こんにちは、Ayakaです。わたしのポートフォリオへようこそ。制作した作品や使えるスキルを、この小さな街にまとめています。',
  github: 'https://github.com/ayarion',
  x: 'https://x.com/lavien_kan',
  email: '', // TODO: お問い合わせ用メールアドレス
  skills: ['HTML', 'CSS', 'JavaScript', 'Python', 'C', 'C++'],
  projects: [
    {id:'togame', title:'togame', url:'https://tsukuriba.org/togame/',
      description:'作品の説明を準備中です。', // TODO: togameの説明
      screenshots:[
        {src:'assets/screenshots/togame-01.png',alt:'togameの今日の画面'},
        {src:'assets/screenshots/togame-02.png',alt:'togameの選択画面'}
      ]},
    {id:'ojimate', title:'OjiMate', url:'https://tsukuriba.org/OjiMate/',
      description:'作品の説明を準備中です。', // TODO: OjiMateの説明
      screenshots:[{src:'assets/screenshots/ojimate-01.png',alt:'OjiMateのスタート画面'}]},
    {id:'kinto-log', title:'Kinto-Log', url:'https://tsukuriba.org/kinto-log/',
      description:'作品の説明を準備中です。', // TODO: Kinto-Logの説明
      screenshots:[
        {src:'assets/screenshots/kinto-log-02.jpg',alt:'Kinto-Logのタイトル画面'},
        {src:'assets/screenshots/kinto-log-01.jpg',alt:'Kinto-Logのトレーニング記録画面'},
        {src:'assets/screenshots/kinto-log-03.jpg',alt:'Kinto-Logの種目のグラフ画面'}
      ]}
  ],
  teamProjects: [ // TODO: 今後のチーム作品はこの配列に追加
    {id:'mersampo',title:'mersampo',url:'https://tsukuriba.org/mersampo/',
      description:'作品の説明を準備中です。', // TODO: mersampoの説明
      screenshots:[
        {src:'assets/screenshots/mersampo-01.png',alt:'mersampoの下北沢の画面'},
        {src:'assets/screenshots/mersampo-02.png',alt:'mersampoの原宿への移動画面'},
        {src:'assets/screenshots/mersampo-03.png',alt:'mersampoの商品詳細画面'},
        {src:'assets/screenshots/mersampo-04.png',alt:'mersampoの出品者画面'}
      ]}
  ]
};

(() => {
  'use strict';
  const $=s=>document.querySelector(s), data=window.PORTFOLIO;
  const stops=Object.freeze([
    {id:'about',title:'自己紹介',t:.12,number:'01',english:'ABOUT ME',side:-1},
    {id:'projects',title:'個人制作作品',t:.37,number:'02',english:'PERSONAL WORK',side:1},
    {id:'team',title:'チーム制作作品',t:.64,number:'03',english:'TEAM WORK',side:-1},
    {id:'contact',title:'スキル / お問い合わせ',t:.88,number:'04',english:'SKILLS & CONTACT',side:1}
  ]);
  const motion=matchMedia('(prefers-reduced-motion: reduce)');
  // 唯一の実進行度。アバターの座標・スクロール位置・UIはここから導出します。
  const state={t:0,phase:'loading',near:null,activeHouse:null,reduced:motion.matches};
  let targetT=null, expectedScroll=null, range=1, transitionGeneration=0, previousScroll=window.scrollY;
  let returnT=0, opener=null, outboundTimer=null, navigating=false, lastProject=null;
  const panel=$('#panel'),body=$('#panel-body'),prompt=$('#approach-prompt'),outbound=$('#outbound');
  const escape=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const safeURL=value=>{try{const u=new URL(value);return /^https?:$/.test(u.protocol)?u.href:'';}catch{return ''}};
  const imageSource=src=>{
    if(typeof src!=='string'||!src)return '';
    if(window.PORTFOLIO_SCREENSHOTS?.[src])return window.PORTFOLIO_SCREENSHOTS[src];
    try{const u=new URL(src,location.href);return /^(https?:|file:)$/.test(u.protocol)?u.href:''}catch{return ''}
  };
  const emit=(name,detail)=>window.dispatchEvent(new CustomEvent(name,{detail}));
  const announce=text=>{$('#announcement').textContent=text};
  function phase(value){
    state.phase=value;document.body.dataset.phase=value;
    document.body.classList.toggle('is-locked',['entering','inside','leaving'].includes(value));
    if(value!=='walking'){targetT=null;emit('town:clear-input');}
    emit('town:state',{...state});
  }
  function updateProgressUI(){
    $('#progress-text').textContent=Math.round(state.t*100)+'%';
    $('#progress-fill').style.transform='scaleX('+state.t+')';
    const passed=stops.filter(s=>state.t>=s.t-.045).at(-1);
    $('#current-stop').textContent=state.t>.975?'道のつづきは、作品の中へ。':passed?passed.number+' / '+passed.title:'道のはじまり';
    document.querySelectorAll('.town-nav [data-house]').forEach(b=>{
      if(b.dataset.house===state.near)b.setAttribute('aria-current','step');else b.removeAttribute('aria-current');
    });
  }
  function writeScroll(){
    if(state.reduced)return; // 動きを減らす設定では自動スクロール追従を行わない
    const y=Math.round(state.t*range);
    if(Math.abs(window.scrollY-y)<1)return;
    expectedScroll=y;window.scrollTo({top:y,behavior:'instant'});
  }
  function setProgress(value,source='input'){
    if(!Number.isFinite(value))return;
    state.t=Math.max(0,Math.min(1,value));
    if(source!=='scroll')writeScroll();
    updateProgressUI();emit('town:progress',{t:state.t,source});
  }
  function refreshRange(){
    range=Math.max(1,document.documentElement.scrollHeight-window.innerHeight);
    previousScroll=window.scrollY;
    if(!['loading','intro'].includes(state.phase))writeScroll();
  }
  function seek(value){
    if(state.phase!=='walking')return;
    const t=Math.max(0,Math.min(1,value));
    if(state.reduced){targetT=null;setProgress(t);}else targetT=t;
  }
  function tick(dt){
    if(state.phase!=='walking'||targetT===null)return false;
    const d=targetT-state.t,step=Math.min(Math.abs(d),dt*.058);
    if(Math.abs(d)<.00008){targetT=null;return false}
    setProgress(state.t+Math.sign(d)*step);
    return true;
  }
  function nearHouse(id){
    if(state.phase!=='walking')id=null;
    if(state.near===id)return;
    state.near=id;
    const stop=stops.find(s=>s.id===id);
    prompt.classList.toggle('is-visible',!!stop);prompt.inert=!stop;
    prompt.setAttribute('aria-hidden',String(!stop));
    if(stop){$('#enter-label').textContent=stop.title+'に入る';announce(stop.title+'の前です。Enterまたはスペースで入れます。');}
    else if(prompt.contains(document.activeElement))$('#town').focus({preventScroll:true});
    updateProgressUI();emit('town:near',stop||null);
  }
  function ready(ok=true){
    if(state.phase!=='loading')return;
    phase('intro');$('#start-walk').disabled=false;
    $('#start-walk').textContent=ok?'歩いてみる →':'メニューから見る →';
    $('#loading-status').textContent=ok?'スクロールでも、ドラッグでも。':'3D表示を読み込めませんでした。メニューから全作品をご覧いただけます。';
  }
  function start(direct=false){
    if(!['intro','loading'].includes(state.phase))return;
    const generation=++transitionGeneration;
    $('#intro').classList.add('is-leaving');document.body.classList.remove('is-intro');
    phase('opening');refreshRange();setProgress(0,'start');emit('town:start');
    const finish=()=>{
      if(generation!==transitionGeneration)return;
      $('#intro').hidden=true;$('#wheel-host').hidden=true;phase('walking');
      if(!direct)$('#town').focus({preventScroll:true});
      announce('道のはじまりです。縦スクロール、またはドラッグで歩けます。');
    };
    if(state.reduced||direct)finish();else setTimeout(finish,800);
  }
  function requestHouse(id,trigger){
    if(['loading','intro'].includes(state.phase))start(true);
    if(!['walking'].includes(state.phase))return;
    const stop=stops.find(s=>s.id===id);if(!stop)return;
    opener=trigger||document.activeElement;state.activeHouse=id;returnT=stop.t;
    nearHouse(null);setProgress(stop.t,'enter');phase('entering');
    const generation=++transitionGeneration;
    emit('town:door',{id,open:true}); // ドア → ホワイトアウト → コンテンツ
    const show=()=>{if(generation!==transitionGeneration)return;renderSection(id);panel.classList.remove('is-leaving');if(!panel.open)panel.showModal();panel.scrollTop=0;phase('inside');$('#close-panel').focus({preventScroll:true});};
    if(state.reduced){show();return;}
    setTimeout(()=>{if(generation===transitionGeneration)$('#whiteout').classList.add('is-active');},85);
    setTimeout(show,280);
    setTimeout(()=>{if(generation===transitionGeneration)$('#whiteout').classList.remove('is-active');},420);
  }
  function closePanel(){
    if(!['inside','entering'].includes(state.phase)||navigating)return;
    const generation=++transitionGeneration;phase('leaving');panel.classList.add('is-leaving');
    const house=state.activeHouse;emit('town:door',{id:house,open:false});
    const finish=()=>{
      if(generation!==transitionGeneration)return;
      if(panel.open)panel.close();panel.classList.remove('is-leaving');
      setProgress(returnT,'return');state.activeHouse=null;phase('walking');
      $('#whiteout').classList.remove('is-active');
      if(opener?.isConnected&&!opener.closest('[inert]'))opener.focus({preventScroll:true});else $('#town').focus({preventScroll:true});
      announce('家の前に戻りました。');
    };
    if(state.reduced){finish();return}
    $('#whiteout').classList.add('is-active');
    setTimeout(()=>{if(generation===transitionGeneration&&panel.open)panel.close()},180);
    setTimeout(finish,400);
  }
  function renderSection(id){
    const stop=stops.find(s=>s.id===id);
    $('#panel-kicker').textContent=stop?stop.number+' / '+stop.english:'HOW TO WALK';
    let html='<h2 id="panel-title">'+escape(stop?.title||'街の歩き方')+'</h2>';
    if(id==='about')html+='<div class="about-copy"><p class="intro-name">'+escape(data.name)+'</p><p>'+escape(data.bio)+'</p><div class="panel-links">'+socialLink('GitHub',data.github)+socialLink('X',data.x)+'</div></div>';
    if(id==='projects'||id==='team'){
      const items=id==='team'?data.teamProjects:data.projects;
      html+='<p>気になる作品を選んでください。</p><div class="project-list">'+(items.length?items.map(p=>'<button class="project-row" data-project="'+escape(p.id)+'">'+thumbnail(p)+'<span><strong>'+escape(p.title)+'</strong><small>'+ (id==='team'?'チーム制作':'個人制作')+'</small></span><span aria-hidden="true">↗</span></button>').join(''):'<p>作品を準備しています。</p>')+'</div>';
    }
    if(id==='contact')html+='<h3>使えるスキル</h3><div class="badge-list">'+data.skills.map(s=>'<span class="badge">'+escape(s)+'</span>').join('')+'</div><h3>お問い合わせ</h3><p>制作のご相談やご連絡は、こちらから。</p>'+(/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)?'<a class="action primary" href="mailto:'+encodeURIComponent(data.email)+'">メールで問い合わせる ↗</a>':'<button class="action" disabled>お問い合わせ · 準備中</button>');
    if(id==='help')html+='<p>ページを下へスクロールすると、ハムスターが道を進みます。上へスクロールすると戻ります。</p><p>マウスは街を押したままドラッグ。スマホは「ドラッグで歩く」ボタンやハムスターの下の ↕ を押したまま上下へ引っ張れます。画面のそれ以外の場所は通常の縦スクロールです。</p><p>矢印キーでも歩けます。家に近づくと「入る」が現れます。クリック、Enter、スペースで決定して初めて開きます。Escapeで家の前に戻ります。</p><p>動きを減らす設定では、ズームや自動スクロール、回し車の待ち時間を省き、位置を瞬時に切り替えます。</p>';
    body.innerHTML=html;wireImageFallbacks();
  }
  function socialLink(label,url){return safeURL(url)?'<a class="action" href="'+escape(safeURL(url))+'" target="_blank" rel="noopener noreferrer">'+label+' ↗</a>':'<button class="action" disabled>'+label+' · 準備中</button>';}
  function thumbnail(p){
    const image=p.screenshots?.[0],src=imageSource(image?.src);
    return src?'<img class="project-thumb" src="'+escape(src)+'" alt="'+escape(image.alt||p.title+'の画面')+'" width="88" height="100" data-image-fallback="'+escape(p.title)+'">':'<span class="project-thumb thumb-placeholder">'+escape(p.title)+'</span>';
  }
  function findProject(id){return [...data.projects,...data.teamProjects].find(p=>p.id===id)}
  function detail(id){
    const p=findProject(id);if(!p)return;
    const team=data.teamProjects.includes(p),back=team?'team':'projects',url=safeURL(p.url);
    let gallery=(p.screenshots||[]).map((im,i)=>{
      const source=imageSource(im.src);
      return '<figure>'+(source?'<img src="'+escape(source)+'" alt="'+escape(im.alt||p.title+'の画面 '+(i+1))+'" width="540" height="960" data-image-fallback="'+escape(p.title)+'">':'<div class="screenshot-placeholder">'+escape(p.title)+'<br>画像を準備中</div>')+'<figcaption>'+escape(im.alt||p.title+' / '+(i+1))+'</figcaption></figure>';
    }).join('');
    if(!gallery)gallery='<figure><div class="screenshot-placeholder">'+escape(p.title)+'<br>画像を準備中</div></figure>';
    body.innerHTML='<button class="back" data-back="'+back+'">← 作品一覧に戻る</button><div class="project-title-line"><h2 id="panel-title">'+escape(p.title)+'</h2>'+(url?'<a class="action primary" data-outbound="'+escape(p.id)+'" href="'+escape(url)+'">'+(team?'確認して作品を開く':'作品を開く')+' ↗</a>':'<button class="action" disabled>作品リンク · 準備中</button>')+'</div>'+(team&&url?'<p class="team-notice">外部サイト（'+escape(new URL(url).hostname)+'）へ移動します。「確認して作品を開く」で、このタブに作品ページを開きます。</p>':'')+'<div class="screenshot-gallery">'+gallery+'</div><p class="project-description">'+escape(p.description)+'</p>';
    wireImageFallbacks();panel.scrollTop=0;body.querySelector('.back').focus({preventScroll:true});
  }
  function wireImageFallbacks(){
    body.querySelectorAll('[data-image-fallback]').forEach(img=>{
      img.addEventListener('error',()=>{const box=document.createElement('div');box.className=img.classList.contains('project-thumb')?'project-thumb thumb-placeholder':'screenshot-placeholder';box.textContent=img.dataset.imageFallback+' · 画像を準備中';img.replaceWith(box);},{once:true});
    });
  }
  function restoreWheel(){
    if(outbound.open)outbound.close();navigating=false;clearTimeout(outboundTimer);
    $('#wheel-slot').append($('#wheel-host'));$('#wheel-host').hidden=$('#intro').hidden;
    emit('town:wheel',{active:!$('#intro').hidden,project:null});
  }
  function followLink(project){
    const url=safeURL(project?.url);if(!url||navigating)return;
    const go=()=>{restoreWheel();location.assign(url)};
    if(state.reduced){go();return;}
    navigating=true;lastProject=project;
    $('#outbound-title').textContent=project.title+'を開いています';
    $('#outbound-wheel-slot').append($('#wheel-host'));$('#wheel-host').hidden=false;
    if(!outbound.open)outbound.showModal();
    emit('town:wheel',{active:true,project});
    // 画像の読込完了には依存しません。演出は最大1.05秒、同じタブで遷移。
    outboundTimer=setTimeout(go,1050);
  }
  $('#wheel-slot').append($('#wheel-host'));
  $('#start-walk').addEventListener('click',()=>start());
  $('#intro-menu-link').addEventListener('click',()=>{start(true);$('#menu').querySelector('button').focus({preventScroll:true})});
  $('.skip-link').addEventListener('click',e=>{e.preventDefault();start(true);$('#menu').querySelector('button').focus({preventScroll:true})});
  $('#reset').addEventListener('click',()=>{if(state.phase==='walking'){targetT=null;nearHouse(null);setProgress(0,'reset');emit('town:clear-input');announce('道のはじまりに戻りました。')}});
  $('#enter-house').addEventListener('click',()=>{if(state.near)requestHouse(state.near,$('#town'))});
  $('#close-panel').addEventListener('click',closePanel);
  panel.addEventListener('cancel',e=>{e.preventDefault();closePanel()});
  panel.addEventListener('click',e=>{if(e.target!==panel)return;const r=panel.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)closePanel()});
  outbound.addEventListener('cancel',e=>{e.preventDefault();restoreWheel()});
  $('#help').addEventListener('click',e=>{
    if(state.phase!=='walking')return;opener=e.currentTarget;returnT=state.t;state.activeHouse=null;
    nearHouse(null);phase('inside');renderSection('help');panel.showModal();$('#close-panel').focus({preventScroll:true});
  });
  document.addEventListener('click',e=>{
    const h=e.target.closest('[data-house]');if(h){requestHouse(h.dataset.house,h);return;}
    const p=e.target.closest('[data-project]');if(p){detail(p.dataset.project);return;}
    const b=e.target.closest('[data-back]');if(b){renderSection(b.dataset.back);body.querySelector('[data-project]')?.focus({preventScroll:true});return;}
    const a=e.target.closest('[data-outbound]');if(a&&!e.metaKey&&!e.ctrlKey&&!e.shiftKey&&!e.altKey&&e.button===0){e.preventDefault();followLink(findProject(a.dataset.outbound))}
  });
  document.addEventListener('keydown',e=>{
    if(e.key==='Escape'&&state.phase==='entering'){e.preventDefault();closePanel();return;}
    if(e.repeat||state.phase!=='walking'||!state.near||!['Enter',' '].includes(e.key))return;
    // Enter on another interactive control keeps its ordinary button/link behavior.
    const target=e.target;
    if(target instanceof Element&&target.closest('button,a,input,textarea,select')&&!['enter-house','drag-walk','avatar-handle'].includes(target.id))return;
    e.preventDefault();requestHouse(state.near,target);
  });
  window.addEventListener('scroll',()=>{
    const y=window.scrollY;
    const delta=y-previousScroll;previousScroll=y;
    if(state.phase!=='walking')return;
    if(expectedScroll!==null&&Math.abs(y-expectedScroll)<1.5){expectedScroll=null;return;}
    expectedScroll=null;targetT=null;emit('town:clear-input');
    // Reduced mode has no automatic scrolling: relative input prevents a jump after a teleport.
    setProgress(state.reduced?state.t+delta/range:y/range,'scroll');
  },{passive:true});
  window.addEventListener('resize',refreshRange);
  window.addEventListener('pageshow',()=>{if(navigating)restoreWheel();if(state.phase==='inside')$('#close-panel').focus({preventScroll:true})});
  motion.addEventListener('change',e=>{
    state.reduced=e.matches;targetT=null;expectedScroll=null;previousScroll=window.scrollY;++transitionGeneration;
    if(!state.reduced)writeScroll();
    if(state.reduced&&navigating){const p=lastProject;restoreWheel();followLink(p);}
    if(['entering','leaving'].includes(state.phase)){
      if(state.phase==='entering'){renderSection(state.activeHouse);if(!panel.open)panel.showModal();phase('inside');$('#close-panel').focus({preventScroll:true});}
      else{if(panel.open)panel.close();setProgress(returnT);state.activeHouse=null;phase('walking');$('#town').focus({preventScroll:true})}
      $('#whiteout').classList.remove('is-active');panel.classList.remove('is-leaving');
    }
    if(state.phase==='opening'){$('#intro').hidden=true;$('#wheel-host').hidden=true;phase('walking');}
    emit('town:motion',{reduced:state.reduced});
  });
  refreshRange();updateProgressUI();setTimeout(()=>ready(false),12000);
  window.TownState={
    stops,
    get snapshot(){return Object.freeze({...state})},
    imageSource,ready,start,seek,tick,setNear:nearHouse,requestHouse,
    clearIntent(){targetT=null},
    move(value){if(state.phase==='walking'){targetT=null;setProgress(value)}},
    get scrollRange(){return range}
  };
})();
