  // payment plans (factsheet KORE)
  const PLANS = {
    a: { rows: [['Бронирование', .20, 'При бронировании'], ['2 платёж', .05, '15.02.2027*'], ['3 платёж', .05, '15.06.2027*'], ['4 платёж', .05, '15.10.2027*'], ['5 платёж', .05, '15.02.2028*'], ['6 платёж', .05, '15.04.2028*'], ['7 платёж', .05, '15.09.2028*'], ['При сдаче', .50, 'Q4 2028*']],
      note: 'План 50/50 по factsheet Imtiaz. До ключей 50%, при сдаче 50%. * Даты предварительные. Плюс DLD 4% при регистрации.' },
    b: { rows: [['Бронирование', .20, 'При бронировании'], ['2 платёж', .05, '15.02.2027*'], ['3 платёж', .10, '15.06.2027*'], ['4 платёж', .05, '15.10.2027*'], ['5 платёж', .10, '15.02.2028*'], ['6 платёж', .05, '15.04.2028*'], ['При сдаче', .05, 'Q4 2028'], ['После ключей, 12 платежей', .40, '3,33% в квартал, 3 года']],
      note: 'План 60/40 по factsheet Imtiaz. До ключей и при сдаче 60%, 40% после ключей в течение 3 лет. * Даты предварительные. Плюс DLD 4% при регистрации.' }
  };
  document.querySelectorAll('.pp').forEach(c => {
    let price = 1100000, plan = 'a';
    const upd = () => {
      const p = PLANS[plan]; let h = '';
      p.rows.forEach(r => { h += '<tr' + (r[1] >= .4 ? ' class="tot"' : '') + '><td>' + r[0] + '</td><td class="num">' + Math.round(r[1] * 100) + '%</td><td>' + r[2] + '</td><td class="num">' + fmt(price * r[1]) + '</td><td class="num">≈ ' + fmt(price * r[1] / R) + '</td></tr>'; });
      h += '<tr><td>DLD 4%, при регистрации</td><td class="num">4%</td><td>При бронировании</td><td class="num">' + fmt(price * .04) + '</td><td class="num">≈ ' + fmt(price * .04 / R) + '</td></tr>';
      c.querySelector('.pp-body').innerHTML = h; c.querySelector('.pp-note').textContent = p.note;
    };
    chipGroup(c, '[data-k="price"]', b => { price = +b.dataset.v; upd(); });
    c.querySelectorAll('.tabs button').forEach(b => b.addEventListener('click', () => { plan = b.dataset.plan; c.querySelectorAll('.tabs button').forEach(x => x.classList.toggle('on', x === b)); upd(); }));
    upd();
  });

  // ROI
  document.querySelectorAll('.roi').forEach(c => {
    const d = c.dataset, dldR = +d.dld, fee = +d.fee, scpsf = +d.scpsf, noc = +d.noc, comR = +d.com;
    const rent = c.querySelector('#r-rent'), sp = c.querySelector('#r-sp');
    let mode = 'rent', paid = 0.5, ep = 1100000, sz = 669;
    const row = (k, v, cls) => '<div class="' + (cls || '') + '"><dt>' + k + '</dt><dd>' + v + '</dd></div>';
    const setSp = g => { sp.min = ep; sp.max = Math.round(ep * 1.6); sp.value = Math.round(ep * (1 + g / 100)); };
    const upd = () => {
      let rows = '', roi; const dld = ep * dldR, sc = sz * scpsf;
      if (mode === 'rent') {
        const m = +rent.value, r = m * 12, profit = r - sc, inv = ep + dld + fee;
        c.querySelector('.o-rent').textContent = fmt(m); c.querySelector('.o-rent-usd').textContent = '≈ ' + usd(m) + ' в месяц';
        rows = row('Аренда в год', both(r)) + row('Сервисный сбор*', both(-sc)) + row('Прибыль', both(profit), 'sum')
          + row('Цена покупки', both(ep)) + row('DLD 4%', both(dld)) + row('Админ сбор', both(fee)) + row('Вложения', both(inv), 'sum');
        roi = profit / inv * 100;
      } else {
        const s = +sp.value, com = s * comR, inst = ep * paid, profit = s - ep - dld - fee - noc - com, inv = inst + dld + fee;
        c.querySelector('.o-sp').textContent = fmt(s); c.querySelector('.o-sp-usd').textContent = '≈ ' + usd(s);
        rows = row('Цена продажи', both(s)) + row('Цена покупки', both(-ep)) + row('DLD и админ сбор', both(-(dld + fee))) + row('NOC и комиссия 2%', both(-(noc + com))) + row('Прибыль', both(profit), 'sum')
          + row('Взносы ' + Math.round(paid * 100) + '%', both(inst)) + row('DLD и админ сбор', both(dld + fee)) + row('Вложения', both(inv), 'sum');
        roi = profit / inv * 100;
        c.querySelectorAll('[data-for="sp"] button').forEach(b => b.classList.toggle('on', Math.abs(ep * (1 + b.dataset.g / 100) - s) < 1500));
      }
      c.querySelector('.rows').innerHTML = rows; c.querySelector('.o-roi').textContent = pct(roi);
    };
    c.querySelectorAll('.tabs button').forEach(b => b.addEventListener('click', () => {
      mode = b.dataset.mode; c.querySelectorAll('.tabs button').forEach(x => x.classList.toggle('on', x === b));
      c.querySelector('.m-rent').hidden = mode !== 'rent'; c.querySelector('.m-resale').hidden = mode !== 'resale'; upd();
    }));
    chipGroup(c, '[data-k="unit"]', b => { ep = +b.dataset.p; sz = +b.dataset.s; rent.value = +b.dataset.r; setSp(20); upd(); });
    chipGroup(c, '[data-for="sp"]', b => { sp.value = Math.round(ep * (1 + b.dataset.g / 100)); upd(); });
    chipGroup(c, '[data-for="paid"]', b => { paid = +b.dataset.p; upd(); });
    rent.addEventListener('input', upd); sp.addEventListener('input', upd);
    setSp(20); upd();
  });

  // 60/40: rent vs post handover installments
  document.querySelectorAll('.phc').forEach(c => {
    const scpsf = +c.dataset.sc, rent = c.querySelector('#p-rent'); let ep = 1100000, sz = 669;
    const upd = () => {
      const m = +rent.value, q = ep * 0.4 / 12, inst = q / 3, scm = sz * scpsf / 12, mx = Math.max(m, inst + scm);
      const bars = c.querySelectorAll('.mb em'); bars[0].style.width = (m / mx * 100) + '%'; bars[1].style.width = (inst / mx * 100) + '%'; bars[2].style.width = (scm / mx * 100) + '%';
      c.querySelector('.o-prent').textContent = fmt(m);
      c.querySelector('.v-rent').innerHTML = both(m); c.querySelector('.v-inst').innerHTML = both(-inst); c.querySelector('.v-sc').innerHTML = both(-scm);
      c.querySelector('.v-gap').innerHTML = both(Math.min(0, m - inst - scm));
      c.querySelector('.v-cov').textContent = Math.round(Math.min(1, m / (inst + scm)) * 100) + '%';
      c.querySelector('.s-q').textContent = fmt(q) + ' (≈ ' + usd(q) + ')';
    };
    chipGroup(c, '[data-k="unit"]', b => { ep = +b.dataset.p; sz = +b.dataset.s; rent.value = +b.dataset.r; upd(); });
    rent.addEventListener('input', upd); upd();
  });

  // 50/50 + mortgage
  document.querySelectorAll('.mg').forEach(c => {
    const pre = +c.dataset.pre, dldR = +c.dataset.dld, fee = +c.dataset.fee, scpsf = +c.dataset.sc;
    const st = { ltv: 0.5, rate: 0.045, term: 25 }; let ep = 1100000, sz = 669;
    const rent = c.querySelector('#m-rent');
    const upd = () => {
      const m = +rent.value, loan = ep * st.ltv, r = st.rate / 12, n = st.term * 12;
      const pay = loan * r / (1 - Math.pow(1 + r, -n)), scm = sz * scpsf / 12, topup = Math.max(0, ep * (1 - pre - st.ltv)), dld = ep * dldR;
      const mx = Math.max(m, pay + scm), bars = c.querySelectorAll('.mb em');
      bars[0].style.width = (m / mx * 100) + '%'; bars[1].style.width = (pay / mx * 100) + '%'; bars[2].style.width = (scm / mx * 100) + '%';
      c.querySelector('.o-mrent').textContent = fmt(m);
      c.querySelector('.v-rent').innerHTML = both(m); c.querySelector('.v-mort').innerHTML = both(-pay); c.querySelector('.v-sc').innerHTML = both(-scm);
      c.querySelector('.v-left').innerHTML = both(m - pay - scm);
      c.querySelector('.v-own').innerHTML = both(ep * pre + topup + dld + fee);
      c.querySelector('.s-pre').textContent = fmt(ep * pre) + ' (≈ ' + usd(ep * pre) + ')';
      c.querySelector('.s-post').textContent = fmt(ep * (1 - pre)) + ', ≈ ' + usd(ep * (1 - pre));
      c.querySelector('.s-loan').textContent = Math.round(st.ltv * 100) + '% стоимости: ' + fmt(loan) + ' AED (≈ ' + usd(loan) + ')';
      c.querySelector('.s-topup-txt').textContent = topup > 0 ? 'Ещё ' + fmt(topup) + ' AED вы доплачиваете сами' : 'Банк покрывает весь остаток';
    };
    chipGroup(c, '[data-k="unit"]', b => { ep = +b.dataset.p; sz = +b.dataset.s; rent.value = +b.dataset.r; upd(); });
    chipGroup(c, '[data-k="ltv"]', b => { st.ltv = +b.dataset.v; upd(); });
    chipGroup(c, '[data-k="rate"]', b => { st.rate = +b.dataset.v; upd(); });
    rent.addEventListener('input', upd); upd();
  });
