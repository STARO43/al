'use strict';
/* ============================================================
   ЛОГАРИФМ · АП-2 — «символьный» слой.
   Живые визуализации переехали в viz.js (canvas) и kinetic.js
   (типографика). Здесь — совместимые имена A.* для сцен,
   статус игры (питает HUD-пульт) и мелкие текстовые утилиты.
   ============================================================ */
(function () {
  var U = TERM.U;
  var VIZ = TERM.viz;

  /* Драйвер пошаговых анимаций (DOM): используется digits и др. */
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

  /* ---------- Каскад деления 100 000 → 1 (canvas) ---------- */
  A.cascade = VIZ.cascade;

  /* ---------- Лестница степеней двойки (canvas) ---------- */
  A.ladder = VIZ.ladder;

  /* ---------- Линейка 65536…131072 (canvas) ---------- */
  A.strip = VIZ.strip;

  /* ---------- Поток цифр 2¹⁰⁰ (типографика) ---------- */
  A.digits = VIZ.digits;

  /* ---------- Поле вариантов: половины исчезают (canvas) ---------- */
  A.halfField = VIZ.halfField;

  /* ---------- График 2^x и log₂x (canvas, проба курсором) ---------- */
  A.graph = VIZ.graph;

  /* ---------- Линейная и логарифмическая шкалы (морф) ---------- */
  A.rulers = VIZ.rulers;

  /* ---------- Таблица масштабов (canvas) ---------- */
  A.scales = VIZ.scales;

  /* ---------- Большой финальный плакат (кинетика) ---------- */
  A.poster = function (box, api, done) {
    TERM.kinetic.poster().then(done);
  };

  /* ---------- Статус игры: питает ПУЛЬТ ХОДА ---------- */
  /* Проблема старой версии: статус был строкой в ленте и уезжал
     за пределы экрана. Теперь шкала живёт на закреплённом пульте
     и видна в любой момент. По завершении — итоговая карточка в ленту. */
  A.gameStatus = function (box) {
    var lg2 = Math.log(100000) / Math.LN2;
    var seq = [];
    var shown = false;
    return {
      update: function (lo, hi, q) {
        var rem = hi - lo + 1;
        seq.push(rem);
        if (!shown) { shown = true; TERM.hud.show(); }
        TERM.hud.update({ q: q, total: 17, rem: rem, lo: lo, hi: hi });
      },
      close: function () {
        /* цепочка остатков: по 6 чисел на строку */
        var lines = [];
        var fmt = seq.map(function (v) { return TERM.nb(v); });
        for (var i = 0; i < fmt.length; i += 6) {
          lines.push(fmt.slice(i, i + 6).join(' → '));
        }
        var nq = seq.length - 1;
        lines.push('');
        lines.push('вопросов: [[ok:' + nq + ']] — поле сжалось в 100\u00A0000 раз');
        TERM.api.frame({ t: 'ХОД ПОИСКА', l: lines });
        TERM.hud.hide();
      }
    };
  };

  /* ---------- Децибелы: строка шкалы (текстовый резерв) ---------- */
  A.dbLine = function (db) {
    var W = 36;
    var pos = Math.round(U.clamp((db - 20) / 100, 0, 1) * W);
    var e = Math.floor(db / 10);
    var rel = '×10' + TERM.sup(e) + (db % 10 ? ' (≈' + TERM.nb(Math.round(Math.pow(10, db / 10))) + ')' : '');
    var line1 = U.pad(db + ' дБ', 9) + '░' + U.repeat('█', pos) + U.repeat('░', W - pos) + '░  ' + rel;
    return '[[ok:' + line1 + ']]';
  };

  TERM.ascii = A;
  var SUP = { '0': '⁰', '1': '¹', '2': '²', '3': '³', '4': '⁴', '5': '⁵', '6': '⁶', '7': '⁷', '8': '⁸', '9': '⁹', '-': '⁻' };
  TERM.sup = function (n) { return String(n).split('').map(function (c) { return SUP[c] || c; }).join(''); };
  TERM.nb = function (n) { return String(n).replace(/\B(?=(\d{3})+(?!\d))/g, '\u00A0'); };
  TERM.plural = function (n, forms) {
    var m10 = n % 10, m100 = n % 100;
    if (m10 === 1 && m100 !== 11) return forms[0];
    if (m10 >= 2 && m10 <= 4 && (m100 < 10 || m100 > 20)) return forms[1];
    return forms[2];
  };
})();
