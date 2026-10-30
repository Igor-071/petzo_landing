import './styles.css';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { SplitText } from 'gsap/SplitText';
import Lenis from 'lenis';
import { createHeroScene } from './scenes/hero.js';
import { createDotField } from './scenes/dotfield.js';

gsap.registerPlugin(ScrollTrigger, SplitText);

if ('scrollRestoration' in history) history.scrollRestoration = 'manual';
window.scrollTo(0, 0);

const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const finePointer = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
const $ = (s, el = document) => el.querySelector(s);
const $$ = (s, el = document) => [...el.querySelectorAll(s)];

/* ---------------- Smooth scroll ---------------- */
let lenis = null;
if (!reduced) {
  lenis = new Lenis({ lerp: 0.1, wheelMultiplier: 1 });
  lenis.on('scroll', ScrollTrigger.update);
  gsap.ticker.add((t) => lenis.raf(t * 1000));
  gsap.ticker.lagSmoothing(0);
}

function scrollToTarget(target) {
  const el = typeof target === 'string' ? $(target) : target;
  if (!el) return;
  if (lenis) lenis.scrollTo(el, { offset: -90, duration: 1.4 });
  else el.scrollIntoView({ behavior: 'auto' });
}

$$('a[href^="#"]').forEach((a) => {
  a.addEventListener('click', (e) => {
    const id = a.getAttribute('href');
    if (id.length < 2) return;
    const el = $(id);
    if (!el) return;
    e.preventDefault();
    closeMenu();
    scrollToTarget(id === '#top' ? document.body : el);
  });
});

/* ---------------- WebGL ---------------- */
let hero = null;
try {
  hero = createHeroScene($('[data-hero-canvas]'), $('[data-hero-visual]'), { reduced });
} catch (err) {
  console.warn('Hero WebGL unavailable', err);
}
try {
  createDotField($('[data-dotfield]'), $('.integrations'), { hubEl: $('.hub__core'), lightEl: $('.sync'), quietEls: [$('.integrations .section-head'), $('.vms__head')], reduced });
  // same field on the final CTA card: rings radiate from the paw, light pools under the store buttons
  createDotField($('[data-cta-canvas]'), $('[data-cta]'), { hubEl: $('.cta__paw'), lightEl: $('.cta__btns'), quietEls: [$('.cta__title'), $('.cta__sub')], reduced });
} catch (err) {
  console.warn('Backdrop WebGL unavailable', err);
}

/* ---------------- Nav ---------------- */
const nav = $('[data-nav]');
const burger = $('[data-burger]');
function closeMenu() {
  nav.classList.remove('is-open');
  burger.setAttribute('aria-expanded', 'false');
}
burger.addEventListener('click', () => {
  const open = nav.classList.toggle('is-open');
  burger.setAttribute('aria-expanded', String(open));
});

let lastY = 0;
function onScroll(y) {
  nav.classList.toggle('is-scrolled', y > 30);
  const goingDown = y > lastY && y > 400;
  if (!nav.classList.contains('is-open')) nav.classList.toggle('is-hidden', goingDown);
  lastY = y;
}
if (lenis) lenis.on('scroll', ({ scroll }) => onScroll(scroll));
else window.addEventListener('scroll', () => onScroll(window.scrollY), { passive: true });

$$('.integrations, .footer').forEach((el) => {
  ScrollTrigger.create({
    trigger: el,
    start: 'top 50px',
    end: 'bottom 50px',
    onToggle: (self) => nav.classList.toggle('is-dark', self.isActive),
  });
});

/* ---------------- Video modal ---------------- */
const modal = $('[data-modal]');
const video = $('[data-modal-video]');
function openModal(src) {
  video.src = src;
  modal.classList.add('is-open');
  modal.setAttribute('aria-hidden', 'false');
  lenis?.stop();
  video.play().catch(() => {});
}
function closeModal() {
  modal.classList.remove('is-open');
  modal.setAttribute('aria-hidden', 'true');
  video.pause();
  lenis?.start();
}
$$('[data-video]').forEach((b) => b.addEventListener('click', () => openModal(b.dataset.video)));
$$('[data-modal-close]').forEach((b) => b.addEventListener('click', closeModal));
window.addEventListener('keydown', (e) => e.key === 'Escape' && modal.classList.contains('is-open') && closeModal());

