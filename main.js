/* Centrale – Motion */
(() => {
  const root = document.documentElement;
  const motion = root.classList.contains('motion');
  const finePointer = matchMedia('(hover:hover) and (pointer:fine)').matches;
  const $ = (s, c = document) => c.querySelector(s);
  const $$ = (s, c = document) => [...c.querySelectorAll(s)];

  /* ---------- text splitting ---------- */
  $$('[data-split]').forEach(el => {
    el.innerHTML = [...el.textContent].map(ch => `<span class="char">${ch}</span>`).join('');
  });
  $$('[data-word-reveal]').forEach(el => {
    el.innerHTML = el.textContent.trim().split(/\s+/).map(w => `<span class="w">${w}</span>`).join(' ');
  });
  $$('[data-split-lines]').forEach(el => {
    // split on <br>, wrap each line for mask reveal
    const parts = el.innerHTML.split(/<br\s*\/?>/i);
    el.innerHTML = parts.map(p => `<span class="split-line"><span>${p.trim()}</span></span>`).join('');
  });

  /* ---------- nav / mobile menu (always) ---------- */
  const nav = $('.nav'), burger = $('.nav__burger'), overlay = $('.menu-overlay');
  burger.addEventListener('click', () => {
    const open = burger.getAttribute('aria-expanded') !== 'true';
    burger.setAttribute('aria-expanded', open);
    overlay.classList.toggle('is-open', open);
    overlay.setAttribute('aria-hidden', !open);
  });
  $$('a', overlay).forEach(a => a.addEventListener('click', () => { burger.click(); }));

  /* ---------- voices slider (always) ---------- */
  const voices = $$('.voice'), dots = $$('.voices__dots button');
  let vi = 0, vt;
  const showVoice = i => {
    const prev = voices[vi]; vi = i;
    dots.forEach((d, k) => d.classList.toggle('is-active', k === i));
    if (motion && window.gsap) {
      gsap.to(prev, { autoAlpha: 0, y: -20, duration: .6, ease: 'power2.in' });
      gsap.fromTo(voices[i], { autoAlpha: 0, y: 30 }, { autoAlpha: 1, y: 0, duration: 1, delay: .5, ease: 'power3.out' });
    } else { voices.forEach((v, k) => v.classList.toggle('is-active', k === i)); }
  };
  const autoVoice = () => { clearInterval(vt); vt = setInterval(() => showVoice((vi + 1) % voices.length), 6000); };
  dots.forEach((d, i) => d.addEventListener('click', () => { if (i !== vi) showVoice(i); autoVoice(); }));
  autoVoice();

  if (!motion || !window.gsap) { document.body.classList.remove('is-loading'); return; }

  gsap.registerPlugin(ScrollTrigger);

  /* ---------- Lenis smooth scroll ---------- */
  const lenis = new Lenis({ duration: 1.25, easing: t => Math.min(1, 1.001 - Math.pow(2, -10 * t)), smoothWheel: true });
  lenis.stop(); window.lenis = lenis;
  lenis.on('scroll', ScrollTrigger.update);
  gsap.ticker.add(t => lenis.raf(t * 1000));
  gsap.ticker.lagSmoothing(0);
  $$('a[href^="#"]').forEach(a => a.addEventListener('click', e => {
    const id = a.getAttribute('href'); if (id.length < 2 && id !== '#top') return;
    const target = id === '#top' ? 0 : $(id); if (target === null) return;
    e.preventDefault(); lenis.scrollTo(target, { duration: 1.8 });
  }));

  /* nav hide on scroll down */
  let lastY = 0;
  lenis.on('scroll', ({ scroll }) => {
    nav.classList.toggle('is-scrolled', scroll > 60);
    nav.classList.toggle('is-hidden', scroll > lastY && scroll > 400 && !overlay.classList.contains('is-open'));
    lastY = scroll;
  });

  /* ---------- loader + hero intro ---------- */
  const counter = { v: 0 };
  const tl = gsap.timeline({ defaults: { ease: 'expo.out' } });
  tl.to('.loader__brand span', { y: 0, duration: 1.1, stagger: .06 })
    .to(counter, { v: 100, duration: 2, ease: 'power2.inOut', onUpdate: () => { $('.loader__count').textContent = String(Math.round(counter.v)).padStart(3, '0'); } }, 0)
    .to('.loader__bar i', { scaleX: 1, duration: 2, ease: 'power2.inOut' }, 0)
    .to('.loader__brand span', { y: '-110%', duration: .8, stagger: .03, ease: 'expo.in' }, 2.1)
    .to('.loader__meta, .loader__bar', { autoAlpha: 0, duration: .4 }, 2.2)
    .to('.loader__curtain', { yPercent: -100, duration: 1.2, ease: 'expo.inOut' }, 2.7)
    .set('.loader', { display: 'none' })
    .to('.hero__media', { clipPath: 'inset(0% 0% 0% 0%)', duration: 1.8, ease: 'expo.inOut' }, 2.8)
    .to('.hero__img', { scale: 1.08, duration: 2.4, ease: 'expo.out' }, 3.0)
    .to('.hero__title .char', { y: 0, duration: 1.4, stagger: .05 }, 3.4)
    .from('.hero__eyebrow', { y: 20, autoAlpha: 0, duration: 1, stagger: .1 }, 3.8)
    .from('.hero__lead, .hero__scroll', { y: 30, autoAlpha: 0, duration: 1.2, stagger: .12 }, 4.0)
    .from('.nav', { autoAlpha: 0, duration: 1.2, clearProps: 'opacity,visibility' }, 3.9)
    .add(() => { document.body.classList.remove('is-loading'); lenis.start(); ScrollTrigger.refresh(); }, 3.6);
  window.__skipIntro = () => tl.progress(1); // for screenshots/testing

  /* hero scroll parallax */
  gsap.to('.hero__img', { yPercent: 18, ease: 'none', scrollTrigger: { trigger: '.hero', start: 'top top', end: 'bottom top', scrub: true } });
  gsap.to('.hero__title', { yPercent: -40, autoAlpha: .2, ease: 'none', scrollTrigger: { trigger: '.hero', start: 'top top', end: 'bottom top', scrub: true } });

  /* ---------- marquees (velocity-reactive) ---------- */
  const marquee = (sel, speed) => {
    const track = $(sel); if (!track) return;
    let x = 0, dir = 1, half = 0;
    const measure = () => { half = track.scrollWidth / 2; };
    measure(); addEventListener('resize', measure);
    gsap.ticker.add(() => {
      const v = lenis.velocity || 0;
      if (Math.abs(v) > .5) dir = v > 0 ? 1 : -1;
      x -= (speed + Math.abs(v) * .25) * dir;
      if (x <= -half) x += half; if (x > 0) x -= half;
      track.style.transform = `translate3d(${x}px,0,0)`;
    });
  };
  marquee('.marquee__track', .9);
  marquee('.footer__track', .6);

  /* ---------- line reveals ---------- */
  $$('.split-line > span').forEach(span => {
    gsap.from(span, { yPercent: 110, duration: 1.3, ease: 'expo.out', scrollTrigger: { trigger: span.parentNode, start: 'top 88%' } });
  });
  $$('.display:not([data-split-lines])').forEach(el => gsap.from(el, { y: 60, autoAlpha: 0, duration: 1.4, ease: 'expo.out', scrollTrigger: { trigger: el, start: 'top 88%' } }));
  $$('.eyebrow').forEach(el => gsap.from(el, { y: 16, autoAlpha: 0, duration: 1, ease: 'power3.out', scrollTrigger: { trigger: el, start: 'top 92%' } }));
  $$('.body, .link-arrow, .terrace__text, .reserve__text, .btn--line').forEach(el => {
    if (el.closest('.hero')) return;
    gsap.from(el, { y: 30, autoAlpha: 0, duration: 1.2, ease: 'power3.out', scrollTrigger: { trigger: el, start: 'top 92%' } });
  });

  /* word-by-word scrub */
  $$('[data-word-reveal]').forEach(el => {
    gsap.to($$('.w', el), { opacity: 1, stagger: .1, ease: 'none', scrollTrigger: { trigger: el, start: 'top 80%', end: 'bottom 45%', scrub: true } });
  });

  /* image reveals + parallax */
  $$('.story__img, .events__img').forEach(fig => {
    gsap.fromTo(fig, { clipPath: 'inset(100% 0% 0% 0%)' }, { clipPath: 'inset(0% 0% 0% 0%)', duration: 1.6, ease: 'expo.inOut', scrollTrigger: { trigger: fig, start: 'top 85%' } });
    const inner = $('.parallax', fig);
    if (inner) gsap.fromTo(inner, { yPercent: -8 }, { yPercent: 8, ease: 'none', scrollTrigger: { trigger: fig, start: 'top bottom', end: 'bottom top', scrub: true } });
  });

  /* stats counters */
  $$('[data-count]').forEach(el => {
    const end = +el.dataset.count, pre = el.dataset.prefix || '', o = { v: 0 };
    ScrollTrigger.create({ trigger: el, start: 'top 90%', once: true, onEnter: () => gsap.to(o, { v: end, duration: 2, ease: 'power3.out', onUpdate: () => el.textContent = pre + Math.round(o.v) }) });
  });
  gsap.from('.stats li', { y: 40, autoAlpha: 0, duration: 1.2, stagger: .1, ease: 'expo.out', scrollTrigger: { trigger: '.stats', start: 'top 88%' } });

  /* ---------- horizontal pinned "Ein Tag" ---------- */
  const mm = gsap.matchMedia();
  mm.add('(min-width: 901px)', () => {
    const track = $('.day__track');
    const dist = () => track.scrollWidth - innerWidth;
    const h = gsap.to(track, { x: () => -dist(), ease: 'none', scrollTrigger: { trigger: '.day__pin', start: 'top top', end: () => '+=' + dist(), pin: true, scrub: 1, invalidateOnRefresh: true, anticipatePin: 1 } });
    gsap.to('.day__progress i', { scaleX: 1, ease: 'none', scrollTrigger: { trigger: '.day__pin', start: 'top top', end: () => '+=' + dist(), scrub: true } });
    $$('.day__img img').forEach(img => {
      gsap.fromTo(img, { scale: 1.3, xPercent: -6 }, { scale: 1.05, xPercent: 6, ease: 'none', scrollTrigger: { trigger: img.parentNode, containerAnimation: h, start: 'left right', end: 'right left', scrub: true } });
    });
  });
  mm.add('(max-width: 900px)', () => {
    $$('.day__card').forEach(c => gsap.from(c, { y: 60, autoAlpha: 0, duration: 1.2, ease: 'expo.out', scrollTrigger: { trigger: c, start: 'top 88%' } }));
  });

  /* ---------- menu hover reveal ---------- */
  const reveal = $('.menu__reveal'), rImg = $('img', reveal);
  if (finePointer) {
    const qx = gsap.quickTo(reveal, 'x', { duration: .7, ease: 'power3' }), qy = gsap.quickTo(reveal, 'y', { duration: .7, ease: 'power3' });
    let lastX = 0;
    const qr = gsap.quickTo(reveal, 'rotation', { duration: .8, ease: 'power3' });
    $('.menu__list').addEventListener('mousemove', e => { qx(e.clientX - 160); qy(e.clientY - 200); qr(gsap.utils.clamp(-12, 12, (e.clientX - lastX) * .6)); lastX = e.clientX; });
    $$('.menu__item').forEach(item => {
      item.addEventListener('mouseenter', () => {
        rImg.src = item.dataset.img;
        gsap.fromTo(rImg, { scale: 1.35 }, { scale: 1.1, duration: 1, ease: 'expo.out' });
        gsap.to(reveal, { autoAlpha: 1, scale: 1, duration: .6, ease: 'expo.out' });
      });
    });
    $('.menu__list').addEventListener('mouseleave', () => gsap.to(reveal, { autoAlpha: 0, scale: .6, duration: .5, ease: 'power3.in' }));
    $$('.menu__item').forEach(i => { const im = new Image(); im.src = i.dataset.img; });
  }
  gsap.from('.menu__item', { y: 50, autoAlpha: 0, duration: 1.2, stagger: .07, ease: 'expo.out', scrollTrigger: { trigger: '.menu__list', start: 'top 85%' } });

  /* ---------- terrace ---------- */
  gsap.fromTo('.terrace__media img', { yPercent: -10, scale: 1.15 }, { yPercent: 10, scale: 1, ease: 'none', scrollTrigger: { trigger: '.terrace', start: 'top bottom', end: 'bottom top', scrub: true } });

  /* ---------- gallery columns ---------- */
  $$('.gallery__col').forEach(col => {
    gsap.to(col, { yPercent: +col.dataset.speed, ease: 'none', scrollTrigger: { trigger: '.gallery__cols', start: 'top bottom', end: 'bottom top', scrub: true } });
  });
  $$('.gallery figure').forEach(f => gsap.fromTo(f, { clipPath: 'inset(0% 0% 100% 0%)' }, { clipPath: 'inset(0% 0% 0% 0%)', duration: 1.6, ease: 'expo.inOut', scrollTrigger: { trigger: f, start: 'top 90%' } }));

  /* ---------- reserve ---------- */
  gsap.from('.reserve__title .line > span', { yPercent: 110, duration: 1.4, stagger: .12, ease: 'expo.out', scrollTrigger: { trigger: '.reserve', start: 'top 70%' } });
  gsap.from('.reserve__btn', { scale: 0, rotation: -90, duration: 1.6, ease: 'expo.out', scrollTrigger: { trigger: '.reserve__btn', start: 'top 92%' } });
  gsap.from('.contact__col', { y: 50, autoAlpha: 0, duration: 1.2, stagger: .12, ease: 'expo.out', scrollTrigger: { trigger: '.contact', start: 'top 80%' } });

  /* ---------- custom cursor + magnetic ---------- */
  if (finePointer) {
    const cur = $('.cursor'), dot = $('.cursor__dot'), ring = $('.cursor__ring'), label = $('.cursor__label');
    const dx = gsap.quickTo(dot, 'x', { duration: .12 }), dy = gsap.quickTo(dot, 'y', { duration: .12 });
    const rx = gsap.quickTo(ring, 'x', { duration: .55, ease: 'power3' }), ry = gsap.quickTo(ring, 'y', { duration: .55, ease: 'power3' });
    addEventListener('mousemove', e => { cur.classList.remove('is-hidden'); dx(e.clientX); dy(e.clientY); rx(e.clientX); ry(e.clientY); });
    document.addEventListener('mouseleave', () => cur.classList.add('is-hidden'));
    document.addEventListener('mouseenter', () => cur.classList.remove('is-hidden'));
    $$('[data-cursor]').forEach(el => {
      el.addEventListener('mouseenter', () => { label.textContent = el.dataset.cursor; cur.classList.add('is-label'); });
      el.addEventListener('mouseleave', () => cur.classList.remove('is-label'));
    });
    $$('a, button, .menu__item').forEach(el => {
      el.addEventListener('mouseenter', () => { if (el.hasAttribute('data-cursor-hide')) cur.classList.add('is-hidden'); else cur.classList.add('is-hover'); });
      el.addEventListener('mouseleave', () => cur.classList.remove('is-hover', 'is-hidden'));
    });
    $$('[data-magnetic]').forEach(el => {
      const s = el.classList.contains('reserve__btn') ? .45 : .3;
      const mx = gsap.quickTo(el, 'x', { duration: .8, ease: 'elastic.out(1,.4)' }), my = gsap.quickTo(el, 'y', { duration: .8, ease: 'elastic.out(1,.4)' });
      el.addEventListener('mousemove', e => { const r = el.getBoundingClientRect(); mx((e.clientX - r.left - r.width / 2) * s); my((e.clientY - r.top - r.height / 2) * s); });
      el.addEventListener('mouseleave', () => { mx(0); my(0); });
    });
  }

  addEventListener('load', () => ScrollTrigger.refresh());
})();
