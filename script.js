/* 差し替え用データ。個人制作は名前・画像・URLのみ、チーム制作はcaptionも表示。
 * artwork: 作品画像。Kinto-Logはアーチ型、さんぽは背景透過のイラストです。
 * action: 'download' はtogameだけ。URLは指定されたApp Storeのページです。
 * email: CONTACTのメールリンク。caption: チーム制作の見出し下の一言。
 */
window.PORTFOLIO = {
  name: 'ayarion',
  x: 'https://x.com/lavien_kan',
  email: 'ayarionpc@gmail.com',
  skills: ['HTML', 'CSS', 'JavaScript', 'Python', 'C'],
  projects: [
    { id: 'togame', title: 'togame', url: 'https://apps.apple.com/jp/app/sns%E3%82%92%E3%82%AD%E3%83%A3%E3%83%A9%E3%81%8C%E3%83%88%E3%82%AC%E3%83%A1%E3%82%8B/id6811971132', action: 'download', artwork: 'assets/artwork/togame-repaired.png', alt: 'togameの青・黄・紫・ピンクのキャラクターとロゴ', width: 1536, height: 1024 },
    { id: 'ojimate', title: 'OjiMate', url: 'https://tsukuriba.org/OjiMate/', artwork: 'assets/artwork/ojimate.png', alt: 'OjiMateのおじさんと猫、ベンチ', width: 1536, height: 1024 },
    { id: 'kinto-log', title: 'Kinto-Log', url: 'https://tsukuriba.org/kinto-log/', artwork: 'assets/screenshots/kinto-log-01.jpg', alt: 'Kinto-Logのトレーニング記録画面', shape: 'arch', width: 908, height: 1614 }
  ],
  teamProjects: [
    { id: 'mersampo', title: 'mersampo', caption: 'Mercari AI Agent Hackathon 優秀賞受賞', url: 'https://tsukuriba.org/mersampo/', artwork: 'assets/artwork/mersampo.png', alt: 'mersampoのお店、人々、街路樹が並ぶ街並み', width: 1536, height: 1024 },
    { id: 'businessai-origin-2026', title: 'さんぽ', caption: 'BusinessAI Hackathon Origin 2026 制作', url: 'https://wanpo.tsukuriba.org/', artwork: 'assets/artwork/sanpo-dog.webp', alt: 'さんぽの犬のイラスト', width: 1254, height: 1254 }
  ]
};

