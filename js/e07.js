'use strict';
/* ЭПИЗОД 07 — ЛОГАРИФМ ВОКРУГ НАС. Децибелы, магнитуды, сложные проценты. */
(function () {
  var U = LOG.U, F = LOG.F;

  /* ---------- Сцена 1: звук ---------- */
  function sceneSound(box, api) {
    var wrap = U.el('div', 'col');
    var card = U.el('div', 'card');
    card.innerHTML =
      '<div class="field"><label for="dbR">Уровень звука: <b id="dbV" style="color:var(--blue);font-family:var(--font-mono)">60 дБ</b></label>' +
      '<input id="dbR" type="range" min="30" max="120" step="1" value="60"></div>' +
      '<div id="waveBox" style="margin-top:10px"></div>' +
      '<div class="num-cards" style="margin-top:14px">' +
      '<div class="card" style="padding:14px 16px"><div class="t">Интенсивность относительно I₀</div><div class="v" id="iRel" style="color:var(--blue)"></div></div>' +
      '<div class="card" style="padding:14px 16px"><div class="t">Относительно 60 дБ (разговор)</div><div class="v" id="iVs60" style="color:var(--orange)"></div></div>' +
      '</div>' +
      '<p class="muted" style="font-size:13px;margin:8px 0 0">Формула уровня: L = 10 · log₁₀(I / I₀). Каждые +10 дБ — интенсивность ×10. Амплитуда волны на рисунке условна: она иллюстрирует звук, но шкала — интенсивность.</p>' +
      '<div class="dbscale" id="dbScale"></div>';
    wrap.appendChild(card);
    box.appendChild(wrap);

    var waveSt = LOG.canvas(card.querySelector('#waveBox'), { height: 130, alt: 'Звуковая волна — иллюстрация' });
    var rng = card.querySelector('#dbR');
    var DBS = [
      { db: 30, lbl: '30', sub: 'шёпот' }, { db: 60, lbl: '60', sub: 'разговор' },
      { db: 90, lbl: '90', sub: 'дорога' }, { db: 110, lbl: '110', sub: 'концерт' },
      { db: 120, lbl: '120', sub: 'порог боли' }
    ];
    var scale = card.querySelector('#dbScale');
    DBS.forEach(function (d) {
      var el = U.el('div', 'st', d.lbl + ' дБ<small>' + d.sub + '</small>');
      el.dataset.db = d.db;
      scale.appendChild(el);
    });
    /* ориентиры — приблизительные бытовые уровни */
    function upd() {
      var db = parseInt(rng.value, 10);
      card.querySelector('#dbV').textContent = db + ' дБ';
      var rel = Math.pow(10, db / 10);
      var e = Math.floor(db / 10);
      var mant = rel / Math.pow(10, e);
      card.querySelector('#iRel').innerHTML = '×10<sup>' + e + '</sup>' + (db % 10 ? ' (≈' + U.fmtInt(Math.round(rel)) + ')' : '') + ' · I₀';
      var vs = Math.pow(10, (db - 60) / 10);
      card.querySelector('#iVs60').textContent = '×' + (db === 60 ? '1' : U.fmtInt(Math.round(vs)));
      scale.querySelectorAll('.st').forEach(function (el) {
        el.classList.toggle('on', Math.abs(parseInt(el.dataset.db, 10) - db) <= 5);
      });
      waveSt.level = db;
      drawWave();
    }
    function drawWave() {
      var ctx = waveSt.ctx, w = waveSt.w, h = waveSt.h;
      ctx.clearRect(0, 0, w, h);
      var db = waveSt.level || 60;
      var amp = U.clamp(Math.pow(10, (db - 60) / 20) * 0.22, 0.03, h * 0.42);
      ctx.strokeStyle = 'rgba(108,140,255,.9)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      for (var x = 0; x <= w; x += 2) {
        var y = h / 2 + Math.sin(x / 14) * amp * (0.75 + 0.25 * Math.sin(x / 60 + db));
        if (x === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
      }
      ctx.stroke();
      ctx.strokeStyle = 'rgba(139,143,158,.3)';
      ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(0, h / 2); ctx.lineTo(w, h / 2); ctx.stroke();
    }
    waveSt.draw = drawWave;
    rng.addEventListener('input', upd);
    upd();
    api.cleanup(function () { waveSt.off(); });
    api.done();
  }

  /* ---------- Сцена 2: землетрясения ---------- */
  function sceneQuake(box, api) {
    var wrap = U.el('div', 'col');
    var card = U.el('div', 'card');
    card.innerHTML =
      '<div class="row row--center" style="margin-bottom:12px">' +
      '<span class="muted">Магнитуда второго сейсмографа:</span>' +
      '<div class="seg" role="group" aria-label="Выбор магнитуды" id="magSeg"></div>' +
      '</div>' +
      '<div class="eq-grid">' +
      '<div class="card" style="padding:14px 16px"><h3 class="muted" style="margin:0 0 6px;font-size:12px;font-family:var(--font-mono)">M 5.0 — эталон</h3><div id="seismoA"></div></div>' +
      '<div class="card" style="padding:14px 16px"><h3 class="muted" style="margin:0 0 6px;font-size:12px;font-family:var(--font-mono)">M <b id="magB">6.0</b></h3><div id="seismoB"></div></div>' +
      '</div>' +
      '<div class="num-cards" style="margin-top:12px">' +
      '<div class="card" style="padding:14px 16px"><div class="t">Амплитуда записи</div><div class="v" id="ampR" style="color:var(--blue)"></div></div>' +
      '<div class="card" style="padding:14px 16px"><div class="t">Выделяемая энергия</div><div class="v" id="enR" style="color:var(--orange)"></div></div>' +
      '</div>' +
      '<p class="muted" style="font-size:13px;margin:8px 0 0">+1 магнитуда: амплитуда ×10, энергия ×10<sup>1,5</sup> ≈ ×31,6 (округляют до 32). Магнитуда характеризует источник — силу сотрясений в конкретном месте она не задаёт.</p>';
    wrap.appendChild(card);
    box.appendChild(wrap);

    var sa = LOG.canvas(card.querySelector('#seismoA'), { height: 110, alt: 'Сейсмограмма магнитуды 5' });
    var sb = LOG.canvas(card.querySelector('#seismoB'), { height: 110, alt: 'Сейсмограмма выбранной магнитуды' });
    var seg = card.querySelector('#magSeg');
    var mag = 6;
    [5, 6, 7, 8].forEach(function (m) {
      var b = U.el('button', null, 'M ' + m + '.0');
      b.type = 'button';
      b.setAttribute('aria-pressed', String(m === 6));
      b.addEventListener('click', function () {
        seg.querySelectorAll('button').forEach(function (o) { o.setAttribute('aria-pressed', 'false'); });
        b.setAttribute('aria-pressed', 'true');
        mag = m;
        upd();
      });
      seg.appendChild(b);
    });
    function seismo(ctx, st, amp, phase, color) {
      ctx.clearRect(0, 0, st.w, st.h);
      ctx.strokeStyle = color;
      ctx.lineWidth = 1.6;
      ctx.beginPath();
      var y0 = st.h / 2;
      for (var x = 0; x <= st.w; x += 1) {
        var env = (x > st.w * 0.35 && x < st.w * 0.8) ? Math.exp(-Math.pow((x - st.w * 0.55) / (st.w * 0.14), 2)) : 0;
        var y = y0 + Math.sin(x / 6 + phase) * amp * env * (0.6 + 0.4 * Math.sin(x / 31 + phase));
        if (x === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
      }
      ctx.stroke();
    }
    function upd() {
      card.querySelector('#magB').textContent = mag + '.0';
      var ampRatio = Math.pow(10, mag - 5);
      var enRatio = Math.pow(10, 1.5 * (mag - 5));
      card.querySelector('#ampR').textContent = '×' + U.fmtInt(ampRatio);
      card.querySelector('#enR').textContent = '×' + (enRatio < 100 ? U.fmtDec(enRatio, 1) : U.fmtInt(Math.round(enRatio)));
      seismo(sa.ctx, sa, 4, 0, 'rgba(139,143,158,.85)');
      seismo(sb.ctx, sb, Math.min(4 * ampRatio, 52), mag, 'rgba(255,148,94,.95)');
      sb.note = ampRatio > 4 ? 'визуально масштабирована (реально ×' + U.fmtInt(ampRatio) + ')' : '';
    }
    sa.draw = function () { upd(); }; sb.draw = function () { upd(); };
    upd();
    api.cleanup(function () { sa.off(); sb.off(); });
    api.done();
  }

  /* ---------- Сцена 3: деньги ---------- */
  function sceneMoney(box, api) {
    var wrap = U.el('div', 'col');
    var grid = U.el('div', 'money-grid');
    var form = U.el('div', 'card');
    form.innerHTML =
      '<div class="field"><label for="capInp">Начальный капитал, ₽</label><input id="capInp" type="number" min="1000" step="1000" value="100000"></div>' +
      '<div class="field" style="margin-top:10px"><label for="rateR">Ставка: <b id="rateV" style="color:var(--lime);font-family:var(--font-mono)">12%</b> годовых</label>' +
      '<input id="rateR" type="range" min="1" max="30" step="0.5" value="12"></div>' +
      '<div class="field" style="margin-top:10px"><label for="yearsR">Горизонт: <b id="yearsV" style="color:var(--blue);font-family:var(--font-mono)">15 лет</b></label>' +
      '<input id="yearsR" type="range" min="5" max="30" step="1" value="15"></div>' +
      '<div class="num-cards" style="margin-top:12px">' +
      '<div class="card" style="padding:12px 14px"><div class="t">Точное удвоение</div><div class="v" id="douT" style="font-size:clamp(18px,3vw,26px)">—</div></div>' +
      '<div class="card" style="padding:12px 14px"><div class="t">Впервые ≥ ×2 (целые годы)</div><div class="v" id="douY" style="font-size:clamp(18px,3vw,26px);color:var(--lime)">—</div></div>' +
      '</div>' +
      '<p class="muted" style="font-size:13px;margin:8px 0 0">P(n) = P₀ · 1,12ⁿ. Ищем n: 1,12ⁿ = 2 → n = log₁,₁₂(2) ≈ 6,12 года. Начисление раз в год, поэтому сумма впервые удвоится после 7 полных лет.</p>';
    grid.appendChild(form);
    var chart = U.el('div', 'card');
    chart.innerHTML = '<div id="moneySvg" class="graph-wrap"></div>';
    grid.appendChild(chart);
    wrap.appendChild(grid);
    box.appendChild(wrap);

    var svgBox = chart.querySelector('#moneySvg');
    var ns = 'http://www.w3.org/2000/svg';
    function build() {
      var cap = Math.max(1000, parseFloat(form.querySelector('#capInp').value) || 100000);
      var rate = parseFloat(form.querySelector('#rateR').value) / 100;
      var years = parseInt(form.querySelector('#yearsR').value, 10);
      form.querySelector('#rateV').textContent = U.fmtDec(rate * 100, rate * 100 % 1 ? 1 : 0) + '%';
      form.querySelector('#yearsV').textContent = years + ' лет';
      var nStar = Math.log(2) / Math.log(1 + rate);         // точное удвоение
      var nInt = Math.ceil(nStar - 1e-12);                  // первый целый год
      form.querySelector('#douT').textContent = U.fmtDec(nStar, 2) + ' года';
      form.querySelector('#douY').textContent = (nInt > nStar - 1e-12 && Math.pow(1 + rate, nInt - 1) >= 2) ? (nInt - 1) + ' лет' : nInt + (nInt === 1 ? ' год' : (nInt < 5 ? ' года' : ' лет'));
      /* первый целый год, когда впервые ≥ 2·P0 */
      var first = 1;
      while (Math.pow(1 + rate, first) < 2 - 1e-12) first++;
      form.querySelector('#douY').textContent = first + (first === 1 ? ' год' : (first < 5 ? ' года' : ' лет'));

      /* SVG-график */
      var W = 640, H = 300, padL = 58, padB = 34, padT = 18, padR = 16;
      var maxV = Math.pow(1 + rate, years) * cap;
      var X = function (n) { return padL + n / years * (W - padL - padR); };
      var Y = function (v) { return H - padB - v / maxV * (H - padB - padT); };
      svgBox.innerHTML = '';
      var svg = document.createElementNS(ns, 'svg');
      svg.setAttribute('viewBox', '0 0 ' + W + ' ' + H);
      svg.setAttribute('role', 'img');
      svg.setAttribute('aria-label', 'Рост вклада по годам с точкой удвоения');
      svgBox.appendChild(svg);
      function add(t, attrs, text) {
        var e = document.createElementNS(ns, t);
        for (var k in attrs) e.setAttribute(k, attrs[k]);
        if (text != null) e.textContent = text;
        svg.appendChild(e); return e;
      }
      /* сетка: кратные удвоения */
      for (var k = 1; Math.pow(2, k) * cap <= maxV * 1.02; k++) {
        var yy = Y(Math.pow(2, k) * cap);
        add('line', { x1: padL, y1: yy, x2: W - padR, y2: yy, stroke: 'rgba(139,143,158,.2)', 'stroke-dasharray': '3 4' });
        add('text', { x: padL - 6, y: yy + 4, 'text-anchor': 'end', 'font-size': 11, fill: '#898F9E', 'font-family': 'monospace' }, '×' + Math.pow(2, k));
      }
      add('line', { x1: padL, y1: Y(cap * 2), x2: W - padR, y2: Y(cap * 2), stroke: '#C8FF56', 'stroke-dasharray': '6 4', 'stroke-width': 1.5 });
      add('text', { x: W - padR, y: Y(cap * 2) - 6, 'text-anchor': 'end', 'font-size': 12, fill: '#C8FF56', 'font-family': 'monospace' }, 'удвоение');
      /* кривая */
      var d = '';
      for (var n = 0; n <= years; n += 0.25) {
        var px = X(n), py = Y(cap * Math.pow(1 + rate, n));
        d += (n === 0 ? 'M' : 'L') + px.toFixed(1) + ' ' + py.toFixed(1) + ' ';
      }
      add('path', { d: d, fill: 'none', stroke: '#6C8CFF', 'stroke-width': 3 });
      /* точки начисления */
      for (var n2 = 0; n2 <= years; n2++) {
        add('circle', { cx: X(n2), cy: Y(cap * Math.pow(1 + rate, n2)), r: 3.5, fill: '#AA78FF' });
        if (years <= 16 || n2 % 5 === 0) add('text', { x: X(n2), y: H - padB + 16, 'text-anchor': 'middle', 'font-size': 11, fill: '#898F9E', 'font-family': 'monospace' }, String(n2));
      }
      /* точное удвоение (дробный n) */
      if (nStar <= years) {
        var xs = X(nStar);
        add('line', { x1: xs, y1: padT, x2: xs, y2: H - padB, stroke: '#C8FF56', 'stroke-width': 1.5, 'stroke-dasharray': '2 5' });
        add('circle', { cx: xs, cy: Y(cap * 2), r: 7, fill: '#C8FF56' });
        add('text', { x: Math.min(xs + 8, W - 120), y: padT + 12, 'font-size': 12, fill: '#C8FF56', 'font-family': 'monospace' }, 'n = log₁,' + U.fmtDec(rate * 100, rate * 100 % 1 ? 1 : 0) + '(2) ≈ ' + U.fmtDec(nStar, 2));
        if (first <= years) {
          add('circle', { cx: X(first), cy: Y(cap * Math.pow(1 + rate, first)), r: 6, fill: '#FF945E' });
        }
      } else {
        add('text', { x: padL + 8, y: padT + 12, 'font-size': 12, fill: '#898F9E', 'font-family': 'monospace' }, 'удвоение за пределами графика: ' + U.fmtDec(nStar, 1) + ' лет');
      }
      add('text', { x: padL - 6, y: Y(cap) + 4, 'text-anchor': 'end', 'font-size': 11, fill: '#898F9E', 'font-family': 'monospace' }, '×1');
    }
    form.querySelectorAll('input').forEach(function (el) { el.addEventListener('input', build); });
    build();
    api.done();
  }

  LOG.register({
    id: 'e07',
    title: 'Логарифм вокруг нас',
    steps: [
      {
        text: 'Логарифм — не только школьная математика, но и способ описывать реальный мир. Три сцены: громкость звука, землетрясения и рост денег. Везде одна и та же идея: огромный диапазон величин ужимается в удобную шкалу.',
        nextLabel: 'Сцена 1: звук →',
        build: function (box, api) {
          var wrap = U.el('div', 'row row--center');
          wrap.innerHTML =
            '<span class="chip chip--blue">дБ · децибелы</span>' +
            '<span class="chip chip--orange">магнитуда · землетрясения</span>' +
            '<span class="chip chip--lime">% · сложные проценты</span>';
          box.appendChild(wrap);
          api.done();
        }
      },
      {
        text: 'Сцена первая: громкость. Уровень звука в децибелах — это десять логарифмов отношения интенсивности к эталонной. Каждые плюс десять децибел — интенсивность больше в десять раз. От шестидесяти до ста двадцати децибел — рост на шесть десятков, интенсивность больше в миллион раз. Двигайте ползунок.',
        nextLabel: 'Сцена 2: землетрясения →',
        build: function (box, api) { sceneSound(box, api); }
      },
      {
        text: 'Сцена вторая: землетрясения. Магнитуда — тоже логарифмическая величина. Плюс одна единица магнитуды — амплитуда записи в десять раз больше, а выделяемая энергия примерно в тридцать два раза больше. Разница между пятёркой и шестёркой на шкале — колоссальная разница в физике.',
        nextLabel: 'Сцена 3: деньги →',
        build: function (box, api) { sceneQuake(box, api); }
      },
      {
        text: 'Сцена третья: деньги. Вклад под двенадцать процентов годовых растёт как степень: один, один и двенадцать сотых, один и двадцать пять сотых… Через сколько лет капитал удвоится? Логарифм отвечает: через шесть целых двенадцать сотых года. Но проценты начисляются раз в год, поэтому впервые сумма удвоится после седьмого полного года. Меняйте ставку и смотрите, как логарифм пересчитывает ответ.',
        nextLabel: 'Финал →',
        build: function (box, api) { sceneMoney(box, api); }
      }
    ]
  });
})();
