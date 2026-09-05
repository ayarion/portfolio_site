/* ===== 内容の差し替えはこのデータを編集してください =====
   URLは https://... を記入。空文字のリンクは「準備中」と表示されます。
   個人制作の image は assets/filename.jpg などの相対パスを指定できます。 */
window.PORTFOLIO = {
  name: 'Ayaka',
  bio: 'こんにちは、Ayakaです。わたしのポートフォリオへようこそ。制作した作品や使えるスキルを、この小さな街にまとめています。',
  github: '', // TODO: GitHubプロフィールURL
  x: '', // TODO: XプロフィールURL
  teamUrl: '', // TODO: メルカリのハッカソン作品ページURL
  email: '', // TODO: お問い合わせ用メールアドレス
  skills: ['HTML', 'CSS', 'JavaScript', 'Python', 'C', 'C++'],
  projects: [ // TODO: 作品の追加・削除・並べ替えはこの配列を編集
    {id:'project-01',title:'作品名をここに入力 01',category:'Web application',description:'作品の概要、制作の背景、工夫した点をここに入力してください。',url:'',image:'',skills:['HTML','CSS','JavaScript']},
    {id:'project-02',title:'作品名をここに入力 02',category:'Creative coding',description:'使用技術や実装した機能、制作を通して学んだことをここに入力してください。',url:'',image:'',skills:['Python']},
    {id:'project-03',title:'作品名をここに入力 03',category:'Personal project',description:'作品の説明をここに入力してください。画像と公開先リンクも設定できます。',url:'',image:'',skills:['C','C++']}
  ]
};

(() => {
  const data=window.PORTFOLIO, panel=document.querySelector('#panel'),body=document.querySelector('#panel-body'),kicker=document.querySelector('#panel-kicker');
  let opener=null,closeTimer;
  const escape=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const safeURL=s=>{try{const u=new URL(s);return ['https:','http:'].includes(u.protocol)?u.href:''}catch{return ''}};
  const link=(label,url)=>safeURL(url)?`<a class="action" href="${escape(safeURL(url))}" target="_blank" rel="noopener noreferrer">${label} ↗</a>`:`<button class="action" disabled>${label} · 準備中</button>`;
  const badges=list=>`<div class="badge-list">${list.map(s=>`<span class="badge">${escape(s)}</span>`).join('')}</div>`;
  function show(key,trigger){
    clearTimeout(closeTimer);panel.classList.remove('closing');
    if(!panel.open)opener=trigger||document.activeElement;
    window.dispatchEvent(new CustomEvent('town:pause'));
    const sections={about:['01 / ABOUT ME','自己紹介'],team:['02 / TEAM WORK','チーム制作作品'],projects:['03 / PERSONAL WORK','個人制作作品'],contact:['04 / SKILLS & CONTACT','スキル / お問い合わせ'],help:['HOW TO WALK','街の歩き方']};
    if(!sections[key])return;
    kicker.textContent=sections[key][0];
    let content=`<h2 id="panel-title">${sections[key][1]}</h2>`;
    if(key==='about')content+=`<p class="intro-name">${escape(data.name)}</p><p>${escape(data.bio)}</p><div class="panel-links">${link('GitHub',data.github)}${link('X',data.x)}</div>`;
    if(key==='team')content+=`<p>チームでつくったハッカソン作品をご紹介します。</p><h3>外部サイトへ移動します</h3><p>メルカリのハッカソン作品ページを新しいタブで開きます。</p>${safeURL(data.teamUrl)?`<p class="placeholder">リンク先：${escape(new URL(data.teamUrl).hostname)}</p><div class="panel-links"><a class="action primary" href="${escape(safeURL(data.teamUrl))}" target="_blank" rel="noopener noreferrer">作品ページへ進む ↗</a><button class="action" data-close>街に戻る</button></div>`:'<p class="placeholder">作品ページのリンクは準備中です。</p><button class="action" data-close>街に戻る</button>'}`;
    if(key==='projects')content+=`<p>ひとつずつ、考えて、つくったもの。<br>気になる作品を選んでください。</p><div class="project-list">${data.projects.length?data.projects.map((p,i)=>`<button class="project-row" data-project="${i}"><span><strong>${escape(p.title)}</strong><small>${escape(p.category||'Personal project')}</small></span><span aria-hidden="true">↗</span></button>`).join(''):'<p>作品を準備しています。</p>'}</div>`;
    if(key==='contact')content+=`<h3>使えるスキル</h3>${badges(data.skills)}<h3>お問い合わせ</h3><p>制作のご相談やご連絡は、こちらから。</p>${/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)?`<a class="action primary" href="mailto:${encodeURIComponent(data.email)}">メールで問い合わせる ↗</a>`:'<button class="action" disabled>お問い合わせ · 準備中</button><p class="placeholder">メールアドレスは後日公開予定です。</p>'}`;
    if(key==='help')content+='<p>街の上を押したままドラッグすると、ハムスターが指やマウスの位置を追いかけます。指を離すと、その場所まで歩きます。</p><p>家の入口に近づくと、内容が開きます。家のラベルや画面下のメニューから直接開くこともできます。</p><p>キーボードでは街を選択して矢印キーで移動。Escapeでパネルを閉じられます。「はじめの位置」で中央に戻ります。</p>';
    body.innerHTML=content;if(!panel.open)panel.showModal();document.querySelector('#close-panel').focus({preventScroll:true});
  }
  function close(){if(!panel.open||panel.classList.contains('closing'))return;panel.classList.add('closing');closeTimer=setTimeout(()=>{panel.close();panel.classList.remove('closing');window.dispatchEvent(new CustomEvent('town:resume'));if(opener?.isConnected)opener.focus({preventScroll:true});},matchMedia('(prefers-reduced-motion:reduce)').matches?0:170)}
  function detail(index){const p=data.projects[index];if(!p)return;body.innerHTML=`<button class="back" data-back>← 作品一覧に戻る</button><h2 id="panel-title">${escape(p.title)}</h2><div class="project-art" id="project-art">作品画像を準備中</div><p>${escape(p.description)}</p>${badges(p.skills||[])}<div class="panel-links">${link('作品を見る',p.url)}</div>`;
    if(p.image){let url;try{url=new URL(p.image,location.href);if(!['http:','https:','file:'].includes(url.protocol))return}catch{return}const img=new Image();img.alt=p.title+'の画像';img.onload=()=>document.querySelector('#project-art')?.replaceChildren(img);img.src=url.href;}
    body.querySelector('.back').focus({preventScroll:true});}
  document.addEventListener('click',e=>{const house=e.target.closest('[data-house]');if(house)show(house.dataset.house,house);if(e.target.closest('[data-close]'))close();const project=e.target.closest('[data-project]');if(project)detail(Number(project.dataset.project));if(e.target.closest('[data-back]'))show('projects');});
  document.querySelector('#close-panel').addEventListener('click',close);panel.addEventListener('cancel',e=>{e.preventDefault();close()});panel.addEventListener('click',e=>{if(e.target===panel){const r=panel.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)close()}});
  document.querySelector('#help').onclick=e=>show('help',e.currentTarget);
  document.querySelector('#reset').onclick=()=>window.dispatchEvent(new CustomEvent('town:reset'));
  document.querySelector('#year').textContent=new Date().getFullYear();
  window.addEventListener('town:enter',e=>show(e.detail,document.querySelector('#town')));
  window.TownUI={show};
  setTimeout(()=>{if(!window.townReady){const t=document.querySelector('#loading');t.textContent='街を読み込めませんでした。下のメニューから各ページをご覧いただけます。';t.classList.add('error')}},15000);
})();