/* ---------------- Welcome popup ---------------- */
const welcome = $('[data-welcome]');
function openWelcome() {
  welcome.classList.add('is-open');
  welcome.setAttribute('aria-hidden', 'false');
  lenis?.stop();
  gsap.fromTo('.welcome__card > *',
    { y: 24, opacity: 0 },
    { y: 0, opacity: 1, duration: 0.7, stagger: 0.06, ease: 'expo.out', delay: 0.15, clearProps: 'all' }
  );
}
function closeWelcome() {
  welcome.classList.remove('is-open');
  welcome.setAttribute('aria-hidden', 'true');
  lenis?.start();
  localStorage.setItem('petzo_sweden_seen', '1');
}
$$('[data-welcome-close]').forEach((b) => b.addEventListener('click', () => {
  closeWelcome();
  if (b.hasAttribute('data-welcome-explore')) scrollToTarget(document.body);
}));
window.addEventListener('keydown', (e) => e.key === 'Escape' && welcome.classList.contains('is-open') && closeWelcome());

/* ---------------- FAQ: accordion + topic filters ---------------- */
const faqItems = $$('.qa');
function closeQa(qa, instant = false) {
  if (!qa.open) return;
  const body = $('.qa__a', qa);
  gsap.to(body, { height: 0, duration: instant || reduced ? 0 : 0.45, ease: 'power3.inOut', overwrite: true, onComplete: () => { qa.open = false; gsap.set(body, { clearProps: 'height' }); } });
}
function openQa(qa) {
  faqItems.forEach((other) => other !== qa && closeQa(other));
  qa.open = true;
  gsap.fromTo($('.qa__a', qa), { height: 0 }, { height: 'auto', duration: reduced ? 0 : 0.55, ease: 'power3.out', overwrite: true, clearProps: 'height' });
}
faqItems.forEach((qa) => {
  $('summary', qa).addEventListener('click', (e) => {
    e.preventDefault();
    qa.open ? closeQa(qa) : openQa(qa);
  });
});

function layoutFaq() {
  const visible = faqItems.filter((qa) => !qa.hidden);
  visible.forEach((qa, i) => {
    $('.qa__num', qa).textContent = String(i + 1).padStart(2, '0');
    qa.classList.toggle('is-first', i === 0);
  });
  return visible;
}
$$('[data-faq-count]').forEach((el) => {
  const cat = el.dataset.faqCount;
  el.textContent = faqItems.filter((qa) => cat === 'all' || qa.dataset.cat === cat).length;
});
$$('[data-filter]').forEach((btn) => {
  btn.addEventListener('click', () => {
    const cat = btn.dataset.filter;
    $$('[data-filter]').forEach((b) => b.setAttribute('aria-pressed', String(b === btn)));
    faqItems.forEach((qa) => {
      const match = cat === 'all' || qa.dataset.cat === cat;
      if (!match) closeQa(qa, true);
      qa.hidden = !match;
    });
    const visible = layoutFaq();
    if (!reduced) gsap.fromTo(visible, { opacity: 0, y: 14 }, { opacity: 1, y: 0, duration: 0.6, ease: 'expo.out', stagger: 0.04, clearProps: 'opacity,transform' });
    ScrollTrigger.refresh();
  });
});
layoutFaq();

/* ---------------- Contact form (opens the visitor's mail app) ---------------- */
const form = $('[data-form]');
const status = $('[data-form-status]');
form.addEventListener('submit', (e) => {
  e.preventDefault();
  let ok = true;
  $$('[required]', form).forEach((input) => {
    const valid = input.value.trim() && (input.type !== 'email' || /\S+@\S+\.\S+/.test(input.value));
    input.closest('.field').classList.toggle('is-invalid', !valid);
    if (!valid) ok = false;
  });
  status.classList.toggle('is-error', !ok);
  if (!ok) {
    status.textContent = 'Please fill in the required fields.';
    return;
  }
  const d = new FormData(form);
  const body = `${d.get('message')}\n\n—\nName: ${d.get('name')}\nEmail: ${d.get('email')}\nPhone: ${d.get('phone') || '-'}`;
  window.location.href = `mailto:petzoapp@d4igroup.se?subject=${encodeURIComponent('Question about Petzo')}&body=${encodeURIComponent(body)}`;
  status.textContent = 'Opening your email app…';
});

/* ---------------- Year ---------------- */
$('[data-year]').textContent = new Date().getFullYear();

