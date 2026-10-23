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
