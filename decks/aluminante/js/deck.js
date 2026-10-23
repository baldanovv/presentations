// Deck setup: footer with page numbers, slide background colors from tokens, phone layout, reveal.js init.
(() => {
  const BRAND = document.querySelector('meta[name="deck-brand"]')?.content || '';

  // footer and page number on every slide
  document.querySelectorAll('.slides > section').forEach((s, i) => {
    const f = document.createElement('div');
    f.className = 'foot';
    f.innerHTML = '<span>' + BRAND + '</span><span class="pg">' + String(i + 1).padStart(2, '0') + '</span>';
    (s.querySelector('.slide') || s).appendChild(f);
  });

  // phones and portrait screens: vertical layout, slides scroll (?portrait and ?landscape force a mode)
  const qs = new URLSearchParams(location.search);
  const isPortrait = () => {
    const w = window.innerWidth || document.documentElement.clientWidth, h = window.innerHeight || document.documentElement.clientHeight;
    const phone = /iPhone|iPod|Android.+Mobile|Mobile Safari/i.test(navigator.userAgent) || Math.min(screen.width, screen.height) < 820;
    return (phone && h > w) || (h > w * 1.15 && w < 1100);
  };
  const mode = () => qs.has('portrait') || (!qs.has('landscape') && isPortrait());
  const portrait = mode();
  if (portrait) document.documentElement.classList.add('portrait');
  // re-layout when the phone is rotated
  const recheck = () => setTimeout(() => { if (mode() !== portrait) location.reload(); }, 300);
  window.addEventListener('orientationchange', recheck);
  window.addEventListener('resize', recheck);

  // background color of plain slides comes from --bg in tokens.css (smooth fade between slides)
  document.querySelectorAll('.slides > section:not([data-background-image]):not([data-background-color])').forEach(s => {
    const bg = getComputedStyle(s).getPropertyValue('--bg').trim();
    if (bg) s.setAttribute('data-background-color', bg);
  });

  Reveal.initialize({
    width: portrait ? 1080 : 1920, height: portrait ? 1920 : 1080, margin: 0, minScale: 0.1, maxScale: 2,
    view: portrait ? 'scroll' : null, scrollActivationWidth: null, scrollProgress: 'auto', scrollLayout: 'full',
    center: false, hash: true, transition: 'fade', transitionSpeed: 'fast', backgroundTransition: 'fade',
    controls: true, progress: true, plugins: window.RevealNotes ? [RevealNotes] : []
  });

  // pause videos when leaving their slide
  Reveal.on('slidechanged', e => document.querySelectorAll('video').forEach(v => { if (!e.currentSlide.contains(v)) v.pause(); }));
})();