/* ---------------- Marquee ---------------- */
const track = $('[data-marquee]');
const group = $('.marquee__group', track);
for (let i = 0; i < 3; i++) track.appendChild(group.cloneNode(true)).setAttribute('aria-hidden', 'true');
if (!reduced) {
  const loop = gsap.to(track, { xPercent: -25, duration: 28, ease: 'none', repeat: -1 });
  let boost = 0;
  lenis?.on('scroll', ({ velocity }) => {
    boost = Math.min(Math.abs(velocity) * 0.25, 4);
  });
  gsap.ticker.add(() => {
    boost *= 0.92;
    loop.timeScale(1 + boost);
  });
}

/* ---------------- Mobile story: give each step its own phone ---------------- */
const mm = gsap.matchMedia();
mm.add('(max-width: 900px)', () => {
  const clones = $$('.story__step').map((step) => {
    const i = step.dataset.step;
    const phone = document.createElement('div');
    phone.className = 'phone phone--story story__mobile-phone';
    phone.style.setProperty('--w', 'min(280px, 72vw)');
    const frame = document.createElement('div');
    frame.className = 'phone__frame';
    frame.innerHTML = '<div class="phone__island"></div>';
    const screen = $(`[data-screen="${i}"]`).cloneNode(true);
    screen.classList.add('is-active');
    frame.appendChild(screen);
    phone.appendChild(frame);
    step.appendChild(phone);
    return phone;
  });
  return () => clones.forEach((c) => c.remove());
});

/* ---------------- Interactions ---------------- */
if (finePointer && !reduced) {
  // custom cursor
  const cursor = $('.cursor');
  const cx = gsap.quickTo(cursor, 'x', { duration: 0.25, ease: 'power3' });
  const cy = gsap.quickTo(cursor, 'y', { duration: 0.25, ease: 'power3' });
  window.addEventListener('pointermove', (e) => { cx(e.clientX); cy(e.clientY); });
  document.addEventListener('pointerover', (e) => cursor.classList.toggle('is-hover', !!e.target.closest('a, button, summary, label')));

  // magnetic buttons
  $$('[data-magnetic]').forEach((el) => {
    const xTo = gsap.quickTo(el, 'x', { duration: 0.6, ease: 'elastic.out(1, 0.4)' });
    const yTo = gsap.quickTo(el, 'y', { duration: 0.6, ease: 'elastic.out(1, 0.4)' });
    el.addEventListener('pointermove', (e) => {
      const r = el.getBoundingClientRect();
      const mx = e.clientX - r.left;
      const my = e.clientY - r.top;
      xTo((mx - r.width / 2) * 0.25);
      yTo((my - r.height / 2) * 0.35);
      el.style.setProperty('--mx', `${mx}px`);
      el.style.setProperty('--my', `${my}px`);
    });
    el.addEventListener('pointerleave', () => { xTo(0); yTo(0); });
  });

  // spotlight on bento cards
  $$('[data-card]').forEach((card) => {
    card.addEventListener('pointermove', (e) => {
      const r = card.getBoundingClientRect();
      card.style.setProperty('--mx', `${e.clientX - r.left}px`);
      card.style.setProperty('--my', `${e.clientY - r.top}px`);
    });
  });

  // hero phone tilt
  const tilt = $('[data-tilt]');
  const rx = gsap.quickTo(tilt, 'rotationX', { duration: 0.8, ease: 'power3' });
  const ry = gsap.quickTo(tilt, 'rotationY', { duration: 0.8, ease: 'power3' });
  $('[data-hero]').addEventListener('pointermove', (e) => {
    const px = e.clientX / window.innerWidth - 0.5;
    const py = e.clientY / window.innerHeight - 0.5;
    ry(px * 16 - 8);
    rx(-py * 12 + 4);
    $$('[data-float]').forEach((f) => {
      const depth = Number(f.dataset.float) * 8;
      gsap.to(f, { x: px * depth * 2, y: py * depth, duration: 1, ease: 'power3', overwrite: 'auto' });
    });
  });
}

/* ---------------- Loader + intro ---------------- */
const loader = $('.loader');
const count = $('.loader__count');