(() => {
  'use strict';
  initOpening();
  const data = window.PORTFOLIO;
  const escapeHTML = value => String(value ?? '').replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));
  const safeURL = value => {
    if (typeof value !== 'string' || !value.trim()) return '';
    try {
      const url = new URL(value, location.href);
      return /^https?:$/.test(url.protocol) ? url.href : '';
    } catch (error) {
      console.error('作品リンクのURLを確認してください。', error);
      return '';
    }
  };
  const downloadIcon = '<svg class="download-icon" viewBox="0 0 32 34" fill="currentColor" aria-hidden="true"><path d="M13 1a2 2 0 0 0-2 2v11H6a2 2 0 0 0-1.5 3.3l10 11a2 2 0 0 0 3 0l10-11A2 2 0 0 0 26 14h-5V3a2 2 0 0 0-2-2zM3 30a2 2 0 0 0-2 2v1h30v-1a2 2 0 0 0-2-2z"/></svg>';

  function projectMarkup(project, index, team = false) {
    const url = safeURL(project.url);
    const reverse = team || index % 2 === 1;
    const action = project.action === 'download'
      ? downloadIcon + '<span class="download-label">GET THE APP</span><span class="download-store">App Store</span>'
      : '<span>作品を見る</span><span class="link-arrow" aria-hidden="true">↗</span>';
    const label = project.action === 'download' ? project.title + 'をApp Storeでダウンロード（新しいタブで開く）' : project.title + 'の作品ページ（新しいタブで開く）';
    const visual = project.artwork
      ? '<figure class="project-visual' + (project.shape === 'arch' ? ' project-visual--arch' : '') + '"><img src="' + escapeHTML(project.artwork) + '" alt="' + escapeHTML(project.alt) + '" width="' + (project.width || 1536) + '" height="' + (project.height || 1024) + '" loading="lazy" decoding="async"></figure>'
      : '<figure class="project-visual project-visual--placeholder" role="img" aria-label="' + escapeHTML(project.alt) + '"><span>' + escapeHTML(project.placeholder || project.title) .replace(/\n/g, '<br>') + '</span></figure>';
    const actions = url ? '<a class="pressable ' + (project.action === 'download' ? 'download-link' : 'project-link') + '" href="' + escapeHTML(url) + '" target="_blank" rel="noopener noreferrer" aria-label="' + escapeHTML(label) + '">' + action + '</a>' : '';
    return '<article class="project project--' + escapeHTML(project.id) + (reverse ? ' project--reverse' : '') + ' section-reveal" aria-labelledby="title-' + escapeHTML(project.id) + '">' +
      visual +
      '<div class="project-copy"><h3 id="title-' + escapeHTML(project.id) + '">' + escapeHTML(project.title) + '</h3>' +
      (team && project.caption ? '<p class="project-description">' + escapeHTML(project.caption) + '</p>' : '') +
      (actions ? '<div class="project-actions">' + actions + '</div>' : '') + '</div></article>';
  }

  document.querySelector('#personal-projects').innerHTML = data.projects.map((project, index) => projectMarkup(project, index)).join('');
  document.querySelector('#team-projects').innerHTML = data.teamProjects.map((project, index) => projectMarkup(project, index, true)).join('');
  document.querySelector('#skill-list').innerHTML = data.skills.map(skill => '<li>' + escapeHTML(skill) + '</li>').join('');
  if (data.email) {
    const contact = document.querySelector('#contact-status');
    const link = document.createElement('a');
    link.className = 'text-link pressable';
    link.href = 'mailto:' + data.email;
    link.textContent = data.email;
    contact.replaceChildren(link);
  }

  // 初期表示領域は隠さず、これから見える項目だけ一度フェードイン。
  // JSやIntersectionObserverが利用できない場合にも本文は見えます。
  if ('IntersectionObserver' in window) {
    const revealObserver = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.removeAttribute('data-pending');
          revealObserver.unobserve(entry.target);
        }
      });
    }, { threshold: .08, rootMargin: '0px 0px -24px 0px' });
    document.querySelectorAll('.section-reveal').forEach(element => {
      if (element.getBoundingClientRect().top >= innerHeight - 24) {
        element.setAttribute('data-animate', '');
        element.setAttribute('data-pending', '');
        revealObserver.observe(element);
      }
    });
    document.addEventListener('focusin', event => event.target.closest('.section-reveal')?.removeAttribute('data-pending'));
  }

  // Pointer Eventsに統一。リンクはpreventDefaultせず即座に開くため、
  // 修飾キー・キーボード操作・ブラウザの新規タブ動作を保ちます。
  // タップ後180msだけ形を残し、連打でも現在の形からなめらかに遷移。
  const activePointers = new Map();
  const timers = new Map();
  const hold = element => {
    clearTimeout(timers.get(element));
    timers.delete(element);
    element.classList.add('is-pressed');
  };
  const release = element => {
    if (!element) return;
    clearTimeout(timers.get(element));
    timers.set(element, setTimeout(() => { element.classList.remove('is-pressed'); timers.delete(element); }, 180));
  };
  const clearInput = () => {
    timers.forEach(timer => clearTimeout(timer));
    timers.clear();
    activePointers.clear();
    document.querySelectorAll('.is-pressed').forEach(element => element.classList.remove('is-pressed'));
  };
  document.addEventListener('pointerdown', event => {
    if (!event.isPrimary || event.button !== 0) return;
    const element = event.target.closest('.pressable');
    if (element) { hold(element); activePointers.set(event.pointerId, element); }
  });
  document.addEventListener('pointerup', event => { release(activePointers.get(event.pointerId)); activePointers.delete(event.pointerId); });
  document.addEventListener('pointercancel', clearInput);
  document.addEventListener('click', event => {
    // キーボードではfocus-visibleの色変化だけにし、拡縮は行いません。
    if (event.detail === 0) return;
    const element = event.target.closest('.pressable');
    if (element) { hold(element); release(element); }
  });
  window.addEventListener('blur', clearInput);
  window.addEventListener('pageshow', clearInput);
  document.addEventListener('visibilitychange', () => { if (document.hidden) clearInput(); });

  function initOpening() {
    const root = document.documentElement;
    const opening = document.getElementById('opening');
    if (!opening) return;
    const motionPreference = matchMedia('(prefers-reduced-motion: reduce)');
    // Deep links go to their content; #top is still the home introduction.
    if (!root.hasAttribute('data-opening') || (location.hash && location.hash !== '#top')) {
      window.cancelPortfolioIntroFallback?.();
      root.removeAttribute('data-opening');
      window.releasePortfolioIntroScroll?.();
      opening.remove();
      return;
    }

    // Count visible time only, starting after the first paint. Mobile browsers
    // may load in a hidden tab; neither the clock nor CSS motion advances there.
    // Only font readiness is awaited; offscreen lazy images never delay entry.
    const minimumMs = 1500;
    const readinessLimitMs = 2600;
    // Single duration token shared with the fabric animation; no timeout/CSS drift.
    const exitMs = parseFloat(getComputedStyle(opening).getPropertyValue('--curtain-duration')) || 1200;
    let leaving = false;
    let removed = false;
    let fontsReady = false;
    let visibleMs = 0;
    let lastFrame = null;
    let frame;
    let exitTimer;
    const content = [...document.querySelectorAll('.site-header, main, .skip-link, noscript')];
    opening.removeAttribute('aria-hidden');
    content.forEach(element => { element.inert = true; element.setAttribute('data-opening-inert', ''); });

    function removeOpening() {
      if (removed) return;
      removed = true;
      const returnFocus = opening.contains(document.activeElement);
      clearTimeout(exitTimer);
      cancelAnimationFrame(frame);
      window.cancelPortfolioIntroFallback?.();
      root.removeAttribute('data-opening');
      content.forEach(element => { element.inert = false; element.removeAttribute('data-opening-inert'); });
      opening.remove();
      // Unlock first, then reset synchronously: never smooth-scroll through works.
      window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
      window.releasePortfolioIntroScroll?.();
      document.removeEventListener('keydown', onKey);
      document.removeEventListener('visibilitychange', onVisibility);
      window.removeEventListener('pageshow', onPageShow);
      window.removeEventListener('portfolio:intro-fallback', removeOpening);
      motionPreference.removeEventListener('change', onMotionChange);
      if (returnFocus) document.querySelector('.wordmark')?.focus({ preventScroll: true });
    }
    function finish(immediate = false) {
      if (removed) return;
      if (immediate) { removeOpening(); return; }
      if (leaving) return;
      leaving = true;
      window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
      cancelAnimationFrame(frame);
      root.setAttribute('data-opening', 'active');
      opening.classList.add('is-leaving');
      exitTimer = setTimeout(removeOpening, motionPreference.matches ? 150 : exitMs);
    }
    function tick(now) {
      if (removed || leaving || document.hidden) return;
      if (lastFrame !== null) visibleMs += now - lastFrame;
      lastFrame = now;
      root.setAttribute('data-opening', 'active');
      const duration = fontsReady ? (motionPreference.matches ? 600 : minimumMs) : readinessLimitMs;
      if (visibleMs >= duration) finish();
      else frame = requestAnimationFrame(tick);
    }
    function startVisibleFrames() {
      cancelAnimationFrame(frame);
      lastFrame = null;
      // One frame for layout/paint before starting the visible-time clock.
      if (!document.hidden && !removed && !leaving) frame = requestAnimationFrame(() => { frame = requestAnimationFrame(tick); });
    }
    function onKey(event) {
      if (['Escape', 'PageDown', 'PageUp', 'Home', 'End', 'ArrowDown', 'ArrowUp', ' '].includes(event.key)) {
        // Consume this skip gesture; its default must not scroll the revealed page.
        event.preventDefault();
        finish(true);
      }
    }
    function onVisibility() {
      if (document.hidden) {
        cancelAnimationFrame(frame);
        lastFrame = null;
        root.setAttribute('data-opening', 'paused');
        // The visitor has already watched the opening if the exit has begun.
        if (leaving) finish(true);
      } else startVisibleFrames();
    }
    function onPageShow(event) { if (event.persisted) finish(true); }
    function onMotionChange() { if (leaving) finish(true); }
    opening.querySelector('.opening-skip').addEventListener('click', event => finish(event.detail === 0));
    // Absorb the wheel gesture (and its inertia) while the curtain opens. Scrolling
    // the actual page starts only with a new gesture after the title is visible.
    opening.addEventListener('wheel', event => { event.preventDefault(); finish(); }, { passive: false });
    // Minor finger movement must not swallow the introduction on phones.
    // Touch scrolling is contained by CSS; the visible SKIP button remains usable.
    document.addEventListener('keydown', onKey);
    document.addEventListener('visibilitychange', onVisibility);
    window.addEventListener('pageshow', onPageShow);
    window.addEventListener('portfolio:intro-fallback', removeOpening);
    motionPreference.addEventListener('change', onMotionChange);

    const fontReadiness = document.fonts ? document.fonts.ready.catch(error => {
      console.error('オープニングのフォント読み込みを確認してください。', error);
    }) : Promise.resolve();
    fontReadiness.then(() => { fontsReady = true; });
    startVisibleFrames();
  }
})();




