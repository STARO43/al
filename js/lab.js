'use strict';
/* ТРЕНАЖЁР — калькулятор логарифмов, графики aˣ и logₐx, логарифмическая шкала, мини-контроль. */
(function () {
  var U = LOG.U, F = LOG.F;
  var NS = 'http://www.w3.org/2000/svg';

  function svgAdd(svg, t, attrs, text) {
    var e = document.createElementNS(NS, t);
    for (var k in attrs) e.setAttribute(k, attrs[k]);
    if (text != null) e.textContent = text;
    svg.appendChild(e);
    return e;
  }

  /* ---------- Калькулятор ---------- */
  function buildCalc(box, api) {
    var grid = U.el('div', 'lab-calc');
    var form = U.el('div', 'card');
    form.innerHTML =
      '<div class="field"><label for="calcA">Основание a (&gt; 0, ≠ 1)</label><input id="calcA" type="text" inputmode="decimal" value="2" placeholder="напр. 2 или 1/2"></div>' +
      '<div class="field" style="margin-top:10px"><label for="calcB">Аргумент b (&gt; 0)</label><input id="calcB" type="text" inputmode="decimal" value="8" placeholder="напр. 8 или 0,5"></div>' +
      '<div class="row" style="margin-top:14px">' +
      '<button id="calcGo" class="btn btn--accent" type="button">Вычислить</button>' +
      '<span class="muted" style="font-size:13px">дробные можно писать как 1/2 или 0,5</span></div>';
    var out = U.el('div', 'card');
    out.innerHTML =
      '<div class="center" id="calcOut" aria-live="polite"><p class="muted" style="margin:0">Введите основание и аргумент.</p></div>';
    grid.appendChild(form);
    grid.appendChild(out);
    box.appendChild(grid);

    function go() {
      var o = out.querySelector('#calcOut');
      var a = U.parseNum(form.querySelector('#calcA').value);
      var b = U.parseNum(form.querySelector('#calcB').value);
      if (isNaN(a) || isNaN(b)) {
        o.innerHTML = '<p class="badres" style="margin:0">Введите числа. Дробные значения можно записывать как 1/2 или 0,5.</p>' +
          '<p class="muted" style="font-size:13px;margin:6px 0 0">Например: основание 2, аргумент 8.</p>';
        return;
      }
      if (a <= 0) {
        o.innerHTML = '<p class="badres" style="margin:0">log по основанию ' + a + ' не существует: a ≤ 0.</p>' +
          '<p class="muted" style="font-size:14px;margin:6px 0 0">Отрицательное основание не задаёт корректную степенную функцию на всех действительных показателях (эпизод 05): например, (−2)^(1/2) не определено.</p>';
        return;
      }
      if (a === 1) {
        o.innerHTML = '<p class="badres" style="margin:0">Основание не должно равняться 1.</p>' +
          '<p class="muted" style="font-size:14px;margin:6px 0 0">1 в любой степени — это 1: получить ' + b + ' нельзя, а для аргумента 1 подошла бы любая степень — однозначного ответа нет.</p>';
        return;
      }
      if (b <= 0) {
        o.innerHTML = '<p class="badres" style="margin:0">Аргумент должен быть положительным: b ≤ 0.</p>' +
          '<p class="muted" style="font-size:14px;margin:6px 0 0">Ни 0, ни отрицательное число нельзя получить действительной степенью положительного основания (эпизод 05).</p>';
        return;
      }
      var x = Math.log(b) / Math.log(a);
      var back = Math.pow(a, x);
      var ok = Math.abs(back - b) <= Math.max(1e-9, Math.abs(b) * 1e-9);
      var xs = U.fmtDec(x, x === Math.round(x) ? 0 : 4);
      o.innerHTML =
        '<div class="fm fm--mid" style="margin-bottom:6px">' + F.log(a, b) + ' = ' + F.res(xs) + '</div>' +
        '<p style="margin:6px 0;font-size:15px">Это степень, в которую нужно возвести ' + a + ', чтобы получить ' + b + '.</p>' +
        '<p class="calc-verify" style="margin:6px 0 0">Проверка обратной операцией: ' + a + '<sup>' + xs + '</sup> ≈ ' + U.fmtDec(back, 6) +
        (ok ? ' <span class="goodres">✓ совпадает с ' + b + '</span>' : ' <span class="badres">⚠ погрешность вычислений</span>') + '</p>' +
        '<p class="muted" style="font-size:13px;margin:6px 0 0">Примеры: ' + F.log(2, 8) + '=3 · ' + F.log(5, 1) + '=0 · lg(1000)=3</p>';
    }
    form.querySelector('#calcGo').addEventListener('click', go);
    box.appendChild(U.el('p', 'muted', ''));
    out.querySelector('#calcOut').innerHTML = '<p class="muted" style="margin:0">Нажмите «Вычислить».</p>';
    api.done();
  }

  /* ---------- Графики ---------- */
  function buildGraphs(box, api) {
    var card = U.el('div', 'card graph-wrap');
    card.innerHTML =
      '<div class="row" style="margin-bottom:10px">' +
      '<span class="muted">Основание:</span>' +
      '<div class="seg" id="baseSeg" role="group" aria-label="Выбор основания"></div>' +
      '<span class="muted" style="margin-left:12px">Точка x: <b id="gx" style="font-family:var(--font-mono);color:var(--lime)">2</b></span>' +
      '<input id="gxR" type="range" min="0.25" max="3" step="0.05" value="2" style="flex:1;min-width:140px" aria-label="Значение x для точек на графиках">' +
      '</div>' +
      '<div id="graphSvg"></div>' +
      '<div class="legend" style="margin-top:10px">' +
      '<span><i style="background:#6C8CFF"></i>y = a<sup>x</sup></span>' +
      '<span><i style="background:#AA78FF"></i>y = log<sub>a</sub>(x)</span>' +
      '<span><i style="background:rgba(243,243,237,.5)"></i>y = x (зеркало)</span>' +
      '<span><i style="background:#C8FF56"></i>связанные точки: (x, aˣ) ↔ (aˣ, x)</span>' +
      '</div>';
    box.appendChild(card);
    var bases = [0.5, 1.5, 2, 3, 10];
    var base = 2;
    var seg = card.querySelector('#baseSeg');
    bases.forEach(function (bv) {
      var b = U.el('button', null, String(bv));
      b.type = 'button';
      b.setAttribute('aria-pressed', String(bv === base));
      b.addEventListener('click', function () {
        seg.querySelectorAll('button').forEach(function (o) { o.setAttribute('aria-pressed', 'false'); });
        b.setAttribute('aria-pressed', 'true');
        base = bv;
        draw();
      });
      seg.appendChild(b);
    });
    var rng = card.querySelector('#gxR');
    var svgBox = card.querySelector('#graphSvg');

    function draw() {
      var W = 560, H = 460, pad = 40;
      var XMAX = 6, YMAX = 6;
      var X = function (v) { return pad + v / XMAX * (W - 2 * pad); };
      var Y = function (v) { return H - pad - v / YMAX * (H - 2 * pad); };
      svgBox.innerHTML = '';
      var svg = document.createElementNS(NS, 'svg');
      svg.setAttribute('viewBox', '0 0 ' + W + ' ' + H);
      svg.setAttribute('role', 'img');
      svg.setAttribute('aria-label', 'Графики экспоненты и логарифма, симметричные относительно прямой y=x');
      svgBox.appendChild(svg);
      /* сетка */
      for (var g = 0; g <= XMAX; g++) {
        svgAdd(svg, 'line', { x1: X(g), y1: Y(0), x2: X(g), y2: Y(YMAX), stroke: 'rgba(139,143,158,.14)' });
        svgAdd(svg, 'line', { x1: X(0), y1: Y(g), x2: X(XMAX), y2: Y(g), stroke: 'rgba(139,143,158,.14)' });
        if (g > 0) {
          svgAdd(svg, 'text', { x: X(g), y: Y(0) + 16, 'font-size': 10, fill: '#898F9E', 'text-anchor': 'middle', 'font-family': 'monospace' }, String(g));
          svgAdd(svg, 'text', { x: X(0) - 8, y: Y(g) + 3, 'font-size': 10, fill: '#898F9E', 'text-anchor': 'end', 'font-family': 'monospace' }, String(g));
        }
      }
      svgAdd(svg, 'line', { x1: X(0), y1: Y(0), x2: X(XMAX), y2: Y(0), stroke: 'rgba(139,143,158,.6)', 'stroke-width': 1.5 });
      svgAdd(svg, 'line', { x1: X(0), y1: Y(0), x2: X(0), y2: Y(YMAX), stroke: 'rgba(139,143,158,.6)', 'stroke-width': 1.5 });
      /* y = x */
      svgAdd(svg, 'line', { x1: X(0), y1: Y(0), x2: X(XMAX), y2: Y(XMAX), stroke: 'rgba(243,243,237,.4)', 'stroke-dasharray': '5 5' });
      /* экспонента y = a^x: x от XMIN до ln(YMAX)/ln(a) */
      var lx = Math.log(YMAX) / Math.log(base);
      var x0 = Math.max(-YMAX, Math.min(0, -Math.log(YMAX) / Math.abs(Math.log(base))));
      var d1 = '';
      for (var t = x0; t <= lx; t += (lx - x0) / 140) {
        var yv = Math.pow(base, t);
        d1 += (d1 ? 'L' : 'M') + X(t).toFixed(1) + ' ' + Y(yv).toFixed(1) + ' ';
      }
      svgAdd(svg, 'path', { d: d1, fill: 'none', stroke: '#6C8CFF', 'stroke-width': 2.5 });
      /* логарифм y = log_a(x): x от a^(-YMAX)... подходящие границы */
      var lstart = Math.pow(base, -YMAX);
      var lend = Math.pow(base, YMAX);
      if (base > 1) { lstart = Math.max(lstart, 1e-3); lend = Math.min(lend, XMAX); }
      else { lstart = Math.min(Math.max(lstart, 1e-3), XMAX); lend = Math.min(lend, XMAX); }
      var d2 = '';
      for (var xx = lstart; xx <= lend; xx *= (lend / lstart) / 140 + 1) {
        var yl = Math.log(xx) / Math.log(base);
        if (yl < -YMAX || yl > YMAX) continue;
        d2 += (d2 ? 'L' : 'M') + X(xx).toFixed(1) + ' ' + Y(yl).toFixed(1) + ' ';
        if (d2.length > 20000) break;
      }
      svgAdd(svg, 'path', { d: d2, fill: 'none', stroke: '#AA78FF', 'stroke-width': 2.5 });
      /* точки */
      var gx = parseFloat(rng.value);
      card.querySelector('#gx').textContent = U.fmtDec(gx, 2).replace(/,?0+$/, '');
      var p1x = gx, p1y = Math.pow(base, gx);
      if (p1y <= YMAX) {
        svgAdd(svg, 'circle', { cx: X(p1x), cy: Y(p1y), r: 6, fill: '#6C8CFF' });
        svgAdd(svg, 'text', { x: X(p1x) + 8, y: Y(p1y) - 8, 'font-size': 11, fill: '#6C8CFF', 'font-family': 'monospace' }, '(' + U.fmtDec(gx, 1).replace(',0', '') + '; ' + U.fmtDec(p1y, 2).replace(/,?0+$/, '') + ')');
      }
      var p2x = p1y, p2y = gx; // зеркальная точка (aˣ, x) на логарифме
      if (p2x <= XMAX) {
        svgAdd(svg, 'circle', { cx: X(p2x), cy: Y(p2y), r: 6, fill: '#AA78FF' });
        svgAdd(svg, 'text', { x: X(p2x) + 8, y: Y(p2y) + 16, 'font-size': 11, fill: '#AA78FF', 'font-family': 'monospace' }, '(' + U.fmtDec(p2x, 2).replace(/,?0+$/, '') + '; ' + U.fmtDec(gx, 1).replace(',0', '') + ')');
        /* соединительные линии через y=x */
        svgAdd(svg, 'line', { x1: X(p1x), y1: Y(p1y), x2: X(p2x), y2: Y(p2y), stroke: 'rgba(200,255,86,.7)', 'stroke-width': 1.2, 'stroke-dasharray': '3 3' });
        if (p1y <= XMAX && p1y <= YMAX) {
          svgAdd(svg, 'circle', { cx: X(p1y), cy: Y(p1y), r: 3, fill: '#C8FF56' });
        }
      }
    }
    rng.addEventListener('input', draw);
    draw();
    api.done();
  }

  /* ---------- Логарифмическая шкала ---------- */
  function buildScale(box, api) {
    var card = U.el('div', 'card scale-wrap');
    card.innerHTML =
      '<div class="field"><label for="mixR">Шкала: <b style="color:var(--blue)">линейная</b> ⟶ <b style="color:var(--lime)">логарифмическая</b></label>' +
      '<input id="mixR" type="range" min="0" max="1" step="0.02" value="0"></div>' +
      '<div id="scaleSvg"></div>' +
      '<p class="muted" style="font-size:14px;margin:10px 0 0">На линейной шкале 100 000 прижата к правому краю, а 547 почти сливается с нулём. Логарифмическая шкала превращает <b>отношения</b> в равные расстояния: 1→10 такое же, как 10 000→100 000. Поэтому она удобна для огромных диапазонов — от 0,0001 до 100 000 она умещает всё с одинаковым вниманием к порядкам.</p>';
    box.appendChild(card);
    var svgBox = card.querySelector('#scaleSvg');
    var rng = card.querySelector('#mixR');
    var ticks = [1, 10, 100, 1000, 10000, 100000];
    var pts = [{ v: 547, lbl: '547' }, { v: 65536, lbl: '2¹⁶ = 65 536' }];

    function draw() {
      var m = parseFloat(rng.value);
      var W = 640, H = 150, padL = 30, padR = 30, y1 = 58, y2 = 106;
      var lin = function (v) { return padL + v / 100000 * (W - padL - padR); };
      var log = function (v) { return padL + Math.log10(v) / 5 * (W - padL - padR); };
      var P = function (v) { return U.lerp(lin(v), log(v), m); };
      svgBox.innerHTML = '';
      var svg = document.createElementNS(NS, 'svg');
      svg.setAttribute('viewBox', '0 0 ' + W + ' ' + H);
      svg.setAttribute('role', 'img');
      svg.setAttribute('aria-label', 'Плавное преобразование линейной шкалы в логарифмическую');
      svgBox.appendChild(svg);
      svgAdd(svg, 'line', { x1: padL, y1: y1, x2: W - padR, y2: y1, stroke: 'rgba(139,143,158,.5)' });
      ticks.forEach(function (v) {
        var x = P(v);
        svgAdd(svg, 'line', { x1: x, y1: y1 - 10, x2: x, y2: y1 + 10, stroke: v === 1 || v === 100000 ? '#F3F3ED' : '#6C8CFF', 'stroke-width': v === 1 || v === 100000 ? 2.5 : 1.5 });
        svgAdd(svg, 'text', { x: x, y: y1 - 16, 'font-size': 11, fill: '#898F9E', 'text-anchor': 'middle', 'font-family': 'monospace' }, U.fmtInt(v));
      });
      pts.forEach(function (p) {
        var x = P(p.v);
        svgAdd(svg, 'circle', { cx: x, cy: y2, r: 7, fill: '#FF945E' });
        svgAdd(svg, 'text', { x: Math.min(Math.max(x, 60), W - 90), y: y2 + 24, 'font-size': 12, fill: '#FF945E', 'text-anchor': 'middle', 'font-family': 'monospace' }, p.lbl);
        svgAdd(svg, 'line', { x1: x, y1: y2 - 7, x2: x, y2: y1 + 10, stroke: 'rgba(255,148,94,.4)', 'stroke-dasharray': '3 3' });
      });
      svgAdd(svg, 'text', { x: padL, y: y2 + 6, 'font-size': 11, fill: '#898F9E', 'font-family': 'monospace' }, m < 0.5 ? 'линейная: равные шаги = равные разности' : 'логарифмическая: равные шаги = равные отношения');
    }
    rng.addEventListener('input', draw);
    draw();
    api.done();
  }

  /* ---------- Мини-контроль ---------- */
  var LAB_QUIZ = [
    { q: 'log₂(16) = ?', opts: ['4', '16', '2', '8'], correct: 0,
      whys: {
        0: 'Верно: 2⁴ = 16.',
        1: 'Вы перепутали аргумент и результат: вопрос не «чему равно 2ⁿ», а «в какую степень возвести 2, чтобы получить 16».',
        2: '2 — это log₄(16). Основание здесь 2.',
        3: '8 = 2³, это log₂(8). Для 16 ответ 4.'
      } },
    { q: 'lg(10 000) = ?', opts: ['3', '4', '5', '100'], correct: 1,
      whys: {
        0: 'lg(1000) = 3. У 10 000 уже четыре нуля.',
        1: 'Верно: 10⁴ = 10 000, значит lg = 4.',
        2: '10⁵ = 100 000 — на один порядок больше.',
        3: '100 — это само число нулей? Нет: lg отвечает на «в какую степень возвести 10», это 4.'
      } },
    { q: 'Сколько цифр в числе 2³⁰?', opts: ['9', '10', '30', '31'], correct: 1,
      whys: {
        0: '9 цифр у 2²⁹ ≈ 536 млн? Проверьте: 2³⁰ = 1 073 741 824 — это 10 цифр.',
        1: 'Верно: 2³⁰ = 1 073 741 824 → ⌊30·0,30103⌋+1 = ⌊9,03⌋+1 = 10 цифр.',
        2: '30 — это показатель степени, а не количество цифр.',
        3: '31 цифра была у 2¹⁰⁰, а у 2³⁰ — 10.'
      } },
    { q: 'Существует ли log₅(0)?', opts: ['да, он равен 0', 'да, он равен 1', 'нет', 'иногда'], correct: 2,
      whys: {
        0: '5⁰ = 1, а не 0. Ноль степенью не получается.',
        1: '5¹ = 5. Ноль недостижим.',
        2: 'Верно: b > 0 — ноль нельзя получить действительной степенью положительного основания.',
        3: 'Никогда: степени 5 всегда строго положительны.'
      } },
    { q: 'Вклад 12% годовых, начисление раз в год. Через сколько лет сумма впервые превысит вдвое?', opts: ['6', '6,12', '7', '12'], correct: 2,
      whys: {
        0: 'После 6 лет 1,12⁶ ≈ 1,974 < 2 — ещё чуть-чуть.',
        1: '6,12 — это точное значение log₁,₁₂(2). Но начисление раз в год: внутри шестого года деньги не удвоились.',
        2: 'Верно: log₁,₁₂(2) ≈ 6,12, но целые годы: после 7 лет 1,12⁷ ≈ 2,21 > 2.',
        3: '12 — это ставка, а не срок.'
      } }
  ];

  function buildLabQuiz(box, api) {
    var wrap = U.el('div', 'quiz');
    var scoreEl = U.el('p', 'muted center');
    box.appendChild(wrap);
    box.appendChild(scoreEl);
    var answered = 0, correct = 0, total = LAB_QUIZ.length;
    LAB_QUIZ.forEach(function (qz, qi) {
      var q = U.el('div', 'q');
      q.innerHTML = '<h3>' + (qi + 1) + '. ' + qz.q + '</h3><div class="opts"></div><p class="why" aria-live="polite"></p>';
      var opts = q.querySelector('.opts');
      var why = q.querySelector('.why');
      qz.opts.forEach(function (o, oi) {
        var b = U.el('button', null, o);
        b.type = 'button';
        b.addEventListener('click', function () {
          if (q.dataset.done) return;
          q.dataset.done = '1';
          answered++;
          var isOk = oi === qz.correct;
          if (isOk) { b.classList.add('ok'); correct++; }
          else {
            b.classList.add('err');
            opts.children[qz.correct].classList.add('ok');
          }
          why.innerHTML = qz.whys[oi];
          why.classList.add('show');
          scoreEl.innerHTML = 'Пройдено ' + answered + '/' + total + ' · верно ' + correct;
          if (answered >= total) {
            api.done();
            api.speak('Мини-контроль завершён: ' + correct + ' из ' + total + '. Возвращайтесь к эпизодам, если что-то осталось непонятным.');
          }
        });
        opts.appendChild(b);
      });
      wrap.appendChild(q);
    });
    scoreEl.textContent = 'Пройдено 0/' + total;
    api.lock('Ответьте на все вопросы мини-контроля');
  }

  LOG.register({
    id: 'lab',
    label: 'ТРЕНАЖЁР',
    bonus: true,
    title: 'Интерактивный тренажёр',
    steps: [
      {
        text: 'Тренажёр: калькулятор логарифмов с проверкой и объяснением ошибок, графики экспоненты и логарифма с зеркальной симметрией, превращение линейной шкалы в логарифмическую и мини-контроль из пяти задач. Экспериментируйте свободно.',
        nextLabel: 'Калькулятор →',
        build: function (box, api) {
          var wrap = U.el('div', 'row row--center');
          wrap.innerHTML =
            '<span class="chip chip--blue">🧮 калькулятор</span>' +
            '<span class="chip chip--violet">📊 графики</span>' +
            '<span class="chip">📏 шкала</span>' +
            '<span class="chip chip--lime">✅ контроль</span>';
          box.appendChild(wrap);
          api.done();
        }
      },
      {
        text: 'Калькулятор: введите основание и аргумент — сайт покажет результат, объяснит смысл и проверит его обратной операцией. Недопустимые значения не пройдут: сайт объяснит, почему именно не существует такой логарифм.',
        nextLabel: 'Графики →',
        build: buildCalc
      },
      {
        text: 'Графики: экспонента y = aˣ и логарифм y = logₐ(x) зеркальны относительно прямой y = x. Двигайте точку x и смотрите на пару: если на экспоненте точка (x, aˣ), то на логарифме ей отвечает (aˣ, x) — координаты меняются местами. Переключайте основание.',
        nextLabel: 'Шкала →',
        build: buildGraphs
      },
      {
        text: 'Шкала: двигайте ползунок — линейная шкала плавно превращается в логарифмическую. Равные отношения величин становятся равными расстояниями, и огромные диапазоны умещаются целиком.',
        nextLabel: 'Мини-контроль →',
        build: buildScale
      },
      {
        text: 'Мини-контроль: пять задач разного уровня. За каждым неверным ответом — объяснение, какую мысль вы перепутали и как рассуждать правильно.',
        nextLabel: 'В начало путешествия →',
        build: buildLabQuiz
      }
    ]
  });
})();