function heroIntro() {
  const tl = gsap.timeline({ defaults: { ease: 'expo.out' } });
  const split = SplitText.create('.hero__title', { type: 'lines,words', mask: 'lines', linesClass: 'line' });
  tl.from(split.words, { yPercent: 135, rotate: 4, duration: 1.4, stagger: 0.05 }, 0)
    .to('.hero__title em', { '--u': 1, duration: 1, ease: 'power3.inOut' }, 0.8)
    .from('[data-hero-fade]', { y: 30, opacity: 0, duration: 1.2, stagger: 0.1 }, 0.3)
    .from('.phone--hero', { y: 180, rotationX: 30, rotationZ: -8, opacity: 0, duration: 1.8 }, 0.2)
    .from('[data-float]', { scale: 0.6, opacity: 0, y: 40, duration: 1.2, stagger: 0.15, ease: 'back.out(1.6)' }, 0.9)
    .from('.nav__inner', { y: -30, opacity: 0, duration: 1 }, 0.4)
    .from('.hero__scroll', { opacity: 0, duration: 1 }, 1.2);
  if (hero) tl.fromTo(hero.state, { intro: 0 }, { intro: 1, duration: 2.4, ease: 'expo.out' }, 0);

  // idle bob for the floating cards (applied to inner content so pointer parallax can use x/y)
  $$('[data-float]').forEach((f, i) => {
    gsap.to(f, { yPercent: i % 2 ? 12 : -12, duration: 2.6 + i * 0.4, ease: 'sine.inOut', yoyo: true, repeat: -1, delay: 1.8 });
  });
  return tl;
}

function runLoader() {
  if (reduced) {
    loader.remove();
    document.documentElement.classList.add('is-loaded');
    initScrollAnimations();
    if (!localStorage.getItem('petzo_sweden_seen')) openWelcome();
    return;
  }
  const c = { v: 0 };
  gsap.timeline()
    .to(c, { v: 100, duration: 1.1, ease: 'power2.inOut', onUpdate: () => (count.textContent = Math.round(c.v)) })
    .to('.loader__mark', { y: -30, opacity: 0, duration: 0.4, ease: 'power2.in' })
    .to(loader, { clipPath: 'inset(0 0 100% 0)', duration: 0.9, ease: 'expo.inOut' }, '-=0.1')
    .add(() => {
      document.documentElement.classList.add('is-loaded');
      heroIntro();
      initScrollAnimations();
      if (!localStorage.getItem('petzo_sweden_seen')) {
        gsap.delayedCall(0.8, openWelcome);
      }
    }, '-=0.55')
    .add(() => loader.remove());
}

/* ---------------- Scroll animations ---------------- */
function revealOnScroll(selector, start, stagger) {
  const els = $$(selector);
  els.forEach((el) => el.classList.add('reveal-card'));
  ScrollTrigger.batch(els, {
    start,
    once: true,
    onEnter: (batch) =>
      batch.forEach((el, i) => {
        el.style.transitionDelay = `${i * stagger}s`;
        el.classList.add('is-in');
        // drop the stagger delay afterwards so hover feedback stays instant
        setTimeout(() => (el.style.transitionDelay = ''), (i * stagger + 1.3) * 1000);
      }),
  });
}

