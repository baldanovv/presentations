// iPhone frame for vertical videos. Vanilla port of Magic UI "iphone" (MIT, Copyright (c) Magic UI,
// https://magicui.design/docs/components/iphone): same SVG frame and screen geometry, no React or Tailwind.
// Markup: <div class="iphone" data-video="../video/x.mp4" data-poster="../video/x.jpg" aria-label="…"></div>
// Plays muted on loop only while its slide is on screen (Zoom: one video at a time).
// prefers-reduced-motion: no autoplay, the poster stays and the video gets controls.
(() => {
  const W = 433, H = 882, SX = 21.25, SY = 19.25, SW = 389.5, SH = 843.5, SR = 55.75;
  const pct = (a, b) => (a / b * 100) + '%';
  const still = window.matchMedia('(prefers-reduced-motion: reduce)').matches || /print-pdf/.test(location.search);
  let n = 0;

  document.querySelectorAll('.iphone').forEach(el => {
    const id = 'iphone-punch-' + (++n);   // mask ids must be unique per frame on one page
    const screen = 'left:' + pct(SX, W) + ';top:' + pct(SY, H) + ';width:' + pct(SW, W) + ';height:' + pct(SH, H)
      + ';border-radius:' + pct(SR, SW) + ' / ' + pct(SR, SH);
    el.style.aspectRatio = W + ' / ' + H;
    el.setAttribute('role', 'img');
    el.innerHTML =
      '<div class="iphone-screen" style="' + screen + '"><video muted loop playsinline preload="metadata"'
      + (still ? ' controls' : '') + ' poster="' + el.dataset.poster + '" src="' + el.dataset.video + '"></video></div>'
      + '<svg viewBox="0 0 ' + W + ' ' + H + '" fill="none" aria-hidden="true">'
      + '<g mask="url(#' + id + ')">'
      + '<path class="f-edge" d="M2 73C2 32.6832 34.6832 0 75 0H357C397.317 0 430 32.6832 430 73V809C430 849.317 397.317 882 357 882H75C34.6832 882 2 849.317 2 809V73Z"/>'
      + '<path class="f-edge" d="M0 171C0 170.448 0.447715 170 1 170H3V204H1C0.447715 204 0 203.552 0 203V171Z"/>'
      + '<path class="f-edge" d="M1 234C1 233.448 1.44772 233 2 233H3.5V300H2C1.44772 300 1 299.552 1 299V234Z"/>'
      + '<path class="f-edge" d="M1 319C1 318.448 1.44772 318 2 318H3.5V385H2C1.44772 385 1 384.552 1 384V319Z"/>'
      + '<path class="f-edge" d="M430 279H432C432.552 279 433 279.448 433 280V384C433 384.552 432.552 385 432 385H430V279Z"/>'
      + '<path class="f-body" d="M6 74C6 35.3401 37.3401 4 76 4H356C394.66 4 426 35.3401 426 74V808C426 846.66 394.66 878 356 878H76C37.3401 878 6 846.66 6 808V74Z"/>'
      + '</g>'
      + '<path class="f-island" d="M154 48.5C154 38.2827 162.283 30 172.5 30H259.5C269.717 30 278 38.2827 278 48.5C278 58.7173 269.717 67 259.5 67H172.5C162.283 67 154 58.7173 154 48.5Z"/>'
      + '<defs><mask id="' + id + '" maskUnits="userSpaceOnUse"><rect width="' + W + '" height="' + H + '" fill="white"/>'
      + '<rect x="' + SX + '" y="' + SY + '" width="' + SW + '" height="' + SH + '" rx="' + SR + '" ry="' + SR + '" fill="black"/></mask></defs>'
      + '</svg>';
  });

  if (still || !window.Reveal) return;
  const sync = () => {
    const cur = Reveal.getCurrentSlide();
    document.querySelectorAll('.iphone video').forEach(v => {
      if (cur && cur.contains(v)) { const p = v.play(); if (p) p.catch(() => {}); } else v.pause();
    });
  };
  if (Reveal.isReady()) sync(); else Reveal.on('ready', sync);
  Reveal.on('slidechanged', sync);
})();
