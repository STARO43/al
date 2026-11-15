'use strict';
/* ============================================================
   ЛОГАРИФМ · АП-2 — кинетическая типографика.
   Референс Typos: текст как самостоятельный графический объект.
   — big-слова: полноэкранные моменты, буквы разлетаются по одной,
     деформируются вблизи курсора (текст можно «потрогать»);
   — титры сеансов: header-карточка с каскадным появлением;
   — финальный плакат с формулой.
   При reduced motion — статичное появление без деформаций.
   ============================================================ */
window.TERM = window.TERM || {};

TERM.kinetic = (function () {
  var REDUCED = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var root = null, stage = null;
  var raf = 0, mouse = { x: -9999, y: -9999 };
  var letters = [];   // {el, cx, cy, base}
  var active = false;

  function init() {
    root = document.getElementById('kinetic');
    stage = document.getElementById('kineticStage');
    if (!root) return;
    window.addEventListener('mousemove', function (e) {
      mouse.x = e.clientX; mouse.y = e.clientY;
    }, { passive: true });
    root.addEventListener('mouseleave', function () { mouse.x = -9999; mouse.y = -9999; });
  }

  function buildWord(text, accent) {
    var wrap = document.createElement('div');
    wrap.className = 'k-word';
    var acc = accent && accent.length >= 1 ? text.lastIndexOf(accent) : -1;
    var words = String(text).split(' ');
    var gi = 0;   // глобальный индекс символа
    words.forEach(function (word, wi) {
      var w = document.createElement('span');
      w.className = 'k-wr';
      for (var i = 0; i < word.length; i++) {
        var s = document.createElement('span');
        s.className = 'k-letter' + (acc >= 0 && gi >= acc && gi < acc + accent.length ? ' acc' : '');
        s.textContent = word[i];
        s.style.setProperty('--d', (0.05 + gi * 0.045).toFixed(2) + 's');
        w.appendChild(s);
        gi++;
      }
      wrap.appendChild(w);
      if (wi < words.length - 1) {
        var sp = document.createElement('span');
        sp.className = 'k-sp';
        sp.innerHTML = '&nbsp;';
        wrap.appendChild(sp);
        gi++;
      }
    });
    return wrap;
  }

  function collectLetters() {
    letters = [];
    var els = stage.querySelectorAll('.k-letter');
    for (var i = 0; i < els.length; i++) letters.push({ el: els[i], cx: 0, cy: 0, s: 0 });
    measure();
  }

  function measure() {
    for (var i = 0; i < letters.length; i++) {
      var r = letters[i].el.getBoundingClientRect();
      letters[i].cx = r.left + r.width / 2;
      letters[i].cy = r.top + r.height / 2;
    }
  }

  /* Деформация: буквы «дышат» вблизи курсора */
  function loop() {
    if (!active) return;
    var any = false;
    for (var i = 0; i < letters.length; i++) {
      var L = letters[i];
      var dx = mouse.x - L.cx, dy = mouse.y - L.cy;
      var d2 = dx * dx + dy * dy;
      var infl = Math.exp(-d2 / (2 * 130 * 130));      // радиус ~130px
      var target = infl;
      L.s += (target - L.s) * 0.16;                     // пружина
      if (L.s > 0.004) any = true;
      var sc = 1 + L.s * 0.22;
      var ty = -L.s * 12;
      var sk = L.s * 9 * (dx < 0 ? 1 : -1);
      L.el.style.transform = 'translateY(' + ty.toFixed(1) + 'px) scale(' + sc.toFixed(3) + ') skewX(' + sk.toFixed(1) + 'deg)';
    }
    if (any || mouse.x > -9000) raf = requestAnimationFrame(loop);
  }

  function show(build) {
    return new Promise(function (res) {
      if (!root) { res(); return; }
      stage.innerHTML = '';
      build(stage);
      root.classList.add('on');
      TERM.bg.pulse(1.2);
      TERM.sfx.boom();
      collectLetters();
      /* каскадное появление букв */
      requestAnimationFrame(function () {
        requestAnimationFrame(function () {
          var els = stage.querySelectorAll('.k-letter');
          for (var i = 0; i < els.length; i++) els[i].classList.add('in');
        });
      });
      if (REDUCED) {
        setTimeout(function () { dismiss(res); }, 1500);
        bindEarly(res);
        return;
      }
      active = true;
      raf = requestAnimationFrame(loop);
      setTimeout(function () {
        window.addEventListener('resize', measureOnce);
      }, 0);
      var held = false;
      function measureOnce() { measure(); }
      /* авто-показ: держим слово, потом отпускаем */
      setTimeout(function () {
        if (active) { dismiss(res); }
      }, 3000);
      bindEarly(res);
    });
  }

  function bindEarly(res) {
    function onKey(e) {
      if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); finish(); }
    }
    function onWheel() { finish(); }
    function onClick() { finish(); }
    function finish() {
      window.removeEventListener('keydown', onKey);
      window.removeEventListener('wheel', onWheel);
      root.removeEventListener('click', onClick);
      dismiss(res);
    }
    window.addEventListener('keydown', onKey);
    window.addEventListener('wheel', onWheel, { passive: true });
    root.addEventListener('click', onClick);
    /* сообщение из core (например, сброс сеанса) */
    TERM.kinetic._cancel = finish;
  }

  function dismiss(res) {
    if (raf) { cancelAnimationFrame(raf); raf = 0; }
    active = false;
    if (!root) { if (res) res(); return; }
    root.classList.add('leaving');
    setTimeout(function () {
      root.classList.remove('on', 'leaving');
      stage.innerHTML = '';
      if (res) res();
    }, REDUCED ? 60 : 420);
  }

  /* ---------- Публичное API ---------- */

  /* Крупное слово на весь экран. accent — слово, окрашиваемое рубином. */
  function big(text, kicker, accent) {
    return show(function (st) {
      if (kicker) {
        var k = document.createElement('div');
        k.className = 'k-kicker'; k.textContent = kicker;
        st.appendChild(k);
      }
      var words = String(text).trim().split(/\s+/);
      accent = accent || (words.length > 1 ? words[words.length - 1] : '');
      st.appendChild(buildWord(String(text), accent));
      var hint = document.createElement('div');
      hint.className = 'k-hint';
      hint.textContent = 'КЛИК · ПРОБЕЛ — ПРОДОЛЖИТЬ';
      st.appendChild(hint);
    });
  }

  /* Титул сеанса: не блокирует ленту, исчезает сам. */
  function titleCard(label, title) {
    if (!root || REDUCED) return Promise.resolve();
    return new Promise(function (res) {
      stage.innerHTML = '';
      var k = document.createElement('div');
      k.className = 'k-kicker'; k.textContent = 'ВХОДЯЩАЯ ПЕРЕДАЧА';
      stage.appendChild(k);
      var w = document.createElement('div');
      w.className = 'k-word';
      var num = label.replace('СЕАНС ', '');
      stage.appendChild(buildWord(num + ' ' + title, num));
      root.classList.add('on');
      TERM.bg.pulse(0.9);
      collectLetters();
      requestAnimationFrame(function () {
        requestAnimationFrame(function () {
          var els = stage.querySelectorAll('.k-letter');
          for (var i = 0; i < els.length; i++) els[i].classList.add('in');
        });
      });
      if (!REDUCED) { active = true; raf = requestAnimationFrame(loop); }
      setTimeout(function () {
        active = false;
        if (raf) { cancelAnimationFrame(raf); raf = 0; }
        root.classList.add('leaving');
        setTimeout(function () {
          root.classList.remove('on', 'leaving');
          stage.innerHTML = '';
          res();
        }, 380);
      }, 1700);
    });
  }

  /* Финальный плакат: определение логарифма как типографический объект. */
  function poster() {
    return show(function (st) {
      var k = document.createElement('div');
      k.className = 'k-kicker';
      k.textContent = 'ЛОГАРИФМ — ЭТО ОТВЕТ НА ВОПРОС';
      st.appendChild(k);
      st.appendChild(buildWord('В КАКУЮ СТЕПЕНЬ?', 'СТЕПЕНЬ?'));
      var f = document.createElement('div');
      f.className = 'k-formula';
      f.innerHTML = 'a<sup>x</sup> = b&nbsp;&nbsp;⇔&nbsp;&nbsp;log<sub>a</sub>(b) = <span class="acc">x</span>';
      st.appendChild(f);
      var hint = document.createElement('div');
      hint.className = 'k-hint';
      hint.textContent = 'КЛИК · ПРОБЕЛ — ПРОДОЛЖИТЬ';
      st.appendChild(hint);
    });
  }

  return {
    init: init,
    big: big,
    titleCard: titleCard,
    poster: poster,
    _cancel: null
  };
})();
