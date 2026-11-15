'use strict';
/* ============================================================
   LOGARITHM · АП-2 — ASCII-анимации средствами символов.
   Всё рисуется в <pre> внутри ленты: без canvas, без звука.
   ============================================================ */
(function () {
  var U = TERM.U;
  var SUP = { '0': '⁰', '1': '¹', '2': '²', '3': '³', '4': '⁴', '5': '⁵', '6': '⁶', '7': '⁷', '8': '⁸', '9': '⁹', '-': '⁻' };
  function sup(n) { return String(n).split('').map(function (c) { return SUP[c] || c; }).join(''); }
  function nb(n) { return String(n).replace(/\B(?=(\d{3})+(?!\d))/g, '\u00A0'); }
  function plural(n, forms) {
    var m10 = n % 10, m100 = n % 100;
    if (m10 === 1 && m100 !== 11) return forms[0];
    if (m10 >= 2 && m10 <= 4 && (m100 < 10 || m100 > 20)) return forms[1];
    return forms[2];
  }

  /* Драйвер пошаговых анимаций с поддержкой «ускорить» */
  TERM.stepped = function (api, steps, ms, drawFn, done) {
    var i = 0;
    if (api.isSkip()) {
      for (; i < steps; i++) drawFn(i);
      api.clearSkip();
      api.scroll();
      done();
      return;
    }
    var iv = setInterval(function () {
      drawFn(i++);
      api.scroll();
      if (i >= steps) { clearInterval(iv); done(); }
    }, ms);
  };

  var A = {};

  /* ---------- Каскад деления 100 000 → 1 ---------- */
  A.cascade = function (box, api, done) {
    var rows = [[0, 100000], [1, 50000], [2, 25000], [3, 12500], [4, 6250], [5, 3125], [7, 782], [9, 196], [11, 49], [13, 13], [15, 4], [17, 1]];
    box.textContent = '';
    TERM.stepped(api, rows.length, 420, function (i) {
      var k = rows[i][0], v = rows[i][1];
      var w = Math.max(1, Math.round(v / 100000 * 34) + 1);
      var lbl = k === 0 ? 'старт' : 'после ' + k + ' ' + plural(k, ['вопроса', 'вопросов', 'вопросов']);
      var line = U.pad(nb(v), 8) + ' │' + U.repeat('█', w) + '│ ' + lbl;
      var d = document.createElement('div');
      d.innerHTML = U.mk(i === rows.length - 1 ? '[[ok:' + line + ']]' : line);
      box.appendChild(d);
    }, done);
  };

  /* ---------- Лестница степеней двойки ---------- */
  A.ladder = function (box, api, done) {
    box.textContent = '';
    var N = 18;
    TERM.stepped(api, N + 1, 260, function (i) {
      var d = document.createElement('div');
      if (i < N) {
        var v = Math.pow(2, i);
        var mark = '';
        if (i === 16) mark = '  [[dim:← 100 000 ещё не достигнута]]';
        if (i === 17) mark = '  [[ok:← 100 000 уже позади]]';
        d.innerHTML = U.mk('2' + sup(i) + ' = ' + U.pad(nb(v), 8) + mark);
      } else {
        d.innerHTML = U.mk('        [[amb:↳ 100 000 лежит между 2¹⁶ и 2¹⁷]]');
      }
      box.appendChild(d);
    }, done);
  };

  /* ---------- Линейка 65536…131072 ---------- */
  A.strip = function (box, api, done) {
    var W = 44, lo = 65536, hi = 131072, mid = 100000;
    var pos = Math.round((mid - lo) / (hi - lo) * W);
    var ruler = '';
    for (var i = 0; i <= W; i++) ruler += (i === pos) ? '●' : (i % 11 === 0 ? '┼' : '─');
    var top = '├' + U.repeat('─', W + 1) + '┤';
    var l1 = '[[dim:65536]] ' + ruler + ' [[dim:131072]]';
    var l2 = U.repeat(' ', 8 + pos - 3) + '[[amb:100 000]]';
    var l3 = U.repeat(' ', 8 + pos - 3) + '[[dim:почти у правого края]]';
    TERM.stepped(api, 3, 500, function (i) {
      var d = document.createElement('div');
      if (i === 0) d.innerHTML = U.mk(l1);
      if (i === 1) d.innerHTML = U.mk(l2);
      if (i === 2) d.innerHTML = U.mk(l3);
      box.appendChild(d);
    }, done);
  };

  /* ---------- Поток цифр 2¹⁰⁰ ---------- */
  A.digits = function (box, api, done) {
    var s = '1267650600228229401496703205376';
    box.textContent = '2¹⁰⁰ = ';
    var cnt = document.createElement('div');
    box.appendChild(cnt);
    TERM.stepped(api, s.length, 65, function (i) {
      cnt.textContent = s.slice(0, i + 1) + '  · цифр: ' + (i + 1);
    }, function () {
      cnt.innerHTML = U.mk('[[ok:' + s + ']]  · цифр: 31');
      api.frame({ t: 'ПРОВЕРКА', l: ['⌊lg(2¹⁰⁰)⌋ + 1 = ⌊30,103⌋ + 1 = [[ok:31]]', 'и длинная арифметика даёт то же: [[ok:31]]'] });
      done();
    });
  };

  /* ---------- Поле вариантов: половины исчезают ---------- */
  A.halfField = function (box, api, done) {
    var COLS = 50, ROWS = 6;
    var alive = new Array(COLS).fill(true);
    var labels = [100000, 50000, 25000, 12500, 6250];
    box.textContent = '';
    var label = document.createElement('div');
    label.innerHTML = U.mk('[[dim:' + nb(100000) + ' вариантов · каждая точка ≈ 333 числа]]');
    box.appendChild(label);
    var grid = document.createElement('div');
    box.appendChild(grid);
    var steps = 5;
    TERM.stepped(api, steps, 900, function (s) {
      if (s > 0) {
        var aliveIdx = [];
        for (var c = 0; c < COLS; c++) if (alive[c]) aliveIdx.push(c);
        for (var k = 1; k < aliveIdx.length; k += 2) alive[aliveIdx[k]] = false; /* гасим каждую вторую живую */
        var aliveCount = alive.filter(Boolean).length;
        label.innerHTML = U.mk('[[dim:' + nb(Math.round(100000 * aliveCount / COLS)) + ' вариантов осталось]]');
      }
      var out = '';
      for (var r = 0; r < ROWS; r++) {
        for (var c2 = 0; c2 < COLS; c2++) out += alive[c2] ? '·' : ' ';
        out += '\n';
      }
      grid.textContent = out;
    }, done);
  };

  /* ---------- Статус игры: диапазон, вопрос, лог-бар ---------- */
  A.gameStatus = function (box) {
    box.innerHTML = '';
    var t1 = document.createElement('div');
    var t2 = document.createElement('div');
    box.appendChild(t1); box.appendChild(t2);
    var lg2 = Math.log(100000) / Math.LN2;
    return {
      update: function (lo, hi, q) {
        var rem = hi - lo + 1;
        var barLen = Math.max(1, Math.round(Math.log(rem) / Math.LN2 / lg2 * 34) + 1);
        t1.innerHTML = U.mk('ВОПРОС ' + q + ' · ОСТАЛОСЬ ВАРИАНТОВ: [[amb:' + nb(rem) + ']]');
        t2.innerHTML = U.mk('[' + U.repeat('▓', barLen) + U.repeat('░', 35 - barLen) + '] ' + nb(lo) + ' … ' + nb(hi));
        TERM.scroll();
      }
    };
  };

  /* ---------- Децибелы: шкала ---------- */
  A.dbLine = function (db) {
    var W = 36;
    var pos = Math.round(U.clamp((db - 20) / 100, 0, 1) * W);
    var e = Math.floor(db / 10);
    var rel = '×10' + sup(e) + (db % 10 ? ' (≈' + nb(Math.round(Math.pow(10, db / 10))) + ')' : '');
    var line1 = U.pad(db + ' дБ', 9) + '░' + U.repeat('█', pos) + U.repeat('░', W - pos) + '░  ' + rel;
    return '[[ok:' + line1 + ']]';
  };
  A.dbScale = function (box) {
    box.innerHTML = '';
    var marks = [[30, 'шёпот'], [60, 'разговор'], [90, 'городская улица'], [110, 'концерт'], [120, 'порог боли']];
    marks.forEach(function (m) {
      var d = document.createElement('div');
      d.innerHTML = U.mk(U.pad(m[0] + ' дБ', 9) + '[[dim:' + m[1] + ']]');
      box.appendChild(d);
    });
  };

  /* ---------- Сейсмограмма ---------- */
  var BLOCKS = '▁▂▃▄▅▆▇█';
  A.quakeLine = function (mag, W) {
    W = W || 44;
    var amp = { 5: 2.2, 6: 6, 7: 10, 8: 14 }[mag] || 4;
    var out = '';
    for (var i = 0; i < W; i++) {
      var env = (i > W * 0.2 && i < W * 0.75) ? Math.exp(-Math.pow((i - W * 0.45) / (W * 0.16), 2)) : 0.12;
      var v = Math.abs(Math.sin(i / 2.1 + mag)) * amp * (0.6 + 0.4 * Math.sin(i / 6.7 + mag));
      var idx = Math.min(BLOCKS.length - 1, Math.floor(v * env * 1.4));
      out += env < 0.14 ? '·' : BLOCKS[idx];
    }
    return out;
  };

  /* ---------- Таблица вклада с барами ---------- */
  A.moneyTable = function (box, api, ratePct, cap) {
    ratePct = ratePct || 12; cap = cap || 100000;
    var r = ratePct / 100;
    var rows = [];
    var firstDouble = 1;
    while (Math.pow(1 + r, firstDouble) < 2 - 1e-12) firstDouble++;
    for (var n = 0; n <= 8; n++) {
      var s = cap * Math.pow(1 + r, n);
      rows.push([n, s, s >= 2 * cap - 1e-9]);
    }
    var nStar = Math.log(2) / Math.log(1 + r);
    var out = [];
    out.push('ВКЛАД ' + nb(cap) + ' ₽ · СТАВКА ' + ratePct + '% · НАЧИСЛЕНИЕ РАЗ В ГОД');
    out.push('');
    rows.forEach(function (row) {
      var bar = Math.max(1, Math.round(row[1] / (cap * Math.pow(1 + r, 8)) * 30));
      var mark = row[2] ? '  [[ok:◄ СУММА ВПЕРВЫЕ ≥ ВДВОЕ]]' : '';
      out.push(U.pad('год ' + row[0], 8) + U.pad(nb(Math.round(row[1])), 10) + '│' + U.repeat('█', bar) + '│' + mark);
    });
    out.push('');
    out.push('точно: n = lg 2 / lg(1,' + ratePct + ') = [[amb:' + U.plain(nb(+nStar.toFixed(2)).replace('.', ',')) + ']] года');
    out.push('целые годы: впервые ≥ ×2 — после [[ok:' + firstDouble + '-го]] года');
    box.innerHTML = U.mk(out.join('\n'));
    api.scroll();
  };

  /* ---------- График 2^x и log₂x символами ---------- */
  A.graph = function (box, api, done) {
    var XMIN = -3, XMAX = 6, YMIN = -3, YMAX = 6;
    var CW = 5 / 4, CH = 2;           /* символов на единицу */
    var W = Math.round((XMAX - XMIN) * CW) + 1;
    var H = Math.round((YMAX - YMIN) * CH) + 1;
    var g = [];
    for (var r = 0; r < H; r++) g.push(new Array(W).fill(' '));
    function put(x, y, ch) {
      var c = Math.round((x - XMIN) * CW);
      var rr = Math.round((YMAX - y) * CH);
      if (c >= 0 && c < W && rr >= 0 && rr < H) g[rr][c] = ch;
    }
    /* оси и y=x */
    for (var x = XMIN; x <= XMAX; x += 0.125) { put(x, 0, '─'); if (x >= YMIN && x <= YMAX) put(x, x, '·'); }
    for (var y = YMIN; y <= YMAX; y += 0.25) put(0, y, '│');
    put(0, 0, '┼');
    /* кривые */
    for (var x2 = XMIN; x2 <= Math.log(YMAX) / Math.LN2; x2 += 0.05) put(x2, Math.pow(2, x2), '█');
    for (var x3 = Math.pow(2, YMIN); x3 <= XMAX; x3 += 0.05) put(x3, Math.log(x3) / Math.LN2, '▒');
    /* связанные точки (2,4) и (4,2) */
    put(2, 4, '@'); put(4, 2, '@');
    var legend = ['[[ok:█  y = 2ˣ]]   [[dim:▒  y = log₂(x)]]   [[dim:·  y = x]]   [[amb:@ (2;4) ↔ (4;2)]]'];
    box.textContent = '';
    var i = 0;
    TERM.stepped(api, H + 1, 55, function (i2) {
      if (i2 < H) {
        var d = document.createElement('div');
        d.textContent = g[i2].join('');
        box.appendChild(d);
      } else {
        var lg = document.createElement('div');
        lg.innerHTML = U.mk(legend[0]);
        box.appendChild(lg);
      }
    }, done);
  };

  /* ---------- Линейная и логарифмическая шкалы ---------- */
  A.rulers = function (box, api, done) {
    var W = 46;
    function ruler(mix) {
      var marks = [1, 10, 100, 1000, 10000, 100000];
      var arr = new Array(W + 1).fill('─');
      marks.forEach(function (v) {
        var lin = v / 100000 * W;
        var lg = Math.log10(v) / 5 * W;
        var p = Math.round(lin + (lg - lin) * mix);
        arr[p] = '┼';
      });
      [[547, '●'], [65536, '▲']].forEach(function (m) {
        var lin = m[0] / 100000 * W;
        var lg = Math.log10(m[0]) / 5 * W;
        var p = Math.round(lin + (lg - lin) * mix);
        arr[p] = m[1];
      });
      return arr.join('');
    }
    box.textContent = '';
    var rows = [
      'ЛИНЕЙНАЯ:      1' + ruler(0) + '100000',
      '               [[dim:547 почти сливается с началом, всё жмётся вправо]]',
      '',
      'ЛОГАРИФМИЧ.:   1' + ruler(1) + '100000',
      '               [[dim:547 ● и 65536 ▲ видны; шаги равны ×10]]'
    ];
    TERM.stepped(api, rows.length, 380, function (i) {
      var d = document.createElement('div');
      d.innerHTML = U.mk(rows[i]);
      box.appendChild(d);
    }, done);
  };

  /* ---------- Таблица масштабов (финал) ---------- */
  A.scales = function (box, api, done) {
    var rows = [
      '1 … 100 000              [[ok:17 вопросов]]',
      '1 … 1 000 000            [[ok:20 вопросов]]',
      '1 … 100 000 000          [[ok:27 вопросов]]',
      '1 … 1 000 000 000        [[ok:30 вопросов]]',
      'НАСЕЛЕНИЕ ЗЕМЛИ ~8 000 000 000   [[ok:33 вопроса]]',
      '',
      '2³³ = [[amb:8 589 934 592]] — восьми миллиардам хватает 33 вопросов ДА/НЕТ',
      '+10 вариантов масштаба — всего [[ok:+3–4 вопроса]]'
    ];
    box.textContent = '';
    TERM.stepped(api, rows.length, 320, function (i) {
      var d = document.createElement('div');
      d.innerHTML = U.mk(rows[i]);
      box.appendChild(d);
    }, done);
  };

  /* ---------- Большой финальный плакат ---------- */
  A.poster = function (box, api, done) {
    var rows = [
      '╔══════════════════════════════════════╗',
      '║  ЛОГАРИФМ — ЭТО ОТВЕТ НА ВОПРОС:     ║',
      '║  [[ok:В КАКУЮ СТЕПЕНЬ?]]                    ║',
      '║                                      ║',
      '║  aˣ = b   ⇔   logₐ(b) = x            ║',
      '╚══════════════════════════════════════╝'
    ];
    box.textContent = '';
    TERM.stepped(api, rows.length, 240, function (i) {
      var d = document.createElement('div');
      d.innerHTML = U.mk(rows[i]);
      box.appendChild(d);
    }, done);
  };

  TERM.ascii = A;
  TERM.sup = sup;
  TERM.nb = nb;
  TERM.plural = plural;
})();
