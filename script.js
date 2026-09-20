/* 編集しやすい内容はすべてここにまとめています。作品説明と画像は後から差し替え可能です。 */
window.PORTFOLIO={
  name:'ayarion',
  github:'https://github.com/ayarion',
  x:'https://x.com/lavien_kan',
  email:'',
  skills:['HTML','CSS','JavaScript','Python','C'],
  projects:[
    {id:'togame',title:'togame',url:'',description:'作品の説明を準備中です。',screenshots:[{src:'assets/screenshots/togame-01.png',alt:'togameの画面'}]},
    {id:'ojimate',title:'OjiMate',url:'https://tsukuriba.org/OjiMate/',description:'作品の説明を準備中です。',screenshots:[{src:'assets/screenshots/ojimate-01.png',alt:'OjiMateの画面'}]},
    {id:'kinto-log',title:'Kinto-Log',url:'https://tsukuriba.org/kinto-log/',description:'作品の説明を準備中です。',screenshots:[{src:'assets/screenshots/kinto-log-01.jpg',alt:'Kinto-Logの画面'}]}
  ],
  teamProjects:[
    {id:'mersampo',title:'mersampo',url:'https://tsukuriba.org/mersampo/',description:'作品の説明を準備中です。',screenshots:[{src:'assets/screenshots/mersampo-01.png',alt:'mersampoの画面'},{src:'assets/screenshots/mersampo-03.png',alt:'mersampoの商品画面'}]}
  ]
};

(()=>{'use strict';
  const data=window.PORTFOLIO,$=s=>document.querySelector(s),escapeHTML=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const safeURL=value=>{if(!value)return '';try{const u=new URL(value,location.href);return /^https?:$/.test(u.protocol)?u.href:''}catch{return ''}};
  const projectImage=project=>project.screenshots?.[0]?.src?'<img loading="lazy" src="'+escapeHTML(project.screenshots[0].src)+'" alt="'+escapeHTML(project.screenshots[0].alt||project.title)+'">':'<div class="image-placeholder" aria-label="画像準備中">IMAGE<br>準備中</div>';
  const projectWindow=(project,index,kind)=>{
    const url=safeURL(project.url),blank=!url;
    return '<article class="mini-window reveal" style="--delay:'+index*90+'ms"><div class="window-bar window-bar--'+(kind==='team'?'pink':'blue')+'"><span>'+escapeHTML(project.title)+'.app</span><b>−</b><b>□</b><b>×</b></div><div class="mini-body"><div class="project-image">'+projectImage(project)+'</div><div class="project-copy"><p class="window-kicker">'+(kind==='team'?'TEAM_PROJECT':'PERSONAL_PROJECT')+'</p><h3>'+escapeHTML(project.title)+'</h3><p>'+escapeHTML(project.description)+'</p>'+(blank?'<button class="pill is-disabled" type="button" disabled>リンク準備中</button>':'<a class="pill pill--primary" href="'+escapeHTML(url)+'" target="_blank" rel="noreferrer">作品を開く ↗</a>')+'</div></div></article>';
  };
  $('#personal-projects').innerHTML=data.projects.map((p,i)=>projectWindow(p,i,'personal')).join('');
  $('#team-project').innerHTML=data.teamProjects.map((p,i)=>'<div class="team-project-grid">'+projectWindow(p,i,'team')+'<div class="team-note"><span aria-hidden="true">👥</span><p>チームでつくった作品</p><small>作品の詳細はリンク先でご覧ください。</small></div></div>').join('');
  $('#skill-list').innerHTML=data.skills.map((skill,i)=>'<span class="skill-chip skill-chip--'+(i%4)+'">'+escapeHTML(skill)+'</span>').join('');

  const observer=new IntersectionObserver(entries=>entries.forEach(entry=>{if(entry.isIntersecting){entry.target.classList.add('is-visible');observer.unobserve(entry.target)}}),{threshold:.16,rootMargin:'0px 0px -8% 0px'});
  document.querySelectorAll('.reveal:not(.is-visible)').forEach(el=>observer.observe(el));
  const menu=$('#quick-menu'),toggle=$('#menu-toggle');
  function closeMenu(){menu.hidden=true;toggle.setAttribute('aria-expanded','false');toggle.setAttribute('aria-label','メニューを開く')}
  toggle.addEventListener('click',()=>{const open=menu.hidden;menu.hidden=!open;toggle.setAttribute('aria-expanded',String(open));toggle.setAttribute('aria-label',open?'メニューを閉じる':'メニューを開く');if(open)menu.querySelector('a')?.focus()});
  $('#menu-close').addEventListener('click',closeMenu);
  menu.querySelectorAll('a').forEach(a=>a.addEventListener('click',closeMenu));
  document.addEventListener('click',e=>{if(!menu.hidden&&!menu.contains(e.target)&&!toggle.contains(e.target))closeMenu()});
  document.querySelectorAll('.window-close').forEach(button=>button.addEventListener('click',()=>{const windowEl=button.closest('.os-window');windowEl.classList.toggle('is-minimized');button.setAttribute('aria-label',windowEl.classList.contains('is-minimized')?'ウィンドウを戻す':'ウィンドウを最小化')}));
  const navLinks=[...menu.querySelectorAll('a')],sections=navLinks.map(a=>document.querySelector(a.getAttribute('href'))).filter(Boolean);
  const sectionObserver=new IntersectionObserver(entries=>entries.forEach(entry=>{if(entry.isIntersecting){navLinks.forEach(a=>a.removeAttribute('aria-current'));menu.querySelector('a[href="#'+entry.target.id+'"]')?.setAttribute('aria-current','page')}}),{rootMargin:'-35% 0px -55% 0px'});
  sections.forEach(section=>sectionObserver.observe(section));
  window.addEventListener('keydown',e=>{if(e.key==='Escape')closeMenu()});
})();