function initScrollAnimations() {
  if (reduced) return;

  // hero exits: content drifts, blob swells
  gsap.to('.hero__copy', { yPercent: -18, opacity: 0.2, ease: 'none', scrollTrigger: { trigger: '.hero', start: 'top top', end: 'bottom top', scrub: true } });
  gsap.to('.hero__visual', { yPercent: -10, ease: 'none', scrollTrigger: { trigger: '.hero', start: 'top top', end: 'bottom top', scrub: true } });
  if (hero) {
    ScrollTrigger.create({ trigger: '.hero', start: 'top top', end: 'bottom top', onUpdate: (s) => (hero.state.scroll = s.progress) });
  }

  // headline reveals (line masks)
  $$('[data-reveal]').forEach((el) => {
    if (/^H[1-3]$/.test(el.tagName)) {
      const split = SplitText.create(el, { type: 'lines', mask: 'lines', linesClass: 'line', autoSplit: true, onSplit: (self) =>
        gsap.from(self.lines, { yPercent: 135, duration: 1.2, ease: 'expo.out', stagger: 0.1, scrollTrigger: { trigger: el, start: 'top 85%', once: true } }) });
      return split;
    }
    gsap.from(el, { y: 30, opacity: 0, duration: 1.1, ease: 'expo.out', scrollTrigger: { trigger: el, start: 'top 88%', once: true } });
  });

  // statement: word-by-word ink
  const st = $('[data-words]');
  const words = SplitText.create(st, { type: 'words', wordsClass: 'w' });
  gsap.to(words.words, { opacity: 1, stagger: 0.1, ease: 'none', scrollTrigger: { trigger: st, start: 'top 80%', end: 'bottom 45%', scrub: true } });

  // eyebrows
  gsap.utils.toArray('.eyebrow:not([data-hero-fade])').forEach((el) =>
    gsap.from(el, { y: 16, opacity: 0, duration: 0.9, ease: 'expo.out', scrollTrigger: { trigger: el, start: 'top 90%', once: true } })
  );

  // feature story (desktop pinned phone)
  mm.add('(min-width: 901px)', () => {
    const stage = $('.story__stage');
    const screens = $$('.story__screen');
    const dots = $$('.story__dots span');
    const steps = $$('.story__step');
    let current = 0;
    function activate(i) {
      if (i === current) return;
      const prev = screens[current];
      const next = screens[i];
      const dir = i > current ? 1 : -1;
      current = i;
      stage.dataset.active = i;
      steps.forEach((s, k) => s.classList.toggle('is-active', k === i));
      dots.forEach((d, k) => d.classList.toggle('is-on', k === i));
      gsap.to(prev, { opacity: 0, y: -40 * dir, scale: 0.96, duration: 0.5, ease: 'power3.in', onComplete: () => prev.classList.remove('is-active') });
      next.classList.add('is-active');
      gsap.fromTo(next, { opacity: 0, y: 50 * dir, scale: 0.96 }, { opacity: 1, y: 0, scale: 1, duration: 0.8, ease: 'expo.out', delay: 0.2 });
      gsap.fromTo('.phone--story', { rotationY: -10 * dir }, { rotationY: 0, duration: 1.2, ease: 'elastic.out(1, 0.6)' });
    }
    steps[0].classList.add('is-active');
    steps.forEach((step, i) => {
      ScrollTrigger.create({ trigger: step, start: 'top 55%', end: 'bottom 55%', onToggle: (self) => self.isActive && activate(i) });
    });
    gsap.from('.phone--story', { y: 120, rotationX: 25, opacity: 0, duration: 1.4, ease: 'expo.out', scrollTrigger: { trigger: '.story__grid', start: 'top 75%', once: true } });
    return () => steps.forEach((s) => s.classList.remove('is-active'));
  });
  mm.add('(max-width: 900px)', () => {
    $$('.story__step').forEach((step) =>
      gsap.from(step.children, { y: 40, opacity: 0, stagger: 0.06, duration: 1, ease: 'expo.out', scrollTrigger: { trigger: step, start: 'top 85%', once: true } })
    );
  });

  // bento
  // card reveals use CSS transitions (see .reveal-card) so they always settle in place
  revealOnScroll('[data-card]', 'top 88%', 0.08);

  // how-it-works line + steps
  gsap.fromTo('.how__line', { clipPath: 'inset(0 100% 0 0)' }, { clipPath: 'inset(0 0% 0 0)', ease: 'none', scrollTrigger: { trigger: '.how__track', start: 'top 75%', end: 'center 50%', scrub: true } });
  gsap.from('[data-how]', { y: 80, opacity: 0, duration: 1.3, ease: 'expo.out', stagger: 0.15, scrollTrigger: { trigger: '.how__steps', start: 'top 80%', once: true } });
  gsap.from('.how__badge', { scale: 0, duration: 0.8, ease: 'back.out(2.5)', stagger: 0.15, delay: 0.4, scrollTrigger: { trigger: '.how__steps', start: 'top 80%', once: true } });

  // integrations: panel widens into place as it enters (clip-path, so layout/measurements are untouched)
  const panelR = () => getComputedStyle($('.integrations')).borderTopLeftRadius;
  gsap.fromTo('.integrations', { clipPath: () => `inset(0px 4% 0px 4% round ${parseFloat(panelR()) * 1.6}px)` }, { clipPath: () => `inset(0px 0% 0px 0% round ${panelR()})`, ease: 'none', scrollTrigger: { trigger: '.integrations', start: 'top bottom', end: 'top 20%', scrub: true, invalidateOnRefresh: true } });

  // hub
  const hubTl = gsap.timeline({ scrollTrigger: { trigger: '[data-hub]', start: 'top 70%', once: true } });
  hubTl
    .from('.hub__core', { scale: 0.4, opacity: 0, duration: 1.2, ease: 'expo.out' })
    .from('.hub__paths path', { opacity: 0, duration: 0.8, stagger: 0.08 }, 0.3)
    .from('.hub__node', { opacity: 0, '--s': 0.6, duration: 1, ease: 'back.out(1.7)', stagger: 0.08 }, 0.4);

  // vms sync demo
  const sync = $('[data-sync]');
  gsap.from('.dash', { x: -60, opacity: 0, duration: 1.4, ease: 'expo.out', scrollTrigger: { trigger: sync, start: 'top 75%', once: true } });
  gsap.from('.phone--sync', { x: 60, opacity: 0, rotationY: -20, duration: 1.4, ease: 'expo.out', scrollTrigger: { trigger: sync, start: 'top 75%', once: true } });
  gsap.from('.bars span', { scaleY: 0, duration: 1, ease: 'expo.out', stagger: 0.06, delay: 0.4, scrollTrigger: { trigger: sync, start: 'top 75%', once: true } });
  $$('[data-count]').forEach((el) => {
    const to = Number(el.dataset.count);
    const o = { v: 0 };
    gsap.to(o, { v: to, duration: 1.8, ease: 'power3.out', delay: 0.3, scrollTrigger: { trigger: sync, start: 'top 75%', once: true }, onUpdate: () => (el.textContent = Math.round(o.v).toLocaleString('en-US')) });
  });
  const loopTl = gsap.timeline({ repeat: -1, repeatDelay: 1.6, paused: true });
  loopTl
    .set('[data-sync-push]', { yPercent: -160, opacity: 0 })
    .set('[data-sync-item]', { height: 0, opacity: 0, paddingTop: 0, paddingBottom: 0 })
    .fromTo('[data-sync-row] .st', { scale: 1 }, { scale: 1.15, duration: 0.25, yoyo: true, repeat: 1, ease: 'power2.inOut' }, 0.3)
    .to('[data-sync-push]', { yPercent: 0, opacity: 1, duration: 0.8, ease: 'expo.out' }, 1)
    .to('[data-sync-item]', { height: 'auto', opacity: 1, paddingTop: '0.55em', paddingBottom: '0.55em', duration: 0.7, ease: 'expo.out' }, 1.5)
    .to('[data-sync-push]', { yPercent: -160, opacity: 0, duration: 0.6, ease: 'power3.in' }, 4.6)
    .to({}, { duration: 0.6 });
  ScrollTrigger.create({ trigger: sync, start: 'top 80%', end: 'bottom top', onToggle: (s) => (s.isActive ? loopTl.play() : loopTl.pause()) });

  revealOnScroll('[data-cap]', 'top 90%', 0.06);
  gsap.from('.why > *', { y: 30, opacity: 0, duration: 1, ease: 'expo.out', stagger: 0.12, scrollTrigger: { trigger: '.why', start: 'top 85%', once: true } });

  // faq
  revealOnScroll('.faq__list, .faq__help', 'top 88%', 0.1);
  gsap.fromTo('.faq__filter', { y: 14, opacity: 0 }, { y: 0, opacity: 1, clearProps: 'opacity,transform', duration: 0.8, ease: 'expo.out', stagger: 0.05, scrollTrigger: { trigger: '.faq__filters', start: 'top 92%', once: true } });

  // cta card grows in
  gsap.fromTo('[data-cta]', { scale: 0.9, borderRadius: 120 }, { scale: 1, borderRadius: 48, ease: 'none', scrollTrigger: { trigger: '[data-cta]', start: 'top bottom', end: 'top 40%', scrub: true } });
  gsap.from('.cta__paw', { rotation: -40, scale: 0, duration: 1.2, ease: 'back.out(2)', scrollTrigger: { trigger: '[data-cta]', start: 'top 70%', once: true } });

  gsap.from('.form', { y: 60, opacity: 0, duration: 1.3, ease: 'expo.out', scrollTrigger: { trigger: '.contact', start: 'top 80%', once: true } });

  // footer wordmark
  const word = SplitText.create('.footer__word', { type: 'chars' });
  gsap.from(word.chars, { yPercent: 100, opacity: 0, ease: 'none', stagger: 0.05, scrollTrigger: { trigger: '.footer__word', start: 'top bottom', end: 'bottom bottom', scrub: true } });

  ScrollTrigger.refresh();
}

runLoader();
window.addEventListener('load', () => {
  hero?.layout();
  ScrollTrigger.refresh();
});
