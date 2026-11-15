'use strict';
/* ============================================================
   ЛОГАРИФМ · АП-2 — визуализации на canvas.
   Референс Uncommon Web: живые графики, интерактивные пробы,
   плавные анимации данных. Все графики читаемы: крупные подписи,
   контрастные цвета палитры «РУБИН», поддержка тача и
   reduced motion (мгновенный финальный кадр).
   ============================================================ */
window.TERM = window.TERM || {};

TERM.viz = (function () {
  var REDUCED = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var nb = function (n) { return String(n).replace(/\B(?=(\d{3})+(?!\d))/g, '\u00A0'); };
  var COLORS = null;
  function C() {
    if (COLORS) return COLORS;
    var cs = getComputedStyle(document.documentElement);
    function v(name, fallback) { return (cs.getPropertyValue(name) || fallback).trim(); }
    COLORS = {
      ink: v('--ink', '#e8e4db'), dim: v('--dim', '#9a958b'), faint: v('--faint', '#676460'),
      ruby: v('--ruby', '#e2483a'), rubySoft: v('--ruby-soft', '#b23a30'),
      amber: v('--amber', '#e0a24e'), steel: v('--steel', '#8a97a3'),
      ok: v('--ok', '#93b57e'),
      grid: 'rgba(232,228,219,.08)', gridStrong: 'rgba(232,228,219,.18)'
    };
    return COLORS;
  }
  var FONT = function (size, weight) { return (weight || 400) + ' ' + size + 'px "JetBrains Mono", monospace'; };

  function el(tag, cls, parent, html) {
    var e = document.createElement(tag);
    if (cls) e.className = cls;
    if (html != null) e.innerHTML = html;
    if (parent) parent.appendChild(e);
    return e;
  }

  /* ---------- Каркас: карточка + canvas + подписи ---------- */
  function canvas(box, opts) {
    opts = opts || {};
    if (opts.cap) el('div', 'viz-cap', box, opts.cap);
    var canvas = el('canvas', '', box);
    canvas.style.height = (opts.h || 220) + 'px';
    var st = {
      canvas: canvas, box: box,
      ctx: canvas.getContext('2d'),
      w: 0, h: opts.h || 220, dpr: 1,
      redraw: null,   // функция полной перерисовки (замыкание на состоянии)
      cb: null
    };
    st.measure = function () {
      var dpr = Math.min(window.devicePixelRatio || 1, 2);
      var w = box.clientWidth - 32;
      if (w < 50) w = 320;
      st.w = w; st.h = canvas.clientHeight || opts.h || 220; st.dpr = dpr;
      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(st.h * dpr);
      st.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    st.render = function () {
      if (st.redraw) { st.measure(); st.redraw(); }
    };
    st.stop = function () {
      if (st._ro) st._ro.disconnect();
      if (st._io) st._io.disconnect();
    };
    st._ro = new ResizeObserver(function () { st.render(); });
    st._ro.observe(box);
    st.measure();
    return st;
  }

  function skipped() {
    return !!(TERM.api && TERM.api.isSkip && TERM.api.isSkip());
  }

  /* Плавная анимация: cb(t 0..1 с ease). reduced/skip — сразу 1. */
  function anim(dur, cb) {
    return new Promise(function (res) {
      if (REDUCED || skipped()) { cb(1); res(); return; }
      var t0 = performance.now();
      (function fr(now) {
        var t = Math.min(1, (now - t0) / dur);
        var e = t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
        cb(e);
        if (t < 1) requestAnimationFrame(fr); else res();
      })(t0);
    });
  }
  function after(ms) {
    return new Promise(function (r) {
      if (REDUCED || skipped()) { r(); return; }
      setTimeout(r, ms);
    });
  }
  function easeOut(t) { return 1 - Math.pow(1 - t, 3); }

  /* Прозрачный фон карточки */
  function clear(st) {
    st.ctx.clearRect(0, 0, st.w, st.h);
  }
  function line(st, x1, y1, x2, y2, color, width, dash) {
    var c = st.ctx;
    c.strokeStyle = color; c.lineWidth = width || 1;
    c.setLineDash(dash || []);
    c.beginPath(); c.moveTo(x1, y1); c.lineTo(x2, y2); c.stroke();
    c.setLineDash([]);
  }
  function text(st, s, x, y, color, size, weight, align, baseline) {
    var c = st.ctx;
    c.fillStyle = color; c.font = FONT(size, weight);
    c.textAlign = align || 'left'; c.textBaseline = baseline || 'alphabetic';
    c.fillText(s, x, y);
  }

  /* ============================================================
     1. ПОЛЕ ВАРИАНТОВ: 5000 точек × 20 чисел; половины гаснут
     ============================================================ */
  function halfField(box, api, done) {
    var Cc = C();
    var st = canvas(box, { h: 240, cap: 'ПОЛЕ ВАРИАНТОВ · КАЖДАЯ ТОЧКА ≈ 20 ЧИСЕЛ · ВСЕГО 100\u00A0000' });
    var COLS = 100, ROWS = 50, TOTAL = COLS * ROWS;
    var alive = new Uint8Array(TOTAL).fill(1);
    var fade = new Float32Array(TOTAL);          // множитель прозрачности
    var foot = el('div', 'viz-foot', box);
    function setFoot(rem) {
      foot.innerHTML = rem > 1
        ? 'Осталось <span class="amb">' + nb(rem * 20) + '</span> вариантов — половина погибла от одного слова.'
        : 'Остался <span class="ok">1</span> вариант из 100\u00A0000 — наше число.';
    }
    setFoot(5000);
    var deadSum = 0;
    st.redraw = function () {
      clear(st);
      var pad = 6, cw = (st.w - pad * 2) / COLS, ch = (st.h - pad * 2 - 0) / ROWS;
      for (var r = 0; r < ROWS; r++) {
        for (var c2 = 0; c2 < COLS; c2++) {
          var i = r * COLS + c2;
          var a = alive[i] ? 1 : fade[i];
          if (a <= 0.02) continue;
          st.ctx.fillStyle = 'rgba(232,228,219,' + (0.62 * a).toFixed(3) + ')';
          st.ctx.fillRect(pad + c2 * cw, pad + r * ch, Math.max(1, cw - 1.2), Math.max(1, ch - 1.2));
        }
      }
    };
    function renderFinal() { st.redraw(); }
    var killed = false;
    async function run() {
      for (var s = 1; s <= 5; s++) {
        await after(900);
        /* гасим случайную половину живых */
        var idxs = [];
        for (var i = 0; i < TOTAL; i++) if (alive[i]) idxs.push(i);
        for (var j = idxs.length - 1; j > 0; j--) {
          var k = Math.floor(Math.random() * (j + 1));
          var tmp = idxs[j]; idxs[j] = idxs[k]; idxs[k] = tmp;
        }
        for (var m = 0; m < idxs.length / 2; m++) alive[idxs[m]] = 0;
        deadSum = 0;
        for (var q = 0; q < TOTAL; q++) if (!alive[q]) deadSum++;
        /* волна растворения слева направо */
        await anim(600, function (t) {
          for (var i2 = 0; i2 < TOTAL; i2++) {
            if (alive[i2]) { fade[i2] = 0; continue; }
            var col = i2 % COLS;
            var local = Math.max(0, Math.min(1, t * 1.6 - col / COLS));
            fade[i2] = 1 - local;
          }
          st.redraw();
        });
        setFoot(TOTAL - deadSum);
      }
      renderFinal();
      done();
    }
    if (REDUCED) { renderFinal(); setTimeout(done, 30); return; }
    run();
  }

  /* ============================================================
     2. КАСКАД: 100 000 → 1, бар за баром
     ============================================================ */
  function cascade(box, api, done) {
    var Cc = C();
    var rows = [[0, 100000], [1, 50000], [2, 25000], [3, 12500], [4, 6250], [5, 3125], [7, 782], [9, 196], [11, 49], [13, 13], [15, 4], [17, 1]];
    var ROWH = 24;
    var st = canvas(box, { h: rows.length * ROWH + 22, cap: 'ПОСЛЕ КАЖДОГО ОТВЕТА ЖИВЫХ ВАРИАНТОВ ВДВОЕ МЕНЬШЕ' });
    var shown = 0;                    // сколько строк уже нарисовано
    var grow = rows.map(function () { return 0; });
    st.redraw = function () {
      clear(st);
      var W = st.w - 250;
      for (var i = 0; i < rows.length; i++) {
        if (i >= shown) break;
        var k = rows[i][0], v = rows[i][1];
        var y = 12 + i * ROWH;
        var last = i === rows.length - 1;
        var lbl = k === 0 ? 'старт' : 'после ' + k + ' ' + TERM.plural(k, ['вопроса', 'вопросов', 'вопросов']);
        text(st, lbl, 0, y + 15, Cc.dim, 12, 400);
        var w = Math.max(2, W * (v / 100000) * grow[i]);
        st.ctx.fillStyle = last ? Cc.ruby : 'rgba(232,228,219,.5)';
        st.ctx.fillRect(210, y + 3, w, ROWH - 14);
        text(st, nb(v), 210 + w + 10, y + 15, last ? Cc.ruby : Cc.ink, 13, 700);
      }
    };
    async function run() {
      for (var i = 0; i < rows.length; i++) {
        shown = i + 1;
        var ii = i;
        await anim(REDUCED ? 1 : 420, function (t) { grow[ii] = easeOut(t); st.redraw(); });
        grow[i] = 1;
        await after(90);
      }
      st.redraw(); done();
    }
    run();
  }

  /* ============================================================
     3. ЛЕСТНИЦА СТЕПЕНЕЙ: 2^i по лог-шкале, рубеж 100 000
     ============================================================ */
  function ladder(box, api, done) {
    var Cc = C();
    var N = 18;
    var st = canvas(box, { h: 300, cap: 'СТЕПЕНИ ДВОЙКИ · ВЫСОТА — ЛОГАРИФМ, ПОЭТОМУ КАЖДАЯ СТУПЕНЬКА РАВНАЯ' });
    var climb = 0;     // сколько ступеней проявлено
    st.redraw = function () {
      clear(st);
      var padL = 56, padB = 26, padT = 26;
      var W = st.w - padL - 16, H = st.h - padB - padT;
      var yOf = function (lg) { return padT + H * (1 - lg / 5.117); };
      /* рубеж 100 000 */
      var y100 = yOf(5);
      line(st, padL, y100, padL + W, y100, Cc.amber, 1.2, [6, 5]);
      text(st, '100 000', padL + W - 6, y100 - 8, Cc.amber, 11.5, 700, 'right');
      for (var i = 0; i < N; i++) {
        if (i >= climb) break;
        var v = Math.pow(2, i);
        var x = padL + i * (W / N);
        var bw = (W / N) - 7;
        var y = yOf(i * 0.30103);
        var hgt = yOf(0) - y;
        var col = i === 16 ? 'rgba(224,162,78,.4)' : (i === 17 ? Cc.ok : 'rgba(232,228,219,.42)');
        st.ctx.fillStyle = col;
        st.ctx.fillRect(x, y, bw, hgt);
        /* подписи через одну по высоте, чтобы соседние не слипались */
        if (i % 2 === 0 || i === 17) {
          var lx = Math.min(x + bw / 2, st.w - 30);
          text(st, nb(v), lx, padT + H + (i % 2 ? 30 : 16), Cc.dim, 10.5, 400, 'center');
        }
        if (i === 16) text(st, 'мало', x + bw / 2, y - 6, Cc.amber, 11, 700, 'center');
        if (i === 17) text(st, 'хватает', x + bw / 2, y - 6, Cc.ok, 11, 700, 'center');
      }
      line(st, padL, yOf(0), padL + W, yOf(0), Cc.gridStrong, 1);
      text(st, '1', padL - 8, yOf(0) + 4, Cc.faint, 11.5, 400, 'right');
    };
    async function run() {
      for (var i = 0; i <= N; i++) {
        climb = i + 1;
        await anim(REDUCED ? 1 : 190, function (t) { st.redraw(); });
        await after(60);
      }
      st.redraw(); done();
    }
    run();
  }

  /* ============================================================
     4. ЛИНЕЙКА 65536…131072: где лежит 100 000 (с пробой курсором)
     ============================================================ */
  function strip(box, api, done) {
    var Cc = C();
    var st = canvas(box, { h: 130, cap: 'ОДИН ШАГ ЛЕСТНИЦЫ: ОТ 2¹⁶ ДО 2¹⁷' });
    var LO = 65536, HI = 131072, MID = 100000;
    var t = 0;        // положение иглы 0..1 (анимация)
    var hover = -1;   // значение под курсором
    st.redraw = function () {
      clear(st);
      var padX = 14, y = 44, W = st.w - padX * 2;
      var xOf = function (v) { return padX + (v - LO) / (HI - LO) * W; };
      /* базовая полоса */
      st.ctx.fillStyle = 'rgba(232,228,219,.1)';
      st.ctx.fillRect(padX, y, W, 8);
      /* засечки степеней двойки */
      for (var e = 16; e <= 17; e += 0.25) {
        var v = Math.pow(2, e);
        var x = xOf(v);
        var major = Math.abs(e - Math.round(e)) < 1e-6;
        line(st, x, y - (major ? 8 : 4), x, y + 8 + (major ? 8 : 4), major ? Cc.gridStrong : Cc.grid, 1);
        if (major) text(st, nb(v), x, y + 30, Cc.dim, 11.5, 700, 'center');
      }
      /* игла на 100 000 */
      var xm = padX + W * t;
      line(st, xm, y - 14, xm, y + 22, Cc.ruby, 2);
      st.ctx.fillStyle = Cc.ruby;
      st.ctx.beginPath();
      st.ctx.moveTo(xm - 6, y - 14); st.ctx.lineTo(xm + 6, y - 14); st.ctx.lineTo(xm, y - 5);
      st.ctx.closePath(); st.ctx.fill();
      text(st, '100\u00A0000', xm, y - 20, Cc.ruby, 12, 700, t > 0.9 ? 'right' : 'center');
      /* проба курсором */
      if (hover >= 0) {
        var xh = xOf(hover);
        text(st, nb(Math.round(hover)), xh, 18, Cc.steel, 12, 400, 'center');
        line(st, xh, 24, xh, y + 8, Cc.grid, 1);
      }
      /* подпись-шаг */
      text(st, '2¹⁶ = 65\u00A0536 — шестнадцати не хватает', padX, st.h - 8, Cc.faint, 11.5, 400);
      text(st, '2¹⁷ = 131\u00A0072 — семнадцати хватает', st.w - padX, st.h - 8, Cc.faint, 11.5, 400, 'right');
    };
    st.canvas.addEventListener('mousemove', function (e) {
      var r = st.canvas.getBoundingClientRect();
      var x = e.clientX - r.left;
      hover = Math.max(LO, Math.min(HI, LO + (x - 14) / (st.w - 28) * (HI - LO)));
      st.redraw();
    });
    st.canvas.addEventListener('mouseleave', function () { hover = -1; st.redraw(); });
    anim(REDUCED ? 1 : 1300, function (e) { t = e; st.redraw(); }).then(function () {
      st.redraw(); done();
    });
  }

  /* ============================================================
     5. ГРАФИК 2ˣ И log₂x с пробой курсором
     ============================================================ */
  function graph(box, api, done) {
    var Cc = C();
    var st = canvas(box, { h: 380, cap: 'ЗЕРКАЛО: ЭКСПОНЕНТА И ЛОГАРИФМ' });
    var XMIN = -3, XMAX = 6, YMIN = -3, YMAX = 6;
    var t = 0, probe = null;
    function px(x) { return (x - XMIN) / (XMAX - XMIN) * st.w; }
    function py(y) { return st.h - (y - YMIN) / (YMAX - YMIN) * st.h; }
    st.redraw = function () {
      clear(st);
      /* сетка */
      for (var gx = XMIN; gx <= XMAX; gx++) line(st, px(gx), 0, px(gx), st.h, Cc.grid, 1);
      for (var gy = YMIN; gy <= YMAX; gy++) line(st, 0, py(gy), st.w, py(gy), Cc.grid, 1);
      /* оси */
      line(st, 0, py(0), st.w, py(0), Cc.gridStrong, 1.4);
      line(st, px(0), 0, px(0), st.h, Cc.gridStrong, 1.4);
      /* y = x пунктиром */
      line(st, px(Math.max(XMIN, YMIN)), py(Math.max(XMIN, YMIN)), px(Math.min(XMAX, YMAX)), py(Math.min(XMAX, YMAX)), 'rgba(232,228,219,.22)', 1, [4, 5]);
      text(st, 'y = x', px(4.6), py(4.2) - 6, Cc.faint, 12, 400);
      /* кривые с анимацией прорисовки */
      drawCurve(function (x) { return Math.pow(2, x); }, XMIN, Math.log(YMAX) / Math.LN2, Cc.ruby, 2.2);
      drawCurve(function (x) { return Math.log(x) / Math.LN2; }, Math.pow(2, YMIN), XMAX, Cc.amber, 2.2);
      /* связанные точки */
      mark(2, 4, Cc.ruby); mark(4, 2, Cc.amber);
      text(st, '(2; 4)', px(2) + 10, py(4) - 8, Cc.ruby, 12, 700);
      text(st, '(4; 2)', px(4) + 10, py(2) - 8, Cc.amber, 12, 700);
      /* проба */
      if (probe) {
        line(st, probe.x, 0, probe.x, st.h, Cc.gridStrong, 1);
        var y1v = Math.pow(2, probe.xv), y2v = Math.log(probe.xv) / Math.LN2;
        if (y1v >= YMIN && y1v <= YMAX) dot(probe.x, py(y1v), Cc.ruby);
        if (probe.xv > 0 && y2v >= YMIN && y2v <= YMAX) dot(probe.x, py(y2v), Cc.amber);
        var s = 'x = ' + probe.xv.toFixed(2) + '   2ˣ = ' + (y1v >= 1000 ? nb(Math.round(y1v)) : y1v.toFixed(2));
        if (probe.xv > 0) s += '   log₂x = ' + y2v.toFixed(2);
        var wtxt = st.ctx.measureText(s).width;
        var bx = Math.min(Math.max(probe.x - wtxt / 2 - 10, 4), st.w - wtxt - 24);
        st.ctx.fillStyle = 'rgba(10,10,12,.92)';
        st.ctx.fillRect(bx, 6, wtxt + 20, 28);
        st.ctx.strokeStyle = Cc.gridStrong; st.ctx.strokeRect(bx + 0.5, 6.5, wtxt + 19, 27);
        text(st, s, bx + 10, 24, Cc.ink, 12.5, 500);
      }
      function drawCurve(f, x0, x1, color, width) {
        st.ctx.strokeStyle = color; st.ctx.lineWidth = width;
        st.ctx.beginPath();
        var stepsN = 240, lim = Math.floor(stepsN * t);
        var started = false;
        for (var i = 0; i <= lim; i++) {
          var x = x0 + (x1 - x0) * (i / stepsN);
          var y = f(x);
          if (y < YMIN - 0.5 || y > YMAX + 0.5) { started = false; continue; }
          var X = px(x), Y = py(y);
          if (!started) { st.ctx.moveTo(X, Y); started = true; }
          else st.ctx.lineTo(X, Y);
        }
        st.ctx.stroke();
      }
      function dot(X, Y, color) {
        st.ctx.fillStyle = color;
        st.ctx.beginPath(); st.ctx.arc(X, Y, 4.5, 0, 7); st.ctx.fill();
        st.ctx.strokeStyle = '#0a0a0b'; st.ctx.lineWidth = 1.5; st.ctx.stroke();
      }
      function mark(x, y, color) {
        st.ctx.fillStyle = color;
        st.ctx.beginPath(); st.ctx.arc(px(x), py(y), 5, 0, 7); st.ctx.fill();
        st.ctx.strokeStyle = '#0a0a0b'; st.ctx.lineWidth = 2; st.ctx.stroke();
      }
    };
    function onMove(e) {
      var r = st.canvas.getBoundingClientRect();
      var x = e.clientX - r.left;
      var xv = XMIN + x / st.w * (XMAX - XMIN);
      probe = { x: x, xv: xv };
      st.redraw();
    }
    st.canvas.addEventListener('mousemove', onMove);
    st.canvas.addEventListener('touchmove', function (e) { onMove(e.touches[0]); }, { passive: true });
    st.canvas.addEventListener('mouseleave', function () { probe = null; st.redraw(); });
    anim(REDUCED ? 1 : 1500, function (e) { t = e; st.redraw(); }).then(function () { st.redraw(); done(); });
  }

  /* ============================================================
     6. ЛИНЕЙНАЯ ↔ ЛОГАРИФМИЧЕСКАЯ ШКАЛА (морф, ползунок)
     ============================================================ */
  function rulers(box, api, done) {
    var Cc = C();
    var st = canvas(box, { h: 150, cap: 'ПЕРЕКЛЮЧЕНИЕ ШКАЛЫ: ТЯНИ ПОЛЗУНОК' });
    var mix = 0, target = 1, userHold = false;
    var marks = [1, 10, 100, 1000, 10000, 100000];
    var extra = [[547, '●'], [65536, '▲']];
    function pos(v) {
      var lin = v / 100000;
      var lg = Math.log10(v) / 5;
      return lin + (lg - lin) * mix;
    }
    st.redraw = function () {
      clear(st);
      var padX = 14, W = st.w - padX * 2;
      var y = 66;
      line(st, padX, y, padX + W, y, Cc.gridStrong, 2);
      marks.forEach(function (v) {
        var x = padX + pos(v) * W;
        line(st, x, y - 8, x, y + 8, Cc.gridStrong, 1);
        text(st, v >= 1000 ? nb(v) : String(v), x, y + 26, Cc.dim, 11.5, 400, 'center');
      });
      extra.forEach(function (m) {
        var x = padX + pos(m[0]) * W;
        text(st, m[1] + ' ' + nb(m[0]), x, y - 16, Cc.ruby, 12.5, 700, 'center');
        line(st, x, y - 12, x, y + 12, Cc.ruby, 1.4);
      });
      text(st, mix < 0.5 ? 'ЛИНЕЙНАЯ ШКАЛА' : 'ЛОГАРИФМИЧЕСКАЯ ШКАЛА', padX, 22, Cc.steel, 12, 700, 'left');
      text(st, 'шаг ×10 везде одинаков', st.w - padX, 22, Cc.faint, 11.5, 400, 'right');
    };
    var ctl = el('div', 'viz-ctl', box);
    var lbl = el('label', '', ctl, 'линейная');
    var input = el('input', '', ctl);
    input.type = 'range'; input.min = 0; input.max = 1000; input.value = 0;
    el('label', '', ctl, 'логарифмическая');
    input.addEventListener('input', function () {
      userHold = true;
      mix = target = input.value / 1000;
      st.redraw();
    });
    var foot = el('div', 'viz-foot', box,
      'На линейной шкале 547 <span class="dim">●</span> почти сливается с нулём. ' +
      'На логарифмической он на видном месте — между 100 и 1000. Так работают децибелы, магнитуды и осциллографы.');
    async function run() {
      await anim(REDUCED ? 1 : 1800, function (e) {
        if (userHold) return;
        mix = e; input.value = Math.round(e * 1000);
        st.redraw();
      });
      input.value = 1000;
      done();
    }
    run();
  }

  /* ============================================================
     7. ТАБЛИЦА МАСШТАБОВ (финал сеанса 08)
     ============================================================ */
  function scales(box, api, done) {
    var Cc = C();
    var rows = [
      ['1 … 100 000', 100000, 17],
      ['1 … 1 000 000', 1000000, 20],
      ['1 … 100 000 000', 100000000, 27],
      ['1 … 1 000 000 000', 1000000000, 30],
      ['НАСЕЛЕНИЕ ЗЕМЛИ', 8000000000, 33]
    ];
    var ROWH = 42;
    var st = canvas(box, { h: rows.length * ROWH + 26, cap: 'МАСШТАБ ПОЛЯ · ВОПРОСОВ НУЖНО — МАЛО' });
    var shown = 0, grow = rows.map(function () { return 0; });
    var LMAX = Math.log10(8000000000);
    st.redraw = function () {
      clear(st);
      for (var i = 0; i < rows.length; i++) {
        if (i >= shown) break;
        var r = rows[i];
        var y = 10 + i * ROWH;
        var W = st.w - 320;
        text(st, r[0], 0, y + 26, Cc.dim, 12.5, 400);
        var w = W * (Math.log10(r[1]) / LMAX) * grow[i];
        var grad = st.ctx.createLinearGradient(200, 0, 200 + w, 0);
        grad.addColorStop(0, 'rgba(226,72,58,.9)');
        grad.addColorStop(1, 'rgba(226,72,58,.45)');
        st.ctx.fillStyle = grad;
        st.ctx.fillRect(200, y + 8, Math.max(3, w), 18);
        text(st, nb(r[2]) + ' ' + TERM.plural(r[2], ['вопрос', 'вопроса', 'вопросов']), 210 + w + 12, y + 23, Cc.ok, 13.5, 700);
      }
    };
    async function run() {
      for (var i = 0; i < rows.length; i++) {
        shown = i + 1;
        var ii = i;
        await anim(REDUCED ? 1 : 400, function (t) { grow[ii] = easeOut(t); st.redraw(); });
        grow[i] = 1;
        await after(80);
      }
      var foot = el('div', 'viz-foot', box,
        '2³³ = <span class="amb">8\u00A0589\u00A0934\u00A0592</span> — восьми миллиардам хватает 33 вопросов ДА/НЕТ. ' +
        'Поле выросло в 80\u00A0000 раз — а счёт вопросов вырос на 16. Каждые +10 разрядов масштаба — всего <span class="ok">+3–4 вопроса</span>.');
      st.redraw(); done();
    }
    run();
  }

  /* ============================================================
     8. ДЕЦИБЕЛЫ: интерактивный измеритель (объект)
     meter.set(db) — переставить иглу, оставить «призрак»
     ============================================================ */
  function db(box) {
    var Cc = C();
    var st = canvas(box, { h: 170, cap: 'УРОВЕНЬ ЗВУКА · ШКАЛА ДЕЦИБЕЛ' });
    var ghosts = [];    // {db, alpha}
    var cur = 0, shownDb = null;
    function xOf(db) { var t = (db - 20) / (130 - 20); return 16 + t * (st.w - 32); }
    st.redraw = function () {
      clear(st);
      var y = 92;
      /* сегментированная шкала */
      var segs = 22;
      for (var i = 0; i < segs; i++) {
        var x0 = 16 + i * (st.w - 32) / segs;
        var mid = 20 + (i + 0.5) / segs * 110;
        var col = mid < 60 ? 'rgba(138,151,163,.5)' : mid < 100 ? 'rgba(224,162,78,.55)' : 'rgba(226,72,58,.6)';
        st.ctx.fillStyle = col;
        st.ctx.fillRect(x0 + 1, y, (st.w - 32) / segs - 3, 12);
      }
      [30, 60, 90, 120].forEach(function (db) {
        var x = xOf(db);
        line(st, x, y - 7, x, y + 19, Cc.gridStrong, 1);
        text(st, String(db), x, y + 34, Cc.dim, 11.5, 400, 'center');
      });
      text(st, 'дБ', st.w - 16, y + 34, Cc.faint, 11, 400, 'right');
      /* призраки прошлых уровней */
      ghosts.forEach(function (g) {
        line(st, xOf(g.db), y - 14, xOf(g.db), y + 16, 'rgba(232,228,219,.35)', 1.4);
      });
      /* текущая игла */
      if (shownDb != null) {
        var x = xOf(shownDb);
        line(st, x, y - 20, x, y + 22, Cc.ruby, 2.4);
        st.ctx.fillStyle = Cc.ruby;
        st.ctx.beginPath();
        st.ctx.moveTo(x - 7, y - 20); st.ctx.lineTo(x + 7, y - 20); st.ctx.lineTo(x, y - 10);
        st.ctx.closePath(); st.ctx.fill();
        /* читаемая интенсивность */
        var rel = '×10' + sup(Math.floor(shownDb / 10)) + (shownDb % 10 ? '  (≈' + nb(Math.round(Math.pow(10, shownDb / 10))) + ')' : '');
        text(st, shownDb + ' дБ = ' + rel, 16, 34, Cc.ink, 15, 700);
        text(st, 'порог слышимости = 0 дБ', st.w - 16, 34, Cc.faint, 11.5, 400, 'right');
      } else {
        text(st, 'выберите уровень на пульте', 16, 34, Cc.dim, 13, 400);
      }
    };
    function sup(n) { return String(n).split('').map(function (c) { return '⁰¹²³⁴⁵⁶⁷⁸⁹'[c] || c; }).join(''); }
    st.redraw();
    return {
      set: function (db, keepGhost) {
        if (shownDb != null && keepGhost) ghosts.push({ db: shownDb });
        shownDb = db;
        ghosts = ghosts.slice(-3);
        anim(REDUCED ? 1 : 550, function (e) { cur = e; st.redraw(); });
      },
      done: function () { st.stop(); }
    };
  }

  /* ============================================================
     9. СЕЙСМОГРАММА (объект): q.set(mag) — вторая строка
     ============================================================ */
  function quake(box) {
    var Cc = C();
    var st = canvas(box, { h: 190, cap: 'СЕЙСМОГРАММА · ЭТАЛОН M 5.0 И ВАШ ВЫБОР' });
    var mags = [null, null];
    var t = [1, 0];   // прорисовка строк
    function drawWave(y, mag, tt, color) {
      var W = st.w - 110, amp = { 5: 5, 6: 12, 7: 22, 8: 34 }[mag] || 6;
      st.ctx.strokeStyle = color; st.ctx.lineWidth = 1.6;
      st.ctx.beginPath();
      var n = Math.floor(W * tt);
      for (var i = 0; i < n; i++) {
        var x = 100 + i;
        var env = (i > W * 0.18 && i < W * 0.8) ? Math.exp(-Math.pow((i - W * 0.45) / (W * 0.16), 2)) : 0.12;
        var v = Math.abs(Math.sin(i / 2.1 + mag)) * amp * (0.6 + 0.4 * Math.sin(i / 6.7 + mag)) * env;
        if (i === 0) st.ctx.moveTo(x, y); else st.ctx.lineTo(x, y - v);
      }
      st.ctx.stroke();
    }
    st.redraw = function () {
      clear(st);
      var y1 = 52, y2 = 130;
      line(st, 96, y1, st.w - 12, y1, Cc.grid, 1);
      line(st, 96, y2, st.w - 12, y2, Cc.grid, 1);
      text(st, 'M 5.0', 10, y1 - 16, Cc.dim, 12.5, 700);
      text(st, 'эталон', 10, y1 + 6, Cc.faint, 10.5, 400);
      drawWave(y1, 5, t[0], 'rgba(232,228,219,.5)');
      if (mags[1] != null) {
        text(st, 'M ' + mags[1] + '.0', 10, y2 - 16, Cc.ruby, 12.5, 700);
        drawWave(y2, mags[1], t[1], Cc.ruby);
        var ampTxt = { 6: 'амплитуда ×10 · энергия ×32', 7: 'амплитуда ×100 · энергия ×1000', 8: 'амплитуда ×1000 · энергия ×31\u00A0600' }[mags[1]];
        if (ampTxt) text(st, ampTxt, 100, y2 + 34, Cc.amber, 12.5, 700);
      } else {
        text(st, 'выберите магнитуду на пульте', 100, y2 - 16, Cc.dim, 12.5, 400);
      }
    };
    st.redraw();
    return {
      set: function (row, mag) {
        mags[row] = mag;
        var rr = row;
        anim(REDUCED ? 1 : 900, function (e) { t[rr] = e; st.redraw(); });
      },
      done: function () { st.stop(); }
    };
  }

  /* ============================================================
     10. СЛОЖНЫЕ ПРОЦЕНТЫ (объект): m.set(rate)
     ============================================================ */
  function money(box) {
    var Cc = C();
    var st = canvas(box, { h: 250, cap: 'ВКЛАД 100\u00A0000 ₽ · КОГДА СУММА УДВОИТСЯ' });
    var rate = 12, t = 1;
    var YEARS = 8;
    var vals = [];      // значения по годам
    function calc() {
      vals = [];
      var r = rate / 100;
      for (var n = 0; n <= YEARS; n++) vals.push(100000 * Math.pow(1 + r, n));
    }
    function firstDouble() {
      for (var n = 0; n <= YEARS; n++) if (vals[n] >= 200000 - 1e-9) return n;
      return YEARS;
    }
    st.redraw = function () {
      clear(st);
      calc();
      var padL = 64, padB = 30, padT = 34;
      var W = st.w - padL - 14, H = st.h - padB - padT;
      var VMAX = vals[YEARS] * 1.06;
      var yOf = function (v) { return padT + H * (1 - v / VMAX); };
      /* линия удвоения */
      var y2 = yOf(200000);
      line(st, padL, y2, padL + W, y2, Cc.amber, 1.2, [6, 5]);
      text(st, '×2', padL + W - 6, y2 - 8, Cc.amber, 11.5, 700, 'right');
      /* бары и кривая */
      var nD = YEARS * t;
      for (var n = 0; n <= YEARS; n++) {
        if (n > nD) break;
        var x = padL + n * (W / YEARS);
        var bw = W / YEARS - 14;
        var y = yOf(vals[n]);
        var dbl = vals[n] >= 200000 - 1e-9;
        st.ctx.fillStyle = dbl ? 'rgba(226,72,58,.75)' : 'rgba(232,228,219,.34)';
        st.ctx.fillRect(x + bw / 2 - 5, y, 10, yOf(0) - y);
        text(st, String(n), x + bw / 2, padT + H + 18, Cc.dim, 11, 400, 'center');
        if (n === 0 || vals[n] >= 250000 || n === firstDouble()) {
          text(st, nb(Math.round(vals[n])), x + bw / 2, y - 7, dbl ? Cc.ruby : Cc.faint, 11, 500, 'center');
        }
        if (n === firstDouble() && dbl) {
          text(st, 'удвоение', x + bw / 2, y - 22, Cc.ruby, 11.5, 700, 'center');
        }
      }
      /* кривая */
      st.ctx.strokeStyle = Cc.steel; st.ctx.lineWidth = 1.6;
      st.ctx.beginPath();
      for (var k = 0; k <= nD * 8; k++) {
        var xk = padL + (k / 8) * (W / YEARS);
        if (xk > padL + nD * (W / YEARS)) break;
        var vk = 100000 * Math.pow(1 + rate / 100, k / 8);
        if (k === 0) st.ctx.moveTo(xk, yOf(vk)); else st.ctx.lineTo(xk, yOf(vk));
      }
      st.ctx.stroke();
      text(st, 'годы →', padL + W, padT + H + 18, Cc.faint, 11, 400, 'right');
    };
    var foot = el('div', 'viz-foot', box);
    function setFoot() {
      var r = rate / 100;
      var n = Math.log(2) / Math.log(1 + r);
      var fd = 0; calc();
      while (vals[fd] < 200000 - 1e-9) fd++;
      foot.innerHTML = 'точно: n = lg\u00A02 / lg\u00A01,' + rate + ' = <span class="amb">' +
        n.toFixed(2).replace('.', ',') + '</span> года · целые годы: впервые ≥ ×2 после <span class="ok">' + fd + '-го</span> года';
    }
    setFoot();
    st.redraw();
    return {
      set: function (r2) {
        rate = r2;
        t = 0;
        anim(REDUCED ? 1 : 700, function (e) { t = e; st.redraw(); }).then(function () { setFoot(); st.redraw(); });
        setFoot();
      },
      done: function () { st.stop(); }
    };
  }

  /* ============================================================
     11. ПОТОК ЦИФР 2¹⁰⁰ (типографика в DOM)
     ============================================================ */
  function digits(box, api, done) {
    var s = '1267650600228229401496703205376';
    var st = canvas(box, { h: 0, cap: 'Честная длинная арифметика: 2¹⁰⁰, цифра за цифрой' });
    st.canvas.remove();
    var wrap = el('div', '', box);
    wrap.style.cssText = 'font-family:var(--display);font-weight:800;font-size:clamp(20px,3.4vw,34px);' +
      'line-height:1.35;word-break:break-all;color:var(--ink);letter-spacing:.02em;min-height:120px';
    var cnt = el('div', 'viz-foot', box);
    var i = 0;
    (function tick() {
      i++;
      var shown = s.slice(0, i);
      var html = '';
      for (var c = 0; c < shown.length; c++) {
        html += (c === shown.length - 1) ? '<span style="color:var(--amber)">' + shown[c] + '</span>' : shown[c];
      }
      wrap.innerHTML = html;
      cnt.innerHTML = 'цифр: <span class="amb">' + i + '</span> из 31';
      if (TERM.sfx && i % 2 === 0) TERM.sfx.tick();
      if (skipped() && i < s.length) { i = s.length - 1; }
      if (i < s.length) {
        setTimeout(tick, REDUCED ? 1 : 62);
      } else {
        api.frame({
          t: 'ПРОВЕРКА',
          l: ['⌊lg(2¹⁰⁰)⌋ + 1 = ⌊30,103⌋ + 1 = [[ok:31]]', 'и длинная арифметика даёт то же: [[ok:31]]']
        });
        done();
      }
    })();
  }

  return {
    canvas: canvas, anim: anim, after: after,
    halfField: halfField, cascade: cascade, ladder: ladder, strip: strip,
    graph: graph, rulers: rulers, scales: scales,
    db: db, quake: quake, money: money, digits: digits
  };
})();
