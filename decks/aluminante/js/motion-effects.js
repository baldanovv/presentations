// Slide animations on Motion (vendor/motion-13.4.6.js) for reveal.js decks shown in Zoom.
// Load after reveal.js, Reveal.initialize and motion-13.4.6.js.
//
// Turn on per slide: <section data-motion>. Effects on elements inside it:
//   data-m="rise"   fades in and rises, staggered in document order
//   data-m="rows"   container: its rows slide in one by one (table: tbody tr, list: its children)
//   data-m="count"  counts up from zero and ends on the exact original text
//   data-m="bar"    payment plan bar (.paybar): fills left to right, the key segment last and slower
//   data-m="zoom"   slow zoom of an image block; data-m-zoom on the section zooms the slide background
//
// Pace for Zoom: 0.5 to 0.7 s per element, the whole slide within 1.5 s. Plays on every visit to the slide.
// A click, tap, key press or slider move on the slide jumps every animation to its end.
// Reduced motion, print to PDF (?print-pdf) and the speaker notes view (?receiver) show the final state.
(() => {
  const TEMPO = {
    rise: 0.6, riseStart: 0.05, riseSpan: 0.75, riseGap: 0.08, riseY: 18,
    row: 0.5, rowStart: 0.35, rowSpan: 0.4, rowGap: 0.07, rowX: 16,
    count: 0.7, countStart: 0.25, countGap: 0.05, countMax: 0.75,
    bar: 0.5, barLast: 0.6, barStart: 0.5, barGap: 0.1,
    zoom: 20, zoomScale: 1.08
  };
  const EASE = [0.22, 0.61, 0.36, 1];

  const M = window.Motion, secs = [...document.querySelectorAll('.slides section[data-motion]')];
  if (!M || !secs.length || !window.Reveal) return;
  const still = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    || /print-pdf/.test(location.search) || /receiver/i.test(location.search);
  if (still) return;

  const all = (sec, sel) => [...sec.querySelectorAll(sel)].filter(el => !el.closest('.fragment'));
  const gap = (n, span, max) => (n > 1 ? Math.min(max, span / (n - 1)) : 0);

  // count: one number per element, Russian format (comma decimals, groups with spaces or non breaking spaces).
  // The final text is kept apart; the zeroed flag is separate from the text, so a real "0,0%" written
  // by a calculator is never taken for our zero.
  const finals = new WeakMap(), zeroed = new WeakSet();
  const NUM = /\d{1,3}(?:[  ]\d{3})+(?:,\d+)?|\d+(?:,\d+)?/g;
  const counter = el => {
    if (el.children.length) return null;
    const txt = zeroed.has(el) ? finals.get(el) : el.textContent, m = txt.match(NUM);
    if (!m || m.length !== 1) return null;
    const raw = m[0], dec = raw.includes(',') ? raw.split(',')[1].length : 0, grouped = /\d[  ]\d/.test(raw);
    const fmt = v => { let s = v.toFixed(dec).replace('.', ','); if (grouped) s = s.replace(/\B(?=(\d{3})+(?!\d))/g, ' '); return txt.replace(raw, s); };
    finals.set(el, txt);
    return { el, txt, fmt, target: parseFloat(raw.replace(/[  ]/g, '').replace(',', '.')) };
  };

  const plan = sec => ({
    rise: all(sec, '[data-m="rise"]'),
    rows: all(sec, '[data-m="rows"]').flatMap(c => [...(c.tBodies && c.tBodies.length ? c.tBodies[0].rows : c.children)]),
    fills: all(sec, '[data-m="bar"] .pb-fill'),
    counts: all(sec, '[data-m="count"]').map(counter).filter(Boolean),
    zooms: [...all(sec, '[data-m="zoom"]'), ...(sec.hasAttribute('data-m-zoom') ? [bgOf(sec)] : [])].filter(Boolean)
  });
  const bgOf = sec => { const b = Reveal.getSlideBackground(sec); return b && b.querySelector('.slide-background-content'); };

  const prepare = sec => {
    const p = plan(sec);
    p.rise.forEach(el => { el.style.opacity = 0; el.style.transform = 'translateY(' + TEMPO.riseY + 'px)'; });
    p.rows.forEach(el => { el.style.opacity = 0; el.style.transform = 'translateX(' + -TEMPO.rowX + 'px)'; });
    p.fills.forEach(el => { el.style.transform = 'scaleX(0)'; });
    p.counts.forEach(c => { c.el.textContent = c.fmt(0); zeroed.add(c.el); });
    return p;
  };
  const clean = el => { el.style.opacity = ''; el.style.transform = ''; };

  const runs = new Map(), zoomRuns = new Map();
  const finish = sec => { (runs.get(sec) || []).forEach(c => (c.complete ? c.complete() : c())); runs.delete(sec); };

  const play = sec => {
    finish(sec);
    const p = prepare(sec), list = [];
    const anim = (el, kf, o) => { const a = M.animate(el, kf, { ease: EASE, ...o }); a.then(() => clean(el)); list.push(a); };

    const rs = gap(p.rise.length, TEMPO.riseSpan, TEMPO.riseGap);
    p.rise.forEach((el, i) => anim(el, { opacity: [0, 1], transform: ['translateY(' + TEMPO.riseY + 'px)', 'translateY(0px)'] },
      { duration: TEMPO.rise, delay: TEMPO.riseStart + i * rs }));

    const ws = gap(p.rows.length, TEMPO.rowSpan, TEMPO.rowGap);
    p.rows.forEach((el, i) => anim(el, { opacity: [0, 1], transform: ['translateX(' + -TEMPO.rowX + 'px)', 'translateX(0px)'] },
      { duration: TEMPO.row, delay: TEMPO.rowStart + i * ws }));

    // bar: left to right, the last segment (the key payment) last and a little slower
    p.fills.forEach((el, i) => {
      const last = i === p.fills.length - 1;
      list.push(M.animate(el, { transform: ['scaleX(0)', 'scaleX(1)'] },
        { duration: last ? TEMPO.barLast : TEMPO.bar, delay: TEMPO.barStart + i * TEMPO.barGap, ease: EASE }));
    });

    p.counts.forEach((c, i) => {
      // table cells keep their final width while counting, so columns and row wraps do not jump
      const lock = c.el.tagName === 'TD';
      if (lock) { c.el.textContent = c.txt; c.el.style.boxSizing = 'border-box'; c.el.style.width = c.el.offsetWidth + 'px'; c.el.textContent = c.fmt(0); }
      const done = () => { c.el.textContent = c.txt; zeroed.delete(c.el); if (lock) { c.el.style.width = ''; c.el.style.boxSizing = ''; } };
      const a = M.animate(0, c.target, { duration: TEMPO.count, delay: Math.min(TEMPO.countMax, TEMPO.countStart + i * TEMPO.countGap), ease: EASE,
        onUpdate: v => { c.el.textContent = c.fmt(v); }, onComplete: done });
      // stop and set the text synchronously: complete() would run onComplete a frame later,
      // after a calculator update, and write the old value back
      list.push(() => { a.stop(); done(); });
    });
    runs.set(sec, list);

    // slow zoom is decoration: a click does not jump it, it restarts on every visit
    (zoomRuns.get(sec) || []).forEach(a => a.stop());
    zoomRuns.set(sec, p.zooms.map(el => M.animate(el, { transform: ['scale(1)', 'scale(' + TEMPO.zoomScale + ')'] }, { duration: TEMPO.zoom, ease: 'easeOut' })));
  };

  // capture phase runs before the slide's own handlers (calculators), so their live values win
  secs.forEach(sec => ['input', 'pointerdown', 'click', 'keydown'].forEach(t => sec.addEventListener(t, () => finish(sec), true)));

  const enter = s => { if (s && s.hasAttribute('data-motion')) play(s); };
  const start = cur => { secs.forEach(s => { if (s !== cur) prepare(s); }); enter(cur); };
  if (Reveal.isReady()) start(Reveal.getCurrentSlide()); else Reveal.on('ready', e => start(e.currentSlide));
  Reveal.on('slidechanged', e => { if (e.previousSlide && runs.has(e.previousSlide)) finish(e.previousSlide); enter(e.currentSlide); });

  window.MotionEffects = { TEMPO, play, finish };
})();
