// v2 upgrade scripts, layered after the deck script.

// Payment plan bar on the price slide. Built from the payment table, so percents always match it.
// Segments carry --i (fill order for the stage 3 animation, keys segment is the last row, so it fills last).
// Hover (mouse) or tap (touch) on a segment highlights its table row, and the other way round.
document.querySelectorAll('.paybar').forEach(bar => {
  const rows = [...bar.closest('.glass').querySelectorAll('table.paytbl tbody tr')];
  bar.innerHTML = rows.map((tr, i) => {
    const pct = tr.cells[1].textContent;
    return '<i class="seg' + (tr.classList.contains('ho') ? ' keys' : '') + '" data-i="' + i + '" style="flex-grow:' + parseFloat(pct) + ';--i:' + i + '">'
      + '<span class="pb-fill"></span><span class="pb-pct">' + pct + '</span></i>';
  }).join('');
  const segs = [...bar.children];
  const hl = i => { segs.forEach((s, k) => s.classList.toggle('hl', k === i)); rows.forEach((r, k) => r.classList.toggle('hl', k === i)); };
  [segs, rows].forEach(list => list.forEach((el, i) => {
    el.addEventListener('mouseenter', () => hl(i));
    el.addEventListener('mouseleave', () => hl(-1));
    el.addEventListener('pointerup', e => { if (e.pointerType !== 'mouse') hl(el.classList.contains('hl') ? -1 : i); });
  }));
});

