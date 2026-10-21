/* Centrale */
(() => {
  const root = document.documentElement;
  const motion = root.classList.contains('motion');
  const fine = matchMedia('(hover:hover) and (pointer:fine)').matches;
  const $ = (s, c = document) => c.querySelector(s);
  const $$ = (s, c = document) => [...c.querySelectorAll(s)];

  /* ---------- open / closed (Europe/Berlin) ---------- */
  // Minuten ab Mitternacht; >1440 = nach Mitternacht. So=0 … Sa=6. Feiertage nicht berücksichtigt.
  const HOURS = { 0: null, 1: [600, 1500], 2: [600, 1500], 3: [600, 1500], 4: [600, 1500], 5: [600, 1560], 6: [1020, 1560] };
  const DAYS = ['So', 'Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa'];
  const fmt = m => `${Math.floor((m % 1440) / 60)}${m % 60 ? ':' + String(m % 60).padStart(2, '0') : ''} Uhr`;
  try {
    const parts = new Intl.DateTimeFormat('en-GB', { timeZone: 'Europe/Berlin', weekday: 'short', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).formatToParts(new Date());
    const wd = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].indexOf(parts.find(p => p.type === 'weekday').value);
    const min = +parts.find(p => p.type === 'hour').value * 60 + +parts.find(p => p.type === 'minute').value;
    let openDay = null, until = 0;
    const today = HOURS[wd], prev = HOURS[(wd + 6) % 7];
    if (prev && prev[1] > 1440 && min < prev[1] - 1440) { openDay = (wd + 6) % 7; until = prev[1]; }
    else if (today && min >= today[0] && min < today[1]) { openDay = wd; until = today[1]; }
    const statusEl = $('[data-open-text]');
    if (openDay !== null) {
      statusEl.textContent = `Jetzt offen, bis ${fmt(until)}`; statusEl.classList.add('is-open');
      $$('[data-open-dot]').forEach(d => d.classList.add('is-open'));
    } else {
      let d = wd, first = true;
      for (let i = 0; i < 8; i++) { const h = HOURS[d]; if (h && (!first || min < h[0])) { statusEl.textContent = `Gerade zu, ${i === 0 ? 'heute' : i === 1 ? 'morgen' : DAYS[d]} ab ${fmt(h[0])} wieder offen`; break; } d = (d + 1) % 7; first = false; }
    }
    const signDay = openDay !== null ? openDay : wd;
    $$('.sign__hours [data-days]').forEach(r => { if (r.dataset.days.split(',').includes(String(signDay))) r.classList.add('is-today'); });
  } catch (e) { /* Status bleibt neutral */ }

  /* ---------- splitting ---------- */
  $$('[data-split]').forEach(el => { el.innerHTML = [...el.textContent].map(c => `<span class="char">${c}</span>`).join(''); });
  $$('[data-words]').forEach(el => { el.innerHTML = el.textContent.trim().split(/\s+/).map(w => `<span class="w">${w}</span>`).join(' '); });
  $$('[data-lines]').forEach(el => { el.innerHTML = el.innerHTML.split(/<br\s*\/?>/i).map(l => `<span class="line-mask"><span>${l.trim()}</span></span>`).join(''); });

  /* ---------- mobile menu ---------- */
  const nav = $('.nav'), burger = $('.nav__burger'), overlay = $('.menu-overlay');
  burger.addEventListener('click', () => {
    const open = burger.getAttribute('aria-expanded') !== 'true';
    burger.setAttribute('aria-expanded', open); overlay.classList.toggle('is-open', open); overlay.setAttribute('aria-hidden', !open);
  });
  $$('a', overlay).forEach(a => a.addEventListener('click', () => burger.click()));

  /* ---------- voices ---------- */
  const voices = $$('.voice'), count = $('.voices__count');
  let vi = 0, vt;
  const showVoice = i => {
    const prev = voices[vi]; vi = i; count.textContent = `${i + 1} von ${voices.length}`;
    if (motion && window.gsap) {
      gsap.to(prev, { autoAlpha: 0, duration: .35, ease: 'power1.in' });
      gsap.fromTo(voices[i], { autoAlpha: 0, x: 14 }, { autoAlpha: 1, x: 0, duration: .7, delay: .3, ease: 'power2.out' });
    } else voices.forEach((v, k) => v.classList.toggle('is-active', k === i));
  };
  const auto = () => { clearInterval(vt); vt = setInterval(() => showVoice((vi + 1) % voices.length), 7000); };
  $('.voices__next').addEventListener('click', () => { showVoice((vi + 1) % voices.length); auto(); });
  auto();

  /* ---------- Speisekarte auf Touch: antippen → Foto inline ---------- */
  const touch = !fine && matchMedia('(hover: none), (pointer: coarse)').matches;
  if (touch) {
    root.classList.add('has-touch');
    const anim = motion && window.gsap;
    let openItem = null;
    const close = item => {
      const panel = $('.menu__tap', item); if (!panel) return;
      item.classList.remove('is-open'); item.setAttribute('aria-expanded', 'false');
      if (anim) gsap.to(panel, { height: 0, opacity: 0, duration: .3, ease: 'power2.in', onComplete: () => panel.remove() });
      else panel.remove();
    };
    const open = (item, idx) => {
      const name = $('h4', item).textContent;
      const panel = document.createElement('div');
      panel.className = 'menu__tap';
      // Bild wird erst beim Antippen geladen (kein Vorab-Download aller Fotos auf Mobil)
      panel.innerHTML = `<figure class="polaroid" style="--r:${idx % 2 ? 2.5 : -2.5}deg"><img src="${item.dataset.img}" alt="${name}" decoding="async" /><figcaption>${name.toLowerCase()}</figcaption></figure>`;
      item.appendChild(panel);
      item.classList.add('is-open'); item.setAttribute('aria-expanded', 'true');
      if (anim) {
        gsap.from(panel, { height: 0, opacity: 0, duration: .45, ease: 'power3.out' });
        gsap.from($('.polaroid', panel), { y: -18, rotation: idx % 2 ? 9 : -9, scale: .92, duration: .6, ease: 'back.out(1.6)', delay: .05 });
      }
    };
    $$('.menu__item').forEach((item, idx) => {
      item.setAttribute('role', 'button'); item.setAttribute('tabindex', '0'); item.setAttribute('aria-expanded', 'false');
      const toggle = e => {
        const wasOpen = openItem === item;
        if (openItem) close(openItem);
        openItem = null;
        if (!wasOpen) { open(item, idx); openItem = item; }
        if (window.ScrollTrigger) setTimeout(() => ScrollTrigger.refresh(), 500);
      };
      item.addEventListener('click', toggle);
      item.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggle(e); } });
    });
  }

  if (!motion || !window.gsap) { document.body.classList.remove('is-loading'); return; }
  gsap.registerPlugin(ScrollTrigger);

  /* ---------- Lenis ---------- */
  const lenis = new Lenis({ lerp: .11, smoothWheel: true });
  window.lenis = lenis; lenis.stop();
  lenis.on('scroll', ScrollTrigger.update);
  gsap.ticker.add(t => lenis.raf(t * 1000)); gsap.ticker.lagSmoothing(0);
  $$('a[href^="#"]').forEach(a => a.addEventListener('click', e => {
    const id = a.getAttribute('href'); if (id === '#') return;
    const t = id === '#top' ? 0 : $(id); if (t === null) return;
    e.preventDefault(); lenis.scrollTo(t, { duration: 1.4, offset: id === '#top' ? 0 : -40 });
  }));
  let lastY = 0;
  lenis.on('scroll', ({ scroll }) => {
    nav.classList.toggle('is-scrolled', scroll > 40);
    nav.classList.toggle('is-hidden', scroll > lastY + 2 && scroll > 500 && !overlay.classList.contains('is-open'));
    if (scroll < lastY - 2) nav.classList.remove('is-hidden');
    lastY = scroll;
  });

  /* ---------- loader + intro ---------- */
  const c = { v: 0 }, countEl = $('.loader__count');
  const intro = gsap.timeline();
  intro.to('.loader__word span', { y: 0, duration: .9, ease: 'power3.out', stagger: { each: .045, from: 'start' } })
    .to(c, { v: 100, duration: 1.3, ease: 'power1.inOut', onUpdate: () => countEl.textContent = Math.round(c.v) }, 0)
    .to('.loader', { yPercent: -100, duration: .9, ease: 'power4.inOut' }, 1.45)
    .set('.loader', { display: 'none' })
    .to('.hero__title .char', { y: 0, duration: 1.1, ease: 'power4.out', stagger: i => [0, .05, .09, .16, .2, .27, .3, .36][i] || i * .05 }, 1.75)
    .from('.hero__img-wrap', { clipPath: 'inset(0 0 100% 0)', duration: 1.2, ease: 'power3.inOut' }, 1.85)
    .from('.hero__img', { scale: 1.18, duration: 1.8, ease: 'power2.out' }, 1.85)
    .from('.hero__polaroid', { y: 60, rotation: -14, autoAlpha: 0, duration: 1, ease: 'back.out(1.4)' }, 2.5)
    .from('.hero__meta, .hero__lead', { autoAlpha: 0, y: 10, duration: .8, ease: 'power2.out', stagger: .1 }, 2.2)
    .from('.hero__down', { autoAlpha: 0, duration: .6 }, 2.8)
    .add(() => { document.body.classList.remove('is-loading'); lenis.start(); ScrollTrigger.refresh(); }, 2.2);
  window.__skipIntro = () => intro.progress(1);

  /* hand-drawn strokes */
  const draw = (path, trigger, delay = 0) => {
    const len = path.getTotalLength(); gsap.set(path, { strokeDasharray: len, strokeDashoffset: len });
    const cfg = { strokeDashoffset: 0, duration: 1, ease: 'power1.inOut', delay };
    if (trigger) cfg.scrollTrigger = { trigger, start: 'top 80%' };
    return gsap.to(path, cfg);
  };
  intro.add(() => draw($('.hero__down path')), 2.9);
  $$('.menu__hand path').forEach(p => draw(p, '.menu__hand', .2));

  /* hero parallax (mild) */
  gsap.to('.hero__img', { yPercent: 10, ease: 'none', scrollTrigger: { trigger: '.hero__media', start: 'top top+=100', end: 'bottom top', scrub: true } });
  gsap.to('.hero__polaroid', { y: -50, rotation: -9, ease: 'none', scrollTrigger: { trigger: '.hero__media', start: 'top center', end: 'bottom top', scrub: true } });

  /* marquee */
  const marquee = (sel, speed) => {
    const track = $(sel); let x = 0, half = track.scrollWidth / 2;
    addEventListener('resize', () => half = track.scrollWidth / 2);
    gsap.ticker.add(() => {
      x -= speed + Math.min(Math.abs(lenis.velocity || 0) * .12, 4);
      if (x <= -half) x += half;
      track.style.transform = `translate3d(${x}px,0,0)`;
    });
  };
  marquee('.marquee__track', .55); marquee('.footer__track', .35);

  /* headings: masked lines, each a bit different */
  $$('[data-lines]').forEach((el, i) => {
    gsap.from($$('.line-mask > span', el), { yPercent: 105, duration: 1 + (i % 3) * .15, ease: ['power3.out', 'power4.out', 'expo.out'][i % 3], stagger: .09, scrollTrigger: { trigger: el, start: 'top 85%' } });
  });
  $$('.h2:not([data-lines])').forEach(el => gsap.from(el, { autoAlpha: 0, y: 24, duration: .9, ease: 'power2.out', scrollTrigger: { trigger: el, start: 'top 85%' } }));
  $$('[data-words]').forEach(el => gsap.to($$('.w', el), { opacity: 1, stagger: .08, ease: 'none', scrollTrigger: { trigger: el, start: 'top 78%', end: 'bottom 50%', scrub: .6 } }));

  /* story */
  gsap.fromTo('.story__img--a .parallax', { yPercent: -6 }, { yPercent: 6, ease: 'none', scrollTrigger: { trigger: '.story__img--a', start: 'top bottom', end: 'bottom top', scrub: true } });
  gsap.from('.story__img--a .frame', { clipPath: 'inset(0 100% 0 0)', duration: 1.3, ease: 'power3.inOut', scrollTrigger: { trigger: '.story__img--a', start: 'top 80%' } });
  gsap.from('.story__img--b', { y: 80, rotation: 12, autoAlpha: 0, duration: 1.1, ease: 'back.out(1.2)', scrollTrigger: { trigger: '.story__img--b', start: 'top 92%' } });
  gsap.from('.facts li', { autoAlpha: 0, y: 12, duration: .6, ease: 'power1.out', stagger: .08, scrollTrigger: { trigger: '.facts', start: 'top 90%' } });

  /* ---------- day: horizontal + morning→night colour ---------- */
  const mm = gsap.matchMedia();
  // Tag → Nacht: lange hell, dann zügig dunkel (keine langen matschigen Zwischentöne)
  const dayColours = (trigger, start, end) => gsap.timeline({ scrollTrigger: { trigger, start, end, scrub: .4 } })
    .to('.day', { backgroundColor: '#e3d4bc', duration: 1.4, ease: 'none' })
    .to('.day', { backgroundColor: '#24180f', color: '#f1e8d9', '--day-sub': 'rgba(241,232,217,.72)', duration: .45, ease: 'power1.inOut' })
    .to('.day', { backgroundColor: '#1e1510', duration: .8, ease: 'none' });
  mm.add('(min-width: 901px)', () => {
    const track = $('.day__track');
    const dist = () => track.scrollWidth - innerWidth;
    const h = gsap.to(track, { x: () => -dist(), ease: 'none', scrollTrigger: { trigger: '.day__pin', start: 'top top', end: () => '+=' + dist(), pin: true, scrub: .8, invalidateOnRefresh: true, anticipatePin: 1 } });
    dayColours('.day__pin', 'top top', () => '+=' + dist());
    $$('.day__img img').forEach(img => gsap.fromTo(img, { xPercent: -5, scale: 1.15 }, { xPercent: 5, ease: 'none', scrollTrigger: { trigger: img.parentNode, containerAnimation: h, start: 'left right', end: 'right left', scrub: true } }));
  });
  mm.add('(max-width: 900px)', () => {
    dayColours('.day__track', 'top 70%', 'bottom bottom');
    $$('.day__card').forEach((c, i) => gsap.from(c, { y: 50, rotation: i % 2 ? 4 : -4, autoAlpha: 0, duration: .9, ease: 'power2.out', scrollTrigger: { trigger: c, start: 'top 88%' } }));
  });

  /* ---------- menu ---------- */
  gsap.from('.menu__card', { y: 60, rotation: -2, duration: 1.2, ease: 'power3.out', scrollTrigger: { trigger: '.menu__card', start: 'top 85%' } });
  $$('.menu__group').forEach((g, i) => gsap.from($$('.menu__cat, .menu__item', g), { autoAlpha: 0, y: 8, duration: .5, ease: 'power1.out', stagger: .05, delay: i * .15, scrollTrigger: { trigger: '.menu__card', start: 'top 70%' } }));
  if (fine) {
    const rv = $('.menu__reveal'), img = $('img', rv);
    gsap.set(rv, { xPercent: -50, yPercent: -50 });
    const qx = gsap.quickTo(rv, 'x', { duration: .45, ease: 'power2.out' }), qy = gsap.quickTo(rv, 'y', { duration: .45, ease: 'power2.out' });
    $('.menu__card').addEventListener('mousemove', e => { qx(e.clientX + 210); qy(e.clientY - 30); });
    $$('.menu__item').forEach((it, i) => {
      new Image().src = it.dataset.img;
      it.addEventListener('mouseenter', () => { img.src = it.dataset.img; gsap.to(rv, { autoAlpha: 1, rotation: i % 2 ? 3 : -3, duration: .3, ease: 'power2.out' }); });
      it.addEventListener('mouseleave', () => gsap.to(rv, { autoAlpha: 0, duration: .2 }));
    });
  }

  /* terrace */
  gsap.fromTo('.terrace__media img', { yPercent: -8 }, { yPercent: 8, ease: 'none', scrollTrigger: { trigger: '.terrace', start: 'top bottom', end: 'bottom top', scrub: true } });
  gsap.from('.terrace__card', { y: 70, duration: 1.2, ease: 'power3.out', scrollTrigger: { trigger: '.terrace__card', start: 'top 95%' } });

  /* gallery: each piece its own speed */
  $$('.g').forEach(f => {
    gsap.to(f, { yPercent: +f.dataset.speed, ease: 'none', scrollTrigger: { trigger: '.gallery__grid', start: 'top bottom', end: 'bottom top', scrub: true } });
    if (f.classList.contains('polaroid')) gsap.from(f, { autoAlpha: 0, rotation: '+=8', duration: .9, ease: 'back.out(1.3)', scrollTrigger: { trigger: f, start: 'top 90%' } });
    else gsap.from($('img', f), { scale: 1.15, autoAlpha: 0, duration: 1.4, ease: 'power2.out', scrollTrigger: { trigger: f, start: 'top 92%' } });
  });

  /* events */
  gsap.fromTo('.events__img .parallax', { yPercent: -6 }, { yPercent: 6, ease: 'none', scrollTrigger: { trigger: '.events__img', start: 'top bottom', end: 'bottom top', scrub: true } });
  gsap.from('.events__img', { clipPath: 'inset(0 0 0 100%)', duration: 1.2, ease: 'power3.inOut', scrollTrigger: { trigger: '.events__img', start: 'top 80%' } });
  gsap.from('.events__polaroid', { y: 50, rotation: 10, autoAlpha: 0, duration: 1, ease: 'back.out(1.2)', scrollTrigger: { trigger: '.events__polaroid', start: 'top 90%' } });

  /* reserve & contact */
  gsap.from('.reserve__phone', { yPercent: 30, autoAlpha: 0, duration: 1, ease: 'power4.out', scrollTrigger: { trigger: '.reserve__phone', start: 'top 92%' } });
  gsap.from('.sign', { rotation: -10, y: -30, duration: 1.6, ease: 'elastic.out(1,.45)', scrollTrigger: { trigger: '.sign', start: 'top 85%' } });

  addEventListener('load', () => ScrollTrigger.refresh());
})();