// ===== Stage 3: slide animations on Motion (assets/vendor/motion-13.4.6.js) =====
// Only sections with data-motion. Plays when the slide is shown (ready / slidechanged) and again on every return.
// Calm pace for Zoom: 0.5-0.7 s per element, whole slide within 1.5 s.
// Reduced motion, print to PDF and the speaker notes view get the final state with no animation.
(() => {
  const M = window.Motion, secs = [...document.querySelectorAll('.slides section[data-motion]')];
  if (!M || !secs.length || !window.Reveal) return;
  const still = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    || /print-pdf/.test(location.search) || /receiver/i.test(location.search);
  if (still) return;

  // the deck's own entrance and count-up are switched off on these slides, Motion drives them
  secs.forEach(sec => sec.querySelectorAll('.a, [data-final]').forEach(el => { el.classList.remove('a'); delete el.dataset.final; }));

  const EASE = [0.22, 0.61, 0.36, 1];
  const RISE = ['.label', 'h2', '.pay-head > div', '.stats > div', '.slide > .pay > .glass', '.pay-side > *', '.tabs', '.roi-in .mode:not([hidden]) > *', '.roi-out', '.chain li', '.punch'];
  const ROWS = ['table.paytbl tbody tr', '.roi-out .rows > div'];
  const COUNT = ['.pay-head b', '.dp b', '.stats b', '.roi .big-in', '.result b', 'table.paytbl td:nth-child(2)', 'table.paytbl td:nth-child(3)'];
  const pick = (sec, list) => list.flatMap(s => [...sec.querySelectorAll(s)]).filter((el, i, a) => a.indexOf(el) === i && !el.closest('.fragment'));
  const gap = (n, span, max) => (n > 1 ? Math.min(max, span / (n - 1)) : 0);

  // count-up: one number per element, finishes on the exact original text, groups with non-breaking spaces
  // finals keeps the true text while the element shows our zeroed one (flag in zeroed, not a text match,
  // so a real "0,0%" from the calculator is never mistaken for it)
  const finals = new WeakMap(), zeroed = new WeakSet();
  const NUM = /\d{1,3}(?:[ \u00A0]\d{3})+(?:,\d+)?|\d+(?:,\d+)?/g;
  const counter = el => {
    if (el.children.length) return null;
    const txt = zeroed.has(el) ? finals.get(el) : el.textContent, m = txt.match(NUM);
    if (!m || m.length !== 1 || /Q\d/.test(txt)) return null;
    const raw = m[0], dec = raw.includes(',') ? raw.split(',')[1].length : 0, grouped = /\d[ \u00A0]\d/.test(raw);
    const fmt = v => { let s = v.toFixed(dec).replace('.', ','); if (grouped) s = s.replace(/\B(?=(\d{3})+(?!\d))/g, '\u00A0'); return txt.replace(raw, s); };
    finals.set(el, txt);
    return { el, txt, fmt, target: parseFloat(raw.replace(/[ \u00A0]/g, '').replace(',', '.')) };
  };

  const runs = new Map();
  const finish = sec => { (runs.get(sec) || []).forEach(c => c.complete ? c.complete() : c()); runs.delete(sec); };

  const plan = sec => {
    const rise = pick(sec, RISE), rows = pick(sec, ROWS), fills = [...sec.querySelectorAll('.paybar .pb-fill')];
    const counts = pick(sec, COUNT).map(counter).filter(Boolean);
    return { rise, rows, fills, counts };
  };
  const prepare = sec => {
    const p = plan(sec);
    p.rise.forEach(el => { el.style.opacity = 0; el.style.transform = 'translateY(18px)'; });
    p.rows.forEach(el => { el.style.opacity = 0; el.style.transform = 'translateX(-16px)'; });
    p.fills.forEach(el => { el.style.transform = 'scaleX(0)'; });
    p.counts.forEach(c => { c.el.textContent = c.fmt(0); zeroed.add(c.el); });
    return p;
  };
  const clean = el => { el.style.opacity = ''; el.style.transform = ''; };

  const play = sec => {
    finish(sec);
    const p = prepare(sec), list = [];
    const anim = (el, kf, o) => { const a = M.animate(el, kf, { ease: EASE, ...o }); a.then(() => clean(el)); list.push(a); };
    const rs = gap(p.rise.length, 0.75, 0.08);
    p.rise.forEach((el, i) => anim(el, { opacity: [0, 1], transform: ['translateY(18px)', 'translateY(0px)'] }, { duration: 0.6, delay: 0.05 + i * rs }));
    const ws = gap(p.rows.length, 0.4, 0.07);
    p.rows.forEach((el, i) => anim(el, { opacity: [0, 1], transform: ['translateX(-16px)', 'translateX(0px)'] }, { duration: 0.5, delay: 0.35 + i * ws }));
    // payment plan bar: left to right, keys segment last and a little slower
    p.fills.forEach((el, i) => {
      const last = i === p.fills.length - 1;
      list.push(M.animate(el, { transform: ['scaleX(0)', 'scaleX(1)'] }, { duration: last ? 0.6 : 0.5, delay: 0.5 + i * 0.1, ease: EASE }));
    });
    p.counts.forEach((c, i) => {
      // table cells keep their final width while counting, so columns and row wraps do not jump
      const lock = c.el.tagName === 'TD';
      if (lock) { c.el.textContent = c.txt; c.el.style.boxSizing = 'border-box'; c.el.style.width = c.el.offsetWidth + 'px'; c.el.textContent = c.fmt(0); }
      const unlock = () => { if (lock) { c.el.style.width = ''; c.el.style.boxSizing = ''; } };
      const a = M.animate(0, c.target, { duration: 0.7, delay: Math.min(0.75, 0.25 + i * 0.05), ease: EASE,
        onUpdate: v => { c.el.textContent = c.fmt(v); }, onComplete: () => { c.el.textContent = c.txt; zeroed.delete(c.el); unlock(); } });
      // only stop + set the text synchronously: complete() would run onComplete a frame later,
      // after a calculator update, and write the old value back
      list.push(() => { a.stop(); c.el.textContent = c.txt; zeroed.delete(c.el); unlock(); });
    });
    runs.set(sec, list);
  };

  // a click, key press or slider move on the slide jumps every animation to its end (exact numbers),
  // capture phase runs before the calculator, so its live values win
  secs.forEach(sec => ['input', 'pointerdown', 'click', 'keydown'].forEach(t => sec.addEventListener(t, () => finish(sec), true)));

  const enter = s => { if (s && s.hasAttribute('data-motion')) play(s); };
  const start = cur => { secs.forEach(s => { if (s !== cur) prepare(s); }); enter(cur); };
  if (Reveal.isReady()) start(Reveal.getCurrentSlide()); else Reveal.on('ready', e => start(e.currentSlide));
  Reveal.on('slidechanged', e => { if (e.previousSlide && runs.has(e.previousSlide)) finish(e.previousSlide); enter(e.currentSlide); });
})();
